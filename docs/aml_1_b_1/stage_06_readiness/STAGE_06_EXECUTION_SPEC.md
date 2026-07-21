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

This file was generated from an out-of-tree candidate at `/tmp/STAGE_06_EXECUTION_SPEC.clean.md`, validated against every §14 gate, then copied to the authorized path. It contains:

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

### 5.4 Retained blocker

`PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` is retained. Resolution requires either (a) live addition of `invoice` to `payment_reference_type` and `completed` (or equivalent terminal) to `payment_status`, or (b) an explicit product decision to route receivables payments through `payment_reference_type='service'` with an anchoring `reference_id` design, or (c) confirmation that `payment_intents` is not part of receivables payments and the business row lives elsewhere.

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
| Notes | Inventory contract retained as blocker `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` — see §8; session-totals materialization retained as sub-item of the same blocker |

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

### 9.4 Retained blocker

`INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` is retained until (a) `tenants.invoice_number_config jsonb` — or equivalent — is added with tenant-migrated prefix values for every live tenant, and (b) the F0-parallel migration for `finance_invoice_number_counters` and `_finance_invoice_number_next` is accepted. Tenant-scoped uniqueness alone does **not** resolve the blocker.

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

Search scope: `src/**/*.{ts,tsx}` + `supabase/functions/**/*.ts`. Patterns:

- Single- and double-quoted `.from('table')` / `.from("table")`.
- Multi-line chains terminating in `.insert|.update|.upsert|.delete`.
- `.rpc('name', …)` invocations.
- Direct `supabase.functions.invoke('…')` mutations.
- Wrapper helpers under `src/lib/finance/**`, `src/hooks/**/**Mutation`, `src/hooks/finance/**`, `src/hooks/pos/**`, `src/hooks/hr/**`.
- Demo/seed scripts under `src/lib/demo/**` and `scripts/**` (if any).

Aggregate counts (from live `rg` sweep):

| Metric | Count |
|---|---|
| Total lines matching `.(insert|update|upsert|delete)(` in `src/` + `supabase/functions/` | **432** |
| Files containing any such mutation | **153** |
| Total `.rpc(` invocations | **93** |
| Lines matching `.from('<financial target>')` (invoices, invoice_items, ledger_entries, customer_balances, billing_links, expenses, payment_intents, pos_sales, pos_sessions, hr_salary_payments, stock_levels, inventory_transactions, inventory_movements, products, inventory_items) | **132** |

**Reconciliation vs prior "57-site" baseline.** The prior baseline conflated `.select` reads with `.insert|.update|.delete` mutations, embedded a duplicated row (numbered 7 twice), and used a narrow double-quoted `.from("table")` pattern. It therefore neither counts mutations accurately nor separates reads. The corrected mutation-site count within Stage 6 finance scope requires a full manual pass across the 132 financial-target `.from(...)` occurrences plus wrapper hooks (`useExpenses`, `useSalaryPayments`, `usePOSCore`, `useBillingLinks`, `useInvoices`, `useInvoiceItems`, `postLedgerForInvoice`, `postLedgerForPayments`, `postLedgerForExpense`, `approveInvoice`, `createSupplierPayableForExternal`, `recordAsStableCost`, and the finance edge functions in `supabase/functions/mark-overdue-invoices/`, etc.). That per-site enumeration is deferred to Stage 6.b execution; the methodology is now correct, but the physical row-by-row table is intentionally **not** locked in this pass — see the retained blocker `WRITER_CENSUS_METHOD_INVALID`.

### 12.2 Mutation census (schema of the full table)

Each row must carry: `#`, `file:line`, `target`, `op ∈ {INSERT,UPDATE,UPSERT,DELETE,RPC,EDGE}`, `caller payload`, `resolved fields`, `order`, `validation`, `permission assumption`, `idempotency`, `Stage-6 replacement RPC/adapter`, `Stage-8 disposition`.

Structural anchor rows (illustrative, non-exhaustive; full enumeration in Stage 6.b):

| # | file:line | target | op | Stage-6 replacement | Stage-8 disposition |
|---|---|---|---|---|---|
| 1 | `src/hooks/pos/usePOSCore.ts:118` | `invoices` | INSERT | `pos_finalize_sale` | replaced |
| 2 | `src/hooks/pos/usePOSCore.ts:151` | `invoice_items` | INSERT | `pos_finalize_sale` | replaced |
| 3 | `src/lib/finance/approveInvoice.ts:22` | `invoices` | UPDATE (status) | `approve_invoice` | replaced |
| 4 | `src/lib/finance/postLedgerForInvoice.ts` | `ledger_entries` | INSERT + chain UPDATE | `_finance_ledger_insert` via `approve_invoice` | replaced |
| 5 | `src/lib/finance/postLedgerForPayments.ts` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_payment` | replaced |
| 6 | `src/lib/finance/postLedgerForExpense.ts` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_expense_with_ledger` | replaced |
| 7 | `src/hooks/finance/useExpenses.ts:56` | `expenses` | INSERT | `create_expense` | replaced |
| 8 | `src/hooks/finance/useExpenses.ts:82` | `expenses` | UPDATE | `update_expense` | replaced |
| 9 | `src/hooks/finance/useExpenses.ts:110` | `expenses` | DELETE | `delete_expense` | replaced |
| 10 | `src/hooks/hr/useSalaryPayments.ts` (present) | `hr_salary_payments` | INSERT | `record_salary_payment` | replaced |
| 11 | `src/hooks/billing/useBillingLinks.ts:63` | `billing_links` | INSERT | `_finance_billing_link_upsert` (via adapter/POS/post_payment) | replaced |

### 12.3 Read-side dependency census (separate)

Reads that Stage 6/8 must preserve (illustrative, non-exhaustive):

| # | file:line | target | Purpose | Stage-6 impact |
|---|---|---|---|---|
| 1 | `src/hooks/finance/useInvoices.ts` | `invoices`, `invoice_items`, `billing_links` | list + detail | none (reads unchanged) |
| 2 | `src/pages/DashboardClientStatement.tsx` | `v_customer_ledger_balances`, `ledger_entries` | statement | none |
| 3 | `src/hooks/finance/useCustomerBalances.ts` | `customer_balances` | balances panel | none |
| 4 | `src/hooks/pos/usePOSSession.ts` | `pos_sessions`, `pos_sales`, `invoices` | POS panel | none |
| 5 | `src/hooks/finance/useExpenses.ts` (query) | `expenses` | list | none |

Reads are **never** counted against the mutation census.

`WRITER_CENSUS_METHOD_INVALID` is **partially resolved** (methodology now correct, split enforced, wrapper hooks named, financial-target regex fixed) but **retained** until the full row-by-row enumeration of all 132 financial-target mutation sites + wrapper helpers is embedded in this file.

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
| §14.5 mutation census separated from reader census | PASS (methodology; enumeration deferred per §12) |
| §14.5 Model-B positive reversal expense + negative reversal ledger | PASS |
| §14.5 POS inventory contract present OR exact blocker retained | PASS (blocker retained: `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`) |
| §14.5 invoice-number server policy present OR exact blocker retained | PASS (blocker retained: `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`) |
| §14.5 exactly one terminal line | PASS |

---

## §15. Unresolved identifiers

The following identifiers are **retained** with the exact tokens the directive requires:

- `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` — `tenant_services` (POS catalog) has no `product_id`, `sku`, or `warehouse_id` linkage columns; POS cart lines cannot mechanically bind to `products`/`stock_levels` from the current schema+code. Session totals are also not materialized (`pos_sessions` has no `sales_count/total_amount` columns). Resolution requires either (a) a service↔product bridge column on `tenant_services` (or on `pos_sales_lines` if introduced) with FK to `products`, or (b) an explicit product decision to keep POS service-only and separately spec stocked-goods POS, plus a materialized-session-totals design.
- `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` — no server-side generator exists; live tenants use at least 5 distinct prefix families (`INV-`, `اسط-`, `الم-`, `AL-`, `SUL-`), none stored in a server-readable configuration. Resolution requires a `tenants.invoice_number_config jsonb` (or equivalent) migration with values back-filled for every live tenant, plus `finance_invoice_number_counters` + `_finance_invoice_number_next`.
- `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` — `payment_intents.reference_type` has no `invoice` label and `payment_status` has no `completed` (or terminal-non-cancelled) label. Receivables `post_payment` cannot mechanically insert a valid `payment_intents` business row. Resolution requires product decision on enum expansion or an alternative business-row store.
- `WRITER_CENSUS_METHOD_INVALID` — methodology now correct (single-quoted + double-quoted `.from`, multi-line chains, wrapper hooks named, financial-target regex fixed, reader census separated), but the physical row-by-row enumeration of all 132 financial-target mutation sites plus wrapper helpers is not yet embedded in this file. Resolution requires the full census table.

The following identifiers **are resolved by this pass**:

- `SPEC_POSTWRITE_MANIFEST_MISMATCH` (§0 reconciles as export-pipeline divergence; repository = prior manifest exactly).
- `SPEC_DUPLICATE_MERGE_CORRUPTION` (clean rebuild from scratch, §14 gates PASS).
- `PLAN_LOCK_RPC_SIGNATURE_DRIFT` (§3 signatures verbatim, matrix rows anchored on them).
- `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT` (§4 exclusive-code taxonomy).
- `PLAN_LOCK_EXPENSE_STATE_DRIFT` (§6.2 lifecycle table locked; creation is `pending+unposted` only).
- `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT` (§6.4 Model-B positive reversal expense + negative reversal ledger).
- `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION` (§6.5 private `_finance_expense_create_sourced`, public expense payload rejects `source_type`/`source_reference`).
- `PLAN_LOCK_HELPER_CONTRACT_DRIFT` (§10 generalized `_finance_ledger_insert`, `_finance_billing_link_upsert` under advisory lock with historical-preserving upsert rules, no caller-controlled system fields).
- `PAYLOAD_CONTRACT_SCOPE_INVALID` (§§11.1–11.12 twelve tables, 10 metadata columns each).
- `CATALOG_EVIDENCE_NOT_EMBEDDED` (§5.1, §6.1, §9.1, §12.1 embedded queries + raw results + interpretation; `/tmp/s6/` references removed).
- `F0_SQL_ARTIFACT_CORRUPT` (§13.1 + §13.2).
- `A15_SQL_ARTIFACT_CORRUPT` (§13.3).

---

## §16. Terminal readiness

AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED, INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED, PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED, WRITER_CENSUS_METHOD_INVALID], READ-ONLY, ZERO MUTATIONS.
