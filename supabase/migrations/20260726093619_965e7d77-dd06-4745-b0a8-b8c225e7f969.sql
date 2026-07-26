
-- =========================================================================
-- PHASE N+2 SLICE 2 — ATOMIC PAYMENT SESSION RPCS
-- Backend-only. No tables, no historical rows, no RLS policies changed.
-- =========================================================================

-- -------------------------------------------------------------------------
-- WRITER: post_payment_session
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_payment_session(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_payload         jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    v_amount      := COALESCE(NULLIF(v_alloc->>'amount','')::numeric, 0);
    IF v_invoice_id IS NULL OR v_method IS NULL OR v_amount <= 0 THEN
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
       'external_reference', v_external_reference,
       'via',               'post_payment_session'
     )));

  -- ------- 10. PROCESS ALLOCATIONS IN CALLER ORDER ------------------------
  v_position := 0;
  FOR v_alloc IN SELECT jsonb_array_elements(v_allocations) LOOP
    v_position := v_position + 1;
    v_invoice_id   := (v_alloc->>'invoice_id')::uuid;
    v_method       := btrim(v_alloc->>'payment_method');
    v_amount       := (v_alloc->>'amount')::numeric;
    v_client_level := COALESCE(NULLIF(v_alloc->>'client_level_amount','')::numeric, 0);

    SELECT * INTO v_inv FROM public.invoices WHERE id = v_invoice_id;

    -- Recompute outstanding under lock
    SELECT COALESCE(SUM(-amount),0) INTO v_paid_abs
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id AND reference_type='invoice'
       AND reference_id = v_invoice_id AND entry_type='payment';
    v_outstanding := COALESCE(v_inv.total_amount,0) - v_paid_abs;
    IF v_amount > v_outstanding THEN
      RAISE EXCEPTION 'FIN_INVOICE_OVER_ALLOCATION' USING ERRCODE='23514';
    END IF;

    -- Classify invoice horse structure (invoice_items = frozen financial truth)
    SELECT
      COUNT(*) FILTER (WHERE horse_id IS NOT NULL),
      COUNT(*) FILTER (WHERE horse_id IS NULL),
      COUNT(DISTINCT horse_id) FILTER (WHERE horse_id IS NOT NULL),
      (array_agg(DISTINCT horse_id) FILTER (WHERE horse_id IS NOT NULL))[1]
    INTO v_horse_rows, v_client_rows, v_distinct_horses, v_only_horse
    FROM public.invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Historical unresolved gate
    SELECT bool_or(detail_status = 'historical_unresolved') INTO v_has_unresolved
      FROM public.payment_allocations WHERE invoice_id = v_invoice_id;
    IF COALESCE(v_has_unresolved,false)
       AND ((v_alloc ? 'horse_allocations') OR v_client_level > 0) THEN
      RAISE EXCEPTION 'FIN_ALLOCATION_HISTORY_UNRESOLVED' USING ERRCODE='23514';
    END IF;

    v_ha_arr   := '[]'::jsonb;
    v_ha_total := 0;

    IF v_horse_rows = 0 THEN
      -- CASE A: client-level-only invoice
      IF (v_alloc ? 'horse_allocations')
         AND jsonb_array_length(v_alloc->'horse_allocations') > 0 THEN
        RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_FORBIDDEN' USING ERRCODE='23514';
      END IF;
      IF (v_alloc ? 'client_level_amount') AND v_client_level <> v_amount THEN
        RAISE EXCEPTION 'FIN_CLIENT_LEVEL_ALLOCATION_INVALID' USING ERRCODE='23514';
      END IF;
      v_client_level := v_amount;
    ELSIF v_horse_rows > 0 AND v_client_rows = 0 AND v_distinct_horses = 1 THEN
      -- CASE B: single-horse-only invoice
      IF v_client_level <> 0 THEN
        RAISE EXCEPTION 'FIN_CLIENT_LEVEL_ALLOCATION_INVALID' USING ERRCODE='23514';
      END IF;
      IF (NOT (v_alloc ? 'horse_allocations'))
         OR jsonb_array_length(v_alloc->'horse_allocations') = 0 THEN
        v_ha_arr := jsonb_build_array(
          jsonb_build_object('horse_id', v_only_horse, 'amount', v_amount)
        );
        v_ha_total := v_amount;
      ELSE
        FOR v_ha IN SELECT jsonb_array_elements(v_alloc->'horse_allocations') LOOP
          v_horse_id  := (v_ha->>'horse_id')::uuid;
          v_ha_amount := (v_ha->>'amount')::numeric;
          IF v_horse_id <> v_only_horse THEN
            RAISE EXCEPTION 'FIN_HORSE_NOT_ON_INVOICE' USING ERRCODE='23514';
          END IF;
          v_ha_total := v_ha_total + v_ha_amount;
        END LOOP;
        IF v_ha_total <> v_amount THEN
          RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_MISMATCH' USING ERRCODE='23514';
        END IF;
        v_ha_arr := v_alloc->'horse_allocations';
      END IF;
    ELSE
      -- CASES C & D: mixed or multi-horse invoice
      IF (NOT (v_alloc ? 'horse_allocations'))
         OR jsonb_array_length(v_alloc->'horse_allocations') = 0 THEN
        RAISE EXCEPTION 'FIN_HORSE_ALLOCATION_REQUIRED' USING ERRCODE='23514';
      END IF;

      -- Aggregate + validate each horse
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

      -- Client-level remaining
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

    -- ------- 14. RECOMPUTE + UPDATE INVOICE STATUS ------------------------
    SELECT COALESCE(SUM(-amount),0) INTO v_paid_abs
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id AND reference_type='invoice'
       AND reference_id = v_invoice_id AND entry_type='payment';
    v_new_outstanding := COALESCE(v_inv.total_amount,0) - v_paid_abs;
    IF v_new_outstanding <= 0 THEN
      v_new_status := 'paid';
      UPDATE public.invoices
         SET status='paid', payment_received_at=now(),
             payment_method = COALESCE(payment_method, v_method),
             updated_at = now()
       WHERE id = v_invoice_id;
    ELSE
      v_new_status := 'partial';
      UPDATE public.invoices
         SET status='partial',
             payment_method = COALESCE(payment_method, v_method),
             updated_at = now()
       WHERE id = v_invoice_id;
    END IF;

    SELECT jsonb_agg(
             jsonb_build_object(
               'horse_id', (h->>'horse_id')::uuid,
               'amount',   round((h->>'amount')::numeric, 2)
             ) ORDER BY (h->>'horse_id')
           )
      INTO v_horse_result
      FROM jsonb_array_elements(v_ha_arr) h;

    v_alloc_out := jsonb_build_object(
      'allocation_id',       v_alloc_id,
      'invoice_id',          v_invoice_id,
      'ledger_entry_id',     v_ledger_id,
      'payment_method',      v_method,
      'amount',              round(v_amount, 2),
      'client_level_amount', round(v_client_level, 2),
      'invoice_status',      v_new_status,
      'outstanding_after',   round(v_new_outstanding, 2),
      'horse_allocations',   COALESCE(v_horse_result, '[]'::jsonb)
    );
    v_results := v_results || jsonb_build_array(v_alloc_out);
  END LOOP;

  -- ------- 15. FROZEN RETURN OBJECT ---------------------------------------
  v_response := jsonb_build_object(
    'session_id',         v_session_id,
    'tenant_id',          p_tenant_id,
    'client_id',          v_common_client,
    'total_amount',       round(v_total, 2),
    'currency',           v_common_currency,
    'payment_date',       v_payment_date,
    'payment_account_id', v_account_id,
    'status',             'posted',
    'allocations',        v_results,
    'ledger_entry_ids',   to_jsonb(v_ledger_ids),
    'idempotency',        jsonb_build_object('key', p_idempotency_key, 'replay', false)
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_response, v_response);

  RETURN v_response;
END
$function$;

-- -------------------------------------------------------------------------
-- READER: get_payment_session
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_session(
  p_tenant_id  uuid,
  p_session_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor       uuid := auth.uid();
  v_sess        public.payment_sessions%ROWTYPE;
  v_allocations jsonb;
  v_ledger_ids  jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501';
  END IF;
  IF p_tenant_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.view') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_sess
    FROM public.payment_sessions
   WHERE id = p_session_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_SESSION_NOT_FOUND' USING ERRCODE='02000';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'allocation_id',       pa.id,
      'invoice_id',          pa.invoice_id,
      'ledger_entry_id',     pa.ledger_entry_id,
      'payment_method',      pa.payment_method,
      'amount',              pa.amount,
      'client_level_amount', pa.client_level_amount,
      'detail_status',       pa.detail_status,
      'external_reference',  pa.external_reference,
      'created_at',          pa.created_at,
      'horse_allocations',   COALESCE((
        SELECT jsonb_agg(jsonb_build_object('horse_id', pha.horse_id, 'amount', pha.amount)
                         ORDER BY pha.horse_id)
        FROM public.payment_horse_allocations pha
        WHERE pha.allocation_id = pa.id
      ), '[]'::jsonb)
    ) ORDER BY pa.created_at, pa.id
  ) INTO v_allocations
  FROM public.payment_allocations pa
  WHERE pa.session_id = p_session_id AND pa.tenant_id = p_tenant_id;

  SELECT jsonb_agg(pa.ledger_entry_id ORDER BY pa.created_at, pa.id)
    INTO v_ledger_ids
  FROM public.payment_allocations pa
  WHERE pa.session_id = p_session_id
    AND pa.tenant_id  = p_tenant_id
    AND pa.ledger_entry_id IS NOT NULL;

  RETURN jsonb_build_object(
    'session_id',         v_sess.id,
    'tenant_id',          v_sess.tenant_id,
    'client_id',          v_sess.client_id,
    'payment_account_id', v_sess.payment_account_id,
    'total_amount',       v_sess.total_amount,
    'currency',           v_sess.currency,
    'payment_date',       v_sess.payment_date,
    'reference_note',     v_sess.reference_note,
    'status',             v_sess.status,
    'created_by',         v_sess.created_by,
    'created_at',         v_sess.created_at,
    'updated_at',         v_sess.updated_at,
    'metadata',           v_sess.metadata,
    'allocations',        COALESCE(v_allocations, '[]'::jsonb),
    'ledger_entry_ids',   COALESCE(v_ledger_ids, '[]'::jsonb)
  );
END
$function$;

-- -------------------------------------------------------------------------
-- GRANTS
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.post_payment_session(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_payment_session(uuid, uuid, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.post_payment_session(uuid, uuid, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.post_payment_session(uuid, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.get_payment_session(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_payment_session(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_payment_session(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_payment_session(uuid, uuid) TO service_role;

-- -------------------------------------------------------------------------
-- COMMENTS
-- -------------------------------------------------------------------------
COMMENT ON FUNCTION public.post_payment_session(uuid, uuid, jsonb) IS
'Phase N+2 Slice 2. Atomic Payment Session writer.
Server-resolves tenant client, currency and payment account from locked invoices.
Exact-payment-only: rejects over-allocation per invoice under recomputed
outstanding. Horse and client-level allocation validated against frozen
invoice_items. Writes payment_sessions + payment_allocations +
payment_horse_allocations + ledger_entries + invoice status in one transaction
via canonical _finance_ledger_insert. Idempotent per finance_request_idempotency.
Reversal, refund, void, chargeback and client credit are deferred to Phase 5.';

COMMENT ON FUNCTION public.get_payment_session(uuid, uuid) IS
'Phase N+2 Slice 2. Permission-gated Payment Session reader.
Returns the persisted session, allocations (ordered by created_at, id),
per-allocation horse allocations, and ledger entry IDs. Requires active
tenant membership and finance.payment.view.';
