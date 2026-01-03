-- 1. RPC for Riyadh day bounds (timezone-aware)
CREATE OR REPLACE FUNCTION public.get_riyadh_day_bounds(_day date DEFAULT NULL)
RETURNS TABLE(start_utc timestamptz, end_utc timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    ((COALESCE(_day, (now() AT TIME ZONE 'Asia/Riyadh')::date))::text || ' 00:00:00')::timestamp
      AT TIME ZONE 'Asia/Riyadh' AS start_utc,
    ((COALESCE(_day, (now() AT TIME ZONE 'Asia/Riyadh')::date) + 1)::text || ' 00:00:00')::timestamp
      AT TIME ZONE 'Asia/Riyadh' AS end_utc
$$;

-- 2. Validation function for lab result share creation
CREATE OR REPLACE FUNCTION public.validate_lab_result_share_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_status text;
  result_tenant uuid;
BEGIN
  -- Get the result status and tenant
  SELECT status, tenant_id INTO result_status, result_tenant
  FROM public.lab_results
  WHERE id = NEW.result_id;

  -- Check if result exists
  IF result_status IS NULL THEN
    RAISE EXCEPTION 'Lab result not found';
  END IF;

  -- Check tenant matches
  IF result_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Lab result does not belong to this tenant';
  END IF;

  -- Check result is final
  IF result_status != 'final' THEN
    RAISE EXCEPTION 'Only finalized results can be shared. Current status: %', result_status;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Create trigger for validation
DROP TRIGGER IF EXISTS validate_lab_result_share_creation_trigger ON public.lab_result_shares;
CREATE TRIGGER validate_lab_result_share_creation_trigger
  BEFORE INSERT ON public.lab_result_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lab_result_share_creation();