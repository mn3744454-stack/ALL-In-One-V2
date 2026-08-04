# STAGE B — APPLICATION POST-EXECUTION QA (PROMPT 22)

Read-only QA. No source, test, migration, database, governance, Knowledge, Skill or settings change was made.

## A. Combined QA Verdicts

- Prompt-21 consumption: PROMPT 21 SUBMITTED — RUN — CONSUMED
- Scope attribution: PROMPT-21 CHANGES FULLY ATTRIBUTED
- Expense cutover: EXPENSE RPC CUTOVER QA PASSED
- Legacy writers: LEGACY BROWSER-WRITER REMOVAL QA PASSED
- Browser DML: ZERO ACTIVE BROWSER DML CONFIRMED
- POS: POS INERT-FENCING QA PASSED
- Build: TYPECHECK AND PRODUCTION BUILD PASSED
- Tests: TEST SUITE HAS UNVERIFIED BASELINE FAILURE
- Database: ZERO DATABASE CONTRACT CHANGE CONFIRMED (component-level; hash-algorithm boundary in X)
- Zero regression: ZERO REGRESSION TO PROMPTS 01–21 CONFIRMED FOR APPLICATION PHASE
- Application QA: APPLICATION QA INCONCLUSIVE — DATABASE EXECUTION REMAINS BLOCKED

Single blocking item: the invoice-PDF RTL failure cannot be proven pre-existing from recorded evidence (criterion 18).

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — Phase 1. WS-DH-2026-0003 ACTIVE (Stage A accepted, persisted, verified; Stage B application execution reported, QA not passed). WS-DH-2026-0005 DEFERRED. Database Authority Migration not started.

## C. Evidence Boundary

- LIVE REPOSITORY FACT: branch/HEAD, clean tree, commit 095aed91 file set, all greps, typecheck, build, test run.
- LIVE DATABASE FACT: policy catalogue, relacl, comments, RLS flags, column ACL count, role inheritance, helper proconfig, create_pos_sale ACL, post_expense_with_ledger signature.
- PROMPT-21 LOVABLE EXECUTION CLAIM: claims 1–21 of Section 3 (verified below except test-baseline claim 20).
- PRESERVED PRIOR FINDING: Prompts 01–21 contracts in Section 5 of the prompt.
- GAP: (1) exact preserved fingerprint algorithms not reproducible in this session, so hashes were not recomputed — component-level catalogue state was compared instead; (2) no pre-execution test artifact exists for the failing test.
- CONTRADICTION: none.

## D. Cumulative Prompt Lineage — 01–21

Ledger as supplied in the prompt is preserved unchanged and remains authoritative: 01–03 historical/superseded; 04 import contract and drift boundary; 05 economic-date scope and 28-row set; 06 Stage-A preview (88/28/87/7/3); 07 Stage-A execution (28 dates, 69 balances, 87 resequenced, zero monetary delta); 08 Stage-A acceptance passed; 09 acceptance persisted; 10 persistence verified + writer inventory; 11 writer/POS contract closure; 12 database-authority separation; 13 privilege completeness; 14 pg_temp helper safety; 15 proconfig assertion; 16 polroles/PUBLIC and both policy hashes; 17 canonical eleven + three helpers; 18 internal-writer EXECUTE/trusted schema; 19 exact live policy identity and preserved fingerprint algorithm; 20 migration invariants, comments, ACL hashes; 21 application execution phase 1 (this QA's subject). All statuses SUBMITTED — RUN — CONSUMED. No entry is replaced by this QA.

## E. Preserved and Still Authoritative

Section 5.1–5.6 of Prompt 22 (Stage A finality, Expense contract, writer contract, read-only hook contract, POS contract, database pre-state) is preserved without modification.

## F. Sole QA Scope

Items 1–20 of Section 6 only. No repair, no code change, no database execution.

## G. Repository and Run-Metadata Reconstruction

- Branch: `edit/edt-907c65c8-9940-405f-906b-bb2fe9568032` (working branch; canonical/default branch not resolvable from this sandbox — GAP, non-material).
- HEAD: `944ea916` ("Fixed provenance and versions").
- Working tree before QA: clean (`git status --porcelain` empty). After QA: clean (re-checked; only ignored `dist/` and `/tmp` artifacts produced).
- Prompt-21 execution commit: `095aed91` "Applied Stage B Phase 1 changes"; pre-execution HEAD `ee1ee63e` ("Implemented 7-file governance write") — proven as its parent.
- Post-21 commits (`095aed91..HEAD`) touch governance docs only (`docs/**`), i.e. the Prompt-04-lineage governance correction, not application code.
- `.lovable/plan.md` is rewritten by Plan Mode for this report; disclosed, not application execution.

## H. Prompt-21 Changed-Path Matrix (commit 095aed91, 19 paths)

| Path | Status | Authorized | Notes |
| --- | --- | --- | --- |
| src/pages/DashboardFinance.tsx | M | Yes | Expense RPC cutover + automatic backfill removal |
| src/lib/finance/postLedgerForExpense.ts | D | Yes | legacy writer |
| src/lib/finance/postLedgerForInvoice.ts | D | Yes | legacy writer |
| src/lib/finance/backfillLedgerDescriptions.ts | D | Yes | automatic backfill helper |
| src/hooks/finance/useLedger.ts | M | Yes | read-only cutover (-68 lines) |
| src/hooks/pos/usePOSCore.ts | M | Yes | ledger posting removed |
| src/pages/finance/DashboardFinancePOS.tsx | D | Yes | operational POS page |
| src/pages/finance/POSComingSoon.tsx | A | Yes | inert surface |
| src/pages/finance/index.ts, src/App.tsx | M | Yes | route cutover |
| src/navigation/navConfig.ts, workspaceNavConfig.ts | M | Yes | `comingSoon: true` on POS |
| src/components/dashboard/NavGroup.tsx, DashboardSidebar.tsx | M | Yes | disabled desktop rendering |
| src/components/navigation/{MobileLauncher,MobileModuleGrid,ModuleIconCard}.tsx | M | Yes | disabled mobile rendering |
| src/i18n/locales/en.ts, ar.ts | M | Yes | 1 line each (`approveFailed`) |

No migration, SQL, generated DB type, HR, Supplier Payable, Statement, Historical Import, Knowledge, Skill or settings path changed. Verdict: PROMPT-21 CHANGES REMAINED WITHIN AUTHORIZED SCOPE.

## I. Expense Approval Call Chain

`ExpensesList row action → onUpdateStatus(id, "approved") in DashboardFinance.tsx:308 → supabase.rpc("post_expense_with_ledger", {...}) at line 314 → success: invalidateFinanceQueries(queryClient, tenantId) and return; failure: console.error + toast.error(t("finance.expenses.approveFailed")) + early return.` Non-approved statuses still use `updateExpense` (status-only, no ledger effect) — permitted.

## J. RPC Parameter Mapping Matrix

Live signature: `public.post_expense_with_ledger(p_tenant_id uuid, p_idempotency_key uuid, p_expense_id uuid) RETURNS jsonb`, SECURITY DEFINER.

| Position | DB argument | Caller expression | Meaning | Correct |
| --- | --- | --- | --- | --- |
| 1 | p_tenant_id uuid | `activeTenant.tenant.id` | active tenant | Yes |
| 2 | p_idempotency_key uuid | `crypto.randomUUID()` | per-attempt idempotency key | Yes |
| 3 | p_expense_id uuid | `id` from list row | expense being approved | Yes |

Named-argument invocation removes positional risk.

## K. Duplicate-Post and Error Handling

Exactly one RPC call per approval action; no preceding `updateExpense` status write on the approval branch; no browser ledger insert and no `customer_balances` write anywhere in `src/`; failure path returns before any success/invalidate side effect; the legacy sequence is unreachable (its helper files are deleted and unreferenced).

## L. Cache Invalidation

`invalidateFinanceQueries` covers invoices, invoice items/payments, ledger entries, customer balances, client statement, finance summary, expenses, clients, ledger balances, billing links — all materially affected surfaces.

## M. Translation Parity

`finance.expenses.approveFailed` exists in `en.ts:3994` ("Failed to approve expense") and `ar.ts:4012` ("تعذر اعتماد المصروف"). No placeholder or English-only fallback.

## N. Deleted-File and Zero-Reference Matrix

| File | Present | Active references |
| --- | --- | --- |
| src/lib/finance/postLedgerForExpense.ts | Absent | 0 |
| src/lib/finance/postLedgerForInvoice.ts | Absent | 0 (only two negative contract tests assert its absence) |
| src/lib/finance/backfillLedgerDescriptions.ts | Absent | 0 |
| src/pages/finance/DashboardFinancePOS.tsx | Absent | 0 |

## O. useLedger Read-Only Assessment

`useLedger.ts` exposes `useCustomerBalances` and `useLedgerEntries` (select only); `createEntry` mutation and its input type are gone; no consumer calls `.createEntry` on a ledger hook (the only `createEntry` matches are `useFinancialEntries` — a different domain — and two i18n labels). `useCustomerBalance.ts` and `useLedgerBalance.ts` are select-only.

## P. Automatic Backfill Removal

Zero static or dynamic imports, zero invocation, zero mount effect in `DashboardFinance.tsx`; no replacement automatic ledger-description update exists.

## Q. Browser-DML Search

PCRE2 search for `.from("ledger_entries"|"customer_balances").insert|update|upsert|delete` across `src/` returns only two assertions inside `n2_5InvoiceRpcRuntimeWiring.test.ts` that require such calls to be absent. All 18 remaining source files referencing these tables perform `.select` only. Verdict: ZERO ACTIVE BROWSER DML CONFIRMED.

## R. POS Navigation Matrix

| Surface | Path | Visible | Coming Soon | Click blocked | Keyboard blocked | A11y |
| --- | --- | --- | --- | --- | --- | --- |
| navConfig / workspaceNavConfig | `comingSoon: true` on `pos` (navConfig.ts:283, workspaceNavConfig.ts:293) | Yes | flag | n/a | n/a | config |
| Desktop NavGroup (expanded + collapsed) | NavGroup.tsx:138, 235 | Yes | label | renders non-link div, no href/handler | no focusable link | `aria-disabled="true"` |
| Sidebar | DashboardSidebar.tsx:272 | Yes | `common.comingSoon` | via NavGroup | via NavGroup | via NavGroup |
| Mobile grid | MobileModuleGrid.tsx:53,72 | Yes | label | early return | `disabled` button | `aria-disabled` |
| Mobile launcher | MobileLauncher.tsx:128,216 | Yes | label | early return | `disabled` button | `aria-disabled` |
| ModuleIconCard | :119,129,130 | Yes | badge | early return | `disabled` | `aria-disabled` |

Not CSS-only: desktop renders a non-anchor element, mobile renders `disabled` buttons.

## S. POS Direct-Route Chain

`App.tsx:718 /dashboard/finance/pos → ProtectedRoute → WorkspaceRouteGuard → POSComingSoon` (imported from `./pages/finance` → `POSComingSoon.tsx`). The route imports no operational POS page, hook, or writer.

## T. POS Hook/Writer Reachability

`POSComingSoon` imports only `DashboardShell`, `Card`, `useI18n`, an icon — no query, no mutation, no supabase call, bilingual via i18n, no digits rendered. `usePOSCore` remains deferred source; its only importers are `hooks/pos/index.ts` (barrel) and `POSCart.tsx` / `POSPaymentPanel.tsx` (type-only imports), and no active route mounts those components. `create_pos_sale` is not invoked from `src/`.

## U. Typecheck, Build, Lint

| Command | Exit | Result |
| --- | --- | --- |
| `npx tsgo --noEmit -p tsconfig.app.json` | 0 | PASSED |
| `npm run build` (vite production) | 0 | built in 24.54s; only chunk-size warnings |
| Lint | not run (no separate lint evidence required by scope; disclosed as GAP) |

Times: Exact time not recorded.

## V. Test Results

`bunx vitest run` → exit 1. Test Files 1 failed | 18 passed (19). Tests **1 failed | 268 passed (269)** — independently reproducing the 268/269 claim.

Failure: `src/components/finance/__tests__/InvoicePDFGenerator.test.ts > createInvoiceHTML — Arabic direction & bidi isolation > emits lang=ar and dir=rtl on the root`
AssertionError: expected `'<div class="pdf-body" data-lang="ar">…'` to match `/dir="rtl"/`.

## W. Invoice-PDF RTL Failure Classification

- Condition 1 (test path unmodified by Prompt 21): PASS — not in `095aed91`; last touched by ancestor commit `08acdd6d`.
- Condition 2 (implementation unmodified): PASS — `InvoicePDFGenerator.tsx` not in `095aed91`; `git diff 095aed91^..HEAD` over both paths shows no change.
- Condition 3 (no shared dependency effect): PASS — the module imports `displayHelpers`, `useInvoices` types and `fetchInvoicePaymentSummary`, none changed; the three deleted writers are not in its import graph; the assertion is on static HTML, independent of navigation/i18n changes.
- Condition 4 (recorded pre-execution failing run): NOT SATISFIED — no pre-execution test artifact, CI record, or pre-21 run output exists, and manufacturing a baseline would require a checkout, which this QA forbids.
- Condition 5: no masking evidence found.

Classification: **UNVERIFIED PRE-EXISTING FAILURE** → `TEST SUITE HAS UNVERIFIED BASELINE FAILURE`.

## X. Database Zero-Change Evidence

Policies — exactly seven, all PERMISSIVE, `polroles={0}` (PUBLIC):

```text
customer_balances|Permission-based delete customer balances|d|t|{0}|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)|
customer_balances|Permission-based insert customer balances|a|t|{0}||has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
customer_balances|Permission-based update customer balances|w|t|{0}|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
customer_balances|Tenant members can view balances|r|t|{0}|is_tenant_member(auth.uid(), tenant_id)|
ledger_entries|Permission-based insert ledger entries|a|t|{0}||has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
ledger_entries|Tenant members can view ledger|r|t|{0}|is_tenant_member(auth.uid(), tenant_id)|
ledger_entries|Tenant members can view ledger entries|r|t|{0}|EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = ledger_entries.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)|
```

Table ACL (both tables identical): `{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres,sandbox_exec_vhxglsvxwwpmoqjabfmj=ar/postgres,sandbox_exec=ar/postgres}` — matches the Prompt-20 pre-state matrix (no PUBLIC grant, no grant option, browser roles still full DML pending the database phase).

Other state: owner `postgres`; RLS `true`; FORCE RLS `false`; comments `NULL` on both; column ACLs `0`; browser-role inheritance rows `0`.

Helpers: `has_permission(_user_id uuid,_tenant_id uuid,_permission_key text)` OID 47231; `is_active_tenant_member(_user_id uuid,_tenant_id uuid)` OID 66253; `is_tenant_member(_user_id uuid,_tenant_id uuid)` OID 17622 — all SECURITY DEFINER with `search_path=public` (pg_temp hardening still pending, as expected).

POS ACL: `create_pos_sale` = `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres,sandbox_exec_*=X/postgres}` → PUBLIC EXECUTE false, anon true, authenticated true — expected pre-migration state.

Migration evidence: commit `095aed91` touched no `supabase/` path; the latest migration file predates it. Financial rows: `Financial-row no-change reported by execution` and `Independent row-level evidence unavailable` (no baseline snapshot taken in this QA; zero writes were issued).

Fingerprint boundary: the exact canonical-string concatenation/hashing algorithms of Prompts 16/19/20 are not reproducible from artifacts available in this session, so the three hashes (`e978f912…`, `f1567096…`, `b4138d2f…`) were **not** recomputed. Every constituent value they cover was read and matches the preserved pre-state exactly.

Verdict: ZERO DATABASE CONTRACT CHANGE CONFIRMED (component-level), with the hash-recomputation gap disclosed.

## Y. Deferred Items Register

16.1 PROMOTED — items 1–12: all now `EXECUTED — QA PASSED` except #8/#9 (test-suite verification and failing-test baseline classification) which are `EXECUTED — QA BLOCKED (unverified baseline)`, and #12 which is `EXECUTED — QA PASSED (component-level, hash gap)`.

16.2 BLOCKED — items 13–42: unchanged, all still blocked pending the separate Database Authority Execution Prompt (browser DML privilege closure, four write-policy removal, `create_pos_sale` ACL revocation, three-helper `public, pg_temp`, internal-writer EXECUTE freeze, wrapper ACL preservation, trusted-schema guard, `post_manual_ledger_adjustment` ACL, policy name/body/hash assertions, rollback reconstruction, PUBLIC POS guard, rollback preconditions, table comments, FORCE-RLS, function owner/SECDEF/proconfig, table/function ACL and grant-option assertions, helper OIDs, service-role authority, zero column ACL, zero inheritance, REVOKE ALL → GRANT SELECT, four hashes, forward migration, rollback artifact, forward→rollback→forward drill, database QA, database acceptance re-audit).

16.3 DEFERRED — TRACKED — items 43–66: unchanged and still tracked (Internal Cost terminology/zero semantics/labels, HR salary atomicity/idempotency/reversal/deletion protection, expense reversal, supplier payable lifecycle and authority, full POS under WS-DH-2026-0005, future `create_pos_sale` activation, manual ledger adjustment UI, residual privilege hardening, `has_permission` schema qualification, duplicate ledger SELECT policy, TEMP grant to PUBLIC, PUBLIC EXECUTE on helpers, `sandbox_exec*` privileges, historical import objects, `owner_id` binding, statement `effective_date` cutover, shadow draft invoices, doctor billing unification).

No item removed or reclassified.

## Z. Application Zero-Regression Assessment

Typecheck and production build pass; 268 of 269 tests pass; the single failure is in an untouched module with an untouched import graph. No Stage-A row, migration, policy, ACL or governance artifact changed. ZERO REGRESSION TO PROMPTS 01–21 CONFIRMED FOR APPLICATION PHASE.

## AA. Blockers and Gaps

1. BLOCKER — invoice-PDF RTL failure classified UNVERIFIED PRE-EXISTING; no recorded pre-execution baseline exists.
2. GAP — preserved fingerprint algorithms not reproducible here; hashes not recomputed (all constituent values verified).
3. GAP — canonical/default branch identity not resolvable in this environment.
4. GAP — no separate lint script evidence captured.

## AB. Recommendation

Issue one narrowly scoped prompt that establishes the baseline for `InvoicePDFGenerator.test.ts` (authorizing a read-only baseline test execution at pre-execution HEAD `ee1ee63e`, or an authorized fix of the RTL assertion), then re-issue Application QA; Database Authority Execution remains blocked until then.

## AC. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY APPLICATION POST-EXECUTION QA ONLY.
Stage A remains accepted, persisted and verified.
WS-DH-2026-0003 remains ACTIVE.
Prompt 21 Application Execution is not Acceptance.
Application QA passes only if all mandatory QA gates in this report pass.
Database Authority Migration has not started.
No Policy, ACL, Function, Helper, Comment, Schema or financial-row change was authorized or performed by this QA.
No governance file was modified.
Stage C and Stage D have not started.
No Acceptance or Workstream Closure occurred.

## AD. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.
Application QA does not complete Phase 1.
WS-DH-2026-0005 remains DEFERRED.
No new Roadmap, Phase, Workstream or Decision ID was created.
No Phase advancement, Phase Closure or Roadmap Closure occurred.

## AE. Run Metadata and Exact Stopping Point

Mode: Plan/Chat — read-only. Operation: Application Post-Execution QA. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-APPLICATION-POST-EXECUTION-QA-22. Status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED. Preparation: 04-08-2026 05:49 Asia/Riyadh. Run start/end and final report time: Exact time not recorded (run occurred 04-08-2026, ~05:56–06:0x Riyadh). Branch: `edit/edt-907c65c8-…`; canonical branch evidence unavailable. HEAD `944ea916`; Prompt-21 pre-execution HEAD `ee1ee63e` (proven parent); post-execution HEAD `095aed91`. Working tree clean before and after; zero staged/unstaged/untracked tracked changes. Prompt-21 intended paths = the 19 paths in H; post-21 aggregate adds `docs/**` governance paths only. Database writes 0; source writes 0; migrations changed 0; financial rows changed 0; Stage-A rows changed 0. Knowledge, Skill and settings changes: 0. `.lovable/plan.md` rewritten by Plan Mode (disclosed). Eleven verdicts returned in A. Database Authority Migration: not started. Acceptance: not started. Closure: none.

Exact stopping point: Prompt 21 application execution is independently verified across expense cutover, legacy-writer removal, backfill removal, browser-DML absence, POS inert fencing, typecheck, build and database contract stability; the sole outstanding gate is the unverified baseline of the invoice-PDF RTL test. Recommended next mode: Plan/Chat read-only for the baseline-establishment prompt.
