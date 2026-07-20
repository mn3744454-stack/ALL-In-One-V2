# AML.1.b.1 — STAGE 6 EXECUTION SPECIFICATION

**Pass:** Mechanical correction pass (A.1–A.18 applied throughout).
**Mode:** Read-only investigative + single documentation write.
**Repository effect of this pass:** creation of this exact file only. No database DDL/DML, no migration tool calls, no other file edited. `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql` was **not** edited — the A.15 replacement guard appears below as a prescribed later edit.
**Prior READY decisions are withdrawn.** This document supersedes them coherently — no errata section.

---

## 0. Locked invariants (A.1–A.5, A.13, A.17)

### 0.1 Idempotency terminology (A.1)

`finance_request_idempotency` has **no** `status` column. Live definition (§1.14 capture):

```
tenant_id uuid NN, operation text NN, idempotency_key uuid NN,
actor_id uuid NN, request_hash bytea NN,
resolved_snapshot jsonb NN DEFAULT '{}'::jsonb,
response jsonb NULL,
created_at timestamptz NN DEFAULT now(),
expires_at timestamptz NN DEFAULT now()+interval '7 days'
PK (tenant_id, operation, idempotency_key)
```

Reservation state is derived: `response IS NULL AND expires_at > now()` ⇒ **in progress**; `response IS NOT NULL AND expires_at > now()` ⇒ **completed / replay**; `expires_at <= now()` ⇒ **expired, reclaimable**. Stage 5 `_finance_idempotency_begin/_complete/_purge_expired` are the sole writers. No RPC re-acquires the idempotency tuple lock after `_finance_idempotency_begin`.

### 0.2 Twelve-invariant approval contract (A.2)

Every state-changing finance RPC and adapter must satisfy all twelve:

1. Caller `auth.uid()` present; active tenant membership; exact permission via `has_permission(auth.uid(), p_tenant_id, key)` (or `has_internal_capability` for lab).
2. Syntactic payload validation (allowlisted keys only; unknown keys reject with `FIN_PAYLOAD_UNKNOWN_KEY`).
3. `_finance_idempotency_begin(p_tenant_id, p_operation, p_idempotency_key, auth.uid(), p_source, p_intent)` acquired exactly once.
4. Optional source-scope advisory lock via `_finance_source_lock_key`, then `SELECT … FOR UPDATE` on the exact source row (invoice, boarding_admission, lab_request, doctor_consultation, vet_treatment, horse_vaccination, breeding_attempt, pregnancy_check, foaling, hr_salary_payment, or pos_session as applicable).
5. Server-side re-resolution of tenant, client, currency, catalog service/package, price, dates, quantities, tax, and account — caller-supplied economic values are rejected in favour of the server-resolved snapshot.
6. Package parent/child rules: a package line is written as one `invoice_items` row with `package_id`, `package_source`, `package_price_snapshot`, and `package_services_snapshot` (jsonb). There is **no** `parent_item_id` column (§1.10). Child services live inside `package_services_snapshot`. Housing monthly proration lines remain standalone financial rows and are **not** collapsed into a package parent.
7. `service_source` and `service_id` / `package_id` exclusivity enforced by live CHECK `invoice_items_service_package_exclusive_chk` and `invoice_items_service_source_chk`.
8. `horse_id` / `lab_horse_id` exclusivity enforced by live CHECK `invoice_items_horse_source_exclusive_chk`.
9. Totals recomputed server-side; caller-supplied `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `balance_after` rejected.
10. Ledger insertion via `_finance_ledger_insert` (see §5.1); balance chain rebuilt per client via `_finance_customer_balance_recompute`.
11. Corrective rebill lineage (A.8): `corrects_invoice_id` accepted only when the referenced invoice is same-tenant, `status='cancelled'`, same adapter source occurrence, and the submitted period/identity matches. Manual-invoice RPCs reject `corrects_invoice_id`.
12. `_finance_idempotency_complete(p_tenant_id, p_operation, p_idempotency_key, auth.uid(), p_request_hash, p_resolved_snapshot, p_response)` closes the reservation. Replay of the same key returns the stored `response`; a mismatched hash raises `FIN_IDEMPOTENCY_MISMATCH` (SQLSTATE 42501 for actor mismatch, 23514 for hash mismatch).

### 0.3 Laboratory error taxonomy (A.3)

- `FIN_LAB_HORSE_UNKNOWN` — `p_lab_horse_id` not found in `public.lab_horses`.
- `FIN_LAB_HORSE_CROSS_TENANT` — `lab_horses.tenant_id <> p_tenant_id`.
- `FIN_LAB_CLIENT_UNRELATED` — the resolved billing client is neither `lab_horses.client_id` (direct) nor a `party_horse_links` row with `(tenant_id, lab_horse_id, client_id, relationship_type IN ('lab_customer','payer'))` (indirect).

### 0.4 Expense lifecycle (A.4)

Dual-axis:
- Workflow: `draft | approved | rejected | cancelled` (existing `expenses.status`).
- Accounting: `expenses.ledger_status IN ('unposted','posted','reversed')` (Stage 3 additive; live CHECK `expenses_ledger_status_check`). New Stage 6 expenses always begin with `ledger_status='unposted'`. `post_expense_with_ledger` transitions to `posted` and sets `posted_at`, `ledger_entry_id`. `reverse_expense` inserts a linked opposite expense with `reverses_expense_id` (unique partial index — §1.14) and marks the source `reversed`.

### 0.5 Expense source (A.5)

The only Stage-6 populated `expenses.source_type` is `'hr_salary_payment'`, with `source_reference = hr_salary_payments.id`. All other expense creations leave `source_type = NULL` and `source_reference = NULL`. The partial unique index `expenses_source_unique_idx (tenant_id, source_type, source_reference) WHERE source_type IS NOT NULL` guarantees single-canonical expense per salary payment.

### 0.6 State-machine (A.13)

`approve_invoice`: allowed only from `draft | reviewed | issued`. Legacy `sent` rejected with `FIN_APPROVE_INVALID_STATE`. Terminal state: `approved`. Applies §0.2 twelve invariants.

`cancel_invoice`:
- `draft` → `FIN_CANCEL_INVALID_STATE_USE_DELETE_DRAFT` (route caller to `delete_draft_invoice`).
- `reviewed | issued` → retain header/items/links; require zero canonical invoice-ledger row; set `cancelled`; **no** reversal ledger row inserted.
- `approved | shared | overdue` → require exactly one canonical `entry_type='invoice'` row; insert one opposite `entry_type='invoice'` row with negative `amount` and required `p_cancellation_date` as `effective_date`.
- `partial | paid` → `FIN_INVOICE_HAS_PAYMENTS`.
- `cancelled` → verified idempotent no-op returning stored response.
- Legacy `sent` → `FIN_CANCEL_INVALID_STATE` (no invented transition).
- Protected sentinel `الم-202607-213` (bc37440d-…, approved, 50.00 — §1.17) is **excluded**; the Stage 19 pass owns its neutralisation.

POS emits `paid`. New Stage-6 RPCs otherwise emit only `draft | approved | cancelled | paid | partial | overdue`; they never newly emit `sent` or `issued`.

### 0.7 Permission map (A.17)

| Operation | Permission |
|---|---|
| Invoice create | `finance.invoice.create` |
| Invoice update | `finance.invoice.edit` |
| Own-draft delete | `finance.invoice.delete` **and** `created_by = auth.uid()` |
| Approve | `finance.invoice.approve` |
| Cancel | `finance.invoice.cancel` |
| Payment | `finance.payment.create` |
| Expense create | `finance.expenses.create` |
| Expense update/delete/reverse | `finance.expenses.manage` |
| Expense post | `finance.expenses.approve` |
| Manual adjustment | `finance.adjustment.create` |
| POS finalize | `pos.sale.create` |
| Salary payment | `hr.manage` |

Adapters additionally require `finance.invoice.create` **plus**: Housing `housing.manage`; Laboratory `has_internal_capability(p_tenant_id,'laboratory')`; Doctor `doctor.consultations.write`; Vet/Vaccination `vet.manage`; Breeding `breeding.manage`.

Canonical order per RPC:

```
auth.uid()
 → active membership check
 → permission / capability check
 → syntactic validation
 → _finance_idempotency_begin
 → optional _finance_source_lock_key advisory
 → source SELECT … FOR UPDATE
 → server relational/business validation
 → mutation (via private helpers)
 → _finance_idempotency_complete
```

`_finance_idempotency_begin` is called exactly once; the tuple lock it holds is not re-acquired.

### 0.8 SQLSTATE → FIN_* mapping (A.17)

| SQLSTATE | Contract |
|---|---|
| `42501` | authentication / permission / cross-tenant / actor mismatch — `FIN_AUTH_*`, `FIN_PERMISSION_DENIED`, `FIN_CROSS_TENANT`, `FIN_IDEMPOTENCY_ACTOR_MISMATCH` |
| `23503` | missing referenced object — `FIN_REF_MISSING_<domain>` |
| `23514` | validation / state-machine invariant / hash mismatch — `FIN_VALIDATION_*`, `FIN_*_INVALID_STATE`, `FIN_IDEMPOTENCY_MISMATCH` |
| `23P01` | Housing period exclusion (§4.1) — `FIN_HOUSING_PERIOD_ALREADY_INVOICED` |
| `40001` | idempotency reservation in progress — retry same key at 100/300/900 ms |
| `P0001` | named business rules (e.g. `FIN_INVOICE_HAS_PAYMENTS`, `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`, `FIN_POS_SALE_DUPLICATE`) |

Every surfaced database error begins with a stable `FIN_*` code. Existing locked codes are preserved verbatim — no new synonyms.

---

## 1. Live catalog and no-drift capture (A.11 items 1–17)

All queries executed read-only via `psql` against the current project database on **2026-07-20**. Raw output captured under `/tmp/s6/` during this pass; abstract summaries follow.

### 1.1 `payment_intents`

Live columns: `id uuid PK`, `payer_user_id uuid NN → profiles(id)`, `payee_account_id uuid NN → payment_accounts(id)`, `tenant_id uuid → tenants(id)`, `intent_type payment_intent_type NN`, `reference_type payment_reference_type NN`, `reference_id uuid NN`, `amount_display text`, `currency text NN DEFAULT 'SAR'`, `status payment_status NN DEFAULT 'draft'`, `created_at/updated_at`. Indexes: PK; `idx_payment_intents_payer`, `_reference (reference_type,reference_id)`, `_status`, `_tenant`. FKs as above. RLS: 5 policies (permission-based view/update by `finance.payment.view/create`; owner-scoped insert/update/view). Triggers: `update_payment_intents_updated_at`, `validate_payment_intent_trigger`.

**Consequence for `post_payment`:** `payment_intents` carries no `payment_date`, `paid_at`, or `captured_at` column — the explicit payment date lives in the RPC parameter `p_payment_date date NN` and is copied to `ledger_entries.effective_date`. `intent_type`, `reference_type`, and `status` are user-defined enums — the payload `p_intent_type`, `p_reference_type`, and derived `status` values must be validated against the enums at write time.

### 1.2 Payment allocation

Repo inspection: `src/lib/finance/postLedgerForPayments.ts`, `src/components/pos/EmbeddedCheckout.tsx`, `src/hooks/pos/usePOSCore.ts`, `src/hooks/finance/useInvoicePayments.ts`, `src/components/finance/InvoiceDetailsSheet.tsx`. Current rules: single-invoice allocation per payment event; outstanding = `invoice.total_amount − Σ prior payment ledger rows`; over-allocation surfaces via UI validation only. **`FIN_PAYMENT_OVERPAYMENT` is enforced server-side** in `post_payment` — payment amount must satisfy `0 < p_amount ≤ outstanding + epsilon(0.01)`. `FIN_PAYMENT_ZERO_OR_NEGATIVE` for `p_amount ≤ 0`. Derived invoice status: `Σ payments < total` ⇒ `partial`; `Σ payments = total` (within 0.01) ⇒ `paid`.

### 1.3 `payment_accounts` and payment methods

Live columns per `\d public.payment_accounts` (§1 capture): `id`, `tenant_id`, `name`, `account_kind`, `is_active`. `post_payment` validates `payee_account.tenant_id = p_tenant_id AND is_active = true`; else `FIN_PAYMENT_ACCOUNT_INVALID`. Allowed methods derive from the live `payment_intent_type` enum (values not enumerated here — enforced by enum, not by repo constant).

### 1.4 POS mutation chain

`pos_sessions` and `pos_sales` captured live. Live inventory objects present: `inventory_items`, `inventory_transactions`, `inventory_movements`, `stock_levels`, `warehouses`. POS current finalize path (`src/hooks/pos/usePOSCore.ts`, `EmbeddedCheckout.tsx`, `DashboardFinancePOS.tsx`) writes `invoices` + `invoice_items` + `billing_links` (`link_kind='final'`, `source_type='pos_sale'`) but **does not currently write `pos_sales` end-to-end at all writer sites** — this is a partial adopter. Sale-number allocation and session-total counters are today client-computed. Complete inventory adjustment chain per finalize (order, allow-negative rules, warehouse selection) is **not enumerated in this pass** and is listed as unresolved (§9).

`pos_sales` unique constraint: `pos_sales_session_sale_unique (tenant_id, session_id, sale_number)`. `pos_sessions_status_check` restricts status to `open|closed|reconciled`; partial unique `ux_pos_sessions_one_open_per_branch` enforces one open session per (`tenant_id`, `COALESCE(branch_id, zero-uuid)`).

**`cart_hash` is audit-only.** Two legitimate sales with identical carts under different idempotency keys are valid; the same key replays via `finance_request_idempotency`. `FIN_POS_SALE_DUPLICATE` applies only to `pos_sales_session_sale_unique` conflicts or to a repeat of a same-occurrence sale identifier. No `FIN_POS_DUPLICATE_CART` and no unique cart-hash index. `pos_finalize_sale` requires an explicit `p_sale_date date NN` — no derivation from `CURRENT_DATE`.

### 1.5 Invoice-number generation

Repo scan produced zero DB functions matching `%invoice%number%` / `%next_invoice%` (§1.5b). Live examples (§1.5) show three coexisting formats:

- `INV-<random-base36>` (POS/legacy)
- `INV-<DOMAIN>-<slug>` (adapters, e.g. `INV-LAB-ML1AV2RK-3Q1U`, `INV-BREED-001`)
- `<Arabic-prefix>-YYYYMM-NNN` (e.g. `الم-202607-213`, `اسط-202607-740`, `ِAL-202605-927`, `SUL-202605-199`)

Frontend generators use `Date.now().toString(36)` (`EmbeddedCheckout.tsx` L120) and per-domain slug builders. There is **no server-side generator, no sequence, no counter**. Stage 6 therefore preserves the caller-supplied `p_invoice_number` with a tenant-scoped uniqueness check (`invoices_tenant_id_invoice_number_key` — verified in §1.14). **No `_finance_generate_invoice_number` helper is introduced.** F1 helper count does not include one.

### 1.6 `billing_links`

Live schema (see also `billing_links.schema.txt` in context): columns `id, tenant_id, source_type text NN, source_id uuid NN, invoice_id uuid NN, link_kind text NN, amount numeric(12,2) NULL, created_at, created_by`. CHECK `link_kind IN ('deposit','final','refund','credit_note')`. Indexes: PK; `idx_billing_links_invoice`, `_tenant`, `_tenant_source (tenant_id, source_type, source_id)` — **not unique**. FKs to invoices/tenants/profiles. RLS: two policies via `is_active_tenant_member`.

**No unique constraint** on `(tenant_id, source_type, source_id, link_kind)` exists today. `_finance_billing_link_upsert` (§5.3) is therefore **insert-or-verify by explicit prior SELECT**, not by ON CONFLICT. Absent `amount`/`period`/`currency`/etc. columns are not to be invented.

### 1.7 Existing `billing_links` census (§1.17 capture)

Live `source_type, link_kind, count` grouping produced (raw values preserved under `/tmp/s6/17_billing_links_source_census.txt`). Canonical Stage-6 values (A.8): `boarding`, `lab_request`, `doctor_consultation`, `vet_treatment`, `vaccination`, `breeding_attempt`, `pregnancy_check`, `foaling`, `pos_sale`. Any pre-existing rows using non-canonical values (`boarding_admission`, `primary`, …) remain untouched by Stage 6 and are quarantined for Stage 11 backfill review.

### 1.8 Lab join graph

`lab_requests → lab_horses → (lab_horses.client_id | party_horse_links) → clients`; services/prices via `lab_request_services → lab_services (with tenant_services fallback)`. Canonical predicate for `create_lab_invoice`:

```
resolved_client_id :=
  COALESCE(
    (SELECT client_id FROM public.lab_horses
      WHERE id = p_lab_horse_id AND tenant_id = p_tenant_id),
    (SELECT client_id FROM public.party_horse_links
      WHERE tenant_id = p_tenant_id
        AND lab_horse_id = p_lab_horse_id
        AND relationship_type IN ('lab_customer','payer')
      ORDER BY is_primary DESC, created_at ASC LIMIT 1)
  )
```

If `resolved_client_id IS NULL` and `p_client_id IS NOT NULL`, caller supplied client must satisfy the PHL predicate or `FIN_LAB_CLIENT_UNRELATED` is raised.

### 1.9 `party_horse_links`

Columns confirmed live: `id, tenant_id NN, client_id uuid NN → clients, lab_horse_id uuid NN → lab_horses, relationship_type text NN, is_primary bool NN default false, created_at, created_by`. Unique `uq_party_horse_links_unique (tenant_id, client_id, lab_horse_id, relationship_type)`; partial unique `uq_party_horse_links_one_primary (tenant_id, lab_horse_id, relationship_type) WHERE is_primary`. CHECK `relationship_type IN ('lab_customer','payer','owner','trainer','stable')`. No `horse_id` / `party_id` — the A.8/A.11 name substitution risk is closed.

### 1.10 `lab_horses.client_id` census

Live: total 21 rows across one tenant `348ce41c-…`, all with `client_id IS NULL`. Matches `docs/aml_1_b_1/stage_01_preflight/lab_horses_client_id_census.txt` exactly — zero drift. Consequence: every current tenant Lab invoice must resolve client via `party_horse_links` (or explicit `p_client_id` verified against PHL).

### 1.11 Package grouping

`invoice_items` has **no `parent_item_id` column**. Package rows carry `package_id`, `package_source`, `package_name_snapshot`, `package_name_ar_snapshot`, `package_price_snapshot numeric`, `package_currency_snapshot text`, `package_services_snapshot jsonb`. Live CHECK `invoice_items_service_package_exclusive_chk` forbids `service_id` and `package_id` on the same row. `service_source` is NOT NULL default `'tenant_services'`, restricted to `tenant_services|lab_services`. Package children are **contained inside `package_services_snapshot`**, not modelled as separate FK-linked child rows. Housing monthly rows remain standalone (no `package_id`).

### 1.12 Rounding, tax, discounts

`src/lib/taxUtils.ts` (59 lines) provides `computeTax(subtotal, rate, mode)` with `mode ∈ {'inclusive','exclusive'}` and two-decimal rounding at the item boundary via `Math.round(x*100)/100`. Header totals are recomputed as `sum(item.total_price)`. `discount_amount` applies at header level after item subtotal. Housing proration uses `boardingPeriodEngine.ts`. Full enumeration of every helper is **not exhaustively completed in this pass** (§9 unresolved: `ROUNDING_TAX_HELPERS_PARTIAL`).

### 1.13 External-provider predicates (verified)

- `vet_treatments.service_mode text NN DEFAULT 'external'` CHECK `IN ('internal','external')`; `external_provider_id uuid → service_providers`. Receivable-eligible ⇔ `service_mode = 'internal'`.
- `horse_vaccinations.service_mode text NN DEFAULT 'internal'` CHECK `IN ('internal','external')`; `external_provider_id`. Receivable-eligible ⇔ `service_mode = 'internal'`.
- `breeding_attempts.source_mode text NN DEFAULT 'internal'` CHECK `IN ('internal','connected','external')`; `provider_tenant_id`, `external_provider_name`. Receivable-eligible ⇔ `source_mode = 'internal'`.
- `pregnancy_checks` — **no `service_mode`/`source_mode` column**. All pregnancy checks are internal by construction. Receivable-eligible unconditionally when adapter invoked.
- `foalings` — **no `service_mode`/`source_mode` column**. All foalings are internal. Receivable-eligible unconditionally.

External writes (`vet_treatments.service_mode='external'`, etc.) route to `supplier_payables` via existing `createSupplierPayableForExternal` (`src/lib/finance/createSupplierPayableForExternal.ts`), not to `billing_links`.

### 1.14 Stage-6 uniqueness `23505` surface

Live unique constraints/indexes across the ten mutated tables (raw list in `/tmp/s6/14_unique_indexes.txt`):

| Object | Index | Key / predicate | Mapped `FIN_*` |
|---|---|---|---|
| invoices | `invoices_pkey` | `id` | replay-verify |
| invoices | `invoices_tenant_id_invoice_number_key` | `(tenant_id, invoice_number)` | `FIN_INVOICE_NUMBER_TAKEN` |
| invoice_items | `invoice_items_pkey` | `id` | replay-verify |
| ledger_entries | `ledger_entries_pkey` | `id` | replay-verify |
| ledger_entries | `ledger_entries_invoice_kind_unique_idx` | `(invoice_id, entry_type) WHERE entry_type='invoice' AND …` (Stage 3) | `FIN_LEDGER_INVOICE_DUPLICATE` |
| customer_balances | `customer_balances_pkey` | `id` | replay-verify |
| customer_balances | `customer_balances_tenant_id_client_id_key` | `(tenant_id, client_id)` | upsert path (never surfaced) |
| billing_links | `billing_links_pkey` | `id` | replay-verify |
| expenses | `expenses_pkey` | `id` | replay-verify |
| expenses | `expenses_source_unique_idx` | `(tenant_id, source_type, source_reference) WHERE source_type IS NOT NULL` | `FIN_EXPENSE_SOURCE_DUPLICATE` |
| expenses | `expenses_reverses_unique_idx` | `(reverses_expense_id) WHERE reverses_expense_id IS NOT NULL` | `FIN_EXPENSE_ALREADY_REVERSED` |
| finance_request_idempotency | `finance_request_idempotency_pkey` | `(tenant_id, operation, idempotency_key)` | idempotency replay/verify |
| pos_sales | `pos_sales_pkey` | `id` | replay-verify |
| pos_sales | `pos_sales_session_sale_unique` | `(tenant_id, session_id, sale_number)` | `FIN_POS_SALE_DUPLICATE` |
| pos_sessions | `pos_sessions_pkey` | `id` | replay-verify |
| pos_sessions | `ux_pos_sessions_one_open_per_branch` | `(tenant_id, COALESCE(branch_id, zero)) WHERE status='open'` | out of Stage-6 scope (session lifecycle) |
| payment_intents | `payment_intents_pkey` | `id` | replay-verify |
| hr_salary_payments | `hr_salary_payments_pkey` | `id` | replay-verify |
| inventory_* | see /tmp/s6/14_unique_indexes.txt | (POS finalize inventory adjustments — full mapping deferred, §9) | (unresolved) |

Every code path raising `23505` names the exact constraint and either replays via idempotency verification or maps to the tabled `FIN_*` code. Uncontrolled `ON CONFLICT DO UPDATE` is prohibited except on `customer_balances_tenant_id_client_id_key` (single-key upsert of the derived balance).

### 1.15 Stage 3 & Stage 5 no-drift gate

Stage 3 additive columns present:
- `ledger_entries.effective_date date NN DEFAULT CURRENT_DATE` — confirmed.
- Composite/unique indexes per D-07 — confirmed in §1.14.
- `expenses.ledger_status text NN DEFAULT 'unposted'` CHECK `IN ('unposted','posted','reversed')` — confirmed (`\d public.expenses`).
- `expenses.posted_at`, `expenses.ledger_entry_id`, `expenses.source_type`, `expenses.source_reference`, `expenses.reverses_expense_id` — confirmed.
- `invoices.corrects_invoice_id uuid → invoices(id)` — confirmed.
- `invoice_items` period-order CHECK — confirmed.
- `finance_request_idempotency` — schema per §0.1; row count = 0 (§1.16 census).
- `pos_sales` — schema per §1.4; `numeric(12,2)` on `subtotal|tax_amount|total_amount` confirmed. Row count = 0.

Stage 5 helpers (§/tmp/s6/21_helpers_count.txt):

```
_finance_advisory_lock_key(p_tenant_id uuid, p_operation text, p_idempotency_key uuid)
_finance_source_lock_key(p_tenant_id uuid, p_source_type text, p_source_id uuid)
_finance_request_hash(p_operation text, p_tenant_id uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb)
_finance_riyadh_date(p_ts timestamptz)
_finance_idempotency_begin(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb)
_finance_idempotency_complete(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_request_hash bytea, p_resolved_snapshot jsonb, p_response jsonb)
_finance_idempotency_purge_expired(p_cutoff timestamptz)
```

All 7 present. All owner postgres, `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE ALL FROM PUBLIC/anon/authenticated`. Only `_finance_idempotency_purge_expired` retains `service_role` EXECUTE.

### 1.16 Stage 4 permission no-drift gate

Live `permission_definitions` finance keys (§/tmp/s6/16, /25):

```
finance.adjustment.create, finance.expenses.approve, finance.expenses.create,
finance.expenses.manage, finance.invoice.approve, finance.invoice.cancel,
finance.invoice.create, finance.invoice.delete, finance.invoice.edit,
finance.invoice.markPaid, finance.invoice.print, finance.invoice.send,
finance.invoice.view, finance.ledger.view, finance.payables.manage,
finance.payment.collect, finance.payment.create, finance.payment.view,
finance.settings.manage
```

Count = 19 (matches Stage 4 post-migration count). POS keys present: `pos.discount.apply, pos.sale.create, pos.session.close, pos.session.open`. HR: `hr.manage`. Adapter keys `housing.manage`, `doctor.consultations.write`, `vet.manage`, `breeding.manage` are external to `finance.*` and enforced by `has_permission` at the adapter entry.

Stage 4 bundle bindings on `4d9b8917-f11d-4879-840d-1b682bad8cec` (كبير المشرفين) for `finance.invoice.approve`, `finance.invoice.cancel`, `finance.adjustment.create` retained — no drift; count of 17 bindings preserved.

### 1.17 Protected financial parity

Sentinel invoice `الم-202607-213` (id `bc37440d-d402-4e2b-96cd-67329456d0fd`, tenant `348ce41c-…`, status `approved`, total `50.00`) — unchanged from Stage 2 fingerprint. Row counts (§/tmp/s6/20_finance_row_counts.txt) captured live and match Stage 2/5 baselines within Stage-3 additive scope. `-213` remains excluded from any Stage-6 RPC path (§0.6).

---

## 2. Private-helper inventory (A.10)

Final evidence-based helper inventory. All helpers: owner `postgres`, `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`. Public RPCs invoke them; no direct EXECUTE grant.

### 2.1 Persistence helpers introduced by F1

| Helper | Signature | Responsibility |
|---|---|---|
| `_finance_invoice_persist` | `(p_tenant_id uuid, p_actor_id uuid, p_intent jsonb, p_mode text /* create|update */) RETURNS uuid` | Insert or update `invoices` header with strict allowlist (`invoice_number, client_id, client_name, status, issue_date, due_date, currency, notes, payment_method, corrects_invoice_id, pos_session_id`). Rejects unknown keys, caller-supplied totals, caller-supplied `tenant_id`, caller-supplied `created_by`. Sets `created_by = p_actor_id` on create. Returns invoice id. |
| `_finance_invoice_items_replace` | `(p_invoice_id uuid, p_items jsonb) RETURNS void` | Delete existing children then insert new set within the enclosing RPC transaction (no internal savepoint). Rolls back the entire RPC on any validation failure. Per-row allowlist: `description, quantity, unit_price, total_price, entity_type, entity_id, horse_id, lab_horse_id, domain, period_start, period_end, service_id, service_source, category_id, category_key, package_id, package_source, package_price_snapshot, package_currency_snapshot, package_services_snapshot, position`. Snapshot columns are re-populated by the existing `trg_invoice_items_fill_snapshots` trigger. |
| `_finance_billing_link_upsert` | `(p_tenant_id uuid, p_source_type text, p_source_id uuid, p_invoice_id uuid, p_link_kind text, p_amount numeric, p_actor_id uuid) RETURNS uuid` | Insert-or-verify. `SELECT … FOR UPDATE` on any existing `(tenant_id, source_type, source_id)` row via `idx_billing_links_tenant_source`. If none → insert new. If one exists with matching `(invoice_id, link_kind, amount)` → return existing id (safe replay). If one exists with different `invoice_id` or `link_kind` → raise `FIN_BILLING_LINK_CONFLICT` (23514). No `ON CONFLICT UPDATE`. |
| `_finance_ledger_insert` | `(p_tenant_id uuid, p_client_id uuid, p_invoice_id uuid, p_entry_type text, p_amount numeric, p_effective_date date, p_description text, p_created_by uuid, p_metadata jsonb) RETURNS uuid` | Acquire `pg_advisory_xact_lock(_finance_advisory_lock_key(p_tenant_id, 'ledger:client', p_client_id))` when `p_client_id IS NOT NULL`. Insert ledger row. When `p_client_id IS NULL`, set `balance_after = 0`, no balance chain, no `customer_balances` touched. When non-null, invoke `_finance_customer_balance_recompute(p_tenant_id, p_client_id)`. |
| `_finance_customer_balance_recompute` | `(p_tenant_id uuid, p_client_id uuid) RETURNS numeric` | Recompute the entire client chain: `SELECT … FROM ledger_entries WHERE tenant_id=… AND client_id=… ORDER BY effective_date, created_at, id FOR UPDATE`; running sum → `UPDATE ledger_entries SET balance_after = running` for every affected row; final `INSERT … ON CONFLICT (tenant_id, client_id) DO UPDATE SET balance = final, last_updated = now()` on `customer_balances`. Returns final balance. Removes reliance on `MAX(balance_after)` and append-only assumptions. |
| `_finance_expense_persist` | `(p_tenant_id uuid, p_actor_id uuid, p_intent jsonb, p_mode text /* create|update */) RETURNS uuid` | Insert/update `expenses` header via allowlist: `title, amount, currency, category_id, expense_date, notes, workflow status`. Reject `ledger_status`, `posted_at`, `ledger_entry_id`, `source_type`, `source_reference`, `reverses_expense_id` from caller intent — those are helper-owned. Sets `ledger_status='unposted'` on create. |
| `_finance_expense_post` | `(p_tenant_id uuid, p_expense_id uuid, p_actor_id uuid) RETURNS uuid` | Guard `ledger_status='unposted'` (`FIN_EXPENSE_ALREADY_POSTED` otherwise), insert one positive `ledger_entries` row with `entry_type='expense'` via `_finance_ledger_insert`, then `UPDATE expenses SET ledger_status='posted', posted_at=now(), ledger_entry_id=<new>`. Returns new ledger id. |
| `_finance_expense_reverse` | `(p_tenant_id uuid, p_source_expense_id uuid, p_actor_id uuid, p_reversal_date date) RETURNS uuid` | Guard: source `ledger_status='posted'`, `source_type IS NULL OR source_type <> 'hr_salary_payment'` (`FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`). Insert new `expenses` row with negated amount, `reverses_expense_id = p_source_expense_id`, `ledger_status='posted'`, call `_finance_expense_post` on it, then `UPDATE expenses SET ledger_status='reversed'` on source. Returns new expense id. |

### 2.2 Total F1 helper count: **8**

No `_finance_generate_invoice_number` (see §1.5). Stage 5 helpers remain 7. Total public-schema `_finance_*` after F1 = **15**.

---

## 3. Public RPC matrix (14 RPCs)

Each RPC below satisfies the twelve invariants (§0.2) and canonical order (§0.7). Only the differentiating fields are tabulated per RPC below to keep this document self-contained. Rollback for every F2/F3/F5 RPC = `DROP FUNCTION public.<name>(<exact args>);` in reverse creation order, no `CASCADE`.

### 3.1 `create_invoice_with_items` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice jsonb, p_items jsonb) RETURNS jsonb`
- **Operation:** `'create_invoice_with_items'`
- **Permission:** `finance.invoice.create`.
- **Source lock:** none (fresh invoice).
- **`FOR UPDATE`:** none.
- **Mutation order:** invariants 1–3 → `_finance_invoice_persist(…,'create')` → `_finance_invoice_items_replace(new_id, p_items)` → totals recompute via trigger — verify server-side by `SELECT sum(total_price) FROM invoice_items` → `_finance_idempotency_complete`.
- **Response:** `{ invoice_id, invoice_number, subtotal, tax_amount, total_amount, status:'draft' }`.
- **Errors:** `FIN_INVOICE_NUMBER_TAKEN` (23505 on `invoices_tenant_id_invoice_number_key`), `FIN_VALIDATION_ITEMS_EMPTY`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_CROSS_TENANT`.
- **Rejects:** `corrects_invoice_id` (manual create path), `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `created_by`.

### 3.2 `update_invoice_with_items` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_invoice jsonb, p_items jsonb) RETURNS jsonb`
- **Permission:** `finance.invoice.edit`.
- **Source lock:** `_finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)` → `SELECT … FROM invoices WHERE id = p_invoice_id AND tenant_id = p_tenant_id FOR UPDATE`.
- **Allowed start state:** `draft | reviewed`. Otherwise `FIN_INVOICE_LOCKED`.
- **Mutation order:** helpers `_finance_invoice_persist(…,'update')` → `_finance_invoice_items_replace`.
- **Response:** as §3.1.
- **Rejects:** `status`, `corrects_invoice_id`, totals, `created_by`.

### 3.3 `delete_draft_invoice` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid) RETURNS jsonb`
- **Permission:** `finance.invoice.delete` **and** `invoices.created_by = auth.uid()`.
- **Source lock + FOR UPDATE:** invoice.
- **Allowed start state:** `draft` only. Otherwise `FIN_DELETE_INVALID_STATE`.
- **Effect:** `DELETE FROM invoices WHERE id = p_invoice_id` (cascades to `invoice_items` and `billing_links`).
- **Response:** `{ invoice_id, deleted:true }`.

### 3.4 `approve_invoice` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date) RETURNS jsonb`
- **Permission:** `finance.invoice.approve`.
- **State machine:** §0.6. Zero-total invoices allowed to transition to `approved` but do not post ledger.
- **Mutation order:** lock invoice → validate state → `UPDATE invoices SET status='approved'` → if `total_amount > 0 AND client_id IS NOT NULL` → `_finance_ledger_insert(entry_type='invoice', amount=+total, effective_date=p_effective_date, invoice_id=…)`.
- **Errors:** `FIN_APPROVE_INVALID_STATE`, `FIN_LEDGER_INVOICE_DUPLICATE` (23505 replay-verified).

### 3.5 `cancel_invoice` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_cancellation_date date, p_reason text) RETURNS jsonb`
- **Permission:** `finance.invoice.cancel`.
- **State machine:** §0.6 in full.
- **Errors:** `FIN_CANCEL_INVALID_STATE`, `FIN_CANCEL_INVALID_STATE_USE_DELETE_DRAFT`, `FIN_INVOICE_HAS_PAYMENTS`, `FIN_LEDGER_INVOICE_MISSING` (approved with no canonical row).

### 3.6 `post_payment` (F2) — corrected per A.6

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_payee_account_id uuid, p_intent_type payment_intent_type, p_amount numeric, p_currency text, p_payment_date date, p_notes text) RETURNS jsonb`
- **Permission:** `finance.payment.create`.
- **Mutation order:** invariants 1–3 → `_finance_source_lock_key('invoice', p_invoice_id)` → `SELECT … FROM invoices … FOR UPDATE` → re-resolve `outstanding = total_amount − Σ(prior payment ledger)` → allocation/overpayment guard (§1.2) → validate `payment_accounts` (§1.3) → **INSERT `payment_intents`** with allowlisted columns (`payer_user_id=auth.uid()`, `payee_account_id=p_payee_account_id`, `tenant_id=p_tenant_id`, `intent_type=p_intent_type`, `reference_type='invoice'`, `reference_id=p_invoice_id`, `amount_display=to_char(p_amount,'FM999999999.00')`, `currency=p_currency`, `status='completed'`) → `_finance_ledger_insert(entry_type='payment', amount=-p_amount, effective_date=p_payment_date, invoice_id=p_invoice_id, metadata={payment_intent_id})` → server-derive invoice status (`partial|paid` per §1.2) `UPDATE invoices SET status=…` → `_finance_idempotency_complete`.
- **Payment date storage:** exclusively via RPC parameter → `ledger_entries.effective_date`. **No** `payment_date` / `paid_at` / `captured_at` column added to `payment_intents` (§1.1).
- **Response:** `{ invoice_id, payment_intent_id, ledger_entry_id, amount:p_amount, invoice_status, outstanding_after }`.
- **Errors:** `FIN_PAYMENT_ZERO_OR_NEGATIVE`, `FIN_PAYMENT_OVERPAYMENT`, `FIN_PAYMENT_ACCOUNT_INVALID`, `FIN_INVOICE_LOCKED`, `FIN_CURRENCY_MISMATCH`.

### 3.7 `create_expense` (F3)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_expense jsonb) RETURNS jsonb`
- **Permission:** `finance.expenses.create`.
- **Mutation:** `_finance_expense_persist(…, 'create')`. `ledger_status='unposted'`, no ledger effect. Rejects `source_type`, `source_reference`, `reverses_expense_id`.

### 3.8 `update_expense` (F3)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_expense jsonb) RETURNS jsonb`
- **Permission:** `finance.expenses.manage`.
- **Allowed start state:** `ledger_status='unposted'`. Otherwise `FIN_EXPENSE_LOCKED`.
- **Mutation:** `_finance_expense_persist(…, 'update')`.

### 3.9 `delete_expense` (F3)

- **Permission:** `finance.expenses.manage`.
- **Allowed start state:** `ledger_status='unposted'` AND `source_type IS NULL` (never delete HR-sourced expenses).
- **Effect:** `DELETE FROM expenses`.

### 3.10 `post_expense_with_ledger` (F3)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_effective_date date) RETURNS jsonb`
- **Permission:** `finance.expenses.approve`.
- **Mutation:** `_finance_expense_post(p_tenant_id, p_expense_id, auth.uid())`.
- **Errors:** `FIN_EXPENSE_ALREADY_POSTED`.

### 3.11 `reverse_expense` (F3)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_reversal_date date) RETURNS jsonb`
- **Permission:** `finance.expenses.manage`.
- **Mutation:** `_finance_expense_reverse`.
- **Errors:** `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`, `FIN_EXPENSE_ALREADY_REVERSED` (23505 on `expenses_reverses_unique_idx`), `FIN_EXPENSE_NOT_POSTED`.

### 3.12 `post_manual_ledger_adjustment` (F2)

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid, p_amount numeric, p_effective_date date, p_description text) RETURNS jsonb`
- **Permission:** `finance.adjustment.create`.
- **Mutation:** `_finance_ledger_insert(entry_type='adjustment', invoice_id=NULL, amount=p_amount, …)`. Rejects `p_client_id IS NULL`.

### 3.13 `pos_finalize_sale` (F5) — corrected per A.7

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_session_id uuid, p_sale_date date, p_cart jsonb, p_client_id uuid, p_payee_account_id uuid, p_payment_intent_type payment_intent_type) RETURNS jsonb`
- **Permission:** `pos.sale.create`.
- **Mutation order (atomic):**
  1. Verify `pos_sessions.status='open' AND tenant_id=p_tenant_id`.
  2. `_finance_idempotency_begin`.
  3. `_finance_source_lock_key(p_tenant_id, 'pos_session', p_session_id)` + `SELECT … FROM pos_sessions … FOR UPDATE`.
  4. Allocate `sale_number := 1 + COALESCE((SELECT max(sale_number) FROM pos_sales WHERE tenant_id=p_tenant_id AND session_id=p_session_id), 0)`.
  5. INSERT `pos_sales` with `cart_hash = encode(digest(p_cart::text,'sha256'),'hex')`, `subtotal/tax_amount/total_amount` recomputed server-side, `currency`, `created_by=auth.uid()`. On 23505 (`pos_sales_session_sale_unique`) → replay-verify by idempotency; if different key → retry sale_number allocation once, else `FIN_POS_SALE_DUPLICATE`.
  6. Inventory validation & mutation — **DEFERRED to F5 implementation, current chain unresolved (§9 `POS_INVENTORY_CHAIN_UNVERIFIED`)**.
  7. INSERT `invoices` with `status='paid'`, `pos_session_id=p_session_id`, `payment_method` derived from `p_payment_intent_type`.
  8. `_finance_invoice_items_replace(invoice.id, cart_items)`.
  9. INSERT one `payment_intents` row per §3.6 rules with `reference_type='invoice'`, `reference_id=invoice.id`, `status='completed'`.
  10. `_finance_ledger_insert(entry_type='invoice', +total, effective_date=p_sale_date)` and `_finance_ledger_insert(entry_type='payment', -total, effective_date=p_sale_date, metadata={payment_intent_id, pos_sale_id})`.
  11. `_finance_billing_link_upsert(p_tenant_id, 'pos_sale', pos_sales.id, invoice.id, 'final', total)`.
  12. If `p_client_id IS NOT NULL` → `_finance_customer_balance_recompute` (already fired inside `_finance_ledger_insert` for non-null client).
  13. `UPDATE pos_sessions SET updated_at = now()` (session totals — full counter design deferred, §9).
  14. `UPDATE pos_sales SET invoice_id = invoice.id`.
  15. `_finance_idempotency_complete` with `{ pos_sale_id, invoice_id, invoice_number, ledger_invoice_id, ledger_payment_id, payment_intent_id, total }`.

- **No unique cart_hash index. No `FIN_POS_DUPLICATE_CART`.** `cart_hash` remains audit-only.

### 3.14 `record_salary_payment` (F3) — corrected per A.9

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid, p_amount numeric, p_currency text, p_paid_at timestamptz, p_payment_period text, p_notes text, p_create_expense boolean) RETURNS jsonb`
- **Permission:** `hr.manage`.
- **Mutation order:**
  1. Invariants 1–3.
  2. Validate employee (`hr_employees.tenant_id = p_tenant_id`), currency, `p_amount > 0`, `p_paid_at IS NOT NULL`.
  3. INSERT `hr_salary_payments` (`tenant_id, employee_id, amount, currency, paid_at, payment_period, notes, created_by=auth.uid()`) → capture `salary_id`.
  4. If `p_create_expense = false` → complete idempotency with `{ salary_payment_id: salary_id, finance_expense_id: null, ledger_entry_id: null }`.
  5. If `p_create_expense = true`:
     - `expense_date := _finance_riyadh_date(p_paid_at)`.
     - `expense_id := _finance_expense_persist(p_tenant_id, auth.uid(), jsonb_build_object('title', 'Salary ' || p_payment_period, 'amount', p_amount, 'currency', p_currency, 'expense_date', expense_date, 'status', 'approved', 'source_type', 'hr_salary_payment', 'source_reference', salary_id::text), 'create')`. On 23505 `expenses_source_unique_idx` → `FIN_EXPENSE_SOURCE_DUPLICATE`.
     - `ledger_id := _finance_expense_post(p_tenant_id, expense_id, auth.uid())`.
     - `UPDATE hr_salary_payments SET finance_expense_id = expense_id WHERE id = salary_id` (FK `hr_salary_payments_expense_fk` confirmed live §1 capture).
     - Complete idempotency with `{ salary_payment_id, finance_expense_id: expense_id, ledger_entry_id: ledger_id }`.
- **Reversal:** `reverse_expense` on an `hr_salary_payment`-sourced expense raises `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`. No supplier-payable / no `billing_links` row.

---

## 4. Adapter matrix (6 adapters, F4)

All adapters: idempotency + permission `finance.invoice.create` + domain permission (§0.7). Every adapter emits exactly one `billing_links` row with `link_kind='final'` and canonical `source_type` (§0.7 mapping A.8).

### 4.1 Housing adapter — `create_invoice_from_admission`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_boarding_admission_id uuid, p_period_start date, p_period_end date, p_corrects_invoice_id uuid, p_extra jsonb) RETURNS jsonb`
- **Domain permission:** `housing.manage`.
- **Source lock + FOR UPDATE:** `boarding_admissions`.
- **Domain authority:** `boarding_admissions` per §D.1.4.
- **Range rules:** `p_period_start <= p_period_end`; `p_period_end := LEAST(p_period_end, Riyadh_month_end(p_period_start), COALESCE(checked_out_at::date, 'infinity'))`. `expected_departure` is warning-only. `checked_out = true AND checked_out_at IS NULL` → `FIN_HOUSING_INCONSISTENT_ADMISSION`.
- **Overlap query (corrected per A.8, closed/closed intersection):**

```sql
SELECT bl.invoice_id, i.invoice_number, ii.period_start, ii.period_end
FROM public.billing_links bl
JOIN public.invoices i        ON i.id = bl.invoice_id
JOIN public.invoice_items ii  ON ii.invoice_id = bl.invoice_id
WHERE bl.tenant_id  = p_tenant_id
  AND bl.source_type = 'boarding'
  AND bl.source_id   = p_boarding_admission_id
  AND i.status IN ('draft','reviewed','issued','approved','shared','partial','paid','overdue')
  AND ii.period_start IS NOT NULL
  AND ii.period_end   IS NOT NULL
  AND ii.period_start <= p_period_end
  AND ii.period_end   >= p_period_start
FOR UPDATE OF i;
```

On any row → raise `SQLSTATE 23P01 FIN_HOUSING_PERIOD_ALREADY_INVOICED` with details `{ conflicting_invoice_number, conflicting_period_start, conflicting_period_end }`.
- **Corrective rebill:** `p_corrects_invoice_id` accepted only if referenced invoice is same tenant, `status='cancelled'`, same `source_id=p_boarding_admission_id`, and its `period_start/period_end` range covers the requested range. Cancellation alone is insufficient; the field is mandatory to opt-in.
- **Line generation:** monthly proration via `boardingPeriodEngine.ts`, one standalone `invoice_items` row per month (no package collapse).
- **Final link:** `_finance_billing_link_upsert(p_tenant_id, 'boarding', p_boarding_admission_id, invoice.id, 'final', total)`.
- **External predicate:** N/A (Housing is always internal receivable).
- **Errors:** `FIN_HOUSING_PERIOD_ALREADY_INVOICED` (23P01), `FIN_HOUSING_INCONSISTENT_ADMISSION`, `FIN_HOUSING_RANGE_INVALID`, `FIN_HOUSING_ADMISSION_UNKNOWN`.

### 4.2 Laboratory adapter — `create_lab_invoice`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_lab_request_id uuid, p_lab_horse_id uuid, p_client_id uuid, p_corrects_invoice_id uuid) RETURNS jsonb`
- **Domain permission:** `has_internal_capability(p_tenant_id, 'laboratory')`.
- **Source lock + FOR UPDATE:** `lab_requests`.
- **Client resolution:** predicate in §1.8. Errors: `FIN_LAB_HORSE_UNKNOWN`, `FIN_LAB_HORSE_CROSS_TENANT`, `FIN_LAB_CLIENT_UNRELATED`.
- **Lines:** from `lab_request_services` joined to `lab_services` (per-service pricing snapshot). `service_source='lab_services'` on each `invoice_items` row; `lab_horse_id = p_lab_horse_id`.
- **Final link:** `('lab_request', p_lab_request_id, invoice.id, 'final', total)`.
- **External predicate:** N/A (Lab is internal by construction).

### 4.3 Doctor adapter — `create_doctor_invoice`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_consultation_id uuid, p_corrects_invoice_id uuid) RETURNS jsonb`
- **Domain permission:** `doctor.consultations.write`.
- **Source lock:** `doctor_consultations`.
- **External predicate:** none — Doctor module has no `service_mode` column captured. All consultations receivable-eligible.
- **Final link:** `('doctor_consultation', p_consultation_id, invoice.id, 'final', total)`.

### 4.4 Vet adapter — `create_vet_invoice`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_vet_treatment_id uuid, p_corrects_invoice_id uuid) RETURNS jsonb`
- **Domain permission:** `vet.manage`.
- **External predicate (§1.13):** `service_mode = 'internal'`. `service_mode='external'` → `FIN_VET_EXTERNAL_NOT_RECEIVABLE` — those flow through `createSupplierPayableForExternal`, never `billing_links`.
- **Final link:** `('vet_treatment', p_vet_treatment_id, invoice.id, 'final', total)`.

### 4.5 Vaccination adapter — `create_vaccination_invoice`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_vaccination_id uuid, p_corrects_invoice_id uuid) RETURNS jsonb`
- **Domain permission:** `vet.manage`.
- **External predicate (§1.13):** `horse_vaccinations.service_mode = 'internal'`. Else `FIN_VACCINATION_EXTERNAL_NOT_RECEIVABLE`.
- **Final link:** `('vaccination', p_vaccination_id, invoice.id, 'final', total)`.

### 4.6 Breeding adapter — `create_breeding_invoice`

- **Signature:** `(p_tenant_id uuid, p_idempotency_key uuid, p_source_type text /* breeding_attempt|pregnancy_check|foaling */, p_source_id uuid, p_corrects_invoice_id uuid) RETURNS jsonb`
- **Domain permission:** `breeding.manage`.
- **External predicate:** for `breeding_attempt` → `source_mode='internal'` (§1.13). For `pregnancy_check` and `foaling` → unconditional internal (no `service_mode`/`source_mode` column per §1.13). Non-internal `breeding_attempt` → `FIN_BREEDING_EXTERNAL_NOT_RECEIVABLE`.
- **Final link `source_type`:** `'breeding_attempt' | 'pregnancy_check' | 'foaling'` (canonical A.8).

---

## 5. Payload contracts

Universal rejection rules (A.12) apply to every payload:

- Reject caller-supplied final status (`status`, `ledger_status`).
- Reject caller-supplied `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `balance_after`.
- Reject caller `tenant_id`, `created_by`.
- Reject manual-invoice source-link identity (`corrects_invoice_id` on `create_invoice_with_items`).
- Reject source identity not matching adapter signature (e.g. `p_boarding_admission_id` on lab adapter).
- Reject caller `unit_price` when catalog service/package eligibility controls price.
- Reject system-managed expense fields (`source_type`, `source_reference`, `posted_at`, `ledger_entry_id`, `reverses_expense_id`).

**Payload metadata columns for each of the 12 payloads** (Create/Update Invoice, Approve/Cancel Invoice, Post Payment, Create/Update/Post/Reverse Expense, Manual Adjustment, POS Finalize, Salary Payment): **required?, PostgreSQL type, caller-supplied vs server-resolved, editable-state, validation source, in-request-hash?, in-resolved-snapshot?, in-response?, accepted-or-rejected**. The per-field enumeration is captured in the adjacent artifact `PAYLOAD_CONTRACTS.md` (not written in this pass — see §9 `PAYLOAD_CONTRACTS_ARTIFACT_MISSING`).

---

## 6. Repository writer census

Baseline: 57 sites (prior report). Current sweep via `rg -n 'from."(invoices|invoice_items|ledger_entries|expenses|payment_intents|pos_sales|pos_sessions|billing_links|customer_balances|hr_salary_payments)"'` located **≥16 files** touching finance tables at the top level (`src/lib/finance/*`, `src/hooks/finance/*`, `src/hooks/pos/*`, `src/hooks/clients/*`, `src/components/finance/*`, `src/components/pos/*`, `src/components/clients/*`, `src/components/housing/AdmissionDetailSheet.tsx`, `src/pages/finance/*`). Full field-mapping, mutation-order, validation, permission, replacement-RPC/adapter matrix per site is **not enumerated in this pass** — this pass records the file surface only. Stage 8 owns the actual migration.

Unresolved: `CURRENT_WRITER_CENSUS_INCOMPLETE` (§9).

---

## 7. Migration grouping (A.16)

| Migration | Scope | Depends on |
|---|---|---|
| **F0** | Widen `ledger_entries_entry_type_check` from `{invoice, payment, credit, adjustment}` to `{invoice, payment, credit, adjustment, expense}` | Stage 3 |
| **F1** | 8 private persistence helpers (§2.1) | Stage 5 helpers |
| **F2** | Invoice CRUD/approve/cancel + `post_payment` + `post_manual_ledger_adjustment` | F0, F1 |
| **F3** | Expense CRUD/post/reverse + `record_salary_payment` | F0, F1 |
| **F4** | Six domain adapters | F1, F2 |
| **F5** | `pos_finalize_sale` | F1, F2 |
| **F6** | Grant sweep, catalog verification, non-mutating smoke checks | all |

Each migration has its own guarded rollback artifact. Rollback order: **F6 → F5 → F4 → F3 → F2 → F1 → F0**. Within each, DROP FUNCTION in reverse creation order, no `CASCADE`. F0 rollback aborts if any `entry_type='expense'` row exists.

### 7.1 F0 forward SQL

```sql
BEGIN;

-- Pre-guard: exact current constraint name & definition
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO d
  FROM pg_constraint
  WHERE conrelid = 'public.ledger_entries'::regclass
    AND conname  = 'ledger_entries_entry_type_check';
  IF d IS NULL OR d NOT LIKE '%invoice%payment%credit%adjustment%' OR d LIKE '%expense%' THEN
    RAISE EXCEPTION 'AML.1.b.1 F0 ABORT: unexpected ledger_entries_entry_type_check definition: %', d;
  END IF;
END $$;

-- Pre-guard: zero existing expense rows
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE entry_type = 'expense') THEN
    RAISE EXCEPTION 'AML.1.b.1 F0 ABORT: entry_type=expense rows already exist.';
  END IF;
END $$;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN ('invoice','payment','credit','adjustment','expense'));

-- Post-verify
DO $$ DECLARE d text; BEGIN
  SELECT pg_get_constraintdef(oid) INTO d
  FROM pg_constraint
  WHERE conrelid = 'public.ledger_entries'::regclass
    AND conname  = 'ledger_entries_entry_type_check';
  IF d NOT LIKE '%expense%' THEN
    RAISE EXCEPTION 'AML.1.b.1 F0 POSTVERIFY FAIL: %', d;
  END IF;
END $$;

COMMIT;
```

### 7.2 F0 guarded rollback SQL

```sql
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE entry_type = 'expense') THEN
    RAISE EXCEPTION
      'AML.1.b.1 F0 ROLLBACK ABORT: expense ledger rows exist; roll back Stage 6 expense effects from keyed preimages before restoring the four-value constraint.';
  END IF;
END $$;

DO $$ DECLARE d text; BEGIN
  SELECT pg_get_constraintdef(oid) INTO d
  FROM pg_constraint
  WHERE conrelid = 'public.ledger_entries'::regclass
    AND conname  = 'ledger_entries_entry_type_check';
  IF d IS NULL OR d NOT LIKE '%expense%' THEN
    RAISE EXCEPTION 'AML.1.b.1 F0 ROLLBACK ABORT: current constraint is not the five-value form.';
  END IF;
END $$;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN ('invoice','payment','credit','adjustment'));

COMMIT;
```

---

## 8. A.15 replacement — Stage 5 rollback dependency guard

**Prescribed later edit for `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql`. Not applied in this pass.**

```sql
DO $g$
DECLARE
  helpers text[] := ARRAY[
    '_finance_advisory_lock_key',
    '_finance_source_lock_key',
    '_finance_request_hash',
    '_finance_riyadh_date',
    '_finance_idempotency_begin',
    '_finance_idempotency_complete',
    '_finance_idempotency_purge_expired'
  ];
  s6_names text[] := ARRAY[
    -- Public RPCs (F2–F5)
    'create_invoice_with_items',
    'update_invoice_with_items',
    'delete_draft_invoice',
    'approve_invoice',
    'cancel_invoice',
    'post_payment',
    'create_expense',
    'update_expense',
    'delete_expense',
    'post_expense_with_ledger',
    'reverse_expense',
    'post_manual_ledger_adjustment',
    'pos_finalize_sale',
    'record_salary_payment',
    'create_invoice_from_admission',
    'create_lab_invoice',
    'create_doctor_invoice',
    'create_vet_invoice',
    'create_vaccination_invoice',
    'create_breeding_invoice',
    -- F1 private persistence helpers (evidence-verified inventory §2.1)
    '_finance_invoice_persist',
    '_finance_invoice_items_replace',
    '_finance_billing_link_upsert',
    '_finance_ledger_insert',
    '_finance_customer_balance_recompute',
    '_finance_expense_persist',
    '_finance_expense_post',
    '_finance_expense_reverse'
  ];
BEGIN
  -- 1. Catalog dependencies via pg_depend
  IF EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_proc  p  ON p.oid = d.refobjid
    JOIN pg_proc  dp ON dp.oid = d.objid
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (helpers)
      AND dp.oid <> p.oid
  ) THEN
    RAISE EXCEPTION 'STAGE5_ROLLBACK_ABORT_DEP: catalog dependants exist.';
  END IF;

  -- 2. Stage 6 functions still installed?
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = ANY (s6_names)
  ) THEN
    RAISE EXCEPTION 'STAGE5_ROLLBACK_ABORT_S6: Stage 6 functions remain installed.';
  END IF;

  -- 3. Textual scan across only functions/procedures (prokind IN ('f','p'))
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    CROSS JOIN unnest(helpers) h(name)
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prokind IN ('f','p')
      AND p.proname <> ALL (helpers)
      AND pg_get_functiondef(p.oid) ~ ('\m' || h.name || '\M')
  ) THEN
    RAISE EXCEPTION 'STAGE5_ROLLBACK_ABORT_TEXT: a public function body references a Stage 5 helper.';
  END IF;
END
$g$;
```

---

## 9. Unresolved / evidence-blocked identifiers

The following mechanical inputs remain **unresolved** at the end of this pass and are the exact list surfaced in the terminal readiness line:

1. **`POS_INVENTORY_CHAIN_UNVERIFIED`** — the full inventory validation/mutation chain performed during POS finalize (order across `inventory_items`, `inventory_transactions`, `inventory_movements`, `stock_levels`, `warehouses`; allow-negative rules; per-line warehouse selection; failure/rollback contract) has not been walked end-to-end in the repository. `pos_finalize_sale` step 6 (§3.13) is therefore under-specified.
2. **`ROUNDING_TAX_HELPERS_PARTIAL`** — `computeTax`, header/item rounding, discount ordering, and Housing proration helpers have been located but not exhaustively enumerated with call-site parity. Server-side recompute logic must match the frontend helper set exactly to preserve totals.
3. **`CURRENT_WRITER_CENSUS_INCOMPLETE`** — §6 lists file surface but not the 57-row field-mapping / mutation-order / validation / permission / replacement-RPC matrix. Stage 8 depends on this being complete.
4. **`PAYLOAD_CONTRACTS_ARTIFACT_MISSING`** — the field-by-field 10-column contract for each of the 12 payloads (§5) is referenced but not written as a companion artifact in this pass.
5. **`INVOICE_NUMBER_TENANT_DOMAIN_RULES_UNENUMERATED`** — §1.5 establishes that server-side generation is not adopted and that the caller-supplied number is preserved under uniqueness, but the exact per-tenant / per-domain / per-POS format rules that the frontend applies today are not tabulated for enforcement of any validation regex in Stage 6. This affects error-mapping only, not core mutation safety.
6. **`INVENTORY_UNIQUE_INDEX_MAP_INCOMPLETE`** — §1.14 leaves the inventory tables' unique-index-to-`FIN_*` mapping deferred, contingent on resolving #1.

No entry in this list is inferred; each corresponds to a section of the corrective pass whose evidence was not captured in-session at the fidelity A.18 demands.

---

## 10. Terminal readiness

Per A.18: `READY` requires every mechanical input captured and every A.1–A.17 contradiction removed. Six identifiers remain unresolved (§9). Therefore:

```
AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [POS_INVENTORY_CHAIN_UNVERIFIED, ROUNDING_TAX_HELPERS_PARTIAL, CURRENT_WRITER_CENSUS_INCOMPLETE, PAYLOAD_CONTRACTS_ARTIFACT_MISSING, INVOICE_NUMBER_TENANT_DOMAIN_RULES_UNENUMERATED, INVENTORY_UNIQUE_INDEX_MAP_INCOMPLETE], READ-ONLY, ZERO MUTATIONS.
```
