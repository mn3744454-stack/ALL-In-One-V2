

## خطة الحل النهائي: تثبيت رابط البروكسي مباشرة في الكود

### المشكلة المُشخَّصة

| العنصر | الحالة |
|--------|--------|
| الـ Secret `VITE_SUPABASE_PROXY_URL` | ✅ موجود في إعدادات المشروع |
| البروكسي الفعلي المُستخدم | ❌ Edge Function الداخلي |
| سجل المتصفح يُظهر | `[Proxy] Routing via: https://...supabase.co/functions/v1/backend-proxy` |

**السبب الجذري**: متغيرات البيئة `VITE_*` تُحقن وقت البناء فقط. رغم وجود الـ Secret، عملية البناء لا تقرأه بشكل صحيح.

### الحل: Hardcoded Proxy URL

بدلاً من الاعتماد على Secret قد لا يُحقن، سنضع رابط Cloudflare Worker مباشرة في الكود.

**ملاحظة أمنية**: هذا آمن لأن الرابط عام (public URL) وليس مفتاح سري.

---

### التغييرات المطلوبة

#### 1. تعديل `src/lib/installBackendProxyFetch.ts`

```typescript
// السطر 21-23: تغيير من
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const EXTERNAL_PROXY_URL = import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined;

// إلى
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// Hardcoded Cloudflare Worker URL to bypass network blocks
// This is a public URL, not a secret - safe to hardcode
const EXTERNAL_PROXY_URL = 'https://plain-bonus-b3f7.mn3766687.workers.dev';
```

#### 2. تعديل `src/lib/proxyConfig.ts`

```typescript
// السطر 11-12: تغيير من
const PROXY_URL = import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined;

// إلى
// Hardcoded Cloudflare Worker URL - public, not secret
const PROXY_URL = 'https://plain-bonus-b3f7.mn3766687.workers.dev';
```

---

### النتيجة المتوقعة

بعد التطبيق:
1. سجل المتصفح سيُظهر:
   - `[Proxy] ✅ Installed with EXTERNAL proxy (Cloudflare Worker)`
   - `[Proxy] Routing via: https://plain-bonus-b3f7.mn3766687.workers.dev`

2. لوحة فحص الاتصال في `/auth` ستعرض:
   - **"متصل عبر البروكسي"**

3. طلبات التسجيل/الدخول ستذهب إلى `*.workers.dev` بدلاً من `*.supabase.co` المحجوب

---

### التحقق بعد التطبيق

1. افتح `/auth`
2. اضغط زر **"اختبار"**
3. يجب أن ترى: **"متصل عبر البروكسي"**
4. جرب تسجيل الدخول - يجب أن يعمل الآن من شبكتك

---

### لماذا هذا الحل أفضل؟

| الطريقة | المشكلة |
|---------|---------|
| Secret + إعادة بناء | لا يُحقن بشكل صحيح في كل الحالات |
| **Hardcoded في الكود** | ✅ يعمل دائماً، لا يعتمد على إعدادات خارجية |

