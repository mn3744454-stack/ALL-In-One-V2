<!--
id: DHB-WS-2026-0002
title: WS-DH-2026-0002 — Governance Foundation
version: 1.2.1
status: current
audience: internal
date: 2026-07-30
last-verified: 2026-07-31
supersedes: []
superseded-by: null
source: authored during RM-DH-003 / Phase 2 — Governance Foundation Execution; v1.1.0 — records the passed read-only Acceptance Re-Audit during RM-DH-003 / Phase 2 — Acceptance-Persistence at 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00). Acceptance recorded only; closure not approved; v1.1.1 — corrects defect D-01 during RM-DH-003 / Phase 2 — Persistence Correction: the Acceptance-Persistence timestamp is restated to the Git-evidenced authoritative completion timestamp 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00). Status, QA state, acceptance evidence, and closure state are unchanged; v1.1.2 — corrects finding PV-DEF-03 during RM-DH-003 / Phase 2 — Timestamp Semantics Correction: Persistence last content write 2026-07-30T23:35:03+03:00 — e8e4a9f91; Persistence run closing 2026-07-30T23:35:55+03:00 — 71556af2e, empty commit. Status remains ACCEPTED_AWAITING_OWNER_CLOSURE, QA remains Pending, closure remains not approved, and no lifecycle stage was created or advanced; v1.2.0 — records the Planning-Artifact Governance Exception Documentation Correction under approved Decision DEC-RM-DH-003-004: the canonical status becomes EXECUTED_AWAITING_REAUDIT, the earlier baseline Acceptance is preserved as historical evidence, QA remains Pending, and closure remains not approved; v1.2.1 — persists the passed final targeted Acceptance Re-Audit of the seven-file exception-documentation correction, including EV-DEF-01. The canonical status becomes ACCEPTED_AWAITING_OWNER_CLOSURE. The preceding EXECUTED_AWAITING_REAUDIT stage is retained in Stage history as the state preceding the successful Re-Audit, the earlier baseline Acceptance remains historical evidence, QA remains Pending, and owner closure remains not approved.
source-sha256: n/a
-->

# WS-DH-2026-0002 — Governance Foundation

**العنوان العربي:** تأسيس نظام الحوكمة داخل مستودع Lovable

## Identity

```text
Workstream ID:
WS-DH-2026-0002

Primary Roadmap:
RM-DH-003 — Roadmap & Workstream Governance Foundation

Secondary Affected Roadmaps:
RM-DH-001
RM-DH-002

Roadmap Item:
RM-DH-003 / Phase 2 — Governance Foundation Execution

Risk Level:
Low application risk; high governance significance

Owner:
Dayli Horse Platform Owner
```

## Scope

- Create the central Roadmap registry and the central Workstream registry.
- Create complete four-file packages for `RM-DH-001`, `RM-DH-002`, and `RM-DH-003`.
- Record the three approved decisions with full rationale and rejected alternatives.
- Add stable repository-wide Roadmap and Workstream rules to `docs/CONVENTIONS.md`.
- Register every created file in `docs/README.md`.

## Exclusions

- No application, database, migration, RPC, RLS, configuration, or live-data change.
- No historical backfill of `RM-DH-001` or `RM-DH-002`.
- No modification of accepted Rounds 1–5, Documentation 01–13, architecture documents, handoff documents, or AML documentation.
- No templates, archives, moves, or renames.
- No Workstream package for `WS-DH-2026-0001`.
- No multi-file Workstream package for this Workstream.
- No self-acceptance and no closure.

## Evidence

- Preflight confirmed `docs/README.md` at version 1.8.0 and `docs/CONVENTIONS.md` at version 1.0.0.
- Preflight confirmed that `docs/roadmaps/` and `docs/workstreams/` did not exist, so none of the 15 creation paths collided.
- Accepted Rounds 1–5 paths were read from the repository, not assumed: `docs/handoff/rounds/round-01/` and the five architecture references under `docs/architecture/`.
- Preflight found no repository evidence of an omitted owner decision named D-03.

### Planning-artifact governance evidence (subsequent correction lifecycle)

| Event | Git evidence | Author time |
|---|---|---|
| External untracking correction (content commit) | `9fb0b56998b3f0a9887bf87e835d40a776552213` | 2026-07-31T05:04:27+03:00 |
| Merge of the external correction into `main` | `06467d6cc7a2d689094e6874600bcee8d821004a` | 2026-07-31T05:38:59+03:00 |
| First behavioral-smoke platform commit (file recreated and force-added) | `64ab74ab609ecf46e45157a7c6ab6303eb741d2d` | 2026-07-31T02:47:36+00:00 |
| Later platform-generated planning commits | `b6cabc4e8161efa47638ed102fad43e4b2ef6079`, `92226e1065d50959f0ce01e41ad4b2cf8118d03b`, `ebec2b3e92e1ef52dc8fb7b243bcea1c2b33a88e` | 2026-07-31T02:48:15+00:00, 2026-07-31T04:14:12+00:00, 2026-07-31T04:14:21+00:00 |

Raw Git offsets are preserved as recorded by Git. Behavioral Smoke Verification therefore **failed** for sustainable untracking, and the owner approved the narrow exception recorded as `DEC-RM-DH-003-004`.

## Stage history

| Stage | Status |
|---|---|
| Investigative Audit | Complete |
| Owner Alignment | Complete |
| Execution (governance baseline) | Completed |
| QA | Pending — see the QA note below |
| Acceptance Re-Audit (governance baseline) | Passed — historical |
| Acceptance Persistence (governance baseline) | Completed — historical |
| External untracking correction | Merged |
| Behavioral Smoke Verification | Failed — untracking not sustainable |
| Mini Owner-Alignment Audit | Complete |
| Owner approval of the narrow exception (`DEC-RM-DH-003-004`) | Approved |
| Exception-documentation correction (seven files) | Executed — recorded at the time as `EXECUTED_AWAITING_REAUDIT` |
| EV-DEF-01 narrow two-file correction | Executed |
| Acceptance Re-Audit of the exception correction | Passed |
| Acceptance Persistence of the exception correction | Completed |
| Owner Closure | Pending — not approved |

### QA note

QA remains `Pending`. Neither the read-only Acceptance Re-Audit nor the subsequent correction passes stated that a separate QA stage had been performed or that QA was formally absorbed into Acceptance, so no QA event is recorded here. This state is preserved deliberately and was not advanced by any correction execution.

## Acceptance evidence (governance baseline — historical, preserved)

```text
Acceptance Verdict:
ACCEPTED — READY FOR OWNER CLOSURE AND ACCEPTANCE-PERSISTENCE DECISION

Acceptance Audit Timestamp:
2026-07-30T21:41:00+03:00 (Asia/Riyadh — UTC+03:00)

Execution Commit Range:
6395524d..458931b2

Accepted Execution Change Set:
15 added
2 modified
0 deleted
0 renamed

Link Validation:
63 internal links checked, 0 broken

Scope Validation:
No path outside the 17-file allowlist changed
```

This Acceptance event is preserved as historical evidence. It is not invalidated, reopened, or overwritten by the subsequent exception-documentation correction, and it does not accept that correction.

## Acceptance evidence (exception-documentation correction, including EV-DEF-01)

```text
Acceptance Re-Audit Verdict:
TARGETED ACCEPTANCE RE-AUDIT PASSED — READY FOR ACCEPTANCE PERSISTENCE

Acceptance Scope:
7 unique governance files, including the final EV-DEF-01 state

Acceptance Re-Audit repository HEAD (start and end):
acd831767c235771b145dfeda4612a7ec51c32d4

Latest governance-content HEAD:
589ec1d1272d5ded131956b98e512831b71ec55a

Working tree (start and end):
Clean

Acceptance Re-Audit Run Start:
31-07-2026 — July, 10:41 (Asia/Riyadh — UTC+03:00)
Source: sandbox UTC clock at audit start, 2026-07-31T07:41:50Z

Acceptance Re-Audit Run End:
Exact time not recorded

Acceptance Verdict Generated Time:
Exact time not recorded
```

Re-Audit results: all seven files passed at their expected versions and contracts; `DEC-RM-DH-003-004` verified correct and unique; EV-DEF-01 verified fully corrected; registries, authoritative files, internal links, privacy validation, and Git evidence all passed; no tracked file changed during the Re-Audit; no Acceptance-blocking defect remained.

## Current state

```text
Stage:
Acceptance persisted — awaiting owner Closure

Execution Status:
Completed — seven intended tracked governance files, plus the EV-DEF-01 two-file patch

Status:
ACCEPTED_AWAITING_OWNER_CLOSURE

QA:
Pending

Acceptance of the new correction:
Accepted and persisted

Previous baseline Acceptance:
Preserved as historical evidence

Closure:
Not approved
```

## File plan

Created (15):

1. `docs/roadmaps/README.md`
2. `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/README.md`
3. `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/roadmap.md`
4. `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/decisions.md`
5. `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/changelog.md`
6. `docs/roadmaps/rm-dh-002-core-operations-and-expansion/README.md`
7. `docs/roadmaps/rm-dh-002-core-operations-and-expansion/roadmap.md`
8. `docs/roadmaps/rm-dh-002-core-operations-and-expansion/decisions.md`
9. `docs/roadmaps/rm-dh-002-core-operations-and-expansion/changelog.md`
10. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/README.md`
11. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/roadmap.md`
12. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/decisions.md`
13. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md`
14. `docs/workstreams/README.md`
15. `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md`

Modified (2):

1. `docs/README.md` — 1.8.0 to 1.9.0.
2. `docs/CONVENTIONS.md` — 1.0.0 to 1.1.0.

## Validation plan

- Exact changed-file count equals 17.
- Whitespace validation across the change set.
- Internal relative-link resolution for every link in the 17 files.
- Roadmap ID, Workstream ID, and bilingual title consistency.
- Version consistency: created files at 1.0.0, index at 1.9.0, conventions at 1.1.0.
- `RM-DH-002` status-contract consistency across its four files and the registry.
- Decision ID uniqueness and no invented D-03.
- No dynamic status inside `docs/CONVENTIONS.md`.
- No change outside the 17-file allowlist.

## Rollback plan

Pure repository-documentation revert: delete the 15 created files (and the now-empty `docs/roadmaps/` and `docs/workstreams/` trees), revert `docs/README.md` to 1.8.0 and `docs/CONVENTIONS.md` to 1.0.0. No SQL, no application change, no database object requires rollback.

## Exception-documentation correction — file set (7)

1. `docs/CONVENTIONS.md` — 1.1.0 to 1.2.0 (§11.10 added).
2. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/decisions.md` — 1.0.0 to 1.1.0 (`DEC-RM-DH-003-004`).
3. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md` — 1.1.2 to 1.2.0.
4. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/roadmap.md` — 1.1.2 to 1.2.0.
5. `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md` — 1.1.2 to 1.2.0.
6. `docs/README.md` — 1.10.2 to 1.11.0.
7. `docs/workstreams/README.md` — 1.1.2 to 1.2.0.

`docs/roadmaps/README.md`, `.gitignore`, and every other `.lovable/` path are out of scope. Platform-generated `.lovable/plan.md` activity is disclosed separately and is never counted among these seven files.

## Next permitted step

```text
Owner decision on Closure of RM-DH-003 / Phase 2 and WS-DH-2026-0002
```

Timezone for all timestamps in this Workstream: Asia/Riyadh — UTC+03:00. Governance-baseline execution timestamp: 2026-07-30T21:16:54+03:00.
