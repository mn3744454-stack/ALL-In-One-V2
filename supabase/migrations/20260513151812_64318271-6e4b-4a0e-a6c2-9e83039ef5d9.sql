-- 1. Restrict private columns on tenants from anon/authenticated direct SELECT.
-- Owner/member access to these columns must go through SECURITY DEFINER RPCs.
REVOKE SELECT (email, phone, address, owner_id) ON public.tenants FROM anon, authenticated;

-- 2. Tighten follows visibility: only see your own follow relationships.
DROP POLICY IF EXISTS "Users can read follows" ON public.follows;
CREATE POLICY "Users can read their own follows"
ON public.follows
FOR SELECT
TO authenticated
USING (follower_id = auth.uid() OR following_id = auth.uid());

-- 3. Drop the stale 3-arg overload of can_access_shared_resource (unused, broken signature).
DROP FUNCTION IF EXISTS public.can_access_shared_resource(uuid, text, uuid);