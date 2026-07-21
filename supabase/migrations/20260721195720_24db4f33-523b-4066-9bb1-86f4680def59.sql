-- AML.1.b.1 Stage 6 N+1 — §7.1–§7.5 Canonical Invoice RPC Family
-- Creates:
--   Private helper: _finance_ledger_insert (§10.1) - required by approve_invoice, cancel_invoice
--   Public RPCs (§7.1–§7.5):
--     create_invoice_with_items, update_invoice_with_items,
--     delete_draft_invoice, approve_invoice, cancel_invoice
--
-- All RPCs: SECURITY DEFINER, owner postgres, hardened search_path=''.
-- PUBLIC/anon: no EXECUTE. authenticated: EXECUTE.
-- Level-I idempotency via _finance_idempotency_begin/_complete (Stage 5).
-- Server-authoritative: totals, currency, invoice_number, status, ledger effects.

-- =====================================================================
-- §10.1 Private helper: _finance_ledger_insert
-- =====================================================================
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
AS $fn$
DECLARE
  v_id           uuid;
  v_running      numeric := 0;
  v_row          record;
  v_new_bal      numeric := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_entry_type IS NULL OR p_reference_type IS NULL
     OR p_amount IS NULL OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_LEDGER_INSERT_BAD_ARGS' USING ERRCODE = '22023';
  END IF;

  IF p_client_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      public._finance_advisory_lock_key(p_tenant_id, 'client_ledger', p_client_id)
    );
  END IF;

  INSERT INTO public.ledger_entries (
    tenant_id, client_id, entry_type, reference_type, reference_id,
    amount, balance_after, description, created_by,
    payment_method, metadata, payment_session_id, effective_date
  ) VALUES (
    p_tenant_id, p_client_id, p_entry_type, p_reference_type, p_reference_id,
    p_amount, 0, p_description, p_created_by,
    p_payment_method, COALESCE(p_metadata, '{}'::jsonb), p_payment_session_id, p_effective_date
  )
  RETURNING id INTO v_id;

  IF p_client_id IS NULL THEN
    RETURN QUERY SELECT v_id, 0::numeric;
    RETURN;
  END IF;

  v_running := 0;
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

  INSERT INTO public.customer_balances (tenant_id, client_id, balance, currency, last_updated)
  SELECT p_tenant_id, p_client_id, v_running,
         COALESCE((SELECT currency FROM public.tenants WHERE id = p_tenant_id), 'SAR'),
         now()
  ON CONFLICT (tenant_id, client_id)
  DO UPDATE SET balance = EXCLUDED.balance, last_updated = now();

  RETURN QUERY SELECT v_id, v_new_bal;
END
$fn$;

ALTER FUNCTION public._finance_ledger_insert(uuid, uuid, text, text, uuid, numeric, date, text, text, uuid, jsonb, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_ledger_insert(uuid, uuid, text, text, uuid, numeric, date, text, text, uuid, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_ledger_insert(uuid, uuid, text, text, uuid, numeric, date, text, text, uuid, jsonb, uuid) FROM anon, authenticated;

-- =====================================================================
-- Local helper: strict payload key allowlist (invoice create/update)
-- =====================================================================
CREATE OR REPLACE FUNCTION public._finance_invoice_payload_reject_unknown(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $fn$
DECLARE
  v_key text;
  v_allowed text[] := ARRAY[
    'client_id','client_name','issue_date','due_date',
    'notes','discount_amount','items'
  ];
  v_item_allowed text[] := ARRAY[
    'service_id','description','quantity','unit_price','horse_id',
    'domain','category_id','period_start','period_end','package_id'
  ];
  v_item jsonb;
  v_item_key text;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE = '23514';
    END IF;
  END LOOP;
  IF p_payload ? 'items' THEN
    IF jsonb_typeof(p_payload->'items') <> 'array' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
    END IF;
    FOR v_item IN SELECT jsonb_array_elements(p_payload->'items') LOOP
      IF jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
      END IF;
      FOR v_item_key IN SELECT jsonb_object_keys(v_item) LOOP
        IF NOT (v_item_key = ANY(v_item_allowed)) THEN
          RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: items[].%', v_item_key USING ERRCODE = '23514';
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END
$fn$;

ALTER FUNCTION public._finance_invoice_payload_reject_unknown(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_invoice_payload_reject_unknown(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_invoice_payload_reject_unknown(jsonb) FROM anon, authenticated;

-- =====================================================================
-- Local helper: compute totals server-side from validated payload + tenant config
-- =====================================================================
CREATE OR REPLACE FUNCTION public._finance_invoice_compute_totals(
  p_tenant_id uuid,
  p_payload   jsonb
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $fn$
DECLARE
  v_rate         numeric;
  v_inclusive    boolean;
  v_currency     text;
  v_subtotal     numeric := 0;
  v_discount     numeric := 0;
  v_tax_base     numeric := 0;
  v_tax          numeric := 0;
  v_total        numeric := 0;
  v_items        jsonb := '[]'::jsonb;
  v_item         jsonb;
  v_qty          numeric;
  v_unit         numeric;
  v_line         numeric;
  v_pos          int := 0;
BEGIN
  SELECT COALESCE(default_tax_rate, 15), COALESCE(prices_tax_inclusive, false), COALESCE(currency, 'SAR')
    INTO v_rate, v_inclusive, v_currency
    FROM public.tenants WHERE id = p_tenant_id;

  IF NOT (p_payload ? 'items') OR jsonb_array_length(p_payload->'items') < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE = '23514';
  END IF;

  v_discount := COALESCE((p_payload->>'discount_amount')::numeric, 0);
  IF v_discount < 0 THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_payload->'items') LOOP
    v_pos := v_pos + 1;
    v_qty  := COALESCE((v_item->>'quantity')::numeric, 0);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_QUANTITY_INVALID: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF v_unit < 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_PRICE_INVALID: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF COALESCE(v_item->>'description','') = '' THEN
      RAISE EXCEPTION 'FIN_ITEM_DESCRIPTION_REQUIRED: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    v_line := round((v_qty * v_unit)::numeric, 2);
    v_subtotal := v_subtotal + v_line;
    v_items := v_items || jsonb_build_object(
      'position', v_pos,
      'service_id', v_item->'service_id',
      'description', v_item->>'description',
      'quantity', v_qty,
      'unit_price', v_unit,
      'total_price', v_line,
      'horse_id', v_item->'horse_id',
      'domain', v_item->>'domain',
      'category_id', v_item->'category_id',
      'period_start', v_item->>'period_start',
      'period_end', v_item->>'period_end',
      'package_id', v_item->'package_id'
    );
  END LOOP;

  IF v_discount > v_subtotal THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_EXCEEDS_TOTAL' USING ERRCODE = '23514';
  END IF;

  IF v_inclusive THEN
    v_total := round((v_subtotal - v_discount)::numeric, 2);
    IF v_rate > 0 AND v_total > 0 THEN
      v_tax := round((v_total * v_rate / (100 + v_rate))::numeric, 2);
    END IF;
    v_subtotal := round((v_total - v_tax)::numeric + v_discount, 2);
  ELSE
    v_tax_base := round((v_subtotal - v_discount)::numeric, 2);
    IF v_rate > 0 AND v_tax_base > 0 THEN
      v_tax := round((v_tax_base * v_rate / 100)::numeric, 2);
    END IF;
    v_total := round((v_tax_base + v_tax)::numeric, 2);
  END IF;

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'tax_amount', v_tax,
    'discount_amount', v_discount,
    'total_amount', v_total,
    'currency', v_currency,
    'items', v_items
  );
END
$fn$;

ALTER FUNCTION public._finance_invoice_compute_totals(uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_invoice_compute_totals(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_invoice_compute_totals(uuid, jsonb) FROM anon, authenticated;

-- =====================================================================
-- §7.1 create_invoice_with_items
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_invoice_with_items(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_payload         jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor         uuid := auth.uid();
  v_op            text := 'create_invoice_with_items';
  v_source        jsonb;
  v_intent        jsonb;
  v_replay        boolean;
  v_hash          bytea;
  v_stored        jsonb;
  v_computed      jsonb;
  v_invoice_id    uuid := gen_random_uuid();
  v_invoice_num   text;
  v_client_id     uuid;
  v_issue_date    date;
  v_due_date      date;
  v_notes         text;
  v_client_name   text;
  v_item          jsonb;
  v_snapshot      jsonb;
  v_response      jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  PERFORM public._finance_invoice_payload_reject_unknown(p_payload);

  v_client_id   := NULLIF(p_payload->>'client_id','')::uuid;
  v_client_name := NULLIF(p_payload->>'client_name','');
  v_issue_date  := (p_payload->>'issue_date')::date;
  v_due_date    := NULLIF(p_payload->>'due_date','')::date;
  v_notes       := p_payload->>'notes';

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_issue_date > (current_date + 7) THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_OUT_OF_RANGE' USING ERRCODE = '23514';
  END IF;
  IF v_due_date IS NOT NULL AND v_due_date < v_issue_date THEN
    RAISE EXCEPTION 'FIN_DUE_DATE_BEFORE_ISSUE' USING ERRCODE = '23514';
  END IF;

  IF v_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client_id AND tenant_id = p_tenant_id) THEN
      RAISE EXCEPTION 'FIN_CLIENT_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id);
  v_intent := jsonb_build_object('payload', p_payload);
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  v_computed := public._finance_invoice_compute_totals(p_tenant_id, p_payload);
  v_invoice_num := public._finance_invoice_number_next(p_tenant_id, 'manual');

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'manual_invoice', v_invoice_id)
  );

  INSERT INTO public.invoices (
    id, tenant_id, invoice_number, client_id, client_name, status,
    issue_date, due_date, subtotal, tax_amount, discount_amount,
    total_amount, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_invoice_id, p_tenant_id, v_invoice_num, v_client_id, v_client_name, 'draft',
    v_issue_date, v_due_date,
    (v_computed->>'subtotal')::numeric,
    (v_computed->>'tax_amount')::numeric,
    (v_computed->>'discount_amount')::numeric,
    (v_computed->>'total_amount')::numeric,
    v_computed->>'currency', v_notes, v_actor, now(), now()
  );

  FOR v_item IN SELECT jsonb_array_elements(v_computed->'items') LOOP
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, total_price,
      service_id, horse_id, domain, category_id, period_start, period_end,
      package_id, position
    ) VALUES (
      v_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      NULLIF(v_item->>'service_id','')::uuid,
      NULLIF(v_item->>'horse_id','')::uuid,
      NULLIF(v_item->>'domain',''),
      NULLIF(v_item->>'category_id','')::uuid,
      NULLIF(v_item->>'period_start','')::date,
      NULLIF(v_item->>'period_end','')::date,
      NULLIF(v_item->>'package_id','')::uuid,
      (v_item->>'position')::int
    );
  END LOOP;

  v_snapshot := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'header', v_computed,
    'client_id', v_client_id,
    'issue_date', v_issue_date,
    'due_date', v_due_date
  );
  v_response := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'snapshot', v_snapshot
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
  );
  RETURN v_response;
END
$fn$;

ALTER FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) TO authenticated;

-- =====================================================================
-- §7.2 update_invoice_with_items
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_invoice_with_items(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid,
  p_payload         jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor       uuid := auth.uid();
  v_op          text := 'update_invoice_with_items';
  v_source      jsonb;
  v_intent      jsonb;
  v_replay      boolean;
  v_hash        bytea;
  v_stored      jsonb;
  v_inv         record;
  v_computed    jsonb;
  v_client_id   uuid;
  v_client_name text;
  v_issue_date  date;
  v_due_date    date;
  v_notes       text;
  v_item        jsonb;
  v_snapshot    jsonb;
  v_response    jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.edit') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  PERFORM public._finance_invoice_payload_reject_unknown(p_payload);

  v_client_id   := NULLIF(p_payload->>'client_id','')::uuid;
  v_client_name := NULLIF(p_payload->>'client_name','');
  v_issue_date  := (p_payload->>'issue_date')::date;
  v_due_date    := NULLIF(p_payload->>'due_date','')::date;
  v_notes       := p_payload->>'notes';

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_due_date IS NOT NULL AND v_due_date < v_issue_date THEN
    RAISE EXCEPTION 'FIN_DUE_DATE_BEFORE_ISSUE' USING ERRCODE = '23514';
  END IF;
  IF v_client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients WHERE id = v_client_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'FIN_CLIENT_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id);
  v_intent := jsonb_build_object('payload', p_payload);
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'manual_invoice', p_invoice_id)
  );

  SELECT * INTO v_inv FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_DRAFT' USING ERRCODE = '42501';
  END IF;

  v_computed := public._finance_invoice_compute_totals(p_tenant_id, p_payload);

  UPDATE public.invoices SET
    client_id       = v_client_id,
    client_name     = v_client_name,
    issue_date      = v_issue_date,
    due_date        = v_due_date,
    notes           = v_notes,
    subtotal        = (v_computed->>'subtotal')::numeric,
    tax_amount      = (v_computed->>'tax_amount')::numeric,
    discount_amount = (v_computed->>'discount_amount')::numeric,
    total_amount    = (v_computed->>'total_amount')::numeric,
    currency        = v_computed->>'currency',
    updated_at      = now()
  WHERE id = p_invoice_id;

  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  FOR v_item IN SELECT jsonb_array_elements(v_computed->'items') LOOP
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, total_price,
      service_id, horse_id, domain, category_id, period_start, period_end,
      package_id, position
    ) VALUES (
      p_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      NULLIF(v_item->>'service_id','')::uuid,
      NULLIF(v_item->>'horse_id','')::uuid,
      NULLIF(v_item->>'domain',''),
      NULLIF(v_item->>'category_id','')::uuid,
      NULLIF(v_item->>'period_start','')::date,
      NULLIF(v_item->>'period_end','')::date,
      NULLIF(v_item->>'package_id','')::uuid,
      (v_item->>'position')::int
    );
  END LOOP;

  v_snapshot := jsonb_build_object('invoice_id', p_invoice_id, 'header', v_computed);
  v_response := jsonb_build_object('invoice_id', p_invoice_id, 'snapshot', v_snapshot);

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
  );
  RETURN v_response;
END
$fn$;

ALTER FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) TO authenticated;

-- =====================================================================
-- §7.3 delete_draft_invoice
-- =====================================================================
CREATE OR REPLACE FUNCTION public.delete_draft_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor    uuid := auth.uid();
  v_op       text := 'delete_draft_invoice';
  v_source   jsonb;
  v_intent   jsonb;
  v_replay   boolean;
  v_hash     bytea;
  v_stored   jsonb;
  v_inv      record;
  v_has_link boolean;
  v_snapshot jsonb;
  v_response jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.delete') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id);
  v_intent := '{}'::jsonb;
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'manual_invoice', p_invoice_id)
  );

  SELECT * INTO v_inv FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_DRAFT' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.billing_links WHERE invoice_id = p_invoice_id)
    INTO v_has_link;
  IF v_has_link THEN
    RAISE EXCEPTION 'FIN_INVOICE_HAS_LINKS' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  DELETE FROM public.invoices WHERE id = p_invoice_id AND tenant_id = p_tenant_id;

  v_snapshot := jsonb_build_object('deleted_invoice_id', p_invoice_id);
  v_response := jsonb_build_object('deleted', true, 'invoice_id', p_invoice_id);

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
  );
  RETURN v_response;
END
$fn$;

ALTER FUNCTION public.delete_draft_invoice(uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_draft_invoice(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_draft_invoice(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_draft_invoice(uuid, uuid, uuid) TO authenticated;

-- =====================================================================
-- §7.4 approve_invoice
-- =====================================================================
CREATE OR REPLACE FUNCTION public.approve_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor       uuid := auth.uid();
  v_op          text := 'approve_invoice';
  v_source      jsonb;
  v_intent      jsonb;
  v_replay      boolean;
  v_hash        bytea;
  v_stored      jsonb;
  v_inv         record;
  v_item_count  int;
  v_ledger_id   uuid;
  v_bal_after   numeric;
  v_desc        text;
  v_snapshot    jsonb;
  v_response    jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id);
  v_intent := '{}'::jsonb;
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'manual_invoice', p_invoice_id)
  );

  SELECT * INTO v_inv FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_DRAFT' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_item_count FROM public.invoice_items WHERE invoice_id = p_invoice_id;
  IF v_item_count < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE = '23514';
  END IF;

  IF COALESCE(v_inv.total_amount, 0) < 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_TOTAL_INVALID' USING ERRCODE = '23514';
  END IF;

  UPDATE public.invoices SET status = 'approved', updated_at = now()
   WHERE id = p_invoice_id;

  IF COALESCE(v_inv.total_amount, 0) > 0 AND v_inv.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries
       WHERE tenant_id = p_tenant_id
         AND reference_type = 'invoice'
         AND reference_id = p_invoice_id
         AND entry_type = 'invoice'
    ) THEN
      v_desc := 'Invoice ' || v_inv.invoice_number;
      SELECT ledger_entry_id, balance_after
        INTO v_ledger_id, v_bal_after
        FROM public._finance_ledger_insert(
          p_tenant_id, v_inv.client_id, 'invoice', 'invoice', p_invoice_id,
          v_inv.total_amount, v_inv.issue_date, v_desc,
          NULL, NULL, jsonb_build_object('invoice_number', v_inv.invoice_number), v_actor
        );
    ELSE
      SELECT id INTO v_ledger_id FROM public.ledger_entries
       WHERE tenant_id = p_tenant_id
         AND reference_type = 'invoice'
         AND reference_id = p_invoice_id
         AND entry_type = 'invoice'
       LIMIT 1;
    END IF;
  END IF;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'ledger_entry_id', v_ledger_id,
    'effective_date', v_inv.issue_date
  );
  v_response := v_snapshot;

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
  );
  RETURN v_response;
END
$fn$;

ALTER FUNCTION public.approve_invoice(uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.approve_invoice(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_invoice(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid, uuid, uuid) TO authenticated;

-- =====================================================================
-- §7.5 cancel_invoice
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cancel_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid,
  p_effective_date  date,
  p_reason          text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_actor       uuid := auth.uid();
  v_op          text := 'cancel_invoice';
  v_source      jsonb;
  v_intent      jsonb;
  v_replay      boolean;
  v_hash        bytea;
  v_stored      jsonb;
  v_inv         record;
  v_has_payment boolean;
  v_ledger_id   uuid;
  v_bal_after   numeric;
  v_desc        text;
  v_snapshot    jsonb;
  v_response    jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_EFFECTIVE_DATE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'FIN_REASON_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.cancel') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  v_source := jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id);
  v_intent := jsonb_build_object('effective_date', p_effective_date, 'reason', p_reason);
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(p_tenant_id, v_op, p_idempotency_key, v_actor, v_source, v_intent);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'manual_invoice', p_invoice_id)
  );

  SELECT * INTO v_inv FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF v_inv.status = 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: use delete_draft_invoice' USING ERRCODE = '42501';
  END IF;
  IF v_inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: already cancelled' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.payment_intents
     WHERE tenant_id = p_tenant_id
       AND reference_type = 'invoice'::public.payment_reference_type
       AND reference_id = p_invoice_id
       AND status::text IN ('paid','pending')
  ) INTO v_has_payment;

  IF v_inv.status IN ('partial','paid') OR v_has_payment THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: payments exist' USING ERRCODE = '42501';
  END IF;

  IF v_inv.status IN ('reviewed','issued','sent','shared')
     AND NOT EXISTS (
       SELECT 1 FROM public.ledger_entries
        WHERE tenant_id = p_tenant_id
          AND reference_type = 'invoice' AND reference_id = p_invoice_id
          AND entry_type = 'invoice'
     ) THEN
    UPDATE public.invoices SET status = 'cancelled', updated_at = now()
     WHERE id = p_invoice_id;
    v_snapshot := jsonb_build_object(
      'invoice_id', p_invoice_id,
      'reversal_ledger_entry_id', NULL,
      'effective_date', p_effective_date,
      'reason', p_reason
    );
    v_response := v_snapshot;
    PERFORM public._finance_idempotency_complete(
      p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
    );
    RETURN v_response;
  END IF;

  IF v_inv.status IN ('approved','shared','overdue') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries
       WHERE tenant_id = p_tenant_id
         AND reference_type = 'invoice' AND reference_id = p_invoice_id
         AND entry_type = 'invoice'
    ) AND COALESCE(v_inv.total_amount, 0) > 0 AND v_inv.client_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_INVOICE_LEDGER_MISSING' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.ledger_entries
       WHERE tenant_id = p_tenant_id
         AND reference_type = 'invoice' AND reference_id = p_invoice_id
         AND entry_type = 'invoice' AND amount < 0
    ) THEN
      SELECT id INTO v_ledger_id FROM public.ledger_entries
       WHERE tenant_id = p_tenant_id
         AND reference_type = 'invoice' AND reference_id = p_invoice_id
         AND entry_type = 'invoice' AND amount < 0
       LIMIT 1;
    ELSIF COALESCE(v_inv.total_amount, 0) > 0 AND v_inv.client_id IS NOT NULL THEN
      v_desc := 'Cancellation of ' || v_inv.invoice_number || COALESCE(' — ' || p_reason, '');
      SELECT ledger_entry_id, balance_after
        INTO v_ledger_id, v_bal_after
        FROM public._finance_ledger_insert(
          p_tenant_id, v_inv.client_id, 'invoice', 'invoice', p_invoice_id,
          -v_inv.total_amount, p_effective_date, v_desc,
          NULL, NULL,
          jsonb_build_object('invoice_number', v_inv.invoice_number, 'reversal', true, 'reason', p_reason),
          v_actor
        );
    END IF;

    UPDATE public.invoices SET status = 'cancelled', updated_at = now()
     WHERE id = p_invoice_id;
  ELSE
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE' USING ERRCODE = '42501';
  END IF;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'reversal_ledger_entry_id', v_ledger_id,
    'effective_date', p_effective_date,
    'reason', p_reason
  );
  v_response := v_snapshot;
  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_response
  );
  RETURN v_response;
END
$fn$;

ALTER FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) TO authenticated;