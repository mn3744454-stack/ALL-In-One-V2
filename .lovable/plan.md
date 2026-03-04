

# Diagnosis: Why Changes Appear Not Applied

## The Core Problem

The changes **were applied to the code files** -- I can confirm by reading them. The `invalidateFinanceQueries` helper exists and is imported in `useInvoices.ts`, `useExpenses.ts`, `useLedger.ts`, `useInvoicePayments.ts`, and `InvoiceDetailsSheet.tsx`. The `formatDateTime12h` function exists. The i18n keys were added. The statement date filter was fixed. The ViewSwitcher was added to ExpensesList.

**However, there are real remaining issues the user is seeing:**

### 1. Realtime Sync Uses WRONG Query Keys

**Root cause:** `useTenantRealtimeSync.ts` (lines 25-28) invalidates keys like `['financial-entries', t]` and `['ledger-balances', t]` for invoices/expenses/ledger changes. But the actual hooks use keys like `['invoices', tenantId]`, `['ledger-entries', tenantId]`, `['expenses', tenantId]`. **These don't match.** So realtime DB changes via Supabase never trigger the correct React Query refetches. The realtime subscription is effectively a no-op for finance data.

### 2. Payment Timeline Uses 24-hour Format (Not AM/PM)

**Root cause:** `InvoiceDetailsSheet.tsx` line 583 still uses `"dd-MM-yyyy HH:mm"` (24h) instead of `"dd-MM-yyyy hh:mm a"` (12h AM/PM).

### 3. Ledger "Enrich" Button Still Visible

**Root cause:** The auto-backfill code exists (lines 260-299 in DashboardFinance.tsx) but the manual button `handleManualBackfill` is still rendered somewhere in the LedgerTab. The user explicitly asked to hide it from normal users.

### 4. Invoices/Expenses Table Alignment Issues (Screenshots 43-44)

**Root cause:** The code has the correct `text-center` and `tabular-nums` classes on cells, but the `<TableHead>` elements for Invoice Number and Client don't have explicit widths, causing them to compress when Paid/Remaining columns take fixed space. The expenses table view likely has similar column width issues.

### 5. Statement Date Filter Works in DB Query But Client-Side Ledger Filter Also Has the Bug

**Root cause:** In `DashboardFinance.tsx` line 324, the ledger tab's client-side filter uses `e.created_at > dateTo + "T23:59:59"` -- this was fixed. But `useClientStatement.ts` was also fixed. Both fixes are present.

### 6. Scope Selector / Statement Content

The scope selector and statement were implemented but the user reports they don't see changes. This is likely because:
- The preview may need a hard refresh after code deployment
- Or specific UI flows weren't tested end-to-end

---

## Execution Plan

### Step 1: Fix Realtime Sync Query Keys (Critical)

**File:** `src/hooks/useTenantRealtimeSync.ts` (lines 25-28)

Change the finance table mappings to use the **actual** query key prefixes:

```
invoices:      (t) => [['invoices', t], ['invoice-payments'], ['invoice-payments-batch'], ['finance-summary']]
invoice_items: (t) => [['invoice-items'], ['invoices', t]]
expenses:      (t) => [['expenses', t], ['finance-summary']]
ledger_entries:(t) => [['ledger-entries', t], ['customer-balances', t], ['client-statement', t], ['invoice-payments'], ['invoice-payments-batch']]
```

This is the single biggest fix -- it's why "no refresh" doesn't work.

### Step 2: Fix Payment Timeline 24h -> 12h AM/PM

**File:** `src/components/finance/InvoiceDetailsSheet.tsx` (line 583)

Change `"dd-MM-yyyy HH:mm"` to `"dd-MM-yyyy hh:mm a"`.

### Step 3: Hide Backfill Button from Non-Admins

**File:** `src/pages/DashboardFinance.tsx`

Ensure the manual backfill button is wrapped in an `isOwner` check and visually hidden (collapsible "Dev Tools" section or removed entirely from main UI).

### Step 4: Stabilize Invoice Table Column Widths

**File:** `src/components/finance/InvoicesList.tsx`

Add `min-w-[120px]` to client column, ensure no column wraps text to multiple lines by adding `whitespace-nowrap` where appropriate.

### Step 5: Fix Expenses Table View Alignment

**File:** `src/components/finance/ExpensesList.tsx`

Ensure the table view (if it exists) has the same alignment standard as invoices: numeric columns centered, fixed widths, `tabular-nums`, `dir="ltr"`.

### Verification Checklist

1. Create invoice -> Ledger updates immediately (realtime keys now match)
2. Record payment -> Paid/Remaining updates immediately
3. Payment timeline shows 12h AM/PM format
4. No "Enrich" button visible to normal users
5. Invoice table columns don't wrap/crowd
6. Expenses table aligned correctly

