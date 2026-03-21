
-- Foalings table: core foaling/birth record entity
CREATE TABLE public.foalings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pregnancy_id UUID NOT NULL REFERENCES public.pregnancies(id) ON DELETE RESTRICT,
  mare_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE RESTRICT,
  stallion_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  foaling_date DATE NOT NULL DEFAULT CURRENT_DATE,
  foaling_time TIME WITHOUT TIME ZONE,
  outcome TEXT NOT NULL DEFAULT 'live',
  foal_sex TEXT,
  foal_color TEXT,
  foal_name TEXT,
  foal_horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  location_ref TEXT,
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Foal registry / lifecycle tracking fields
  registry_notification_status TEXT NOT NULL DEFAULT 'pending',
  registry_blood_sample_status TEXT NOT NULL DEFAULT 'pending',
  registry_microchip_status TEXT NOT NULL DEFAULT 'pending',
  registry_registration_status TEXT NOT NULL DEFAULT 'pending',
  foal_alive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT foalings_outcome_check CHECK (outcome IN ('live', 'stillborn', 'non_viable', 'other')),
  CONSTRAINT foalings_registry_notification_check CHECK (registry_notification_status IN ('pending', 'done', 'not_applicable')),
  CONSTRAINT foalings_registry_blood_check CHECK (registry_blood_sample_status IN ('pending', 'done', 'not_applicable')),
  CONSTRAINT foalings_registry_microchip_check CHECK (registry_microchip_status IN ('pending', 'done', 'not_applicable')),
  CONSTRAINT foalings_registry_registration_check CHECK (registry_registration_status IN ('pending', 'done', 'not_applicable')),
  CONSTRAINT foalings_unique_pregnancy UNIQUE (pregnancy_id)
);

-- Enable RLS
ALTER TABLE public.foalings ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the breeding domain pattern
CREATE POLICY "Tenant members can view foalings"
  ON public.foalings FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can insert foalings"
  ON public.foalings FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can update foalings"
  ON public.foalings FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can delete foalings"
  ON public.foalings FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- Index for common queries
CREATE INDEX idx_foalings_tenant_id ON public.foalings(tenant_id);
CREATE INDEX idx_foalings_mare_id ON public.foalings(mare_id);
CREATE INDEX idx_foalings_pregnancy_id ON public.foalings(pregnancy_id);
