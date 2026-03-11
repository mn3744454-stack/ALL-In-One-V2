
-- Wire connected movement permissions to owner/manager roles
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, pd.key, true
FROM public.tenant_roles tr
CROSS JOIN (
  SELECT key FROM public.permission_definitions
  WHERE key IN ('movement.connected.create', 'movement.incoming.view', 'movement.incoming.confirm')
) pd
WHERE tr.name IN ('owner', 'manager')
ON CONFLICT DO NOTHING;

-- Also add view permission for staff roles
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, 'movement.incoming.view', true
FROM public.tenant_roles tr
WHERE tr.name = 'staff'
ON CONFLICT DO NOTHING;
