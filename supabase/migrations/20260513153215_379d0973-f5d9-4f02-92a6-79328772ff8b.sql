
-- ============================================================
-- 1. TENANTS: drop broad public SELECT policy, add safe RPC
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view public tenants" ON public.tenants;

CREATE OR REPLACE FUNCTION public.get_public_tenants_directory(
  _type text DEFAULT NULL,
  _region text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  type text,
  name text,
  public_name text,
  public_description text,
  public_location_text text,
  region text,
  logo_url text,
  cover_url text,
  tags text[],
  is_listed boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug, t.type::text, t.name, t.public_name, t.public_description,
         t.public_location_text, t.region, t.logo_url, t.cover_url, t.tags,
         t.is_listed, t.created_at
  FROM public.tenants t
  WHERE t.is_public = true
    AND t.is_listed = true
    AND (_type IS NULL OR t.type::text = _type)
    AND (_region IS NULL OR t.region = _region)
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tenants_directory(text, text) TO anon, authenticated;

-- ============================================================
-- 2. CLIENTS: gate SELECT behind clients.view permission
-- ============================================================
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;

CREATE POLICY "Permission-based view clients"
ON public.clients
FOR SELECT
USING (
  is_tenant_member(auth.uid(), tenant_id)
  AND (
    has_permission(auth.uid(), tenant_id, 'clients.view')
    OR has_permission(auth.uid(), tenant_id, 'clients.edit')
    OR has_permission(auth.uid(), tenant_id, 'clients.create')
    OR has_permission(auth.uid(), tenant_id, 'clients.delete')
    OR has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  )
);

-- ============================================================
-- 3. HR_EMPLOYEES: gate SELECT behind hr.view permission
-- ============================================================
DROP POLICY IF EXISTS "Members can view hr employees" ON public.hr_employees;

CREATE POLICY "Permission-based view hr employees"
ON public.hr_employees
FOR SELECT
USING (
  is_tenant_member(auth.uid(), tenant_id)
  AND (
    has_permission(auth.uid(), tenant_id, 'hr.view')
    OR has_permission(auth.uid(), tenant_id, 'hr.manage')
    OR has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  )
);

-- ============================================================
-- 4. BREEDERS: gate SELECT behind horses.view permission
-- ============================================================
DROP POLICY IF EXISTS "Members can view breeders" ON public.breeders;

CREATE POLICY "Permission-based view breeders"
ON public.breeders
FOR SELECT
USING (
  is_tenant_member(auth.uid(), tenant_id)
  AND (
    has_permission(auth.uid(), tenant_id, 'horses.view')
    OR has_permission(auth.uid(), tenant_id, 'horses.edit')
    OR has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  )
);

-- ============================================================
-- 5. HORSE_OWNERS: gate SELECT behind horses.view permission
-- ============================================================
DROP POLICY IF EXISTS "Members can view horse owners" ON public.horse_owners;

CREATE POLICY "Permission-based view horse owners"
ON public.horse_owners
FOR SELECT
USING (
  is_tenant_member(auth.uid(), tenant_id)
  AND (
    has_permission(auth.uid(), tenant_id, 'horses.view')
    OR has_permission(auth.uid(), tenant_id, 'horses.edit')
    OR has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  )
);

-- ============================================================
-- 6. HORSE_SHARES: restrict SELECT to managers/owners only
-- ============================================================
DROP POLICY IF EXISTS "Tenant members can view shares" ON public.horse_shares;

CREATE POLICY "Managers can view shares"
ON public.horse_shares
FOR SELECT
USING (
  has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
  OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
);

-- ============================================================
-- 7. LAB_RESULT_SHARES: restrict SELECT to lab managers
-- ============================================================
DROP POLICY IF EXISTS "Members can view their tenant shares" ON public.lab_result_shares;

CREATE POLICY "Lab managers can view shares"
ON public.lab_result_shares
FOR SELECT
USING (can_manage_lab(auth.uid(), tenant_id));

-- ============================================================
-- 8. INVITATIONS: revoke token column visibility from clients
-- ============================================================
REVOKE SELECT (token) ON public.invitations FROM anon, authenticated;

-- ============================================================
-- 9. CONNECTIONS: revoke recipient contact column visibility
-- ============================================================
REVOKE SELECT (recipient_email, recipient_phone) ON public.connections FROM anon, authenticated;

-- ============================================================
-- 10. CLIENT_CLAIM_TOKENS: restrict SELECT to creator
-- ============================================================
DROP POLICY IF EXISTS "claim_tokens_select" ON public.client_claim_tokens;

CREATE POLICY "claim_tokens_select_creator"
ON public.client_claim_tokens
FOR SELECT
USING (created_by = auth.uid());
