

# إصلاح مفاتيح VAPID -- توليد مفاتيح صالحة

## المشكلة الجذرية

مفتاح `VAPID_PUBLIC_KEY` المخزن حاليا هو `"FDG4564GDF#$456GD"` وهو نص عشوائي وليس مفتاح VAPID حقيقي. مفتاح VAPID العام الصالح يجب أن يكون سلسلة Base64 URL-safe بطول حوالي 87 حرفا تبدأ بحرف "B".

هذا هو السبب الفعلي لفشل تفعيل الاشعارات: المتصفح يرفض الاشتراك لان المفتاح غير صالح.

## الحل

انشاء edge function مؤقتة تولد زوج مفاتيح VAPID صالح (public + private)، ثم استخدام القيم الناتجة لتحديث الاسرار.

### الخطوات

### 1. انشاء edge function مؤقتة: `generate-vapid-keys`

تستخدم مكتبة `web-push` لتوليد زوج مفاتيح ECDSA P-256 صالح. ترجع المفتاح العام والخاص.

### 2. استدعاء الدالة واستخراج المفاتيح

بعد النشر، نستدعي الدالة ونحصل على:
- `publicKey`: سلسلة Base64 URL-safe (~87 حرف)
- `privateKey`: سلسلة Base64 URL-safe (~43 حرف)

### 3. تحديث الاسرار

| السر | الحالة | الاجراء |
|------|--------|---------|
| `VAPID_PUBLIC_KEY` | غير صالح | تحديث بالمفتاح العام المولد |
| `VAPID_PRIVATE_KEY` | غالبا غير صالح | تحديث بالمفتاح الخاص المولد |
| `VAPID_SUBJECT` | موجود | التحقق منه (يجب ان يكون `mailto:support@khail.app`) |
| `PUSH_EDGE_SECRET` | موجود | لا تغيير (مستخدم للمصادقة بين DB trigger و edge function) |
| `VITE_VAPID_PUBLIC_KEY` | غير مستخدم | حذفه لتجنب الالتباس |

### 4. حذف edge function المؤقتة

بعد الحصول على المفاتيح وتحديث الاسرار، نحذف `generate-vapid-keys` لانها لم تعد مطلوبة.

---

## التفاصيل التقنية

### Edge Function المؤقتة (`generate-vapid-keys`)

```text
GET /generate-vapid-keys
Response: { "publicKey": "BPx...", "privateKey": "abc..." }
```

تستخدم:
```text
import webPush from "https://esm.sh/web-push@3.6.7";
const vapidKeys = webPush.generateVAPIDKeys();
```

### لماذا نحتاج edge function لتوليد المفاتيح؟

مفاتيح VAPID تعتمد على خوارزمية ECDSA P-256 ولا يمكن كتابتها يدويا. يجب توليدها برمجيا باستخدام مكتبة مثل `web-push`.

### الملفات

| الملف | الاجراء |
|-------|---------|
| `supabase/functions/generate-vapid-keys/index.ts` | انشاء مؤقت ثم حذف |
| لا تعديلات على ملفات اخرى | المفاتيح تحدث عبر الاسرار فقط |

