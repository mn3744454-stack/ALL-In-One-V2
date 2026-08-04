# PROMPT 39 — STAGE-C SLICE-A INDEPENDENT QA (READ-ONLY)

## A. Executive Verdicts

- Scope: STAGE-C SLICE-A READ-ONLY QA SCOPE PRESERVED
- Lineage: PROMPT-38 SLICE-A IMPLEMENTATION LINEAGE VERIFIED
- Code: STAGE-C SLICE-A CODE CONTRACT VERIFIED
- Function: FIRST-ACTIVITY LIVE FUNCTION CONTRACT VERIFIED
- Chronology: LIVE ECONOMIC CHRONOLOGY VERIFIED ON DIVERGENT ROWS
- Opening: PRE-RANGE OPENING-BALANCE QA PASSED
- Running: DISPLAY-DERIVED RUNNING-BALANCE QA PASSED
- Parity: VISUAL PREVIEW UNAVAILABLE — STRUCTURAL PARITY VERIFIED
- First activity: FIRST FINANCIAL ACTIVITY QA PASSED
- Tests: STAGE-C SLICE-A TARGETED TESTS INDEPENDENTLY PASSED
- Typecheck: STAGE-C SLICE-A TYPECHECK INDEPENDENTLY PASSED
- Build: STAGE-C SLICE-A BUILD INDEPENDENTLY PASSED
- Regression: STAGE-C SLICE-A ZERO-REGRESSION QA PASSED
- Writes: ZERO REPOSITORY AND DATABASE WRITE CONFIRMED
- Prior stages: STAGE A AND STAGE B REMAINED CLOSED
- Final: STAGE-C SLICE-A INDEPENDENT QA PASSED — READY FOR SLICE-A ACCEPTANCE RE-AUDIT

## B. Roadmap

RM-DH-004 Phase 1 (Economic Date Integrity) active. Stage A closed, Stage B closed, Stage C active at Slice A. Stage D not started. Phases 2–8 not started. No Closure.

## C. Preflight and Lineage

- Branch: `edit/edt-5fa38a4e-cf33-4c29-b457-f2e06dbdf0c7`
- HEAD: `302ec9118d37ca487c3cb2db3765ff82d3437b2e` ("Implemented effective date slice")
- HEAD parents: `21e5113b49d7a90ca13b91ca15976e4becb4ee57`, `c4a213a9c2189f6696fd216a1afb778e5724fdb4`
- Prompt-38 implementation chain (all reachable from HEAD): `c4a213a9c2189f6696fd216a1afb778e5724fdb4` → `b3c14992a672f8acd9b935cf0532d95a5fe87262` → `e2be0a96a794d61b0e2c8fa01c0f189c7b16ab18` → `acfc7d1d3884f1858fa73d271159a1cffb4fc309` → `72adfc2e6fb494327cf0786bbe8e2fa01ac9fa6a` → `c452bd651b6ed39267bbda1224335e0edd781ccd`
- Working Tree before and after QA: clean (`git status --porcelain` empty both times)
- Later drift on Slice-A paths after the Prompt-38 chain: none (latest commit touching those paths is `c4a213a9…`)
- Expected migration present: `supabase/migrations/20260804182812_4b8065f5-a507-4d24-a17c-6674f7c98ee3.sql` (newest migration in tree)

## D. Evidence Boundary

- Facts: repository inspection, Git lineage, read-only `psql` SELECTs, live `pg_proc` definition, test/typecheck/build runs.
- Prompt-38 claims verified: 88 ledger rows, 0 NULL `effective_date`, 27 divergent rows, targeted 14/14 pass, typecheck pass, build pass.
- Prompt-38 claim not reproducible as stated: "254 finance tests". The `src/lib/finance` glob yields 217 passing tests across 12 files; the InvoicePDFGenerator RTL test lives outside that path and was not executed here, so its pre-existing status is neither confirmed nor contradicted by this run.
- Gap: no interactive browser session was used; parity is verified structurally from code, not visually.

## E. Code-Contract QA

**Helper — `src/lib/finance/effectiveDate.ts`**: declares `effective_date` as the sole economic chronology, keeps `created_at` explicitly as audit/tie-breaker, provides `compareEconomicOrder` with asc/desc mirroring across `date → createdAt → id`, string-based `formatEconomicDate` (no `new Date("yyyy-MM-dd")`, no UTC shift), inclusive `isWithinEconomicRange`, and integer-cent `toCents`/`fromCents`/`sumMoney`. Legacy UTC-window helpers retained but marked `@deprecated` and scoped to non-financial/audit paths. VERIFIED.

**Query — `src/hooks/clients/useClientStatement.ts`**: selects `effective_date` plus `created_at` (audit only); orders `effective_date ASC, created_at ASC, id ASC` matching `ledger_entries_effective_composite_idx`; filters `.gte`/`.lte` on `effective_date` with `toEconomicDateString` (plain `yyyy-MM-dd`, both bounds inclusive, no UTC helper); sets `StatementEntry.date` from `effective_date`; retains `balance_after` only as `balance` with an explicit "audit metadata only" contract; preserves `.eq("tenant_id")` and `.eq("client_id")`. VERIFIED.

**Opening balance**: separate pre-range read, `lt("effective_date", cutoff)`, tenant- and client-scoped, paginated at 1000 rows with an explicit `.range()` loop so a default row cap cannot truncate the sum, accumulated in integer cents, returns 0 when `dateFrom` is absent, never sourced from the first visible row or from `balance_after`. VERIFIED.

**Running balance**: `ClientStatementTab.tsx` seeds `runningBalances` from `statement.openingBalance` (line 841), accumulates over `flatRows` already sorted by `compareEconomicOrder` (line 809), uses `toCents`/`fromCents`, holds the prior balance for neutralized rows (`scopedSummary.neutralizedRowIds`), and never writes or displays `balance_after` as authority. VERIFIED.

**Rendering**: statement rows use `formatEconomicDate` (lines 1391, 1411, 1451, 1465); Print and CSV both route through `formatDateForPrint` → `formatEconomicDate` (StatementPrintUtils lines 57–58, 151, 163, 237, 281, 315). Arabic and English share the identical underlying `yyyy-MM-dd` string. Generic ledger printing (`printLedgerEntries`, `exportLedgerCSV`) unchanged. VERIFIED.

## F. Migration and Live Function QA

Live `pg_proc` definition is byte-equivalent to the migration body.

- Signature `get_client_first_financial_activity(p_tenant_id uuid, p_client_id uuid)` — unchanged
- Returns `timestamp with time zone`; owner `postgres`; `prosecdef = t`; `proconfig = {"search_path=public, pg_temp"}`; `STABLE`
- Gates preserved: `auth.uid()` non-null, `is_tenant_member`, `has_permission(..., 'clients.statement.view')`, client-belongs-to-tenant
- Economic expression: `MIN(le.effective_date)`; future guard `le.effective_date <= current_date`
- Unrelated predicates (invoice_cancellation exclusion, draft/cancelled invoice exclusion) unchanged
- No write statement, no index, no RLS, no GRANT change

**Date-cast behavior**: the function returns `v_first::timestamp AT TIME ZONE current_setting('TimeZone')`, i.e. local midnight of the economic date in the session timezone. Live session `TimeZone` is `UTC`, so `2013-07-20` returns `2013-07-20 00:00:00+00`. The only caller, `useClientFirstActivity.ts`, does `String(at).slice(0, 10)` on the PostgREST string, which preserves the offset-local calendar date under both `UTC` and `Asia/Riyadh` sessions. No calendar-day shift is possible on this path. No BLOCKING DATE-CAST DEFECT.

## G. Divergent-Row Chronology QA

Live totals: 88 rows, 0 NULLs, **27 divergent rows** (Prompt-38 claim holds), 3 tenants, 8 clients, range 2013-07-20 → 2026-07-27.

| Tenant | Client | Rows | Divergent | Old/new order differs? | Same-date ties? | Result |
|---|---|---:|---:|---|---|---|
| 145f2128… | f225ffb7… | 37 | 15 | Yes | Yes (23) | PASS |
| 348ce41c… | 364165f0… | 15 | 1 | Yes | Yes (9) | PASS |
| 348ce41c… | 3e1f790b… | 5 | 3 | No | Yes (2) | PASS |
| 348ce41c… | 4461804b… | 14 | 2 | Yes | Yes (7) | PASS |
| 348ce41c… | 7e2a78b3… | 1 | 1 | No | No | PASS |
| 348ce41c… | a3165b28… | 6 | 2 | Yes | Yes (4) | PASS |
| 8951ac1a… | a279407b… | 4 | 3 | Yes | Yes (2) | PASS |

Order comparison used `array_agg(id ORDER BY effective_date, created_at, id)` versus `array_agg(id ORDER BY created_at, id)`; five of seven clients reorder materially, confirming Slice A is behaviorally live. Ties are broken deterministically by `created_at` then `id` in both SQL and `compareEconomicOrder`.

Date-only filter cases exercised inclusive bounds on a divergent row (2026-05-10 single-day range), a same-date tie set (2026-05-09), a month boundary (2026-02-01) and a year boundary (2026-01-01); every range returned exactly the expected row counts with both bounds inclusive and no UTC conversion.

## H. Opening-Balance QA

| Tenant | Client | From | Pre-range rows | Expected opening | Application opening | Diff | Result |
|---|---|---|---:|---:|---:|---:|---|
| 145f2128… | f225ffb7… | 2026-01-01 | 3 | 1200.00 | 1200.00 | 0.00 | PASS |
| 348ce41c… | 364165f0… | 2026-01-01 | 1 | 50.00 | 50.00 | 0.00 | PASS |
| 348ce41c… | 4461804b… | 2026-02-01 | 1 | 580.00 | 580.00 | 0.00 | PASS |
| 8951ac1a… | a279407b… | 2026-05-10 | 3 | 719.35 | 719.35 | 0.00 | PASS |

Application values reproduced from the hook's exact algorithm (`effective_date < from`, tenant+client scoped, cent-accumulated, paginated). No case relies on the first visible row or on `balance_after`; with no `dateFrom` the algorithm returns 0 by construction.

## I. Running-Balance QA

| Tenant | Client | From | To | Visible rows | Opening | Period sum | Expected closing | App closing | Diff | Result |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 145f2128… | f225ffb7… | 2026-01-01 | 2026-12-31 | 34 | 1200.00 | 130785.00 | 131985.00 | 131985.00 | 0.00 | PASS |
| 348ce41c… | 364165f0… | 2026-01-01 | 2026-07-27 | 14 | 50.00 | 2720.00 | 2770.00 | 2770.00 | 0.00 | PASS |
| 348ce41c… | 4461804b… | 2026-02-01 | 2026-04-03 | 13 | 580.00 | 325.00 | 905.00 | 905.00 | 0.00 | PASS |
| 8951ac1a… | a279407b… | 2026-05-10 | 2026-05-10 | 1 | 719.35 | 950.00 | 1669.35 | 1669.35 | 0.00 | PASS |

No mismatching ordered row was found in any case. Stored/derived divergence example — client `a279407b…`: stored `balance_after` follows the write sequence 1669.35 → 969.35 → 719.35 → 1669.35, where the final row (economic date 2026-05-10, written *earliest* at 21:17) carries a `balance_after` of 1669.35 that is not a valid running total under economic order; the derived display sequence is 1669.35 → 969.35 → 719.35 → 1669.35 seeded correctly per range, and the single-day range opens at 719.35 rather than the stored value, proving the display no longer trusts `balance_after`. No `balance_after` value was mutated during QA.

## J. Screen / Print / CSV Parity

One in-memory set drives all three: `flatRows` → `printEntries` (identical `id`, `date`, `createdAt`, balances from the same `runningBalances` map) → `printData` → `printStatement` / `exportCSV` / `exportPDF`.

| Case | Screen rows/order | Print rows/order | CSV rows/order | Date parity | Balance parity | Result |
|---|---|---|---|---|---|---|
| Divergent multi-row range (f225ffb7…) | flatRows, canonical | same array | same array | `formatEconomicDate` both sides | same `runningBalances` | PASS |
| Same-date tie set (a279407b…) | flatRows, canonical | same array | same array | identical | identical | PASS |
| Scoped/segment rows | segment inherits `row.entry.date` | same | same | identical | identical | PASS |

Totals also flow from the single `scopedSummary`. No fabricated time appears on any statement row in Screen, Print or CSV. **Visual preview inspection was not performed**; this is structural verification only.

## K. First-Activity QA

Expected `MIN(effective_date) WHERE effective_date <= current_date` per client (function's additional draft/cancelled-invoice exclusions may only move the value later, never earlier):

| Client | Expected first economic date | Function calendar date | Diff | Result |
|---|---|---|---|---|
| f225ffb7… | 2013-07-20 | 2013-07-20 (00:00+00) | none | PASS |
| 364165f0… | 2017-02-20 | 2017-02-20 | none | PASS |
| 4461804b… | 2026-01-30 | 2026-01-30 | none | PASS |
| 3e1f790b… | 2026-02-05 | 2026-02-05 | none | PASS |
| a3165b28… | 2026-01-31 | 2026-01-31 | none | PASS |
| a279407b… | 2026-05-09 | 2026-05-09 | none | PASS |
| 7e2a78b3… | 2026-07-25 | 2026-07-25 | none | PASS |
| a0705f81… | 2026-02-08 | 2026-02-08 | none | PASS |

Function was not invoked with a mutated role; authorization behavior was verified by definition inspection (unauthenticated raise, tenant-member raise, permission raise, tenant/client isolation via the `clients` existence check). Future-effective rows are excluded by `effective_date <= current_date`; the maximum live economic date is 2026-07-27, in the past relative to the run date.

## L. Tests, Typecheck and Build

- `bunx vitest run src/lib/finance/__tests__/stageCEconomicDateContract.test.ts` → 14/14 passed, exit 0
- `bunx vitest run src/lib/finance` → 12 files, 217/217 passed, exit 0 (no failures; the InvoicePDFGenerator RTL test is outside this path and was not executed)
- `tsgo --noEmit -p tsconfig.app.json` → exit 0, no diagnostics
- `bun run build` → exit 0, built in 23.45s (only the pre-existing chunk-size advisory)

## M. Zero Regression

Repository substantive writes: ZERO. Committed paths: ZERO. Working Tree clean before and after. Database writes / DDL / DML / financial-row writes / migration writes: ZERO — every database statement issued was a `SELECT`. Ledger row count 88 unchanged; `effective_date` NULLs remain 0; no `balance_after` value changed; no RLS or GRANT touched; Stable Contract and Emergency Rollback untouched. Temporary artifacts: `/tmp/t1.log`, `/tmp/t2.log`, `/tmp/tc.log`, `/tmp/b.log` (outside the repository) and `dist/` from the build (git-ignored, untracked). Stage A closed, Stage B closed, Stage C unaccepted, Stage D not started.

## N. Blocking Findings

None.

## O. Non-Blocking Residuals

1. The Statement Screen's "Customer-level Activity" block (`ClientStatementTab.tsx` lines 1290 and 1329) renders `formatDateTime12h(e.date)`. Its source, `useUnallocatedPayments.ts`, still selects, filters (`localDateFromToUtcIso` / `localDateToToUtcIso`) and orders by `created_at`, so those rows legitimately carry a timestamp and no fabricated time is produced. This surface is explicitly Deferred Item 26 (Unallocated Payments payment-date cutover) and outside Slice A; it is disclosed, not counted as a Slice-A defect. It does mean the statement page currently mixes an economic-date table with a created_at-based auxiliary block.
2. Prompt-38's "254 finance tests" figure is not reproducible under the `src/lib/finance` glob (217). Reporting artifact only; no functional impact.

## P. Final Result

**STAGE-C SLICE-A INDEPENDENT QA PASSED — READY FOR SLICE-A ACCEPTANCE RE-AUDIT**

## Q. Recommendation

Issue Prompt 40 — Stage-C Slice-A Acceptance Re-Audit (read-only), carrying Residual 1 forward as the natural head of Deferred Item 26.

## R. Workstream Persistence

Stage A closed. Stage B closed. Stage C Slice A implemented. Independent QA result: PASSED. Acceptance not started. WS-DH-2026-0003 active. No Closure.

## S. Roadmap Impact

Phase 1 active. Stage C current. Stage D not started. Phases 2–8 not started. No advancement, no Closure.

## T. Deferred Items Register

Items 1–20 (promoted to Prompt 39) are all executed and answered in this report. Items 21–37 remain BLOCKED PENDING PROMPT-39 RESULT and are now unblocked for Acceptance Re-Audit (21) only. Items 38–57 remain DEFERRED — TRACKED, unchanged and intact. No item removed.

## U. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only QA. 2. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-C-SLICE-A-INDEPENDENT-QA-39 — CONSUMED. 3. Prepared 04-08-2026 21:31 Asia/Riyadh. 4. Run start 21:38, end 21:46, report 21:47 Asia/Riyadh (UTC+03:00). 5. Timestamp evidence: message header 18:38 UTC; test runs stamped 18:40 UTC. 6–10. See Section C. 11. Code paths inspected: `effectiveDate.ts`, `useClientStatement.ts`, `ClientStatementTab.tsx`, `StatementPrintUtils.ts`, `useClientFirstActivity.ts`, `useUnallocatedPayments.ts`, `formatters.ts`, `displayHelpers.ts`, the Slice-A test file and the Prompt-38 migration. 12–14. See Section F. 15. Ledger rows 88. 16. NULLs 0. 17. Divergent 27. 18. Tenants 3, clients 8 (7 client pairs carry divergent rows). 19. Chronology cases 7 clients + 4 range cases. 20. Opening-balance cases 4. 21. Running-balance cases 4. 22. Parity cases 3. 23. First-activity cases 8. 24–26. See Section L. 27. Temporary artifacts: `/tmp/*.log`, `dist/` (untracked). 28–31. Repository substantive writes ZERO; database writes ZERO; financial-row writes ZERO; migration writes ZERO. 32. Stage A CLOSED. 33. Stage B CLOSED. 34. Slice-A QA result PASSED. 35. Acceptance NOT STARTED. 36. Stage D NOT STARTED. 37. Phase advancement NONE. 38. Closure NONE. 39. Stopping point: the Slice-A QA verdict and one recommendation. 40. Recommendation: Section Q. 41. Next Prompt: Prompt 40 — Slice-A Acceptance Re-Audit, Plan/Chat Read-Only.
