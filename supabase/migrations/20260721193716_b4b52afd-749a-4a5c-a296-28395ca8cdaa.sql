CREATE OR REPLACE FUNCTION public._finance_stock_apply_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sign        int;
  v_prod_tenant uuid;
  v_wh_tenant   uuid;
  v_new_qty     numeric(12,3);
BEGIN
  SELECT tenant_id INTO v_prod_tenant FROM public.products WHERE id = NEW.product_id;
  SELECT tenant_id INTO v_wh_tenant   FROM public.warehouses WHERE id = NEW.warehouse_id;
  IF v_prod_tenant IS DISTINCT FROM NEW.tenant_id
     OR v_wh_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'FIN_STOCK_TENANT_PARITY' USING ERRCODE = '22023';
  END IF;

  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'FIN_STOCK_QUANTITY_INVALID' USING ERRCODE = '22023';
  END IF;

  v_sign := CASE NEW.movement_type
              WHEN 'purchase_in'    THEN  1
              WHEN 'transfer_in'    THEN  1
              WHEN 'adjustment_in'  THEN  1
              WHEN 'returned'       THEN  1
              WHEN 'initial'        THEN  1
              WHEN 'sale_out'       THEN -1
              WHEN 'transfer_out'   THEN -1
              WHEN 'adjustment_out' THEN -1
              WHEN 'expired'        THEN -1
              ELSE NULL
            END;
  IF v_sign IS NULL THEN
    RAISE EXCEPTION 'FIN_STOCK_MOVEMENT_TYPE_INVALID' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stock_levels
    (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, last_movement_at, updated_at)
  VALUES
    (gen_random_uuid(), NEW.tenant_id, NEW.product_id, NEW.warehouse_id,
     v_sign * NEW.quantity, 0, NEW.created_at, now())
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity         = public.stock_levels.quantity + v_sign * NEW.quantity,
    last_movement_at = GREATEST(public.stock_levels.last_movement_at, NEW.created_at),
    updated_at       = now()
  RETURNING quantity INTO v_new_qty;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'FIN_STOCK_NEGATIVE' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public._finance_stock_apply_movement() FROM PUBLIC;
ALTER FUNCTION public._finance_stock_apply_movement() OWNER TO postgres;

CREATE TRIGGER trg_stock_levels_apply_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public._finance_stock_apply_movement();