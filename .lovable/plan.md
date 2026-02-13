

# إصلاح فشل تفعيل الإشعارات -- السبب الجذري

## المشكلة

مفتاح VAPID العام (`VITE_VAPID_PUBLIC_KEY`) مخزن كـ secret في الخادم (متاح فقط لـ backend functions)، لكن الكود في المتصفح يحاول قراءته عبر `import.meta.env.VITE_VAPID_PUBLIC_KEY`. هذا المتغير غير موجود في ملف `.env` الذي يبنيه Vite، لذلك قيمته دائما `undefined`.

النتيجة: دالة `subscribeToPush` ترجع `null` فورا عند السطر 70-73 بدون حتى محاولة الاشتراك.

## الحل

إنشاء edge function بسيطة تُرجع مفتاح VAPID العام (وهو مفتاح عام وآمن للمشاركة)، ثم جلبه من المتصفح عند الحاجة.

## التغييرات المطلوبة

### 1. إنشاء edge function جديدة: `get-vapid-key`

ملف `supabase/functions/get-vapid-key/index.ts`:
- تقرأ `VAPID_PUBLIC_KEY` من `Deno.env.get()`
- ترجعه كـ JSON
- لا تحتاج مصادقة (المفتاح العام آمن للمشاركة)

### 2. تعديل `src/lib/pushManager.ts`

- حذف `const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY`
- إضافة دالة `fetchVapidKey()` تجلب المفتاح من الـ edge function وتخزنه مؤقتا (cache)
- تعديل `subscribeToPush` لاستدعاء `fetchVapidKey()` بدلا من قراءة المتغير المحلي

### 3. تحسين رسائل الخطأ

- تعديل الترجمة العربية والإنجليزية لرسالة `enableFailed`:
  - بدلا من "يرجى التحقق من أذونات المتصفح" (مضللة)
  - تصبح "فشل تفعيل الإشعارات. يرجى المحاولة مرة أخرى."

---

## التفاصيل التقنية

### Edge Function (`get-vapid-key`)

```text
GET /get-vapid-key
Response: { "vapidPublicKey": "BPx..." }
```

لا تحتاج Authorization header لأن المفتاح العام آمن بطبيعته.

### تعديل pushManager.ts

```text
قبل:
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;  // undefined دائما

بعد:
  let cachedVapidKey: string | null = null;
  async function fetchVapidKey(): Promise<string | null> {
    if (cachedVapidKey) return cachedVapidKey;
    // جلب من edge function عبر supabase.functions.invoke
    ...
  }
```

### الملفات المعدلة

| الملف | التغيير |
|-------|---------|
| `supabase/functions/get-vapid-key/index.ts` | ملف جديد - edge function |
| `src/lib/pushManager.ts` | جلب VAPID key من edge function بدل import.meta.env |
| `src/i18n/locales/ar.ts` | تحسين رسالة الخطأ |
| `src/i18n/locales/en.ts` | تحسين رسالة الخطأ |

