

# إصلاح: رسالة الخطأ الخاطئة عند فشل الاتصال

## المشكلة
الكود يعرض "البريد الإلكتروني أو كلمة المرور غير صحيحة" حتى عندما تكون المشكلة **فشل اتصال بالشبكة** وليس بيانات خاطئة.

## السبب التقني
```typescript
// Auth.tsx - السطر 92-94
if (error) {
  toast.error(t('auth.errors.invalidCredentials')); // يعرض هذا لكل الأخطاء!
}
```

## الحل
تمييز نوع الخطأ وعرض الرسالة المناسبة:
- **`Failed to fetch`** أو **`timed out`** → "مشكلة في الاتصال بالشبكة"
- **خطأ آخر** → "البريد الإلكتروني أو كلمة المرور غير صحيحة"

## التغييرات المطلوبة

### 1. إضافة مفاتيح ترجمة جديدة
إضافة رسائل للأخطاء الشبكية في ملفات الترجمة.

### 2. تعديل `src/pages/Auth.tsx`
```typescript
// قبل
if (error) {
  console.error("Sign in error:", error);
  toast.error(t('auth.errors.invalidCredentials'));
  setLoading(false);
  return;
}

// بعد
if (error) {
  console.error("Sign in error:", error);
  
  const errorMsg = error.message?.toLowerCase() || '';
  if (errorMsg.includes('failed to fetch') || errorMsg.includes('timed out') || errorMsg.includes('network')) {
    toast.error(t('auth.errors.networkError'));
  } else {
    toast.error(t('auth.errors.invalidCredentials'));
  }
  
  setLoading(false);
  return;
}
```

### 3. إضافة رسالة الترجمة
في ملفات الترجمة (ar.ts و en.ts):
```typescript
// العربية
'auth.errors.networkError': 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مرة أخرى.'

// الإنجليزية  
'auth.errors.networkError': 'Unable to connect to server. Check your internet connection and try again.'
```

## لماذا هذا مهم؟
| نوع الخطأ | الرسالة الحالية | الرسالة الصحيحة |
|-----------|-----------------|-----------------|
| فشل شبكة | "بيانات خاطئة" ❌ | "مشكلة اتصال" ✅ |
| بيانات خاطئة | "بيانات خاطئة" ✅ | "بيانات خاطئة" ✅ |

## ملاحظة مهمة
هذا الإصلاح **لن يحل مشكلة الاتصال نفسها** (التي قد تكون بسبب حجب الشبكة أو بطء مؤقت)، لكنه سيعطيك معلومة صحيحة عن سبب الفشل بدلاً من رسالة مضللة.

## الملفات المتأثرة
- `src/pages/Auth.tsx`
- `src/i18n/locales/ar.ts`
- `src/i18n/locales/en.ts`

