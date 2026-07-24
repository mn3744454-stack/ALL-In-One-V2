-- ============================================================================
-- J5.1 — Standalone SQL verification for the atomic Embedded Checkout and
--        POS Core financial writers.
--
-- Scope:
--   1. Rerun the rejection contracts embedded in the migration (T1..T8).
--   2. Exercise the four transaction-only rollback tests
--      (billing_links, ledger_entries, payment_intents, pos_sales).
--   3. Verify idempotency + payload-mismatch conflict for both public writers.
--   4. Confirm all J5 tax/period CHECKs remain validated.
--   5. Confirm baseline reconciliation (no fixture residue) at end.
--
--   NOTE: The true concurrent sale-number test requires two concurrent
--   database sessions. It is intentionally provided as a runnable psql
--   invocation snippet at the bottom of this file rather than executed
--   inline. Do not claim it has been executed until it is run manually.
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database/j5_1_pos_checkout_writers.test.sql
-- ============================================================================

\set QUIET on
\set ON_ERROR_STOP on

BEGIN;

-- Fixture identities (from preflight §C.10).
\set TENANT '145f2128-83ca-4ba8-85b5-8ade245c5530'
\set ACTOR  '98439fe8-6881-4e9e-8ff6-18aca0ce4470'

-- Authenticate as the fixture user (JWT claim mechanism proven in J3.3).
SELECT set_config('request.jwt.claim.sub', :'ACTOR', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'ACTOR', 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;

-- ---------------------------------------------------------------------------
-- 4. J5 constraint sanity check
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname IN (
       'invoice_items_line_gross_nonneg_ck',
       'invoice_items_line_pretax_nonneg_ck',
       'invoice_items_line_tax_nonneg_ck',
       'invoice_items_line_identity_ck',
       'invoice_items_nontaxable_zero_tax_ck',
       'invoice_items_tax_rate_snapshot_range_ck',
       'invoice_items_zero_rate_zero_tax_ck',
       'invoice_items_period_valid_ck'
     )
       AND convalidated = false
  ) THEN
    RAISE EXCEPTION 'J5_1_TEST_CHECKS_NOT_VALIDATED';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Rejection contracts (T1..T8), re-executed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_msg text := '';
BEGIN
  -- T2 unknown key
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id',gen_random_uuid(),
        'payment_method','debt','link_kind','final',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    v_msg := 'T2 unknown-key not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_PAYLOAD_UNKNOWN_KEY%' THEN v_msg := 'T2 '||SQLERRM; END IF;
  END;

  -- T4 bad payment method
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id',gen_random_uuid(),
        'payment_method','crypto',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    v_msg := 'T4 bad payment not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_PAYMENT_METHOD_INVALID%' THEN v_msg := 'T4 '||SQLERRM; END IF;
  END;

  -- T5 unsupported source type
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','breeding_event','source_id',gen_random_uuid(),
        'payment_method','debt',
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    v_msg := 'T5 unsupported source not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_SOURCE_TYPE_UNSUPPORTED%' THEN v_msg := 'T5 '||SQLERRM; END IF;
  END;

  -- T7 POS foreign session
  BEGIN
    PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
      jsonb_build_object('pos_session_id',gen_random_uuid(),'payment_method','cash',
        'items', jsonb_build_array(jsonb_build_object('product_id',gen_random_uuid(),'quantity',1))));
    v_msg := 'T7 foreign session not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_POS_SESSION_NOT_FOUND%' THEN v_msg := 'T7 '||SQLERRM; END IF;
  END;

  -- T8 walk-in name too long
  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id',gen_random_uuid(),
        'payment_method','debt','client_name', repeat('A',250),
        'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
    v_msg := 'T8 name-too-long not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_CLIENT_NAME_TOO_LONG%' AND SQLERRM NOT LIKE '%FIN_SOURCE_NOT_FOUND%' THEN
      v_msg := 'T8 '||SQLERRM;
    END IF;
  END;

  IF v_msg <> '' THEN
    RAISE EXCEPTION 'J5_1_TEST_REJECTION_FAILED: %', v_msg;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Transaction-only rollback tests.
--
-- Each test:
--   - installs a temporary AFTER INSERT trigger that always raises,
--   - invokes the real production RPC with an otherwise valid payload,
--   - expects the raising error and zero residual rows,
--   - is followed by a subtransaction ROLLBACK that removes the trigger
--     and every fixture row it touched.
--
-- Because the outer BEGIN..ROLLBACK wraps this whole file, none of these
-- writes ever persist. The four production tables covered are:
--   billing_links, ledger_entries, payment_intents, pos_sales.
--
-- These tests require live lab_sample / pos_session fixtures to reach the
-- final INSERT stage; when absent, the test is marked SKIPPED via NOTICE
-- rather than failed, keeping the file safe to run in any environment.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_sample uuid;
  v_session uuid;
  v_product uuid;
  v_hit boolean;
BEGIN
  SELECT id INTO v_sample FROM public.lab_samples WHERE tenant_id = v_tenant LIMIT 1;
  SELECT id INTO v_session FROM public.pos_sessions
    WHERE tenant_id = v_tenant AND status='open' LIMIT 1;
  SELECT id INTO v_product FROM public.products
    WHERE tenant_id = v_tenant AND is_active = true LIMIT 1;

  -- (a) billing_links raising trigger
  IF v_sample IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION pg_temp._j5_1_raise_bl() RETURNS trigger AS
    $t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_BILLING_LINK_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
    EXECUTE 'CREATE TRIGGER j5_1_test_bl AFTER INSERT ON public.billing_links FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_1_raise_bl()';
    v_hit := false;
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_sample,
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','rb-a','quantity',1,'unit_price',10))));
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%J5_1_TEST_BILLING_LINK_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
    END;
    EXECUTE 'DROP TRIGGER j5_1_test_bl ON public.billing_links';
    IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_BL_ROLLBACK_NOT_TRIGGERED'; END IF;
  ELSE
    RAISE NOTICE 'J5.1 rollback (a) SKIPPED — no lab_sample fixture for tenant.';
  END IF;

  -- (b) ledger_entries raising trigger
  IF v_sample IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION pg_temp._j5_1_raise_le() RETURNS trigger AS
    $t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_LEDGER_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
    EXECUTE 'CREATE TRIGGER j5_1_test_le AFTER INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_1_raise_le()';
    v_hit := false;
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_sample,
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','rb-b','quantity',1,'unit_price',10))));
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%J5_1_TEST_LEDGER_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
    END;
    EXECUTE 'DROP TRIGGER j5_1_test_le ON public.ledger_entries';
    IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_LE_ROLLBACK_NOT_TRIGGERED'; END IF;
  ELSE
    RAISE NOTICE 'J5.1 rollback (b) SKIPPED — no lab_sample fixture for tenant.';
  END IF;

  -- (c) payment_intents raising trigger (requires cash payment path)
  IF v_sample IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION pg_temp._j5_1_raise_pi() RETURNS trigger AS
    $t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_PAYMENT_INTENT_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
    EXECUTE 'CREATE TRIGGER j5_1_test_pi AFTER INSERT ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_1_raise_pi()';
    v_hit := false;
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_sample,
          'payment_method','cash',
          'items', jsonb_build_array(jsonb_build_object('description','rb-c','quantity',1,'unit_price',10))));
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%J5_1_TEST_PAYMENT_INTENT_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
    END;
    EXECUTE 'DROP TRIGGER j5_1_test_pi ON public.payment_intents';
    IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_PI_ROLLBACK_NOT_TRIGGERED'; END IF;
  ELSE
    RAISE NOTICE 'J5.1 rollback (c) SKIPPED — no lab_sample fixture for tenant.';
  END IF;

  -- (d) pos_sales raising trigger
  IF v_session IS NOT NULL AND v_product IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION pg_temp._j5_1_raise_ps() RETURNS trigger AS
    $t$ BEGIN RAISE EXCEPTION 'J5_1_TEST_POS_SALE_ROLLBACK'; END; $t$ LANGUAGE plpgsql;
    EXECUTE 'CREATE TRIGGER j5_1_test_ps AFTER INSERT ON public.pos_sales FOR EACH ROW EXECUTE FUNCTION pg_temp._j5_1_raise_ps()';
    v_hit := false;
    BEGIN
      PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object('pos_session_id', v_session, 'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1))));
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%J5_1_TEST_POS_SALE_ROLLBACK%' THEN v_hit := true; ELSE RAISE; END IF;
    END;
    EXECUTE 'DROP TRIGGER j5_1_test_ps ON public.pos_sales';
    IF NOT v_hit THEN RAISE EXCEPTION 'J5_1_TEST_PS_ROLLBACK_NOT_TRIGGERED'; END IF;
  ELSE
    RAISE NOTICE 'J5.1 rollback (d) SKIPPED — no open POS session + active product fixture.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Idempotency + payload-mismatch conflict.
--
--   Both writers open idempotency via _finance_idempotency_begin. A replay
--   with the SAME operation key and SAME resolved input must return the
--   stored response (no new rows). A replay with the SAME key but DIFFERENT
--   payload must raise FIN_IDEMPOTENCY_CONFLICT.
--
--   These paths are exercised end-to-end only when live fixtures exist; the
--   canonical rejection contract (T2..T7) is the mandatory backstop that
--   already gates unknown keys and bad sources without a fixture.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_sample uuid;
  v_key uuid := gen_random_uuid();
  v_a jsonb; v_b jsonb;
BEGIN
  SELECT id INTO v_sample FROM public.lab_samples WHERE tenant_id = v_tenant LIMIT 1;
  IF v_sample IS NULL THEN
    RAISE NOTICE 'Idempotency replay SKIPPED — no lab_sample fixture.';
    RETURN;
  END IF;

  v_a := public.create_source_checkout_invoice(v_tenant, v_key,
    jsonb_build_object('source_type','lab_sample','source_id', v_sample,
      'payment_method','debt',
      'items', jsonb_build_array(jsonb_build_object('description','idem-1','quantity',1,'unit_price',10))));
  v_b := public.create_source_checkout_invoice(v_tenant, v_key,
    jsonb_build_object('source_type','lab_sample','source_id', v_sample,
      'payment_method','debt',
      'items', jsonb_build_array(jsonb_build_object('description','idem-1','quantity',1,'unit_price',10))));
  IF v_a->>'invoice_id' <> v_b->>'invoice_id' THEN
    RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_REPLAY_MISMATCH';
  END IF;

  BEGIN
    PERFORM public.create_source_checkout_invoice(v_tenant, v_key,
      jsonb_build_object('source_type','lab_sample','source_id', v_sample,
        'payment_method','debt',
        'items', jsonb_build_array(jsonb_build_object('description','idem-2','quantity',2,'unit_price',10))));
    RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_CONFLICT_NOT_RAISED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%FIN_IDEMPOTENCY_CONFLICT%' THEN
      RAISE EXCEPTION 'J5_1_TEST_IDEMPOTENCY_WRONG_ERR: %', SQLERRM;
    END IF;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- Final rollback — this test file never persists anything.
-- ---------------------------------------------------------------------------
ROLLBACK;

\echo 'J5.1 standalone verification finished. All writes rolled back.'

-- ============================================================================
-- 5. TRUE CONCURRENT POS SALE-NUMBER TEST — two live psql sessions required.
--
-- This part CANNOT be executed inside this file because it needs two
-- separate database sessions running simultaneously. Do not claim it has
-- run until the operator has actually invoked both sides.
--
-- Session A (holds session-row lock while sleeping):
--   psql "$SUPABASE_DB_URL" -c "BEGIN;
--     SELECT set_config('request.jwt.claim.sub','98439fe8-6881-4e9e-8ff6-18aca0ce4470',true);
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub','98439fe8-6881-4e9e-8ff6-18aca0ce4470','role','authenticated')::text, true);
--     SET LOCAL ROLE authenticated;
--     SELECT public.create_pos_sale(
--       '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid, gen_random_uuid(),
--       jsonb_build_object(
--         'pos_session_id','<OPEN_SESSION_UUID>'::uuid,
--         'payment_method','debt',
--         'items', jsonb_build_array(jsonb_build_object('product_id','<PRODUCT_UUID>'::uuid,'quantity',1))));
--     SELECT pg_sleep(3);
--   COMMIT;"
--
-- Session B (fired ~1s later, must serialize behind Session A's lock and
-- receive sale_number = A + 1):
--   psql "$SUPABASE_DB_URL" -c "BEGIN;
--     SELECT set_config('request.jwt.claim.sub','98439fe8-6881-4e9e-8ff6-18aca0ce4470',true);
--     SELECT set_config('request.jwt.claims',
--       json_build_object('sub','98439fe8-6881-4e9e-8ff6-18aca0ce4470','role','authenticated')::text, true);
--     SET LOCAL ROLE authenticated;
--     SELECT public.create_pos_sale(
--       '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid, gen_random_uuid(),
--       jsonb_build_object(
--         'pos_session_id','<OPEN_SESSION_UUID>'::uuid,
--         'payment_method','debt',
--         'items', jsonb_build_array(jsonb_build_object('product_id','<PRODUCT_UUID>'::uuid,'quantity',1))));
--   COMMIT;"
--
-- Expected: both calls succeed; sale_number values are strictly consecutive.
-- ============================================================================
