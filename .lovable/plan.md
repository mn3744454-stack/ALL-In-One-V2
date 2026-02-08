
# Unified Horse Profile (Option C) + Ledger-Derived Balance Implementation Plan

## Current State Summary (Verified)

| Component | Current State | Evidence |
|-----------|---------------|----------|
| **Ledger semantics** | ✅ Correctly signed: invoices = positive, payments = negative | DB query shows `invoice: +580`, `payment: -10` |
| **v_customer_ledger_balances** | ✅ Already created with `security_invoker = on`, using `SUM(amount)` | `pg_get_viewdef` verified |
| **party_horse_links** | ❌ Does NOT exist | `EXISTS` check = false |
| **lab_horses.client_id** | ✅ Column added (Phase 1 migration done) | Column exists in types.ts |
| **lab_horses.owner_email** | ✅ Column added | Column exists in types.ts |
| **useLabHorses clientId filter** | ⚠️ Uses direct `lab_horses.client_id` filter (not junction) | L87-89: `query.eq("client_id", filters.clientId)` |
| **OwnerQuickViewPopover** | ✅ Accepts `ownerEmail` + `clientId` | L15-16, fully wired |
| **LabHorseProfile** | ✅ Passes `horse.owner_email` + `horse.client_id` | L541-545 |
| **GenerateInvoiceDialog** | ✅ Uses `useLedgerBalance` for credit check | L82, L145-146 |

---

## Phase 1: Database — UHP Junction Table + Backfill

### 1.1 Create `party_horse_links` Table

```sql
-- Create the UHP junction table (clean, extensible architecture)
CREATE TABLE IF NOT EXISTS party_horse_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Party reference (clients for MVP; can extend to other party types later)
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Horse reference (lab_horses for lab module MVP)
  lab_horse_id uuid NOT NULL REFERENCES lab_horses(id) ON DELETE CASCADE,
  
  -- Relationship metadata
  relationship_type text NOT NULL CHECK (relationship_type IN 
    ('lab_customer', 'payer', 'owner', 'trainer', 'stable')),
  is_primary boolean NOT NULL DEFAULT false,
  
  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Unique constraint: one link per client+horse+relationship type
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_horse_links_unique
  ON party_horse_links(tenant_id, client_id, lab_horse_id, relationship_type);

-- Index for filtering horses by client (10.1 main use case)
CREATE INDEX IF NOT EXISTS idx_party_horse_links_by_client
  ON party_horse_links(tenant_id, client_id);

-- Index for finding clients for a horse (owner quick view)
CREATE INDEX IF NOT EXISTS idx_party_horse_links_by_lab_horse
  ON party_horse_links(tenant_id, lab_horse_id);

-- Enable RLS
ALTER TABLE party_horse_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tenant-scoped access
CREATE POLICY "Tenant members can view party horse links"
  ON party_horse_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));

CREATE POLICY "Tenant members can create party horse links"
  ON party_horse_links FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));

CREATE POLICY "Tenant members can delete party horse links"
  ON party_horse_links FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));
```

### 1.2 Backfill from Historical Samples

```sql
-- Backfill links from lab_samples (most recent client per lab_horse)
WITH ranked AS (
  SELECT
    ls.tenant_id,
    ls.client_id,
    ls.lab_horse_id,
    ls.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY ls.tenant_id, ls.lab_horse_id
      ORDER BY ls.created_at DESC
    ) AS rn
  FROM lab_samples ls
  WHERE ls.lab_horse_id IS NOT NULL
    AND ls.client_id IS NOT NULL
)
INSERT INTO party_horse_links (tenant_id, client_id, lab_horse_id, relationship_type, is_primary)
SELECT
  r.tenant_id,
  r.client_id,
  r.lab_horse_id,
  'lab_customer',
  true
FROM ranked r
WHERE r.rn = 1
ON CONFLICT (tenant_id, client_id, lab_horse_id, relationship_type) DO NOTHING;
```

### 1.3 Verify Ledger View (Already Done)

The current `v_customer_ledger_balances` view is correct:
- Uses `SUM(amount)` which works since ledger is properly signed
- Has `security_invoker = on` for RLS respect
- No changes needed

---

## Phase 2: Application Changes

### 2.1 New Hook: `usePartyHorseLinks`

**File: `src/hooks/laboratory/usePartyHorseLinks.ts` (NEW)**

Purpose: Fetch and manage party-horse links for filtering and creating new links.

```typescript
// Hook to:
// 1. Fetch lab_horse_ids linked to a specific client
// 2. Create new links when adding horses to a client
// 3. Get primary client for a horse (for owner quick view)

export function usePartyHorseLinks(options: { clientId?: string; labHorseId?: string })
export function useCreatePartyHorseLink()
export function usePrimaryClientForHorse(labHorseId: string)
```

### 2.2 Update `useLabHorses` — Junction-Based Filtering

**File: `src/hooks/laboratory/useLabHorses.ts`**

Current (L87-89):
```typescript
if (filters.clientId) {
  query = query.eq("client_id", filters.clientId);
}
```

Updated approach:
1. When `clientId` is provided, first fetch linked `lab_horse_ids` from `party_horse_links`
2. Then filter `lab_horses` by those IDs
3. This is cleaner than direct column and supports multiple relationship types

### 2.3 Update `LabHorseFormDialog` — Create Link on Horse Creation

**File: `src/components/laboratory/LabHorseFormDialog.tsx`**

After creating a lab horse (L65-76), also insert into `party_horse_links`:

```typescript
// After successful lab_horse insert, if clientId is provided:
if (created && formData.client_id) {
  await supabase.from('party_horse_links').insert({
    tenant_id: tenantId,
    client_id: formData.client_id,
    lab_horse_id: created.id,
    relationship_type: 'lab_customer',
    is_primary: true,
    created_by: user.id
  });
}
```

### 2.4 Update `OwnerQuickViewPopover` — Show Primary Client

**File: `src/components/laboratory/OwnerQuickViewPopover.tsx`**

If `clientId` is passed via junction lookup (not just `lab_horses.client_id`), show "View Client Profile" link. 

The component already supports this (L130-142), just need to ensure we pass the right `clientId` from junction.

### 2.5 Update `LabHorseProfile` — Get Primary Client from Junction

**File: `src/components/laboratory/LabHorseProfile.tsx`**

Add hook call to get primary client for the horse:

```typescript
const { primaryClient } = usePrimaryClientForHorse(horseId);

// Pass to popover:
<OwnerQuickViewPopover 
  ownerName={horse.owner_name} 
  ownerPhone={horse.owner_phone}
  ownerEmail={horse.owner_email}
  clientId={primaryClient?.client_id || horse.client_id} // Prefer junction
>
```

---

## Phase 3: Finance — Ledger as Source of Truth

### Already Verified ✅

1. **`useLedgerBalance` hook** reads from `v_customer_ledger_balances` view
2. **`GenerateInvoiceDialog`** uses `useLedgerBalance` for credit check (L82, L145)
3. **`FinanceCustomerBalances`** page uses `useLedgerBalances` hook

### No changes needed — ledger is already source of truth

---

## Files to Change

| Phase | File | Action | Description |
|-------|------|--------|-------------|
| 1 | DB Migration | CREATE | `party_horse_links` table + RLS + backfill |
| 2 | `src/hooks/laboratory/usePartyHorseLinks.ts` | CREATE | New hook for junction queries |
| 2 | `src/hooks/laboratory/useLabHorses.ts` | UPDATE | Use junction for filtering (L87-89) |
| 2 | `src/components/laboratory/LabHorseFormDialog.tsx` | UPDATE | Insert link after horse creation (L65-76) |
| 2 | `src/components/laboratory/LabHorseProfile.tsx` | UPDATE | Fetch primary client from junction |
| 2 | `src/lib/queryKeys.ts` | UPDATE | Add `partyHorseLinks` key |

---

## Acceptance Tests

### Test 1: 10.1 — Client → Horses Filtering
1. Login → Laboratory → Create Sample
2. Select "Registered Client" → Choose "Sami AL-Hurabi"
3. Go to Horses step
4. **Expected:** Only horses linked to Sami via `party_horse_links` appear (توتو, ابا, Yab, Dragon)
5. Select "No Client" 
6. **Expected:** Horse list is empty + "Add new horse" button visible

### Test 2: New Horse Links to Client
1. Create Sample → Select client "Sami"
2. Click "Register New Horse" → Enter horse name "NewTestHorse"
3. Save
4. **Expected:** `party_horse_links` row created with `client_id = Sami`, `relationship_type = 'lab_customer'`
5. New horse immediately appears in Sami's horse list

### Test 3: Owner Quick View Shows Client Link
1. Navigate to Lab Horse "Yab" profile
2. Click on owner name
3. **Expected:** Popover shows "View Client Profile" button (linked to Sami)

### Test 4: Ledger Balance Source of Truth
1. Check client "Sami" → Finance Customer Balances page
2. **Expected:** Balance matches `SUM(ledger_entries.amount)` for Sami
3. Create invoice for Sami → verify balance updates

### Test 5: Credit Limit Uses Ledger
1. Set client credit_limit = 1000
2. Create invoices until ledger balance = 900
3. Try to create invoice for 200
4. **Expected:** Warning "Will exceed credit limit" + blocked

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Backfill misses some horses | Backfill only creates links where `lab_samples` has both `client_id` AND `lab_horse_id`; new horses will get links via creation flow |
| Multiple clients per horse | Junction supports this; `is_primary = true` identifies the main relationship |
| Performance on large datasets | Indices on `(tenant_id, client_id)` and `(tenant_id, lab_horse_id)` ensure fast lookups |
| Breaking existing flows | Keep `lab_horses.client_id` as optional cached field; junction is source of truth |

---

## Data Migration Impact

**Backfill will create links for:**
- Sami → توتو (lab_customer, primary)
- Sami → ابا (lab_customer, primary)
- Sami → Yab (lab_customer, primary)  
- Sami → Dragon (lab_customer, primary)
- AL-Rashid → Dragon (lab_customer, but NOT primary since Sami's sample is more recent)

*(Based on actual `lab_samples` data verified)*
