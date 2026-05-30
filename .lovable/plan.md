## المشكلة

- `DashboardSidebar.tsx` (سطح المكتب) مكتوب يدويًا ولا يستخدم `workspaceNavConfig.ts`، لذا عنصر "Inventory" المُضاف في المرحلة 3 ظهر فقط في `MobileLauncher` ولم يظهر في الشريط الجانبي للسطح المكتبي.
- ترحيل المرحلة 1 حاول منح `inventory.view`/`inventory.manage` عبر `WHERE tr.name IN ('owner','manager')`، لكن جدول `tenant_roles` يربط بالأدوار عبر `role_key` (والأعمدة `name` تختلف لكل مستأجر). نتيجة الاستعلام = 0 صفوف → لم تُمنح الصلاحيات لأي دور. الـ owner يعمل لأن `has_permission()` يرجع `true` دائمًا له، لكن أي دور آخر (مثل `manager`) يبقى محرومًا.

## الخطوات

### 1) إضافة عنصر "Inventory" في الشريط الجانبي للسطح المكتبي
في `src/components/dashboard/DashboardSidebar.tsx` بعد كتلة Services (السطر ~550) وقبل Clients، أضف:

```tsx
{hasPermission('inventory.view') && (
  <NavItem
    icon={Boxes}
    label={t('inventory.title')}
    href="/dashboard/inventory"
    active={isActive("/dashboard/inventory")}
    onNavigate={onClose}
    {...navProps}
  />
)}
```
مع استيراد `Boxes` من `lucide-react`.

### 2) ترحيل قاعدة بيانات: منح صلاحيات المخزون فعليًا للدور `manager`
ترحيل صغير يُصلح المنح:

```sql
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, perm.key, true
FROM public.tenant_roles tr
CROSS JOIN (VALUES ('inventory.view'), ('inventory.manage')) AS perm(key)
WHERE tr.role_key IN ('owner', 'manager')
ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
```
(الـ owner يحصل على الصلاحيات تلقائيًا من `has_permission()`، لكن إدراج صفوفه يُبقي البيانات متّسقة لعروض الإدارة في UI.)

### 3) التحقق
- فتح `/dashboard` على شاشة السطح المكتبي والتأكد من ظهور "Inventory" في الشريط الجانبي.
- النقر يفتح `/dashboard/inventory` بنجاح.
- التأكد من إخفائه فقط لمن لا يملك `inventory.view`.

## تفاصيل تقنية

- لا تغيير على هيكلية المسارات أو RLS أو الحراس — فقط ربط بصري لعنصر القائمة في السطح المكتبي + إكمال المنح الفائت.
- المرحلة 1 وضعت RLS مبنيًا على `has_permission('inventory.view'/'manage')`، وهذا الترحيل لا يغيّر السياسات؛ يُكمل فقط إدراج المنح التي لم تنفّذ.
- نطاق الملفات: ملف واحد UI + ترحيل واحد قصير.