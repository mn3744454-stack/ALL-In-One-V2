-- =====================================================
-- PHASE 2: DELEGATED RBAC + PERMISSION BUNDLES
-- =====================================================

-- 1) permission_definitions (global, seeded)
CREATE TABLE public.permission_definitions (
  key text PRIMARY KEY,
  module text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  display_name text NOT NULL,
  description text,
  description_ar text,
  is_delegatable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) permission_bundles (tenant-scoped templates)
CREATE TABLE public.permission_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 3) bundle_permissions (M2M: bundle <-> permission)
CREATE TABLE public.bundle_permissions (
  bundle_id uuid NOT NULL REFERENCES permission_bundles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, permission_key)
);

-- 4) member_permission_bundles (M2M: tenant_member <-> bundle)
CREATE TABLE public.member_permission_bundles (
  tenant_member_id uuid NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES permission_bundles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_member_id, bundle_id)
);

-- 5) member_permissions (individual overrides)
CREATE TABLE public.member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_member_id uuid NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_member_id, permission_key)
);

-- 6) delegation_audit_log
CREATE TABLE public.delegation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES profiles(id),
  target_member_id uuid NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_delegation_audit_tenant ON delegation_audit_log(tenant_id);
CREATE INDEX idx_delegation_audit_target ON delegation_audit_log(target_member_id);
CREATE INDEX idx_member_permissions_member ON member_permissions(tenant_member_id);
CREATE INDEX idx_bundle_permissions_bundle ON bundle_permissions(bundle_id);

-- 7) media_asset_clients (for customer_specific visibility)
CREATE TABLE public.media_asset_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, client_id)
);

-- 8) media_share_links (for shared_link visibility)
CREATE TABLE public.media_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_share_links_token ON media_share_links(token);
CREATE INDEX idx_media_asset_clients_asset ON media_asset_clients(asset_id);

-- =====================================================
-- SEED PERMISSION DEFINITIONS
-- =====================================================

INSERT INTO public.permission_definitions (key, module, resource, action, display_name, description, is_delegatable) VALUES
-- Admin
('admin.members.invite', 'admin', 'members', 'invite', 'Invite Members', 'Can invite new members to the organization', true),
('admin.members.manage', 'admin', 'members', 'manage', 'Manage Members', 'Can manage member roles and permissions', true),
('admin.permissions.delegate', 'admin', 'permissions', 'delegate', 'Delegate Permissions', 'Can grant permissions to other members', true),
-- Horses
('horses.media.manage', 'horses', 'media', 'manage', 'Manage Horse Media', 'Can upload/delete horse photos and videos', true),
('horses.records.view', 'horses', 'records', 'view', 'View Horse Records', 'Can view horse information and history', true),
('horses.records.manage', 'horses', 'records', 'manage', 'Manage Horse Records', 'Can create and edit horse records', true),
-- Laboratory
('laboratory.samples.create', 'laboratory', 'samples', 'create', 'Create Lab Samples', 'Can submit new lab samples', true),
('laboratory.samples.view', 'laboratory', 'samples', 'view', 'View Lab Samples', 'Can view lab samples and results', true),
('laboratory.samples.manage', 'laboratory', 'samples', 'manage', 'Manage Lab Samples', 'Full control over lab samples', true),
-- Vet
('vet.visits.schedule', 'vet', 'visits', 'schedule', 'Schedule Vet Visits', 'Can schedule vet appointments', true),
('vet.visits.manage', 'vet', 'visits', 'manage', 'Manage Vet Visits', 'Full control over vet visits', true),
-- Finance
('finance.invoices.create', 'finance', 'invoices', 'create', 'Create Invoices', 'Can create new invoices', true),
('finance.invoices.send', 'finance', 'invoices', 'send', 'Send Invoices', 'Can send invoices to clients', true),
('finance.invoices.manage', 'finance', 'invoices', 'manage', 'Manage Invoices', 'Full control over invoices', true),
('finance.expenses.create', 'finance', 'expenses', 'create', 'Create Expenses', 'Can record expenses', true),
('finance.expenses.approve', 'finance', 'expenses', 'approve', 'Approve Expenses', 'Can approve expense claims', true),
('finance.expenses.manage', 'finance', 'expenses', 'manage', 'Manage Expenses', 'Full control over expenses', true),
-- Files
('files.assets.manage', 'files', 'assets', 'manage', 'Manage Files', 'Can upload, delete, and manage visibility of files', true);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- has_permission: Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
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
  override_granted boolean;
  bundle_has boolean;
BEGIN
  -- 1) Check if user is active tenant member
  SELECT id, role INTO member_id, member_role
  FROM tenant_members
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND is_active = true;

  IF member_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2) Owner always has all permissions
  IF member_role = 'owner' THEN
    RETURN true;
  END IF;

  -- 3) Check member_permissions override
  SELECT granted INTO override_granted
  FROM member_permissions
  WHERE tenant_member_id = member_id
    AND permission_key = _permission_key;

  IF FOUND THEN
    RETURN override_granted;
  END IF;

  -- 4) Check bundles assigned to member
  SELECT EXISTS (
    SELECT 1
    FROM member_permission_bundles mpb
    JOIN bundle_permissions bp ON bp.bundle_id = mpb.bundle_id
    WHERE mpb.tenant_member_id = member_id
      AND bp.permission_key = _permission_key
  ) INTO bundle_has;

  RETURN bundle_has;
END;
$$;

-- can_delegate_permission: Check if user can delegate a specific permission
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
  member_role text;
  perm_is_delegatable boolean;
BEGIN
  -- Get user's role in tenant
  SELECT role INTO member_role
  FROM tenant_members
  WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND is_active = true;

  IF member_role IS NULL THEN
    RETURN false;
  END IF;

  -- Owner can delegate everything
  IF member_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Check if permission is delegatable
  SELECT is_delegatable INTO perm_is_delegatable
  FROM permission_definitions
  WHERE key = _permission_key;

  IF NOT COALESCE(perm_is_delegatable, true) THEN
    -- Only owner can delegate non-delegatable permissions
    RETURN false;
  END IF;

  -- Must have the permission AND have delegation ability
  RETURN has_permission(_user_id, _tenant_id, _permission_key)
     AND has_permission(_user_id, _tenant_id, 'admin.permissions.delegate');
END;
$$;

-- get_media_share_info: Public RPC to get share info by token
CREATE OR REPLACE FUNCTION public.get_media_share_info(_token text)
RETURNS TABLE (
  bucket text,
  path text,
  filename text,
  mime_type text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ma.bucket,
    ma.path,
    ma.filename,
    ma.mime_type
  FROM media_share_links msl
  JOIN media_assets ma ON ma.id = msl.asset_id
  WHERE msl.token = _token
    AND msl.revoked_at IS NULL
    AND (msl.expires_at IS NULL OR msl.expires_at > now());
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_permission_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_asset_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_share_links ENABLE ROW LEVEL SECURITY;

-- permission_definitions: readable by all authenticated
CREATE POLICY "Authenticated users can view permission definitions"
  ON permission_definitions FOR SELECT
  TO authenticated
  USING (true);

-- permission_bundles policies
CREATE POLICY "Tenant members can view bundles"
  ON permission_bundles FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can insert bundles"
  ON permission_bundles FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_permission(auth.uid(), tenant_id, 'admin.permissions.delegate')
  );

CREATE POLICY "Owners can update bundles"
  ON permission_bundles FOR UPDATE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_permission(auth.uid(), tenant_id, 'admin.permissions.delegate')
  );

CREATE POLICY "Owners can delete bundles"
  ON permission_bundles FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_permission(auth.uid(), tenant_id, 'admin.permissions.delegate')
  );

-- bundle_permissions policies
CREATE POLICY "View bundle permissions"
  ON bundle_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM permission_bundles pb
    WHERE pb.id = bundle_id
    AND is_tenant_member(auth.uid(), pb.tenant_id)
  ));

CREATE POLICY "Insert bundle permissions"
  ON bundle_permissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM permission_bundles pb
    WHERE pb.id = bundle_id
    AND (has_tenant_role(auth.uid(), pb.tenant_id, 'owner')
      OR has_permission(auth.uid(), pb.tenant_id, 'admin.permissions.delegate'))
  ));

CREATE POLICY "Delete bundle permissions"
  ON bundle_permissions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM permission_bundles pb
    WHERE pb.id = bundle_id
    AND (has_tenant_role(auth.uid(), pb.tenant_id, 'owner')
      OR has_permission(auth.uid(), pb.tenant_id, 'admin.permissions.delegate'))
  ));

-- member_permission_bundles policies
CREATE POLICY "View member bundle assignments"
  ON member_permission_bundles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND is_tenant_member(auth.uid(), tm.tenant_id)
  ));

CREATE POLICY "Insert member bundle assignments"
  ON member_permission_bundles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND (has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
      OR has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate'))
  ));

CREATE POLICY "Delete member bundle assignments"
  ON member_permission_bundles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND (has_tenant_role(auth.uid(), tm.tenant_id, 'owner')
      OR has_permission(auth.uid(), tm.tenant_id, 'admin.permissions.delegate'))
  ));

-- member_permissions policies
CREATE POLICY "View member permissions"
  ON member_permissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND is_tenant_member(auth.uid(), tm.tenant_id)
  ));

CREATE POLICY "Insert member permissions with delegation check"
  ON member_permissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND can_delegate_permission(auth.uid(), tm.tenant_id, permission_key)
  ));

CREATE POLICY "Update member permissions with delegation check"
  ON member_permissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND can_delegate_permission(auth.uid(), tm.tenant_id, permission_key)
  ));

CREATE POLICY "Delete member permissions with delegation check"
  ON member_permissions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.id = tenant_member_id
    AND can_delegate_permission(auth.uid(), tm.tenant_id, permission_key)
  ));

-- delegation_audit_log policies
CREATE POLICY "Tenant members can view audit log"
  ON delegation_audit_log FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can insert audit log"
  ON delegation_audit_log FOR INSERT
  WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- media_asset_clients policies
CREATE POLICY "Tenant members can view asset clients"
  ON media_asset_clients FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert asset clients"
  ON media_asset_clients FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_tenant_role(auth.uid(), tenant_id, 'manager')
    OR has_permission(auth.uid(), tenant_id, 'files.assets.manage')
  );

CREATE POLICY "Managers can delete asset clients"
  ON media_asset_clients FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_tenant_role(auth.uid(), tenant_id, 'manager')
    OR has_permission(auth.uid(), tenant_id, 'files.assets.manage')
  );

-- media_share_links policies
CREATE POLICY "Tenant members can view share links"
  ON media_share_links FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert share links"
  ON media_share_links FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_tenant_role(auth.uid(), tenant_id, 'manager')
    OR has_permission(auth.uid(), tenant_id, 'files.assets.manage')
  );

CREATE POLICY "Managers can update share links"
  ON media_share_links FOR UPDATE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_tenant_role(auth.uid(), tenant_id, 'manager')
    OR has_permission(auth.uid(), tenant_id, 'files.assets.manage')
  );

CREATE POLICY "Managers can delete share links"
  ON media_share_links FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner')
    OR has_tenant_role(auth.uid(), tenant_id, 'manager')
    OR has_permission(auth.uid(), tenant_id, 'files.assets.manage')
  );