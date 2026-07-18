-- Slice 2 Acceptance Correction 1 — Secure First Financial Activity RPC.
-- Read-only helper returning the earliest ledger_entries.created_at for a
-- (tenant, client) pair, excluding movements that do not represent real,
-- posted financial activity (future-dated rows, draft/cancelled/voided
-- invoice references, and cancellation adjustments).
--
-- Authorization contract:
--   1) authenticated caller;
--   2) active member of p_tenant_id (via is_tenant_member);
--   3) client belongs to p_tenant_id;
--   4) caller holds clients.statement.view (owners bypass via has_permission).

CREATE OR REPLACE FUNCTION public.get_client_first_financial_activity(
  p_tenant_id uuid,
  p_client_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_first timestamptz;
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

  SELECT MIN(le.created_at)
    INTO v_first
  FROM public.ledger_entries le
  WHERE le.tenant_id = p_tenant_id
    AND le.client_id = p_client_id
    AND le.created_at <= now()
    -- Exclude entries that reference an invoice which is currently draft/cancelled.
    -- Adjustments of type invoice_cancellation are always excluded.
    AND NOT (le.entry_type = 'adjustment' AND le.reference_type = 'invoice_cancellation')
    AND NOT EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE le.reference_type = 'invoice'
        AND le.reference_id = i.id
        AND i.status IN ('draft', 'cancelled')
    );

  RETURN v_first;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_first_financial_activity(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_first_financial_activity(uuid, uuid) TO authenticated;