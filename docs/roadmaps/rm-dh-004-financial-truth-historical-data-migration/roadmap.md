<!--
id: DHB-RM-004-ROADMAP
title: RM-DH-004 — Authoritative Current State
version: 1.0.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-03
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 0 — Governance Persistence (Workstream WS-DH-2026-0003), under approved Decision DEC-RM-DH-004-001 and execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02. Records the owner-approved four Tracks, sixteen problems, nine Phases and nine Workstreams. No Acceptance and no Closure are recorded.
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
ACTIVE — PHASE 0

Priority:
P0 — CONTROLLING FINANCE PRIORITY

Owner:
Mohamed Nour

Owner Approval:
03-08-2026 — 02:04 — Asia/Riyadh — UTC+03:00

Current Phase:
RM-DH-004 / Phase 0 — Governance, Baseline & Execution Contract

Current Workstream:
WS-DH-2026-0003 — Economic Date Integrity

Current Workstream Status:
ACTIVE — INVESTIGATIVE AUDIT PENDING

Current Workstream Stage:
INVESTIGATIVE AUDIT PENDING

Technical Environment:
Lovable only unless explicitly changed by the owner

Repository Persistence State:
RM-DH-004 governance package persisted by this execution; Acceptance Re-Audit pending

Acceptance:
None

Closure:
None
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
ACTIVE

Current scope:

- persist the RM-DH-004 governance package;
- persist the active WS-DH-2026-0003 package;
- complete read-only Acceptance Re-Audit;
- preserve all approved Tracks, Workstreams, statuses and dependencies;
- prepare the first Workstream Investigative Audit after Persistence Acceptance.

### Phase 1 — Economic Date Integrity

Status:
Not entered

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
| 1 | Owner Roadmap Creation Approval | Complete |
| 2 | ChatGPT Master Register Registration | Complete |
| 3 | Plan/Chat Governance Persistence Planning Audit | Complete |
| 4 | Owner Alignment on Persistence Scope | Complete |
| 5 | Agent/Build Governance Persistence | Current execution |
| 6 | Read-Only Governance Persistence Acceptance Re-Audit | Pending |
| 7 | Owner Acceptance | Pending |
| 8 | Phase 0 advancement or closure decision | Pending |
| 9 | WS-DH-2026-0003 Investigative Audit | Not started |

## Phase 0 Exit Criteria

Phase 0 must not exit until:

1. all eight intended governance files are present and correct;
2. no unintended tracked file changed;
3. all IDs are unique;
4. all index rows and versions are synchronized;
5. the RM-DH-004 package passes a read-only Acceptance Re-Audit;
6. the WS-DH-2026-0003 package passes the same Re-Audit;
7. the owner explicitly accepts the governance persistence;
8. any required Acceptance Persistence is completed;
9. the owner explicitly approves Phase advancement;
10. any required Phase advancement persistence is completed.

## Remaining Work in Phase 0

- run the read-only Acceptance Re-Audit;
- resolve any persistence defects;
- obtain Owner Acceptance;
- persist Acceptance if required;
- obtain explicit owner approval before Phase advancement;
- prepare the WS-DH-2026-0003 Investigative Audit Prompt.

## Current Stopping Point

RM-DH-004 governance package persisted.

WS-DH-2026-0003 package persisted.

All nine Workstreams registered.

No application or database work performed.

Governance Persistence Acceptance Re-Audit not yet performed.

Phase 0 remains ACTIVE.

WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING.

The Economic Date Investigative Audit has not started.

## Next Permitted Action

Plan/Chat — Read-Only Governance Persistence Acceptance Re-Audit
