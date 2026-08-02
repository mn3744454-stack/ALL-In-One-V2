<!--
id: DHB-RM-004-README
title: RM-DH-004 — Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap (package README)
version: 1.0.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-03
supersedes: []
superseded-by: null
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

Currently packaged Workstream:

- [`WS-DH-2026-0003 — Economic Date Integrity`](../../workstreams/ws-dh-2026-0003-economic-date-integrity/workstream.md)

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
