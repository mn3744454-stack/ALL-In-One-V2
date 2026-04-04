
-- ============================================================
-- PHASE 3 BATCH 4A: Services Domain Migration
-- ============================================================

-- --- tenant_services ---
DROP POLICY IF EXISTS "Owners and admins can insert services" ON tenant_services;
DROP POLICY IF EXISTS "Owners and admins can update services" ON tenant_services;
DROP POLICY IF EXISTS "Owners and admins can delete services" ON tenant_services;

CREATE POLICY "Permission-based insert tenant services" ON tenant_services
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'services.manage'));

CREATE POLICY "Permission-based update tenant services" ON tenant_services
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'services.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'services.manage'));

CREATE POLICY "Permission-based delete tenant services" ON tenant_services
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'services.manage'));
