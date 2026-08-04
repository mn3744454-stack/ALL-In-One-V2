# PROMPT 35 — INDEPENDENT PROMPT-34 VERIFICATION, REPORTING-CONTRADICTION RESOLUTION, MINIMAL LIVE NO-DRIFT GUARD, AND CONDITIONAL STAGE-B ACCEPTANCE RE-AUDIT

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-PROMPT-34-INDEPENDENT-VERIFICATION-REPORTING-CONTRADICTION-RESOLUTION-MINIMAL-LIVE-NO-DRIFT-AND-CONDITIONAL-ACCEPTANCE-REAUDIT-35

## A. Combined verdicts

- `PROMPT 35 SUBMITTED — RUN — CONSUMED`
- `PROMPT-35 READ-ONLY NON-REOPENING SCOPE STRICTLY PRESERVED`
- `PROMPT-34 FULL COMMIT LINEAGE AND AGGREGATE DIFF VERIFIED`
- `PLATFORM PLAN ARTIFACT ISOLATED — NON-SUBSTANTIVE`
- `STABLE CONTRACT ACTUAL COMMIT ATTRIBUTION VERIFIED`
- `HISTORICAL LINE-NUMBER DISCREPANCY RESOLVED AS NON-SEMANTIC`
- `PROMPT-34 FINAL ROLLBACK IDENTITY AND CONTENT VERIFIED`
- `PROMPT-32 STATE-B VALUES PRESERVED WITHOUT REGRESSION`
- `STABLE CONTRACT CONTENT AND IDENTITY UNCHANGED`
- `STAGE-B MINIMAL GOVERNED LIVE-STATE NO-DRIFT GUARD PASSED`
- `STAGE-B APPLICATION EXECUTION EVIDENCE COMPLETE`
- `STAGE-B APPLICATION QA PRESERVED AS PASSED`
- `STAGE-B DATABASE AUTHORITY EXECUTION EVIDENCE COMPLETE`
- `STAGE-B DATABASE AUTHORITY QA RESOLVED`
- `STAGE-B STABLE CONTRACT EVIDENCE COMPLETE`
- `STAGE-B EMERGENCY ROLLBACK EVIDENCE COMPLETE — NOT EXECUTED`
- `STAGE-B ZERO-REGRESSION CONTRACT PASSED`
- `ZERO SUBSTANTIVE REPOSITORY-DATABASE-MIGRATION WRITE CONFIRMED`
- `NO ACCEPTED CONTRACT WAS REOPENED`
- `EMERGENCY ROLLBACK NOT EXECUTED`
- `STAGE-B ACCEPTANCE RE-AUDIT PASSED — READY FOR OWNER ACCEPTANCE`
- `OWNER ACCEPTANCE NOT YET GIVEN`
- `STAGE-B ACCEPTANCE PERSISTENCE NOT STARTED`
- `STAGE C NOT STARTED`
- `NO WORKSTREAM-PHASE-ROADMAP CLOSURE CLAIMED`

## B. Complete Roadmap

| Item | Status | Completed | Remaining / next trigger |
|---|---|---|---|
| Mission — safe historical financial migration then Laboratory Pilot | ACTIVE | Governance, Stage A, most Stage B | Complete RM-DH-004 sequence |
| Phase 0 — Roadmap & Governance | COMPLETED | Governance foundation | None |
| Phase 1 — Economic Date Integrity | ACTIVE | Stage A; Stage-B implementation and Prompt-34 correction | Stage-B Acceptance, then Stages C–D |
| Stage A | COMPLETED — ACCEPTED — PERSISTED — VERIFIED | 28 dates, 69 balances, 87 rows, zero monetary difference | None |
| Stage B | ACTIVE | Application cutover/QA, Forward migration, Option-B contract, Rollback artifact, Prompt-34 correction, Prompt-35 verification | Owner Acceptance → Acceptance Persistence |
| Stage C — Read-Path Cutover | NOT STARTED | None | Verified Stage-B Acceptance Persistence |
| Stage D — Constraint Enforcement | NOT STARTED | None | Stage-C Acceptance |
| Phases 2–8 | NOT STARTED | None | Sequential completion |

## C. Evidence boundary

- Repository/Git facts: read from live `git` at the current HEAD in this environment.
- Artifact facts: byte counts, line counts, SHA-256, `git hash-object` blob IDs and final-newline byte computed directly from the working-tree files (clean tree = HEAD content).
- Live DB facts: SELECT-only `psql` queries as role `sandbox_exec`, plus one read-only migration query through the managed read tool.
- Preserved evidence: Prompts 21–34 accepted results (application cutover, application QA, forward migration, Option-B contract).
- Lovable claims: none beyond the measured values below.
- Inferences: only the classification of the Prompt-34 path-description discrepancy as reporting-only.
- Gaps: `supabase_migrations` is not readable by the `psql` sandbox role; the migration check was completed through the managed read-only query tool instead.
- Contradictions: exactly one — Prompt-34's description of commit `b7b4b5288e1d88a152cbdca5d118d056841ce656` (resolved in section I).

## D. Cumulative lineage 01–35

Prompts 01–34: `SUBMITTED — RUN — CONSUMED`, treatments unchanged from Section 6 of the Prompt. Prompt 35: `SUBMITTED — RUN — CONSUMED` — independent verification, discrepancy resolution, minimal live no-drift guard and conditional Stage-B Acceptance Re-Audit.

## E. Scope and no-reopening compliance

No accepted contract was re-audited, regenerated or rerun. No build, typecheck or test was executed. No broad database audit was performed. `sandbox_exec*` roles were not inspected beyond confirming they remain outside the blocking stable-role filter.

## F. Current repository branch / HEAD / Working Tree

- Branch: `edit/edt-1d8d1d61-6e66-4584-907c-e00345b1af9b`
- HEAD: `6616610f319f9f4e079a52052b7e6c5daf31db6b`
- HEAD parents: `651f7ee7247fece58d9fa9ffd1b54d5e165f4dd7` and `60e6a5cfd44084159335608df72c791ebfa810c6`
- HEAD author/committer time: `2026-08-04T17:25:32Z`
- Working Tree: clean at the time of Gate 1 — zero staged, zero unstaged, zero untracked paths (`git status --porcelain -uall` empty).

## G. Full Prompt-34 commit chain

| # | Full hash | Parent | Time (UTC) | Paths | +/- |
|---|---|---|---|---|---|
| 1 | `959d6051d15f0dccb03f4c5aa5573f07618ad87e` | `d940c1cebc73959d93d63adb56e2c7a65d6ec60d` | 2026-08-04T17:24:40Z | `…/stage-b-database-authority/rollback.sql` only | 1 / 1 |
| 2 | `d9533679656eaac8a6feba993dd381d43aa8cec9` | `959d6051d15f0dccb03f4c5aa5573f07618ad87e` | 2026-08-04T17:24:45Z | `…/rollback.sql` only | 1 / 1 |
| 3 | `60e6a5cfd44084159335608df72c791ebfa810c6` | `d9533679656eaac8a6feba993dd381d43aa8cec9` | 2026-08-04T17:24:50Z | `…/rollback.sql` only | 1 / 1 |

Merge commit `6616610f319f9f4e079a52052b7e6c5daf31db6b` (parents `651f7ee7…`, `60e6a5cf…`) integrates the chain; it introduces no additional `rollback.sql` change beyond the three.

Exact aggregate diff `d940c1cebc73959d93d63adb56e2c7a65d6ec60d → 6616610f319f9f4e079a52052b7e6c5daf31db6b` — one file, 3 insertions / 3 deletions:

```diff
-  -- 10. authenticated Wrapper authority preserved (10 wrappers + restored POS)
+  -- 10. authenticated Wrapper authority preserved (11 wrappers + restored POS)
-  IF v_cnt <> 11 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_RESTORE_DRIFT: %', v_cnt; END IF;
+  IF v_cnt <> 12 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_RESTORE_DRIFT: %', v_cnt; END IF;
-  IF v_cnt <> 11 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_LOST: %', v_cnt; END IF;
+  IF v_cnt <> 10 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_LOST: %', v_cnt; END IF;
```

Blob chain: `88d02f8d3 → 1be8a5d41 → 60eda04a2 → 97999c174`. No later commit touched `rollback.sql` or the Stable Contract.

## H. Platform-plan artifact attribution and isolation

- Path: `.lovable/plan/1-identity-2026-08-04.md`
- Tracked: yes.
- Introducing and latest modifying commit: `d940c1cebc73959d93d63adb56e2c7a65d6ec60d` (parent `651f7ee7247fece58d9fa9ffd1b54d5e165f4dd7`, 2026-08-04T17:24:01Z) — i.e. the pre-Prompt-34 HEAD, before the three correction commits.
- It appears in none of the three Prompt-34 correction commits.
- It does not affect `rollback.sql`, the Stable Contract or their hashes.
- Prompt-35 disclosure: this report is written to the platform-managed path `.lovable/plan.md`; it is a platform plan artifact, not implementation evidence and not a substantive Prompt-35 write.

Verdict: `PLATFORM PLAN ARTIFACT ISOLATED — NON-SUBSTANTIVE`.

## I. Stable Contract actual commit attribution and discrepancy resolution

- Latest (and only) commit modifying `stable-function-acl-contract-v1.md`: `b7b4b5288e1d88a152cbdca5d118d056841ce656`, parent `ca71a1ccca02ce0ec99ed6914b84eb2073c28a4e`, 2026-08-04T12:26:46Z.
- Complete path list of that commit: `…/rollback.sql` (327 / 78) **and** `…/stable-function-acl-contract-v1.md` (453 / 0).
- Therefore the Prompt-28 report was correct and the Prompt-34 description ("Stable Contract path only") was inaccurate.
- Artifact identity is unchanged; no lineage or content drift.

Classification: `NON-BLOCKING HISTORICAL REPORTING CORRECTION`.

## J. Final Rollback identity (computed at HEAD)

| Field | Measured | Required | Result |
|---|---|---|---|
| Bytes | 29176 | 29176 | MATCH |
| Lines | 640 | 640 | MATCH |
| SHA-256 | `5a58404e026395ad866fe6b28a8a996fc54a48659077640b05541f25c993981e` | same | MATCH |
| Git blob | `97999c1748860d1188b6315e38f576cb5c57e206` | same | MATCH |
| Final newline | present (`0x0a`) | present | MATCH |

## K. Final State-A snippets and current line numbers

- L544: `  -- 10. authenticated Wrapper authority preserved (11 wrappers + restored POS)`
- L548: `  IF v_cnt <> 12 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_RESTORE_DRIFT: %', v_cnt; END IF;`
- L552: `  IF v_cnt <> 10 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_LOST: %', v_cnt; END IF;`

Each exception identifier occurs exactly once in the file.

## L. Final State-B snippets and current line numbers

- L255: `  IF v_cnt <> 11 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_DRIFT: %', v_cnt; END IF;`
- L259: `  IF v_cnt <> 10 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_DRIFT: %', v_cnt; END IF;`

Prompt-32 values preserved without regression.

## M. Stable Contract final identity

- Bytes 39951; lines 453; SHA-256 `63bac3c945cc676fa565727367e1b41a0e3e243981223ef252a6576ed8b5178b`; Git blob `0570c9966e98dd05d5da7d8975bc9e159bb3831a`. Matches Section 5 exactly.
- Rollback header line 28 carries the literal contract SHA-256 (Prompt-30 binding intact).

## N. Historical line-number discrepancy resolution

Prompt-33 and Prompt-34 quoted different historical line numbers for the same two predicates. The current file places them at L544 / L548 / L552. The differences arise from block-start versus predicate-line indexing in the earlier reports; the unique exception identifiers, the predicates, the final content and the Git diff all agree. No semantic target defect. `HISTORICAL LINE-NUMBER DISCREPANCY RESOLVED AS NON-SEMANTIC`.

## O. Minimal live no-drift results

Evidence time: 2026-08-04 20:39:46 Asia/Riyadh. Database `postgres`; PostgreSQL 17.6 (aarch64); query role `sandbox_exec` (SELECT-only).

| Check | Required | Measured | Result |
|---|---|---|---|
| Forward migration latest | `20260804083738` present and latest | present and latest (`20260804083738` > `20260727015048`) | PASS |
| Policy State B | 3 / `04297828f4bd33eba043f6c9274ec57b` | 3 / `04297828f4bd33eba043f6c9274ec57b` | PASS |
| Table-ACL State B | 44 / `204017a1207bc68a246c3415e3975478` | 44 / `204017a1207bc68a246c3415e3975478` | PASS |
| Stable Fn-ACL State B | 35 / 5277 / `31a3c711f72f419e75f89a234a9923cc` / `67128e32…a404` | identical | PASS |
| Ledger invariant | 88 / `23e73fd58f9308913ac978acee94b2f2` | identical | PASS |
| Customer Balances invariant | 8 / `22e38d161b126cca31f4c26830084012` | identical | PASS |
| Per-role stable counts | authenticated 11, service_role 10, postgres 14, PUBLIC/anon 0 | identical (sum 35) | PASS |
| Browser table authority | SELECT only | anon/authenticated hold SELECT only on both tables | PASS |
| Internal Writer browser EXECUTE | absent | 0 rows | PASS |
| POS EXECUTE for PUBLIC/anon/authenticated | absent | 0 rows | PASS |
| Helper hardening | 3 helpers, owner postgres, SECURITY DEFINER, `search_path=public, pg_temp` | all 3 conform | PASS |
| Table comments | approved text | exact match on both tables | PASS |
| Column ACL | 0 | 0 | PASS |
| Browser role inheritance | 0 | 0 | PASS |
| RLS / FORCE RLS / owner | true / false / postgres | true / false / postgres | PASS |
| Browser CREATE on `public` | false | false / false | PASS |

Platform `sandbox_exec*` roles remain outside the blocking contract and were not further inspected.

## P. Application execution evidence

Canonical expense RPC cutover to `post_expense_with_ledger`, removal of legacy browser-side ledger/balance writers, read-only Ledger hooks and inert POS route (`POSComingSoon`) persisted in the accepted Prompt-21 commit set. Preserved; not re-executed.

## Q. Application QA evidence

Prompt-22/23 QA preserved as PASSED, with the pre-existing Invoice-PDF RTL test failure proven pre-existing and out of scope. No build, typecheck or test rerun in Prompt 35.

## R. Database execution evidence

Forward migration `20260804083738` applied once and confirmed present and latest. Policy and Table-ACL transitions, helper hardening, approved comments and financial invariance all re-confirmed live in section O.

## S. Database QA evidence

The Prompt-25 failure was isolated to platform sandbox roles and resolved by the Owner-approved Option-B stable-role boundary. Against that boundary the live fingerprints match exactly. `STAGE-B DATABASE AUTHORITY QA RESOLVED`.

## T. Stable Contract Acceptance evidence

Identity unchanged (section M); State-B canonical values reproduced live; corrected State-A values (37 / 5498 / `36da554a…` / `5a7c4fa9…`, authenticated 12, service_role 10, postgres 14, anon 1) preserved; historical platform-inclusive values remain non-blocking observation.

## U. Emergency Rollback evidence

Final Prompt-34 identity verified; State-B preconditions correct (11 / 10); State-A postconditions correct (12 / 10 with the `11 wrappers + restored POS` comment); Stable Contract path and literal SHA-256 binding preserved; transaction guards preserved; never executed. PostgreSQL parser / disposable-environment validation remains mandatory before any future real execution.

## V. Financial invariance

Ledger 88 / `23e73fd58f9308913ac978acee94b2f2`; Customer Balances 8 / `22e38d161b126cca31f4c26830084012`. Zero monetary change.

## W. Zero-regression assessment

Repository: one file changed across the whole Prompt-34 window, three lines, all authorized. Database: zero change since the accepted forward migration. Application: unchanged in Prompt 35. `STAGE-B ZERO-REGRESSION CONTRACT PASSED`.

## X. Blocking findings

None.

## Y. Non-blocking residuals

1. Prompt-34's description of commit `b7b4b5288e…` as Stable-Contract-only was inaccurate; the commit also contains `rollback.sql`. Reporting-only; artifacts unaffected.
2. Historical line-number differences between Prompts 33 and 34 — presentation/indexing only.
3. `sandbox_exec*` platform role volatility — observational, outside the Option-B boundary.
4. `supabase_migrations` is not readable by the sandbox `psql` role; verified through the managed read-only query path instead.

## Z. Final Stage-B Acceptance Re-Audit verdict

`STAGE-B ACCEPTANCE RE-AUDIT PASSED — READY FOR OWNER ACCEPTANCE`

## AA. Owner decision required

OWNER DECISION REQUIRED:

Approve or reject Stage-B Acceptance.

No Acceptance Persistence, Stage-C start or Closure is authorized until the Owner explicitly accepts this Stage-B Acceptance Re-Audit result.

## AB. One recommendation

Approve Stage-B Acceptance, then authorize a separate write-scoped Acceptance Persistence prompt limited to the governance allowlist.

## AC. Workstream persistence

WORKSTREAM PERSISTENCE:

STAGE-A ACCEPTANCE: PERSISTED AND VERIFIED.
STAGE-B APPLICATION EXECUTION: PERSISTED.
STAGE-B DATABASE AUTHORITY FORWARD EXECUTION: APPLIED AND EVIDENCED.
STAGE-B STABLE CONTRACT: PERSISTED — VERIFIED UNCHANGED.
STAGE-B EMERGENCY ROLLBACK: PERSISTED — NOT EXECUTED.
PROMPT-30 SHA-BINDING CORRECTION: PERSISTED AND VERIFIED.
PROMPT-32 STATE-B PRECONDITION CORRECTION: PERSISTED AND VERIFIED.
PROMPT-33 TARGETED VERIFICATION: COMPLETED.
PROMPT-34 STATE-A POSTCONDITION CORRECTION: PERSISTED — INDEPENDENTLY VERIFIED IN PROMPT 35.
PROMPT-35: READ-ONLY VERIFICATION AND CONDITIONAL ACCEPTANCE RE-AUDIT — NO ACCEPTANCE PERSISTENCE.
STAGE-B OWNER ACCEPTANCE: NOT YET GIVEN.
STAGE-B ACCEPTANCE PERSISTENCE: NOT STARTED.
STAGE C: NOT STARTED.
CLOSURE PERSISTENCE: NONE.

WS-DH-2026-0003 remains ACTIVE. No Closure occurred.

## AD. Roadmap impact

ROADMAP IMPACT:

MISSION: SAFE HISTORICAL FINANCIAL MIGRATION AND LABORATORY PILOT.
PHASE 0: COMPLETED.
PHASE 1: ACTIVE.
STAGE A: COMPLETED — ACCEPTED — PERSISTED — VERIFIED.
STAGE B: PROMPT-35 INDEPENDENT VERIFICATION AND CONDITIONAL ACCEPTANCE RE-AUDIT.
STAGE C: NOT STARTED.
STAGE D: NOT STARTED.
PHASES 2–8: NOT STARTED.

No Acceptance Persistence, Stage-C start, Phase advancement or Closure occurred in Prompt 35.

## AE. Complete Deferred Items Register

Promoted to Prompt-35 scope — items 1–26: all discharged this run (1–14 by Git/artifact verification, 15–20 by the live no-drift guard, 21–26 by the Acceptance Re-Audit and this decision package).

Blocked pending Owner decision — 27 Stage-B Owner Acceptance; 28 Stage-B Acceptance Persistence; 29 Acceptance Persistence verification; 30 Stage-B completion; 31 Stage-C Investigative Audit; 32 Stage-C execution; 33 Phase-1 advancement; 34 Workstream Closure; 35 Closure Persistence; 36 Forward → Rollback → Forward drill; 37 PostgreSQL parser / disposable-environment validation before any real Rollback.

Deferred — tracked: 38 Internal Cost terminology and Unknown vs Real Zero; 39 contextual Internal Cost labels; 40 HR Salary atomicity/idempotency/reversal; 41 HR-linked Expense deletion protection; 42 Expense unpost/reversal; 43 Supplier Payable lifecycle and authority; 44 full POS implementation and future `create_pos_sale` activation; 45 Manual Ledger Adjustment UI; 46 residual Finance privilege hardening; 47 full `has_permission` schema qualification; 48 duplicate Ledger SELECT Policy; 49 database TEMP grant and PUBLIC Helper EXECUTE review; 50 `sandbox_exec*` privilege review; 51 historical-import provenance objects; 52 `owner_id` identity binding; 53 Account Statement `effective_date` cutover; 54 shadow draft-invoice remediation; 55 Doctor billing / `tenant_services` unification.

No item disappeared.

## AF. Run Metadata and Exact Stopping Point

1. Mode/operation: Plan/Chat — Read-Only verification, minimal live guard, conditional Acceptance Re-Audit.
2. Prompt ID: as in the heading. Status: `SUBMITTED — RUN — CONSUMED`.
3. Preparation: 04-08-2026, 20:33, Asia/Riyadh (UTC+03:00).
4. Owner authorization: Section 2 of the Prompt.
5. Run start: Exact time not recorded. Live evidence time: 2026-08-04 20:39:46 Asia/Riyadh. Report time: Exact time not recorded.
6. Timestamp evidence source: database `now()` rendered in Asia/Riyadh; Git ISO-8601 author/committer times.
7. Branch `edit/edt-1d8d1d61-6e66-4584-907c-e00345b1af9b`; HEAD `6616610f319f9f4e079a52052b7e6c5daf31db6b`; parents `651f7ee7247fece58d9fa9ffd1b54d5e165f4dd7`, `60e6a5cfd44084159335608df72c791ebfa810c6`.
8. Working Tree clean; zero staged, unstaged, untracked paths at Gate 1.
9–10. Prompt-34 commits, parents, times, paths and aggregate diff: section G.
11. Platform-plan artifact attribution: section H.
12. Stable Contract attribution: section I.
13. Final Rollback identity and active line numbers: sections J–L.
14. State-A 12 / 10 with `11 wrappers + restored POS`; State-B 11 / 10.
15. Stable Contract identity: section M.
16. Live DB: `postgres`, PostgreSQL 17.6, role `sandbox_exec`, evidence time 2026-08-04 20:39:46 Asia/Riyadh.
17–18. Migration, Policy, Table-ACL, Function-ACL, financial invariants and governed authority: section O — all PASS.
19. Acceptance lane verdicts: section A.
20. Repository writes: `ZERO SUBSTANTIVE WRITES` (only the platform-managed `.lovable/plan.md`).
21. Database writes: `ZERO`.
22. Migration / financial / source / test writes: `ZERO`.
23. Emergency Rollback: `NOT EXECUTED`.
24. Owner Acceptance: `NOT YET GIVEN`.
25. Acceptance Persistence: `NOT STARTED`.
26. Stage C: `NOT STARTED`.
27. Closure: `NONE`.
28. Exact stopping point: all six gates passed; the report stops at the Owner decision.
29. One Owner decision: approve or reject Stage-B Acceptance.
30. Recommended next: Build/Execution Mode — `PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-ACCEPTANCE-PERSISTENCE-36`, only after explicit Owner Acceptance.
