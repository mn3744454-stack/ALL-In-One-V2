# AML.1.b.1 — Stage 5 Closure

**Status:** `AML.1.b.1 STAGE 5: PASSED — PRIVATE HELPERS AND IDEMPOTENCY INFRASTRUCTURE VERIFIED.`
**Stage 6:** `READY, NOT STARTED.`

## Migration
- **Migration E:** `supabase/migrations/20260720175538_ebb2a161-58f8-4f72-b204-979d35c04fc5.sql`
- Applied successfully. All in-migration mechanical tests raised `STAGE5 TESTS PASSED`.

## pgcrypto
- `pgcrypto` was already installed prior to Stage 5 in schema `extensions`.
- `CREATE EXTENSION` was NOT issued. `_finance_request_hash` fully qualifies the call as `extensions.digest(...)`.

## Applied function signatures (owner = `postgres`)

| # | Signature | SECURITY DEFINER | Volatility | search_path |
|---|-----------|------------------|------------|-------------|
| 1 | `public._finance_advisory_lock_key(p_tenant_id uuid, p_operation text, p_idempotency_key uuid) → bigint` | no  | IMMUTABLE | `''` |
| 2 | `public._finance_source_lock_key(p_tenant_id uuid, p_source_type text, p_source_id uuid) → bigint`      | no  | IMMUTABLE | `''` |
| 3 | `public._finance_request_hash(p_operation text, p_tenant_id uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb) → bytea` | no  | IMMUTABLE | `''` |
| 4 | `public._finance_riyadh_date(p_ts timestamptz) → date`                                                  | no  | IMMUTABLE | `''` |
| 5 | `public._finance_idempotency_begin(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb) → TABLE(is_replay bool, request_hash bytea, stored_response jsonb)` | yes | VOLATILE  | `''` |
| 6 | `public._finance_idempotency_complete(p_tenant_id uuid, p_operation text, p_idempotency_key uuid, p_actor_id uuid, p_request_hash bytea, p_resolved_snapshot jsonb, p_response jsonb) → jsonb` | yes | VOLATILE | `''` |
| 7 | `public._finance_idempotency_purge_expired(p_cutoff timestamptz) → bigint`                              | yes | VOLATILE  | `''` |

## Function ACL matrix

Base `proacl` for all seven: `postgres=X`, plus internal migration executors (`sandbox_exec*=X/postgres`) that carry no user-facing exposure.

| Role             | 1 | 2 | 3 | 4 | 5 (begin) | 6 (complete) | 7 (purge) |
|------------------|---|---|---|---|-----------|--------------|-----------|
| `PUBLIC`         | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `anon`           | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `authenticated`  | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `service_role`   | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (EXECUTE) |
| `postgres` (owner) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Confirmed via `has_function_privilege` inside the migration.

## `finance_request_idempotency` state
- RLS enabled, not forced (unchanged from Stage 3).
- No policies.
- No `PUBLIC` / `anon` / `authenticated` table privileges.
- **Row count after migration: 0.** All synthetic test rows deleted before the migration terminated.

## Mechanical tests (all PASSED)
1. Canonical JSON key-order insensitivity → identical SHA-256.
2. Caller intent change → different SHA-256.
3. Digest length = 32 bytes.
4. `_finance_riyadh_date('2026-07-20 21:30 UTC')` = `2026-07-21`.
5. Same lock inputs → same key.
6. Tenant participates in both advisory and source lock keys.
7. New key → reservation with `is_replay=false`.
8. `complete` stores non-null response and resolved snapshot.
9. Same key + same actor + same hash → replay with stored response.
10. Different actor → `42501 FIN_IDEMPOTENCY_ACTOR_MISMATCH` (actor check precedes hash check).
11. Different hash → `23514 FIN_IDEMPOTENCY_CONFLICT`.
12. Active null-response reservation → `40001 FIN_IDEMPOTENCY_IN_PROGRESS`.
13. Expired reservation → conditional `UPDATE ... WHERE expires_at <= now()` reclaim (no delete-then-insert). Actor rotated, `response` NULL, `resolved_snapshot='{}'`.
14. `_finance_idempotency_purge_expired(now())` removes only expired rows.
15/16. All synthetic rows deleted; final table row count = 0.
17. Privilege matrix above holds.
18. Stage 4 permission definitions (`finance` module count = 19) and `كبير المشرفين` Finance bindings (count = 17, `finance.invoice.markPaid` present) unchanged.

## Financial / protected-record parity
- No writes to invoices, invoice_items, ledger_entries, customer_balances, billing_links, expenses, payment_intents, or pos_sales.
- Stage 2 fingerprints continue to match. `الم-202607-213` untouched.

## Stage 3 canonical closure (D-07 pos_sales precision)

> The earlier `pos_sales` precision deviation was a read-only audit false positive. `information_schema.columns.data_type` reported `numeric`, while `numeric_precision=12` and `numeric_scale=2` confirmed the approved `numeric(12,2)` definition. Migration C aborted at its pre-guard and applied no schema mutation.

The PLAN-LOCK and the canonical D-07 entry in `docs/aml_1_b_1/stage_01_preflight/STAGE_01_CLOSURE.md` are NOT edited by this stage.

## Rollback artifact
- Path: `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql`
- Drops the seven Stage 5 function signatures in reverse dependency order.
- Does NOT drop or truncate `finance_request_idempotency`.
- Does NOT touch Stage 3 or Stage 4 objects.
- Must not be run while Stage 6 depends on these helpers — roll Stage 6 back first.

## Stage 6
Not started. No public RPCs or domain adapters created in this stage.
