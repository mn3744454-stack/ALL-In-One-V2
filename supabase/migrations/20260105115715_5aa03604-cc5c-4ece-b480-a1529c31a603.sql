-- Create lab_sample_templates junction table
CREATE TABLE IF NOT EXISTS public.lab_sample_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES public.lab_samples(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.lab_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sample_id, template_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_lab_sample_templates_sample ON public.lab_sample_templates(sample_id);
CREATE INDEX IF NOT EXISTS idx_lab_sample_templates_template ON public.lab_sample_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_lab_sample_templates_tenant ON public.lab_sample_templates(tenant_id);

-- Enable RLS
ALTER TABLE public.lab_sample_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view
CREATE POLICY "Members can view sample templates"
  ON public.lab_sample_templates
  FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

-- RLS: Lab managers can insert
CREATE POLICY "Lab managers can insert sample templates"
  ON public.lab_sample_templates
  FOR INSERT
  WITH CHECK (public.can_manage_lab(auth.uid(), tenant_id));

-- RLS: Lab managers can delete
CREATE POLICY "Lab managers can delete sample templates"
  ON public.lab_sample_templates
  FOR DELETE
  USING (public.can_manage_lab(auth.uid(), tenant_id));