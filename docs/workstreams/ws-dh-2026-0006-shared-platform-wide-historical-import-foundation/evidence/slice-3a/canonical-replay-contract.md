# Slice 3A — Canonical Replay Contract (Pre-Dispatch)

CANONICAL REPLAY NOT EXECUTED
CI NOT DISPATCHED

This is a pre-dispatch contract artifact. It records the Owner-approved canonical replay architecture and the identity of the dedicated workflow. It contains no runtime result and asserts no runtime proof.

---

## A. Identity

| Field | Value |
|---|---|
| Roadmap | RM-DH-004 — Financial Truth Stabilization & Historical Data Migration |
| Phase | Phase 2 — Shared Platform-Wide Historical Import Foundation |
| Workstream | WS-DH-2026-0006 |
| Prompt | 57 — CONSUMED — same-ID continuation, no new number |
| Slice | 3A — Core Control Plane |
| Parallel Task | PT-DH-RM004-WS0006-P57-DEDICATED-CANONICAL-REPLAY-WORKFLOW-IMPLEMENTATION-20260807-0901 |
| Date / time | 07-08-2026, Asia/Riyadh UTC+03:00 |

## B. Owner-approved architecture

Official Supabase CLI, pinned exactly, installing and driving the Supabase-managed local Docker stack from this repository's own `supabase/config.toml`; a dedicated manual-dispatch workflow whose only responsibility is a complete ordered migration-chain replay from an empty disposable database, stopping at the first result.

This is a **local canonical reconstruction** boundary. It is explicitly **not** hosted production equivalence: the managed Supabase platform differs in platform roles (for example `sandbox_exec`), `pg_default_acl` policy, extension set and managed defaults. No claim beyond repository-chain reconstruction may be derived from any outcome of this workflow.

## C. Baselines

| Baseline | SHA |
|---|---|
| Frozen Code Baseline | `4b82a7c5bb5c8e41654304cb3b1576a7954c2da3` |
| Preparation Baseline | `f2579a4bcd089fd4f1e21198472fab7cfd3d219d` |

The only material repository-path difference between the two is `.lovable/plan.md`, produced by platform Planning Mode state. Classification: PLATFORM-GENERATED PLAN-ONLY DRIFT — READ-ONLY CONTRACT VIOLATION — NO RUNTIME CODE CHANGE — NO MIGRATION CHANGE — NO CI EXECUTION. It remains part of the lineage and authorizes no further `.lovable/plan.md` write.

## D. Frozen historical migrations — IMPLEMENTED — NOT ACCEPTED — FROZEN

| Path | Required SHA-256 |
|---|---|
| `supabase/migrations/20260723235157_c56d3417-17ad-4008-a846-8be103b0ebe1.sql` | `ca12218a2976a672bce6ddaa25454209cce6b7ca15f1aae437940d9851a3ff87` |
| `supabase/migrations/20260726092019_69205b8e-fb7d-413e-82cf-1c9d03703c20.sql` | `a563431bde0d587a5363fb36be5eb0f0fd25d8c2452548036865d73e17358add` |

Both verified byte-identical at the Preparation Baseline before this implementation, and re-verified after it. Neither was modified by this execution.

## E. CLI evidence

Supabase CLI **2.111.0**, proven from GitHub Actions Run #17 (Run ID `31141821543`, historical SHA `7cc1bd841bab0fb0ba8f418c2c11d66c422acf1c`). Reference runtime evidence from the same run, recorded as reference only and not as hard acceptance values: Ubuntu 24.04.4 LTS, runner `ubuntu-24.04`, image version `20260720.247.2`, Docker Engine 28.0.4, Supabase Postgres image 17.6.1.156. `latest` is prohibited. The workflow asserts the installed version at runtime and refuses to replay on mismatch.

## F. Dedicated workflow identity

| Field | Value |
|---|---|
| Path | `.github/workflows/ws0006-slice3a-canonical-replay.yml` |
| Display name | WS0006 Slice 3A — Canonical Fresh Replay Only |
| SHA-256 (post-write) | `56d08e947b66833fc56f9c70361e52d605666bb034a8a5e7750743bf79ede23f` |

The workflow recomputes and records its own SHA-256 at runtime into `repository-identity.log` and `final-verdict.txt`.

## G. Trigger contract

`workflow_dispatch` only. No `push`, `pull_request`, `schedule`, `workflow_call`, `repository_dispatch`, `workflow_run`, and no path filter. It cannot run merely because it was committed. Its path is absent from the N2.4 workflow's own path filters, so creating it cannot trigger N2.4 either.

## H. Permissions contract

`permissions: contents: read` only. No write scope of any kind, no `id-token`, no GitHub `environment:` binding. Checkout uses `actions/checkout@v4` with `persist-credentials: false`. The workflow performs no Git mutation.

## I. Credential isolation contract

Before the CLI is installed or invoked, a fail-closed gate checks presence only — never values — of `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGURI`, and of local linkage metadata `supabase/.temp`, `.supabase`, `supabase/.branches`. Presence of any one is itself the failure condition. The workflow YAML references no `secrets.*` and no `vars.*`. It never calls `env`, `printenv`, or `set -x`.

## J. Migration count contract

Runtime gate requires exactly **326** `.sql` files directly under `supabase/migrations`, recording count, first and last filename. Drift blocks replay and classifies as bootstrap failure. No repair.

## K. Frozen hash gate

Runtime gate recomputes both frozen SHA-256 values and blocks replay on mismatch. No file is modified by the workflow.

## L. Replay-only contract

The sole database command is `supabase db start`, executed exactly once, output captured verbatim. No retry, no migration skip, no manual apply, no history stamping, no repair, no fixture seeding, no second replay. The workflow contains no `supabase test db`, no catalog SQL, no behavioral pgTAP, no fixture DML, no `SET ROLE`, no `rollback.sql`, no schema rollback, no forward/rollback/forward, no fingerprint or reconstruction equivalence, no Slice 3B or 3C step, no `supabase link`, no `db push`, no `migration repair`, and no hosted URL, token or key usage. It neither calls nor reuses any N2.4 job.

## M. Evidence-package contract

`environment.log`, `hosted-credential-gate.log`, `repository-identity.log`, `migration-count.log`, `migration-hashes.log`, `migration-replay.log`, `local-status.log` (success only), `teardown.log`, `final-verdict.txt`. Artifact name `WS0006-Slice3A-CanonicalReplay-<run id>`, retention 30 days, uploaded under `if: always()` before any failure enforcement. Raw `supabase status` output is written to a temporary file outside the artifact directory and is never uploaded; only an explicit allowlist (URL scheme, local-host boolean, PostgreSQL server version, recorded migration count, first and last recorded version) reaches `local-status.log`. No key, token, password, JWT secret or connection credential is emitted.

## N. Verdict contract

Exactly one of: `CANONICAL FULL REPLAY PASSED`; `CANONICAL REPLAY BLOCKED AT <exact migration>`; `CANONICAL ENVIRONMENT BOOTSTRAP FAILED BEFORE MIGRATION REPLAY`. The blocked verdict is emitted only when the log reliably identifies an `Applying migration <filename>` event; otherwise the bootstrap verdict is used. The failed migration is never guessed. Final job status is success only for a clean full replay.

## O. No-repair contract

No verdict confers migration repair authority. If `20260724000858_8ffb8b77-5e19-46e6-a5ba-d835d8277290.sql` is the first canonical failure, its status becomes PROVEN CANONICAL FRESH-REBUILD BLOCKER and the run stops there — no enumeration beyond it, no remediation in the same run, and a new Owner Alignment is required before any guard sweep.

## P. N2.4 isolation

`.github/workflows/n2-4-controlled-supabase-runtime.yml` is byte-identical before and after this implementation, SHA-256 `fe6d3bdde1379d06d742ae7e39a36c0d4f1fa5bb925a52d38e5364b8b7d363ff`. `supabase/config.toml` is likewise unchanged, SHA-256 `a694400fdb3b59aa99de9eab9ea43031e4d02adf7cd57579e248d3662502e36e`. N2.4 remains all-or-nothing on dispatch and is therefore still unsafe for replay-only use; it is not used here.

## Q. Pre-dispatch SHA gate

Before any dispatch the following must all hold, and be reported to the Owner: the execution SHA is reported in full; it is a proven descendant of `4b82a7c5bb5c8e41654304cb3b1576a7954c2da3` and of `f2579a4bcd089fd4f1e21198472fab7cfd3d219d`; both frozen migration hashes are exact; no other migration differs; N2.4 and `supabase/config.toml` are byte-identical; the path-diff contains only authorized paths. Once approved, that SHA is immutable for the replay — no silent advance to a newer commit.

## R. Changed-path envelope

Exactly two paths were created by this execution:

1. `.github/workflows/ws0006-slice3a-canonical-replay.yml`
2. `docs/workstreams/ws-dh-2026-0006-shared-platform-wide-historical-import-foundation/evidence/slice-3a/canonical-replay-contract.md`

Across the broader lineage from the Frozen Code Baseline, the only additional path is the platform-generated `.lovable/plan.md`.

## S / T. Execution status

CANONICAL REPLAY NOT EXECUTED.
CI NOT DISPATCHED.

## U. Owner decision still required

Approval of the exact final full execution SHA before the dedicated workflow is dispatched. No dispatch is authorized until that approval is granted.
