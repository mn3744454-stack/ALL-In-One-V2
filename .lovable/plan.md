
# Phase N+3 · Slice 2 — Single-Invoice Payment Allocation Editor

## A. Verdict
`SINGLE-INVOICE PAYMENT ALLOCATION CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED`

The installed `public.post_payment_session` RPC already accepts `client_level_amount` and `horse_allocations[]` per allocation row, and `postPaymentSession` typings already expose them. No backend change is required for Stable/mixed invoices. Lab-only horse allocation (`lab_horse_id` without `horse_id`) remains unsupported by the RPC and is preserved behind the existing block.

## B. Screenshot Findings
- **Screenshot 40**: Current `RecordPaymentDialog` shows the Phase-4 block (`requiresPhase4Allocation`) with `تشمل هذه الفاتورة أكثر من حصان...` and disables submit. Nothing else is broken.
- **Screenshot 41**: `INV-0986` — invoice_items already carry `horse_id` (Fatin 500, Maha 150) with correct `total_price` and horse-scoped attribution rendered in `InvoiceDetailsSheet`. Data model is ready.

## C. Current Payment Dialog Architecture
`InvoiceDetailsSheet` → `RecordPaymentDialog` → `useInvoicePayments` → `postLedgerForPayments` → `postPaymentSession` → `public.post_payment_session`.
- `useInvoicePayments` computes `requiresPhase4Allocation` from an `invoice_items` composition query (`distinctHorses > 1 || (distinctHorses ≥ 1 && hasClientLevel)`) and throws `FIN_HORSE_ALLOCATION_REQUIRED` before contacting the RPC.
- `postLedgerForPayments` builds one `PaymentSessionAllocation` per tender row; currently it never sets `client_level_amount` or `horse_allocations`.
- Idempotency: fingerprint keyed on `(invoiceId, paymentDate, rows[a/m/r/n])`. Adding allocation extends the fingerprint.

## D. Current Invoice-Item Data
`invoice_items` columns used: `id, description, quantity, unit_price, total_price, horse_id, lab_horse_id, package_id, category_name_snapshot, service_name_snapshot, position`. Financial contribution = `total_price > 0`. No `line_gross_amount` column exists — `total_price` is the frozen line total.

Package handling: rows with `package_id IS NOT NULL AND total_price > 0` are the financial "package parent"; child snapshot rows in `package_services_snapshot` are informational only and never appear as separate `invoice_items` rows. Classifier keys on the parent row's `horse_id`.

## E. Financial Item Classifier (pure)
```
if total_price <= 0     → non-financial (display-only, excluded)
else if horse_id != null → horse-scoped (bucket = horse_id)
else if lab_horse_id != null → lab-horse-scoped (LAB boundary — Section L)
else                    → client-level (bucket = "__client__")
```
No parsing of descriptions, no catalog lookups, no positional grouping.

## F. Item-to-Horse Display
Reuse `InvoiceLineWithHorse` composition already used by `InvoiceDetailsSheet`. Each row shows: item description + horse label (`الخيل: فاتن` / `Horse: Fatin`) or client-level pill, and frozen `total_price`. Horse name resolved via existing `useHorses` cache (fallback to a stable fetch by ids used elsewhere). Never render raw uuids.

## G. Full-Payment Proposal
When `paymentAmount ≈ outstandingAmount` (±0.01), initial allocation = `remainingAttributablePerBucket` (Section K). Displayed and **editable** (safer than silent submit: preserves user intent to override). Proposal is capped per-bucket by `remainingAttributable` and the total is guaranteed equal to Payment amount by construction; if the user edits, submit re-validates.

## H. Partial-Payment Contract
No proration. All buckets start at `0`. Live indicators: allocated total, unallocated remainder, per-bucket remaining. Submit disabled unless `Σ bucketAllocations === paymentAmount` (rounded to cents), no negatives, no fractions > 2 decimals, each bucket ≤ its `remainingAttributable`.

## I. Split-Tender Contract
The RPC treats horse/client allocation as a **per-allocation-row** dimension. Chosen mapping: the editor collects a **single invoice-scoped bucket allocation** (Fatin/Maha/Client) and a separate **tender breakdown** (Cash/Card/…). At submit time, bucket amounts are distributed across tender rows using a **stable proportional split rounded to cents with residual assigned to the largest tender**. Each resulting `PaymentSessionAllocation` carries its own `horse_allocations[]` + `client_level_amount` summing to that row's `amount`. Guarantees:
- `Σ(row.amount) == totalPayment`
- for every bucket: `Σ across rows == bucketAllocation`
- no duplicate `(invoice, method)` — existing pre-RPC guard preserved
- `external_reference` per tender row preserved

## J. Mixed Horse + Client-Level Contract
Separate "Client-Level" bucket surfaced only when `hasClientLevel` composition is true. Its allocation maps to `client_level_amount` (never to a horse_id). Fatin services + client-level admin fee → two independent buckets; user assigns each explicitly.

## K. Previous Allocation & Remaining Limits
One canonical read via a new hook `useInvoicePriorAllocations(invoiceId)`:
```
select payment_allocations.id, client_level_amount,
       payment_horse_allocations(horse_id, amount)
from payment_allocations
left join payment_horse_allocations on ...
where invoice_id = :id
```
Compute per-bucket:
- `grossPerBucket` = sum of `invoice_items.total_price` grouped by classifier bucket
- `priorPerBucket` = sum of horse allocations + client_level_amount for that invoice
- `remainingAttributable = max(0, gross - prior)`
Outstanding invoice number still comes from `useInvoicePayments.summary.outstandingAmount` (ledger truth). Sanity assert: `Σ remainingAttributable ≈ outstandingAmount` — mismatch → surface `FIN_ALLOCATION_HISTORY_UNRESOLVED` and block.

## L. Laboratory Boundary
The installed RPC accepts only `horse_id` in `horse_allocations` (no `lab_horse_id`). Lab invoices with only `lab_horse_id` remain unsupported for horse-scoped allocation. Behavior:
- lab_horse only, single scope, no client-level → allowed as today (client-level-style flow, no editor needed)
- multi lab_horse, or mixed lab_horse + horse_id → **keep the existing block** with a clearer bilingual message; Slice 2 does not attempt to invent a `lab_horse → horse` mapping.

## M. Mobile UX
Same `SafeFormDialog` shell. Section order (top→bottom): (1) collapsible Invoice Items with horse labels, (2) Payment amount + full/partial helper, (3) Allocation buckets (Horse cards + Client-Level card) with per-bucket remaining + input + quick "assign remainder", (4) Tender rows (existing), (5) sticky footer with `Allocated / Payment / Unallocated`, disabled-submit reason, Cancel/Submit. Numeric inputs `inputMode="decimal"`, RTL-safe with `dir="ltr"` for amounts, IBM Plex, existing tokens only.

## N. Backend Compatibility
Verified against live `pg_get_functiondef('post_payment_session')`. `p_payload.allocations[i]` accepts `payment_method`, `amount`, `client_level_amount`, `horse_allocations:[{horse_id, amount}]`, `external_reference`. Aggregates across allocations for the same `(invoice, horse)` are summed on the server for the response. **No RPC change needed.**

## O. Exact Files Proposed for Modification
Created:
- `src/hooks/finance/useInvoicePriorAllocations.ts`
- `src/lib/finance/allocationDistribution.ts` (pure bucket→tender splitter + validators)
- `src/components/finance/PaymentAllocationEditor.tsx`
- `src/components/finance/__tests__/allocationDistribution.test.ts`
- `src/components/finance/__tests__/PaymentAllocationEditor.test.tsx`
- `src/lib/finance/__tests__/paymentAllocationPayload.test.ts`

Modified:
- `src/hooks/finance/useInvoicePayments.ts` — accept optional `allocation` (bucket map) in `recordPayment`, pass through; keep block only for lab-horse unsupported shapes; extend fingerprint with bucket map.
- `src/lib/finance/postLedgerForPayments.ts` — accept optional `bucketAllocations`; when present, distribute across rows and set `horse_allocations` / `client_level_amount` per allocation.
- `src/components/finance/RecordPaymentDialog.tsx` — mount `PaymentAllocationEditor` in place of the current block for supported shapes; keep the block only for lab-horse-unsupported invoices.
- `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` — new keys under `finance.payments.allocation.*` (`title`, `clientLevel`, `remaining`, `allocated`, `unallocated`, `assignAll`, `remainderMismatch`, `overBucket`, `labUnsupported`, `historyUnresolved`, `useProposal`, `resetProposal`, plus error mappings for `FIN_HORSE_ALLOCATION_MISMATCH`, `FIN_CLIENT_LEVEL_ALLOCATION_INVALID`, `FIN_HORSE_NOT_ON_INVOICE`).

## P. Execution-Ready Plan (4 steps)

### Step 1 — Data & distribution primitives
- **Files**: `useInvoicePriorAllocations.ts`, `allocationDistribution.ts`.
- **Current**: no per-bucket read; no bucket→tender splitter.
- **Proposed**: hook returns `{ buckets: {key, kind, horseId?, label, gross, prior, remaining}[], outstanding }`; splitter returns `PaymentSessionAllocation[]` given tender rows + bucket map.
- **Payload impact**: none yet (helpers only).
- **Backend impact**: none.
- **Bilingual**: none.
- **Mobile**: none.
- **Tests**: `allocationDistribution.test.ts` — full/partial/split/mixed/rounding-residual/no-negatives.
- **Rollback**: delete files.

### Step 2 — Allocation editor UI
- **File**: `PaymentAllocationEditor.tsx`.
- **Current**: block-only alert.
- **Proposed**: per-bucket cards with description, horse label, remaining, input; totals bar; proposal button when payment==outstanding.
- **Payload impact**: emits `{ bucketKey → amount }` upward; no direct RPC.
- **Backend impact**: none.
- **Bilingual**: new `finance.payments.allocation.*` keys (EN/AR, `خيل`).
- **Mobile**: mobile-first vertical stack, sticky totals inside scroll area.
- **Tests**: component test — display, proposal fill, over-bucket disables, unallocated disables, negative/fraction rejected, mixed shows client-level bucket.
- **Rollback**: revert file + i18n additions.

### Step 3 — Writer wiring
- **Files**: `postLedgerForPayments.ts`, `useInvoicePayments.ts`.
- **Current**: builds allocations without horse/client-level.
- **Proposed**: when `bucketAllocations` provided, call `distributeAcrossTenders` and attach `horse_allocations` + `client_level_amount` per row; extend idempotency fingerprint with the bucket map; when absent (single-bucket invoices) keep today's payload byte-for-byte.
- **Payload impact**: adds optional fields already accepted by the RPC.
- **Backend impact**: none.
- **Bilingual**: extend `ERROR_TOKEN_KEYS` with mismatch/overflow codes.
- **Mobile**: n/a.
- **Tests**: `paymentAllocationPayload.test.ts` — multi-horse, mixed, split-tender, prior-reduced remaining, no-double-count, unchanged single-horse payload.
- **Rollback**: revert both files (fingerprint reverts too).

### Step 4 — Dialog integration & gate replacement
- **File**: `RecordPaymentDialog.tsx`.
- **Current**: renders block alert when `requiresPhase4Allocation`.
- **Proposed**: for supported shapes, render `PaymentAllocationEditor` and pass bucket map into `recordPayment`; retain a narrower block (with `finance.payments.allocation.labUnsupported`) only when unsupported lab-horse composition is detected. Single-horse and client-level-only invoices bypass the editor and keep today's flow unchanged.
- **Payload impact**: via Step 3.
- **Backend impact**: none.
- **Bilingual**: consumes Step 2 keys.
- **Mobile**: layout audited in Section M.
- **Tests**: component test — INV-0986-like fixture renders 2 buckets, proposal fills 500/150, submit calls writer with correct payload; lab-horse-unsupported fixture still shows block.
- **Rollback**: restore previous return branch.

## Q. Compact Test Plan
20 assertions per §19 across `allocationDistribution.test.ts`, `PaymentAllocationEditor.test.tsx`, `paymentAllocationPayload.test.ts`, plus untouched existing `paymentRpcCutover.test.ts` re-run. No SQL harness. Commands: `bunx vitest run` on the new + existing payment tests, `bunx tsgo --noEmit`, `bun run build`.

## R. Manual Acceptance Plan
Scenarios 1–5 exactly as specified (§20). Not claimed here.

## S. Database Changes Required
None.

## T. Files Created
See §O — 6 files.

## U. Files Modified
See §O — 5 files.

## V. Production Objects Modified
None.

## W. Persistent Rows Modified
None.

## X. Current Roadmap
Phase 1–3 closed. Phase 4 Slice 1 closed. Slice 2 (this plan) pending approval. Slices 3–4 and Phase 5 untouched.

## Y. Next Exact Action
`AWAIT USER APPROVAL OF THE SINGLE-INVOICE ALLOCATION PLAN.`

---

`APPROVAL HANDOFF — SEND THIS EXACT MESSAGE`

> Approved. Execute Phase N+3 Slice 2 exactly as planned: implement the single-invoice Payment Allocation Editor with per-item horse display, horse-scoped and client-level allocation buckets, full/partial/split-tender support, proposal for full payments, prior-allocation-aware remaining limits, and safe replacement of the existing block. Wire it through `useInvoicePayments` → `postLedgerForPayments` → `postPaymentSession` using the existing RPC contract (no backend change). Add only the files listed in §O, add the specified bilingual keys (Arabic uses `خيل`), and run the focused tests, `bunx tsgo --noEmit`, and `bun run build`; report counts. Do NOT implement Multi-Invoice UI, refunds, reversals, void, chargeback, credit, overpayment, or Retail POS. Do NOT modify RPCs, RLS, permissions, migrations, ledger rows, invoices, sessions, allocations, customer balances, idempotency semantics, or the Payment PDF from Slice 1.
