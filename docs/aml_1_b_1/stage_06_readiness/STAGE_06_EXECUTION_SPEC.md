# AML.1.b.1 — STAGE 6 EXECUTION SPECIFICATION

**Pass:** Mechanical correction pass (A.1–A.18 applied throughout; blocker-resolution integration §1.4, §1.5, §1.12, §1.14, §3.13, §5, §6).
**Mode:** Read-only investigative + single documentation write.
**Repository effect of this pass:** rewrite of this exact file only. No database DDL/DML, no migration tool calls, no other file edited. `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql` was **not** edited — the A.15 replacement guard appears below as a prescribed later edit.
**Prior READY/BLOCKED decisions are withdrawn.** This document supersedes them coherently — no errata section.

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
9. Totals recomputed server-side via §1.12 canonical algorithm; caller-supplied `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `balance_after` rejected.
10. Ledger insertion via `_finance_ledger_insert` (see §2.1); balance chain rebuilt per client via `_finance_customer_balance_recompute`.
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
| `23514` | validation / state-machine invariant / hash mismatch — `FIN_VALIDATION_*`, `FIN_*_INVALID_STATE`, `FIN_IDEMPOTENCY_MISMATCH`, `FIN_BILLING_LINK_CONFLICT` |
| `23P01` | Housing period exclusion (§4.1) — `FIN_HOUSING_PERIOD_ALREADY_INVOICED` |
| `23505` | unique-constraint conflicts — routed per §1.14 table |
| `40001` | idempotency reservation in progress — retry same key at 100/300/900 ms |
| `P0001` | named business rules (e.g. `FIN_INVOICE_HAS_PAYMENTS`, `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`, `FIN_POS_SALE_DUPLICATE`) |

Every surfaced database error begins with a stable `FIN_*` code. Existing locked codes are preserved verbatim — no new synonyms.

---

## 1. Live catalog and no-drift capture (A.11 items 1–17)

All queries executed read-only via `psql` against the current project database on **2026-07-20**. Raw output captured under `/tmp/s6/` during this pass; concrete summaries follow.

### 1.1 `payment_intents`

Live columns: `id uuid PK`, `payer_user_id uuid NN → profiles(id)`, `payee_account_id uuid NN → payment_accounts(id)`, `tenant_id uuid → tenants(id)`, `intent_type payment_intent_type NN`, `reference_type payment_reference_type NN`, `reference_id uuid NN`, `amount_display text`, `currency text NN DEFAULT 'SAR'`, `status payment_status NN DEFAULT 'draft'`, `created_at/updated_at`. Indexes: PK; `idx_payment_intents_payer`, `_reference (reference_type,reference_id)`, `_status`, `_tenant`. RLS: 5 policies (permission-based view/update by `finance.payment.view/create`; owner-scoped insert/update/view). Triggers: `update_payment_intents_updated_at`, `validate_payment_intent_trigger`.

**Consequence for `post_payment`:** `payment_intents` carries no `payment_date` / `paid_at` / `captured_at` column — the explicit payment date lives in the RPC parameter `p_payment_date date NN` and is copied to `ledger_entries.effective_date`. `intent_type`, `reference_type`, and `status` are user-defined enums — payload `p_intent_type`, `p_reference_type`, and the server-derived `status` must be validated against the enums at write time.

### 1.2 Payment allocation

Repo inspection: `src/lib/finance/postLedgerForPayments.ts`, `src/components/pos/EmbeddedCheckout.tsx`, `src/hooks/pos/usePOSCore.ts`, `src/hooks/finance/useInvoicePayments.ts`, `src/components/finance/InvoiceDetailsSheet.tsx`. Current rules: single-invoice allocation per payment event; outstanding = `invoice.total_amount − Σ prior payment ledger rows`; over-allocation surfaces via UI validation only. **`FIN_PAYMENT_OVERPAYMENT` is enforced server-side** in `post_payment` — payment amount must satisfy `0 < p_amount ≤ outstanding + epsilon(0.01)`. `FIN_PAYMENT_ZERO_OR_NEGATIVE` for `p_amount ≤ 0`. Derived invoice status: `Σ payments < total` ⇒ `partial`; `Σ payments = total` (within 0.01) ⇒ `paid`.

### 1.3 `payment_accounts` and payment methods

Live columns per `\d public.payment_accounts` (§1 capture): `id`, `tenant_id`, `name`, `account_kind`, `is_active`. `post_payment` validates `payee_account.tenant_id = p_tenant_id AND is_active = true`; else `FIN_PAYMENT_ACCOUNT_INVALID`. Allowed methods derive from the live `payment_intent_type` enum (enforced by enum, not by repo constant).

### 1.4 POS mutation chain — VERIFIED COMPLETE (blocker `POS_INVENTORY_CHAIN_UNVERIFIED` resolved)

#### 1.4a Live inventory-related objects present

Live tables (§1 catalog sweep `pg_class` where relname ~* `(pos|inventory|stock|warehouse|product|movement|transaction)`):

- `public.pos_sessions` — session ledger, PK `id`, unique `ux_pos_sessions_one_open_per_branch` (partial, `status='open'`).
- `public.pos_sales` — sale ledger, PK `id`, unique `pos_sales_session_sale_unique (tenant_id, session_id, sale_number)`, columns per §3.13.
- `public.inventory_items` — stocked SKUs (`current_quantity numeric NN DEFAULT 0`).
- `public.inventory_transactions` — stock-in/out ledger; trigger `trg_sync_inventory_quantity` maintains `inventory_items.current_quantity`; trigger `trg_inventory_tx_tenant_parity` enforces tenant parity.
- `public.inventory_movements` — parallel movement ledger keyed on `products` + `warehouses`.
- `public.stock_levels` — per-`(product_id, warehouse_id)` on-hand and reserved balances.
- `public.warehouses`, `public.products`, `public.product_categories` — product master hierarchy.

#### 1.4b Repository writer sweep across POS finalization

Enumerated via `rg -n '\.from\(...' src/components/pos src/hooks/pos src/pages/finance`:

- `src/hooks/pos/usePOSSessions.ts` — reads/writes `pos_sessions` (open/close/read); reads `invoices` for session totals aggregation. Does not touch inventory.
- `src/hooks/pos/usePOSCore.ts` — writes `invoices` (INSERT), `invoice_items` (INSERT); on client-present path calls `postLedgerForInvoice`. Does **not** write `pos_sales`, `stock_levels`, `inventory_movements`, `inventory_transactions`, `products`, or `warehouses`.
- `src/components/pos/EmbeddedCheckout.tsx` — writes `invoices` (INSERT), `invoice_items` (INSERT); optional `postLedgerForInvoice`; `createLinkAsync` writes `billing_links(source_type=<caller>, link_kind='final')`. Does **not** touch inventory or `pos_sales`.
- `src/components/pos/POSCatalogGrid.tsx` — read-only catalog UI over `tenant_services` (services, not products).
- `src/pages/finance/DashboardFinancePOS.tsx` — read-only session dashboard.

No POS finalize path currently INSERTs into `pos_sales`, `inventory_transactions`, `inventory_movements`, or `stock_levels`. The POS catalog is a **service** catalog (`tenant_services`), not a stocked-goods catalog. `products`/`stock_levels` are provisioned in the schema but are not wired to the POS surface.

Fact of record: `CURRENT_POS_INVENTORY_MUTATION = NONE`.

#### 1.4c Current POS finalize sequence (as it runs today)

```
open-session check (client-side selection of active pos_sessions row)
→ cart line-item validation (client-side missing-price guard, EmbeddedCheckout L92-96)
→ inventory availability          — NONE (POS does not track SKU on-hand)
→ inventory mutation              — NONE
→ INSERT invoices (paid/issued, pos_session_id set on POS path)
→ INSERT invoice_items (one per cart row, entity_type='pos_sale')
→ conditional postLedgerForInvoice (client_id present only)
→ INSERT billing_links (link_kind='final')  — EmbeddedCheckout only
→ session counters/totals         — NONE (aggregated on read via invoices query)
```

#### 1.4d Stage 6 `pos_finalize_sale` inventory clause

Because Stage 6 is a mechanical wrap of *existing* POS behaviour with no PLAN-LOCK item introducing stocked-goods POS, and because the POS surface sells services not stocked SKUs, `pos_finalize_sale` **does not perform inventory mutation**. The clause is fully populated below (§3.13, step 6) as a deterministic no-op that documents the omission and rejects any caller attempt to pass stock-affecting fields (`sku`, `warehouse_id`, `product_id`, `stock_movement`). Stocked-goods POS is out of AML.1.b.1 scope; when introduced, it becomes an additive extension to this contract (documented rejection today ⇒ safe forward compatibility). §1.14 correspondingly excludes inventory tables from the Stage-6 `23505` map.

### 1.5 Invoice-number generation — VERIFIED (blocker `INVOICE_NUMBER_TENANT_DOMAIN_RULES_UNENUMERATED` resolved)

#### 1.5a Persisted-format census

Live aggregate over `public.invoices` (prefix = leading `[A-Za-z\u0621-\u064A-]+` run):

| Tenant | Prefix bucket | Row count | Domain surface |
|---|---|---|---|
| `348ce41c-…` | `INV-LAB-…` (`ML`, `MMA`, `MLE`, `MLU`, `MLBM`, `MLBKRP`, `MLBDV`, `MLWQMSK`, `MLAEBDG`, `MLADGLZY-ZAVV`, …) | 6 + 12 singletons | Laboratory adapter |
| `348ce41c-…` | `الم-YYYYMM-NNN` | 3 | Manual invoice (Arabic prefix) |
| `145f2128-…` | `اسط-YYYYMM-NNN` | 4 | Manual invoice (Arabic prefix) |
| `145f2128-…` | `INV-MN…`, `INV-MMQ`, `INV-MMO`, `INV-MP…`, `INV-MQ`, `INV-MNDH`, `INV-MNAVS`, `INV-MNAVRSR`, `INV-LAB-MMOR` | 3+2+1+2+1+2+1+1+1 | Domain adapter (base36 slug) |
| `145f2128-…` | `INV-BREED-###` | 2 | Breeding adapter |
| `8951ac1a-…` | `SUL-YYYYMM-NNN` | 1 | Manual invoice (Arabic-derived Latin prefix) |
| `8951ac1a-…` | `INV-MOYRUUPE`, `INV-MOYUMW` | 2 | Domain adapter (base36) |
| `1298be8b-…` | `` (empty prefix) | 1 | Legacy/imported |

No single tenant enforces one format. Format choice today is caller-surface-driven, not tenant-driven.

#### 1.5b Generator census

Every current generator is caller-side. Verified inventory:

| Generator | Site | Format |
|---|---|---|
| `` `POS-${Date.now().toString(36).toUpperCase()}` `` | `src/hooks/pos/usePOSCore.ts:113` | `POS-<base36>` |
| `` `INV-${Date.now().toString(36).toUpperCase()}` `` | `src/components/pos/EmbeddedCheckout.tsx:111` | `INV-<base36>` |
| `` `INV-${Date.now().toString(36).toUpperCase()}` `` | `src/components/vet/CreateInvoiceFromVaccination.tsx:127` | `INV-<base36>` |
| `` `INV-${Date.now().toString(36).toUpperCase()}` `` | `src/components/vet/CreateInvoiceFromTreatment.tsx:136` | `INV-<base36>` |
| `` `INV-${Date.now().toString(36).toUpperCase()}` `` | `src/components/breeding/CreateInvoiceFromBreedingEvent.tsx:152` | `INV-<base36>` |
| `generateInvoiceNumber()` | `src/components/finance/InvoiceFormDialog.tsx:342` | Delegates to shared util (`INV-<base36>` today) |
| `` `INV-${format(today,'yyyyMM')}-NNN` `` | `src/hooks/finance/useFinanceDemo.ts:129/144/159/174` | Demo seed only |
| Laboratory adapter slug | `src/hooks/laboratory/useLabInvoiceDraft.ts` | `INV-LAB-<slug>` |

**DB-side generators (`pg_proc` scan for `ILIKE '%invoice_number%'`): zero rows.** There is no server-side sequence, DB function, trigger, or counter for invoice numbers.

#### 1.5c Final Stage 6 rule

Stage 6 preserves caller-supplied `p_invoice_number` and does not introduce a canonical server generator (evidence-consistent with §1.5a/b — introducing one would break real production formats that tenants recognise).

Server-side enforcement in every RPC that receives `p_invoice_number` (`create_invoice_with_items`, `pos_finalize_sale`, and every §4 adapter):

- `p_invoice_number` required; `char_length(trim(p_invoice_number)) BETWEEN 1 AND 60`.
- No leading/trailing whitespace, no control characters (`p_invoice_number !~ '[[:cntrl:]]' AND p_invoice_number = trim(p_invoice_number)`).
- Tenant-scoped uniqueness via existing unique index `invoices_tenant_id_invoice_number_key`; 23505 conflict on that index maps to `FIN_INVOICE_NUMBER_TAKEN`.
- Prohibited server patterns: `MAX(right(invoice_number,N))`, whole-set parse for numeric suffix, any universal `INV-` prefix enforcement, unguarded read-then-increment counter.

**No `_finance_generate_invoice_number` helper is introduced.** F1 helper count remains 8 (§2.2). A.15 helper list does not include an invoice-number helper.

Retained sub-blocker: none. The tabulated format zoo is complete evidence for preserving caller-supplied numbers under a uniqueness index.

### 1.6 `billing_links`

Live schema: columns `id, tenant_id, source_type text NN, source_id uuid NN, invoice_id uuid NN, link_kind text NN, amount numeric(12,2) NULL, created_at, created_by`. CHECK `link_kind IN ('deposit','final','refund','credit_note')`. Indexes: PK; `idx_billing_links_invoice`, `_tenant`, `_tenant_source (tenant_id, source_type, source_id)` — **not unique**. FKs to invoices/tenants/profiles. RLS: two policies via `is_active_tenant_member`.

**No unique constraint** on `(tenant_id, source_type, source_id, link_kind)`. `_finance_billing_link_upsert` (§2.1) is therefore **insert-or-verify by explicit prior SELECT**, not by ON CONFLICT.

### 1.7 Existing `billing_links` census

Live `source_type, link_kind, count` grouping captured under `/tmp/s6/17_billing_links_source_census.txt`. Canonical Stage-6 values (A.8): `boarding`, `lab_request`, `doctor_consultation`, `vet_treatment`, `vaccination`, `breeding_attempt`, `pregnancy_check`, `foaling`, `pos_sale`. Pre-existing non-canonical rows remain untouched by Stage 6 and are quarantined for Stage 11 backfill review.

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

If `resolved_client_id IS NULL` and `p_client_id IS NOT NULL`, caller-supplied client must satisfy the PHL predicate or `FIN_LAB_CLIENT_UNRELATED` is raised.

### 1.9 `party_horse_links`

Columns confirmed live: `id, tenant_id NN, client_id uuid NN → clients, lab_horse_id uuid NN → lab_horses, relationship_type text NN, is_primary bool NN default false, created_at, created_by`. Unique `uq_party_horse_links_unique (tenant_id, client_id, lab_horse_id, relationship_type)`; partial unique `uq_party_horse_links_one_primary (tenant_id, lab_horse_id, relationship_type) WHERE is_primary`. CHECK `relationship_type IN ('lab_customer','payer','owner','trainer','stable')`. No `horse_id` / `party_id`.

### 1.10 `lab_horses.client_id` census

Live: total 21 rows across one tenant `348ce41c-…`, all with `client_id IS NULL`. Matches `docs/aml_1_b_1/stage_01_preflight/lab_horses_client_id_census.txt` exactly — zero drift. Every current tenant Lab invoice must resolve client via `party_horse_links` (or explicit `p_client_id` verified against PHL).

### 1.11 Package grouping

`invoice_items` has **no `parent_item_id` column**. Package rows carry `package_id`, `package_source`, `package_name_snapshot`, `package_name_ar_snapshot`, `package_price_snapshot numeric`, `package_currency_snapshot text`, `package_services_snapshot jsonb`. Live CHECK `invoice_items_service_package_exclusive_chk` forbids `service_id` and `package_id` on the same row. `service_source` is NOT NULL default `'tenant_services'`, restricted to `tenant_services|lab_services`. Package children live inside `package_services_snapshot`, not as separate FK-linked child rows. Housing monthly rows remain standalone.

### 1.12 Rounding, tax, discounts — VERIFIED (blocker `ROUNDING_TAX_HELPERS_PARTIAL` resolved)

#### 1.12a Full call-graph census

| Callsite | File:line | Inputs | Mode | Grain | Taxable filter | Rounding | Precision | Discount order |
|---|---|---|---|---|---|---|---|---|
| `computeTax(amount, {taxRate, pricesTaxInclusive})` | `src/lib/taxUtils.ts:39–56` | header amount | inclusive OR exclusive per tenant | aggregate (sum-then-tax) | none inside helper | `Math.round(x*100)/100` | 2 dp | applies external to helper |
| `getTenantTaxConfig(tenant)` | `src/lib/taxUtils.ts:23` | tenant row | `default_tax_rate ?? 15`, `prices_tax_inclusive ?? false` | — | — | — | — | — |
| Invoice form calculation | `src/components/finance/InvoiceFormDialog.tsx:161–194` | `lineItems[]`, `tax_rate`, `discount_amount`, `pricesTaxInclusive`, `catalogItems` | per-tenant flag drives inclusive branch | **aggregate over taxable+non-taxable subtotals** (`taxableTotal`, `nonTaxableTotal`) | catalog `is_taxable` predicate (implicit — items without `catalog.is_taxable=false` treated as taxable) | `Math.round(x*100)/100` at three points | 2 dp | `totalAmount = subtotal + tax − discount` (header-level discount) |
| POS core sale | `src/hooks/pos/usePOSCore.ts:73–83, 133` | `cart[]` | tax_rate = 0 (**not yet implemented**); `taxAmount: 0` hardcoded | aggregate | none | none | 2 dp on total | discount applied at header |
| POS embedded checkout | `src/components/pos/EmbeddedCheckout.tsx:83–107, 116–127` | `initialLineItems[]`, `discount` | tax = 0 (`tax_amount: 0` hardcoded); `subtotal = Σ items with valid price`; `total = max(0, subtotal − discount)` | aggregate | none | `.toFixed(2)` display + numeric arithmetic | 2 dp | header-level discount |
| Invoice line item render | `src/components/finance/InvoiceLineItemsEditor.tsx:218,346` | `items[]` | display only | aggregate | — | none — sums pre-rounded `total_price` | 2 dp | — |
| Housing proration | `src/lib/boardingPeriodEngine.ts:80,87,104` | `dailyRate`, `chargedDays` | untaxed | per-segment | none | `Math.round(x*100)/100` at final; `Math.round(dailyRate*10000)/10000` internal (4 dp) | 2 dp final | discount N/A |
| Service price resolver | `src/lib/pricing/resolver.ts:73–120` | `tenant_services.unit_price`, `products.selling_price`, `lab_templates.pricing.base_price` | pre-tax, no discount | per-service | — | none | as-stored | — |

#### 1.12b Cross-writer conflict analysis

Two writers differ in observable behaviour:

1. **`InvoiceFormDialog` (manual invoice UI):** aggregate tax over taxable items only, inclusive-or-exclusive per tenant flag, header discount after tax.
2. **POS surface (`usePOSCore` + `EmbeddedCheckout`):** tax hardcoded to 0 — POS explicitly does not tax today ("VAT to be implemented later" comment `src/hooks/pos/usePOSCore.ts:80`). Header discount subtracted from subtotal.

This is **not** a financial-algorithm conflict — POS opts out of the tax layer; when a POS sale needs tax it will pass `p_tax_rate = 0` explicitly. The canonical Stage-6 server algorithm therefore does not require choosing between two competing tax models.

#### 1.12c Canonical Stage 6 server algorithm (locked)

For every invoice-persisting RPC (`create_invoice_with_items`, `update_invoice_with_items`, `pos_finalize_sale`, all §4 adapters):

```
Inputs: items[], p_tax_rate numeric NN, p_discount_amount numeric NN DEFAULT 0,
        tenant.prices_tax_inclusive boolean.

for each item i:
   i.total_price := round2(i.quantity * i.unit_price)   -- 2 dp per-item
   i.is_taxable  := COALESCE(catalog_item(i.service_id, i.service_source).is_taxable, true)
                    when i.service_id/package_id present, else true

taxableTotal    := round2( SUM(i.total_price WHERE i.is_taxable) )
nonTaxableTotal := round2( SUM(i.total_price WHERE NOT i.is_taxable) )
lineTotal       := round2( taxableTotal + nonTaxableTotal )

if tenant.prices_tax_inclusive:
   taxAmount := round2( taxableTotal * p_tax_rate / (100 + p_tax_rate) )   when p_tax_rate>0 else 0
   subtotal  := round2( lineTotal - taxAmount )
else:
   taxAmount := round2( taxableTotal * p_tax_rate / 100 )                   when p_tax_rate>0 else 0
   subtotal  := lineTotal

discountAmount := round2( p_discount_amount )
if discountAmount > subtotal + taxAmount: raise FIN_DISCOUNT_EXCEEDS_TOTAL
totalAmount    := round2( subtotal + taxAmount - discountAmount )
```

Rounding is `Math.round(x*100)/100` in TypeScript, mapped to `round(x::numeric, 2)` in PL/pgSQL (banker's rounding not required — parity with JS half-away-from-zero is preserved via `round(x + 0.0000000001, 2)` guard to avoid float drift on `.5` boundary reconciliation across driver serialization).

Approval verification retains all six checks:

- Physical item count matches submitted item count.
- Financial-item predicate: only items with `unit_price IS NOT NULL AND quantity > 0` contribute to totals.
- Package-child validation: each `package_services_snapshot` entry has `service_id`, `unit_price`, `quantity`.
- Server recomputation of `subtotal`, `taxAmount`, `totalAmount`.
- `discountAmount ≤ subtotal + taxAmount`.
- `ABS(header.subtotal − financial_item_sum_taxable_only) < 0.01` for exclusive tenants; `ABS(header.subtotal − (lineTotal - taxAmount)) < 0.01` for inclusive tenants.
- Exact rounded `totalAmount` parity vs recomputed value.

Display-only formatting (`.toFixed`, `formatCurrency`) is not used in persistence.

### 1.13 External-provider predicates (verified)

- `vet_treatments.service_mode text NN DEFAULT 'external'` CHECK `IN ('internal','external')`; `external_provider_id uuid → service_providers`. Receivable-eligible ⇔ `service_mode = 'internal'`.
- `horse_vaccinations.service_mode text NN DEFAULT 'internal'` CHECK `IN ('internal','external')`; `external_provider_id`. Receivable-eligible ⇔ `service_mode = 'internal'`.
- `breeding_attempts.source_mode text NN DEFAULT 'internal'` CHECK `IN ('internal','connected','external')`; `provider_tenant_id`, `external_provider_name`. Receivable-eligible ⇔ `source_mode = 'internal'`.
- `pregnancy_checks` — **no `service_mode`/`source_mode` column**. All pregnancy checks are internal. Receivable-eligible unconditionally.
- `foalings` — **no `service_mode`/`source_mode` column**. All foalings are internal. Receivable-eligible unconditionally.

External writes route to `supplier_payables` via `createSupplierPayableForExternal`, not to `billing_links`.

### 1.14 Stage-6 uniqueness `23505` surface — VERIFIED (blocker `INVENTORY_UNIQUE_INDEX_MAP_INCOMPLETE` resolved)

Because §1.4 established `CURRENT_POS_INVENTORY_MUTATION = NONE` and Stage 6 introduces no inventory mutation, the inventory-table entries previously deferred are **not applicable to Stage 6** and are removed from this map. Only the tables actually mutated by Stage 6 RPCs appear:

| Object | Index / constraint | Key / predicate | Partial? | Deferrable? | Stage-6 op that may raise | Conflict meaning | Verify path | Mapped code |
|---|---|---|---|---|---|---|---|---|
| `invoices` | `invoices_pkey` | `(id)` | no | no | any INSERT | replay of same UUID | idempotency replay | replay-verify |
| `invoices` | `invoices_tenant_id_invoice_number_key` | `(tenant_id, invoice_number)` | no | no | invoice create / adapter / POS | duplicate invoice number in tenant | business | `FIN_INVOICE_NUMBER_TAKEN` (23505) |
| `invoice_items` | `invoice_items_pkey` | `(id)` | no | no | any INSERT | UUID collision | replay | replay-verify |
| `ledger_entries` | `ledger_entries_pkey` | `(id)` | no | no | any INSERT | UUID collision | replay | replay-verify |
| `ledger_entries` | `idx_ledger_invoice_idempotent` | `(tenant_id, reference_type, reference_id) WHERE entry_type='invoice' AND reference_type='invoice'` | yes | no | `approve_invoice`, `pos_finalize_sale` | duplicate canonical invoice ledger row | idempotency replay preferred; else business | `FIN_LEDGER_INVOICE_DUPLICATE` (23505) |
| `ledger_entries` | `ledger_entries_cancellation_unique_idx` | `(reference_id) WHERE entry_type='adjustment' AND reference_type='invoice_cancellation'` | yes | no | `cancel_invoice` | invoice already cancelled | idempotency | `FIN_INVOICE_ALREADY_CANCELLED` (23505) |
| `ledger_entries` | `ledger_entries_expense_unique_idx` | `(reference_id) WHERE reference_type='expense'` | yes | no | `post_expense_with_ledger`, `record_salary_payment` | expense already posted | idempotency | `FIN_EXPENSE_ALREADY_POSTED` (23505) |
| `customer_balances` | `customer_balances_pkey` | `(id)` | no | no | UPSERT | UUID collision | replay | replay-verify |
| `customer_balances` | `customer_balances_tenant_id_client_id_key` | `(tenant_id, client_id)` | no | no | `_finance_customer_balance_recompute` upsert | expected — routed via `ON CONFLICT DO UPDATE` | swallowed | never surfaced |
| `billing_links` | `billing_links_pkey` | `(id)` | no | no | INSERT | UUID collision | replay | replay-verify |
| `expenses` | `expenses_pkey` | `(id)` | no | no | INSERT | UUID collision | replay | replay-verify |
| `expenses` | `expenses_source_unique_idx` | `(tenant_id, source_type, source_reference) WHERE source_type IS NOT NULL` | yes | no | `record_salary_payment` | duplicate salary → expense | business (idempotent replay) | `FIN_EXPENSE_SOURCE_DUPLICATE` (23505) |
| `expenses` | `expenses_reverses_unique_idx` | `(reverses_expense_id) WHERE reverses_expense_id IS NOT NULL` | yes | no | `reverse_expense` | expense already reversed | business | `FIN_EXPENSE_ALREADY_REVERSED` (23505) |
| `finance_request_idempotency` | `finance_request_idempotency_pkey` | `(tenant_id, operation, idempotency_key)` | no | no | `_finance_idempotency_begin` | duplicate reservation | replay verification via `_finance_idempotency_complete` return | idempotency replay / `FIN_IDEMPOTENCY_MISMATCH` |
| `pos_sales` | `pos_sales_pkey` | `(id)` | no | no | INSERT | UUID collision | replay | replay-verify |
| `pos_sales` | `pos_sales_session_sale_unique` | `(tenant_id, session_id, sale_number)` | no | no | `pos_finalize_sale` step 5 | sale-number race | retry allocation once; else replay | `FIN_POS_SALE_DUPLICATE` (23505) |
| `pos_sessions` | `pos_sessions_pkey` | `(id)` | no | no | UPDATE only | n/a | — | — |
| `pos_sessions` | `ux_pos_sessions_one_open_per_branch` | `(tenant_id, COALESCE(branch_id, zero)) WHERE status='open'` | yes | no | session lifecycle (out of Stage 6 mutation scope) | — | — | — |
| `payment_intents` | `payment_intents_pkey` | `(id)` | no | no | INSERT | UUID collision | replay | replay-verify |
| `hr_salary_payments` | `hr_salary_payments_pkey` | `(id)` | no | no | INSERT | UUID collision | replay | replay-verify |

Stage 6 never issues `ON CONFLICT DO UPDATE` except on `customer_balances_tenant_id_client_id_key` (single-key derived-balance upsert). Every other `23505` is routed to `FIN_*` or to idempotency replay.

Inventory tables (`inventory_items`, `inventory_transactions`, `inventory_movements`, `stock_levels`, `warehouses`, `products`, `product_categories`) are **out of Stage 6 mutation scope**; their unique indexes are catalogued at `/tmp/s6/14_unique_indexes.txt` for future stocked-goods POS extension but are not part of this contract.

### 1.15 Stage 3 & Stage 5 no-drift gate

Stage 3 additive columns present:
- `ledger_entries.effective_date date NN DEFAULT CURRENT_DATE` — confirmed.
- Composite/unique indexes per D-07 — confirmed in §1.14.
- `expenses.ledger_status text NN DEFAULT 'unposted'` CHECK `IN ('unposted','posted','reversed')` — confirmed.
- `expenses.posted_at`, `expenses.ledger_entry_id`, `expenses.source_type`, `expenses.source_reference`, `expenses.reverses_expense_id` — confirmed.
- `invoices.corrects_invoice_id uuid → invoices(id)` — confirmed.
- `invoice_items` period-order CHECK — confirmed.
- `finance_request_idempotency` — schema per §0.1; row count = 0.
- `pos_sales` — schema per §1.4; `numeric(12,2)` on `subtotal|tax_amount|total_amount` confirmed. Row count = 0.

Stage 5 helpers (all owner `postgres`, `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE ALL FROM PUBLIC/anon/authenticated`; only `_finance_idempotency_purge_expired` retains `service_role` EXECUTE):

```
_finance_advisory_lock_key(p_tenant_id uuid, p_operation text, p_idempotency_key uuid)
_finance_source_lock_key(p_tenant_id uuid, p_source_type text, p_source_id uuid)
_finance_request_hash(p_operation text, p_tenant_id uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb)
_finance_riyadh_date(p_ts timestamptz)
_finance_idempotency_begin(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb)
_finance_idempotency_complete(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_request_hash bytea, p_resolved_snapshot jsonb, p_response jsonb)
_finance_idempotency_purge_expired(p_cutoff timestamptz)
```

### 1.16 Stage 4 permission no-drift gate

Live `permission_definitions` finance keys:

```
finance.adjustment.create, finance.expenses.approve, finance.expenses.create,
finance.expenses.manage, finance.invoice.approve, finance.invoice.cancel,
finance.invoice.create, finance.invoice.delete, finance.invoice.edit,
finance.invoice.markPaid, finance.invoice.print, finance.invoice.send,
finance.invoice.view, finance.ledger.view, finance.payables.manage,
finance.payment.collect, finance.payment.create, finance.payment.view,
finance.settings.manage
```

Count = 19. POS keys: `pos.discount.apply, pos.sale.create, pos.session.close, pos.session.open`. HR: `hr.manage`. Adapter keys `housing.manage`, `doctor.consultations.write`, `vet.manage`, `breeding.manage` are external to `finance.*` and enforced by `has_permission` at the adapter entry.

Stage 4 bundle bindings on `4d9b8917-f11d-4879-840d-1b682bad8cec` (كبير المشرفين) for `finance.invoice.approve`, `finance.invoice.cancel`, `finance.adjustment.create` retained — 17 bindings preserved.

### 1.17 Protected financial parity

Sentinel invoice `الم-202607-213` (id `bc37440d-d402-4e2b-96cd-67329456d0fd`, tenant `348ce41c-…`, status `approved`, total `50.00`) — unchanged from Stage 2 fingerprint. Row counts match Stage 2/5 baselines within Stage-3 additive scope. `-213` remains excluded from any Stage-6 RPC path (§0.6).

---

## 2. Private-helper inventory (A.10)

All helpers: owner `postgres`, `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE ALL FROM PUBLIC, anon, authenticated, service_role`. Public RPCs invoke them; no direct EXECUTE grant.

### 2.1 Persistence helpers introduced by F1

| Helper | Signature | Responsibility |
|---|---|---|
| `_finance_invoice_persist` | `(p_tenant_id uuid, p_actor_id uuid, p_intent jsonb, p_mode text /* create|update */) RETURNS uuid` | Insert or update `invoices` header with strict allowlist (`invoice_number, client_id, client_name, status, issue_date, due_date, currency, notes, payment_method, corrects_invoice_id, pos_session_id`). Rejects unknown keys, caller totals, caller `tenant_id`, caller `created_by`. Sets `created_by = p_actor_id` on create. Returns invoice id. |
| `_finance_invoice_items_replace` | `(p_invoice_id uuid, p_items jsonb) RETURNS void` | Delete existing children then insert new set within the enclosing RPC transaction (no internal savepoint). Rolls back the entire RPC on any validation failure. Per-row allowlist: `description, quantity, unit_price, total_price, entity_type, entity_id, horse_id, lab_horse_id, domain, period_start, period_end, service_id, service_source, category_id, category_key, package_id, package_source, package_price_snapshot, package_currency_snapshot, package_services_snapshot, position`. Snapshot columns are re-populated by the existing `trg_invoice_items_fill_snapshots` trigger. |
| `_finance_billing_link_upsert` | `(p_tenant_id uuid, p_source_type text, p_source_id uuid, p_invoice_id uuid, p_link_kind text, p_amount numeric, p_actor_id uuid) RETURNS uuid` | Insert-or-verify. `SELECT … FOR UPDATE` on any existing `(tenant_id, source_type, source_id)` row via `idx_billing_links_tenant_source`. If none → insert. If one exists with matching `(invoice_id, link_kind, amount)` → return existing id (safe replay). If one exists with different `invoice_id` or `link_kind` → raise `FIN_BILLING_LINK_CONFLICT` (23514). No `ON CONFLICT UPDATE`. |
| `_finance_ledger_insert` | `(p_tenant_id uuid, p_client_id uuid, p_invoice_id uuid, p_entry_type text, p_amount numeric, p_effective_date date, p_description text, p_created_by uuid, p_metadata jsonb) RETURNS uuid` | Acquire `pg_advisory_xact_lock(_finance_advisory_lock_key(p_tenant_id, 'ledger:client', p_client_id))` when `p_client_id IS NOT NULL`. Insert ledger row. When `p_client_id IS NULL`, set `balance_after = 0`, no balance chain, no `customer_balances` touched. When non-null, invoke `_finance_customer_balance_recompute(p_tenant_id, p_client_id)`. |
| `_finance_customer_balance_recompute` | `(p_tenant_id uuid, p_client_id uuid) RETURNS numeric` | Recompute the entire client chain: `SELECT … FROM ledger_entries WHERE tenant_id=… AND client_id=… ORDER BY effective_date, created_at, id FOR UPDATE`; running sum → `UPDATE ledger_entries SET balance_after = running`; final `INSERT … ON CONFLICT (tenant_id, client_id) DO UPDATE SET balance = final, last_updated = now()` on `customer_balances`. Returns final balance. Removes reliance on `MAX(balance_after)` and append-only assumptions. |
| `_finance_expense_persist` | `(p_tenant_id uuid, p_actor_id uuid, p_intent jsonb, p_mode text /* create|update */) RETURNS uuid` | Insert/update `expenses` header via allowlist: `title, amount, currency, category_id, expense_date, notes, status`. Reject `ledger_status`, `posted_at`, `ledger_entry_id`, `source_type`, `source_reference`, `reverses_expense_id` from caller intent — those are helper-owned (Stage-6 sole populated `source_type` is `hr_salary_payment` via §3.14). Sets `ledger_status='unposted'` on create. |
| `_finance_expense_post` | `(p_tenant_id uuid, p_expense_id uuid, p_actor_id uuid) RETURNS uuid` | Guard `ledger_status='unposted'` (`FIN_EXPENSE_ALREADY_POSTED` otherwise), insert one positive `ledger_entries` row with `entry_type='expense'` via `_finance_ledger_insert`, then `UPDATE expenses SET ledger_status='posted', posted_at=now(), ledger_entry_id=<new>`. Returns new ledger id. |
| `_finance_expense_reverse` | `(p_tenant_id uuid, p_source_expense_id uuid, p_actor_id uuid, p_reversal_date date) RETURNS uuid` | Guard: source `ledger_status='posted'`, `source_type IS NULL OR source_type <> 'hr_salary_payment'` (`FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`). Insert new `expenses` row with negated amount, `reverses_expense_id = p_source_expense_id`, `ledger_status='posted'`, call `_finance_expense_post` on it, then `UPDATE expenses SET ledger_status='reversed'` on source. Returns new expense id. |

### 2.2 Total F1 helper count: **8**

No `_finance_generate_invoice_number` (see §1.5). Stage 5 helpers remain 7. Total public-schema `_finance_*` after F1 = **15**.

---

## 3. Public RPC matrix (14 RPCs)

Each RPC below satisfies the twelve invariants (§0.2) and canonical order (§0.7). Rollback for every F2/F3/F5 RPC = `DROP FUNCTION public.<name>(<exact args>);` in reverse creation order, no `CASCADE`.

Every RPC row supplies: Signature · Operation string · Permission · Source lock · FOR UPDATE target · Allowed start state · Mutation order · Response · Errors · Rejected caller fields · Idempotency key contract · Advisory lock · Ledger effect · Balance recompute · Billing-link effect · State transition · Replay body · SQLSTATE-map · Correlated payload table · Stage 8 replacement scope.

### 3.1 `create_invoice_with_items` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice jsonb, p_items jsonb) RETURNS jsonb` |
| Operation | `'create_invoice_with_items'` |
| Permission | `finance.invoice.create` |
| Source lock | none |
| FOR UPDATE | none |
| Allowed start state | n/a (new) |
| Mutation order | 1–3 → `_finance_invoice_persist(…,'create')` → `_finance_invoice_items_replace(new_id, p_items)` → server totals recompute (§1.12) → `_finance_idempotency_complete` |
| Response | `{ invoice_id, invoice_number, subtotal, tax_amount, total_amount, status:'draft' }` |
| Errors | `FIN_INVOICE_NUMBER_TAKEN`, `FIN_VALIDATION_ITEMS_EMPTY`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_CROSS_TENANT`, `FIN_DISCOUNT_EXCEEDS_TOTAL` |
| Rejected fields | `corrects_invoice_id`, `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `created_by`, `tenant_id`, `status`, `pos_session_id` |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | none (fresh id) |
| Ledger effect | none (draft) |
| Balance recompute | none |
| Billing link | none (manual invoice) |
| State transition | ∅ → `draft` |
| Replay body | stored response |
| SQLSTATE | 23505→`FIN_INVOICE_NUMBER_TAKEN`; 23514→validation |
| Payload table | §5.1 |
| Stage 8 replacement | replaces `InvoiceFormDialog.tsx:295–360` create path |

### 3.2 `update_invoice_with_items` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_invoice jsonb, p_items jsonb) RETURNS jsonb` |
| Operation | `'update_invoice_with_items'` |
| Permission | `finance.invoice.edit` |
| Source lock | `_finance_source_lock_key(p_tenant_id,'invoice',p_invoice_id)` |
| FOR UPDATE | `invoices` row |
| Allowed start state | `draft | reviewed` |
| Mutation order | 1–3 → advisory + FOR UPDATE → state guard → `_finance_invoice_persist(…,'update')` → `_finance_invoice_items_replace` → totals recompute → complete |
| Response | as §3.1 |
| Errors | `FIN_INVOICE_LOCKED`, `FIN_INVOICE_NUMBER_TAKEN`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_DISCOUNT_EXCEEDS_TOTAL` |
| Rejected fields | `status`, `corrects_invoice_id`, totals, `created_by`, `tenant_id`, `pos_session_id` |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | source lock |
| Ledger effect | none |
| Balance recompute | none |
| Billing link | none |
| State transition | none |
| Replay body | stored response |
| SQLSTATE | 23505→number taken; 23514→state/validation |
| Payload table | §5.2 |
| Stage 8 replacement | `InvoiceFormDialog.tsx` update path |

### 3.3 `delete_draft_invoice` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid) RETURNS jsonb` |
| Operation | `'delete_draft_invoice'` |
| Permission | `finance.invoice.delete` AND `invoices.created_by = auth.uid()` |
| Source lock | invoice |
| FOR UPDATE | invoice |
| Allowed start state | `draft` |
| Mutation order | 1–3 → lock → state guard → `DELETE FROM invoices WHERE id=p_invoice_id` (cascades) → complete |
| Response | `{ invoice_id, deleted:true }` |
| Errors | `FIN_DELETE_INVALID_STATE`, `FIN_DELETE_NOT_OWNER` |
| Rejected fields | any body beyond `p_invoice_id` |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | source lock |
| Ledger effect | none (draft has none) |
| Balance recompute | none |
| Billing link | cascades away |
| State transition | `draft` → deleted |
| Replay body | stored |
| SQLSTATE | 23514 |
| Payload table | — (no jsonb payload) |
| Stage 8 replacement | `useInvoices.deleteInvoice` |

### 3.4 `approve_invoice` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date) RETURNS jsonb` |
| Operation | `'approve_invoice'` |
| Permission | `finance.invoice.approve` |
| Source lock | invoice |
| FOR UPDATE | invoice |
| Allowed start state | `draft | reviewed | issued` |
| Mutation order | 1–3 → lock → state → `UPDATE invoices SET status='approved'` → if `total>0 AND client_id NOT NULL` → `_finance_ledger_insert('invoice', +total, effective=p_effective_date, invoice_id)` → complete |
| Response | `{ invoice_id, status:'approved', ledger_entry_id? }` |
| Errors | `FIN_APPROVE_INVALID_STATE`, `FIN_LEDGER_INVOICE_DUPLICATE` |
| Rejected fields | body beyond `p_effective_date` |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | source lock + client-scope inside `_finance_ledger_insert` |
| Ledger effect | one `entry_type='invoice'` (conditional) |
| Balance recompute | yes (via ledger insert) |
| Billing link | none |
| State transition | `draft/reviewed/issued` → `approved` |
| Replay body | stored |
| SQLSTATE | 23505→duplicate; 23514→state |
| Payload table | §5.4 |
| Stage 8 replacement | `approveInvoice.ts` |

### 3.5 `cancel_invoice` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_cancellation_date date, p_reason text) RETURNS jsonb` |
| Operation | `'cancel_invoice'` |
| Permission | `finance.invoice.cancel` |
| Source lock | invoice |
| FOR UPDATE | invoice |
| Allowed start state | per §0.6 |
| Mutation order | 1–3 → lock → state machine (§0.6) → conditional reversal ledger row → `UPDATE invoices SET status='cancelled'` → complete |
| Response | `{ invoice_id, status:'cancelled', reversal_ledger_id? }` |
| Errors | `FIN_CANCEL_INVALID_STATE`, `FIN_CANCEL_INVALID_STATE_USE_DELETE_DRAFT`, `FIN_INVOICE_HAS_PAYMENTS`, `FIN_LEDGER_INVOICE_MISSING`, `FIN_INVOICE_ALREADY_CANCELLED` |
| Rejected fields | body beyond `p_cancellation_date`, `p_reason` |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | source + client |
| Ledger effect | at most one `entry_type='invoice'` opposite row |
| Balance recompute | yes when reversal emitted |
| Billing link | preserved (audit) |
| State transition | approved/shared/overdue/reviewed/issued → `cancelled` |
| Replay body | stored |
| SQLSTATE | 23505→already cancelled; 23514→state; P0001→payments |
| Payload table | §5.5 |
| Stage 8 replacement | `InvoiceDetailsSheet.tsx:370–410` cancel path |

### 3.6 `post_payment` (F2) — corrected per A.6

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_payee_account_id uuid, p_intent_type payment_intent_type, p_amount numeric, p_currency text, p_payment_date date, p_notes text) RETURNS jsonb` |
| Operation | `'post_payment'` |
| Permission | `finance.payment.create` |
| Source lock | invoice |
| FOR UPDATE | invoice |
| Allowed start state | invoice.status IN `approved | shared | overdue | partial` |
| Mutation order | 1–3 → lock invoice → re-derive `outstanding` → allocation/overpayment guard → validate `payment_accounts` → **INSERT `payment_intents`** (`payer_user_id=auth.uid()`, `payee_account_id=p_payee_account_id`, `tenant_id=p_tenant_id`, `intent_type=p_intent_type`, `reference_type='invoice'`, `reference_id=p_invoice_id`, `amount_display=to_char(p_amount,'FM999999999.00')`, `currency=p_currency`, `status='completed'`) → `_finance_ledger_insert('payment', -p_amount, effective=p_payment_date, invoice_id, metadata={payment_intent_id})` → server derive invoice status → `UPDATE invoices SET status=…` → complete |
| Response | `{ invoice_id, payment_intent_id, ledger_entry_id, amount, invoice_status, outstanding_after }` |
| Errors | `FIN_PAYMENT_ZERO_OR_NEGATIVE`, `FIN_PAYMENT_OVERPAYMENT`, `FIN_PAYMENT_ACCOUNT_INVALID`, `FIN_INVOICE_LOCKED`, `FIN_CURRENCY_MISMATCH` |
| Rejected fields | `payment_intents.status`, `paid_at`, any ledger amount / balance_after |
| Idempotency key | `p_idempotency_key` |
| Advisory lock | source + client |
| Ledger effect | one `entry_type='payment'` row |
| Balance recompute | yes |
| Billing link | none |
| State transition | `approved/shared/overdue/partial` → `partial|paid` |
| Replay body | stored |
| SQLSTATE | 23514→validation; P0001→business |
| Payload table | §5.3 |
| Stage 8 replacement | `postLedgerForPayments.ts`, `InvoiceDetailsSheet.tsx` payment paths |

### 3.7 `create_expense` (F3)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense jsonb) RETURNS jsonb` |
| Operation | `'create_expense'` |
| Permission | `finance.expenses.create` |
| Source lock | none |
| FOR UPDATE | none |
| Allowed start state | n/a |
| Mutation order | 1–3 → `_finance_expense_persist(…,'create')` → complete |
| Response | `{ expense_id, status:'draft'|'approved', ledger_status:'unposted' }` |
| Errors | `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_CROSS_TENANT` |
| Rejected fields | `source_type`, `source_reference`, `reverses_expense_id`, `posted_at`, `ledger_entry_id`, `ledger_status` |
| Idempotency key | yes |
| Advisory lock | none |
| Ledger effect | none |
| Balance recompute | none |
| Billing link | none |
| State transition | ∅ → `draft`/`approved`, `ledger_status='unposted'` |
| Replay body | stored |
| SQLSTATE | 23514 |
| Payload table | §5.6 |
| Stage 8 replacement | expense-create hooks |

### 3.8 `update_expense` (F3)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_expense jsonb) RETURNS jsonb` |
| Operation | `'update_expense'` |
| Permission | `finance.expenses.manage` |
| Source lock | expense |
| FOR UPDATE | expense |
| Allowed start state | `ledger_status='unposted'` |
| Mutation order | 1–3 → lock → guard → `_finance_expense_persist(…,'update')` → complete |
| Response | `{ expense_id, status, ledger_status:'unposted' }` |
| Errors | `FIN_EXPENSE_LOCKED`, `FIN_PAYLOAD_UNKNOWN_KEY` |
| Rejected fields | same as §3.7 |
| Idempotency key | yes |
| Advisory lock | source |
| Ledger effect | none |
| Balance recompute | none |
| Billing link | none |
| State transition | none |
| Replay body | stored |
| SQLSTATE | 23514 |
| Payload table | §5.7 |
| Stage 8 replacement | expense-edit hooks |

### 3.9 `delete_expense` (F3)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid) RETURNS jsonb` |
| Operation | `'delete_expense'` |
| Permission | `finance.expenses.manage` |
| Source lock | expense |
| FOR UPDATE | expense |
| Allowed start state | `ledger_status='unposted' AND source_type IS NULL` |
| Mutation order | 1–3 → lock → guard → `DELETE FROM expenses` → complete |
| Response | `{ expense_id, deleted:true }` |
| Errors | `FIN_DELETE_INVALID_STATE`, `FIN_EXPENSE_HAS_SOURCE` |
| Rejected fields | body beyond `p_expense_id` |
| Idempotency key | yes |
| Advisory lock | source |
| Ledger effect | none |
| Balance recompute | none |
| Billing link | none |
| State transition | → deleted |
| Replay body | stored |
| SQLSTATE | 23514 |
| Payload table | — |
| Stage 8 replacement | expense-delete hooks |

### 3.10 `post_expense_with_ledger` (F3)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_effective_date date) RETURNS jsonb` |
| Operation | `'post_expense_with_ledger'` |
| Permission | `finance.expenses.approve` |
| Source lock | expense |
| FOR UPDATE | expense |
| Allowed start state | `ledger_status='unposted'` |
| Mutation order | 1–3 → lock → `_finance_expense_post` (inserts `entry_type='expense'` ledger row, updates expense to `posted`) → complete |
| Response | `{ expense_id, ledger_entry_id, ledger_status:'posted', posted_at }` |
| Errors | `FIN_EXPENSE_ALREADY_POSTED`, `FIN_LEDGER_EXPENSE_DUPLICATE` |
| Rejected fields | body beyond `p_effective_date` |
| Idempotency key | yes |
| Advisory lock | source; **no client lock** (expenses have no client) |
| Ledger effect | one `entry_type='expense'` (client_id NULL, no balance chain) |
| Balance recompute | none |
| Billing link | none |
| State transition | `unposted` → `posted` |
| Replay body | stored |
| SQLSTATE | 23505→duplicate; 23514→state |
| Payload table | §5.8 |
| Stage 8 replacement | `postLedgerForExpense.ts` |

### 3.11 `reverse_expense` (F3)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_reversal_date date) RETURNS jsonb` |
| Operation | `'reverse_expense'` |
| Permission | `finance.expenses.manage` |
| Source lock | source expense + new expense |
| FOR UPDATE | source expense |
| Allowed start state | `ledger_status='posted' AND (source_type IS NULL OR source_type <> 'hr_salary_payment')` |
| Mutation order | 1–3 → lock → `_finance_expense_reverse` (insert reversal expense, post it, mark source `reversed`) → complete |
| Response | `{ source_expense_id, reversal_expense_id, reversal_ledger_entry_id }` |
| Errors | `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`, `FIN_EXPENSE_ALREADY_REVERSED`, `FIN_EXPENSE_NOT_POSTED` |
| Rejected fields | body beyond `p_reversal_date` |
| Idempotency key | yes |
| Advisory lock | source |
| Ledger effect | one `entry_type='expense'` opposite row |
| Balance recompute | none |
| Billing link | none |
| State transition | source `posted` → `reversed` |
| Replay body | stored |
| SQLSTATE | 23505→already reversed; 23514→scope |
| Payload table | — (positional args only) |
| Stage 8 replacement | new (no current writer) |

### 3.12 `post_manual_ledger_adjustment` (F2)

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid, p_amount numeric, p_effective_date date, p_description text) RETURNS jsonb` |
| Operation | `'post_manual_ledger_adjustment'` |
| Permission | `finance.adjustment.create` |
| Source lock | none (client-scope only) |
| FOR UPDATE | none |
| Allowed start state | n/a |
| Mutation order | 1–3 → `_finance_ledger_insert('adjustment', invoice_id=NULL, amount=p_amount, effective=p_effective_date, client_id=p_client_id, metadata={reason})` → complete |
| Response | `{ ledger_entry_id, client_id, amount, balance_after }` |
| Errors | `FIN_ADJUSTMENT_CLIENT_REQUIRED`, `FIN_ADJUSTMENT_ZERO_AMOUNT` |
| Rejected fields | any body beyond signature |
| Idempotency key | yes |
| Advisory lock | client |
| Ledger effect | one `entry_type='adjustment'` |
| Balance recompute | yes |
| Billing link | none |
| State transition | none |
| Replay body | stored |
| SQLSTATE | 23514 |
| Payload table | §5.9 |
| Stage 8 replacement | `InvoiceDetailsSheet.tsx:386` and future adjustments UI |

### 3.13 `pos_finalize_sale` (F5) — corrected per A.7, integrated with §1.4d

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_session_id uuid, p_sale_date date, p_cart jsonb, p_client_id uuid, p_payee_account_id uuid, p_payment_intent_type payment_intent_type, p_invoice_number text, p_currency text) RETURNS jsonb` |
| Operation | `'pos_finalize_sale'` |
| Permission | `pos.sale.create` |
| Source lock | `_finance_source_lock_key(p_tenant_id, 'pos_session', p_session_id)` |
| FOR UPDATE | `pos_sessions` row |
| Allowed start state | `pos_sessions.status='open'` |

**Mutation order (atomic):**

1. Verify `pos_sessions.status='open' AND tenant_id = p_tenant_id`.
2. `_finance_idempotency_begin`.
3. Source lock + `SELECT … FROM pos_sessions … FOR UPDATE`.
4. Allocate `sale_number := 1 + COALESCE((SELECT max(sale_number) FROM pos_sales WHERE tenant_id=p_tenant_id AND session_id=p_session_id), 0)`.
5. INSERT `pos_sales` with `cart_hash = encode(digest(p_cart::text,'sha256'),'hex')` (audit-only, not unique), server-recomputed `subtotal/tax_amount/total_amount` (§1.12), `currency=p_currency`, `created_by=auth.uid()`. On 23505 `pos_sales_session_sale_unique` → retry step 4 exactly once with fresh max; second failure → `FIN_POS_SALE_DUPLICATE`.
6. **Inventory validation & mutation — NONE.** Per §1.4, current POS mutates no inventory objects and Stage 6 preserves that contract. `p_cart` items must supply `service_id` (from `tenant_services`) or `description + unit_price` for free-text lines. Any caller-supplied field in the cart matching `{sku, warehouse_id, product_id, stock_movement, on_hand_delta}` triggers `FIN_POS_INVENTORY_OUT_OF_SCOPE` (23514) — safe forward-compat guard for stocked-goods POS extension.
7. INSERT `invoices` with `status='paid'`, `pos_session_id=p_session_id`, `invoice_number=p_invoice_number` (§1.5c), `payment_method` derived from `p_payment_intent_type`, `client_id=p_client_id`, `client_name = COALESCE(client.name,'Walk-in Customer')`.
8. `_finance_invoice_items_replace(invoice.id, cart_items)`.
9. INSERT `payment_intents` (per §3.6) with `reference_type='invoice'`, `reference_id=invoice.id`, `status='completed'`.
10. `_finance_ledger_insert('invoice', +total, effective=p_sale_date, invoice_id)` **then** `_finance_ledger_insert('payment', -total, effective=p_sale_date, invoice_id, metadata={payment_intent_id, pos_sale_id})`.
11. `_finance_billing_link_upsert(p_tenant_id, 'pos_sale', pos_sales.id, invoice.id, 'final', total)`.
12. If `p_client_id IS NOT NULL` → balance chain rebuilt by ledger inserts. If NULL → skipped.
13. `UPDATE pos_sessions SET updated_at = now()` (counters aggregate on read via `usePOSSessions` invoice query).
14. `UPDATE pos_sales SET invoice_id = invoice.id`.
15. `_finance_idempotency_complete` with `{ pos_sale_id, sale_number, invoice_id, invoice_number, ledger_invoice_id, ledger_payment_id, payment_intent_id, subtotal, tax_amount, total_amount, currency }`.

| Attribute | Value |
|---|---|
| Response | as replay body above |
| Errors | `FIN_POS_SESSION_NOT_OPEN`, `FIN_POS_SESSION_CROSS_TENANT`, `FIN_POS_SALE_DUPLICATE`, `FIN_POS_INVENTORY_OUT_OF_SCOPE`, `FIN_PAYMENT_ACCOUNT_INVALID`, `FIN_INVOICE_NUMBER_TAKEN`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_DISCOUNT_EXCEEDS_TOTAL` |
| Rejected fields | `pos_sales.sale_number` (server-allocated), `cart_hash` (server-computed), header totals, `invoice.status`, ledger amounts, `balance_after` |
| Idempotency key | `p_idempotency_key`; two identical carts under distinct keys are legal (no cart-hash unique index) |
| Advisory lock | pos_session + client (via ledger) |
| Ledger effect | two rows: `invoice` (+) then `payment` (−) |
| Balance recompute | when `p_client_id` non-null |
| Billing link | one `('pos_sale', pos_sales.id, invoice.id, 'final', total)` |
| State transition | ∅ → invoice `paid`, session unchanged |
| Replay body | as step 15 |
| SQLSTATE | 23505 routed per §1.14 |
| Payload table | §5.10 |
| Stage 8 replacement | `usePOSCore.createSale`, `EmbeddedCheckout.createInvoiceMutation` |

**No unique cart_hash index. No `FIN_POS_DUPLICATE_CART`.**

### 3.14 `record_salary_payment` (F3) — corrected per A.9

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_employee_id uuid, p_amount numeric, p_currency text, p_paid_at timestamptz, p_payment_period text, p_notes text, p_create_expense boolean) RETURNS jsonb` |
| Operation | `'record_salary_payment'` |
| Permission | `hr.manage` |
| Source lock | none (fresh salary row) |
| FOR UPDATE | none |
| Allowed start state | n/a |
| Mutation order | 1–3 → validate employee (tenant parity, currency, `p_amount>0`, `p_paid_at NOT NULL`) → INSERT `hr_salary_payments` (`created_by=auth.uid()`) → if `p_create_expense`: `expense_date := _finance_riyadh_date(p_paid_at)`; `expense_id := _finance_expense_persist(…, source_type='hr_salary_payment', source_reference=salary_id::text)`; `ledger_id := _finance_expense_post`; `UPDATE hr_salary_payments SET finance_expense_id = expense_id` → complete |
| Response | `{ salary_payment_id, finance_expense_id, ledger_entry_id }` (nullable when `p_create_expense=false`) |
| Errors | `FIN_HR_EMPLOYEE_CROSS_TENANT`, `FIN_HR_AMOUNT_INVALID`, `FIN_EXPENSE_SOURCE_DUPLICATE` |
| Rejected fields | `expenses.source_type/source_reference` overrides; ledger amounts |
| Idempotency key | yes |
| Advisory lock | none |
| Ledger effect | one `entry_type='expense'` when `p_create_expense=true` |
| Balance recompute | none |
| Billing link | none (no supplier payable) |
| State transition | ∅ → `hr_salary_payments` row (+ optional expense/ledger) |
| Replay body | stored |
| SQLSTATE | 23505→source-duplicate; 23514→validation |
| Payload table | §5.12 |
| Stage 8 replacement | HR salary payment hooks |

Reversal path: `reverse_expense` on an `hr_salary_payment`-sourced expense → `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`.

---

## 4. Adapter matrix (6 adapters, F4)

All adapters: idempotency + permission `finance.invoice.create` + domain permission (§0.7). Each emits exactly one `billing_links` row with `link_kind='final'` and canonical `source_type` (§0.7 mapping A.8). Every adapter accepts `p_corrects_invoice_id` (§0.2 invariant 11); manual `create_invoice_with_items` rejects it.

### 4.1 Housing — `create_invoice_from_admission`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_boarding_admission_id uuid, p_period_start date, p_period_end date, p_corrects_invoice_id uuid, p_invoice_number text, p_extra jsonb) RETURNS jsonb` |
| Domain permission | `housing.manage` |
| Source | `boarding_admissions` |
| Lock | source lock + FOR UPDATE |
| Range rules | `p_period_start ≤ p_period_end`; `p_period_end := LEAST(p_period_end, Riyadh_month_end(p_period_start), COALESCE(checked_out_at::date, 'infinity'))`; `checked_out=true AND checked_out_at IS NULL` → `FIN_HOUSING_INCONSISTENT_ADMISSION` |
| Overlap query | see block below |
| Lines | monthly proration via `boardingPeriodEngine.ts`, one standalone row per month (no package collapse) |
| External predicate | N/A |
| Final link | `('boarding', p_boarding_admission_id, invoice.id, 'final', total)` |
| Errors | `FIN_HOUSING_PERIOD_ALREADY_INVOICED` (23P01), `FIN_HOUSING_INCONSISTENT_ADMISSION`, `FIN_HOUSING_RANGE_INVALID`, `FIN_HOUSING_ADMISSION_UNKNOWN` |
| Payload table | §5.11 (Housing variant) |

Overlap query (closed/closed intersection):

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

Corrective rebill: `p_corrects_invoice_id` accepted only if referenced invoice is same-tenant, `status='cancelled'`, same `source_id=p_boarding_admission_id`, and its `period_start/period_end` range covers the requested range.

### 4.2 Laboratory — `create_lab_invoice`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_lab_request_id uuid, p_lab_horse_id uuid, p_client_id uuid, p_corrects_invoice_id uuid, p_invoice_number text) RETURNS jsonb` |
| Domain permission | `has_internal_capability(p_tenant_id,'laboratory')` |
| Source | `lab_requests` |
| Lock | source lock + FOR UPDATE |
| Client resolution | §1.8 predicate; errors `FIN_LAB_HORSE_UNKNOWN`, `FIN_LAB_HORSE_CROSS_TENANT`, `FIN_LAB_CLIENT_UNRELATED` |
| Lines | from `lab_request_services` joined to `lab_services`; `service_source='lab_services'`; `lab_horse_id = p_lab_horse_id` |
| External predicate | N/A |
| Final link | `('lab_request', p_lab_request_id, invoice.id, 'final', total)` |
| Payload table | §5.11 (Lab variant) |

### 4.3 Doctor — `create_doctor_invoice`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_consultation_id uuid, p_corrects_invoice_id uuid, p_invoice_number text) RETURNS jsonb` |
| Domain permission | `doctor.consultations.write` |
| Source | `doctor_consultations` |
| Lock | source + FOR UPDATE |
| External predicate | none — Doctor module has no `service_mode`; all receivable-eligible |
| Final link | `('doctor_consultation', p_consultation_id, invoice.id, 'final', total)` |
| Payload table | §5.11 (Doctor variant) |

### 4.4 Vet — `create_vet_invoice`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_vet_treatment_id uuid, p_corrects_invoice_id uuid, p_invoice_number text) RETURNS jsonb` |
| Domain permission | `vet.manage` |
| Source | `vet_treatments` |
| Lock | source + FOR UPDATE |
| External predicate | `vet_treatments.service_mode='internal'` else `FIN_VET_EXTERNAL_NOT_RECEIVABLE` |
| Final link | `('vet_treatment', p_vet_treatment_id, invoice.id, 'final', total)` |
| Payload table | §5.11 (Vet variant) |

### 4.5 Vaccination — `create_vaccination_invoice`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_vaccination_id uuid, p_corrects_invoice_id uuid, p_invoice_number text) RETURNS jsonb` |
| Domain permission | `vet.manage` |
| Source | `horse_vaccinations` |
| Lock | source + FOR UPDATE |
| External predicate | `horse_vaccinations.service_mode='internal'` else `FIN_VACCINATION_EXTERNAL_NOT_RECEIVABLE` |
| Final link | `('vaccination', p_vaccination_id, invoice.id, 'final', total)` |
| Payload table | §5.11 (Vaccination variant) |

### 4.6 Breeding — `create_breeding_invoice`

| Attribute | Value |
|---|---|
| Signature | `(p_tenant_id uuid, p_idempotency_key uuid, p_source_type text, p_source_id uuid, p_corrects_invoice_id uuid, p_invoice_number text) RETURNS jsonb` |
| Domain permission | `breeding.manage` |
| Source | `breeding_attempts` / `pregnancy_checks` / `foalings` |
| Lock | source + FOR UPDATE |
| External predicate | for `breeding_attempt` → `source_mode='internal'` else `FIN_BREEDING_EXTERNAL_NOT_RECEIVABLE`; `pregnancy_check`/`foaling` unconditional (§1.13) |
| Final link | `('breeding_attempt' | 'pregnancy_check' | 'foaling', p_source_id, invoice.id, 'final', total)` |
| Payload table | §5.11 (Breeding variant) |

---

## 5. Payload contracts (embedded, blocker `PAYLOAD_CONTRACTS_ARTIFACT_MISSING` resolved)

**Universal rejection rules (A.12)** — applied by every RPC before any mutation:

- Reject caller `status` and `ledger_status` (server-managed).
- Reject caller `subtotal`, `tax_amount`, `total_amount`, `discount_amount`, `balance_after`.
- Reject caller `tenant_id`, `created_by`, `created_at`, `updated_at`.
- Reject `corrects_invoice_id` on manual-invoice payload (`create_invoice_with_items`).
- Reject source identity inconsistent with adapter signature (e.g. `p_boarding_admission_id` on lab adapter).
- Reject caller `unit_price` when catalog service/package eligibility controls price (`service_id` bound to `tenant_services.unit_price` overrides caller value if divergent → `FIN_PRICE_MISMATCH`).
- Reject expense system fields (`source_type`, `source_reference`, `posted_at`, `ledger_entry_id`, `reverses_expense_id`) from any caller payload.
- Reject unknown JSON keys with `FIN_PAYLOAD_UNKNOWN_KEY` (strict allowlist).
- `corrects_invoice_id` accepted only in adapter payloads; when present must be included in the request hash, resolved snapshot, and response.

Column key: **F**=Field · **T**=PostgreSQL type · **P**=Presence (R/O/F) · **O**=Ownership (C/S) · **E**=Editable state · **V**=Validation source · **H**=In hash · **RS**=In resolved snapshot · **Rs**=In response · **D**=Disposition (accepted/recomputed/rejected).

### 5.1 `create_invoice_with_items` — manual create

| F | T | P | O | E | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|---|
| `invoice.invoice_number` | text | R | C | — | §1.5c | y | y | y | accepted |
| `invoice.client_id` | uuid | O | C | — | `clients` same-tenant | y | y | y | accepted |
| `invoice.client_name` | text | O | C | — | free text ≤200 | y | y | y | accepted |
| `invoice.issue_date` | date | R | C | — | not future >30d | y | y | y | accepted |
| `invoice.due_date` | date | R | C | — | ≥ issue_date | y | y | y | accepted |
| `invoice.currency` | text | R | C | — | tenant currency list | y | y | y | accepted |
| `invoice.notes` | text | O | C | — | ≤2000 | y | y | y | accepted |
| `invoice.payment_method` | text | O | C | — | enum | y | y | y | accepted |
| `invoice.tax_rate` | numeric | R | C | — | 0–100 | y | y | n | accepted |
| `invoice.discount_amount` | numeric(12,2) | O | C | — | ≥0, ≤ recomputed subtotal+tax | y | y | y | accepted |
| `invoice.corrects_invoice_id` | uuid | F | — | — | — | — | — | — | rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| `invoice.status` | text | F | — | — | — | — | — | — | rejected (server sets `draft`) |
| `invoice.subtotal/tax_amount/total_amount` | numeric | F | — | — | — | — | y | y | recomputed |
| `invoice.tenant_id/created_by` | uuid | F | — | — | — | — | — | — | rejected |
| `items[].description` | text | R | C | — | ≤500 | y | y | n | accepted |
| `items[].quantity` | numeric | R | C | — | >0 | y | y | n | accepted |
| `items[].unit_price` | numeric(12,2) | R | C | — | ≥0; overridden by catalog when `service_id` present | y | y | n | accepted / `FIN_PRICE_MISMATCH` |
| `items[].service_id` | uuid | O | C | — | `tenant_services` same-tenant | y | y | n | accepted |
| `items[].service_source` | text | O | C | — | `tenant_services|lab_services` | y | y | n | accepted |
| `items[].package_id` | uuid | O | C | — | `stable_service_plans` same-tenant | y | y | n | accepted |
| `items[].horse_id` / `lab_horse_id` | uuid | O | C | — | exclusive per §0.2/8 | y | y | n | accepted |
| `items[].period_start/period_end` | date | O | C | — | order CHECK live | y | y | n | accepted |
| `items[].total_price` | numeric | F | — | — | — | — | y | n | recomputed |

Response: `{ invoice_id, invoice_number, subtotal, tax_amount, total_amount, discount_amount, currency, status:'draft' }`.

### 5.2 `update_invoice_with_items`

Same fields as §5.1 with additional `p_invoice_id uuid` (positional, R, C). `invoice.status` remains rejected. Additional editable-state gate: only when target invoice `status IN ('draft','reviewed')` else `FIN_INVOICE_LOCKED`. `invoice_number` change permitted subject to §1.5c and `FIN_INVOICE_NUMBER_TAKEN`.

### 5.3 `post_payment`

| F | T | P | O | E | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|---|
| `p_invoice_id` | uuid | R | C | invoice ∈ approved/shared/overdue/partial | `invoices` same-tenant | y | y | y | accepted |
| `p_payee_account_id` | uuid | R | C | active | `payment_accounts.tenant_id=p_tenant_id AND is_active` | y | y | y | accepted |
| `p_intent_type` | `payment_intent_type` | R | C | — | enum | y | y | y | accepted |
| `p_amount` | numeric(12,2) | R | C | — | `0 < p_amount ≤ outstanding + 0.01` | y | y | y | accepted |
| `p_currency` | text | R | C | — | = invoice.currency | y | y | y | accepted |
| `p_payment_date` | date | R | C | — | not future | y | y | y | accepted |
| `p_notes` | text | O | C | — | ≤500 | y | y | n | accepted |
| `payment_intents.status` / `paid_at` | — | F | — | — | — | — | — | — | rejected (server sets `completed`) |
| ledger amount / `balance_after` | — | F | — | — | — | — | — | — | rejected |

Response: `{ invoice_id, payment_intent_id, ledger_entry_id, amount, invoice_status, outstanding_after }`.

### 5.4 `approve_invoice`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `p_invoice_id` | uuid | R | C | same-tenant invoice | y | y | y | accepted |
| `p_effective_date` | date | R | C | not future >0d | y | y | y | accepted |

Response: `{ invoice_id, status:'approved', ledger_entry_id? }`.

### 5.5 `cancel_invoice`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `p_invoice_id` | uuid | R | C | same-tenant | y | y | y | accepted |
| `p_cancellation_date` | date | R | C | ≥ invoice.issue_date | y | y | y | accepted |
| `p_reason` | text | O | C | ≤500 | y | y | y | accepted |

Response: `{ invoice_id, status:'cancelled', reversal_ledger_id? }`.

### 5.6 `create_expense`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `expense.title` | text | R | C | ≤200 | y | y | y | accepted |
| `expense.amount` | numeric(12,2) | R | C | >0 | y | y | y | accepted |
| `expense.currency` | text | R | C | tenant list | y | y | y | accepted |
| `expense.category_id` | uuid | O | C | `tenant_service_categories` or `custom_financial_categories` | y | y | y | accepted |
| `expense.expense_date` | date | R | C | ≤ today+30 | y | y | y | accepted |
| `expense.notes` | text | O | C | ≤2000 | y | y | y | accepted |
| `expense.status` | text | O | C | `draft|approved` | y | y | y | accepted |
| `expense.source_type/source_reference/posted_at/ledger_entry_id/ledger_status/reverses_expense_id` | — | F | — | — | — | — | — | rejected |

Response: `{ expense_id, status, ledger_status:'unposted' }`.

### 5.7 `update_expense`

Same fields as §5.6 plus `p_expense_id uuid` (R). Additional gate: `ledger_status='unposted'` else `FIN_EXPENSE_LOCKED`.

### 5.8 `post_expense_with_ledger`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `p_expense_id` | uuid | R | C | same-tenant, `ledger_status='unposted'` | y | y | y | accepted |
| `p_effective_date` | date | R | C | not future >0d | y | y | y | accepted |

Response: `{ expense_id, ledger_entry_id, ledger_status:'posted', posted_at }`.

### 5.9 `post_manual_ledger_adjustment`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `p_client_id` | uuid | R | C | `clients` same-tenant (`FIN_ADJUSTMENT_CLIENT_REQUIRED` on NULL) | y | y | y | accepted |
| `p_amount` | numeric(12,2) | R | C | `<> 0` (`FIN_ADJUSTMENT_ZERO_AMOUNT`) | y | y | y | accepted |
| `p_effective_date` | date | R | C | ≤ today+0 | y | y | y | accepted |
| `p_description` | text | R | C | ≤500 | y | y | y | accepted |

Response: `{ ledger_entry_id, client_id, amount, balance_after }`.

### 5.10 `pos_finalize_sale`

| F | T | P | O | E | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|---|
| `p_session_id` | uuid | R | C | `open` | `pos_sessions.status='open' AND tenant_id=p_tenant_id` | y | y | y | accepted |
| `p_sale_date` | date | R | C | — | not future | y | y | y | accepted |
| `p_client_id` | uuid | O | C | — | `clients` same-tenant | y | y | y | accepted |
| `p_payee_account_id` | uuid | R | C | active | `payment_accounts` tenant/active | y | y | y | accepted |
| `p_payment_intent_type` | `payment_intent_type` | R | C | — | enum | y | y | y | accepted |
| `p_invoice_number` | text | R | C | — | §1.5c | y | y | y | accepted |
| `p_currency` | text | R | C | — | tenant list | y | y | y | accepted |
| `p_cart[].service_id` | uuid | O | C | — | `tenant_services` | y | y | n | accepted |
| `p_cart[].description` | text | R | C | — | ≤500 | y | y | n | accepted |
| `p_cart[].quantity` | numeric | R | C | — | >0 | y | y | n | accepted |
| `p_cart[].unit_price` | numeric(12,2) | R | C | — | ≥0; catalog wins if `service_id` | y | y | n | accepted / `FIN_PRICE_MISMATCH` |
| `p_cart[].discount_amount` | numeric(12,2) | O | C | — | header-level via `p_cart.discount_amount` root | y | y | n | accepted |
| `p_cart[].tax_rate` | numeric | O | C | — | root `p_cart.tax_rate`, default 0 | y | y | n | accepted |
| `p_cart[].{sku,warehouse_id,product_id,stock_movement,on_hand_delta}` | any | F | — | — | — | — | — | — | rejected `FIN_POS_INVENTORY_OUT_OF_SCOPE` |
| `pos_sales.sale_number` | int | F | — | — | server-allocated | — | y | y | rejected/allocated |
| `pos_sales.cart_hash` | text | F | — | — | server-computed | — | y | n | recomputed |
| any totals | — | F | — | — | — | — | y | y | recomputed |

Response: `{ pos_sale_id, sale_number, invoice_id, invoice_number, ledger_invoice_id, ledger_payment_id, payment_intent_id, subtotal, tax_amount, total_amount, currency }`.

### 5.11 Adapter payloads (Housing, Lab, Doctor, Vet, Vaccination, Breeding)

All adapters share this contract; only source identity differs.

| F | T | P | O | E | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|---|
| `p_{source}_id` (per §4.x signature) | uuid | R | C | source exists, same-tenant | source table | y | y | y | accepted |
| `p_lab_horse_id` (Lab only) | uuid | R | C | `lab_horses` same-tenant | §1.8 | y | y | y | accepted |
| `p_client_id` (Lab only) | uuid | O | C | resolves via §1.8 | PHL predicate | y | y | y | accepted |
| `p_period_start/p_period_end` (Housing only) | date | R | C | § 4.1 range rules | boarding_admissions | y | y | y | accepted |
| `p_source_type` (Breeding only) | text | R | C | `breeding_attempt|pregnancy_check|foaling` | enum | y | y | y | accepted |
| `p_corrects_invoice_id` | uuid | O | C | same-tenant, cancelled, same source occurrence, covering range | invariant 11 | y | y | y | accepted |
| `p_invoice_number` | text | R | C | §1.5c | uniqueness | y | y | y | accepted |
| `p_extra.notes` | text | O | C | ≤2000 | free | y | y | n | accepted |
| any other source-identity or total field | — | F | — | — | — | — | — | — | rejected |

Response: `{ invoice_id, invoice_number, subtotal, tax_amount, total_amount, currency, billing_link_id }`.

### 5.12 `record_salary_payment`

| F | T | P | O | V | H | RS | Rs | D |
|---|---|---|---|---|---|---|---|---|
| `p_employee_id` | uuid | R | C | `hr_employees` same-tenant | y | y | y | accepted |
| `p_amount` | numeric(12,2) | R | C | >0 | y | y | y | accepted |
| `p_currency` | text | R | C | tenant list | y | y | y | accepted |
| `p_paid_at` | timestamptz | R | C | not future >0 | y | y | y | accepted |
| `p_payment_period` | text | R | C | ≤50 | y | y | y | accepted |
| `p_notes` | text | O | C | ≤500 | y | y | n | accepted |
| `p_create_expense` | bool | R | C | boolean | y | y | y | accepted |
| `hr_salary_payments.finance_expense_id` | — | F | — | server-set | — | y | y | rejected |
| any expense system field | — | F | — | — | — | — | — | rejected |

Response: `{ salary_payment_id, finance_expense_id, ledger_entry_id }` (last two nullable when `p_create_expense=false`).

---

## 6. Repository writer census (blocker `CURRENT_WRITER_CENSUS_INCOMPLETE` resolved)

Baseline (Stage 6 first-pass): 57 sites. Current sweep via `rg -n --no-heading '\.from\("(invoices|invoice_items|ledger_entries|customer_balances|billing_links|expenses|payment_intents|pos_sales|pos_sessions|hr_salary_payments|inventory_items|inventory_movements|inventory_transactions|stock_levels|warehouses|products|product_categories)"\)' src/ supabase/` returned **57 sites — full parity with the baseline; zero drift**. Every entry is enumerated below with all ten required attributes; grouped by target table for readability.

Legend: **Op** = insert/update/upsert/delete/select-only (select-only sites remain in the census where they influence subsequent mutation). **CS** = caller-supplied fields. **SR** = server-resolved fields. **Order** = position in current site's mutation sequence. **Val** = client-side validation summary. **Perm** = permission assumption in current code. **Idem** = current idempotency behaviour. **R6** = Stage-6 RPC/adapter that replaces this site. **S8** = Stage 8 disposition.

### 6.1 `invoices`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `src/hooks/pos/usePOSSessions.ts:145` | select | — | id, totals | 1st | none | RLS | none | `pos_finalize_sale` (read-side unchanged) | keep read |
| 2 | `src/hooks/pos/usePOSCore.ts:103` | select (count) | `pos_session_id` | count | 1st | none | RLS | none | `pos_finalize_sale` internal | delete |
| 3 | `src/hooks/pos/usePOSCore.ts:117` | insert | invoice_number, client_*, totals, status, dates, pos_session_id, payment_method | tenant_id, created_by | 2nd | none | RLS | none | `pos_finalize_sale` | delete |
| 4 | `src/components/pos/EmbeddedCheckout.tsx:115` | insert | invoice_number, client_*, totals, dates, payment_method | tenant_id, created_by | 1st | line prices only | RLS | none | `pos_finalize_sale` | delete |
| 5 | `src/components/finance/InvoiceFormDialog.tsx:322` | insert | full manual invoice payload | tenant_id, created_by | 1st | react-hook-form | RLS | none | `create_invoice_with_items` | delete |
| 6 | `src/components/finance/InvoiceFormDialog.tsx:351` | update | full manual invoice payload | — | 1st | RHF | RLS | none | `update_invoice_with_items` | delete |
| 7 | `src/lib/finance/postLedgerForInvoice.ts:124` | select | id | client_id,total,notes | 1st | none | RLS | none | internal `_finance_ledger_insert` | delete |
| 8 | `src/lib/finance/postLedgerForPayments.ts:48` | select | id | client_id,total,status | 1st | none | RLS | none | internal | delete |
| 9 | `src/lib/finance/postLedgerForPayments.ts:171` | update | status=paid | — | 3rd | none | RLS | none | internal | delete |
| 10 | `src/lib/finance/postLedgerForPayments.ts:186` | update | status=partial | — | 3rd | none | RLS | none | internal | delete |
| 11 | `src/lib/finance/approveInvoice.ts:16` | select | id | client_id,total | 1st | none | RLS | none | `approve_invoice` internal | delete |
| 12 | `src/lib/finance/enrichLedgerDescriptions.ts:62` | select | ids[] | number,client_name | read | none | RLS | none | unchanged | keep |
| 13 | `src/lib/finance/backfillLedgerDescriptions.ts:46` | select | id | number,client | 1st | none | RLS | none | keep read | keep |
| 14 | `src/hooks/finance/useInvoicePayments.ts:45` | select | id | total,status | read | none | RLS | none | keep read | keep |
| 15 | `src/hooks/clients/useUnallocatedPayments.ts:92` | select | ids[] | number,client | read | none | RLS | none | keep read | keep |
| 16 | `src/hooks/clients/useStatementEnrichment.ts:67` | select | ids[] | totals | read | none | RLS | none | keep read | keep |
| 17 | `src/components/clients/ClientStatementTab.tsx:389` | select | — | statement rows | read | none | RLS | none | keep read | keep |
| 18 | `src/components/housing/AdmissionDetailSheet.tsx:128` | select | admission→invoices | display | read | none | RLS | none | keep read | keep |
| 19 | `src/pages/finance/DashboardFinancePOS.tsx:111` | select | session_id | invoices agg | read | none | RLS | none | keep read | keep |
| 20 | `supabase/functions/mark-overdue-invoices/index.ts:32` | update (edge) | status=overdue | — | 1st | none | service_role | date-scoped | out of Stage 6 (batch) | keep |

### 6.2 `invoice_items`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 | `src/hooks/pos/usePOSCore.ts:155` | insert | rows | invoice_id | 3rd | none | RLS | none | `pos_finalize_sale` internal | delete |
| 22 | `src/components/pos/EmbeddedCheckout.tsx:151` | insert | rows | invoice_id | 2nd | none | RLS | none | `pos_finalize_sale` internal | delete |
| 23 | `src/hooks/laboratory/useSampleInvoiceMap.ts:28` | select | ids[] | joins | read | — | RLS | none | keep read | keep |
| 24 | `src/hooks/laboratory/useLabHorseFinancialSummary.ts:81` | select | lab_horse_id | totals | read | — | RLS | none | keep read | keep |
| 25 | `src/hooks/laboratory/useLabHorsesWithMetrics.ts:119` | select | lab_horse_ids | totals | read | — | RLS | none | keep read | keep |
| 26 | `src/hooks/laboratory/useLabInvoiceDraft.ts:77` | select | draft prep | prices | read | — | RLS | none | driven by `create_lab_invoice` | delete |

Manual invoice line writes are performed by `_finance_invoice_items_replace` inside the RPCs listed in §6.1 rows 5–6; no additional site currently writes `invoice_items` outside POS + form dialog.

### 6.3 `ledger_entries`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 27 | `src/lib/finance/postLedgerForInvoice.ts:142` | insert | invoice row | balance_after | 2nd | none | RLS | none | `_finance_ledger_insert` | delete |
| 28 | `src/lib/finance/postLedgerForInvoice.ts:178` | insert | reversal | balance_after | 2nd | none | RLS | none | `cancel_invoice` internal | delete |
| 29 | `src/lib/finance/postLedgerForPayments.ts:67` | insert | payment | balance_after | 2nd | none | RLS | none | `post_payment` internal | delete |
| 30 | `src/lib/finance/postLedgerForPayments.ts:111` | insert | secondary payment | balance_after | 3rd | none | RLS | none | `post_payment` internal | delete |
| 31 | `src/lib/finance/postLedgerForExpense.ts:27` | insert | expense | balance_after | 2nd | none | RLS | none | `_finance_expense_post` | delete |
| 32 | `src/lib/finance/postLedgerForExpense.ts:52` | insert | reversal expense | balance_after | 2nd | none | RLS | none | `_finance_expense_reverse` | delete |
| 33 | `src/lib/finance/backfillLedgerDescriptions.ts:17` | select | ids | descriptions | read | — | RLS | none | keep read | keep |
| 34 | `src/lib/finance/backfillLedgerDescriptions.ts:117` | update | description | — | 3rd | none | service_role | none | maintenance script; out of scope | keep |
| 35 | `src/components/clients/ClientStatementTab.tsx:364` | select | client_id | statement | read | — | RLS | none | keep read | keep |
| 36 | `src/hooks/laboratory/useLabHorseFinancialSummary.ts:115` | select | lab_horse_id | totals | read | — | RLS | none | keep read | keep |
| 37 | `src/hooks/clients/useClientStatement.ts:48` | select | client_id | rows | read | — | RLS | none | keep read | keep |
| 38 | `src/hooks/clients/useUnallocatedPayments.ts:65` | select | client_id | payments | read | — | RLS | none | keep read | keep |
| 39 | `src/hooks/finance/useInvoicePayments.ts:57` | select | invoice_id | rows | read | — | RLS | none | keep read | keep |
| 40 | `src/hooks/finance/useInvoicePaymentsBatch.ts:24` | select | invoice_ids | rows | read | — | RLS | none | keep read | keep |
| 41 | `src/components/finance/InvoiceDetailsSheet.tsx:386` | insert | reversal (client-side) | balance_after | 2nd | none | RLS | none | `cancel_invoice` | delete |

### 6.4 `customer_balances`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 42 | `src/lib/finance/postLedgerForInvoice.ts:164` | select | tenant_id, client_id | balance | read | — | RLS | none | `_finance_customer_balance_recompute` | delete |
| 43 | `src/lib/finance/postLedgerForInvoice.ts:198` | upsert | balance | last_updated | 3rd | none | RLS | none | internal | delete |
| 44 | `src/lib/finance/postLedgerForPayments.ts:94` | select | tenant_id, client_id | balance | read | — | RLS | none | internal | delete |
| 45 | `src/lib/finance/postLedgerForPayments.ts:143` | upsert | balance | last_updated | 4th | none | RLS | none | internal | delete |
| 46 | `src/components/finance/InvoiceDetailsSheet.tsx:375` | select | id/client | balance | read | — | RLS | none | via `cancel_invoice` | delete |
| 47 | `src/components/finance/InvoiceDetailsSheet.tsx:399` | upsert | balance | last_updated | 3rd | none | RLS | none | via `cancel_invoice` | delete |

### 6.5 `billing_links`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 48 | `src/hooks/billing/useBillingLinks.ts:42` | select | invoice_id | rows | read | — | RLS | none | keep read | keep |
| 49 | `src/hooks/billing/useBillingLinks.ts:67` | select | source | rows | read | — | RLS | none | keep read | keep |
| 50 | `src/hooks/billing/useBillingLinks.ts:100` | insert | source, invoice, kind, amount | tenant_id, created_by | 1st | none | RLS | none | `_finance_billing_link_upsert` | delete |
| 51 | `src/components/finance/SupplierPayablesTab.tsx:188` | select | supplier_payable | invoice | read | — | RLS | none | keep read | keep |

### 6.6 `payment_intents`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 52 | `src/hooks/usePayments.ts:48` | select | filters | rows | read | — | RLS | none | keep read | keep |
| 53 | `src/hooks/usePayments.ts:70` | insert | payer,payee,intent,ref,amount,currency | tenant_id, status | 1st | RHF | RLS | none | `post_payment` | delete |

### 6.7 `pos_sessions`

| # | File:Line | Op | CS | SR | Order | Val | Perm | Idem | R6 | S8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 54 | `src/hooks/pos/usePOSSessions.ts:47` | select | tenant_id | rows | read | — | RLS | none | keep | keep |
| 55 | `src/hooks/pos/usePOSSessions.ts:75` | insert | branch_id, opening_cash | tenant_id, opened_by | 1st | RHF | `pos.session.open` | none | out of AML.1.b.1 (session lifecycle) | keep |
| 56 | `src/hooks/pos/usePOSSessions.ts:105` | update | closing_cash, notes, status=closed | closed_by, closed_at | 1st | RHF | `pos.session.close` | none | out of AML.1.b.1 | keep |
| 57 | `src/hooks/pos/usePOSSessions.ts:155/170` | update/select | status transitions | — | 1st | none | RLS | none | out of AML.1.b.1 | keep |

No writer touches `pos_sales`, `stock_levels`, `inventory_movements`, `inventory_transactions`, `hr_salary_payments`, or `expenses` today from user-facing code paths (the shared helper `postLedgerForExpense.ts` reads `expenses` only). `hr_salary_payments` writes are provisioned to arrive with `record_salary_payment` (§3.14) — no current writer to replace.

**Total sites:** 57. **Drift vs baseline:** 0.

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

Rollback order: **F6 → F5 → F4 → F3 → F2 → F1 → F0**. Within each, `DROP FUNCTION` in reverse creation order, no `CASCADE`. F0 rollback aborts if any `entry_type='expense'` row exists.

### 7.1 F0 forward SQL

```sql
BEGIN;

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

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = ANY (s6_names)
  ) THEN
    RAISE EXCEPTION 'STAGE5_ROLLBACK_ABORT_S6: Stage 6 functions remain installed.';
  END IF;

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

The `s6_names` array precisely lists **20 public RPCs** (14 core §3 + 6 adapter §4) and **8 F1 private helpers** (§2.1) — total 28 identifiers. Any Stage 5 rollback attempted while any of these still exist aborts.

---

## 9. Unresolved / evidence-blocked identifiers

None. All six previously-listed blockers (`POS_INVENTORY_CHAIN_UNVERIFIED`, `ROUNDING_TAX_HELPERS_PARTIAL`, `CURRENT_WRITER_CENSUS_INCOMPLETE`, `PAYLOAD_CONTRACTS_ARTIFACT_MISSING`, `INVOICE_NUMBER_TENANT_DOMAIN_RULES_UNENUMERATED`, `INVENTORY_UNIQUE_INDEX_MAP_INCOMPLETE`) are resolved in §1.4, §1.12, §6, §5, §1.5, and §1.14 respectively.

---

## 10. Terminal readiness

Per A.18: `READY` requires every mechanical input captured and every A.1–A.17 contradiction removed. All six previously-listed blockers are resolved with catalog-verified evidence and embedded contract text. Therefore:

```
AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.
```
