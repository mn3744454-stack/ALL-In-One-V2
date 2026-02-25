
-- =====================================================
-- Doctor Module Phase 1: Core Tables + RLS + Indexes + Triggers + Permissions
-- =====================================================

-- =====================================================
-- 1) doctor_patients
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctor_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  gender text,
  approx_age text,
  breed_text text,
  color_text text,
  microchip_number text,
  passport_number text,
  ueln text,
  owner_name text,
  owner_phone text,
  stable_name text,
  linked_horse_id uuid REFERENCES public.horses(id),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_patients_select ON public.doctor_patients;
CREATE POLICY "doctor_patients_select" ON public.doctor_patients FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_patients_insert ON public.doctor_patients;
CREATE POLICY "doctor_patients_insert" ON public.doctor_patients FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_patients_update ON public.doctor_patients;
CREATE POLICY "doctor_patients_update" ON public.doctor_patients FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_patients_delete ON public.doctor_patients;
CREATE POLICY "doctor_patients_delete" ON public.doctor_patients FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_tenant_microchip
  ON public.doctor_patients (tenant_id, microchip_number)
  WHERE microchip_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_tenant_linked_horse
  ON public.doctor_patients (tenant_id, linked_horse_id)
  WHERE linked_horse_id IS NOT NULL;

-- =====================================================
-- 2) doctor_services
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  description text,
  description_ar text,
  base_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_services_select ON public.doctor_services;
CREATE POLICY "doctor_services_select" ON public.doctor_services FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_services_insert ON public.doctor_services;
CREATE POLICY "doctor_services_insert" ON public.doctor_services FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_services_update ON public.doctor_services;
CREATE POLICY "doctor_services_update" ON public.doctor_services FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_services_delete ON public.doctor_services;
CREATE POLICY "doctor_services_delete" ON public.doctor_services FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

-- =====================================================
-- 3) doctor_consultations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctor_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stable_tenant_id uuid REFERENCES public.tenants(id),
  patient_id uuid NOT NULL REFERENCES public.doctor_patients(id) ON DELETE CASCADE,
  consultation_type text NOT NULL DEFAULT 'checkup',
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL DEFAULT 'normal',
  scheduled_for timestamptz,
  completed_at timestamptz,
  chief_complaint text,
  findings text,
  diagnosis text,
  recommendations text,
  actual_cost numeric,
  currency text NOT NULL DEFAULT 'SAR',
  horse_name_snapshot text,
  horse_name_ar_snapshot text,
  stable_name_snapshot text,
  horse_snapshot jsonb,
  published_to_stable boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_consultations_select ON public.doctor_consultations;
CREATE POLICY "doctor_consultations_select" ON public.doctor_consultations FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_consultations_insert ON public.doctor_consultations;
CREATE POLICY "doctor_consultations_insert" ON public.doctor_consultations FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_consultations_update ON public.doctor_consultations;
CREATE POLICY "doctor_consultations_update" ON public.doctor_consultations FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_consultations_delete ON public.doctor_consultations;
CREATE POLICY "doctor_consultations_delete" ON public.doctor_consultations FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_tenant_patient
  ON public.doctor_consultations (tenant_id, patient_id);

-- =====================================================
-- 4) doctor_prescriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctor_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.doctor_consultations(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dose text,
  frequency text,
  duration_days int,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_prescriptions_select ON public.doctor_prescriptions;
CREATE POLICY "doctor_prescriptions_select" ON public.doctor_prescriptions FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_prescriptions_insert ON public.doctor_prescriptions;
CREATE POLICY "doctor_prescriptions_insert" ON public.doctor_prescriptions FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_prescriptions_update ON public.doctor_prescriptions;
CREATE POLICY "doctor_prescriptions_update" ON public.doctor_prescriptions FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_prescriptions_delete ON public.doctor_prescriptions;
CREATE POLICY "doctor_prescriptions_delete" ON public.doctor_prescriptions FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_doctor_prescriptions_tenant_consultation
  ON public.doctor_prescriptions (tenant_id, consultation_id);

-- =====================================================
-- 5) doctor_followups
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctor_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.doctor_consultations(id) ON DELETE CASCADE,
  followup_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctor_followups_select ON public.doctor_followups;
CREATE POLICY "doctor_followups_select" ON public.doctor_followups FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_followups_insert ON public.doctor_followups;
CREATE POLICY "doctor_followups_insert" ON public.doctor_followups FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_followups_update ON public.doctor_followups;
CREATE POLICY "doctor_followups_update" ON public.doctor_followups FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS doctor_followups_delete ON public.doctor_followups;
CREATE POLICY "doctor_followups_delete" ON public.doctor_followups FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_doctor_followups_tenant_consultation_date
  ON public.doctor_followups (tenant_id, consultation_id, followup_date);

-- =====================================================
-- 6) Snapshot trigger (Phase 1: same-tenant only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_populate_doctor_consultation_snapshots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient RECORD;
BEGIN
  SELECT name, name_ar INTO _patient
    FROM public.doctor_patients
    WHERE id = NEW.patient_id
      AND tenant_id = NEW.tenant_id;

  IF FOUND THEN
    IF NEW.horse_name_snapshot IS NULL THEN
      NEW.horse_name_snapshot := _patient.name;
    END IF;
    IF NEW.horse_name_ar_snapshot IS NULL THEN
      NEW.horse_name_ar_snapshot := _patient.name_ar;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_consultation_snapshots ON public.doctor_consultations;
CREATE TRIGGER trg_doctor_consultation_snapshots
  BEFORE INSERT OR UPDATE ON public.doctor_consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_populate_doctor_consultation_snapshots();

-- =====================================================
-- 7) updated_at triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_doctor_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_patients_updated_at ON public.doctor_patients;
CREATE TRIGGER trg_doctor_patients_updated_at
  BEFORE UPDATE ON public.doctor_patients
  FOR EACH ROW EXECUTE FUNCTION public.fn_doctor_set_updated_at();

DROP TRIGGER IF EXISTS trg_doctor_services_updated_at ON public.doctor_services;
CREATE TRIGGER trg_doctor_services_updated_at
  BEFORE UPDATE ON public.doctor_services
  FOR EACH ROW EXECUTE FUNCTION public.fn_doctor_set_updated_at();

DROP TRIGGER IF EXISTS trg_doctor_consultations_updated_at ON public.doctor_consultations;
CREATE TRIGGER trg_doctor_consultations_updated_at
  BEFORE UPDATE ON public.doctor_consultations
  FOR EACH ROW EXECUTE FUNCTION public.fn_doctor_set_updated_at();

-- =====================================================
-- 8) Permission definitions for doctor module
-- =====================================================
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('doctor.patients.read', 'doctor', 'patients', 'read', 'View Patients', 'عرض المرضى', 'Can view patient registry', 'يمكنه عرض سجل المرضى', true),
  ('doctor.patients.write', 'doctor', 'patients', 'write', 'Manage Patients', 'إدارة المرضى', 'Can add/edit/archive patients', 'يمكنه إضافة/تعديل/أرشفة المرضى', true),
  ('doctor.consultations.read', 'doctor', 'consultations', 'read', 'View Consultations', 'عرض الاستشارات', 'Can view consultations', 'يمكنه عرض الاستشارات', true),
  ('doctor.consultations.write', 'doctor', 'consultations', 'write', 'Manage Consultations', 'إدارة الاستشارات', 'Can create/edit consultations', 'يمكنه إنشاء/تعديل الاستشارات', true),
  ('doctor.services.read', 'doctor', 'services', 'read', 'View Services', 'عرض الخدمات', 'Can view service catalog', 'يمكنه عرض كتالوج الخدمات', true),
  ('doctor.services.write', 'doctor', 'services', 'write', 'Manage Services', 'إدارة الخدمات', 'Can add/edit services', 'يمكنه إضافة/تعديل الخدمات', true),
  ('doctor.followups.read', 'doctor', 'followups', 'read', 'View Follow-ups', 'عرض المتابعات', 'Can view follow-ups', 'يمكنه عرض المتابعات', true),
  ('doctor.followups.write', 'doctor', 'followups', 'write', 'Manage Follow-ups', 'إدارة المتابعات', 'Can create/edit follow-ups', 'يمكنه إنشاء/تعديل المتابعات', true)
ON CONFLICT (key) DO NOTHING;
