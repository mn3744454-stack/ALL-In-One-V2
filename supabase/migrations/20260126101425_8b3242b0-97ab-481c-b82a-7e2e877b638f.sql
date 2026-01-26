-- Phase 2: Security Fixes + Real get_granted_data() + expire_stale_connections()
-- This migration adds SET search_path = public to all SECURITY DEFINER functions
-- and implements real data retrieval for get_granted_data()

-- 1. Recreate is_tenant_owner with SET search_path
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = 'owner'
      AND is_active = true
  );
END;
$$;

-- 2. Recreate is_active_tenant_member with SET search_path
CREATE OR REPLACE FUNCTION public.is_active_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND is_active = true
  );
END;
$$;

-- 3. Recreate check_tenant_permission with SET search_path
CREATE OR REPLACE FUNCTION public.check_tenant_permission(_user_id uuid, _tenant_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner bypass
  IF public.is_tenant_owner(_user_id, _tenant_id) THEN
    RETURN true;
  END IF;
  
  -- Check active membership
  IF NOT public.is_active_tenant_member(_user_id, _tenant_id) THEN
    RETURN false;
  END IF;
  
  -- Check permission using existing has_permission function
  RETURN public.has_permission(_user_id, _tenant_id, _permission_key);
END;
$$;

-- 4. Recreate log_sharing_event with SET search_path
CREATE OR REPLACE FUNCTION public.log_sharing_event(
  _event_type text,
  _connection_id uuid DEFAULT NULL,
  _grant_id uuid DEFAULT NULL,
  _actor_user_id uuid DEFAULT NULL,
  _actor_tenant_id uuid DEFAULT NULL,
  _target_tenant_id uuid DEFAULT NULL,
  _target_profile_id uuid DEFAULT NULL,
  _resource_type text DEFAULT NULL,
  _resource_ids uuid[] DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.sharing_audit_log (
    event_type, connection_id, grant_id, actor_user_id, actor_tenant_id,
    target_tenant_id, target_profile_id, resource_type, resource_ids, metadata
  ) VALUES (
    _event_type, _connection_id, _grant_id, _actor_user_id, _actor_tenant_id,
    _target_tenant_id, _target_profile_id, _resource_type, _resource_ids, _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- 5. Recreate create_connection_request with SET search_path
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
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _initiator_tenant_id, 'connections.create') THEN
    RAISE EXCEPTION 'Permission denied: connections.create required';
  END IF;
  
  -- Validate recipient
  IF num_nonnulls(_recipient_tenant_id, _recipient_profile_id, _recipient_email, _recipient_phone) != 1 THEN
    RAISE EXCEPTION 'Exactly one recipient channel must be specified';
  END IF;
  
  -- Insert connection
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
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_created',
    _connection_id,
    NULL,
    _user_id,
    _initiator_tenant_id,
    _recipient_tenant_id,
    _recipient_profile_id,
    NULL,
    NULL,
    jsonb_build_object('connection_type', _connection_type)
  );
  
  RETURN _connection_id;
END;
$$;

-- 6. Recreate accept_connection with SET search_path
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
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find connection by token
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
  
  -- Get user email for matching
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Authorization: user must be valid recipient
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
  
  -- Accept the connection
  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = _user_id,
      recipient_profile_id = COALESCE(recipient_profile_id, _user_id)
  WHERE id = _conn.id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_accepted',
    _conn.id,
    NULL,
    _user_id,
    _conn.recipient_tenant_id,
    _conn.initiator_tenant_id,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$$;

-- 7. Recreate revoke_connection with SET search_path
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
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find connection by token
  SELECT * INTO _conn FROM public.connections WHERE token = _token;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status = 'revoked' THEN
    RAISE EXCEPTION 'Connection is already revoked';
  END IF;
  
  -- Authorization: initiator tenant or recipient tenant can revoke
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
  
  -- Revoke the connection
  UPDATE public.connections
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _conn.id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_revoked',
    _conn.id,
    NULL,
    _user_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$$;

-- 8. Recreate create_consent_grant with SET search_path
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
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find and validate connection
  SELECT * INTO _conn FROM public.connections WHERE id = _connection_id;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status != 'accepted' THEN
    RAISE EXCEPTION 'Connection must be accepted to create grants';
  END IF;
  
  -- Permission check: grantor must be from initiator tenant
  IF NOT public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'consent_grants.create') THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.create required';
  END IF;
  
  -- Create grant
  INSERT INTO public.consent_grants (
    connection_id, grantor_tenant_id, grantor_user_id,
    resource_type, resource_ids, access_level,
    date_from, date_to, forward_only, excluded_fields,
    expires_at, metadata
  ) VALUES (
    _connection_id, _conn.initiator_tenant_id, _user_id,
    _resource_type, _resource_ids, _access_level,
    _date_from, _date_to, _forward_only, _excluded_fields,
    _expires_at, _metadata
  )
  RETURNING id INTO _grant_id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'grant_created',
    _connection_id,
    _grant_id,
    _user_id,
    _conn.initiator_tenant_id,
    _conn.recipient_tenant_id,
    _conn.recipient_profile_id,
    _resource_type,
    _resource_ids,
    jsonb_build_object('access_level', _access_level)
  );
  
  RETURN _grant_id;
END;
$$;

-- 9. Recreate revoke_consent_grant with SET search_path
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
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find grant
  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;
  
  IF _grant.id IS NULL THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;
  
  IF _grant.status = 'revoked' THEN
    RAISE EXCEPTION 'Grant is already revoked';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _grant.grantor_tenant_id, 'consent_grants.revoke') THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.revoke required';
  END IF;
  
  -- Revoke grant
  UPDATE public.consent_grants
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _grant_id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'grant_revoked',
    _grant.connection_id,
    _grant_id,
    _user_id,
    _grant.grantor_tenant_id,
    NULL,
    NULL,
    _grant.resource_type,
    _grant.resource_ids,
    '{}'::jsonb
  );
  
  RETURN _grant_id;
END;
$$;

-- 10. Recreate generate_client_claim_token with SET search_path
CREATE OR REPLACE FUNCTION public.generate_client_claim_token(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _client public.clients%ROWTYPE;
  _token text;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find client
  SELECT * INTO _client FROM public.clients WHERE id = _client_id;
  
  IF _client.id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _client.tenant_id, 'clients.portal.manage') THEN
    RAISE EXCEPTION 'Permission denied: clients.portal.manage required';
  END IF;
  
  -- Check if client already claimed
  IF _client.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Client portal has already been claimed';
  END IF;
  
  -- Revoke any existing active tokens for this client
  UPDATE public.client_claim_tokens
  SET status = 'revoked',
      revoked_at = now()
  WHERE client_id = _client_id
    AND status = 'active';
  
  -- Generate new token using extensions schema for gen_random_bytes
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  
  INSERT INTO public.client_claim_tokens (tenant_id, client_id, token, created_by)
  VALUES (_client.tenant_id, _client_id, _token, _user_id);
  
  RETURN _token;
END;
$$;

-- 11. Recreate claim_client_portal with SET search_path
CREATE OR REPLACE FUNCTION public.claim_client_portal(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _claim public.client_claim_tokens%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find token
  SELECT * INTO _claim FROM public.client_claim_tokens WHERE token = _token;
  
  IF _claim.id IS NULL THEN
    RAISE EXCEPTION 'Invalid claim token';
  END IF;
  
  IF _claim.status != 'active' THEN
    RAISE EXCEPTION 'Claim token is no longer valid';
  END IF;
  
  IF _claim.expires_at < now() THEN
    -- Mark as expired
    UPDATE public.client_claim_tokens SET status = 'expired' WHERE id = _claim.id;
    RAISE EXCEPTION 'Claim token has expired';
  END IF;
  
  -- Update token status
  UPDATE public.client_claim_tokens
  SET status = 'used',
      used_at = now(),
      used_by = _user_id
  WHERE id = _claim.id;
  
  -- Link client to profile
  UPDATE public.clients
  SET linked_profile_id = _user_id,
      profile_id = _user_id,
      claimed_at = now()
  WHERE id = _claim.client_id;
  
  RETURN _claim.client_id;
END;
$$;

-- 12. Recreate revoke_client_claim_token with SET search_path
CREATE OR REPLACE FUNCTION public.revoke_client_claim_token(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _claim public.client_claim_tokens%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find token
  SELECT * INTO _claim FROM public.client_claim_tokens WHERE token = _token;
  
  IF _claim.id IS NULL THEN
    RAISE EXCEPTION 'Claim token not found';
  END IF;
  
  IF _claim.status = 'revoked' THEN
    RAISE EXCEPTION 'Token is already revoked';
  END IF;
  
  -- Authorization: creator or tenant member with permission
  IF _claim.created_by = _user_id THEN
    NULL;
  ELSIF public.check_tenant_permission(_user_id, _claim.tenant_id, 'clients.portal.manage') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied: clients.portal.manage required';
  END IF;
  
  -- Revoke token
  UPDATE public.client_claim_tokens
  SET status = 'revoked',
      revoked_at = now()
  WHERE id = _claim.id;
  
  RETURN _claim.id;
END;
$$;

-- 13. Recreate get_granted_data with SET search_path and REAL data retrieval
CREATE OR REPLACE FUNCTION public.get_granted_data(
  _grant_id uuid,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
  _conn public.connections%ROWTYPE;
  _effective_from date;
  _effective_to date;
  _results jsonb;
  _excluded text[];
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find grant
  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;
  
  IF _grant.id IS NULL THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;
  
  IF _grant.status != 'active' THEN
    RAISE EXCEPTION 'Grant is not active';
  END IF;
  
  IF _grant.expires_at IS NOT NULL AND _grant.expires_at < now() THEN
    RAISE EXCEPTION 'Grant has expired';
  END IF;
  
  -- Find connection
  SELECT * INTO _conn FROM public.connections WHERE id = _grant.connection_id;
  
  -- Authorization: must be recipient of the connection
  IF _conn.recipient_profile_id IS NOT NULL AND _conn.recipient_profile_id = _user_id THEN
    NULL; -- OK: individual recipient
  ELSIF _conn.recipient_tenant_id IS NOT NULL 
        AND public.is_active_tenant_member(_user_id, _conn.recipient_tenant_id) THEN
    NULL; -- OK: recipient tenant member
  ELSE
    RAISE EXCEPTION 'Not authorized to access this grant';
  END IF;
  
  -- Calculate effective date window with NULL safety
  _effective_from := COALESCE(_date_from, _grant.date_from, '1900-01-01'::date);
  _effective_to := COALESCE(_date_to, _grant.date_to, '2999-12-31'::date);
  
  -- Validate date range
  IF _effective_from > _effective_to THEN
    RAISE EXCEPTION 'Invalid date range: from (%) is after to (%)', _effective_from, _effective_to;
  END IF;
  
  -- Get excluded fields
  _excluded := COALESCE(_grant.excluded_fields, ARRAY[]::text[]);
  
  -- Retrieve lab results based on grant parameters
  -- Join lab_results with lab_samples to get horse_id and collection_date
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'sample_id', r.sample_id,
      'template_id', r.template_id,
      'status', r.status,
      'result_data', CASE 
        WHEN array_length(_excluded, 1) > 0 THEN r.result_data - _excluded
        ELSE r.result_data
      END,
      'interpretation', r.interpretation,
      'flags', r.flags,
      'created_at', r.created_at,
      'horse_id', s.horse_id,
      'horse_name', s.horse_name,
      'collection_date', s.collection_date_only
    )
  ), '[]'::jsonb)
  INTO _results
  FROM public.lab_results r
  INNER JOIN public.lab_samples s ON r.sample_id = s.id
  WHERE r.tenant_id = _grant.grantor_tenant_id
    AND r.status = 'final'  -- Only share finalized results
    -- Horse filter: if resource_ids is not null, filter by horse_id
    AND (
      _grant.resource_ids IS NULL 
      OR s.horse_id = ANY(_grant.resource_ids)
    )
    -- Date window filter using collection_date_only
    AND (
      s.collection_date_only IS NULL 
      OR (s.collection_date_only >= _effective_from AND s.collection_date_only <= _effective_to)
    )
    -- Forward only: if enabled, only include results created after grant creation
    AND (
      NOT _grant.forward_only 
      OR r.created_at >= _grant.created_at
    );
  
  -- Log access event
  PERFORM public.log_sharing_event(
    'data_accessed',
    _grant.connection_id,
    _grant_id,
    _user_id,
    _conn.recipient_tenant_id,
    _grant.grantor_tenant_id,
    NULL,
    _grant.resource_type,
    _grant.resource_ids,
    jsonb_build_object('date_from', _effective_from, 'date_to', _effective_to)
  );
  
  -- Return structured payload
  RETURN jsonb_build_object(
    'grant_id', _grant_id,
    'resource_type', _grant.resource_type,
    'access_level', _grant.access_level,
    'horse_ids', COALESCE(_grant.resource_ids, ARRAY[]::uuid[]),
    'effective_from', _effective_from,
    'effective_to', _effective_to,
    'excluded_fields', _excluded,
    'lab_results', _results
  );
END;
$$;

-- 14. NEW: expire_stale_connections utility RPC
CREATE OR REPLACE FUNCTION public.expire_stale_connections()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expired_count integer;
BEGIN
  UPDATE public.connections
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  
  GET DIAGNOSTICS _expired_count = ROW_COUNT;
  
  RETURN _expired_count;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.expire_stale_connections() TO authenticated;