# 17 — Authenticated SQL Test Authoring Convention

Status: PREFLIGHT / TEST CONTRACT (not final Mini Documentation).
Scope: authenticated SQL tests authored under `supabase/tests/database/` and executed by a **qualified runner** that possesses `authenticated`-role membership. This file exists to lock the convention that T1 (`j5_1_source_checkout.test.sql`) and T2 (`j5_2_source_checkout_atomicity.test.sql`) will follow.

The convention below is documented — not proven executable inside the current sandbox.
The sandbox `sandbox_exec` role does **not** hold membership in `authenticated`, does not hold `USAGE` on the `auth` schema, and cannot switch to `authenticated` via `SET ROLE`. All authenticated-role assertions in T1/T2 are therefore classified as `AUTHORED` / `STATICALLY REVIEWED`, never as `EXECUTED` from the sandbox. Executed evidence must come from a qualified runner CI job.

---

## 1. Fixed Qualified Test Actor & Tenant

Every authenticated test transaction runs against **one fixed pair**:

| Symbol | Meaning |
|---|---|
| `:test_actor_id` | Fixed authenticated `auth.users.id` provisioned in the qualified-runner environment; holds `active` `tenant_members` membership with the required permission bundle. |
| `:test_tenant_id` | Fixed tenant id used for all Slice 01 scenarios; the test actor is a member. |

These symbols are injected by the qualified runner via `psql -v test_actor_id=... -v test_tenant_id=...`. Tests never hard-code UUIDs.

---

## 2. JWT Claim Setup — Transaction Local

Every authenticated scenario starts with:

```sql
BEGIN;

-- (1) Set the request JWT claims for the transaction.
--     Both individual and JSON-blob claims are supplied so downstream helpers
--     that read either shape resolve consistently.
SELECT set_config('request.jwt.claim.sub',   :'test_actor_id'::text, true);
SELECT set_config('request.jwt.claim.role',  'authenticated',        true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',  :'test_actor_id',
    'role', 'authenticated'
  )::text,
  true
);

-- (2) Switch runtime role to `authenticated` so RLS + SECURITY DEFINER
--     boundaries execute as they do in production.
SET LOCAL ROLE authenticated;

-- ... scenario body ...

RESET ROLE;
ROLLBACK;
```

Rules:

- `set_config(..., true)` scopes to the current transaction. No persistent GUC writes.
- `SET LOCAL ROLE authenticated` is transaction-local and reverts on `ROLLBACK` / `RESET ROLE`.
- JSON-claims blob is set **in addition to** individual claims because different helpers read one or the other. Fallback semantics: individual `request.jwt.claim.<key>` wins when both are present; JSON-blob is the fallback that Supabase's `auth.uid()` and `auth.jwt()` read when the individual key is absent.
- `auth.uid()` inside SECURITY DEFINER helpers reads `request.jwt.claim.sub` first and falls back to `request.jwt.claims->>'sub'` — either path resolves to `:test_actor_id`.

---

## 3. Qualified-Runner Requirements

To EXECUTE authenticated tests the runner must:

1. Connect as a superuser or role that has explicit `GRANT authenticated TO <runner>` (so `SET ROLE authenticated` succeeds).
2. Have `USAGE` on schemas `auth`, `extensions`, `public`.
3. Have EXECUTE on `auth.uid()`, `auth.jwt()`, `extensions.digest(...)`.
4. Provide the fixed `:test_actor_id` and `:test_tenant_id` bindings — the runner is responsible for provisioning matching `auth.users` and `public.tenant_members` rows.

Explicit non-requirements — the convention **forbids** the following in the shared sandbox:

- Granting `authenticated` to `sandbox_exec` or `sandbox_exec_<project>`.
- Granting the sandbox role `USAGE ON SCHEMA auth`.
- Any persistent database mutation to make sandbox execution possible.
- Any claim that sandbox role-switching was proven.

---

## 4. Reset Discipline

Every scenario is self-contained:

- `BEGIN;` at scenario start.
- `SET LOCAL ROLE authenticated;` after claim setup.
- `ROLLBACK;` at scenario end — leaves **zero persistent rows**.
- `RESET ROLE;` before `ROLLBACK` when the scenario body altered the role.
- No `COMMIT` in any authenticated scenario.

The test file MUST end with a final assertion that `SELECT current_user = :original_user` after all `ROLLBACK`s, and a final zero-residue check across:

- `public.invoices`
- `public.invoice_items`
- `public.ledger_entries`
- `public.billing_links`
- `public.customer_balances`
- `public.finance_request_idempotency`

---

## 5. Evidence Classification

Every test scenario reports as **one** of:

| Classification | Meaning |
|---|---|
| `AUTHORED` | The scenario SQL exists and compiles (syntactically valid, references existing objects). |
| `STATICALLY REVIEWED` | The scenario has been read line-by-line against the live catalog; expected behavior derived from source function definitions. |
| `EXECUTED` | The scenario was run end-to-end by a qualified runner and returned deterministic output. |
| `PASSED` | An `EXECUTED` scenario produced the expected assertions and left zero residue. |
| `BLOCKED BY QUALIFIED RUNNER` | The scenario exists but cannot be executed inside the sandbox because it requires `authenticated`-role privileges. |

Fabricating execution results — including reporting `PASSED` from a sandbox run that did not actually run the scenario — is forbidden. A scenario that is `AUTHORED` and `STATICALLY REVIEWED` in the sandbox is reported as `BLOCKED BY QUALIFIED RUNNER` for its execution status until CI runs it.

---

## 6. Idempotency Key Convention

Each scenario derives its idempotency key deterministically from a scenario name so that same-key/same-payload replay and same-key/changed-payload conflict scenarios are stable:

```sql
-- Deterministic per-scenario key.
\set idem_key '\'11111111-1111-4111-8111-000000000001\''
-- (increment the trailing counter per scenario)
```

Reserved keys for T1 replay scenarios are documented alongside the scenario body.

---

## 7. Assertion Style

- Use `DO $$ BEGIN IF NOT (...) THEN RAISE EXCEPTION 'ASSERT_FAILED: <scenario>: <detail>'; END IF; END $$;`
- Prefer server-computed comparisons over caller-provided literals when checking totals.
- Never mask expected-error scenarios with `EXCEPTION WHEN OTHERS` — always assert the exact `SQLERRM` fragment (e.g. `FIN_SOURCE_LINK_CONFLICT`).

---

## 8. What File 17 Is Not

- Not a proof that sandbox execution works.
- Not a persistent grant to `sandbox_exec`.
- Not a substitute for a qualified-runner CI job.
- Not final Mini Documentation — this file is preflight/test contract only. It may be deleted or superseded when Mini Documentation is authored after Manual Acceptance closure.
