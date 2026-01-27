
# خطة الإصلاح: ترجمة واجهة الخيول وتنسيق الجدول RTL

## ملخص المشاكل

بناءً على الصورة المرفقة، هناك مجموعتان من المشاكل:

| المشكلة | الوصف | الملفات المتأثرة |
|---------|-------|-----------------|
| **1) كلمات إنجليزية** | فلاتر (Gender, Status, Breed) + حالة (active) + أنواع الخيول (Broodmare, Gelding, Mare) + العمر (Unknown age, 8y 8m) | `HorseFilters.tsx`, `HorsesTable.tsx`, `horseClassification.ts` |
| **2) محاذاة الجدول RTL** | عناوين الأعمدة لا تتوسط فوق المحتوى في وضع RTL | `table.tsx`, `HorsesTable.tsx` |

---

## التغييرات المطلوبة

### الجزء الأول: ترجمة الفلاتر (HorseFilters.tsx)

**المشكلة:** الفلاتر تستخدم نصوص إنجليزية مباشرة:
- "Gender", "Status", "Breed" (placeholders)
- "All Genders", "Male", "Female"
- "All Status", "Active", "Inactive"
- "All Breeds", "All Colors"
- "Clear Filters", "Filter Horses"
- "Search horses..."

**الحل:**
1. إضافة `useI18n` hook
2. استبدال جميع النصوص بـ `t()` keys
3. إضافة مفاتيح جديدة في `en.ts` و `ar.ts`

**المفاتيح الجديدة:**
```
horses.filters.gender: "الجنس" / "Gender"
horses.filters.status: "الحالة" / "Status"  
horses.filters.breed: "السلالة" / "Breed"
horses.filters.color: "اللون" / "Color"
horses.filters.allGenders: "جميع الجنس" / "All Genders"
horses.filters.male: "ذكر" / "Male"
horses.filters.female: "أنثى" / "Female"
horses.filters.allStatus: "جميع الحالات" / "All Status"
horses.filters.allBreeds: "جميع السلالات" / "All Breeds"
horses.filters.allColors: "جميع الألوان" / "All Colors"
horses.filters.clearFilters: "مسح الفلاتر" / "Clear Filters"
horses.filters.filterHorses: "تصفية الخيول" / "Filter Horses"
```

---

### الجزء الثاني: ترجمة حالة الخيل وأنواعه (HorsesTable.tsx)

**المشكلة الأولى - حالة الخيل:**
- `{horse.status || "draft"}` يعرض "active" بالإنجليزي

**الحل:**
- استخدام `t('common.active')` و `t('common.inactive')` بدلاً من القيمة المباشرة

**المشكلة الثانية - نوع الخيل (Broodmare, Gelding, Mare):**
- `getHorseTypeBadgeProps()` يُرجع `label` (إنجليزي) و `labelAr` (عربي)
- الكود الحالي يستخدم `typeBadgeProps.label` فقط

**الحل:**
- استخدام `dir === 'rtl' ? typeBadgeProps.labelAr : typeBadgeProps.label`

**المشكلة الثالثة - العمر (Unknown age, 8y 8m):**
- `formatAgeCompact()` في `horseClassification.ts` يُرجع نصوص إنجليزية

**الحل:**
- تعديل `formatAgeCompact()` لقبول معامل اللغة
- أو إنشاء دالة مترجمة في المكون

---

### الجزء الثالث: محاذاة الجدول RTL (table.tsx)

**المشكلة:**
- `TableHead` يستخدم `text-left` ثابت
- في RTL يجب أن يكون `text-right` أو `text-start`

**الحل:**
- تغيير `text-left` إلى `text-start` (يتحول تلقائياً مع direction)
- إضافة `text-center` للعناوين لتتوسط فوق المحتوى

---

## التفاصيل التقنية

### تعديل table.tsx

```typescript
// الحالي:
className={cn(
  "h-12 px-4 text-left align-middle font-medium...",
  className,
)}

// الجديد:
className={cn(
  "h-12 px-4 text-center align-middle font-medium...",
  className,
)}
```

### تعديل HorsesTable.tsx

```typescript
const { t, dir } = useI18n();

// للنوع:
<Badge className={cn("text-xs", typeBadgeProps.className)}>
  {dir === 'rtl' ? typeBadgeProps.labelAr : typeBadgeProps.label}
</Badge>

// للحالة:
<Badge ...>
  {horse.status === 'active' ? t('common.active') : 
   horse.status === 'inactive' ? t('common.inactive') : 
   t('common.draft')}
</Badge>

// للعمر:
const formatAgeLocalized = (ageParts: AgeParts | null) => {
  if (!ageParts) return t('horses.unknownAge');
  // تنسيق مترجم
};
```

### تعديل horseClassification.ts

إضافة دالة جديدة `formatAgeCompactLocalized` أو تحديث الدالة الحالية لتقبل ترجمات:

```typescript
export function formatAgeCompactLocalized(
  ageParts: AgeParts | null, 
  translations: { year: string; years: string; month: string; months: string; week: string; weeks: string; day: string; days: string; unknown: string }
): string {
  if (!ageParts) return translations.unknown;
  // ... logic with translated labels
}
```

---

## الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|----------|
| `src/components/horses/HorseFilters.tsx` | إضافة i18n للفلاتر |
| `src/components/horses/HorsesTable.tsx` | ترجمة النوع والحالة والعمر + محاذاة RTL |
| `src/components/ui/table.tsx` | تغيير `text-left` إلى `text-center` أو `text-start` |
| `src/lib/horseClassification.ts` | إضافة دالة عمر مترجمة |
| `src/i18n/locales/en.ts` | إضافة مفاتيح الفلاتر والعمر |
| `src/i18n/locales/ar.ts` | إضافة ترجمات الفلاتر والعمر |

---

## المفاتيح الجديدة (ملخص)

**~20 مفتاح جديد:**

```
horses.filters.*: gender, status, breed, color, allGenders, male, female, allStatus, allBreeds, allColors, clearFilters, filterHorses

horses.age.*: year, years, month, months, week, weeks, day, days, unknownAge
```

---

## معايير القبول

| الاختبار | النتيجة المتوقعة |
|----------|-----------------|
| الفلاتر بالعربي | Gender → الجنس، Status → الحالة، وجميع الخيارات مترجمة |
| حالة الخيل | "active" → "نشط" |
| نوع الخيل | "Broodmare" → "فرس تربية"، "Mare" → "فرس"، "Gelding" → "حصان مخصي" |
| العمر | "8y 8m" → "8 سنوات 8 أشهر" أو "8س 8ش"، "Unknown age" → "عمر غير معروف" |
| محاذاة الجدول | عناوين الأعمدة تتوسط فوق المحتوى في RTL |
