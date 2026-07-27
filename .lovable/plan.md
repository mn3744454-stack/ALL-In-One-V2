# Slice 2.2F — Tax-Inclusive Payment Allocation Truth

## A. Verdict

**TAX-INCLUSIVE PAYMENT ALLOCATION CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED.**
Backend (`post_payment_session`) already validates Horse and Client-Level caps against `SUM(invoice_items.line_gross_amount)`. The defect is frontend-only: the allocation editor derives per-bucket capacity from `invoice_items.total_price` (pretax) rather than `line_gross_amount`. No backend, RPC, migration, RLS, grant, catalog, or row change is required.

## B. Attachment Findings

- **72**: date controls narrow/isolated; footer stacks metrics vertically; heading detached.
- **73**: Split tender (Cash 1,000 + Bank 300) computes Payment Total 1,300 correctly. Preserve.
- **74**: Fatin/Maha cards show Remaining 0.00 at 800/500 — matches pretax caps, not gross.
- **75**: Frozen items — Fatin: 300 + 500 pretax; Maha: 500 pretax package.
- **76**: Invoice header — Subtotal 1,300, Tax 195, Total 1,495, Outstanding 1,495. Footer 195 delta = untagged tax.

## C. INV-0989 Persisted Truth (live query)

Header: subtotal=1300.00, discount=0.00, tax=195.00, total=1495.00, prices_include_tax=false.


| Item                  | Horse | qty×unit | total_price | pretax | tax | gross   | rate | taxable |
| --------------------- | ----- | -------- | ----------- | ------ | --- | ------- | ---- | ------- |
| مساعدة الولادة        | Fatin | 1×300    | 300         | 300    | 45  | **345** | 15%  | t       |
| زيارة طوارئ           | Fatin | 1×500    | 500         | 500    | 75  | **575** | 15%  | t       |
| جوكي رايدنق (package) | Maha  | 1×500    | 500         | 500    | 75  | **575** | 15%  | t       |


## D. Current Bucket Calculation (frontend)

`src/hooks/finance/useInvoicePriorAllocations.ts` line 88: `grossByKey.set(r.horse_id, (grossByKey.get(r.horse_id) ?? 0) + total)` where `total = Number(r.total_price)`. Produces Fatin=800, Maha=500. Total shown = 1,300 (pretax). Editor caps and "Remaining After" therefore ignore 195 of tax.

## E. Exact Frontend Loss Point

Single line: `useInvoicePriorAllocations.ts` selects `total_price` (pretax) and aggregates it as `gross`. The field `line_gross_amount` is not selected. Downstream `PaymentAllocationEditor.tsx`, `allocationDistribution.ts`, and `RecordPaymentDialog.tsx` all consume `bucket.remaining` derived from that pretax total.

## F. Installed Backend Validation

`post_payment_session` (lines 327–346 of installed function):

- Horse cap: `SUM(line_gross_amount) FILTER (horse_id = v_horse_id)` minus prior horse allocations.
- Client-Level cap: `SUM(line_gross_amount) FILTER (horse_id IS NULL)` minus prior client-level.
- Invoice outstanding validated against `invoices.total_amount` (gross).
**Backend already gross-aware. No change required.**

## G. Frozen Gross Authority

Canonical field: `invoice_items.line_gross_amount` (persisted, snapshot-frozen, enforced by `invoice_items_line_identity_ck`: `pretax + tax = gross`). Never recompute from catalog / tenant tax settings.

## H. Tax Attribution

Each `invoice_items` row carries its own `line_tax_amount` attached to the row's `horse_id` / `lab_horse_id` / (NULL = client-level). Aggregate tax per bucket by summing `line_tax_amount` grouped by the same bucket key used for gross. **No global Tax bucket.**

## I. Discount Contract

Schema: only line-level via frozen `line_pretax_amount` / `line_gross_amount`; `invoices.discount_amount` exists but for INV-0989 = 0. Reconciliation check: `SUM(line_gross_amount) = invoices.total_amount` (1,495 = 1,495). When `discount_amount > 0` on future invoices, current write path already distributes it into frozen line values (verified by identity check). Plan therefore does not need Invoice-level attribution logic; if a future invoice ever violates `SUM(gross) = total`, the existing safe-block path (already used for lab-horse-only edge cases) will apply.

## J. Prior Allocation Contract

`payment_allocations.client_level_amount` and `payment_horse_allocations.amount` are stored as actual paid gross currency. Current subtraction in `useInvoicePriorAllocations` is correct; only the gross base is wrong.

## K. Corrected Bucket Formula

```
grossPerBucket    = Σ line_gross_amount   (grouped by horse_id | lab: prefix | CLIENT_LEVEL)
pretaxPerBucket   = Σ line_pretax_amount  (same grouping)      // display only
taxPerBucket      = Σ line_tax_amount     (same grouping)      // display only
priorPaidPerBucket= Σ persisted allocations for that bucket
remainingPerBucket= max(0, grossPerBucket − priorPaidPerBucket)
Σ remainingPerBucket ≈ invoice.total_amount − invoice.paid   (±1¢)
```

## L. Equal-Distribution Result

With `paymentAmount = 1,300`, caps `{Fatin:920, Maha:575}`, `distributeEqually` in `PaymentAllocationEditor.tsx` (cent-safe, cap-aware) yields Fatin=725, Maha=575 (Maha capped first, residual 425 rolls to Fatin → 650+75+…). Deterministic; will be locked by test assertion using the actual algorithm — not a hardcoded value.

## M. Manual Complement Behavior (unchanged)

Two-bucket auto-completion via `touchedRef` remains authoritative. Manual 800/500 stays valid (within 920/575), yielding Remaining 120/75 and footer 195.

## N. Distribution Card Contract

Card body (only when `taxPerBucket > 0`):

```
Horse: Fatin
  • Foaling Assistance      SAR 300.00
  • Emergency Visit         SAR 500.00
Services / Pretax           SAR 800.00
Tax                         SAR 120.00
Total Due                   SAR 920.00
[Payment Amount input]      [Remaining After Payment]
```

When `taxPerBucket == 0`: hide Tax row and Pretax row; show only Total Due. Client-Level card uses same layout, no horse label. No UUIDs, no schema names, currency LTR-isolated.

## O. Footer Copy and Layout

- Arabic labels: `توزيع الدفعة` → `**توزيع المدفوعات**`; footer `إجمالي الدفعة` → `**إجمالي المدفوعات**`. English retained.
- Footer becomes one horizontal row on `md+`: `Total Payments: … · Remaining After Payment: …` with Cancel/Record right (LTR) / left (RTL). Mobile wraps to 2 rows, no scroll. Values `font-mono tabular-nums`, labels `font-semibold`.

## P. Payment-Date Layout

`RecordPaymentDialog.tsx` date block becomes a single `md:flex md:items-end md:gap-4` row: label chip + D/M/Y segments constrained (`md:max-w-[22rem]` for the whole D-M-Y group; Month `md:max-w-[10rem]` retained). "Today" quick-fill stays inline at the end. Centered semibold labels from 2.2E preserved.

## Q. Shared Cross-Account Coverage

All changes live in shared finance components used by Stable, Lab, Doctor, Pharmacy, Trainer, Horse Owner. Lab-horse-only safe block (existing `hasUnsupportedLabHorse`) unchanged.

## R. Payload / Idempotency Safety

Payment payload shape (`RecordPaymentDialog.handleSubmit` → `postPaymentSession`) unchanged. Allocations still keyed by `horse_id` / client_level. Idempotency fingerprint unchanged (already includes allocation amounts). No new per-keystroke queries — composition query stays a single React Query keyed by `[invoice-composition-with-prior, tenantId, invoiceId]`.

## S. Exact Files Proposed


| File                                                 | Change                                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/finance/useInvoicePriorAllocations.ts`    | Select `line_pretax_amount, line_tax_amount, line_gross_amount`; aggregate `gross`/`pretax`/`tax` per bucket; add fields to `InvoiceBucket`. |
| `src/components/finance/PaymentAllocationEditor.tsx` | Render Pretax/Tax/Total-Due rows when `tax>0`; hide when `tax==0`; keep inputs/complement/equal-distribute using new `gross`.                |
| `src/components/finance/RecordPaymentDialog.tsx`     | Footer → one horizontal row on `md+`; date block regrouped; no logic changes.                                                                |
| `src/i18n/locales/ar.ts`                             | `توزيع المدفوعات`, `إجمالي المدفوعات`, keys for `pretax`, `tax`, `totalDue`.                                                                 |
| `src/i18n/locales/en.ts`                             | Keys for `pretax`, `tax`, `totalDue`, `totalPayments` (English "Total Payments").                                                            |
| `src/lib/finance/allocationDistribution.ts`          | No logic change; unit tests updated to feed gross caps.                                                                                      |


## T. Three-Step Execution Plan

### Step A — Frontend gross bucket authority (single narrow change)

1. `useInvoicePriorAllocations.ts`: extend Supabase select to `id, description, total_price, line_pretax_amount, line_tax_amount, line_gross_amount, horse_id, lab_horse_id`.
2. Replace `total = Number(r.total_price)` with `gross = Number(r.line_gross_amount)`, and accumulate parallel `pretaxByKey` and `taxByKey`.
3. Extend `InvoiceBucket` with `pretax: number; tax: number` (kept alongside `gross`, `prior`, `remaining`).
4. `grossTotal` now = Σ `line_gross_amount` = `invoices.total_amount` (verified by identity check).

Backend already compatible → no RPC change. Rollback = revert file.

### Step B — Distribution card, footer, date row

1. `PaymentAllocationEditor.tsx`: in bucket card, when `bucket.tax > 0` render 3-line summary (Pretax, Tax, Total Due) above input; when `bucket.tax === 0` render only Total Due row. `remainingAfter` uses `bucket.gross - allocated`.
2. `RecordPaymentDialog.tsx`: wrap footer content in `flex-wrap md:flex-nowrap items-center gap-4 md:gap-6`; both metrics on one row with tabular-nums; adjust `pb-24` if height changes.
3. `RecordPaymentDialog.tsx`: wrap date label + `SharedDateField` + "Today" in `md:flex md:items-end md:gap-4`, constrain segment group width.
4. `ar.ts`: rename `توزيع الدفعة`→`توزيع المدفوعات` and footer `إجمالي الدفعة`→`إجمالي المدفوعات`; add `pretax`, `tax`, `totalDue` keys.
5. `en.ts`: add matching English keys ("Services / Pretax", "Tax", "Total Due", "Total Payments").

Rollback = revert per file.

### Step C — Focused verification

1. Extend `src/lib/finance/__tests__/allocationDistribution.test.ts` with gross-cap fixtures (Fatin 920 / Maha 575, payment 1,300).
2. New `src/hooks/finance/__tests__/useInvoicePriorAllocations.grossBuckets.test.ts` mocking Supabase select to assert `gross/pretax/tax` aggregation and identity `Σgross = total`.
3. New `src/components/finance/__tests__/PaymentAllocationEditor.taxDisplay.test.tsx`: tax>0 renders 3-line; tax==0 hides; Total Due used for Remaining After.
4. New `src/components/finance/__tests__/RecordPaymentDialog.footer.test.tsx`: footer single-row on desktop viewport; two-metric labels in AR/EN; wrap on narrow width.
5. Run `bunx vitest run` for finance + payment suites, `bunx tsgo --noEmit`, `bun run build`.

Rollback = delete new tests, revert Step A/B.

## U. Focused Tests (assertions locked in Step C above)

All 30+ assertions from prompt §21 covered by the four suites in Step C plus preserved 2.2E suites (uxOrder, autoComplete, invoicePaginator, PDF).

## V. Manual Acceptance (per §22)

Executed only after Step C green. Scenarios 1–6 on INV-0989 (+ one zero-tax invoice + one Horse+Client-Level invoice). Verify AR/EN, desktop 810px and mobile 390px.

## W. Database Changes Required

**NONE.** Backend already uses `line_gross_amount` for both horse and client-level caps.

## X. Persistent Rows Modified

**NONE.** No repair, no backfill, no invoice/payment/ledger writes during Slice 2.2F.

## Y. Roadmap

Phase N+3 Slice 2.2F closes the pretax/gross contradiction. Slice 3 (Multi-Invoice Payment UI) will reuse `InvoiceBucket.{gross,pretax,tax}` unchanged. Slices 4 and Phase N+4 remain unaffected.

## Z. Next Exact Action

**AWAIT USER APPROVAL OF THE TAX-INCLUSIVE PAYMENT ALLOCATION PLAN.**

---

## APPROVAL HANDOFF 

> APPROVED — EXECUTE PHASE N+3 SLICE 2.2F — TAX-INCLUSIVE PAYMENT ALLOCATION TRUTH.
>
> Authorized:
>
> - Switch bucket gross authority in `useInvoicePriorAllocations.ts` to `invoice_items.line_gross_amount`; add per-bucket `pretax` and `tax` derived from `line_pretax_amount` / `line_tax_amount`.
>
> - Item tax remains attached to its existing Horse or Client-Level scope. No global Tax bucket.
>
> - `PaymentAllocationEditor.tsx`: show Pretax / Tax / Total Due when bucket tax > 0; hide when tax == 0; Remaining After uses gross.
>
> - Equal Distribution uses new gross caps; existing cent-safe cap-aware algorithm unchanged.
>
> - Preserve two-bucket manual complement, Reset, tenders, date behavior, and idempotency payload.
>
> - `RecordPaymentDialog.tsx`: sticky footer becomes one horizontal row on `md+` with `Total Payments` + `Remaining After Payment`; safe wrap on mobile.
>
> - Payment Date row regrouped so heading and D/M/Y controls form one cohesive row; centered semibold labels retained.
>
> - Arabic terminology: `توزيع الدفعةتوزيع المدفوعات`, footer `إجمالي الدفعةإجمالي المدفوعات`. English adds `Services / Pretax`, `Tax`, `Total Due`, `Total Payments`.
>
> - Focused Vitest (allocationDistribution gross fixtures, useInvoicePriorAllocations gross buckets, PaymentAllocationEditor tax display, RecordPaymentDialog footer), `bunx tsgo --noEmit`, `bun run build`.
>
> Prohibited:
>
> - Any change to `post_payment_session`, `*finance*invoice_compute_totals`, migrations, RLS, grants, or schema.
>
> - Any recalculation of approved invoice totals, tax, or line snapshots.
>
> - Any write to invoices, invoice_items, payment_sessions, payment_allocations, payment_horse_allocations, ledger_entries, customer_balances during this slice.
>
> - Synthetic Tax buckets, catalog re-pricing, or re-taxing.
>
> - Multi-Invoice Payment UI, PDF changes, refunds, reversals, credit, overpayment, Retail POS.