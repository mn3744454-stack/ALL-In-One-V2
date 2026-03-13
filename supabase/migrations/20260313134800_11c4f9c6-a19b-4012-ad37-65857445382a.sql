
-- Supplier Payables table
CREATE TABLE public.supplier_payables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  source_type TEXT, -- e.g. 'lab_invoice', 'clinic', 'transport', 'feed', 'other'
  source_reference TEXT, -- external invoice/reference number
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewed', 'approved', 'partially_paid', 'paid', 'cancelled', 'disputed')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_payables ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant members can view payables" ON public.supplier_payables
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert payables" ON public.supplier_payables
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update payables" ON public.supplier_payables
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can delete payables" ON public.supplier_payables
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Index for performance
CREATE INDEX idx_supplier_payables_tenant_status ON public.supplier_payables(tenant_id, status);
