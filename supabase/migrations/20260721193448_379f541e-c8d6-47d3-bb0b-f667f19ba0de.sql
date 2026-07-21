CREATE OR REPLACE FUNCTION public.validate_payment_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_type public.payment_owner_type;
  v_owner_tenant uuid;
BEGIN
  SELECT owner_type, tenant_id
    INTO v_owner_type, v_owner_tenant
    FROM public.payment_accounts
   WHERE id = NEW.payee_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_accounts row not found for payee_account_id=%', NEW.payee_account_id;
  END IF;

  IF NEW.intent_type = 'platform_fee' THEN
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'platform_fee intents must have tenant_id IS NULL';
    END IF;
    IF v_owner_type <> 'platform' THEN
      RAISE EXCEPTION 'platform_fee intents must be paid to a platform account';
    END IF;

  ELSIF NEW.intent_type IN ('service_payment', 'commission') THEN
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION '% intents require tenant_id', NEW.intent_type;
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION '% intents must be paid to the same tenant account', NEW.intent_type;
    END IF;

  ELSIF NEW.intent_type = 'receivable' THEN
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'receivable intents require tenant_id';
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'receivable intents must be paid to the same tenant account';
    END IF;
    IF NEW.reference_type <> 'invoice' THEN
      RAISE EXCEPTION 'receivable intents require reference_type = invoice';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
       WHERE id = NEW.reference_id AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'receivable intents require reference_id to resolve to invoices(id) in same tenant';
    END IF;

  ELSE
    RAISE EXCEPTION 'unknown intent_type=%', NEW.intent_type;
  END IF;

  RETURN NEW;
END
$$;