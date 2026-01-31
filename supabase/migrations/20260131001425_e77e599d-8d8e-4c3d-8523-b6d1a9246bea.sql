-- =====================================================
-- Add missing permission_definitions (SAFE PART)
-- Migration: add_missing_permission_definitions_v1
-- =====================================================

-- Horses CRUD/view layer
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('horses.view',   'horses',   'horses',   'view',   'View Horses',   'عرض الخيول',   'View horse list and basic information',   'عرض قائمة الخيول والمعلومات الأساسية', true),
  ('horses.create', 'horses',   'horses',   'create', 'Create Horses', 'إضافة خيول',   'Add new horses to the system',            'إضافة خيول جديدة للنظام',              true),
  ('horses.edit',   'horses',   'horses',   'edit',   'Edit Horses',   'تعديل الخيول', 'Modify horse information',               'تعديل معلومات الخيول',                 true),
  ('horses.delete', 'horses',   'horses',   'delete', 'Delete Horses', 'حذف الخيول',   'Remove horses from the system',          'حذف الخيول من النظام',                 true)
ON CONFLICT (key) DO NOTHING;

-- HR module
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('hr.view',   'hr', 'hr', 'view',   'View HR',   'عرض الموارد البشرية', 'View employees and HR data',       'عرض بيانات الموظفين والموارد البشرية', true),
  ('hr.manage', 'hr', 'hr', 'manage', 'Manage HR', 'إدارة الموارد البشرية', 'Full management of HR operations', 'إدارة كاملة لعمليات الموارد البشرية', true)
ON CONFLICT (key) DO NOTHING;

-- Housing module
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('housing.view',   'housing', 'housing', 'view',   'View Housing',   'عرض الإسكان',   'View housing units and assignments', 'عرض وحدات الإسكان والتخصيصات', true),
  ('housing.manage', 'housing', 'housing', 'manage', 'Manage Housing', 'إدارة الإسكان', 'Manage housing units and assignments', 'إدارة وحدات الإسكان والتخصيصات', true)
ON CONFLICT (key) DO NOTHING;

-- Schedule module
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('schedule.view',   'schedule', 'schedule', 'view',   'View Schedule',   'عرض الجدول',   'View schedules and calendar',    'عرض الجداول والتقويم', true),
  ('schedule.manage', 'schedule', 'schedule', 'manage', 'Manage Schedule', 'إدارة الجدول', 'Create and manage schedules',     'إدارة الجداول', true)
ON CONFLICT (key) DO NOTHING;