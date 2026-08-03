# Stage B — Writer, Expense, Internal Cost and POS-Freeze Contract Closure Mini Audit

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-WRITER-EXPENSE-INTERNAL-COST-POS-FREEZE-CONTRACT-CLOSURE-MINI-AUDIT-11
Mode: Plan/Chat — Read-Only. Repository changes zero. Database changes zero.

## A. Combined Verdicts

1. Stage B: `STAGE B CONTRACT CLOSED — READY FOR AGENT/BUILD PROMPT`
2. Internal Costs: `INTERNAL COST DEFECT CONFIRMED — SEPARATE CORRECTION REQUIRED`
3. POS: `POS IS ACTIVE OR TECHNICALLY INVOKABLE — BLOCKING DEFECT`
4. HR Salary: `HR SALARY EXPENSE CONTRACT REQUIRES SEPARATE CORRECTION`

The POS verdict is a blocking defect against D-B-5, not against the Stage B writer contract: POS is currently visible in navigation, route-reachable with `finance.invoice.view`, and its sale action reaches the unsafe browser Ledger writer. Stage B fencing resolves it.

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE — Stage A accepted and verified; Stage B not started. WS-DH-2026-0005 DEFERRED. Stage C, Stage D not started. No Acceptance, no Closure.

## C. Evidence Boundary and Limitations

Proven this run: repository writer inventory by exhaustive search; live catalog `relacl` grants; RLS write policies; function bodies of `post_expense_with_ledger` and `record_salary_payment`; `financial_entries` column nullability; one aggregate, anonymised, non-identifying count over non-income `financial_entries`. Not proven: runtime QA of any flow; reversal behaviour of `record_salary_payment` (no reversal function found by name); whether POS was ever used in production data. No financial-row detail was read.

## D. Complete Writer Inventory

| Writer | Path / object | Target | Side | Reachability | Scenario | Economic date | Atomic | Permission | Action |
|---|---|---|---|---|---|---|---|---|---|
| `useLedger.createEntry` | `src/hooks/finance/useLedger.ts:104-149` | ledger_entries + customer_balances | client | DEAD_OR_UNREFERENCED | none | absent | no | RLS only | Remove (D-B-1) |
| `postLedgerForInvoice` | `src/lib/finance/postLedgerForInvoice.ts:177-206` | ledger_entries + customer_balances | client | ACTIVE_REACHABLE via `usePOSCore.ts:163` ← `DashboardFinancePOS.tsx:195` | POS sale | absent → NULL | no | RLS only | Remove with POS fencing |
| `postLedgerForExpense` | `src/lib/finance/postLedgerForExpense.ts:51-63` | ledger_entries | client | ACTIVE_REACHABLE via `DashboardFinance.tsx:311` | Expense approval | absent → NULL | no; writes `balance_after=0` | RLS only | Replace with `post_expense_with_ledger` |
| `backfillLedgerDescriptions` | `src/lib/finance/backfillLedgerDescriptions.ts:117` | ledger_entries (UPDATE description) | client | ACTIVE_REACHABLE (auto-runs once per tenant for owners, `DashboardFinance.tsx`) | description enrichment | n/a | n/a | RLS only | Non-economic; recommend gating, not required |
| `useSalaryPayments.createMutation` | `src/hooks/hr/useSalaryPayments.ts:77-120` | expenses (INSERT, `status:'approved'`) + hr_salary_payments | client | ACTIVE_REACHABLE (HR Payroll, Salary Payments section) | salary payment | `expense_date` set from `paid_at` | no | RLS only | HR lane — reroute to `record_salary_payment` |
| `useExpenses` create/update/delete | `src/hooks/finance/useExpenses.ts:67-132` | expenses | client | ACTIVE_REACHABLE | expense CRUD | `expense_date` | n/a | RLS `finance.expenses.create/manage` | Keep; approval-side posting moves server-side |
| `recordAsStableCost` | `src/lib/finance/recordAsStableCost.ts:34-47` | financial_entries | client | ACTIVE_REACHABLE (vet/vaccination "record as cost") | Internal Cost | n/a | n/a | RLS `finance.invoice.edit` | Internal Cost lane |
| `useFinancialEntries` insert/update/delete | `src/hooks/finance/useFinancialEntries.ts:141,165,189` | financial_entries | client | ACTIVE_REACHABLE | Internal Cost CRUD | n/a | n/a | RLS | Internal Cost lane |
| `createSupplierPayableForExternal`, `useSupplierPayables` | `src/lib/finance/…`, `src/hooks/finance/useSupplierPayables.ts` | supplier_payables | client | ACTIVE_REACHABLE | provider cost capture | n/a | n/a | RLS | Internal Cost lane; no ledger effect found |
| Server RPCs | `_finance_ledger_insert`, `post_payment`, `post_payment_session`, `approve_invoice`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `create_pos_sale`, `create_source_checkout_invoice` | ledger/balances | server, SECURITY DEFINER | ACTIVE | all canonical flows | explicit param | yes, advisory-locked | server `has_permission` | Canonical targets |

Browser-direct Ledger writers: 4 found, 3 active (1 description-only). Browser-direct Customer Balance writers: 2 found, 1 active (`postLedgerForInvoice`).

## E. Expense Lifecycle Findings

Current live path: create via `useExpenses.createExpense` (status defaults `pending`), status change via `updateExpense`, and on `status === "approved"` the page then calls `postLedgerForExpense` as a second, separate request. Consequences proven by code: creation alone does not post; approval and posting are two non-atomic client calls, so a failed second call leaves an approved-but-unposted expense; the ledger row is written with no `effective_date` (NULL Economic Date, contradicting Stage A) and `balance_after: 0` unconditionally; `client_id` is omitted (null-client, which is correct for internal cost) so no Customer Balance drift arises from this path specifically; amount is written positive.

`post_expense_with_ledger` is the canonical replacement and is complete: it authenticates, enforces active membership plus `finance.expenses.manage` and `finance.expenses.approve`, applies idempotency, takes a per-expense advisory lock, rejects non-`unposted` `ledger_status`, rejects non-positive amounts, inserts through `_finance_ledger_insert` with `p_effective_date = expense_date` (satisfies D-B-2) and a NULL client, then sets `ledger_status='posted'`, `posted_at`, `ledger_entry_id` and promotes `pending → approved` in the same transaction. No expense reversal or unpost RPC exists; expense delete remains a client path with no ledger compensation — documented as a residual, not Stage B scope.

## F. HR Salary Findings

| Question | Proven behaviour | Evidence | Gap | Recommendation |
|---|---|---|---|---|
| Which path runs today? | Client-side: optional direct `expenses` INSERT then `hr_salary_payments` INSERT | `useSalaryPayments.ts:71-120` | Server RPC unused | Reroute |
| Do Mode A / Mode B exist? | Yes server-side (`p_create_expense` boolean, expense + ledger in one transaction); client implements a weaker imitation | function signature and body | Frontend does not call it | Reroute |
| Who chooses `create_expense`? | The user, via a visible switch | `DashboardHRPayroll.tsx:553` (default false), `SalaryPaymentsSection.tsx:238` (default true) | Inconsistent defaults | Align defaults |
| Permission checked | Client: RLS `finance.expenses.create` on the expense insert only. Server RPC checks `hr.manage` | policies; RPC line 22 | Client path checks no HR permission | Server enforcement |
| Economic date | Client sets `expense_date` from `paid_at`; no ledger row at all | `useSalaryPayments.ts:96` | Salary expenses never reach the Ledger | Server RPC posts ledger with business date |
| `finance_expense_id` | Populated by the client after the expense insert | `useSalaryPayments.ts:116` | Non-atomic: expense can exist with no salary row | Server RPC sets the backlink in-transaction |
| Duplicate on retry | Yes — no idempotency key client-side | absence of key | Duplicate salary and expense rows possible | Server RPC idempotency |
| Reversal | No reversal path found for salary or expense | no matching function or UI | Gap | Separate correction |
| Generic Expense UI on HR expenses | Yes — HR-created expenses appear in the expense list and can be edited or deleted with no HR guard | `useExpenses`, `ExpensesList` | Orphan `finance_expense_id` possible | Separate correction |

## G. Internal Cost and Supplier Payable Findings

| Concept | Storage | Authority | UI label today | Missing-value behaviour | Financial effect | Lane |
|---|---|---|---|---|---|---|
| Internal Cost | `financial_entries` (`is_income=false`, `actual_cost` nullable, `estimated_cost` nullable) | vet/vaccination "record as cost", manual entry | "Stable Cost" wording in code (`recordAsStableCost`) and stable-flavoured labels | Written as literal `0`, not NULL — all 5 current non-income rows have `actual_cost = 0`, none NULL | Presentation and KPI truth; totals read SAR 0.00 while rows exist | SEPARATE RM-DH-002 INTERNAL-COST CORRECTION |
| Provider / Supplier Payable | `supplier_payables` | external provider treatments | supplier wording | not audited in depth | no ledger or expense creation path found from payables | SEPARATE RM-DH-002 |
| Expense | `expenses` | manual and HR | Expenses | amount NOT NULL and positive-checked server-side | posts to Ledger on approval | STAGE B REQUIRED |
| Client Invoice | `invoices` / `invoice_items` | catalog and RPC | Invoices | n/a | Ledger + Customer Balance | out of scope |

Owner-reported defects: (1) records present with total SAR 0.00 — confirmed at the data layer, and the cause is the write path storing `0`, not only the aggregation; (2) stable-specific terminology on non-stable accounts — confirmed in code naming and shared helper labels; (3) missing rendered as zero — confirmed, since a genuinely unknown cost is indistinguishable from a real zero once written. Internal Cost records are distinct from Expenses (different table, no ledger effect). No path was found where a Supplier Payable creates an Expense or a Ledger entry. No path was found reusing Client Invoice amounts as Internal Cost. The defect does not touch `ledger_entries`, `customer_balances` or Economic Date, therefore it does not block Stage B.

## H. POS Freeze Findings

Current state: `ACTIVE_REACHABLE`. Evidence: nav entry `pos` in `src/navigation/navConfig.ts:277-281` and `workspaceNavConfig.ts:290`, sidebar entry `DashboardSidebar.tsx:272`, route `/dashboard/finance/pos` in `App.tsx:717-725` guarded only by organization mode plus `finance.invoice.view`, page action `DashboardFinancePOS.tsx:195` → `usePOSCore.createSale` → invoice and item writes plus `postLedgerForInvoice` (ledger + customer_balances). No feature flag, coming-soon gate or disabled state was found. `create_pos_sale` exists server-side but is not called by any frontend file.

| Option | Effect | Risk | Verdict |
|---|---|---|---|
| P1 remove unsafe writer only | Kills the Ledger/Balance defect but leaves a half-working POS creating invoices | Silent partial sales | Insufficient alone |
| P2 hard non-invocation guard | Route renders a Coming Soon panel; `createSale` throws before any write | Dead code retained | Complementary |
| **P3 remove route/action wiring, keep files** | Nav and sidebar entries removed, route replaced by a Coming Soon element, `usePOSCore.createSale` disconnected, `postLedgerForInvoice` deleted; POS UI files preserved for the future | Minimal | **RECOMMENDED — smallest safe freeze** |
| P4 reroute to `create_pos_sale` | Would make POS operational | Violates D-B-5 | Not authorized |

## I. Database Grants and RLS Findings

| Table | Authenticated privilege | Write RLS | Direct browser write possible? | Evidence | Correction |
|---|---|---|---|---|---|
| ledger_entries | `arwdDxtm` (full) — also granted to `anon` | INSERT `has_permission(finance.invoice.edit)`; no UPDATE or DELETE policy | Yes, INSERT by any holder of `finance.invoice.edit` | `pg_class.relacl`, `pg_policy` | Application-side removal of browser writers is sufficient for Stage B; policy tightening is a separate hardening item |
| customer_balances | `arwdDxtm` — also `anon` | INSERT and UPDATE `finance.invoice.edit`; DELETE policy present | Yes | same | same |
| expenses | `arwdDxtm` — also `anon` | INSERT `finance.expenses.create`, UPDATE `finance.expenses.manage` | Yes, intended | same | Keep |
| financial_entries | `arwdDxtm` — also `anon` | INSERT/UPDATE `finance.invoice.edit` | Yes, intended | same | Internal Cost lane |
| hr_salary_payments | `arwdDxtm` — also `anon` | not re-read this run | Presumed yes | relacl only | HR lane |
| supplier_payables | `arwdDxtm` — also `anon` | not re-read this run | Presumed yes | relacl only | Internal Cost lane |

The Prompt-10 grant gap is now closed: `authenticated` holds full table privileges everywhere, so direct PostgREST writes are technically possible on every financial table and only RLS stands in the way. The broad `anon` grant is disclosed as a pre-existing hardening observation (OBS-B-01), outside Stage B scope, since every write policy still requires an authenticated permission holder.

## J. Scope Classification Matrix

| Finding | Stage B | Internal Cost lane | POS lane | HR/Expense lane | Reason |
|---|---|---|---|---|---|
| Dead `createEntry` | Yes | — | — | — | D-B-1 |
| `postLedgerForExpense` NULL date, `balance_after=0`, non-atomic | Yes | — | — | Touches | Directly reintroduces the Stage A defect |
| `postLedgerForInvoice` NULL date + balance write | Yes | — | Yes | — | Only reachable through POS |
| POS visible and invokable | Fencing only | — | Yes | — | D-B-5 non-invocation |
| Salary client-side expense insert | No | — | — | Yes | No Ledger write; safety-neutral for Economic Date |
| Internal Cost zero-vs-missing | No | Yes | — | — | No Ledger or Balance effect |
| Supplier Payable relationships | No | Yes | — | — | No ledger effect found |
| Broad `anon`/`authenticated` grants | No | — | — | — | Separate hardening (OBS-B-01) |
| `backfillLedgerDescriptions` auto-run | Optional | — | — | — | Description only |

## K. Owner Decisions Applied

D-B-1 applied (remove dead writer, no Manual Adjustment UI). D-B-2 applied (`expense_date` is the Economic Date; the canonical RPC already does this). D-B-3 applied (no migration proposed; required DB objects all already exist). D-B-4 applied (target end state is zero browser Ledger and Balance writes). D-B-5 applied (P3 freeze, POS not activated, no POS migration). D-B-6 applied (Internal Cost terminology and missing-vs-zero kept in its own lane, not silently absorbed). D-B-7 applied (relationships established in §G: seven distinct records and lifecycles, not one).

## L. Proposed Agent/Build Contract

Application changes — required: `src/pages/DashboardFinance.tsx` (approval calls `post_expense_with_ledger` via a new typed wrapper, with a generated idempotency key and mapped `FIN_*` errors); new `src/lib/finance/postExpenseWithLedger.ts`; delete `src/lib/finance/postLedgerForExpense.ts` and `src/lib/finance/postLedgerForInvoice.ts`; strip `createEntry` from `src/hooks/finance/useLedger.ts` (keep `useLedgerEntries`, `useCustomerBalances`); `src/hooks/pos/usePOSCore.ts` (disconnect `createSale` writes behind a non-invocation guard); `src/App.tsx` (POS route renders a Coming Soon element); `src/navigation/navConfig.ts`, `src/navigation/workspaceNavConfig.ts`, `src/components/dashboard/DashboardSidebar.tsx` (remove POS entries); new repository-grep regression test asserting zero browser Ledger and Balance writes. Excluded: statements, exports, PDF, Internal Cost, HR salary, POS activation.

Database changes: `NONE`.

Historical data scope: `ZERO HISTORICAL FINANCIAL ROW CHANGES`.

POS boundary: remains `COMING SOON — DISABLED`. Internal Cost boundary: untouched.

Required tests: zero browser Ledger writes; zero browser Customer Balance writes; expense approval posts once with `effective_date = expense_date`; replay of the same idempotency key does not double-post; already-posted expense rejected; non-positive amount rejected; missing permission rejected; cross-tenant rejected; POS route non-invocable and no write reachable; Stage A rows unchanged (88 rows, 0 NULL, balances reconciled).

## M. Exact Rollback

Revert the single application commit; no database rollback exists because no migration ships. Reverting restores the legacy writers exactly as they are today. Stage A data is untouched in every branch of the plan.

## N. QA and Acceptance Criteria

Build and typecheck are necessary and not sufficient. Stage B Acceptance requires the test list in §L executed as QA evidence, followed by a separate read-only Stage B Acceptance Re-Audit and explicit Owner Acceptance. Stage B Acceptance is not Workstream-wide Technical Acceptance.

## O. Blockers and Gaps

No Stage B blockers. Open gaps, each in another lane: POS currently invokable (resolved by the Stage B fencing above), Internal Cost zero-vs-missing, HR salary non-atomic client path with no reversal, no expense unpost or reversal RPC, broad `anon` grants (OBS-B-01), `hr_salary_payments` and `supplier_payables` write policies not re-read this run.

## P. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE: NONE — READ-ONLY STAGE B CONTRACT CLOSURE MINI AUDIT ONLY. Stage A remains accepted and verified. WS-DH-2026-0003 remains ACTIVE. Stage B implementation has not started. The Internal Cost defect has been classified only and has not been implemented. WS-DH-2026-0005 remains DEFERRED — POS COMING SOON / DISABLED. Stage C and Stage D have not started. No Workstream Closure occurred.

## Q. ROADMAP IMPACT

ROADMAP IMPACT: RM-DH-004 remains ACTIVE — PHASE 1. This audit does not complete Phase 1. No Phase advancement, Phase Closure or Roadmap Closure occurred.

## R. Run Metadata and Exact Stopping Point

Mode Plan/Chat read-only. Operation Stage B writer, Expense, HR Salary, Internal Cost and POS freeze contract closure mini audit. Prompt ID as in the header; status received UNSENT DRAFT — NUMBER NOT YET CONSUMED; prepared 03-08-2026 20:32 Asia/Riyadh. Run start 03-08-2026 20:46 Asia/Riyadh; run end and report time approximately 20:53 Asia/Riyadh; timestamp source the platform message clock. Branch `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`; canonical/default branch evidence not captured. HEAD before and after `014276978`; working tree clean before and after apart from this plan file. Files read: 14 repository files (finance writers, HR salary hook and pages, POS page and core hook, navigation configs, App routes, expense hooks). Database objects read: 6 table ACLs, 3 table policy sets, 1 column catalog, 2 function bodies. Database queries: 3 catalog calls plus 1 aggregate. Financial-row queries: 1, aggregate and anonymised. Role `sandbox_exec`. Writers found 10 groups; browser-direct Ledger writers 4 (3 active); browser-direct Balance writers 2 (1 active); expense paths 3; HR salary paths 2 (1 active client, 1 unused server); Internal Cost objects `financial_entries`, `supplier_payables`, `recordAsStableCost`, `useFinancialEntries`; POS routes 1 with 3 navigation entries and 1 active unsafe writer. Authenticated grants evidence: direct `pg_class.relacl` — full privileges on all six tables. Repository changes zero; database changes zero; migration changes zero; Knowledge, Skills and settings changes zero. `.lovable/plan.md` written by Plan Mode this run and disclosed here. Verdicts: Stage B contract closed; Internal Cost defect confirmed, separate correction; POS technically invokable, blocking defect; HR salary expense contract requires separate correction. Stage B implementation not started; Stage C and Stage D not started; Closure none.

Exact stopping point: Stage B writer and database-authority scope, Expense and HR Salary contracts, Internal Cost classification and POS freeze boundary have been independently established. No implementation, migration, financial-data change, Stage C, Stage D or Closure has occurred.

Recommended next step: issue the bounded Stage B Agent/Build execution prompt in §L, including the P3 POS freeze. Recommended next Mode: Agent/Build.

This audit applied Skill dayli-05-rls-policy-safety for the grants and RLS section.
