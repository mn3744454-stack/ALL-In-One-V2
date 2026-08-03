# Stage B — Database Write Authority, Canonical RPC Cutover and Deferred-Item Transition Closure Audit

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-DATABASE-WRITE-AUTHORITY-AND-RPC-CUTOVER-CLOSURE-AUDIT-12
Mode: Plan/Chat — Read-Only. Repository changes zero. Database changes zero.

## A. Combined Verdicts

1. Database Authority: `STAGE B DATABASE WRITE-AUTHORITY CONTRACT CLOSED`
2. Canonical RPC Safety: `CANONICAL FINANCE RPCS SAFE AFTER DIRECT-DML REVOCATION`
3. POS Contract: `POS VISIBLE-COMING-SOON NON-INVOCATION CONTRACT CLOSED`
4. Deferred Register: `DEFERRED ITEMS REGISTER COMPLETE AND TRANSITION-READY`
5. Stage B Readiness: `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE — Stage A accepted, persisted, verified; Stage B not started. WS-DH-2026-0005 DEFERRED. Stage C and Stage D not started.

## C. Evidence Boundary

Verified repository facts: writer inventory, POS routing and navigation entries, expense approval call site, dead mutation body (files listed in §T). Verified database catalog facts: `pg_class.relacl` and `relrowsecurity`/`relforcerowsecurity`, `pg_policy` full expressions, `pg_proc` owner/`prosecdef`/`proconfig`/`proacl`, full bodies of `_finance_ledger_insert`, `post_expense_with_ledger`, `record_salary_payment`. Inferences: `information_schema.role_table_grants` under role `sandbox_exec` returns only that role's own rows, so `anon`/`authenticated` privileges are taken from `relacl`, which is authoritative and complete. Gaps: no runtime execution as `authenticated` was performed, so rejection behaviour after revocation is modelled from catalog state, not executed. Inaccessible: none material.

## D. Table Privilege Matrix

Source: `pg_class.relacl` (aclitem `arwdDxtm` = SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER; all granted by `postgres`).

| Table | Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER | Source |
|---|---|---|---|---|---|---|---|---|---|
| ledger_entries | postgres (owner) | Y | Y | Y | Y | Y | Y | Y | ownership + explicit |
| ledger_entries | anon | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| ledger_entries | authenticated | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| ledger_entries | service_role | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| ledger_entries | PUBLIC | — | — | — | — | — | — | — | none |
| customer_balances | postgres (owner) | Y | Y | Y | Y | Y | Y | Y | ownership + explicit |
| customer_balances | anon | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| customer_balances | authenticated | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| customer_balances | service_role | Y | Y | Y | Y | Y | Y | Y | explicit grant |
| customer_balances | PUBLIC | — | — | — | — | — | — | — | none |
| expenses | anon / authenticated / service_role | Y | Y | Y | Y | Y | Y | Y | explicit grant |

All three tables are owned by `postgres`, have `relrowsecurity = true` and `relforcerowsecurity = false`. Because RLS is not forced, the owner (`postgres`) bypasses RLS entirely — which is exactly how the SECURITY DEFINER functions write.

## E. Complete RLS Policy Matrix

| Table | Policy | Cmd | Roles | USING | WITH CHECK | Purpose | Decision |
|---|---|---|---|---|---|---|---|
| ledger_entries | Permission-based insert ledger entries | INSERT | PUBLIC (all) | — | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit')` | permits browser inserts | **DROP** |
| ledger_entries | Tenant members can view ledger | SELECT | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — | reads | Keep |
| ledger_entries | Tenant members can view ledger entries | SELECT | PUBLIC | inline `tenant_members … is_active` EXISTS | — | duplicate read policy | Keep (redundant, non-blocking) |
| ledger_entries | *(no UPDATE policy)* | — | — | — | — | — | Already fail-closed |
| ledger_entries | *(no DELETE policy)* | — | — | — | — | — | Already fail-closed |
| customer_balances | Permission-based insert customer balances | INSERT | PUBLIC | — | `has_permission(…, 'finance.invoice.edit')` | permits browser inserts | **DROP** |
| customer_balances | Permission-based update customer balances | UPDATE | PUBLIC | `has_permission(…, 'finance.invoice.edit')` | same | permits browser updates | **DROP** |
| customer_balances | Permission-based delete customer balances | DELETE | PUBLIC | `has_permission(…, 'finance.invoice.edit')` | — | permits browser deletes | **DROP** |
| customer_balances | Tenant members can view balances | SELECT | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — | reads | Keep |
| expenses | insert / update / delete / select | all | PUBLIC | `has_permission` on `finance.expenses.create` / `.manage`, `is_tenant_member` for read | intended CRUD | Keep — expense CRUD stays browser-side; only ledger posting moves server-side |

Established: no RPC depends on these write policies, because every canonical function is SECURITY DEFINER owned by `postgres`, the table owner, and `relforcerowsecurity = false`, so RLS is bypassed on their writes. No function switches role internally. Leaving the browser-write policies in place after privilege revocation would be inert but misleading.

Single recommended strategy: **drop the browser write policies and revoke direct DML privileges**. Defence in depth, and the policy list then documents the real contract (reads for members, all writes via RPC). Retaining inert policies is rejected because a future re-grant would silently reopen browser writes.

## F. Function Ownership, SECURITY DEFINER and search_path Matrix

| Function (full signature) | Owner | SECDEF | search_path | EXECUTE grants | Table deps | Permission contract | Safe after DML revocation? |
|---|---|---|---|---|---|---|---|
| `_finance_advisory_lock_key(uuid,text,uuid)` | postgres | no | `""` | postgres, sandbox roles | none | n/a | Yes |
| `_finance_source_lock_key(uuid,text,uuid)` | postgres | no | `""` | postgres, sandbox roles | none | n/a | Yes |
| `_finance_request_hash(text,uuid,uuid,jsonb,jsonb)` | postgres | no | `""` | postgres, sandbox roles | none | n/a | Yes |
| `_finance_riyadh_date(timestamptz)` | postgres | no | `""` | postgres, sandbox roles | none | n/a | Yes |
| `_finance_idempotency_begin(uuid,text,uuid,uuid,jsonb,jsonb)` | postgres | yes | `""` | postgres, sandbox roles | finance_request_idempotency | internal | Yes |
| `_finance_idempotency_complete(uuid,text,uuid,uuid,bytea,jsonb,jsonb)` | postgres | yes | `""` | postgres, sandbox roles | finance_request_idempotency | internal | Yes |
| `_finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)` | postgres | yes | `""` | postgres, service_role, sandbox roles (not `authenticated`) | ledger_entries (INSERT+UPDATE), customer_balances (UPSERT), tenants | internal only; rejects NULL `p_effective_date` with `FIN_LEDGER_INSERT_BAD_ARGS`; advisory lock per client; recomputes the whole client chain ordered by `effective_date, created_at, id` | Yes |
| `post_expense_with_ledger(uuid,uuid,uuid)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | expenses, ledger_entries via helper | `auth.uid()` required, `is_active_tenant_member`, `finance.expenses.manage` + `finance.expenses.approve`; idempotent; per-expense advisory lock; state and amount guards | Yes |
| `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | ledger, balances | server-side | Yes |
| `post_payment_session(uuid,uuid,jsonb)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | sessions, allocations, ledger | server-side | Yes |
| `approve_invoice(uuid,uuid,uuid)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | invoices, ledger | server-side | Yes |
| `post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | ledger | server-side; no UI per D-B-1 | Yes |
| `create_source_checkout_invoice(uuid,uuid,jsonb)` | postgres | yes | `""` | postgres, authenticated, service_role, sandbox roles | invoices, items, ledger | server-side | Yes |
| `create_pos_sale(uuid,uuid,jsonb)` | postgres | yes | `""` | postgres, **anon**, authenticated, service_role, sandbox roles | invoices, items, ledger | server-side | Yes, but the `anon` EXECUTE grant is an outlier |
| `has_permission(uuid,uuid,text)` | postgres | yes | `public` | PUBLIC, anon, authenticated, service_role | permission tables | helper | Yes |
| `is_tenant_member(uuid,uuid)` / `is_active_tenant_member(uuid,uuid)` | postgres | yes | `public` | PUBLIC, anon, authenticated, service_role | tenant_members | helper | Yes |

Every finance function carries `SET search_path TO ''` with fully schema-qualified references — no unsafe path, no dynamic SQL. The three permission helpers use `SET search_path = public`, which is pinned and therefore not a hijack vector; they are pre-existing, unchanged by Stage B, and are not classified as blockers. `create_pos_sale` holding `anon` EXECUTE is a real outlier and is promoted into Stage B (see §P) because D-B-5 forbids any POS invocation route.

## G. Direct-DML Revocation Impact

Modelled revocation on `ledger_entries` and `customer_balances` from `anon, authenticated`.

| Affected path/object | Current dependency | Effect | Intended? | Stage B action |
|---|---|---|---|---|
| `postLedgerForInvoice` (POS) | browser INSERT ledger + UPSERT balances | breaks | Yes | delete file |
| `postLedgerForExpense` | browser INSERT ledger | breaks | Yes | delete file, replace with RPC |
| `useLedger.createEntry` (dead) | browser INSERT + UPSERT | breaks | Yes | delete mutation |
| `backfillLedgerDescriptions` | browser UPDATE ledger | already non-functional — `ledger_entries` has no UPDATE policy today, so RLS already rejects it; revocation makes the failure explicit | Yes | remove automatic runtime execution |
| `useLedgerEntries`, `useCustomerBalances`, statements, PDF summary, admission financials, unallocated payments | SELECT only | unaffected | Yes | none |
| Realtime subscriptions | SELECT policies | unaffected | Yes | none |
| `_finance_ledger_insert` and all canonical RPCs | run as owner `postgres`, RLS not forced | unaffected | Yes | none |
| Triggers on the tables | execute as owner | unaffected | Yes | none |
| `service_role` (edge functions, cron) | explicit grants retained | unaffected | Yes | none |
| Repository DB tests | run as elevated role | unaffected | Yes | none |

Exactly the four unsafe browser paths stop working; nothing else does.

## H. Expense RPC Cutover Contract

Call site today: `src/pages/DashboardFinance.tsx` `ExpensesList onUpdateStatus`, which calls `updateExpense({ id, status })` then `postLedgerForExpense(id, tenantId)`.

Target: `public.post_expense_with_ledger(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid) RETURNS jsonb`.

Contract: new `src/lib/finance/postExpenseWithLedger.ts` wrapper calling `supabase.rpc("post_expense_with_ledger", { p_tenant_id, p_idempotency_key, p_expense_id })`; idempotency key is a `crypto.randomUUID()` v4 generated once per approval attempt and reused on retry of the same attempt; replay of the same key returns the stored snapshot without a second ledger row; `expense_date` is read server-side and becomes `effective_date`, so no date is sent from the browser; the RPC itself promotes `pending → approved`, so the separate `updateExpense` status call is dropped for the approve action and retained for other status transitions; error mapping `FIN_UNAUTHENTICATED`, `FIN_TENANT_ACCESS_DENIED`, `FIN_PERMISSION_DENIED`, `FIN_EXPENSE_NOT_FOUND`, `FIN_EXPENSE_STATE_INVALID`, `FIN_EXPENSE_AMOUNT_INVALID`, `FIN_BAD_ARGS` to bilingual toasts; pending state on the row's action; on success invalidate `["expenses", tenantId]`, `["ledger-entries", …]`, `["customer-balances", …]` through `invalidateFinanceQueries`; `ledger_status` is set server-side and only read by the UI.

Future paths: modify `src/pages/DashboardFinance.tsx`; add `src/lib/finance/postExpenseWithLedger.ts`; delete `src/lib/finance/postLedgerForExpense.ts`.

## I. Dead Writer Removal Contract

`src/hooks/finance/useLedger.ts`: remove the `CreateLedgerEntryInput` interface (lines 30-38), the `createEntry` mutation (lines 104-159) and the `createEntry` / `isCreating` keys of the return object (lines 164-165); the `useMutation` and `useToast` imports become unused and are removed. Preserve `CustomerBalance`, `LedgerEntry`, `useCustomerBalances`, `useLedgerEntries`, the `["customer-balances", tenantId]` and `["ledger-entries", tenantId, clientId]` query keys, and `invalidateFinanceQueries` usage elsewhere. Confirmed by repository search: no file imports or calls `createEntry` from this hook.

Also delete `src/lib/finance/postLedgerForInvoice.ts` (its only caller is POS, disconnected in §J).

## J. POS Visible-Coming-Soon Contract

| Path | Current behaviour | Required Stage B behaviour | Exact future change |
|---|---|---|---|
| `src/navigation/navConfig.ts:277-281` | active POS nav item | visible, `comingSoon: true`, disabled, no route activation | add a `comingSoon` flag and drop the active `route` binding |
| `src/navigation/workspaceNavConfig.ts:290` | active POS entry | same | same |
| `src/components/dashboard/DashboardSidebar.tsx:272` | active `href` link | rendered as a non-link element with a `Coming Soon` badge, `aria-disabled="true"`, `tabIndex={-1}`, no `onClick`, no `href`, pointer and Enter/Space inert, never active-route styled, bilingual "قريباً / Coming Soon" accessible text | render disabled variant |
| the nav item renderer shared by both configs | renders links | must honour the `comingSoon` flag identically | one shared change |
| `src/App.tsx:717-725` | route mounts `DashboardFinancePOS` | route renders a new inert `FinanceComingSoon` element | replace the element; keep the `ProtectedRoute` wrapper |
| `src/pages/finance/index.ts:2` | exports `DashboardFinancePOS` | export removed so no module graph path reaches it | edit barrel |
| `src/pages/finance/DashboardFinancePOS.tsx` | operational POS | retained as a future asset, zero reachability | untouched |
| `src/hooks/pos/usePOSCore.ts` | invoice, item and ledger writes | unreachable once the page is unmounted; its `postLedgerForInvoice` import is removed with that file, and `createSale` is reduced to throwing a `POS_DISABLED` error | edit imports and guard |
| `public.create_pos_sale` `anon` EXECUTE | anonymous callable | revoke from `anon` (and from `authenticated` until WS-DH-2026-0005) | in the migration |

The migration keeps `create_pos_sale` defined but non-callable by browser roles; it is not activated.

## K. Description-Only Ledger Update Decision

`backfillLedgerDescriptions` performs a browser `UPDATE ledger_entries SET description`. `ledger_entries` has no UPDATE policy, so RLS already rejects it today — the auto-run in `DashboardFinance.tsx` silently sets its localStorage "done" flag regardless. Single recommendation: **remove automatic runtime execution** — delete the `useEffect` auto-run and the localStorage flag in `DashboardFinance.tsx`, and delete `src/lib/finance/backfillLedgerDescriptions.ts`. It does not justify retaining browser UPDATE authority, and no replacement RPC is proposed because current descriptions are written correctly by the canonical RPCs. Retained in the register as a tracked item in case historical description enrichment is later wanted.

## L. Exact Proposed Migration SQL

Identity: `supabase/migrations/<timestamp>_stage_b_financial_write_authority.sql`. Purpose: remove browser DML authority over Ledger and Customer Balance truth, and remove browser EXECUTE on the deferred POS RPC. Dependencies: none beyond current state. Transaction: single implicit migration transaction. Rollback: §M.

Preconditions asserted before running: tables owned by `postgres`; `relforcerowsecurity = false`; policies named exactly as in §E; canonical functions owned by `postgres`, SECURITY DEFINER, `search_path = ''`; `authenticated` holds EXECUTE on `post_expense_with_ledger`, `post_payment`, `post_payment_session`, `approve_invoice`, `create_source_checkout_invoice`, `post_manual_ledger_adjustment`.

```sql
-- Stage B: canonical financial write authority.
-- All Ledger and Customer Balance writes must pass through SECURITY DEFINER
-- finance RPCs owned by postgres. Browser roles keep read access only.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ledger_entries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.customer_balances FROM anon, authenticated;

DROP POLICY IF EXISTS "Permission-based insert ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "Permission-based insert customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based update customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based delete customer balances" ON public.customer_balances;

-- POS remains deferred (WS-DH-2026-0005): no browser role may invoke it.
REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) FROM anon, authenticated;

COMMENT ON TABLE public.ledger_entries IS
  'Financial truth. Writes only via SECURITY DEFINER finance RPCs (_finance_ledger_insert and callers). Browser roles: SELECT only.';
COMMENT ON TABLE public.customer_balances IS
  'Derived client balances. Writes only via SECURITY DEFINER finance RPCs. Browser roles: SELECT only.';
```

No function ownership, `search_path` or EXECUTE correction is required beyond the POS revoke — all canonical functions already satisfy the contract.

Postconditions: `anon` and `authenticated` cannot INSERT, UPDATE or DELETE on either table (privilege denied before RLS is even evaluated, and the permissive write policies no longer exist); SELECT policies and grants unchanged; `post_expense_with_ledger`, `post_payment`, `post_payment_session`, `approve_invoice`, `create_source_checkout_invoice`, `post_manual_ledger_adjustment` remain callable by `authenticated` and continue writing as owner; unauthorized and cross-tenant RPC calls still rejected by in-function checks; `service_role` unchanged; `create_pos_sale` callable only by `service_role`/owner; zero rows written by this migration; Stage A rows untouched.

## M. Exact Rollback SQL

```sql
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.ledger_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.customer_balances TO anon, authenticated;

CREATE POLICY "Permission-based insert ledger entries"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based insert customer balances"
  ON public.customer_balances FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based update customer balances"
  ON public.customer_balances FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based delete customer balances"
  ON public.customer_balances FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) TO anon, authenticated;

COMMENT ON TABLE public.ledger_entries IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;
```

Repository rollback: revert the single Stage B application commit. No function ownership or `search_path` restoration is needed because none is changed.

## N. QA and Acceptance Contract

Repository negative checks, POS UX tests, database negative tests, positive tests and historical-invariance checks exactly as enumerated in the prompt §16, executed as Stage B QA evidence. Build and typecheck are not Acceptance. A separate QA run and a separate read-only Stage B Acceptance Re-Audit remain mandatory before Owner Acceptance.

## O. Deferred Items Register

| Item | Original evidence | Status | Current lane | Proposed future lane | Dependency | Owner decision needed? | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|---|
| Internal Cost terminology | Prompt 11 §G; `recordAsStableCost` naming | DEFERRED — TRACKED | none | RM-DH-002 Internal Cost correction | D-B-6 | Yes, lane approval | Cross-account wrong terminology persists | After Stage B acceptance |
| Internal Cost Unknown vs Real Zero | 5 of 5 non-income `financial_entries` rows carry `actual_cost = 0`; column nullable | DEFERRED — TRACKED | none | same | D-B-6 | Yes | KPI misreports missing cost as zero | same |
| HR Salary-to-Expense atomicity | `useSalaryPayments.ts:71-120` client double insert | DEFERRED — TRACKED | none | HR/Finance correction lane | `record_salary_payment` exists | Yes | Orphan expense or salary rows | After Stage B |
| HR Salary idempotency | no key client-side; RPC has one | DEFERRED — TRACKED | none | same | same | Yes | Duplicate salary payments on retry | same |
| HR Salary reversal | no reversal path found | DEFERRED — TRACKED | none | same | design needed | Yes | Uncorrectable payroll errors | same |
| Generic Expense deletion of HR-linked records | `useExpenses` delete with no HR guard | DEFERRED — TRACKED | none | same | same | Yes | Dangling `finance_expense_id` | same |
| Expense unpost / reversal | no RPC found | DEFERRED — TRACKED | none | RM-DH-004 later phase | Stage B cutover | Yes | Posted expenses cannot be corrected | After Stage B |
| Supplier Payable payment / Expense / Ledger lifecycle | no path found from payables to expense or ledger | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Provider costs never reach finance | Later |
| Full POS implementation | POS operational code retained | DEFERRED — TRACKED | WS-DH-2026-0005 | same | Stage B fencing | No | — | Owner activation |
| Manual Ledger Adjustment product workflow | RPC exists, no UI | DEFERRED — TRACKED | none | future finance lane | D-B-1 forbids UI now | No | — | Owner request |
| `backfillLedgerDescriptions` final ownership | auto-run already RLS-rejected | PROMOTED TO CURRENT EXECUTION SCOPE (removal only) | Stage B | future enrichment lane if wanted | none | No | Silent broken auto-run | Stage B |
| Residual financial-table hardening | broad `anon`/`authenticated` grants on `expenses`, `financial_entries`, `hr_salary_payments`, `supplier_payables` | DEFERRED — TRACKED | none | security hardening lane | none | Yes | Over-broad grants remain | After Stage B |
| Internal Cost contextual terminology by account type | stable wording on non-stable accounts | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Wrong labels per tenant type | Later |
| Supplier Payable-to-Expense authority | undefined | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Ambiguous cost authority | Later |
| Future `create_pos_sale` activation | `anon` EXECUTE grant found | PROMOTED TO CURRENT EXECUTION SCOPE (revoke only) | Stage B | WS-DH-2026-0005 for activation | none | No | Anonymous POS sale invocation | Stage B |

## P. Deferred Item Transition Recommendations

Promoted into Stage B: `create_pos_sale` browser EXECUTE revocation (D-B-5 non-invocation cannot hold while `anon` can call it); `backfillLedgerDescriptions` removal (it is the only remaining browser Ledger UPDATE caller, so D-B-4 cannot be asserted while it exists). Candidate existing Roadmap lane: Internal Cost terminology, Unknown-vs-Zero, contextual terminology, Supplier Payable lifecycle and authority → RM-DH-002. Requires future Owner classification: HR Salary atomicity, idempotency, reversal, HR-linked expense deletion, Expense unpost/reversal, residual grant hardening. Remains deferred unchanged: full POS implementation (WS-DH-2026-0005), Manual Ledger Adjustment workflow.

## Q. Blockers and Gaps

None.

## R. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY STAGE B DATABASE AUTHORITY, RPC CUTOVER AND DEFERRED-ITEM TRANSITION CLOSURE AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

POS remains visible as a disabled Coming Soon capability and has not been activated.

Deferred Internal Cost, HR Salary, Expense reversal, Supplier Payable and full POS work remain tracked unless explicitly promoted in this audit.

Stage C and Stage D have not started.

No Workstream Closure occurred.

## S. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap or Workstream ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.

## T. Run Metadata and Exact Stopping Point

Mode Plan/Chat read-only. Operation Stage B database write-authority, canonical RPC cutover, POS visible-coming-soon non-invocation, exact migration and rollback contract, deferred-item transition closure. Prompt ID as in the header. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED. Prompt prepared 03-08-2026, 21:29, Asia/Riyadh. Run start 03-08-2026 21:32 Asia/Riyadh; first evidenced activity the table-privilege catalog query; run end and final report approximately 21:41 Asia/Riyadh; last evidenced activity the `_finance_ledger_insert` body read. Timestamp source: platform message clock. Branch `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`; canonical/default branch evidence Exact evidence not recorded. HEAD before `014276978`; HEAD after `014276978`. Working tree before and after: clean apart from this plan file. Staged paths before and after: none. Unstaged paths before and after: none. Untracked paths before and after: none beyond the plan file. Repository paths read this run: `src/hooks/finance/useLedger.ts`, `src/hooks/pos/usePOSCore.ts`, `src/lib/finance/postLedgerForInvoice.ts`, `src/lib/finance/postLedgerForExpense.ts`, `src/pages/finance/index.ts`, plus the Prompt 11 evidence already established for `DashboardFinance.tsx`, `App.tsx`, both navigation configs, `DashboardSidebar.tsx`, `useSalaryPayments.ts`. Database objects read: 3 tables, 11 policies, 17 functions. Catalog queries: 5. Financial-row queries: 0. Database role `sandbox_exec`. Table grants found: full `arwdDxtm` for `anon`, `authenticated`, `service_role`, `postgres` on all three tables. Policies found: 11. Functions audited: 17. Function owners: all `postgres`. SECURITY DEFINER: 13 of 17 (the 4 pure helpers are not, correctly). search_path: `''` for all finance functions, `public` for the 3 permission helpers. EXECUTE grants: recorded in §F, including the `anon` grant on `create_pos_sale`. Direct-DML revocation impact: exactly 4 unsafe browser paths break, nothing else. Exact migration contract: produced (§L). Exact rollback: produced (§M). POS navigation contract: produced (§J). Deferred items preserved: 13. Promoted: 2. Requiring future Owner classification: 6. Repository changes zero; database changes zero; migration changes zero; Project Knowledge, Workspace Knowledge, Skills and settings changes zero. `.lovable/plan.md` was written by Plan Mode this run and is disclosed here. Five verdicts as in §A. Stage B implementation not started; Stage C not started; Stage D not started; Closure none.

Exact stopping point: Stage B database write authority, canonical RPC safety, exact migration and rollback contracts, Expense cutover, POS visible-but-non-invokable behavior and the complete Deferred Items Register have been fully established. Any promoted item has been identified without implementation. No migration, financial-data change, Stage C, Stage D or Closure has occurred.

Recommended next step: issue the Stage B Agent/Build execution prompt covering the application cutover in §H, §I, §J, §K and the single migration in §L. Recommended next Mode: Agent/Build.

This audit applied Skill dayli-05-rls-policy-safety for the grant, policy and service-role sections.
