-- =============================================
-- P2: tenant_members immutability trigger
-- Prevent changing tenant_id or user_id after creation
-- =============================================

CREATE OR REPLACE FUNCTION public.enforce_tenant_member_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after member creation';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id after member creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_member_immutability_trigger ON public.tenant_members;

CREATE TRIGGER enforce_tenant_member_immutability_trigger
BEFORE UPDATE ON public.tenant_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tenant_member_immutability();

-- =============================================
-- P3: role_audit_log table + audit triggers
-- Covers: tenant_roles, tenant_role_permissions, tenant_role_bundles, delegation_scopes
-- =============================================

-- 1) Create role_audit_log table
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  table_name text NOT NULL,
  action text NOT NULL,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_role_audit_log_tenant_id ON public.role_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_log_created_at ON public.role_audit_log(created_at DESC);

-- 3) RLS + SELECT policy (owner-only)
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view role audit log" ON public.role_audit_log;

CREATE POLICY "Owners can view role audit log"
  ON public.role_audit_log
  FOR SELECT
  USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));

-- (Optional hardening) Ensure no other write policies exist
DROP POLICY IF EXISTS "Insert role audit log" ON public.role_audit_log;
DROP POLICY IF EXISTS "Update role audit log" ON public.role_audit_log;
DROP POLICY IF EXISTS "Delete role audit log" ON public.role_audit_log;

-- 4) Privileges: lock down table access (app cannot write directly)
REVOKE ALL ON TABLE public.role_audit_log FROM anon;
REVOKE ALL ON TABLE public.role_audit_log FROM authenticated;
GRANT SELECT ON TABLE public.role_audit_log TO authenticated;

-- 5) Trigger function: SECURITY DEFINER so it can insert into role_audit_log
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_action text;
  v_row_id text;
  v_old_data jsonb;
  v_new_data jsonb;
  j jsonb;
  v_actor uuid;
BEGIN
  -- Actor must exist; if not, do not log
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_new_data := to_jsonb(NEW);
    v_tenant_id := NEW.tenant_id;
    j := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_tenant_id := NEW.tenant_id;
    j := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_old_data := to_jsonb(OLD);
    v_tenant_id := OLD.tenant_id;
    j := to_jsonb(OLD);
  END IF;

  -- Robust row_id extraction with fallbacks
  v_row_id := COALESCE(
    j->>'id',
    j->>'role_key',
    j->>'permission_key',
    j->>'bundle_id',
    'unknown'
  );

  INSERT INTO public.role_audit_log (
    tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
  ) VALUES (
    v_tenant_id, v_actor, TG_TABLE_NAME, v_action, v_row_id, v_old_data, v_new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6) Attach audit triggers to role-related tables
-- tenant_roles
DROP TRIGGER IF EXISTS trg_audit_tenant_roles ON public.tenant_roles;

CREATE TRIGGER trg_audit_tenant_roles
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- tenant_role_permissions
DROP TRIGGER IF EXISTS trg_audit_tenant_role_permissions ON public.tenant_role_permissions;

CREATE TRIGGER trg_audit_tenant_role_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- tenant_role_bundles
DROP TRIGGER IF EXISTS trg_audit_tenant_role_bundles ON public.tenant_role_bundles;

CREATE TRIGGER trg_audit_tenant_role_bundles
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_role_bundles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- delegation_scopes (ADDED)
DROP TRIGGER IF EXISTS trg_audit_delegation_scopes ON public.delegation_scopes;

CREATE TRIGGER trg_audit_delegation_scopes
AFTER INSERT OR UPDATE OR DELETE ON public.delegation_scopes
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();