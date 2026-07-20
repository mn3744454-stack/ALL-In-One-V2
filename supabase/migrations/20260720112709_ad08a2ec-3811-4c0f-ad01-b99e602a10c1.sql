-- =====================================================================
-- AML.1.b.1 — Stage 3: Additive schema foundations
-- Zero mutations of existing rows. No backfill. No revoke on existing
-- Finance-Core tables. No ALTER DEFAULT PRIVILEGES.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ledger_entries.effective_date (additive, nullable, no backfill)
-- ---------------------------------------------------------------------
ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS effective_date date;

COMMENT ON COLUMN public.ledger_entries.effective_date IS
  'AML.1.b.1: authoritative accounting date for the ledger row. Populated by later stages (backfill + writer migration). Readers must not depend on this column until Stage 13 reader flip.';

CREATE INDEX IF NOT EXISTS ledger_entries_effective_date_idx
  ON public.ledger_entries (effective_date);

CREATE INDEX IF NOT EXISTS ledger_entries_tenant_effective_date_idx
  ON public.ledger_entries (tenant_id, effective_date);

-- ---------------------------------------------------------------------
-- 2. expenses.ledger_status (additive, nullable, no backfill)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'expense_ledger_status'
  ) THEN
    CREATE TYPE public.expense_ledger_status AS ENUM ('unposted','posted','reversed');
  END IF;
END $$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS ledger_status public.expense_ledger_status;

COMMENT ON COLUMN public.expenses.ledger_status IS
  'AML.1.b.1: ledger-posting axis for an expense row. Kept separate from the workflow status column. Populated by later stages (Stage 8 writer migration + Stage 11 backfill).';

-- ---------------------------------------------------------------------
-- 3. finance_request_idempotency (new internal table)
--    Explicit restrictive grants: service_role ONLY. RLS ON with no
--    permissive policies so authenticated/anon see nothing even if a
--    later migration accidentally grants a read.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_request_idempotency (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  actor_user_id  uuid NOT NULL,
  operation      text NOT NULL,
  request_key    text NOT NULL,
  payload_hash   text NOT NULL,
  response       jsonb,
  status         text NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  CONSTRAINT finance_request_idempotency_unique
    UNIQUE (tenant_id, actor_user_id, operation, request_key)
);

COMMENT ON TABLE public.finance_request_idempotency IS
  'AML.1.b.1: once-only fingerprints for atomic finance RPCs. Service role only. Not readable or writable by authenticated or anon.';

CREATE INDEX IF NOT EXISTS finance_request_idempotency_tenant_idx
  ON public.finance_request_idempotency (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS finance_request_idempotency_hash_idx
  ON public.finance_request_idempotency (tenant_id, operation, payload_hash);

-- Narrow, explicit, restrictive grants on THIS new table only.
REVOKE ALL ON public.finance_request_idempotency FROM PUBLIC;
REVOKE ALL ON public.finance_request_idempotency FROM anon;
REVOKE ALL ON public.finance_request_idempotency FROM authenticated;
GRANT  ALL ON public.finance_request_idempotency TO service_role;

ALTER TABLE public.finance_request_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_request_idempotency FORCE ROW LEVEL SECURITY;
-- No permissive policies created. authenticated/anon have neither GRANT
-- nor policy, so all their access is denied by both layers.

-- ---------------------------------------------------------------------
-- 4. pos_sales (new internal placeholder table)
--    No existing reader mechanically requires SELECT today, per D-07.
--    Explicit restrictive grants: service_role ONLY.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  branch_id      uuid,
  cashier_user_id uuid,
  sale_reference text,
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  subtotal       numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount     numeric(14,2) NOT NULL DEFAULT 0,
  total_amount   numeric(14,2) NOT NULL DEFAULT 0,
  currency       text,
  status         text NOT NULL DEFAULT 'draft',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pos_sales IS
  'AML.1.b.1: POS sale headers scaffold. Service role only for Stage 3. A narrow tenant SELECT will be added in a later stage only if an existing reader mechanically requires it.';

CREATE INDEX IF NOT EXISTS pos_sales_tenant_occurred_idx
  ON public.pos_sales (tenant_id, occurred_at DESC);

-- Narrow, explicit, restrictive grants on THIS new table only.
REVOKE ALL ON public.pos_sales FROM PUBLIC;
REVOKE ALL ON public.pos_sales FROM anon;
REVOKE ALL ON public.pos_sales FROM authenticated;
GRANT  ALL ON public.pos_sales TO service_role;

ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sales FORCE ROW LEVEL SECURITY;
-- No permissive policies created in Stage 3.

-- ---------------------------------------------------------------------
-- 5. Explicit non-scope markers (documentation-only)
-- ---------------------------------------------------------------------
-- This migration deliberately does NOT:
--   * backfill ledger_entries.effective_date
--   * backfill expenses.ledger_status
--   * insert any permission_definitions row
--   * bind any permission to any bundle
--   * modify invoices / invoice_items / ledger_entries rows or ACL
--   * modify customer_balances / billing_links / expenses ACL
--   * revoke or grant on any pre-existing Finance-Core table
--   * run ALTER DEFAULT PRIVILEGES anywhere
--   * add NOT NULL to any new column
--   * touch the -213 record, INV-MMO9AAXD, INV-MNDH8GPD, or INV-MP4ET8LQ
