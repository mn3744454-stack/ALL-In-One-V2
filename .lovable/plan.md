تقرير التدقيق الشامل - LAB Tenant + المالية + العملاء
ملخص تنفيذي

تم إجراء تدقيق كامل على 10 صور وعشرات الملفات. تم تحديد 17 مشكلة رئيسية:

P0 (حرج): 6 مشاكل - ترجمات مكسورة، أزرار لا تعمل

P1 (عالي): 8 مشاكل - UX ضعيف، منطق ناقص

P2 (متوسط): 3 مشاكل - ميزات جديدة مطلوبة

Image 1 - خطوة الفاتورة في معالج إنشاء العينة
1.1 خطوة الفاتورة غير مكتملة

الحالة: PARTIAL

ما يظهر في UI:

جدول بنود يعرض اسم القالب + السعر + الكمية (بدون اسم الخيل)

مفتاح تبديل "إنشاء فاتورة"

اسم العميل (إذا مختار)

لا يوجد إمكانية تعديل الأسعار

لا يوجد خيار تسجيل دفعة

السبب الجذري:

ملف: src/components/laboratory/CreateSampleDialog.tsx

السطور: 224-257 (checkoutLineItems useMemo)

المشكلة: لا يضيف horse.name للوصف

السطور: 1388-1467 (billing step render)

المشكلة: Table للعرض فقط، بدون inputs للتعديل، بدون زر "تسجيل دفعة"

خطة الإصلاح:

تعديل checkoutLineItems لتضمين horse_name في الوصف: "${template.name} - ${horse.horse_name}"

إضافة <Input> لتعديل السعر لكل بند في الجدول

إضافة قسم اختياري "تسجيل دفعة الآن" بعد تفعيل الفاتورة (يستخدم RecordPaymentDialog pattern)

تخزين الأسعار المعدلة في formData.manualPrices: Record<string, number>

✅ تعديل مهم (لمنع دفعة يتيمة + ضمان تسلسل محاسبي صحيح):

"تسجيل دفعة الآن" لا يتم قبل إنشاء الفاتورة فعلياً. المنطق الصحيح:

أولاً: إنشاء الفاتورة + إنشاء البنود + postLedgerForInvoice (debit)

ثم: فتح RecordPaymentDialog وتسجيل الدفع + postLedgerForPayments (credit)

UX مقترح: إظهار زر "تسجيل دفعة الآن" فقط بعد نجاح إنشاء الفاتورة (invoice_id موجود)، أو كخطوة قصيرة بعد billing داخل نفس الـ Wizard.

معيار القبول:

البنود تعرض: "تحليل الدم الشامل - دراقون x1 SAR 150"

يمكن تعديل السعر مباشرة

زر "تسجيل دفعة الآن" يظهر عند تفعيل الفاتورة وبعد نجاح إنشاء الفاتورة (invoice_id)

المخاطر: تحتاج تكامل صحيح مع postLedgerForPayments وتأكد ألا تُسجل دفعات بدون invoice_id.

Image 2 - نموذج إنشاء الفاتورة (GenerateInvoiceDialog)
2.1 النموذج يتجاوز الصفحة + أزرار ملتصقة

الحالة: PARTIAL

ما يظهر في UI:

النموذج يعمل لكن الأزرار "إلغاء" و "إنشاء الفاتورة" متقاربة جداً

على الهواتف قد يتجاوز النموذج حدود الشاشة

السبب الجذري:

ملف: src/components/laboratory/GenerateInvoiceDialog.tsx

السطر 174: className="sm:max-w-[600px]" - لا يوجد max-h أو overflow-y-auto

السطور 380-404: DialogFooter بدون gap كافٍ

خطة الإصلاح:

// Line 174
<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir={dir}>

// Line 380
<DialogFooter className="gap-3">


✅ تحسين إضافي للموبايل (Polish):

في الشاشات الصغيرة: اجعل الأزرار عمودية لتجنب الالتصاق:

DialogFooter يدعم sm:flex-row flex-col + w-full للأزرار عند الموبايل.

معيار القبول:

النموذج لا يتجاوز 90vh

فاصل واضح 12px+ بين الأزرار

على الموبايل لا يوجد التصاق/تداخل

2.2 "العينة: غير مرتبط"

الحالة: DONE (يحتاج توضيح فقط)

ما يعني:

sample.lab_horse_id = NULL والعينة لها horse_name فقط (walk-in)

لا علاقة بـ Connections/Share

السبب الجذري:

ملف: GenerateInvoiceDialog.tsx السطور 129-132

يعرض sourceName لكن لا يعرض sample.horse_name إذا لا يوجد horse object

خطة الإصلاح:

// Line 129-132 - improve sourceName logic
const sourceName =
  sourceType === "lab_sample"
    ? sample?.horse?.name || sample?.horse_name || t("laboratory.samples.unknownHorse")
    : request?.horse?.name || t("laboratory.samples.unknownHorse");


✅ تحسين مصطلح (UX):

استبدال النص "غير مرتبط" إلى مصطلح أوضح مثل: "خيل زائر" أو "خيل غير مسجل" + عرض الاسم إن وجد.

معيار القبول: يظهر "العينة: LAB-XXX (دراقون)" بدلاً من "غير مرتبط"

2.3 "اختر العميل" - هل يجب أن يكون مقفلاً؟

الحالة: PARTIAL

ما يظهر في UI:

العميل قابل للتعديل حتى لو sample.client_id موجود

السبب الجذري:

ملف: GenerateInvoiceDialog.tsx السطور 280-299

disabled={clientsLoading || hasExistingInvoices} - لا يفحص إذا العينة لها عميل

خطة الإصلاح:

// Line 280-284
const clientFromSample = sample?.client_id;
<Select
  value={selectedClientId}
  onValueChange={setSelectedClientId}
  disabled={clientsLoading || hasExistingInvoices || !!clientFromSample}
>


إضافة Badge "من العينة" عند clientFromSample

نموذج المنطق:

العميل (client_id): الجهة التي تستلم الفاتورة وتدفع

المالك (owner_name): مالك الخيل (معلوماتي فقط)

في LAB: العميل = من يدفع (قد يكون المالك أو مختلف مثل مستشفى)

✅ تحكم إضافي (Governance):

إذا احتجنا السماح بتغيير العميل كاستثناء، يكون عبر Permission/Role خاص (override) وليس افتراضياً للجميع.

Image 3 - قائمة العينات (SamplesList)
3.1 الفلاتر

الحالة: DONE

الدليل:

ملف: SamplesFilterTabs.tsx - يعمل بشكل صحيح

ملف: SamplesList.tsx السطور 115-127 - كل الفلاتر مربوطة

3.2 تسمية "مسودة" → "غير مستلمة"

الحالة: PARTIAL

ما يظهر في UI:

التبويب العلوي: "غير مستلم"

Badge في الجدول: "مسودة"

تناقض في المصطلحات

السبب الجذري:

ملف: SampleStatusBadge.tsx السطر 31 يستخدم: laboratory.sampleStatus.draft

ملف: ar.ts السطر ~570: sampleStatus.draft: "مسودة"

خطة الإصلاح:

// ar.ts - change sampleStatus.draft
sampleStatus: {
  draft: "غير مستلمة", // was "مسودة"
  ...
}

// en.ts
sampleStatus: {
  draft: "Not Received", // was "Draft"
  ...
}


معيار القبول: التبويب والـ Badge يعرضان نفس المصطلح "غير مستلم/ة"

3.3 "إنشاء فاتورة" → "عرض الفاتورة"

الحالة: NOT IMPLEMENTED

ما يظهر في UI:

دائماً "إنشاء فاتورة" حتى لو الفاتورة موجودة

السبب الجذري:

ملف: SamplesTable.tsx السطور 204-209

لا يوجد فحص hasInvoice في الـ sample data

useLabSamples.ts لا يجلب معلومات الفاتورة

خطة الإصلاح:

في useLabSamples.ts: إضافة join مع invoice_items للفحص

في SamplesTable.tsx:

{sample.hasInvoice ? (
  <DropdownMenuItem onClick={() => onViewInvoice?.(sample)}>
    <Eye className="h-4 w-4 me-2" />
    {t("laboratory.billing.viewInvoice")}
  </DropdownMenuItem>
) : (
  <DropdownMenuItem onClick={() => onGenerateInvoice?.(sample)}>
    <Receipt className="h-4 w-4 me-2" />
    {t("laboratory.billing.generateInvoice")}
  </DropdownMenuItem>
)}


✅ تقوية التحقق (Robustness):

لا تعتمد فقط على وجود invoice_items (قد توجد فاتورة بدون بنود بسبب خطأ).

الأفضل: إضافة/استخدام ربط مباشر بين sample والفاتورة إن كان متاحاً (مثل invoices.source_type/source_id) أو ضمان أن hasInvoice يعني "هناك invoice موجودة فعلاً" وليس "بنود فقط".

معيار القبول: العينات المفوترة تعرض "عرض الفاتورة"

3.4 إضافة "إلغاء العينة"

الحالة: PARTIAL

ما يظهر في UI:

لا يوجد زر إلغاء في القائمة المنسدلة

السبب الجذري:

ملف: useLabSamples.ts - cancelSample موجود

ملف: SamplesTable.tsx - الزر غير معروض (موجود في SampleCard فقط)

خطة الإصلاح:

// SamplesTable.tsx after line 195
{['accessioned', 'processing'].includes(sample.status) && (
  <DropdownMenuItem onClick={() => onCancel?.(sample)}>
    <XCircle className="h-4 w-4 me-2" />
    {t("laboratory.sampleActions.cancel")}
  </DropdownMenuItem>
)}


القواعد:

الإلغاء يغير status = 'cancelled' (soft delete)

متاح لـ accessioned, processing فقط

الحذف الفعلي متاح لـ draft فقط

✅ قاعدة إضافية (منع لبس مالي):

إذا كانت للعينة فاتورة بالفعل: عند الإلغاء اعرض Warning واضح (حتى لا تبقى “عينة ملغاة” مع تحصيل/دفعات بدون توضيح).

قرار MVP: إما منع الإلغاء بعد الفوترة أو السماح مع وسم الفاتورة/العينة بوضوح.

3.5 إضافة تبويبات "قيد التحليل" و "ملغي"

الحالة: NOT IMPLEMENTED

ما يظهر في UI:

التبويبات الحالية: اليوم، مستلم، غير مستلم، إعادة

لا يوجد processing أو cancelled

السبب الجذري:

ملف: SamplesFilterTabs.tsx السطر 19

tabKeys: ['today', 'received', 'unreceived', 'retest']

خطة الإصلاح:

// SamplesFilterTabs.tsx
export type SampleFilterTab = 'today' | 'received' | 'unreceived' | 'processing' | 'cancelled' | 'retest';
const tabKeys: SampleFilterTab[] = ['today', 'received', 'unreceived', 'processing', 'cancelled', 'retest'];


إضافة ترجمات laboratory.filterTabs.processing و filterTabs.cancelled

إضافة mapping في SamplesList.tsx getFiltersForTab

اقتراح: عند إضافة كل الحالات كتبويبات، إزالة dropdown فلتر الحالة

✅ قرار UX (أفضل من الحذف الكامل):

لا تحذف فلتر الحالة نهائياً. اجعله Advanced filter حتى مع وجود tabs (لأن المستخدم قد يحتاج اختيار حالات متعددة معاً).

Image 4 - تفاصيل الفاتورة
4.1 بنود الفاتورة غير قابلة للقراءة (UUIDs)

الحالة: BROKEN

ما يظهر في UI:

LAB:lab_sample:673f5a91-4e89-4e11-8c4a-27bc6212371d / Complete Blood Count (CBC) [27bc6212371d]

الملاحظات: [LAB_SAMPLE:673f5a91...]

السبب الجذري:

ملف: useLabInvoiceDraft.ts السطور 241-253

يخزن الوصف بتنسيق: [LAB:${sourceType}:${sourceId}] ${description}

ملف: InvoiceDetailsSheet.tsx السطور 140-153

enrichedDescription يضيف #daily_number لكن الوصف الأصلي يحتوي UUIDs

خطة الإصلاح:

في useLabInvoiceDraft.ts السطور 241-253:

// Change description format
const description = item.templateNameAr
  ? `${item.templateName} / ${item.templateNameAr}`
  : item.templateName;

await createItem({
  invoice_id: invoice.id,
  description: description, // Clean description without UUIDs
  quantity: item.quantity,
  unit_price: item.unitPrice ?? 0,
  total_price: item.total,
  entity_type: input.sourceType,
  entity_id: input.sourceId,
});


تخزين الربط في entity_type + entity_id بدلاً من embedded في الوصف

تحديث notes في Invoice:

notes: input.notes || `${input.sourceName}`, // Remove technical IDs


✅ معيار وصف نهائي (Acceptance):

وصف البند في العرض/الطباعة يجب أن يكون بصيغة ثابتة وواضحة:

"اسم القالب/الخدمة – اسم الخيل – رقم العينة/اليومي"

أي IDs تقنية تُحفظ في entity_type/entity_id فقط (ولا تظهر للمستخدم).

معيار القبول:

بند نموذجي: "تحليل الدم الشامل - دراقون #1 | SAR 150.00"

لا UUIDs ظاهرة

4.2 "إرسال للعميل" - هل يُرسل فعلاً؟

الحالة: PARTIAL (تحديث حالة فقط)

ما يظهر في UI:

الزر يغير الحالة إلى "sent" فقط

السبب الجذري:

ملف: InvoiceDetailsSheet.tsx السطور 181-199

handleSend يحدث status = 'sent' فقط

لا يوجد integration مع email/WhatsApp/push

خطة الإصلاح (MVP):

إضافة tooltip أو تغيير النص:

{t("finance.invoices.markAsSent")} // بدلاً من "إرسال للعميل"


أو إضافة confirmation dialog يوضح: "سيتم تحديث الحالة إلى 'مرسلة'. لا يتم إرسال رسالة تلقائياً."

Phase 2: Edge function للإرسال عبر WhatsApp/Email

✅ توضيح مصطلحي (لتجنب تضليل المستخدم):

التسمية الافتراضية تكون "تحديد كمُرسلة" حتى يتم تنفيذ إرسال فعلي.

4.3 توحيد تنسيق التاريخ

الحالة: PARTIAL

ما يظهر في UI:

February 5th, 2026 بدلاً من 05-02-2026

السبب الجذري:

ملف: InvoiceDetailsSheet.tsx السطور 384, 397

يستخدم format(date, "PPP")

خطة الإصلاح:

format(new Date(invoice.issue_date), "dd-MM-yyyy")


✅ توحيد شامل:

استخدم formatter موحد في @/lib/formatters لكل التواريخ في finance/lab (حتى لا تتكرر صيغ مختلفة بين الصفحات).

معيار القبول: جميع التواريخ بتنسيق "05-02-2026"

Image 5 - تكرار العملاء في Sidebar
5.1 العملاء تظهر مرتين

الحالة: DONE (بتوضيح - IA مقصود)

التحليل:

العملاء الرئيسي (/dashboard/clients): سجل العملاء + CRUD + Statement

العملاء تحت المالية (/dashboard/finance?tab=clients): عرض الأرصدة والحركات

التوصية (اختياري):

تغيير اسم "العملاء" تحت المالية إلى "أرصدة العملاء" أو "الأرصدة المالية"

✅ تحسين IA (لمنع اللبس للمستخدم):

اجعل اسم القائمة تحت المالية “دفتر العملاء” أو “دفتر الذمم” (Client Ledger)

وابقِ “العملاء” الرئيسية كسجل/بروفايل/تاريخ العميل.

Image 6 - صفحة العملاء
6.1 UI/UX polishing

الحالة: PARTIAL

المشاكل:

الفلاتر العلوية متزاحمة على الهواتف

Cards لا تستخدم المساحة بكفاءة

خطة الإصلاح:

إضافة flex-wrap للفلاتر

تحسين responsive grid

6.2 إضافة "كشف الحساب" للـ Client Cards

الحالة: NOT IMPLEMENTED (في Cards)

ما يظهر في UI:

ClientCard.tsx يحتوي: Edit + Delete فقط

ClientStatementTab.tsx موجود لكن غير مربوط

السبب الجذري:

ملف: ClientCard.tsx السطور 63-74

لا يوجد DropdownMenuItem للـ Statement

خطة الإصلاح:

// ClientCard.tsx - add after Edit
<DropdownMenuItem onClick={() => onViewStatement?.(client)}>
  <FileText className="h-4 w-4 me-2" />
  {t("clients.statement.view")}
</DropdownMenuItem>


إضافة prop onViewStatement + Sheet في DashboardClients.tsx

✅ UX إضافي:

نفس “كشف الحساب” يجب أن يكون متاح أيضاً من داخل صفحة/بروفايل العميل (ليس فقط من Card).

6.3 إضافة ViewSwitcher

الحالة: NOT IMPLEMENTED

خطة الإصلاح:

إضافة ViewSwitcher component (Grid/Table/List)

إنشاء ClientsTable.tsx للعرض الجدولي

6.4 حد الائتمان لا يعمل

الحالة: NOT IMPLEMENTED

ما يظهر في UI:

يُعرض credit_limit في Card لكن لا يُستخدم للتحقق

السبب الجذري:

ملف: useLabInvoiceDraft.ts - لا يوجد credit limit check

ملف: CreateSampleDialog.tsx - لا يوجد warning

خطة الإصلاح:

في useLabInvoiceDraft.ts:

// Check credit limit before generating invoice
const client = clients.find(c => c.id === input.clientId);
if (client?.credit_limit && client.outstanding_balance > client.credit_limit) {
  // Show warning or block
}


إضافة CreditLimitWarning.tsx component

✅ تصحيح (مصدر الرصيد المستحق):

لا تفترض وجود client.outstanding_balance إلا إذا كان موجود فعلاً في الـ DB/Query.

إذا غير موجود: احسب المستحق من:

ledger/customer_balances (حسب تصميمكم)

قرار السياسة:

Warning أو Hard-block + override permission.

6.5 اسم العميل حسب لغة الواجهة

الحالة: PARTIAL

ما يظهر في UI:

دائماً client.name (إنجليزي) حتى في الواجهة العربية

السبب الجذري:

ملف: ClientCard.tsx السطر 47: {client.name} hardcoded

خطة الإصلاح:

const displayName = lang === 'ar' && client.name_ar ? client.name_ar : client.name;
<h3 className="...">{displayName}</h3>

Image 7 - ملف الخيل (Lab Horse Profile)
7.1 مفاتيح الترجمة تظهر خام

الحالة: BROKEN (P0)

ما يظهر في UI:

laboratory.samples.sampleId

finance.payment.paid

finance.payment.outstanding

finance.payment.record

السبب الجذري:

ملف: LabHorseProfile.tsx

السطر 162: t("laboratory.samples.sampleId") - موجود في ar.ts السطر 761 ✓

السطور 304, 308, 346, 347, 395: t("finance.payment.paid/outstanding/record") - غير موجود!

المفاتيح المفقودة:

finance.payment.paid - يجب أن يكون finance.payments.paidSoFar

finance.payment.outstanding - يجب أن يكون finance.payments.outstanding

finance.payment.record - يجب أن يكون finance.payments.recordPayment

ملاحظة: المفاتيح موجودة تحت finance.payments (بـ s) وليس finance.payment

خطة الإصلاح:

// LabHorseProfile.tsx - fix key paths
{t("finance.payments.paidSoFar")}
{t("finance.payments.outstanding")}
{t("finance.payments.recordPayment")}


✅ توسيع نطاق الإصلاح (حتى لا تتكرر):

عمل search على المشروع بالكامل لأي finance.payment. واستبداله أو إضافة keys حسب المعايير.

معيار القبول: لا توجد مفاتيح خام في الواجهة

7.2 أزرار "تعديل" و "تصدير التقرير" لا تعمل

الحالة: PARTIAL

"تعديل":

ملف: LabHorseProfile.tsx السطور 431-440: الزر موجود

ملف: DashboardLaboratory.tsx السطور: يستخدم setEditHorseId(horse.id)

المشكلة: لا يوجد LabHorseFormDialog component

"تصدير التقرير":

الزر موجود (السطر 443)

لا يوجد handleExportReport function

خطة الإصلاح:

إنشاء LabHorseFormDialog.tsx للتعديل

ربطه في DashboardLaboratory.tsx عند editHorseId !== null

تنفيذ handleExportReport باستخدام jsPDF

7.3 اسم المالك قابل للنقر (Quick View)

الحالة: NOT IMPLEMENTED

خطة الإصلاح:

إنشاء OwnerQuickViewPopover.tsx

جعل owner_name في LabHorseProfile clickable

عرض: الاسم + الهاتف + زر اتصال

نموذج المالك vs العميل:

المالك (Owner):
- مخزن في lab_horses.owner_name, owner_phone
- معلوماتي فقط (لا ربط مالي)
- يظهر في بطاقة الخيل

العميل (Client):
- مخزن في lab_samples.client_id → clients
- الجهة التي تستلم الفاتورة وتدفع
- قد يكون المالك أو جهة أخرى

Image 8 - تبويبات ملف الخيل
8.1 تصميم التبويبات

الحالة: PARTIAL

المشكلة: التبويبات صغيرة

خطة الإصلاح:

<TabsList className="w-full justify-start h-12">
  <TabsTrigger className="text-sm px-4 py-2.5">

8.2 مفاتيح الترجمة

الحالة: BROKEN (نفس 7.1)

Image 9 - نموذج تسجيل الدفعة
9.1 عرض بنود الفاتورة

الحالة: NOT IMPLEMENTED

المطلوب: عرض ملخص البنود مع الإجمالي

خطة الإصلاح:

في RecordPaymentDialog.tsx إضافة Collapsible للبنود

Fetch invoice_items في useInvoicePayments.ts

✅ UX (إظهار أهم البيانات في مرمى العين):

اجعل الملخص يظهر (اسم/عدد البنود) + إمكانية توسيع لعرض التفاصيل، حتى لا تزيد ضوضاء الواجهة.

9.2 spacing بين الأزرار

الحالة: PARTIAL

السبب الجذري:

ملف: RecordPaymentDialog.tsx السطر 359

<DialogFooter> بدون explicit gap

خطة الإصلاح:

<DialogFooter className="gap-3">


✅ تحسين الموبايل:

عند الموبايل اجعل الأزرار عمودية لتجنب الالتصاق.

Image 10 - منطق المعالج (Wizard Logic)
10.1 منطق اختيار الخيول حسب نوع العميل

الحالة: DONE

المنطق الحالي (صحيح):

عميل مسجل: يعرض خيول العميل + "تسجيل خيل جديد"

عميل جديد: قائمة فارغة + "تسجيل خيل جديد"

بدون عميل: قائمة فارغة + "تسجيل خيل جديد"

الدليل:

ملف: CreateSampleDialog.tsx السطور 262-334

ملف: LabHorsePicker.tsx - يبحث في lab_horses

ملاحظة: الربط بين العميل وخيوله يتم عبر owner_name/owner_phone مطابقة - تصميم مقصود للمرونة

مشاكل إضافية مكتشفة
A.1 formatCurrency محلي في ClientCard

الحالة: BROKEN

المشكلة:

ملف: ClientCard.tsx السطور 28-34

يستخدم Intl.NumberFormat محلياً بدلاً من formatCurrency من formatters

ينتج أرقام عربية في واجهة عربية

خطة الإصلاح:

import { formatCurrency } from "@/lib/formatters";
// Remove local formatCurrency function
// Use imported formatCurrency(amount, "SAR")


✅ قرار تنسيق الأرقام :

تأكد أن formatCurrency يطبق سياسة عرض 0-9 (إنجليزي) في الواجهة العربية إذا هذا هو القرار النهائي.

ترتيب التنفيذ (Implementation Plan)
المرحلة 1 - P0 (اليوم)
#	المشكلة	الملف	التغيير
7.1/8.2	ترجمات finance.payment.*	LabHorseProfile.tsx	تصحيح المفاتيح إلى finance.payments.*
7.1/8.2	ترجمات finance.payment.* (توسيع نطاق)	Project-wide search	استبدال أي finance.payment.* أو إضافة المفاتيح الناقصة حسب المعايير
A.1	formatCurrency محلي	ClientCard.tsx	استخدام formatter المركزي + ضمان سياسة 0-9 إذا مطلوبة
4.1	UUIDs في بنود الفاتورة	useLabInvoiceDraft.ts	تنظيف الوصف من IDs التقنية + اعتماد معيار وصف واضح
المرحلة 2 - P0/P1 (يوم 2)
#	المشكلة	الملف	التغيير
3.2	"مسودة" → "غير مستلمة"	ar.ts, en.ts	تغيير sampleStatus.draft
2.1	responsive dialog	GenerateInvoiceDialog.tsx	إضافة max-h + overflow + gap + تحسين الموبايل
9.2	button spacing	RecordPaymentDialog.tsx	إضافة gap-3 + تحسين الموبايل
المرحلة 3 - P1 (يوم 3)
#	المشكلة	الملف	التغيير
3.3	"إنشاء" → "عرض" فاتورة	SamplesTable.tsx, useLabSamples.ts	إضافة hasInvoice check (robust)
4.3	تنسيق التاريخ	InvoiceDetailsSheet.tsx	dd-MM-yyyy + توحيد formatter
6.5	اسم العميل حسب اللغة	ClientCard.tsx	استخدام name_ar
المرحلة 4 - P1 (يوم 4)
#	المشكلة	الملف	التغيير
7.2	زر تعديل الخيل	إنشاء LabHorseFormDialog.tsx	dialog للتعديل
6.2	كشف الحساب في Cards	ClientCard.tsx, DashboardClients.tsx	ربط Statement + إتاحته من صفحة العميل أيضاً
1.1	خطوة billing	CreateSampleDialog.tsx	إضافة horse names + price edit + دفع بعد إنشاء الفاتورة
المرحلة 5 - P2 (أسبوع 2)
#	المشكلة	الملف	التغيير
3.4	زر إلغاء العينة	SamplesTable.tsx	إضافة DropdownMenuItem + قواعد واضحة عند وجود فاتورة
3.5	تبويبات processing/cancelled	SamplesFilterTabs.tsx	إضافة tabs جديدة + إبقاء فلتر الحالة كـ advanced
5.1	تكرار العملاء في الـ Sidebar	Sidebar	إعادة تسمية العملاء تحت المالية إلى "دفتر العملاء/الأرصدة" (اختياري)
6.3	ViewSwitcher	DashboardClients.tsx	Grid/Table/List
6.4	حد الائتمان	useLabInvoiceDraft.ts	إضافة validation + تحديد مصدر المستحق + policy override
7.3	Owner Quick View	إنشاء OwnerQuickViewPopover.tsx	popover للمالك
9.1	عرض بنود الفاتورة	RecordPaymentDialog.tsx + useInvoicePayments.ts	Collapsible + fetch invoice_items
قائمة التحقق اليدوي (Verification Checklist)
P0 - Critical
#	السيناريو	النتيجة المتوقعة
7.1	فتح LabHorseProfile	لا توجد مفاتيح ترجمة خام + تم حذف/تصحيح finance.payment.*
A.1	فتح ClientCard بواجهة عربية	formatter موحد + سياسة 0-9 (إنجليزي) إذا مطلوبة
4.1	فتح تفاصيل فاتورة LAB	البنود مقروءة بدون UUIDs + معيار وصف واضح
P1 - High
#	السيناريو	النتيجة المتوقعة
3.2	عرض عينة draft	الـ Badge يقول "غير مستلمة"
3.3	عرض عينة لها فاتورة	القائمة تعرض "عرض الفاتورة"
4.3	التاريخ في الفاتورة	يظهر بتنسيق "05-02-2026"
6.5	فتح ClientCard بعربي	يظهر الاسم العربي أولاً
1.1	معالج إنشاء عينة - خطوة billing	البنود تعرض "قالب - اسم الخيل" + تعديل سعر + دفع بعد إنشاء الفاتورة
P2 - Medium
#	السيناريو	النتيجة المتوقعة
6.2	الضغط على "كشف الحساب" في Client Card	يفتح sheet مع حركات العميل
6.4	محاولة فوترة عميل تجاوز حده	تحذير أو حجب حسب policy
7.2	الضغط على "تعديل" في Horse Profile	يفتح نموذج تعديل