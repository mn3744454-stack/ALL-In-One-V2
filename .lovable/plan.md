# Implementation Plan: Complete Lab Horses Module + Create Sample Wizard + Finance Fixes

## EXECUTIVE SUMMARY

This plan completes the remaining requirements for the Lab Horses module, Create Sample wizard redesign for LAB tenants, Finance module fixes, and number formatting standardization. All changes follow the CRITICAL PERMANENT RULE for RBAC/RLS enforcement.

---

## CURRENT IMPLEMENTATION STATUS

### ✅ DONE (Already Implemented)

**Phase 3 - Number Formatting:**
- ✅ Created `src/lib/formatters.ts` with centralized formatters (formatCurrency, formatNumber, formatDate, formatDateTime, formatTime, formatRelativeDate)
- ✅ All formatters use `en-US` locale to enforce English digits (0-9)
- ⚠️ PARTIAL: Started replacing local formatCurrency in some components but NOT complete

**Phase 2.3 - Finance RTL Fix:**
- ✅ Removed `flex-row-reverse` from `DashboardFinance.tsx` to fix sidebar positioning in Arabic

**Phase 2 - Invoice Details Sheet Enhancements:**
- ✅ Added Mark as Paid with payment method dialog (cash/card/transfer/credit)
- ✅ Added Send action for draft invoices
- ✅ Added Delete with AlertDialog confirmation
- ✅ Added batch-enrichment of lab_sample invoice items (daily_number / physical_sample_id)
- ✅ Added `dir="ltr"` and `tabular-nums` for numeric values in InvoiceCard, LabHorseProfile, LabHorsesList
- ✅ Added translations for payment methods and delete confirmations (ar/en)

### ❌ NOT DONE / STILL BROKEN

**Phase 1 - Wizard Redesign:**
- ❌ LAB_STEPS reorder NOT implemented (client → horses → templates → details...)
- ❌ Client step extraction NOT implemented
- ❌ Per-horse template selection NOT implemented
- ❌ Daily number collision validation NOT implemented

**Permission System:**
- ❌ Permission keys NOT defined in permission_definitions
- ❌ hasPermission() NOT used - currently checking `activeRole === owner/manager` which violates the permanent rule
- ❌ RLS enforcement NOT verified for new actions

**Invoice Edit:**
- ❌ Real Edit mode NOT implemented (view-only still)
- ❌ InvoiceFormDialog NOT wired in edit mode
- ❌ Query invalidation after actions is INCOMPLETE

**Other Issues:**
- ⚠️ Local formatCurrency/formatAmount functions still exist in many components (need full replacement)
- ⚠️ ViewSwitcher in LabHorsesList may still be small/icon-only
- ⚠️ Interactive sample/result cards handlers may not be fully wired

---

## ⚠️ CRITICAL PERMANENT RULE (MUST BE APPLIED TO ALL CHANGES)

Any new CRUD surface or actionable operation (Create/Update/Delete/Archive/Restore/MarkPaid/Send/Print/Export/Edit) MUST ship with permissions:

1. **Define permission keys** for each action
2. **Add to role/bundle mappings** (seed/migration if applicable)
3. **Enforce in UI** (deny-by-default: hide/disable actions when not permitted)
4. **Enforce in data layer** (RLS/policies/RPC checks)
5. **Add translations** for any new labels and permission-related UI strings

**Current violations to fix:**
- `InvoiceDetailsSheet.tsx` uses `isOwnerOrManager` instead of `hasPermission()`
- `LabHorseProfile.tsx` uses role checks instead of permission checks
- No permission keys exist for: `finance.invoice.edit`, `finance.invoice.delete`, `finance.invoice.markPaid`, `finance.invoice.send`

---

## PHASE 1: CREATE SAMPLE WIZARD REDESIGN (ALL DEVICES) — TODO

### Status: ❌ NOT STARTED

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

**CRITICAL:** Collision validation MUST use the selected `collection_date` day window, NOT "today" device date.

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
  
  // Check against existing samples for collection_date (NOT today!)
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

**Verification after implementation:**
- [ ] Daily number auto-fill still works after step reorder
- [ ] Collision check uses selected collection_date window, not device "today"
- [ ] Stable tenant wizard flow remains unchanged

### 1.4 Permissions Impact

Wizard actions that create samples must respect existing lab permissions:
- `laboratory.samples.create` - Required to create new samples
- `laboratory.samples.edit` - Required to edit existing samples (if retest flow modifies)

**Verify existing permission checks are in place; add if missing.**

### 1.5 Add Translations

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

## PHASE 2: FINANCE MODULE FIXES — PARTIAL (MUST COMPLETE)

### Status: ⚠️ PARTIAL - Core actions added but Edit broken, permissions missing, query invalidation incomplete

### 2.1 Invoice Actions - Full Implementation

#### 2.1.1 Real Edit Mode — ❌ TODO

**Current Problem:** Edit action is NOT implemented. `onEdit` in InvoiceCard and InvoiceDetailsSheet does nothing useful.

**Required Implementation:**

**Files to modify:**
- `src/components/finance/InvoiceDetailsSheet.tsx`
- `src/components/finance/InvoiceCard.tsx`
- `src/components/finance/InvoiceFormDialog.tsx` (must support edit mode)

**Implementation:**
```typescript
// InvoiceDetailsSheet - Add Edit action that opens InvoiceFormDialog in edit mode
const [editDialogOpen, setEditDialogOpen] = useState(false);

// Permission check (MUST use hasPermission, NOT role check)
const canEdit = hasPermission("finance.invoice.edit");

// In actions section
{canEdit && invoice.status === 'draft' && (
  <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
    <Pencil className="h-4 w-4 me-2" />
    {t("common.edit")}
  </Button>
)}

// Add InvoiceFormDialog in edit mode
<InvoiceFormDialog
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
  invoice={invoice}
  mode="edit"
  onSuccess={() => {
    fetchInvoiceDetails();
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }}
/>
```

**InvoiceFormDialog must be updated to accept:**
- `invoice?: Invoice` prop for prefilling
- `mode?: 'create' | 'edit'` prop
- On save in edit mode: UPDATE instead of INSERT

#### 2.1.2 Delete with Confirmation — ✅ DONE (verify permissions)

**Current:** Delete confirmation dialog implemented.

**TODO:** Replace role check with permission check:
```typescript
// FROM (current - WRONG):
const canDelete = activeRole === 'owner' || activeRole === 'manager';

// TO (correct):
const canDelete = hasPermission("finance.invoice.delete");
```

#### 2.1.3 Mark as Paid with Payment Method — ✅ DONE (verify permissions + invalidation)

**Current:** Payment method dialog implemented.

**TODO:**
1. Replace role check with `hasPermission("finance.invoice.markPaid")`
2. Add query invalidation after success:
```typescript
queryClient.invalidateQueries({ queryKey: ["invoices"] });
queryClient.invalidateQueries({ queryKey: ["lab-horse-financial"] });
queryClient.invalidateQueries({ queryKey: ["lab-horses-with-metrics"] });
```

### 2.2 Query Invalidation — ❌ TODO (MANDATORY)

**After every invoice action (Send/MarkPaid/Delete/Edit), invalidate:**
```typescript
// Invoice queries
queryClient.invalidateQueries({ queryKey: ["invoices"] });
queryClient.invalidateQueries({ queryKey: ["invoice-items"] });

// Dependent summaries
queryClient.invalidateQueries({ queryKey: ["lab-horse-financial"] });
queryClient.invalidateQueries({ queryKey: ["lab-horses-with-metrics"] });

// Client balances (if applicable)
queryClient.invalidateQueries({ queryKey: ["client-balances"] });
```

### 2.3 Invoice Line Items - Human-Readable Labels — ✅ DONE (verify UI layout)

**Status:** Batch enrichment implemented in InvoiceDetailsSheet.

**TODO - UI Layout Fix:**
Ensure line items are readable in RTL with proper layout:
```tsx
// For invoice items display:
<div className="flex justify-between items-start gap-2">
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium break-words">
      {item.enrichedDescription || item.description}
    </p>
    <p className="text-xs text-muted-foreground" dir="ltr">
      <span className="font-mono tabular-nums">{item.quantity}</span> × <span className="font-mono tabular-nums">{formatCurrency(item.unit_price)}</span>
    </p>
  </div>
  <p className="font-mono text-sm font-medium tabular-nums shrink-0" dir="ltr">
    {formatCurrency(item.total_price)}
  </p>
</div>
```

### 2.4 RTL Layout Fix — ✅ DONE

**Status:** Removed `flex-row-reverse` from DashboardFinance.tsx.

**Verification checklist:**
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/invoices
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/expenses
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/ledger
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/pos
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/categories

### 2.5 Ensure No Dead Dropdown Options — TODO

Audit all dropdown items in InvoiceCard and InvoiceDetailsSheet:
- [ ] View → Works (opens InvoiceDetailsSheet)
- [ ] Edit → TODO (must open InvoiceFormDialog in edit mode)
- [ ] Delete → Works (with confirmation)
- [ ] Download PDF → Verify works
- [ ] Print → Verify works
- [ ] Send → Works (changes status to 'sent')
- [ ] Mark as Paid → Works (with payment method dialog)

**Remove or disable any non-functional options.**

---

## PHASE 3: NUMBER FORMATTING (EN DIGITS ALWAYS) — PARTIAL (MUST COMPLETE)

### Status: ⚠️ PARTIAL - Formatters created but not fully applied everywhere

### 3.1 Centralized Formatter Utility — ✅ DONE

**File:** `src/lib/formatters.ts` (CREATED)

Contains:
- `formatCurrency(amount, currency)` - EN digits
- `formatCurrencyCompact(amount, currency)` - EN digits, no decimals
- `formatNumber(value, options)` - EN digits
- `formatInteger(value)` - EN digits, no decimals
- `formatPercent(value, decimals)` - EN digits
- `formatDate(date, formatStr)` - EN digits
- `formatDateTime(date, formatStr)` - EN digits
- `formatTime(date, formatStr)` - EN digits
- `formatRelativeDate(date)` - EN digits

### 3.2 Replace ALL Local Formatters — ❌ TODO

**Rule:** NO local `Intl.NumberFormat` instances. Import from `@/lib/formatters`.

**Files to update (verify each):**

| File | Status | Action |
|------|--------|--------|
| `src/components/finance/InvoiceCard.tsx` | ⚠️ Check | Replace local formatCurrency |
| `src/components/finance/ExpenseCard.tsx` | ❌ TODO | Replace local formatCurrency |
| `src/components/finance/InvoiceLineItemsEditor.tsx` | ❌ Has local formatCurrency | Replace with import |
| `src/components/finance/InvoiceFormDialog.tsx` | ❌ Has local formatCurrency | Replace with import |
| `src/components/finance/InvoiceDetailsSheet.tsx` | ⚠️ Check | Verify using centralized |
| `src/components/laboratory/LabHorseProfile.tsx` | ⚠️ Check | Verify using centralized |
| `src/components/laboratory/LabHorsesList.tsx` | ⚠️ Check | Verify using centralized |
| `src/components/dashboard/FinancialSummaryWidget.tsx` | ❌ TODO | Replace local formatCurrency |
| `src/pages/DashboardFinance.tsx` | ❌ TODO | Replace local formatCurrency |
| `src/pages/DashboardHRPayroll.tsx` | ❌ TODO | Replace local formatCurrency |
| `src/components/clients/ClientCard.tsx` | ❌ TODO | Replace local formatCurrency |
| `src/components/horses/orders/ClientSelector.tsx` | ❌ TODO | Replace local formatCurrency |

### 3.3 UI Rules for Numeric Display

Apply these rules consistently:
- **For numeric values:** Use `dir="ltr"` + `tabular-nums` class
- **For invoice numbers, IDs, codes:** Use `dir="ltr"` + `font-mono`
- **For amounts:** Use centralized `formatCurrency()` + `dir="ltr"`
- **For dates/times:** Use centralized `formatDate()` / `formatDateTime()`

**Example:**
```tsx
<span className="font-mono tabular-nums" dir="ltr">
  {formatCurrency(amount)}
</span>

<span className="text-muted-foreground" dir="ltr">
  {formatDate(invoice.issue_date)}
</span>
```

### 3.4 Verification Screens

Verify EN digits appear correctly on these screens:
- [ ] Lab Horse Profile → Financial tab (totals, invoice amounts)
- [ ] Invoice Details Sheet (amounts, dates, invoice number)
- [ ] Invoices List (amounts, dates)
- [ ] Client outstanding balances
- [ ] Samples list (daily numbers, dates)
- [ ] Dashboard financial widgets

---

## PHASE 4: LAB HORSES LIST IMPROVEMENTS — TODO

### Status: ❌ NOT STARTED

### 4.1 Page Title

**File:** `src/components/laboratory/LabHorsesList.tsx`

**Current:** Uses translation key `laboratory.labHorses.title`
**Required Arabic:** "سجل الخيول"

Verify translation is correctly applied.

### 4.2 ViewSwitcher - BIG and Always Visible

**Requirement:** ViewSwitcher must be large, always visible (not collapsed icons), with labels that don't wrap.

```tsx
<ViewSwitcher
  view={viewMode}
  onViewChange={setViewMode}
  options={[
    { value: 'table', label: t('common.table'), icon: TableIcon },
    { value: 'grid', label: t('common.grid'), icon: Grid3x3 },
    { value: 'list', label: t('common.list'), icon: List },
  ]}
  size="default"  // NOT "sm" or "icon"
  showLabels={true}
/>
```

### 4.3 Table Formatting

**Requirement:** Headers AND cells must be center-aligned.

```tsx
// Table header
<TableHead className="text-center">{t("common.name")}</TableHead>
<TableHead className="text-center">{t("laboratory.labHorses.samplesCount")}</TableHead>
<TableHead className="text-center">{t("laboratory.labHorses.outstanding")}</TableHead>

// Table cells
<TableCell className="text-center">{horse.name}</TableCell>
<TableCell className="text-center">{horse.samples_count}</TableCell>
<TableCell className="text-center" dir="ltr">
  <span className="font-mono tabular-nums">{formatCurrency(horse.outstanding)}</span>
</TableCell>
```

### 4.4 Additional Columns

Required columns beyond basics:
- Name (existing)
- Owner (existing)
- Microchip/Passport/UELN (existing)
- **Samples count** (add)
- **Outstanding** (add)
- **Last sample date** (add, optional)

### 4.5 Filters and Sorting

**Add state:**
```typescript
const [sortBy, setSortBy] = useState<'name' | 'outstanding' | 'samples_count' | 'last_sample_date'>('name');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
const [hasSamples, setHasSamples] = useState<boolean | null>(null);
const [hasOutstanding, setHasOutstanding] = useState<boolean | null>(null);
const [includeArchived, setIncludeArchived] = useState(false);
```

**Add translations for filters (ar/en).**

---

## PHASE 5: LAB HORSE PROFILE IMPROVEMENTS — TODO

### Status: ❌ NOT STARTED

### 5.1 Edit Lab Horse Button

**File:** `src/components/laboratory/LabHorseProfile.tsx`

**Add Edit button in header (with permission check):**
```typescript
// MUST use hasPermission, not role check
const canEdit = hasPermission("laboratory.horses.edit");

// In header card
<div className="flex items-start justify-between gap-4">
  <div>
    <CardTitle>{horse.name}</CardTitle>
    <CardDescription>...</CardDescription>
  </div>
  <div className="flex gap-2">
    {canExport && (
      <Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}>
        <Printer className="h-4 w-4 me-2" />
        {t("laboratory.labHorses.printReport")}
      </Button>
    )}
    {canEdit && (
      <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
        <Pencil className="h-4 w-4 me-2" />
        {t("common.edit")}
      </Button>
    )}
  </div>
</div>
```

### 5.2 Interactive Sample/Result Cards

**Requirement:** Samples & Results cards MUST be interactive and open details.

**Wire handlers in DashboardLaboratory.tsx:**
```typescript
<LabHorseProfile
  horseId={selectedHorseId}
  onBack={handleBackFromHorseProfile}
  onSampleClick={(sampleId) => {
    // Open SampleDetailsSheet
    setSelectedSampleId(sampleId);
    setSampleDetailsOpen(true);
  }}
  onResultClick={(resultId) => {
    // Open ResultPreviewDialog
    const result = results.find(r => r.id === resultId);
    if (result) setPreviewResult(result);
  }}
/>
```

**In LabHorseProfile, ensure cards are clickable:**
```tsx
<Card 
  className="cursor-pointer hover:shadow-md transition-shadow"
  onClick={() => onSampleClick?.(sample.id)}
>
  {/* Sample card content */}
</Card>
```

### 5.3 Financial Tab - Invoice Actions

Invoice cards/rows in Financial tab must show full actions (edit/delete/mark paid/print/download) based on permissions.

Wire InvoiceDetailsSheet with permission props using `hasPermission()`.

### 5.4 Print/Export Report Dialog

**New component or inline in LabHorseProfile:**

```typescript
const [reportDialogOpen, setReportDialogOpen] = useState(false);
const [reportConfig, setReportConfig] = useState({
  dateFrom: subMonths(new Date(), 1),
  dateTo: new Date(),
  includeSamples: true,
  includeResults: true,
  includeFinancial: true,
});

// Permission check - MUST use hasPermission
const canExport = hasPermission("laboratory.horses.export");
```

**Report dialog UI:**
- Date range picker (from/to)
- Checkboxes: Samples, Results, Financial summary
- Generate button → creates printable view or PDF

**Use existing PDF generator patterns (jspdf + html2canvas).**

---

## PHASE 6: CLIENT VS OWNER LINKAGE (DATA/DOMAIN ALIGNMENT) — TODO

### 6.1 Clarification

- **Client** = Billing/customer entity used by invoices and sample wizard
- **Owner** = Specimen owner/contact captured at intake (`lab_horses.owner_name`, `lab_horses.owner_phone`)

These may be different entities (e.g., trainer sends sample, owner pays invoice).

### 6.2 Evidence Check (BEFORE implementing any linkage)

1. [ ] Inspect `lab_horses` schema for existing `client_id` / `linked_client_id` column
2. [ ] Check if any existing relationship pattern exists between lab_horses and clients

### 6.3 Proposed Minimal Approach (if no column exists)

**Option A: Use metadata field**
```typescript
// Store optional linked client in lab_horses.metadata
lab_horses.metadata.linked_client_id = 'uuid-of-client';
```

**Option B: Add optional FK (if safe)**
```sql
ALTER TABLE lab_horses ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
```

### 6.4 UI Implementation (if linkage added)

**In Lab Horse Edit Dialog:**
- Add "Link to Client" combobox (optional)
- When linked, show client name in profile

**In Lab Horse Profile:**
- If linked client exists, show "Linked Client" badge with link to client page
- Link to finance filtered by client_id

**Permission:** `laboratory.horses.linkClient` (optional, can use `laboratory.horses.edit`)

---

## PHASE 7: PERMISSIONS (CONCRETE ENFORCEMENT) — TODO

### Status: ❌ NOT STARTED - Currently using role checks which VIOLATES the permanent rule

### 7.1 Complete Permission Keys List

**Lab Horses module:**
| Key | Description | Actions Protected |
|-----|-------------|-------------------|
| `laboratory.horses.view` | View lab horses list and profiles | List, Profile view |
| `laboratory.horses.create` | Create new lab horses | Add horse button |
| `laboratory.horses.edit` | Edit lab horse details | Edit button, edit dialog |
| `laboratory.horses.archive` | Archive/restore lab horses | Archive/restore actions |
| `laboratory.horses.export` | Export/print lab horse reports | Print report button |
| `laboratory.horses.linkClient` | Link horse to client (optional) | Link to client selector |

**Lab Samples module:**
| Key | Description |
|-----|-------------|
| `laboratory.samples.create` | Create new samples via wizard |
| `laboratory.samples.edit` | Edit existing samples |

**Finance module:**
| Key | Description |
|-----|-------------|
| `finance.invoice.view` | View invoices (existing) |
| `finance.invoice.create` | Create invoices (existing) |
| `finance.invoice.edit` | Edit invoices |
| `finance.invoice.delete` | Delete invoices |
| `finance.invoice.markPaid` | Mark invoice as paid |
| `finance.invoice.send` | Send invoice to client |
| `finance.invoice.print` | Print/download invoice PDF |

### 7.2 Implementation Checklist

For EACH new permission:

1. **Permission Registry**
   - [ ] Add to `permission_definitions` table (if using DB registry)
   - [ ] Add to any hardcoded permission lists in code

2. **Role/Bundle Mapping**
   - [ ] Add to default bundles for owner/manager roles
   - [ ] Create migration if needed for seed data

3. **UI Enforcement**
   ```typescript
   // CORRECT - use hasPermission()
   const canEdit = hasPermission("laboratory.horses.edit");
   
   // WRONG - do NOT use role checks
   // const canEdit = activeRole === 'owner' || activeRole === 'manager';
   
   {canEdit && (
     <Button onClick={handleEdit}>Edit</Button>
   )}
   ```

4. **RLS/RPC Enforcement**
   - [ ] Verify write paths check permissions
   - [ ] Add RLS policies if needed for new tables/actions

5. **Translations**
   - [ ] Add permission names to ar.ts and en.ts
   - [ ] Add any new button labels, empty states

---

## FILES TO CREATE

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/formatters.ts` | Centralized number/currency/date formatters with EN digits | ✅ DONE |
| `src/components/laboratory/LabHorseReportDialog.tsx` | Print/export report dialog (optional, can be inline) | ❌ TODO |
| `src/components/finance/PaymentMethodDialog.tsx` | Lightweight dialog for mark as paid (optional, can be inline) | ⚠️ Inline in InvoiceDetailsSheet |

## FILES TO MODIFY

| File | Changes | Status |
|------|---------|--------|
| `src/components/laboratory/CreateSampleDialog.tsx` | Wizard step reorder, per-horse templates, client step, collision validation | ❌ TODO |
| `src/components/laboratory/LabHorsesList.tsx` | ViewSwitcher size, table formatting, sorting, filters | ⚠️ PARTIAL |
| `src/components/laboratory/LabHorseProfile.tsx` | Edit button, interactive cards, print/export, financial actions | ⚠️ PARTIAL |
| `src/pages/DashboardLaboratory.tsx` | Wire sample/result click handlers | ❌ TODO |
| `src/components/finance/InvoiceDetailsSheet.tsx` | Full actions, enriched labels, mark as paid, delete | ⚠️ PARTIAL (missing Edit, permissions) |
| `src/components/finance/InvoiceFormDialog.tsx` | Support edit mode with invoice prop | ❌ TODO |
| `src/components/finance/InvoiceCard.tsx` | Wire edit/delete actions properly, use hasPermission | ⚠️ PARTIAL |
| `src/pages/DashboardFinance.tsx` | Fix RTL layout (remove flex-row-reverse) | ✅ DONE |
| `src/i18n/locales/ar.ts` | Wizard steps, filters, permissions, report labels | ⚠️ PARTIAL |
| `src/i18n/locales/en.ts` | Wizard steps, filters, permissions, report labels | ⚠️ PARTIAL |
| `src/components/finance/InvoiceLineItemsEditor.tsx` | Replace local formatCurrency | ❌ TODO |
| Multiple other files | Replace local formatCurrency with centralized import | ❌ TODO |

---

## MANUAL TEST CHECKLIST

### Wizard (ALL DEVICES)

#### Step Order
- [ ] LAB tenant wizard starts with Client step (mobile)
- [ ] LAB tenant wizard starts with Client step (desktop)
- [ ] Stable tenant wizard starts with Horses step (unchanged)

#### Per-Horse Templates
- [ ] Select 2+ horses → "Apply to all" toggle appears
- [ ] Toggle OFF → can assign different templates per horse
- [ ] Verify each sample gets correct templates after creation

#### Daily Number
- [ ] Daily number auto-fill still works after step reorder
- [ ] Set collection_date to a past date, verify collision check uses THAT date
- [ ] Enter duplicate number → error is shown
- [ ] Enter number that exists on different date → no error

### Lab Horses List

- [ ] Page title shows "سجل الخيول" in Arabic
- [ ] ViewSwitcher is BIG and always visible (Table/Grid/List with labels)
- [ ] Table headers centered
- [ ] Table cells centered
- [ ] Samples count column displays correctly
- [ ] Outstanding column displays correctly (EN digits)
- [ ] Sorting by name works
- [ ] Sorting by outstanding works
- [ ] Sorting by samples_count works
- [ ] Filter: Has samples works
- [ ] Filter: Has outstanding works
- [ ] Filter: Include archived works

### Lab Horse Profile

- [ ] Edit button visible for permitted users (hasPermission check)
- [ ] Edit button hidden for non-permitted users
- [ ] Edit dialog opens and saves correctly
- [ ] Sample cards clickable → opens sample details sheet
- [ ] Result cards clickable → opens result preview dialog
- [ ] Financial tab totals use EN digits
- [ ] Invoice cards show actions based on permissions (hasPermission checks)
- [ ] Print report button visible for permitted users
- [ ] Report dialog: date range picker works
- [ ] Report dialog: section checkboxes work
- [ ] Report generates printable view/PDF

### Finance Module

#### RTL Layout
- [ ] Sidebar stays on RIGHT in Arabic on /dashboard/finance/invoices
- [ ] Sidebar stays on RIGHT in Arabic on /dashboard/finance/expenses
- [ ] Sidebar stays on RIGHT in Arabic on all other finance routes

#### Invoice Actions (End-to-End)
- [ ] View invoice → InvoiceDetailsSheet opens
- [ ] Edit invoice → InvoiceFormDialog opens in edit mode (with invoice data)
- [ ] Edit invoice → Save updates invoice and items correctly
- [ ] Edit invoice → After save, list and details refresh
- [ ] Delete invoice → Confirmation dialog appears
- [ ] Delete invoice → Invoice is deleted, list refreshes
- [ ] Delete invoice → Horse financial summaries refresh
- [ ] Mark as Paid → Payment method dialog appears
- [ ] Mark as Paid → Invoice status updates to 'paid'
- [ ] Mark as Paid → payment_received_at is set
- [ ] Mark as Paid → List and summaries refresh
- [ ] Download PDF → PDF downloads correctly
- [ ] Print → Print dialog opens
- [ ] Send → Status changes to 'sent', list refreshes

#### Invoice Line Items
- [ ] lab_sample items show "#daily_number" or physical_sample_id
- [ ] NO UUID fragments visible
- [ ] Layout is readable in Arabic RTL (no overflow, proper wrapping)
- [ ] Amounts use EN digits with proper LTR direction

### Number Formatting (EN Digits)

- [ ] All amounts show 0-9 digits even in Arabic UI
- [ ] All dates show 0-9 digits even in Arabic UI
- [ ] Invoice numbers show 0-9 digits
- [ ] Sample daily numbers show 0-9 digits
- [ ] Lab horse profile financial cards: EN digits
- [ ] Invoice details sheet: EN digits
- [ ] Invoices list: EN digits
- [ ] Client outstanding: EN digits

### Permissions (CRITICAL)

- [ ] Users without `laboratory.horses.edit` cannot see Edit button
- [ ] Users without `finance.invoice.edit` cannot see Edit option
- [ ] Users without `finance.invoice.delete` cannot see Delete option
- [ ] Users without `finance.invoice.markPaid` cannot see Mark as Paid button
- [ ] Users without `finance.invoice.send` cannot see Send option
- [ ] Owner bypasses all permission checks
- [ ] Manager with permissions can perform actions
- [ ] Member without permissions cannot perform actions
- [ ] ALL permission checks use hasPermission(), NOT role checks

---

## IMPLEMENTATION ORDER

1. **Phase 3 (Complete):** Replace ALL local formatCurrency with centralized import
2. **Phase 7 (Partial):** Add permission keys to system and convert existing role checks to hasPermission()
3. **Phase 2 (Complete):** Finish invoice Edit mode, query invalidation
4. **Phase 1:** Wizard redesign (core functionality)
5. **Phase 4:** Lab Horses list improvements
6. **Phase 5:** Lab Horse profile improvements
7. **Phase 6:** Client/Owner linkage (evidence check first)

---

## TECHNICAL NOTES

### No Database Changes Required (Unless Phase 6 linkage)

All necessary schema exists:
- `lab_horses` table with RLS
- `lab_samples.lab_horse_id` FK
- `invoices.payment_received_at` column
- `invoices.payment_method` column (verify exists)
- `invoice_items.entity_type/entity_id` for linking

### Backward Compatibility

- Stable tenant wizard flow unchanged
- Existing lab horses and samples work with new features
- Finance actions are additive (new capabilities, not breaking changes)

### Performance Considerations

- Invoice items enrichment uses batch query (NOT N+1) ✅
- Lab horses metrics use aggregated query hook
- Sorting is client-side for reasonable list sizes

---

## DEFINITION OF DONE

A phase is complete when:
1. All code changes implemented
2. All translations added (ar/en)
3. All permission checks enforced using hasPermission() (UI + RLS if applicable)
4. Query invalidation implemented for all state-changing actions
5. Manual test checklist items for that phase pass
6. No console errors in preview
7. No regressions in existing functionality
8. EN digits (0-9) used for all numeric output
