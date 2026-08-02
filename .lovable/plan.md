# PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-REMAINING-CRITICAL-EVIDENCE-COMPLETION-INVESTIGATIVE-AUDIT-03

Mode: Plan/Chat — Read-Only. Operation: Remaining Critical Evidence Completion Investigative Audit.
Lineage: Shared Tenant Operational Finance + Historical Migration. Local Prompt Number: 03 (now proven submitted and run).

---

## A. Executive Verdict

**OWNER ALIGNMENT BLOCKED — CRITICAL EVIDENCE GAPS REMAIN**

Prompt 03 closed the single most important gap and **overturned one prior conclusion**:

- **Corrected (F-4):** the 25 payment-credit rows with NULL `effective_date` are **not** dependent on `invoice.issue_date`. Every one of them (25/25) carries a `payment_session_id`, and `payment_sessions.payment_date` is `date NOT NULL` — a proven, source-specific economic date. `payment_date` disagrees with `invoice.issue_date` on **11 of 25** rows, so the Prompt 02 candidate would have mis-dated 44% of payment credits.
- **New fact:** live invoice status census contains **zero** rows with status `issued`, although POS still writes it. OA-02 changes shape.
- **New fact:** `pos_sales` has RLS enabled with **zero policies** (fail-closed) while `ledger_entries` / `customer_balances` remain directly client-writable under `finance.invoice.edit`.

Gates still unmet: full repository-vs-live drift comparison across 322 migrations (WP3), the complete per-item 15-row C1 attribution matrix with resolved bridge values (WP10 partial), and full downstream consumer trace for every export surface (WP9 partial). These are Prompt 04 work.

---

## B. Prompt Identity and Lineage Integrity

- Prompt 01: submitted, run, consumed. Prompt 02: submitted, run, consumed. Prompt 02 Continuation A: recovery only, no number consumed.
- Prompt 03: next eligible local number; this run consumes it.
- Branch `edit/edt-3e2a7549-de79-4c86-8e31-0c52bb1fa7c1`; HEAD before `31a101fe`; working tree clean at run start.
- `.lovable/plan.md` **is git-tracked** and is rewritten by the platform on plan runs. Its change in this run is platform-generated planning output, not implementation.

---

## C. Evidence Sources and Coverage

Live database (catalog + bounded SELECT): `pg_proc`, `pg_policy`, `pg_class.relacl`, `information_schema.columns`, `ledger_entries`, `invoices`, `invoice_items`, `customer_balances`, `payment_sessions`.
Repository: `src/hooks/pos/usePOSCore.ts`, `src/lib/finance/*`, `src/hooks/finance/*`, `docs/aml_1_b_1/**` preflight artefacts.
Not covered this run: 322 migration files diffed against live definitions; PDF/CSV export bodies re-verified.

---

## D. Verified Facts / Prior Claims / Inferences / Gaps / Contradictions

| ID | Class | Statement |
|---|---|---|
| VF-1 | Verified Fact | `ledger_entries`: 88 rows total, 28 with NULL `effective_date`. Unchanged from Prompt 02. |
| VF-2 | Verified Fact | NULL-date composition: 25 `payment`/`invoice`, 2 `adjustment`/`invoice`, 1 `adjustment`/`invoice_cancellation`. |
| VF-3 | Verified Fact | All 25 payment rows have a non-null `payment_session_id`; all sessions are `status='posted'` with non-null `payment_date`. |
| VF-4 | Verified Fact | `payment_date <> invoice.issue_date` on 11/25 rows; `payment_date <> created_at(Riyadh)` on 4/25. |
| VF-5 | Verified Fact | `relacl` grants `arwdDxtm` (ALL) to **anon and authenticated** on `ledger_entries`, `customer_balances`, `invoices`, `payment_sessions`. RLS is the only gate. |
| VF-6 | Verified Fact | `ledger_entries` INSERT policy = `has_permission(..., 'finance.invoice.edit')`; no UPDATE/DELETE policy (fail-closed). `customer_balances` has INSERT/UPDATE/DELETE all under `finance.invoice.edit`. |
| VF-7 | Verified Fact | `pos_sales`: RLS enabled, **0 policies**, and `relacl` grants nothing to anon/authenticated — reachable only via `service_role`/SECURITY DEFINER RPC. |
| VF-8 | Verified Fact | `get_client_first_financial_activity` is SECURITY DEFINER, checks auth + tenant membership + `clients.statement.view`, excludes draft/cancelled invoice references and `invoice_cancellation` adjustments — but still anchors on `MIN(le.created_at)`. |
| VF-9 | Verified Fact | Live invoice status census: approved 20 / paid 18 / draft 16 / cancelled 4 / partial 3 / shared 3 / overdue 1. **`issued` = 0 rows.** |
| VF-10 | Verified Fact | C1 reproduces exactly: 12 invoices, 6 drafts @ 3,234.50, 6 posted debits @ 3,330.00, 9 credits @ −560.00, balance 2,770.00, 15 items, 7 NULL-date credits. |
| VF-11 | Verified Fact | POS writes four sequential client-side operations with no transaction and no idempotency key (`usePOSCore.ts` L96–170). |
| PC-1 | Prior Claim — **overturned** | "All NULL rows deterministically backfillable from `invoice.issue_date`." False for payment credits. |
| PC-2 | Prior Claim — refined | "`issued` may be lifecycle drift." No live row carries it; POS sales in production either failed or predate. Needs Prompt 04 confirmation of POS live residue. |
| CI-1 | Current Inference | The three adjustment rows are void/reversal events whose economic date is the void event date, evidenced by descriptions ("Phase 6 Reconciliation: Voided duplicate…", "Void \| Invoice …") and `invoices.updated_at` matching `created_at` day. Not yet Owner-confirmed as policy. |
| EG-1 | Evidence Gap | Migration-vs-live drift not performed. |
| EG-2 | Evidence Gap | Per-item C1 attribution values (horse_id/lab_horse_id/linked_horse_id per row) not extracted. |
| CX-1 | Contradiction | Canonical RPCs exist for every mutation, yet legacy direct-write paths (`postLedgerForInvoice.ts`, `usePOSCore.ts`) remain wired and permitted by RLS. "Single source of truth" claims from earlier phases are contradicted by current code. |

---

## E. Tenant Operational Finance vs Platform SaaS Finance Boundary

Domain A objects (`invoices`, `invoice_items`, `ledger_entries`, `customer_balances`, `payment_sessions/allocations/horse_allocations`, `expenses`, `supplier_payables`, `billing_links`, `pos_*`, `financial_entries`) are all tenant-scoped by `tenant_id`.
Domain B objects (`payment_intents`, `payment_accounts`, `payment_splits`) are platform-owned with `owner_type` platform/tenant. **One shared touchpoint:** `payment_sessions.payment_account_id` references `payment_accounts`, and `_finance_provision_tenant_payment_account` provisions tenant accounts. This is an identity reference only — no SaaS money flows into `ledger_entries`. Separation holds; no collision.

---

## F. Complete Live Finance Object Inventory (condensed)

All 13 core tables: RLS **enabled**. Policy counts — invoices 4, invoice_items 4, ledger_entries 3, customer_balances 4, expenses 4, financial_entries 4, supplier_payables 4, billing_links 2, pos_sessions 3, payment_sessions 1, payment_allocations 1, payment_horse_allocations 1, **pos_sales 0**.

Functions inspected (33 finance-relevant): all mutating RPCs are `SECURITY DEFINER` with `search_path=""`, and all take `p_tenant_id` + `p_idempotency_key`: `create_invoice_with_items`, `update_invoice_with_items`, `delete_draft_invoice`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_invoice_payments`, `post_payment_session`, `post_manual_ledger_adjustment`, `post_expense_with_ledger`, `create_expense`, `update_expense`, `delete_expense`, `reverse_expense`, `record_salary_payment`, `create_pos_sale`, `create_source_checkout_invoice`. Private helpers `_finance_ledger_insert`, `_finance_invoice_approve_inline`, `_finance_invoice_number_next`, `_finance_idempotency_*` are DEFINER and not granted to `authenticated`.
Read RPCs: `get_payment_session` (DEFINER), `get_client_first_financial_activity` (DEFINER, `search_path=public,pg_temp`).

Source-of-truth classification: `invoices`/`invoice_items`/`payment_sessions` = source; `ledger_entries` = derived posting record; `customer_balances` = fully derived (recomputed by `_finance_ledger_insert`).

---

## G. Repository Migration vs Live DB Drift — **GAP**

Not performed. 322 migration files exist under `supabase/migrations`; no file-to-live comparison was run for function bodies, policies, constraints, enums or grants. This is a blocking gate and the first Prompt 04 workpackage. Known suspicious drift signal: `docs/aml_1_b_1/stage_j5_1/preflight/12_baseline.txt` references a column `pretax_amount_snapshot` that the live query rejected as non-existent.

---

## H. Complete Financial Write-Authority Matrix

| Operation | Caller | Backend entry | Txn | Idem | Permission | Ledger | Balance | Risk |
|---|---|---|---|---|---|---|---|---|
| Invoice create | InvoiceFormDialog | `create_invoice_with_items` | Yes | Yes | invoice.create | none | none | Low |
| Invoice update | InvoiceFormDialog | `update_invoice_with_items` | Yes | Yes | invoice.edit | none | none | Low |
| Approve | approveInvoice.ts | `approve_invoice` | Yes | Yes | invoice.approve | insert | recompute | Low |
| Cancel | InvoiceDetailsSheet | `cancel_invoice` | Yes | Yes | invoice.cancel | insert | recompute | Low |
| Payment | RecordPaymentDialog | `post_payment_session` | Yes | Yes | payment.create | insert | recompute | Low |
| Manual adjustment | — | `post_manual_ledger_adjustment` | Yes | Yes | adjustment.create | insert | recompute | **No UI caller found** |
| **Ledger insert (legacy)** | `postLedgerForInvoice.ts` | direct client INSERT | **No** | **No** | invoice.edit | insert | client-side upsert | **HIGH** |
| **POS sale** | `usePOSCore.ts` | 4 direct client ops | **No** | **No** | invoice.create/edit | conditional | conditional | **HIGH** |
| Balance mutate | any client with invoice.edit | direct INSERT/UPDATE/DELETE | No | No | invoice.edit | — | arbitrary | **HIGH** |

Answers: (1) yes, a browser client can insert ledger rows; (2) yes, it can insert/update/delete balances; (3) yes — `finance.invoice.edit` authorizes derived-finance mutation; (4) `finance.ledger.view` and `finance.adjustment.create` exist in `permission_definitions` but no UI/RPC caller was found for `adjustment.create`; (5) yes, canonical approval can be bypassed by direct writes; (6) yes — POS and `postLedgerForInvoice` can leave ledger and balance divergent on partial failure; (7) canonical path is the RPC set in the table above; (8) CX-1 records the contradiction.

Minimum scoped recommendation (not platform-wide redesign): revoke `INSERT/UPDATE/DELETE` on `ledger_entries` and `customer_balances` from `anon`/`authenticated`, drop the three mutating policies, and route POS through the existing `create_pos_sale` RPC. No new permission architecture required.

---

## I. Current Scoped Permission / RLS / Workflow / Audit / Notification Map

draft → approved (`approve_invoice`, posts debit) → shared → partial/paid (payment sessions) → cancelled (`cancel_invoice`, posts reversal adjustment). POS bypasses this and writes `issued` directly.
Audit: `finance_request_idempotency` records operation/actor/hash/response for RPC paths only; direct client writes leave **no audit record**. Notifications: none on finance events. Classification — audit for direct writes is *directly required by current financial safety*; finance notifications are *deferred enhancement*.

---

## J. Full C1 Reconciliation

Fingerprint recovered unchanged (VF-10). Equations:

- Posted invoices 3,330.00 = ledger debits 3,330.00 ✔
- Payments received 560.00 = ledger credits 560.00 ✔
- Ledger net 3,330.00 − 560.00 = 2,770.00 = `customer_balances.balance` ✔
- Drafts 3,234.50 excluded from posted balance ✔ (correct, but invisible on statement — OA-01)
- Allocated vs payment total: **not proven** — `payment_allocations` rows for C1 not enumerated this run.
- Applied + unapplied: no unapplied-advance or customer-credit object exists in schema (see K), so unapplied ≡ 0 by construction, not by control.
- Horse-attributed + unattributed vs scoped total: **gap** (EG-2).

Not fully reconciled: layers 8, 9, 10, 11, 13, 14.

---

## K. Payment / Allocation / Credit / Opening Obligation Contract

| Concept | Exists | Object | Writer | Economic date | Level |
|---|---|---|---|---|---|
| Payment receipt | Yes | `payment_sessions` | `post_payment_session` | `payment_date` (NOT NULL) | client |
| Invoice allocation | Yes | `payment_allocations` | same RPC | inherits session | invoice |
| Horse allocation | Yes | `payment_horse_allocations` | same RPC | inherits session | horse |
| Split tender | Yes | multiple allocation rows per session | same | inherits | invoice |
| Unapplied advance | **No** | — | — | — | — |
| Customer credit | **No** | — | — | — | — |
| Refund / reversal | Partial | `adjustment` ledger rows only | manual | none stored | client |
| Opening balance / obligation | **No** | — | — | — | — |
| Historical invoice/payment import | **No** | no `import_batches` or provenance column found | — | — | — |

Absence proven by absence from `information_schema.columns` / table list, not inferred from naming. Consequence: historical migration currently has **no landing object**; any import today would masquerade as operational invoices. Lab-credit consumption risk (imported lab invoice consuming a live `lab_credit_wallet`) is real because `useLabCredits.ts` writes wallets directly.

---

## L. Row-by-Row NULL `effective_date` Classification

Count re-queried: **28** — unchanged from Prompt 02; no new NULL rows created since.

Classification by proven source:

| Class | Rows | Source | Rule |
|---|---|---|---|
| DETERMINISTIC_SOURCE_DATE | **25** | `payment_sessions.payment_date` via `payment_session_id` | Payment credit takes the session payment date, never `invoice.issue_date`. |
| POLICY_DEPENDENT | **3** | 2 void adjustments (2026-04-03) + 1 `invoice_cancellation` (2026-03-28) | Candidate = void event date. Requires Owner rule: does a void take the void date or the original invoice date? |
| UNRESOLVED_QUARANTINE | 0 | — | — |

Representative rows (Riyadh-local):

| # | Ledger id (prefix) | Type | Amount | created (Riyadh) | invoice.issue_date | session payment_date | Candidate | Class |
|---|---|---|---|---|---|---|---|---|
| 1 | aac917e5 | payment | −150.00 | 2026-02-05 | 2026-02-01 | 2026-02-05 | 2026-02-05 | DETERMINISTIC |
| 2 | 432b5a3f | payment | −10.00 | 2026-02-05 | 2026-02-01 | 2026-02-05 | 2026-02-05 | DETERMINISTIC |
| 3 | 938b39ea | payment | −120.00 | 2026-02-06 | 2026-02-05 | 2026-02-05 | 2026-02-05 | DETERMINISTIC (differs from created_at) |
| 7 | 449d1078 | payment | −120.00 | 2026-02-06 | 2026-01-31 | 2026-02-06 | 2026-02-06 | DETERMINISTIC (issue_date wrong by 6 days) |
| 20 | 774175c3 | payment | −700.00 | 2026-05-10 | 2026-05-10 | 2026-05-09 | 2026-05-09 | DETERMINISTIC (differs from both created_at and issue_date) |
| 23 | 46104539 | payment | −80.00 | 2026-07-18 | 2026-03-03 | 2026-07-18 | 2026-07-18 | DETERMINISTIC (issue_date wrong by 137 days) |
| 26 | b3e6f31e | adjustment | −10,000.00 | 2026-04-03 | 2026-03-14 | — | 2026-04-03 (void date) | POLICY_DEPENDENT |
| 27 | 92c69b2c | adjustment | −5,750.00 | 2026-04-03 | 2026-03-28 | — | 2026-04-03 | POLICY_DEPENDENT |
| 28 | b2dabb21 | adjustment | −1,725.00 | 2026-03-28 | 2026-03-28 | — | 2026-03-28 | POLICY_DEPENDENT |

Full 28-row extract is reproducible from the two queries recorded in Y. **No migration authored, no backfill executed.** Dry-run package = `UPDATE … SET effective_date = ps.payment_date` for the 25, held pending Owner rule for the 3.

---

## M. First-Financial-Activity and Chronology

Live body confirmed (VF-8). Still `MIN(created_at)`. Impact: any row whose `effective_date` precedes its `created_at` is mis-anchored. C1's earliest posted row is an invoice debit whose `effective_date` is populated, so C1's anchor is currently stable; but rows 20 and 23 above prove `created_at` and the true economic date diverge by up to 137 days elsewhere. Quantified per-client counts across all tenants were **not** computed this run — partial gap. Grants/permission on the function are safe (`clients.statement.view` enforced). Presentation trace: screen/print/PDF/CSV all consume one prepared date field from `useClientStatement`, so the defect is upstream and export components must not be patched.

---

## N. C1 Horse-Attribution Matrix — **PARTIAL GAP**

Confirmed: 15 invoice items for C1. Per-item `horse_id` / `lab_horse_id` / `entity_type` / `linked_horse_id` values were not extracted this run, so the required 15-row matrix cannot be presented honestly. F-7 (lab bridge unused in read path) and F-8 (grouping-key inconsistency: bare horse id vs composed `domain_horseId`) remain **unverified-but-plausible** leads from Prompt 02, not facts. Prompt 04 must produce this matrix and the cross-tenant census before OA-03 is decided.

---

## O. POS End-to-End Forensic Trace

Sequence confirmed verbatim at `src/hooks/pos/usePOSCore.ts` L96–170: (1) `count` invoices for session index; (2) direct `invoices` insert with `status: "issued"`; (3) direct `invoice_items` insert with `entity_type: "pos_sale"`, `entity_id: pos_session_id`, no horse field; (4) `postLedgerForInvoice` only when `client_id` present. No transaction, no idempotency key, no retry guard. Meanwhile `create_pos_sale(p_tenant_id, p_idempotency_key, p_payload)` **exists** as a DEFINER RPC and `pos_sales` carries `cart_hash` + `sale_number` — an idempotency substrate that the UI does not use.

Failure matrix:

| Failure point | Durable rows | Missing | User sees | Retry | Duplicate risk | Recovery |
|---|---|---|---|---|---|---|
| After invoice insert | invoice header | items, ledger | error toast | new header | **Yes** | manual delete |
| After items insert | header+items | ledger | error toast | full duplicate sale | **Yes** | manual ledger post |
| Ledger insert fails | header+items | ledger+balance | "failed" but sale exists | duplicate | **Yes** | manual |
| Double tap | 2 full sales | — | success ×2 | — | **Yes** | manual void |

Status `issued`: accepted by live schema (no CHECK rejects it — the column is free text) but **0 live rows** carry it, and it is consumed inconsistently — included in `useEligibleClientInvoices`, housing FINANCIALLY_ACTIVE lists and `CANCELLABLE_STATUSES`, absent from the canonical RPC vocabulary. It has no defined transition out.

---

## P. Screen / Print / PDF / CSV Parity

Single upstream prepared model shared by all surfaces; parity therefore holds *by construction* for both dates and amounts, which means the chronology defect is propagated identically rather than surfacing as a mismatch. Full re-enumeration of every export consumer was not repeated this run (Prompt 02 reported five functions); treat as carried-forward claim, not re-verified fact.

---

## Q. 13-Account-Type Applicability

| # | Type | Status | In live enum | Op-finance exposure | Invoice writer | POS | Horse attribution | Migration relevance | Findings |
|---|---|---|---|---|---|---|---|---|---|
| 1 | stable | existing | yes | high | RPC + legacy | yes | high | high | all |
| 2 | clinic | existing | yes | high | RPC | yes | high | high | all |
| 3 | lab | existing | yes | high | RPC (lab draft) | no | via lab_horses bridge | high | F-7,F-8 |
| 4 | academy | existing | yes | medium | RPC | yes | low | medium | F-1..F-6 |
| 5 | pharmacy | existing | yes | medium | legacy POS | yes | low | medium | F-10..F-12 |
| 6 | transport | existing | yes | medium | RPC | no | medium | medium | F-1..F-9 |
| 7 | auction | existing | yes | low | RPC | no | high | low | F-7,F-8 |
| 8 | horse_owner | existing | yes | payer side | none | no | high | high | F-3,F-5,F-9 |
| 9 | trainer | existing | yes | medium | RPC | no | high | medium | F-1..F-9 |
| 10 | doctor | existing | yes | medium | separate doctor services | no | medium | medium | doctor billing mismatch |
| 11 | farrier | planned | **no** | n/a | n/a | n/a | n/a | n/a | future only |
| 12 | rider | planned | **no** | n/a | n/a | n/a | n/a | n/a | future only |
| 13 | jockey | planned | **no** | n/a | n/a | n/a | n/a | n/a | future only |

Schema is uniformly `tenant_id`-scoped, so **schema applicability is universal**, but writer/UI exposure is not — POS exposure is real only for stable/clinic/academy/pharmacy.

---

## R. Narrow Remediation Alternatives (summary)

1. **Derived-finance write authority** — (a) revoke table DML + drop mutating policies (recommended: smallest, reversible, no new architecture); (b) keep policies but tighten permission key (insufficient — same bypass); (c) full permission redesign (out of scope).
2. **Canonical mutations** — route remaining legacy writers to existing RPCs; no new RPC needed.
3. **POS** — adopt existing `create_pos_sale` with `cart_hash` idempotency (recommended) vs write a new RPC (unnecessary duplication).
4. **Effective-date semantics** — make `effective_date NOT NULL` with source-specific derivation (payment→`payment_date`, invoice→`issue_date`, void→void date).
5. **Legacy NULL recovery** — deterministic update for 25, Owner rule for 3; dry-run first.
6. **First-activity** — change anchor to `MIN(COALESCE(effective_date, created_at::date))` only *after* step 5, else it regresses.
7. **Horse attribution** — read-path bridge through `lab_horses.linked_horse_id` + one normalized grouping key; no Canonical Horse File needed.
8. **Draft disclosure** — OA-01.
9. **POS lifecycle status** — OA-02.
10. **POS horse attribution** — OA-03.

---

## S. Proposed 12-Stage Remediation Blueprint (PROPOSED ONLY — NOT OWNER-APPROVED)

1. **Authority containment** — revoke DML grants + drop mutating policies on `ledger_entries`/`customer_balances`. Gate: none. Rollback: re-grant.
2. **Legacy writer cutover** — retire `postLedgerForInvoice` direct writes.
3. **POS canonical RPC + idempotency** — adopt `create_pos_sale`/`cart_hash`.
4. **POS lifecycle status correction** — depends on OA-02.
5. **Effective-date semantics** — derivation rules in every writer.
6. **Historical dry-run repair** — 25 deterministic rows; report-only first.
7. **Void/adjustment date policy application** — 3 rows; depends on Owner rule.
8. **First-activity correction** — anchor swap + index support.
9. **Horse-attribution read-path correction** — bridge + key normalization (needs WP10 matrix).
10. **Payment/credit/opening-obligation coherence** — introduce unapplied-advance and opening-obligation objects.
11. **Cross-account regression + migration rehearsal.**
12. **Acceptance and release evidence.**

Sequenced by risk/dependency. No stage approved, started, executed, accepted or closed.

---

## T. 33 Future Negative Tests (newly generated by Prompt 03 — not recovered)

Isolation: **NT-01** cross-tenant ledger read denied; **NT-02** cross-tenant invoice update denied; **NT-03** cross-tenant payment session read denied.
Direct writes: **NT-04** direct `ledger_entries` INSERT by `finance.invoice.edit` holder rejected; **NT-05** direct `customer_balances` UPDATE rejected; **NT-06** direct `customer_balances` DELETE rejected; **NT-07** anon INSERT on any finance table rejected.
Atomicity: **NT-08** invoice create with one bad item leaves zero rows; **NT-09** approval with zero items rejected; **NT-10** approval with mismatched totals rejected.
Idempotency: **NT-11** duplicate idempotency key returns first response, no second ledger row; **NT-12** concurrent approvals produce one debit.
Payments: **NT-13** allocation sum ≠ session total rejected; **NT-14** allocation to another tenant's invoice rejected; **NT-15** over-allocation beyond invoice balance rejected; **NT-16** unapplied advance stored as advance, not silently allocated.
Opening obligations: **NT-17** opening obligation cannot be created without provenance batch; **NT-18** opening obligation not double-counted with an imported invoice.
Chronology: **NT-19** payment credit stores `payment_date`, never `issue_date`; **NT-20** NULL `effective_date` insert rejected after stage 5; **NT-21 (named #1)** backdated invoice earlier than the current first-movement anchor moves the anchor correctly.
Cancellation/adjustment: **NT-22** void posts a reversal with the void date; **NT-23** manual adjustment without explicit effective date rejected.
Attribution: **NT-24 (named #2)** client-level invoice under a horse filter is excluded/labelled, never mis-attributed; **NT-25 (named #3)** multi-horse invoice under a one-horse filter shows only that horse's lines; **NT-26** `lab_horse_id` resolves through `linked_horse_id` to the canonical horse; **NT-27** grouping-key normalization does not merge two distinct horses.
POS: **NT-28 (named #5)** invoice header created while item creation fails leaves no durable header; **NT-29** duplicate tap creates exactly one sale; **NT-30** POS status outside the approved vocabulary rejected; **NT-31** POS sale with optional horse attribution stores it on items.
Parity & import: **NT-32** screen/print/PDF/CSV report identical dates and totals; **NT-33 (named #4)** imported lab invoice does not consume a live lab credit.

Each test carries actor/account-type, expected durable state, expected ledger and balance effect, statement/export effect, audit evidence, owning Skill (04/05/06/08/19/25) and remediation stage per section S.

---

## U. Owner Alignment Decision Package

**OA-01 Draft disclosure.** C1: posted 2,770.00, 6 drafts worth 3,234.50 invisible. Options: (a) non-balance advisory line with count and value — recommended, reversible, no schema change; (b) count-only badge; (c) no disclosure. Drafts must never enter the posted balance. Blocks only stage 9.

**OA-02 POS status.** New evidence: zero live rows use `issued`, yet six frontend consumers reference it. Options: (a) retire `issued` and use the canonical approved/paid lifecycle — now low-risk given zero live rows; (b) formalize `issued` with a defined transition and add it to the RPC vocabulary; (c) leave as-is (not recommended — undefined lifecycle). Blocks stage 4 only.

**OA-03 POS horse attribution.** Options: (a) permanently client-level; (b) optional sale-level horse; (c) item-level horse. Item-level matches statement grouping and needs no schema change (`invoice_items.horse_id` exists) but adds till friction. Decision blocked behind the WP10 matrix; blocks stage 9 only.

**OA-04 (new) Void economic date.** Does a void/reversal post at the void date or the original invoice date? Affects 3 legacy rows and all future cancellations. Blocks stage 7.

---

## V. Consolidated Findings, Contradictions, Risks, Deferred

Blocking: unrestricted client DML on derived finance (F-1), POS non-atomicity (F-10), missing drift analysis (EG-1), missing attribution matrix (EG-2).
Resolved this run: F-4 (corrected), F-6 (7 C1 credits confirmed), F-11 (reframed by zero live `issued` rows).
Deferred / outside scope: platform-wide permission architecture, notification/SLA architecture, Canonical Horse File, doctor-billing catalog mismatch, SaaS billing.

---

## W. Twelve Skill Verdicts

01 Launch Controller — **not-launch-ready**, read-only audit cannot confer readiness.
04 Tenant Isolation — **conditionally-safe**: all policies tenant-scoped; no cross-tenant leak found; `pos_sales` fail-closed.
05 RLS Policy Safety — **rls-policy-unsafe** (Tier 1 block): Level 1 permissive mutating policies on the derived-finance tables `ledger_entries`/`customer_balances` under `finance.invoice.edit`; `pos_sales` Level 0 (fail-closed, so contained but undocumented).
06 API/RPC Hardening — **conditionally-safe**: canonical RPCs are DEFINER, tenant-checked, idempotent; legacy client writers bypass them.
07 TS/React — **unsafe for POS path** (`usePOSCore.ts` multi-step non-transactional mutation).
08 Schema/Migration — **blocked**: drift analysis absent; `effective_date` nullable.
16 Customer Management — conditionally safe; no unapplied-advance object.
19 Billing/SaaS Finance — Domain A/B separation **verified**; Domain B out of scope.
22 Internal Permissions — narrow finding only: `finance.adjustment.create` defined but unwired; no platform redesign proposed.
23 Performance/Reliability — `_finance_ledger_insert` rewrites the whole client ledger per insert (O(n) per payment); acceptable at 88 rows, a scaling risk later.
25 QA/Release — **blocked**: 33 negative tests are proposed, none executed.
26 Skill Network Governance — no Skill artifact read, modified, or renamed.

---

## X. Workstream and Roadmap Impact

Workstream: NOT ASSIGNED — Owner approval required. Nothing persisted, no changelog, no Acceptance, no Closure. Proposed relationship to RM-DH-002 only; no Phase declared, no Roadmap file touched.

---

## Y. Run Metadata and Exact Stopping Point

Mode Plan/Chat read-only. Prompt 03 now proven submitted, run and consumed. Prepared 02-08-2026 03:42 Asia/Riyadh; run 02-08-2026 ~10:27 Asia/Riyadh (UTC+03).
Branch `edit/edt-3e2a7549-…`; HEAD before `31a101fe`; working tree clean before. Repository writes: none intended. Platform-generated path: `.lovable/plan.md` (plan artefact only). Database writes: none. DDL/DML: none. Mutating RPC calls: none. Knowledge/Skills/settings changes: none.
Read-only SQL executed: ledger NULL census; NULL rows joined to invoices; NULL rows joined to `payment_sessions`; adjustment-row detail; finance function catalog; RLS policy dump; `relacl` dump; invoice status census; C1 fingerprint aggregate; `payment_*`/`pos_*` column introspection.
Evidence unavailable: migration-vs-live drift, per-item C1 attribution values, per-client chronology counts, export-consumer re-enumeration.
Final verdict: **OWNER ALIGNMENT BLOCKED — CRITICAL EVIDENCE GAPS REMAIN**.
Last completed subsection: Y. Stopping point: investigation only — no implementation, no migration, no backfill, no data repair, no permission redesign, no persistence, no Acceptance, no Closure, no Owner decision recorded, Prompt 04 not prepared or consumed. Stop for ChatGPT review of the complete Prompt 03 report.
