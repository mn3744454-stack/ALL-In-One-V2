

# خطة تحسين معالج إنشاء العينة (Create Sample Wizard) - الجولة الثانية

## ملخص التحسينات المطلوبة

بناءً على ملاحظاتك التفصيلية الثمانية، سيتم تنفيذ تحسينات شاملة على UX/UI للمعالج مع التركيز على تقليل التشتت وتحسين قابلية الاستخدام.

---

## المرحلة 1: إعادة تصميم هيكل الهيدر (1.1)

### الوضع الحالي:
```text
┌─────────────────────────────────────────────┐
│ إنشاء عينة                            [X]  │  ← صف 1
├─────────────────────────────────────────────┤
│     ⑥ ─ ⑤ ─ ④ ─ ③ ─ ② ─ ①               │  ← صف 2
├─────────────────────────────────────────────┤
│              العميل                         │  ← صف 3
└─────────────────────────────────────────────┘
```

### التصميم الجديد:
```text
┌─────────────────────────────────────────────┐
│ إنشاء عينة   ⑥─⑤─④─③─②─①            [X]  │  ← صف واحد
├─────────────────────────────────────────────┤
│              العميل                         │  ← عنوان المرحلة
└─────────────────────────────────────────────┘
```

### التغييرات التقنية:
- دمج `DialogTitle` و Step Indicator في `flex` row واحد
- تقليل حجم الدوائر إلى `w-6 h-6` على الموبايل
- توفير ~50-60px من المساحة الرأسية

---

## المرحلة 2: إعادة هيكلة خطوة العميل (1.2, 1.3, 1.4)

### 2.1 ظهور الحقول تحت الخيار مباشرة

**التصميم الجديد باستخدام Collapsible:**

```text
┌─────────────────────────────────────────────┐
│ ● عميل مسجل                          [▼]   │
│   ┌─────────────────────────────────────┐   │
│   │ [اختر العميل ▼]                    │   │  ← يظهر هنا
│   │ أو + إنشاء عميل جديد               │   │
│   └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ ○ عميل جديد                                │
├─────────────────────────────────────────────┤
│ ○ بدون عميل                                 │
└─────────────────────────────────────────────┘
```

### 2.2 إلزامية السبب لخيار "بدون عميل"

**إضافة حقل جديد:**
```typescript
interface FormData {
  // ... existing
  no_client_reason: string;
}
```

**UI:**
```text
│ ● بدون عميل                                 │
│   ┌─────────────────────────────────────┐   │
│   │ ما سبب عدم ربط العينة بعميل؟ *      │   │
│   │ [                                  ]│   │
│   └─────────────────────────────────────┘   │
```

### 2.3 تعديل منطق canProceed()

```typescript
case 'client':
  if (formData.clientMode === 'none') {
    return formData.no_client_reason.trim().length >= 5;
  }
  if (formData.clientMode === 'registered') {
    return !!formData.client_id;
  }
  if (formData.clientMode === 'new') {
    return !!formData.client_id;
  }
  return false;
```

---

## المرحلة 3: تحسين نموذج العميل (3.1, 3.2, 3.3)

### 3.1 توضيح حقول الاسم

| الحقل الحالي | الحقل الجديد |
|-------------|-------------|
| اسم العميل * | اسم العميل (إنجليزي) * |
| Placeholder: أدخل اسم العميل | Placeholder: Enter client name |

### 3.2 دعم أرقام هواتف متعددة

**هيكل البيانات الجديد:**
```typescript
interface PhoneEntry {
  number: string;
  label: 'mobile' | 'work' | 'home';
  is_whatsapp: boolean;
  is_primary: boolean;
}
```

**UI Component جديد:**
```text
الهواتف:
┌─────────────────────────────────────────────┐
│ [+966 5XX XXX XXXX] [📱جوال ▼] [✓ واتساب] [×]│
├─────────────────────────────────────────────┤
│ [+ إضافة رقم آخر]                          │
└─────────────────────────────────────────────┘
```

**ملاحظة:** يتطلب migration لإضافة عمود `phones` من نوع `jsonb`.

### 3.3 المسافة بين الأزرار

```tsx
<DialogFooter className="flex gap-3">
  <Button variant="outline">{t("common.cancel")}</Button>
  <Button>{t("common.create")}</Button>
</DialogFooter>
```

---

## المرحلة 4: نظام حد الائتمان (4.1)

### 4.1 آلية العمل

**الحقول في جدول clients:**
- `credit_limit` (decimal) - الحد الأقصى
- `outstanding_balance` (decimal) - المستحق الحالي (محسوب تلقائياً)

**منطق التحقق:**
```typescript
const canCreateInvoice = (client: Client, invoiceAmount: number) => {
  if (!client.credit_limit) return true;
  const projected = client.outstanding_balance + invoiceAmount;
  return projected <= client.credit_limit;
};
```

**مستويات التنبيه:**
| النسبة | الإجراء |
|--------|---------|
| 0-79% | طبيعي |
| 80-99% | تحذير (بادج برتقالي) |
| ≥100% | منع إنشاء فواتير جديدة |

**الارتباطات:**
- عند إنشاء فاتورة: `outstanding_balance += invoice.total`
- عند تسديد فاتورة: `outstanding_balance -= payment.amount`
- تقرير شهري للعملاء المتجاوزين

---

## المرحلة 5: تحسين نموذج الخيل (5.1, 5.2)

### 5.1 دعم الاسم العربي/الإنجليزي

**إضافة عمود في lab_horses:**
```sql
ALTER TABLE lab_horses ADD COLUMN name_ar text;
```

**UI:**
```text
┌──────────────────────┬──────────────────────┐
│ اسم الخيل (إنجليزي)*│ اسم الخيل (عربي)   │
│ [Enter horse name  ]│ [أدخل اسم الخيل   ]│
└──────────────────────┴──────────────────────┘
```

### 5.2 فتح النموذج كـ Dialog منفصل

**التغيير:**
نقل نموذج تسجيل الخيل من داخل `LabHorsePicker` إلى `LabHorseFormDialog` منفصل:

```tsx
// في LabHorsePicker
<Button onClick={() => setHorseDialogOpen(true)}>
  + تسجيل خيل جديد
</Button>

<LabHorseFormDialog
  open={horseDialogOpen}
  onOpenChange={setHorseDialogOpen}
  onSuccess={handleHorseCreated}
/>
```

---

## المرحلة 6: إصلاح خطوة الفاتورة (6.1)

### 6.1 إصلاح الترجمات المفقودة

**إضافة المفاتيح:**
```typescript
// ar.ts
"laboratory.checkout.sampleFee": "رسوم العينة",
"laboratory.createSample.invoicePreview": "معاينة الفاتورة",
"laboratory.createSample.createInvoice": "إنشاء فاتورة",
"laboratory.createSample.skipInvoiceInfo": "يمكنك إنشاء الفاتورة لاحقاً من تفاصيل العينة.",
"laboratory.createSample.missingPricesWarning": "بعض القوالب ليس لها أسعار.",
"laboratory.createSample.noClientForInvoice": "لم يتم تحديد عميل. يجب اختيار عميل لإنشاء الفاتورة.",
```

### 6.2 تفعيل إنشاء الفاتورة

**تعديل handleSubmit:**
```typescript
// عند formData.create_invoice = true
if (isPrimaryLabTenant && formData.create_invoice && formData.client_id) {
  await createInvoiceForSamples(createdSampleIds, formData.client_id, checkoutLineItems);
}
```

### 6.3 خيار فتح الفاتورة كـ Dialog

بدلاً من عرض الفاتورة داخل الـ Wizard، استخدام `GenerateInvoiceDialog` كـ popup:

```tsx
<Button onClick={() => setInvoiceDialogOpen(true)}>
  معاينة وإنشاء الفاتورة
</Button>
```

---

## المرحلة 7: تحسين اختيار العميل في الفاتورة (7.1)

### السلوك الجديد:

**إذا كانت العينة مرتبطة بعميل:**
```text
┌─────────────────────────────────────────────┐
│ 👤 العميل: سامي الحرازي                    │  ← للقراءة فقط
│ (مرتبط من إنشاء العينة)                    │
└─────────────────────────────────────────────┘
```

**إذا لم يكن هناك عميل:**
```text
┌─────────────────────────────────────────────┐
│ اختر العميل:                               │
│ [سامي الحرازي              ▼]              │
└─────────────────────────────────────────────┘
```

---

## المرحلة 8: فتح القوالب كـ Dialog (8.1)

### التصميم الجديد:

**داخل الـ Wizard:**
```text
┌─────────────────────────────────────────────┐
│ القوالب المطلوبة:                          │
│                                             │
│ [📋 اختيار القوالب (2 مختارة)]            │  ← زر يفتح Dialog
│                                             │
│ القوالب المختارة:                          │
│ [تحليل الدم الشامل] [تحليل البول]         │
└─────────────────────────────────────────────┘
```

**TemplateSelectionDialog:**
```text
┌─────────────────────────────────────────────┐
│ اختيار القوالب                        [X] │
├─────────────────────────────────────────────┤
│ [✓] تطبيق على جميع الخيول                  │
│ [□] تخصيص لكل حصان                          │
├─────────────────────────────────────────────┤
│ [✓] تحليل الدم الشامل           150 SAR   │
│ [✓] تحليل البول الأساسي          80 SAR   │
│ [ ] فحص الطفيليات               120 SAR   │
├─────────────────────────────────────────────┤
│                    [تأكيد الاختيار]        │
└─────────────────────────────────────────────┘
```

---

## الملفات المتأثرة

| الملف | التغييرات |
|-------|-----------|
| `CreateSampleDialog.tsx` | إعادة هيكلة الهيدر، خطوة العميل، منطق canProceed |
| `ClientFormDialog.tsx` | توضيح الحقول، دعم الهواتف المتعددة |
| `LabHorsePicker.tsx` | نقل النموذج إلى Dialog منفصل |
| `LabHorseFormDialog.tsx` | **ملف جديد** لنموذج الخيل |
| `TemplateSelectionDialog.tsx` | **ملف جديد** لاختيار القوالب |
| `GenerateInvoiceDialog.tsx` | تعبئة العميل تلقائياً |
| `ar.ts` / `en.ts` | إضافة ترجمات مفقودة |

---

## تغييرات قاعدة البيانات المطلوبة

### Migration 1: دعم الهواتف المتعددة
```sql
ALTER TABLE clients ADD COLUMN phones jsonb DEFAULT '[]';
```

### Migration 2: اسم الخيل بالعربي
```sql
ALTER TABLE lab_horses ADD COLUMN name_ar text;
```

---

## قائمة الترجمات الجديدة

```typescript
// ar.ts
"clients.form.nameEn": "اسم العميل (إنجليزي)",
"clients.form.nameEnPlaceholder": "Enter client name",
"clients.form.phones": "أرقام الهاتف",
"clients.form.addPhone": "إضافة رقم",
"clients.form.whatsapp": "واتساب",
"clients.form.primaryPhone": "الرقم الرئيسي",

"laboratory.clientMode.noClientReason": "ما سبب عدم ربط العينة بعميل؟",
"laboratory.clientMode.noClientReasonPlaceholder": "اكتب السبب هنا...",

"laboratory.labHorses.nameEn": "اسم الخيل (إنجليزي)",
"laboratory.labHorses.nameAr": "اسم الخيل (عربي)",
"laboratory.labHorses.registerHorse": "تسجيل خيل جديد",

"laboratory.templates.selectTemplates": "اختيار القوالب",
"laboratory.templates.selectedCount": "{{count}} قالب مختار",
"laboratory.templates.confirmSelection": "تأكيد الاختيار",
```

---

## الأولويات

| الأولوية | المرحلة | السبب |
|----------|---------|-------|
| عالية | 1, 2 | تحسين UX أساسي للهيدر والعميل |
| عالية | 6 | إصلاح الفاتورة (لا تعمل حالياً) |
| متوسطة | 3, 5 | تحسين النماذج |
| متوسطة | 8 | تقليل التشتت |
| منخفضة | 4, 7 | ميزات إضافية |

---

## قائمة الاختبار بعد التنفيذ

1. ✅ الهيدر مضغوط ومنظم
2. ✅ حقول العميل تظهر تحت الخيار المحدد مباشرة
3. ✅ خيار "بدون عميل" يتطلب سبب
4. ✅ زر "التالي" معطل حتى استيفاء الشروط
5. ✅ حقول الاسم واضحة (إنجليزي/عربي)
6. ✅ إمكانية إضافة أرقام هواتف متعددة
7. ✅ نموذج الخيل يفتح كـ Dialog
8. ✅ الفاتورة تُنشأ فعلياً
9. ✅ القوالب تُختار من Dialog منفصل
10. ✅ التحقق على حسابي الإسطبل والمختبر

