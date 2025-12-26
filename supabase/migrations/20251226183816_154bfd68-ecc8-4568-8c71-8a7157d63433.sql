-- Add assigned_to column to horse_orders
ALTER TABLE horse_orders 
ADD COLUMN assigned_to uuid REFERENCES profiles(id);

-- Create custom_financial_categories table
CREATE TABLE custom_financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  description text,
  category_type text NOT NULL CHECK (category_type IN ('income', 'expense')),
  parent_id uuid REFERENCES custom_financial_categories(id),
  account_code text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_financial_categories ENABLE ROW LEVEL SECURITY;

-- Members can view categories
CREATE POLICY "Members can view financial categories" 
ON custom_financial_categories
FOR SELECT 
USING (is_tenant_member(auth.uid(), tenant_id));

-- Managers can insert categories
CREATE POLICY "Managers can insert financial categories" 
ON custom_financial_categories
FOR INSERT 
WITH CHECK (can_manage_orders(auth.uid(), tenant_id));

-- Managers can update categories
CREATE POLICY "Managers can update financial categories" 
ON custom_financial_categories
FOR UPDATE 
USING (can_manage_orders(auth.uid(), tenant_id));

-- Managers can delete categories
CREATE POLICY "Managers can delete financial categories" 
ON custom_financial_categories
FOR DELETE 
USING (can_manage_orders(auth.uid(), tenant_id));