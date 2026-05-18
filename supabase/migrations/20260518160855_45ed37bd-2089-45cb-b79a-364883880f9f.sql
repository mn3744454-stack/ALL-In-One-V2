-- Idempotent baseline seed for horse breeds and colors, tenant-scoped.
-- Adds case-insensitive unique indexes on (tenant_id, lower(name)) and seeds
-- the canonical breed (Thoroughbred / ثوروبريد) and 5 baseline colors for
-- every existing tenant. Re-runs are no-ops thanks to the unique indexes
-- + ON CONFLICT DO NOTHING. Existing "Thropeed / ثروبيد" rows are left
-- untouched.

CREATE UNIQUE INDEX IF NOT EXISTS horse_breeds_tenant_lower_name_uidx
  ON public.horse_breeds (tenant_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS horse_colors_tenant_lower_name_uidx
  ON public.horse_colors (tenant_id, lower(name));

-- Seed canonical breed for every tenant
INSERT INTO public.horse_breeds (tenant_id, name, name_ar)
SELECT t.id, 'Thoroughbred', 'ثوروبريد'
FROM public.tenants t
ON CONFLICT (tenant_id, lower(name)) DO NOTHING;

-- Seed baseline colors for every tenant
WITH baseline (name, name_ar) AS (
  VALUES
    ('Blue',      'أزرق'),
    ('Chestnut',  'أشقر'),
    ('Bay',       'أحمر'),
    ('Jet Black', 'أدهم'),
    ('Black',     'أسود')
)
INSERT INTO public.horse_colors (tenant_id, name, name_ar)
SELECT t.id, b.name, b.name_ar
FROM public.tenants t
CROSS JOIN baseline b
ON CONFLICT (tenant_id, lower(name)) DO NOTHING;