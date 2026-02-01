
# Implementation Plan: Complete Lab Horses Module + Create Sample Wizard + Finance Fixes

## EXECUTIVE SUMMARY

This plan completes the remaining requirements for the Lab Horses module, Create Sample wizard redesign for LAB tenants, Finance module fixes, and number formatting standardization. All changes follow the CRITICAL PERMANENT RULE for RBAC/RLS enforcement.

---

## PHASE 1: CREATE SAMPLE WIZARD REDESIGN (ALL DEVICES)

### 1.1 Wizard Step Order for LAB Tenants

**Current state:**
- `ALL_STEPS` (lines 69-77): `horses → basic → templates → details → checkout → billing → review`
- Client mode selection is inside 'details' step (lines 801-870)

**Required change for LAB tenants:**
- New step order: `client → horses → templates → details → checkout → billing → review`

**Files to modify:**
- `src/components/laboratory/CreateSampleDialog.tsx`

**Implementation:**
```typescript
// Add LAB_STEPS constant (after ALL_STEPS)
const LAB_STEPS: StepDef[] = [
  { key: 'client', title: 'Client', titleAr: 'العميل', icon: User },
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'billing', title: 'Credits', titleAr: 'الرصيد', icon: CreditCard, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];

// Modify effectiveSteps (line ~162)
const effectiveSteps = useMemo(() => {
  const baseSteps = isPrimaryLabTenant ? LAB_STEPS : ALL_STEPS;
  return baseSteps.filter(s => {
    if (s.key === 'horses' && isRetest) return false;
    if (s.key === 'billing' && (!creditsEnabled || isFreeRetest)) return false;
    if (s.key === 'checkout' && !showCheckoutStep) return false;
    return true;
  });
}, [isPrimaryLabTenant, creditsEnabled, isFreeRetest, showCheckoutStep, isRetest]);
```

**Add new 'client' step case in renderStepContent():**
```typescript
case 'client':
  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="space-y-3">
        <Label>{t("laboratory.createSample.selectClientMode")}</Label>
        <RadioGroup
          value={formData.clientMode}
          onValueChange={(value: ClientMode) => {
            setFormData(prev => ({
              ...prev,
              clientMode: value,
              client_id: value === 'existing' ? prev.client_id : '',
              walkInClient: value === 'walkin' 
                ? prev.walkInClient 
                : { client_name: '', client_phone: '', client_email: '', notes: '' },
            }));
          }}
          className="flex flex-col gap-2"
        >
          {/* Same radio options as current 'details' step */}
        </RadioGroup>
      </div>
      
      {formData.clientMode === 'existing' && <ClientSelector ... />}
      {formData.clientMode === 'walkin' && <WalkInClientForm ... />}
    </div>
  );
```

**Update 'details' step:** Remove client mode selection (keep only notes for LAB tenants)

### 1.2 Per-Horse Template Selection

**New state structure:**
```typescript
interface FormData {
  // existing...
  perHorseTemplates: Record<string, string[]>; // horseId/index → template_ids
  applyTemplateToAll: boolean;
}
```

**UI changes in 'templates' step:**
- When `selectedHorses.length > 1`, show "Apply to all" toggle
- If toggle OFF, show accordion per horse with template checkboxes
- Each horse can have different templates

**Update sample creation logic (line 357-406):**
```typescript
const templateIdsForHorse = formData.applyTemplateToAll 
  ? formData.template_ids 
  : (formData.perHorseTemplates[horseKey] || formData.template_ids);
```

### 1.3 Daily Number Collision Validation

**Add validation before submit:**
```typescript
const validateDailyNumbers = async (): Promise<boolean> => {
  const numbers = Object.values(formData.per_sample_daily_numbers).filter(Boolean);
  if (numbers.length === 0) return true;
  
  // Check for duplicates within form
  const seen = new Set<string>();
  for (const n of numbers) {
    if (seen.has(n)) {
      toast.error(t("laboratory.createSample.duplicateDailyNumbers"));
      return false;
    }
    seen.add(n);
  }
  
  // Check against existing samples for collection_date
  const collectionDate = formData.collection_date;
  const startOfDay = new Date(collectionDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(collectionDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const { data: existing } = await supabase
    .from('lab_samples')
    .select('daily_number')
    .eq('tenant_id', tenantId)
    .gte('collection_date', startOfDay.toISOString())
    .lte('collection_date', endOfDay.toISOString())
    .in('daily_number', numbers.map(n => parseInt(n)));
  
  if (existing && existing.length > 0) {
    toast.error(t("laboratory.createSample.dailyNumberConflict", { 
      numbers: existing.map(e => e.daily_number).join(', ') 
    }));
    return false;
  }
  
  return true;
};
```

### 1.4 Add Translations

**Files:** `src/i18n/locales/ar.ts`, `src/i18n/locales/en.ts`

```typescript
createSample: {
  // existing...
  selectClientMode: "اختر نوع العميل" / "Select Client Type",
  perHorseTemplates: "اختيار قوالب لكل خيل" / "Select Templates per Horse",
  applyToAll: "تطبيق على الكل" / "Apply to All",
  duplicateDailyNumbers: "أرقام يومية مكررة" / "Duplicate daily numbers",
  dailyNumberConflict: "الأرقام اليومية {numbers} مستخدمة بالفعل" / "Daily numbers {numbers} already in use",
  steps: {
    client: "العميل" / "Client",
    horses: "الخيول" / "Horses",
    templates: "القوالب" / "Templates",
    details: "التفاصيل" / "Details",
    checkout: "الدفع" / "Checkout",
    billing: "الرصيد" / "Credits",
    review: "مراجعة" / "Review",
  },
}
```

---

## PHASE 2: FINANCE MODULE FIXES

### 2.1 Invoice Actions (Edit, Delete, Mark as Paid)

**Current state:**
- `InvoiceCard.tsx` has dropdown with actions but `onEdit` opens view-only
- `onMarkPaid` just changes status to "paid" without recording payment details
- Delete works but needs confirm dialog

**Required changes:**

**File:** `src/components/finance/InvoiceDetailsSheet.tsx`

Add full action buttons:
```typescript
// Add state for action mode
const [isEditing, setIsEditing] = useState(false);

// Add actions in sheet header
{canManage && (
  <div className="flex gap-2">
    {(invoice.status === 'sent' || invoice.status === 'overdue') && (
      <Button size="sm" onClick={handleMarkPaid}>
        <CheckCircle className="h-4 w-4 me-2" />
        {t("finance.invoices.markPaid")}
      </Button>
    )}
    {invoice.status === 'draft' && (
      <Button variant="outline" size="sm" onClick={handleSend}>
        <Send className="h-4 w-4 me-2" />
        {t("finance.invoices.send")}
      </Button>
    )}
    <Button variant="outline" size="icon" onClick={handleDownloadPDF}>
      <Download className="h-4 w-4" />
    </Button>
    <Button variant="outline" size="icon" onClick={handlePrint}>
      <Printer className="h-4 w-4" />
    </Button>
  </div>
)}
```

**Add "Mark as Paid" handler with payment_received_at:**
```typescript
const handleMarkPaid = async () => {
  if (!invoice) return;
  
  const { error } = await supabase
    .from("invoices")
    .update({ 
      status: 'paid', 
      payment_received_at: new Date().toISOString(),
      // payment_method can be added via a small dialog if needed
    })
    .eq("id", invoice.id);
  
  if (!error) {
    toast.success(t("finance.invoices.markedAsPaid"));
    fetchInvoiceDetails(); // Refresh
    // Invalidate invoice queries
  }
};
```

### 2.2 Invoice Line Items - Human-Readable Labels

**Current issue:** Invoice items show `entity_type:entity_id` (e.g., "lab_sample:27d...")

**File:** `src/components/finance/InvoiceDetailsSheet.tsx`

**Fetch sample details for lab_sample items:**
```typescript
// After fetching items, enrich lab_sample items with sample details
const enrichedItems = await Promise.all(items.map(async (item) => {
  if (item.entity_type === 'lab_sample' && item.entity_id) {
    const { data: sample } = await supabase
      .from('lab_samples')
      .select('daily_number, physical_sample_id')
      .eq('id', item.entity_id)
      .single();
    
    if (sample) {
      return {
        ...item,
        enrichedDescription: sample.daily_number 
          ? `${item.description} - #${sample.daily_number}`
          : `${item.description} - ${sample.physical_sample_id?.slice(0, 12) || ''}`
      };
    }
  }
  return item;
}));
```

**Update display:**
```typescript
<p className="text-sm font-medium truncate">
  {item.enrichedDescription || item.description}
</p>
```

### 2.3 RTL Layout Fix

**Current issue:** Finance sub-tabs shift sidebar to left in Arabic

**File:** `src/pages/DashboardFinance.tsx` (line 378)

**Fix:**
```typescript
// Current
<div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>

// Should NOT reverse flex on RTL - sidebar handles its own positioning
<div className="min-h-screen bg-cream flex">
```

The sidebar component already handles RTL positioning. The `flex-row-reverse` causes the double-reversal issue.

---

## PHASE 3: NUMBER FORMATTING (EN DIGITS ALWAYS)

### 3.1 Create Centralized Formatter Utility

**New file:** `src/lib/formatters.ts`

```typescript
/**
 * Format currency with ALWAYS English digits (0-9)
 * Arabic UI can have Arabic text but digits must be English
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with ALWAYS English digits
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format date with ALWAYS English digits
 */
export function formatDate(date: Date | string, formatStr?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use date-fns format which preserves English digits
  return format(d, formatStr || 'dd/MM/yyyy');
}
```

### 3.2 Update All formatCurrency Usages

**Files to update (12 files identified):**
- `src/components/finance/InvoiceCard.tsx`
- `src/components/finance/ExpenseCard.tsx`
- `src/components/finance/InvoiceLineItemsEditor.tsx`
- `src/components/finance/InvoiceFormDialog.tsx`
- `src/components/finance/InvoiceDetailsSheet.tsx`
- `src/components/laboratory/LabHorseProfile.tsx`
- `src/components/laboratory/LabHorsesList.tsx`
- `src/components/dashboard/FinancialSummaryWidget.tsx`
- `src/pages/DashboardFinance.tsx`
- `src/pages/DashboardHRPayroll.tsx`
- `src/components/clients/ClientCard.tsx`
- `src/components/horses/orders/ClientSelector.tsx`

**Change pattern:**
```typescript
// FROM
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {...}).format(amount);
};

// TO
import { formatCurrency } from "@/lib/formatters";
// Use directly: formatCurrency(amount)
```

---

## PHASE 4: LAB HORSES LIST IMPROVEMENTS

### 4.1 Page Title Fix

**File:** `src/components/laboratory/LabHorsesList.tsx`

**Current:** Uses translation key `laboratory.labHorses.title`
**Translation already correct:** "سجل الخيول" in ar.ts (line 475)

No code change needed - verify translation is applied.

### 4.2 Additional Filters

**Add sorting and more filters:**
```typescript
// Add state
const [sortBy, setSortBy] = useState<'name' | 'outstanding' | 'samples_count' | 'last_sample_date'>('name');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

// Add sort UI
<Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder={t("common.sortAsc")} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="name">{t("common.name")}</SelectItem>
    <SelectItem value="samples_count">{t("laboratory.labHorses.samplesCount")}</SelectItem>
    <SelectItem value="outstanding">{t("laboratory.labHorses.outstanding")}</SelectItem>
    <SelectItem value="last_sample_date">{t("laboratory.labHorses.lastSampleDate")}</SelectItem>
  </SelectContent>
</Select>
```

**Update hook or apply client-side sort:**
```typescript
const sortedHorses = useMemo(() => {
  return [...labHorses].sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'outstanding': return (a.outstanding - b.outstanding) * modifier;
      case 'samples_count': return (a.samples_count - b.samples_count) * modifier;
      case 'last_sample_date': 
        if (!a.last_sample_date) return 1;
        if (!b.last_sample_date) return -1;
        return (new Date(a.last_sample_date).getTime() - new Date(b.last_sample_date).getTime()) * modifier;
      default: return a.name.localeCompare(b.name) * modifier;
    }
  });
}, [labHorses, sortBy, sortOrder]);
```

---

## PHASE 5: LAB HORSE PROFILE IMPROVEMENTS

### 5.1 Interactive Sample/Result Cards

**Current:** Cards have `onClick` but handlers may not be wired properly

**File:** `src/components/laboratory/LabHorseProfile.tsx`

**Verify onSampleClick and onResultClick are passed from parent:**

```typescript
// In DashboardLaboratory.tsx TabsContent for "horses"
<LabHorseProfile
  horseId={searchParams.get('horseId')!}
  onBack={handleBackFromHorseProfile}
  onSampleClick={(sampleId) => {
    // Navigate to samples tab with sample selected OR open sample details sheet
    handleTabChange('samples');
    // Could use URL param: ?sampleId=xxx
  }}
  onResultClick={(resultId) => {
    const result = results.find(r => r.id === resultId);
    if (result) setPreviewResult(result);
  }}
/>
```

### 5.2 Edit Lab Horse Button

**File:** `src/components/laboratory/LabHorseProfile.tsx`

**Add Edit button in header (with permission check):**
```typescript
// In header card
<div className="flex items-start justify-between gap-4">
  <div>
    <CardTitle>...</CardTitle>
  </div>
  {canManage && (
    <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
      <Pencil className="h-4 w-4 me-2" />
      {t("common.edit")}
    </Button>
  )}
</div>
```

### 5.3 Print/Export Report

**Add Report Dialog:**
```typescript
// New component or inline in LabHorseProfile
const [reportDialogOpen, setReportDialogOpen] = useState(false);
const [reportConfig, setReportConfig] = useState({
  dateFrom: subMonths(new Date(), 1),
  dateTo: new Date(),
  includeSamples: true,
  includeResults: true,
  includeFinancial: true,
});

// Button in header
<Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}>
  <Printer className="h-4 w-4 me-2" />
  {t("laboratory.labHorses.printReport")}
</Button>

// Dialog with date pickers and checkboxes
// Generate printable view or PDF using existing patterns
```

---

## PHASE 6: PERMISSIONS (CRITICAL RULE COMPLIANCE)

### 6.1 New Permission Keys Required

**For Lab Horses module:**
- `laboratory.horses.view` - View lab horses list and profiles
- `laboratory.horses.create` - Create new lab horses
- `laboratory.horses.edit` - Edit lab horse details
- `laboratory.horses.archive` - Archive/restore lab horses
- `laboratory.horses.export` - Export/print lab horse reports

**For Finance invoice actions:**
- `finance.invoice.markPaid` - Mark invoice as paid
- `finance.invoice.delete` - Delete invoices

### 6.2 Implementation Pattern

**UI enforcement (deny-by-default):**
```typescript
// In LabHorsesList
const canViewHorses = isOwner || hasPermission("laboratory.horses.view");
const canManageHorses = isOwner || hasPermission("laboratory.horses.edit");
const canArchive = isOwner || hasPermission("laboratory.horses.archive");

// Hide actions when not permitted
{canManageHorses && (
  <DropdownMenuItem onClick={handleEdit}>
    <Edit className="h-4 w-4 me-2" />
    {t("common.edit")}
  </DropdownMenuItem>
)}
```

**RLS enforcement:** Existing lab_horses RLS already checks tenant membership. Additional action-based RLS can be added if needed.

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `src/lib/formatters.ts` | Centralized number/currency/date formatters with EN digits |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/components/laboratory/CreateSampleDialog.tsx` | Wizard step reorder, per-horse templates, client step, collision validation |
| `src/components/laboratory/LabHorsesList.tsx` | Add sorting, verify title, improve filters |
| `src/components/laboratory/LabHorseProfile.tsx` | Edit button, interactive cards, print/export |
| `src/pages/DashboardLaboratory.tsx` | Wire sample/result click handlers |
| `src/components/finance/InvoiceDetailsSheet.tsx` | Add full actions, enrich item labels, mark as paid |
| `src/pages/DashboardFinance.tsx` | Fix RTL layout |
| `src/i18n/locales/ar.ts` | Add wizard step translations, report translations |
| `src/i18n/locales/en.ts` | Add wizard step translations, report translations |
| 12 files with formatCurrency | Replace with centralized formatter |

---

## MANUAL TEST CHECKLIST

### Wizard (ALL DEVICES)
- [ ] LAB tenant wizard starts with Client step
- [ ] Stable tenant wizard starts with Horses step (unchanged)
- [ ] Per-horse templates: Select 2 horses, assign different templates, verify each sample gets correct templates
- [ ] Daily number collision: Enter duplicate number, verify error is shown
- [ ] Daily number auto-fill works with selected collection_date

### Lab Horses List
- [ ] Page title shows "سجل الخيول" in Arabic
- [ ] ViewSwitcher works (Table/Grid/List)
- [ ] Sorting by name/outstanding/samples works
- [ ] Filters: Has samples, Has outstanding, Include archived

### Lab Horse Profile
- [ ] Edit button visible for owner/manager
- [ ] Sample cards are clickable → opens sample details
- [ ] Result cards are clickable → opens result preview
- [ ] Financial tab shows correct totals
- [ ] Print report button (if implemented)

### Finance
- [ ] Invoice details shows action buttons (Mark as Paid, Print, Download)
- [ ] "Mark as Paid" updates status and sets payment_received_at
- [ ] Invoice line items show human-readable labels (not UUIDs)
- [ ] RTL layout: sidebar stays on right side in Arabic

### Number Formatting
- [ ] All amounts show English digits (0-9) even in Arabic UI
- [ ] Dates show English digits
- [ ] Invoice numbers show English digits

---

## IMPLEMENTATION ORDER

1. **Phase 3:** Create `src/lib/formatters.ts` (no dependencies)
2. **Phase 1:** Wizard redesign (core functionality)
3. **Phase 2:** Finance fixes (parallel with Phase 1)
4. **Phase 4:** Lab Horses list improvements
5. **Phase 5:** Lab Horse profile improvements
6. **Phase 6:** Permissions audit and enforcement

---

## TECHNICAL NOTES

### No Database Changes Required
All necessary schema exists:
- `lab_horses` table with RLS
- `lab_samples.lab_horse_id` FK
- `invoices.payment_received_at` column
- `invoice_items.entity_type/entity_id` for linking

### Backward Compatibility
- Stable tenant wizard flow unchanged
- Existing lab horses and samples work with new features
- Finance actions are additive (new capabilities, not breaking changes)


(Execution) — Update & refine the plan below (“plan edit”)

You will EDIT the existing plan text (the one titled “Implementation Plan: Complete Lab Horses Module + Create Sample Wizard + Finance Fixes”) to incorporate the missing requirements + fix incorrect assumptions. Keep the same structure (Executive Summary + Phases), but update the content so it becomes execution-ready and fully aligned with the current codebase state.

CRITICAL PERMANENT RULE (MUST be explicitly embedded into the plan):
Any new CRUD surface or new actionable operation (Create/Update/Delete/Archive/Restore/MarkPaid/Send/Print/Export/Edit) MUST ship with permissions in RBAC/RLS:
1) Define permission keys
2) Add them to role/bundle mappings (seed/migration if applicable)
3) Enforce in UI (deny-by-default: hide/disable actions)
4) Enforce in data layer (RLS / policies / RPC checks as applicable)
5) Add translations for any new labels and permission-related UI strings

Now update the plan with the following adjustments (include them inside the appropriate phases/sections):

A) Wizard work is still missing (must be Phase 1 and must be implemented)
- Keep the proposed LAB_STEPS change and client step extraction.
- Keep per-horse template selection and daily_number collision validation (based on selected collection_date, not “today”).
- Add explicit note: verify existing daily number generation/auto-fill still works after step reorder, and that collision validation uses the chosen collection_date day window.
- Add the permissions impact: Wizard actions that create samples must respect existing lab permissions; if there are new actions/paths introduced, add permission keys (e.g., laboratory.samples.create, laboratory.samples.edit if not already present).

B) Finance module fixes MUST be expanded because current actions are non-functional
Update Phase 2 to include:
1) InvoiceDetailsSheet must support real “Edit” (not view-only):
   - Wire the existing InvoiceFormDialog in “edit mode” from InvoiceDetailsSheet and from the InvoiceCard dropdown.
   - Ensure save updates invoice + items, and queries are invalidated/refreshed.
2) Delete invoice must be functional with confirmation dialog:
   - Only show for users with permission finance.invoice.delete (or owner).
   - After delete: refresh invoices list, any horse financial summaries, and client balances if used.
3) Mark as Paid must record payment_received_at and optionally payment_method:
   - Add a lightweight dialog to choose payment_method if the schema expects it (cash/card/transfer/debt).
4) Fix unreadable invoice items (the “entity_type:uuid” problem AND the layout problem):
   - Use enrichment for lab_sample items (daily_number, physical_sample_id) but DO NOT do N+1 per item.
   - Batch fetch lab_samples for all entity_ids in the invoice items query, then map.
   - In UI: enforce readable layout (LTR for codes/IDs), use `dir="ltr"` for invoice numbers, amounts, and IDs; use `font-mono tabular-nums`; apply proper wrapping/truncation (`flex`, `min-w-0`, `truncate`, `break-words` only where needed).
5) RTL sidebar issue in Finance:
   - Keep the proposed fix (remove flex-row-reverse) BUT add verification steps: confirm Sidebar stays on right in Arabic across Finance subroutes (invoices/expenses/ledger/pos/categories).
6) Add missing finance capabilities noted by user:
   - “Settle/Pay invoice” flow must be available (Mark Paid).
   - Ensure existing dropdown items that appear are actually implemented (no dead options).

C) EN digits everywhere for numbers/dates/times (amounts + dates + invoice numbers)
Update Phase 3:
- Keep centralized formatter utilities, but enforce a stricter rule:
  - All numeric output must render with English digits (0-9), even in Arabic UI.
  - Any invoice number, sample numbers, amounts, dates, and times must use EN digits.
- Add explicit UI rules:
  - For numeric fields/labels: `dir="ltr"` + `tabular-nums` class.
  - Use the centralized formatter in LabHorseProfile, LabHorsesList, Finance components, and any widgets that show totals.
- Add a “Verification list” of key screens to check (Lab horse financial tab, invoice details sheet, invoice list, client outstanding, samples list).

D) Lab Horses module UI/UX adjustments based on screenshots & current implementation gaps
Update Phase 4 and Phase 5 to include:
1) Lab Horses List:
   - Must have ViewSwitcher (Table/Grid/List) that is BIG and always visible (not collapsed icons). Labels must not wrap; make it usable on desktop/tablet.
   - Table formatting: headers AND cells centered (per user request).
   - Add more columns beyond basics: Samples count, Outstanding (already), and optionally “Last sample date”.
   - Add filters: hasSamples, hasOutstanding, includeArchived, plus sorting (name/samples/outstanding/last_sample_date).
   - Ensure all new filters are translated (ar/en).
2) Lab Horse Profile:
   - Must include Edit horse action (currently missing): open the same edit dialog used from list; gated by permissions.
   - Samples & Results cards MUST be interactive and open details (sample details sheet / result preview dialog). Ensure handlers are actually wired from DashboardLaboratory.
   - Financial tab: invoice cards/rows clickable (already) AND invoice details must show actions (edit/delete/mark paid/print/download) based on permissions.
3) Add Print/Export report capability (user requirement):
   - Provide a report dialog where user selects date range (from/to) and toggles what to include (samples/results/financial).
   - Output: printable view and/or PDF using existing PDF generator patterns.
   - Add permission `laboratory.horses.export` (or equivalent) and enforce it.

E) Clients vs Owner linkage (must be addressed explicitly in the plan)
Add a subsection (either Phase 1 or a separate “Data/Domain Alignment” section):
- Clarify: “Client” in the system is the billing/customer entity used by invoices and the sample wizard.
- “Owner name/phone” in lab_horses is the specimen owner/contact captured at intake.
- Add an evidence check task BEFORE implementing any linkage UI:
  1) Inspect schema for any existing lab_horses.client_id / linked_client_id column OR existing relationship pattern.
  2) If no column exists, propose a minimal non-breaking approach:
     - Store optional linked client reference in lab_horses.metadata (e.g., metadata.linked_client_id) and expose “Link to Client” selector in Lab Horse edit dialog.
     - In profile: show “Linked client” if present, and link to client page and finance filtered by client_id.
- Ensure any new linkage UI is gated by permissions and respects RLS.

F) Permissions phase MUST be made concrete and enforced (not just listed)
Update Phase 6 to include:
- A definitive list of permission keys for EVERYTHING introduced/changed:
  Lab Horses:
    - laboratory.horses.view
    - laboratory.horses.create
    - laboratory.horses.edit
    - laboratory.horses.archive
    - laboratory.horses.export
    - (optional) laboratory.horses.linkClient
  Finance:
    - finance.invoice.edit
    - finance.invoice.delete
    - finance.invoice.markPaid
    - finance.invoice.send
    - finance.invoice.print
- Add explicit “Where to implement” checklist:
  1) Permission registry (where keys live)
  2) Role/bundle mapping (seed/migration)
  3) UI checks (hasPermission guards on buttons, menu items, routes/tabs)
  4) Server/RLS/RPC coverage (validate write paths)
  5) Translations for any new button labels and empty-states

G) Manual test checklist must be updated to match the real issues
- Add tests for:
  - Wizard step order and functionality on mobile/desktop
  - Finance RTL sidebar positioning
  - Invoice actions working end-to-end (edit/delete/mark paid)
  - EN digits everywhere (amount/date/time)
  - Lab horse profile edit and interactive cards
  - ViewSwitcher visibility/size



