<!--
id: DHB-WS-2026-0003
title: WS-DH-2026-0003 — Economic Date Integrity
version: 1.2.0
status: current
audience: internal
date: 2026-08-04
last-verified: 2026-08-04
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 0 — Governance Persistence, under execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02 and Decision DEC-RM-DH-004-001. Initial package persistence only; the Investigative Audit has not started and no financial or technical work is authorized by this file.; v1.0.1 — RM-DH-004 / Phase 0 — Acceptance Persistence under execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-ACCEPTANCE-PERSISTENCE-04, following the passed read-only Acceptance Re-Audit PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-ACCEPTANCE-REAUDIT-03 and the explicit Owner Acceptance granted by Mohamed Nour: records the governance-package Acceptance and its persistence only. The Workstream Status remains ACTIVE — INVESTIGATIVE AUDIT PENDING and the Stage remains INVESTIGATIVE AUDIT PENDING. Governance-package Acceptance is not technical Workstream Acceptance; the Economic Date Investigative Audit has not started and no code, SQL, migration, backfill, QA, technical Acceptance or Closure is authorized or recorded.; v1.1.0 — RM-DH-004 / Phase 0 to Phase 1 Advancement Persistence under execution prompt PROMPT-DH-RM004-P0-PHASE-ADVANCEMENT-PERSISTENCE-06 and Decision DEC-RM-DH-004-002: records that RM-DH-004 Phase 1 — Economic Date Integrity is now the active Phase, extends the Stage History with the Acceptance Persistence Verification, the Owner Phase advancement decision and the Phase Advancement Persistence, and updates the Current State, Final Stopping Point and Next Permitted Step. The Workstream Status remains ACTIVE — INVESTIGATIVE AUDIT PENDING and the Stage remains INVESTIGATIVE AUDIT PENDING; the Economic Date Investigative Audit has not started and no code, SQL, migration, backfill, QA, technical Acceptance or Closure is authorized or recorded.; v1.1.1 — RM-DH-004 / Phase 1 — Stage A Acceptance Persistence under execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-ACCEPTANCE-PERSISTENCE-09, following the passed read-only Stage A Acceptance Re-Audit (Prompt 08, verdict STAGE A ACCEPTANCE PASSED — READY FOR OWNER ACCEPTANCE, zero blockers, OBS-A-01 non-blocking) and the explicit Owner Acceptance granted by Mohamed Nour on 03-08-2026 at 19:15 Asia/Riyadh (UTC+03:00): sets the Status to ACTIVE — STAGE A ACCEPTED; STAGE B NOT STARTED and the Stage to STAGE A ACCEPTED — ACCEPTANCE PERSISTENCE VERIFICATION PENDING, extends the Stage History to twenty-one rows recording the Stage A execution, Acceptance Re-Audit, Owner Acceptance and Acceptance Persistence, and updates the Current State, Final Stopping Point and Next Permitted Step. Stage A Acceptance is bounded and is not Workstream-wide Technical Acceptance; Stage B, Stage C and Stage D have not started; no code, SQL, migration, schema, database, QA, Workstream-wide Technical Acceptance or Closure is authorized or recorded.; v1.2.0 — RM-DH-004 / Phase 1 — Stage B Acceptance Persistence under execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-OWNER-ACCEPTANCE-PERSISTENCE-36, following the passed read-only Stage B Acceptance Re-Audit (Prompt 35, verdict STAGE-B ACCEPTANCE RE-AUDIT PASSED — READY FOR OWNER ACCEPTANCE) and the explicit Owner Acceptance granted by Mohamed Nour on 04-08-2026 at 20:49 Asia/Riyadh (UTC+03:00): sets the Status to ACTIVE — STAGE B ACCEPTED; STAGE C NOT STARTED and the Stage to STAGE B ACCEPTED — OWNER APPROVED — ACCEPTANCE PERSISTED — VERIFICATION PENDING, extends the Stage History with the Stage B execution, Acceptance Re-Audit, Owner Acceptance and Acceptance Persistence rows, and updates the Current State, Final Stopping Point and Next Permitted Step. Stage B Acceptance is bounded and is not Workstream-wide Technical Acceptance; Stage B is not marked verified or completed; Stage C and Stage D have not started; the Emergency Rollback was not executed; no code, SQL, migration, schema, database, technical artifact, Workstream-wide Technical Acceptance or Closure is authorized or recorded.
source-sha256: n/a
-->

# WS-DH-2026-0003 — Economic Date Integrity

**العنوان العربي:** سلامة التاريخ الاقتصادي للقيود والقراءات المالية

## Identity

```text
Workstream ID:
WS-DH-2026-0003

Parent Roadmap:
RM-DH-004

Roadmap Phase:
Phase 1 — Economic Date Integrity

Roadmap Phase State:
ACTIVE — advancement approved by the owner and persisted

Track:
Track 1 — Financial Core Truth & Write Safety

Current Status:
ACTIVE — STAGE B ACCEPTED; STAGE C NOT STARTED

Current Stage:
STAGE B ACCEPTED — OWNER APPROVED — ACCEPTANCE PERSISTED — VERIFICATION PENDING

Owner:
Mohamed Nour

Environment:
Lovable only

Related Problems:
1 and 2
```

## Scope

This Workstream will eventually govern:

- identification of all Financial Read Paths using `created_at`;
- confirmation of the economic-date contract;
- classification of all observed Ledger rows missing `effective_date`;
- row-by-row evidence for the twenty-eight Demo rows;
- safe backfill design;
- cutover ordering;
- statement, PDF, CSV and Print consistency;
- execution;
- QA;
- Acceptance Re-Audit;
- persistence;
- Owner Closure when appropriate.

## Exclusions

The current governance package does **not** authorize:

- the Economic Date Investigative Audit;
- code changes;
- SQL;
- DDL;
- DML;
- migration creation;
- effective-date backfill;
- row repair;
- Ledger mutation;
- Statement mutation;
- PDF or CSV code changes;
- browser-writer correction;
- POS correction;
- Import Control Layer work;
- Acceptance;
- Closure.

## Evidence

Current evidence boundary only:

- the Roadmap owner approved WS-DH-2026-0003 as the first active Workstream;
- previous Lovable current-state evidence reported twenty-eight of eighty-eight Ledger rows without `effective_date`;
- previous Lovable current-state evidence reported Statement reliance on `created_at`;
- those findings are inputs to a future read-only Investigative Audit;
- no row-level remediation contract has been accepted;
- no technical execution has occurred.

The twenty-eight rows were not re-audited or reinterpreted in this execution.

## Stage History

| # | Stage | State |
|---:|---|---|
| 1 | Roadmap classification and owner approval | Complete |
| 2 | Workstream registration | Complete |
| 3 | Workstream package persistence | Complete |
| 4 | Governance Persistence Acceptance Re-Audit | Complete — Passed |
| 5 | Owner Acceptance of the governance package | Complete |
| 6 | Governance Acceptance Persistence | Complete |
| 7 | Acceptance Persistence Verification | Complete — Verified |
| 8 | Owner Phase advancement decision (Phase 0 to Phase 1) | Complete — Approved |
| 9 | Phase Advancement Persistence | Complete — Acceptance Re-Audit pending |
| 10 | Economic Date Investigative Audit (Stage A scope) | Complete |
| 11 | Owner Alignment on the Stage A technical contract | Complete — Decisions D-1 to D-5 |
| 12 | Stage A Execution — Economic Date Backfill and atomic `balance_after` recalculation | Complete |
| 13 | Stage A Acceptance Re-Audit | Complete — Passed |
| 14 | Stage A Owner Acceptance | Complete — Approved by Mohamed Nour |
| 15 | Stage A Acceptance Persistence | Complete by this run — Verification pending |
| 16 | Stage B Writer Contract Investigation and Owner Alignment | Complete |
| 17 | Stage B Execution — Application writer cutover and POS fencing | Complete — QA passed |
| 18 | Stage B Execution — Database Authority forward migration | Complete — applied |
| 19 | Stage B Stable Function-ACL Contract and Emergency Rollback artifacts | Complete — Rollback not executed |
| 20 | Stage B Acceptance Re-Audit | Complete — Passed |
| 21 | Stage B Owner Acceptance | Complete — Approved by Mohamed Nour |
| 22 | Stage B Acceptance Persistence | Complete by this run — Verification pending |
| 23 | Stage C Read-Path Cutover | Not started |
| 24 | Stage D Constraint Enforcement | Not started |
| 25 | Workstream-wide Technical Acceptance | Not complete |
| 26 | Owner Closure | Not started |
| 27 | Closure Persistence | Not started |

Stages 1 to 9 concern governance only. Stages 10 to 15 concern the bounded Stage A technical scope, which is accepted. Stages 16 to 22 concern the bounded Stage B technical scope, which is accepted and persisted with verification pending. Stages 23 to 27 have not begun.

Stage A Acceptance, Stage B Acceptance, Workstream-wide Technical Acceptance and Workstream Closure are distinct states and must not be conflated.


## Current State

- The Workstream is technically active under RM-DH-004 Phase 1, with Stage A and Stage B accepted.
- The Stage A `effective_date` correction and atomic `balance_after` recalculation remain accepted.
- Stage B is accepted for its bounded scope: the canonical expense RPC cutover, removal of the legacy browser financial writers and runtime backfill, read-only Ledger hooks, the inert POS route, the Database Authority forward migration `20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql`, the Owner-approved Option-B Stable Function-ACL Contract and the corrected Emergency Rollback artifact.
- Financial invariants are unchanged — Ledger `88 / 23e73fd58f9308913ac978acee94b2f2` and Customer Balances `8 / 22e38d161b126cca31f4c26830084012`, with zero monetary regression.
- The Emergency Rollback is NOT EXECUTED and requires explicit Owner authorization plus independent PostgreSQL parser or disposable-environment validation before any real execution.
- The pre-existing Invoice-PDF RTL test failure remains non-blocking and outside Stage B scope.
- Statements and exports remain deferred to Stage C.
- `NOT NULL` enforcement remains deferred to Stage D.
- Stage B Acceptance does **not** constitute Workstream-wide Technical Acceptance, and Stage B is not yet marked verified or completed.
- Stage A and Stage B Acceptance Persistence each remain subject to separate read-only verification.
- There is no Workstream-wide Technical Acceptance.
- There is no Closure.


## File Plan

No application or database file plan is approved yet. The future Investigative Audit must determine the exact technical paths.

## Validation Plan

The initial governance-package validation was performed through the RM-DH-004 Governance Persistence Acceptance Re-Audit, which passed. Owner Acceptance of the governance package was granted, and Acceptance Persistence has been completed.

Technical validation remains entirely future work. No financial validation was performed and no financial correctness verdict has been issued for this Workstream.

## Rollback Plan

If the governance persistence fails before Acceptance, remove the Workstream package and revert its registry rows and its central document registry row to the pre-run HEAD.

No financial rollback is described because no financial change is authorized.

## Final Stopping Point

Stage A has been executed, re-audited, Owner accepted and persisted for its bounded scope.

Stage B has been executed, independently re-audited, explicitly Owner accepted on 04-08-2026 at 20:49 Asia/Riyadh (UTC+03:00) and persisted by this run for its bounded scope.

Stage B status is: STAGE-B ACCEPTANCE: ACCEPTED — PERSISTED — VERIFICATION PENDING.

WS-DH-2026-0003 remains ACTIVE.

Stage C and Stage D have not started.

The Emergency Rollback was not executed.

Acceptance Persistence Verification is pending for both Stage A and Stage B.

No Workstream-wide Technical Acceptance or Closure has occurred.

## Next Permitted Step

Prompt 37 — Stage B Acceptance Persistence Verification

Mode: Plan/Chat — Read-Only

Stage C must not begin in that verification run, and no Writer, Statement, export, Rollback execution or database change is authorized by this file.
