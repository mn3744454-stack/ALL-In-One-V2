

# Implementation Plan: Finance Balances + Lab Horse Bridge + Billing Step

## Phase 0 Summary: Current State Verified

| Component | Status | Gap |
|-----------|--------|-----|
| Finance Route | ✅ Exists `/dashboard/finance/customer-balances` | Works but uses `customer_balances` table (no sync) |
| Finance Nav | ✅ Correct route + label | N/A |
| Balance Source | ⚠️ `customer_balances` table has no sync trigger | Must create ledger-derived view |
| Lab Horse clientId | ❌ Missing column | Must add `client_id` + `owner_email` to `lab_horses` |
| Billing Step | ❌ Missing horse names + price editing | Must update `CreateSampleDialog.tsx` |
| Owner Popover | ⚠️ Component ready, data not passed | Must update `LabHorseProfile.tsx` + add DB columns |

---

## Phase 1: Create Ledger-Derived Balance View (P0)

### Database Migration

Create a PostgreSQL view that derives customer balances from `ledger_entries`:

```sql
-- Create view for ledger-derived customer balances
CREATE OR REPLACE VIEW v_customer_ledger_balances AS
SELECT 
  le.tenant_id,
  le.client_id,
  COALESCE(SUM(le.amount), 0) as balance,
  MAX(le.created_at) as last_entry_at
FROM ledger_entries le
GROUP BY le.tenant_id, le.client_id;

-- Grant access for authenticated users
GRANT SELECT ON v_customer_ledger_balances TO authenticated;
```

### Hook Updates

**File: `src/hooks/finance/useLedgerBalance.ts`** (NEW)

Create a new hook that reads from the view instead of `customer_balances` table:

```typescript
// Fetch balance from v_customer_ledger_balances view
// Single client: useLedgerBalance(clientId)
// All clients: useLedgerBalances() → Map<clientId, balance>
```

### Files Changed
- **DB Migration**: Create `v_customer_ledger_balances` view
- **Create**: `src/hooks/finance/useLedgerBalance.ts`
- **Update**: `src/hooks/finance/index.ts` (export new hook)
- **Update**: `src/pages/finance/FinanceCustomerBalances.tsx` (use new hook)
- **Update**: `src/components/laboratory/GenerateInvoiceDialog.tsx` (credit limit check)

---

## Phase 2: Lab Horse Client Bridge (P0 - Item 10.1)

### Database Migration

Add `client_id` and `owner_email` columns to `lab_horses`:

```sql
-- Add client_id FK to lab_horses for client-horse filtering
ALTER TABLE lab_horses 
  ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Add owner_email for better owner info
ALTER TABLE lab_horses 
  ADD COLUMN owner_email text;

-- Create index for efficient filtering
CREATE INDEX idx_lab_horses_client_tenant 
  ON lab_horses(tenant_id, client_id) 
  WHERE client_id IS NOT NULL;
```

### Hook Updates

**File: `src/hooks/laboratory/useLabHorses.ts`**

Add `clientId` filter support:

```typescript
interface LabHorseFilters {
  search?: string;
  includeArchived?: boolean;
  clientId?: string;  // NEW: Filter by client
}

// In query:
if (filters.clientId) {
  query = query.eq("client_id", filters.clientId);
}
```

### Component Updates

**File: `src/components/laboratory/LabHorsePicker.tsx`**

Accept `clientId` prop and pass to hook:

```typescript
interface LabHorsePickerProps {
  selectedHorses: SelectedHorse[];
  onHorsesChange: (horses: SelectedHorse[]) => void;
  clientId?: string;  // NEW
  disabled?: boolean;
}

// Use filtered hook:
const { labHorses, loading } = useLabHorses({ 
  search, 
  clientId  // Pass clientId filter
});
```

**File: `src/components/laboratory/CreateSampleDialog.tsx`**

Pass selected client to `LabHorsePicker`:

```typescript
<LabHorsePicker
  selectedHorses={formData.selectedHorses}
  onHorsesChange={handleHorsesChange}
  clientId={formData.clientMode === 'registered' ? formData.client_id : undefined}
  disabled={disabled}
/>
```

### Files Changed
- **DB Migration**: Add `client_id` + `owner_email` to `lab_horses`
- **Update**: `src/hooks/laboratory/useLabHorses.ts`
- **Update**: `src/components/laboratory/LabHorsePicker.tsx`
- **Update**: `src/components/laboratory/CreateSampleDialog.tsx`
- **Update**: `src/components/laboratory/LabHorseFormDialog.tsx` (save client_id when creating)

---

## Phase 3: Billing Step Improvements (P0 - Item 1.1)

### File: `src/components/laboratory/CreateSampleDialog.tsx`

**A) Line Items with Horse Names (L240-256):**

Update `checkoutLineItems` to include horse names:

```typescript
const checkoutLineItems = useMemo((): CheckoutLineItem[] => {
  const selectedTemplates = activeTemplates.filter(t => formData.template_ids.includes(t.id));
  
  if (selectedTemplates.length === 0 || formData.selectedHorses.length === 0) {
    return [];
  }

  // Generate one line item per template × horse combination
  return selectedTemplates.flatMap(template => {
    const pricing = template.pricing as Record<string, unknown> | null;
    const basePrice = pricing?.base_price ?? null;
    
    return formData.selectedHorses.map(horse => {
      const itemKey = `${template.id}-${horse.horse_id}`;
      const overridePrice = priceOverrides[itemKey];
      const unitPrice = overridePrice ?? basePrice;
      
      return {
        id: itemKey,
        description: `${template.name} - ${horse.horse_name}`,
        description_ar: template.name_ar 
          ? `${template.name_ar} - ${horse.horse_name}` 
          : undefined,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice ?? 0,
        entity_type: "lab_template",
        entity_id: template.id,
      };
    });
  });
}, [formData.template_ids, formData.selectedHorses, activeTemplates, priceOverrides]);
```

**B) Add Price Override State:**

```typescript
const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
```

**C) Editable Price Inputs (L1408-1420):**

```typescript
<TableCell className="text-end">
  <Input
    type="number"
    min="0"
    step="0.01"
    className="w-24 text-end"
    value={priceOverrides[item.id] ?? item.unit_price ?? ''}
    onChange={(e) => {
      const value = parseFloat(e.target.value);
      setPriceOverrides(prev => ({
        ...prev,
        [item.id]: isNaN(value) ? 0 : value
      }));
    }}
  />
</TableCell>
```

**D) Record Payment Now Button:**

Add state and button after invoice creation:

```typescript
const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
const [showPaymentDialog, setShowPaymentDialog] = useState(false);

// After successful invoice creation:
{createdInvoiceId && (
  <Button 
    onClick={() => setShowPaymentDialog(true)}
    className="w-full"
  >
    <Receipt className="h-4 w-4 me-2" />
    {t("laboratory.createSample.recordPaymentNow")}
  </Button>
)}

// Add RecordPaymentDialog:
<RecordPaymentDialog
  open={showPaymentDialog}
  onOpenChange={setShowPaymentDialog}
  invoiceId={createdInvoiceId}
  onSuccess={() => {
    setShowPaymentDialog(false);
    onOpenChange(false);
  }}
/>
```

### i18n Keys to Add

```typescript
// ar.ts
recordPaymentNow: "تسجيل دفعة الآن",

// en.ts  
recordPaymentNow: "Record Payment Now",
```

### Files Changed
- **Update**: `src/components/laboratory/CreateSampleDialog.tsx`
- **Update**: `src/i18n/locales/ar.ts`
- **Update**: `src/i18n/locales/en.ts`

---

## Phase 4: Owner Quick View Data (P1 - Item 7.3)

### File: `src/components/laboratory/LabHorseProfile.tsx`

Update popover call to pass email and clientId (L541-548):

```typescript
<OwnerQuickViewPopover 
  ownerName={horse.owner_name} 
  ownerPhone={horse.owner_phone}
  ownerEmail={horse.owner_email}    // NEW
  clientId={horse.client_id}        // NEW
>
  <span className="font-medium">
    {horse.owner_name || horse.owner_phone}
  </span>
</OwnerQuickViewPopover>
```

### File: `src/hooks/laboratory/useLabHorses.ts`

Update `LabHorse` interface to include new fields:

```typescript
export interface LabHorse {
  // ... existing fields
  owner_email: string | null;  // NEW
  client_id: string | null;    // NEW
}
```

### Files Changed
- **Update**: `src/components/laboratory/LabHorseProfile.tsx`
- **Update**: `src/hooks/laboratory/useLabHorses.ts` (interface)
- **Update**: `src/components/laboratory/LabHorseFormDialog.tsx` (email field in form)

---

## Phase 5: Finance Page Enhancements (P1 - Item 5.1)

The page already exists and is functional. Enhancements:

### File: `src/pages/finance/FinanceCustomerBalances.tsx`

**A) Use ledger-derived hook instead of customer_balances:**

```typescript
// Replace:
import { useCustomerBalances } from "@/hooks/finance/useCustomerBalance";

// With:
import { useLedgerBalances } from "@/hooks/finance/useLedgerBalance";
```

**B) Enhanced subtitle for clarity:**

```typescript
<p className="text-sm text-muted-foreground">
  {t("finance.customerBalances.description")}
</p>
```

**C) i18n key update:**

```typescript
// ar.ts
customerBalances: {
  title: "أرصدة العملاء",
  description: "عرض الأرصدة المستخرجة من دفتر الأستاذ وإدارة التحصيل",
  // ...
}
```

### Files Changed
- **Update**: `src/pages/finance/FinanceCustomerBalances.tsx`
- **Update**: `src/i18n/locales/ar.ts`
- **Update**: `src/i18n/locales/en.ts`

---

## Database Migrations Summary

### Migration 1: Ledger Balance View

```sql
-- Create ledger-derived balance view
CREATE OR REPLACE VIEW v_customer_ledger_balances AS
SELECT 
  le.tenant_id,
  le.client_id,
  COALESCE(SUM(le.amount), 0) as balance,
  MAX(le.created_at) as last_entry_at
FROM ledger_entries le
GROUP BY le.tenant_id, le.client_id;

GRANT SELECT ON v_customer_ledger_balances TO authenticated;
```

### Migration 2: Lab Horse Client Bridge

```sql
-- Add client_id and owner_email to lab_horses
ALTER TABLE lab_horses 
  ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN owner_email text;

CREATE INDEX idx_lab_horses_client_tenant 
  ON lab_horses(tenant_id, client_id) 
  WHERE client_id IS NOT NULL;
```

---

## Files Changed Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | DB Migration (view) | CREATE |
| 1 | `src/hooks/finance/useLedgerBalance.ts` | CREATE |
| 1 | `src/hooks/finance/index.ts` | UPDATE |
| 1 | `src/pages/finance/FinanceCustomerBalances.tsx` | UPDATE |
| 1 | `src/components/laboratory/GenerateInvoiceDialog.tsx` | UPDATE |
| 2 | DB Migration (lab_horses columns) | CREATE |
| 2 | `src/hooks/laboratory/useLabHorses.ts` | UPDATE |
| 2 | `src/components/laboratory/LabHorsePicker.tsx` | UPDATE |
| 2 | `src/components/laboratory/CreateSampleDialog.tsx` | UPDATE |
| 2 | `src/components/laboratory/LabHorseFormDialog.tsx` | UPDATE |
| 3 | `src/components/laboratory/CreateSampleDialog.tsx` | UPDATE |
| 3 | `src/i18n/locales/ar.ts` | UPDATE |
| 3 | `src/i18n/locales/en.ts` | UPDATE |
| 4 | `src/components/laboratory/LabHorseProfile.tsx` | UPDATE |

---

## Acceptance Tests

### Test 1: Finance Customer Balances (5.1)
1. Login → Sidebar → Finance → "أرصدة العملاء"
2. **Expected:** Opens `/dashboard/finance/customer-balances`
3. **Expected:** Page title "أرصدة العملاء" with ledger subtitle
4. **Expected:** NO Add/Edit/Delete client buttons
5. **Expected:** Balances derived from ledger (check against known ledger totals)

### Test 2: Ledger-Derived Balance
1. Create a client with credit_limit = 1000
2. Create invoice for 600 SAR → creates ledger entry
3. Open GenerateInvoiceDialog for same client
4. **Expected:** Credit info shows: Limit 1000, Outstanding 600, Available 400
5. Try to create invoice for 500 SAR
6. **Expected:** Warning "Will exceed credit limit" + blocked

### Test 3: Lab Wizard Horse Filtering (10.1)
1. Create Sample → Select "Registered Client" → Choose client "Sami"
2. Go to Horses step
3. **Expected:** Only horses where `lab_horses.client_id = Sami.id` appear
4. Click "Add New Horse" → Create horse "TestHorse"
5. **Expected:** New horse saved with `client_id = Sami.id`
6. Switch to "No Client"
7. **Expected:** Horse list is empty (or shows unlinked horses only)

### Test 4: Billing Step (1.1)
1. Create Sample → Select client → Select 2 horses → Select 1 template
2. Go to Billing step
3. **Expected:** 2 line items: "TemplateName - Horse1" and "TemplateName - Horse2"
4. Change price of first item to 150
5. **Expected:** Total updates to 150 + originalPrice
6. Complete invoice creation
7. **Expected:** "Record Payment Now" button appears
8. Click it
9. **Expected:** RecordPaymentDialog opens with correct invoice

### Test 5: Owner Quick View (7.3)
1. Create lab_horse with: name="TestHorse", owner_email="test@example.com", client_id=(some client)
2. Navigate to Lab Horse Profile
3. Click owner name
4. **Expected:** Popover shows name, phone, email (test@example.com)
5. **Expected:** "View Client Profile" button appears and works

