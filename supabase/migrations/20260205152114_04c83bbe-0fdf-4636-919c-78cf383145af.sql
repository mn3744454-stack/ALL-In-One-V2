-- PHASE 1: Enhance ledger_entries for split-tender payments

ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS payment_session_id uuid;

-- Idempotency for invoice posting
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_invoice_idempotent 
ON public.ledger_entries (tenant_id, reference_type, reference_id) 
WHERE entry_type = 'invoice' AND reference_type = 'invoice';

-- Payments-by-invoice (partial index)
CREATE INDEX IF NOT EXISTS idx_ledger_payments_by_invoice
ON public.ledger_entries (tenant_id, reference_type, reference_id, created_at)
WHERE entry_type = 'payment' AND reference_type = 'invoice';

-- Client statement index (optionally include entry_type)
CREATE INDEX IF NOT EXISTS idx_ledger_client_statement 
ON public.ledger_entries (tenant_id, client_id, created_at);

-- PHASE 1B: Add missing permission definitions

INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, is_delegatable)
VALUES
  ('clients.view', 'clients', 'clients', 'view', 'View Clients', 'عرض العملاء', true),
  ('clients.create', 'clients', 'clients', 'create', 'Create Client', 'إنشاء عميل', true),
  ('clients.edit', 'clients', 'clients', 'edit', 'Edit Client', 'تعديل عميل', true),
  ('clients.delete', 'clients', 'clients', 'delete', 'Delete Client', 'حذف عميل', false),
  ('clients.statement.view', 'clients', 'statement', 'view', 'View Client Statement', 'عرض كشف حساب العميل', true),
  ('clients.statement.export', 'clients', 'statement', 'export', 'Export Client Statement', 'تصدير كشف حساب العميل', true),
  ('clients.creditLimit.override', 'clients', 'creditLimit', 'override', 'Override Credit Limit', 'تجاوز حد الائتمان', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, is_delegatable)
VALUES
  ('finance.payment.create', 'finance', 'payment', 'create', 'Record Payment', 'تسجيل دفعة', true),
  ('finance.payment.view', 'finance', 'payment', 'view', 'View Payments', 'عرض المدفوعات', true),
  ('finance.ledger.view', 'finance', 'ledger', 'view', 'View Ledger', 'عرض السجل المالي', true)
ON CONFLICT (key) DO NOTHING;

-- Default grants to manager (adjust list intentionally)
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT t.id, 'manager', pk.key, true
FROM public.tenants t
CROSS JOIN (VALUES 
  ('clients.view'), ('clients.create'), ('clients.edit'), ('clients.statement.view'),
  ('finance.payment.create'), ('finance.payment.view'), ('finance.ledger.view')
) AS pk(key)
ON CONFLICT DO NOTHING;