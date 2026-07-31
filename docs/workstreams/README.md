<!--
id: DHB-WS-REGISTRY
title: Dayli Horse — Central Workstream Registry
version: 1.2.2
status: current
audience: internal
date: 2026-07-30
last-verified: 2026-07-31
supersedes: []
superseded-by: null
source: v1.2.2 — RM-DH-003 / Phase 2 — Final Closure Persistence: the `WS-DH-2026-0002` Stage and Status cells are synchronized to `Closure persisted` / `CLOSED` following the explicit owner Closure decision, under which the passed Final Targeted Acceptance Re-Audit is the final QA evidence for this documentation-only correction and QA becomes Complete. The seven-column table schema is unchanged, no column was added, no other Workstream row changed, RM-DH-003 remains Active, and no Phase was created or advanced; authored during RM-DH-003 / Phase 2 — Governance Foundation Execution (WS-DH-2026-0002); v1.1.0 — index row synchronized with the persisted Acceptance outcome during RM-DH-003 / Phase 2 — Acceptance-Persistence at 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00); v1.1.1 — RM-DH-003 / Phase 2 — Persistence Correction: corrects defect D-01 by restating the Acceptance-Persistence timestamp to the Git-evidenced authoritative completion timestamp 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00), and corrects defect D-02 by removing the unauthorized `Next step` registry column, restoring the seven-column index table. The accepted Workstream Stage and Status are preserved; the next permitted step remains authoritative in the Workstream's own file; v1.1.2 — RM-DH-003 / Phase 2 — Timestamp Semantics Correction (finding PV-DEF-03): last Persistence content write 2026-07-30T23:35:03+03:00; Persistence run closing 2026-07-30T23:35:55+03:00 — empty commit. The seven-column table schema, Stage, and Status are unchanged and no registry field was added; v1.2.0 — RM-DH-003 / Phase 2 — Planning-Artifact Governance Exception Documentation Correction under approved Decision DEC-RM-DH-003-004: the `WS-DH-2026-0002` Stage and Status cells are synchronized to the new canonical state EXECUTED_AWAITING_REAUDIT. The seven-column table schema is unchanged, no column was added, and the earlier baseline Acceptance remains historical evidence recorded in the Workstream's own file; v1.2.1 — RM-DH-003 / Phase 2 — Final Acceptance Persistence: the `WS-DH-2026-0002` Stage and Status cells are synchronized to `Acceptance persisted — awaiting owner Closure` / `ACCEPTED_AWAITING_OWNER_CLOSURE`, following the passed targeted Acceptance Re-Audit of the seven-file exception-documentation correction including EV-DEF-01 (verified audit HEAD acd831767c235771b145dfeda4612a7ec51c32d4). The seven-column table schema is unchanged, no column was added, no other Workstream row changed, QA remains Pending, and owner closure remains not approved.
source-sha256: n/a
-->

# Dayli Horse — Central Workstream Registry

**العنوان العربي:** السجل المركزي لمسارات العمل — ديلي هورس

This registry is an **index only**. Each Workstream's own file is authoritative for its content and stage.

## Workstream lifecycle

Normal stage order:

```text
Investigative Audit
  -> Mini Investigative Audit (only when needed)
  -> Owner Alignment
  -> Execution
  -> QA
  -> Acceptance Re-Audit
  -> Closure
```

Rules:

1. **Investigative first.** Work begins with investigation, not with implementation.
2. **Low-risk work may skip unnecessary stages.** A small, well-understood, reversible change does not require Owner Alignment, a Mini Investigative Audit, or a separate QA stage.
3. **High-risk work requires strict staged governance.** Nothing may be skipped when the change touches security, authority, finance, data integrity, migrations, or cross-tenant behavior.
4. **Execution is not Acceptance.** Completing the work does not accept the work.
5. **Acceptance Re-Audit is mandatory before Closure**, at every risk level.
6. **ID gaps are permitted.** A missing `WS-DH-YYYY-NNNN` number does not prove a missing repository file. Some Workstreams exist only outside this repository and are intentionally not published here.
7. **Private planning content is excluded.** Private conversations, unapproved options, owner notes, and hidden reasoning never enter this registry.

Workstream ID format: `WS-DH-YYYY-NNNN`.

## Registered Workstreams

| Workstream ID | English title | Arabic title | Primary Roadmap | Stage | Status | File |
|---|---|---|---|---|---|---|
| `WS-DH-2026-0002` | Governance Foundation | تأسيس نظام الحوكمة داخل مستودع Lovable | `RM-DH-003` | Closure persisted | CLOSED | [`workstream.md`](./ws-dh-2026-0002-governance-foundation/workstream.md) |

Only `WS-DH-2026-0002` is registered in this execution.

## Related registries

- [`../roadmaps/README.md`](../roadmaps/README.md) — central Roadmap registry.
- [`../CONVENTIONS.md`](../CONVENTIONS.md) — repository-wide Roadmap and Workstream governance rules.
- [`../README.md`](../README.md) — central documentation index.
