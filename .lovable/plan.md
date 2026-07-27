## A. Verdict

`SLICE 3.3.2 FINAL VISUAL POLISH ALIGNED — EXECUTION-READY PLAN PROVIDED`

## B. Screenshot Findings (101.png)

1. Dialog upper corners are rounded; lower-left/lower-right corners appear square — the footer background bleeds into the outer corner area.
2. Selected invoice cards show amount input + outstanding + remaining + View + items count, but no one-click "Pay in Full" action even though there is unused space in the row.
3. Header KPIs sit too close to the Close `X`, labels are top-left aligned, values below are small, and the third Arabic label needs to read exactly `الفواتير المحددة`.

## C. Bottom-Corner Root Cause

- `DialogContent` in `MultiInvoicePaymentDialog.tsx` (line 372) has `p-0 flex flex-col` but relies on shadcn's default `rounded-lg` for the outer shell.
- The sticky footer wrapper (line 590): `<div className="border-t bg-background px-4 md:px-6 py-3 shrink-0">` has NO `rounded-b-lg` and NO `overflow-hidden` on the parent, so its opaque `bg-background` paints past the rounded corner mask at the bottom.
- Narrowest correction: add `overflow-hidden` to `DialogContent` (so the rounded shell clips children) OR add `rounded-b-lg` to the footer wrapper. `overflow-hidden` on `DialogContent` is the single-line safe fix and also protects the header border.

## D. Pay-in-Full Behavior and Reused State Path

- Location: `EligibleInvoiceAccordionRow` in `SelectedInvoiceController.tsx`, inside the actions cluster at lines 358-379 (next to View + AccordionTrigger), rendered only when `selected`.
- Reused state path: call the existing `onAmountChange(next)` prop — the same setter used by `FinancialAmountInput.onValueChange` at line 328-331. This routes through the parent's `setAmounts` (MultiInvoicePaymentDialog line 529-531) and automatically re-triggers the internal Horse/Client-Level auto-proposal via the existing `useEffect` at lines 177-186 (Automatic mode). No new allocation code path.
- Value computed at click time:
  ```
  const remainingTender = tenderTotal - (invoiceAllocationTotal - currentAllocationForThisInvoice);
  const cap = Math.min(invoice.outstanding, Math.max(0, remainingTender));
  onAmountChange(cap > 0 ? cap.toFixed(2) : "");
  ```
  `remainingTender` and `invoiceAllocationTotal` are already computed in the parent — we thread two new props (`paymentAvailableForInvoice: number`) down to the row so the row does no independent math.
- Disabled when: `!selected || disabled || !allocationEnabled || paymentAvailableForInvoice <= 0 || manualMode`.
- Never calls `handleSubmit`; never touches `buildAllocationsPayload`, fingerprint, caps, or tender rows.

## E. Header KPI Visual Correction

Target element: the inline KPI grid in `MultiInvoicePaymentDialog.tsx` lines 395-443 (`data-testid="multi-invoice-header-kpis"`). Note: `MultiInvoiceKpiBar.tsx` is no longer rendered by the dialog — only this inline variant needs adjusting.

Adjustments (visual/CSS only):

- Grid: keep `grid grid-cols-2 md:grid-cols-4`, bump gap to `gap-3 md:gap-4`, and set a wider min per cell (`min-w-[9rem] md:min-w-[10rem]`).
- Spacing away from `X`: change `pe-8 lg:pe-10` to `pe-10 lg:pe-12` and add `lg:me-2` on the KPI group so it visibly detaches from the close button while staying inside the header row.
- Card: `flex flex-col items-center text-center` (replaces `items-start`) so label and value both center horizontally; keep `rounded-md border bg-muted/30`; bump padding to `px-3 py-2`.
- Label: `text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center` (comparable weight to footer labels, one step up from current `text-[10px]`).
- Value: `text-base md:text-lg font-bold tabular-nums text-foreground mt-1 text-center` (neutral/black — no `text-success/primary/warning`). Money cells keep `dir="ltr"`.
- Label fix: the third cell already uses `finance.multiInvoicePayment.summary.selectedCount`. Verify the Arabic string in `src/i18n/locales/ar.ts` reads exactly `الفواتير المحددة`; if it says anything else (e.g. `المحدد`), correct that single locale key. English stays `Selected Invoices`.
- Arabic selected count `3 من 17` remains produced by `pageIndicator` — unchanged.
- Header height: no `py` change to `DialogHeader`; only the inner cells grow one typographic step, so the header naturally accommodates without forcing a taller bar.
- Responsive: `grid-cols-2` on mobile is preserved; on lg+, the KPI group is `lg:ms-auto shrink-0` so it sits between title/client block and the `X`.

## F. Exact Files Proposed

1. `src/components/finance/MultiInvoicePaymentDialog.tsx` — add `overflow-hidden` to `DialogContent`; restyle inline KPI cells (centering, larger label/value, neutral value color, wider min-width, more spacing from `X`); pass `paymentAvailableForInvoice` prop into each `EligibleInvoiceAccordionRow`.
2. `src/components/finance/SelectedInvoiceController.tsx` — add `Pay in Full` button in the actions cluster (lines 358-379), gated on selection + available payment; reuses `onAmountChange`.
3. `src/i18n/locales/ar.ts` — add `finance.multiInvoicePayment.payInFull = "سداد بالكامل"`; verify/correct `summary.selectedCount = "الفواتير المحددة"`.
4. `src/i18n/locales/en.ts` — add `finance.multiInvoicePayment.payInFull = "Pay in Full"`.

## G. Narrow Execution Plan

1. Add `overflow-hidden` to `DialogContent` className.
2. Restyle the inline KPI cells per Section E (classes only; no structural change, no new component).
3. Add/verify locale keys for `payInFull` and `summary.selectedCount`.
4. In `MultiInvoicePaymentDialog`, compute `paymentAvailableForInvoice = Math.max(0, tenderTotal - (invoiceAllocationTotal - (invoiceAmountsUnits[inv.id] || 0)))` and pass to each row.
5. In `EligibleInvoiceAccordionRow`, add a compact `Button size="sm" variant="outline"` before the View button that clamps to `Math.min(invoice.outstanding, paymentAvailableForInvoice)` and calls `onAmountChange`.
6. Run typecheck, focused tests, production build.

## H. Focused Tests

- Unit: extend a small pure helper (or inline in a `__tests__/payInFullClamp.test.ts`) proving `payInFullAmount({outstanding, paymentAvailable}) = min(outstanding, max(0, paymentAvailable))` across 6 cases (zero tender, tender > outstanding, tender < outstanding, tender exhausted by siblings, negative float noise, exact match).
- Component render smoke: assert Pay-in-Full button disabled when `tenderTotal === 0`, enabled when selected + funds available, and hidden when row unselected.
- Locale test (existing i18n audit): assert `finance.multiInvoicePayment.payInFull` and `finance.multiInvoicePayment.summary.selectedCount` present in AR + EN with the required exact Arabic string `الفواتير المحددة`.

## I. Database and Backend Changes Required

None. UI-only slice.

## J. Roadmap

- Slice 3.3.2 (this): dialog corner containment, per-row Pay-in-Full, KPI polish.
- Slice 4 (deferred): per section 5, not started.

## K. Next Exact Action

Await approval, then execute Section G steps 1-6 in a single turn.

---

### APPROVAL HANDOFF 

```

```

```
# APPROVED — EXECUTE PHASE N+3 SLICE 3.3.2
# FINAL VISUAL POLISH AND PAY-IN-FULL ACTION
#
# EXECUTION — DO NOT PAUSE FOR ANOTHER APPROVAL

## 1. MODE

Execute the approved Slice 3.3.2 scope only.

Complete implementation, focused tests, TypeScript verification, and the
production build in one execution sequence.

Required final verdict:

`PHASE N+3 SLICE 3.3.2 IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`

Do not begin Slice 4.

Do not modify:

- backend objects;
- RPCs;
- migrations;
- schema;
- RLS;
- grants;
- permissions;
- persistent rows;
- Payment payload;
- idempotency fingerprint;
- allocation algorithms;
- Invoice or bucket cap formulas;
- frozen Tax-inclusive financial truth;
- InvoiceDetailsSheet;
- Footer calculations;
- Dialog dimensions.

---

## 2. CORRECTION ONE — DIALOG BOTTOM CORNERS

Add the narrowest safe shell containment correction to the existing near-page
`DialogContent`.

Required result:

- lower-left and lower-right corners visually match the rounded upper corners;
- Footer background remains fully inside the rounded Dialog frame;
- no square protrusions outside the lower corners;
- no clipping of Footer metrics or buttons;
- no change to Dialog width, height, Header, ScrollArea, or Footer calculations.

Preferred correction, when compatible with the current shell:

`overflow-hidden`

on the outer rounded `DialogContent`.

Do not add arbitrary nested wrappers when the one-class shell correction is
sufficient.

---

## 3. CORRECTION TWO — PAY IN FULL

Add one compact action to every selected Invoice card.

Arabic:

`سداد بالكامل`

English:

`Pay in Full`

Place it in the available action area without crowding:

- outstanding;
- Invoice amount input;
- remaining after Payment;
- View Invoice Details;
- Payment Distribution trigger.

### Visibility and disabled states

The action is:

- visible only when the Invoice is selected;
- disabled when Total Payments is zero;
- disabled when no Payment amount remains available;
- disabled while the Invoice is in Manual allocation mode;
- disabled when the row or Payment workflow is otherwise disabled.

Manual mode must not be silently overwritten.

To use Pay in Full after manual bucket editing, the user must first use the
existing:

`Return to Automatic Distribution /
إعادة التوزيع تلقائيًا`

### Amount contract

Reuse the existing controlled `onAmountChange` path.

Do not introduce another allocation state or calculation path.

At click time:

```text
otherInvoiceAllocations
=
sum(authoritative allocations for every other selected Invoice)
```

```

```

```
paymentAvailableForThisInvoice
=
max(0, Total Payments - otherInvoiceAllocations)
```

```

```

```
payInFullAmount
=
min(
  Invoice outstanding,
  paymentAvailableForThisInvoice
)
```

Required:

-   
when sufficient Payment remains, clicking fills the complete Invoice  
  
outstanding;  

-   
remaining after Payment becomes zero;  

-   
when Payment remaining is less than Invoice outstanding, the button applies  
  
only the currently permitted amount;  

-   
it never exceeds the existing dynamic Invoice maximum;  

-   
it reuses the existing automatic Horse/Client-Level proposal;  

-   
it never submits the Payment Session;  

-   
it does not modify Tender rows;  

-   
it does not modify other Invoices;  

-   
it does not bypass any validation or cap.  


Do not change the existing cap formulas.

---

## 4. CORRECTION THREE — HEADER KPI VISUAL POLISH

Keep all four KPIs inside the existing fixed `DialogHeader`.

Required KPIs:

1. `الفواتير المستحقة / Eligible Invoices`  

2. `إجمالي المبلغ المستحق / Total Outstanding`  

3. `الفواتير المحددة / Selected Invoices`  

4. `إجمالي مستحق الفواتير المحددة / Selected-Invoice Outstanding`  


Verify the third Arabic label is exactly:

`الفواتير المحددة`

### Placement

Use the available space between:

-   
the Dialog title and bilingual Client identity; and  

-   
the Close `X`.  


Move the KPI group slightly away from the Close button and toward the available  
  
central Header space.

Maintain an unobstructed Close-button safe area.

### KPI cards

Each card must have:

-   
moderately increased width;  

-   
centered label;  

-   
centered value directly below the label;  

-   
clearer typography;  

-   
label using a readable medium weight;  

-   
value using `font-bold`;  

- `tabular-nums`;  

-   
neutral foreground/black values;  

-   
LTR-isolated money;  

-   
actual Session currency;  

-   
Latin digits.  


Arabic selected count remains:

`3 من 17`

English:

`3 of 17`

Do not use slash-based formatting.

Do not apply Footer semantic colors to Header KPIs.

Do not increase the Header height unnecessarily.

Responsive behavior:

-   
desktop/laptop: four compact cards in one row when space permits;  

-   
narrower widths: controlled 2×2 arrangement;  

-   
mobile: no horizontal overflow or Close-button collision.  


---

## 5. MONEY-WHEEL BEHAVIOR — PRESERVE THE LOCKED CONTRACT

The previously implemented Payment money-input correction must remain intact.

All Payment money inputs must render:

```

```

```
type="text"
inputMode="decimal"
```

Required Wheel behavior:

-   
input value does not change;  

-   
input remains focused;  

-   
Payment workspace continues scrolling naturally.  


Do not:

-   
blur on Wheel;  

-   
call `preventDefault()` on Wheel;  

-   
call `stopPropagation()` on Wheel;  

-   
install a Wheel listener that blocks parent scrolling.  


Remove any remaining Wheel-to-blur behavior from `FinancialAmountInput` if  
  
repository inspection finds it.

No native increment/decrement controls may remain.

---

## 6. AUTHORIZED FILES

Modify only as narrowly required:

- `src/components/finance/MultiInvoicePaymentDialog.tsx`  

- `src/components/finance/SelectedInvoiceController.tsx`  

- `src/components/finance/FinancialAmountInput.tsx` only when Wheel-to-blur  
  
behavior still exists  

- `src/i18n/locales/ar.ts`  

- `src/i18n/locales/en.ts`  

-   
focused test files  


Do not modify `InvoiceDetailsSheet`.

---

## 7. REQUIRED FOCUSED TESTS

### Dialog corners

1.   
Outer `DialogContent` has the approved rounded-shell containment class.  

2.   
Footer remains inside the Dialog shell.  

3.   
Footer buttons and KPI values are not clipped.  


### Pay in Full

4.   
Button is hidden for an unselected Invoice.  

5.   
Button appears for a selected Invoice.  

6.   
Button is disabled when Total Payments is zero.  

7.   
Button is disabled when no Payment remains available.  

8.   
Button is disabled in Manual mode.  

9.   
Outstanding `432.50` with sufficient Payment commits `432.50`.  

10.   
Outstanding `500.00` with only `210.00` available commits `210.00`.  

11.   
Exact outstanding and available match commits the exact amount.  

12.   
Negative floating-point noise normalizes safely to zero.  

13.   
Clicking uses the existing `onAmountChange` path.  

14.   
Clicking triggers the existing automatic internal proposal.  

15.   
Clicking does not submit the Payment Session.  

16.   
Clicking does not change Tenders or other Invoices.  


### Header KPI polish

17.   
All four Header KPI cards render.  

18.   
Third Arabic label is exactly `الفواتير المحددة`.  

19.   
Arabic selected count renders `3 من 17`.  

20.   
English selected count renders `3 of 17`.  

21.   
Labels are centered.  

22.   
Values are centered and bold.  

23.   
Values remain neutral—not Footer semantic colors.  

24.   
KPI group preserves a safe area around the Close `X`.  

25.   
No duplicate KPI bar appears in the body.  

26.   
Mobile arrangement has no horizontal overflow.  


### Wheel regression

27.   
Tender amount remains unchanged on Wheel.  

28.   
Invoice amount remains unchanged on Wheel.  

29.   
Horse amount remains unchanged on Wheel.  

30.   
Client-Level amount remains unchanged on Wheel.  

31.   
Focus remains on the amount input.  

32.   
Parent Payment workspace continues scrolling.  

33.   
No Payment money input renders `type="number"`.  


### Verification

Run the new focused suites and relevant regressions, including:

- `financialAmountInputLogic.test.ts`  

- `multiInvoiceKpi.test.ts`  

- `multiInvoiceDistribution.test.ts`  

- `multiInvoicePaymentFingerprint.test.ts`  

- `allocationDistribution.test.ts`  

-   
relevant Single-Invoice and Multi-Invoice Payment component tests  


Then run:

```

```

```
bunx tsgo --noEmit
bun run build
```

Report exact:

-   
test files passed;  

-   
tests passed;  

-   
failed;  

-   
skipped;  

-   
warnings;  

-   
TypeScript result;  

-   
build result and advisories.  


Do not claim that all tests pass while an unrelated failing test is present.  
  
Report any pre-existing unrelated failure separately and accurately.

---

## 8. REQUIRED IMPLEMENTATION REPORT

Return:

### A. Verdict

### B. Bottom-Corner Correction

### C. Pay-in-Full Action

### D. Pay-in-Full Cap and State Path

### E. Manual-Mode Protection

### F. Header KPI Positioning

### G. Header KPI Typography and Alignment

### H. Exact Arabic Labels

### I. Wheel Behavior Verification

### J. Files Modified

### K. Production Objects Modified

### L. Persistent Rows Modified

### M. Focused Test Files

### N. Exact Test Counts

### O. Pre-Existing Unrelated Failures

### P. TypeScript Result

### Q. Build Result

### R. Manual Acceptance Script

### S. Rollback

### T. Roadmap

### U. Next Exact Action

Required verdict:

`PHASE N+3 SLICE 3.3.2 IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`

---

## 9. PROHIBITED

Do not change:

-   
allocation algorithms;  

-   
Invoice or bucket cap mathematics;  

-   
Tax calculations or scope;  

-   
frozen `line_gross_amount`;  

-   
Payment payload;  

-   
fingerprint;  

-   
Tender references;  

-   
automatic/manual architecture;  

-   
Return-to-Automatic behavior;  

-   
Footer calculations or semantic-color contract;  

-   
Invoice details;  

-   
Client Picker;  

-   
bilingual Client identity;  

-   
status localization;  

-   
Dialog width or height;  

-   
backend or database objects;  

-   
PDF generator;  

-   
Retail POS.  


Do not begin:

-   
Slice 4;  

-   
Payment Session details;  

-   
receipts;  

-   
reports;  

-   
refunds;  

-   
reversals;  

-   
overpayment;  

-   
Client credit.  


---

## 10. STOP GATE

Stop only after:

-   
all three corrections are implemented;  

-   
focused tests are authored and run;  

-   
TypeScript verification completes;  

-   
production build completes;  

-   
the final implementation report is returned.