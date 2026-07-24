-- ============================================================================
-- Phase N+1B · J5.1A.1 — Non-POS Atomic Source Checkout (Lab Sample + Horse Order)
-- REVIEW COPY. Intended final path (blocked by harness for direct write):
--   supabase/migrations/20260724180000_j5_1_non_pos_source_checkout.sql
--
-- Scope
--   Introduces exactly two new database objects:
--     public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)  -- private
--     public.create_source_checkout_invoice(uuid,uuid,jsonb)             -- public
--
--   Composition (reuses existing Finance RPCs unchanged):
--     outer idempotency
--       → source lock + source validation
--       → create_invoice_with_items
--       → trusted trace helper
--       → approve_invoice
--       → post_payment          (cash/card/transfer only)
--       → Source Billing Link
--       → outer idempotency complete
--
-- Non-goals (deferred / future work)
--   * No POS objects (create_pos_sale, pos_sessions, pos_sales, products,
--     sale_numbers, cart_hash, inventory receipts/returns).
--   * No post_invoice_payments usage (single-payment RPC only).
--   * No modification to existing Finance RPC bodies, tenant tax settings,
--     permissions, or historical rows.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Hard-fail preflight
--   Aborts the migration BEFORE any DDL if any assumption drifted, or if the
--   abandoned J5.1 combined artifacts are still resident. Cleanup of those
--   artifacts must be handled by a dedicated prior migration.
-- ============================================================================
DO $preflight$
DECLARE
  v_missing text;
  v_conflict text;
  v_required_fns text[] := ARRAY[
    'public.create_invoice_with_items(uuid,uuid,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public._finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid)',
    'public._finance_idempotency_begin(uuid,text,uuid,uuid,jsonb,jsonb)',
    'public._finance_idempotency_complete(uuid,text,uuid,uuid,bytea,jsonb,jsonb)',
    'public._finance_source_lock_key(uuid,text,uuid)',
    'public._finance_invoice_compute_totals(uuid,jsonb)',
    'public.is_active_tenant_member(uuid,uuid)',
    'public.has_permission(uuid,uuid,text)'
  ];
  v_forbidden_fns text[] := ARRAY[
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
    'public.create_pos_sale(uuid,uuid,jsonb)',
    'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
  ];
  v_required_checks text[] := ARRAY[
    'invoice_items_line_identity_ck',
    'invoice_items_line_pretax_nonneg_ck',
    'invoice_items_line_tax_nonneg_ck',
    'invoice_items_line_gross_nonneg_ck',
    'invoice_items_nontaxable_zero_tax_ck',
    'invoice_items_zero_rate_zero_tax_ck',
    'invoice_items_tax_rate_snapshot_range_ck',
    'invoice_items_service_source_chk'
  ];
  v_required_frozen_cols text[] := ARRAY[
    'line_pretax_amount',
    'line_tax_amount',
    'line_gross_amount',
    'taxable_snapshot',
    'tax_rate_snapshot'
  ];
  v_required_table_cols text[] := ARRAY[
    'clients:id','clients:tenant_id','clients:name','clients:name_ar',
    'horses:id','horses:tenant_id','horses:name',
    'horse_order_types:id','horse_order_types:name','horse_order_types:name_ar',
    'tenants:id','tenants:default_tax_rate','tenants:prices_tax_inclusive','tenants:currency',
    'invoices:id','invoices:tenant_id','invoices:status','invoices:total_amount',
    'invoices:currency','invoices:payment_method','invoices:payment_received_at',
    'invoices:prices_include_tax',
    'invoice_items:invoice_id','invoice_items:entity_type','invoice_items:entity_id',
    'invoice_items:horse_id','invoice_items:lab_horse_id',
    'billing_links:tenant_id','billing_links:source_type','billing_links:source_id',
    'billing_links:invoice_id','billing_links:link_kind',
    'payment_accounts:id','payment_accounts:owner_type','payment_accounts:tenant_id',
    'payment_accounts:is_active',
    'lab_samples:id','lab_samples:tenant_id','lab_samples:status',
    'lab_samples:client_id','lab_samples:client_name',
    'lab_samples:horse_id','lab_samples:lab_horse_id',
    'horse_orders:id','horse_orders:tenant_id','horse_orders:status',
    'horse_orders:client_id','horse_orders:horse_id',
    'horse_orders:actual_cost','horse_orders:estimated_cost',
    'horse_orders:order_type_id'
  ];
  v_frozen_count int;
  v_frozen_bad_null int;
  v_frozen_bad_default int;
  v_pit_col record;
  v_trg record;
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Required reusable Finance functions must exist (exact signatures).
  ---------------------------------------------------------------------------
  FOR v_missing IN SELECT unnest(v_required_fns) LOOP
    IF to_regprocedure(v_missing) IS NULL THEN
      RAISE EXCEPTION 'J5_1_PREFLIGHT_MISSING_REUSABLE_FN: %', v_missing
        USING ERRCODE = '42883';
    END IF;
  END LOOP;

  ---------------------------------------------------------------------------
  -- 2. Abandoned J5.1 combined artifacts must NOT already exist.
  ---------------------------------------------------------------------------
  FOR v_conflict IN SELECT unnest(v_forbidden_fns) LOOP
    IF to_regprocedure(v_conflict) IS NOT NULL THEN
      RAISE EXCEPTION
        'J5_1_PREFLIGHT_ABANDONED_ARTIFACT_LIVE: % — must be removed via a dedicated cleanup migration before J5.1A',
        v_conflict
        USING ERRCODE = '42710';
    END IF;
  END LOOP;

  ---------------------------------------------------------------------------
  -- 3. Invoice mode column: invoices.prices_include_tax
  --    Must be PRESENT, NOT NULL, and have NO default. Missing vs
  --    nullable/default regressions raise distinct errors.
  ---------------------------------------------------------------------------
  SELECT is_nullable, column_default INTO v_pit_col
    FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name='invoices'
     AND column_name='prices_include_tax';

  IF v_pit_col IS NULL THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICES_PRICES_INCLUDE_TAX_MISSING'
      USING ERRCODE = '42703';
  END IF;
  IF v_pit_col.is_nullable = 'YES' THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICES_PRICES_INCLUDE_TAX_NULLABLE'
      USING ERRCODE = '23502';
  END IF;
  IF v_pit_col.column_default IS NOT NULL THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICES_PRICES_INCLUDE_TAX_HAS_DEFAULT'
      USING ERRCODE = '42P16';
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Five frozen invoice_items columns:
  --    (a) all five must exist (count exactly matches),
  --    (b) all five NOT NULL,
  --    (c) all five have no default.
  ---------------------------------------------------------------------------
  SELECT count(*),
         count(*) FILTER (WHERE is_nullable='YES'),
         count(*) FILTER (WHERE column_default IS NOT NULL)
    INTO v_frozen_count, v_frozen_bad_null, v_frozen_bad_default
    FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name='invoice_items'
     AND column_name = ANY (v_required_frozen_cols);

  IF v_frozen_count <> array_length(v_required_frozen_cols, 1) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FROZEN_COLUMNS_MISSING: expected %, found %',
      array_length(v_required_frozen_cols, 1), v_frozen_count
      USING ERRCODE = '42703';
  END IF;
  IF v_frozen_bad_null > 0 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FROZEN_COLUMNS_NULLABLE: % column(s) nullable',
      v_frozen_bad_null USING ERRCODE = '23502';
  END IF;
  IF v_frozen_bad_default > 0 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FROZEN_COLUMNS_WITH_DEFAULT: % column(s) with default',
      v_frozen_bad_default USING ERRCODE = '42P16';
  END IF;

  ---------------------------------------------------------------------------
  -- 5. J5 CHECK constraints — one validated instance each on invoice_items.
  ---------------------------------------------------------------------------
  FOR v_missing IN SELECT unnest(v_required_checks) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.invoice_items'::regclass
         AND conname  = v_missing
         AND contype  = 'c'
         AND convalidated
    ) THEN
      RAISE EXCEPTION 'J5_1_PREFLIGHT_MISSING_OR_INVALID_CHECK: %', v_missing
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  ---------------------------------------------------------------------------
  -- 6. Invoice item triggers — exactly one enabled non-internal instance
  --    each, bound to the required function.
  ---------------------------------------------------------------------------
  FOR v_trg IN
    SELECT * FROM (VALUES
      ('trg_invoice_items_fill_snapshots', '_invoice_items_fill_snapshots'),
      ('trg_invoice_items_validate_source', '_invoice_items_validate_source')
    ) AS t(tg_name, fn_name)
  LOOP
    IF (
      SELECT count(*) FROM pg_trigger tg
        JOIN pg_proc p ON p.oid = tg.tgfoid
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE tg.tgrelid = 'public.invoice_items'::regclass
         AND tg.tgname  = v_trg.tg_name
         AND tg.tgenabled = 'O'
         AND NOT tg.tgisinternal
         AND n.nspname  = 'public'
         AND p.proname  = v_trg.fn_name
    ) <> 1 THEN
      RAISE EXCEPTION 'J5_1_PREFLIGHT_TRIGGER_BINDING_INVALID: % -> public.%()',
        v_trg.tg_name, v_trg.fn_name
        USING ERRCODE = '42704';
    END IF;
  END LOOP;

  ---------------------------------------------------------------------------
  -- 7. Payment account uniqueness / owner contract.
  ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.payment_accounts'::regclass
       AND conname='unique_tenant_account' AND contype='u'
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_PAYMENT_ACCOUNT_UNIQUE_MISSING'
      USING ERRCODE = '23505';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.payment_accounts'::regclass
       AND conname='valid_owner' AND contype='c' AND convalidated
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_PAYMENT_ACCOUNT_OWNER_CHECK_MISSING'
      USING ERRCODE = '23514';
  END IF;

  ---------------------------------------------------------------------------
  -- 8. All required table/column pairs must exist.
  ---------------------------------------------------------------------------
  FOR v_missing IN SELECT unnest(v_required_table_cols) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name  = split_part(v_missing, ':', 1)
         AND column_name = split_part(v_missing, ':', 2)
    ) THEN
      RAISE EXCEPTION 'J5_1_PREFLIGHT_TABLE_COLUMN_MISSING: %', v_missing
        USING ERRCODE = '42703';
    END IF;
  END LOOP;
END
$preflight$;


-- ============================================================================
-- Private trusted trace helper
--   Server-owned. Stamps entity_type/entity_id on the invoice's items after
--   create_invoice_with_items and before approve_invoice. Never exposed to
--   anon/authenticated. Called only from create_source_checkout_invoice.
-- ============================================================================
CREATE OR REPLACE FUNCTION public._finance_source_checkout_apply_trace(
  p_tenant_id   uuid,
  p_invoice_id  uuid,
  p_source_type text,
  p_source_id   uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_tenant_id IS NULL OR p_invoice_id IS NULL
     OR p_source_type IS NULL OR p_source_id IS NULL THEN
    RAISE EXCEPTION 'FIN_TRACE_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF p_source_type NOT IN ('lab_sample','horse_order') THEN
    RAISE EXCEPTION 'FIN_TRACE_SOURCE_TYPE_INVALID' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.invoices
     WHERE id = p_invoice_id
       AND tenant_id = p_tenant_id
       AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'FIN_TRACE_INVOICE_NOT_APPLICABLE' USING ERRCODE = '42501';
  END IF;

  UPDATE public.invoice_items
     SET entity_type = p_source_type,
         entity_id   = p_source_id
   WHERE invoice_id = p_invoice_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated < 1 THEN
    RAISE EXCEPTION 'FIN_TRACE_NO_ITEMS_UPDATED' USING ERRCODE = '23514';
  END IF;
END
$$;

ALTER FUNCTION public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid) FROM authenticated;

COMMENT ON FUNCTION public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)
  IS 'J5.1A: Server-owned trusted trace writer. Callable only from create_source_checkout_invoice; revoked from anon and authenticated.';


-- ============================================================================
-- Public non-POS source checkout RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_source_checkout_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_payload         jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
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
  ---------------------------------------------------------------------------
  -- 0. Authentication & non-null args
  ---------------------------------------------------------------------------
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

  ---------------------------------------------------------------------------
  -- 1. Root payload whitelist + strict per-field type validation.
  --    Every field is type-checked with `IS DISTINCT FROM` BEFORE any ->>
  --    conversion, UUID cast, numeric cast, permission branch or lookup.
  ---------------------------------------------------------------------------
  FOR v_root_key IN SELECT pg_catalog.jsonb_object_keys(p_payload) LOOP
    IF NOT (v_root_key = ANY (v_root_allowed)) THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: %', v_root_key
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  -- source_type (required string)
  IF NOT (p_payload ? 'source_type')
     OR pg_catalog.jsonb_typeof(p_payload->'source_type') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_SOURCE_TYPE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_source_type := pg_catalog.btrim(p_payload->>'source_type');
  IF v_source_type NOT IN ('lab_sample','horse_order') THEN
    RAISE EXCEPTION 'FIN_SOURCE_TYPE_INVALID' USING ERRCODE = '23514';
  END IF;

  -- source_id (required string, must be a valid UUID)
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

  -- link_kind (required string)
  IF NOT (p_payload ? 'link_kind')
     OR pg_catalog.jsonb_typeof(p_payload->'link_kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_LINK_KIND_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_link_kind := pg_catalog.btrim(p_payload->>'link_kind');
  IF v_link_kind NOT IN ('deposit','final') THEN
    RAISE EXCEPTION 'FIN_LINK_KIND_INVALID' USING ERRCODE = '23514';
  END IF;

  -- payment_method (required string)
  IF NOT (p_payload ? 'payment_method')
     OR pg_catalog.jsonb_typeof(p_payload->'payment_method') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_REQUIRED' USING ERRCODE = '23514';
  END IF;
  v_payment_method := pg_catalog.btrim(p_payload->>'payment_method');
  IF v_payment_method NOT IN ('cash','card','transfer','debt') THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID' USING ERRCODE = '23514';
  END IF;

  -- prices_include_tax (optional boolean; SQL null forbidden when present)
  IF p_payload ? 'prices_include_tax' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'prices_include_tax') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: prices_include_tax' USING ERRCODE = '23514';
    END IF;
    v_prices_include_tax := (p_payload->>'prices_include_tax')::boolean;
    v_has_prices_flag := true;
  END IF;

  -- discount_amount (optional number or JSON null; must be >= 0)
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

  -- notes (optional string or JSON null)
  IF p_payload ? 'notes' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'notes') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: notes' USING ERRCODE = '23514';
    END IF;
    v_notes := NULLIF(pg_catalog.btrim(COALESCE(p_payload->>'notes','')), '');
  END IF;
  IF pg_catalog.char_length(COALESCE(v_notes, '')) > 500 THEN
    RAISE EXCEPTION 'FIN_NOTES_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  -- client_name (optional string or JSON null; length enforced later after
  -- final Walk-in resolution)
  IF p_payload ? 'client_name' THEN
    IF pg_catalog.jsonb_typeof(p_payload->'client_name') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: client_name' USING ERRCODE = '23514';
    END IF;
    v_payload_client_name := NULLIF(pg_catalog.btrim(COALESCE(p_payload->>'client_name','')), '');
  END IF;

  ---------------------------------------------------------------------------
  -- 2. Permission gates
  ---------------------------------------------------------------------------
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

  ---------------------------------------------------------------------------
  -- 3. Source-specific payload validation
  ---------------------------------------------------------------------------
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
          RAISE EXCEPTION 'FIN_PAYLOAD_UNKNOWN_KEY: items[].%', v_item_key
            USING ERRCODE = '23514';
        END IF;
      END LOOP;

      -- description: required string, non-empty after trim
      IF NOT (v_item ? 'description')
         OR pg_catalog.jsonb_typeof(v_item->'description') IS DISTINCT FROM 'string'
         OR NULLIF(pg_catalog.btrim(v_item->>'description'), '') IS NULL THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_DESCRIPTION_REQUIRED' USING ERRCODE = '23514';
      END IF;

      -- quantity: type check and numeric cast must be in separate statements
      -- (PostgreSQL does not guarantee left-to-right short-circuit evaluation
      -- of Boolean OR).
      IF NOT (v_item ? 'quantity')
         OR pg_catalog.jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END IF;
      BEGIN
        v_qty := (v_item->>'quantity')::numeric;
      EXCEPTION
        WHEN invalid_text_representation OR numeric_value_out_of_range THEN
          RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END;
      IF v_qty <= 0 THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_QUANTITY_INVALID' USING ERRCODE = '23514';
      END IF;

      -- unit_price: type check and numeric cast must be in separate statements
      IF NOT (v_item ? 'unit_price')
         OR pg_catalog.jsonb_typeof(v_item->'unit_price') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END IF;
      BEGIN
        v_unit := (v_item->>'unit_price')::numeric;
      EXCEPTION
        WHEN invalid_text_representation OR numeric_value_out_of_range THEN
          RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END;
      IF v_unit < 0 THEN
        RAISE EXCEPTION 'FIN_LAB_ITEM_PRICE_INVALID' USING ERRCODE = '23514';
      END IF;

      -- is_taxable: optional boolean or JSON null
      IF v_item ? 'is_taxable'
         AND pg_catalog.jsonb_typeof(v_item->'is_taxable') NOT IN ('boolean','null') THEN
        RAISE EXCEPTION 'FIN_PAYLOAD_TYPE: items[].is_taxable' USING ERRCODE = '23514';
      END IF;
    END LOOP;
  ELSE
    -- Horse order: items are strictly forbidden (server-resolved)
    IF p_payload ? 'items' THEN
      RAISE EXCEPTION 'FIN_HORSE_ORDER_ITEMS_FORBIDDEN' USING ERRCODE = '23514';
    END IF;
    IF v_link_kind <> 'final' THEN
      RAISE EXCEPTION 'FIN_HORSE_ORDER_LINK_KIND_INVALID' USING ERRCODE = '23514';
    END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Outer idempotency begin
  ---------------------------------------------------------------------------
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

  ---------------------------------------------------------------------------
  -- 5. Source lock + row load + status/link-conflict gates
  ---------------------------------------------------------------------------
  PERFORM pg_catalog.pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, v_source_type, v_source_id)
  );

  IF v_source_type = 'lab_sample' THEN
    SELECT * INTO v_lab_row
      FROM public.lab_samples
     WHERE id = v_source_id AND tenant_id = p_tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
    v_source_status    := v_lab_row.status;
    v_source_client_id := v_lab_row.client_id;
    v_source_client_nm := NULLIF(pg_catalog.btrim(COALESCE(v_lab_row.client_name,'')), '');
    v_lab_horse_uuid   := v_lab_row.lab_horse_id;
    v_horse_uuid       := v_lab_row.horse_id;

    IF v_source_status = 'cancelled' THEN
      RAISE EXCEPTION 'FIN_SOURCE_CANCELLED' USING ERRCODE = '42501';
    END IF;
    IF v_link_kind = 'deposit'
       AND v_source_status NOT IN ('draft','accessioned') THEN
      RAISE EXCEPTION 'FIN_LAB_DEPOSIT_STATUS_INVALID' USING ERRCODE = '42501';
    END IF;
    IF v_link_kind = 'final' AND v_source_status <> 'completed' THEN
      RAISE EXCEPTION 'FIN_LAB_FINAL_STATUS_INVALID' USING ERRCODE = '42501';
    END IF;
  ELSE
    SELECT * INTO v_ord_row
      FROM public.horse_orders
     WHERE id = v_source_id AND tenant_id = p_tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_SOURCE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
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

    -- Server-resolved unit price; both null is fatal
    v_unit := COALESCE(v_ord_row.actual_cost, v_ord_row.estimated_cost);
    IF v_unit IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_MISSING_COST' USING ERRCODE = '23514';
    END IF;

    -- Canonical horse must exist in same tenant. Do NOT fall back to 'Horse'.
    IF v_horse_uuid IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_MISSING_HORSE' USING ERRCODE = '23514';
    END IF;
    SELECT NULLIF(pg_catalog.btrim(name), '')
      INTO v_horse_name
      FROM public.horses
     WHERE id = v_horse_uuid AND tenant_id = p_tenant_id;
    IF v_horse_name IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_HORSE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;

    -- Canonical order type must exist. Do NOT fall back to 'Service'.
    IF v_ord_row.order_type_id IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_TYPE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
    SELECT NULLIF(pg_catalog.btrim(name), '')
      INTO v_order_type_name
      FROM public.horse_order_types
     WHERE id = v_ord_row.order_type_id;
    IF v_order_type_name IS NULL THEN
      RAISE EXCEPTION 'FIN_ORDER_TYPE_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  END IF;

  ---------------------------------------------------------------------------
  -- 5b. Active same-kind Source Billing Link conflict
  ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
      FROM public.billing_links bl
      JOIN public.invoices i ON i.id = bl.invoice_id
     WHERE bl.tenant_id   = p_tenant_id
       AND bl.source_type = v_source_type
       AND bl.source_id   = v_source_id
       AND bl.link_kind   = v_link_kind
       AND i.status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'FIN_SOURCE_LINK_CONFLICT' USING ERRCODE = '23514';
  END IF;

  ---------------------------------------------------------------------------
  -- 6. Server-authoritative client identity
  --    Registered client → canonical name from public.clients (name_ar > name).
  --    Walk-in → source client_name > payload client_name > 'Walk-in Customer'.
  --    Never silently truncate: raise FIN_CLIENT_NAME_TOO_LONG when > 200.
  ---------------------------------------------------------------------------
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
                       COALESCE(v_source_client_nm,
                                v_payload_client_name,
                                'Walk-in Customer'));
    IF v_client_name IS NULL OR v_client_name = '' THEN
      v_client_name := 'Walk-in Customer';
    END IF;
  END IF;

  IF pg_catalog.char_length(v_client_name) > 200 THEN
    RAISE EXCEPTION 'FIN_CLIENT_NAME_TOO_LONG' USING ERRCODE = '23514';
  END IF;

  ---------------------------------------------------------------------------
  -- 7. Build nested invoice payload
  ---------------------------------------------------------------------------
  IF v_source_type = 'lab_sample' THEN
    v_pos := 0;
    v_items := '[]'::jsonb;
    FOR v_item IN SELECT pg_catalog.jsonb_array_elements(p_payload->'items') LOOP
      v_pos := v_pos + 1;
      v_desc := pg_catalog.btrim(v_item->>'description');
      v_qty  := (v_item->>'quantity')::numeric;
      v_unit := (v_item->>'unit_price')::numeric;
      v_is_taxable_raw := v_item->'is_taxable';
      IF v_is_taxable_raw IS NULL
         OR pg_catalog.jsonb_typeof(v_is_taxable_raw) = 'null' THEN
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
    v_invoice_payload := v_invoice_payload
      || pg_catalog.jsonb_build_object('notes', v_notes);
  END IF;
  IF v_has_prices_flag THEN
    v_invoice_payload := v_invoice_payload
      || pg_catalog.jsonb_build_object('prices_include_tax', v_prices_include_tax);
  END IF;

  ---------------------------------------------------------------------------
  -- 8. Deterministic child idempotency keys
  ---------------------------------------------------------------------------
  v_create_key  := (pg_catalog.md5(p_idempotency_key::text || ':create_invoice_with_items'))::uuid;
  v_approve_key := (pg_catalog.md5(p_idempotency_key::text || ':approve_invoice'))::uuid;
  v_payment_key := (pg_catalog.md5(p_idempotency_key::text || ':post_payment'))::uuid;

  ---------------------------------------------------------------------------
  -- 9. Nested create_invoice_with_items
  ---------------------------------------------------------------------------
  v_create_resp := public.create_invoice_with_items(
                     p_tenant_id, v_create_key, v_invoice_payload);
  v_invoice_id  := (v_create_resp->>'invoice_id')::uuid;
  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'FIN_NESTED_CREATE_NO_INVOICE_ID' USING ERRCODE = '23503';
  END IF;

  ---------------------------------------------------------------------------
  -- 10. Trusted trace (server-owned; entity_type / entity_id stamping)
  ---------------------------------------------------------------------------
  PERFORM public._finance_source_checkout_apply_trace(
            p_tenant_id, v_invoice_id, v_source_type, v_source_id);

  ---------------------------------------------------------------------------
  -- 11. Approve
  ---------------------------------------------------------------------------
  v_approve_resp := public.approve_invoice(
                      p_tenant_id, v_approve_key, v_invoice_id);

  ---------------------------------------------------------------------------
  -- 12. Read approved invoice; require positive total.
  ---------------------------------------------------------------------------
  SELECT * INTO v_inv_row
    FROM public.invoices
   WHERE id = v_invoice_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF COALESCE(v_inv_row.total_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'FIN_CHECKOUT_TOTAL_INVALID' USING ERRCODE = '23514';
  END IF;

  ---------------------------------------------------------------------------
  -- 13. Payment handling
  --     * debt              → payment_result NULL; do NOT touch payment_received_at
  --     * cash/card/transfer→ post_payment (single-payment RPC, direct)
  ---------------------------------------------------------------------------
  IF v_payment_method = 'debt' THEN
    v_payment_result := NULL;

    -- Server-owned persistence of the 'debt' payment method. Do NOT trust
    -- caller-supplied invoice.payment_method (create_invoice_with_items does
    -- not persist a checkout method). Do NOT set payment_received_at. Do NOT
    -- create a Payment ledger row or Payment billing link.
    UPDATE public.invoices
       SET payment_method = 'debt',
           updated_at     = now()
     WHERE id                  = v_invoice_id
       AND tenant_id           = p_tenant_id
       AND status              = 'approved'
       AND payment_received_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FIN_CHECKOUT_DEBT_STATE_INVALID' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT id INTO v_account_id
      FROM public.payment_accounts
     WHERE tenant_id  = p_tenant_id
       AND owner_type = 'tenant'
       AND is_active  = true;
    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'FIN_TENANT_PAYMENT_ACCOUNT_MISSING' USING ERRCODE = '23503';
    END IF;

    v_payment_result := public.post_payment(
      p_tenant_id,
      v_payment_key,
      v_invoice_id,
      v_inv_row.total_amount,
      v_business_date,
      v_payment_method,
      v_account_id,
      pg_catalog.jsonb_build_object(
        'currency', COALESCE(v_inv_row.currency, 'SAR')
      )
    );
  END IF;

  ---------------------------------------------------------------------------
  -- 14. Re-read final invoice unconditionally (both branches) and verify
  --     terminal contract per J5.1A spec §10.
  ---------------------------------------------------------------------------
  SELECT * INTO v_inv_row
    FROM public.invoices
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

  ---------------------------------------------------------------------------
  -- 15. Source Billing Link (p_corrects_invoice_id = NULL)
  ---------------------------------------------------------------------------
  v_source_link_id := public._finance_billing_link_upsert(
                        p_tenant_id, v_source_type, v_source_id, v_invoice_id,
                        v_link_kind, v_inv_row.total_amount, v_actor, NULL);
  IF v_source_link_id IS NULL THEN
    RAISE EXCEPTION 'FIN_SOURCE_LINK_UPSERT_FAILED' USING ERRCODE = '23514';
  END IF;

  ---------------------------------------------------------------------------
  -- 16. Build response from persisted final invoice values.
  ---------------------------------------------------------------------------
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
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_response, v_response);

  RETURN v_response;
END
$$;

ALTER FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_source_checkout_invoice(uuid,uuid,jsonb)
  IS 'J5.1A: Atomic non-POS source checkout (lab_sample, horse_order). Composes create_invoice_with_items, _finance_source_checkout_apply_trace, approve_invoice, post_payment (single-payment), _finance_billing_link_upsert. Deterministic md5-derived child idempotency keys.';

COMMIT;
