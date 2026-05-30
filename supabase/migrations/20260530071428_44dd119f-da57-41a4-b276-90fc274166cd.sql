CREATE OR REPLACE FUNCTION public.can_manage_inventory(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = _user_id
      AND tm.tenant_id = _tenant_id
      AND tm.is_active = true
      AND tm.role IN ('owner', 'manager')
  ) OR public.has_permission(_user_id, _tenant_id, 'inventory.manage');
END;
$$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  category text NOT NULL DEFAULT 'other',
  unit text NOT NULL DEFAULT 'unit',
  sku text,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  current_quantity numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric,
  default_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL DEFAULT 'stock_in',
  quantity numeric NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  reference_type text,
  reference_id uuid,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  notes text,
  performed_by uuid DEFAULT auth.uid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON public.inventory_items(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_item ON public.inventory_transactions(item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_tenant ON public.inventory_transactions(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_reference ON public.inventory_transactions(reference_type, reference_id);

CREATE OR REPLACE FUNCTION public.sync_inventory_item_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  UPDATE public.inventory_items
  SET current_quantity = COALESCE(
        (SELECT SUM(quantity) FROM public.inventory_transactions WHERE item_id = v_item_id), 0),
      updated_at = now()
  WHERE id = v_item_id;
  IF TG_OP = 'UPDATE' AND NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    UPDATE public.inventory_items
    SET current_quantity = COALESCE(
          (SELECT SUM(quantity) FROM public.inventory_transactions WHERE item_id = OLD.item_id), 0),
        updated_at = now()
    WHERE id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_quantity ON public.inventory_transactions;
CREATE TRIGGER trg_sync_inventory_quantity
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_item_quantity();

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view inventory items" ON public.inventory_items;
CREATE POLICY "Members can view inventory items"
  ON public.inventory_items FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can manage inventory items" ON public.inventory_items;
CREATE POLICY "Managers can manage inventory items"
  ON public.inventory_items FOR ALL
  USING (can_manage_inventory(auth.uid(), tenant_id))
  WITH CHECK (can_manage_inventory(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Members can view inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Members can view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can manage inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Managers can manage inventory transactions"
  ON public.inventory_transactions FOR ALL
  USING (can_manage_inventory(auth.uid(), tenant_id))
  WITH CHECK (can_manage_inventory(auth.uid(), tenant_id));

INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('inventory.view',   'inventory', 'inventory', 'view',   'View Inventory',   'عرض المخزون',  'View stock items, suppliers and transactions', 'عرض أصناف المخزون والموردين والحركات', true),
  ('inventory.manage', 'inventory', 'inventory', 'manage', 'Manage Inventory', 'إدارة المخزون', 'Add, edit and adjust stock items and transactions', 'إضافة وتعديل وتسوية أصناف المخزون والحركات', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, perm.key, true
FROM public.tenant_roles tr
CROSS JOIN (VALUES ('inventory.view'), ('inventory.manage')) AS perm(key)
WHERE tr.name IN ('owner', 'manager')
ON CONFLICT DO NOTHING;