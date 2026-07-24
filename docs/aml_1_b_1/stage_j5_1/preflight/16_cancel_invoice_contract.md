# File 16 — Canonical Invoice Cancellation Contract

**Subphase**: N+1B · J5.1A.2-PREFLIGHT-CANCEL-EXECUTION
**Scope**: SELECT-only capture of `public.cancel_invoice(uuid,uuid,uuid,date,text)` behavior. Unblocks T1 Case 16.10 only. No `cancel_invoice` invocation was performed. No migration, no writes, no permission edit, no frontend/type changes, no retail POS work, no N+4 refund/reversal/credit-note implementation.

---

## A. Function Signature and Full Body

Query:
```sql
SELECT p.oid::regprocedure, l.lanname, p.provolatile, p.prosecdef,
       pg_get_userbyid(p.proowner) AS owner, p.proconfig
FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
WHERE p.oid = 'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure;
```

Result (`|`-separated):
```
cancel_invoice(uuid,uuid,uuid,date,text)|plpgsql|v|t|postgres|{"search_path=\"\""}
```

- **Signature** (positional): `public.cancel_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date, p_reason text)`
- **Return type**: `jsonb`
- **Language**: `plpgsql`
- **Volatility**: `v` (VOLATILE)
- **SECURITY DEFINER**: `true`
- **Owner**: `postgres`
- **proconfig / search_path**: `search_path=""` (empty; all identifiers must be schema-qualified inside the body — the body honors this by using `public.*` and `pg_catalog`-free logic under an empty search path via the standard SQL surface).

Full body captured with:
```sql
SELECT pg_get_functiondef('public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure);
```

```sql
CREATE OR REPLACE FUNCTION public.cancel_invoice(p_tenant_id uuid, p_idempotency_key uuid, p_invoice_id uuid, p_effective_date date, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_op text := 'cancel_invoice';
  v_replay boolean;
  v_hash bytea;
  v_stored jsonb;
  v_inv record;
  v_reason text := NULLIF(btrim(p_reason), '');
  v_invoice_ledger_id uuid;
  v_invoice_ledger_amount numeric;
  v_invoice_ledger_client_id uuid;
  v_reversal_id uuid;
  v_balance_after numeric;
  v_snapshot jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'FIN_UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR p_idempotency_key IS NULL OR p_invoice_id IS NULL
     OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'FIN_BAD_ARGS' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'FIN_REASON_INVALID' USING ERRCODE = '23514';
  END IF;
  IF NOT public.is_active_tenant_member(v_actor, p_tenant_id) THEN
    RAISE EXCEPTION 'FIN_TENANT_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_permission(v_actor, p_tenant_id, 'finance.invoice.cancel') THEN
    RAISE EXCEPTION 'FIN_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT is_replay, request_hash, stored_response
  INTO v_replay, v_hash, v_stored
  FROM public._finance_idempotency_begin(
    p_tenant_id,
    v_op,
    p_idempotency_key,
    v_actor,
    jsonb_build_object('tenant_id', p_tenant_id, 'invoice_id', p_invoice_id),
    jsonb_build_object('effective_date', p_effective_date, 'reason', v_reason)
  );
  IF v_replay THEN
    RETURN v_stored;
  END IF;

  PERFORM pg_advisory_xact_lock(
    public._finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)
  );

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_inv.status = 'draft' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: use delete_draft_invoice'
      USING ERRCODE = '42501';
  END IF;
  IF v_inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: already cancelled'
      USING ERRCODE = '42501';
  END IF;
  IF v_inv.status IN ('partial', 'paid') OR EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE tenant_id = p_tenant_id
      AND reference_type = 'invoice'
      AND reference_id = p_invoice_id
      AND entry_type = 'payment'
  ) OR EXISTS (
    SELECT 1
    FROM public.payment_intents
    WHERE tenant_id = p_tenant_id
      AND reference_type = 'invoice'::public.payment_reference_type
      AND reference_id = p_invoice_id
      AND status::text IN ('pending', 'paid')
  ) THEN
    RAISE EXCEPTION 'FIN_INVOICE_NOT_CANCELLABLE: payments exist'
      USING ERRCODE = '42501';
  END IF;
  IF p_effective_date < v_inv.issue_date
     OR p_effective_date > ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7) THEN
    RAISE EXCEPTION 'FIN_EFFECTIVE_DATE_INVALID' USING ERRCODE = '23514';
  END IF;

  SELECT id, amount, client_id
  INTO v_invoice_ledger_id, v_invoice_ledger_amount, v_invoice_ledger_client_id
  FROM public.ledger_entries
  WHERE tenant_id = p_tenant_id
    AND entry_type = 'invoice'
    AND reference_type = 'invoice'
    AND reference_id = p_invoice_id
    AND amount > 0
  LIMIT 1;

  IF v_invoice_ledger_id IS NOT NULL THEN
    SELECT id INTO v_reversal_id
    FROM public.ledger_entries
    WHERE entry_type = 'adjustment'
      AND reference_type = 'invoice_cancellation'
      AND reference_id = p_invoice_id
    LIMIT 1;

    IF v_reversal_id IS NULL THEN
      SELECT ledger_entry_id, balance_after
      INTO v_reversal_id, v_balance_after
      FROM public._finance_ledger_insert(
        p_tenant_id,
        v_invoice_ledger_client_id,
        'adjustment',
        'invoice_cancellation',
        p_invoice_id,
        -v_invoice_ledger_amount,
        p_effective_date,
        'Cancellation of ' || v_inv.invoice_number || ' — ' || v_reason,
        NULL,
        NULL,
        jsonb_build_object(
          'invoice_number', v_inv.invoice_number,
          'reverses_ledger_entry_id', v_invoice_ledger_id,
          'reason', v_reason,
          'via', 'cancel_invoice'
        ),
        v_actor
      );
    END IF;
  ELSIF COALESCE(v_inv.total_amount, 0) > 0
        AND v_inv.status IN ('approved', 'overdue') THEN
    RAISE EXCEPTION 'FIN_INVOICE_LEDGER_MISSING' USING ERRCODE = '42501';
  END IF;

  UPDATE public.invoices
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_invoice_id;

  v_snapshot := jsonb_build_object(
    'invoice_id', p_invoice_id,
    'invoice_number', v_inv.invoice_number,
    'status', 'cancelled',
    'reversal_ledger_entry_id', v_reversal_id,
    'balance_after', v_balance_after,
    'effective_date', p_effective_date,
    'reason', v_reason
  );

  PERFORM public._finance_idempotency_complete(
    p_tenant_id, v_op, p_idempotency_key, v_actor, v_hash,
    v_snapshot, v_snapshot
  );
  RETURN v_snapshot;
END
$function$
```

---

## B. ACL and Grants

Raw `proacl`:
```
{postgres=X/postgres,sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,sandbox_exec=X/postgres,authenticated=X/postgres}
```

Decoded EXECUTE grants:

| Grantee | EXECUTE |
| --- | --- |
| `postgres` (owner) | yes |
| `sandbox_exec_*` (platform-internal) | yes |
| `authenticated` | **yes** |
| `anon` | **no** |
| `service_role` | **no** (not enumerated in proacl; `has_function_privilege` returned `false`) |
| `PUBLIC` | **no** |

Verification (`has_function_privilege`):
```
authenticated=t, anon=f, service_role=f, public=f
```

Public caller path: `authenticated` role only. `SET LOCAL ROLE authenticated` + `request.jwt.claims.sub = <actor>` is the sole T1-legal invocation surface.

---

## C. Authentication and Permission Contract

Order of gates (from body):

1. `v_actor := auth.uid()`; if `NULL` → `FIN_UNAUTHENTICATED` / SQLSTATE `42501`.
2. NULL guard on `p_tenant_id`, `p_idempotency_key`, `p_invoice_id`, `p_effective_date` → `FIN_BAD_ARGS` / SQLSTATE `22023`.
3. `v_reason := NULLIF(btrim(p_reason), '')`; if `NULL` or `char_length > 500` → `FIN_REASON_INVALID` / SQLSTATE `23514`.
4. `public.is_active_tenant_member(v_actor, p_tenant_id)` → `FIN_TENANT_ACCESS_DENIED` / SQLSTATE `42501` on false.
5. `public.has_permission(v_actor, p_tenant_id, 'finance.invoice.cancel')` → `FIN_PERMISSION_DENIED` / SQLSTATE `42501` on false.

Permission definition exists (`SELECT ... FROM permission_definitions WHERE key='finance.invoice.cancel'`):
```
key                    | module  | resource | action | display_name
finance.invoice.cancel | finance | invoice  | cancel | Cancel Invoices
```

`public.has_permission` short-circuits on `tenant_members.role = 'owner'` **before** consulting `member_permissions`, `tenant_role_permissions`, or bundles. To deny an owner in a negative test, the T2 SAVEPOINT-demotion recipe from File 15 is required.

Fixed identity proof (SELECT-only):
```sql
SELECT id, role, is_active
FROM tenant_members
WHERE user_id = '98439fe8-6881-4e9e-8ff6-18aca0ce4470'
  AND tenant_id = '145f2128-83ca-4ba8-85b5-8ade245c5530';
-- 87c2f5e6-76c9-450b-9e39-9ee64ea321fb | owner | t

SELECT public.has_permission(
  '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid,
  '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid,
  'finance.invoice.cancel');
-- t

SELECT public.is_active_tenant_member(
  '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid,
  '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid);
-- t
```

Fixed actor may invoke `cancel_invoice` on the primary tenant.

---

## D. Idempotency Contract

- **Idempotency-key argument**: `p_idempotency_key` (positional #2).
- **Operation string**: `'cancel_invoice'`.
- **Source JSON** (Level-I header stored into `finance_request_idempotency.request_hash` domain):
  ```json
  { "tenant_id": "<uuid>", "invoice_id": "<uuid>" }
  ```
- **Intent JSON**:
  ```json
  { "effective_date": "YYYY-MM-DD", "reason": "<trimmed non-empty>" }
  ```
- **Helper calls**:
  - `public._finance_idempotency_begin(p_tenant_id, 'cancel_invoice', p_idempotency_key, v_actor, source, intent)` — returns `(is_replay, request_hash, stored_response)`. When `is_replay = true` the function **returns `stored_response` immediately** without acquiring the source lock or touching `invoices` / `ledger_entries`.
  - `public._finance_idempotency_complete(p_tenant_id, 'cancel_invoice', p_idempotency_key, v_actor, v_hash, v_snapshot, v_snapshot)` — commits the stored response snapshot after successful cancellation.
- **Conflict / in-progress behavior** (per File 15 §D + `_finance_idempotency_begin` body):
  - Same key + same actor + **same** hash + prior `response IS NULL` → `FIN_IDEMPOTENCY_IN_PROGRESS` (SQLSTATE `40001`).
  - Same key + **different** actor → `FIN_IDEMPOTENCY_ACTOR_MISMATCH` (SQLSTATE `42501`).
  - Same key + **different** request hash (changed `p_invoice_id`, `p_effective_date`, or `p_reason`) → `FIN_IDEMPOTENCY_CONFLICT` (SQLSTATE `23514`).
  - Same key + expired row (`> 7 days`) → row is silently re-armed; not a conflict.

---

## E. Eligible Invoice Status Matrix

Derived mechanically from body branches:

| `invoices.status` | Accepted? | Exact result / error |
| --- | --- | --- |
| `draft` | No | `FIN_INVOICE_NOT_CANCELLABLE: use delete_draft_invoice` / SQLSTATE `42501` |
| `issued` | Yes (if no payment ledger row + no pending/paid payment_intent) | Same happy path as `approved` |
| `reviewed` | Yes (same conditions) | Happy path |
| `approved` | **Yes** (payments-existence guard must pass) | Happy path — inserts adjustment reversal, sets status `cancelled` |
| `shared` | Yes (same conditions) | Happy path |
| `sent` | Yes (same conditions) | Happy path |
| `overdue` | Yes (same conditions) | Happy path; also triggers `FIN_INVOICE_LEDGER_MISSING` when total>0 but no invoice ledger row |
| `partial` | No | `FIN_INVOICE_NOT_CANCELLABLE: payments exist` / SQLSTATE `42501` |
| `paid` | No | `FIN_INVOICE_NOT_CANCELLABLE: payments exist` / SQLSTATE `42501` |
| `cancelled` | No | `FIN_INVOICE_NOT_CANCELLABLE: already cancelled` / SQLSTATE `42501` |

Additionally, any status above that has an `entry_type='payment'` `ledger_entries` row **or** a `payment_intents` row with `status ∈ ('pending','paid')` is rejected with `FIN_INVOICE_NOT_CANCELLABLE: payments exist`.

**T1 target state — approved + `payment_method='debt'` + `payment_received_at IS NULL` + zero payment ledger rows + no pending/paid payment_intents — is cancellable.** No blocker.

---

## F. Cancellation Date and Reason Contract

- `p_effective_date`:
  - Required (`NULL` → `FIN_BAD_ARGS` / `22023`).
  - Must satisfy `p_effective_date >= invoices.issue_date` **and** `p_effective_date <= ((now() AT TIME ZONE 'Asia/Riyadh')::date + 7)`. Violations → `FIN_EFFECTIVE_DATE_INVALID` / SQLSTATE `23514`.
  - Becomes the `ledger_entries.effective_date` of the adjustment reversal (see §G).
  - Riyadh business-date handling is baked into the upper bound only; the lower bound uses the raw `issue_date`.
- `p_reason`:
  - Required.
  - Normalized via `NULLIF(btrim(p_reason), '')` → whitespace-only or empty strings are rejected.
  - Maximum length after trim: 500 characters.
  - Violation → `FIN_REASON_INVALID` / SQLSTATE `23514`.

Safe deterministic T1 values (documented only; **not** executed):

- `p_effective_date := (now() AT TIME ZONE 'Asia/Riyadh')::date`
- `p_reason := 'T1 canonical cancellation for Case 16.10'`

---

## G. Approved Unpaid Debt Cancellation — Effects

Given a target invoice in state `approved / debt / payment_received_at IS NULL / zero payment ledger / no pending or paid payment_intents / total_amount > 0`:

| Surface | Effect |
| --- | --- |
| `invoices.status` | `UPDATE ... SET status='cancelled'` |
| `invoices.updated_at` | Refreshed to `now()` |
| `invoices.payment_method` | **Preserved** (not written) — remains `'debt'` |
| `invoices.payment_received_at` | **Preserved** (not written) — remains `NULL` |
| `invoice_items` | **Untouched** (no INSERT/UPDATE/DELETE) |
| `billing_links` | **Untouched** (see §I) |
| Existing invoice ledger row (`entry_type='invoice'`, `reference_type='invoice'`, `amount>0`) | **Preserved**; its `id`, `amount`, and `client_id` are read via `FOR UPDATE`-adjacent `SELECT ... LIMIT 1` and referenced from the reversal |
| Payment ledger rows | Guard-rejected upstream; none exist and none are created |

**Reversal ledger row** (inserted exactly once via `public._finance_ledger_insert`, idempotent on re-entry via lookup of any existing `entry_type='adjustment' / reference_type='invoice_cancellation' / reference_id=p_invoice_id` row before insert):

| Column | Value |
| --- | --- |
| `tenant_id` | `p_tenant_id` |
| `client_id` | `v_invoice_ledger_client_id` (the client id from the original invoice ledger row) |
| `entry_type` | `'adjustment'` |
| `reference_type` | `'invoice_cancellation'` |
| `reference_id` | `p_invoice_id` |
| `amount` | `-v_invoice_ledger_amount` (negative of the original invoice ledger amount) |
| `effective_date` | `p_effective_date` |
| `description` | `'Cancellation of ' || v_inv.invoice_number || ' — ' || v_reason` |
| `payment_method` | `NULL` |
| `payment_session_id` | `NULL` |
| `metadata` | `{ "invoice_number": <string>, "reverses_ledger_entry_id": <uuid>, "reason": <string>, "via": "cancel_invoice" }` |
| `created_by` | `v_actor` |

`_finance_ledger_insert` additionally recomputes running `balance_after` for every ledger row of `(tenant_id, client_id)` and upserts `customer_balances (tenant_id, client_id) → (balance, currency, last_updated=now())`. That is the sole `customer_balances` effect.

`v_reversal_id` and `v_balance_after` from that insert populate the response snapshot.

**Edge branch**: when `v_invoice_ledger_id IS NULL` (no invoice ledger row) **and** `v_inv.total_amount > 0` **and** `v_inv.status ∈ ('approved','overdue')` → `FIN_INVOICE_LEDGER_MISSING` / SQLSTATE `42501`. This should not fire for T1 Case 16.10 because the source-checkout writer inserts the invoice ledger row as part of approval; Case 16.10 must assert the invoice ledger row exists as a pre-cancellation invariant.

No record is ever deleted.

---

## H. Ledger and Customer-Balance Effects

Summarized from §G:

- Exactly one new `ledger_entries` row of `entry_type='adjustment'`, `reference_type='invoice_cancellation'`, `reference_id=p_invoice_id`, `amount=-v_invoice_ledger_amount`, `effective_date=p_effective_date`.
- Zero `payment` ledger rows are inserted, updated, or deleted.
- The original `entry_type='invoice'` ledger row is not modified.
- `_finance_ledger_insert` recomputes and rewrites `balance_after` chronologically for all `(tenant_id, client_id)` ledger rows (this is a side-effect of the helper; not specific to cancellation).
- `customer_balances` is upserted to reflect the new running balance (`ON CONFLICT (tenant_id, client_id) DO UPDATE SET balance = EXCLUDED.balance, last_updated = now()`).
- `_finance_source_lock_key(p_tenant_id, 'invoice', p_invoice_id)` advisory-xact-lock guarantees per-invoice serialization; `_finance_ledger_insert` additionally locks per `(tenant_id, client_id)`.

---

## I. Source Billing-Link Effect

Mechanical audit of the function body: **there is no `INSERT INTO billing_links`, `UPDATE billing_links`, `DELETE FROM billing_links`, or call to `public._finance_billing_link_upsert(...)` anywhere in `cancel_invoice`.** The only writes are: one `UPDATE public.invoices SET status='cancelled', updated_at=now()`, and one `INSERT` into `public.ledger_entries` (via `_finance_ledger_insert`, plus the helper's `customer_balances` upsert). No writes to `billing_links`, `invoice_items`, or `payment_intents`.

Classification of the historical Source `billing_links` row (with `source_type ∈ {'lab_sample','horse_order'}`, `source_id`, `invoice_id=<cancelled invoice>`, `link_kind ∈ {'deposit','final'}`):

**Preserved unchanged. Not updated. Not deleted. No corrective link created.**

Cross-check with the locked J5.1A source-conflict query in `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql` (§ `create_source_checkout_invoice` conflict guard): the guard filters `billing_links` rows through `EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = bl.invoice_id AND i.status <> 'cancelled')`. Once `cancel_invoice` flips the parent invoice to `cancelled`, the historical `billing_links` row is ignored by the conflict guard even though it physically remains.

Therefore the required T1 sequence is valid end-to-end with **no** invented cancellation SQL and **no** manual `billing_links` mutation:

```
successful Source checkout
  → historical Source billing_links row exists (invoice.status='approved')
  → public.cancel_invoice(...)
  → invoice.status becomes 'cancelled'
  → historical Source billing_links row remains (bytewise identical)
  → new same-kind Source checkout succeeds
  → new billing_links row inserted pointing to the new invoice
  → post-condition: exactly 2 billing_links rows for (tenant, source, link_kind);
    exactly 1 references a non-cancelled invoice.
```

**T1 blocker verdict**: none.

---

## J. Dependency Graph

Direct dependencies invoked by `cancel_invoice`:

| Called function | Signature | Purpose in cancellation | Reused unchanged? |
| --- | --- | --- | --- |
| `auth.uid()` | `() → uuid` | Identify caller | Yes |
| `public.is_active_tenant_member(uuid, uuid)` | `(_user_id, _tenant_id) → boolean` | Membership gate | Yes |
| `public.has_permission(uuid, uuid, text)` | `(_user_id, _tenant_id, _permission_key) → boolean` | Permission gate (owner short-circuits before override/role/bundle lookup) | Yes |
| `public._finance_idempotency_begin(uuid, text, uuid, uuid, jsonb, jsonb)` | Level-I idempotency arm; returns `(is_replay, request_hash, stored_response)` | Idempotency | Yes |
| `public._finance_idempotency_complete(uuid, text, uuid, uuid, bytea, jsonb, jsonb)` | Commit stored response | Idempotency | Yes |
| `pg_advisory_xact_lock(bigint)` | Postgres builtin | Per-invoice serialization | Yes |
| `public._finance_source_lock_key(uuid, text, uuid)` | `(tenant, source_type, source_id) → bigint` | Compute advisory lock key using `source_type='invoice'` | Yes |
| `public._finance_ledger_insert(uuid, uuid, text, text, uuid, numeric, date, text, text, uuid, jsonb, uuid)` | Insert ledger row + recompute running balance + upsert `customer_balances` | Insert reversal adjustment | Yes |

Not called: `public._finance_billing_link_upsert`, `public._finance_invoice_compute_totals`, `public._finance_invoice_payload_reject_unknown`, `public.post_payment`, POS helpers. No new helpers are proposed.

---

## K. Existing Callers and Tests

Repository scan (`rg 'cancel_invoice|cancelInvoice|finance\.invoice\.cancel' . -g '!node_modules' -g '!dist' -g '!.git'`):

**Runtime caller** (single):
- `src/lib/finance/invoiceRpc.ts` (lines 99–115) — `cancelInvoiceRpc(tenantId, invoiceId, effectiveDate, reason, idempotencyKey = crypto.randomUUID())` — calls `supabase.rpc('cancel_invoice', { p_tenant_id, p_idempotency_key, p_invoice_id, p_effective_date, p_reason })`. Named-arg style; PostgREST reorders to positional per the signature captured in §A. `effectiveDate` is an ISO `YYYY-MM-DD` string; `reason` is a plain, trimmed, non-empty string; `idempotencyKey` defaults to a fresh random UUID per caller invocation.

**Existing SQL tests**:
- `supabase/tests/database/n2_5_invoice_catalog_runtime.test.sql` — catalog-level assertions only (signature exists, `SECURITY DEFINER`, empty search_path, owner=`postgres`, `authenticated` has EXECUTE, `anon` does not, body contains `'invoice_cancellation'` and `'adjustment'` literals). Does **not** execute `cancel_invoice`.
- `supabase/tests/database/j5_1_source_checkout.test.sql` — placeholder header for Case 3.10 (line 158 `-- Case 3.10 Cancel prior linked invoice via cancel_invoice, then same-kind checkout is permitted again (no conflict).`). No executable body yet; T1 will supply it.

**i18n**: `src/i18n/locales/en.ts` `cancelInvoiceDesc: "This will void the invoice and reverse its financial effect. This action cannot be undone."` — matches captured semantics (reverse via adjustment ledger row; no destructive deletion).

**Migration source of truth**: `supabase/migrations/20260722213000_aml_1_b_1_n2_5_invoice_rpc_runtime_wiring.sql` (§7.5) and its re-authored twin `20260722221337_c0f5ee79-0942-496d-812d-508e79a50f3a.sql` (§7.5); both include the `ALTER FUNCTION ... OWNER TO postgres`, `REVOKE ALL ... FROM PUBLIC`, `REVOKE ALL ... FROM anon`, `GRANT EXECUTE ... TO authenticated` privilege triplet reflected in §B.

No caller convention needs to change.

---

## L. Exact Response Schema

`cancel_invoice` returns a `jsonb` object with **exactly seven keys** built by `jsonb_build_object` in this order:

| Key | JSON type | Value semantics |
| --- | --- | --- |
| `invoice_id` | string (uuid) | `p_invoice_id` |
| `invoice_number` | string | `invoices.invoice_number` at the moment of cancellation |
| `status` | string | literal `"cancelled"` |
| `reversal_ledger_entry_id` | string (uuid) or `null` | `id` of the adjustment ledger row (or existing idempotent match); `null` only when no invoice ledger row existed (permitted only when `total_amount = 0` — otherwise `FIN_INVOICE_LEDGER_MISSING` fires before this point) |
| `balance_after` | number or `null` | Running client balance after inserting the reversal; `null` when no new insert occurred (either because a prior reversal already existed and was reused via the `SELECT id INTO v_reversal_id ... LIMIT 1` short-circuit, or because there was no invoice ledger row) |
| `effective_date` | string (date, ISO `YYYY-MM-DD`) | `p_effective_date` |
| `reason` | string | Trimmed non-empty `v_reason` |

Idempotent replay returns the byte-identical `stored_response` originally committed. Case 16.10 assertions must key on exactly these seven names.

---

## M. Fully Executable Case 16.10 Blueprint

Blueprint is executable-shape only. Every symbol used below is a **named variable** whose origin is explicitly defined in §M.0. No angle-bracket unknown placeholders remain. All function argument positions and response keys are pinned to §A / §L above.

The Root Payload conforms exactly to the locked whitelist from `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql`:
`source_type, source_id, link_kind, client_name, discount_amount, payment_method, prices_include_tax, notes, items`.
The Lab Item whitelist is exactly:
`description, quantity, unit_price, is_taxable`.

No browser-controlled `client_id`, no browser-controlled Source trace (`entity_type`, `entity_id`), no browser-controlled `horse_id` / `lab_horse_id`, no browser-controlled `service_source` / `category_id`, no item-level `discount_amount`, and no browser-controlled `tax_rate_snapshot` appears anywhere in the corrected Payloads. The registered Client is resolved server-side from the locked Lab Sample (`lab_samples.client_id`); the Source trace and Horse/Lab-Horse identity are written server-side by `_finance_source_checkout_apply_trace`; the tax-rate snapshot is resolved and frozen by Backend Finance.

### Step 0 — Fixture pre-conditions and variable registry

Fixture pre-conditions (materialized by File 15 templates; not part of this file):

- Primary tenant provisioned with owner membership for the fixed actor.
- Client inserted.
- Lab horse (with microchip mirror, if applicable) inserted, or a horse-only source fixture inserted; see §M.4 for the alternative family.
- Lab sample inserted in status `'accessioned'` (Deposit-eligible), owning `lab_samples.client_id` and either `lab_samples.lab_horse_id` or `lab_samples.horse_id`.
- No `payment_accounts` row required for the debt path (debt is a non-account payment method).
- Session GUC: `SET LOCAL ROLE authenticated;` and `SELECT set_config('request.jwt.claims', jsonb_build_object('sub', v_actor_id::text, 'role', 'authenticated')::text, true);`
- Pre-cancellation invariant: exactly one `ledger_entries` row of `entry_type='invoice'`, `reference_type='invoice'`, `reference_id=v_invoice_1_id`, `amount > 0` exists (guaranteed by the source-checkout writer in Step 1; ensures §G edge branch `FIN_INVOICE_LEDGER_MISSING` does not fire).
- Pre-cancellation invariant: no `payment_intents` row exists for `(tenant_id=v_tenant_id, reference_type='invoice', reference_id=v_invoice_1_id, status IN ('pending','paid'))`. The debt path does not create Payment Intents; see §M.5.

Named variable registry (every symbol used in §M.1–§M.4):

| Variable | Type | Origin |
| --- | --- | --- |
| `v_tenant_id` | `uuid` | Fixed identity — File 15 T1 ID registry (primary tenant). |
| `v_actor_id` | `uuid` | Fixed identity — File 15 T1 ID registry (owner-role fixed actor). |
| `v_sample_id` | `uuid` | File 15 T1 ID registry — locked `lab_samples.id` fixture in status `'accessioned'`. Owns `lab_samples.client_id` and either `lab_samples.lab_horse_id` or `lab_samples.horse_id`. |
| `v_checkout_key_1` | `uuid` | Freshly generated via `gen_random_uuid()` at Step 1 (outer checkout idempotency key #1). |
| `v_cancel_key` | `uuid` | Deterministic per test transaction — `'11111111-1111-1111-1111-111111111111'::uuid`. |
| `v_checkout_key_2` | `uuid` | Freshly generated via `gen_random_uuid()` at Step 4 (outer checkout idempotency key #2, **distinct** from `v_checkout_key_1`). |
| `v_invoice_1_id` | `uuid` | Returned from Step 1 response — `(resp->>'invoice_id')::uuid`. |
| `v_invoice_2_id` | `uuid` | Returned from Step 4 response — `(resp->>'invoice_id')::uuid`. |
| `v_cancel_effective_date` | `date` | Computed at Step 2 as `(now() AT TIME ZONE 'Asia/Riyadh')::date` (Riyadh business date). |
| `v_cancel_reason` | `text` | Literal `'T1 canonical cancellation for Case 16.10'`. |

### Step 1 — Initial Source checkout (Deposit + Debt)

```sql
WITH r AS (
  SELECT public.create_source_checkout_invoice(
    v_tenant_id,
    v_checkout_key_1,                            -- outer idempotency key #1
    jsonb_build_object(
      'source_type',     'lab_sample',
      'source_id',       v_sample_id::text,      -- JSON string, per locked migration
      'link_kind',       'deposit',
      'payment_method',  'debt',
      'discount_amount', 0,
      'items', jsonb_build_array(
        jsonb_build_object(
          'description', 'T1 Deposit',
          'quantity',    1,
          'unit_price',  100.00,
          'is_taxable',  true
        )
      )
    )
  ) AS resp
)
SELECT
  (resp->>'invoice_id')::uuid   AS invoice_1_id,
  resp->>'status'               AS invoice_1_status,
  resp->>'payment_method'       AS invoice_1_method,
  resp->'payment_result'        AS invoice_1_payment_result
INTO TEMP TABLE t_step1
FROM r;

-- Assertions (browser Payload omitted every server-owned field):
--   invoice_1_status = 'approved'
--   invoice_1_method = 'debt'
--   invoice_1_payment_result IS JSON null
--   (SELECT payment_received_at FROM public.invoices WHERE id = invoice_1_id) IS NULL
--
--   -- Exactly one invoice ledger row, zero payment ledger rows:
--   (SELECT count(*) FROM public.ledger_entries
--      WHERE tenant_id=v_tenant_id AND reference_type='invoice'
--        AND reference_id=invoice_1_id AND entry_type='invoice') = 1
--   (SELECT count(*) FROM public.ledger_entries
--      WHERE tenant_id=v_tenant_id AND reference_type='invoice'
--        AND reference_id=invoice_1_id AND entry_type='payment') = 0
--
--   -- Exactly one historical Source Deposit billing_links row:
--   (SELECT count(*) FROM public.billing_links
--      WHERE tenant_id=v_tenant_id AND source_type='lab_sample'
--        AND source_id=v_sample_id AND invoice_id=invoice_1_id
--        AND link_kind='deposit') = 1
--
--   -- Server-owned trace was written (browser Payload had no entity_type/entity_id
--   -- and no horse identity fields):
--   (SELECT bool_and(entity_type = 'lab_sample' AND entity_id = v_sample_id)
--      FROM public.invoice_items WHERE invoice_id = invoice_1_id) = true
--
--   -- Server-owned horse identity, derived from the locked Lab Sample:
--   -- If lab_samples.lab_horse_id IS NOT NULL for v_sample_id:
--     (SELECT bool_and(lab_horse_id = (SELECT lab_horse_id FROM public.lab_samples
--                                       WHERE id = v_sample_id)
--                       AND horse_id IS NULL)
--        FROM public.invoice_items WHERE invoice_id = invoice_1_id) = true
--   -- Else (lab_samples.horse_id IS NOT NULL, lab_samples.lab_horse_id IS NULL):
--     (SELECT bool_and(horse_id = (SELECT horse_id FROM public.lab_samples
--                                    WHERE id = v_sample_id)
--                       AND lab_horse_id IS NULL)
--        FROM public.invoice_items WHERE invoice_id = invoice_1_id) = true
--
--   -- Server-owned Client resolution: invoice client_id matches the locked
--   -- Lab Sample's registered client, not any browser-provided value:
--   (SELECT client_id FROM public.invoices WHERE id = invoice_1_id)
--      = (SELECT client_id FROM public.lab_samples WHERE id = v_sample_id)
```

### Step 2 — Canonical cancellation

```sql
WITH c AS (
  SELECT public.cancel_invoice(
    v_tenant_id,                                                      -- p_tenant_id
    v_cancel_key,                                                     -- p_idempotency_key
    (SELECT invoice_1_id FROM t_step1),                               -- p_invoice_id
    v_cancel_effective_date,                                          -- p_effective_date (Riyadh business date, ≥ issue_date, ≤ Riyadh today + 7)
    v_cancel_reason                                                   -- p_reason
  ) AS resp
)
SELECT resp INTO TEMP TABLE t_step2 FROM c;
```

Response contract (exactly the seven keys from §L; canonical positional argument order preserved from §A):

```
{ invoice_id, invoice_number, status, reversal_ledger_entry_id,
  balance_after, effective_date, reason }
```

### Step 3 — Post-cancellation assertions

```sql
-- Response schema (exactly 7 keys from §L):
--   (resp->>'invoice_id')::uuid          = invoice_1_id
--   (resp->>'invoice_number')            = (SELECT invoice_number FROM public.invoices WHERE id=invoice_1_id)
--   (resp->>'status')                    = 'cancelled'
--   (resp->>'reversal_ledger_entry_id')  IS NOT NULL
--   (resp->>'balance_after')             IS NOT NULL
--   (resp->>'effective_date')::date      = v_cancel_effective_date
--   (resp->>'reason')                    = v_cancel_reason

-- Invoice header:
--   status = 'cancelled'
--   payment_method = 'debt'         (preserved)
--   payment_received_at IS NULL     (preserved)

-- Ledger:
--   exactly 1 row  entry_type='invoice'         reference_id=invoice_1_id  amount > 0   (unchanged)
--   exactly 1 row  entry_type='adjustment'      reference_type='invoice_cancellation'
--                  reference_id=invoice_1_id    amount = -(original invoice amount)
--                  effective_date = v_cancel_effective_date,
--                  metadata->>'via' = 'cancel_invoice',
--                  metadata->>'reason' = v_cancel_reason,
--                  (metadata->>'reverses_ledger_entry_id')::uuid = original invoice ledger row id
--   exactly 0 rows entry_type='payment'         reference_id=invoice_1_id

-- Customer balance:
--   customer_balances.balance for (v_tenant_id, invoice client_id) equals
--   SUM(ledger_entries.amount) for that pair (reversal applied).

-- Historical Source Billing Link (preserved bytewise):
--   exactly 1 row still exists WHERE source_type='lab_sample'
--     AND source_id=v_sample_id AND invoice_id=invoice_1_id AND link_kind='deposit'
--   (created_at unchanged; row content unchanged)

-- Invoice items: row count unchanged; every row unchanged (including server-owned
-- entity_type, entity_id, lab_horse_id/horse_id from Step 1).
```

### Step 4 — Same-kind retry

```sql
WITH r2 AS (
  SELECT public.create_source_checkout_invoice(
    v_tenant_id,
    v_checkout_key_2,                            -- outer idempotency key #2, distinct from v_checkout_key_1
    jsonb_build_object(
      'source_type',     'lab_sample',
      'source_id',       v_sample_id::text,      -- same source, intentional
      'link_kind',       'deposit',              -- same link kind, intentional
      'payment_method',  'debt',
      'discount_amount', 0,
      'items', jsonb_build_array(
        jsonb_build_object(
          'description', 'T1 Deposit retry after cancellation',
          'quantity',    1,
          'unit_price',  100.00,
          'is_taxable',  true
        )
      )
    )
  ) AS resp
)
SELECT (resp->>'invoice_id')::uuid AS invoice_2_id,
       resp->>'status'             AS invoice_2_status
INTO TEMP TABLE t_step4
FROM r2;

-- Assertions:
--   Step 4 does NOT raise 'FIN_SOURCE_LINK_CONFLICT' (or any SQLSTATE);
--   invoice_2_id <> invoice_1_id;
--   invoice_2_status = 'approved';
--
--   -- Two historical/current Source Deposit billing_links rows exist:
--   (SELECT count(*) FROM public.billing_links
--      WHERE tenant_id=v_tenant_id AND source_type='lab_sample'
--        AND source_id=v_sample_id AND link_kind='deposit') = 2
--
--   -- Exactly one of them points to a non-cancelled invoice:
--   (SELECT count(*) FROM public.billing_links bl
--      JOIN public.invoices i ON i.id=bl.invoice_id
--      WHERE bl.tenant_id=v_tenant_id AND bl.source_type='lab_sample'
--        AND bl.source_id=v_sample_id AND bl.link_kind='deposit'
--        AND i.status <> 'cancelled') = 1
--
--   -- Historical Step 1 artifacts (old invoice, its invoice_items, its billing_links
--   -- row, its invoice ledger row, and the cancellation adjustment reversal row)
--   -- were NOT deleted; every one still exists.
```

### §M.4 — Alternative fixture family

Case 16.10 may equivalently be run against a Lab Sample fixture that owns `lab_samples.horse_id` (with `lab_samples.lab_horse_id IS NULL`). In that alternative, the browser Payload in Steps 1 and 4 remains **identical** — still exactly the whitelisted Root and Lab Item keys shown above. Only the server-side trace assertion swaps to the `horse_id IS NOT NULL AND lab_horse_id IS NULL` branch shown in Step 1.

### §M.5 — Payment Intent scope

The captured live body of `public.cancel_invoice` reads `public.payment_intents` only as an existing cancellation-safety guard (it rejects cancellation when a `pending` or `paid` intent references the invoice). Case 16.10:

- Creates no Payment Intent fixture.
- Modifies no Payment Intent row.
- Implements no new Payment Intent behavior.
- Relies on the existing guard to remain silent because the approved debt fixture has no matching `pending` or `paid` Payment Intent row.

The captured live function body in §A is preserved unchanged. This subphase does not authorize retail POS development or any new Payment Intent architecture.

### §M.6 — Idempotency scope (T2 boundary preserved)

T2 remains locked to: Invoice Item late-stage failure, Approval Ledger late-stage failure, Payment Ledger late-stage failure, Source Billing Link late-stage failure, exact zero-residue reconciliation, and the final preservation fingerprint. Case 16.10 requires only:

- one successful canonical cancellation (Step 2) with its exact stored response (Step 3);
- no duplicate cancellation Adjustment ledger row;
- the successful same-kind checkout retry (Step 4).

The following additional `cancel_invoice` idempotency behaviors are **documentation-only** and are **not mandatory T2 requirements**:

- Re-running Step 2 with `v_cancel_key` and identical args → returns byte-identical response, no additional ledger row.
- Re-running Step 2 with `v_cancel_key` but a different `p_reason` → `FIN_IDEMPOTENCY_CONFLICT` / `23514`.
- Re-running Step 2 with `v_cancel_key` but a different `p_invoice_id` → `FIN_IDEMPOTENCY_CONFLICT` / `23514`.
- Re-running Step 2 with `v_cancel_key` from a different actor → `FIN_IDEMPOTENCY_ACTOR_MISMATCH` / `42501`.

---

## N. Scope Statement

No N+4 refund, payment reversal, or credit-note implementation was performed. This subphase performed only read-only inspection of the existing `public.cancel_invoice(uuid,uuid,uuid,date,text)` function and its immediate helpers, captured evidence into this file, and left every locked artifact unchanged. `cancel_invoice` was not invoked. No row was inserted, updated, or deleted in the database. No permission definition, grant, or membership was modified. No retail POS surface was inspected. No migration was authored or applied. Files `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql`, `docs/aml_1_b_1/stage_j5_1/preflight/14_source_fixture_catalog_evidence.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/15_source_fixture_execution_contract.md`, `supabase/tests/database/j5_1_source_checkout.test.sql`, all of `supabase/migrations/**`, and all of `src/**` remain unchanged.
