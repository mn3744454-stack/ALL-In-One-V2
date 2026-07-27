## A. Verdict

**SLICE 3.3.1 FINAL FOUR-ISSUE ALIGNMENT COMPLETE — EXECUTION-READY PLAN PROVIDED**

Slice 3.3 is functionally implemented. Four narrow UI defects remain and block manual acceptance. This plan corrects only those four defects; no accepted behavior, math, backend, or payload is reopened.

---

## B. Root-Cause Table


| Final issue                                    | Current file/component                                                                                                                                                                                    | Proven root cause                                                                                                                                                                                                                                                                                                     | Exact narrow correction                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mouse-wheel amount mutation (Screenshot 96)    | `src/components/finance/PaymentTenderEditor.tsx:149` and `src/components/finance/PaymentAllocationEditor.tsx:301`                                                                                         | Both still render `<Input type="number">`; native browser behavior renders spinner arrows, increments on ArrowUp/Down, and mutates value on wheel. `FinancialAmountInput` is used only in `SelectedInvoiceController.tsx`; the wheel-safety work never reached the tender editor or the Single-Invoice bucket editor. | Swap both `<Input type="number">` money fields for `FinancialAmountInput` (already contract-safe: text input, blocks e/E/+/-/ArrowUp/ArrowDown, blurs on wheel without stopping propagation, supports `max`).                                                                                                                                                                                                                                                                           |
| KPIs not inside Sticky Header (Screenshot 100) | `src/components/finance/MultiInvoicePaymentDialog.tsx:~440` (renders `<MultiInvoiceKpiBar>` inside `<div class="flex-1 overflow-y-auto ...">` between the Eligible Invoices label and the accordion list) | The KPI bar lives inside the scrollable body, so it scrolls away and does not remain visible; the sticky header currently only contains title + description + `X`.                                                                                                                                                    | Move a compact variant of the four KPIs into `DialogHeader` (the shrink-0 sticky region) between the title/client block and the Close `X`. Remove the KPI bar from the body. Optionally hide the long `finance.multiInvoicePayment.description` sentence to keep header height compact.                                                                                                                                                                                                 |
| Footer metrics crowded (Screenshot 99)         | `src/components/finance/MultiInvoicePaymentDialog.tsx:538-585`                                                                                                                                            | Three metrics rendered as `<div class="flex items-center gap-4 text-sm flex-wrap">` with tiny `text-[10px]` labels and `font-semibold` (not bold-large) numbers, all in one horizontal cluster that collides with the Cancel/Record actions on the same row. Remaining color uses hardcoded `text-emerald-600`.       | Restructure footer into two groups: (a) three independent metric cells (grid `grid-cols-3 md:flex-1`), centered labels, larger bold values (`text-base md:text-lg font-bold tabular-nums`), semantic tokens (`text-success` for Total Payments; `text-primary` for Allocated; `text-warning`/`text-success`/`text-destructive` for Remaining based on state); (b) action buttons on a separate flex group with clear separator/spacing. Replace `text-emerald-600` with existing token. |
| Duplicate Invoice details (Screenshot 97)      | `src/components/finance/SelectedInvoiceController.tsx:~385` — the `<AccordionContent>` renders `<InvoiceItemsAccordionBody items={composition.items} />` before the Payment Distribution block.           | The canonical `InvoiceDetailsSheet` (opened via the new "View" button on the row) already renders horse groups, items, pretax/tax/gross. The `InvoiceItemsAccordionBody` block inside the payment expansion is now a duplicate of that surface.                                                                       | Delete the `{composition && composition.items.length > 0 && (<InvoiceItemsAccordionBody .../>)}` JSX block. Keep everything else (loading spinner, blocked-lab-horse alert, internal distribution card with buckets, Return-to-Automatic). Payment expansion now begins with the `internalDistribution` header.                                                                                                                                                                         |


---

## C. Payment Money-Input Table


| Payment money field                      | Current component                                                             | Actual rendered input type               | Uses FinancialAmountInput? | Required change                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tender amount (Multi + Single)           | `PaymentTenderEditor.tsx:148-159` `<Input type="number" min="0" step="0.01">` | `type="number"` (native spinner + wheel) | No                         | Replace with `FinancialAmountInput` (no `max`, `decimals=2`).                                                                      |
| Multi — Invoice-level amount             | `SelectedInvoiceController.tsx:322`                                           | text (FinancialAmountInput)              | Yes                        | No change.                                                                                                                         |
| Multi — Horse allocation (bucket)        | `SelectedInvoiceController.tsx:463`                                           | text (FinancialAmountInput)              | Yes                        | No change.                                                                                                                         |
| Multi — Client-Level allocation (bucket) | `SelectedInvoiceController.tsx:463` (same bucket loop)                        | text (FinancialAmountInput)              | Yes                        | No change.                                                                                                                         |
| Single-Invoice bucket amount             | `PaymentAllocationEditor.tsx:301` `<Input type="number">`                     | `type="number"` (native spinner + wheel) | No                         | Replace with `FinancialAmountInput` (`max = bucket.remaining`, wire `onInvalidDraft` over-max to existing per-bucket error state). |


---

## D. Sticky Header KPI Contract

Target: `DialogHeader` in `MultiInvoicePaymentDialog.tsx` (the `p-6 pb-3 shrink-0 border-b` region).

Structure:

```text
[Title + BilingualClientName]    [4 compact KPI cells]    [Close X (auto)]
```

- Container: `flex items-center gap-4 flex-wrap` with title block on the start side, KPI cluster on the end side (`ms-auto`).
- KPI cells: reuse `MultiInvoiceKpiBar` with a new compact `variant="header"` prop (or inline four cells) — vertical stack per cell (label above, value below), `text-[10px] uppercase tracking-wide text-muted-foreground` label, `text-sm font-semibold tabular-nums` value, `dir="ltr"` money.
- Long description sentence (`finance.multiInvoicePayment.description`) is hidden when four KPIs render (kept in JSX only for a mobile fallback below `sm:`).
- Bilingual client identity kept via `<BilingualClientName>` next to the title.
- Selected count uses existing i18n key `finance.multiInvoicePayment.pageIndicator` (`4 من 17` / `4 of 17`) — already validated by `multiInvoiceKpi.test.ts`. Verify locales still emit "من" / "of" (no slash, no `المحدد` alone).
- Remove the second `<MultiInvoiceKpiBar>` from the scrollable body.
- Responsive: below `md`, KPIs collapse to a 2×2 grid still inside the header; below `sm`, description sentence re-appears and KPIs render as a horizontal scroll strip inside header (still `shrink-0`).

---

## E. Footer Visual Contract

Container (unchanged wrapper): `border-t bg-background px-6 py-3 shrink-0`.

New inner layout:

```text
[ Total Payments ][ Allocated to Invoices ][ Remaining to Allocate ]  |  [Cancel] [Record Payments]
     success           primary                warning/success/destructive
```

- Outer: `flex flex-wrap items-center gap-4` — metrics group takes `flex-1 min-w-0`; actions group is `flex items-center gap-2 shrink-0`.
- Metrics group: `grid grid-cols-3 gap-3` (md+) / `grid-cols-1` (mobile fallback). Each cell:
  - Card-style `rounded-md border bg-muted/20 px-3 py-2 flex flex-col items-center`.
  - Label: `text-xs text-muted-foreground text-center`.
  - Value: `text-lg md:text-xl font-bold tabular-nums` with `dir="ltr"`.
- Semantic colors (existing tokens only — no hardcoded hex):
  - Total Payments: `text-success` (already in tokens).
  - Allocated to Invoices: `text-primary`.
  - Remaining: `text-warning` when `> 0`; `text-success` when `== 0` (and tenderTotal > 0); `text-destructive` when `overAllocationUnits > 0` (invalid state).
- Actions: unchanged buttons, kept in their own `flex` group separated from metrics by wrap-safe spacing (no vertical divider needed).
- No calculation, validation, or submit-guard change.

---

## F. Duplicate Detail Removal Contract

- **Remove** in `SelectedInvoiceController.tsx` `<AccordionContent>`:
  ```tsx
  {composition && composition.items.length > 0 && (
    <InvoiceItemsAccordionBody items={composition.items} currency={currency} />
  )}
  ```
- **Remove** the now-unused `InvoiceItemsAccordionBody` import.
- **Keep** in the same `<AccordionContent>`:
  - `isLoading` spinner.
  - `blockedLabHorse` alert.
  - Internal Distribution card (label, Return-to-Automatic button, per-bucket rows with `FinancialAmountInput`, per-bucket over-max hint, bucket totals).
- **Do not** touch `useInvoicePriorAllocations` — it is still needed for composition/buckets/tax/manual state.
- **Do not** touch `InvoiceDetailsSheet.tsx` — the canonical detail surface stays exactly as-is.
- Payment expansion first visible element becomes the `internalDistribution` header when the invoice is complex, or nothing (empty accordion body except loading/blocked states) when the invoice is simple.

---

## G. Exact Files Proposed

Modified:

- `src/components/finance/PaymentTenderEditor.tsx` — swap `Input type=number` → `FinancialAmountInput`.
- `src/components/finance/PaymentAllocationEditor.tsx` — swap `Input type=number` → `FinancialAmountInput` with per-bucket `max` cap.
- `src/components/finance/MultiInvoicePaymentDialog.tsx` — move KPIs into `DialogHeader`, remove body KPI bar, restructure footer visual layout.
- `src/components/finance/MultiInvoiceKpiBar.tsx` — add optional `variant="header" | "default"` prop (compact header rendering) OR keep component untouched and inline the four cells in the header (implementation chooses one, no API break either way).
- `src/components/finance/SelectedInvoiceController.tsx` — remove `<InvoiceItemsAccordionBody>` JSX + import.

Read-only reference (unchanged): `FinancialAmountInput.tsx`, `financialAmountInputLogic.ts`, `InvoiceDetailsSheet.tsx`, `InvoiceItemsAccordionBody.tsx` (retained for other callers), all i18n keys already exist.

---

## H. Two-Step Execution Plan

### Step A — Input Safety + Sticky Header/Footer Correction

1. `PaymentTenderEditor.tsx`: replace the amount `<Input type="number">` with `<FinancialAmountInput value={parseAmount(row.amount)} onValueChange={n => patchRow(row.id, { amount: n === null ? "" : n.toFixed(2) })}>` preserving `disabled`, `dir="ltr"`, `className`.
2. `PaymentAllocationEditor.tsx`: same swap at line 301; pass `max={bucket.remaining}` and wire `onInvalidDraft(reason==="over-max")` into the component's existing per-bucket error state.
3. `MultiInvoicePaymentDialog.tsx`:
  - Rewrite `DialogHeader` to a horizontal `flex items-center` layout: title/client block on start, four compact KPI cells (`ms-auto`) using values already computed (`invoices.length`, `totalEligibleOutstanding`, `selectedInvoices.length`, `selectedInvoices.reduce(s+outstanding)`).
  - Hide the long description via `hidden sm:hidden md:hidden` (or drop it entirely — keep the string in i18n).
  - Delete the body `<MultiInvoiceKpiBar>` block.
  - Rewrite the footer inner layout per Section E: 3-cell metrics grid + separate actions group; replace `text-emerald-600` with semantic `text-success`/`text-warning`/`text-destructive` per state.
4. Focused tests (see Section I).
5. TypeScript + build.

**Rollback**: revert the four files (single commit).

### Step B — Remove Duplicate Invoice Detail + Final Verification

1. `SelectedInvoiceController.tsx`: delete the `InvoiceItemsAccordionBody` JSX block and its import.
2. Verify Payment expansion opens directly into Internal Distribution card (complex invoice) or empty/loader (simple invoice).
3. Verify `InvoiceDetailsSheet` still shows the complete canonical detail via the "View" button.
4. Confirm no change to `useInvoicePriorAllocations`, breakdown math, `onResolved`, `bucketValues`, `manualMode`, or `returnToAutomatic`.
5. Run all focused tests + `bunx tsgo --noEmit` + `bun run build`.

**Rollback**: revert `SelectedInvoiceController.tsx` (single-file commit).

---

## I. Focused Tests

New / updated files:

- `src/components/finance/__tests__/PaymentTenderEditor.wheel.test.tsx` — asserts input `type !== "number"`, no spinner, wheel event does not mutate value, ArrowUp/Down do not mutate value, parent scroll not stopped (wheel still bubbles).
- `src/components/finance/__tests__/PaymentAllocationEditor.wheel.test.tsx` — same assertions for the Single-Invoice bucket editor plus `max` cap enforcement.
- `src/components/finance/__tests__/SelectedInvoiceController.wheel.test.tsx` — invoice-level + horse + client-level allocation fields already use `FinancialAmountInput`; add explicit wheel/Arrow assertions.
- `src/components/finance/__tests__/MultiInvoicePaymentDialog.header.test.tsx` — four KPIs render inside the sticky `<header>` role, remain visible after simulating body scroll, Arabic renders `4 من 17`, no `المحدد` fallback string, header height ≤ threshold, no second KPI bar in body.
- `src/components/finance/__tests__/MultiInvoicePaymentDialog.footer.test.tsx` — three metric cells with role/testid, values are `font-bold` / `text-lg+`, Remaining cell class swaps between `text-warning` / `text-success` / `text-destructive` based on state, actions group not collapsed into metrics group at large widths.
- `src/components/finance/__tests__/SelectedInvoiceController.noDuplicate.test.tsx` — expanding the payment accordion no longer renders `InvoiceItemsAccordionBody`; canonical detail still available through `InvoiceDetailsSheet` mock via `onOpenDetails`.
- Regression: existing `multiInvoiceKpi.test.ts`, `multiInvoiceDistribution.test.ts`, `multiInvoicePaymentFingerprint.test.ts`, `financialAmountInputLogic.test.ts`, `allocationDistribution.test.ts` must still pass unchanged.
- `bunx tsgo --noEmit` — 0 errors.
- `bun run build` — success.
- Report exact pass/fail/skip/warn counts.

---

## J. Database and Backend Changes Required

**None.** No schema, RPC, RLS, grant, permission, migration, or trigger change. `post_payment_session`, `get_payment_session`, `_finance_invoice_approve_inline`, allocation tables — untouched.

---

## K. Persistent Rows Modified

**None.** No `INSERT`, `UPDATE`, `DELETE`, or backfill. No historical invoice, payment, ledger, allocation, or tenant row is written.

---

## L. Roadmap

- Slice 3.3.1 (this plan) — four-issue UI alignment; unblocks manual acceptance of Slice 3.3.
- Slice 3.3 → **ACCEPTED** once 3.3.1 lands and QA passes.
- Slice 4 — deferred; not started this turn.

---

## M. Next Exact Action

**AWAIT USER APPROVAL OF THE FINAL SLICE 3.3.1 EXECUTION PLAN.**

---

## APPROVAL HANDOFF 

> ```
>
> ```
>
> ```
> # APPROVED — EXECUTE PHASE N+3 SLICE 3.3.1
> # FINAL FOUR-ISSUE UI STABILIZATION
> #
> # MONEY INPUT SAFETY
> # KPIs INSIDE THE EXISTING STICKY HEADER
> # CLEAR PAYMENT FOOTER
> # REMOVE DUPLICATED INVOICE DETAIL
> #
> # EXECUTION — DO NOT PAUSE FOR ANOTHER APPROVAL
>
> ## 1. MODE
>
> EXECUTION.
>
> Implement only the four final corrections defined below.
>
> Proceed through implementation, focused tests, TypeScript, and production build
> without pausing for another approval.
>
> Required final verdict:
>
> `PHASE N+3 SLICE 3.3.1 IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`
>
> Do not begin Slice 4.
>
> Do not modify:
>
> - backend RPCs;
> - database functions;
> - schema;
> - migrations;
> - RLS;
> - grants;
> - permissions;
> - persistent financial rows;
> - Payment payload shape;
> - idempotency fingerprint;
> - allocation algorithms;
> - Invoice maximum calculations;
> - bucket maximum calculations;
> - Tax calculations;
> - PDF generation.
>
> ---
>
> ## 2. ACCEPTED AREAS — DO NOT REOPEN
>
> Preserve without redesign:
>
> - near-page Dialog dimensions;
> - Client Picker;
> - bilingual Client identity;
> - Invoice selection;
> - conditional Oldest-First behavior;
> - automatic allocation;
> - manual allocation;
> - Return to Automatic Distribution;
> - Invoice outstanding cap;
> - Horse and Client-Level bucket caps;
> - frozen `line_gross_amount` authority;
> - Horse Tax scope;
> - Client-Level Tax scope;
> - Tender references;
> - atomic `postPaymentSession`;
> - Item counts;
> - canonical `InvoiceDetailsSheet`;
> - status localization;
> - Customer Balances terminology.
>
> ---
>
> ## 3. CORRECTION ONE — PAYMENT MONEY INPUT SAFETY
>
> Repository inspection proved that these fields still use native number inputs:
>
> - Tender amount in `PaymentTenderEditor.tsx`;
> - Single-Invoice bucket amount in `PaymentAllocationEditor.tsx`.
>
> Replace them with the existing:
>
> `FinancialAmountInput`
>
> Use the component’s actual repository API and types.
>
> Do not introduce a second money-input component.
>
> ### Required behavior for every Payment money field
>
> Applies to:
>
> - Tender amount;
> - Multi-Invoice Invoice-level amount;
> - Multi-Invoice Horse amount;
> - Multi-Invoice Client-Level amount;
> - Single-Invoice Horse/Client-Level bucket amount.
>
> Required:
>
> - rendered input type is `text`;
> - `inputMode="decimal"`;
> - accepts numeric decimal entry only;
> - maximum two decimal places;
> - supports a valid empty editing state;
> - accepts Latin digits;
> - may normalize supported Arabic numeric input through the existing normalizer;
> - no native spinner arrows;
> - mouse wheel does not change the value;
> - Arrow Up and Arrow Down do not change the value;
> - `e`, `E`, `+`, and `-` are rejected;
> - existing maximum caps remain enforced;
> - invalid drafts do not enter financial totals, payload, or fingerprint.
>
> ### Wheel behavior — mandatory correction
>
> Do not:
>
> - blur the input on wheel;
> - call `preventDefault()` on wheel;
> - call `stopPropagation()` on wheel;
> - install a native wheel listener that prevents the parent workspace from
>   scrolling.
>
> Because the rendered input is `type="text"`, the browser must not increment or
> decrement its value through the wheel.
>
> The expected behavior while the field remains focused is:
>
> - the Payment workspace scrolls normally;
> - the input remains focused;
> - the amount does not change.
>
> Remove any existing `onWheel` blur behavior from `FinancialAmountInput` if it
> exists.
>
> Preserve existing Invoice and bucket maximum validation.
>
> ---
>
> ## 4. CORRECTION TWO — FOUR KPIs INSIDE THE EXISTING STICKY HEADER
>
> Move the four Invoice KPIs into the existing `DialogHeader`.
>
> Do not create a separate KPI row beneath the Header.
>
> Do not leave another KPI bar in the scrollable body.
>
> ### Header structure
>
> Use the existing available horizontal space:
>
> ```text
> Title + Bilingual Client Identity
> Four compact KPI cells
> Close X safe area
> ```
>
> The Header remains fixed because it is outside the main ScrollArea.
>
> The long supporting sentence may be removed completely when needed:
>
> `سجّل مدفوعات بجلسة واحدة على عدة فواتير مستحقة لهذا العميل.`
>
> Preserve:
>
> - `تسجيل مدفوعات العميل`;  
>
> -   
> bilingual Client identity;  
>
> -   
> safe spacing for the Close X.  
>
>
> ### Required KPI labels
>
> Arabic:
>
> - `الفواتير المستحقة`  
>
> - `إجمالي المبلغ المستحق`  
>
> - `الفواتير المحددة`  
>
> - `إجمالي مستحق الفواتير المحددة`  
>
>
> English:
>
> - `Eligible Invoices`  
>
> - `Total Outstanding`  
>
> - `Selected Invoices`  
>
> - `Selected-Invoice Outstanding`  
>
>
> ### Selected count
>
> Arabic:
>
> `4 من 17`
>
> English:
>
> `4 of 17`
>
> Do not use:
>
> - `المحدد`;  
>
> - `17 / 4`;  
>
> -   
> slash-based count formatting.  
>
>
> ### Layout
>
> -   
> four independent compact cells;  
>
> -   
> label centered above value;  
>
> -   
> monetary values LTR-isolated;  
>
> -   
> actual Session currency;  
>
> -   
> Latin digits;  
>
> -   
> no collision with title, Client identity, or Close X;  
>
> -   
> compact Header height;  
>
> -   
> no unnecessary Header enlargement.  
>
>
> Responsive behavior:
>
> -   
> desktop/laptop: all four cells in one compact row where space permits;  
>
> -   
> narrower screens: controlled 2×2 KPI grid inside the Header;  
>
> -   
> mobile: compact wrapping inside the Header without horizontal scrolling.  
>
>
> Reuse `MultiInvoiceKpiBar` with a compact Header variant when practical.
>
> Remove its old instance from the body ScrollArea.
>
> ---
>
> ## 5. CORRECTION THREE — PAYMENT FOOTER VISUAL DISTRIBUTION
>
> Do not change Footer calculations or validation.
>
> The Footer continues to display:
>
> 1.   
> Total Payments.  
>
> 2.   
> Allocated to Invoices.  
>
> 3.   
> Remaining to Allocate to Invoices.  
>
>
> Arabic:
>
> - `إجمالي المدفوعات`  
>
> - `الموزع على الفواتير`  
>
> - `المتبقي للتوزيع على الفواتير`  
>
>
> ### Metric group
>
> Render three independent and evenly distributed metric cells.
>
> Each cell must have:
>
> -   
> centered label;  
>
> -   
> larger bold numeric value;  
>
> - `tabular-nums`;  
>
> -   
> LTR-isolated money;  
>
> -   
> comfortable spacing;  
>
> -   
> enough width for large amounts.  
>
>
> Use existing semantic design tokens only:
>
> -   
> Total Payments: success presentation;  
>
> -   
> Allocated to Invoices: primary/informational presentation;  
>
> -   
> Remaining:  
>
>   -   
>   warning when greater than zero;  
>
>   -   
>   success when exactly zero and the Payment is balanced;  
>
>   -   
>   destructive only for an invalid over-allocation state.  
>
>
> Do not use hardcoded color values.
>
> ### Actions group
>
> Keep separately:
>
> - `إلغاء`  
>
> - `تسجيل المدفوعات`  
>
>
> The actions must not share the metric grid.
>
> Desktop:
>
> -   
> metrics use the main Footer width;  
>
> -   
> actions remain a separate compact group.  
>
>
> Mobile:
>
> -   
> metrics wrap into a readable grid;  
>
> -   
> actions move to a separate full-width row;  
>
> -   
> no overlap or clipping.  
>
>
> ---
>
> ## 6. CORRECTION FOUR — REMOVE DUPLICATED INVOICE DETAILS
>
> The canonical `View Invoice Details / عرض تفاصيل الفاتورة` action already shows:
>
> -   
> Invoice Items;  
>
> -   
> Horse grouping;  
>
> -   
> Package details;  
>
> -   
> Package snapshot children;  
>
> -   
> Pretax;  
>
> -   
> Tax;  
>
> -   
> Gross;  
>
> -   
> complete frozen Invoice truth.  
>
>
> Do not repeat those details inside the Payment expansion.
>
> ### Remove
>
> From `SelectedInvoiceController.tsx`, remove:
>
> -   
> the rendered `InvoiceItemsAccordionBody`;  
>
> -   
> its now-unused import;  
>
> -   
> any duplicated Item/Package/Tax detail markup inside the Payment expansion.  
>
>
> Do not modify:
>
> - `InvoiceDetailsSheet`;  
>
> - `useInvoicePriorAllocations`;  
>
> -   
> frozen Item data;  
>
> -   
> Tax or allocation math.  
>
>
> ### Complex Invoice behavior
>
> For a Multi-Horse or Horse + Client-Level Invoice, provide a collapsible Payment  
>
> section whose trigger is:
>
> Arabic:
>
> `توزيع المدفوعات داخل الفاتورة`
>
> English:
>
> `Payment Distribution Within Invoice`
>
> When opened, its first visible content must be the controlled Payment  
>
> Distribution section.
>
> It may contain only:
>
> -   
> automatic/manual mode;  
>
> -   
> Horse allocations;  
>
> -   
> Client-Level allocation;  
>
> -   
> proposed Payment;  
>
> -   
> remaining after proposed Payment;  
>
> -   
> maximum validation;  
>
> -   
> Return to Automatic Distribution;  
>
> -   
> Payment validation.  
>
>
> It must not repeat Invoice Items.
>
> ### Simple Invoice behavior
>
> For a one-Horse-only or Client-Level-only Invoice:
>
> -   
> do not render an empty Payment-distribution Accordion;  
>
> -   
> do not render an unnecessary bucket editor;  
>
> -   
> retain the compact Invoice card;  
>
> -   
> retain the Item-count metadata;  
>
> -   
> retain `عرض تفاصيل الفاتورة / View Invoice Details`.  
>
>
> ### Item count
>
> The Item count remains visible as card metadata:
>
> - `بنود الفاتورة (X)`  
>
> - `Invoice Items (X)`  
>
>
> It is not the Payment-expansion trigger.
>
> ---
>
> ## 7. AUTHORIZED FILES
>
> Modify only as narrowly required:
>
> - `src/components/finance/FinancialAmountInput.tsx`  
>
> - `src/components/finance/PaymentTenderEditor.tsx`  
>
> - `src/components/finance/PaymentAllocationEditor.tsx`  
>
> - `src/components/finance/MultiInvoicePaymentDialog.tsx`  
>
> - `src/components/finance/MultiInvoiceKpiBar.tsx`  
>
> - `src/components/finance/SelectedInvoiceController.tsx`  
>
> -   
> focused finance test files  
>
>
> Locale files may be modified only when a required label is genuinely absent.
>
> Do not change backend or financial persistence files.
>
> ---
>
> ## 8. REQUIRED FOCUSED TESTS
>
> Author and run focused tests proving:
>
> ### Money input
>
> 1.   
> Tender amount does not render `type="number"`.  
>
> 2.   
> Tender amount has no native spinner behavior.  
>
> 3.   
> Tender amount remains unchanged on mouse wheel.  
>
> 4.   
> Parent Payment workspace still scrolls while Tender input remains focused.  
>
> 5.   
> Input remains focused during wheel scrolling.  
>
> 6.   
> Arrow Up and Arrow Down do not change Tender amount.  
>
> 7.   
> Single-Invoice bucket amount has the same safety.  
>
> 8.   
> Multi-Invoice Invoice amount has the same safety.  
>
> 9.   
> Horse amount has the same safety.  
>
> 10.   
> Client-Level amount has the same safety.  
>
> 11.   
> Numeric-only decimal entry remains functional.  
>
> 12.   
> Existing maximum caps remain functional.  
>
>
> ### Header KPI
>
> 13.   
> All four KPIs render inside `DialogHeader`.  
>
> 14.   
> No duplicate KPI bar renders in the body ScrollArea.  
>
> 15.   
> KPIs remain visible while the body scrolls.  
>
> 16.   
> Arabic renders `4 من 17`.  
>
> 17.   
> English renders `4 of 17`.  
>
> 18.   
> Generic `المحدد` is absent.  
>
> 19.   
> Header remains compact.  
>
> 20.   
> Close X has an unobstructed safe area.  
>
>
> ### Footer
>
> 21.   
> Footer renders three independent metric cells.  
>
> 22.   
> Values use large bold typography.  
>
> 23.   
> Total Payments uses the success semantic state.  
>
> 24.   
> Allocated uses the primary/information semantic state.  
>
> 25.   
> Positive Remaining uses warning.  
>
> 26.   
> Zero balanced Remaining uses success.  
>
> 27.   
> Invalid over-allocation uses destructive.  
>
> 28.   
> Actions remain in a separate group.  
>
> 29.   
> Large values do not collide.  
>
> 30.   
> Mobile layout wraps without overlap.  
>
>
> ### Duplicate detail
>
> 31.   
> Canonical Invoice detail still displays complete Invoice Items.  
>
> 32.   
> Payment expansion does not render `InvoiceItemsAccordionBody`.  
>
> 33.   
> Payment expansion begins with Payment Distribution.  
>
> 34.   
> Complex Invoice retains automatic/manual controls.  
>
> 35.   
> Simple Invoice renders no empty Payment Accordion.  
>
> 36.   
> Item-count metadata remains visible.  
>
> 37.   
> Automatic allocation math is unchanged.  
>
> 38.   
> Manual allocation math is unchanged.  
>
> 39.   
> Frozen Tax-inclusive allocation math is unchanged.  
>
> 40.   
> Closing detail preserves Payment state.  
>
>
> ### Verification
>
> Run the new focused tests and relevant regressions, including:
>
> - `financialAmountInputLogic.test.ts`  
>
> - `multiInvoiceKpi.test.ts`  
>
> - `multiInvoiceDistribution.test.ts`  
>
> - `multiInvoicePaymentFingerprint.test.ts`  
>
> - `allocationDistribution.test.ts`  
>
> -   
> relevant Single-Invoice Payment tests  
>
>
> Then run:
>
> ```
>
> ```
>
> ```
> bunx tsgo --noEmit
> bun run build
> ```
>
> Report exact:
>
> -   
> test files passed;  
>
> -   
> tests passed;  
>
> -   
> failed;  
>
> -   
> skipped;  
>
> -   
> warnings;  
>
> -   
> TypeScript result;  
>
> -   
> build result and advisories.  
>
>
> Do not defer these focused tests.
>
> ---
>
> ## 9. REQUIRED IMPLEMENTATION REPORT
>
> Return:
>
> ### A. Verdict
>
> ### B. Money-Input Root Cause and Correction
>
> ### C. Payment Money Fields Updated
>
> ### D. Wheel and Arrow-Key Verification
>
> ### E. Sticky Header KPI Placement
>
> ### F. Selected-Count Formatting
>
> ### G. Footer Layout and Semantic States
>
> ### H. Duplicate Detail Removed
>
> ### I. Complex Payment Distribution Expansion
>
> ### J. Simple Invoice Behavior
>
> ### K. Accepted Financial Logic Preserved
>
> ### L. Files Modified
>
> ### M. Production Objects Modified
>
> ### N. Persistent Rows Modified
>
> ### O. Focused Test Files
>
> ### P. Exact Test Counts
>
> ### Q. TypeScript Result
>
> ### R. Build Result
>
> ### S. Manual Acceptance Script
>
> ### T. Rollback
>
> ### U. Roadmap
>
> ### V. Next Exact Action
>
> Required verdict:
>
> `PHASE N+3 SLICE 3.3.1 IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`
>
> ---
>
> ## 10. STOP GATE
>
> Stop only after:
>
> -   
> both execution steps are complete;  
>
> -   
> focused tests are authored and run;  
>
> -   
> TypeScript passes;  
>
> -   
> production build passes;  
>
> -   
> the complete final report is returned.  
>
>
> Do not begin:
>
> -   
> Slice 4;  
>
> -   
> Payment Session details;  
>
> -   
> receipts;  
>
> -   
> reports;  
>
> -   
> refunds;  
>
> -   
> reversals;  
>
> -   
> overpayment;  
>
> -   
> Client credit;  
>
> -   
> PDF changes;  
>
> -   
> Retail POS.