-- Fix search_path for newly created functions
CREATE OR REPLACE FUNCTION public.can_manage_horses(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND (role IN ('owner', 'manager') OR can_manage_horses = true)
    AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.validate_ownership_percentage()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage numeric;
BEGIN
  SELECT COALESCE(SUM(ownership_percentage), 0) INTO total_percentage
  FROM public.horse_ownership
  WHERE horse_id = NEW.horse_id 
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (total_percentage + NEW.ownership_percentage) > 100 THEN
    RAISE EXCEPTION 'Total ownership percentage cannot exceed 100 percent';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_horse_activation()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage numeric;
  primary_count integer;
  ownership_count integer;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    SELECT COUNT(*), COALESCE(SUM(ownership_percentage), 0), COUNT(*) FILTER (WHERE is_primary = true)
    INTO ownership_count, total_percentage, primary_count
    FROM public.horse_ownership
    WHERE horse_id = NEW.id;
    
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;