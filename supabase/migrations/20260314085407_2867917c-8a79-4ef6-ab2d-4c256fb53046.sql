-- Phase 1: Replace the blocking invoice status CHECK constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'reviewed'::text,
    'approved'::text,
    'shared'::text,
    'paid'::text,
    'partial'::text,
    'overdue'::text,
    'cancelled'::text,
    'issued'::text,
    'sent'::text
  ]));