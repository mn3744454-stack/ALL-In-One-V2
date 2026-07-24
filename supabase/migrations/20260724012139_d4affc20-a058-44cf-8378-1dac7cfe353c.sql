-- =========================================================================
-- PHASE N+1B · J5 — Final Tax snapshot database constraints
-- =========================================================================

DO $migration$
DECLARE
  v_null_count       integer;
  v_bad_count        integer;
  v_pretax_mm        integer;
  v_tax_mm           integer;
  v_total_mm         integer;
  v_period_bad       integer;
  v_trigger_count    integer;
  v_default_count    integer;
  v_nullable_count   integer;
  v_repaired         record;
BEGIN
  -- D0. Advisory lock + table locks
  PERFORM pg_advisory_xact_lock(hashtext('phase_n1b_j5_tax_snapshot_constraints'));
  LOCK TABLE public.invoices        IN SHARE MODE;
  LOCK TABLE public.invoice_items   IN SHARE MODE;

  -- D1. Null readiness
  SELECT count(*) INTO v_null_count FROM public.invoices WHERE prices_include_tax IS NULL;
  IF v_null_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D1: invoices.prices_include_tax NULLs = %', v_null_count;
  END IF;

  SELECT
    (SELECT count(*) FROM public.invoice_items WHERE line_pretax_amount IS NULL)
  + (SELECT count(*) FROM public.invoice_items WHERE line_tax_amount    IS NULL)
  + (SELECT count(*) FROM public.invoice_items WHERE line_gross_amount  IS NULL)
  + (SELECT count(*) FROM public.invoice_items WHERE taxable_snapshot   IS NULL)
  + (SELECT count(*) FROM public.invoice_items WHERE tax_rate_snapshot  IS NULL)
  INTO v_null_count;
  IF v_null_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D1: invoice_items snapshot NULLs = %', v_null_count;
  END IF;

  -- D2. Per-line identity
  SELECT count(*) INTO v_bad_count
  FROM public.invoice_items
  WHERE round(line_pretax_amount + line_tax_amount, 2) <> round(line_gross_amount, 2);
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D2: identity failures = %', v_bad_count;
  END IF;

  -- D3. Non-negative snapshots
  SELECT count(*) INTO v_bad_count
  FROM public.invoice_items
  WHERE line_pretax_amount < 0 OR line_tax_amount < 0 OR line_gross_amount < 0;
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D3: negative snapshots = %', v_bad_count;
  END IF;

  -- D4. Rate range
  SELECT count(*) INTO v_bad_count
  FROM public.invoice_items
  WHERE tax_rate_snapshot < 0 OR tax_rate_snapshot > 100;
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D4: rate-range failures = %', v_bad_count;
  END IF;

  -- D5. Taxability consistency
  SELECT count(*) INTO v_bad_count
  FROM public.invoice_items
  WHERE (taxable_snapshot  = false AND line_tax_amount > 0)
     OR (tax_rate_snapshot = 0     AND line_tax_amount > 0);
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D5: taxability failures = %', v_bad_count;
  END IF;

  -- D6. Header reconciliation
  WITH s AS (
    SELECT invoice_id,
           SUM(line_pretax_amount) sp,
           SUM(line_tax_amount)    st,
           SUM(line_gross_amount)  sg
    FROM public.invoice_items GROUP BY invoice_id
  )
  SELECT
    count(*) FILTER (WHERE round(s.sp,2) <> round(i.subtotal,2)),
    count(*) FILTER (WHERE round(s.st,2) <> round(coalesce(i.tax_amount,0),2)),
    count(*) FILTER (WHERE round(s.sg - coalesce(i.discount_amount,0),2) <> round(i.total_amount,2))
  INTO v_pretax_mm, v_tax_mm, v_total_mm
  FROM s JOIN public.invoices i ON i.id = s.invoice_id;
  IF v_pretax_mm + v_tax_mm + v_total_mm <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D6: header mismatches pretax=% tax=% total=%',
      v_pretax_mm, v_tax_mm, v_total_mm;
  END IF;

  -- D7. Period constraint pre-state
  SELECT count(*) INTO v_period_bad
  FROM public.invoice_items
  WHERE period_start IS NOT NULL AND period_end IS NOT NULL AND period_end < period_start;
  IF v_period_bad <> 0 THEN
    RAISE EXCEPTION 'J5 preflight D7: period violations = %', v_period_bad;
  END IF;

  SELECT id, period_start, period_end, description
  INTO v_repaired
  FROM public.invoice_items
  WHERE id = 'fedae37c-0fcb-42f4-8ed7-ec7f97c61193';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'J5 preflight D7: J4.2 repaired item is missing';
  END IF;
  IF v_repaired.period_start IS NOT NULL
     OR v_repaired.period_end IS NOT NULL
     OR v_repaired.description <> 'Suni | Taif Branch | إيواء' THEN
    RAISE EXCEPTION 'J5 preflight D7: J4.2 repaired item state drifted (start=%, end=%, desc=%)',
      v_repaired.period_start, v_repaired.period_end, v_repaired.description;
  END IF;

  -- D8. Trigger inventory
  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.invoice_items'::regclass
    AND NOT tgisinternal
    AND tgname IN ('trg_invoice_items_fill_snapshots', 'trg_invoice_items_validate_source')
    AND tgenabled = 'O';
  IF v_trigger_count <> 2 THEN
    RAISE EXCEPTION 'J5 preflight D8: expected 2 enabled trigger rows, got %', v_trigger_count;
  END IF;

  -- F. Add missing consistency CHECKs (NOT VALID first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_items_line_identity_ck'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_line_identity_ck
      CHECK (
        line_pretax_amount IS NULL
        OR line_tax_amount IS NULL
        OR line_gross_amount IS NULL
        OR round(line_pretax_amount + line_tax_amount, 2) = round(line_gross_amount, 2)
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_items_nontaxable_zero_tax_ck'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_nontaxable_zero_tax_ck
      CHECK (
        taxable_snapshot IS NULL
        OR line_tax_amount IS NULL
        OR taxable_snapshot = true
        OR line_tax_amount = 0
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_items_zero_rate_zero_tax_ck'
      AND conrelid = 'public.invoice_items'::regclass
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_zero_rate_zero_tax_ck
      CHECK (
        tax_rate_snapshot IS NULL
        OR line_tax_amount IS NULL
        OR tax_rate_snapshot <> 0
        OR line_tax_amount = 0
      ) NOT VALID;
  END IF;

  -- H. Validate all in-scope CHECK constraints
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_line_pretax_nonneg_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_line_tax_nonneg_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_line_gross_nonneg_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_tax_rate_snapshot_range_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_line_identity_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_nontaxable_zero_tax_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_zero_rate_zero_tax_ck;
  ALTER TABLE public.invoice_items VALIDATE CONSTRAINT invoice_items_period_valid_ck;

  -- E. Final nullability
  ALTER TABLE public.invoices
    ALTER COLUMN prices_include_tax SET NOT NULL;

  ALTER TABLE public.invoice_items
    ALTER COLUMN line_pretax_amount SET NOT NULL,
    ALTER COLUMN line_tax_amount    SET NOT NULL,
    ALTER COLUMN line_gross_amount  SET NOT NULL,
    ALTER COLUMN taxable_snapshot   SET NOT NULL,
    ALTER COLUMN tax_rate_snapshot  SET NOT NULL;

  -- E1. No static defaults on any of the six columns
  SELECT count(*) INTO v_default_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'invoices'      AND column_name = 'prices_include_tax')
      OR (table_name = 'invoice_items' AND column_name IN (
          'line_pretax_amount','line_tax_amount','line_gross_amount',
          'taxable_snapshot','tax_rate_snapshot'))
    )
    AND column_default IS NOT NULL;
  IF v_default_count <> 0 THEN
    RAISE EXCEPTION 'J5 E1: % frozen columns still carry a static default', v_default_count;
  END IF;

  -- K1. Confirm nullability
  SELECT count(*) INTO v_nullable_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'invoices'      AND column_name = 'prices_include_tax')
      OR (table_name = 'invoice_items' AND column_name IN (
          'line_pretax_amount','line_tax_amount','line_gross_amount',
          'taxable_snapshot','tax_rate_snapshot'))
    )
    AND is_nullable = 'YES';
  IF v_nullable_count <> 0 THEN
    RAISE EXCEPTION 'J5 K1: % frozen columns remain NULLABLE after DDL', v_nullable_count;
  END IF;

  -- K4. All target constraints validated
  SELECT count(*) INTO v_bad_count
  FROM pg_constraint
  WHERE conrelid = 'public.invoice_items'::regclass
    AND conname IN (
      'invoice_items_line_pretax_nonneg_ck',
      'invoice_items_line_tax_nonneg_ck',
      'invoice_items_line_gross_nonneg_ck',
      'invoice_items_tax_rate_snapshot_range_ck',
      'invoice_items_line_identity_ck',
      'invoice_items_nontaxable_zero_tax_ck',
      'invoice_items_zero_rate_zero_tax_ck',
      'invoice_items_period_valid_ck'
    )
    AND convalidated = false;
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION 'J5 K4: % target constraints remain NOT VALID', v_bad_count;
  END IF;

  -- K5. Triggers unchanged
  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.invoice_items'::regclass
    AND NOT tgisinternal
    AND tgname IN ('trg_invoice_items_fill_snapshots','trg_invoice_items_validate_source')
    AND tgenabled = 'O';
  IF v_trigger_count <> 2 THEN
    RAISE EXCEPTION 'J5 K5: trigger inventory drifted (count=%)', v_trigger_count;
  END IF;

  -- L. Post-DDL reconciliation
  WITH s AS (
    SELECT invoice_id,
           SUM(line_pretax_amount) sp,
           SUM(line_tax_amount)    st,
           SUM(line_gross_amount)  sg
    FROM public.invoice_items GROUP BY invoice_id
  )
  SELECT
    count(*) FILTER (WHERE round(s.sp,2) <> round(i.subtotal,2)),
    count(*) FILTER (WHERE round(s.st,2) <> round(coalesce(i.tax_amount,0),2)),
    count(*) FILTER (WHERE round(s.sg - coalesce(i.discount_amount,0),2) <> round(i.total_amount,2))
  INTO v_pretax_mm, v_tax_mm, v_total_mm
  FROM s JOIN public.invoices i ON i.id = s.invoice_id;
  IF v_pretax_mm + v_tax_mm + v_total_mm <> 0 THEN
    RAISE EXCEPTION 'J5 L: final reconciliation drift pretax=% tax=% total=%',
      v_pretax_mm, v_tax_mm, v_total_mm;
  END IF;
END
$migration$;

-- =========================================================================
-- Direct-write rejection tests (J7/J8) — subtransaction-scoped, zero residue.
-- =========================================================================
DO $rejection_tests$
DECLARE
  v_invoice_id   uuid;
  v_item_id      uuid;
BEGIN
  SELECT id INTO v_invoice_id FROM public.invoices ORDER BY created_at LIMIT 1;
  SELECT id INTO v_item_id FROM public.invoice_items WHERE invoice_id = v_invoice_id LIMIT 1;
  IF v_invoice_id IS NULL OR v_item_id IS NULL THEN
    RAISE NOTICE 'J5 rejection tests: no invoices/items present — skipping';
    RETURN;
  END IF;

  BEGIN UPDATE public.invoices     SET prices_include_tax = NULL   WHERE id = v_invoice_id;
        RAISE EXCEPTION 'J5 J7a leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_pretax_amount = NULL WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J7b leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_tax_amount    = NULL WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J7c leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_gross_amount  = NULL WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J7d leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET taxable_snapshot   = NULL WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J7e leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET tax_rate_snapshot  = NULL WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J7f leaked'; EXCEPTION WHEN not_null_violation THEN NULL; END;

  BEGIN UPDATE public.invoice_items SET line_pretax_amount = -1  WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8a leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_tax_amount    = -1  WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8b leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_gross_amount  = -1  WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8c leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET tax_rate_snapshot  = -0.001 WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8d leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET tax_rate_snapshot  = 100.001 WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8e leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET line_pretax_amount = line_pretax_amount + 1
        WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8f leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET taxable_snapshot = false, line_tax_amount = 1
        WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8g leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.invoice_items SET tax_rate_snapshot = 0, line_tax_amount = 1
        WHERE id = v_item_id;
        RAISE EXCEPTION 'J5 J8h leaked'; EXCEPTION WHEN check_violation THEN NULL; END;
END
$rejection_tests$;

-- =========================================================================
-- Residual audit
-- =========================================================================
DO $residual_audit$
DECLARE
  v_pretax_mm integer;
  v_tax_mm    integer;
  v_total_mm  integer;
  v_period    integer;
BEGIN
  WITH s AS (
    SELECT invoice_id,
           SUM(line_pretax_amount) sp,
           SUM(line_tax_amount)    st,
           SUM(line_gross_amount)  sg
    FROM public.invoice_items GROUP BY invoice_id
  )
  SELECT
    count(*) FILTER (WHERE round(s.sp,2) <> round(i.subtotal,2)),
    count(*) FILTER (WHERE round(s.st,2) <> round(coalesce(i.tax_amount,0),2)),
    count(*) FILTER (WHERE round(s.sg - coalesce(i.discount_amount,0),2) <> round(i.total_amount,2))
  INTO v_pretax_mm, v_tax_mm, v_total_mm
  FROM s JOIN public.invoices i ON i.id = s.invoice_id;

  SELECT count(*) INTO v_period
  FROM public.invoice_items
  WHERE period_start IS NOT NULL AND period_end IS NOT NULL AND period_end < period_start;

  IF v_pretax_mm + v_tax_mm + v_total_mm + v_period <> 0 THEN
    RAISE EXCEPTION 'J5 residual audit failed: pretax=% tax=% total=% period=%',
      v_pretax_mm, v_tax_mm, v_total_mm, v_period;
  END IF;
END
$residual_audit$;