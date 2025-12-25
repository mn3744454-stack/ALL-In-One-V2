-- Fix: Trigger to validate horse activation (corrected RAISE syntax)
CREATE OR REPLACE FUNCTION public.validate_horse_activation()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage numeric;
  primary_count integer;
  ownership_count integer;
BEGIN
  -- Only check when status changes to active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Get ownership counts
    SELECT COUNT(*), COALESCE(SUM(ownership_percentage), 0), COUNT(*) FILTER (WHERE is_primary = true)
    INTO ownership_count, total_percentage, primary_count
    FROM public.horse_ownership
    WHERE horse_id = NEW.id;
    
    -- Only validate if there are owners defined
    IF ownership_count > 0 THEN
      IF total_percentage != 100 THEN
        RAISE EXCEPTION 'Total ownership must equal 100 percent to activate horse (currently: %)', total_percentage;
      END IF;
      
      IF primary_count != 1 THEN
        RAISE EXCEPTION 'Exactly one primary owner is required to activate horse';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_horse_before_activation ON public.horses;
CREATE TRIGGER validate_horse_before_activation
BEFORE UPDATE ON public.horses
FOR EACH ROW EXECUTE FUNCTION public.validate_horse_activation();