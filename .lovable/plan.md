# AML.1.b.1 Stage 6 N+2 Read-Only Acceptance Re-Audit — Execution Plan

## Scope

Independent, read-only verification of the eight non-POS canonical RPCs (§§7.6–7.12 + §7.14) reported as installed. No code, no docs, no migrations, no type regen, no RPC invocations against live data. Deliverable is the 30-section evidence report defined in §17 of the prompt.

## Evidence-gathering steps (all read-only)

1. **Preimage & repo state**
   - `git status --porcelain`, `git diff --check`, working-tree hash
   - Locate N+2 migration file under `supabase/migrations/`, capture filename + full diff
   - Re-hash `docs/aml_1_b_1/PLAN_LOCK.md` and `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`; compare against last-known preimages (`27f84205…`, `552c9449…`)

2. **Function identity (§4)**
   - `psql` catalog queries against `pg_proc` / `pg_get_function_identity_arguments` / `pg_get_function_result` for each of the 8 RPCs
   - Confirm exactly one overload, exact ordered arg types/names, exact return type, `regprocedure`
   - Compare with `src/integrations/supabase/types.ts` generated declarations

3. **Security posture (§6)**
   - Per function: `prosecdef`, `proconfig` (search_path=''), owner, volatility
   - ACL via `pg_proc.proacl` → PUBLIC / anon / authenticated / service_role EXECUTE state
   - Re-verify `_finance_billing_link_upsert` and `_finance_expense_create_sourced` remain owner-only

4. **Permission-catalog audit (§7)**
   - `SELECT key FROM permission_definitions WHERE key IN (...)` for all 9 candidate keys
   - Inspect `has_permission()` resolution path and role→permission bindings via `tenant_role_permissions` / `permission_bundles`
   - Extract exact permission keys referenced in each RPC body via `pg_get_functiondef`
   - Produce AND/OR logic table + effective-authority verdict, with dedicated `hr.manage` assessment

5. **Semantic contract audit (§8)**
   - Full `pg_get_functiondef` for each of the 8 RPCs
   - Trace each requirement (locks, tenant re-resolution, payload allowlist, ledger sign, effective_date source, idempotency, atomic rollback) → PASS / FAIL / DEFERRED / N/A

6. **Idempotency/concurrency/atomicity (§9)**
   - Per-function: request-hash inputs, `finance_request_idempotency` interaction, advisory-lock keys, `FOR UPDATE` targets, uniqueness constraints, exception handling
   - Static proof only

7. **Ledger sign & effective-date matrix (§10)** — consolidated table across all 7 operation shapes

8. **Source/helper/uniqueness mapping (§11)** — per-operation table

9. **Cross-tenant / info-disclosure (§12)** — static trace per function

10. **Linter reconciliation (§13)**
    - Run `supabase--linter`; fingerprint findings (rule + object + severity)
    - Attempt to locate any preserved pre-migration snapshot in `docs/aml_1_b_1/`
    - If unavailable, report `LINTER DELTA INCONCLUSIVE — PREIMAGE NOT PRESERVED` separately from the "none of the 8 new RPCs appear in WARN/ERROR" conclusion

11. **Governing-doc audit (§14)**
    - Verify POS Option A addendum content in `PLAN_LOCK.md`
    - Confirm `STAGE_06_EXECUTION_SPEC.md` is unchanged since `552c9449…`; if so, classify `CONFIRMED DOCUMENTATION EXECUTION DEVIATION` and enumerate minimal passages needing update

12. **Unauthorized-change sweep (§5)** — confirm N+2 did not touch POS, inventory, frontend callers, `tenant_services.stockable`, orphan invoice -213, balance reconstruction, effective-date backfill, Phase 2 scope

## Tools used (read-only only)

- `code--exec` for `git status`, `git diff`, `sha256sum`, `wc`
- `psql -c` for catalog / ACL / permission / role-binding queries (SELECT only)
- `code--view` for migration file, generated types, `PLAN_LOCK.md`, `STAGE_06_EXECUTION_SPEC.md`, private-helper migration
- `supabase--linter` for current linter snapshot
- `rg` for referenced-symbol sweeps in repo

Explicitly NOT used: `supabase--migration`, `supabase--insert`, any RPC invocation, any file write/edit/delete, any type regeneration.

## Verdict selection

Applied strictly per §16 (A / B / C). Ends with the exact mandated sentence per verdict. Report structured as the 30 numbered sections in §17. Every PASS cites an inspected artifact.

## Estimated evidence-collection surface

~25–40 read-only tool calls (batched where independent) before composing the final report in one message.

## Explicit non-goals

- No implementation of §7.13 / POS Option A DDL
- No `STAGE_06_EXECUTION_SPEC.md` edit (deviation is reported, not repaired)
- No Phase 2 work
- No Stage 6 or Phase 1 completion claim
- No launch-readiness claim

Approve to switch to build mode; I will then execute the read-only queries and return the single consolidated evidence report.