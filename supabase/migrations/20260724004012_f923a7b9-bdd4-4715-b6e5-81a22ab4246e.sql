-- J4.1 HISTORICAL TAX-RATE SNAPSHOT REPAIR
-- DEMO HISTORICAL TAX-RATE SNAPSHOT REPAIR — EFFECTIVE RATE DERIVED FROM FROZEN STORED TAX TRUTH
-- NOT CURRENT TENANT CONFIGURATION — NOT HISTORICAL SOURCE EVIDENCE — DO NOT REUSE ON PRODUCTION
DO $$
DECLARE
  v_invoice_id CONSTANT uuid := 'b8920a4a-4ba6-4ea5-ab9b-0d1b0aea99f8';
  v_item_id    CONSTANT uuid := 'f0648835-0b14-4791-b381-b17be193519b';
  v_pretax numeric; v_tax numeric; v_gross numeric;
  v_taxable boolean; v_rate numeric;
  v_hdr_subtotal numeric; v_hdr_tax numeric; v_hdr_discount numeric; v_hdr_total numeric;
  v_updated int;
  v_global_bad int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('j4_1_tax_rate_snapshot_repair'));

  -- Lock invoice + item
  PERFORM 1 FROM public.invoices WHERE id = v_invoice_id FOR UPDATE;
  SELECT line_pretax_amount, line_tax_amount, line_gross_amount, taxable_snapshot, tax_rate_snapshot
    INTO v_pretax, v_tax, v_gross, v_taxable, v_rate
    FROM public.invoice_items
   WHERE id = v_item_id AND invoice_id = v_invoice_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'J4.1 abort: target invoice_item not found';
  END IF;

  SELECT subtotal, tax_amount, discount_amount, total_amount
    INTO v_hdr_subtotal, v_hdr_tax, v_hdr_discount, v_hdr_total
    FROM public.invoices WHERE id = v_invoice_id;

  -- Idempotency: already-correct final state
  IF v_rate = 15.000 AND v_pretax = 30.00 AND v_tax = 4.50 AND v_gross = 34.50 AND v_taxable = true THEN
    RAISE NOTICE 'J4.1 idempotent no-op: target already at 15.000';
    RETURN;
  END IF;

  -- Preflight assertions
  IF NOT (v_pretax = 30.00 AND v_tax = 4.50 AND v_gross = 34.50 AND v_taxable = true AND v_rate = 0.000) THEN
    RAISE EXCEPTION 'J4.1 abort: preflight mismatch (pretax=%, tax=%, gross=%, taxable=%, rate=%)',
      v_pretax, v_tax, v_gross, v_taxable, v_rate;
  END IF;

  IF v_pretax + v_tax <> v_gross THEN
    RAISE EXCEPTION 'J4.1 abort: Pretax + Tax <> Gross';
  END IF;

  IF round((v_tax / v_pretax) * 100, 3) <> 15.000 THEN
    RAISE EXCEPTION 'J4.1 abort: derived effective rate <> 15.000';
  END IF;

  -- Global census: only exactly one positive-Tax zero-rate line permitted, and it must be the target
  SELECT COUNT(*) INTO v_global_bad
    FROM public.invoice_items
   WHERE line_tax_amount > 0 AND tax_rate_snapshot = 0 AND taxable_snapshot = true
     AND id <> v_item_id;
  IF v_global_bad <> 0 THEN
    RAISE EXCEPTION 'J4.1 abort: additional zero-rate positive-Tax rows detected (count=%)', v_global_bad;
  END IF;

  -- Authorized single-row write, strictly predicated on the incorrect prior state
  UPDATE public.invoice_items
     SET tax_rate_snapshot = 15.000
   WHERE id = v_item_id
     AND invoice_id = v_invoice_id
     AND line_pretax_amount = 30.00
     AND line_tax_amount = 4.50
     AND line_gross_amount = 34.50
     AND taxable_snapshot = true
     AND tax_rate_snapshot = 0.000;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'J4.1 abort: expected exactly 1 row updated, got %', v_updated;
  END IF;

  -- Post-write assertions on target line
  SELECT line_pretax_amount, line_tax_amount, line_gross_amount, taxable_snapshot, tax_rate_snapshot
    INTO v_pretax, v_tax, v_gross, v_taxable, v_rate
    FROM public.invoice_items WHERE id = v_item_id;
  IF NOT (v_pretax = 30.00 AND v_tax = 4.50 AND v_gross = 34.50 AND v_taxable = true AND v_rate = 15.000) THEN
    RAISE EXCEPTION 'J4.1 abort: post-write target state mismatch';
  END IF;

  -- Header must be unchanged
  IF NOT (v_hdr_subtotal = 30.00 AND v_hdr_tax = 4.50 AND v_hdr_discount = 0.00 AND v_hdr_total = 34.50) THEN
    RAISE EXCEPTION 'J4.1 abort: header snapshot pre-image mismatch';
  END IF;
  PERFORM 1 FROM public.invoices
    WHERE id = v_invoice_id
      AND subtotal = 30.00 AND tax_amount = 4.50 AND discount_amount = 0.00 AND total_amount = 34.50;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'J4.1 abort: header changed unexpectedly';
  END IF;

  -- Global post-repair gates
  SELECT COUNT(*) INTO v_global_bad
    FROM public.invoice_items
   WHERE line_tax_amount > 0 AND tax_rate_snapshot = 0 AND taxable_snapshot = true;
  IF v_global_bad <> 0 THEN
    RAISE EXCEPTION 'J4.1 abort: post-repair zero-rate positive-Tax rows still present (count=%)', v_global_bad;
  END IF;

  RAISE NOTICE 'J4.1 complete: 1 row corrected (tax_rate_snapshot 0.000 -> 15.000)';
END $$;