# 25 — Turn 5A.2.b · T1 Independent Validation Scenario Authoring

## A. Verdict

**TURN 5A.2.b2 AUTHORED — T1-A-09 THROUGH T1-A-16 READY FOR TURN 5A.2.b3**

`TURN 5A.2.b2 INCREMENTAL AUTHORING EVIDENCE.
T1-A-01 THROUGH T1-A-16 AUTHORED.
TURN 5A.2.b PROGRESS: 16/32.
TURN 5A.2 PROGRESS: 16/40.
OVERALL T1 PROGRESS: 16/54.
SCENARIOS NOT EXECUTED.
TURN 5A.2.b3 REQUIRED.`

## B. Roadmap Position

Phase 2 — N+1B · Subphase J5.2-SLICE-01-EXECUTION · Turn 5A.2.b2.
Preceded by Turn 5A.2.b1 (T1-A-01..T1-A-08 authored).
Succeeded by Turn 5A.2.b3 (T1-A-17..T1-A-24).

## C. Skill Application

Applied: 03, 04, 06, 08, 19, 23, 25, 26.
No-op evidence: 05 (no RLS), 07 (no production TS), 10 (no UX), 12 (no i18n).
Excluded: Positive Checkout, Horse Order, permission-negative, T2,
Retail POS, Draft Invoice recovery, Phases N+2..N+4.

## D. Artifact Preflight

- Current HEAD: `ac111a2b1f2de26a56380431aa8af12aa9351bcf`
- SQL last-touch commit (pre-edit): `ac111a2b1f2de26a56380431aa8af12aa9351bcf`
- File-24 last-touch commit: `378c5d1ebb34da33aaff812402cad46ef4284110`
- File-25 last-touch commit (pre-edit): `937cf044855b57a63def885951484e3a167782b1`
- Pre-edit SQL SHA-256: `a8ae069ed42fd8730ddc3342c3fecba42f356fda9006066da4a1b3c4e29b6dd6`
- Pre-edit SQL line count: `1777`
- Post-b1 structural counts (pre-edit): 1 outer BEGIN, 1 final ROLLBACK,
  0 COMMIT, 8 explicit `create_source_checkout_invoice` invocations,
  8 SAVEPOINTs `sp_t1_a_01..08`, 8 ROLLBACK TO SAVEPOINT, 8 RELEASE
  SAVEPOINT, 8 unique `\gset` prefixes `a01_..a08_`, 8 authoritative
  Result inserts.
- Foundation Sections 0–11 preserved unchanged.
- Temp-Schema Role-Switch Gate preserved unchanged.
- T1-A-01..T1-A-08 Scenario blocks preserved byte-identical (including
  their Result inserts and the batch-integrity §13.Z block).
- File 25 updated in place per §4 (incremental authoring evidence).

## E. Six Locked Fingerprints

Not re-executed this turn; live catalog inspection confirms accepted values:

- `create_source_checkout_invoice` Raw   `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0`
- `create_source_checkout_invoice` Canonical `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f`
- `_finance_source_checkout_apply_trace` Raw   `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9`
- `_finance_source_checkout_apply_trace` Canonical `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f`
- `_invoice_items_validate_source` Raw   `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- `_invoice_items_validate_source` Canonical `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0`

Live `pg_proc.prosrc` inspection for `create_source_checkout_invoice`
confirmed the exact tokens used by this batch:

- `FIN_SOURCE_ID_INVALID`
- `FIN_LINK_KIND_REQUIRED`
- `FIN_LINK_KIND_INVALID`
- `FIN_PAYMENT_METHOD_REQUIRED`
- `FIN_PAYMENT_METHOD_INVALID`
- `FIN_PAYLOAD_TYPE: prices_include_tax`
- `FIN_PAYLOAD_TYPE: discount_amount`
- `FIN_DISCOUNT_INVALID`

All eight surface after the Section-0/1 gates and after the source-type
gates already covered by A-05..A-08, so no earlier gate can pre-empt.

## F. Temp Role-Switch Gate

Preserved byte-identical from Turn 5A.2.b. Not executed this turn.

```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.
```

## G. SQL Extension

- Final path: `supabase/tests/database/j5_1_source_checkout.test.sql`
- Pre-edit SHA / lines:  `a8ae069ed42fd8730ddc3342c3fecba42f356fda9006066da4a1b3c4e29b6dd6` / 1777
- Post-edit SHA / lines: `788f07bcb4ca5b29f753efce9e288d85ab249cbd436b12b7bfbb978c3700ce72` / 2649
- Outer BEGIN: 1
- Final ROLLBACK: 1
- COMMIT: 0
- Delta: +872 lines (8 Scenario blocks + new-batch integrity + cumulative
  16-Scenario integrity + refreshed §14 terminator comment). Zero
  deletions from Foundation, Gate, or A-01..A-08 blocks.

## H. Scenario Inventory

Authored this turn (8): T1-A-09, T1-A-10, T1-A-11, T1-A-12, T1-A-13,
T1-A-14, T1-A-15, T1-A-16.
Cumulative authored (16): T1-A-01..T1-A-16.
Deferred to Turn 5A.2.b3..b4: T1-A-17..T1-A-31, T1-A-33.
Retired (unchanged): T1-A-32.

## I. New RPC Invocation Count

Explicit `public.create_source_checkout_invoice(...)` paths added this
turn: **8** (required 8). Zero loops, zero dispatchers, zero dynamic SQL.

## J. Cumulative RPC Invocation Count

Explicit paths in the file: **16** (required 16).

## K. SAVEPOINT Map

| Scenario  | SAVEPOINT       | ROLLBACK TO | RELEASE |
|-----------|-----------------|-------------|---------|
| T1-A-09   | `sp_t1_a_09`    | ✓           | ✓       |
| T1-A-10   | `sp_t1_a_10`    | ✓           | ✓       |
| T1-A-11   | `sp_t1_a_11`    | ✓           | ✓       |
| T1-A-12   | `sp_t1_a_12`    | ✓           | ✓       |
| T1-A-13   | `sp_t1_a_13`    | ✓           | ✓       |
| T1-A-14   | `sp_t1_a_14`    | ✓           | ✓       |
| T1-A-15   | `sp_t1_a_15`    | ✓           | ✓       |
| T1-A-16   | `sp_t1_a_16`    | ✓           | ✓       |

Gate SAVEPOINT `sp_temp_role_gate` and A-01..A-08 SAVEPOINTs preserved
separately (not counted here).

## L. JWT Claims

For all 8 new Scenarios: scalar `request.jwt.claim.sub` and JSON object
`request.jwt.claims` bound (via `set_config(..., true)`) to the fixed
Actor read from `pg_temp.test_context`; DB role `authenticated` set with
`SET LOCAL ROLE`. `RESET ROLE` executed as the next top-level statement
after each authenticated block. Every Scenario asserts
`current_user = pg_temp.test_context.original_user`. Zero `psql :'…'`
interpolation inside any dollar-quoted body.

## M. SQLSTATE and Token Matrix

| ID       | SQLSTATE | Token                                     | Payload Mutation                                                            |
|----------|----------|-------------------------------------------|------------------------------------------------------------------------------|
| T1-A-09  | 23514    | FIN_SOURCE_ID_INVALID                     | `jsonb_set(base,'{source_id}','"not-a-uuid"')`                              |
| T1-A-10  | 23514    | FIN_LINK_KIND_REQUIRED                    | `base - 'link_kind'`                                                        |
| T1-A-11  | 23514    | FIN_LINK_KIND_INVALID                     | `jsonb_set(base,'{link_kind}','"bogus"')`                                   |
| T1-A-12  | 23514    | FIN_PAYMENT_METHOD_REQUIRED               | `base - 'payment_method'`                                                   |
| T1-A-13  | 23514    | FIN_PAYMENT_METHOD_INVALID                | `jsonb_set(base,'{payment_method}','"bitcoin"')`                            |
| T1-A-14  | 23514    | `FIN_PAYLOAD_TYPE: prices_include_tax`    | `jsonb_set(base,'{prices_include_tax}','"yes"', true)` (JSON string)         |
| T1-A-15  | 23514    | `FIN_PAYLOAD_TYPE: discount_amount`       | `jsonb_set(base,'{discount_amount}','"10"')` (JSON string)                  |
| T1-A-16  | 23514    | FIN_DISCOUNT_INVALID                      | `jsonb_set(base,'{discount_amount}','-1'::jsonb)` (numeric −1)              |

Base payload sourced from `pg_temp.test_a_base_payload` (lab_sample,
Fixture `dddd4444-…-0001`, link_kind deposit, payment_method cash,
discount_amount 0, one taxable item).

## N. Capture-Survival Map (`\gset` prefixes)

`a09_*, a10_*, a11_*, a12_*, a13_*, a14_*, a15_*, a16_*` — each prefix
appears exactly once, exported after per-Scenario assertions and before
`ROLLBACK TO SAVEPOINT`.

## O. New-Batch Result Ledger (Authored Expectation)

After A-09..A-16 and before the cumulative block:

- rows for A-09..A-16 = **8**
- unique new IDs = **8**
- Category A rows in the new set = **8**
- rows with `actual_status='success'` in the new set = **0**
- rows with `result_json IS NOT NULL` in the new set = **0**
- rows with `passed=true` in the new set = **8**
- rows with `assertion_count > 0` in the new set = **8**
- input/capture residue for A-09..A-16 = **0**
- Idempotency residue for the 8 new keys under
  `create_source_checkout_invoice` = **0**

## P. Cumulative Result Ledger (Authored Expectation)

Before the final outer ROLLBACK:

- `pg_temp.test_scenario_results` rows = **16**
- unique Scenario IDs = **16**
- exact ID set = `{T1-A-01..T1-A-16}`
- Category A rows = **16**
- rows with `actual_status='success'` = **0**
- rows with `result_json IS NOT NULL` = **0**
- rows with `passed=true` = **16**
- rows with `assertion_count > 0` = **16**
- rows for `T1-A-17` and later = **0**
- rows for `T1-A-32` = **0**
- rows for `T1-A-33 / T1-A-34 / T1-A-40 / T1-A-42` = **0**
- `pg_temp.test_scenario_inputs` rows = **0**
- `pg_temp.test_rpc_capture` rows = **0**

Rows are NOT claimed as runtime-passed; no qualified runner executed
this file this turn.

## Q. Financial Zero-Residue Assertions

Cumulative post-16-rollback re-check re-verifies:

- Active idempotency rows for the 16 A-01..A-16 keys under
  `create_source_checkout_invoice` = 0.
- Payment Account row for `test_context.payment_account_id` still
  present and active.
- Foundation Section-9 fixture integrity and Section-11 preservation
  assertions remain the terminal preservation gate (unchanged).

## R. Static Integrity Results

Counts against post-edit SQL:

- New explicit RPC paths: 8/8; cumulative: 16/16.
- Independent new SAVEPOINTs: 8/8; cumulative: 16/16.
- `ROLLBACK TO SAVEPOINT sp_t1_a_*` new: 8; cumulative: 16.
- `RELEASE SAVEPOINT sp_t1_a_*` new: 8; cumulative: 16.
- Unique `\gset` prefixes new: 8 (`a09_..a16_`); cumulative: 16.
- Post-rollback authoritative Result inserts new: 8; cumulative: 16.
- Gate preserved: YES.
- Prohibited patterns
  `TODO|FIXME|pseudocode|runner extends|future runner|v_scenarios`: **0**.
- Loop / dispatcher / dynamic RPC construction: **0**.
- `psql :'…'` inside dollar-quoted body: **0**.
- `COMMIT;`, `session_replication_role`, `DISABLE TRIGGER`: **0**.
- A-17 or later Scenario bodies authored: **0**.
- Production-object modification: **0**.

## S. Live-Catalog Static Review

Live inspection of `pg_proc` confirmed:

- Function `create_source_checkout_invoice` signature remains
  `(uuid, uuid, jsonb)` — matches all 16 invocations.
- All 8 new tokens surface in `prosrc` verbatim
  (`FIN_SOURCE_ID_INVALID`, `FIN_LINK_KIND_REQUIRED`,
  `FIN_LINK_KIND_INVALID`, `FIN_PAYMENT_METHOD_REQUIRED`,
  `FIN_PAYMENT_METHOD_INVALID`, `FIN_PAYLOAD_TYPE: prices_include_tax`,
  `FIN_PAYLOAD_TYPE: discount_amount`, `FIN_DISCOUNT_INVALID`).

No production DDL executed this turn.

## T. Files Created

None.

## U. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql`
  (+872 lines: 8 Scenario blocks + new-batch integrity block +
  cumulative 16-Scenario integrity block + refreshed §14 terminator
  comment; Foundation, Gate, and A-01..A-08 preserved byte-identical).
- `docs/aml_1_b_1/stage_j5_2/preflight/25_turn_5a_2_b_t1_validation_authoring.md`
  (this file, updated in place per §4).

## V. Production Objects Modified

None.

## W. Persistent Business Rows Modified

None.

## X. Execution Classification

```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.

TURN 5A.2.b1:
8/8 SCENARIOS AUTHORED.
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2.b2:
8/8 SCENARIOS AUTHORED.
8/8 STATICALLY REVIEWED.
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2.b:
16/32 SCENARIOS AUTHORED.

TURN 5A.2:
16/40 EXECUTABLE SCENARIOS AUTHORED.

OVERALL T1:
16/54 EXECUTABLE SCENARIOS AUTHORED.
T1 NOT EXECUTED.
T1 NOT PASSED.
```

## Y. Current T1/T2 Status

```text
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED.
T1 EXECUTABLE RPC SCENARIOS: 16/54 AUTHORED.
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 16/40 AUTHORED.
TURN 5A.2.b VALIDATION SCENARIOS: 16/32 AUTHORED.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## Z. Next Exact Turn

```text
Turn 5A.2.b3:
T1-A-17 through T1-A-24
+ 8 Independent SAVEPOINT Scenarios
+ Notes and Client-Name Type Validation
+ 501-Character Notes Boundary Proof
+ Items Missing/Shape/Unknown-Key Validation
+ Exact SQLSTATE/Token Capture
+ \gset Result Survival
+ 8 Additional Post-Rollback Scenario Summaries
+ Cumulative Turn-5A.2.b Progress 24/32
```

Do not begin it.

## AA. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase:
  J5.2-SLICE-01-EXECUTION — TURN 5A.2.b2.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AB. Stop Gate

Stopping after this Turn-5A.2.b2 report. Not beginning Turn 5A.2.b3,
Turn 5A.2.c, Turn 5A.3, T2, Turn 5R, Manual Acceptance, Slice 02, or
final Mini Documentation.
