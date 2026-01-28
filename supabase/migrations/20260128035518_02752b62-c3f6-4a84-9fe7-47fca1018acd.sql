
-- Drop delegation related triggers
DROP TRIGGER IF EXISTS on_member_permission_bundle_deleted ON member_permission_bundles;
DROP TRIGGER IF EXISTS on_member_permission_deleted ON member_permissions;
DROP TRIGGER IF EXISTS on_delegation_scope_deleted ON delegation_scopes;

-- Drop invitation related triggers  
DROP TRIGGER IF EXISTS on_invitation_update ON invitations;
DROP TRIGGER IF EXISTS ensure_invitation_immutability ON invitations;
