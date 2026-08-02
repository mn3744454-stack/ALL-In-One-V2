# PROMPT-DH-FINANCE-HISTORICAL-IMPORT-READINESS-DECISION-05
Mode: Plan/Chat — Read-Only. Operation: Historical Financial Import Readiness Decision.

## A. Practical Verdict

The platform today has **no historical-import capability of any kind** — no staging table, no import batch model, no provenance/source-system identifier on financial rows, no quarantine state, no import-level rollback, and no reconciliation report. Finance-level idempotency exists (`finance_request_idempotency`) but is scoped to interactive RPC calls, not to file-based batches.

Therefore the practical answer to "what should the owner provide" is: **a small, deliberately narrow source package**, and the recommended default posture is **Opening-Position import for balances plus optional Full-History import only for the subset of customers where invoice-level source data is genuinely complete**. Attempting full history for everything would produce unauditable data with today's schema.

Nothing was implemented in this run.

## B. Scope, Inputs, and Read-Only Proof

Inspected:
- Repository (branch `edit/edt-6e633fc2-a60f-42a2-84bf-ce96572ebf70`, HEAD `bca3c70b`, clean working tree) — searched all 300+ files in `supabase/migrations/` and all of `src/` for import/staging/opening-balance/provenance concepts.
- Live database catalog: `information_schema.tables`, `information_schema.columns`.
- Live data shape: `invoices`, `invoice_items`, `ledger_entries`, `payment_sessions`, `payment_allocations`, `customer_balances`, `clients`.
- Repository schema snapshots: `invoices.schema.txt`, `invoice_items.schema.txt`, `customer_balances.schema.txt`, `billing_links.schema.txt`.

Read-only: only `SELECT` and catalog reads were issued. No DDL, DML, RPC mutation, migration, or repository file change other than this plan document.

## C. Current Import Capability Snapshot

| Capability | Present? | Evidence |
|---|---|---|
| Import/staging tables | **No** (Fact) | Catalog query for `%import%`, `%stag%`, `%opening%` in `public` returned NONE |
| Import batch model | **No** (Fact) | No repository match for `import_batch` in migrations or `src/` |
| Provenance / source-system id on financial rows | **No** (Fact) | `invoices`, `invoice_items`, `ledger_entries` have no legacy/source columns; only `payment_allocations.external_reference` exists (Fact) |
| Idempotency | **Partial** (Fact) | `finance_request_idempotency` + `_finance_idempotency_begin` protect RPC calls, keyed per tenant/operation/key — reusable for import, but no batch-level key |
| Quarantine / error state | **No** (Fact) | No error or rejected-row storage anywhere |
| Rollback mechanism | **No** (Fact) | No import-scoped reversal path; ledger has no reversal marker beyond `entry_type='adjustment'` |
| Reconciliation report | **No** (Fact) | No source-vs-imported comparison surface |
| Backdating support | **Partial** (Fact) | `ledger_entries.effective_date` and `invoices.issue_date` accept past dates; 28 of 88 ledger rows still have NULL `effective_date` (Fact) |

Live data at capture: 65 invoices (18 paid, 20 approved, 16 draft, 4 cancelled, 3 partial, 3 shared, 1 overdue), 88 ledger entries, 29 payment sessions, 14 clients, 6 non-zero customer balances.

## D. Historical Data Decision Matrix

| Source category | Recommended mode | Condition / rationale |
|---|---|---|
| Invoices + invoice items | **Hybrid** | Full history only where source has invoice number, issue date, customer, lines, amounts, tax, status. Otherwise fold into opening obligation. |
| Payments | **Hybrid** | Full history only for invoices imported in full. Payments against non-imported invoices become part of the opening net balance. |
| Payment allocations | **Full only when both sides imported** | Allocation is meaningless unless both invoice and payment exist; otherwise omit. |
| Customer credit / unapplied credit | **Opening position** | Import as an unapplied opening credit per customer; do not synthesize a source invoice. |
| Outstanding opening obligations | **Opening position** | One row per customer at cutover date where invoice-level history is unreliable. |
| Draft / unposted invoices | **Do not import** (default) | If the owner insists, import as `draft` only, never posted to ledger, excluded from balance. |
| Ledger / statement history | **Do not import** | Ledger must be derived from imported invoices/payments, never loaded directly. Direct ledger loading breaks `balance_after` recomputation. |

Governing rule: **posted balance = imported invoices + imported payments + opening obligations − opening credits.** Drafts never contribute.

## E. Minimum Owner Source Package and File Templates

Five CSV files (UTF-8 with BOM, comma-separated, header row required). Only files 1 and 2 are mandatory.

### 1. `customers.csv` (mandatory) — Opening Position + Full History
- Required: `source_customer_id`, `name_en` or `name_ar`, `tenant_code`
- Optional: `phone`, `email`, `tax_number`, `national_id`, `notes`
- Example: `C-1004,Al Faisal Stables,اسطبلات الفيصل,DAYLI-MAIN,+966500000000,,,`
- Validation: `source_customer_id` unique; at least one name present; every other file must reference an id that exists here.

### 2. `opening_balances.csv` (mandatory) — Opening Position
- Required: `source_customer_id`, `as_of_date`, `amount_due`, `currency`
- Optional: `unapplied_credit`, `horse_reference`, `notes`, `source_reference`
- Example: `C-1004,2026-08-31,12500.00,SAR,0.00,,Carried from Excel ledger,LEG-OB-2026-08`
- Validation: `amount_due >= 0`; `unapplied_credit >= 0`; a row may not have both non-zero unless the owner confirms gross presentation; `as_of_date` = single global cutover date.

### 3. `invoices.csv` (optional) — Full History
- Required: `source_invoice_id`, `source_customer_id`, `invoice_number`, `issue_date`, `currency`, `subtotal`, `tax_amount`, `total_amount`, `status`
- Optional: `due_date`, `discount_amount`, `notes`, `branch_code`, `horse_reference`
- Example: `INV-2025-0412,C-1004,2025-0412,2025-11-03,SAR,3000.00,450.00,3450.00,approved,2025-12-03,0.00,,,Najm`
- Validation: `invoice_number` unique per tenant; `subtotal + tax − discount = total` to 0.01; `status` ∈ draft, approved, paid, partial, cancelled; never `paid`/`partial` in the file — payment status is derived from imported payments (existing platform invariant).

### 4. `invoice_items.csv` (required if file 3 is provided) — Full History
- Required: `source_invoice_id`, `line_no`, `description_en` or `description_ar`, `quantity`, `unit_price`, `total_price`
- Optional: `service_reference`, `category_reference`, `horse_reference`, `period_start`, `period_end`, `tax_rate`
- Example: `INV-2025-0412,1,Monthly boarding,إيواء شهري,1,3000.00,3000.00,BOARD-STD,Boarding,Najm,2025-11-01,2025-11-30,15`
- Validation: `quantity * unit_price = total_price`; sum of line totals = invoice `subtotal`; every `source_invoice_id` must exist in file 3.

### 5. `payments.csv` (optional) — Full History / Hybrid
- Required: `source_payment_id`, `source_customer_id`, `payment_date`, `amount`, `currency`, `payment_method`
- Optional: `source_invoice_id` (allocation target), `allocated_amount`, `external_reference`, `notes`, `horse_reference`
- Example: `PAY-8871,C-1004,2025-11-20,3450.00,SAR,transfer,INV-2025-0412,3450.00,BANK-9931,,`
- Validation: `payment_method` ∈ cash, card, transfer, check; sum of `allocated_amount` per payment ≤ `amount`; unallocated remainder becomes unapplied credit; every referenced invoice must exist in file 3.

## F. Required Identity, Date, Money, and Mapping Rules

- **Tenant**: one import package per tenant; `tenant_code` is a human label the owner supplies once and maps to a tenant id at intake. Cross-tenant rows in one file are rejected.
- **Customer**: mapped by `source_customer_id` → `clients.id`. Matching against existing clients is by explicit owner-approved mapping only, never by fuzzy name.
- **Horse**: `horse_reference` is best-effort attribution only. Unmatched horse references must not block import — the line imports without horse attribution and is listed in the reconciliation report.
- **Invoice / payment identity**: `source_invoice_id` and `source_payment_id` are the idempotency keys. Re-running the same batch must not duplicate.
- **Dates**: strict `YYYY-MM-DD`, Gregorian, Western digits, no times. Interpreted as Asia/Riyadh calendar dates.
- **Money**: plain decimal, two places, dot separator, no thousands separator, no currency symbol, non-negative. Currency `SAR` unless the owner declares otherwise; mixed currency in one file is rejected.
- **Arabic/English**: both name/description columns may be supplied; at least one required. Arabic text stored as-is in the `_ar` fields; no transliteration, no reordering.
- **Source-system reference**: every file carries the originating system name in the intake manifest, and row-level `source_reference` / `external_reference` where available, so each imported record can be traced back.

## G. Safe Staged Import Proposal (not authorized, not executed)

1. **Intake and validation only** — parse the owner's files, run all validation rules, produce a validation report. Dependency: owner package delivered. Acceptance: zero blocking validation errors, or an owner-signed exception list.
2. **Controlled test batch** — one or two customers, non-production or a clearly labelled test tenant. Dependency: stage 1 accepted. Acceptance: rows land with correct amounts and dates.
3. **Reconciliation** — per-customer and grand-total comparison of source vs imported (invoice count, invoice total, payment total, closing balance). Acceptance: zero variance, or explained variance under an owner-approved tolerance of 0.00.
4. **Error / quarantine handling** — every rejected row stored with reason and batch id, never silently dropped. Acceptance: rejected-row count in report equals source rows minus imported rows.
5. **Idempotency** — batch keyed by import batch id plus row `source_*_id`; re-running an identical batch is a no-op. Acceptance: a deliberate second run changes nothing.
6. **Rollback** — every batch reversible either by deleting batch-tagged rows (test) or by compensating reversal entries (production). Acceptance: a rehearsed rollback restores pre-batch totals exactly.
7. **Owner review gate** — owner signs the reconciliation report before any production batch.
8. **Limited production batch** — a single small customer cohort first, reconciled again, then the remainder.

## H. Import-Critical Blockers Only

**B1 — No provenance columns on financial tables.** Evidence: `invoices`, `invoice_items`, `ledger_entries` have no source/batch columns (schema snapshots + catalog). Impact: imported rows are indistinguishable from operational rows; no selective rollback, no reconciliation. Blocks: all import modes. Smallest fix: add a nullable `import_batch_id` plus `source_reference` to `invoices`, `ledger_entries`, and an `import_batches` table. Must be resolved **before test import**.

**B2 — No opening-obligation / opening-credit representation.** Evidence: no `opening_obligations` table; `ledger_entries.entry_type` today is only invoice / payment / adjustment. Impact: opening balances can only be faked as invoices, which corrupts revenue reporting. Blocks: Opening-Position and Hybrid modes (not pure Full History). Smallest fix: a dedicated opening-obligation entry type or table that posts to the ledger without counting as revenue. Before **test import** if opening mode is chosen.

**B3 — 28 of 88 ledger entries have NULL `effective_date`.** Evidence: live count. Impact: any statement or reconciliation ordered by economic date is already unreliable, so post-import reconciliation cannot be trusted. Blocks: reconciliation stage of all modes. Smallest fix: backfill the 28 legacy rows from their invoice/payment dates. Before **test import** (reconciliation depends on it).

**B4 — 16 draft invoices already exist alongside posted ones.** Evidence: live status counts. Impact: if the import reconciliation totals include drafts, source-vs-imported comparison will never balance. Blocks: reconciliation only. Smallest fix: reconciliation queries explicitly exclude `draft` and `cancelled`. Before **test import**.

**B5 — No batch-level idempotency.** Evidence: `finance_request_idempotency` is keyed per tenant/operation/key for interactive RPCs; nothing exists for file rows. Impact: a partially failed import cannot be safely re-run. Blocks: all modes at production stage. Smallest fix: unique constraint on `(import_batch_id, source_row_id)`. Before **production import**.

Explicitly out of scope and not blockers for this decision: POS atomicity, RLS permissiveness, platform permission redesign.

## I. Owner Decisions Required Before Execution

1. **Cutover date** — the single `as_of_date` for all opening positions.
2. **Import depth** — Opening Position only, or Hybrid with full history for a named subset of customers. (Recommendation: Hybrid, full history limited to customers with complete source records.)
3. **How far back** full history should go, if Hybrid is chosen.
4. **Drafts** — confirm exclusion (recommended) or explicitly request draft-only import.
5. **Horse attribution** — required for historical lines, or best-effort only (recommended: best-effort).
6. **Customer matching** — confirm that existing platform clients will be matched by an explicit owner-provided mapping, not automatically.
7. **Currency** — confirm SAR-only.
8. **Which tenant(s)** are in scope for the first import.
9. **Demo data** — confirm it stays untouched and is excluded from reconciliation totals.

## J. Recommended Next Prompt and Exact Gate Status

Next correct action: **the owner provides the source-data package** (files 1 and 2 at minimum, plus 3–5 if Hybrid is chosen), together with decisions 1–9 above.

In parallel, a narrow technical corrective investigation is warranted for blockers B1–B3 only, since those must exist before even a test import. That should be a separate, tightly scoped prompt — not bundled with the import itself.

A controlled test-import execution prompt can only be prepared after both the source package and B1–B3 are settled.

## K. Run Metadata and Exact Stopping Point

- Mode: Plan/Chat — Read-Only. Operation: Historical Financial Import Readiness Decision.
- Timezone: Asia/Riyadh (UTC+03:00). Run start, database evidence capture, and final report all on 02-08-2026, late evening Riyadh time (report generated 2026-08-02 23:27 Riyadh / 20:27 UTC).
- Repository: branch `edit/edt-6e633fc2-a60f-42a2-84bf-ce96572ebf70`, HEAD `bca3c70baf0cf256bc6844c0756726b82201856f`. Working tree clean before; after this run the only change is `.lovable/plan.md`.
- Commands executed: one shell command (`git rev-parse` ×2, `git status --porcelain`, two `rg` searches over `supabase/migrations/` and `src/`); one database read (single multi-branch `SELECT` over `information_schema.tables`, `information_schema.columns`, `invoices`, `ledger_entries`, `clients`, `customer_balances`, `payment_sessions`).
- Inspected repository paths: `supabase/migrations/`, `src/`, `invoices.schema.txt`, `invoice_items.schema.txt`, `customer_balances.schema.txt`, `billing_links.schema.txt`, `expenses.schema.txt`, `src/lib/finance/postPaymentSession.ts`, `docs/aml_1_b_1/stage_j5_1/preflight/`.
- `.lovable/plan.md` state: overwritten with this report; it is the sole artifact of this run.
- Zero-write confirmation — Repository writes: zero (excluding `.lovable/plan.md`). Database writes: zero. Persistence: zero. Acceptance: zero. Closure: zero.
- Exact stopping point: report delivered; no import artifact, template file, migration, or code exists as a result of this run.
- Next step: owner returns decisions 1–9 and the source package.

Historical Financial Import: OWNER ALIGNMENT REQUIRED — NOT IMPLEMENTED. No import, migration, cleanup, backfill, Acceptance, or Closure occurred.
