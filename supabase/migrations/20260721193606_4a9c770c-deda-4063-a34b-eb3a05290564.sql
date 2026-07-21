BEGIN;

ALTER TABLE public.products
  ADD CONSTRAINT products_tenant_id_id_key UNIQUE (tenant_id, id);

CREATE UNIQUE INDEX warehouses_default_per_branch_uidx
  ON public.warehouses (tenant_id, branch_id)
  WHERE is_default AND is_active AND branch_id IS NOT NULL;

CREATE UNIQUE INDEX warehouses_default_tenant_uidx
  ON public.warehouses (tenant_id)
  WHERE is_default AND is_active AND branch_id IS NULL;

ALTER TABLE public.tenant_services
  ADD COLUMN product_id uuid NULL;

ALTER TABLE public.tenant_services
  ADD CONSTRAINT tenant_services_product_fk
    FOREIGN KEY (tenant_id, product_id)
    REFERENCES public.products (tenant_id, id)
    ON DELETE RESTRICT;

CREATE INDEX tenant_services_product_idx
  ON public.tenant_services (tenant_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX inventory_movements_source_uidx
  ON public.inventory_movements (tenant_id, reference_type, reference_id, product_id, warehouse_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE INDEX stock_levels_tenant_product_warehouse_idx
  ON public.stock_levels (tenant_id, product_id, warehouse_id);

COMMIT;