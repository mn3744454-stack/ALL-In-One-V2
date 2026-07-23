-- Phase N+1B · J2 — Explicit tenant default_tax_rate contract
-- Contract:
--   * Preserve every explicit rate unchanged (including 0 and 15).
--   * Normalize only NULL rates to 15 (the previously effective runtime fallback).
--   * Enforce NOT NULL with default 15 and range [0, 100].

-- 1. Normalize NULL rates only (explicit values, including 0, are untouched).
UPDATE public.tenants
SET default_tax_rate = 15
WHERE default_tax_rate IS NULL;

-- 2. Enforce explicit contract going forward.
ALTER TABLE public.tenants
  ALTER COLUMN default_tax_rate SET DEFAULT 15,
  ALTER COLUMN default_tax_rate SET NOT NULL;

-- 3. Safe range enforcement.
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_default_tax_rate_range_chk;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_default_tax_rate_range_chk
  CHECK (default_tax_rate >= 0 AND default_tax_rate <= 100);
