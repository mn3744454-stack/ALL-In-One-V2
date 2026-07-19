-- Slice 3 closure: enforce lab_request_services integrity.
-- Guarantees that every service linked to a lab_request:
--   (a) exists,
--   (b) is currently active,
--   (c) belongs to the same laboratory provider the request targets
--       (lab_tenant_id when set; otherwise the request's tenant_id for
--       fully internal lab tenants).
-- Duplicate (lab_request_id, service_id) rows are already rejected by
-- the composite primary key.

CREATE OR REPLACE FUNCTION public.enforce_lab_request_service_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc_tenant uuid;
  v_svc_active boolean;
  v_req_lab_tenant uuid;
  v_req_tenant uuid;
  v_expected_tenant uuid;
BEGIN
  SELECT tenant_id, is_active
    INTO v_svc_tenant, v_svc_active
  FROM public.lab_services
  WHERE id = NEW.service_id;

  IF v_svc_tenant IS NULL THEN
    RAISE EXCEPTION 'lab_request_services: service % does not exist', NEW.service_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_svc_active IS NOT TRUE THEN
    RAISE EXCEPTION 'lab_request_services: service % is inactive', NEW.service_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT lab_tenant_id, tenant_id
    INTO v_req_lab_tenant, v_req_tenant
  FROM public.lab_requests
  WHERE id = NEW.lab_request_id;

  v_expected_tenant := COALESCE(v_req_lab_tenant, v_req_tenant);

  IF v_expected_tenant IS NULL THEN
    RAISE EXCEPTION 'lab_request_services: lab request % missing tenant context', NEW.lab_request_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_svc_tenant <> v_expected_tenant THEN
    RAISE EXCEPTION 'lab_request_services: service % (tenant %) does not belong to laboratory provider %',
      NEW.service_id, v_svc_tenant, v_expected_tenant
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_lab_request_service_integrity() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_lrs_enforce_integrity ON public.lab_request_services;
CREATE TRIGGER trg_lrs_enforce_integrity
BEFORE INSERT OR UPDATE OF service_id, lab_request_id
ON public.lab_request_services
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lab_request_service_integrity();
