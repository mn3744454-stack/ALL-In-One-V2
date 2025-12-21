-- Create post_visibility enum
CREATE TYPE public.post_visibility AS ENUM ('public', 'private', 'followers');

-- =====================================================
-- Posts table
-- =====================================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  visibility public.post_visibility NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Post Comments table
-- =====================================================
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post ON public.post_comments(post_id);
CREATE INDEX idx_comments_author ON public.post_comments(author_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Post Likes table
-- =====================================================
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_likes_post ON public.post_likes(post_id);
CREATE INDEX idx_likes_user ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Follows table
-- =====================================================
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Add constraint to prevent self-follow via trigger instead of CHECK
CREATE OR REPLACE FUNCTION public.prevent_self_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RAISE EXCEPTION 'Users cannot follow themselves';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_self_follow
BEFORE INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_follow();

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper function for checking follow status
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_following(_follower_id UUID, _following_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = _follower_id 
    AND following_id = _following_id
  )
$$;

-- =====================================================
-- Update profiles table with community fields
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- =====================================================
-- RLS Policies for Posts
-- =====================================================

-- Anyone authenticated can read public posts
CREATE POLICY "Anyone can read public posts"
ON public.posts FOR SELECT TO authenticated
USING (visibility = 'public');

-- Followers can read followers-only posts
CREATE POLICY "Followers can read followers-only posts"
ON public.posts FOR SELECT TO authenticated
USING (
  visibility = 'followers' 
  AND is_following(auth.uid(), author_id)
);

-- Authors can read their own posts (including private)
CREATE POLICY "Authors can read own posts"
ON public.posts FOR SELECT TO authenticated
USING (author_id = auth.uid());

-- Users can create their own posts
CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (author_id = auth.uid());

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- =====================================================
-- RLS Policies for Comments
-- =====================================================

-- Users can read comments on posts they can see
CREATE POLICY "Users can read comments on readable posts"
ON public.post_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p 
  WHERE p.id = post_id 
  AND (
    p.visibility = 'public' 
    OR p.author_id = auth.uid()
    OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
  )
));

-- Users can create comments on readable posts
CREATE POLICY "Users can create comments"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id 
    AND (
      p.visibility = 'public' 
      OR p.author_id = auth.uid()
      OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
    )
  )
);

-- Authors can update their own comments
CREATE POLICY "Authors can update own comments"
ON public.post_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid());

-- Authors can delete their own comments
CREATE POLICY "Authors can delete own comments"
ON public.post_comments FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- =====================================================
-- RLS Policies for Likes
-- =====================================================

-- Users can read all likes
CREATE POLICY "Users can read likes"
ON public.post_likes FOR SELECT TO authenticated
USING (true);

-- Users can like posts they can see
CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.posts p 
    WHERE p.id = post_id 
    AND (
      p.visibility = 'public' 
      OR p.author_id = auth.uid()
      OR (p.visibility = 'followers' AND is_following(auth.uid(), p.author_id))
    )
  )
);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike posts"
ON public.post_likes FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- RLS Policies for Follows
-- =====================================================

-- Users can read all follows
CREATE POLICY "Users can read follows"
ON public.follows FOR SELECT TO authenticated
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow"
ON public.follows FOR INSERT TO authenticated
WITH CHECK (follower_id = auth.uid());

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE TO authenticated
USING (follower_id = auth.uid());

-- =====================================================
-- Update profiles RLS to allow public profile viewing
-- =====================================================
CREATE POLICY "Authenticated users can read any profile"
ON public.profiles FOR SELECT TO authenticated
USING (true);