-- Phase 1: Critical RLS Write-Access Containment
-- Replace overly broad is_tenant_member / is_active_tenant_member write policies
-- with can_manage_orders (owner/manager only) on sensitive tables.
-- SELECT policies remain unchanged (tenant-scoped reads are safe).

-- 1. FOALINGS
DROP POLICY IF EXISTS "Tenant members can insert foalings" ON public.foalings;
DROP POLICY IF EXISTS "Tenant members can update foalings" ON public.foalings;
DROP POLICY IF EXISTS "Tenant members can delete foalings" ON public.foalings;

CREATE POLICY "Managers can insert foalings" ON public.foalings
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can update foalings" ON public.foalings
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete foalings" ON public.foalings
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 2. BREEDING_CONTRACTS
DROP POLICY IF EXISTS "Tenant members can insert breeding contracts" ON public.breeding_contracts;
DROP POLICY IF EXISTS "Tenant members can update breeding contracts" ON public.breeding_contracts;
DROP POLICY IF EXISTS "Tenant members can delete breeding contracts" ON public.breeding_contracts;

CREATE POLICY "Managers can insert breeding contracts" ON public.breeding_contracts
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can update breeding contracts" ON public.breeding_contracts
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete breeding contracts" ON public.breeding_contracts
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 3. DOCTOR_CONSULTATIONS
DROP POLICY IF EXISTS "doctor_consultations_insert" ON public.doctor_consultations;
DROP POLICY IF EXISTS "doctor_consultations_update" ON public.doctor_consultations;
DROP POLICY IF EXISTS "doctor_consultations_delete" ON public.doctor_consultations;

CREATE POLICY "doctor_consultations_insert" ON public.doctor_consultations
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_consultations_update" ON public.doctor_consultations
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_consultations_delete" ON public.doctor_consultations
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 4. DOCTOR_PATIENTS
DROP POLICY IF EXISTS "doctor_patients_insert" ON public.doctor_patients;
DROP POLICY IF EXISTS "doctor_patients_update" ON public.doctor_patients;
DROP POLICY IF EXISTS "doctor_patients_delete" ON public.doctor_patients;

CREATE POLICY "doctor_patients_insert" ON public.doctor_patients
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_patients_update" ON public.doctor_patients
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_patients_delete" ON public.doctor_patients
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 5. DOCTOR_PRESCRIPTIONS
DROP POLICY IF EXISTS "doctor_prescriptions_insert" ON public.doctor_prescriptions;
DROP POLICY IF EXISTS "doctor_prescriptions_update" ON public.doctor_prescriptions;
DROP POLICY IF EXISTS "doctor_prescriptions_delete" ON public.doctor_prescriptions;

CREATE POLICY "doctor_prescriptions_insert" ON public.doctor_prescriptions
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_prescriptions_update" ON public.doctor_prescriptions
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_prescriptions_delete" ON public.doctor_prescriptions
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 6. DOCTOR_FOLLOWUPS
DROP POLICY IF EXISTS "doctor_followups_insert" ON public.doctor_followups;
DROP POLICY IF EXISTS "doctor_followups_update" ON public.doctor_followups;
DROP POLICY IF EXISTS "doctor_followups_delete" ON public.doctor_followups;

CREATE POLICY "doctor_followups_insert" ON public.doctor_followups
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_followups_update" ON public.doctor_followups
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_followups_delete" ON public.doctor_followups
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 7. DOCTOR_SERVICES
DROP POLICY IF EXISTS "doctor_services_insert" ON public.doctor_services;
DROP POLICY IF EXISTS "doctor_services_update" ON public.doctor_services;
DROP POLICY IF EXISTS "doctor_services_delete" ON public.doctor_services;

CREATE POLICY "doctor_services_insert" ON public.doctor_services
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_services_update" ON public.doctor_services
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "doctor_services_delete" ON public.doctor_services
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));

-- 8. SUPPLIER_PAYABLES
DROP POLICY IF EXISTS "Tenant members can insert payables" ON public.supplier_payables;
DROP POLICY IF EXISTS "Tenant members can update payables" ON public.supplier_payables;
DROP POLICY IF EXISTS "Tenant members can delete payables" ON public.supplier_payables;

CREATE POLICY "Managers can insert payables" ON public.supplier_payables
  FOR INSERT WITH CHECK (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can update payables" ON public.supplier_payables
  FOR UPDATE USING (can_manage_orders(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete payables" ON public.supplier_payables
  FOR DELETE USING (can_manage_orders(auth.uid(), tenant_id));