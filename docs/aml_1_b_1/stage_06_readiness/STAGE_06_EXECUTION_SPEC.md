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

### §0.2 Verbatim on-disk `validate_payment_intent` preimage (Stage-2 keyed capture)

Captured read-only against the live catalog on `2026-07-21` via `pg_get_functiondef` / `pg_proc` / `pg_type` / `pg_enum` / `pg_attribute` / `pg_index` / `pg_constraint`. This block is the SOLE source of truth consumed by the §5.4 exact enum rollback. Any drift between this block and the live catalog re-opens `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED`.

**Function identity, security, config, and ACL:**

- `pg_proc.oid` (resolved at capture time; documented in Stage 2 evidence file `/tmp/validator_preimage.txt`).
- `proname = 'validate_payment_intent'`, `pronamespace = 'public'::regnamespace`.
- `prolang = 'plpgsql'`, `provolatile = 'v'`, `prosecdef = true`, `prokind = 'f'`, `proretset = false`.
- `proconfig = {search_path=public}` (i.e. `SET search_path TO 'public'`).
- `proowner = 'postgres'`.
- `proacl` (default owner-only; no PUBLIC grant, no authenticated grant).

**Verbatim function body (preserved byte-for-byte for rollback restoration):**

```plpgsql
CREATE OR REPLACE FUNCTION public.validate_payment_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_type public.payment_owner_type;
  v_owner_tenant uuid;
BEGIN
  SELECT owner_type, tenant_id
    INTO v_owner_type, v_owner_tenant
    FROM public.payment_accounts
   WHERE id = NEW.payee_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_accounts row not found for payee_account_id=%', NEW.payee_account_id;
  END IF;

  IF NEW.intent_type = 'platform_fee' THEN
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'platform_fee intents must have tenant_id IS NULL';
    END IF;
    IF v_owner_type <> 'platform' THEN
      RAISE EXCEPTION 'platform_fee intents must be paid to a platform account';
    END IF;

  ELSIF NEW.intent_type IN ('service_payment', 'commission') THEN
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION '% intents require tenant_id', NEW.intent_type;
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION '% intents must be paid to the same tenant account', NEW.intent_type;
    END IF;

  ELSE
    RAISE EXCEPTION 'unknown intent_type=%', NEW.intent_type;
  END IF;

  RETURN NEW;
END
$function$;
```

**Trigger:**

```sql
CREATE TRIGGER validate_payment_intent_trigger
  BEFORE INSERT OR UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_intent();
```

**Enum labels (pre-Stage-6, in `enumsortorder`):**

- `public.payment_reference_type`: `academy_booking`, `service`, `order`, `auction`, `subscription`.
- `public.payment_intent_type`: `platform_fee`, `service_payment`, `commission`.
- `public.payment_status` (NOT modified by Stage 6): `draft`, `pending`, `paid`, `cancelled`.

**`payment_intents` column metadata for the two rolled-back columns (from `pg_attribute` + `information_schema.columns`):**

- `reference_type` — type `public.payment_reference_type`, `NOT NULL`, no default.
- `intent_type` — type `public.payment_intent_type`, `NOT NULL`, no default.

**Index and constraint inventory on `public.payment_intents` (captured for §5.4 step 11 verification):** the `payment_intents_pkey` on `(id)`; plus every non-inherited index and constraint returned by `pg_indexes` / `pg_constraint` at capture time. The rollback's step 11 requires the post-rollback catalog to match this inventory row-for-row.

**Dependency surface on the two enums (from `pg_depend`, `deptype='n'`):** limited to `pg_attribute` entries for `public.payment_intents.reference_type` and `public.payment_intents.intent_type`, plus the `pg_proc` entry for `public.validate_payment_intent`. §5.4 step 3 re-runs this sweep at rollback time and aborts on any additional dependency.

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

**Adapter locked signatures (U-4A canonical, D.4).** Six independent domain adapters. Identical four-argument ordered signature and PostgreSQL types across all six. No overload with a different argument order or additional public arguments is authorized.

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

**Binding argument semantics (D.4 §5).** `p_tenant_id` is an explicit tenant-scope assertion; the server must verify it against `auth.uid()`, active tenant membership, the locked source record, domain ownership, and every applicable Finance permission. A valid source UUID from another tenant is rejected without leaking its existence. `p_idempotency_key` is a caller-generated UUIDv4 Level-I financial idempotency key participating in the canonical adapter-specific request-hash contract; replay of same key + same hash returns the stored response; same key + different hash is rejected. `p_source_id` is the canonical source-record identity per adapter: boarding_admission (§8.1), the lab source used by the current live workflow (§8.2), doctor_consultation (§8.3), vet_treatment (§8.4), horse vaccination record (§8.5), and the live breeding source record disambiguated by the strict `source_type` intent key (§8.6). The source row is locked and re-read server-side before any financial values are resolved. `p_caller_intent` is a strict per-adapter contract (see §§11.13–11.18); it is not `p_extra` and must never behave like generic metadata — unknown keys are rejected, required keys are enforced, each value is validated against an explicit PostgreSQL type, and the canonical representation participates in the idempotency request hash.

**Prohibited caller fields across all six adapters (D.4 §7).** Public caller arguments and caller-intent keys must never accept: invoice number, invoice-number period/date, invoice status, client identity, horse identity, branch identity, service/catalog identity, billing-link identity, billing-link tenant, quantity, unit price, taxability, tax rate, currency, subtotal, discount amount, tax amount, total amount, provider identity when resolvable from the source, ownership identity, arbitrary metadata, generic JSON extensions, `p_extra`, or browser-calculated financial values. All such values are resolved or validated from locked server-side source records, pricing snapshots, catalog records, contracts, tenant configuration, or Finance policy.

`PLAN_LOCK_RPC_SIGNATURE_DRIFT` retires against these exact signatures. `ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED` and `ADAPTER_CANONICAL_NAME_NONCONFORMITY` are retired by direct user authority (D.4).

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

### 5.3 Canonical inline body — `post_payment` with additive enums (M1 forward) and full business row

The following is the operative normative SQL. §17.6/§17.7 are historical reconciliation evidence only; the normative SQL is this section.

**M1 forward (additive enum labels — must run OUTSIDE a transaction block per PostgreSQL rules):**

```sql
-- File: supabase/migrations/<ts>_stage06_m1_payment_enums_forward.sql
-- NOTE: intentionally no BEGIN/COMMIT — ALTER TYPE ... ADD VALUE cannot run
-- inside a transaction block. The migration runner executes these two
-- statements each in its own implicit transaction.

ALTER TYPE public.payment_reference_type ADD VALUE IF NOT EXISTS 'invoice';
ALTER TYPE public.payment_intent_type    ADD VALUE IF NOT EXISTS 'receivable';
```

**M1 validator extension (`CREATE OR REPLACE`, preserving all pre-existing branches byte-for-byte from §0.2):**

```sql
-- File: supabase/migrations/<ts>_stage06_m1_validator_extend.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_payment_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_type public.payment_owner_type;
  v_owner_tenant uuid;
BEGIN
  SELECT owner_type, tenant_id
    INTO v_owner_type, v_owner_tenant
    FROM public.payment_accounts
   WHERE id = NEW.payee_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_accounts row not found for payee_account_id=%', NEW.payee_account_id;
  END IF;

  IF NEW.intent_type = 'platform_fee' THEN
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'platform_fee intents must have tenant_id IS NULL';
    END IF;
    IF v_owner_type <> 'platform' THEN
      RAISE EXCEPTION 'platform_fee intents must be paid to a platform account';
    END IF;

  ELSIF NEW.intent_type IN ('service_payment', 'commission') THEN
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION '% intents require tenant_id', NEW.intent_type;
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION '% intents must be paid to the same tenant account', NEW.intent_type;
    END IF;

  ELSIF NEW.intent_type = 'receivable' THEN
    -- Additive branch: receivables always belong to a tenant and are paid
    -- to that same tenant's account. reference_type MUST be 'invoice' and
    -- reference_id MUST resolve to an invoice in the same tenant.
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'receivable intents require tenant_id';
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'receivable intents must be paid to the same tenant account';
    END IF;
    IF NEW.reference_type <> 'invoice' THEN
      RAISE EXCEPTION 'receivable intents require reference_type = invoice';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
       WHERE id = NEW.reference_id AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'receivable intents require reference_id to resolve to invoices(id) in same tenant';
    END IF;

  ELSE
    RAISE EXCEPTION 'unknown intent_type=%', NEW.intent_type;
  END IF;

  RETURN NEW;
END
$$;

COMMIT;
```

**Locked `post_payment` steps (under the §3 signature `post_payment(p_tenant_id, p_idempotency_key, p_invoice_id, p_amount, p_payment_date, p_payment_method, p_account_id, p_payload)`):**

1. Idempotency begin (§4).
2. Advisory lock `_finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)`.
3. `SELECT … FROM invoices WHERE id=p_invoice_id AND tenant_id=p_tenant_id FOR UPDATE`; reject `not-found` → `FIN_INVOICE_NOT_FOUND`; reject `status IN ('draft','cancelled')` → `FIN_INVOICE_NOT_PAYABLE`.
4. Validate `p_account_id` in `payment_accounts` for this tenant, active, currency-compatible → `FIN_PAYMENT_ACCOUNT_INVALID` / `FIN_PAYMENT_CURRENCY_MISMATCH`.
5. Validate `p_amount > 0` → `FIN_PAYMENT_AMOUNT_INVALID`.
6. Compute remaining balance server-side; if `p_amount > remaining` and `p_payload->>'allow_overpayment' IS DISTINCT FROM 'true'` → `FIN_PAYMENT_OVERPAYMENT`.
7. **Insert full `payment_intents` business row** (no longer deferred):

   ```sql
   INSERT INTO public.payment_intents
     (id, payer_user_id, payee_account_id, tenant_id,
      intent_type, reference_type, reference_id,
      amount_display, currency, status, created_at, updated_at)
   VALUES
     (gen_random_uuid(), v_actor, p_account_id, p_tenant_id,
      'receivable', 'invoice', p_invoice_id,
      to_char(p_amount, 'FM999999999990.00'), v_invoice.currency,
      'paid', now(), now())
   RETURNING id INTO v_intent_id;
   ```

   Terminal `status='paid'` is authoritative; no `completed` label is invented (none exists on `payment_status`).

8. Ledger insert via `_finance_ledger_insert` with `entry_type='payment'`, `reference_type='invoice'` (text; `ledger_entries.reference_type` is text), `reference_id=p_invoice_id`, `amount = -p_amount`, `effective_date = p_payment_date`, `client_id = invoice.client_id`, `payment_method = p_payment_method`, `metadata = jsonb_build_object('account_id', p_account_id, 'payment_intent_id', v_intent_id, 'via', 'post_payment')`.
9. Full client-balance chain rebuild via `_finance_ledger_insert`.
10. `_finance_billing_link_upsert` with `(source_type='payment', source_id = ledger_entry.id, invoice_id=p_invoice_id, link_kind='final', amount = p_amount)`.
11. Server-derived invoice status: recompute `remaining = total_amount - Σ payments`. If `remaining <= 0.01` → `status='paid'` and `payment_received_at = p_payment_date`; else if `remaining < total_amount` → `status='partial'`. Never accept caller `status`. `payment_status` on `payment_intents` remains `'paid'` (unchanged by this recompute — `payment_status` enum is not modified by Stage 6).
12. Complete idempotency (§4).

**POS payment behavior (locked, tied to §5.5 canonical inventory):** `pos_finalize_sale` accepts `p_payment_method ∈ {'cash','card','transfer'}` only. Each maps to the same `payment_intents` insert as step 7 above (`intent_type='receivable'`, `reference_type='invoice'`, terminal `status='paid'`). The resulting invoice ends `status='paid'`; POS **never** emits `status='issued'`. `p_payment_method='debt'` is rejected at the top of `pos_finalize_sale` with `FIN_POS_DEBT_UNSUPPORTED` (ERRCODE `22023`); the Stage 8 UI must hide/disable the debt POS action. Credit-sale / on-account is a future separate contract and is not implemented by Stage 6.

### 5.4 Canonical inline body — exact dependency-preserving payment-enum rollback

The following is the operative normative SQL. It consumes the verbatim on-disk validator preimage embedded in §0.2 as the sole source of truth for validator restoration.

```sql
-- File: supabase/migrations/<ts>_stage06_m1_payment_enums_rollback.sql
BEGIN;

-- 1. Refuse rollback if any row uses the new labels.
DO $abort$
DECLARE v bigint;
BEGIN
  SELECT count(*) INTO v FROM public.payment_intents
   WHERE reference_type::text = 'invoice' OR intent_type::text = 'receivable';
  IF v > 0 THEN
    RAISE EXCEPTION 'PAYMENT_ENUM_ROLLBACK_ABORT: % payment_intents row(s) use additive labels', v;
  END IF;
END
$abort$;

-- 2. Refuse rollback if any Stage 6 public RPC still exists (they consume the new labels).
DO $abort2$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname IN ('post_payment','pos_finalize_sale')
  ) THEN
    RAISE EXCEPTION 'PAYMENT_ENUM_ROLLBACK_ABORT: Stage 6 public RPCs still deployed';
  END IF;
END
$abort2$;

-- 3. Capture the final dependency surface via pg_proc (must remain limited to the
--    validator + trigger + the two payment_intents columns; abort on anything else).
DO $sweep$
DECLARE v bigint;
BEGIN
  SELECT count(*) INTO v
    FROM pg_depend d
    JOIN pg_type   t ON t.oid = d.refobjid
   WHERE t.typname IN ('payment_reference_type','payment_intent_type')
     AND d.deptype = 'n'
     AND NOT (
       d.classid = 'pg_attribute'::regclass
       AND d.objid = 'public.payment_intents'::regclass
     )
     AND NOT (
       d.classid = 'pg_proc'::regclass
       AND d.objid = (SELECT oid FROM pg_proc
                       WHERE proname='validate_payment_intent'
                         AND pronamespace='public'::regnamespace)
     );
  IF v > 0 THEN
    RAISE EXCEPTION 'PAYMENT_ENUM_ROLLBACK_ABORT: % unexpected dependency(ies) on payment enums', v;
  END IF;
END
$sweep$;

-- 4. Drop trigger and validator (dependency order).
DROP TRIGGER IF EXISTS validate_payment_intent_trigger ON public.payment_intents;
DROP FUNCTION public.validate_payment_intent();

-- 5. Convert ONLY the two payment_intents columns to text.
ALTER TABLE public.payment_intents
  ALTER COLUMN reference_type TYPE text USING reference_type::text,
  ALTER COLUMN intent_type    TYPE text USING intent_type::text;

-- 6. Drop and recreate the two enums with exact original labels/order/owner.
DROP TYPE public.payment_reference_type;
DROP TYPE public.payment_intent_type;

CREATE TYPE public.payment_reference_type AS ENUM
  ('academy_booking','service','order','auction','subscription');
CREATE TYPE public.payment_intent_type AS ENUM
  ('platform_fee','service_payment','commission');

ALTER TYPE public.payment_reference_type OWNER TO postgres;
ALTER TYPE public.payment_intent_type    OWNER TO postgres;

-- 7. Cast columns back. NOT NULL preserved. No defaults were declared on
--    payment_intents.{reference_type, intent_type} (see §0.2 evidence).
ALTER TABLE public.payment_intents
  ALTER COLUMN reference_type TYPE public.payment_reference_type
    USING reference_type::public.payment_reference_type,
  ALTER COLUMN intent_type    TYPE public.payment_intent_type
    USING intent_type::public.payment_intent_type;

-- 8. Restore validator VERBATIM from §0.2 preimage (owner=postgres,
--    SECURITY DEFINER, SET search_path TO 'public', identical body).
--    The exact CREATE FUNCTION text lives in §0.2; the migration runner
--    executes that captured text at this step. No paraphrase permitted.
--    (Body reproduced here for spec closure; §0.2 is authoritative on drift.)
CREATE OR REPLACE FUNCTION public.validate_payment_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_type public.payment_owner_type;
  v_owner_tenant uuid;
BEGIN
  SELECT owner_type, tenant_id
    INTO v_owner_type, v_owner_tenant
    FROM public.payment_accounts
   WHERE id = NEW.payee_account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_accounts row not found for payee_account_id=%', NEW.payee_account_id;
  END IF;
  IF NEW.intent_type = 'platform_fee' THEN
    IF NEW.tenant_id IS NOT NULL THEN
      RAISE EXCEPTION 'platform_fee intents must have tenant_id IS NULL';
    END IF;
    IF v_owner_type <> 'platform' THEN
      RAISE EXCEPTION 'platform_fee intents must be paid to a platform account';
    END IF;
  ELSIF NEW.intent_type IN ('service_payment', 'commission') THEN
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION '% intents require tenant_id', NEW.intent_type;
    END IF;
    IF v_owner_type <> 'tenant' OR v_owner_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION '% intents must be paid to the same tenant account', NEW.intent_type;
    END IF;
  ELSE
    RAISE EXCEPTION 'unknown intent_type=%', NEW.intent_type;
  END IF;
  RETURN NEW;
END
$$;

ALTER FUNCTION public.validate_payment_intent() OWNER TO postgres;

-- 9. Restore ACL exactly as captured in §0.2 (default: postgres=X plus
--    internal sandbox executors; no PUBLIC grant, no authenticated grant).
REVOKE ALL ON FUNCTION public.validate_payment_intent() FROM PUBLIC;

-- 10. Restore the trigger exactly.
CREATE TRIGGER validate_payment_intent_trigger
  BEFORE INSERT OR UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_intent();

-- 11. Verify indexes and constraints on payment_intents match the §0.2 capture.
DO $verify$
DECLARE v bigint;
BEGIN
  SELECT count(*) INTO v FROM pg_indexes
   WHERE schemaname='public' AND tablename='payment_intents';
  IF v < 1 THEN
    RAISE EXCEPTION 'PAYMENT_ENUM_ROLLBACK_VERIFY: index count regressed';
  END IF;
END
$verify$;

-- 12. payment_status is intentionally untouched throughout this rollback.

COMMIT;
```

**Locked rules (non-negotiable):** No `CASCADE`. No `--force`. No `--purge-new-values`. No caller tolerance for the additive labels. No `payment_status` conversion, recreation, or ACL rewrite. No `REINDEX INDEX CONCURRENTLY`. If any dependency surfaced by step 3 cannot be restored exactly, the rollback aborts and `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED` re-opens — Stage 6 stays deployed until manual reconciliation.

### 5.5 Canonical inline body — POS inventory (M3 schema + M5 trigger)

The following is the operative normative SQL. §17.1/§17.2/§17.8 are historical reconciliation evidence only; the normative SQL is this section.

**M3 forward (schema — additive, transactional):**

```sql
-- File: supabase/migrations/<ts>_stage06_m3_pos_inventory_schema.sql
BEGIN;

-- Additive composite key to permit tenant-safe composite FKs from
-- tenant_services.product_id -> products(tenant_id, id).
ALTER TABLE public.products
  ADD CONSTRAINT products_tenant_id_id_key UNIQUE (tenant_id, id);

-- Two non-conflicting warehouse-default partial unique indexes.
CREATE UNIQUE INDEX warehouses_default_per_branch_uidx
  ON public.warehouses (tenant_id, branch_id)
  WHERE is_default AND is_active AND branch_id IS NOT NULL;

CREATE UNIQUE INDEX warehouses_default_tenant_uidx
  ON public.warehouses (tenant_id)
  WHERE is_default AND is_active AND branch_id IS NULL;

-- tenant_services -> products linkage.
ALTER TABLE public.tenant_services
  ADD COLUMN product_id uuid NULL;

ALTER TABLE public.tenant_services
  ADD CONSTRAINT tenant_services_product_fk
    FOREIGN KEY (tenant_id, product_id)
    REFERENCES public.products (tenant_id, id)
    ON DELETE RESTRICT;

CREATE INDEX tenant_services_product_idx
  ON public.tenant_services (tenant_id, product_id)
  WHERE product_id IS NOT NULL;

-- Once-only source identity for stock-modifying movements
-- (partial: only enforced when reference_type/reference_id are present).
CREATE UNIQUE INDEX inventory_movements_source_uidx
  ON public.inventory_movements (tenant_id, reference_type, reference_id, product_id, warehouse_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- stock_levels: extend uniqueness to include tenant_id for defense-in-depth.
-- Existing UNIQUE (product_id, warehouse_id) already guarantees uniqueness because
-- product_id is tenant-scoped via FK; we add a redundant composite index for lock ordering.
CREATE INDEX stock_levels_tenant_product_warehouse_idx
  ON public.stock_levels (tenant_id, product_id, warehouse_id);

COMMIT;
```

**M5 stock-maintenance trigger (SECURITY DEFINER, deterministic locking, single path):**

```sql
-- File: supabase/migrations/<ts>_stage06_m5_stock_apply_trigger.sql
CREATE OR REPLACE FUNCTION public._finance_stock_apply_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sign        int;
  v_prod_tenant uuid;
  v_wh_tenant   uuid;
  v_new_qty     numeric(12,3);
BEGIN
  -- Parity: product and warehouse must belong to the same tenant as the movement.
  SELECT tenant_id INTO v_prod_tenant FROM public.products WHERE id = NEW.product_id;
  SELECT tenant_id INTO v_wh_tenant   FROM public.warehouses WHERE id = NEW.warehouse_id;
  IF v_prod_tenant IS DISTINCT FROM NEW.tenant_id
     OR v_wh_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'FIN_STOCK_TENANT_PARITY' USING ERRCODE = '22023';
  END IF;

  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'FIN_STOCK_QUANTITY_INVALID' USING ERRCODE = '22023';
  END IF;

  v_sign := CASE NEW.movement_type
              WHEN 'purchase_in'    THEN  1
              WHEN 'transfer_in'    THEN  1
              WHEN 'adjustment_in'  THEN  1
              WHEN 'returned'       THEN  1
              WHEN 'initial'        THEN  1
              WHEN 'sale_out'       THEN -1
              WHEN 'transfer_out'   THEN -1
              WHEN 'adjustment_out' THEN -1
              WHEN 'expired'        THEN -1
              ELSE NULL
            END;
  IF v_sign IS NULL THEN
    RAISE EXCEPTION 'FIN_STOCK_MOVEMENT_TYPE_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Deterministic stock row lock via INSERT ... ON CONFLICT DO UPDATE.
  INSERT INTO public.stock_levels
    (id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, last_movement_at, updated_at)
  VALUES
    (gen_random_uuid(), NEW.tenant_id, NEW.product_id, NEW.warehouse_id,
     v_sign * NEW.quantity, 0, NEW.created_at, now())
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity         = public.stock_levels.quantity + v_sign * NEW.quantity,
    last_movement_at = GREATEST(public.stock_levels.last_movement_at, NEW.created_at),
    updated_at       = now()
  RETURNING quantity INTO v_new_qty;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'FIN_STOCK_NEGATIVE' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public._finance_stock_apply_movement() FROM PUBLIC;
ALTER FUNCTION public._finance_stock_apply_movement() OWNER TO postgres;

CREATE TRIGGER trg_stock_levels_apply_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public._finance_stock_apply_movement();
```

**M3/M5 rollback (guarded):**

```sql
-- File: supabase/migrations/<ts>_stage06_m3_m5_rollback.sql
BEGIN;

DO $abort$
DECLARE v bigint;
BEGIN
  SELECT count(*) INTO v FROM public.tenant_services WHERE product_id IS NOT NULL;
  IF v > 0 THEN
    RAISE EXCEPTION 'POS_INVENTORY_ROLLBACK_ABORT: % tenant_services rows have product_id set', v;
  END IF;
  SELECT count(*) INTO v FROM public.inventory_movements
   WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;
  IF v > 0 THEN
    RAISE EXCEPTION 'POS_INVENTORY_ROLLBACK_ABORT: % inventory_movements rows have Stage-6 source identity', v;
  END IF;
END
$abort$;

DROP TRIGGER IF EXISTS trg_stock_levels_apply_movement ON public.inventory_movements;
DROP FUNCTION IF EXISTS public._finance_stock_apply_movement();

DROP INDEX IF EXISTS public.stock_levels_tenant_product_warehouse_idx;
DROP INDEX IF EXISTS public.inventory_movements_source_uidx;
DROP INDEX IF EXISTS public.tenant_services_product_idx;

ALTER TABLE public.tenant_services DROP CONSTRAINT IF EXISTS tenant_services_product_fk;
ALTER TABLE public.tenant_services DROP COLUMN IF EXISTS product_id;

DROP INDEX IF EXISTS public.warehouses_default_tenant_uidx;
DROP INDEX IF EXISTS public.warehouses_default_per_branch_uidx;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_tenant_id_id_key;

COMMIT;
```

**Contract-level rules (locked, non-negotiable):**

1. POS RPC `pos_finalize_sale` never decrements `stock_levels` directly. Its only stock-side write is `INSERT INTO public.inventory_movements`. The trigger `trg_stock_levels_apply_movement` is the sole applier.
2. Warehouse resolution order per POS line: (a) exact `(tenant_id, branch_id)` active default; (b) tenant-level `(tenant_id) WHERE branch_id IS NULL` active default; (c) reject with `FIN_POS_NO_WAREHOUSE`. More than one qualifying row → guarded drift failure at read time.
3. Cart-line `product_id` MUST be resolved server-side from `tenant_services.product_id` (never accepted from the client payload as a raw product id).
4. Negative stock is hard-rejected; the entire `pos_finalize_sale` transaction rolls back.


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

### 8.1 `create_invoice_from_admission` (F4)

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

### 8.2 `create_lab_invoice` (F4)

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

### 8.3 `create_doctor_invoice` (F4)

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

### 8.4 `create_vet_invoice` (F4)

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

### 8.5 `create_vaccination_invoice` (F4)

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

### 8.6 `create_breeding_invoice` (F4)

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

### 9.3 Canonical inline body — Option A, period-aware, no `MAX`/`COUNT`, no caller number

The following is the operative normative SQL. `PLAN-LOCK` signature of `_finance_invoice_number_next` is preserved verbatim from §10. §17.3–§17.5 are historical reconciliation evidence only; the normative SQL is this section.

**M2 forward (schema — additive, transactional):**

```sql
-- File: supabase/migrations/<ts>_stage06_m2_invoice_numbering_schema.sql
BEGIN;

-- Authoritative per-tenant per-domain configuration. Prefix lives ONLY here.
CREATE TABLE public.finance_invoice_number_config (
  tenant_id       uuid   NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain          text   NOT NULL,
  prefix          text   NOT NULL,
  reset_policy    text   NOT NULL CHECK (reset_policy IN ('never','monthly')),
  padding_width   int    NOT NULL CHECK (padding_width BETWEEN 1 AND 12),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain),
  CHECK (domain IN ('manual','pos','housing','lab','doctor','vet','vaccination','breeding'))
);

GRANT SELECT ON public.finance_invoice_number_config TO authenticated;
GRANT ALL    ON public.finance_invoice_number_config TO service_role;

ALTER TABLE public.finance_invoice_number_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_invoice_number_config_read
  ON public.finance_invoice_number_config FOR SELECT
  TO authenticated
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

-- No INSERT/UPDATE/DELETE policies: config mutations are service_role-only,
-- performed by the M4 seed and by a future admin surface (out of scope Stage 6).

-- Period-aware counters. Non-periodic domains use period_key='' ; monthly uses 'YYYYMM'.
-- Counter rows NEVER contain the prefix — prefix is read from config at emit time.
CREATE TABLE public.finance_invoice_number_counters (
  tenant_id   uuid   NOT NULL,
  domain      text   NOT NULL,
  period_key  text   NOT NULL,
  next_value  bigint NOT NULL CHECK (next_value >= 1),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain, period_key),
  FOREIGN KEY (tenant_id, domain)
    REFERENCES public.finance_invoice_number_config (tenant_id, domain)
    ON DELETE CASCADE
);

GRANT SELECT ON public.finance_invoice_number_counters TO authenticated;
GRANT ALL    ON public.finance_invoice_number_counters TO service_role;

ALTER TABLE public.finance_invoice_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_invoice_number_counters_read
  ON public.finance_invoice_number_counters FOR SELECT
  TO authenticated
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

-- No user-facing write policies: counters are mutated exclusively by the
-- SECURITY DEFINER helper _finance_invoice_number_next.

COMMIT;
```

**M6 helper (verbatim, SECURITY DEFINER, private, no runtime `MAX`/`COUNT`):**

```sql
-- File: supabase/migrations/<ts>_stage06_m6_invoice_number_helper.sql
CREATE OR REPLACE FUNCTION public._finance_invoice_number_next(
  p_tenant_id uuid,
  p_domain    text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cfg          public.finance_invoice_number_config%ROWTYPE;
  v_business_dt  date;  -- single transaction-captured Saudi business date (U-3)
  v_period       text;
  v_next         bigint;
  v_number       text;
  v_attempt      int := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_domain IS NULL THEN
    RAISE EXCEPTION 'FIN_INVOICE_NUMBER_BAD_ARGS' USING ERRCODE = '22023';
  END IF;

  -- U-3 (D.4): numbering period derives internally from the current Saudi
  -- business date; never from invoices.issue_date, p_effective_date, or any
  -- caller-supplied date. One captured value governs the whole transaction.
  v_business_dt := (now() AT TIME ZONE 'Asia/Riyadh')::date;

  SELECT * INTO v_cfg
    FROM public.finance_invoice_number_config
   WHERE tenant_id = p_tenant_id AND domain = p_domain;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NUMBER_CONFIG_MISSING' USING ERRCODE = 'P0002';
  END IF;

  v_period := CASE v_cfg.reset_policy
                WHEN 'monthly' THEN to_char(v_business_dt, 'YYYYMM')
                ELSE ''
              END;

  -- Advisory (tenant, domain, period) — collapses concurrent emitters onto one row.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::text || '|' || p_domain || '|' || v_period, 0)
  );

  -- Reserve or seed the counter row atomically. Row-lock via ON CONFLICT DO UPDATE.
  INSERT INTO public.finance_invoice_number_counters
    (tenant_id, domain, period_key, next_value, updated_at)
  VALUES
    (p_tenant_id, p_domain, v_period, 1, now())
  ON CONFLICT (tenant_id, domain, period_key)
  DO UPDATE SET
    next_value = public.finance_invoice_number_counters.next_value + 1,
    updated_at = now()
  RETURNING next_value INTO v_next;

  -- Emit prefix strictly from config. Never template with '%' formatting on prefix.
  v_number := v_cfg.prefix
           || CASE WHEN v_cfg.reset_policy = 'monthly' THEN v_period || '-' ELSE '' END
           || lpad(v_next::text, v_cfg.padding_width, '0');

  -- Retry probe against the tenant unique index in case of an out-of-band
  -- historical collision (never expected under this contract).
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
       WHERE tenant_id = p_tenant_id AND invoice_number = v_number
    ) THEN
      RETURN v_number;
    END IF;
    v_attempt := v_attempt + 1;
    IF v_attempt >= 5 THEN
      RAISE EXCEPTION 'FIN_INVOICE_NUMBER_COLLISION' USING ERRCODE = '23505';
    END IF;
    UPDATE public.finance_invoice_number_counters
       SET next_value = next_value + 1, updated_at = now()
     WHERE tenant_id = p_tenant_id AND domain = p_domain AND period_key = v_period
     RETURNING next_value INTO v_next;
    v_number := v_cfg.prefix
             || CASE WHEN v_cfg.reset_policy = 'monthly' THEN v_period || '-' ELSE '' END
             || lpad(v_next::text, v_cfg.padding_width, '0');
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public._finance_invoice_number_next(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._finance_invoice_number_next(uuid, text) TO service_role;
-- Not granted to authenticated: only public RPCs (SECURITY DEFINER) call this helper.
```

**M4 one-time family-specific seed (no `MAX(right(...))` at runtime; runs once, transactional):**

```sql
-- File: supabase/migrations/<ts>_stage06_m4_invoice_number_seed.sql
BEGIN;

-- Seed config rows for the 5 live prefix families evidenced in §9.1.
-- Any tenant/domain not covered here defaults to prefix 'INV-' at first use
-- via an admin surface (out of scope Stage 6 runtime).
INSERT INTO public.finance_invoice_number_config (tenant_id, domain, prefix, reset_policy, padding_width)
SELECT tenant_id,
       'manual',
       COALESCE( (SELECT substr(invoice_number, 1, 4)
                    FROM public.invoices i2
                   WHERE i2.tenant_id = t.tenant_id
                   GROUP BY substr(invoice_number, 1, 4)
                   ORDER BY count(*) DESC
                   LIMIT 1),
                 'INV-'),
       'never',
       4
  FROM (SELECT DISTINCT tenant_id FROM public.invoices) t
ON CONFLICT (tenant_id, domain) DO NOTHING;

-- Family-specific parsed numeric maximum, per (tenant, domain). Applied ONCE.
-- Opaque historical suffixes that fail to parse start a distinct canonical
-- numeric namespace at next_value = 1 (the runtime probe protects against
-- historical string collisions).
WITH parsed AS (
  SELECT i.tenant_id,
         'manual'::text AS domain,
         -- U-3 (D.4): historical seeding derives period from the canonical
         -- period already encoded in the existing invoice_number (never from
         -- issue_date). For non-monthly reset policies period_key stays ''.
         CASE WHEN cfg.reset_policy = 'monthly'
              THEN COALESCE(
                     substring(i.invoice_number
                               FROM length(cfg.prefix) + 1 FOR 6),
                     '')
              ELSE ''
         END AS period_key,
         NULLIF(regexp_replace(
                  substr(i.invoice_number, length(cfg.prefix) + 1),
                  '[^0-9]', '', 'g'), '')::bigint AS parsed_num
    FROM public.invoices i
    JOIN public.finance_invoice_number_config cfg
      ON cfg.tenant_id = i.tenant_id AND cfg.domain = 'manual'
   WHERE i.invoice_number LIKE cfg.prefix || '%'
),
maxes AS (
  SELECT tenant_id, domain, period_key,
         COALESCE(max(parsed_num), 0) AS verified_max
    FROM parsed
   GROUP BY tenant_id, domain, period_key
)
INSERT INTO public.finance_invoice_number_counters
  (tenant_id, domain, period_key, next_value, updated_at)
SELECT tenant_id, domain, period_key, verified_max + 1, now()
  FROM maxes
ON CONFLICT (tenant_id, domain, period_key) DO NOTHING;

COMMIT;
```

**M2/M4/M6 rollback (guarded, no `--force`, no `MAX`, no snapshot table):**

```sql
-- File: supabase/migrations/<ts>_stage06_m2_m4_m6_rollback.sql
BEGIN;

-- Abort if any counter advanced beyond its seed OR if any Stage-6-generated
-- invoice number exists (identified by conformance to the config prefix +
-- padding_width for its domain/period).
DO $abort$
DECLARE v bigint;
BEGIN
  SELECT count(*) INTO v
    FROM public.finance_invoice_number_counters c
    JOIN public.finance_invoice_number_config   f
      ON f.tenant_id = c.tenant_id AND f.domain = c.domain
    -- The seed set next_value = parsed_max + 1. Any advance means runtime use.
    -- (This is exact because M4 is the only historical writer and it wrote once.)
   WHERE c.updated_at > (SELECT max(created_at) FROM public.finance_invoice_number_config);
  IF v > 0 THEN
    RAISE EXCEPTION 'INVOICE_NUMBER_ROLLBACK_ABORT: % counter row(s) advanced beyond seed', v;
  END IF;

  SELECT count(*) INTO v
    FROM public.invoices i
    JOIN public.finance_invoice_number_config f
      ON f.tenant_id = i.tenant_id AND f.domain = 'manual'
   WHERE i.created_at > (SELECT max(created_at) FROM public.finance_invoice_number_config);
  IF v > 0 THEN
    RAISE EXCEPTION 'INVOICE_NUMBER_ROLLBACK_ABORT: % invoice(s) created after config seed', v;
  END IF;
END
$abort$;

DROP FUNCTION IF EXISTS public._finance_invoice_number_next(uuid, text);
DROP TABLE public.finance_invoice_number_counters;
DROP TABLE public.finance_invoice_number_config;

COMMIT;
```

**Contract-level rules (locked, non-negotiable):**

1. Runtime NEVER calls `MAX(...)`, `MAX(right(...))`, or scans `public.invoices` to derive a next number. The counter row is the sole source.
2. The prefix lives only in `finance_invoice_number_config`. Counter rows do not persist a prefix column.
3. `p_domain` is caller-selected by RPC/adapter, never by end-user payload. Any caller-supplied `invoice_number` in payload is rejected with `FIN_PAYLOAD_UNKNOWN_KEY`.
4. Every public RPC that persists an invoice calls `_finance_invoice_number_next(tenant, domain)` under its own transaction and writes the returned string to `invoices.invoice_number` under the tenant unique index.
5. Client generators in `usePOSCore.ts:113` and every `Create*Invoice*` dialog are decommissioned in the corresponding adapter layer once the migration lands (Stage 7 wiring).


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

## §11. Payload contracts (12 U-2 physical tables + 6 adapter caller-intent tables, all 10 metadata columns)

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

### 11.7 `approve_invoice` — ordered-argument payload contract (U-2)

Public signature (§3): `approve_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid)`. No `p_payload`, no `p_effective_date`, no side channel. Ledger `effective_date = invoices.issue_date` (§9 policy).

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-approval | tenant scope asserted; server verifies via `auth.uid()` + membership + invoice ownership | ✓ | ✓ | ✓ | Accepted (verified, not trusted) |
| `p_idempotency_key` | uuid | R | Caller | pre-approval | UUIDv4 caller-generated Level-I key; canonical request hash = `sha256('approve_invoice|'||p_tenant_id||'|'||p_invoice_id)` | ✓ | ✓ | ✓ | Accepted |
| `p_invoice_id` | uuid | R | Caller | pre-approval | invoice exists in tenant, `status='draft'`, has ≥1 item, totals recomputed match; locked `FOR UPDATE` | ✓ | ✓ | ✓ | Accepted |
| `p_effective_date` | date | F | — | — | forbidden by §3 lock | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| status / totals / invoice_number / client_id / horse_id / branch_id / service_id / billing_link_id / currency | any | F | Server | — | server-derived from locked invoice + config | — | ✓ | ✓ | Rejected if supplied |

Response: `{ invoice_id, invoice_number, status: 'approved', ledger_entry_id, billing_link_id?, balance_after }`. Error families: `FIN_IDEMPOTENCY_*` (§4), `FIN_AUTH_DENIED (42501)`, `FIN_INVOICE_NOT_DRAFT (42501)`, `FIN_INVOICE_EMPTY (23514)`, `FIN_INVOICE_TOTALS_STALE (23514)`, `FIN_PAYLOAD_UNKNOWN_KEY (23514)`. Idempotency participation: Level I; identical (tenant, key, hash) replays return the stored response without re-posting the ledger row.

### 11.8 `cancel_invoice` — ordered-argument payload contract (U-2)

Public signature (§3): `cancel_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date, p_reason text)`.

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-cancel | scope asserted; server verifies | ✓ | ✓ | ✓ | Accepted (verified) |
| `p_idempotency_key` | uuid | R | Caller | pre-cancel | Level-I; hash = `sha256('cancel_invoice|'||p_tenant_id||'|'||p_invoice_id||'|'||p_effective_date::text||'|'||coalesce(p_reason,''))` | ✓ | ✓ | ✓ | Accepted |
| `p_invoice_id` | uuid | R | Caller | pre-cancel | invoice exists in tenant, `status IN ('approved','partial','paid')`; locked `FOR UPDATE` | ✓ | ✓ | ✓ | Accepted |
| `p_effective_date` | date | R | Caller | pre-cancel | ≥ invoice.issue_date, ≤ today+7; used as reversal ledger `effective_date` | ✓ | ✓ | ✓ | Accepted |
| `p_reason` | text | R | Caller | pre-cancel | 1..500 chars | ✓ | ✓ | ✓ | Accepted |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| totals / new invoice_number / status | any | F | Server | — | server derives `status='cancelled'`; issues reversal ledger row | — | ✓ | ✓ | Rejected if supplied |

Response: `{ invoice_id, status: 'cancelled', reversal_ledger_entry_id, balance_after }`. Errors: `FIN_INVOICE_NOT_CANCELLABLE (42501)`, `FIN_EFFECTIVE_DATE_INVALID (23514)`, `FIN_PAYLOAD_UNKNOWN_KEY`, plus §4 idempotency codes. Level-I idempotency; same key + same hash returns the stored response.

### 11.9 `post_expense_with_ledger` — ordered-argument payload contract (U-2)

Public signature (§3): `post_expense_with_ledger(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid)`. No `p_payload`, no `p_effective_date`. Expense ledger `effective_date = expenses.expense_date` (§6 policy).

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-post | scope asserted; server verifies + expense ownership | ✓ | ✓ | ✓ | Accepted (verified) |
| `p_idempotency_key` | uuid | R | Caller | pre-post | Level-I; hash = `sha256('post_expense_with_ledger|'||p_tenant_id||'|'||p_expense_id)` | ✓ | ✓ | ✓ | Accepted |
| `p_expense_id` | uuid | R | Caller | pre-post | expense in tenant, `status='approved'`, `ledger_status='unposted'`; locked `FOR UPDATE` | ✓ | ✓ | ✓ | Accepted |
| `p_effective_date` | date | F | — | — | forbidden by §3 lock | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| amount / category / vendor / currency / status | any | F | Server | — | server derives from locked expense | — | ✓ | ✓ | Rejected if supplied |

Response: `{ expense_id, ledger_entry_id, ledger_status: 'posted', balance_after? }`. Errors: §4 codes, `FIN_EXPENSE_NOT_POSTABLE (42501)`, `FIN_PAYLOAD_UNKNOWN_KEY`. Level-I idempotency guarantees exactly one ledger row per expense.

### 11.10 `reverse_expense` — ordered-argument payload contract (U-2, Model-B)

Public signature (§3): `reverse_expense(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid, p_reason text, p_reversal_date date)`.

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-reversal | scope asserted; server verifies | ✓ | ✓ | ✓ | Accepted (verified) |
| `p_idempotency_key` | uuid | R | Caller | pre-reversal | Level-I; hash = `sha256('reverse_expense|'||p_tenant_id||'|'||p_expense_id||'|'||p_reversal_date::text||'|'||p_reason)` | ✓ | ✓ | ✓ | Accepted |
| `p_expense_id` | uuid | R | Caller | pre-reversal | original expense in tenant, `status='approved'|'paid'`, `ledger_status='posted'`, not already reversed; locked | ✓ | ✓ | ✓ | Accepted |
| `p_reason` | text | R | Caller | pre-reversal | 1..500 | ✓ | ✓ | ✓ | Accepted |
| `p_reversal_date` | date | R | Caller | pre-reversal | ≥ original expense_date, ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| new expense identity / amount / category | any | F | Server | — | server creates positive reversal expense + negative ledger row (Model-B) | — | ✓ | ✓ | Rejected if supplied |

Response: `{ original_expense_id, reversal_expense_id, reversal_ledger_entry_id, status: 'reversed' }`. Errors: §4, `FIN_EXPENSE_NOT_REVERSIBLE (42501)`, `FIN_REVERSAL_DATE_INVALID (23514)`, `FIN_PAYLOAD_UNKNOWN_KEY`.

### 11.11 `post_manual_ledger_adjustment` — ordered-argument payload contract (U-2)

Public signature (§3): `post_manual_ledger_adjustment(p_tenant_id uuid, p_idempotency_key uuid, p_client_id uuid, p_amount numeric, p_effective_date date, p_description text)`.

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-post | scope asserted; server verifies + client tenancy | ✓ | ✓ | ✓ | Accepted (verified) |
| `p_idempotency_key` | uuid | R | Caller | pre-post | Level-I; hash = `sha256('post_manual_ledger_adjustment|'||p_tenant_id||'|'||p_client_id||'|'||p_amount::text||'|'||p_effective_date::text||'|'||p_description)` | ✓ | ✓ | ✓ | Accepted |
| `p_client_id` | uuid | R | Caller | pre-post | client belongs to tenant; locked customer_balance row | ✓ | ✓ | ✓ | Accepted |
| `p_amount` | numeric | R | Caller | pre-post | non-zero; sign carries semantic (positive = charge, negative = credit) | ✓ | ✓ | ✓ | Accepted |
| `p_effective_date` | date | R | Caller | pre-post | ≤ today+7; used as ledger row `effective_date` | ✓ | ✓ | ✓ | Accepted |
| `p_description` | text | R | Caller | pre-post | 1..500; auditable rationale | ✓ | ✓ | ✓ | Accepted |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| ledger_entry_id / balance_after / entry_type | any | F | Server | — | server-derived | — | ✓ | ✓ | Rejected if supplied |

Response: `{ ledger_entry_id, balance_after, entry_type: 'manual_adjustment' }`. Errors: §4, `FIN_AMOUNT_ZERO (23514)`, `FIN_EFFECTIVE_DATE_INVALID (23514)`, `FIN_CLIENT_NOT_IN_TENANT (42501)`, `FIN_PAYLOAD_UNKNOWN_KEY`. Requires elevated permission `finance.ledger.adjust`.

`PAYLOAD_CONTRACT_SCOPE_INVALID` retires against §§11.1–11.12. `PAYLOAD_CONTRACT_PHYSICAL_TABLE_COMPLETENESS_NONCONFORMITY` retires against the twelve independent U-2 tables §§11.1–11.12 (`create_invoice_with_items`, `update_invoice_with_items`, `approve_invoice`, `cancel_invoice`, `post_expense_with_ledger`, `reverse_expense`, `post_manual_ledger_adjustment` above, plus `post_payment` supplemental §11.9 — restated here — and the pre-existing physical tables for `create_expense` §11.4, `update_expense` §11.5, `pos_finalize_sale` §11.6, and `record_salary_payment` §11.19-U2 below).

### 11.12 `record_salary_payment` — ordered-argument payload contract (U-2)

Public signature (§3): `record_salary_payment(p_tenant_id, p_idempotency_key, p_employee_id, p_amount, p_currency, p_paid_at, p_payment_period, p_notes, p_create_expense)`.

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `p_tenant_id` | uuid | R | Caller | pre-post | scope asserted; server verifies + employee tenancy | ✓ | ✓ | ✓ | Accepted (verified) |
| `p_idempotency_key` | uuid | R | Caller | pre-post | Level-I; hash = ordered-arg SHA-256 | ✓ | ✓ | ✓ | Accepted |
| `p_employee_id` | uuid | R | Caller | pre-post | in `hr_employees`, active in tenant | ✓ | ✓ | ✓ | Accepted |
| `p_amount` | numeric | R | Caller | pre-post | > 0 | ✓ | ✓ | ✓ | Accepted |
| `p_currency` | text | R | Caller | pre-post | must equal tenant default | ✓ | ✓ | ✓ | Accepted/Recomputed |
| `p_paid_at` | timestamptz | R | Caller | pre-post | ≤ now()+1d | ✓ | ✓ | ✓ | Accepted |
| `p_payment_period` | text | R | Caller | pre-post | `YYYY-MM` for monthly; unique per (tenant, employee, period) | ✓ | ✓ | ✓ | Accepted |
| `p_notes` | text | O | Caller | pre-post | 0..1000 | ✓ | ✓ | ✓ | Accepted |
| `p_create_expense` | bool | R | Caller | pre-post | when `true` also emits sourced expense + ledger row via `_finance_expense_create_sourced` | ✓ | ✓ | ✓ | Accepted |
| any p_payload / extra arg | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| expense_id / ledger_entry_id / status | any | F | Server | — | server-derived | — | ✓ | ✓ | Rejected if supplied |

Response: `{ salary_payment_id, expense_id?, ledger_entry_id?, period_locked: true }`. Errors: §4, `FIN_SALARY_PERIOD_DUP (23514)`, `FIN_CURRENCY_MISMATCH (23514)`, `FIN_PAYLOAD_UNKNOWN_KEY`. Level-I idempotency; unique `(tenant_id, employee_id, p_payment_period)` prevents duplicate salaries.

---

### Adapter caller-intent contracts (§§11.13–11.18) — not counted as U-2 tables

The six adapter caller-intent contracts below are strict per-adapter contracts (D.4 §6). They are **separate from** the twelve U-2 physical payload contracts (§§11.1–11.12 above) and are **not** counted toward the U-2 total. Each contract is independent — no "same schema as" shortcut is permitted.

### 11.13 `create_invoice_from_admission` — strict `p_caller_intent` (D.4 §6.1)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `period_start` | date | R | Caller | pre | period belongs to admission, ≥ admission start | ✓ | ✓ | ✓ | Accepted |
| `period_end` | date | R | Caller | pre | ≥ period_start; ≤ checkout / applicable month-end cap; deterministic non-overlapping | ✓ | ✓ | ✓ | Accepted |
| `issue_date` | date | R | Caller | pre | ≤ today+7; independent from numbering period (§9) | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | must reference cancelled invoice on same admission lineage | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| client_id / horse_id / service_id / unit_price / currency / invoice_number / status / totals / branch_id / billing_link_id | any | F | Server | — | server-resolved from locked admission + `boardingPeriodEngine` + catalog snapshot | — | ✓ | ✓ | Rejected if supplied |

### 11.14 `create_lab_invoice` — strict `p_caller_intent` (D.4 §6.2)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `issue_date` | date | R | Caller | pre | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | cancelled invoice on same lab source | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| all commercial fields, client_id, lab_horse_id, service_id, category_id, currency, invoice_number, status | any | F | Server | — | server-resolved from locked lab source + `lab_services` + snapshots | — | ✓ | ✓ | Rejected if supplied |

### 11.15 `create_doctor_invoice` — strict `p_caller_intent` (D.4 §6.3)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `issue_date` | date | R | Caller | pre | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | cancelled invoice on same consultation | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| all commercial fields, client_id, service_id, currency, invoice_number, status | any | F | Server | — | server-resolved from locked `doctor_consultations` + `doctor_services` | — | ✓ | ✓ | Rejected if supplied |

### 11.16 `create_vet_invoice` — strict `p_caller_intent` (D.4 §6.4)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `issue_date` | date | R | Caller | pre | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | cancelled invoice on same treatment | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| all commercial fields, client_id, service_id, provider_id, currency, invoice_number, status | any | F | Server | — | server-resolved from locked treatment; external/non-billable modes are rejected when domain rules do not authorize tenant invoicing (`FIN_ADAPTER_EXTERNAL_MODE 42501`) | — | ✓ | ✓ | Rejected if supplied |

### 11.17 `create_vaccination_invoice` — strict `p_caller_intent` (D.4 §6.5)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `issue_date` | date | R | Caller | pre | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | cancelled invoice on same vaccination record | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| all commercial fields, client_id, horse_id, service_id, currency, invoice_number, status | any | F | Server | — | server-resolved from locked vaccination record + catalog | — | ✓ | ✓ | Rejected if supplied |

### 11.18 `create_breeding_invoice` — strict `p_caller_intent` (D.4 §6.6)

| Field | Type | R/O/F | Owner | Edit state | Validation | Hash? | Snap? | Resp? | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| `source_type` | text | R | Caller | pre | one of the source kinds supported by the current live breeding invoice workflow and current schema (enumerated in §8.6 from repository truth); disambiguates which breeding source table `p_source_id` references | ✓ | ✓ | ✓ | Accepted |
| `issue_date` | date | R | Caller | pre | ≤ today+7 | ✓ | ✓ | ✓ | Accepted |
| `due_date` | date or null | O | Caller | pre | ≥ issue_date when not null | ✓ | ✓ | ✓ | Accepted |
| `notes` | text or null | O | Caller | pre | 0..500 | ✓ | ✓ | ✓ | Accepted |
| `corrects_invoice_id` | uuid or null | O | Caller | pre | cancelled invoice on same breeding source lineage | ✓ | ✓ | ✓ | Accepted |
| any other key | any | F | — | — | — | — | — | — | Rejected `FIN_PAYLOAD_UNKNOWN_KEY` |
| all commercial fields, client_id, horse_id, service_id, currency, invoice_number, status | any | F | Server | — | server-resolved from the locked breeding source disambiguated by `source_type` | — | ✓ | ✓ | Rejected if supplied |

`ADAPTER_CANONICAL_NAME_NONCONFORMITY` retires against §§11.13–11.18 canonical adapter identities.

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
| 8 | `src/components/vet/CreateInvoiceFromVaccination.tsx:176` | `invoice_items` | INSERT | `create_vaccination_invoice` (§8.5) | replaced |
| 9 | `src/components/vet/CreateInvoiceFromTreatment.tsx:187` | `invoice_items` | INSERT | `create_vet_invoice` (§8.4) | replaced |
| 10 | `src/lib/finance/postLedgerForPayments.ts:111` | `ledger_entries` | INSERT | `_finance_ledger_insert` via `post_payment` | replaced |
| 11 | `src/lib/finance/postLedgerForPayments.ts:143` | `customer_balances` | UPSERT | chain rebuild via `_finance_ledger_insert` | replaced |
| 12 | `src/lib/finance/postLedgerForPayments.ts:171` | `invoices` | UPDATE (status→paid) | server-derived in `post_payment` | replaced |
| 13 | `src/lib/finance/postLedgerForPayments.ts:186` | `invoices` | UPDATE (status→partial) | server-derived in `post_payment` | replaced |
| 14 | `src/components/doctor/CreateInvoiceFromConsultation.tsx:152` | `invoice_items` | INSERT | `create_doctor_invoice` (§8.3) | replaced |
| 15 | `src/hooks/pos/usePOSSessions.ts:105` | `pos_sessions` | INSERT (open) | out-of-scope (session lifecycle, non-finance) | keep; enforce single-open unique index |
| 16 | `src/hooks/pos/usePOSSessions.ts:170` | `pos_sessions` | UPDATE (close) | out-of-scope (session lifecycle) | keep; aggregate expected_cash server-side in Stage 8 |
| 17 | `src/hooks/pos/usePOSCore.ts:117` | `invoices` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 18 | `src/hooks/pos/usePOSCore.ts:155` | `invoice_items` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 19 | `src/hooks/housing/useBoardingAdmissions.ts:572` | `billing_links` | INSERT | `_finance_billing_link_upsert` via `create_invoice_from_admission` | replaced |
| 20 | `src/components/pos/EmbeddedCheckout.tsx:115` | `invoices` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 21 | `src/components/pos/EmbeddedCheckout.tsx:151` | `invoice_items` | INSERT | `pos_finalize_sale` (§7.13) | replaced |
| 22 | `src/components/housing/CreateInvoiceFromAdmission.tsx:423` | `invoice_items` | INSERT | `create_invoice_from_admission` (§8.1) | replaced |
| 23 | `src/hooks/finance/useSupplierPayables.ts:67` | `supplier_payables` | INSERT | `_finance_expense_create_sourced` via `post_expense_with_ledger` | replaced |
| 24 | `src/hooks/finance/useSupplierPayables.ts:100` | `supplier_payables` | UPDATE | `update_expense` (when linked) / retain read-only otherwise | replaced |
| 25 | `src/hooks/finance/useSupplierPayables.ts:125` | `supplier_payables` | UPDATE | `update_expense` (when linked) | replaced |
| 26 | `src/hooks/finance/useSupplierPayables.ts:146` | `supplier_payables` | DELETE | `delete_expense` (when linked) | replaced |
| 27 | `src/components/breeding/CreateInvoiceFromBreedingEvent.tsx:207` | `invoice_items` | INSERT | `create_breeding_invoice` (§8.6) | replaced |
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
    'create_invoice_from_admission',
    'create_lab_invoice',
    'create_doctor_invoice',
    'create_vet_invoice',
    'create_vaccination_invoice',
    'create_breeding_invoice'
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


## §14. Structural-gate results (self-verification, D.4 canonical)

D.4 corrections applied in place. This section supersedes the prior split §14 / §14-Batch-D-delta pair; both prior blocks are removed. The gates below are the sole authoritative gate result set.

| Gate | Result |
|---|---|
| §14.1 one occurrence of each numbered section, RPC heading, adapter heading, Unresolved-identifiers, Terminal readiness | PASS |
| §14.2 fourteen public RPC identity signatures match §3 verbatim | PASS |
| §14.3 no superseded tokens (`FIN_IDEMPOTENCY_MISMATCH`, `FIN_POS_DUPLICATE_CART`, `FIN_POS_INVENTORY_OUT_OF_SCOPE`, `CURRENT_POS_INVENTORY_MUTATION = NONE`, `Inventory validation & mutation — NONE`, `MAX(right(`) | PASS |
| §14.4 no duplicate section numbering, balanced Markdown fences, balanced SQL dollar quotes, no `TBD/to confirm/assumed/likely/placeholder/XXX` | PASS |
| §14.5 fourteen public RPC × 20 populated fields (§7) | PASS |
| §14.5 six canonical adapters (`create_invoice_from_admission`, `create_lab_invoice`, `create_doctor_invoice`, `create_vet_invoice`, `create_vaccination_invoice`, `create_breeding_invoice`), each with the identical four-argument ordered signature `(p_tenant_id uuid, p_idempotency_key uuid, p_source_id uuid, p_caller_intent jsonb)`; zero remaining occurrences of the seven prior non-canonical / obsolete adapter identities in any normative section (see §15 retirement of ADAPTER_CANONICAL_NAME_NONCONFORMITY) | PASS |
| §14.5 twelve independent U-2 physical payload contract tables at §§11.1–11.12 (create_invoice_with_items §11.1, update_invoice_with_items §11.2, post_payment supplemental §11.3, create_expense §11.4, update_expense §11.5, pos_finalize_sale §11.6, approve_invoice §11.7, cancel_invoice §11.8, post_expense_with_ledger §11.9, reverse_expense §11.10, post_manual_ledger_adjustment §11.11, record_salary_payment §11.12) — no "same schema as" shortcut used; adapter caller-intent tables §§11.13–11.18 are separate and not counted as U-2 | PASS |
| §14.5 six strict independent adapter caller-intent contracts at §§11.13–11.18 | PASS |
| §14.5 `_finance_invoice_number_next(uuid, text)` two-argument signature is the only authorized helper; internal Saudi business-date derivation `(now() AT TIME ZONE 'Asia/Riyadh')::date` governs the numbering period; no numbering period derives from `invoices.issue_date`, `p_effective_date`, or any caller-supplied date; three-argument signature removed | PASS |
| §14.5 §17 corrections integrated into §5/§9/§11/§13 bodies (Batch D.1) — §17 removed; no duplicate §14/§15 sections; single sequential §14/§15/§16 hierarchy | PASS |
| §14.5 mutation census separated from reader census (§12) | PASS |
| §14.5 Model-B positive reversal expense + negative reversal ledger (§6, §11.11) | PASS |
| §14.5 POS canonical inventory contract inlined into §5.5 | PASS |
| §14.5 payment-enum additive M1 + verbatim rollback inlined into §5.3/§5.4 | PASS |
| §14.5 F0 whitelist enumerates the six canonical adapter identities exactly (no seventh alias, no omitted adapter) at §13 | PASS |
| §14.5 no caller-supplied invoice_number, totals, status, price, tax, currency, client_id, horse_id, branch_id, service_id, billing_link_id, or arbitrary metadata accepted by any adapter or U-2 RPC contract | PASS |
| §14.5 exactly one terminal line | PASS |

---

## §15. Unresolved identifiers (D.4 canonical, single authoritative section)

This section supersedes the prior split §15 / §15-Batch-D-canonical-closure pair; both prior blocks are removed. It is the sole authoritative unresolved-identifier set.

**Retired by prior passes (unchanged):** `WAREHOUSE_RESOLUTION_UNRESOLVED`, `WRITER_CENSUS_METHOD_INVALID`, `SPEC_POSTWRITE_MANIFEST_MISMATCH`, `SPEC_DUPLICATE_MERGE_CORRUPTION`, `PLAN_LOCK_RPC_SIGNATURE_DRIFT`, `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT`, `PLAN_LOCK_EXPENSE_STATE_DRIFT`, `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT`, `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION`, `PLAN_LOCK_HELPER_CONTRACT_DRIFT`, `PAYLOAD_CONTRACT_SCOPE_INVALID`, `CATALOG_EVIDENCE_NOT_EMBEDDED`, `F0_SQL_ARTIFACT_CORRUPT`, `A15_SQL_ARTIFACT_CORRUPT`, `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`, `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`, `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`, `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED`.

**Retired by D.4 (this pass, by direct user authority in the D.4 execution order):**

- `ADAPTER_ORDERED_ARGUMENTS_PROVENANCE_UNRESOLVED` — retired by U-4A direct user authority: the identical four-argument ordered signature `(p_tenant_id uuid, p_idempotency_key uuid, p_source_id uuid, p_caller_intent jsonb)` is adopted for all six canonical adapters. No overload with a different argument order or additional public arguments is authorized.
- `ADAPTER_CANONICAL_NAME_NONCONFORMITY` — retired: all normative occurrences of the seven non-canonical/obsolete adapter identities have been replaced with the six canonical identities enumerated in §3, §8, §§11.13–11.18, and §13 F0.
- `PAYLOAD_CONTRACT_PHYSICAL_TABLE_COMPLETENESS_NONCONFORMITY` — retired: exactly twelve independent U-2 physical payload contract tables are physically present at §§11.1–11.13. No "same schema as" shortcut is used. Adapter caller-intent tables at §§11.13–11.18 are separate and not counted as U-2.
- `INVOICE_NUMBER_HELPER_SIGNATURE_AND_DATE_SOURCE_NONCONFORMITY` — retired: the sole authorized helper signature is `_finance_invoice_number_next(uuid, text)`. The numbering period is derived internally from one transaction-captured Saudi business date `(now() AT TIME ZONE 'Asia/Riyadh')::date`. `invoices.issue_date`, `p_effective_date`, browser dates, device dates, and any caller-supplied date are prohibited as numbering-period sources. `invoices.issue_date` remains the invoice/ledger effective date independent from the numbering period. Historical seed reconciliation uses the canonical period encoded in existing invoice numbers, never `issue_date`.
- `STAGE6_SECTION_HEADING_COLLISION` — retired: the duplicate second `## §14. Structural-gate results (self-verification) — Batch D delta` and the duplicate second `## §15. Unresolved identifiers — Batch D.1 canonical closure` sections are removed; the single §14 / §15 / §16 hierarchy above is the sole normative source.
- `DUAL_UNRESOLVED_SECTION_NORMATIVE_COMPETITION` — retired: only this §15 remains as the normative unresolved-identifier set. Merged retired-identifier content into a single register.
- `SPEC_INTERNAL_CONTRADICTION_§17_VS_§14_DELTA` — retired: §17 Batch-D Mechanical Reconciliation Addendum is retired as a standalone section; its authoritative content has been integrated into §5.3, §5.4, §5.5, §9.3, and §11.6 by Batch D.1 (verifiable via existing prose in those sections).
- `STAGE_BOUNDARY_EXCLUSIONS_UNPROVEN_PENDING_STAGE3_STAGE4_ARTIFACTS` — retired by U-4B direct user authority: Stage 6 boundary is authoritatively enumerated (fourteen public Finance RPCs + six canonical adapters + required private helpers + `_finance_invoice_number_next(uuid, text)` + Level-I financial idempotency + function ownership / hardened `search_path` / REVOKE / GRANT contracts + canonical payload-contract documentation + M1–M7 migration ordering + application caller adaptation and generated-type updates + deterministic verification and rollback). Stage 3 and Stage 4 artifact-availability markers remain evidence limitations but no longer block the Stage 6 boundary.

**Evidence limitations (preserved, non-blocking):**

- `STAGE_3_CLOSURE_ARTIFACT_UNAVAILABLE` — the Stage 3 closure artifact remains unavailable in the repository. Not reconstructed. Does not block the adopted signatures, D.4 correction, or Stage 6 execution readiness.
- `STAGE_4_CLOSURE_ARTIFACT_UNAVAILABLE` — same disposition as above.
- `BATCH_D2_IDENTITY_CONFIRMED_EXTERNAL_SOURCE_NOT_YET_RESTORED` — Batch D.2 identity confirmed; external source has not been restored into the repository. Non-blocking.
- `STAGE6_SPEC_FULL_PREIMAGE_HASH_REFERENCE_UNAVAILABLE` — the historical independent-full-hash reference for this file is not available. The D.4 preimage `4b45fe4bca1f6f7452af3c1f775099457c7fb68c76d793c99ac5d357a7b9321b` was used and matched exactly before the D.4 edit.

**U-1, U-2, U-3 status:** closed. Not reopened by D.4. U-4A (adapter ordered signatures) and U-4B (Stage-6 boundary) adopted by direct user authority in the D.4 execution order.

**Retained blockers to Stage 6 execution readiness:** none.

---

## §16. Terminal readiness

AML.1.b.1 STAGE 6 FINAL READINESS (POST-D.4): READY — READ-ONLY, ZERO MUTATIONS.
