
-- 1. Trigger to sync horses.housing_unit_id from housing_unit_occupants
-- This ensures the denormalized field stays consistent with the authoritative occupants table.

CREATE OR REPLACE FUNCTION public.sync_horse_housing_unit_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New occupant assigned: set horse's housing_unit_id
    UPDATE horses SET housing_unit_id = NEW.unit_id, updated_at = now()
    WHERE id = NEW.horse_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.until IS NULL AND NEW.until IS NOT NULL THEN
    -- Occupant vacated: clear horse's housing_unit_id if it still points to this unit
    UPDATE horses SET housing_unit_id = NULL, updated_at = now()
    WHERE id = NEW.horse_id AND housing_unit_id = OLD.unit_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_horse_housing_unit ON public.housing_unit_occupants;
CREATE TRIGGER trg_sync_horse_housing_unit
  AFTER INSERT OR UPDATE ON public.housing_unit_occupants
  FOR EACH ROW EXECUTE FUNCTION public.sync_horse_housing_unit_id();

-- 2. Server-side capacity enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_unit_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_occupancy text;
  v_capacity int;
  v_current int;
  v_unit_status text;
BEGIN
  -- Only check on new assignments (insert with until IS NULL)
  IF NEW.until IS NOT NULL THEN RETURN NEW; END IF;

  SELECT occupancy, capacity, status INTO v_occupancy, v_capacity, v_unit_status
  FROM housing_units WHERE id = NEW.unit_id;

  -- Block assignment to maintenance/out_of_service units
  IF v_unit_status IN ('maintenance', 'out_of_service') THEN
    RAISE EXCEPTION 'Cannot assign to unit with status: %', v_unit_status;
  END IF;

  SELECT COUNT(*) INTO v_current
  FROM housing_unit_occupants
  WHERE unit_id = NEW.unit_id AND until IS NULL AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_occupancy = 'single' AND v_current >= 1 THEN
    RAISE EXCEPTION 'Unit is single-occupancy and already occupied';
  END IF;

  IF v_current >= v_capacity THEN
    RAISE EXCEPTION 'Unit has reached maximum capacity (%)', v_capacity;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unit_capacity ON public.housing_unit_occupants;
CREATE TRIGGER trg_enforce_unit_capacity
  BEFORE INSERT ON public.housing_unit_occupants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unit_capacity();
