-- Phase N+1B · J4.2 — Legacy period repair for one invoice item
-- Scope: exactly one row in public.invoice_items.
-- Authorized columns: period_start, period_end, description.
-- Preserves every financial value, invoice header, ledger row, billing link,
-- payment, and customer balance. Aborts on any deviation.

DO $j42$
DECLARE
  v_invoice_id    uuid := '59665729-81bd-423e-885b-7364232a4fe4';
  v_item_id       uuid := 'fedae37c-0fcb-42f4-8ed7-ec7f97c61193';
  v_old_desc      text := 'Suni | Taif Branch | 14-05-2026 → 13-05-2026 | 1d × 0/يومي';
  v_new_desc      text := 'Suni | Taif Branch | إيواء';

  -- Pre-state captures
  r_item          public.invoice_items%ROWTYPE;
  r_inv           public.invoices%ROWTYPE;
  v_period_violations_before  integer;
  v_period_violations_after   integer;
  v_trigger_bad_count         integer;
  v_updated                   integer;
  v_already_final             boolean := false;

  -- Preservation checksums
  v_items_count_before        bigint;
  v_items_count_after         bigint;
  v_sum_qty_before            numeric;
  v_sum_qty_after             numeric;
  v_sum_unit_before           numeric;
  v_sum_unit_after            numeric;
  v_sum_total_before          numeric;
  v_sum_total_after           numeric;
  v_sum_pretax_before         numeric;
  v_sum_pretax_after          numeric;
  v_sum_tax_before            numeric;
  v_sum_tax_after             numeric;
  v_sum_gross_before          numeric;
  v_sum_gross_after           numeric;
  v_sum_rate_before           numeric;
  v_sum_rate_after            numeric;

  v_inv_count_before          bigint;
  v_inv_count_after           bigint;
  v_inv_sub_before            numeric;
  v_inv_sub_after             numeric;
  v_inv_tax_before            numeric;
  v_inv_tax_after             numeric;
  v_inv_disc_before           numeric;
  v_inv_disc_after            numeric;
  v_inv_total_before          numeric;
  v_inv_total_after           numeric;

  v_bl_count_before           bigint;
  v_bl_count_after            bigint;
  v_bl_sum_before             numeric;
  v_bl_sum_after              numeric;
BEGIN
  -- Dedicated advisory transaction lock for J4.2
  PERFORM pg_advisory_xact_lock(hashtext('phase_n1b_j42_legacy_period_repair'));

  -- Row locks
  SELECT * INTO r_inv  FROM public.invoices     WHERE id = v_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'J4.2 ABORT: target invoice % not found', v_invoice_id;
  END IF;

  SELECT * INTO r_item FROM public.invoice_items WHERE id = v_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'J4.2 ABORT: target invoice item % not found', v_item_id;
  END IF;

  IF r_item.invoice_id <> v_invoice_id THEN
    RAISE EXCEPTION 'J4.2 ABORT: item % does not belong to invoice %',
      v_item_id, v_invoice_id;
  END IF;

  -- Idempotency: detect already-final state
  IF r_item.period_start IS NULL
     AND r_item.period_end IS NULL
     AND r_item.description = v_new_desc THEN
    v_already_final := true;
  END IF;

  -- If not already final, the row MUST match the exact frozen before-state
  IF NOT v_already_final THEN
    IF NOT (
        r_item.period_start = DATE '2026-05-14'
        AND r_item.period_end = DATE '2026-05-13'
        AND r_item.description = v_old_desc
    ) THEN
      RAISE EXCEPTION
        'J4.2 ABORT (unexpected state): period_start=%, period_end=%, description=%',
        r_item.period_start, r_item.period_end, r_item.description;
    END IF;
  END IF;

  -- Financial freeze preflight (must hold in both branches)
  IF NOT (
       r_item.quantity              = 1.00
   AND r_item.unit_price            = 2032.26
   AND r_item.total_price           = 2032.26
   AND r_item.line_pretax_amount    = 2032.26
   AND r_item.line_tax_amount       = 0.00
   AND r_item.line_gross_amount     = 2032.26
   AND r_item.taxable_snapshot      = false
   AND r_item.tax_rate_snapshot     = 15.000
  ) THEN
    RAISE EXCEPTION
      'J4.2 ABORT (financial freeze mismatch): qty=%, unit=%, total=%, pretax=%, tax=%, gross=%, taxable=%, rate=%',
      r_item.quantity, r_item.unit_price, r_item.total_price,
      r_item.line_pretax_amount, r_item.line_tax_amount, r_item.line_gross_amount,
      r_item.taxable_snapshot, r_item.tax_rate_snapshot;
  END IF;

  -- Invoice header freeze preflight
  IF NOT (
       r_inv.subtotal        = 2032.26
   AND r_inv.tax_amount      = 0.00
   AND r_inv.discount_amount = 0.00
   AND r_inv.total_amount    = 2032.26
  ) THEN
    RAISE EXCEPTION
      'J4.2 ABORT (header mismatch): subtotal=%, tax=%, discount=%, total=%',
      r_inv.subtotal, r_inv.tax_amount, r_inv.discount_amount, r_inv.total_amount;
  END IF;

  -- Global period-violation census (per actual CHECK definition)
  SELECT count(*) INTO v_period_violations_before
  FROM public.invoice_items
  WHERE NOT (
    (period_start IS NULL AND period_end IS NULL)
    OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
  );

  IF v_already_final THEN
    IF v_period_violations_before <> 0 THEN
      RAISE EXCEPTION
        'J4.2 ABORT (already-final branch but % legacy period violations remain)',
        v_period_violations_before;
    END IF;
  ELSE
    IF v_period_violations_before <> 1 THEN
      RAISE EXCEPTION
        'J4.2 ABORT (expected exactly 1 legacy period violation, found %)',
        v_period_violations_before;
    END IF;

    -- The single violating row must be the target
    PERFORM 1
    FROM public.invoice_items
    WHERE NOT (
      (period_start IS NULL AND period_end IS NULL)
      OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
    )
      AND id = v_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'J4.2 ABORT: the sole legacy period violator is not the target row';
    END IF;
  END IF;

  -- Trigger scope guard: no active UPDATE trigger on invoice_items outside the
  -- known snapshot/validation triggers may mutate business columns silently.
  SELECT count(*) INTO v_trigger_bad_count
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'invoice_items'
    AND NOT tg.tgisinternal
    AND tg.tgenabled <> 'D'
    AND (tg.tgtype & 16) <> 0   -- UPDATE
    AND tg.tgname NOT IN (
      'trg_invoice_items_fill_snapshots',
      'trg_invoice_items_validate_source'
    );
  IF v_trigger_bad_count > 0 THEN
    RAISE EXCEPTION
      'J4.2 ABORT: unexpected UPDATE trigger(s) on invoice_items (count=%)',
      v_trigger_bad_count;
  END IF;

  -- Capture BEFORE preservation checksums
  SELECT count(*),
         COALESCE(SUM(quantity),0),
         COALESCE(SUM(unit_price),0),
         COALESCE(SUM(total_price),0),
         COALESCE(SUM(line_pretax_amount),0),
         COALESCE(SUM(line_tax_amount),0),
         COALESCE(SUM(line_gross_amount),0),
         COALESCE(SUM(tax_rate_snapshot),0)
    INTO v_items_count_before, v_sum_qty_before, v_sum_unit_before,
         v_sum_total_before, v_sum_pretax_before, v_sum_tax_before,
         v_sum_gross_before, v_sum_rate_before
  FROM public.invoice_items;

  SELECT count(*),
         COALESCE(SUM(subtotal),0),
         COALESCE(SUM(tax_amount),0),
         COALESCE(SUM(discount_amount),0),
         COALESCE(SUM(total_amount),0)
    INTO v_inv_count_before, v_inv_sub_before, v_inv_tax_before,
         v_inv_disc_before, v_inv_total_before
  FROM public.invoices;

  SELECT count(*), COALESCE(SUM(amount),0)
    INTO v_bl_count_before, v_bl_sum_before
  FROM public.billing_links;

  -- Perform the exact one-row repair (skip if already final)
  IF v_already_final THEN
    v_updated := 0;
  ELSE
    UPDATE public.invoice_items
       SET period_start = NULL,
           period_end   = NULL,
           description  = v_new_desc
     WHERE id           = v_item_id
       AND invoice_id   = v_invoice_id
       AND period_start = DATE '2026-05-14'
       AND period_end   = DATE '2026-05-13'
       AND description  = v_old_desc;
    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated <> 1 THEN
      RAISE EXCEPTION 'J4.2 ABORT: expected exactly 1 row updated, got %', v_updated;
    END IF;
  END IF;

  -- Reread post-update row
  SELECT * INTO r_item FROM public.invoice_items WHERE id = v_item_id;

  -- Post-update assertions on the target row
  IF NOT (
       r_item.period_start IS NULL
   AND r_item.period_end   IS NULL
   AND r_item.description  = v_new_desc
  ) THEN
    RAISE EXCEPTION
      'J4.2 ABORT (post-state mismatch): period_start=%, period_end=%, description=%',
      r_item.period_start, r_item.period_end, r_item.description;
  END IF;

  -- Description sanitation checks
  IF position('14-05-2026' in r_item.description) <> 0
     OR position('13-05-2026' in r_item.description) <> 0
     OR position('1d × 0'    in r_item.description) <> 0 THEN
    RAISE EXCEPTION 'J4.2 ABORT: description still contains forbidden legacy fragment';
  END IF;

  -- Financial freeze on target row post-update
  IF NOT (
       r_item.quantity           = 1.00
   AND r_item.unit_price         = 2032.26
   AND r_item.total_price        = 2032.26
   AND r_item.line_pretax_amount = 2032.26
   AND r_item.line_tax_amount    = 0.00
   AND r_item.line_gross_amount  = 2032.26
   AND r_item.taxable_snapshot   = false
   AND r_item.tax_rate_snapshot  = 15.000
  ) THEN
    RAISE EXCEPTION 'J4.2 ABORT (post-financial mismatch on target row)';
  END IF;

  IF r_item.line_pretax_amount + r_item.line_tax_amount <> r_item.line_gross_amount THEN
    RAISE EXCEPTION 'J4.2 ABORT (pretax + tax <> gross on target row)';
  END IF;

  -- Reread invoice header
  SELECT * INTO r_inv FROM public.invoices WHERE id = v_invoice_id;
  IF NOT (
       r_inv.subtotal        = 2032.26
   AND r_inv.tax_amount      = 0.00
   AND r_inv.discount_amount = 0.00
   AND r_inv.total_amount    = 2032.26
  ) THEN
    RAISE EXCEPTION 'J4.2 ABORT: invoice header changed';
  END IF;

  -- Capture AFTER checksums and compare
  SELECT count(*),
         COALESCE(SUM(quantity),0),
         COALESCE(SUM(unit_price),0),
         COALESCE(SUM(total_price),0),
         COALESCE(SUM(line_pretax_amount),0),
         COALESCE(SUM(line_tax_amount),0),
         COALESCE(SUM(line_gross_amount),0),
         COALESCE(SUM(tax_rate_snapshot),0)
    INTO v_items_count_after, v_sum_qty_after, v_sum_unit_after,
         v_sum_total_after, v_sum_pretax_after, v_sum_tax_after,
         v_sum_gross_after, v_sum_rate_after
  FROM public.invoice_items;

  IF v_items_count_after <> v_items_count_before
     OR v_sum_qty_after    <> v_sum_qty_before
     OR v_sum_unit_after   <> v_sum_unit_before
     OR v_sum_total_after  <> v_sum_total_before
     OR v_sum_pretax_after <> v_sum_pretax_before
     OR v_sum_tax_after    <> v_sum_tax_before
     OR v_sum_gross_after  <> v_sum_gross_before
     OR v_sum_rate_after   <> v_sum_rate_before THEN
    RAISE EXCEPTION 'J4.2 ABORT: invoice_items checksum drift detected';
  END IF;

  SELECT count(*),
         COALESCE(SUM(subtotal),0),
         COALESCE(SUM(tax_amount),0),
         COALESCE(SUM(discount_amount),0),
         COALESCE(SUM(total_amount),0)
    INTO v_inv_count_after, v_inv_sub_after, v_inv_tax_after,
         v_inv_disc_after, v_inv_total_after
  FROM public.invoices;

  IF v_inv_count_after <> v_inv_count_before
     OR v_inv_sub_after   <> v_inv_sub_before
     OR v_inv_tax_after   <> v_inv_tax_before
     OR v_inv_disc_after  <> v_inv_disc_before
     OR v_inv_total_after <> v_inv_total_before THEN
    RAISE EXCEPTION 'J4.2 ABORT: invoices header checksum drift detected';
  END IF;

  SELECT count(*), COALESCE(SUM(amount),0)
    INTO v_bl_count_after, v_bl_sum_after
  FROM public.billing_links;
  IF v_bl_count_after <> v_bl_count_before
     OR v_bl_sum_after <> v_bl_sum_before THEN
    RAISE EXCEPTION 'J4.2 ABORT: billing_links checksum drift detected';
  END IF;

  -- Post-repair global period-violation gate
  SELECT count(*) INTO v_period_violations_after
  FROM public.invoice_items
  WHERE NOT (
    (period_start IS NULL AND period_end IS NULL)
    OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
  );
  IF v_period_violations_after <> 0 THEN
    RAISE EXCEPTION
      'J4.2 ABORT: legacy period violations remain after repair (count=%)',
      v_period_violations_after;
  END IF;

  RAISE NOTICE
    'J4.2 OK: updated_rows=% already_final=% violations_before=% violations_after=%',
    v_updated, v_already_final, v_period_violations_before, v_period_violations_after;
END
$j42$;