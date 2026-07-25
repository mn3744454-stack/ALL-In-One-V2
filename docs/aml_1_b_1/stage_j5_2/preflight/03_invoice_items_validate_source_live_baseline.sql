CREATE OR REPLACE FUNCTION public._invoice_items_validate_source()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv_tenant  uuid;
  inv_client  uuid;
  svc_tenant  uuid;
  svc_active  boolean;
  cat_tenant  uuid;
  h_tenant    uuid;
  lh_tenant   uuid;
  lh_client   uuid;
  h_link_ct   int;
  pkg_tenant  uuid;
  pkg_active  boolean;
BEGIN
  IF NEW.service_source IS NULL THEN
    NEW.service_source := 'tenant_services';
  END IF;

  SELECT tenant_id, client_id INTO inv_tenant, inv_client
    FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv_tenant IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.service_id IS NOT NULL THEN
    IF NEW.service_source = 'tenant_services' THEN
      SELECT tenant_id, is_active INTO svc_tenant, svc_active
        FROM public.tenant_services WHERE id = NEW.service_id;
    ELSIF NEW.service_source = 'lab_services' THEN
      SELECT tenant_id, is_active INTO svc_tenant, svc_active
        FROM public.lab_services WHERE id = NEW.service_id;
    ELSE
      RAISE EXCEPTION 'invoice_items.service_source % is not supported', NEW.service_source
        USING ERRCODE = '22023';
    END IF;

    IF svc_tenant IS NULL THEN
      RAISE EXCEPTION 'Service % not found in %', NEW.service_id, NEW.service_source
        USING ERRCODE = '23503';
    END IF;
    IF svc_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant service_id rejected on invoice_items'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' AND svc_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Service % is inactive and cannot be added to invoice', NEW.service_id
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT tenant_id INTO cat_tenant
      FROM public.tenant_service_categories WHERE id = NEW.category_id;
    IF cat_tenant IS NULL THEN
      RAISE EXCEPTION 'Category % not found', NEW.category_id USING ERRCODE = '23503';
    END IF;
    IF cat_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant category_id rejected on invoice_items'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.horse_id IS NOT NULL THEN
    SELECT tenant_id INTO h_tenant FROM public.horses WHERE id = NEW.horse_id;
    IF h_tenant IS NULL THEN
      RAISE EXCEPTION 'Horse % not found', NEW.horse_id USING ERRCODE = '23503';
    END IF;
    IF h_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant horse_id rejected on invoice_items'
        USING ERRCODE = '42501';
    END IF;
    IF inv_client IS NOT NULL THEN
      SELECT COUNT(*) INTO h_link_ct FROM (
        SELECT 1 FROM public.boarding_admissions ba
         WHERE ba.tenant_id = inv_tenant
           AND ba.horse_id  = NEW.horse_id
           AND ba.client_id = inv_client
        UNION ALL
        SELECT 1 FROM public.horse_ownership ho
          JOIN public.horse_owners howr ON howr.id = ho.owner_id
         WHERE ho.horse_id = NEW.horse_id
           AND howr.tenant_id = inv_tenant
           AND howr.id = inv_client
      ) x;
      IF h_link_ct = 0 THEN
        RAISE EXCEPTION 'Horse % is not linked to invoice client % on tenant %',
          NEW.horse_id, inv_client, inv_tenant USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.lab_horse_id IS NOT NULL THEN
    SELECT tenant_id, client_id INTO lh_tenant, lh_client
      FROM public.lab_horses WHERE id = NEW.lab_horse_id;
    IF lh_tenant IS NULL THEN
      RAISE EXCEPTION 'Lab horse % not found', NEW.lab_horse_id USING ERRCODE = '23503';
    END IF;
    IF lh_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant lab_horse_id rejected on invoice_items'
        USING ERRCODE = '42501';
    END IF;
    IF inv_client IS NOT NULL AND (lh_client IS DISTINCT FROM inv_client) THEN
      RAISE EXCEPTION 'Lab horse % is not linked to invoice client %',
        NEW.lab_horse_id, inv_client USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ---- package_id (Label 2) ----
  IF NEW.package_id IS NOT NULL THEN
    IF NEW.package_source IS NULL THEN
      NEW.package_source := 'stable_service_plans';
    END IF;
    IF NEW.package_source <> 'stable_service_plans' THEN
      RAISE EXCEPTION 'invoice_items.package_source % is not supported', NEW.package_source
        USING ERRCODE = '22023';
    END IF;
    SELECT tenant_id, is_active INTO pkg_tenant, pkg_active
      FROM public.stable_service_plans WHERE id = NEW.package_id;
    IF pkg_tenant IS NULL THEN
      RAISE EXCEPTION 'Package % not found', NEW.package_id USING ERRCODE = '23503';
    END IF;
    IF pkg_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant package_id rejected on invoice_items'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' AND pkg_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Package % is inactive and cannot be added to invoice', NEW.package_id
        USING ERRCODE = '22023';
    END IF;
    IF NEW.package_services_snapshot IS NOT NULL
       AND jsonb_typeof(NEW.package_services_snapshot) <> 'array' THEN
      RAISE EXCEPTION 'package_services_snapshot must be a JSON array'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

