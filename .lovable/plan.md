
# خطة تنفيذ: إعادة تصميم معالج إنشاء العينة (Create Sample Wizard) للمختبرات

## ملخص التغييرات المطلوبة

بناءً على طلباتك المتكررة وتوضيحاتك الأخيرة، سيتم إعادة تصميم معالج إنشاء العينة بالكامل **للمستخدمين من نوع "مختبر" فقط** (مثل: مختبر المتميز لتحاليل الخيل). لن يتأثر المستخدمون من أنواع أخرى (الإسطبلات، العيادات، إلخ).

### التغييرات الرئيسية:
1. **ترتيب خطوات جديد من 6 خطوات** (بدلاً من 5)
2. **خطوة العميل في البداية** (الخطوة 1)
3. **تبسيط خيارات العميل** (عميل مسجل / عميل جديد / بدون عميل)
4. **خطوة الفوترة الجديدة** (الخطوة 5)
5. **اختيار قوالب مرن** (تطبيق على الكل مع إمكانية تخصيص لكل حصان)

---

## الترتيب الجديد للخطوات (للمختبرات فقط)

```text
LAB_STEPS (6 خطوات):
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  الخطوة 1   │  الخطوة 2   │  الخطوة 3   │  الخطوة 4   │  الخطوة 5   │  الخطوة 6   │
│   العميل    │   الخيول    │  القوالب    │  التفاصيل   │   الفاتورة  │  المراجعة   │
│   client    │   horses    │  templates  │   details   │   billing   │   review    │
│             │             │             │             │  (جديدة)    │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**مقارنة بالترتيب الحالي:**
```text
CURRENT (5 خطوات):
horses → basic → templates → details (يحتوي على العميل) → review
```

---

## المرحلة 1: إعادة هيكلة خطوة العميل (الخطوة 1)

### 1.1 تبسيط خيارات العميل

**الحالي:**
- عميل مسجل (existing) → يحتوي على "إضافة عميل سريعة" داخله
- عميل زائر (walkin) → نموذج يدوي
- بدون عميل (none)

**المطلوب:**
- عميل مسجل (registered) → اختيار من القائمة الموجودة
- عميل جديد (new) → فتح نموذج إنشاء عميل كامل (بدلاً من المختصر)
- بدون عميل (none) → المتابعة بدون عميل

### 1.2 الفرق بين الخيارات الحالية (للتوضيح)

| الخيار | الوظيفة | أين يُحفظ العميل؟ |
|--------|---------|------------------|
| عميل مسجل | اختيار عميل موجود في قاعدة البيانات | مرتبط بـ `client_id` |
| عميل زائر | إدخال بيانات عميل مؤقتة (لا تُحفظ كعميل) | محفوظ داخل العينة فقط (`client_name`, `client_phone`) |
| بدون عميل | لا يوجد عميل مرتبط | لا شيء |

**التغيير المطلوب:**
- "عميل جديد" سيفتح `ClientFormDialog` لإنشاء عميل حقيقي في قاعدة البيانات
- بعد الإنشاء، يتم اختياره تلقائياً كـ "عميل مسجل"
- إزالة خيار "عميل زائر" المنفصل (سيصبح مدمجاً في "إضافة عميل جديد")

### 1.3 مكونات UI للخطوة الجديدة

```tsx
// Step: client
<div className="space-y-4">
  <Label>{t("laboratory.createSample.selectClient")}</Label>
  
  <RadioGroup value={clientMode} onValueChange={setClientMode}>
    {/* Option 1: Registered Client */}
    <RadioGroupItem value="registered">
      <User /> {t("laboratory.clientMode.registered")}
    </RadioGroupItem>
    
    {/* Option 2: New Client */}
    <RadioGroupItem value="new">
      <UserPlus /> {t("laboratory.clientMode.newClient")}
    </RadioGroupItem>
    
    {/* Option 3: No Client */}
    <RadioGroupItem value="none">
      <UserX /> {t("laboratory.clientMode.none")}
    </RadioGroupItem>
  </RadioGroup>
  
  {clientMode === 'registered' && (
    <ClientSelector onClientSelect={...} />
  )}
  
  {clientMode === 'new' && (
    <Button onClick={() => setClientFormOpen(true)}>
      {t("laboratory.clientMode.createNewClient")}
    </Button>
  )}
</div>
```

---

## المرحلة 2: خطوة الخيول (الخطوة 2)

تبقى كما هي مع `LabHorsePicker` للمختبرات، تدعم:
- اختيار خيول متعددة من سجل خيول المختبر
- إضافة حصان جديد (Walk-in horse)

---

## المرحلة 3: خطوة القوالب (الخطوة 3)

### 3.1 اختيار القوالب المرن

**السيناريو الجديد:**
1. **تطبيق على الكل (افتراضي)**: اختيار القوالب مرة واحدة وتطبيقها على جميع الخيول
2. **تخصيص لكل حصان**: تفعيل مفتاح "تخصيص لكل حصان" لتحديد قوالب مختلفة لكل حصان

### 3.2 UI المقترح

```tsx
// Step: templates
<div className="space-y-4">
  {/* Toggle for customization */}
  {formData.selectedHorses.length > 1 && (
    <div className="flex items-center gap-2">
      <Switch 
        checked={customizePerHorse}
        onCheckedChange={setCustomizePerHorse}
      />
      <Label>{t("laboratory.createSample.customizeTemplatesPerHorse")}</Label>
    </div>
  )}
  
  {customizePerHorse ? (
    // Accordion for each horse
    <Accordion>
      {formData.selectedHorses.map((horse, idx) => (
        <AccordionItem key={idx}>
          <AccordionTrigger>
            {horse.horse_name}
            <Badge>{perHorseTemplates[idx]?.length || 0} قوالب</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <TemplateCheckboxList 
              selected={perHorseTemplates[idx]}
              onChange={(templates) => updatePerHorseTemplates(idx, templates)}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ) : (
    // Single template selection for all
    <TemplateCheckboxList 
      selected={formData.template_ids}
      onChange={(templates) => setFormData({ ...formData, template_ids: templates })}
    />
  )}
</div>
```

### 3.3 تحديث هيكل البيانات

```typescript
interface FormData {
  // ... existing fields
  template_ids: string[]; // للتطبيق على الكل
  per_horse_templates?: Record<number, string[]>; // للتخصيص لكل حصان
  customize_templates_per_horse: boolean;
}
```

---

## المرحلة 4: خطوة التفاصيل (الخطوة 4)

تحتوي على:
- تاريخ الجمع (Collection Date)
- الرقم اليومي (Daily Number) مع التحقق من التكرار
- معرف العينة الفعلي (Physical Sample ID)
- ملاحظات إضافية

**ملاحظة**: تم نقل اختيار العميل منها إلى الخطوة 1.

---

## المرحلة 5: خطوة الفاتورة الجديدة (الخطوة 5)

### 5.1 الوظيفة

خطوة اختيارية لإنشاء فاتورة مباشرة أثناء إنشاء العينة. يمكن للمستخدم:
- تركها فارغة والمتابعة (إنشاء الفاتورة لاحقاً)
- إنشاء فاتورة مسودة مرتبطة بالعينات

### 5.2 UI المقترح

```tsx
// Step: billing (invoice)
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>{t("laboratory.createSample.createInvoice")}</Label>
    <Switch 
      checked={createInvoice}
      onCheckedChange={setCreateInvoice}
    />
  </div>
  
  {createInvoice ? (
    <Card className="p-4 space-y-4">
      {/* Invoice Preview */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t("laboratory.createSample.invoicePreview")}
        </p>
        
        {/* Line items from templates */}
        <Table>
          <TableBody>
            {checkoutLineItems.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>x{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{t("common.total")}</TableCell>
              <TableCell>{formatCurrency(checkoutTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      
      {/* Client info (auto-filled from Step 1) */}
      {selectedClient && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>{selectedClient.name}</span>
        </div>
      )}
      
      {/* Missing prices warning */}
      {hasMissingPrices && (
        <Alert variant="warning">
          <AlertDescription>
            {t("laboratory.createSample.missingPricesWarning")}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  ) : (
    <Alert>
      <AlertDescription>
        {t("laboratory.createSample.skipInvoiceInfo")}
      </AlertDescription>
    </Alert>
  )}
</div>
```

### 5.3 السلوك عند الإنشاء

```typescript
// في handleSubmit
if (createInvoice && !hasMissingPrices) {
  // Create draft invoice linked to samples
  await createInvoice({
    client_id: formData.client_id,
    status: 'draft',
    line_items: checkoutLineItems.map(item => ({
      entity_type: 'lab_sample',
      entity_id: sampleId,
      // ...
    }))
  });
}
```

---

## المرحلة 6: خطوة المراجعة (الخطوة 6)

تعرض ملخص كامل:
- العميل المحدد
- الخيول المختارة
- القوالب (عامة أو مخصصة لكل حصان)
- تفاصيل العينة
- حالة الفاتورة (تم إنشاؤها / لاحقاً)

---

## التفاصيل التقنية

### تحديث ALL_STEPS للمختبرات

```typescript
// في CreateSampleDialog.tsx

const LAB_STEPS: StepDef[] = [
  { key: 'client', title: 'Client', titleAr: 'العميل', icon: User },
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'billing', title: 'Invoice', titleAr: 'الفاتورة', icon: Receipt },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

const STABLE_STEPS: StepDef[] = [
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'billing', title: 'Credits', titleAr: 'الرصيد', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

// Dynamic step selection
const effectiveSteps = useMemo(() => {
  const baseSteps = isPrimaryLabTenant ? LAB_STEPS : STABLE_STEPS;
  return baseSteps.filter(s => {
    // Apply conditional logic
    if (s.key === 'checkout' && !showCheckoutStep) return false;
    // ...
    return true;
  });
}, [isPrimaryLabTenant, ...]);
```

### التحقق من تكرار الرقم اليومي

```typescript
const validateDailyNumber = async (dailyNumber: number, collectionDate: Date) => {
  const startOfDay = new Date(collectionDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(collectionDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const { data, error } = await supabase
    .from("lab_samples")
    .select("id")
    .eq("daily_number", dailyNumber)
    .gte("collection_date", startOfDay.toISOString())
    .lte("collection_date", endOfDay.toISOString())
    .limit(1);
  
  return data?.length === 0; // true if no collision
};
```

---

## الملفات المتأثرة

| الملف | التغييرات |
|-------|-----------|
| `src/components/laboratory/CreateSampleDialog.tsx` | إعادة هيكلة كاملة للخطوات |
| `src/i18n/locales/en.ts` | إضافة ترجمات جديدة |
| `src/i18n/locales/ar.ts` | إضافة ترجمات جديدة |
| `src/components/laboratory/WalkInClientForm.tsx` | قد يتم إزالته أو تبسيطه |

---

## قائمة الترجمات الجديدة

```typescript
// English
"laboratory.clientMode.registered": "Registered Client",
"laboratory.clientMode.newClient": "New Client",
"laboratory.clientMode.createNewClient": "Create New Client",
"laboratory.createSample.selectClient": "Select Client",
"laboratory.createSample.steps.client": "Client",
"laboratory.createSample.steps.billing": "Invoice",
"laboratory.createSample.createInvoice": "Create Invoice",
"laboratory.createSample.invoicePreview": "Invoice Preview",
"laboratory.createSample.skipInvoiceInfo": "You can create an invoice later from the sample details.",
"laboratory.createSample.missingPricesWarning": "Some templates don't have prices. You can add them in the invoice later.",
"laboratory.createSample.customizeTemplatesPerHorse": "Customize templates for each horse",
```

```typescript
// Arabic
"laboratory.clientMode.registered": "عميل مسجل",
"laboratory.clientMode.newClient": "عميل جديد",
"laboratory.clientMode.createNewClient": "إنشاء عميل جديد",
"laboratory.createSample.selectClient": "اختيار العميل",
"laboratory.createSample.steps.client": "العميل",
"laboratory.createSample.steps.billing": "الفاتورة",
"laboratory.createSample.createInvoice": "إنشاء فاتورة",
"laboratory.createSample.invoicePreview": "معاينة الفاتورة",
"laboratory.createSample.skipInvoiceInfo": "يمكنك إنشاء الفاتورة لاحقاً من تفاصيل العينة.",
"laboratory.createSample.missingPricesWarning": "بعض القوالب ليس لها أسعار. يمكنك إضافتها في الفاتورة لاحقاً.",
"laboratory.createSample.customizeTemplatesPerHorse": "تخصيص القوالب لكل حصان",
```

---

## الصلاحيات المطلوبة

| الإجراء | مفتاح الصلاحية |
|---------|----------------|
| إنشاء عينة | `laboratory.samples.create` |
| إنشاء عميل | `clients.create` |
| إنشاء فاتورة | `finance.invoice.create` |

**ملاحظة**: جميع هذه الصلاحيات موجودة بالفعل في النظام.

---

## قائمة الاختبار اليدوي

بعد التنفيذ، يجب التحقق من:

1. ✅ تسجيل الدخول بحساب المختبر (مختبر المتميز)
2. ✅ فتح معالج إنشاء العينة
3. ✅ التأكد من ظهور 6 خطوات بالترتيب الجديد
4. ✅ اختيار عميل مسجل والمتابعة
5. ✅ إنشاء عميل جديد والتأكد من اختياره تلقائياً
6. ✅ اختيار حصان واحد ومتعددة
7. ✅ تطبيق قوالب على الكل
8. ✅ تخصيص قوالب لكل حصان
9. ✅ إنشاء عينة مع فاتورة
10. ✅ إنشاء عينة بدون فاتورة
11. ✅ تسجيل الدخول بحساب الإسطبل (اسطبل القمة) والتأكد من عدم تأثره بالتغييرات
