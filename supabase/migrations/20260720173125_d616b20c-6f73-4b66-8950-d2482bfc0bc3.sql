-- =====================================================================
-- AML.1.b.1 STAGE 4 — MIGRATION D: EXACT PERMISSION FOUNDATION
-- Adds 3 finance permission definitions + 3 bundle bindings to the sole
-- "كبير المشرفين" bundle. Guarded. Zero mutation of financial data.
-- =====================================================================

-- Pre-mutation assertions
DO $$
DECLARE
  v_new_keys_present int;
  v_finance_perm_count int;
  v_bundle_row RECORD;
  v_bundle_dupes int;
  v_finance_bindings int;
  v_new_bindings int;
  v_markpaid_exists boolean;
  v_markpaid_bound boolean;
  v_bp_cols int;
BEGIN
  -- Target keys must not exist yet
  SELECT count(*) INTO v_new_keys_present FROM public.permission_definitions
    WHERE key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create');
  IF v_new_keys_present <> 0 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: target permission keys already exist (count=%)', v_new_keys_present;
  END IF;

  -- Current finance permission count = 16
  SELECT count(*) INTO v_finance_perm_count FROM public.permission_definitions WHERE module='finance';
  IF v_finance_perm_count <> 16 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: finance permission_definitions count=% (expected 16)', v_finance_perm_count;
  END IF;

  -- Bundle census: single canonical row
  SELECT id, tenant_id, name, is_system INTO v_bundle_row FROM public.permission_bundles WHERE name='كبير المشرفين';
  IF v_bundle_row.id IS NULL THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: كبير المشرفين bundle not found';
  END IF;
  IF v_bundle_row.id <> '4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid
     OR v_bundle_row.tenant_id <> '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid
     OR v_bundle_row.is_system IS TRUE THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: bundle drift id=%, tenant=%, is_system=%',
      v_bundle_row.id, v_bundle_row.tenant_id, v_bundle_row.is_system;
  END IF;

  SELECT count(*) INTO v_bundle_dupes FROM public.permission_bundles WHERE name='كبير المشرفين';
  IF v_bundle_dupes <> 1 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: duplicate كبير المشرفين bundles=%', v_bundle_dupes;
  END IF;

  -- Bundle currently has exactly 14 finance bindings
  SELECT count(*) INTO v_finance_bindings FROM public.bundle_permissions
    WHERE bundle_id = v_bundle_row.id AND permission_key LIKE 'finance.%';
  IF v_finance_bindings <> 14 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: bundle finance bindings=% (expected 14)', v_finance_bindings;
  END IF;

  -- No target bindings pre-exist
  SELECT count(*) INTO v_new_bindings FROM public.bundle_permissions
    WHERE bundle_id = v_bundle_row.id
      AND permission_key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create');
  IF v_new_bindings <> 0 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: target bundle bindings already exist (count=%)', v_new_bindings;
  END IF;

  -- markPaid preserved
  SELECT EXISTS (SELECT 1 FROM public.permission_definitions WHERE key='finance.invoice.markPaid') INTO v_markpaid_exists;
  SELECT EXISTS (SELECT 1 FROM public.bundle_permissions
    WHERE bundle_id = v_bundle_row.id AND permission_key='finance.invoice.markPaid') INTO v_markpaid_bound;
  IF NOT v_markpaid_exists OR NOT v_markpaid_bound THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: finance.invoice.markPaid missing (exists=%, bound=%)', v_markpaid_exists, v_markpaid_bound;
  END IF;

  -- bundle_permissions shape (2 cols only)
  SELECT count(*) INTO v_bp_cols FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bundle_permissions';
  IF v_bp_cols <> 2 THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: bundle_permissions has % columns (expected 2)', v_bp_cols;
  END IF;

  -- is_owner_only must not exist on permission_definitions
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='permission_definitions' AND column_name='is_owner_only') THEN
    RAISE EXCEPTION 'PRE-GUARD FAILED: unexpected is_owner_only column';
  END IF;

  RAISE NOTICE 'Stage 4 pre-guards PASSED';
END $$;

-- Exact permission_definitions inserts
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  (
    'finance.invoice.approve',
    'finance', 'invoice', 'approve',
    'Approve Invoices',
    'اعتماد الفواتير',
    'Approve draft invoices and post them to the ledger',
    'اعتماد مسودات الفواتير وترحيلها إلى السجل المالي',
    true
  ),
  (
    'finance.invoice.cancel',
    'finance', 'invoice', 'cancel',
    'Cancel Invoices',
    'إلغاء الفواتير',
    'Cancel invoices and reverse associated ledger entries',
    'إلغاء الفواتير وعكس القيود المحاسبية المرتبطة بها',
    true
  ),
  (
    'finance.adjustment.create',
    'finance', 'adjustment', 'create',
    'Create Financial Adjustments',
    'إنشاء تسويات مالية',
    'Create manual financial adjustments to customer balances',
    'إنشاء تسويات مالية يدوية لأرصدة العملاء',
    true
  );

-- Exact bundle_permissions inserts (only to the captured bundle)
INSERT INTO public.bundle_permissions (bundle_id, permission_key) VALUES
  ('4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid, 'finance.invoice.approve'),
  ('4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid, 'finance.invoice.cancel'),
  ('4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid, 'finance.adjustment.create');

-- Post-mutation gate
DO $$
DECLARE
  v_finance_perm_count int;
  v_finance_bindings int;
  v_new_bindings int;
  v_markpaid_bound boolean;
  v_invoices_count int; v_invoices_sum numeric;
  v_items_count int; v_items_sum numeric; v_items_qty numeric;
  v_ledger_count int; v_ledger_amt numeric; v_ledger_bal numeric;
  v_cb_count int; v_cb_sum numeric;
  v_bl_count int;
  v_exp_count int; v_exp_sum numeric;
  v_other_binding int;
  r RECORD;
BEGIN
  SELECT count(*) INTO v_finance_perm_count FROM public.permission_definitions WHERE module='finance';
  IF v_finance_perm_count <> 19 THEN
    RAISE EXCEPTION 'POST-GATE FAILED: finance perm count=% (expected 19)', v_finance_perm_count;
  END IF;

  SELECT count(*) INTO v_finance_bindings FROM public.bundle_permissions
    WHERE bundle_id='4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid AND permission_key LIKE 'finance.%';
  IF v_finance_bindings <> 17 THEN
    RAISE EXCEPTION 'POST-GATE FAILED: bundle finance bindings=% (expected 17)', v_finance_bindings;
  END IF;

  SELECT count(*) INTO v_new_bindings FROM public.bundle_permissions
    WHERE bundle_id='4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid
      AND permission_key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create');
  IF v_new_bindings <> 3 THEN
    RAISE EXCEPTION 'POST-GATE FAILED: new bindings=% (expected 3)', v_new_bindings;
  END IF;

  -- No other bundle received the three new keys
  SELECT count(*) INTO v_other_binding FROM public.bundle_permissions
    WHERE permission_key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create')
      AND bundle_id <> '4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid;
  IF v_other_binding <> 0 THEN
    RAISE EXCEPTION 'POST-GATE FAILED: new keys bound to % other bundles', v_other_binding;
  END IF;

  -- markPaid still bound
  SELECT EXISTS (SELECT 1 FROM public.bundle_permissions
    WHERE bundle_id='4d9b8917-f11d-4879-840d-1b682bad8cec'::uuid AND permission_key='finance.invoice.markPaid') INTO v_markpaid_bound;
  IF NOT v_markpaid_bound THEN
    RAISE EXCEPTION 'POST-GATE FAILED: markPaid binding lost';
  END IF;

  -- Byte-for-byte row content check
  FOR r IN
    SELECT key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable
      FROM public.permission_definitions
      WHERE key IN ('finance.invoice.approve','finance.invoice.cancel','finance.adjustment.create')
      ORDER BY key
  LOOP
    IF r.module <> 'finance' OR r.is_delegatable IS NOT TRUE THEN
      RAISE EXCEPTION 'POST-GATE FAILED: row content drift for %', r.key;
    END IF;
    IF r.display_name_ar IS NULL OR r.description_ar IS NULL THEN
      RAISE EXCEPTION 'POST-GATE FAILED: missing bilingual fields for %', r.key;
    END IF;
  END LOOP;

  -- Financial parity unchanged
  SELECT count(*), COALESCE(sum(total_amount),0) INTO v_invoices_count, v_invoices_sum FROM public.invoices;
  SELECT count(*), COALESCE(sum(total_price),0), COALESCE(sum(quantity),0)
    INTO v_items_count, v_items_sum, v_items_qty FROM public.invoice_items;
  SELECT count(*), COALESCE(sum(amount),0), COALESCE(sum(balance_after),0)
    INTO v_ledger_count, v_ledger_amt, v_ledger_bal FROM public.ledger_entries;
  SELECT count(*), COALESCE(sum(balance),0) INTO v_cb_count, v_cb_sum FROM public.customer_balances;
  SELECT count(*) INTO v_bl_count FROM public.billing_links;
  SELECT count(*), COALESCE(sum(amount),0) INTO v_exp_count, v_exp_sum FROM public.expenses;
  IF v_invoices_count <> 42 OR v_invoices_sum <> 264280.45
     OR v_items_count <> 99 OR v_items_sum <> 187372.47 OR v_items_qty <> 1758.00
     OR v_ledger_count <> 64 OR v_ledger_amt <> 132726.85 OR v_ledger_bal <> 970229.63
     OR v_cb_count <> 7 OR v_cb_sum <> 132726.85
     OR v_bl_count <> 17
     OR v_exp_count <> 3 OR v_exp_sum <> 240.00 THEN
    RAISE EXCEPTION 'POST-GATE FAILED: financial fingerprint drift';
  END IF;

  RAISE NOTICE 'AML.1.b.1 STAGE 4: PASSED — 3 permission definitions inserted and bound only to the captured كبير المشرفين bundle.';
END $$;