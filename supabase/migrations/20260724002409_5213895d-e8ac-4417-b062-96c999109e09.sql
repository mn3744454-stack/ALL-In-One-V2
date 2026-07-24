DO $mig$
DECLARE
  before_inv_count int; before_sub numeric; before_tax numeric; before_disc numeric; before_tot numeric;
  before_item_count int; before_qty numeric; before_up numeric; before_tp numeric;
  before_ledger_count int; before_ledger_sum numeric;
  before_bl_count int; before_bl_sum numeric;
  after_inv_count int; after_sub numeric; after_tax numeric; after_disc numeric; after_tot numeric;
  after_item_count int; after_qty numeric; after_up numeric; after_tp numeric;
  after_ledger_count int; after_ledger_sum numeric;
  after_bl_count int; after_bl_sum numeric;
  v_bad int;
  v_snapshot_diff int;
  v_mode_diff int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('j4_demo_tax_backfill'));

  PERFORM 1 FROM public.invoices ORDER BY id FOR UPDATE;

  SELECT count(*), COALESCE(SUM(subtotal),0), COALESCE(SUM(tax_amount),0),
         COALESCE(SUM(discount_amount),0), COALESCE(SUM(total_amount),0)
    INTO before_inv_count, before_sub, before_tax, before_disc, before_tot
    FROM public.invoices;
  SELECT count(*), COALESCE(SUM(quantity),0), COALESCE(SUM(unit_price),0), COALESCE(SUM(total_price),0)
    INTO before_item_count, before_qty, before_up, before_tp
    FROM public.invoice_items;
  SELECT count(*), COALESCE(SUM(amount),0)
    INTO before_ledger_count, before_ledger_sum FROM public.ledger_entries;
  SELECT count(*), COALESCE(SUM(amount),0)
    INTO before_bl_count, before_bl_sum FROM public.billing_links;

  CREATE TEMP TABLE _j4_items ON COMMIT DROP AS
  SELECT
    ii.id AS item_id, ii.invoice_id, ii.position, ii.created_at, ii.total_price,
    i.subtotal AS inv_subtotal, i.tax_amount AS inv_tax,
    t.default_tax_rate::numeric AS tenant_rate,
    CASE
      WHEN ii.package_id IS NOT NULL THEN 'package'
      WHEN ii.service_id IS NOT NULL AND ii.service_source = 'tenant_services' THEN 'tenant_service'
      WHEN ii.service_id IS NOT NULL AND ii.service_source = 'lab_services'    THEN 'lab_service'
      ELSE 'manual'
    END AS src_class,
    CASE
      WHEN ii.package_id IS NOT NULL
        THEN COALESCE((SELECT p.is_taxable FROM public.stable_service_plans p WHERE p.id = ii.package_id), true)
      WHEN ii.service_id IS NOT NULL AND ii.service_source = 'tenant_services'
        THEN COALESCE((SELECT ts.is_taxable FROM public.tenant_services ts WHERE ts.id = ii.service_id), true)
      WHEN ii.service_id IS NOT NULL AND ii.service_source = 'lab_services'
        THEN COALESCE((SELECT ls.is_taxable FROM public.lab_services ls WHERE ls.id = ii.service_id), true)
      ELSE true
    END AS src_taxable,
    NULL::numeric AS pretax, NULL::numeric AS tax, NULL::boolean AS taxable_snap
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii.invoice_id
  JOIN public.tenants  t ON t.id = i.tenant_id
  WHERE ii.line_pretax_amount IS NULL AND ii.line_tax_amount IS NULL
    AND ii.line_gross_amount IS NULL AND ii.taxable_snapshot IS NULL
    AND ii.tax_rate_snapshot IS NULL;

  WITH inv_sums AS ( SELECT invoice_id, SUM(total_price) sm, MAX(inv_subtotal) sub FROM _j4_items GROUP BY invoice_id )
  UPDATE _j4_items x SET pretax = x.total_price FROM inv_sums s
   WHERE s.invoice_id = x.invoice_id AND s.sm = s.sub;

  WITH inv_sums AS ( SELECT invoice_id, SUM(total_price) sm, MAX(inv_subtotal) sub FROM _j4_items GROUP BY invoice_id ),
  targets AS ( SELECT invoice_id, sub FROM inv_sums WHERE sm <> sub ),
  positive AS (
    SELECT x.item_id, x.invoice_id, x.position, x.created_at,
           (x.total_price*100)::bigint AS w_cents, (t.sub*100)::bigint AS sub_cents,
           SUM((x.total_price*100)::bigint) OVER (PARTITION BY x.invoice_id) AS total_w
      FROM _j4_items x JOIN targets t USING (invoice_id) WHERE x.total_price > 0
  ),
  floors AS (
    SELECT item_id, invoice_id, position, created_at,
           (sub_cents*w_cents)/total_w AS floor_c,
           (sub_cents*w_cents) - ((sub_cents*w_cents)/total_w)*total_w AS remainder, sub_cents
      FROM positive
  ),
  totals AS ( SELECT invoice_id, SUM(floor_c) sf, MAX(sub_cents) sc FROM floors GROUP BY invoice_id ),
  ranked AS ( SELECT f.*, ROW_NUMBER() OVER (PARTITION BY f.invoice_id ORDER BY f.remainder DESC, f.position ASC, f.created_at ASC, f.item_id ASC) rn FROM floors f ),
  final AS ( SELECT r.item_id, r.floor_c + CASE WHEN r.rn <= (t.sc - t.sf) THEN 1 ELSE 0 END alloc_c FROM ranked r JOIN totals t USING (invoice_id) )
  UPDATE _j4_items x SET pretax = (f.alloc_c::numeric/100.0) FROM final f WHERE f.item_id = x.item_id;

  UPDATE _j4_items SET pretax = 0 WHERE pretax IS NULL;

  SELECT COUNT(*) INTO v_bad FROM (
    SELECT invoice_id FROM _j4_items GROUP BY invoice_id
     HAVING ROUND(SUM(pretax),2) <> ROUND(MAX(inv_subtotal),2)
  ) z;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 pretax allocation failed for % invoices', v_bad; END IF;

  UPDATE _j4_items SET tax = 0, taxable_snap = src_taxable WHERE inv_tax = 0 AND tenant_rate = 0;
  UPDATE _j4_items SET tax = 0, taxable_snap = false        WHERE inv_tax = 0 AND tenant_rate > 0;

  WITH taxed AS ( SELECT DISTINCT invoice_id, inv_tax FROM _j4_items WHERE inv_tax > 0 ),
  eligible_counts AS (
    SELECT t.invoice_id, t.inv_tax,
           COUNT(*) FILTER (WHERE x.src_taxable AND x.pretax > 0) AS elig_n
      FROM taxed t JOIN _j4_items x USING (invoice_id) GROUP BY t.invoice_id, t.inv_tax
  ),
  participants AS (
    SELECT x.item_id, x.invoice_id, x.position, x.created_at, x.pretax, ec.inv_tax
      FROM _j4_items x JOIN eligible_counts ec USING (invoice_id)
     WHERE x.pretax > 0 AND ( (ec.elig_n > 0 AND x.src_taxable) OR (ec.elig_n = 0) )
  ),
  pp AS (
    SELECT p.*, (p.pretax*100)::bigint AS w_cents, (p.inv_tax*100)::bigint AS tax_cents,
           SUM((p.pretax*100)::bigint) OVER (PARTITION BY p.invoice_id) AS total_w FROM participants p
  ),
  floors AS (
    SELECT item_id, invoice_id, position, created_at,
           (tax_cents*w_cents)/total_w AS floor_c,
           (tax_cents*w_cents) - ((tax_cents*w_cents)/total_w)*total_w AS remainder, tax_cents FROM pp
  ),
  totals AS ( SELECT invoice_id, SUM(floor_c) sf, MAX(tax_cents) sc FROM floors GROUP BY invoice_id ),
  ranked AS ( SELECT f.*, ROW_NUMBER() OVER (PARTITION BY f.invoice_id ORDER BY f.remainder DESC, f.position ASC, f.created_at ASC, f.item_id ASC) rn FROM floors f ),
  final AS ( SELECT r.item_id, r.floor_c + CASE WHEN r.rn <= (t.sc - t.sf) THEN 1 ELSE 0 END alloc_c FROM ranked r JOIN totals t USING (invoice_id) )
  UPDATE _j4_items x SET tax = (f.alloc_c::numeric/100.0), taxable_snap = true
    FROM final f WHERE f.item_id = x.item_id;

  UPDATE _j4_items SET tax = 0, taxable_snap = false WHERE inv_tax > 0 AND tax IS NULL;

  SELECT COUNT(*) INTO v_bad FROM _j4_items WHERE pretax IS NULL OR tax IS NULL OR taxable_snap IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % items unclassified', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM (
    SELECT invoice_id FROM _j4_items GROUP BY invoice_id
     HAVING ROUND(SUM(tax),2) <> ROUND(MAX(inv_tax),2)
  ) z;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 tax allocation failed for % invoices', v_bad; END IF;

  -- Suspend source-validation trigger for snapshot-only writes
  EXECUTE 'ALTER TABLE public.invoice_items DISABLE TRIGGER trg_invoice_items_validate_source';
  -- Temporarily drop the NOT VALID period check to allow snapshot UPDATEs on pre-existing legacy rows.
  -- Re-added below with identical definition; final schema state is unchanged.
  EXECUTE 'ALTER TABLE public.invoice_items DROP CONSTRAINT invoice_items_period_valid_ck';

  BEGIN
    UPDATE public.invoice_items ii
       SET line_pretax_amount = x.pretax,
           line_tax_amount    = x.tax,
           line_gross_amount  = ROUND(x.pretax + x.tax, 2),
           taxable_snapshot   = x.taxable_snap,
           tax_rate_snapshot  = x.tenant_rate
      FROM _j4_items x
     WHERE ii.id = x.item_id
       AND ii.line_pretax_amount IS NULL
       AND ii.line_tax_amount    IS NULL
       AND ii.line_gross_amount  IS NULL
       AND ii.taxable_snapshot   IS NULL
       AND ii.tax_rate_snapshot  IS NULL;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_period_valid_ck CHECK ((((period_start IS NULL) AND (period_end IS NULL)) OR ((period_start IS NOT NULL) AND (period_end IS NOT NULL) AND (period_end >= period_start)))) NOT VALID';
    EXECUTE 'ALTER TABLE public.invoice_items ENABLE TRIGGER trg_invoice_items_validate_source';
    RAISE;
  END;

  EXECUTE 'ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_period_valid_ck CHECK ((((period_start IS NULL) AND (period_end IS NULL)) OR ((period_start IS NOT NULL) AND (period_end IS NOT NULL) AND (period_end >= period_start)))) NOT VALID';
  EXECUTE 'ALTER TABLE public.invoice_items ENABLE TRIGGER trg_invoice_items_validate_source';

  UPDATE public.invoices SET prices_include_tax = false WHERE prices_include_tax IS NULL;

  SELECT COUNT(*) INTO v_bad FROM public.invoice_items
    WHERE line_pretax_amount IS NULL OR line_tax_amount IS NULL
       OR line_gross_amount  IS NULL OR taxable_snapshot IS NULL
       OR tax_rate_snapshot  IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % item snapshots remain null', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM public.invoices WHERE prices_include_tax IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % invoice modes remain null', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM public.invoice_items
    WHERE line_pretax_amount < 0 OR line_tax_amount < 0 OR line_gross_amount < 0
       OR tax_rate_snapshot < 0 OR tax_rate_snapshot > 100;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % items violate range bounds', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM public.invoice_items
    WHERE ROUND(line_pretax_amount + line_tax_amount, 2) <> ROUND(line_gross_amount, 2);
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % items fail per-line identity', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM (
    SELECT i.id FROM public.invoices i JOIN public.invoice_items ii ON ii.invoice_id = i.id
     GROUP BY i.id, i.subtotal, i.tax_amount, i.discount_amount, i.total_amount
     HAVING ROUND(SUM(ii.line_pretax_amount),2) <> ROUND(i.subtotal,2)
         OR ROUND(SUM(ii.line_tax_amount),2)    <> ROUND(i.tax_amount,2)
         OR ROUND(SUM(ii.line_gross_amount) - i.discount_amount,2) <> ROUND(i.total_amount,2)
  ) z;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % invoices fail final reconciliation', v_bad; END IF;

  SELECT COUNT(*) INTO v_bad FROM public.invoice_items WHERE taxable_snapshot = false AND line_tax_amount <> 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'J4 % non-taxable rows carry tax', v_bad; END IF;

  SELECT count(*), COALESCE(SUM(subtotal),0), COALESCE(SUM(tax_amount),0),
         COALESCE(SUM(discount_amount),0), COALESCE(SUM(total_amount),0)
    INTO after_inv_count, after_sub, after_tax, after_disc, after_tot FROM public.invoices;
  SELECT count(*), COALESCE(SUM(quantity),0), COALESCE(SUM(unit_price),0), COALESCE(SUM(total_price),0)
    INTO after_item_count, after_qty, after_up, after_tp FROM public.invoice_items;
  SELECT count(*), COALESCE(SUM(amount),0) INTO after_ledger_count, after_ledger_sum FROM public.ledger_entries;
  SELECT count(*), COALESCE(SUM(amount),0) INTO after_bl_count, after_bl_sum FROM public.billing_links;

  IF (before_inv_count, before_sub, before_tax, before_disc, before_tot)
     IS DISTINCT FROM (after_inv_count, after_sub, after_tax, after_disc, after_tot) THEN
    RAISE EXCEPTION 'J4 invoice header preservation failed';
  END IF;
  IF (before_item_count, before_qty, before_up, before_tp)
     IS DISTINCT FROM (after_item_count, after_qty, after_up, after_tp) THEN
    RAISE EXCEPTION 'J4 invoice item commercial preservation failed';
  END IF;
  IF (before_ledger_count, before_ledger_sum) IS DISTINCT FROM (after_ledger_count, after_ledger_sum) THEN
    RAISE EXCEPTION 'J4 ledger preservation failed';
  END IF;
  IF (before_bl_count, before_bl_sum) IS DISTINCT FROM (after_bl_count, after_bl_sum) THEN
    RAISE EXCEPTION 'J4 billing_links preservation failed';
  END IF;

  SELECT COUNT(*) INTO v_snapshot_diff
    FROM _j4_items x JOIN public.invoice_items ii ON ii.id = x.item_id
   WHERE ii.line_pretax_amount IS DISTINCT FROM x.pretax
      OR ii.line_tax_amount    IS DISTINCT FROM x.tax
      OR ii.line_gross_amount  IS DISTINCT FROM ROUND(x.pretax + x.tax, 2)
      OR ii.taxable_snapshot   IS DISTINCT FROM x.taxable_snap
      OR ii.tax_rate_snapshot  IS DISTINCT FROM x.tenant_rate;
  IF v_snapshot_diff > 0 THEN RAISE EXCEPTION 'J4 idempotency snapshot dry-run reported % diffs', v_snapshot_diff; END IF;

  SELECT COUNT(*) INTO v_mode_diff FROM public.invoices WHERE prices_include_tax IS NULL;
  IF v_mode_diff > 0 THEN RAISE EXCEPTION 'J4 idempotency mode dry-run reported % nulls', v_mode_diff; END IF;

  RAISE NOTICE 'J4 backfill complete: invoices=% items=%', after_inv_count, after_item_count;
END $mig$;