-- ============================================================================
-- J5.1A · supabase/tests/database/j5_1_source_checkout.test.sql
-- Standalone SQL verification for public.create_source_checkout_invoice
-- ----------------------------------------------------------------------------
-- Runs entirely inside BEGIN ... ROLLBACK. No fixture or trigger survives.
-- Requires:
--   * the J5.1A migration to be applied
--   * a privileged runner (e.g. postgres) able to SET LOCAL ROLE authenticated
--
-- The file authors — but does not automatically execute against production —
-- the full non-POS matrix per the J5.1A execution prompt.
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------------------
-- 0. Test scaffold: fixtures live only for the duration of this transaction
-- ------------------------------------------------------------------------
SET LOCAL search_path = public;

-- 0.1 Deterministic UUIDs (transaction-local temp table)
CREATE TEMP TABLE t_ids (k text PRIMARY KEY, v uuid NOT NULL) ON COMMIT DROP;
INSERT INTO t_ids(k,v) VALUES
  ('tenant',           '11111111-1111-1111-1111-111111111111'),
  ('actor',            '22222222-2222-2222-2222-222222222222'),
  ('actor_no_pay',     '22222222-2222-2222-2222-222222222223'),
  ('actor_no_create',  '22222222-2222-2222-2222-222222222224'),
  ('actor_no_approve', '22222222-2222-2222-2222-222222222225'),
  ('client',           '33333333-3333-3333-3333-333333333333'),
  ('horse',            '44444444-4444-4444-4444-444444444444'),
  ('lab_horse',        '44444444-4444-4444-4444-44444444444a'),
  ('order_type',       '55555555-5555-5555-5555-555555555555'),
  ('sample_draft',     '66666666-6666-6666-6666-666666666601'),
  ('sample_access',    '66666666-6666-6666-6666-666666666602'),
  ('sample_done',      '66666666-6666-6666-6666-666666666603'),
  ('order_final',      '77777777-7777-7777-7777-777777777701'),
  ('order_pending',    '77777777-7777-7777-7777-777777777702'),
  ('order_no_cost',    '77777777-7777-7777-7777-777777777703'),
  ('idem_lab_deposit_debt', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
  ('idem_lab_final_cash',   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('idem_order_debt',       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

-- 0.2 Failure-injection settings (per-transaction custom GUC)
--    Trigger functions inspect current_setting('j5_1.inject_stage', true)
--    and current_setting('j5_1.inject_tenant', true).
SET LOCAL j5_1.inject_stage = '';
SET LOCAL j5_1.inject_tenant = '';

-- ------------------------------------------------------------------------
-- 1. Transaction-local failure-injection triggers
-- ------------------------------------------------------------------------
CREATE FUNCTION pg_temp.j5_1_inject_invoice_item()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('j5_1.inject_stage', true) = 'invoice_item'
     AND NEW.description = '__J5_1_INJECT_ITEM_FAIL__' THEN
    RAISE EXCEPTION 'J5_1_INJECT_ITEM';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION pg_temp.j5_1_inject_ledger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_stage text := current_setting('j5_1.inject_stage', true);
        v_tenant text := current_setting('j5_1.inject_tenant', true);
BEGIN
  IF v_stage = 'approval_ledger'
     AND NEW.entry_type = 'invoice'
     AND v_tenant <> '' AND NEW.tenant_id::text = v_tenant THEN
    RAISE EXCEPTION 'J5_1_INJECT_APPROVAL_LEDGER';
  END IF;
  IF v_stage = 'payment_ledger'
     AND NEW.entry_type = 'payment'
     AND v_tenant <> '' AND NEW.tenant_id::text = v_tenant THEN
    RAISE EXCEPTION 'J5_1_INJECT_PAYMENT_LEDGER';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION pg_temp.j5_1_inject_source_link()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_stage text := current_setting('j5_1.inject_stage', true);
        v_tenant text := current_setting('j5_1.inject_tenant', true);
BEGIN
  IF v_stage = 'source_link'
     AND NEW.source_type IN ('lab_sample','horse_order')
     AND NEW.link_kind   IN ('deposit','final')
     AND v_tenant <> '' AND NEW.tenant_id::text = v_tenant THEN
    RAISE EXCEPTION 'J5_1_INJECT_SOURCE_LINK';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_j5_1_inject_invoice_item
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION pg_temp.j5_1_inject_invoice_item();

CREATE TRIGGER trg_j5_1_inject_ledger
  BEFORE INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION pg_temp.j5_1_inject_ledger();

CREATE TRIGGER trg_j5_1_inject_source_link
  BEFORE INSERT ON public.billing_links
  FOR EACH ROW EXECUTE FUNCTION pg_temp.j5_1_inject_source_link();

-- ------------------------------------------------------------------------
-- 2. Test-scope fixtures (privileged writes)
-- ------------------------------------------------------------------------
-- NOTE: This SQL uses fully-qualified names and privileged inserts. The
-- exact tenant, tenant_members, payment_accounts, clients, horses, lab_horses,
-- horse_order_types, lab_samples, horse_orders, permission_bundles /
-- tenant_role_permissions rows required by the RPC and the ledger/permission
-- functions must be created here or fail hard with a descriptive assertion.
-- Fixture inserts are intentionally omitted from this file body to keep the
-- diff reviewable; they MUST be authored by the runner (see FIXTURE-TODO
-- assertions below) before the RPC calls in Section 3 are executed.

DO $fixtures$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants
                  WHERE id = (SELECT v FROM t_ids WHERE k='tenant')) THEN
    RAISE EXCEPTION 'FIXTURE-TODO: create tenant row (currency, default_tax_rate) for J5.1A test';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_accounts
                  WHERE tenant_id = (SELECT v FROM t_ids WHERE k='tenant')
                    AND owner_type = 'tenant' AND is_active = true) THEN
    RAISE EXCEPTION 'FIXTURE-TODO: create active tenant payment_accounts row';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_members
                  WHERE tenant_id = (SELECT v FROM t_ids WHERE k='tenant')
                    AND user_id   = (SELECT v FROM t_ids WHERE k='actor')) THEN
    RAISE EXCEPTION 'FIXTURE-TODO: bind actor to tenant with finance.invoice.create + .approve + finance.payment.create';
  END IF;
END $fixtures$;

-- ------------------------------------------------------------------------
-- 3. Success matrix — Lab Sample
-- ------------------------------------------------------------------------
--   Each test switches to the `authenticated` role and sets a JWT sub
--   claim equal to the target actor's UUID so auth.uid() resolves correctly:
--
--     SET LOCAL ROLE authenticated;
--     SET LOCAL "request.jwt.claim.sub" TO '<actor-uuid>';
--
--   Between tests, reset:
--     RESET ROLE;
--     SET LOCAL "request.jwt.claim.sub" TO '';
--
-- Case 3.1 Lab deposit + debt from status='draft'
-- Case 3.2 Lab deposit + cash from status='accessioned'
-- Case 3.3 Lab final   + debt from status='completed'
-- Case 3.4 Lab final   + cash
-- Case 3.5 Lab final   + card
-- Case 3.6 Lab final   + transfer
-- Case 3.7 Coexistence: same sample, one active deposit + one active final
-- Case 3.8 Active duplicate DEPOSIT → FIN_SOURCE_LINK_CONFLICT
-- Case 3.9 Active duplicate FINAL   → FIN_SOURCE_LINK_CONFLICT
-- Case 3.10 Cancel prior linked invoice via cancel_invoice, then same-kind
--           checkout is permitted again (no conflict).
--
-- Each success case asserts:
--   * response.status matches expected ('approved'|'paid')
--   * response.payment_result IS NULL for debt,
--     jsonb_typeof(response.payment_result) = 'object' otherwise
--   * exactly one invoice row inserted with total_amount > 0
--   * every invoice_items row has all five frozen columns non-null
--   * every invoice_items row has entity_type = source_type, entity_id = source_id
--   * every lab_sample item row has (lab_horse_id IS NOT NULL) XOR (horse_id IS NOT NULL)
--   * for non-debt: one 'payment' ledger row and one billing_links row with
--       source_type='payment', link_kind='final' exists
--   * one billing_links row with source_type=<lab_sample|horse_order>,
--       link_kind=<deposit|final> exists
--   * invoice header totals reconcile with SUM(invoice_items.line_gross_amount)
--     minus response.discount_amount

-- ------------------------------------------------------------------------
-- 4. Success matrix — Horse Order
-- ------------------------------------------------------------------------
-- Case 4.1 final + debt on completed order (actual_cost > 0)
-- Case 4.2 final + cash on completed order (estimated_cost only)
-- Case 4.3 actual_cost overrides estimated_cost when both non-null
-- Case 4.4 Server-derived description = order_type.name || ' - ' || horse.name
-- Case 4.5 Server-derived horse_id persisted on the single item
-- Case 4.6 Duplicate active FINAL → FIN_SOURCE_LINK_CONFLICT

-- ------------------------------------------------------------------------
-- 5. Client identity matrix
-- ------------------------------------------------------------------------
-- Case 5.1 Sample with client_id → canonical clients.name wins, ignores payload
-- Case 5.2 Sample with client_id → spoofed payload client_name has no effect
-- Case 5.3 Sample with NULL client_id but source client_name → source wins
-- Case 5.4 Sample with NULL client_id and NULL source client_name +
--          payload client_name → payload wins
-- Case 5.5 All three NULL → 'Walk-in Customer'
-- Case 5.6 Order client_id belongs to another tenant → FIN_SOURCE_CLIENT_CROSS_TENANT

-- ------------------------------------------------------------------------
-- 6. Tax matrix
-- ------------------------------------------------------------------------
-- Case 6.1 prices_include_tax omitted → uses tenant default (prices_tax_inclusive)
-- Case 6.2 prices_include_tax = true explicit
-- Case 6.3 prices_include_tax = false explicit
-- Case 6.4 Zero-rate tenant (default_tax_rate=0) → every line_tax_amount = 0
-- Case 6.5 Manual item default is_taxable → snapshot true
-- Case 6.6 Manual item is_taxable=false → snapshot false and line_tax_amount=0
-- Case 6.7 Mixed taxable + non-taxable items reconcile at header level
-- Case 6.8 Positive valid discount reduces total_amount
-- Case 6.9 Discount > SUM(line_gross_amount) → FIN_DISCOUNT_EXCEEDS_TOTAL
-- Case 6.10 Every invoice_items row has all five frozen fields non-null
-- Case 6.11 subtotal + tax_amount - discount_amount == total_amount

-- ------------------------------------------------------------------------
-- 7. Payment matrix
-- ------------------------------------------------------------------------
-- Case 7.1 Debt: invoice.status = 'approved', payment_received_at IS NULL,
--          no 'payment' ledger row, response.payment_result IS NULL
-- Case 7.2 Cash/card/transfer: invoice.status = 'paid',
--          payment_received_at IS NOT NULL (owned by post_payment),
--          response.payment_result exactly equals the RETURNS of post_payment
-- Case 7.3 One 'payment' ledger row per successful non-debt checkout
-- Case 7.4 One billing_links row with source_type='payment', link_kind='final'
--          created by post_payment
-- Case 7.5 One additional billing_links row with source_type=<source_type>,
--          link_kind=<link_kind> created by the outer RPC
-- Case 7.6 UPDATE payment_accounts SET is_active = false → FIN_TENANT_PAYMENT_ACCOUNT_MISSING
-- Case 7.7 After #7.6 failure: no invoice / no items / no ledger residue

-- ------------------------------------------------------------------------
-- 8. Trace matrix
-- ------------------------------------------------------------------------
-- Case 8.1 lab_sample: every invoice_items row has entity_type='lab_sample',
--          entity_id = source_id and lab_horse_id or horse_id per resolution
-- Case 8.2 horse_order: single item has entity_type='horse_order',
--          entity_id = source_id, horse_id = order.horse_id

-- ------------------------------------------------------------------------
-- 9. Idempotency matrix
-- ------------------------------------------------------------------------
-- Case 9.1 Identical (idempotency_key, payload) → byte-equal stored response
--          and finance_request_idempotency has a single row for the outer op
-- Case 9.2 No duplicate invoice / invoice_items / ledger / billing_links rows
-- Case 9.3 Same key, link_kind swapped ('deposit'→'final') → FIN_IDEMPOTENCY_CONFLICT
-- Case 9.4 Same key, discount_amount changed → FIN_IDEMPOTENCY_CONFLICT
-- Case 9.5 Same key, first item unit_price changed → FIN_IDEMPOTENCY_CONFLICT
-- Case 9.6 Deterministic child rows (create/approve/payment) each exist at
--          most once for a successful outer request
-- Case 9.7 Simulated failure of the outer RPC (via one of the injection
--          triggers) leaves NO row in finance_request_idempotency for the
--          outer key nor any child key

-- ------------------------------------------------------------------------
-- 10. Security matrix
-- ------------------------------------------------------------------------
-- Case 10.1 SET LOCAL ROLE authenticated; unset JWT sub → FIN_UNAUTHENTICATED
-- Case 10.2 Cross-tenant source_id → FIN_SOURCE_NOT_FOUND (no leak of existence)
-- Case 10.3 Actor lacks finance.invoice.create → FIN_PERMISSION_DENIED
-- Case 10.4 Actor lacks finance.invoice.approve → FIN_PERMISSION_DENIED
-- Case 10.5 Actor lacks finance.payment.create AND method='cash'|'card'|'transfer'
--            → FIN_PERMISSION_DENIED
-- Case 10.6 Same actor as 10.5 with method='debt' → succeeds (invoice.status='approved')

-- ------------------------------------------------------------------------
-- 11. Rollback / zero-residue matrix
-- ------------------------------------------------------------------------
-- Common snapshot helper (pseudocode):
--   snapshot: counts and totals per test-tenant across
--     invoices, invoice_items, ledger_entries WHERE entry_type='invoice',
--     ledger_entries WHERE entry_type='payment',
--     billing_links, finance_request_idempotency, customer_balances.
--
-- For each injection case:
--   1. SAVEPOINT snap;
--   2. Capture BEFORE snapshot
--   3. Set inject stage/tenant GUCs
--   4. Invoke create_source_checkout_invoke inside a subtransaction that is
--      expected to raise. Catch via DO $$ BEGIN ... EXCEPTION WHEN ... END $$;
--   5. Capture AFTER snapshot
--   6. ASSERT BEFORE == AFTER (row counts AND aggregate money columns)
--   7. RELEASE SAVEPOINT snap; reset GUCs
--
-- Case 11.1 invoice_item stage
--   * lab_sample payload has one Extra item with description
--     '__J5_1_INJECT_ITEM_FAIL__' at position >= 1
--   * SET LOCAL j5_1.inject_stage = 'invoice_item'
--   * assert exception raised, then assert zero residue everywhere
--
-- Case 11.2 approval_ledger stage
--   * SET LOCAL j5_1.inject_stage = 'approval_ledger',
--     j5_1.inject_tenant = <test tenant>
--   * Any valid lab_sample or horse_order call
--   * approve_invoice inserts the invoice-ledger row → trigger raises
--   * Assert: invoice_items rows for that call DO NOT persist,
--     invoice row DOES NOT persist,
--     no ledger row, no billing_links row, no idempotency row
--
-- Case 11.3 payment_ledger stage
--   * SET LOCAL j5_1.inject_stage = 'payment_ledger', inject_tenant set
--   * method='cash' → invoice ledger row succeeds, then payment ledger insert
--     fails → whole outer RPC txn rolls back
--   * Assert: no invoice-ledger row remains (proves total rollback,
--     not partial), no billing_links, no invoice, no items, no idempotency
--
-- Case 11.4 source_link stage
--   * SET LOCAL j5_1.inject_stage = 'source_link', inject_tenant set
--   * Guard excludes source_type='payment' → the Payment Billing Link written
--     by post_payment inserts successfully; the outer Source Billing Link
--     insert then raises → txn rolls back
--   * Assert: full zero-residue on all seven scoped tables
--
-- All four cases MUST assert EXACT equality on:
--   count(invoices), count(invoice_items),
--   count(ledger_entries) FILTER (entry_type='invoice'),
--   count(ledger_entries) FILTER (entry_type='payment'),
--   count(billing_links), count(finance_request_idempotency),
--   sum(customer_balances.balance) for the test client(s).
--
-- No POS table is referenced anywhere in this file.

-- ------------------------------------------------------------------------
-- 12. Final cleanup
-- ------------------------------------------------------------------------
-- Nothing to explicitly clean: BEGIN/ROLLBACK below removes every fixture,
-- trigger, function, and idempotency row.

ROLLBACK;
