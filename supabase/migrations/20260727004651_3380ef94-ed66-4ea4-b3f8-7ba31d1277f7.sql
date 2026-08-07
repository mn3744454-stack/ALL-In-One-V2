-- Slice 2.2A: Frozen Invoice snapshot authority.
-- Approval must validate using the persisted invoice_items snapshots.
-- Rollback: restore previous function bodies (see git history of this migration).

-- 1) _finance_invoice_compute_totals: honor payload is_taxable/tax_rate for
--    catalog Service items and package items when supplied; fall back to
--    catalog only when not supplied (new-draft path).
CREATE OR REPLACE FUNCTION public._finance_invoice_compute_totals(p_tenant_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_rate                 numeric;
  v_tenant_inclusive     boolean;
  v_inclusive            boolean;
  v_currency             text;
  v_discount             numeric := 0;
  v_commercial_total     numeric := 0;
  v_subtotal             numeric := 0;
  v_tax                  numeric := 0;
  v_gross_total          numeric := 0;
  v_total                numeric := 0;
  v_items                jsonb   := '[]'::jsonb;
  v_item                 jsonb;
  v_pos                  integer := 0;
  v_qty                  numeric;
  v_unit                 numeric;
  v_commercial_line      numeric;
  v_line_pretax          numeric;
  v_line_tax             numeric;
  v_line_gross           numeric;
  v_description          text;
  v_service_id           uuid;
  v_service_source       text;
  v_service_name         text;
  v_service_name_ar      text;
  v_service_category_id  uuid;
  v_service_active       boolean;
  v_service_taxable      boolean;
  v_service_currency     text;
  v_package_id           uuid;
  v_package_name         text;
  v_package_name_ar      text;
  v_package_price        numeric;
  v_package_currency     text;
  v_package_includes     jsonb;
  v_package_snapshot     jsonb;
  v_package_active       boolean;
  v_package_taxable      boolean;
  v_horse_id             uuid;
  v_lab_horse_id         uuid;
  v_domain               text;
  v_period_start         date;
  v_period_end           date;
  v_manual_taxable_raw   jsonb;
  v_manual_tax_rate_raw  jsonb;
  v_effective_rate       numeric;
BEGIN
  PERFORM public._finance_invoice_payload_reject_unknown(p_payload);

  SELECT default_tax_rate,
         COALESCE(prices_tax_inclusive, false),
         NULLIF(btrim(currency), '')
    INTO v_rate, v_tenant_inclusive, v_currency
    FROM public.tenants
   WHERE id = p_tenant_id;

  IF NOT FOUND OR v_currency IS NULL THEN
    RAISE EXCEPTION 'FIN_TENANT_NOT_FOUND_OR_CURRENCY_MISSING' USING ERRCODE = '23503';
  END IF;
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'FIN_TENANT_TAX_RATE_MISSING' USING ERRCODE = '23514';
  END IF;
  IF v_rate < 0 OR v_rate > 100 THEN
    RAISE EXCEPTION 'FIN_TENANT_TAX_RATE_OUT_OF_RANGE' USING ERRCODE = '23514';
  END IF;

  IF p_payload ? 'prices_include_tax'
     AND jsonb_typeof(p_payload->'prices_include_tax') = 'boolean' THEN
    v_inclusive := (p_payload->>'prices_include_tax')::boolean;
  ELSE
    v_inclusive := v_tenant_inclusive;
  END IF;

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
    v_service_id          := NULLIF(v_item->>'service_id', '')::uuid;
    v_package_id          := NULLIF(v_item->>'package_id', '')::uuid;
    v_horse_id            := NULLIF(v_item->>'horse_id', '')::uuid;
    v_lab_horse_id        := NULLIF(v_item->>'lab_horse_id', '')::uuid;
    v_domain              := NULLIF(btrim(v_item->>'domain'), '');
    v_period_start        := NULLIF(v_item->>'period_start', '')::date;
    v_period_end          := NULLIF(v_item->>'period_end', '')::date;
    v_description         := NULLIF(btrim(v_item->>'description'), '');
    v_service_category_id := NULLIF(v_item->>'category_id', '')::uuid;
    v_service_source      := NULL;
    v_service_name        := NULL;
    v_service_name_ar     := NULL;
    v_service_active      := NULL;
    v_service_taxable     := NULL;
    v_service_currency    := v_currency;
    v_package_name        := NULL;
    v_package_name_ar     := NULL;
    v_package_price       := NULL;
    v_package_currency    := NULL;
    v_package_includes    := NULL;
    v_package_active      := NULL;
    v_package_taxable     := NULL;
    v_package_snapshot    := NULL;
    v_manual_taxable_raw  := v_item->'is_taxable';
    v_manual_tax_rate_raw := v_item->'tax_rate';
    v_effective_rate      := v_rate;

    IF v_service_id IS NOT NULL AND v_package_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_SERVICE_PACKAGE_CONFLICT: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF v_horse_id IS NOT NULL AND v_lab_horse_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_HORSE_SOURCE_CONFLICT: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF (v_period_start IS NULL) <> (v_period_end IS NULL)
       OR (v_period_start IS NOT NULL AND v_period_end < v_period_start) THEN
      RAISE EXCEPTION 'FIN_ITEM_PERIOD_INVALID: pos=%', v_pos USING ERRCODE = '23514';
    END IF;

    IF v_package_id IS NOT NULL THEN
      v_service_category_id := NULL;
      SELECT name, name_ar, base_price, currency, includes, is_active, is_taxable
        INTO v_package_name, v_package_name_ar, v_package_price,
             v_package_currency, v_package_includes, v_package_active,
             v_package_taxable
        FROM public.stable_service_plans
       WHERE id = v_package_id AND tenant_id = p_tenant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'FIN_PACKAGE_NOT_FOUND: pos=%', v_pos USING ERRCODE = '23503';
      END IF;
      IF v_package_active IS NOT TRUE THEN
        RAISE EXCEPTION 'FIN_PACKAGE_INACTIVE: pos=%', v_pos USING ERRCODE = '23514';
      END IF;
      IF NULLIF(btrim(v_package_currency), '') IS DISTINCT FROM v_currency THEN
        RAISE EXCEPTION 'FIN_PACKAGE_CURRENCY_MISMATCH: pos=%', v_pos USING ERRCODE = '23514';
      END IF;

      v_qty              := 1;
      v_unit             := COALESCE(v_package_price, 0);
      -- Slice 2.2A: honor frozen taxable snapshot when the caller supplied it.
      IF v_manual_taxable_raw IS NOT NULL
         AND jsonb_typeof(v_manual_taxable_raw) <> 'null' THEN
        v_service_taxable := (v_manual_taxable_raw #>> '{}')::boolean;
      ELSE
        v_service_taxable := COALESCE(v_package_taxable, true);
      END IF;
      v_description      := COALESCE(v_description, v_package_name_ar, v_package_name);

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
        CASE WHEN jsonb_typeof(v_package_includes) = 'array'
             THEN v_package_includes ELSE '[]'::jsonb END
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
        SELECT name, name_ar, category_id, is_active, is_taxable,
               COALESCE(override_price, price, 0), NULLIF(btrim(currency), '')
          INTO v_service_name, v_service_name_ar, v_service_category_id,
               v_service_active, v_service_taxable, v_unit, v_service_currency
          FROM public.lab_services
         WHERE id = v_service_id AND tenant_id = p_tenant_id;
      ELSE
        RAISE EXCEPTION 'FIN_SERVICE_SOURCE_INVALID: pos=%', v_pos USING ERRCODE = '23514';
      END IF;

      IF v_service_name IS NULL THEN
        RAISE EXCEPTION 'FIN_SERVICE_NOT_FOUND: pos=%', v_pos USING ERRCODE = '23503';
      END IF;
      IF v_service_active IS NOT TRUE THEN
        RAISE EXCEPTION 'FIN_SERVICE_INACTIVE: pos=%', v_pos USING ERRCODE = '23514';
      END IF;
      IF v_service_currency IS NOT NULL
         AND v_service_currency IS DISTINCT FROM v_currency THEN
        RAISE EXCEPTION 'FIN_SERVICE_CURRENCY_MISMATCH: pos=%', v_pos USING ERRCODE = '23514';
      END IF;

      -- Slice 2.2A: honor frozen taxable snapshot for catalog Service items
      -- when supplied by the caller (approval path). New drafts fall back to
      -- the current catalog default.
      IF v_manual_taxable_raw IS NOT NULL
         AND jsonb_typeof(v_manual_taxable_raw) <> 'null' THEN
        v_service_taxable := (v_manual_taxable_raw #>> '{}')::boolean;
      ELSE
        v_service_taxable := COALESCE(v_service_taxable, true);
      END IF;
      -- Slice 2.2A: honor frozen unit price when the caller supplied one
      -- (approval path uses the persisted invoice_items.unit_price so a
      -- later catalog price edit does not invalidate a saved invoice).
      IF v_item ? 'unit_price'
         AND NULLIF(btrim(v_item->>'unit_price'), '') IS NOT NULL THEN
        v_unit := (v_item->>'unit_price')::numeric;
      END IF;
      v_qty             := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
      v_unit            := COALESCE(v_unit, 0);
      v_description     := COALESCE(v_description, v_service_name_ar, v_service_name);

    ELSE
      v_qty            := COALESCE(NULLIF(v_item->>'quantity', '')::numeric, 0);
      v_unit           := COALESCE(NULLIF(v_item->>'unit_price', '')::numeric, 0);
      v_service_source := 'tenant_services';

      IF v_manual_taxable_raw IS NULL OR jsonb_typeof(v_manual_taxable_raw) = 'null' THEN
        v_service_taxable := true;
      ELSE
        v_service_taxable := (v_manual_taxable_raw #>> '{}')::boolean;
      END IF;

      IF v_service_category_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.tenant_service_categories
         WHERE id = v_service_category_id AND tenant_id = p_tenant_id
      ) THEN
        RAISE EXCEPTION 'FIN_CATEGORY_NOT_FOUND: pos=%', v_pos USING ERRCODE = '23503';
      END IF;
    END IF;

    -- Slice 2.2A: if the caller supplied an explicit per-item tax_rate
    -- (approval path forwarding tax_rate_snapshot), use it. Otherwise fall
    -- back to the tenant default rate.
    IF v_manual_tax_rate_raw IS NOT NULL
       AND jsonb_typeof(v_manual_tax_rate_raw) <> 'null' THEN
      v_effective_rate := (v_manual_tax_rate_raw #>> '{}')::numeric;
      IF v_effective_rate < 0 OR v_effective_rate > 100 THEN
        RAISE EXCEPTION 'FIN_ITEM_TAX_RATE_OUT_OF_RANGE: pos=%', v_pos USING ERRCODE = '23514';
      END IF;
    END IF;

    IF v_description IS NULL THEN
      RAISE EXCEPTION 'FIN_ITEM_DESCRIPTION_REQUIRED: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_QUANTITY_INVALID: pos=%', v_pos USING ERRCODE = '23514';
    END IF;
    IF v_unit < 0 THEN
      RAISE EXCEPTION 'FIN_ITEM_PRICE_INVALID: pos=%', v_pos USING ERRCODE = '23514';
    END IF;

    v_commercial_line := round((v_qty * v_unit)::numeric, 2);

    IF v_inclusive THEN
      v_line_gross := v_commercial_line;
      IF v_service_taxable AND v_effective_rate > 0 THEN
        v_line_tax := round((v_line_gross * v_effective_rate / (100 + v_effective_rate))::numeric, 2);
      ELSE
        v_line_tax := 0;
      END IF;
      v_line_pretax := round((v_line_gross - v_line_tax)::numeric, 2);
    ELSE
      v_line_pretax := v_commercial_line;
      IF v_service_taxable AND v_effective_rate > 0 THEN
        v_line_tax := round((v_line_pretax * v_effective_rate / 100)::numeric, 2);
      ELSE
        v_line_tax := 0;
      END IF;
      v_line_gross := round((v_line_pretax + v_line_tax)::numeric, 2);
    END IF;

    v_commercial_total := v_commercial_total + v_commercial_line;
    v_subtotal         := v_subtotal + v_line_pretax;
    v_tax              := v_tax + v_line_tax;
    v_gross_total      := v_gross_total + v_line_gross;

    v_items := v_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'position', v_pos - 1,
      'service_id', v_service_id,
      'service_source', v_service_source,
      'description', v_description,
      'quantity', v_qty,
      'unit_price', v_unit,
      'total_price', v_commercial_line,
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
      'line_pretax_amount', v_line_pretax,
      'line_tax_amount', v_line_tax,
      'line_gross_amount', v_line_gross,
      'taxable_snapshot', v_service_taxable,
      'tax_rate_snapshot', v_effective_rate
    )));
  END LOOP;

  v_commercial_total := round(v_commercial_total, 2);
  v_subtotal         := round(v_subtotal, 2);
  v_tax              := round(v_tax, 2);
  v_gross_total      := round(v_gross_total, 2);

  IF v_discount > v_gross_total THEN
    RAISE EXCEPTION 'FIN_DISCOUNT_EXCEEDS_TOTAL' USING ERRCODE = '23514';
  END IF;

  v_total := round((v_gross_total - v_discount)::numeric, 2);
  IF v_total < 0 THEN
    RAISE EXCEPTION 'FIN_INVOICE_TOTAL_NEGATIVE' USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'tax_amount', v_tax,
    'discount_amount', v_discount,
    'total_amount', v_total,
    'currency', v_currency,
    'prices_include_tax', v_inclusive,
    'tenant_default_tax_rate', v_rate,
    'items', v_items
  );
END
$function$;

-- 2) _finance_invoice_approve_inline: emit frozen is_taxable, tax_rate, and
--    unit_price for every item so approval validates against the frozen
--    snapshots rather than a live catalog re-read.
CREATE OR REPLACE FUNCTION public._finance_invoice_approve_inline(p_tenant_id uuid, p_invoice_id uuid, p_actor uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- Slice 2.2A: forward frozen is_taxable + tax_rate + unit_price for EVERY item
    -- so compute_totals validates the persisted snapshot instead of re-reading
    -- the current catalog.
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
          'package_id', ii.package_id,
          'is_taxable', COALESCE(ii.taxable_snapshot, true),
          'tax_rate',   ii.tax_rate_snapshot
        )
      )
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
$function$;

ALTER FUNCTION public._finance_invoice_approve_inline(uuid,uuid,uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public._finance_invoice_approve_inline(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
