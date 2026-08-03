# Economic Date Integrity and 28-Row Demo Backfill Contract — Mini Audit (Read-Only)

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-AND-28-ROW-DEMO-BACKFILL-MINI-AUDIT-05

## A. Executive Verdict

`READY FOR OWNER ALIGNMENT AND STAGED EXECUTION PLANNING`

25 of 28 undated ledger rows have a directly verified authoritative source date. 3 rows depend on one cancellation-date policy decision. 2 of the 25 hit a server-side guard and need an explicit rule choice (still not evidence gaps).

## B. Evidence Boundary

Directly verified (live DB):
- `ledger_entries`: 88 rows total; 28 rows with `effective_date IS NULL`.
- Column `effective_date date`, nullable, no default, no CHECK on it.
- Every one of the 25 payment-type NULL rows has a linked `payment_sessions` row with a non-null `payment_date` (query returned 0 rows lacking it).
- 3 adjustment rows carry empty `metadata` and no invoice-side cancellation timestamp exists (`invoices` has only `issue_date`, `due_date`, `created_at`, `updated_at`, `payment_received_at`).

Directly verified (repository):
- `src/hooks/clients/useClientStatement.ts` selects, filters (`gte`/`lte`) and sorts on `created_at`.
- `src/hooks/clients/useUnallocatedPayments.ts` same pattern.
- `src/lib/finance/effectiveDate.ts` documents `created_at` as the canonical statement date.
- `get_client_first_financial_activity` uses `MIN(le.created_at)`.
- `_finance_ledger_insert` requires `p_effective_date` NOT NULL (raises `FIN_LEDGER_INSERT_BAD_ARGS`), so new server-written rows cannot be NULL.
- `post_payment` rejects `p_effective_date < invoice.issue_date` or `> today+7` (Riyadh).

Prior claims confirmed: 88 total, 28 NULL, statements read `created_at`, chronology should move to `effective_date`.

Prior claims disproven: none.

Inferences (labelled): "Demo" status of the rows is owner-asserted, not provable from the data.

Unresolved gaps: no provenance/import columns exist anywhere; no `cancelled_at` column.

## C. Current Schema and Writer Contract

- Table `public.ledger_entries` — `effective_date date NULL`, no default, no CHECK, no trigger touching it.
- Indexes referencing it: `idx_ledger_entries_tenant_effective_date` (partial, NOT NULL), `ledger_entries_effective_composite_idx (tenant_id, client_id, effective_date, created_at, id)`.
- Writers (all `SECURITY DEFINER`): `_finance_ledger_insert` (mandatory date), used by `approve_invoice` (`issue_date`), `post_expense_with_ledger` (`expense_date`), `post_payment` / `post_payment_session`, `cancel_invoice` (`p_reversal_date`), `post_manual_ledger_adjustment`.
- Legacy client-side writer still present: `src/hooks/finance/useLedger.ts` `createEntry` inserts into `ledger_entries` directly and never supplies `effective_date` — the only surviving NULL-producing path.
- No view reads `effective_date`; `v_customer_ledger_balances` is amount-based.

## D. Financial Date Consumer Inventory

| Consumer | Path / object | Current date field | Purpose | Required canonical field | Risk | Change required? |
|---|---|---|---|---|---|---|
| Client Statement rows | `src/hooks/clients/useClientStatement.ts` | `created_at` | filter, sort, display, running balance | `effective_date` | High | Yes |
| Statement date contract | `src/lib/finance/effectiveDate.ts` | `created_at` | canonical doc + boundary helpers | `effective_date` | High | Yes |
| Unallocated payments | `src/hooks/clients/useUnallocatedPayments.ts` | `created_at` | filter/sort | `effective_date` | Medium | Yes |
| First financial activity | RPC `get_client_first_financial_activity` | `MIN(created_at)` | statement anchor | `MIN(effective_date)` | High | Yes |
| Ledger list | `src/hooks/finance/useLedger.ts` | `created_at` | ordering | `effective_date` | Medium | Yes |
| Invoice payment summary | `src/lib/finance/fetchInvoicePaymentSummary.ts` | `effective_date` then `created_at` | payment lines, PDF disclosure | `effective_date` | Low | Already aligned |
| Invoice PDF / Print | `src/components/finance/InvoicePDFGenerator.tsx` | `issue_date` + payment dates | document | `issue_date` (document date) | Low | No |
| Invoice lists/cards | `useInvoices.ts`, `InvoicesList.tsx`, `InvoiceCard.tsx` | `issue_date` | document chronology | `issue_date` | Low | No |
| Expenses | `useExpenses.ts` | `expense_date` | economic date | `expense_date` | Low | No |
| Statement CSV/Print export | statement tab export path | inherits statement rows | export | `effective_date` | High (screen/export divergence) | Yes, same commit as statement |
| Recording timestamps in `InvoiceDetailsSheet.tsx` | `created_at` | audit "recorded at" display | `created_at` (audit) | None | No |

Excluded as non-economic: all UI/audit `created_at`/`updated_at` displays, notification timestamps, HR/lab operational dates.

## E. Canonical Economic-Date Contract

| Object | Economic date | System date | Import date | Posting date | Required rule | Open question |
|---|---|---|---|---|---|---|
| Invoice | `issue_date` | `created_at` | none (absent) | ledger row's `effective_date` at approval | ledger invoice entry `effective_date = issue_date` | none |
| Invoice Item | inherits invoice | `created_at` | none | n/a | no independent date | none |
| Payment | `payment_sessions.payment_date` | `created_at` | none | ledger `effective_date` | ledger payment entry = session `payment_date` | payment earlier than invoice `issue_date` (guard) |
| Payment Allocation | inherits parent payment | `created_at` | none | n/a | no independent date | none |
| Ledger Entry | `effective_date` | `created_at` | none | `created_at` | must always be supplied | none |
| Opening Obligation | not implemented | — | — | — | future: owner-supplied as-of date | deferred to import workstream |
| Unapplied Credit | payment economic date | `created_at` | none | `created_at` | follows payment | none |
| Adjustment | supplied `p_effective_date` | `created_at` | none | `created_at` | must be explicit | none |
| Refund | not modelled separately | — | — | — | deferred | deferred |
| Cancellation | policy-dependent | `created_at` | none | `created_at` | `cancel_invoice` takes `p_reversal_date` | **OWNER DECISION D-1** |
| Historical Correction | source document date | `created_at` | absent | `created_at` | requires provenance columns | **OWNER DECISION D-3** |
| Imported Historical Document | source date | `created_at` | absent | `created_at` | needs import infra (out of scope) | deferred |

## F. Current NULL-Date Population

- Total ledger rows: 88
- NULL `effective_date`: 28 (31.8%)
- Tenants: `348ce41c…` 21, `145f2128…` 5, `8951ac1a…` 2
- Entry types: payment/invoice 25 (sum −17,912.58); adjustment/invoice 2 (−15,750.00); adjustment/invoice_cancellation 1 (−1,725.00)
- All 28 rows have a non-null `client_id`.
- `created_at` window: 2026-02-05 → 2026-07-18
- Demo-proven: 0 rows provable from data; Demo-asserted by owner: 28. No provenance column exists to prove it, so all 28 are treated as *owner-asserted Demo*, not data-proven.

## G. Complete Row-by-Row Matrix

Proposed date = session `payment_date` (payments) unless flagged. Confidence High unless noted. Class `A` = `AUTO_RESOLVABLE_DIRECT_SOURCE`, `R` = `AUTO_RESOLVABLE_DETERMINISTIC_RULE`, `O` = `OWNER_DECISION_REQUIRED`.

| # | Ledger ID | Type | Amount | created_at | Invoice | issue_date | Session payment_date | Proposed | Evidence | Class |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | aac917e5 | payment | −150.00 | 2026-02-05 | INV-LAB-ML3A65ZF-RMC7 | 2026-02-01 | 2026-02-05 | 2026-02-05 | payment session | A |
| 2 | 432b5a3f | payment | −10.00 | 2026-02-05 | INV-LAB-ML3A65ZF-RMC7 | 2026-02-01 | 2026-02-05 | 2026-02-05 | payment session | A |
| 3 | 938b39ea | payment | −120.00 | 2026-02-05 | INV-LAB-ML9XS8HS-ALTN | 2026-02-05 | 2026-02-05 | 2026-02-05 | payment session | A |
| 4 | 1c7eb5d2 | payment | −230.00 | 2026-02-06 | INV-LAB-MLAEBDG6-J5UN | 2026-02-06 | 2026-02-06 | 2026-02-06 | payment session | A |
| 5 | 650edda7 | payment | −150.00 | 2026-02-06 | INV-LAB-MLADGLZY-ZAVV | 2026-02-06 | 2026-02-06 | 2026-02-06 | payment session | A |
| 6 | 17e217fa | payment | −150.00 | 2026-02-06 | INV-LAB-ML9XV91Q-4WPQ | 2026-02-05 | 2026-02-06 | 2026-02-06 | payment session | A |
| 7 | 449d1078 | payment | −120.00 | 2026-02-06 | INV-LAB-ML2IGWCM-MANH | 2026-01-31 | 2026-02-06 | 2026-02-06 | payment session | A |
| 8 | 2663b1d6 | payment | −30.00 | 2026-02-06 | INV-LAB-ML2IGWCM-MANH | 2026-01-31 | 2026-02-06 | 2026-02-06 | payment session | A |
| 9 | d99c7b9a | payment | −30.00 | 2026-02-06 | INV-LAB-ML9XS8HS-ALTN | 2026-02-05 | 2026-02-06 | 2026-02-06 | payment session | A |
| 10 | 66e71c13 | payment | −110.00 | 2026-02-06 | INV-LAB-ML1MMMNN-RCL0 | 2026-01-31 | 2026-02-06 | 2026-02-06 | payment session | A |
| 11 | c58040a8 | payment | −40.00 | 2026-02-06 | INV-LAB-ML1MMMNN-RCL0 | 2026-01-31 | 2026-02-06 | 2026-02-06 | payment session | A |
| 12 | 3cd0f5ab | payment | −10.00 | 2026-02-08 | INV-LAB-MLE6FAHB-9URC | 2026-02-08 | 2026-02-08 | 2026-02-08 | payment session | A |
| 13 | 4f445239 | payment | −20.00 | 2026-02-08 | INV-LAB-MLE6FAHB-9URC | 2026-02-08 | 2026-02-08 | 2026-02-08 | payment session | A |
| 14 | 61cfe843 | payment | −45.00 | 2026-02-08 | INV-LAB-MLE6FAHB-9URC | 2026-02-08 | 2026-02-08 | 2026-02-08 | payment session | A |
| 15 | 9cca7047 | payment | −45.00 | 2026-03-03 | INV-LAB-MMA1TFSU-JF7R | 2026-03-03 | 2026-03-03 | 2026-03-03 | payment session | A |
| 16 | 59b9a721 | payment | −70.00 | 2026-03-03 | INV-LAB-MMA1TFSU-JF7R | 2026-03-03 | 2026-03-03 | 2026-03-03 | payment session | A |
| 17 | 8817234c | payment | −12.00 | 2026-03-03 | INV-LAB-MMA1TFSU-JF7R | 2026-03-03 | 2026-03-03 | 2026-03-03 | payment session | A |
| 18 | 065c7158 | payment | −85.00 | 2026-03-03 | INV-LAB-MLWQMSK5-MY4D (approved) | 2026-02-21 | 2026-03-03 | 2026-03-03 | payment session | A |
| 19 | 03e3eee7 | payment | −95.00 | 2026-03-28 | INV-MN9GDJVA (partial) | 2026-03-27 | 2026-03-28 | 2026-03-28 | payment session | A |
| 20 | b2dabb21 | adjustment (cancellation) | −1,725.00 | 2026-03-28 | اسط-202603-108 (cancelled) | 2026-03-28 | — | 2026-03-28 (void action date) | no cancellation-date column; description "Void" | O (D-1) |
| 21 | b3e6f31e | adjustment | −10,000.00 | 2026-04-03 | INV-MMQ5FJ3G (cancelled) | 2026-03-14 | — | 2026-04-03 or 2026-03-14 | "Phase 6 Reconciliation: voided duplicate" | O (D-1/D-2) |
| 22 | 92c69b2c | adjustment | −5,750.00 | 2026-04-03 | INV-MNAVS3UJ (cancelled) | 2026-03-28 | — | 2026-04-03 or 2026-03-28 | "Phase 6 Reconciliation: voided duplicate" | O (D-1/D-2) |
| 23 | 774175c3 | payment | −700.00 | 2026-05-09 | SUL-202605-199 | 2026-05-10 | 2026-05-09 | 2026-05-09 (conflicts with guard) | payment session; **payment precedes issue_date** | O (D-4) |
| 24 | 72913983 | payment | −250.00 | 2026-05-09 | SUL-202605-199 | 2026-05-10 | 2026-05-09 | 2026-05-09 (conflicts with guard) | payment session; **payment precedes issue_date** | O (D-4) |
| 25 | df4629d5 | payment | −15,322.58 | 2026-06-05 | INV-MQ1HZ1SN | 2026-06-05 | 2026-06-05 | 2026-06-05 | payment session | A |
| 26 | 46104539 | payment | −80.00 | 2026-07-18 | INV-LAB-MMA1TFSU-JF7R | 2026-03-03 | 2026-07-18 | 2026-07-18 | payment session | A |
| 27 | 5b301cd7 | payment | −23.00 | 2026-07-18 | INV-LAB-MMA1TFSU-JF7R | 2026-03-03 | 2026-07-18 | 2026-07-18 | payment session | A |
| 28 | 9b8b1da0 | payment | −15.00 | 2026-07-18 | الم-202607-951 | 2026-07-18 | 2026-07-18 | 2026-07-18 | payment session | A |

Horse attribution is not carried on `ledger_entries`; horse context resolves only through `invoice_items` and is unaffected by a date-only correction.

## H. Resolution Classification

| Class | Count | Rows |
|---|---|---|
| AUTO_RESOLVABLE_DIRECT_SOURCE | 23 | payments with session date and no guard conflict |
| AUTO_RESOLVABLE_DETERMINISTIC_RULE | 0 | — |
| OWNER_DECISION_REQUIRED | 5 | 3 cancellation adjustments + 2 pre-issue payments |
| QUARANTINE_REQUIRED | 0 | — |
| NOT_ELIGIBLE_FOR_BACKFILL | 0 | — |
| ALREADY_RESOLVED_OR_NO_LONGER_PRESENT | 0 | — |

## I. Reconciliation and Side-Effect Analysis

The correction is chronology-only. It does not touch `amount`, `balance_after` inputs, allocations, invoice status or payment status. Caveat: `_finance_ledger_insert` recomputes `balance_after` in `ORDER BY effective_date, created_at, id`. Filling NULL dates changes *ordering*, so `balance_after` per row can be re-sequenced even though the client's final balance and all amounts are unchanged. Stage A must therefore (a) reconcile `SUM(amount)` per client before/after as identical, (b) reconcile final `customer_balances.balance` as identical, and (c) accept `balance_after` re-sequencing as an intended consequence, recorded row-by-row in the rollback artifact.

Currently no export hides a row: all consumers read `created_at`, which is non-null everywhere.

## J. Consumer Cutover Plan

1. Owner confirms the canonical contract (Section E) and decisions D-1..D-4.
2. Preview backfill (read-only SELECT producing the before/after artifact).
3. Execute the bounded backfill of the approved rows (Stage A).
4. Reconcile amounts and balances.
5. Close the NULL-producing writer: `useLedger.ts` `createEntry` (Stage B) — must be done **before** read cutover so no new NULL row can appear behind a changed read path.
6. Cut over read paths in one change set: statement hook, `effectiveDate.ts`, unallocated payments, `get_client_first_financial_activity`, ledger list, statement CSV/Print/PDF (Stage C).
7. QA, then add `NOT NULL` (Stage D).
8. Acceptance re-audit.

Ordering rationale: backfill precedes read cutover so no row can vanish from a date-filtered view; the writer fix precedes read cutover so the NULL population cannot regrow; screen and export change in one commit so chronology never differs between them; `NOT NULL` comes last so no live writer can be broken mid-flight.

## K. Proposed Staged Agent/Build Contract (not executed)

**Stage A — Date Backfill.** One migration. Scope: the 23 auto-resolvable rows plus any of the 5 approved by the owner, addressed by explicit UUID list only. Sets `effective_date` only. Emits a before/after artifact under `docs/aml_1_b_1/…`. Rollback: per-ID `UPDATE … SET effective_date = NULL`. Validation: per-client `SUM(amount)` and `customer_balances.balance` identical; NULL count drops exactly by the targeted count.

**Stage B — Writer Contract.** `src/hooks/finance/useLedger.ts`: remove or reroute `createEntry` to a server RPC. No broader browser-writer/POS work. Validation: no client path inserts into `ledger_entries`.

**Stage C — Read-Path Cutover.** `src/lib/finance/effectiveDate.ts`, `src/hooks/clients/useClientStatement.ts`, `src/hooks/clients/useUnallocatedPayments.ts`, `src/hooks/finance/useLedger.ts` (read), statement CSV/Print/PDF path, and RPC `get_client_first_financial_activity` (`MIN(effective_date)`). No `COALESCE` fallback. Validation: screen, CSV, Print and PDF produce identical ordered rows for a fixed range.

**Stage D — Constraint Enforcement.** `ALTER TABLE public.ledger_entries ALTER COLUMN effective_date SET NOT NULL` plus a negative test. Only after Stage A leaves zero NULLs and Stage B is proven.

## L. Owner Decisions

| ID | Question | Options | Recommendation | Consequence of delay |
|---|---|---|---|---|
| D-1 | Economic date of a cancellation/void entry | (a) date the void was actioned; (b) original invoice `issue_date` | (a) — a void is its own economic event; matches `cancel_invoice(p_reversal_date)` | 3 rows stay NULL, Stage D blocked |
| D-2 | Rows 21–22 are duplicate-invoice reconciliation voids | (a) treat as normal voids under D-1; (b) separate cleanup workstream | (a) for the date; keep any duplicate-data cleanup out of scope | 2 rows stay NULL |
| D-3 | Historical-correction backdating policy | (a) allow with provenance; (b) forbid until import infra exists | (b) — defer to the import workstream | none for this workstream |
| D-4 | Rows 23–24: payment dated 2026-05-09 against an invoice issued 2026-05-10 | (a) keep 2026-05-09 (accepts a pre-issue payment); (b) clamp to `issue_date` 2026-05-10; (c) quarantine | (a) — the session date is the real economic event; note the `post_payment` guard applies to new writes only | 2 rows stay NULL, Stage D blocked |

No owner decision is required for the other 23 rows.

## M. Rollback Contract

Artifact per execution: batch ID, actor, execution timestamp (Asia/Riyadh), reason, and one line per affected ledger ID with `effective_date` before (NULL) and after, plus `balance_after` before and after. Reversal is a per-ID `UPDATE` restoring NULL and the prior `balance_after`. Proofs stored with the artifact: per-client `SUM(amount)` unchanged, `customer_balances.balance` unchanged, count of rows modified equals the targeted ID count, and a NULL-count check over rows created during the execution window (any new NULL row is excluded from the batch and reported).

## N. Acceptance Criteria

Exactly the 16 criteria in the prompt's Section 15, with these measurable bindings: (1) each targeted ID shows the approved date; (2) `SELECT count(*) FROM ledger_entries WHERE id NOT IN (batch) AND xmin changed` = 0; (3) per-client `SUM(amount)` identical; (4) `customer_balances` identical; (5) zero NULLs in the accepted target class; (8)(9) statement and first-activity queries reference `effective_date` with no `COALESCE`; (10) screen/PDF/CSV/Print row order identical for a fixed range; (15) an insert without `effective_date` fails. Build or typecheck alone is not Acceptance.

## O. Contradictions and Risks

- Blocking: none.
- Non-blocking: `balance_after` re-sequencing (Section I); two overlapping SELECT policies on `ledger_entries`.
- Deferred: opening obligations, provenance/import columns, historical-correction policy.
- Out of scope: POS atomicity, horse attribution on ledger rows, duplicate-invoice data cleanup.

## P. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY MINI AUDIT ONLY.
WS-DH-2026-0003 remains ACTIVE — INVESTIGATIVE AUDIT PENDING until the owner reviews this report.
No execution, QA, Acceptance or Closure occurred.

## Q. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.
No Phase advancement, technical execution, Acceptance or Closure occurred in this run.

## RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan/Chat — Read-Only.
2. Operation: Economic Date Consumer Audit and 28-Row Demo Backfill Contract Mini Audit.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-AND-28-ROW-DEMO-BACKFILL-MINI-AUDIT-05.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026.
6. Prompt Preparation Time: 11:57.
7. Timezone: Asia/Riyadh (UTC+03:00).
8. Run Start: 03-08-2026 12:02 (+03:00), from the message send time 09:02 UTC.
9. First evidenced activity: ledger row-count and `\d ledger_entries` query.
10. Run End: Exact time not recorded.
11. Last evidenced activity: adjustment-row metadata and invoice date-column query.
12. Final Report Date and Time: Exact time not recorded.
13. Timestamp evidence source: platform-supplied message send time; all others Exact time not recorded.
14. Branch: current edit branch.
15. Canonical/default branch evidence: not queried this run.
16. HEAD before: not queried this run.
17. HEAD after: unchanged (no source commits).
18. Working Tree before: not queried this run.
19. Working Tree after: only `.lovable/plan.md`.
20.–22. Staged / unstaged / untracked paths: not queried; no source path staged or created by this run.
23. Repository paths read: `src/hooks/clients/useClientStatement.ts`, `src/hooks/clients/useUnallocatedPayments.ts`, `src/lib/finance/effectiveDate.ts`, `src/lib/finance/postLedgerForPayments.ts`, `src/lib/finance/postPaymentSession.ts`, `src/hooks/finance/useLedger.ts`, `src/lib/finance/fetchInvoicePaymentSummary.ts`, `docs/aml_1_b_1/stage_j5_1/preflight/*`, migration index via ripgrep.
24. Database queries executed: 11 read-only SELECT / `\d` statements.
25. Database role used: the sandbox managed Postgres role.
26. Rows read: 88 ledger rows plus related invoices, payment sessions, catalog rows.
27. Intended repository changes: zero.
28. Actual intentional repository changes: zero.
29. Database changes: zero.
30. Migration changes: zero.
31. Project Knowledge changes: zero.
32. Workspace Knowledge changes: zero.
33. Skill changes: zero.
34. Settings changes: zero.
35. `.lovable/plan.md` disclosure: written by Plan Mode to hold this report; it is a platform planning artifact under DEC-RM-DH-003-004 and is not a governance or application change.
36. Current Ledger-row count: 88.
37. Current NULL `effective_date` count: 28.
38. Workstream status: ACTIVE — INVESTIGATIVE AUDIT PENDING.
39. Roadmap phase: RM-DH-004 / Phase 1.
40. Acceptance: none.
41. Closure: none.
42. Exact stopping point: Economic Date consumers and the current NULL-date population have been investigated read-only. The row-by-row correction contract, Owner decisions, staged execution plan, rollback and Acceptance criteria have been reported. No code, database, migration or financial-data change has occurred.
43. Recommended next step: owner rules on D-1, D-2 and D-4, then authorize Stage A preview.
44. Recommended next Mode: Plan/Chat — Read-Only (Stage A backfill preview), then Agent/Build.
