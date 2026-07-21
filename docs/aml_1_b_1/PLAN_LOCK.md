# Lovable Planning Mode — AML.1.b.1 PLAN-LOCK FINAL CORRECTED

**Mode:** Planning Mode only.  
**Phase:** Pre-Approval Implementation Commitment.  
**Execution in this response:** Prohibited.  
**Authority after approval:** This document becomes the complete execution contract.  
**Supersedes:** Markdown 32, Markdown 33, and the incomplete Markdown 34.

Lovable must not reopen the investigation, invent a replacement architecture, shorten this contract into a generic plan, or implement anything before the user presses **Approve**. Its Planning Mode response must explicitly restate every locked decision, stage, gate, rollback, and QA family below. After approval, it must execute this plan exactly and stop on any failed gate or proven schema/code drift.

---

## A. Non-Execution Declaration and Evidence Precedence

No code, migration, RPC, permission, trigger, table, row, or Demo record is to be changed while producing the Planning Mode response. Read-only inspection is allowed only to confirm that the current code and database still match the already-established evidence. It must not become another open-ended investigative cycle.

Evidence precedence is locked as follows:

1. Current database/catalog evidence and current code.
2. User-confirmed product locks and screenshots.
3. Markdown 20–24, then Markdown 27–30 as the chronological correction ledger.
4. Markdown 31 only where it is not retracted by proven later corrections.
5. Markdown 32–34 only as draft plan material; this file replaces them.

If post-approval drift invalidates a named object, Lovable must halt before the affected mutation, preserve the last passed checkpoint, report the exact object and contradiction, and wait. It must not improvise another table, permission namespace, date source, or data-repair strategy.

---

## B. Chronological Decision Ledger and Final Contradiction Closure

| Source | Accepted contribution | Final treatment in this plan |
|---|---|---|
| Markdown 20 | Proved non-atomic invoice Create/Edit, missing effective date, approval weakness, and -213 test-invoice boundary | Preserved platform-wide |
| Markdown 21 | Separated owner/host/requester/bill-to; established UI selector versus Laboratory trigger mismatch; preserved package payload | Preserved |
| Markdown 22 | Closed Laboratory relationship rule, payment-versus-invoice date semantics, RPC hardening, package compatibility, and SQLSTATE propagation | Preserved with later mechanical corrections |
| Markdown 23 | Expanded writer/reader map, ACL sequencing, financial-item predicate, statement projection, and balance rebuild | Preserved |
| Markdown 24 | Proved Operational Finance is platform-wide and independent from SaaS/subscription billing | Preserved; Documentation 10 SaaS billing remains out of scope |
| Markdown 27 | Proved Supplier Payables do **not** write `billing_links`; added Expense CRUD RPC requirement; confirmed three missing permission keys | Canonical |
| Markdown 28 | Locked exact occurrence sources: `lab_request`, `doctor_consultation`, `vet_treatment`, `vaccination`, `breeding_attempt`, `pregnancy_check`, `foaling`, and `pos_sale`; added correction lineage and exact cancellation states | Canonical |
| Markdown 29 | Proved `payment_intents` has no payment business-date column; locked explicit payment-date RPC input; locked dual-axis expense lifecycle and HR salary contract | Canonical |
| Markdown 30 | Locked Demo-wide scope, singular permission namespace correction, Riyadh date conversion, protected anomaly handling, and production verification policy | Canonical where consistent with the current catalog |
| Markdown 31 | Consolidated the history but reintroduced several retracted claims | Used only after applying the corrections below |
| Markdown 32–34 | Draft PLAN-LOCK | Replaced by this complete corrected file |

The following contradictions are closed here and must not reappear:

1. Permission keys use the existing singular namespace: `finance.invoice.*`, never `finance.invoices.*`.
2. Add exactly three permission definitions: `finance.invoice.approve`, `finance.invoice.cancel`, and `finance.adjustment.create`.
3. `link_supplier_payable_to_invoice` is removed. Current Supplier Payables use `supplier_payables`, not `billing_links`.
4. `billing_links` currently has no `source_type` CHECK and no period columns. Do not “replace” a nonexistent source-type CHECK and do not add period columns in this slice.
5. Laboratory occurrence identity is `lab_requests.id`; each retest produces a new request through the sample chain. Do not invent a result discriminator or use `invoice_items.entity_id` as hidden occurrence state.
6. Doctor occurrence source type is `doctor_consultation`, not `consultation`.
7. Breeding/Reproduction uses three exact source contracts: `breeding_attempt`, `pregnancy_check`, and `foaling`. No `breeding_event` fallback.
8. `payment_intents` has no `paid_at`, `payment_date`, or `captured_at`. New payments receive an explicit `p_payment_date date`; historical payments use the Riyadh posting date.
9. Expense Create/Update/Delete must also move behind RPCs before DML revoke. Posting/Reversal alone is insufficient.
10. `finance_request_idempotency` is RPC-internal. `authenticated` receives no SELECT or DML on it.
11. A positive walk-in invoice with `client_id IS NULL` still posts a ledger row with null client; it only skips `customer_balances`. Skipping the ledger would hide revenue.
12. Housing invoice `INV-MNDH8GPD` genuinely contains 37 financial monthly items. Do not rewrite it into one invoice-item parent. One **ledger** row represents the invoice; the statement parent/detail projection prevents double counting.
13. Housing range violations are rejected by the backend; the UI may cap inputs before submit, but the RPC must not silently alter submitted financial dates.
14. Reviewed/issued cancellation retains header/items and creates no reversal when no invoice ledger exists. Approved/shared/overdue cancellation creates one reversal. Partial/paid remains blocked.
15. First Financial Movement keeps its current inclusion/exclusion semantics and changes only the financial date source. It must not be narrowed to invoice debits only.
16. Aging continues to use invoice `due_date` for overdue buckets. `effective_date` governs ledger chronology, not contractual due-date aging.
17. Existing package discrimination remains: package parent = `package_id IS NOT NULL AND package_price_snapshot IS NOT NULL`; package child = same `package_id` with null snapshot and zero total; manual item = null package. No `parent_item_id` in this slice.

---

## C. Locked Product, Scope, Terminology, and Independence Contract

1. All current platform rows are Demo data. “Demo” does not authorize silent deletion, bulk repair, identity merge, or casual ledger rewriting.
2. Fani, TACO, AL-Qimah, and screenshots are reference examples only, never scope boundaries. The same defect must be assumed possible for every matching account and every matching item.
3. Generic Arabic terminology is **الخيل**. Use `حصان`, `فحل`, `فرس`, `ربكة`, `مهر`, `مهرة`, `مخصي`, or `بوني` only when the stored classification supports that specific term. Identifiers and English schema names remain unchanged.
4. Operational Finance scope is platform-wide: Manual invoices, Housing, Laboratory, Doctor, Vet, Vaccination, Breeding/Reproduction, POS, Expenses, HR salary-linked expenses, Payments, Cancellations, Manual Ledger adjustments, Statements, PDF/Print/CSV, First Financial Movement, Aging, and Customer Balances.
5. Platform SaaS/subscription billing from Documentation 10 is out of scope.
6. Finance-Core owns transactionality, authorization, tenant/client validation, totals, approval, cancellation, payment, ledger posting, balances, effective date, idempotency, and technical audit.
7. Domains own source eligibility, pricing decomposition, source identity, and domain-specific item content. Their adapters may call private Finance-Core helpers but may not directly mutate the six locked financial tables.
8. Housing product locks:
   - Previously invoiced periods display latest-first.
   - “Accrued through today” and “selected-range total” remain separate values.
   - The maximum range is the current Riyadh calendar month-end.
   - `checked_out_at` is an additional hard cap.
   - `expected_departure` is warning-only.
   - `updated_at` is never checkout evidence.
9. Invoice `الم-202607-213` is a user-confirmed test invoice and is the only existing invoice whose business status is changed in the one-time neutralization stage.
10. `INV-MMO9AAXD` is a frozen Known Legacy Demo Anomaly. No item, ledger row, badge, repair, or status change is introduced here.
11. Similar-name tenants, clients, or users are not merged. Finance continues to use immutable UUID identity. Duplicate-name/identity governance remains a separate workstream.

---

## D. Locked Main Defects and Required Outcomes

| Defect | Current failure | Required outcome |
|---|---|---|
| Non-atomic Create | Header commits before item loop | Header and items commit or roll back together; a validated domain adapter also owns exactly one occurrence link |
| Destructive Edit | Old items deleted before replacement inserts finish | Entire edit rolls back and old state survives any failure |
| Weak Approval | Header total approves without physical/financial items | Server validates item presence, package structure, subtotal, tax, discount, and total before status/ledger |
| Non-atomic Approval | Status and ledger are separate client operations | One transaction owns status, ledger, and balance |
| Missing financial date | `created_at` is used as business date | `ledger_entries.effective_date` becomes mandatory and reader-authoritative |
| Laboratory selector/trigger mismatch | Selector uses PHL; trigger checks only `lab_horses.client_id` | Trigger accepts direct client or tenant-scoped `party_horse_links` with `lab_customer` |
| Hidden errors | Specific database validation becomes generic toast | Known SQLSTATE/`FIN_*` errors become safe localized AR/EN messages |
| Direct DML | Authenticated clients can sequence six finance tables | All writers move to RPCs before exact ACL revoke |
| Missing business-occurrence control | Different request keys can bill one source twice | Source lock plus in-transaction active-occurrence check |
| Housing period order/range | Undefined order and one legacy invalid range | Latest-first UI, backend range validation, forward-only CHECK |
| Statement double-count risk | Detail projections can look financial | One ledger parent changes balance; detail rows carry no debit/credit/balance |
| Expense/HR/POS sequencing | Multi-table client writes can partially commit | Domain-complete atomic RPCs |
| Legacy test debit | -213 remains an invalid approved debit | Guarded cancellation + compensating reversal + exact recovery rehearsal |

---

## E. Exact Additive Schema Contract

All migration names must be deterministic. Each migration must assert the pre-existing definition before changing it and abort on a conflicting definition. `IF NOT EXISTS` may be used only where the existing object definition is also compared to the expected definition; it must not silently accept incompatible schema.

### E1. `ledger_entries`

1. Add `effective_date date NULL` with no default.
2. Add an index supporting `(tenant_id, client_id, effective_date, created_at, id)`.
3. Add a partial unique index on `reference_id` where `entry_type='adjustment' AND reference_type='invoice_cancellation'` so one invoice cannot receive two canonical reversals.
4. Keep `created_at` unchanged as audit insertion time.
5. `metadata` already exists; do not add it again.
6. Backfill and `NOT NULL` occur in later gated stages, never in the additive migration.

### E2. `invoices`

Add:

```sql
corrects_invoice_id uuid NULL REFERENCES public.invoices(id)
```

This records explicit cancellation/rebill lineage. A new invoice covering a cancelled domain occurrence must point to the cancelled invoice it corrects. No display-name identity is used.

### E3. `invoice_items`

Add the forward-only constraint, never validate it during AML.1.b.1:

```sql
CHECK (
  (period_start IS NULL AND period_end IS NULL)
  OR
  (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
) NOT VALID
```

This preserves the known Suni Demo row while enforcing every new INSERT/UPDATE. No GiST or cross-table partial index is added to `invoice_items`.

### E4. `expenses`

Add nullable first:

- `ledger_status text NULL`
- `posted_at timestamptz NULL`
- `ledger_entry_id uuid NULL REFERENCES public.ledger_entries(id)`
- `source_type text NULL`
- `source_reference uuid NULL`
- `reverses_expense_id uuid NULL REFERENCES public.expenses(id)`

Add constraints/indexes:

1. Source pair: both source fields null or both non-null.
2. Ledger status: null during transition, otherwise one of `unposted`, `posted`, `reversed`.
3. Unique ledger reference: one ledger row per expense row where `reference_type='expense'`.
4. Unique source link: `(tenant_id, source_type, source_reference)` where source type is non-null.
5. One reversal: unique `reverses_expense_id` where non-null.
6. Delete guard: posted/reversed expense rows cannot be deleted through ordinary RPCs.

Current standalone expenses keep both source fields null. In this slice the only non-null expense source is `hr_salary_payment`, validated against `hr_salary_payments.id` and tenant. Do not invent `manual`, `boarding`, `vet_treatment`, or `supplier_payable` expense sources.

After writer migration:

1. Backfill all existing expense rows to `ledger_status='unposted'` without changing workflow `status`.
2. Set default `ledger_status='unposted'`.
3. Set `ledger_status NOT NULL` only after zero-null assertion.

### E5. `pos_sales`

Create the canonical sale identity table:

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id uuid NOT NULL REFERENCES tenants(id)`
- `session_id uuid NOT NULL REFERENCES pos_sessions(id)`
- `sale_number integer NOT NULL`
- `cart_hash text NOT NULL` for audit only
- `subtotal numeric(12,2) NOT NULL`
- `tax_amount numeric(12,2) NOT NULL DEFAULT 0`
- `total_amount numeric(12,2) NOT NULL`
- `currency text NOT NULL`
- `invoice_id uuid NULL REFERENCES invoices(id)`
- `created_by uuid NOT NULL REFERENCES profiles(id)`
- `created_at timestamptz NOT NULL DEFAULT now()`
- unique `(tenant_id, session_id, sale_number)`

Do **not** make `cart_hash` unique: two legitimate sales may contain identical carts. Double-submit protection comes from idempotency; the source occurrence is `pos_sales.id`.

RLS is enabled. `authenticated` and `anon` receive no DML. Tenant-scoped SELECT is allowed only if a current POS reader requires it; otherwise the table remains RPC-internal.

### E6. `finance_request_idempotency`

Create:

```sql
CREATE TABLE public.finance_request_idempotency (
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation        text        NOT NULL,
  idempotency_key  uuid        NOT NULL,
  actor_id         uuid        NOT NULL,
  request_hash     bytea       NOT NULL,
  resolved_snapshot jsonb      NOT NULL DEFAULT '{}'::jsonb,
  response         jsonb       NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '7 days',
  PRIMARY KEY (tenant_id, operation, idempotency_key)
);
```

Add an expiry index. Enable RLS. Revoke SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from `authenticated`, `anon`, and PUBLIC. Only function owner and service-role maintenance may access it. `resolved_snapshot` may contain financial audit data and must never be tenant-member readable.

### E7. Explicit non-changes

1. Do not add a payment-date column to `payment_intents` in this slice.
2. Do not add `parent_item_id` to `invoice_items`.
3. Do not add period/currency columns to `billing_links`.
4. Do not create or replace a nonexistent `billing_links.source_type` CHECK. RPC adapters enforce the exact allowed source and tenant relationship.
5. Do not add `tenants.timezone`; AML.1.b.1 uses `Asia/Riyadh` explicitly.
6. `pgcrypto` SHA-256 is reused; installation is asserted in preflight and `CREATE EXTENSION IF NOT EXISTS pgcrypto` is allowed only if the extension is absent.

---

## F. Exact Permission Namespace and Binding Contract

Insert exactly:

```text
finance.invoice.approve
finance.invoice.cancel
finance.adjustment.create
```

Do not create plural aliases or `finance.*` wildcards. Keep existing keys including `finance.invoice.create`, `finance.invoice.edit`, `finance.invoice.delete`, `finance.invoice.markPaid`, `finance.payment.create`, `finance.expenses.create`, `finance.expenses.approve`, `finance.expenses.manage`, `finance.payables.manage`, `pos.sale.create`, and `hr.manage`.

Bind the three new keys only to the exact current owner/manager finance preset represented in the verified catalog by bundle name `كبير المشرفين`, scoped per tenant. Stage 1 captures its bundle IDs and expected count; the migration aborts if the name-to-ID set drifts. Do not infer entitlement from “has create + edit,” and do not grant custom roles automatically.

Rollback deletes only the binding rows and permission rows inserted by this migration, using the captured bundle IDs. It must not delete future/manual bindings added after rollout.

| Public RPC | Permission |
|---|---|
| `create_invoice_with_items` | `finance.invoice.create` |
| `update_invoice_with_items` | `finance.invoice.edit` |
| `delete_draft_invoice` | `finance.invoice.delete` plus own-draft rule |
| `approve_invoice` | `finance.invoice.approve` |
| `cancel_invoice` | `finance.invoice.cancel` |
| `post_payment` | `finance.payment.create` |
| `create_expense` | `finance.expenses.create` |
| `update_expense`, `delete_expense` | `finance.expenses.manage` |
| `post_expense_with_ledger` | `finance.expenses.approve` |
| `reverse_expense` | `finance.expenses.manage` |
| `post_manual_ledger_adjustment` | `finance.adjustment.create` |
| `pos_finalize_sale` | `pos.sale.create` |
| `record_salary_payment` | `hr.manage` only |

Domain adapters also require `finance.invoice.create` plus their current domain authority: `housing.manage`, Laboratory tenant capability, `doctor.consultations.write`, `vet.manage`, or `breeding.manage`.

`finance.invoice.markPaid` remains in the catalog for compatibility, but no active UI or client path may set `paid` without `post_payment`. It is not an alternate false-paid path.

---

## G. SECURITY DEFINER Architecture and Exact RPC Inventory

All public money-writing RPCs are `SECURITY DEFINER`, owned by the controlled database function owner, use `SET search_path = ''`, fully qualify every object, revoke EXECUTE from PUBLIC and `anon`, and grant EXECUTE to `authenticated` only. Each begins with:

1. `auth.uid()` non-null check.
2. Tenant membership check.
3. Exact permission/capability check.
4. Server-side re-read of tenant, client, source, service, category, package, and الخيل identities.
5. Idempotency and source-lock flow from §I.

Private helpers are prefixed `_finance_`, are not executable by `authenticated`, and perform shared persistence without re-checking a different public permission. Public domain adapters validate their own authority, then invoke private helpers in the same transaction. This prevents an HR user with `hr.manage` from needing Finance expense permission while also preventing direct access to the private expense writer.

### G1. Public Finance-Core and operational RPCs

| RPC | Exact responsibility |
|---|---|
| `create_invoice_with_items(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` | Atomic manual header + items; public manual calls cannot create a domain billing link |
| `update_invoice_with_items(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_payload jsonb)` | Draft-only full replacement inside one transaction; old items survive failure |
| `delete_draft_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid)` | Own draft only; physical delete of items, links, header; no ledger |
| `approve_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid)` | Locks invoice; validates; posts ledger; rebuilds affected balance; transitions status atomically |
| `cancel_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date, p_reason text)` | State-specific void/cancel behavior; one reversal only when an invoice ledger exists |
| `post_payment(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_amount numeric, p_payment_date date, p_payment_method text, p_account_id uuid, p_payload jsonb)` | Payment intent + ledger + balance + derived invoice status in one transaction |
| `create_expense(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` | Creates unposted expense workflow row |
| `update_expense(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_payload jsonb)` | State-aware editable fields only |
| `delete_expense(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid)` | Deletes only unposted expense rows |
| `post_expense_with_ledger(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid)` | Explicit approve-and-post action: pending→approved+posted, or approved/paid unposted→posted |
| `reverse_expense(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_reason text, p_reversal_date date)` | Model-B reversal; blocks HR-sourced expense reversal |
| `post_manual_ledger_adjustment(p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid, p_amount numeric, p_effective_date date, p_description text)` | Required non-null explicit date; ledger + affected balance |
| `pos_finalize_sale(p_tenant_id uuid, p_idempotency_key uuid, p_session_id uuid, p_payload jsonb)` | Sale identity + inventory + invoice/items + payment + ledger + link + balance atomically |
| `record_salary_payment(p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid, p_amount numeric, p_currency text, p_paid_at timestamptz, p_payment_period text, p_notes text, p_create_expense boolean)` | Salary row; with expense=true, atomically creates and posts the salary expense |

There is no `link_supplier_payable_to_invoice` RPC and no permanent `neutralize_test_invoice` RPC.

### G2. Source-aware invoice adapters

| Adapter | Source lock/table | Billing occurrence |
|---|---|---|
| `create_invoice_from_admission` | `boarding_admissions.id` | `boarding` + admission UUID + item period overlap |
| `create_lab_invoice` | `lab_requests.id` | `lab_request` + request UUID |
| `create_doctor_invoice` | `doctor_consultations.id` | `doctor_consultation` + consultation UUID |
| `create_vet_invoice` | `vet_treatments.id` | `vet_treatment` + treatment UUID |
| `create_vaccination_invoice` | `horse_vaccinations.id` | `vaccination` + vaccination UUID |
| `create_breeding_invoice` | one exact row from `breeding_attempts`, `pregnancy_checks`, or `foalings` | `breeding_attempt`, `pregnancy_check`, or `foaling` with that row UUID |

Each adapter resolves line items and identity from the locked source row and calls private invoice persistence. It creates one `billing_links` row for its occurrence, except Housing where one link points to the admission and the item periods define the covered occurrence.

Every receivables adapter uses the existing `link_kind='final'`. Public manual invoice creation rejects source-link fields. Draft edits may not change an existing domain source identity; the source adapter must revalidate it.

### G3. Approval and calculation invariants

1. Approval is allowed only from `draft`, `reviewed`, or `issued`.
2. Every invoice requires at least one physical item, including zero-total invoices.
3. Financial item predicate:
   - Manual item: `package_id IS NULL`.
   - Package parent: `package_id IS NOT NULL AND package_price_snapshot IS NOT NULL`.
   - Package child: `package_id IS NOT NULL AND package_price_snapshot IS NULL AND total_price = 0`.
4. Approval requires at least one financial item.
5. Every package child must have a matching parent grouping; repeated packages for different الخيل/periods remain legal.
6. Backend recomputes quantity × unit price, financial subtotal, tax, discount, and total using the current platform rounding rules. Client totals are not trusted.
7. Reject when discount exceeds subtotal.
8. Require `ABS(header.subtotal - financial_item_sum) < 0.01` and exact rounded parity for total.
9. Zero-total valid invoices may approve without a ledger row.
10. Positive-total invoices always create one invoice ledger row. A null client is allowed for walk-in revenue; it skips only customer balance creation.
11. Existing invoice-ledger idempotency uniqueness remains enforced.

### G4. Cancellation state machine

| Current status | Operation | Ledger requirement/action | Preserved state |
|---|---|---|---|
| `draft` | `delete_draft_invoice` only | must have no invoice ledger | physical delete of its header/items/links |
| `reviewed`, `issued` | void via `cancel_invoice` | must have zero invoice ledger rows; otherwise abort as anomaly; no reversal | retain header/items/links, set cancelled and audit fields |
| `approved`, `shared`, `overdue` | cancel via `cancel_invoice` | require exactly one canonical invoice ledger row; insert one opposite reversal using actual ledger amount | retain header/items/links, set cancelled and audit fields |
| `partial`, `paid` | blocked | no mutation | refund workflow remains separate |
| `cancelled` | verified no-op/replay | no extra reversal | unchanged |

The ordinary reversal date is the required cancellation business date. The one-time -213 exception is isolated in §Q and is not exposed through the public RPC.

---

## H. Complete Writer and Reader Migration Map

### H1. Writers that must migrate before ACL revoke

| Surface | Current path | Final path |
|---|---|---|
| Manual/domain invoice Create/Edit | `InvoiceFormDialog`, `useInvoices` direct tables | Create/Update RPC or source adapter |
| Draft delete | direct invoice delete | `delete_draft_invoice` |
| Approval | `approveInvoice.ts` + `postLedgerForInvoice.ts` | `approve_invoice` |
| Cancellation | `InvoiceDetailsSheet` sequential writes | `cancel_invoice` |
| Payment | payment hooks + `postLedgerForPayments.ts` | `post_payment` |
| Expense CRUD | `useExpenses.ts`, `ExpenseFormDialog.tsx` | create/update/delete expense RPCs |
| Expense post/reverse | `postLedgerForExpense.ts` and direct state writes | post/reverse expense RPCs |
| Manual ledger | `useLedger.createEntry` | manual adjustment RPC |
| Housing | `CreateInvoiceFromAdmission.tsx`, billing-link hook | Housing adapter |
| Laboratory | requests/samples/results invoice buttons | Laboratory adapter using request occurrence |
| Doctor | consultation invoice generator | Doctor adapter |
| Vet/Vaccination | treatment/dose generators | exact adapters |
| Breeding/Reproduction | attempt/check/foaling generators | exact subtype adapter |
| POS | `POSPaymentPanel`, `EmbeddedCheckout`, session/inventory/payment writers | `pos_finalize_sale` |
| HR salary | `useSalaryPayments.ts` two-step insert | `record_salary_payment` |
| Demo seeding | `useFinanceDemo.ts` direct six-table DML | removed from authenticated runtime; Demo reset remains a separate controlled job |

`postLedgerForInvoice.ts` becomes obsolete and must not remain as a callable client writer. Other legacy helper files become thin RPC wrappers or are removed once all call sites are migrated.

The idempotency key is created once per user intent and stored for the lifetime of the mutation/form. Network retries, the 40001 retry loop, and double taps reuse the same key. It is reset only after a terminal success/cancelled form or a genuinely new user intent.

### H2. Readers

| Reader | Final date/order contract |
|---|---|
| Ledger list | `effective_date`, then `created_at`, then `id` |
| Client Statement | Parent financial row ordered/filtered by `effective_date`; display details non-financial |
| First Financial Movement | Current exclusions preserved; replace chronological expression with `effective_date` |
| Aging | Contractual `due_date` for age buckets; effective date only for ledger ordering |
| PDF/Print/CSV | Same financial rows, totals, and effective date as on-screen Statement |
| Customer balances | Sum ledger amounts; rebuilt after chronology backfill |
| Housing period history | `period_start DESC`, `period_end DESC`, `id ASC` |

Historical description-refresh code must not receive a new write RPC in this slice. New ledger descriptions are written correctly at transaction time; historical copy changes remain deferred/read-only.

---

## I. Idempotency, Locking, and Business-Occurrence Contract

### I1. Request hash

`request_hash` is SHA-256 over canonical JSON containing operation, tenant, actor, source identity, and caller-supplied business intent. Server-resolved prices, eligibility state, and relationship rows are stored in `resolved_snapshot`, not used to make a replay look like a different caller request.

### I2. Fixed transaction order

1. Authenticate actor; validate tenant membership and exact permission.
2. Validate syntax and required fields without trusting tenant/source relationships.
3. Acquire advisory lock for `(tenant, operation, idempotency_key)`.
4. Read idempotency row.
5. Active completed row:
   - actor mismatch → `42501 FIN_IDEMPOTENCY_ACTOR_MISMATCH`;
   - request hash mismatch → `23514 FIN_IDEMPOTENCY_CONFLICT`;
   - both match → return stored response without source revalidation or new mutation.
6. Active row with null response → `40001 FIN_IDEMPOTENCY_IN_PROGRESS`; frontend retries with the same key.
7. Expired row → atomically reclaim with `UPDATE ... WHERE expires_at <= now()`. A zero row count causes a re-read, never delete+insert.
8. New row → insert reservation inside the same transaction.
9. Domain request: acquire one tenant-qualified source advisory lock, then `SELECT ... FOR UPDATE` the source row.
10. Re-derive source tenant/client/الخيل/eligibility from the database.
11. Run business-occurrence duplicate/overlap check.
12. Perform the complete atomic mutation.
13. Store `resolved_snapshot` and response in the same transaction; commit.

Nightly service-role maintenance deletes expired rows. It does not expose responses to authenticated users.

### I3. Occurrence matrix

| Domain | Exact active occurrence | Concurrency guard | Legitimate repeat |
|---|---|---|---|
| Housing | admission plus any overlapping closed date range in active invoice items | tenant+admission advisory lock + admission row lock | adjacent/non-overlapping range; cancelled correction with `corrects_invoice_id` |
| Laboratory | `lab_request_id` | tenant+request lock | retest has a new request ID |
| Doctor | `doctor_consultation_id` | tenant+consultation lock | cancelled correction lineage only |
| Vet | `vet_treatment_id` | tenant+treatment lock | new treatment row |
| Vaccination | `horse_vaccination_id` | tenant+dose lock | booster has a new dose row |
| Breeding attempt | `breeding_attempt_id` | tenant+attempt lock | new attempt |
| Pregnancy check | `pregnancy_check_id` | tenant+check lock | new check |
| Foaling | `foaling_id` | tenant+foaling lock | one event; corrected invoice lineage only |
| POS | new `pos_sales.id` assigned under locked session; sale number unique in session | tenant+session lock | identical later cart is allowed as a new sale |
| Expense | `expense.id` for ledger posting; one ledger row | tenant+expense lock | new expense row |
| HR salary expense | `hr_salary_payments.id` | tenant+salary-payment lock | new payment row |
| Manual invoice | no business occurrence key | idempotency lock only | legitimate repeats allowed |

Active invoice statuses for duplicate checks are `draft`, `reviewed`, `issued`, `approved`, `shared`, `partial`, `paid`, and `overdue`. `cancelled` is excluded, but a new bill for its occurrence must provide `corrects_invoice_id` pointing to it. Failed transactions leave no blocking occurrence.

Housing overlap query joins `billing_links → invoices → invoice_items`; it must not attempt a cross-table partial index. On a conflict, return `23P01 FIN_HOUSING_PERIOD_ALREADY_INVOICED` including conflicting invoice number and range.

---

## J. Laboratory Relationship and Walk-In Contract

Amend only the `lab_horse_id` branch of `_invoice_items_validate_source`; preserve every existing service, category, package, and cross-tenant validation branch.

For invoice tenant `T`, client `C`, and `lab_horse_id L`:

1. Missing `lab_horses(L)` → `23503 FIN_LAB_HORSE_UNKNOWN`.
2. `lab_horses.tenant_id <> T` → `42501 FIN_LAB_HORSE_CROSS_TENANT`.
3. `C IS NULL` → accept as walk-in.
4. `C IS NOT NULL` → accept when either:
   - `lab_horses.client_id = C`; or
   - a row exists in `party_horse_links` with the same tenant, `lab_horse_id=L`, `client_id=C`, and `relationship_type='lab_customer'`.
5. Otherwise → `23514 FIN_LAB_HORSE_CLIENT_UNRELATED`.

The Laboratory selector and trigger must therefore read the same relationship truth. Fani is only the proving example.

A positive walk-in approved invoice creates one `ledger_entries` invoice row with `client_id=NULL`, `effective_date=issue_date`, and `balance_after=0`. It creates no `customer_balances` row and appears in tenant revenue/ledger reports but never in a client statement.

---

## K. Housing Period, Range, and Projection Contract

1. Previously invoiced periods query:

```text
period_start DESC, period_end DESC, invoice.issue_date DESC, invoice_items.id ASC
```

2. Backend maximum period end:
   - Riyadh current calendar month-end; and
   - when `checked_out_at` exists, the earlier of month-end and its Riyadh business date.
3. `status='checked_out'` with null `checked_out_at` is inconsistent and returns `23514 FIN_HOUSING_INCONSISTENT_ADMISSION`; never use `updated_at`.
4. `expected_departure` creates a frontend warning only.
5. UI date pickers may prevent or cap invalid selection before submit. The RPC validates the exact submitted dates and rejects over-cap ranges; it never silently changes them.
6. “Accrued through today” and “selected-range total” remain separate labeled amounts.
7. Monthly proration continues to use the real calendar days (28/29/30/31) and existing rounding. Golden fixtures include Fani’s 2024 leap February and 2025 February.
8. `INV-MNDH8GPD` remains byte-for-byte unchanged in header/items: 37 financial monthly items sum to subtotal 92,500; tax 13,875; total 106,375; one ledger invoice row.
9. Statement projection:
   - one parent row per invoice carries debit/credit/balance;
   - the 37 Housing item rows may render as indented display details with period labels and display totals;
   - detail rows have blank debit, credit, and balance cells;
   - the running balance advances once by the ledger amount;
   - sum of segment display amounts equals invoice total and ledger amount.
10. Package parent/child behavior is separate from Housing monthly financial items and must not be used to collapse those 37 items.

---

## L. SQLSTATE, Error Surfacing, and Retry Contract

Create one shared frontend mapper, for example `src/lib/finance/financeErrorMessages.ts`, and route every migrated Finance mutation through it.

| SQLSTATE | Use | Retry |
|---|---|---|
| `42501` | unauthenticated, missing permission, tenant mismatch, cross-tenant source, actor mismatch | never |
| `23503` | referenced invoice/source/service/category/package/خيل row does not exist | never |
| `23514` | invalid payload/state math, unrelated Laboratory client, invalid range, idempotency hash conflict | never |
| `23P01` | Housing exact/partial/nested period conflict | never |
| `40001` | true serialization/in-progress retry condition only | retry at 100/300/900 ms with the same idempotency key |
| `P0001` | named business rule without a better SQLSTATE: already reversed, blocked payment state, duplicate non-period occurrence | never |

Every database error message starts with a stable `FIN_*` code. Known codes map to safe, specific Arabic and English copy. Conflict messages may safely include the conflicting invoice number and date range. Unknown database text is not exposed; it falls back to `common.error` while the original code/message is logged without secrets or full payloads.

Required codes include:

```text
FIN_AUTH_REQUIRED
FIN_PERMISSION_DENIED_*
FIN_CROSS_TENANT
FIN_IDEMPOTENCY_ACTOR_MISMATCH
FIN_IDEMPOTENCY_CONFLICT
FIN_IDEMPOTENCY_IN_PROGRESS
FIN_APPROVE_NO_ITEMS
FIN_APPROVE_NO_FINANCIAL_ITEMS
FIN_APPROVE_TOTAL_MISMATCH
FIN_PACKAGE_CHILD_WITHOUT_PARENT
FIN_LAB_HORSE_UNKNOWN
FIN_LAB_HORSE_CROSS_TENANT
FIN_LAB_HORSE_CLIENT_UNRELATED
FIN_HOUSING_PERIOD_ALREADY_INVOICED
FIN_HOUSING_PERIOD_INVALID
FIN_HOUSING_RANGE_EXCEEDS_MONTH_END
FIN_HOUSING_RANGE_EXCEEDS_CHECKOUT
FIN_HOUSING_INCONSISTENT_ADMISSION
FIN_INVOICE_HAS_PAYMENTS
FIN_CANCEL_INVALID_STATE
FIN_EXPENSE_NOT_APPROVABLE
FIN_EXPENSE_ALREADY_POSTED
FIN_EXPENSE_ALREADY_REVERSED
FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE
FIN_DUPLICATE_BUSINESS_OCCURRENCE
FIN_POS_SALE_DUPLICATE
```

The current generic toast in `InvoiceFormDialog` is removed from known Finance failures. Trigger SQLSTATE and `FIN_*` code must survive through the RPC.

---

## M. Effective-Date, Backfill, and Reader Contract

### M1. New writes

| Ledger event | `effective_date` |
|---|---|
| Invoice debit | `invoices.issue_date` |
| Payment | required `p_payment_date`; positive input becomes a negative ledger amount reducing the receivable |
| POS invoice/payment | required sale business date inside the validated POS payload |
| Expense | `expenses.expense_date` |
| HR salary-linked expense | Riyadh date of `hr_salary_payments.paid_at` |
| Manual adjustment | required `p_effective_date` |
| Ordinary invoice cancellation | required cancellation business date |
| -213 one-time neutralization | original issue date `2017-02-20` only |

No new writer may rely on a column default for financial chronology.

### M2. Historical backfill

Use `(created_at AT TIME ZONE 'Asia/Riyadh')::date`, never bare `created_at::date`.

1. `entry_type='invoice' AND reference_type='invoice'` → join invoice and use `issue_date`.
2. `entry_type='payment' AND reference_type='invoice'` → Riyadh posting date because historical `payment_intents` contain no business date.
3. Legacy `entry_type='adjustment' AND reference_type='invoice'` → Riyadh posting date; these are general Phase-6 adjustments and must not inherit invoice issue date.
4. Existing ordinary `entry_type='adjustment' AND reference_type='invoice_cancellation'` → Riyadh posting date because no historical cancellation business date was stored.
5. No historical expense/POS ledger rows are expected by the accepted census. If a preflight census finds a new class, abort before backfill; do not guess.
6. The -213 reversal does not exist during backfill and is inserted later with its explicit exception date.

The migration first asserts the exact `(entry_type, reference_type)` census and zero orphan invoice references. Unknown/unresolved rows abort the stage; there is no NOTICE-only quarantine and no fallback that silently changes meaning.

Pre/post invariants:

1. Row count by tenant and event class unchanged.
2. `SUM(amount)` by tenant/client unchanged.
3. Stable SHA-256 row hashes excluding only `effective_date`, `balance_after`, and the explicitly added classification metadata remain equal.
4. Zero `effective_date IS NULL` after backfill.
5. Running the backfill twice produces the same values and metadata.

### M3. Reader flip

1. Ledger chronology: `effective_date ASC|DESC, created_at, id` with stable direction.
2. Client Statement filter/date/sort: `effective_date`.
3. PDF/Print/CSV: same parent financial rows and same effective dates as on-screen Statement.
4. Running balance: effective-date order, then audit timestamp/id tie-break.
5. Aging: invoice `due_date` remains the overdue basis; do not replace it with effective date.
6. `created_at` remains visible only as audit/posting time where the UI intentionally displays it.

### M4. First Financial Movement

Read the full current `get_client_first_financial_activity(p_tenant_id uuid, p_client_id uuid)` definition at execution preflight and preserve all current inclusion/exclusion predicates, including cancelled/draft invoice exclusion and canonical `invoice_cancellation` adjustment exclusion. Replace:

- chronological aggregate `MIN(created_at)` with `MIN(effective_date)`;
- future cutoff with Riyadh current business date.

Preserve the current `timestamptz` return signature by converting the resulting date to start-of-day in `Asia/Riyadh`. Do not narrow the function to invoice debits only; payments and valid adjustments retain their current semantics.

---

## N. Statement Projection, Running Balance, and Customer-Balance Rebuild

### N1. Statement projection

One ledger row is one financial parent. Domain item/period rows are projections beneath that parent and contribute zero to Debit, Credit, and Balance columns. This applies equally on screen, PDF, Print, and detailed CSV.

For every invoice:

```text
sum(display segment amounts) = invoice.total_amount = invoice ledger amount
financial parent count = 1
running-balance movement count = 1
```

The CSV may include a detailed mode, but detail-row Debit/Credit/Balance cells remain blank so summing financial columns still equals the ledger.

### N2. `balance_after` rebuild

After backfill, rebuild only non-null-client partitions:

```sql
SUM(amount) OVER (
  PARTITION BY tenant_id, client_id
  ORDER BY effective_date, created_at, id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

Rows with `client_id IS NULL` receive `balance_after=0` and never create customer balances.

### N3. `customer_balances`

Upsert one row per `(tenant_id, client_id)` from `SUM(ledger_entries.amount)`, using `tenants.default_currency`. Do not delete stale rows automatically. A FULL OUTER reconciliation exposes missing/stale partitions; any stale row or currency mismatch aborts for explicit review.

Exit queries must prove:

1. No null-client customer-balance row.
2. No duplicate `(tenant_id, client_id)`.
3. Every customer balance equals ledger sum.
4. Final `balance_after` equals partition sum.
5. Every row’s `balance_after` equals the cumulative sum through that row.
6. `v_customer_ledger_balances` equals `customer_balances`.

Running balance is not required to be monotonic; payments, credits, and reversals legitimately reduce it.

Before rebuild, export exact preimages of `ledger_entries(id, effective_date, balance_after, metadata)` and all `customer_balances` rows. Rollback uses these keyed preimages, never a full-table restore that could overwrite concurrent unrelated data.

---

## O. Expense, HR, Supplier-Payable, and POS Contracts

### O1. Expense lifecycle

`expenses.status` remains the existing workflow axis. `ledger_status` is the accounting axis.

| Workflow / ledger state | Allowed action |
|---|---|
| pending + unposted | edit; approve-and-post action |
| approved + unposted | edit permitted fields; post |
| approved/paid + posted | edit only description/notes/receipt; reverse |
| any + reversed | terminal except notes |

`post_expense_with_ledger` is the explicit approval/posting action:

1. Pending → approved and posted atomically when an actor with `finance.expenses.approve` presses Approve.
2. Already approved but unposted → posted atomically.
3. Rejected, posted, or reversed → reject with exact state code.
4. Expense creation alone never creates a ledger row.
5. Ledger row uses `entry_type='expense'`, `reference_type='expense'`, `reference_id=expense.id`, positive amount, `effective_date=expense_date`, null client, and `balance_after=0`.

`post_payment` preserves the current payment allocation and overpayment policy, but moves it behind one transaction. It validates a positive input amount, inserts the payment ledger amount as negative, derives the invoice status from total recorded payments, and never accepts a client-supplied final status.

Reversal Model B:

1. Lock the original posted expense.
2. Reject HR salary source with `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`.
3. Create one reversal expense with positive stored amount, `category='reversal'`, `reverses_expense_id=original.id`, `ledger_status='posted'`, and reversal business date.
4. Create one negative ledger row referencing the reversal expense.
5. Set original `ledger_status='reversed'`; preserve original workflow status and ledger row.
6. A second reversal is blocked.

### O2. HR salary payment

`record_salary_payment` checks `hr.manage` only and uses a private expense-posting helper:

- `p_create_expense=false`: create only `hr_salary_payments`; no expense, ledger, or customer balance.
- `p_create_expense=true`: one transaction creates salary payment, approved+posted expense with source `hr_salary_payment`, expense date from `p_paid_at` in Riyadh, expense ledger row, and `finance_expense_id` back-link.

No HR salary reversal is implemented here.

### O3. Supplier Payables

Current Supplier Payables remain in `supplier_payables` and do not use `billing_links`. AML.1.b.1 does not migrate, link, settle, or redesign them. The execution must run a regression bundle proving existing create/update/status/amount-paid behavior remains unchanged. A future supplier allocation requires a separate table/workstream, not receivables `billing_links`.

### O4. POS

`pos_finalize_sale` owns, in one transaction:

1. Lock active POS session and assign next session sale number.
2. Insert `pos_sales`.
3. Validate and write inventory movements.
4. Create invoice and items.
5. Create payment intent.
6. Post invoice/payment ledger rows with explicit sale business date.
7. Create `billing_links(source_type='pos_sale', source_id=pos_sales.id)`.
8. Recompute customer balance when client is non-null.
9. Update session totals and store idempotency response.

Receipt rendering remains frontend-only. A failed inventory/item/payment validation rolls back the entire sale. An identical later cart with a new user intent is legal; a double tap with the same idempotency key replays the original sale.

---

## P. ACL, RLS, Function Grants, and Direct-Writer Gate

The six locked tables are:

```text
invoices
invoice_items
ledger_entries
customer_balances
billing_links
expenses
```

No revoke occurs until every writer in §H is migrated, the build/typecheck passes, and the direct-writer gate returns zero unapproved client mutations.

The gate searches `src/` for INSERT/UPDATE/DELETE/UPSERT against all six tables, including multiline calls and wrappers. Read-only selects and generated types are the only exclusions. It also audits status-setting helpers such as Mark Paid and Demo seed/reset code.

After the gate:

1. Revoke INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER from `authenticated` and `anon` on all six tables.
2. Retain authenticated SELECT only where current RLS-scoped readers require it.
3. Revoke anon SELECT on all six; public share/token reads continue through existing SECURITY DEFINER read RPCs.
4. Keep service-role/controlled function-owner rights required by cron and migrations.
5. Do not change global default privileges.
6. Capture and store exact pre-revoke ACL statements; rollback restores only those exact grants.
7. New `finance_request_idempotency` has no authenticated/anon access.
8. New `pos_sales` has only the narrowly required tenant SELECT and no direct authenticated DML.

Every public RPC has EXECUTE revoked from PUBLIC/anon and granted to authenticated. Every private helper has no authenticated EXECUTE. Production verification uses `has_table_privilege`, `pg_class.relacl`, `pg_policies`, `information_schema.role_table_grants`, and `pg_proc.proacl`; no production denial test writes a row, even inside ROLLBACK.

---

## Q. Legacy Demo Preservation and -213 One-Time Neutralization

### Q1. Protected Demo register

| Record | UUID | Treatment |
|---|---|---|
| `الم-202607-213` | `bc37440d-d402-4e2b-96cd-67329456d0fd` | one guarded neutralization only |
| `الم-202607-396` | `7bdaf243-c31a-4ef2-a25e-72ca0af9664e` | frozen draft |
| `الم-202607-951` | `af663402-5dd3-492d-8c8f-d39ef08478a5` | preserve; standard date backfill |
| `اسط-202607-717` | `a0891216-f6d0-4373-959d-6631596c45bc` | preserve; effective date `2013-07-20` |
| `اسط-202607-740` | `30655789-2540-4747-a37a-3c793762245b` | preserve draft |
| `INV-MMO9AAXD` | `674bfa8a-49ec-4aaa-ac35-1047826b7e22` | frozen Known Legacy Demo Anomaly |
| `INV-MNDH8GPD` | `ee8dc05c-18a8-488c-a5fe-eeb1b7cd4783` | preserve header + 37 items + one ledger row |
| Suni invalid item | `fedae37c-0fcb-42f4-8ed7-ec7f97c61193` | preserve through NOT VALID constraint |

Backfill changes only the intended derived/effective-date fields. No protected header/item/link/status is changed except -213 at its dedicated stage.

### Q2. -213 preflight

The one-shot migration runs as the controlled migration owner; no permanent RPC is created. It locks and strictly asserts:

```text
invoice id      bc37440d-d402-4e2b-96cd-67329456d0fd
tenant id       348ce41c-1102-4295-bf6a-2ea0203c1036
client id       364165f0-58ec-464c-bdc0-86f3e7a0c79b
invoice number  الم-202607-213
issue date      2017-02-20
status          approved
total           50.00
physical items  0
invoice ledger  exactly 1, amount +50.00
payment rows    0
prior reversal  0, unless the verified idempotent branch applies
```

Before mutation, capture deterministic SHA-256 fingerprints and exact preimages for:

- the protected invoices and their items;
- ledger rows for their references;
- related billing links;
- the affected client ledger partition;
- the affected `customer_balances` row;
- Suni’s protected item.

No timestamp window is used.

### Q3. Neutralization transaction

1. Compute the expected FFM using the **post-reader-migration full FFM predicate**, excluding only -213’s invoice row and canonical reversal.
2. Insert exactly one ledger adjustment:
   - `entry_type='adjustment'`
   - `reference_type='invoice_cancellation'`
   - `reference_id=-213 UUID`
   - `amount=-actual original invoice ledger amount`
   - `effective_date='2017-02-20'`
   - same tenant/client
   - `created_by=COALESCE(original_ledger.created_by, invoice.created_by, tenant.owner_id)`
   - metadata classification `aml_1_b_1_test_data_neutralization` and original ledger ID.
3. Update invoice to `status='cancelled'`, set existing `cancelled_at=now()`, set exact cancellation reason, and update `updated_at`.
4. Rebuild only the affected client’s `balance_after` chain and customer balance.
5. Assert net ledger effect for the invoice reference is zero.
6. Assert actual FFM equals expected FFM without -213.
7. Assert every protected fingerprint is unchanged.
8. Any failure aborts the entire transaction.

### Q4. Idempotent re-run

Check for an existing reversal before requiring the original approved status. A re-run is a no-op only when all postconditions are exact: one reversal, correct amount/date/tenant/client/reference, cancelled invoice/audit fields, net zero, correct balance chain/customer balance, correct FFM, and unchanged protected fingerprints. Any drift raises and performs no mutation.

### Q5. Complete recovery artifact

Before Production neutralization, generate and rehearse a complete guarded recovery transaction that:

1. locks and verifies the exact reversal and cancelled invoice;
2. deletes only that reversal;
3. restores the invoice’s captured preimage for `status`, `cancelled_at`, `cancellation_reason`, and `updated_at` exactly;
4. rebuilds only the affected client partition and balance;
5. verifies net +50 original state and the stored pre-neutralization expected state;
6. verifies protected fingerprints.

The Staging rehearsal sequence is: neutralize → verify → recover → verify exact preimage → restore/recreate clone → neutralize → run idempotent no-op. Production is not authorized until all steps pass.

---

## R. Ordered Execution Program and Hard Gates

Planned schema/backfill/derived-balance migrations are controlled Production migrations after Staging proof. Production **verification** remains read-only. The only existing business record whose status/financial event is deliberately changed is -213; effective-date and balance fields are structural/derived corrections.

| # | Stage | Environment/action | Exit gate | Rollback |
|---|---|---|---|---|
| 1 | Read-only preflight and evidence capture | Production catalogs/code/data; create Staging clone; capture permissions, ACLs, function/trigger definitions, row counts, sums, and protected preimages/hashes | Exact evidence matches this contract | none |
| 2 | Rollback artifacts | Store schema/function/ACL definitions and keyed data preimages in repository execution artifacts | Every later stage has a concrete inverse | none |
| 3 | Additive schema | Apply §E on Staging, test, then controlled Production migration | exact columns/constraints/indexes; legacy rows unchanged | reverse dependency order |
| 4 | Permissions | Insert three keys and exact bundle bindings | expected IDs/counts only | delete inserted bindings/keys only |
| 5 | Private helpers + idempotency | SHA-256, Riyadh date, lock/hash/private persistence helpers | no authenticated EXECUTE/access | drop new objects |
| 6 | Public RPCs and adapters | Deploy §G | signatures, grants, permission negatives, replay smoke pass | drop/restore functions |
| 7 | Trigger/guard changes | Laboratory branch, expense source/delete guards, forward-only item CHECK | function/trigger definition diff exact | restore prior definitions |
| 8 | Frontend writer migration | §H call sites, stable keys, error mapper | build + typecheck + unit tests | code revert |
| 9 | Direct-writer gate | static scan plus manual call-chain census | zero unapproved six-table DML | return to Stage 8 |
| 10 | Full Staging writer QA | atomicity, permissions, occurrence, domain adapters, expenses, HR, POS | all writer tests in §S pass | stage-specific |
| 11 | Effective-date backfill | Staging rehearsal, then controlled Production migration | exact census; zero null; checksums/hashes pass | restore keyed effective-date/metadata preimages |
| 12 | Balance rebuild | Staging then controlled Production | all §N reconciliation queries return zero rows | restore keyed balance preimages |
| 13 | Reader/projection flip | deploy statement/FFM/aging/export readers | totals unchanged; chronology correct; no double count | code/function restore |
| 14 | Full cross-module Staging QA | complete §S | every test passes | stage-specific |
| 15 | ACL revoke | Staging denial tests, then exact Production revoke | Production read-only privilege introspection matches | restore captured grants |
| 16 | Production read-only parity | row/sum/hash/reconciliation/runtime checks | no unexplained drift or `FIN_*` spike | halt |
| 17 | Observation and NOT NULL gate | minimum seven clean days after writer/reader/ACL rollout; then set expense ledger-status and ledger effective-date final constraints | clean logs, zero null twice, no bypass writer | drop NOT NULL/default change only |
| 18 | -213 Staging neutralization/recovery rehearsal | full §Q sequence | both forward, recovery, and re-run paths exact | recreate clone |
| 19 | -213 Production one-shot | guarded migration only | every transaction assertion passes | rehearsed row-level recovery |
| 20 | Final Production read-only closure | parity, anomaly register, ACL, balances, FFM, exports | AML.1.b.1 execution report complete | none |

No stage begins before the previous exit gate. Any failure rolls back only the affected stage, preserves the last passed checkpoint, reports the exact failure, and halts. No failed gate is waived.

---

## S. Mandatory Staging QA Matrix

Every test records setup, actor, permissions, request key, action, expected rows, expected UI, SQLSTATE/`FIN_*` code, and environment.

### S1. Invoice Core

1. Valid manual Create with three items → one header, three items, zero domain links; valid domain Create → one validated occurrence link; no partial rows.
2. One invalid item → zero header/items/link/ledger.
3. Failed Edit replacement → original header/items unchanged.
4. Own draft delete → header/items/links gone; no ledger.
5. Another actor’s draft delete → 42501.
6. Zero physical items → approval rejected.
7. Package children without parent → rejected.
8. One parent + N zero children → round-trips unchanged; parent alone contributes financially.
9. Zero-total invoice with real item → approves, no ledger.
10. Header/subtotal/tax/discount/total mismatch → rejected.
11. Valid approval → exactly one ledger row and correct balance.
12. Same approval key replay → original response, no new ledger.

### S2. Cancellation and Payment

13. Draft sent to `cancel_invoice` → `FIN_CANCEL_INVALID_STATE`; UI uses delete RPC instead.
14. Reviewed/issued void → retain header/items/links; set cancelled; no reversal when no invoice ledger exists.
15. Approved/shared/overdue cancel → one reversal on supplied business date; net zero.
16. Partial/paid cancel → blocked with `FIN_INVOICE_HAS_PAYMENTS`.
17. Cancelled replay → verified no-op/original response.
18. Payment uses required explicit date, creates one payment intent/ledger row, and derives partial/paid state.
19. No user-facing Mark Paid path can set paid without a payment record.

### S3. Idempotency and Concurrency

20. Same key/same actor/same hash after commit → stored response.
21. Same key/different hash → `FIN_IDEMPOTENCY_CONFLICT`.
22. Same key/different actor → `FIN_IDEMPOTENCY_ACTOR_MISMATCH`.
23. Concurrent same key → one commit, one replay/retry with same key.
24. Concurrent different keys/same domain occurrence → first commit, second business duplicate.
25. Expired manual key → new legitimate manual intent can create a new invoice.
26. Expired domain key → existing active occurrence still blocks duplication.
27. Mobile rapid double tap → one result.

### S4. Laboratory and Tenant Isolation

28. PHL-only linked Laboratory خيل succeeds for matching client.
29. Missing PHL/direct relationship → `FIN_LAB_HORSE_CLIENT_UNRELATED`.
30. Cross-tenant lab_horse/service/category/package → rejected.
31. Walk-in positive invoice → null-client ledger row, no customer balance, tenant revenue included, no client statement row.
32. Trigger error appears as exact safe localized message.
33. Same tests repeated with more than the Fani reference row to prove example-not-boundary.

### S5. Housing

34. Prior periods latest-first.
35. Exact duplicate, partial overlap, and nested range → 23P01 with conflicting invoice/range.
36. Adjacent next period → accepted.
37. Different non-boarding service in same month → accepted.
38. Over current month-end → backend rejection; UI cap/warning.
39. Over checked-out date → backend rejection; UI cap/warning.
40. Checked-out with null timestamp → inconsistent-admission rejection.
41. Expected departure exceeded → warning only.
42. 28/29/30/31 proration fixtures match current platform rounding.
43. Accrued and selected totals remain separate.
44. Cancelled-period rebill requires `corrects_invoice_id`.
45. `INV-MNDH8GPD` retains 37 items and one ledger row.

### S6. Other Domain Adapters

46. Doctor consultation positive and duplicate tests use `doctor_consultation`.
47. Vet treatment positive and duplicate tests.
48. Vaccination per-dose positive and duplicate tests.
49. Breeding attempt, pregnancy check, and foaling each have independent positive/duplicate/cross-tenant tests.
50. No adapter directly writes locked tables.

### S7. Expenses, HR, Supplier, POS

51. Creating pending expense creates no ledger.
52. Approve-and-post pending expense transitions and posts once.
53. Approved unposted expense posts once; replay does not duplicate.
54. Posted expense delete blocked; limited descriptive update allowed.
55. Non-HR reversal creates one reversal expense and one negative ledger row; second reversal blocked.
56. HR-sourced expense reversal blocked.
57. Salary `create_expense=false` creates salary row only.
58. Salary `create_expense=true` under `hr.manage` alone creates one salary, one posted expense, one ledger row, no duplicate on replay.
59. Supplier Payables existing behavior passes regression; zero `billing_links` supplier rows are created.
60. POS happy path is atomic across sale/session/inventory/invoice/payment/ledger/link/balance.
61. POS failure at any step leaves no partial sale.
62. Same POS request key replays; identical new cart with new sale intent is accepted.

### S8. Dates, Statement, and Balances

63. Backdated invoice ledger date equals issue date.
64. Historical payments use Riyadh posting date; new payments use explicit input date.
65. Expense uses expense date; salary uses Riyadh paid-at date; manual adjustment uses explicit date.
66. Ordinary cancellation uses cancellation date; -213 exception uses 2017-02-20 only.
67. Statement, PDF, Print, and both CSV modes agree.
68. Detail rows have blank financial columns; parent totals equal ledger.
69. Running balance row-by-row cumulative equality; monotonicity is not asserted.
70. Final balance, customer balance, and balance view equal ledger sum.
71. FFM preserves existing exclusions and uses effective date.
72. Aging buckets still follow due date.

### S9. Security, Legacy, and UX

73. Missing permission for every public RPC → 42501.
74. Direct authenticated/anon DML on each locked table fails after revoke in Staging.
75. Authenticated cannot read idempotency rows.
76. Public share/read RPCs continue; anon direct financial table access is denied.
77. Service-role cron behavior remains functional.
78. `INV-MMO9AAXD`, -396, -951, -717, -740, Suni item, and all non-target protected hashes remain correct.
79. -213 rehearsal: forward, recovery, re-forward, and no-op paths all pass.
80. Arabic RTL and terminology use generic «الخيل» unless specific stored classification is known.

---

## T. Production Read-Only Verification Matrix

Except for controlled migrations and the Stage-19 -213 transaction, Production verification is read-only.

1. `has_table_privilege` for authenticated/anon INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on all six tables is false.
2. `pg_class.relacl`, `pg_policies`, role grants, and `pg_proc.proacl` match the approved contract.
3. Public RPCs: PUBLIC/anon EXECUTE false, authenticated true; private helpers authenticated false.
4. Idempotency table: authenticated/anon SELECT and DML false.
5. Effective-date null count zero; expense ledger-status null count zero after final constraint stage.
6. Ledger row counts and amount sums unchanged by date backfill.
7. Customer-balance reconciliations return zero discrepancies.
8. Reader parity matches Staging and pre-migration financial totals.
9. Protected hashes show only allowed field changes; `INV-MMO9AAXD` remains paid/zero items/zero ledger/one existing link.
10. `INV-MNDH8GPD` remains 37 items/one ledger/effective date 2026-03-30.
11. After Stage 19, -213 is cancelled, has exactly one -50 reversal dated 2017-02-20, net effect zero, correct balance chain, and expected FFM.
12. No new Production invoices, payments, expenses, clients, or Housing periods are created merely for verification.

---

## U. Exact Rollback Classes

### U1. Class A — schema/code/function/permission

Reverse in dependency order:

1. restore frontend readers/writers;
2. restore ACL grants before restoring client writers;
3. restore prior triggers/functions and grants;
4. remove only migration-added permission bindings/definitions;
5. drop constraints/indexes/columns/tables only after dependants are removed.

Never drop `effective_date` while deployed readers require it.

### U2. Class B — derived data/backfill

Restore only keyed preimages captured in Stage 1/2:

- each affected ledger row’s `effective_date`, `balance_after`, and metadata;
- each affected `customer_balances` row;
- exact pre-migration ACLs.

Do not restore an entire mutable table over concurrent unrelated rows.

### U3. Class C — -213

Run the rehearsed guarded recovery from §Q5. It deletes only the exact reversal, restores only -213’s exact preimage, rebuilds only its client partition, and rechecks protected hashes/FFM.

---

## V. Explicitly Deferred Workstreams

1. Demo Data Purge/Reset.
2. Duplicate account/client/user identity audit and safe merge.
3. HR salary reversal semantics.
4. Supplier settlement allocation redesign.
5. Package `parent_item_id` redesign.
6. Multi-currency ledger.
7. Documentation 10 platform SaaS/subscription billing.
8. AML.2 and all later roadmap items.

These are not hidden blockers and must not be folded into AML.1.b.1.

---

## W. Prohibited Deviations and Required Planning-Mode Response

Lovable must not:

- execute before approval;
- reopen already-closed investigation;
- omit a platform module because the screenshots used Laboratory or Housing examples;
- use «حصان» as the generic Arabic term;
- use plural Finance permission namespaces;
- add fewer or more than the three named permission keys;
- grant new keys broadly by create/edit inference;
- create Supplier Payable billing links or a supplier-link RPC;
- rely on `payment_intents.paid_at` or add a payment date column in this slice;
- skip Expense CRUD migration before ACL revoke;
- expose idempotency rows to authenticated users;
- skip walk-in revenue ledger posting;
- collapse Housing’s 37 real financial items into one invoice item;
- use Housing period labels as ledger events;
- replace due-date aging with effective-date aging;
- add a false-paid override;
- use MD5, bare `created_at::date`, timestamp protection windows, or guessed historical dates;
- add `parent_item_id`, `tenants.timezone`, `billing_links` period columns, or a fabricated source-type CHECK;
- run a mutation-based Production verification test;
- modify any protected Demo record outside the exact allowed changes;
- create an anomaly badge/repair for `INV-MMO9AAXD`;
- skip a failed gate, QA family, observation gate, or rollback rehearsal;
- expand into a deferred workstream.

### Required Lovable Planning Mode output

The response must be titled:

```text
AML.1.b.1.PLAN-LOCK.FINAL — Implementation Commitment (No Execution Yet)
```

It must:

1. State that no implementation occurred.
2. State that this file supersedes Markdown 32–34.
3. Reproduce the chronology/contradiction closures in §B.
4. Reproduce the exact scope, schema, permissions, RPC/adapters, idempotency, Laboratory, Housing, dates, expenses/HR/POS, ACL, anomaly, -213, stages, rollback, and QA contracts without substituting architecture.
5. Mark every section **ACCEPTED WITHOUT DEVIATION**.
6. List zero remaining product decisions and zero investigative blockers.
7. Explicitly state that Supplier Payables are regression-only and that `link_supplier_payable_to_invoice` is absent.
8. Explicitly state that `payment_intents` has no business-date column and new payment date is an RPC parameter.
9. Explicitly state that Expense Create/Update/Delete are migrated before revoke.
10. Explicitly state that walk-in positive revenue posts a null-client ledger row but no customer balance.
11. Explicitly state that Housing 37-item invoices remain 37 items while the Statement moves balance once.
12. End with:

```text
AML.1.b.1.PLAN-LOCK.FINAL: READY FOR USER APPROVAL — NO IMPLEMENTATION HAS OCCURRED.
```

After the user reviews that Planning Mode response and presses **Approve**, execute only this contract, in the stated order, stopping at every hard gate. No additional execution prompt is required and no architectural reinterpretation is permitted.

**Remaining product decisions: none. Remaining investigative blockers: none.**

**AML.1.b.1.PLAN-LOCK.FINAL: READY FOR USER APPROVAL — NO IMPLEMENTATION HAS OCCURRED.**

================================================================
POST-PLAN-LOCK USER AUTHORITY ADDENDUM
Appended by scoped restoration build turn.
Source PLAN-LOCK body above is preserved byte-for-byte
(SHA-256 8d2b1cc1927d231e18237cb79132f1b703c96c91dabad111883a144d56f7dae8).
This addendum records approved user authority U-1, U-2, U-3
plus Batch D.2 identity confirmation and retained
unavailable-artifact identifiers. It does not alter the body.
================================================================

## U-1  Six canonical adapter identities

The canonical adapter identities are exactly:

- create_invoice_from_admission
- create_lab_invoice
- create_doctor_invoice
- create_vet_invoice
- create_vaccination_invoice
- create_breeding_invoice

These identities supersede non-canonical occurrences such as:

- housing_generate_invoice
- laboratory_generate_invoice
- doctor_generate_invoice
- vet_generate_invoice
- vaccination_generate_invoice
- breeding_generate_invoice

The existing non-canonical occurrences remain specification nonconformities pending D.4 mechanical correction.

U-1 does not authorize inventing or finalizing the adapters' ordered argument lists.

## U-2  Twelve canonical payload-contract identities

The twelve canonical physical payload/argument-contract identities are exactly:

1. create_invoice_with_items
2. update_invoice_with_items
3. approve_invoice
4. cancel_invoice
5. post_payment
6. create_expense
7. update_expense
8. post_expense_with_ledger
9. reverse_expense
10. post_manual_ledger_adjustment
11. pos_finalize_sale
12. record_salary_payment

U-2 locks identity and physical-table completeness only.

Each identity must eventually have its own complete physical field-by-field contract table. "Same schema as", shared-schema shortcuts, inherited prose, or a combined table do not satisfy the twelve-table requirement.

U-2 does not authorize changing current signatures or inventing unproven adapter arguments.

## U-3  Invoice-number helper and Saudi business-date policy

The canonical helper identity is exactly:

_finance_invoice_number_next(uuid, text)

Its conceptual arguments are:

- tenant identity;
- invoice-number domain.

No third date argument is permitted.

The numbering period must be derived internally from the current server-authoritative Saudi business date in Asia/Riyadh.

Mandatory policy:

- capture the current Asia/Riyadh business date once per allocation transaction;
- derive YYYYMM from that captured current Saudi business date;
- do not derive the numbering month from invoices.issue_date;
- do not accept a numbering date from any caller;
- do not use browser or device date generation;
- do not use Date.now() for the authoritative number;
- do not use runtime MAX(invoice_number) or COUNT(invoice_number) scans;
- use concurrency-safe counter allocation;
- preserve separation between tenant/domain prefix configuration and counter storage;
- counter storage must not become prefix authority;
- preserve all existing invoice numbers unchanged;
- retain invoices.issue_date as the invoice-ledger effective date;
- a backdated invoice must not allocate from a historical numbering month merely because its issue_date is historical.

U-3 resolves the business decision. Any surviving three-argument helper, caller-supplied numbering date, issue-date-derived YYYYMM, or client-side number generation is a specification/code nonconformity pending its globally owned correction stage. It must not be classified as an unresolved product-policy decision.

## Ordered adapter arguments

ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED

The addendum must state explicitly:

ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED

Do not copy proposed ordered signatures from later candidate reports into governing authority.

Do not accept or invent:

- p_invoice_number;
- a generic p_extra jsonb;
- caller-supplied final totals;
- caller-supplied server-resolvable tenant, actor, client, horse, price, tax, status, branch, ownership, or billing-link identity;
- any ordered adapter argument not proven by current repository schema, code, callers, and source-domain relationships.

The exact six ordered signatures remain reserved for D.3R evidence-backed analysis.

## Batch D.2 identity confirmation

Yes. The prior report whose content is titled:

"Stage 6 final four-blocker resolution — read-only investigation and spec update"

and whose final manifest is titled:

"AML.1.b.1 Stage 6 Four-Blocker Resolution Pass"

is confirmed as the canonical Batch D.2 source report/turn.

Its supplied transcript SHA-256 is:

064ab352b57875bf98cdbce66110ed1d6d6c673b63b58a098300212a7d5d24cd

Its internally reported execution-spec transition was:

- preimage: 1,592 lines / 82,800 bytes /
  947e111cf4e628664fb5586343d4f43be390028119d1311abad47f666f28884d
- postimage: 1,699 lines / 97,822 bytes /
  f297d685434fcc3b0c471af8106df395126ecb8be5f5c6d60c70b6223de89c10

This confirmation establishes Batch D.2 historical identity and decisions only.

It does not prove that the later Stage 6 candidate of 2,835 lines / 150,434 bytes / SHA beginning 4b45fe4b is identical to the D.2 postimage, nor does it replace direct D.3R verification of that later candidate.

If the original D.2 report is restored in a later separately authorized turn, preserve the transcript and its manifest without reconstructing a different closure artifact.

## Retained unavailable artifacts

- STAGE_3_CLOSURE_ARTIFACT_UNAVAILABLE
- STAGE_4_CLOSURE_ARTIFACT_UNAVAILABLE
- BATCH_D2_IDENTITY_CONFIRMED_EXTERNAL_SOURCE_NOT_YET_RESTORED
  (reclassified from BATCH_D2_ARTIFACT_UNVERIFIED per §7)

Do not reconstruct either historical execution closure from PLAN-LOCK or from later assertions.

================================================================
END POST-PLAN-LOCK USER AUTHORITY ADDENDUM
================================================================

================================================================
POST-PLAN-LOCK USER AUTHORITY ADDENDUM — D.4
Appended by AML.1.b.1 Stage 6 D.4 Authority Adoption and
Specification Correction execution turn.
Source: direct user execution order (D.4 prompt).
This addendum records U-4A (canonical ordered adapter signatures),
U-4B (Stage 6 boundary), strict p_caller_intent authority, prohibited
caller fields, exact source semantics, and retirement of the two
D.3R gap identifiers listed below. U-1, U-2, and U-3 remain closed
and unchanged.
================================================================

## U-4A  Canonical ordered adapter signatures

Adopted by direct user authority in the D.4 execution order.

The six canonical Finance domain adapters share the identical four-argument
ordered signature and identical PostgreSQL types. No overload with a different
argument order or additional public arguments is authorized.

```text
create_invoice_from_admission(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)

create_lab_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)

create_doctor_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)

create_vet_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)

create_vaccination_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)

create_breeding_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,
  p_caller_intent   jsonb
)
```

### Binding argument semantics

- `p_tenant_id` — explicit tenant-scope assertion. Server must verify against
  `auth.uid()`, active tenant membership, the locked source record, domain
  ownership, and all applicable Finance permissions. A valid source UUID from
  another tenant must be rejected without leaking its existence.
- `p_idempotency_key` — caller-generated UUIDv4 Level-I financial idempotency
  key. Implementation contract must guarantee adapter-specific operation
  identity, tenant-scoped idempotency, canonical request hashing, replay of
  the stored response on same-key/same-hash, rejection on same-key/different-
  hash, and protection against duplicate clicks, retries, reconnects, and
  concurrent requests. No duplicate invoice header, items, billing links, or
  ledger effects may be produced.
- `p_source_id` — canonical source-record identity per adapter:
  - `create_invoice_from_admission` → boarding admission.
  - `create_lab_invoice` → the laboratory request / submission source used by
    the current live workflow.
  - `create_doctor_invoice` → doctor consultation.
  - `create_vet_invoice` → vet treatment.
  - `create_vaccination_invoice` → horse vaccination record.
  - `create_breeding_invoice` → live supported breeding source record,
    disambiguated by the strict `source_type` intent field.
  The source row must be locked and re-read server-side before any financial
  values are resolved.
- `p_caller_intent` — strict per-adapter contract (see D.4 §6). Not generic
  metadata; never behaves like `p_extra`. Unknown keys are rejected. Missing
  required keys are rejected. Every value is validated against an explicit
  PostgreSQL type. JSON arrays or unexpected nested objects are rejected. The
  canonical representation of the intent is included in the idempotency
  request hash. Required and optional keys are documented independently per
  adapter. "Same as another adapter" is never used as a contract shortcut.

### Prohibited caller fields (all six adapters)

The following must never be accepted as public adapter arguments or
caller-intent keys: invoice number; invoice-number period/date; invoice
status; client identity; horse identity; branch identity; service/catalog
identity; billing-link identity; billing-link tenant; quantity; unit price;
taxability; tax rate; currency; subtotal; discount amount; tax amount; total
amount; provider identity when resolvable from the source; ownership
identity; arbitrary metadata; generic JSON extensions; `p_extra`; browser-
calculated financial values. All such values are resolved or validated from
locked server-side source records, pricing snapshots, catalog records,
contracts, tenant configuration, or Finance policy.

### Retirements produced by U-4A

- `ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED` — retired by direct user
  authority. Not reconstructed from historical evidence.
- `ADAPTER_CANONICAL_NAME_NONCONFORMITY` — retired against the six canonical
  identities above; all normative occurrences of the seven non-canonical /
  obsolete adapter identities (`housing_generate_invoice`,
  `laboratory_generate_invoice`, `doctor_generate_invoice`,
  `vet_generate_invoice`, `vaccination_generate_invoice`,
  `breeding_generate_invoice`, `create_housing_invoice`) are replaced in the
  Stage 6 specification.

## U-4B  Stage 6 boundary authority

Stage 6 is authorized to cover exactly, and only:

1. The fourteen canonical public Finance RPCs already enumerated by this
   PLAN_LOCK.
2. The six canonical adapters adopted by U-4A above.
3. Their required private helpers.
4. `_finance_invoice_number_next(uuid, text)` — the sole authorized helper
   signature (see U-3 confirmation below).
5. Level-I financial idempotency.
6. Required function ownership, hardened `search_path`, `REVOKE`, and `GRANT`
   contracts.
7. Canonical payload-contract documentation (twelve U-2 physical tables plus
   the six strict adapter caller-intent contracts, tracked separately).
8. Required migration ordering M1–M7.
9. Application caller adaptation and generated-type updates required to
   invoke these canonical contracts.
10. Deterministic verification and rollback instructions for those changes.

Stage 6 is NOT authorized to reconstruct Stage 3 or Stage 4 closure files;
perform historical financial-data cleanup; cancel or adjust known orphan
invoices; import historical customer finance data; execute later AML stages;
redesign unrelated Finance UI; redesign unrelated domain workflows; or
reopen U-1, U-2, U-3, or this U-4 authority.

### Retirement produced by U-4B

- `STAGE_BOUNDARY_EXCLUSIONS_UNPROVEN_PENDING_STAGE3_STAGE4_ARTIFACTS` —
  retired by direct user authority.

Stage 3 and Stage 4 artifact-availability markers remain evidence
limitations, but they no longer block the Stage 6 boundary.

## U-1 / U-2 / U-3 confirmation (not reopened by D.4)

- U-1 (six canonical adapter identities): closed. Unchanged. Now paired with
  the U-4A ordered signatures.
- U-2 (twelve canonical payload-contract identities): closed. Unchanged. The
  Stage 6 spec now physically renders all twelve as independent tables with
  the required metadata columns. Adapter caller-intent contracts are tracked
  separately from the twelve U-2 tables.
- U-3 (invoice-number helper and Saudi business-date policy): closed.
  Unchanged. The sole authorized helper signature is
  `_finance_invoice_number_next(uuid, text)`. The numbering period is
  derived internally from one transaction-captured Saudi business date
  `(now() AT TIME ZONE 'Asia/Riyadh')::date`. The same captured value
  governs the whole transaction. `invoices.issue_date`, `p_effective_date`,
  browser dates, device dates, `p_caller_intent.issue_date`, and any other
  caller-supplied date are prohibited as numbering-period sources.
  `invoices.issue_date` remains the invoice and ledger effective date and is
  independent from the invoice-number period.

## Retained evidence limitations (unchanged by D.4)

- `STAGE_3_CLOSURE_ARTIFACT_UNAVAILABLE`
- `STAGE_4_CLOSURE_ARTIFACT_UNAVAILABLE`
- `BATCH_D2_IDENTITY_CONFIRMED_EXTERNAL_SOURCE_NOT_YET_RESTORED`
- `STAGE6_SPEC_FULL_PREIMAGE_HASH_REFERENCE_UNAVAILABLE`

These are preserved as evidence limitations and are not presented as
blockers to the U-4A / U-4B adoption, the D.4 specification correction, or
Stage 6 execution readiness.

================================================================
END POST-PLAN-LOCK USER AUTHORITY ADDENDUM — D.4
================================================================
