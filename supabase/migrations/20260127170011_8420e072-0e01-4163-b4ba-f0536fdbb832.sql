-- إصلاح: إزالة ::text casts لمقارنة uuid مع uuid[]
-- يصلح خطأ "operator does not exist: text = uuid"

-- 1. حذف النسخة المكررة من الدالة (إن وجدت)
DROP FUNCTION IF EXISTS public.can_access_shared_resource(uuid, text, uuid);

-- 2. إعادة إنشاء can_access_shared_resource مع الإصلاح
CREATE OR REPLACE FUNCTION public.can_access_shared_resource(
  _tenant_id uuid,
  _resource_type text,
  _resource_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is a member of the tenant that owns the resource
  IF is_active_tenant_member(_tenant_id) THEN
    RETURN true;
  END IF;

  -- Check if user has been granted access via consent_grants
  RETURN EXISTS (
    SELECT 1
    FROM consent_grants g
    JOIN connections c ON c.id = g.connection_id
    WHERE g.resource_type = _resource_type
      AND g.status = 'active'
      AND c.status = 'accepted'
      AND (
        -- User is recipient of the connection
        c.recipient_profile_id = _user_id
        OR
        -- User is member of recipient tenant
        (c.recipient_tenant_id IS NOT NULL AND is_active_tenant_member(c.recipient_tenant_id))
      )
      AND (
        -- Grant covers all resources (resource_ids is null)
        g.resource_ids IS NULL
        OR
        -- Grant covers this specific resource (إصلاح: إزالة ::text)
        _resource_id = ANY(g.resource_ids)
      )
      AND (g.expires_at IS NULL OR g.expires_at > now())
  );
END;
$$;

-- 3. إعادة إنشاء get_granted_data مع الإصلاح
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
  _user_id uuid;
  _grant consent_grants%ROWTYPE;
  _result jsonb := '[]'::jsonb;
  _connection connections%ROWTYPE;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch the grant
  SELECT * INTO _grant FROM consent_grants WHERE id = _grant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;

  -- Fetch the connection
  SELECT * INTO _connection FROM connections WHERE id = _grant.connection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  -- Verify user is authorized to access this grant (recipient side)
  IF NOT (
    _connection.recipient_profile_id = _user_id
    OR (_connection.recipient_tenant_id IS NOT NULL AND is_active_tenant_member(_connection.recipient_tenant_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this grant';
  END IF;

  -- Check grant is active
  IF _grant.status != 'active' THEN
    RAISE EXCEPTION 'Grant is not active';
  END IF;

  IF _grant.expires_at IS NOT NULL AND _grant.expires_at < now() THEN
    RAISE EXCEPTION 'Grant has expired';
  END IF;

  -- Log the access
  INSERT INTO sharing_audit_log (grant_id, accessor_user_id, accessor_tenant_id, action, resource_type)
  VALUES (
    _grant_id,
    _user_id,
    _connection.recipient_tenant_id,
    'view',
    _grant.resource_type
  );

  -- Fetch data based on resource type
  CASE _grant.resource_type
    WHEN 'lab_results' THEN
      SELECT jsonb_agg(row_to_json(lr.*)::jsonb)
      INTO _result
      FROM lab_results lr
      WHERE lr.tenant_id = _grant.grantor_tenant_id
        AND (
          _grant.resource_ids IS NULL
          OR lr.id = ANY(_grant.resource_ids)  -- إصلاح: إزالة ::text
        )
        AND (
          _date_from IS NULL
          OR lr.result_date >= _date_from
          OR (_grant.forward_only = true AND lr.created_at >= _grant.created_at)
        )
        AND (_date_to IS NULL OR lr.result_date <= _date_to)
        AND (_grant.date_from IS NULL OR lr.result_date >= _grant.date_from)
        AND (_grant.date_to IS NULL OR lr.result_date <= _grant.date_to);

    WHEN 'vet_records' THEN
      SELECT jsonb_agg(row_to_json(vt.*)::jsonb)
      INTO _result
      FROM vet_treatments vt
      WHERE vt.tenant_id = _grant.grantor_tenant_id
        AND (
          _grant.resource_ids IS NULL
          OR vt.id = ANY(_grant.resource_ids)  -- إصلاح: إزالة ::text
        )
        AND (
          _date_from IS NULL
          OR vt.treatment_date >= _date_from
          OR (_grant.forward_only = true AND vt.created_at >= _grant.created_at)
        )
        AND (_date_to IS NULL OR vt.treatment_date <= _date_to)
        AND (_grant.date_from IS NULL OR vt.treatment_date >= _grant.date_from)
        AND (_grant.date_to IS NULL OR vt.treatment_date <= _grant.date_to);

    WHEN 'breeding_records' THEN
      SELECT jsonb_agg(row_to_json(ba.*)::jsonb)
      INTO _result
      FROM breeding_attempts ba
      WHERE ba.tenant_id = _grant.grantor_tenant_id
        AND (
          _grant.resource_ids IS NULL
          OR ba.id = ANY(_grant.resource_ids)  -- إصلاح: إزالة ::text
        )
        AND (
          _date_from IS NULL
          OR ba.attempt_date >= _date_from
          OR (_grant.forward_only = true AND ba.created_at >= _grant.created_at)
        )
        AND (_date_to IS NULL OR ba.attempt_date <= _date_to)
        AND (_grant.date_from IS NULL OR ba.attempt_date >= _grant.date_from)
        AND (_grant.date_to IS NULL OR ba.attempt_date <= _grant.date_to);

    ELSE
      RAISE EXCEPTION 'Unsupported resource type: %', _grant.resource_type;
  END CASE;

  RETURN COALESCE(_result, '[]'::jsonb);
END;
$$;