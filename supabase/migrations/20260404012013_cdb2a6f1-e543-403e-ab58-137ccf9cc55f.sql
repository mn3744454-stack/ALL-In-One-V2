-- Phase 2: Permission Vocabulary Cleanup

-- 1. Add missing permission keys
INSERT INTO permission_definitions (key, module, resource, action, display_name, display_name_ar, description, is_delegatable)
VALUES
  ('breeding.view', 'breeding', 'breeding', 'view', 'View Breeding', 'عرض التناسل', 'View breeding attempts, pregnancies, contracts, and foalings', true),
  ('breeding.manage', 'breeding', 'breeding', 'manage', 'Manage Breeding', 'إدارة التناسل', 'Create, edit, and delete breeding records', true),
  ('services.view', 'services', 'services', 'view', 'View Services', 'عرض الخدمات', 'View service catalog', true),
  ('services.manage', 'services', 'services', 'manage', 'Manage Services', 'إدارة الخدمات', 'Create, edit, and delete services', true),
  ('team.view', 'team', 'team', 'view', 'View Team & Partners', 'عرض الفريق والشركاء', 'View team members and partners', true),
  ('team.manage', 'team', 'team', 'manage', 'Manage Team & Partners', 'إدارة الفريق والشركاء', 'Invite members, manage partners, configure access', true),
  ('finance.settings.manage', 'finance', 'settings', 'manage', 'Manage Finance Settings', 'إدارة إعدادات المالية', 'Manage tax, pricing, and currency settings', true)
ON CONFLICT (key) DO NOTHING;

-- 2. Remove duplicate finance permission keys (not referenced by any code)
DELETE FROM permission_definitions WHERE key IN ('finance.invoices.create', 'finance.invoices.manage', 'finance.invoices.send');