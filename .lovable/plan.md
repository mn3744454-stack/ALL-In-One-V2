# Implementation Plan: Complete Lab Horses Module + Create Sample Wizard + Finance Fixes

## EXECUTIVE SUMMARY

This plan completes the remaining requirements for the Lab Horses module, Create Sample wizard redesign for LAB tenants, Finance module fixes, and number formatting standardization. All changes follow the CRITICAL PERMANENT RULE for RBAC/RLS enforcement.

---

## ⚠️ CRITICAL PERMANENT RULE (MUST BE APPLIED TO ALL CHANGES)

Any new CRUD surface or actionable operation (Create/Update/Delete/Archive/Restore/MarkPaid/Send/Print/Export/Edit) MUST ship with permissions:

1. **Define permission keys** for each action
2. **Add to role/bundle mappings** (seed/migration if applicable)
3. **Enforce in UI** (deny-by-default: hide/disable actions when not permitted)
4. **Enforce in data layer** (RLS/policies/RPC checks)
5. **Add translations** for any new labels and permission-related UI strings

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

## PHASE 2: FINANCE MODULE FIXES (EXPANDED)

### 2.1 Invoice Actions - Full Implementation

**Current problems:**
- `onEdit` opens view-only (NOT real edit mode)
- `onMarkPaid` just changes status without recording payment details
- Delete needs confirmation dialog
- Many dropdown items are dead/non-functional

**Required changes:**

#### 2.1.1 Real Edit Mode

**Files:**
- `src/components/finance/InvoiceDetailsSheet.tsx`
- `src/components/finance/InvoiceCard.tsx`

**Implementation:**
```typescript
// InvoiceDetailsSheet - Add Edit action that opens InvoiceFormDialog in edit mode
const [editDialogOpen, setEditDialogOpen] = useState(false);

// In actions section (with permission check)
{canEdit && (
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
    // Invalidate queries
  }}
/>
```

#### 2.1.2 Delete with Confirmation

```typescript
// Add confirmation dialog
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

const handleDelete = async () => {
  if (!invoice) return;
  
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoice.id);
  
  if (!error) {
    toast.success(t("finance.invoices.deleted"));
    onOpenChange(false);
    // Invalidate: invoices list, horse financial summaries, client balances
  }
};

// Only show for permitted users
{canDelete && (
  <DropdownMenuItem 
    className="text-destructive" 
    onClick={() => setDeleteConfirmOpen(true)}
  >
    <Trash2 className="h-4 w-4 me-2" />
    {t("common.delete")}
  </DropdownMenuItem>
)}
```

#### 2.1.3 Mark as Paid with Payment Method Dialog

```typescript
// Add lightweight payment dialog
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'debt'>('cash');

const handleMarkPaid = async () => {
  if (!invoice) return;
  
  const { error } = await supabase
    .from("invoices")
    .update({ 
      status: 'paid', 
      payment_received_at: new Date().toISOString(),
      payment_method: paymentMethod,
    })
    .eq("id", invoice.id);
  
  if (!error) {
    toast.success(t("finance.invoices.markedAsPaid"));
    setPaymentDialogOpen(false);
    fetchInvoiceDetails();
  }
};

// Show for sent/overdue invoices with permission
{canMarkPaid && (invoice.status === 'sent' || invoice.status === 'overdue') && (
  <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
    <CheckCircle className="h-4 w-4 me-2" />
    {t("finance.invoices.markPaid")}
  </Button>
)}
```

### 2.2 Invoice Line Items - Human-Readable Labels (NO N+1)

**Current issue:** Invoice items show `entity_type:entity_id` (e.g., "lab_sample:27d...")

**Solution:** Batch fetch lab_samples for all entity_ids, then map.

```typescript
// In fetchInvoiceDetails, after fetching items:
const labSampleIds = items
  .filter(item => item.entity_type === 'lab_sample' && item.entity_id)
  .map(item => item.entity_id);

let sampleMap: Record<string, { daily_number: number | null; physical_sample_id: string | null }> = {};

if (labSampleIds.length > 0) {
  const { data: samples } = await supabase
    .from('lab_samples')
    .select('id, daily_number, physical_sample_id')
    .in('id', labSampleIds);
  
  if (samples) {
    sampleMap = samples.reduce((acc, s) => {
      acc[s.id] = { daily_number: s.daily_number, physical_sample_id: s.physical_sample_id };
      return acc;
    }, {} as typeof sampleMap);
  }
}

// Enrich items
const enrichedItems = items.map(item => {
  if (item.entity_type === 'lab_sample' && item.entity_id && sampleMap[item.entity_id]) {
    const sample = sampleMap[item.entity_id];
    const label = sample.daily_number 
      ? `#${sample.daily_number}`
      : sample.physical_sample_id?.slice(0, 12) || '';
    return {
      ...item,
      enrichedDescription: `${item.description} - ${label}`
    };
  }
  return item;
});
```

**UI Layout fix:**
```tsx
// For invoice items display:
<div className="flex justify-between items-start gap-2">
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium break-words">
      {item.enrichedDescription || item.description}
    </p>
    <p className="text-xs text-muted-foreground" dir="ltr">
      {item.quantity} × {formatCurrency(item.unit_price)}
    </p>
  </div>
  <p className="font-mono text-sm font-medium tabular-nums shrink-0" dir="ltr">
    {formatCurrency(item.total_price)}
  </p>
</div>
```

### 2.3 RTL Layout Fix

**Current issue:** Finance sub-tabs shift sidebar to left in Arabic

**File:** `src/pages/DashboardFinance.tsx`

**Fix:**
```typescript
// REMOVE flex-row-reverse - sidebar handles its own RTL positioning
// FROM:
<div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>

// TO:
<div className="min-h-screen bg-cream flex">
```

**Verification checklist:**
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/invoices
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/expenses
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/ledger
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/pos
- [ ] Sidebar stays on right side in Arabic on /dashboard/finance/categories

### 2.4 Ensure No Dead Dropdown Options

Audit all dropdown items in InvoiceCard and InvoiceDetailsSheet:
- [ ] View → Works (opens InvoiceDetailsSheet)
- [ ] Edit → Works (opens InvoiceFormDialog in edit mode)
- [ ] Delete → Works (with confirmation)
- [ ] Download PDF → Works
- [ ] Print → Works
- [ ] Send → Works (changes status to 'sent')
- [ ] Mark as Paid → Works (with payment method dialog)

**Remove or disable any non-functional options.**

---

## PHASE 3: NUMBER FORMATTING (EN DIGITS ALWAYS)

### 3.1 Create Centralized Formatter Utility

**New file:** `src/lib/formatters.ts`

```typescript
import { format } from 'date-fns';

/**
 * RULE: All numeric output MUST use English digits (0-9), even in Arabic UI.
 * This applies to: amounts, dates, times, invoice numbers, sample numbers, counters.
 */

/**
 * Format currency with ALWAYS English digits (0-9)
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
 * Uses date-fns format which preserves English digits
 */
export function formatDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format date-time with ALWAYS English digits
 */
export function formatDateTime(date: Date | string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}
```

### 3.2 UI Rules for Numeric Display

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

### 3.3 Files to Update

Replace local `formatCurrency` implementations with centralized import:

| File | Current Pattern |
|------|-----------------|
| `src/components/finance/InvoiceCard.tsx` | Local formatCurrency with ar-SA locale |
| `src/components/finance/ExpenseCard.tsx` | Local formatCurrency |
| `src/components/finance/InvoiceLineItemsEditor.tsx` | Local formatCurrency |
| `src/components/finance/InvoiceFormDialog.tsx` | Local formatCurrency |
| `src/components/finance/InvoiceDetailsSheet.tsx` | Local formatCurrency |
| `src/components/laboratory/LabHorseProfile.tsx` | Local formatCurrency |
| `src/components/laboratory/LabHorsesList.tsx` | Local formatCurrency |
| `src/components/dashboard/FinancialSummaryWidget.tsx` | Local formatCurrency |
| `src/pages/DashboardFinance.tsx` | Local formatCurrency |
| `src/pages/DashboardHRPayroll.tsx` | Local formatCurrency |
| `src/components/clients/ClientCard.tsx` | Local formatCurrency |
| `src/components/horses/orders/ClientSelector.tsx` | Local formatCurrency |

### 3.4 Verification Screens

Verify EN digits appear correctly on these screens:
- [ ] Lab Horse Profile → Financial tab (totals, invoice amounts)
- [ ] Invoice Details Sheet (amounts, dates, invoice number)
- [ ] Invoices List (amounts, dates)
- [ ] Client outstanding balances
- [ ] Samples list (daily numbers, dates)
- [ ] Dashboard financial widgets

---

## PHASE 4: LAB HORSES LIST IMPROVEMENTS

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
  {formatCurrency(horse.outstanding)}
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

## PHASE 5: LAB HORSE PROFILE IMPROVEMENTS

### 5.1 Edit Lab Horse Button

**File:** `src/components/laboratory/LabHorseProfile.tsx`

**Add Edit button in header (with permission check):**
```typescript
const canEdit = isOwner || hasPermission("laboratory.horses.edit");

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

Wire InvoiceDetailsSheet with canManage/canEdit/canDelete props.

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

// Permission check
const canExport = isOwner || hasPermission("laboratory.horses.export");
```

**Report dialog UI:**
- Date range picker (from/to)
- Checkboxes: Samples, Results, Financial summary
- Generate button → creates printable view or PDF

**Use existing PDF generator patterns (jspdf + html2canvas).**

---

## PHASE 6: CLIENT VS OWNER LINKAGE (DATA/DOMAIN ALIGNMENT)

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

## PHASE 7: PERMISSIONS (CONCRETE ENFORCEMENT)

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
   const canEdit = isOwner || hasPermission("laboratory.horses.edit");
   
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

| File | Purpose |
|------|---------|
| `src/lib/formatters.ts` | Centralized number/currency/date formatters with EN digits |
| `src/components/laboratory/LabHorseReportDialog.tsx` | Print/export report dialog (optional, can be inline) |
| `src/components/finance/PaymentMethodDialog.tsx` | Lightweight dialog for mark as paid (optional, can be inline) |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/components/laboratory/CreateSampleDialog.tsx` | Wizard step reorder, per-horse templates, client step, collision validation |
| `src/components/laboratory/LabHorsesList.tsx` | ViewSwitcher size, table formatting, sorting, filters |
| `src/components/laboratory/LabHorseProfile.tsx` | Edit button, interactive cards, print/export, financial actions |
| `src/pages/DashboardLaboratory.tsx` | Wire sample/result click handlers |
| `src/components/finance/InvoiceDetailsSheet.tsx` | Full actions, enriched labels, mark as paid, delete |
| `src/components/finance/InvoiceCard.tsx` | Wire edit/delete actions properly |
| `src/pages/DashboardFinance.tsx` | Fix RTL layout (remove flex-row-reverse) |
| `src/i18n/locales/ar.ts` | Wizard steps, filters, permissions, report labels |
| `src/i18n/locales/en.ts` | Wizard steps, filters, permissions, report labels |
| 12+ files | Replace local formatCurrency with centralized import |

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

- [ ] Edit button visible for owner/manager
- [ ] Edit button hidden for non-permitted users
- [ ] Edit dialog opens and saves correctly
- [ ] Sample cards clickable → opens sample details sheet
- [ ] Result cards clickable → opens result preview dialog
- [ ] Financial tab totals use EN digits
- [ ] Invoice cards show actions based on permissions
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
- [ ] Edit invoice → InvoiceFormDialog opens in edit mode
- [ ] Edit invoice → Save updates invoice and items
- [ ] Delete invoice → Confirmation dialog appears
- [ ] Delete invoice → Invoice is deleted, list refreshes
- [ ] Mark as Paid → Payment method dialog appears
- [ ] Mark as Paid → Invoice status updates to 'paid'
- [ ] Mark as Paid → payment_received_at is set
- [ ] Download PDF → PDF downloads correctly
- [ ] Print → Print dialog opens

#### Invoice Line Items
- [ ] lab_sample items show "#daily_number" or physical_sample_id
- [ ] NO UUID fragments visible
- [ ] Layout is readable (no overflow, proper wrapping)
- [ ] Amounts use EN digits

### Number Formatting (EN Digits)

- [ ] All amounts show 0-9 digits even in Arabic UI
- [ ] All dates show 0-9 digits even in Arabic UI
- [ ] Invoice numbers show 0-9 digits
- [ ] Sample daily numbers show 0-9 digits
- [ ] Lab horse profile financial cards: EN digits
- [ ] Invoice details sheet: EN digits
- [ ] Invoices list: EN digits
- [ ] Client outstanding: EN digits

### Permissions

- [ ] Users without `laboratory.horses.edit` cannot see Edit button
- [ ] Users without `finance.invoice.delete` cannot see Delete option
- [ ] Users without `finance.invoice.markPaid` cannot see Mark as Paid button
- [ ] Owner bypasses all permission checks
- [ ] Manager with permissions can perform actions
- [ ] Member without permissions cannot perform actions

---

## IMPLEMENTATION ORDER

1. **Phase 3:** Create `src/lib/formatters.ts` (no dependencies)
2. **Phase 2.3:** Fix Finance RTL layout (quick fix)
3. **Phase 1:** Wizard redesign (core functionality)
4. **Phase 2:** Finance fixes (parallel with Phase 1)
5. **Phase 4:** Lab Horses list improvements
6. **Phase 5:** Lab Horse profile improvements
7. **Phase 6:** Client/Owner linkage (evidence check first)
8. **Phase 7:** Permissions audit and enforcement (throughout)

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

- Invoice items enrichment uses batch query (NOT N+1)
- Lab horses metrics use aggregated query hook
- Sorting is client-side for reasonable list sizes

---

## DEFINITION OF DONE

A phase is complete when:
1. All code changes implemented
2. All translations added (ar/en)
3. All permission checks enforced (UI + RLS if applicable)
4. Manual test checklist items for that phase pass
5. No console errors in preview
6. No regressions in existing functionality
