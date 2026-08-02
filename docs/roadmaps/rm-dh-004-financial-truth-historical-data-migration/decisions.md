<!--
id: DHB-RM-004-DECISIONS
title: RM-DH-004 — Decisions
version: 1.0.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-03
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 0 — Governance Persistence (Workstream WS-DH-2026-0003), under execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02. Records DEC-RM-DH-004-001 only.
source-sha256: n/a
-->

# RM-DH-004 — Decisions

**العنوان العربي:** قرارات خارطة تثبيت الحقيقة المالية وترحيل البيانات التاريخية

## Decision ID Numbering Note

- RM-DH-004 decision numbering starts at `DEC-RM-DH-004-001`.
- Numbering is local to RM-DH-004 and does not continue any other Roadmap's sequence.
- No prior RM-DH-004 decision ID exists; `DEC-RM-DH-004-001` has no alias.
- Decision numbering is independent from Prompt numbering and from Workstream numbering.

## DEC-RM-DH-004-001 — Creation of RM-DH-004 as an Independent Roadmap

### Decision

On **03-08-2026 — 02:04 — Asia/Riyadh — UTC+03:00**, the Dayli Horse Platform Owner approved creation of:

**RM-DH-004 — Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap**

as an independent Roadmap beginning at Phase 0.

The owner approved:

- four Tracks;
- nine Workstreams;
- sixteen registered problems;
- Lovable as the authorized technical environment;
- an independent relationship with RM-DH-002;
- governance compliance with RM-DH-003;
- a future handover input relationship with RM-DH-001.

### Rationale

- The initiative expanded beyond a single Finance feature.
- It contains a multi-stage financial stabilization program.
- It requires a governed Import Control Layer.
- It requires provenance, idempotency, reconciliation and rollback.
- It requires financial semantic decisions.
- It requires identity matching.
- It requires a Laboratory pilot.
- Burying it inside RM-DH-002 would make its dynamic state, Acceptance and stopping point difficult to govern.
- Independence improves developer discovery and future team onboarding.
- Explicit cross-roadmap links preserve relationships without creating competing sources of truth.

### Rejected Alternatives

1. Treat the initiative as a Phase inside RM-DH-002.
2. Treat the initiative as a Track inside RM-DH-002.
3. Treat all sixteen problems as one Workstream.
4. Create one separate Roadmap for each problem.
5. Treat the initiative as a Workstream under RM-DH-003.
6. Create all nine Workstream packages before their active state exists.
7. Mix unrelated pre-existing registry defects into RM-DH-004 initial persistence.

Financial semantic choices for Opening Obligation and Unapplied Customer Credit are **not** approved by this decision. They remain future Owner Alignment items under Phase 5.
