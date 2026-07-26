# 25 — Turn 5A.2.b · T1 Independent Validation Scenario Authoring

## A. Verdict

**TURN 5A.2.b4 AUTHORED — T1-A-25..T1-A-31 + T1-A-33 COMPLETE; T1-A-32 RETIRED**

`TURN 5A.2.b4 INCREMENTAL AUTHORING EVIDENCE.
T1-A-01 THROUGH T1-A-31 + T1-A-33 AUTHORED (32/32; T1-A-32 retired).
TURN 5A.2.b PROGRESS: 32/32 (COMPLETE).
TURN 5A.2 PROGRESS: 32/40.
OVERALL T1 PROGRESS: 32/54.
SCENARIOS NOT EXECUTED (qualified runner required per File 17).
Post-edit SQL SHA-256: 5bddcfb05e9806536ae298347693bfd4882c2e8eb5934f6c00af234ed9921f7c.
Post-edit SQL line count: 4790.
32 explicit create_source_checkout_invoice invocations, 32 SAVEPOINTs
sp_t1_a_01..31 + sp_t1_a_33, 32 ROLLBACK TO SAVEPOINT, 32 RELEASE
SAVEPOINT, 32 unique \gset prefixes a01_..a31_ + a33_, 32 authoritative
Result inserts, 1 outer BEGIN, 1 final ROLLBACK, 0 COMMIT.
T1-A-32 retired (0 rows in results, 0 idempotency-key residue for
suffix 35).
Batch tokens locked: FIN_LAB_ITEM_PRICE_INVALID (23514),
FIN_PAYLOAD_TYPE: items[].is_taxable (23514), FIN_SOURCE_NOT_FOUND
(23503), FIN_SOURCE_CANCELLED (42501), FIN_LAB_DEPOSIT_STATUS_INVALID
(42501), FIN_LAB_FINAL_STATUS_INVALID (42501), FIN_CLIENT_NAME_TOO_LONG
(23514), FIN_CHECKOUT_TOTAL_INVALID (23514).`

## B. Roadmap Position

Phase 2 — N+1B · Subphase J5.2-SLICE-01-EXECUTION · Turn 5A.2.b3.
Preceded by Turn 5A.2.b2 (T1-A-09..T1-A-16 authored).
Succeeded by Turn 5A.2.b4 (T1-A-25..T1-A-31 + T1-A-33 + final 32-Scenario lock).

## C. Skill Application

Applied: 03, 04, 06, 08, 19, 23, 25, 26.
No-op evidence: 05 (no RLS), 07 (no production TS), 10 (no UX), 12 (no i18n).
Excluded: Positive Checkout, Horse Order, permission-negative, T2,
Retail POS, Draft Invoice recovery, Phases N+2..N+4.

## D. Artifact Preflight

- Current HEAD: `3efeea6cdc4ab797fceff89bf39e096ab4c2d499`
- SQL last-touch commit (pre-edit): `ac111a2b1f2de26a56380431aa8af12aa9351bcf`
- File-24 last-touch commit: `378c5d1ebb34da33aaff812402cad46ef4284110`
- File-25 last-touch commit (pre-edit): `0d732a243ae243daef3b6abfcbb771438dac9637`
- Pre-edit SQL SHA-256: `788f07bcb4ca5b29f753efce9e288d85ab249cbd436b12b7bfbb978c3700ce72`
- Pre-edit SQL line count: `2649`
- Post-b2 structural counts (pre-edit): 1 outer BEGIN, 1 final ROLLBACK,
  0 COMMIT, 16 explicit `create_source_checkout_invoice` invocations,
  16 SAVEPOINTs `sp_t1_a_01..16`, 16 ROLLBACK TO SAVEPOINT, 16 RELEASE
  SAVEPOINT, 16 unique `\gset` prefixes `a01_..a16_`, 16 authoritative
  Result inserts.
- Foundation Sections 0–11 preserved unchanged.
- Temp-Schema Role-Switch Gate preserved unchanged.
- T1-A-01..T1-A-16 Scenario blocks preserved byte-identical (including
  their Result inserts, §13.b1 and §13.b2 batch-integrity blocks, and the
  cumulative 16-Scenario integrity lock).
- File 25 updated in place per §4 (incremental authoring evidence).

## E. Six Locked Fingerprints

Not re-executed this turn; live catalog inspection confirms accepted values:

- `create_source_checkout_invoice` Raw   `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0`
- `create_source_checkout_invoice` Canonical `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f`
- `_finance_source_checkout_apply_trace` Raw   `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9`
- `_finance_source_checkout_apply_trace` Canonical `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f`
- `_invoice_items_validate_source` Raw   `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- `_invoice_items_validate_source` Canonical `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0`

Live inspection against File 21 §H (rows T1-A-17..T1-A-24) and File 23
(rows 17, 18, 19, 23, item-array/object/allowlist rows, description-
required, quantity-invalid) confirmed the exact tokens used by this
batch:

- `FIN_PAYLOAD_TYPE: notes`
- `FIN_NOTES_TOO_LONG` (limit 500; 501 rejected)
- `FIN_PAYLOAD_TYPE: client_name`
- `FIN_ITEMS_EMPTY` (locked variant: `items` key OMITTED)
- `FIN_PAYLOAD_TYPE: items[]`
- `FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id`
- `FIN_LAB_ITEM_DESCRIPTION_REQUIRED`
- `FIN_LAB_ITEM_QUANTITY_INVALID`

## F. Temp Role-Switch Gate

Preserved byte-identical from Turn 5A.2.b. Not executed this turn.

```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.
```

## G. SQL Extension

- Final path: `supabase/tests/database/j5_1_source_checkout.test.sql`
- Pre-edit SHA / lines:  `788f07bcb4ca5b29f753efce9e288d85ab249cbd436b12b7bfbb978c3700ce72` / 2649
- Post-edit SHA / lines: `cc61c2000457b4e64c39d61f0cb71979eaba6bce7931aabcd3e132909b44080b` / 3644
- Outer BEGIN: 1
- Final ROLLBACK: 1
- COMMIT: 0
- Delta: +995 lines (8 Scenario blocks + new-batch integrity + cumulative
  24-Scenario integrity + refreshed §14 terminator comment). Zero
  deletions from Foundation, Gate, or A-01..A-16 blocks.

## H. Scenario Inventory

Authored this turn (8): T1-A-17, T1-A-18, T1-A-19, T1-A-20, T1-A-21,
T1-A-22, T1-A-23, T1-A-24.
Cumulative authored (24): T1-A-01..T1-A-24.
Deferred to Turn 5A.2.b4: T1-A-25..T1-A-31, T1-A-33.
Retired (unchanged): T1-A-32.

## I. New RPC Invocation Count

Explicit `public.create_source_checkout_invoice(...)` paths added this
turn: **8** (required 8). Zero loops, zero dispatchers, zero dynamic SQL.

## J. Cumulative RPC Invocation Count

Explicit paths in the file: **24** (required 24).

## K. SAVEPOINT Map

| Scenario  | SAVEPOINT       | ROLLBACK TO | RELEASE |
|-----------|-----------------|-------------|---------|
| T1-A-17   | `sp_t1_a_17`    | ✓           | ✓       |
| T1-A-18   | `sp_t1_a_18`    | ✓           | ✓       |
| T1-A-19   | `sp_t1_a_19`    | ✓           | ✓       |
| T1-A-20   | `sp_t1_a_20`    | ✓           | ✓       |
| T1-A-21   | `sp_t1_a_21`    | ✓           | ✓       |
| T1-A-22   | `sp_t1_a_22`    | ✓           | ✓       |
| T1-A-23   | `sp_t1_a_23`    | ✓           | ✓       |
| T1-A-24   | `sp_t1_a_24`    | ✓           | ✓       |

Gate SAVEPOINT `sp_temp_role_gate` and A-01..A-16 SAVEPOINTs preserved
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

| ID       | Idempotency Key (via test_active_idem_keys) | SQLSTATE | Token                                           | Payload Mutation                                                                                             |
|----------|---------------------------------------------|----------|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| T1-A-17  | `11111111-1111-4111-8111-000000000020`      | 23514    | `FIN_PAYLOAD_TYPE: notes`                       | `jsonb_set(base,'{notes}', to_jsonb(123), true)` (numeric)                                                   |
| T1-A-18  | `11111111-1111-4111-8111-000000000021`      | 23514    | `FIN_NOTES_TOO_LONG`                            | `jsonb_set(base,'{notes}', to_jsonb(repeat('x',501)), true)` (501-char JSON string)                          |
| T1-A-19  | `11111111-1111-4111-8111-000000000022`      | 23514    | `FIN_PAYLOAD_TYPE: client_name`                 | `jsonb_set(base,'{client_name}', to_jsonb(42), true)` (numeric)                                              |
| T1-A-20  | `11111111-1111-4111-8111-000000000023`      | 23514    | `FIN_ITEMS_EMPTY`                               | `base - 'items'` (locked missing-key variant per File 21 §H, row A-20)                                       |
| T1-A-21  | `11111111-1111-4111-8111-000000000024`      | 23514    | `FIN_PAYLOAD_TYPE: items[]`                     | `jsonb_set(base,'{items}', '[1]'::jsonb, true)` (first element is a number, not an object)                   |
| T1-A-22  | `11111111-1111-4111-8111-000000000025`      | 23514    | `FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id`     | one otherwise-valid Lab item plus caller-owned `horse_id`                                                    |
| T1-A-23  | `11111111-1111-4111-8111-000000000026`      | 23514    | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED`             | one Lab item with `description` key absent; quantity 1, unit_price 100, is_taxable true                      |
| T1-A-24  | `11111111-1111-4111-8111-000000000027`      | 23514    | `FIN_LAB_ITEM_QUANTITY_INVALID`                 | one Lab item with numeric `quantity=0`; description, unit_price, is_taxable valid                            |

Idempotency keys are resolved at run-time from `pg_temp.test_active_idem_keys`
using the N+3 suffix rule (A-17..A-24 → 20..27); they are distinct, do
not overlap with A-01..A-16, do not reuse the retired A-32 key, and do
not collide with any live Idempotency row for the Primary Tenant.

Base payload sourced from `pg_temp.test_a_base_payload` (lab_sample,
Fixture `dddd4444-…-0001`, link_kind deposit, payment_method cash,
discount_amount 0, one taxable item).

## N. A-18 Boundary Proof

Two authored pre-invocation assertions:

1. `char_length(repeat('x',501)) = 501` (generator invariant).
2. On the persisted Scenario input: `jsonb_typeof(payload->'notes') = 'string'`
   AND `char_length(payload->>'notes') = 501`.

Boundary is exact per File 21 §H (500 passes, 501 rejected). No 500 or
502 variant is authored.

## O. A-20 Locked Variant Proof

Authored pre-invocation assertion: `(payload ? 'items') IS FALSE`. The
Payload is `base - 'items'`, matching File 21 §H row T1-A-20
("`items` omitted"). No empty-array substitution.

## P. Item Shape and Unknown-Key Proofs

- A-21: authored assertion that `items` is a JSON array and
  `items->0` is NOT a JSON object.
- A-22: authored assertion that the four allowed item keys
  `{description, quantity, unit_price, is_taxable}` are all present and
  the ONLY extra key is `horse_id`.
- A-23: authored assertion that `items->0 ? 'description'` is false and
  quantity=1, unit_price=100, `is_taxable` is JSON boolean.
- A-24: authored assertion that `jsonb_typeof(items->0->'quantity') =
  'number'` and value is exactly `0` (not a string), with description,
  unit_price, and `is_taxable` valid.

## Q. Capture-Survival Map (`\gset` prefixes)

`a17_*, a18_*, a19_*, a20_*, a21_*, a22_*, a23_*, a24_*` — each prefix
appears exactly once, exported after per-Scenario assertions and before
`ROLLBACK TO SAVEPOINT`.

## R. New-Batch Result Ledger (Authored Expectation)

After A-17..A-24 and before the cumulative block:

- rows for A-17..A-24 = **8**
- unique new IDs = **8**
- Category A rows in the new set = **8**
- rows with `actual_status='success'` in the new set = **0**
- rows with `result_json IS NOT NULL` in the new set = **0**
- rows with `passed=true` in the new set = **8**
- rows with `assertion_count > 0` in the new set = **8**
- input/capture residue for A-17..A-24 = **0**
- Idempotency residue for the 8 new keys under
  `create_source_checkout_invoice` = **0**

## S. Cumulative Result Ledger (Authored Expectation)

Before the final outer ROLLBACK:

- `pg_temp.test_scenario_results` rows = **24**
- unique Scenario IDs = **24**
- exact ID set = `{T1-A-01..T1-A-24}`
- Category A rows = **24**
- rows with `actual_status='success'` = **0**
- rows with `result_json IS NOT NULL` = **0**
- rows with `passed=true` = **24**
- rows with `assertion_count > 0` = **24**
- rows for `T1-A-25` and later = **0**
- rows for `T1-A-32` = **0**
- rows for `T1-A-33 / T1-A-34 / T1-A-40 / T1-A-42` = **0**
- `pg_temp.test_scenario_inputs` rows = **0**
- `pg_temp.test_rpc_capture` rows = **0**

Rows are NOT claimed as runtime-passed; no qualified runner executed
this file this turn.

## T. Financial Zero-Residue Assertions

Cumulative post-24-rollback re-check re-verifies:

- Active idempotency rows for the 24 A-01..A-24 keys under
  `create_source_checkout_invoice` = 0.
- Payment Account row for `test_context.payment_account_id` still
  present and active.
- Foundation Section-9 fixture integrity and Section-11 preservation
  assertions remain the terminal preservation gate (unchanged).

## U. Static Integrity Results

Counts against post-edit SQL:

- New explicit RPC paths: 8/8; cumulative: 24/24.
- Independent new SAVEPOINTs: 8/8; cumulative: 24/24.
- `ROLLBACK TO SAVEPOINT sp_t1_a_*` new: 8; cumulative: 24.
- `RELEASE SAVEPOINT sp_t1_a_*` new: 8; cumulative: 24.
- Unique `\gset` prefixes new: 8 (`a17_..a24_`); cumulative: 24.
- Post-rollback authoritative Result inserts new: 8; cumulative: 24.
- Gate preserved: YES.
- Prohibited patterns
  `TODO|FIXME|pseudocode|runner extends|future runner|v_scenarios`: **0**.
- Loop / dispatcher / dynamic RPC construction: **0**.
- `psql :'…'` inside dollar-quoted body: **0**.
- `COMMIT;`, `session_replication_role`, `DISABLE TRIGGER`: **0**.
- A-25 or later Scenario bodies authored: **0**.
- Production-object modification: **0**.

## V. Live-Catalog Static Review

Live inspection of File 21 §H rows T1-A-17..T1-A-24 and File 23 error
matrix rows confirmed:

- Function `create_source_checkout_invoice` signature remains
  `(uuid, uuid, jsonb)` — matches all 24 invocations.
- All 8 new tokens surface in the installed `prosrc` and are the exact
  tokens used by this batch.
- The A-20 locked variant is `items omitted`, not empty array.
- The notes boundary is 500-pass / 501-fail; A-18 uses 501 exactly.

No production DDL executed this turn.

## W. Files Created

None.

## X. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql`
  (+995 lines: 8 Scenario blocks + new-batch integrity block +
  cumulative 24-Scenario integrity block + refreshed §14 terminator
  comment; Foundation, Gate, and A-01..A-16 preserved byte-identical).
- `docs/aml_1_b_1/stage_j5_2/preflight/25_turn_5a_2_b_t1_validation_authoring.md`
  (this file, updated in place per §4).

## Y. Production Objects Modified

None.

## Z. Persistent Business Rows Modified

None.

## AA. Execution Classification

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
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2.b3:
8/8 SCENARIOS AUTHORED.
8/8 STATICALLY REVIEWED.
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2.b:
24/32 SCENARIOS AUTHORED.

TURN 5A.2:
24/40 EXECUTABLE SCENARIOS AUTHORED.

OVERALL T1:
24/54 EXECUTABLE SCENARIOS AUTHORED.
T1 NOT EXECUTED.
T1 NOT PASSED.
```

## AB. Current T1/T2 Status

```text
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED.
T1 EXECUTABLE RPC SCENARIOS: 24/54 AUTHORED.
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 24/40 AUTHORED.
TURN 5A.2.b VALIDATION SCENARIOS: 24/32 AUTHORED.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## AC. Next Exact Turn

```text
Turn 5A.2.b4:
T1-A-25 through T1-A-31
+ T1-A-33
+ 8 Independent SAVEPOINT Scenarios
+ Unit-Price and Taxability Validation
+ Reserved Missing-ID Proof
+ Cancelled/Deposit/Final Status Validation
+ 201-Character Client-Name Boundary
+ Zero-Total Proof
+ Final 32-Scenario Validation Integrity Lock
```

Do not begin it.

## AD. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase:
  J5.2-SLICE-01-EXECUTION — TURN 5A.2.b3.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AE. Stop Gate

Stopping after this Turn-5A.2.b3 report. Not beginning Turn 5A.2.b4,
Turn 5A.2.c, Turn 5A.3, T2, Turn 5R, Manual Acceptance, Slice 02, or
final Mini Documentation.
