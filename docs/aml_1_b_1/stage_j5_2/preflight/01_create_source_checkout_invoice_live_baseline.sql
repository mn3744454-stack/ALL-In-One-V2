CREATE OR REPLACE FUNCTION public.create_source_checkout_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'create_source_checkout_invoice';
  v_replay boolean; v_hash bytea; v_stored jsonb;
  v_root_allowed constant text[] := ARRAY['source_type','source_id','client_id','client_name',
    'discount_amount','payment_method','prices_include_tax','notes','items'];
  v_item_allowed constant text[] := ARRAY['service_id','service_source','package_id',
    'description','quantity','unit_price','is_taxable','horse_id','lab_horse_id','domain','category_id'];
  v_key text; v_item jsonb; v_ikey text;
  v_source_type text; v_source_id uuid; v_client_id uuid; v_client_name text;
  v_discount numeric; v_payment_method text; v_inclusive_raw jsonb;
  v_notes text; v_items jsonb;
  v_canonical_client_name text;
  v_compute_payload jsonb; v_computed jsonb; v_computed_items jsonb;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_subtotal numeric; v_tax numeric; v_total numeric; v_currency text; v_inclusive boolean;
  v_account_id uuid;
  v_link_id uuid;
  v_pay_result jsonb;
  v_final_status text;
  v_snapshot jsonb;
  v_pos int := 0;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.create')
     OR NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  -- Strict root whitelist
  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF NOT (v_key = ANY (v_root_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='23514';
    END IF;
  END LOOP;

  v_source_type    := NULLIF(btrim(p_payload->>'source_type'), '');
  v_source_id      := NULLIF(p_payload->>'source_id','')::uuid;
  v_client_id      := NULLIF(p_payload->>'client_id','')::uuid;
  v_client_name    := NULLIF(btrim(p_payload->>'client_name'), '');
  v_discount       := COALESCE(NULLIF(p_payload->>'discount_amount','')::numeric, 0);
  v_payment_method := NULLIF(btrim(p_payload->>'payment_method'), '');
  v_inclusive_raw  := p_payload->'prices_include_tax';
  v_notes          := NULLIF(btrim(p_payload->>'notes'), '');
  v_items          := p_payload->'items';

  IF v_source_type NOT IN ('lab_sample','horse_order') THEN
    RAISE EXCEPTION 'FIN_SOURCE_TYPE_UNSUPPORTED' USING ERRCODE='23514';
  END IF;
  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'FIN_SOURCE_ID_REQUIRED' USING ERRCODE='23514';
  END IF;
  IF v_payment_method NOT IN ('cash','card','transfer','debt') THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID' USING ERRCODE='23514';
  END IF;
  IF v_payment_method <> 'debt'
     AND NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;
  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE='23514';
  END IF;

  -- Validate source tenant ownership
  IF v_source_type = 'lab_sample' THEN
    IF NOT EXISTS (SELECT 1 FROM public.lab_samples
                    WHERE id = v_source_id AND tenant_id = p_tenant_id) THEN
      RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE='23503';
    END IF;
  ELSIF v_source_type = 'horse_order' THEN
    IF NOT EXISTS (SELECT 1 FROM public.horse_orders
                    WHERE id = v_source_id AND tenant_id = p_tenant_id) THEN
      RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE='23503';
    END IF;
  END IF;

  -- Client name resolution
  IF v_client_id IS NOT NULL THEN
    SELECT name INTO v_canonical_client_name
      FROM public.clients WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF v_canonical_client_name IS NULL THEN
      RAISE EXCEPTION 'FIN_CLIENT_NOT_FOUND' USING ERRCODE='23503';
    END IF;
  ELSE
    IF v_client_name IS NULL THEN
      v_canonical_client_name := 'Walk-in Customer';
    ELSE
      IF length(v_client_name) > 200 THEN
        RAISE EXCEPTION 'FIN_CLIENT_NAME_TOO_LONG' USING ERRCODE='23514';
      END IF;
      v_canonical_client_name := v_client_name;
    END IF;
  END IF;

  -- Idempotency
  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(
      p_tenant_id, v_op, p_idempotency_key, v_actor,
      jsonb_build_object('tenant_id',p_tenant_id,'source_type',v_source_type,'source_id',v_source_id),
      jsonb_build_object('payload', p_payload)
    );
  IF v_replay THEN RETURN v_stored; END IF;

  -- Build sanitized compute payload (strictly _finance_invoice_payload_reject_unknown-safe).
  SELECT jsonb_build_object(
    'discount_amount', v_discount,
    'prices_include_tax',
      CASE WHEN v_inclusive_raw IS NOT NULL AND jsonb_typeof(v_inclusive_raw)='boolean'
           THEN (v_inclusive_raw)::boolean ELSE NULL END,
    'items', COALESCE(jsonb_agg(sanitized ORDER BY ord), '[]'::jsonb)
  )
    INTO v_compute_payload
    FROM (
      SELECT ord,
             (
               SELECT jsonb_object_agg(k, v)
                 FROM jsonb_each(elem) x(k,v)
                WHERE k = ANY(v_item_allowed)
             ) AS sanitized
        FROM jsonb_array_elements(v_items) WITH ORDINALITY AS t(elem, ord)
    ) s;

  -- Reject unknown item keys explicitly.
  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    v_pos := v_pos + 1;
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items[]' USING ERRCODE='23514';
    END IF;
    FOR v_ikey IN SELECT jsonb_object_keys(v_item) LOOP
      IF NOT (v_ikey = ANY(v_item_allowed)) THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: items[%].%', v_pos, v_ikey USING ERRCODE='23514';
      END IF;
    END LOOP;
  END LOOP;

  v_computed := public._finance_invoice_compute_totals(p_tenant_id, v_compute_payload);
  v_subtotal := (v_computed->>'subtotal')::numeric;
  v_tax      := (v_computed->>'tax_amount')::numeric;
  v_total    := (v_computed->>'total_amount')::numeric;
  v_currency := v_computed->>'currency';
  v_inclusive:= (v_computed->>'prices_include_tax')::boolean;
  v_computed_items := v_computed->'items';

  v_invoice_number := public._finance_invoice_number_next(p_tenant_id, 'manual');

  INSERT INTO public.invoices (
    id, tenant_id, invoice_number, client_id, client_name,
    subtotal, tax_amount, discount_amount, total_amount,
    status, issue_date, due_date, notes,
    prices_include_tax, payment_method, payment_received_at, created_by
  ) VALUES (
    v_invoice_id, p_tenant_id, v_invoice_number, v_client_id, v_canonical_client_name,
    v_subtotal, v_tax, v_discount, v_total,
    'draft', (now() AT TIME ZONE 'Asia/Riyadh')::date,
    (now() AT TIME ZONE 'Asia/Riyadh')::date, v_notes,
    v_inclusive, v_payment_method,
    CASE WHEN v_payment_method <> 'debt' THEN now() ELSE NULL END,
    v_actor
  );

  -- Insert items with server-supplied frozen fields + source trace.
  INSERT INTO public.invoice_items (
    invoice_id, description, quantity, unit_price, total_price,
    service_id, service_source, package_id,
    horse_id, lab_horse_id, domain, category_id,
    period_start, period_end,
    package_name_snapshot, package_name_ar_snapshot, package_price_snapshot,
    package_currency_snapshot, package_services_snapshot,
    line_pretax_amount, line_tax_amount, line_gross_amount,
    taxable_snapshot, tax_rate_snapshot,
    entity_type, entity_id, position
  )
  SELECT
    v_invoice_id,
    e.value->>'description',
    (e.value->>'quantity')::numeric,
    (e.value->>'unit_price')::numeric,
    (e.value->>'total_price')::numeric,
    NULLIF(e.value->>'service_id','')::uuid,
    COALESCE(NULLIF(e.value->>'service_source',''), 'tenant_services'),
    NULLIF(e.value->>'package_id','')::uuid,
    NULLIF(e.value->>'horse_id','')::uuid,
    NULLIF(e.value->>'lab_horse_id','')::uuid,
    NULLIF(e.value->>'domain',''),
    NULLIF(e.value->>'category_id','')::uuid,
    NULLIF(e.value->>'period_start','')::date,
    NULLIF(e.value->>'period_end','')::date,
    e.value->>'package_name_snapshot',
    e.value->>'package_name_ar_snapshot',
    NULLIF(e.value->>'package_price_snapshot','')::numeric,
    e.value->>'package_currency_snapshot',
    e.value->'package_services_snapshot',
    (e.value->>'line_pretax_amount')::numeric,
    (e.value->>'line_tax_amount')::numeric,
    (e.value->>'line_gross_amount')::numeric,
    (e.value->>'taxable_snapshot')::boolean,
    (e.value->>'tax_rate_snapshot')::numeric,
    v_source_type, v_source_id,
    (e.ordinality - 1)::int
  FROM jsonb_array_elements(v_computed_items) WITH ORDINALITY e(value, ordinality);

  -- Inline approve (locks invoice, creates ledger row, sets status=approved).
  PERFORM public._finance_invoice_approve_inline(p_tenant_id, v_invoice_id, v_actor);

  -- Payment (non-debt only)
  IF v_payment_method <> 'debt' AND v_total > 0 THEN
    SELECT id INTO v_account_id
      FROM public.payment_accounts
     WHERE tenant_id = p_tenant_id AND owner_type = 'tenant' AND is_active = true
     LIMIT 1;
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'FIN_TENANT_PAYMENT_ACCOUNT_MISSING' USING ERRCODE='23503';
    END IF;

    v_pay_result := public.post_invoice_payments(
      p_tenant_id, p_idempotency_key, v_invoice_id, v_account_id,
      (now() AT TIME ZONE 'Asia/Riyadh')::date,
      jsonb_build_array(jsonb_build_object(
        'idempotency_key', p_idempotency_key,
        'amount', v_total,
        'payment_method', v_payment_method,
        'reference_note', NULL,
        'external_reference', NULL
      ))
    );
  END IF;

  -- Source Billing Link (final)
  INSERT INTO public.billing_links (tenant_id, source_type, source_id, invoice_id, link_kind, amount, created_by)
  VALUES (p_tenant_id, v_source_type, v_source_id, v_invoice_id, 'final', v_total, v_actor)
  RETURNING id INTO v_link_id;

  SELECT status INTO v_final_status FROM public.invoices WHERE id = v_invoice_id;

  v_snapshot := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', v_final_status,
    'total_amount', v_total,
    'currency', v_currency,
    'client_name', v_canonical_client_name,
    'source_type', v_source_type,
    'source_id', v_source_id,
    'billing_link_id', v_link_id,
    'payment_method', v_payment_method,
    'payment_result', v_pay_result
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$

