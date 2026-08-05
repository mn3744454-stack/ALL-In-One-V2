<!--
id: DHB-RM-004-DECISIONS
title: RM-DH-004 — Decisions
version: 1.2.0
status: current
audience: internal
date: 2026-08-03
last-verified: 2026-08-05
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 0 — Governance Persistence (Workstream WS-DH-2026-0003), under execution prompt PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-EXECUTION-02. Records DEC-RM-DH-004-001 only.; v1.1.0 — RM-DH-004 / Phase 0 to Phase 1 Advancement Persistence under execution prompt PROMPT-DH-RM004-P0-PHASE-ADVANCEMENT-PERSISTENCE-06: appends exactly one new decision, DEC-RM-DH-004-002 — Advancement from Phase 0 to Phase 1, recording the explicit Owner advancement decision granted by Mohamed Nour on 03-08-2026 at 11:42 Asia/Riyadh (UTC+03:00), its supporting evidence, rationale, rejected alternatives and implications. DEC-RM-DH-004-001 is preserved byte-identical. No other decision was added, and no technical Acceptance or Closure is recorded.
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

## DEC-RM-DH-004-002 — Advancement from Phase 0 to Phase 1

### Decision

On **03-08-2026 — 11:42 — Asia/Riyadh — UTC+03:00**, the owner, Mohamed Nour, approved advancement of RM-DH-004 from:

**Phase 0 — Governance, Baseline & Execution Contract**

to:

**Phase 1 — Economic Date Integrity**

The owner approved Phase Advancement Persistence only.

The owner did not authorize the Economic Date Investigative Audit or any technical implementation in the same run.

### Evidence Supporting the Decision

- Governance Persistence was planned, executed and accepted.
- Owner Acceptance was persisted.
- Acceptance Persistence was independently verified.
- Prompt 05 returned `ACCEPTANCE PERSISTENCE VERIFIED`.
- Prompt 05 returned `PHASE 0 READY FOR EXPLICIT OWNER ADVANCEMENT DECISION`.
- All fifteen readiness conditions passed.
- No governance blocker remained.
- Phase 0 remained active until the explicit owner decision.

### Rationale

1. Phase 0 completed its intended governance purpose.
2. RM-DH-004 identity, ownership and cross-roadmap relationships are persisted.
3. The four Tracks, sixteen problems and nine Workstreams are registered.
4. The active Workstream package is persisted.
5. Governance Persistence passed independent Acceptance Re-Audit.
6. Owner Acceptance and Acceptance Persistence are persisted and verified.
7. Keeping Phase 0 open without a new hold condition would no longer reflect the verified governance state.
8. Advancement enables the next investigative stage without authorizing technical execution.

### Rejected Alternatives

1. Keep Phase 0 open without a named blocker or hold condition.
2. Begin the Economic Date Investigative Audit before Phase Advancement Persistence.
3. Combine Phase Advancement Persistence and the Economic Date Investigative Audit in one run.
4. Combine Phase advancement with code, SQL, migration or backfill work.
5. Mark WS-DH-2026-0003 technically accepted.
6. Close RM-DH-004.
7. Advance directly beyond Phase 1.

### Implications

- RM-DH-004 current Phase becomes Phase 1.
- WS-DH-2026-0003 remains Active — Investigative Audit Pending.
- Phase 1 activation does not itself begin the investigation.
- Technical execution remains blocked behind the Investigative Audit, Owner Alignment, an approved execution contract, Agent/Build execution, QA and Acceptance Re-Audit.
- Phase Advancement Persistence requires read-only verification.
- No Closure occurs.

## DEC-RM-DH-004-003 — Phase 2 Governance Reconciliation and Creation of the WS-DH-2026-0006 Package

### Decision

On **05-08-2026 — Asia/Riyadh — UTC+03:00**, executed under prompt `PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53`, the persisted RM-DH-004 governance package is reconciled with the Owner-approved current state, and a dedicated governance package is created for `WS-DH-2026-0006`.

The reconciliation records:

1. **Phase 1 — Economic Date Integrity:** `COMPLETE — OWNER ACCEPTED — CLOSED`. `WS-DH-2026-0003` is `COMPLETE — OWNER ACCEPTED — CLOSED`. Stage A — Economic Date Backfill, Stage B — Financial Write Authority, Stage C — Read-Path Cutover and Stage D — Constraint Enforcement are each closed within their accepted bounds. The `public.ledger_entries.effective_date NOT NULL` contract is a closed Phase-1 contract.
2. **Phase 2 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation:** the current Phase, with status `CURRENT — GOVERNANCE RECONCILED — TECHNICAL IMPLEMENTATION NOT STARTED`. The previous Phase-2 title `Canonical Financial Write Authority` is superseded.
3. **Former Phase 3 — Import Control Plane:** `SUPERSEDED AND ABSORBED INTO PHASE 2 BY OWNER DECISION — NO SEPARATE EXECUTION`. Its historical number and identity are retained for lineage.
4. **Phases 4 through 8:** unchanged, retaining their existing numbers, identities and states.
5. **WS-DH-2026-0004 — Canonical Financial Write Authority:** `PARTIALLY COMPLETE`. Its core write-authority objectives were delivered inside `WS-DH-2026-0003` Stage B. Its residual scope is open and unscheduled and is not a Phase-2 blocker. The ID is retained and is not renumbered, merged or closed.
6. **WS-DH-2026-0005 — POS Financial Isolation:** `DEFERRED AND INERT`. POS remains Coming Soon / disabled and has no Phase-2 dependency.
7. **WS-DH-2026-0006:** the current Phase-2 Workstream, reconciled in title and scope from the historical `Import Control Plane` framing to `Shared Platform-Wide Historical Import Foundation — Finance-First Implementation`, with a dedicated four-file package created at version `1.0.0` and status `ACTIVE — GOVERNANCE PACKAGE CREATED — TECHNICAL IMPLEMENTATION NOT STARTED`.

No Phase is renumbered. No Workstream ID is created, renumbered or merged. No technical Historical Import implementation is authorized by this Decision.

### Rationale

1. The persisted governance package asserted a stale state: `ACTIVE — PHASE 1` with Stage C and Stage D `NOT STARTED`, while Stages C and D were in fact executed, independently re-audited and Owner accepted.
2. The persisted Phase-2 and Phase-3 titles no longer matched the Owner-approved direction, in which the Historical Import Foundation is a single shared platform-wide Phase whose first implemented domain is Finance.
3. `WS-DH-2026-0006` was registered as blocked by Phases 1–2 while it is in fact the current Phase-2 Workstream.
4. `WS-DH-2026-0004` was registered as blocked while its core objectives had already been delivered inside Stage B; leaving that unstated risks either a false-blocked reading or a false-complete reading.
5. A governance package that asserts a stale Phase, a stale Stage register and a stale Workstream disposition is a defect under the RM-DH-003 governance rules and must be corrected before any Phase-2 technical work is contemplated.
6. Creating the `WS-DH-2026-0006` package now establishes the authoritative location for Phase-2 dynamic state before any technical decision is taken there.

### Rejected Alternatives

1. Renumber the Phases so that the Historical Import Foundation becomes Phase 3. Rejected: renumbering breaks every persisted cross-reference and lineage claim.
2. Delete or reuse the former Phase 3. Rejected: historical identity must be preserved, not erased.
3. Create a new Workstream ID for the Historical Import Foundation. Rejected: `WS-DH-2026-0006` already carries that scope; a new ID would fragment lineage.
4. Mark `WS-DH-2026-0004` complete. Rejected: only its core Stage-B objectives were delivered; residual scope remains open.
5. Close `WS-DH-2026-0005` or treat POS as a Phase-2 dependency. Rejected: POS is deferred and inert.
6. Combine this reconciliation with Phase-2 technical foundation work, schema design, migrations or Storage objects. Rejected: this run is documentation-only.
7. Claim Phase-2 Acceptance, Workstream Closure or production readiness. Rejected: none has occurred.

### Implications

- RM-DH-004 current Phase becomes Phase 2 and the Roadmap Status becomes `ACTIVE — PHASE 2`.
- `WS-DH-2026-0006` becomes the current Workstream and owns Phase-2 dynamic state in its own package.
- Phase 1 and `WS-DH-2026-0003` are closed and must not be reopened by Phase-2 work; the `effective_date NOT NULL` contract must not be changed.
- No Phase-2 technical implementation exists: no import batch, source-file registry, staging table, validation, quarantine, dry run, reconciliation, parser, adapter or posting RPC.
- This reconciliation requires an independent Acceptance Re-Audit before any Phase-2 technical authorization.
- No Acceptance and no Closure are recorded for Phase 2 by this Decision.

## Decision Summary

- Decisions recorded: `DEC-RM-DH-004-001` through `DEC-RM-DH-004-003`.
- Next free Decision ID: `DEC-RM-DH-004-004`.
