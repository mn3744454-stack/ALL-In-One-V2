-- 1. Fix tenant_members INSERT policy
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;

CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND role = 'owner'::tenant_role
);

-- 2. Re-create tenants INSERT policy (confirmation/cleanup)
DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;

CREATE POLICY "Users can create tenants as owner"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());