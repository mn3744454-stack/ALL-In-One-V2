
-- ============================================================
-- Phase N+1B · J1 — Additive tax source & snapshot schema
-- Non-destructive. No historical data modified.
-- ============================================================

-- 1. Laboratory Service taxability (authoritative backend source)
ALTER TABLE public.lab_services
  ADD COLUMN IF NOT EXISTS is_taxable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.lab_services.is_taxable IS
  'Authoritative backend taxability for this Laboratory Service. Defaults true to preserve current effective behavior. Client payloads MUST NOT override.';

-- 2. Stable Service Plan (Package) taxability (authoritative backend source)
ALTER TABLE public.stable_service_plans
  ADD COLUMN IF NOT EXISTS is_taxable boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.stable_service_plans.is_taxable IS
  'Authoritative backend taxability for this Stable Service Plan / Package. Package parent is the only financial line; children never contribute tax.';

-- 3. Invoice-level Prices Include Tax switch (per-invoice override of tenant default)
--    Nullable in J1; backfilled in J4; NOT NULL enforced in J5.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS prices_include_tax boolean;

COMMENT ON COLUMN public.invoices.prices_include_tax IS
  'Per-invoice Prices Include Tax mode. Initialized from tenants.prices_tax_inclusive on create; may be overridden on this invoice only; never mutates the tenant setting. Frozen at approval.';

-- 4. Invoice-item frozen financial snapshot columns
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS line_pretax_amount   numeric(12,2),
  ADD COLUMN IF NOT EXISTS line_tax_amount      numeric(12,2),
  ADD COLUMN IF NOT EXISTS line_gross_amount    numeric(12,2),
  ADD COLUMN IF NOT EXISTS taxable_snapshot     boolean,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot    numeric(6,3);

COMMENT ON COLUMN public.invoice_items.line_pretax_amount IS
  'Frozen pretax financial truth for this line. Populated by backend RPC at draft save and re-frozen at approval. Package children remain NULL and are excluded from header sums.';
COMMENT ON COLUMN public.invoice_items.line_tax_amount IS
  'Frozen tax financial truth for this line. Package children remain NULL.';
COMMENT ON COLUMN public.invoice_items.line_gross_amount IS
  'Frozen customer gross financial truth for this line. line_pretax + line_tax = line_gross at currency precision. Package children remain NULL.';
COMMENT ON COLUMN public.invoice_items.taxable_snapshot IS
  'Resolved line taxability at the time snapshot was written. Backend-authoritative for Service/Package sources; operator-selected for Manual Items.';
COMMENT ON COLUMN public.invoice_items.tax_rate_snapshot IS
  'Effective tenant tax rate percent (0-100) resolved when snapshot was written.';

-- 5. Safe non-negative / range checks (added as NOT VALID so existing null rows are ignored;
--    J5 will VALIDATE after backfill fills all rows).
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_line_pretax_nonneg_ck
    CHECK (line_pretax_amount IS NULL OR line_pretax_amount >= 0) NOT VALID;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_line_tax_nonneg_ck
    CHECK (line_tax_amount IS NULL OR line_tax_amount >= 0) NOT VALID;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_line_gross_nonneg_ck
    CHECK (line_gross_amount IS NULL OR line_gross_amount >= 0) NOT VALID;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_tax_rate_snapshot_range_ck
    CHECK (tax_rate_snapshot IS NULL OR (tax_rate_snapshot >= 0 AND tax_rate_snapshot <= 100)) NOT VALID;
