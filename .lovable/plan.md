# PROMPT 53 — SAME-SUBJECT CORRECTION CONTINUATION

Bounded repair of the four `WS-DH-2026-0006` governance package files. No new Prompt number is consumed. Authorized by the Owner following the Prompt-54 independent Acceptance Re-Audit.

## Authority and boundary

- Governing Decision: `DEC-RM-DH-004-003` (already recorded; not re-opened, not amended).
- Continuation of Prompt `PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53`.
- Pre-correction baseline: HEAD `9cd4d3e45165f9865ed657507767ff87eb5c0b72`, Working Tree clean.

## Authorized paths — exactly 4

1. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/README.md`
2. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/roadmap.md`
3. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/decisions.md`
4. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/changelog.md`

All four move `1.0.0 → 1.1.0`. No other repository path is touched.

## Defects being repaired

Each item below was recorded as a blocking finding in the Prompt-54 re-audit.

### 1. README.md — missing scope definitions

Add, without changing existing identity, status or boundary text:

- **Shared Core boundary** — what the common import substrate owns: batch identity, source-file identity, staging, validation, quarantine, dry run, reconciliation, selective rollback.
- **Domain Adapter boundary** — what each domain supplies: field mapping, domain validation rules, canonical posting call. Adapters never bypass the Shared Core.
- **Format priorities** — Excel and PDF are the first-priority ingestion formats; CSV is supported; images are architecture-ready only and are not implemented in Phase 2.
- **Acceptance boundary** — what Acceptance of this Workstream will and will not cover.

### 2. roadmap.md — missing planned sequence

Add an eleven-step planned sequence register, every row marked `NOT STARTED` except step 1:

```text
 1  Governance reconciliation                                  COMPLETE (Prompt 53 + this correction)
 2  Technical Foundation Audit / Execution Contract            NOT STARTED
 3  Shared control-plane schema, storage and permissions       NOT STARTED
 4  Upload and registry visibility                             NOT STARTED
 5  Excel ingestion and staging                                NOT STARTED
 6  Validation, quarantine, review and correction              NOT STARTED
 7  Dry run, reconciliation and approval                       NOT STARTED
 8  Canonical Finance posting                                  NOT STARTED
 9  PDF digital-text and table extraction                      NOT STARTED
10  Controlled real-client pilot                               NOT STARTED
11  Later Domain Adapters                                      NOT STARTED
```

The existing eight-row Stage register is retained; the new sequence sits alongside it as the planned technical order. No step is marked implemented, accepted or closed.

### 3. decisions.md — missing architectural decisions

Add an "Inherited Architectural Decisions" section recording the nine Owner-approved decisions, each attributed upward to `DEC-RM-DH-004-003` and explicitly **not** numbered as local decisions:

1. Staging: Option C — Hybrid Shared Core with typed/projected Domain fields.
2. Storage/Registry: Option C — dedicated private Historical Import storage and registry, later surfaced through File Manager.
3. Permission namespace: `import.*`, with Domain permission additionally required at posting.
4. Browser role: preview and mapping assistance only.
5. Server role: authoritative parsing/extraction, validation, staging authorization and reproducible audit evidence.
6. Browser direct DML to protected staging tables: prohibited.
7. Connections: no Phase-2 expansion; preserve only a future native-record identity seam.
8. EQX: identity not proven in current repository evidence; outside current execution scope.
9. Prompt 53: governance-only.

The local register stays at `0 local Decisions consumed`, next free `DEC-WS-DH-2026-0006-001` — that count was verified accurate and does not change.

### 4. changelog.md — missing entries

Append one dated correction entry recording: the package correction itself, the Phase-1 / `WS-DH-2026-0003` synchronization, the `WS-DH-2026-0004` partial-completion disposition, and a restatement that zero technical implementation, zero database, zero migration and zero Storage activity occurred.

## Explicitly out of scope

No change to: the RM-DH-004 package, `docs/README.md`, `docs/roadmaps/README.md`, `docs/workstreams/README.md`, the stale `WS-DH-2026-0003/workstream.md`, duplicate `source:` lines (Deferred Item 46), application code, tests, configuration, translations, migrations, SQL, RLS, grants, permissions, Storage or the live database. No Acceptance, no Closure, no Technical Foundation Audit, no Execution Contract, no Slice.

## Rollback

Git-only, no temporary filesystem state:

```text
git checkout 9cd4d3e45165f9865ed657507767ff87eb5c0b72 -- \
  docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/
```

## Verification after execution

1. `git diff --name-status` against the pre-correction HEAD shows exactly the four package paths.
2. All four files report `version: 1.1.0`.
3. Keyword scan confirms presence of: Shared Core, Domain Adapter, Excel, PDF, CSV, images, the eleven-step sequence, and all nine architectural decisions.
4. Zero application, database, migration and Storage change.
5. Report issued; the next step is an independent read-only re-verification of this correction.
