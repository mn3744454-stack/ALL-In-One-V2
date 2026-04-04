
-- ============================================================
-- PHASE 3 BATCH 4B: Finance Domain Migration
-- ============================================================

-- ============================================================
-- 1. INVOICES (granular: create/edit/delete)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Managers can update invoices" ON invoices;
DROP POLICY IF EXISTS "Managers can delete invoices" ON invoices;

CREATE POLICY "Permission-based insert invoices" ON invoices
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.create'));

CREATE POLICY "Permission-based update invoices" ON invoices
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

CREATE POLICY "Permission-based delete invoices" ON invoices
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.delete'));

-- ============================================================
-- 2. INVOICE ITEMS (governed by invoice edit permission, via JOIN)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Managers can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Managers can delete invoice items" ON invoice_items;

CREATE POLICY "Permission-based insert invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_permission(auth.uid(), i.tenant_id, 'finance.invoice.edit')
    )
  );

CREATE POLICY "Permission-based update invoice items" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_permission(auth.uid(), i.tenant_id, 'finance.invoice.edit')
    )
  );

CREATE POLICY "Permission-based delete invoice items" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_items.invoice_id
        AND has_permission(auth.uid(), i.tenant_id, 'finance.invoice.edit')
    )
  );

-- ============================================================
-- 3. EXPENSES (create vs manage for edit/delete)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can update expenses" ON expenses;
DROP POLICY IF EXISTS "Managers can delete expenses" ON expenses;

CREATE POLICY "Permission-based insert expenses" ON expenses
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.expenses.create'));

CREATE POLICY "Permission-based update expenses" ON expenses
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.expenses.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.expenses.manage'));

CREATE POLICY "Permission-based delete expenses" ON expenses
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.expenses.manage'));

-- ============================================================
-- 4. SUPPLIER PAYABLES
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert payables" ON supplier_payables;
DROP POLICY IF EXISTS "Managers can update payables" ON supplier_payables;
DROP POLICY IF EXISTS "Managers can delete payables" ON supplier_payables;

CREATE POLICY "Permission-based insert supplier payables" ON supplier_payables
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.payables.manage'));

CREATE POLICY "Permission-based update supplier payables" ON supplier_payables
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.payables.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.payables.manage'));

CREATE POLICY "Permission-based delete supplier payables" ON supplier_payables
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.payables.manage'));

-- ============================================================
-- 5. CUSTOM FINANCIAL CATEGORIES (finance settings)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert financial categories" ON custom_financial_categories;
DROP POLICY IF EXISTS "Managers can update financial categories" ON custom_financial_categories;
DROP POLICY IF EXISTS "Managers can delete financial categories" ON custom_financial_categories;

CREATE POLICY "Permission-based insert financial categories" ON custom_financial_categories
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.settings.manage'));

CREATE POLICY "Permission-based update financial categories" ON custom_financial_categories
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.settings.manage'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.settings.manage'));

CREATE POLICY "Permission-based delete financial categories" ON custom_financial_categories
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.settings.manage'));

-- ============================================================
-- 6. FINANCIAL ENTRIES (workflow side-effect of billing)
-- ============================================================

DROP POLICY IF EXISTS "Managers can insert financial entries" ON financial_entries;
DROP POLICY IF EXISTS "Managers can update financial entries" ON financial_entries;
DROP POLICY IF EXISTS "Managers can delete financial entries" ON financial_entries;

CREATE POLICY "Permission-based insert financial entries" ON financial_entries
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

CREATE POLICY "Permission-based update financial entries" ON financial_entries
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

CREATE POLICY "Permission-based delete financial entries" ON financial_entries
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

-- ============================================================
-- 7. CUSTOMER BALANCES (system-managed via invoice approval)
-- ============================================================

DROP POLICY IF EXISTS "Managers can manage balances" ON customer_balances;

CREATE POLICY "Permission-based insert customer balances" ON customer_balances
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

CREATE POLICY "Permission-based update customer balances" ON customer_balances
  FOR UPDATE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

CREATE POLICY "Permission-based delete customer balances" ON customer_balances
  FOR DELETE USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

-- ============================================================
-- 8. LEDGER ENTRIES (system-generated; cleanup duplicate INSERT)
-- ============================================================

-- Remove both legacy INSERT policies
DROP POLICY IF EXISTS "Managers can create ledger entries" ON ledger_entries;
DROP POLICY IF EXISTS "Managers can insert ledger entries" ON ledger_entries;

CREATE POLICY "Permission-based insert ledger entries" ON ledger_entries
  FOR INSERT WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'));

-- ============================================================
-- 9. PAYMENT INTENTS (mixed: user self-service + manager)
-- Only migrate the manager update policy; user policies stay.
-- ============================================================

DROP POLICY IF EXISTS "Tenant managers can update tenant payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Tenant managers can view tenant payment intents" ON payment_intents;

CREATE POLICY "Permission-based update payment intents" ON payment_intents
  FOR UPDATE USING (
    (tenant_id IS NOT NULL AND has_permission(auth.uid(), tenant_id, 'finance.payment.create'))
  );

CREATE POLICY "Permission-based view tenant payment intents" ON payment_intents
  FOR SELECT USING (
    (tenant_id IS NOT NULL AND has_permission(auth.uid(), tenant_id, 'finance.payment.view'))
  );

-- ============================================================
-- 10. PAYMENT SPLITS (governed by payment intent parent)
-- ============================================================

DROP POLICY IF EXISTS "Tenant managers can create payment splits" ON payment_splits;

CREATE POLICY "Permission-based insert payment splits" ON payment_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM payment_intents pi
      WHERE pi.id = payment_splits.payment_intent_id
        AND has_permission(auth.uid(), pi.tenant_id, 'finance.payment.create')
    )
  );
