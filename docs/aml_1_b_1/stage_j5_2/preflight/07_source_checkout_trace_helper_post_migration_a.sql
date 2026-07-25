CREATE OR REPLACE FUNCTION public._finance_source_checkout_apply_trace(p_tenant_id uuid, p_invoice_id uuid, p_source_type text, p_source_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
     WHERE id = p_invoice_id AND tenant_id = p_tenant_id AND status = 'draft'
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
$function$

