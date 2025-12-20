-- 1. إعادة تفعيل RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 2. حذف السياسة المُشكِلة (ALL) التي تسبب الدورة اللانهائية
DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;

-- 3. إنشاء سياسات منفصلة للـ UPDATE و DELETE فقط
-- سياسة UPDATE للمالكين
CREATE POLICY "Owners can update tenant members"
ON public.tenant_members
FOR UPDATE
TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));

-- سياسة DELETE للمالكين
CREATE POLICY "Owners can delete tenant members"
ON public.tenant_members
FOR DELETE
TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role));