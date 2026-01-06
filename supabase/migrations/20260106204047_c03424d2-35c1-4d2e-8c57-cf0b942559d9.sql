-- =============================================
-- INTERNAL HOUSING MODULE - Complete Schema
-- =============================================

-- 1. Create Enums
CREATE TYPE public.internal_unit_type AS ENUM ('stall', 'paddock', 'room', 'cage', 'other');
CREATE TYPE public.occupancy_mode AS ENUM ('single', 'group');

-- 2. Create facility_areas table
CREATE TABLE public.facility_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text,
  is_active boolean DEFAULT true,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_facility_areas_tenant_branch 
  ON public.facility_areas(tenant_id, branch_id, is_active);

CREATE TRIGGER update_facility_areas_updated_at
  BEFORE UPDATE ON public.facility_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Extend existing housing_units table with new columns
ALTER TABLE public.housing_units 
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.facility_areas(id),
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS occupancy public.occupancy_mode NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS capacity int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Set defaults for existing units
UPDATE public.housing_units SET unit_type = 'other' WHERE unit_type IS NULL OR unit_type = '';

-- Constraint: single = capacity 1
ALTER TABLE public.housing_units DROP CONSTRAINT IF EXISTS check_single_capacity;
ALTER TABLE public.housing_units ADD CONSTRAINT check_single_capacity
  CHECK (occupancy != 'single' OR capacity = 1);

CREATE INDEX IF NOT EXISTS idx_housing_units_tenant_area 
  ON public.housing_units(tenant_id, branch_id, area_id, is_active);

DROP TRIGGER IF EXISTS update_housing_units_updated_at ON public.housing_units;
CREATE TRIGGER update_housing_units_updated_at
  BEFORE UPDATE ON public.housing_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create housing_unit_occupants table
CREATE TABLE public.housing_unit_occupants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.housing_units(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  since timestamptz DEFAULT now(),
  until timestamptz,
  is_demo boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_occupants_unit_active 
  ON public.housing_unit_occupants(unit_id) WHERE until IS NULL;
CREATE INDEX idx_occupants_horse 
  ON public.housing_unit_occupants(horse_id);
CREATE INDEX idx_occupants_tenant 
  ON public.housing_unit_occupants(tenant_id);

-- 5. Add current_area_id to horses
ALTER TABLE public.horses 
  ADD COLUMN IF NOT EXISTS current_area_id uuid REFERENCES public.facility_areas(id);

CREATE INDEX IF NOT EXISTS idx_horses_current_area 
  ON public.horses(tenant_id, current_area_id) WHERE current_area_id IS NOT NULL;

-- 6. Extend horse_movements for unit tracking
ALTER TABLE public.horse_movements 
  ADD COLUMN IF NOT EXISTS from_area_id uuid REFERENCES public.facility_areas(id),
  ADD COLUMN IF NOT EXISTS to_area_id uuid REFERENCES public.facility_areas(id),
  ADD COLUMN IF NOT EXISTS from_unit_id uuid REFERENCES public.housing_units(id),
  ADD COLUMN IF NOT EXISTS to_unit_id uuid REFERENCES public.housing_units(id);

-- 7. Trigger: Check unit occupancy on insert
CREATE OR REPLACE FUNCTION public.check_unit_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  unit_occ public.occupancy_mode;
  unit_cap int;
  current_count int;
BEGIN
  SELECT occupancy, capacity INTO unit_occ, unit_cap
  FROM public.housing_units WHERE id = NEW.unit_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;
  
  SELECT COUNT(*) INTO current_count
  FROM public.housing_unit_occupants
  WHERE unit_id = NEW.unit_id 
    AND until IS NULL
    AND horse_id != NEW.horse_id;
  
  IF unit_occ = 'single' AND current_count >= 1 THEN
    RAISE EXCEPTION 'Unit is single-occupancy and already occupied';
  END IF;
  
  IF unit_occ = 'group' AND current_count >= unit_cap THEN
    RAISE EXCEPTION 'Unit has reached maximum capacity (% horses)', unit_cap;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_unit_occupancy ON public.housing_unit_occupants;
CREATE TRIGGER enforce_unit_occupancy
  BEFORE INSERT ON public.housing_unit_occupants
  FOR EACH ROW
  WHEN (NEW.until IS NULL)
  EXECUTE FUNCTION public.check_unit_occupancy();

-- 8. Trigger: Update horse location on movement
CREATE OR REPLACE FUNCTION public.process_horse_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.housing_unit_occupants
  SET until = NEW.movement_at
  WHERE horse_id = NEW.horse_id 
    AND until IS NULL
    AND tenant_id = NEW.tenant_id;
  
  IF NEW.movement_type = 'out' THEN
    UPDATE public.horses SET 
      current_location_id = NULL,
      current_area_id = NULL,
      housing_unit_id = NULL
    WHERE id = NEW.horse_id;
    
  ELSIF NEW.movement_type IN ('in', 'transfer') THEN
    UPDATE public.horses SET 
      current_location_id = NEW.to_location_id,
      current_area_id = NEW.to_area_id,
      housing_unit_id = NEW.to_unit_id
    WHERE id = NEW.horse_id;
    
    IF NEW.to_unit_id IS NOT NULL THEN
      INSERT INTO public.housing_unit_occupants (
        tenant_id, unit_id, horse_id, since, is_demo
      ) VALUES (
        NEW.tenant_id, NEW.to_unit_id, NEW.horse_id, 
        NEW.movement_at, NEW.is_demo
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_movement_update_location ON public.horse_movements;
CREATE TRIGGER on_movement_update_location
  AFTER INSERT ON public.horse_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.process_horse_movement();

-- 9. RLS Policies

-- facility_areas RLS
ALTER TABLE public.facility_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view areas" ON public.facility_areas
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert areas" ON public.facility_areas
  FOR INSERT WITH CHECK (public.can_manage_movement(auth.uid(), tenant_id));

CREATE POLICY "Managers can update areas" ON public.facility_areas
  FOR UPDATE USING (public.can_manage_movement(auth.uid(), tenant_id));

-- housing_units RLS updates
DROP POLICY IF EXISTS "Managers can manage housing units" ON public.housing_units;

CREATE POLICY "Managers can insert units" ON public.housing_units
  FOR INSERT WITH CHECK (public.can_manage_movement(auth.uid(), tenant_id));

CREATE POLICY "Managers can update units" ON public.housing_units
  FOR UPDATE USING (public.can_manage_movement(auth.uid(), tenant_id));

-- housing_unit_occupants RLS
ALTER TABLE public.housing_unit_occupants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view occupants" ON public.housing_unit_occupants
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert occupants" ON public.housing_unit_occupants
  FOR INSERT WITH CHECK (public.can_manage_movement(auth.uid(), tenant_id));

CREATE POLICY "Managers can update occupants" ON public.housing_unit_occupants
  FOR UPDATE USING (public.can_manage_movement(auth.uid(), tenant_id));