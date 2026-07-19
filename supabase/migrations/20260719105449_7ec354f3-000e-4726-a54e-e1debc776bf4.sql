
-- Label 1 — Invoice service-source foundation.
-- Non-destructive: existing rows keep tenant_services semantics.

-- 1) Discriminator column
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS service_source text NOT NULL DEFAULT 'tenant_services';

ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_service_source_chk;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_service_source_chk
  CHECK (service_source IN ('tenant_services','lab_services'));

-- 2) Optional live category_id (non-destructive; snapshots remain immutable)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS category_id uuid NULL
  REFERENCES public.tenant_service_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_category_id
  ON public.invoice_items(category_id) WHERE category_id IS NOT NULL;

-- 3) Drop the hard FK to tenant_services so lab_services ids are also valid.
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_service_id_fkey;

-- 4) Validation trigger — enforces same-tenant + active + correct source.
CREATE OR REPLACE FUNCTION public._invoice_items_validate_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_tenant uuid;
  svc_tenant uuid;
  svc_active boolean;
  cat_tenant uuid;
BEGIN
  IF NEW.service_source IS NULL THEN
    NEW.service_source := 'tenant_services';
  END IF;

  SELECT tenant_id INTO inv_tenant FROM public.invoices WHERE id = NEW.invoice_id;
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
      RAISE EXCEPTION 'Cross-tenant service_id rejected on invoice_items (invoice tenant %, service tenant %)',
        inv_tenant, svc_tenant USING ERRCODE = '42501';
    END IF;
    -- For NEW inserts only: reject inactive services. Updates on historical
    -- rows may still touch inactive services; UPDATE path here is prospective.
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

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._invoice_items_validate_source() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_invoice_items_validate_source ON public.invoice_items;
CREATE TRIGGER trg_invoice_items_validate_source
BEFORE INSERT OR UPDATE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public._invoice_items_validate_source();

-- 5) Snapshot trigger — resolve from the correct source table.
CREATE OR REPLACE FUNCTION public._invoice_items_fill_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_tenant uuid;
  svc_name text;
  svc_name_ar text;
  svc_cat_id uuid;
  cat_key text;
  cat_name text;
  cat_name_ar text;
BEGIN
  SELECT tenant_id INTO inv_tenant FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv_tenant IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.service_source IS NULL THEN
    NEW.service_source := 'tenant_services';
  END IF;

  -- Service name snapshot (only if writer did not supply)
  IF (NEW.service_name_snapshot IS NULL OR NEW.service_name_ar_snapshot IS NULL)
     AND NEW.service_id IS NOT NULL THEN
    IF NEW.service_source = 'lab_services' THEN
      SELECT name, name_ar, category_id INTO svc_name, svc_name_ar, svc_cat_id
      FROM public.lab_services WHERE id = NEW.service_id AND tenant_id = inv_tenant;
    ELSE
      SELECT name, name_ar, category_id INTO svc_name, svc_name_ar, svc_cat_id
      FROM public.tenant_services WHERE id = NEW.service_id AND tenant_id = inv_tenant;
    END IF;
    NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, svc_name);
    NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, svc_name_ar);
  END IF;
  IF NEW.service_name_snapshot IS NULL AND NEW.description IS NOT NULL
     AND length(btrim(NEW.description)) > 0 THEN
    NEW.service_name_snapshot := NEW.description;
  END IF;
  NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, 'Unnamed line');
  NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, 'بند بدون اسم');

  -- Category snapshot: prefer explicit NEW.category_id, then service.category_id,
  -- then legacy domain fallback, then historically_uncategorized.
  IF NEW.category_key IS NULL THEN
    IF NEW.category_id IS NOT NULL THEN
      SELECT key, name, name_ar INTO cat_key, cat_name, cat_name_ar
      FROM public.tenant_service_categories
      WHERE id = NEW.category_id AND tenant_id = inv_tenant;
    END IF;

    IF cat_key IS NULL AND NEW.service_id IS NOT NULL THEN
      IF svc_cat_id IS NULL THEN
        IF NEW.service_source = 'lab_services' THEN
          SELECT category_id INTO svc_cat_id
          FROM public.lab_services WHERE id = NEW.service_id AND tenant_id = inv_tenant;
        ELSE
          SELECT category_id INTO svc_cat_id
          FROM public.tenant_services WHERE id = NEW.service_id AND tenant_id = inv_tenant;
        END IF;
      END IF;
      IF svc_cat_id IS NOT NULL THEN
        SELECT key, name, name_ar INTO cat_key, cat_name, cat_name_ar
        FROM public.tenant_service_categories
        WHERE id = svc_cat_id AND tenant_id = inv_tenant;
      END IF;
    END IF;

    IF cat_key IS NULL AND NEW.domain IS NOT NULL AND length(btrim(NEW.domain)) > 0 THEN
      SELECT key, name, name_ar INTO cat_key, cat_name, cat_name_ar
      FROM public.tenant_service_categories
      WHERE tenant_id = inv_tenant AND key = btrim(NEW.domain);
      IF cat_key IS NULL THEN
        INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order)
        VALUES (inv_tenant, btrim(NEW.domain), initcap(btrim(NEW.domain)), NULL, btrim(NEW.domain), 10)
        ON CONFLICT (tenant_id, key) DO NOTHING;
        SELECT key, name, name_ar INTO cat_key, cat_name, cat_name_ar
        FROM public.tenant_service_categories
        WHERE tenant_id = inv_tenant AND key = btrim(NEW.domain);
      END IF;
    END IF;

    IF cat_key IS NULL THEN
      INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, sort_order)
      VALUES (inv_tenant, 'historically_uncategorized', 'Historically Uncategorized', 'غير مصنف تاريخيًا', 900)
      ON CONFLICT (tenant_id, key) DO NOTHING;
      SELECT key, name, name_ar INTO cat_key, cat_name, cat_name_ar
      FROM public.tenant_service_categories
      WHERE tenant_id = inv_tenant AND key = 'historically_uncategorized';
    END IF;

    NEW.category_key := cat_key;
    NEW.category_name_snapshot := COALESCE(NEW.category_name_snapshot, cat_name);
    NEW.category_name_ar_snapshot := COALESCE(NEW.category_name_ar_snapshot, cat_name_ar);
  END IF;

  RETURN NEW;
END;
$$;
