# Slice 2.2A — Frozen Invoice Truth, Actionable Errors, PDF Distribution

## A. Verdict

**SLICE 2.2 FINAL CORRECTION CONTRACT LOCKED — EXECUTION-READY APPROVAL PROVIDED.**

Every contract required by Sections 4–14 of the audit brief is mechanically resolved.

## B. Screenshot 57 — Mechanical Proof (Live-Catalog Dependence)

Live reads of `public._finance_invoice_approve_inline` and `public._finance_invoice_compute_totals`:

- `_finance_invoice_approve_inline` builds `v_input_items` and includes `is_taxable` **only** when both `service_id IS NULL AND package_id IS NULL`. Catalog-backed lines send no `is_taxable` and no `tax_rate`.
- For every item with `service_id IS NOT NULL`, `_finance_invoice_compute_totals` executes `SELECT is_taxable FROM public.tenant_services WHERE id = v_service_id` and assigns the result to `v_service_taxable`. The frontend/frozen `taxable_snapshot` and `tax_rate_snapshot` on the row are **never consulted**.
- `_finance_invoice_approve_inline` then compares the frozen `v_physical_items` (which carries `taxable_snapshot`, `tax_rate_snapshot`, `line_pretax_amount`, `line_tax_amount`, `line_gross_amount`) against `v_computed->'items'` (rebuilt from the live catalog). Any drift raises `FIN_INVOICE_SOURCE_SNAPSHOT_STALE` (SQLSTATE `23514`).

INV-0983 mechanical trace:

| Stage | catalog `is_taxable` | frozen `taxable_snapshot` | computed tax | frozen `line_tax_amount` | outcome |
|---|---|---|---|---|---|
| Before catalog change | true | false | 45.00 | 0.00 | mismatch → `FIN_INVOICE_SOURCE_SNAPSHOT_STALE` |
| After user flipped catalog to non-taxable | false | false | 0.00 | 0.00 | match → approval succeeded |

The invoice row and its item row were **not** modified between the two attempts. Current DB state confirms: `invoice_items` still shows `taxable_snapshot=false`, `tax_rate_snapshot=15.000`, `line_tax_amount=0.00`, `line_gross_amount=300.00`, `total_price=300.00`; `invoices` now shows `status='approved'`, `total_amount=300.00`.

**This conclusively proves live-catalog dependence.**

## C. Frozen Snapshot Authority Contradiction

Locked business principle: frozen `invoice_items` snapshots are the financial truth of an approved-or-approving invoice. The installed backend contradicts this principle for exactly two fields, on exactly one item class:

| Field | Free-text lines (`service_id IS NULL`) | Catalog Service lines (`service_id IS NOT NULL`) | Package lines |
|---|---|---|---|
| `quantity` | frozen | frozen | forced to 1 |
| `unit_price` | frozen | **re-read from `tenant_services.unit_price`** | re-read from `stable_service_plans.base_price` |
| `taxable_snapshot` | frozen (payload carries `is_taxable`) | **re-read from `tenant_services.is_taxable`** | re-read from `stable_service_plans.is_taxable` |
| `tax_rate_snapshot` | re-derived from tenant rate | re-derived from tenant rate | re-derived from tenant rate |
| `line_*_amount` | recomputed and compared | recomputed and compared | recomputed and compared |

Package-line drift is out of scope for this slice (no user report). The proven, in-scope contradiction is **catalog Service taxability**.

## D. Exact Origin of INV-0983 Snapshot

`_invoice_items_fill_snapshots` inspected in full: it only fills `service_name_snapshot`, `service_name_ar_snapshot`, `category_key`, `category_name*_snapshot`, and category rows. It **never touches** `taxable_snapshot`, `tax_rate_snapshot`, `line_pretax_amount`, `line_tax_amount`, `line_gross_amount`. Those snapshots are supplied by the caller (`create_invoice_with_items` / `update_invoice_with_items`), which computes them from the payload the frontend sends.

Therefore INV-0983's `taxable_snapshot = false` was written by the writer at creation time from the payload the frontend built, not by a backend defect. Two proven possibilities converge on the same fix and neither requires data repair:

1. The catalog service `Foaling Assistance` was `is_taxable = false` at the moment INV-0983 was created, so the frontend seeded the item with `taxable_snapshot = false` correctly.
2. The user explicitly saved the line as non-taxable through the line editor (an override is exposed by `InvoiceLineItemsEditor` today).

Either way, the frozen snapshot is **internally coherent**: `total_price = qty × unit_price = 300.00`, `line_pretax_amount = 300.00`, `line_tax_amount = 0.00`, `line_gross_amount = 300.00`, header `subtotal = 300.00`, `tax_amount = 0.00`, `total_amount = 300.00`. No corruption exists.

## E. Approval Correction (Backend)

Narrowest correct fix in `_finance_invoice_approve_inline` and `_finance_invoice_compute_totals`:

1. **`_finance_invoice_approve_inline` — `v_input_items` build**: emit `is_taxable` **and** `tax_rate` for **every** item, sourced from the frozen row (`ii.taxable_snapshot`, `ii.tax_rate_snapshot`). Drop the current `CASE WHEN ii.service_id IS NULL AND ii.package_id IS NULL` special case. Package-price freezing is unchanged in this slice.
2. **`_finance_invoice_compute_totals` — per-item resolution**: when the payload item carries an explicit `is_taxable` (boolean) or `tax_rate` (numeric), use those values instead of re-reading `tenant_services.is_taxable` / re-deriving the rate. Continue re-reading `name`, `name_ar`, `category_id`, `is_active`, `currency` from the catalog (metadata, not financial truth). When `is_taxable`/`tax_rate` are absent (new-invoice draft path), preserve today's catalog-derived defaults.
3. **Retained validation** (unchanged): item-level identity checks (`line_pretax + line_tax = line_gross`, non-negativity, tax-rate 0..100, `service_id ⊕ package_id`, `horse_id ⊕ lab_horse_id`, valid period, `taxable_snapshot NOT NULL`, `tax_rate_snapshot NOT NULL`); frozen-vs-computed comparison for `unit_price`, `total_price`, `line_pretax_amount`, `line_tax_amount`, `line_gross_amount`, `taxable_snapshot`, `tax_rate_snapshot`, package snapshots; header comparison (`subtotal`, `tax_amount`, `total_amount`); `discount_amount ≥ 0`.

Post-fix, the frozen snapshot fully drives approval math, and the header still has to reconcile against the frozen items — genuine internal inconsistencies still fail.

**Atomicity:** unchanged. Everything remains inside the existing `SECURITY DEFINER` function's transaction with the same `pg_advisory_xact_lock`. **Rollback:** single migration; reverse SQL bundled that restores today's two function bodies verbatim.

## F. Data-Repair Decision — **Option A: no invoice data repair**

INV-0983's frozen snapshot is internally coherent; the failure existed only because approval re-read the catalog. Do **not** modify INV-0983 or any other invoice/invoice_item row. Do **not** resynchronize Draft or Reviewed invoices to current catalog values. Do **not** touch Approved invoices. Approved historical invoices (including the just-approved INV-0983) remain untouched.

## G. Future Creation-Time Safety

Backend remains the sole authority for financial snapshot persistence. `create_invoice_with_items` and `update_invoice_with_items` continue to compute `line_pretax_amount`, `line_tax_amount`, `line_gross_amount` from `qty × unit_price`, the resolved (or explicitly overridden) `taxable_snapshot`, and the effective `tax_rate_snapshot`, then persist all three. Frontend continues to preview only. No competing calculation is introduced.

One narrow write-time addition (bundled in the same migration): when a catalog service is chosen and the payload does not carry an explicit taxability override, `create_invoice_with_items` seeds `taxable_snapshot` / `tax_rate_snapshot` from the catalog at that moment, so new invoices created after a catalog change use the new catalog default automatically. This is already the effective behavior; the migration only makes it explicit and documented.

## H. Approval Error Path (Frontend)

Traced:

- `src/components/finance/InvoiceDetailsSheet.tsx` line 423 `handleApprove` → `approveInvoice(invoice.id, tenantId)` → `src/lib/finance/approveInvoice.ts` → `approveInvoiceRpc` (`src/lib/finance/invoiceRpc.ts` line 85) → `supabase.rpc("approve_invoice", …)`.
- Errors are rethrown by `invoiceRpc.ts` and caught in `handleApprove`, which currently renders `toast.error(t("finance.invoices.approveFailed"))` — a generic message. No `FIN_*` token mapping exists on the approval path (`ERROR_TOKEN_KEYS` in `useInvoicePayments.ts` covers Payments only).
- `src/pages/DashboardFinance.tsx` line 161 has a second `approveInvoice` caller that also renders a generic toast.

## I. Final Actionable Error Copy

Two new i18n keys, both surfaces mapped:

- `finance.invoices.errors.snapshotStale`
  - AR: `تعذر اعتماد الفاتورة لأن البيانات المالية المحفوظة لأحد البنود غير متسقة. افتح الفاتورة، راجع البند والضريبة، ثم احفظها من جديد قبل الاعتماد.`
  - EN: `The invoice cannot be approved because a saved line has inconsistent financial data. Reopen the invoice, review the line and tax settings, then save it again before approval.`

- `finance.invoices.errors.totalsStale`
  - AR: `تعذر اعتماد الفاتورة لأن إجمالي البنود والضريبة لا يطابق إجمالي الفاتورة. افتح الفاتورة وراجع الإجماليات ثم احفظها من جديد.`
  - EN: `The invoice cannot be approved because the line and tax totals do not match the invoice total. Reopen the invoice, review the totals, and save it again.`

Behavior:

- Token extraction: `FIN_INVOICE_SOURCE_SNAPSHOT_STALE` and `FIN_INVOICE_TOTALS_STALE` match a shared `/FIN_[A-Z_]+/` regex applied to `error.message` and Postgres `hint`/`details`.
- No UUIDs, no SQL, no table names, no raw SQLSTATE reach the toast. The mapper deliberately does **not** attempt line-level attribution because the backend does not safely return it.
- Development-only detail: `if (import.meta.env.DEV) console.error("Invoice approval failed:", error)` — retained in the catch block for engineer diagnosis.

## J. Four PDF Output Paths

Traced end-to-end:

| Action | Caller | Fetches summary | Passes `paymentSummary` | Passes `pdfPaymentSession` labels | `includePaymentHistory` origin |
|---|---|---|---|---|---|
| Details → Print | `InvoiceDetailsSheet.tsx` (`handleExport` around L590–615) | yes (`fetchInvoicePaymentSummaryForPdf`) | yes | yes (L561–L575) | print options dialog |
| Details → Download | same | yes | yes | yes | print options dialog |
| List → Print | `InvoicesList.tsx` (`doExport` L243) | yes (L252) | yes (L260) | yes (L172–L184) | print options dialog |
| List → Download | same | yes | yes | yes | print options dialog |

All four paths converge on `InvoicePDFGenerator.createInvoiceHTML` with an identical `GeneratePDFOptions` shape. Enrichment reaches the generator.

## K. INV-0986 Value Trace

Live database — proven persistence:

| Stage | Session 1 methods | Session 1 distribution | Session 2 methods | Session 2 distribution |
|---|---|---|---|---|
| `ledger_entries` | Cash 250, Card 300 | — | Cash 100 | — |
| `payment_allocations` | 2 rows for session `652a63fd…`, `client_level_amount = 0.00` on both | — | 1 row for `29e7a3de…`, `client_level_amount = 0.00` | — |
| `payment_horse_allocations` (raw) | Maha 68.18 + Fatin 181.82 (cash split) and Maha 81.82 + Fatin 218.18 (card split) — **aggregated per horse: Fatin 400.00, Maha 150.00** | Fatin 100 for session 2 | — | — |
| **Fetcher output (`fetchInvoicePaymentSummaryForPdf`)** | Cash 250, Card 300 | **`horseAllocations = []`** | Cash 100 | **`horseAllocations = []`** |
| Caller options | full sessions passed | empty | full sessions passed | empty |
| Generator | uses `renderSessionGroupedHistory` | `hasDistribution = false` → distribution column omitted | — | — |
| HTML output | Cash 250, Card 300 shown | **no distribution rendered** | Cash 100 shown | **no distribution rendered** |

(Aggregated horse totals reconcile session totals exactly in integer cents.)

## L. Exact Distribution-Loss Point

**First loss point: PostgREST embedded read in `src/lib/finance/fetchInvoicePaymentSummary.ts` lines 110–117.**

The query embeds `payment_horse_allocations(horse_id, amount)` inside a `payment_allocations` select. The **only** foreign key from `payment_horse_allocations` to `payment_allocations` is a **composite** FK on `(allocation_id, session_id, tenant_id, invoice_id) → (id, session_id, tenant_id, invoice_id)` (`payment_horse_allocations_composite_fk`). PostgREST resource embedding requires a single-column FK relationship it can uniquely resolve; composite FKs are not embeddable in `PostgREST v11/v12` without a hint. The embed silently resolves to `null` on every row, so `a.payment_horse_allocations` in the fetcher is always `null`. The subsequent `for (const ha of a.payment_horse_allocations ?? []) { … }` loop is empty for every session; `allocByKey` never receives a horse. Every session ends up with `horseAllocations = []` and `hasDistribution = false`.

RLS is not the cause: policies on both tables are `is_active_tenant_member AND has_permission('finance.payment.view')`, which the app user satisfies (payments are recorded and read on the same surface).

## M. Reconciliation Result

Applied to live INV-0986 data (integer cents):

- Session 1: tenders = `25000 + 30000 = 55000`; horse allocation = `40000 + 15000 = 55000`; client-level = `0`. Reconciles exactly.
- Session 2: tenders = `10000`; horse allocation = `10000`; client-level = `0`. Reconciles exactly.

Both sessions pass any reasonable ±1-cent tolerance. Distribution rendering is safe today; only the fetcher-embed defect prevents it.

## N. Horse-Name Fallback

Priority order used by `InvoicePDFGenerator` (already in code, retained):

1. Localized frozen horse name from `horses` (`name_ar` in AR, `name` in EN) resolved by the fetcher.
2. Localized fallback string when both are absent: `Unknown Horse` / `خيل غير معرّف` (new i18n key `finance.payments.pdfPaymentSession.unknownHorse`).
3. Never UUID, never partial UUID, never microchip fragment. The previous `horseId.slice(0, 8)` fallback in `fetchInvoicePaymentSummary.ts` (line 170) is replaced with the localized string.

## O. Exact Files Proposed

Backend (one migration):
- Alter `public._finance_invoice_approve_inline` — emit frozen `is_taxable` and `tax_rate` for every payload item.
- Alter `public._finance_invoice_compute_totals` — honor payload `is_taxable` / `tax_rate` for catalog-backed items.
- Ensure `create_invoice_with_items` writes explicit `taxable_snapshot` / `tax_rate_snapshot` from catalog at creation when not overridden (already the effective behavior; keep it explicit).
- Rollback SQL bundled in the same migration file (header comment; reverse function bodies).

Frontend:
- `src/lib/finance/fetchInvoicePaymentSummary.ts` — replace the embedded `payment_horse_allocations(…)` select with two ordinary selects: (a) `payment_allocations` filtered by `tenant_id`, `invoice_id`, `session_id IN (…)`; (b) `payment_horse_allocations` filtered by `tenant_id`, `invoice_id`, `session_id IN (…)`. Aggregate horse-level rows per `session_id + horse_id` before returning. Replace the last-4-of-UUID fallback with the localized `unknownHorse` label.
- `src/components/finance/InvoiceDetailsSheet.tsx` — map `FIN_INVOICE_SOURCE_SNAPSHOT_STALE` and `FIN_INVOICE_TOTALS_STALE` in `handleApprove`; pass the new `unknownHorse` label bundle to the PDF generator.
- `src/pages/DashboardFinance.tsx` — same approval error mapping.
- `src/components/finance/InvoicesList.tsx` — pass the new `unknownHorse` label to the PDF generator.
- `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` — new keys: `finance.invoices.errors.snapshotStale`, `finance.invoices.errors.totalsStale`, `finance.payments.pdfPaymentSession.unknownHorse`.

## P. Three-Step Execution Plan

### Step A — Frozen Invoice Approval (backend)

- Files: single migration altering `public._finance_invoice_approve_inline` and `public._finance_invoice_compute_totals`; keep `create_invoice_with_items` catalog-seed behavior explicit.
- Payload: `v_input_items` now always emits `is_taxable = ii.taxable_snapshot` and `tax_rate = ii.tax_rate_snapshot`. Compute reads these when present.
- Retained validation: header identity, per-line identity, `line_pretax + line_tax = line_gross`, non-negativity, tax-rate range, `service_id ⊕ package_id`, `horse_id ⊕ lab_horse_id`, period validity, package snapshot completeness, frozen-vs-computed diff on `unit_price`/`total_price`/`line_*`/`taxable_snapshot`/`tax_rate_snapshot`/package snapshots.
- Creation-time consistency: `create_invoice_with_items` continues to persist coherent snapshots; no behavior change beyond documentation and the write-time seed already in effect.
- Data repair: none.
- Atomicity: single transaction inside `_finance_invoice_approve_inline` under `pg_advisory_xact_lock`; success posts exactly one ledger `invoice` row; failure leaves no partial writes.
- Rollback: reverse SQL for both function bodies bundled in the migration header.

### Step B — Approval Error UX (frontend)

- Files: `src/components/finance/InvoiceDetailsSheet.tsx`, `src/pages/DashboardFinance.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`.
- Token mapping: `FIN_INVOICE_SOURCE_SNAPSHOT_STALE → finance.invoices.errors.snapshotStale`, `FIN_INVOICE_TOTALS_STALE → finance.invoices.errors.totalsStale`. Fallback to today's `finance.invoices.approveFailed`.
- Copy: exactly as Section I.
- Behavior: production toast shows the localized actionable message; `import.meta.env.DEV` logs the raw error object for diagnosis; no SQL, tokens, UUIDs, or table names reach the UI.
- No financial logic change.

### Step C — PDF Horse Distribution (frontend)

- First loss point: PostgREST composite-FK embed in `src/lib/finance/fetchInvoicePaymentSummary.ts` lines 110–117.
- Files: `src/lib/finance/fetchInvoicePaymentSummary.ts`, `src/components/finance/InvoicePDFGenerator.tsx` (labels only), `src/components/finance/InvoicesList.tsx` (labels), `src/components/finance/InvoiceDetailsSheet.tsx` (labels).
- Session shape unchanged: `InvoicePaymentSessionForPdf` continues to expose `tenders[]`, `horseAllocations[]`, `clientLevelAmount`. The fetcher now populates them via two flat queries and aggregation.
- Shared path: all four output actions already funnel through `fetchInvoicePaymentSummaryForPdf → InvoicePDFGenerator`. The fix corrects the shared enricher, so every output action benefits identically.
- Reconciliation: integer-cent comparison of session tender total vs (Σ horse + client-level); ±1 cent tolerance; when the check fails or persistence is genuinely empty, `hasDistribution = false` and the block renders Methods-only.
- Horse-name fallback: localized `unknownHorse` string; never UUIDs.
- Tests: see Section Q.
- Rollback: single frontend patch; revertible without a migration.

## Q. Focused Tests

Vitest (new/updated only):

Frozen Invoice approval (extends `src/lib/finance/__tests__/n2_5InvoiceRpcRuntimeWiring.test.ts` + new focused SQL-shape assertions where possible via existing pg-tap harness):

- A saved non-taxable catalog Service line approves using its frozen snapshot, even when the catalog is currently taxable.
- A saved taxable line approves using its frozen tax values.
- Changing catalog taxability after Invoice creation does not alter approval totals.
- New Invoices created after a catalog change use the new catalog default.
- Header total mismatch against frozen items still fails with `FIN_INVOICE_TOTALS_STALE`.
- Per-line frozen inconsistency (`line_pretax + line_tax ≠ line_gross`) still fails with `FIN_INVOICE_ITEMS_INVALID`.
- Approval creates exactly one `ledger_entries` row of type `invoice`.
- Failed approval creates zero writes.
- Approved historical invoices remain untouched.
- No broad Draft/Reviewed resynchronization runs.

Error UX (`src/components/finance/__tests__/InvoiceDetailsSheet.approveErrors.test.tsx` — new focused file):

- `FIN_INVOICE_SOURCE_SNAPSHOT_STALE` maps to the actionable Arabic and English copy.
- `FIN_INVOICE_TOTALS_STALE` maps to the actionable Arabic and English copy.
- Raw SQLSTATE, `FIN_*` tokens, and Postgres text do not appear in production toasts.
- Development logging still captures the raw error object.

PDF distribution (extends `src/components/finance/__tests__/InvoicePDFGenerator.paymentDisclosure.test.ts` and new `fetchInvoicePaymentSummary.horseAllocation.test.ts`):

- All four output actions use the same enriched sessions structure (assert via `doExport` and `handleExport` unit-shaped tests).
- INV-0986 Session 1 fixture renders Cash 250, Card 300, Fatin 400, Maha 150.
- INV-0986 Session 2 fixture renders Cash 100, Maha 100.
- Session totals reconcile in integer cents.
- Missing distribution renders Methods only.
- Missing horse name uses the localized `unknownHorse` fallback; never UUID/microchip.
- History OFF omits every session detail.
- Print and Download HTML content are byte-equivalent for the same options.
- No payment mutation occurs during output (mocked writer asserted not called).

Verification:

- Focused Vitest passes.
- TypeScript passes.
- Production build passes.

No large SQL harness expansion.

## R. Database Changes Required

Exactly one migration:

- Redefine `public._finance_invoice_approve_inline` — payload emission change only.
- Redefine `public._finance_invoice_compute_totals` — honor per-item `is_taxable` / `tax_rate` when provided.
- Bundled reverse-SQL for both function bodies.

No schema changes. No new tables. No new columns. No new indexes. No new triggers. No RLS changes. No permission changes.

## S. Persistent Rows Modified

None. Zero `invoices`, `invoice_items`, `ledger_entries`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `customer_balances`, `tenant_services`, `stable_service_plans`, or `tenants` rows are inserted, updated, or deleted by this slice.

## T. Roadmap

- Phase 1 N+1A: closed.
- Phase 2 N+1B: closed.
- Phase 3 N+2: closed.
- Phase 4 N+3:
  - Slice 1: closed.
  - Slice 2: functionally delivered.
  - Slice 2.1: implemented with one PDF disclosure defect (this slice fixes it).
  - **Slice 2.2A: this plan.**
  - Slice 3 — Multi-Invoice Payment UI: not started.
  - Slice 4 — Session detail, receipts, reports, closure: not started.
- Phase 5 N+4: refunds, reversals, void, chargeback, credit, overpayment. Retail POS excluded.

## U. Next Action

AWAIT USER APPROVAL OF THIS PLAN.

---

## APPROVAL HANDOFF — SEND THIS EXACT MESSAGE

**Authorized:**

- Approval based on persisted frozen `invoice_items` truth (Step A migration).
- Future creation-time snapshot consistency (documented in the same migration; no behavior expansion).
- No broad invoice data repair; INV-0983 and every other invoice/invoice_item row remain untouched.
- Actionable approval error mapping in `InvoiceDetailsSheet.tsx` and `DashboardFinance.tsx` with new AR/EN i18n keys (Step B).
- PDF Session Horse/Client distribution correction limited to `fetchInvoicePaymentSummary.ts` and label plumbing (Step C).
- Focused Vitest coverage per Section Q.
- TypeScript check.
- Production build.

**Prohibited:**

- Changing Approved invoice history.
- Broad Draft/Reviewed resynchronization.
- Speculative migrations.
- Payment Dialog changes (topic closed as no-op).
- New Payment writer architecture.
- Multi-Invoice Payment UI (Slice 3).
- Refunds, reversals, credit, overpayment (Phase 5).
- Retail POS.
