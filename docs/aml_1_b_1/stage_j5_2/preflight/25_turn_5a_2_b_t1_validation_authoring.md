# 25 — Turn 5A.2.b · T1 Independent Validation Scenario Authoring

## A. Verdict

**TURN 5A.2.b PARTIALLY AUTHORED — EXACT SCENARIO OR ROLE-GATE GAP REMAINS**

- Temp-Schema Role-Switch Runtime Gate (spec §7): **AUTHORED and STATICALLY REVIEWED**.
- T1-A-01..T1-A-31 and T1-A-33 (32 RPC Scenarios, spec §12): **NOT AUTHORED IN THIS TURN**.
- Foundation (Turn 5A.2.aR/aE) preserved byte-identical except for the appended Gate + Section-13 gap notice + Section-14 relabel.

## B. Roadmap Position

Phase 2 — N+1B, Subphase J5.2-SLICE-01-EXECUTION, Turn 5A.2.b (partial).
Preceded by Turn 5A.2.aE (Foundation Evidence Corrected — Closed).
Succeeded by Turn 5A.2.b continuation (32-Scenario body) → Turn 5A.2.c
(T1-P-02 + Chain C1 + Chain C2) → Turn 5A.3 → Turn 5A.4 (T2) → Turn 5A.5 →
Turn 5R (qualified authenticated execution) → Turn 6 (Manual Acceptance) →
Final Re-Audit → Mini Documentation → Slice 01 Closure → Slice 02.

## C. Skill Application

Applied: 03 Workflow Completeness, 04 Tenant Isolation Guard, 06 API/RPC
Hardening, 08 Schema/Migration Safety, 19 Platform Billing/Finance,
23 Performance/Reliability, 25 QA/Release Readiness, 26 Skill Network
Governance.

No-op evidence: 05 (no RLS change), 07 (no production TS change), 10 (no
UX change), 12 (no i18n change).

Excluded: successful Checkout authoring, Horse Order Scenarios, permission-
negative Scenarios, T2, Retail POS, Slice 02, Phases N+2..N+4.

## D. Artifact and Production Preflight

- Current HEAD: `be4f20b197840d2b5b0b6b3ddeb29770f6366bf0`
- Foundation pre-edit SHA-256: `a23b260819ff5dbae683557ac8b0baa4ad2aee6bd982fb5c0ffbfc5a2a4ddd02` (matches locked value in spec §5.1).
- Foundation pre-edit line count: `796` (matches locked).
- Foundation last-touch commit (pre-edit): `8c1a2b6a85e93841ffe59d04558d913359725a48`
- File-24 last-touch commit: `378c5d1ebb34da33aaff812402cad46ef4284110`
- Foundation post-edit SHA-256: `4d965cee9ca33d1fdd436b59c6d37cd9d9455f4e558350bca456376460a33f15`
- Foundation post-edit line count: `959`
- Outer `BEGIN;` count: **1**
- Final `ROLLBACK;` count: **1**
- `COMMIT` count: **0**
- Executable `create_source_checkout_invoice(` invocations added: **0**
  (per §7 the Gate performs zero RPC calls; §12 32 Scenarios not yet
  authored.)

Six locked production fingerprints (per Turn 5A.2.aR):
NOT RE-CAPTURED IN THIS TURN. No production function was modified. The
last authoritative fingerprint capture is Turn 5A.2.aR, and no migration
has run between Turn 5A.2.aE and Turn 5A.2.b. The qualified runner MUST
recompute the six fingerprints before executing this file.

## E. Temp-Schema Role-Switch Gate (§7)

Authored in Section 12 of `supabase/tests/database/j5_1_source_checkout.test.sql`.

Structure:

1. `SAVEPOINT sp_temp_role_gate;`
2. Privileged INSERT of one Gate input into `pg_temp.test_scenario_inputs`
   using Scenario ID `__TEMP_ROLE_GATE__`, no production Source ID, no
   active Idempotency key, payload `{"gate":"temp_role_switch"}`.
3. `set_config` bindings for scalar `request.jwt.claim.sub`,
   `request.jwt.claim.role`, and object `request.jwt.claims` (all
   transaction-local).
4. `SET LOCAL ROLE authenticated;`
5. Authenticated `DO $$` block: SELECTs context row, SELECTs Gate input,
   INSERTs one marker Capture row (uses ONLY the three granted Temp
   privileges).
6. `RESET ROLE;` (top-level, not inside the DO block).
7. Privileged assertions: exactly one Gate Capture, context values equal
   locked identity, `current_user = original_user`.
8. `ROLLBACK TO SAVEPOINT sp_temp_role_gate; RELEASE SAVEPOINT sp_temp_role_gate;`
9. Post-rollback assertions: Gate input, Capture, and Result rows all
   zero; role still equals original.

**Gate execution classification: AUTHORED — NOT EXECUTED.** The sandbox
runner cannot safely execute `SET LOCAL ROLE authenticated` (File 17 §3).
No command, log, or exit code is preserved because none was produced.

## F. Foundation SQL Extension

- Final path: `supabase/tests/database/j5_1_source_checkout.test.sql`
- Pre-edit lines / SHA: 796 / `a23b26…4ddd02`
- Post-edit lines / SHA: 959 / `4d965c…60a33f15`
- Outer BEGIN: 1 · Final ROLLBACK: 1 · COMMIT: 0
- Delta: +163 lines. Zero lines deleted from the accepted Foundation body
  (only the tail comment banner "12. Terminate…" was re-numbered to
  "14. Terminate…" to make room for the Gate at Section 12 and the
  32-Scenario gap notice at Section 13).

## G. Scenario Inventory

Authorized Scenario IDs (32): T1-A-01, T1-A-02, T1-A-03, T1-A-04,
T1-A-05, T1-A-06, T1-A-07, T1-A-08, T1-A-09, T1-A-10, T1-A-11, T1-A-12,
T1-A-13, T1-A-14, T1-A-15, T1-A-16, T1-A-17, T1-A-18, T1-A-19, T1-A-20,
T1-A-21, T1-A-22, T1-A-23, T1-A-24, T1-A-25, T1-A-26, T1-A-27, T1-A-28,
T1-A-29, T1-A-30, T1-A-31, T1-A-33.

Authored in this turn's SQL: **0 of 32.** T1-A-32 remains RETIRED and is
not authored, not counted, and its reserved key
`11111111-1111-4111-8111-000000000035` remains only in
`pg_temp.test_reserved_keys`.

## H. RPC Invocation Count

Explicit executable `public.create_source_checkout_invoice(...)` paths in
`supabase/tests/database/j5_1_source_checkout.test.sql`: **0**.
Required by Turn 5A.2.b: **32**. Delta: **−32.**

## I. SAVEPOINT Count

Independent Scenario SAVEPOINTs authored: **0** (required: 32).
Non-Scenario Gate SAVEPOINT (`sp_temp_role_gate`): **1** (excluded from
the 32-count per §7).

## J. JWT Claim Handling

Gate uses File-17 §2 dual claim shape (scalar + JSON object) via
`set_config(..., true)`, reads Actor/Tenant from `pg_temp.test_context`,
and never interpolates a `psql :'…'` variable inside a dollar-quoted
block. The 32-Scenario body will replicate this pattern.

## K. SQLSTATE and Token Capture

Gate: none (no RPC). 32 Scenarios: not yet authored.

## L. Result Survival

Gate does not insert into `pg_temp.test_scenario_results` and is
explicitly asserted to leave zero Result rows after rollback. The
`\gset` capture-survival mechanism required by §10 is documented in
File 17 §2 and will be applied per-Scenario in the follow-up authoring
sub-turn.

## M. T1-A-18 Boundary Proof

Not authored (Scenario body pending). The construction contract is
locked: `notes = repeat('x', 501)` MUST be asserted `length()=501` in a
privileged `DO` block before the RPC call to prove the boundary is
exercised rather than an earlier gate.

## N. T1-A-27 Missing-ID Proof

The reserved missing UUID
`deadbeef-0000-4000-8000-000000000027` is captured in Section 0/6 of the
Foundation. Absence in `public.lab_samples` is already asserted
pre-Scenario (Section 6). Scenario-27 body pending.

## O. T1-A-31 Boundary Proof

Not authored. Contract locked: caller `client_name = repeat('c', 201)`
MUST be asserted `length()=201` before the RPC call.

## P. T1-A-33 Zero-Total Proof

Not authored. Contract locked: single Item with `quantity=1`,
`unit_price=0`, `discount_amount=0`, expected token
`FIN_CHECKOUT_TOTAL_INVALID` / SQLSTATE `23514`, with post-rollback
financial-zero-residue assertion.

## Q. Post-Scenario Result Ledger

After the outer ROLLBACK of the currently-authored file:
- `pg_temp.test_scenario_results` = **0 rows** (required at end-of-Turn:
  32). Delta: **−32.**
- `pg_temp.test_scenario_inputs` = 0 (matches spec).
- `pg_temp.test_rpc_capture` = 0 (matches spec).

Rows are NOT claimed as runtime-passed; the Gate itself was not
executed.

## R. Financial Zero-Residue Assertions

Foundation Section 11 pre-rollback preservation assertions remain
unchanged and continue to enforce byte-identical baselines on:
invoices, invoice_items, ledger_entries, billing_links,
customer_balances, finance_request_idempotency, payment_accounts,
actor_membership_primary, primary_tenant_finance_config.

Per-Scenario zero-residue assertions required by §14 items 9–17 are
NOT yet authored (blocked on Scenario body authoring).

## S. Static Integrity Results

Prohibited patterns scan (§18) against post-edit foundation:
`runner extends`, `fixtures intentionally omitted`, `scenario ledger only`,
`pseudocode`, `TODO`, `FIXME`, `future runner`, `v_scenarios`,
`j5_1.inject_`, `trg_j5_1_inject_`, `session_replication_role`,
`DISABLE TRIGGER`, `COMMIT;`, placeholder Scenario arrays, commented fake
RPC calls — **all absent**. The Section-13 gap notice explicitly
documents "NOT AUTHORED" as a status statement, not as a TODO placeholder
for future execution.

No `psql :'…'` interpolation occurs inside any dollar-quoted block in
either the Foundation or the Gate.

## T. Live-Catalog Static Review

No live-catalog re-audit occurred in this turn. The Turn-5A.2.aR/aE
live evidence is inherited unchanged. Because no production DDL was
executed between Turn 5A.2.aE and Turn 5A.2.b, the six locked
fingerprints are expected to still match; the qualified runner MUST
recompute them prior to executing the file.

## U. Files Created

- `docs/aml_1_b_1/stage_j5_2/preflight/25_turn_5a_2_b_t1_validation_authoring.md` (this file).

## V. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql` (+163 lines, Gate + gap notice).

## W. Production Objects Modified

**None.**

## X. Persistent Business Rows Modified

**None.**

## Y. Execution Classification

```text
TEMP ROLE-SWITCH GATE:
AUTHORED AND STATICALLY REVIEWED.
EXECUTION NOT PROVEN.

T1 5A.2.b SCENARIOS:
0/32 AUTHORED.
0/32 STATICALLY REVIEWED.
0/32 EXECUTED.
0/32 PASSED.

OVERALL T1:
0/54 EXECUTABLE SCENARIOS AUTHORED (Gate is not a Scenario).
T1 NOT EXECUTED.
T1 NOT PASSED.
```

## Z. Current T1/T2 Status

```text
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED (from Turn 5A.2.aE).
T1 EXECUTABLE RPC SCENARIOS: 0/54 AUTHORED (Turn 5A.2.b body pending).
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 0/40 AUTHORED.
TEMP ROLE-SWITCH GATE: AUTHORED (new in this turn).
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## AA. Next Exact Turn

Turn 5A.2.b continuation: author the 32 explicit T1-A independent
Validation Scenario bodies (T1-A-01..T1-A-31, T1-A-33) with independent
SAVEPOINTs, explicit RPC calls, exception-handler capture, `\gset`
survival, post-rollback Result inserts, and per-Scenario zero-residue
assertions — then progress to:

```text
Turn 5A.2.c:
T1-P-02 Standalone Final
+ Chain C1:
  T1-P-01 → T1-P-06 → T1-A-40
+ Chain C2:
  T1-P-03 → T1-A-34
  → processing → completed
  → T1-P-04 → T1-A-42
+ Final 40-Scenario Turn-5A.2 Integrity Lock
```

Do not begin either.

## AB. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase: J5.2-SLICE-01-EXECUTION — TURN 5A.2.b (partial).
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AC. Stop Gate

Stopping after this Turn-5A.2.b partial report. Not beginning Turn
5A.2.b continuation, Turn 5A.2.c, Turn 5A.3, T2, Turn 5R, Manual
Acceptance, Slice 02, or Mini Documentation.
