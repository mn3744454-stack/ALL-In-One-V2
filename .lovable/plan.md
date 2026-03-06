# Finance Module Platform-Wide Audit Report

---

## 1. Coverage Map

### 1.1 Single Entry Point Architecture

The Finance module uses a **single set of shared components** across ALL tenant types. There are NO tenant-specific duplicates or variants.

| Route | Component | Shared? |

|-------|-----------|---------|

| `/dashboard/finance` | `DashboardFinance` (default tab: invoices) | Yes - all tenants |

| `/dashboard/finance/invoices` | `DashboardFinance` (initialTab="invoices") | Yes |

| `/dashboard/finance/expenses` | `DashboardFinance` (initialTab="expenses") | Yes |

| `/dashboard/finance/ledger` | `DashboardFinance` (initialTab="ledger") | Yes |

| `/dashboard/finance/payments` | `DashboardFinance` (initialTab="payments") **(REQUIRED FIX - see Finding #1)** | Yes (after fix) |

| `/dashboard/finance/pos` | `DashboardFinancePOS` | Yes |

| `/dashboard/finance/categories` | `DashboardFinanceCategories` | Yes |

| `/dashboard/finance/customer-balances` | `FinanceCustomerBalances` | Yes |

**Access gating**: All finance routes require `WorkspaceRouteGuard requiredMode="organization"`. The sidebar shows Finance only for `owner` and `manager` roles (line 436 of DashboardSidebar.tsx).

### 1.2 Modified Components — All Shared

| File | Used By |

|------|---------|

| `src/components/finance/InvoicesList.tsx` | All tenants via InvoicesTab |

| `src/components/finance/ExpensesList.tsx` | All tenants via ExpensesTab |

| `src/components/finance/InvoiceFormDialog.tsx` | All tenants |

| `src/lib/finance/enrichLedgerDescriptions.ts` | LedgerTab + PaymentsTab (inside DashboardFinance) |

| `src/components/finance/LedgerRowPreview.tsx` | LedgerTab + PaymentsTab (inside DashboardFinance) |

| `src/components/ui/dialog.tsx` | Platform-wide primitive |

| `src/components/ui/sheet.tsx` | Platform-wide primitive |

### 1.3 Tenant Types That Access Finance

All 10 tenant types (lab, clinic, stable, horse_owner, pharmacy, transport, auction, academy, trainer, doctor) can access Finance if the user has `owner` or `manager` role. There are NO tenant-type-specific forks.

---

## 2. Runtime Verification Checklist

### A) Ledger Hover Preview Parity

- **How it works**: `LedgerTab` calls `enrichLedgerDescriptions()` on ALL entries, then renders `<LedgerRowPreview>` for each row in both desktop table and mobile stacked views.

- **Enrichment pipeline**: If `reference_id` exists, it ALWAYS proceeds to fetch invoice data (invoice_number, invoice_items, lab_samples, lab_horses). Only short-circuits when `reference_id` is NULL AND description already contains  `|` .

- **Verdict**: Works identically for invoices created from the Invoices page or from lab flow, as long as the invoice has items linked. The enrichment resolves `entity_type="lab_sample"` items to horse/sample names regardless of origin.

### B) Payments "Paid for What"

- **How it works**: `PaymentsTab` (inside DashboardFinance) filters entries to `entry_type="payment"`, then runs the same `enrichLedgerDescriptions()`. The enrichment resolves `reference_id` -> invoice -> invoice_items -> horse/sample.

- **Verdict**: Payment rows show invoice#, items, horse/sample via hover preview — fully functional.

- **CRITICAL GAP**: See Finding #1 — if `/dashboard/finance/payments` still renders `DashboardPayments`, users will NOT see this register. After applying Finding #1 fix, the hover parity is guaranteed.

### C) Invoices/Expenses Table Actions + Header

- **InvoicesList**: Table header has `{t("common.actions")}` column (line 321). Actions column renders `renderInvoiceActions()` with `MoreHorizontal` dropdown. Works for all tenants.

- **ExpensesList**: Table header has `{t("common.actions")}` column (line ~194 in current code, visible in provided file). Actions render via `renderExpenseActions()`. Gated by `canManage` prop.

- **Verdict**: Both have visible localized Actions headers and working dropdown menus.

### D) Grid Mode

- **InvoicesList**: Uses `getGridClass(gridColumns, viewMode)` for grid 2/3/4. Renders `InvoiceCard` components.

- **ExpensesList**: Same pattern with `ExpenseCard` components.

- **Verdict**: Grid logic works. Any remaining tight-layout at 3/4 columns is card layout density, not the grid switcher.

### E) InvoiceFormDialog Interactivity

- **Init guard**: Uses `initializedRef` (useRef) pattern — form initializes ONLY once per dialog open. Prevents reset loops.

- **Client selection**: Uses `useClients()` hook, `client_id` state persists correctly.

- **Line items**: Managed via `useState<LineItem[]>` with `InvoiceLineItemsEditor` component.

- **Verdict**: Correctly implemented with no state-reset loop risk.

### F) Permissions

- **canManage=false**: Expenses "Create" button hidden, action dropdown hidden. No broken layout — the Actions column simply renders nothing.

- **InvoicesList**: Uses granular permissions `finance.invoice.create`, `finance.invoice.edit`, etc.) via `usePermissions()` hook. Actions still render but individual menu items are conditionally shown.

- **Verdict**: Clean degradation when permissions are restricted.

---

## 3. Findings

### Finding #1: CRITICAL — Payments Route Mismatch

- **Tenant/Role**: ALL tenants, owner + manager

- **Route**: `/dashboard/finance/payments`

- **File**: `src/App.tsx` (route block where `/dashboard/finance/payments` is registered)

- **Issue**: The Finance sidebar must lead to the **Finance Payments register** (PaymentsTab inside `DashboardFinance.tsx`) that contains ledger-based payments + enrichment + `LedgerRowPreview`. If `/dashboard/finance/payments` renders `DashboardPayments` (personal payment intents / coming soon), users are sent to the wrong page and the “paid for what?” hover parity is lost.

- **Impact**: Users clicking "Payments" in the Finance sidebar see an unrelated personal payments page instead of the financial payments register.

- **Root cause**: Two separate concepts share the same URL path in routing.

- **Fix strategy** (lowest blast radius, REQUIRED):

  1. Update `/dashboard/finance/payments` to render *`DashboardFinance` with `initialTab="payments"`** (or the Finance wrapper that sets `initialTab` correctly), NOT `DashboardPayments`.

  2. Keep the personal payments page on a non-conflicting path such as `/dashboard/my-payments` (or keep it there if it already exists). Ensure there is no URL collision with Finance.

  3. Confirm Finance sidebar “Payments” item points to `/dashboard/finance/payments` and that this route now loads the Finance payments register.

### Finding #2: MINOR — DashboardFinanceWrapper Missing "payments" Tab

- **File**: `src/pages/finance/DashboardFinanceWrapper.tsx` line 18

- **Issue**: `validTabs` array is `["invoices", "expenses", "ledger"]` — missing `"payments"`. If the wrapper is used for URL-based tab selection, payments could be treated as invalid.

- **Fix**: Add `"payments"` to the `validTabs` array.

### Finding #3: COSMETIC — canManage Uses Role String Comparison

- **File**: `src/pages/DashboardFinance.tsx` line 173

- **Issue**: `canManage = activeRole === "owner" || activeRole === "manager"` uses string comparison rather than RBAC `hasPermission()` pattern used elsewhere.

- **Impact**: Low — only affects tenants with custom roles beyond owner/manager.

- **Fix**: Replace with `hasPermission("finance.expenses.manage")` (ONLY if this permission key already exists). If not, keep current logic and add a TODO comment (do not invent new permissions in this task).

---

## 4. Verdict

**Platform-wide after one CRITICAL routing fix** — the UI/UX improvements are shared across all tenants, but correctness depends on `/dashboard/finance/payments` routing to the Finance PaymentsTab.

### Prioritized Remaining Gaps:

1. **[CRITICAL] Fix `/dashboard/finance/payments` route** to render `DashboardFinance initialTab="payments"` instead of `DashboardPayments`. This is the only functional gap affecting “Payments paid-for-what” hover parity.

2. **[MINOR] Add "payments" to DashboardFinanceWrapper validTabs** to ensure URL-based tab selection works consistently.

3. **[LOW] Standardize canManage to use RBAC permissions** instead of hardcoded role strings for future-proofing with custom roles (only if permission exists).