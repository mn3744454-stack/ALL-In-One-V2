# PROMPT 48 — STAGE-D NOT-NULL CONSTRAINT ENFORCEMENT READINESS AUDIT

Mode: Plan/Chat — Read-Only. Repository writes: ZERO (except this platform-managed plan file). Database writes: ZERO.

## A. Executive Verdicts

- `PROMPT 48 SUBMITTED — RUN — CONSUMED`
- `STAGE-D READINESS SCOPE PRESERVED`
- `NO CROSS-TASK CONTAMINATION DETECTED`
- `NO IN-SCOPE POST-PROMPT-47 DRIFT`
- `LIVE EFFECTIVE-DATE COLUMN CONTRACT VERIFIED`
- `ALL REACHABLE LEDGER WRITERS SUPPLY ECONOMIC DATE`
- `STAGE-B WRITE-AUTHORITY CONTRACT REMAINS CLOSED`
- `EXISTING LEDGER DATA SATISFIES NOT-NULL CONSTRAINT`
- `STAGE-D TEST CONTRACT COMPLETE`
- `ONE SAFE STAGE-D MIGRATION STRATEGY SELECTED`
- `STAGE-D ROLLBACK CONTRACT READY`
- `STAGE A, STAGE B AND STAGE C REMAIN CLOSED`
- `STAGE-D CONSTRAINT ENFORCEMENT READY — ONE BOUNDED EXECUTION PROMPT REQUIRED`

## B. Complete Roadmap

RM-DH-004 — Financial Truth Stabilization & Historical Data Migration.
Phase 1 Economic Date Integrity (ACTIVE — Stage A closed, Stage B closed, Stage C owner-accepted and closed, Stage D current).
Phase 2 Import Control Layer — not started. Phase 3 Opening Obligation & Unapplied Credit — not started. Phase 4 Document Identity & Numbering — not started. Phase 5 Identity Matching — not started. Phase 6 Laboratory Historical Import Pilot — not started. Phase 7 Full Historical Migration — not started. Phase 8 Financial Truth Closure — not started.

## C. Owner Decision and Current State

Stage A: ACCEPTED — PERSISTED — VERIFIED — CLOSED. Stage B: OWNER ACCEPTED — CLOSED. Stage C Slices A, B, C: OWNER ACCEPTED — CLOSED. The Arabic label `غير محدد` is the accepted Prompt-46 contract, not a deviation. Stage D: authorized for read-only readiness audit only; execution NOT STARTED. Phase 1 ACTIVE. No Phase, Workstream or Roadmap Closure occurred.

## D. Active Parallel Task Ledger

PT-DH-RM004-WS0003-STAGED-READINESS-20260805-1433 — Stage-D Effective-Date NOT NULL Readiness Audit. Authorized: RM-DH-004 / Phase 1 / Stage D / WS-DH-2026-0003 / Prompt 48 only. Authorized activity: read-only repository inspection and read-only SQL. Authorized writes: ZERO. Stopping point: readiness verdict plus one exact Prompt-49 execution package.

## E. CROSS-TASK REPORT CONTAMINATION CHECK

`NO CROSS-TASK CONTAMINATION DETECTED`

Evidence: the only commits after the Prompt-47 baseline are `570ec5d26275765b9c98c4f3cfb445a133348e37` and `8c41bbc1f7065eacb40ba95be0a8f4bcb06f507e`, whose combined diff touches exactly one path — `.lovable/plan.md` (platform-managed). No unrelated Roadmap, Workstream, Lineage, migration or Finance artifact was consumed as evidence.

## F. Preflight and Drift

- Branch: `edit/edt-54f1af7a-cd8b-47a8-a3ec-41fd1061951d`
- HEAD: `8c41bbc1f7065eacb40ba95be0a8f4bcb06f507e`
- HEAD parent: `570ec5d26275765b9c98c4f3cfb445a133348e37`; grandparent `739bf980cc1d9d0641b1cba1cee701d714f0140d` (Prompt-47 execution HEAD)
- Prompt-47 ancestry: `git merge-base --is-ancestor 739bf980… HEAD` → true
- Working Tree before: `git status --porcelain` empty (no staged, no unstaged, no untracked)
- Post-Prompt-47 commits: 2, both platform-managed plan updates
- Diff `739bf980…HEAD`: `.lovable/plan.md` only, 114 insertions / 116 deletions
- Source or database-contract drift: none. No change to `ledger_entries`, Finance Writers, Ledger migrations, financial RPCs, RLS/ACL/Policies, or Stage-C date utilities/tests.

Verdict: `NO IN-SCOPE POST-PROMPT-47 DRIFT`

## G. Live Column Contract

`public.ledger_entries.effective_date`

| Property | Value |
|---|---|
| Data type | `date` |
| Nullable | YES (target of Stage D) |
| Default | none (no `CURRENT_DATE`, no fabricated fallback) |
| Generated / identity | NEVER / NO |
| Ordinal position | 16 |
| Total rows | 88 |
| NULL rows | 0 |
| Min / max value | 2013-07-20 / 2026-07-27 |
| Latest `created_at` | 2026-07-27 03:53:40.671041+00 |
| Rows inserted after Prompt 47 | 0 (therefore 0 NULL) |
| Table size | 272 kB |
| `reltuples` | 88 |
| PostgreSQL | 17.6 (aarch64) |

Constraints: PK `ledger_entries_pkey`; FKs to `clients`, `auth.users`, `payment_sessions`, `tenants`; CHECK `ledger_entries_entry_type_check` — all validated. No CHECK currently references `effective_date`.

Indexes involving `effective_date`: `ledger_entries_effective_composite_idx (tenant_id, client_id, effective_date, created_at, id)` and partial `idx_ledger_entries_tenant_effective_date (tenant_id, effective_date) WHERE effective_date IS NOT NULL`.

Dependent views: `public.v_customer_ledger_balances`. Triggers on the table: none. Functions referencing the table: `_finance_ledger_insert`, `_finance_invoice_approve_inline`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_payment_session`, `get_client_first_financial_activity`, `validate_boarding_checkout_gate`.

Verdict: `LIVE EFFECTIVE-DATE COLUMN CONTRACT VERIFIED`

## H. Active Writer Matrix

Structural gate proven: `_finance_ledger_insert` is the **only** object in the database containing `INSERT INTO public.ledger_entries`, it is SECURITY DEFINER, `EXECUTE` is granted only to `postgres`, `service_role`, `sandbox_exec_*` (not `anon`/`authenticated`), and it raises `FIN_LEDGER_INSERT_BAD_ARGS` (SQLSTATE 22023) when `p_effective_date IS NULL`.

| Writer | Reachable? | Caller(s) | Authority | Economic-date source | Can omit date? | Validation | Verdict |
|---|---|---|---|---|---|---|---|
| `_finance_ledger_insert(...)` | Yes (internal only) | the 8 RPCs below | SECDEF; no anon/authenticated EXECUTE | `p_effective_date` argument | No | Explicit NULL guard, raises 22023 | PASS |
| `_finance_invoice_approve_inline` | Yes | `approve_invoice`, source checkout | SECDEF, private | `invoices.issue_date` (NOT NULL, default CURRENT_DATE) | No | Source column NOT NULL | PASS |
| `approve_invoice` | Yes | app invoice approval | SECDEF, authenticated EXECUTE | via inline approve → `issue_date` | No | inherited | PASS |
| `cancel_invoice` | Yes | app cancellation | SECDEF, authenticated EXECUTE | `p_effective_date` parameter | No | passed straight through; NULL rejected downstream | PASS |
| `post_payment` | Yes | payment posting | SECDEF, authenticated EXECUTE | `p_payment_date` | No | explicit `p_payment_date IS NULL` guard | PASS |
| `post_payment_session` | Yes | RecordPayment / multi-invoice | SECDEF, authenticated EXECUTE | `payload.payment_date` | No | `FIN_PAYMENT_DATE_INVALID` (23514) when NULL | PASS |
| `post_expense_with_ledger` | Yes | expense approval | SECDEF | `expenses.expense_date` (NOT NULL) | No | Source column NOT NULL | PASS |
| `reverse_expense` | Yes | expense reversal | SECDEF | `p_reversal_date` | No | NULL rejected downstream | PASS |
| `record_salary_payment` | Yes | HR salary | SECDEF | `_finance_riyadh_date(p_paid_at)` | No | derived date, never `created_at` | PASS |
| `post_manual_ledger_adjustment` | Yes (no UI yet) | Deferred Item 13 | SECDEF | `p_effective_date` | No | explicit NULL guard | PASS |
| Browser direct DML | No | — | `anon`/`authenticated` hold `r` (SELECT) only | n/a | n/a | privilege absent | BLOCKED BY DESIGN |
| `create_pos_sale` / POS route | Not reachable (inert) | — | — | — | — | Deferred Item 11/12 | DEAD |

Application layer: every `.from("ledger_entries")` occurrence in `src/` is a `select` (12 sites, zero insert/update/delete/upsert). No Edge Function touches `ledger_entries`. No writer uses `created_at` as a business-date fallback.

Verdict: `ALL REACHABLE LEDGER WRITERS SUPPLY ECONOMIC DATE`

## I. Write-Authority Recheck

Live `pg_class.relacl` for `public.ledger_entries`:
`{postgres=arwdDxtm/postgres, service_role=arwdDxtm/postgres, sandbox_exec_vhxglsvxwwpmoqjabfmj=ar/postgres, sandbox_exec=ar/postgres, anon=r/postgres, authenticated=r/postgres}`

- `anon` and `authenticated`: `r` only → no INSERT, no UPDATE, no DELETE.
- RLS enabled (`relrowsecurity = t`), two SELECT-only policies (duplicate SELECT policy remains Deferred Item 16).
- No triggers on the table; no direct Customer Balance writer reintroduced (`customer_balances` is written only inside `_finance_ledger_insert`).
- POS remains inert.
- The proposed Stage-D migration changes no ACL, Policy or function.

Verdict: `STAGE-B WRITE-AUTHORITY CONTRACT REMAINS CLOSED`

## J. Existing-Data Readiness

| Metric | Value |
|---|---|
| Total rows | 88 |
| NULL `effective_date` | 0 |
| Invalid dates | 0 (column is typed `date`; all values parse) |
| Range | 2013-07-20 → 2026-07-27 |
| Rows after Stage-A / B / C acceptance | 0 (latest row `created_at` 2026-07-27) |
| Rows after Prompt 47 | 0 |
| Per-class NULLs | invoice/invoice 47 → 0; payment/invoice 38 → 0; adjustment/invoice 2 → 0; adjustment/invoice_cancellation 1 → 0 |

Zero rows were modified. Verdict: `EXISTING LEDGER DATA SATISFIES NOT-NULL CONSTRAINT`

## K. Test Contract

Positive tests (P1–P8), executable in Prompt 49 inside a transaction with guaranteed `ROLLBACK`:

1. P1 `post_expense_with_ledger` on a seeded approved expense → ledger row created, `effective_date = expenses.expense_date`.
2. P2 `approve_invoice` → `effective_date = invoices.issue_date`, amount preserved.
3. P3 `post_payment` with explicit `p_payment_date` → negative amount, date preserved.
4. P4 `post_payment_session` with `payload.payment_date` → one ledger row per allocation, no duplicates.
5. P5 `cancel_invoice` with `p_effective_date` → single adjustment row (unique index enforced).
6. P6 `reverse_expense` with `p_reversal_date` → reversal row, original marked reversed.
7. P7 `record_salary_payment` → `effective_date = _finance_riyadh_date(p_paid_at)`.
8. P8 tenant/client boundary + `customer_balances` recomputation correct after each of P1–P7; returned row shape unchanged; no cross-tenant effect.

Negative tests (N1–N9):

1. N1 direct `INSERT` omitting `effective_date` → fails with `23502` (only after migration).
2. N2 direct `INSERT` with explicit `NULL` → fails `23502` (after migration).
3. N3 each Writer with NULL date → `FIN_LEDGER_INSERT_BAD_ARGS` / `FIN_PAYMENT_DATE_INVALID` (already provable pre-migration).
4. N4 malformed date literal → `22007` at cast.
5. N5 `SET ROLE authenticated` → INSERT/UPDATE/DELETE on `ledger_entries` denied (`42501`).
6. N6 rollback SQL restores nullable state — disposable environment / rolled-back transaction only.
7. N7 grep + function-body assertion: no writer substitutes `created_at`.
8. N8 forced Writer failure leaves `customer_balances` unchanged (atomicity).
9. N9 idempotency retry produces no duplicate ledger row.

Execution environments: N1, N2, N4 require post-migration state; all others run pre- or post-migration. P1–P8 and N1–N9 all run inside `BEGIN … ROLLBACK` so no financial row persists. No live negative write was executed in Prompt 48.

Verdict: `STAGE-D TEST CONTRACT COMPLETE`

## L. Migration Options and Recommendation

- Option A — direct `ALTER COLUMN … SET NOT NULL`. On PostgreSQL 17.6 this takes an `ACCESS EXCLUSIVE` lock and performs one full-table verification scan: 88 rows / 272 kB → single-digit milliseconds.
- Option B — staged `ADD CONSTRAINT … NOT VALID` → `VALIDATE` → `SET NOT NULL` (PG 12+ reuses the validated CHECK to skip the scan) → `DROP CONSTRAINT`. Justified only for large tables where the verification scan would hold `ACCESS EXCLUSIVE` too long.

Selected: **Option A**. The table is 88 rows; Option B adds three extra statements and a transient CHECK object for no measurable lock benefit. Option B is rejected as unnecessary complexity, not as unsafe.

No default, no trigger, no `COALESCE`, no type change, no backfill, no unrelated cleanup.

Verdict: `ONE SAFE STAGE-D MIGRATION STRATEGY SELECTED`

## M. Exact SQL Package

Preflight (must all hold):

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE effective_date IS NULL) AS nulls
FROM public.ledger_entries;                 -- expect nulls = 0

SELECT is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='ledger_entries'
  AND column_name='effective_date';         -- expect YES, NULL default
```

Migration (one statement, one transaction):

```sql
ALTER TABLE public.ledger_entries
  ALTER COLUMN effective_date SET NOT NULL;
```

Idempotency: re-running is a no-op error-free only if guarded; guard with a `DO` block checking `attnotnull` if re-entrancy is desired. Lock: `ACCESS EXCLUSIVE`, expected duration < 50 ms. Concurrent writes: blocked for the lock duration; all writers are short SECDEF transactions.

Validation:

```sql
SELECT attnotnull FROM pg_attribute
WHERE attrelid='public.ledger_entries'::regclass AND attname='effective_date';  -- expect t

SELECT count(*) FROM public.ledger_entries;                                     -- expect 88
SELECT md5(string_agg(id::text||amount::text||balance_after::text, ',' ORDER BY id))
FROM public.ledger_entries;                                                     -- expect unchanged fingerprint
SELECT count(*), md5(string_agg(client_id::text||balance::text, ',' ORDER BY client_id))
FROM public.customer_balances;                                                  -- expect 8 / unchanged
```

Rollback:

```sql
ALTER TABLE public.ledger_entries
  ALTER COLUMN effective_date DROP NOT NULL;
```

## N. Rollback Contract

Structurally possible and instantaneous. It restores no NULL rows (none are created), changes no amount, no `balance_after`, no `customer_balances` row and no date. It weakens data integrity and is therefore not an ordinary operational action — it requires explicit Owner authorization. Classification under the migration-safety framework: **Risk Level 2 forward / Rollback Type B (partially reversible)** — the structure reverses fully, but any NULL rows written while the constraint is absent could not be re-blocked without a new backfill.

Verdict: `STAGE-D ROLLBACK CONTRACT READY`

## O. Prompt-49 Execution Package

- Mode: `Agent/Build — Constraint Enforcement`
- Allowlist: exactly one new migration file, pattern `supabase/migrations/<UTC timestamp>_<uuid>.sql`, containing only the single `ALTER TABLE` statement. Optional evidence file `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-d-not-null/` (preflight, validation, rollback). No other path may change.
- Sequence: preflight queries (Section M) → migration → validation queries → positive tests P1–P8 and negative tests N1–N9 → `tsgo` and `bun run build` (both must exit 0).
- Generated Supabase types: `ledger_entries.Row.effective_date` narrows from `string | null` to `string`, and `Insert` gains a required field. No application code change is expected because the app never inserts and already handles the value as present; confirm with typecheck.
- RLS, Policies, ACLs, functions, triggers: unchanged.
- Assertions: financial-row writes ZERO, amount/balance fingerprints unchanged, `customer_balances` unchanged, row count 88.
- Stopping point: immediately after validation and tests, before QA and Owner Acceptance.

Next eligible Prompt number is 49, valid only once Prompt 48 is proven consumed. No number is allocated by this report.

## P. Facts

Every item in Sections F–J was directly proven this run by `git` and read-only SQL against the live database.

## Q. Lovable Claims

Prompt-01–47 acceptance history and Owner decisions are carried from the prompt and prior accepted reports, not re-proven here.

## R. Analytical Inferences

Lock duration (< 50 ms) is inferred from table size and PostgreSQL 17 verification-scan behaviour. Generated-type narrowing is inferred from Supabase type-generation rules and must be confirmed by typecheck in Prompt 49.

## S. Gaps and Contradictions

None.

## T. Blocking Findings

None.

## U. Non-Blocking Residuals

Duplicate SELECT policy on `ledger_entries` (Deferred Item 16); two legacy `created_at`-ordered indexes remain and are unused by the Stage-C read paths; `sandbox_exec` retains `a`/`r` on the table (Deferred Item 18). None affects Stage D.

## V. One Recommendation

Issue Prompt 49 in `Agent/Build — Constraint Enforcement` mode and execute the single `ALTER TABLE public.ledger_entries ALTER COLUMN effective_date SET NOT NULL;` migration with the Section-M package.

## W. Complete Deferred Items Register

All 34 items preserved unchanged: 1 stale Arabic Invoice PDF root assertion; 2 source-batch explicit tenant predicate; 3 Supplier Payables date architecture; 4 future direct `payment_sessions` contract; 5 Internal Cost terminology and Unknown vs Real Zero; 6 contextual Internal Cost labels; 7 HR Salary atomicity/idempotency/reversal; 8 HR-linked Expense deletion protection; 9 Expense unpost and reversal; 10 Supplier Payable lifecycle and authority; 11 full POS implementation; 12 future `create_pos_sale`; 13 Manual Ledger Adjustment UI; 14 residual Finance privilege hardening; 15 full `has_permission` qualification; 16 duplicate Ledger SELECT Policy; 17 TEMP grant and PUBLIC Helper EXECUTE review; 18 `sandbox_exec` privilege review; 19 Historical Import provenance objects; 20 `owner_id` identity binding; 21 shadow draft-invoice remediation; 22 Doctor billing and `tenant_services` unification; 23 Forward → Rollback → Forward drill; 24 PostgreSQL parser or disposable-environment validation; 25 Phase-2 Import Control Layer; 26 provenance, fingerprint, idempotency, quarantine and rollback; 27 Opening Obligation; 28 Unapplied Credit; 29 document identity and numbering; 30 identity matching; 31 Laboratory Historical Import pilot; 32 Phase-1 completion; 33 WS-DH-2026-0003 closure; 34 Workstream Closure Persistence if later required.

## X. Workstream Persistence

Stage A closed. Stage B closed. Stage C owner-accepted and closed. Stage D readiness: READY. No Stage-D execution occurred. No Phase or Workstream closure. No governance file was written.

## Y. Roadmap Impact

Phase 1 ACTIVE; Stage D is the current lane; Phases 2–8 not started; no advancement, no Closure.

## Z. Run Metadata and Exact Stopping Point

1 Mode: Plan/Chat — Read-Only readiness audit. 2 PT-DH-RM004-WS0003-STAGED-READINESS-20260805-1433. 3 Prompt 48 — SUBMITTED — RUN — CONSUMED. 4 Prepared 05-08-2026 14:33 Asia/Riyadh. 5 Run start 05-08-2026 14:49, end 14:57, report 14:58 Asia/Riyadh. 6 Branch `edit/edt-54f1af7a-cd8b-47a8-a3ec-41fd1061951d`; HEAD `8c41bbc1f7065eacb40ba95be0a8f4bcb06f507e`; parent `570ec5d26275765b9c98c4f3cfb445a133348e37`. 7 Working Tree before: clean; after: this plan file only. 8 Prompt-47 HEAD `739bf980cc1d9d0641b1cba1cee701d714f0140d` is an ancestor. 9 Post-Prompt-47 commits: 2. 10 Current-task paths: none. 11 Unrelated parallel-task paths: none. 12 Platform-managed paths: `.lovable/plan.md`. 13 `NO CROSS-TASK CONTAMINATION DETECTED`. 14 `NO IN-SCOPE POST-PROMPT-47 DRIFT`. 15 PostgreSQL 17.6. 16 272 kB / 88 rows. 17 `date`, nullable, no default, ordinal 16. 18 NULL count 0. 19 Post-Prompt-47 rows 0. 20 Active Writers 10. 21 Dead Writers 2 (POS route, `create_pos_sale`). 22 Writer-date matrix: Section H. 23 Direct-DML privilege: `anon`/`authenticated` = SELECT only. 24 Option A direct `SET NOT NULL`. 25 `ACCESS EXCLUSIVE`, < 50 ms. 26 Rollback Type B. 27 Positive tests 8. 28 Negative tests 9. 29 Repository reads: git metadata + `src/` and `supabase/functions/` writer sweep. 30 Repository writes: ZERO. 31 Database reads: 14 read-only statements. 32 Database writes: ZERO. 33 Migration writes: ZERO. 34 Financial-row writes: ZERO. 35 Governance writes: ZERO. 36 Stage A CLOSED. 37 Stage B CLOSED. 38 Stage C OWNER ACCEPTED — CLOSED. 39 Stage D READY. 40 Phase 1 ACTIVE. 41 Phase advancement NONE. 42 Closure NONE. 43 Stopping point: this readiness verdict and the Prompt-49 package. 44 Recommendation: Section V. 45 Next Prompt 49, Mode `Agent/Build — Constraint Enforcement`.

`STAGE-D CONSTRAINT ENFORCEMENT READY — ONE BOUNDED EXECUTION PROMPT REQUIRED`
