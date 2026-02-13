-- Phase 8: Expand lab_horses source check constraint to include 'request'
ALTER TABLE public.lab_horses 
  DROP CONSTRAINT IF EXISTS lab_horses_source_check;
ALTER TABLE public.lab_horses 
  ADD CONSTRAINT lab_horses_source_check 
  CHECK (source IN ('manual', 'platform', 'request'));