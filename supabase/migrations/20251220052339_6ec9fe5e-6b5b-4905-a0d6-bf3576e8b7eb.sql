-- Fix missing table privileges for authenticated role
-- Without these GRANTs, PostgREST will return 403 and inserts can fail regardless of RLS.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.horses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

-- (Optional) allow authenticated to use uuid generation if needed by defaults
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, tenant_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_invite_in_tenant(uuid, uuid) TO authenticated;