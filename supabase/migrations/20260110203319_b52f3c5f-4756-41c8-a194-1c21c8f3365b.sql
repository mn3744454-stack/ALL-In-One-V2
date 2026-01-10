-- 1) Drop existing policies (أي نسخة سابقة سواء insecure أو semi-hardened)
DROP POLICY IF EXISTS "Insert member bundle assignments" ON public.member_permission_bundles;
DROP POLICY IF EXISTS "Delete member bundle assignments" ON public.member_permission_bundles;
DROP POLICY IF EXISTS "Insert member bundle assignments with full delegation check" ON public.member_permission_bundles;
DROP POLICY IF EXISTS "Delete member bundle assignments with full delegation check" ON public.member_permission_bundles;

-- 2) Recreate hardened INSERT policy:
-- يسمح للـOwner دائماً، وغير المالك يجب:
-- (a) يمتلك admin.permissions.delegate
-- (b) ويستطيع تفويض ALL permissions داخل الـbundle عبر can_delegate_permission
-- (c) Hardening إضافي: يمنع "empty bundle" من غير المالك (owner فقط يقدر يسند bundle بلا صلاحيات)
CREATE POLICY "Insert member bundle assignments with full delegation check"
  ON public.member_permission_bundles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.id = public.member_permission_bundles.tenant_member_id
        AND (
          public.has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
          OR (
            public.has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate')
            AND EXISTS (
              SELECT 1
              FROM public.bundle_permissions bp_any
              WHERE bp_any.bundle_id = public.member_permission_bundles.bundle_id
            )
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

-- 3) Recreate hardened DELETE policy (symmetric)
CREATE POLICY "Delete member bundle assignments with full delegation check"
  ON public.member_permission_bundles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.id = public.member_permission_bundles.tenant_member_id
        AND (
          public.has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
          OR (
            public.has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate')
            AND EXISTS (
              SELECT 1
              FROM public.bundle_permissions bp_any
              WHERE bp_any.bundle_id = public.member_permission_bundles.bundle_id
            )
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