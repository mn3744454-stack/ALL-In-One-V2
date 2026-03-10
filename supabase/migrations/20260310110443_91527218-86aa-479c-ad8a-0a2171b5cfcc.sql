
-- =====================================================
-- BOARDING ADMISSIONS TABLES + RLS
-- =====================================================

-- 1. boarding_admissions
CREATE TABLE IF NOT EXISTS public.boarding_admissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.facility_areas(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.housing_units(id) ON DELETE SET NULL,
  plan_id uuid DEFAULT NULL,
  status text NOT NULL DEFAULT 'active',
  admitted_at timestamptz NOT NULL DEFAULT now(),
  expected_departure timestamptz DEFAULT NULL,
  checked_out_at timestamptz DEFAULT NULL,
  daily_rate numeric DEFAULT NULL,
  monthly_rate numeric DEFAULT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  rate_currency text NOT NULL DEFAULT 'SAR',
  reason text DEFAULT NULL,
  special_instructions text DEFAULT NULL,
  emergency_contact text DEFAULT NULL,
  admitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_out_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  checkout_notes text DEFAULT NULL,
  balance_cleared boolean NOT NULL DEFAULT false,
  checkin_movement_id uuid DEFAULT NULL,
  checkout_movement_id uuid DEFAULT NULL,
  admission_checks jsonb NOT NULL DEFAULT '{}',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. boarding_status_history
CREATE TABLE IF NOT EXISTS public.boarding_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id uuid NOT NULL REFERENCES public.boarding_admissions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_status text DEFAULT NULL,
  to_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. horse_care_notes
CREATE TABLE IF NOT EXISTS public.horse_care_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  admission_id uuid REFERENCES public.boarding_admissions(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text DEFAULT NULL,
  priority text NOT NULL DEFAULT 'normal',
  valid_from timestamptz DEFAULT NULL,
  valid_until timestamptz DEFAULT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_role text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.boarding_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_care_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES — boarding_admissions
-- =====================================================

-- SELECT: tenant members with view permission (owner auto-granted via has_permission)
CREATE POLICY "boarding_admissions_select"
  ON public.boarding_admissions FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.view'));

-- INSERT: tenant members with create permission
CREATE POLICY "boarding_admissions_insert"
  ON public.boarding_admissions FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.create'));

-- UPDATE: tenant members with update permission
CREATE POLICY "boarding_admissions_update"
  ON public.boarding_admissions FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'))
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'));

-- DELETE: owner only (via has_permission owner shortcut)
CREATE POLICY "boarding_admissions_delete"
  ON public.boarding_admissions FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'));

-- =====================================================
-- RLS POLICIES — boarding_status_history
-- =====================================================

-- SELECT: anyone who can view admissions
CREATE POLICY "boarding_status_history_select"
  ON public.boarding_status_history FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.view'));

-- INSERT: anyone who can update admissions (status changes are mutations)
CREATE POLICY "boarding_status_history_insert"
  ON public.boarding_status_history FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'));

-- =====================================================
-- RLS POLICIES — horse_care_notes
-- =====================================================

-- SELECT: tenant members who can view admissions
CREATE POLICY "horse_care_notes_select"
  ON public.horse_care_notes FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.view'));

-- INSERT: tenant members who can create admissions
CREATE POLICY "horse_care_notes_insert"
  ON public.horse_care_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.create'));

-- UPDATE: tenant members who can update admissions
CREATE POLICY "horse_care_notes_update"
  ON public.horse_care_notes FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'))
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'));

-- DELETE: tenant members who can update admissions
CREATE POLICY "horse_care_notes_delete"
  ON public.horse_care_notes FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'boarding.admission.update'));

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_boarding_admissions_tenant ON public.boarding_admissions(tenant_id);
CREATE INDEX idx_boarding_admissions_horse ON public.boarding_admissions(horse_id);
CREATE INDEX idx_boarding_admissions_status ON public.boarding_admissions(tenant_id, status);
CREATE INDEX idx_boarding_status_history_admission ON public.boarding_status_history(admission_id);
CREATE INDEX idx_horse_care_notes_horse ON public.horse_care_notes(horse_id);
CREATE INDEX idx_horse_care_notes_admission ON public.horse_care_notes(admission_id);
