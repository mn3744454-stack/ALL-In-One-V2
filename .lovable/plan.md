
## A. Verdict

**PDF PAYMENT DISTRIBUTION RUNTIME DEFECT ISOLATED — EXECUTION-READY APPROVAL PROVIDED**

## B. Attachment Findings
- Screenshot 62 (INV-0991) and Screenshot 64 (INV-0986): both printed from the Invoice Details drawer (Attachment 47 shows the details drawer with Print/Download buttons). Both render only the flat Payment History table, no Payment Distribution or Session grouping.

## C. INV-0991 Persisted Allocation (`56924606-d3b2-488e-873b-024f9c915ae1`, tenant `145f2128…`)
Single session `13c993a5…` (2026-07-27):
- Tenders: Card 160.00, Cash 500.00 (total 660.00)
- Horse distribution: Tako 96.97 + 303.03 = **400.00**, Dragon 196.97 + 63.03 = **260.00** (aggregated across the two `payment_allocations` rows in the same session, as expected — session total 660 reconciles).
- client_level_amount = 0.

## D. INV-0986 Persisted Allocation (`d2078053…`)
- Session `652a63fd…` (2026-07-26): Cash 250 + Card 300 = 550. Horses: Fatin 218.18+181.82=**400.00**, Maha 68.18+81.82=**150.00**. Reconciles ✔.
- Session `29e7a3de…` (2026-07-27): Cash 100. Horses: Fatin **100.00**. Reconciles ✔.
- (Note: real distribution is Fatin 500 / Maha 150 across both sessions — matches invoice.)

Persistence is complete and correct for both invoices.

## E. Runtime Fetch Results
`fetchInvoicePaymentSummaryForPdf` is only called from `InvoicesList.doExport` (line 252). It is **never called** from `InvoiceDetailsSheet.handleExport`. The details sheet instead calls `buildPdfPaymentSummary()` (lines 573–594), which reads the live `useInvoicePayments` hook and returns an object with **no `sessions` field, no `horseAllocations`, no `clientLevelAmount`**.

## F. Export Options

| Property | INV-0991 Print (Details) | INV-0986 Print (Details) | Expected |
|---|---|---|---|
| includePaymentHistory | true | true | true |
| paymentSummary.sessions | **undefined** | **undefined** | populated |
| paymentSummary.payments | populated (flat) | populated (flat) | populated |
| horseAllocations | **absent** | **absent** | populated |
| pdfPaymentSession labels | present | present | present |

## G. Active Generator Branch
`InvoicePDFGenerator.createInvoiceHTML` line 409:
```
${paymentSummary.sessions?.length ? renderSessionGroupedHistory() : renderFlatHistory()}
```
Because `sessions` is undefined for details-drawer exports, the ternary selects `renderFlatHistory()`.

## H. Flat-Renderer Selection Cause
`InvoiceDetailsSheet.buildPdfPaymentSummary()` never populates `sessions`. It bypasses the enriched fetcher and constructs a legacy shape from the on-screen hook. This is the exact and only reason the flat table is emitted.

## I. INV-0986 Stage Trace

| Stage | Session 1 Horse Count | Session 2 Horse Count | Renderer |
|---|---|---|---|
| Database | 2 | 1 | — |
| `fetchInvoicePaymentSummaryForPdf` (if called) | 2 | 1 | session-grouped |
| Details-sheet `buildPdfPaymentSummary` | 0 | 0 | — |
| GeneratePDFOptions (from Details) | 0 | 0 | — |
| createInvoiceHTML | 0 | 0 | **flat** |
| Print document | 0 | 0 | flat |

First loss point: **`InvoiceDetailsSheet.buildPdfPaymentSummary` (src/components/finance/InvoiceDetailsSheet.tsx:573)**.

## J. INV-0991 Stage Trace
Identical shape. Loss point is the same function.

## K. Page-2 / CSS Finding
Not applicable. The HTML fragment for session-grouped disclosure is never emitted, so there is nothing being clipped, hidden, or pushed to a later page. INV-0986 is single-page and still lacks the section, confirming the pure-data cause.

## L. Repository / Build / Runtime Parity
Generator branch, session renderer, headings, and horseAllocations are all present in the current source and shipped bundle. Not a cache/service-worker issue. `InvoicesList` path already delivers the populated object correctly; the details-drawer path is the divergent branch.

## M. Exact First Loss Point
**`src/components/finance/InvoiceDetailsSheet.tsx`, function `buildPdfPaymentSummary` (lines ~573–594) invoked by `handleExport` (line ~596).** The returned `InvoicePaymentSummaryForPdf` omits `sessions`, `horseAllocations`, and `clientLevelAmount`.

## N. Exact Files Proposed to Change
1. `src/components/finance/InvoiceDetailsSheet.tsx` — replace `buildPdfPaymentSummary()` usage with `fetchInvoicePaymentSummaryForPdf(tenantId, invoice.id)` inside `handleExport`, mirroring `InvoicesList.doExport` exactly. Remove or keep `buildPdfPaymentSummary` as unused; prefer removal to prevent re-drift.

No other file requires changes. `InvoicesList` already uses the correct fetcher.

## O. Two-Step Execution Plan

**Step A — Route the Details-drawer export through the enriched fetcher**
- File: `src/components/finance/InvoiceDetailsSheet.tsx`
- Function: `handleExport`
- Current value: `summary = buildPdfPaymentSummary()` → object without `sessions`.
- Change: import `fetchInvoicePaymentSummaryForPdf` and set
  ```ts
  const tenantId = (invoice as any).tenant_id || activeTenant?.tenant?.id;
  const summary = tenantId
    ? await fetchInvoicePaymentSummaryForPdf(tenantId, invoice.id)
    : null;
  ```
  Delete the now-unused `buildPdfPaymentSummary` helper.
- Affected paths: Invoice Details → Print, Invoice Details → Download (both English and Arabic). Invoice List paths already correct — untouched.
- Rollback: restore the removed helper and revert `handleExport` to `buildPdfPaymentSummary()`.

**Step B — Runtime/deployment correction**
Not required. The shipped bundle already contains `renderSessionGroupedHistory`; no cache, worker, or build parity issue proven.

## P. Focused Tests
- New Vitest: mock `fetchInvoicePaymentSummaryForPdf` and assert `InvoiceDetailsSheet.handleExport` forwards `sessions`, `horseAllocations`, `clientLevelAmount` to `printInvoice`/`downloadInvoicePDF`.
- Existing `InvoicePDFGenerator.paymentDisclosure.test.ts`: extend with an INV-0986-like fixture (two sessions, 2 horses / 1 horse) to assert session-grouped output when `sessions.length > 0`, and an INV-0991-like fixture (one session, two horses) — verifies renderer already selected correctly and horse names rendered in EN + AR.
- Existing test that flat renderer fires when `sessions` is empty/undefined (legacy invoices) must remain green.
- `bun tsgo` typecheck + production build.

## Q. Database Changes Required
None.

## R. Persistent Rows Modified
None.

## S. Roadmap
Phase N+3 Slice 2.2C — closes the details-drawer PDF regression only. Slices 3 and 4 remain not started. Retail POS still excluded.

## T. Next Action
AWAIT USER APPROVAL OF THE FINAL PDF DISTRIBUTION CORRECTION.

---

## APPROVAL HANDOFF — SEND THIS EXACT MESSAGE

Approve Slice 2.2C: in `src/components/finance/InvoiceDetailsSheet.tsx`, replace the `handleExport` call to the local `buildPdfPaymentSummary()` with `fetchInvoicePaymentSummaryForPdf(tenantId, invoice.id)` (mirroring `InvoicesList.doExport`), delete the unused helper, add focused Vitest coverage for INV-0986 and INV-0991 shapes, and run typecheck + production build.

Authorized:
- PDF Payment Session data-plumbing correction in `InvoiceDetailsSheet.tsx`
- Focused Vitest additions
- TypeScript check + production build

Prohibited:
- Payment-row changes; allocation recalculation
- New grants; RLS changes; Payment RPC changes
- Payment Dialog changes; Invoice approval work
- Multi-Invoice Payment UI; refunds/reversals/credit/overpayment
- Retail POS
