# PROMPT 31 — FINAL SHA-BINDING VERIFICATION AND CONDITIONAL STAGE-B ACCEPTANCE RE-AUDIT

Mode: Plan/Chat — Read-Only. Zero repository, database, migration, financial-row, source and test writes. Emergency Rollback not executed. This file is the platform-managed plan artifact only.

## A. Combined Verification and Acceptance Verdicts

- Prompt Identity: PROMPT 31 SUBMITTED — RUN — CONSUMED
- Scope: CONDITIONAL VERIFICATION-THEN-ACCEPTANCE SCOPE STRICTLY PRESERVED
- Repository HEAD: FINAL PROMPT-30 REPOSITORY HEAD VERIFIED
- Prompt-30 Commit: PROMPT-30 SINGLE-FILE TWO-LINE COMMIT EXACTLY VERIFIED
- Artifact Identities: PROMPT-30 FINAL ARTIFACT IDENTITIES EXACTLY MATCH
- SHA Binding: PROMPT-30 SHA-BINDING CORRECTION INDEPENDENTLY VERIFIED
- Acceptance Entry Gate: STAGE-B ACCEPTANCE RE-AUDIT ENTRY GATE PASSED
- Minimal Live Guard: STAGE-B MINIMAL GOVERNED LIVE-STATE NO-DRIFT GUARD PASSED
- Application Execution: STAGE-B APPLICATION EXECUTION EVIDENCE COMPLETE
- Application QA: STAGE-B APPLICATION QA PRESERVED AS PASSED
- Database Execution: STAGE-B DATABASE AUTHORITY EXECUTION EVIDENCE COMPLETE
- Database QA: STAGE-B DATABASE AUTHORITY QA RESOLVED
- Stable Contract: STAGE-B STABLE CONTRACT EVIDENCE COMPLETE
- Emergency Rollback: **STAGE-B EMERGENCY ROLLBACK EVIDENCE INCOMPLETE — NOT EXECUTED**
- Zero Regression: STAGE-B ZERO-REGRESSION CONTRACT PASSED
- Zero Write: ZERO REPOSITORY-DATABASE-MIGRATION WRITE CONFIRMED
- Contract Reopening: NO ACCEPTED CONTRACT WAS REOPENED
- Rollback Execution: EMERGENCY ROLLBACK NOT EXECUTED
- Acceptance Re-Audit: **STAGE-B ACCEPTANCE RE-AUDIT FAILED — EXACT BLOCKER REMAINS**
- Acceptance Boundary: OWNER ACCEPTANCE NOT YET GIVEN
- Persistence Boundary: STAGE-B ACCEPTANCE PERSISTENCE NOT STARTED
- Closure Boundary: NO STAGE-B WORKSTREAM-PHASE-ROADMAP CLOSURE CLAIMED

## B. Complete Simple Roadmap

Mission — safe historical financial migration system, then Laboratory Historical Import pilot. Status: active.

- Phase 0 Governance — COMPLETED. Remains: none. Trigger: n/a.
- Phase 1 Economic Date Integrity — ACTIVE.
  - Stage A Historical Data Repair — COMPLETED, ACCEPTED, PERSISTED, VERIFIED (28 effective-date corrections, 69 balance_after updates, 87 canonical rows). Remains: none.
  - Stage B Financial Write Authority — Application execution complete; Application QA passed; Forward migration 20260804083738 applied; Stable Contract V1 persisted; Rollback reissued and SHA-bound. Remains: one Rollback precondition defect (below), then Owner Acceptance and Acceptance Persistence. Trigger: corrected Rollback preconditions.
  - Stage C Read-Path Cutover — NOT STARTED. Trigger: verified Stage-B Acceptance Persistence.
  - Stage D Constraint Enforcement — NOT STARTED. Trigger: Stage C acceptance.
- Phases 2–8 (Canonical Write Authority, Import Control Plane, Provenance/Idempotency, Historical Semantics, Matching Integrity, Laboratory Pilot, Expansion/Closure) — NOT STARTED; each triggered by acceptance of its predecessor.

## C. Evidence Boundary

- LIVE REPOSITORY FACT: branch `edit/edt-20ab1fdb-4a4a-493f-a38d-683425bc677f`; HEAD `0843d12203f38519a805680a892327d31a384ee8` (merge of `5b7264f1f` + `98344efcc`); working tree clean; no staged/unstaged/untracked paths.
- COMMIT FACT: `98344efcc` — one path, 2 insertions, 2 deletions, comments only; ancestor of HEAD. HEAD merge commit carries the identical 2/2 diff versus first parent.
- ARTIFACT FACT: rollback.sql 29176 bytes / 640 lines / SHA-256 `3a95fa33b3f755cf762c6ed52e01a8105c3f2b3b643b017af50290bbad76f451` / blob `26ebba46b70f522c7dc4fcd3bd21f3ec590c4e7b` / final newline present. Stable Contract 39951 bytes / 453 lines / SHA-256 `63bac3c945cc676fa565727367e1b41a0e3e243981223ef252a6576ed8b5178b` / blob `0570c9966e98dd05d5da7d8975bc9e159bb3831a`.
- LIVE DATABASE FACT: see Section N.
- PRESERVED ACCEPTED EVIDENCE: Prompts 21–29 contracts, unmodified and unreopened.
- PROMPT-30 CLAIM: fully corroborated.
- INFERENCE: none material.
- GAP: PostgreSQL parser tooling unavailable (non-blocking, pre-execution gate).
- CONTRADICTION: Rollback preconditions 12 and 13 contradict live State B (Section T).

## D. Cumulative Prompt Lineage — Prompts 01–30

All Prompts 01–30 remain SUBMITTED — RUN — CONSUMED with the authoritative treatments listed in the Prompt-31 Section 8 ledger; no entry is altered by this run. Prompt 30 is now independently verified.

## E. Conditional Scope Compliance

Gate 1 executed first and passed in full; Gate 2 entered only afterwards and limited to preserved evidence plus the minimal governed live-state guard. No implementation, design or accepted contract was reperformed.

## F. Final Repository HEAD

Branch `edit/edt-20ab1fdb-4a4a-493f-a38d-683425bc677f`; HEAD `0843d12203f38519a805680a892327d31a384ee8`; first parent `5b7264f1fd86968d0c98b2598749d1230d46d9de`; second parent `98344efcc314d23a1d0f5a967b11a805bf34a9cb`. Latest commit affecting either artifact: the Prompt-30 change; no later commit modifies either file. Working tree clean before and after.

Disclosure (no scope reopening): the branch name differs from the Prompt-30 reported branch and HEAD is a merge commit rather than the plain Prompt-30 commit. Both are platform branch/merge topology; content is byte-identical to the expected Prompt-30 result.

## G. Prompt-30 Commit Verification

`98344efcc` — author gpt-engineer-app[bot], authored/committed 2026-08-04T13:27:29Z, message "Changes"; single path `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-b-database-authority/rollback.sql`; +2 / −2; comment lines only; no SQL statement changed; Stable Contract, source, tests, migrations, packages, governance and plan files absent from the commit.

## H. Stable Contract Final Identity — unchanged, matches required SHA-256 and blob exactly.

## I. Rollback Final Identity — matches required bytes, lines, SHA-256, blob and final-newline state exactly.

## J. Exact Final SHA-Binding Block (lines 25–28)

```sql
-- Bound Stable Contract artifact:
--   docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-b-database-authority/stable-function-acl-contract-v1.md
--   Stable Contract SHA-256:
--   63bac3c945cc676fa565727367e1b41a0e3e243981223ef252a6576ed8b5178b
```

SHA occurrence count: exactly 1. Old Prompt-28-report explanatory text: absent. Bound SHA equals the actual live Stable Contract SHA.

## K. Stable Contract No-Change Proof — file did not enter the Prompt-30 commit; recomputed SHA and blob equal the pre-correction values.

## L. Prompt-30 Correction Verification Verdict — PROMPT-30 SHA-BINDING CORRECTION INDEPENDENTLY VERIFIED.

## M. Acceptance Re-Audit Entry Gate — PASSED.

## N. Minimal Governed Live-State No-Drift Guard — PASSED

Migration: `20260804083738` present exactly once and is the latest version. Policy: 3 / `04297828f4bd33eba043f6c9274ec57b`. Table ACL: 44 / `204017a1207bc68a246c3415e3975478`. Stable Function ACL State B: 35 rows / 5277 bytes / MD5 `31a3c711f72f419e75f89a234a9923cc` / SHA-256 `67128e3269272e695b4452247eed409378b5f30d10c5df54a9d6b617abeea404`. Ledger: 88 / `23e73fd58f9308913ac978acee94b2f2`. Customer Balances: 8 / `22e38d161b126cca31f4c26830084012`.

Governed authority: authenticated has SELECT and no INSERT on ledger_entries; anon has no UPDATE on customer_balances; internal-writer browser grants 0; create_pos_sale EXECUTE false for anon and authenticated; helpers 3/3 at `search_path=public, pg_temp`; comments exact; column ACL 0; browser inheritance 0; RLS true and FORCE RLS false with postgres owners on both tables; CREATE on schema public false for browser roles; governed grant-option rows 0.

## O–Q. Application Execution, Application QA, Database Authority Execution — evidence complete and preserved as accepted; live guard shows no regression.

## R. Database Authority QA Resolution — the Prompt-25 all-role failure is resolved by the Owner-approved Option-B stable-role contract, which reproduces exactly against live state.

## S. Stable Contract Evidence — complete: identity, State-B canonical string, corrected State-A canonical string, algorithms, bindings, historical 65/63/49 classification, Option-B role scope, artifact QA passed.

## T. Emergency Rollback Evidence — INCOMPLETE (blocking)

Identity, complete reissue, SHA binding, mutation core, State-A postconditions, financial invariants, sandbox observation, BEGIN/COMMIT and structural validation are all present. One defect makes the artifact non-executable against the very State B it binds:

- Precondition 12 requires `authenticated` EXECUTE rows = 10; live State B has 11.
- Precondition 13 requires `service_role` rows = 11; live State B has 10.

The two expected values are transposed. The aggregate Stable Function-ACL fingerprint (35 / 5277 / `31a3c711…`) matches exactly, so live state is correct and the artifact's per-role assertions are wrong. Running the Rollback today would raise `RB_AUTHENTICATED_WRAPPER_DRIFT: 11` before reaching any mutation.

## U. Financial Invariance — Ledger and Customer Balances unchanged; zero financial-row writes.

## V. Zero-Regression Assessment — PASSED; no governed value regressed.

## W. No-Contract-Reopening Assessment — no accepted contract was reopened; the finding in Section T is direct new live evidence against a required Emergency-Rollback Acceptance criterion.

## X. Blocking Findings

1. Emergency Rollback preconditions 12 and 13 assert transposed per-role counts (10 authenticated / 11 service_role) versus live accepted State B (11 authenticated / 10 service_role), rendering the active Rollback non-executable.

## Y. Non-Blocking Residuals

PostgreSQL parser tooling unavailable (mandatory gate before any real Rollback execution); Rollback never executed; no Forward→Rollback→Forward drill; platform sandbox roles may change; historical all-role fingerprints differ from Option-B; Invoice-PDF RTL test failure pre-existing and non-scope; deferred Finance, HR, POS and Import work; Stage C and Stage D not started.

## Z. Final Verdict — STAGE-B ACCEPTANCE RE-AUDIT FAILED — EXACT BLOCKER REMAINS.

## AA. Owner Decision Required

OWNER DECISION REQUIRED:

Authorize a minimal, repository-only correction of the two transposed per-role counts in the active Emergency Rollback (preconditions 12 and 13), or accept Stage B with the Rollback formally recorded as non-executable.

No Acceptance Persistence, Stage-C start or Closure is authorized.

## AB. Recommendation

One exact blocker: transposed per-role Rollback preconditions. One exact next action: prepare Prompt 32 — Minimal Emergency-Rollback Per-Role Precondition Correction (Agent/Build, repository-write only, one file, two numeric literals), then re-run the Stage-B Acceptance Re-Audit.

## AC. WORKSTREAM PERSISTENCE

STAGE-A ACCEPTANCE: PERSISTED AND VERIFIED. STAGE-B APPLICATION EXECUTION EVIDENCE: PERSISTED. STAGE-B DATABASE AUTHORITY FORWARD EXECUTION: APPLIED AND EVIDENCED. STAGE-B STABLE CONTRACT: PERSISTED. STAGE-B EMERGENCY ROLLBACK: PERSISTED — NOT EXECUTED. PROMPT-30 SHA-BINDING CORRECTION: PERSISTED AND VERIFIED. PROMPT-31 PERSISTENCE: NONE — READ-ONLY. STAGE-B OWNER ACCEPTANCE: NOT YET GIVEN. STAGE-B ACCEPTANCE PERSISTENCE: NOT STARTED. CLOSURE PERSISTENCE: NONE. WS-DH-2026-0003 remains ACTIVE. No Stage-C work occurred. No Closure occurred.

## AD. ROADMAP IMPACT

MISSION: safe historical financial migration and Laboratory pilot. PHASE 0: COMPLETED. PHASE 1: ACTIVE. STAGE A: COMPLETED — ACCEPTED — PERSISTED — VERIFIED. STAGE B: ACCEPTANCE RE-AUDIT UNDER PROMPT 31 — FAILED, ONE BLOCKER. STAGE C: NOT STARTED. STAGE D: NOT STARTED. PHASES 2–8: NOT STARTED. A Stage-B Acceptance Re-Audit result does not itself constitute Owner Acceptance, Acceptance Persistence, Stage-B completion, Stage-C start, Phase advancement or Closure.

## AE. Complete Deferred Items Register

| # | Item | Origin | Current status | Lane | Dependency | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|
| 1 | Repository HEAD, Prompt-30 ancestry, path membership, 2/2 diff, Stable Contract no-change, Rollback identity, SHA binding, old-text absence, zero unauthorized path | Prompt 31 | Verified | Gate 1 | none | Unverified correction | Complete |
| 2 | Migration / Policy / Table-ACL / Stable Function-ACL / financial / governed-authority guards | Prompt 31 | Passed | Gate 2 | none | Undetected drift | Complete |
| 3 | Application execution, Application QA, Database execution, Database QA, Stable Contract evidence | Prompts 21–29 | Complete | Gate 2 | none | Acceptance without evidence | Complete |
| 4 | Emergency Rollback evidence | Prompt 28–31 | INCOMPLETE — transposed per-role preconditions | Gate 2 | Prompt 32 | Non-executable rollback in an incident | Owner authorization |
| 5 | Zero-regression, no-contract-reopening, Owner decision package | Prompt 31 | Complete | Gate 2 | none | — | Complete |
| 6 | Stage-B Owner Acceptance, Acceptance Persistence and its verification, Stage-B completion status | Prompt 31 | Blocked | Governance | Item 4 | Premature acceptance | Owner acceptance |
| 7 | Stage-C Investigative Audit and start, Phase-1 advancement, Workstream Closure and Closure Persistence | Roadmap | Blocked | Governance | Item 6 | Out-of-order execution | Verified persistence |
| 8 | Forward → Rollback → Forward drill | Prompt 29 | Deferred | QA | Item 4 + parser gate | Untested rollback | Separate authorization |
| 9 | PostgreSQL parser or disposable-environment validation gate | Prompt 29 | Deferred — mandatory pre-execution | QA | tooling | Unsafe rollback execution | Before any real rollback |
| 10 | Internal Cost terminology; Unknown vs Real Zero; contextual labels | Earlier prompts | Deferred | Finance UX | — | Misleading cost truth | Finance workstream |
| 11 | HR Salary-to-Expense atomicity, idempotency, reversal; HR-linked Expense deletion protection | Earlier prompts | Deferred | HR Finance | — | Duplicate or unreversible payroll | HR workstream |
| 12 | Expense unpost/reversal; Supplier Payable lifecycle and Payable-to-Expense authority | Earlier prompts | Deferred | Finance | — | Unreversible postings | Finance workstream |
| 13 | Full POS implementation; future create_pos_sale activation | WS-DH-2026-0005 | Deferred | POS | Stage B authority | POS reactivation without authority | POS workstream |
| 14 | Manual Ledger Adjustment UI | Earlier prompts | Deferred | Finance UX | — | No governed manual path | Finance workstream |
| 15 | Residual Finance-table privilege hardening; full schema qualification of has_permission; duplicate Ledger SELECT policy review; database TEMP grant to PUBLIC; PUBLIC EXECUTE on permission helpers; sandbox_exec* financial privilege review | Prompts 13–26 | Deferred | Security | — | Residual privilege exposure | Security workstream |
| 16 | Historical Import batch/provenance objects; owner_id identity binding | Prompt 04 | Deferred | Import | Phase 3 | Unsafe import | Phase 3 |
| 17 | Account Statement effective_date cutover | Stage C | Deferred | Read paths | Stage B acceptance | Wrong economic dates displayed | Stage C |
| 18 | Shadow draft-invoice remediation; Doctor billing / tenant_services unification | Earlier audits | Deferred | Finance | — | Financial noise and split catalogs | Finance workstream |

## AF. Run Metadata and Exact Stopping Point

Mode Plan/Chat read-only; Operation conditional verification then Stage-B Acceptance Re-Audit; Prompt ID …-FINAL-SHA-BINDING-VERIFICATION-AND-CONDITIONAL-ACCEPTANCE-REAUDIT-31; Status SUBMITTED — RUN — CONSUMED; prepared 04-08-2026 16:33 Asia/Riyadh. Run Start 2026-08-04T13:46Z; Gate-1 completion Exact time not recorded; Gate-2 start Exact time not recorded; Gate-2 completion 2026-08-04T13:48Z; Run End 2026-08-04T13:48Z; Final Report 2026-08-04T13:48Z (UTC clock evidence).

Branch, HEAD, parents, working tree, commit metadata, artifact identities, SHA-binding occurrence count (1), old-text absence, migration, Policy, Table-ACL, Stable Function-ACL, Ledger, Customer Balance and governed-authority results are as stated in Sections F–N. Repository writes ZERO; database writes ZERO; migration writes ZERO; financial-row writes ZERO; source writes ZERO; test writes ZERO; Emergency Rollback NOT EXECUTED; accepted-contract reopening NONE.

Stage-B Acceptance Re-Audit: FAILED — one blocker. Owner Acceptance NOT YET GIVEN. Acceptance Persistence NOT STARTED. Stage C NOT STARTED. Closure NONE.

Exact stopping point: the Prompt-30 one-file SHA-binding correction is independently verified on the final repository HEAD, the Stable Contract is unchanged, the minimal governed live-state guard passed, and all Stage-B lanes except Emergency Rollback are complete; the run stops at the transposed per-role Rollback preconditions.

Recommended next Prompt and Mode: Prompt 32 — Minimal Emergency-Rollback Per-Role Precondition Correction, Agent/Build Repository-Write-Only.
