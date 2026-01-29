# إعداد بروكسي Cloudflare Worker لتجاوز حجب supabase.co

## المشكلة
بعض الشبكات (مثل شبكات الشركات أو بعض مزودي الإنترنت) تحجب نطاق `*.supabase.co`، مما يمنع التطبيق من العمل.

## الحل
إنشاء Cloudflare Worker يعمل كبروكسي عكسي، فيتم توجيه الطلبات عبر `*.workers.dev` بدلاً من `supabase.co`.

---

## خطوات الإعداد

### 1. إنشاء حساب Cloudflare (مجاني)
1. اذهب إلى https://dash.cloudflare.com/sign-up
2. أنشئ حساباً جديداً أو سجّل الدخول

### 2. إنشاء Worker جديد
1. في لوحة التحكم، اضغط على **"Workers & Pages"** في الشريط الجانبي
2. اضغط **"Create Application"**
3. اختر **"Create Worker"**
4. سمّ الـ Worker مثلاً: `supabase-proxy`
5. اضغط **"Deploy"**

### 3. تحرير كود الـ Worker
1. بعد الإنشاء، اضغط **"Edit Code"**
2. احذف الكود الموجود
3. انسخ محتوى الملف `docs/cloudflare-worker-proxy.js` والصقه
4. اضغط **"Save and Deploy"**

### 4. إضافة متغير البيئة
1. اذهب إلى **Settings** → **Variables**
2. اضغط **"Add Variable"**
3. أضف:
   - **Variable name**: `SUPABASE_URL`
   - **Value**: `https://vhxglsvxwwpmoqjabfmj.supabase.co`
4. اضغط **"Deploy"**

### 5. احصل على رابط البروكسي
رابط البروكسي سيكون:
```
https://supabase-proxy.<your-account>.workers.dev
```

يمكنك اختباره بفتح:
```
https://supabase-proxy.<your-account>.workers.dev/proxy-health
```

يجب أن ترى:
```json
{"ok":true,"proxy":"cloudflare-worker","time":"...","target":"configured"}
```

---

## تحديث التطبيق

### الخيار 1: عبر Lovable (مؤقت للاختبار)
في Lovable، أضف Secret جديد:
- **Name**: `VITE_SUPABASE_PROXY_URL`
- **Value**: `https://supabase-proxy.<your-account>.workers.dev`

### الخيار 2: في ملف .env (للتطوير المحلي)
```env
VITE_SUPABASE_PROXY_URL="https://supabase-proxy.<your-account>.workers.dev"
```

---

## التحقق
1. افتح صفحة `/auth` في التطبيق
2. ستجد زر **"اختبار"** في قسم "فحص الاتصال"
3. اضغط عليه للتأكد من أن الاتصال يعمل عبر البروكسي

---

## ملاحظات
- خطة Cloudflare المجانية تسمح بـ 100,000 طلب يومياً
- البروكسي لا يحفظ أي بيانات
- جميع الطلبات تُمرر كما هي إلى Supabase

---

## استكشاف الأخطاء

### خطأ "CORS"
تأكد من أن الـ Worker يحتوي على headers CORS الصحيحة (موجودة في الكود المُقدم).

### خطأ "SUPABASE_URL not configured"
تأكد من إضافة متغير `SUPABASE_URL` في Settings → Variables.

### الـ Worker لا يستجيب
1. تأكد من الضغط على "Save and Deploy"
2. جرّب فتح `/proxy-health` مباشرة في المتصفح
