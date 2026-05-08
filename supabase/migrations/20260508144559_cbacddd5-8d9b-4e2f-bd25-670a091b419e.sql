-- AD-1 Pass 1.1: ensure movement_subtype reflects movement_type even when
-- the column default 'unspecified' has already been applied before the
-- trigger fires. Without this, the BEFORE INSERT trigger only kicks in for
-- explicit NULL values and every RPC-inserted row stays as 'unspecified'.
CREATE OR REPLACE FUNCTION public.default_horse_movement_subtype()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.movement_subtype IS NULL OR NEW.movement_subtype = 'unspecified' THEN
    NEW.movement_subtype := CASE
      WHEN NEW.movement_type = 'in'       THEN 'arrival'
      WHEN NEW.movement_type = 'transfer' THEN 'internal_transfer'
      WHEN NEW.movement_type = 'out'      THEN 'checkout_departure'
      ELSE 'unspecified'
    END;
  END IF;
  RETURN NEW;
END;
$function$;