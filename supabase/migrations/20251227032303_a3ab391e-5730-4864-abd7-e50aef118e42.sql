-- =====================================================
-- BREEDING & REPRODUCTION MODULE - COMPLETE MIGRATION
-- =====================================================

-- =====================================================
-- PART 1: SEMEN INVENTORY TABLES (must be created first)
-- =====================================================

-- 1.1 Semen Tanks
CREATE TABLE public.semen_tanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.semen_tanks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_semen_tanks_tenant ON semen_tanks(tenant_id);

-- 1.2 Semen Batches
CREATE TABLE public.semen_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stallion_id uuid NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
  tank_id uuid REFERENCES semen_tanks(id) ON DELETE SET NULL,
  collection_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('fresh', 'frozen')),
  doses_total int NOT NULL CHECK (doses_total > 0),
  doses_available int NOT NULL,
  unit text NOT NULL DEFAULT 'straw',
  quality_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doses_valid CHECK (doses_available >= 0 AND doses_available <= doses_total)
);

ALTER TABLE public.semen_batches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_semen_batches_tenant ON semen_batches(tenant_id);
CREATE INDEX idx_semen_batches_stallion ON semen_batches(tenant_id, stallion_id);
CREATE INDEX idx_semen_batches_tank ON semen_batches(tenant_id, tank_id);

-- =====================================================
-- PART 2: BREEDING ATTEMPTS TABLE
-- =====================================================

CREATE TABLE public.breeding_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mare_id uuid NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
  stallion_id uuid REFERENCES horses(id) ON DELETE RESTRICT,
  external_stallion_name text,
  external_stallion_meta jsonb DEFAULT '{}',
  attempt_type text NOT NULL CHECK (attempt_type IN ('natural', 'ai_fresh', 'ai_frozen', 'embryo_transfer')),
  attempt_date timestamptz NOT NULL,
  heat_cycle_ref text,
  location_ref text,
  notes text,
  semen_batch_id uuid REFERENCES semen_batches(id) ON DELETE RESTRICT,
  result text NOT NULL DEFAULT 'unknown' CHECK (result IN ('unknown', 'successful', 'unsuccessful')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.breeding_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_breeding_attempts_tenant ON breeding_attempts(tenant_id);
CREATE INDEX idx_breeding_attempts_mare ON breeding_attempts(tenant_id, mare_id);
CREATE INDEX idx_breeding_attempts_stallion ON breeding_attempts(tenant_id, stallion_id);
CREATE INDEX idx_breeding_attempts_date ON breeding_attempts(tenant_id, attempt_date DESC);

-- =====================================================
-- PART 3: PREGNANCIES TABLE
-- =====================================================

CREATE TABLE public.pregnancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mare_id uuid NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
  source_attempt_id uuid REFERENCES breeding_attempts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pregnant', 'open_by_abortion', 'closed')),
  verification_state text NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'verified')),
  start_date timestamptz NOT NULL,
  expected_due_date date,
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('foaled', 'abortion', 'not_pregnant', 'unknown')),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pregnancies_tenant ON pregnancies(tenant_id);
CREATE INDEX idx_pregnancies_mare ON pregnancies(tenant_id, mare_id);
CREATE INDEX idx_pregnancies_active ON pregnancies(tenant_id, mare_id) WHERE ended_at IS NULL;

-- CRITICAL: Only ONE active pregnancy per mare (active = ended_at IS NULL)
CREATE UNIQUE INDEX idx_one_active_pregnancy_per_mare 
ON pregnancies (tenant_id, mare_id) 
WHERE ended_at IS NULL;

-- =====================================================
-- PART 4: PREGNANCY CHECKS TABLE (Append-Only)
-- =====================================================

CREATE TABLE public.pregnancy_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pregnancy_id uuid NOT NULL REFERENCES pregnancies(id) ON DELETE CASCADE,
  check_date timestamptz NOT NULL,
  method text NOT NULL CHECK (method IN ('ultrasound', 'palpation', 'blood_test', 'other')),
  outcome text NOT NULL CHECK (outcome IN ('confirmed_pregnant', 'confirmed_open', 'inconclusive')),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pregnancy_checks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pregnancy_checks_pregnancy ON pregnancy_checks(tenant_id, pregnancy_id);

-- =====================================================
-- PART 5: EMBRYO TRANSFERS TABLE
-- =====================================================

CREATE TABLE public.embryo_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  donor_mare_id uuid NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
  recipient_mare_id uuid NOT NULL REFERENCES horses(id) ON DELETE RESTRICT,
  donor_attempt_id uuid REFERENCES breeding_attempts(id) ON DELETE SET NULL,
  flush_date date,
  transfer_date date,
  embryo_grade text,
  embryo_count int NOT NULL DEFAULT 1 CHECK (embryo_count > 0),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'transferred', 'failed', 'completed')),
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.embryo_transfers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_embryo_transfers_tenant ON embryo_transfers(tenant_id);
CREATE INDEX idx_embryo_transfers_donor ON embryo_transfers(tenant_id, donor_mare_id);
CREATE INDEX idx_embryo_transfers_recipient ON embryo_transfers(tenant_id, recipient_mare_id);

-- =====================================================
-- PART 6: FINANCIAL ENTRIES TABLE (Unified)
-- =====================================================

CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  is_income boolean NOT NULL DEFAULT false,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  service_mode text NOT NULL DEFAULT 'external' CHECK (service_mode IN ('internal', 'external')),
  external_provider_id uuid REFERENCES service_providers(id) ON DELETE SET NULL,
  internal_resource_ref jsonb,
  custom_financial_category_id uuid REFERENCES custom_financial_categories(id) ON DELETE SET NULL,
  account_code text,
  tax_category text CHECK (tax_category IN ('vat_standard', 'vat_reduced', 'vat_exempt', 'vat_zero')),
  estimated_cost numeric,
  actual_cost numeric,
  currency text NOT NULL DEFAULT 'SAR',
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_financial_entries_entity ON financial_entries(tenant_id, entity_type, entity_id);
CREATE INDEX idx_financial_entries_income ON financial_entries(tenant_id, is_income);
CREATE INDEX idx_financial_entries_category ON financial_entries(tenant_id, custom_financial_category_id);

-- =====================================================
-- PART 7: BREEDING EVENTS TABLE (Audit Log)
-- =====================================================

CREATE TABLE public.breeding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.breeding_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_breeding_events_entity ON breeding_events(tenant_id, entity_type, entity_id);
CREATE INDEX idx_breeding_events_created ON breeding_events(tenant_id, created_at DESC);

-- =====================================================
-- PART 8: VALIDATION TRIGGERS
-- =====================================================

-- 8.1 Validate Semen Batch (stallion must be male, not gelded, same tenant)
CREATE OR REPLACE FUNCTION public.validate_semen_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stallion_gender text;
  stallion_is_gelded boolean;
  stallion_tenant uuid;
  tank_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate stallion
  SELECT gender, is_gelded, tenant_id INTO stallion_gender, stallion_is_gelded, stallion_tenant
  FROM horses WHERE id = NEW.stallion_id;
  
  IF stallion_gender IS NULL THEN
    RAISE EXCEPTION 'Stallion not found';
  END IF;
  IF stallion_gender != 'male' THEN
    RAISE EXCEPTION 'Stallion must be male';
  END IF;
  IF stallion_is_gelded THEN
    RAISE EXCEPTION 'Stallion cannot be gelded';
  END IF;
  IF stallion_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Stallion does not belong to this tenant';
  END IF;

  -- Validate tank if provided
  IF NEW.tank_id IS NOT NULL THEN
    SELECT tenant_id INTO tank_tenant FROM semen_tanks WHERE id = NEW.tank_id;
    IF tank_tenant IS NULL THEN
      RAISE EXCEPTION 'Semen tank not found';
    END IF;
    IF tank_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Semen tank does not belong to this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_semen_batch
  BEFORE INSERT OR UPDATE ON semen_batches
  FOR EACH ROW EXECUTE FUNCTION validate_semen_batch();

-- 8.2 Validate Breeding Attempt
CREATE OR REPLACE FUNCTION public.validate_breeding_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mare_gender text;
  mare_tenant uuid;
  stallion_gender text;
  stallion_is_gelded boolean;
  stallion_tenant uuid;
  batch_tenant uuid;
  current_doses int;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Prevent changing immutable fields after creation
  IF TG_OP = 'UPDATE' THEN
    IF OLD.mare_id != NEW.mare_id THEN
      RAISE EXCEPTION 'Cannot change mare_id after creation';
    END IF;
    IF OLD.stallion_id IS DISTINCT FROM NEW.stallion_id THEN
      RAISE EXCEPTION 'Cannot change stallion_id after creation';
    END IF;
    IF OLD.attempt_type != NEW.attempt_type THEN
      RAISE EXCEPTION 'Cannot change attempt_type after creation';
    END IF;
    IF OLD.semen_batch_id IS DISTINCT FROM NEW.semen_batch_id THEN
      RAISE EXCEPTION 'Cannot change semen_batch_id after creation';
    END IF;
  END IF;

  -- Validate mare is female and same tenant
  SELECT gender, tenant_id INTO mare_gender, mare_tenant
  FROM horses WHERE id = NEW.mare_id;
  
  IF mare_gender IS NULL THEN
    RAISE EXCEPTION 'Mare not found';
  END IF;
  IF mare_gender != 'female' THEN
    RAISE EXCEPTION 'Mare must be female';
  END IF;
  IF mare_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Mare does not belong to this tenant';
  END IF;

  -- Validate stallion if provided (internal)
  IF NEW.stallion_id IS NOT NULL THEN
    SELECT gender, is_gelded, tenant_id INTO stallion_gender, stallion_is_gelded, stallion_tenant
    FROM horses WHERE id = NEW.stallion_id;
    
    IF stallion_gender IS NULL THEN
      RAISE EXCEPTION 'Stallion not found';
    END IF;
    IF stallion_gender != 'male' THEN
      RAISE EXCEPTION 'Stallion must be male';
    END IF;
    IF stallion_is_gelded THEN
      RAISE EXCEPTION 'Stallion cannot be gelded';
    END IF;
    IF stallion_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Stallion does not belong to this tenant';
    END IF;
  END IF;

  -- Must have either internal stallion or external stallion name
  IF NEW.stallion_id IS NULL AND (NEW.external_stallion_name IS NULL OR NEW.external_stallion_name = '') THEN
    RAISE EXCEPTION 'Either stallion_id or external_stallion_name is required';
  END IF;

  -- Validate semen_batch if provided
  IF NEW.semen_batch_id IS NOT NULL THEN
    IF NEW.attempt_type NOT IN ('ai_fresh', 'ai_frozen') THEN
      RAISE EXCEPTION 'Semen batch only allowed for AI attempts (ai_fresh or ai_frozen)';
    END IF;
    
    SELECT tenant_id, doses_available INTO batch_tenant, current_doses
    FROM semen_batches WHERE id = NEW.semen_batch_id FOR UPDATE;
    
    IF batch_tenant IS NULL THEN
      RAISE EXCEPTION 'Semen batch not found';
    END IF;
    IF batch_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Semen batch does not belong to this tenant';
    END IF;
    
    -- Decrement dose on INSERT only
    IF TG_OP = 'INSERT' THEN
      IF current_doses < 1 THEN
        RAISE EXCEPTION 'No doses available in this semen batch';
      END IF;
      UPDATE semen_batches SET doses_available = doses_available - 1, updated_at = now()
      WHERE id = NEW.semen_batch_id;
    END IF;
  END IF;

  -- Validate assigned_to is tenant member
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

CREATE TRIGGER trg_validate_breeding_attempt
  BEFORE INSERT OR UPDATE ON breeding_attempts
  FOR EACH ROW EXECUTE FUNCTION validate_breeding_attempt();

-- 8.3 Validate Pregnancy
CREATE OR REPLACE FUNCTION public.validate_pregnancy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mare_gender text;
  mare_tenant uuid;
  attempt_tenant uuid;
  attempt_mare uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate mare is female and same tenant
  SELECT gender, tenant_id INTO mare_gender, mare_tenant
  FROM horses WHERE id = NEW.mare_id;
  
  IF mare_gender IS NULL THEN
    RAISE EXCEPTION 'Mare not found';
  END IF;
  IF mare_gender != 'female' THEN
    RAISE EXCEPTION 'Mare must be female';
  END IF;
  IF mare_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Mare does not belong to this tenant';
  END IF;

  -- Validate source_attempt_id if provided
  IF NEW.source_attempt_id IS NOT NULL THEN
    SELECT tenant_id, mare_id INTO attempt_tenant, attempt_mare
    FROM breeding_attempts WHERE id = NEW.source_attempt_id;
    
    IF attempt_tenant IS NULL THEN
      RAISE EXCEPTION 'Source breeding attempt not found';
    END IF;
    IF attempt_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Source breeding attempt does not belong to this tenant';
    END IF;
    IF attempt_mare != NEW.mare_id THEN
      RAISE EXCEPTION 'Source breeding attempt mare does not match pregnancy mare';
    END IF;
  END IF;

  -- Validate assigned_to is tenant member
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

CREATE TRIGGER trg_validate_pregnancy
  BEFORE INSERT OR UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION validate_pregnancy();

-- 8.4 Validate Pregnancy Status Transition
CREATE OR REPLACE FUNCTION public.validate_pregnancy_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions:
  -- open -> pregnant
  -- pregnant -> open_by_abortion OR closed
  -- open_by_abortion -> open OR closed
  -- closed is final

  IF OLD.status = 'open' AND NEW.status = 'pregnant' THEN
    RETURN NEW;
  ELSIF OLD.status = 'pregnant' AND NEW.status IN ('open_by_abortion', 'closed') THEN
    IF NEW.status = 'closed' AND NEW.end_reason IS NULL THEN
      NEW.end_reason := 'foaled';
    END IF;
    NEW.ended_at := COALESCE(NEW.ended_at, now());
    RETURN NEW;
  ELSIF OLD.status = 'open_by_abortion' AND NEW.status IN ('open', 'closed') THEN
    IF NEW.status = 'closed' THEN
      NEW.ended_at := COALESCE(NEW.ended_at, now());
    END IF;
    RETURN NEW;
  ELSIF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot change status from closed - it is final';
  ELSE
    RAISE EXCEPTION 'Invalid pregnancy status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;

CREATE TRIGGER trg_validate_pregnancy_status
  BEFORE UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION validate_pregnancy_status_transition();

-- 8.5 Apply Pregnancy Check Effects
CREATE OR REPLACE FUNCTION public.apply_pregnancy_check_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  preg_tenant uuid;
BEGIN
  -- Validate pregnancy belongs to same tenant
  SELECT tenant_id INTO preg_tenant FROM pregnancies WHERE id = NEW.pregnancy_id;
  IF preg_tenant IS NULL THEN
    RAISE EXCEPTION 'Pregnancy not found';
  END IF;
  IF preg_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Pregnancy does not belong to this tenant';
  END IF;

  -- Apply effects based on outcome
  IF NEW.outcome = 'confirmed_pregnant' THEN
    UPDATE pregnancies 
    SET verification_state = 'verified', status = 'pregnant', updated_at = now()
    WHERE id = NEW.pregnancy_id AND status = 'open';
  ELSIF NEW.outcome = 'confirmed_open' THEN
    UPDATE pregnancies 
    SET status = 'closed', end_reason = 'not_pregnant', ended_at = now(), updated_at = now()
    WHERE id = NEW.pregnancy_id AND status IN ('open', 'pregnant');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_pregnancy_check_effects
  AFTER INSERT ON pregnancy_checks
  FOR EACH ROW EXECUTE FUNCTION apply_pregnancy_check_effects();

-- 8.6 Validate Embryo Transfer
CREATE OR REPLACE FUNCTION public.validate_embryo_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  donor_gender text;
  donor_tenant uuid;
  recipient_gender text;
  recipient_tenant uuid;
  attempt_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate donor mare is female and same tenant
  SELECT gender, tenant_id INTO donor_gender, donor_tenant
  FROM horses WHERE id = NEW.donor_mare_id;
  
  IF donor_gender IS NULL THEN
    RAISE EXCEPTION 'Donor mare not found';
  END IF;
  IF donor_gender != 'female' THEN
    RAISE EXCEPTION 'Donor mare must be female';
  END IF;
  IF donor_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Donor mare does not belong to this tenant';
  END IF;

  -- Validate recipient mare is female and same tenant
  SELECT gender, tenant_id INTO recipient_gender, recipient_tenant
  FROM horses WHERE id = NEW.recipient_mare_id;
  
  IF recipient_gender IS NULL THEN
    RAISE EXCEPTION 'Recipient mare not found';
  END IF;
  IF recipient_gender != 'female' THEN
    RAISE EXCEPTION 'Recipient mare must be female';
  END IF;
  IF recipient_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Recipient mare does not belong to this tenant';
  END IF;

  -- Validate donor_attempt_id if provided
  IF NEW.donor_attempt_id IS NOT NULL THEN
    SELECT tenant_id INTO attempt_tenant FROM breeding_attempts WHERE id = NEW.donor_attempt_id;
    IF attempt_tenant IS NULL THEN
      RAISE EXCEPTION 'Donor breeding attempt not found';
    END IF;
    IF attempt_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Donor breeding attempt does not belong to this tenant';
    END IF;
  END IF;

  -- Validate assigned_to is tenant member
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

CREATE TRIGGER trg_validate_embryo_transfer
  BEFORE INSERT OR UPDATE ON embryo_transfers
  FOR EACH ROW EXECUTE FUNCTION validate_embryo_transfer();

-- 8.7 Validate Financial Entry
CREATE OR REPLACE FUNCTION public.validate_financial_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate client_id belongs to tenant
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM clients WHERE id = NEW.client_id;
    IF ref_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
  END IF;

  -- Validate external_provider_id belongs to tenant
  IF NEW.external_provider_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM service_providers WHERE id = NEW.external_provider_id;
    IF ref_tenant IS NULL THEN
      RAISE EXCEPTION 'Service provider not found';
    END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Service provider does not belong to this tenant';
    END IF;
  END IF;

  -- Validate custom_financial_category_id belongs to tenant
  IF NEW.custom_financial_category_id IS NOT NULL THEN
    SELECT tenant_id INTO ref_tenant FROM custom_financial_categories WHERE id = NEW.custom_financial_category_id;
    IF ref_tenant IS NULL THEN
      RAISE EXCEPTION 'Financial category not found';
    END IF;
    IF ref_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Financial category does not belong to this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_financial_entry
  BEFORE INSERT OR UPDATE ON financial_entries
  FOR EACH ROW EXECUTE FUNCTION validate_financial_entry();

-- =====================================================
-- PART 9: EVENT LOGGING TRIGGERS
-- =====================================================

-- 9.1 Log Breeding Attempt Events
CREATE OR REPLACE FUNCTION public.log_breeding_attempt_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('result', NEW.result, 'attempt_type', NEW.attempt_type);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.result != NEW.result THEN
      event_type_val := 'result_changed';
      payload_val := jsonb_build_object('from', OLD.result, 'to', NEW.result);
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO breeding_events (
    tenant_id, entity_type, entity_id, event_type, 
    from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'breeding_attempt', 
    NEW.id, 
    event_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.result ELSE NULL END,
    NEW.result,
    payload_val,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_breeding_attempt_event
  AFTER INSERT OR UPDATE ON breeding_attempts
  FOR EACH ROW EXECUTE FUNCTION log_breeding_attempt_event();

-- 9.2 Log Pregnancy Events
CREATE OR REPLACE FUNCTION public.log_pregnancy_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('status', NEW.status, 'verification_state', NEW.verification_state);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := 'status_changed';
      payload_val := jsonb_build_object('from', OLD.status, 'to', NEW.status);
    ELSIF OLD.verification_state != NEW.verification_state THEN
      event_type_val := 'verification_changed';
      payload_val := jsonb_build_object('from', OLD.verification_state, 'to', NEW.verification_state);
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO breeding_events (
    tenant_id, entity_type, entity_id, event_type, 
    from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'pregnancy', 
    NEW.id, 
    event_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    payload_val,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_pregnancy_event
  AFTER INSERT OR UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION log_pregnancy_event();

-- 9.3 Log Embryo Transfer Events
CREATE OR REPLACE FUNCTION public.log_embryo_transfer_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('status', NEW.status);
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

  INSERT INTO breeding_events (
    tenant_id, entity_type, entity_id, event_type, 
    from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'embryo_transfer', 
    NEW.id, 
    event_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    payload_val,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_embryo_transfer_event
  AFTER INSERT OR UPDATE ON embryo_transfers
  FOR EACH ROW EXECUTE FUNCTION log_embryo_transfer_event();

-- 9.4 Log Semen Batch Events
CREATE OR REPLACE FUNCTION public.log_semen_batch_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_type_val text;
  payload_val jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'created';
    payload_val := jsonb_build_object('doses_total', NEW.doses_total, 'type', NEW.type);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.doses_available != NEW.doses_available THEN
      event_type_val := 'dose_changed';
      payload_val := jsonb_build_object('from', OLD.doses_available, 'to', NEW.doses_available);
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO breeding_events (
    tenant_id, entity_type, entity_id, event_type, 
    from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'semen_batch', 
    NEW.id, 
    event_type_val,
    NULL,
    NULL,
    payload_val,
    auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_semen_batch_event
  AFTER INSERT OR UPDATE ON semen_batches
  FOR EACH ROW EXECUTE FUNCTION log_semen_batch_event();

-- =====================================================
-- PART 10: RLS POLICIES
-- =====================================================

-- 10.1 Semen Tanks Policies
CREATE POLICY "Members can view semen tanks" ON semen_tanks
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert semen tanks" ON semen_tanks
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update semen tanks" ON semen_tanks
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete semen tanks" ON semen_tanks
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.2 Semen Batches Policies
CREATE POLICY "Members can view semen batches" ON semen_batches
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert semen batches" ON semen_batches
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update semen batches" ON semen_batches
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete semen batches" ON semen_batches
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.3 Breeding Attempts Policies
CREATE POLICY "Members can view breeding attempts" ON breeding_attempts
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert breeding attempts" ON breeding_attempts
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update breeding attempts" ON breeding_attempts
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete breeding attempts" ON breeding_attempts
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.4 Pregnancies Policies
CREATE POLICY "Members can view pregnancies" ON pregnancies
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert pregnancies" ON pregnancies
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update pregnancies" ON pregnancies
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete pregnancies" ON pregnancies
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.5 Pregnancy Checks Policies (Append-Only: INSERT only, no UPDATE/DELETE)
CREATE POLICY "Members can view pregnancy checks" ON pregnancy_checks
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert pregnancy checks" ON pregnancy_checks
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- 10.6 Embryo Transfers Policies
CREATE POLICY "Members can view embryo transfers" ON embryo_transfers
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert embryo transfers" ON embryo_transfers
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update embryo transfers" ON embryo_transfers
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete embryo transfers" ON embryo_transfers
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.7 Financial Entries Policies
CREATE POLICY "Members can view financial entries" ON financial_entries
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert financial entries" ON financial_entries
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update financial entries" ON financial_entries
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete financial entries" ON financial_entries
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 10.8 Breeding Events Policies
CREATE POLICY "Members can view breeding events" ON breeding_events
  FOR SELECT USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert breeding events" ON breeding_events
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- =====================================================
-- PART 11: UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_semen_batches_updated_at
  BEFORE UPDATE ON semen_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breeding_attempts_updated_at
  BEFORE UPDATE ON breeding_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pregnancies_updated_at
  BEFORE UPDATE ON pregnancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_embryo_transfers_updated_at
  BEFORE UPDATE ON embryo_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_entries_updated_at
  BEFORE UPDATE ON financial_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();