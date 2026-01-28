
-- Drop audit triggers that are causing issues during data cleanup
DROP TRIGGER IF EXISTS trg_audit_member_bundles_delete ON member_permission_bundles;
DROP TRIGGER IF EXISTS trg_audit_member_bundles_insert ON member_permission_bundles;
DROP TRIGGER IF EXISTS trg_audit_member_permissions_delete ON member_permissions;
DROP TRIGGER IF EXISTS trg_audit_member_permissions_insert ON member_permissions;
DROP TRIGGER IF EXISTS trg_audit_delegation_scopes_delete ON delegation_scopes;
DROP TRIGGER IF EXISTS trg_audit_delegation_scopes_insert ON delegation_scopes;
