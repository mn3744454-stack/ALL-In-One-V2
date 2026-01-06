-- =====================================================
-- HR v1.1: Core Foundation + Assignments MVP
-- =====================================================

-- 1. Create employee_category enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_employee_category') THEN
    CREATE TYPE public.hr_employee_category AS ENUM ('field', 'office', 'mixed');
  END IF;
END $$;

-- 2. Extend hr_employees table with flexible fields
ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS employee_category public.hr_employee_category NULL,
  ADD COLUMN IF NOT EXISTS job_title text NULL,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}';

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_hr_employees_category 
  ON public.hr_employees(tenant_id, employee_category);

-- 3. Create hr_settings table (per-tenant feature toggles)
CREATE TABLE IF NOT EXISTS public.hr_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled_modules jsonb NOT NULL DEFAULT '{"assignments": true, "attendance": false, "documents": false}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for hr_settings
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view hr settings" ON public.hr_settings;
CREATE POLICY "Members can view hr settings"
  ON public.hr_settings FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can manage hr settings" ON public.hr_settings;
CREATE POLICY "Managers can manage hr settings"
  ON public.hr_settings FOR ALL
  USING (public.can_manage_hr(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_hr(auth.uid(), tenant_id));

-- Trigger for updated_at on hr_settings
DROP TRIGGER IF EXISTS set_hr_settings_updated_at ON public.hr_settings;
CREATE TRIGGER set_hr_settings_updated_at
  BEFORE UPDATE ON public.hr_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create hr_assignments table (generic, horse-first)
CREATE TABLE IF NOT EXISTS public.hr_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'horse',
  entity_id uuid NOT NULL,
  role text NOT NULL,
  start_date date NULL,
  end_date date NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint: one role per employee per entity
  CONSTRAINT uq_hr_assignment_employee_entity_role 
    UNIQUE (tenant_id, employee_id, entity_type, entity_id, role)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_hr_assignments_tenant_employee 
  ON public.hr_assignments(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_tenant_entity 
  ON public.hr_assignments(tenant_id, entity_type, entity_id);

-- RLS for hr_assignments
ALTER TABLE public.hr_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view assignments" ON public.hr_assignments;
CREATE POLICY "Members can view assignments"
  ON public.hr_assignments FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can insert assignments" ON public.hr_assignments;
CREATE POLICY "Managers can insert assignments"
  ON public.hr_assignments FOR INSERT
  WITH CHECK (public.can_manage_hr(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can update assignments" ON public.hr_assignments;
CREATE POLICY "Managers can update assignments"
  ON public.hr_assignments FOR UPDATE
  USING (public.can_manage_hr(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_hr(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can delete assignments" ON public.hr_assignments;
CREATE POLICY "Managers can delete assignments"
  ON public.hr_assignments FOR DELETE
  USING (public.can_manage_hr(auth.uid(), tenant_id));

-- Trigger for updated_at on hr_assignments
DROP TRIGGER IF EXISTS set_hr_assignments_updated_at ON public.hr_assignments;
CREATE TRIGGER set_hr_assignments_updated_at
  BEFORE UPDATE ON public.hr_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();