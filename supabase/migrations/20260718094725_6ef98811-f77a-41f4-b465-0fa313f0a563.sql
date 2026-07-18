-- 2QA-C Cross-Tenant Catalog Closure — replace get_lab_services_for_viewer to
-- surface shared category identity (id, key, en/ar name, active flag) via a
-- same-tenant join to tenant_service_categories. The legacy free-text
-- ls.category column is preserved for historical compatibility only; the
-- primary filter now uses category_id.

DROP FUNCTION IF EXISTS public.get_lab_services_for_viewer(uuid, boolean, text, text);

CREATE OR REPLACE FUNCTION public.get_lab_services_for_viewer(
  _lab_tenant_id uuid,
  _only_active boolean DEFAULT true,
  _search text DEFAULT ''::text,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  name_ar text,
  code text,
  description text,
  sample_type text,
  turnaround_hours integer,
  price numeric,
  currency text,
  is_active boolean,
  category_id uuid,
  category_key text,
  category_name text,
  category_name_ar text,
  category_is_active boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  _is_own_member := public.is_active_tenant_member(_user_id, _lab_tenant_id);

  IF NOT _is_own_member THEN
    SELECT t.is_public INTO _is_public_lab
    FROM public.tenants t WHERE t.id = _lab_tenant_id;

    IF _is_public_lab IS NOT TRUE THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.connections c
        JOIN public.tenant_members tm
          ON tm.user_id = _user_id AND tm.is_active = true
        WHERE c.connection_type = 'b2b'
          AND c.status = 'accepted'
          AND (
            (c.initiator_tenant_id = tm.tenant_id AND c.recipient_tenant_id = _lab_tenant_id)
            OR
            (c.recipient_tenant_id = tm.tenant_id AND c.initiator_tenant_id = _lab_tenant_id)
          )
      ) INTO _has_partnership;

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
    ls.description,
    ls.sample_type,
    ls.turnaround_hours,
    ls.price,
    ls.currency,
    ls.is_active,
    tsc.id            AS category_id,
    tsc.key           AS category_key,
    tsc.name          AS category_name,
    tsc.name_ar       AS category_name_ar,
    tsc.is_active     AS category_is_active
  FROM public.lab_services ls
  LEFT JOIN public.tenant_service_categories tsc
    ON tsc.id = ls.category_id
   AND tsc.tenant_id = ls.tenant_id           -- hard same-tenant guard on the join
   AND tsc.tenant_id = _lab_tenant_id
  WHERE ls.tenant_id = _lab_tenant_id
    AND (NOT _only_active OR ls.is_active = true)
    AND (
      _search = ''
      OR ls.name ILIKE _search_pattern
      OR ls.name_ar ILIKE _search_pattern
      OR ls.code ILIKE _search_pattern
      OR tsc.name ILIKE _search_pattern
      OR tsc.name_ar ILIKE _search_pattern
    )
    AND (_category_id IS NULL OR ls.category_id = _category_id)
  ORDER BY tsc.name NULLS LAST, ls.name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_lab_services_for_viewer(uuid, boolean, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lab_services_for_viewer(uuid, boolean, text, uuid) TO authenticated, service_role;