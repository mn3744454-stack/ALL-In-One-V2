# PROMPT 45 — STAGE-C REMAINING READ-PATHS SHORT INVESTIGATIVE AUDIT

## A. Executive Verdicts

- PROMPT 45 SUBMITTED — RUN — CONSUMED
- STAGE-C REMAINING READ-PATH INVESTIGATION SCOPE PRESERVED
- ALL REMAINING STAGE-C READ PATHS MAPPED
- NO DEDICATED PAYMENT-SESSIONS READ SURFACE REQUIRES STAGE-C CUTOVER
- FINANCIAL-ENTRIES CONTRACT REQUIRES OWNER ALIGNMENT
- SUPPLIER-PAYABLES DOMAIN CONTRACT DEFERRED
- NO REMAINING DASHBOARD KPI CUTOVER REQUIRED
- REMAINING EXPORT REPORT DATE CONTRACTS DETERMINED
- STAGE-C EXECUTION PACKAGE REQUIRES OWNER ALIGNMENT
- ZERO REPOSITORY AND DATABASE WRITE CONFIRMED
- STAGE A, STAGE B, SLICE A AND SLICE B REMAINED CLOSED
- **STAGE-C REMAINING READ-PATH INVESTIGATION COMPLETE — ONE OWNER DECISION REQUIRED**

## B. Roadmap

RM-DH-004 Phase 1 (Economic Date Integrity) ACTIVE — Stage A CLOSED, Stage B CLOSED, Stage C ACTIVE (Slice A and Slice B accepted and closed; final slice scoped by this audit), Stage D NOT STARTED. Phases 2–8 NOT STARTED.

## C. Preflight

- Branch: `edit/edt-dbed3ec5-3274-4710-9344-57c2d0c57cc5`
- HEAD: `fa153b924035d2318d98bbcd65658b362c3034ef`
- Parents: `4ab8e4c6c5492bbb6d7afa6f2e4e1339fdc83f17` and `d96ccd88a6b0e37273ff2ec223075d94ee6c2f9c`
- Working Tree: clean before and after.

## D. Evidence Boundary

Facts: repository searches over `src/`, direct file reads, and four read-only SQL statements against live schema and data. Database evidence: `payment_sessions` has a real `date` column `payment_date` (29 rows, all populated, 2026-02-05 → 2026-07-27) and 22 of 29 rows have a `payment_date` that differs from the Riyadh calendar date of `created_at`, so the distinction is economically material. `financial_entries` has **no** date column other than `created_at` / `updated_at` (5 rows). `supplier_payables` has only `due_date` plus audit timestamps and currently holds **0 rows**. Inference (labelled): the intended business date for `financial_entries` is the linked source event's own date, because every consumer already resolves `entity_type` + `entity_id` back to `vet_treatments`, `horse_vaccinations`, `breeding_attempts` or `foalings`. Gap: no dedicated column exists to hold it, so the choice between read-time inheritance and a new persisted column is a genuine fork, not a guess. No contradictions with accepted Slice-A/Slice-B contracts.

## E. Complete Read-Surface Matrix

| Surface | Path | Source | Current date display | Current filter | Current sort | Export date | Proven business date | Audit tie-break | Status | Execution action |
|---|---|---|---|---|---|---|---|---|---|---|
| Payment sessions (direct) | — | `payment_sessions` | none | none | none | none | `payment_date` | `created_at`, `id` | DEAD / UNUSED | None — no client read exists |
| Invoice Payment History (drawer) | `src/hooks/finance/useInvoicePayments.ts` | `ledger_entries` | via sheet | invoice scope | `effective_date, created_at` | — | `effective_date` | `created_at` | CORRECT — NO CHANGE (query) | None |
| Invoice Payment History (render) | `src/components/finance/InvoiceDetailsSheet.tsx:1083` | same | `formatStandardDateTime(payment.created_at)` | — | — | — | `effective_date` | `created_at` shown separately | INCORRECT — CUTOVER REQUIRED | Show economic date; keep received-at as a labelled audit value |
| Invoice PDF payment disclosure | `src/lib/finance/fetchInvoicePaymentSummary.ts`, `src/components/finance/InvoicePDFGenerator.tsx:335,364` | `ledger_entries` + allocations | `formatStandardDate(effective_date)` + separate received-at | invoice scope | `effective_date, created_at` | `effective_date` | `effective_date` | `created_at` | INCORRECT — CUTOVER REQUIRED (parsing only) | Replace `formatStandardDate` with `formatEconomicDate` for date-only values |
| Payment allocation reads | `src/hooks/finance/useInvoicePriorAllocations.ts`, `fetchInvoicePaymentSummary.ts` | `payment_allocations`, `payment_horse_allocations` | none (amounts only) | invoice/session | none | none | n/a — amount-only | n/a | CORRECT — NO CHANGE | None |
| Internal Costs tab | `src/components/finance/InternalCostsTab.tsx:270,324` | `financial_entries` | `formatStandardDate(entry.created_at)` | none | `created_at` desc | none | source-event date (unresolved storage) | `created_at`, `id` | UNRESOLVED — OWNER ALIGNMENT REQUIRED | See fork in §M |
| Financial entries hook | `src/hooks/finance/useFinancialEntries.ts:88` | `financial_entries` | — | entity scope | `created_at` desc | — | same as above | `created_at` | UNRESOLVED — OWNER ALIGNMENT REQUIRED | Same fork |
| Financial status chip | `src/components/finance/FinancialStatusSection.tsx` | `financial_entries` + links | no date shown | — | — | — | n/a | n/a | CORRECT — NO CHANGE | None |
| Supplier Payables tab | `src/components/finance/SupplierPayablesTab.tsx:394` | `supplier_payables` | `due_date` only | none | `created_at` desc | none | obligation date column absent | `created_at` | DEFERRED — DOMAIN CONTRACT NOT MATURE | None in Stage C |
| Supplier payable per-source | `src/hooks/billing/useSupplierPayableForSource.ts` | `supplier_payables` | no date selected | source scope | none | none | n/a | n/a | CORRECT — NO CHANGE | None |
| Ledger tab / Payments tab | `src/pages/DashboardFinance.tsx` | `ledger_entries` | `effective_date` | `effective_date` | 3-key | `effective_date` | `effective_date` | `created_at`, `id` | DUPLICATE OF ACCEPTED PATH (Slice B) | None |
| Client Statement, Customer Activity | Slice-A paths | `ledger_entries` | `effective_date` | `effective_date` | 3-key | `effective_date` | `effective_date` | `created_at`, `id` | DUPLICATE OF ACCEPTED PATH (Slice A) | None |
| Invoice lists / eligible invoices | `useInvoices.ts`, `useEligibleClientInvoices.ts` | `invoices` | `issue_date` / `due_date` | issue/due | `due_date, issue_date, invoice_number` | `issue_date` | `issue_date`, `due_date` | `created_at` | CORRECT — NO CHANGE | None |
| Expenses list | `src/components/finance/ExpensesList.tsx` | `expenses` | `expense_date` | `expense_date` | `expense_date` | `expense_date` | `expense_date` | `created_at` | CORRECT — NO CHANGE | None |
| Invoice item ordering | `InvoiceDetailsSheet.tsx:159`, `DashboardFinance.tsx:966` | `invoice_items` | none | none | `created_at` asc | none | n/a — line sequence, not a business date | n/a | CORRECT — NO CHANGE | None |
| POS surfaces | `src/hooks/pos/usePOSCore.ts` | POS tables | — | — | — | — | n/a | n/a | DEAD / UNUSED (fenced inert) | None |

## F. Payment Sessions

`payment_sessions.payment_date` exists as a true `date` column and is written by `post_payment_session`, but no hook, component or page reads the table — the only repository occurrences outside generated types are the doc comment in `src/lib/finance/effectiveDate.ts` and the write payloads in `postPaymentSession.ts` / `postLedgerForPayments.ts` / `multiInvoicePaymentFingerprint.ts`. All user-visible payment chronology is served from `ledger_entries.effective_date`, which the RPC derives from `payment_date`. Contract recorded for future surfaces: business date `payment_date`, tie-break `created_at`, final tie-break `id`. Verdict: NO DEDICATED PAYMENT-SESSIONS READ SURFACE REQUIRES STAGE-C CUTOVER.

## G. Financial Entries

Surfaces: `useFinancialEntries.ts` (tenant-scoped read, ordered `created_at` desc), `InternalCostsTab.tsx` (displays `formatStandardDate(entry.created_at)` as the cost date in two places), `FinancialStatusSection.tsx` (no date rendered), `recordAsStableCost.ts` (writer, out of scope). Schema evidence: the table has no `cost_date`, `incurred_on` or equivalent — only `created_at` / `updated_at`. Domain evidence: each row carries `entity_type` + `entity_id` pointing at a dated operational event (`vet_treatments`, `horse_vaccinations`, `breeding_attempts`, `foalings`), and `InternalCostsTab` already joins those tables for horse names. Therefore `created_at` is a data-entry timestamp, not the economic date of the cost, and the correct business date is the linked source event's date. The storage mechanism is the open question — see §M. Verdict: FINANCIAL-ENTRIES CONTRACT REQUIRES OWNER ALIGNMENT.

## H. Supplier Payables

Surfaces: `useSupplierPayables.ts` (list, ordered `created_at` desc), `SupplierPayablesTab.tsx` (renders `due_date` only), `useSupplierPayableForSource.ts` (selects no date), plus creation call sites in vet/breeding modules. Date inventory: obligation/document date **absent**; `due_date` present; payment/settlement date **absent** (settlement is inferred from `amount_paid` and `status` with no date); audit `created_at` / `updated_at` present. The table currently holds 0 rows, so no historical correctness is at risk. Two of the four required dates have no column, so a read-path cutover cannot be specified without inventing schema — this belongs to deferred item 23 (Supplier Payable lifecycle and authority), not Stage C. Verdict: SUPPLIER-PAYABLES DOMAIN CONTRACT DEFERRED.

## I. Dashboards and KPIs

All finance KPI aggregates in `DashboardFinance.tsx` (four `stats` memos) compute over already-filtered collections: the Ledger and Payments stats consume the Slice-B `effective_date`-filtered arrays, invoice stats consume `issue_date`/`due_date` data, and expense stats consume `expense_date` data. No KPI filters, buckets or ranges by `created_at`, `updated_at`, an approval timestamp or a posting timestamp. `DashboardRevenue.tsx` contains no direct database read. Verdict: NO REMAINING DASHBOARD KPI CUTOVER REQUIRED.

## J. Exports and Reports

Only one remaining export flow is affected: the Invoice PDF payment disclosure. It correctly separates the economic date (`sess.effectiveDate`, `p.effective_date`) from the audit received-at (`p.created_at`), but renders the date-only economic value through `formatStandardDate`, whose `toValidDate` helper calls `new Date("2026-07-25")`. That parses as UTC midnight, so in any negative-UTC-offset environment the printed calendar day shifts back by one — the same class of defect Slice B removed from the Ledger/Payments exports. In Riyadh (UTC+03:00) the rendered day is currently correct, so this is a latent, not an active, production defect. Statement exports (Slice A) and Ledger/Payments exports (Slice B) remain correct and were not re-audited. Verdict: REMAINING EXPORT REPORT DATE CONTRACTS DETERMINED.

## K. Dead and Duplicate Paths

Dead/unused: direct `payment_sessions` reads (none exist); POS surfaces (fenced inert). Duplicates of accepted paths: Ledger tab, Payments tab, Client Statement, Customer-level Activity, invoice and expense lists. No-date surfaces requiring no work: `FinancialStatusSection`, `useSupplierPayableForSource`, allocation reads, invoice-item ordering.

## L. Final Execution Package (Stage-C Slice C — draft, not authorized)

**Package 1 — Payment Sessions.** Empty. No path to change; record the `payment_date` contract in `effectiveDate.ts` documentation only if the Owner wants it, otherwise no action.

**Package 2 — Financial Entries.** Blocked on the §M fork. Allowlist under option A would be `src/hooks/finance/useFinancialEntries.ts` and `src/components/finance/InternalCostsTab.tsx`.

**Package 3 — Supplier Payables.** Excluded from Stage C; remains deferred item 23.

**Package 4 — Dashboards/KPIs.** Empty.

**Package 5 — Exports/Reports.**
- Allowlisted paths: `src/components/finance/InvoicePDFGenerator.tsx` and, if a shared helper is preferred, `src/lib/displayHelpers.ts` (additive only).
- Before-state: line 335 `formatStandardDate(p.effective_date)`; line 364 `formatStandardDate(sess.effectiveDate)`.
- Target: render date-only economic values with `formatEconomicDate` from `src/lib/finance/effectiveDate.ts`; leave line 336 `formatStandardDateTime(p.created_at)` untouched as the labelled audit timestamp.
- Deterministic order: unchanged (`effective_date`, `created_at` ascending, already applied by the query).
- Filter semantics: unchanged — invoice-scoped, no date filter.
- Rendering semantics: `dd-MM-yyyy`, no timezone conversion, no fabricated time.
- Tests: extend `src/components/finance/__tests__/InvoicePDFGenerator.paymentDisclosure.test.ts` with a fixed non-Riyadh `TZ` case asserting no day shift for `2026-07-25`.
- Exclusions: invoice `issue_date` / `due_date` header rendering, all Slice-A and Slice-B paths, every write path.
- Risk: very low — presentation-only, one component.
- Rollback: revert the single commit; no data or schema involvement.
- Acceptance: PDF economic dates match the on-screen `effective_date` under at least one negative-offset timezone; timestamp disclosure unchanged; finance tests, typecheck and build pass.

## M. Owner Decision

One genuine fork — how `financial_entries` (Internal Costs) should obtain its business date:

- **Option A — Read-time inheritance (recommended).** Resolve the date from the linked source event (`vet_treatments`, `horse_vaccinations`, `breeding_attempts`, `foalings`) at read time and use it for display, filtering and the primary sort key, with `created_at` then `id` as tie-breaks. No schema change, no data migration, no write-path change; fits Stage C's read-only cutover mandate. Cost: an extra join per surface and a fallback to `created_at` for entity types without a resolvable date.
- **Option B — Persisted `cost_date` column.** Add a dedicated business-date column, backfill the 5 existing rows from their source events, and change writers to populate it. Cleaner long-term and cheaper to query, but it is a schema plus write-path change, which exceeds the Stage-C read-path boundary and would need its own migration, backfill evidence and acceptance run.

Recommendation: Option A for Stage C, with Option B registered as a Phase-2 candidate.

## N. One Recommendation

Approve Option A and authorize a single final Stage-C execution prompt covering exactly Package 2 (financial entries read-time inheritance) and Package 5 (invoice PDF date-only parity).

## O. Workstream Persistence

Stage A closed; Stage B closed; Slice A accepted and closed; Slice B accepted and closed; remaining Stage-C investigation complete with one Owner decision outstanding; Stage C active; no Closure.

## P. Roadmap Impact

Phase 1 active; Stage C active; Stage D not started; Phases 2–8 not started; no advancement, no Closure.

## Q. Deferred Items Register

Items 1–9 promoted to Prompt 45 were all executed: payment-sessions surface discovery (none found), payment_sessions `payment_date` contract (recorded, unused), financial_entries classification (fork in §M), Supplier Payables classification (deferred), dashboards/KPIs (clean), exports/reports (one latent defect), dead/duplicate classification, execution packaging, zero-write verification. Items 10–17 remain blocked pending the Owner decision (10 final Stage-C execution; 11 Stage-C final QA; 12 Stage-C Acceptance; 13 Stage-C persistence if required; 14 Stage-D investigation; 15 Phase-1 completion; 16 Workstream Closure; 17 Closure Persistence). Items 18–37 remain deferred and tracked, unchanged, with item 23 (Supplier Payable lifecycle and authority) now confirmed as the owner of the Supplier Payables date-model gap. No item was dropped.

## R. Run Metadata and Exact Stopping Point

1. Plan/Chat — Read-Only investigation. 2. PROMPT-45 — SUBMITTED — RUN — CONSUMED. 3. Prepared 05-08-2026 11:30 Asia/Riyadh. 4. Run start 11:30, end 11:38, report 11:38 Asia/Riyadh (approximate; exact time not recorded). 5. Branch and HEAD per §C. 6. Working Tree clean before and after. 7. Repository paths inspected: `useFinancialEntries.ts`, `InternalCostsTab.tsx`, `FinancialStatusSection.tsx`, `useSupplierPayables.ts`, `SupplierPayablesTab.tsx`, `useSupplierPayableForSource.ts`, `useInvoicePayments.ts`, `useInvoicePriorAllocations.ts`, `fetchInvoicePaymentSummary.ts`, `InvoicePDFGenerator.tsx`, `InvoiceDetailsSheet.tsx`, `DashboardFinance.tsx`, `DashboardRevenue.tsx`, `useEligibleClientInvoices.ts`, `displayHelpers.ts`, `effectiveDate.ts`. 8. Database objects inspected: `payment_sessions`, `payment_allocations`, `financial_entries`, `supplier_payables` (columns and row counts). 9. Read-only SQL statements: 4. 10. payment_sessions surfaces: 0. 11. financial_entries surfaces: 3 (2 date-bearing). 12. Supplier Payables surfaces: 3 (1 date-bearing). 13. Dashboard/KPI surfaces: 4 stats memos, all clean. 14. Export/report surfaces: 1 requiring correction. 15. Dead/duplicate paths per §K. 16. Unresolved forks: 1 (§M). 17. Final execution package per §L. 18. Repository writes: ZERO. 19. Database writes: ZERO. 20. Migration writes: ZERO. 21. Financial-row writes: ZERO. 22. Stage A CLOSED. 23. Stage B CLOSED. 24. Slice A ACCEPTED — CLOSED. 25. Slice B ACCEPTED — CLOSED. 26. Stage C ACTIVE. 27. Stage D NOT STARTED. 28. Phase advancement NONE. 29. Closure NONE. 30. Stopping point: after mapping the remaining paths and preparing one execution package; no writes, no persistence, no Stage-D work. 31. Recommendation per §N. 32. Next: Prompt 46 — Stage-C Slice-C final execution (Execution Mode), only after the §M decision.
