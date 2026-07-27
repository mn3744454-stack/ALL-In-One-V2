# Phase N+3 · Slice 3 — Multi-Invoice Client Payment (Audit + Plan)

## A. Verdict

**MULTI-INVOICE CLIENT PAYMENT CONTRACT ALIGNED — EXECUTION-READY PLAN PROVIDED.**

The installed `public.post_payment_session(p_tenant_id, p_idempotency_key, p_payload)` RPC already accepts multiple `allocations[]` rows tied to distinct `invoice_id`s under one atomic session (single client, single currency, per-invoice horse/client-level splits, split-tender via multiple rows, over-allocation guards, deterministic dedup, idempotency, advisory locks). **No backend change is required.**

## B. Attachment Findings

- **Screenshot 65** — `Finance → Customer Balances` shows a Client row with `تسجيل دفعة` action. Currently wired to open the single-invoice dialog with no invoice. This is the primary entry point to fix.
- **Screenshot 66** — `Record Payment` from Customer Balances opens `RecordPaymentDialog` and displays only `خطأ`. Root cause is code (not runtime): `FinanceCustomerBalances.tsx:186` passes `invoiceId={null}`; `RecordPaymentDialog.tsx:92-94,584-587` returns `{t("common.error")}` when `summary` is falsy (which it always is for `invoiceId=null`).
- **Screenshot 67** — Invoices KPI cards use `finance.invoices.total | .pending | .paid | .overdue`. Same keys are reused for row/detail labels (e.g. `InvoicesList.tsx:142,157`, `InvoiceDetailsSheet.tsx:532,1039`, `InvoiceLineItemsEditor.tsx:260`), so labels must be corrected via **new dedicated KPI keys**, not by mutating the existing shared keys.

## C. Customer Balances Runtime Error


| Stage            | File                                                    | Result                                |
| ---------------- | ------------------------------------------------------- | ------------------------------------- |
| Row action click | `src/pages/finance/FinanceCustomerBalances.tsx:63,165`  | Sets `paymentClientId`                |
| Dialog mount     | `FinanceCustomerBalances.tsx:182-189`                   | Passes `invoiceId={null}`             |
| Hook call        | `RecordPaymentDialog.tsx:92` `useInvoicePayments(null)` | Query disabled, `summary` = undefined |
| Render branch    | `RecordPaymentDialog.tsx:584-588`                       | Renders `t("common.error")` = `خطأ`   |
| Writer reached?  | No                                                      | Single-invoice writer never invoked   |


Not a regression — the route was never functional for the Client-level intent. The correct fix is a **new shared Multi-Invoice dialog** for Client-level payments; the single-invoice dialog remains reserved for invoice-scoped entry (Invoice Details).

## D. Installed Backend Contract (verified)

`supabase/migrations/20260726120544_*.sql` — `post_payment_session` already enforces: single tenant/client/currency across all `allocations[]`; per-invoice advisory lock; `pg_advisory_xact_lock` on client ledger; only `approved|partial` invoices; frozen `line_gross_amount` caps per horse and client-level; prior-allocation subtraction; per-invoice status recomputed (`paid|partial`); atomic multi-row `payment_allocations` + `payment_horse_allocations`; single `payment_sessions` row; idempotency via `_finance_idempotency_begin/_complete`; dedup on `(invoice_id|method)`; method whitelist `cash|card|transfer|check`; max 50 allocation rows.

**Wrapper** `src/lib/finance/postPaymentSession.ts` already speaks the multi-invoice shape (`allocations: PaymentSessionAllocation[]`).

## E. Exact RPC Payload (worked example)

Client A, split tender Cash + Card, one multi-horse invoice + one simple invoice:

```json
{
  "payment_date": "2026-07-27",
  "external_reference": "REC-2026-07-27-001",
  "allocations": [
    { "invoice_id": "INV-A-uuid", "payment_method": "cash",     "amount": 500.00,
      "client_level_amount": 0,
      "horse_allocations": [
        { "horse_id": "H1-uuid", "amount": 300.00 },
        { "horse_id": "H2-uuid", "amount": 200.00 }
      ] },
    { "invoice_id": "INV-B-uuid", "payment_method": "card",     "amount": 200.00,
      "client_level_amount": 200.00 }
  ]
}
```

## F. Server Validation

All Slice-3 invariants already enforced server-side (see D). No additions required.

## G. Eligible Invoice Contract

Load invoices where `tenant_id = active` AND `client_id = selected` AND `status IN ('approved','partial')` AND `currency = session currency` AND `outstanding > 0.01`. Compute outstanding from batch `ledger_entries` sum via existing `useInvoicePaymentsBatch`. Sort: due_date ASC → issue_date ASC → invoice_number ASC. Exclude `draft`, `reviewed`, `paid`, `cancelled`, `overdue-with-zero-outstanding`.

## H. Primary Entry Point

`Finance → Customer Balances` row `Record Payment` opens the new shared dialog with `clientId` preselected and immutable.

## I. Secondary Entry Point

`Finance → Invoices` toolbar action `Record Client Payment` / `تسجيل دفعة للعميل` next to `Create Invoice`. Opens the shared dialog with a Client selector step first.

## J. Shared Dialog Architecture (locked)

```text
MultiInvoicePaymentDialog (new, shared)
├── ClientSummaryHeader             (preselected OR selector)
├── SharedTenderEditor              (extracted from RecordPaymentDialog rows)
├── EligibleInvoicesSelector        (new — checkbox list + per-row amount)
│    └── AllocateOldestFirst button
├── PerInvoiceAllocation            (reuses PaymentAllocationEditor per selected complex invoice)
└── CompactStickyFooter             (Total Payments · Unallocated to Invoices · Cancel · Record Payment)
```

Single writer path → `postPaymentSession()` → RPC. Existing `RecordPaymentDialog` (single-invoice) remains unchanged for `InvoiceDetailsSheet` entry.

## K–O. Contracts

- **Payment Methods**: reuse existing tender rows (Cash/Card/Transfer/Check + amount + reference + Split); Total Payments = Σ tender amounts. Order: Date → Tender → Invoice Distribution.
- **Invoice Allocation**: manual per invoice; explicit `Allocate Oldest First` button proposes and stops (editable, no auto-submit); two-invoice complement rule and >2 last-unresolved auto-complete reuse `touchedRef` logic already in `PaymentAllocationEditor`.
- **Oldest-First**: deterministic due_date → issue_date → invoice_number; integer cents; never exceeds outstanding.
- **Per-Invoice Horse/Client**: `useInvoicePriorAllocations` + `PaymentAllocationEditor` reused unchanged inside a collapsible per-invoice card; only shown for `needsEditor` invoices; frozen-gross caps.
- **Split-Tender × Multi-Invoice**: build one `allocations[]` entry per `(invoice_id, payment_method)` pair using a cent-safe distribution helper (extend `allocationDistribution.ts`) that preserves each tender total, each invoice total, and each horse/client-level subtotal simultaneously; residual absorbed on last row; duplicate `(invoice|method)` pairs forbidden by dedup.

## P. Idempotency

Extend `fingerprintPayload` to hash: tenant, client, currency, date, sorted invoice IDs, per-invoice amount, per-invoice sorted horse allocations, per-invoice client-level, ordered tender rows (method+amount+reference). Same fingerprint reuses the key (server replay path returns stored response); any edit rotates the key; successful post + dialog close reset the draft key.

## Q. Concurrency

Server already `FOR UPDATE`-locks each invoice and takes a client-ledger advisory lock. On `FIN_INVOICE_OVER_ALLOCATION` / `FIN_INVOICE_NOT_PAYABLE`: whole session fails atomically; UI shows localized error, invalidates `invoice-payments-batch` + eligible-invoices query, preserves user inputs where still valid.

## R. Error Contract

Reuse `ERROR_TOKEN_KEYS` map from `useInvoicePayments`. Add new tokens for: no-eligible-invoices, invoice-allocation-mismatch, unallocated-remaining, client-required. Never surface raw SQLSTATE, UUIDs, table names, or `FIN_*` codes.

## S. Invoice KPI Labels

Add **new** i18n keys (do NOT mutate `finance.invoices.total|pending|paid|overdue` because they are shared with row/detail labels):

- `finance.invoices.stats.totalInvoices` → `Total Invoices` / `إجمالي الفواتير`
- `finance.invoices.stats.pendingInvoices` → `Pending Invoices` / `الفواتير المعلقة`
- `finance.invoices.stats.paidInvoices` → `Paid Invoices` / `الفواتير المدفوعة`
- `finance.invoices.stats.overdueInvoices` → `Overdue Invoices` / `الفواتير المتأخرة`

Update only `src/pages/DashboardFinance.tsx:102,115,128,141`. Counts, colors, icons, queries unchanged.

## T. Cross-Account Coverage

Shared writer already used by Stable and Laboratory (via `InvoiceDetailsSheet`). New dialog is account-agnostic — any tenant with `finance.payment.create` permission consumes it. Account-specific composition (lab-horse-only unsupported cases) already flagged by `useInvoicePriorAllocations.hasUnsupportedLabHorse` and will block those invoices in the selector.

## U. Performance

- Open dialog: 1 batch invoices query + 1 batch `useInvoicePaymentsBatch` = **2 queries**.
- Select 3 simple invoices: 0 extra queries (composition lazy-loaded only for `needsEditor`).
- Select 1 multi-horse invoice: +1 `useInvoicePriorAllocations` query.
- Submit: 1 RPC call.
React Query keys scoped by `[tenantId, clientId]`; invalidate `invoice-payments-batch`, `customer_balances`, `invoices` on success.

## V. Files Proposed


| File                                                         | Role                                               |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `src/components/finance/MultiInvoicePaymentDialog.tsx` (new) | Shared dialog                                      |
| `src/components/finance/EligibleInvoicesSelector.tsx` (new)  | Invoice list + amount + oldest-first               |
| `src/hooks/finance/useEligibleClientInvoices.ts` (new)       | Batch eligible invoices + outstanding              |
| `src/lib/finance/multiInvoiceDistribution.ts` (new)          | Tender × invoice cent-safe matrix                  |
| `src/pages/finance/FinanceCustomerBalances.tsx`              | Swap dialog; pass `clientId`                       |
| `src/pages/DashboardFinance.tsx`                             | Add `Record Client Payment` action; 4 new KPI keys |
| `src/i18n/locales/en.ts` / `ar.ts`                           | Add KPI + Slice-3 strings                          |
| `src/lib/finance/postPaymentSession.ts`                      | (unchanged)                                        |
| `src/components/finance/RecordPaymentDialog.tsx`             | (unchanged — remains single-invoice)               |


## W. Three-Step Execution Plan

### Step A — Shared dialog, entry points, reads

Create `MultiInvoicePaymentDialog`, `EligibleInvoicesSelector`, `useEligibleClientInvoices`. Fix `FinanceCustomerBalances.tsx` to open the new dialog with preselected `clientId`. Add `Record Client Payment` button in `DashboardFinance.tsx` Invoices tab toolbar. Add 4 new KPI translation keys and swap references in `DashboardFinance.tsx`. Rollback = revert 6 files.

### Step B — Allocation, distribution, writer integration

Implement `multiInvoiceDistribution.ts` producing one `allocations[]` row per `(invoice, method)`; reuse `PaymentAllocationEditor` per selected complex invoice inside collapsible cards; extend `fingerprintPayload` for multi-invoice; wire submit → `postPaymentSession`; localize new error tokens; invalidate `[invoice-payments-batch]`, `[customer_balances]`, `[invoices]`, `[eligible-client-invoices]` on success. No backend migration. Rollback = revert Step B files.

### Step C — Focused verification

Add Vitest suites: `multiInvoiceDistribution.test.ts` (cent-safe matrix, oldest-first, complement rules), `MultiInvoicePaymentDialog.test.tsx` (entry-point preselection, eligible filter, empty state, submit disabled states, KPI label snapshot). Run `bunx tsgo --noEmit` and `bun run build`. Rollback = revert test files.

## X. Focused Tests (summary)

Entry-point preselection · empty eligible state · cross-client isolation · draft/cancelled/paid excluded · currency filter · tender before allocation · Total Payments = tender sum · full+partial two-invoice · oldest-first proposal is editable · two-invoice complement · >2 last-unresolved auto-complete · simple invoice needs no editor · multi-horse editor reuse · lab-unsupported blocked · split tender across 2 invoices reconciles · single Payment Session · correct ledger rows · invoice statuses update · Customer Balance updates once · idempotent retry replays · edit rotates key · KPI Arabic/English labels · KPI counts unchanged · mobile + desktop layout.

## Y. Manual Acceptance

Scenarios 1–9 exactly as specified in the task (Customer Balances entry, two-invoice full+partial, oldest-first, multi-horse, split tender, concurrent change, Invoice-page entry, KPI labels, cross-account).

## Z. Database Changes

**NONE.** Installed `post_payment_session` already supports the full Slice-3 contract.

## AA. Persistent Rows Modified

None during the audit. Runtime writes only occur when a user posts a payment via the new dialog (single atomic Session per submit).

## AB. Roadmap

Slice 3 unblocks Slice 4 (Payment Session details, receipts, reports) and Phase N+4 (refunds, credit, overpayment).

## AC. Next Exact Action

**AWAIT USER APPROVAL OF THE MULTI-INVOICE CLIENT PAYMENT PLAN.**

---

## APPROVAL HANDOFF 

## # APPROVED — EXECUTE PHASE N+3 SLICE 3  
# MULTI-INVOICE CLIENT PAYMENT  
#  
# ONE CLIENT · MULTIPLE OUTSTANDING INVOICES  
# ONE ATOMIC PAYMENT SESSION  
# SHARED TENDER EDITOR  
# CENT-SAFE TENDER × INVOICE × SCOPE MATRIX  
  
## 1. MODE  
  
EXECUTION.  
  
Implement Phase N+3 Slice 3 only.  
  
No additional investigative round is required.  
  
No backend, RPC, schema, migration, RLS, grant, permission, or persistent-row  
repair is authorized because the installed `public.post_payment_session` RPC  
already supports the locked Multi-Invoice Payment contract.  
  
Stop after the implementation report and manual acceptance script.  
  
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
- Slice 2.2F: CLOSED AND MANUALLY ACCEPTED.  
- Slice 3: CURRENT EXECUTION.  
- Slice 4: NOT STARTED.  
  
### Phase 5 — N+4  
NOT STARTED.  
  
Retail POS remains excluded.  
  
---  
  
## 3. PROVEN CURRENT DEFECT  
  
The current Customer Balances route opens the Single-Invoice  
`RecordPaymentDialog` with:  
  
`invoiceId={null}`  
  
This causes:  
  
- `useInvoicePayments(null)` to remain disabled;  
- `summary` to remain undefined;  
- the dialog to render `common.error`;  
- no Payment writer to be reached.  
  
Do not hide the error or force a fake Invoice ID.  
  
Replace this Client-level route with the new shared Multi-Invoice Payment flow.  
  
The existing Single-Invoice dialog remains the Invoice Details payment flow.  
  
---  
  
## 4. PRIMARY AND SECONDARY ENTRY POINTS  
  
### Primary  
  
`Finance → Customer Balances → Client row → Record Payment`  
  
Required:  
  
- open the shared `MultiInvoicePaymentDialog`;  
- pass the selected `clientId`;  
- Client remains fixed inside the dialog;  
- load only that Client’s eligible outstanding Invoices.  
  
### Secondary  
  
`Finance → Invoices → Record Client Payment`  
  
Place one action beside the existing Create Invoice action without crowding the  
toolbar.  
  
Required:  
  
- open the same shared dialog;  
- show Client selection first;  
- selecting a Client loads only that Client’s eligible outstanding Invoices;  
- changing Client clears selected Invoices and all Invoice/scope allocations;  
- Tender rows reset to one empty default row to prevent accidental reuse across  
  Clients.  
  
Do not create separate Payment implementations for the two entry points.  
  
---  
  
## 5. SHARED DIALOG FLOW  
  
Implement one shared flow:  
  
```text  
Client Summary  
→ Payment Date  
→ Payment Method Details  
→ Total Payments  
→ Eligible Invoice Selection  
→ Distribution Across Invoices  
→ Horse/Client-Level Distribution Inside Complex Invoices  
→ Compact Sticky Footer  
→ Atomic Submission

> Preserve the accepted payment UX:
>
> -   
> Payment Methods appear before Invoice distribution;  
>
> -   
> Total Payments equals the sum of Tender rows;  
>
> -   
> no independently editable duplicate Payment-total field;  
>
> -   
> Arabic uses Latin digits and shared Finance terminology;  
>
> -   
> mobile-first responsive layout;  
>
> -   
> sticky header/footer;  
>
> -   
> dirty-form protection.  
>
>
> ---
>
> ## 6. SHARED TENDER EDITOR — NO DUPLICATED PAYMENT-METHOD CODE
>
> Create:
>
> `src/components/finance/PaymentTenderEditor.tsx`
>
> It must be a controlled shared component containing the existing accepted  
>
> Tender behavior:
>
> -   
> Cash;  
>
> -   
> Card;  
>
> -   
> Bank Transfer;  
>
> -   
> Check;  
>
> -   
> amount;  
>
> -   
> external reference;  
>
> -   
> Add Payment Method;  
>
> -   
> remove row;  
>
> -   
> duplicate-method validation;  
>
> -   
> split tender;  
>
> -   
> Pay Full Outstanding when enabled by the caller;  
>
> -   
> Total Payments derived from rows.  
>
>
> Refactor `RecordPaymentDialog.tsx` minimally to consume the same controlled  
>
> `PaymentTenderEditor`.
>
> This narrow refactor is authorized only to prevent duplication.
>
> The Single-Invoice dialog must retain identical:
>
> -   
> section order;  
>
> -   
> labels;  
>
> -   
> behavior;  
>
> -   
> validation;  
>
> -   
> payload;  
>
> -   
> idempotency;  
>
> -   
> mobile/desktop UX.  
>
>
> Add regression coverage proving the Single-Invoice behavior did not change.
>
> Do not duplicate the Tender editor inside `MultiInvoicePaymentDialog`.
>
> ---
>
> ## 7. ELIGIBLE INVOICE READ
>
> Create:
>
> `src/hooks/finance/useEligibleClientInvoices.ts`
>
> Load Invoices in one Tenant-and-Client-scoped batch where:
>
> - `tenant_id` equals the active Tenant;  
>
> - `client_id` equals the selected Client;  
>
> -   
> status is financially payable under the installed contract:  
>
> `approved` or `partial`;  
>
> -   
> outstanding is greater than `0.01`;  
>
> -   
> Invoice is not paid or cancelled;  
>
> -   
> currency matches the selected Session currency.  
>
>
> Sort deterministically:
>
> 1.   
> due date ascending;  
>
> 2.   
> issue date ascending;  
>
> 3.   
> Invoice number ascending;  
>
> 4.   
> Invoice ID as final stable tie-breaker.  
>
>
> Display:
>
> -   
> Invoice number;  
>
> -   
> issue date;  
>
> -   
> due date;  
>
> -   
> status;  
>
> -   
> total;  
>
> -   
> Paid to Date;  
>
> -   
> outstanding;  
>
> -   
> concise Horse/Client-Level summary;  
>
> -   
> proposed amount allocated to the Invoice.  
>
>
> Do not initially load complete composition for every historical Invoice.
>
> Load detailed composition lazily only for selected complex Invoices.
>
> Use React Query keys scoped by:
>
> -   
> Tenant ID;  
>
> -   
> Client ID;  
>
> -   
> currency.  
>
>
> ---
>
> ## 8. INVOICE ALLOCATION
>
> Create:
>
> `src/components/finance/EligibleInvoicesSelector.tsx`
>
> Support:
>
> -   
> select/unselect Invoice;  
>
> -   
> manual amount per selected Invoice;  
>
> -   
> remaining after proposed Payment;  
>
> -   
> search by Invoice number;  
>
> -   
> Select All eligible;  
>
> -   
> Clear selection;  
>
> -   
> explicit `Allocate Oldest First`;  
>
> -   
> deterministic complement behavior.  
>
>
> ### Oldest-first
>
> Example:
>
> ```
>
> ```
>
> ```
> INV-A outstanding: SAR 500
> INV-B outstanding: SAR 300
> INV-C outstanding: SAR 200
> Total Payments: SAR 700
> ```
>
> Result:
>
> ```
>
> ```
>
> ```
> INV-A: SAR 500
> INV-B: SAR 200
> INV-C: SAR 0
> ```
>
> Requirements:
>
> -   
> explicit button only;  
>
> -   
> integer cents;  
>
> -   
> values remain editable;  
>
> -   
> no automatic submission;  
>
> -   
> never exceed Invoice outstanding.  
>
>
> ### Manual completion
>
> With exactly two selected Invoices:
>
> -   
> the last manually edited Invoice is authoritative;  
>
> -   
> the other becomes the valid complement.  
>
>
> With more than two selected Invoices:
>
> -   
> auto-complete only when exactly one final Invoice remains unresolved;  
>
> -   
> never redistribute one manual edit unpredictably across several Invoices.  
>
>
> Invalid negative or over-outstanding complements must not be written.
>
> Submission remains disabled until Invoice allocation equals Total Payments.
>
> ---
>
> ## 9. PER-INVOICE HORSE AND CLIENT-LEVEL ALLOCATION
>
> For each selected Invoice:
>
> ### Simple
>
> -   
> one canonical Horse only; or  
>
> -   
> Client-Level-only.  
>
>
> Do not show an unnecessary complex editor.
>
> ### Complex
>
> -   
> multiple Horses;  
>
> -   
> Horse + Client-Level;  
>
> -   
> another currently supported mixed canonical scope.  
>
>
> Reuse the existing:
>
> - `PaymentAllocationEditor`;  
>
> - `useInvoicePriorAllocations`;  
>
> -   
> frozen gross caps;  
>
> -   
> Pretax/Tax/Total-Due display;  
>
> -   
> Equal Distribution;  
>
> -   
> manual complement;  
>
> -   
> Reset;  
>
> -   
> prior-allocation subtraction.  
>
>
> Render the editor inside a collapsible selected-Invoice card.
>
> The editor’s `paymentAmount` must equal the amount allocated to that Invoice.
>
> The parent dialog cannot submit until every selected complex Invoice is  
>
> internally reconciled.
>
> Preserve:
>
> -   
> Client-Level tax attribution;  
>
> -   
> Package financial-parent truth;  
>
> -   
> historical unresolved block;  
>
> -   
> unsupported Laboratory composition block;  
>
> -   
> no `lab_horse_id → horse_id` mapping.  
>
>
> ---
>
> ## 10. LOCKED TENDER × INVOICE MATRIX
>
> Create:
>
> `src/lib/finance/multiInvoiceDistribution.ts`
>
> The RPC requires one allocation row per nonzero:
>
> `(invoice_id, payment_method)`
>
> The implementation must use a deterministic, cent-safe two-stage matrix.
>
> ### Stage 1 — Tender × Invoice
>
> Inputs:
>
> -   
> Tender totals;  
>
> -   
> Invoice allocation totals.  
>
>
> Output:
>
> -   
> a matrix whose Tender-row sums exactly equal original Tender amounts;  
>
> -   
> Invoice-column sums exactly equal Invoice allocation amounts.  
>
>
> Use integer cents and a deterministic largest-remainder method.
>
> Stable tie-breakers:
>
> 1.   
> Invoice order from the canonical Invoice sort;  
>
> 2.   
> Tender row order from the UI;  
>
> 3.   
> Invoice ID when otherwise tied.  
>
>
> No fractional cent may be lost.
>
> ### Stage 2 — Scope allocation inside each Invoice/Tender cell
>
> For every Invoice:
>
> -   
> take its final Horse/Client-Level bucket totals;  
>
> -   
> distribute those totals across that Invoice’s Tender cells;  
>
> -   
> preserve every Horse/Client-Level total exactly;  
>
> -   
> preserve every Invoice/Tender cell total exactly;  
>
> -   
> use integer cents and deterministic residual handling.  
>
>
> Required identities:
>
> ```
>
> ```
>
> ```
> Σ Invoice cells for each Tender = Tender amount
> Σ Tender cells for each Invoice = Invoice allocation
> Σ Scope amounts inside an Invoice = Invoice allocation
> Σ Scope amounts across Tender cells = each final Scope allocation
> ```
>
> Do not associate one Payment Method with one Horse.
>
> Payment Methods and Horse/Client-Level allocation remain separate dimensions.
>
> ---
>
> ## 11. EXTERNAL REFERENCES
>
> Every Tender row owns its own external reference.
>
> When one Tender is split across multiple Invoice rows:
>
> -   
> copy that Tender’s reference to every RPC allocation row derived from that  
>
> Tender;  
>
> -   
> do not copy a reference from another Tender;  
>
> -   
> do not merge references;  
>
> -   
> do not place a Session-level reference in place of the Tender reference.  
>
>
> Example:
>
> ```
>
> ```
>
> ```
> Card reference: POS-7788
> ```
>
> Every generated Card allocation row receives:
>
> `external_reference = POS-7788`
>
> Cash rows do not receive the Card reference.
>
> ---
>
> ## 12. RPC 50-ROW LIMIT
>
> The installed RPC accepts a maximum of 50 allocation rows.
>
> Before submission calculate:
>
> ```
>
> ```
>
> ```
> generatedAllocationRowCount
> =
> number of nonzero (selected Invoice × nonzero Tender) cells
> ```
>
> Required:
>
> -   
> block submission when generated rows exceed 50;  
>
> -   
> show a localized actionable message;  
>
> -   
> never wait for a generic server rejection;  
>
> -   
> show the current row count and supported maximum without technical IDs.  
>
>
> Suggested copy:
>
> ### Arabic
>
> `تعذر تسجيل الدفعة لأن عدد توزيعات الفواتير وطرق الدفع يتجاوز الحد المدعوم في العملية الواحدة. قلل عدد الفواتير أو طرق الدفع ثم حاول مرة أخرى.`
>
> ### English
>
> `The payment cannot be recorded because the number of invoice and payment-method allocations exceeds the supported limit for one session. Reduce the selected invoices or payment methods and try again.`
>
> Do not increase the RPC limit in this Slice.
>
> ---
>
> ## 13. ONE SESSION, CLIENT, AND CURRENCY
>
> One submission must contain:
>
> -   
> one Tenant;  
>
> -   
> one Client;  
>
> -   
> one currency;  
>
> -   
> one Payment date;  
>
> -   
> one Idempotency key;  
>
> -   
> one Payment Session ID;  
>
> -   
> one or more selected Invoices;  
>
> -   
> one or more Tender rows;  
>
> -   
> generated allocation matrix rows.  
>
>
> Reject or block:
>
> -   
> multiple Clients;  
>
> -   
> currency mismatch;  
>
> -   
> no Client;  
>
> -   
> no selected Invoice;  
>
> -   
> zero Total Payments;  
>
> -   
> zero positive Invoice allocation;  
>
> -   
> Invoice allocation mismatch;  
>
> -   
> complex Invoice scope mismatch;  
>
> -   
> unsupported Laboratory composition;  
>
> -   
> more than 50 generated allocation rows.  
>
>
> No overpayment or Client credit is allowed.
>
> ---
>
> ## 14. IDEMPOTENCY — SEPARATE MULTI-INVOICE FINGERPRINT
>
> Create:
>
> `src/lib/finance/multiInvoicePaymentFingerprint.ts`
>
> Do not alter the accepted Single-Invoice fingerprint semantics.
>
> The canonical Multi-Invoice fingerprint must include:
>
> -   
> Tenant ID;  
>
> -   
> Client ID;  
>
> -   
> currency;  
>
> -   
> Payment date;  
>
> -   
> selected Invoices stable-sorted by ID;  
>
> -   
> amount per Invoice;  
>
> -   
> each Invoice’s Horse allocations sorted by Horse ID;  
>
> -   
> each Invoice’s Client-Level amount;  
>
> -   
> Tender rows in visible order;  
>
> -   
> Method;  
>
> -   
> Tender amount;  
>
> -   
> Tender reference;  
>
> -   
> generated normalized matrix.  
>
>
> Requirements:
>
> -   
> unchanged retry reuses the same key;  
>
> -   
> any material edit rotates the key;  
>
> -   
> successful post resets the draft key;  
>
> -   
> closing the dialog resets the key;  
>
> -   
> concurrent identical submits coalesce or safely replay;  
>
> -   
> JavaScript insertion order cannot affect the fingerprint.  
>
>
> ---
>
> ## 15. SUBMISSION
>
> Submit one call through the existing:
>
> `postPaymentSession`
>
> Do not create a second writer.
>
> The payload contains all generated matrix allocation rows.
>
> The server remains authoritative for:
>
> -   
> Tenant;  
>
> -   
> Client;  
>
> -   
> currency;  
>
> -   
> Invoice eligibility;  
>
> -   
> current outstanding;  
>
> -   
> Horse/Client-Level caps;  
>
> -   
> prior allocations;  
>
> -   
> locks;  
>
> -   
> Ledger;  
>
> -   
> Customer Balance;  
>
> -   
> Invoice statuses;  
>
> -   
> atomicity;  
>
> -   
> idempotency.  
>
>
> On success invalidate:
>
> -   
> eligible Client Invoices;  
>
> -   
> Invoice payment summaries;  
>
> -   
> Customer Balances;  
>
> -   
> Invoices;  
>
> -   
> Client statement/account queries;  
>
> -   
> Payment Sessions where present.  
>
>
> On concurrency failure:
>
> -   
> show an actionable localized message;  
>
> -   
> invalidate/refetch current outstanding values;  
>
> -   
> preserve still-valid Tender rows and allocations where practical;  
>
> -   
> do not silently reduce or reassign money;  
>
> -   
> do not partially submit.  
>
>
> ---
>
> ## 16. ERROR MAPPING
>
> Use one shared Multi-Invoice Payment error mapper.
>
> Map at minimum:
>
> -   
> Client required;  
>
> -   
> no eligible Invoices;  
>
> -   
> no Invoice selected;  
>
> -   
> Total Payments required;  
>
> -   
> Invoice allocation mismatch;  
>
> -   
> allocation exceeds outstanding;  
>
> -   
> unallocated amount;  
>
> -   
> Tender mismatch;  
>
> -   
> currency mismatch;  
>
> -   
> Invoice belongs to another Client;  
>
> -   
> Invoice no longer payable;  
>
> -   
> Horse allocation required;  
>
> -   
> Horse allocation mismatch;  
>
> -   
> Client-Level allocation mismatch;  
>
> -   
> unsupported Laboratory composition;  
>
> -   
> generated allocation rows exceed 50;  
>
> -   
> concurrent outstanding change;  
>
> -   
> permission denied;  
>
> -   
> Idempotency conflict;  
>
> -   
> generic server validation failure.  
>
>
> Do not show:
>
> -   
> SQL;  
>
> -   
> SQLSTATE;  
>
> -   
> UUIDs;  
>
> -   
> table names;  
>
> -   
> raw PostgREST errors;  
>
> -   
> raw RPC payload;  
>
> - `FIN_*` tokens.  
>
>
> ---
>
> ## 17. STICKY FOOTER
>
> Show only:
>
> - `Total Payments / إجمالي المدفوعات`;  
>
> - `Unallocated to Invoices / غير الموزع على الفواتير`;  
>
> -   
> Cancel;  
>
> -   
> Record Payment.  
>
>
> Keep:
>
> -   
> prominent tabular numeric values;  
>
> -   
> one horizontal row on desktop/tablet where space permits;  
>
> -   
> safe controlled wrap on mobile;  
>
> -   
> no horizontal scrolling;  
>
> -   
> no overlap.  
>
>
> Do not add:
>
> -   
> per-Invoice balances;  
>
> -   
> Horse totals;  
>
> -   
> Client-Level totals;  
>
> -   
> Tender details;  
>
> -   
> validation lists.  
>
>
> Detailed validation remains near the relevant section.
>
> ---
>
> ## 18. INVOICE KPI LABELS
>
> Add new dedicated translation keys:
>
> - `finance.invoices.stats.totalInvoices`  
>
> - `finance.invoices.stats.pendingInvoices`  
>
> - `finance.invoices.stats.paidInvoices`  
>
> - `finance.invoices.stats.overdueInvoices`  
>
>
> ### Arabic
>
> - `إجمالي الفواتير`  
>
> - `الفواتير المعلقة`  
>
> - `الفواتير المدفوعة`  
>
> - `الفواتير المتأخرة`  
>
>
> ### English
>
> - `Total Invoices`  
>
> - `Pending Invoices`  
>
> - `Paid Invoices`  
>
> - `Overdue Invoices`  
>
>
> Apply these keys only to Invoice KPI cards.
>
> Do not modify the existing shared keys:
>
> - `[finance.invoices.total](http://finance.invoices.total)`  
>
> - `finance.invoices.pending`  
>
> - `finance.invoices.paid`  
>
> - `finance.invoices.overdue`  
>
>
> Preserve:
>
> -   
> counts;  
>
> -   
> queries;  
>
> -   
> colors;  
>
> -   
> icons;  
>
> -   
> card design.  
>
>
> ---
>
> ## 19. FILE SCOPE
>
> Create:
>
> - `src/components/finance/PaymentTenderEditor.tsx`  
>
> - `src/components/finance/MultiInvoicePaymentDialog.tsx`  
>
> - `src/components/finance/EligibleInvoicesSelector.tsx`  
>
> - `src/hooks/finance/useEligibleClientInvoices.ts`  
>
> - `src/lib/finance/multiInvoiceDistribution.ts`  
>
> - `src/lib/finance/multiInvoicePaymentFingerprint.ts`  
>
> -   
> focused test files  
>
>
> Modify only as required:
>
> - `src/components/finance/RecordPaymentDialog.tsx`  
>
>   -   
>   controlled Tender-editor extraction only;  
>
>   -   
>   no Single-Invoice UX or financial behavior change.  
>
> - `src/pages/finance/FinanceCustomerBalances.tsx`  
>
> - `src/pages/DashboardFinance.tsx`  
>
> - `src/i18n/locales/en.ts`  
>
> - `src/i18n/locales/ar.ts`  
>
> -   
> shared Payment error mapping where required  
>
>
> Do not modify:
>
> - `post_payment_session`;  
>
> - `postPaymentSession`;  
>
> -   
> Payment database objects;  
>
> -   
> PDF generator;  
>
> -   
> Invoice pagination;  
>
> -   
> Payment rows;  
>
> -   
> Ledger rows;  
>
> -   
> Customer Balance rows.  
>
>
> ---
>
> ## 20. REQUIRED TESTS
>
> ### Customer Balances and entry points
>
> 1.   
> Customer Balances Record Payment no longer opens the generic Error state.  
>
> 2.   
> Correct Client is preselected and immutable.  
>
> 3.   
> Invoice-page entry requires Client selection.  
>
> 4.   
> Changing Client clears Invoice and scope allocations.  
>
> 5.   
> Both entry points open the same shared dialog.  
>
>
> ### Shared Tender editor
>
> 6.   
> Single-Invoice flow uses the shared Tender editor with no behavior change.  
>
> 7.   
> Multi-Invoice flow uses the same Tender editor.  
>
> 8.   
> Total Payments equals Tender sum.  
>
> 9.   
> Split Tender works.  
>
> 10.   
> Tender references remain attached correctly.  
>
>
> ### Eligibility
>
> 11.   
> Cross-Client Invoices never appear.  
>
> 12.   
> Draft, Reviewed, Paid, and Cancelled Invoices are excluded.  
>
> 13.   
> Approved and Partial outstanding Invoices appear.  
>
> 14.   
> Currency-incompatible Invoices are excluded.  
>
> 15.   
> Empty eligible state is localized.  
>
>
> ### Invoice allocation
>
> 16.   
> Two-Invoice full + partial works.  
>
> 17.   
> No Invoice exceeds outstanding.  
>
> 18.   
> Unallocated amount blocks submission.  
>
> 19.   
> Oldest-first is explicit and editable.  
>
> 20.   
> Two-Invoice complement is deterministic.  
>
> 21.   
> More than two Invoices auto-complete only one final unresolved Invoice.  
>
>
> ### Horse and Client-Level
>
> 22.   
> Simple one-Horse Invoice needs no complex editor.  
>
> 23.   
> Client-Level-only Invoice needs no complex editor.  
>
> 24.   
> Multi-Horse Invoice reuses `PaymentAllocationEditor`.  
>
> 25.   
> Horse + Client-Level Invoice works.  
>
> 26.   
> Gross caps include frozen tax.  
>
> 27.   
> Unsupported Laboratory composition remains blocked.  
>
> 28.   
> Every complex Invoice reconciles before submission.  
>
>
> ### Matrix
>
> 29.   
> Tender-row totals remain exact.  
>
> 30.   
> Invoice-column totals remain exact.  
>
> 31.   
> Horse/Client-Level totals remain exact.  
>
> 32.   
> External reference is copied only to rows derived from its Tender.  
>
> 33.   
> Residual cents are deterministic.  
>
> 34.   
> No forbidden duplicate `(invoice_id, payment_method)` row is generated.  
>
> 35.   
> No fractional cent is lost.  
>
> 36.   
> Generated row count excludes zero cells.  
>
> 37.   
> Row count of 50 is allowed.  
>
> 38.   
> Row count above 50 blocks submission.  
>
>
> ### Idempotency and submission
>
> 39.   
> Unchanged retry reuses key.  
>
> 40.   
> Invoice edit rotates key.  
>
> 41.   
> Horse allocation edit rotates key.  
>
> 42.   
> Tender edit/reference edit rotates key.  
>
> 43.   
> One `postPaymentSession` call occurs.  
>
> 44.   
> No legacy writer is called.  
>
> 45.   
> Successful submission resets state and invalidates required caches.  
>
> 46.   
> Concurrent outstanding change fails atomically.  
>
> 47.   
> Failed submission leaves zero frontend success state.  
>
>
> ### KPI and shared UX
>
> 48.   
> Four Arabic KPI labels are exact.  
>
> 49.   
> Four English KPI labels are exact.  
>
> 50.   
> KPI counts and queries are unchanged.  
>
> 51.   
> Arabic uses `خيل`.  
>
> 52.   
> Mobile layout remains usable.  
>
> 53.   
> Desktop layout remains usable.  
>
> 54.   
> Shared dialog remains account-agnostic.  
>
>
> ### Verification
>
> 55.   
> Focused Vitest passes.  
>
> 56.   
> Relevant Single-Invoice Payment regression tests pass.  
>
> 57.   
> Relevant Multi-Invoice matrix tests pass.  
>
> 58. `bunx tsgo --noEmit` passes.  
>
> 59. `bun run build` passes.  
>
>
> Report exact:
>
> -   
> passed;  
>
> -   
> failed;  
>
> -   
> skipped;  
>
> -   
> warnings.  
>
>
> Do not claim database runtime tests unless actual runner logs exist.
>
> ---
>
> ## 21. MANUAL ACCEPTANCE
>
> ### Scenario 1 — Customer Balances
>
> From a Client row, press Record Payment.
>
> Expected:
>
> -   
> no generic Error;  
>
> -   
> correct Client fixed;  
>
> -   
> eligible outstanding Invoices shown.  
>
>
> ### Scenario 2 — Full + Partial
>
> Outstanding:
>
> -   
> Invoice A: SAR 500;  
>
> -   
> Invoice B: SAR 300.  
>
>
> Tender rows:
>
> -   
> Cash: SAR 300;  
>
> -   
> Card: SAR 400.  
>
>
> Expected:
>
> -   
> Total Payments: SAR 700;  
>
> -   
> A: SAR 500;  
>
> -   
> B: SAR 200;  
>
> -   
> one Session;  
>
> -   
> A Paid;  
>
> -   
> B Partial.  
>
>
> ### Scenario 3 — Oldest First
>
> Select three Invoices and press Allocate Oldest First.
>
> Expected:
>
> -   
> deterministic proposal;  
>
> -   
> editable values;  
>
> -   
> no automatic submission.  
>
>
> ### Scenario 4 — Complex Invoice
>
> Select one Multi-Horse Invoice.
>
> Expected:
>
> -   
> existing gross/tax-inclusive allocation editor appears;  
>
> -   
> Scope totals equal the Invoice allocation.  
>
>
> ### Scenario 5 — Split Tender Matrix
>
> Use Cash and Card across two Invoices.
>
> Expected:
>
> -   
> every Tender total reconciles;  
>
> -   
> every Invoice total reconciles;  
>
> -   
> Horse/Client-Level totals reconcile;  
>
> -   
> references remain attached to their Methods.  
>
>
> ### Scenario 6 — 50-Row Guard
>
> Select a combination whose nonzero Invoice × Tender matrix exceeds 50 rows.
>
> Expected:
>
> -   
> submission blocked;  
>
> -   
> actionable message;  
>
> -   
> no RPC call.  
>
>
> ### Scenario 7 — Invoice Page Entry
>
> Open Record Client Payment from the Invoice toolbar.
>
> Expected:
>
> -   
> Client selector;  
>
> -   
> same shared flow after selection.  
>
>
> ### Scenario 8 — KPI Labels
>
> Verify all four Arabic and English locked labels.
>
> Counts and card design remain unchanged.
>
> ### Scenario 9 — Cross-Account
>
> Test Stable, Laboratory where supported, and one additional configured  
>
> Invoice-capable account.
>
> Expected:
>
> -   
> one shared dialog;  
>
> -   
> one writer;  
>
> -   
> account-specific metadata preserved.  
>
>
> ---
>
> ## 22. REQUIRED IMPLEMENTATION REPORT
>
> Report:
>
> ### A. Verdict
>
> ### B. Customer Balances Correction
>
> ### C. Shared Dialog
>
> ### D. Shared Tender Editor
>
> ### E. Eligible Invoice Query
>
> ### F. Invoice Allocation
>
> ### G. Horse/Client-Level Reuse
>
> ### H. Tender × Invoice × Scope Matrix
>
> ### I. External Reference Preservation
>
> ### J. 50-Row Guard
>
> ### K. Idempotency
>
> ### L. Concurrency and Errors
>
> ### M. KPI Labels
>
> ### N. Files Created
>
> ### O. Files Modified
>
> ### P. Production Objects Modified
>
> ### Q. Persistent Rows Modified
>
> ### R. Tests and Counts
>
> ### S. TypeScript Result
>
> ### T. Build Result
>
> ### U. Manual Acceptance Script
>
> ### V. Rollback
>
> ### W. Roadmap
>
> ### X. Next Action
>
> Required verdict:
>
> `PHASE N+3 SLICE 3 MULTI-INVOICE PAYMENT IMPLEMENTED — AWAIT MANUAL ACCEPTANCE`
>
> ---
>
> ## 23. STOP GATE
>
> Stop after the implementation report and manual acceptance script.
>
> Do not begin Slice 4.
>
> Do not implement:
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
> overpayment;  
>
> -   
> Client credit;  
>
> -   
> refunds;  
>
> -   
> reversals;  
>
> -   
> void;  
>
> -   
> chargeback;  
>
> -   
> multiple Clients per Session;  
>
> -   
> Multi-Currency Sessions;  
>
> -   
> Item-level Payment allocation;  
>
> -   
> Horse Ledger;  
>
> -   
> PDF changes;  
>
> -   
> Retail POS.