# PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04

Mode: Plan/Chat — Read-Only. Local Prompt Number: 04 (now proven submitted and run).

---

## A. Executive Verdict

**OWNER ALIGNMENT BLOCKED — SPECIFIC EVIDENCE GAPS REMAIN**

Blocked for exactly two reasons, both named honestly below:

1. **WP2 (complete 322-row migration coverage ledger) was not produced.** A per-file ledger with 20+ evidence columns for 322 files is ~10,000 populated cells requiring 322 file reads plus per-object live comparison. It cannot be produced truthfully in one run and I will not emit a fabricated or sampled ledger labelled "complete". Section E states the exact coverage achieved (0/322 file-level rows; object-level live inventory complete).
2. **WP3.1 source evidence is absent.** No historical financial source file, sample, or specification exists anywhere in the repository or the database. Import Mode selection (Full History vs Opening Obligation) is source-dependent and therefore cannot be resolved.

Everything else asked for is answered, and three findings materially change the picture:

- **There is no historical-import landing model at all.** Zero import batch / source row / provenance / quarantine / opening-obligation / unapplied-credit objects exist. Historical import today would have to masquerade as operational invoices — the single largest import risk on the platform.
- **Platform SaaS Billing collision: NONE.** `payment_intents` has **0 rows**, `payment_splits` has **0 rows**, and all **9** `payment_accounts` are `owner_type='tenant'`. No platform-owned account, no platform money, no shared ledger. The Owner-approved separation is currently intact by fact, not just by intent.
- **Lab-credit side-effect risk is currently zero-state, not zero-design.** `lab_credit_wallets` = **0 rows**, `lab_credit_transactions` = **0 rows**. The consuming writer exists and is unsafe (client-side, non-atomic), but nothing can be consumed today.

---

## B. Prompt Identity and Lineage Integrity

Prompts 01, 02, 02-Continuation-A (no number consumed), 03: consumed. Prompt 04: this run consumes it. No identity collision.
Branch `edit/edt-f9494b37-5fb3-4930-b426-c912cb1b5e28`; HEAD before **`f2ccf973`**; working tree **clean** before the run.

---

## C. Read-Only Compliance and Evidence Coverage

Inspected: `supabase/migrations/` (directory listing and count only, not per-file contents), `src/hooks/laboratory/useLabCredits.ts`, `src/hooks/clients/useClientStatement.ts`, `src/hooks/clients/useClientFirstActivity.ts`, `src/hooks/pos/usePOSCore.ts`, `src/hooks/finance/*`, `src/lib/finance/*`, `src/integrations/supabase/types.ts`, and the schema artefacts `invoices.schema.txt`, `invoice_items.schema.txt`, `customer_balances.schema.txt`.
Live: bounded aggregate SELECTs over the 15 finance tables, `invoice_items` joined to `lab_horses`, plus catalog reads (`pg_class.relacl`, `pg_policy`, `pg_proc`) carried forward from Prompt 03 and spot-reverified.
Not inspected: 322 migration file bodies; export component bodies; storage objects; cron/extensions.
Writes: zero. DDL/DML/RPC-mutations/migrations/backfills/cleanup/deploy: zero. `.lovable/plan.md` is rewritten by the platform as a planning artefact — disclosed, not an intended repository write.

---

## D. Verified Facts / Reverified / Overturned / Inferences / Gaps

| ID | Class | Statement |
|---|---|---|
| VF-01 | Verified Fact | Migration count is **exactly 322**. First `20251217045741_3c096c3e…sql`, last `20260727015047_f4c8b4e1…sql`. No drift in the number. |
| VF-02 | Verified Fact | **No import infrastructure exists.** Repo-wide search for `import_batch`, `opening_balance`, `opening_obligation`, `unapplied`, `historical_import` matches only i18n strings and two unrelated UI components. No such table exists in the live schema. |
| VF-03 | Verified Fact | Live finance row counts: invoices **65** (4 tenants), invoice_items **148**, ledger_entries **88**, customer_balances **8**, payment_sessions **29**, payment_allocations **38**, payment_horse_allocations **15**, expenses **3**, billing_links **18**, **pos_sales 0**, **lab_credit_wallets 0**, **lab_credit_transactions 0**. |
| VF-04 | Verified Fact | `payment_accounts` = **9 rows, all `owner_type='tenant'`**; `payment_intents` = **0 rows**; `payment_splits` = **0 rows**. |
| VF-05 | Verified Fact | Invoice status census: approved 20, paid 18, draft 16, cancelled 4, partial 3, shared 3, overdue 1. **`issued` = 0** although the CHECK constraint permits it (and also permits `sent`, which no code writes). |
| VF-06 | Verified Fact | Item attribution census (148): `horse_id` **102**, `lab_horse_id` **9**, neither **37**. |
| VF-07 | Verified Fact | Ledger composition: invoice 47, payment 38, adjustment 3. |
| RC-01 | Reverified | ledger_entries **88 total / 28 NULL `effective_date`**, of which **25 carry `payment_session_id`**. Prompt 03 numbers hold exactly; no new NULLs created. |
| RC-02 | Reverified | `invoices_status_check` accepts `draft, reviewed, approved, shared, paid, partial, overdue, cancelled, issued, sent` — ten values; frontend `Invoice` type in `src/hooks/finance/useInvoices.ts:12` lists nine (omits `sent`). |
| RC-03 | Reverified | `useClientStatement.ts:52` orders and filters on **`created_at`**, and `:101` maps `date: e.created_at`. The statement read path does not use `effective_date` at all. This is a **new** and more serious framing than Prompt 03's first-activity-only finding. |
| OC-01 | **Overturned** | Prompt 03 implied lab-credit consumption during import was a live risk. With **0 wallets and 0 transactions**, no credit can be consumed today. The risk is design-forward only. |
| OC-02 | **Overturned** | Prompt 02/03 treated the platform-billing bridge as "identity reference, needs proof". Proven stronger: there is not even a platform-owned payment account. **NO_COLLISION**. |
| CI-01 | Current Inference | The 16 draft invoices and the 10,000 SAR adjustment are Demo artefacts consistent with Owner classification. Not provable as Demo from data alone — no provenance column exists (see Q). |
| EG-01 | Evidence Gap | 322-file migration ledger not produced (see A). |
| EG-02 | Evidence Gap | No historical source file or specification exists to inspect. |
| EG-03 | Evidence Gap | Export component bodies (PDF/CSV) not re-read this run. |
| CX-01 | Contradiction | `effective_date` exists, is backfilled for 60/88 rows, and is used by RPC writers — yet **no read consumer uses it**. The column is written-but-unread; the statement and first-activity both run on `created_at`. |

---

## E. Complete Migration Coverage Summary

Actual file count: **322** (VF-01). Coverage achieved this run:
- File-level ledger rows produced: **0 / 322 (0%)**.
- Live-object inventory coverage of finance-relevant objects: **complete** (all 15 tables, all policies, all grants, all finance functions).
- Directional comparison performed: **live → expected only**. Repository → live was not performed.

Honest consequence: **no drift status may be asserted** for any migration in this run. Prompt 03's `EG-1` stands unresolved. This gap alone keeps the verdict at BLOCKED.

Feasibility note for the next run: a truthful ledger needs to be batched — roughly 30–40 migrations per report part, 8–11 parts, with normalized definition hashes compared per object rather than per file. That is the correct shape for Prompt 05.

---

## F. Complete Migration Coverage Ledger

**NOT PRODUCED — see E.** No partial ledger is emitted, because a partial ledger presented under a "complete" heading would itself be a truth defect.

---

## G. Repository-to-Live Drift Register

**UNVERIFIABLE_WITH_CURRENT_ACCESS** for all 322 files. One standing drift signal carried forward and re-confirmed as unresolved: `docs/aml_1_b_1/stage_j5_1/preflight/12_baseline.txt` references `pretax_amount_snapshot`, a column the live `invoice_items` schema does not contain (`invoice_items.schema.txt` lines 4–33). Classification: **UNVERIFIED**, likely `REPOSITORY_MISSING` or superseded-doc residue. Impact class if confirmed: SMALL_BOUNDED_CORRECTION.

---

## H. Current Finance Object and Writer Inventory

Source-of-truth classification (unchanged and reverified):
- **Source**: `invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `expenses`.
- **Derived posting record**: `ledger_entries`.
- **Fully derived**: `customer_balances` (recomputed inside `_finance_ledger_insert`).
- **Link/trace**: `billing_links`, `finance_request_idempotency`.
- **Dormant**: `pos_sales` (0 rows, RLS on, 0 policies, no anon/authenticated grant — fail-closed), `payment_intents`/`payment_splits` (0 rows), `lab_credit_*` (0 rows).

Canonical writers (all SECURITY DEFINER, `search_path=''`, tenant-checked, idempotency-keyed): `create_invoice_with_items`, `update_invoice_with_items`, `delete_draft_invoice`, `approve_invoice`, `cancel_invoice`, `post_payment_session`, `post_payment`, `post_invoice_payments`, `post_manual_ledger_adjustment`, `post_expense_with_ledger`, `create_pos_sale`, `create_source_checkout_invoice`.
Legacy direct-write paths still wired: `src/lib/finance/postLedgerForInvoice.ts`, `src/hooks/pos/usePOSCore.ts` (POS_DEFERRED), `src/hooks/finance/useLedger.ts:104-150` (`createEntry` inserts `ledger_entries` and upserts `customer_balances` client-side, computing `balance_after` in the browser).

---

## I. Historical Financial Import Contract

**Current platform capability: NONE.** There is no safe landing model (VF-02). Operational invoices are not a safe import object: they trigger `_invoice_items_fill_snapshots` and `_invoice_items_validate_source` on insert, they carry no provenance, they participate in live numbering via `_finance_invoice_number_next`, and once approved they post to the live ledger — an import that mis-fires cannot be distinguished from operational truth afterwards.

**Source Intake Contract** (required before any real import, since EG-02 blocks source analysis):
Per file — filename, SHA-256, row count, encoding, tenant, source system name/version, statement period start/end, currency, decimal + thousands separator, digit form (Latin/Arabic-Indic), date format and timezone assumption, declared control totals (invoice total, payment total, closing balance).
Per row — source invoice number, source payment number, source line identity, customer identifier and/or name, horse identifier and/or name, issue date, due date, payment date, gross/net/VAT/discount, status, allocation target, notes. Any field absent must be declared absent, not defaulted.

**Import modes** (all three required; C is Owner-mandated):
- **A. Full Historical Transaction Import** — only where headers, lines, dates, payments and allocations are all present.
- **B. Opening Obligation** — a first-class object, never a synthetic invoice. Must carry cutover date and must be mutually exclusive with Mode A over the same period for the same customer.
- **C. Unapplied Opening Customer Credit** — a first-class credit object. Never a negative invoice, never a forced allocation, never silently netted. If an unallocated amount is proven but not safely representable, quarantine it.

**Recommended control objects** (all new; none exist): `import_batches`, `import_source_files`, `import_source_rows` (raw immutable payload + normalized projection), `import_row_results`, `import_quarantine`, plus provenance columns (`import_batch_id`, `source_system`, `source_document_number`, `imported_at`) on every landed financial object, and two new financial objects `opening_obligations` and `customer_credits`.
Alternative considered and rejected: reusing `finance_request_idempotency` as the batch registry — it is TTL-expiring (`expires_at`) and purged by `_finance_idempotency_purge_expired`, so it cannot hold permanent provenance.

**Idempotency**: file-level = SHA-256 of raw bytes, unique per tenant (defeats re-upload; a corrected file with the same filename gets a different hash and is correctly treated as new); row-level = deterministic fingerprint over (tenant, source_system, document_type, source_document_number, economic_date, amount, customer_key) — unique per tenant, which is what makes duplicate invoice numbers across different tenants safe and duplicate numbers across different customers within one tenant detectable rather than silently merged. Retry resumes on unlanded rows only. Concurrency guarded by an advisory lock on (tenant, batch), reusing the existing `_finance_advisory_lock_key` pattern.

**Atomicity — recommendation: staged validation, then per-document commit inside one batch transaction envelope.** Whole-batch atomicity fails a 5,000-row file on one bad row; per-row atomicity can land an invoice header without its lines. Per-document (invoice + its items + its allocations as one unit) is the only boundary that matches the accounting object. Valid documents land, invalid documents quarantine with their raw payload preserved, and the batch is only marked `reconciled` when the equations in T balance.

---

## J. Schema Capability and Gap Matrix

| Capability | Exists | Object | Gap |
|---|---|---|---|
| Invoice header/lines | Yes | `invoices`, `invoice_items` | No provenance; insert triggers fire |
| Payment receipt | Yes | `payment_sessions` (`payment_date` NOT NULL) | No provenance |
| Invoice allocation | Yes | `payment_allocations` | — |
| Horse allocation | Yes | `payment_horse_allocations` | — |
| Economic date | Partial | `ledger_entries.effective_date` | Nullable; 28 NULL; **no read consumer** |
| Split tender | Partial | multiple tender rows per session | Needs verification per WP5 definition |
| Unapplied credit | **No** | — | New object required |
| Opening obligation | **No** | — | New object required |
| Import batch/source/quarantine/provenance | **No** | — | Entire layer required |
| Idempotency (permanent) | **No** | `finance_request_idempotency` is TTL | New durable registry required |
| Cutover date | **No** | — | Required |

---

## K. Effective-Date and Chronology Contract

Reverified: 88 total, **28 NULL**, **25 with `payment_session_id`** (RC-01).

Classification (unchanged in shape, re-proven in count):

| Class | Rows | Proven source | Rule |
|---|---|---|---|
| DETERMINISTIC_SOURCE_DATE | **25** | `payment_sessions.payment_date` (date NOT NULL) | Payment credit takes the session payment date. Never `invoice.issue_date` — they disagreed on 11/25. |
| OWNER_POLICY_REQUIRED | **3** | 2 void adjustments + 1 `invoice_cancellation` | Candidate = void event date; needs OA-01. |
| UNRESOLVED_QUARANTINE | 0 | — | — |

Required date semantics going forward — keep six fields strictly distinct: `effective_date` (economic), `created_at` (platform write), `imported_at`, source document date, source payment date, cutover date. Operational invoice → `issue_date`; imported invoice → source document date; payment → `payment_date`; allocation → inherits its session; unapplied credit → source receipt date; opening obligation → cutover date; cancellation/void → per OA-01; manual adjustment → explicit, never defaulted.

**Correction order (WP4.4), and it matters:** (1) classify and repair the 28 legacy rows; (2) **make the statement read path consume `effective_date`** — currently it does not (RC-03), so repairing dates today changes nothing a user can see; (3) enforce NOT NULL on new writes; (4) change `get_client_first_financial_activity` from `MIN(created_at)`; (5) add the supporting index; (6) re-verify export parity. Doing (4) before (1) would regress. A blanket `COALESCE(effective_date, created_at)` is rejected — it permanently hides unrepaired rows.

---

## L. Payment / Allocation / Credit / Opening Obligation Contract

Terminology corrected per WP5: one 1,000 SAR bank transfer split across Invoice A 600 / Invoice B 400 is **one payment with two invoice allocations**, not Split Tender. Split Tender requires multiple tender components (cash 400 + card 600) under one settlement. Prompt 03 used the term loosely; that usage is withdrawn.

Supported today: payment receipt, invoice allocation, horse allocation, one-payment-to-many-invoices (38 allocations across 29 sessions proves it is exercised), partial payment. All flow through `post_payment_session` — transactional, idempotent, tenant-checked, permission-gated, ledger-posting, balance-recomputing.
Unsupported today: overpayment as a durable object, unapplied credit, refund as a first-class object (only a manual `adjustment` ledger row, with no stored reason code), reversal provenance, opening obligation, imported payment, imported credit.

---

## M. Finance-Specific Write-Authority Matrix

Direct answers:

1. **Can `anon` write financial truth?** Table grants say yes (`relacl` grants ALL to `anon` on `invoices`, `ledger_entries`, `customer_balances`, `payment_sessions`); RLS says no (every policy resolves `auth.uid()` through `has_permission`/`is_tenant_member`, which fails for anon). Net: **blocked by RLS only** — grants are broader than policies (answer to Q5: **yes**).
2. **Can `authenticated` write `ledger_entries` directly?** **Yes** — INSERT policy is `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit')`. No UPDATE/DELETE policy, so those are fail-closed.
3. **Can `authenticated` insert/update/delete `customer_balances` directly?** **Yes, all three** (`customer_balances.schema.txt` lines 18–24). This is the single worst finance authority defect: the derived balance is directly writable.
4. **Can a `finance.invoice.edit` holder bypass canonical logic?** **Yes** — `useLedger.ts:104-150` does exactly that in shipped code, computing `balance_after` in the browser.
5. **Grants broader than RLS?** Yes (see 1).
6. **Unsafe SECURITY DEFINER functions?** None found. All finance definers pin `search_path=''`, take `p_tenant_id`, and the private `_finance_*` helpers are not granted to `authenticated`.
7. **Can import be safely invoked from the browser?** **No.** File hashing, batch atomicity, quarantine and provenance must be server-side.
8. **Required import boundary:** an edge function (service-role) performing validation + staging, with per-document commits through new SECURITY DEFINER RPCs. The browser uploads and polls; it never writes financial rows.
9. **Writers to migrate before direct DML can be revoked:** `useLedger.ts` `createEntry`, `postLedgerForInvoice.ts`, and `usePOSCore.ts` (POS_DEFERRED — so POS must be disabled or exempted rather than migrated).
10. **Safest ordering:** prove the canonical replacement for each legacy writer → cut the caller over → verify no remaining direct-write call sites → then revoke grants and drop the three mutating policies. Never revoke first.

No platform-wide permission redesign is proposed. Scope stays on two tables.

---

## N. Draft Invoice Disclosure Contract

Current state, proven: `useClientStatement.ts` reads **only** `ledger_entries`. Draft invoices never post to the ledger, so draft value is **entirely invisible** — not partially visible, not incorrectly included. Posted Balance is therefore already correct; the gap is disclosure only.

Target: `Posted Balance` / `Draft Invoices [count]` / `Draft Value [amount]` / disclosure line stating draft value is excluded.

Calculation contract — a separate query against `invoices`, never merged into the ledger stream:

| Status | Posted Balance | Draft Disclosure |
|---|---|---|
| draft | exclude | **include** |
| reviewed | exclude | include (as unposted) |
| approved, shared, partial, paid, overdue | include | exclude |
| cancelled | exclude | exclude |
| issued, sent | exclude | POS_DEFERRED / unused |

Date rule: filter drafts on `issue_date` within the selected range (the ledger stream has no row to filter on). Horse-filter rule: when a horse filter is active, disclose only drafts having at least one item for that horse, and label client-level lines rather than attributing them. Parity: computed once in the hook, consumed identically by screen/print/PDF/CSV.
Bilingual: EN "Draft invoices (not included in balance)" / AR "فواتير مسودة (غير مدرجة في الرصيد)". Mobile-first: a single disclosure row beneath the balance, not a fourth KPI card.
**Bounded read-path correction — no schema change.** Likely files in a later Execution stage: `src/hooks/clients/useClientStatement.ts`, `src/components/clients/ClientStatementTab.tsx`, the statement PDF/CSV builders, `src/i18n/locales/{en,ar}.ts`.
Not coupled to POS status. Does **not** block Horse Attribution.

---

## O. Non-POS Horse Identity and Attribution — C1 Item-Level Matrix

15 items, complete:

| # | Invoice | Status | Description | Amount | horse_id | lab_horse_id | entity_type | linked_horse_id | Resolved identity | Current key | Expected key |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | INV-9916 | draft | تجربة | 30.00 | — | — | — | — | none | client-level | client-level |
| 2 | INV-9919 | draft | متابعة حمل | 1,500.00 | — | c99e7d4e | — | **12a9c7da** | horse 12a9c7da | **unresolved** | horse 12a9c7da |
| 3 | INV-9920 | paid | تجربة | 230.00 | — | c99e7d4e | — | **12a9c7da** | horse 12a9c7da | **unresolved** | horse 12a9c7da |
| 4 | INV-9923 | approved | متابعة حمل | 1,500.00 | — | e43d03ef | — | **8e5cbcbd** | horse 8e5cbcbd | **unresolved** | horse 8e5cbcbd |
| 5 | INV-9923 | approved | تطعيمات | 1,200.00 | — | e43d03ef | — | **8e5cbcbd** | horse 8e5cbcbd | **unresolved** | horse 8e5cbcbd |
| 6 | INV-LAB-…MY4D | approved | Basic Urine Analysis | 80.00 | — | — | lab_sample | — | via sample only | `lab` domain | horse via sample |
| 7 | INV-LAB-…MY4D | approved | CBC | 25.00 | — | — | lab_sample | — | via sample only | `lab` domain | horse via sample |
| 8 | INV-LAB-…JF7R | paid | Basic Urine Analysis | 80.00 | — | — | lab_sample | — | via sample only | `lab` domain | horse via sample |
| 9 | INV-LAB-…JF7R | paid | CBC | 150.00 | — | — | lab_sample | — | via sample only | `lab` domain | horse via sample |
| 10–15 | الم-202607-* | approved/draft ×5 | مبلغ الفاتورة / tr | 50–100 each | — | — | — | — | none | client-level | client-level |

**Decisive finding: not one of the 15 C1 items carries `horse_id`.** Four resolve only through `lab_horses.linked_horse_id` — a bridge the read path ignores — and four more resolve only indirectly through `entity_id → lab_samples`. So C1's horse-scoped statement view can attribute **0.00 of 4,995.00** correctly today, while 4,430.00 is in fact horse-attributable. This confirms and sharpens Prompt 02's F-7/F-8 from "plausible" to **proven for C1**.

Cross-tenant census (148 items): `horse_id` **102** (69%), `lab_horse_id` **9** (6%), neither **37** (25%). The `invoice_items_horse_source_exclusive_chk` constraint guarantees the two are never both set, so a single normalized resolution — `COALESCE(horse_id, lab_horses.linked_horse_id)` — is structurally safe. C1 is therefore an unusually bad case, not the platform norm.

Import mapping rules: source horse **ID** → verify same tenant, else quarantine (never cross-tenant). Source horse **name only** → exact normalized match within tenant; one match maps, zero or multiple matches quarantine. Lab horse with `linked_horse_id` → map to the linked operational horse. Intentionally customer-level rows → land unattributed and labelled, never guessed.

---

## P. Lab-Credit Side-Effect Analysis

Consumer proven: `src/hooks/laboratory/useLabCredits.ts:189` `debitCredits(sampleId, samplesCount)` — client-side, inserts a `lab_credit_transactions` row with `txn_type:'debit'` then separately updates `lab_samples.debit_txn_id` (:225-228). **Non-atomic, non-idempotent, browser-driven.** Refund path at :272-275 clears `debit_txn_id`. Gate `is_lab_credits_enabled(_tenant_id)`.
Lifecycle point: sample creation, not result approval — so importing a historical **result** cannot consume a credit. Importing a historical **sample or lab invoice** could only consume one if it were routed through this hook, which a server-side import would not be.
**Live risk today: zero** (0 wallets, 0 transactions — OC-01).
Required guard regardless: import must never call `debitCredits`; landed lab rows must carry `import_batch_id`; the future server-side sample writer must skip credit debit when provenance is present. Proof test: assert wallet balance and transaction count unchanged before/after a lab-history import (test IM-22 below).

---

## Q. Demo Data Census and Cleanup Alternatives

Census (all classifications are **UNCERTAIN by construction** — no provenance column exists on any finance table, so no row can be *proven* Demo from data alone; the Owner classification is the only evidence):

| Object | Rows | Classification | Dependency |
|---|---|---|---|
| invoices | 65 (4 tenants) | LIKELY_DEMO | parents of items, ledger, billing_links |
| invoice_items | 148 | DERIVED_FROM_DEMO | CASCADE from invoices |
| ledger_entries | 88 | DERIVED_FROM_DEMO | drives balances |
| customer_balances | 8 | DERIVED_FROM_DEMO | fully recomputable |
| payment_sessions / allocations / horse_allocations | 29 / 38 / 15 | DERIVED_FROM_DEMO | — |
| expenses | 3 | LIKELY_DEMO | — |
| billing_links | 18 | DERIVED_FROM_DEMO | ties to boarding/service events |
| finance_request_idempotency | TTL rows | SYSTEM_SEED | self-purging |
| pos_sales, lab_credit_* , payment_intents, payment_splits | 0 | n/a | nothing to clean |
| horses / clients referenced | — | SHARED_DEPENDENCY | **must not be deleted** — operational records |
| the 10,000 SAR adjustment | 1 | **OWNED_TEST_CASE** | Owner-classified early Demo test. **Not fraud, not a real debt, not a security incident.** |

Alternatives: (1) tenant-level clean reset — cleanest, but destroys the boarding/service history the billing_links point at; (2) relationship-ordered selective deletion — feasible because CASCADE already covers items, but leaves orphaned billing_links unless ordered correctly; (3) cancellation/compensation preserving audit — safest for accounting integrity, worst for a clean import baseline; (4) snapshot-then-reset; (5) quarantine/archive; (6) reseed to a known Demo baseline.
**Recommended: (4) then (2), staged** — export a full snapshot of the 15 finance tables first (recoverability), then delete in dependency order strictly within the identified Demo tenants, never touching `horses`, `clients`, or non-finance operational tables. Prerequisite: Owner confirms the exact tenant set. Rollback = restore from the snapshot. **Not executed.**

---

## R. Platform SaaS Billing Collision Check

| Touchpoint | Evidence | Classification |
|---|---|---|
| `payment_accounts` | 9 rows, **all `owner_type='tenant'`**; zero platform-owned | **NO_COLLISION** |
| `payment_intents` | **0 rows** | **NO_COLLISION** |
| `payment_splits` | **0 rows** | **NO_COLLISION** |
| `payment_sessions.payment_account_id → payment_accounts` | FK to a tenant-owned account only | **IDENTITY_REFERENCE_ONLY** |
| `_finance_provision_tenant_payment_account` | provisions tenant accounts only | **CONFIGURATION_SHARED** |
| Shared ledger / balance | none — no platform row posts to `ledger_entries` | **NO_COLLISION** |
| Subscription / plan / entitlement / store-purchase objects | do not exist | n/a |

**No collision exists. Work Package 11 stops here**, per the Prompt's own instruction. Minimum boundary to preserve when Platform SaaS Billing is eventually built: platform revenue must never post to `ledger_entries`; tenant customer payments must never satisfy a Dayli Horse subscription; platform refunds must never reverse tenant invoices; platform reporting must consume platform billing truth, not tenant operational ledger truth. Nothing about the platform-owner Dashboard is designed here.

---

## S. Account-Type Applicability Matrix

Live `tenant_type` enum reverified — **10 values**: stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor. The three planned types (farrier, rider, jockey) are **not** in the live enum and cannot be evidenced from current code.

| Type | Live | Op-finance exposure | Invoice | Payment | Horse attribution | Import relevance | Lab credit | Import risk |
|---|---|---|---|---|---|---|---|---|
| stable | yes | high | RPC + legacy | yes | high | **high** | no | horse mapping |
| clinic | yes | high | RPC | yes | high | high | no | horse mapping |
| lab | yes | high | RPC (lab draft) | yes | via bridge | **high** | **yes** | bridge + credit guard |
| academy | yes | medium | RPC | yes | low | medium | no | client-level |
| pharmacy | yes | medium | legacy POS | yes | low | low (POS_DEFERRED) | no | POS deferred |
| transport | yes | medium | RPC | yes | medium | medium | no | horse mapping |
| auction | yes | low | RPC | yes | high | low | no | horse mapping |
| horse_owner | yes | payer side | none | n/a | high | high | no | statement truth |
| trainer | yes | medium | RPC | yes | high | medium | no | horse mapping |
| doctor | yes | medium | separate doctor services | yes | medium | medium | no | catalog mismatch |
| farrier / rider / jockey | **no** | — | — | — | — | — | — | future only |

The import contract is schema-uniform (everything is `tenant_id`-scoped) but **not writer-uniform** — lab and doctor have distinct catalogs, so per-type source mapping is required.

---

## T. Reconciliation Contract

Mandatory equations at file, batch, customer, invoice, payment, allocation, horse, tenant, ledger, balance and statement level:

```text
source invoice value = imported + quarantined + rejected
source payments      = allocated + unapplied credit + refunded/reversed + quarantined
posted debits - posted credits = ledger net movement
ledger net movement  = derived customer balance
horse-attributed + intentionally client-level + quarantined = applicable scoped value
draft/unposted value stays outside Posted Balance
imported lab history -> live lab-credit delta = 0
opening obligation and full-history invoices never both cover the same period
```

Conventions: NUMERIC(12,2) throughout (matches live columns); debits positive, credits negative (matches `ledger_entries`); currency defaults to the tenant currency, and any source row in another currency quarantines rather than converting; VAT recomputed from source gross/net and quarantined on mismatch beyond 0.01; **tolerance 0.00 at batch level** — any residual, however small, is reported as an unexplained difference and never rounded to zero.

---

## U. Import-Specific Test and Acceptance Matrix (proposed; **none executed**)

IM-01 same file twice → second batch rejected on file hash, zero new rows. IM-02 repeated row in one file → one landed, one flagged duplicate. IM-03 same transaction across overlapping files → row fingerprint blocks the second. IM-04 partial batch failure → valid documents landed, invalid quarantined with raw payload, batch = `partially_reconciled`. IM-05 invalid customer mapping → quarantine. IM-06 ambiguous horse name → quarantine, never guessed. IM-07 cross-tenant horse ID → rejected. IM-08 historical invoice earlier than current first activity → first-activity anchor moves. IM-09 payment date ≠ issue date → ledger stores payment date. IM-10 one payment to many invoices → one session, N allocations, no Split Tender labelling. IM-11 true Split Tender (cash+card) → one settlement, multiple tender components. IM-12 unapplied credit → credit object created, not netted. IM-13 opening obligation → obligation object, no synthetic invoice. IM-14 opening credit → credit object at cutover. IM-15 obligation overlapping imported invoices → overlap detected and blocked. IM-16 imported cancelled invoice → lands cancelled, no ledger debit. IM-17 void date rule → per OA-01. IM-18 invalid VAT/rounding → quarantine, no silent correction. IM-19 negative/zero values → explicit rule, no silent skip. IM-20 imported draft → lands unposted. IM-21 imported draft disclosure → excluded from Posted Balance, shown in disclosure. **IM-22 imported lab invoice → wallet balance and transaction count unchanged.** IM-23 browser direct financial write → rejected in target state. IM-24 retry after timeout → resumes, no duplicates. IM-25 concurrent imports → advisory lock serializes. IM-26 corrected file, same filename → new hash, treated as new batch, prior batch superseded not silently merged. IM-27 screen/print/PDF/CSV parity. IM-28 client-level item under horse filter → labelled, not attributed. IM-29 multi-horse invoice under one-horse filter → only that horse's lines. IM-30 unresolved row quarantined with raw provenance intact.

Mapped from Prompt 03: NT-19→IM-09, NT-21→IM-08, NT-24→IM-28, NT-25→IM-29, NT-32→IM-27, NT-33→IM-22. POS tests NT-28/29/30/31 → **POS_DEFERRED**, not expanded.

---

## V. Proposed Staged Remediation Sequence (recommendation only)

1. **Complete the 322-migration comparison** — clears EG-01. Blocks import: **yes** (unknown drift could invalidate any import design). Read-only.
2. **Finance write-authority containment** — cut over `useLedger.ts` and `postLedgerForInvoice.ts` to canonical RPCs, then revoke DML and drop the three mutating policies on `ledger_entries`/`customer_balances`. Blocks import: **yes**. Rollback: re-grant.
3. **Legacy economic-date classification and repair** — 25 deterministic + 3 policy-dependent. Blocks import: yes (reconciliation depends on it).
4. **Statement read path onto `effective_date`** — resolves CX-01. Blocks import: yes.
5. **NOT NULL enforcement on new economic dates** — after 3 and 4.
6. **First-activity anchor correction** — after 5.
7. **Draft disclosure** — Small Bounded Correction, read-path only. Blocks import: **no**; can run in parallel.
8. **Horse-identity read-path normalization** (`COALESCE(horse_id, linked_horse_id)` + one grouping key). Blocks import: yes for horse-scoped reconciliation.
9. **Demo census sign-off and snapshot-then-reset** — after Owner approves the tenant set.
10. **Import control layer** — batches, source files, source rows, quarantine, provenance columns.
11. **New financial objects** — `opening_obligations`, `customer_credits`.
12. **Server-side import edge function + per-document RPCs**, then dry-run, then reconciliation gate.

POS: deferred throughout. Platform permission redesign: deferred. Platform SaaS Billing: separate future Workstream. No stage is approved, started, accepted, or closed.

---

## W. Owner Alignment Decision Package

**OA-01 Void / reversal economic date.** Affects 3 legacy rows and every future cancellation. Example: a Stable voids a 5,750 SAR boarding invoice on 03-04 that was issued 28-03. Options: (a) void date — the statement shows the correction when it happened, matching most accounting practice; (b) original date — the period reprints clean but history silently changes; (c) differentiated (operational cancellation → void date; historical correction → original date). **Recommend (c)**, defaulting to void date. Postponing leaves 3 rows unrepairable and blocks stage 3.

**OA-02 Full History vs Opening Obligation when source detail is incomplete.** Example: an old system exports only "Client X owes 12,400 SAR at 31-12-2025". Options: (a) always Opening Obligation when line detail is absent — recommended; (b) synthesize one summary invoice — rejected, creates fake operational truth; (c) per-customer Owner choice. Blocks stage 11.

**OA-03 Unexplained source differences.** Options: (a) zero tolerance, quarantine the batch — recommended; (b) tolerance band; (c) post a balancing adjustment. Blocks the reconciliation gate.

**OA-04 Demo cleanup strategy and audit preservation.** Snapshot-then-reset (recommended) vs cancellation-preserving. Needs the exact Demo tenant set. Blocks stage 9.

**OA-05 Cutover date and overlap policy.** What date separates history from operations, and what happens to a source row after it. Blocks stages 10–12.

**OA-06 Imported draft invoices.** Remain `draft`, or land in a distinct historical-unposted state? Recommend a distinct state so imported drafts are never edited as if operational. Blocks stage 10.

**OA-07 May imported history ever consume migrated lab credits?** Recommend **never** without an explicit source-evidenced rule. Blocks the IM-22 gate.

Not asked of the Owner: anything the evidence already settles (platform-billing collision, draft visibility, write authority, C1 attribution).

---

## X. Risks, Counterarguments, Dependencies, Deferred Register

IMPORT_BLOCKING: EG-01 unresolved drift; absent import layer; direct DML on derived finance; NULL economic dates; statement reading `created_at`.
SHARED_FINANCE_COLLISION: none proven.
SMALL_BOUNDED_CORRECTION: draft disclosure; horse-identity read normalization; `pretax_amount_snapshot` doc residue; `sent` status in CHECK but absent from the TS union.
POS_DEFERRED: POS atomicity, POS `issued` status, POS horse attribution.
PLATFORM_PERMISSION_DEFERRED: platform-wide permission redesign.
PLATFORM_SAAS_BILLING_SEPARATE: entire domain.
Counterargument worth recording: with only 88 ledger rows and 65 invoices, one could argue for wiping everything and starting clean rather than repairing 28 dates. That is genuinely defensible — but it does not remove the need for the import layer, the write-authority fix, or the drift comparison, and it destroys the only real-shaped test data available. Recommended path keeps the repair.

---

## Y. Workstream Persistence

No Workstream ID assigned. No Workstream file created or modified. No Acceptance. No Closure.

## Z. Roadmap Impact

Relationship to RM-DH-002 proposed only. No Phase, Track, priority, advancement, or closure approved. No Roadmap file created or modified.

---

## AA. Run Metadata and Exact Stopping Point

Mode: Plan/Chat — Read-Only. Operation: Historical Import Contract + Drift Audit. Prompt ID: `PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04`. Status: submitted, run, **consumed**.
Prompt Preparation: 02-08-2026 12:02 Asia/Riyadh (from the Prompt). Run Start: 02-08-2026 ~12:14 Asia/Riyadh (UTC 09:14, from the message timestamp). Run End / Final Report: 02-08-2026 ~12:20 Asia/Riyadh. Timezone UTC+03. Evidence for times: message send timestamp; per-call wall clock not recorded — **exact time not recorded** for Run End.
Branch `edit/edt-f9494b37-5fb3-4930-b426-c912cb1b5e28`. HEAD before **f2ccf973**; HEAD after **f2ccf973** (unchanged). Working tree clean before; after, only the platform-generated `.lovable/plan.md`.
Repository paths inspected: `supabase/migrations/` (listing), `src/hooks/laboratory/useLabCredits.ts`, `src/hooks/clients/useClientStatement.ts`, `src/hooks/clients/useClientFirstActivity.ts`, `src/hooks/finance/*`, `src/hooks/pos/usePOSCore.ts`, `src/lib/finance/*`, `src/integrations/supabase/types.ts`, `*.schema.txt`.
Database objects inspected: `public` schema — 15 finance tables, `invoice_items ⋈ lab_horses`, `payment_accounts`, `payment_intents`, `payment_splits`, `lab_credit_*`, `pos_sales`, plus `pg_class`, `pg_policy`, `pg_proc`.
Read-only queries by purpose: finance row-count census; NULL `effective_date` reverification; C1 item-level attribution join; status/attribution/ledger-type/payment-account census.
Intended repository writes 0. Actual repository writes 0 (except the disclosed `.lovable/plan.md`). Database writes 0. DDL 0. DML 0. Mutating RPCs 0. Migrations 0. Backfills 0. Cleanup 0. Deployment 0. Project Knowledge 0. Skill changes 0. Settings 0. Roadmap persistence 0. Workstream persistence 0. Acceptance none. Closure none.
Last fully completed Work Package: **WP15** (all except WP2, which is explicitly incomplete). Report continuation point: **WP2 / Section F — migration coverage ledger, row 1 of 322 not yet produced.**
Unresolved evidence gaps: EG-01 (322-file ledger), EG-02 (no source files), EG-03 (export bodies).
Stopping point: investigation only — no implementation, no migration, no backfill, no cleanup, no permission change, no persistence, no Acceptance, no Closure, Prompt 05 not prepared or consumed.
Recommended next step and Mode: ChatGPT review of this report, then **Prompt 05 in Plan/Chat Read-Only** dedicated solely to the 322-migration coverage ledger, delivered in numbered report parts of 30–40 migrations each.
