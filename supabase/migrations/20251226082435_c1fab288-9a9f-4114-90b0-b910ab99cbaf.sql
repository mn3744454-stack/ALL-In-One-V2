-- Add effective_date and transfer_id columns to horse_ownership_history
ALTER TABLE public.horse_ownership_history 
ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE;

ALTER TABLE public.horse_ownership_history 
ADD COLUMN IF NOT EXISTS transfer_id uuid;