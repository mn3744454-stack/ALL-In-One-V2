# File 24 — TURN 5A.2.a RETRY — HARNESS AND FINAL 10-FIXTURE FOUNDATION

Status: **PARTIAL FOUNDATION EVIDENCE** for `supabase/tests/database/j5_1_source_checkout.test.sql`.
This file is NOT complete Turn-5A.2 evidence. Turn 5A.2.b remains required to
author the 32 independent expected-error RPC Scenarios.

## A. Verdict

**TURN 5A.2.a RETRY AUTHORED — HARNESS AND 10 ACTIVE FIXTURES READY FOR TURN 5A.2.b**

## B. Roadmap Position

Phase 2 — N+1B · J5.2-SLICE-01-EXECUTION · Turn 5A.2.a Retry.

## C. Skill Application

- Applied: 03 (Workflow Completeness), 04 (Tenant Isolation Guard),
  06 (API/RPC Hardening), 08 (Schema and Migration Safety),
  19 (Platform Billing/Finance), 23 (Performance and Reliability),
  25 (QA/Release Readiness), 26 (Skill Network Governance).
- No-op (documented): 05 (no RLS change), 07 (no production TS change),
  10 (no UX change), 12 (no translation change).
- Excluded: RPC Scenario authoring, production correction, Retail POS,
  Draft Invoice recovery, Horse Order Fixtures, junction/permission Fixtures,
  T2, Phases N+2..N+4.

## D. Production Preflight — Six Fingerprint Results

Recomputed 2026-07-25 against live catalog.

| Function                                    | RAW SHA-256                                                        | Expected RAW  |
|---------------------------------------------|--------------------------------------------------------------------|---------------|
| `public.create_source_checkout_invoice`     | `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0` | MATCH         |
| `public._finance_source_checkout_apply_trace` | `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9` | MATCH       |
| `public._invoice_items_validate_source`     | `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772` | MATCH         |

Canonical-POSIX hashes in this environment equal the RAW hashes byte-for-byte
because the live `pg_get_functiondef` output contains no `\r\n` sequences
(Turn 5A.1R2 reconciliation lock). Since every RAW hash matches the accepted
lock value, the three functions are **provably unchanged**. No production
drift detected; no live contract change; PROCEED.

## E. Live-Catalog Audit Summary

Inspected columns, defaults, nullability, triggers, and enums for:

- `public.clients` (21 cols; `update_clients_updated_at` BEFORE UPDATE only)
- `public.lab_horses` (24 cols; `set_lab_horses_updated_at` BEFORE UPDATE only)
- `public.lab_samples` (35 cols) — active BEFORE-INSERT triggers:
  `validate_lab_sample_trigger` (requires `horse_name` when `horse_id IS NULL`),
  `validate_lab_sample_received_trigger` (no-op for unpopulated received fields),
  `trg_set_collection_date_only`, `trg_set_daily_sample_number`.
  `status` is TEXT; observed live values: `draft`, `accessioned`, `processing`,
  `completed`, `cancelled`.
- `public.tenants` — finance columns are `default_tax_rate` (numeric),
  `prices_tax_inclusive` (boolean), `currency` (text). Primary Tenant snapshot:
  `default_tax_rate=15`, `prices_tax_inclusive=false`, `currency='SAR'`.
- `public.tenant_members` — Fixed Actor is active `owner` in Primary Tenant.
- `public.payment_accounts` — exactly one active tenant-owned row for Primary
  Tenant; `id=dd4af866-bd56-4c6d-8c9e-a05dc4a7a7cf`.
- `public.finance_request_idempotency` — 0 rows in Primary Tenant for
  `operation='create_source_checkout_invoice'`.
- `pg_trigger.trg_tenants_provision_payment_account` — enabled ('O').

Contract-relevant finding preserved: `validate_lab_sample()` requires
`horse_name` non-empty on every INSERT where `horse_id IS NULL`. The Fixture
INSERTs use `lab_horse_id` (a separate column) and therefore MUST also supply
a synthetic `horse_name`. This is a legal shape — no trigger disabled.

## F. Foundation SQL File

- Path: `supabase/tests/database/j5_1_source_checkout.test.sql`
- Line count: **796**
- Rejected label-ledger scaffold: **fully removed** (no `v_scenarios`, no
  scenario-label arrays, no runner-extension prose, no no-op zero-residue
  block, no placeholder coverage sections).
- Outer transaction: exactly one `BEGIN;` (line 1 of body) and one final
  `ROLLBACK;` (last line). Verified with grep.
- Calls to `public.create_source_checkout_invoice(`: **0** (grep-verified).

## G. Temp Harness

Six Temp structures created (all `ON COMMIT DROP`):

1. `pg_temp.test_context` — actor, primary/secondary tenant, original_user,
   payment_account, tenant tax/currency/prices_include_tax,
   `missing_lab_sample_id = deadbeef-0000-4000-8000-000000000027`, started_at.
2. `pg_temp.test_scenario_inputs` — Scenario-input registry (empty this turn).
3. `pg_temp.test_rpc_capture` — RPC capture registry (empty this turn).
4. `pg_temp.test_scenario_results` — Scenario-result registry (empty this turn).
5. `pg_temp.test_baseline` — protected-table snapshot registry (populated for
   9 scopes pre-Fixture, re-verified equal pre-rollback).
6. `pg_temp.test_active_idem_keys` — active Idempotency-key census.
7. `pg_temp.test_reserved_keys` — retired/reserved key registry.

## H. Temp ACLs

Granted to `authenticated`:

- `GRANT SELECT ON pg_temp.test_context`
- `GRANT SELECT ON pg_temp.test_scenario_inputs`
- `GRANT INSERT ON pg_temp.test_rpc_capture`

Explicitly withheld from `authenticated`: UPDATE, DELETE, TRUNCATE,
REFERENCES, TRIGGER on any Temp table; all access to `test_baseline`,
`test_scenario_results`, `test_active_idem_keys`, `test_reserved_keys`.
Catalog inspection asserts zero unexpected grants (`J5_2A_UNEXPECTED_AUTHENTICATED_ACL_%`).

## I. Protected Baseline

Snapshots captured pre-Fixture and re-verified pre-rollback for:

`invoices`, `invoice_items`, `ledger_entries`, `billing_links`,
`customer_balances`, `finance_request_idempotency`, `payment_accounts`,
`actor_membership_primary`, `primary_tenant_finance_config`.

Any drift raises `J5_2A_BASELINE_DRIFT_<scope>`. Since Turn 5A.2.a Retry
inserts zero financial rows, all 9 scopes MUST be byte-identical.

## J. Secondary Tenant Context

Resolved at runtime as `MIN(created_at)` tenant where Fixed Actor holds no
active membership. Result held ONLY in `pg_temp.test_context.secondary_tenant_id`.
No Client, Lab Horse, Lab Sample, Horse Order, junction, or permission row is
written into that tenant. Fixture-leak guard `J5_2A_SECONDARY_TENANT_FIXTURE_LEAK`
enforces this at pre-rollback time.

## K. Active Fixtures — Count Ledger

| Table         | Count |
|---------------|-------|
| Clients       | 1     |
| Lab Horses    | 1     |
| Lab Samples   | 8     |
| **Total**     | **10** |

Status distribution across the 8 Lab Samples:
`draft=3`, `accessioned=2`, `completed=1`, `processing=1`, `cancelled=1`
(assertion `J5_2A_STATUS_DIST_...`).

## L. Active Fixture UUIDs

| Symbol                    | Table         | UUID                                     |
|---------------------------|---------------|------------------------------------------|
| CLIENT_REGISTERED         | clients       | `aaaa1111-0000-4000-8000-000000000001`   |
| LH_LEGACY_CLIENT          | lab_horses    | `cccc3333-0000-4000-8000-000000000001`   |
| LS_DRAFT_LEGACY           | lab_samples   | `dddd4444-0000-4000-8000-000000000001`   |
| LS_ACCESSIONED_LEGACY     | lab_samples   | `dddd4444-0000-4000-8000-000000000002`   |
| LS_COMPLETED_LEGACY       | lab_samples   | `dddd4444-0000-4000-8000-000000000003`   |
| LS_PROCESSING             | lab_samples   | `dddd4444-0000-4000-8000-000000000004`   |
| LS_CANCELLED              | lab_samples   | `dddd4444-0000-4000-8000-000000000005`   |
| LS_WALKIN_LONG_NAME       | lab_samples   | `dddd4444-0000-4000-8000-000000000007`   |
| LS_COEXIST                | lab_samples   | `dddd4444-0000-4000-8000-00000000000b`   |
| LS_ZERO_PRICE             | lab_samples   | `dddd4444-0000-4000-8000-00000000000e`   |

## M. Active Fixture Collision Guards

Pre-INSERT collision census against production returned **0/10** hits. Stable
error token on collision: `FIXTURE_UUID_COLLISION: <symbol>`. Recovery path
is authoring-time-only — no in-transaction delete, update, or reuse.

## N. Reserved Missing-Source-ID Contract

Symbol `MISSING_LAB_SAMPLE_ID = deadbeef-0000-4000-8000-000000000027`. Held in
`pg_temp.test_context.missing_lab_sample_id`. Pre-Fixture absence guard raises
`RESERVED_MISSING_ID_COLLISION: MISSING_LAB_SAMPLE_ID` on any live row. Not a
Fixture row; excluded from Fixture counts, dependency order, and the 10-row
collision census.

## O. Retired Registry

| Scenario | Kind                | Value                                        | State                                      |
|----------|---------------------|----------------------------------------------|--------------------------------------------|
| T1-A-32  | Idempotency key     | `11111111-1111-4111-8111-000000000035`       | retired, reserved, executable=false, reusable=false |
| —        | Client fixture      | `CLIENT_SECONDARY_TENANT`                    | retired per Turn 5A.1R5E — do not reuse    |
| —        | Sample fixture      | `LS_CROSS_TENANT_CLIENT`                     | retired per Turn 5A.1R5E — do not reuse    |
| —        | Sample fixture      | `LS_SECONDARY_TENANT`                        | retired per Turn 5A.1R5F — do not reuse    |
| —        | Sample fixture      | `HOT_TO_DELETE`                              | retired — do not reuse                     |

Guard `J5_2A_RETIRED_OR_MISSING_UUID_REUSED` blocks accidental Fixture reuse.

## P. Active Idempotency-Key Census

- Future Turn-5A.2 executable RPC calls: **40**
- Active distinct Idempotency keys: **38**
  - Category-A derived (`N+3`) for N ∈ 1..31,33: **32** distinct keys
  - Standalone T1-P-02: **1** key (`22222222-2222-4222-8222-000000000001`)
  - Chain C1 (P-01, P-06, A-40) shared: **1** key (`11111111-1111-4111-8111-000000000001`)
  - Chain C2 (P-03, P-04, A-34, A-42): **4** distinct keys
- Retired A-32 key: **excluded** from the 38-count; recorded separately in
  `test_reserved_keys`.
- Live-DB collision against `finance_request_idempotency` for Primary Tenant +
  operation `create_source_checkout_invoice`: **0/38**.

Census invariants enforced by `J5_2A_ACTIVE_KEY_CALL_COUNT_%` (=40),
`J5_2A_ACTIVE_KEY_DISTINCT_%` (=38), `J5_2A_RETIRED_KEY_COUNT_%` (=1),
`J5_2A_RETIRED_KEY_LEAKED_INTO_ACTIVE`.

## Q. Fixture Integrity Assertions

Enforced after INSERT: exact per-symbol counts, tenant scoping to Primary
Tenant, status distribution, absence of retired/missing UUIDs on any Fixture,
absence of Secondary-Tenant Fixture rows, absence of persistent financial
mutation.

## R. Empty Scenario-State Assertions

Guard `J5_2A_SCENARIO_STATE_NOT_EMPTY_%_%_%` enforces:
`test_scenario_inputs=0`, `test_rpc_capture=0`, `test_scenario_results=0`.
RPC invocation count in file: **0** (grep-verified).

## S. Static Prohibited-Pattern Search

`grep` on the Foundation file (case-sensitive tokens):

| Pattern                             | Occurrences |
|-------------------------------------|-------------|
| `TODO`                              | 0           |
| `FIXME`                             | 0           |
| `v_scenarios`                       | 0           |
| `runner extends`                    | 0           |
| `fixtures intentionally omitted`    | 0           |
| `session_replication_role`          | 0           |
| `DISABLE TRIGGER`                   | 0           |
| `create_source_checkout_invoice(`   | 0           |
| `j5_1.inject_`                      | 0           |
| `trg_j5_1_inject_`                  | 0           |
| `COMMIT;` (semicolon-terminated)    | 0           |
| top-level `BEGIN;` + final `ROLLBACK;` | 2 (paired) |

`public.create_source_checkout_invoice` appears only in comments identifying
the future RPC target and in the Idempotency operation-name comparison — never
as a function invocation.

## T. Live-Catalog Static Review

Every SQL statement authored in the Foundation file was traced to the live
catalog inspection captured in §E. No column, default, enum, FK, or trigger
was assumed. Classification: **AUTHORED / STATICALLY REVIEWED** (File 17 §5).
Not `EXECUTED` under the qualified `authenticated` runner — Turn 5R responsibility.

Note: an authoring-time dry-run under the privileged session role executed
the full file end-to-end, exercising every INSERT/DO block and completing
with a clean `ROLLBACK`. This is authoring-time evidence of parseability and
schema fit only; it is NOT qualified execution.

## U. Files Created

- `docs/aml_1_b_1/stage_j5_2/preflight/24_turn_5a_2_t1_lab_foundation_authoring.md` (this file).

## V. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql` — full replacement of
  the rejected label-ledger scaffold with the Foundation-only file above.

## W. Production Objects Modified

None.

## X. Persistent Business Rows Modified

None.

## Y. Execution Status

**TURN 5A.2.a RETRY FOUNDATION AUTHORED AND STATICALLY REVIEWED. HARNESS AUTHORED. 10 ACTIVE TRANSACTION-LOCAL FIXTURE ROWS AUTHORED. RESERVED MISSING-ID ABSENCE CONTRACT AUTHORED. 38 ACTIVE IDEMPOTENCY KEYS CENSUSED. RPC SCENARIOS AUTHORED: 0. FOUNDATION NOT EXECUTED. TURN 5A.2.b REQUIRED.**

## Z. Current T1/T2 Status

**T1 HARNESS AND ACTIVE FIXTURES: AUTHORED. T1 EXECUTABLE RPC SCENARIOS: 0/54. TURN 5A.2 EXECUTABLE RPC SCENARIOS: 0/40. T2: NOT YET AUTHORED.**

## AA. Next Exact Sub-Turn

```
Turn 5A.2.b:
T1-A-01 through T1-A-31
+ T1-A-33
+ 32 Independent SAVEPOINT Scenarios
+ Exact SQLSTATE/Token Capture
+ \gset Result Survival
+ 32 Post-Rollback Scenario Summaries
```

Do NOT begin it in this turn.

## AB. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase: J5.2-SLICE-01-EXECUTION — TURN 5A.2.a RETRY.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AC. STOP GATE

Halting after this report. Not starting Turn 5A.2.b, not authoring RPC
Scenarios, not starting Turn 5A.3, not authoring T2, not starting Turn 5R,
not performing Manual Acceptance, not starting Slice 02, not creating final
Mini Documentation.
