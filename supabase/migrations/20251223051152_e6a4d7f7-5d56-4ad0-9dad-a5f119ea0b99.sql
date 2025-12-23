-- Step 4A Hardening Migration
-- Fix 1: Update can_manage_tenant_services to use owner/manager instead of admin
CREATE OR REPLACE FUNCTION public.can_manage_tenant_services(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND role IN ('owner', 'manager')
    AND is_active = true
  )
$$;

-- Fix 2: Restrict payment_intents visibility to owner/manager only
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Tenant members can view tenant payment intents" ON public.payment_intents;

-- Create new restricted policy
CREATE POLICY "Tenant managers can view tenant payment intents"
ON public.payment_intents
FOR SELECT
USING (
  tenant_id IS NOT NULL 
  AND can_manage_tenant_services(auth.uid(), tenant_id)
);

-- Update can_view_payment_intent function to match new logic
CREATE OR REPLACE FUNCTION public.can_view_payment_intent(_user_id uuid, _intent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_intents pi
    WHERE pi.id = _intent_id
    AND (
      pi.payer_user_id = _user_id
      OR (pi.tenant_id IS NOT NULL AND can_manage_tenant_services(_user_id, pi.tenant_id))
    )
  )
$$;

-- Fix 3: Data integrity validation trigger for payment_intents
CREATE OR REPLACE FUNCTION public.validate_payment_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_owner_type payment_owner_type;
  account_tenant_id uuid;
BEGIN
  -- Get the payee account info
  SELECT owner_type, tenant_id INTO account_owner_type, account_tenant_id
  FROM public.payment_accounts
  WHERE id = NEW.payee_account_id;
  
  -- Validate based on intent_type
  IF NEW.intent_type = 'platform_fee' THEN
    -- platform_fee: tenant_id must be NULL, payee must be platform account
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'platform_fee intent must have tenant_id = NULL';
    END IF;
    IF account_owner_type != 'platform' THEN
      RAISE EXCEPTION 'platform_fee intent payee must be platform account';
    END IF;
  ELSE
    -- service_payment/commission: tenant_id NOT NULL, payee must belong to same tenant
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'service_payment/commission intent must have tenant_id';
    END IF;
    IF account_owner_type != 'tenant' OR account_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'service_payment/commission payee must belong to the same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_payment_intent_trigger ON public.payment_intents;
CREATE TRIGGER validate_payment_intent_trigger
BEFORE INSERT OR UPDATE ON public.payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_intent();

-- Fix 4: Partial unique constraint for platform payment_account
CREATE UNIQUE INDEX IF NOT EXISTS unique_platform_account 
ON public.payment_accounts (owner_type) 
WHERE owner_type = 'platform';