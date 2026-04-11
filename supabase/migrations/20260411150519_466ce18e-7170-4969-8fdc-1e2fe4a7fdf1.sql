-- Add is_pony to horses table
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS is_pony boolean NOT NULL DEFAULT false;

-- Create horse classification changes audit log
CREATE TABLE public.horse_classification_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

-- Enable RLS
ALTER TABLE public.horse_classification_changes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant members can view classification changes"
  ON public.horse_classification_changes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can insert classification changes"
  ON public.horse_classification_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_horse_classification_changes_horse ON public.horse_classification_changes(horse_id);
CREATE INDEX idx_horse_classification_changes_tenant ON public.horse_classification_changes(tenant_id);