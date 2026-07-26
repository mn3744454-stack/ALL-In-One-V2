CREATE OR REPLACE FUNCTION public.post_payment_session(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor              uuid := auth.uid();
  v_op                 text := 'post_payment_session';
  v_replay             boolean;
  v_hash               bytea;
  v_stored             jsonb;
  v_payment_date       date;
  v_reference_note     text;
  v_external_reference text;
  v_allocations        jsonb;
  v_alloc              jsonb;
  v_ha                 jsonb;
  v_key                text;
  v_position           integer := 0;
  v_ha_pos             integer;
  v_amount             numeric;
  v_client_level       numeric;
  v_method             text;
  v_invoice_id         uuid;
  v_total              numeric := 0;
  v_invoice_ids        uuid[] := ARRAY[]::uuid[];
  v_dedupe_keys        text[]  := ARRAY[]::text[];
  v_horse_seen         uuid[];
  v_common_client      uuid;
  v_common_currency    text;
  v_account_id         uuid;
  v_session_id         uuid := gen_random_uuid();
  v_inv                record;
  v_paid_abs           numeric;
  v_outstanding        numeric;
  v_new_outstanding    numeric;
  v_new_status         text;
  v_ledger_id          uuid;
  v_alloc_id           uuid;
  v_ledger_ids         uuid[] := ARRAY[]::uuid[];
  v_results            jsonb  := '[]'::jsonb;
  v_ha_arr             jsonb;
  v_ha_total           numeric;
  v_horse_rows         integer;
  v_client_rows        integer;
  v_distinct_horses    integer;
  v_only_horse         uuid;
  v_desc               text;
  v_meta               jsonb;
  v_response           jsonb;
  v_has_unresolved     boolean;
  v_horse_id           uuid;
  v_ha_amount          numeric;
  v_alloc_out          jsonb;
  v_horse_result       jsonb;
  v_horse_gross        numeric;
  v_horse_prev         numeric;
  v_cl_gross           numeric;
  v_cl_prev            numeric;
BEGIN
  -- ------- 1. AUTH ---------------------------------------------------------
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  -- ------- 2. ROOT PAYLOAD SHAPE ------------------------------------------
  IF jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE='23514';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF v_key NOT IN ('payment_date','reference_note','external_reference','allocations') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='23514';
    END IF;
  END LOOP;

  v_payment_date := NULLIF(p_payload->>'payment_date','')::date;
  IF v_payment_date IS NULL THEN
    RAISE EXCEPTION 'FIN_PAYMENT_DATE_INVALID' USING ERRCODE='23514';
  END IF;
  v_reference_note     := NULLIF(btrim(p_payload->>'reference_note'), '');
  v_external_reference := NULLIF(btrim(p_payload->>'external_reference'), '');
  IF char_length(COALESCE(v_reference_note,'')) > 500 THEN
    RAISE EXCEPTION 'FIN_REFERENCE_NOTE_INVALID' USING ERRCODE='23514';
  END IF;
  IF char_length(COALESCE(v_external_reference,'')) > 100 THEN
    RAISE EXCEPTION 'FIN_EXTERNAL_REFERENCE_INVALID' USING ERRCODE='23514';
  END IF;

  v_allocations := p_payload->'allocations';
  IF v_allocations IS NULL
     OR jsonb_typeof(v_allocations) <> 'array'
     OR jsonb_array_length(v_allocations) < 1
     OR jsonb_array_length(v_allocations) > 50 THEN
    RAISE EXCEPTION 'FIN_ALLOCATIONS_INVALID' USING ERRCODE='23514';
  END IF;

  -- ------- 3. STRUCTURAL VALIDATION (no DB reads) --------------------------
  FOR v_alloc IN SELECT jsonb_array_elements(v_allocations) LOOP
    v_position := v_position + 1;
    IF jsonb_typeof(v_alloc) <> 'object' THEN
      RAISE EXCEPTION 'FIN_ALLOCATION_TYPE: pos=%', v_position USING ERRCODE='23514';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_alloc) LOOP
      IF v_key NOT IN ('invoice_id','payment_method','amount','client_level_amount','horse_allocations','external_reference') THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: allocations[].%', v_key USING ERRCODE='23514';
      END IF;
    END LOOP;

    v_invoice_id  := NULLIF(v_alloc->>'invoice_id','')::uuid;
    v_method      := NULLIF(btrim(v_alloc->>'payment_method'),'');
    -- NARROW CORRECTION (Phase N+2 Slice 3 Step 1): payment_method whitelist.
    -- Excludes 'reconciliation' (historical repair token) and 'debt' (not a collection method).
    IF v_method IS NULL OR v_method NOT IN ('cash','card','transfer','check') THEN
      RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID: pos=%', v_position USING ERRCODE='23514';
    END IF;
    v_amount      := COALESCE(NULLIF(v_alloc->>'amount','')::numeric, 0);
    IF v_invoice_id IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'FIN_ALLOCATION_INVALID: pos=%', v_position USING ERRCODE='23514';
    END IF;
    IF v_amount <> round(v_amount, 2) THEN
      RAISE EXCEPTION 'FIN_AMOUNT_FRACTIONAL_CENTS: pos=%', v_position USING ERRCODE='23514';
    END IF;
    IF char_length(COALESCE(v_alloc->>'external_reference','')) > 100 THEN
      RAISE EXCEPTION 'FIN_EXTERNAL_REFERENCE_INVALID: pos=%', v_position USING ERRCODE='23514';
    END IF;

    v_client_level := COALESCE(NULLIF(v_alloc->>'client_level_amount','')::numeric, 0);
    IF v_client_level < 0 OR v_client_level > v_amount
       OR v_client_level <> round(v_client_level, 2) THEN
      RAISE EXCEPTION 'FIN_CLIENT_LEVEL_INVALID: pos=%', v_position USING ERRCODE='23514';
    END IF;

    IF v_alloc ? 'horse_allocations' THEN
      IF jsonb_typeof(v_alloc->'horse_allocations') <> 'array' THEN
        RAISE EXCEPTION 'FIN_HORSE_ALLOCATIONS_TYPE: pos=%', v_position USING ERRCODE='23514';
      END IF;
      v_ha_pos := 0;
      v_horse_seen := ARRAY[]::uuid[];
      FOR v_ha IN SELECT jsonb_array_elements(v_alloc->'horse_allocations') LOOP
        v_ha_pos := v_ha_pos + 1;
        IF jsonb_typeof(v_ha) <> 'object' THEN
          RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_TYPE: pos=%.%', v_position, v_ha_pos USING ERRCODE='23514';
        END IF;
        FOR v_key IN SELECT jsonb_object_keys(v_ha) LOOP
          IF v_key NOT IN ('horse_id','amount') THEN
            RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: horse_allocations[].%', v_key USING ERRCODE='23514';
          END IF;
        END LOOP;
        v_horse_id  := NULLIF(v_ha->>'horse_id','')::uuid;
        v_ha_amount := COALESCE(NULLIF(v_ha->>'amount','')::numeric, 0);
        IF v_horse_id IS NULL OR v_ha_amount <= 0
           OR v_ha_amount <> round(v_ha_amount, 2) THEN
          RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_INVALID: pos=%.%', v_position, v_ha_pos USING ERRCODE='23514';
        END IF;
        IF v_horse_id = ANY(v_horse_seen) THEN
          RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_DUPLICATE: pos=%', v_position USING ERRCODE='23514';
        END IF;
        v_horse_seen := v_horse_seen || v_horse_id;
      END LOOP;
    END IF;

    IF (v_invoice_id::text || '|' || v_method) = ANY(v_dedupe_keys) THEN
      RAISE EXCEPTION 'FIN_ALLOCATION_DUPLICATE' USING ERRCODE='23514';
    END IF;
    v_dedupe_keys := v_dedupe_keys || (v_invoice_id::text || '|' || v_method);
    IF NOT (v_invoice_id = ANY(v_invoice_ids)) THEN
      v_invoice_ids := v_invoice_ids || v_invoice_id;
    END IF;
    v_total := v_total + v_amount;
  END LOOP;

  IF v_total <= 0 OR v_total <> round(v_total,2) THEN
    RAISE EXCEPTION 'FIN_SESSION_TOTAL_INVALID' USING ERRCODE='23514';
  END IF;

  -- ------- 4. IDEMPOTENCY BEGIN -------------------------------------------
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id, v_op, p_idempotency_key, v_actor,
    jsonb_build_object('tenant_id', p_tenant_id),
    jsonb_build_object(
      'payment_date',       v_payment_date,
      'reference_note',     v_reference_note,
      'external_reference', v_external_reference,
      'allocations',        v_allocations
    )
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  -- ------- 5. DETERMINISTIC INVOICE LOCKING -------------------------------
  FOR v_invoice_id IN SELECT u FROM unnest(v_invoice_ids) u ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(
      public._finance_source_lock_key(p_tenant_id, 'invoice', v_invoice_id)
    );
  END LOOP;

  -- ------- 6. LOAD & VALIDATE COMMON IDENTITY -----------------------------
  v_common_client   := NULL;
  v_common_currency := NULL;
  FOR v_inv IN
    SELECT * FROM public.invoices WHERE id = ANY(v_invoice_ids) ORDER BY id FOR UPDATE
  LOOP
    IF v_inv.tenant_id <> p_tenant_id THEN
      RAISE EXCEPTION 'FIN_INVOICE_CROSS_TENANT' USING ERRCODE='42501';
    END IF;
    IF v_inv.status NOT IN ('approved','partial') THEN
      RAISE EXCEPTION 'FIN_INVOICE_NOT_PAYABLE' USING ERRCODE='42501';
    END IF;
    IF v_common_client IS NULL THEN
      v_common_client := v_inv.client_id;
    ELSIF v_common_client IS DISTINCT FROM v_inv.client_id THEN
      RAISE EXCEPTION 'FIN_INVOICE_CROSS_CLIENT' USING ERRCODE='42501';
    END IF;
    IF v_common_currency IS NULL THEN
      v_common_currency := COALESCE(v_inv.currency,'SAR');
    ELSIF v_common_currency IS DISTINCT FROM COALESCE(v_inv.currency,'SAR') THEN
      RAISE EXCEPTION 'FIN_INVOICE_CURRENCY_MISMATCH' USING ERRCODE='23514';
    END IF;
  END LOOP;

  IF (SELECT COUNT(*) FROM public.invoices WHERE id = ANY(v_invoice_ids))
     <> array_length(v_invoice_ids, 1) THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE='23503';
  END IF;
  IF v_common_client IS NULL THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE='23503';
  END IF;

  -- ------- 7. CLIENT-LEVEL LEDGER LOCK ------------------------------------
  PERFORM pg_advisory_xact_lock(
    public._finance_advisory_lock_key(p_tenant_id, 'client_ledger', v_common_client)
  );

  -- ------- 8. DETERMINISTIC TENANT PAYMENT ACCOUNT ------------------------
  SELECT id INTO v_account_id
    FROM public.payment_accounts
   WHERE tenant_id = p_tenant_id AND owner_type='tenant' AND is_active
   LIMIT 1;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'FIN_PAYMENT_ACCOUNT_MISSING' USING ERRCODE='23514';
  END IF;

  -- ------- 9. INSERT SESSION ---------------------------------------------
  INSERT INTO public.payment_sessions
    (id, tenant_id, client_id, payment_account_id, total_amount, currency,
     payment_date, reference_note, status, created_by, metadata)
  VALUES
    (v_session_id, p_tenant_id, v_common_client, v_account_id,
     round(v_total,2), v_common_currency, v_payment_date,
     v_reference_note, 'posted', v_actor,
     jsonb_strip_nulls(jsonb_build_object(
       'idempotency_key',   p_idempotency_key::text,
       'external_reference', v_external_reference
     )));

  -- ------- 10. PER-ALLOCATION PROCESSING ----------------------------------
  v_position := 0;
  FOR v_alloc IN SELECT jsonb_array_elements(v_allocations) LOOP
    v_position     := v_position + 1;
    v_invoice_id   := (v_alloc->>'invoice_id')::uuid;
    v_amount       := (v_alloc->>'amount')::numeric;
    v_method       := btrim(v_alloc->>'payment_method');
    v_client_level := COALESCE(NULLIF(v_alloc->>'client_level_amount','')::numeric, 0);
    v_ha_total     := 0;
    v_ha_arr       := '[]'::jsonb;

    SELECT * INTO v_inv FROM public.invoices WHERE id = v_invoice_id;

    -- Recompute outstanding under lock
    SELECT COALESCE(SUM(ABS(amount)),0) INTO v_paid_abs
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id
       AND reference_type='invoice' AND reference_id=v_invoice_id
       AND entry_type='payment';
    v_outstanding := round(COALESCE(v_inv.total_amount,0) - v_paid_abs, 2);
    IF v_amount > v_outstanding + 0.001 THEN
      RAISE EXCEPTION 'FIN_INVOICE_OVER_ALLOCATION' USING ERRCODE='23514';
    END IF;

    -- Determine invoice shape
    SELECT COUNT(*) FILTER (WHERE horse_id IS NOT NULL),
           COUNT(*) FILTER (WHERE horse_id IS NULL),
           COUNT(DISTINCT horse_id) FILTER (WHERE horse_id IS NOT NULL)
      INTO v_horse_rows, v_client_rows, v_distinct_horses
      FROM public.invoice_items
     WHERE invoice_id = v_invoice_id;

    IF v_horse_rows = 0 THEN
      -- CASE A: client-level only
      IF v_alloc ? 'horse_allocations' AND jsonb_array_length(v_alloc->'horse_allocations') > 0 THEN
        RAISE EXCEPTION 'FIN_HORSE_NOT_ON_INVOICE' USING ERRCODE='23514';
      END IF;
      -- client_level_amount defaults to full amount if not provided
      IF v_client_level = 0 THEN
        v_client_level := v_amount;
      ELSIF v_client_level <> v_amount THEN
        RAISE EXCEPTION 'FIN_CLIENT_LEVEL_ALLOCATION_INVALID' USING ERRCODE='23514';
      END IF;
    ELSIF v_horse_rows > 0 AND v_client_rows = 0 AND v_distinct_horses = 1 THEN
      -- CASE B: single-horse only, auto-fill
      IF v_client_level > 0 THEN
        RAISE EXCEPTION 'FIN_CLIENT_LEVEL_ALLOCATION_INVALID' USING ERRCODE='23514';
      END IF;
      IF (NOT (v_alloc ? 'horse_allocations'))
         OR jsonb_array_length(v_alloc->'horse_allocations') = 0 THEN
        SELECT DISTINCT horse_id INTO v_only_horse
          FROM public.invoice_items
         WHERE invoice_id = v_invoice_id AND horse_id IS NOT NULL;
        v_ha_arr := jsonb_build_array(jsonb_build_object(
          'horse_id', v_only_horse,
          'amount', v_amount
        ));
      ELSE
        v_ha_arr := v_alloc->'horse_allocations';
      END IF;
    ELSE
      -- CASES C & D: mixed or multi-horse invoice
      IF (NOT (v_alloc ? 'horse_allocations'))
         OR jsonb_array_length(v_alloc->'horse_allocations') = 0 THEN
        RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_REQUIRED' USING ERRCODE='23514';
      END IF;

      FOR v_ha IN SELECT jsonb_array_elements(v_alloc->'horse_allocations') LOOP
        v_horse_id  := (v_ha->>'horse_id')::uuid;
        v_ha_amount := (v_ha->>'amount')::numeric;
        IF NOT EXISTS (
          SELECT 1 FROM public.invoice_items
           WHERE invoice_id = v_invoice_id AND horse_id = v_horse_id
        ) THEN
          RAISE EXCEPTION 'FIN_HORSE_NOT_ON_INVOICE' USING ERRCODE='23514';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM public.horses WHERE id = v_horse_id AND tenant_id = p_tenant_id
        ) THEN
          RAISE EXCEPTION 'FIN_HORSE_NOT_ON_INVOICE' USING ERRCODE='23514';
        END IF;

        SELECT COALESCE(SUM(line_gross_amount),0) INTO v_horse_gross
          FROM public.invoice_items
         WHERE invoice_id = v_invoice_id AND horse_id = v_horse_id;
        SELECT COALESCE(SUM(pha.amount),0) INTO v_horse_prev
          FROM public.payment_horse_allocations pha
         WHERE pha.invoice_id = v_invoice_id AND pha.horse_id = v_horse_id;
        IF v_ha_amount > (v_horse_gross - v_horse_prev) THEN
          RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_MISMATCH' USING ERRCODE='23514';
        END IF;
        v_ha_total := v_ha_total + v_ha_amount;
      END LOOP;

      IF (v_ha_total + v_client_level) <> v_amount THEN
        RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_MISMATCH' USING ERRCODE='23514';
      END IF;

      IF v_client_level > 0 THEN
        SELECT COALESCE(SUM(line_gross_amount),0) INTO v_cl_gross
          FROM public.invoice_items WHERE invoice_id = v_invoice_id AND horse_id IS NULL;
        SELECT COALESCE(SUM(client_level_amount),0) INTO v_cl_prev
          FROM public.payment_allocations WHERE invoice_id = v_invoice_id;
        IF v_client_level > (v_cl_gross - v_cl_prev) THEN
          RAISE EXCEPTION 'FIN_CLIENT_LEVEL_ALLOCATION_INVALID' USING ERRCODE='23514';
        END IF;
      END IF;
      v_ha_arr := v_alloc->'horse_allocations';
    END IF;

    -- ------- 11. INSERT LEDGER ROW via canonical helper -------------------
    v_desc := 'Payment for invoice ' || v_inv.invoice_number;
    v_meta := jsonb_strip_nulls(jsonb_build_object(
      'account_id',         v_account_id,
      'via',                'post_payment_session',
      'payment_session_id', v_session_id::text,
      'allocation_position', v_position,
      'external_reference', COALESCE(
        NULLIF(btrim(v_alloc->>'external_reference'),''),
        v_external_reference
      )
    ));
    SELECT ledger_entry_id INTO v_ledger_id
      FROM public._finance_ledger_insert(
        p_tenant_id, v_common_client, 'payment', 'invoice', v_invoice_id,
        -v_amount, v_payment_date, v_desc, v_method, v_session_id, v_meta, v_actor);
    v_ledger_ids := v_ledger_ids || v_ledger_id;

    -- ------- 12. INSERT ALLOCATION ----------------------------------------
    INSERT INTO public.payment_allocations
      (session_id, tenant_id, invoice_id, ledger_entry_id, payment_method,
       amount, client_level_amount, detail_status, external_reference)
    VALUES
      (v_session_id, p_tenant_id, v_invoice_id, v_ledger_id, v_method,
       round(v_amount,2), round(v_client_level,2), 'resolved',
       NULLIF(btrim(v_alloc->>'external_reference'),''))
    RETURNING id INTO v_alloc_id;

    -- ------- 13. INSERT HORSE ALLOCATIONS ---------------------------------
    IF jsonb_array_length(v_ha_arr) > 0 THEN
      INSERT INTO public.payment_horse_allocations
        (allocation_id, session_id, tenant_id, invoice_id, horse_id, amount)
      SELECT v_alloc_id, v_session_id, p_tenant_id, v_invoice_id,
             (h->>'horse_id')::uuid, round((h->>'amount')::numeric, 2)
      FROM jsonb_array_elements(v_ha_arr) h;
    END IF;

    -- Recompute outstanding_after
    SELECT COALESCE(SUM(ABS(amount)),0) INTO v_paid_abs
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id
       AND reference_type='invoice' AND reference_id=v_invoice_id
       AND entry_type='payment';
    v_new_outstanding := round(COALESCE(v_inv.total_amount,0) - v_paid_abs, 2);
    IF v_new_outstanding <= 0.01 THEN
      v_new_status := 'paid';
    ELSE
      v_new_status := 'partial';
    END IF;
    UPDATE public.invoices SET status = v_new_status, updated_at = now()
     WHERE id = v_invoice_id AND status <> v_new_status;

    v_alloc_out := jsonb_build_object(
      'invoice_id',        v_invoice_id,
      'payment_method',    v_method,
      'amount',            round(v_amount, 2),
      'client_level_amount', round(v_client_level, 2),
      'ledger_entry_id',   v_ledger_id,
      'outstanding_after', v_new_outstanding,
      'invoice_status',    v_new_status,
      'horse_allocations', v_ha_arr
    );
    v_results := v_results || jsonb_build_array(v_alloc_out);
  END LOOP;

  -- ------- 14. BUILD RESPONSE ---------------------------------------------
  v_response := jsonb_build_object(
    'session_id',         v_session_id,
    'status',             'posted',
    'total_amount',       round(v_total, 2),
    'currency',           v_common_currency,
    'client_id',          v_common_client,
    'payment_account_id', v_account_id,
    'payment_date',       v_payment_date,
    'allocations',        v_results,
    'idempotency_key',    p_idempotency_key
  );

  -- ------- 15. IDEMPOTENCY FINALIZE ---------------------------------------
  PERFORM public._finance_idempotency_finalize(
    p_tenant_id, v_op, p_idempotency_key, v_response);

  RETURN v_response;
END
$function$;