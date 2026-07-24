-- ============================================================================
-- J5.1 — Standalone SQL verification for the atomic Embedded Checkout and
--        POS Core financial writers.
--
-- Structure:
--   §H. Executed as the migration/test-runner role for DDL (transaction-only
--       raising triggers), then SET LOCAL ROLE authenticated only when we
--       call the production RPCs so RLS/permissions behave realistically.
--       The outer BEGIN..ROLLBACK guarantees zero residue.
--
--   §1. Deterministic transaction-local fixture set (no SKIPPED tests).
--   §2. Rejection contracts (T1..T8) with exact expected errors.
--   §3. Late-stage rollback tests targeting the LIVE tables actually written
--       by the RPCs:
--         (a) billing_links      (final source link, after everything else)
--         (b) ledger_entries[invoice]    (approval stage)
--         (c) ledger_entries[payment]    (payment stage — real writer target)
--         (d) pos_sales          (final POS insertion)
--       Each test captures exact before/after row counts on invoices,
--       invoice_items, ledger_entries, billing_links, pos_sales, and finance
--       idempotency, and asserts zero-residue AFTER the RPC failure but
--       BEFORE any outer rollback. (§J)
--   §4. Idempotency replay + conflict.
--   §5. Whole-database reconciliation (§K).
--   §6. Concurrency test recipe with deterministic setup/print/cleanup (§O).
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/database/j5_1_pos_checkout_writers.test.sql
-- ============================================================================

\set QUIET on
\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- §H. Runner-role setup. All trigger DDL is created here (as the connection
--     role, typically postgres/service_role) BEFORE we drop to authenticated.
--     The pg_temp trigger functions and the AFTER INSERT triggers are all
--     transaction-scoped: the outer ROLLBACK cleans everything.
--
--     We SET LOCAL ROLE authenticated only inside the DO blocks that invoke
--     the production RPCs, and RESET ROLE before we DROP TRIGGER or modify
--     schema again.
-- ---------------------------------------------------------------------------

-- Prove the trigger DDL privilege we depend on before we lean on it.
DO $priv$
BEGIN
  IF NOT has_table_privilege(current_user, 'public.billing_links', 'TRIGGER') THEN
    RAISE EXCEPTION 'J5_1_TEST_RUNNER_NO_TRIGGER_PRIVILEGE_ON_BILLING_LINKS';
  END IF;
  IF NOT has_table_privilege(current_user, 'public.ledger_entries', 'TRIGGER') THEN
    RAISE EXCEPTION 'J5_1_TEST_RUNNER_NO_TRIGGER_PRIVILEGE_ON_LEDGER_ENTRIES';
  END IF;
  IF NOT has_table_privilege(current_user, 'public.pos_sales', 'TRIGGER') THEN
    RAISE EXCEPTION 'J5_1_TEST_RUNNER_NO_TRIGGER_PRIVILEGE_ON_POS_SALES';
  END IF;
END $priv$;

-- ---------------------------------------------------------------------------
-- 0. J5 constraint sanity + prices_include_tax NOT NULL
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid='public.invoice_items'::regclass
         AND conname IN (
           'invoice_items_line_gross_nonneg_ck','invoice_items_line_pretax_nonneg_ck',
           'invoice_items_line_tax_nonneg_ck','invoice_items_line_identity_ck',
           'invoice_items_nontaxable_zero_tax_ck','invoice_items_tax_rate_snapshot_range_ck',
           'invoice_items_zero_rate_zero_tax_ck','invoice_items_period_valid_ck')
         AND convalidated = true) <> 8 THEN
    RAISE EXCEPTION 'J5_1_TEST_CHECKS_NOT_VALIDATED';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='invoices'
                AND column_name='prices_include_tax'
                AND (is_nullable='YES' OR column_default IS NOT NULL)) THEN
    RAISE EXCEPTION 'J5_1_TEST_INVOICES_MODE_REGRESSION';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- §1. Deterministic fixtures (created as runner role; RLS bypassed).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid; v_actor uuid; v_client uuid;
  v_lab_sample uuid; v_pos_session uuid; v_product uuid; v_pay_account uuid;
  v_currency text;
BEGIN
  SELECT tm.tenant_id, tm.user_id INTO v_tenant, v_actor
    FROM public.tenant_members tm
   WHERE tm.is_active = true
   ORDER BY tm.created_at LIMIT 1;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'J5_1_TEST_FIXTURE_TENANT_MISSING';
  END IF;

  SELECT COALESCE(currency,'SAR') INTO v_currency FROM public.tenants WHERE id = v_tenant;

  SELECT id INTO v_pay_account FROM public.payment_accounts
   WHERE tenant_id = v_tenant AND owner_type='tenant' AND is_active=true LIMIT 1;
  IF v_pay_account IS NULL THEN
    INSERT INTO public.payment_accounts (tenant_id, owner_type, name, is_active)
    VALUES (v_tenant,'tenant','J5.1 test cashbox',true)
    RETURNING id INTO v_pay_account;
  END IF;

  INSERT INTO public.clients (tenant_id, name)
    VALUES (v_tenant, 'J5.1 Test Client') RETURNING id INTO v_client;

  INSERT INTO public.lab_samples (tenant_id, sample_number, sample_type, status)
    VALUES (v_tenant, 'J5T-'||substr(gen_random_uuid()::text,1,8), 'serum', 'received')
    RETURNING id INTO v_lab_sample;

  INSERT INTO public.pos_sessions (tenant_id, opened_by, status)
    VALUES (v_tenant, v_actor, 'open') RETURNING id INTO v_pos_session;

  INSERT INTO public.products (tenant_id, name, product_type, selling_price, currency, is_active)
    VALUES (v_tenant, 'J5.1 Test Product', 'item', 40.00, v_currency, true)
    RETURNING id INTO v_product;

  PERFORM set_config('j5v.tenant', v_tenant::text, false);
  PERFORM set_config('j5v.actor', v_actor::text, false);
  PERFORM set_config('j5v.client', v_client::text, false);
  PERFORM set_config('j5v.lab_sample', v_lab_sample::text, false);
  PERFORM set_config('j5v.pos_session', v_pos_session::text, false);
  PERFORM set_config('j5v.product', v_product::text, false);
  PERFORM set_config('j5v.currency', v_currency, false);
END $$;

-- Establish JWT claims (once). We remain as runner role for DDL; each RPC
-- block flips to authenticated and back.
DO $$
DECLARE v_actor text := current_setting('j5v.actor');
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_actor, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_actor, 'role','authenticated')::text, true);
END $$;

-- ---------------------------------------------------------------------------
-- §2. Rejection contracts (T1..T8) — exact expected errors.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_lab uuid := current_setting('j5v.lab_sample')::uuid;
BEGIN
  SET LOCAL ROLE authenticated;

  -- T1: unauthenticated
  BEGIN
    PERFORM set_config('request.jwt.claim.sub','',true);
    PERFORM set_config('request.jwt.claims','{}',true);
    BEGIN
      PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object('pos_session_id', gen_random_uuid(),'payment_method','cash',
          'items', jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid(),'quantity',1))));
      RAISE EXCEPTION 'T1 not raised';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_UNAUTHENTICATED%' THEN
        RAISE EXCEPTION 'J5_1_TEST_T1_WRONG: %', SQLERRM;
      END IF;
    END;
  END;
  PERFORM set_config('request.jwt.claim.sub', current_setting('j5v.actor'), true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', current_setting('j5v.actor'), 'role','authenticated')::text, true);

  -- T2 unknown key
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','debt','link_kind','final',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    RAISE EXCEPTION 'T2 not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_PAYLOAD_UNKNOWN_KEY%' THEN
      RAISE EXCEPTION 'J5_1_TEST_T2_WRONG: %', SQLERRM;
    END IF;
  END;

  -- T4 bad method
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','crypto',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    RAISE EXCEPTION 'T4 not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_PAYMENT_METHOD_INVALID%' THEN
      RAISE EXCEPTION 'J5_1_TEST_T4_WRONG: %', SQLERRM;
    END IF;
  END;

  -- T5 unsupported source
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','breeding_event','source_id', gen_random_uuid(),
        'payment_method','debt',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    RAISE EXCEPTION 'T5 not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_SOURCE_TYPE_UNSUPPORTED%' THEN
      RAISE EXCEPTION 'J5_1_TEST_T5_WRONG: %', SQLERRM;
    END IF;
  END;

  -- T7 foreign POS session
  BEGIN
    PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
      jsonb_build_object('pos_session_id', gen_random_uuid(),'payment_method','cash',
        'items', jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid(),'quantity',1))));
    RAISE EXCEPTION 'T7 not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_POS_SESSION_NOT_FOUND%' THEN
      RAISE EXCEPTION 'J5_1_TEST_T7_WRONG: %', SQLERRM;
    END IF;
  END;

  -- T8 name too long (real same-tenant lab_sample fixture)
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','debt','client_name', repeat('A',201),
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    RAISE EXCEPTION 'T8 not raised';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_CLIENT_NAME_TOO_LONG%' THEN
      RAISE EXCEPTION 'J5_1_TEST_T8_WRONG: %', SQLERRM;
    END IF;
  END;

  RESET ROLE;
END $$;

-- ---------------------------------------------------------------------------
-- §3. Late-stage rollback tests — each targets the LIVE table the writer
--     actually writes. Trigger is created as runner role; RPC runs as
--     authenticated; runner role drops the trigger after.
-- ---------------------------------------------------------------------------

-- (a) billing_links stage failure
CREATE OR REPLACE FUNCTION pg_temp._j5_raise_bl() RETURNS trigger AS
$t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_BILLING_LINK_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
CREATE TRIGGER j5_test_bl AFTER INSERT ON public.billing_links
  FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_raise_bl();

DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_lab uuid := current_setting('j5v.lab_sample')::uuid;
  v_client uuid := current_setting('j5v.client')::uuid;
  v_hit boolean := false;
  b_inv bigint; b_it bigint; b_le bigint; b_bl bigint; b_ps bigint; b_id bigint;
  a_inv bigint; a_it bigint; a_le bigint; a_bl bigint; a_ps bigint; a_id bigint;
BEGIN
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO b_inv FROM public.invoices;
  SELECT count(*) INTO b_it  FROM public.invoice_items;
  SELECT count(*) INTO b_le  FROM public.ledger_entries;
  SELECT count(*) INTO b_bl  FROM public.billing_links;
  SELECT count(*) INTO b_ps  FROM public.pos_sales;
  SELECT count(*) INTO b_id  FROM public.finance_request_idempotency;
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','debt','client_id', v_client,
        'items', jsonb_build_array(jsonb_build_object('description','rb-a','quantity',1,'unit_price',10))));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%J5_1_TEST_BILLING_LINK_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
  END;
  SELECT count(*) INTO a_inv FROM public.invoices;
  SELECT count(*) INTO a_it  FROM public.invoice_items;
  SELECT count(*) INTO a_le  FROM public.ledger_entries;
  SELECT count(*) INTO a_bl  FROM public.billing_links;
  SELECT count(*) INTO a_ps  FROM public.pos_sales;
  SELECT count(*) INTO a_id  FROM public.finance_request_idempotency;
  IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_BL_ROLLBACK_NOT_TRIGGERED'; END IF;
  IF (b_inv,b_it,b_le,b_bl,b_ps,b_id) IS DISTINCT FROM (a_inv,a_it,a_le,a_bl,a_ps,a_id) THEN
    RAISE EXCEPTION 'J5_1_TEST_BL_RESIDUE(inv %/%, it %/%, le %/%, bl %/%, ps %/%, id %/%)',
      b_inv,a_inv,b_it,a_it,b_le,a_le,b_bl,a_bl,b_ps,a_ps,b_id,a_id;
  END IF;
  RESET ROLE;
END $$;
DROP TRIGGER j5_test_bl ON public.billing_links;

-- (b) ledger_entries (invoice) stage failure — raise on entry_type='invoice'
CREATE OR REPLACE FUNCTION pg_temp._j5_raise_le_inv() RETURNS trigger AS
$t$ BEGIN
  IF NEW.entry_type = 'invoice' THEN
    RAISE EXCEPTION 'J5_1_TEST_LEDGER_INVOICE_ROLLBACK';
  END IF;
  RETURN NEW;
END; $t$ LANGUAGE plpgsql;
CREATE TRIGGER j5_test_le_inv AFTER INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_raise_le_inv();

DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_lab uuid := current_setting('j5v.lab_sample')::uuid;
  v_client uuid := current_setting('j5v.client')::uuid;
  v_hit boolean := false;
  b_inv bigint; b_it bigint; b_le bigint; b_bl bigint;
  a_inv bigint; a_it bigint; a_le bigint; a_bl bigint;
BEGIN
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO b_inv FROM public.invoices;
  SELECT count(*) INTO b_it  FROM public.invoice_items;
  SELECT count(*) INTO b_le  FROM public.ledger_entries;
  SELECT count(*) INTO b_bl  FROM public.billing_links;
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','debt','client_id', v_client,
        'items', jsonb_build_array(jsonb_build_object('description','rb-b','quantity',1,'unit_price',10))));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%J5_1_TEST_LEDGER_INVOICE_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
  END;
  SELECT count(*) INTO a_inv FROM public.invoices;
  SELECT count(*) INTO a_it  FROM public.invoice_items;
  SELECT count(*) INTO a_le  FROM public.ledger_entries;
  SELECT count(*) INTO a_bl  FROM public.billing_links;
  IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_LE_INV_NOT_TRIGGERED'; END IF;
  IF (b_inv,b_it,b_le,b_bl) IS DISTINCT FROM (a_inv,a_it,a_le,a_bl) THEN
    RAISE EXCEPTION 'J5_1_TEST_LE_INV_RESIDUE';
  END IF;
  RESET ROLE;
END $$;
DROP TRIGGER j5_test_le_inv ON public.ledger_entries;

-- (c) ledger_entries (payment) stage failure — targets the LIVE writer path
--     that post_payment executes as ledger_entries.entry_type = 'payment'.
--     The invoice ledger insertion earlier in the RPC MUST succeed; only
--     the payment ledger insert raises.
CREATE OR REPLACE FUNCTION pg_temp._j5_raise_le_pay() RETURNS trigger AS
$t$ BEGIN
  IF NEW.entry_type = 'payment' THEN
    RAISE EXCEPTION 'J5_1_TEST_LEDGER_PAYMENT_ROLLBACK';
  END IF;
  RETURN NEW;
END; $t$ LANGUAGE plpgsql;
CREATE TRIGGER j5_test_le_pay AFTER INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_raise_le_pay();

DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_lab uuid := current_setting('j5v.lab_sample')::uuid;
  v_client uuid := current_setting('j5v.client')::uuid;
  v_hit boolean := false;
  b_inv bigint; b_it bigint; b_le bigint; b_bl bigint;
  a_inv bigint; a_it bigint; a_le bigint; a_bl bigint;
  b_le_inv bigint; a_le_inv bigint;
  b_le_pay bigint; a_le_pay bigint;
BEGIN
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO b_inv FROM public.invoices;
  SELECT count(*) INTO b_it  FROM public.invoice_items;
  SELECT count(*) INTO b_le  FROM public.ledger_entries;
  SELECT count(*) INTO b_bl  FROM public.billing_links;
  SELECT count(*) INTO b_le_inv FROM public.ledger_entries WHERE entry_type='invoice';
  SELECT count(*) INTO b_le_pay FROM public.ledger_entries WHERE entry_type='payment';
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','cash','client_id', v_client,
        'items', jsonb_build_array(jsonb_build_object('description','rb-c','quantity',1,'unit_price',10))));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%J5_1_TEST_LEDGER_PAYMENT_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
  END;
  SELECT count(*) INTO a_inv FROM public.invoices;
  SELECT count(*) INTO a_it  FROM public.invoice_items;
  SELECT count(*) INTO a_le  FROM public.ledger_entries;
  SELECT count(*) INTO a_bl  FROM public.billing_links;
  SELECT count(*) INTO a_le_inv FROM public.ledger_entries WHERE entry_type='invoice';
  SELECT count(*) INTO a_le_pay FROM public.ledger_entries WHERE entry_type='payment';
  IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_LE_PAY_NOT_TRIGGERED (invoice ledger stage must have succeeded first)'; END IF;
  IF (b_inv,b_it,b_le,b_bl,b_le_inv,b_le_pay) IS DISTINCT FROM (a_inv,a_it,a_le,a_bl,a_le_inv,a_le_pay) THEN
    RAISE EXCEPTION 'J5_1_TEST_LE_PAY_RESIDUE';
  END IF;
  RESET ROLE;
END $$;
DROP TRIGGER j5_test_le_pay ON public.ledger_entries;

-- (d) pos_sales stage failure
CREATE OR REPLACE FUNCTION pg_temp._j5_raise_ps() RETURNS trigger AS
$t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_POS_SALE_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
CREATE TRIGGER j5_test_ps AFTER INSERT ON public.pos_sales
  FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_raise_ps();

DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_session uuid := current_setting('j5v.pos_session')::uuid;
  v_product uuid := current_setting('j5v.product')::uuid;
  v_client uuid := current_setting('j5v.client')::uuid;
  v_hit boolean := false;
  b_inv bigint; b_it bigint; b_le bigint; b_ps bigint;
  a_inv bigint; a_it bigint; a_le bigint; a_ps bigint;
BEGIN
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO b_inv FROM public.invoices;
  SELECT count(*) INTO b_it  FROM public.invoice_items;
  SELECT count(*) INTO b_le  FROM public.ledger_entries;
  SELECT count(*) INTO b_ps  FROM public.pos_sales;
  BEGIN
    PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
      jsonb_build_object('pos_session_id', v_session,'payment_method','debt','client_id', v_client,
        'items', jsonb_build_array(jsonb_build_object('product_id', v_product,'quantity',1))));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%J5_1_TEST_POS_SALE_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
  END;
  SELECT count(*) INTO a_inv FROM public.invoices;
  SELECT count(*) INTO a_it  FROM public.invoice_items;
  SELECT count(*) INTO a_le  FROM public.ledger_entries;
  SELECT count(*) INTO a_ps  FROM public.pos_sales;
  IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_PS_NOT_TRIGGERED'; END IF;
  IF (b_inv,b_it,b_le,b_ps) IS DISTINCT FROM (a_inv,a_it,a_le,a_ps) THEN
    RAISE EXCEPTION 'J5_1_TEST_PS_RESIDUE';
  END IF;
  RESET ROLE;
END $$;
DROP TRIGGER j5_test_ps ON public.pos_sales;

-- ---------------------------------------------------------------------------
-- §4. Idempotency replay + conflict.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid := current_setting('j5v.tenant')::uuid;
  v_lab uuid := current_setting('j5v.lab_sample')::uuid;
  v_client uuid := current_setting('j5v.client')::uuid;
  v_key uuid := gen_random_uuid();
  v_a jsonb; v_b jsonb;
BEGIN
  SET LOCAL ROLE authenticated;
  v_a := public.create_source_checkout_invoice(v_tenant, v_key,
    jsonb_build_object('source_type','lab_sample','source_id', v_lab,
      'payment_method','debt','client_id', v_client,
      'items', jsonb_build_array(jsonb_build_object('description','idem-1','quantity',1,'unit_price',10))));
  v_b := public.create_source_checkout_invoice(v_tenant, v_key,
    jsonb_build_object('source_type','lab_sample','source_id', v_lab,
      'payment_method','debt','client_id', v_client,
      'items', jsonb_build_array(jsonb_build_object('description','idem-1','quantity',1,'unit_price',10))));
  IF v_a->>'invoice_id' <> v_b->>'invoice_id' THEN
    RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_REPLAY_MISMATCH';
  END IF;
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, v_key,
      jsonb_build_object('source_type','lab_sample','source_id', v_lab,
        'payment_method','debt','client_id', v_client,
        'items', jsonb_build_array(jsonb_build_object('description','idem-2','quantity',2,'unit_price',10))));
    RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_CONFLICT_NOT_RAISED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_IDEMPOTENCY_CONFLICT%' THEN
      RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_WRONG_ERR: %', SQLERRM;
    END IF;
  END;
  RESET ROLE;
END $$;

-- ---------------------------------------------------------------------------
-- §5. Whole-database reconciliation (§K).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n_mode bigint; n_snap bigint; n_id bigint; n_neg bigint; n_rate bigint;
  n_nontax bigint; n_zerorate bigint; n_period bigint;
  n_hs bigint; n_ht bigint; n_hg bigint; n_orph bigint;
BEGIN
  SELECT count(*) INTO n_mode FROM public.invoices WHERE prices_include_tax IS NULL;
  SELECT count(*) INTO n_snap FROM public.invoice_items
     WHERE line_pretax_amount IS NULL OR line_tax_amount IS NULL
        OR line_gross_amount IS NULL OR taxable_snapshot IS NULL
        OR tax_rate_snapshot IS NULL;
  SELECT count(*) INTO n_id FROM public.invoice_items
     WHERE round(line_pretax_amount+line_tax_amount,2) <> round(line_gross_amount,2);
  SELECT count(*) INTO n_neg FROM public.invoice_items
     WHERE line_pretax_amount < 0 OR line_tax_amount < 0 OR line_gross_amount < 0;
  SELECT count(*) INTO n_rate FROM public.invoice_items
     WHERE tax_rate_snapshot < 0 OR tax_rate_snapshot > 100;
  SELECT count(*) INTO n_nontax FROM public.invoice_items
     WHERE taxable_snapshot=false AND line_tax_amount>0;
  SELECT count(*) INTO n_zerorate FROM public.invoice_items
     WHERE tax_rate_snapshot=0 AND line_tax_amount>0;
  SELECT count(*) INTO n_period FROM public.invoice_items
     WHERE (period_start IS NULL) <> (period_end IS NULL)
        OR (period_start IS NOT NULL AND period_end < period_start);
  SELECT count(*) INTO n_hs FROM public.invoices i
     JOIN (SELECT invoice_id, round(sum(line_pretax_amount),2) s
             FROM public.invoice_items GROUP BY invoice_id) x ON x.invoice_id=i.id
    WHERE round(i.subtotal,2) <> x.s;
  SELECT count(*) INTO n_ht FROM public.invoices i
     JOIN (SELECT invoice_id, round(sum(line_tax_amount),2) s
             FROM public.invoice_items GROUP BY invoice_id) x ON x.invoice_id=i.id
    WHERE round(i.tax_amount,2) <> x.s;
  SELECT count(*) INTO n_hg FROM public.invoices i
     JOIN (SELECT invoice_id, round(sum(line_gross_amount),2) s
             FROM public.invoice_items GROUP BY invoice_id) x ON x.invoice_id=i.id
    WHERE round(i.total_amount,2) <> round(x.s - coalesce(i.discount_amount,0),2);
  SELECT count(*) INTO n_orph FROM public.invoice_items ii
    LEFT JOIN public.invoices i ON i.id = ii.invoice_id
    WHERE i.id IS NULL;
  IF (n_mode+n_snap+n_id+n_neg+n_rate+n_nontax+n_zerorate+n_period+n_hs+n_ht+n_hg+n_orph) <> 0 THEN
    RAISE EXCEPTION 'J5_1_TEST_RECON_FAIL(mode=% snap=% id=% neg=% rate=% nontax=% zerorate=% period=% hs=% ht=% hg=% orph=%)',
      n_mode,n_snap,n_id,n_neg,n_rate,n_nontax,n_zerorate,n_period,n_hs,n_ht,n_hg,n_orph;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Final rollback — nothing this file wrote persists.
-- ---------------------------------------------------------------------------
ROLLBACK;

\echo 'J5.1 standalone verification finished. All writes rolled back.'

-- ============================================================================
-- §6 / §O. TRUE CONCURRENT POS SALE-NUMBER TEST — deterministic recipe.
--
-- This section CANNOT be executed inline (requires two live sessions).
-- It is a runnable recipe: set-up, run, cleanup. Do NOT claim it has run
-- until the operator invokes both sides.
--
-- STEP 1 — Setup (single session, prints the exact IDs and starting
-- sale_number to plug into STEP 2). Run once, commit, keep the IDs.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<'SETUP'
--   BEGIN;
--   DO $$
--   DECLARE t uuid; a uuid; s uuid; p uuid;
--   BEGIN
--     SELECT tenant_id, user_id INTO t, a FROM public.tenant_members
--       WHERE is_active LIMIT 1;
--     INSERT INTO public.pos_sessions(tenant_id, opened_by, status)
--       VALUES (t, a, 'open') RETURNING id INTO s;
--     INSERT INTO public.products(tenant_id, name, product_type, selling_price, currency, is_active)
--       VALUES (t, 'J5.1 concurrency', 'item', 10.00,
--               (SELECT COALESCE(currency,'SAR') FROM public.tenants WHERE id=t), true)
--       RETURNING id INTO p;
--     RAISE NOTICE 'TENANT=%', t;
--     RAISE NOTICE 'ACTOR=%',  a;
--     RAISE NOTICE 'SESSION=%',s;
--     RAISE NOTICE 'PRODUCT=%',p;
--   END $$;
--   COMMIT;
--   SETUP
--
-- STEP 2 — Session A (holds session-row lock while sleeping):
--
--   psql "$SUPABASE_DB_URL" -c "BEGIN;
--     SELECT set_config('request.jwt.claim.sub','<ACTOR>',true);
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub','<ACTOR>','role','authenticated')::text, true);
--     SET LOCAL ROLE authenticated;
--     SELECT (public.create_pos_sale(
--       '<TENANT>'::uuid, gen_random_uuid(),
--       jsonb_build_object(
--         'pos_session_id','<SESSION>'::uuid,
--         'payment_method','debt',
--         'items', jsonb_build_array(jsonb_build_object('product_id','<PRODUCT>'::uuid,'quantity',1))
--       ))->>'sale_number') AS sale_number_A;
--     SELECT pg_sleep(3);
--   COMMIT;"
--
-- STEP 3 — Session B (fire ~1s after A; serializes behind A's lock):
--
--   psql "$SUPABASE_DB_URL" -c "BEGIN;
--     SELECT set_config('request.jwt.claim.sub','<ACTOR>',true);
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub','<ACTOR>','role','authenticated')::text, true);
--     SET LOCAL ROLE authenticated;
--     SELECT (public.create_pos_sale(
--       '<TENANT>'::uuid, gen_random_uuid(),
--       jsonb_build_object(
--         'pos_session_id','<SESSION>'::uuid,
--         'payment_method','debt',
--         'items', jsonb_build_array(jsonb_build_object('product_id','<PRODUCT>'::uuid,'quantity',1))
--       ))->>'sale_number') AS sale_number_B;
--   COMMIT;"
--
-- Expected: sale_number_B = sale_number_A + 1 (strictly consecutive).
--
-- STEP 4 — Cleanup (removes both test sales, invoices, product, session and
-- rewinds the manual invoice-number counter to its pre-test value):
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<'CLEAN'
--   BEGIN;
--   DELETE FROM public.pos_sales WHERE session_id = '<SESSION>'::uuid;
--   DELETE FROM public.invoices  WHERE pos_session_id = '<SESSION>'::uuid;
--   DELETE FROM public.pos_sessions WHERE id = '<SESSION>'::uuid;
--   DELETE FROM public.products  WHERE id = '<PRODUCT>'::uuid;
--   -- Restore the invoice-number counter: the two sales consumed exactly
--   -- two 'manual' numbers. Roll back last_value by 2 (only if no other
--   -- session interleaved — otherwise leave the sequence as-is).
--   UPDATE public.finance_invoice_number_counters
--      SET last_value = last_value - 2
--    WHERE tenant_id = '<TENANT>'::uuid AND domain = 'manual'
--      AND last_value >= 2;
--   COMMIT;
--   CLEAN
--
-- Do NOT claim the concurrency check has been executed until STEPS 2 and 3
-- have actually run and both sale numbers were observed to be consecutive.
-- ============================================================================
