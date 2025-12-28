-- =====================================================
-- VET & HEALTH MODULE - Database Schema
-- =====================================================

-- 1. vet_treatments - Main treatment/procedure records
CREATE TABLE public.vet_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL DEFAULT 'medium',
  service_mode text NOT NULL DEFAULT 'external',
  external_provider_id uuid REFERENCES service_providers(id),
  external_provider_name text,
  internal_resource_ref jsonb DEFAULT '{}'::jsonb,
  client_id uuid REFERENCES clients(id),
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  completed_at timestamptz,
  related_order_id uuid REFERENCES horse_orders(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. vet_medications - Medications linked to treatments
CREATE TABLE public.vet_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES vet_treatments(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text,
  frequency text,
  duration_days int,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. vet_followups - Follow-up reminders and actions
CREATE TABLE public.vet_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES vet_treatments(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES profiles(id),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. vaccination_programs - Tenant-configurable vaccine templates
CREATE TABLE public.vaccination_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  is_active boolean NOT NULL DEFAULT true,
  default_interval_days int,
  age_min_days int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. horse_vaccinations - Per-horse vaccination schedule and history
CREATE TABLE public.horse_vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES vaccination_programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'due',
  due_date date NOT NULL,
  administered_date date,
  administered_by uuid REFERENCES profiles(id),
  service_mode text NOT NULL DEFAULT 'internal',
  external_provider_id uuid REFERENCES service_providers(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. vet_events - Append-only audit trail
CREATE TABLE public.vet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_vet_treatments_tenant ON vet_treatments(tenant_id);
CREATE INDEX idx_vet_treatments_horse ON vet_treatments(horse_id);
CREATE INDEX idx_vet_treatments_status ON vet_treatments(tenant_id, status);
CREATE INDEX idx_vet_treatments_category ON vet_treatments(tenant_id, category);
CREATE INDEX idx_vet_medications_treatment ON vet_medications(treatment_id);
CREATE INDEX idx_vet_followups_treatment ON vet_followups(treatment_id);
CREATE INDEX idx_vet_followups_due ON vet_followups(tenant_id, due_at, status);
CREATE INDEX idx_vaccination_programs_tenant ON vaccination_programs(tenant_id);
CREATE INDEX idx_horse_vaccinations_horse ON horse_vaccinations(horse_id);
CREATE INDEX idx_horse_vaccinations_due ON horse_vaccinations(tenant_id, due_date, status);
CREATE INDEX idx_vet_events_entity ON vet_events(tenant_id, entity_type, entity_id);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Validate vet treatment tenant consistency
CREATE OR REPLACE FUNCTION public.validate_vet_treatment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  -- Service mode validation
  IF NEW.service_mode = 'internal' THEN
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

-- Validate vet treatment status transitions
CREATE OR REPLACE FUNCTION public.validate_vet_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions:
  -- draft → scheduled, in_progress, cancelled
  -- scheduled → in_progress, cancelled
  -- in_progress → completed, cancelled
  -- completed/cancelled are final

  IF OLD.status = 'draft' AND NEW.status IN ('scheduled', 'in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'scheduled' AND NEW.status IN ('in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change status from % - it is a final state', OLD.status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Log vet treatment events
CREATE OR REPLACE FUNCTION public.log_vet_treatment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('status', NEW.status, 'category', NEW.category, 'priority', NEW.priority);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := 'status_changed';
      payload_val := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO vet_events (
    tenant_id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 'vet_treatment', NEW.id, event_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    payload_val,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

-- Log vaccination events and auto-set administered_date
CREATE OR REPLACE FUNCTION public.log_vaccination_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  -- Auto-set administered_date when status becomes 'done'
  IF NEW.status = 'done' AND NEW.administered_date IS NULL THEN
    NEW.administered_date := CURRENT_DATE;
  END IF;

  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('status', NEW.status, 'due_date', NEW.due_date);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := 'status_changed';
      payload_val := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO vet_events (
    tenant_id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 'horse_vaccination', NEW.id, event_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    payload_val,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

-- Validate vaccination tenant consistency
CREATE OR REPLACE FUNCTION public.validate_horse_vaccination()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  RETURN NEW;
END;
$$;

-- Validate followup tenant consistency
CREATE OR REPLACE FUNCTION public.validate_vet_followup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  treatment_tenant uuid;
BEGIN
  -- Validate treatment belongs to same tenant
  SELECT tenant_id INTO treatment_tenant FROM vet_treatments WHERE id = NEW.treatment_id;
  IF treatment_tenant IS NULL THEN
    RAISE EXCEPTION 'Treatment not found';
  END IF;
  IF treatment_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Treatment does not belong to this tenant';
  END IF;

  -- Validate assigned_to if provided
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_members 
      WHERE user_id = NEW.assigned_to AND tenant_id = NEW.tenant_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Assignee is not an active member of this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Validate medication tenant consistency
CREATE OR REPLACE FUNCTION public.validate_vet_medication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  treatment_tenant uuid;
BEGIN
  -- Validate treatment belongs to same tenant
  SELECT tenant_id INTO treatment_tenant FROM vet_treatments WHERE id = NEW.treatment_id;
  IF treatment_tenant IS NULL THEN
    RAISE EXCEPTION 'Treatment not found';
  END IF;
  IF treatment_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Treatment does not belong to this tenant';
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER validate_vet_treatment_trigger
  BEFORE INSERT OR UPDATE ON vet_treatments
  FOR EACH ROW EXECUTE FUNCTION validate_vet_treatment();

CREATE TRIGGER validate_vet_status_transition_trigger
  BEFORE UPDATE ON vet_treatments
  FOR EACH ROW EXECUTE FUNCTION validate_vet_status_transition();

CREATE TRIGGER log_vet_treatment_event_trigger
  AFTER INSERT OR UPDATE ON vet_treatments
  FOR EACH ROW EXECUTE FUNCTION log_vet_treatment_event();

CREATE TRIGGER validate_horse_vaccination_trigger
  BEFORE INSERT OR UPDATE ON horse_vaccinations
  FOR EACH ROW EXECUTE FUNCTION validate_horse_vaccination();

CREATE TRIGGER log_vaccination_event_trigger
  AFTER INSERT OR UPDATE ON horse_vaccinations
  FOR EACH ROW EXECUTE FUNCTION log_vaccination_event();

CREATE TRIGGER validate_vet_followup_trigger
  BEFORE INSERT OR UPDATE ON vet_followups
  FOR EACH ROW EXECUTE FUNCTION validate_vet_followup();

CREATE TRIGGER validate_vet_medication_trigger
  BEFORE INSERT OR UPDATE ON vet_medications
  FOR EACH ROW EXECUTE FUNCTION validate_vet_medication();

CREATE TRIGGER update_vet_treatments_updated_at
  BEFORE UPDATE ON vet_treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaccination_programs_updated_at
  BEFORE UPDATE ON vaccination_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_horse_vaccinations_updated_at
  BEFORE UPDATE ON horse_vaccinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- vet_treatments
ALTER TABLE vet_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vet treatments"
  ON vet_treatments FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert vet treatments"
  ON vet_treatments FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update vet treatments"
  ON vet_treatments FOR UPDATE
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete vet treatments"
  ON vet_treatments FOR DELETE
  USING (can_manage_orders(auth.uid(), tenant_id));

-- vet_medications
ALTER TABLE vet_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vet medications"
  ON vet_medications FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert vet medications"
  ON vet_medications FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update vet medications"
  ON vet_medications FOR UPDATE
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete vet medications"
  ON vet_medications FOR DELETE
  USING (can_manage_orders(auth.uid(), tenant_id));

-- vet_followups
ALTER TABLE vet_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vet followups"
  ON vet_followups FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert vet followups"
  ON vet_followups FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update vet followups"
  ON vet_followups FOR UPDATE
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete vet followups"
  ON vet_followups FOR DELETE
  USING (can_manage_orders(auth.uid(), tenant_id));

-- vaccination_programs
ALTER TABLE vaccination_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vaccination programs"
  ON vaccination_programs FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert vaccination programs"
  ON vaccination_programs FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update vaccination programs"
  ON vaccination_programs FOR UPDATE
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete vaccination programs"
  ON vaccination_programs FOR DELETE
  USING (can_manage_orders(auth.uid(), tenant_id));

-- horse_vaccinations
ALTER TABLE horse_vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view horse vaccinations"
  ON horse_vaccinations FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert horse vaccinations"
  ON horse_vaccinations FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update horse vaccinations"
  ON horse_vaccinations FOR UPDATE
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete horse vaccinations"
  ON horse_vaccinations FOR DELETE
  USING (can_manage_orders(auth.uid(), tenant_id));

-- vet_events (append-only)
ALTER TABLE vet_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view vet events"
  ON vet_events FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert vet events"
  ON vet_events FOR INSERT
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));