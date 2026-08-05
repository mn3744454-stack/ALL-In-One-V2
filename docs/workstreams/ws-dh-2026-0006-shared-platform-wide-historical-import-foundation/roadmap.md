<!--
id: DHB-WS-2026-0006-ROADMAP
title: WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation (authoritative current state)
version: 1.2.0
status: current
audience: internal
date: 2026-08-05
last-verified: 2026-08-06
supersedes: []
superseded-by: null
source: v1.2.0 — RM-DH-004 / Phase 2 — Stage-0 Owner Acceptance Persistence under PROMPT 54 — SAME-SUBJECT OWNER ACCEPTANCE PERSISTENCE CONTINUATION (parent prompt PROMPT-DH-RM004-PHASE2-PROMPT53-GOVERNANCE-EXECUTION-INDEPENDENT-ACCEPTANCE-REAUDIT-54), approved Decision DEC-RM-DH-004-004, Owner Acceptance granted 06-08-2026 at 00:24 Asia/Riyadh (UTC+03:00): records Stage 0 as COMPLETE — OWNER ACCEPTED — PERSISTED, planned technical Step 1 as COMPLETE — OWNER ACCEPTED, and updates the Workstream Status block, stopping point and next permitted step. Stage 1 remains NOT STARTED and requires separate explicit Owner authorization. No technical implementation, no database, migration or Storage activity, and no Workstream or Roadmap Closure.; authored during RM-DH-004 / Phase 2 — Bounded Governance Reconciliation and WS-DH-2026-0006 Package Execution (execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53, local Prompt number 53), under approved Decision DEC-RM-DH-004-003. Establishes the authoritative Workstream state at Stage 0. No Stage is complete, no technical Historical Import implementation exists, and no Acceptance or Closure is recorded.
source-sha256: n/a
-->

# WS-DH-2026-0006 — Authoritative Current State

**العنوان العربي:** الحالة الحاكمة لمسار الأساس المشترك لاستيراد البيانات التاريخية

This file is the single authoritative repository source for WS-DH-2026-0006 dynamic state. Where any registry, README or summary disagrees with this file, this file is authoritative and the other location is a defect to be corrected.

## Workstream Status

```text
Workstream ID:
WS-DH-2026-0006

Workstream Title:
Shared Platform-Wide Historical Import Foundation — Finance-First Implementation

Primary Roadmap:
RM-DH-004

Phase:
RM-DH-004 / Phase 2 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation

Track:
Track 2 — Import Architecture & Control

Workstream Status:
ACTIVE — STAGE 0 OWNER ACCEPTED AND PERSISTED — TECHNICAL IMPLEMENTATION NOT STARTED

Current Stage:
Stage 0 — Governance Package — COMPLETE — OWNER ACCEPTED — PERSISTED; Stage 1 — Technical Foundation Audit — NOT STARTED and NOT AUTHORIZED

Owner Acceptance of Stage 0:
06-08-2026 — 00:24 — Asia/Riyadh — UTC+03:00 — DEC-RM-DH-004-004

Owner:
Mohamed Nour

Technical Environment:
Lovable only unless explicitly changed by the owner

Local Prompts Consumed:
0

Local Decisions Consumed:
0

Governing Roadmap Decision:
DEC-RM-DH-004-003

Technical Foundation Audit:
NOT AUTHORIZED — NOT STARTED

Execution Contract:
NOT AUTHORIZED — DOES NOT EXIST

Slices Defined:
0

Slices Executed:
0

Historical Import Substrate:
DOES NOT EXIST — no import batch, source-file registry, staging table, validation, quarantine, dry run, reconciliation, parser, adapter or posting RPC

Database Change:
NONE

Storage Change:
NONE

Application Change:
NONE

QA:
NOT STARTED

Acceptance Re-Audit:
STAGE 0 — PASSED INDEPENDENT RE-VERIFICATION; TECHNICAL STAGES — NOT STARTED

Owner Acceptance:
GRANTED FOR STAGE 0 GOVERNANCE ONLY — 06-08-2026 — 00:24 — Asia/Riyadh — UTC+03:00 — DEC-RM-DH-004-004; NO TECHNICAL ACCEPTANCE

Closure:
NONE
```

## Stage Register

| # | Stage | State |
|---:|---|---|
| 0 | Governance Package | COMPLETE — OWNER ACCEPTED — PERSISTED (DEC-RM-DH-004-004) |
| 1 | Technical Foundation Audit (read-only) | NOT STARTED — requires explicit Owner authorization |
| 2 | Owner Alignment on Import Foundation Architecture | NOT STARTED |
| 3 | Execution Contract | NOT STARTED |
| 4 | Slice Execution | NOT STARTED |
| 5 | QA | NOT STARTED |
| 6 | Acceptance Re-Audit | NOT STARTED |
| 7 | Closure | NOT STARTED |

## Planned Technical Sequence

This register is the planned technical order. It is separate from, and does not replace, the Stage Register above. No technical step is implemented, executed, accepted or closed.

| # | Planned step | Current state |
|---:|---|---|
| 1 | Governance reconciliation | COMPLETE — OWNER ACCEPTED — PERSISTED (DEC-RM-DH-004-004) |
| 2 | Technical Foundation Audit / Execution Contract | NOT STARTED |
| 3 | Shared control-plane schema, storage and permissions | NOT STARTED |
| 4 | Upload and registry visibility | NOT STARTED |
| 5 | Excel ingestion and staging | NOT STARTED |
| 6 | Validation, quarantine, review and correction | NOT STARTED |
| 7 | Dry run, reconciliation and approval | NOT STARTED |
| 8 | Canonical Finance posting | NOT STARTED |
| 9 | PDF digital-text and table extraction | NOT STARTED |
| 10 | Controlled real-client pilot | NOT STARTED |
| 11 | Later Domain Adapters | NOT STARTED |

Step 1 is marked COMPLETE only because independent re-verification passed and the Owner granted explicit Acceptance. Steps 2 through 11 remain unimplemented and unauthorized.

## Dependencies

| Dependency | State | Effect on this Workstream |
|---|---|---|
| RM-DH-004 / Phase 1 — Economic Date Integrity | COMPLETE — OWNER ACCEPTED — CLOSED | Satisfied. Its contracts are closed inputs and must not be changed. |
| WS-DH-2026-0003 — Economic Date Integrity | COMPLETE — OWNER ACCEPTED — CLOSED | Satisfied. |
| WS-DH-2026-0004 — Canonical Financial Write Authority | PARTIALLY COMPLETE — residual scope open and unscheduled | Not a blocker. Residual scope must not be silently absorbed here. |
| WS-DH-2026-0005 — POS Financial Isolation | DEFERRED AND INERT | Not a dependency. Historical Import must not invoke or depend on the POS financial writer. |
| WS-DH-2026-0007 — Provenance, Idempotency & Selective Rollback | BLOCKED BY THIS WORKSTREAM | Downstream. |

## Preserved Boundaries

1. `public.ledger_entries.effective_date NOT NULL` is a closed Phase-1 contract and must not be changed.
2. Financial writes remain RPC-mediated under the Stage-B Stable Function-ACL Contract; direct browser-role DML on financial tables must not be reintroduced.
3. Payment status remains derived from the ledger.
4. Historical Import must not invoke or depend on the POS financial writer.
5. No production financial or operational data write is authorized.

## Current Stopping Point

The governance package was originally created at version `1.0.0`, corrected to `1.1.0` under the bounded Prompt-53 same-subject package correction and Correction Continuation C2, and is currently at version `1.2.0` following the Prompt-54 Stage-0 Owner Acceptance Persistence. Stage 0 is `COMPLETE — OWNER ACCEPTED — PERSISTED` under `DEC-RM-DH-004-004`, Owner Acceptance granted 06-08-2026 — 00:24 — Asia/Riyadh — UTC+03:00. Stage 0 is the only stage with any state. No technical Historical Import work exists in the repository or the database, and no Technical Foundation Execution Contract exists.

## Next Permitted Step

1. Prompt 55 — the Stage 1 Technical Foundation Audit / Execution Contract — is the next permitted step and requires a **separate explicit Owner authorization**. Prompt 55 has not been consumed.
2. Stated separately: the Stage-0 Owner Acceptance does not authorize any technical slice, database change, migration, Storage object, permission/RLS/Grant change, parsing or staging work.
3. No Workstream Acceptance and no Workstream Closure is granted.
