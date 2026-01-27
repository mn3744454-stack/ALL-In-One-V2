
# خطة إصلاح عرض أسماء الخيول اليدوية (Walk-in)

## المشكلة
الخيول اليدوية (المُدخلة عبر "إدخال يدوي") تظهر باسم "خيل غير معروف" في صفحة النتائج، بينما خيول المنشأة تظهر بأسمائها الصحيحة.

## تحليل السبب

| نوع الخيل | مكان تخزين الاسم | الوضع الحالي |
|-----------|------------------|--------------|
| خيل المنشأة | `horses.name` عبر `horse_id` | ✅ يعمل - الاستعلام يجلب `horse:horses(id, name)` |
| خيل يدوي | `lab_samples.horse_name` | ❌ لا يعمل - الحقل غير مُضمن في الاستعلام |

## الملف المتأثر
`src/hooks/laboratory/useLabResults.ts`

## التغيير المطلوب
### قبل (السطر 87-99):
```typescript
sample:lab_samples!lab_results_sample_id_fkey(
  id, 
  physical_sample_id,
  horse:horses!lab_samples_horse_id_fkey(id, name)
)
```

### بعد:
```typescript
sample:lab_samples!lab_results_sample_id_fkey(
  id, 
  physical_sample_id,
  horse_name,
  horse:horses!lab_samples_horse_id_fkey(id, name)
)
```

## التغييرات الإضافية

### 1. تحديث واجهة `LabResult`
إضافة `horse_name` إلى تعريف الـ `sample` المُضمن:
```typescript
sample?: {
  id: string;
  physical_sample_id: string | null;
  horse_name?: string | null;  // إضافة جديدة
  horse?: { id: string; name: string };
};
```

### 2. إزالة الـ type casting
في `ResultCard.tsx` السطر 37، يمكن تبسيط الكود بعد إضافة الحقل:
```typescript
// قبل (مع cast قسري)
const horseName = result.sample?.horse?.name || (result.sample as any)?.horse_name || ...

// بعد (نظيف)
const horseName = result.sample?.horse?.name || result.sample?.horse_name || ...
```

## ملخص التغييرات

| الملف | نوع التغيير |
|-------|-------------|
| `src/hooks/laboratory/useLabResults.ts` | إضافة `horse_name` للاستعلام + تحديث الواجهة |
| `src/components/laboratory/ResultCard.tsx` | إزالة `as any` cast |

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| ❌ خيول "إدخال يدوي" تظهر "خيل غير معروف" | ✅ تظهر بأسمائها المُدخلة |
| ⚠️ type casting قسري | ✅ types صحيحة ونظيفة |

## ملاحظة
هذا تغيير في الكود فقط (frontend) - لا يتطلب أي تعديل على قاعدة البيانات. البيانات موجودة بالفعل في `lab_samples.horse_name`، فقط لم تكن تُجلب.
