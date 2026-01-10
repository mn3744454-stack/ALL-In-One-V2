-- Drop the policies that were just created (so we can recreate them hardened)
DROP POLICY IF EXISTS "Insert member bundle assignments with full delegation check" ON public.member_permission_bundles;
DROP POLICY IF EXISTS "Delete member bundle assignments with full delegation check" ON public.member_permission_bundles;

-- Recreate hardened INSERT policy:
-- Owner OR (must have admin.permissions.delegate AND must be able to delegate ALL permissions in the bundle)
CREATE POLICY "Insert member bundle assignments with full delegation check"
  ON public.member_permission_bundles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.id = public.member_permission_bundles.tenant_member_id
        AND (
          has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
          OR (
            has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate')
            AND NOT EXISTS (
              SELECT 1
              FROM public.bundle_permissions bp
              WHERE bp.bundle_id = public.member_permission_bundles.bundle_id
                AND NOT public.can_delegate_permission(auth.uid(), tm.tenant_id, bp.permission_key)
            )
          )
        )
    )
  );

-- Recreate hardened DELETE policy (symmetric)
CREATE POLICY "Delete member bundle assignments with full delegation check"
  ON public.member_permission_bundles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.id = public.member_permission_bundles.tenant_member_id
        AND (
          has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
          OR (
            has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate')
            AND NOT EXISTS (
              SELECT 1
              FROM public.bundle_permissions bp
              WHERE bp.bundle_id = public.member_permission_bundles.bundle_id
                AND NOT public.can_delegate_permission(auth.uid(), tm.tenant_id, bp.permission_key)
            )
          )
        )
    )
  );