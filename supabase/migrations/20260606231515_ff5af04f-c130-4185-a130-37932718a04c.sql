-- B2.5e.1 — Backfill contracts.* permission keys for manager role.
-- Only inserts rows in (tenant_id, role_key='manager') pairs that already exist
-- in tenant_role_permissions (i.e. tenants where manager is in use). Idempotent.
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT DISTINCT trp.tenant_id, 'manager'::text, pd.key, true
FROM public.tenant_role_permissions trp
CROSS JOIN public.permission_definitions pd
WHERE trp.role_key = 'manager'
  AND pd.key LIKE 'contracts.%'
ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
