-- =========================================================================
-- Phase AML.1.a.1 + AML.1.a.2 — Slice 1 Acceptance Correction
-- Corrective migration: delete-authority hardening, function EXECUTE hardening,
-- historical description-first snapshot correction, and category-link backfill.
-- =========================================================================

-- CORRECTION 1: remove ordinary hard delete authority on categories --------
REVOKE DELETE ON public.tenant_service_categories FROM authenticated;
DROP POLICY IF EXISTS "tsc_delete_managers" ON public.tenant_service_categories;
-- FKs already ON DELETE SET NULL (verified); service_role retains ALL.

-- CORRECTION 4: trigger-only helper function EXECUTE hardening -------------
REVOKE EXECUTE ON FUNCTION public._tsc_enforce_same_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._invoice_items_fill_snapshots() FROM PUBLIC, anon, authenticated;
-- postgres/service_role retain default EXECUTE (trigger dispatch works via table owner).

-- CORRECTION 2: historical description-first service snapshot correction ---
-- Migration application timestamp for Slice 1 = 2026-07-18 01:48:47+00.
-- Only correct rows created strictly before that timestamp whose description
-- is non-blank and differs from the currently stored service_name_snapshot.
-- English slot: use description (this is the actual invoice-time text).
-- Arabic slot: preserve existing ts.name_ar-derived snapshot; do NOT fabricate.
UPDATE public.invoice_items
SET service_name_snapshot = description
WHERE created_at < '2026-07-18 01:48:47+00'
  AND description IS NOT NULL
  AND length(btrim(description)) > 0
  AND service_name_snapshot IS DISTINCT FROM description;

-- CORRECTION 3: category-link backfill ------------------------------------

-- 3a) tenant_services.category_id via service_kind → per-tenant category key.
-- Seed missing (tenant_id, key) categories first.
WITH kind_labels(k, name_en, name_ar) AS (
  VALUES
    ('boarding','Boarding','إيواء'),
    ('vet','Veterinary','بيطري'),
    ('breeding','Breeding','تناسل'),
    ('training','Training','تدريب'),
    ('lab','Laboratory','مختبر'),
    ('general','General','عام')
),
needed AS (
  SELECT DISTINCT ts.tenant_id,
         COALESCE(NULLIF(btrim(ts.service_kind), ''), 'general') AS k
  FROM public.tenant_services ts
  WHERE ts.category_id IS NULL
)
INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order)
SELECT n.tenant_id, n.k, kl.name_en, kl.name_ar, n.k, 10
FROM needed n
JOIN kind_labels kl ON kl.k = n.k
ON CONFLICT (tenant_id, key) DO NOTHING;

UPDATE public.tenant_services ts
SET category_id = tsc.id
FROM public.tenant_service_categories tsc
WHERE ts.category_id IS NULL
  AND tsc.tenant_id = ts.tenant_id
  AND tsc.key = COALESCE(NULLIF(btrim(ts.service_kind), ''), 'general');

-- 3b) lab_services.category_id from existing free-text category.
-- Deterministic key: lab_<md5[0..8](lower(btrim(category)))>. Retains distinct
-- source categories; does not collapse them to generic 'lab'.
WITH src AS (
  SELECT DISTINCT ls.tenant_id,
         btrim(ls.category) AS raw_name,
         'lab_' || substr(md5(lower(btrim(ls.category))), 1, 8) AS k
  FROM public.lab_services ls
  WHERE ls.category_id IS NULL
    AND ls.category IS NOT NULL
    AND length(btrim(ls.category)) > 0
)
INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order)
SELECT src.tenant_id, src.k, src.raw_name, src.raw_name, 'lab', 20
FROM src
ON CONFLICT (tenant_id, key) DO NOTHING;

UPDATE public.lab_services ls
SET category_id = tsc.id
FROM public.tenant_service_categories tsc
WHERE ls.category_id IS NULL
  AND ls.category IS NOT NULL
  AND length(btrim(ls.category)) > 0
  AND tsc.tenant_id = ls.tenant_id
  AND tsc.key = 'lab_' || substr(md5(lower(btrim(ls.category))), 1, 8);

-- lab_test_types: 0 rows in current data; no backfill possible. Future rows
-- will link via services.manage UI or the same normalization rule.
