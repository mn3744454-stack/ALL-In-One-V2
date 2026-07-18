-- Tail follow-up for tenant_services rows whose service_kind is a literal
-- 'service' (or NULL/blank): map to the tenant's 'general' category.
INSERT INTO public.tenant_service_categories (tenant_id, key, name, name_ar, domain_key, sort_order)
SELECT DISTINCT ts.tenant_id, 'general', 'General', 'عام', 'general', 10
FROM public.tenant_services ts
WHERE ts.category_id IS NULL
ON CONFLICT (tenant_id, key) DO NOTHING;

UPDATE public.tenant_services ts
SET category_id = tsc.id
FROM public.tenant_service_categories tsc
WHERE ts.category_id IS NULL
  AND tsc.tenant_id = ts.tenant_id
  AND tsc.key = 'general';
