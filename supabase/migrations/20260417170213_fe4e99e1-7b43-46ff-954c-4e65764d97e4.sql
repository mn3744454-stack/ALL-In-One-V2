-- Phase 5.2.2 — Migration 1 (retry): template-level decision foundation

-- 1) Enum
DO $$ BEGIN
  CREATE TYPE public.lab_template_decision AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend service decision enum
DO $$ BEGIN
  ALTER TYPE public.lab_service_decision ADD VALUE IF NOT EXISTS 'partial';
EXCEPTION WHEN others THEN NULL; END $$;

-- 3) Authoritative child table — composite FK to lab_request_services(lab_request_id, service_id)
CREATE TABLE IF NOT EXISTS public.lab_request_service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lab_request_id uuid NOT NULL,
  service_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.lab_templates(id),
  -- snapshots
  template_name_snapshot text,
  template_name_ar_snapshot text,
  template_category_snapshot text,
  is_required_snapshot boolean NOT NULL DEFAULT true,
  sort_order_snapshot int NOT NULL DEFAULT 0,
  -- decision layer
  template_decision public.lab_template_decision NOT NULL DEFAULT 'pending',
  template_rejection_reason text,
  decided_at timestamptz,
  decided_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_lrst_request_service_template UNIQUE (lab_request_id, service_id, template_id),
  CONSTRAINT fk_lrst_request_service
    FOREIGN KEY (lab_request_id, service_id)
    REFERENCES public.lab_request_services(lab_request_id, service_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_lrst_request
    FOREIGN KEY (lab_request_id)
    REFERENCES public.lab_requests(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lrst_request ON public.lab_request_service_templates(lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lrst_request_service ON public.lab_request_service_templates(lab_request_id, service_id);
CREATE INDEX IF NOT EXISTS idx_lrst_template ON public.lab_request_service_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_lrst_tenant ON public.lab_request_service_templates(tenant_id);

ALTER TABLE public.lab_request_service_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lrst_select_via_request_access" ON public.lab_request_service_templates;
CREATE POLICY "lrst_select_via_request_access"
  ON public.lab_request_service_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND (
          public.is_active_tenant_member(auth.uid(), r.tenant_id)
          OR (r.lab_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), r.lab_tenant_id))
          OR (r.initiator_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), r.initiator_tenant_id))
        )
    )
  );

DROP POLICY IF EXISTS "lrst_insert_via_request_access" ON public.lab_request_service_templates;
CREATE POLICY "lrst_insert_via_request_access"
  ON public.lab_request_service_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND (
          public.is_active_tenant_member(auth.uid(), r.tenant_id)
          OR (r.lab_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), r.lab_tenant_id))
        )
    )
  );

DROP POLICY IF EXISTS "lrst_update_via_lab_access" ON public.lab_request_service_templates;
CREATE POLICY "lrst_update_via_lab_access"
  ON public.lab_request_service_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND (
          public.is_active_tenant_member(auth.uid(), r.tenant_id)
          OR (r.lab_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), r.lab_tenant_id))
        )
    )
  );

DROP POLICY IF EXISTS "lrst_delete_via_lab_access" ON public.lab_request_service_templates;
CREATE POLICY "lrst_delete_via_lab_access"
  ON public.lab_request_service_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND (
          public.is_active_tenant_member(auth.uid(), r.tenant_id)
          OR (r.lab_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), r.lab_tenant_id))
        )
    )
  );

DROP TRIGGER IF EXISTS trg_lrst_updated_at ON public.lab_request_service_templates;
CREATE TRIGGER trg_lrst_updated_at
  BEFORE UPDATE ON public.lab_request_service_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();