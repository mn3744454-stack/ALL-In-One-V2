

# تقرير التدقيق المحدّث — الخطة المتفق عليها (1.1 → 10.1)

---

## A) Plan Recall (Memory Lock) - البنود الأصلية

البنود تبقى كما هي بالضبط (1.1 → 10.1) بدون تغيير أو دمج.

---

## B) Current-State Verification (جدول الحالة المحدّث)

| # | البند | الحالة | الثقة | الدليل |
|---|-------|--------|------|--------|
| **1.1** | Wizard billing step | **NOT DONE** | High | `CreateSampleDialog.tsx` L224-257: `checkoutLineItems` لا تتضمن horse_name، لا توجد inputs للسعر، لا زر دفع |
| **2.1** | Dialog overflow/sticky | **PARTIAL** | High | `GenerateInvoiceDialog.tsx` L174: `max-h-[90vh] overflow-y-auto` موجود لكن header/footer ليست sticky، scrollbar خارج الإطار |
| **2.2** | Sample not linked | **PARTIAL** | High | L129-132: `sourceName` لا تشمل `sample?.horse_name` للـ walk-in |
| **2.3** | Client selector lock | **NOT DONE** | High | L283: `disabled={clientsLoading || hasExistingInvoices}` — لا يفحص `sample?.client_id` |
| **3.1** | Filters | **NOT DONE** | High | `SamplesList.tsx` L128: `horse_id: horseId` — Lab tenants تستخدم `lab_horse_id`، + client filter محلي L172 |
| **3.2** | "مسودة" → "غير مستلمة" | **DONE** | High | تم تحديث ar.ts/en.ts |
| **3.3** | View Invoice action | **WRONG BEHAVIOR** | High | L343-346: `window.location.href` → يفتح الصفحة الرئيسية أو route لا يعمل |
| **3.4** | Cancel Sample action | **DONE** | High | موجود في `SamplesTable.tsx` |
| **3.5** | Processing/Cancelled tabs | **DONE** | High | موجود في `SamplesFilterTabs.tsx` |
| **4.1** | Invoice UUIDs | **PARTIAL** | Medium | `useLabInvoiceDraft.ts` نظف الوصف لكن الفواتير القديمة قد تحتوي UUIDs |
| **4.2** | "Send to client" | **NOT DONE** | High | `InvoiceDetailsSheet.tsx` L314: يستخدم `finance.invoices.send` — يجب تغييره لـ "تحديد كمُرسلة" |
| **4.3** | Date format dd-MM-yyyy | **DONE** | High | `InvoiceDetailsSheet.tsx` محدث |
| **5.1** | Finance clients naming | **NOT DONE** | High | `navConfig.ts` L238-240: `labelKey: "clients.title"` — يجب أن يكون "أرصدة العملاء" |
| **6.1** | Clients page polish | **NOT DONE** | Medium | لا توجد تحسينات responsive أو filter wrapping |
| **6.2** | Client Statement link | **DONE** (needs polish) | High | يعمل لكن يحتاج: عرض وصف أوضح + تحسين layout + مفاتيح `common.print/export` ناقصة |
| **6.3** | ViewSwitcher | **NOT DONE** | High | لا يوجد ViewSwitcher في DashboardClients أو Finance |
| **6.4** | Credit limit | **NOT DONE** | High | لا يوجد check في `useLabInvoiceDraft.ts` |
| **6.5** | Localized client names | **PARTIAL** | High | `GenerateInvoiceDialog.tsx` محدث L292-296، لكن CreateSampleDialog قد لا يزال يستخدم `client.name` |
| **7.1** | i18n raw keys | **PARTIAL** | High | `common.print` و `common.export` غير موجودين في ar.ts/en.ts |
| **7.2** | Edit/Export buttons | **PARTIAL** | High | Edit يعمل، Export Report يعمل (PDF) — لكن المستخدم يقول disabled؟ يحتاج فحص |
| **7.3** | Owner Quick View | **PARTIAL** | Medium | Popover موجود لكن قد يحتاج تحسين المحتوى |
| **8.1** | RTL/Tabs layout | **PARTIAL** | High | Back button محدث L459-472، لكن tabs صغيرة + wasted space |
| **8.2** | i18n keys (same as 7.1) | **PARTIAL** | - | نفس 7.1 |
| **9.1** | Payment invoice items | **NOT DONE** | High | `RecordPaymentDialog.tsx`: لا يوجد عرض بنود الفاتورة |
| **9.2** | Button spacing | **DONE** | High | تم إضافة gap-3 |
| **10.1** | Wizard horse logic | **DONE** | High | المنطق صحيح في `CreateSampleDialog.tsx` L262-334 |

---

## C) Root Cause + Fix Proposals

### P0 - Critical (يوم 1)

#### [7.1] i18n: مفاتيح common.print و common.export ناقصة
**Root Cause:** `ClientStatementTab.tsx` L101, L105 تستخدم `t("common.print")` و `t("common.export")` لكنهم غير موجودين في ar.ts/en.ts

**Fix:**
```typescript
// ar.ts - common section (after line 77)
print: "طباعة",
export: "تصدير",

// en.ts - common section
print: "Print",
export: "Export",
```

**Files:** `src/i18n/locales/ar.ts`, `src/i18n/locales/en.ts`

---

#### [3.1] الفلاتر لا تعمل عبر التبويبات
**Root Cause:** 
1. `SamplesList.tsx` L128: `horse_id: horseId` — Lab tenants تحتاج `lab_horse_id`
2. Client filter محلي فقط (L172) — لا يُرسل للـ hook
3. Date filters قد لا تمر للـ query

**Fix:**
```typescript
// SamplesList.tsx L124-132
const combinedFilters: LabSampleFilters = useMemo(() => ({
  search: search || undefined,
  dateFrom,
  dateTo,
  client_id: clientId, // Add server-side client filter
  // Use correct horse filter based on tenant type
  ...(isPrimaryLabTenant 
    ? { lab_horse_id: horseId } 
    : { horse_id: horseId }
  ),
  status: selectedStatuses.length === 1 ? selectedStatuses[0] : tabFilters.status,
  ...tabFilters,
}), [search, dateFrom, dateTo, clientId, horseId, selectedStatuses, tabFilters, isPrimaryLabTenant]);
```

**Also update:** `useLabSamples.ts` لإضافة `client_id` filter:
```typescript
if (filters.client_id) {
  query = query.eq("client_id", filters.client_id);
}
```

**Files:** `src/components/laboratory/SamplesList.tsx`, `src/hooks/laboratory/useLabSamples.ts`

---

#### [3.3] View Invoice يفتح الصفحة الرئيسية
**Root Cause:** `SamplesList.tsx` L343-346 يستخدم `window.location.href` مما يسبب full page reload

**Fix:** فتح `InvoiceDetailsSheet` مباشرة:
```typescript
// SamplesList.tsx - add state
const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

// Change handler L343-346
onViewInvoice={(sample, invoiceId) => {
  if (invoiceId) {
    setViewInvoiceId(invoiceId);
  }
}}

// Add at bottom of component (after GenerateInvoiceDialog)
<InvoiceDetailsSheet
  open={!!viewInvoiceId}
  onOpenChange={(open) => !open && setViewInvoiceId(null)}
  invoiceId={viewInvoiceId}
/>
```

**Files:** `src/components/laboratory/SamplesList.tsx`

---

#### [2.1] Dialog polishing - sticky header/footer
**Root Cause:** `GenerateInvoiceDialog.tsx` L174 يستخدم `overflow-y-auto` على كل الـ DialogContent، لكن header/footer ليست sticky

**Fix:** استخدام flex layout مع sticky:
```typescript
// L174 - replace DialogContent structure
<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0" dir={dir}>
  {/* Sticky Header */}
  <DialogHeader className="sticky top-0 bg-background z-10 p-6 pb-4 border-b">
    <DialogTitle className="flex items-center gap-2">
      <Receipt className="h-5 w-5" />
      {t("laboratory.billing.generateInvoice")}
    </DialogTitle>
    <DialogDescription>
      {t("laboratory.billing.generateInvoiceDesc")}
    </DialogDescription>
  </DialogHeader>

  {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto p-6 space-y-4">
    {/* ... existing content ... */}
  </div>

  {/* Sticky Footer */}
  <DialogFooter className="sticky bottom-0 bg-background z-10 p-6 pt-4 border-t gap-3 sm:gap-3">
    {/* ... buttons ... */}
  </DialogFooter>
</DialogContent>
```

**Files:** `src/components/laboratory/GenerateInvoiceDialog.tsx`

---

#### [7.2] Export Report disabled
**Root Cause:** يجب التحقق من الكود — `LabHorseProfile.tsx` L98-145 يحتوي `handleExportReport` — قد يكون permission issue

**Fix:** فحص permission check وإزالة أي disabled غير مبرر:
```typescript
// L502-512 - ensure button is not disabled incorrectly
{canExport && (
  <Button
    variant="outline"
    size="sm"
    className="gap-2"
    onClick={handleExportReport}
  >
    <Download className="h-4 w-4" />
    {t("laboratory.labHorses.exportReport")}
  </Button>
)}
```

**Files:** `src/components/laboratory/LabHorseProfile.tsx`

---

### P1 - High (يوم 2-3)

#### [2.2] Sample not linked - show horse name
**Root Cause:** `GenerateInvoiceDialog.tsx` L129-132 لا تشمل fallback لـ `sample?.horse_name`

**Fix:**
```typescript
// L129-132
const sourceName =
  sourceType === "lab_sample"
    ? sample?.horse?.name || sample?.lab_horse?.name || sample?.horse_name || t("laboratory.samples.unknownHorse")
    : request?.horse?.name || t("laboratory.samples.unknownHorse");
```

---

#### [2.3] Client selector lock
**Root Cause:** L283 لا يفحص `sample?.client_id`

**Fix:**
```typescript
// After L135
const clientFromSample = sample?.client_id;

// L280-284
<Select
  value={selectedClientId}
  onValueChange={setSelectedClientId}
  disabled={clientsLoading || hasExistingInvoices || !!clientFromSample}
>
  {/* ... */}
</Select>
{clientFromSample && (
  <Badge variant="secondary" className="ms-2 mt-1">
    {t("laboratory.billing.fromSample")}
  </Badge>
)}
```

**i18n key to add:**
```typescript
// ar.ts laboratory.billing section
fromSample: "من العينة",

// en.ts
fromSample: "From Sample",
```

---

#### [4.2] "Send to client" → "تحديد كمُرسلة"
**Root Cause:** `InvoiceDetailsSheet.tsx` L314 و `InvoiceCard.tsx` L132 تستخدم `finance.invoices.send`

**Fix:**
```typescript
// Change button text
{t("finance.invoices.markAsSent")}

// Add i18n keys
// ar.ts finance.invoices section
markAsSent: "تحديد كمُرسلة",
markAsSentConfirm: "سيتم تحديث الحالة فقط. لن يتم إرسال رسالة للعميل.",

// en.ts
markAsSent: "Mark as Sent",
markAsSentConfirm: "This only updates the status. No message will be sent to the client.",
```

**Files:** `src/components/finance/InvoiceDetailsSheet.tsx`, `src/components/finance/InvoiceCard.tsx`, ar.ts, en.ts

---

#### [6.5] Localized client names everywhere
**Check:** `CreateSampleDialog.tsx` client dropdown, `AdvancedFilters.tsx` client filter

**Fix:** Ensure all use:
```typescript
{dir === "rtl" && client.name_ar ? client.name_ar : client.name}
```

---

#### [6.4] Credit limit enforcement
**Root Cause:** `useLabInvoiceDraft.ts` `generateInvoice` function لا تفحص credit limit

**Fix:**
```typescript
// In generateInvoice function, after line ~190
const client = clients.find(c => c.id === input.clientId);
if (client?.credit_limit) {
  const currentBalance = client.outstanding_balance || 0;
  const newTotal = input.lineItems.reduce((sum, i) => sum + i.total, 0);
  
  if ((currentBalance + newTotal) > client.credit_limit) {
    toast.warning(t("finance.creditLimit.exceeded"));
    // Option: return null to block, or continue with warning
    return null;
  }
}
```

**i18n:**
```typescript
// ar.ts finance.creditLimit
exceeded: "تجاوز حد الائتمان. لا يمكن إنشاء الفاتورة.",

// en.ts
exceeded: "Credit limit exceeded. Cannot create invoice.",
```

---

#### [6.2] Statement description enrichment + i18n
**Fix for raw keys:** Already covered in 7.1

**Fix for descriptions:** `ClientStatementTab.tsx` L197 يعرض `entry.description` — يجب إثراء الوصف من backend أو عرض بيانات إضافية

---

### P2 - Medium (أسبوع 2)

#### [5.1] Finance clients naming
**Root Cause:** `navConfig.ts` L238-240

**Fix:**
```typescript
// L238-241
{
  key: "clients",
  icon: UserCircle,
  labelKey: "finance.customerBalances.title", // Changed from "clients.title"
  route: "/dashboard/finance/clients",
}

// Add i18n
// ar.ts finance section
customerBalances: {
  title: "أرصدة العملاء",
},

// en.ts
customerBalances: {
  title: "Customer Balances",
},
```

---

#### [6.3] ViewSwitcher for Clients
**Fix:** إضافة ViewSwitcher component لـ `DashboardClients.tsx` و Finance clients view

---

#### [9.1] Payment dialog invoice items
**Fix:** في `RecordPaymentDialog.tsx` إضافة Collapsible section لعرض بنود الفاتورة

---

#### [1.1] Wizard billing enhancements
**Fix:** تعديل `checkoutLineItems` في `CreateSampleDialog.tsx` لتشمل horse names + price inputs

---

#### [8.1] Tabs layout + RTL
**Fix:** تكبير التبويبات في `LabHorseProfile.tsx` وتحسين استخدام المساحة

---

## D) Cross-Cutting Checklist (المحدّث)

### i18n Raw Keys Still Appearing

| Key | Location | Status | Fix |
|-----|----------|--------|-----|
| `common.print` | ClientStatementTab.tsx:101 | **MISSING** | Add to ar.ts/en.ts common section |
| `common.export` | ClientStatementTab.tsx:105 | **MISSING** | Add to ar.ts/en.ts common section |

**Other keys verified:**
- ✅ `finance.payments.*` — Corrected
- ✅ `laboratory.table.sampleId` — Fixed
- ✅ `clients.form.name` — Fixed

### Filters Wiring (3.1) - End-to-End

```
UI: AdvancedFilters.tsx
  → onHorseChange(horseId), onClientChange(clientId), onDateFromChange, onDateToChange
  
State: SamplesList.tsx
  → horseId, clientId, dateFrom, dateTo state
  
Query Build: combinedFilters useMemo
  → MUST use lab_horse_id for isPrimaryLabTenant
  → MUST pass client_id to hook (currently client-side only!)
  → MUST pass dateFrom/dateTo
  
Hook: useLabSamples.ts
  → MUST handle client_id filter (add if missing)
  → Already handles lab_horse_id, horse_id, dateFrom, dateTo

Supabase: Query builds correctly
```

**Current Gap:** `client_id` is filtered client-side only (L172). Must add to hook filters.

### View Invoice (3.3)

**Current:** `window.location.href` → Full page reload → Route not handling params
**Fix:** Open `InvoiceDetailsSheet` directly within `SamplesList.tsx`

### Dialog Polishing (2.1)

**Required Structure:**
```
<DialogContent className="max-h-[90vh] flex flex-col p-0">
  <DialogHeader className="sticky top-0 bg-background border-b p-6">
  <div className="flex-1 overflow-y-auto p-6">  <!-- Scrollable -->
  <DialogFooter className="sticky bottom-0 bg-background border-t p-6 gap-3">
</DialogContent>
```

### RTL/UX (8.1)

**Back button:** ✅ Fixed in L459-472
**Tabs:** Need larger size `h-12` + `px-4 py-2.5`
**Wasted space:** Improve grid layout

---

## E) Fix Queue (Prioritized)

### P0 - Critical (Day 1)

| # | Description | Complexity | Files | Dependencies |
|---|-------------|------------|-------|--------------|
| 7.1 | Add `common.print/export` i18n keys | Low | ar.ts, en.ts | None |
| 3.1 | Fix filter wiring (lab_horse_id + client_id) | Medium | SamplesList.tsx, useLabSamples.ts | None |
| 3.3 | Fix View Invoice to open sheet | Medium | SamplesList.tsx | InvoiceDetailsSheet import |
| 2.1 | Dialog sticky header/footer | Medium | GenerateInvoiceDialog.tsx | None |
| 7.2 | Verify Export Report works | Low | LabHorseProfile.tsx | None |

### P1 - High (Day 2-3)

| # | Description | Complexity | Files |
|---|-------------|------------|-------|
| 2.2 | Show horse_name for walk-ins | Low | GenerateInvoiceDialog.tsx |
| 2.3 | Lock client selector | Low | GenerateInvoiceDialog.tsx, ar.ts, en.ts |
| 4.2 | Rename "Send" to "Mark as Sent" | Low | InvoiceDetailsSheet.tsx, InvoiceCard.tsx, ar.ts, en.ts |
| 6.4 | Credit limit enforcement | Medium | useLabInvoiceDraft.ts, ar.ts, en.ts |
| 6.5 | Localized names everywhere | Low | CreateSampleDialog.tsx, AdvancedFilters.tsx |
| 6.2 | Statement layout improvements | Medium | ClientStatementTab.tsx |

### P2 - Medium (Week 2)

| # | Description | Complexity | Files |
|---|-------------|------------|-------|
| 5.1 | Finance sidebar rename | Low | navConfig.ts, ar.ts, en.ts |
| 6.1 | Clients page polish | Medium | DashboardClients.tsx |
| 6.3 | ViewSwitcher for Clients | High | DashboardClients.tsx, new ClientsTable.tsx |
| 9.1 | Payment dialog invoice items | Medium | RecordPaymentDialog.tsx |
| 1.1 | Wizard billing enhancements | High | CreateSampleDialog.tsx |
| 8.1 | Tabs layout improvements | Medium | LabHorseProfile.tsx |

---

## F) Execution Prompt Draft

```
=== EXECUTION PROMPT — Fix Remaining Gaps (Priority Order) ===

PHASE 1 - P0 Critical (Must Complete First)

---

[7.1] Add missing i18n keys

Files: src/i18n/locales/ar.ts, src/i18n/locales/en.ts

ar.ts - common section (around line 77):
  print: "طباعة",
  export: "تصدير",

en.ts - common section:
  print: "Print",
  export: "Export",

Verification: Open Client Statement → buttons show Arabic/English labels

---

[3.1] Fix filter wiring for lab tenants

File 1: src/hooks/laboratory/useLabSamples.ts
Add client_id filter (after line 191):
  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }

Add client_id to LabSampleFilters interface:
  client_id?: string;

File 2: src/components/laboratory/SamplesList.tsx
Line 124-132 - Update combinedFilters:
  const combinedFilters: LabSampleFilters = useMemo(() => ({
    search: search || undefined,
    dateFrom,
    dateTo,
    client_id: clientId, // ADD THIS
    ...(isPrimaryLabTenant 
      ? { lab_horse_id: horseId } 
      : { horse_id: horseId }
    ),
    status: selectedStatuses.length === 1 ? selectedStatuses[0] : tabFilters.status,
    ...tabFilters,
  }), [search, dateFrom, dateTo, clientId, horseId, selectedStatuses, tabFilters, isPrimaryLabTenant]);

Remove client-side filter at L172-174 (it's now server-side)

Verification: 
1. Select a client filter → samples filter immediately
2. Select a horse filter → samples filter immediately
3. Select date range → samples filter immediately
4. Switch tabs → filters persist

---

[3.3] Fix View Invoice action

File: src/components/laboratory/SamplesList.tsx

Add state (around line 75):
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

Add import at top:
  import { InvoiceDetailsSheet } from "@/components/finance";

Change L343-346:
  onViewInvoice={(sample, invoiceId) => {
    if (invoiceId) {
      setViewInvoiceId(invoiceId);
    }
  }}

Add after GenerateInvoiceDialog (around line 417):
  <InvoiceDetailsSheet
    open={!!viewInvoiceId}
    onOpenChange={(open) => !open && setViewInvoiceId(null)}
    invoiceId={viewInvoiceId}
  />

Verification: Click "View Invoice" on a billed sample → Invoice sheet opens with correct data

---

[2.1] Dialog sticky header/footer

File: src/components/laboratory/GenerateInvoiceDialog.tsx

Replace L174 DialogContent structure with flex layout:
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0" dir={dir}>

Move DialogHeader out with sticky:
  <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">

Wrap content in scrollable div:
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

Move DialogFooter with sticky:
  <DialogFooter className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t gap-3 sm:gap-3">

Verification: 
1. Open dialog with many items → only content scrolls
2. Header and footer stay visible
3. Scrollbar is inside dialog boundary

---

[7.2] Verify Export Report

File: src/components/laboratory/LabHorseProfile.tsx

Check L502-512 - ensure button is enabled when canExport is true:
  {canExport && (
    <Button ... onClick={handleExportReport}>
      {t("laboratory.labHorses.exportReport")}
    </Button>
  )}

Check handleExportReport function L98-145 - ensure it's not throwing errors

Verification: Click Export Report → PDF downloads with horse info

---

PHASE 2 - P1 High

---

[2.2] Show horse name for walk-ins

File: src/components/laboratory/GenerateInvoiceDialog.tsx

L129-132:
  const sourceName =
    sourceType === "lab_sample"
      ? sample?.horse?.name || sample?.lab_horse?.name || sample?.horse_name || t("laboratory.samples.unknownHorse")
      : request?.horse?.name || t("laboratory.samples.unknownHorse");

---

[2.3] Lock client selector

File: src/components/laboratory/GenerateInvoiceDialog.tsx

After L135:
  const clientFromSample = sample?.client_id;

L283 disabled prop:
  disabled={clientsLoading || hasExistingInvoices || !!clientFromSample}

After Select (L299):
  {clientFromSample && (
    <Badge variant="secondary" className="ms-2 mt-2">{t("laboratory.billing.fromSample")}</Badge>
  )}

i18n ar.ts laboratory.billing:
  fromSample: "من العينة",

i18n en.ts:
  fromSample: "From Sample",

---

[4.2] Rename "Send" to "Mark as Sent"

File 1: src/components/finance/InvoiceDetailsSheet.tsx L314:
  {t("finance.invoices.markAsSent")}

File 2: src/components/finance/InvoiceCard.tsx L132:
  {t("finance.invoices.markAsSent")}

i18n ar.ts finance.invoices:
  markAsSent: "تحديد كمُرسلة",

i18n en.ts:
  markAsSent: "Mark as Sent",

---

[6.4] Credit limit enforcement

File: src/hooks/laboratory/useLabInvoiceDraft.ts

In generateInvoice function (after getting client):
  if (client?.credit_limit) {
    const currentBalance = client.outstanding_balance || 0;
    const newTotal = lineItems.reduce((sum, i) => sum + i.total, 0);
    if ((currentBalance + newTotal) > client.credit_limit) {
      toast.warning(t("finance.creditLimit.exceeded"));
      return null;
    }
  }

i18n ar.ts finance:
  creditLimit: {
    exceeded: "تجاوز حد الائتمان. لا يمكن إنشاء الفاتورة.",
  },

i18n en.ts:
  creditLimit: {
    exceeded: "Credit limit exceeded. Cannot create invoice.",
  },

---

[6.5] Localized names

Check all client dropdowns use:
  {dir === "rtl" && client.name_ar ? client.name_ar : client.name}

Files to check:
- CreateSampleDialog.tsx (client selector)
- AdvancedFilters.tsx (client filter)

---

VERIFICATION CHECKLIST (After Each Phase)

P0:
□ Client Statement shows "طباعة" and "تصدير" (not raw keys)
□ Filters work across all tabs (client, horse, date)
□ View Invoice opens InvoiceDetailsSheet (not homepage)
□ GenerateInvoiceDialog scrollbar is inside, header/footer sticky
□ Export Report button works (PDF downloads)

P1:
□ Walk-in samples show horse name in invoice dialog
□ Client selector locked when sample has client_id
□ Invoice "Send" button shows "تحديد كمُرسلة"
□ Credit limit blocks invoice when exceeded
□ Arabic UI shows Arabic client names everywhere
```

---

**STOP — Awaiting approval before implementation.**

