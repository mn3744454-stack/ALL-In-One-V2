-- ============================================
-- LABORATORY MODULE - Database Migration
-- ============================================

-- ============================================
-- 1. HELPER FUNCTIONS
-- ============================================

-- Function to check lab management permissions
CREATE OR REPLACE FUNCTION public.can_manage_lab(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    LEFT JOIN public.tenant_capabilities tc 
      ON tc.tenant_id = tm.tenant_id AND tc.category = 'laboratory'
    WHERE tm.user_id = _user_id 
    AND tm.tenant_id = _tenant_id 
    AND tm.is_active = true
    AND (
      tm.role IN ('owner', 'manager')
      OR (tm.role = 'employee' AND COALESCE((tc.config->>'lab_staff_can_edit')::boolean, false) = true)
    )
  )
$$;

-- Function to check if lab credits are enabled
CREATE OR REPLACE FUNCTION public.is_lab_credits_enabled(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (config->>'enable_lab_credits')::boolean FROM public.tenant_capabilities
     WHERE tenant_id = _tenant_id AND category = 'laboratory'),
    false
  )
$$;

-- ============================================
-- 2. TABLES
-- ============================================

-- A) lab_test_types (tenant-configurable test types with pin_as_tab)
CREATE TABLE public.lab_test_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  pin_as_tab boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_test_types_unique_name UNIQUE(tenant_id, name)
);

-- B) lab_samples (sample collection and tracking)
CREATE TABLE public.lab_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id),
  related_order_id uuid REFERENCES public.horse_orders(id),
  client_id uuid REFERENCES public.clients(id),
  assigned_to uuid REFERENCES public.profiles(id),
  physical_sample_id text,
  collection_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft',
  accessioned_at timestamptz,
  completed_at timestamptz,
  notes text,
  retest_of_sample_id uuid REFERENCES public.lab_samples(id),
  retest_count integer NOT NULL DEFAULT 0,
  debit_txn_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_samples_status_check CHECK (status IN ('draft', 'accessioned', 'processing', 'completed', 'cancelled')),
  CONSTRAINT lab_samples_retest_count_check CHECK (retest_count >= 0 AND retest_count <= 3)
);

-- C) lab_templates (result templates with dynamic fields)
CREATE TABLE public.lab_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  template_type text NOT NULL DEFAULT 'standard',
  category text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  groups jsonb DEFAULT '[]'::jsonb,
  normal_ranges jsonb DEFAULT '{}'::jsonb,
  diagnostic_rules jsonb DEFAULT '{}'::jsonb,
  pricing jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- D) lab_results (test results linked to samples and templates)
CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.lab_samples(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.lab_templates(id),
  status text NOT NULL DEFAULT 'draft',
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation jsonb DEFAULT '{}'::jsonb,
  flags text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_results_status_check CHECK (status IN ('draft', 'reviewed', 'final')),
  CONSTRAINT lab_results_flags_check CHECK (flags IS NULL OR flags IN ('normal', 'abnormal', 'critical'))
);

-- E) lab_events (append-only audit log)
CREATE TABLE public.lab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_events_entity_type_check CHECK (entity_type IN ('lab_sample', 'lab_result'))
);

-- F) lab_credit_wallets (tenant credit balance)
CREATE TABLE public.lab_credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_credit_wallets_balance_check CHECK (balance >= 0)
);

-- G) lab_credit_transactions (credit purchase/debit/refund)
CREATE TABLE public.lab_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.lab_credit_wallets(id),
  txn_type text NOT NULL,
  samples_count integer NOT NULL,
  sample_ref uuid REFERENCES public.lab_samples(id),
  note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_credit_transactions_type_check CHECK (txn_type IN ('purchase', 'debit', 'refund'))
);

-- Add FK constraint for debit_txn_id
ALTER TABLE public.lab_samples
ADD CONSTRAINT lab_samples_debit_txn_fkey 
FOREIGN KEY (debit_txn_id) REFERENCES public.lab_credit_transactions(id);

-- ============================================
-- 3. VALIDATION TRIGGERS
-- ============================================

-- Validate lab_sample tenant consistency
CREATE OR REPLACE FUNCTION public.validate_lab_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  horse_tenant uuid;
  order_tenant uuid;
  client_tenant uuid;
  original_retest_count integer;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate horse belongs to tenant
  SELECT tenant_id INTO horse_tenant FROM public.horses WHERE id = NEW.horse_id;
  IF horse_tenant IS NULL THEN
    RAISE EXCEPTION 'Horse not found';
  END IF;
  IF horse_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Horse does not belong to this tenant';
  END IF;

  -- Validate related_order_id if provided
  IF NEW.related_order_id IS NOT NULL THEN
    SELECT tenant_id INTO order_tenant FROM public.horse_orders WHERE id = NEW.related_order_id;
    IF order_tenant IS NULL THEN
      RAISE EXCEPTION 'Related order not found';
    END IF;
    IF order_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Related order does not belong to this tenant';
    END IF;
  END IF;

  -- Validate client_id if provided
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO client_tenant FROM public.clients WHERE id = NEW.client_id;
    IF client_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF client_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
  END IF;

  -- Validate assigned_to is tenant member
  IF NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members 
      WHERE user_id = NEW.assigned_to 
      AND tenant_id = NEW.tenant_id 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Assignee is not an active member of this tenant';
    END IF;
  END IF;

  -- Retest validation
  IF NEW.retest_of_sample_id IS NOT NULL THEN
    SELECT retest_count INTO original_retest_count 
    FROM public.lab_samples WHERE id = NEW.retest_of_sample_id;
    
    IF TG_OP = 'INSERT' THEN
      NEW.retest_count := COALESCE(original_retest_count, 0) + 1;
    END IF;
    
    IF NEW.retest_count > 3 THEN
      RAISE EXCEPTION 'Maximum retest count (3) exceeded';
    END IF;
  END IF;

  -- Auto-set timestamps based on status
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'accessioned' AND NEW.accessioned_at IS NULL THEN
      NEW.accessioned_at := now();
    END IF;
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_lab_sample_trigger
BEFORE INSERT OR UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_sample();

-- Validate lab_sample status transitions
CREATE OR REPLACE FUNCTION public.validate_lab_sample_status_transition()
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
  -- draft -> accessioned, cancelled
  -- accessioned -> processing, cancelled
  -- processing -> completed, cancelled
  -- completed/cancelled are final

  IF OLD.status = 'draft' AND NEW.status IN ('accessioned', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'accessioned' AND NEW.status IN ('processing', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'processing' AND NEW.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot change status from % - it is a final state', OLD.status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;

CREATE TRIGGER validate_lab_sample_status_trigger
BEFORE UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_sample_status_transition();

-- Validate lab_result tenant consistency
CREATE OR REPLACE FUNCTION public.validate_lab_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sample_tenant uuid;
  template_tenant uuid;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate sample belongs to tenant
  SELECT tenant_id INTO sample_tenant FROM public.lab_samples WHERE id = NEW.sample_id;
  IF sample_tenant IS NULL THEN
    RAISE EXCEPTION 'Sample not found';
  END IF;
  IF sample_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Sample does not belong to this tenant';
  END IF;

  -- Validate template belongs to tenant
  SELECT tenant_id INTO template_tenant FROM public.lab_templates WHERE id = NEW.template_id;
  IF template_tenant IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  IF template_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Template does not belong to this tenant';
  END IF;

  -- Validate reviewed_by is tenant member
  IF NEW.reviewed_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members 
      WHERE user_id = NEW.reviewed_by 
      AND tenant_id = NEW.tenant_id 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Reviewer is not an active member of this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_lab_result_trigger
BEFORE INSERT OR UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_result();

-- ============================================
-- 4. EVENT LOGGING TRIGGERS
-- ============================================

-- Log lab_sample events
CREATE OR REPLACE FUNCTION public.log_lab_sample_event()
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
    payload_val := jsonb_build_object('status', NEW.status, 'horse_id', NEW.horse_id);
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

  INSERT INTO public.lab_events (
    tenant_id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'lab_sample', 
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

CREATE TRIGGER log_lab_sample_event_trigger
AFTER INSERT OR UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.log_lab_sample_event();

-- Log lab_result events
CREATE OR REPLACE FUNCTION public.log_lab_result_event()
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
    payload_val := jsonb_build_object('status', NEW.status, 'sample_id', NEW.sample_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := 'status_changed';
      payload_val := jsonb_build_object('from', OLD.status, 'to', NEW.status);
      
      IF NEW.status = 'final' THEN
        event_type_val := 'finalized';
      END IF;
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object('changes', 'details updated');
    END IF;
  ELSE
    RETURN OLD;
  END IF;

  INSERT INTO public.lab_events (
    tenant_id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, 
    'lab_result', 
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

CREATE TRIGGER log_lab_result_event_trigger
AFTER INSERT OR UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.log_lab_result_event();

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- lab_test_types
ALTER TABLE public.lab_test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab test types"
ON public.lab_test_types FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab test types"
ON public.lab_test_types FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can update lab test types"
ON public.lab_test_types FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete lab test types"
ON public.lab_test_types FOR DELETE
USING (can_manage_lab(auth.uid(), tenant_id));

-- lab_samples
ALTER TABLE public.lab_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab samples"
ON public.lab_samples FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab samples"
ON public.lab_samples FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can update lab samples"
ON public.lab_samples FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete lab samples"
ON public.lab_samples FOR DELETE
USING (can_manage_lab(auth.uid(), tenant_id));

-- lab_templates
ALTER TABLE public.lab_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab templates"
ON public.lab_templates FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab templates"
ON public.lab_templates FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can update lab templates"
ON public.lab_templates FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete lab templates"
ON public.lab_templates FOR DELETE
USING (can_manage_lab(auth.uid(), tenant_id));

-- lab_results
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab results"
ON public.lab_results FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab results"
ON public.lab_results FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can update lab results"
ON public.lab_results FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete lab results"
ON public.lab_results FOR DELETE
USING (can_manage_lab(auth.uid(), tenant_id));

-- lab_events (SELECT only - append-only)
ALTER TABLE public.lab_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab events"
ON public.lab_events FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Revoke direct modifications on lab_events (append-only via triggers)
REVOKE INSERT, UPDATE, DELETE ON public.lab_events FROM authenticated, anon;

-- lab_credit_wallets
ALTER TABLE public.lab_credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab credit wallets"
ON public.lab_credit_wallets FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab credit wallets"
ON public.lab_credit_wallets FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Managers can update lab credit wallets"
ON public.lab_credit_wallets FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- lab_credit_transactions
ALTER TABLE public.lab_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view lab credit transactions"
ON public.lab_credit_transactions FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert lab credit transactions"
ON public.lab_credit_transactions FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- ============================================
-- 6. PERFORMANCE INDEXES
-- ============================================

CREATE INDEX idx_lab_test_types_tenant_active ON public.lab_test_types(tenant_id, is_active);
CREATE INDEX idx_lab_test_types_pinned ON public.lab_test_types(tenant_id, pin_as_tab) WHERE pin_as_tab = true;

CREATE INDEX idx_lab_samples_tenant_status ON public.lab_samples(tenant_id, status);
CREATE INDEX idx_lab_samples_horse ON public.lab_samples(tenant_id, horse_id);
CREATE INDEX idx_lab_samples_collection_date ON public.lab_samples(tenant_id, collection_date);
CREATE INDEX idx_lab_samples_related_order ON public.lab_samples(related_order_id) WHERE related_order_id IS NOT NULL;

CREATE INDEX idx_lab_templates_tenant_active ON public.lab_templates(tenant_id, is_active);
CREATE INDEX idx_lab_templates_category ON public.lab_templates(tenant_id, category) WHERE category IS NOT NULL;

CREATE INDEX idx_lab_results_sample ON public.lab_results(sample_id);
CREATE INDEX idx_lab_results_tenant_status ON public.lab_results(tenant_id, status);
CREATE INDEX idx_lab_results_template ON public.lab_results(template_id);

CREATE INDEX idx_lab_events_entity ON public.lab_events(entity_type, entity_id);
CREATE INDEX idx_lab_events_tenant_created ON public.lab_events(tenant_id, created_at DESC);

CREATE INDEX idx_lab_credit_transactions_wallet ON public.lab_credit_transactions(wallet_id);
CREATE INDEX idx_lab_credit_transactions_sample ON public.lab_credit_transactions(sample_ref) WHERE sample_ref IS NOT NULL;

-- ============================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_lab_test_types_updated_at
BEFORE UPDATE ON public.lab_test_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_samples_updated_at
BEFORE UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_templates_updated_at
BEFORE UPDATE ON public.lab_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at
BEFORE UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_credit_wallets_updated_at
BEFORE UPDATE ON public.lab_credit_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();