# Stage A — Economic Date Backfill — Execution Evidence

**INTERNAL RESTRICTED EXECUTION EVIDENCE**

## Identity

```text
Batch ID:
STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89

Prompt ID:
PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-BACKFILL-EXECUTION-07

Roadmap:
RM-DH-004 — Phase 1 — Economic Date Integrity

Workstream:
WS-DH-2026-0003 — Economic Date Integrity

Mode:
Agent/Build

Environment:
Lovable only
```

Batch ID pattern: `STAGE-A-ECONDATE-<YYYYMMDD>-<HHMM-Riyadh>-28-<HASH8>`, where `HASH8` is the first eight characters of the SHA-256 of the 28 target Ledger UUIDs sorted ascending and concatenated without separators. Value: `7ce5ca89`.

## Owner Decisions Applied

- **D-1** — Cancellation, void and reversal entries take the action date. Applied to `b2dabb21…` (2026-03-28), `b3e6f31e…` (2026-04-03), `92c69b2c…` (2026-04-03).
- **D-2** — The two duplicate-reconciliation voids received an Economic Date only. No Invoice was deleted, merged, re-cancelled, repaired or restatused.
- **D-3** — No row was classified or treated as a Historical Correction. No generic backdating rule was introduced.
- **D-4** — `774175c3…` and `72913983…` received `2026-05-09` against Invoice issue date `2026-05-10` and are recorded as `LEGACY_PRE_ISSUE_PAYMENT_EXCEPTION`. The `post_payment` guard was not modified.
- **D-5** — `balance_after` was recalculated atomically in the same transaction, canonical order `effective_date, created_at, id`, partitioned by `tenant_id, client_id`, scanning the 87 rows of the seven approved Tenant/Client pairs, writing only where the stored value differed. The column remains a Derived Persisted field; its authority model was not changed.

## Scope

- Target Ledger rows: **28** (full UUIDs in `target-rows-before.csv`).
- Approved Tenant/Client pairs: **7** (3 Tenants).
- Recalculation scan scope: **87** Ledger rows.
- Expected `balance_after` writes: **69**.

## Result

| Measure | Expected | Actual |
|---|---:|---:|
| `effective_date` rows updated | 28 | 28 |
| `balance_after` rows scanned | 87 | 87 |
| `balance_after` rows written | 69 | 69 |
| — of which target rows | 25 | 25 |
| — of which non-target rows | 44 | 44 |
| Target rows needing no balance change | 3 | 3 |
| Global NULL `effective_date` after | 0 | 0 |
| Canonical-order mismatches after | 0 | 0 |
| Monetary difference | 0.00 | 0.00 |

Transaction result: **COMMITTED**. One guarded transaction, all preconditions and postconditions passed, no partial commit possible.

## Exact Stopping Point

The approved 28-row Economic Date Backfill and atomic `balance_after` recalculation have been executed and evidenced. The result is awaiting a separate read-only Stage A Acceptance Re-Audit. No Stage B, Stage C, Stage D, technical Acceptance or Closure has occurred.

## Acceptance Status

`NOT STARTED`
