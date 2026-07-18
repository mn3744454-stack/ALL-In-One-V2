
-- =========================================================================
-- Phase AML.1.a.1 + AML.1.a.2 — Slice 1
-- Database foundation: tenant service categories + invoice_item snapshots
-- =========================================================================

-- 1) Shared tenant-scoped category table -----------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  name_ar text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  domain_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_service_categories_key_nonblank CHECK (length(btrim(key)) > 0),
  CONSTRAINT tenant_service_categories_name_nonblank CHECK (length(btrim(name)) > 0),
  CONSTRAINT tenant_service_categories_tenant_key_unique UNIQUE (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_service_categories_tenant_active
  ON public.tenant_service_categories (tenant_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_tenant_service_categories_tenant_domain
  ON public.tenant_service_categories (tenant_id, domain_key) WHERE domain_key IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_service_categories TO authenticated;
GRANT ALL ON public.tenant_service_categories TO service_role;

ALTER TABLE public.tenant_service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tsc_select_members" ON public.tenant_service_categories;
CREATE POLICY "tsc_select_members" ON public.tenant_service_categories
  FOR SELECT TO authenticated
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "tsc_insert_managers" ON public.tenant_service_categories;
CREATE POLICY "tsc_insert_managers" ON public.tenant_service_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'services.manage'));

DROP POLICY IF EXISTS "tsc_update_managers" ON public.tenant_service_categories;
CREATE POLICY "tsc_update_managers" ON public.tenant_service_categories
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'services.manage'))
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'services.manage'));

DROP POLICY IF EXISTS "tsc_delete_managers" ON public.tenant_service_categories;
CREATE POLICY "tsc_delete_managers" ON public.tenant_service_categories
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'services.manage'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_tenant_service_categories_updated_at ON public.tenant_service_categories;
CREATE TRIGGER update_tenant_service_categories_updated_at
  BEFORE UPDATE ON public.tenant_service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Optional category links on catalog tables (nullable) ------------------
ALTER TABLE public.tenant_services
  ADD COLUMN IF NOT EXISTS category_id uuid
    REFERENCES public.tenant_service_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_services_category ON public.tenant_services(category_id) WHERE category_id IS NOT NULL;

ALTER TABLE public.lab_test_types
  ADD COLUMN IF NOT EXISTS category_id uuid
    REFERENCES public.tenant_service_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lab_test_types_category ON public.lab_test_types(category_id) WHERE category_id IS NOT NULL;

ALTER TABLE public.lab_services
  ADD COLUMN IF NOT EXISTS category_id uuid
    REFERENCES public.tenant_service_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lab_services_category ON public.lab_services(category_id) WHERE category_id IS NOT NULL;

-- Same-tenant enforcement triggers for category_id
CREATE OR REPLACE FUNCTION public._tsc_enforce_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat_tenant uuid;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT tenant_id INTO cat_tenant FROM public.tenant_service_categories WHERE id = NEW.category_id;
  IF cat_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_service_categories row % not found', NEW.category_id;
  END IF;
  IF cat_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'category_id belongs to a different tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_services_category_same_tenant ON public.tenant_services;
CREATE TRIGGER trg_tenant_services_category_same_tenant
  BEFORE INSERT OR UPDATE OF category_id, tenant_id ON public.tenant_services
  FOR EACH ROW EXECUTE FUNCTION public._tsc_enforce_same_tenant();

DROP TRIGGER IF EXISTS trg_lab_test_types_category_same_tenant ON public.lab_test_types;
CREATE TRIGGER trg_lab_test_types_category_same_tenant
  BEFORE INSERT OR UPDATE OF category_id, tenant_id ON public.lab_test_types
  FOR EACH ROW EXECUTE FUNCTION public._tsc_enforce_same_tenant();

DROP TRIGGER IF EXISTS trg_lab_services_category_same_tenant ON public.lab_services;
CREATE TRIGGER trg_lab_services_category_same_tenant
  BEFORE INSERT OR UPDATE OF category_id, tenant_id ON public.lab_services
  FOR EACH ROW EXECUTE FUNCTION public._tsc_enforce_same_tenant();

-- 3) invoice_items snapshot columns ---------------------------------------
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS category_key text,
  ADD COLUMN IF NOT EXISTS category_name_snapshot text,
  ADD COLUMN IF NOT EXISTS category_name_ar_snapshot text,
  ADD COLUMN IF NOT EXISTS service_name_snapshot text,
  ADD COLUMN IF NOT EXISTS service_name_ar_snapshot text;

CREATE INDEX IF NOT EXISTS idx_invoice_items_category_key
  ON public.invoice_items(category_key) WHERE category_key IS NOT NULL;

-- 4) Idempotent per-tenant category seeding based on existing data --------
WITH domain_labels(domain_key, k, name_en, name_ar) AS (
  VALUES
    ('boarding','boarding','Boarding','إيواء'),
    ('vet','vet','Veterinary','بيطري'),
    ('breeding','breeding','Breeding','تناسل'),
    ('lab','lab','Laboratory','مختبر'),
    ('training','training','Training','تدريب'),
    ('general','general','General','عام')
),
observed AS (
  SELECT DISTINCT i.tenant_id,
         COALESCE(NULLIF(btrim(ii.domain), ''), 'general') AS domain_key
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
)
INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order)
SELECT o.tenant_id, dl.k, dl.name_en, dl.name_ar, dl.domain_key, 10
FROM observed o
JOIN domain_labels dl ON dl.domain_key = o.domain_key
ON CONFLICT (tenant_id, key) DO NOTHING;

-- 5) Historical backfill of invoice_items snapshots (idempotent) ----------
-- Rule 2: reliable current service relationship
UPDATE public.invoice_items ii
SET service_name_snapshot = COALESCE(ii.service_name_snapshot, ts.name),
    service_name_ar_snapshot = COALESCE(ii.service_name_ar_snapshot, ts.name_ar)
FROM public.tenant_services ts
WHERE ii.service_id = ts.id
  AND (ii.service_name_snapshot IS NULL OR ii.service_name_ar_snapshot IS NULL);

-- service_name fallback from description where still null
UPDATE public.invoice_items
SET service_name_snapshot = description
WHERE service_name_snapshot IS NULL
  AND description IS NOT NULL
  AND length(btrim(description)) > 0;

-- Rule 3: domain fallback → tenant-scoped category snapshot
UPDATE public.invoice_items ii
SET category_key = COALESCE(ii.category_key, tsc.key),
    category_name_snapshot = COALESCE(ii.category_name_snapshot, tsc.name),
    category_name_ar_snapshot = COALESCE(ii.category_name_ar_snapshot, tsc.name_ar)
FROM public.invoices i, public.tenant_service_categories tsc
WHERE i.id = ii.invoice_id
  AND tsc.tenant_id = i.tenant_id
  AND tsc.key = COALESCE(NULLIF(btrim(ii.domain), ''), NULL)
  AND ii.category_key IS NULL;

-- Rule 4: unresolved → historically_uncategorized (per-tenant, created only when needed)
INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order, is_active)
SELECT DISTINCT i.tenant_id, 'historically_uncategorized', 'Historically Uncategorized', 'غير مصنف تاريخيًا', NULL, 900, true
FROM public.invoice_items ii
JOIN public.invoices i ON i.id = ii.invoice_id
WHERE ii.category_key IS NULL
ON CONFLICT (tenant_id, key) DO NOTHING;

UPDATE public.invoice_items ii
SET category_key = COALESCE(ii.category_key, tsc.key),
    category_name_snapshot = COALESCE(ii.category_name_snapshot, tsc.name),
    category_name_ar_snapshot = COALESCE(ii.category_name_ar_snapshot, tsc.name_ar)
FROM public.invoices i, public.tenant_service_categories tsc
WHERE i.id = ii.invoice_id
  AND tsc.tenant_id = i.tenant_id
  AND tsc.key = 'historically_uncategorized'
  AND ii.category_key IS NULL;

-- service_name safe bilingual fallback if still null
UPDATE public.invoice_items
SET service_name_snapshot = COALESCE(service_name_snapshot, 'Unnamed line'),
    service_name_ar_snapshot = COALESCE(service_name_ar_snapshot, 'بند بدون اسم')
WHERE service_name_snapshot IS NULL OR service_name_ar_snapshot IS NULL;

-- 6) Defensive BEFORE INSERT trigger for future rows ----------------------
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
  cat_key text;
  cat_name text;
  cat_name_ar text;
BEGIN
  -- resolve invoice tenant (needed for tenant-scoped category lookups)
  SELECT tenant_id INTO inv_tenant FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv_tenant IS NULL THEN
    RETURN NEW; -- let the FK error surface naturally
  END IF;

  -- service snapshots (only if writer did not supply)
  IF (NEW.service_name_snapshot IS NULL OR NEW.service_name_ar_snapshot IS NULL) AND NEW.service_id IS NOT NULL THEN
    SELECT name, name_ar INTO svc_name, svc_name_ar
    FROM public.tenant_services WHERE id = NEW.service_id AND tenant_id = inv_tenant;
    NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, svc_name);
    NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, svc_name_ar);
  END IF;
  IF NEW.service_name_snapshot IS NULL AND NEW.description IS NOT NULL AND length(btrim(NEW.description)) > 0 THEN
    NEW.service_name_snapshot := NEW.description;
  END IF;
  NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, 'Unnamed line');
  NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, 'بند بدون اسم');

  -- category snapshots (only if writer did not supply)
  IF NEW.category_key IS NULL THEN
    -- Prefer explicit category via service.category_id
    IF NEW.service_id IS NOT NULL THEN
      SELECT tsc.key, tsc.name, tsc.name_ar
        INTO cat_key, cat_name, cat_name_ar
      FROM public.tenant_services ts
      JOIN public.tenant_service_categories tsc ON tsc.id = ts.category_id
      WHERE ts.id = NEW.service_id AND tsc.tenant_id = inv_tenant;
    END IF;
    -- Fallback to domain
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
    -- Fallback historically_uncategorized
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

DROP TRIGGER IF EXISTS trg_invoice_items_fill_snapshots ON public.invoice_items;
CREATE TRIGGER trg_invoice_items_fill_snapshots
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public._invoice_items_fill_snapshots();
