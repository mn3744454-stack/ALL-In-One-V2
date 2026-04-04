
-- 1. Add orders.manage permission key
INSERT INTO permission_definitions (key, module, resource, action, display_name, display_name_ar, description, is_delegatable)
VALUES ('orders.manage', 'orders', 'orders', 'manage', 'Manage Orders', 'إدارة الطلبات', 'Create, edit, and delete operational orders', true)
ON CONFLICT (key) DO NOTHING;

-- 2. Backfill orders.manage to owner and manager roles
INSERT INTO tenant_role_permissions (tenant_id, role_key, permission_key, granted, created_by)
SELECT t.id, r.role_key, 'orders.manage', true, NULL
FROM tenants t
CROSS JOIN (VALUES ('owner'), ('manager')) AS r(role_key)
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_role_permissions trp
  WHERE trp.tenant_id = t.id AND trp.role_key = r.role_key AND trp.permission_key = 'orders.manage'
);

-- 3. HORSE ORDERS
DROP POLICY IF EXISTS "Managers can insert orders" ON horse_orders;
CREATE POLICY "Permission-based insert horse orders"
  ON horse_orders FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'orders.manage'));

DROP POLICY IF EXISTS "Managers can update orders" ON horse_orders;
CREATE POLICY "Permission-based update horse orders"
  ON horse_orders FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'orders.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'orders.manage'));

DROP POLICY IF EXISTS "Managers can delete orders" ON horse_orders;
CREATE POLICY "Permission-based delete horse orders"
  ON horse_orders FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'orders.manage'));

-- 4. HORSE ORDER TYPES
DROP POLICY IF EXISTS "Managers can insert order types" ON horse_order_types;
CREATE POLICY "Permission-based insert horse order types"
  ON horse_order_types FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'orders.manage'));

DROP POLICY IF EXISTS "Managers can update order types" ON horse_order_types;
CREATE POLICY "Permission-based update horse order types"
  ON horse_order_types FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'orders.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'orders.manage'));

DROP POLICY IF EXISTS "Managers can delete order types" ON horse_order_types;
CREATE POLICY "Permission-based delete horse order types"
  ON horse_order_types FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'orders.manage'));

-- 5. HORSE ORDER EVENTS
DROP POLICY IF EXISTS "Managers can insert order events" ON horse_order_events;
CREATE POLICY "Permission-based insert horse order events"
  ON horse_order_events FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'orders.manage'));

-- 6. SERVICE PROVIDERS
DROP POLICY IF EXISTS "Managers can insert service providers" ON service_providers;
CREATE POLICY "Permission-based insert service providers"
  ON service_providers FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'services.manage'));

DROP POLICY IF EXISTS "Managers can update service providers" ON service_providers;
CREATE POLICY "Permission-based update service providers"
  ON service_providers FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'services.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'services.manage'));

DROP POLICY IF EXISTS "Managers can delete service providers" ON service_providers;
CREATE POLICY "Permission-based delete service providers"
  ON service_providers FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'services.manage'));

-- 7. TENANT CAPABILITIES
DROP POLICY IF EXISTS "Managers can insert capabilities" ON tenant_capabilities;
CREATE POLICY "Permission-based insert tenant capabilities"
  ON tenant_capabilities FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'admin.settings.manage'));

DROP POLICY IF EXISTS "Managers can update capabilities" ON tenant_capabilities;
CREATE POLICY "Permission-based update tenant capabilities"
  ON tenant_capabilities FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'admin.settings.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'admin.settings.manage'));

DROP POLICY IF EXISTS "Managers can delete capabilities" ON tenant_capabilities;
CREATE POLICY "Permission-based delete tenant capabilities"
  ON tenant_capabilities FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'admin.settings.manage'));
