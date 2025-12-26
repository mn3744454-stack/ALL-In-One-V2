-- Create service_providers table for external service providers
CREATE TABLE public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  type TEXT NOT NULL CHECK (type IN ('veterinary', 'laboratory', 'transportation', 'boarding', 'breeding')),
  description TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  website TEXT,
  emergency_phone TEXT,
  is_emergency_provider BOOLEAN NOT NULL DEFAULT false,
  services TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'preferred', 'blacklisted')),
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  estimated_response_time TEXT,
  average_cost NUMERIC,
  certifications TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  business_hours JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clients table for client/customer management
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'organization', 'farm', 'clinic')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  tax_number TEXT,
  preferred_payment_method TEXT CHECK (preferred_payment_method IS NULL OR preferred_payment_method IN ('cash', 'card', 'transfer', 'check')),
  credit_limit NUMERIC,
  outstanding_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add new columns to horse_orders for client and external provider linking
ALTER TABLE public.horse_orders 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_providers
CREATE POLICY "Members can view service providers"
ON public.service_providers
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert service providers"
ON public.service_providers
FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update service providers"
ON public.service_providers
FOR UPDATE
USING (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete service providers"
ON public.service_providers
FOR DELETE
USING (can_manage_orders(auth.uid(), tenant_id));

-- RLS Policies for clients
CREATE POLICY "Members can view clients"
ON public.clients
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update clients"
ON public.clients
FOR UPDATE
USING (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete clients"
ON public.clients
FOR DELETE
USING (can_manage_orders(auth.uid(), tenant_id));

-- Create updated_at triggers
CREATE TRIGGER update_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();