```
# AML.1.b.1.PLAN-LOCK.FINAL — Implementation Commitment (No Execution Yet)

This document adopts the uploaded `AML.1.b.1-PLAN-LOCK-FINAL-CORRECTED.md` (1088 lines) as the authoritative executable contract, supersedes Markdowns 32/33/34, and restates its locked implementation commitment in the same A–W structure. Where this commitment uses a compact cross-reference such as “exactly as uploaded,” the corresponding exact schema, signature, test, gate, or rollback text in the 1088-line authoritative contract remains mandatory and controls; a summary is never permission to omit, generalize, substitute, or improvise.

## A. Non-Execution Declaration and Evidence Precedence

No code, migration, RPC, permission, trigger, table, row, or Demo record has been changed while producing this response. This turn only read the uploaded contract and re-verified current catalog shape (`billing_links`, `ledger_entries`, `bundle_permissions/permission_bundles`, `party_horse_links.relationship_type` = `{lab_customer}`, `billing_links.source_type` in-use = `{breeding_attempt, pregnancy_check, vet_treatment, vaccination, boarding}`). Evidence precedence: (1) current DB/catalog+code, (2) user-confirmed locks and screenshots, (3) MD 20–24 then 27–30, (4) MD 31 only where not retracted, (5) MD 32–34 replaced by this file. On post-approval drift I will halt before the affected mutation, preserve the last passed checkpoint, and report the exact object — never improvise a substitute.

## B. Baseline Accepted and Mechanical Corrections Applied

The Chronological Decision Ledger is accepted exactly:

| Source | Accepted contribution | Final treatment |
|---|---|---|
| Markdown 20 | Proved non-atomic invoice Create/Edit, missing effective date, approval weakness, and -213 test-invoice boundary | Preserved platform-wide |
| Markdown 21 | Separated owner/host/requester/bill-to; established UI selector versus Laboratory trigger mismatch; preserved package payload | Preserved |
| Markdown 22 | Closed Laboratory relationship rule, payment-versus-invoice date semantics, RPC hardening, package compatibility, and SQLSTATE propagation | Preserved with later mechanical corrections |
| Markdown 23 | Expanded writer/reader map, ACL sequencing, financial-item predicate, statement projection, and balance rebuild | Preserved |
| Markdown 24 | Proved Operational Finance is platform-wide and independent from SaaS/subscription billing | Preserved; Documentation 10 SaaS billing out of scope |
| Markdown 27 | Proved Supplier Payables do not write `billing_links`; added Expense CRUD RPC requirement; confirmed three missing permission keys | Canonical |
| Markdown 28 | Locked exact occurrence sources: `lab_request`, `doctor_consultation`, `vet_treatment`, `vaccination`, `breeding_attempt`, `pregnancy_check`, `foaling`, `pos_sale`; added correction lineage and exact cancellation states | Canonical |
| Markdown 29 | Proved `payment_intents` has no payment business-date column; locked explicit payment-date RPC input; locked dual-axis expense lifecycle and HR salary contract | Canonical |
| Markdown 30 | Locked Demo-wide scope, singular permission namespace, Riyadh date conversion, protected anomaly handling, and Production verification policy | Canonical where consistent with current catalog |
| Markdown 31 | Consolidated the history but reintroduced several retracted claims | Used only after applying the corrections below |
| Markdown 32–34 | Draft PLAN-LOCK | Replaced by this complete corrected commitment plus the authoritative 1088-line contract |

All 17 closed contradictions are enforced: singular `finance.invoice.*` namespace; exactly three new keys `finance.invoice.approve`, `finance.invoice.cancel`, `finance.adjustment.create`; NO `link_supplier_payable_to_invoice` (supplier payables do not touch `billing_links`); NO changes to a nonexistent `billing_links.source_type` CHECK or period columns; Laboratory occurrence = `lab_requests.id` only (retests = new request); Doctor source_type = `doctor_consultation`; Breeding = exactly `breeding_attempt|pregnancy_check|foaling`; `payment_intents` receives explicit `p_payment_date`, no `paid_at`/`payment_date`/`captured_at` column; Expense CRUD migrates behind RPCs before revoke; `finance_request_idempotency` is RPC-internal (no authenticated grants); positive walk-in NULL-client invoice DOES post a ledger row (skipping only `customer_balances`); `INV-MNDH8GPD` keeps 37 real financial monthly items (never collapsed); Housing range violations are rejected server-side (UI may cap only); reviewed/issued cancellation retains header/items and posts no reversal when no ledger exists; approved/shared/overdue posts one reversal; partial/paid remains blocked; FFM keeps existing inclusion/exclusion and changes only date source; aging keeps `due_date`; package parent/child predicate is unchanged (no `parent_item_id`).

## C. Locked Product, Scope, Terminology, Independence

- All current rows are Demo; not authorization for silent deletes/merges.
- Fani/TACO/AL-Qimah/screenshots are examples, never scope boundaries.
- Generic Arabic term is **«الخيل»**; specific terms only when stored classification supports them; identifiers unchanged.
- Operational Finance scope = Manual invoices, Housing, Laboratory, Doctor, Vet, Vaccination, Breeding/Reproduction, POS, Expenses, HR salary-linked expenses, Payments, Cancellations, Manual Ledger Adjustments, Statements, PDF/Print/CSV, FFM, Aging, Customer Balances.
- Documentation 10 SaaS/subscription billing = **out of scope**.
- Finance-Core owns transactionality/authorization/tenant+client validation/totals/approval/cancellation/payment/ledger posting/balances/effective date/idempotency/audit; Domains own eligibility/pricing/source identity/items and may only call private helpers.
- Housing product locks: previously-invoiced periods latest-first; accrued-through-today vs selected-range remain separate; range max = current Riyadh calendar month-end; `checked_out_at` additional hard cap; `expected_departure` warning-only; `updated_at` never checkout evidence.
- `الم-202607-213` is the only existing invoice whose business status is deliberately changed (one-time neutralization).
- `INV-MMO9AAXD` is a frozen Known Legacy Demo Anomaly (no items/ledger/badge/repair).
- Similar-name tenants/clients/users are never merged; UUID identity is authoritative.

## D. Locked Main Defects and Required Outcomes — Command Compliance Matrix

| Defect | Current failure | Required outcome | Commitment |
|---|---|---|---|
| Non-atomic Create | Header commits before item loop | Header and items commit/rollback together; validated domain adapter owns exactly one occurrence link | **ACCEPTED WITHOUT DEVIATION** |
| Destructive Edit | Old items deleted before replacements finish | Entire edit rolls back; old state survives failure | **ACCEPTED WITHOUT DEVIATION** |
| Weak Approval | Header total approves without physical/financial items | Server validates items, package structure, subtotal, tax, discount, total | **ACCEPTED WITHOUT DEVIATION** |
| Non-atomic Approval | Status and ledger are separate client operations | One transaction owns status, ledger, balance | **ACCEPTED WITHOUT DEVIATION** |
| Missing financial date | `created_at` used as business date | Mandatory reader-authoritative `ledger_entries.effective_date` | **ACCEPTED WITHOUT DEVIATION** |
| Laboratory selector/trigger mismatch | Selector uses PHL; trigger checks only `lab_horses.client_id` | Trigger accepts direct client or same-tenant `party_horse_links/lab_customer` | **ACCEPTED WITHOUT DEVIATION** |
| Hidden errors | Specific DB validation becomes generic toast | Known SQLSTATE/`FIN_*` becomes safe localized AR/EN message | **ACCEPTED WITHOUT DEVIATION** |
| Direct DML | Authenticated client sequences six financial tables | All writers migrate to RPCs before exact ACL revoke | **ACCEPTED WITHOUT DEVIATION** |
| Missing business-occurrence control | Different request keys can bill same source twice | Source lock + in-tx active-occurrence check | **ACCEPTED WITHOUT DEVIATION** |
| Housing order/range | Undefined order and legacy invalid range | Latest-first UI, backend range validation, forward-only CHECK | **ACCEPTED WITHOUT DEVIATION** |
| Statement double count | Domain details may look financial | One ledger parent changes balance; details have blank Debit/Credit/Balance | **ACCEPTED WITHOUT DEVIATION** |
| Expense/HR/POS sequencing | Multi-table client writes can partially commit | Domain-complete atomic RPCs | **ACCEPTED WITHOUT DEVIATION** |
| Legacy -213 debit | Invalid approved test debit remains | Guarded cancellation + compensating reversal + rehearsed exact recovery | **ACCEPTED WITHOUT DEVIATION** |

## E. Exact Additive Schema Contract — ACCEPTED WITHOUT DEVIATION

Every migration is deterministically named, asserts prior definition, aborts on incompatible schema, and uses `IF NOT EXISTS` only when the existing definition matches expectation.

**E1 `ledger_entries`**: `ADD COLUMN effective_date date NULL` (no default); add index `(tenant_id, client_id, effective_date, created_at, id)`; add partial UNIQUE INDEX on `reference_id WHERE entry_type='adjustment' AND reference_type='invoice_cancellation'`; `created_at` unchanged; `metadata` not re-added; NOT NULL comes only at Stage 17.

**E2 `invoices`**: `ADD COLUMN corrects_invoice_id uuid NULL REFERENCES public.invoices(id)`.

**E3 `invoice_items`**: `ADD CONSTRAINT invoice_items_period_valid_ck CHECK ((period_start IS NULL AND period_end IS NULL) OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)) NOT VALID` — never validated during AML.1.b.1.

**E4 `expenses`**: add nullable first: `ledger_status text NULL`, `posted_at timestamptz NULL`, `ledger_entry_id uuid NULL REFERENCES public.ledger_entries(id)`, `source_type text NULL`, `source_reference uuid NULL`, and `reverses_expense_id uuid NULL REFERENCES public.expenses(id)`. Add: the both-null-or-both-non-null source-pair CHECK; the transition-safe ledger-status CHECK allowing only `NULL|'unposted'|'posted'|'reversed'`; one-ledger-row-per-expense enforcement for `reference_type='expense'`; unique `(tenant_id, source_type, source_reference)` where `source_type IS NOT NULL`; unique non-null `reverses_expense_id`; and the posted/reversed ordinary-delete guard. Existing standalone expenses keep both source fields NULL. **The only non-null expense source introduced in AML.1.b.1 is `hr_salary_payment`, validated against same-tenant `hr_salary_payments.id`; do not invent `manual`, `boarding`, `vet_treatment`, or `supplier_payable` expense sources.** After writer migration, backfill existing expense rows to `ledger_status='unposted'` without changing workflow status, set default `'unposted'`, and set NOT NULL only at the final Stage-17 gate.

**E5 `pos_sales` (new)**: `(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), session_id uuid NOT NULL REFERENCES public.pos_sessions(id), sale_number integer NOT NULL, cart_hash text NOT NULL, subtotal numeric(12,2) NOT NULL, tax_amount numeric(12,2) NOT NULL DEFAULT 0, total_amount numeric(12,2) NOT NULL, currency text NOT NULL, invoice_id uuid NULL REFERENCES public.invoices(id), created_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id, session_id, sale_number))`. `cart_hash` is audit-only and **must not be unique**: two legitimate sales may contain identical carts. Double-submit protection comes from the idempotency key; the source occurrence is the new `pos_sales.id`. RLS ENABLED; no authenticated/anon DML. Tenant-scoped authenticated SELECT is granted only if an existing POS reader requires it; otherwise the table remains RPC-internal. `service_role`/controlled owner retains required access.

**E6 `finance_request_idempotency` (new)**: `(tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, operation text NOT NULL, idempotency_key uuid NOT NULL, actor_id uuid NOT NULL, request_hash bytea NOT NULL, resolved_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, response jsonb NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', PRIMARY KEY (tenant_id, operation, idempotency_key))`. Add index on `expires_at`. Enable RLS and revoke SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from `authenticated`, `anon`, and PUBLIC. **Only the controlled function owner and service-role maintenance may access it.**

**E7 Explicit non-changes / pgcrypto**: assert/reuse SHA-256 support from `pgcrypto`; `CREATE EXTENSION IF NOT EXISTS pgcrypto` is allowed only if absent. Do not add a business-date column to `payment_intents`; do not add `parent_item_id` to `invoice_items`; do not add period/currency columns or fabricate/replace a nonexistent `source_type` CHECK on `billing_links`; do not add `tenants.timezone`; and do not invent a `pos_sale`/`foaling` CHECK. Exact source-type validation remains inside the relevant RPC/adapter.

## F. Exact Permission Additions and Bindings — ACCEPTED WITHOUT DEVIATION

Insert exactly three keys into `public.permission_definitions (key, module, display_name, description, is_owner_only)`:
- `finance.invoice.approve`
- `finance.invoice.cancel`
- `finance.adjustment.create`

Binding uses `bundle_permissions (bundle_id, permission_key)` (no `tenant_id`; tenant scope comes from `permission_bundles.tenant_id`; PK `(bundle_id, permission_key)`). Bind the three new keys **only** to the exact current owner/manager Finance preset represented by bundle name `كبير المشرفين`, scoped per tenant. Stage 1 captures the exact bundle IDs and expected count; the migration aborts if that name-to-ID set drifts. **Do not infer entitlement from “has both create + edit,” from either individual permission, or from a custom role, and do not grant custom roles automatically.** Rollback deletes only the three binding rows and permission rows inserted by this migration, using the captured bundle IDs; it must not delete future/manual bindings added after rollout. RPC mapping: create→`finance.invoice.create`; edit→`finance.invoice.edit`; delete own draft→`finance.invoice.delete` + created_by + draft; approve→`finance.invoice.approve`; cancel→`finance.invoice.cancel`; payment→`finance.payment.create`; adjustment→`finance.adjustment.create`; expense post→`finance.expenses.approve`; expense reverse→`finance.expenses.manage`; expense CRUD→`finance.expenses.create/manage`; POS finalize→`pos.sale.create`; salary payment→`hr.manage`. Every public RPC calls `has_permission(auth.uid(), _tenant_id, '<exact-key>')` explicitly. Domain adapters additionally require `finance.invoice.create` plus their current exact domain authority (`housing.manage`, Laboratory tenant capability, `doctor.consultations.write`, `vet.manage`, or `breeding.manage`).

## G. Exact RPC and Domain-Adapter Inventory — ACCEPTED WITHOUT DEVIATION

**Finance-Core public RPCs** (all `SECURITY DEFINER`, `SET search_path=''`, controlled function owner, EXECUTE revoked from PUBLIC/anon and granted only to authenticated) use these exact signatures/responsibilities:

| RPC | Locked signature / responsibility |
|---|---|
| `create_invoice_with_items` | `(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` — atomic manual header+items; no domain billing link |
| `update_invoice_with_items` | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_payload jsonb)` — draft-only atomic replacement; old state survives failure |
| `delete_draft_invoice` | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid)` — own draft only; no ledger |
| `approve_invoice` | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid)` — locked validation+ledger+balance+status |
| `cancel_invoice` | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date, p_reason text)` — exact state machine |
| `post_payment` | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_amount numeric, p_payment_date date, p_payment_method text, p_account_id uuid, p_payload jsonb)` — payment+ledger+balance+derived status |
| `create_expense` | `(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` — unposted workflow row |
| `update_expense` | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_payload jsonb)` — state-aware fields |
| `delete_expense` | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid)` — unposted only |
| `post_expense_with_ledger` | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid)` — approve/post atomically |
| `reverse_expense` | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_reason text, p_reversal_date date)` — Model-B reversal; HR source blocked |
| `post_manual_ledger_adjustment` | `(p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid, p_amount numeric, p_effective_date date, p_description text)` |
| `pos_finalize_sale` | `(p_tenant_id uuid, p_idempotency_key uuid, p_session_id uuid, p_payload jsonb)` — complete atomic POS sale |
| `record_salary_payment` | `(p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid, p_amount numeric, p_currency text, p_paid_at timestamptz, p_payment_period text, p_notes text, p_create_expense boolean)` |

No `link_supplier_payable_to_invoice`. `postLedgerForInvoice.ts` becomes obsolete.

**Domain adapters** (thin, call private Finance-Core persistence helpers, never write six locked tables directly):

| Adapter | Source lock | Occurrence |
|---|---|---|
| `create_invoice_from_admission` | `boarding_admissions.id` | `boarding` + admission UUID + item period overlap |
| `create_lab_invoice` | `lab_requests.id` | `lab_request` + request UUID |
| `create_doctor_invoice` | `doctor_consultations.id` | `doctor_consultation` + UUID |
| `create_vet_invoice` | `vet_treatments.id` | `vet_treatment` + UUID |
| `create_vaccination_invoice` | `horse_vaccinations.id` | `vaccination` + UUID |
| `create_breeding_invoice` | one exact row from `breeding_attempts|pregnancy_checks|foalings` | matching source_type + row UUID |

Every receivables adapter uses `link_kind='final'`; manual invoice rejects source-link fields; draft edits may not change existing domain source identity (adapter revalidates).

**Approval invariants (G3)**: allowed from draft/reviewed/issued; ≥1 physical item (even zero-total); financial-item predicate = manual (`package_id IS NULL`) / package parent (`package_id NOT NULL AND package_price_snapshot NOT NULL`) / package child (`package_id NOT NULL AND package_price_snapshot NULL AND total_price=0`); ≥1 financial item; every package child grouped to matching parent; backend recomputes qty×price, subtotal, tax, discount, total per platform rounding; discount ≤ subtotal; `ABS(header.subtotal - financial_item_sum) < 0.01` and exact rounded parity for total; zero-total valid invoices approve without ledger; positive-total always posts one invoice ledger row (null client allowed, skips customer_balances only); existing invoice-ledger idempotency uniqueness enforced.

**Cancellation state machine (G4)**:
- `draft` → `delete_draft_invoice` only (RPC `cancel_invoice` on draft → `FIN_CANCEL_INVALID_STATE`).
- `reviewed|issued` → void via `cancel_invoice`, must have zero invoice ledger rows (else abort as anomaly), no reversal; retain header/items/links; set cancelled + audit.
- `approved|shared|overdue` → cancel via `cancel_invoice`, require exactly one canonical invoice ledger row, insert one opposite reversal using actual ledger amount on required cancellation business date.
- `partial|paid` → blocked (`FIN_INVOICE_HAS_PAYMENTS`).
- `cancelled` → verified idempotent no-op.
- -213 exception isolated in §Q, not via public RPC.

## H. Exact Frontend Writer / Reader Migration Map — ACCEPTED WITHOUT DEVIATION

**H1 Writers** (all migrate before ACL revoke):

| Surface | Current | Final |
|---|---|---|
| Invoice Create/Edit | `InvoiceFormDialog`, `useInvoices` direct DML | Create/Update RPCs or source adapter |
| Draft delete | direct delete | `delete_draft_invoice` |
| Approval | `approveInvoice.ts` + `postLedgerForInvoice.ts` | `approve_invoice` |
| Cancellation | `InvoiceDetailsSheet` sequential writes | `cancel_invoice` |
| Payment | payment hooks + `postLedgerForPayments.ts` | `post_payment` |
| Expense CRUD | `useExpenses.ts`, `ExpenseFormDialog.tsx` | create/update/delete expense RPCs |
| Expense post/reverse | `postLedgerForExpense.ts` + state writes | post/reverse expense RPCs |
| Manual ledger | `useLedger.createEntry` | `post_manual_ledger_adjustment` |
| Housing | `CreateInvoiceFromAdmission.tsx`, billing-link hook | Housing adapter |
| Laboratory | request/sample/result invoice buttons | Lab adapter using request occurrence |
| Doctor | consultation invoice generator | Doctor adapter |
| Vet/Vaccination | treatment/dose generators | exact adapters |
| Breeding | attempt/check/foaling generators | exact subtype adapter |
| POS | `POSPaymentPanel`, `EmbeddedCheckout`, session/inventory/payment writers | `pos_finalize_sale` |
| HR salary | `useSalaryPayments.ts` two-step insert | `record_salary_payment` |
| Demo seeding | `useFinanceDemo.ts` direct six-table DML | removed from authenticated runtime |

`postLedgerForInvoice.ts` removed as callable client writer. Legacy helpers become thin RPC wrappers or are removed once call-sites migrate. Idempotency key created once per user intent, stored for mutation/form lifetime; network retries, 40001 loop, and double taps reuse the same key.

**H2 Readers**: Ledger list = `effective_date, created_at, id`; Client Statement parent by `effective_date`, detail rows non-financial; FFM keeps exclusions, only date source flips; Aging keeps invoice `due_date`; PDF/Print/CSV = same rows/totals/effective date as on-screen Statement; Customer balances = SUM(ledger) rebuilt after backfill; Housing period history = `period_start DESC, period_end DESC, id ASC`. Historical description-refresh: no new write RPC in this slice.

## I. Idempotency, Locking, and Business-Occurrence Contract — ACCEPTED WITHOUT DEVIATION

**I1 `request_hash`** = SHA-256 of canonical JSON containing operation, tenant, actor, source identity, caller-supplied business intent. Server-resolved data lives in `resolved_snapshot`. NOT MD5.

**I2 Fixed transaction order**: (1) authenticate + tenant membership + explicit permission; (2) syntactic validation without trusting relationships; (3) advisory lock `(tenant, operation, idempotency_key)`; (4) read idempotency row; (5) active completed row → actor mismatch=42501 FIN_IDEMPOTENCY_ACTOR_MISMATCH / hash mismatch=23514 FIN_IDEMPOTENCY_CONFLICT / both match → return stored response, no revalidation, no mutation; (6) active row with null response → 40001 FIN_IDEMPOTENCY_IN_PROGRESS (frontend retries with same key); (7) expired row → `UPDATE ... WHERE expires_at <= now()` reclaim; zero rows → re-read, never delete+insert; (8) new row → insert reservation in same tx; (9) domain: acquire one tenant-qualified source advisory lock, then `SELECT ... FOR UPDATE` source row; (10) re-derive tenant/client/الخيل/eligibility from DB; (11) run business-occurrence duplicate/overlap check; (12) perform atomic mutation; (13) store `resolved_snapshot` + response same tx; commit. Nightly service-role maintenance cleans expired rows.

**I3 Occurrence matrix**: exactly as uploaded (Housing = admission+overlap; Lab=`lab_request_id`; Doctor=`doctor_consultation_id`; Vet=`vet_treatment_id`; Vaccination=`horse_vaccination_id`; Breeding = attempt/check/foaling; POS=new `pos_sales.id` under locked session, sale number unique; Expense=`expense.id`, one ledger row; HR salary=`hr_salary_payments.id`; Manual invoice=no business occurrence key). Active invoice statuses for duplicate check = `draft, reviewed, issued, approved, shared, partial, paid, overdue`; `cancelled` excluded but `corrects_invoice_id` required for a corrective rebill. Housing overlap = `billing_links → invoices → invoice_items` join (no cross-table partial index, no GiST on invoice_items). Conflict → `23P01 FIN_HOUSING_PERIOD_ALREADY_INVOICED` with invoice number/range.

## J. Laboratory Relationship Contract — ACCEPTED WITHOUT DEVIATION

Amend only the `lab_horse_id` branch of `_invoice_items_validate_source`; preserve every other validation branch. For tenant T, client C, lab_horse L: missing L → 23503 FIN_LAB_HORSE_UNKNOWN; `lab_horses.tenant_id<>T` → 42501 FIN_LAB_HORSE_CROSS_TENANT; C IS NULL → walk-in accept; C NOT NULL → accept if `lab_horses.client_id=C` OR row in `party_horse_links (tenant=T, lab_horse_id=L, client_id=C, relationship_type='lab_customer')`; else 23514 FIN_LAB_HORSE_CLIENT_UNRELATED. Selector reads same truth as trigger. Walk-in positive approved invoice → one ledger row with `client_id=NULL`, `effective_date=issue_date`, `balance_after=0`, no `customer_balances` row.

## K. Housing Period, Range, and Projection Contract — ACCEPTED WITHOUT DEVIATION

Previously-invoiced query ORDER BY `period_start DESC, period_end DESC, invoice.issue_date DESC, invoice_items.id ASC`. Backend max period end = MIN(Riyadh calendar month-end, `checked_out_at` Riyadh date when present). `status='checked_out'` with NULL `checked_out_at` → 23514 FIN_HOUSING_INCONSISTENT_ADMISSION (never `updated_at`). `expected_departure` = frontend warning only. UI may cap; RPC validates exact submitted dates and rejects over-cap ranges (never silently alters). Accrued vs selected totals remain separate labeled amounts. Monthly proration keeps real calendar days + existing rounding; fixtures include Fani 2024-Feb-leap and 2025-Feb. `INV-MNDH8GPD` byte-for-byte unchanged: 37 financial monthly items, subtotal 92,500, tax 13,875, total 106,375, one ledger row. Statement projection: one parent per invoice carries debit/credit/balance; 37 rows may render as indented display details with blank debit/credit/balance; running balance advances once by ledger amount; sum of display amounts = invoice total = ledger amount. Package parent/child logic separate from Housing monthly items — never used to collapse them.

## L. SQLSTATE, Error Surfacing, and Retry Contract — ACCEPTED WITHOUT DEVIATION

Shared frontend mapper `src/lib/finance/financeErrorMessages.ts`. Preserved SQLSTATEs: 42501 (no retry), 23503 (no retry), 23514 (no retry), 23P01 (no retry), 40001 (retry 100/300/900 ms same idempotency key), P0001 (no retry, named business rules only). Every DB error starts with a stable `FIN_*` code; known codes → safe AR/EN copy; conflict messages may include invoice number/date range; unknown text falls back to `common.error` while original code is logged (no secrets, no full payloads). Required FIN_ codes (verbatim): FIN_AUTH_REQUIRED, FIN_PERMISSION_DENIED_*, FIN_CROSS_TENANT, FIN_IDEMPOTENCY_ACTOR_MISMATCH, FIN_IDEMPOTENCY_CONFLICT, FIN_IDEMPOTENCY_IN_PROGRESS, FIN_APPROVE_NO_ITEMS, FIN_APPROVE_NO_FINANCIAL_ITEMS, FIN_APPROVE_TOTAL_MISMATCH, FIN_PACKAGE_CHILD_WITHOUT_PARENT, FIN_LAB_HORSE_UNKNOWN, FIN_LAB_HORSE_CROSS_TENANT, FIN_LAB_HORSE_CLIENT_UNRELATED, FIN_HOUSING_PERIOD_ALREADY_INVOICED, FIN_HOUSING_PERIOD_INVALID, FIN_HOUSING_RANGE_EXCEEDS_MONTH_END, FIN_HOUSING_RANGE_EXCEEDS_CHECKOUT, FIN_HOUSING_INCONSISTENT_ADMISSION, FIN_INVOICE_HAS_PAYMENTS, FIN_CANCEL_INVALID_STATE, FIN_EXPENSE_NOT_APPROVABLE, FIN_EXPENSE_ALREADY_POSTED, FIN_EXPENSE_ALREADY_REVERSED, FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE, FIN_DUPLICATE_BUSINESS_OCCURRENCE, FIN_POS_SALE_DUPLICATE. Generic `InvoiceFormDialog` toast removed for known Finance failures; SQLSTATE + FIN_ propagate through RPCs.

## M. Effective-Date, Backfill, and Reader Contract — ACCEPTED WITHOUT DEVIATION

**M1 New writes**: invoice debit=`invoices.issue_date`; payment=required `p_payment_date` (positive input → negative ledger amount reducing receivable); POS=required sale business date inside validated payload; expense=`expenses.expense_date`; HR salary expense=Riyadh(`hr_salary_payments.paid_at`); manual adjustment=required `p_effective_date`; ordinary cancellation=required cancellation business date; -213=`2017-02-20` only. No writer relies on defaults.

**M2 Historical backfill** uses `(created_at AT TIME ZONE 'Asia/Riyadh')::date`, never bare `created_at::date`. Classes: (1) invoice/invoice → join issue_date; (2) payment/invoice → Riyadh posting date; (3) legacy adjustment/invoice → Riyadh posting date (Phase-6 general adjustments, must not inherit issue_date); (4) existing ordinary adjustment/invoice_cancellation → Riyadh posting date; (5) unknown class → ABORT (no NOTICE-only quarantine, no silent guess); (6) -213 reversal doesn't exist during backfill. Preflight asserts exact `(entry_type, reference_type)` census + zero orphan invoice references. Invariants: row counts by tenant+class unchanged; `SUM(amount)` by tenant/client unchanged; SHA-256 row hashes excluding effective_date/balance_after/classification metadata equal; zero NULL after; idempotent re-run.

**M3 Reader flip**: Ledger `effective_date, created_at, id`; Statement filter/sort by `effective_date`; PDF/Print/CSV parity; running balance in effective-date order + audit tie-break; Aging keeps `due_date`; `created_at` visible only where intentionally shown as audit time.

**M4 FFM**: read current `get_client_first_financial_activity(p_tenant_id, p_client_id)` definition at preflight; preserve every current inclusion/exclusion (cancelled/draft exclusion + canonical `invoice_cancellation` exclusion); replace `MIN(created_at)` with `MIN(effective_date)` and future cutoff with Riyadh current business date; preserve `timestamptz` return by converting date to start-of-day in Asia/Riyadh. Do NOT narrow to invoice debits only.

## N. Statement Projection, Running Balance, Customer-Balance Rebuild — ACCEPTED WITHOUT DEVIATION

**N1 Statement projection**: one ledger row = one financial parent; domain item/period rows are display-only (blank Debit/Credit/Balance) on screen/PDF/Print/detailed CSV. For every invoice: `sum(display segment amounts)=invoice.total_amount=invoice ledger amount`; financial parent count=1; running-balance movement count=1.

**N2 `balance_after` rebuild** (after backfill, non-null-client only): window `SUM(amount) OVER (PARTITION BY tenant_id, client_id ORDER BY effective_date, created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`. NULL-client rows → `balance_after=0`, never create customer balances.

**N3 `customer_balances`** upsert one row per `(tenant_id, client_id)` from ledger sum using `tenants.default_currency`. No automatic delete of stale rows. FULL OUTER reconciliation aborts on stale row or currency mismatch. Exit invariants: no null-client CB row; no duplicate; balance = ledger sum; final balance_after = partition sum; every row's balance_after = cumulative sum through row; NULL-client rows have balance_after=0 and no CB.

## O. Expense/HR/Supplier/POS Contract — ACCEPTED WITHOUT DEVIATION

Expense uses two axes: existing `status` (workflow) and new `ledger_status` (accounting). Create/Update/Delete migrate to RPCs; posted/reversed rows cannot be deleted; posted rows allow only the locked descriptive/receipt fields. `post_expense_with_ledger` moves pending→approved+posted or approved/paid unposted→posted and creates exactly one positive `entry_type='expense', reference_type='expense'` ledger row on `expense_date`, with null client and `balance_after=0`. Model-B reversal creates one positive stored reversal expense linked through `reverses_expense_id`, one negative ledger row referencing that reversal, and marks the original `ledger_status='reversed'`; HR-sourced reversal is blocked (`FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`). **Only `hr_salary_payment` is introduced as a non-null expense source in this slice; standalone expenses remain NULL/NULL.** `record_salary_payment(p_create_expense=true)` creates one salary row + one approved/posted HR-sourced expense + one ledger row atomically under `hr.manage`; false creates salary only. Supplier Payables are regression-only: current behavior remains, zero supplier `billing_links` are created, and no `link_supplier_payable_to_invoice` RPC exists. POS: `pos_finalize_sale` atomically covers `pos_sales` + inventory + invoice/items + payment + ledger + `billing_links(source_type='pos_sale', source_id=pos_sales.id)` + session totals + customer balance when client is non-null. **`cart_hash` is not a business-duplicate key and is not unique; an identical later cart under a new intent is valid.** `FIN_POS_SALE_DUPLICATE` applies to a genuine sale occurrence/sequence conflict, while same-key double taps replay the stored result.

## P. ACL, RLS, Function Grants, Direct-Writer Gate — ACCEPTED WITHOUT DEVIATION

Locked tables: `invoices, invoice_items, ledger_entries, customer_balances, billing_links, expenses`. No revoke until every §H writer migrates AND build/typecheck pass AND direct-writer gate returns zero unapproved client mutations. Gate searches `src/` for INSERT/UPDATE/DELETE/UPSERT/`.from(...).insert|update|delete|upsert` (including multiline + wrappers) against all six tables plus Mark-Paid helpers and Demo seed/reset code; excludes generated types and read-only selects. After gate: REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER from `authenticated` and `anon` on all six; keep authenticated SELECT where RLS readers require; revoke anon SELECT on all six (public share continues via existing SECURITY DEFINER read RPCs); keep service-role/function-owner rights; do NOT change global default privileges; capture exact pre-revoke ACL statements; rollback restores exactly those. `finance_request_idempotency`: no authenticated/anon access. `pos_sales`: narrow tenant SELECT only. Every public RPC: EXECUTE revoked from PUBLIC/anon, granted to authenticated; every private helper: no authenticated EXECUTE. Production verification: `has_table_privilege`, `pg_class.relacl`, `pg_policies`, `information_schema.role_table_grants`, `pg_proc.proacl` — **no** production denial writes, even inside ROLLBACK.

## Q. Legacy Demo Preservation and -213 One-Time Neutralization — ACCEPTED WITHOUT DEVIATION

**Q1 Protected register**: `الم-202607-213` (bc37440d…) = one guarded neutralization; `الم-202607-396` (7bdaf243…) = frozen draft; `الم-202607-951` (af663402…) = preserve, standard backfill; `اسط-202607-717` (a0891216…) = effective_date `2013-07-20`; `اسط-202607-740` (30655789…) = preserve draft; `INV-MMO9AAXD` (674bfa8a…) = frozen Legacy Demo Anomaly; `INV-MNDH8GPD` (ee8dc05c…) = 37 items + one ledger row preserved; Suni item (fedae37c…) = preserved through NOT VALID.

**Q2 -213 preflight** (one-shot migration as controlled owner; NO permanent RPC): strict lock+assert invoice=bc37440d…, tenant=348ce41c…, client=364165f0…, number=`الم-202607-213`, issue_date=2017-02-20, status=approved, total=50.00, physical items=0, invoice ledger exactly 1 amount +50.00, payment rows=0, prior reversal=0 unless verified idempotent branch. Capture deterministic SHA-256 fingerprints + exact preimages for protected invoices, their items, related ledger rows, related billing_links, affected client ledger partition, affected `customer_balances` row, Suni item. No timestamp windows.

**Q3 Neutralization transaction**: (1) compute expected FFM using POST-reader-migration full FFM predicate excluding only -213 invoice row and canonical reversal; (2) INSERT exactly one adjustment: `entry_type='adjustment', reference_type='invoice_cancellation', reference_id=v_inv_id, amount=-actual_original_ledger_amount, effective_date='2017-02-20', same tenant/client, created_by=COALESCE(original_ledger.created_by, invoice.created_by, tenant.owner_id), metadata classification 'aml_1_b_1_test_data_neutralization' + original_ledger_id`; (3) UPDATE invoice status='cancelled', set existing `cancelled_at=now()`, exact reason, `updated_at`; (4) rebuild only affected client partition + CB; (5) assert net effect for reference=0; (6) assert actual FFM = expected FFM without -213; (7) assert every protected fingerprint unchanged; (8) any failure aborts entire tx.

**Q4 Idempotent re-run**: check existing reversal before requiring original approved status. No-op only when ALL postconditions exact (one reversal, correct amount/date/tenant/client/reference, cancelled + audit, net zero, correct balance chain, correct CB, correct FFM, unchanged protected fingerprints). Any drift raises, mutates nothing.

**Q5 Complete recovery artifact** (rehearsed before Production): locks + verifies exact reversal and cancelled invoice; deletes only that reversal; restores invoice's captured preimage (status/cancelled_at/cancellation_reason/updated_at) exactly; rebuilds only affected client partition + CB; verifies net +50 original state + stored pre-neutralization expected state; verifies protected fingerprints. Staging rehearsal sequence: neutralize → verify → recover → verify preimage → recreate clone → neutralize → run idempotent no-op. Production not authorized until all pass.

## R. Ordered Execution Program and Hard Gates — ACCEPTED WITHOUT DEVIATION

20 stages exactly as uploaded:

1. Read-only preflight + evidence capture (Prod catalogs/code/data; Staging clone; permissions/ACLs/function defs/counts/sums/protected preimages/hashes).
2. Rollback artifacts stored in repo execution artifacts (every later stage has inverse).
3. Additive schema (§E) — Staging → controlled Prod migration.
4. Permissions (§F) — insert 3 keys + exact bundle bindings.
5. Private helpers + idempotency (SHA-256, Riyadh date, lock/hash/private persistence helpers).
6. Public RPCs + adapters (§G).
7. Trigger/guard changes (Lab branch, expense source/delete guards, forward-only item CHECK).
8. Frontend writer migration (§H, stable keys, error mapper).
9. Direct-writer gate (static scan + manual call-chain census).
10. Full Staging writer QA (atomicity, permissions, occurrence, adapters, expenses, HR, POS).
11. Effective-date backfill (Staging rehearsal → controlled Prod migration).
12. Balance rebuild (Staging → controlled Prod).
13. Reader/projection flip (Statement/FFM/aging/export).
14. Full cross-module Staging QA (complete §S).
15. ACL revoke (Staging denial tests → exact Prod revoke).
16. Prod read-only parity (rows/sums/hashes/reconciliation/runtime checks).
17. Observation + NOT NULL gate — minimum 7 clean days after writer/reader/ACL rollout, then final constraints (expense ledger_status, ledger effective_date).
18. -213 Staging neutralization + recovery rehearsal (full §Q).
19. -213 Production one-shot (guarded migration only).
20. Final Prod read-only closure (parity, anomaly register, ACL, balances, FFM, exports).

**EXEC**: no stage begins before previous gate; any failure rolls back only that stage, preserves last passed checkpoint, reports exact failure, halts; no failed gate waived.

## S. Mandatory Staging QA Matrix — ACCEPTED WITHOUT DEVIATION

Each test records setup, actor, permissions, request key, action, expected rows, expected UI, SQLSTATE/`FIN_*` code, and environment.

**S1 Invoice Core:**

1. Valid manual Create with three items → one header, three items, zero domain links; valid domain Create → one validated occurrence link; no partial rows.
2. One invalid item → zero header/items/link/ledger.
3. Failed Edit replacement → original header/items unchanged.
4. Own draft delete → header/items/links gone; no ledger.
5. Another actor's draft delete → 42501.
6. Zero physical items → approval rejected.
7. Package children without parent → rejected.
8. One parent + N zero children → round-trips unchanged; parent alone contributes financially.
9. Zero-total invoice with real item → approves, no ledger.
10. Header/subtotal/tax/discount/total mismatch → rejected.
11. Valid approval → exactly one ledger row and correct balance.
12. Same approval key replay → original response, no new ledger.

**S2 Cancellation and Payment:**

13. Draft sent to `cancel_invoice` → `FIN_CANCEL_INVALID_STATE`; UI uses delete RPC instead.
14. Reviewed/issued void → retain header/items/links; set cancelled; no reversal when no invoice ledger exists.
15. Approved/shared/overdue cancel → one reversal on supplied business date; net zero.
16. Partial/paid cancel → blocked with `FIN_INVOICE_HAS_PAYMENTS`.
17. Cancelled replay → verified no-op/original response.
18. Payment uses required explicit date, creates one payment intent/ledger row, and derives partial/paid state.
19. No user-facing Mark Paid path can set paid without a payment record.

**S3 Idempotency and Concurrency:**

20. Same key/same actor/same hash after commit → stored response.
21. Same key/different hash → `FIN_IDEMPOTENCY_CONFLICT`.
22. Same key/different actor → `FIN_IDEMPOTENCY_ACTOR_MISMATCH`.
23. Concurrent same key → one commit, one replay/retry with same key.
24. Concurrent different keys/same domain occurrence → first commit, second business duplicate.
25. Expired manual key → new legitimate manual intent can create a new invoice.
26. Expired domain key → existing active occurrence still blocks duplication.
27. Mobile rapid double tap → one result.

**S4 Laboratory and Tenant Isolation:**

28. PHL-only linked Laboratory خيل succeeds for matching client.
29. Missing PHL/direct relationship → `FIN_LAB_HORSE_CLIENT_UNRELATED`.
30. Cross-tenant `lab_horse`/service/category/package → rejected.
31. Walk-in positive invoice → null-client ledger row, no customer balance, tenant revenue included, no client statement row.
32. Trigger error appears as exact safe localized message.
33. Same tests repeated with more than the Fani reference row to prove example-not-boundary.

**S5 Housing:**

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

**S6 Other Domain Adapters:**

46. Doctor consultation positive and duplicate tests use `doctor_consultation`.
47. Vet treatment positive and duplicate tests.
48. Vaccination per-dose positive and duplicate tests.
49. Breeding attempt, pregnancy check, and foaling each have independent positive/duplicate/cross-tenant tests.
50. No adapter directly writes locked tables.

**S7 Expenses, HR, Supplier, POS:**

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

**S8 Dates, Statement, and Balances:**

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

**S9 Security, Legacy, and UX:**

73. Missing permission for every public RPC → 42501.
74. Direct authenticated/anon DML on each locked table fails after revoke in Staging.
75. Authenticated cannot read idempotency rows.
76. Public share/read RPCs continue; anon direct financial table access is denied.
77. Service-role cron behavior remains functional.
78. `INV-MMO9AAXD`, -396, -951, -717, -740, Suni item, and all non-target protected hashes remain correct.
79. -213 rehearsal: forward, recovery, re-forward, and no-op paths all pass.
80. Arabic RTL and terminology use generic «الخيل» unless specific stored classification is known.

## T. Production Read-Only Verification Matrix — ACCEPTED WITHOUT DEVIATION

Except controlled migrations and Stage-19 -213 transaction, Production verification is read-only:

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

## U. Exact Rollback Classes — ACCEPTED WITHOUT DEVIATION

**Class A (schema/code/function/permission)**: reverse in dependency order — frontend readers/writers → ACL grants → prior triggers/functions → migration-added permission bindings/definitions → constraints/indexes/columns/tables (only after dependants removed). Never drop `effective_date` while deployed readers require it.

**Class B (derived data/backfill)**: restore only keyed preimages captured in Stages 1/2 (each affected ledger row's `effective_date`, `balance_after`, metadata; each affected CB row; exact pre-migration ACLs). Never restore an entire mutable table over concurrent unrelated rows.

**Class C (-213)**: rehearsed guarded recovery from §Q5 (deletes only exact reversal, restores only -213 preimage, rebuilds only its client partition, re-checks protected hashes/FFM).

## V. Explicitly Deferred Workstreams — ACCEPTED WITHOUT DEVIATION

Deferred: (1) Demo Data Purge/Reset; (2) Duplicate account/client/user identity audit + safe merge; (3) HR salary reversal semantics; (4) Supplier settlement allocation redesign; (5) Package `parent_item_id` redesign; (6) Multi-currency ledger; (7) Documentation 10 platform SaaS/subscription billing; (8) AML.2 and all later roadmap items. Not hidden blockers; will not be folded into AML.1.b.1.

## W. Prohibited Deviations — ACCEPTED WITHOUT DEVIATION

I will not: execute before approval; reopen closed investigation; omit a platform module because screenshots used Lab/Housing examples; use «حصان» as generic Arabic; use plural Finance permission namespaces; add fewer/more than three named permission keys; grant new keys via create/edit inference; create Supplier Payable billing links or a supplier-link RPC; rely on `payment_intents.paid_at` or add a payment date column in this slice; skip Expense CRUD migration before ACL revoke; expose idempotency rows to authenticated users; skip walk-in revenue ledger posting; collapse Housing's 37 real financial items into one invoice item; use Housing period labels as ledger events; replace due-date aging with effective-date aging; add a false-paid override; use MD5, bare `created_at::date`, or timestamp windows; treat approved+ as a shortcut for the cancellation state machine; add an anomaly badge UI; change scope after approval; improvise around schema drift; skip any QA family; execute Production mutation before its gate.

## Approval Commitment

Every ORDER, table row, RPC signature, permission key, migration, gate, rollback, and all 80 QA rows in the uploaded `AML.1.b.1-PLAN-LOCK-FINAL-CORRECTED.md` are marked **ACCEPTED WITHOUT DEVIATION** in the corresponding section above. The corrections in this commitment are not optional deltas: they restore exact parity with that authoritative contract and supersede any contrary wording in the earlier draft of this Planning Mode response.

**Remaining product decisions: none. Remaining investigative blockers: none.**

Upon user approval, I will implement only the approved PLAN-LOCK, in the approved order, with the stated gates and rollbacks. I will not change scope, substitute architecture, skip QA, execute Production mutation before its gate, or improvise around schema drift.

**AML.1.b.1.PLAN-LOCK.FINAL: READY FOR USER APPROVAL — NO IMPLEMENTATION HAS OCCURRED.**
```