-- =====================================================
-- Lab Horses Registry for Laboratory Tenants
-- Migration: create_lab_horses_registry_v2
-- =====================================================

-- 0) Create set_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) Create table public.lab_horses
CREATE TABLE IF NOT EXISTS public.lab_horses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Horse identification (minimal for lab)
  name text NOT NULL,
  name_ar text NULL,
  gender text NULL,
  approx_age text NULL,
  breed_text text NULL,
  color_text text NULL,
  -- External identifiers (per lab-tenant uniqueness when present)
  microchip_number text NULL,
  passport_number text NULL,
  ueln text NULL,
  -- Owner info (denormalized for lab convenience)
  owner_name text NULL,
  owner_phone text NULL,
  notes text NULL,
  -- Extensible metadata
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Future linking to platform horses (no FK to avoid unsafe cross-tenant FK)
  linked_horse_id uuid NULL,
  linked_at timestamptz NULL,
  -- Source tracking
  source text NOT NULL DEFAULT 'manual',
  -- Soft archive
  is_archived boolean NOT NULL DEFAULT false
);

-- Constrain source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_horses_source_chk'
  ) THEN
    ALTER TABLE public.lab_horses
      ADD CONSTRAINT lab_horses_source_chk
      CHECK (source IN ('manual','platform'));
  END IF;
END $$;

-- 2) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_horses_tenant_name
  ON public.lab_horses(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_lab_horses_tenant_archived
  ON public.lab_horses(tenant_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_lab_horses_tenant_owner_phone
  ON public.lab_horses(tenant_id, owner_phone);

-- 2b) Partial unique indexes per tenant where NOT NULL and NOT empty string
CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_horses_tenant_microchip
  ON public.lab_horses(tenant_id, microchip_number)
  WHERE microchip_number IS NOT NULL AND btrim(microchip_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_horses_tenant_passport
  ON public.lab_horses(tenant_id, passport_number)
  WHERE passport_number IS NOT NULL AND btrim(passport_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_horses_tenant_ueln
  ON public.lab_horses(tenant_id, ueln)
  WHERE ueln IS NOT NULL AND btrim(ueln) <> '';

-- 3) Add lab_horse_id column to lab_samples for linking
ALTER TABLE public.lab_samples
  ADD COLUMN IF NOT EXISTS lab_horse_id uuid NULL
  REFERENCES public.lab_horses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_samples_lab_horse
  ON public.lab_samples(lab_horse_id);

-- 4) Enable RLS on lab_horses
ALTER TABLE public.lab_horses ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies (aligned with lab_samples patterns)
DROP POLICY IF EXISTS "Members can view lab horses" ON public.lab_horses;
DROP POLICY IF EXISTS "Managers can insert lab horses" ON public.lab_horses;
DROP POLICY IF EXISTS "Managers can update lab horses" ON public.lab_horses;
DROP POLICY IF EXISTS "Managers can delete lab horses" ON public.lab_horses;

-- SELECT: any tenant member can view
CREATE POLICY "Members can view lab horses"
  ON public.lab_horses
  FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- INSERT: managers can insert (using can_manage_lab function)
CREATE POLICY "Managers can insert lab horses"
  ON public.lab_horses
  FOR INSERT
  WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- UPDATE: managers can update
CREATE POLICY "Managers can update lab horses"
  ON public.lab_horses
  FOR UPDATE
  USING (can_manage_lab(auth.uid(), tenant_id))
  WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- DELETE: managers can delete
CREATE POLICY "Managers can delete lab horses"
  ON public.lab_horses
  FOR DELETE
  USING (can_manage_lab(auth.uid(), tenant_id));

-- 6) Trigger for updated_at
DROP TRIGGER IF EXISTS set_lab_horses_updated_at ON public.lab_horses;
CREATE TRIGGER set_lab_horses_updated_at
  BEFORE UPDATE ON public.lab_horses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();