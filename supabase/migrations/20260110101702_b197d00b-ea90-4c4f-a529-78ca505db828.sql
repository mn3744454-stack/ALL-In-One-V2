-- Fix privilege escalation gap in bundle delegation
-- Ensures non-owners can only assign/remove bundles if they can delegate ALL permissions in the bundle

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Insert member bundle assignments" ON member_permission_bundles;
DROP POLICY IF EXISTS "Delete member bundle assignments" ON member_permission_bundles;

-- New INSERT policy: Owner can always assign; non-owner must be able to delegate ALL bundle permissions
CREATE POLICY "Insert member bundle assignments with full delegation check"
  ON member_permission_bundles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.id = member_permission_bundles.tenant_member_id
      AND (
        has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
        OR (
          NOT EXISTS (
            SELECT 1 FROM bundle_permissions bp
            WHERE bp.bundle_id = member_permission_bundles.bundle_id
              AND NOT can_delegate_permission(auth.uid(), tm.tenant_id, bp.permission_key)
          )
        )
      )
    )
  );

-- New DELETE policy: Symmetric logic - must be able to delegate ALL bundle permissions to remove
CREATE POLICY "Delete member bundle assignments with full delegation check"
  ON member_permission_bundles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.id = member_permission_bundles.tenant_member_id
      AND (
        has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
        OR (
          NOT EXISTS (
            SELECT 1 FROM bundle_permissions bp
            WHERE bp.bundle_id = member_permission_bundles.bundle_id
              AND NOT can_delegate_permission(auth.uid(), tm.tenant_id, bp.permission_key)
          )
        )
      )
    )
  );