

# استكمال خطة تطوير صفحة المختبر

## ✅ ما تم تنفيذه
- إصلاح قاعدة البيانات (migration) لحل خطأ `text = uuid`

## ❌ المتبقي للتنفيذ

### 1. إنشاء مكون DateRangeFilter.tsx
مكون جديد لاختيار نطاق التاريخ:
```
┌─────────────────┐  ┌─────────────────┐  ┌──────┐
│ من تاريخ    📅 │  │ إلى تاريخ   📅 │  │ مسح │
└─────────────────┘  └─────────────────┘  └──────┘
```

### 2. إنشاء SamplesTable.tsx
جدول العينات مع الأعمدة:
| # | العميل | الخيل | رقم العينة | الحالة | تاريخ الجمع | القوالب | الإجراءات |

### 3. إنشاء ResultsTable.tsx
جدول النتائج مع الأعمدة:
| # | الخيل | القالب | الحالة | العلامات | تاريخ الإنشاء | الإجراءات |

### 4. تعديل useLabSamples.ts
- إضافة `dateFrom` و `dateTo` للـ filters
- تطبيق الفلاتر على `collection_date`

### 5. تعديل useLabResults.ts
- إضافة `dateFrom` و `dateTo` للـ filters
- تطبيق الفلاتر على `created_at`

### 6. تعديل SamplesList.tsx
- استيراد `ViewSwitcher` و `useViewPreference`
- إضافة `DateRangeFilter`
- تغيير `getFiltersForTab` لاستخدام `status: 'draft'` لتبويبة "غير مستلم"
- عرض Grid/List/Table حسب الاختيار

### 7. تعديل ResultsList.tsx
- استيراد `ViewSwitcher` و `useViewPreference`
- إضافة `DateRangeFilter`
- عرض Grid/List/Table حسب الاختيار

### 8. تحديث index.ts
- تصدير المكونات الجديدة

### 9. تحديث الترجمات (ar.ts و en.ts)
```typescript
laboratory.filters.fromDate: "من تاريخ" / "From Date"
laboratory.filters.toDate: "إلى تاريخ" / "To Date"
laboratory.filters.clearDates: "مسح التواريخ" / "Clear Dates"
laboratory.table.number: "#" / "#"
laboratory.table.client: "العميل" / "Client"
laboratory.table.horse: "الخيل" / "Horse"
laboratory.table.sampleId: "رقم العينة" / "Sample ID"
laboratory.table.status: "الحالة" / "Status"
laboratory.table.collectionDate: "تاريخ الجمع" / "Collection Date"
laboratory.table.templates: "القوالب" / "Templates"
laboratory.table.actions: "الإجراءات" / "Actions"
laboratory.table.resultDate: "تاريخ النتيجة" / "Result Date"
laboratory.table.template: "القالب" / "Template"
laboratory.table.flags: "العلامات" / "Flags"
laboratory.table.createdBy: "المنشئ" / "Created By"
```

---

## الملفات المطلوب إنشاؤها/تعديلها

| الملف | العملية |
|-------|---------|
| `src/components/laboratory/DateRangeFilter.tsx` | إنشاء |
| `src/components/laboratory/SamplesTable.tsx` | إنشاء |
| `src/components/laboratory/ResultsTable.tsx` | إنشاء |
| `src/components/laboratory/index.ts` | تعديل |
| `src/components/laboratory/SamplesList.tsx` | تعديل |
| `src/components/laboratory/ResultsList.tsx` | تعديل |
| `src/hooks/laboratory/useLabSamples.ts` | تعديل |
| `src/hooks/laboratory/useLabResults.ts` | تعديل |
| `src/i18n/locales/ar.ts` | تعديل |
| `src/i18n/locales/en.ts` | تعديل |

---

## التحسينات على منطق "غير مستلم"

### التغيير في getFiltersForTab:
```typescript
case 'unreceived':
  return { status: 'draft' };  // بدلاً من received: false
```

### سير العمل:
```
draft (غير مستلم) → استلام → accessioned (مستلم)
```

عند الضغط على "استلام":
1. تحديث `status` إلى `accessioned`
2. تعيين `received_at` و `received_by`

