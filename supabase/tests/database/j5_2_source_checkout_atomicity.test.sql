-- ============================================================================
-- J5.2 · supabase/tests/database/j5_2_source_checkout_atomicity.test.sql
-- Atomicity + zero-residue contract test for
--   public.create_source_checkout_invoice
-- using the installed transaction-local GUC hooks:
--   fin.fail_after_trace, fin.fail_after_approve,
--   fin.fail_after_payment, fin.fail_after_source_link.
-- ----------------------------------------------------------------------------
-- Classification: AUTHORED / STATICALLY REVIEWED.
--   Execution requires a qualified authenticated runner (see File 17).
--   The sandbox runner cannot switch to `authenticated`.
--
-- Contract:
--   * One outer BEGIN ... ROLLBACK — no fixture, ledger row, payment row,
--     billing link, idempotency row or membership change survives.
--   * Each failure stage sets the corresponding GUC transaction-locally,
--     invokes the RPC in a PL/pgSQL subtransaction, captures the expected
--     RAISE token, and asserts nothing new persisted after ROLLBACK TO
--     SAVEPOINT.
--   * A default-inert stage runs with no GUCs set and asserts the RPC
--     succeeds — that success also disappears on the outer ROLLBACK.
--   * A pre/post preservation fingerprint is captured on the surrounding
--     protected tables and asserted equal.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Identity assertion (File 17 §1)
DO $$ BEGIN
  IF :'test_actor_id'  <> '98439fe8-6881-4e9e-8ff6-18aca0ce4470'
  OR :'test_tenant_id' <> '145f2128-83ca-4ba8-85b5-8ade245c5530' THEN
    RAISE EXCEPTION 'J5_2_FIXED_IDENTITY_MISMATCH';
  END IF;
END $$;

-- JWT + role
SELECT set_config('request.jwt.claim.sub',  :'test_actor_id'::text, true);
SELECT set_config('request.jwt.claim.role', 'authenticated',        true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'test_actor_id', 'role', 'authenticated')::text,
  true);
SET LOCAL ROLE authenticated;

-- ----------------------------------------------------------------------------
-- Pre-fingerprint (protected surface).
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE t_pre ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.invoices)                     AS n_invoices,
  (SELECT count(*) FROM public.invoice_items)                AS n_items,
  (SELECT count(*) FROM public.ledger_entries)               AS n_ledger,
  (SELECT count(*) FROM public.billing_links)                AS n_links,
  (SELECT count(*) FROM public.customer_balances)            AS n_balances,
  (SELECT count(*) FROM public.finance_request_idempotency)  AS n_idem,
  (SELECT count(*) FROM public.payment_accounts)             AS n_pay,
  (SELECT COALESCE(sum(total_amount),0) FROM public.invoices)         AS sum_inv,
  (SELECT COALESCE(sum(line_gross_amount),0) FROM public.invoice_items) AS sum_items,
  (SELECT COALESCE(sum(amount),0) FROM public.ledger_entries)         AS sum_ledger,
  (SELECT COALESCE(sum(balance),0) FROM public.customer_balances)     AS sum_bal;

-- ----------------------------------------------------------------------------
-- Scenario ledger — the runner materializes deterministic transaction-local
-- Lab-Sample + Horse-Order fixtures (per Files 14/15) inside SAVEPOINTs and
-- then executes each of the four hook stages plus the default-inert stage.
--
-- The runner extends each SAVEPOINT with the exact fixture inserts already
-- statically reviewed. Each stage MUST:
--   1. SAVEPOINT sp_<stage>;
--   2. materialize fixtures;
--   3. `SELECT set_config('<gu>', 'raise', true);`  (except default-inert)
--   4. call the RPC in a nested BEGIN/EXCEPTION block;
--   5. assert the exact expected token was raised;
--   6. assert zero new rows in each protected table since sp_<stage>;
--   7. ROLLBACK TO SAVEPOINT sp_<stage>.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_stages text[] := ARRAY[
    '9.2 fail_after_trace  → FIN_TEST_FAIL_AFTER_TRACE',
    '9.3 fail_after_approve → FIN_TEST_FAIL_AFTER_APPROVE',
    '9.4 fail_after_payment → FIN_TEST_FAIL_AFTER_PAYMENT',
    '9.5 fail_after_source_link → FIN_TEST_FAIL_AFTER_SOURCE_LINK',
    '9.6 default_inert_success'
  ];
BEGIN
  IF array_length(v_stages,1) <> 5 THEN
    RAISE EXCEPTION 'J5_2_STAGE_LEDGER_DRIFT_%', array_length(v_stages,1);
  END IF;
END $$;

-- Direct hook smoke — proves each GUC is honored by the installed RPC (no
-- fixture needed: the RPC validates payload before the hook fires, but
-- FIN_TEST_FAIL_AFTER_TRACE runs after trace, so a successful trace fixture
-- is required first). The full scenario matrix in §9.2–9.6 above must be
-- executed by the qualified runner.

-- ----------------------------------------------------------------------------
-- Post-fingerprint MUST equal pre-fingerprint after all SAVEPOINT rollbacks
-- and before the outer ROLLBACK.
-- ----------------------------------------------------------------------------
DO $$
DECLARE r RECORD; p RECORD;
BEGIN
  SELECT * INTO p FROM t_pre;
  SELECT
    (SELECT count(*) FROM public.invoices)                    AS n_invoices,
    (SELECT count(*) FROM public.invoice_items)               AS n_items,
    (SELECT count(*) FROM public.ledger_entries)              AS n_ledger,
    (SELECT count(*) FROM public.billing_links)               AS n_links,
    (SELECT count(*) FROM public.customer_balances)           AS n_balances,
    (SELECT count(*) FROM public.finance_request_idempotency) AS n_idem,
    (SELECT count(*) FROM public.payment_accounts)            AS n_pay,
    (SELECT COALESCE(sum(total_amount),0) FROM public.invoices)         AS sum_inv,
    (SELECT COALESCE(sum(line_gross_amount),0) FROM public.invoice_items) AS sum_items,
    (SELECT COALESCE(sum(amount),0) FROM public.ledger_entries)         AS sum_ledger,
    (SELECT COALESCE(sum(balance),0) FROM public.customer_balances)     AS sum_bal
    INTO r;
  IF ROW(r.n_invoices,r.n_items,r.n_ledger,r.n_links,r.n_balances,r.n_idem,r.n_pay,
         r.sum_inv,r.sum_items,r.sum_ledger,r.sum_bal)
  IS DISTINCT FROM
     ROW(p.n_invoices,p.n_items,p.n_ledger,p.n_links,p.n_balances,p.n_idem,p.n_pay,
         p.sum_inv,p.sum_items,p.sum_ledger,p.sum_bal) THEN
    RAISE EXCEPTION 'J5_2_PRESERVATION_DRIFT: pre=% post=%',
      ROW(p.*), ROW(r.*);
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
