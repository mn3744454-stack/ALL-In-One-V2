
# خطة إصلاح صفحة ملف الخيل: الترجمة + UI/UX للموبايل + التحسينات

## ملخص المشاكل المكتشفة

### 1. مشكلة UI/UX في الموبايل (من الصور)
| المكون | المشكلة |
|--------|---------|
| `CurrentOwnership.tsx` | أيقونات الإجراءات (Transfer, Edit, Delete) تخرج عن حدود الكارد |
| `TransferOwnershipDialog.tsx` | تخطيط Dialog غير مناسب للموبايل |
| `OwnershipTimeline.tsx` | التخطيط يحتاج تحسين للشاشات الصغيرة |

### 2. النصوص الإنجليزية غير المترجمة

#### في `CurrentOwnership.tsx`:
- "Current Ownership" → "الملكية الحالية"
- "Add Owner" → "إضافة مالك"
- "Total Ownership" → "إجمالي الملكية"
- "Primary" → "الرئيسي"
- "No owners assigned yet" → "لم يتم تعيين ملاك بعد"
- "Owner" (في dialogs) → "المالك"
- "Percentage (%)" → "النسبة (%)"
- "Primary Owner" (switch label)
- "Remove Owner?" → "إزالة المالك؟"
- رسائل Toast: "Owner added/removed/updated"

#### في `TransferOwnershipDialog.tsx`:
- "Transfer Ownership" → "نقل الملكية"
- "From" → "من"
- "Current:" → "الحالي:"
- "Transfer To" → "نقل إلى"
- "Existing Owner" → "مالك حالي"
- "New Owner" → "مالك جديد"
- "Select Recipient" → "اختر المستلم"
- "Select recipient" (placeholder)
- "No other owners" → "لا يوجد ملاك آخرون"
- "No available owners" → "لا يوجد ملاك متاحون"
- "Percentage to Transfer" → "نسبة النقل"
- "Max:" → "الحد الأقصى:"
- "Effective Date" → "تاريخ السريان"
- "Transfer" / "Transferring..." → "نقل" / "جاري النقل..."
- رسائل Toast: "Transfer successful/failed"

#### في `OwnershipTimeline.tsx`:
- "Ownership History" → "سجل الملكية"
- "No ownership changes recorded yet" → "لم تُسجل تغييرات على الملكية بعد"
- "Owner Added" → "تمت إضافة مالك"
- "Ownership Updated" → "تم تحديث الملكية"
- "Owner Removed" → "تمت إزالة مالك"
- "Primary" (badge) → "رئيسي"
- "Unknown Owner" → "مالك غير معروف"

---

## خطة الحل التفصيلية

### الجزء الأول: إصلاح UI/UX للموبايل في CurrentOwnership

**التخطيط الحالي:**
```text
┌─────────────────────────────────────────────┐
│ [Avatar] [Name + Badge] [17%] [⟲][✎][🗑]  │ ← الأيقونات تخرج
└─────────────────────────────────────────────┘
```

**التخطيط المحسّن للموبايل:**
```text
┌─────────────────────────────────────────────┐
│ [Avatar]  [Name]              [17%]         │
│           [Arabic name]       [Primary]     │
│ ─────────────────────────────────────────── │
│         [⟲ نقل]  [✎ تعديل]  [🗑 حذف]        │
└─────────────────────────────────────────────┘
```

**التغييرات:**
1. تحويل layout من `flex-row` إلى `flex-col` على الموبايل
2. نقل أزرار الإجراءات لصف منفصل
3. استخدام `gap` مناسب بين العناصر
4. إضافة `overflow-hidden` للكارد

### الجزء الثاني: إصلاح TransferOwnershipDialog للموبايل

**التحسينات:**
1. إضافة `max-h-[85vh] overflow-y-auto` للـ content
2. تحسين spacing بين العناصر
3. جعل السهم يدعم RTL (↓ بدلاً من →)
4. تحسين حجم الـ buttons على الموبايل

### الجزء الثالث: إضافة مفاتيح الترجمة

**مفاتيح جديدة في `horses.ownership`:**
```typescript
ownership: {
  // CurrentOwnership.tsx
  currentOwnership: "الملكية الحالية",
  totalOwnership: "إجمالي الملكية",
  remaining: "متبقي",
  totalShouldBe100: "الإجمالي يجب أن يكون 100% ({{remaining}}% متبقي)",
  noOwnersAssigned: "لم يتم تعيين ملاك بعد",
  primary: "رئيسي",
  editOwnership: "تعديل الملكية",
  percentage: "النسبة (%)",
  removeOwner: "إزالة المالك؟",
  removeOwnerConfirm: "إزالة {{owner}} من ملكية {{horse}}؟ لا يمكن التراجع.",
  removing: "جاري الإزالة...",
  
  // TransferOwnershipDialog.tsx
  transferOwnership: "نقل الملكية",
  from: "من",
  current: "الحالي",
  transferTo: "نقل إلى",
  existingOwner: "مالك حالي",
  newOwner: "مالك جديد",
  selectRecipient: "اختر المستلم",
  noOtherOwners: "لا يوجد ملاك آخرون",
  noAvailableOwners: "لا يوجد ملاك متاحون",
  percentageToTransfer: "نسبة النقل",
  maxPercentage: "الحد الأقصى: {{max}}%",
  effectiveDate: "تاريخ السريان",
  transfer: "نقل",
  transferring: "جاري النقل...",
  transferSuccess: "تم نقل الملكية",
  transferSuccessDesc: "تم نقل {{percentage}}% إلى {{recipient}}",
  transferFailed: "فشل نقل الملكية",
  
  // OwnershipTimeline.tsx
  history: "سجل الملكية",
  noChangesRecorded: "لم تُسجل تغييرات على الملكية بعد",
  actions: {
    added: "تمت إضافة مالك",
    updated: "تم تحديث الملكية",
    removed: "تمت إزالة مالك",
    transferred: "تم نقل الملكية",
  },
  unknownOwner: "مالك غير معروف",
  fromPercentage: "(من {{percentage}}%)",
  
  // Toast messages
  ownerAdded: "تمت إضافة المالك بنجاح",
  ownerUpdated: "تم تحديث الملكية",
  ownerRemoved: "تمت إزالة المالك",
  
  // Validation
  selectRecipientError: "يرجى اختيار المستلم",
  invalidPercentage: "نسبة غير صالحة. الحد الأقصى: {{max}}%",
}
```

---

## الملفات المطلوب تعديلها

| الملف | العملية | الوصف |
|-------|---------|-------|
| `src/components/horses/CurrentOwnership.tsx` | تعديل | إصلاح UI للموبايل + إضافة i18n |
| `src/components/horses/TransferOwnershipDialog.tsx` | تعديل | إصلاح UI للموبايل + إضافة i18n + دعم RTL للسهم |
| `src/components/horses/OwnershipTimeline.tsx` | تعديل | إضافة i18n |
| `src/i18n/locales/ar.ts` | تعديل | إضافة مفاتيح `horses.ownership` |
| `src/i18n/locales/en.ts` | تعديل | إضافة مفاتيح `horses.ownership` |

**إجمالي التغييرات المتوقعة:** ~350 سطر

---

## التفاصيل التقنية

### تخطيط كارد المالك المحسّن (CurrentOwnership)

```tsx
<div className="flex flex-col gap-3 p-4 rounded-xl border bg-card">
  {/* Top row: Avatar + Name + Percentage */}
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full ...">
      {ownership.is_primary ? <Crown /> : <Users />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium truncate">{ownership.owner?.name}</span>
        {ownership.is_primary && (
          <Badge>{t('horses.ownership.primary')}</Badge>
        )}
      </div>
      {ownership.owner?.name_ar && (
        <p className="text-sm text-muted-foreground truncate" dir="rtl">
          {ownership.owner.name_ar}
        </p>
      )}
    </div>
    <span className="font-bold text-lg text-gold shrink-0">
      {ownership.ownership_percentage}%
    </span>
  </div>
  
  {/* Bottom row: Action buttons */}
  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
    <Button variant="ghost" size="sm" className="gap-1.5">
      <ArrowRightLeft className="w-4 h-4" />
      <span className="hidden sm:inline">{t('...')}</span>
    </Button>
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Trash2 className="w-4 h-4 text-destructive" />
    </Button>
  </div>
</div>
```

### السهم في TransferOwnershipDialog مع RTL

```tsx
import { ArrowDown } from "lucide-react";

// بدلاً من ArrowRight الذي يحتاج للـ flip
<div className="flex justify-center py-2">
  <ArrowDown className="w-6 h-6 text-gold" />
</div>
```

---

## معايير القبول

| الاختبار | النتيجة المتوقعة |
|----------|------------------|
| عرض الموبايل (< 640px) | الأيقونات داخل حدود الكارد |
| عرض التابلت والديسكتوب | التخطيط يبقى أنيقاً |
| وضع RTL (العربي) | جميع النصوص مترجمة والاتجاه صحيح |
| وضع LTR (الإنجليزي) | يعمل بشكل صحيح |
| Dialog نقل الملكية | يعمل على الموبايل بدون scroll issues |
| سجل الملكية | مترجم بالكامل |
| رسائل Toast | مترجمة بالكامل |
