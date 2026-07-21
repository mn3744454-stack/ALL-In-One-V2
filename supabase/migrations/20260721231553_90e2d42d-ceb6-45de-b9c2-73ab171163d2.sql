-- AML.1.b.1 Stage 6 Non-POS Public RPC Boundary: §§7.6–7.12 + §7.14
-- Eight canonical finance/HR RPCs. §7.13 pos_finalize_sale intentionally excluded.
-- All functions: SECURITY DEFINER, search_path='', owner postgres.
-- Level-I idempotency via _finance_idempotency_begin/_complete.

CREATE OR REPLACE FUNCTION public.post_payment(
  p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid,
  p_amount numeric, p_payment_date date, p_payment_method text,
  p_account_id uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'post_payment';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_inv record; v_paid_abs numeric; v_outstanding numeric; v_new_outstanding numeric;
  v_new_status text; v_ledger_id uuid; v_link_id uuid; v_desc text; v_meta jsonb;
  v_key text; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL
     OR p_amount IS NULL OR p_payment_date IS NULL OR p_payment_method IS NULL
     OR p_account_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'FIN_PAYMENT_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;

  IF p_payload IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
      IF v_key NOT IN ('notes','currency','reference') THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='22023';
      END IF;
    END LOOP;
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id);
  v_intent := jsonb_build_object('amount', p_amount, 'payment_date', p_payment_date,
    'payment_method', p_payment_method, 'account_id', p_account_id,
    'payload', COALESCE(p_payload,'{}'::jsonb));
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id));

  SELECT * INTO v_inv FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_inv.status NOT IN ('approved','partial') THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_PAYABLE' USING ERRCODE='42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_accounts
                  WHERE id = p_account_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_PAYMENT_ACCOUNT_INVALID' USING ERRCODE='23503';
  END IF;

  IF (p_payload ? 'currency')
     AND NULLIF(p_payload->>'currency','') IS DISTINCT FROM COALESCE(v_inv.currency,'SAR') THEN
    RAISE EXCEPTION 'FIN_PAYMENT_CURRENCY_MISMATCH' USING ERRCODE='23514';
  END IF;

  SELECT COALESCE(SUM(-amount), 0) INTO v_paid_abs
    FROM public.ledger_entries
   WHERE tenant_id = p_tenant_id AND reference_type='invoice'
     AND reference_id = p_invoice_id AND entry_type='payment';
  v_outstanding := COALESCE(v_inv.total_amount,0) - COALESCE(v_paid_abs,0);
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'FIN_PAYMENT_OVERPAYMENT' USING ERRCODE='23514';
  END IF;

  v_desc := 'Payment for invoice ' || v_inv.invoice_number;
  v_meta := jsonb_build_object('account_id', p_account_id, 'via', 'post_payment');

  SELECT ledger_entry_id INTO v_ledger_id
    FROM public._finance_ledger_insert(
      p_tenant_id, v_inv.client_id, 'payment', 'invoice', p_invoice_id,
      -p_amount, p_payment_date, v_desc, p_payment_method, NULL, v_meta, v_actor);

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'payment', v_ledger_id));
  v_link_id := public._finance_billing_link_upsert(
    p_tenant_id, 'payment', v_ledger_id, p_invoice_id, 'final', p_amount, v_actor, NULL);

  v_new_outstanding := v_outstanding - p_amount;
  IF v_new_outstanding <= 0 THEN
    v_new_status := 'paid';
    UPDATE public.invoices SET status='paid', payment_received_at=now(),
      payment_method=COALESCE(payment_method, p_payment_method), updated_at=now()
     WHERE id = p_invoice_id;
  ELSE
    v_new_status := 'partial';
    UPDATE public.invoices SET status='partial',
      payment_method=COALESCE(payment_method, p_payment_method), updated_at=now()
     WHERE id = p_invoice_id;
  END IF;

  v_snapshot := jsonb_build_object('invoice_id', p_invoice_id, 'ledger_entry_id', v_ledger_id,
    'billing_link_id', v_link_id, 'remaining_after', v_new_outstanding,
    'invoice_status', v_new_status);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.create_expense(
  p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'create_expense';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_key text; v_id uuid := gen_random_uuid();
  v_category text; v_amount numeric; v_currency text; v_expense_date date;
  v_row record; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF v_key NOT IN ('category','description','amount','currency','expense_date',
                     'vendor_name','vendor_id','receipt_asset_id','notes') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='22023';
    END IF;
  END LOOP;

  v_category := NULLIF(p_payload->>'category','');
  v_amount   := NULLIF(p_payload->>'amount','')::numeric;
  v_currency := COALESCE(NULLIF(p_payload->>'currency',''), 'SAR');
  v_expense_date := COALESCE(NULLIF(p_payload->>'expense_date','')::date, CURRENT_DATE);
  IF v_category IS NULL THEN RAISE EXCEPTION 'FIN_EXPENSE_CATEGORY_INVALID' USING ERRCODE='23514'; END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'FIN_EXPENSE_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id);
  v_intent := jsonb_build_object('payload', p_payload);
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  INSERT INTO public.expenses (
    id, tenant_id, category, description, amount, currency, expense_date,
    vendor_name, vendor_id, receipt_asset_id, notes,
    status, ledger_status, source_type, source_reference, created_by
  ) VALUES (
    v_id, p_tenant_id, v_category, NULLIF(p_payload->>'description',''),
    v_amount, v_currency, v_expense_date,
    NULLIF(p_payload->>'vendor_name',''),
    NULLIF(p_payload->>'vendor_id','')::uuid,
    NULLIF(p_payload->>'receipt_asset_id','')::uuid,
    NULLIF(p_payload->>'notes',''),
    'pending', 'unposted', NULL, NULL, v_actor
  ) RETURNING * INTO v_row;

  v_snapshot := jsonb_build_object('expense_id', v_id, 'snapshot', to_jsonb(v_row));
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.update_expense(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'update_expense';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_key text; v_exp record; v_row record; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF v_key NOT IN ('category','description','amount','currency','expense_date',
                     'vendor_name','vendor_id','receipt_asset_id','notes') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='22023';
    END IF;
  END LOOP;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := jsonb_build_object('payload', p_payload);
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id));
  SELECT * INTO v_exp FROM public.expenses
   WHERE id = p_expense_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_exp.ledger_status IS NOT NULL AND v_exp.ledger_status <> 'unposted' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_STATE_INVALID' USING ERRCODE='42501'; END IF;
  IF v_exp.reverses_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_STATE_INVALID' USING ERRCODE='42501'; END IF;

  UPDATE public.expenses SET
    category         = COALESCE(NULLIF(p_payload->>'category',''), category),
    description      = CASE WHEN p_payload ? 'description' THEN NULLIF(p_payload->>'description','') ELSE description END,
    amount           = COALESCE(NULLIF(p_payload->>'amount','')::numeric, amount),
    currency         = COALESCE(NULLIF(p_payload->>'currency',''), currency),
    expense_date     = COALESCE(NULLIF(p_payload->>'expense_date','')::date, expense_date),
    vendor_name      = CASE WHEN p_payload ? 'vendor_name' THEN NULLIF(p_payload->>'vendor_name','') ELSE vendor_name END,
    vendor_id        = CASE WHEN p_payload ? 'vendor_id'   THEN NULLIF(p_payload->>'vendor_id','')::uuid ELSE vendor_id END,
    receipt_asset_id = CASE WHEN p_payload ? 'receipt_asset_id' THEN NULLIF(p_payload->>'receipt_asset_id','')::uuid ELSE receipt_asset_id END,
    notes            = CASE WHEN p_payload ? 'notes' THEN NULLIF(p_payload->>'notes','') ELSE notes END,
    updated_at       = now()
  WHERE id = p_expense_id
  RETURNING * INTO v_row;

  IF v_row.amount IS NOT NULL AND v_row.amount <= 0 THEN
    RAISE EXCEPTION 'FIN_EXPENSE_AMOUNT_INVALID' USING ERRCODE='23514';
  END IF;

  v_snapshot := to_jsonb(v_row);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.delete_expense(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'delete_expense';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_exp record; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := '{}'::jsonb;
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id));
  SELECT * INTO v_exp FROM public.expenses
   WHERE id = p_expense_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_exp.source_type = 'hr_salary_payment' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_HR_LOCKED' USING ERRCODE='42501'; END IF;
  IF v_exp.ledger_status IS NOT NULL AND v_exp.ledger_status <> 'unposted' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_POSTED' USING ERRCODE='42501'; END IF;
  IF v_exp.reverses_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_POSTED' USING ERRCODE='42501'; END IF;

  DELETE FROM public.expenses WHERE id = p_expense_id;

  v_snapshot := jsonb_build_object('deleted_expense_id', p_expense_id);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.post_expense_with_ledger(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'post_expense_with_ledger';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_exp record; v_ledger_id uuid; v_desc text; v_meta jsonb; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := '{}'::jsonb;
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id));
  SELECT * INTO v_exp FROM public.expenses
   WHERE id = p_expense_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_exp.ledger_status IS DISTINCT FROM 'unposted' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_STATE_INVALID' USING ERRCODE='42501'; END IF;
  IF v_exp.amount IS NULL OR v_exp.amount <= 0 THEN
    RAISE EXCEPTION 'FIN_EXPENSE_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;

  v_desc := COALESCE(v_exp.description, v_exp.category || COALESCE(' | ' || v_exp.vendor_name, ''));
  v_meta := jsonb_build_object('expense_id', p_expense_id, 'category', v_exp.category);

  SELECT ledger_entry_id INTO v_ledger_id
    FROM public._finance_ledger_insert(
      p_tenant_id, NULL, 'adjustment', 'expense', p_expense_id,
      v_exp.amount, v_exp.expense_date, v_desc, NULL, NULL, v_meta, v_actor);

  UPDATE public.expenses SET
    ledger_status='posted', posted_at=now(), ledger_entry_id=v_ledger_id,
    status=CASE WHEN status='pending' THEN 'approved' ELSE status END,
    updated_at=now()
  WHERE id = p_expense_id;

  v_snapshot := jsonb_build_object('expense_id', p_expense_id, 'ledger_entry_id', v_ledger_id,
    'effective_date', v_exp.expense_date);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.reverse_expense(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid,
  p_reason text, p_reversal_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'reverse_expense';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_exp record; v_rev_id uuid := gen_random_uuid();
  v_ledger_id uuid; v_desc text; v_meta jsonb; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL OR p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'FIN_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.manage')
     OR NOT public.has_permission(v_actor, p_tenant_id, 'finance.adjustment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := jsonb_build_object('reason', p_reason, 'reversal_date', p_reversal_date);
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id));
  SELECT * INTO v_exp FROM public.expenses
   WHERE id = p_expense_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_exp.source_type = 'hr_salary_payment' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_HR_REVERSAL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF v_exp.ledger_status IS DISTINCT FROM 'posted' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_NOT_REVERSIBLE' USING ERRCODE='42501'; END IF;
  IF v_exp.reverses_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_NOT_REVERSIBLE' USING ERRCODE='42501'; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'expense', v_rev_id));

  INSERT INTO public.expenses (
    id, tenant_id, category, description, amount, currency, expense_date,
    vendor_name, vendor_id, receipt_asset_id, notes,
    status, ledger_status, reverses_expense_id, created_by
  ) VALUES (
    v_rev_id, p_tenant_id, 'reversal',
    'Reversal of ' || v_exp.category || ' — ' || p_reason,
    v_exp.amount, v_exp.currency, p_reversal_date,
    v_exp.vendor_name, v_exp.vendor_id, NULL, p_reason,
    'approved', 'posted', p_expense_id, v_actor
  );

  v_desc := 'Reversal of expense ' || v_exp.category
            || COALESCE(' | ' || v_exp.vendor_name, '') || ' — ' || p_reason;
  v_meta := jsonb_build_object('reverses_expense_id', p_expense_id, 'reason', p_reason);

  SELECT ledger_entry_id INTO v_ledger_id
    FROM public._finance_ledger_insert(
      p_tenant_id, NULL, 'adjustment', 'expense', v_rev_id,
      -v_exp.amount, p_reversal_date, v_desc, NULL, NULL, v_meta, v_actor);

  UPDATE public.expenses SET ledger_entry_id = v_ledger_id WHERE id = v_rev_id;
  UPDATE public.expenses SET ledger_status='reversed', updated_at=now() WHERE id = p_expense_id;

  v_snapshot := jsonb_build_object('original_expense_id', p_expense_id,
    'reversal_expense_id', v_rev_id, 'reversal_ledger_entry_id', v_ledger_id,
    'effective_date', p_reversal_date, 'reason', p_reason);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.post_manual_ledger_adjustment(
  p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid,
  p_amount numeric, p_effective_date date, p_description text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'post_manual_ledger_adjustment';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_ref_id uuid := gen_random_uuid(); v_ledger_id uuid;
  v_desc text; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_client_id IS NULL
     OR p_amount IS NULL OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.adjustment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
  IF p_amount = 0 THEN RAISE EXCEPTION 'FIN_ADJUSTMENT_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;
  v_desc := btrim(COALESCE(p_description, ''));
  IF v_desc = '' THEN RAISE EXCEPTION 'FIN_ADJUSTMENT_DESCRIPTION_REQUIRED' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients
                  WHERE id = p_client_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_CLIENT_NOT_IN_TENANT' USING ERRCODE='42501'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'client_id', p_client_id);
  v_intent := jsonb_build_object('amount', p_amount, 'effective_date', p_effective_date, 'description', v_desc);
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  SELECT ledger_entry_id INTO v_ledger_id
    FROM public._finance_ledger_insert(
      p_tenant_id, p_client_id, 'adjustment', 'adjustment', v_ref_id,
      p_amount, p_effective_date, v_desc, NULL, NULL,
      jsonb_build_object('kind','manual','idempotency_key', p_idempotency_key), v_actor);

  v_snapshot := jsonb_build_object('ledger_entry_id', v_ledger_id,
    'effective_date', p_effective_date, 'amount', p_amount);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

CREATE OR REPLACE FUNCTION public.record_salary_payment(
  p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid,
  p_amount numeric, p_currency text, p_paid_at timestamptz,
  p_payment_period text, p_notes text, p_create_expense boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_op text := 'record_salary_payment';
  v_source jsonb; v_intent jsonb; v_replay boolean; v_hash bytea; v_stored jsonb;
  v_salary_id uuid := gen_random_uuid();
  v_expense_id uuid; v_ledger_id uuid; v_biz_date date;
  v_expense_payload jsonb; v_desc text; v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_employee_id IS NULL
     OR p_amount IS NULL OR p_currency IS NULL OR p_paid_at IS NULL
     OR p_create_expense IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023'; END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  -- Live permission catalog does not define hr.salary.pay; fall back to hr.manage per §2 precedence.
  IF NOT public.has_permission(v_actor, p_tenant_id, 'hr.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'FIN_SALARY_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;
  IF btrim(p_currency) = '' THEN RAISE EXCEPTION 'FIN_SALARY_AMOUNT_INVALID' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hr_employees
                  WHERE id = p_employee_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_EMPLOYEE_NOT_IN_TENANT' USING ERRCODE='42501'; END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'employee_id', p_employee_id);
  v_intent := jsonb_build_object('amount', p_amount, 'currency', p_currency,
    'paid_at', p_paid_at, 'payment_period', p_payment_period,
    'notes', p_notes, 'create_expense', p_create_expense);
  SELECT is_replay, request_hash, stored_response INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN RETURN v_stored; END IF;

  PERFORM pg_advisory_xact_lock(public._finance_source_lock_key(p_tenant_id, 'hr_salary_payment', p_employee_id));

  v_biz_date := public._finance_riyadh_date(p_paid_at);

  INSERT INTO public.hr_salary_payments (
    id, tenant_id, employee_id, amount, currency, paid_at,
    payment_period, notes, created_by
  ) VALUES (
    v_salary_id, p_tenant_id, p_employee_id, p_amount, p_currency, p_paid_at,
    NULLIF(p_payment_period,''), NULLIF(p_notes,''), v_actor
  );

  IF p_create_expense THEN
    v_expense_payload := jsonb_build_object(
      'category', 'salary', 'amount', p_amount, 'currency', p_currency,
      'expense_date', v_biz_date,
      'description', 'Salary payment' || COALESCE(' — ' || NULLIF(p_payment_period,''), '')
    );
    v_expense_id := public._finance_expense_create_sourced(
      p_tenant_id, v_actor, v_expense_payload, 'hr_salary_payment', v_salary_id
    );
    v_desc := 'Salary payment' || COALESCE(' — ' || NULLIF(p_payment_period,''), '');

    SELECT ledger_entry_id INTO v_ledger_id
      FROM public._finance_ledger_insert(
        p_tenant_id, NULL, 'adjustment', 'expense', v_expense_id,
        p_amount, v_biz_date, v_desc, NULL, NULL,
        jsonb_build_object('salary_payment_id', v_salary_id, 'employee_id', p_employee_id),
        v_actor);

    UPDATE public.expenses SET
      status='approved', ledger_status='posted', posted_at=now(),
      ledger_entry_id=v_ledger_id, updated_at=now()
    WHERE id = v_expense_id;

    UPDATE public.hr_salary_payments SET finance_expense_id = v_expense_id WHERE id = v_salary_id;
  END IF;

  v_snapshot := jsonb_build_object('salary_payment_id', v_salary_id,
    'expense_id', v_expense_id, 'ledger_entry_id', v_ledger_id);
  PERFORM public._finance_idempotency_complete(p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot);
  RETURN v_snapshot;
END
$function$;

-- ACL posture: mirror §7.1–§7.5 (execute to authenticated + service_role, revoke PUBLIC/anon)
REVOKE ALL ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_expense(uuid,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_expense(uuid,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_expense(uuid,uuid,jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_expense(uuid,uuid,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_expense(uuid,uuid,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_expense(uuid,uuid,uuid,jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_expense(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_expense(uuid,uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_expense(uuid,uuid,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) FROM anon;
GRANT EXECUTE ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) TO authenticated, service_role;
