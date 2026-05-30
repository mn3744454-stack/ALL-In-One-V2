
-- Drop old policies first (they depend on can_manage_inventory)
DROP POLICY IF EXISTS "Members can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Managers can manage inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Members can view inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Managers can manage inventory transactions" ON public.inventory_transactions;

-- 1. Recreate can_manage_inventory using has_permission only
CREATE OR REPLACE FUNCTION public.can_manage_inventory(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission(_user_id, _tenant_id, 'inventory.manage');
$$;

-- 2. New view function
CREATE OR REPLACE FUNCTION public.can_view_inventory(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission(_user_id, _tenant_id, 'inventory.view');
$$;

-- 3. Add is_archived
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inventory_items_archived
  ON public.inventory_items(tenant_id, is_archived);

-- 4. New policies on inventory_items
CREATE POLICY "Inventory items: view"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (public.can_view_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory items: insert"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory items: update"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (public.can_manage_inventory(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory items: delete"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (public.can_manage_inventory(auth.uid(), tenant_id));

-- 5. New policies on inventory_transactions
CREATE POLICY "Inventory tx: view"
  ON public.inventory_transactions FOR SELECT
  TO authenticated
  USING (public.can_view_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory tx: insert"
  ON public.inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory tx: update"
  ON public.inventory_transactions FOR UPDATE
  TO authenticated
  USING (public.can_manage_inventory(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_inventory(auth.uid(), tenant_id));

CREATE POLICY "Inventory tx: delete"
  ON public.inventory_transactions FOR DELETE
  TO authenticated
  USING (public.can_manage_inventory(auth.uid(), tenant_id));

-- 6. Tenant parity trigger
CREATE OR REPLACE FUNCTION public.enforce_inventory_tx_tenant_parity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_item_tenant
  FROM public.inventory_items
  WHERE id = NEW.item_id;

  IF v_item_tenant IS NULL THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.item_id;
  END IF;

  IF v_item_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Tenant mismatch: transaction tenant % does not match item tenant %', NEW.tenant_id, v_item_tenant;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_tx_tenant_parity ON public.inventory_transactions;
CREATE TRIGGER trg_inventory_tx_tenant_parity
  BEFORE INSERT OR UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_inventory_tx_tenant_parity();

-- 7. Realtime
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='inventory_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='inventory_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
  END IF;
END $$;
