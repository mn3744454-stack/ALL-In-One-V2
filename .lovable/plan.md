## Payment History — Restore Recording Time in Invoice Details

Presentation-only fix. No DB, RPC, RLS, permissions, translations logic, or Payment writer changes.

### A. Verdict
`PAYMENT HISTORY TIMESTAMP CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED`

### B. What Screenshot 42 proves
`INV-9920` — Paid, total SAR 230.00, paid SAR 230.00, outstanding SAR 0.00; two entries (Bank Transfer SAR 20.00 + Cash SAR 210.00) both dated `26-07-2026`, no time shown. Payment posting works — this is display-only.

### C. Current component
`src/components/finance/InvoiceDetailsSheet.tsx`, lines **1030–1061** ("Payment Timeline" block under `finance.payments.paymentHistory`). Same sheet is reused for Stable and Laboratory invoices, so one fix serves both.

### D. Current data source
Hook `src/hooks/finance/useInvoicePayments.ts` selects from `ledger_entries` where `entry_type='payment'` for the invoice, ordered by `effective_date` then `created_at`. It already returns both `effective_date` (date) and `created_at` (timestamptz) on each `InvoicePayment` (lines 107, 122–127, 32–37). The row rendered only uses `formatDate(payment.effective_date, "dd-MM-yyyy")`.

### E. Available timestamp fields on each row
- `payment.effective_date` — business calendar date (date, no time).
- `payment.created_at` — DB recording moment (timestamptz, UTC).
- `ledger_entries.payment_session_id` is present; `payment_sessions.created_at` also exists but is not currently projected into the hook.

### F. Authoritative timestamp
Use `payment.created_at` from the ledger row. It is the actual moment the payment was recorded, is `timestamptz` (so it renders in the user's local zone via JS `Date`), and every ledger payment row has one (NOT NULL). `effective_date` intentionally has no time — do not fabricate midnight from it. The session `created_at` matches the ledger `created_at` within the same transaction; the ledger timestamp is closer to the user-facing "payment recorded" event and is already in scope, so we do not need to widen the hook query.

### G. Git-history finding
`InvoiceDetailsSheet.tsx` has been rewritten multiple times (last major touch: "Wire invoice lifecycle through atomic RPCs"). The current block has never called a time formatter — the row was always date-only after the atomic-RPC rewrite. This is a regression against the earlier design intent (the user reports time was previously visible), not against the current file's own history. Safe restoration: swap in the existing canonical helper.

### H. Timezone contract
Use the existing platform helper `formatStandardDateTime` from `src/lib/displayHelpers.ts`, which is already 12-hour bilingual (Arabic `صباحاً`/`مساءً`, English `AM`/`PM`), Latin-digit, and reads the current UI language via `getCurrentLanguage()`. It relies on JS `Date` local-zone conversion — the same convention every other timeline in the app (Movement, Vet, Lab, HR, Academy, Records) already uses. No new tenant timezone helper is needed; if a centralized `Asia/Riyadh` override is later introduced, updating `formatStandardDateTime` fixes every surface at once.

### I. Format examples
- Arabic: `26-07-2026 8:27 مساءً`
- English: `26-07-2026 8:27 PM`
- Latin digits, 12-hour, no seconds, no timezone code, no UUIDs.

### J. Exact files proposed for modification
1. `src/components/finance/InvoiceDetailsSheet.tsx` — one line inside the Payment Timeline row.
2. `src/components/finance/__tests__/InvoiceDetailsSheet.paymentTime.test.tsx` — new focused test file (added).

No changes to `useInvoicePayments.ts` (both fields are already selected).

### K. Execution-ready plan
1. In `InvoiceDetailsSheet.tsx`, add `formatStandardDateTime` to the existing `@/lib/displayHelpers` import.
2. Replace line 1044:
   - from `{formatDate(payment.effective_date, "dd-MM-yyyy")}`
   - to `{formatStandardDateTime(payment.created_at)}`
   The row already has `dir="ltr"` + `tabular-nums`, matching the helper's Latin-digit contract.
3. Rendering order becomes: recorded date+time (top), Payment Method badge (below), amount (right). No duplicate date. Effective_date is preserved on the underlying record and remains authoritative for accounting.
4. Missing `created_at` degrades to `—` (helper already handles null/invalid).
5. No DB migration. No RPC change. No hook change. No i18n key added — the helper handles Arabic and English internally.

### L. Narrow test plan (`InvoiceDetailsSheet.paymentTime.test.tsx`)
Mock `useInvoicePayments` to return two rows (bank_transfer + cash) with known `created_at` and assert:
1. Arabic mode (`I18nContext` lang=`ar`) row text contains `صباحاً` or `مساءً`.
2. English mode row text contains `AM` or `PM`.
3. Both digits and separators are Latin (`/[0-9]{2}-[0-9]{2}-[0-9]{4}/` matches).
4. Time reflects local-zone conversion of the mocked `created_at` (helper's own contract — assert against `formatStandardDateTime(mock)`).
5. `effective_date` value is not rendered as text (guard against duplicate date drift).
6. Both bank_transfer and cash rows render a time.
7. Order preserved: rows appear in the order the hook returns.
8. Row with `created_at=null` renders `—` and no invented time.
9. Amount and Method badges continue to render unchanged.
10. No call to any Payment RPC or mutation is triggered by rendering.

Also run:
- `bunx vitest run src/components/finance/__tests__/InvoiceDetailsSheet.paymentTime.test.tsx src/lib/finance/__tests__/paymentRpcCutover.test.ts`
- `bunx tsgo --noEmit`
- `bun run build`

### M. Database changes required
None.

### N. Files created
- `src/components/finance/__tests__/InvoiceDetailsSheet.paymentTime.test.tsx`

### O. Files modified
- `src/components/finance/InvoiceDetailsSheet.tsx` (one import + one line).

### P. Production objects modified
None.

### Q. Persistent rows modified
None.

### R. Roadmap
Phase 1 N+1A ✓ · Phase 2 N+1B ✓ · Phase 3 N+2 Slices 1–3 ✓ · Slice 4 = this presentation fix · Phase 4 N+3 not started.

### S. Next exact action
`AWAIT USER APPROVAL OF THE PAYMENT-HISTORY TIMESTAMP PLAN.`

### Rollback
Revert the two changed lines in `InvoiceDetailsSheet.tsx` and delete the new test file. No data migration to undo.

---

`APPROVAL HANDOFF — SEND THIS EXACT MESSAGE`

> Approved. Execute Payment History recording-time restoration only:
> - Modify `src/components/finance/InvoiceDetailsSheet.tsx` to render `formatStandardDateTime(payment.created_at)` in the Payment Timeline row, keeping amount, method, and order unchanged.
> - Add `src/components/finance/__tests__/InvoiceDetailsSheet.paymentTime.test.tsx` covering the ten assertions in §L.
> - Run the focused vitest suite, `bunx tsgo --noEmit`, and `bun run build`; report counts.
>
> Do NOT change Payment logic, RPCs, RLS, permissions, migrations, ledger rows, invoices, sessions, allocations, customer balances, idempotency, PDFs/exports, or translations. Do NOT begin Phase 4, allocation UI, refunds, reversals, credit, overpayment, or Retail POS.
