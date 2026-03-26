
-- Add capacity column to facility_areas for open-area types
ALTER TABLE public.facility_areas ADD COLUMN IF NOT EXISTS capacity integer DEFAULT NULL;

-- Add storage and isolation_room to internal_unit_type enum
ALTER TYPE public.internal_unit_type ADD VALUE IF NOT EXISTS 'storage';
ALTER TYPE public.internal_unit_type ADD VALUE IF NOT EXISTS 'isolation_room';
