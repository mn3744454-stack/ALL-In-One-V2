
# خطة إصلاح نافذة إدخال نتائج المختبر

## المشاكل المحددة

| المشكلة | الوصف |
|---------|-------|
| ❌ الخيول اليدوية تظهر "Unknown Horse" | في Step 1 (اختيار العينة)، الكود يستخدم `sample.horse?.name` فقط ولا يفحص `sample.horse_name` للخيول المُدخلة يدوياً |
| ❌ تصميم النافذة غير مُحسّن | Header/Footer غير مثبتين، الـ scrolling يشمل كل النافذة بدلاً من المحتوى فقط |

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/components/laboratory/CreateResultDialog.tsx` | تعديل هيكل النافذة + إصلاح عرض اسم الخيل |

---

## التغيير الأول: إصلاح عرض اسم الخيل اليدوية

### المشكلة (السطر 392):
```typescript
<p className="font-medium">{sample.horse?.name || 'Unknown Horse'}</p>
```

### الحل:
```typescript
<p className="font-medium">
  {sample.horse?.name || sample.horse_name || t("laboratory.results.unknownHorse")}
</p>
```

**المنطق:**
- أولاً: استخدم `sample.horse?.name` للخيول المسجلة في النظام
- ثانياً: استخدم `sample.horse_name` للخيول المُدخلة يدوياً (walk-in)
- أخيراً: استخدم النص المترجم "خيل غير معروف"

---

## التغيير الثاني: تطبيق Polish على هيكل النافذة

### الهيكل الحالي (غير محسّن):
```typescript
<DialogContent className="... max-h-[90vh] overflow-y-auto">
  <DialogHeader>...</DialogHeader>
  {/* Step Indicator */}
  {/* Content */}
  {/* Navigation */}
</DialogContent>
```

### الهيكل الجديد (محسّن):
```typescript
<DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
  {/* Header - ثابت */}
  <div className="flex-shrink-0 px-6 pt-5 pb-2 border-b">
    <DialogHeader>...</DialogHeader>
    {/* Step Indicator */}
  </div>
  
  {/* Body - قابل للتمرير */}
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
    {renderStepContent()}
  </div>
  
  {/* Footer - ثابت */}
  <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
    {/* Navigation buttons */}
  </div>
</DialogContent>
```

---

## تفاصيل التغييرات على CSS Classes

| العنصر | الحالي | الجديد |
|--------|--------|--------|
| `DialogContent` | `max-h-[90vh] overflow-y-auto` | `max-h-[85vh] flex flex-col overflow-hidden p-0` |
| Header wrapper | غير موجود | `flex-shrink-0 px-6 pt-5 pb-2 border-b` |
| Body wrapper | `min-h-[200px]` | `flex-1 min-h-0 overflow-y-auto px-6 py-4` |
| Footer | `pt-4 border-t` | `flex-shrink-0 px-6 py-4 border-t bg-background` |

---

## تفاصيل تقنية للتمرير الداخلي

### المحتوى القابل للتمرير في كل خطوة:

**Step 1 - اختيار العينة:**
- قائمة العينات (`grid gap-3 max-h-[300px] overflow-y-auto`) ← يُزال `max-h` الداخلي لأن الـ parent أصبح scrollable

**Step 2 - اختيار القالب:**
- قائمة القوالب (نفس المنطق)

**Step 3 - إدخال النتائج:**
- حقول الإدخال

**Step 4 - المراجعة:**
- ملخص البيانات

**Step 5 - المتابعة:**
- الأزرار فقط

---

## التغيير الثالث: إزالة max-h الداخلية

لتجنب التمرير المزدوج (nested scrolling)، يجب إزالة:
- `max-h-[300px]` من السطر 374 (قائمة العينات)
- `max-h-[300px]` من السطر 448 (قائمة القوالب)

---

## ملخص التغييرات

```text
CreateResultDialog.tsx:
├── السطر 392: إضافة sample.horse_name للـ fallback
├── السطر 374: إزالة max-h-[300px]
├── السطر 448: إزالة max-h-[300px]
├── السطر 724: تعديل DialogContent classes
├── السطر 725-759: إعادة هيكلة Header
├── السطر 762-764: إعادة هيكلة Body wrapper
└── السطر 766-805: إعادة هيكلة Footer
```

---

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| ❌ خيول "إدخال يدوي" تظهر "Unknown Horse" | ✅ تظهر بأسمائها المُدخلة |
| ❌ Header/Footer يختفيان عند التمرير | ✅ ثابتان دائماً |
| ❌ التمرير يشمل النافذة بالكامل | ✅ التمرير للمحتوى فقط |
| ❌ تمرير متداخل (nested) | ✅ تمرير واحد نظيف |
