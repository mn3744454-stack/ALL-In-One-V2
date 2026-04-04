
-- ============================================================
-- PHASE 3 BATCH 2: Backend Permission Enforcement Migration
-- Domains: Doctor, Vet
-- ============================================================

-- ============================================================
-- 1. DOCTOR DOMAIN (5 tables, granular resource-level keys)
-- ============================================================

-- --- doctor_patients ---
DROP POLICY IF EXISTS "doctor_patients_insert" ON doctor_patients;
DROP POLICY IF EXISTS "doctor_patients_update" ON doctor_patients;
DROP POLICY IF EXISTS "doctor_patients_delete" ON doctor_patients;

CREATE POLICY "Permission-based insert doctor patients" ON doctor_patients
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.patients.write'));

CREATE POLICY "Permission-based update doctor patients" ON doctor_patients
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'doctor.patients.write'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.patients.write'));

CREATE POLICY "Permission-based delete doctor patients" ON doctor_patients
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'doctor.patients.write'));

-- --- doctor_consultations ---
DROP POLICY IF EXISTS "doctor_consultations_insert" ON doctor_consultations;
DROP POLICY IF EXISTS "doctor_consultations_update" ON doctor_consultations;
DROP POLICY IF EXISTS "doctor_consultations_delete" ON doctor_consultations;

CREATE POLICY "Permission-based insert doctor consultations" ON doctor_consultations
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

CREATE POLICY "Permission-based update doctor consultations" ON doctor_consultations
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

CREATE POLICY "Permission-based delete doctor consultations" ON doctor_consultations
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

-- --- doctor_prescriptions ---
DROP POLICY IF EXISTS "doctor_prescriptions_insert" ON doctor_prescriptions;
DROP POLICY IF EXISTS "doctor_prescriptions_update" ON doctor_prescriptions;
DROP POLICY IF EXISTS "doctor_prescriptions_delete" ON doctor_prescriptions;

CREATE POLICY "Permission-based insert doctor prescriptions" ON doctor_prescriptions
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

CREATE POLICY "Permission-based update doctor prescriptions" ON doctor_prescriptions
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

CREATE POLICY "Permission-based delete doctor prescriptions" ON doctor_prescriptions
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'doctor.consultations.write'));

-- --- doctor_followups ---
DROP POLICY IF EXISTS "doctor_followups_insert" ON doctor_followups;
DROP POLICY IF EXISTS "doctor_followups_update" ON doctor_followups;
DROP POLICY IF EXISTS "doctor_followups_delete" ON doctor_followups;

CREATE POLICY "Permission-based insert doctor followups" ON doctor_followups
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.followups.write'));

CREATE POLICY "Permission-based update doctor followups" ON doctor_followups
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'doctor.followups.write'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.followups.write'));

CREATE POLICY "Permission-based delete doctor followups" ON doctor_followups
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'doctor.followups.write'));

-- --- doctor_services ---
DROP POLICY IF EXISTS "doctor_services_insert" ON doctor_services;
DROP POLICY IF EXISTS "doctor_services_update" ON doctor_services;
DROP POLICY IF EXISTS "doctor_services_delete" ON doctor_services;

CREATE POLICY "Permission-based insert doctor services" ON doctor_services
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.services.write'));

CREATE POLICY "Permission-based update doctor services" ON doctor_services
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'doctor.services.write'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'doctor.services.write'));

CREATE POLICY "Permission-based delete doctor services" ON doctor_services
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'doctor.services.write'));

-- ============================================================
-- 2. VET DOMAIN (6 tables, blanket vet.manage key)
-- ============================================================

-- --- vet_visits (inline owner/manager check) ---
DROP POLICY IF EXISTS "Managers can insert visits" ON vet_visits;
DROP POLICY IF EXISTS "Managers can update visits" ON vet_visits;
DROP POLICY IF EXISTS "Managers can delete visits" ON vet_visits;

CREATE POLICY "Permission-based insert vet visits" ON vet_visits
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update vet visits" ON vet_visits
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete vet visits" ON vet_visits
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));

-- --- vet_treatments ---
DROP POLICY IF EXISTS "Managers can insert vet treatments" ON vet_treatments;
DROP POLICY IF EXISTS "Managers can update vet treatments" ON vet_treatments;
DROP POLICY IF EXISTS "Managers can delete vet treatments" ON vet_treatments;

CREATE POLICY "Permission-based insert vet treatments" ON vet_treatments
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update vet treatments" ON vet_treatments
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete vet treatments" ON vet_treatments
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));

-- --- vet_medications ---
DROP POLICY IF EXISTS "Managers can insert vet medications" ON vet_medications;
DROP POLICY IF EXISTS "Managers can update vet medications" ON vet_medications;
DROP POLICY IF EXISTS "Managers can delete vet medications" ON vet_medications;

CREATE POLICY "Permission-based insert vet medications" ON vet_medications
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update vet medications" ON vet_medications
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete vet medications" ON vet_medications
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));

-- --- vet_followups ---
DROP POLICY IF EXISTS "Managers can insert vet followups" ON vet_followups;
DROP POLICY IF EXISTS "Managers can update vet followups" ON vet_followups;
DROP POLICY IF EXISTS "Managers can delete vet followups" ON vet_followups;

CREATE POLICY "Permission-based insert vet followups" ON vet_followups
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update vet followups" ON vet_followups
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete vet followups" ON vet_followups
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));

-- --- horse_vaccinations ---
DROP POLICY IF EXISTS "Managers can insert horse vaccinations" ON horse_vaccinations;
DROP POLICY IF EXISTS "Managers can update horse vaccinations" ON horse_vaccinations;
DROP POLICY IF EXISTS "Managers can delete horse vaccinations" ON horse_vaccinations;

CREATE POLICY "Permission-based insert horse vaccinations" ON horse_vaccinations
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update horse vaccinations" ON horse_vaccinations
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete horse vaccinations" ON horse_vaccinations
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));

-- --- vaccination_programs ---
DROP POLICY IF EXISTS "Managers can insert vaccination programs" ON vaccination_programs;
DROP POLICY IF EXISTS "Managers can update vaccination programs" ON vaccination_programs;
DROP POLICY IF EXISTS "Managers can delete vaccination programs" ON vaccination_programs;

CREATE POLICY "Permission-based insert vaccination programs" ON vaccination_programs
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based update vaccination programs" ON vaccination_programs
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'vet.manage'));

CREATE POLICY "Permission-based delete vaccination programs" ON vaccination_programs
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'vet.manage'));
