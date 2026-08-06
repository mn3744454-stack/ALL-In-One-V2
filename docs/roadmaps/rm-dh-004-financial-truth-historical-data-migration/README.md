<!--
id: DHB-RM-004-README
title: RM-DH-004 — Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap (package README)
version: 1.2.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-06
supersedes: []
superseded-by: null
source: v1.2.0 — RM-DH-004 / Phase 2 — Stage-0 Owner Acceptance Persistence under PROMPT 54 — SAME-SUBJECT OWNER ACCEPTANCE PERSISTENCE CONTINUATION (parent prompt PROMPT-DH-RM004-PHASE2-PROMPT53-GOVERNANCE-EXECUTION-INDEPENDENT-ACCEPTANCE-REAUDIT-54, Parallel Task ID PT-DH-RM004-WS0006-P54-OWNER-ACCEPTANCE-PERSISTENCE-20260806-0024), approved Decision DEC-RM-DH-004-004, Owner Acceptance granted 06-08-2026 at 00:24 Asia/Riyadh (UTC+03:00): records the accepted Phase-2 Stage-0 current-state summary. No new Prompt number was consumed and Prompt 55 remains next eligible. The earlier provenance is preserved verbatim on the following source lines.
source: v1.1.0 — RM-DH-004 / Phase 2 — Bounded Governance Reconciliation and WS-DH-2026-0006 Package Execution (execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53, approved Decision DEC-RM-DH-004-003), 05-08-2026 (Asia/Riyadh — UTC+03:00): adds the WS-DH-2026-0006 package to the navigation list and records the two currently packaged Workstreams. This file continues to carry stable identity only; all dynamic RM-DH-004 state remains in roadmap.md. The earlier provenance is preserved verbatim on the following source line.
source: authored during RM-DH-004 / Phase 0 — Governance Persistence (Workstream WS-DH-2026-0003), under approved Decision DEC-RM-DH-004-001 and execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02, following the passed planning audit PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-PLANNING-AUDIT-01. This file carries stable identity only; all dynamic RM-DH-004 state lives in roadmap.md.
source-sha256: n/a
-->

# RM-DH-004 — Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap

**العنوان العربي:** ديلي هورس — خارطة تثبيت الحقيقة المالية وترحيل البيانات التاريخية

**Roadmap ID:** RM-DH-004

## Purpose

RM-DH-004 governs:

- financial-truth stabilization required before any historical import;
- historical-data migration architecture;
- controlled import staging;
- provenance;
- idempotency;
- reconciliation;
- rollback;
- opening obligations;
- unapplied customer credits;
- historical document identity;
- identity matching;
- laboratory historical-import safety;
- and eventual historical-import Acceptance.

## Package Navigation

- [`roadmap.md`](./roadmap.md) — authoritative current state.
- [`decisions.md`](./decisions.md) — owner decisions.
- [`changelog.md`](./changelog.md) — chronological record.

Currently packaged Workstreams:

- [`WS-DH-2026-0003 — Economic Date Integrity`](../../workstreams/ws-dh-2026-0003-economic-date-integrity/workstream.md) — Phase 1; complete, Owner accepted and closed.
- [`WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation`](../../workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/README.md) — Phase 2; current Workstream; Stage 0 governance Owner accepted and persisted; Stage 1 Execution Contract Owner accepted and persisted; Stage-1 technical implementation and Stage 2 not started.
- [`WS-DH-2026-0006 Stage-1 Technical Foundation Execution Contract`](../../workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/stage-1-technical-foundation-execution-contract.md) — the single authoritative Owner-accepted 38-section Stage-1 contract.

## Current State Summary

Dynamic state is authoritative only in [`roadmap.md`](./roadmap.md). This summary is a convenience pointer.

- RM-DH-004 is ACTIVE; Phase 2 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation is the current Phase.
- Phase-2 Stage 0 — Governance Reconciliation is `COMPLETE — OWNER ACCEPTED — PERSISTED` under Decision `DEC-RM-DH-004-004` (Owner Acceptance 06-08-2026 — 00:24 — Asia/Riyadh — UTC+03:00).
- Phase-2 Stage 1 — Technical Foundation Audit and Execution Contract is `OWNER ACCEPTED — PERSISTED` under Decision `DEC-RM-DH-004-005` (Owner Acceptance 07-08-2026 — 00:12 — Asia/Riyadh — UTC+03:00).
- Stage-1 technical implementation and Stage 2 have not started; technical execution authorization is `NOT GRANTED`.
- No technical Historical Import implementation exists.
- No Workstream Closure and no Roadmap Closure is granted.
- Prompt 55 is CONSUMED; Prompt 56 remains UNCONSUMED AND UNAUTHORIZED.

## Ownership Boundaries

RM-DH-004 **owns**:

- the sixteen registered Finance and Historical Import problems;
- the approved four Tracks;
- the approved nine Workstreams;
- financial truth stabilization required by this Roadmap;
- import architecture and controls;
- provenance and recovery;
- historical financial semantics;
- import matching safety;
- laboratory pilot safety;
- Roadmap-specific Acceptance and Closure.

RM-DH-004 **does not own**:

- current operational-domain workflow ownership;
- horse-governance ownership;
- tenant identity ownership outside the import matching scope;
- general Roadmap governance rules;
- RM-DH-001 handover execution;
- RM-DH-002 dynamic state;
- RM-DH-003 dynamic state;
- application implementation before the relevant Workstream reaches Agent/Build.

## Relationships

### RM-DH-002

RM-DH-004 is an independent Roadmap. It is not a Phase, Track or Workstream of RM-DH-002.

RM-DH-002 owns operational-domain workflows and current operational events. RM-DH-004 owns financial-truth stabilization, historical-import architecture, import control, provenance, idempotency, reconciliation, rollback, historical financial semantics and historical-import Acceptance.

Neither Roadmap copies or governs the other Roadmap's:

- current Phase;
- current Workstream;
- dynamic status;
- stopping point;
- Acceptance;
- Closure;
- next permitted action.

No RM-DH-002 file was modified by the creation of this Roadmap.

### RM-DH-003

RM-DH-004 complies with the Roadmap and Workstream governance rules established under RM-DH-003 and recorded in [`docs/CONVENTIONS.md`](../../CONVENTIONS.md) §11. Compliance is demonstrated through conformance, not through editing the governing Roadmap.

No RM-DH-003 file was modified by the creation of this Roadmap.

### RM-DH-001

Final accepted RM-DH-004 architecture, operating contracts, reconciliation evidence and migration runbooks may later become developer-handover inputs under RM-DH-001. This is a future handover relationship only; it has not occurred.

No RM-DH-001 file was modified by the creation of this Roadmap.

## Governing Decision

[`DEC-RM-DH-004-001 — Creation of RM-DH-004 as an Independent Roadmap`](./decisions.md#dec-rm-dh-004-001--creation-of-rm-dh-004-as-an-independent-roadmap)
