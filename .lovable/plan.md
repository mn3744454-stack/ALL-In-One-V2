# PROMPT 46 — CONTINUATION A1 — EXECUTION EVIDENCE COMPLETION AND FAILED-TEST ATTRIBUTION

Mode: Plan/Chat — read-only evidence completion. No code, test, migration, database, RLS, RPC or repository content was modified.

## 9. FINAL VERDICT (stated first)

PROMPT 46 EXECUTION EVIDENCE COMPLETED — READY FOR FINAL STAGE-C QA

Arabic RTL attribution: **A. ARABIC RTL FAILURE PROVEN PRE-EXISTING AND UNCHANGED**

## A. Executive Verdicts

- Implementation preserved unmodified; nothing was rewritten or repaired in A1.
- Prior claim "310/311 pass with exit code 0" is WITHDRAWN. The earlier command piped through `tail` without `pipefail`, so the reported exit code was the pipeline's, not Vitest's. Corrected: `bunx vitest run src/components/finance` exits **1**.
- The single failure is `InvoicePDFGenerator.test.ts > createInvoiceHTML — Arabic direction & bidi isolation > emits lang=ar and dir=rtl on the root`, proven pre-existing by running the identical test against the Prompt-46 pre-execution HEAD, where it fails with a byte-identical assertion message.
- Typecheck exit 0. Build exit 0 (previously never run — now completed).

## B. Complete Roadmap

RM-DH-004 — Financial Truth & Historical Data Migration / Phase 1 — Economic Date Integrity / Stage C — Read-Path Cutover / Slice C — Final Read Paths. Continuation A1 under consumed Prompt 46; no new Prompt number consumed.

## C. Preflight

- Branch: `edit/edt-2b437e63-21b7-4a92-b0e9-dc6995a0fa07`
- Working tree before A1: clean (`git status --porcelain` empty)
- Working tree after A1: clean; the only artifact written is the platform-managed `.lovable/plan.md`
- Temporary disposable snapshot: `/tmp/pre46` (outside repository), created by `git archive <pre-HEAD> | tar -x`, used only to run one test, **removed** afterwards (`rm -rf /tmp/pre46`, confirmed). No `git worktree`, no branch, no stash, no commit.

## D. Evidence Boundary

Repository files, Git object history, Vitest, tsgo, Vite build, and read-only SQL SELECTs. Zero database writes. Zero repository writes. No Acceptance, no QA, no Stage D.

## E. Source-Date Contract Matrix

| entity_type | source table | authoritative date field | DB type | nullable | linked financial_entries | resolved | Unknown |
|---|---|---|---|---:|---:|---:|---:|
| vet_treatment | vet_treatments | `completed_at`, else `scheduled_for` | timestamptz | YES / YES | 3 | 3 | 0 |
| vaccination | horse_vaccinations | `administered_date` | date | YES | 1 | 1 | 0 |
| breeding_attempt | breeding_attempts | `attempt_date` | timestamptz | NO | 1 | 1 | 0 |
| foaling | foalings | `foaling_date` | date | NO | 0 | 0 | 0 |
| (unsupported types) | — | — | — | — | 0 | 0 | 0 |
| **Total** | | | | | **5** | **5** | **0** |

Column types/nullability read from `information_schema.columns`. Excluded by contract and verified in code: `vet_treatments.requested_at` (administrative), `horse_vaccinations.due_date` (future schedule), and all `created_at` / `updated_at` columns.

Query behaviour:
- Batch source queries actually issued for the live data set: **3** (`vet_treatments`, `horse_vaccinations`, `breeding_attempts`); `foalings` is skipped because no entry references it. Maximum is 4 — one per supported entity type, never per row.
- Total financial entries read: 5. Resolved: 5. Unknown: 0. Missing source rows: 0. Missing source dates: 0.
- No row uses `created_at` as `business_date`: `financialEntryBusinessDate.ts` lists no audit column in any `dateColumns` array, and `pickSourceBusinessDate` returns `{null, null}` when no contract column yields a value.
- No N+1: `groupSourceIdsByType` de-duplicates ids into one `.in("id", ids)` query per entity type inside a single `Promise.all`.
- `financial_entries` still has no business-date column; nothing was added or backfilled.

## F. Final Allowlist (paths touched by Prompt 46)

Substantive (8):
1. `src/lib/finance/financialEntryBusinessDate.ts` (new)
2. `src/hooks/finance/useFinancialEntries.ts`
3. `src/components/finance/InternalCostsTab.tsx`
4. `src/components/finance/InvoicePDFGenerator.tsx`
5. `src/i18n/locales/en.ts`
6. `src/i18n/locales/ar.ts`
7. `src/lib/finance/__tests__/stageCSliceCFinancialEntryBusinessDate.test.ts` (new)
8. `src/components/finance/__tests__/InvoicePDFGenerator.paymentDisclosure.test.ts` (new)

Platform-managed, reported separately: `.lovable/plan.md` (commits `d12cdc98`, `51631a07`).

## G. Financial Entries Before-State

5 rows, all with an `entity_type`/`entity_id` link; no business-date column; display previously driven by `created_at`.

## H. Financial Entries Implementation

Read-time inheritance only, batched, additive `business_date` + `business_date_source` fields, `null` = Unknown with no `created_at` fallback, ordering `business_date DESC NULLS LAST, created_at DESC, id DESC`, dual-date UI (Cost Date vs Recorded On / تاريخ التسجيل, Unknown / غير محدد).

## I. Invoice PDF Correction

Diff limited to 10 changed lines: import of `formatEconomicDate` plus two call-site swaps replacing `formatStandardDate` for `p.effective_date` and `sess.effectiveDate`. No change to `lang`, `dir`, root wrapper, bidi helpers or pagination.

## J. Output Evidence

Economic dates render as `dd-MM-yyyy` from string slicing (`formatEconomicDate`), never through `new Date(...)`, eliminating negative-offset day shift. Audit timestamps continue to use `formatStandardDateTime`.

## K. Tests (each run separately, exit code captured immediately, no exit-code-masking pipeline)

| # | Command | Exit | Files | Passed | Failed | Skipped | Duration |
|---|---|---:|---|---:|---:|---:|---|
| 1 | `bunx vitest run src/lib/finance/__tests__/stageCSliceCFinancialEntryBusinessDate.test.ts` | 0 | 1 passed | 15 | 0 | 0 | 667 ms |
| 2 | `bunx vitest run src/components/finance/__tests__/InvoicePDFGenerator.paymentDisclosure.test.ts` | 0 | 1 passed | 10 | 0 | 0 | 1.40 s |
| 3 | `bunx vitest run src/lib/finance/__tests__/stageCEconomicDateContract.test.ts` | 0 | 1 passed | 14 | 0 | 0 | 607 ms |
| 4 | `bunx vitest run src/lib/finance/__tests__/stageCSliceBExportDateParity.test.ts` | 0 | 1 passed | 12 | 0 | 0 | 1.25 s |
| 5 | `bunx vitest run src/lib/finance` | 0 | 15 passed | 268 | 0 | 0 | 2.51 s |
| 6 | `bunx vitest run src/components/finance` | **1** | 1 failed / 3 passed | 42 | 1 | 0 | 1.74 s |
| 7 | `bunx vitest run src/hooks/finance` | **1** | — | 0 | 0 | 0 | n/a — `No test files found` (directory contains no test file; not a failure of code) |
| 8 | `bunx vitest run src/components/finance/__tests__/InvoicePDFGenerator.test.ts -t "emits lang=ar and dir=rtl on the root"` (executed at pre-execution HEAD, see §4) | **1** | 1 failed | 0 | 1 | 16 | 1.31 s |

Note on item 2: the file contains 10 tests (5 economic-date parity assertions plus supporting cases).

## L. Attribution of the Arabic RTL Failure

- File: `src/components/finance/__tests__/InvoicePDFGenerator.test.ts`
- Suite / test: `createInvoiceHTML — Arabic direction & bidi isolation` › `emits lang=ar and dir=rtl on the root`
- Assertion: `expect(html).toMatch(/dir="rtl"/)` (the preceding `expect(html).toMatch(/lang="ar"/)` also cannot match)
- Expected: `/dir="rtl"/`
- Actual: `'<div class="pdf-body" data-lang="ar">…'` — the exported `__createInvoiceHTMLForTest` returns only the paginated body fragment; `lang`/`dir` live on the `<html>` element emitted later in the print document (`<html lang="${options.lang}" dir="${dir}">`, line 650 at pre-HEAD).
- First commit containing the failure: `2f52f8cf9` (2026-07-27T03:22:41Z) — the pagination refactor that changed `createInvoiceHTML` to `return \`<div class="pdf-body" …\`` while the test kept asserting the old full-document root. `fabc618f1` (2026-07-26) does not contain that return; `2f52f8cf9` and every later commit do. Prompt 46 is dated 2026-08-05.
- Same test on Prompt-46 pre-execution HEAD `b13efcb2e85d6dc18dea1a90def27d74a3754e50`: **FAILS** with the identical assertion text and identical received string.
- Prompt-46 diff to `InvoicePDFGenerator.tsx` (10 lines) touches only payment-date formatting; it does not touch `lang`, `dir`, the root wrapper or `__createInvoiceHTMLForTest`.

Classification: **A. ARABIC RTL FAILURE PROVEN PRE-EXISTING AND UNCHANGED**

## M. Typecheck and Build

| Command | Exit | Notes |
|---|---:|---|
| `bunx tsgo --noEmit -p tsconfig.app.json` | 0 | no diagnostics |
| `bun run build` | 0 | `✓ 4625 modules transformed`, `✓ built in 25.12s`. Pre-existing advisories only: browserslist data 8 months old; `sonner` mixed static/dynamic import; main chunk 5,604.77 kB > 500 kB. None introduced by Prompt 46. |

Build success was measured directly, not inferred from typecheck.

## N. Diff and Git Evidence

- Branch: `edit/edt-2b437e63-21b7-4a92-b0e9-dc6995a0fa07`
- HEAD before Prompt 46: `b13efcb2e85d6dc18dea1a90def27d74a3754e50`
- Current HEAD: `51631a079bc7c1c6e6a3ba04a057bf5eeeafa532`
- Prompt-46 content commits (15, linear, each parent = previous):
  `04ceea6c…` → `d8f3e221…` → `bb8e1e6d…` → `3183ac7b…` → `93ce7045…` → `afdb2ed0…` → `5ec618d9…` → `ebb39f39…` → `61f4582c…` → `5235f43b…` → `9f05137e…` → `d7a3b316…` → `a0bbbb66…` → `0057c66b…` → `6169f212caecc5499dbe7057c2225b1748d77722`
- Merge: `b6ee23433ced62946c93114d1f14841f87990593` (parents `b13efcb2…`, `6169f212…`)
- Post-merge platform-managed commits: `d12cdc98…` and merge `51631a07…`, both `.lovable/plan.md` only
- Aggregate `git diff --stat b13efcb2…b6ee2343…`: **8 files changed, 579 insertions(+), 9 deletions(-)** — matches the allowlist in §F exactly, with no unexpected path
- Latest commit touching `InvoicePDFGenerator.tsx`: `5ec618d94` (2026-08-05T09:15:52Z, inside the Prompt-46 chain)
- Working tree before and after A1: clean. Post-execution drift: none.

## O. Zero Regression

No repository write, no database write, no migration, no RLS/RPC/Edge Function change, no financial row change, no settings, Skills, Roadmap or Workstream change. All 268 `src/lib/finance` tests pass; the only `src/components/finance` failure is the proven pre-existing RTL assertion.

## P. Blocking Findings

None.

## Q. Non-Blocking Residuals

1. Pre-existing stale test: `emits lang=ar and dir=rtl on the root` asserts against the pre-pagination full-document root. Origin `2f52f8cf9`, unrelated to Stage C.
2. `src/hooks/finance` contains no test files, so Vitest exits 1 for that path by design.
3. Build advisories (browserslist age, `sonner` mixed import, >500 kB chunk) — all pre-existing.

## R. One Recommendation

Fix the stale RTL assertion under a separate, clearly-scoped correction: assert `data-lang="ar"` on the `.pdf-body` fragment and move the `lang`/`dir` assertion to the print-document builder. Keep it outside RM-DH-004 Stage C so the economic-date lineage stays clean.

## S. WORKSTREAM PERSISTENCE

WORKSTREAM REGISTRY PERSISTENCE: UNCHANGED. WS-DH-2026-0003 remains the active Economic Date Integrity Workstream. No package created, no registry edit, no ID consumed in A1.

## T. ROADMAP IMPACT

RM-DH-004 remains ACTIVE. Phase 1 remains ACTIVE. Stage A: ACCEPTED — PERSISTED. Stage B: ACCEPTED — PERSISTED. Stage C Slice A and Slice B: Acceptance Re-Audit passed, awaiting Owner Acceptance. Stage C Slice C: executed, evidence now complete, **not** QA'd and **not** accepted. Stage D: NOT STARTED. No advancement, no Closure.

## U. Complete Deferred Items Register

1. Actual code Refactoring. 2. Feature Pack implementation. 3. Module activation implementation. 4. Subscription and pricing implementation. 5. New Feature implementation. 6. Missing Module implementation. 7. Skills revision. 8. Root AGENTS.md creation. 9. Workspace Knowledge use. 10. Documentation 01–13 historical recovery. 11. Cross-project sharing changes. 12. RM-DH-003 governance persistence Owner Acceptance. 13. Any technical defect discovered by a later Persistent Knowledge Stage B audit. 14. Any Project Knowledge installation. 15. Memory Genesis investigation. 16. Refactoring Baseline investigation. 17. `supplier_payables` economic-date contract — DEFERRED (immature domain, 0 rows). 18. Stale Arabic RTL PDF root assertion (`2f52f8cf9`) — DEFERRED, non-blocking, separate correction.

## V. Run Metadata and Exact Stopping Point

- Mode: Plan/Chat, read-only evidence completion. Parent Prompt: PROMPT-…-STAGE-C-SLICE-C-FINAL-READ-PATH-EXECUTION-46. Continuation A1. No new Prompt number consumed.
- Run date/time: 05-08-2026, 12:28–12:40 Asia/Riyadh (09:28–09:40 UTC). Exact per-command wall-clock start times not recorded.
- Repository writes: None (except platform-managed `.lovable/plan.md`). Database access: read-only SELECT only. Database writes: None. Application changes: None. Project Knowledge / Workspace Knowledge / Skills / AGENTS.md changes: None.
- Temporary artifacts: `/tmp/pre46` created and removed; `/tmp/*.txt` command logs outside the repository.
- Stopping point: stopped after test reruns, RTL attribution, typecheck, build, source-date matrix and Git evidence. No QA, no Acceptance Re-Audit, no Acceptance, no Stage D.
- Next permitted action: Final Stage-C QA of Slice C under a new Prompt.
