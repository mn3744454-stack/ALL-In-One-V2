-- HR Module Database Migration

-- 1. Create can_manage_hr function (owner/manager can manage HR)
CREATE OR REPLACE FUNCTION public.can_manage_hr(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.can_manage_hr(uuid, uuid) TO authenticated;

-- 2. Create employee_type enum
CREATE TYPE public.hr_employee_type AS ENUM (
  'trainer', 'groom', 'vet_tech', 'receptionist', 
  'lab_tech', 'admin', 'manager', 'driver', 'farrier', 'other'
);

-- 3. Create hr_employees table
CREATE TABLE public.hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  employee_type public.hr_employee_type NOT NULL DEFAULT 'other',
  employee_type_custom text NULL,
  department text NULL,
  phone text NULL,
  email text NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: if employee_type != 'other', employee_type_custom must be null
  CONSTRAINT chk_employee_type_custom 
    CHECK (employee_type = 'other' OR employee_type_custom IS NULL)
);

-- 4. Create indexes for efficient querying
CREATE INDEX idx_hr_employees_tenant_active ON public.hr_employees(tenant_id, is_active);
CREATE INDEX idx_hr_employees_tenant_type ON public.hr_employees(tenant_id, employee_type);
CREATE INDEX idx_hr_employees_tenant_dept ON public.hr_employees(tenant_id, department);

-- Enable pg_trgm for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_hr_employees_name_trgm ON public.hr_employees USING gin (full_name gin_trgm_ops);

-- 5. Enable RLS
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- SELECT: tenant members only
CREATE POLICY "Members can view hr employees"
  ON public.hr_employees FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

-- INSERT: managers/owners only
CREATE POLICY "Managers can insert hr employees"
  ON public.hr_employees FOR INSERT
  WITH CHECK (can_manage_hr(auth.uid(), tenant_id));

-- UPDATE: managers/owners only  
CREATE POLICY "Managers can update hr employees"
  ON public.hr_employees FOR UPDATE
  USING (can_manage_hr(auth.uid(), tenant_id))
  WITH CHECK (can_manage_hr(auth.uid(), tenant_id));

-- NO DELETE policy - soft delete only via is_active = false

-- 7. Create updated_at trigger (reusing existing function)
CREATE TRIGGER set_hr_employees_updated_at
  BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();