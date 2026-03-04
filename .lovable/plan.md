

# Account Statement "Story" — Investigation & Implementation Plan

## A. FINDINGS (with evidence)

### 1. Current-State Inventory

| Component | File | Role |
|---|---|---|
| `DashboardClientStatement` | `src/pages/DashboardClientStatement.tsx` | Page wrapper — renders `DashboardSidebar` + hamburger + `ClientStatementTab` |
| `ClientStatementTab` | `src/components/clients/ClientStatementTab.tsx` | Main UI: scope selector trigger, summary cards, desktop table + mobile cards. Description rendered as single `<span className="truncate max-w-[400px]">` (line 374) |
| `StatementScopeSelector` | `src/components/clients/StatementScopeSelector.tsx` | Sheet overlay for date range + horse filter |
| `useClientStatement` | `src/hooks/clients/useClientStatement.ts` | Fetches raw `ledger_entries`, returns `StatementEntry[]` with `description` as raw DB string |
| `enrichLedgerDescriptions` | `src/lib/finance/enrichLedgerDescriptions.ts` | Batch resolves invoice numbers, horses, samples, items — **NOT called by statement** |
| `StatementPrintUtils` | `src/components/clients/StatementPrintUtils.ts` | Print/CSV/PDF — accepts optional `enrichedDescriptions` map but **never receives one** from `ClientStatementTab` (line 214-223) |

### 2. Data Reality Check (DB-confirmed)

**Payments:** 18/18 have `payment_method`. 18/18 have `reference_id`. **100% linkable.**

**Invoices:** 14/14 have `reference_id`. **100% linkable.**

**Multi-horse:** No multi-horse invoices exist in current data, but the schema fully supports it (an invoice can have `invoice_items` pointing to `lab_samples` with different `lab_horse_id`s). Code must handle it.

**`invoice_items`:** All lab items have `entity_type='lab_sample'` and `entity_id` set. Resolution path is confirmed: `reference_id` → `invoices.invoice_number` → `invoice_items` → `lab_samples` → `lab_horses`.

### 3. Gap Analysis

**Current:** Description cell shows raw `entry.description` as a single truncated line with a type badge. No horse info, no sample info, no item breakdown, no multi-line.

**Required:**
- **Invoice row:** Line 1: badge + invoice number. Line 2: horse name(s) + sample label(s). Line 3: item/service names (max 3 + "+N"). Multi-horse: expandable per-horse breakdown.
- **Payment row:** Line 1: badge + payment method + linked invoice number. Line 2: horse context (optional).
- **Other:** Description as-is.

**Enrichment function exists** (`enrichLedgerDescriptions.ts`) but has two problems:
1. Not called from statement at all
2. Returns flat `display` string, not structured data — and only resolves **first horse** (line 164-165: `labSampleItems[0]`)

### 4. i18n Labels (exact locations)

| Key path | Current AR | Required AR | File:line |
|---|---|---|---|
| `clients.statement.debit` | "مدين" | "المبلغ المطلوب" | ar.ts:3048 |
| `clients.statement.credit` | "دائن" | "المبلغ المسدد" | ar.ts:3049 |
| `clients.statement.balance` | "الرصيد" | "الإجمالي بعد الحركة" | ar.ts:3050 |
| `clients.statement.debit` | "Debit" | "Amount Due" | en.ts:3022 |
| `clients.statement.credit` | "Credit" | "Amount Paid" | en.ts:3023 |
| `clients.statement.balance` | "Balance" | "Balance After" | en.ts:3024 |

Also hardcoded in `StatementPrintUtils.ts` lines 78-98 (Arabic strings for print headers).

### 5. Layout Issue

`DashboardClientStatement.tsx` still renders `DashboardSidebar` (line 32-36) and a hamburger menu button (line 44-51). The plan requires a clean full-page view with no sidebar.

---

## B. DECISION

**Option 1: Enrichment in `ClientStatementTab` via a dedicated hook (display-level).**

Justification:
- `useClientStatement` stays lean (raw data fetcher) — single responsibility
- Enrichment is a display concern; a new `useStatementEnrichment(entries)` hook runs after statement loads
- Returns **structured data** (not flat strings) so the UI can render multi-line + expandable sections
- Print/CSV receives the same structured data, converted to strings at export time
- Consistent with how `enrichLedgerDescriptions` is already used in the Ledger tab (display-level)
- Does NOT require DB schema changes or backfills

---

## C. IMPLEMENTATION PLAN (Gates)

### Gate 1: Structured Enrichment Hook

**Files:** New `src/hooks/clients/useStatementEnrichment.ts`

**Edits:**
- Create hook that accepts `StatementEntry[]`, batches all `reference_id`s, fetches `invoices`, `invoice_items`, `lab_samples`, `lab_horses` in parallel
- Returns `Map<entryId, EnrichedStatementData>` where:
```ts
interface EnrichedStatementData {
  invoiceNumber?: string;
  paymentMethod?: string;
  horses: Array<{
    horseId: string;
    horseName: string;      // language-aware (name_ar in RTL, name in LTR)
    samples: Array<{ sampleLabel: string }>;
    items: string[];         // service/item descriptions
  }>;
  itemsSummary: string;     // "CBC, Blood Chemistry (+1 more)"
  isMultiHorse: boolean;
}
```
- Group `invoice_items` by `lab_horse_id` (via `lab_samples`) to support multi-horse correctly
- Use `useQuery` with key `["statement-enrichment", entryIds]`, enabled when entries exist

**Risks:** Extra queries after statement loads. Mitigate: batch all in 4 parallel fetches (invoices, items, samples, horses). Data is small per client.

**Edge cases:** 
- Entry with no `reference_id` → return empty enrichment, UI shows raw description
- Invoice items with no `entity_type='lab_sample'` → show items only, no horse line
- Horse with no `name_ar` → fallback to `name`

### Gate 2: Multi-line Description Cell in `ClientStatementTab`

**Files:** `src/components/clients/ClientStatementTab.tsx`

**Edits:**
- Call `useStatementEnrichment(entries)` after statement loads
- Replace truncated single-line `<span>` (line 370-375) with multi-line cell:
  - Desktop table: `<TableCell>` with stacked lines (badge + invoice number, horse line, items line)
  - Mobile cards: same lines in the card body
- For multi-horse entries: wrap in `<Collapsible>` with a small chevron toggle. Summary shows "Horses: X, Y (+N)". Expanded shows per-horse breakdown.
- Remove `truncate max-w-[400px]` class

**Risks:** Table row height increases. Acceptable — the statement is a detailed report. Numeric columns remain fixed-width and clean.

### Gate 3: i18n Label Updates

**Files:** `src/i18n/locales/en.ts` (line 3022-3024), `src/i18n/locales/ar.ts` (line 3048-3050)

**Edits:**
- `debit` → "Amount Due" / "المبلغ المطلوب"
- `credit` → "Amount Paid" / "المبلغ المسدد"  
- `balance` → "Balance After" / "الإجمالي بعد الحركة"
- Also update `totalDebit`/`totalCredit` summary card labels to match

### Gate 4: Print/CSV Consistency

**Files:** `src/components/clients/StatementPrintUtils.ts`, `src/components/clients/ClientStatementTab.tsx` (printData construction)

**Edits:**
- Pass enriched structured data to print/CSV functions
- Add a `convertEnrichedToString(enriched)` helper that produces multi-line text for print HTML and single-line for CSV
- Update hardcoded Arabic strings in `printStatement()` (lines 78-98) to accept the new terminology via parameters
- Print HTML: use `<br>` for multi-line descriptions within `<td>`
- CSV: use `\n` within quoted cells for multi-line

### Gate 5: Clean Full-Page Layout

**Files:** `src/pages/DashboardClientStatement.tsx`

**Edits:**
- Remove `DashboardSidebar` import and render (lines 8, 32-36)
- Remove hamburger `<Button>` (lines 44-51) and `sidebarOpen` state
- Keep: Back button + client name + title in a simple top bar
- Keep: `MobilePageHeader` for mobile
- Result: full-width content with no sidebar, no hamburger

---

## D. VERIFICATION CHECKLIST

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Invoice with 1 horse, 3 items | Line 1: badge + INV number. Line 2: horse name + sample. Line 3: 3 item names |
| 2 | Invoice with 1 horse, 5 items | Line 3: "CBC, Blood Chem, Urine (+2 more)" |
| 3 | Multi-horse invoice (2 horses) | Summary: "Horses: X, Y". Chevron expands per-horse breakdown |
| 4 | Multi-horse invoice (4 horses) | Summary: "Horses: X, Y (+2 more)". Expandable |
| 5 | Payment with reference_id | Line 1: badge + "Cash" + INV number. Line 2: horse context |
| 6 | Payment without reference_id | Line 1: badge + method only. No horse line |
| 7 | Invoice without lab_sample items | Line 1: badge + INV number. Line 2: item descriptions only, no horse |
| 8 | Manual adjustment | Raw description shown, no enrichment attempted |
| 9 | Arabic RTL | Labels "المبلغ المطلوب" / "المبلغ المسدد" / "الإجمالي بعد الحركة". Horse uses `name_ar`. Text-start alignment |
| 10 | English LTR | Labels "Amount Due" / "Amount Paid" / "Balance After". Horse uses `name` |
| 11 | Print output | Multi-line descriptions in print HTML match on-screen. Labels match |
| 12 | CSV export | Enriched descriptions in CSV. Labels in headers match |
| 13 | Mobile view | Stacked cards with multi-line description. Multi-horse has collapsible section |
| 14 | No sidebar | Statement page has no sidebar or hamburger, full-width content |
| 15 | Back navigation | Back button goes to `/dashboard/clients` |

