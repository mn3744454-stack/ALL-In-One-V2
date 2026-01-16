-- =====================================================
-- P0 SECURITY FIX (DB ONLY): Profiles privacy + Invitations enum/token + Public profile projection
-- =====================================================

-- =====================================================
-- PART A: PROFILES — remove broad read (PII leak)
-- =====================================================

-- 1) Drop the permissive policy that exposes ALL profile columns to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can read any profile" ON public.profiles;

-- =====================================================
-- PART A2: PUBLIC PROFILE DISCOVERY (SAFE) — use table + trigger (NOT a view)
-- =====================================================

-- 2) Create safe public profile projection table (NO email/phone)
CREATE TABLE IF NOT EXISTS public.public_profile_fields (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  website text,
  social_links jsonb,
  created_at timestamptz
);

-- 3) Backfill from profiles (safe fields only)
INSERT INTO public.public_profile_fields (id, full_name, avatar_url, bio, location, website, social_links, created_at)
SELECT p.id, p.full_name, p.avatar_url, p.bio, p.location, p.website, p.social_links, p.created_at
FROM public.profiles p
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  website = EXCLUDED.website,
  social_links = EXCLUDED.social_links,
  created_at = EXCLUDED.created_at;

-- 4) Create trigger function to keep public_profile_fields in sync
CREATE OR REPLACE FUNCTION public.sync_public_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.public_profile_fields (id, full_name, avatar_url, bio, location, website, social_links, created_at)
  VALUES (NEW.id, NEW.full_name, NEW.avatar_url, NEW.bio, NEW.location, NEW.website, NEW.social_links, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    location = EXCLUDED.location,
    website = EXCLUDED.website,
    social_links = EXCLUDED.social_links,
    created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$$;

-- 5) Create trigger on profiles to sync public projection
DROP TRIGGER IF EXISTS trg_sync_public_profile_fields ON public.profiles;
CREATE TRIGGER trg_sync_public_profile_fields
AFTER INSERT OR UPDATE OF full_name, avatar_url, bio, location, website, social_links
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_profile_fields();

-- 6) RLS for public_profile_fields
ALTER TABLE public.public_profile_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read public_profile_fields" ON public.public_profile_fields;
CREATE POLICY "Authenticated can read public_profile_fields"
ON public.public_profile_fields
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- PART B: INVITATIONS — enum values + timestamps + token
-- =====================================================

-- 1) Add enum values safely
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'preaccepted';
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'revoked';

-- 2) Add timestamps if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='preaccepted_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN preaccepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='accepted_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN accepted_at timestamptz;
  END IF;
END $$;

-- 3) Add token column safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='token'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN token text;
  END IF;
END $$;

-- 4) Backfill tokens for existing rows
UPDATE public.invitations
SET token = gen_random_uuid()::text
WHERE token IS NULL;

-- 5) Make token NOT NULL
ALTER TABLE public.invitations
ALTER COLUMN token SET NOT NULL;

-- 6) Enforce uniqueness via constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invitations_token_key'
  ) THEN
    ALTER TABLE public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);
  END IF;
END $$;