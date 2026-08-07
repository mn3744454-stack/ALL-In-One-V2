# Prompt 57 — Part B Execution Contract (Owner Aligned)

RM-DH-004 / Phase 2 / Stage 2 / Slice 3A — Behavioral QA Harness

Status: OWNER ALIGNMENT COMPLETE — EXECUTION PENDING APPROVAL OF THIS PLAN.
No new Prompt number consumed. Prompt 58 remains unconsumed.

## Owner-aligned decisions

| ID | Decision | Owner answer |
|---|---|---|
| PB-D1 | Primary test boundary | Ephemeral CI database |
| PB-D2 | Fixture lifecycle | Approved — transaction-scoped deterministic fixtures in CI |
| PB-D3 | Role impersonation | Approved — SET ROLE only inside CI test transactions; shared DB prohibited |
| PB-D4 | Rollback rehearsal | Approved — Ephemeral CI only; shared DB rollback permanently prohibited |
| PB-D7 | Behavioral QA scope | Approved — matrix 1–28 and 32–36; 29–31 deferred to Slice 3B |
| PB-D8 | Generic `sandbox_exec` | Option A — accept as bounded platform-managed exception; narrow the deny-all claim; document it; Slice-3A Acceptance still requires explicit exception acceptance |
| PB-D9 | Forward/rollback/forward | Option B — fresh disposable database / reset boundary per phase; no migration-history editing |
| Scope | Four changed paths | Approved |

## Hard boundaries

- Zero writes to the shared database: no DML, no `SET ROLE`, no rollback, no migration.
- Only read-only catalog rechecks against the shared database.
- No customer tenant data used anywhere; synthetic tenants only.
- No fallback to the shared database if CI fails.

## Work to perform (exactly four paths)

1. `supabase/tests/database/ws0006_slice3a_behavioral.test.sql` — new
   - Synthetic tenants A and B created inside the test transaction, rolled back at the end.
   - Behavioral matrix items 1–28 and 32–36: tenant-bound FK rejection, cross-tenant insert rejection, tenant-scoped checksum uniqueness (same hash allowed across tenants, rejected within one), RESTRICT delete behaviour, CHECK constraint rejections (state values, JSONB object shape, 64-hex SHA-256), partial unique index behaviour on `import_batch_files`, and FORCE RLS deny behaviour under `SET ROLE authenticated` / `anon` with zero policies present.
   - Items 29–31 explicitly documented as Part-A limitations owned by Slice 3B.

2. `supabase/tests/database/ws0006_slice3a_core_control_plane.test.sql` — corrected
   - Fresh-database-safe role-existence guard so a missing role fails cleanly instead of aborting.
   - Generic `sandbox_exec` removed from the customer-facing deny-all assertion.
   - Separate assertion reporting generic `sandbox_exec` as a platform-managed exception where the role exists.
   - Customer-facing deny-all assertion retained for `anon`, `authenticated`, `service_role`, `PUBLIC` and the project-scoped sandbox role.

3. `.github/workflows/n2-4-controlled-supabase-runtime.yml` — minimal edit
   - Add `supabase/tests/database/ws0006_*` to the path filters.
   - Add a Bootstrap Gate that proves Docker, Supabase CLI, `supabase db start`, pgTAP availability and full migration-chain replay before any test runs; failure stops the job with an exact failure report and no QA or Acceptance claim.
   - Run corrected Catalog tests, then Behavioral tests.
   - Run the PB-D9 rollback drill on a fresh disposable database per phase.
   - Upload per-gate evidence; keep `if: always()` teardown.

4. `docs/workstreams/ws-dh-2026-0006-.../evidence/slice-3a/rollback.sql` — corrected
   - Add the missing `relkind IN ('r','p','v','m','f')` filter to the post-drop guard.
   - Document that dropping tables is schema rollback only and does not revert `supabase_migrations.schema_migrations`; migration-history equivalence is proven by the fresh-database-per-phase drill instead.

## Evidence produced

Environment log, migration replay log, pgTAP version, per-gate test output, rollback drill log, uploaded artifact, and SHA-256 of each changed file.

## Explicitly out of scope

Slice 3B, Slice 3C, permission keys, RLS policies, RPCs, storage buckets, edge functions, governance persistence, Prompt 58, and Slice-3A Acceptance (which remains blocked pending explicit acceptance of the PB-D8 bounded platform exception).
