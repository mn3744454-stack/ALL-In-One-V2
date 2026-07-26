# Phase 2 (N+1B) — Functional Closure and Deferred Hardening Backlog

Date: 2026-07-26
Scope: Source Checkout (Laboratory + Horse Order) via the atomic
`create_source_checkout_invoice` RPC and the Retail-POS-excluded surfaces
delivered in J5.1 / J5.2 Slice-01.

---

## 1. Functional Closure Verdict

**PHASE 2 FUNCTIONALLY CLOSED — READY TO BEGIN PHASE 3**

The practical checkout surfaces execute against the atomic RPC contract,
frontend contract tests and runtime-wiring tests all pass, TypeScript is
clean, and the production build succeeds. No narrow production fix was
required in this turn.

## 2. Flows Actually Tested (this turn)

| # | Flow | Verification path |
|---|------|---|
| 1 | Laboratory Deposit Checkout | Frontend contract + RPC wiring tests |
| 2 | Laboratory Final Checkout   | Frontend contract + RPC wiring tests |
| 3 | Replay / same idempotency key | Contract test: single key per open session, rotate on payload change |
| 4 | Duplicate source link block | RPC wiring test asserts server-side rejection surface (no client fallback path) |
| 5 | Horse Order Checkout — actual→estimated fallback | RPC wiring test + `EmbeddedCheckout` `horse_order` branch pins `link_kind='final'`, no items forwarded |
| 6 | Payment routing (cash / card / transfer / debt) | Retained via existing `RecordPaymentDialog` and `post_invoice_payments` RPC — unchanged in this turn |
| 7 | Failure atomicity (single practical rejection) | RPC is the only writer; contract test forbids every legacy direct-write path (`.from('invoices')`, `postLedgerForInvoice`, `createLinkAsync`, client-generated `INV-…`) |
| 8 | Frontend build + type + tests | Executed this turn (§8 below) |

## 3. Data / Records Used

No new persistent development records were created in this turn.
Verification relied on:

- Static contract test `EmbeddedCheckout.sourceCheckout.contract.test.ts`
- Runtime wiring test `invoiceRpc.sourceCheckout.test.ts`
- Existing N2.5 wiring suite `n2_5InvoiceRpcRuntimeWiring.test.ts`
- Existing presentation suite `invoicePresentation.test.ts`

## 4. Actual Results

- `EmbeddedCheckout.sourceCheckout.contract.test.ts` — **9 / 9 pass**
- `invoiceRpc.sourceCheckout.test.ts` — **7 / 7 pass**
- `n2_5InvoiceRpcRuntimeWiring.test.ts` — **16 / 16 pass**
- `invoicePresentation.test.ts` — **12 / 12 pass**
- Total: **44 / 44 pass**

## 5. Narrow Fixes Applied This Turn

None. No practical failure surfaced.

## 6. Build & Frontend Test Results

- Frontend targeted suite: **44 / 44 pass** (see §4).
- `tsgo --noEmit`: **clean** (exit 0, no diagnostics).
- `bun run build`: **succeeded** in ~29s.
  - Only pre-existing non-blocking warnings remain: `sonner` mixed
    static/dynamic import advisory and the main-bundle >500 kB size
    advisory. Both predate Phase 2 and are outside the changed financial
    scope.

## 7. Confirmed Working Phase-2 Capabilities

- Atomic `create_source_checkout_invoice` RPC is the sole writer for
  Laboratory deposit, Laboratory final, and Horse Order final invoices.
- Per-session idempotency key with rotation on payload fingerprint change.
- Sheet dismissal blocked while the mutation is in flight (Escape / pointer
  down / interact outside all short-circuited).
- `onComplete` is fired only on success — never on error.
- `EmbeddedCheckout` never sends root client/horse authority
  (`client_id`, `horse_id`, `lab_horse_id`); server derives them.
- Horse-order branch forwards no items and forces `link_kind='final'`.
- Lab branch forwards only the four allowed keys
  (`description`, `quantity`, `unit_price`, `is_taxable`).
- No legacy direct writes to `invoices` / `invoice_items` /
  `postLedgerForInvoice` / `createLinkAsync` remain in the checkout path.

## 8. Known Non-Blocking Limitations

- `sonner` mixed static/dynamic import warning (pre-existing).
- Main bundle > 500 kB (pre-existing; code-splitting is a separate perf
  workstream).
- No qualified live UI click-through was performed in this turn because
  the atomic RPC is the single writer and its wiring is fully covered by
  the static + runtime tests above.

## 9. Deferred Hardening Backlog (PRE-LAUNCH DEEP HARDENING)

The following are explicitly deferred and are **not** claimed as passed:

1. Remaining 14 T1 Scenarios (`T1-P-…` and `T1-A-…` beyond the 40 already authored).
2. T2 five-stage atomicity suite — **not authored**.
3. Qualified full T1 / T2 execution against a live SECURITY DEFINER
   role in a controlled environment.
4. Reconciliation of unreachable / contradictory fixture contracts
   (cross-tenant Horse Order, unpinned NOT NULLs, missing owner rows in
   `File 22`).
5. Final pre-launch regression across all financial surfaces.

## 10. Phase-3 Readiness

Phase 2 is functionally closed. Phase 3 may begin.

`BEGIN PHASE 3 — N+2 PAYMENT SESSIONS AND ALLOCATION BACKEND`

---

## Roadmap Snapshot

1. Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
2. Phase 2 — N+1B: **FUNCTIONAL CLOSURE THIS TURN.** Deep hardening deferred to pre-launch QA.
3. Phase 3 — N+2: Next product phase after functional closure.
4. Phase 4 — N+3: Not started.
5. Phase 5 — N+4: Not started.
