
# خطة إضافة البروكسي للتطبيق

## الحالة الحالية
البروكسي على Cloudflare يعمل بنجاح على العنوان:
`https://plain-bonus-b3f7.mn3766687.workers.dev`

## الخطوات المطلوبة

### 1. إضافة متغير البيئة
إضافة Secret جديد للمشروع:
- **الاسم**: `VITE_SUPABASE_PROXY_URL`
- **القيمة**: `https://plain-bonus-b3f7.mn3766687.workers.dev`

### 2. تفعيل معترض الطلبات (Fetch Interceptor)
التأكد من أن `installBackendProxyFetch()` يتم استدعاؤه في بداية التطبيق قبل تحميل Supabase client.

**الملف**: `src/main.tsx`
- إضافة استيراد `installBackendProxyFetch`
- استدعاء الدالة قبل `createRoot`

### 3. التحقق من التكامل
بعد التطبيق:
- فتح صفحة `/auth`
- الضغط على زر "اختبار" في قسم "فحص الاتصال"
- يجب أن يظهر "متصل عبر البروكسي"
- تجربة تسجيل الدخول

---

## التفاصيل التقنية

### تعديل `src/main.tsx`
```typescript
import { installBackendProxyFetch } from './lib/installBackendProxyFetch';

// Install proxy BEFORE any Supabase calls
installBackendProxyFetch();

createRoot(document.getElementById("root")!).render(
  // ...
);
```

### كيف يعمل النظام
1. عند تحميل التطبيق، يتم تثبيت معترض `fetch`
2. أي طلب يذهب لـ `supabase.co` يُعاد توجيهه تلقائياً عبر البروكسي
3. البروكسي على `workers.dev` (غير محجوب) يُمرر الطلب لـ Supabase
4. الرد يعود للمستخدم بشكل طبيعي

### المسارات المدعومة عبر البروكسي
- `/auth/v1/*` - تسجيل الدخول والمصادقة
- `/rest/v1/*` - استعلامات قاعدة البيانات
- `/storage/v1/*` - تخزين الملفات
- `/functions/v1/*` - Edge Functions

---

## النتيجة المتوقعة
- تسجيل الدخول يعمل حتى لو كان `supabase.co` محجوباً
- الطلبات تمر عبر `workers.dev` بدلاً من `supabase.co`
- لا حاجة لـ VPN أو تغيير الشبكة
