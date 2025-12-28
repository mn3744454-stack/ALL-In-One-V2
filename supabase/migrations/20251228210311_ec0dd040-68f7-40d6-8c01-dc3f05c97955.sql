-- =============================================================
-- VET MODULE HARDENING MIGRATION
-- =============================================================

-- 1. Create has_internal_capability helper function
-- =============================================================
CREATE OR REPLACE FUNCTION public.has_internal_capability(_tenant_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT has_internal FROM public.tenant_capabilities
     WHERE tenant_id = _tenant_id AND category = _category),
    false
  )
$$;

-- 2. Add CHECK constraints for vet_treatments
-- =============================================================
ALTER TABLE public.vet_treatments 
DROP CONSTRAINT IF EXISTS vet_treatments_status_check;

ALTER TABLE public.vet_treatments 
ADD CONSTRAINT vet_treatments_status_check 
CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE public.vet_treatments 
DROP CONSTRAINT IF EXISTS vet_treatments_priority_check;

ALTER TABLE public.vet_treatments 
ADD CONSTRAINT vet_treatments_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.vet_treatments 
DROP CONSTRAINT IF EXISTS vet_treatments_service_mode_check;

ALTER TABLE public.vet_treatments 
ADD CONSTRAINT vet_treatments_service_mode_check 
CHECK (service_mode IN ('internal', 'external'));

-- 3. Add CHECK constraints for vet_followups
-- =============================================================
ALTER TABLE public.vet_followups 
DROP CONSTRAINT IF EXISTS vet_followups_status_check;

ALTER TABLE public.vet_followups 
ADD CONSTRAINT vet_followups_status_check 
CHECK (status IN ('open', 'done', 'cancelled'));

-- 4. Normalize horse_vaccinations statuses
-- Convert 'overdue' to 'due' (overdue is UI-calculated now)
-- Convert 'cancelled' to 'skipped'
-- =============================================================
UPDATE public.horse_vaccinations SET status = 'due' WHERE status = 'overdue';
UPDATE public.horse_vaccinations SET status = 'skipped' WHERE status = 'cancelled';

ALTER TABLE public.horse_vaccinations 
DROP CONSTRAINT IF EXISTS horse_vaccinations_status_check;

ALTER TABLE public.horse_vaccinations 
ADD CONSTRAINT horse_vaccinations_status_check 
CHECK (status IN ('due', 'done', 'skipped'));

-- Also add service_mode check
ALTER TABLE public.horse_vaccinations 
DROP CONSTRAINT IF EXISTS horse_vaccinations_service_mode_check;

ALTER TABLE public.horse_vaccinations 
ADD CONSTRAINT horse_vaccinations_service_mode_check 
CHECK (service_mode IN ('internal', 'external'));

-- 5. Update validate_vet_treatment to enforce tenant_capabilities
-- =============================================================
CREATE OR REPLACE FUNCTION public.validate_vet_treatment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horse_tenant uuid;
  provider_tenant uuid;
  client_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate horse belongs to same tenant
  SELECT tenant_id INTO horse_tenant FROM horses WHERE id = NEW.horse_id;
  IF horse_tenant IS NULL THEN
    RAISE EXCEPTION 'Horse not found';
  END IF;
  IF horse_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Horse does not belong to this tenant';
  END IF;

  -- Validate external_provider_id belongs to same tenant (if provided)
  IF NEW.external_provider_id IS NOT NULL THEN
    SELECT tenant_id INTO provider_tenant FROM service_providers WHERE id = NEW.external_provider_id;
    IF provider_tenant IS NULL THEN
      RAISE EXCEPTION 'Service provider not found';
    END IF;
    IF provider_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Service provider does not belong to this tenant';
    END IF;
  END IF;

  -- Validate client_id belongs to same tenant (if provided)
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO client_tenant FROM clients WHERE id = NEW.client_id;
    IF client_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF client_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
  END IF;

  -- Validate assigned_to is a valid tenant member (if provided)
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_members 
      WHERE user_id = NEW.assigned_to AND tenant_id = NEW.tenant_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Assignee is not an active member of this tenant';
    END IF;
  END IF;

  -- Service mode validation with tenant_capabilities enforcement
  IF NEW.service_mode = 'internal' THEN
    -- Check if tenant has internal capability for veterinary
    IF NOT has_internal_capability(NEW.tenant_id, 'veterinary') THEN
      RAISE EXCEPTION 'Internal service mode is not available for veterinary category. Enable it in tenant capabilities.';
    END IF;
    -- Internal treatments cannot have external_provider_id
    IF NEW.external_provider_id IS NOT NULL THEN
      RAISE EXCEPTION 'Internal treatments cannot have external_provider_id';
    END IF;
  END IF;

  -- Auto-set completed_at when status becomes completed
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Update validate_horse_vaccination to enforce tenant_capabilities
-- =============================================================
CREATE OR REPLACE FUNCTION public.validate_horse_vaccination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  horse_tenant uuid;
  program_tenant uuid;
  provider_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate horse belongs to same tenant
  SELECT tenant_id INTO horse_tenant FROM horses WHERE id = NEW.horse_id;
  IF horse_tenant IS NULL THEN
    RAISE EXCEPTION 'Horse not found';
  END IF;
  IF horse_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Horse does not belong to this tenant';
  END IF;

  -- Validate program belongs to same tenant
  SELECT tenant_id INTO program_tenant FROM vaccination_programs WHERE id = NEW.program_id;
  IF program_tenant IS NULL THEN
    RAISE EXCEPTION 'Vaccination program not found';
  END IF;
  IF program_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Vaccination program does not belong to this tenant';
  END IF;

  -- Validate external_provider_id if provided
  IF NEW.external_provider_id IS NOT NULL THEN
    SELECT tenant_id INTO provider_tenant FROM service_providers WHERE id = NEW.external_provider_id;
    IF provider_tenant IS NULL THEN
      RAISE EXCEPTION 'Service provider not found';
    END IF;
    IF provider_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Service provider does not belong to this tenant';
    END IF;
  END IF;

  -- Service mode validation with tenant_capabilities enforcement
  IF NEW.service_mode = 'internal' THEN
    -- Check if tenant has internal capability for veterinary
    IF NOT has_internal_capability(NEW.tenant_id, 'veterinary') THEN
      RAISE EXCEPTION 'Internal service mode is not available for veterinary category. Enable it in tenant capabilities.';
    END IF;
    -- Internal vaccinations cannot have external_provider_id
    IF NEW.external_provider_id IS NOT NULL THEN
      RAISE EXCEPTION 'Internal vaccinations cannot have external_provider_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Make vet_events append-only (revoke direct INSERT/UPDATE/DELETE)
-- =============================================================
-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Managers can insert vet events" ON public.vet_events;

-- Revoke direct INSERT/UPDATE/DELETE from authenticated and anon users
-- The trigger functions (SECURITY DEFINER) will still be able to insert
REVOKE INSERT, UPDATE, DELETE ON public.vet_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vet_events FROM anon;

-- Ensure the SELECT policy remains for tenant members
-- (should already exist, but ensure it's there)
DROP POLICY IF EXISTS "Members can view vet events" ON public.vet_events;
CREATE POLICY "Members can view vet events" ON public.vet_events
FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

-- 8. Add performance indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_vet_treatments_tenant_scheduled 
ON public.vet_treatments(tenant_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_vet_treatments_tenant_assigned_status 
ON public.vet_treatments(tenant_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_tenant_horse_status 
ON public.horse_vaccinations(tenant_id, horse_id, status);

CREATE INDEX IF NOT EXISTS idx_horse_vaccinations_tenant_due_status 
ON public.horse_vaccinations(tenant_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_vet_followups_tenant_status_due 
ON public.vet_followups(tenant_id, status, due_at);