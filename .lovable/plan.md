## A. Verdict

**SLICE 3.1 FINAL ALIGNMENT COMPLETE — EXECUTION-READY PLAN PROVIDED**

Frontend-only. `payment_allocations.external_reference` (text, nullable) already persists per-tender references; `payment_sessions.reference_note` (text, nullable) is the session-level slot. No backend, RPC, RLS, grant, migration or persistent-row change is required.

## B. Invoice-Page Secondary Entry — Current State

- `src/pages/DashboardFinance.tsx` has only `{t("finance.invoices.create")}` (L148–155). No "Record Client Payment" button, no `MultiInvoicePaymentDialog` import, no client-selection flow.
- Verdict: **not yet implemented** — Slice-3 contract not satisfied.

Locked required implementation:

- Add a secondary action button labelled `تسجيل دفعة للعميل` / `Record Client Payment` in the same header row as `Create Invoice` (adjacent, secondary variant, wraps on mobile).
- On click open a new lightweight `ClientPickerDialog` (single Client combobox from `useClients`, tenant-scoped). On confirm, store `selectedClientId` and open the shared `MultiInvoicePaymentDialog` with that id.
- Client change semantics: closing/changing the client resets `selectedIds`, `amounts`, tender rows (single clean row with first unused method), `bucketValuesByInvoice`, `bucketValidByInvoice`, `paymentDate` (to today), and `idempotencyRef` — because the dialog is unmounted/remounted per client (`key={selectedClientId}`), all `useState` and `useEffect` state resets automatically. No manual clear logic required beyond the existing on-open reset (L131–141 of `MultiInvoicePaymentDialog.tsx`).
- Same shared dialog. No second payment workflow. No duplicated markup.

## C. Reference Persistence Trace


| Layer                        | Reference field                                                                                                                                                                                                                                    | Session-level or Tender-level?                                              | Persisted?                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| UI Tender row                | `TenderRow.reference` in `MultiInvoicePaymentDialog.tsx` (also same in `RecordPaymentDialog.tsx`)                                                                                                                                                  | Tender-level                                                                | Only through the allocation payload — not stored as a form field                                                                         |
| Generated allocation row     | `PaymentSessionAllocation.external_reference` (`postPaymentSession.ts` L16), assigned per row in `buildAllocationsPayload` L267–269 from `tender.reference.trim()`                                                                                 | Tender-level (copied to every derived (invoice,method) row for that tender) | Yes, one per allocation                                                                                                                  |
| Wrapper payload              | `PaymentSessionPayload.reference_note` (session-level, currently unused by dialogs) and `PaymentSessionPayload.external_reference` (top-level, currently populated from the general Reference input at `MultiInvoicePaymentDialog.tsx` L306, L313) | Session-level                                                               | Depends on RPC — `payment_sessions` table has only `reference_note`; top-level `external_reference` is redundant with per-row references |
| Installed RPC                | `post_payment_session` — accepts `p_payload` JSON with `payment_date`, allocations list, and (per prior audits) writes each allocation's `external_reference` into `payment_allocations.external_reference`                                        | Both layers                                                                 | Yes (allocation row); session-level uses `reference_note`                                                                                |
| Database row                 | `payment_allocations.external_reference` text nullable (verified via information_schema); `payment_sessions.reference_note` text nullable                                                                                                          | Both                                                                        | Yes                                                                                                                                      |
| Payment-session reader / PDF | `fetchInvoicePaymentSummary` and PDF reader already surface `external_reference` per allocation (Slice 2 accepted)                                                                                                                                 | Tender-level                                                                | Yes                                                                                                                                      |


## D. Exact Reference Contract — **Contract A**

Tender-level references are fully supported and already persisted via `payment_allocations.external_reference`. Therefore in `MultiInvoicePaymentDialog.tsx`:

- Delete the general Reference `Input` (L395–406), its `externalReference` state (L126), its `setExternalReference(...)` reset (L138), and its use in the RPC call (L306, L313).
- Keep the fingerprint using per-row `external_reference` values already sorted in `multiInvoicePaymentFingerprint.ts` L38–44. Remove the top-level `external_reference` entry (L51) since it is no longer supplied — idempotency remains sensitive to every tender's reference through the per-row values.
- `RecordPaymentDialog.tsx` general reference is out of scope (Single-Invoice accepted); no change there.
- No data loss: each tender's reference propagates to every derived allocation row via `buildAllocationsPayload` (L268), which is what the RPC persists.

## E. Tender Duplicate / Add Behavior (locked)

Behavior encoded in the extracted `PaymentTenderEditor` and used by both dialogs:

1. New row selects the first method in `["cash","card","transfer","check"]` not currently used by any row.
2. When all four are used, `Add Payment Method` is **disabled** — no fallback row, no duplicate `cash`.
3. Removing a row frees its method.
4. Method `<Select>` items for a given row disable/omit methods already in use by any other row (the row's own current method remains selectable).
5. At least one row always present (last remove is disabled).
6. `Add Payment Method` button is rendered directly beneath the last tender card.
7. Same controlled logic in Single- and Multi-Invoice flows; extraction preserves the accepted Single-Invoice behaviour exactly (methods list, amount input, per-tender reference input, remove control).

Duplicate detection (`duplicateTenderMethod`) becomes bare-method equality across rows and no longer treats references as a distinguishing key.

## F. KPI Metric and Label Truth — **Outcome B → resolvable in-scope**

Current metrics in `DashboardFinance.tsx` L74–85 and L94–145:

- Card 1 = `invoices.length` (count) → label `totalInvoices`
- Card 2 = count of `approved|shared` (count) → label `pendingInvoices`
- Card 3 = `sum(total_amount) where status='paid'` (money, uses `formatAmount`) → currently labelled `paidAmount`
- Card 4 = `sum(total_amount) where status='overdue'` (money, uses `formatAmount`) → currently labelled `overdueAmount`

Cards 3 and 4 display money, not counts. The user's locked requirement is `Paid Invoices` / `Overdue Invoices` (both interpreted as counts by wording). To satisfy the locked labels without misleading users, switch cards 3 and 4 to counts:

- Card 3 = count of `status='paid'`, formatted as an integer, label `paidInvoices`.
- Card 4 = count of `status='overdue'`, formatted as an integer, label `overdueInvoices`.
- Update `finance.invoiceStats.paidAmount` → `paidInvoices` (`Paid Invoices` / `الفواتير المدفوعة`), and `overdueAmount` → `overdueInvoices` (`Overdue Invoices` / `الفواتير المتأخرة`). `totalInvoices` and `pendingInvoices` already correct.

This aligns metric shape with label wording; no shared status keys are mutated.

## G. Complex-Invoice React Architecture (Rules-of-Hooks safe)

Add `src/components/finance/MultiInvoiceComplexAllocationCard.tsx`:

- Props: `invoice: EligibleInvoice`, `paymentAmount: number`, `currency`, `value: Record<string,string>`, `onChange(next)`, `onValidityChange(valid)`, `onCompositionResolved({isComplex: boolean, canPayHere: boolean})`.
- Calls `useInvoicePriorAllocations(invoice.id)` inside the child (single Hook, unconditional in the child scope).
- While loading → shows a small skeleton row; on error or unsupported (lab-horse-only) → surfaces localized `notSupported` state and reports `canPayHere=false` upward so the parent can block submission and hint the user to unselect.
- If composition indicates simple (single canonical horse or client-level only) → renders nothing (reports `isComplex=false`, `canPayHere=true`); the parent's default payload path handles it.
- If composition indicates multi-horse or horse+client-level → renders `<PaymentAllocationEditor …/>` with `paymentAmount` fed from `invoiceAmountsUnits[invoice.id]`; bubbles up bucket values + validity.

Parent `MultiInvoicePaymentDialog.tsx`:

- Iterates only over `selectedInvoices` and renders one `MultiInvoiceComplexAllocationCard` per entry. No `useInvoicePriorAllocations` call at the parent, no conditional/loop hooks — the Hook lives in the child, which is a normal component instance.
- Maintains `bucketValuesByInvoice[id]` and `bucketValidByInvoice[id]` keyed by invoice id; entries are pruned in `toggleInvoice(id, false)`.
- Unselected invoices unmount their child, so no query runs for them.
- `canSubmit` gains `every(selected).canPayHere && every complex bucket valid`.
- On submit, `bucketBreakdownByInvoice[id]` is built from card outputs and passed to `buildAllocationsPayload` (existing signature supports it).

## H. Exact Files Added or Modified

Added:

- `src/components/finance/PaymentTenderEditor.tsx`
- `src/components/finance/MultiInvoiceComplexAllocationCard.tsx`
- `src/components/finance/ClientPickerDialog.tsx`
- `src/components/finance/__tests__/MultiInvoicePaymentDialog.test.tsx`
- `src/components/finance/__tests__/PaymentTenderEditor.test.tsx`
- `src/components/finance/__tests__/DashboardFinanceRecordClientPayment.test.tsx`

Modified:

- `src/components/finance/MultiInvoicePaymentDialog.tsx` (section reorder, remove general reference, use `PaymentTenderEditor`, use `MultiInvoiceComplexAllocationCard`, footer wording, gating, oldest-first fix)
- `src/components/finance/RecordPaymentDialog.tsx` (swap inline tender markup for `PaymentTenderEditor`; no behaviour change)
- `src/components/finance/EligibleInvoicesSelector.tsx` (summary header, localized statuses, labelled input, `remainingAfterPayment`, `allocationEnabled` prop)
- `src/pages/DashboardFinance.tsx` (Record Client Payment button + ClientPicker wiring, KPI cards 3/4 switch to counts)
- `src/pages/finance/FinanceCustomerBalances.tsx` (no logic change — already uses shared dialog; verify prop shape)
- `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts` (new multiInvoicePayment keys, rename `paidAmount→paidInvoices`, `overdueAmount→overdueInvoices`, add `recordClientPayment`, `selectClient`, `remainingToAllocate`, `overAllocationBy`, `paymentsExceedOutstandingBy`, `notSupported`, etc.)
- `src/lib/finance/multiInvoicePaymentFingerprint.ts` (drop top-level `external_reference`)
- `src/lib/finance/__tests__/multiInvoicePaymentFingerprint.test.ts` (update expectations)

## I. Updated Three-Step Execution Plan

**Step A — Payment-first layout, shared tender UX, secondary entry, KPI truth**

- Reorder `MultiInvoicePaymentDialog` scroll body to: Client summary → Payment Date row → `PaymentTenderEditor` (Payment Methods) → Total Payments → `EligibleInvoicesSelector` (with summary header + localized statuses + labelled input + gating on tenderTotal>0) → per-selected-invoice `MultiInvoiceComplexAllocationCard` → sticky footer.
- Extract `PaymentTenderEditor` from `RecordPaymentDialog`; enforce the E-locked add/duplicate rules; render `Add Payment Method` beneath the last row and disable when all four methods used.
- Remove the general Reference input, state, RPC arg, and top-level fingerprint contribution.
- Add `ClientPickerDialog` + `Record Client Payment` button on `DashboardFinance`; mount `MultiInvoicePaymentDialog` keyed by `selectedClientId` so state fully resets on client change.
- Switch KPI cards 3 & 4 to invoice counts and rename i18n keys/values to `paidInvoices` / `overdueInvoices` per §F.
- Rollback: revert listed files.

**Step B — Reconciliation, oldest-first, and inline complex-invoice completion**

- Replace footer `Difference` with state-aware `Remaining to Allocate to Invoices` (non-negative), destructive inline `overAllocationBy` alert, and `paymentsExceedOutstandingBy` alert that disables submit. Never render a negative amount.
- Remove the on-mount auto-proposal (`useEffect` at L145–164); oldest-first only fires from the explicit button. Disable per-row amount inputs and the oldest-first button whenever `tenderTotal <= 0`.
- Implement `MultiInvoiceComplexAllocationCard` per §G; wire its outputs into `bucketBreakdownByInvoice` for `buildAllocationsPayload`; enforce `canPayHere` and bucket validity in `canSubmit`. Simple / client-level-only invoices render no editor and pass no breakdown (server-side canonical resolution unchanged).
- Rollback: revert listed files.

**Step C — Focused verification**

- Add the six new test files in §H; extend `multiInvoiceDistribution` + fingerprint tests for `bucketBreakdownByInvoice` and dropped top-level reference.
- Commands: `bunx vitest run src/components/finance/__tests__ src/lib/finance/__tests__`, then `bunx tsgo --noEmit`, then `bun run build`. Report pass/fail/skip/warn counts. No live DB claims.
- Manual acceptance: Scenarios 1–9 from the prior audit plus §9 items 1–3 (Record Client Payment).
- Rollback: delete new test files.

## J. Updated Focused Tests

Cover items 1–20 from §9 in the request. Notable additions:

- `DashboardFinanceRecordClientPayment.test.tsx`: button renders, opens `ClientPickerDialog`, requires a client, then opens `MultiInvoicePaymentDialog`; changing client remounts the dialog with fresh state (assert cleared invoice selection, amounts, tender rows, no stale idempotency).
- `PaymentTenderEditor.test.tsx`: add-row picks first unused method; button disables at 4 rows; removing a row frees its method; select excludes methods used elsewhere; single row cannot be removed.
- `MultiInvoicePaymentDialog.test.tsx`: per-row `external_reference` reaches `postPaymentSession` payload per tender; tender B's reference never leaks into rows derived from tender A; multi-horse mock renders `MultiInvoiceComplexAllocationCard`; unselected invoices never trigger a composition query (spy on `useInvoicePriorAllocations`); one atomic RPC call submits every selected invoice.
- KPI test: `DashboardFinance` renders integer counts for cards 3 & 4 with the exact Arabic and English strings.

## K. Database Change Required

None. `payment_allocations.external_reference` and `payment_sessions.reference_note` already exist and are used.

## L. Roadmap

- Phase 1/2/3 closed. Phase 4 Slice 1/2 closed. Slice 3 remains PARTIALLY IMPLEMENTED until this plan lands. Slice 4 not started. Phase 5 not started.

## M. Next Exact Action

AWAIT USER APPROVAL OF THE SLICE 3.1 FINAL ALIGNMENT PLAN.

---

## APPROVAL HANDOFF

> APPROVED — EXECUTE PHASE N+3 SLICE 3.1 FINAL — MULTI-INVOICE PAYMENT COMPLETION.
>
> Authorised, frontend-only:
>
> - Reorder MultiInvoicePaymentDialog to: Client Summary → Payment Date → Payment Methods → Total Payments → Eligible Invoice Summary → Invoice Selection & Allocation → inline complex-invoice Horse/Client-Level allocation → compact sticky footer.
>
> - Extract PaymentTenderEditor from RecordPaymentDialog and reuse it in MultiInvoicePaymentDialog with identical accepted Single-Invoice behaviour. Add Payment Method renders directly below the last tender row. A new tender row selects the first currently unused method from cash/card/transfer/check; when all four are used, Add Payment Method is disabled — no cash fallback, no duplicate row. Removing a row frees its method. The method selector excludes methods already used by another row. At least one row is always present.
>
> - Remove the duplicated general Reference field (input, state, RPC arg, and top-level fingerprint contribution). Per-tender references remain authoritative and are persisted per allocation row via payment_allocations.external_reference, which the installed post_payment_session already writes. Idempotency stays sensitive to every tender's reference through the per-row values.
>
> - Add a secondary Invoice-page entry point on DashboardFinance: a "تسجيل دفعة للعميل / Record Client Payment" button next to Create Invoice. Clicking it opens a ClientPickerDialog that requires client selection, then opens the shared MultiInvoicePaymentDialog for that client. Mount the dialog with key={selectedClientId} so switching client fully resets selected invoices, amounts, tender rows, complex-invoice allocations, validation, and idempotency state.
>
> - Add an eligible-invoice summary header (Eligible count, Total Outstanding, Selected X of Y, Selected Outstanding) using the session currency. Localise status badges through the existing finance.invoices.statuses.* dictionary. Label the per-invoice allocation input and show "Remaining after payment" per row.
>
> - Gate per-invoice allocation inputs and Allocate Oldest First until Total Payments is positive. Remove the initial auto-proposal for preselected invoices; oldest-first only fires from the explicit button.
>
> - Replace the Difference footer with state-aware "Remaining to Allocate to Invoices" (never negative). Positive over-allocation surfaces a localized inline validation and disables submission. Total Payments greater than total eligible outstanding also blocks submission with its own localized message.
>
> - Keep exactly one Allocate Oldest First action (due date → issue date → invoice number → invoice id tie-breaker); no equal-distribution across invoices; no auto-submit.
>
> - For every selected invoice, mount a MultiInvoiceComplexAllocationCard that calls useInvoicePriorAllocations(invoiceId) inside itself (Rules-of-Hooks safe; no conditional/loop hooks in the parent). The card renders PaymentAllocationEditor inline only for multi-horse or horse+client-level invoices, bubbles bucket values and validity to the parent, and blocks payment on unsupported lab-horse-only compositions. Simple one-horse and client-level-only invoices render no editor. Unselected invoices never load composition.
>
> - Submit all selected invoices in one atomic postPaymentSession call. Include Horse and Client-Level amounts for every complex invoice via buildAllocationsPayload's bucketBreakdownByInvoice.
>
> - Switch DashboardFinance KPI cards 3 and 4 from monetary totals to invoice counts so the "Paid Invoices" / "Overdue Invoices" labels are truthful; rename translation keys paidAmount→paidInvoices and overdueAmount→overdueInvoices and set the exact Arabic (إجمالي الفواتير / الفواتير المعلقة / الفواتير المدفوعة / الفواتير المتأخرة) and English values. Do not mutate the older shared status keys.
>
> - Add the focused Vitest coverage described in §J. Run bunx vitest run, bunx tsgo --noEmit, and bun run build; report pass/fail/skip/warn counts.
>
> Prohibited:
>
> - Silently dropping any payment reference.
>
> - Duplicate tender methods.
>
> - Conditional or looped Hook calls.
>
> - Deferring the Invoice-page secondary entry.
>
> - Deferring supported complex-invoice allocation to Slice 4.
>
> - Backend migrations, RPC, RLS, or grant changes (reference persistence already exists; no mechanical contradiction).
>
> - Overpayment, client credit, refunds, reversals, receipts, reports, PDF changes, Retail POS.
>
> - Redirecting supported multi-horse invoices to the Single-Invoice dialog.
>
> - Modifying persistent invoices, payments, allocations, ledger entries, or customer balances during implementation.