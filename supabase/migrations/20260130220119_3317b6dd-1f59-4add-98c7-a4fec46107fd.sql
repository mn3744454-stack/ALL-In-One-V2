-- Helper function to check tenant membership + community.view permission
CREATE OR REPLACE FUNCTION public.can_view_community(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_tenant_member(_user_id, _tenant_id) 
    AND has_permission(_user_id, _tenant_id, 'community.view')
$$;

-- Helper function to check community.manage permission
CREATE OR REPLACE FUNCTION public.can_manage_community(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_tenant_member(_user_id, _tenant_id) 
    AND has_permission(_user_id, _tenant_id, 'community.manage')
$$;

-- ========================
-- POSTS RLS UPDATES
-- ========================
DROP POLICY IF EXISTS "Public posts are viewable by all authenticated" ON public.posts;
DROP POLICY IF EXISTS "Followers-only posts are viewable by followers" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- SELECT: Personal feed (tenant_id IS NULL) - existing behavior
CREATE POLICY "Personal public posts viewable by authenticated"
ON public.posts FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL 
  AND visibility = 'public'
);

CREATE POLICY "Personal own posts viewable by author"
ON public.posts FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL 
  AND author_id = auth.uid()
);

CREATE POLICY "Personal followers posts viewable by followers"
ON public.posts FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL 
  AND visibility = 'followers'
  AND is_following(auth.uid(), author_id)
);

-- SELECT: Organization feed (tenant_id NOT NULL)
CREATE POLICY "Org posts viewable by tenant members with permission"
ON public.posts FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL 
  AND can_view_community(auth.uid(), tenant_id)
);

-- INSERT: Personal posts (tenant_id IS NULL)
CREATE POLICY "Users can create personal posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() 
  AND tenant_id IS NULL
);

-- INSERT: Org posts (tenant_id NOT NULL)
CREATE POLICY "Users can create org posts with permission"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() 
  AND tenant_id IS NOT NULL 
  AND can_manage_community(auth.uid(), tenant_id)
);

-- UPDATE: Personal posts
CREATE POLICY "Users can update own personal posts"
ON public.posts FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid() 
  AND tenant_id IS NULL
);

-- UPDATE: Org posts (author or manager)
CREATE POLICY "Users can update own org posts"
ON public.posts FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL 
  AND (
    author_id = auth.uid() 
    OR can_manage_community(auth.uid(), tenant_id)
  )
);

-- DELETE: Personal posts
CREATE POLICY "Users can delete own personal posts"
ON public.posts FOR DELETE
TO authenticated
USING (
  author_id = auth.uid() 
  AND tenant_id IS NULL
);

-- DELETE: Org posts (author or manager)
CREATE POLICY "Users can delete org posts if author or manager"
ON public.posts FOR DELETE
TO authenticated
USING (
  tenant_id IS NOT NULL 
  AND (
    author_id = auth.uid() 
    OR can_manage_community(auth.uid(), tenant_id)
  )
);

-- ========================
-- COMMENTS RLS UPDATES
-- ========================
DROP POLICY IF EXISTS "Authenticated users can view comments on visible posts" ON public.post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

-- SELECT: Comments inherit post visibility (personal scope)
CREATE POLICY "View comments on personal posts"
ON public.post_comments FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id IS NULL
      AND (
        p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
      )
  )
);

-- SELECT: Comments on org posts (require view permission)
CREATE POLICY "View comments on org posts"
ON public.post_comments FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND can_view_community(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id = post_comments.tenant_id
  )
);

-- INSERT: Comments on personal posts
CREATE POLICY "Create comments on personal posts"
ON public.post_comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id IS NULL
      AND (
        p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
      )
  )
);

-- INSERT: Comments on org posts
CREATE POLICY "Create comments on org posts"
ON public.post_comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND can_view_community(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id = post_comments.tenant_id
  )
);

-- UPDATE/DELETE own comments (personal)
CREATE POLICY "Update own personal comments"
ON public.post_comments FOR UPDATE
TO authenticated
USING (author_id = auth.uid() AND tenant_id IS NULL);

CREATE POLICY "Delete own personal comments"
ON public.post_comments FOR DELETE
TO authenticated
USING (author_id = auth.uid() AND tenant_id IS NULL);

-- UPDATE/DELETE org comments if author or manager
CREATE POLICY "Update org comments if author or manager"
ON public.post_comments FOR UPDATE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND (
    author_id = auth.uid()
    OR can_manage_community(auth.uid(), tenant_id)
  )
);

CREATE POLICY "Delete org comments if author or manager"
ON public.post_comments FOR DELETE
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND (
    author_id = auth.uid()
    OR can_manage_community(auth.uid(), tenant_id)
  )
);

-- ========================
-- LIKES RLS UPDATES
-- ========================
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can create likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.post_likes;

-- SELECT: Personal likes only on posts the user can view
CREATE POLICY "View personal likes on visible personal posts"
ON public.post_likes FOR SELECT
TO authenticated
USING (
  tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id IS NULL
      AND (
        p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
      )
  )
);

-- SELECT: Org likes with permission + post belongs to same tenant
CREATE POLICY "View org likes with permission"
ON public.post_likes FOR SELECT
TO authenticated
USING (
  tenant_id IS NOT NULL
  AND can_view_community(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id = post_likes.tenant_id
  )
);

-- INSERT: Likes on personal posts (only if post is visible to user)
CREATE POLICY "Like personal posts"
ON public.post_likes FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id IS NULL
      AND (
        p.visibility = 'public'
        OR p.author_id = auth.uid()
        OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
      )
  )
);

-- INSERT: Likes on org posts with permission
CREATE POLICY "Like org posts with permission"
ON public.post_likes FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IS NOT NULL
  AND can_view_community(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND p.tenant_id = post_likes.tenant_id
  )
);

-- DELETE: Own likes (personal)
CREATE POLICY "Unlike personal posts"
ON public.post_likes FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND tenant_id IS NULL);

-- DELETE: Own likes (org)
CREATE POLICY "Unlike org posts"
ON public.post_likes FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND tenant_id IS NOT NULL);