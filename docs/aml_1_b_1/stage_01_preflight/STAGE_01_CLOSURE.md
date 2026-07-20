# AML.1.b.1 — Stage 1 Closure Manifest (Controlled Pre-Production Amendment)

Status: **PASSED — Controlled Pre-production target, backup confirmed, Stage 2 authorized.**

Non-secret manifest. No keys, tokens, connection strings, or database backup
contents are stored here. The database export itself lives only in private
Lovable Cloud Storage plus the project owner's local copy.

## 1. Environment classification

- Environment: **Controlled Pre-production Execution Target** (single attached
  Lovable Cloud backend).
- Data class: synthetic operational / regression fixtures. No real external
  customer tenants or real customer users exist.
- Future real customer onboarding is out of scope for AML.1.b.1 and will be
  reclassified separately as a Limited Production Pilot when it occurs.
- Generic Arabic term for horses in user-facing text: «الخيل» (not «حصان»).

## 2. Pre-mutation database export (user-confirmed)

| Field | Value |
| --- | --- |
| Export date | 2026-07-20 |
| Cloud bucket | `database_export_20_07_26` |
| Export file | `horse-verse-link_260720.backup` |
| Displayed size | ~2.6 MB / 2,678 KB |
| Location | Private Lovable Cloud Storage + locally downloaded copy |
| Checksum | **Not computed** in this environment. Do not fabricate one. |

The export is disaster-recovery evidence only. Stage-specific rollback
artifacts (Stage 2) remain the first rollback mechanism.

## 3. D1 — `permission_definitions` authoritative shape

Verified columns (see `permission_definitions_shape.txt`):

```
key, module, resource, action, display_name, description, description_ar,
is_delegatable, created_at, display_name_ar
```

There is **no `is_owner_only`** column. Stage 4 must not reference it.

### 3.1 Sibling finance-row convention (see `finance_permission_definitions.txt`)

All `finance.invoice.*` rows have `is_delegatable = true`, bilingual
`display_name`/`display_name_ar`, and bilingual `description`/`description_ar`.
Convention is unambiguous — Stage 4 proceeds automatically.

### 3.2 Exact Stage 4 INSERT rows (derived from convention, locked)

Only these three rows will be inserted. No aliases, no additional keys.

| key | module | resource | action | display_name | display_name_ar | description | description_ar | is_delegatable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `finance.invoice.approve` | `finance` | `invoice` | `approve` | `Approve Invoices` | `اعتماد الفواتير` | `Approve draft invoices and post them to the ledger` | `اعتماد مسودات الفواتير وترحيلها إلى السجل المالي` | `true` |
| `finance.invoice.cancel`  | `finance` | `invoice` | `cancel`  | `Cancel Invoices`  | `إلغاء الفواتير`   | `Cancel invoices and reverse associated ledger entries` | `إلغاء الفواتير وعكس القيود المحاسبية المرتبطة بها` | `true` |
| `finance.adjustment.create` | `finance` | `adjustment` | `create` | `Create Financial Adjustments` | `إنشاء تسويات مالية` | `Create manual financial adjustments to customer balances` | `إنشاء تسويات مالية يدوية لأرصدة العملاء` | `true` |

## 4. D2 — `كبير المشرفين` bundle census (complete platform scan)

Total bundles named `كبير المشرفين` on the platform: **1**
Duplicate same-name bundles inside any tenant: **0**

| bundle_id | tenant_id | is_system | finance keys today |
| --- | --- | --- | --- |
| `4d9b8917-f11d-4879-840d-1b682bad8cec` | `145f2128-83ca-4ba8-85b5-8ade245c5530` | `false` | 14 |

Current 14 finance keys bound to this bundle (see
`senior_supervisor_bundle_census.txt`):

```
finance.expenses.approve   finance.invoice.markPaid
finance.expenses.create    finance.invoice.print
finance.expenses.manage    finance.invoice.send
finance.invoice.create     finance.invoice.view
finance.invoice.delete     finance.ledger.view
finance.invoice.edit       finance.payment.collect
                           finance.payment.create
                           finance.payment.view
```

Stage 4 will bind the three new keys **only** to this one captured
`(bundle_id, tenant_id)` pair. No inference from other permissions or roles.

### 4.1 Drift resolution

Prior Stage 1 draft narrative referenced tenant prefix `348ce41c…` for this
bundle. That was wrong. Verified truth: the bundle lives in tenant
`145f2128-83ca-4ba8-85b5-8ade245c5530`. The `348ce41c…` tenant is a different
workspace (Laboratory) with no `كبير المشرفين` bundle today.

## 5. D3 — `finance.invoice.markPaid` preservation

- Verified present in `permission_definitions` with existing bilingual labels.
- Verified currently bound to the one existing `كبير المشرفين` bundle above.
- **Preserved verbatim.** Not added, not deleted, not renamed, not rebound,
  and not migrated in Stage 4.
- Behavioral closure remains:
  - Stage 8: migrate every active UI/client writer capable of directly
    marking an invoice paid so that payment truth passes through
    `post_payment`.
  - Stage 9: static-scan + manual call-chain census must return zero active
    bypass path before proceeding.
  - Stage 15: financial-table ACL revoke closes the direct-mutation surface.
- Explicitly **not** a Stage 12 writer migration.

## 6. D4 — `lab_horses.client_id` census (current evidence, not schema invariant)

| metric | value |
| --- | --- |
| total rows | 21 |
| `client_id IS NULL` | 21 |
| `client_id IS NOT NULL` | 0 |
| tenants present | 1 (`348ce41c-1102-4295-bf6a-2ea0203c1036`) |

Recorded as **current evidence only**. Approved Laboratory eligibility
contract remains unchanged: same-tenant direct `lab_horses.client_id` **OR**
valid same-tenant `party_horse_links` relationship of the approved Laboratory
customer type. Cross-tenant references are rejected.

## 7. D5 — Non-secret evidence manifest (this directory)

| file | contents |
| --- | --- |
| `STAGE_01_CLOSURE.md` | this manifest |
| `permission_definitions_shape.txt` | `\d permission_definitions` output |
| `finance_permission_definitions.txt` | all 16 finance rows w/ full columns |
| `senior_supervisor_bundle_census.txt` | complete bundle scan + finance keys |
| `lab_horses_client_id_census.txt` | 21/21/0 counts per tenant |
| `evidence_ledger_status_acl.txt` | ledger sums, invoice status dist, ACL |
| `protected_records_preimage_raw.txt` | protected invoices/ledger snapshot |

## 8. Baseline financial fingerprints (Stage 12 reconciliation anchors)

| table | rows | key sum |
| --- | --- | --- |
| `invoices` | 42 | Σ `total_amount` = 264,280.45 |
| `invoice_items` | 99 | Σ `total_price` = 187,372.47; Σ `quantity` = 1,758.00 |
| `ledger_entries` | 64 | Σ `amount` = 132,726.85; Σ `balance_after` = 970,229.63 |
| `customer_balances` | 7 | captured in Stage 2 preimages |
| `billing_links` | 17 | captured in Stage 2 preimages |
| `expenses` | 3 | (small dataset, snapshotted whole in Stage 2) |
| `payment_intents` | 0 | — |
| `lab_requests` | 33 | out of financial-sum scope |

Ledger by entry_type: `invoice` 35 rows / +168,694.43; `payment` 26 rows /
-18,492.58; `adjustment` 3 rows / -17,475.00.

Invoice status distribution: `draft` 5, `approved` 14, `shared` 3, `paid` 14,
`partial` 1, `overdue` 1, `cancelled` 4.

## 9. Protected records preimage summary (full raw snapshots in Stage 2)

| invoice_number | id | status | total | items | ledger rows | treatment |
| --- | --- | --- | --- | --- | --- | --- |
| `INV-MMO9AAXD` | `674bfa8a-49ec-4aaa-ac35-1047826b7e22` | `paid` | 60,000.00 | **0** | **0** | **FREEZE** — legacy anomaly, out of AML.1.b.1 scope. 1 stale `billing_link` retained. |
| `INV-MNDH8GPD` (Fani) | `ee8dc05c-18a8-488c-a5fe-eeb1b7cd4783` | `approved` | 106,375.00 | 37 | 1 | **PRESERVE** — Stage 13 reader flip must project `effective_date = issue_date = 2026-03-30` (not 2023 service periods). |
| `INV-MP4ET8LQ` | (draft, tenant `145f2128…`) | `draft` | 2,032.26 | (invalid Housing period row `fedae37c…` present) | 0 | **EXCLUDE via `NOT VALID` / RPC logic**. Do not mutate. |
| `الم-202607-213` | `bc37440d-d402-4e2b-96cd-67329456d0fd` | `approved` | 50.00 | (see raw snapshot) | 1 (`dbaccc18…`, +50, balance_after 70) | Stage 18 guarded neutralization target — this is the sole "-213" business record authorized for deliberate correction. Recorded amount is **+50**, not -213; Stage 19 postcondition requires exactly one canonical **-50** reversal to exist. |

## 10. Function/ACL snapshot

- Function grants on finance-relevant helpers captured in
  `protected_records_preimage_raw.txt` (rows for `_invoice_items_*`,
  `can_view_payment_*`, `validate_payment_intent`).
- `information_schema.role_table_grants` being empty for the six locked
  tables is **not** authoritative proof that no grants exist; that view's
  visibility depends on the querying role and may omit grants the current
  role cannot see. The authoritative current-table ACL evidence is the
  captured `pg_class.relacl` fingerprint in
  `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv`.
- Stage 15 must use **narrow explicit table-level `REVOKE` statements** on
  the six locked existing tables only (`invoices`, `invoice_items`,
  `ledger_entries`, `customer_balances`, `billing_links`, `expenses`).
- `ALTER DEFAULT PRIVILEGES` is **prohibited** anywhere in AML.1.b.1. Do
  not modify global or default privileges.



## 11. Drift resolutions (this closure)

| # | drift | resolution |
| --- | --- | --- |
| D-01 | `permission_definitions.is_owner_only` referenced by PLAN-LOCK | Column does not exist. Stage 4 uses only the 9 real columns (§3.2). |
| D-02 | Prior Stage 1 report placed `كبير المشرفين` in tenant `348ce41c…` | Verified: bundle lives in `145f2128…` (§4). |
| D-03 | `finance.invoice.markPaid` classified as Stage 12 in earlier draft | Corrected: preserved verbatim; handled by Stages 8/9/15 only (§5). |
| D-04 | `lab_horses.client_id` treated as permanently NULL | Reclassified as current evidence only, not schema invariant (§6). |
| D-05 | Prior narrative implied `-213` neutralization amount was `-213` | Verified: the invoice `الم-202607-213` total is 50.00; single ledger row `+50`. Stage 19 canonical reversal amount is **-50**, not -213. |
| D-06 | `customer_balances.updated_at` referenced in preflight | Column does not exist. Reconciliation queries must use `balance` only. |
| D-07 (**locked, corrected — canonical**) | Prior wording implied Stage 15 could act against default privileges or relied on `information_schema.role_table_grants` as ACL evidence. | `information_schema.role_table_grants` is role-visibility-dependent and is **not** authoritative evidence of current table ACLs. The captured `pg_class.relacl` fingerprint in `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv` is authoritative for the six existing locked Finance-Core tables (`invoices`, `invoice_items`, `ledger_entries`, `customer_balances`, `billing_links`, `expenses`). Stage 15 uses **narrow, explicit, table-level `REVOKE`** statements on those six existing tables only, after Stage 8 writer migration and the Stage 9 zero-bypass gate. `ALTER DEFAULT PRIVILEGES` and every global/default-privilege modification are **prohibited** in AML.1.b.1. Stage 3 does not revoke access from the six existing Finance-Core tables. New internal tables receive their explicit restrictive ACLs in their own additive migration. RLS is **enabled but not forced** on both new internal tables. `PUBLIC`, `anon`, and `authenticated` have zero access to `finance_request_idempotency`; `pos_sales` has no authenticated/anon DML and currently no authenticated SELECT (no existing reader mechanically requires it). The approved table owner / controlled `SECURITY DEFINER` function owner and `service_role` retain only the internal access the approved design requires. No superseded D-07 wording remains anywhere in this document. |

## 12. Production zero-mutation confirmation

- Stage 1 executed only `SELECT` / `\d` reads via `psql`.
- No `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `GRANT`, or
  `REVOKE` statement was issued.
- No secret, key, or connection string is written into the repository.

---

**AML.1.b.1 STAGE 1: PASSED — CONTROLLED PRE-PRODUCTION TARGET, BACKUP
CONFIRMED, STAGE 2 AUTHORIZED.**
