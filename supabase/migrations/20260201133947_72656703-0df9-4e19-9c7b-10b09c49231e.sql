-- =====================================================
-- Add Finance + Laboratory Horses Permission Definitions
-- Migration: add_finance_lab_horse_permissions_v1
-- =====================================================

-- Finance Invoice permissions
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('finance.invoice.view', 'finance', 'invoice', 'view', 'View Invoices', 'عرض الفواتير', 'View invoices and billing information', 'عرض الفواتير ومعلومات الفوترة', true),
  ('finance.invoice.create', 'finance', 'invoice', 'create', 'Create Invoices', 'إنشاء الفواتير', 'Create new invoices', 'إنشاء فواتير جديدة', true),
  ('finance.invoice.edit', 'finance', 'invoice', 'edit', 'Edit Invoices', 'تعديل الفواتير', 'Edit draft invoices', 'تعديل مسودات الفواتير', true),
  ('finance.invoice.delete', 'finance', 'invoice', 'delete', 'Delete Invoices', 'حذف الفواتير', 'Delete invoices from the system', 'حذف الفواتير من النظام', true),
  ('finance.invoice.send', 'finance', 'invoice', 'send', 'Send Invoices', 'إرسال الفواتير', 'Send invoices to clients', 'إرسال الفواتير للعملاء', true),
  ('finance.invoice.markPaid', 'finance', 'invoice', 'markPaid', 'Mark Invoices Paid', 'تحديد الفواتير كمدفوعة', 'Mark invoices as paid', 'تحديد الفواتير كمدفوعة', true),
  ('finance.invoice.print', 'finance', 'invoice', 'print', 'Print/Download Invoices', 'طباعة/تحميل الفواتير', 'Print or download invoice PDFs', 'طباعة أو تحميل ملفات PDF للفواتير', true)
ON CONFLICT (key) DO NOTHING;

-- Laboratory Horses permissions
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('laboratory.horses.view', 'laboratory', 'horses', 'view', 'View Lab Horses', 'عرض خيول المختبر', 'View laboratory horse registry', 'عرض سجل خيول المختبر', true),
  ('laboratory.horses.create', 'laboratory', 'horses', 'create', 'Create Lab Horses', 'إضافة خيول المختبر', 'Add new horses to laboratory registry', 'إضافة خيول جديدة لسجل المختبر', true),
  ('laboratory.horses.edit', 'laboratory', 'horses', 'edit', 'Edit Lab Horses', 'تعديل خيول المختبر', 'Edit laboratory horse information', 'تعديل معلومات خيول المختبر', true),
  ('laboratory.horses.archive', 'laboratory', 'horses', 'archive', 'Archive Lab Horses', 'أرشفة خيول المختبر', 'Archive or restore laboratory horses', 'أرشفة أو استعادة خيول المختبر', true),
  ('laboratory.horses.export', 'laboratory', 'horses', 'export', 'Export Lab Horses', 'تصدير خيول المختبر', 'Export laboratory horse reports', 'تصدير تقارير خيول المختبر', true)
ON CONFLICT (key) DO NOTHING;

-- Laboratory Samples permissions (ensure create exists)
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('laboratory.samples.create', 'laboratory', 'samples', 'create', 'Create Lab Samples', 'إنشاء عينات المختبر', 'Create new laboratory samples', 'إنشاء عينات مختبرية جديدة', true),
  ('laboratory.samples.edit', 'laboratory', 'samples', 'edit', 'Edit Lab Samples', 'تعديل عينات المختبر', 'Edit laboratory sample information', 'تعديل معلومات عينات المختبر', true),
  ('laboratory.samples.delete', 'laboratory', 'samples', 'delete', 'Delete Lab Samples', 'حذف عينات المختبر', 'Delete laboratory samples', 'حذف عينات المختبر', true)
ON CONFLICT (key) DO NOTHING;