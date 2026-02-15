
-- =============================================================
-- PHASE 10: Service ↔ Template Mapping (junction table)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.lab_service_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  service_id uuid NOT NULL REFERENCES public.lab_services(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.lab_templates(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_lab_service_templates UNIQUE (tenant_id, service_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_service_templates_service
  ON public.lab_service_templates (tenant_id, service_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_lab_service_templates_template
  ON public.lab_service_templates (tenant_id, template_id);

ALTER TABLE public.lab_service_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view service templates" ON public.lab_service_templates;
DROP POLICY IF EXISTS "Lab managers can manage service templates" ON public.lab_service_templates;
DROP POLICY IF EXISTS "Lab managers can update service templates" ON public.lab_service_templates;
DROP POLICY IF EXISTS "Lab managers can delete service templates" ON public.lab_service_templates;

CREATE POLICY "Tenant members can view service templates"
  ON public.lab_service_templates
  FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can manage service templates"
  ON public.lab_service_templates
  FOR INSERT
  WITH CHECK (public.can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can update service templates"
  ON public.lab_service_templates
  FOR UPDATE
  USING (public.can_manage_lab(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can delete service templates"
  ON public.lab_service_templates
  FOR DELETE
  USING (public.can_manage_lab(auth.uid(), tenant_id));

-- =============================================================
-- PHASE 12: Client auto-create for request-origin samples
-- =============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS linked_tenant_id uuid REFERENCES public.tenants(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_tenant_linked_tenant
  ON public.clients (tenant_id, linked_tenant_id)
  WHERE linked_tenant_id IS NOT NULL;

-- =============================================================
-- PHASE 13: Pricing & Snapshot fields
-- =============================================================

ALTER TABLE public.lab_services
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'sum_templates',
  ADD COLUMN IF NOT EXISTS override_price numeric,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_services_pricing_mode_check'
  ) THEN
    ALTER TABLE public.lab_services
      ADD CONSTRAINT lab_services_pricing_mode_check
      CHECK (pricing_mode IN ('sum_templates','override'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_services_discount_type_check'
  ) THEN
    ALTER TABLE public.lab_services
      ADD CONSTRAINT lab_services_discount_type_check
      CHECK (discount_type IS NULL OR discount_type IN ('percentage','fixed'));
  END IF;
END $$;

ALTER TABLE public.lab_request_services
  ADD COLUMN IF NOT EXISTS template_ids_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric,
  ADD COLUMN IF NOT EXISTS currency_snapshot text,
  ADD COLUMN IF NOT EXISTS pricing_rule_snapshot jsonb;
