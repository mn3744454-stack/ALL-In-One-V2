
-- 1. post_likes: drop overly permissive read policy; visibility-scoped policies remain
DROP POLICY IF EXISTS "Users can read likes" ON public.post_likes;

-- 2. public_profile_fields: restrict to self, tenant co-members, and follow relationships
DROP POLICY IF EXISTS "Authenticated can read public_profile_fields" ON public.public_profile_fields;

CREATE POLICY "Users can read their own public profile"
ON public.public_profile_fields
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can read tenant co-member public profiles"
ON public.public_profile_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members me
    JOIN public.tenant_members other
      ON other.tenant_id = me.tenant_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = public_profile_fields.id
  )
);

CREATE POLICY "Users can read followed/follower public profiles"
ON public.public_profile_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.follows f
    WHERE (f.follower_id = auth.uid() AND f.following_id = public_profile_fields.id)
       OR (f.following_id = auth.uid() AND f.follower_id = public_profile_fields.id)
  )
);

-- 3. realtime.messages: app does not use Broadcast/Presence — deny all
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

-- 4. tenants: prevent owner_id from being changed during update (defense in depth)
DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;

CREATE POLICY "Owners can update their tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role))
WITH CHECK (
  public.has_tenant_role(auth.uid(), id, 'owner'::tenant_role)
  AND owner_id = (SELECT owner_id FROM public.tenants t WHERE t.id = tenants.id)
);
