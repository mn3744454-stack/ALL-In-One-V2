BEGIN;

--------------------------------------------------------
-- A1) إزالة GRANT الخطير على seed_tenant_roles
--------------------------------------------------------
REVOKE ALL ON FUNCTION public.seed_tenant_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_tenant_roles() FROM authenticated;

--------------------------------------------------------
-- A2) هاردننق سياسات RLS لجداول Mapping: امنع UPDATE
--------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update tenant role bundles" ON public.tenant_role_bundles;
DROP POLICY IF EXISTS "Owners can update tenant role permissions" ON public.tenant_role_permissions;

--------------------------------------------------------
-- A4) فهارس الأداء لـ has_permission
--------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_user_active
  ON public.tenant_members (tenant_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_member_permissions_member_perm
  ON public.member_permissions (tenant_member_id, permission_key);

CREATE INDEX IF NOT EXISTS idx_member_permission_bundles_member
  ON public.member_permission_bundles (tenant_member_id);

CREATE INDEX IF NOT EXISTS idx_bundle_permissions_bundle_perm
  ON public.bundle_permissions (bundle_id, permission_key);

CREATE INDEX IF NOT EXISTS idx_tenant_role_permissions_lookup
  ON public.tenant_role_permissions (tenant_id, role_key, permission_key)
  WHERE granted = true;

CREATE INDEX IF NOT EXISTS idx_tenant_role_bundles_lookup
  ON public.tenant_role_bundles (tenant_id, role_key, bundle_id);

--------------------------------------------------------
-- A5) RPC ذرّية لتحديث Bundles+Permissions للدور (Atomic)
--------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tenant_role_access(
  _tenant_id uuid,
  _role_key text,
  _permission_keys text[],
  _bundle_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Owner-only guard
  IF NOT public.has_tenant_role(auth.uid(), _tenant_id, 'owner') THEN
    RAISE EXCEPTION 'Only owner can update role access';
  END IF;

  -- Prevent editing system owner role access
  IF _role_key = 'owner' THEN
    RAISE EXCEPTION 'Owner role cannot be modified';
  END IF;

  -- Ensure role exists in this tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_roles tr
    WHERE tr.tenant_id = _tenant_id AND tr.role_key = _role_key
  ) THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- Replace permissions atomically
  DELETE FROM public.tenant_role_permissions
   WHERE tenant_id = _tenant_id AND role_key = _role_key;

  IF _permission_keys IS NOT NULL AND array_length(_permission_keys, 1) > 0 THEN
    INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted, created_by)
    SELECT _tenant_id, _role_key, pk, true, auth.uid()
    FROM unnest(_permission_keys) pk;
  END IF;

  -- Replace bundles atomically
  DELETE FROM public.tenant_role_bundles
   WHERE tenant_id = _tenant_id AND role_key = _role_key;

  IF _bundle_ids IS NOT NULL AND array_length(_bundle_ids, 1) > 0 THEN
    INSERT INTO public.tenant_role_bundles (tenant_id, role_key, bundle_id, created_by)
    SELECT _tenant_id, _role_key, bid, auth.uid()
    FROM unnest(_bundle_ids) bid;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_role_access(uuid, text, text[], uuid[]) TO authenticated;

COMMIT;