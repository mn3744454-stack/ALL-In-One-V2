-- =====================================================
-- STEP 5 DB SYNC: Complete Horses Module Schema
-- =====================================================

-- 1. Create master data tables
-- =====================================================

-- horse_colors
CREATE TABLE IF NOT EXISTS public.horse_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- horse_breeds
CREATE TABLE IF NOT EXISTS public.horse_breeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- branches
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- stables
CREATE TABLE IF NOT EXISTS public.stables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- housing_units
CREATE TABLE IF NOT EXISTS public.housing_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  stable_id uuid REFERENCES public.stables(id) ON DELETE SET NULL,
  code text NOT NULL,
  unit_type text NOT NULL DEFAULT 'stall',
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- breeders
CREATE TABLE IF NOT EXISTS public.breeders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- horse_owners
CREATE TABLE IF NOT EXISTS public.horse_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Extend horses table with missing columns
-- =====================================================
ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS age_category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS ueln text,
  ADD COLUMN IF NOT EXISTS is_pregnant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pregnancy_months integer,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS mane_marks text,
  ADD COLUMN IF NOT EXISTS body_marks text,
  ADD COLUMN IF NOT EXISTS legs_marks text,
  ADD COLUMN IF NOT EXISTS distinctive_marks_notes text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS mother_name_ar text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_name_ar text,
  ADD COLUMN IF NOT EXISTS maternal_grandmother text,
  ADD COLUMN IF NOT EXISTS maternal_grandfather text,
  ADD COLUMN IF NOT EXISTS paternal_grandmother text,
  ADD COLUMN IF NOT EXISTS paternal_grandfather text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS external_links text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS housing_notes text;

-- Add foreign key columns to horses (separate for dependency order)
ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS breed_id uuid REFERENCES public.horse_breeds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES public.horse_colors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stable_id uuid REFERENCES public.stables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS housing_unit_id uuid REFERENCES public.housing_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mother_id uuid REFERENCES public.horses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS father_id uuid REFERENCES public.horses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS breeder_id uuid REFERENCES public.breeders(id) ON DELETE SET NULL;

-- 3. Create horse_ownership table (after horses has all columns)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.horse_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.horse_owners(id) ON DELETE CASCADE,
  ownership_percentage numeric NOT NULL CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(horse_id, owner_id)
);

-- 4. Enable RLS on all new tables
-- =====================================================
ALTER TABLE public.horse_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_ownership ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for horse_colors
-- =====================================================
CREATE POLICY "Members can view horse colors"
  ON public.horse_colors FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage horse colors"
  ON public.horse_colors FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 6. RLS Policies for horse_breeds
-- =====================================================
CREATE POLICY "Members can view horse breeds"
  ON public.horse_breeds FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage horse breeds"
  ON public.horse_breeds FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 7. RLS Policies for branches
-- =====================================================
CREATE POLICY "Members can view branches"
  ON public.branches FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage branches"
  ON public.branches FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 8. RLS Policies for stables
-- =====================================================
CREATE POLICY "Members can view stables"
  ON public.stables FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage stables"
  ON public.stables FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 9. RLS Policies for housing_units
-- =====================================================
CREATE POLICY "Members can view housing units"
  ON public.housing_units FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage housing units"
  ON public.housing_units FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 10. RLS Policies for breeders
-- =====================================================
CREATE POLICY "Members can view breeders"
  ON public.breeders FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage breeders"
  ON public.breeders FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 11. RLS Policies for horse_owners
-- =====================================================
CREATE POLICY "Members can view horse owners"
  ON public.horse_owners FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage horse owners"
  ON public.horse_owners FOR ALL
  USING (can_manage_horses(auth.uid(), tenant_id));

-- 12. RLS Policies for horse_ownership
-- =====================================================
CREATE POLICY "Members can view horse ownership"
  ON public.horse_ownership FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = horse_ownership.horse_id
    AND is_tenant_member(auth.uid(), h.tenant_id)
  ));

CREATE POLICY "Managers can manage horse ownership"
  ON public.horse_ownership FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = horse_ownership.horse_id
    AND can_manage_horses(auth.uid(), h.tenant_id)
  ));

-- 13. Validation trigger for ownership percentage (prevent > 100%)
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_ownership_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_percentage numeric;
BEGIN
  SELECT COALESCE(SUM(ownership_percentage), 0) INTO total_percentage
  FROM public.horse_ownership
  WHERE horse_id = NEW.horse_id 
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (total_percentage + NEW.ownership_percentage) > 100 THEN
    RAISE EXCEPTION 'Total ownership percentage cannot exceed 100%%';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ownership_percentage ON public.horse_ownership;
CREATE TRIGGER trg_validate_ownership_percentage
  BEFORE INSERT OR UPDATE ON public.horse_ownership
  FOR EACH ROW EXECUTE FUNCTION public.validate_ownership_percentage();

-- 14. Partial unique indexes for identifier uniqueness per tenant
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_horses_tenant_microchip
  ON public.horses (tenant_id, microchip_number)
  WHERE microchip_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_horses_tenant_passport
  ON public.horses (tenant_id, passport_number)
  WHERE passport_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_horses_tenant_ueln
  ON public.horses (tenant_id, ueln)
  WHERE ueln IS NOT NULL;

-- 15. Reload PostgREST schema cache
-- =====================================================
NOTIFY pgrst, 'reload schema';