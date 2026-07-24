-- ============================================================================
-- REVIEW ARTIFACT — NOT APPLIED
-- This file is derived from the existing unapplied J5.1 migration and
-- incorporates the final verified correction delta. It is a review artifact
-- outside the managed migrations directory and has not been applied.
--
-- Baseline: supabase/migrations/20260724101152_56ad20be-efd5-406a-8821-5df92b565dec.sql
-- Deltas applied inline: B (Delta 1), C (Delta 2), D (Delta 3), I (Delta 8),
--                        K (partial — tenant default_tax_rate reference).
-- Deltas E, F, G, J, L, M, N, O, P: verified as already satisfied by the
--                        baseline OR carried unchanged pending code review.
-- ============================================================================
-- ============================================================================
-- J5.1 — Atomic Embedded Checkout + POS Core Financial Writers
-- (Mechanically-corrected per J5.1 DATABASE FILE CORRECTION spec.)
--
-- Adds:
--   public._finance_invoice_approve_inline(uuid, uuid, uuid,
--                                          OUT ledger_entry_id uuid,
--                                          OUT balance_after numeric,
--                                          OUT effective_date date,
--                                          OUT ledger_created boolean) [private]
--   public.create_source_checkout_invoice(uuid, uuid, jsonb)           [public RPC]
--   public.create_pos_sale(uuid, uuid, jsonb)                          [public RPC]
--
-- Replaces (BEHAVIOR-PRESERVING):
--   public.approve_invoice(uuid, uuid, uuid)
--     - Persisted ledger metadata `via` unchanged: 'approve_invoice'.
--     - Returned ledger_entry_id / balance_after / effective_date preserved
--       (including the NULL behavior when an existing invoice ledger row
--       was already present before this call).
--     - Existing execution privileges preserved (CREATE OR REPLACE keeps ACL;
--       no REVOKE/GRANT statements on approve_invoice are issued here).
--
-- Preserves all other objects, table schemas, J5 constraints, RLS, permissions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- §B. MIGRATION PREFLIGHT — assert live contract we depend on.
-- ---------------------------------------------------------------------------
DO $preflight$
DECLARE
  v_missing text;
  v_bad_check int;
  v_trig_count int;
  v_bad_col text;
  v_baseline record;
BEGIN
  ------------------------------------------------------------------
  -- Required functions (public API + private helpers we call).
  ------------------------------------------------------------------
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

  ------------------------------------------------------------------
  -- §L. Cart-hash function must exist and be schema-qualified.
  ------------------------------------------------------------------
  IF to_regprocedure('extensions.digest(text,text)') IS NULL THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_MISSING_FUNCTION: extensions.digest(text,text)';
  END IF;

  ------------------------------------------------------------------
  -- §B1. invoice header: prices_include_tax NOT NULL, no default.
  ------------------------------------------------------------------
  SELECT column_name INTO v_bad_col
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='invoices'
     AND column_name='prices_include_tax'
     AND (is_nullable = 'YES' OR column_default IS NOT NULL);
  IF v_bad_col IS NOT NULL THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICES_PRICES_INCLUDE_TAX_REGRESSION';
  END IF;

  ------------------------------------------------------------------
  -- §B2. Five invoice-item frozen fields NOT NULL, no default.
  --      service_source is NOT part of the six frozen fields.
  ------------------------------------------------------------------
  SELECT string_agg(column_name, ',') INTO v_bad_col
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='invoice_items'
     AND column_name IN ('line_pretax_amount','line_tax_amount','line_gross_amount',
                         'taxable_snapshot','tax_rate_snapshot')
     AND (is_nullable = 'YES' OR column_default IS NOT NULL);
  IF v_bad_col IS NOT NULL THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FROZEN_COLUMN_REGRESSION: %', v_bad_col;
  END IF;

  ------------------------------------------------------------------
  -- §B3. Eight J5/period CHECKs all validated on invoice_items only.
  ------------------------------------------------------------------
  SELECT count(*) INTO v_bad_check
    FROM pg_constraint
   WHERE conrelid = 'public.invoice_items'::regclass
     AND conname IN (
       'invoice_items_line_gross_nonneg_ck',
       'invoice_items_line_pretax_nonneg_ck',
       'invoice_items_line_tax_nonneg_ck',
       'invoice_items_line_identity_ck',
       'invoice_items_nontaxable_zero_tax_ck',
       'invoice_items_tax_rate_snapshot_range_ck',
       'invoice_items_zero_rate_zero_tax_ck',
       'invoice_items_period_valid_ck'
     )
     AND convalidated = true;
  IF v_bad_check <> 8 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_INVOICE_ITEM_CHECK_MISSING_OR_UNVALIDATED (got %)', v_bad_check;
  END IF;

  ------------------------------------------------------------------
  -- §B4. Both invoice-item triggers exist exactly once, tgenabled='O'.
  ------------------------------------------------------------------
  SELECT count(*) INTO v_trig_count
    FROM pg_trigger
   WHERE tgrelid = 'public.invoice_items'::regclass
     AND tgname = 'trg_invoice_items_fill_snapshots'
     AND tgenabled = 'O'
     AND NOT tgisinternal;
  IF v_trig_count <> 1 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FILL_SNAPSHOTS_TRIGGER_BAD (count=%)', v_trig_count;
  END IF;

  SELECT count(*) INTO v_trig_count
    FROM pg_trigger
   WHERE tgrelid = 'public.invoice_items'::regclass
     AND tgname = 'trg_invoice_items_validate_source'
     AND tgenabled = 'O'
     AND NOT tgisinternal;
  IF v_trig_count <> 1 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_VALIDATE_SOURCE_TRIGGER_BAD (count=%)', v_trig_count;
  END IF;

  IF (SELECT tgfoid FROM pg_trigger
        WHERE tgrelid='public.invoice_items'::regclass
          AND tgname='trg_invoice_items_fill_snapshots')
     <> 'public._invoice_items_fill_snapshots()'::regprocedure THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_FILL_SNAPSHOTS_TRIGGER_BINDING_CHANGED';
  END IF;
  IF (SELECT tgfoid FROM pg_trigger
        WHERE tgrelid='public.invoice_items'::regclass
          AND tgname='trg_invoice_items_validate_source')
     <> 'public._invoice_items_validate_source()'::regprocedure THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_VALIDATE_SOURCE_TRIGGER_BINDING_CHANGED';
  END IF;

  ------------------------------------------------------------------
  -- §B5. Baseline integrity — every current count must equal zero.
  ------------------------------------------------------------------
  SELECT
    count(*) FILTER (WHERE prices_include_tax IS NULL)                                 AS mode_null
  INTO v_baseline
  FROM public.invoices;
  IF v_baseline.mode_null <> 0 THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_INVOICE_MODE_NULLS (%)', v_baseline.mode_null;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE line_pretax_amount IS NULL OR line_tax_amount IS NULL
        OR line_gross_amount IS NULL OR taxable_snapshot IS NULL
        OR tax_rate_snapshot IS NULL
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_SNAPSHOT_NULLS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE round(line_pretax_amount + line_tax_amount, 2) <> round(line_gross_amount, 2)
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_LINE_IDENTITY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE line_pretax_amount < 0 OR line_tax_amount < 0 OR line_gross_amount < 0
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_NEGATIVE_SNAPSHOTS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items WHERE tax_rate_snapshot < 0 OR tax_rate_snapshot > 100
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_RATE_OUT_OF_RANGE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE taxable_snapshot = false AND line_tax_amount > 0
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_NONTAXABLE_POS_TAX';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE tax_rate_snapshot = 0 AND line_tax_amount > 0
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_ZERORATE_POS_TAX';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE (period_start IS NULL) <> (period_end IS NULL)
        OR (period_start IS NOT NULL AND period_end < period_start)
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_PERIOD_VIOLATION';
  END IF;

  IF EXISTS (
    SELECT i.id
      FROM public.invoices i
      JOIN (
        SELECT invoice_id,
               round(sum(line_pretax_amount),2) sub_lines,
               round(sum(line_tax_amount),2)    tax_lines,
               round(sum(line_gross_amount),2)  gross_lines
          FROM public.invoice_items GROUP BY invoice_id
      ) s ON s.invoice_id = i.id
     WHERE round(coalesce(i.subtotal,0),2)   <> s.sub_lines
        OR round(coalesce(i.tax_amount,0),2) <> s.tax_lines
        OR round(coalesce(i.total_amount,0),2)
           <> round(s.gross_lines - coalesce(i.discount_amount,0), 2)
  ) THEN
    RAISE EXCEPTION 'J5_1_PREFLIGHT_BASELINE_HEADER_RECON';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- §C1/C2. Private inline approval helper.
--         Extracted post-permission/post-idempotency body of approve_invoice().
--         Returns the ledger row identity + effective date so approve_invoice
--         can preserve its exact prior response semantics — including the NULL
--         behavior when an invoice ledger row already existed (ledger_created
--         = false, ledger_entry_id = NULL, balance_after = NULL).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._finance_invoice_approve_inline(uuid,uuid,uuid);
CREATE OR REPLACE FUNCTION public._finance_invoice_approve_inline(
  p_tenant_id uuid, p_invoice_id uuid, p_actor uuid,
  OUT ledger_entry_id uuid,
  OUT balance_after numeric,
  OUT effective_date date,
  OUT ledger_created boolean
)
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
BEGIN
  ledger_entry_id := NULL;
  balance_after   := NULL;
  effective_date  := NULL;
  ledger_created  := false;

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

  effective_date := v_inv.issue_date;

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
    'prices_include_tax', v_inv.prices_include_tax,
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
    SELECT id INTO ledger_entry_id
      FROM public.ledger_entries
     WHERE tenant_id = p_tenant_id
       AND entry_type = 'invoice'
       AND reference_type = 'invoice'
       AND reference_id = p_invoice_id
     LIMIT 1;

    IF ledger_entry_id IS NULL THEN
      -- §C1. Preserve persisted metadata via='approve_invoice' unchanged.
      SELECT le.ledger_entry_id, le.balance_after
        INTO ledger_entry_id, balance_after
        FROM public._finance_ledger_insert(
               p_tenant_id, v_inv.client_id,
               'invoice','invoice', p_invoice_id,
               v_inv.total_amount, v_inv.issue_date,
               'Invoice ' || v_inv.invoice_number,
               NULL, NULL,
               jsonb_build_object('invoice_number', v_inv.invoice_number, 'via', 'approve_invoice'),
               p_actor
             ) AS le;
      ledger_created := true;
    END IF;
  END IF;

  UPDATE public.invoices
     SET status='approved', updated_at=now()
   WHERE id = p_invoice_id;
END
$inline$;

-- Explicit least-privilege lockdown for the private helper only.
DO $g$ BEGIN
  BEGIN
    EXECUTE 'REVOKE ALL ON FUNCTION public._finance_invoice_approve_inline(uuid,uuid,uuid) FROM PUBLIC';
  EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public._finance_invoice_approve_inline(uuid,uuid,uuid) FROM anon';
  EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public._finance_invoice_approve_inline(uuid,uuid,uuid) FROM authenticated';
  EXCEPTION WHEN undefined_object THEN NULL; END;
END $g$;

-- ---------------------------------------------------------------------------
-- §C2/C3. Replace public.approve_invoice — behavior-preserving wrapper.
--         DO NOT modify its ACL. CREATE OR REPLACE keeps existing grants.
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
  v_inv record;
  v_ledger_id uuid; v_balance_after numeric;
  v_effective_date date; v_ledger_created boolean;
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

  SELECT ledger_entry_id, balance_after, effective_date, ledger_created
    INTO v_ledger_id, v_balance_after, v_effective_date, v_ledger_created
    FROM public._finance_invoice_approve_inline(p_tenant_id, p_invoice_id, v_actor);

  SELECT id, invoice_number, issue_date INTO v_inv
    FROM public.invoices WHERE id = p_invoice_id;

  -- §C2. Preserve exact prior response semantics.
  -- Previous behavior: ledger_entry_id / balance_after were set only when
  -- this call INSERTED the ledger row; when a ledger row already existed,
  -- they were left NULL. Do not "rehydrate" from ledger_entries here.
  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'approved',
    'ledger_entry_id', CASE WHEN v_ledger_created THEN v_ledger_id ELSE NULL END,
    'balance_after',   CASE WHEN v_ledger_created THEN v_balance_after ELSE NULL END,
    'effective_date',  v_effective_date
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$approve$;

-- §C3. NO REVOKE / GRANT on approve_invoice. CREATE OR REPLACE preserves the
--      exact pre-migration ACL. Any tampering here would violate the security
--      preservation contract.

-- ---------------------------------------------------------------------------
-- §C. Embedded Checkout writer.
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

  -- §E. Real Walk-in / registered-client resolution — canonical wins for
  --     registered clients; length gate applies only to supplied Walk-in.
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

  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(
      p_tenant_id, v_op, p_idempotency_key, v_actor,
      jsonb_build_object('tenant_id',p_tenant_id,'source_type',v_source_type,'source_id',v_source_id),
      jsonb_build_object('payload', p_payload)
    );
  IF v_replay THEN RETURN v_stored; END IF;

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

  -- §M3. Positive-total requirement for checkout.
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'FIN_CHECKOUT_TOTAL_INVALID' USING ERRCODE='23514';
  END IF;

  v_invoice_number := public._finance_invoice_number_next(p_tenant_id, 'manual');

  -- §M3. payment_received_at = NULL for every method; post_payment sets it.
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
    NULL,
    v_actor
  );

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

  PERFORM public._finance_invoice_approve_inline(p_tenant_id, v_invoice_id, v_actor);

  IF v_payment_method <> 'debt' THEN
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

    -- §M3 (Delta 8): payment_received_at is owned solely by post_invoice_payments.
    -- Orchestrator-side UPDATE removed; canonical payment path owns the stamp.
    NULL;
  END IF;

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
-- §C4. POS Core writer.
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
  v_tenant_currency text;
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

  SELECT is_replay, request_hash, stored_response
    INTO v_replay, v_hash, v_stored
    FROM public._finance_idempotency_begin(
      p_tenant_id, v_op, p_idempotency_key, v_actor,
      jsonb_build_object('tenant_id',p_tenant_id,'pos_session_id',v_session_id),
      jsonb_build_object('payload', p_payload)
    );
  IF v_replay THEN RETURN v_stored; END IF;

  -- §M1/M2. Resolve products; validate tenant/active/currency/price.
  SELECT COALESCE(currency, 'SAR') INTO v_tenant_currency
    FROM public.tenants WHERE id = p_tenant_id;

  WITH raw AS (
    SELECT (e.value->>'product_id')::uuid AS product_id,
           (e.value->>'quantity')::numeric AS quantity,
           (e.ordinality - 1)::int AS pos
      FROM jsonb_array_elements(v_items) WITH ORDINALITY e(value, ordinality)
  ),
  resolved AS (
    SELECT r.pos, r.product_id, r.quantity,
           p.name, p.name_ar, p.selling_price AS price, p.currency AS pcurrency,
           p.is_active, p.tenant_id AS ptenant
      FROM raw r
      LEFT JOIN public.products p ON p.id = r.product_id
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'description', COALESCE(name_ar, name),
             'quantity', quantity,
             'unit_price', COALESCE(price, 0),
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
             'unit_price', COALESCE(price, 0),
             'price_missing', (price IS NULL),
             'pcurrency', pcurrency,
             'is_active', is_active,
             'ptenant', ptenant
           ) ORDER BY pos
         )
    INTO v_computed_items, v_normalized_items
    FROM resolved;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_normalized_items) x
              WHERE (x->>'ptenant')::uuid IS DISTINCT FROM p_tenant_id
                 OR (x->>'is_active')::boolean IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'FIN_PRODUCT_INVALID' USING ERRCODE='23503';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_normalized_items) x
              WHERE (x->>'price_missing')::boolean = true) THEN
    RAISE EXCEPTION 'FIN_PRODUCT_PRICE_MISSING' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_normalized_items) x
              WHERE (x->>'pcurrency') IS DISTINCT FROM v_tenant_currency) THEN
    RAISE EXCEPTION 'FIN_PRODUCT_CURRENCY_MISMATCH' USING ERRCODE='23514';
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

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'FIN_CHECKOUT_TOTAL_INVALID' USING ERRCODE='23514';
  END IF;

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
    NULL,
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

  IF v_payment_method <> 'debt' THEN
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

    UPDATE public.invoices
       SET payment_received_at = now(), updated_at = now()
     WHERE id = v_invoice_id
       AND status IN ('paid','approved','partial')
       AND payment_received_at IS NULL
       AND EXISTS (
         SELECT 1 FROM public.ledger_entries
          WHERE tenant_id = p_tenant_id
            AND entry_type = 'payment'
            AND reference_type = 'invoice'
            AND reference_id = v_invoice_id
       );
  END IF;

  SELECT COALESCE(MAX(sale_number), 0) + 1 INTO v_sale_number
    FROM public.pos_sales
   WHERE tenant_id = p_tenant_id AND session_id = v_session_id;

  -- §L. Fully-qualified digest under empty search_path.
  SELECT encode(
    extensions.digest(
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
-- §D/F/P. HARD-FAIL EMBEDDED VERIFICATION.
--         Runs INSIDE a nested subtransaction that is rolled back via an
--         explicit sentinel. All other exceptions re-raise and abort the
--         entire migration. No SKIPPED verifications.
-- ---------------------------------------------------------------------------
DO $verify$
DECLARE
  --------------------- baseline (§P preservation) ---------------------
  v_bl_invoices bigint; v_bl_items bigint; v_bl_le bigint; v_bl_bl bigint;
  v_bl_pos bigint; v_bl_idem bigint; v_bl_cb bigint;
  v_af_invoices bigint; v_af_items bigint; v_af_le bigint; v_af_bl bigint;
  v_af_pos bigint; v_af_idem bigint; v_af_cb bigint;

  --------------------- fixture identities ---------------------
  v_tenant uuid; v_actor uuid; v_client_id uuid;
  v_lab_sample uuid;
  v_pos_session uuid; v_product uuid; v_pay_account uuid;
  v_currency text; v_tax_rate numeric;

  --------------------- utility ---------------------
  v_key uuid; v_result jsonb; v_result2 jsonb;
BEGIN
  BEGIN  -- outer sub-txn (rolled back via sentinel on success)

    ------------------------------------------------------------------
    -- §P. Snapshot business-data baseline BEFORE any verification write.
    ------------------------------------------------------------------
    SELECT count(*) INTO v_bl_invoices FROM public.invoices;
    SELECT count(*) INTO v_bl_items FROM public.invoice_items;
    SELECT count(*) INTO v_bl_le FROM public.ledger_entries;
    SELECT count(*) INTO v_bl_bl FROM public.billing_links;
    SELECT count(*) INTO v_bl_pos FROM public.pos_sales;
    SELECT count(*) INTO v_bl_idem FROM public.finance_request_idempotency;
    SELECT count(*) INTO v_bl_cb FROM public.customer_balances;

    ------------------------------------------------------------------
    -- §F. Deterministic fixture creation inside this subtransaction.
    --     Everything created here disappears on the sentinel rollback.
    ------------------------------------------------------------------
    SELECT tm.user_id, tm.tenant_id
      INTO v_actor, v_tenant
      FROM public.tenant_members tm
     WHERE tm.is_active = true
     ORDER BY tm.created_at
     LIMIT 1;
    IF v_tenant IS NULL THEN
      RAISE EXCEPTION 'J5_1_VERIFY_FIXTURE_TENANT_MISSING';
    END IF;

    -- Establish authenticated JWT claims for RLS/permission checks.
    PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);

    SELECT COALESCE(currency,'SAR') INTO v_currency FROM public.tenants WHERE id = v_tenant;

    SELECT id INTO v_pay_account
      FROM public.payment_accounts
     WHERE tenant_id = v_tenant AND owner_type='tenant' AND is_active = true
     LIMIT 1;
    IF v_pay_account IS NULL THEN
      INSERT INTO public.payment_accounts (tenant_id, owner_type, name, is_active)
      VALUES (v_tenant, 'tenant', 'J5.1 verify cashbox', true)
      RETURNING id INTO v_pay_account;
    END IF;

    INSERT INTO public.clients (tenant_id, name)
    VALUES (v_tenant, 'J5.1 Verify Client')
    RETURNING id INTO v_client_id;

    INSERT INTO public.lab_samples (tenant_id, sample_number, sample_type, status)
    VALUES (v_tenant, 'J5V-'||substr(gen_random_uuid()::text,1,8), 'serum', 'received')
    RETURNING id INTO v_lab_sample;

    ------------------------------------------------------------------
    -- §D3. T1 — unauthenticated MUST raise FIN_UNAUTHENTICATED exactly.
    ------------------------------------------------------------------
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', '', true);
      PERFORM set_config('request.jwt.claims', '{}', true);
      BEGIN
        PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
          jsonb_build_object('pos_session_id', gen_random_uuid(),
            'payment_method','cash',
            'items', jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'quantity', 1))));
        RAISE EXCEPTION 'J5_1_VERIFY_T1_NO_ERROR';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%FIN_UNAUTHENTICATED%' THEN
          RAISE EXCEPTION 'J5_1_VERIFY_T1_WRONG_ERROR: %', SQLERRM;
        END IF;
      END;
    END;
    -- Restore authenticated
    PERFORM set_config('request.jwt.claim.sub', v_actor::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_actor::text, 'role','authenticated')::text, true);

    ------------------------------------------------------------------
    -- §D3/T2..T7 — rejection contracts (each asserts EXACT sentinel).
    ------------------------------------------------------------------
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','debt','link_kind','final',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_T2_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PAYLOAD_UNKNOWN_KEY%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T2_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','crypto',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_T4_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PAYMENT_METHOD_INVALID%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T4_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','breeding_event','source_id', gen_random_uuid(),
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_T5_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_SOURCE_TYPE_UNSUPPORTED%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T5_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', gen_random_uuid(),
          'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_T6_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_SOURCE_NOT_FOUND%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T6_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    BEGIN
      PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object('pos_session_id', gen_random_uuid(),'payment_method','cash',
          'items', jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(),'quantity',1))));
      RAISE EXCEPTION 'J5_1_VERIFY_T7_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_POS_SESSION_NOT_FOUND%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T7_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    ------------------------------------------------------------------
    -- §E. Walk-in name contract (real same-tenant lab_sample fixture).
    ------------------------------------------------------------------
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','debt','client_name', repeat('A',201),
          'items', jsonb_build_array(jsonb_build_object('description','x','quantity',1,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_T8_LEN_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_CLIENT_NAME_TOO_LONG%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_T8_LEN_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    -- Supplied Walk-in name → trimmed + persisted exactly
    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','client_name','  Jane Walkin  ',
        'items', jsonb_build_array(jsonb_build_object(
          'description','walkin-named','quantity',1,'unit_price',50))));
    IF (v_result->>'client_name') <> 'Jane Walkin' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_WALKIN_NAMED_NOT_TRIMMED: %', v_result->>'client_name';
    END IF;

    -- Blank walk-in → "Walk-in Customer"
    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt',
        'items', jsonb_build_array(jsonb_build_object(
          'description','walkin-fallback','quantity',1,'unit_price',30))));
    IF (v_result->>'client_name') <> 'Walk-in Customer' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_WALKIN_FALLBACK_WRONG: %', v_result->>'client_name';
    END IF;

    -- Registered client with spoofed payload name → canonical DB name wins
    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','client_id', v_client_id,'client_name','SPOOF',
        'items', jsonb_build_array(jsonb_build_object(
          'description','registered','quantity',1,'unit_price',20))));
    IF (v_result->>'client_name') <> 'J5.1 Verify Client' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_REGISTERED_NOT_CANONICAL: %', v_result->>'client_name';
    END IF;

    ------------------------------------------------------------------
    -- §F1/F4. Embedded Checkout success paths for every payment method.
    --         Verifies lifecycle: cash/card/transfer→paid, debt→approved.
    ------------------------------------------------------------------
    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','svc','quantity',1,'unit_price',100))));
    IF (v_result->>'status') <> 'approved' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_DEBT_STATUS: %', v_result->>'status';
    END IF;

    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','cash','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','svc','quantity',1,'unit_price',100))));
    IF (v_result->>'status') <> 'paid' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_CASH_STATUS: %', v_result->>'status';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoices
                    WHERE id = (v_result->>'invoice_id')::uuid
                      AND payment_received_at IS NOT NULL) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_CASH_PAYMENT_STAMP_MISSING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.billing_links
                    WHERE invoice_id=(v_result->>'invoice_id')::uuid
                      AND link_kind='final' AND source_type='lab_sample') THEN
      RAISE EXCEPTION 'J5_1_VERIFY_CASH_BILLING_LINK_MISSING';
    END IF;

    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','card','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','svc','quantity',1,'unit_price',80))));
    IF (v_result->>'status') <> 'paid' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_CARD_STATUS: %', v_result->>'status';
    END IF;

    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','transfer','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','svc','quantity',1,'unit_price',60))));
    IF (v_result->>'status') <> 'paid' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_TRANSFER_STATUS: %', v_result->>'status';
    END IF;

    -- Assert J5 snapshots non-null on every produced item
    IF EXISTS (
      SELECT 1 FROM public.invoice_items ii
       WHERE ii.invoice_id IN (
             SELECT id FROM public.invoices
              WHERE tenant_id = v_tenant AND created_at >= (now() - interval '2 minutes')
             )
         AND (ii.line_pretax_amount IS NULL OR ii.line_tax_amount IS NULL
              OR ii.line_gross_amount IS NULL OR ii.taxable_snapshot IS NULL
              OR ii.tax_rate_snapshot IS NULL)
    ) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_FROZEN_SNAPSHOT_NULL_IN_NEW_ITEM';
    END IF;

    ------------------------------------------------------------------
    -- §F3. Tax reconciliation. Tenant tax_rate is authoritative.
    ------------------------------------------------------------------
    SELECT COALESCE((SELECT tax_rate FROM public.tenants WHERE id = v_tenant), 15) INTO v_tax_rate;

    IF v_tax_rate = 15 THEN
      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','debt','prices_include_tax', true,'client_id', v_client_id,
          'items', jsonb_build_array(jsonb_build_object(
            'description','inc','quantity',1,'unit_price',115,'is_taxable', true))));
      IF round((v_result->>'total_amount')::numeric,2) <> 115.00 THEN
        RAISE EXCEPTION 'J5_1_VERIFY_TAX_INCLUSIVE_TOTAL: %', v_result->>'total_amount';
      END IF;

      v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','debt','prices_include_tax', false,'client_id', v_client_id,
          'items', jsonb_build_array(jsonb_build_object(
            'description','exc','quantity',1,'unit_price',100,'is_taxable', true))));
      IF round((v_result->>'total_amount')::numeric,2) <> 115.00 THEN
        RAISE EXCEPTION 'J5_1_VERIFY_TAX_EXCLUSIVE_TOTAL: %', v_result->>'total_amount';
      END IF;
    END IF;

    v_result := public.create_source_checkout_invoice(v_tenant, gen_random_uuid(),
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','prices_include_tax', false,'client_id', v_client_id,
        'discount_amount', 5,
        'items', jsonb_build_array(
          jsonb_build_object('description','tx','quantity',1,'unit_price',50,'is_taxable', true),
          jsonb_build_object('description','ntx','quantity',1,'unit_price',30,'is_taxable', false))));
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices i
        JOIN (SELECT invoice_id, sum(line_pretax_amount) sp, sum(line_tax_amount) st,
                     sum(line_gross_amount) sg
                FROM public.invoice_items GROUP BY invoice_id) s
          ON s.invoice_id = i.id
       WHERE i.id = (v_result->>'invoice_id')::uuid
         AND round(i.subtotal,2)   = round(s.sp,2)
         AND round(i.tax_amount,2) = round(s.st,2)
         AND round(i.total_amount,2)= round(s.sg - i.discount_amount, 2)
    ) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_HEADER_RECON_FAIL';
    END IF;

    ------------------------------------------------------------------
    -- §F2. POS Core — open session + active product; debt + non-debt.
    ------------------------------------------------------------------
    INSERT INTO public.pos_sessions (tenant_id, opened_by, status)
    VALUES (v_tenant, v_actor, 'open') RETURNING id INTO v_pos_session;

    INSERT INTO public.products (tenant_id, name, product_type, selling_price, currency, is_active)
    VALUES (v_tenant, 'J5.1 Verify Product', 'item', 25.00, v_currency, true)
    RETURNING id INTO v_product;

    v_result := public.create_pos_sale(v_tenant, gen_random_uuid(),
      jsonb_build_object('pos_session_id', v_pos_session, 'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 2))));
    IF (v_result->>'status') <> 'approved' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_DEBT_STATUS: %', v_result->>'status';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.pos_sales
                    WHERE id=(v_result->>'pos_sale_id')::uuid AND sale_number IS NOT NULL) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_SALE_ROW_MISSING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoice_items
                    WHERE invoice_id=(v_result->>'invoice_id')::uuid
                      AND entity_type='pos_product' AND entity_id = v_product) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_PRODUCT_TRACE_MISSING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoice_items
                    WHERE invoice_id=(v_result->>'invoice_id')::uuid
                      AND unit_price = 25.00) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_SERVER_PRICE_MISSING';
    END IF;

    v_result2 := public.create_pos_sale(v_tenant, gen_random_uuid(),
      jsonb_build_object('pos_session_id', v_pos_session, 'payment_method','cash','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1))));
    IF (v_result2->>'status') <> 'paid' THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_CASH_STATUS: %', v_result2->>'status';
    END IF;
    IF ((v_result2->>'sale_number')::int) <> ((v_result->>'sale_number')::int + 1) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_SALE_NUMBER_NOT_CONSECUTIVE';
    END IF;

    ------------------------------------------------------------------
    -- §M product validation: missing price, currency mismatch.
    ------------------------------------------------------------------
    UPDATE public.products SET selling_price = NULL WHERE id = v_product;
    BEGIN
      PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object('pos_session_id', v_pos_session,'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1))));
      RAISE EXCEPTION 'J5_1_VERIFY_PRODUCT_PRICE_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PRODUCT_PRICE_MISSING%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_PRODUCT_PRICE_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;
    UPDATE public.products SET selling_price = 25.00, currency = v_currency || 'X' WHERE id = v_product;
    BEGIN
      PERFORM public.create_pos_sale(v_tenant, gen_random_uuid(),
        jsonb_build_object('pos_session_id', v_pos_session,'payment_method','debt',
          'items', jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1))));
      RAISE EXCEPTION 'J5_1_VERIFY_PRODUCT_CURRENCY_NO_ERROR';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_PRODUCT_CURRENCY_MISMATCH%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_PRODUCT_CURRENCY_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;
    UPDATE public.products SET currency = v_currency WHERE id = v_product;

    ------------------------------------------------------------------
    -- §F5. Idempotency — replay identical, then conflict.
    ------------------------------------------------------------------
    v_key := gen_random_uuid();
    v_result := public.create_source_checkout_invoice(v_tenant, v_key,
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','idem','quantity',1,'unit_price',10))));
    v_result2 := public.create_source_checkout_invoice(v_tenant, v_key,
      jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
        'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('description','idem','quantity',1,'unit_price',10))));
    IF (v_result->>'invoice_id') <> (v_result2->>'invoice_id') THEN
      RAISE EXCEPTION 'J5_1_VERIFY_IDEMPOTENCY_REPLAY_MISMATCH';
    END IF;
    BEGIN
      PERFORM public.create_source_checkout_invoice(v_tenant, v_key,
        jsonb_build_object('source_type','lab_sample','source_id', v_lab_sample,
          'payment_method','debt','client_id', v_client_id,
          'items', jsonb_build_array(jsonb_build_object('description','idem','quantity',2,'unit_price',10))));
      RAISE EXCEPTION 'J5_1_VERIFY_IDEMPOTENCY_CONFLICT_MISSING';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_IDEMPOTENCY_CONFLICT%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_IDEMPOTENCY_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    v_key := gen_random_uuid();
    v_result := public.create_pos_sale(v_tenant, v_key,
      jsonb_build_object('pos_session_id', v_pos_session,'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('product_id', v_product,'quantity',1))));
    v_result2 := public.create_pos_sale(v_tenant, v_key,
      jsonb_build_object('pos_session_id', v_pos_session,'payment_method','debt','client_id', v_client_id,
        'items', jsonb_build_array(jsonb_build_object('product_id', v_product,'quantity',1))));
    IF (v_result->>'pos_sale_id') <> (v_result2->>'pos_sale_id') THEN
      RAISE EXCEPTION 'J5_1_VERIFY_POS_IDEMPOTENCY_REPLAY_MISMATCH';
    END IF;
    BEGIN
      PERFORM public.create_pos_sale(v_tenant, v_key,
        jsonb_build_object('pos_session_id', v_pos_session,'payment_method','debt','client_id', v_client_id,
          'items', jsonb_build_array(jsonb_build_object('product_id', v_product,'quantity',5))));
      RAISE EXCEPTION 'J5_1_VERIFY_POS_IDEMPOTENCY_CONFLICT_MISSING';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%FIN_IDEMPOTENCY_CONFLICT%' THEN
        RAISE EXCEPTION 'J5_1_VERIFY_POS_IDEMPOTENCY_WRONG_ERROR: %', SQLERRM;
      END IF;
    END;

    ------------------------------------------------------------------
    -- §K. Whole-database reconciliation asserts.
    ------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM public.invoices WHERE prices_include_tax IS NULL) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_RECON_MODE_NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM public.invoice_items
                WHERE line_pretax_amount IS NULL OR line_tax_amount IS NULL
                   OR line_gross_amount IS NULL OR taxable_snapshot IS NULL
                   OR tax_rate_snapshot IS NULL) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_RECON_SNAPSHOT_NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM public.invoice_items
                WHERE round(line_pretax_amount+line_tax_amount,2) <> round(line_gross_amount,2)) THEN
      RAISE EXCEPTION 'J5_1_VERIFY_RECON_LINE_IDENTITY';
    END IF;

    ------------------------------------------------------------------
    -- §D1/D2. Success sentinel — rollback subtransaction.
    ------------------------------------------------------------------
    RAISE EXCEPTION 'J5_1_VERIFY_ROLLBACK_SENTINEL_OK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'J5_1_VERIFY_ROLLBACK_SENTINEL_OK' THEN
        -- Deliberate success rollback: nothing to persist.
        NULL;
      ELSE
        -- Any other error: propagate. Migration MUST abort.
        RAISE;
      END IF;
  END;

  ------------------------------------------------------------------
  -- §P. Post-rollback preservation — verify zero business-data delta.
  ------------------------------------------------------------------
  SELECT count(*) INTO v_af_invoices FROM public.invoices;
  SELECT count(*) INTO v_af_items    FROM public.invoice_items;
  SELECT count(*) INTO v_af_le       FROM public.ledger_entries;
  SELECT count(*) INTO v_af_bl       FROM public.billing_links;
  SELECT count(*) INTO v_af_pos      FROM public.pos_sales;
  SELECT count(*) INTO v_af_idem     FROM public.finance_request_idempotency;
  SELECT count(*) INTO v_af_cb       FROM public.customer_balances;

  IF v_af_invoices <> v_bl_invoices OR v_af_items <> v_bl_items
     OR v_af_le <> v_bl_le OR v_af_bl <> v_bl_bl
     OR v_af_pos <> v_bl_pos OR v_af_idem <> v_bl_idem
     OR v_af_cb <> v_bl_cb THEN
    RAISE EXCEPTION 'J5_1_VERIFY_PRESERVATION_DELTA (inv %/%, items %/%, le %/%, bl %/%, pos %/%, idem %/%, cb %/%)',
      v_bl_invoices, v_af_invoices, v_bl_items, v_af_items,
      v_bl_le, v_af_le, v_bl_bl, v_af_bl,
      v_bl_pos, v_af_pos, v_bl_idem, v_af_idem, v_bl_cb, v_af_cb;
  END IF;

  RAISE NOTICE 'J5.1 embedded verification: OK (rejection + success + tax + lifecycle + idempotency + reconciliation + preservation).';
END
$verify$;
