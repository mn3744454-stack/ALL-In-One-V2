
-- ============================================================
-- ROLES & PERMISSION SETS v1
-- ============================================================

BEGIN;

-- 1) tenant_roles - Role definitions per tenant
CREATE TABLE IF NOT EXISTS public.tenant_roles (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  description_ar text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant_id ON public.tenant_roles(tenant_id);

ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;

-- 2) tenant_role_bundles - Role -> Bundles mapping
CREATE TABLE IF NOT EXISTS public.tenant_role_bundles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  role_key text NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.permission_bundles(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, role_key) REFERENCES public.tenant_roles(tenant_id, role_key) ON DELETE CASCADE,
  UNIQUE(tenant_id, role_key, bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_role_bundles_tenant_role ON public.tenant_role_bundles(tenant_id, role_key);
CREATE INDEX IF NOT EXISTS idx_tenant_role_bundles_bundle ON public.tenant_role_bundles(bundle_id);

ALTER TABLE public.tenant_role_bundles ENABLE ROW LEVEL SECURITY;

-- 3) tenant_role_permissions - Role -> Permission keys mapping
CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  role_key text NOT NULL,
  permission_key text NOT NULL REFERENCES public.permission_definitions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, role_key) REFERENCES public.tenant_roles(tenant_id, role_key) ON DELETE CASCADE,
  UNIQUE(tenant_id, role_key, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_role_permissions_tenant_role ON public.tenant_role_permissions(tenant_id, role_key);

ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies for tenant_roles
DROP POLICY IF EXISTS "Tenant members can view tenant roles" ON public.tenant_roles;
CREATE POLICY "Tenant members can view tenant roles"
  ON public.tenant_roles FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can insert tenant roles" ON public.tenant_roles;
CREATE POLICY "Owners can insert tenant roles"
  ON public.tenant_roles FOR INSERT
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can update tenant roles" ON public.tenant_roles;
CREATE POLICY "Owners can update tenant roles"
  ON public.tenant_roles FOR UPDATE
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'))
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can delete non-system tenant roles" ON public.tenant_roles;
CREATE POLICY "Owners can delete non-system tenant roles"
  ON public.tenant_roles FOR DELETE
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'owner')
    AND is_system = false
    -- Prevent deletion if members are using this role
    AND NOT EXISTS (
      SELECT 1 FROM tenant_members tm 
      WHERE tm.tenant_id = tenant_roles.tenant_id 
      AND tm.role::text = tenant_roles.role_key
    )
  );

-- 5) RLS Policies for tenant_role_bundles
DROP POLICY IF EXISTS "Tenant members can view tenant role bundles" ON public.tenant_role_bundles;
CREATE POLICY "Tenant members can view tenant role bundles"
  ON public.tenant_role_bundles FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can insert tenant role bundles" ON public.tenant_role_bundles;
CREATE POLICY "Owners can insert tenant role bundles"
  ON public.tenant_role_bundles FOR INSERT
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can update tenant role bundles" ON public.tenant_role_bundles;
CREATE POLICY "Owners can update tenant role bundles"
  ON public.tenant_role_bundles FOR UPDATE
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can delete tenant role bundles" ON public.tenant_role_bundles;
CREATE POLICY "Owners can delete tenant role bundles"
  ON public.tenant_role_bundles FOR DELETE
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- 6) RLS Policies for tenant_role_permissions
DROP POLICY IF EXISTS "Tenant members can view tenant role permissions" ON public.tenant_role_permissions;
CREATE POLICY "Tenant members can view tenant role permissions"
  ON public.tenant_role_permissions FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Owners can insert tenant role permissions" ON public.tenant_role_permissions;
CREATE POLICY "Owners can insert tenant role permissions"
  ON public.tenant_role_permissions FOR INSERT
  WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can update tenant role permissions" ON public.tenant_role_permissions;
CREATE POLICY "Owners can update tenant role permissions"
  ON public.tenant_role_permissions FOR UPDATE
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

DROP POLICY IF EXISTS "Owners can delete tenant role permissions" ON public.tenant_role_permissions;
CREATE POLICY "Owners can delete tenant role permissions"
  ON public.tenant_role_permissions FOR DELETE
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- 7) Seed system roles for all existing tenants
INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'owner', 'Owner', 'مالك', 'Full access to all features', 'صلاحية كاملة لجميع المميزات', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'manager', 'Manager', 'مدير', 'Managed access with most features', 'صلاحية إدارية مع معظم المميزات', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'admin', 'Admin', 'مشرف', 'Administrative access', 'صلاحية إشرافية', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'foreman', 'Foreman', 'رئيس عمال', 'Foreman access', 'صلاحية رئيس العمال', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'vet', 'Vet', 'بيطري', 'Veterinary access', 'صلاحية بيطرية', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'trainer', 'Trainer', 'مدرب', 'Trainer access', 'صلاحية المدرب', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

INSERT INTO public.tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system)
SELECT t.id, 'employee', 'Employee', 'موظف', 'Standard employee access', 'صلاحية موظف عادي', true 
FROM public.tenants t
ON CONFLICT (tenant_id, role_key) DO NOTHING;

-- 8) Create trigger to auto-seed roles for new tenants
CREATE OR REPLACE FUNCTION public.seed_tenant_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO tenant_roles (tenant_id, role_key, name, name_ar, description, description_ar, is_system) VALUES
    (NEW.id, 'owner', 'Owner', 'مالك', 'Full access to all features', 'صلاحية كاملة لجميع المميزات', true),
    (NEW.id, 'manager', 'Manager', 'مدير', 'Managed access with most features', 'صلاحية إدارية مع معظم المميزات', true),
    (NEW.id, 'admin', 'Admin', 'مشرف', 'Administrative access', 'صلاحية إشرافية', true),
    (NEW.id, 'foreman', 'Foreman', 'رئيس عمال', 'Foreman access', 'صلاحية رئيس العمال', true),
    (NEW.id, 'vet', 'Vet', 'بيطري', 'Veterinary access', 'صلاحية بيطرية', true),
    (NEW.id, 'trainer', 'Trainer', 'مدرب', 'Trainer access', 'صلاحية المدرب', true),
    (NEW.id, 'employee', 'Employee', 'موظف', 'Standard employee access', 'صلاحية موظف عادي', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_created_seed_roles ON public.tenants;
CREATE TRIGGER on_tenant_created_seed_roles
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_tenant_roles();

-- 9) Update has_permission function to include role-based permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _tenant_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_id uuid;
  member_role text;
  override_granted boolean;
  role_has boolean;
  bundle_has boolean;
BEGIN
  -- 1) Check if user is active tenant member
  SELECT id, role::text INTO member_id, member_role
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

  -- 3) Check member_permissions override (highest priority)
  SELECT granted INTO override_granted
  FROM member_permissions
  WHERE tenant_member_id = member_id
    AND permission_key = _permission_key;

  IF FOUND THEN
    RETURN override_granted;
  END IF;

  -- 4) Check role-based permissions (from tenant_role_permissions)
  SELECT EXISTS (
    SELECT 1
    FROM tenant_role_permissions trp
    WHERE trp.tenant_id = _tenant_id
      AND trp.role_key = member_role
      AND trp.permission_key = _permission_key
      AND trp.granted = true
  ) INTO role_has;

  IF role_has THEN
    RETURN true;
  END IF;

  -- 5) Check role bundles (from tenant_role_bundles -> bundle_permissions)
  SELECT EXISTS (
    SELECT 1
    FROM tenant_role_bundles trb
    JOIN bundle_permissions bp ON bp.bundle_id = trb.bundle_id
    WHERE trb.tenant_id = _tenant_id
      AND trb.role_key = member_role
      AND bp.permission_key = _permission_key
  ) INTO bundle_has;

  IF bundle_has THEN
    RETURN true;
  END IF;

  -- 6) Check member's direct bundles (member_permission_bundles -> bundle_permissions)
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

-- 10) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.seed_tenant_roles() TO authenticated;

COMMIT;
