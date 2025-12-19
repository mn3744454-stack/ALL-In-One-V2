-- Drop existing restrictive policies on tenants table
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can view their tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (is_tenant_member(auth.uid(), id));

CREATE POLICY "Owners can update their tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (has_tenant_role(auth.uid(), id, 'owner'::tenant_role));

-- Also fix tenant_members insert policy to allow users to add themselves
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;

CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'owner'::tenant_role);