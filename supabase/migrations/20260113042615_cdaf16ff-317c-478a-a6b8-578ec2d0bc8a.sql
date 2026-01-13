-- ==============================================
-- POS/Billing Permissions + billing_links + Inventory Foundation
-- ==============================================

-- 1) Add new permission definitions for POS, billing, lab, orders, inventory
INSERT INTO permission_definitions (key, module, resource, action, display_name, description, description_ar, is_delegatable)
VALUES
  -- POS permissions
  ('pos.session.open', 'pos', 'session', 'open', 'Open POS Session', 'Can open a new POS session', 'فتح جلسة نقطة بيع', true),
  ('pos.session.close', 'pos', 'session', 'close', 'Close POS Session', 'Can close a POS session', 'إغلاق جلسة نقطة بيع', true),
  ('pos.sale.create', 'pos', 'sale', 'create', 'Create POS Sale', 'Can create sales in POS', 'إنشاء عملية بيع', true),
  ('pos.discount.apply', 'pos', 'discount', 'apply', 'Apply POS Discount', 'Can apply discounts on POS sales', 'تطبيق خصم على المبيعات', true),
  
  -- Finance/billing permissions
  ('finance.invoice.create', 'finance', 'invoice', 'create', 'Create Invoices', 'Can create invoices', 'إنشاء فواتير', true),
  ('finance.payment.collect', 'finance', 'payment', 'collect', 'Collect Payments', 'Can collect payments', 'تحصيل مدفوعات', true),
  
  -- Lab billing permissions
  ('laboratory.billing.create', 'laboratory', 'billing', 'create', 'Create Lab Billing', 'Can create billing for lab samples', 'إنشاء فواتير المختبر', true),
  ('laboratory.billing.collect', 'laboratory', 'billing', 'collect', 'Collect Lab Payments', 'Can collect lab payments', 'تحصيل مدفوعات المختبر', true),
  ('laboratory.templates.manage', 'laboratory', 'templates', 'manage', 'Manage Lab Templates', 'Can create and edit lab templates', 'إدارة قوالب المختبر', true),
  
  -- Orders billing permissions
  ('orders.billing.create', 'orders', 'billing', 'create', 'Create Order Billing', 'Can create billing for orders', 'إنشاء فواتير الطلبات', true),
  ('orders.billing.collect', 'orders', 'billing', 'collect', 'Collect Order Payments', 'Can collect order payments', 'تحصيل مدفوعات الطلبات', true),
  
  -- Inventory permissions
  ('inventory.products.view', 'inventory', 'products', 'view', 'View Products', 'Can view products catalog', 'عرض المنتجات', true),
  ('inventory.products.manage', 'inventory', 'products', 'manage', 'Manage Products', 'Can create and edit products', 'إدارة المنتجات', true),
  ('inventory.stock.view', 'inventory', 'stock', 'view', 'View Stock', 'Can view stock levels', 'عرض المخزون', true),
  ('inventory.stock.manage', 'inventory', 'stock', 'manage', 'Manage Stock', 'Can adjust stock levels', 'إدارة المخزون', true)
ON CONFLICT (key) DO NOTHING;

-- 2) Create billing_links table for unified invoice linking
CREATE TABLE IF NOT EXISTS public.billing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'lab_sample', 'lab_request', 'horse_order', 'housing_occupancy', etc.
  source_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  link_kind TEXT NOT NULL CHECK (link_kind IN ('deposit', 'final', 'refund', 'credit_note')),
  amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Indexes for billing_links
CREATE INDEX IF NOT EXISTS idx_billing_links_tenant_source ON public.billing_links(tenant_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_billing_links_invoice ON public.billing_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_links_tenant ON public.billing_links(tenant_id);

-- Enable RLS on billing_links
ALTER TABLE public.billing_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_links
CREATE POLICY "Tenant members can view billing links"
  ON public.billing_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_links.tenant_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can insert billing links"
  ON public.billing_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_links.tenant_id
        AND tm.user_id = auth.uid()
    )
  );

-- 3) Inventory Foundation Tables

-- 3.1 Product categories
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  parent_id UUID REFERENCES public.product_categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON public.product_categories(tenant_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view categories"
  ON public.product_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = product_categories.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage categories"
  ON public.product_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = product_categories.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.2 Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view suppliers"
  ON public.suppliers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = suppliers.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage suppliers"
  ON public.suppliers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = suppliers.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.3 Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON public.warehouses(tenant_id);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view warehouses"
  ON public.warehouses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = warehouses.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage warehouses"
  ON public.warehouses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = warehouses.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.4 Measurement units
CREATE TABLE IF NOT EXISTS public.measurement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  abbreviation TEXT NOT NULL,
  abbreviation_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measurement_units_tenant ON public.measurement_units(tenant_id);

ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view units"
  ON public.measurement_units FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = measurement_units.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage units"
  ON public.measurement_units FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = measurement_units.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.5 Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  unit_id UUID REFERENCES public.measurement_units(id),
  
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  
  sku TEXT,
  barcode TEXT,
  
  product_type TEXT NOT NULL DEFAULT 'item' CHECK (product_type IN ('item', 'service', 'composite')),
  
  purchase_price DECIMAL(12, 2),
  selling_price DECIMAL(12, 2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  min_stock_level DECIMAL(12, 3) DEFAULT 0,
  reorder_point DECIMAL(12, 3) DEFAULT 0,
  
  expiry_tracking BOOLEAN NOT NULL DEFAULT false,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(tenant_id, barcode);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view products"
  ON public.products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = products.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage products"
  ON public.products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = products.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.6 Inventory movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_in', 'sale_out', 'transfer_in', 'transfer_out',
    'adjustment_in', 'adjustment_out', 'expired', 'returned', 'initial'
  )),
  
  quantity DECIMAL(12, 3) NOT NULL,
  unit_cost DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  
  reference_type TEXT, -- 'invoice', 'purchase_order', 'adjustment', etc.
  reference_id UUID,
  
  batch_number TEXT,
  expiry_date DATE,
  
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON public.inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON public.inventory_movements(warehouse_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view movements"
  ON public.inventory_movements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = inventory_movements.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage movements"
  ON public.inventory_movements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = inventory_movements.tenant_id AND tm.user_id = auth.uid()
  ));

-- 3.7 Stock levels (denormalized for performance)
CREATE TABLE IF NOT EXISTS public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  
  quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(12, 3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  
  last_movement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant ON public.stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON public.stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON public.stock_levels(warehouse_id);

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view stock"
  ON public.stock_levels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = stock_levels.tenant_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant members can manage stock"
  ON public.stock_levels FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = stock_levels.tenant_id AND tm.user_id = auth.uid()
  ));