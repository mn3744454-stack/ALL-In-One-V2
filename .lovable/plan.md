# RM-DH-004 Phase 2 — Shared Platform-Wide Historical Import Foundation

Prompt 52 investigative audit (read-only). No repository, database, storage or governance writes were made.

## A. Primary verdict

PHASE-2 SHARED HISTORICAL IMPORT FOUNDATION IS ARCHITECTURALLY GREENFIELD — NO IMPORT SUBSTRATE EXISTS — GOVERNANCE PHASE/WORKSTREAM MAPPING CONTRADICTION CONFIRMED AND MUST BE RECONCILED BEFORE ANY IMPLEMENTATION SLICE.

## B. Verified current state (evidence-backed)

- Branch HEAD `d40156d6c`, working tree clean.
- `docs/roadmaps/rm-dh-004-.../roadmap.md` persists: Phase 2 = *Canonical Financial Write Authority* (WS-DH-2026-0004, WS-DH-2026-0005 deferred); Phase 3 = *Import Control Plane* (WS-DH-2026-0006, status `BLOCKED BY PHASES 1–2`, package "Not yet created"). This contradicts the Owner-approved statement that Phase 2 is the Shared Import Foundation with WS-DH-2026-0006 as target.
- No Workstream package exists for WS-DH-2026-0004, -0005 or -0006 (`docs/workstreams/` contains only 0002, 0003, 0012, 0013).
- Import substrate: **none**. No `import_*`, staging, or quarantine tables exist. Only `media_assets`, `media_asset_clients`, `media_share_links`.
- Storage: two buckets only — `horse-media` (private, 50 MB, image/video MIME allowlist) and `database_export_20_07_26`. No document bucket, no PDF/Excel MIME allowance.
- Client deps contain no PDF/Excel parser (only `jspdf` + `html2canvas` for generation). Extraction capability is absent everywhere.
- Edge functions present: 5, none import-related. No queue/worker substrate.
- Preserved Phase-1 contracts intact: `ledger_entries.effective_date NOT NULL`, server-side finance write authority, POS inert.

## C. Governance contradiction and recommended bounded reconciliation

Recommend a single bounded governance-persistence prompt (not executed here) that:

1. Repositions Phase 2 to *Shared Platform-Wide Historical Import Foundation — Finance-First Implementation*, and moves *Canonical Financial Write Authority* to a later Phase without deleting its scope.
2. Retitles WS-DH-2026-0006 to **Shared Platform-Wide Historical Import Foundation** (matches Owner phrasing and existing docs naming conventions; "Control Plane" narrows the scope to one layer of the new architecture).
3. Records WS-DH-2026-0004 as retained-but-repositioned (not cancelled), and WS-DH-2026-0005 as still deferred/isolated while POS is Coming Soon.
4. Creates the WS-DH-2026-0006 package (README, workstream.md, decisions.md, changelog.md) and one DEC entry capturing the Phase remap.

No new Roadmap or Workstream ID.

## D. Recommended target architecture (one recommendation)

**Shared Historical Import Core + Domain Adapter registry + Finance Adapter first.**

- **Core object model**: `import_batches` → `import_source_files` (+ version/replacement lineage) → `import_source_documents` → `import_source_units` (page / sheet / image) → `import_source_records` → `import_extracted_fields` → `import_staged_records` → `import_validation_results` / `import_quarantine_items` → `import_dry_runs` + `import_dry_run_effects` → `import_reconciliations` → `import_approvals` → `import_posting_authorizations`, with `import_events` as the append-only audit spine and `import_domain_profiles` as the adapter registry.
- **Staging**: Option B — single generic typed staging table with JSONB payload plus adapter-declared projected columns. Keeps one core, avoids per-domain schema sprawl, still indexable for Finance reconciliation.
- **Original evidence**: raw uploads land in a new private `historical-imports` bucket, immutable; corrections create a new file version row linked to its predecessor. Every field keeps original / normalized / corrected value + corrected_by / correction_time / correction_reason.
- **Processing**: Option C — edge-function workers driven by state transitions, invoked per source-file; no browser parsing, no long-running in-request work. PDF and Excel parsing run server-side; images run through the same pipeline with an OCR extraction step added in a later slice.
- **Posting boundary**: import never writes ledger directly. Approved staged Finance records are posted only through existing canonical server-side finance writers, with real Economic Dates and idempotency keys derived from `(batch_id, staged_record_id)`.
- **Matching**: no fuzzy auto-match. Unresolved identity → Quarantine.
- **Reconciliation tolerance**: 0.00.
- **Security**: every table tenant-scoped with RLS, `has_permission()` gates using new keys `finance.import.*` generalized as `import.batch.create`, `import.batch.review`, `import.batch.approve`, `import.batch.post`; storage paths prefixed by tenant id; browser roles get no direct DML on staged/posting tables.

## E. Proposed execution slices (implementation not authorized yet)

- **Slice A** — Governance reconciliation + WS-DH-2026-0006 package.
- **Slice B** — Core control tables, RLS, grants, permission keys, `historical-imports` bucket, secure upload + file metadata.
- **Slice C** — PDF and Excel extraction workers (edge functions), source unit/record/field persistence.
- **Slice D** — Staging + validation rules engine.
- **Slice E** — Image/scanned-document ingestion path.
- **Slice F** — Quarantine and reviewer decisions UI.
- **Slice G** — Dry run + reconciliation reports.
- **Slice H** — Approval and Finance posting boundary via canonical writers.
- **Slice I** — Second Domain Adapter pilot (Laboratory) to prove the adapter contract.

Recommended first bounded next prompt: **Slice A only** (governance reconciliation and WS-DH-2026-0006 package creation), because every technical slice inherits its Workstream identity from it.

## F. Blocking findings

1. Persisted Phase 2 / Phase 3 mapping contradicts the Owner-approved direction — blocks any Phase-2 implementation prompt.
2. WS-DH-2026-0006 has no package and is persisted as `BLOCKED BY PHASES 1–2`.

## G. Non-blocking residuals and deferred items

- No PDF/Excel/OCR capability anywhere in the stack — a dependency and edge-function decision is required in Slice C.
- `database_export_20_07_26` bucket is undocumented; classify before launch.
- Privileged Rollback-Only Writer Verification Drill remains mandatory before Historical Import production launch (carried from Stage D).

## H. Owner decisions required

1. Approve the Phase remap and the WS-DH-2026-0006 title.
2. Approve Option B staging and Option C edge-worker processing.
3. Approve the new permission key namespace (`import.*` vs `finance.import.*`).
4. Approve Slice A as the next bounded prompt.

## I. Stopping point

PHASE-2 INVESTIGATIVE AUDIT COMPLETE — NO WRITES PERFORMED — AWAITING OWNER DECISIONS AND AUTHORIZATION OF SLICE A.
