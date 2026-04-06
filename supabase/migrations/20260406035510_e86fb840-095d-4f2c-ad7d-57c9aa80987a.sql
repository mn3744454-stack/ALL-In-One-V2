
-- 1. Add is_archived columns
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.facility_areas ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.housing_units ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- 2. Deduplicate: keep the latest, mark rest as archived+inactive
UPDATE public.housing_units SET is_archived = true, is_active = false
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, area_id, code 
      ORDER BY created_at DESC
    ) as rn
    FROM public.housing_units
    WHERE area_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 3. Unique index on non-archived units only
CREATE UNIQUE INDEX IF NOT EXISTS idx_housing_units_tenant_area_code 
  ON public.housing_units (tenant_id, area_id, code) 
  WHERE area_id IS NOT NULL AND is_archived = false;
