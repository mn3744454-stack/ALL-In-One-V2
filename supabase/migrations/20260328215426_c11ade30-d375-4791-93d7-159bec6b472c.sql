
-- 3.1 Add service_id FK to invoice_items
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.tenant_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON public.invoice_items(service_id) WHERE service_id IS NOT NULL;

-- 3.2 Add prices_tax_inclusive to tenants (default false = tax-exclusive, standard for Saudi/GCC)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS prices_tax_inclusive BOOLEAN NOT NULL DEFAULT false;
