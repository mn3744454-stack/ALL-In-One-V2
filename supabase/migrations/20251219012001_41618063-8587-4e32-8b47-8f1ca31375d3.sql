-- Allow creating tenants even if the API role resolves to anon, as long as a valid user session exists
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Users with a session can create tenants"
ON public.tenants
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Same for initial membership insert during tenant creation
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;
CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members
FOR INSERT
TO public
WITH CHECK ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (role = 'owner'::tenant_role));