-- Phase 3 Batch 0: Add 4 missing prerequisite permission keys

INSERT INTO permission_definitions (key, module, resource, action, display_name, display_name_ar, description, is_delegatable)
VALUES
  ('vet.manage', 'vet', 'vet', 'manage', 'Manage Veterinary', 'إدارة البيطرة', 'Full management of vet treatments, medications, and followups', true),
  ('movement.manage', 'movement', 'movement', 'manage', 'Manage Movement', 'إدارة التنقل', 'General CRUD management of horse movements and facility locations', true),
  ('finance.payables.manage', 'finance', 'payables', 'manage', 'Manage Supplier Payables', 'إدارة مستحقات الموردين', 'Create, edit, and manage supplier payable records', true),
  ('admin.settings.manage', 'admin', 'settings', 'manage', 'Manage Settings', 'إدارة الإعدادات', 'Manage tenant settings and capability configuration', true)
ON CONFLICT (key) DO NOTHING;