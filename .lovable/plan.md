# Prompt 57 — Part B — Dedicated Canonical Replay-Only Workflow

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Slice 3A
Same-ID continuation. No new Prompt number consumed. Prompt 58 remains unconsumed.
Status of this document: proposed contract for Owner approval. Nothing is implemented by it.

## Owner-aligned decisions

| ID | Decision |
|---|---|
| CE-D1 | Canonical = official Supabase CLI + Supabase-managed local Docker stack from this repo's `supabase/config.toml`, disposable, no hosted credentials, no emulated schemas or extension stubs, no manual history stamping. Not hosted production equivalence. |
| CE-D2 | Dedicated replay-only GitHub Actions workflow, manual dispatch only |
| CE-D3 | Exact pinned CLI version; `2.111.0` only if Run #17 evidence proves it, otherwise stop for Owner Alignment |
| CE-D4 | Fail-closed hosted-credential gate before local startup |
| CE-D5 | Dedicated workflow — existing N2.4 stays unchanged |
| CE-D6 | Replay-only, stop at first result |
| CE-D7 | Owner-approved descendant of `4b82a7c5bb5c8e41654304cb3b1576a7954c2da3` only, with a path-diff proven clean |

## Blocking precondition — CLI version proof

Run #17 (`31141821543`) logs are not readable from this environment. Before the workflow is written, the exact CLI version must be established from authoritative existing evidence or supplied by the Owner. If neither is available: **STOP — CLI VERSION NOT PROVEN**, do not write the workflow, do not fall back to `latest`.

## Proposed changed-path envelope — exactly two paths

1. `.github/workflows/ws0006-slice3a-canonical-replay.yml` — new, replay-only
2. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/evidence/slice-3a/canonical-replay-contract.md` — new evidence/contract artifact

`.github/workflows/n2-4-controlled-supabase-runtime.yml`, `supabase/config.toml`, both frozen migrations, all other migrations, tests, rollback artifact and application code remain untouched. The new filename is absent from N2.4's path filters, so introducing it cannot trigger N2.4.

## Proposed workflow shape

- Triggers: `workflow_dispatch` only. No `push`, no `pull_request`, no `schedule`, no `workflow_call`, no path filters.
- `permissions: contents: read`. No `environment:` reference. Single job, `runs-on: ubuntu-24.04`, timeout 60 minutes, concurrency group with `cancel-in-progress: false`.
- Does not call, need, or reuse any N2.4 job.

Steps, in order:

1. `actions/checkout@v4` at the dispatched ref.
2. Record identity: repository, `GITHUB_SHA`, ref, runner name, `ImageVersion`, `docker version`, and — after CLI setup — the runtime output of `supabase --version`, asserted equal to the pinned version. → `environment.log`, `repository-identity.log`
3. Fail-closed hosted-credential gate, before any Supabase command. Non-empty check with `exit 1` on: `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGURI`. Also assert `supabase/.temp` and `.supabase` do not exist. Values are never printed — PRESENT/ABSENT only. → `hosted-credential-gate.log`
4. `supabase/setup-cli@v3` with the exact pinned `version:`.
5. Assert migration count = 326 and record first and last filename. → `migration-count.log`
6. Verify frozen hashes, `exit 1` on mismatch: `20260723235157_...` = `ca12218a2976a672bce6ddaa25454209cce6b7ca15f1aae437940d9851a3ff87`; `20260726092019_...` = `a563431bde0d587a5363fb36be5eb0f0fd25d8c2452548036865d73e17358add`. → `migration-hashes.log`
7. `supabase db start` with `set -o pipefail`, full-chain replay, first failure captured verbatim, no retry, no skip, no continuation. → `migration-replay.log`
8. On success only: record `supabase_migrations.schema_migrations` count, first and last version, PostgreSQL server version, and `supabase status` with keys/tokens/passwords redacted. → `local-status.log`
9. Stop.
10. `if: always()` — `supabase stop --no-backup`. → `teardown.log`
11. `if: always()` — write one of the three verdicts and upload all artifacts. → `final-verdict.txt`

## Explicitly absent from the workflow

No `supabase test db`, no Catalog SQL, no Behavioral pgTAP, no fixture DML, no `SET ROLE`, no `rollback.sql`, no schema rollback, no Forward → Rollback → Forward, no reconstruction equivalence or fingerprint, no Slice 3B/3C step, no `supabase link`, no `db push`, no `migration repair`, no remote DB URL, no `secrets.*` reference. These constructs are not present in the file at all, so the job is structurally incapable of executing them.

## Pre-dispatch gate (performed and reported before any run)

1. Report the exact execution SHA in full.
2. Prove it is a descendant of `4b82a7c5bb5c8e41654304cb3b1576a7954c2da3`.
3. Path-diff from `4b82a7c5` to the execution SHA; only the two authorized paths may appear.
4. Re-verify both frozen migration hashes; no other migration may differ.
5. On any unexpected path or unrelated commit: STOP, no dispatch, return for Owner Alignment.
6. Once approved, that SHA is immutable for the replay — no silent advance to a newer commit.

## Evidence package

`environment.log`, `hosted-credential-gate.log`, `repository-identity.log`, `migration-hashes.log`, `migration-count.log`, `migration-replay.log`, `local-status.log` (on startup success), `teardown.log`, `final-verdict.txt` — each header-bound to RM-DH-004, WS-DH-2026-0006, Prompt 57, Slice 3A, execution SHA, workflow file SHA-256, execution time (Asia/Riyadh) and GitHub run ID. Retention 30 days.

## Result classification

Exactly one of: `CANONICAL FULL REPLAY PASSED`; `CANONICAL REPLAY BLOCKED AT <exact migration>`; `CANONICAL ENVIRONMENT BOOTSTRAP FAILED BEFORE MIGRATION REPLAY`. No outcome confers repair authority. If the first canonical blocker is #308 it becomes a PROVEN CANONICAL FRESH-REBUILD BLOCKER and the run stops there — no enumeration past it, no remediation in the same run.

## Exact stop

Stop after the workflow file and contract artifact are written and the pre-dispatch gate report is produced. Do not dispatch the workflow, do not run canonical replay, do not touch N2.4, do not execute Behavioral QA or rollback, do not start Slice 3B/3C, do not issue Prompt 58, do not claim Slice 3A Acceptance.
