# Full Deep Forensic Investigative Audit — Shared Tenant Operational Finance & Historical Migration

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-DEEP-FORENSIC-AUDIT-01 · Read-Only

## A. Executive Verdict

**OWNER ALIGNMENT BLOCKED — CRITICAL EVIDENCE GAPS**

Three blocking evidence findings, each proven from live DB or HEAD code:

1. **Effective-date is not the chronology basis.** `ledger_entries.effective_date` exists but is **nullable**, is **NULL on 28 of 88 live rows (31.8%)**, and the statement reader `src/hooks/clients/useClientStatement.ts` (lines 47–62) orders and date-filters on **`created_at`**, not `effective_date`. Requirement 6.5 is unmet today, so backdated historical imports would post at the wrong point in the statement.
2. **A non-atomic header-first invoice creation path survives at HEAD.** `src/hooks/pos/usePOSCore.ts:117-156` inserts `invoices` then separately inserts `invoice_items`, and calls `postLedgerForInvoice` (`src/lib/finance/postLedgerForInvoice.ts:164-205`) which writes `ledger_entries` and `customer_balances` directly from the browser. The 4.3 claim ("caller/RPC contract skew resolved") is **true for the invoice/lab/manual flows but false for POS**.
3. **No migration substrate exists.** There is no import batch table, no source/provenance column on `invoices` or `invoice_items`, no opening-obligation object, and no `source_system` field. Migration architecture must be designed from zero; nothing can be validated against existing structures.

Non-blocking positives: the Owner-reported scenario **reconciles exactly**, and `customer_balances` shows **zero drift**.

## B. Audit Identity, Scope, Mode, Read-Only Confirmation

Mode: Plan/Chat, read-only. Repository writes: none (only this platform-generated `.lovable/plan.md`). Database writes: none — all SQL was `SELECT` against `information_schema`, `pg_proc`, and aggregate counts. No DDL, DML, migration, RPC write, or `EXPLAIN ANALYZE`. Knowledge/Skills/settings/governance: unchanged.

Branch `main` @ HEAD `3224254f` (2026-08-01 03:54:48 +0000). Working tree clean before; after, only the platform plan artifact.

## C. Evidence Coverage and Source Register

| Source | Read | Depth | Truth class |
|---|---|---|---|
| `src/lib/finance/*` (24 modules) listing + targeted reads | Yes | Partial (grep + full reads of 4) | Current |
| `src/hooks/clients/useClientStatement.ts` | Yes | Full (131 lines) | Current |
| `src/hooks/clients/useClientFirstActivity.ts` | Yes | Full (50 lines) | Current |
| `src/lib/finance/statementSemantics.ts` | Yes | Partial (1–60 of 211) | Current |
| `src/hooks/clients/useStatementEnrichment.ts` | Yes | Partial (grep, 399 lines) | Current |
| `src/components/clients/ClientStatementTab.tsx` | Yes | Partial (grep, 1484 lines) | Current |
| `src/hooks/pos/usePOSCore.ts` | Yes | Partial (grep lines 117–156) | Current |
| Live `pg_proc` finance function catalog | Yes | Full for 11 named functions | Current |
| Live schema: `ledger_entries`, `invoice_items`, `payment_sessions`, `payment_allocations` | Yes | Full column lists | Current |
| Live aggregates (balances, ledger, invoices) | Yes | Counts/sums only, no PII | Current |
| Skill 04 — Tenant Isolation Guard | Yes | Full | Current |
| Security memory | Yes | Full | Current |
| Documentation 5 / 10 / 12 / 13, Master Register v0.9.0, Rounds 1–5, `RM-DH-002` package | **No** | Not located in repo at HEAD | Inaccessible — contents not inferred |

Inaccessible sources are **not** treated as evidence. Historical claims in §4.1 remain unverified against their source documents; they were re-verified only against current code and DB.

## D. Facts, Claims, Inferences, Contradictions, Gaps

**Proven facts.** All 11 finance RPCs are `SECURITY DEFINER` with `search_path=""` except `_finance_invoice_compute_totals` (INVOKER, correct for a pure computation). Signatures carry `p_idempotency_key uuid` on every mutating RPC — idempotency is structurally present. `payment_sessions`/`payment_allocations`/`payment_horse_allocations` are live with 29/38/15 rows — multi-invoice and horse-level allocation are **real, not aspirational**. Zero non-draft invoices have zero items (0 of 65). Zero customer-balance drift (0 rows deviate >0.005 from ledger sum).

**Contradiction.** §4.3's claim of resolved contract skew conflicts with the surviving POS path (finding A.2). The vitest guard `n2_5InvoiceRpcRuntimeWiring.test.ts:119-133` asserts the *invoice* and *payment* modules are clean but does not assert POS is.

**Gaps.** Tax-basis parity between CSV/PDF/screen was not line-verified. `create_invoice_with_items` body text was not dumped (signature and attributes only).

## E. Governance Classification Analysis

Recommendation only: this belongs under `RM-DH-002` as a new multi-phase workstream. No ID assigned.

## F. Current Operational-Finance Architecture Map

Canonical path: UI dialog → `src/lib/finance/invoiceRpc.ts` → `create_invoice_with_items` / `update_invoice_with_items` → trigger `trg_invoice_items_validate_source` + `trg_invoice_items_fill_snapshots` → `approve_invoice` → `_finance_invoice_approve_inline` → `_finance_ledger_insert` → `ledger_entries` + `customer_balances`.

Payment path: `RecordPaymentDialog` / `MultiInvoicePaymentDialog` → `postPaymentSession.ts` → `post_payment_session` → `payment_sessions` → `payment_allocations` → `payment_horse_allocations` → ledger.

**Legacy survivors at HEAD:** `postLedgerForInvoice.ts` (called only by POS), `postLedgerForExpense.ts` (called by `DashboardFinance.tsx`), `postLedgerForPayments.ts` (still imported by `useInvoicePayments.ts` and `RecordPaymentDialog.tsx`).

## G. Schema / RLS / RPC / Trigger Evidence

`ledger_entries` (15 cols): `effective_date date NULL` ← the defect; `metadata jsonb NOT NULL`; `payment_session_id` links to sessions. `invoice_items` (35 cols) carries `horse_id`, `lab_horse_id`, `service_source`, `category_id`, and frozen snapshots (`*_snapshot`, `line_pretax_amount`, `line_tax_amount`, `line_gross_amount`, `tax_rate_snapshot`) — frozen-line truth is real. **No provenance columns anywhere**: no `source_system`, `import_batch_id`, `source_document_number`, `source_row_ref`. `invoices` policies are permission-based (`finance.invoice.create/edit/delete`) with `is_tenant_member` SELECT — Skill 04 Type A boundary is enforced at the row level for all financial tables inspected.

## H. Invoice Lifecycle Trace

Atomic and safe on the canonical path: single-RPC create/update, server-side totals via `_finance_invoice_compute_totals`, zero-item approval blocked (0 live violations), cancellation via `cancel_invoice(p_effective_date, p_reason)` which **does** take an explicit economic date. Not safe on the POS path (A.2). Concurrency is guarded by `_finance_source_lock_key` advisory locks.

## I. Ledger / Effective-Date / Balance / First-Movement Trace

`effective_date` is written by newer RPCs but 28 rows predate it. `useClientStatement` never reads it. `get_client_first_financial_activity` RPC correctly excludes future-dated rows and draft/cancelled references — first-movement is the **strongest** component and already satisfies 6.6 in principle, but inherits the `created_at`-vs-`effective_date` ambiguity for the 28 NULL rows.

## J. Payment / Allocation / Credit Trace

Supported today: invoice-specific payment, split across invoices, partial payment, horse-level allocation, client-level residual (`payment_allocations.client_level_amount`). **Not modelled today:** unapplied customer credit as a first-class object, overpayment carry-forward, payment against an opening obligation (no such object), and reallocation of an already-posted allocation.

## K. Statement UI, Filters, Totals, Exports

`statementSemantics.ts` is a genuine single classifier shared by screen, running balance, Print, PDF and CSV, and it correctly refuses to count cancellations/reversals as Paid and neutralizes orphan cancellations. Date filter uses `localDateFromToUtcIso` boundary conversion (correct timezone handling) but against `created_at`.

## L. Horse Scope Analysis — root cause found

For the Owner-reported client: **15 invoice items, `horse_id` populated on 0, `lab_horse_id` populated on 4.** The horse filter (`ClientStatementTab.tsx:558-704`) builds `selectedHorseIds` from `clientHorses` (canonical `horses` rows) and intersects against enrichment output; `useStatementEnrichment.ts:158-162` emits `horseId = lab_horse_id` for Lab-sourced items. **Lab-local horse IDs can never match canonical horse IDs, so those rows vanish under any horse filter.** Classification: 4 rows = *implementation defect* (identity-space mismatch, MEM horse-unification bridge not applied to the statement filter); the remaining 11 rows = *valid scope exclusion* (genuinely client-level, no horse attribution).

## M. Owner-Reported 3,330 / 560 / 2,770 — RECONCILED

| Measure | Live value |
|---|---|
| Ledger rows for the client | 15 |
| Sum of positive (debit) amounts | **3,330.00** |
| Sum of negative (credit) amounts | **−560.00** |
| `customer_balances.balance` | **2,770.00** (SAR) |
| Ledger net sum | 2,770.00 — exact match |
| Invoices on file | 12, total 6,564.50, statuses draft+approved+paid, earliest issue_date 2013-07-20 |

3,330 − 560 = 2,770 holds, **and holds for the correct reason**: drafts are excluded from posting, so invoice face value (6,564.50) legitimately exceeds posted debit (3,330). No standalone invoice, ledger row, or payment equals 3,330 or 560 — these are aggregates, not single records. The 2013 issue date on a live row is itself evidence that backdated documents already exist and are being posted at `created_at`.

## N. Cross-Account Applicability

Canonical core (`invoices`, `invoice_items`, `ledger_entries`, `customer_balances`, payment sessions) is account-type agnostic and already serves stable, lab, clinic, doctor. Adapter boundary is exactly two things: (1) operational entity resolution (`entity_type`/`entity_id`) and (2) horse identity space (`horses` vs `lab_horses` vs `doctor_patients`). Recommend **one canonical core + thin adapters** (§10.7 option A).

## O–P. Recommended Target Architecture

- Historical representation: **Hybrid (10.1-C)** — reconstruct reliable documents, one governed residual opening obligation, with a reconciliation contract `sum(reconstructed) + opening_residual = agreed_cutover_balance` enforced at posting.
- Posting model: **Staging → validate → approve → canonical post (10.2-B)**, with reference-only archive for evidence-poor documents.
- Opening obligation: **dedicated ledger transaction type** (not a fake invoice) so it can receive allocations without inheriting invoice item/tax semantics.
- Provenance: dedicated columns + an `import_batches` table. Reject description-only tagging.
- Source ≠ category: add `finance_source` (dayli / legacy_system / spreadsheet / manual_opening / external_archive) orthogonal to the existing `category_id`.

## Q. Permissions / Skill Network

Applied: **Skill 04 (Tenant Isolation)** — verdict `conditionally-tenant-isolation-safe`: Type A/B enforced by RLS on every financial table inspected; **Type C is unsafe pending the lab-horse identity-space defect (§L)**, which is an owner/portal-scope mislabel risk, not a leak. Skills 05/06/08 co-verification required before any import execution. Skill 19 confirms separation: `payment_intents`/`payment_splits` (platform) are distinct tables from `payment_sessions`/`payment_allocations` (tenant operational) — no cross-contamination found.

## R. Performance / Reliability

Idempotency keys on all mutating RPCs; `finance_request_idempotency` table exists; advisory locks prevent concurrent double-post. Statement enrichment issues N+1-style batched multi-hop lookups (sample→lab_horse, admission→horse, treatment→horse) — acceptable at 88 ledger rows, unproven at import scale.

## S. Future Staged Blueprint (design only)

1. Effective-date remediation (backfill 28 NULLs, switch statement reader) — prerequisite, blocks all else.
2. POS atomicity cutover to `create_source_checkout_invoice`.
3. `import_batches` + provenance columns.
4. Client/horse matching with review state + horse identity-space bridge.
5. Opening obligation + credit objects.
6. Canonical posting + reversal.
7. Statement source filter + first-movement update.
8. Historical backfill (separate approved data run).
9. Cross-account adapters. 10. QA re-audit. 11. Governance persistence. 12. Owner closure.

Each stage requires its own dry-run, rollback plan, and acceptance criteria; stages 3–8 each require separate Owner Alignment.

## T. Negative Test Matrix

All 33 cases in §12 are carried forward unchanged as the future Acceptance matrix. Highest-priority (already evidenced as live risk): backdated invoice earlier than first movement; client-level invoice under horse filter; multi-horse invoice under one-horse filter; imported Lab invoice consuming a Lab credit; header/item mismatch on the POS path.

## U. Risks / Rollback

Highest residual risk is double-counting between reconstructed history and opening residual — mitigated only by the deterministic reconciliation contract in §P. Rollback for any import must be batch-scoped reversal (new reversing ledger rows), never physical delete.

## V. Owner-Alignment Decisions Required

| Code | Decision | Options | Recommendation |
|---|---|---|---|
| D-01 | Horse-level allocation when source shows only a total | explicit / proportional / client-level | Client-level; never fabricate precision |
| D-02 | Unapplied customer advances | credit object / negative obligation / hold unposted | First-class credit object |
| D-03 | Who approves historical batches | owner only / delegated permission | New `finance.import.approve` permission |
| D-04 | Tax-unknown historical documents | post gross-only / require tax / reference-only | Post gross-only with `tax_confidence='unknown'` |
| D-05 | Source invoice-number collisions across tenants | display source number / display Dayli number / both | Both, source number secondary |
| D-06 | Multiple cutover dates per client | allow / one per tenant | One per client, many per tenant |
| D-07 | Materiality tolerance for residual reconciliation | 0 / fixed / percentage | Fixed per-currency minor-unit tolerance |
| D-08 | Original source-document visibility | finance roles only / all members / owner only | Finance roles with `clients.statement.view` |

## W. WORKSTREAM PERSISTENCE

Workstream ID: NOT ASSIGNED — OWNER APPROVAL REQUIRED · Title (proposed only): Shared Tenant Operational Finance Foundation & Historical Financial Migration · Stage: Investigative Audit · Status: READ-ONLY — NOT PERSISTED · Stored At: NOT STORED · Files Created: None · Files Updated: None · Canonical Documentation Updated: No · Next Permitted Step: Owner Alignment only · Timestamp Evidence: HEAD commit 2026-08-01 03:54:48 +0000; run times — Exact time not recorded · Timezone: Asia/Riyadh UTC+03:00

## X. ROADMAP IMPACT

Primary Roadmap (proposed, not approved): `RM-DH-002` — Core Operations and Expansion. Secondary: none genuinely supported. Roadmap Items: recommendations only. Item Status Changes: None. Roadmap Status Changed: No. Owner Approval Required: Yes. Roadmap Stored At: Not stored in this run. `RM-DH-002` remains `PARTIALLY_RECOVERED` unless separately changed through an Owner-approved persistence run.

## RUN METADATA AND EXACT STOPPING POINT

Mode: Plan/Chat · Operation: Full Deep Forensic Investigative Audit — Read-Only · Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-DEEP-FORENSIC-AUDIT-01 · Lineage: Shared Tenant Operational Finance + Historical Migration · Number: 01 · Preparation status: was UNSENT DRAFT; this run does **not** by itself prove the number was formally consumed — Owner must confirm consumption · Prepared: 02-08-2026 01:23 Asia/Riyadh · Run Start / Run End / Report Generated: Exact time not recorded · Timezone: Asia/Riyadh UTC+03:00 · Branch: main · HEAD before: 3224254f · HEAD after: 3224254f · Working tree before: clean · Working tree after: clean except platform-generated `.lovable/plan.md` · Intended changed files: None · Actual intended changed files: None · Platform-generated paths: `.lovable/plan.md` (disclosed separately; not a repository change and not governance persistence) · Database writes: None · Repository writes: None · Documentation/governance writes: None · Project Knowledge writes: None · Workspace Knowledge writes: None · Skill changes: None · Settings changes: None · Read-only SQL summary: 6 SELECT statements — pg_proc attribute catalog, information_schema column lists (4 tables), aggregate counts/sums over invoices/invoice_items/ledger_entries/customer_balances/payment_* — no row-level PII returned · Sources unavailable: Documentation 5/10/12/13, Master Register v0.9.0, Rounds 1–5 artifacts, `RM-DH-002` package files · Final verdict: **OWNER ALIGNMENT BLOCKED — CRITICAL EVIDENCE GAPS**

Exact stopping point: The read-only Full Deep Forensic Investigative Audit report has been returned to the Owner. No implementation, import, backfill, repair, governance persistence, Acceptance, or Closure has occurred. The next permitted step is ChatGPT review of the Lovable report followed by Owner Alignment. Stop.
