-- =============================================
-- PHASE 4: Media Assets Table + Storage Policies
-- =============================================

-- Create media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  bucket text NOT NULL DEFAULT 'horse-media',
  path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  visibility text NOT NULL DEFAULT 'tenant' CHECK (visibility IN ('private', 'tenant', 'shared_link')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  display_order int DEFAULT 0,
  alt_text text,
  UNIQUE(bucket, path)
);

-- Indexes for media_assets
CREATE INDEX IF NOT EXISTS idx_media_assets_tenant ON public.media_assets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON public.media_assets(tenant_id, entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_assets
CREATE POLICY "Tenant members can view tenant assets"
ON public.media_assets FOR SELECT
USING (
  public.is_tenant_member(auth.uid(), tenant_id)
  AND (visibility IN ('tenant', 'shared_link') OR created_by = auth.uid())
);

CREATE POLICY "Managers can insert assets"
ON public.media_assets FOR INSERT
WITH CHECK (
  public.can_manage_horses(auth.uid(), tenant_id) OR
  public.can_manage_tenant_services(auth.uid(), tenant_id)
);

CREATE POLICY "Managers can update assets"
ON public.media_assets FOR UPDATE
USING (
  public.can_manage_horses(auth.uid(), tenant_id) OR 
  public.can_manage_tenant_services(auth.uid(), tenant_id)
);

CREATE POLICY "Managers can delete assets"
ON public.media_assets FOR DELETE
USING (
  public.can_manage_horses(auth.uid(), tenant_id) OR 
  public.can_manage_tenant_services(auth.uid(), tenant_id)
);

-- =============================================
-- Make horse-media bucket private
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'horse-media';

-- =============================================
-- PHASE 6: Finance Tables
-- =============================================

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  client_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'SAR',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, invoice_number)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name text,
  vendor_id uuid REFERENCES public.service_providers(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  receipt_asset_id uuid REFERENCES public.media_assets(id),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer balances table
CREATE TABLE IF NOT EXISTS public.customer_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'SAR',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

-- Ledger entries table
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  entry_type text NOT NULL CHECK (entry_type IN ('invoice', 'payment', 'credit', 'adjustment')),
  reference_type text,
  reference_id uuid,
  amount numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for finance tables
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON public.invoices(tenant_id, status, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON public.expenses(tenant_id, expense_date, status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_client ON public.ledger_entries(tenant_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_balances_tenant ON public.customer_balances(tenant_id);

-- Enable RLS on finance tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Tenant members can view invoices"
ON public.invoices FOR SELECT
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (public.can_manage_tenant_services(auth.uid(), tenant_id));

CREATE POLICY "Managers can update invoices"
ON public.invoices FOR UPDATE
USING (public.can_manage_tenant_services(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete invoices"
ON public.invoices FOR DELETE
USING (public.can_manage_tenant_services(auth.uid(), tenant_id));

-- RLS Policies for invoice_items (via parent invoice)
CREATE POLICY "Tenant members can view invoice items"
ON public.invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.is_tenant_member(auth.uid(), i.tenant_id)
  )
);

CREATE POLICY "Managers can insert invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.can_manage_tenant_services(auth.uid(), i.tenant_id)
  )
);

CREATE POLICY "Managers can update invoice items"
ON public.invoice_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.can_manage_tenant_services(auth.uid(), i.tenant_id)
  )
);

CREATE POLICY "Managers can delete invoice items"
ON public.invoice_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.can_manage_tenant_services(auth.uid(), i.tenant_id)
  )
);

-- RLS Policies for expenses
CREATE POLICY "Tenant members can view expenses"
ON public.expenses FOR SELECT
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (public.can_manage_tenant_services(auth.uid(), tenant_id));

CREATE POLICY "Managers can update expenses"
ON public.expenses FOR UPDATE
USING (public.can_manage_tenant_services(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete expenses"
ON public.expenses FOR DELETE
USING (public.can_manage_tenant_services(auth.uid(), tenant_id));

-- RLS Policies for customer_balances
CREATE POLICY "Tenant members can view balances"
ON public.customer_balances FOR SELECT
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage balances"
ON public.customer_balances FOR ALL
USING (public.can_manage_tenant_services(auth.uid(), tenant_id));

-- RLS Policies for ledger_entries
CREATE POLICY "Tenant members can view ledger"
ON public.ledger_entries FOR SELECT
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert ledger entries"
ON public.ledger_entries FOR INSERT
WITH CHECK (public.can_manage_tenant_services(auth.uid(), tenant_id));

-- =============================================
-- PHASE 7: Hardening
-- =============================================

-- Tenant creation limit (max 3 per owner)
CREATE OR REPLACE FUNCTION public.check_tenant_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.tenants WHERE owner_id = NEW.owner_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum tenant limit (3) reached for this user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_tenant_limit ON public.tenants;
CREATE TRIGGER enforce_tenant_limit
BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.check_tenant_limit();

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_vet_visits_tenant_scheduled 
ON public.vet_visits(tenant_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_vet_followups_tenant_due 
ON public.vet_followups(tenant_id, due_at);

CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_tenant_due 
ON public.horse_vaccinations(tenant_id, due_date);

CREATE INDEX IF NOT EXISTS idx_horse_movements_tenant_horse 
ON public.horse_movements(tenant_id, horse_id, movement_at DESC);