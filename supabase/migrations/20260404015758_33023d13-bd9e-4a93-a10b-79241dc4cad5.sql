
-- ============================================================
-- PHASE 3 BATCH 1: Backend Permission Enforcement Migration
-- Domains: Breeding, Clients, HR
-- Pattern: Replace can_manage_orders / can_manage_hr with has_permission()
-- Read policies (SELECT) are NOT changed.
-- ============================================================

-- ============================================================
-- 1. BREEDING DOMAIN (9 tables)
-- ============================================================

-- --- breeding_attempts ---
DROP POLICY IF EXISTS "Managers can insert breeding attempts" ON breeding_attempts;
DROP POLICY IF EXISTS "Managers can update breeding attempts" ON breeding_attempts;
DROP POLICY IF EXISTS "Managers can delete breeding attempts" ON breeding_attempts;

CREATE POLICY "Permission-based insert breeding attempts" ON breeding_attempts
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update breeding attempts" ON breeding_attempts
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete breeding attempts" ON breeding_attempts
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- breeding_contracts ---
DROP POLICY IF EXISTS "Managers can insert breeding contracts" ON breeding_contracts;
DROP POLICY IF EXISTS "Managers can update breeding contracts" ON breeding_contracts;
DROP POLICY IF EXISTS "Managers can delete breeding contracts" ON breeding_contracts;

CREATE POLICY "Permission-based insert breeding contracts" ON breeding_contracts
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update breeding contracts" ON breeding_contracts
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete breeding contracts" ON breeding_contracts
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- breeding_events (INSERT only — audit log) ---
DROP POLICY IF EXISTS "Managers can insert breeding events" ON breeding_events;

CREATE POLICY "Permission-based insert breeding events" ON breeding_events
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- embryo_transfers ---
DROP POLICY IF EXISTS "Managers can insert embryo transfers" ON embryo_transfers;
DROP POLICY IF EXISTS "Managers can update embryo transfers" ON embryo_transfers;
DROP POLICY IF EXISTS "Managers can delete embryo transfers" ON embryo_transfers;

CREATE POLICY "Permission-based insert embryo transfers" ON embryo_transfers
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update embryo transfers" ON embryo_transfers
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete embryo transfers" ON embryo_transfers
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- foalings ---
DROP POLICY IF EXISTS "Managers can insert foalings" ON foalings;
DROP POLICY IF EXISTS "Managers can update foalings" ON foalings;
DROP POLICY IF EXISTS "Managers can delete foalings" ON foalings;

CREATE POLICY "Permission-based insert foalings" ON foalings
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update foalings" ON foalings
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete foalings" ON foalings
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- pregnancies ---
DROP POLICY IF EXISTS "Managers can insert pregnancies" ON pregnancies;
DROP POLICY IF EXISTS "Managers can update pregnancies" ON pregnancies;
DROP POLICY IF EXISTS "Managers can delete pregnancies" ON pregnancies;

CREATE POLICY "Permission-based insert pregnancies" ON pregnancies
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update pregnancies" ON pregnancies
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete pregnancies" ON pregnancies
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- pregnancy_checks (INSERT only) ---
DROP POLICY IF EXISTS "Managers can insert pregnancy checks" ON pregnancy_checks;

CREATE POLICY "Permission-based insert pregnancy checks" ON pregnancy_checks
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- semen_batches ---
DROP POLICY IF EXISTS "Managers can insert semen batches" ON semen_batches;
DROP POLICY IF EXISTS "Managers can update semen batches" ON semen_batches;
DROP POLICY IF EXISTS "Managers can delete semen batches" ON semen_batches;

CREATE POLICY "Permission-based insert semen batches" ON semen_batches
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update semen batches" ON semen_batches
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete semen batches" ON semen_batches
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- --- semen_tanks ---
DROP POLICY IF EXISTS "Managers can insert semen tanks" ON semen_tanks;
DROP POLICY IF EXISTS "Managers can update semen tanks" ON semen_tanks;
DROP POLICY IF EXISTS "Managers can delete semen tanks" ON semen_tanks;

CREATE POLICY "Permission-based insert semen tanks" ON semen_tanks
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based update semen tanks" ON semen_tanks
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

CREATE POLICY "Permission-based delete semen tanks" ON semen_tanks
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'breeding.manage'));

-- ============================================================
-- 2. CLIENTS DOMAIN (1 table, granular keys)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert clients" ON clients;
DROP POLICY IF EXISTS "Managers can update clients" ON clients;
DROP POLICY IF EXISTS "Managers can delete clients" ON clients;

CREATE POLICY "Permission-based insert clients" ON clients
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'clients.create'));

CREATE POLICY "Permission-based update clients" ON clients
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'clients.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'clients.edit'));

CREATE POLICY "Permission-based delete clients" ON clients
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'clients.delete'));

-- ============================================================
-- 3. HR DOMAIN (3 tables)
-- ============================================================

-- --- hr_assignments ---
DROP POLICY IF EXISTS "Managers can insert assignments" ON hr_assignments;
DROP POLICY IF EXISTS "Managers can update assignments" ON hr_assignments;
DROP POLICY IF EXISTS "Managers can delete assignments" ON hr_assignments;

CREATE POLICY "Permission-based insert hr assignments" ON hr_assignments
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

CREATE POLICY "Permission-based update hr assignments" ON hr_assignments
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'hr.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

CREATE POLICY "Permission-based delete hr assignments" ON hr_assignments
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'hr.manage'));

-- --- hr_employees ---
DROP POLICY IF EXISTS "Managers can insert hr employees" ON hr_employees;
DROP POLICY IF EXISTS "Managers can update hr employees" ON hr_employees;

CREATE POLICY "Permission-based insert hr employees" ON hr_employees
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

CREATE POLICY "Permission-based update hr employees" ON hr_employees
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'hr.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

-- --- hr_settings ---
DROP POLICY IF EXISTS "Managers can manage hr settings" ON hr_settings;

CREATE POLICY "Permission-based insert hr settings" ON hr_settings
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

CREATE POLICY "Permission-based update hr settings" ON hr_settings
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'hr.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'hr.manage'));

CREATE POLICY "Permission-based delete hr settings" ON hr_settings
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'hr.manage'));
