<!--
id: DHB-RM-004-ROADMAP
title: RM-DH-004 — Authoritative Current State
version: 1.1.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-03
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 0 — Governance Persistence (Workstream WS-DH-2026-0003), under approved Decision DEC-RM-DH-004-001 and execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02. Records the owner-approved four Tracks, sixteen problems, nine Phases and nine Workstreams. No Acceptance and no Closure are recorded.; v1.0.1 — RM-DH-004 / Phase 0 — Acceptance Persistence under execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-ACCEPTANCE-PERSISTENCE-04, following the passed read-only Acceptance Re-Audit PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-ACCEPTANCE-REAUDIT-03 (verdict ACCEPTANCE PASSED — READY FOR OWNER ACCEPTANCE, zero blockers, non-blocking observation OBS-01 accepted without correction) and the explicit Owner Acceptance granted by Mohamed Nour. Persists the Governance Persistence Acceptance state, the updated ten-row Phase 0 Stage Register, the satisfied Phase 0 exit criteria, the updated stopping point and the next permitted action. RM-DH-004 remains ACTIVE — PHASE 0; Phase 0 was not advanced; WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING; no Tracks, problems, Phases, Workstreams or dependencies were changed; no technical Acceptance and no Closure are recorded.; v1.1.0 — RM-DH-004 / Phase 0 to Phase 1 Advancement Persistence under execution prompt PROMPT-DH-RM004-P0-PHASE-ADVANCEMENT-PERSISTENCE-06 and approved Decision DEC-RM-DH-004-002, following the passed read-only verification PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-ACCEPTANCE-PERSISTENCE-VERIFICATION-05 (verdicts ACCEPTANCE PERSISTENCE VERIFIED and PHASE 0 READY FOR EXPLICIT OWNER ADVANCEMENT DECISION, fifteen of fifteen readiness conditions passed) and the explicit Owner advancement decision granted by Mohamed Nour on 03-08-2026 at 11:42 Asia/Riyadh (UTC+03:00): sets the current Phase to Phase 1 — Economic Date Integrity, records Phase 0 as completed by owner decision and persistence subject to read-only verification, expands the Phase 0 Stage Register to twelve stages, marks all ten Phase 0 exit criteria satisfied, and updates the Phase Register, remaining work, stopping point and next permitted action. WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING; the Economic Date Investigative Audit has not started; no Tracks, problems, Workstreams or dependencies were changed; no technical Acceptance and no Closure are recorded; the Phase Advancement Persistence Acceptance Re-Audit is pending.
source-sha256: n/a
-->

# RM-DH-004 — Authoritative Current State

**العنوان العربي:** الحالة الحاكمة لخارطة تثبيت الحقيقة المالية وترحيل البيانات التاريخية

This file is the single authoritative repository source for RM-DH-004 dynamic state. Where any registry, README or summary disagrees with this file, this file is authoritative and the other location is a defect to be corrected.

## Roadmap Status

```text
Roadmap ID:
RM-DH-004

Roadmap Title:
Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap

Roadmap Status:
ACTIVE — PHASE 1

Priority:
P0 — CONTROLLING FINANCE PRIORITY

Owner:
Mohamed Nour

Owner Approval:
03-08-2026 — 02:04 — Asia/Riyadh — UTC+03:00

Owner Phase Advancement Approval:
03-08-2026 — 11:42 — Asia/Riyadh — UTC+03:00

Current Phase:
RM-DH-004 / Phase 1 — Economic Date Integrity

Current Workstream:
WS-DH-2026-0003 — Economic Date Integrity

Current Workstream Status:
ACTIVE — INVESTIGATIVE AUDIT PENDING

Current Workstream Stage:
INVESTIGATIVE AUDIT PENDING

Technical Environment:
Lovable only unless explicitly changed by the owner

Repository Persistence State:
RM-DH-004 governance package persisted; Acceptance Re-Audit passed; explicit Owner Acceptance approved; Acceptance Persistence completed and independently verified; owner-approved Phase 0 to Phase 1 advancement persisted. The Phase Advancement Persistence Acceptance Re-Audit is pending.

Phase 0 Status:
COMPLETED — OWNER ADVANCEMENT APPROVED AND PERSISTED

Phase 1 Status:
ACTIVE — PHASE ADVANCEMENT PERSISTED; READ-ONLY VERIFICATION PENDING

Phase Advancement Decision:
APPROVED BY OWNER

Phase Advancement Persistence:
EXECUTED — ACCEPTANCE RE-AUDIT PENDING

Economic Date Investigative Audit:
NOT STARTED

Governance Persistence Acceptance:
PASSED — OWNER ACCEPTED — PERSISTED

Technical Roadmap Acceptance:
NOT STARTED

Workstream Technical Acceptance:
NOT STARTED

Closure:
None — Phase 1 is not closed, WS-DH-2026-0003 is not closed, and RM-DH-004 is not closed
```

## Track Register

### Track 1 — Financial Core Truth & Write Safety

Owns:

- Problem 1
- Problem 2
- Problem 3
- Problem 4

Workstreams:

- WS-DH-2026-0003
- WS-DH-2026-0004
- WS-DH-2026-0005

### Track 2 — Import Control, Provenance & Recovery

Owns:

- Problem 5
- Problem 6
- Problem 7
- Problem 12
- Problem 13
- Problem 14

Workstreams:

- WS-DH-2026-0006
- WS-DH-2026-0007

### Track 3 — Historical Financial Semantics & Document Identity

Owns:

- Problem 8
- Problem 9
- Problem 10
- Problem 11

Workstreams:

- WS-DH-2026-0008
- WS-DH-2026-0009

### Track 4 — Identity Matching & Laboratory Pilot

Owns:

- Problem 15
- Problem 16

Workstreams:

- WS-DH-2026-0010
- WS-DH-2026-0011

## Problem Register

1. Financial statements and financial read paths use `created_at` rather than the authoritative economic date.
2. Twenty-eight of eighty-eight observed Ledger rows have no `effective_date`.
3. A browser-direct Ledger and Customer Balance writer remains present.
4. POS invoice Header and Item creation is non-atomic.
5. No governed Import Control Layer exists.
6. No complete financial-record provenance contract exists.
7. No row-level or document-level fingerprint contract exists.
8. No first-class Opening Obligation model exists.
9. No first-class Unapplied Customer Credit model exists.
10. Historical source document numbers may conflict with Dayli operational numbering.
11. No protected Historical Unposted state exists.
12. No Quarantine and Manual Review Queue exists.
13. No complete source-file retention and source-record linkage exists.
14. No selective rollback contract exists.
15. Historical Laboratory Import isolation from live Lab Credits is not proven.
16. No matching flow preserves the distinction between Client, Horse Owner and Horse identity.

## Phase Register

### Phase 0 — Governance, Baseline & Execution Contract

Status:
COMPLETED — ADVANCEMENT APPROVED AND PERSISTED; VERIFICATION PENDING

Completed scope:

- persist the RM-DH-004 governance package;
- persist the active WS-DH-2026-0003 package;
- complete read-only Acceptance Re-Audit;
- preserve all approved Tracks, Workstreams, statuses and dependencies;
- record Owner Acceptance and Acceptance Persistence;
- independently verify Acceptance Persistence;
- record the explicit Owner Phase advancement decision and persist the advancement.

### Phase 1 — Economic Date Integrity

Status:
ACTIVE — ECONOMIC DATE INTEGRITY; INVESTIGATIVE AUDIT NOT STARTED

Primary Workstream:
WS-DH-2026-0003

### Phase 2 — Canonical Financial Write Authority

Status:
Blocked

Primary Workstreams:

- WS-DH-2026-0004
- WS-DH-2026-0005, deferred and isolated

### Phase 3 — Import Control Plane

Status:
Blocked

Primary Workstream:
WS-DH-2026-0006

### Phase 4 — Provenance, Idempotency & Recovery

Status:
Blocked

Primary Workstream:
WS-DH-2026-0007

### Phase 5 — Historical Financial Semantics & Document Identity

Status:
Owner Alignment required

Primary Workstreams:

- WS-DH-2026-0008
- WS-DH-2026-0009

### Phase 6 — Client, Owner & Horse Matching Integrity

Status:
Blocked

Primary Workstream:
WS-DH-2026-0010

### Phase 7 — Laboratory Historical Import Safety Pilot

Status:
Pilot — blocked

Primary Workstream:
WS-DH-2026-0011

### Phase 8 — Controlled Expansion, Final Acceptance & Roadmap Closure

Status:
Not started

## Workstream Register

| Workstream ID | Title | Track | Phase | Status | Dependency | Package |
|---|---|---:|---:|---|---|---|
| WS-DH-2026-0003 | Economic Date Integrity | 1 | 1 | ACTIVE — INVESTIGATIVE AUDIT PENDING | None | Present |
| WS-DH-2026-0004 | Canonical Financial Write Authority | 1 | 2 | BLOCKED BY WS-DH-2026-0003 | WS-DH-2026-0003 | Not yet created |
| WS-DH-2026-0005 | POS Financial Isolation | 1 | 2 | DEFERRED — POS COMING SOON / DISABLED | Deferred and isolated | Not yet created |
| WS-DH-2026-0006 | Import Control Plane | 2 | 3 | BLOCKED BY PHASES 1–2 | Phases 1–2 | Not yet created |
| WS-DH-2026-0007 | Provenance, Idempotency & Selective Rollback | 2 | 4 | BLOCKED BY WS-DH-2026-0006 | WS-DH-2026-0006 | Not yet created |
| WS-DH-2026-0008 | Historical Financial Semantics | 3 | 5 | PLANNED — OWNER ALIGNMENT REQUIRED | Owner Alignment | Not yet created |
| WS-DH-2026-0009 | Historical Document Identity & Numbering | 3 | 5 | PLANNED — OWNER ALIGNMENT REQUIRED | Owner Alignment | Not yet created |
| WS-DH-2026-0010 | Client, Owner & Horse Matching Integrity | 4 | 6 | BLOCKED BY CONTROL AND PROVENANCE LAYERS | WS-DH-2026-0006 and WS-DH-2026-0007 | Not yet created |
| WS-DH-2026-0011 | Laboratory Historical Import Safety Pilot | 4 | 7 | PILOT — BLOCKED BY PHASES 1–6 | Phases 1–6 | Not yet created |

## Dependency Order

```text
WS-DH-2026-0003
  -> WS-DH-2026-0004
    -> WS-DH-2026-0006
      -> WS-DH-2026-0007
        -> WS-DH-2026-0008 and WS-DH-2026-0009
          -> WS-DH-2026-0010
            -> WS-DH-2026-0011
```

Stated separately:

- WS-DH-2026-0005 remains deferred and isolated.
- Historical Import must not invoke or depend on the POS financial writer.

## Phase 0 Stage Register

| # | Stage | State |
|---:|---|---|
| 1 | Owner Roadmap Creation Approval | COMPLETE |
| 2 | ChatGPT Master Register Registration | COMPLETE |
| 3 | Plan/Chat Governance Persistence Planning Audit | COMPLETE |
| 4 | Owner Alignment on Persistence Scope | COMPLETE |
| 5 | Agent/Build Governance Persistence | COMPLETE |
| 6 | Read-Only Governance Persistence Acceptance Re-Audit | COMPLETE — PASSED |
| 7 | Owner Acceptance | COMPLETE — APPROVED BY MOHAMED NOUR |
| 8 | Acceptance Persistence | COMPLETE |
| 9 | Phase 0 Advancement Decision | PENDING EXPLICIT OWNER APPROVAL |
| 10 | WS-DH-2026-0003 Economic Date Investigative Audit | NOT STARTED |

Owner Acceptance, Acceptance Persistence and Phase advancement are three separate stages and must not be conflated.

## Phase 0 Exit Criteria

Phase 0 must not exit until all ten criteria below are satisfied.

| # | Criterion | State |
|---:|---|---|
| 1 | all eight intended governance files are present and correct | Satisfied |
| 2 | no unintended tracked file changed | Satisfied |
| 3 | all IDs are unique | Satisfied |
| 4 | all index rows and versions are synchronized | Satisfied |
| 5 | the RM-DH-004 package passes a read-only Acceptance Re-Audit | Satisfied |
| 6 | the WS-DH-2026-0003 package passes the same Re-Audit | Satisfied |
| 7 | the owner explicitly accepts the governance persistence | Satisfied |
| 8 | any required Acceptance Persistence is completed | Satisfied |
| 9 | the owner explicitly approves Phase advancement | Not satisfied |
| 10 | any required Phase advancement persistence is completed | Not satisfied |

Phase 0 is **not** exited and **not** closed. Criteria 9 and 10 remain outstanding.

## Remaining Work in Phase 0

1. read-only verification of this Acceptance Persistence, if required by the repository governance pattern;
2. explicit Owner decision on Phase 0 advancement;
3. Phase advancement persistence only if the owner approves advancement;
4. preparation of the WS-DH-2026-0003 Economic Date Integrity Investigative Audit Prompt;
5. no Economic Date work of any kind before those governance actions are complete.

## Current Stopping Point

RM-DH-004 Governance Persistence has passed Acceptance Re-Audit, has been explicitly accepted by the owner, and the Acceptance has been persisted.

RM-DH-004 remains ACTIVE — PHASE 0.

WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING.

No Phase advancement, Economic Date investigation, technical execution, QA, technical Acceptance or Closure has occurred.

All nine Workstreams remain registered and only WS-DH-2026-0003 has a dedicated package.

No application, database, migration or test work has been performed.

## Next Permitted Action

Plan/Chat — Read-Only Acceptance Persistence Verification and Phase 0 Advancement Readiness Review
