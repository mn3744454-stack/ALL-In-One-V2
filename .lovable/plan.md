

# خطة إصلاح خطأ مقارنة UUID مع Text

## المشكلة
خطأ PostgreSQL: `operator does not exist: text = uuid` يمنع:
- تحميل نتائج المختبر
- إنشاء نتائج جديدة  
- عرض أسماء الخيول (تظهر "خيل غير معروف")

## السبب الجذري
في دالتين بقاعدة البيانات، يتم تحويل UUID إلى text قبل المقارنة مع مصفوفة uuid[]:

```sql
-- الكود الخاطئ
_resource_id::text = ANY(g.resource_ids)  -- text مقارنة مع uuid[]
```

## الحل: Migration تصحيحية

### التغييرات المطلوبة

| الدالة | التغيير |
|--------|---------|
| `can_access_shared_resource` | إزالة `::text` من مقارنة `_resource_id` |
| `get_granted_data` | إزالة `::text` من مقارنات `lr.id`, `vt.id`, `ba.id` |

### ما لن يتغير
- ✅ جميع الجداول (بدون تغيير)
- ✅ سياسات RLS (بدون تغيير)
- ✅ منطق الصلاحيات والاتصالات (بدون تغيير)
- ✅ العلاقات بين الجداول (بدون تغيير)

## الملف المطلوب إنشاؤه

```
supabase/migrations/20260127XXXXXX_fix_uuid_text_comparison.sql
```

## محتوى Migration

```sql
-- إصلاح: إزالة ::text casts لمقارنة uuid مع uuid[]
-- يصلح خطأ "operator does not exist: text = uuid"

-- 1. حذف النسخة المكررة من الدالة (إن وجدت)
DROP FUNCTION IF EXISTS public.can_access_shared_resource(uuid, text, uuid);

-- 2. إعادة إنشاء can_access_shared_resource مع الإصلاح
CREATE OR REPLACE FUNCTION public.can_access_shared_resource(...)
-- التغيير: _resource_id = ANY(g.resource_ids) بدلاً من _resource_id::text = ANY(...)

-- 3. إعادة إنشاء get_granted_data مع الإصلاح
CREATE OR REPLACE FUNCTION public.get_granted_data(...)
-- التغيير في 3 مواضع:
--   lr.id = ANY(_grant.resource_ids)
--   vt.id = ANY(_grant.resource_ids)
--   ba.id = ANY(_grant.resource_ids)
```

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| ❌ فشل تحميل النتائج | ✅ تحميل النتائج بنجاح |
| ❌ لا يمكن إنشاء نتيجة | ✅ إنشاء النتائج يعمل |
| ❌ "خيل غير معروف" | ✅ أسماء الخيول صحيحة |

## ملاحظة أمان
هذا إصلاح **صياغة فقط** - لا يغير أي منطق أمان أو صلاحيات. الدوال ستعمل بنفس الطريقة لكن بدون خطأ النوع.

