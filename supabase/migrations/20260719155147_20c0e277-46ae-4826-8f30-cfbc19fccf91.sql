-- Label 1 (horse closure) — Non-destructive lab_horse support on invoice_items
-- and hardened source-relationship validation for horse_id / lab_horse_id.

-- 1) Optional lab_horses reference (nullable). Keeps existing horse_id FK intact.
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS lab_horse_id uuid NULL
  REFERENCES public.lab_horses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_lab_horse_id
  ON public.invoice_items(lab_horse_id) WHERE lab_horse_id IS NOT NULL;

-- 2) Mutual-exclusion CHECK — both may be NULL (customer-level line) but never both set.
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_horse_source_exclusive_chk;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_horse_source_exclusive_chk
  CHECK (NOT (horse_id IS NOT NULL AND lab_horse_id IS NOT NULL));

-- 3) Extend validation: enforce tenant/client integrity for horse references.
--    Preserves the existing service_source and category_id checks.
CREATE OR REPLACE FUNCTION public._invoice_items_validate_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF NEW.service_source IS NULL THEN
    NEW.service_source := 'tenant_services';
  END IF;

  SELECT tenant_id, client_id INTO inv_tenant, inv_client
    FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv_tenant IS NULL THEN
    RETURN NEW;
  END IF;

  -- ---- service_id / service_source / category (unchanged behavior) ----
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
      RAISE EXCEPTION 'Cross-tenant service_id rejected on invoice_items (invoice tenant %, service tenant %)',
        inv_tenant, svc_tenant USING ERRCODE = '42501';
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

  -- ---- horse_id (stable/general) ----
  IF NEW.horse_id IS NOT NULL THEN
    SELECT tenant_id INTO h_tenant FROM public.horses WHERE id = NEW.horse_id;
    IF h_tenant IS NULL THEN
      RAISE EXCEPTION 'Horse % not found', NEW.horse_id USING ERRCODE = '23503';
    END IF;
    IF h_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant horse_id rejected on invoice_items (invoice tenant %, horse tenant %)',
        inv_tenant, h_tenant USING ERRCODE = '42501';
    END IF;
    -- Client linkage: only enforced when invoice has a client. Uses the same
    -- canonical resolvers (boarding_admissions OR horse_ownership through
    -- horse_owners.claimed via clients). Kept permissive to admit either
    -- relationship without breaking legitimate cases.
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

  -- ---- lab_horse_id (laboratory) ----
  IF NEW.lab_horse_id IS NOT NULL THEN
    SELECT tenant_id, client_id INTO lh_tenant, lh_client
      FROM public.lab_horses WHERE id = NEW.lab_horse_id;
    IF lh_tenant IS NULL THEN
      RAISE EXCEPTION 'Lab horse % not found', NEW.lab_horse_id USING ERRCODE = '23503';
    END IF;
    IF lh_tenant <> inv_tenant THEN
      RAISE EXCEPTION 'Cross-tenant lab_horse_id rejected on invoice_items (invoice tenant %, lab_horse tenant %)',
        inv_tenant, lh_tenant USING ERRCODE = '42501';
    END IF;
    IF inv_client IS NOT NULL AND (lh_client IS DISTINCT FROM inv_client) THEN
      RAISE EXCEPTION 'Lab horse % is not linked to invoice client % (linked to %)',
        NEW.lab_horse_id, inv_client, lh_client USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._invoice_items_validate_source() FROM PUBLIC;