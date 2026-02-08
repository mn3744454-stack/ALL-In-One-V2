
# Zero-Tech-Debt UHP Implementation Plan

## Summary

This plan implements a clean, production-ready Unified Horse Profile architecture with:
- DB-enforced single-primary links via RPC + partial unique index
- Junction-only source of truth (no legacy fallbacks)
- Complete billing step improvements with editable prices and payment recording
- Mobile-optimized clients page

---

## Phase A: Database Migration

### A.1 Create `set_primary_party_horse_link` RPC Function

Create a PostgreSQL function that:
1. **Validates authorization** using `auth.uid()` against `tenant_members`
2. **Atomically clears** existing primary links for the same `(tenant_id, lab_horse_id, relationship_type)`
3. **Upserts** the target link as primary
4. Returns the upserted row

### A.2 Add Partial Unique Index for Primary Enforcement

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_horse_links_one_primary
  ON party_horse_links(tenant_id, lab_horse_id, relationship_type)
  WHERE is_primary = true;
```

This ensures the database itself prevents multiple primary links per horse/relationship type.

### Complete Migration SQL

```sql
-- ============================================================
-- Phase A: Single-Primary Enforcement + RPC Function
-- ============================================================

-- A.2: Partial unique index to enforce single primary per horse/relationship
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_horse_links_one_primary
  ON party_horse_links(tenant_id, lab_horse_id, relationship_type)
  WHERE is_primary = true;

-- A.1: RPC function with built-in authorization
CREATE OR REPLACE FUNCTION public.set_primary_party_horse_link(
  p_tenant_id uuid,
  p_client_id uuid,
  p_lab_horse_id uuid,
  p_relationship_type text DEFAULT 'lab_customer',
  p_created_by uuid DEFAULT NULL
)
RETURNS party_horse_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result party_horse_links;
  v_user_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Authorization check: user must be an active tenant member
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = v_user_id
      AND tm.is_active = true
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: User is not an active member of this tenant';
  END IF;

  -- Step 1: Clear existing primary for this tenant + horse + relationship
  UPDATE party_horse_links
  SET is_primary = false
  WHERE tenant_id = p_tenant_id
    AND lab_horse_id = p_lab_horse_id
    AND relationship_type = p_relationship_type
    AND is_primary = true;

  -- Step 2: Upsert the target link as primary
  INSERT INTO party_horse_links (
    tenant_id, client_id, lab_horse_id, relationship_type, is_primary, created_by
  )
  VALUES (
    p_tenant_id, p_client_id, p_lab_horse_id, p_relationship_type, true, 
    COALESCE(p_created_by, v_user_id)
  )
  ON CONFLICT (tenant_id, client_id, lab_horse_id, relationship_type)
  DO UPDATE SET
    is_primary = true,
    created_by = COALESCE(EXCLUDED.created_by, party_horse_links.created_by)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.set_primary_party_horse_link TO authenticated;
```

---

## Phase B: Application Changes

### B.1 Update `usePartyHorseLinks.ts`

Replace raw insert mutation with RPC call:

```typescript
// Current (raw insert):
const { data: link, error } = await supabase
  .from("party_horse_links")
  .insert({...})

// New (RPC call):
const { data: link, error } = await supabase
  .rpc("set_primary_party_horse_link", {
    p_tenant_id: tenantId,
    p_client_id: data.client_id,
    p_lab_horse_id: data.lab_horse_id,
    p_relationship_type: data.relationship_type,
    p_created_by: user.id,
  });
```

Key changes:
- Remove duplicate constraint suppression (RPC handles it)
- Add success/error toast notifications
- Add smoke test comments

### B.2 Update `LabHorseFormDialog.tsx`

- Use updated hook (already calls `useCreatePartyHorseLink`)
- Add explicit toast for link creation success/failure
- Add smoke test comment

### B.3 Update `LabHorseProfile.tsx` - Remove Legacy Fallback

**Current (L549):**
```typescript
clientId={primaryClient?.id || horse.client_id}
```

**New:**
```typescript
clientId={primaryClient?.id}
```

Also update the UI to show "Not linked to client" when `primaryClient` is null instead of silently falling back.

---

## Phase C: Feature Completion

### C.1 Billing Step Improvements (`CreateSampleDialog.tsx`)

#### C.1.1 Template × Horse Line Items

Update `checkoutLineItems` memo to generate per-horse items:

```typescript
// For each template and each horse, create a line item
const items: CheckoutLineItem[] = [];
for (const template of selectedTemplates) {
  for (const horse of formData.selectedHorses) {
    items.push({
      id: `${template.id}:${horse.horse_id || horse.horse_name}`,
      description: `${template.name} - ${horse.horse_name}`,
      description_ar: template.name_ar 
        ? `${template.name_ar} - ${horse.horse_name}` 
        : undefined,
      quantity: 1,
      unit_price: basePrice,
      // ...
    });
  }
}
```

#### C.1.2 Editable Prices State

Add state for custom prices:

```typescript
const [billingPrices, setBillingPrices] = useState<Record<string, number>>({});
```

Update billing step table to use Input for prices:

```typescript
<TableCell className="text-end">
  <Input
    type="number"
    min="0"
    step="0.01"
    className="w-24 text-end"
    value={billingPrices[item.id] ?? item.unit_price ?? ''}
    onChange={(e) => setBillingPrices(prev => ({
      ...prev,
      [item.id]: parseFloat(e.target.value) || 0
    }))}
  />
</TableCell>
```

#### C.1.3 "Record Payment Now" Button

Add state for tracking created invoice:

```typescript
const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
```

After invoice creation success, show button and integrate `RecordPaymentDialog`:

```typescript
{createdInvoiceId && (
  <div className="flex flex-col gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
    <div className="flex items-center gap-2 text-success">
      <CheckCircle className="h-5 w-5" />
      <span className="font-medium">{t("laboratory.billing.invoiceCreatedSuccess")}</span>
    </div>
    {canRecordPayment && (
      <Button onClick={() => setPaymentDialogOpen(true)}>
        <CreditCard className="h-4 w-4 me-2" />
        {t("laboratory.billing.recordPaymentNow")}
      </Button>
    )}
  </div>
)}

<RecordPaymentDialog
  open={paymentDialogOpen}
  onOpenChange={setPaymentDialogOpen}
  invoiceId={createdInvoiceId}
  onSuccess={() => {
    setPaymentDialogOpen(false);
    onOpenChange(false);
    onSuccess?.();
  }}
/>
```

### C.2 Clients Page Mobile Polish (`DashboardClients.tsx`)

Update the filters section for better mobile layout:

```typescript
{/* Filters - Mobile optimized */}
<div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
  <div className="w-full sm:w-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
    <ClientFilters
      statusFilter={statusFilter}
      onStatusChange={setStatusFilter}
      typeFilter={typeFilter}
      onTypeChange={setTypeFilter}
    />
  </div>
  <div className="flex-shrink-0 flex justify-end sm:justify-start">
    <ViewSwitcher
      viewMode={viewMode}
      gridColumns={gridColumns}
      onViewModeChange={setViewMode}
      onGridColumnsChange={setGridColumns}
      showTable={true}
    />
  </div>
</div>
```

Add horizontal scroll styling with `scrollbar-hide` class for cleaner mobile appearance.

---

## Phase D: Internationalization

### New English Keys (`src/i18n/locales/en.ts`)

```typescript
// In laboratory.toasts section:
horseLinkCreated: "Horse linked to client successfully",
horseLinkFailed: "Failed to link horse to client",

// In laboratory.billing section:
invoiceCreatedSuccess: "Invoice created successfully!",
recordPaymentNow: "Record Payment Now",

// In laboratory.labHorses section:
notLinkedToClient: "Not linked to a client",
```

### New Arabic Keys (`src/i18n/locales/ar.ts`)

```typescript
// In laboratory.toasts section:
horseLinkCreated: "تم ربط الحصان بالعميل بنجاح",
horseLinkFailed: "فشل ربط الحصان بالعميل",

// In laboratory.billing section:
invoiceCreatedSuccess: "تم إنشاء الفاتورة بنجاح!",
recordPaymentNow: "تسجيل الدفع الآن",

// In laboratory.labHorses section:
notLinkedToClient: "غير مرتبط بعميل",
```

---

## Files to Change

| Phase | File | Action | Description |
|-------|------|--------|-------------|
| A | DB Migration | CREATE | RPC function + partial unique index |
| B.1 | `src/hooks/laboratory/usePartyHorseLinks.ts` | UPDATE | Use RPC, add toasts, remove constraint suppression |
| B.2 | `src/components/laboratory/LabHorseFormDialog.tsx` | UPDATE | Add toast for link success/failure |
| B.3 | `src/components/laboratory/LabHorseProfile.tsx` | UPDATE | Remove legacy fallback, show "not linked" state |
| B.3 | `src/components/laboratory/OwnerQuickViewPopover.tsx` | UPDATE | Handle null clientId gracefully |
| C.1 | `src/components/laboratory/CreateSampleDialog.tsx` | UPDATE | Template×Horse items, editable prices, payment button |
| C.2 | `src/pages/DashboardClients.tsx` | UPDATE | Mobile-optimized filter layout |
| D | `src/i18n/locales/en.ts` | UPDATE | Add new translation keys |
| D | `src/i18n/locales/ar.ts` | UPDATE | Add new translation keys |

---

## Smoke Test Checklist

### Test 1: Client → Horse Filtering (10.1)
1. Go to Laboratory → Create Sample
2. Select "Registered Client" → Choose "Sami AL-Hurabi"
3. Proceed to Horses step
4. **Expected**: Only horses linked to Sami appear
5. Go back, select "No Client"
6. **Expected**: Horse list is empty, "Add new horse" visible

### Test 2: New Horse Links to Client
1. In wizard with Sami selected, click "Register New Horse"
2. Enter name "TestHorse456", save
3. **Expected**: Success toast appears
4. **Expected**: New horse appears in Sami's list immediately
5. Query DB: `SELECT * FROM party_horse_links WHERE lab_horse_id = 'new_horse_id'`
6. **Expected**: Row exists with `is_primary = true`, `client_id = Sami's ID`

### Test 3: Owner Quick View (No Legacy Fallback)
1. Navigate to a horse profile that has NO junction link
2. Check owner section
3. **Expected**: No "View Client Profile" button shown
4. **Expected**: Shows "Not linked to a client" text
5. Navigate to a horse WITH junction link
6. **Expected**: "View Client Profile" button appears and links correctly

### Test 4: Primary Link Enforcement
1. Link Horse A to Client X (primary)
2. Link Horse A to Client Y (primary) via wizard
3. Query DB: `SELECT * FROM party_horse_links WHERE lab_horse_id = 'horse_a' AND is_primary = true`
4. **Expected**: Only ONE row with `is_primary = true` (Client Y)
5. **Expected**: Client X row still exists but `is_primary = false`

### Test 5: Billing Step (Template × Horse)
1. Create sample with 2 horses + 2 templates
2. Go to billing step
3. **Expected**: 4 line items (2 templates × 2 horses)
4. **Expected**: Each shows "Template - HorseName"
5. Edit a price value
6. **Expected**: Total updates correctly
7. Toggle "Create Invoice" ON, complete wizard
8. **Expected**: Invoice created with edited prices

### Test 6: Record Payment Now
1. Complete wizard with invoice creation
2. **Expected**: Success message with "Record Payment Now" button
3. Click button
4. **Expected**: RecordPaymentDialog opens with correct invoice
5. Record partial payment
6. **Expected**: Payment recorded successfully

### Test 7: Clients Page Mobile
1. Open clients page on mobile viewport (< 640px)
2. **Expected**: Filters stack vertically, no horizontal overflow
3. **Expected**: Filters container horizontally scrollable if needed
4. **Expected**: ViewSwitcher visible and functional
5. Switch between table/grid views
6. **Expected**: Works correctly on mobile

---

## Technical Notes

1. **RPC Security**: Uses `SECURITY DEFINER` but validates `auth.uid()` internally - this is the recommended pattern for atomic operations that need to bypass RLS temporarily.

2. **No Legacy Fallbacks**: All code paths use junction table exclusively. The `lab_horses.client_id` column remains for potential future migration needs but is never queried.

3. **Partial Index**: The `WHERE is_primary = true` partial unique index is the cleanest way to enforce "at most one primary" at the database level.

4. **Idempotent RPC**: The `ON CONFLICT DO UPDATE` makes the RPC idempotent - calling it multiple times with the same parameters is safe.

5. **Backward Compatibility**: Existing `party_horse_links` rows from backfill remain valid; no data migration needed.


Approve the plan, with 2 mandatory DB changes to keep it truly zero-tech-debt:

1) In the RPC `public.set_primary_party_horse_link`, add a transaction-level advisory lock to prevent race conditions:
   - Use `pg_advisory_xact_lock(...)` keyed by (tenant_id, lab_horse_id, relationship_type).

2) Do not allow arbitrary `p_created_by`:
   - Set `created_by` to `auth.uid()` (or reject if p_created_by != auth.uid()).

Then proceed with the rest of the plan exactly as written:
- Use RPC in usePartyHorseLinks.ts
- Remove legacy fallback in LabHorseProfile.tsx (junction only)
- Implement CreateSampleDialog billing step (Template × Horse, editable prices, Record Payment Now)
- Polish DashboardClients mobile layout
- Add i18n keys + smoke test comments
- Provide final DB SQL + file diffs + smoke test checklist.
