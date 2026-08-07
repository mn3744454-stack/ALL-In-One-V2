# Slice 3A — Fresh-Rebuild Unblock Evidence

Workstream: WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation
Roadmap: RM-DH-004
Slice: 3A — Core Control Plane
Prompt lineage: Prompt 57 — Part B — Fresh-Rebuild Unblock Execution (same Prompt ID, no new number consumed)
Owner alignment applied: CI-D1 (pre-existing debt), CI-D2/CI-D3 (Option A, guard-only in-place edits), CI-D4 (retain full chain replay), CI-D6 (minimal unblock scope)

Final verdict: **BLOCKED — ADDITIONAL FRESH-REBUILD BLOCKERS DISCOVERED BEYOND THE AUTHORIZED ENVELOPE**

---

## 1. Authorized changed-path envelope

Exactly three repository paths were authorized and exactly three were modified:

| # | Path | Change class |
|---|------|--------------|
| 1 | `supabase/migrations/20260723235157_c56d3417-17ad-4008-a846-8be103b0ebe1.sql` | Guard-only, semantics-preserving |
| 2 | `supabase/migrations/20260726092019_69205b8e-fb7d-413e-82cf-1c9d03703c20.sql` | Guard-only, semantics-preserving |
| 3 | `docs/.../evidence/slice-3a/fresh-rebuild-unblock.md` | New evidence artifact (this file) |

No other repository path was modified. No new Migration was created. No hosted-database DDL or DML was executed. No CI workflow was invoked.

## 2. File hashes (SHA-256)

| Path | Pre-edit | Post-edit |
|------|----------|-----------|
| `20260723235157_...sql` | `6cd25103f0512a53796d221357c83a41615f4efe70901fb6db1ca90d54c94278` | `ca12218a2976a672bce6ddaa25454209cce6b7ca15f1aae437940d9851a3ff87` |
| `20260726092019_...sql` | `308b4e5dffb46938fce0256e9d8cd465ba69dc9b86a9a3cdfb415230c22c5365` | `a563431bde0d587a5363fb36be5eb0f0fd25d8c2452548036865d73e17358add` |

Precedent artifact consulted (unchanged): `20260720173125_d616b20c-6f73-4b66-8950-d2482bfc0bc3.sql`, SHA-256 `28eab4f1ce1215c3beff49decd12174a4b0392e7469308e4c898a56bdc511807`.

## 3. Hosted migration-history reconciliation (read-only)

`supabase_migrations.schema_migrations` on the hosted database records:

| Recorded version | Recorded name |
|------------------|---------------|
| `20260723235158` | `20260723235157_c56d3417-17ad-4008-a846-8be103b0ebe1` |
| `20260726092021` | `20260726092019_69205b8e-fb7d-413e-82cf-1c9d03703c20` |

The history table records version and name only; it does not record a content hash of the Migration body. Guard-only edits to the two already-applied files therefore produce no remote history mismatch and no re-application on the hosted database.

## 4. Local disposable harness

The Supabase CLI and Docker are unavailable in the execution environment. A disposable PostgreSQL 17.9 cluster was initialized locally instead:

- Cluster: `initdb` under an unprivileged local account, data directory `/tmp/pgdata`, port `55432`, unix socket only (`listen_addresses=''`).
- Baseline: a bootstrap script creating the Supabase-equivalent prerequisites — roles (`anon`, `authenticated`, `service_role`, `authenticator`, `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`, and related), schemas (`auth`, `storage`, `realtime`, `extensions`, `graphql_public`, `supabase_migrations`), `auth.users` / `auth.identities` / `auth.sessions`, `auth.uid()` / `auth.role()` / `auth.jwt()` / `auth.email()`, `storage.buckets` / `storage.objects` and helper functions, the `supabase_realtime` publication, and the `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pg_net`, `pg_cron` extensions (`pg_net` and `pg_cron` as local no-op stubs).
- Replay: each Migration file applied in file-name order, one file per transaction, with `ON_ERROR_STOP=1`.
- Zero hosted-database writes. Zero customer Tenants, Users or data. All fixtures synthetic or absent.

Harness caveat: the baseline is a local approximation of the managed Supabase baseline, not the managed baseline itself. It is sufficient to reproduce and clear fixture-dependency blockers; it is not a substitute for the CI disposable-database run.

## 5. Blocker 1 — `20260723235157` (verification-only Migration)

Reproduced pre-edit failure, at Migration #307 of 326:

```
ERROR: N1B_J3_VERIFY_FIXTURE_ACTOR_NOT_MEMBER
```

This Migration creates no permanent database object. It is a verification harness that asserts RPC behaviour against hard-coded historical Tenant, User, permission and cross-Tenant Service fixtures that exist only in the already-migrated hosted database.

Change applied: a clean-reconstruction fixture-presence guard inserted immediately after `BEGIN`, before any statement of the original body. When every required fixture is present the original body executes byte-for-byte unchanged — every assertion, error class, cleanup step and zero-residue check is intact. When any required fixture is absent the block emits a `NOTICE` and returns without effect.

Guard predicate (all must hold for the original verification to run):
1. Fixture Tenant exists.
2. Fixture User exists in `auth.users`.
3. Fixture User is an active member of the fixture Tenant.
4. Fixture User holds `finance.invoice.create`, `finance.invoice.approve`, `finance.invoice.update`.
5. The manual invoice-number counter row and the three cross-Tenant Service fixtures (`tenant_services`, `lab_services`, `stable_service_plans`) exist.

Nothing is synthesized. No Tenant, User, membership, permission or Service is created by the guard. No assertion was weakened, removed or reordered.

## 6. Blocker 2 — `20260726092019` (one-row historical repair + schema)

Reproduced pre-edit failure:

```
ERROR: Blocking row not found
```

This Migration mixes a one-row historical ledger repair (sections A–D, inside a `DO` block) with permanent schema creation (`payment_sessions`, `payment_allocations`, and related objects). Only the repair depends on historical data.

Change applied: a repair-target guard inserted between section (A) preflight assertions and section (B) blocking-row preconditions. All section (A) preflights still execute unchanged, and every schema statement after the `DO` block still executes unchanged.

Guard semantics: if the specific historical ledger row is absent **and** zero payment ledger rows lack a `payment_session_id`, the repair is skipped with a `NOTICE`. If the row is absent but any payment row still lacks a session id, the original `Blocking row not found` exception is raised unchanged — the skip is permitted only when there is genuinely nothing to repair, so the post-repair invariant is never relaxed.

## 7. Post-edit replay result

Full local replay of all 326 Migrations from an empty database, after the two authorized edits:

- Migrations #1–#307 apply cleanly, including both previously blocking Migrations. Both authorized blockers are **cleared and proven cleared**.
- Replay now fails at Migration **#308**, `20260724000858_8ffb8b77-5e19-46e6-a5ba-d835d8277290.sql`:

```
ERROR: J4.0 ABORT: expected 5 targets, found 0
```

This is a third, previously unproven fresh-rebuild blocker of the same class (historical-data dependency in an already-applied Migration). It lies outside the authorized three-path envelope, so execution stopped here.

## 8. Indicative inventory of remaining blockers

To size the remaining debt without exceeding the envelope, a scratch copy of the Migration tree outside the repository was replayed with each newly discovered blocker skipped in turn. The repository tree was not modified during this enumeration.

| Order | Migration | First error | Contains DDL |
|-------|-----------|-------------|--------------|
| #308 | `20260724000858_8ffb8b77...` | `J4.0 ABORT: expected 5 targets, found 0` | no |
| #310 | `20260724004012_f923a7b9...` | `J4.1 abort: target invoice_item not found` | no |
| #311 | `20260724011034_b36bf9db...` | `J4.2 ABORT: target invoice ... not found` | no |
| #312 | `20260724012139_d4affc20...` | `J5 preflight D7: J4.2 repaired item is missing` | yes |
| #313 | `20260725064150_e3db1031...` | `J5_2_PREFLIGHT_LIVE_SOURCE_CHECKOUT_MISSING` | yes |
| #323 | `20260804083738_3d2d0ddf...` | `STAGE_B_TABLE_ACL_PRESTATE_DRIFT` | yes |
| #326 | `20260806233227_4a4a2c93...` (Slice 3A Part A) | `PRECONDITION FAILED: expected restricted role sandbox_exec does not exist` | yes |

Inventory caveats:
- The enumeration skipped whole files. Where a skipped file carried DDL, later entries may be partly cascade artifacts of that skip rather than independent debt. Each entry must be re-proven individually once the preceding one is genuinely unblocked.
- #312 and #313 depend on repairs performed by #310/#311; guarding the earlier repairs will likely require matching guards in their downstream preflights.
- #323 is an ACL pre-state drift assertion, not a fixture dependency; it is sensitive to the harness baseline ACL and may behave differently on the managed CI baseline.
- #326 is the Slice 3A Part-A Migration itself. Its failure is a **harness bootstrap gap**, not Migration debt: the platform-managed `sandbox_exec` role does not exist in the local cluster. On the managed CI baseline this role exists. The Part-A Migration was not modified.

## 9. Boundary attestations

- Hosted database: read-only reconciliation queries only. Zero DDL, zero DML, zero writes.
- Customer Tenants and Users: not used, not read for fixture purposes, not created.
- Part-A Migration `20260806233227`: unchanged.
- Six-table Slice 3A contract: unchanged.
- Behavioral QA harness paths (behavioral test, catalog test, CI workflow, rollback artifact): unchanged in this run.
- CI: not invoked.
- Slice 3B: not started.

## 10. Required next Owner decision

The minimal unblock scope authorized by CI-D6 assumed two blockers. The proven inventory is larger. Continuing requires either:

- **Option 1 — Extended guard sweep.** Authorize a new envelope covering the remaining fixture-dependent historical Migrations under the same guard-only, semantics-preserving contract, iterating locally until the full 326-Migration chain replays clean, with no CI rerun until it does.
- **Option 2 — Revisit CI-D4.** Replace the full empty-database chain-replay requirement with a proven schema baseline plus forward-only Migrations, which retires this class of debt for Behavioral QA at the cost of the reconstruction-equivalence proof.

No CI rerun of workflow #17 or its successor should be authorized until the full chain replays clean locally.
