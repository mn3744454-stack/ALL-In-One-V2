-- products
DROP POLICY IF EXISTS "Tenant members can manage products" ON public.products;
DROP POLICY IF EXISTS "Tenant members can view products" ON public.products;
CREATE POLICY "Active members can view products" ON public.products FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage products" ON public.products FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- warehouses
DROP POLICY IF EXISTS "Tenant members can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Tenant members can view warehouses" ON public.warehouses;
CREATE POLICY "Active members can view warehouses" ON public.warehouses FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage warehouses" ON public.warehouses FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- stock_levels
DROP POLICY IF EXISTS "Tenant members can manage stock" ON public.stock_levels;
DROP POLICY IF EXISTS "Tenant members can view stock" ON public.stock_levels;
CREATE POLICY "Active members can view stock" ON public.stock_levels FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage stock" ON public.stock_levels FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- suppliers
DROP POLICY IF EXISTS "Tenant members can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Tenant members can view suppliers" ON public.suppliers;
CREATE POLICY "Active members can view suppliers" ON public.suppliers FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage suppliers" ON public.suppliers FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- inventory_movements
DROP POLICY IF EXISTS "Tenant members can manage movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Tenant members can view movements" ON public.inventory_movements;
CREATE POLICY "Active members can view movements" ON public.inventory_movements FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage movements" ON public.inventory_movements FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- measurement_units
DROP POLICY IF EXISTS "Tenant members can manage units" ON public.measurement_units;
DROP POLICY IF EXISTS "Tenant members can view units" ON public.measurement_units;
CREATE POLICY "Active members can view units" ON public.measurement_units FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage units" ON public.measurement_units FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- product_categories
DROP POLICY IF EXISTS "Tenant members can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Tenant members can view categories" ON public.product_categories;
CREATE POLICY "Active members can view categories" ON public.product_categories FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can manage categories" ON public.product_categories FOR ALL USING (is_active_tenant_member(auth.uid(), tenant_id)) WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- billing_links
DROP POLICY IF EXISTS "Tenant members can insert billing links" ON public.billing_links;
DROP POLICY IF EXISTS "Tenant members can view billing links" ON public.billing_links;
CREATE POLICY "Active members can view billing links" ON public.billing_links FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can insert billing links" ON public.billing_links FOR INSERT WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id));

-- horse_classification_changes
DROP POLICY IF EXISTS "Tenant members can insert classification changes" ON public.horse_classification_changes;
DROP POLICY IF EXISTS "Tenant members can view classification changes" ON public.horse_classification_changes;
CREATE POLICY "Active members can view classification changes" ON public.horse_classification_changes FOR SELECT USING (is_active_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Active members can insert classification changes" ON public.horse_classification_changes FOR INSERT WITH CHECK (is_active_tenant_member(auth.uid(), tenant_id) AND changed_by = auth.uid());

-- delegation_audit_log: remove client INSERT (rely on SECURITY DEFINER triggers)
DROP POLICY IF EXISTS "Members can insert audit log" ON public.delegation_audit_log;

-- lab_services: restrict writes to lab managers
DROP POLICY IF EXISTS lab_services_insert_own ON public.lab_services;
DROP POLICY IF EXISTS lab_services_update_own ON public.lab_services;
DROP POLICY IF EXISTS lab_services_delete_own ON public.lab_services;
CREATE POLICY lab_services_insert_managers ON public.lab_services FOR INSERT WITH CHECK (can_manage_lab(auth.uid(), tenant_id));
CREATE POLICY lab_services_update_managers ON public.lab_services FOR UPDATE USING (can_manage_lab(auth.uid(), tenant_id)) WITH CHECK (can_manage_lab(auth.uid(), tenant_id));
CREATE POLICY lab_services_delete_managers ON public.lab_services FOR DELETE USING (can_manage_lab(auth.uid(), tenant_id));