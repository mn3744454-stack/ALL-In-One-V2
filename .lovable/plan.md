
# خطة إصلاح مشكلة "Failed to fetch" في Cloudflare Worker

## المشكلة المُشخّصة

| العنصر | الحالة |
|--------|--------|
| تسجيل الدخول | ✅ يعمل عبر البروكسي |
| إنشاء منشأة جديدة | ❌ فشل مع "Failed to fetch" |
| Cloudflare Worker `/proxy-health` | ✅ يعمل - `target: configured` |

### السبب الجذري

Cloudflare Worker **لا يدعم كل الـ headers** التي يرسلها Supabase SDK الحديث.

**Headers مفقودة في Worker:**
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

عندما المتصفح يرسل **CORS preflight** (OPTIONS) ويجد أن الـ Worker لا يسمح بهذه الـ headers، يرفض إكمال الطلب ويُظهر "Failed to fetch".

---

## الحل: تحديث كود Cloudflare Worker

### التغيير المطلوب

يجب تحديث الـ `Access-Control-Allow-Headers` في ملف `docs/cloudflare-worker-proxy.js` ليدعم **كل headers الـ Supabase SDK**:

**من:**
```javascript
'Access-Control-Allow-Headers': 'authorization, apikey, content-type, accept, prefer, x-client-info, x-supabase-api-version, range, if-match, if-none-match',
```

**إلى:**
```javascript
'Access-Control-Allow-Headers': 'authorization, apikey, content-type, accept, prefer, x-client-info, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, range, if-match, if-none-match',
```

**وكذلك** تحديث `FORWARD_HEADERS` لتمرير هذه الـ headers إلى Supabase:

**من:**
```javascript
const FORWARD_HEADERS = [
  'authorization',
  'apikey',
  'content-type',
  'accept',
  'prefer',
  'x-client-info',
  'x-supabase-api-version',
  'range',
  'if-match',
  'if-none-match',
];
```

**إلى:**
```javascript
const FORWARD_HEADERS = [
  'authorization',
  'apikey',
  'content-type',
  'accept',
  'prefer',
  'x-client-info',
  'x-supabase-api-version',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
  'range',
  'if-match',
  'if-none-match',
];
```

---

## خطوات التطبيق

### الخطوة 1: تحديث الكود (سأقوم به)
سأعدّل ملف `docs/cloudflare-worker-proxy.js` بالتغييرات أعلاه.

### الخطوة 2: نشر الكود على Cloudflare (مطلوب منك)
1. افتح [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اذهب إلى **Workers & Pages** → اختر Worker الخاص بك
3. اضغط **Edit Code**
4. استبدل الكود بالكامل بالكود المحدث من `docs/cloudflare-worker-proxy.js`
5. اضغط **Save and Deploy**

### الخطوة 3: اختبار
1. ارجع لصفحة `/create-lab` أو `/create-stable`
2. أكمل النموذج واضغط "إكمال الإعداد"
3. يجب أن يعمل الآن بدون أخطاء

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `docs/cloudflare-worker-proxy.js` | إضافة 4 headers جديدة لدعم Supabase SDK الحديث |
