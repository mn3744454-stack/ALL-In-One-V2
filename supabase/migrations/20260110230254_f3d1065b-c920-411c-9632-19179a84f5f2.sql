-- Patch 2.1: Revoke EXECUTE from anon and service_role on seed_tenant_roles
REVOKE ALL ON FUNCTION public.seed_tenant_roles() FROM anon;
REVOKE ALL ON FUNCTION public.seed_tenant_roles() FROM service_role;