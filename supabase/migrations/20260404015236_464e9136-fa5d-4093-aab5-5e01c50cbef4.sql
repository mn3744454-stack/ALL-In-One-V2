DELETE FROM tenant_role_permissions
WHERE role_key = 'manager'
  AND permission_key = 'admin.permissions.delegate';