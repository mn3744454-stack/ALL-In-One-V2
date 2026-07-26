## Phase N+3 · Slice 1 — Printed Invoice Payment Status & Optional Payment History

### A. Verdict
`INVOICE PAYMENT DISCLOSURE CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED`

### B. What the Attached PDF and Screenshot Prove
- The current Arabic PDF for `INV-9920` shows number, dates, client, item, subtotal and total — but no Payment status, paid-to-date, outstanding, or Payment History.
- Screenshot 43 proves the financial truth already exists in the app: `INV-9920` is fully paid (SAR 230.00 paid = SAR 20 bank transfer + SAR 210 cash, outstanding SAR 0.00), each row with effective date and recording time.
- The gap is presentation-only in the print/PDF renderer.

### C. Current Print and PDF Architecture
One shared renderer for both Print and Download, in both Stable and Laboratory invoices. There is no separate Lab or Horse-Owner PDF generator; the same file services every account type via the `Invoice` + `InvoiceItem` payload prepared by the caller.

Output paths:
1. `InvoiceDetailsSheet.tsx` → `handleDownloadPDF` → `downloadInvoicePDF(...)`
2. `InvoiceDetailsSheet.tsx` → `handlePrint` → `printInvoice(...)`
3. `InvoicesList.tsx` → `handleDownloadPDF(invoice)` → `loadEnrichedItems` → `downloadInvoicePDF(...)`
4. `InvoicesList.tsx` → `handlePrint(invoice)` → `loadEnrichedItems` → `printInvoice(...)`

Both callers build the same `InvoicePDFLabels` bundle and hand the current `invoice`/`items` to the generator. There is no emailed/shared PDF path today. The details sheet already re-reads the invoice via TanStack Query before opening; the list path refetches items just-in-time in `loadEnrichedItems`. Neither path currently reads Payment truth before generating.

### D. Exact Generator and Files
- `src/components/finance/InvoicePDFGenerator.tsx` — `createInvoiceHTML`, `generateInvoicePDF`, `downloadInvoicePDF`, `printInvoice`, `waitForInvoicePdfFonts`, `buildInvoicePdfFilename`, `buildInvoicePdfTitle`. Bilingual (`lang`), IBM Plex + IBM Plex Sans Arabic, RTL/LTR via `dir` + `<bdi>` isolation, A4 portrait, one canvas → jsPDF for Download, popup HTML for Print. Ready to receive a Payment summary block and an optional Payment History section without disturbing existing groups/totals.
- Callers: `src/components/finance/InvoiceDetailsSheet.tsx` (lines 519–571) and `src/components/finance/InvoicesList.tsx` (lines 208–240).

### E. Authoritative Payment-Status Source
Canonical source is the already-existing `useInvoicePayments(invoiceId)` hook (`src/hooks/finance/useInvoicePayments.ts`), which reads `ledger_entries` (`entry_type='payment'`) as the source of truth and returns `{ totalAmount, paidAmount, outstandingAmount, payments, isPaid, isPartial }`. `invoice.status` is the lifecycle status (draft/approved/…), NOT the payment label; it is not used to derive the printed status. Same tolerance already applied inside the hook (`<= 0.01`).

Status derivation:
- `paidAmount === 0 && outstandingAmount > 0.01` → Unpaid / غير مدفوعة
- `paidAmount > 0 && outstandingAmount > 0.01` → Partially Paid / مدفوعة جزئيًا
- `outstandingAmount <= 0.01` → Paid in Full / مدفوعة بالكامل

### F. Payment-History Data Source
The same `useInvoicePayments` hook already returns each `InvoicePayment` with `payment_method`, `amount`, `effective_date`, `created_at`, and `metadata` (which carries the optional external reference). No extra query, no schema change.

### G. Print-Time Refresh Contract
Both callers must invoke a fresh fetch of the payment summary at the moment Print/Download is triggered, so a just-recorded payment is reflected. Implementation: call `queryClient.fetchQuery` for the `invoice-payments` key (same key already used by the hook) before assembling the PDF options — never rely on cached stale data.

### H. Toggle UX and Default
One shared dialog `InvoicePrintOptionsDialog` opens between the user's Print/Download click and the actual render. Contents:
- `Include Payment History` switch — default OFF on every open.
- Short privacy note (bilingual).
- Primary button labelled contextually (`Download` or `Print`) + Cancel.
- If the invoice has zero payments, the switch is rendered disabled with an explanation (Payment status still prints).

The dialog reports the action (`download` | `print`) and the toggle back to the caller. No persistence.

### I. Privacy Contract
Default OFF. Toggle scoped to a single output action. Never stored on the invoice or user profile. When ON, only these fields render per row: localized method label, amount, effective date, recording time (12-hour, `صباحاً`/`مساءً` or `AM`/`PM`, Latin digits), and external reference when present. Never rendered: UUIDs, ledger IDs, session IDs, idempotency keys, raw method tokens, notes, metadata blobs.

### J. Payment Summary Layout (always visible)
New block inserted between the totals block and the Notes/Footer inside `createInvoiceHTML`, respecting `startAlign`/`endAlign`:
- Row 1: `Payment Status` label + coloured but formal chip-like text (green `Paid in Full`, amber `Partially Paid`, red `Unpaid`).
- Row 2: `Paid to Date` — value.
- Row 3: `Outstanding` — value.
All currency wrapped in `ltrBdi` + `formatCurrency`. Same style tokens as the totals block for visual consistency.

### K. Optional Payment-History Layout
Rendered only when the toggle is ON and `payments.length > 0`:
- Section title `Payment History` styled like the items table header.
- Table with columns: Method | Reference | Effective Date + Recording Time | Amount.
- Recording time formatted via existing `formatStandardDateTime(payment.created_at)`; effective date via `formatStandardDate(payment.effective_date)`.
- Method label localized via existing i18n keys (`finance.payments.methods.cash|card|transfer|check`).
- Rows preserve the order returned by the hook.
- CSS `page-break-inside: avoid` on each row so long histories wrap cleanly onto a second page.

### L. Arabic and English Contract
Existing keys already present: `finance.payments.paymentHistory`, `finance.payments.methods.*`, `finance.payments.outstanding`. Minimum new keys added under `finance.invoices.*`:
- `paymentStatusLabel`, `statusUnpaid`, `statusPartial`, `statusPaid`
- `paidToDate`
- `includePaymentHistory`, `includePaymentHistoryHint`, `includePaymentHistoryDisabledEmpty`
- `paymentMethod`, `paymentReference`

### M. Print/Download Consistency
The same dialog wraps both actions. The chosen action + toggle value drive one code path that builds a single `GeneratePDFOptions` (extended with `paymentSummary` and `includePaymentHistory`) and hands it to either `downloadInvoicePDF` or `printInvoice`. Both branches consume the identical HTML from `createInvoiceHTML`.

### N. Empty and Failure States
- Payment summary fetch fails → block Print/Download with a toast (`finance.invoices.paymentSummaryFetchFailed`); never print an incorrect status.
- No payments → toggle disabled; only Unpaid summary rendered.
- Row missing `created_at` → time cell renders `—` (helper already handles null).
- Missing reference → cell omitted.
- Unknown method token → localized fallback (`finance.payments.methods.other` if key exists, else the raw token is NOT printed; we render `—`).

### O. Exact Files Proposed for Modification
1. `src/components/finance/InvoicePDFGenerator.tsx` — extend `GeneratePDFOptions` and `createInvoiceHTML` with an optional `paymentSummary` + `includePaymentHistory` + `paymentLabels`; add summary block + optional history section; no signature-breaking change for existing callers (new fields optional).
2. `src/components/finance/InvoicePrintOptionsDialog.tsx` — new small dialog component.
3. `src/components/finance/InvoiceDetailsSheet.tsx` — route Download/Print buttons through the dialog; fetch payment summary just-in-time; pass into generator.
4. `src/components/finance/InvoicesList.tsx` — same routing + fetch for the list-row Print/Download actions.
5. `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` — add the minimum new keys listed in §L.

### P. Execution-Ready Plan (4 steps)

**Step 1 — Extend the PDF generator (presentation-only).**
- File: `src/components/finance/InvoicePDFGenerator.tsx`.
- Current: `createInvoiceHTML` renders header, bill-to, items, totals, notes, footer.
- Proposed: add optional `paymentSummary: { status: 'unpaid'|'partial'|'paid'; paidAmount: number; outstandingAmount: number; payments: InvoicePayment[] }`, `includePaymentHistory: boolean`, and `paymentLabels: {...}` to `GeneratePDFOptions`. Insert a Payment Summary block after the Totals block (always when `paymentSummary` provided). When `includePaymentHistory && payments.length > 0`, append a Payment History table using the same visual tokens.
- Data/query: none — pure props.
- Bilingual: uses `startAlign`/`endAlign`, existing `ltrBdi`/`autoBdi`, existing `formatStandardDate` + `formatStandardDateTime`.
- Test: new unit tests for HTML fragment (see §Q).
- Risk: layout regression on very long histories → mitigated by `page-break-inside: avoid` per row.
- Rollback: revert this file; existing signatures remain compatible if new fields are omitted.

**Step 2 — Add `InvoicePrintOptionsDialog`.**
- File (new): `src/components/finance/InvoicePrintOptionsDialog.tsx`.
- Props: `open`, `onOpenChange`, `action: 'print'|'download'`, `hasPayments: boolean`, `onConfirm(includeHistory: boolean)`.
- Default state: `includeHistory = false` on every open (reset in `useEffect` on `open === true`).
- If `!hasPayments`: switch disabled + explanatory hint text.
- Test: rendering + default-OFF + disabled-when-empty + confirm callback (see §Q).
- Risk: extra click → acceptable; matches the required opt-in privacy contract.
- Rollback: delete file + revert callers.

**Step 3 — Wire `InvoiceDetailsSheet` through the dialog.**
- File: `src/components/finance/InvoiceDetailsSheet.tsx`.
- Current: buttons call `handleDownloadPDF`/`handlePrint` directly.
- Proposed: buttons open `InvoicePrintOptionsDialog` with the intended action. On confirm, `queryClient.fetchQuery({ queryKey: ['invoice-payments', tenantId, invoice.id], queryFn: ... })` to refresh, derive status via the rules in §E, build `paymentSummary` + `paymentLabels`, then call `downloadInvoicePDF`/`printInvoice`. On fetch failure, toast and abort.
- Rollback: revert file.

**Step 4 — Wire `InvoicesList` through the dialog + add i18n keys.**
- File: `src/components/finance/InvoicesList.tsx` — same dialog routing and just-in-time fetch as Step 3, invoice-scoped.
- Files: `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` — add the keys from §L. No other locale files.
- Rollback: revert files.

### Q. Compact Test Plan
New:
- `src/components/finance/__tests__/InvoicePDFGenerator.paymentSummary.test.ts` — asserts against `__createInvoiceHTMLForTest`:
  1. Unpaid status text renders (ar + en).
  2. Partially Paid renders with correct paid/outstanding.
  3. Paid in Full renders with SAR 0.00 outstanding.
  4. Summary block present with `includePaymentHistory=false`.
  5. History section absent with toggle OFF.
  6. History section present + rows in returned order with toggle ON.
  7. Each row shows method label, amount, effective date, recording time, and reference when provided.
  8. `صباحاً`/`مساءً` in ar mode; `AM`/`PM` in en mode; digits are Latin.
  9. No UUIDs, ledger IDs, session IDs, idempotency keys, or raw method tokens appear anywhere in the HTML.
  10. Existing group headings and totals unchanged (regression guard).
- `src/components/finance/__tests__/InvoicePrintOptionsDialog.test.tsx`:
  11. Default toggle is OFF each time it opens.
  12. Toggle is disabled with explanation when `hasPayments=false`.
  13. Confirm emits the current toggle value + action; Cancel emits nothing.
- `src/components/finance/__tests__/InvoiceDetailsSheet.printWiring.test.tsx` (light):
  14. Print and Download both go through the same dialog and receive the same toggle value.
  15. Payment fetch failure aborts generation and surfaces a toast; no payment mutation is invoked.

Run: `bunx vitest run` on the three files plus existing `InvoiceDetailsSheet.paymentTime.test.tsx` and `paymentRpcCutover.test.ts`; then `bunx tsgo --noEmit`; then `bun run build`.

### R. Manual Acceptance Plan
Scenarios 1–4 exactly as spelled out in §19 of the request, executed against an Unpaid, Partially Paid, and Fully Paid (`INV-9920`) invoice in both Arabic and English, from both `InvoiceDetailsSheet` and `InvoicesList`, for both Print and Download.

### S. Database Changes Required
None.

### T. Files Created
- `src/components/finance/InvoicePrintOptionsDialog.tsx`
- `src/components/finance/__tests__/InvoicePDFGenerator.paymentSummary.test.ts`
- `src/components/finance/__tests__/InvoicePrintOptionsDialog.test.tsx`
- `src/components/finance/__tests__/InvoiceDetailsSheet.printWiring.test.tsx`

### U. Files Modified
- `src/components/finance/InvoicePDFGenerator.tsx`
- `src/components/finance/InvoiceDetailsSheet.tsx`
- `src/components/finance/InvoicesList.tsx`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/ar.ts`

### V. Production Objects Modified
None.

### W. Persistent Rows Modified
None.

### X. Current Roadmap
Phase 1 N+1A ✓ · Phase 2 N+1B ✓ · Phase 3 N+2 Slices 1–4 ✓ · Phase 4 N+3 Slice 1 = this slice · Slices 2+ (multi-invoice UI, allocation editor, receipts, reports) not started · Phase 5 N+4 not started.

### Y. Next Exact Action
`AWAIT USER APPROVAL OF THE INVOICE PAYMENT DISCLOSURE PLAN.`

---

`APPROVAL HANDOFF — SEND THIS EXACT MESSAGE`

> Approved. Execute Invoice Payment Disclosure Slice 1 only:
> - Modify `src/components/finance/InvoicePDFGenerator.tsx` to render an always-visible Payment Summary block (status, paid-to-date, outstanding) and an optional Payment History section (method, amount, effective date, recording time, reference) driven by new optional options.
> - Add `src/components/finance/InvoicePrintOptionsDialog.tsx` with `Include Payment History` toggle defaulting OFF on every open; disable it when the invoice has no payments.
> - Route Print and Download in `src/components/finance/InvoiceDetailsSheet.tsx` and `src/components/finance/InvoicesList.tsx` through the dialog, refetch the payment summary just-in-time via the existing `invoice-payments` query key, derive Unpaid/Partially Paid/Paid in Full from the ledger-truth hook, and pass identical options to both `downloadInvoicePDF` and `printInvoice`.
> - Add the minimum bilingual keys in `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts` listed in §L.
> - Add the three focused test files listed in §Q, then run `bunx vitest run` on them plus the existing payment tests, `bunx tsgo --noEmit`, and `bun run build`; report counts.
>
> Do NOT change Payment posting, RPCs, RLS, permissions, migrations, ledger rows, invoices, sessions, allocations, customer balances, idempotency, or on-screen Invoice Details. Do NOT begin the Phase-4 allocation editor, multi-invoice UI, refunds, reversals, void, chargeback, credit, overpayment, or Retail POS.

### Rollback
Revert the five modified files and delete the four new files. No data migration to undo.