# PROMPT 42 — STAGE-C SLICE-B COMBINED INDEPENDENT QA AND CONDITIONAL ACCEPTANCE RE-AUDIT

## A. Executive Verdicts

- PROMPT 42 SUBMITTED — RUN — CONSUMED
- STAGE-C SLICE-B READ-ONLY COMBINED QA SCOPE PRESERVED
- PROMPT-41 IMPLEMENTATION LINEAGE AND AGGREGATE DIFF VERIFIED
- CUSTOMER-LEVEL ACTIVITY EFFECTIVE-DATE CONTRACT PROVEN
- CUSTOMER-LEVEL ACTIVITY EFFECTIVE-DATE QA PASSED
- LEDGER EFFECTIVE-DATE LIST QA FAILED (screen correct; Print/CSV render a fabricated time)
- INVOICE ISSUE-DATE LIST QA PASSED
- SLICE-B BUSINESS-DATE RENDERING OR PARITY FAILED
- SLICE-B TARGETED QA TESTS PASSED
- SLICE-A REGRESSION QA PASSED
- SLICE-B TYPECHECK QA PASSED
- SLICE-B BUILD QA PASSED
- SLICE-B ZERO-REGRESSION QA PASSED
- SLICE-B RESIDUALS CORRECTLY CLASSIFIED
- Acceptance lanes NOT ENTERED (conditional gate not met): SLICE-B BUSINESS-DATE CORRECTNESS NOT ACCEPTED
- ZERO REPOSITORY AND DATABASE WRITE CONFIRMED
- STAGE A, STAGE B AND SLICE A REMAINED CLOSED
- **STAGE-C SLICE-B COMBINED QA FAILED — TARGETED CORRECTION REQUIRED**

## B. Complete Roadmap

RM-DH-004 Phase 1 (Economic Date Integrity) ACTIVE — Stage A CLOSED, Stage B CLOSED, Stage C ACTIVE (Slice A accepted/closed, Slice B in QA), Stage D NOT STARTED. Phases 2–8 NOT STARTED.

## C. Preflight and Prompt-41 Lineage

- Branch: `edit/edt-71765b44-6c90-4180-8434-5906a84c0618`
- HEAD: `fd7f0e0ab2a045d21be20ccbbf52add90f12a7cd` (merge)
- HEAD parents: `d8c890cb717fefea1797c7decf480fc9643c767d` and `49cee729ac2a15e5e646de204250f8e060ce4665`
- Working Tree: clean before and after (`git status --porcelain` empty)
- Reported chain gap resolved: Prompt-41 work is a linear chain from the pre-HEAD —
  `d8c890cb…` → `fdfc9515d83c0d543ebe8b4dafc7cd19d08acf61` → `c4714b4c26399133707a7037361da3d2c9eee077` → `c48d9c4379a0314fe8ffd70743249722ecfc3ead` → `5a3f574f02961273e3086937f9654c8edd9f18b9` → `863060a157c174dbd0bff6673bded3949fbf0cd3` → `2b78c925d4b78dfe5ba32ac0963de127affae658` → `187a94d6111e2d7aed4cb5bd72939a1ea2401067` → `c8377c831bc10e72da5a8fd8f36b9dd981c07e6a` → `cd7f11f7a1f4a12fb456e437e439444732ae43c5` → `49cee729ac2a15e5e646de204250f8e060ce4665`, then merged into `fd7f0e0a…`. The reported "first substantive commit" `c8377c83…` is mid-chain, not a detached root.
- Aggregate diff `d8c890cb…` → `49cee729…`: exactly the 7 allowlisted paths, 278 insertions / 30 deletions.
- Post-execution drift: `git diff 49cee729… HEAD` is empty → NO SLICE-B POST-EXECUTION DRIFT.

## D. Evidence Boundary

Facts: Git lineage, file contents, test/typecheck/build output, live read-only SQL. Prompt-41 claims verified independently. Gap: no interactive browser preview was used; rendering was verified structurally from code and formatter behavior, not visually.

## E. Customer-Level Activity QA

`src/hooks/clients/useUnallocatedPayments.ts` queries `ledger_entries` only — no `payment_sessions` reference. Selects `effective_date` plus `created_at` (documented as audit/tie-break). Filters `gte/lte` on `effective_date` via `toEconomicDateString` (inclusive, date-only, no UTC window helper). Order: `effective_date` DESC, `created_at` DESC, `id` DESC. Tenant and client scoping preserved; `invoice_cancellation` exclusion and `customer_level` / `unresolved_legacy` classification unchanged; amount/reference semantics unchanged; no write path. `ClientStatementTab.tsx` renders `formatEconomicDate(e.date)` in both table and mobile blocks. Live evidence: 27 of 88 `ledger_entries` rows have `effective_date` differing from the Riyadh-local `created_at` date (e.g. `1147284a…` effective 2026-07-25 vs created 2026-07-27), so the change is observable.

## F. Ledger QA

`useLedger.ts` selects `effective_date, created_at` and orders `effective_date` DESC, `created_at` DESC, `id` DESC; hook remains read-only. `DashboardFinance.tsx` Ledger and Payments tabs filter on date-only inclusive `effective_date` bounds (the previous `+ "T23:59:59"` construction is gone) and re-sort in memory with `compareEconomicOrder(..., "desc")` on the same three keys. Screen cells render `formatEconomicDate(entry.effective_date)`. Amounts, sign, type, description, `balance_after`, tenant scope and permissions unchanged.

**Defect (blocking):** `handlePrint` and `handleExportCSV` in both tabs pass `toEconomicDateString(e.effective_date)` (a date-only string) into `printLedgerEntries` / `exportLedgerCSV` in `src/components/clients/StatementPrintUtils.ts`, which format that field with `formatTimeForPrint` → `formatStandardDateTime`, emitting `dd-MM-yyyy hh:mm AM/PM`. A date-only value therefore prints a fabricated `12:00 AM` UTC-parsed time (rendered `03:00 صباحاً` at UTC+03:00), so Print/CSV do not match the screen's date-only economic date. The Slice-A Client Statement print path is unaffected — it uses `formatDateForPrint` → `formatEconomicDate`.

## G. Invoice-List QA

`useInvoices.ts` orders `issue_date` DESC, `created_at` DESC, `id` DESC; tenant and status filters unchanged. `InvoicesList.tsx` renders `formatEconomicDate(invoice.issue_date)` (no `new Date()` parse, no UTC shift). `due_date` untouched: `InvoiceCard.tsx` still renders it and `supabase/functions/mark-overdue-invoices` still keys overdue on `due_date`. No invoice detail, PDF, approval, cancellation, allocation or write-RPC file appears in the aggregate diff.

## H. Rendering and Structural Parity

Screen surfaces on all three paths render date-only via `formatEconomicDate`, language-agnostic with Western digits and no UTC day shift. No preview session was used — this is a structural verification, not a visual one. Parity fails only for the Ledger/Payments Print and CSV exports described in §F.

## I. Tests, Typecheck and Build

| Command | Result |
|---|---|
| `bunx vitest run src/lib/finance/__tests__/stageCSliceBReadPathCutover.test.ts` | 1 file, 24 tests passed, exit 0 |
| `bunx vitest run src/lib/finance/__tests__/stageCEconomicDateContract.test.ts` | 1 file, 14 tests passed, exit 0 |
| `bunx vitest run src/lib/finance` | 13 files, 241 tests passed, exit 0 |
| `tsgo --noEmit -p tsconfig.app.json` | exit 0, no diagnostics |
| `bun run build` | exit 0, built in 32.41s; pre-existing warnings only (chunk >500 kB, sonner dynamic/static import, stale caniuse-lite) |

Note: the targeted suite asserts screen-level formatting only; it contains no assertion covering the Ledger/Payments Print or CSV date, which is why the defect passed Prompt-41 self-verification.

## J. Zero Regression

Repository substantive writes: ZERO (working tree clean, no commit). Database writes: ZERO. Migration writes: ZERO. Financial-row writes: ZERO. No `balance_after` or `effective_date` data change, no posting/expense/supplier-payable change, no RLS/Grant/index/schema change, no Stable Contract or Emergency Rollback change. Stage A and Stage B remain closed; Slice A remains accepted and closed; Stage D not started. Only read-only SQL (`count`, sample select) was executed.

## K. Residual Classification

Genuine remaining Stage-C work (non-blocking): dedicated `payment_sessions` surface discovery for `payment_date`; `financial_entries` business-date classification; Supplier Payables business-date classification; remaining dashboards/KPIs; remaining exports and reports; interactive browser preview. The `ledger_entries`-based Customer-level Activity path is NOT a residual — its contract is proven.

## L. Acceptance Lanes

Not entered. The Acceptance Re-Audit is conditional on all QA lanes passing; Lane B and the rendering/parity lane failed, so no acceptance verdict is issued beyond `SLICE-B BUSINESS-DATE CORRECTNESS NOT ACCEPTED`.

## M. Blocking Findings

1. Ledger tab and Payments tab Print/CSV exports render a fabricated time on a date-only economic date and therefore break Screen/Print/CSV parity (`src/pages/DashboardFinance.tsx` → `printLedgerEntries` / `exportLedgerCSV` in `src/components/clients/StatementPrintUtils.ts`).

## N. Final Result

**STAGE-C SLICE-B COMBINED QA FAILED — TARGETED CORRECTION REQUIRED**

## O. Owner Decision Required

Approve a minimal, presentation-only Slice-B correction that makes the Ledger and Payments Print/CSV exports render the same date-only economic date as the screen, followed by a re-run of the QA and Acceptance Re-Audit. No data, RPC or schema change is involved.

## P. One Recommendation

Authorize a targeted Slice-B correction prompt that renders the Ledger/Payments Print and CSV date via the economic date-only formatter and adds a direct export-parity assertion to the Slice-B test file.

## Q. Workstream Persistence

Stage A closed; Stage B closed; Slice A accepted and closed; Slice B implemented but combined QA FAILED with one blocking presentation defect; Owner Acceptance pending and not granted; Stage C active; no Closure.

## R. Roadmap Impact

Phase 1 active; Stage C active; Stage D not started; Phases 2–8 not started; no advancement, no Closure.

## S. Deferred Items Register

Items 1–15 promoted to Prompt 42 were executed. Items 16–30 remain blocked pending a passing QA result, with one addition: **30a. Ledger/Payments Print and CSV economic-date parity correction (blocking Slice-B acceptance).** Items 31–50 remain deferred and tracked, unchanged. No item was dropped.

## T. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only. 2. PROMPT-42 — SUBMITTED — RUN — CONSUMED. 3. Prepared 05-08-2026 10:37 Asia/Riyadh. 4. Run start 10:42, end 10:47, report 10:47 Asia/Riyadh (approximate; exact time not recorded). 5. Branch and HEAD per §C. 6. Working Tree clean before and after. 7–10. Per §C; no post-execution drift. 11. Paths inspected: the 7 allowlisted paths plus `StatementPrintUtils.ts`, `displayHelpers.ts`, `formatters.ts`, `effectiveDate.ts`, `InvoiceCard.tsx`, `mark-overdue-invoices/index.ts`. 12. Two read-only SQL queries on `ledger_entries`. 13–16. Cases per §E–§H. 17–19. Per §I. 20. Temporary artifacts: `dist/` build output only (ignored, uncommitted). 21–24. Repository, database, migration and financial-row writes: ZERO. 25. Stage A CLOSED. 26. Stage B CLOSED. 27. Slice A ACCEPTED — CLOSED. 28. Slice B: combined QA FAILED — targeted correction required. 29. Owner Acceptance NOT YET GIVEN. 30. Stage C ACTIVE. 31. Stage D NOT STARTED. 32. Phase advancement NONE. 33. Closure NONE. 34. Stopping point: immediately after the combined QA result; no repair, no persistence, no acceptance. 35. Recommendation per §P. 36. Next: Prompt 43 — Slice-B Targeted Correction Execution (Execution Mode).
