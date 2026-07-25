-- =====================================================================
-- Migration B — Laboratory Billing Authority
-- Scope: replace ONLY the lab_horse_id branch of
--        public._invoice_items_validate_source().
-- All other branches preserved verbatim from the pre-Migration-B baseline
-- (raw fingerprint 53e6278d74f25fbbbd8d2b254c44164fe0b1e3c329dc2f89c1dd50c8954832d8).
-- =====================================================================

DO $preflight$
DECLARE
  v_trg_ct  int;
  v_pfk_ct  int;
  v_cols    int;
  v_bad_col int;
BEGIN
  -- Trigger must remain bound exactly once
  SELECT count(*) INTO v_trg_ct
    FROM pg_trigger
   WHERE tgname = 'trg_invoice_items_validate_source'
     AND tgrelid = 'public.invoice_items'::regclass
     AND NOT tgisinternal;
  IF v_trg_ct <> 1 THEN
    RAISE EXCEPTION 'MIGRATION_B_BLOCKED_TRIGGER_BINDING_DRIFT (found %)', v_trg_ct;
  END IF;

  -- party_horse_links required shape
  SELECT count(*) INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'party_horse_links'
     AND column_name IN ('tenant_id','client_id','lab_horse_id','relationship_type');
  IF v_cols <> 4 THEN
    RAISE EXCEPTION 'MIGRATION_B_BLOCKED_PARTY_HORSE_LINKS_MISSING_COLUMNS';
  END IF;

  -- No unexpected lifecycle field must have appeared
  SELECT count(*) INTO v_bad_col
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'party_horse_links'
     AND column_name IN ('is_active','status','archived_at','effective_date','ends_at','deleted_at');
  IF v_bad_col > 0 THEN
    RAISE EXCEPTION 'MIGRATION_B_BLOCKED_UNEXPECTED_LIFECYCLE_FIELD';
  END IF;
END
$preflight$;

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
  lh_link_ct  int;
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

  -- ---- lab_horse_id (Migration B: Laboratory Billing Authority) ----
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
    IF inv_client IS NOT NULL THEN
      -- Accept either the legacy denormalized client on lab_horses OR a
      -- billing-authorizing junction row in party_horse_links.
      IF lh_client IS DISTINCT FROM inv_client THEN
        SELECT COUNT(*) INTO lh_link_ct
          FROM public.party_horse_links phl
         WHERE phl.tenant_id        = inv_tenant
           AND phl.client_id        = inv_client
           AND phl.lab_horse_id     = NEW.lab_horse_id
           AND phl.relationship_type IN ('lab_customer','payer');
        IF lh_link_ct = 0 THEN
          RAISE EXCEPTION 'Lab horse % is not linked to invoice client %',
            NEW.lab_horse_id, inv_client USING ERRCODE = '42501';
        END IF;
      END IF;
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
$function$;
