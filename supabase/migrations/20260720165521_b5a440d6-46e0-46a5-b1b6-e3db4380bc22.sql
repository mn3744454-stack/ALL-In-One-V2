-- =====================================================================
-- AML.1.b.1 STAGE 3 — MIGRATION B: CORRECT APPROVED ADDITIVE SCHEMA
-- Applied only after Migration A restored the Stage 2 baseline exactly.
-- Zero mutations of existing rows. No backfill. No ACL change on the six
-- existing Finance-Core tables. No ALTER DEFAULT PRIVILEGES.
-- =====================================================================

-- Pre-flight absence guard: every Stage 3 target object must be absent.
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='finance_request_idempotency' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: finance_request_idempotency already present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='pos_sales' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: pos_sales already present';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_entries' AND column_name='effective_date') THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: ledger_entries.effective_date already present';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='ledger_status') THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: expenses.ledger_status already present';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='corrects_invoice_id') THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: invoices.corrects_invoice_id already present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoice_items_period_valid_ck') THEN
    RAISE EXCEPTION 'STAGE3B-ABORT: invoice_items_period_valid_ck already present';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------
-- 1. ledger_entries.effective_date + approved indexes
-- ---------------------------------------------------------------------
ALTER TABLE public.ledger_entries
  ADD COLUMN effective_date date;

COMMENT ON COLUMN public.ledger_entries.effective_date IS
  'AML.1.b.1 Stage 3 (corrected): authoritative accounting date for the ledger row. NULL until backfilled by a later stage. Readers must not depend on this column until the Stage 13 reader flip.';

CREATE INDEX ledger_entries_effective_composite_idx
  ON public.ledger_entries (tenant_id, client_id, effective_date, created_at, id);

CREATE UNIQUE INDEX ledger_entries_cancellation_unique_idx
  ON public.ledger_entries (reference_id)
  WHERE entry_type = 'adjustment'
    AND reference_type = 'invoice_cancellation';

-- ---------------------------------------------------------------------
-- 2. invoices.corrects_invoice_id
-- ---------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN corrects_invoice_id uuid NULL
    REFERENCES public.invoices(id);

COMMENT ON COLUMN public.invoices.corrects_invoice_id IS
  'AML.1.b.1 Stage 3 (corrected): points to the invoice this row corrects/reverses. NULL for normal invoices. Populated only by approved correction flows in later stages.';

-- ---------------------------------------------------------------------
-- 3. invoice_items period_valid CHECK (NOT VALID — never validated in AML.1.b.1)
-- ---------------------------------------------------------------------
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_period_valid_ck
  CHECK (
    (period_start IS NULL AND period_end IS NULL)
    OR (
      period_start IS NOT NULL
      AND period_end IS NOT NULL
      AND period_end >= period_start
    )
  ) NOT VALID;

-- ---------------------------------------------------------------------
-- 4. expenses additive columns + transition-safe checks + integrity indexes
-- ---------------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN ledger_status       text NULL,
  ADD COLUMN posted_at           timestamptz NULL,
  ADD COLUMN ledger_entry_id     uuid NULL REFERENCES public.ledger_entries(id),
  ADD COLUMN source_type         text NULL,
  ADD COLUMN source_reference    uuid NULL,
  ADD COLUMN reverses_expense_id uuid NULL REFERENCES public.expenses(id);

COMMENT ON COLUMN public.expenses.ledger_status       IS 'AML.1.b.1 Stage 3 (corrected): ledger-posting axis for an expense. Transition-safe values: NULL, unposted, posted, reversed. Populated in later stages.';
COMMENT ON COLUMN public.expenses.posted_at           IS 'AML.1.b.1 Stage 3 (corrected): when the ledger row was posted for this expense.';
COMMENT ON COLUMN public.expenses.ledger_entry_id     IS 'AML.1.b.1 Stage 3 (corrected): FK to the single ledger row posted for this expense.';
COMMENT ON COLUMN public.expenses.source_type         IS 'AML.1.b.1 Stage 3 (corrected): originating domain of the expense. AML.1.b.1 authorizes only hr_salary_payment as a non-null source.';
COMMENT ON COLUMN public.expenses.source_reference    IS 'AML.1.b.1 Stage 3 (corrected): id of the originating source row in its domain table.';
COMMENT ON COLUMN public.expenses.reverses_expense_id IS 'AML.1.b.1 Stage 3 (corrected): points to the expense this row reverses. Unique when non-null.';

-- Transition-safe values for ledger_status
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_ledger_status_ck
  CHECK (ledger_status IS NULL
      OR ledger_status IN ('unposted','posted','reversed'));

-- Both-null or both-non-null source pair
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_source_pair_ck
  CHECK (
    (source_type IS NULL AND source_reference IS NULL)
    OR
    (source_type IS NOT NULL AND source_reference IS NOT NULL)
  );

-- Unique (tenant_id, source_type, source_reference) where source_type IS NOT NULL
CREATE UNIQUE INDEX expenses_source_unique_idx
  ON public.expenses (tenant_id, source_type, source_reference)
  WHERE source_type IS NOT NULL;

-- Unique non-null reverses_expense_id
CREATE UNIQUE INDEX expenses_reverses_unique_idx
  ON public.expenses (reverses_expense_id)
  WHERE reverses_expense_id IS NOT NULL;

-- One-ledger-row-per-expense enforcement (partial unique on ledger_entries)
CREATE UNIQUE INDEX ledger_entries_expense_unique_idx
  ON public.ledger_entries (reference_id)
  WHERE reference_type = 'expense';

-- ---------------------------------------------------------------------
-- 5. finance_request_idempotency (approved shape)
-- ---------------------------------------------------------------------
CREATE TABLE public.finance_request_idempotency (
  tenant_id         uuid NOT NULL
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation         text NOT NULL,
  idempotency_key   uuid NOT NULL,
  actor_id          uuid NOT NULL,
  request_hash      bytea NOT NULL,
  resolved_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response          jsonb NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  PRIMARY KEY (tenant_id, operation, idempotency_key)
);

COMMENT ON TABLE public.finance_request_idempotency IS
  'AML.1.b.1 Stage 3 (corrected): once-only fingerprints for atomic finance RPCs. Composite PK (tenant_id, operation, idempotency_key). service_role only. RLS enabled but not forced. PUBLIC/anon/authenticated have zero access.';

CREATE INDEX finance_request_idempotency_expires_idx
  ON public.finance_request_idempotency (expires_at);

REVOKE ALL ON public.finance_request_idempotency FROM PUBLIC;
REVOKE ALL ON public.finance_request_idempotency FROM anon;
REVOKE ALL ON public.finance_request_idempotency FROM authenticated;
GRANT  ALL ON public.finance_request_idempotency TO service_role;

ALTER TABLE public.finance_request_idempotency ENABLE ROW LEVEL SECURITY;
-- Intentionally NOT forced. No permissive policies.

-- ---------------------------------------------------------------------
-- 6. pos_sales (approved shape)
-- ---------------------------------------------------------------------
CREATE TABLE public.pos_sales (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id),
  session_id   uuid NOT NULL REFERENCES public.pos_sessions(id),
  sale_number  integer NOT NULL,
  cart_hash    text NOT NULL,
  subtotal     numeric(12,2) NOT NULL,
  tax_amount   numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  currency     text NOT NULL,
  invoice_id   uuid NULL REFERENCES public.invoices(id),
  created_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pos_sales_session_sale_unique UNIQUE (tenant_id, session_id, sale_number)
);

COMMENT ON TABLE public.pos_sales IS
  'AML.1.b.1 Stage 3 (corrected): POS sale headers. cart_hash is audit-only and intentionally NOT unique. service_role only. RLS enabled but not forced. No authenticated/anon DML or SELECT until an existing reader mechanically requires it.';

REVOKE ALL ON public.pos_sales FROM PUBLIC;
REVOKE ALL ON public.pos_sales FROM anon;
REVOKE ALL ON public.pos_sales FROM authenticated;
GRANT  ALL ON public.pos_sales TO service_role;

ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
-- Intentionally NOT forced. No permissive policies.

-- ---------------------------------------------------------------------
-- 7. Post-apply verification
-- ---------------------------------------------------------------------
DO $post$
DECLARE
  v_inv_rows int; v_inv_sum numeric;
  v_it_rows int;  v_it_sum numeric;
  v_le_rows int;  v_le_sum numeric; v_le_bal numeric;
  v_cb_sum numeric;
  v_ex_rows int;  v_ex_sum numeric;
BEGIN
  -- Presence of every approved object
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_entries' AND column_name='effective_date') THEN
    RAISE EXCEPTION 'STAGE3B-POST: effective_date missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ledger_entries_effective_composite_idx') THEN
    RAISE EXCEPTION 'STAGE3B-POST: composite index missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ledger_entries_cancellation_unique_idx') THEN
    RAISE EXCEPTION 'STAGE3B-POST: cancellation unique index missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='corrects_invoice_id') THEN
    RAISE EXCEPTION 'STAGE3B-POST: corrects_invoice_id missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoice_items_period_valid_ck' AND NOT convalidated) THEN
    RAISE EXCEPTION 'STAGE3B-POST: invoice_items_period_valid_ck missing or unexpectedly validated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='finance_request_idempotency' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'STAGE3B-POST: finance_request_idempotency missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='pos_sales' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'STAGE3B-POST: pos_sales missing';
  END IF;
  -- Composite PK on finance_request_idempotency
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid
    WHERE t.relname='finance_request_idempotency'
      AND c.contype='p'
      AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text)
           FROM pg_attribute a
           WHERE a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey))
          = ARRAY['idempotency_key','operation','tenant_id']::text[]
  ) THEN
    RAISE EXCEPTION 'STAGE3B-POST: finance_request_idempotency PK shape drift';
  END IF;
  -- Pre-existing baseline preserved
  SELECT count(*), sum(total_amount) INTO v_inv_rows, v_inv_sum FROM public.invoices;
  SELECT count(*), sum(total_price)  INTO v_it_rows,  v_it_sum  FROM public.invoice_items;
  SELECT count(*), sum(amount), sum(balance_after) INTO v_le_rows, v_le_sum, v_le_bal FROM public.ledger_entries;
  SELECT sum(balance) INTO v_cb_sum FROM public.customer_balances;
  SELECT count(*), sum(amount) INTO v_ex_rows, v_ex_sum FROM public.expenses;

  IF v_inv_rows = 0
     AND v_it_rows = 0
     AND v_le_rows = 0
     AND v_ex_rows = 0
     AND NOT EXISTS (SELECT 1 FROM public.customer_balances)
  THEN
    RAISE NOTICE
      'STAGE3B-POST: skipping live-data fingerprints on a clean migration rebuild';
  ELSE
    IF v_inv_rows <> 42 OR v_inv_sum <> 264280.45 THEN RAISE EXCEPTION 'STAGE3B-POST: invoices fingerprint drift'; END IF;
    IF v_it_rows  <> 99 OR v_it_sum  <> 187372.47 THEN RAISE EXCEPTION 'STAGE3B-POST: invoice_items fingerprint drift'; END IF;
    IF v_le_rows  <> 64 OR v_le_sum  <> 132726.85 OR v_le_bal <> 970229.63 THEN RAISE EXCEPTION 'STAGE3B-POST: ledger_entries fingerprint drift'; END IF;
    IF v_cb_sum   <> 132726.85 THEN RAISE EXCEPTION 'STAGE3B-POST: customer_balances balance drift'; END IF;
    IF v_ex_rows  <> 3  OR v_ex_sum  <> 240.00     THEN RAISE EXCEPTION 'STAGE3B-POST: expenses fingerprint drift'; END IF;
  END IF;

  -- Stage 4 must not have begun
  IF EXISTS (SELECT 1 FROM public.permission_definitions WHERE key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create')) THEN
    RAISE EXCEPTION 'STAGE3B-POST: Stage 4 permission keys unexpectedly present';
  END IF;
END
$post$;
