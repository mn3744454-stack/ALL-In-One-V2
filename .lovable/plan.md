

# Execution Plan: Apply Remaining Fixes (P0 + P1)

## Summary of Current State

After thorough code exploration, here are the verified gaps:

### P0 — Functional Gaps

| Item | Current State | Issue |
|------|---------------|-------|
| **5.1** Finance Customer Balances | `navConfig.ts` L241: route = `/dashboard/clients` | Same as main Clients page - NOT a distinct finance page |
| **1.1** Wizard Billing Step | `CreateSampleDialog.tsx` L248: `description: template.name` only | No horse name, no price editing, no "Record Payment Now" |
| **10.1** Horse Selection Logic | `MultiHorseSelector.tsx` L27: `useHorses()` | Loads ALL tenant horses, not filtered by client |

### P1 — Quality Gaps

| Item | Current State | Issue |
|------|---------------|-------|
| **7.3** Owner Quick View | Shows: name, phone, call button only | Missing: email, client link, useful metadata |
| **6.1** Clients Page Polish | Basic layout with ViewSwitcher | Mobile filters may overflow, spacing needs improvement |

---

## Implementation Plan

### Phase 1: P0 Items

---

#### (5.1) Create Distinct Finance Customer Balances Page

**Files to Create:**
- `src/pages/finance/FinanceCustomerBalances.tsx` — New finance-focused page

**Files to Modify:**
- `src/navigation/navConfig.ts` — Change route to `/dashboard/finance/customer-balances`
- `src/App.tsx` — Add route for new page
- `src/pages/finance/index.ts` — Export new page

**Implementation Details:**

```typescript
// FinanceCustomerBalances.tsx
// - Finance-focused view: NO Create/Edit/Delete clients
// - Shows: Client name (localized), phone, ledger balance, credit limit, available credit
// - Actions: View Statement, Record Payment
// - Uses useCustomerBalances() hook for ledger-derived balances
// - Displays balance status badges (positive/negative/zero)
```

**Route Change:**
```typescript
// navConfig.ts L238-242
{
  key: "customer-balances",
  icon: UserCircle,
  labelKey: "finance.customerBalances.title",
  route: "/dashboard/finance/customer-balances",  // Changed from /dashboard/clients
}
```

**Acceptance Test:**
1. Navigate to Finance sidebar → Click "أرصدة العملاء"
2. Opens route `/dashboard/finance/customer-balances`
3. Page shows balance-focused table (no Create/Edit/Delete buttons)
4. Each client row shows: Name, Phone, Balance, Credit Limit, Actions (Statement/Payment)

---

#### (1.1) Wizard Billing Step — Complete Improvements

**Files to Modify:**
- `src/components/laboratory/CreateSampleDialog.tsx`

**Implementation Details:**

1. **Update `checkoutLineItems` (L224-257):**
```typescript
// Include horse name in description
return selectedTemplates.flatMap(template => {
  // Generate one line item per horse per template
  return formData.selectedHorses.map(horse => ({
    id: `${template.id}-${horse.horse_id}`,
    description: `${template.name} - ${horse.horse_name}`,
    description_ar: template.name_ar 
      ? `${template.name_ar} - ${horse.horse_name}` 
      : undefined,
    quantity: 1,  // Changed from horseCount to 1 per horse
    unit_price: priceOverrides[`${template.id}-${horse.horse_id}`] ?? basePrice,
    // ...
  }));
});
```

2. **Add price override state:**
```typescript
const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
```

3. **Add price Input in billing step table (L1408-1420):**
```tsx
<TableCell className="text-end">
  <Input
    type="number"
    className="w-24 text-end"
    value={priceOverrides[item.id] ?? item.unit_price ?? ''}
    onChange={(e) => setPriceOverrides(prev => ({
      ...prev,
      [item.id]: parseFloat(e.target.value) || 0
    }))}
  />
</TableCell>
```

4. **Add "Record Payment Now" after invoice creation:**
```typescript
const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

// After invoice created successfully:
{createdInvoiceId && (
  <Button onClick={() => setShowPaymentDialog(true)}>
    <Receipt className="h-4 w-4 me-2" />
    {t("laboratory.createSample.recordPaymentNow")}
  </Button>
)}

// Add RecordPaymentDialog:
<RecordPaymentDialog
  open={showPaymentDialog}
  onOpenChange={setShowPaymentDialog}
  invoiceId={createdInvoiceId}
  onSuccess={() => { ... }}
/>
```

**i18n Keys to Add:**
```typescript
// ar.ts / en.ts
recordPaymentNow: "تسجيل دفعة الآن" / "Record Payment Now"
```

**Acceptance Test:**
1. Open Create Sample wizard → Select client → Select horses → Select templates
2. Go to Billing step
3. Each line item shows "Template Name - Horse Name"
4. Each line item has editable price input
5. Total updates when prices change
6. After invoice created, "Record Payment Now" button appears

---

#### (10.1) Wizard Horse Selection — Client Filtering

**Files to Modify:**
- `src/hooks/useHorses.ts` — Add clientId filter
- `src/components/laboratory/MultiHorseSelector.tsx` — Accept clientId prop
- `src/components/laboratory/CreateSampleDialog.tsx` — Pass clientId

**Implementation Details:**

1. **Update useHorses hook (add clientId parameter):**
```typescript
interface HorseFilters {
  search?: string;
  gender?: string;
  status?: string;
  breed_id?: string;
  clientId?: string;  // NEW: Filter by client
}

// In query:
if (filters?.clientId) {
  query = query.eq("client_id", filters.clientId);
}
```

2. **Update MultiHorseSelector:**
```typescript
interface MultiHorseSelectorProps {
  // ... existing props
  clientId?: string;  // NEW: Client to filter horses
}

// Use filtered horses:
const { horses, loading } = useHorses({ clientId });
```

3. **In CreateSampleDialog, pass clientId:**
```tsx
<MultiHorseSelector
  clientId={formData.clientMode === 'registered' ? formData.client_id : undefined}
  selectedHorseIds={...}
  onSelectionChange={...}
/>
```

**Acceptance Test:**
1. Create Sample → Select "Existing Client" → Choose client "Sami"
2. Go to Horses step
3. Only Sami's horses appear (or empty if no horses)
4. "Add New Horse" still available
5. Switch to "No Client" → Horses list is empty

---

### Phase 2: P1 Items

---

#### (7.3) Owner Quick View — Add Useful Info

**Files to Modify:**
- `src/components/laboratory/OwnerQuickViewPopover.tsx`

**Implementation Details:**

```typescript
interface OwnerQuickViewPopoverProps {
  ownerName: string | null | undefined;
  ownerPhone: string | null | undefined;
  ownerEmail?: string | null;      // NEW
  clientId?: string | null;        // NEW: Link to client profile
  lastActivityDate?: string | null; // NEW: Optional metadata
  children: React.ReactNode;
  className?: string;
}

// Add to popover content:
{ownerEmail && (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{t("common.email")}</p>
    <a href={`mailto:${ownerEmail}`} className="text-sm text-primary hover:underline">
      {ownerEmail}
    </a>
  </div>
)}

{clientId && (
  <Button variant="outline" size="sm" asChild className="w-full">
    <Link to={`/dashboard/clients?selected=${clientId}`}>
      <ExternalLink className="h-4 w-4 me-2" />
      {t("laboratory.labHorses.viewClientProfile")}
    </Link>
  </Button>
)}

{lastActivityDate && (
  <p className="text-xs text-muted-foreground">
    {t("laboratory.labHorses.lastActivity")}: {format(new Date(lastActivityDate), "dd-MM-yyyy")}
  </p>
)}
```

**Acceptance Test:**
1. Navigate to Lab Horse Profile
2. Click on owner name
3. Popover shows: Name, Phone (with call), Email (if available), "View Client Profile" link (if client exists)

---

#### (6.1) Clients Page Polishing

**Files to Modify:**
- `src/pages/DashboardClients.tsx`
- `src/components/clients/ClientFilters.tsx` (if needed)

**Implementation Details:**

1. **Mobile filters stacking:**
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="w-full sm:w-auto">
    <ClientFilters ... />
  </div>
  <div className="w-full sm:w-auto flex justify-end">
    <ViewSwitcher ... />
  </div>
</div>
```

2. **Search input full-width on mobile:**
```tsx
<div className="relative w-full">
  <Input className="w-full" ... />
</div>
```

3. **Results count and actions spacing:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <span className="text-sm text-muted-foreground">
    {filteredClients.length} {t("clients.title")}
  </span>
</div>
```

4. **Card/table consistent spacing:**
```tsx
<div className="space-y-4 sm:space-y-6">
  {/* Content */}
</div>
```

**Acceptance Test:**
1. Open Clients page on mobile (viewport < 640px)
2. Filters stack vertically, no horizontal overflow
3. Search input is full-width
4. ViewSwitcher is clearly visible
5. On desktop: balanced layout with proper spacing

---

## Files Changed Summary

| Action | File Path |
|--------|-----------|
| **CREATE** | `src/pages/finance/FinanceCustomerBalances.tsx` |
| **MODIFY** | `src/navigation/navConfig.ts` |
| **MODIFY** | `src/App.tsx` |
| **MODIFY** | `src/pages/finance/index.ts` |
| **MODIFY** | `src/components/laboratory/CreateSampleDialog.tsx` |
| **MODIFY** | `src/hooks/useHorses.ts` |
| **MODIFY** | `src/components/laboratory/MultiHorseSelector.tsx` |
| **MODIFY** | `src/components/laboratory/OwnerQuickViewPopover.tsx` |
| **MODIFY** | `src/pages/DashboardClients.tsx` |
| **MODIFY** | `src/i18n/locales/ar.ts` |
| **MODIFY** | `src/i18n/locales/en.ts` |

---

## Verification Checklist

### (5.1) Finance Customer Balances
- [ ] Sidebar → Finance → "أرصدة العملاء" visible
- [ ] Click opens `/dashboard/finance/customer-balances`
- [ ] Page shows balance table (not client management)
- [ ] No Create/Edit/Delete buttons
- [ ] "View Statement" and "Record Payment" actions work

### (1.1) Wizard Billing Step
- [ ] Line items show "Template - Horse Name"
- [ ] Price input per line item (editable)
- [ ] Total recalculates on price change
- [ ] "Record Payment Now" button after invoice creation
- [ ] RecordPaymentDialog opens with correct invoice

### (10.1) Horse Selection by Client
- [ ] Registered client → Only their horses shown
- [ ] New client → Empty horse list
- [ ] No client → Empty horse list
- [ ] "Add New Horse" always available

### (7.3) Owner Quick View
- [ ] Shows name + phone + call button
- [ ] Shows email if available
- [ ] Shows "View Client Profile" link if client exists

### (6.1) Clients Page Polish
- [ ] Mobile: filters stack, no overflow
- [ ] Mobile: search full-width
- [ ] Desktop: balanced layout
- [ ] ViewSwitcher prominent and usable

