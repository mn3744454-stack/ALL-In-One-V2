# Stage A — Validation Record

**INTERNAL RESTRICTED EXECUTION EVIDENCE** — Batch `STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89`

## 1. Pre-execution baseline (read-only, before any write)

| Check | Expected | Observed | Result |
|---|---:|---:|---|
| Total Ledger rows | 88 | 88 | PASS |
| Global NULL `effective_date` | 28 | 28 | PASS |
| Frozen target map rows | 28 | 28 | PASS |
| Targets still NULL, matching Tenant, Client, amount and source | 28 | 28 | PASS |
| Payment Session date disagreements with approved dates | 0 | 0 | PASS |
| Affected-client Ledger rows | 87 | 87 | PASS |
| Rows requiring `balance_after` change under canonical order | 69 | 69 | PASS |
| Clients where stored balance ≠ SUM(amount) | 0 | 0 | PASS |
| Permanent triggers on `ledger_entries` | 0 | 0 | PASS |

Drift result: **NO MATERIAL DATA DRIFT**.

## 2. Locking

- Seven transaction-level advisory locks obtained with `pg_advisory_xact_lock(public._finance_advisory_lock_key(tenant_id,'client_ledger',client_id))`, iterated in ascending `tenant_id, client_id` order.
- All 87 affected `ledger_entries` rows locked `FOR UPDATE`.
- All seven `customer_balances` rows locked `FOR UPDATE`.
- No session-level lock was used; all locks released automatically at commit.

## 3. In-transaction preconditions (re-asserted under lock)

`STAGE_A_MAP_COUNT`, `STAGE_A_PRECONDITION_MISMATCH`, `STAGE_A_SOURCE_DATE_DRIFT`, `STAGE_A_GLOBAL_NULL_COUNT`, `STAGE_A_AFFECTED_SCAN_COUNT`, `STAGE_A_PRE_RECONCILIATION_FAILED` — all guards evaluated, none raised.

## 4. Writes

| Step | Statement | Expected rows | Actual rows | Guard |
|---|---|---:|---:|---|
| 6 | `UPDATE ledger_entries SET effective_date` by explicit UUID map | 28 | 28 | `STAGE_A_DATE_UPDATE_COUNT` |
| 7 | `UPDATE ledger_entries SET balance_after` from canonical window | 69 | 69 | `STAGE_A_BALANCE_UPDATE_COUNT` |

## 5. In-transaction postconditions

| Assertion | Result |
|---|---|
| All 28 targets hold the approved date | PASS |
| Global NULL `effective_date` = 0 | PASS |
| No non-target `effective_date` changed | PASS |
| No `amount` or `created_at` changed | PASS |
| All 87 rows match the canonical running balance | PASS |
| Stored Customer Balances still equal SUM(amount) for all 7 clients | PASS |

Commit executed only after every assertion passed.

## 6. Post-commit verification (independent read-only re-query)

| Check | Observed | Result |
|---|---:|---|
| Total Ledger rows | 88 | PASS |
| Global NULL `effective_date` | 0 | PASS |
| Targets holding the approved date | 28 | PASS |
| Canonical-order mismatches across the 87 affected rows | 0 | PASS |
| Clients where stored balance ≠ SUM(amount) | 0 | PASS |
| `balance_after` rows changed vs. before image | 69 (25 target, 44 non-target) | PASS |
| Target rows with unchanged balance | 3 (`3cd0f5ab…`, `4f445239…`, `61cfe843…`) | PASS |

## 7. Monetary reconciliation

Per-client debit, credit, net, stored balance and difference are in `reconciliation-before-after.csv`. Aggregate across the seven clients: rows 87, debit 176,043.93, credit −38,342.58, net 137,701.35, stored Customer Balance total 137,701.35, difference **0.00** — identical before and after.

## 8. Unresolved exceptions

- Two owner-approved legacy exceptions recorded (`774175c3…`, `72913983…`): Economic Date precedes the related Invoice issue date. Accepted under D-4.
- One Ledger row lies outside the seven approved clients and was intentionally not touched; it was not NULL and required no Stage A action.
- No blocker, no partial write, no unresolved defect.
