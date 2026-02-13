-- Drop legacy constraint that rejects source='request'
ALTER TABLE public.lab_horses DROP CONSTRAINT IF EXISTS lab_horses_source_chk;
-- lab_horses_source_check already allows ('manual','platform','request'), keep it.