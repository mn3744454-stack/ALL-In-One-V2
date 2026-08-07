# Prompt 57 — Part B — Fresh-Rebuild Unblock Execution Contract (Owner Aligned)

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Slice 3A
Same-ID continuation of Prompt 57. No new Prompt number consumed. Prompt 58 remains unconsumed.

## Owner-aligned decisions

| ID | Decision | Owner answer |
|---|---|---|
| CI-D1 | Root cause | Accepted — pre-existing migration-chain debt, not a Prompt-57 regression |
| CI-D2 | Remediation strategy | Option A — guard-only edits, applied to both proven blockers |
| CI-D3 | Editing already-applied history | Approved, guard-only and semantics-preserving |
| CI-D4 | Reconstruction contract | Retain full migration-chain replay from an empty database |
| CI-D5 | CI rerun | Only after local replay is clean |
| CI-D6 | Next scope | Minimal unblock only; no CI rerun in the same run |

## Problem being fixed

A fresh disposable database cannot replay the migration chain. Two migrations assert against live hosted fixtures and abort on an empty database:

1. `20260723235157_c56d3417-17ad-4008-a846-8be103b0ebe1.sql` — verification-only, zero permanent schema effect. Aborts with `N1B_J3_VERIFY_FIXTURE_ACTOR_NOT_MEMBER` (P0001) because hard-coded tenant `145f2128…` / user `98439fe8…` do not exist.
2. `20260726092019_69205b8e-fb7d-413e-82cf-1c9d03703c20.sql` — schema plus a one-row data repair. Aborts with `Blocking row not found` because hard-coded ledger row `43cdf7bf…` does not exist.

Both are already applied to the hosted database, so guarded edits never re-run there and change nothing in production.

## Fix pattern (the project's own precedent)

`20260720173125_d616b20c…` already demonstrates the accepted pattern: detect the fixture, and when it is absent emit `RAISE NOTICE '… absent on clean rebuild; … will be skipped'` and continue. Both blockers adopt the same shape.

## Work to perform

1. `supabase/migrations/20260723235157_c56d3417-17ad-4008-a846-8be103b0ebe1.sql`
   - Wrap the entire verification body in a fixture-presence check: tenant exists, user is an active member, required finance permissions present, cross-tenant fixtures present.
   - When all present: behaviour is byte-for-byte unchanged, including every T2–T14 assertion and the zero-residue guards.
   - When any is absent: `RAISE NOTICE` naming the missing fixture, skip the verification, leave the database untouched.
   - No permanent schema effect exists in this file, so nothing else changes.

2. `supabase/migrations/20260726092019_69205b8e-fb7d-413e-82cf-1c9d03703c20.sql`
   - Keep all schema DDL, backfills, FK validation and integrity checks unconditional.
   - Gate only the hard-coded blocking-row repair block on the row's existence: when `43cdf7bf…` is absent, `RAISE NOTICE` and skip the repair; when present, run every existing precondition and drift assertion unchanged.
   - Preflight assertions over live data stay in place — they are vacuously true on an empty database.

3. Any further migration proven to abort during local replay
   - Guarded with the identical pattern, one at a time, each recorded in the evidence log.

4. `docs/workstreams/ws-dh-2026-0006-.../evidence/slice-3a/fresh-rebuild-unblock.md` — new evidence artifact
   - Replay log, list of guarded files, per-file pre/post SHA-256, unified diffs, and the statement that hosted migration history is unaffected.

## Verification loop

Run `supabase db start` against a local disposable stack, repeat until the full 326-migration chain replays clean. No hosted database writes at any point.

## Hard boundaries

- Zero hosted-database writes, DDL, DML, `SET ROLE`, or rollback execution.
- No new migration file, no renumbering, no deletion, no migration-history edit.
- No synthetic fixtures injected into the production migration chain.
- No customer tenant and no production data in any test path.
- No CI workflow edit unless local replay proves one necessary.
- No CI rerun in this execution.

## Acceptance criteria

Full migration chain replays clean from an empty database; every guarded file behaves identically on a populated database; evidence artifact complete with hashes and diffs.

## Exact stop

Stop after local clean replay is proven and evidence is written. Do not rerun CI, do not execute Behavioral QA, do not execute rollback or reconstruction equivalence, do not start Slice 3B/3C, do not claim Slice 3A Acceptance.

## Out of scope

Slice 3B, Slice 3C, permission keys, RLS policies, RPCs, storage buckets, edge functions, Prompt 58, and Slice-3A Acceptance.
