-- Drop the existing insecure INSERT policy
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;

-- Create a stricter policy that verifies tenant ownership
CREATE POLICY "Owners can add themselves as owner member"
ON public.tenant_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'::tenant_role
  AND EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = tenant_members.tenant_id
      AND t.owner_id = auth.uid()
  )
);