
-- ============================================================================
-- J5.1 — Atomic Embedded Checkout + POS Core Financial Writers
-- Adds:
--   public._finance_invoice_approve_inline(uuid, uuid, uuid)      [private]
--   public.create_source_checkout_invoice(uuid, uuid, jsonb)      [public RPC]
--   public.create_pos_sale(uuid, uuid, jsonb)                     [public RPC]
-- Replaces (behavior-preserving):
--   public.approve_invoice(uuid, uuid, uuid)
-- Preserves all other objects, table schemas, J5 constraints, RLS, permissions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- H. MIGRATION PREFLIGHT — assert live contract we depend on.
-- ---------------------------------------------------------------------------
DO $preflight$
DECLARE
  v_missing text;
  v_bad_check int;
BEGIN
  -- Required functions
  FOR v_missing IN
    SELECT unnest(ARRAY[
      'public._finance_idempotency_begin(uuid,text,uuid,uuid,jsonb,jsonb)',
      'public._finance_idempotency_complete(uuid,text,uuid,uuid,bytea,jsonb,jsonb)',
      'public._finance_invoice_compute_totals(uuid,jsonb)',
      'public._finance_invoice_payload_reject_unknown(jsonb)',
      'public._finance_invoice_number_next(uuid,text)',
      'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
      'public._finance_source_lock_key(uuid,text,uuid)',
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)',
      'public.approve_invoice(uuid,uuid,uuid)',
      'public.is_active_tenant_member(uuid,uuid)',
      'public.has_permission(uuid,uuid,text)'
    ])
  LOOP
    IF to_regprocedure(v_missing) IS NULL THEN
      RAISE EXCEPTION 'J5_1_PREFLIGHT_MISSING_FUNCTION: %', v_missing;
    END IF;
  END LOOP;

  -- Six J5 frozen columns still NOT NULL, no defaults
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='invoice_items'
       AND column_name IN ('line_pretax_amount','line_tax_amount','line_gross_amount',
                           'taxable_snapshot','tax_rate_snapshot','service_source')
       AND (is_nullable = 'YES'
            OR (column_name IN ('line_pretax_amount','line_tax_amount','line_gross_amount',
                                'taxable_snapshot','tax_rate_snapshot')
                AND column_default IS NOT NULL))
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FROZEN_COLUMN_REGRESSION';
  END IF;

  -- All J5 tax + period CHECKs validated
  SELECT count(*) INTO v_bad_check
    FROM pg_constraint
   WHERE conname IN (
     'invoice_items_line_gross_nonneg_ck',
     'invoice_items_line_pretax_nonneg_ck',
     'invoice_items_line_tax_nonneg_ck',
     'invoice_items_line_identity_ck',
     'invoice_items_nontaxable_zero_tax_ck',
     'invoice_items_tax_rate_snapshot_range_ck',
     'invoice_items_zero_rate_zero_tax_ck',
     'invoice_items_period_valid_ck'
   )
     AND convalidated = false;
  IF v_bad_check > 0 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICE_ITEM_CHECK_NOT_VALIDATED';
  END IF;

  -- Both invoice-item triggers exist and enabled
  IF (SELECT count(*) FROM pg_trigger
       WHERE tgrelid = 'public.invoice_items'::regclass
         AND tgname IN ('trg_invoice_items_fill_snapshots','trg_invoice_items_validate_source')
         AND tgenabled <> 'D') <> 2 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_ITEM_TRIGGERS_MISSING_OR_DISABLED';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- C1. Private inline approval helper.
--     Extracted post-permission/post-idempotency body of approve_invoice().
--     No auth/permission/idempotency wrappers here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_invoice_approve_inline(
  p_tenant_id uuid, p_invoice_id uuid, p_actor uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $inline$
DECLARE
  v_inv record;
  v_item_count integer;
  v_invalid_count integer;
  v_physical_items jsonb;
  v_input_items jsonb;
  v_computed jsonb;
  v_approval_payload jsonb;
  v_expected_subtotal numeric;
  v_expected_tax numeric;
  v_expected_total numeric;
  v_ledger_id uuid;
  v_balance_after numeric;
BEGIN
  IF p_tenant_id IS NULL OR p_invoice_id IS NULL OR p_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT * INTO v_inv
    FROM public.invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE='23503';
  END IF;
  IF v_inv.status NOT IN ('draft','reviewed') THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_APPROVABLE' USING ERRCODE='42501';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (
      WHERE quantity <= 0
         OR unit_price < 0
         OR total_price < 0
         OR abs(total_price - round((quantity * unit_price)::numeric, 2)) > 0.01
         OR (service_id IS NOT NULL AND package_id IS NOT NULL)
         OR (horse_id IS NOT NULL AND lab_horse_id IS NOT NULL)
         OR ((period_start IS NULL) <> (period_end IS NULL))
         OR (period_start IS NOT NULL AND period_end < period_start)
         OR (package_id IS NOT NULL AND total_price > 0 AND package_price_snapshot IS NULL)
         OR line_pretax_amount IS NULL
         OR line_tax_amount   IS NULL
         OR line_gross_amount IS NULL
         OR taxable_snapshot  IS NULL
         OR tax_rate_snapshot IS NULL
    ),
    COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'service_id', ii.service_id,
      'service_source', ii.service_source,
      'description', ii.description,
      'quantity', ii.quantity,
      'unit_price', ii.unit_price,
      'total_price', ii.total_price,
      'horse_id', ii.horse_id,
      'lab_horse_id', ii.lab_horse_id,
      'domain', ii.domain,
      'category_id', ii.category_id,
      'period_start', ii.period_start,
      'period_end', ii.period_end,
      'package_id', ii.package_id,
      'package_name_snapshot', ii.package_name_snapshot,
      'package_name_ar_snapshot', ii.package_name_ar_snapshot,
      'package_price_snapshot', ii.package_price_snapshot,
      'package_currency_snapshot', ii.package_currency_snapshot,
      'package_services_snapshot', ii.package_services_snapshot,
      'line_pretax_amount', ii.line_pretax_amount,
      'line_tax_amount', ii.line_tax_amount,
      'line_gross_amount', ii.line_gross_amount,
      'taxable_snapshot', ii.taxable_snapshot,
      'tax_rate_snapshot', ii.tax_rate_snapshot
    )) ORDER BY ii.position, ii.created_at, ii.id), '[]'::jsonb),
    COALESCE(jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'service_id', ii.service_id,
          'service_source', ii.service_source,
          'description', ii.description,
          'quantity', ii.quantity,
          'unit_price', ii.unit_price,
          'horse_id', ii.horse_id,
          'lab_horse_id', ii.lab_horse_id,
          'domain', ii.domain,
          'category_id', ii.category_id,
          'period_start', ii.period_start,
          'period_end', ii.period_end,
          'package_id', ii.package_id
        )
      )
      || CASE
           WHEN ii.service_id IS NULL AND ii.package_id IS NULL
             THEN jsonb_build_object('is_taxable', COALESCE(ii.taxable_snapshot, true))
           ELSE '{}'::jsonb
         END
      ORDER BY ii.position, ii.created_at, ii.id
    ), '[]'::jsonb)
  INTO v_item_count, v_invalid_count, v_physical_items, v_input_items
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_invoice_id;

  IF v_item_count < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE='23514';
  END IF;
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_ITEMS_INVALID' USING ERRCODE='23514';
  END IF;
  IF COALESCE(v_inv.discount_amount, 0) < 0 THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE='23514';
  END IF;

  v_approval_payload := jsonb_build_object(
    'discount_amount', COALESCE(v_inv.discount_amount, 0),
    'prices_include_tax', COALESCE(v_inv.prices_include_tax, false),
    'items', v_input_items
  );
  v_computed := public._finance_invoice_compute_totals(p_tenant_id, v_approval_payload);
  v_expected_subtotal := (v_computed->>'subtotal')::numeric;
  v_expected_tax      := (v_computed->>'tax_amount')::numeric;
  v_expected_total    := (v_computed->>'total_amount')::numeric;

  SELECT count(*)
    INTO v_invalid_count
    FROM jsonb_array_elements(v_physical_items) WITH ORDINALITY AS p(value, ordinality)
    JOIN jsonb_array_elements(v_computed->'items') WITH ORDINALITY AS e(value, ordinality)
      USING (ordinality)
   WHERE abs((p.value->>'unit_price')::numeric  - (e.value->>'unit_price')::numeric)  > 0.01
      OR abs((p.value->>'total_price')::numeric - (e.value->>'total_price')::numeric) > 0.01
      OR abs((p.value->>'line_pretax_amount')::numeric - (e.value->>'line_pretax_amount')::numeric) > 0.01
      OR abs((p.value->>'line_tax_amount')::numeric    - (e.value->>'line_tax_amount')::numeric)    > 0.01
      OR abs((p.value->>'line_gross_amount')::numeric  - (e.value->>'line_gross_amount')::numeric)  > 0.01
      OR (p.value->>'taxable_snapshot')::boolean IS DISTINCT FROM (e.value->>'taxable_snapshot')::boolean
      OR abs((p.value->>'tax_rate_snapshot')::numeric  - (e.value->>'tax_rate_snapshot')::numeric)  > 0.0001
      OR p.value->>'package_name_snapshot'      IS DISTINCT FROM e.value->>'package_name_snapshot'
      OR p.value->>'package_name_ar_snapshot'   IS DISTINCT FROM e.value->>'package_name_ar_snapshot'
      OR p.value->>'package_price_snapshot'     IS DISTINCT FROM e.value->>'package_price_snapshot'
      OR p.value->>'package_currency_snapshot'  IS DISTINCT FROM e.value->>'package_currency_snapshot'
      OR p.value->'package_services_snapshot'   IS DISTINCT FROM e.value->'package_services_snapshot';

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_SOURCE_SNAPSHOT_STALE' USING ERRCODE='23514';
  END IF;

  IF abs(COALESCE(v_inv.subtotal, 0)     - v_expected_subtotal) > 0.01
     OR abs(COALESCE(v_inv.tax_amount, 0)- v_expected_tax)      > 0.01
     OR abs(COALESCE(v_inv.total_amount, 0) - v_expected_total) > 0.01
     OR COALESCE(v_inv.total_amount, 0) < 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_TOTALS_STALE' USING ERRCODE='23514';
  END IF;

  IF COALESCE(v_inv.total_amount, 0) > 0 THEN
    SELECT id INTO v_ledger_id
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id
       AND entry_type = 'invoice'
       AND reference_type = 'invoice'
       AND reference_id = p_invoice_id
     LIMIT 1;

    IF v_ledger_id IS NULL THEN
      SELECT ledger_entry_id, balance_after
        INTO v_ledger_id, v_balance_after
        FROM public._finance_ledger_insert(
               p_tenant_id, v_inv.client_id,
               'invoice','invoice', p_invoice_id,
               v_inv.total_amount, v_inv.issue_date,
               'Invoice ' || v_inv.invoice_number,
               NULL, NULL,
               jsonb_build_object('invoice_number', v_inv.invoice_number, 'via', 'approve_invoice_inline'),
               p_actor
             );
    END IF;
  END IF;

  UPDATE public.invoices
     SET status='approved', updated_at=now()
   WHERE id = p_invoice_id;
END
$inline$;

REVOKE ALL ON FUNCTION public._finance_invoice_approve_inline(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._finance_invoice_approve_inline(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public._finance_invoice_approve_inline(uuid, uuid, uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- C2. Replace public.approve_invoice — behavior-preserving delegating wrapper.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_invoice(
  p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $approve$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'approve_invoice';
  v_replay boolean; v_hash bytea; v_stored jsonb;
  v_inv record; v_ledger_id uuid; v_balance_after numeric;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(
           p_tenant_id, v_op, p_idempotency_key, v_actor,
           jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
           '{}'::jsonb
         );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM public._finance_invoice_approve_inline(p_tenant_id, p_invoice_id, v_actor);

  SELECT id, invoice_number, issue_date INTO v_inv
    FROM public.invoices WHERE id = p_invoice_id;

  SELECT id, balance_after INTO v_ledger_id, v_balance_after
    FROM public.ledger_entries
   WHERE tenant_id = p_tenant_id
     AND entry_type = 'invoice'
     AND reference_type = 'invoice'
     AND reference_id = p_invoice_id
   LIMIT 1;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'approved',
    'ledger_entry_id', v_ledger_id,
    'balance_after', v_balance_after,
    'effective_date', v_inv.issue_date
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$approve$;

-- Preserve existing grants (idempotent).
REVOKE ALL ON FUNCTION public.approve_invoice(uuid,uuid,uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.approve_invoice(uuid,uuid,uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_invoice(uuid,uuid,uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- C3. Embedded Checkout writer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_source_checkout_invoice(
  p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $ck$
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
$ck$;

REVOKE ALL ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- C4. POS Core writer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pos_sale(
  p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $pos$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'create_pos_sale';
  v_replay boolean; v_hash bytea; v_stored jsonb;
  v_root_allowed constant text[] := ARRAY['pos_session_id','branch_id','client_id','client_name',
    'discount_amount','payment_method','prices_include_tax','notes','items'];
  v_item_allowed constant text[] := ARRAY['product_id','quantity'];
  v_key text; v_item jsonb; v_ikey text;
  v_session_id uuid; v_branch_id uuid; v_client_id uuid; v_client_name text;
  v_discount numeric; v_payment_method text; v_inclusive_raw jsonb; v_notes text;
  v_items jsonb; v_canonical_client_name text;
  v_session record;
  v_compute_payload jsonb; v_computed jsonb; v_computed_items jsonb;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_subtotal numeric; v_tax numeric; v_total numeric; v_currency text; v_inclusive boolean;
  v_account_id uuid; v_pay_result jsonb; v_final_status text;
  v_sale_number int; v_cart_hash text; v_pos_sale_id uuid := gen_random_uuid();
  v_snapshot jsonb; v_pos int := 0;
  v_normalized_items jsonb;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE='42501'; END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE='22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'pos.sale.create')
     OR NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.create')
     OR NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.approve') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE='42501';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_payload) LOOP
    IF NOT (v_key = ANY(v_root_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key USING ERRCODE='23514';
    END IF;
  END LOOP;

  v_session_id     := NULLIF(p_payload->>'pos_session_id','')::uuid;
  v_branch_id      := NULLIF(p_payload->>'branch_id','')::uuid;
  v_client_id      := NULLIF(p_payload->>'client_id','')::uuid;
  v_client_name    := NULLIF(btrim(p_payload->>'client_name'), '');
  v_discount       := COALESCE(NULLIF(p_payload->>'discount_amount','')::numeric, 0);
  v_payment_method := NULLIF(btrim(p_payload->>'payment_method'), '');
  v_inclusive_raw  := p_payload->'prices_include_tax';
  v_notes          := NULLIF(btrim(p_payload->>'notes'), '');
  v_items          := p_payload->'items';

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'FIN_POS_SESSION_REQUIRED' USING ERRCODE='23514';
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
    IF NULLIF(v_item->>'product_id','')::uuid IS NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_PRODUCT_REQUIRED: pos=%', v_pos USING ERRCODE='23514';
    END IF;
    IF COALESCE(NULLIF(v_item->>'quantity','')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_QUANTITY_INVALID: pos=%', v_pos USING ERRCODE='23514';
    END IF;
  END LOOP;

  -- Lock and validate session
  SELECT * INTO v_session FROM public.pos_sessions
   WHERE id = v_session_id AND tenant_id = p_tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_POS_SESSION_NOT_FOUND' USING ERRCODE='23503';
  END IF;
  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'FIN_POS_SESSION_NOT_OPEN' USING ERRCODE='42501';
  END IF;
  IF v_branch_id IS NOT NULL AND v_branch_id IS DISTINCT FROM v_session.branch_id THEN
    RAISE EXCEPTION 'FIN_POS_BRANCH_MISMATCH' USING ERRCODE='23514';
  END IF;

  -- Client resolution
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
      jsonb_build_object('tenant_id',p_tenant_id,'pos_session_id',v_session_id),
      jsonb_build_object('payload', p_payload)
    );
  IF v_replay THEN RETURN v_stored; END IF;

  -- Resolve products + server prices into sanitized compute payload.
  -- All product lines are is_taxable=true; tax rate comes from tenant default.
  WITH raw AS (
    SELECT (e.value->>'product_id')::uuid AS product_id,
           (e.value->>'quantity')::numeric AS quantity,
           (e.ordinality - 1)::int AS pos
      FROM jsonb_array_elements(v_items) WITH ORDINALITY e(value, ordinality)
  ),
  resolved AS (
    SELECT r.pos, r.product_id, r.quantity,
           p.name, p.name_ar,
           COALESCE(p.selling_price, 0) AS price,
           p.is_active, p.tenant_id AS ptenant
      FROM raw r
      LEFT JOIN public.products p ON p.id = r.product_id
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'description', COALESCE(name_ar, name),
             'quantity', quantity,
             'unit_price', price,
             'is_taxable', true
           ) ORDER BY pos
         ),
         jsonb_agg(
           jsonb_build_object(
             'pos', pos,
             'product_id', product_id,
             'name', name,
             'name_ar', name_ar,
             'quantity', quantity,
             'unit_price', price,
             'is_active', is_active,
             'ptenant', ptenant
           ) ORDER BY pos
         )
    INTO v_computed_items, v_normalized_items
    FROM resolved;

  -- Validate every product row
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_normalized_items) x
              WHERE (x->>'ptenant')::uuid IS DISTINCT FROM p_tenant_id
                 OR (x->>'is_active')::boolean IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'FIN_PRODUCT_INVALID' USING ERRCODE='23503';
  END IF;

  v_compute_payload := jsonb_build_object(
    'discount_amount', v_discount,
    'prices_include_tax',
      CASE WHEN v_inclusive_raw IS NOT NULL AND jsonb_typeof(v_inclusive_raw)='boolean'
           THEN (v_inclusive_raw)::boolean ELSE NULL END,
    'items', v_computed_items
  );

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
    prices_include_tax, payment_method, payment_received_at,
    pos_session_id, branch_id, created_by
  ) VALUES (
    v_invoice_id, p_tenant_id, v_invoice_number, v_client_id, v_canonical_client_name,
    v_subtotal, v_tax, v_discount, v_total,
    'draft', (now() AT TIME ZONE 'Asia/Riyadh')::date,
    (now() AT TIME ZONE 'Asia/Riyadh')::date, v_notes,
    v_inclusive, v_payment_method,
    CASE WHEN v_payment_method <> 'debt' THEN now() ELSE NULL END,
    v_session_id, COALESCE(v_branch_id, v_session.branch_id), v_actor
  );

  INSERT INTO public.invoice_items (
    invoice_id, description, quantity, unit_price, total_price,
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
    (e.value->>'line_pretax_amount')::numeric,
    (e.value->>'line_tax_amount')::numeric,
    (e.value->>'line_gross_amount')::numeric,
    (e.value->>'taxable_snapshot')::boolean,
    (e.value->>'tax_rate_snapshot')::numeric,
    'pos_product',
    ((SELECT n.value->>'product_id'
        FROM jsonb_array_elements(v_normalized_items) WITH ORDINALITY n(value, ordinality)
       WHERE (n.value->>'pos')::int = (e.ordinality - 1)::int
       LIMIT 1))::uuid,
    (e.ordinality - 1)::int
  FROM jsonb_array_elements(v_computed_items) WITH ORDINALITY e(value, ordinality);

  PERFORM public._finance_invoice_approve_inline(p_tenant_id, v_invoice_id, v_actor);

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

  -- Sale number under held session lock
  SELECT COALESCE(MAX(sale_number), 0) + 1 INTO v_sale_number
    FROM public.pos_sales
   WHERE tenant_id = p_tenant_id AND session_id = v_session_id;

  -- Deterministic cart hash from server-normalized product ids/qty/price
  SELECT encode(
    digest(
      string_agg(
        (n.value->>'product_id') || '|' ||
        (n.value->>'quantity')   || '|' ||
        (n.value->>'unit_price'),
        ';' ORDER BY (n.value->>'pos')::int
      ),
      'sha256'
    ),
    'hex'
  ) INTO v_cart_hash
  FROM jsonb_array_elements(v_normalized_items) n;

  INSERT INTO public.pos_sales (
    id, tenant_id, session_id, sale_number, cart_hash,
    subtotal, tax_amount, total_amount, currency, invoice_id, created_by
  ) VALUES (
    v_pos_sale_id, p_tenant_id, v_session_id, v_sale_number, v_cart_hash,
    v_subtotal, v_tax, v_total, v_currency, v_invoice_id, v_actor
  );

  SELECT status INTO v_final_status FROM public.invoices WHERE id = v_invoice_id;

  v_snapshot := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', v_final_status,
    'total_amount', v_total,
    'currency', v_currency,
    'client_name', v_canonical_client_name,
    'pos_sale_id', v_pos_sale_id,
    'sale_number', v_sale_number,
    'cart_hash', v_cart_hash,
    'payment_method', v_payment_method,
    'payment_result', v_pay_result
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$pos$;

REVOKE ALL ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- I. EMBEDDED SELF-CLEANING VERIFICATION (rolled back at end).
--     Uses the J3.3-proven transaction-local JWT claim mechanism.
--     All writes are inside a subtransaction that always rolls back so the
--     migration transaction commits only the function DDL above.
-- ---------------------------------------------------------------------------
DO $verify$
DECLARE
  v_ok boolean := true;
  v_msg text := '';
  v_tenant uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_actor  uuid := '98439fe8-6881-4e9e-8ff6-18aca0ce4470';
  v_key    uuid;
  v_result jsonb;
  v_before_invoices bigint;
  v_after_invoices  bigint;
BEGIN
  BEGIN
    -- Preflight: fixture must exist + active + owner + one active tenant payment account.
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
      RAISE NOTICE 'J5.1 VERIFY SKIPPED: demo tenant fixture missing.';
      RAISE EXCEPTION 'VERIFICATION_ROLLBACK';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members
       WHERE tenant_id = v_tenant AND user_id = v_actor AND is_active = true
    ) THEN
      RAISE NOTICE 'J5.1 VERIFY SKIPPED: demo membership missing.';
      RAISE EXCEPTION 'VERIFICATION_ROLLBACK';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_accounts
       WHERE tenant_id = v_tenant AND owner_type = 'tenant' AND is_active = true
    ) THEN
      RAISE NOTICE 'J5.1 VERIFY SKIPPED: demo tenant payment account missing.';
      RAISE EXCEPTION 'VERIFICATION_ROLLBACK';
    END IF;

    -- Establish authenticated JWT claims for RLS/permission checks.
    PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);

    SELECT count(*) INTO v_before_invoices FROM public.invoices WHERE tenant_id = v_tenant;

    -- T1: unauthenticated rejection
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '', true);
      PERFORM set_config('request.jwt.claims', '{}', true);
      BEGIN
        v_result := public.create_pos_sale(v_tenant, gen_random_uuid(),
          jsonb_build_object('pos_session_id', gen_random_uuid(),
            'payment_method','cash',
            'items', jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'quantity', 1))));
        v_ok := false; v_msg := 'T1 expected FIN_UNAUTHENTICATED';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END;

    -- Restore authenticated
    PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);

    -- T2: Embedded checkout unknown-key rejection
    BEGIN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'source_type','lab_sample','source_id', gen_random_uuid(),
          'payment_method','debt',
          'link_kind','final',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))
        ));
      v_ok := false; v_msg := 'T2 expected FIN_PAYLOAD_UNKNOWN_KEY';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PAYLOAD_UNKNOWN_KEY%' THEN
        v_ok := false; v_msg := 'T2 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T3: POS unknown-key rejection
    BEGIN
      v_result := public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'pos_session_id', gen_random_uuid(),
          'payment_method','cash',
          'items', jsonb_build_array(
            jsonb_build_object('product_id', gen_random_uuid(), 'quantity', 1, 'unit_price', 999)
          )));
      v_ok := false; v_msg := 'T3 expected FIN_PAYLOAD_UNKNOWN_KEY';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PAYLOAD_UNKNOWN_KEY%' THEN
        v_ok := false; v_msg := 'T3 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T4: Embedded checkout bad payment method
    BEGIN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'source_type','lab_sample','source_id', gen_random_uuid(),
          'payment_method','crypto',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))
        ));
      v_ok := false; v_msg := 'T4 expected FIN_PAYMENT_METHOD_INVALID';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PAYMENT_METHOD_INVALID%' THEN
        v_ok := false; v_msg := 'T4 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T5: unsupported source type
    BEGIN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'source_type','breeding_event','source_id', gen_random_uuid(),
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))
        ));
      v_ok := false; v_msg := 'T5 expected FIN_SOURCE_TYPE_UNSUPPORTED';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_SOURCE_TYPE_UNSUPPORTED%' THEN
        v_ok := false; v_msg := 'T5 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T6: foreign source rejection (valid type, wrong tenant / nonexistent id)
    BEGIN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'source_type','lab_sample','source_id', gen_random_uuid(),
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))
        ));
      v_ok := false; v_msg := 'T6 expected FIN_SOURCE_NOT_FOUND';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_SOURCE_NOT_FOUND%' THEN
        v_ok := false; v_msg := 'T6 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T7: POS foreign session rejection
    BEGIN
      v_result := public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'pos_session_id', gen_random_uuid(),
          'payment_method','cash',
          'items', jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'quantity',1))
        ));
      v_ok := false; v_msg := 'T7 expected FIN_POS_SESSION_NOT_FOUND';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_POS_SESSION_NOT_FOUND%' THEN
        v_ok := false; v_msg := 'T7 wrong error: '||SQLERRM;
      END IF;
    END;

    -- T8: name too long
    BEGIN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object(
          'source_type','lab_sample','source_id', gen_random_uuid(),
          'payment_method','debt',
          'client_name', repeat('A', 250),
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))
        ));
      v_ok := false; v_msg := 'T8 expected FIN_CLIENT_NAME_TOO_LONG';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_CLIENT_NAME_TOO_LONG%' AND SQLERRM NOT LIKE '%FIN_SOURCE_NOT_FOUND%' THEN
        v_ok := false; v_msg := 'T8 wrong error: '||SQLERRM;
      END IF;
    END;

    -- Ensure no invoice rows were persisted by verification
    SELECT count(*) INTO v_after_invoices FROM public.invoices WHERE tenant_id = v_tenant;
    IF v_after_invoices <> v_before_invoices THEN
      v_ok := false; v_msg := format('Invoice count drift %s->%s', v_before_invoices, v_after_invoices);
    END IF;

    IF NOT v_ok THEN
      RAISE EXCEPTION 'J5_1_VERIFICATION_FAILED: %', v_msg;
    END IF;

    RAISE NOTICE 'J5.1 embedded verification: OK (T1..T8 rejection contracts).';
    RAISE EXCEPTION 'VERIFICATION_ROLLBACK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'VERIFICATION_ROLLBACK' THEN
        RETURN;
      ELSIF SQLERRM LIKE 'J5_1_VERIFICATION_FAILED:%' THEN
        RAISE;
      ELSE
        RAISE NOTICE 'J5.1 verification aborted early: %', SQLERRM;
        RETURN;
      END IF;
  END;
END
$verify$;
