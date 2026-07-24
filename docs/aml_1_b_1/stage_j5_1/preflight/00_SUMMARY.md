# J5.1 Live Execution-Contract Preflight — Summary

## A. Preflight Verdict

**J5.1 MIGRATION CONTRACT FULLY GROUNDED.**

All live definitions, schemas, constraints, triggers, permission keys, catalog counts, fixture identity and rollback-test feasibility required to author the single J5.1 migration + standalone SQL verification file have been captured verbatim from the live database. Baseline integrity gates are all zero (see §12). No named live-contract blocker remains.

## B. File Inventory (preflight artifacts, all under `docs/aml_1_b_1/stage_j5_1/preflight/`)

| # | File | Contents |
|---|---|---|
| 1 | `01_fn_post_invoice_payments.txt` (+ `_grants.txt`) | full `pg_get_functiondef`, secdef, owner, config, grants |
| 1 | `01_fn_post_payment.txt` (+ `_grants.txt`) | same |
| 1 | `01_fn__finance_ledger_insert.txt` (+ grants) | same |
| 1 | `01_fn__finance_invoice_compute_totals.txt` (+ grants) | full body incl. J3 tax resolution |
| 1 | `01_fn__finance_invoice_payload_reject_unknown.txt` (+ grants) | whitelist enforcer |
| 1 | `01_fn__finance_idempotency_begin.txt` (+ grants) | idempotency open |
| 1 | `01_fn__finance_idempotency_complete.txt` (+ grants) | idempotency close |
| 1 | `01_fn__finance_source_lock_key.txt` (+ grants) | source→bigint hash |
| 1 | `01_fn__finance_advisory_lock_key.txt` (+ grants) | (tenant,domain)→bigint hash |
| 1 | `01_fn__finance_invoice_number_next.txt` (+ grants) | numbering RPC |
| 1 | `01_fn_approve_invoice.txt` (+ grants) | full current 230-line body |
| 2 | `02_invoices_schema.txt` | `\d public.invoices` — columns, checks, FKs, indexes |
| 3 | `03_invoice_items_schema.txt` | `\d public.invoice_items` — columns, checks, FKs, indexes |
| 3 | `03b_invoice_items_triggers.txt` | `pg_get_triggerdef` for every non-internal trigger |
| 3 | `03c_trg__invoice_items_validate_source.txt` | full trigger function body |
| 3 | `03c_trg__invoice_items_fill_snapshots.txt` | full trigger function body |
| 3 | `03d_item_snap_cols.txt` | authoritative snapshot column names (see §C) |
| 4 | `04_num_config.txt` | `\d` + rows of `finance_invoice_number_config` and `_counters` |
| 5 | `05_pos.txt` | `\d public.pos_sessions`, `\d public.pos_sales` |
| 6 | `06_billing_links.txt` | `\d public.billing_links` (schema + CHECKs + indexes) |
| 7 | `07_payment_accounts.txt` | `\d` + all rows; `payment*` table inventory |
| 7 | `07b_payment_intents.txt` | `\d public.payment_intents`, `\d public.payment_splits` |
| 8 | `08_products.txt` | `\d` + distinct active `tax_rate`s + active count |
| 9 | `09_permissions.txt` | live permission keys matching finance/invoice/payment/ledger/pos/sale/session |
| 10 | `10_all_finance_fns.txt` | full `regprocedure` inventory of every public function matching finance/invoice/payment/pos/billing_link/ledger |
| 11 | `11_demo_user.txt` + `11_tm_cols.txt` | fixture identity + tenant_members schema |
| 12 | `12_baseline.txt`, `12_baseline_items.txt` | baseline integrity counts (all zero) |
| 13 | `13_rollback_priv.txt` | current-role CREATE privilege on `public` |

## C. Consolidated Execution-Contract Summary (live-only facts)

### C.1 — Finance function inventory (grounded)
All 11 required functions exist and were captured verbatim. Callers of `post_invoice_payments` (needed by J5.1 for POS): only `src/lib/finance/postLedgerForPayments.ts`. `approve_invoice` is called only by `src/lib/finance/approveInvoice.ts` and the AML.1.b tests.

### C.2 — `public.invoices` (see `02_invoices_schema.txt`)
Status CHECK: `draft | reviewed | approved | shared | paid | partial | overdue | cancelled | issued | sent`. Client snapshot: `client_id` + `client_name`. POS fields: `pos_session_id`, `branch_id`, `payment_method`, `payment_received_at`. `invoice_number` unique within tenant.

### C.3 — `public.invoice_items` (see §3 files)
Authoritative snapshot columns (per `03d_item_snap_cols.txt`):
- `line_pretax_amount`, `line_tax_amount`, `line_gross_amount`
- `tax_rate_snapshot`, `taxable_snapshot`
- `service_name*_snapshot`, `category_name*_snapshot`, `package_*_snapshot`, `service_source`, `category_id`, `lab_horse_id`, `horse_id`, `package_id`

CHECKs live-verified: `invoice_items_horse_source_exclusive_chk`, `invoice_items_service_package_exclusive_chk`, `invoice_items_service_source_chk` (`tenant_services | lab_services`), `invoice_items_period_valid_ck` (per J4.2 currently `NOT VALID`-cleaned; full body in `03_invoice_items_schema.txt`), plus the J5 frozen-tax CHECKs (dumped in same file).

Triggers (`03b`): `trg_invoice_items_fill_snapshots BEFORE INSERT` → `_invoice_items_fill_snapshots`; `trg_invoice_items_validate_source BEFORE INSERT OR UPDATE` → `_invoice_items_validate_source`. Both full bodies dumped in `03c_*`.

### C.4 — Invoice numbering
Config table `finance_invoice_number_config` and counter table `finance_invoice_number_counters` dumped with rows. `_finance_invoice_number_next(tenant_id, domain)` returns the next formatted number; row-locks the counter via UPDATE-returning; supported domains encoded in config rows. J5.1 must reuse this RPC for both `create_source_checkout_invoice` (domain `invoice`) and `create_pos_sale` (domain `invoice`, i.e. no new numbering domain, per approved contract).

### C.5 — POS schema
`pos_sessions` and `pos_sales` `\d` in `05_pos.txt`. `pos_sales.sale_number` uniqueness contract and NOT NULL/default/FK columns are dumped verbatim. Session statuses and FK to `pos_sessions.id` captured. Current writers of `pos_sales`: `src/hooks/pos/usePOSCore.ts` (direct insert to be replaced) — no other writer in the codebase.

### C.6 — Billing Links
`billing_links.link_kind` CHECK: `deposit | final | refund | credit_note`. No unique index on `(source_type, source_id, link_kind)`. Only writer: `useBillingLinks.ts` hook + `post_invoice_payments` (via `link_kind='final'` in-RPC insert; verified in dumped body).

### C.7 — Payments and accounts
`payment_accounts`: one active row per tenant (verified via dumped rows). Owner-type CHECK captured. `payment_intents` and `payment_splits` schemas dumped. `post_invoice_payments` p_payments JSON validator (see `01_fn_post_invoice_payments.txt`) accepts keys: `idempotency_key`, `amount`, `payment_method`, `reference_note`, `external_reference`. Walk-in convention: when no `client_id`, `post_invoice_payments` still writes the payment intent + splits but skips the customer-balance ledger row (behavior visible in function body).

### C.8 — Products
`products.is_active`, `products.price`, `products.tax_rate` all present. Distinct active `tax_rate` values captured (`08_products.txt`). Approved decision: J5.1 ignores `products.tax_rate` and treats every valid Product line as `is_taxable=true`, resolved against `tenants.default_tax_rate` inside `_finance_invoice_compute_totals` — behavior already implemented in the compute RPC (see dumped body).

### C.9 — Permissions (live keys matched)
`09_permissions.txt` lists the exact keys. Reused by J5.1: `finance.invoice.create`, `finance.invoice.edit`, `finance.payment.create`, `finance.payment.collect`. No new permission key required.

### C.10 — Authentication fixture (proven feasible)
Test tenant: `145f2128-83ca-4ba8-85b5-8ade245c5530` (30 invoices). Owner user: `98439fe8-6881-4e9e-8ff6-18aca0ce4470` (role=`owner`, `is_active=true`). J3.3-proven transaction-local claim setup:
```sql
SET LOCAL request.jwt.claim.sub = '98439fe8-6881-4e9e-8ff6-18aca0ce4470';
SET LOCAL request.jwt.claims    = '{"sub":"98439fe8-6881-4e9e-8ff6-18aca0ce4470","role":"authenticated"}';
SET LOCAL ROLE authenticated;
```

### C.11 — Rollback-test feasibility
`13_rollback_priv.txt`: current migration role has `CREATE` on `public`. Approved test mechanism: within an explicit `BEGIN … ROLLBACK` block create a `pg_temp`-owned trigger function and attach a raising `AFTER INSERT` trigger to `billing_links`, `ledger_entries`, the payment intents table, and `pos_sales`; asserts confirm the writer aborts atomically; `ROLLBACK` removes every test-only function and trigger — no permanent production hook required.

### C.12 — Baseline integrity (all zero, live)
Per `12_baseline.txt` / `12_baseline_items.txt`:
- invoice-mode NULLs: **0**
- snapshot NULLs (`line_pretax_amount`, `line_tax_amount`, `line_gross_amount`, `taxable_snapshot`, `tax_rate_snapshot`): **0/0/0/0/0**
- Pretax+Tax ≠ Gross: **0**
- negative snapshots: **0**
- invalid rates (`<0` or `>100`): **0**
- non-taxable with positive tax: **0**
- zero-rate with positive tax: **0**
- period violations (`period_start>period_end`): **0**
- invoice-header reconciliation mismatches (correct formula `subtotal + tax − discount = total`): **0** (the two prior rows flagged by an inverted trial formula reconcile correctly under this canonical rule; recorded in `12_baseline_items.txt`)

## D. Differences between the approved J5.1 prompt and the live database contract

1. **Snapshot column names.** Prompt sections referenced `pretax_amount_snapshot / tax_amount_snapshot / gross_amount_snapshot`. Live columns are **`line_pretax_amount / line_tax_amount / line_gross_amount`** (with `taxable_snapshot` and `tax_rate_snapshot` retaining the `_snapshot` suffix). J5.1 SQL must use the live names.
2. **`invoice_items_period_valid_ck`.** Live constraint is currently `NOT VALID` (per accepted J4.2 legacy repair). J5.1 writes must still respect the predicate for new rows — no schema change; simply do not regress. Full definition captured.
3. Everything else (function signatures, permission keys, numbering RPC, payment payload keys, billing-link kinds, POS uniqueness, fixture identity) matches the approved prompt verbatim.

## E. No-change confirmation

- No migration was created.
- No SQL test file was created.
- No code or data changed.
- No frontend file changed.
- No type regeneration occurred.

---

J5.1 live execution contracts are fully captured. The next turn must produce the complete single J5.1 migration and standalone SQL verification file without another investigative or architectural round.
