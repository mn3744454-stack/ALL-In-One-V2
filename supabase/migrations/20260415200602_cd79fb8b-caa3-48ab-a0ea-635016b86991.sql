
DROP FUNCTION IF EXISTS public.search_tenants_for_partnership(text, uuid);

CREATE FUNCTION public.search_tenants_for_partnership(_search text, _exclude_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, name text, name_ar text, type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  SELECT DISTINCT t.id, t.name, t.name_ar, t.type::text
  FROM public.tenants t
  WHERE (
    t.is_public = true
    OR EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = t.id AND tm.user_id = _user_id AND tm.is_active = true
    )
  )
  AND (
    _search = '' OR t.name ILIKE _search_pattern OR t.name_ar ILIKE _search_pattern
  )
  AND (
    _exclude_tenant_id IS NULL OR t.id != _exclude_tenant_id
  )
  ORDER BY t.name
  LIMIT 20;
END;
$$;
