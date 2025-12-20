-- Drop the existing INSERT policy on tenants
DROP POLICY IF EXISTS "Users can create tenants as owner" ON public.tenants;

-- Create new permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);