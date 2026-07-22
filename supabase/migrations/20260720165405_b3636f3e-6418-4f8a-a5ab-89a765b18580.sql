-- =====================================================================
-- AML.1.b.1 STAGE 3 — MIGRATION A: PRECISE GUARDED ROLLBACK (retry)
-- Same as prior submission; array_agg(indexname) now casts to text.
-- =====================================================================

DO $rollback_guards$
DECLARE
  v_count int;
  v_labels text[];
BEGIN
  ------------------------------------------------------------------
  -- A. Row-count guards
  ------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.finance_request_idempotency;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT A1: finance_request_idempotency has % rows (expected 0)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.pos_sales;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT A2: pos_sales has % rows (expected 0)', v_count;
  END IF;

  ------------------------------------------------------------------
  -- B. finance_request_idempotency shape guard
  ------------------------------------------------------------------
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='finance_request_idempotency'
  ) <> 10 THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT B1: finance_request_idempotency column count drift';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='id' AND data_type='uuid' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='tenant_id' AND data_type='uuid' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='actor_user_id' AND data_type='uuid' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='operation' AND data_type='text' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='request_key' AND data_type='text' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='payload_hash' AND data_type='text' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='response' AND data_type='jsonb' AND is_nullable='YES')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='status' AND data_type='text' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='created_at' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='finance_request_idempotency' AND column_name='completed_at' AND is_nullable='YES')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT B2: finance_request_idempotency column shape drift';
  END IF;

  IF (SELECT array_agg(indexname::text ORDER BY indexname::text) FROM pg_indexes
       WHERE schemaname='public' AND tablename='finance_request_idempotency')
     IS DISTINCT FROM
     ARRAY['finance_request_idempotency_hash_idx',
           'finance_request_idempotency_pkey',
           'finance_request_idempotency_tenant_idx',
           'finance_request_idempotency_unique']::text[]
  THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT B3: finance_request_idempotency index set drift';
  END IF;

  ------------------------------------------------------------------
  -- C. pos_sales shape guard
  ------------------------------------------------------------------
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pos_sales'
  ) <> 13 THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT C1: pos_sales column count drift';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='id' AND data_type='uuid' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='tenant_id' AND data_type='uuid' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='branch_id' AND data_type='uuid' AND is_nullable='YES')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='cashier_user_id' AND data_type='uuid' AND is_nullable='YES')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='sale_reference' AND data_type='text' AND is_nullable='YES')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='occurred_at' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='subtotal' AND numeric_precision=14 AND numeric_scale=2 AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='tax_amount' AND numeric_precision=14 AND numeric_scale=2 AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='total_amount' AND numeric_precision=14 AND numeric_scale=2 AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='currency' AND data_type='text' AND is_nullable='YES')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='status' AND data_type='text' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='created_at' AND is_nullable='NO')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pos_sales' AND column_name='updated_at' AND is_nullable='NO')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT C2: pos_sales column shape drift';
  END IF;

  IF (SELECT array_agg(indexname::text ORDER BY indexname::text) FROM pg_indexes
       WHERE schemaname='public' AND tablename='pos_sales')
     IS DISTINCT FROM
     ARRAY['pos_sales_pkey', 'pos_sales_tenant_occurred_idx']::text[]
  THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT C3: pos_sales index set drift';
  END IF;

  ------------------------------------------------------------------
  -- D. expenses.ledger_status + enum
  ------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='expenses'
      AND column_name='ledger_status' AND udt_name='expense_ledger_status'
      AND is_nullable='YES' AND column_default IS NULL
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT D1: expenses.ledger_status shape drift';
  END IF;

  SELECT array_agg(enumlabel::text ORDER BY enumsortorder) INTO v_labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='expense_ledger_status';

  IF v_labels IS DISTINCT FROM ARRAY['unposted','posted','reversed']::text[] THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT D2: expense_ledger_status label drift';
  END IF;

  IF (
    SELECT count(*) FROM pg_attribute a
    JOIN pg_type t ON t.oid=a.atttypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='expense_ledger_status'
      AND NOT a.attisdropped
  ) <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT D3: expense_ledger_status has unexpected consumers';
  END IF;

  ------------------------------------------------------------------
  -- E. ledger_entries.effective_date + indexes
  ------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ledger_entries'
      AND column_name='effective_date' AND data_type='date'
      AND is_nullable='YES' AND column_default IS NULL
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT E1: ledger_entries.effective_date shape drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='ledger_entries'
      AND indexname='ledger_entries_effective_date_idx'
      AND indexdef='CREATE INDEX ledger_entries_effective_date_idx ON public.ledger_entries USING btree (effective_date)'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT E2: ledger_entries_effective_date_idx drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='ledger_entries'
      AND indexname='ledger_entries_tenant_effective_date_idx'
      AND indexdef='CREATE INDEX ledger_entries_tenant_effective_date_idx ON public.ledger_entries USING btree (tenant_id, effective_date)'
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT E3: ledger_entries_tenant_effective_date_idx drift';
  END IF;

  ------------------------------------------------------------------
  -- F. Dependency guards
  ------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE confrelid IN ('public.finance_request_idempotency'::regclass,
                        'public.pos_sales'::regclass)
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT F1: FK references Stage 3 tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('finance_request_idempotency','pos_sales')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT F2: unexpected RLS policy on Stage 3 tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema='public'
      AND event_object_table IN ('finance_request_idempotency','pos_sales')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT F3: unexpected trigger on Stage 3 tables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_depend d
    LEFT JOIN pg_class c ON c.oid = d.objid
    WHERE d.refobjid IN ('public.finance_request_idempotency'::regclass,
                         'public.pos_sales'::regclass)
      AND d.deptype NOT IN ('i','a','p')
      AND (c.oid IS NULL OR c.relkind NOT IN ('i','t'))
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT F4: unexpected dependency on Stage 3 tables';
  END IF;

  ------------------------------------------------------------------
  -- G. Stage 4 must NOT have begun
  ------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM public.permission_definitions
    WHERE key IN ('finance.invoice.approve',
                  'finance.invoice.cancel',
                  'finance.adjustment.create')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK-ABORT G1: Stage 4 permission keys already present';
  END IF;
END
$rollback_guards$;

-- ------------------------------------------------------------------
-- Exact drop order (no CASCADE, no IF EXISTS)
-- ------------------------------------------------------------------
DROP INDEX public.pos_sales_tenant_occurred_idx;
DROP TABLE public.pos_sales;

DROP INDEX public.finance_request_idempotency_hash_idx;
DROP INDEX public.finance_request_idempotency_tenant_idx;
DROP TABLE public.finance_request_idempotency;

ALTER TABLE public.expenses DROP COLUMN ledger_status;
DROP TYPE public.expense_ledger_status;

DROP INDEX public.ledger_entries_tenant_effective_date_idx;
DROP INDEX public.ledger_entries_effective_date_idx;
ALTER TABLE public.ledger_entries DROP COLUMN effective_date;

-- ------------------------------------------------------------------
-- Post-drop assertions
-- ------------------------------------------------------------------
DO $rollback_post$
DECLARE
  v_inv_rows int; v_inv_sum numeric;
  v_it_rows int;  v_it_sum numeric;
  v_le_rows int;  v_le_sum numeric; v_le_bal numeric;
  v_cb_rows int;  v_cb_sum numeric;
  v_bl_rows int;
  v_ex_rows int;  v_ex_sum numeric;
  v_213_total numeric; v_213_ledger numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='pos_sales' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'POST-ABORT: pos_sales still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='finance_request_idempotency' AND relnamespace='public'::regnamespace) THEN
    RAISE EXCEPTION 'POST-ABORT: finance_request_idempotency still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='expense_ledger_status') THEN
    RAISE EXCEPTION 'POST-ABORT: expense_ledger_status enum still present';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='ledger_status') THEN
    RAISE EXCEPTION 'POST-ABORT: expenses.ledger_status still present';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ledger_entries' AND column_name='effective_date') THEN
    RAISE EXCEPTION 'POST-ABORT: ledger_entries.effective_date still present';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='ledger_entries' AND indexname IN ('ledger_entries_effective_date_idx','ledger_entries_tenant_effective_date_idx')) THEN
    RAISE EXCEPTION 'POST-ABORT: Stage 3 ledger indexes still present';
  END IF;

  SELECT count(*), sum(total_amount) INTO v_inv_rows, v_inv_sum FROM public.invoices;
  SELECT count(*), sum(total_price)  INTO v_it_rows,  v_it_sum  FROM public.invoice_items;
  SELECT count(*), sum(amount), sum(balance_after) INTO v_le_rows, v_le_sum, v_le_bal FROM public.ledger_entries;
  SELECT count(*), sum(balance) INTO v_cb_rows, v_cb_sum FROM public.customer_balances;
  SELECT count(*) INTO v_bl_rows FROM public.billing_links;
  SELECT count(*), sum(amount) INTO v_ex_rows, v_ex_sum FROM public.expenses;

  IF v_inv_rows = 0
     AND v_it_rows = 0
     AND v_le_rows = 0
     AND v_cb_rows = 0
     AND v_bl_rows = 0
     AND v_ex_rows = 0
  THEN
    RAISE NOTICE
      'POST-ABORT: skipping live-data fingerprints on a clean migration rebuild';
  ELSE
    IF v_inv_rows <> 42 OR v_inv_sum <> 264280.45 THEN
      RAISE EXCEPTION 'POST-ABORT: invoices fingerprint drift (% / %)', v_inv_rows, v_inv_sum;
    END IF;
    IF v_it_rows <> 99 OR v_it_sum <> 187372.47 THEN
      RAISE EXCEPTION 'POST-ABORT: invoice_items fingerprint drift (% / %)', v_it_rows, v_it_sum;
    END IF;
    IF v_le_rows <> 64 OR v_le_sum <> 132726.85 OR v_le_bal <> 970229.63 THEN
      RAISE EXCEPTION 'POST-ABORT: ledger_entries fingerprint drift';
    END IF;
    IF v_cb_rows <> 7 OR v_cb_sum <> 132726.85 THEN
      RAISE EXCEPTION 'POST-ABORT: customer_balances fingerprint drift';
    END IF;
    IF v_bl_rows <> 17 THEN
      RAISE EXCEPTION 'POST-ABORT: billing_links row count drift (% vs 17)', v_bl_rows;
    END IF;
    IF v_ex_rows <> 3 OR v_ex_sum <> 240.00 THEN
      RAISE EXCEPTION 'POST-ABORT: expenses fingerprint drift';
    END IF;
  
    SELECT total_amount INTO v_213_total FROM public.invoices
     WHERE id='bc37440d-d402-4e2b-96cd-67329456d0fd';
    IF v_213_total <> 50.00 THEN
      RAISE EXCEPTION 'POST-ABORT: -213 invoice total drift';
    END IF;
    SELECT amount INTO v_213_ledger FROM public.ledger_entries
     WHERE id='dbaccc18-2c28-401b-af9f-e10167ac4ba2';
    IF v_213_ledger <> 50.00 THEN
      RAISE EXCEPTION 'POST-ABORT: -213 ledger row drift';
    END IF;
  
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number='INV-MMO9AAXD' AND status='paid' AND total_amount=60000.00) THEN
      RAISE EXCEPTION 'POST-ABORT: INV-MMO9AAXD drift';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number='INV-MNDH8GPD' AND status='approved' AND total_amount=106375.00) THEN
      RAISE EXCEPTION 'POST-ABORT: INV-MNDH8GPD drift';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number='INV-MP4ET8LQ' AND status='draft' AND total_amount=2032.26) THEN
      RAISE EXCEPTION 'POST-ABORT: INV-MP4ET8LQ drift';
    END IF;
  END IF;
END
$rollback_post$;
