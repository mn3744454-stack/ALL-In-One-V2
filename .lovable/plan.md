# Prompt 57 — Single Canonical Replay Dispatch — Execution Path

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Stage 2 / Slice 3A
Same-ID continuation. Prompt 58 remains UNCONSUMED AND UNAUTHORIZED.

## Owner authorization recorded (session lineage only)

| Item | Value |
|---|---|
| Authorized execution SHA (immutable) | `25161c3c24062d08e5b5e05e0302450aca819ee2` |
| Approved tree SHA | `b63fee8c32d4f76e779227294aa93c3af6a234de` |
| Superseded historical candidate | `2ac152ba6da73b7a1dc7aa5b7986b27ab349165b` (preserved as lineage, not incorrect in content) |
| Repository / branch | `mn3744454-stack/ALL-In-One-V2` / `main` |
| Workflow | WS0006 Slice 3A — Canonical Fresh Replay Only, ID `329090020`, state active |
| Zero-prior-run gate | PASSED — directly proven, prior run count 0 |
| Dispatch grant | Single-use, one `workflow_dispatch` against `main` |

## Current blocker — dispatch cannot be performed from this session

Two independent facts block execution here:

1. This session is in Plan mode, which forbids state-changing actions including a workflow dispatch.
2. No GitHub connection exists in this workspace (connection list returned empty), so there is no authenticated path to the GitHub Actions dispatch API from this environment.

No dispatch has occurred. No repository write, no database operation, no rerun.

## Two ways forward — Owner picks one

### Option 1 — Owner dispatches directly on GitHub (recommended, no new surface)

1. Owner opens Actions → "WS0006 Slice 3A — Canonical Fresh Replay Only".
2. Immediately before dispatch, confirm `main` still resolves exactly to `25161c3c24062d08e5b5e05e0302450aca819ee2`. If it does not: STOP, new Owner Alignment required.
3. Run workflow on branch `main`. Exactly once.
4. On completion, download the artifact `WS0006-Slice3A-CanonicalReplay-<run id>` and paste `final-verdict.txt` back here.
5. This session then reads the evidence and produces the verdict report only — no repair, no retry, no Acceptance.

This option requires nothing from me before the run and adds no connector, no secret, no repository change.

### Option 2 — Dispatch via the GitHub connector from this session

Requires, in order:
1. Owner links a GitHub connection through the connector card (scope must permit `actions:write` on the repository).
2. Owner switches this session out of Plan mode into Build/Execution mode.
3. Pre-dispatch gate re-run: resolve `main` via the GitHub API and assert the SHA equals `25161c3c24062d08e5b5e05e0302450aca819ee2` and its tree equals `b63fee8c32d4f76e779227294aa93c3af6a234de`. Any mismatch → STOP.
4. Assert the workflow's prior run count is still 0 for workflow ID `329090020`. Non-zero → STOP.
5. Exactly one `POST /repos/mn3744454-stack/ALL-In-One-V2/actions/workflows/329090020/dispatches` with `{"ref":"main"}`.
6. Poll run status read-only until conclusion. No rerun on failure under any circumstance.
7. Read `final-verdict.txt` and report.

Note that this option introduces a workspace connector link, which is a change of surface outside the two-path envelope previously approved. It is offered only because it is the sole in-session route.

## Verdict handling (identical under both options)

- `CANONICAL FULL REPLAY PASSED` → collect evidence, STOP. No Slice 3A Acceptance inferred.
- `CANONICAL REPLAY BLOCKED AT <exact migration>` → STOP at that exact first proven migration. No repair authority. If it is `20260724000858_8ffb8b77-5e19-46e6-a5ba-d835d8277290.sql`, classify as PROVEN CANONICAL FRESH-REBUILD BLOCKER and stop.
- `CANONICAL ENVIRONMENT BOOTSTRAP FAILED BEFORE MIGRATION REPLAY` → STOP. No automatic retry.

## Explicitly not authorized by this plan

Second dispatch, rerun, retry, migration repair/skip/manual apply, history stamping, repository modification, migration modification, application modification, hosted database operation, Behavioral QA beyond the replay scope, rollback, forward/rollback/forward, Slice 3B, Slice 3C, Prompt 58, Workstream Closure, Roadmap Closure.

## Exact stopping point

Stop now, before any dispatch, pending the Owner's choice between Option 1 and Option 2.
