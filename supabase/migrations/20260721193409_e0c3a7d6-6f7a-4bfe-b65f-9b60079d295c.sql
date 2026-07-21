ALTER TYPE public.payment_reference_type ADD VALUE IF NOT EXISTS 'invoice';
ALTER TYPE public.payment_intent_type    ADD VALUE IF NOT EXISTS 'receivable';