-- ============================================================================
-- AML.1.b.1 N+2.2 — backend/RPC corrective migration
--
-- Scope:
--   * post_payment
--   * post_expense_with_ledger
--   * reverse_expense
--   * post_manual_ledger_adjustment
--   * record_salary_payment
--   * _finance_ledger_insert
--   * _finance_expense_create_sourced
--   * additive ledger entry-type and salary-period uniqueness enforcement
--
-- Explicitly out of scope: POS, frontend caller migration, reader cutover,
-- direct-table DML lockdown, historical repair, Phase 2, and protected Demo data.
--
-- Risk: Level 3 / Rollback Type B. The entry-type CHECK is widened and a
-- partial unique index is added after deterministic existing-data assertions.
-- No existing business row is updated, deleted, merged, or normalized.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Deterministic preflight. Abort instead of adapting silently to drift.
-- --------------------------------------------------------------------------
DO $preflight$
DECLARE
  v_def text;
  v_type text;
  v_duplicate_exists boolean;
  v_proc regprocedure;
  v_proc_name text;
BEGIN
  FOREACH v_proc_name IN ARRAY ARRAY[
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.reverse_expense(uuid,uuid,uuid,text,date)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamp with time zone,text,text,boolean)',
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)'
  ]
  LOOP
    v_proc := to_regprocedure(v_proc_name);
    IF v_proc IS NULL THEN
      RAISE EXCEPTION 'N2_2_PREFLIGHT_FUNCTION_MISSING: %', v_proc_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE p.oid = v_proc
        AND p.prosecdef
        AND r.rolname = 'postgres'
        AND COALESCE(p.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=""']::text[]
    ) THEN
      RAISE EXCEPTION 'N2_2_PREFLIGHT_FUNCTION_SECURITY_DRIFT: %', v_proc_name;
    END IF;
  END LOOP;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_type
  FROM pg_attribute a
  WHERE a.attrelid = 'public.expenses'::regclass
    AND a.attname = 'source_reference'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_SOURCE_REFERENCE_TYPE_DRIFT: expected uuid, got %', v_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_accounts'
      AND column_name = 'owner_type' AND udt_name = 'payment_owner_type'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_accounts'
      AND column_name = 'tenant_id' AND udt_name = 'uuid'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_accounts'
      AND column_name = 'is_active' AND data_type = 'boolean'
  ) THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_PAYMENT_ACCOUNT_SHAPE_DRIFT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_accounts'
      AND column_name = 'currency'
  ) THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_UNEXPECTED_PAYMENT_ACCOUNT_CURRENCY';
  END IF;

  IF EXISTS (
    WITH expected(column_name, udt_name) AS (
      VALUES
        ('payer_user_id', 'uuid'),
        ('payee_account_id', 'uuid'),
        ('tenant_id', 'uuid'),
        ('intent_type', 'payment_intent_type'),
        ('reference_type', 'payment_reference_type'),
        ('reference_id', 'uuid'),
        ('amount_display', 'text'),
        ('currency', 'text'),
        ('status', 'payment_status')
    )
    SELECT 1
    FROM expected e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = 'payment_intents'
     AND c.column_name = e.column_name
    WHERE c.column_name IS NULL OR c.udt_name IS DISTINCT FROM e.udt_name
  ) THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_PAYMENT_INTENTS_SHAPE_DRIFT';
  END IF;

  IF EXISTS (
    WITH expected(table_name, column_name, udt_name) AS (
      VALUES
        ('invoices', 'client_id', 'uuid'),
        ('invoices', 'currency', 'text'),
        ('invoices', 'status', 'text'),
        ('invoices', 'total_amount', 'numeric'),
        ('invoices', 'payment_received_at', 'timestamptz'),
        ('ledger_entries', 'effective_date', 'date'),
        ('ledger_entries', 'metadata', 'jsonb'),
        ('customer_balances', 'balance', 'numeric'),
        ('expenses', 'ledger_status', 'text'),
        ('expenses', 'ledger_entry_id', 'uuid'),
        ('expenses', 'reverses_expense_id', 'uuid'),
        ('hr_employees', 'is_active', 'bool'),
        ('hr_salary_payments', 'payment_period', 'text'),
        ('hr_salary_payments', 'finance_expense_id', 'uuid'),
        ('tenants', 'currency', 'text')
    )
    SELECT 1
    FROM expected e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = e.table_name
     AND c.column_name = e.column_name
    WHERE c.column_name IS NULL OR c.udt_name IS DISTINCT FROM e.udt_name
  ) THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_FINANCE_SCHEMA_SHAPE_DRIFT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_intent_type'
      AND e.enumlabel = 'receivable'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_reference_type'
      AND e.enumlabel = 'invoice'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_status'
      AND e.enumlabel = 'paid'
  ) THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_PAYMENT_ENUM_DRIFT';
  END IF;

  SELECT pg_get_constraintdef(c.oid)
    INTO v_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.ledger_entries'::regclass
    AND c.conname = 'ledger_entries_entry_type_check'
    AND c.contype = 'c';

  IF v_def IS NULL
     OR position('invoice' in v_def) = 0
     OR position('payment' in v_def) = 0
     OR position('credit' in v_def) = 0
     OR position('adjustment' in v_def) = 0
     OR position('expense' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_LEDGER_ENTRY_TYPE_CONSTRAINT_DRIFT: %', v_def;
  END IF;

  IF to_regclass('public.hr_salary_payments_tenant_employee_period_uidx') IS NOT NULL THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_SALARY_PERIOD_INDEX_ALREADY_EXISTS';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.hr_salary_payments
    WHERE payment_period IS NOT NULL
    GROUP BY tenant_id, employee_id, payment_period
    HAVING count(*) > 1
  ) INTO v_duplicate_exists;

  IF v_duplicate_exists THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_EXISTING_SALARY_PERIOD_DUPLICATES';
  END IF;

  SELECT pg_get_functiondef(
    'public.post_expense_with_ledger(uuid,uuid,uuid)'::regprocedure
  ) INTO v_def;
  IF position('finance.expenses.manage' in v_def) = 0
     OR position('''adjustment'', ''expense''' in v_def) = 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_EXPENSE_POST_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'::regprocedure
  ) INTO v_def;
  IF position('finance.payment.create' in v_def) = 0
     OR position('payment_received_at=now()' in v_def) = 0
     OR position('INSERT INTO public.payment_intents' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_PAYMENT_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public.reverse_expense(uuid,uuid,uuid,text,date)'::regprocedure
  ) INTO v_def;
  IF position('finance.adjustment.create' in v_def) = 0
     OR position('''adjustment'', ''expense''' in v_def) = 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_EXPENSE_REVERSAL_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'::regprocedure
  ) INTO v_def;
  IF position('finance.adjustment.create' in v_def) = 0
     OR position('FIN_EFFECTIVE_DATE_INVALID' in v_def) > 0
     OR position('char_length(v_desc)' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_MANUAL_ADJUSTMENT_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)'::regprocedure
  ) INTO v_def;
  IF position('hr.manage' in v_def) = 0
     OR position('''adjustment'', ''expense''' in v_def) = 0
     OR position('FIN_SALARY_PERIOD_DUP' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_SALARY_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'::regprocedure
  ) INTO v_def;
  IF position('ORDER BY effective_date, created_at, id' in v_def) = 0
     OR position('FROM public.customer_balances' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_LEDGER_HELPER_PREIMAGE_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)'::regprocedure
  ) INTO v_def;
  IF position('p_source_reference_trusted::text' in v_def) = 0 THEN
    RAISE EXCEPTION 'N2_2_PREFLIGHT_SOURCED_EXPENSE_PREIMAGE_DRIFT';
  END IF;
END
$preflight$;

-- --------------------------------------------------------------------------
-- Schema corrections. No row mutation.
-- --------------------------------------------------------------------------
ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN ('invoice', 'payment', 'credit', 'adjustment', 'expense'));

CREATE UNIQUE INDEX hr_salary_payments_tenant_employee_period_uidx
  ON public.hr_salary_payments (tenant_id, employee_id, payment_period)
  WHERE payment_period IS NOT NULL;

COMMENT ON INDEX public.hr_salary_payments_tenant_employee_period_uidx IS
  'AML.1.b.1 N+2.2: one logical salary payment per tenant, employee, and YYYY-MM period regardless of idempotency key.';

-- --------------------------------------------------------------------------
-- Private ledger helper: serialize the client partition, lock an existing
-- customer balance row when present, insert, rebuild in deterministic order,
-- and upsert the authoritative tenant currency.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_ledger_insert(
  p_tenant_id           uuid,
  p_client_id           uuid,
  p_entry_type          text,
  p_reference_type      text,
  p_reference_id        uuid,
  p_amount              numeric,
  p_effective_date      date,
  p_description         text,
  p_payment_method      text,
  p_payment_session_id  uuid,
  p_metadata            jsonb,
  p_created_by          uuid
) RETURNS TABLE (ledger_entry_id uuid, balance_after numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id       uuid;
  v_running  numeric := 0;
  v_row      record;
  v_new_bal  numeric := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_entry_type IS NULL OR p_reference_type IS NULL
     OR p_amount IS NULL OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_LEDGER_INSERT_BAD_ARGS' USING ERRCODE = '22023';
  END IF;

  IF p_client_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      public._finance_advisory_lock_key(p_tenant_id, 'client_ledger', p_client_id)
    );

    -- The advisory lock serializes both the existing-row and missing-row case.
    -- Locking the physical row as well makes the update dependency explicit.
    PERFORM 1
    FROM public.customer_balances
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id
    FOR UPDATE;
  END IF;

  INSERT INTO public.ledger_entries (
    tenant_id, client_id, entry_type, reference_type, reference_id,
    amount, balance_after, description, created_by,
    payment_method, metadata, payment_session_id, effective_date
  ) VALUES (
    p_tenant_id, p_client_id, p_entry_type, p_reference_type, p_reference_id,
    p_amount, 0, p_description, p_created_by,
    p_payment_method, COALESCE(p_metadata, '{}'::jsonb),
    p_payment_session_id, p_effective_date
  )
  RETURNING id INTO v_id;

  IF p_client_id IS NULL THEN
    RETURN QUERY SELECT v_id, 0::numeric;
    RETURN;
  END IF;

  FOR v_row IN
    SELECT id, amount
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id AND client_id = p_client_id
    ORDER BY effective_date, created_at, id
  LOOP
    v_running := v_running + COALESCE(v_row.amount, 0);
    UPDATE public.ledger_entries
    SET balance_after = v_running
    WHERE id = v_row.id;

    IF v_row.id = v_id THEN
      v_new_bal := v_running;
    END IF;
  END LOOP;

  INSERT INTO public.customer_balances (
    tenant_id, client_id, balance, currency, last_updated
  )
  SELECT p_tenant_id, p_client_id, v_running,
         COALESCE(NULLIF(currency, ''), 'SAR'), now()
  FROM public.tenants
  WHERE id = p_tenant_id
  ON CONFLICT (tenant_id, client_id)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    currency = EXCLUDED.currency,
    last_updated = now();

  RETURN QUERY SELECT v_id, v_new_bal;
END
$function$;

-- --------------------------------------------------------------------------
-- Private HR sourced-expense helper: source_reference is physically uuid.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_expense_create_sourced(
  p_tenant_id                 uuid,
  p_actor_id                  uuid,
  p_payload                   jsonb,
  p_source_type_trusted       text,
  p_source_reference_trusted  uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_expense_id   uuid;
  v_category     text;
  v_amount       numeric;
  v_currency     text;
  v_expense_date date;
  v_description  text;
BEGIN
  IF p_tenant_id IS NULL OR p_actor_id IS NULL OR p_payload IS NULL
     OR p_source_type_trusted IS NULL OR p_source_reference_trusted IS NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_INVALID_ARGUMENTS'
      USING ERRCODE = '22023';
  END IF;

  IF p_source_type_trusted <> 'hr_salary_payment' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_UNTRUSTED_SOURCE: %', p_source_type_trusted
      USING ERRCODE = '22023';
  END IF;

  v_category := NULLIF(p_payload->>'category', '');
  v_amount := NULLIF(p_payload->>'amount', '')::numeric;
  v_currency := NULLIF(p_payload->>'currency', '');
  v_expense_date := NULLIF(p_payload->>'expense_date', '')::date;
  v_description := NULLIF(p_payload->>'description', '');

  IF v_category IS NULL OR v_amount IS NULL OR v_currency IS NULL
     OR v_expense_date IS NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_PAYLOAD_INCOMPLETE'
      USING ERRCODE = '22023';
  END IF;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_NON_POSITIVE_AMOUNT'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.expenses (
    tenant_id, category, amount, currency, expense_date, description,
    source_type, source_reference, created_by
  ) VALUES (
    p_tenant_id, v_category, v_amount, v_currency, v_expense_date,
    v_description, p_source_type_trusted, p_source_reference_trusted, p_actor_id
  )
  RETURNING id INTO v_expense_id;

  RETURN v_expense_id;
END
$function$;

-- --------------------------------------------------------------------------
-- Payment: one intent + one ledger row + one link + balance + invoice status.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_payment(
  p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid,
  p_amount numeric, p_payment_date date, p_payment_method text,
  p_account_id uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'post_payment';
  v_source jsonb;
  v_intent jsonb;
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_inv record;
  v_tenant_currency text;
  v_payment_currency text;
  v_paid_abs numeric;
  v_outstanding numeric;
  v_new_outstanding numeric;
  v_new_status text;
  v_payment_intent_id uuid;
  v_ledger_id uuid;
  v_link_id uuid;
  v_desc text;
  v_meta jsonb;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_caller_metadata jsonb := '{}'::jsonb;
  v_allow_overpayment boolean := false;
  v_key text;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL
     OR p_amount IS NULL OR p_payment_date IS NULL OR p_payment_method IS NULL
     OR p_account_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'FIN_PAYMENT_AMOUNT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF btrim(p_payment_method) = '' THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(v_payload)
  LOOP
    IF v_key NOT IN (
      'allow_overpayment', 'reference_note', 'external_reference', 'metadata'
    ) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF v_payload ? 'allow_overpayment' THEN
    IF jsonb_typeof(v_payload->'allow_overpayment') <> 'boolean' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: allow_overpayment' USING ERRCODE = '23514';
    END IF;
    v_allow_overpayment := (v_payload->>'allow_overpayment')::boolean;
  END IF;

  IF v_payload ? 'reference_note'
     AND jsonb_typeof(v_payload->'reference_note') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: reference_note' USING ERRCODE = '23514';
  END IF;
  IF char_length(COALESCE(v_payload->>'reference_note', '')) > 500 THEN
    RAISE EXCEPTION 'FIN_PAYMENT_REFERENCE_NOTE_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  IF v_payload ? 'external_reference'
     AND jsonb_typeof(v_payload->'external_reference') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: external_reference' USING ERRCODE = '23514';
  END IF;
  IF char_length(COALESCE(v_payload->>'external_reference', '')) > 100 THEN
    RAISE EXCEPTION 'FIN_PAYMENT_EXTERNAL_REFERENCE_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  IF v_payload ? 'metadata' THEN
    IF jsonb_typeof(v_payload->'metadata') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: metadata' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_each(v_payload->'metadata') AS m(key, value)
      WHERE jsonb_typeof(m.value) IN ('object', 'array')
    ) THEN
      RAISE EXCEPTION 'FIN_PAYMENT_METADATA_MUST_BE_SHALLOW' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(v_payload->'metadata') AS k(key)
      WHERE k.key IN (
        'tenant_id', 'actor_id', 'invoice_id', 'payment_intent_id',
        'ledger_entry_id', 'final_invoice_status', 'balance_after',
        'effective_date', 'idempotency_key', 'idempotency_identity'
      )
    ) THEN
      RAISE EXCEPTION 'FIN_PAYMENT_METADATA_RESERVED_KEY' USING ERRCODE = '23514';
    END IF;
    v_caller_metadata := v_payload->'metadata';
  END IF;

  v_source := jsonb_build_object(
    'tenant_id', p_tenant_id,
    'invoice_id', p_invoice_id
  );
  v_intent := jsonb_build_object(
    'amount', p_amount,
    'payment_date', p_payment_date,
    'payment_method', btrim(p_payment_method),
    'account_id', p_account_id,
    'payload', v_payload
  );

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT *
  INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status NOT IN ('approved', 'shared', 'overdue', 'partial') THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_PAYABLE' USING ERRCODE = '42501';
  END IF;

  SELECT NULLIF(btrim(currency), '')
  INTO v_tenant_currency
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_tenant_currency IS NULL THEN
    RAISE EXCEPTION 'FIN_TENANT_CURRENCY_MISSING' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payment_accounts
    WHERE id = p_account_id
      AND tenant_id = p_tenant_id
      AND owner_type = 'tenant'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'FIN_PAYMENT_ACCOUNT_INVALID' USING ERRCODE = '23503';
  END IF;

  v_payment_currency := COALESCE(NULLIF(btrim(v_inv.currency), ''), v_tenant_currency);
  IF v_payment_currency IS DISTINCT FROM v_tenant_currency THEN
    RAISE EXCEPTION 'FIN_PAYMENT_CURRENCY_MISMATCH' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(-amount), 0)
  INTO v_paid_abs
  FROM public.ledger_entries
  WHERE tenant_id = p_tenant_id
    AND reference_type = 'invoice'
    AND reference_id = p_invoice_id
    AND entry_type = 'payment';

  v_outstanding := COALESCE(v_inv.total_amount, 0) - COALESCE(v_paid_abs, 0);
  IF v_outstanding <= 0.01 THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_PAYABLE' USING ERRCODE = '42501';
  END IF;
  IF p_amount > v_outstanding + 0.01 AND NOT v_allow_overpayment THEN
    RAISE EXCEPTION 'FIN_PAYMENT_OVERPAYMENT' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.payment_intents (
    id, payer_user_id, payee_account_id, tenant_id,
    intent_type, reference_type, reference_id,
    amount_display, currency, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_actor, p_account_id, p_tenant_id,
    'receivable', 'invoice', p_invoice_id,
    to_char(p_amount, 'FM999999999990.00'), v_payment_currency,
    'paid', now(), now()
  )
  RETURNING id INTO v_payment_intent_id;

  v_desc := 'Payment for invoice ' || v_inv.invoice_number;
  v_meta := jsonb_strip_nulls(jsonb_build_object(
    'account_id', p_account_id,
    'payment_intent_id', v_payment_intent_id,
    'via', 'post_payment',
    'reference_note', NULLIF(v_payload->>'reference_note', ''),
    'external_reference', NULLIF(v_payload->>'external_reference', ''),
    'caller', v_caller_metadata
  ));

  SELECT ledger_entry_id
  INTO v_ledger_id
  FROM public._finance_ledger_insert(
    p_tenant_id, v_inv.client_id, 'payment', 'invoice', p_invoice_id,
    -p_amount, p_payment_date, v_desc, btrim(p_payment_method), NULL,
    v_meta, v_actor
  );

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'payment', v_ledger_id)
  );
  v_link_id := public._finance_billing_link_upsert(
    p_tenant_id, 'payment', v_ledger_id, p_invoice_id,
    'final', p_amount, v_actor, NULL
  );

  SELECT COALESCE(SUM(-amount), 0)
  INTO v_paid_abs
  FROM public.ledger_entries
  WHERE tenant_id = p_tenant_id
    AND reference_type = 'invoice'
    AND reference_id = p_invoice_id
    AND entry_type = 'payment';

  v_new_outstanding := COALESCE(v_inv.total_amount, 0) - COALESCE(v_paid_abs, 0);
  IF v_new_outstanding <= 0.01 THEN
    v_new_status := 'paid';
    UPDATE public.invoices
    SET status = 'paid',
        payment_received_at = p_payment_date::timestamp AT TIME ZONE 'Asia/Riyadh',
        payment_method = COALESCE(payment_method, btrim(p_payment_method)),
        updated_at = now()
    WHERE id = p_invoice_id;
  ELSE
    v_new_status := 'partial';
    UPDATE public.invoices
    SET status = 'partial',
        payment_method = COALESCE(payment_method, btrim(p_payment_method)),
        updated_at = now()
    WHERE id = p_invoice_id;
  END IF;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'payment_intent_id', v_payment_intent_id,
    'ledger_entry_id', v_ledger_id,
    'billing_link_id', v_link_id,
    'remaining_after', v_new_outstanding,
    'invoice_status', v_new_status,
    'payment_payload', v_payload
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Expense approval/post: approve permission only and canonical expense row.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_expense_with_ledger(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'post_expense_with_ledger';
  v_source jsonb;
  v_intent jsonb;
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_exp record;
  v_ledger_id uuid;
  v_desc text;
  v_meta jsonb;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := '{}'::jsonb;
  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id)
  );
  SELECT *
  INTO v_exp
  FROM public.expenses
  WHERE id = p_expense_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_exp.ledger_status IS DISTINCT FROM 'unposted'
     OR v_exp.status NOT IN ('pending', 'approved', 'paid')
     OR v_exp.reverses_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_STATE_INVALID' USING ERRCODE = '42501';
  END IF;
  IF v_exp.amount IS NULL OR v_exp.amount <= 0 THEN
    RAISE EXCEPTION 'FIN_EXPENSE_AMOUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  v_desc := COALESCE(
    v_exp.description,
    v_exp.category || COALESCE(' | ' || v_exp.vendor_name, '')
  );
  v_meta := jsonb_build_object(
    'expense_id', p_expense_id,
    'category', v_exp.category
  );

  SELECT ledger_entry_id
  INTO v_ledger_id
  FROM public._finance_ledger_insert(
    p_tenant_id, NULL, 'expense', 'expense', p_expense_id,
    v_exp.amount, v_exp.expense_date, v_desc, NULL, NULL, v_meta, v_actor
  );

  UPDATE public.expenses
  SET ledger_status = 'posted',
      posted_at = now(),
      ledger_entry_id = v_ledger_id,
      status = CASE WHEN status = 'pending' THEN 'approved' ELSE status END,
      updated_at = now()
  WHERE id = p_expense_id;

  v_snapshot := jsonb_build_object(
    'expense_id', p_expense_id,
    'ledger_entry_id', v_ledger_id,
    'ledger_status', 'posted',
    'effective_date', v_exp.expense_date
  );
  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Expense reversal: manage permission only and Model-B expense classification.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_expense(
  p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid,
  p_reason text, p_reversal_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'reverse_expense';
  v_source jsonb;
  v_intent jsonb;
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_exp record;
  v_rev_id uuid := gen_random_uuid();
  v_ledger_id uuid;
  v_reason text := btrim(COALESCE(p_reason, ''));
  v_desc text;
  v_meta jsonb;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_expense_id IS NULL
     OR p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF v_reason = '' OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'FIN_REASON_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.expenses.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'expense_id', p_expense_id);
  v_intent := jsonb_build_object('reason', v_reason, 'reversal_date', p_reversal_date);
  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'expense', p_expense_id)
  );
  SELECT *
  INTO v_exp
  FROM public.expenses
  WHERE id = p_expense_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_EXPENSE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_exp.source_type = 'hr_salary_payment' THEN
    RAISE EXCEPTION 'FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE' USING ERRCODE = '42501';
  END IF;
  IF v_exp.ledger_status IS DISTINCT FROM 'posted'
     OR v_exp.status NOT IN ('approved', 'paid')
     OR v_exp.reverses_expense_id IS NOT NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_NOT_REVERSIBLE' USING ERRCODE = '42501';
  END IF;
  IF p_reversal_date < v_exp.expense_date
     OR p_reversal_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_REVERSAL_DATE_INVALID' USING ERRCODE = '23514';
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'expense', v_rev_id)
  );

  INSERT INTO public.expenses (
    id, tenant_id, category, description, amount, currency, expense_date,
    vendor_name, vendor_id, receipt_asset_id, notes,
    status, ledger_status, posted_at, reverses_expense_id, created_by
  ) VALUES (
    v_rev_id, p_tenant_id, 'reversal',
    'Reversal of ' || v_exp.category || ' — ' || v_reason,
    v_exp.amount, v_exp.currency, p_reversal_date,
    v_exp.vendor_name, v_exp.vendor_id, NULL, v_reason,
    'approved', 'posted', now(), p_expense_id, v_actor
  );

  v_desc := 'Reversal of expense ' || v_exp.category
            || COALESCE(' | ' || v_exp.vendor_name, '') || ' — ' || v_reason;
  v_meta := jsonb_build_object(
    'reverses_expense_id', p_expense_id,
    'reason', v_reason
  );

  SELECT ledger_entry_id
  INTO v_ledger_id
  FROM public._finance_ledger_insert(
    p_tenant_id, NULL, 'expense', 'expense', v_rev_id,
    -v_exp.amount, p_reversal_date, v_desc, NULL, NULL, v_meta, v_actor
  );

  UPDATE public.expenses
  SET ledger_entry_id = v_ledger_id,
      updated_at = now()
  WHERE id = v_rev_id;

  UPDATE public.expenses
  SET ledger_status = 'reversed',
      updated_at = now()
  WHERE id = p_expense_id;

  v_snapshot := jsonb_build_object(
    'original_expense_id', p_expense_id,
    'reversal_expense_id', v_rev_id,
    'reversal_ledger_entry_id', v_ledger_id,
    'effective_date', p_reversal_date,
    'reason', v_reason
  );
  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Manual adjustment: bounded business date/description and explicit client
-- partition serialization before the generalized helper rebuilds the chain.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_manual_ledger_adjustment(
  p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid,
  p_amount numeric, p_effective_date date, p_description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'post_manual_ledger_adjustment';
  v_source jsonb;
  v_intent jsonb;
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_ref_id uuid := gen_random_uuid();
  v_ledger_id uuid;
  v_balance_after numeric;
  v_desc text := btrim(COALESCE(p_description, ''));
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_client_id IS NULL
     OR p_amount IS NULL OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.adjustment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'FIN_ADJUSTMENT_AMOUNT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF v_desc = '' THEN
    RAISE EXCEPTION 'FIN_ADJUSTMENT_DESCRIPTION_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF char_length(v_desc) > 500 THEN
    RAISE EXCEPTION 'FIN_ADJUSTMENT_DESCRIPTION_TOO_LONG' USING ERRCODE = '23514';
  END IF;
  IF p_effective_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_EFFECTIVE_DATE_INVALID' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'FIN_CLIENT_NOT_IN_TENANT' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'client_id', p_client_id);
  v_intent := jsonb_build_object(
    'amount', p_amount,
    'effective_date', p_effective_date,
    'description', v_desc
  );
  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_advisory_lock_key(p_tenant_id, 'client_ledger', p_client_id)
  );
  PERFORM 1
  FROM public.customer_balances
  WHERE tenant_id = p_tenant_id AND client_id = p_client_id
  FOR UPDATE;

  SELECT ledger_entry_id, balance_after
  INTO v_ledger_id, v_balance_after
  FROM public._finance_ledger_insert(
    p_tenant_id, p_client_id, 'adjustment', 'adjustment', v_ref_id,
    p_amount, p_effective_date, v_desc, NULL, NULL,
    jsonb_build_object('kind', 'manual', 'idempotency_key', p_idempotency_key),
    v_actor
  );

  v_snapshot := jsonb_build_object(
    'ledger_entry_id', v_ledger_id,
    'effective_date', p_effective_date,
    'amount', p_amount,
    'balance_after', v_balance_after
  );
  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Salary: HR authority only, active employee, tenant currency, strict period,
-- schema-backed period uniqueness, optional sourced expense in one transaction.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_salary_payment(
  p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid,
  p_amount numeric, p_currency text, p_paid_at timestamptz,
  p_payment_period text, p_notes text, p_create_expense boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'record_salary_payment';
  v_source jsonb;
  v_intent jsonb;
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_employee record;
  v_tenant_currency text;
  v_salary_id uuid := gen_random_uuid();
  v_expense_id uuid;
  v_ledger_id uuid;
  v_biz_date date;
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_expense_payload jsonb;
  v_desc text;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_employee_id IS NULL
     OR p_amount IS NULL OR p_currency IS NULL OR p_paid_at IS NULL
     OR p_payment_period IS NULL OR p_create_expense IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'hr.manage') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'FIN_SALARY_AMOUNT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF p_paid_at > now() + interval '1 day' THEN
    RAISE EXCEPTION 'FIN_SALARY_PAID_AT_INVALID' USING ERRCODE = '23514';
  END IF;
  IF p_payment_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'FIN_SALARY_PERIOD_INVALID' USING ERRCODE = '23514';
  END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'FIN_SALARY_NOTES_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  SELECT NULLIF(btrim(currency), '')
  INTO v_tenant_currency
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_tenant_currency IS NULL OR btrim(p_currency) IS DISTINCT FROM v_tenant_currency THEN
    RAISE EXCEPTION 'FIN_CURRENCY_MISMATCH' USING ERRCODE = '23514';
  END IF;

  v_source := jsonb_build_object(
    'tenant_id', p_tenant_id,
    'employee_id', p_employee_id,
    'payment_period', p_payment_period
  );
  v_intent := jsonb_build_object(
    'amount', p_amount,
    'currency', v_tenant_currency,
    'paid_at', p_paid_at,
    'payment_period', p_payment_period,
    'notes', v_notes,
    'create_expense', p_create_expense
  );
  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'hr_salary_payment', p_employee_id)
  );

  SELECT *
  INTO v_employee
  FROM public.hr_employees
  WHERE id = p_employee_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_EMPLOYEE_NOT_IN_TENANT' USING ERRCODE = '42501';
  END IF;
  IF NOT v_employee.is_active THEN
    RAISE EXCEPTION 'FIN_EMPLOYEE_INACTIVE' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.hr_salary_payments
    WHERE tenant_id = p_tenant_id
      AND employee_id = p_employee_id
      AND payment_period = p_payment_period
  ) THEN
    RAISE EXCEPTION 'FIN_SALARY_PERIOD_DUP' USING ERRCODE = '23514';
  END IF;

  v_biz_date := public._finance_riyadh_date(p_paid_at);

  BEGIN
    INSERT INTO public.hr_salary_payments (
      id, tenant_id, employee_id, amount, currency, paid_at,
      payment_period, notes, created_by
    ) VALUES (
      v_salary_id, p_tenant_id, p_employee_id, p_amount,
      v_tenant_currency, p_paid_at, p_payment_period, v_notes, v_actor
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'FIN_SALARY_PERIOD_DUP' USING ERRCODE = '23514';
  END;

  IF p_create_expense THEN
    v_desc := 'Salary payment — ' || p_payment_period;
    v_expense_payload := jsonb_build_object(
      'category', 'salary',
      'amount', p_amount,
      'currency', v_tenant_currency,
      'expense_date', v_biz_date,
      'description', v_desc
    );

    v_expense_id := public._finance_expense_create_sourced(
      p_tenant_id, v_actor, v_expense_payload,
      'hr_salary_payment', v_salary_id
    );

    SELECT ledger_entry_id
    INTO v_ledger_id
    FROM public._finance_ledger_insert(
      p_tenant_id, NULL, 'expense', 'expense', v_expense_id,
      p_amount, v_biz_date, v_desc, NULL, NULL,
      jsonb_build_object(
        'salary_payment_id', v_salary_id,
        'employee_id', p_employee_id
      ),
      v_actor
    );

    UPDATE public.expenses
    SET status = 'approved',
        ledger_status = 'posted',
        posted_at = now(),
        ledger_entry_id = v_ledger_id,
        updated_at = now()
    WHERE id = v_expense_id;

    UPDATE public.hr_salary_payments
    SET finance_expense_id = v_expense_id
    WHERE id = v_salary_id;
  END IF;

  v_snapshot := jsonb_build_object(
    'salary_payment_id', v_salary_id,
    'expense_id', v_expense_id,
    'ledger_entry_id', v_ledger_id,
    'period_locked', true
  );
  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Ownership and ACL posture.
-- Public corrected RPCs: authenticated only. Private helpers: owner only.
-- --------------------------------------------------------------------------
ALTER FUNCTION public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid) OWNER TO postgres;
ALTER FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) OWNER TO postgres;
ALTER FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) OWNER TO postgres;
ALTER FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) OWNER TO postgres;
ALTER FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) OWNER TO postgres;
ALTER FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) TO authenticated;

-- --------------------------------------------------------------------------
-- Post-apply structural verification.
-- --------------------------------------------------------------------------
DO $post$
DECLARE
  v_def text;
  v_proc regprocedure;
  v_proc_name text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
  INTO v_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.ledger_entries'::regclass
    AND c.conname = 'ledger_entries_entry_type_check';

  IF position('expense' in COALESCE(v_def, '')) = 0 THEN
    RAISE EXCEPTION 'N2_2_POST_LEDGER_EXPENSE_TYPE_MISSING';
  END IF;

  IF to_regclass('public.hr_salary_payments_tenant_employee_period_uidx') IS NULL THEN
    RAISE EXCEPTION 'N2_2_POST_SALARY_PERIOD_INDEX_MISSING';
  END IF;

  SELECT pg_get_functiondef(
    'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)'::regprocedure
  ) INTO v_def;
  IF position('p_source_reference_trusted::text' in v_def) > 0 THEN
    RAISE EXCEPTION 'N2_2_POST_SOURCE_REFERENCE_CAST_SURVIVED';
  END IF;

  SELECT pg_get_functiondef(
    'public.post_expense_with_ledger(uuid,uuid,uuid)'::regprocedure
  ) INTO v_def;
  IF position('finance.expenses.manage' in v_def) > 0
     OR position('''expense'', ''expense''' in v_def) = 0 THEN
    RAISE EXCEPTION 'N2_2_POST_EXPENSE_POST_CONTRACT_DRIFT';
  END IF;

  SELECT pg_get_functiondef(
    'public.reverse_expense(uuid,uuid,uuid,text,date)'::regprocedure
  ) INTO v_def;
  IF position('finance.adjustment.create' in v_def) > 0
     OR position('''expense'', ''expense''' in v_def) = 0 THEN
    RAISE EXCEPTION 'N2_2_POST_EXPENSE_REVERSAL_CONTRACT_DRIFT';
  END IF;

  FOREACH v_proc_name IN ARRAY ARRAY[
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.reverse_expense(uuid,uuid,uuid,text,date)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamp with time zone,text,text,boolean)'
  ]
  LOOP
    v_proc := to_regprocedure(v_proc_name);
    IF v_proc IS NULL
       OR NOT has_function_privilege('authenticated', v_proc, 'EXECUTE')
       OR has_function_privilege('anon', v_proc, 'EXECUTE')
       OR has_function_privilege('service_role', v_proc, 'EXECUTE') THEN
      RAISE EXCEPTION 'N2_2_POST_PUBLIC_RPC_ACL_DRIFT: %', v_proc_name;
    END IF;
  END LOOP;

  IF has_function_privilege(
       'authenticated',
       'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'::regprocedure,
       'EXECUTE'
     ) OR has_function_privilege(
       'authenticated',
       'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)'::regprocedure,
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'N2_2_POST_PRIVATE_HELPER_ACL_DRIFT';
  END IF;
END
$post$;

-- Rollback is intentionally not embedded as an automatically applied
-- migration. Exact guarded inverse instructions are recorded in:
-- docs/aml_1_b_1/n2_2/N2_2_ROLLBACK.md
