# Stage C — Read-Path Cutover Investigative Audit (Prompt 37)

Read-only. No repository, database, migration, financial, source or test writes occurred.

## A. Verdicts

- Scope: STAGE-C INVESTIGATIVE NON-REOPENING SCOPE PRESERVED
- Repository: STAGE-C CURRENT REPOSITORY READ PATHS MAPPED
- Database: STAGE-C DATABASE READ OBJECTS MAPPED
- Statements: ACCOUNT-STATEMENT DATE SEMANTICS DETERMINED
- Surfaces: FINANCIAL READ-SURFACE MATRIX COMPLETE
- Exports: SCREEN-PDF-CSV-PRINT DATE PARITY MAPPED
- NULL: EFFECTIVE-DATE NULL AND FALLBACK BEHAVIOR DETERMINED
- Ordering: DETERMINISTIC FINANCIAL ORDERING CONTRACT PROPOSED
- Filters: FINANCIAL DATE-FILTER BOUNDARIES DETERMINED
- Permissions: STAGE-C TENANT AND PERMISSION DEPENDENCIES MAPPED
- Performance: STAGE-C INDEX AND PERFORMANCE READINESS ASSESSED
- Contract: STAGE-C CANONICAL READ-DATE CONTRACT READY FOR OWNER ALIGNMENT
- Execution readiness: STAGE-C EXECUTION WORK PACKAGES READY FOR OWNER ALIGNMENT
- Writes: ZERO REPOSITORY AND DATABASE WRITE CONFIRMED
- Final: STAGE-C INVESTIGATIVE AUDIT COMPLETE — OWNER ALIGNMENT REQUIRED (one genuine fork, Section U)

## B. Preflight

- Branch: `edit/edt-be21da2e-cf56-4952-93de-b7cc629fa05a`
- HEAD: `7963d2a07336407e62c71e0823db2ee11bec9591`
- Parent: `e03ea17823d3a4cb18f3092e1b089a7184e6195e` (Prompt-36 governance persistence)
- Working tree: clean; zero staged, unstaged or untracked paths
- Latest commits touching finance read paths: `08acaffe`, `d5112d5a`, `8950f53c` (2026-08-04); no RM-DH-003 governance commit touches `src/`

## C. Core facts (live evidence)

FACT 1 — `ledger_entries` has `effective_date date NULL`; live rows: 88 total, 0 NULL, and 27 rows (30.7%) where `effective_date <> (created_at AT TIME ZONE 'Asia/Riyadh')::date`. Stage C is therefore a real behavioural change, not a no-op.

FACT 2 — `src/hooks/clients/useClientStatement.ts` selects `created_at` (not `effective_date`), orders by `created_at ASC`, and filters `gte/lte created_at` (lines 49–62). `StatementEntry.date = e.created_at` (line ~99).

FACT 3 — `src/lib/finance/effectiveDate.ts` documents `effectiveDate(row) = ledger_entries.created_at` as the canonical contract. This file is the single documented contract point and must be re-specified in Stage C.

FACT 4 — Opening balance is derived from the first in-range row (`balance_after - amount`), not from a pre-range cutoff query. When ordering changes to `effective_date`, "first row" changes, so opening balance changes with it.

FACT 5 — Running balance is displayed from the stored `balance_after` column, which Stage A recomputed in `created_at` sequence. Reordering rows by `effective_date` without re-deriving the displayed running balance produces a non-monotonic balance column. This is the single largest Stage-C correctness risk.

FACT 6 — `get_client_first_financial_activity` (SECURITY DEFINER, `clients.statement.view` gated) returns `MIN(le.created_at)` and future-guards on `created_at <= now()`. Database change required.

FACT 7 — `v_customer_ledger_balances` aggregates `sum(amount)` (date-independent, correct) plus `max(created_at) AS last_entry_at` (audit-only label). No cutover needed except if `last_entry_at` is surfaced as an economic date.

FACT 8 — `useLedger.ts:78` orders ledger lists by `created_at DESC`; `useFinancialEntries.ts:88` by `created_at DESC`; `useUnallocatedPayments.ts:72-76` orders and filters by `created_at`.

FACT 9 — Already correct: `useInvoicePayments.ts:121-122` orders `effective_date ASC, created_at ASC` (the existing deterministic pattern to reuse); `useExpenses.ts:51` orders by `expense_date DESC` (business date); `useEligibleClientInvoices.ts:66-68` orders `due_date, issue_date, invoice_number`.

FACT 10 — `useInvoices.ts:78` orders invoice lists by `created_at DESC` while `invoices` has a business `issue_date NOT NULL` and index `idx_invoices_tenant_status (tenant_id, status, issue_date)`.

FACT 11 — Statement Screen, Print and CSV all consume the same in-memory `entries[]` (`ClientStatementTab.tsx` sort at 807-812; `StatementPrintUtils.ts` uses `e.date` at 149/313/369/441). Parity is structurally guaranteed — fixing the hook fixes all four surfaces at once.

FACT 12 — Screen renders `formatDateTime12h(e.date)` (lines 1283/1322) and `formatDate(row.entry.date,'dd-MM-yyyy')` (1384–1458); Print/CSV render date-only in one path and time-of-day in another (`formatTimeForPrint`, 369/441). A date-only `effective_date` makes any time-of-day rendering meaningless.

FACT 13 — Index `ledger_entries_effective_composite_idx (tenant_id, client_id, effective_date, created_at, id)` already exists and exactly matches the proposed ordering — no Stage-C index work required. `idx_ledger_entries_tenant_effective_date` also exists.

INFERENCE — Because `effective_date` is `date` and `created_at` is `timestamptz`, the current local-day→UTC boundary helpers (`localDateFromToUtcIso` / `localDateToToUtcIso`) become wrong for a date column and must be replaced by plain `yyyy-MM-dd` comparisons.

GAP — Historical rows predating Stage A in other tenants were not re-verified (out of scope; Stage A closed). No contradiction affecting Stage C was found.

## D. Date-semantics matrix

| Surface | Path | Query/RPC | Display | Filter | Sort | Export | Status | Stage-C action |
|---|---|---|---|---|---|---|---|---|
| Client Statement | `useClientStatement.ts` | `ledger_entries` | created_at | created_at | created_at | same | INCORRECT | cut over to effective_date |
| Statement UI/sort | `ClientStatementTab.tsx:807` | in-memory | entry.date | — | entry.date | — | PARTIAL | inherits hook + add tie-breaker |
| Statement Print/CSV | `StatementPrintUtils.ts` | in-memory | e.date | — | — | e.date | PARTIAL | drop time-of-day rendering |
| First activity | `useClientFirstActivity.ts` | `get_client_first_financial_activity` | created_at | — | — | — | INCORRECT | RPC change (MIN(effective_date)) |
| Opening balance | `useClientStatement.ts` | derived | — | created_at | — | — | INCORRECT | pre-range cutoff by effective_date |
| Running balance | stored `balance_after` | — | — | — | — | — | INCORRECT | re-derive in effective order |
| Ledger list | `useLedger.ts:78` | `ledger_entries` | created_at | — | created_at | — | INCORRECT | order effective_date, created_at, id |
| Unallocated payments | `useUnallocatedPayments.ts:72` | `payment_sessions` | created_at | created_at | created_at | — | INCORRECT | use `payment_date` |
| Financial entries | `useFinancialEntries.ts:88` | `financial_entries` | created_at | — | created_at | — | PARTIAL | confirm business date field |
| Invoice list | `useInvoices.ts:78` | `invoices` | created_at | — | created_at | — | PARTIAL | order by issue_date |
| Invoice detail/PDF | `InvoiceDetailsSheet`, `InvoicePDFGenerator` | invoice + payments | issue/due/effective | — | — | — | CORRECT | none |
| Expenses | `useExpenses.ts:51` | `expenses` | expense_date | expense_date | expense_date | — | CORRECT | none |
| Eligible invoices | `useEligibleClientInvoices.ts` | `invoices` | due/issue | — | due/issue | — | CORRECT | none |
| Balances view | `v_customer_ledger_balances` | view | sum(amount) | — | — | — | CORRECT | none (label only) |
| Supplier payables | `useSupplierPayables.ts:42` | payables | created_at | — | created_at | — | UNKNOWN | classify in Stage C |

## E. Proposed canonical contract

- Economic chronology (`effective_date`): ledger sequencing, statement inclusion, opening-balance cutoff, running-balance order, first activity, financial period grouping, export chronology.
- Document chronology (unchanged): `invoices.issue_date`, `invoices.due_date`, `payment_sessions.payment_date`, `expenses.expense_date`, cancellation date, service date.
- Audit chronology (unchanged, never drives display order): `created_at`, `updated_at`, approval/posting timestamps.
- Deterministic order: `ORDER BY effective_date ASC, created_at ASC, id ASC` (descending lists mirror all three). Backed by the existing composite index.
- Filters: date-only comparisons `effective_date >= :from AND effective_date <= :to` — both bounds inclusive, no UTC conversion, identical in Arabic and English.
- NULL: **Option A (strict)** is viable — live NULL count is 0 and the column is Stage-A governed. No COALESCE fallback.
- Export parity: Screen = PDF = CSV = Print by construction (single in-memory result set); date-only rendering everywhere.

## F. Execution packages (Stage C, not executed)

1. **Canonical contract + helpers** — rewrite `src/lib/finance/effectiveDate.ts` (date-only boundaries, deterministic comparator), retire the two UTC-ISO helpers for financial paths only. No DB work.
2. **Client Statement cutover** — `useClientStatement.ts`: select and order by `effective_date`, date-only filters, pre-range opening-balance query, running balance re-derived client-side from opening + ordered amounts. App-only.
3. **First activity RPC** — new migration replacing `MIN(created_at)` with `MIN(effective_date)` and the future-guard with `effective_date <= current_date`. Signature and permission gates unchanged. DB change required.
4. **Ledger / activity lists** — `useLedger.ts`, `useFinancialEntries.ts`, `useUnallocatedPayments.ts` (→ `payment_date`). App-only.
5. **Invoice list ordering** — `useInvoices.ts` → `issue_date DESC, created_at DESC, id DESC`. App-only, index-backed.
6. **Export/print alignment** — `StatementPrintUtils.ts` date-only rendering; parity assertions.
7. **Tests + QA** — the 20 Section-24 scenarios, focused on: divergent effective/created rows, same-date tie-breaks, opening balance before range, running-balance monotonicity, month/year boundaries, Arabic/English parity, tenant isolation, empty statement, pagination boundary.
8. **Acceptance re-audit + persistence** — after QA.

Tenant/permission scope is unchanged everywhere: all reads stay RLS-governed and `clients.statement.view` gating on the RPC is preserved. No index, RLS or grant changes are required for correctness.

## G. Owner alignment — one genuine fork

**Running-balance authority (FACT 5).**
- Option A — Display-derived: keep `balance_after` as stored audit data; the statement recomputes the running balance in effective order from the opening balance. App-only, reversible, no data writes. **Recommended.**
- Option B — Storage re-sequenced: a Stage-D style migration recomputing `balance_after` in `effective_date` order. Touches accepted Stage-A financial rows and re-enters write territory.

Owner decision is required because Option B would write to Stage-A-accepted financial rows; the audit cannot authorize that.

## H. Status

Stage A closed. Stage B closed. Stage C investigation only — no execution, no persistence. Workstream WS-DH-2026-0003 active, Phase 1 active, Stage D not started, Phases 2–8 not started, no closure. Deferred Items Register (items 1–48) unchanged and carried forward in full.

Recommendation: approve Option A, then issue the Stage-C execution prompt for packages 1–3.
