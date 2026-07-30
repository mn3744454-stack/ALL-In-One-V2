# RM-DH-003 / Phase 2 — Governance Foundation Execution Scope

Investigation (Phase 1) is complete and returned READY FOR OWNER ALIGNMENT. This plan is the narrow execution scope that follows, held until the owner answers three decisions.

## Owner decisions blocking execution

- D-01 — Roadmap file shape: two files per roadmap at creation (registry + `roadmap.md`, changelog split only on demand) — recommended — or strict three files from the start.
- D-02 — RM-DH-002 in the first execution: identity-only stub with status Draft and recovery-required flag — recommended — or omit until recovery.
- D-04 — Amend `docs/CONVENTIONS.md` with a governance section in the same execution — recommended — or keep the rules only inside the roadmap registry.

## What gets created

- `docs/roadmaps/README.md` — central roadmap registry (ID, title, Arabic, status, priority, current phase, stopping point, dates, linked documents, linked workstreams, next permitted action).
- `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/roadmap.md`
- `docs/roadmaps/rm-dh-002-core-operations-and-expansion/roadmap.md` (identity stub, pending D-02)
- `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/roadmap.md`
- `docs/workstreams/README.md` — central workstream registry.
- `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md` — this initiative's own staged record.

## What gets modified

- `docs/README.md` — six new registry rows, index header 1.8.0 to 1.9.0. No existing row renamed, reordered or re-versioned.
- `docs/CONVENTIONS.md` — new governance section (ID formats `RM-DH-###` and `WS-DH-YYYY-NNNN`, mandatory compound phase reference `RM-DH-00X / Phase N`, evidence-versus-canonical rule, persistence-claim rule), version 1.0.0 to 1.1.0. Pending D-04.

## Explicitly untouched

Rounds 1-5 canonical documents and their registry rows, `docs/historical/**`, `docs/aml_1_b_1/**`, `docs/handoff/**`, `src/**`, `supabase/**`, configuration and environment files. No historical backfill, no templates, no archive folders, no file moves or renames, no database or application change.

## Governance rules the files encode

- Roadmap statuses: Draft, Active, Paused, Blocked, Completed, Superseded.
- Item statuses: Proposed, Ready, Investigating, Awaiting Owner Decision, In Execution, Awaiting Re-Audit, Accepted, Closed-Other (with reason). Accepted is reachable only through Awaiting Re-Audit.
- Workstream risk levels: low, standard, high — risk drives how many files a workstream has. Types (primary, supporting, interruption, correction) are relationship labels, not risk.
- Completion is reported as an accepted-item fraction, never a percentage; execution alone never moves it.
- Registries hold pointers; a report body exists in exactly one place.
- A persistence claim may name a path only when a successful write produced it.

## Acceptance criteria

Exactly six files created and two modified; valid front matter on every new file; all six registered with unique IDs; index at 1.9.0 and conventions at 1.1.0; no Round 1-5 row altered; no percentages, private content or secrets; `git status` shows only the intended paths.

## Rollback

Delete `docs/roadmaps/` and `docs/workstreams/`; revert `docs/README.md` to 1.8.0 and `docs/CONVENTIONS.md` to 1.0.0. Pure file revert — no data or schema involved.
