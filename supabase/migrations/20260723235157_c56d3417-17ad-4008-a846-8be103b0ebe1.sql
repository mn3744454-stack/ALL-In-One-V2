-- Phase N+1B · J3.3 authenticated RPC verification (self-cleaning).
-- This migration MUST leave zero permanent database objects. Every fixture is
-- created, exercised, and then removed inside a single transaction. Any failed
-- assertion raises a named error and rolls back the entire migration.

DO $verify$
DECLARE
  v_tenant        uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_user          uuid := '98439fe8-6881-4e9e-8ff6-18aca0ce4470';
  v_client_id     uuid := '99999999-1b03-4a5c-8000-000000000001';
  v_ts_id         uuid;
  v_other_ts_id   uuid;
  v_other_lab_id  uuid;
  v_other_plan_id uuid;

  v_inv_t2   uuid;
  v_inv_t7   uuid;
  v_inv_t8   uuid;
  v_inv_t9a  uuid;
  v_inv_t9b  uuid;
  v_inv_t10  uuid;
  v_inv_t11a uuid;
  v_inv_t11b uuid;

  v_today text := ((now() AT TIME ZONE 'Asia/Riyadh')::date)::text;

  -- Snapshot bookkeeping
  v_before_inv_count      bigint;
  v_before_inv_sum        numeric;
  v_before_item_count     bigint;
  v_before_ledger_count   bigint;
  v_before_ledger_sum     numeric;
  v_before_billing        bigint;
  v_before_cb             bigint;
  v_before_cb_sum         numeric;
  v_before_counter        bigint;
  v_before_tenant_rate    numeric;
  v_before_tenant_incl    boolean;

  v_after_bigint  bigint;
  v_after_numeric numeric;

  v_it record;
  v_iv record;
  v_err text;
BEGIN
  ------------------------------------------------------------------
  -- 1. Snapshot side-effect state BEFORE any writes.
  ------------------------------------------------------------------
  SELECT count(*), COALESCE(SUM(total_amount), 0)
    INTO v_before_inv_count, v_before_inv_sum
    FROM public.invoices;
  SELECT count(*) INTO v_before_item_count FROM public.invoice_items;
  SELECT count(*), COALESCE(SUM(amount), 0)
    INTO v_before_ledger_count, v_before_ledger_sum
    FROM public.ledger_entries;
  SELECT count(*) INTO v_before_billing  FROM public.billing_links;
  SELECT count(*), COALESCE(SUM(balance), 0)
    INTO v_before_cb, v_before_cb_sum
    FROM public.customer_balances;
  SELECT next_value INTO v_before_counter
    FROM public.finance_invoice_number_counters
   WHERE tenant_id = v_tenant AND domain = 'manual';
  SELECT default_tax_rate, prices_tax_inclusive
    INTO v_before_tenant_rate, v_before_tenant_incl
    FROM public.tenants WHERE id = v_tenant;

  RAISE NOTICE 'N1B_J3_VERIFY BEFORE inv=% inv_sum=% items=% ledger=% ledger_sum=% billing=% cb=% cb_sum=% counter=% rate=% incl=%',
    v_before_inv_count, v_before_inv_sum, v_before_item_count,
    v_before_ledger_count, v_before_ledger_sum,
    v_before_billing, v_before_cb, v_before_cb_sum,
    v_before_counter, v_before_tenant_rate, v_before_tenant_incl;

  ------------------------------------------------------------------
  -- 2. Establish authenticated identity for the RPCs.
  ------------------------------------------------------------------
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
    true
  );
  PERFORM set_config(
    'request.jwt.claim.sub',
    v_user::text,
    true
  );

  IF NOT public.is_active_tenant_member(v_user, v_tenant) THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_FIXTURE_ACTOR_NOT_MEMBER';
  END IF;
  IF NOT public.has_permission(v_user, v_tenant, 'finance.invoice.create')
     OR NOT public.has_permission(v_user, v_tenant, 'finance.invoice.approve')
     OR NOT public.has_permission(v_user, v_tenant, 'finance.invoice.update') THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_FIXTURE_ACTOR_MISSING_PERMISSIONS';
  END IF;

  ------------------------------------------------------------------
  -- 3. Establish deterministic tenant tax config for the tests.
  ------------------------------------------------------------------
  UPDATE public.tenants
     SET default_tax_rate    = 15,
         prices_tax_inclusive = false
   WHERE id = v_tenant;

  ------------------------------------------------------------------
  -- 4. Fixture Client + Tenant Service (non-taxable).
  ------------------------------------------------------------------
  INSERT INTO public.clients (id, tenant_id, name, type, status)
  VALUES (v_client_id, v_tenant, '__N1B_J3_VERIFY__ Client', 'individual', 'active');

  v_ts_id := gen_random_uuid();
  INSERT INTO public.tenant_services
    (id, tenant_id, name, is_active, is_taxable, unit_price, service_kind)
  VALUES
    (v_ts_id, v_tenant, '__N1B_J3_VERIFY__ NonTaxable Service',
     true, false, 100, 'service');

  SELECT id INTO v_other_ts_id
    FROM public.tenant_services
   WHERE tenant_id <> v_tenant AND is_active LIMIT 1;
  SELECT id INTO v_other_lab_id
    FROM public.lab_services
   WHERE tenant_id <> v_tenant AND is_active LIMIT 1;
  SELECT id INTO v_other_plan_id
    FROM public.stable_service_plans
   WHERE tenant_id <> v_tenant AND is_active LIMIT 1;

  IF v_other_ts_id IS NULL OR v_other_lab_id IS NULL OR v_other_plan_id IS NULL THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_MISSING_CROSS_TENANT_FIXTURES ts=% lab=% plan=%',
      v_other_ts_id, v_other_lab_id, v_other_plan_id;
  END IF;

  ------------------------------------------------------------------
  -- T2 · Actual non-taxable Tenant Service @ tenant 15%
  ------------------------------------------------------------------
  v_inv_t2 := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id',  v_client_id,
      'issue_date', v_today,
      'items', jsonb_build_array(jsonb_build_object(
        'service_id',     v_ts_id,
        'service_source', 'tenant_services',
        'quantity',       1
      ))
    )
  ) ->> 'invoice_id')::uuid;

  SELECT * INTO v_it FROM public.invoice_items WHERE invoice_id = v_inv_t2;
  IF v_it.taxable_snapshot IS NOT FALSE
     OR v_it.tax_rate_snapshot <> 15
     OR v_it.line_pretax_amount <> 100
     OR v_it.line_tax_amount   <> 0
     OR v_it.line_gross_amount <> 100 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T2_FAILED taxable=% rate=% pre=% tax=% gross=%',
      v_it.taxable_snapshot, v_it.tax_rate_snapshot,
      v_it.line_pretax_amount, v_it.line_tax_amount, v_it.line_gross_amount;
  END IF;
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t2;
  IF v_iv.prices_include_tax IS NOT FALSE
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 0 OR v_iv.total_amount <> 100 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T2_HEADER_FAILED mode=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T2 PASSED (non-taxable service snapshots 15%%/0/100)';

  ------------------------------------------------------------------
  -- T7 · Create with omitted mode → tenant default (false)
  ------------------------------------------------------------------
  v_inv_t7 := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id',  v_client_id,
      'issue_date', v_today,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ manual', 'quantity', 1, 'unit_price', 100
      ))
    )
  ) ->> 'invoice_id')::uuid;
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t7;
  IF v_iv.prices_include_tax IS NOT FALSE
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T7_FAILED mode=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T7 PASSED (omitted mode = tenant default false)';

  ------------------------------------------------------------------
  -- T8 · Create with explicit override (true) vs tenant default (false)
  ------------------------------------------------------------------
  v_inv_t8 := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id',  v_client_id,
      'issue_date', v_today,
      'prices_include_tax', true,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ incl', 'quantity', 1, 'unit_price', 115
      ))
    )
  ) ->> 'invoice_id')::uuid;
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t8;
  SELECT * INTO v_it FROM public.invoice_items WHERE invoice_id = v_inv_t8;
  IF v_iv.prices_include_tax IS NOT TRUE
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115
     OR v_it.line_pretax_amount <> 100 OR v_it.line_tax_amount <> 15 OR v_it.line_gross_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T8_FAILED mode=% sub=% tax=% total=% pre=% t=% g=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount,
      v_it.line_pretax_amount, v_it.line_tax_amount, v_it.line_gross_amount;
  END IF;
  IF (SELECT prices_tax_inclusive FROM public.tenants WHERE id = v_tenant) IS NOT FALSE THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T8_TENANT_MUTATED';
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T8 PASSED (explicit override honored, tenant unchanged)';

  ------------------------------------------------------------------
  -- T9A · Persisted TRUE, update omitted mode → stays TRUE
  ------------------------------------------------------------------
  v_inv_t9a := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', true,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t9a', 'quantity', 1, 'unit_price', 115
      ))
    )
  ) ->> 'invoice_id')::uuid;
  PERFORM public.update_invoice_with_items(
    v_tenant, gen_random_uuid(), v_inv_t9a,
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t9a', 'quantity', 2, 'unit_price', 115
      ))
    )
  );
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t9a;
  IF v_iv.prices_include_tax IS NOT TRUE
     OR v_iv.subtotal <> 200 OR v_iv.tax_amount <> 30 OR v_iv.total_amount <> 230 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T9A_FAILED mode=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;

  ------------------------------------------------------------------
  -- T9B · Persisted FALSE, update omitted mode → stays FALSE
  ------------------------------------------------------------------
  v_inv_t9b := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', false,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t9b', 'quantity', 1, 'unit_price', 100
      ))
    )
  ) ->> 'invoice_id')::uuid;
  PERFORM public.update_invoice_with_items(
    v_tenant, gen_random_uuid(), v_inv_t9b,
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t9b', 'quantity', 2, 'unit_price', 100
      ))
    )
  );
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t9b;
  IF v_iv.prices_include_tax IS NOT FALSE
     OR v_iv.subtotal <> 200 OR v_iv.tax_amount <> 30 OR v_iv.total_amount <> 230 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T9B_FAILED mode=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T9 PASSED (omitted update preserves persisted mode)';

  ------------------------------------------------------------------
  -- T10 · Explicit update override false→true then true→false
  ------------------------------------------------------------------
  v_inv_t10 := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', false,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t10', 'quantity', 1, 'unit_price', 100
      ))
    )
  ) ->> 'invoice_id')::uuid;

  -- false → true
  PERFORM public.update_invoice_with_items(
    v_tenant, gen_random_uuid(), v_inv_t10,
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', true,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t10', 'quantity', 1, 'unit_price', 115
      ))
    )
  );
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t10;
  SELECT * INTO v_it FROM public.invoice_items WHERE invoice_id = v_inv_t10;
  IF v_iv.prices_include_tax IS NOT TRUE
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115
     OR v_it.line_pretax_amount <> 100 OR v_it.line_tax_amount <> 15 OR v_it.line_gross_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T10_FALSE_TO_TRUE_FAILED mode=% sub=% tax=% total=% pre=% t=% g=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount,
      v_it.line_pretax_amount, v_it.line_tax_amount, v_it.line_gross_amount;
  END IF;

  -- true → false
  PERFORM public.update_invoice_with_items(
    v_tenant, gen_random_uuid(), v_inv_t10,
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', false,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t10', 'quantity', 1, 'unit_price', 100
      ))
    )
  );
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t10;
  SELECT * INTO v_it FROM public.invoice_items WHERE invoice_id = v_inv_t10;
  IF v_iv.prices_include_tax IS NOT FALSE
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115
     OR v_it.line_pretax_amount <> 100 OR v_it.line_tax_amount <> 15 OR v_it.line_gross_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T10_TRUE_TO_FALSE_FAILED mode=% sub=% tax=% total=% pre=% t=% g=%',
      v_iv.prices_include_tax, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount,
      v_it.line_pretax_amount, v_it.line_tax_amount, v_it.line_gross_amount;
  END IF;
  IF (SELECT prices_tax_inclusive FROM public.tenants WHERE id = v_tenant) IS NOT FALSE THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T10_TENANT_MUTATED';
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T10 PASSED (explicit override transitions honored)';

  ------------------------------------------------------------------
  -- T11A · Tenant OFF, draft ON, flip tenant ON, approve → still ON
  ------------------------------------------------------------------
  UPDATE public.tenants SET prices_tax_inclusive = false WHERE id = v_tenant;
  v_inv_t11a := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', true,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t11a', 'quantity', 1, 'unit_price', 115
      ))
    )
  ) ->> 'invoice_id')::uuid;
  UPDATE public.tenants SET prices_tax_inclusive = true WHERE id = v_tenant;
  PERFORM public.approve_invoice(v_tenant, gen_random_uuid(), v_inv_t11a);
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t11a;
  IF v_iv.prices_include_tax IS NOT TRUE
     OR v_iv.status <> 'approved'
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T11A_FAILED mode=% status=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.status, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;
  PERFORM 1 FROM public.ledger_entries
    WHERE reference_type = 'invoice' AND reference_id = v_inv_t11a
      AND entry_type = 'invoice' AND amount = 115;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T11A_LEDGER_MISSING';
  END IF;

  ------------------------------------------------------------------
  -- T11B · Tenant ON, draft OFF, flip tenant OFF, approve → still OFF
  ------------------------------------------------------------------
  UPDATE public.tenants SET prices_tax_inclusive = true WHERE id = v_tenant;
  v_inv_t11b := (public.create_invoice_with_items(
    v_tenant, gen_random_uuid(),
    jsonb_build_object(
      'client_id', v_client_id, 'issue_date', v_today,
      'prices_include_tax', false,
      'items', jsonb_build_array(jsonb_build_object(
        'description', '__N1B_J3_VERIFY__ t11b', 'quantity', 1, 'unit_price', 100
      ))
    )
  ) ->> 'invoice_id')::uuid;
  UPDATE public.tenants SET prices_tax_inclusive = false WHERE id = v_tenant;
  PERFORM public.approve_invoice(v_tenant, gen_random_uuid(), v_inv_t11b);
  SELECT * INTO v_iv FROM public.invoices WHERE id = v_inv_t11b;
  IF v_iv.prices_include_tax IS NOT FALSE
     OR v_iv.status <> 'approved'
     OR v_iv.subtotal <> 100 OR v_iv.tax_amount <> 15 OR v_iv.total_amount <> 115 THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_T11B_FAILED mode=% status=% sub=% tax=% total=%',
      v_iv.prices_include_tax, v_iv.status, v_iv.subtotal, v_iv.tax_amount, v_iv.total_amount;
  END IF;
  RAISE NOTICE 'N1B_J3_VERIFY T11 PASSED (approve preserves persisted tax mode)';

  ------------------------------------------------------------------
  -- T12 · Cross-tenant Tenant Service atomic rejection
  ------------------------------------------------------------------
  BEGIN
    PERFORM public.create_invoice_with_items(
      v_tenant, gen_random_uuid(),
      jsonb_build_object(
        'client_id', v_client_id, 'issue_date', v_today,
        'items', jsonb_build_array(jsonb_build_object(
          'service_id', v_other_ts_id, 'service_source', 'tenant_services',
          'quantity', 1
        ))
      )
    );
    RAISE EXCEPTION 'N1B_J3_VERIFY_T12_UNEXPECTED_SUCCESS';
  EXCEPTION
    WHEN sqlstate '23503' THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err NOT LIKE 'FIN_SERVICE_NOT_FOUND%' THEN
        RAISE EXCEPTION 'N1B_J3_VERIFY_T12_WRONG_ERROR %', v_err;
      END IF;
  END;

  ------------------------------------------------------------------
  -- T13 · Cross-tenant Laboratory Service atomic rejection
  ------------------------------------------------------------------
  BEGIN
    PERFORM public.create_invoice_with_items(
      v_tenant, gen_random_uuid(),
      jsonb_build_object(
        'client_id', v_client_id, 'issue_date', v_today,
        'items', jsonb_build_array(jsonb_build_object(
          'service_id', v_other_lab_id, 'service_source', 'lab_services',
          'quantity', 1
        ))
      )
    );
    RAISE EXCEPTION 'N1B_J3_VERIFY_T13_UNEXPECTED_SUCCESS';
  EXCEPTION
    WHEN sqlstate '23503' THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err NOT LIKE 'FIN_SERVICE_NOT_FOUND%' THEN
        RAISE EXCEPTION 'N1B_J3_VERIFY_T13_WRONG_ERROR %', v_err;
      END IF;
  END;

  ------------------------------------------------------------------
  -- T14 · Cross-tenant Package atomic rejection
  ------------------------------------------------------------------
  BEGIN
    PERFORM public.create_invoice_with_items(
      v_tenant, gen_random_uuid(),
      jsonb_build_object(
        'client_id', v_client_id, 'issue_date', v_today,
        'items', jsonb_build_array(jsonb_build_object(
          'package_id', v_other_plan_id, 'quantity', 1
        ))
      )
    );
    RAISE EXCEPTION 'N1B_J3_VERIFY_T14_UNEXPECTED_SUCCESS';
  EXCEPTION
    WHEN sqlstate '23503' THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
      IF v_err NOT LIKE 'FIN_PACKAGE_NOT_FOUND%' THEN
        RAISE EXCEPTION 'N1B_J3_VERIFY_T14_WRONG_ERROR %', v_err;
      END IF;
  END;
  RAISE NOTICE 'N1B_J3_VERIFY T12/T13/T14 PASSED (cross-tenant atomic rejection)';

  ------------------------------------------------------------------
  -- CLEANUP · remove every fixture side effect
  ------------------------------------------------------------------
  DELETE FROM public.ledger_entries
   WHERE reference_type = 'invoice'
     AND reference_id IN (
       v_inv_t2, v_inv_t7, v_inv_t8, v_inv_t9a, v_inv_t9b,
       v_inv_t10, v_inv_t11a, v_inv_t11b
     );
  DELETE FROM public.invoice_items
   WHERE invoice_id IN (
     v_inv_t2, v_inv_t7, v_inv_t8, v_inv_t9a, v_inv_t9b,
     v_inv_t10, v_inv_t11a, v_inv_t11b
   );
  DELETE FROM public.invoices
   WHERE id IN (
     v_inv_t2, v_inv_t7, v_inv_t8, v_inv_t9a, v_inv_t9b,
     v_inv_t10, v_inv_t11a, v_inv_t11b
   );
  DELETE FROM public.finance_request_idempotency
   WHERE tenant_id = v_tenant
     AND actor_id  = v_user
     AND operation IN ('create_invoice_with_items',
                       'update_invoice_with_items',
                       'approve_invoice');
  DELETE FROM public.customer_balances
   WHERE tenant_id = v_tenant AND client_id = v_client_id;
  DELETE FROM public.clients WHERE id = v_client_id;
  DELETE FROM public.tenant_services WHERE id = v_ts_id;

  -- Restore counter and tenant settings
  UPDATE public.finance_invoice_number_counters
     SET next_value = v_before_counter, updated_at = now()
   WHERE tenant_id = v_tenant AND domain = 'manual';
  UPDATE public.tenants
     SET default_tax_rate    = v_before_tenant_rate,
         prices_tax_inclusive = v_before_tenant_incl
   WHERE id = v_tenant;

  ------------------------------------------------------------------
  -- Residue + financial preservation checks
  ------------------------------------------------------------------
  SELECT count(*) INTO v_after_bigint FROM public.tenant_services WHERE name LIKE '__N1B_J3_VERIFY__%';
  IF v_after_bigint <> 0 THEN RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_TENANT_SERVICES=%', v_after_bigint; END IF;
  SELECT count(*) INTO v_after_bigint FROM public.clients WHERE name LIKE '__N1B_J3_VERIFY__%';
  IF v_after_bigint <> 0 THEN RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_CLIENTS=%', v_after_bigint; END IF;
  SELECT count(*) INTO v_after_bigint FROM public.invoice_items ii
    JOIN public.invoices i ON i.id = ii.invoice_id
   WHERE i.tenant_id = v_tenant AND ii.description LIKE '__N1B_J3_VERIFY__%';
  IF v_after_bigint <> 0 THEN RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_FIXTURE_ITEMS=%', v_after_bigint; END IF;

  SELECT count(*) INTO v_after_bigint FROM public.invoices;
  IF v_after_bigint <> v_before_inv_count THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_INV before=% after=%', v_before_inv_count, v_after_bigint;
  END IF;
  SELECT COALESCE(SUM(total_amount), 0) INTO v_after_numeric FROM public.invoices;
  IF v_after_numeric <> v_before_inv_sum THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_INV_SUM before=% after=%', v_before_inv_sum, v_after_numeric;
  END IF;
  SELECT count(*) INTO v_after_bigint FROM public.invoice_items;
  IF v_after_bigint <> v_before_item_count THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_ITEMS before=% after=%', v_before_item_count, v_after_bigint;
  END IF;
  SELECT count(*) INTO v_after_bigint FROM public.ledger_entries;
  IF v_after_bigint <> v_before_ledger_count THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_LEDGER before=% after=%', v_before_ledger_count, v_after_bigint;
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_after_numeric FROM public.ledger_entries;
  IF v_after_numeric <> v_before_ledger_sum THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_LEDGER_SUM before=% after=%', v_before_ledger_sum, v_after_numeric;
  END IF;
  SELECT count(*) INTO v_after_bigint FROM public.billing_links;
  IF v_after_bigint <> v_before_billing THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_BILLING before=% after=%', v_before_billing, v_after_bigint;
  END IF;
  SELECT count(*) INTO v_after_bigint FROM public.customer_balances;
  IF v_after_bigint <> v_before_cb THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_CB before=% after=%', v_before_cb, v_after_bigint;
  END IF;
  SELECT COALESCE(SUM(balance), 0) INTO v_after_numeric FROM public.customer_balances;
  IF v_after_numeric <> v_before_cb_sum THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_RESIDUE_CB_SUM before=% after=%', v_before_cb_sum, v_after_numeric;
  END IF;
  SELECT next_value INTO v_after_bigint
    FROM public.finance_invoice_number_counters
   WHERE tenant_id = v_tenant AND domain = 'manual';
  IF v_after_bigint <> v_before_counter THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_COUNTER_DRIFT before=% after=%', v_before_counter, v_after_bigint;
  END IF;
  IF (SELECT default_tax_rate    FROM public.tenants WHERE id = v_tenant) <> v_before_tenant_rate
     OR (SELECT prices_tax_inclusive FROM public.tenants WHERE id = v_tenant) IS DISTINCT FROM v_before_tenant_incl THEN
    RAISE EXCEPTION 'N1B_J3_VERIFY_TENANT_SETTINGS_DRIFT';
  END IF;

  RAISE NOTICE 'N1B_J3_VERIFY ALL AUTHENTICATED RPC TESTS PASSED — zero residue';
END
$verify$;
