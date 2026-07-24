-- Phase N+1B J4.0: Demo empty-shell invoice repair
-- DEMO EMPTY-SHELL INVOICE REPAIR — SYNTHETIC LINE CREATED TO RECONCILE STORED
-- DEMO HEADER — NOT HISTORICAL SOURCE TRUTH — DO NOT REUSE ON PRODUCTION
DO $j40$
DECLARE
  v_targets uuid[] := ARRAY[
    '674bfa8a-49ec-4aaa-ac35-1047826b7e22'::uuid,
    '2da1b7a5-8a14-4ed2-8dbf-a49d04dd3ab5'::uuid,
    'bc37440d-d402-4e2b-96cd-67329456d0fd'::uuid,
    '8adb3fb2-5801-4c9f-b2b7-4b5bbbb2a53c'::uuid,
    '7bdaf243-c31a-4ef2-a25e-72ca0af9664e'::uuid
  ];
  v_inv record;
  v_item_id uuid;
  v_pre_items_count bigint;
  v_pre_items_sum numeric;
  v_pre_invoices_subtotal_sum numeric;
  v_pre_invoices_tax_sum numeric;
  v_pre_invoices_total_sum numeric;
  v_pre_invoices_count bigint;
  v_pre_ledger_count bigint;
  v_pre_ledger_sum numeric;
  v_pre_bl_count bigint;
  v_pre_bl_sum numeric;
  v_post_items_count bigint;
  v_post_items_sum numeric;
  v_inserts int := 0;
  v_item_count int;
  v_item_sum numeric;
BEGIN
  -- Snapshot global preservation checksums (before)
  SELECT count(*), coalesce(sum(subtotal),0), coalesce(sum(tax_amount),0), coalesce(sum(total_amount),0)
    INTO v_pre_invoices_count, v_pre_invoices_subtotal_sum, v_pre_invoices_tax_sum, v_pre_invoices_total_sum
    FROM public.invoices;
  SELECT count(*), coalesce(sum(total_price),0) INTO v_pre_items_count, v_pre_items_sum
    FROM public.invoice_items;
  SELECT count(*), coalesce(sum(amount),0) INTO v_pre_ledger_count, v_pre_ledger_sum
    FROM public.ledger_entries;
  SELECT count(*), coalesce(sum(amount),0) INTO v_pre_bl_count, v_pre_bl_sum
    FROM public.billing_links;

  -- Lock target invoices FOR UPDATE and re-verify preflight contract under lock
  FOR v_inv IN
    SELECT id, invoice_number, tenant_id, subtotal, tax_amount, discount_amount, total_amount
      FROM public.invoices
     WHERE id = ANY(v_targets)
     ORDER BY id
     FOR UPDATE
  LOOP
    IF v_inv.subtotal IS NULL OR v_inv.subtotal <= 0 THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % has non-positive subtotal %', v_inv.invoice_number, v_inv.subtotal;
    END IF;
    IF coalesce(v_inv.tax_amount,0) <> 0 THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % has non-zero tax %', v_inv.invoice_number, v_inv.tax_amount;
    END IF;
    IF coalesce(v_inv.discount_amount,0) <> 0 THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % has non-zero discount %', v_inv.invoice_number, v_inv.discount_amount;
    END IF;
    IF coalesce(v_inv.total_amount,0) <> coalesce(v_inv.subtotal,0) THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % total <> subtotal (%, %)',
        v_inv.invoice_number, v_inv.total_amount, v_inv.subtotal;
    END IF;
    SELECT count(*) INTO v_item_count FROM public.invoice_items WHERE invoice_id = v_inv.id;
    IF v_item_count <> 0 THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % already has % items; not an empty shell',
        v_inv.invoice_number, v_item_count;
    END IF;
  END LOOP;

  -- Confirm we locked exactly 5 targets
  IF (SELECT count(*) FROM public.invoices WHERE id = ANY(v_targets)) <> 5 THEN
    RAISE EXCEPTION 'J4.0 ABORT: expected 5 targets, found %',
      (SELECT count(*) FROM public.invoices WHERE id = ANY(v_targets));
  END IF;

  -- Insert one deterministic manual line per target (idempotent via ON CONFLICT DO NOTHING on PK)
  FOR v_inv IN
    SELECT id, invoice_number, tenant_id, subtotal
      FROM public.invoices
     WHERE id = ANY(v_targets)
     ORDER BY id
  LOOP
    -- Deterministic UUID derived from invoice id + fixed J4.0 namespace
    v_item_id := (
      substr(md5('n1b_j40_repair_' || v_inv.id::text), 1, 8)  || '-' ||
      substr(md5('n1b_j40_repair_' || v_inv.id::text), 9, 4)  || '-' ||
      substr(md5('n1b_j40_repair_' || v_inv.id::text),13, 4)  || '-' ||
      substr(md5('n1b_j40_repair_' || v_inv.id::text),17, 4)  || '-' ||
      substr(md5('n1b_j40_repair_' || v_inv.id::text),21,12)
    )::uuid;

    INSERT INTO public.invoice_items (
      id, invoice_id, description, quantity, unit_price, total_price,
      position, service_source
    )
    VALUES (
      v_item_id, v_inv.id, 'مبلغ الفاتورة (Invoice amount)',
      1, v_inv.subtotal, v_inv.subtotal,
      1, 'tenant_services'
    )
    ON CONFLICT (id) DO NOTHING;

    IF FOUND THEN
      v_inserts := v_inserts + 1;
    END IF;
  END LOOP;

  -- Assert exactly five inserts
  IF v_inserts <> 5 THEN
    RAISE EXCEPTION 'J4.0 ABORT: expected 5 inserts, actually inserted %', v_inserts;
  END IF;

  -- Per-invoice reconciliation assertions
  FOR v_inv IN
    SELECT id, invoice_number, subtotal FROM public.invoices WHERE id = ANY(v_targets)
  LOOP
    SELECT count(*), coalesce(sum(total_price),0), coalesce(sum(unit_price*quantity),0)
      INTO v_item_count, v_item_sum, v_post_items_sum
      FROM public.invoice_items WHERE invoice_id = v_inv.id;
    IF v_item_count <> 1 THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % post-count % <> 1', v_inv.invoice_number, v_item_count;
    END IF;
    IF v_item_sum <> v_inv.subtotal THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % SUM(total_price) % <> subtotal %',
        v_inv.invoice_number, v_item_sum, v_inv.subtotal;
    END IF;
    IF v_post_items_sum <> v_inv.subtotal THEN
      RAISE EXCEPTION 'J4.0 ABORT: invoice % SUM(unit*qty) % <> subtotal %',
        v_inv.invoice_number, v_post_items_sum, v_inv.subtotal;
    END IF;
  END LOOP;

  -- Assert identity of the inserted lines
  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE invoice_id = ANY(v_targets)
       AND (service_id IS NOT NULL
         OR package_id IS NOT NULL
         OR horse_id IS NOT NULL
         OR lab_horse_id IS NOT NULL
         OR quantity <> 1
         OR description <> 'مبلغ الفاتورة (Invoice amount)')
  ) THEN
    RAISE EXCEPTION 'J4.0 ABORT: repair item identity contract violated';
  END IF;

  -- Assert J4 tax snapshot fields remain NULL (J4 responsibility)
  IF EXISTS (
    SELECT 1 FROM public.invoice_items
     WHERE invoice_id = ANY(v_targets)
       AND (line_pretax_amount IS NOT NULL
         OR line_tax_amount IS NOT NULL
         OR line_gross_amount IS NOT NULL
         OR taxable_snapshot IS NOT NULL
         OR tax_rate_snapshot IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'J4.0 ABORT: tax snapshot fields were populated by a trigger; J4 must own snapshot backfill';
  END IF;

  -- Preservation gates: headers, ledger, billing_links, invoice_items existing rows
  IF (SELECT count(*) FROM public.invoices) <> v_pre_invoices_count THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoices row count changed';
  END IF;
  IF (SELECT coalesce(sum(subtotal),0) FROM public.invoices) <> v_pre_invoices_subtotal_sum THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoices subtotal sum changed';
  END IF;
  IF (SELECT coalesce(sum(tax_amount),0) FROM public.invoices) <> v_pre_invoices_tax_sum THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoices tax sum changed';
  END IF;
  IF (SELECT coalesce(sum(total_amount),0) FROM public.invoices) <> v_pre_invoices_total_sum THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoices total sum changed';
  END IF;
  IF (SELECT count(*) FROM public.invoice_items) <> v_pre_items_count + 5 THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoice_items count delta <> 5 (before=%, after=%)',
      v_pre_items_count, (SELECT count(*) FROM public.invoice_items);
  END IF;
  IF (SELECT coalesce(sum(total_price),0) FROM public.invoice_items) <> v_pre_items_sum + 61650 THEN
    RAISE EXCEPTION 'J4.0 ABORT: invoice_items total_price delta <> 61650 (delta=%)',
      (SELECT coalesce(sum(total_price),0) FROM public.invoice_items) - v_pre_items_sum;
  END IF;
  IF (SELECT count(*) FROM public.ledger_entries) <> v_pre_ledger_count
     OR (SELECT coalesce(sum(amount),0) FROM public.ledger_entries) <> v_pre_ledger_sum THEN
    RAISE EXCEPTION 'J4.0 ABORT: ledger changed';
  END IF;
  IF (SELECT count(*) FROM public.billing_links) <> v_pre_bl_count
     OR (SELECT coalesce(sum(amount),0) FROM public.billing_links) <> v_pre_bl_sum THEN
    RAISE EXCEPTION 'J4.0 ABORT: billing_links changed';
  END IF;

  RAISE NOTICE 'J4.0 SUCCESS: inserted 5 repair items; preservation and reconciliation gates passed';
END
$j40$;