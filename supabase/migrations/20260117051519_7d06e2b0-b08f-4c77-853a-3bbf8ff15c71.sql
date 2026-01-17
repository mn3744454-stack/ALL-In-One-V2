-- ============================================================
-- HR Module Enhancements + Permissions Arabic + Realtime + Payroll MVP
-- ============================================================

-- (1) HR: Add user_id to hr_employees (nullable for employees without platform accounts)
ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id);

-- (2) HR: employment_kind (internal/external) with default = external
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hr_employees' AND column_name='employment_kind'
  ) THEN
    ALTER TABLE public.hr_employees
    ADD COLUMN employment_kind text NOT NULL DEFAULT 'external';
  END IF;
END $$;

ALTER TABLE public.hr_employees
DROP CONSTRAINT IF EXISTS hr_employees_employment_kind_check;

ALTER TABLE public.hr_employees
ADD CONSTRAINT hr_employees_employment_kind_check
CHECK (employment_kind IN ('internal','external'));

-- (3) HR: MVP compensation fields for internal employees
ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS salary_amount numeric NULL;

ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS salary_currency text NULL DEFAULT 'SAR';

ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS start_date date NULL;

-- (4) HR: Optional avatar + documents (MVP file attachments support)
ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS avatar_url text NULL;

ALTER TABLE public.hr_employees
ADD COLUMN IF NOT EXISTS documents jsonb NULL DEFAULT '[]'::jsonb;

-- (5) UNIQUE: tenant_id + user_id (allows multiple NULL user_id rows)
ALTER TABLE public.hr_employees
DROP CONSTRAINT IF EXISTS hr_employees_tenant_user_uniq;

ALTER TABLE public.hr_employees
ADD CONSTRAINT hr_employees_tenant_user_uniq UNIQUE (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_hr_employees_user_id
ON public.hr_employees(user_id)
WHERE user_id IS NOT NULL;

-- (6) Permissions Arabic label support
ALTER TABLE public.permission_definitions
ADD COLUMN IF NOT EXISTS display_name_ar text NULL;

-- Optional safe backfill from existing Arabic description (only if present)
UPDATE public.permission_definitions
SET display_name_ar = COALESCE(display_name_ar, NULLIF(description_ar,''))
WHERE display_name_ar IS NULL;

-- (7) Realtime: enable invitations table in supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
  END IF;
END $$;

-- (8) Payroll MVP: salary payments table + optional link to finance expenses
CREATE TABLE IF NOT EXISTS public.hr_salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_period text NULL,
  notes text NULL,
  finance_expense_id uuid NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK to expenses only if expenses table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='expenses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema='public'
        AND table_name='hr_salary_payments'
        AND constraint_name='hr_salary_payments_expense_fk'
    ) THEN
      ALTER TABLE public.hr_salary_payments
      ADD CONSTRAINT hr_salary_payments_expense_fk
      FOREIGN KEY (finance_expense_id) REFERENCES public.expenses(id);
    END IF;
  END IF;
END $$;

ALTER TABLE public.hr_salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_salary_payments_select ON public.hr_salary_payments;
CREATE POLICY hr_salary_payments_select ON public.hr_salary_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_salary_payments.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager','foreman')
  )
);

DROP POLICY IF EXISTS hr_salary_payments_insert ON public.hr_salary_payments;
CREATE POLICY hr_salary_payments_insert ON public.hr_salary_payments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_salary_payments.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
);

DROP POLICY IF EXISTS hr_salary_payments_update ON public.hr_salary_payments;
CREATE POLICY hr_salary_payments_update ON public.hr_salary_payments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_salary_payments.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_salary_payments.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
);

-- (9) RPC: change employment_kind (internal <-> external)
CREATE OR REPLACE FUNCTION public.hr_update_employment_kind(
  _employee_id uuid,
  _employment_kind text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_role text;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.hr_employees
  WHERE id = _employee_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
  END IF;

  SELECT role INTO v_role
  FROM public.tenant_members
  WHERE tenant_id = v_tenant_id
    AND user_id = auth.uid()
    AND is_active = true;

  IF v_role IS NULL OR v_role NOT IN ('owner','manager','foreman') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF _employment_kind NOT IN ('internal','external') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid employment_kind');
  END IF;

  UPDATE public.hr_employees
  SET employment_kind = _employment_kind,
      updated_at = now()
  WHERE id = _employee_id;

  RETURN jsonb_build_object('success', true, 'employee_id', _employee_id, 'employment_kind', _employment_kind);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_update_employment_kind(uuid, text) TO authenticated;