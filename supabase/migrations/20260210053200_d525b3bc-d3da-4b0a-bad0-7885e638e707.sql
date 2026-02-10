-- Recreate RPC: get_lab_services_for_viewer
-- Behavior:
-- - Own lab members: can read (active only optional)
-- - Non-members: can read only if lab is public OR there is an accepted B2B partnership
-- - If no access: RAISE EXCEPTION 'no_access' (so frontend can show Access Restricted)

CREATE OR REPLACE FUNCTION public.get_lab_services_for_viewer(
  _lab_tenant_id uuid,
  _only_active boolean DEFAULT true,
  _search text DEFAULT '',
  _category text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  name_ar text,
  code text,
  category text,
  description text,
  sample_type text,
  turnaround_hours integer,
  price numeric,
  currency text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_own_member boolean;
  _is_public_lab boolean;
  _has_partnership boolean;
  _search_pattern text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Own-tenant member?
  _is_own_member := public.is_active_tenant_member(_user_id, _lab_tenant_id);

  IF NOT _is_own_member THEN
    -- Lab public?
    SELECT t.is_public
      INTO _is_public_lab
    FROM public.tenants t
    WHERE t.id = _lab_tenant_id;

    IF _is_public_lab IS NOT TRUE THEN
      -- Accepted B2B partnership with ANY active tenant the user belongs to
      SELECT EXISTS (
        SELECT 1
        FROM public.connections c
        JOIN public.tenant_members tm
          ON tm.user_id = _user_id
         AND tm.is_active = true
        WHERE c.connection_type = 'b2b'
          AND c.status = 'accepted'
          AND (
            (c.initiator_tenant_id = tm.tenant_id AND c.recipient_tenant_id = _lab_tenant_id)
            OR
            (c.recipient_tenant_id = tm.tenant_id AND c.initiator_tenant_id = _lab_tenant_id)
          )
      )
      INTO _has_partnership;

      IF NOT _has_partnership THEN
        RAISE EXCEPTION 'no_access'
          USING HINT = 'Caller has no access to this lab catalog';
      END IF;
    END IF;
  END IF;

  _search_pattern := '%' || COALESCE(btrim(_search), '') || '%';

  RETURN QUERY
  SELECT
    ls.id,
    ls.name,
    ls.name_ar,
    ls.code,
    ls.category,
    ls.description,
    ls.sample_type,
    ls.turnaround_hours,
    ls.price,
    ls.currency,
    ls.is_active
  FROM public.lab_services ls
  WHERE ls.tenant_id = _lab_tenant_id
    AND (NOT _only_active OR ls.is_active = true)
    AND (
      _search = ''
      OR ls.name ILIKE _search_pattern
      OR ls.name_ar ILIKE _search_pattern
      OR ls.code ILIKE _search_pattern
    )
    AND (_category IS NULL OR ls.category = _category)
  ORDER BY ls.category NULLS LAST, ls.name;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lab_services_for_viewer(uuid, boolean, text, text) TO authenticated;