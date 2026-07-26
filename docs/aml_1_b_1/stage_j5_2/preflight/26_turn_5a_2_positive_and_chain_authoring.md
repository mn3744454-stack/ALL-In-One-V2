# 26 — Turn 5A.2.c · T1 Positive & Chain Authoring (P-02, Chain C1, Chain C2)

## A. Verdict

**TURN 5A.2.c AUTHORED — T1-P-02 + CHAIN C1 (T1-P-01, T1-P-06, T1-A-40) +
CHAIN C2 (T1-P-03, T1-A-34, T1-P-04, T1-A-42) COMPLETE.**

```
TURN 5A.2.c INCREMENTAL AUTHORING EVIDENCE.
T1-P-02 STANDALONE + CHAIN C1 (3) + CHAIN C2 (4) AUTHORED (8/8).
TURN 5A.2 PROGRESS: 40/40 (COMPLETE — Turn-5A.2 executable inventory
authored end-to-end; T1-A-32 retired and NOT counted).
OVERALL T1 PROGRESS: 40/54 (Sub-turn 5A.3 owns the remaining 14).
Post-edit SQL SHA-256:
  8e7757c8a4ba86e58f690ba2dc913278bb268c03f3598bb13ebe92108525ba34.
Post-edit SQL line count: 5980.
Structural counts: 1 outer BEGIN, 1 final ROLLBACK, 0 COMMIT,
40 explicit create_source_checkout_invoice invocations, 36 SAVEPOINTs
(32 A-scenario per-Scenario + 1 Temp-Role-Switch Gate + 1 sp_t1_p_02 +
2 chain group SAVEPOINTs), 36 ROLLBACK TO SAVEPOINT, 36 RELEASE SAVEPOINT.
SCENARIOS NOT EXECUTED (qualified runner required per File 17).
```

## B. Roadmap Position

Phase 2 — N+1B · Subphase J5.2-SLICE-01-EXECUTION · Turn 5A.2.c.
Preceded by Turn 5A.2.b4R (SHA reconciliation; baseline
`f8c89b704075d766633907a5859588914a6516c6e76649eef14c58a67fb572c1`,
4790 lines).
Succeeded by Sub-turn 5A.3 (Horse Order matrix, permission-negative matrix,
trigger accepts/rejects, payment-account absence).

## C. Skill Application

- Applied: 03 (Workflow Completeness), 04 (Tenant Isolation),
  06 (API/RPC Hardening), 08 (Schema/Migration Safety),
  19 (Platform Billing/Finance), 23 (Performance/Reliability),
  25 (QA/Release Readiness), 26 (Skill Network Governance).
- No-op (documented): 05 (no RLS change); 07 (no TypeScript change);
  10 (no UX change); 12 (no i18n change).
- Excluded: Horse Order Scenarios, permission-negative Scenarios,
  trigger accept/reject Scenarios, payment-account-absence Scenario,
  T2 failure-hook Scenarios, Retail POS, Draft Invoice recovery,
  Phases N+2..N+4.

## D. Artifact Preflight

- Pre-edit HEAD parent (reconciled baseline): commit `3082467562c1c174cedf00da2c798df9877fa06b`.
- Pre-edit SQL SHA-256:
  `f8c89b704075d766633907a5859588914a6516c6e76649eef14c58a67fb572c1`.
- Pre-edit SQL line count: `4790`.
- Post-edit SQL SHA-256:
  `8e7757c8a4ba86e58f690ba2dc913278bb268c03f3598bb13ebe92108525ba34`.
- Post-edit SQL line count: `5980` (delta = +1190 lines).
- Zero deletions from Foundation, Role-Switch Gate, or T1-A-01..T1-A-31 +
  T1-A-33 Scenarios; only Section 14 terminator comment refreshed and
  extended to reflect the new 40-invocation total.

## E. Six Locked Fingerprints

Not re-executed this turn. Live catalog values remain the accepted locks
(File 21 §A; File 24 §F):

- `create_source_checkout_invoice`
  Raw `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0`,
  Canonical `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f`.
- `_finance_source_checkout_apply_trace`
  Raw `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9`,
  Canonical `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f`.
- `_invoice_items_validate_source`
  Raw `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`,
  Canonical `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0`.

Live inspection of File 21 §H (rows T1-P-02, T1-P-01, T1-P-06, T1-A-40,
T1-P-03, T1-A-34, T1-P-04, T1-A-42), File 22 §D/§H, and File 23 rows 43
(`FIN_SOURCE_LINK_CONFLICT`, 23514) and 60 (`FIN_IDEMPOTENCY_CONFLICT`,
23514) confirmed the exact tokens and SQLSTATEs used by this batch.

The **17-key response contract** used by every Positive Scenario is sourced
verbatim from the live installed body of `create_source_checkout_invoice`
(preflight artifact 09, lines 540–558):

```
invoice_id, invoice_number, subtotal, tax_amount, discount_amount,
total_amount, prices_include_tax, currency, status, payment_method,
client_id, client_name, source_type, source_id, source_link_kind,
source_billing_link_id, payment_result
```

## F. Scenario Inventory

Authored this turn (8):

| ID       | Category | Chain | Source Fixture                | link_kind | Idempotency UUID                                | Expected                                                     |
|----------|----------|-------|-------------------------------|-----------|--------------------------------------------------|--------------------------------------------------------------|
| T1-P-02  | positive | —     | LS_COMPLETED_LEGACY (`…-003`) | final     | `22222222-2222-4222-8222-000000000001`           | SUCCESS + 17-key response; invoice status=`paid`             |
| T1-P-01  | positive | C1    | LS_ACCESSIONED_LEGACY (`…-002`)| deposit  | `11111111-1111-4111-8111-000000000001` (shared)  | SUCCESS + 17-key response; invoice + billing_link persisted   |
| T1-P-06  | positive | C1    | LS_ACCESSIONED_LEGACY          | deposit   | same as T1-P-01                                  | Replay; result byte-equal to T1-P-01; Δrows=0                |
| T1-A-40  | A        | C1    | LS_ACCESSIONED_LEGACY          | deposit   | same as T1-P-01                                  | `FIN_IDEMPOTENCY_CONFLICT` / 23514 (changed notes)           |
| T1-P-03  | positive | C2    | LS_COEXIST (`…-00b`, accessioned) | deposit| `22222222-2222-4222-8222-000000000002`           | SUCCESS + 17-key response                                    |
| T1-A-34  | A        | C2    | LS_COEXIST (accessioned)       | deposit   | `44444444-4444-4444-8444-000000000001` (FRESH)   | `FIN_SOURCE_LINK_CONFLICT` / 23514                           |
| T1-P-04  | positive | C2    | LS_COEXIST (→ completed)       | final     | `22222222-2222-4222-8222-000000000003`           | SUCCESS + distinct invoice; deposit link preserved           |
| T1-A-42  | A        | C2    | LS_COEXIST (completed)         | final     | `44444444-4444-4444-8444-000000000002` (FRESH)   | `FIN_SOURCE_LINK_CONFLICT` / 23514                           |

Cumulative authored across Turn 5A.2: 40 executable Scenarios (35 A + 5
positive; T1-A-32 retired and NOT counted). Deferred to Sub-turn 5A.3:
14 (6 A + 4 B + 4 positive) per File 21 §O.3.

## G. SAVEPOINT Map

| Scenario | SAVEPOINT                       | ROLLBACK TO | RELEASE |
|----------|---------------------------------|-------------|---------|
| T1-P-02  | `sp_t1_p_02` (independent)      | ✓           | ✓       |
| T1-P-01  | `sp_chain_lab_replay` (chain)   | (group)     | (group) |
| T1-P-06  | `sp_chain_lab_replay` (chain)   | (group)     | (group) |
| T1-A-40  | `sp_chain_lab_replay` (chain)   | ✓           | ✓       |
| T1-P-03  | `sp_chain_lab_coexistence`      | (group)     | (group) |
| T1-A-34  | `sp_chain_lab_coexistence`      | (group)     | (group) |
| T1-P-04  | `sp_chain_lab_coexistence`      | (group)     | (group) |
| T1-A-42  | `sp_chain_lab_coexistence`      | ✓           | ✓       |

Chain group SAVEPOINTs are established once at chain start and torn down
once at chain end. No per-Scenario rollback occurs inside a chain — that
would erase the prerequisite Deposit/Final row and either prevent the
same-source link-conflict guard from firing (C2) or invalidate replay/
conflict evidence against the shared idempotency key (C1).

## H. RPC Invocation Counts

- New explicit paths this turn: **8** (required 8).
- Cumulative explicit paths in the file: **40** (required 40).
- Zero loops, zero dispatchers, zero dynamic SQL.

## I. JWT Claims and Role Handling

For each of the 8 new Scenarios, scalar `request.jwt.claim.sub` and JSON
object `request.jwt.claims` are bound (via `set_config(..., true)`) to the
fixed Actor read from `pg_temp.test_context`. DB role `authenticated` is
set with `SET LOCAL ROLE`. `RESET ROLE` executes as the next top-level
statement after each authenticated block. Every Scenario asserts
`current_user = pg_temp.test_context.original_user`. Zero `psql :'…'`
interpolation appears inside any dollar-quoted body.

The privileged mid-C2 `UPDATE public.lab_samples SET status='processing'`
and `SET status='completed'` statements execute under the original session
role (after `RESET ROLE` from T1-A-34), inside the outer transaction and
inside `sp_chain_lab_coexistence`. Both are unwound by the final
`ROLLBACK TO SAVEPOINT sp_chain_lab_coexistence`.

## J. Response Contract Introspection (Positive Scenarios)

Each of {T1-P-02, T1-P-01, T1-P-06, T1-P-03, T1-P-04} asserts:

1. The returned `jsonb` result is an object.
2. `jsonb_object_keys` count equals exactly **17**.
3. No keys are present outside the 17-key allowlist (unexpected-key guard).
4. Every one of the 17 keys is present (missing-key guard).
5. Business fields match the scenario intent (`source_type`, `source_id`,
   `source_link_kind`, `payment_method`, `status='paid'`, positive
   `total_amount`, `payment_result` is a JSON object).
6. The returned `invoice_id` and `source_billing_link_id` correspond to
   real, persisted rows in `public.invoices` and `public.billing_links`
   for the Primary Tenant.

## K. Chain-Specific Invariants

### Chain C1 — `sp_chain_lab_replay`

- Pre-invocation: T1-P-06 payload is byte-equal to T1-P-01 payload
  (`IS DISTINCT FROM` asserted false); T1-A-40 payload differs from
  T1-P-01 (asserted true).
- T1-P-06: `result_json` from T1-P-06 is byte-equal to `result_json`
  from T1-P-01 (`IS DISTINCT FROM` asserted false). Exactly one invoice
  row exists for the C1 invoice_id; exactly one deposit billing_link
  exists for LS_ACCESSIONED_LEGACY (no duplication under replay).
- Terminal invariants before rollback: 1 invoice, 1 deposit billing_link,
  1 invoice_item, ≥2 ledger_entries, exactly 1
  `finance_request_idempotency` row for the shared C1 key.
- Post-rollback residue: 0 billing_links and 0 idempotency rows for
  LS_ACCESSIONED_LEGACY / C1 key.

### Chain C2 — `sp_chain_lab_coexistence`

- Pre-invocation: LS_COEXIST status asserted `accessioned` before T1-P-03
  and T1-A-34; asserted `completed` after the privileged transitions and
  before T1-P-04 and T1-A-42.
- T1-A-34: still-`accessioned` guard proves duplicate-Deposit reaches
  `FIN_SOURCE_LINK_CONFLICT` under the live validation order (Source
  Status → same-Kind Link-Conflict). FRESH idempotency key
  (`44444444-…-000000000001`) bypasses idempotency interception.
- T1-A-42: still-`completed` guard proves duplicate-Final reaches
  `FIN_SOURCE_LINK_CONFLICT` symmetrically. FRESH key
  `44444444-…-000000000002`.
- Terminal invariants before rollback: exactly 1 active deposit link and
  exactly 1 active final link on LS_COEXIST; two DISTINCT invoice IDs
  (P-03 vs P-04), both `paid`.
- Post-rollback residue: 0 billing_links on LS_COEXIST; 0 idempotency
  rows for all 4 C2 keys; LS_COEXIST status reverted to `accessioned`.

## L. Captured Result Ledger (Authored Expectation)

After the two chain rollbacks and before the final outer ROLLBACK:

- `pg_temp.test_scenario_results` rows = **40**
  (32 A-scenarios from Turn 5A.2.b + 3 A-scenarios from Turn 5A.2.c +
   5 positive Scenarios from Turn 5A.2.c).
- Category = 'A' rows = **35**; Category = 'positive' rows = **5**.
- `chain_id = 'C1'` rows = **3** (P-01, P-06, A-40).
- `chain_id = 'C2'` rows = **4** (P-03, A-34, P-04, A-42).
- `passed = true` on every row.
- `assertion_count > 0` on every row.
- `result_json IS NOT NULL` on exactly the 5 positive rows.
- Rows for `T1-A-32` = **0**.
- Rows for scenarios outside {A-01..A-31, A-33, A-34, A-40, A-42,
  P-01..P-04, P-06} = **0**.
- `pg_temp.test_scenario_inputs` rows = **0**.
- `pg_temp.test_rpc_capture` rows = **0**.

Rows are NOT claimed as runtime-passed; no qualified runner executed
this file this turn.

## M. Financial Zero-Residue Assertions

`13.c.F` re-verifies, after both chain rollbacks:

- Zero `finance_request_idempotency` rows for the six new Turn-5A.2.c
  idempotency keys under `create_source_checkout_invoice`.
- Payment Account row for `test_context.payment_account_id` still present
  and active.
- Zero `billing_links` on LS_ACCESSIONED_LEGACY and LS_COEXIST source
  IDs after chain rollbacks.
- All 8 Fixture Lab Samples present with the locked status distribution
  (`draft=3, accessioned=2, completed=1, processing=1, cancelled=1`).
- LS_COEXIST status reverted to `accessioned`.
- Foundation Client and Lab-Horse Fixtures unchanged.
- Reserved missing Sample ID absent.
- No role leak; `current_user = pg_temp.test_context.original_user`.

## N. Static Integrity Results

Counts against post-edit SQL (verified via shell inspection):

- New explicit RPC paths: 8/8; cumulative: **40/40**.
- New SAVEPOINTs: 1 independent (`sp_t1_p_02`) + 2 chain group
  (`sp_chain_lab_replay`, `sp_chain_lab_coexistence`); cumulative
  SAVEPOINTs: **36** (32 A + 1 Gate + 1 P-02 + 2 chains).
- `ROLLBACK TO SAVEPOINT`: cumulative **36**.
- `RELEASE SAVEPOINT`: cumulative **36**.
- Unique `\gset` prefixes new: 8 (`p02_`, `p01_`, `p06_`, `a40_`,
  `p03_`, `a34_`, `p04_`, `a42_`).
- Post-rollback authoritative Result inserts new: 8 (5 positive with
  `result_json`, 3 A with NULL `result_json`).
- Foundation, Gate, and A-01..A-33 blocks preserved: **YES**
  (byte-identical; the only lines rewritten outside the appended sections
  are the Section-14 terminator comment and the final `ROLLBACK`).
- Prohibited patterns
  `TODO|FIXME|pseudocode|runner extends|future runner|v_scenarios`: **0**.
- Loop / dispatcher / dynamic RPC construction: **0**.
- `psql :'…'` inside dollar-quoted body: **0**.
- `COMMIT;`, `session_replication_role`, `DISABLE TRIGGER`: **0**.
- Sub-turn-5A.3 Scenario bodies authored: **0**.
- Production-object modification: **0**.

## O. Live-Catalog Static Review

- `create_source_checkout_invoice(uuid, uuid, jsonb)` signature confirmed
  unchanged; all 40 invocations use that signature.
- 17-key response contract confirmed against preflight artifact 09
  lines 540–558.
- `FIN_IDEMPOTENCY_CONFLICT` SQLSTATE `23514` confirmed against File 23
  row 60.
- `FIN_SOURCE_LINK_CONFLICT` SQLSTATE `23514` confirmed against File 23
  row 43.
- Live validation order (Source Status Validation → same-Kind Source-Link
  Conflict Guard) confirmed against File 21 §Live validation order — this
  is the invariant that forces the C2 A-34 probe to run BEFORE the
  privileged accessioned→processing→completed transition and the C2 A-42
  probe to run AFTER it.
- No production DDL executed this turn.

## P. Files Created

- `docs/aml_1_b_1/stage_j5_2/preflight/26_turn_5a_2_positive_and_chain_authoring.md`
  (this file).

## Q. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql`
  (+1190 lines: 4 cached Temp payload tables, 1 standalone Scenario,
  2 chain group blocks totaling 7 Scenarios, 1 new-batch integrity block,
  1 cumulative 40-Scenario integrity lock, 1 cumulative financial
  zero-residue re-check, and a rewritten Section-14 terminator).
- `docs/aml_1_b_1/stage_j5_2/preflight/25_turn_5a_2_b_t1_validation_authoring.md`
  (cross-reference addendum only; recorded SHA `f8c89b70…` and lines 4790
  as the reconciled 5A.2.b closing baseline superseded by this turn).

## R. Files Inspected (Not Modified)

- `docs/aml_1_b_1/stage_j5_2/preflight/09_create_source_checkout_invoice_post_migration_a.sql`
  (17-key response contract).
- `docs/aml_1_b_1/stage_j5_2/preflight/21_turn_5a_1_live_test_contracts.md`
  (Scenario contracts, live validation order, Chain lifecycles).
- `docs/aml_1_b_1/stage_j5_2/preflight/22_turn_5a_fixture_uuid_map.md`
  (exact Idempotency UUID map, coexistence lifecycle).
- `docs/aml_1_b_1/stage_j5_2/preflight/23_turn_5a_error_token_matrix.md`
  (SQLSTATE/token surface for A-34, A-40, A-42).
- `docs/aml_1_b_1/stage_j5_2/preflight/24_turn_5a_2_t1_lab_foundation_authoring.md`.

## S. Production Objects Modified

None.

## T. Persistent Business Rows Modified

None.

## U. Execution Classification

```text
TEMP ROLE-SWITCH GATE: AUTHORED. EXECUTION NOT PROVEN.

TURN 5A.2.c:
8/8 SCENARIOS AUTHORED.
0/8 EXECUTED.
0/8 PASSED.

TURN 5A.2:
40/40 EXECUTABLE SCENARIOS AUTHORED.

OVERALL T1:
40/54 EXECUTABLE SCENARIOS AUTHORED.
T1 NOT EXECUTED.
T1 NOT PASSED.
```

## V. Current T1/T2 Status

```text
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED.
T1 EXECUTABLE RPC SCENARIOS: 40/54 AUTHORED.
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 40/40 AUTHORED (COMPLETE).
TURN 5A.2.c FINAL POSITIVE + CHAIN SCENARIOS: 8/8 AUTHORED.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## W. Next Exact Turn

```text
Turn 5A.3.a (owned by Sub-turn 5A.3, per File 21 §O.2):
Horse Order matrix (T1-A-35..T1-A-39 + T1-P-05)
+ permission-negative matrix (T1-B-01..T1-B-04)
+ trigger accept/reject matrix (T1-P-07..T1-P-09 + T1-A-41)
+ per-Scenario permission and payment-account SAVEPOINT shaping.
```

Do NOT begin it in this turn.

## X. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase:
  J5.2-SLICE-01-EXECUTION — TURN 5A.2.c.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## Y. Stop Gate

Stopping after this Turn-5A.2.c report. Not beginning Sub-turn 5A.3,
Turn 5R, T2 authoring, Manual Acceptance, Slice 02, or final Mini
Documentation.
