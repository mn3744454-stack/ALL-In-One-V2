# Slice 2.1 — Payment Dialog UX Consolidation and PDF Horse-Allocation Disclosure

## A. Verdict

`SLICE 2 UX AND PDF ALLOCATION CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED`

## B. Evidence findings (screenshots 41/45/46/47/48 + INV-0986.pdf)

- **45**: Current dialog uses `sm:max-w-[550px]` — narrow modal that scrolls a lot.
- **46**: Items are listed with description + amount only; the Horse owner (Fatin/Maha) is **not** shown in the top summary. Users only learn horse attribution in the allocation cards further down.
- **47/48**: Payment Method rows appear **before** the Horse allocation cards. The two Horse cards each render below the tender rows, producing a long scroll and visually implying "Cash → Fatin, Card → Maha" (which is not the persisted truth).
- **INV-0986.pdf**: Payment Summary (Paid SAR 550, Outstanding SAR 100) and per-tender history (Cash 250, Card 300) print correctly. The **Horse distribution** (Fatin/Maha) recorded in `payment_horse_allocations` does not print.

## C. Current architecture

- **Dialog shell**: `src/components/finance/RecordPaymentDialog.tsx` uses `SafeFormDialog` with `sm:max-w-[550px] max-h-[90vh]`.
- **Width reference (Create Invoice)**: `src/components/finance/InvoiceFormDialog.tsx` L353 uses `sm:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0` — this is the approved shell to reuse.
- **Section order today**: Items summary → Invoice summary → Payment Date → Payment Method rows → PaymentAllocationEditor → totals → sticky footer. Allocation is AFTER methods.
- **Items summary**: Flat list from `useInvoiceItems`; no horse grouping.
- **Allocation editor**: `PaymentAllocationEditor.tsx` already groups items by horse bucket internally (via `itemsByBucket`) with labels `المخصص` and `المتبقي: X` — labels do NOT match the locked contract (`المبلغ المدفوع` / `المتبقي`), and `المخصص` is present. Proposal + reset + assignAll helpers already exist.
- **PDF**: `InvoicePDFGenerator.tsx` L282–315 renders per-tender rows (method, effective date, recorded at, amount). It does NOT group by Payment Session and does NOT render horse distribution.
- **PDF data source**: `fetchInvoicePaymentSummaryForPdf` reads `ledger_entries` only — no session join, no allocation fetch. `payment_session_id` exists on ledger rows (unselected). `get_payment_session` RPC exists in generated types with no frontend wrapper.

## D. Stale test finding

- File: `src/lib/finance/__tests__/n2_5InvoiceRpcRuntimeWiring.test.ts`
- Failing assertion (L126): `expect(payment).toContain('.rpc("post_invoice_payments"')` against `src/lib/finance/postLedgerForPayments.ts`, which was rewritten in N+2 Slice 3 to delegate to `postPaymentSession` (which calls `post_payment_session`). The legacy `post_invoice_payments` SQL function still exists in the migration (dead code) but is no longer invoked from the frontend.
- Verdict: **mechanically obsolete** for the frontend writer contract; the migration-level assertions in the same file (checking the SQL definition still contains the tokens) remain valid. The narrowest correction is to replace the frontend regex to assert `.rpc("post_payment_session"` in `src/lib/finance/postPaymentSession.ts` and read that file instead. No SQL removal in this slice.

## E. Read contract for PDF horse allocation

- Every payment ledger row already carries `payment_session_id` (nullable for historical rows before N+2 Slice 1 backfill was completed).
- Canonical read path: extend `fetchInvoicePaymentSummaryForPdf` to also `select("payment_session_id")`, then batch-load allocation rows via one query:
  - `payment_allocations` filtered by `invoice_id` + `payment_session_id IN (…)` — gives `client_level_amount` per session.
  - Nested `payment_horse_allocations(horse_id, amount)` — same join used by `useInvoicePriorAllocations`.
  - Resolve horse names in one `horses` `.in("id", …)` call.
- **No new backend RPC needed.** `get_payment_session` exists but returns single-session JSON; a direct batch SELECT is narrower for print-time enrichment.
- **Historical gap detection**: sessions whose ledger rows have `payment_session_id IS NULL` OR whose allocation query returns no rows → the PDF omits the "Payment Distribution" subsection for that session and prints methods + total only. No fabricated numbers, no warning banner.

---

## F. Desktop wireframe (approved shell)

```text
┌──────────────────────────────────────────────────────────────────┐
│  $  تسجيل دفعة — INV-0986                              [X]      │  sticky
├──────────────────────────────────────────────────────────────────┤
│  Invoice Items (grouped by Horse)                    [▼ collapse]│
│  ┌─────────────────────────────┬─────────────────────────────┐   │
│  │ 🐴 فاتن (Fatin) — 1 item   │ 🐴 مها (Maha) — 1 item     │   │
│  │   Emergency Visit  SAR 500  │   General Exam    SAR 150   │   │
│  │   Subtotal:        SAR 500  │   Subtotal:       SAR 150   │   │
│  └─────────────────────────────┴─────────────────────────────┘   │
│  Total: SAR 650   Paid: SAR 0   Outstanding: SAR 650             │
│                                                                  │
│  Payment Amount * [       550.00 ]     [ Pay Full Outstanding ]  │
│  Payment Date  * [ 26  ][ July ][ 2026 ]                         │
│                                                                  │
│  Payment Distribution   [Distribute by Items] [Distribute Equal] │
│  ┌─────────────────────────────┬─────────────────────────────┐   │
│  │ فاتن   remaining: SAR 500   │ مها    remaining: SAR 150   │   │
│  │ المبلغ المدفوع [ 400.00 ]   │ المبلغ المدفوع [ 150.00 ]  │   │
│  │ المتبقي:  SAR 100           │ المتبقي:  SAR 0             │   │
│  └─────────────────────────────┴─────────────────────────────┘   │
│                                                                  │
│  Payment Method Details                    [+ Add Method]        │
│  Cash    [ 250.00 ]  Ref [        ]      🗑                      │
│  Card    [ 300.00 ]  Ref [        ]      🗑                      │
├──────────────────────────────────────────────────────────────────┤  sticky
│ Amount 550  Allocated 550  Unallocated 0  After 100 │ [Cancel][$│
└──────────────────────────────────────────────────────────────────┘
```

Shell: `sm:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0` (identical to Create Invoice).

## G. Mobile wireframe

```text
┌───────────────────────────┐
│ $ تسجيل دفعة   [X]        │  sticky
├───────────────────────────┤
│ Items (2)         [▼]     │
│ 🐴 Fatin                  │
│   Emergency Visit  500    │
│ 🐴 Maha                   │
│   General Exam     150    │
│ Outstanding: SAR 650      │
│                           │
│ Payment Amount *          │
│ [       550.00       ]    │
│ [ Pay Full Outstanding ]  │
│ Date [26][Jul][2026]      │
│                           │
│ Payment Distribution      │
│ [Distribute by Items]     │
│ Fatin  remaining 500      │
│  المبلغ المدفوع [400.00]  │
│  المتبقي: SAR 100         │
│ Maha   remaining 150      │
│  المبلغ المدفوع [150.00]  │
│  المتبقي: SAR 0           │
│                           │
│ Payment Methods           │
│ Cash [250.00]  🗑         │
│ Card [300.00]  🗑         │
│ [+ Add Method]            │
├───────────────────────────┤  sticky
│ Allocated 550 / 550       │
│ [ Cancel ] [ $ تسجيل ]    │
└───────────────────────────┘
```

## H. Locked contracts

- **Section order**: Items (grouped by horse) → Payment Amount + Date + "Pay Full Outstanding" → Payment Distribution (buckets) → Payment Methods (tenders) → Sticky summary/footer.
- **Item grouping**: Group `useInvoiceItems` rows by `horse_id` / `lab_horse_id` / client-level. Header per horse: `الخيل: <name>` — <count> items; body: description + frozen `total_price`; subtotal per horse.
- **Payment amount**: single input + optional link "Pay Full Outstanding" (Arabic `دفع المبلغ كاملًا`). No Full/Partial segmented control.
- **Amount-change safety**: when the user changes `paymentAmount` after entering bucket values, the `validateBucketAllocations` result already flips to invalid (sum ≠ payment). We (1) leave user values intact but (2) surface a clear inline `الرصيد غير متطابق` badge and (3) disable Submit until user re-runs a helper or manually rebalances. This never silently trims allocations or auto-invents new ones.
- **Bucket card labels**: replace `المخصص` → `المبلغ المدفوع`; replace `المتبقي لها` → keep already-neutral `المتبقي`. `Remaining after this allocation = bucket.remaining − input` computed live and rendered under the input.
- **Allocation helpers**: keep both — "توزيع حسب البنود" (existing `applyProposal`, generalized so it also runs for partial payments) and add "توزيع بالتساوي" (cent-safe equal split respecting caps, with residual-cent redistribution to buckets still under cap). Both are explicit buttons and always editable.
- **Simple-flow bypass**: when composition has 0 horses (client-level only) OR 1 horse with no client-level, the `PaymentAllocationEditor` block is not rendered; allocation defaults to the sole bucket at submit — same as today.
- **Tender section**: unchanged behavior (methods, references, split tender, dup guard, idempotency fingerprint), moved below allocation.
- **Sticky summary**: `مبلغ الدفعة / المبلغ الموزع / غير الموزع / المتبقي بعد الدفع`.
- **PDF grouping**: for each distinct `payment_session_id`, print one block: header (effective date + recorded time + session total) → "Payment Methods" (tender rows already loaded) → "Payment Distribution" (persisted horse/client rows, when available). Sessions with unknown allocation print methods only. Rows without a session_id (legacy) group under a single "Historical" block, methods only.

## I. Execution-ready plan (4 steps)

### Step 1 — Widen and reorder RecordPaymentDialog

- **Files**: `src/components/finance/RecordPaymentDialog.tsx`.
- **Current**: `sm:max-w-[550px]`, sections in Items/Methods/Allocation order, label `المخصص`, `المتبقي لها` absent (already), `Pay Full Amount` present.
- **Proposed**: switch shell className to the Create-Invoice-parity `sm:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0`; reorder JSX so Amount+Date render first, then `<PaymentAllocationEditor>`, then the tender rows block; keep sticky header/footer; keep dirty-guard.
- **Financial impact**: none (payload builder untouched).
- **Payload impact**: none.
- **PDF impact**: none.
- **Bilingual impact**: reuses existing keys; no new keys in this step.
- **Desktop**: two-column-friendly width; grouped items sit comfortably side-by-side.
- **Mobile**: `w-[95vw]` collapses; existing stacking preserved.
- **Tests**: new `RecordPaymentDialog.layout.test.tsx` snapshot-asserting section order and dialog max-width class.
- **Risk**: low; layout only.
- **Rollback**: revert className + JSX reordering.

### Step 2 — Group Invoice Items by horse & rename allocation labels

- **Files**: `src/components/finance/RecordPaymentDialog.tsx` (Items summary block), `src/components/finance/PaymentAllocationEditor.tsx` (label swap + generalized proposal + equal-distribution helper), `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`.
- **Current**: flat items list; labels `المخصص`, `توزيع مقترح` only for full payments.
- **Proposed**:
  - Replace items summary block with a helper that buckets items by `horse_id` / `lab_horse_id` / client-level, renders `الخيل: <name>` header + item rows + horse subtotal, respecting `الخيل` (not `حصان`).
  - In `PaymentAllocationEditor.tsx`: change `finance.payments.allocation.allocated` Arabic value from `المخصص` to `المبلغ المدفوع`; add `finance.payments.allocation.remainingAfter` (`المتبقي`) rendered as live `bucket.remaining − input`; enable `applyProposal` for partial payments too; add `distributeEqually()` with cent-safe residual redistribution respecting caps.
  - Add keys: `finance.payments.groupedItems.horseHeader`, `.itemCount`, `.subtotal`, `.clientLevel`; rename `finance.payments.allocation.useProposal` label to `توزيع حسب البنود` / `Distribute by Items`; add `finance.payments.allocation.distributeEqually` / `توزيع بالتساوي`.
- **Financial impact**: none (helpers only fill inputs; all values remain user-editable and pass through existing `validateBucketAllocations`).
- **Payload impact**: none.
- **PDF impact**: none.
- **Bilingual impact**: adds Arabic strings using `الخيل`; no `حصان`, no gendered forms.
- **Desktop**: horse-grouped items render as a 2-column grid at ≥ md.
- **Mobile**: single-column stacking.
- **Tests**:
  - Extend `src/lib/finance/__tests__/allocationDistribution.test.ts` with equal-distribution + cap-respecting residual redistribution cases.
  - New `PaymentAllocationEditor.labels.test.tsx`: asserts `المبلغ المدفوع` present, `المخصص` absent from the input label, `المتبقي` updates live.
  - New `RecordPaymentDialog.itemGrouping.test.tsx`: 1 horse × 5 items groups under one header; 2 horses render distinctly; client-level renders its own group.
- **Risk**: label change is user-visible; contained via i18n keys.
- **Rollback**: revert label values + delete `distributeEqually` + revert `applyProposal` gating.

### Step 3 — PDF Payment Session grouping + horse distribution

- **Files**: `src/lib/finance/fetchInvoicePaymentSummary.ts`, `src/components/finance/InvoicePDFGenerator.tsx`, `src/components/finance/InvoiceDetailsSheet.tsx` and `src/components/finance/InvoicesList.tsx` (labels bundle only), `src/i18n/locales/*.ts`.
- **Current**: PDF prints a flat per-tender table; no session grouping; no distribution.
- **Proposed**:
  - Extend `fetchInvoicePaymentSummaryForPdf` to also select `payment_session_id`; then in one round-trip fetch `payment_allocations(id, payment_session_id, client_level_amount, payment_horse_allocations(horse_id, amount))` filtered by `tenant_id`, `invoice_id`, and `IN (session_ids)`; resolve horse names via one `horses` batch select. Return a new `sessions` array shaped `{ sessionId | null, effectiveDate, recordedAt, total, methods:[{method, amount, reference}], distribution?: { horses:[{name, nameAr, amount}], clientLevel?: number } }`. Sessions with no allocation rows or `sessionId === null` omit `distribution`.
  - Extend `InvoicePDFLabels` with keys: `paymentMethodsHeading`, `paymentDistributionHeading`, `clientLevelLabel`, `horseColumn`, `sessionLabel`.
  - In `InvoicePDFGenerator.tsx` replace the flat history table with a session-by-session block; each block renders header (localized date + 12h time + session total) → methods sub-table → distribution sub-table (when present). Preserve RTL/LTR, Latin digits, and existing styling; keep sessions grouped visually so page breaks fall between sessions when feasible (`page-break-inside: avoid` on each block).
  - Extend `InvoiceDetailsSheet.tsx` and `InvoicesList.tsx` labels bundles with the new keys (English + Arabic — Arabic uses `خيل`).
- **Financial impact**: none (read-only enrichment).
- **Payload impact**: none.
- **PDF impact**: new sub-sections inside the existing optional Payment History block; summary (status/paid/outstanding) unchanged.
- **Bilingual impact**: adds `خيل` distribution heading + `الطرق` methods heading + `التوزيع` label.
- **Desktop/Mobile**: PDF only; no on-screen change.
- **Tests**:
  - Extend `InvoicePDFGenerator.paymentDisclosure.test.ts`:
    - Session with methods+allocations renders both sub-blocks; distribution shows persisted horse names + amounts.
    - Session with methods only (no allocation rows) renders methods and omits distribution — no fabricated amounts, no warning banner.
    - Legacy ledger rows with `payment_session_id = null` group under a single Historical block, methods only.
    - Print/Download use identical enriched data (single fetch shared by both handlers).
    - History OFF omits every session block (unchanged privacy behavior).
- **Risk**: extra allocation query per PDF; scoped to invoice; sessions per invoice are small in practice.
- **Rollback**: revert `fetchInvoicePaymentSummaryForPdf` shape and PDF template to flat table.

### Step 4 — Realign the stale runtime-wiring test

- **File**: `src/lib/finance/__tests__/n2_5InvoiceRpcRuntimeWiring.test.ts`.
- **Current**: L126 asserts frontend still calls `.rpc("post_invoice_payments"`; N+2 Slice 3 moved the writer to `post_payment_session` via `src/lib/finance/postPaymentSession.ts`.
- **Proposed**: change the single frontend-writer assertion to read `src/lib/finance/postPaymentSession.ts` and expect `.rpc("post_payment_session"`. Keep every SQL-migration assertion untouched (the `post_invoice_payments` SQL body still exists in the migration and continues to be verified as internal historical contract).
- **Financial impact**: none.
- **Tests**: this test itself; verify green.
- **Risk**: none if the migration-level checks are preserved; documented as "mechanically proven stale" per §24.
- **Rollback**: revert single-line change.

## J. Database changes required

**None.** No RPC, no migration, no RLS, no permission, no schema change. All financial reads use existing tables/columns; all financial writes remain via `post_payment_session`.

## K. Files created / modified / production objects / persistent rows

- **Created**: no new source files; tests only (`RecordPaymentDialog.layout.test.tsx`, `PaymentAllocationEditor.labels.test.tsx`, `RecordPaymentDialog.itemGrouping.test.tsx`, expanded existing tests).
- **Modified**: `RecordPaymentDialog.tsx`, `PaymentAllocationEditor.tsx`, `fetchInvoicePaymentSummary.ts`, `InvoicePDFGenerator.tsx`, `InvoiceDetailsSheet.tsx`, `InvoicesList.tsx`, `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`, `n2_5InvoiceRpcRuntimeWiring.test.ts`, `allocationDistribution.test.ts`, `InvoicePDFGenerator.paymentDisclosure.test.ts`.
- **Production DB objects modified**: none.
- **Persistent rows modified**: none.

## L. Manual acceptance scenarios

Executed per §28 — 1 horse × N items, INV-0986 full, INV-0986 partial, equal distribution (partial), PDF w/o History, PDF w/ History (horses printed), multi-session invoice (each session grouped independently).

## M. Roadmap after this slice

- N+3 Slice 2 → CLOSED after this Slice 2.1.
- N+3 Slice 3 (Multi-Invoice UI) → NOT STARTED.
- N+3 Slice 4 (session detail / receipts) → NOT STARTED.
- N+4 → NOT STARTED.

## N. Next exact action

`AWAIT USER APPROVAL OF THE SLICE-2 UX AND PDF ALLOCATION PLAN.`

---

`APPROVAL HANDOFF — SEND THIS EXACT MESSAGE`

> Approved. Execute Phase N+3 Slice 2.1 exactly as planned: (1) widen `RecordPaymentDialog` to the Create-Invoice shell and reorder sections to Items(grouped-by-horse) → Amount + "Pay Full Outstanding" → Payment Distribution → Payment Methods → sticky summary; (2) group invoice items by horse using `الخيل`, rename the bucket input label to `المبلغ المدفوع`, render live `المتبقي` under each bucket, generalize `Distribute by Items` for partial payments, and add cent-safe `Distribute Equally`; (3) extend `fetchInvoicePaymentSummaryForPdf` to select `payment_session_id` and batch-load `payment_allocations` + `payment_horse_allocations` + horse names, and rewrite the PDF Payment History block into per-session groups with Payment Methods and Payment Distribution sub-sections, omitting distribution when allocation rows are missing; (4) realign the single stale frontend-writer assertion in `n2_5InvoiceRpcRuntimeWiring.test.ts` from `post_invoice_payments` to `post_payment_session` while preserving every SQL-migration assertion. Add only the files listed in §K, add the specified bilingual keys (Arabic uses `الخيل` in the dialog and `خيل` in the PDF per the locked contract), and run the focused tests, `bunx tsgo --noEmit`, and `bun run build`; report counts.
>
> Do NOT modify the payment backend, `post_payment_session`, `get_payment_session`, RPCs, migrations, RLS, permissions, invoice rows, ledger rows, payment sessions, payment allocations, horse allocations, customer balances, idempotency semantics, or the Payment PDF privacy toggle from Slice 1. Do NOT begin Multi-Invoice Payment UI, item-level payment ledger, horse ledger, installment schedules, refunds, reversals, void, chargeback, credit, overpayment, or Retail POS.
