-- ============================================
-- HORSE ORDERS MVP - Complete Database Schema
-- ============================================

-- 1) Function: can_manage_orders (owner/manager can manage orders)
CREATE OR REPLACE FUNCTION public.can_manage_orders(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND role IN ('owner', 'manager')
    AND is_active = true
  )
$$;

-- ============================================
-- 2) Table: horse_order_types (tenant-defined order types)
-- ============================================
CREATE TABLE public.horse_order_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  pin_as_tab boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_order_type_name UNIQUE (tenant_id, category, name)
);

-- Indexes for horse_order_types
CREATE INDEX idx_order_types_tenant_pinned ON public.horse_order_types(tenant_id, pin_as_tab, sort_order);
CREATE INDEX idx_order_types_tenant_category ON public.horse_order_types(tenant_id, category);
CREATE INDEX idx_order_types_tenant_active ON public.horse_order_types(tenant_id, is_active);

-- Enable RLS
ALTER TABLE public.horse_order_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for horse_order_types
CREATE POLICY "Members can view order types"
ON public.horse_order_types FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert order types"
ON public.horse_order_types FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update order types"
ON public.horse_order_types FOR UPDATE
USING (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete order types"
ON public.horse_order_types FOR DELETE
USING (can_manage_orders(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_horse_order_types_updated_at
BEFORE UPDATE ON public.horse_order_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3) Table: tenant_capabilities (internal/external service mode)
-- ============================================
CREATE TABLE public.tenant_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  has_internal boolean NOT NULL DEFAULT false,
  allow_external boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_capability UNIQUE (tenant_id, category)
);

-- Indexes for tenant_capabilities
CREATE INDEX idx_capabilities_tenant ON public.tenant_capabilities(tenant_id);
CREATE INDEX idx_capabilities_category ON public.tenant_capabilities(tenant_id, category);

-- Enable RLS
ALTER TABLE public.tenant_capabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_capabilities
CREATE POLICY "Members can view capabilities"
ON public.tenant_capabilities FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert capabilities"
ON public.tenant_capabilities FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update capabilities"
ON public.tenant_capabilities FOR UPDATE
USING (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete capabilities"
ON public.tenant_capabilities FOR DELETE
USING (can_manage_orders(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_capabilities_updated_at
BEFORE UPDATE ON public.tenant_capabilities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4) Table: horse_orders (the main orders table)
-- ============================================
CREATE TABLE public.horse_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  order_type_id uuid NOT NULL REFERENCES public.horse_order_types(id) ON DELETE RESTRICT,
  category text,
  service_mode text NOT NULL CHECK (service_mode IN ('internal', 'external')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  completed_at timestamptz,
  notes text,
  internal_resource_ref jsonb,
  external_provider_name text,
  external_provider_meta jsonb,
  estimated_cost numeric,
  actual_cost numeric,
  currency text NOT NULL DEFAULT 'SAR',
  is_income boolean NOT NULL DEFAULT false,
  tax_category text,
  account_code text,
  financial_category text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for horse_orders
CREATE INDEX idx_orders_tenant_status ON public.horse_orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_scheduled ON public.horse_orders(tenant_id, scheduled_for);
CREATE INDEX idx_orders_tenant_horse ON public.horse_orders(tenant_id, horse_id);
CREATE INDEX idx_orders_tenant_type ON public.horse_orders(tenant_id, order_type_id);
CREATE INDEX idx_orders_tenant_category ON public.horse_orders(tenant_id, category);

-- Enable RLS
ALTER TABLE public.horse_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for horse_orders
CREATE POLICY "Members can view orders"
ON public.horse_orders FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert orders"
ON public.horse_orders FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can update orders"
ON public.horse_orders FOR UPDATE
USING (can_manage_orders(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete orders"
ON public.horse_orders FOR DELETE
USING (can_manage_orders(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_horse_orders_updated_at
BEFORE UPDATE ON public.horse_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5) Table: horse_order_events (activity log)
-- ============================================
CREATE TABLE public.horse_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.horse_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for horse_order_events
CREATE INDEX idx_order_events_order ON public.horse_order_events(order_id);
CREATE INDEX idx_order_events_tenant ON public.horse_order_events(tenant_id);

-- Enable RLS
ALTER TABLE public.horse_order_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for horse_order_events
CREATE POLICY "Members can view order events"
ON public.horse_order_events FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert order events"
ON public.horse_order_events FOR INSERT
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- ============================================
-- 6) Trigger: validate_horse_order_tenant
-- Ensures horse_id and order_type_id belong to the same tenant
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_horse_order_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  horse_tenant uuid;
  order_type_tenant uuid;
BEGIN
  -- Prevent tenant_id change after creation
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after order creation';
  END IF;

  -- Validate horse belongs to same tenant
  SELECT tenant_id INTO horse_tenant FROM public.horses WHERE id = NEW.horse_id;
  IF horse_tenant IS NULL THEN
    RAISE EXCEPTION 'Horse not found';
  END IF;
  IF horse_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Horse does not belong to this tenant';
  END IF;

  -- Validate order_type belongs to same tenant
  SELECT tenant_id INTO order_type_tenant FROM public.horse_order_types WHERE id = NEW.order_type_id;
  IF order_type_tenant IS NULL THEN
    RAISE EXCEPTION 'Order type not found';
  END IF;
  IF order_type_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Order type does not belong to this tenant';
  END IF;

  -- Copy category from order_type for quick filtering
  SELECT category INTO NEW.category FROM public.horse_order_types WHERE id = NEW.order_type_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_horse_order_tenant_trigger
BEFORE INSERT OR UPDATE ON public.horse_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_horse_order_tenant();

-- ============================================
-- 7) Trigger: validate_order_required_fields
-- Validates fields based on status
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_order_required_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Draft allows incomplete data
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- Non-draft requires core fields
  IF NEW.horse_id IS NULL THEN
    RAISE EXCEPTION 'horse_id is required for non-draft orders';
  END IF;
  IF NEW.order_type_id IS NULL THEN
    RAISE EXCEPTION 'order_type_id is required for non-draft orders';
  END IF;

  -- Scheduled requires scheduled_for
  IF NEW.status = 'scheduled' AND NEW.scheduled_for IS NULL THEN
    RAISE EXCEPTION 'scheduled_for is required when status is scheduled';
  END IF;

  -- Completed requires completed_at
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  -- Internal mode requires internal_resource_ref (except draft)
  IF NEW.service_mode = 'internal' AND NEW.status != 'draft' THEN
    IF NEW.internal_resource_ref IS NULL OR NEW.internal_resource_ref = '{}'::jsonb THEN
      RAISE EXCEPTION 'internal_resource_ref is required for internal service mode';
    END IF;
  END IF;

  -- External mode should have provider info (except draft) - warning only, not blocking
  IF NEW.service_mode = 'external' AND NEW.status NOT IN ('draft', 'pending') THEN
    IF NEW.external_provider_name IS NULL AND (NEW.external_provider_meta IS NULL OR NEW.external_provider_meta = '{}'::jsonb) THEN
      -- Just a notice, not blocking
      RAISE NOTICE 'Consider adding external provider information';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_order_required_fields_trigger
BEFORE INSERT OR UPDATE ON public.horse_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_required_fields();

-- ============================================
-- 8) Trigger: validate_status_transition
-- Enforces valid status transitions
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip validation on INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- No change in status, skip
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  -- draft → pending
  -- pending → scheduled, cancelled
  -- scheduled → in_progress, cancelled
  -- in_progress → completed, cancelled
  -- completed/cancelled are final (no transitions out)
  
  IF OLD.status = 'draft' AND NEW.status IN ('pending') THEN
    RETURN NEW;
  ELSIF OLD.status = 'pending' AND NEW.status IN ('scheduled', 'cancelled') THEN
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

CREATE TRIGGER validate_status_transition_trigger
BEFORE UPDATE ON public.horse_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_status_transition();

-- ============================================
-- 9) Trigger: log_order_event
-- Auto-logs changes to horse_order_events
-- ============================================
CREATE OR REPLACE FUNCTION public.log_order_event()
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
    payload_val := jsonb_build_object(
      'status', NEW.status,
      'priority', NEW.priority,
      'service_mode', NEW.service_mode
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      event_type_val := 'status_changed';
      payload_val := jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      );
    ELSE
      event_type_val := 'updated';
      payload_val := jsonb_build_object(
        'changes', 'order details updated'
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    event_type_val := 'deleted';
    payload_val := jsonb_build_object('deleted_at', now());
    
    INSERT INTO public.horse_order_events (
      tenant_id, order_id, event_type, from_status, to_status, payload, created_by
    ) VALUES (
      OLD.tenant_id, OLD.id, event_type_val, OLD.status, NULL, payload_val, auth.uid()
    );
    RETURN OLD;
  END IF;

  INSERT INTO public.horse_order_events (
    tenant_id, order_id, event_type, from_status, to_status, payload, created_by
  ) VALUES (
    NEW.tenant_id, NEW.id, event_type_val, 
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    payload_val, 
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_event_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.horse_orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_event();