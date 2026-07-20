# AML.1.b.1 — Stage 2 Rollback Artifact Repository

Status: **PASSED — Rollback preimages captured before any mutation.**

This directory holds the keyed protected preimages and full snapshots of the
six locked financial tables + related state, captured from the Controlled
Pre-production target while Stage 1 held (zero mutations were performed).
Every downstream stage inverse depends on these files.

Non-secret. No keys, tokens, connection strings, or backup contents are
stored here.

## Contents

| file | purpose | rollback role |
| --- | --- | --- |
| `protected_preimages.tsv` | JSON row snapshots for `الم-202607-213`, `INV-MMO9AAXD`, `INV-MNDH8GPD`, `INV-MP4ET8LQ`, their ledger rows, related `billing_links`, and every `customer_balances` row. | Stage 18/19 -213 recovery, Stage 12 balance recovery, protected-record row-level restore. |
| `invoices_index.tsv` | full `invoices` index with amounts, dates, tenant/client, timestamps. | Stage 3 legacy-row preservation check; Stage 11 backfill preimage; Stage 12 rebuild anchor. |
| `ledger_entries_index.tsv` | full `ledger_entries` index (id, tenant, client, entry_type, ref, amount, balance_after, created_at). | Stage 11 `effective_date` backfill preimage; Stage 12 rebuild input; Stage 18 canonical-reversal proof. |
| `customer_balances_full.tsv` | complete `customer_balances` snapshot. | Stage 12 balance rebuild rollback. |
| `expenses_full.tsv` | complete `expenses` snapshot (3 rows). | Stage 8 expense-writer migration inverse. |
| `billing_links_full.tsv` | complete `billing_links` snapshot (17 rows). | Stage 8 domain-adapter inverse, Stage 15 ACL rollback proof. |
| `relacl_fingerprint.tsv` | `pg_class.relacl` for the six locked tables. | Stage 15 ACL revoke exact restore. |

## Baseline fingerprints (Stage 12 reconciliation anchors, echoed for auditor convenience)

| table | rows | key sum |
| --- | --- | --- |
| `invoices` | 42 | Σ `total_amount` = 264,280.45 |
| `invoice_items` | 99 | Σ `total_price` = 187,372.47; Σ `quantity` = 1,758.00 |
| `ledger_entries` | 64 | Σ `amount` = 132,726.85; Σ `balance_after` = 970,229.63 |

Ledger by `entry_type`:
- `invoice` — 35 rows, Σ = +168,694.43
- `payment` — 26 rows, Σ = -18,492.58
- `adjustment` — 3 rows, Σ = -17,475.00

## Protected records — one-line pointers (full rows in `protected_preimages.tsv`)

| invoice_number | id | status | total | items | ledger rows | Stage-18/19 role |
| --- | --- | --- | --- | --- | --- | --- |
| `INV-MMO9AAXD` | `674bfa8a-49ec-4aaa-ac35-1047826b7e22` | `paid` | 60,000.00 | 0 | 0 | FREEZE, 1 stale `billing_link` retained |
| `INV-MNDH8GPD` (Fani) | `ee8dc05c-18a8-488c-a5fe-eeb1b7cd4783` | `approved` | 106,375.00 | 37 | 1 | PRESERVE, `effective_date` = `issue_date` = 2026-03-30 |
| `INV-MP4ET8LQ` | draft, tenant `145f2128…` | `draft` | 2,032.26 | invalid-period row present | 0 | EXCLUDE via `NOT VALID` / RPC logic; do not mutate |
| `الم-202607-213` | `bc37440d-d402-4e2b-96cd-67329456d0fd` | `approved` | 50.00 | see raw | 1 (`dbaccc18…`, +50, balance_after 70) | Stage 18 guarded neutralization target; Stage 19 requires exactly one canonical **-50** reversal |

## Recovery contracts (per PLAN-LOCK Class A/B/C)

- **Class A — schema/code rollback.** Revert the affected migration or code
  commit and redeploy. No data touched.
- **Class B — data/snapshot rollback.** Restore the affected table(s) from
  the matching `*_full.tsv` / `*_index.tsv` file in this directory using the
  Stage 2 restore procedure (`docs/aml_1_b_1/stage_02_rollback_artifacts/RESTORE.md`
  — added when a specific stage needs it; not yet required).
- **Class C — row-level recovery.** Use `protected_preimages.tsv` to
  reconstruct a single protected row. Only Stages 18/19 currently plan to
  exercise this path, and only against `الم-202607-213` and its ledger row.
- **Class D — full disaster recovery.** The 2026-07-20 backup
  (`horse-verse-link_260720.backup`, ~2.6 MB, stored in the
  `database_export_20_07_26` bucket and on the project owner's local machine)
  is the last-resort artifact. It is not the first-line rollback mechanism.

---

**AML.1.b.1 STAGE 2: PASSED — ROLLBACK ARTIFACTS AND KEYED PROTECTED
PREIMAGES CAPTURED. STAGE 3 AUTHORIZED (first-mutation stage).**
