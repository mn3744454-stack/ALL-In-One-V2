-- ==========================================
-- HORSE ORDERS HARDENING MIGRATION
-- ==========================================

-- 1. DROP existing UPDATE policies and recreate with WITH CHECK
-- ==========================================

-- horse_orders
DROP POLICY IF EXISTS "Managers can update orders" ON horse_orders;
CREATE POLICY "Managers can update orders" ON horse_orders
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- horse_order_types
DROP POLICY IF EXISTS "Managers can update order types" ON horse_order_types;
CREATE POLICY "Managers can update order types" ON horse_order_types
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- service_providers
DROP POLICY IF EXISTS "Managers can update service providers" ON service_providers;
CREATE POLICY "Managers can update service providers" ON service_providers
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- clients
DROP POLICY IF EXISTS "Managers can update clients" ON clients;
CREATE POLICY "Managers can update clients" ON clients
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- tenant_capabilities
DROP POLICY IF EXISTS "Managers can update capabilities" ON tenant_capabilities;
CREATE POLICY "Managers can update capabilities" ON tenant_capabilities
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- custom_financial_categories
DROP POLICY IF EXISTS "Managers can update financial categories" ON custom_financial_categories;
CREATE POLICY "Managers can update financial categories" ON custom_financial_categories
  FOR UPDATE 
  USING (can_manage_orders(auth.uid(), tenant_id))
  WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- 2. REPLACE validate_horse_order_tenant function with extended validation
-- ==========================================

CREATE OR REPLACE FUNCTION public.validate_horse_order_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  horse_tenant uuid;
  order_type_tenant uuid;
  client_tenant uuid;
  provider_tenant uuid;
  cap_has_internal boolean;
  cap_allow_external boolean;
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

  -- Validate client_id belongs to same tenant (if provided)
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO client_tenant FROM public.clients WHERE id = NEW.client_id;
    IF client_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF client_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
  END IF;

  -- Validate external_provider_id belongs to same tenant (if provided)
  IF NEW.external_provider_id IS NOT NULL THEN
    SELECT tenant_id INTO provider_tenant FROM public.service_providers WHERE id = NEW.external_provider_id;
    IF provider_tenant IS NULL THEN
      RAISE EXCEPTION 'Service provider not found';
    END IF;
    IF provider_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Service provider does not belong to this tenant';
    END IF;
  END IF;

  -- Validate assigned_to is a valid tenant member (if provided)
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

  -- 3. Enforce service_mode rules
  -- ==========================================
  
  IF NEW.service_mode = 'internal' THEN
    -- Internal orders cannot have external provider references
    IF NEW.external_provider_id IS NOT NULL THEN
      RAISE EXCEPTION 'Internal orders cannot have external_provider_id';
    END IF;
    IF NEW.external_provider_name IS NOT NULL AND NEW.external_provider_name != '' THEN
      RAISE EXCEPTION 'Internal orders cannot have external_provider_name';
    END IF;
  END IF;

  IF NEW.service_mode = 'external' THEN
    -- External orders require provider info when not draft/pending
    IF NEW.status NOT IN ('draft', 'pending') THEN
      IF NEW.external_provider_id IS NULL AND (NEW.external_provider_name IS NULL OR NEW.external_provider_name = '') THEN
        RAISE EXCEPTION 'External orders require provider information (external_provider_id or external_provider_name)';
      END IF;
    END IF;
  END IF;

  -- 4. Enforce tenant_capabilities
  -- ==========================================
  
  -- Get capabilities for this category
  SELECT has_internal, allow_external INTO cap_has_internal, cap_allow_external
  FROM public.tenant_capabilities
  WHERE tenant_id = NEW.tenant_id AND category = NEW.category;

  -- If no capability exists, default to external only
  IF NOT FOUND THEN
    cap_has_internal := false;
    cap_allow_external := true;
  END IF;

  -- Validate service_mode against capabilities
  IF NEW.service_mode = 'internal' AND NOT COALESCE(cap_has_internal, false) THEN
    RAISE EXCEPTION 'Internal service mode is not available for category: %', COALESCE(NEW.category, 'uncategorized');
  END IF;

  IF NEW.service_mode = 'external' AND NOT COALESCE(cap_allow_external, true) THEN
    RAISE EXCEPTION 'External service mode is not allowed for category: %', COALESCE(NEW.category, 'uncategorized');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Create pinned tabs limit trigger
-- ==========================================

CREATE OR REPLACE FUNCTION public.validate_pinned_tabs_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_pinned_count integer;
BEGIN
  -- Only check when pin_as_tab is being set to true
  IF NEW.pin_as_tab = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.pin_as_tab = false)) THEN
    SELECT COUNT(*) INTO current_pinned_count
    FROM public.horse_order_types
    WHERE tenant_id = NEW.tenant_id 
      AND pin_as_tab = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF current_pinned_count >= 6 THEN
      RAISE EXCEPTION 'Maximum 6 pinned tabs allowed per tenant. Please unpin an existing tab first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for pinned tabs limit
DROP TRIGGER IF EXISTS validate_pinned_tabs_limit_trigger ON horse_order_types;
CREATE TRIGGER validate_pinned_tabs_limit_trigger
  BEFORE INSERT OR UPDATE ON public.horse_order_types
  FOR EACH ROW EXECUTE FUNCTION validate_pinned_tabs_limit();