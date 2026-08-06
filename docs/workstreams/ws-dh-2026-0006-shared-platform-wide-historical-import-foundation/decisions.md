<!--
id: DHB-WS-2026-0006-DECISIONS
title: WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation (decisions)
version: 1.2.0
status: current
audience: internal
date: 2026-08-05
last-verified: 2026-08-06
supersedes: []
superseded-by: null
source: v1.2.0 — RM-DH-004 / Phase 2 — Stage-0 Owner Acceptance Persistence under PROMPT 54 — SAME-SUBJECT OWNER ACCEPTANCE PERSISTENCE CONTINUATION (parent prompt PROMPT-DH-RM004-PHASE2-PROMPT53-GOVERNANCE-EXECUTION-INDEPENDENT-ACCEPTANCE-REAUDIT-54), approved Decision DEC-RM-DH-004-004, Owner Acceptance granted 06-08-2026 at 00:24 Asia/Riyadh (UTC+03:00): records the inherited Roadmap-level Acceptance Decision. No local Decision was created; the local register remains at 0 consumed Decisions and the next free local ID remains DEC-WS-DH-2026-0006-001.; authored during RM-DH-004 / Phase 2 — Bounded Governance Reconciliation and WS-DH-2026-0006 Package Execution (execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53), under approved Decision DEC-RM-DH-004-003. Establishes the local Decision numbering convention and an empty local Decision register.
source-sha256: n/a
-->

# WS-DH-2026-0006 — Decisions

**العنوان العربي:** قرارات مسار الأساس المشترك لاستيراد البيانات التاريخية

## Decision ID Numbering

- Local Decision ID format: `DEC-WS-DH-2026-0006-NNN`.
- Numbering starts at `DEC-WS-DH-2026-0006-001`.
- Numbering is local to this Workstream and does not continue any Roadmap or other Workstream sequence.
- Decision numbering is independent from Prompt numbering.

## Decision Boundaries

1. Roadmap-level decisions — Phase identity, Phase status, Workstream disposition, Phase Acceptance and Closure — belong to `RM-DH-004 / decisions.md` and must not be recorded here.
2. Governance-rule decisions belong to RM-DH-003 and must not be recorded here.
3. Only decisions bounded to the internal execution of this Workstream may be recorded here.
4. No local Decision may weaken a closed Phase-1 contract, the RPC-mediated financial write authority, or the POS isolation boundary.

## Local Decision Register

No local Decision has been recorded.

- Local Decisions consumed: 0.
- Next free Decision ID: `DEC-WS-DH-2026-0006-001`.

## Inherited Architectural Decisions

These decisions are inherited from `DEC-RM-DH-004-003`. They are **not** local `WS-DH-2026-0006` Decision records, they consume no local Decision ID, the local register remains at 0 consumed Decisions, and the next free local ID remains `DEC-WS-DH-2026-0006-001`.

1. **Staging** — Option C: Hybrid Shared Core with typed/projected Domain fields.
2. **Storage and Registry** — Option C: dedicated private Historical Import storage and registry, later surfaced through File Manager.
3. **Permission namespace** — `import.*`, with the applicable Domain permission additionally required at posting.
4. **Browser role** — preview and mapping assistance only.
5. **Server role** — authoritative parsing/extraction, validation, staging authorization and reproducible audit evidence.
6. **Protected staging authority** — browser-direct DML to protected staging tables is prohibited.
7. **Connections** — no Phase-2 Connections expansion; preserve only a future native-record identity seam.
8. **EQX** — identity not proven in current repository evidence and outside the current execution scope.
9. **Prompt 53** — governance-only; no technical implementation authorization.

## Governing Roadmap Decisions

The creation, title, scope and Phase placement of this Workstream are governed by [`DEC-RM-DH-004-003`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/decisions.md#dec-rm-dh-004-003--phase-2-governance-reconciliation-and-creation-of-the-ws-dh-2026-0006-package).

The Owner Acceptance of the Phase-2 Stage-0 governance reconciliation and of this package, granted 06-08-2026 — 00:24 — Asia/Riyadh — UTC+03:00, is governed by [`DEC-RM-DH-004-004`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/decisions.md#dec-rm-dh-004-004--owner-acceptance-of-phase-2-stage-0-governance-reconciliation-and-the-ws-dh-2026-0006-governance-package). That Acceptance is bounded to Stage-0 governance: it grants no technical authorization, no Workstream Acceptance and no Closure.

The Owner Acceptance of the complete Stage-1 Technical Foundation Execution Contract, granted 07-08-2026 — 00:12 — Asia/Riyadh — UTC+03:00, is governed by [`DEC-RM-DH-004-005`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/decisions.md#dec-rm-dh-004-005--owner-acceptance-of-the-complete-stage-1-technical-foundation-execution-contract). That Acceptance is bounded to governance persistence of the contract artifact `stage-1-technical-foundation-execution-contract.md` and its bounded Evidence Pack v0.4 reference. It grants no technical execution authorization: Stage-1 technical implementation and Stage 2 remain NOT STARTED, and no database, migration, SQL, Storage, RLS, Grant, permission or application change is authorized by it.

All three are Roadmap-level Decisions and are not restated as local Decisions. They consume no local Decision ID; the local register remains at 0 consumed Decisions and the next free local ID remains `DEC-WS-DH-2026-0006-001`.
