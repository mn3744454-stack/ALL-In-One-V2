
-- =============================================================================
-- Phase 1: Partnership Foundations
-- 1) Enforce B2B = tenant-to-tenant in create_connection_request
-- 2) Add SECURITY DEFINER RPC for party display names
-- 3) Add tenant search RPC for partnership picker
-- 4) Add apply_link_preset RPC for atomic preset grants
-- 5) Fix audit duplication: remove explicit log_sharing_event from RPCs
-- =============================================================================

-- 1) Recreate create_connection_request with B2B/B2C validation
CREATE OR REPLACE FUNCTION public.create_connection_request(
  _connection_type text,
  _initiator_tenant_id uuid,
  _recipient_tenant_id uuid DEFAULT NULL,
  _recipient_profile_id uuid DEFAULT NULL,
  _recipient_email text DEFAULT NULL,
  _recipient_phone text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _connection_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.check_tenant_permission(_user_id, _initiator_tenant_id, 'connections.create') THEN
    RAISE EXCEPTION 'Permission denied: connections.create required';
  END IF;

  IF _connection_type = 'b2b' THEN
    IF _recipient_tenant_id IS NULL THEN
      RAISE EXCEPTION 'B2B connections require a recipient organization (tenant)';
    END IF;
    IF _recipient_profile_id IS NOT NULL OR _recipient_email IS NOT NULL OR _recipient_phone IS NOT NULL THEN
      RAISE EXCEPTION 'B2B connections must target an organization, not a person';
    END IF;
    IF _recipient_tenant_id = _initiator_tenant_id THEN
      RAISE EXCEPTION 'Cannot create a connection to your own organization';
    END IF;
  ELSIF _connection_type = 'b2c' THEN
    IF _recipient_tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'B2C connections must target a person, not an organization';
    END IF;
    IF num_nonnulls(_recipient_profile_id, _recipient_email, _recipient_phone) != 1 THEN
      RAISE EXCEPTION 'Exactly one person identifier (profile, email, or phone) must be specified for B2C';
    END IF;
  ELSIF _connection_type = 'employment' THEN
    IF _recipient_tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'Employment connections must target a person, not an organization';
    END IF;
    IF num_nonnulls(_recipient_profile_id, _recipient_email, _recipient_phone) != 1 THEN
      RAISE EXCEPTION 'Exactly one person identifier must be specified for employment';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid connection type: %', _connection_type;
  END IF;

  INSERT INTO public.connections (
    connection_type, initiator_tenant_id, initiator_user_id,
    recipient_tenant_id, recipient_profile_id, recipient_email, recipient_phone,
    expires_at, metadata
  ) VALUES (
    _connection_type::public.connection_type, _initiator_tenant_id, _user_id,
    _recipient_tenant_id, _recipient_profile_id,
    CASE WHEN _recipient_email IS NOT NULL THEN lower(btrim(_recipient_email)) ELSE NULL END,
    _recipient_phone,
    _expires_at, _metadata
  )
  RETURNING id INTO _connection_id;

  RETURN _connection_id;
END;
$$;

-- 2) Update accept_connection to remove duplicate logging and fix B2B profile binding
CREATE OR REPLACE FUNCTION public.accept_connection(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _user_email text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _conn FROM public.connections WHERE token = _token;

  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  IF _conn.status != 'pending' THEN
    RAISE EXCEPTION 'Connection is not pending';
  END IF;
  IF _conn.expires_at IS NOT NULL AND _conn.expires_at < now() THEN
    RAISE EXCEPTION 'Connection has expired';
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  IF _conn.recipient_profile_id IS NOT NULL THEN
    IF _conn.recipient_profile_id != _user_id THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_email IS NOT NULL THEN
    IF _conn.recipient_email != lower(btrim(_user_email)) THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_tenant_id IS NOT NULL THEN
    IF NOT public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.accept') THEN
      RAISE EXCEPTION 'Permission denied: connections.accept required';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid connection recipient configuration';
  END IF;

  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = _user_id,
      recipient_profile_id = CASE
        WHEN _conn.recipient_tenant_id IS NOT NULL THEN recipient_profile_id
        WHEN recipient_profile_id IS NOT NULL THEN recipient_profile_id
        WHEN recipient_email IS NOT NULL THEN _user_id
        ELSE recipient_profile_id
      END
  WHERE id = _conn.id;

  RETURN _conn.id;
END;
$$;

-- 3) Update revoke_connection to remove duplicate logging
CREATE OR REPLACE FUNCTION public.revoke_connection(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _conn FROM public.connections WHERE token = _token;

  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  IF _conn.status = 'revoked' THEN
    RAISE EXCEPTION 'Connection is already revoked';
  END IF;

  IF public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'connections.revoke') THEN
    NULL;
  ELSIF _conn.recipient_tenant_id IS NOT NULL
        AND public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.revoke') THEN
    NULL;
  ELSIF _conn.recipient_profile_id = _user_id THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied: connections.revoke required';
  END IF;

  UPDATE public.connections
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _conn.id;

  RETURN _conn.id;
END;
$$;

-- 4) Update create_consent_grant to remove duplicate logging
CREATE OR REPLACE FUNCTION public.create_consent_grant(
  _connection_id uuid,
  _resource_type text,
  _resource_ids uuid[] DEFAULT NULL,
  _access_level text DEFAULT 'read',
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _forward_only boolean DEFAULT false,
  _excluded_fields text[] DEFAULT ARRAY[]::text[],
  _expires_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _grant_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _conn FROM public.connections WHERE id = _connection_id;

  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  IF _conn.status != 'accepted' THEN
    RAISE EXCEPTION 'Connection must be accepted to create grants';
  END IF;

  IF NOT (
    public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'consent_grants.create')
    OR (
      _conn.recipient_tenant_id IS NOT NULL
      AND public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'consent_grants.create')
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.create required';
  END IF;

  INSERT INTO public.consent_grants (
    connection_id, grantor_tenant_id, grantor_user_id,
    resource_type, resource_ids, access_level,
    date_from, date_to, forward_only, excluded_fields,
    expires_at, metadata
  ) VALUES (
    _connection_id,
    CASE
      WHEN public.is_active_tenant_member(_user_id, _conn.initiator_tenant_id)
        THEN _conn.initiator_tenant_id
      ELSE _conn.recipient_tenant_id
    END,
    _user_id,
    _resource_type, _resource_ids, _access_level,
    _date_from, _date_to, _forward_only, _excluded_fields,
    _expires_at, _metadata
  )
  RETURNING id INTO _grant_id;

  RETURN _grant_id;
END;
$$;

-- 5) Update revoke_consent_grant to remove duplicate logging
CREATE OR REPLACE FUNCTION public.revoke_consent_grant(_grant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;

  IF _grant.id IS NULL THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;
  IF _grant.status = 'revoked' THEN
    RAISE EXCEPTION 'Grant is already revoked';
  END IF;

  IF NOT public.check_tenant_permission(_user_id, _grant.grantor_tenant_id, 'consent_grants.revoke') THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.revoke required';
  END IF;

  UPDATE public.consent_grants
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _grant_id;

  RETURN _grant_id;
END;
$$;

-- =============================================================================
-- 6) SECURITY DEFINER RPC: get_connection_party_names
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_connection_party_names(_connection_ids uuid[])
RETURNS TABLE(entity_id uuid, display_name text, entity_kind text, entity_subtype text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_tenant_ids uuid[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT array_agg(tm.tenant_id) INTO _user_tenant_ids
  FROM public.tenant_members tm
  WHERE tm.user_id = _user_id AND tm.is_active = true;

  _user_tenant_ids := COALESCE(_user_tenant_ids, ARRAY[]::uuid[]);

  RETURN QUERY
  WITH authorized_connections AS (
    SELECT c.id, c.initiator_tenant_id, c.recipient_tenant_id,
           c.initiator_user_id, c.recipient_profile_id
    FROM public.connections c
    WHERE c.id = ANY(_connection_ids)
      AND (
        c.initiator_tenant_id = ANY(_user_tenant_ids)
        OR c.recipient_tenant_id = ANY(_user_tenant_ids)
        OR c.initiator_user_id = _user_id
        OR c.recipient_profile_id = _user_id
      )
  ),
  tenant_ids AS (
    SELECT DISTINCT tid FROM (
      SELECT initiator_tenant_id AS tid FROM authorized_connections WHERE initiator_tenant_id IS NOT NULL
      UNION
      SELECT recipient_tenant_id AS tid FROM authorized_connections WHERE recipient_tenant_id IS NOT NULL
    ) sub
  ),
  profile_ids AS (
    SELECT DISTINCT pid FROM (
      SELECT initiator_user_id AS pid FROM authorized_connections WHERE initiator_user_id IS NOT NULL
      UNION
      SELECT recipient_profile_id AS pid FROM authorized_connections WHERE recipient_profile_id IS NOT NULL
    ) sub
  )
  SELECT t.id AS entity_id,
         COALESCE(NULLIF(btrim(t.name), ''), ('Tenant ' || left(t.id::text, 8) || '…')) AS display_name,
         'tenant'::text AS entity_kind,
         t.type::text AS entity_subtype
  FROM public.tenants t
  WHERE t.id IN (SELECT tid FROM tenant_ids)
  UNION ALL
  SELECT p.id AS entity_id,
         COALESCE(
           NULLIF(btrim(p.full_name), ''),
           NULLIF(btrim(p.username), ''),
           ('Profile ' || left(p.id::text, 8) || '…')
         ) AS display_name,
         'profile'::text AS entity_kind,
         NULL::text AS entity_subtype
  FROM public.profiles p
  WHERE p.id IN (SELECT pid FROM profile_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_connection_party_names(uuid[]) TO authenticated;

-- =============================================================================
-- 7) Tenant search RPC for partnership picker
-- =============================================================================
CREATE OR REPLACE FUNCTION public.search_tenants_for_partnership(
  _search text DEFAULT '',
  _exclude_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, type text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _search_pattern text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  _search_pattern := '%' || COALESCE(btrim(_search), '') || '%';

  RETURN QUERY
  SELECT DISTINCT t.id, t.name, t.type::text
  FROM public.tenants t
  WHERE (
    t.is_public = true
    OR EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = t.id AND tm.user_id = _user_id AND tm.is_active = true
    )
  )
  AND (
    _search = '' OR t.name ILIKE _search_pattern
  )
  AND (
    _exclude_tenant_id IS NULL OR t.id != _exclude_tenant_id
  )
  ORDER BY t.name
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_tenants_for_partnership(text, uuid) TO authenticated;

-- =============================================================================
-- 8) Apply link preset RPC (atomic grant creation)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_link_preset(
  _connection_id uuid,
  _preset_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _grantor_tenant_id uuid;
  _resource_types text[];
  _rt text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _conn FROM public.connections WHERE id = _connection_id;

  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  IF _conn.status != 'accepted' THEN
    RAISE EXCEPTION 'Connection must be accepted to apply presets';
  END IF;

  IF public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'consent_grants.create') THEN
    _grantor_tenant_id := _conn.initiator_tenant_id;
  ELSIF _conn.recipient_tenant_id IS NOT NULL
        AND public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'consent_grants.create') THEN
    _grantor_tenant_id := _conn.recipient_tenant_id;
  ELSE
    RAISE EXCEPTION 'Permission denied: consent_grants.create required';
  END IF;

  CASE _preset_name
    WHEN 'requests_and_results' THEN
      _resource_types := ARRAY['lab_requests', 'lab_results'];
    WHEN 'appointments_and_records' THEN
      _resource_types := ARRAY['appointments', 'vet_records'];
    WHEN 'referrals_and_results' THEN
      _resource_types := ARRAY['referrals', 'lab_results'];
    ELSE
      RAISE EXCEPTION 'Unknown preset: %', _preset_name;
  END CASE;

  FOREACH _rt IN ARRAY _resource_types
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.consent_grants
      WHERE connection_id = _connection_id
        AND grantor_tenant_id = _grantor_tenant_id
        AND resource_type = _rt
        AND status = 'active'
    ) THEN
      INSERT INTO public.consent_grants (
        connection_id, grantor_tenant_id, grantor_user_id,
        resource_type, access_level, forward_only, metadata
      ) VALUES (
        _connection_id, _grantor_tenant_id, _user_id,
        _rt, 'read', true,
        jsonb_build_object('preset', _preset_name)
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_link_preset(uuid, text) TO authenticated;
