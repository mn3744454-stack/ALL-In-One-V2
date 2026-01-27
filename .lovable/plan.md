
# خطة إصلاح خطأ "operator does not exist: text = uuid"

## السبب الجذري

المشكلة في **Migration 20260126223026** - يوجد خطأ في نوع البيانات:

| الموقع | الكود الخاطئ | المشكلة |
|--------|-------------|---------|
| `can_access_shared_resource` (سطر 52) | `_resource_id::text = ANY(g.resource_ids)` | تحويل UUID إلى text ثم مقارنته بـ uuid[] |
| `get_granted_data` (سطر 205) | `lr.id::text = ANY(_grant.resource_ids)` | نفس المشكلة |
| `get_granted_data` (سطر 221) | `vt.id::text = ANY(_grant.resource_ids)` | نفس المشكلة |
| `get_granted_data` (سطر 237) | `ba.id::text = ANY(_grant.resource_ids)` | نفس المشكلة |

**النوع الفعلي لـ `resource_ids`:** `uuid[]` (مصفوفة UUID)
**الخطأ:** تحويل `::text` يجعل المقارنة `text = uuid` وهذا لا يعمل في PostgreSQL.

---

## الحل: إنشاء Migration جديدة

سيتم إنشاء migration تصحيحية تزيل `::text` casts:

### 1. إصلاح `can_access_shared_resource`

```sql
-- قبل (خاطئ)
OR _resource_id::text = ANY(g.resource_ids)

-- بعد (صحيح)
OR _resource_id = ANY(g.resource_ids)
```

### 2. إصلاح `get_granted_data`

```sql
-- قبل (خاطئ)
lr.id::text = ANY(_grant.resource_ids)
vt.id::text = ANY(_grant.resource_ids)
ba.id::text = ANY(_grant.resource_ids)

-- بعد (صحيح)
lr.id = ANY(_grant.resource_ids)
vt.id = ANY(_grant.resource_ids)
ba.id = ANY(_grant.resource_ids)
```

---

## الملفات المطلوبة

| العملية | الملف |
|---------|-------|
| إنشاء | `supabase/migrations/[timestamp]_fix_uuid_text_comparison.sql` |

---

## محتوى Migration

```sql
-- Fix: Remove ::text casts for uuid to uuid[] comparison
-- This fixes "operator does not exist: text = uuid" error

-- 1. Fix can_access_shared_resource function
CREATE OR REPLACE FUNCTION public.can_access_shared_resource(
  _actor_user_id uuid,
  _resource_type text,
  _resource_id uuid,
  _required_access text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_access boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.consent_grants g
    JOIN public.connections c ON c.id = g.connection_id
    WHERE 
      g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (g.revoked_at IS NULL)
      AND c.status = 'accepted'
      AND g.resource_type = _resource_type
      AND (g.access_level = _required_access OR g.access_level = 'write')
      AND (
        c.recipient_profile_id = _actor_user_id
        OR (c.recipient_tenant_id IS NOT NULL 
            AND public.is_active_tenant_member(_actor_user_id, c.recipient_tenant_id))
      )
      AND (
        g.resource_ids IS NULL 
        OR array_length(g.resource_ids, 1) IS NULL
        OR _resource_id = ANY(g.resource_ids)  -- ← Fixed: removed ::text
      )
  ) INTO _has_access;
  
  RETURN _has_access;
END;
$$;

-- 2. Fix get_granted_data function
-- (same pattern - remove all ::text casts for uuid comparisons)
```

---

## التأثير المتوقع

| قبل الإصلاح | بعد الإصلاح |
|-------------|-------------|
| ❌ فشل تحميل النتائج | ✅ تحميل النتائج بنجاح |
| ❌ لا يمكن إنشاء نتيجة | ✅ إنشاء النتائج يعمل |
| ❌ "خيل غير معروف" | ✅ أسماء الخيول تظهر صحيحة |
| ❌ PostgreSQL ERROR | ✅ لا أخطاء في الـ logs |

---

## ملاحظة مهمة

هذه المشكلة ذُكرت سابقاً في الـ Memory:
> "The bug: comparison of _resource_id::text against uuid[] array using ANY() operator caused PostgreSQL error"

ولكن يبدو أن الإصلاح السابق لم يُطبق بشكل كامل على قاعدة البيانات، أو تم overwrite بـ migration لاحقة. سأتحقق من أن الإصلاح يُطبق على **كل** المواضع المتأثرة.
