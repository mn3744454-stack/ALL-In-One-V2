-- =========================================================================
-- Phase N+2 Slice 2 — post_payment_session / get_payment_session
-- Narrow backend verification.
-- Transaction-local fixtures; final ROLLBACK; no persistent rows.
-- Requires pgTAP + a bootstrapped auth.uid() shim (transaction-local).
-- =========================================================================
BEGIN;
SELECT plan(16);

-- -------------------------------------------------------------------------
-- Transaction-local fixture helpers (never persisted).
-- Assumes an active tenant with an active tenant payment account and a
-- finance.payment.create + finance.payment.view grant path for the actor.
-- =========================================================================

-- 1. one Invoice, full Payment.
PREPARE t01 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_single_horse, 'payment_method','cash',
      'amount', :inv_single_horse_total))
  ));
SELECT lives_ok('EXECUTE t01', '01. one invoice, full payment succeeds');

-- 2. one Invoice, partial Payment.
PREPARE t02 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_single_horse_2, 'payment_method','cash',
      'amount', round(:inv_single_horse_2_total/2, 2)))
  ));
SELECT lives_ok('EXECUTE t02', '02. one invoice, partial payment succeeds');

-- 3. one Invoice, split-tender two Payment Methods.
PREPARE t03 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(
      jsonb_build_object('invoice_id', :inv_single_horse_3,
        'payment_method','cash','amount', round(:inv_single_horse_3_total/2,2)),
      jsonb_build_object('invoice_id', :inv_single_horse_3,
        'payment_method','card','amount', :inv_single_horse_3_total - round(:inv_single_horse_3_total/2,2))
    )));
SELECT lives_ok('EXECUTE t03', '03. split-tender two methods same invoice');

-- 4. two Invoices for the same Client.
PREPARE t04 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(
      jsonb_build_object('invoice_id', :inv_a, 'payment_method','cash','amount', :inv_a_total),
      jsonb_build_object('invoice_id', :inv_b, 'payment_method','cash','amount', :inv_b_total)
    )));
SELECT lives_ok('EXECUTE t04', '04. two invoices same client succeeds');

-- 5. multi-Horse Invoice with matching explicit Horse allocation.
PREPARE t05 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_multi_horse, 'payment_method','cash',
      'amount', :inv_multi_horse_total,
      'horse_allocations', jsonb_build_array(
        jsonb_build_object('horse_id', :horse_1, 'amount', :inv_multi_horse_horse_1_amount),
        jsonb_build_object('horse_id', :horse_2, 'amount', :inv_multi_horse_horse_2_amount)
      )
    ))));
SELECT lives_ok('EXECUTE t05', '05. multi-horse invoice explicit horse allocation');

-- 6. Client-Level-only Invoice.
PREPARE t06 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object(
    'payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_client_level, 'payment_method','cash',
      'amount', :inv_client_level_total))
  ));
SELECT lives_ok('EXECUTE t06', '06. client-level-only invoice succeeds');

-- 7. same key + same Payload replay -> idempotency.replay = true.
DO $$
DECLARE k uuid := gen_random_uuid(); r1 jsonb; r2 jsonb;
BEGIN
  r1 := public.post_payment_session(
    (SELECT current_setting('tests.tenant')::uuid), k,
    jsonb_build_object('payment_date', current_date,
      'allocations', jsonb_build_array(jsonb_build_object(
        'invoice_id', (SELECT current_setting('tests.inv_idem'))::uuid,
        'payment_method','cash',
        'amount', (SELECT current_setting('tests.inv_idem_total'))::numeric))));
  r2 := public.post_payment_session(
    (SELECT current_setting('tests.tenant')::uuid), k,
    jsonb_build_object('payment_date', current_date,
      'allocations', jsonb_build_array(jsonb_build_object(
        'invoice_id', (SELECT current_setting('tests.inv_idem'))::uuid,
        'payment_method','cash',
        'amount', (SELECT current_setting('tests.inv_idem_total'))::numeric))));
  IF (r1->>'session_id') <> (r2->>'session_id') THEN RAISE EXCEPTION 'replay session_id drift'; END IF;
END $$;
SELECT pass('07. same key + same payload returns identical session');

-- 8. same key + changed Payload -> FIN_IDEMPOTENCY_CONFLICT.
PREPARE t08 AS SELECT public.post_payment_session(
  :tenant_id, :shared_key,
  jsonb_build_object('payment_date', current_date + 1,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_idem_2, 'payment_method','cash',
      'amount', :inv_idem_2_total))));
SELECT throws_like('EXECUTE t08', '%FIN_IDEMPOTENCY_CONFLICT%',
  '08. changed payload with same key raises conflict');

-- 9. over-allocation rejection.
PREPARE t09 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_over, 'payment_method','cash',
      'amount', :inv_over_total + 1))));
SELECT throws_like('EXECUTE t09', '%FIN_INVOICE_OVER_ALLOCATION%',
  '09. amount exceeding outstanding rejected');

-- 10. Invoice from another Client rejected.
PREPARE t10 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(
      jsonb_build_object('invoice_id', :inv_client_a, 'payment_method','cash','amount', 10),
      jsonb_build_object('invoice_id', :inv_client_b, 'payment_method','cash','amount', 10))));
SELECT throws_like('EXECUTE t10', '%FIN_INVOICE_CROSS_CLIENT%',
  '10. cross-client invoices rejected');

-- 11. Invoice from another Tenant rejected.
PREPARE t11 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_other_tenant, 'payment_method','cash','amount', 10))));
SELECT throws_like('EXECUTE t11', '%FIN_INVOICE_CROSS_TENANT%',
  '11. cross-tenant invoice rejected');

-- 12. Multi-horse invoice with omitted horse allocation.
PREPARE t12 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_multi_horse_2, 'payment_method','cash',
      'amount', :inv_multi_horse_2_total))));
SELECT throws_like('EXECUTE t12', '%FIN_HORSE_ALLOCATION_REQUIRED%',
  '12. multi-horse invoice without horse_allocations rejected');

-- 13. Horse not on invoice rejected.
PREPARE t13 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_multi_horse_3, 'payment_method','cash',
      'amount', :inv_multi_horse_3_total,
      'horse_allocations', jsonb_build_array(
        jsonb_build_object('horse_id', :unrelated_horse, 'amount', :inv_multi_horse_3_total))))));
SELECT throws_like('EXECUTE t13', '%FIN_HORSE_NOT_ON_INVOICE%',
  '13. horse not present on invoice rejected');

-- 14. actor without finance.payment.create permission rejected.
--     (Switch to a role bound to a user_id lacking the permission.)
SET LOCAL request.jwt.claim.sub TO :unprivileged_actor;
PREPARE t14 AS SELECT public.post_payment_session(
  :tenant_id, gen_random_uuid(),
  jsonb_build_object('payment_date', current_date,
    'allocations', jsonb_build_array(jsonb_build_object(
      'invoice_id', :inv_single_horse_4, 'payment_method','cash',
      'amount', :inv_single_horse_4_total))));
SELECT throws_like('EXECUTE t14', '%FIN_PERMISSION_DENIED%',
  '14. actor without payment.create rejected');
RESET request.jwt.claim.sub;

-- 15. Invalid second allocation causes full transaction rollback.
--     (Second allocation targets a foreign-tenant invoice; first must not persist.)
DO $$
DECLARE k uuid := gen_random_uuid(); before_ct bigint; after_ct bigint;
BEGIN
  SELECT COUNT(*) INTO before_ct FROM public.payment_sessions;
  BEGIN
    PERFORM public.post_payment_session(
      (SELECT current_setting('tests.tenant')::uuid), k,
      jsonb_build_object('payment_date', current_date,
        'allocations', jsonb_build_array(
          jsonb_build_object('invoice_id',
            (SELECT current_setting('tests.inv_rollback'))::uuid,
            'payment_method','cash','amount',10),
          jsonb_build_object('invoice_id',
            (SELECT current_setting('tests.inv_other_tenant'))::uuid,
            'payment_method','cash','amount',10))));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT COUNT(*) INTO after_ct FROM public.payment_sessions;
  IF after_ct <> before_ct THEN RAISE EXCEPTION 'partial session persisted (before=%, after=%)', before_ct, after_ct; END IF;
END $$;
SELECT pass('15. invalid second allocation rolls back full session');

-- 16. get_payment_session returns persisted structure.
DO $$
DECLARE
  sid uuid;
  writer jsonb;
  reader jsonb;
BEGIN
  writer := public.post_payment_session(
    (SELECT current_setting('tests.tenant')::uuid), gen_random_uuid(),
    jsonb_build_object('payment_date', current_date,
      'allocations', jsonb_build_array(jsonb_build_object(
        'invoice_id', (SELECT current_setting('tests.inv_reader'))::uuid,
        'payment_method','cash',
        'amount', (SELECT current_setting('tests.inv_reader_total'))::numeric))));
  sid := (writer->>'session_id')::uuid;
  reader := public.get_payment_session(
    (SELECT current_setting('tests.tenant')::uuid), sid);
  IF (reader->>'session_id')::uuid <> sid THEN RAISE EXCEPTION 'reader session_id drift'; END IF;
  IF (reader->>'total_amount')::numeric <> (writer->>'total_amount')::numeric
     THEN RAISE EXCEPTION 'reader total mismatch'; END IF;
  IF jsonb_array_length(reader->'allocations') <> 1 THEN RAISE EXCEPTION 'reader alloc count mismatch'; END IF;
END $$;
SELECT pass('16. get_payment_session returns persisted session structure');

SELECT * FROM finish();
ROLLBACK;

-- =========================================================================
-- Runtime status: AUTHORED and STATICALLY REVIEWED.
-- No qualified pgTAP + role-switch runner is available in this environment.
-- Do not claim runtime-passing without execution logs from the CI harness.
-- =========================================================================
