-- إضافة سياسة SELECT تسمح للمالك برؤية المنظمة التي أنشأها فور إنشائها
CREATE POLICY "Owners can view their own tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());