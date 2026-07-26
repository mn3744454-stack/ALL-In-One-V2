
# PHASE N+2 · SLICE 3 — Frontend Payment Caller Cutover — Read-Only Audit & Execution Plan

## A. Verdict

**PHASE N+2 SLICE 3 BLOCKED — ONE NARROW RPC CONTRACT CORRECTION REQUIRED**, then execute the frontend cutover below.

Reason: the installed `post_payment_session` accepts arbitrary text in `allocations[].payment_method`. `debt` and `reconciliation` (the historical repair token) are not rejected. Per Section 4 this must be corrected before frontend cutover.

Once the correction is accepted, the frontend cutover is straightforward and safely covers Client‑Level‑only, single‑Horse, split‑tender and partial cases. Multi‑Horse and Mixed partial payments are **blocked in UI** with a "requires Phase 4" message — no silent fallback, no dual write.

## B. Roadmap Position

Phase 1 N+1A COMPLETE ・ Phase 2 N+1B FUNCTIONALLY CLOSED ・ Phase 3 N+2 Slice 1 COMPLETE ・ Slice 2 IMPLEMENTED ・ **Slice 3 alignment (this turn)** ・ Slice 4 NOT STARTED ・ Phase 4/5 NOT STARTED ・ Retail POS excluded.

## C. Slice‑2 Live Contract Verification (from installed pg_proc)

1. Migration: `supabase/migrations/20260726093619_965e7d77-dd06-4745-b0a8-b8c225e7f969.sql`.
2. Live signatures:
   - `public.post_payment_session(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb) RETURNS jsonb`
   - `public.get_payment_session(p_tenant_id uuid, p_session_id uuid) RETURNS jsonb`
3. Body: verified in installed source (498 lines). Auth → tenant membership → `finance.payment.create` → payload whitelist → structural validation → idempotency begin → sorted invoice FOR UPDATE + advisory locks → client/currency reconciliation → tenant `payment_accounts` resolved server-side → session/allocation/horse-allocation inserts via `_finance_ledger_insert`.
4. Grants: `EXECUTE` to `authenticated` and `service_role` (plus `postgres` and sandbox exec role). No `anon`.
5. SECURITY DEFINER: true (both functions).
6. `search_path=""` (empty).
7. Root payload whitelist: `payment_date`, `reference_note`, `external_reference`, `allocations`.
8. Allocation whitelist: `invoice_id`, `payment_method`, `amount`, `client_level_amount`, `horse_allocations`, `external_reference`.
9. Horse-allocation whitelist: `horse_id`, `amount`.
10. Return shape: `session_id`, `status`, `total_amount`, `currency`, `client_id`, `payment_account_id`, `payment_date`, `allocations[]` (with `invoice_id`, `outstanding_after`, `invoice_status`, `ledger_entry_id`, `horse_allocations[]`), plus idempotency echo.
11. Idempotency: composed operation token `post_payment_session`, keyed by `(tenant_id, op, idempotency_key)` via `_finance_idempotency_begin`. Same key + same payload → identical stored response; same key + drifted payload → `FIN_IDEMPOTENCY_CONFLICT`.
12. Invoice-status writes: `paid` and `partial` only (via `_finance_ledger_insert` recompute).
13. **Payment-method validation: NONE.** `v_method := NULLIF(btrim(v_alloc->>'payment_method'),'')` with no allowlist. `ledger_entries` CHECK constrains only `entry_type`, not `payment_method`.

## D. Exact Payment‑Method Allowlist

**Required for new sessions** (matches current `RecordPaymentDialog.PAYMENT_METHODS`):
- `cash`, `card`, `transfer`, `check`.

**Must be rejected** for new user-posted sessions:
- `reconciliation` (historical repair token only — one legacy row present).
- `debt` (not a collection method).
- any other arbitrary text.

## E. Current Frontend Caller Inventory

Only one production write path calls the payment RPC today:

| # | Route/surface | Component | Hook/helper | File |
|---|---|---|---|---|
| 1 | Finance → Invoice Details "Record Payment" | `RecordPaymentDialog` | `useInvoicePayments.recordPayment` → `postLedgerForPayments` | `src/components/finance/RecordPaymentDialog.tsx`, `src/hooks/finance/useInvoicePayments.ts`, `src/lib/finance/postLedgerForPayments.ts` |

Input shape today: `{ payments: PaymentEntry[], paymentDate }` per single `invoiceId`. Writer: `supabase.rpc('post_invoice_payments', { p_tenant_id, p_idempotency_key: sessionUuid, p_invoice_id, p_account_id, p_payment_date, p_payments })`. Supports full, partial, split-tender on **one invoice**. Does not support multi‑invoice, does not collect horse allocations, does not collect client‑level split.

Idempotency today: single session UUID minted per submit; per-row `PaymentEntry.idempotency_key` reused only inside the payload. Success: toast + `invalidateFinanceQueries(queryClient, tenantId)`. Error: toast, dialog stays open.

Other files matched but **not writers**: `src/hooks/finance/useInvoicePaymentsBatch.ts` (read-only ledger aggregate), `src/hooks/finance/index.ts` (re-export), `src/components/finance/InvoiceDetailsSheet.tsx` (opens dialog), `src/components/finance/SupplierPayablesTab.tsx` / `src/components/laboratory/{LabHorseProfile,CreateSampleDialog}.tsx` (invoice creation, no payment), `i18n/locales/*` (labels). No direct `payment_accounts` selects outside `postLedgerForPayments.ts`. No direct ledger inserts.

## F. Current UI Submit Data (at click time inside `RecordPaymentDialog`)

Available in state: `invoiceId`, `paymentDate`, one or more `{ method, amount, reference }` rows, `summary.outstandingAmount`, `summary.totalAmount`, `invoiceItems`. Not collected: per‑horse split, per‑row `client_level_amount`. `invoiceItems` exposes `horse_id` per line, so the UI **can** count distinct horses to decide compatibility, but it does not currently ask the user to allocate a partial payment across them.

## G. Invoice‑Shape Compatibility Matrix

Distinct horses = distinct non-null `invoice_items.horse_id`; presence of at least one null `horse_id` line = has client-level portion.

| Case | Full | Partial | Split‑tender | Missing to send today |
|---|---|---|---|---|
| A. Client‑level only (0 horses) | OK | OK | OK | none — omit `horse_allocations` and `client_level_amount`; RPC treats whole amount as client-level |
| B. Single‑horse only (1 horse, no client rows) | OK | OK | OK | none — RPC auto-fills the sole horse |
| C. Mixed (≥1 horse + client rows), **full** | OK if UI sends explicit split | Blocked | OK if full | requires per-line `client_level_amount` + `horse_allocations` summing to `amount` |
| C. Mixed, **partial** | — | Blocked | Blocked | Phase‑4 allocation editor |
| D. Multi‑horse only, **full** | Blocked today (needs per-horse split even for full) | Blocked | Blocked | Phase‑4 allocation editor |
| E. Multi‑horse + client‑level | Blocked | Blocked | Blocked | Phase‑4 allocation editor |

## H. Multi‑Horse and Mixed Finding

`post_payment_session` raises `FIN_HORSE_ALLOCATION_REQUIRED` for any invoice with more than one distinct horse **or** mixed horse+client lines, even for full payment. The current UI does not collect this data. Cutover must gate these cases at the button level with a localized "Requires Phase 4 allocation editor" message. No proration invented. No silent legacy fallback.

## I. Phase‑3 / Phase‑4 Boundary

**Result 2 — Safe Cases Only.** Slice 3 ships the wrapper + hook cutover; the dialog remains unchanged in layout but disables submit and shows an allocation-required notice for Cases C‑partial, D, E. Cases A, B (full+partial+split), and C‑full (server-satisfied when user supplies the mix in a follow-up phase) proceed.

## J. Idempotency‑Key Ownership

Owner: `useInvoicePayments.recordPaymentMutation` (one key per submit attempt).
- Minted when the mutation starts.
- Reused only for direct in-flight retry of an identical payload.
- New key on: fresh dialog open, invoice change, paymentDate change, any row (method/amount/reference/horse) change, successful completion.
- Double-click is prevented by `isRecording` disabling submit and by TanStack Query dedup for the same mutation instance.
- Not generated inside `postLedgerForPayments` (moves out of helper).

## K. TypeScript Contract

`src/integrations/supabase/types.ts` already contains `post_payment_session`, `get_payment_session`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`. No regeneration required.

## L. Proposed Wrapper (`src/lib/finance/postPaymentSession.ts`, new)

```ts
export interface PaymentHorseAllocation { horse_id: string; amount: number; }
export interface PaymentSessionAllocation {
  invoice_id: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'check';
  amount: number;
  client_level_amount?: number;
  horse_allocations?: PaymentHorseAllocation[];
  external_reference?: string;
}
export interface PaymentSessionPayload {
  payment_date: string;              // YYYY-MM-DD
  reference_note?: string;
  external_reference?: string;
  allocations: PaymentSessionAllocation[];
}
export interface PostPaymentSessionResult { success: true; response: Json } | { success: false; code: string; message: string };

export async function postPaymentSession(
  tenantId: string,
  idempotencyKey: string,          // UUID owned by caller
  payload: PaymentSessionPayload,
): Promise<PostPaymentSessionResult>;
```

- Single call to `supabase.rpc('post_payment_session', { p_tenant_id, p_idempotency_key, p_payload })`.
- **No** `payment_accounts` lookup, no `client_id`, no `currency`, no `outstanding`, no session id, no ledger id, no caller-derived total. Optional keys omitted when unused.
- Normalizes error tokens by pattern matching `FIN_*` from `error.message` and returns `{ success:false, code, message }`.

## M. Exact Caller Mapping (`useInvoicePayments.recordPayment`)

Current call `{ payments: PaymentEntry[], paymentDate }` maps to:

```jsonc
{
  "payment_date": "<paymentDate>",
  "allocations": rows.filter(r => amount>0).map(r => ({
    "invoice_id": invoiceId,
    "payment_method": r.method,           // whitelist checked
    "amount": r.amount,
    ...(r.reference ? { "external_reference": r.reference } : {})
  }))
}
```

Split-tender is preserved as **one allocation per method** on the same `invoice_id` (RPC dedupe key = `invoice|method`, so a user cannot enter two cash rows on the same invoice — enforce in UI by merging same-method rows or blocking with `FIN_ALLOCATION_DUPLICATE` mapped to a friendly message).

No `client_id`, `currency`, `payment_account_id`, `outstanding`, `session_id`, or ledger IDs are sent.

## N. Legacy Writer Removal from Frontend

- Frontend stops calling `post_invoice_payments` (only site is `postLedgerForPayments.ts`).
- Delete client-side `payment_accounts` select in `postLedgerForPayments.ts`.
- Keep DB functions `post_invoice_payments` and `post_payment` installed (back-compat, deletion deferred one release).
- **No automatic fallback** to the legacy writer on any error path.

## O. Error and Translation Mapping

Add finance token map (both `en.ts` and `ar.ts`) under `finance.payments.errors.*`:

| Token | UI copy (EN) |
|---|---|
| `FIN_IDEMPOTENCY_CONFLICT` | "This payment was already submitted with different details. Please reopen the dialog." |
| `FIN_INVOICE_OVER_ALLOCATION` | "Payment exceeds outstanding amount." |
| `FIN_INVOICE_NOT_PAYABLE` | "Invoice is not in a payable state." |
| `FIN_INVOICE_CROSS_CLIENT` / `FIN_INVOICE_CROSS_TENANT` / `FIN_INVOICE_CURRENCY_MISMATCH` | "Invoices cannot be paid together." |
| `FIN_PAYMENT_ACCOUNT_MISSING` | "No active payment account configured." |
| `FIN_HORSE_ALLOCATION_REQUIRED` / `FIN_HORSE_ALLOCATION_MISMATCH` / `FIN_HORSE_NOT_ON_INVOICE` / `FIN_CLIENT_LEVEL_ALLOCATION_INVALID` | "This invoice requires the horse allocation editor (available in Phase 4)." |
| `FIN_ALLOCATION_HISTORY_UNRESOLVED` | "Prior allocations must be resolved before new payments." |
| `FIN_PERMISSION_DENIED` / `FIN_UNAUTHENTICATED` | "You don't have permission to record payments." |
| `FIN_PAYMENT_METHOD_INVALID` (new, from § V) | "Unsupported payment method." |
| default | "Unable to record payment." + `console.error(rawError)` |

No raw SQL surfaced to the user; full error kept in dev console.

## P. Cache Invalidation

Keep `invalidateFinanceQueries(queryClient, tenantId)`; add one line inside it for future `payment-sessions` queries: `queryClient.invalidateQueries({ queryKey: ["payment-sessions", tenantId] })`. No dialog close before RPC resolves; `onSuccess` fires exactly once.

## Q. Runtime‑Verification Strategy

- **Frontend contract tests** (Vitest, mocking `supabase.rpc`): argument shape, RPC name, no legacy call, no `payment_accounts` select, idempotency lifecycle, split-tender fan-out, error mapping, unsupported-invoice gate.
- **Live acceptance** (manual, on real UI, after implementation): 1 full single-horse payment, 1 partial single-horse, 1 split-tender same invoice, 1 client-level-only, 1 multi-horse invoice showing the blocked-with-message state. No permanent test rows beyond real business payments the user chooses to keep.
- Mocked tests will **not** claim they prove DB atomicity — Slice 2's pgTAP suite covers backend and is the source of that guarantee once run.

## R. Exact Files Proposed for Modification

Create: `src/lib/finance/postPaymentSession.ts`, `src/lib/finance/__tests__/postPaymentSession.test.ts`.
Modify: `src/lib/finance/postLedgerForPayments.ts` (thin delegation, remove account lookup), `src/hooks/finance/useInvoicePayments.ts` (own idempotency key, gate multi-horse), `src/components/finance/RecordPaymentDialog.tsx` (compat gate + error surface only — no layout redesign), `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`, `src/hooks/finance/invalidateFinanceQueries.ts` (one line).

Database change: **one** narrow migration listed in § V.

## S. Execution‑Ready Plan (≤4 steps)

### Step 1 — Backend narrow correction (single migration)
- File: new migration under `supabase/migrations/`.
- Change: `CREATE OR REPLACE FUNCTION public.post_payment_session(...)` — identical body except add, right after `v_method := NULLIF(btrim(v_alloc->>'payment_method'),'')`:
  ```sql
  IF v_method IS NULL OR v_method NOT IN ('cash','card','transfer','check') THEN
    RAISE EXCEPTION 'FIN_PAYMENT_METHOD_INVALID: pos=%', v_position USING ERRCODE='23514';
  END IF;
  ```
- Rollback: re-apply Slice-2 migration definition.
- Types: no regeneration needed.
- Tests: extend `n2_payment_session_rpc.test.sql` scenario list mentally (documented, not runtime-added this slice) — `debt` and `reconciliation` rejected.

### Step 2 — Create wrapper + delete legacy writer usage
- New `src/lib/finance/postPaymentSession.ts` per § L.
- Rewrite `src/lib/finance/postLedgerForPayments.ts` to:
  - accept the same `(invoiceId, tenantId, payments, paymentSessionId, paymentDate)` signature (temporary shim so surrounding tests still compile),
  - translate to a single-invoice `PaymentSessionPayload` (one allocation per row/method) and delegate to `postPaymentSession`,
  - **remove** the `payment_accounts` select and remove the direct `post_invoice_payments` RPC call,
  - return `{ success, paidAmount, outstandingAmount, invoiceStatus }` derived from RPC response's `allocations[0].outstanding_after` / `invoice_status`.
- Rollback: `git revert` the two files.

### Step 3 — Idempotency ownership and unsupported-invoice gate in the hook
- `src/hooks/finance/useInvoicePayments.ts`:
  - mint one `idempotencyKey` inside `recordPaymentMutation.mutationFn` from `crypto.randomUUID()` (replaces `paymentSessionId` responsibility); pass into wrapper.
  - Before calling: compute `{ distinctHorses, hasClientLevel }` from `useInvoiceItems(invoiceId)` (already fetched by the dialog — pass through). If `distinctHorses > 1` or (`distinctHorses ≥ 1` and `hasClientLevel`), reject with `FIN_HORSE_ALLOCATION_REQUIRED` locally without hitting the RPC.
  - Success toast wording unchanged; keep `invalidateFinanceQueries`.
- `src/components/finance/RecordPaymentDialog.tsx`: surface the block by disabling `Record Payment` and showing `MissingRequirementsBar` with the § O message when the same condition holds; no other UI changes.
- Rollback: `git revert`.

### Step 4 — i18n + invalidation + contract tests
- Add `finance.payments.errors.*` keys in `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts` per § O.
- Add `queryClient.invalidateQueries({ queryKey: ["payment-sessions", tenantId] })` to `invalidateFinanceQueries`.
- Add `src/lib/finance/__tests__/postPaymentSession.test.ts` per § T.
- Verification: `bunx vitest run src/lib/finance/__tests__/postPaymentSession.test.ts && bunx tsgo -p tsconfig.app.json && bun run build`.
- Rollback: `git revert`.

## T. Narrow Test Plan

File: `src/lib/finance/__tests__/postPaymentSession.test.ts` (mocks `@/integrations/supabase/client`):

1. calls `supabase.rpc` exactly once with name `post_payment_session` and args `{ p_tenant_id, p_idempotency_key, p_payload }`.
2. `p_payload` shape strictly matches whitelist (no `payment_account_id`, no `client_id`, no `currency`, no `session_id`, no `outstanding`, no ledger ids).
3. No call to `.from('payment_accounts')` anywhere in `postLedgerForPayments` or `postPaymentSession`.
4. No call to `supabase.rpc('post_invoice_payments', ...)`.
5. Split-tender: 2 rows (cash + card) → 2 entries in `payload.allocations`, both with same `invoice_id`.
6. Retry of identical payload from the same mutation instance reuses `p_idempotency_key`.
7. Mutating the paymentDate/rows between submits generates a new UUID.
8. Double-invocation while `isRecording` is true does not spawn a second `rpc` call.
9. `onSuccess` invalidates: `invoices`, `invoice-items`, `invoice-payments`, `invoice-payments-batch`, `ledger-entries`, `customer-balances`, `client-statement`, `finance-summary`, `payment-sessions`.
10. RPC error with `message: 'FIN_INVOICE_OVER_ALLOCATION'` → mapped copy shown; dialog remains open (no `onOpenChange(false)`).
11. Multi-horse invoice (`invoiceItems` with two distinct `horse_id`) → wrapper is **not** called; UI shows the "requires Phase 4" message.
12. Payment method not in `{cash,card,transfer,check}` is unreachable from UI; if injected, wrapper returns `FIN_PAYMENT_METHOD_INVALID` from the RPC.
13. Unchanged: `createSourceCheckoutInvoice` (`src/lib/finance/invoiceRpc.sourceCheckout.test.ts`) still passes.

## U. Risks and Rollback

- Risk: user tries to record a payment on a legacy multi-horse invoice. Mitigation: clear localized gate.
- Risk: TanStack Query retry generating a new key. Mitigation: mutation `retry: 0` (already the default here) and key minted **inside** `mutationFn`, cached per attempt.
- Risk: session UUID collision when user reopens dialog. Mitigation: new key per open (React state reset on `open` change).
- Rollback: single-migration revert plus `git revert` of Steps 2‑4. Legacy `post_invoice_payments` stays intact.

## V. Database Changes Required

**One narrow correction** (Step 1): add a `payment_method IN ('cash','card','transfer','check')` guard to `post_payment_session`. No schema changes, no data changes.

## W. Files Created

None (audit turn).

## X. Files Modified

None (audit turn).

## Y. Production Objects Modified

None (audit turn).

## Z. Persistent Rows Modified

None (audit turn).

## AA. Current Roadmap

Phase 1 N+1A COMPLETE ・ Phase 2 N+1B FUNCTIONALLY CLOSED ・ Phase 3 N+2 Slice 1 COMPLETE ・ Slice 2 IMPLEMENTED ・ Slice 3 ALIGNED (this turn, blocked pending § V) ・ Slice 4 NOT STARTED ・ Phase 4 NOT STARTED ・ Phase 5 NOT STARTED.

## AB. Next Exact Action

AWAIT USER APPROVAL OF THE SLICE‑3 PLAN BELOW.

---

## APPROVAL HANDOFF — SEND THIS EXACT MESSAGE

> APPROVED — EXECUTE PHASE N+2 SLICE 3 EXACTLY AS PLANNED:
> 1. Apply one narrow migration adding `payment_method IN ('cash','card','transfer','check')` validation to `post_payment_session`; no other backend changes.
> 2. Create `src/lib/finance/postPaymentSession.ts` and rewrite `src/lib/finance/postLedgerForPayments.ts` to delegate to it; remove the client-side `payment_accounts` lookup and the `post_invoice_payments` RPC call. No fallback to the legacy writer.
> 3. Move idempotency-key ownership into `useInvoicePayments.recordPayment` and block multi-horse and mixed invoices in `RecordPaymentDialog` with the localized "requires Phase 4 allocation editor" message. Do not redesign the Payment UI otherwise.
> 4. Add the `finance.payments.errors.*` keys in `en.ts` and `ar.ts`, add `payment-sessions` to `invalidateFinanceQueries`, and add `src/lib/finance/__tests__/postPaymentSession.test.ts` covering the tests in section T.
> 
> Prohibitions: no legacy-writer fallback; no client-side payment account lookup; no Phase-4 multi-invoice UI; no changes to Retail POS, Source Checkout, or unrelated finance screens; keep `post_invoice_payments` installed for one release.
>
> Required verification: `bunx vitest run src/lib/finance/__tests__/postPaymentSession.test.ts`, `bunx tsgo -p tsconfig.app.json`, `bun run build`.
>
> Stop after posting the implementation report and manual-acceptance script. Do not begin Slice 4.
