# Slice 2.2E — Single-Invoice Payment UX Realignment

## A. Verdict

**SINGLE-INVOICE PAYMENT UX CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED**

Presentation-only correction. No backend, RPC, RLS, migration, or persistent-row change required.

## B. Attachment Findings

- **68**: Invoice summary + Payment Date first. Date labels (اليوم/الشهر/السنة) rendered small (`text-[10px]`) and left-aligned above segmented Selects, not centered or Semi-Bold; Month segment shows "07 — يوليو" and consumes wide space; there is a standalone `المبلغ (Payment Amount)` block showing `SAR 0.00` acting as a computed row (already read-only). Confirmed by `RecordPaymentDialog.tsx` L419–452.
- **69**: Payment Distribution card (Fatin/Maha) appears **before** Payment Method Details. Contains three action buttons: `Distribute by Items` (useProposal), `Distribute Equally`, `Reset`, plus per-bucket "Assign remainder" button. Confirmed by `PaymentAllocationEditor.tsx` L197–216, 295–305.
- **70**: Payment Method Details appears **after** distribution, with computed `المبلغ المدفوع / إجمالي الدفعة / غير الموزع` summary and `Add Payment Method` button. Duplicate `Total Payment / Outstanding After` block visible on the scrollable body (RecordPaymentDialog L580–604).
- **71**: At zoomed-out view, distribution and methods are vertically distant; sticky footer only contains `MissingRequirementsBar` + Cancel + Record buttons — no live totals.

## C. Current Section Order (as built)

```text
Sticky Header
Scroll body:
  1. Invoice Items (collapsible)
  2. Invoice Summary card (total / paid / outstanding)
  3. Payment Date (SharedDateField)
  4. Payment Amount label + computed totalPayment + "Pay Full Outstanding" link
  5. Payment Distribution (PaymentAllocationEditor)  ← wrong position
  6. Separator
  7. Payment Method Details (rows + Add row)
  8. Overpayment alert
  9. Payment Summary duplicate (totalPayment + outstandingAfter + willBeFullyPaid badge)
Sticky Footer: MissingRequirementsBar + Cancel + Record
```

## D. Current Payment-Total Sources

Only **one** editable source already exists: `totalPayment = Σ rows[i].amount` (RecordPaymentDialog L137–139). The "Payment Amount" block at L428–452 is a **read-only display** of `totalPayment`, not a duplicate editable field. No removal needed — only relocation/renaming.

## E. Target Section Order

```text
Sticky Header
Scroll body:
  1. Invoice Items (collapsible)          — unchanged
  2. Invoice Summary card                  — unchanged
  3. Payment Date                          — layout polish only
  4. Payment Method Details (tender rows + Add)   ← moved up
  5. Payment Distribution (allocation editor)     ← moved down
Sticky Footer: Payment Total + Remaining After Payment + Cancel + Record
(remove duplicate "Payment Summary" block from scroll body;
 remove standalone "Payment Amount" totalPayment display from scroll body —
 its role is now performed by the sticky footer)
```

## F. Tender-Total Authority

`totalPayment` (Σ tender rows) remains the sole source. It is passed to `PaymentAllocationEditor` via `paymentAmount` prop and displayed in the sticky footer. No second editable field is introduced.

## G. Pay Full Amount Preservation

Current `fillFullAmount()` (L194–198) only runs when `rows.length === 1` and writes `summary.outstandingAmount` into that single row's amount. Preserved verbatim, and moved with the tender section so it stays adjacent to the (now first) tender row. With Split Tender (rows.length > 1) the link stays hidden — the accepted current behavior.

## H. Equal-Distribution Contract

Preserve existing `distributeEqually()` in `PaymentAllocationEditor.tsx` L115–161 unchanged (integer cents, cap-aware, deterministic 1-cent residual). Continue calling with `paymentAmount = totalPayment`.

## I. Manual Auto-Completion Contract

**New** behavior added inside `PaymentAllocationEditor.updateBucket()`:

- Compute `unresolved = buckets.filter(b => value[b.key] === "" || value[b.key] === undefined)` **before** applying the edit; a bucket touched by the user (has any string, including "0") counts as resolved.
- After user writes bucket K, recompute `unresolved` excluding K.
- If exactly **one** bucket U remains unresolved:
  - `complement = paymentAmount − Σ(resolved amounts including K)`, in integer cents.
  - If `complement ≥ 0` and `complement ≤ U.remaining` → write `complement.toFixed(2)` into U.
  - If `complement < 0` or `> U.remaining` → leave U empty and let existing validator surface `FIN_HORSE_ALLOCATION_MISMATCH`.
- Two-bucket case is the degenerate `unresolved.length === 1` case, giving the required 700→300 / 400→600 behavior.
- More than two buckets: unresolved.length > 1 ⇒ no auto-fill (contract §10).

Reset marks all buckets as unresolved again (values set to `""`).

## J. Reset Contract

Keep existing `resetAllocations()` (L163–167): sets every bucket value to `""`. Does not touch tender rows, date, or invoice selection. Submission gates on validator (`allocationValid`) as today.

## K. Client-Level and Simple-Invoice Behavior

Existing gating (RecordPaymentDialog L104–106) preserved:

- `needsEditor` true only when `hasHorseScoped && (distinctHorses > 1 || hasClientLevel)`.
- Single-horse and client-level-only invoices show no editor; server auto-attributes.
- `blockedLabHorse` block preserved unchanged.

## L. Sticky-Footer Contract

Footer restructured:

```
[ Payment Total: SAR X   Remaining After Payment: SAR Y ]     [Cancel] [Record Payment]
```

- Two financial rows (Semi-Bold, tabular-nums, `dir="ltr"`, colored `text-warning` when remaining > 0.01, `text-success` when ≤ 0.01).
- `MissingRequirementsBar` moved from footer into the scroll body just above the sticky footer (still gated by `attemptedSubmit`) so it does not violate the "only totals + actions" rule.
- Duplicate "Payment Summary" block (RecordPaymentDialog L580–604) removed.
- Scroll body keeps `pb-4` already present; add `pb-24` on the scroll container to guarantee the last field clears the taller footer on mobile.
- Record Payment button disabled logic unchanged.

## M. Payment-Date Layout

Modify `src/components/ui/shared-date-field.tsx` only in visual/class terms:

- Segment labels: `text-[10px]` → `text-xs font-semibold`, add `text-center` and `w-full block`.
- Keep the three Select triggers at `h-9`; Month trigger already `min-w-0 px-2` — add `md:max-w-[10rem]` on the Month wrapper to stop excessive growth; Day/Year unchanged.
- Keep the outer segment shell forced `dir="ltr"` (Day–Month–Year) as today; add `md:grid-cols-[auto_auto_auto] md:justify-start` so the trio hugs left in Arabic (RTL page) too, avoiding whitespace crowding described in §13.
- Add a leading in-row label `Payment Date` prefix only in the RecordPaymentDialog caller (not the shared component) — the shared field stays generic. In RecordPaymentDialog: on `md:` breakpoint, wrap Date label + `SharedDateField` in a `md:flex md:items-end md:gap-4` so `Payment Date | D | M | Y` reads as one row; mobile falls back to stacked.
- Digits stay Latin (already enforced via `padStart` + `tabular-nums`).

No behavior change to date selection.

## N. Shared Cross-Account Coverage

`RecordPaymentDialog` is the single Payment dialog used across Stable, Laboratory, Doctor/Clinic, Horse Owner, Pharmacy, Independent Trainer, and any Invoice-capable account. Verified via `rg RecordPaymentDialog src`. No account-specific fork exists or is introduced.

## O. Payload and Idempotency Safety

- `handleSubmit()` continues to build `PaymentEntry[]` from tender rows and `BucketAllocation[]` from `bucketValues`. Section reordering does not touch payload shape.
- `fingerprintPayload()` in `useInvoicePayments.ts` already keys on `{ invoiceId, paymentDate, rows[amount,method,ref,notes], buckets[key,kind,horseId,amount] }` — every material field is still routed through it; auto-completion writes into `bucketValues` before submit, so its effect appears in the fingerprint just like a manual edit.
- No second writer added. `postPaymentSession` is not touched.

## P. Exact Files Proposed


| File                                                                                   | Change                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/finance/RecordPaymentDialog.tsx`                                       | Reorder JSX sections (Date → Methods → Distribution); delete standalone "Payment Amount" display block (L425–452) and duplicate "Payment Summary" block (L580–604); wrap Date row for `md:` inline layout; extend sticky footer with Payment Total + Remaining After Payment rows; move `MissingRequirementsBar` out of footer into scroll body; add `pb-24` on scroll body.                                                                |
| `src/components/finance/PaymentAllocationEditor.tsx`                                   | Remove `Distribute by Items` button + `applyProposal()` helper + `isFullPayment` gating for it; remove per-bucket `assignAll` button (L295–305); remove trailing per-bucket summary rows (L312–335, allocated/total/unallocated triplet — footer now owns totals; keep only validation Alert + Balanced badge); add `useEffect`/handler for last-unresolved-bucket auto-completion inside `updateBucket()`.                                 |
| `src/components/ui/shared-date-field.tsx`                                              | Segment label class → `text-xs font-semibold text-center block w-full`; add `md:max-w-[10rem]` cap on Month wrapper; no behavior change.                                                                                                                                                                                                                                                                                                    |
| `src/i18n/locales/en.ts` + `ar.ts`                                                     | Delete key `finance.payments.allocation.useProposal`; delete `finance.payments.allocation.assignAll`; delete `finance.payments.allocation.allocated`, `.unallocated` if only used in removed footer block (verify usage; else keep); keep `distributeEqually`, `resetProposal`, `balanced`, `remainderMismatch`. No new keys — reuse existing `finance.payments.totalPayment` and `finance.payments.outstandingAfter` in the sticky footer. |
| `src/components/finance/__tests__/RecordPaymentDialog.uxOrder.test.tsx` (new)          | Section order + sticky-footer content + duplicate-block absence.                                                                                                                                                                                                                                                                                                                                                                            |
| `src/components/finance/__tests__/PaymentAllocationEditor.autoComplete.test.tsx` (new) | Two-bucket complement, three-bucket last-unresolved, cap rejection, reset.                                                                                                                                                                                                                                                                                                                                                                  |


## Q. Three-Step Execution Plan

### Step A — Reorder JSX and single-source the Payment Total

- File: `src/components/finance/RecordPaymentDialog.tsx`
- Move `<div className="space-y-3">…Payment Method Details…</div>` block (L475–568) to appear directly under the Payment Date grid (L415–424).
- Move the `{needsEditor && composition && <PaymentAllocationEditor …/>}` block (L454–471) to appear **after** the tender methods block and before the removed summary.
- Delete standalone "Payment Amount" display grid (L425–452) — the `fillFullAmount` link relocates onto the first tender row's caption area (render it inline next to the Method Details label when `rows.length === 1 && summary.outstandingAmount > 0`).
- Delete the duplicate "Payment Summary" block (L580–604).
- Payload building unchanged. Rollback: revert the file.

### Step B — Simplify Distribution, footer, and date layout

- File: `src/components/finance/PaymentAllocationEditor.tsx`
  - Remove `Distribute by Items` button + `isFullPayment` + `applyProposal()`.
  - Remove per-bucket `assignAll` button + `assignRemainderTo()` helper.
  - Remove trailing "Allocated / Total / Unallocated" summary triplet (keep validation `Alert` + Balanced `Badge`).
  - Add a `touchedRef`/state `touched: Record<string, true>` and update `updateBucket` to auto-fill the single remaining unresolved bucket per §I; skip auto-fill when >1 unresolved.
- File: `src/components/finance/RecordPaymentDialog.tsx`
  - Rebuild `<DialogFooter>` (L616–649) as: left cluster `Payment Total` + `Remaining After Payment` (Semi-Bold, tabular-nums, `dir="ltr"`), right cluster `Cancel` + `Record Payment` (existing behavior).
  - Move `MissingRequirementsBar` from footer into the scroll body directly above the sticky footer.
  - Add `pb-24` on the scroll wrapper (L261).
- File: `src/components/ui/shared-date-field.tsx`
  - Change three `<span className="text-[10px] font-medium …">` to `text-xs font-semibold text-center block w-full`.
  - Add `md:max-w-[10rem]` to the Month wrapper `<div>`.
- Files: `src/i18n/locales/en.ts` + `ar.ts` — delete removed keys; verify no lingering references via `rg`.
- Rollback: revert the four files.

### Step C — Focused verification

- New Vitest suites listed in **P**.
- Run: `bunx tsgo --noEmit`, `bun run build`, `bunx vitest run src/components/finance/__tests__/`.
- Manual acceptance per §23 in Arabic + English at the shared preview.
- Rollback: revert new test files.

## R. Focused Tests (must exist and pass)

Grouped exactly as in §22 (section-order & tender total; distribution incl. auto-complete + reset + client-level + simple-invoice; sticky footer; date picker classes; payload/idempotency stability under reorder).

## S. Manual Acceptance

Scenarios 1–7 from §23 executed at `/dashboard/finance/*` in both `en` and `ar`, on desktop and mobile viewport.

## T. Database Changes Required

**None.**

## U. Persistent Rows Modified

**None.**

## V. Roadmap Position

Phase N+3 Slice 2.2E (this). Slice 3 (Multi-Invoice Payment UI) reuses this UX contract. Slice 4 (Session details/receipts/reports) follows.

## W. Next Exact Action

**AWAIT USER APPROVAL OF THE SINGLE-INVOICE PAYMENT UX PLAN.**

---

## APPROVAL HANDOFF   
# APPROVED — EXECUTE PHASE N+3 SLICE 2.2E  
# SINGLE-INVOICE PAYMENT UX REALIGNMENT  
  
## 1. MODE  
  
EXECUTION.  
  
Implement the approved Slice 2.2E plan with the locked auto-completion  
clarification below.  
  
No backend, RPC, RLS, grant, migration, database-row, Ledger, Payment Session,  
Payment Allocation, Horse Allocation, Customer Balance, PDF, or Invoice  
approval change is authorized.  
  
Do not begin Multi-Invoice Payment UI.  
  
---  
  
## 2. ROADMAP  
  
### Phase 1 — N+1A  
CLOSED AND MANUALLY ACCEPTED.  
  
### Phase 2 — N+1B  
CLOSED AND MANUALLY ACCEPTED.  
  
### Phase 3 — N+2  
CLOSED AND MANUALLY ACCEPTED.  
  
### Phase 4 — N+3  
CURRENT.  
  
- Slice 1: CLOSED.  
- Slice 2: CLOSED.  
- Slice 2.2D: CLOSED.  
- Slice 2.2E: CURRENT EXECUTION.  
- Slice 3: NOT STARTED.  
- Slice 4: NOT STARTED.  
  
### Phase 5 — N+4  
NOT STARTED.  
  
Retail POS remains excluded.  
  
---  
  
## 3. RECORD PAYMENT SECTION ORDER  
  
Modify the shared `RecordPaymentDialog` to use this exact order:  
  
1. Invoice Items.  
2. Invoice Summary.  
3. Payment Date.  
4. Payment Method Details.  
5. Payment Distribution when required.  
6. Compact Sticky Footer.  
  
Move Payment Methods above Payment Distribution.  
  
Preserve all existing Payment Methods:  
  
- Cash;  
- Card;  
- Transfer;  
- Check;  
- Split Tender;  
- external reference;  
- duplicate-method validation;  
- Add Payment Method.  
  
---  
  
## 4. PAYMENT-TOTAL AUTHORITY  
  
Keep the existing:  
  
`totalPayment = sum of Tender row amounts`  
  
as the only editable Payment-total source.  
  
Delete the standalone read-only Payment Amount display block from the scroll  
body because the same value will appear in the sticky footer.  
  
Do not introduce another editable Payment Amount input.  
  
The computed Payment Total must update immediately when:  
  
- a Tender amount changes;  
- a Tender is added;  
- a Tender is removed.  
  
Pass the same computed total to the Payment Allocation Editor and the final  
Payment Payload.  
  
---  
  
## 5. PAY FULL OUTSTANDING  
  
Preserve the existing one-Tender-row-only behavior of:  
  
- `دفع المبلغ كاملًا`  
- `Pay Full Outstanding`  
  
Relocate it beside the Payment Method Details heading or first Tender row.  
  
When exactly one Tender row exists, it fills that row with the authoritative  
Invoice outstanding amount.  
  
When multiple Tender rows exist, preserve the current behavior and do not  
silently distribute the amount across Methods.  
  
---  
  
## 6. SIMPLIFIED PAYMENT DISTRIBUTION  
  
In `PaymentAllocationEditor` preserve only:  
  
1. `توزيع بالتساوي / Distribute Equally`;  
2. `إعادة التعيين / Reset`;  
3. manual amount entry.  
  
Remove:  
  
- `Distribute by Items`;  
- `applyProposal`;  
- per-bucket `Assign remainder`;  
- `assignRemainderTo`;  
- the trailing Allocated / Total / Unallocated summary triplet.  
  
Keep:  
  
- per-bucket Payment Amount;  
- per-bucket Remaining After Payment;  
- validation Alert;  
- Balanced state;  
- Client-Level buckets;  
- existing unsupported Laboratory block.  
  
---  
  
## 7. EQUAL DISTRIBUTION  
  
Preserve the existing integer-cent, cap-aware, deterministic equal-distribution  
helper.  
  
Example:  
  
```text  
Payment Total: SAR 1,000  
Fatin: SAR 500  
Maha: SAR 500

Requirements:

-   
never exceed a bucket's remaining attributable cap;  

-   
redistribute capped excess to buckets with remaining capacity;  

-   
preserve the exact Payment Total in cents;  

-   
keep the resulting values editable;  

-   
Client-Level buckets participate as independent valid buckets;  

-   
never assign Client-Level charges to a Horse.  


---

## 8. LOCKED MANUAL AUTO-COMPLETION CONTRACT

### Exactly two eligible buckets

The last manually edited bucket is authoritative.

The other bucket must always become the valid complement of the Payment Total,  
  
even when it previously received an automatically generated value.

Examples:

```

```

```
Payment Total: SAR 1,000

User edits Fatin to SAR 700
→ Maha becomes SAR 300
```

```

```

```
User then edits Maha to SAR 400
→ Fatin becomes SAR 600
```

```

```

```
User then edits Fatin to SAR 250
→ Maha becomes SAR 750
```

Do not base the two-bucket behavior only on whether the other field is empty.

Track the currently user-edited bucket or equivalent deterministic state so the  
  
opposite bucket is recalculated after every valid manual edit.

The auto-generated opposite value must not be treated as a user-locked value.

### More than two eligible buckets

Do not redistribute one manual edit across multiple buckets.

Auto-completion is allowed only when exactly one bucket remains unresolved or  
  
untouched after all other buckets have explicit user-entered amounts.

Example:

-   
four buckets;  

-   
three explicitly entered;  

-   
the fourth receives the valid remaining amount.  


### Validation

Calculate in integer cents.

Do not write an auto-complement when it is:

-   
negative;  

-   
greater than the target bucket's remaining cap;  

-   
non-finite;  

-   
otherwise invalid.  


In that case:

-   
preserve the user's edited amount;  

-   
leave the other bucket unresolved or unchanged safely;  

-   
show the existing reconciliation validation;  

-   
disable submission.  


No silent trimming or redistribution is allowed.

---

## 9. RESET CONTRACT

`Reset` must set every distribution input to zero/unresolved according to the  
  
existing controlled-input contract.

Reset must not change:

-   
Tender rows;  

-   
Tender amounts;  

-   
Payment Date;  

-   
external references;  

-   
Invoice;  

-   
Client;  

-   
Payment Total.  


After Reset, submission remains disabled until distribution reconciles again.

---

## 10. COMPACT STICKY FOOTER

The sticky footer must contain only:

### Financial values

- `Payment Total / إجمالي الدفعة`;  

- `Remaining After Payment / المتبقي بعد الدفع`.  


### Actions

-   
Cancel;  

-   
Record Payment.  


Do not display in the sticky footer:

-   
Allocated;  

-   
Unallocated;  

-   
Horse totals;  

-   
Client-Level totals;  

-   
Tender difference;  

-   
per-bucket validation.  


Move `MissingRequirementsBar` into the scrollable body immediately above the  
  
footer.

Add sufficient bottom padding so the last content field is never obscured by  
  
the sticky footer.

Keep the existing Record Payment disabled rules.

---

## 11. PAYMENT-DATE VISUAL POLISH

In `shared-date-field.tsx`:

-   
change Day, Month, and Year labels to:  
  
`text-xs font-semibold text-center block w-full`;  

-   
keep selected values centered;  

-   
cap the Month wrapper at `md:max-w-[10rem]`;  

-   
preserve existing date values and selection behavior;  

-   
preserve Latin digits;  

-   
preserve Arabic RTL and English LTR;  

-   
use a compact responsive row on desktop/tablet;  

-   
allow safe wrapping on mobile;  

-   
no horizontal scrolling;  

-   
no clipped Month label or value.  


No date logic change is authorized.

---

## 12. SIMPLE AND CROSS-ACCOUNT FLOWS

Preserve:

-   
no complex allocation editor for one-Horse-only invoices;  

-   
no complex allocation editor for Client-Level-only invoices;  

-   
allocation editor for Multi-Horse and Horse + Client-Level invoices;  

-   
existing unsupported Laboratory composition block;  

-   
no `lab_horse_id → horse_id` mapping.  


This must remain one shared `RecordPaymentDialog` for every Invoice-capable  
  
account type using shared Finance.

Arabic generic terminology must use:

`خيل`

not:

`حصان`

Use neutral wording such as:

`المتبقي بعد الدفع`

not gendered wording.

---

## 13. FILE SCOPE

Authorized source changes:

- `src/components/finance/RecordPaymentDialog.tsx`  

- `src/components/finance/PaymentAllocationEditor.tsx`  

- `src/components/ui/shared-date-field.tsx`  

- `src/i18n/locales/en.ts`  

- `src/i18n/locales/ar.ts`  

-   
focused test files only  


Remove translation keys only when repository search proves they have no other  
  
consumer.

Do not modify:

- `useInvoicePayments`;  

- `postLedgerForPayments`;  

- `postPaymentSession`;  

-   
Payment RPCs;  

-   
Payment Payload semantics;  

-   
Idempotency semantics;  

-   
financial database objects.  


---

## 14. REQUIRED TESTS

### Order and totals

1.   
Invoice Items remain first.  

2.   
Payment Date appears before Payment Methods.  

3.   
Payment Methods appear before Payment Distribution.  

4.   
Payment Total equals the sum of Tender rows.  

5.   
Adding, editing, and removing a Tender updates Payment Total.  

6.   
No duplicate editable Payment Total exists.  

7.   
Pay Full Outstanding remains functional.  


### Distribution

8.   
Distribute by Items is absent.  

9.   
Assign remainder is absent.  

10.   
Distribute Equally remains present.  

11.   
Reset remains present.  

12.   
SAR 1,000 across two equal buckets produces 500/500.  

13.   
Equal distribution respects bucket caps.  

14.   
Residual cents are deterministic.  

15.   
Editing bucket A to 700 makes bucket B 300.  

16.   
Editing bucket B afterward to 400 makes bucket A 600.  

17.   
Editing bucket A afterward to 250 makes bucket B 750.  

18.   
Editing the second bucket first recalculates the first.  

19.   
Auto-generated values do not become permanently user-locked.  

20.   
Negative complements are rejected safely.  

21.   
Over-cap complements are rejected safely.  

22.   
More than two unresolved buckets are not redistributed automatically.  

23.   
One final unresolved bucket receives the valid remainder.  

24.   
Reset clears distribution without changing Tenders or date.  

25.   
Client-Level bucket participates correctly.  

26.   
Simple one-Horse Invoice bypasses the complex editor.  

27.   
Client-Level-only Invoice bypasses the complex editor.  

28.   
Unsupported Laboratory shape remains blocked.  


### Footer

29.   
Footer displays only Payment Total and Remaining After Payment.  

30.   
Footer contains Cancel and Record Payment.  

31.   
Footer does not display Allocated or Unallocated.  

32.   
Footer values update with Tender edits.  

33.   
Footer remains visible while scrolling.  

34.   
Final fields are not hidden behind the footer.  

35.   
Submission remains blocked when allocation is invalid.  


### Date layout

36.   
Day, Month, and Year labels are centered.  

37.   
Labels are Semi-Bold.  

38.   
Month width is capped.  

39.   
Desktop layout is compact.  

40.   
Mobile wraps safely.  

41.   
Arabic RTL is correct.  

42.   
English LTR is correct.  

43.   
Digits remain Latin.  


### Financial safety

44.   
Payment Payload meaning is unchanged.  

45.   
Tender references remain attached to their rows.  

46.   
Bucket changes remain part of the Idempotency fingerprint.  

47.   
No legacy writer is called.  

48.   
No new backend round-trip occurs.  


### Verification

49.   
Focused Vitest passes.  

50.   
Relevant Payment regression tests pass.  

51. `bunx tsgo --noEmit` passes.  

52. `bun run build` passes.  


Report exact passed, failed, skipped, and warning counts separately.

---

## 15. IMPLEMENTATION REPORT

Report:

### A. Verdict

### B. Section Order

### C. Tender-Total Authority

### D. Pay Full Outstanding

### E. Removed Distribution Controls

### F. Equal Distribution

### G. Two-Bucket Complement Behavior

### H. Multi-Bucket Final Completion

### I. Reset Behavior

### J. Sticky Footer

### K. Date Layout

### L. Files Created

### M. Files Modified

### N. Production Objects Modified

### O. Persistent Rows Modified

### P. Tests and Counts

### Q. TypeScript Result

### R. Build Result

### S. Manual Acceptance Script

### T. Rollback

### U. Roadmap

### V. Next Action

Required verdict:

`SLICE 2.2E SINGLE-INVOICE PAYMENT UX IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`

---

## 16. MANUAL ACCEPTANCE

Use Invoice `INV-0989` or another safe Multi-Horse Invoice.

### Scenario 1

Enter:

-   
Card SAR 500;  

-   
Cash SAR 500.  


Expected:

-   
Payment Total: SAR 1,000;  

-   
Remaining After Payment: SAR 495;  

-   
Methods appear before Distribution.  


### Scenario 2

Enter:

-   
Fatin SAR 700.  


Expected:

-   
Maha automatically becomes SAR 300.  


Then edit:

-   
Maha SAR 400.  


Expected:

-   
Fatin automatically becomes SAR 600.  


### Scenario 3

Press Distribute Equally.

Expected:

-   
Fatin SAR 500;  

-   
Maha SAR 500.  


### Scenario 4

Press Reset.

Expected:

-   
both allocations return to zero/unresolved;  

-   
Tender values remain SAR 500 + SAR 500;  

-   
Payment Total remains SAR 1,000;  

-   
date remains unchanged.  


### Scenario 5

Scroll through the dialog.

Expected footer always shows only:

-   
Payment Total;  

-   
Remaining After Payment;  

-   
Cancel;  

-   
Record Payment.  


### Scenario 6

Verify Arabic and English date controls and shared account behavior.

---

## 17. STOP GATE

Stop after the implementation report and manual acceptance script.

Do not begin Slice 3.

Do not implement:

-   
Multi-Invoice Payment UI;  

-   
Customer Balances work;  

-   
Invoice KPI label changes;  

-   
PDF changes;  

-   
refunds;  

-   
reversals;  

-   
credit;  

-   
overpayment;  

-   
Retail POS.