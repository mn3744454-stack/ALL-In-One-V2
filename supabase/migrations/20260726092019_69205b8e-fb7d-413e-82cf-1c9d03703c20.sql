
-- =========================================================================
-- PHASE N+2 SLICE 1 — PAYMENT SESSION FOUNDATION
-- One transaction. Preflight -> locked one-row repair -> schema -> backfill
-- -> FK validation -> integrity checks. Any failure rolls back the whole set.
-- =========================================================================

DO $mig$
DECLARE
  v_blocking_id       CONSTANT uuid := '43cdf7bf-0abd-46ed-a42d-b28918cf70dd';
  v_blocking_tenant   CONSTANT uuid := '348ce41c-1102-4295-bf6a-2ea0203c1036';
  v_blocking_invoice  CONSTANT uuid := 'f05e39ed-8efc-48ca-830e-57748b4d37c5';
  v_blocking_amount   CONSTANT numeric := -580.00;
  v_row               ledger_entries%ROWTYPE;
  v_inv               invoices%ROWTYPE;
  v_effective         date;
  v_null_pay_after    bigint;
  v_nonpay_with_sess  bigint;
  v_before_ledger_sum numeric;
  v_before_ledger_cnt bigint;
  v_before_bal_sum    numeric;
  v_before_inv_sum    numeric;
  v_before_inv_cnt    bigint;
  v_before_balances   text;
  v_before_biling     bigint;
  v_after_check       record;
BEGIN
  ------------------------------------------------------------------
  -- (A) PREFLIGHT ASSERTIONS (repeat inside the transaction)
  ------------------------------------------------------------------
  SELECT COUNT(*) INTO v_nonpay_with_sess
    FROM ledger_entries
   WHERE entry_type <> 'payment' AND payment_session_id IS NOT NULL;
  IF v_nonpay_with_sess <> 0 THEN
    RAISE EXCEPTION 'Preflight failed: % non-payment ledger rows carry payment_session_id', v_nonpay_with_sess;
  END IF;

  -- cross-tenant / cross-client / multi-currency session groups
  IF EXISTS (
    SELECT 1 FROM ledger_entries
     WHERE entry_type='payment' AND payment_session_id IS NOT NULL
     GROUP BY payment_session_id
    HAVING COUNT(DISTINCT tenant_id) > 1
  ) THEN RAISE EXCEPTION 'Preflight failed: cross-tenant payment session group'; END IF;

  IF EXISTS (
    SELECT 1 FROM ledger_entries le
      JOIN invoices i ON i.id = le.reference_id
     WHERE le.entry_type='payment' AND le.payment_session_id IS NOT NULL
     GROUP BY le.payment_session_id
    HAVING COUNT(DISTINCT i.client_id) > 1
  ) THEN RAISE EXCEPTION 'Preflight failed: cross-client payment session group'; END IF;

  IF EXISTS (
    SELECT 1 FROM ledger_entries le
      JOIN invoices i ON i.id = le.reference_id
     WHERE le.entry_type='payment' AND le.payment_session_id IS NOT NULL
     GROUP BY le.payment_session_id
    HAVING COUNT(DISTINCT i.currency) > 1
  ) THEN RAISE EXCEPTION 'Preflight failed: multi-currency payment session group'; END IF;

  -- deterministic tenant payment account for every payment tenant
  IF EXISTS (
    SELECT 1 FROM ledger_entries le
     WHERE le.entry_type='payment'
       AND NOT EXISTS (
         SELECT 1 FROM payment_accounts pa
          WHERE pa.tenant_id = le.tenant_id AND pa.owner_type='tenant' AND pa.is_active)
  ) THEN RAISE EXCEPTION 'Preflight failed: tenant without active payment account'; END IF;

  IF EXISTS (
    SELECT tenant_id FROM payment_accounts WHERE owner_type='tenant' AND is_active
     GROUP BY tenant_id HAVING COUNT(*) > 1
  ) THEN RAISE EXCEPTION 'Preflight failed: multiple active tenant payment accounts'; END IF;

  -- every payment row references an existing invoice
  IF EXISTS (
    SELECT 1 FROM ledger_entries le
     WHERE le.entry_type='payment'
       AND (le.reference_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = le.reference_id))
  ) THEN RAISE EXCEPTION 'Preflight failed: payment without existing invoice'; END IF;

  ------------------------------------------------------------------
  -- (B) LOCKED BLOCKING-ROW PRECONDITIONS
  ------------------------------------------------------------------
  SELECT * INTO v_row FROM ledger_entries WHERE id = v_blocking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Blocking row not found'; END IF;
  IF v_row.entry_type <> 'payment' THEN RAISE EXCEPTION 'Blocking row entry_type=%', v_row.entry_type; END IF;
  IF v_row.reference_type <> 'invoice' THEN RAISE EXCEPTION 'Blocking row reference_type=%', v_row.reference_type; END IF;
  IF v_row.reference_id <> v_blocking_invoice THEN RAISE EXCEPTION 'Blocking row reference_id drift'; END IF;
  IF v_row.tenant_id <> v_blocking_tenant THEN RAISE EXCEPTION 'Blocking row tenant drift'; END IF;
  IF v_row.amount <> v_blocking_amount THEN RAISE EXCEPTION 'Blocking row amount drift (%)', v_row.amount; END IF;
  IF v_row.description IS NULL
     OR position('Phase 6 Reconciliation: Backfilled missing payment for paid invoice INV-LAB-ML1AV2RK-3Q1U'
                 IN v_row.description) = 0
  THEN RAISE EXCEPTION 'Blocking row description drift'; END IF;
  IF v_row.payment_session_id IS NOT NULL THEN RAISE EXCEPTION 'Blocking row already has session'; END IF;
  IF v_row.payment_method IS NOT NULL THEN RAISE EXCEPTION 'Blocking row already has method'; END IF;
  IF v_row.effective_date IS NOT NULL THEN RAISE EXCEPTION 'Blocking row already has effective_date'; END IF;

  SELECT * INTO v_inv FROM invoices WHERE id = v_blocking_invoice;
  IF NOT FOUND THEN RAISE EXCEPTION 'Blocking invoice missing'; END IF;
  IF v_inv.tenant_id <> v_blocking_tenant THEN RAISE EXCEPTION 'Blocking invoice tenant drift'; END IF;
  IF v_inv.client_id IS NULL THEN RAISE EXCEPTION 'Blocking invoice has no client'; END IF;

  -- Session id collision protection
  IF EXISTS (SELECT 1 FROM ledger_entries
              WHERE payment_session_id = v_blocking_id AND id <> v_blocking_id) THEN
    RAISE EXCEPTION 'Blocking id already in use as another row session id';
  END IF;

  v_effective := (v_row.created_at AT TIME ZONE 'UTC')::date; -- fallback #4 per precedence

  ------------------------------------------------------------------
  -- (C) BASELINE CHECKSUMS
  ------------------------------------------------------------------
  SELECT COUNT(*), COALESCE(SUM(amount),0), COALESCE(SUM(balance_after),0)
    INTO v_before_ledger_cnt, v_before_ledger_sum, v_before_bal_sum
    FROM ledger_entries;
  SELECT COUNT(*), COALESCE(SUM(total_amount),0) INTO v_before_inv_cnt, v_before_inv_sum FROM invoices;
  SELECT md5(string_agg(client_id::text || ':' || balance::text, '|' ORDER BY client_id))
    INTO v_before_balances FROM customer_balances;
  SELECT COUNT(*) INTO v_before_biling FROM billing_links;

  ------------------------------------------------------------------
  -- (D) LOCKED ONE-ROW REPAIR
  ------------------------------------------------------------------
  UPDATE ledger_entries
     SET payment_session_id = v_blocking_id,
         payment_method     = 'reconciliation',
         effective_date     = v_effective
   WHERE id = v_blocking_id
     AND payment_session_id IS NULL
     AND payment_method IS NULL
     AND effective_date IS NULL
     AND amount = v_blocking_amount
     AND tenant_id = v_blocking_tenant
     AND reference_id = v_blocking_invoice;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair failed: concurrent drift on blocking row'; END IF;

  SELECT COUNT(*) INTO v_null_pay_after
    FROM ledger_entries WHERE entry_type='payment' AND payment_session_id IS NULL;
  IF v_null_pay_after <> 0 THEN
    RAISE EXCEPTION 'Post-repair invariant failed: % payment rows still lack session id', v_null_pay_after;
  END IF;
END $mig$;

-- =========================================================================
-- (E) NEW TABLES
-- =========================================================================

CREATE TABLE public.payment_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES public.clients(id),
  payment_account_id uuid NOT NULL REFERENCES public.payment_accounts(id),
  total_amount       numeric(14,2) NOT NULL CHECK (total_amount > 0),
  currency           text NOT NULL,
  payment_date       date NOT NULL,
  reference_note     text,
  status             text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','voided')),
  created_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_payment_sessions_tenant_client_date
  ON public.payment_sessions (tenant_id, client_id, payment_date DESC);
CREATE INDEX idx_payment_sessions_tenant_status
  ON public.payment_sessions (tenant_id, status);
CREATE INDEX idx_payment_sessions_account
  ON public.payment_sessions (payment_account_id);
CREATE TRIGGER trg_payment_sessions_updated_at
  BEFORE UPDATE ON public.payment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_allocations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES public.payment_sessions(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id          uuid NOT NULL REFERENCES public.invoices(id),
  ledger_entry_id     uuid REFERENCES public.ledger_entries(id),
  payment_method      text NOT NULL,
  amount              numeric(14,2) NOT NULL CHECK (amount > 0),
  client_level_amount numeric(14,2) NOT NULL DEFAULT 0
                       CHECK (client_level_amount >= 0),
  detail_status       text NOT NULL DEFAULT 'resolved'
                       CHECK (detail_status IN ('resolved','historical_unresolved')),
  external_reference  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_allocations_client_level_le_amount
    CHECK (client_level_amount <= amount),
  CONSTRAINT payment_allocations_composite_key
    UNIQUE (id, session_id, tenant_id, invoice_id),
  CONSTRAINT payment_allocations_ledger_entry_unique
    UNIQUE (ledger_entry_id)
);
CREATE INDEX idx_payment_allocations_session ON public.payment_allocations (session_id);
CREATE INDEX idx_payment_allocations_invoice ON public.payment_allocations (tenant_id, invoice_id);

CREATE TABLE public.payment_horse_allocations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL,
  session_id    uuid NOT NULL,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id    uuid NOT NULL REFERENCES public.invoices(id),
  horse_id      uuid NOT NULL REFERENCES public.horses(id),
  amount        numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_horse_allocations_composite_fk
    FOREIGN KEY (allocation_id, session_id, tenant_id, invoice_id)
    REFERENCES public.payment_allocations (id, session_id, tenant_id, invoice_id)
    ON DELETE CASCADE,
  CONSTRAINT payment_horse_allocations_unique_horse
    UNIQUE (allocation_id, horse_id)
);
CREATE INDEX idx_payment_horse_allocations_session ON public.payment_horse_allocations (session_id);
CREATE INDEX idx_payment_horse_allocations_horse ON public.payment_horse_allocations (tenant_id, horse_id);

-- =========================================================================
-- (F) GRANTS + RLS
-- =========================================================================

GRANT SELECT ON public.payment_sessions          TO authenticated;
GRANT SELECT ON public.payment_allocations       TO authenticated;
GRANT SELECT ON public.payment_horse_allocations TO authenticated;
GRANT ALL    ON public.payment_sessions          TO service_role;
GRANT ALL    ON public.payment_allocations       TO service_role;
GRANT ALL    ON public.payment_horse_allocations TO service_role;

ALTER TABLE public.payment_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_horse_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members with finance.payment.view can read sessions"
  ON public.payment_sessions FOR SELECT TO authenticated
  USING (is_active_tenant_member(auth.uid(), tenant_id)
         AND has_permission(auth.uid(), tenant_id, 'finance.payment.view'));

CREATE POLICY "Tenant members with finance.payment.view can read allocations"
  ON public.payment_allocations FOR SELECT TO authenticated
  USING (is_active_tenant_member(auth.uid(), tenant_id)
         AND has_permission(auth.uid(), tenant_id, 'finance.payment.view'));

CREATE POLICY "Tenant members with finance.payment.view can read horse allocations"
  ON public.payment_horse_allocations FOR SELECT TO authenticated
  USING (is_active_tenant_member(auth.uid(), tenant_id)
         AND has_permission(auth.uid(), tenant_id, 'finance.payment.view'));

-- =========================================================================
-- (G) HISTORICAL SESSION BACKFILL
-- =========================================================================

WITH grp AS (
  SELECT
    le.payment_session_id                                       AS session_id,
    le.tenant_id                                                AS tenant_id,
    i.client_id                                                 AS client_id,
    i.currency                                                  AS currency,
    SUM(ABS(le.amount))                                         AS total_amount,
    MIN(COALESCE(le.effective_date, le.created_at::date))       AS payment_date,
    COUNT(*)                                                    AS row_count,
    COUNT(DISTINCT le.payment_method)                           AS method_count,
    bool_or(le.id = '43cdf7bf-0abd-46ed-a42d-b28918cf70dd'::uuid) AS is_reconciliation,
    (array_agg(le.created_by) FILTER (WHERE le.created_by IS NOT NULL))[1] AS created_by
  FROM ledger_entries le
  JOIN invoices i ON i.id = le.reference_id
  WHERE le.entry_type = 'payment'
  GROUP BY le.payment_session_id, le.tenant_id, i.client_id, i.currency
),
pa AS (
  SELECT tenant_id, id AS account_id FROM payment_accounts
   WHERE owner_type='tenant' AND is_active
)
INSERT INTO public.payment_sessions
  (id, tenant_id, client_id, payment_account_id, total_amount, currency,
   payment_date, status, created_by, metadata)
SELECT
  g.session_id, g.tenant_id, g.client_id, pa.account_id,
  g.total_amount, g.currency, g.payment_date, 'posted', g.created_by,
  jsonb_strip_nulls(jsonb_build_object(
    'historical_backfill_origin', 'phase3_slice1',
    'source_ledger_row_count',    g.row_count,
    'method_count',               g.method_count,
    'contains_reconciliation_exception', g.is_reconciliation,
    'effective_date_source',
       CASE WHEN g.is_reconciliation THEN 'ledger_created_at' ELSE NULL END,
    'synthetic_session_id_source',
       CASE WHEN g.is_reconciliation THEN 'ledger_entry_id' ELSE NULL END,
    'source_ledger_entry_id',
       CASE WHEN g.is_reconciliation
            THEN '43cdf7bf-0abd-46ed-a42d-b28918cf70dd' ELSE NULL END,
    'method_classification',
       CASE WHEN g.is_reconciliation THEN 'historical_reconciliation' ELSE NULL END
  ))
FROM grp g
JOIN pa ON pa.tenant_id = g.tenant_id;

-- =========================================================================
-- (H) HISTORICAL ALLOCATION BACKFILL (one per ledger payment row)
-- =========================================================================

INSERT INTO public.payment_allocations
  (session_id, tenant_id, invoice_id, ledger_entry_id, payment_method,
   amount, client_level_amount, detail_status, external_reference)
SELECT
  le.payment_session_id, le.tenant_id, le.reference_id, le.id,
  le.payment_method, ABS(le.amount),
  0, 'resolved',
  NULLIF(le.metadata->>'external_reference','')
FROM ledger_entries le
WHERE le.entry_type='payment';

-- =========================================================================
-- (I) HORSE / CLIENT-LEVEL CLASSIFICATION
-- =========================================================================

-- Per invoice, count contributing item horse rows.
WITH inv_class AS (
  SELECT
    ii.invoice_id,
    COUNT(*) FILTER (WHERE ii.horse_id IS NOT NULL)                        AS horse_rows,
    COUNT(*) FILTER (WHERE ii.horse_id IS NULL)                            AS clientlevel_rows,
    COUNT(DISTINCT ii.horse_id) FILTER (WHERE ii.horse_id IS NOT NULL)     AS distinct_horses,
    (array_agg(DISTINCT ii.horse_id) FILTER (WHERE ii.horse_id IS NOT NULL))[1] AS only_horse_id
  FROM invoice_items ii
  GROUP BY ii.invoice_id
)
UPDATE public.payment_allocations pa
   SET client_level_amount = pa.amount,
       detail_status       = 'resolved'
  FROM inv_class ic
 WHERE ic.invoice_id = pa.invoice_id
   AND ic.horse_rows = 0
   AND ic.clientlevel_rows > 0;

WITH inv_class AS (
  SELECT
    ii.invoice_id,
    COUNT(*) FILTER (WHERE ii.horse_id IS NOT NULL)                    AS horse_rows,
    COUNT(*) FILTER (WHERE ii.horse_id IS NULL)                        AS clientlevel_rows,
    COUNT(DISTINCT ii.horse_id) FILTER (WHERE ii.horse_id IS NOT NULL) AS distinct_horses
  FROM invoice_items ii
  GROUP BY ii.invoice_id
)
UPDATE public.payment_allocations pa
   SET detail_status = 'historical_unresolved',
       client_level_amount = 0
  FROM inv_class ic
 WHERE ic.invoice_id = pa.invoice_id
   AND ( (ic.horse_rows > 0 AND ic.clientlevel_rows > 0)
      OR (ic.distinct_horses > 1) );

-- Single-horse invoices → create one horse allocation for full amount
INSERT INTO public.payment_horse_allocations
  (allocation_id, session_id, tenant_id, invoice_id, horse_id, amount)
SELECT pa.id, pa.session_id, pa.tenant_id, pa.invoice_id, ic.only_horse_id, pa.amount
FROM public.payment_allocations pa
JOIN (
  SELECT ii.invoice_id,
         COUNT(*) FILTER (WHERE ii.horse_id IS NOT NULL)                    AS horse_rows,
         COUNT(*) FILTER (WHERE ii.horse_id IS NULL)                        AS clientlevel_rows,
         COUNT(DISTINCT ii.horse_id) FILTER (WHERE ii.horse_id IS NOT NULL) AS distinct_horses,
         (array_agg(DISTINCT ii.horse_id) FILTER (WHERE ii.horse_id IS NOT NULL))[1] AS only_horse_id
    FROM invoice_items ii GROUP BY ii.invoice_id
) ic ON ic.invoice_id = pa.invoice_id
WHERE ic.horse_rows > 0
  AND ic.clientlevel_rows = 0
  AND ic.distinct_horses = 1;

-- =========================================================================
-- (J) LEDGER FK — NOT VALID then VALIDATE
-- =========================================================================

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_payment_session_id_fkey
  FOREIGN KEY (payment_session_id) REFERENCES public.payment_sessions(id)
  NOT VALID;
ALTER TABLE public.ledger_entries
  VALIDATE CONSTRAINT ledger_entries_payment_session_id_fkey;

-- =========================================================================
-- (K) POST-MIGRATION INTEGRITY ASSERTIONS
-- =========================================================================

DO $verify$
DECLARE
  v_ledger_cnt bigint; v_ledger_sum numeric; v_bal_sum numeric;
  v_inv_cnt bigint;    v_inv_sum numeric;
  v_alloc_cnt bigint;  v_alloc_sum numeric;
  v_pay_cnt bigint;    v_pay_sum numeric;
  v_sess_cnt bigint;   v_distinct_sess bigint;
  v_bad bigint;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount),0), COALESCE(SUM(balance_after),0)
    INTO v_ledger_cnt, v_ledger_sum, v_bal_sum FROM ledger_entries;
  SELECT COUNT(*), COALESCE(SUM(total_amount),0) INTO v_inv_cnt, v_inv_sum FROM invoices;
  SELECT COUNT(*), COALESCE(SUM(amount),0) INTO v_alloc_cnt, v_alloc_sum FROM payment_allocations;
  SELECT COUNT(*), COALESCE(SUM(ABS(amount)),0)
    INTO v_pay_cnt, v_pay_sum FROM ledger_entries WHERE entry_type='payment';
  SELECT COUNT(*) INTO v_sess_cnt FROM payment_sessions;
  SELECT COUNT(DISTINCT payment_session_id) INTO v_distinct_sess
    FROM ledger_entries WHERE entry_type='payment';

  IF v_alloc_cnt <> v_pay_cnt THEN
    RAISE EXCEPTION 'Verify: allocation count % <> payment rows %', v_alloc_cnt, v_pay_cnt;
  END IF;
  IF v_alloc_sum <> v_pay_sum THEN
    RAISE EXCEPTION 'Verify: allocation sum % <> payment sum %', v_alloc_sum, v_pay_sum;
  END IF;
  IF v_sess_cnt <> v_distinct_sess THEN
    RAISE EXCEPTION 'Verify: session count % <> distinct payment sessions %', v_sess_cnt, v_distinct_sess;
  END IF;

  -- Every payment ledger row → exactly one allocation
  SELECT COUNT(*) INTO v_bad
    FROM ledger_entries le
   WHERE le.entry_type='payment'
     AND (SELECT COUNT(*) FROM payment_allocations pa WHERE pa.ledger_entry_id = le.id) <> 1;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'Verify: % payment rows lack unique allocation', v_bad; END IF;

  -- Session totals match sum of its allocations
  SELECT COUNT(*) INTO v_bad FROM (
    SELECT s.id, s.total_amount, COALESCE(SUM(a.amount),0) AS asum
      FROM payment_sessions s
      LEFT JOIN payment_allocations a ON a.session_id = s.id
     GROUP BY s.id, s.total_amount
    HAVING s.total_amount <> COALESCE(SUM(a.amount),0)
  ) x;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'Verify: % session totals mismatch allocations', v_bad; END IF;

  -- No non-payment ledger rows carry a session
  SELECT COUNT(*) INTO v_bad FROM ledger_entries
    WHERE entry_type <> 'payment' AND payment_session_id IS NOT NULL;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'Verify: non-payment rows carry session'; END IF;

  RAISE NOTICE 'Verify OK: ledger_cnt=% ledger_sum=% balance_sum=% invoices=% inv_sum=% sessions=% allocations=% alloc_sum=%',
    v_ledger_cnt, v_ledger_sum, v_bal_sum, v_inv_cnt, v_inv_sum, v_sess_cnt, v_alloc_cnt, v_alloc_sum;
END $verify$;
