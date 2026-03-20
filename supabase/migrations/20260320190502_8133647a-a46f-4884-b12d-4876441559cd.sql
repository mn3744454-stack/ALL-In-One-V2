
-- Step 1: Schema enrichment for Breeding & Reproduction

-- 1.1 breeding_attempts: source_mode, provider_tenant_id, external_provider_name, performed_by
ALTER TABLE public.breeding_attempts
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS provider_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_provider_name text,
  ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 1.1.6 constraint for source_mode on breeding_attempts
ALTER TABLE public.breeding_attempts
  ADD CONSTRAINT breeding_attempts_source_mode_check CHECK (source_mode IN ('internal', 'connected', 'external'));

-- 1.2 embryo_transfers: source_mode, provider_tenant_id, external_provider_name, performed_by
ALTER TABLE public.embryo_transfers
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS provider_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_provider_name text,
  ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.embryo_transfers
  ADD CONSTRAINT embryo_transfers_source_mode_check CHECK (source_mode IN ('internal', 'connected', 'external'));

-- 1.3 semen_batches: source_mode, source_tenant_id, source_external_name, quality fields
ALTER TABLE public.semen_batches
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS source_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_external_name text,
  ADD COLUMN IF NOT EXISTS motility_percent numeric,
  ADD COLUMN IF NOT EXISTS concentration_million_per_ml numeric;

ALTER TABLE public.semen_batches
  ADD CONSTRAINT semen_batches_source_mode_check CHECK (source_mode IN ('internal', 'connected', 'external'));

-- 1.4 pregnancy_checks: performed_by
ALTER TABLE public.pregnancy_checks
  ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 1.5 pregnancies: stallion_id
ALTER TABLE public.pregnancies
  ADD COLUMN IF NOT EXISTS stallion_id uuid REFERENCES public.horses(id) ON DELETE SET NULL;

-- 2.1 Change default for breeding_attempts.result from 'unknown' to 'pending'
ALTER TABLE public.breeding_attempts ALTER COLUMN result SET DEFAULT 'pending';
