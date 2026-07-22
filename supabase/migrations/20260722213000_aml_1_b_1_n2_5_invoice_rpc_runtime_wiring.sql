-- AML.1.b.1 N+2.5 — canonical invoice RPC correction before frontend wiring.
--
-- Risk classification: Level 3 / Pattern H / Rollback Type B.
-- This migration changes function behaviour only. It does not rewrite, delete,
-- backfill, or normalize any existing business row.

-- --------------------------------------------------------------------------
-- Strict browser payload boundary. Financial totals, currency, catalog prices,
-- catalog taxability, package snapshots, invoice number, and status are owned
-- by the database functions below.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_invoice_payload_reject_unknown(
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_key text;
  v_item jsonb;
  v_item_key text;
  v_allowed constant text[] := ARRAY[
    'client_id', 'client_name', 'issue_date', 'due_date',
    'notes', 'discount_amount', 'items'
  ];
  v_item_allowed constant text[] := ARRAY[
    'service_id', 'service_source', 'description', 'quantity', 'unit_price',
    'horse_id', 'lab_horse_id', 'domain', 'category_id',
    'period_start', 'period_end', 'package_id'
  ];
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'FIN_PAYLOAD_TYPE' USING ERRCODE = '23514';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_payload)
  LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_key
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF p_payload ? 'items' THEN
    IF jsonb_typeof(p_payload->'items') <> 'array' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items' USING ERRCODE = '23514';
    END IF;

    FOR v_item IN SELECT jsonb_array_elements(p_payload->'items')
    LOOP
      IF jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items[]' USING ERRCODE = '23514';
      END IF;
      FOR v_item_key IN SELECT jsonb_object_keys(v_item)
      LOOP
        IF NOT (v_item_key = ANY (v_item_allowed)) THEN
          RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: items[].%', v_item_key
            USING ERRCODE = '23514';
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END
$function$;

ALTER FUNCTION public._finance_invoice_payload_reject_unknown(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_invoice_payload_reject_unknown(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Server-authoritative invoice calculation and source resolution.
-- Manual free-text rows retain the submitted unit price. Catalog services and
-- packages always resolve price, category, taxability, names, and snapshots
-- from same-tenant active source rows.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_invoice_compute_totals(
  p_tenant_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_rate numeric;
  v_inclusive boolean;
  v_currency text;
  v_discount numeric := 0;
  v_line_total numeric := 0;
  v_taxable_total numeric := 0;
  v_non_taxable_total numeric := 0;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_pos integer := 0;
  v_qty numeric;
  v_unit numeric;
  v_line numeric;
  v_description text;
  v_service_id uuid;
  v_service_source text;
  v_service_name text;
  v_service_name_ar text;
  v_service_category_id uuid;
  v_service_active boolean;
  v_service_taxable boolean;
  v_service_currency text;
  v_package_id uuid;
  v_package_name text;
  v_package_name_ar text;
  v_package_price numeric;
  v_package_currency text;
  v_package_includes jsonb;
  v_package_snapshot jsonb;
  v_package_active boolean;
  v_horse_id uuid;
  v_lab_horse_id uuid;
  v_domain text;
  v_period_start date;
  v_period_end date;
BEGIN
  PERFORM public._finance_invoice_payload_reject_unknown(p_payload);

  SELECT default_tax_rate, prices_tax_inclusive, NULLIF(btrim(currency), '')
  INTO v_rate, v_inclusive, v_currency
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF NOT FOUND OR v_currency IS NULL THEN
    RAISE EXCEPTION 'FIN_TENANT_NOT_FOUND_OR_CURRENCY_MISSING'
      USING ERRCODE = '23503';
  END IF;

  v_rate := COALESCE(v_rate, 15);
  v_inclusive := COALESCE(v_inclusive, false);

  IF NOT (p_payload ? 'items') OR jsonb_array_length(p_payload->'items') < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE = '23514';
  END IF;

  v_discount := COALESCE(NULLIF(p_payload->>'discount_amount', '')::numeric, 0);
  IF v_discount < 0 THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_payload->'items')
  LOOP
    v_pos := v_pos + 1;
    v_service_id := NULLIF(v_item->>'service_id', '')::uuid;
    v_package_id := NULLIF(v_item->>'package_id', '')::uuid;
    v_horse_id := NULLIF(v_item->>'horse_id', '')::uuid;
    v_lab_horse_id := NULLIF(v_item->>'lab_horse_id', '')::uuid;
    v_domain := NULLIF(btrim(v_item->>'domain'), '');
    v_period_start := NULLIF(v_item->>'period_start', '')::date;
    v_period_end := NULLIF(v_item->>'period_end', '')::date;
    v_description := NULLIF(btrim(v_item->>'description'), '');
    v_service_category_id := NULLIF(v_item->>'category_id', '')::uuid;
    v_service_source := NULL;
    v_service_name := NULL;
    v_service_name_ar := NULL;
    v_service_active := NULL;
    v_service_taxable := true;
    v_service_currency := v_currency;
    v_package_name := NULL;
    v_package_name_ar := NULL;
    v_package_price := NULL;
    v_package_currency := NULL;
    v_package_includes := NULL;
    v_package_active := NULL;
    v_package_snapshot := NULL;

    IF v_service_id IS NOT NULL AND v_package_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_SERVICE_PACKAGE_CONFLICT: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;
    IF v_horse_id IS NOT NULL AND v_lab_horse_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_HORSE_SOURCE_CONFLICT: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;
    IF (v_period_start IS NULL) <> (v_period_end IS NULL)
       OR (v_period_start IS NOT NULL AND v_period_end < v_period_start) THEN
      RAISE EXCEPTION 'FIN_ITEM_PERIOD_INVALID: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;

    IF v_package_id IS NOT NULL THEN
      v_service_category_id := NULL;
      SELECT name, name_ar, base_price, currency, includes, is_active
      INTO v_package_name, v_package_name_ar, v_package_price,
           v_package_currency, v_package_includes, v_package_active
      FROM public.stable_service_plans
      WHERE id = v_package_id AND tenant_id = p_tenant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'FIN_PACKAGE_NOT_FOUND: pos=%', v_pos
          USING ERRCODE = '23503';
      END IF;
      IF v_package_active IS NOT TRUE THEN
        RAISE EXCEPTION 'FIN_PACKAGE_INACTIVE: pos=%', v_pos
          USING ERRCODE = '23514';
      END IF;
      IF NULLIF(btrim(v_package_currency), '') IS DISTINCT FROM v_currency THEN
        RAISE EXCEPTION 'FIN_PACKAGE_CURRENCY_MISMATCH: pos=%', v_pos
          USING ERRCODE = '23514';
      END IF;

      v_qty := 1;
      v_unit := COALESCE(v_package_price, 0);
      v_description := COALESCE(v_description, v_package_name_ar, v_package_name);

      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'service_id', ts.id,
            'service_source', 'tenant_services',
            'name', ts.name,
            'name_ar', ts.name_ar,
            'quantity', 1,
            'unit_price', COALESCE(ts.unit_price, 0),
            'currency', v_currency
          ) ORDER BY e.ordinality
        ) FILTER (WHERE ts.id IS NOT NULL),
        '[]'::jsonb
      )
      INTO v_package_snapshot
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(v_package_includes) = 'array' THEN v_package_includes
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS e(value, ordinality)
      LEFT JOIN public.tenant_services ts
        ON ts.id = NULLIF(e.value->>'service_id', '')::uuid
       AND ts.tenant_id = p_tenant_id;

    ELSIF v_service_id IS NOT NULL THEN
      v_service_source := COALESCE(
        NULLIF(btrim(v_item->>'service_source'), ''),
        'tenant_services'
      );

      IF v_service_source = 'tenant_services' THEN
        SELECT name, name_ar, category_id, is_active, is_taxable, unit_price
        INTO v_service_name, v_service_name_ar, v_service_category_id,
             v_service_active, v_service_taxable, v_unit
        FROM public.tenant_services
        WHERE id = v_service_id AND tenant_id = p_tenant_id;
      ELSIF v_service_source = 'lab_services' THEN
        SELECT name, name_ar, category_id, is_active, true,
               COALESCE(override_price, price, 0), NULLIF(btrim(currency), '')
        INTO v_service_name, v_service_name_ar, v_service_category_id,
             v_service_active, v_service_taxable, v_unit, v_service_currency
        FROM public.lab_services
        WHERE id = v_service_id AND tenant_id = p_tenant_id;
      ELSE
        RAISE EXCEPTION 'FIN_SERVICE_SOURCE_INVALID: pos=%', v_pos
          USING ERRCODE = '23514';
      END IF;

      IF v_service_name IS NULL THEN
        RAISE EXCEPTION 'FIN_SERVICE_NOT_FOUND: pos=%', v_pos
          USING ERRCODE = '23503';
      END IF;
      IF v_service_active IS NOT TRUE THEN
        RAISE EXCEPTION 'FIN_SERVICE_INACTIVE: pos=%', v_pos
          USING ERRCODE = '23514';
      END IF;
      IF v_service_currency IS NOT NULL
         AND v_service_currency IS DISTINCT FROM v_currency THEN
        RAISE EXCEPTION 'FIN_SERVICE_CURRENCY_MISMATCH: pos=%', v_pos
          USING ERRCODE = '23514';
      END IF;

      v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
      v_unit := COALESCE(v_unit, 0);
      v_description := COALESCE(v_description, v_service_name_ar, v_service_name);
    ELSE
      v_qty := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
      v_unit := COALESCE(NULLIF(v_item->>'unit_price', '')::numeric, 0);
      v_service_source := 'tenant_services';
      v_service_taxable := true;

      IF v_service_category_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tenant_service_categories
        WHERE id = v_service_category_id AND tenant_id = p_tenant_id
      ) THEN
        RAISE EXCEPTION 'FIN_CATEGORY_NOT_FOUND: pos=%', v_pos
          USING ERRCODE = '23503';
      END IF;
    END IF;

    IF v_description IS NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_DESCRIPTION_REQUIRED: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_QUANTITY_INVALID: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;
    IF v_unit < 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_PRICE_INVALID: pos=%', v_pos
        USING ERRCODE = '23514';
    END IF;

    v_line := round((v_qty * v_unit)::numeric, 2);
    v_line_total := v_line_total + v_line;
    IF v_service_taxable IS TRUE THEN
      v_taxable_total := v_taxable_total + v_line;
    ELSE
      v_non_taxable_total := v_non_taxable_total + v_line;
    END IF;

    v_items := v_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'position', v_pos - 1,
      'service_id', v_service_id,
      'service_source', v_service_source,
      'description', v_description,
      'quantity', v_qty,
      'unit_price', v_unit,
      'total_price', v_line,
      'horse_id', v_horse_id,
      'lab_horse_id', v_lab_horse_id,
      'domain', v_domain,
      'category_id', v_service_category_id,
      'period_start', v_period_start,
      'period_end', v_period_end,
      'package_id', v_package_id,
      'package_source', CASE WHEN v_package_id IS NOT NULL THEN 'stable_service_plans' END,
      'package_name_snapshot', v_package_name,
      'package_name_ar_snapshot', v_package_name_ar,
      'package_price_snapshot', v_package_price,
      'package_currency_snapshot', v_package_currency,
      'package_services_snapshot', v_package_snapshot,
      'is_taxable', v_service_taxable
    )));
  END LOOP;

  v_line_total := round(v_line_total, 2);
  v_taxable_total := round(v_taxable_total, 2);
  v_non_taxable_total := round(v_non_taxable_total, 2);
  IF v_discount > v_line_total THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_EXCEEDS_TOTAL' USING ERRCODE = '23514';
  END IF;

  IF v_inclusive THEN
    v_tax := CASE
      WHEN v_rate > 0 THEN round((v_taxable_total * v_rate / (100 + v_rate))::numeric, 2)
      ELSE 0
    END;
    v_subtotal := round((v_line_total - v_tax)::numeric, 2);
    v_total := round((v_line_total - v_discount)::numeric, 2);
  ELSE
    v_subtotal := v_line_total;
    v_tax := CASE
      WHEN v_rate > 0 THEN round((v_taxable_total * v_rate / 100)::numeric, 2)
      ELSE 0
    END;
    v_total := round((v_line_total + v_tax - v_discount)::numeric, 2);
  END IF;

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'tax_amount', v_tax,
    'discount_amount', v_discount,
    'total_amount', v_total,
    'taxable_total', v_taxable_total,
    'non_taxable_total', v_non_taxable_total,
    'currency', v_currency,
    'items', v_items
  );
END
$function$;

ALTER FUNCTION public._finance_invoice_compute_totals(uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_invoice_compute_totals(uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Atomic create: one function transaction owns header and every item.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_invoice_with_items(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'create_invoice_with_items';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_computed jsonb;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_client_id uuid;
  v_client_name text;
  v_issue_date date;
  v_due_date date;
  v_notes text;
  v_item jsonb;
  v_snapshot jsonb;
  v_response jsonb;
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
  v_client_id := NULLIF(p_payload->>'client_id', '')::uuid;
  v_client_name := NULLIF(btrim(p_payload->>'client_name'), '');
  v_issue_date := NULLIF(p_payload->>'issue_date', '')::date;
  v_due_date := NULLIF(p_payload->>'due_date', '')::date;
  v_notes := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_issue_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_OUT_OF_RANGE' USING ERRCODE = '23514';
  END IF;
  IF v_due_date IS NOT NULL AND v_due_date < v_issue_date THEN
    RAISE EXCEPTION 'FIN_DUE_DATE_BEFORE_ISSUE' USING ERRCODE = '23514';
  END IF;
  IF char_length(COALESCE(v_notes, '')) > 500 THEN
    RAISE EXCEPTION 'FIN_NOTES_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  IF v_client_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(name_ar, ''), name)
    INTO v_client_name
    FROM public.clients
    WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_CLIENT_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  END IF;

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id),
    jsonb_build_object('payload', p_payload)
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  v_computed := public._finance_invoice_compute_totals(p_tenant_id, p_payload);
  v_invoice_number := public._finance_invoice_number_next(p_tenant_id, 'manual');

  INSERT INTO public.invoices (
    id, tenant_id, invoice_number, client_id, client_name, status,
    issue_date, due_date, subtotal, tax_amount, discount_amount,
    total_amount, currency, notes, created_by, created_at, updated_at
  ) VALUES (
    v_invoice_id, p_tenant_id, v_invoice_number, v_client_id, v_client_name, 'draft',
    v_issue_date, v_due_date,
    (v_computed->>'subtotal')::numeric,
    (v_computed->>'tax_amount')::numeric,
    (v_computed->>'discount_amount')::numeric,
    (v_computed->>'total_amount')::numeric,
    v_computed->>'currency', v_notes, v_actor, now(), now()
  );

  FOR v_item IN SELECT jsonb_array_elements(v_computed->'items')
  LOOP
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, total_price,
      service_id, service_source, horse_id, lab_horse_id, domain, category_id,
      period_start, period_end, package_id, package_source,
      package_name_snapshot, package_name_ar_snapshot, package_price_snapshot,
      package_currency_snapshot, package_services_snapshot, position
    ) VALUES (
      v_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      NULLIF(v_item->>'service_id', '')::uuid,
      NULLIF(v_item->>'service_source', ''),
      NULLIF(v_item->>'horse_id', '')::uuid,
      NULLIF(v_item->>'lab_horse_id', '')::uuid,
      NULLIF(v_item->>'domain', ''),
      NULLIF(v_item->>'category_id', '')::uuid,
      NULLIF(v_item->>'period_start', '')::date,
      NULLIF(v_item->>'period_end', '')::date,
      NULLIF(v_item->>'package_id', '')::uuid,
      NULLIF(v_item->>'package_source', ''),
      v_item->>'package_name_snapshot',
      v_item->>'package_name_ar_snapshot',
      NULLIF(v_item->>'package_price_snapshot', '')::numeric,
      v_item->>'package_currency_snapshot',
      v_item->'package_services_snapshot',
      (v_item->>'position')::integer
    );
  END LOOP;

  v_snapshot := jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'status', 'draft',
    'header', v_computed,
    'client_id', v_client_id,
    'issue_date', v_issue_date,
    'due_date', v_due_date
  );
  v_response := v_snapshot;

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_response
  );
  RETURN v_response;
END
$function$;

-- --------------------------------------------------------------------------
-- Atomic edit: linked/domain invoices are not silently converted into manual
-- invoices. The old header/items survive any failed replacement item.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_invoice_with_items(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_invoice_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'update_invoice_with_items';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_inv record;
  v_computed jsonb;
  v_client_id uuid;
  v_client_name text;
  v_issue_date date;
  v_due_date date;
  v_notes text;
  v_item jsonb;
  v_snapshot jsonb;
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
  v_client_id := NULLIF(p_payload->>'client_id', '')::uuid;
  v_client_name := NULLIF(btrim(p_payload->>'client_name'), '');
  v_issue_date := NULLIF(p_payload->>'issue_date', '')::date;
  v_due_date := NULLIF(p_payload->>'due_date', '')::date;
  v_notes := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_issue_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_ISSUE_DATE_OUT_OF_RANGE' USING ERRCODE = '23514';
  END IF;
  IF v_due_date IS NOT NULL AND v_due_date < v_issue_date THEN
    RAISE EXCEPTION 'FIN_DUE_DATE_BEFORE_ISSUE' USING ERRCODE = '23514';
  END IF;
  IF char_length(COALESCE(v_notes, '')) > 500 THEN
    RAISE EXCEPTION 'FIN_NOTES_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  IF v_client_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(name_ar, ''), name)
    INTO v_client_name
    FROM public.clients
    WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_CLIENT_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  END IF;

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
    jsonb_build_object('payload', p_payload)
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_DRAFT' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.billing_links WHERE invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'FIN_INVOICE_DOMAIN_LOCKED' USING ERRCODE = '42501';
  END IF;

  v_computed := public._finance_invoice_compute_totals(p_tenant_id, p_payload);

  UPDATE public.invoices
  SET client_id = v_client_id,
      client_name = v_client_name,
      issue_date = v_issue_date,
      due_date = v_due_date,
      notes = v_notes,
      subtotal = (v_computed->>'subtotal')::numeric,
      tax_amount = (v_computed->>'tax_amount')::numeric,
      discount_amount = (v_computed->>'discount_amount')::numeric,
      total_amount = (v_computed->>'total_amount')::numeric,
      currency = v_computed->>'currency',
      updated_at = now()
  WHERE id = p_invoice_id;

  DELETE FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  FOR v_item IN SELECT jsonb_array_elements(v_computed->'items')
  LOOP
    INSERT INTO public.invoice_items (
      invoice_id, description, quantity, unit_price, total_price,
      service_id, service_source, horse_id, lab_horse_id, domain, category_id,
      period_start, period_end, package_id, package_source,
      package_name_snapshot, package_name_ar_snapshot, package_price_snapshot,
      package_currency_snapshot, package_services_snapshot, position
    ) VALUES (
      p_invoice_id,
      v_item->>'description',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      NULLIF(v_item->>'service_id', '')::uuid,
      NULLIF(v_item->>'service_source', ''),
      NULLIF(v_item->>'horse_id', '')::uuid,
      NULLIF(v_item->>'lab_horse_id', '')::uuid,
      NULLIF(v_item->>'domain', ''),
      NULLIF(v_item->>'category_id', '')::uuid,
      NULLIF(v_item->>'period_start', '')::date,
      NULLIF(v_item->>'period_end', '')::date,
      NULLIF(v_item->>'package_id', '')::uuid,
      NULLIF(v_item->>'package_source', ''),
      v_item->>'package_name_snapshot',
      v_item->>'package_name_ar_snapshot',
      NULLIF(v_item->>'package_price_snapshot', '')::numeric,
      v_item->>'package_currency_snapshot',
      v_item->'package_services_snapshot',
      (v_item->>'position')::integer
    );
  END LOOP;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'draft',
    'header', v_computed
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Approval validates the physical rows, recomputes every stored total, accepts
-- draft/reviewed, and creates one invoice ledger row even for a walk-in invoice
-- whose client_id is NULL. Zero-value invoices remain auditable without ledger.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_invoice(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_invoice_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'approve_invoice';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
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
  v_snapshot jsonb;
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

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
    '{}'::jsonb
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status NOT IN ('draft', 'reviewed') THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_APPROVABLE' USING ERRCODE = '42501';
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
      'package_services_snapshot', ii.package_services_snapshot
    )) ORDER BY ii.position, ii.created_at, ii.id), '[]'::jsonb),
    COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
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
    )) ORDER BY ii.position, ii.created_at, ii.id), '[]'::jsonb)
  INTO v_item_count, v_invalid_count, v_physical_items, v_input_items
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_invoice_id;

  IF v_item_count < 1 THEN
    RAISE EXCEPTION 'FIN_ITEMS_EMPTY' USING ERRCODE = '23514';
  END IF;
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_ITEMS_INVALID' USING ERRCODE = '23514';
  END IF;

  IF COALESCE(v_inv.discount_amount, 0) < 0 THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_INVALID' USING ERRCODE = '23514';
  END IF;

  v_approval_payload := jsonb_build_object(
    'discount_amount', COALESCE(v_inv.discount_amount, 0),
    'items', v_input_items
  );
  v_computed := public._finance_invoice_compute_totals(
    p_tenant_id, v_approval_payload
  );
  v_expected_subtotal := (v_computed->>'subtotal')::numeric;
  v_expected_tax := (v_computed->>'tax_amount')::numeric;
  v_expected_total := (v_computed->>'total_amount')::numeric;

  SELECT count(*)
  INTO v_invalid_count
  FROM jsonb_array_elements(v_physical_items) WITH ORDINALITY AS p(value, ordinality)
  JOIN jsonb_array_elements(v_computed->'items') WITH ORDINALITY AS e(value, ordinality)
    USING (ordinality)
  WHERE abs((p.value->>'unit_price')::numeric - (e.value->>'unit_price')::numeric) > 0.01
     OR abs((p.value->>'total_price')::numeric - (e.value->>'total_price')::numeric) > 0.01
     OR p.value->>'package_name_snapshot' IS DISTINCT FROM e.value->>'package_name_snapshot'
     OR p.value->>'package_name_ar_snapshot' IS DISTINCT FROM e.value->>'package_name_ar_snapshot'
     OR p.value->>'package_price_snapshot' IS DISTINCT FROM e.value->>'package_price_snapshot'
     OR p.value->>'package_currency_snapshot' IS DISTINCT FROM e.value->>'package_currency_snapshot'
     OR p.value->'package_services_snapshot' IS DISTINCT FROM e.value->'package_services_snapshot';

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_SOURCE_SNAPSHOT_STALE' USING ERRCODE = '23514';
  END IF;

  IF abs(COALESCE(v_inv.subtotal, 0) - v_expected_subtotal) > 0.01
     OR abs(COALESCE(v_inv.tax_amount, 0) - v_expected_tax) > 0.01
     OR abs(COALESCE(v_inv.total_amount, 0) - v_expected_total) > 0.01
     OR COALESCE(v_inv.total_amount, 0) < 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_TOTALS_STALE' USING ERRCODE = '23514';
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
        p_tenant_id,
        v_inv.client_id,
        'invoice',
        'invoice',
        p_invoice_id,
        v_inv.total_amount,
        v_inv.issue_date,
        'Invoice ' || v_inv.invoice_number,
        NULL,
        NULL,
        jsonb_build_object('invoice_number', v_inv.invoice_number, 'via', 'approve_invoice'),
        v_actor
      );
    END IF;
  END IF;

  UPDATE public.invoices
  SET status = 'approved', updated_at = now()
  WHERE id = p_invoice_id;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'approved',
    'ledger_entry_id', v_ledger_id,
    'balance_after', v_balance_after,
    'effective_date', v_inv.issue_date
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- --------------------------------------------------------------------------
-- Cancellation uses the canonical adjustment/invoice_cancellation identity.
-- It no longer collides with idx_ledger_invoice_idempotent.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_invoice(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_invoice_id uuid,
  p_effective_date date,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'cancel_invoice';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_inv record;
  v_reason text := NULLIF(btrim(p_reason), '');
  v_invoice_ledger_id uuid;
  v_invoice_ledger_amount numeric;
  v_invoice_ledger_client_id uuid;
  v_reversal_id uuid;
  v_balance_after numeric;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL
     OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'FIN_REASON_INVALID' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.cancel') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
    jsonb_build_object('effective_date', p_effective_date, 'reason', v_reason)
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status = 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: use delete_draft_invoice'
      USING ERRCODE = '42501';
  END IF;
  IF v_inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: already cancelled'
      USING ERRCODE = '42501';
  END IF;
  IF v_inv.status IN ('partial', 'paid') OR EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id
      AND reference_type = 'invoice'
      AND reference_id = p_invoice_id
      AND entry_type = 'payment'
  ) OR EXISTS (
    SELECT 1
    FROM public.payment_intents
    WHERE tenant_id = p_tenant_id
      AND reference_type = 'invoice'::public.payment_reference_type
      AND reference_id = p_invoice_id
      AND status::text IN ('pending', 'paid')
  ) THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: payments exist'
      USING ERRCODE = '42501';
  END IF;
  IF p_effective_date < v_inv.issue_date
     OR p_effective_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_EFFECTIVE_DATE_INVALID' USING ERRCODE = '23514';
  END IF;

  SELECT id, amount, client_id
  INTO v_invoice_ledger_id, v_invoice_ledger_amount, v_invoice_ledger_client_id
  FROM public.ledger_entries
  WHERE tenant_id = p_tenant_id
    AND entry_type = 'invoice'
    AND reference_type = 'invoice'
    AND reference_id = p_invoice_id
    AND amount > 0
  LIMIT 1;

  IF v_invoice_ledger_id IS NOT NULL THEN
    SELECT id INTO v_reversal_id
    FROM public.ledger_entries
    WHERE entry_type = 'adjustment'
      AND reference_type = 'invoice_cancellation'
      AND reference_id = p_invoice_id
    LIMIT 1;

    IF v_reversal_id IS NULL THEN
      SELECT ledger_entry_id, balance_after
      INTO v_reversal_id, v_balance_after
      FROM public._finance_ledger_insert(
        p_tenant_id,
        v_invoice_ledger_client_id,
        'adjustment',
        'invoice_cancellation',
        p_invoice_id,
        -v_invoice_ledger_amount,
        p_effective_date,
        'Cancellation of ' || v_inv.invoice_number || ' — ' || v_reason,
        NULL,
        NULL,
        jsonb_build_object(
          'invoice_number', v_inv.invoice_number,
          'reverses_ledger_entry_id', v_invoice_ledger_id,
          'reason', v_reason,
          'via', 'cancel_invoice'
        ),
        v_actor
      );
    END IF;
  ELSIF COALESCE(v_inv.total_amount, 0) > 0
        AND v_inv.status IN ('approved', 'overdue') THEN
    RAISE EXCEPTION 'FIN_INVOICE_LEDGER_MISSING' USING ERRCODE = '42501';
  END IF;

  UPDATE public.invoices
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_invoice_id;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'cancelled',
    'reversal_ledger_entry_id', v_reversal_id,
    'balance_after', v_balance_after,
    'effective_date', p_effective_date,
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
-- Atomic split-tender payment wrapper. Every split is posted through the
-- hardened N+2.2 post_payment contract, but all splits share one transaction:
-- one failed split rolls back the complete payment session.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_invoice_payments(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_invoice_id uuid,
  p_account_id uuid,
  p_payment_date date,
  p_payments jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'post_invoice_payments';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_payment jsonb;
  v_key text;
  v_position integer := 0;
  v_amount numeric;
  v_method text;
  v_item_idempotency uuid;
  v_total numeric := 0;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL
     OR p_account_id IS NULL OR p_payment_date IS NULL OR p_payments IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.payment.create') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_payments) <> 'array'
     OR jsonb_array_length(p_payments) < 1
     OR jsonb_array_length(p_payments) > 10 THEN
    RAISE EXCEPTION 'FIN_PAYMENTS_INVALID' USING ERRCODE = '23514';
  END IF;

  FOR v_payment IN SELECT jsonb_array_elements(p_payments)
  LOOP
    v_position := v_position + 1;
    IF jsonb_typeof(v_payment) <> 'object' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: payments[]' USING ERRCODE = '23514';
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_payment)
    LOOP
      IF v_key NOT IN (
        'idempotency_key', 'amount', 'payment_method',
        'reference_note', 'external_reference'
      ) THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: payments[].%', v_key
          USING ERRCODE = '23514';
      END IF;
    END LOOP;

    v_item_idempotency := NULLIF(v_payment->>'idempotency_key', '')::uuid;
    v_amount := COALESCE(NULLIF(v_payment->>'amount', '')::numeric, 0);
    v_method := NULLIF(btrim(v_payment->>'payment_method'), '');
    IF v_item_idempotency IS NULL OR v_amount <= 0 OR v_method IS NULL THEN
      RAISE EXCEPTION 'FIN_PAYMENT_SPLIT_INVALID: pos=%', v_position
        USING ERRCODE = '23514';
    END IF;
    IF char_length(COALESCE(v_payment->>'reference_note', '')) > 500
       OR char_length(COALESCE(v_payment->>'external_reference', '')) > 100 THEN
      RAISE EXCEPTION 'FIN_PAYMENT_SPLIT_TEXT_INVALID: pos=%', v_position
        USING ERRCODE = '23514';
    END IF;
    v_total := v_total + v_amount;
  END LOOP;

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
    jsonb_build_object(
      'account_id', p_account_id,
      'payment_date', p_payment_date,
      'payments', p_payments
    )
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  v_position := 0;
  FOR v_payment IN SELECT jsonb_array_elements(p_payments)
  LOOP
    v_position := v_position + 1;
    v_result := public.post_payment(
      p_tenant_id,
      (v_payment->>'idempotency_key')::uuid,
      p_invoice_id,
      (v_payment->>'amount')::numeric,
      p_payment_date,
      v_payment->>'payment_method',
      p_account_id,
      jsonb_strip_nulls(jsonb_build_object(
        'reference_note', NULLIF(v_payment->>'reference_note', ''),
        'external_reference', NULLIF(v_payment->>'external_reference', ''),
        'metadata', jsonb_build_object(
          'payment_session_id', p_idempotency_key::text,
          'split_position', v_position
        )
      ))
    );
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'payment_session_id', p_idempotency_key,
    'payment_date', p_payment_date,
    'total_payment', round(v_total, 2),
    'split_count', v_position,
    'remaining_after', (v_result->>'remaining_after')::numeric,
    'invoice_status', v_result->>'invoice_status',
    'results', v_results
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$;

-- Preserve the canonical public identities and the hardened ACL boundary.
ALTER FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) OWNER TO postgres;
ALTER FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) OWNER TO postgres;
ALTER FUNCTION public.approve_invoice(uuid, uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) OWNER TO postgres;
ALTER FUNCTION public.post_invoice_payments(uuid, uuid, uuid, uuid, date, jsonb)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.approve_invoice(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_invoice_payments(uuid, uuid, uuid, uuid, date, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_invoice_with_items(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_with_items(uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(uuid, uuid, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_invoice_payments(uuid, uuid, uuid, uuid, date, jsonb)
  TO authenticated;

-- Post-application semantic/catalog gate.
DO $gate$
DECLARE
  v_approve text;
  v_cancel text;
  v_create text;
BEGIN
  v_create := pg_get_functiondef(
    'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure
  );
  v_approve := pg_get_functiondef(
    'public.approve_invoice(uuid,uuid,uuid)'::regprocedure
  );
  v_cancel := pg_get_functiondef(
    'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure
  );

  IF v_create NOT LIKE '%lab_horse_id%'
     OR v_create NOT LIKE '%package_services_snapshot%' THEN
    RAISE EXCEPTION 'N2.5_GATE: atomic create source coverage missing';
  END IF;
  IF v_approve NOT LIKE '%FIN_INVOICE_TOTALS_STALE%'
     OR v_approve NOT LIKE '%v_inv.client_id%'
     OR v_approve NOT LIKE '%effective_date%' THEN
    RAISE EXCEPTION 'N2.5_GATE: approval integrity contract missing';
  END IF;
  IF v_cancel NOT LIKE '%invoice_cancellation%'
     OR v_cancel NOT LIKE '%''adjustment''%'
     OR v_cancel NOT LIKE '%''invoice_cancellation''%' THEN
    RAISE EXCEPTION 'N2.5_GATE: canonical cancellation reversal missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure,
      'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'::regprocedure,
      'public.approve_invoice(uuid,uuid,uuid)'::regprocedure,
      'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure,
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
    ])
      AND (
        p.prosecdef IS NOT TRUE
        OR NOT EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS c(value)
          WHERE c.value IN ('search_path=', 'search_path=""')
        )
      )
  ) THEN
    RAISE EXCEPTION 'N2.5_GATE: SECURITY DEFINER/search_path drift';
  END IF;
END
$gate$;
