-- Step 4A: Foundational Payment Architecture

-- Create ENUMs for payment system
CREATE TYPE public.payment_owner_type AS ENUM ('platform', 'tenant');
CREATE TYPE public.payment_intent_type AS ENUM ('platform_fee', 'service_payment', 'commission');
CREATE TYPE public.payment_reference_type AS ENUM ('academy_booking', 'service', 'order', 'auction', 'subscription');
CREATE TYPE public.payment_status AS ENUM ('draft', 'pending', 'paid', 'cancelled');
CREATE TYPE public.payment_split_role AS ENUM ('platform', 'tenant');

-- payment_accounts: Represents who can receive money
CREATE TABLE public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type public.payment_owner_type NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Platform has exactly ONE account, each tenant may have ONE
  CONSTRAINT unique_tenant_account UNIQUE (tenant_id),
  -- Ensure tenant_id is required for tenant accounts, null for platform
  CONSTRAINT valid_owner CHECK (
    (owner_type = 'platform' AND tenant_id IS NULL) OR
    (owner_type = 'tenant' AND tenant_id IS NOT NULL)
  )
);

-- payment_intents: Represents any payable action (future checkout)
CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_account_id UUID NOT NULL REFERENCES public.payment_accounts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  intent_type public.payment_intent_type NOT NULL,
  reference_type public.payment_reference_type NOT NULL,
  reference_id UUID NOT NULL,
  amount_display TEXT, -- e.g. "500 SAR"
  currency TEXT NOT NULL DEFAULT 'SAR',
  status public.payment_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- payment_splits: Represents how one payment is split (for commission flows)
CREATE TABLE public.payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  receiver_account_id UUID NOT NULL REFERENCES public.payment_accounts(id) ON DELETE CASCADE,
  amount_display TEXT,
  role public.payment_split_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_payment_intents_payer ON public.payment_intents(payer_user_id);
CREATE INDEX idx_payment_intents_tenant ON public.payment_intents(tenant_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX idx_payment_intents_reference ON public.payment_intents(reference_type, reference_id);
CREATE INDEX idx_payment_splits_intent ON public.payment_splits(payment_intent_id);

-- Enable RLS
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user can view payment intent
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
      OR is_tenant_member(_user_id, pi.tenant_id)
    )
  )
$$;

-- Helper function: Check if user owns a tenant payment account
CREATE OR REPLACE FUNCTION public.can_view_payment_account(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payment_accounts pa
    WHERE pa.id = _account_id
    AND pa.owner_type = 'tenant'
    AND is_tenant_member(_user_id, pa.tenant_id)
  )
$$;

-- RLS Policies for payment_accounts
-- Tenant members can view their tenant's payment account
CREATE POLICY "Tenant members can view their payment account"
ON public.payment_accounts
FOR SELECT
USING (
  owner_type = 'tenant' 
  AND is_tenant_member(auth.uid(), tenant_id)
);

-- Owners can create payment account for their tenant
CREATE POLICY "Owners can create tenant payment account"
ON public.payment_accounts
FOR INSERT
WITH CHECK (
  owner_type = 'tenant'
  AND has_tenant_role(auth.uid(), tenant_id, 'owner')
);

-- Owners can update their tenant payment account
CREATE POLICY "Owners can update tenant payment account"
ON public.payment_accounts
FOR UPDATE
USING (
  owner_type = 'tenant'
  AND has_tenant_role(auth.uid(), tenant_id, 'owner')
);

-- RLS Policies for payment_intents
-- Users can view their own payment intents (as payer)
CREATE POLICY "Users can view their own payment intents"
ON public.payment_intents
FOR SELECT
USING (payer_user_id = auth.uid());

-- Tenant members can view payment intents for their tenant
CREATE POLICY "Tenant members can view tenant payment intents"
ON public.payment_intents
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Users can create payment intents for themselves
CREATE POLICY "Users can create their own payment intents"
ON public.payment_intents
FOR INSERT
WITH CHECK (payer_user_id = auth.uid());

-- Users can update their own draft/pending payment intents
CREATE POLICY "Users can update their own payment intents"
ON public.payment_intents
FOR UPDATE
USING (
  payer_user_id = auth.uid()
  AND status IN ('draft', 'pending')
);

-- Tenant owners/admins can update payment intents for their tenant
CREATE POLICY "Tenant managers can update tenant payment intents"
ON public.payment_intents
FOR UPDATE
USING (can_manage_tenant_services(auth.uid(), tenant_id));

-- RLS Policies for payment_splits
-- Users can view splits for payment intents they can view
CREATE POLICY "Users can view payment splits"
ON public.payment_splits
FOR SELECT
USING (can_view_payment_intent(auth.uid(), payment_intent_id));

-- System creates splits (no direct user insert needed for now)
-- Tenant managers can insert splits for their payment intents
CREATE POLICY "Tenant managers can create payment splits"
ON public.payment_splits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.payment_intents pi
    WHERE pi.id = payment_intent_id
    AND can_manage_tenant_services(auth.uid(), pi.tenant_id)
  )
);

-- Trigger for updated_at on payment_intents
CREATE TRIGGER update_payment_intents_updated_at
BEFORE UPDATE ON public.payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the platform payment account (only one allowed)
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('platform', NULL, true);