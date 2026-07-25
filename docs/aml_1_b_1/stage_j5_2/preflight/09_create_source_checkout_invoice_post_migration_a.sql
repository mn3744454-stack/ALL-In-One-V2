CREATE OR REPLACE FUNCTION public.create_source_checkout_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor            uuid := auth.uid();
  v_op               constant text := 'create_source_checkout_invoice';

  v_root_allowed constant text[] := ARRAY[
    'source_type','source_id','link_kind','client_name',
    'discount_amount','payment_method','prices_include_tax',
    'notes','items'
  ];
  v_lab_item_allowed constant text[] := ARRAY[
    'description','quantity','unit_price','is_taxable'
  ];
  v_root_key text;
  v_item_key text;

  v_source_type      text;
  v_source_id_text   text;
  v_source_id        uuid;
  v_link_kind        text;
  v_payment_method   text;
  v_discount         numeric := 0;
  v_notes            text;
  v_payload_client_name text;
  v_has_prices_flag  boolean := false;
  v_prices_include_tax boolean;

  v_lab_row          public.lab_samples%ROWTYPE;
  v_ord_row          public.horse_orders%ROWTYPE;
  v_source_client_id uuid;
  v_source_client_nm text;
  v_source_status    text;

  v_client_id        uuid;
  v_client_name      text;

  v_items            jsonb := '[]'::jsonb;
  v_item             jsonb;
  v_pos              integer := 0;
  v_qty              numeric;
  v_unit             numeric;
  v_desc             text;
  v_is_taxable_raw   jsonb;
  v_is_taxable       boolean;
  v_lab_horse_uuid   uuid;
  v_horse_uuid       uuid;
  v_order_type_name  text;
  v_horse_name       text;

  v_business_date    date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_invoice_payload  jsonb;
  v_create_key       uuid;
  v_approve_key      uuid;
  v_payment_key      uuid;
  v_create_resp      jsonb;
  v_approve_resp     jsonb;
  v_payment_result   jsonb;
  v_invoice_id       uuid;

  v_inv_row          public.invoices%ROWTYPE;
  v_account_id       uuid;
  v_source_link_id   uuid;
  v_final_status     text;

  v_replay           boolean;
  v_hash             bytea;
  v_stored           jsonb;
  v_source_hdr       jsonb;
  v_intent_hdr       jsonb;

  v_response         jsonb;
BEGIN
  -- 0. Authentication & non-null args
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;

  -- 1. Root payload whitelist + strict per-field type validation.
  FOR v_root_key IN SELECT pg_catalog.jsonb_object_keys(p_payload) LOOP
    IF NOT (v_root_key = ANY (v_root_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_root_key USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF NOT (p_payload ? 'source_type')
     OR pg_catalog.jsonb_typeof(p_payload->'source_type') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_SOURCE_TYPE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_source_type := pg_catalog.btrim(p_payload->>'source_type');
  IF v_source_type NOT IN ('lab_sample','horse_order') THEN
    RAISE EXCEPTION 'FIN_SOURCE_TYPE_INVALID' USING ERRCODE = '23514';
  END IF;

  IF NOT (p_payload ? 'source_id')
     OR pg_catalog.jsonb_typeof(p_payload->'source_id') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_SOURCE_ID_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_source_id_text := NULLIF(pg_catalog.btrim(p_payload->>'source_id'), '');
  IF v_source_id_text IS NULL THEN
    RAISE EXCEPTION 'FIN_SOURCE_ID_REQUIRED' USING ERRCODE = '23514';
  END IF;
  BEGIN
    v_source_id := v_source_id_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'FIN_SOURCE_ID_INVALID' USING ERRCODE = '23514';
  END;

  IF NOT (p_payload ? 'link_kind')
     OR pg_catalog.jsonb_typeof(p_payload->'link_kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_LINK_KIND_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_link_kind := pg_catalog.btrim(p_payload->>'link_kind');
  IF v_link_kind NOT IN ('deposit','final') THEN
    RAISE EXCEPTION 'FIN_LINK_KIND_INVALID' USING ERRCODE = '23514';
  END IF;

  IF NOT (p_payload ? 'payment_method')
     OR pg_catalog.jsonb_typeof(p_payload->'payment_method') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_payment_method := pg_catalog.btrim(p_payload->>'payment_method');
  IF v_payment_method NOT IN ('cash','card','transfer','debt') THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID' USING ERRCODE = '23514';
  END IF;

  IF p_payload ? 'prices_include_tax' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'prices_include_tax') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: prices_include_tax' USING ERRCODE = '23514';
    END IF;
    v_prices_include_tax := (p_payload->>'prices_include_tax')::boolean;
    v_has_prices_flag := true;
  END IF;

  IF p_payload ? 'discount_amount' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'discount_amount') NOT IN ('number','null') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: discount_amount' USING ERRCODE = '23514';
    END IF;
    IF pg_catalog.jsonb_typeof(p_payload->'discount_amount') = 'number' THEN
      BEGIN
        v_discount := (p_payload->>'discount_amount')::numeric;
      EXCEPTION
        WHEN invalid_text_representation OR numeric_value_out_of_range THEN
          RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE = '23514';
      END;
    ELSE
      v_discount := 0;
    END IF;
  END IF;
  IF v_discount < 0 THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  IF p_payload ? 'notes' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'notes') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: notes' USING ERRCODE = '23514';
    END IF;
    v_notes := NULLIF(pg_catalog.btrim(COALESCE(p_payload->>'notes','')), '');
  END IF;
  IF pg_catalog.char_length(COALESCE(v_notes, '')) > 500 THEN
    RAISE EXCEPTION 'FIN_NOTES_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  IF p_payload ? 'client_name' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'client_name') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: client_name' USING ERRCODE = '23514';
    END IF;
    v_payload_client_name := NULLIF(pg_catalog.btrim(COALESCE(p_payload->>'client_name','')), '');
  END IF;

  -- 2. Permission gates
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF v_payment_method IN ('cash','card','transfer') THEN
    IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
      RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. Source-specific payload validation
  IF v_source_type = 'lab_sample' THEN
    IF NOT (p_payload ? 'items')
       OR pg_catalog.jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array'
       OR pg_catalog.jsonb_array_length(p_payload->'items') < 1 THEN
      RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE = '23514';
    END IF;
    FOR v_item IN SELECT pg_catalog.jsonb_array_elements(p_payload->'items') LOOP
      IF pg_catalog.jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items[]' USING ERRCODE = '23514';
      END IF;
      FOR v_item_key IN SELECT pg_catalog.jsonb_object_keys(v_item) LOOP
        IF NOT (v_item_key = ANY (v_lab_item_allowed)) THEN
          RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: items[].%', v_item_key USING ERRCODE = '23514';
        END IF;
      END LOOP;
      IF NOT (v_item ? 'description')
         OR pg_catalog.jsonb_typeof(v_item->'description') IS DISTINCT FROM 'string'
         OR NULLIF(pg_catalog.btrim(v_item->>'description'), '') IS NULL THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_DESCRIPTION_REQUIRED' USING ERRCODE = '23514';
      END IF;
      IF NOT (v_item ? 'quantity')
         OR pg_catalog.jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END IF;
      BEGIN
        v_qty := (v_item->>'quantity')::numeric;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END;
      IF v_qty <= 0 THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END IF;
      IF NOT (v_item ? 'unit_price')
         OR pg_catalog.jsonb_typeof(v_item->'unit_price') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END IF;
      BEGIN
        v_unit := (v_item->>'unit_price')::numeric;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END;
      IF v_unit < 0 THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END IF;
      IF v_item ? 'is_taxable'
         AND pg_catalog.jsonb_typeof(v_item->'is_taxable') NOT IN ('boolean','null') THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items[].is_taxable' USING ERRCODE = '23514';
      END IF;
    END LOOP;
  ELSE
    IF p_payload ? 'items' THEN
      RAISE EXCEPTION 'FIN_HORSE_ORDER_ITEMS_FORBIDDEN' USING ERRCODE = '23514';
    END IF;
    IF v_link_kind <> 'final' THEN
      RAISE EXCEPTION 'FIN_HORSE_ORDER_LINK_KIND_INVALID' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- 4. Outer idempotency begin
  v_source_hdr := pg_catalog.jsonb_build_object(
    'tenant_id',   p_tenant_id,
    'source_type', v_source_type,
    'source_id',   v_source_id,
    'link_kind',   v_link_kind
  );
  v_intent_hdr := pg_catalog.jsonb_build_object('payload', p_payload);

  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(
           p_tenant_id, v_op, p_idempotency_key, v_actor,
           v_source_hdr, v_intent_hdr);
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  -- 5. Source lock + row load + status gates
  PERFORM pg_catalog.pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, v_source_type, v_source_id)
  );

  IF v_source_type = 'lab_sample' THEN
    SELECT * INTO v_lab_row FROM public.lab_samples
     WHERE id = v_source_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE = '23503'; END IF;
    v_source_status    := v_lab_row.status;
    v_source_client_id := v_lab_row.client_id;
    v_source_client_nm := NULLIF(pg_catalog.btrim(COALESCE(v_lab_row.client_name,'')), '');
    v_lab_horse_uuid   := v_lab_row.lab_horse_id;
    v_horse_uuid       := v_lab_row.horse_id;

    IF v_source_status = 'cancelled' THEN
      RAISE EXCEPTION 'FIN_SOURCE_CANCELLED' USING ERRCODE = '42501';
    END IF;
    IF v_link_kind = 'deposit' AND v_source_status NOT IN ('draft','accessioned') THEN
      RAISE EXCEPTION 'FIN_LAB_DEPOSIT_STATUS_INVALID' USING ERRCODE = '42501';
    END IF;
    IF v_link_kind = 'final' AND v_source_status <> 'completed' THEN
      RAISE EXCEPTION 'FIN_LAB_FINAL_STATUS_INVALID' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT * INTO v_ord_row FROM public.horse_orders
     WHERE id = v_source_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE = '23503'; END IF;
    v_source_status    := v_ord_row.status;
    v_source_client_id := v_ord_row.client_id;
    v_source_client_nm := NULL;
    v_horse_uuid       := v_ord_row.horse_id;

    IF v_source_status = 'cancelled' THEN
      RAISE EXCEPTION 'FIN_SOURCE_CANCELLED' USING ERRCODE = '42501';
    END IF;
    IF v_source_status <> 'completed' THEN
      RAISE EXCEPTION 'FIN_ORDER_NOT_COMPLETED' USING ERRCODE = '42501';
    END IF;

    v_unit := COALESCE(v_ord_row.actual_cost, v_ord_row.estimated_cost);
    IF v_unit IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_MISSING_COST' USING ERRCODE = '23514';
    END IF;
    IF v_horse_uuid IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_MISSING_HORSE' USING ERRCODE = '23514';
    END IF;
    SELECT NULLIF(pg_catalog.btrim(name), '') INTO v_horse_name
      FROM public.horses WHERE id = v_horse_uuid AND tenant_id = p_tenant_id;
    IF v_horse_name IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_HORSE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
    IF v_ord_row.order_type_id IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_TYPE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
    SELECT NULLIF(pg_catalog.btrim(name), '') INTO v_order_type_name
      FROM public.horse_order_types WHERE id = v_ord_row.order_type_id;
    IF v_order_type_name IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_TYPE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  END IF;

  -- 5b. Active same-kind Source Billing Link conflict
  IF EXISTS (
    SELECT 1 FROM public.billing_links bl
      JOIN public.invoices i ON i.id = bl.invoice_id
     WHERE bl.tenant_id   = p_tenant_id
       AND bl.source_type = v_source_type
       AND bl.source_id   = v_source_id
       AND bl.link_kind   = v_link_kind
       AND i.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'FIN_SOURCE_LINK_CONFLICT' USING ERRCODE = '23514';
  END IF;

  -- 6. Server-authoritative client identity
  IF v_source_client_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(pg_catalog.btrim(name_ar), ''),
                    NULLIF(pg_catalog.btrim(name), ''))
      INTO v_client_name
      FROM public.clients
     WHERE id = v_source_client_id AND tenant_id = p_tenant_id;
    IF v_client_name IS NULL THEN
      RAISE EXCEPTION 'FIN_SOURCE_CLIENT_CROSS_TENANT' USING ERRCODE = '23503';
    END IF;
    v_client_id := v_source_client_id;
  ELSE
    v_client_id   := NULL;
    v_client_name := pg_catalog.btrim(
                       COALESCE(v_source_client_nm, v_payload_client_name, 'Walk-in Customer'));
    IF v_client_name IS NULL OR v_client_name = '' THEN
      v_client_name := 'Walk-in Customer';
    END IF;
  END IF;
  IF pg_catalog.char_length(v_client_name) > 200 THEN
    RAISE EXCEPTION 'FIN_CLIENT_NAME_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  -- 7. Build nested invoice payload
  IF v_source_type = 'lab_sample' THEN
    v_pos := 0;
    v_items := '[]'::jsonb;
    FOR v_item IN SELECT pg_catalog.jsonb_array_elements(p_payload->'items') LOOP
      v_pos := v_pos + 1;
      v_desc := pg_catalog.btrim(v_item->>'description');
      v_qty  := (v_item->>'quantity')::numeric;
      v_unit := (v_item->>'unit_price')::numeric;
      v_is_taxable_raw := v_item->'is_taxable';
      IF v_is_taxable_raw IS NULL OR pg_catalog.jsonb_typeof(v_is_taxable_raw) = 'null' THEN
        v_is_taxable := true;
      ELSE
        v_is_taxable := (v_item->>'is_taxable')::boolean;
      END IF;

      v_items := v_items || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
          'description',  v_desc,
          'quantity',     v_qty,
          'unit_price',   v_unit,
          'is_taxable',   v_is_taxable,
          'horse_id',     CASE WHEN v_lab_horse_uuid IS NULL THEN v_horse_uuid ELSE NULL END,
          'lab_horse_id', v_lab_horse_uuid
        ))
      );
    END LOOP;
  ELSE
    v_items := pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'description', v_order_type_name || ' - ' || v_horse_name,
        'quantity',    1,
        'unit_price',  v_unit,
        'is_taxable',  true,
        'horse_id',    v_horse_uuid
      )
    );
  END IF;

  v_invoice_payload := pg_catalog.jsonb_build_object(
    'client_id',       v_client_id,
    'client_name',     v_client_name,
    'issue_date',      pg_catalog.to_char(v_business_date, 'YYYY-MM-DD'),
    'due_date',        pg_catalog.to_char(v_business_date, 'YYYY-MM-DD'),
    'discount_amount', v_discount,
    'items',           v_items
  );
  IF v_notes IS NOT NULL THEN
    v_invoice_payload := v_invoice_payload || pg_catalog.jsonb_build_object('notes', v_notes);
  END IF;
  IF v_has_prices_flag THEN
    v_invoice_payload := v_invoice_payload
      || pg_catalog.jsonb_build_object('prices_include_tax', v_prices_include_tax);
  END IF;

  -- 8. Deterministic child idempotency keys
  v_create_key  := (pg_catalog.md5(p_idempotency_key::text || ':create_invoice_with_items'))::uuid;
  v_approve_key := (pg_catalog.md5(p_idempotency_key::text || ':approve_invoice'))::uuid;
  v_payment_key := (pg_catalog.md5(p_idempotency_key::text || ':post_payment'))::uuid;

  -- 9. Nested create_invoice_with_items
  v_create_resp := public.create_invoice_with_items(
                     p_tenant_id, v_create_key, v_invoice_payload);
  v_invoice_id  := (v_create_resp->>'invoice_id')::uuid;
  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_NESTED_CREATE_NO_INVOICE_ID' USING ERRCODE = '23503';
  END IF;

  -- 10. Trusted trace helper (server-owned; stamps entity_type/entity_id)
  PERFORM public._finance_source_checkout_apply_trace(
            p_tenant_id, v_invoice_id, v_source_type, v_source_id);

  -- Failure-injection hook (FIN_TEST_FAIL_AFTER_TRACE); inert unless SET LOCAL fin.fail_after_trace='raise'.
  IF pg_catalog.current_setting('fin.fail_after_trace', true) = 'raise' THEN
    RAISE EXCEPTION 'FIN_TEST_FAIL_AFTER_TRACE' USING ERRCODE = 'P0001';
  END IF;

  -- 11. Approve
  v_approve_resp := public.approve_invoice(p_tenant_id, v_approve_key, v_invoice_id);

  -- Failure-injection hook (FIN_TEST_FAIL_AFTER_APPROVE).
  IF pg_catalog.current_setting('fin.fail_after_approve', true) = 'raise' THEN
    RAISE EXCEPTION 'FIN_TEST_FAIL_AFTER_APPROVE' USING ERRCODE = 'P0001';
  END IF;

  -- 12. Read approved invoice; require positive total.
  SELECT * INTO v_inv_row FROM public.invoices
   WHERE id = v_invoice_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF COALESCE(v_inv_row.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'FIN_CHECKOUT_TOTAL_INVALID' USING ERRCODE = '23514';
  END IF;

  -- 13. Payment handling
  IF v_payment_method = 'debt' THEN
    v_payment_result := NULL;
    UPDATE public.invoices
       SET payment_method = 'debt', updated_at = now()
     WHERE id = v_invoice_id AND tenant_id = p_tenant_id
       AND status = 'approved' AND payment_received_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_DEBT_STATE_INVALID' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT id INTO v_account_id FROM public.payment_accounts
     WHERE tenant_id = p_tenant_id AND owner_type = 'tenant' AND is_active = true;
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'FIN_TENANT_PAYMENT_ACCOUNT_MISSING' USING ERRCODE = '23503';
    END IF;
    v_payment_result := public.post_payment(
      p_tenant_id, v_payment_key, v_invoice_id, v_inv_row.total_amount,
      v_business_date, v_payment_method, v_account_id,
      pg_catalog.jsonb_build_object('currency', COALESCE(v_inv_row.currency, 'SAR'))
    );
  END IF;

  -- Failure-injection hook (FIN_TEST_FAIL_AFTER_PAYMENT).
  IF pg_catalog.current_setting('fin.fail_after_payment', true) = 'raise' THEN
    RAISE EXCEPTION 'FIN_TEST_FAIL_AFTER_PAYMENT' USING ERRCODE = 'P0001';
  END IF;

  -- 14. Re-read final invoice and verify terminal contract.
  SELECT * INTO v_inv_row FROM public.invoices
   WHERE id = v_invoice_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF v_payment_method = 'debt' THEN
    IF v_inv_row.status <> 'approved' THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_DEBT_STATUS_INVALID' USING ERRCODE = '23514';
    END IF;
    IF v_inv_row.payment_method IS DISTINCT FROM 'debt' THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_DEBT_PAYMENT_METHOD_INVALID' USING ERRCODE = '23514';
    END IF;
    IF v_inv_row.payment_received_at IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_DEBT_HAS_PAYMENT_RECEIVED_AT' USING ERRCODE = '23514';
    END IF;
    v_final_status := 'approved';
  ELSE
    IF v_inv_row.status <> 'paid' THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_NOT_FULLY_PAID' USING ERRCODE = '23514';
    END IF;
    IF v_inv_row.payment_method IS DISTINCT FROM v_payment_method THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_PAYMENT_METHOD_MISMATCH' USING ERRCODE = '23514';
    END IF;
    IF v_inv_row.payment_received_at IS NULL THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_PAYMENT_RECEIVED_AT_MISSING' USING ERRCODE = '23514';
    END IF;
    v_final_status := 'paid';
  END IF;

  -- 15. Source Billing Link (corrects=NULL)
  v_source_link_id := public._finance_billing_link_upsert(
                        p_tenant_id, v_source_type, v_source_id, v_invoice_id,
                        v_link_kind, v_inv_row.total_amount, v_actor, NULL);
  IF v_source_link_id IS NULL THEN
    RAISE EXCEPTION 'FIN_SOURCE_LINK_UPSERT_FAILED' USING ERRCODE = '23514';
  END IF;

  -- Failure-injection hook (FIN_TEST_FAIL_AFTER_SOURCE_LINK).
  IF pg_catalog.current_setting('fin.fail_after_source_link', true) = 'raise' THEN
    RAISE EXCEPTION 'FIN_TEST_FAIL_AFTER_SOURCE_LINK' USING ERRCODE = 'P0001';
  END IF;

  -- 16. Build response from persisted final invoice values.
  v_response := pg_catalog.jsonb_build_object(
    'invoice_id',             v_invoice_id,
    'invoice_number',         v_inv_row.invoice_number,
    'subtotal',               v_inv_row.subtotal,
    'tax_amount',             COALESCE(v_inv_row.tax_amount, 0),
    'discount_amount',        COALESCE(v_inv_row.discount_amount, 0),
    'total_amount',           v_inv_row.total_amount,
    'prices_include_tax',     v_inv_row.prices_include_tax,
    'currency',               COALESCE(v_inv_row.currency, 'SAR'),
    'status',                 v_final_status,
    'payment_method',         v_inv_row.payment_method,
    'client_id',              v_client_id,
    'client_name',            v_client_name,
    'source_type',            v_source_type,
    'source_id',              v_source_id,
    'source_link_kind',       v_link_kind,
    'source_billing_link_id', v_source_link_id,
    'payment_result',         v_payment_result
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_response, v_response);

  RETURN v_response;
END
$function$

