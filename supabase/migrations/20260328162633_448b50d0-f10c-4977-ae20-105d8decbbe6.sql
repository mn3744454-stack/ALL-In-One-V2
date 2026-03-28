
-- Phase 1a+1b: Add attribution and period columns to invoice_items
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS horse_id uuid REFERENCES public.horses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

-- Add default_tax_rate to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_tax_rate numeric;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_horse_id ON public.invoice_items(horse_id) WHERE horse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_domain ON public.invoice_items(domain) WHERE domain IS NOT NULL;
