ALTER TABLE public.facility_areas 
  ADD COLUMN IF NOT EXISTS area_size numeric NULL,
  ADD COLUMN IF NOT EXISTS shade text NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS has_water boolean NULL DEFAULT false;