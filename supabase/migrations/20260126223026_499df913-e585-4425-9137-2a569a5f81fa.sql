
-- Phase 4: Sharing Grants RLS Enforcement + Data Access Audit
-- This migration adds the can_access_shared_resource helper and updates RLS for lab_results

-- ============================================================
-- PART B1: Create can_access_shared_resource helper function
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_shared_resource(
  _actor_user_id uuid,
  _resource_type text,
  _resource_id uuid,
  _required_access text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_access boolean := false;
BEGIN
  -- Check if any active grant exists for this actor + resource
  SELECT EXISTS (
    SELECT 1
    FROM public.consent_grants g
    JOIN public.connections c ON c.id = g.connection_id
    WHERE 
      -- Grant must be active
      g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (g.revoked_at IS NULL)
      -- Connection must be accepted
      AND c.status = 'accepted'
      -- Resource type must match
      AND g.resource_type = _resource_type
      -- Access level must be sufficient (read allows read, write allows both)
      AND (
        g.access_level = _required_access 
        OR g.access_level = 'write'
      )
      -- Actor must be the recipient of the connection
      AND (
        c.recipient_profile_id = _actor_user_id
        OR (c.recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(_actor_user_id, c.recipient_tenant_id))
      )
      -- Resource ID filter (if grant has specific IDs, resource must be in the list; otherwise grant applies to all)
      AND (
        g.resource_ids IS NULL 
        OR array_length(g.resource_ids, 1) IS NULL
        OR _resource_id::text = ANY(g.resource_ids)
      )
  ) INTO _has_access;
  
  RETURN _has_access;
END;
$$;

COMMENT ON FUNCTION public.can_access_shared_resource IS 'Check if actor has shared access to a specific resource via consent grants';

-- ============================================================
-- PART C1: Create log_data_access helper function
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_data_access(
  _grant_id uuid,
  _resource_type text,
  _resource_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
BEGIN
  -- Get grant details
  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;
  
  IF _grant.id IS NULL THEN
    RETURN; -- Silent fail for logging
  END IF;
  
  -- Log the data access event
  PERFORM public.log_sharing_event(
    _event_type := 'data_accessed',
    _connection_id := _grant.connection_id,
    _grant_id := _grant_id,
    _actor_user_id := _user_id,
    _actor_tenant_id := NULL, -- recipient accessing
    _target_tenant_id := _grant.grantor_tenant_id,
    _target_profile_id := NULL,
    _resource_type := _resource_type,
    _resource_ids := _resource_ids,
    _metadata := jsonb_build_object('access_level', _grant.access_level)
  );
END;
$$;

COMMENT ON FUNCTION public.log_data_access IS 'Log when shared data is accessed via a grant';

-- ============================================================
-- PART B2: Add RLS policy for lab_results to allow shared access
-- ============================================================

-- First check if lab_results table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'lab_results'
  ) THEN
    -- Add policy for shared access via grants
    -- Drop if exists first to make this idempotent
    DROP POLICY IF EXISTS "Shared access via grants" ON public.lab_results;
    
    CREATE POLICY "Shared access via grants"
      ON public.lab_results
      FOR SELECT
      USING (
        public.can_access_shared_resource(auth.uid(), 'lab_results', id, 'read')
      );
  END IF;
END $$;

-- ============================================================
-- Update get_granted_data to log access
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_granted_data(
  _grant_id uuid,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
  _conn public.connections%ROWTYPE;
  _result jsonb := '[]'::jsonb;
  _accessed_ids text[] := ARRAY[]::text[];
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get grant
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
  
  -- Get connection
  SELECT * INTO _conn FROM public.connections WHERE id = _grant.connection_id;
  
  IF _conn.status != 'accepted' THEN
    RAISE EXCEPTION 'Connection is not accepted';
  END IF;
  
  -- Authorization: user must be recipient
  IF NOT (
    _conn.recipient_profile_id = _user_id
    OR (_conn.recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(_user_id, _conn.recipient_tenant_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this grant';
  END IF;
  
  -- Apply date filters from grant if more restrictive
  IF _grant.date_from IS NOT NULL AND (_date_from IS NULL OR _date_from < _grant.date_from) THEN
    _date_from := _grant.date_from;
  END IF;
  
  IF _grant.date_to IS NOT NULL AND (_date_to IS NULL OR _date_to > _grant.date_to) THEN
    _date_to := _grant.date_to;
  END IF;
  
  -- Fetch data based on resource_type
  CASE _grant.resource_type
    WHEN 'lab_results' THEN
      SELECT 
        jsonb_agg(row_to_json(r)::jsonb),
        array_agg(r.id::text)
      INTO _result, _accessed_ids
      FROM (
        SELECT lr.id, lr.horse_id, lr.test_type_id, lr.result_date, lr.status, lr.result_summary, lr.created_at
        FROM public.lab_results lr
        WHERE lr.tenant_id = _grant.grantor_tenant_id
          AND (_grant.resource_ids IS NULL OR array_length(_grant.resource_ids, 1) IS NULL OR lr.id::text = ANY(_grant.resource_ids))
          AND (_date_from IS NULL OR lr.result_date >= _date_from)
          AND (_date_to IS NULL OR lr.result_date <= _date_to)
        ORDER BY lr.result_date DESC
        LIMIT 100
      ) r;
      
    WHEN 'vet_records' THEN
      SELECT 
        jsonb_agg(row_to_json(r)::jsonb),
        array_agg(r.id::text)
      INTO _result, _accessed_ids
      FROM (
        SELECT vt.id, vt.horse_id, vt.treatment_date, vt.treatment_type, vt.description, vt.status, vt.created_at
        FROM public.vet_treatments vt
        WHERE vt.tenant_id = _grant.grantor_tenant_id
          AND (_grant.resource_ids IS NULL OR array_length(_grant.resource_ids, 1) IS NULL OR vt.id::text = ANY(_grant.resource_ids))
          AND (_date_from IS NULL OR vt.treatment_date >= _date_from)
          AND (_date_to IS NULL OR vt.treatment_date <= _date_to)
        ORDER BY vt.treatment_date DESC
        LIMIT 100
      ) r;
      
    WHEN 'breeding_records' THEN
      SELECT 
        jsonb_agg(row_to_json(r)::jsonb),
        array_agg(r.id::text)
      INTO _result, _accessed_ids
      FROM (
        SELECT ba.id, ba.mare_id, ba.stallion_id, ba.attempt_date, ba.attempt_type, ba.result, ba.created_at
        FROM public.breeding_attempts ba
        WHERE ba.tenant_id = _grant.grantor_tenant_id
          AND (_grant.resource_ids IS NULL OR array_length(_grant.resource_ids, 1) IS NULL OR ba.id::text = ANY(_grant.resource_ids))
          AND (_date_from IS NULL OR ba.attempt_date >= _date_from)
          AND (_date_to IS NULL OR ba.attempt_date <= _date_to)
        ORDER BY ba.attempt_date DESC
        LIMIT 100
      ) r;
      
    ELSE
      RAISE EXCEPTION 'Unsupported resource type: %', _grant.resource_type;
  END CASE;
  
  -- Log data access
  IF _accessed_ids IS NOT NULL AND array_length(_accessed_ids, 1) > 0 THEN
    PERFORM public.log_data_access(_grant_id, _grant.resource_type, _accessed_ids);
  END IF;
  
  RETURN COALESCE(_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_granted_data IS 'Retrieve shared data for a grant with access logging';
