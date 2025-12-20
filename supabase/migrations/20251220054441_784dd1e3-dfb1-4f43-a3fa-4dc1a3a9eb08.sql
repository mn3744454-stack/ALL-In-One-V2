-- تعطيل RLS مؤقتاً للاختبار
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;