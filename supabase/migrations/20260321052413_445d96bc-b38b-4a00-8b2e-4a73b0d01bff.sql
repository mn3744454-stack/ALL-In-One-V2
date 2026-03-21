
-- breeding_contracts table
CREATE TABLE public.breeding_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_number text NOT NULL,
  contract_type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  mare_id uuid REFERENCES public.horses(id) ON DELETE SET NULL,
  stallion_id uuid REFERENCES public.horses(id) ON DELETE SET NULL,
  external_party_name text,
  service_id uuid REFERENCES public.tenant_services(id) ON DELETE SET NULL,
  pricing_mode text NOT NULL DEFAULT 'fixed',
  unit_price numeric,
  total_price numeric,
  currency text NOT NULL DEFAULT 'SAR',
  start_date date,
  end_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_breeding_contracts_tenant ON public.breeding_contracts(tenant_id);
CREATE INDEX idx_breeding_contracts_client ON public.breeding_contracts(client_id);
CREATE INDEX idx_breeding_contracts_mare ON public.breeding_contracts(mare_id);
CREATE INDEX idx_breeding_contracts_status ON public.breeding_contracts(tenant_id, status);

ALTER TABLE public.breeding_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view breeding contracts"
  ON public.breeding_contracts FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert breeding contracts"
  ON public.breeding_contracts FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update breeding contracts"
  ON public.breeding_contracts FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can delete breeding contracts"
  ON public.breeding_contracts FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

ALTER TABLE public.breeding_attempts ADD COLUMN contract_id uuid REFERENCES public.breeding_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.pregnancy_checks ADD COLUMN contract_id uuid REFERENCES public.breeding_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.foalings ADD COLUMN contract_id uuid REFERENCES public.breeding_contracts(id) ON DELETE SET NULL;
ALTER TABLE public.embryo_transfers ADD COLUMN contract_id uuid REFERENCES public.breeding_contracts(id) ON DELETE SET NULL;
