
# خطة إصلاح: القوالب لا تظهر عند إنشاء عينة جديدة

## تشخيص المشكلة

المستخدم يرى 3 قوالب نشطة في شاشة "القوالب"، لكن عند فتح حوار "إنشاء عينة" تظهر رسالة "لا توجد قوالب متاحة".

### السبب الجذري
مشكلة في توقيت التحميل (Race Condition) بين `TenantContext` و `useLabTemplates`:

1. عند تحميل صفحة المختبر، يتم render `CreateSampleDialog` حتى وهو مغلق
2. في تلك اللحظة، قد يكون `TenantContext` ما زال يحمّل البيانات (`loading = true`)
3. `useLabTemplates` يتحقق من `activeTenant?.tenant.id`:
   - إذا كان `undefined`، يُعيد قائمة فارغة ويتوقف (`loading = false`)
   - لكنه لا يعيد الاستعلام بشكل صحيح عندما يصبح `activeTenant` متاحاً لاحقاً

**لماذا `LabTemplatesManager` يعمل؟**
لأنه يُعرض فقط عندما ينتقل المستخدم إلى tab "القوالب"، وفي تلك اللحظة يكون `activeTenant` قد تم تحميله بالفعل.

---

## الحل المقترح

### التعديل الرئيسي على `useLabTemplates.ts`

إضافة اعتماد على `loading` من `TenantContext` لمنع إرجاع قائمة فارغة أثناء التحميل:

```typescript
export function useLabTemplates() {
  const [templates, setTemplates] = useState<LabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole, loading: tenantLoading } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTemplates = useCallback(async () => {
    // انتظر حتى يكتمل تحميل الـ tenant
    if (tenantLoading) {
      return; // لا تفعل شيء أثناء التحميل
    }
    
    if (!activeTenant?.tenant.id) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_templates")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      // ... باقي الكود
    } catch (error) {
      // ... معالجة الأخطاء
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, tenantLoading]); // إضافة tenantLoading للاعتمادات

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);
  
  // ...
}
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/hooks/laboratory/useLabTemplates.ts` | إضافة `tenantLoading` من `useTenant()` والتحقق منه قبل الاستعلام |

---

## التفاصيل التقنية

### لماذا هذا الحل يعمل؟

1. **منع الاستعلام المبكر**: عندما يكون `tenantLoading = true`، الـ hook ينتظر ولا يُعيد قائمة فارغة
2. **إعادة الاستعلام التلقائية**: عندما يتغير `tenantLoading` من `true` إلى `false`، يتم إنشاء `fetchTemplates` جديدة، مما يُشغّل `useEffect` ويستعلم عن القوالب
3. **حالة التحميل الصحيحة**: `loading` يبقى `true` أثناء انتظار الـ tenant، مما يُظهر مؤشر التحميل بدلاً من رسالة "لا توجد قوالب"

### الملفات الأخرى التي قد تحتاج نفس الإصلاح

هناك hooks أخرى تستخدم نفس النمط وقد تعاني من نفس المشكلة:
- `useLabSamples`
- `useLabResults`
- `useLabCredits`
- `useLabTestTypes`

يُنصح بتطبيق نفس الإصلاح عليها بعد التأكد من أن هذا الحل يعمل.
