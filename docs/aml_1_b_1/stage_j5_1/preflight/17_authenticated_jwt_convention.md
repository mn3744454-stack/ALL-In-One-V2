# 17 — Authenticated SQL Test Authoring Convention (Turn 5A.1 Correction)

Status: PREFLIGHT / TEST CONTRACT (not final Mini Documentation).
Scope: authenticated SQL tests authored under `supabase/tests/database/` and executed by a **qualified runner** with `authenticated`-role membership.

This revision (Turn 5A.1) corrects the earlier convention on four points:

1. `psql` `:'…'` variables must NEVER appear inside dollar-quoted PL/pgSQL bodies —
   `psql` interpolation occurs *before* the block is parsed, and inside `DO $$ … $$`
   PL/pgSQL does not perform its own `:'var'` substitution.
2. Fixture identity is materialized into a top-level `TEMP TABLE test_context`
   (ON COMMIT DROP), and every PL/pgSQL block reads it via `pg_temp.test_context`.
3. `SET LOCAL ROLE authenticated` is scoped narrowly around each RPC invocation
   only; privileged fixture setup and privileged persistence assertions run as the
   session (privileged) role. `RESET ROLE` is executed *before* privileged reads
   and inside any expected-error `EXCEPTION` handler.
4. The qualified runner does NOT provision replacement `auth.users` or
   `public.tenant_members` rows, does NOT edit the SQL file, and does NOT
   substitute the fixed UUIDs. The runner only binds `-v test_actor_id=… -v
   test_tenant_id=…` and executes the file unchanged.

---

## 1. Fixed Qualified Test Actor & Tenant

| Symbol            | Locked Value                             |
|-------------------|------------------------------------------|
| `:test_actor_id`  | `98439fe8-6881-4e9e-8ff6-18aca0ce4470`   |
| `:test_tenant_id` | `145f2128-83ca-4ba8-85b5-8ade245c5530`   |

Verified 2026-07-25 via preflight: Actor is `active` member of Tenant; Tenant has
exactly one active `public.payment_accounts` row; auto-provisioning trigger
`trg_tenants_provision_payment_account` is enabled.

The runner MUST supply the values through `psql -v` bindings equal to those above;
the values MUST NOT be hard-coded inline in any test file.

---

## 2. Transaction Skeleton (Corrected)

```sql
\set ON_ERROR_STOP on

BEGIN;

-- (A) Materialize identity at the top level. psql interpolates :'…' here,
--     BEFORE any DO block parses.
CREATE TEMP TABLE test_context (
  actor_id       uuid NOT NULL,
  tenant_id      uuid NOT NULL,
  original_user  name NOT NULL,
  payment_account_id uuid,
  started_at     timestamptz NOT NULL DEFAULT now()
) ON COMMIT DROP;

INSERT INTO test_context (actor_id, tenant_id, original_user)
VALUES (:'test_actor_id'::uuid, :'test_tenant_id'::uuid, current_user);

UPDATE test_context
   SET payment_account_id = (
     SELECT id FROM public.payment_accounts
      WHERE tenant_id = test_context.tenant_id AND is_active
      ORDER BY created_at LIMIT 1
   );

-- (B) Fixed-identity assertion — reads from pg_temp, never from :'…'.
DO $$
DECLARE v_actor uuid; v_tenant uuid;
BEGIN
  SELECT actor_id, tenant_id INTO v_actor, v_tenant FROM pg_temp.test_context;
  IF v_actor  <> '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid
  OR v_tenant <> '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid THEN
    RAISE EXCEPTION 'J5_2_FIXED_IDENTITY_MISMATCH';
  END IF;
END $$;

-- (C) Privileged fixture setup happens HERE as the session role.

-- (D) Per-scenario invocation — role switch is narrowly scoped:
SAVEPOINT sp_scenario_N;

-- Bind JWT claims for the transaction (both shapes for helper compatibility).
SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  (SELECT actor_id FROM pg_temp.test_context),
    'role', 'authenticated'
  )::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE v_result jsonb; v_state text; v_msg text;
BEGIN
  BEGIN
    v_result := public.create_source_checkout_invoice(/* … */);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    -- store into pg_temp.test_scenario_results
  END;
END $$;

RESET ROLE;

-- (E) Privileged persistence assertions as session role.

ROLLBACK TO SAVEPOINT sp_scenario_N;

-- … more scenarios …

-- (F) Terminate.
ROLLBACK;
```

Rules:

- `set_config(…, true)` scopes to the current transaction; there is NO persistent
  GUC write.
- `SET LOCAL ROLE authenticated` reverts on `RESET ROLE`, `ROLLBACK TO SAVEPOINT`,
  or the outer `ROLLBACK`. Even on unhandled exception, the outer `ROLLBACK`
  restores the original role.
- `auth.uid()` inside `SECURITY DEFINER` helpers reads `request.jwt.claim.sub`
  first and falls back to `request.jwt.claims->>'sub'` — either path resolves to
  the fixed Actor.
- Do NOT `COMMIT`. Every test file terminates with `ROLLBACK`.

---

## 3. Qualified-Runner Responsibilities

The runner MUST:

1. Connect as a role that can `SET ROLE authenticated` (superuser, or a role with
   `GRANT authenticated TO <runner>`), and holds `USAGE` on `auth`, `extensions`,
   `public`, and `EXECUTE` on `auth.uid()`, `auth.jwt()`.
2. Bind the fixed identity via `psql -v test_actor_id=… -v test_tenant_id=…`
   equal to the locked UUIDs.
3. Run the T1/T2 SQL files **unchanged**.
4. Collect stdout, stderr, and exit code.
5. For 5R, capture a clean-session post-`ROLLBACK` fingerprint on the protected
   tables (see §4) to prove zero residue.

The runner MUST NOT:

- append scenarios, fixtures, or assertions to T1/T2;
- provision alternative `auth.users` / `tenant_members`;
- substitute the fixed UUIDs;
- patch expected tokens.

---

## 4. Reset & Residue Discipline

Every scenario is self-contained inside its own `SAVEPOINT`. The whole file is
inside a single outer `BEGIN … ROLLBACK`. After the outer `ROLLBACK` the
following tables MUST show byte-identical counts and sums to their pre-run
snapshot (captured in `pg_temp.test_baseline`):

- `public.invoices`
- `public.invoice_items`
- `public.ledger_entries`
- `public.billing_links`
- `public.customer_balances`
- `public.finance_request_idempotency`
- `public.payment_accounts`

The final in-transaction assertion also verifies `current_user =
(SELECT original_user FROM pg_temp.test_context)`.

---

## 5. Evidence Classification (Locked)

| Label                         | Meaning                                                                                     |
|-------------------------------|---------------------------------------------------------------------------------------------|
| `AUTHORED`                    | The full, self-contained, executable SQL exists — labels or scenario names do not qualify.  |
| `STATICALLY REVIEWED`         | Every statement traced to live catalog: table, column, enum, FK, token, function.           |
| `EXECUTED`                    | The qualified runner ran the file unchanged and produced deterministic output.              |
| `PASSED`                      | `EXECUTED` + all assertions passed + post-rollback fingerprint proves zero residue.         |
| `BLOCKED BY QUALIFIED RUNNER` | Fully AUTHORED and STATICALLY REVIEWED, but the current environment cannot switch to `authenticated`. |

Reporting `EXECUTED` or `PASSED` for a scenario that did not actually run is
forbidden. Reporting `AUTHORED` for a scenario that exists only as a label or
comment is forbidden.

---

## 6. Idempotency Key Convention

Each scenario derives its outer idempotency key from a deterministic namespace so
same-key/same-payload replay and same-key/changed-payload conflict scenarios are
reproducible:

```sql
-- Reserved namespaces (per scenario category):
-- 11111111-1111-4111-8111-0000000000xx  Lab Deposit
-- 22222222-2222-4222-8222-0000000000xx  Lab Final + Coexistence
-- 33333333-3333-4333-8333-0000000000xx  Horse Order Final
-- 44444444-4444-4444-8444-0000000000xx  Duplicate active source-link
-- 55555555-5555-4555-8555-0000000000xx  Permission-denied paths
-- 66666666-6666-4666-8666-0000000000xx  T2 failure-hook stages
```

Full mapping is captured in `22_turn_5a_fixture_uuid_map.md`.

---

## 7. Assertion Style & Permission Keys

- `DO $$ BEGIN IF NOT (…) THEN RAISE EXCEPTION 'ASSERT_FAILED: <scenario>: <detail>'; END IF; END $$;`
- Compare against server-computed totals, not caller-supplied literals.
- For expected-error scenarios, capture `RETURNED_SQLSTATE` + `MESSAGE_TEXT` and
  assert on the exact token substring (e.g. `FIN_SOURCE_LINK_CONFLICT`). Never
  mask with a bare `EXCEPTION WHEN OTHERS THEN NULL;`.
- Permission keys used by `create_source_checkout_invoke` are the live
  live-registered values — `finance.invoice.create`, `finance.invoice.approve`,
  and `finance.payment.create`. Do NOT use legacy shorthand such as
  `invoices.create`, `invoices.approve`, or `payments.create`.
- Owner short-circuits `has_permission`. To exercise `FIN_PERMISSION_DENIED`
  the scenario must, inside its SAVEPOINT, temporarily demote the Actor's
  `tenant_members.role` to a non-owner role (e.g. `foreman`) and insert or
  upsert a `member_permissions` row with `granted=false` for the exact
  permission key under test. `ROLLBACK TO SAVEPOINT` restores Owner baseline.

---

## 8. What File 17 Is Not

- Not a proof of sandbox execution.
- Not a persistent grant to `sandbox_exec`.
- Not final Mini Documentation.
- Not a substitute for a qualified-runner CI job.
