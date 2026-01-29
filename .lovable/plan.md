

## خطة إضافة Secret للبروكسي الخارجي

### ✅ التحقق المكتمل

| العنصر | الحالة |
|--------|--------|
| Cloudflare Worker مُنشر | ✅ يعمل |
| `/proxy-health` يستجيب | ✅ `{"ok":true}` |
| `SUPABASE_URL` مُعد في Worker | ✅ `"target":"configured"` |

### الخطوة المطلوبة

إضافة Secret جديد في المشروع:

| المفتاح | القيمة |
|---------|--------|
| `VITE_SUPABASE_PROXY_URL` | `https://plain-bonus-b3f7.mn3766687.workers.dev` |

### ما سيحدث بعد الإضافة

1. **عند البناء التالي**: التطبيق سيقرأ `VITE_SUPABASE_PROXY_URL` من البيئة
2. **`installBackendProxyFetch.ts`**: سيوجه جميع طلبات Supabase عبر Worker
3. **النتيجة**: الطلبات ستذهب إلى `*.workers.dev` بدلاً من `*.supabase.co` المحجوب

### التحقق بعد التطبيق

1. افتح صفحة `/auth`
2. اضغط زر **"اختبار"** في لوحة فحص الاتصال
3. يجب أن ترى: **"متصل عبر البروكسي"**
4. جرب تسجيل الدخول - يجب أن يعمل الآن

### ملاحظة تقنية

الكود جاهز بالفعل لاستخدام البروكسي:
- `src/lib/proxyConfig.ts` - يقرأ `VITE_SUPABASE_PROXY_URL`
- `src/lib/installBackendProxyFetch.ts` - يوجه الطلبات تلقائياً
- `src/components/auth/ConnectionHealthCheck.tsx` - يعرض حالة الاتصال

