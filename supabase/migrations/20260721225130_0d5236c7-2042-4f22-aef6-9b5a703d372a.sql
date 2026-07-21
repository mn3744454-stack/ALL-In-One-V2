
-- =====================================================================
-- AML.1.b.1 · Stage 6 · N+2 prerequisite helpers
-- §10.2 _finance_billing_link_upsert
-- §10.3 _finance_expense_create_sourced (per §6.5)
-- Both SECURITY DEFINER, owner-only, search_path=''.
-- =====================================================================

-- ---------------------------------------------------------------------
-- §10.2 _finance_billing_link_upsert
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_billing_link_upsert(
  p_tenant_id            uuid,
  p_source_type          text,
  p_source_id            uuid,
  p_invoice_id           uuid,
  p_link_kind            text,
  p_amount               numeric,
  p_created_by           uuid,
  p_corrects_invoice_id  uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_existing_id       uuid;
  v_conflict_id       uuid;
  v_new_id            uuid;
  v_corrects_on_row   uuid;
  v_corrected_status  text;
  v_corrected_linked  boolean;
BEGIN
  -- Argument sanity (caller must hold the advisory lock — cannot verify here
  -- reliably; contract per §10.2 step 1 is caller responsibility).
  IF p_tenant_id IS NULL
     OR p_source_type IS NULL
     OR p_source_id IS NULL
     OR p_invoice_id IS NULL
     OR p_link_kind IS NULL
     OR p_amount IS NULL
     OR p_created_by IS NULL THEN
    RAISE EXCEPTION 'FIN_BILLING_LINK_INVALID_ARGUMENTS'
      USING ERRCODE = '22023';
  END IF;

  IF p_link_kind NOT IN ('deposit','final','refund','credit_note') THEN
    RAISE EXCEPTION 'FIN_BILLING_LINK_INVALID_KIND: %', p_link_kind
      USING ERRCODE = '22023';
  END IF;

  -- Step 3: exact replay — identical (invoice_id, link_kind, amount) row.
  SELECT id
    INTO v_existing_id
  FROM public.billing_links
  WHERE tenant_id   = p_tenant_id
    AND source_type = p_source_type
    AND source_id   = p_source_id
    AND invoice_id  = p_invoice_id
    AND link_kind   = p_link_kind
    AND amount IS NOT DISTINCT FROM p_amount
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Step 4: conflicting active 'final' link → referencing a non-cancelled
  -- invoice that is not the caller's p_invoice_id.
  IF p_link_kind = 'final' THEN
    SELECT bl.id
      INTO v_conflict_id
    FROM public.billing_links bl
    JOIN public.invoices inv ON inv.id = bl.invoice_id
    WHERE bl.tenant_id   = p_tenant_id
      AND bl.source_type = p_source_type
      AND bl.source_id   = p_source_id
      AND bl.link_kind   = 'final'
      AND bl.invoice_id <> p_invoice_id
      AND inv.status <> 'cancelled'
    LIMIT 1;

    IF v_conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'FIN_BILLING_LINK_CONFLICT'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Step 5: corrective rebill guardrails.
  IF p_corrects_invoice_id IS NOT NULL THEN
    SELECT corrects_invoice_id
      INTO v_corrects_on_row
    FROM public.invoices
    WHERE id = p_invoice_id
      AND tenant_id = p_tenant_id;

    IF v_corrects_on_row IS DISTINCT FROM p_corrects_invoice_id THEN
      RAISE EXCEPTION 'FIN_BILLING_LINK_CORRECTS_MISMATCH'
        USING ERRCODE = '23514';
    END IF;

    SELECT status
      INTO v_corrected_status
    FROM public.invoices
    WHERE id = p_corrects_invoice_id
      AND tenant_id = p_tenant_id;

    IF v_corrected_status IS DISTINCT FROM 'cancelled' THEN
      RAISE EXCEPTION 'FIN_BILLING_LINK_CORRECTED_NOT_CANCELLED'
        USING ERRCODE = '23514';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.billing_links
      WHERE tenant_id   = p_tenant_id
        AND source_type = p_source_type
        AND source_id   = p_source_id
        AND invoice_id  = p_corrects_invoice_id
    ) INTO v_corrected_linked;

    IF NOT v_corrected_linked THEN
      RAISE EXCEPTION 'FIN_BILLING_LINK_CORRECTED_NOT_IN_SET'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Step 6: insert new link.
  INSERT INTO public.billing_links (
    tenant_id, source_type, source_id, invoice_id,
    link_kind, amount, created_by
  ) VALUES (
    p_tenant_id, p_source_type, p_source_id, p_invoice_id,
    p_link_kind, p_amount, p_created_by
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$fn$;

ALTER FUNCTION public._finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid) FROM anon, authenticated, service_role;

COMMENT ON FUNCTION public._finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid)
IS 'AML.1.b.1 §10.2 — Private billing_links upsert. Caller must hold _finance_source_lock_key advisory xact lock. Replay-safe, non-updating. Owner-only EXECUTE.';


-- ---------------------------------------------------------------------
-- §10.3 / §6.5 _finance_expense_create_sourced (private HR path)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._finance_expense_create_sourced(
  p_tenant_id                 uuid,
  p_actor_id                  uuid,
  p_payload                   jsonb,
  p_source_type_trusted       text,
  p_source_reference_trusted  uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_expense_id   uuid;
  v_category     text;
  v_amount       numeric;
  v_currency     text;
  v_expense_date date;
  v_description  text;
BEGIN
  IF p_tenant_id IS NULL
     OR p_actor_id IS NULL
     OR p_payload  IS NULL
     OR p_source_type_trusted IS NULL
     OR p_source_reference_trusted IS NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_INVALID_ARGUMENTS'
      USING ERRCODE = '22023';
  END IF;

  -- Enum guard (extensible in future migrations, never widened by callers).
  IF p_source_type_trusted NOT IN ('hr_salary_payment') THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_UNTRUSTED_SOURCE: %', p_source_type_trusted
      USING ERRCODE = '22023';
  END IF;

  v_category     := NULLIF(p_payload->>'category', '');
  v_amount       := NULLIF(p_payload->>'amount', '')::numeric;
  v_currency     := NULLIF(p_payload->>'currency', '');
  v_expense_date := NULLIF(p_payload->>'expense_date', '')::date;
  v_description  := NULLIF(p_payload->>'description', '');

  IF v_category IS NULL OR v_amount IS NULL OR v_currency IS NULL OR v_expense_date IS NULL THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_PAYLOAD_INCOMPLETE'
      USING ERRCODE = '22023';
  END IF;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'FIN_EXPENSE_SOURCED_NON_POSITIVE_AMOUNT'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.expenses (
    tenant_id,
    category,
    amount,
    currency,
    expense_date,
    description,
    source_type,
    source_reference,
    created_by
  ) VALUES (
    p_tenant_id,
    v_category,
    v_amount,
    v_currency,
    v_expense_date,
    v_description,
    p_source_type_trusted,
    p_source_reference_trusted::text,
    p_actor_id
  )
  RETURNING id INTO v_expense_id;

  RETURN v_expense_id;
END;
$fn$;

ALTER FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) FROM anon, authenticated, service_role;

COMMENT ON FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)
IS 'AML.1.b.1 §10.3 / §6.5 — Private HR-only expense creator. Trusted source_type restricted to hr_salary_payment. Public payloads cannot reach this function. Owner-only EXECUTE.';
