-- PATCH 2.0.1: Server-side Audit + Delegation Scopes

-- ============================================
-- A) DELEGATION SCOPES TABLE
-- ============================================

CREATE TABLE public.delegation_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grantor_member_id uuid NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  can_delegate boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, grantor_member_id, permission_key)
);

ALTER TABLE delegation_scopes ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view delegation scopes for their tenant
CREATE POLICY "Tenant members can view delegation scopes"
  ON delegation_scopes FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- RLS: Only owners can manage delegation scopes
CREATE POLICY "Owners can manage delegation scopes"
  ON delegation_scopes FOR ALL
  USING (has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- ============================================
-- B) SERVER-SIDE AUDIT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_delegation_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_action text;
  v_permission_key text;
  v_target_member_id uuid;
BEGIN
  -- Determine action and values based on TG_OP and TG_TABLE_NAME
  IF TG_TABLE_NAME = 'member_permissions' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END;
      v_permission_key := NEW.permission_key;
      v_target_member_id := NEW.tenant_member_id;
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END;
      v_permission_key := NEW.permission_key;
      v_target_member_id := NEW.tenant_member_id;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'override_removed';
      v_permission_key := OLD.permission_key;
      v_target_member_id := OLD.tenant_member_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'member_permission_bundles' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'bundle_assigned';
      v_permission_key := NEW.bundle_id::text;
      v_target_member_id := NEW.tenant_member_id;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'bundle_removed';
      v_permission_key := OLD.bundle_id::text;
      v_target_member_id := OLD.tenant_member_id;
    END IF;
  END IF;

  -- Get tenant_id from tenant_members
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_members
  WHERE id = v_target_member_id;

  -- Insert audit log
  INSERT INTO delegation_audit_log (
    tenant_id,
    actor_user_id,
    target_member_id,
    permission_key,
    action
  ) VALUES (
    v_tenant_id,
    auth.uid(),
    v_target_member_id,
    v_permission_key,
    v_action
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- C) ATTACH TRIGGERS
-- ============================================

-- member_permissions triggers
CREATE TRIGGER trg_audit_member_permissions_insert
  AFTER INSERT ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION log_delegation_action();

CREATE TRIGGER trg_audit_member_permissions_update
  AFTER UPDATE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION log_delegation_action();

CREATE TRIGGER trg_audit_member_permissions_delete
  AFTER DELETE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION log_delegation_action();

-- member_permission_bundles triggers
CREATE TRIGGER trg_audit_member_bundles_insert
  AFTER INSERT ON member_permission_bundles
  FOR EACH ROW EXECUTE FUNCTION log_delegation_action();

CREATE TRIGGER trg_audit_member_bundles_delete
  AFTER DELETE ON member_permission_bundles
  FOR EACH ROW EXECUTE FUNCTION log_delegation_action();

-- ============================================
-- D) UPDATE can_delegate_permission FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.can_delegate_permission(
  _user_id uuid,
  _tenant_id uuid,
  _permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member_id uuid;
  member_role text;
  perm_is_delegatable boolean;
  scope_allows boolean;
BEGIN
  -- Get user's member ID and role
  SELECT id, role INTO member_id, member_role
  FROM tenant_members
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND is_active = true;

  IF member_id IS NULL THEN
    RETURN false;
  END IF;

  -- Owner can always delegate
  IF member_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Check if permission exists and is delegatable
  SELECT is_delegatable INTO perm_is_delegatable
  FROM permission_definitions
  WHERE key = _permission_key;

  IF NOT COALESCE(perm_is_delegatable, true) THEN
    RETURN false;
  END IF;

  -- Must have the permission itself
  IF NOT has_permission(_user_id, _tenant_id, _permission_key) THEN
    RETURN false;
  END IF;

  -- Must have admin.permissions.delegate
  IF NOT has_permission(_user_id, _tenant_id, 'admin.permissions.delegate') THEN
    RETURN false;
  END IF;

  -- Check delegation_scopes for explicit permission
  SELECT can_delegate INTO scope_allows
  FROM delegation_scopes
  WHERE tenant_id = _tenant_id
    AND grantor_member_id = member_id
    AND permission_key = _permission_key;

  -- If no scope row exists, default to FALSE (cannot delegate)
  RETURN COALESCE(scope_allows, false);
END;
$$;