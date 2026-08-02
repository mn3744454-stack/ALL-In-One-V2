# LOVABLE-TARGETED-CURRENT-STATE-REAUDIT-L1
Parent: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-...-AUDIT-04
Mode: Plan/Chat — Read-Only Investigation. Targeted current-state re-audit.

## A. Executive Verdict

**BLOCKED BY SPECIFIC CURRENT-STATE GAPS**

- Zero import infrastructure exists: no staging, batch, provenance, quarantine, fingerprint, dry-run, reconciliation, rollback, opening-obligation, or unapplied-credit object in repository or live database (verified).
- The Account Statement reads, filters, sorts and computes running balance from `ledger_entries.created_at`, not `effective_date` — documented explicitly in `src/lib/finance/effectiveDate.ts`. A 2017 invoice imported in 2026 would display in 2026 (verified).
- `effective_date` exists and is populated by the server-side ledger writer, but 28 of 88 live ledger rows are NULL, and 23 rows already disagree with their creation date — so the economic-date column is real but not yet authoritative (verified).
- A canonical atomic server-side invoice writer exists (`create_invoice_with_items`, `_finance_ledger_insert`, `post_payment_session`) and is import-shaped, so import does not need a new writer from scratch (verified).
- Legacy client-side writers are still wired and bypass it: `postLedgerForInvoice.ts` inserts ledger rows and upserts `customer_balances` from the browser with a read-then-write balance; `usePOSCore.ts` inserts invoice header and items in two separate non-atomic statements (verified).
- Payment allocation model is correct for the multi-invoice scenario: `payment_sessions` → `payment_allocations` → `payment_horse_allocations` (29 live sessions), one payment to many invoices, not split tender (verified).
- Unapplied customer credit and opening obligations have **no truthful representation** — `ledger_entries.entry_type` observed values are only invoice, payment, adjustment (verified).
- Tenant ownership integrity is currently sound in data (`owner_id` NOT NULL, 0 NULL, 0 tenants without an owner membership), but creation is a two-step client sequence with a best-effort delete rollback, not a transaction (verified).
- Tenant/tenant_members RLS is coherent and non-recursive; `tenants` INSERT is `WITH CHECK (true)` with no `owner_id = auth.uid()` binding, so `owner_id` is application-supplied only (verified). Not an import blocker.
- Lab credit consumption is not a live risk today: `lab_credit_wallets` has 0 rows (verified) — but the coupling must be checked before importing lab history.

## B. Current-State Evidence Summary

| Area | Verified current fact | Repository evidence | Live DB evidence | Confidence | Practical meaning |
|---|---|---|---|---|---|
| Tenant creation | Two-step client sequence: insert `tenants`, then insert `tenant_members` role owner; on member failure the client deletes the tenant | `src/contexts/TenantContext.tsx` `createTenant`, lines 369–428 | `tenants.owner_id` NOT NULL, no default | High | Non-atomic; a network loss between steps can leave an orphan tenant, though none exist today |
| Tenant ownership | `owner_id` supplied by the client from `auth.getUser()`; not trigger-bound | `TenantContext.tsx` line 380 | 0 tenants with NULL `owner_id`; 0 tenants lacking an owner membership | High | Data is clean; binding is by convention, not enforcement |
| Tenant/member RLS | 4 policies on `tenants`, 5 on `tenant_members`; helpers `is_tenant_member`, `has_tenant_role` | — | `pg_policies` (full expressions in section C) | High | Coherent, non-recursive; INSERT on `tenants` is unrestricted for authenticated users |
| Financial write authority | Canonical RPCs coexist with legacy browser-direct writers | `src/lib/finance/invoiceRpc.ts`, `postPaymentSession.ts` vs `postLedgerForInvoice.ts`, `hooks/pos/usePOSCore.ts`, `hooks/billing/useBillingLinks.ts` | `_finance_ledger_insert`, `create_invoice_with_items`, `post_payment_session` present | High | Import can reuse the RPC layer, but legacy paths must not be used by the importer |
| Economic dates | `effective_date` exists on `ledger_entries`; statement uses `created_at` | `src/lib/finance/effectiveDate.ts` (explicit contract), `useClientStatement.ts` lines 49–101 | 28 of 88 NULL; 23 rows differ from Riyadh creation date | High | Backdated history would not display economically |
| Import infrastructure | Absent | No match for import/staging/quarantine/opening/provenance in `src/` or `supabase/` | No `%import%`, `%stag%`, `%opening%` table in `public` | High | Nothing to reuse; a landing layer must be built |

## C. Current RLS State — tenants and tenant_members

| Table | Policy | Cmd | Roles | USING | WITH CHECK | Helpers | SECDEF | Practical meaning | Risk |
|---|---|---|---|---|---|---|---|---|---|
| tenants | Authenticated users can create tenants | INSERT | authenticated | — | `true` | none | n/a | Any authenticated user may insert any tenant row, including an arbitrary `owner_id` | `owner_id` not bound to `auth.uid()` at the policy layer |
| tenants | Members can view their tenants | SELECT | authenticated | `is_tenant_member(auth.uid(), id)` | — | `is_tenant_member` | yes | Members read their own tenants | none observed |
| tenants | Owners can view their own tenants | SELECT | authenticated | `owner_id = auth.uid()` | — | none | n/a | Creator reads own tenant before membership exists | none observed |
| tenants | Owners can update their tenants | UPDATE | authenticated | `has_tenant_role(auth.uid(), id, 'owner')` | `has_tenant_role(auth.uid(), id, 'owner') AND owner_id = (SELECT t.owner_id FROM tenants t WHERE t.id = tenants.id)` | `has_tenant_role` | yes | Owners update, `owner_id` frozen | none observed |
| tenant_members | Members can view tenant members | SELECT | authenticated | `is_tenant_member(auth.uid(), tenant_id)` | — | `is_tenant_member` | yes | Members see co-members | none observed |
| tenant_members | Owners can add themselves as owner member | INSERT | authenticated | — | `user_id = auth.uid() AND role = 'owner' AND EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_members.tenant_id AND t.owner_id = auth.uid())` | none | n/a | Bootstrap owner membership only for a tenant already owned | none observed |
| tenant_members | Users can join via invitation | INSERT | authenticated | — | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM invitations inv WHERE inv.tenant_id = tenant_members.tenant_id AND inv.proposed_role = tenant_members.role AND inv.status = 'pending' AND (inv.invitee_id = auth.uid() OR inv.invitee_email = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid())))` | none | n/a | Self-join bound to a pending invitation with matching role | none observed |
| tenant_members | Owners can update tenant members | UPDATE | authenticated | `has_tenant_role(auth.uid(), tenant_id, 'owner')` | — | `has_tenant_role` | yes | Owner-only member updates | no WITH CHECK; constrained by `enforce_tenant_member_immutability` trigger |
| tenant_members | Owners can delete tenant members | DELETE | authenticated | `has_tenant_role(auth.uid(), tenant_id, 'owner')` | — | `has_tenant_role` | yes | Owner-only removal | none observed |

Triggers on `tenants`: `enforce_tenant_limit` (`check_tenant_limit`, SECDEF), `on_tenant_created_seed_roles` (`seed_tenant_roles`, SECDEF), `trg_provision_stable_local_record_permissions_ins/_upd` (SECDEF), `trg_tenants_provision_payment_account` (`_finance_provision_tenant_payment_account`, SECDEF), `update_tenants_updated_at`. None writes `owner_id`.

Triggers on `tenant_members`: `enforce_tenant_member_immutability_trigger`, `trg_audit_tenant_members_role` (SECDEF), `update_tenant_members_updated_at`.

No recursion or circular policy dependency observed. Repository/live divergence: none detected for these two tables.

## D. Financial Write Authority

| Object | Current writer | Atomic? | Client-direct write? | Import-safe? | Evidence | Required correction |
|---|---|---|---|---|---|---|
| invoices | `create_invoice_with_items` / `update_invoice_with_items` / `create_source_checkout_invoice` RPCs; POS writes directly | RPC yes, POS no | Yes (POS) | RPC path yes, POS path no | `src/lib/finance/invoiceRpc.ts`; `src/hooks/pos/usePOSCore.ts` lines 116–160 | Importer must use the RPC path only; no backdating parameter exists yet |
| invoice_items | Same RPCs; POS inserts separately after the header | RPC yes, POS no | Yes (POS) | RPC path yes | `usePOSCore.ts` line 156 | Same |
| ledger_entries | `_finance_ledger_insert` (SECDEF, advisory-locked, recomputes running balance); legacy `postLedgerForInvoice.ts` inserts directly | RPC yes, legacy no | Yes (legacy) | RPC path yes | `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt`; `src/lib/finance/postLedgerForInvoice.ts` | Importer must call the RPC; legacy read-then-write balance is race-prone |
| payment_sessions | `post_payment_session` RPC | Yes | Not observed | Yes | `src/lib/finance/postPaymentSession.ts` | None for import |
| payment_allocations | Same RPC | Yes | Not observed | Yes | same | Needs an import-provenance field; `external_reference` exists |
| payment_horse_allocations | Same RPC | Yes | Not observed | Yes | same | None |
| customer_balances | `_finance_ledger_insert` upsert; legacy client upsert | RPC yes, legacy no | Yes (legacy) | Derived server-side on the RPC path | `postLedgerForInvoice.ts` upsert block | Never write directly during import |
| billing_links | `_finance_billing_link_upsert`; client insert in `useBillingLinks.ts` | RPC yes | Yes | Partially | `src/hooks/billing/useBillingLinks.ts` line 68 | Import should use the RPC helper |

Retry duplication: `finance_request_idempotency` protects RPC calls keyed by tenant/operation/idempotency key (`_finance_idempotency_begin`), so a retried identical RPC is a replay. There is **no row-level fingerprint** tying a source file row to a created record, so a re-run of the same source file with new keys would duplicate.

## E. Economic Date Integrity

- Does `ledger_entries.effective_date` exist? **Yes** (Fact — used in `_finance_ledger_insert`, ordering key of the running-balance loop).
- Nullable? **Yes** (Fact — 28 rows are NULL).
- Rows with NULL: **28 of 88** (Fact).
- Populated by: `_finance_ledger_insert` (required argument, raises `FIN_LEDGER_INSERT_BAD_ARGS` if NULL), therefore every RPC-mediated posting (`create_invoice_with_items` → `approve_invoice`, `post_payment_session`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`).
- Not populated by: the legacy client writer `src/lib/finance/postLedgerForInvoice.ts`, which omits `effective_date` from its insert payload (Fact) — this is the source of the 28 NULL rows.
- Statement behaviour: `useClientStatement.ts` selects `created_at`, filters `gte/lte` on `created_at`, orders by `created_at`, and maps `date: e.created_at`; `src/lib/finance/effectiveDate.ts` states the canonical contract is `effectiveDate(row) = ledger_entries.created_at` for filtering, display, running balance, sorting, First Financial Activity, and every export. **The statement does not use `effective_date`** (Fact).
- Scenario (issue 20-02-2017, imported 03-08-2026): the ledger row would carry `effective_date = 2017-02-20` and `created_at = 2026-08-03`. The running balance inside `_finance_ledger_insert` would order it correctly in 2017, but the statement, its date filter, its exports and its First Financial Activity would place it in August 2026 (Inference from the two verified facts above). **Economically wrong on every read surface.**
- Prerequisites before import: (1) cut the statement read path over from `created_at` to `effective_date`; (2) backfill the 28 NULL rows; (3) retire or fence the legacy writer so no new NULLs appear; (4) confirm the 23 rows where `effective_date` already differs from creation date are intentional before treating either column as truth.

## F. Existing Import Infrastructure

| Concept | Status |
|---|---|
| Import batches | **Absent** |
| Source files / source rows | **Absent** |
| Staging layer | **Absent** |
| Quarantine | **Absent** |
| Provenance on financial rows | **Absent** (only `payment_allocations.external_reference`, a free-text field — partially reusable) |
| Duplicate fingerprints | **Absent** at row level; `finance_request_idempotency` is **partially reusable** at call level |
| Dry run | **Absent** |
| Reconciliation | **Absent** |
| Rollback | **Absent** for import; `cancel_invoice` and `post_manual_ledger_adjustment` are **partially reusable** as compensating mechanisms |
| Opening obligations | **Absent** |
| Unapplied customer credit | **Absent** as a first-class concept |
| Historical/imported record status | **Absent**; `invoices_status_check` has no imported/historical value |

Answers:
- Safe landing/staging layer today? **No.**
- Can source files be preserved and linked to results? **No** — no storage bucket, table, or column exists for this.
- Retry without duplication? **Only within the 7-day RPC idempotency window with the same key.** Not for file re-runs.
- Roll back one imported document without touching unrelated records? **No** — no batch or document grouping exists.
- Quarantine ambiguous matches? **No.**
- Full invoices coexisting with an opening obligation without double counting? **No** — no opening-obligation entry type, so the two cannot be distinguished in the balance.
- Unapplied credit without a fake invoice or unexplained adjustment? **No** — only `adjustment` is available, which carries no semantic meaning on the statement.
- Could imported lab history trigger live Lab Credit consumption? **Unverified coupling, zero live exposure** — `lab_credit_wallets` has 0 rows and `lab_credit_transactions` is driven by lab request flows, not by invoice import; a lab-history importer that replays lab request creation rather than writing invoices directly would be at risk. Must be confirmed before any lab import.

### Scenario results

1. **Historical invoice (2017 → 2026):** economic date storable, display date wrong (2026), numbering would consume a current-series number via `_finance_invoice_number_next` unless the source number is preserved, ledger posts correctly by `effective_date`, statement shows it in 2026, duplicate risk high on file re-run, no provenance. **Not import-ready.**
2. **One payment, two allocations:** correctly modelled — one `payment_sessions` row with two `payment_allocations` rows. This is allocation, not split tender (split tender would be multiple tenders inside one session). **Supported.**
3. **Unapplied credit 2,000 of 5,000:** the 3,000 allocates cleanly; the 2,000 remainder has no truthful representation. It would land as an unexplained `adjustment` or as an over-payment with no label. **Not supported.**
4. **Opening obligation 12,400 at 31-12-2025:** would require a synthetic invoice today. **Not supported.**
5. **Mixed PDF with sections:** no section-level or row-level staging or classification model exists. **Not supported.**
6. **Client is a stable, horse owner is an individual:** the data model does separate these — `clients` (billing party), `horses.owner_id`/`horse_owners`, and `party_horse_links` for many-to-many roles. Identities are preserved structurally. There is no import matching flow at all, so the risk is that a future importer conflates them; the model itself does not force it. **Model supported, flow absent.**

## C. Specific Blockers

| ID | Blocker | Why it blocks Historical Import | Evidence | Owner decision? | Technical correction? |
|---|---|---|---|---|---|
| BL-1 | Statement reads `created_at`, not `effective_date` | Every imported historical record would display in the import month; statements, exports and First Financial Activity would be economically false | `src/lib/finance/effectiveDate.ts`; `useClientStatement.ts` 49–101 | No | Yes — read-path cutover |
| BL-2 | 28 of 88 ledger rows have NULL `effective_date` | The economic-date column cannot become the sort/filter key while a third of rows are NULL | Live count | No | Yes — backfill |
| BL-3 | Legacy client-side ledger writer still wired | Keeps producing NULL `effective_date` rows and race-prone balances; also a tempting shortcut for an importer | `src/lib/finance/postLedgerForInvoice.ts` | No | Yes — fence or retire |
| BL-4 | No provenance / batch identity on financial rows | Imported rows are indistinguishable from operational rows; no selective rollback, no reconciliation | No such column on `invoices`, `ledger_entries` | No | Yes |
| BL-5 | No opening-obligation or unapplied-credit representation | Scenarios 3 and 4 cannot be imported truthfully | `ledger_entries.entry_type` observed: invoice, payment, adjustment | Yes — owner must choose the representation | Yes |
| BL-6 | No row-level idempotency fingerprint | A re-run of the same source file duplicates financial history | `finance_request_idempotency` is call-keyed only | No | Yes |
| BL-7 | No staging / quarantine layer | Ambiguous client/horse/invoice matches would either be silently guessed or abort the batch | Absent in repo and DB | Yes — owner must accept a review queue | Yes |
| BL-8 | Invoice numbering on backdated documents | Importing a 2017 invoice either consumes a 2026 series number or must preserve the source number, changing uniqueness assumptions | `_finance_invoice_number_next`; `invoices_tenant_id_invoice_number_key` | Yes | Yes |
| BL-9 | POS writes invoice header and items non-atomically | If the importer reuses POS-shaped code it inherits partial-write risk | `usePOSCore.ts` 116–160 | No | Avoid; do not reuse this path |

Not blockers for import (noted, excluded): `tenants` INSERT policy has no `owner_id = auth.uid()` binding; tenant creation is non-atomic. Data is currently clean (0 orphans, 0 NULL owners).

## D. Owner Decisions Required

**OD-1 — How should a customer's pre-Dayli balance be represented when no invoice detail exists?**
Example: a stable client owes 12,400 SAR at 31-12-2025 from an Excel sheet with no invoice list.
- A: A dedicated opening-obligation ledger entry type, not revenue, shown as "Opening balance" on the statement.
- B: A synthetic invoice numbered `OPENING-2025`.
- Recommendation: **A**. B pollutes revenue reporting and VAT surfaces forever; A is one clean concept with a single presentation rule.

**OD-2 — How should prepaid money with no matching invoice be represented?**
Example: 5,000 SAR received, only 3,000 allocatable.
- A: An unapplied-credit ledger entry type that reduces the balance and remains available for future allocation.
- B: Leave the 2,000 as an unallocated payment session remainder.
- Recommendation: **A** for clarity on the statement; B is closer to the existing model but is invisible to the customer.

**OD-3 — Should imported invoices keep their original document numbers?**
Example: a 2017 lab invoice numbered `LAB-2017-0043`.
- A: Preserve the source number exactly.
- B: Issue new Dayli numbers and record the source number as a reference.
- Recommendation: **A**, since the customer's own records and any tax history reference the original number.

**OD-4 — How much history should be imported at all?**
- A: Opening position only at a single cutover date.
- B: Full transaction history where the source is complete, opening position elsewhere (hybrid).
- Recommendation: **B**, limited to customers with complete source records.

**OD-5 — Will you accept a manual review queue for ambiguous matches?**
Example: source says "Al Faisal" and two Dayli clients could match.
- A: Quarantine the row for human decision.
- B: Auto-match by best guess.
- Recommendation: **A**. B silently corrupts customer balances.

## E. Minimum Technical Prerequisites

1. **Cut the statement read path to `effective_date`.** Purpose: make backdated records display economically. Affects `useClientStatement.ts`, `effectiveDate.ts`, statement exports, PDF/print, First Financial Activity. Risk if skipped: every imported record is economically false. Separate prompt: yes. High-risk and must be staged: yes — it changes what existing customers see today.
2. **Backfill the 28 NULL `effective_date` rows.** Affects `ledger_entries`. Risk if skipped: prerequisite 1 cannot be completed safely. Separate prompt: no, bundle with 1. Staged: yes (backfill before cutover).
3. **Fence or retire the legacy client ledger writer.** Affects `postLedgerForInvoice.ts` and its callers. Risk if skipped: new NULL rows keep appearing behind the cutover. Separate prompt: no. Staged: yes.
4. **Add import provenance and batch identity.** Purpose: distinguish, reconcile, and roll back imported rows. Affects `invoices`, `ledger_entries`, plus a new batch table. Risk if skipped: no rollback, no reconciliation. Separate prompt: yes (schema design). Staged: yes.
5. **Add row-level import idempotency.** Purpose: safe re-runs. Affects the new batch/row tables. Risk if skipped: duplicated financial history. Separate prompt: no, bundle with 4.
6. **Introduce opening-obligation and unapplied-credit semantics.** Purpose: scenarios 3 and 4. Affects `ledger_entries.entry_type` and statement presentation. Depends on OD-1 and OD-2. Separate prompt: yes. Staged: yes.
7. **Confirm the lab-credit coupling before any lab-history import.** Purpose: ensure imported lab history cannot consume live credits. Affects `lab_credit_wallets`, `lab_credit_transactions`, lab request flows. Risk if skipped: silent consumption of real balances. Separate prompt: yes, narrow.

## F. Proposed Next Step

**Owner Alignment**, Mode: **Plan/Chat**.

Decisions OD-1 through OD-5 gate the schema design for prerequisites 4 and 6, and they are business decisions rather than technical unknowns. The technical prerequisites 1–3 are already fully specified by this audit and can be prepared as an execution prompt in parallel once the owner confirms the statement-date cutover is acceptable to current users.

WORKSTREAM PERSISTENCE: NONE

ROADMAP IMPACT: ASSESSMENT ONLY — NO ROADMAP CREATION OR MODIFICATION

## RUN METADATA AND EXACT STOPPING POINT

- Mode: Plan/Chat — Read-Only Investigation.
- Operation: Targeted current-state re-audit for Historical Financial Import readiness.
- Parent Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-HISTORICAL-IMPORT-CONTRACT-AND-COMPLETE-DRIFT-INVESTIGATIVE-AUDIT-04.
- Continuation Label: LOVABLE-TARGETED-CURRENT-STATE-REAUDIT-L1.
- Prompt status: UNSENT DRAFT — no new lineage number consumed.
- Prompt Preparation Date: 03-08-2026. Prompt Preparation Time: 00:59. Timezone: Asia/Riyadh (UTC+03:00).
- Run Start: 03-08-2026, approximately 23:27 (02-08-2026 20:27 UTC) — exact second not recorded.
- Run End / Final Report: 03-08-2026, approximately 23:40 Riyadh — exact second not recorded.
- Environment: Lovable sandbox, project connected to the managed Lovable Cloud database; the queried database is the one the inspected application code targets via `src/integrations/supabase/client.ts`. Repository-to-live provenance beyond that binding cannot be proven from this context — INACCESSIBLE FROM CURRENT LOVABLE CONTEXT.
- Current branch: `edit/edt-c3fca615-7e07-4772-b8a4-a0943a2dad0c`. Current HEAD: `2aa09a66e1f19f918567c6a74ac7d47e629bb3a2`.
- Working tree before: clean. Working tree after: modified only by `.lovable/plan.md`.
- Repository paths read: `src/contexts/TenantContext.tsx` (createTenant, lines 318–440); `src/lib/finance/effectiveDate.ts`; `src/lib/finance/postLedgerForInvoice.ts`; `src/lib/finance/invoiceRpc.ts`; `src/lib/finance/postPaymentSession.ts`; `src/hooks/clients/useClientStatement.ts`; `src/hooks/pos/usePOSCore.ts`; `src/hooks/billing/useBillingLinks.ts`; `invoices.schema.txt`; `customer_balances.schema.txt`; `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt`, `01_fn__finance_idempotency_begin.txt`, `10_all_finance_fns.txt`; repository-wide `rg` scans of `src/` and `supabase/` for import, staging, quarantine, opening-obligation, provenance, and tenant/financial write patterns.
- Database objects inspected: `pg_policies` for `tenants` and `tenant_members`; `pg_trigger`/`pg_proc` for both tables; `information_schema.tables` and `information_schema.columns` in `public`; row-level reads on `tenants`, `tenant_members`, `ledger_entries`, `invoices`, `payment_sessions`, `clients`, `customer_balances`, `lab_credit_wallets`.
- Read-only queries executed: two `supabase--read_query` calls (catalog/import-capability probe; policy, trigger, column and fact probe). Three shell commands, all `git rev-parse`/`git status`, `rg`, `sed`, `code--view` reads.
- Repository changes: zero (excluding `.lovable/plan.md`). Database changes: zero. Migration changes: zero. Project Knowledge changes: zero. Settings changes: zero. Workstream persistence: none. Roadmap persistence: none. Acceptance: none. Closure: none.
- Exact stopping point: final report delivered. No implementation, schema design, import object, or persistence produced.
- Recommended next step: Owner Alignment on decisions OD-1 through OD-5.
- Recommended next Mode: Plan/Chat.
