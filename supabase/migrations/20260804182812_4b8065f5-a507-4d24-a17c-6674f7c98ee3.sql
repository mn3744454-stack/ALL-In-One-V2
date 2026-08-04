-- Stage C · Slice A — First financial activity cuts over to economic chronology.
-- Replaces MIN(created_at) with MIN(effective_date) and the timestamp future
-- guard with a date-only guard. Signature, return type, SECURITY DEFINER mode,
-- search_path, permission gate and all unrelated predicates are preserved.
-- No row-writing statement, no index, no RLS and no GRANT change.

CREATE OR REPLACE FUNCTION public.get_client_first_financial_activity(p_tenant_id uuid, p_client_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_first date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL OR p_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.is_tenant_member(v_uid, p_tenant_id) THEN
    RAISE EXCEPTION 'forbidden_not_tenant_member' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_permission(v_uid, p_tenant_id, 'clients.statement.view') THEN
    RAISE EXCEPTION 'forbidden_missing_permission' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id AND c.tenant_id = p_tenant_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Economic chronology: earliest business date, not earliest write timestamp.
  SELECT MIN(le.effective_date)
    INTO v_first
  FROM public.ledger_entries le
  WHERE le.tenant_id = p_tenant_id
    AND le.client_id = p_client_id
    AND le.effective_date IS NOT NULL
    AND le.effective_date <= current_date
    -- Exclude entries that reference an invoice which is currently draft/cancelled.
    -- Adjustments of type invoice_cancellation are always excluded.
    AND NOT (le.entry_type = 'adjustment' AND le.reference_type = 'invoice_cancellation')
    AND NOT EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE le.reference_type = 'invoice'
        AND le.reference_id = i.id
        AND i.status IN ('draft', 'cancelled')
    );

  IF v_first IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return contract preserved (timestamptz). The caller consumes only the
  -- yyyy-MM-dd prefix, so the date is cast at local midnight without shifting.
  RETURN v_first::timestamp AT TIME ZONE current_setting('TimeZone');
END;
$function$;