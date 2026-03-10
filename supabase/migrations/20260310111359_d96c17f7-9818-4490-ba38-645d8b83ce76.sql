
-- Phase 5: Stable Service Plans table
CREATE TABLE public.stable_service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  plan_type TEXT NOT NULL DEFAULT 'boarding',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  base_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  includes JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from boarding_admissions.plan_id to stable_service_plans
ALTER TABLE public.boarding_admissions
  ADD CONSTRAINT boarding_admissions_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.stable_service_plans(id);

-- Indexes
CREATE INDEX idx_stable_service_plans_tenant ON public.stable_service_plans(tenant_id);
CREATE INDEX idx_stable_service_plans_active ON public.stable_service_plans(tenant_id, is_active);

-- RLS
ALTER TABLE public.stable_service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view plans"
  ON public.stable_service_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = stable_service_plans.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

CREATE POLICY "Authorized members can manage plans"
  ON public.stable_service_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = stable_service_plans.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
        AND tm.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = stable_service_plans.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
        AND tm.role IN ('owner', 'manager')
    )
  );
