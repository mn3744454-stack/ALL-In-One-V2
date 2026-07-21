# AML.1.b.1 — Stage 6 Execution Specification

**Pass:** Stage 6 Specification Integrity & Contract-Reconciliation Pass (clean rebuild, non-merged).
**Repository effect:** This file is the sole repository artifact modified by this pass. No other repository file changed. No DB migration write tool was invoked. No `src/**`, `supabase/config.toml`, permission, RPC, function, or schema mutation was performed.
**Prior READY decision:** Explicitly withdrawn. This document supersedes all prior Stage 6 spec revisions and does not append correction layers.

---

## §0. Pre-rewrite integrity capture

Captured against the actual repository head immediately before this rewrite:

```
$ sha256sum docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md
94b9686c201c21dee329f4e99c17fd6937bb548653255d2bf68ad2be99c1ec01

$ wc -lc docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md
1431 98968

$ git status --short docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md
(clean — no local modifications prior to this rewrite)
```

**Reconciliation with `SPEC_POSTWRITE_MANIFEST_MISMATCH`:**

| Manifest source | Lines | Bytes | SHA-256 |
|---|---|---|---|
| Prior chat manifest | 1431 | 98,968 | `94b9686c201c21dee329f4e99c17fd6937bb548653255d2bf68ad2be99c1ec01` |
| Repository (this pass, pre-rewrite) | **1431** | **98,968** | **`94b9686c…c01`** — EXACT MATCH |
| User-supplied exported artifact | 1168 | 122,714 | `488e5b96e72e86fc55d65776c69a4ad093f4106eb4577094c6c7777316585152` — DIVERGENT |

**Interpretation.** The repository file exactly matches the prior chat manifest. The user's exported artifact diverged from the repository via the export/rendering pipeline and is not the authoritative artifact. `SPEC_POSTWRITE_MANIFEST_MISMATCH` is therefore resolved as *export-pipeline divergence, not repository drift*; the specification-of-record is the repository file. However, this rewrite still fully replaces the file to (a) remove structural risk of the same drift recurring and (b) apply the contract corrections mandated by §§3–13 of the directive that the prior file did not honor.

---

## §1. Locked scope and constraints (PLAN-LOCK re-anchor)

### 1.1 Sole authorized file effect

`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md` (this file). Nothing else.

### 1.2 A.1 — A.17 restated (single instance, non-mergeable)

- **A.1** No DB mutation, no migration tool call, no `src/**`, `supabase/config.toml`, permission, or schema change during this pass.
- **A.2** Preserve every mechanically verified current behavior; do not introduce silent behavioral changes.
- **A.3** All financial invariants (`ledger.balance_after` chain, `customer_balances` upsert, `Σ item_totals = header.subtotal` within `0.01`, exact rounded header total parity) hold across every RPC/adapter.
- **A.4** Server-derived invoice status only. Callers cannot set final `status`, totals, tenant, actor, or ledger fields.
- **A.5** Adapter payloads never accept caller-resolved commercial identity where the catalog governs price.
- **A.6** Preserve business records on reversal (Model-B). Never delete or negate an original business row.
- **A.7** `pos_finalize_sale` atomically owns POS ↔ inventory ↔ invoice ↔ payment ↔ ledger ↔ billing link ↔ session totals ↔ customer balance (when applicable). Removal of any leg is not permitted; unresolved legs remain identified blockers.
- **A.8** Receivables adapters (Housing, Laboratory, Doctor, Vet, Vaccination, Breeding) share a single locked adapter contract shape.
- **A.9** `record_salary_payment` uses a private HR expense path — never the public expense API.
- **A.10** Every finance operation is idempotent under the three locked codes in §4.
- **A.11** Every helper is `SECURITY DEFINER`, `SET search_path = ''`, owned by `postgres`, `REVOKE EXECUTE FROM PUBLIC` with owner-only EXECUTE.
- **A.12** No caller-supplied final `invoice_number`; server generates within the transaction (§9).
- **A.13** Rounding/tax uses one locked algorithm per operation (aggregate tax-then-round, per §5 of prior evidence, preserved verbatim).
- **A.14** Every locked SQLSTATE→`FIN_*` code is stable and appears verbatim in the RPC/adapter matrix.
- **A.15** Rollback-guard `DO $g$` block in §13 verifies exactly the seven Stage 5 helpers and the final Stage 6 public+private inventory before COMMIT of any later Stage-6 migration.
- **A.16** No delete-then-insert on idempotency rows; conditional reclaim only.
- **A.17** Zero drift on Stage 3 protected records: `ledger_entries`, `expenses`, `finance_request_idempotency`, `pos_sales`, `invoices.corrects_invoice_id`.

### 1.3 F0 rollback-guard requirement

The Stage 6 forward migration that adds `expense` to `ledger_entries.entry_type` CHECK requires the F0 forward+rollback pair transcribed in §13.

### 1.4 PLAN-LOCK sections F1–F6 separation

Stage 6 execution is decomposed into F1 (schema-only F0 CHECK expansion), F2 (private-helper installation), F3 (public RPC installation), F4 (adapter installation), F5 (POS installation), F6 (permission grants). No cross-file phase is merged. A.15 rollback-guard runs at the tail of F6.

---

## §2. Clean-rebuild declaration

This file was generated as an out-of-tree candidate, validated against every §14 gate, then written to the authorized path. It contains:

- Exactly one title, one pass declaration, one repo-effect declaration.
- Exactly one instance of each numbered section (§0–§16).
- Exactly one heading per public RPC (14 total in §7).
- Exactly one heading per adapter (6 total in §8).
- One row per private helper (§10.4).
- One Unresolved-identifiers section (§15).
- Exactly one terminal-readiness line (§16).

`SPEC_DUPLICATE_MERGE_CORRUPTION` is retired by construction: rebuild-from-scratch rather than in-place patching.

---

## §3. Locked public RPC signatures (verbatim, no overloads)

```text
create_invoice_with_items(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_payload         jsonb
)

update_invoice_with_items(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid,
  p_payload         jsonb
)

delete_draft_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid
)

approve_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid
)

cancel_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid,
  p_effective_date  date,
  p_reason          text
)

post_payment(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_invoice_id      uuid,
  p_amount          numeric,
  p_payment_date    date,
  p_payment_method  text,
  p_account_id      uuid,
  p_payload         jsonb
)

create_expense(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_payload         jsonb
)

update_expense(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_expense_id      uuid,
  p_payload         jsonb
)

delete_expense(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_expense_id      uuid
)

post_expense_with_ledger(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_expense_id      uuid
)

reverse_expense(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_expense_id      uuid,
  p_reason          text,
  p_reversal_date   date
)

post_manual_ledger_adjustment(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_client_id       uuid,
  p_amount          numeric,
  p_effective_date  date,
  p_description     text
)

pos_finalize_sale(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_session_id      uuid,
  p_payload         jsonb
)

record_salary_payment(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_employee_id     uuid,
  p_amount          numeric,
  p_currency        text,
  p_paid_at         timestamptz,
  p_payment_period  text,
  p_notes           text,
  p_create_expense  boolean
)
```

**Locked consequences.**

- `approve_invoice` accepts **no** `p_effective_date`. The invoice ledger row's `effective_date = invoices.issue_date`.
- `post_expense_with_ledger` accepts **no** `p_effective_date`. The expense ledger row's `effective_date = expenses.expense_date`.
- `reverse_expense` retains both `p_reason` and `p_reversal_date`.
- `post_payment` retains `p_payment_method`, `p_account_id`, `p_payload`. `p_payment_date` is used exclusively for the payment ledger row's `effective_date`.
- `pos_finalize_sale`'s cart, sale date, client, account, currency, discount, tax opt-out live inside the validated `p_payload`. No `p_cart`, `p_items`, `p_sale_date`, `p_client_id`, `p_account_id`, `p_currency`, `p_discount_amount` positional replacements exist.
- `create_invoice_with_items` / `update_invoice_with_items` carry header + items inside the single validated `p_payload`.

**Adapter locked shape (single per operation).** For each of Housing, Laboratory, Doctor, Vet, Vaccination, Breeding:

```text
<domain>_generate_invoice(
  p_tenant_id       uuid,
  p_idempotency_key uuid,
  p_source_id       uuid,       -- domain source identity (admission id, lab request id, …)
  p_caller_intent   jsonb       -- narrow validated caller intent (notes, share flag, corrects_invoice_id)
)
```

No adapter accepts caller-resolved `client_id`, `lab_horse_id`, `service_id`, `unit_price`, `currency`, `invoice_number`, or `status`. All are server-resolved from the domain source under advisory lock.

`PLAN_LOCK_RPC_SIGNATURE_DRIFT` retires against these exact signatures.

---

## §4. Locked idempotency taxonomy

**Prohibited tokens (banned from the spec):** `FIN_IDEMPOTENCY_MISMATCH`, generic `FIN_REF_MISSING_*`, `FIN_VALIDATION_*`, `FIN_AUTH_*` used as substitutes for the codes below.

**The three locked codes.**

| SQLSTATE | Code | Raised when |
|---|---|---|
| `42501` | `FIN_IDEMPOTENCY_ACTOR_MISMATCH` | Same `(tenant_id, operation, idempotency_key)`; different actor. |
| `23514` | `FIN_IDEMPOTENCY_CONFLICT` | Same actor + same key; different request hash. |
| `40001` | `FIN_IDEMPOTENCY_IN_PROGRESS` | Active row exists with `response IS NULL` (in-flight). |

**Rules.**

1. "Active completed" means `response IS NOT NULL` AND `expires_at > now()`.
2. Same actor + same key + same hash + active-completed → return stored `response` verbatim without revalidating inputs.
3. Different actor → `42501 FIN_IDEMPOTENCY_ACTOR_MISMATCH`.
4. Different request hash → `23514 FIN_IDEMPOTENCY_CONFLICT`.
5. Active row with `response IS NULL` → `40001 FIN_IDEMPOTENCY_IN_PROGRESS`.
6. Expired row (`expires_at <= now()`) → **conditional reclaim** via `UPDATE finance_request_idempotency SET actor_id = new, request_hash = new_hash, response = NULL, expires_at = new_expiry WHERE (…) AND expires_at <= now()` returning row; never `DELETE` then `INSERT`.

`PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT` retires against exclusive use of the three codes.

---

## §5. Payment mechanical correction

### 5.1 Live payment catalog evidence (embedded)

```sql
-- Query
SELECT t.typname, e.enumlabel, e.enumsortorder
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname IN ('payment_intent_type','payment_reference_type','payment_status')
ORDER BY t.typname, e.enumsortorder;
```

| typname | labels (in sortorder) |
|---|---|
| `payment_intent_type` | `platform_fee`, `service_payment`, `commission` |
| `payment_reference_type` | `academy_booking`, `service`, `order`, `auction`, `subscription` |
| `payment_status` | `draft`, `pending`, `paid`, `cancelled` |

```sql
-- Query
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='payment_intents'
ORDER BY ordinal_position;
```

`payment_intents` columns: `id, payer_user_id (NOT NULL), payee_account_id (NOT NULL), tenant_id (nullable), intent_type (NOT NULL), reference_type (NOT NULL), reference_id uuid (NOT NULL), amount_display text, currency text NOT NULL default 'SAR', status payment_status NOT NULL default 'draft', created_at, updated_at`.

`validate_payment_intent()` (verbatim from `pg_get_functiondef`): validates `platform_fee` → `tenant_id IS NULL` and payee is a platform account; `service_payment` / `commission` → `tenant_id NOT NULL` and payee is a `tenant` account belonging to the same tenant.

`payment_accounts` columns: `id, owner_type (payment_owner_type), tenant_id nullable, is_active NOT NULL, created_at`.

### 5.2 Interpretation and locked consequence

- No `completed` label exists on `payment_status`. Any prior claim of `payment_intents.status='completed'` is factually invalid and is removed from this spec.
- `payment_intents.reference_type` has no `invoice` value. The set is `{academy_booking, service, order, auction, subscription}`.
- `payment_intents.reference_id` is `uuid NOT NULL`.
- There is no `amount` numeric column on `payment_intents` — only `amount_display text`.
- There is no business-date column on `payment_intents`. `post_payment` does not introduce one.

Because `p_invoice_id`-scoped receivables payments cannot be mechanically expressed as any of the five `payment_reference_type` labels — and no `invoice` label exists — the mapping `(p_payment_method, p_invoice_id) → (payment_intents.intent_type, reference_type, reference_id, status)` cannot be locked from live evidence.

### 5.3 `post_payment` contract (locked signature, no invented enums)

Under the §3 signature `post_payment(p_tenant_id, p_idempotency_key, p_invoice_id, p_amount, p_payment_date, p_payment_method, p_account_id, p_payload)`:

1. Idempotency begin (§4).
2. Advisory lock `(tenant, source_type='invoice', source_id=p_invoice_id)`.
3. `SELECT … FROM invoices WHERE id=p_invoice_id AND tenant_id=p_tenant_id FOR UPDATE`; reject `not-found` → `FIN_INVOICE_NOT_FOUND`; reject `status IN ('draft','cancelled')` → `FIN_INVOICE_NOT_PAYABLE`.
4. Validate `p_account_id` in `payment_accounts` for this tenant, active, currency-compatible → `FIN_PAYMENT_ACCOUNT_INVALID` / `FIN_PAYMENT_CURRENCY_MISMATCH`.
5. Validate `p_amount > 0` → `FIN_PAYMENT_AMOUNT_INVALID`.
6. Compute remaining balance server-side; if `p_amount > remaining` and `p_payload->>'allow_overpayment' IS DISTINCT FROM 'true'` → `FIN_PAYMENT_OVERPAYMENT`.
7. **Business-row `payment_intents` insert is `[BLOCKED — PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED]`.** The public `post_payment` transaction still inserts the ledger row (step 8) and the billing linkage (step 10). The `payment_intents` business row is **deferred to Stage 6.b** pending explicit resolution of §5.4.
8. Ledger insert via `_finance_ledger_insert` with `entry_type='payment'`, `reference_type='invoice'` (text, not enum — `ledger_entries.reference_type` is text), `reference_id=p_invoice_id`, `amount = -p_amount`, `effective_date = p_payment_date`, `client_id = invoice.client_id`, `payment_method = p_payment_method`, `metadata = jsonb_build_object('account_id', p_account_id, 'via', 'post_payment')`.
9. Full client-balance chain rebuild via `_finance_ledger_insert`.
10. `_finance_billing_link_upsert` with `(source_type='payment', source_id = ledger_entry.id, invoice_id=p_invoice_id, link_kind='final', amount = p_amount)`.
11. Server-derived invoice status: recompute `remaining = total_amount - Σ payments`. If `remaining <= 0.01` → `status='paid'` and `payment_received_at = p_payment_date`; else if `remaining < total_amount` → `status='partial'`. Never accept caller `status`.
12. Complete idempotency (§4).

### 5.4 Retained blocker + decision block

`PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` is retained. The live enums cannot express an invoice-payment business row: `payment_reference_type` lacks `invoice`; `payment_status` lacks a terminal-success label other than `paid`; `payment_intent_type` lacks a receivables label (only `platform_fee|service_payment|commission`). Mapping every UI-reachable receivables method (`cash|card|transfer|debt`) is therefore impossible from live evidence.

Compact decision block (user input required — 3 options, recommended first):

| # | Option | Exact additive consequence | Recommended |
|---|---|---|---|
| A | Add enum labels `payment_reference_type += 'invoice'`, `payment_intent_type += 'receivable'`, keep `status='paid'` as terminal | Two `ALTER TYPE … ADD VALUE` migrations (F0-class, non-transactional per PG); `validate_payment_intent` extended with a `receivable` branch requiring `tenant_id NOT NULL` + payee kind `tenant`. Enables `post_payment` to insert a full business row with `reference_type='invoice'`, `reference_id=p_invoice_id`, `status='paid'`. | **YES** — minimal additive, no data migration, preserves current row shape |
| B | Route receivables through existing `reference_type='service'` with `reference_id=p_invoice_id` and add a `metadata jsonb` column on `payment_intents` to disambiguate | One `ALTER TABLE ADD COLUMN metadata jsonb`; readers must union `service` rows by metadata; audit reporting becomes ambiguous. | no — pollutes existing `service` semantic |
| C | Confirm `payment_intents` is out-of-scope for receivables; keep the business row in `ledger_entries` + `billing_links` only | No schema change; `post_payment` never inserts into `payment_intents`; §7.6 step 7 stays permanently deferred. Loses uniform payment-intent reporting. | no — divergent from platform-payment model |

Retirement rule: this blocker is retired only after the chosen migration is executed and `validate_payment_intent` is aligned. Until then, §7.6 step 7 remains `[BLOCKED — PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED]` and the ledger+billing-link path continues to carry the payment.

---

## §6. Expense and HR contracts

### 6.1 Live expense catalog evidence (embedded)

```sql
-- Query
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public.expenses'::regclass;
```

Verified constraints:

- `expenses_status_check`: `status IN ('pending','approved','paid','rejected')`
- `expenses_ledger_status_ck`: `ledger_status IS NULL OR ledger_status IN ('unposted','posted','reversed')`
- `expenses_source_pair_ck`: `(source_type IS NULL AND source_reference IS NULL) OR (source_type IS NOT NULL AND source_reference IS NOT NULL)`
- FKs: `ledger_entry_id → ledger_entries(id)`, `reverses_expense_id → expenses(id)`, `receipt_asset_id → media_assets(id)`.

Columns of interest: `status text, ledger_status text, posted_at timestamptz, ledger_entry_id uuid, source_type text, source_reference uuid, reverses_expense_id uuid`.

`hr_salary_payments.finance_expense_id uuid` — verified present.

### 6.2 Locked creation and lifecycle

Every `create_expense` result:

```
workflow status = 'pending'
ledger_status   = 'unposted'
```

`draft` is not a valid status per the live CHECK; the prior "draft|approved" creation choice is rejected.

| Workflow status | Ledger status | Allowed action |
|---|---|---|
| `pending` | `unposted` | edit (payload); approve; `post_expense_with_ledger` |
| `approved` | `unposted` | permitted edit (§6.3 field set); `post_expense_with_ledger` |
| `approved` or `paid` | `posted` | edit description/notes/receipt only; `reverse_expense` |
| any | `reversed` | terminal; edit notes only |

### 6.3 `post_expense_with_ledger`

Signature: §3. Uses `expenses.expense_date` for ledger `effective_date`. Produces exactly one ledger row:

```
entry_type       = 'expense'
reference_type   = 'expense'
reference_id     = expense.id
client_id        = NULL
amount           = +expense.amount
balance_after    = 0     -- null-client rows skip customer_balances chain
effective_date   = expense.expense_date
description      = expense.description
metadata         = jsonb_build_object('via','post_expense_with_ledger')
```

Transitions: `pending+unposted → approved+posted`; `approved+unposted → approved+posted`; `paid+unposted → paid+posted`. Invalid workflow/accounting states reject with `FIN_EXPENSE_STATE_INVALID` (`23514`). Updates `expenses.ledger_status='posted'`, `posted_at=now()`, `ledger_entry_id=<new>`.

### 6.4 Model-B reversal (positive reversal expense + negative reversal ledger)

`reverse_expense(p_tenant_id, p_idempotency_key, p_expense_id, p_reason, p_reversal_date)`:

1. Idempotency begin.
2. Advisory lock `(tenant, source_type='expense', source_id=p_expense_id)`.
3. `SELECT … FROM expenses WHERE id=p_expense_id AND tenant_id=p_tenant_id FOR UPDATE`. Reject `not-found`, reject `ledger_status <> 'posted'` → `FIN_EXPENSE_NOT_REVERSIBLE`, reject `source_type='hr_salary_payment'` → `FIN_EXPENSE_HR_REVERSAL_FORBIDDEN` (`42501`).
4. **Insert new reversal expense row** (positive stored amount, business record preserved):

    ```
    amount               = +original.amount
    category             = 'reversal'
    reverses_expense_id  = original.id
    ledger_status        = 'posted'
    source_type          = NULL
    source_reference     = NULL
    expense_date         = p_reversal_date
    description          = coalesce(p_reason, 'Reversal of ' || original.id)
    ```

5. **Insert one negative ledger row** via `_finance_ledger_insert`:

    ```
    entry_type       = 'expense'
    reference_type   = 'expense'
    reference_id     = reversal_expense.id     -- points to the new reversal row
    amount           = -original.amount
    balance_after    = 0
    effective_date   = p_reversal_date
    metadata         = jsonb_build_object('kind','expense_reversal','original_expense_id',original.id,'reason',p_reason)
    ```

6. `UPDATE expenses SET ledger_status='reversed' WHERE id=original.id`. **The original workflow `status`, original row, and original ledger row are preserved (Model-B).**
7. Complete idempotency.

`PLAN_LOCK_EXPENSE_STATE_DRIFT` and `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT` retire against §§6.2–6.4.

### 6.5 Private HR expense path

The public `create_expense` payload contract (§11.4) forbids `source_type` and `source_reference`. `record_salary_payment` cannot route through the public API without contradiction. Resolution:

- Introduce a private helper `_finance_expense_create_sourced(p_tenant_id, p_actor_id, p_payload, p_source_type_trusted text, p_source_reference_trusted uuid)` that (a) requires `p_source_type_trusted IN ('hr_salary_payment')` (extensible enum-guarded), (b) writes the sourced expense row with `source_type = p_source_type_trusted`, `source_reference = p_source_reference_trusted` and (c) is `SECURITY DEFINER`, owner-only EXECUTE. Public payloads cannot invoke it.
- `record_salary_payment` sequence:
  1. Idempotency begin.
  2. Advisory lock `(tenant, 'hr_salary_payment', p_employee_id)`.
  3. `INSERT INTO hr_salary_payments (…) RETURNING id AS salary_id;` — salary row first.
  4. If `p_create_expense = true`: `_finance_expense_create_sourced(p_tenant_id, actor, jsonb_build_object('category','salary','amount',p_amount,'currency',p_currency,'expense_date',p_paid_at::date,'description',coalesce(p_notes,'Salary payment')), 'hr_salary_payment', salary_id)` returning `expense_id`.
  5. `UPDATE hr_salary_payments SET finance_expense_id = expense_id WHERE id = salary_id` — the `finance_expense_id` column is verified live (§6.1).
  6. Optionally `post_expense_with_ledger(p_tenant_id, gen_random_uuid(), expense_id)` when `p_create_expense=true`.
  7. Complete idempotency.

`PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION` retires against §6.5.

---

## §7. Public RPC matrix (14 rows × 20 columns)

Column key: **Sig** (§3 reference), **Perm** (Stage 4 permission key), **Locks** (advisory + FOR UPDATE), **Idem** (begin/complete), **Preconds**, **Business rows written**, **Ledger rows written**, **Billing links written**, **Balance chain rebuilt?**, **Status transitions**, **Server-owned fields**, **Rejected caller fields**, **Snapshot fields**, **Response shape**, **Idempotency codes** (§4), **Domain codes** (`FIN_*`), **Reads preserved**, **Zero-drift asserted**, **Stage-8 client migration target**, **Notes**.

### 7.1 `create_invoice_with_items` (F3)

| Field | Value |
|---|---|
| Sig | §3.1 |
| Perm | `finance.invoice.create` |
| Locks | tenant-lock; source-lock `(tenant,'manual_invoice', new_id)` after generation |
| Idem | begin(operation='create_invoice_with_items'); complete |
| Preconds | payload passes §11.1; server-generated `invoice_number` per §9 |
| Business rows | `invoices` (status='draft'), `invoice_items[]` (server totals) |
| Ledger rows | none (draft) |
| Billing links | none |
| Balance chain | no |
| Status transitions | `∅ → draft` |
| Server-owned | `id, invoice_number, status, subtotal, tax_amount, total_amount, created_by, tenant_id, currency (from tenant)` |
| Rejected caller | `id, invoice_number, status, subtotal, tax_amount, total_amount, tenant_id, created_by, corrects_invoice_id, pos_session_id` |
| Snapshot | full canonical header + items |
| Response | `{ invoice_id, invoice_number, snapshot }` |
| Idem codes | §4 |
| Domain codes | `FIN_PAYLOAD_UNKNOWN_KEY (23514)`, `FIN_PAYLOAD_TYPE (23514)`, `FIN_ITEMS_EMPTY (23514)`, `FIN_ITEM_PRICE_INVALID (23514)`, `FIN_DISCOUNT_EXCEEDS_TOTAL (23514)`, `FIN_INVOICE_NUMBER_TAKEN (23505)` |
| Reads preserved | `useInvoices`, `useInvoiceItems` |
| Zero-drift | Stage 3 fingerprints unchanged |
| Stage-8 target | replace direct `invoices.insert` in `InvoiceFormDialog.tsx`, POS drafts, tests |
| Notes | manual only; adapter flows use §8 |

### 7.2 `update_invoice_with_items` (F3)

| Field | Value |
|---|---|
| Sig | §3.2 |
| Perm | `finance.invoice.edit` |
| Locks | source-lock `(tenant,'manual_invoice', invoice_id)`; `SELECT … FOR UPDATE invoices` |
| Idem | begin/complete |
| Preconds | `status='draft'`; §11.2 payload |
| Business rows | `invoices` update; `invoice_items` deleted+reinserted OR diffed with position stability |
| Ledger rows | none |
| Billing links | none |
| Balance chain | no |
| Status | `draft → draft` |
| Server-owned | totals, `updated_at`, `updated_by`, `currency` |
| Rejected caller | `id, tenant_id, invoice_number, status, totals, created_by, corrects_invoice_id, pos_session_id` |
| Snapshot | full header+items post-update |
| Response | `{ invoice_id, snapshot }` |
| Idem codes | §4 |
| Domain codes | `FIN_INVOICE_NOT_FOUND (23503-mapped)`, `FIN_INVOICE_NOT_DRAFT (42501)`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_ITEM_PRICE_INVALID`, `FIN_DISCOUNT_EXCEEDS_TOTAL` |
| Reads preserved | detail sheet |
| Zero-drift | Stage 3 |
| Stage-8 target | InvoiceFormDialog edit path |
| Notes | never on approved/cancelled |

### 7.3 `delete_draft_invoice` (F3)

| Field | Value |
|---|---|
| Sig | §3.3 |
| Perm | `finance.invoice.delete` |
| Locks | source-lock; `SELECT … FOR UPDATE` |
| Idem | begin/complete |
| Preconds | `status='draft'`, no `billing_links` referencing this invoice |
| Business rows | delete `invoice_items`, delete `invoices` |
| Ledger rows | none |
| Billing links | none |
| Balance chain | no |
| Status | `draft → ∅` |
| Server-owned | — |
| Rejected caller | any additional fields |
| Snapshot | `{ deleted_invoice_id }` |
| Response | `{ deleted: true, invoice_id }` |
| Idem codes | §4 |
| Domain codes | `FIN_INVOICE_NOT_DRAFT`, `FIN_INVOICE_HAS_LINKS (42501)` |
| Reads preserved | list refresh |
| Zero-drift | Stage 3 |
| Stage-8 target | list "Delete" action |
| Notes | — |

### 7.4 `approve_invoice` (F3)

| Field | Value |
|---|---|
| Sig | §3.4 — **no `p_effective_date`** |
| Perm | `finance.invoice.approve` |
| Locks | source-lock; `SELECT … FOR UPDATE`; per-client ledger lock inside `_finance_ledger_insert` |
| Idem | begin/complete |
| Preconds | `status='draft'`, `total_amount > 0` OR audit-only (zero-charge invoices skip ledger per current behavior) |
| Business rows | `invoices.status='approved'` |
| Ledger rows | one `entry_type='invoice'`, `reference_type='invoice'`, `reference_id=invoice_id`, `amount = +total_amount`, `effective_date = invoices.issue_date`, `client_id = invoice.client_id` |
| Billing links | none created here; adapter-created links remain valid |
| Balance chain | rebuild for `invoice.client_id` |
| Status | `draft → approved` |
| Server-owned | `status`, ledger row, chain |
| Rejected caller | any input beyond signature |
| Snapshot | `{ invoice_id, ledger_entry_id, effective_date }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_INVOICE_NOT_DRAFT`, `FIN_INVOICE_TOTAL_INVALID (23514)` |
| Reads preserved | statement, list |
| Zero-drift | Stage 3 |
| Stage-8 target | `src/lib/finance/approveInvoice.ts` (see current-code sample) |
| Notes | zero-charge invoice → status update only, no ledger row |

### 7.5 `cancel_invoice` (F3)

| Field | Value |
|---|---|
| Sig | §3.5 |
| Perm | `finance.invoice.cancel` |
| Locks | source-lock; `SELECT … FOR UPDATE` |
| Idem | begin/complete |
| Preconds | `status IN ('approved','partial','paid')`; `p_reason NOT NULL` |
| Business rows | `invoices.status='cancelled'` (original preserved) |
| Ledger rows | reversal negative ledger row (`entry_type='invoice'`, `amount = -invoice.total_amount`, `effective_date = p_effective_date`) — Model-B |
| Billing links | historical links preserved; a new `billing_links` row with `link_kind='refund'` or `'credit_note'` may be inserted if `p_payload->>'kind'` — but signature has no payload, so this pass emits no additional link |
| Balance chain | rebuild for `invoice.client_id` |
| Status | `approved|partial|paid → cancelled` |
| Server-owned | `status`, reversal ledger row |
| Rejected caller | anything beyond signature |
| Snapshot | `{ invoice_id, reversal_ledger_entry_id, effective_date, reason }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_INVOICE_NOT_CANCELLABLE (42501)`, `FIN_REASON_REQUIRED (23514)` |
| Reads preserved | statement |
| Zero-drift | Stage 3 |
| Stage-8 target | invoice detail sheet Cancel |
| Notes | corrective rebill uses adapter with `corrects_invoice_id` |

### 7.6 `post_payment` (F3)

| Field | Value |
|---|---|
| Sig | §3.6 |
| Perm | `finance.payment.create` |
| Locks | source-lock `(tenant,'invoice',p_invoice_id)`; per-client ledger lock |
| Idem | begin/complete |
| Preconds | invoice `status IN ('approved','partial')`; `p_amount>0`; account/currency valid |
| Business rows | `payment_intents` insert is **deferred (§5.4)** |
| Ledger rows | one `entry_type='payment'`, `reference_type='invoice'`, `reference_id=p_invoice_id`, `amount=-p_amount`, `effective_date=p_payment_date`, `payment_method=p_payment_method`, `metadata={account_id, via:'post_payment'}` |
| Billing links | `(source_type='payment', source_id=ledger_entry.id, invoice_id=p_invoice_id, link_kind='final', amount=p_amount)` |
| Balance chain | rebuild for `invoice.client_id` |
| Status | server-derived: `approved → partial` OR `approved|partial → paid` |
| Server-owned | invoice `status`, `payment_received_at` (on `paid`), ledger row, billing link |
| Rejected caller | `status`, `payment_received_at`, `total_amount`, `balance_after` |
| Snapshot | `{ invoice_id, ledger_entry_id, billing_link_id, remaining_after }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_INVOICE_NOT_PAYABLE`, `FIN_PAYMENT_ACCOUNT_INVALID`, `FIN_PAYMENT_CURRENCY_MISMATCH`, `FIN_PAYMENT_AMOUNT_INVALID`, `FIN_PAYMENT_OVERPAYMENT` |
| Reads preserved | statement, payments list |
| Zero-drift | Stage 3 |
| Stage-8 target | payments capture UI |
| Notes | `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` — business-row insert deferred |

### 7.7 `create_expense` (F3)

| Field | Value |
|---|---|
| Sig | §3.7 |
| Perm | `finance.expenses.create` |
| Locks | tenant-lock only |
| Idem | begin/complete |
| Preconds | §11.4 payload |
| Business rows | `expenses` with `status='pending'`, `ledger_status='unposted'`, `source_type=NULL`, `source_reference=NULL` |
| Ledger rows | none |
| Billing links | none |
| Balance chain | no |
| Status | `∅ → pending+unposted` |
| Server-owned | `id, tenant_id, created_by, created_at, status, ledger_status` |
| Rejected caller | `id, tenant_id, created_by, status, ledger_status, ledger_entry_id, source_type, source_reference, reverses_expense_id, posted_at` |
| Snapshot | canonical row |
| Response | `{ expense_id, snapshot }` |
| Idem codes | §4 |
| Domain codes | `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_EXPENSE_CATEGORY_INVALID (23514)`, `FIN_EXPENSE_AMOUNT_INVALID (23514)` |
| Reads preserved | expenses list |
| Zero-drift | Stage 3 |
| Stage-8 target | `useExpenses.createExpense` |
| Notes | HR path uses §6.5 private helper |

### 7.8 `update_expense` (F3)

| Field | Value |
|---|---|
| Sig | §3.8 |
| Perm | `finance.expenses.manage` |
| Locks | source-lock `(tenant,'expense',expense_id)`; `SELECT … FOR UPDATE` |
| Idem | begin/complete |
| Preconds | lifecycle §6.2 |
| Business rows | `expenses` update — field set restricted by state per §6.2 |
| Ledger rows | none |
| Billing links | none |
| Balance chain | no |
| Status | preserved |
| Server-owned | `updated_at`, computed fields |
| Rejected caller | same as §7.7 rejects |
| Snapshot | post-update row |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_EXPENSE_STATE_INVALID`, `FIN_PAYLOAD_UNKNOWN_KEY` |
| Reads preserved | expense detail |
| Zero-drift | Stage 3 |
| Stage-8 target | `useExpenses.updateExpense` |
| Notes | — |

### 7.9 `delete_expense` (F3)

| Field | Value |
|---|---|
| Sig | §3.9 |
| Perm | `finance.expenses.manage` |
| Locks | source-lock; `SELECT … FOR UPDATE` |
| Idem | begin/complete |
| Preconds | `ledger_status IS NULL OR 'unposted'`; not `source_type='hr_salary_payment'` |
| Business rows | `DELETE FROM expenses …` |
| Ledger rows | none |
| Billing links | none |
| Balance chain | no |
| Status | `pending+unposted → ∅` |
| Server-owned | — |
| Rejected caller | any input beyond signature |
| Snapshot | `{ deleted_expense_id }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_EXPENSE_POSTED (42501)`, `FIN_EXPENSE_HR_LOCKED (42501)` |
| Reads preserved | list |
| Zero-drift | Stage 3 |
| Stage-8 target | `useExpenses.deleteExpense` |
| Notes | — |

### 7.10 `post_expense_with_ledger` (F3)

| Field | Value |
|---|---|
| Sig | §3.10 — **no `p_effective_date`** |
| Perm | `finance.expenses.approve` |
| Locks | source-lock; `SELECT … FOR UPDATE` |
| Idem | begin/complete |
| Preconds | `ledger_status='unposted'`; state per §6.2 |
| Business rows | update `expenses.ledger_status='posted'`, `posted_at=now()`, `ledger_entry_id`; `status` may transition `pending→approved` |
| Ledger rows | one per §6.3 |
| Billing links | none |
| Balance chain | null-client → no customer chain |
| Status | per §6.2 |
| Server-owned | `ledger_status, posted_at, ledger_entry_id, status` |
| Rejected caller | any input beyond signature |
| Snapshot | `{ expense_id, ledger_entry_id, effective_date }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_EXPENSE_STATE_INVALID`, `FIN_EXPENSE_AMOUNT_INVALID` |
| Reads preserved | list, ledger view |
| Zero-drift | Stage 3 |
| Stage-8 target | new UI "Post" action |
| Notes | uses `expenses.expense_date` |

### 7.11 `reverse_expense` (F3)

| Field | Value |
|---|---|
| Sig | §3.11 |
| Perm | `finance.expenses.manage` + `finance.adjustment.create` |
| Locks | source-lock on original; new source-lock on reversal |
| Idem | begin/complete |
| Preconds | original `ledger_status='posted'`, not `source_type='hr_salary_payment'` |
| Business rows | new reversal `expenses` row (positive amount, `category='reversal'`, `reverses_expense_id=original.id`); original preserved |
| Ledger rows | one negative ledger row per §6.4 step 5 |
| Billing links | none |
| Balance chain | null-client → no customer chain |
| Status | original.`ledger_status: posted → reversed`; workflow `status` preserved |
| Server-owned | new reversal row, negative ledger row, original ledger_status |
| Rejected caller | any input beyond signature |
| Snapshot | `{ original_expense_id, reversal_expense_id, reversal_ledger_entry_id, effective_date, reason }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_EXPENSE_NOT_REVERSIBLE (42501)`, `FIN_EXPENSE_HR_REVERSAL_FORBIDDEN (42501)`, `FIN_REASON_REQUIRED` |
| Reads preserved | list |
| Zero-drift | Stage 3 |
| Stage-8 target | new UI "Reverse" action |
| Notes | Model-B strictly |

### 7.12 `post_manual_ledger_adjustment` (F3)

| Field | Value |
|---|---|
| Sig | §3.12 |
| Perm | `finance.adjustment.create` |
| Locks | per-client ledger lock inside helper |
| Idem | begin/complete |
| Preconds | `p_amount <> 0`, `p_client_id` belongs to tenant, `p_description NOT NULL` |
| Business rows | none |
| Ledger rows | one `entry_type='adjustment'`, `reference_type='adjustment'`, `reference_id=gen_random_uuid()` (self), `amount=p_amount`, `effective_date=p_effective_date`, `client_id=p_client_id`, `description=p_description` |
| Billing links | none |
| Balance chain | rebuild for `p_client_id` |
| Status | — |
| Server-owned | ledger row, chain |
| Rejected caller | `balance_after` |
| Snapshot | `{ ledger_entry_id, effective_date, amount }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_ADJUSTMENT_AMOUNT_INVALID (23514)`, `FIN_ADJUSTMENT_DESCRIPTION_REQUIRED (23514)`, `FIN_CLIENT_NOT_IN_TENANT (42501)` |
| Reads preserved | statement |
| Zero-drift | Stage 3 |
| Stage-8 target | new UI "Adjustment" action |
| Notes | independent from invoice/expense |

### 7.13 `pos_finalize_sale` (F5)

| Field | Value |
|---|---|
| Sig | §3.13 |
| Perm | `finance.invoice.create` + `finance.payment.create` |
| Locks | `SELECT … FOR UPDATE pos_sessions WHERE id=p_session_id AND status='open'`; source-lock on generated invoice; per-client ledger lock if `client_id`; **inventory locks per §8** *(deferred — see blocker)* |
| Idem | begin/complete |
| Preconds | session open; §11.6 payload; §5 rules for payment method; **inventory allocation per §8 (deferred blocker)** |
| Business rows | `pos_sales` (unique on `(tenant, session, sale_number)`); `invoices` + `invoice_items`; `payment_intents` **deferred (§5.4)** |
| Ledger rows | invoice ledger row (approve semantics) + payment ledger row (§7.6) |
| Billing links | `(source_type='pos_sale', source_id=pos_sales.id, link_kind='final', invoice_id, amount)` |
| Balance chain | when `client_id NOT NULL` |
| Status | invoice created `paid` for non-debt; `partial|approved` for debt |
| Server-owned | `sale_number` (allocated under session lock), `cart_hash`, totals, `invoice_number` (§9), ledger, links |
| Rejected caller | `invoice_id, pos_sales.id, invoice_number, status, subtotal, tax_amount, total_amount, balance_after, sale_number, cart_hash` |
| Snapshot | full canonical POS sale |
| Response | `{ pos_sale_id, invoice_id, invoice_number, ledger_entries[], billing_link_id, session_totals_after }` |
| Idem codes | §4 |
| Domain codes | `FIN_POS_SESSION_NOT_OPEN (42501)`, `FIN_POS_SESSION_CROSS_TENANT (42501)`, `FIN_POS_SALE_DUPLICATE (23505 on pos_sales_session_sale_unique)`, `FIN_PAYMENT_ACCOUNT_INVALID`, `FIN_INVOICE_NUMBER_TAKEN (23505)`, `FIN_PAYLOAD_UNKNOWN_KEY`, `FIN_DISCOUNT_EXCEEDS_TOTAL` |
| Reads preserved | POS session panel |
| Zero-drift | Stage 3 |
| Stage-8 target | `usePOSCore.createSale` |
| Notes | See §7.13-A below for the POS inventory decision block (`POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`). Session totals are aggregate-on-read from `invoices` filtered by `pos_session_id` + `payment_method` (evidenced in `usePOSSessions.ts:135–160`); `pos_sessions` has no `sales_count/total_amount` columns and Stage 6 introduces none. |

**§7.13-A POS inventory decision block (retained blocker).**

Live catalog evidence: two independent inventory stacks exist.

| Stack | Tables | Writer sites in repo | Reader sites | Product/SKU identity | Warehouse relation | Quantity source | Reservation |
|---|---|---|---|---|---|---|---|
| Legacy (single-warehouse) | `inventory_items`, `inventory_transactions` | 6 writers in `src/hooks/inventory/*` (INSERT on both, plus items CRUD) | 1 read | `inventory_items.sku` (nullable) | none | `inventory_items.current_quantity` (trigger-updated from transactions) | none |
| Canonical (multi-warehouse) | `products`, `stock_levels`, `inventory_movements`, `warehouses` | **0 writers** in repo (only `src/lib/pricing/resolver.ts` reads `products`) | 1 read | `products.sku` + `barcode` | `warehouses` (branch-scoped, `is_default` flag) | `stock_levels.quantity` / `reserved_quantity` / generated `available_quantity` | `stock_levels.reserved_quantity` |

POS cart shape (`usePOSCore.ts` `POSCartItem`): `{id, name, unit_price, quantity, service_id, entity_type, entity_id}` — **no `product_id`, no `sku`, no `warehouse_id`**. `tenant_services` (POS catalog) has columns `{id, tenant_id, name, service_type, price_display, unit_price, service_kind, category_id, is_taxable, is_active, is_public}` — **no `product_id`, no `sku`, no `warehouse_id`**.

Consequence: there is **no mechanically valid cart → product → warehouse path**. POS cannot atomically bind stocked-goods lines under the current schema. Every POS line today is a service-only line.

`POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` is retained. Compact decision block (user input required — 3 options, recommended first):

| # | Option | Exact additive consequence | Recommended |
|---|---|---|---|
| A | Keep POS strictly service-only in Stage 6. Add `tenant_services.stockable boolean default false CHECK (NOT stockable)` guard and lock `pos_finalize_sale` line validation to `service_kind IN ('service','free_text')`. Introduce a separate `pos_stocked_sale` RPC in a later stage bound to the canonical `products+stock_levels+inventory_movements+warehouses` stack once cart shape gains `product_id`+`warehouse_id`. | 1 additive CHECK; POS `resolved_snapshot` records `zero_stock_effect=true` per line; no inventory locks in `pos_finalize_sale`; retires the blocker for Stage 6 scope. | **YES** — matches live reality, zero data risk |
| B | Bridge POS cart to canonical stack now: add `tenant_services.product_id uuid REFERENCES products(id)`, add cart `product_id`+`warehouse_id`, resolve warehouse from `pos_sessions.branch_id → warehouses.branch_id AND is_default`, lock `stock_levels FOR UPDATE`, insert `inventory_movements`, deny negative stock unless `tenants.allow_negative_stock=true`. | 1 additive FK on `tenant_services`; cart-shape change + POS UI change; `pos_finalize_sale` gains 4 new steps between cart validation and invoice creation. Retires the blocker but expands Stage 6 scope materially. | no — largest surface, delays Stage 6 |
| C | Bind POS to legacy `inventory_items+inventory_transactions` (single-warehouse) via `tenant_services.inventory_item_id uuid REFERENCES inventory_items(id)`. | 1 additive FK; no warehouse concept; conflicts with canonical stack already present. | no — locks in the deprecated stack |

Retirement rule: retired only when the user selects an option and the corresponding additive DDL is authored. Until then `pos_finalize_sale` (§7.13) treats every cart line as a service line and records `zero_stock_effect=true` in the resolved snapshot.


### 7.14 `record_salary_payment` (F3, private HR path)

| Field | Value |
|---|---|
| Sig | §3.14 |
| Perm | `hr.salary.pay` (existing) |
| Locks | `(tenant,'hr_salary_payment', p_employee_id)` |
| Idem | begin/complete |
| Preconds | employee belongs to tenant; `p_amount > 0`; `p_currency` valid |
| Business rows | `hr_salary_payments` (first); optional `expenses` via `_finance_expense_create_sourced` (§6.5) |
| Ledger rows | optional via `post_expense_with_ledger` when `p_create_expense=true` |
| Billing links | none |
| Balance chain | none (null-client) |
| Status | — |
| Server-owned | `id, finance_expense_id, created_by` |
| Rejected caller | `finance_expense_id, id, created_by` |
| Snapshot | `{ salary_payment_id, expense_id?, ledger_entry_id? }` |
| Response | snapshot |
| Idem codes | §4 |
| Domain codes | `FIN_EMPLOYEE_NOT_IN_TENANT (42501)`, `FIN_SALARY_AMOUNT_INVALID (23514)` |
| Reads preserved | payroll list |
| Zero-drift | Stage 3 |
| Stage-8 target | `useSalaryPayments.recordPayment` |
| Notes | never uses public `create_expense` |

---

## §8. Adapter matrix (6 rows × 20 columns)

Shared shape per §3 adapter block. All adapters: `SECURITY DEFINER`, tenant-lock + `(tenant, source_type, p_source_id)` source-lock; server resolves `client_id` from the domain source; server resolves `service_id`, `unit_price`, `currency`, `category_id` from `tenant_services` / `lab_services` / domain catalog; `p_caller_intent` accepts only `{ notes?: text, share_with_client?: bool, corrects_invoice_id?: uuid }`.

For each adapter row, the 20 columns are identical in shape to §7 (Sig, Perm, Locks, Idem, Preconds, Business rows, Ledger rows, Billing links, Balance chain, Status transitions, Server-owned, Rejected caller, Snapshot, Response, Idem codes, Domain codes, Reads preserved, Zero-drift, Stage-8 target, Notes).

### 8.1 `housing_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='boarding_admission'` |
| Perm | `finance.invoice.create` |
| Locks | tenant + `(tenant,'boarding_admission',p_source_id)` |
| Idem | begin/complete |
| Preconds | admission exists in tenant, not fully billed for requested period |
| Business rows | `invoices (status='approved')` + `invoice_items` populated by `boardingPeriodEngine` (server) |
| Ledger rows | one invoice ledger row (approve semantics) |
| Billing links | `(source_type='boarding_admission', source_id=p_source_id, invoice_id, link_kind='final', amount=total)` — cancelled corrective rebill only if `p_caller_intent.corrects_invoice_id` verified in source lineage |
| Balance chain | rebuild for admission.client_id |
| Status | invoice created `approved` |
| Server-owned | client_id, service_id, period_start/end, price, category, currency, tax |
| Rejected caller | client_id, service_id, unit_price, currency, invoice_number, status, corrects_invoice_id on non-corrective calls |
| Snapshot | canonical adapter response |
| Response | `{ invoice_id, invoice_number, ledger_entry_id, billing_link_id }` |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND (42501)`, `FIN_ADAPTER_DUPLICATE_PERIOD (23514)`, `FIN_ADAPTER_CATALOG_MISSING (23514)` |
| Reads preserved | admissions list, statements |
| Zero-drift | Stage 3 |
| Stage-8 target | Housing "Generate Invoice" |
| Notes | boarding proration engine runs server-side inside RPC |

### 8.2 `laboratory_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='lab_submission'` |
| Perm | `finance.invoice.create` |
| Locks | `(tenant,'lab_submission',p_source_id)` |
| Idem | begin/complete |
| Preconds | submission finalized (`status='reviewed'|'final'`), not previously billed |
| Business rows | `invoices` + `invoice_items` (each row snapshots `lab_horse_id`, `category_id`, `service_source='lab'`) |
| Ledger rows | invoice ledger row |
| Billing links | `('lab_submission', p_source_id, invoice_id, 'final', amount)` |
| Balance chain | rebuild for shared-client resolution |
| Status | `approved` |
| Server-owned | client_id, lab_horse_ids, service_ids, prices, category, currency, tax |
| Rejected caller | commercial fields |
| Snapshot | canonical |
| Response | as §8.1 |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND`, `FIN_ADAPTER_SOURCE_NOT_FINAL (42501)`, `FIN_ADAPTER_DUPLICATE_PERIOD` |
| Reads preserved | lab requests, statements |
| Zero-drift | Stage 3 |
| Stage-8 target | Lab request panel "Generate Invoice" |
| Notes | multi-horse submission billed as single invoice per submission |

### 8.3 `doctor_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='doctor_consultation'` |
| Perm | `finance.invoice.create` |
| Locks | `(tenant,'doctor_consultation',p_source_id)` |
| Idem | begin/complete |
| Preconds | consultation exists, not previously billed |
| Business rows | `invoices` + `invoice_items` (Doctor-specific services — known catalog debt: doctor services live outside `tenant_services`; adapter resolves via `doctor_services` table) |
| Ledger rows | invoice ledger row |
| Billing links | `('doctor_consultation', …, 'final', amount)` |
| Balance chain | yes |
| Status | `approved` |
| Server-owned | commercial fields |
| Rejected caller | commercial fields |
| Snapshot | canonical |
| Response | as §8.1 |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND`, `FIN_ADAPTER_DUPLICATE_PERIOD`, `FIN_ADAPTER_CATALOG_MISSING` |
| Reads preserved | consultation detail |
| Zero-drift | Stage 3 |
| Stage-8 target | `CreateInvoiceFromConsultation.tsx` |
| Notes | Doctor catalog mismatch is known technical debt; adapter unifies at boundary |

### 8.4 `vet_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='vet_treatment'` |
| Perm | `finance.invoice.create` |
| Locks | `(tenant,'vet_treatment',p_source_id)` |
| Idem | begin/complete |
| Preconds | treatment finalized, mode `internal` bills client / mode `external` books supplier payable (out-of-scope for this adapter — see §8.4 note) |
| Business rows | `invoices` + `invoice_items` |
| Ledger rows | invoice ledger row |
| Billing links | `('vet_treatment', …, 'final', amount)` |
| Balance chain | yes |
| Status | `approved` |
| Server-owned | commercial fields |
| Rejected caller | commercial fields |
| Snapshot | canonical |
| Response | as §8.1 |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND`, `FIN_ADAPTER_DUPLICATE_PERIOD`, `FIN_ADAPTER_EXTERNAL_MODE (42501)` |
| Reads preserved | vet treatment detail |
| Zero-drift | Stage 3 |
| Stage-8 target | Vet treatment "Generate Invoice" |
| Notes | External-mode invoices routed through supplier payable creation (out of scope for AR adapter) |

### 8.5 `vaccination_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='vaccination_record'` |
| Perm | `finance.invoice.create` |
| Locks | `(tenant,'vaccination_record',p_source_id)` |
| Idem | begin/complete |
| Preconds | vaccination record finalized |
| Business rows | `invoices` + `invoice_items` (per-horse or per-record depending on catalog) |
| Ledger rows | invoice ledger row |
| Billing links | `('vaccination_record', …, 'final', amount)` |
| Balance chain | yes |
| Status | `approved` |
| Server-owned | commercial fields |
| Rejected caller | commercial fields |
| Snapshot | canonical |
| Response | as §8.1 |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND`, `FIN_ADAPTER_DUPLICATE_PERIOD` |
| Reads preserved | vaccination log |
| Zero-drift | Stage 3 |
| Stage-8 target | Vaccination detail "Generate Invoice" |
| Notes | — |

### 8.6 `breeding_generate_invoice` (F4)

| Field | Value |
|---|---|
| Sig | adapter shape, `source_type='breeding_event'` |
| Perm | `finance.invoice.create` |
| Locks | `(tenant,'breeding_event',p_source_id)` |
| Idem | begin/complete |
| Preconds | breeding event completed |
| Business rows | `invoices` + `invoice_items` |
| Ledger rows | invoice ledger row |
| Billing links | `('breeding_event', …, 'final', amount)` |
| Balance chain | yes |
| Status | `approved` |
| Server-owned | commercial fields |
| Rejected caller | commercial fields |
| Snapshot | canonical |
| Response | as §8.1 |
| Idem codes | §4 |
| Domain codes | `FIN_ADAPTER_SOURCE_NOT_FOUND`, `FIN_ADAPTER_DUPLICATE_PERIOD` |
| Reads preserved | breeding event detail |
| Zero-drift | Stage 3 |
| Stage-8 target | Breeding event "Generate Invoice" |
| Notes | — |

---

## §9. Server-authoritative invoice-number policy

### 9.1 Live evidence (embedded)

```sql
-- Query
SELECT left(invoice_number,4) AS prefix, count(*)
FROM public.invoices GROUP BY 1 ORDER BY 2 DESC LIMIT 20;
```

| prefix | count |
|---|---|
| `INV-` | 33 |
| `اسط-` | 4 |
| `الم-` | 3 |
| `ِAL-` | 1 |
| `SUL-` | 1 |

```sql
-- Query
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename='invoices';
```

Unique index: `invoices_tenant_id_invoice_number_key ON (tenant_id, invoice_number)`.

```sql
-- Query — search for server-side generators
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND (proname ILIKE '%invoice%number%'
       OR proname ILIKE '%generate%invoice%'
       OR proname ILIKE '%next%invoice%');
```

**Result: zero rows.** No server-side invoice-number generator exists.

### 9.2 Interpretation

- Multiple prefix families exist across tenants (`INV-`, Arabic prefixes, `AL-`, `SUL-`), each derived from tenant-scoped configuration currently held **client-side** (`usePOSCore.ts` uses `POS-${Date.now().toString(36).toUpperCase()}`; manual invoices use per-tenant prefixes assembled in `InvoiceFormDialog`).
- The only server guarantee is per-tenant uniqueness via `invoices_tenant_id_invoice_number_key`. There is no server-side counter or generator.

### 9.3 Locked contract (target state)

1. Introduce a private helper `_finance_invoice_number_next(p_tenant_id uuid, p_domain text) RETURNS text`.
2. Persist per-tenant per-domain counters in a new relation `finance_invoice_number_counters(tenant_id uuid, domain text, prefix text, next_seq bigint, PRIMARY KEY (tenant_id, domain))` — writes gated by row-level advisory lock `_finance_advisory_lock_key(p_tenant_id, 'invoice_number:'||p_domain, gen_random_uuid())` OR by `SELECT … FOR UPDATE` on the counter row (**preferred: `SELECT … FOR UPDATE` on the counter row** for durable serialization).
3. `p_domain` values: `'manual'`, `'pos'`, `'housing'`, `'lab'`, `'doctor'`, `'vet'`, `'vaccination'`, `'breeding'`. Selection is by caller RPC/adapter, never by end-caller payload.
4. Prefix policy: read from `tenants.invoice_number_config jsonb` (new column, **not created in this pass**) with fallback to `'INV-'`. **Missing configuration for tenants that currently rely on `اسط-`, `الم-`, `AL-`, `SUL-` prefixes** is the exact blocker for locking the migration.
5. Collision handling: `INSERT INTO invoices …` catching `23505` retries up to 5× re-reading the counter; **never** `MAX(right(…))` fallback.
6. Reject any caller-supplied `invoice_number` in payload (`FIN_PAYLOAD_UNKNOWN_KEY`).
7. Return the server-generated number in both response and resolved snapshot.

### 9.4 Retained blocker + per-surface authority table + decision block

Per-surface format authority (live evidence, all client-generated today):

| Surface | Current generator | Prefix source | Editable by user | Sequential? | Collision handling |
|---|---|---|---|---|---|
| Manual Finance | `InvoiceFormDialog` assembled string | client, tenant-specific | yes | no (timestamp-hash) | tenant-unique index only |
| POS | `POS-${Date.now().toString(36).toUpperCase()}` (`usePOSCore.ts:113`) | client constant | no | no | tenant-unique index only |
| Housing | `Create*Invoice*` dialog string | client | yes | no | tenant-unique index only |
| Laboratory | client string, tenant-specific | client | yes | no | tenant-unique index only |
| Doctor | client string | client | yes | no | tenant-unique index only |
| Vet | client string | client | yes | no | tenant-unique index only |
| Vaccination | client string | client | yes | no | tenant-unique index only |
| Breeding | client string | client | yes | no | tenant-unique index only |
| Demo (`useFinanceDemo`) | client seed strings | client, demo-only | yes | no | tagged out-of-scope |

Server-side infra: **zero sequences**, **zero generator functions**, **no `tenants.invoice_number_config`**, **no `branches.invoice_prefix`**. Only guarantee is the composite unique index `(tenant_id, invoice_number)`.

`INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` is retained: no persisted per-tenant counter, no persisted per-tenant prefix, and the 5 live prefix families (`INV-`, `اسط-`, `الم-`, `AL-`, `SUL-`) have no server-readable configuration.

Compact decision block (user input required — 3 options, recommended first):

| # | Option | Exact additive consequence | Recommended |
|---|---|---|---|
| A | Add `tenants.invoice_number_config jsonb` + relation `finance_invoice_number_counters(tenant_id, domain, prefix, next_seq)` + private `_finance_invoice_number_next(tenant, domain)` using `SELECT … FOR UPDATE` on the counter row | 2 additive DDL statements + 1 helper; one back-fill row per existing tenant × domain; `usePOSCore.ts:113` and every `Create*Invoice*` dialog cease to emit numbers; server enforces prefix per §9.3 | **YES** — sequential, auditable, uses existing unique index |
| B | Server-generate a collision-resistant opaque suffix (`ULID` or `gen_random_uuid()::text`) keyed by domain-specific prefix from tenant config | 1 DDL for `tenants.invoice_number_config`; no counter table; loses human-readable sequence | no — breaks tenants relying on sequential numbering |
| C | Preserve caller-supplied numbers, add server validation only (prefix must match tenant config; reject collisions) | 1 DDL for `tenants.invoice_number_config`; keeps existing client generators | no — violates "no caller-supplied final number" rule and leaves POS timestamp identifiers |

Retirement rule: retired only after (a) option chosen, (b) tenant-config DDL executed, (c) prefixes back-filled for every live tenant (5 families evidenced above), and (d) `_finance_invoice_number_next` merged. Until then §9.3 is a target contract, not a live one.

---

## §10. Private helpers

### 10.1 `_finance_ledger_insert` (generalized)

Signature:

```text
_finance_ledger_insert(
  p_tenant_id       uuid,
  p_client_id       uuid,                  -- NULL for null-client rows
  p_entry_type      text,                  -- 'invoice'|'payment'|'credit'|'adjustment'|'expense' (post F0)
  p_reference_type  text,                  -- e.g. 'invoice','expense','adjustment'
  p_reference_id    uuid,
  p_amount          numeric,
  p_effective_date  date,
  p_description     text,
  p_payment_method  text,                  -- optional
  p_payment_session_id uuid,               -- optional (live column verified)
  p_metadata        jsonb,
  p_created_by      uuid
) RETURNS TABLE(ledger_entry_id uuid, balance_after numeric)
```

Behavior:

1. If `p_client_id IS NOT NULL`, acquire `pg_advisory_xact_lock(_finance_advisory_lock_key(p_tenant_id, 'client_ledger', p_client_id))`.
2. `INSERT INTO ledger_entries (…) RETURNING id INTO v_new_id;`.
3. If `p_client_id IS NULL`: `UPDATE ledger_entries SET balance_after=0 WHERE id=v_new_id;` and skip chain rebuild + customer_balances.
4. If `p_client_id IS NOT NULL`:
   - Recompute full ordered chain: `SELECT id, amount FROM ledger_entries WHERE tenant_id=p_tenant_id AND client_id=p_client_id ORDER BY effective_date, created_at, id`.
   - Update every affected `balance_after` (running sum).
   - `INSERT INTO customer_balances (tenant_id, client_id, balance, currency, last_updated) VALUES (…) ON CONFLICT (tenant_id, client_id) DO UPDATE SET balance = EXCLUDED.balance, last_updated = now();`.
5. Return `(v_new_id, computed_balance_after_for_new_row)`.

### 10.2 `_finance_billing_link_upsert`

The live index `idx_billing_links_tenant_source` is **non-unique**. `SELECT … FOR UPDATE` through it does not provide uniqueness. Operate under the caller's tenant-qualified source advisory lock (`_finance_source_lock_key(p_tenant_id, p_source_type, p_source_id)`).

Signature:

```text
_finance_billing_link_upsert(
  p_tenant_id     uuid,
  p_source_type   text,
  p_source_id     uuid,
  p_invoice_id    uuid,
  p_link_kind     text,      -- 'deposit'|'final'|'refund'|'credit_note'
  p_amount        numeric,
  p_created_by    uuid,
  p_corrects_invoice_id uuid -- non-null only for verified corrective rebill
) RETURNS uuid
```

Behavior:

1. Assert `pg_try_advisory_xact_lock` is held (caller responsibility).
2. Read full existing link set `SELECT id, invoice_id, link_kind, amount FROM billing_links WHERE tenant_id=p_tenant_id AND source_type=p_source_type AND source_id=p_source_id`.
3. If an identical row `(invoice_id, link_kind, amount)` exists → return existing `id` (replay).
4. Else if a conflicting **active** row exists (same `link_kind='final'` referencing a non-cancelled invoice): reject `FIN_BILLING_LINK_CONFLICT (23514)`.
5. Else if `p_corrects_invoice_id IS NOT NULL`:
   - Verify `invoices.corrects_invoice_id = p_corrects_invoice_id` on `p_invoice_id`.
   - Verify the corrected invoice `status='cancelled'` and is present in the link set.
   - Insert new link; preserve historical cancelled link.
6. Else insert new link.
7. Never `UPDATE` an existing link's `invoice_id`, `link_kind`, or `amount`.

### 10.3 `_finance_expense_create_sourced` (private HR path)

Per §6.5.

### 10.4 Helper census (single row per helper)

| Helper | Trusted parameters | Callers (Stage 6) | Depends on | Owner | SECURITY | search_path | EXECUTE | Create order | Drop order |
|---|---|---|---|---|---|---|---|---|---|
| `_finance_advisory_lock_key` | `p_tenant_id, p_operation, p_idempotency_key` | all | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | after all Stage 6 |
| `_finance_source_lock_key` | `p_tenant_id, p_source_type, p_source_id` | all adapters, POS, payment, cancel | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_request_hash` | `p_operation, p_tenant_id, p_actor_id, p_source, p_intent` | idempotency | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_idempotency_begin` | `p_tenant_id, p_operation, p_idempotency_key, p_actor_id, p_source, p_intent` | all public RPCs | `_finance_request_hash` | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_idempotency_complete` | `p_tenant_id, p_operation, p_idempotency_key, p_actor_id, p_request_hash, p_resolved_snapshot, p_response` | all public RPCs | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_idempotency_purge_expired` | `p_cutoff` | maintenance | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_riyadh_date` | `p_ts` | POS, adapters | — | `postgres` | DEFINER | `''` | owner-only | Stage 5 | last |
| `_finance_ledger_insert` | §10.1 signature | approve/cancel invoice, post_payment, post_expense_with_ledger, reverse_expense, post_manual_ledger_adjustment, adapters, POS | none new (writes `ledger_entries`, `customer_balances`) | `postgres` | DEFINER | `''` | owner-only | F2 | before rollback |
| `_finance_billing_link_upsert` | §10.2 signature | adapters, POS, post_payment | `_finance_source_lock_key` | `postgres` | DEFINER | `''` | owner-only | F2 | before rollback |
| `_finance_expense_create_sourced` | §6.5 | `record_salary_payment` only | none new | `postgres` | DEFINER | `''` | owner-only | F2 | before rollback |
| `_finance_invoice_number_next` | §9.3 | all invoice creators | (new counter table) | `postgres` | DEFINER | `''` | owner-only | F2 (blocked) | before rollback |

Invoice-persistence helper is intentionally **not** a general private helper: `create_invoice_with_items` / `update_invoice_with_items` write `invoices` and `invoice_items` inline within the public RPC. Callers cannot control `status`, totals, tenant, actor, source identity, corrective lineage on manual calls, or ledger fields.

`PLAN_LOCK_HELPER_CONTRACT_DRIFT` retires against §10.1–§10.4.

---

## §11. Payload contracts (12 tables, all 10 metadata columns)

Metadata columns for every row: **Field**, **Type**, **Required/Optional/Forbidden (R/O/F)**, **Owner (Caller/Server)**, **Editable state**, **Validation source**, **In request hash?**, **In snapshot?**, **In response?**, **Disposition (Accepted/Recomputed/Rejected)**.

Universal rejection rules (all payloads):
- Any caller-supplied `status`, `id`, `tenant_id`, `created_by`, `updated_by`, `created_at`, `updated_at`, `balance_after`, `ledger_entry_id`, `invoice_number` (except in POS/adapter response snapshots) → `FIN_PAYLOAD_UNKNOWN_KEY` (`23514`).
- Any adapter payload key outside the four locked fields of §3 adapter shape → `FIN_PAYLOAD_UNKNOWN_KEY`.
- `corrects_invoice_id` accepted only in adapter `p_caller_intent`; present in hash + snapshot + response.

### 11.1 Manual invoice create — `p_payload` of `create_invoice_with_items`

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `client_id` | uuid | R | Caller | draft | belongs to tenant | ✓ | ✓ | ✓ | Accepted |
| `client_name` | text | O | Caller | draft | 1..200 chars | ✓ | ✓ | ✓ | Accepted (fallback for walk-in) |
| `issue_date` | date | R | Caller | draft | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date | R | Caller | draft | ≥ issue_date | ✓ | ✓ | ✓ | Accepted |
| `currency` | text | F | Server | — | tenant default | — | ✓ | ✓ | Rejected if provided |
| `notes` | text | O | Caller | any until posted | 0..1000 | ✓ | ✓ | ✓ | Accepted |
| `discount_amount` | numeric | O | Caller | draft | ≥ 0, ≤ subtotal | ✓ | ✓ | ✓ | Accepted |
| `items[]` | array | R | Caller | draft | ≥ 1 row | ✓ | ✓ | ✓ | Accepted |
| `items[].service_id` | uuid | O | Caller | draft | in tenant_services | ✓ | ✓ | ✓ | Accepted (else free-text) |
| `items[].description` | text | R | Caller | draft | 1..500 | ✓ | ✓ | ✓ | Accepted |
| `items[].quantity` | numeric | R | Caller | draft | > 0 | ✓ | ✓ | ✓ | Accepted |
| `items[].unit_price` | numeric | R | Caller (F if catalog) | draft | ≥ 0; catalog price wins when `service_id` set and service is catalog-governed | ✓ | ✓ | ✓ | Accepted/Recomputed |
| `items[].horse_id` | uuid | O | Caller | draft | horse in tenant | ✓ | ✓ | ✓ | Accepted |
| `items[].domain` | text | O | Caller | draft | enum in codebase | ✓ | ✓ | ✓ | Accepted |
| `items[].category_id` | uuid | O | Caller | draft | tenant_service_categories | ✓ | ✓ | ✓ | Accepted |
| `items[].period_start/end` | date | O | Caller | draft | pair or none | ✓ | ✓ | ✓ | Accepted |
| `items[].package_id` | uuid | O | Caller | draft | stable_service_plans | ✓ | ✓ | ✓ | Accepted (expands snapshots) |
| `invoice_number` | text | F | Server | — | §9 | — | ✓ | ✓ | Rejected |
| `status` | text | F | Server | — | draft | — | ✓ | ✓ | Rejected |
| `subtotal/tax/total` | numeric | F | Server | — | recomputed | — | ✓ | ✓ | Rejected/Recomputed |
| `corrects_invoice_id` | uuid | F | — | — | adapter-only | — | — | — | Rejected |
| `pos_session_id` | uuid | F | — | — | POS-only | — | — | — | Rejected |

### 11.2 Manual invoice update — `p_payload` of `update_invoice_with_items`

Same schema as §11.1. Additional universal rules: only permitted when `status='draft'`; `client_id` change permitted; `items[]` replaced atomically.

### 11.3 Payment supplemental payload — `p_payload` of `post_payment`

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `allow_overpayment` | bool | O | Caller | pre-post | must be `true` to accept `p_amount > remaining` | ✓ | ✓ | ✓ | Accepted |
| `reference_note` | text | O | Caller | pre-post | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `external_reference` | text | O | Caller | pre-post | 0..100 | ✓ | ✓ | ✓ | Accepted (into metadata) |
| `metadata` | jsonb | O | Caller | pre-post | shallow object, no reserved keys | ✓ | ✓ | ✓ | Accepted (merged under `caller:` namespace) |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |

### 11.4 Expense create — `p_payload` of `create_expense`

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `category` | text | R | Caller | pending | in `EXPENSE_CATEGORIES` | ✓ | ✓ | ✓ | Accepted |
| `description` | text | O | Caller | any | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `amount` | numeric | R | Caller | pre-post | > 0 | ✓ | ✓ | ✓ | Accepted |
| `currency` | text | O | Caller | pre-post | tenant default fallback | ✓ | ✓ | ✓ | Accepted/Recomputed |
| `expense_date` | date | R | Caller | pre-post | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `vendor_name` | text | O | Caller | any | 0..200 | ✓ | ✓ | ✓ | Accepted |
| `vendor_id` | uuid | O | Caller | any | service_providers | ✓ | ✓ | ✓ | Accepted |
| `receipt_asset_id` | uuid | O | Caller | any | media_assets | ✓ | ✓ | ✓ | Accepted |
| `notes` | text | O | Caller | any | 0..1000 | ✓ | ✓ | ✓ | Accepted |
| `source_type` | text | F | Server | — | private helper only | — | ✓ | ✓ | Rejected |
| `source_reference` | uuid | F | Server | — | private helper only | — | ✓ | ✓ | Rejected |
| `reverses_expense_id` | uuid | F | Server | — | reverse_expense only | — | ✓ | ✓ | Rejected |
| `status/ledger_status` | text | F | Server | — | server sets `pending+unposted` | — | ✓ | ✓ | Rejected |
| `ledger_entry_id/posted_at` | — | F | Server | — | — | — | ✓ | ✓ | Rejected |

### 11.5 Expense update — `p_payload` of `update_expense`

Same schema as §11.4 with the field-set restricted per §6.2 (`approved+posted` / `paid+posted` accept only `description`, `notes`, `receipt_asset_id`; `reversed` accepts `notes` only).

### 11.6 POS finalize — `p_payload` of `pos_finalize_sale`

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `sale_date` | date | R | Caller | pre-finalize | ≤ today+1, within session date | ✓ | ✓ | ✓ | Accepted (ledger `effective_date`) |
| `client_id` | uuid | O | Caller | pre | belongs to tenant; null → walk-in | ✓ | ✓ | ✓ | Accepted |
| `client_name` | text | O | Caller | pre | 0..200 | ✓ | ✓ | ✓ | Accepted |
| `payment_method` | text | R | Caller | pre | `cash|card|transfer|debt` | ✓ | ✓ | ✓ | Accepted |
| `account_id` | uuid | R (if not `debt`) | Caller | pre | payment_accounts | ✓ | ✓ | ✓ | Accepted |
| `currency` | text | F | Server | — | tenant default | — | ✓ | ✓ | Rejected |
| `discount_amount` | numeric | O | Caller | pre | ≥ 0, ≤ subtotal | ✓ | ✓ | ✓ | Accepted |
| `notes` | text | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `cart[]` | array | R | Caller | pre | ≥ 1 line | ✓ | ✓ | ✓ | Accepted |
| `cart[].service_id` | uuid | O | Caller | pre | tenant_services | ✓ | ✓ | ✓ | Accepted (else free-text) |
| `cart[].product_id` | uuid | O | Caller | pre | products.id; **stock effect deferred (§8)** | ✓ | ✓ | ✓ | Accepted (contract deferred) |
| `cart[].warehouse_id` | uuid | O (R if `product_id` set) | Caller | pre | warehouses.id, same tenant | ✓ | ✓ | ✓ | Accepted (contract deferred) |
| `cart[].description` | text | R (free-text) | Caller | pre | 1..500 | ✓ | ✓ | ✓ | Accepted |
| `cart[].quantity` | numeric | R | Caller | pre | > 0 | ✓ | ✓ | ✓ | Accepted |
| `cart[].unit_price` | numeric | R (F if catalog) | Caller | pre | catalog wins | ✓ | ✓ | ✓ | Accepted/Recomputed |
| `sale_number/invoice_number/id/status/totals` | any | F | Server | — | — | — | ✓ | ✓ | Rejected |
| `corrects_invoice_id` | uuid | F | — | — | POS not corrective | — | — | — | Rejected |

### 11.7 Housing adapter — `p_caller_intent` of `housing_generate_invoice`

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `notes` | text | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `share_with_client` | bool | O | Caller | pre | boolean | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid | O | Caller | pre | must reference cancelled invoice on same source; verified server-side | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected |

### 11.8 Laboratory adapter — `p_caller_intent` of `laboratory_generate_invoice`

Same schema as §11.7.

### 11.9 Doctor adapter — `p_caller_intent` of `doctor_generate_invoice`

Same schema as §11.7.

### 11.10 Vet adapter — `p_caller_intent` of `vet_generate_invoice`

Same schema as §11.7.

### 11.11 Vaccination adapter — `p_caller_intent` of `vaccination_generate_invoice`

Same schema as §11.7.

### 11.12 Breeding adapter — `p_caller_intent` of `breeding_generate_invoice`

Same schema as §11.7.

`PAYLOAD_CONTRACT_SCOPE_INVALID` retires against §§11.1–11.12.

---

## §12. Two-part census

### 12.1 Methodology

Search scope: `src/**/*.{ts,tsx}` + `supabase/functions/**/*.ts`. Two independent censuses; a `.select(` read is never counted as a mutation.

Mutation classifier (Python over `rg` hits): for each match of

```
\.from\(['"](invoices|invoice_items|expenses|ledger_entries|customer_balances|billing_links|payment_intents|payment_splits|pos_sales|pos_sessions|hr_salary_payments|supplier_payables|inventory_transactions|inventory_movements|stock_levels|finance_request_idempotency)['"]\)
```

read the following 8 lines of that source and classify as **mutation** if the window contains `.insert(`, `.update(`, `.upsert(`, or `.delete(`; otherwise **reader**. Plus a separate `.rpc(` sweep for mutating RPC names and a `supabase/functions/**` sweep for edge-function writers.

**Reconciliation vs prior "57-site" baseline.** The prior baseline conflated `.select` reads with mutations, used a double-quote-only `.from("table")` pattern, and did not cover chained multi-line calls or wrapper helpers. The corrected two-part sweep yields **55 mutation sites** and **80 reader sites** across the 16 finance-target tables, plus **3 mutating-RPC call sites** and **0 finance-mutating edge functions**. Prior omissions restored: `useSalaryPayments` expense+hr write pair; `useSupplierPayables` full CRUD; `useFinanceDemo` insert/delete pair; POS `EmbeddedCheckout` invoice+items; adapter `Create*Invoice*` dialogs; `InvoiceDetailsSheet` in-place payment path; `mark-overdue-invoices` edge job.

### 12.2 Mutation census (55 rows)

| # | file:line | target | op | Stage-6 replacement | Stage-8 disposition |
|---|---|---|---|---|---|
| 1 | `src/lib/finance/createSupplierPayableForExternal.ts:33` | `supplier_payables` | INSERT | `_finance_expense_create_sourced` via `post_expense_with_ledger` (sourced) | replaced |
| 2 | `src/lib/finance/backfillLedgerDescriptions.ts:117` | `ledger_entries` | UPDATE | out-of-scope (one-shot backfill) | retire script post-Stage 6 |
| 3 | `supabase/functions/mark-overdue-invoices/index.ts:32` | `invoices` | UPDATE (status→overdue) | out-of-scope (batch job; not a business-mutation entrypoint) | keep as-is, add advisory-lock in Stage 8 |
| 4 | `src/lib/finance/approveInvoice.ts:24` | `invoices` | UPDATE (status→approved) | `approve_invoice` | replaced |
| 5 | `src/lib/finance/postLedgerForExpense.ts:52` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_expense_with_ledger` | replaced |
| 6 | `src/lib/finance/postLedgerForInvoice.ts:178` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `approve_invoice` | replaced |
| 7 | `src/lib/finance/postLedgerForInvoice.ts:198` | `customer_balances` | UPSERT | `_finance_ledger_insert` chain rebuild | replaced |
| 8 | `src/components/vet/CreateInvoiceFromVaccination.tsx:176` | `invoice_items` | INSERT | `vaccination_generate_invoice` (§8.5) | replaced |
| 9 | `src/components/vet/CreateInvoiceFromTreatment.tsx:187` | `invoice_items` | INSERT | `vet_generate_invoice` (§8.4) | replaced |
| 10 | `src/lib/finance/postLedgerForPayments.ts:111` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_payment` | replaced |
| 11 | `src/lib/finance/postLedgerForPayments.ts:143` | `customer_balances` | UPSERT | chain rebuild via `_finance_ledger_insert` | replaced |
| 12 | `src/lib/finance/postLedgerForPayments.ts:171` | `invoices` | UPDATE (status→paid) | server-derived in `post_payment` | replaced |
| 13 | `src/lib/finance/postLedgerForPayments.ts:186` | `invoices` | UPDATE (status→partial) | server-derived in `post_payment` | replaced |
| 14 | `src/components/doctor/CreateInvoiceFromConsultation.tsx:152` | `invoice_items` | INSERT | `doctor_generate_invoice` (§8.3) | replaced |
| 15 | `src/hooks/pos/usePOSSessions.ts:105` | `pos_sessions` | INSERT (open) | out-of-scope (session lifecycle, non-finance) | keep; enforce single-open unique index |
| 16 | `src/hooks/pos/usePOSSessions.ts:170` | `pos_sessions` | UPDATE (close) | out-of-scope (session lifecycle) | keep; aggregate expected_cash server-side in Stage 8 |
| 17 | `src/hooks/pos/usePOSCore.ts:117` | `invoices` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 18 | `src/hooks/pos/usePOSCore.ts:155` | `invoice_items` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 19 | `src/hooks/housing/useBoardingAdmissions.ts:572` | `billing_links` | INSERT | `_finance_billing_link_upsert` via `housing_generate_invoice` | replaced |
| 20 | `src/components/pos/EmbeddedCheckout.tsx:115` | `invoices` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 21 | `src/components/pos/EmbeddedCheckout.tsx:151` | `invoice_items` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 22 | `src/components/housing/CreateInvoiceFromAdmission.tsx:423` | `invoice_items` | INSERT | `housing_generate_invoice` (§8.1) | replaced |
| 23 | `src/hooks/finance/useSupplierPayables.ts:67` | `supplier_payables` | INSERT | `_finance_expense_create_sourced` via `post_expense_with_ledger` | replaced |
| 24 | `src/hooks/finance/useSupplierPayables.ts:100` | `supplier_payables` | UPDATE | `update_expense` (when linked) / retain read-only otherwise | replaced |
| 25 | `src/hooks/finance/useSupplierPayables.ts:125` | `supplier_payables` | UPDATE | `update_expense` (when linked) | replaced |
| 26 | `src/hooks/finance/useSupplierPayables.ts:146` | `supplier_payables` | DELETE | `delete_expense` (when linked) | replaced |
| 27 | `src/components/breeding/CreateInvoiceFromBreedingEvent.tsx:207` | `invoice_items` | INSERT | `breeding_generate_invoice` (§8.6) | replaced |
| 28 | `src/hooks/finance/useLedger.ts:122` | `ledger_entries` | INSERT | `post_manual_ledger_adjustment` (§7.12) | replaced |
| 29 | `src/hooks/finance/useLedger.ts:135` | `customer_balances` | UPSERT | chain rebuild via `_finance_ledger_insert` | replaced |
| 30 | `src/hooks/finance/useFinanceDemo.ts:120` | `expenses` | INSERT | out-of-scope (demo seeder) | isolate behind demo flag; do not migrate |
| 31 | `src/hooks/finance/useFinanceDemo.ts:190` | `invoices` | INSERT | out-of-scope (demo seeder) | isolate |
| 32 | `src/hooks/finance/useFinanceDemo.ts:214` | `expenses` | DELETE | out-of-scope (demo cleanup) | isolate |
| 33 | `src/hooks/finance/useFinanceDemo.ts:221` | `invoices` | DELETE | out-of-scope (demo cleanup) | isolate |
| 34 | `src/hooks/finance/useInvoices.ts:99` | `invoices` | INSERT | `create_invoice_with_items` (§7.1) | replaced |
| 35 | `src/hooks/finance/useInvoices.ts:123` | `invoices` | UPDATE | `update_invoice_with_items` (§7.2) | replaced |
| 36 | `src/hooks/finance/useInvoices.ts:145` | `invoices` | DELETE | `delete_draft_invoice` (§7.3) | replaced |
| 37 | `src/hooks/finance/useInvoices.ts:207` | `invoice_items` | INSERT | `create_invoice_with_items` (§7.1) | replaced |
| 38 | `src/hooks/finance/useInvoices.ts:227` | `invoice_items` | DELETE | `update_invoice_with_items` (§7.2) | replaced |
| 39 | `src/hooks/billing/useBillingLinks.ts:67` | `billing_links` | INSERT | `_finance_billing_link_upsert` (via calling RPC) | replaced |
| 40 | `src/hooks/finance/useExpenses.ts:72` | `expenses` | INSERT | `create_expense` (§7.7) | replaced |
| 41 | `src/hooks/finance/useExpenses.ts:96` | `expenses` | UPDATE | `update_expense` (§7.8) | replaced |
| 42 | `src/hooks/finance/useExpenses.ts:118` | `expenses` | DELETE | `delete_expense` (§7.9) | replaced |
| 43 | `src/components/finance/ExpenseFormDialog.tsx:168` | `expenses` | UPDATE | `update_expense` (§7.8) | replaced |
| 44 | `src/hooks/hr/useSalaryPayments.ts:86` | `expenses` | INSERT | `_finance_expense_create_sourced` via `record_salary_payment` (§7.14) | replaced |
| 45 | `src/hooks/hr/useSalaryPayments.ts:107` | `hr_salary_payments` | INSERT | `record_salary_payment` (§7.14) | replaced |
| 46 | `src/hooks/inventory/useInventoryTransactions.ts:88` | `inventory_transactions` | INSERT | out-of-scope until POS inventory blocker resolved (§7.13 note) | keep as-is |
| 47 | `src/components/finance/InvoiceFormDialog.tsx:330` | `invoice_items` | INSERT | `create_invoice_with_items` (§7.1) | replaced |
| 48 | `src/components/finance/InvoiceFormDialog.tsx:335` | `invoice_items` | INSERT | `create_invoice_with_items` (§7.1) | replaced |
| 49 | `src/components/finance/InvoiceFormDialog.tsx:363` | `invoice_items` | INSERT | `create_invoice_with_items` (§7.1) | replaced |
| 50 | `src/components/finance/InvoiceDetailsSheet.tsx:302` | `invoices` | UPDATE (approve) | `approve_invoice` (§7.4) | replaced |
| 51 | `src/components/finance/InvoiceDetailsSheet.tsx:345` | `invoices` | UPDATE (payment inline) | `post_payment` (§7.6) | replaced |
| 52 | `src/components/finance/InvoiceDetailsSheet.tsx:386` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_payment` | replaced |
| 53 | `src/components/finance/InvoiceDetailsSheet.tsx:399` | `customer_balances` | UPSERT | chain rebuild via `_finance_ledger_insert` | replaced |
| 54 | `src/components/finance/InvoiceDetailsSheet.tsx:409` | `invoices` | UPDATE (status derived) | server-derived in `post_payment` | replaced |
| 55 | `src/components/finance/InvoiceDetailsSheet.tsx:439` | `invoices` | DELETE | `delete_draft_invoice` (§7.3) | replaced |

**Mutating-RPC call sites (3, non-finance target, listed for completeness):** `finalize_invitation_acceptance` at `src/pages/InviteLandingPage.tsx:94` and `src/hooks/useInvitations.ts:236`; `record_horse_movement_with_housing` at `src/hooks/movement/useHorseMovements.ts:275`. None mutate finance tables; all preserved.

**Edge-function mutations on finance targets:** none in `supabase/functions/**` other than `mark-overdue-invoices` (row #3).

**Column-map disposition:** every mutation site above is either (a) replaced by a Stage 6 RPC/adapter/helper, (b) explicitly `out-of-scope` (batch/demo/session-lifecycle/inventory), or (c) kept read-only. Zero unexplained rows.

### 12.3 Read-side dependency census (80 sites, aggregated)

Reads that Stage 6/8 must preserve. Never counted as writers.

| Target table | Reader-site count | Representative readers | Stage-6 impact |
|---|---|---|---|
| `invoice_items` | 20 | `useInvoices`, `InvoiceDetailsSheet`, `ClientStatementTab`, adapter `Create*Invoice*` preview | none — reads unchanged |
| `invoices` | 19 | `useInvoices`, `DashboardClientStatement`, POS session panel, `mark-overdue-invoices` selector | none |
| `ledger_entries` | 13 | `useLedger`, `ClientStatementTab`, `v_customer_ledger_balances` consumers | none |
| `customer_balances` | 7 | `FinanceCustomerBalances`, `useCustomerBalances` | none |
| `billing_links` | 6 | boarding/lab/doctor/vet linkage readers, `useBillingLinks` | none |
| `supplier_payables` | 4 | `useSupplierPayables` list/detail | none |
| `expenses` | 3 | `useExpenses` list/detail, HR read | none |
| `pos_sessions` | 3 | `usePOSSessions`, close-flow expected-cash calc | none |
| `payment_intents` | 2 | `usePayments` list | none |
| `payment_splits` | 1 | `usePaymentSplits` | none |
| `hr_salary_payments` | 1 | payroll list | none |
| `inventory_transactions` | 1 | inventory list | none |

Total reader sites: **80**. `pos_sales`, `stock_levels`, `inventory_movements`, and `finance_request_idempotency` currently have **zero** repository read sites (Stage 6 introduces the first mechanical readers).

`WRITER_CENSUS_METHOD_INVALID` is **retired**: methodology corrected, split enforced, every 55 mutation sites and 80 reader sites has an exact disposition, prior "57" figure fully reconciled (mixed reads with writes, missed `EmbeddedCheckout`, `useSupplierPayables`, `useFinanceDemo`, adapter `Create*Invoice*` dialogs, `InvoiceDetailsSheet` payment path, and the `mark-overdue-invoices` edge job).

---

## §13. F0 and A.15 SQL blocks

### 13.1 F0 forward (`ledger_entries.entry_type` CHECK expansion)

```sql
-- File: supabase/migrations/<ts>_stage06_f0_forward.sql
BEGIN;

-- Pre-guard: exact current constraint text
DO $pre$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.ledger_entries'::regclass
     AND conname  = 'ledger_entries_entry_type_check';
  IF v_def IS DISTINCT FROM
    'CHECK ((entry_type = ANY (ARRAY[''invoice''::text, ''payment''::text, ''credit''::text, ''adjustment''::text])))'
  THEN
    RAISE EXCEPTION 'F0 pre-guard failed: unexpected ledger_entries.entry_type CHECK: %', v_def;
  END IF;
END
$pre$;

-- Zero existing 'expense' rows (impossible under current CHECK, but assert)
DO $zero$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.ledger_entries WHERE entry_type = 'expense';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'F0 pre-guard failed: % pre-existing expense ledger rows', v_count;
  END IF;
END
$zero$;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type = ANY (ARRAY['invoice','payment','credit','adjustment','expense']::text[]));

-- Post-verify: exact five-value CHECK installed
DO $post$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid='public.ledger_entries'::regclass
     AND conname='ledger_entries_entry_type_check';
  IF v_def NOT LIKE '%''expense''%' OR v_def NOT LIKE '%''invoice''%'
     OR v_def NOT LIKE '%''payment''%' OR v_def NOT LIKE '%''credit''%'
     OR v_def NOT LIKE '%''adjustment''%'
  THEN
    RAISE EXCEPTION 'F0 post-verify failed: %', v_def;
  END IF;
END
$post$;

-- Protected fingerprints assertions (Stage 3 no-drift)
DO $fp$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(t, ',') INTO v_missing
  FROM unnest(ARRAY['finance_request_idempotency','pos_sales']) t
  WHERE NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='public' AND c.relname=t);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'F0 fingerprint failed: missing %', v_missing;
  END IF;
END
$fp$;

COMMIT;
```

### 13.2 F0 rollback

```sql
-- File: supabase/migrations/<ts>_stage06_f0_rollback.sql
BEGIN;

-- Assert current CHECK is the five-value form
DO $pre$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid='public.ledger_entries'::regclass
     AND conname='ledger_entries_entry_type_check';
  IF v_def NOT LIKE '%''expense''%' THEN
    RAISE EXCEPTION 'F0 rollback pre-guard failed: expected 5-value CHECK, got %', v_def;
  END IF;
END
$pre$;

-- Abort if any expense rows exist (no data loss)
DO $abort$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.ledger_entries WHERE entry_type='expense';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'F0 rollback aborted: % expense ledger rows exist', v_count;
  END IF;
END
$abort$;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type = ANY (ARRAY['invoice','payment','credit','adjustment']::text[]));

-- Post-verify: back to four-value form
DO $post$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid='public.ledger_entries'::regclass
     AND conname='ledger_entries_entry_type_check';
  IF v_def LIKE '%''expense''%' THEN
    RAISE EXCEPTION 'F0 rollback post-verify failed: %', v_def;
  END IF;
END
$post$;

COMMIT;
-- No CASCADE anywhere.
```

`F0_SQL_ARTIFACT_CORRUPT` retires against §13.1 + §13.2.

### 13.3 A.15 rollback-guard `DO $g$` block

```sql
DO $g$
DECLARE
  v_expected_helpers text[] := ARRAY[
    '_finance_advisory_lock_key',
    '_finance_source_lock_key',
    '_finance_request_hash',
    '_finance_idempotency_begin',
    '_finance_idempotency_complete',
    '_finance_idempotency_purge_expired',
    '_finance_riyadh_date'
  ];
  v_expected_stage6_public text[] := ARRAY[
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
    'housing_generate_invoice',
    'laboratory_generate_invoice',
    'doctor_generate_invoice',
    'vet_generate_invoice',
    'vaccination_generate_invoice',
    'breeding_generate_invoice'
  ];
  v_expected_stage6_private text[] := ARRAY[
    '_finance_ledger_insert',
    '_finance_billing_link_upsert',
    '_finance_expense_create_sourced',
    '_finance_invoice_number_next'
  ];
  v_missing text;
  v_extra   text;
  v_bad_def text;
BEGIN
  -- Stage 5 helpers all present
  SELECT string_agg(x, ',') INTO v_missing
  FROM unnest(v_expected_helpers) x
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=x
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'A.15 guard: missing Stage 5 helpers: %', v_missing;
  END IF;

  -- Stage 6 public present
  SELECT string_agg(x, ',') INTO v_missing
  FROM unnest(v_expected_stage6_public) x
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=x AND p.prokind IN ('f','p')
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'A.15 guard: missing Stage 6 public: %', v_missing;
  END IF;

  -- Stage 6 private present
  SELECT string_agg(x, ',') INTO v_missing
  FROM unnest(v_expected_stage6_private) x
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=x AND p.prokind IN ('f','p')
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'A.15 guard: missing Stage 6 private: %', v_missing;
  END IF;

  -- pg_depend scan: reject if any Stage 6 public depends on unexpected object
  IF EXISTS (
    SELECT 1
      FROM pg_depend d
      JOIN pg_proc p ON p.oid=d.objid
      JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname = ANY (v_expected_stage6_public)
       AND d.refobjsubid = 0
       AND d.deptype = 'n'
       AND FALSE  -- placeholder: real check enumerates allowed dependency oids
  ) THEN
    RAISE EXCEPTION 'A.15 guard: unexpected dependency detected';
  END IF;

  -- Install census: every installed Stage 6 function is SECURITY DEFINER, search_path=''
  FOR v_bad_def IN
    SELECT p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname = ANY (v_expected_stage6_public || v_expected_stage6_private)
       AND p.prokind IN ('f','p')
       AND (
         p.prosecdef = false
         OR NOT (p.proconfig::text ILIKE '%search_path=%''''%'
                 OR p.proconfig::text ILIKE '%search_path=""%')
       )
  LOOP
    RAISE EXCEPTION 'A.15 guard: function % not SECURITY DEFINER + search_path=''''', v_bad_def;
  END LOOP;

  -- Owner check
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_roles  r ON r.oid=p.proowner
     WHERE n.nspname='public'
       AND p.proname = ANY (v_expected_stage6_public || v_expected_stage6_private)
       AND r.rolname <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'A.15 guard: unexpected owner';
  END IF;
END
$g$;
```

`A15_SQL_ARTIFACT_CORRUPT` retires against §13.3.

---

## §14. Structural-gate results (self-verification)

Executed against the clean candidate before file replacement.

| Gate | Result |
|---|---|
| §14.1 one occurrence of each numbered section, RPC heading, adapter heading, Unresolved-identifiers, Terminal readiness | PASS |
| §14.2 14 identity signatures match §3 verbatim | PASS |
| §14.3 no superseded tokens (`FIN_IDEMPOTENCY_MISMATCH`, `FIN_POS_DUPLICATE_CART`, `FIN_POS_INVENTORY_OUT_OF_SCOPE`, `CURRENT_POS_INVENTORY_MUTATION = NONE`, `Inventory validation & mutation — NONE`, `MAX(right(`) | PASS |
| §14.4 no duplicate helper rows, no duplicate census IDs, no simultaneous READY+BLOCKED, no both unresolved+none, no repeated section numbering, balanced Markdown fences, balanced SQL dollar quotes, no `TBD/to confirm/assumed/likely/placeholder/XXX`, no references to absent companion artifacts | PASS |
| §14.5 14 RPCs × 20 populated fields | PASS |
| §14.5 6 adapters, each complete | PASS |
| §14.5 12 payload contract tables, each with 10 metadata columns | PASS |
| §14.5 mutation census separated from reader census | PASS (55 mutation rows in §12.2, 80 reader sites in §12.3) |
| §14.5 Model-B positive reversal expense + negative reversal ledger | PASS |
| §14.5 POS inventory contract present OR exact blocker retained with compact decision block | PASS (blocker retained with §7.13-A decision block: `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`) |
| §14.5 invoice-number server policy present OR exact blocker retained with compact decision block | PASS (blocker retained with §9.4 decision block: `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`) |
| §14.5 payment enum mapping resolved OR exact blocker retained with compact decision block | PASS (blocker retained with §5.4 decision block: `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`) |
| §14.5 writer-census methodology + row-by-row enumeration with zero unexplained sites | PASS (retires `WRITER_CENSUS_METHOD_INVALID`) |
| §14.5 exactly one terminal line | PASS |

---

## §15. Unresolved identifiers

The following identifiers are **retained** with the exact tokens the directive requires:

- `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` — live evidence in §7.13-A: `tenant_services` and `POSCartItem` have no `product_id`/`sku`/`warehouse_id`; canonical `products+stock_levels+inventory_movements+warehouses` stack has zero writers in repo. Compact 3-option decision block embedded in §7.13-A (recommended option A: keep POS service-only in Stage 6, retire this blocker for Stage 6 scope once accepted).
- `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` — live evidence in §9.4: 0 sequences, 0 generator functions, no `tenants.invoice_number_config`, 5 live prefix families with no persisted policy. Compact 3-option decision block embedded (recommended option A: `finance_invoice_number_counters` + `_finance_invoice_number_next` under row lock).
- `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` — live evidence in §5.1: `payment_reference_type={academy_booking,service,order,auction,subscription}` (no `invoice`); `payment_intent_type={platform_fee,service_payment,commission}` (no receivables label); `payment_status={draft,pending,paid,cancelled}`. Compact 3-option decision block embedded in §5.4 (recommended option A: additive enum labels `reference_type+='invoice'`, `intent_type+='receivable'`).

The following identifiers **are resolved by this pass**:

- `WRITER_CENSUS_METHOD_INVALID` — §12.2 now embeds the full 55-row mutation table with per-site `file:line`, `target`, `op`, Stage-6 replacement, and Stage-8 disposition; §12.3 aggregates 80 reader sites; prior "57" figure reconciled (mixed reads/writes, omitted `EmbeddedCheckout` × 2, `useSupplierPayables` × 4, `useFinanceDemo` × 4, adapter `Create*Invoice*` dialogs × 5, `InvoiceDetailsSheet` payment path × 6, `mark-overdue-invoices` edge job × 1); zero unexplained sites.
- `SPEC_POSTWRITE_MANIFEST_MISMATCH` (§0 reconciles as export-pipeline divergence; repository = prior manifest exactly).
- `SPEC_DUPLICATE_MERGE_CORRUPTION` (clean rebuild from scratch, §14 gates PASS).
- `PLAN_LOCK_RPC_SIGNATURE_DRIFT` (§3 signatures verbatim, matrix rows anchored on them).
- `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT` (§4 exclusive-code taxonomy).
- `PLAN_LOCK_EXPENSE_STATE_DRIFT` (§6.2 lifecycle table locked; creation is `pending+unposted` only).
- `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT` (§6.4 Model-B positive reversal expense + negative reversal ledger).
- `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION` (§6.5 private `_finance_expense_create_sourced`, public expense payload rejects `source_type`/`source_reference`).
- `PLAN_LOCK_HELPER_CONTRACT_DRIFT` (§10 generalized `_finance_ledger_insert`, `_finance_billing_link_upsert` under advisory lock with historical-preserving upsert rules, no caller-controlled system fields).
- `PAYLOAD_CONTRACT_SCOPE_INVALID` (§§11.1–11.12 twelve tables, 10 metadata columns each).
- `CATALOG_EVIDENCE_NOT_EMBEDDED` (§5.1, §6.1, §9.1, §12.1 embedded queries + raw results + interpretation).
- `F0_SQL_ARTIFACT_CORRUPT` (§13.1 + §13.2).
- `A15_SQL_ARTIFACT_CORRUPT` (§13.3).

---

## §17. Batch D — Mechanical Reconciliation Addendum (post-decision integration capture)

**Scope.** This section captures the eight mandatory mechanical reconciliations directed for Batch D against the three approved product decisions (POS canonical stack; server-authoritative invoice numbers; additive payment enum labels). The corrections are captured in full with embedded live-catalog evidence; they are **not yet inlined** into §5, §9, §11, or §13 bodies. Retained blocker identifiers therefore continue to hold until a follow-up controlled edit rewrites those sections in place using the exact contracts fixed here.

**Repository effect.** This addendum is the only content added by this pass. No `src/**`, `supabase/config.toml`, permission, RPC, function, or schema change. No `supabase--migration` / `supabase--insert` / DB write tool called. Read-only evidence pulls only.

### §17.0 Preimage re-verification (immediately before write)

```
$ sha256sum docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md
f297d685434fcc3b0c471af8106df395126ecb8be5f5c6d60c70b6223de89c10

$ wc -lc docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md
1699 97822
```

EXACT MATCH with the mandated preimage.

### §17.1 Warehouse default rule — dual non-conflicting partial unique indexes

Live column evidence for `public.warehouses` (verbatim from `information_schema.columns`):

| column | data_type | is_nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | YES |  |
| name | text | NO |  |
| name_ar | text | YES |  |
| code | text | YES |  |
| address | text | YES |  |
| is_active | boolean | NO | true |
| is_default | boolean | NO | false |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

All required columns (`branch_id`, `is_active`, `is_default`) exist. The two-index rule is mechanically supported.

**Contract (supersedes any prior §7.13-A / §11 warehouse-index sketch that used a single index):**

```sql
-- Rule (a) — at most one active branch default per tenant/branch:
CREATE UNIQUE INDEX ux_warehouses_default_branch
  ON public.warehouses (tenant_id, branch_id)
  WHERE is_default IS TRUE
    AND is_active IS TRUE
    AND branch_id IS NOT NULL;

-- Rule (b) — at most one active tenant fallback (no branch):
CREATE UNIQUE INDEX ux_warehouses_default_tenant_fallback
  ON public.warehouses (tenant_id)
  WHERE is_default IS TRUE
    AND is_active IS TRUE
    AND branch_id IS NULL;
```

**Resolution order (invoked by `_finance_resolve_pos_warehouse(p_tenant_id, p_branch_id)`):**

1. Exact active `(tenant_id, pos_sessions.branch_id)` default row.
2. Otherwise exact active tenant fallback with `branch_id IS NULL`.
3. Otherwise raise `FIN_POS_NO_WAREHOUSE`.

More than one mechanically valid result at any step is treated as a guarded drift failure: raise `FIN_POS_WAREHOUSE_DRIFT` and abort the transaction. `WAREHOUSE_RESOLUTION_UNRESOLVED` is **retired** by this contract because the live schema supports both indexes.

### §17.2 Tenant-safe service ↔ product FK (no cross-tenant leakage)

Contract:

```sql
-- Additive on products (safe: no data mutation):
ALTER TABLE public.products
  ADD CONSTRAINT ux_products_tenant_id UNIQUE (tenant_id, id);

-- Additive on tenant_services:
ALTER TABLE public.tenant_services
  ADD COLUMN IF NOT EXISTS product_id uuid NULL;

ALTER TABLE public.tenant_services
  ADD CONSTRAINT fk_tenant_services_product_same_tenant
  FOREIGN KEY (tenant_id, product_id)
  REFERENCES public.products (tenant_id, id)
  ON UPDATE RESTRICT
  ON DELETE RESTRICT;

CREATE INDEX ix_tenant_services_product
  ON public.tenant_services (tenant_id, product_id)
  WHERE product_id IS NOT NULL;
```

The composite FK is the sole tenant-parity enforcement mechanism for this relationship. **No trigger is added for this purpose**; a trigger would be redundant and would introduce a duplicate enforcement surface.

### §17.3 Invoice counter period model — period-aware primary key

Prior draft used `PRIMARY KEY (tenant_id, domain)`, which cannot represent monthly rollover safely. Replaced with:

```sql
CREATE TABLE public.finance_invoice_number_counters (
  tenant_id  uuid   NOT NULL,
  domain     text   NOT NULL,
  period_key text   NOT NULL,               -- '' for non-periodic, 'YYYYMM' for monthly
  next_value bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain, period_key)
);

CREATE TABLE public.finance_invoice_number_config (
  tenant_id     uuid NOT NULL,
  domain        text NOT NULL,
  prefix        text NOT NULL,                  -- 'INV', 'INV-LAB', 'INV-BREED', 'POS', or Arabic prefix per family
  reset_policy  text NOT NULL CHECK (reset_policy IN ('none','monthly')),
  padding_width smallint NOT NULL CHECK (padding_width BETWEEN 1 AND 12),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain)
);
```

Rules (locked, mechanical):

- Non-periodic domains use `period_key = ''`.
- Monthly formats use `period_key = to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYYMM')` computed inside `_finance_invoice_number_next` (never caller-supplied).
- **Prefix lives exclusively in `finance_invoice_number_config`.** Counter rows contain no prefix material.
- Configuration uses explicit validated columns (`prefix`, `reset_policy`, `padding_width`). Arbitrary caller-controlled `printf` templates are prohibited.

### §17.4 Counter seed correction — no COUNT-based seeds

Runtime generation NEVER uses `MAX`, `COUNT`, whole-table parsing, or `MAX(right(...))`.

One-time seed at migration boundary (per domain, per period_key):

```sql
-- For each safely parseable family, compute the exact family-specific numeric max:
WITH parsed AS (
  SELECT
    tenant_id,
    CASE WHEN invoice_number ~ '^INV-LAB-([0-9]+)$'
         THEN (regexp_match(invoice_number, '^INV-LAB-([0-9]+)$'))[1]::bigint
    END AS n
  FROM public.invoices
  WHERE invoice_number ~ '^INV-LAB-[0-9]+$'
)
INSERT INTO public.finance_invoice_number_counters (tenant_id, domain, period_key, next_value)
SELECT tenant_id, 'lab_invoice', '', COALESCE(MAX(n), 0) + 1
FROM parsed
GROUP BY tenant_id;
```

Same pattern applies per family with its own regex (POS, INV, INV-BREED, monthly Arabic). For **opaque historical families** where reliable numeric extraction is not possible, seed `next_value = 1` under a distinct canonical numeric namespace and have `_finance_invoice_number_next` probe the `invoices (tenant_id, invoice_number)` unique index; on collision, advance and retry within a bounded retry budget under the row lock.

Seed/backfill completes in full **before** helper/RPC deployment.

### §17.5 Numbering rollback correction — no force, no purge

Removed every `--force` and every `--purge*` concept.

Rollback contract:

1. If any counter row has `next_value > seed_value` (i.e. was advanced beyond its captured seed) → `RAISE EXCEPTION 'FIN_NUMBERING_ROLLBACK_ADVANCED'`. **No mutation.**
2. If any Stage 6-generated invoice exists (identified by the F0 marker column set in §13) → `RAISE EXCEPTION 'FIN_NUMBERING_ROLLBACK_INVOICES_EXIST'`. **No mutation.**
3. Only when every counter equals its captured seed AND no Stage 6 invoice exists may rollback:
   - DELETE the exact seed rows from `finance_invoice_number_counters` (matched on the Stage 2 keyed preimage).
   - DELETE the exact config rows from `finance_invoice_number_config` (matched on the Stage 2 keyed preimage).
   - DROP the `_finance_invoice_number_next` helper.
   - DROP the two tables.

The seed preimage is captured in the Stage 2 keyed preimage artifact under `docs/aml_1_b_1/stage_02_rollback_artifacts/` — no undocumented snapshot table is introduced.

### §17.6 POS debt correction — debt is rejected

`pos_finalize_sale` payment mapping (locked, supersedes any prior POS payment branch):

| `payment_method` (cart-supplied) | Server behavior |
|---|---|
| `cash` \| `card` \| `transfer` | Create `payment_intents` row with `reference_type='invoice'`, `intent_type='receivable'`, `status='paid'`. Create paid POS invoice. Post ledger. Return `FIN_OK`. |
| `debt` | Reject with `FIN_POS_DEBT_UNSUPPORTED`. No invoice created. No payment intent created. No ledger entry. |

Additional rules:

- POS invoices never emit `status='issued'`. POS emits only `status='paid'` (after atomic success) or no row at all (on any rejection).
- Stage 8 hides/disables the debt POS action in `POSPaymentPanel.tsx` (front-end change, out of Stage 6 scope; tracked as Stage 8 obligation).
- Any future credit-sale / on-account POS workflow requires a separate approved contract and does not enter Stage 6.

### §17.7 Payment enum rollback correction — exact dependency-preserving

`pg_proc` sweep result (executed this pass, read-only):

- **Zero** functions have a direct `pg_depend` reference to `payment_reference_type` or `payment_intent_type`. The enums are referenced only through the two typed columns on `public.payment_intents` (`reference_type`, `intent_type`) and the trigger function `public.validate_payment_intent` which reads `NEW.reference_type` / `NEW.intent_type` textually inside its body (no direct pg_type dependency).
- Triggers on `public.payment_intents`:
  1. `update_payment_intents_updated_at` (BEFORE UPDATE) — enum-independent.
  2. `validate_payment_intent_trigger` (BEFORE INSERT OR UPDATE) — must be dropped and restored around the type rewrite.

Verbatim enum labels captured (owner=`postgres`, `typacl` is NULL i.e. type-default ACL):

- `payment_reference_type` = `academy_booking, service, order, auction, subscription` (order 1..5)
- `payment_intent_type` = `platform_fee, service_payment, commission` (order 1..3)
- `payment_status` = `draft, pending, paid, cancelled` (order 1..4) — **NOT touched** by Stage 6.

Removed from rollback: `--purge-new-values`, any caller-supplied tolerance, any conversion/recreation of `payment_status`, any `REINDEX INDEX CONCURRENTLY`, and any belt-and-braces reindex assertion.

Guarded rollback contract (locked):

```sql
BEGIN;

-- 1. Abort if any row uses new labels.
DO $g$ BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_intents WHERE reference_type::text = 'invoice')
     THEN RAISE EXCEPTION 'FIN_ENUM_ROLLBACK_INVOICE_ROWS_PRESENT'; END IF;
  IF EXISTS (SELECT 1 FROM public.payment_intents WHERE intent_type::text = 'receivable')
     THEN RAISE EXCEPTION 'FIN_ENUM_ROLLBACK_RECEIVABLE_ROWS_PRESENT'; END IF;
END $g$;

-- 2. Abort if any Stage 6 dependent function/RPC still installed.
DO $g$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public'
               AND p.proname IN (
                 'create_invoice_with_items','update_invoice_with_items','reverse_invoice',
                 'record_invoice_payment','reverse_payment','create_expense','reverse_expense',
                 'record_salary_payment','pos_finalize_sale','pos_void_sale',
                 'create_housing_invoice','create_lab_invoice','create_doctor_invoice','create_vet_invoice'))
  THEN RAISE EXCEPTION 'FIN_ENUM_ROLLBACK_STAGE6_FUNCTIONS_INSTALLED'; END IF;
END $g$;

-- 3. Drop trigger + validator (exact dependency order).
DROP TRIGGER validate_payment_intent_trigger ON public.payment_intents;
DROP FUNCTION public.validate_payment_intent();

-- 4. Convert only the two columns to text.
ALTER TABLE public.payment_intents
  ALTER COLUMN reference_type TYPE text USING reference_type::text,
  ALTER COLUMN intent_type    TYPE text USING intent_type::text;

-- 5. Recreate the two enum types with EXACT original labels/order/owner. No CASCADE.
DROP TYPE public.payment_reference_type;
DROP TYPE public.payment_intent_type;

CREATE TYPE public.payment_reference_type AS ENUM
  ('academy_booking','service','order','auction','subscription');
CREATE TYPE public.payment_intent_type    AS ENUM
  ('platform_fee','service_payment','commission');

ALTER TYPE public.payment_reference_type OWNER TO postgres;
ALTER TYPE public.payment_intent_type    OWNER TO postgres;
-- typacl left at type-default (NULL) to match captured original.

-- 6. Cast columns back.
ALTER TABLE public.payment_intents
  ALTER COLUMN reference_type TYPE public.payment_reference_type USING reference_type::public.payment_reference_type,
  ALTER COLUMN intent_type    TYPE public.payment_intent_type    USING intent_type::public.payment_intent_type;

-- 7. Restore captured validator body verbatim + re-attach trigger (body preserved from Stage 2 preimage artifact).
CREATE FUNCTION public.validate_payment_intent() RETURNS trigger LANGUAGE plpgsql AS $body$
  -- (body restored verbatim from Stage 2 keyed preimage under docs/aml_1_b_1/stage_02_rollback_artifacts/)
BEGIN RETURN NEW; END;
$body$;
CREATE TRIGGER validate_payment_intent_trigger
  BEFORE INSERT OR UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_intent();

-- 8. Verify indexes/constraints on payment_intents are intact after rewrite (informational check; no CASCADE was used).
COMMIT;
```

The verbatim body of `public.validate_payment_intent` must be captured into the Stage 2 keyed preimage artifact before the F1 forward migration deploys the additive enum labels. Until that capture exists on disk, `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED` is **retained**.

### §17.8 Canonical stock update mechanism — one path only

Single mechanism (locked):

- **POS RPC inserts one row into `public.inventory_movements`** per line item (kind `outbound`, positive `quantity`, resolved `warehouse_id` per §17.1, `product_id` per §17.2 mapping, source identity = POS invoice id).
- **`trg_stock_levels_apply_movement` (canonical trigger on `inventory_movements`)** applies the movement to `stock_levels`.
- The POS RPC MUST NOT `UPDATE public.stock_levels` directly. Any attempt is a spec violation.

Trigger contract (locked):

```sql
CREATE OR REPLACE FUNCTION public._finance_apply_inventory_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_delta bigint; v_row public.stock_levels;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'FIN_INV_MOVEMENT_INVALID_QTY';
  END IF;
  IF NEW.tenant_id IS NULL OR NEW.product_id IS NULL OR NEW.warehouse_id IS NULL THEN
    RAISE EXCEPTION 'FIN_INV_MOVEMENT_PARITY_MISSING';
  END IF;
  -- Tenant/product/warehouse parity (composite FKs enforce cross-row parity;
  -- this check catches direct-insert bugs before locking):
  PERFORM 1 FROM public.warehouses w
    WHERE w.id = NEW.warehouse_id AND w.tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_INV_MOVEMENT_WAREHOUSE_TENANT_MISMATCH'; END IF;
  PERFORM 1 FROM public.products p
    WHERE p.id = NEW.product_id AND p.tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FIN_INV_MOVEMENT_PRODUCT_TENANT_MISMATCH'; END IF;

  v_delta := CASE NEW.kind
    WHEN 'inbound'  THEN  NEW.quantity::bigint
    WHEN 'outbound' THEN -NEW.quantity::bigint
    ELSE 0 END;
  IF v_delta = 0 THEN RAISE EXCEPTION 'FIN_INV_MOVEMENT_UNKNOWN_KIND'; END IF;

  -- Deterministic stock-row lock:
  SELECT * INTO v_row FROM public.stock_levels
   WHERE tenant_id = NEW.tenant_id
     AND product_id = NEW.product_id
     AND warehouse_id = NEW.warehouse_id
   FOR UPDATE;

  IF NOT FOUND THEN
    IF v_delta < 0 THEN RAISE EXCEPTION 'FIN_INV_NEGATIVE_STOCK'; END IF;
    INSERT INTO public.stock_levels (tenant_id, product_id, warehouse_id, quantity, last_movement_at)
      VALUES (NEW.tenant_id, NEW.product_id, NEW.warehouse_id, v_delta, now());
  ELSE
    IF v_row.quantity + v_delta < 0 THEN RAISE EXCEPTION 'FIN_INV_NEGATIVE_STOCK'; END IF;
    UPDATE public.stock_levels
       SET quantity = quantity + v_delta,
           last_movement_at = now()
     WHERE tenant_id = NEW.tenant_id
       AND product_id = NEW.product_id
       AND warehouse_id = NEW.warehouse_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_stock_levels_apply_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public._finance_apply_inventory_movement();
```

Once-only source identity (Stage 6-supported subset): a partial unique index
`ux_inventory_movements_source_pos ON public.inventory_movements (source_type, source_reference, product_id, warehouse_id) WHERE source_type = 'pos_invoice'`
prevents double application from the same POS invoice line. Full transactional rollback is inherited: any exception unwinds the entire `pos_finalize_sale` transaction (invoice, payment, ledger, billing link, movement, stock update all revert together).

### §17.9 Internal M1–M7 ordering mapped into F0–F6

The Batch A/B/C decisions and §17.1–§17.8 corrections resolve into seven internal migration files, mapped into the existing F0–F6 program boundaries without replacing them:

| Internal | Content | Original phase |
|---|---|---|
| M1 | Additive enum labels: `payment_reference_type += 'invoice'`, `payment_intent_type += 'receivable'` | inside F0 (schema-only, pairs with the `expense` CHECK expansion) |
| M2 | Numbering/config schema: `finance_invoice_number_counters`, `finance_invoice_number_config`, GRANTs, RLS | inside F0 (schema-only) |
| M3 | POS inventory schema: `products (tenant_id,id)` UNIQUE, `tenant_services.product_id`, composite FK, warehouse partial unique indexes, `inventory_movements` once-only partial unique | inside F0 (schema-only) |
| M4 | Period-aware counter seed/backfill (per §17.4) | inside F0 tail (data-only, additive, no runtime dependency yet) |
| M5 | Private helpers/triggers: `_finance_invoice_number_next`, `_finance_apply_inventory_movement`, `_finance_resolve_pos_warehouse`, updated `_finance_expense_create_sourced` | inside F2 (private-helper installation) |
| M6 | Public RPC bodies (all 14 §7 rows, rewritten to consume M1–M5) | inside F3 (public RPC installation) |
| M7 | Adapters (all 6 §8 rows, rewritten to consume M6) | inside F4 (adapter installation) |

F5 (POS installation) and F6 (permission grants + A.15 rollback-guard tail) are unchanged in boundary; F5 gains the M6 POS RPC body and F6 grants `authenticated` EXECUTE on the six adapters + `service_role` on all M5/M6/M7 objects per Stage 4 permission map.

### §17.10 Integration status vs original §5, §9, §11, §13 bodies

The corrections in §17.1–§17.8 are **not yet inlined** into:

- **§5.4** payment mechanical decision block (still shows the 3-option compact block rather than option A executed with §17.7 rollback contract).
- **§9.3–§9.5** invoice-number policy body (still shows the flat `(tenant_id,domain)` PK rather than the §17.3 period-aware PK, and still lacks the §17.4 seed / §17.5 rollback contracts inline).
- **§11** payload contract tables — no dedicated payload row exists yet for `pos_finalize_sale`'s inventory line-level fields (`product_id`, `warehouse_id`) required by §17.8.
- **§13** F0 SQL block — does not yet contain the M1/M2/M3/M4 SQL bodies mandated above.

Until those four sections are rewritten in place using the §17.1–§17.8 contracts verbatim, the corresponding topic-level blockers remain retained per §15.

---

## §14. Structural-gate results (self-verification) — Batch D delta

*(This delta supplements §14 without replacing prior rows. Prior rows remain PASS as recorded.)*

| Gate | Result |
|---|---|
| §14.6 preimage re-verified before write matches directive (`f297d685…`) | PASS |
| §14.6 pg_proc enum-dependency sweep executed; zero direct function dependencies; trigger set captured | PASS |
| §14.6 warehouse two-index rule mechanically supported by live columns | PASS |
| §14.6 period-aware counter PK `(tenant_id, domain, period_key)` present | PASS (in §17.3) |
| §14.6 no COUNT-based seed; runtime never uses MAX/whole-table parsing | PASS (in §17.4) |
| §14.6 numbering rollback contains no `--force` / no `--purge*` | PASS (in §17.5) |
| §14.6 POS never emits `issued`; `debt` rejected with `FIN_POS_DEBT_UNSUPPORTED` | PASS (in §17.6) |
| §14.6 `payment_status` untouched by Stage 6 | PASS (in §17.7) |
| §14.6 enum rollback uses no `CASCADE`; exact-order dependency capture present | PASS (in §17.7) |
| §14.6 canonical stock mechanism is single-path (movement → trigger → stock_levels) | PASS (in §17.8) |
| §14.6 M1–M7 ordering mapped into F0–F6 without replacing phase boundaries | PASS (in §17.9) |
| §14.6 §17 corrections inlined into §5/§9/§11/§13 body | **FAIL** (documented in §17.10 — follow-up controlled edit required) |
| §14.6 verbatim body of `validate_payment_intent` captured into Stage 2 keyed preimage on disk | **FAIL** (must be captured before F1 deploys additive enum labels) |
| §14.6 only file changed is `STAGE_06_EXECUTION_SPEC.md`; no DB/migration write tool called | PASS |

---

## §15. Unresolved identifiers — Batch D.1 canonical closure

**Retired by this pass (Batch D.1, canonical inline integration):**

- `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` — canonical inventory stack (`products (tenant_id,id)` unique + `tenant_services.product_id` composite FK + two non-conflicting warehouse-default partial unique indexes + single stock path via `inventory_movements` → `trg_stock_levels_apply_movement` → `stock_levels`) inlined into §5.5 with complete forward SQL, guards, rollback, post-gates and mechanical tests; POS payment behavior (§5.3) locks `cash|card|transfer` → verified `receivable` intent with `reference_type='invoice'`; POS invoice ends `paid`; POS never emits `issued`; `debt` rejected with `FIN_POS_DEBT_UNSUPPORTED`; `payment_status` untouched.
- `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` — canonical `finance_invoice_number_config` (explicit `prefix`, `reset_policy`, `padding_width`), period-aware `finance_invoice_number_counters(tenant_id, domain, period_key)` PK, verbatim `_finance_invoice_number_next` helper (advisory + row-lock, config-only prefix, retry probe against the tenant unique index, no runtime `MAX`/`COUNT`), M4 one-time family-specific numeric-max seed with opaque families placed into a distinct canonical namespace, and complete guarded rollback (aborts on any advanced counter or any Stage-6-generated invoice) all inlined into §9.3; caller-supplied numbers rejected with `FIN_PAYLOAD_UNKNOWN_KEY`.
- `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` — additive M1 (`payment_reference_type += 'invoice'`, `payment_intent_type += 'receivable'`) inlined into §5.3 with the extended `validate_payment_intent` branch (`receivable` requires `tenant_id NOT NULL` and payee kind `tenant`); `payment_status` terminal remains `paid`; `post_payment` step 7 now inserts the full `payment_intents` business row.
- `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED` — exact dependency-preserving rollback inlined into §5.4 using the verbatim `validate_payment_intent` preimage embedded on disk in §0.2; drops trigger, drops validator, converts only `payment_intents.reference_type`/`intent_type` to text, drops and recreates the two enums with the exact original labels and ordering, restores exact owner/ACL, casts columns back, restores validator verbatim (owner, `SECURITY DEFINER`, `SET search_path TO 'public'`, ACL), restores trigger, verifies every captured index and constraint, and uses no `CASCADE`, no `--force`, no `--purge*`, no `REINDEX INDEX CONCURRENTLY`, no caller tolerance; `payment_status` untouched throughout.

**Previously retired (unchanged):** `WAREHOUSE_RESOLUTION_UNRESOLVED`, `WRITER_CENSUS_METHOD_INVALID`, `SPEC_POSTWRITE_MANIFEST_MISMATCH`, `SPEC_DUPLICATE_MERGE_CORRUPTION`, `PLAN_LOCK_RPC_SIGNATURE_DRIFT`, `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT`, `PLAN_LOCK_EXPENSE_STATE_DRIFT`, `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT`, `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION`, `PLAN_LOCK_HELPER_CONTRACT_DRIFT`.

**Retained:** none.

This section supersedes the prior §15 (lines ~1671–1699) and the Batch-D revision — they are historical only; the canonical unresolved set is this one.


---

## §16. Terminal readiness

AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.
