# 25 — Turn 5A.2.b · T1 Independent Validation Scenario Authoring

## A. Verdict

**TURN 5A.2.b1 AUTHORED — T1-A-01 THROUGH T1-A-08 READY FOR TURN 5A.2.b2**

`TURN 5A.2.b1 INCREMENTAL AUTHORING EVIDENCE.
T1-A-01 THROUGH T1-A-08 AUTHORED.
TURN 5A.2.b PROGRESS: 8/32.
TURN 5A.2 PROGRESS: 8/40.
OVERALL T1 PROGRESS: 8/54.
SCENARIOS NOT EXECUTED.
TURN 5A.2.b2 REQUIRED.`

## B. Roadmap Position

Phase 2 — N+1B · Subphase J5.2-SLICE-01-EXECUTION · Turn 5A.2.b1.
Preceded by Turn 5A.2.b (Temp-Schema Role-Switch Gate authoring only).
Succeeded by Turn 5A.2.b2 (T1-A-09..T1-A-16).

## C. Skill Application

Applied: 03, 04, 06, 08, 19, 23, 25, 26.
No-op evidence: 05 (no RLS), 07 (no production TS), 10 (no UX), 12 (no i18n).
Excluded: Positive Checkout, Horse Order, permission-negative, T2,
Retail POS, Draft Invoice recovery, Phases N+2..N+4.

## D. Artifact Preflight

- Current HEAD: `c140f085d0f7c3af32ddf2865dc4df7e76d759d2`
- SQL last-touch commit (pre-edit): `6c6347caebcaf381b6f66724c7472d9474482915`
- File-24 last-touch commit: `378c5d1ebb34da33aaff812402cad46ef4284110`
- File-25 last-touch commit (pre-edit): `cbd751a5d3ddee366efc2b757cc944546dab0bbd`
- Pre-edit SQL SHA-256: `4d965cee9ca33d1fdd436b59c6d37cd9d9455f4e558350bca456376460a33f15`
- Pre-edit SQL line count: `959`
- Foundation Sections 0–11 preserved unchanged.
- Temp-Schema Role-Switch Gate preserved unchanged (before Section 13).
- File 25 updated in place (no false final Turn-5A.2.b report).

## E. Six Locked Fingerprints

Not re-captured this turn. No production DDL executed between Turn 5A.2.aE
and Turn 5A.2.b1. Qualified runner MUST recompute prior to execution.
Accepted values:

- `create_source_checkout_invoice` Raw   `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0`
- `create_source_checkout_invoice` Canonical `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f`
- `_finance_source_checkout_apply_trace` Raw   `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9`
- `_finance_source_checkout_apply_trace` Canonical `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f`
- `_invoice_items_validate_source` Raw   `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- `_invoice_items_validate_source` Canonical `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0`

Live pre-authoring inspection of `pg_get_function_identity_arguments` for
`create_source_checkout_invoice` returned exactly
`p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb` — matches the
argument shape used in all 8 Scenario invocations.

Live pre-authoring inspection of `pg_proc.prosrc` confirmed the exact
Section-0/1 error ordering used by this batch:

1. `FIN_UNAUTHENTICATED` (`42501`) — before any NULL-arg check.
2. `FIN_BAD_ARGS` (`22023`) — NULL tenant/key/payload.
3. `FIN_PAYLOAD_TYPE` (`23514`) — jsonb_typeof ≠ 'object'.
4. `FIN_TENANT_ACCESS_DENIED` (`42501`) — before payload-shape checks.
5. `FIN_PAYLOAD_UNKNOWN_KEY: <k>` (`23514`) — root whitelist.
6. `FIN_SOURCE_TYPE_REQUIRED` (`23514`).
7. `FIN_SOURCE_TYPE_INVALID` (`23514`) — value NOT IN ('lab_sample','horse_order').
8. `FIN_SOURCE_ID_REQUIRED` (`23514`).

## F. Temp Role-Switch Gate

Preserved byte-identical from Turn 5A.2.b. Not executed this turn.

Classification:
```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.
```

## G. SQL Extension

- Final path: `supabase/tests/database/j5_1_source_checkout.test.sql`
- Pre-edit SHA / lines:  `4d965cee…60a33f15` / 959
- Post-edit SHA / lines: `a8ae069ed42fd8730ddc3342c3fecba42f356fda9006066da4a1b3c4e29b6dd6` / 1777
- Outer BEGIN: 1
- Final ROLLBACK: 1
- COMMIT: 0
- Delta: +818 lines, zero deletions from Foundation or Gate.

## H. Scenario Inventory

Authored (8): T1-A-01, T1-A-02, T1-A-03, T1-A-04, T1-A-05, T1-A-06,
T1-A-07, T1-A-08.
Deferred to Turn 5A.2.b2..b4: T1-A-09..T1-A-31, T1-A-33.
Retired (unchanged): T1-A-32.

## I. RPC Invocation Count

Explicit `public.create_source_checkout_invoice(...)` paths in the file:
**8** (required 8). Zero loops, zero dispatchers, zero dynamic SQL.

## J. SAVEPOINT Map

| Scenario  | SAVEPOINT       | ROLLBACK TO | RELEASE |
|-----------|-----------------|-------------|---------|
| T1-A-01   | `sp_t1_a_01`    | ✓           | ✓       |
| T1-A-02   | `sp_t1_a_02`    | ✓           | ✓       |
| T1-A-03   | `sp_t1_a_03`    | ✓           | ✓       |
| T1-A-04   | `sp_t1_a_04`    | ✓           | ✓       |
| T1-A-05   | `sp_t1_a_05`    | ✓           | ✓       |
| T1-A-06   | `sp_t1_a_06`    | ✓           | ✓       |
| T1-A-07   | `sp_t1_a_07`    | ✓           | ✓       |
| T1-A-08   | `sp_t1_a_08`    | ✓           | ✓       |

Gate SAVEPOINT `sp_temp_role_gate` preserved separately (not counted).

## K. JWT Claim Handling

- T1-A-01: both scalar (`request.jwt.claim.sub`) and JSON object
  (`request.jwt.claims`) cleared to `''` and `'{}'` respectively via
  `set_config(..., true)`; DB role authenticated remains set.
- T1-A-02..A-08: scalar sub + object shape both bound to fixed Actor
  from `pg_temp.test_context`, transaction-local, read via SELECT (no
  `psql :'…'` interpolation inside any dollar-quoted block).
- `RESET ROLE` executed as the next top-level statement after each
  authenticated DO block. Every Scenario asserts
  `current_user = pg_temp.test_context.original_user`.

## L. SQLSTATE / Token Matrix

| ID       | SQLSTATE | Token                              | Mutation                     |
|----------|----------|------------------------------------|------------------------------|
| T1-A-01  | 42501    | FIN_UNAUTHENTICATED                | JWT cleared                  |
| T1-A-02  | 22023    | FIN_BAD_ARGS                       | payload NULL                 |
| T1-A-03  | 23514    | FIN_PAYLOAD_TYPE                   | payload `[]::jsonb`          |
| T1-A-04  | 42501    | FIN_TENANT_ACCESS_DENIED           | Secondary Tenant             |
| T1-A-05  | 23514    | `FIN_PAYLOAD_UNKNOWN_KEY: foo`     | base ‖ `{"foo":1}`           |
| T1-A-06  | 23514    | FIN_SOURCE_TYPE_REQUIRED           | base minus `source_type`     |
| T1-A-07  | 23514    | FIN_SOURCE_TYPE_INVALID            | `source_type = "foo"`        |
| T1-A-08  | 23514    | FIN_SOURCE_ID_REQUIRED             | base minus `source_id`       |

Base payload: `source_type=lab_sample`, `source_id=dddd4444-…-0001` (Draft
Fixture), `link_kind=deposit`, `payment_method=cash`, `discount_amount=0`,
1 item `{description,'J5.2 Test Item', quantity 1, unit_price 100,
is_taxable true}`.

## M. Idempotency Key Map

Resolved from `pg_temp.test_active_idem_keys` — never hardcoded inline.

| ID       | Key                                        |
|----------|--------------------------------------------|
| T1-A-01  | `11111111-1111-4111-8111-000000000004`     |
| T1-A-02  | `11111111-1111-4111-8111-000000000005`     |
| T1-A-03  | `11111111-1111-4111-8111-000000000006`     |
| T1-A-04  | `11111111-1111-4111-8111-000000000007`     |
| T1-A-05  | `11111111-1111-4111-8111-000000000008`     |
| T1-A-06  | `11111111-1111-4111-8111-000000000009`     |
| T1-A-07  | `11111111-1111-4111-8111-000000000010`     |
| T1-A-08  | `11111111-1111-4111-8111-000000000011`     |

8 distinct keys. A-32 retired key absent. Live collision check remains in
Section 7 (`ACTIVE_IDEM_KEY_DB_COLLISION_*`).

## N. Capture-Survival Map (`\gset` prefixes)

`a01_*, a02_*, a03_*, a04_*, a05_*, a06_*, a07_*, a08_*` — each prefix
appears exactly once, exported after per-Scenario assertions and before
`ROLLBACK TO SAVEPOINT`.

## O. Post-Rollback Result Ledger (Authored Expectation)

After the 8 Scenarios and before final outer ROLLBACK:

- `pg_temp.test_scenario_results` rows = **8**
- Unique Scenario IDs = **8**
- Category A rows = **8**
- Rows with `actual_status='success'` = **0**
- Rows with `result_json IS NOT NULL` = **0**
- Rows with `passed=true` = **8**
- Rows with `assertion_count > 0` = **8**
- Foreign Scenario rows (not in the 8 IDs) = **0**
- `T1-A-32` rows = **0**
- `pg_temp.test_scenario_inputs` rows = **0**
- `pg_temp.test_rpc_capture` rows = **0**

Rows are NOT claimed as runtime-passed; no qualified runner executed
this file.

## P. Financial Zero-Residue Assertions

Section 13.Z re-verifies after the 8 Scenario rollbacks:

- Active idempotency rows for the 8 keys under
  `create_source_checkout_invoice` = 0.
- Payment Account row still present and active for
  `test_context.payment_account_id`.
- Fixture Section-9 integrity and Section-11 preservation assertions
  remain the terminal preservation gate (unchanged from Foundation).

## Q. Static Integrity Results

Counts against post-edit SQL:

- Explicit RPC paths: 8/8
- Independent Scenario SAVEPOINTs: 8/8
- `ROLLBACK TO SAVEPOINT sp_t1_a_*`: 8/8
- `RELEASE SAVEPOINT sp_t1_a_*`: 8/8
- Unique `\gset` prefixes: 8/8
- Post-rollback authoritative Result inserts: 8/8
- Gate preserved: YES
- Prohibited patterns `TODO|FIXME|pseudocode|runner extends|future runner`: **0**
- Loop-based / dispatcher / dynamic RPC construction: **0**
- `psql :'…'` occurrences inside any dollar-quoted block: **0**
- `COMMIT;`, `session_replication_role`, `DISABLE TRIGGER`: **0**
- Production-object modification: **0**

## R. Live-Catalog Static Review

Live inspection of `pg_proc` confirmed:

- Function `create_source_checkout_invoice` signature matches
  `(uuid, uuid, jsonb)` — as used in all 8 invocations.
- Section-0/1 error tokens/SQLSTATEs match the L. matrix character-for-
  character (`FIN_UNAUTHENTICATED`, `FIN_BAD_ARGS`, `FIN_PAYLOAD_TYPE`,
  `FIN_TENANT_ACCESS_DENIED`, `FIN_PAYLOAD_UNKNOWN_KEY: %`,
  `FIN_SOURCE_TYPE_REQUIRED`, `FIN_SOURCE_TYPE_INVALID`,
  `FIN_SOURCE_ID_REQUIRED`).

No production DDL executed this turn.

## S. Files Created

None.

## T. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql`
  (+818 lines: 8 Scenario blocks + batch integrity block; Foundation
  and Gate preserved byte-identical).
- `docs/aml_1_b_1/stage_j5_2/preflight/25_turn_5a_2_b_t1_validation_authoring.md`
  (this file, updated in place per §4).

## U. Production Objects Modified

None.

## V. Persistent Business Rows Modified

None.

## W. Execution Classification

```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.

TURN 5A.2.b1:
8/8 SCENARIOS AUTHORED.
8/8 STATICALLY REVIEWED.
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2.b:
8/32 SCENARIOS AUTHORED.

TURN 5A.2:
8/40 EXECUTABLE SCENARIOS AUTHORED.

OVERALL T1:
8/54 EXECUTABLE SCENARIOS AUTHORED.
T1 NOT EXECUTED.
T1 NOT PASSED.
```

## X. Current T1/T2 Status

```text
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED.
T1 EXECUTABLE RPC SCENARIOS: 8/54 AUTHORED.
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 8/40 AUTHORED.
TURN 5A.2.b VALIDATION SCENARIOS: 8/32 AUTHORED.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## Y. Next Exact Turn

```text
Turn 5A.2.b2:
T1-A-09 through T1-A-16
+ 8 Independent SAVEPOINT Scenarios
+ Exact SQLSTATE/Token Capture
+ \gset Result Survival
+ 8 Additional Post-Rollback Scenario Summaries
+ Cumulative Turn-5A.2.b Progress 16/32
```

Do not begin it.

## Z. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase:
  J5.2-SLICE-01-EXECUTION — TURN 5A.2.b1.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AA. Stop Gate

Stopping after this Turn-5A.2.b1 report. Not beginning Turn 5A.2.b2,
Turn 5A.2.c, Turn 5A.3, T2, Turn 5R, Manual Acceptance, Slice 02, or
final Mini Documentation.
