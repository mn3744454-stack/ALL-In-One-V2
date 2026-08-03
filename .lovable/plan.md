# Stage A Acceptance Persistence Verification and Stage B Readiness Review

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-ACCEPTANCE-PERSISTENCE-VERIFICATION-AND-STAGE-B-READINESS-10
Mode: Plan/Chat — Read-Only. Database changes: zero. Repository changes: zero (this plan file only).

## A. Combined Verdict

1. Acceptance Persistence: `STAGE A ACCEPTANCE PERSISTENCE VERIFIED`
2. Stage B Readiness: `STAGE B READY FOR OWNER ALIGNMENT AND EXECUTION PLANNING`

Stage B scope is materially larger than the Prompt-10 premise: the legacy writer in `useLedger.ts` is dead code, but two other browser-direct ledger writers are live and can still create NULL `effective_date`.

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE — STAGE A ACCEPTED; STAGE B NOT STARTED. Stage A: executed, re-audited PASSED, Owner accepted, persisted, now verified. Stage B/C/D: not started. Workstream-wide Technical Acceptance: incomplete. Closure: none.

## C. Evidence Boundary

Verified repository facts: git lineage, six changed paths, eight file versions, registry rows, writer inventory. Verified live-DB facts: `ledger_entries` columns (`effective_date` nullable, no default), 3 policies, 7 finance RPC signatures (all SECURITY DEFINER). Prompt 09 claims confirmed: all. Not independently provable: wall-clock execution times (commits show 2026-08-03 16:22–16:25 UTC). Gaps: `information_schema.role_table_grants` returned only `sandbox_exec` rows under the read role, so `authenticated` grants on `ledger_entries` were not directly observable; no runtime write test performed.

## D. Prompt 09 Git Lineage

Branch `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`; no canonical/default branch evidence captured. HEAD before `2cc1f0e96`; HEAD after `014276978` (= current HEAD, no later commits). Ancestry linear, 9 commits `abaab4631, 7587e0ab1, d92b3f967, b3916b560, f582e6ee5, 24cd9aca0, 72a9c31af, 4203f56b3, 014276978`, 16:22:27–16:25:00 UTC. Aggregate changed paths = exactly the six approved paths. Working tree clean; zero staged, unstaged, untracked paths. `.lovable/plan.md` disclosure: written by this Plan-Mode run only; not part of the Prompt 09 range.

## E. Six-File Verification Matrix

| File | Expected | Actual | Expected state | Actual state | Result |
|---|---|---|---|---|---|
| RM-DH-004 roadmap.md | 1.1.1 | 1.1.1 | Active Phase 1; Stage A register accurate | Status `ACTIVE — STAGE A ACCEPTED; STAGE B NOT STARTED`; Stage A Register present (28/87/0 mismatch/0.00/7 clients/3 tenants/10 files/rollback ready/D-1→D-5/OBS-A-01 non-blocking); Phase 1 not complete; no Closure | PASS |
| RM-DH-004 changelog.md | 1.1.1 | 1.1.1 | 3 appended entries, priors intact | Re-Audit Passed; Owner Acceptance `2026-08-03T19:15:00+03:00`; Persistence `Exact time not recorded`; priors unrewritten | PASS |
| WS-DH-2026-0003 workstream.md | 1.1.1 | 1.1.1 | Stage A accepted, verification pending | Status and Stage exact; 21-row ordered stage history; Stage B/C/D not started | PASS |
| docs/roadmaps/README.md | 1.2.1 | 1.2.1 | 8-col schema, RM-DH-004 row synced | Single synced row; other roadmaps byte-identical | PASS |
| docs/workstreams/README.md | 1.4.1 | 1.4.1 | 7-col schema, WS row synced | Row 52 synced; no WS-0004…0011 rows created | PASS |
| docs/README.md | 1.13.1 | 1.13.1 | Version cells synced | 1.2.1 / 1.4.1 / 1.1.1 / 1.1.1 / 1.1.1; README 1.0.0 and decisions 1.1.0 unchanged | PASS |

## F. Registry and Link Validation

Both registry schemas unchanged; no duplicate rows; no duplicate authoritative Document ID; no new decision ID (`DEC-RM-DH-004-001`/`-002` untouched). Package links in `docs/README.md` §navigation resolve to existing files. Broken links: none found. PRE-DEF-01 and PRE-DEF-02 unchanged.

## G. Unchanged-Path Verification

`git diff 9ecb0f427..HEAD` over the evidence directory, `src/**`, `supabase/**`, RM-DH-004 `README.md` and `decisions.md` returned zero paths. Evidence package still exactly 10 files. Migrations, tests, other governance packages, Knowledge, Skills and settings: unchanged.

## H. Acceptance Persistence Blockers

None.

## I. Stage B Writer Inventory

| Writer / caller | Path or DB object | Side | Reachable? | effective_date? | Permission | Atomic? | Stage B action |
|---|---|---|---|---|---|---|---|
| `useLedger.createEntry` + insert/upsert | `src/hooks/finance/useLedger.ts:104-149` | client | DEAD_OR_UNREFERENCED (zero importers of the symbol repo-wide) | No | RLS policy only | No | Remove |
| `postLedgerForInvoice` | `src/lib/finance/postLedgerForInvoice.ts:178-205` | client | ACTIVE_REACHABLE via `usePOSCore.ts:163` ← `DashboardFinancePOS.tsx:195` | No | RLS policy only | No | Reroute to `create_pos_sale` |
| `postLedgerForExpense` | `src/lib/finance/postLedgerForExpense.ts:52-63` | client | ACTIVE_REACHABLE via `DashboardFinance.tsx:311` (expense approval) | No | RLS policy only | No (no balance update) | Reroute to `post_expense_with_ledger` |
| `backfillLedgerDescriptions` | `src/lib/finance/…:117` | client | ACTIVE_REACHABLE (dynamic import, DashboardFinance.tsx:347) | n/a (updates `description` only) | RLS | n/a | Keep or gate; non-economic |
| `useLedgerEntries` / statement / payment readers | multiple hooks | client | ACTIVE_REACHABLE | read-only | RLS | n/a | No change (Stage C) |
| `_finance_ledger_insert`, `post_payment`, `post_payment_session`, `approve_invoice`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `create_pos_sale`, `create_source_checkout_invoice` | DB, SECURITY DEFINER | server | ACTIVE | Yes (explicit param) | server-side | Yes | Canonical targets |

## J. Legacy Writer Reachability and Risk

Proven: `useLedger.createEntry` has no caller — only `useLedgerEntries` (read) is imported, at `DashboardFinance.tsx:15,333,628`; it is dead code and presents no live runtime risk. Proven: `postLedgerForInvoice` and `postLedgerForExpense` are live, omit `effective_date` (nullable, no default) and therefore reintroduce exactly the defect Stage A corrected; they read-then-write `balance_after` without an advisory lock (lost-update and drift risk), and `postLedgerForExpense` writes `balance_after: 0` with no `customer_balances` update. Possible risk: the `Permission-based insert ledger entries` policy (`finance.invoice.edit`) permits any holder of that permission to insert arbitrary `entry_type`/amount/`balance_after` from the browser. Disproven: `useLedger.ts` is not itself a live NULL-date source. Historical data impact: none — no path rewrites the Stage A rows.

## K. Replacement-Option Comparison

| Option | Evidence fit | Preserves capability? | Risk | Scope | Verdict |
|---|---|---|---|---|---|
| A Remove dead client writer | Fits `useLedger.ts` only | Yes (nothing used it) | Leaves the two live NULL-date writers | Too narrow | Necessary but insufficient |
| B Reroute to existing RPC | `create_pos_sale`, `post_expense_with_ledger`, `post_manual_ledger_adjustment` already exist, SECURITY DEFINER, take explicit dates/idempotency keys | Yes | Payload-shape mismatch must be verified per RPC | Bounded frontend cutover + deletion | RECOMMENDED |
| C Create/extend bounded RPC | No gap found — a manual-adjustment RPC already exists | n/a | Unnecessary surface | Larger | Rejected |

## L. Recommended Stage B Contract

`REROUTE TO EXISTING SERVER-SIDE RPC` (with removal of the dead writer as part of the same slice).

Repository scope — required: `src/hooks/pos/usePOSCore.ts` (createSale → `create_pos_sale`), `src/pages/DashboardFinance.tsx` (expense approval → `post_expense_with_ledger`), delete `src/lib/finance/postLedgerForInvoice.ts` and `postLedgerForExpense.ts`, strip the mutation from `src/hooks/finance/useLedger.ts`, add a regression test asserting zero browser-direct `ledger_entries`/`customer_balances` writes. Conditional: `src/lib/finance/invoiceRpc.ts` (typed wrapper for `create_pos_sale`), POS contract tests. Excluded: statements, exports, PDF, POS UI redesign.

Database scope: expected zero. Conditional only if payload verification shows `create_pos_sale` cannot express the current cart shape — then one bounded, additive migration, requiring new Owner alignment.

Data scope: zero historical rows. No change to the 28 corrected dates, the 69 `balance_after` corrections, invoices, balances, sessions or allocations.

Rollback: revert the application commit; no database rollback needed if no migration ships; if one does, drop/restore the prior function definition. Stage A data untouched in all cases.

Acceptance criteria: the 17 criteria in §14.7 of the prompt, notably zero browser-direct ledger/balance writes in repository search, POS sale and expense approval still work end to end, NULL `effective_date` impossible on every new entry, tenant/client/permission rejection paths verified server-side, ledger and `customer_balances` synchronized, atomicity and duplicate-submission protection verified, zero Stage A row change, no `NOT NULL`, no Stage C/D. Build/typecheck alone is not Acceptance; separate QA and read-only Acceptance Re-Audit remain required.

## M. Owner Decisions

| ID | Question | Options | Recommendation | Dayli Horse example | Delay consequence |
|---|---|---|---|---|---|
| D-B-1 | Is a manual Ledger Adjustment a supported capability, or is the dead writer removed outright? | Remove only / expose `post_manual_ledger_adjustment` in the UI | Remove only in Stage B; expose later if a real need appears | Writing off 150.00 of a boarding balance | Stage B stalls on scope |
| D-B-2 | Which Economic Date should the POS and expense cutover post? | Business event date (sale date / expense_date) / posting date | Business event date | Expense dated 28-07 approved 03-08 posts to 28-07 | Cutover could bake in the wrong date semantics |
| D-B-3 | If `create_pos_sale` cannot express the current cart payload, may Stage B ship one additive migration? | Yes, bounded / no, re-align first | Yes, bounded, disclosed in the execution prompt | POS cart with mixed service and product lines | Stage B blocks mid-execution |

## N. Proposed Rollback and Acceptance Criteria

As stated in §L; both are complete for a future Agent/Build prompt and are not executed here.

## O. Stage B Blockers

None. Note the corrected scope: three writers, not one.

## P. WORKSTREAM PERSISTENCE

NONE — READ-ONLY ACCEPTANCE PERSISTENCE VERIFICATION AND STAGE B READINESS REVIEW ONLY. Stage A Acceptance Persistence has been reviewed but no additional Acceptance or Workstream-state persistence occurred. WS-DH-2026-0003 remains ACTIVE. Stage B implementation has not started. Stage C and Stage D have not started. No Workstream Closure occurred.

## Q. ROADMAP IMPACT

RM-DH-004 remains ACTIVE — PHASE 1. This review does not complete Phase 1. No Phase advancement, Phase Closure or Roadmap Closure occurred.

## R. Recommended Next Step

Obtain Owner decisions D-B-1 to D-B-3, then prepare the Stage B Agent/Build execution prompt for the rerouting cutover.

## RUN METADATA AND EXACT STOPPING POINT

Mode Plan/Chat read-only; Operation Stage A Acceptance Persistence Verification and Stage B Readiness Review; Prompt ID as above; status received UNSENT DRAFT — NUMBER NOT YET CONSUMED; prepared 03-08-2026 19:57 Asia/Riyadh; Master Register `Dayli_Horse_ChatGPT_Project_Master_Register_AR_v0.15.0`, OWNER CONFIRMED ACTIVE PROJECT SOURCE, untouched. Run start 03-08-2026 20:05 Asia/Riyadh; first activity git lineage capture; run end and final report time 03-08-2026 approx. 20:12 Asia/Riyadh; last activity live-database catalog query. Timestamp source: platform message clock and git commit timestamps. Branch `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`; canonical/default branch evidence not captured. HEAD before `2cc1f0e96`, after `014276978`, current `014276978`. Working tree clean before and after; zero staged, unstaged and untracked paths before and after. Repository paths read: 8 governance files, 12 finance source files, POS hooks and pages. Database queries: 4 schema/policy/grant/function catalog queries; financial data-row queries: zero; role `sandbox_exec`. Six governance files verified; unexpected repository paths zero; links checked 6, broken 0; IDs checked 8, duplicates 0; 10 Stage A evidence files verified unchanged. Direct Ledger writers found 3 (plus 1 description-only updater); active direct Ledger writers 2; direct Customer Balance writers 2; active 1. Owner decisions identified 3. Database changes zero; repository intentional changes zero; `.lovable/plan.md` written by Plan Mode this run and disclosed here; application, schema, migration, Project Knowledge, Workspace Knowledge, Skill and settings changes all zero. Verdicts: `STAGE A ACCEPTANCE PERSISTENCE VERIFIED`; `STAGE B READY FOR OWNER ALIGNMENT AND EXECUTION PLANNING`. Stage B implementation not started; Stage C not started; Stage D not started; Workstream-wide Technical Acceptance incomplete; Closure none.

Exact stopping point: Stage A Acceptance Persistence has been independently verified. Stage B writer reachability, replacement architecture, scope, rollback, Acceptance criteria and any genuine Owner decisions have been reported. No Stage B, Stage C or Stage D implementation has occurred.

Recommended next step: obtain the three Owner decisions, then prepare the Stage B execution prompt. Recommended next Mode: Plan/Chat — Owner Alignment.
