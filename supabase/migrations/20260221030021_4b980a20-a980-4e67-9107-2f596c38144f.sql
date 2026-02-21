
-- Add service name snapshot columns to lab_request_services
ALTER TABLE public.lab_request_services
  ADD COLUMN IF NOT EXISTS service_name_snapshot text,
  ADD COLUMN IF NOT EXISTS service_name_ar_snapshot text,
  ADD COLUMN IF NOT EXISTS service_code_snapshot text;

-- SECURITY DEFINER trigger to populate service snapshots on INSERT
CREATE OR REPLACE FUNCTION public.fn_populate_lrs_service_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_lab_tenant_id uuid;
  v_name text;
  v_name_ar text;
  v_code text;
BEGIN
  IF NEW.service_name_snapshot IS NOT NULL
     AND NEW.service_code_snapshot IS NOT NULL
     AND NEW.service_name_ar_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.lab_tenant_id
    INTO v_lab_tenant_id
  FROM public.lab_requests r
  WHERE r.id = NEW.lab_request_id
  LIMIT 1;

  IF v_lab_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve lab_tenant_id for lab_request %', NEW.lab_request_id;
  END IF;

  SELECT ls.name, ls.name_ar, ls.code
    INTO v_name, v_name_ar, v_code
  FROM public.lab_services ls
  WHERE ls.id = NEW.service_id
    AND ls.tenant_id = v_lab_tenant_id
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Service % not found for lab tenant %', NEW.service_id, v_lab_tenant_id;
  END IF;

  NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, v_name);
  NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, v_name_ar);
  NEW.service_code_snapshot := COALESCE(NEW.service_code_snapshot, v_code);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_populate_lrs_service_snapshots() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_populate_lrs_service_snapshots ON public.lab_request_services;
CREATE TRIGGER trg_populate_lrs_service_snapshots
  BEFORE INSERT ON public.lab_request_services
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_populate_lrs_service_snapshots();

-- Backfill existing rows (fixed join reference)
UPDATE public.lab_request_services AS lrs
SET
  service_name_snapshot = COALESCE(lrs.service_name_snapshot, ls.name),
  service_name_ar_snapshot = COALESCE(lrs.service_name_ar_snapshot, ls.name_ar),
  service_code_snapshot = COALESCE(lrs.service_code_snapshot, ls.code)
FROM public.lab_requests r, public.lab_services ls
WHERE r.id = lrs.lab_request_id
  AND ls.id = lrs.service_id
  AND ls.tenant_id = r.lab_tenant_id
  AND (
    lrs.service_name_snapshot IS NULL
    OR lrs.service_name_ar_snapshot IS NULL
    OR lrs.service_code_snapshot IS NULL
  );
