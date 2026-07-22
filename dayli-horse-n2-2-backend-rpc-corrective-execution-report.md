# Dayli Horse — AML.1.b.1 N+2.2 Backend/RPC Corrective Execution Report

## 1. Executive verdict

The authorized repository correction is implemented as one new forward-only
migration, one repository-native Vitest contract suite, and one guarded
rollback artifact. The work corrects the five public RPCs and two private
helpers named in the execution prompt, adds the required canonical `expense`
ledger classification, and adds schema-backed salary-period uniqueness.

Repository/static verification is successful:

- PostgreSQL outer SQL grammar parse: 32 statements parsed.
- Targeted corrective tests: 82/82 passed.
- Full repository test suite: 86/86 passed across two files.
- TypeScript: passed with `tsc --noEmit`.
- Production build: passed.
- New TypeScript test lint: passed.
- Existing N+2 migration object hash: unchanged from `HEAD`.

Controlled mutation-based PostgreSQL verification could not run. The
repository exposes only public `VITE_SUPABASE_*` variables, contains no test
database credential, and the local Supabase attempt was blocked by denied
access to the Docker daemon. No Production or Lovable database was used as a
substitute.

**Verdict: implementation complete at repository level; database behavioral
acceptance remains unproven and must be performed by the separate Codex
Acceptance / Re-Audit task against a disposable local or dedicated
non-production Supabase database.**

## 2. Repository identity and working-tree baseline

| Item | Exact finding |
|---|---|
| Repository | `mn3744454-stack/ALL-In-One-V2` |
| Origin | `https://github.com/mn3744454-stack/ALL-In-One-V2.git` |
| Branch | `main` |
| Baseline HEAD | `e05678231a1b9a28fe0eb4d7dbb8c80c6815cab0` |
| Baseline subject | `Completed AML.1.b.1 N+2 audit` |
| N+2 implementation commit | `2305f180c82567801e1bb6f3b618f233f8c798c9` |
| N+2 migration | `supabase/migrations/20260721231553_90e2d42d-ceb6-45de-b9c2-73ab171163d2.sql` |
| Later tracked finance migration at baseline | None |
| Baseline working tree | Clean before N+2.2 edits |
| Existing user changes | None |
| HEAD advancement from supplied identity | None |
| Commit/push/PR | Not performed |

The original N+2 migration's working-tree object hash and `HEAD` object hash
are both:

`d980065016c87b0f47543b4aadc64a893ede0926`

No reset, overwrite, checkout, or discard operation was used.

## 3. Governing sources used

Sources were judged by actual content in the required authority order:

1. `docs/aml_1_b_1/PLAN_LOCK.md` — binding product and permission authority.
2. Current migrations and generated Supabase types — physical repository/schema
   authority.
3. `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md` — used where
   consistent with PLAN_LOCK and current physical truth.
4. `dayli-horse-n2-1-financial-reconciliation-report.md` — defect evidence.
5. The N+2 migration, all later migrations, finance callers/helpers, and test
   infrastructure.
6. Dayli Horse Documentation 1–13 supplied with the task. Documentation 10
   supported tenant-default currency and financial integrity context;
   Documentation 12 supported durable backend permission enforcement;
   Documentation 13 and the remaining documents were treated as historical
   context rather than permission/schema authority.
7. Dayli Horse Skills 01–26 source, with Skills 08, 19, 22, 23, 25, and 26
   applied as follows:

| Skill | Effect on this execution |
|---|---|
| 08 — Schema and Migration Safety | Required forward-only migration, deterministic drift/duplicate preflight, zero silent repair, and guarded Type-B rollback. |
| 19 — Platform Billing / SaaS Finance | Kept invoice/tenant currency parity, payment intent, ledger, balance, link, invoice state, and idempotency in one money transaction. |
| 22 — Internal Team Permissions | Enforced the exact PLAN_LOCK permission at each public backend boundary and introduced no alias/fallback key. |
| 23 — Performance / Reliability | Added advisory/row serialization and deterministic `effective_date, created_at, id` balance-chain rebuild order. |
| 25 — QA / Release Readiness | Prevented static/build success from being reported as database behavioral acceptance. |
| 26 — Skill Network Governance | Confirmed no skill artifact was created or modified; it did not substitute for product/runtime evidence. |

No AGENTS.md instruction file exists in the repository path inspected. The
governing collaboration rules supplied alongside the repository were also
read and preserved.

## 4. Preflight schema/function findings

### Repository and schema findings

- The generated Supabase types and migrations agree that
  `expenses.source_reference` is physical PostgreSQL `uuid`; the prior private
  helper incorrectly cast that UUID to `text`.
- `payment_accounts` physically contains `id`, `owner_type`, `tenant_id`,
  `is_active`, and `created_at`. It has no `currency`, `name`, or
  `account_kind` column.
- `payment_intents` physically exposes the required payer/payee/tenant,
  intent/reference, display amount, currency, status, and timestamp fields.
- Additive enum labels `payment_intent_type='receivable'` and
  `payment_reference_type='invoice'` already exist. The terminal
  `payment_status` label is `paid`.
- `validate_payment_intent()` already validates same-tenant receivable payment
  accounts and same-tenant invoice references. The correction does not bypass
  its trigger.
- `invoices.payment_received_at` is `timestamptz`.
- `hr_employees.is_active` is non-null boolean.
- `tenants.currency` is the authoritative tenant default currency.
- `customer_balances` has a unique `(tenant_id, client_id)` key.
- `ledger_entries.entry_type` was still constrained to
  `invoice|payment|credit|adjustment`; the requested `entry_type='expense'`
  would have failed without widening this CHECK.
- No unique `(tenant_id, employee_id, payment_period)` salary rule existed.
- No private `_finance_expense_persist`, `_finance_expense_post`, or
  `_finance_expense_reverse` function exists. Expense posting/reversal is
  implemented directly in the public RPCs; `_finance_expense_create_sourced`
  is the only current private expense helper.
- No tracked migration after the N+2 migration changed the targeted contracts.

### Function/security findings before correction

The seven targeted functions existed at their canonical identities, were
`SECURITY DEFINER`, were owned by `postgres`, and carried an empty
`search_path`. The N+2.1 nonconformities were present in repository truth:

- `post_payment` omitted `payment_intents`, admitted too few payable states,
  did not require account activity, and used `now()` for
  `payment_received_at`.
- `post_expense_with_ledger` required both manage and approve and emitted an
  adjustment-classified ledger row.
- `reverse_expense` also required adjustment authority and emitted an
  adjustment-classified ledger row.
- `record_salary_payment` lacked active employee, tenant currency, future
  timestamp, period, notes, and logical uniqueness controls, and emitted an
  adjustment-classified expense row.
- `post_manual_ledger_adjustment` lacked the locked date/description bounds and
  explicit physical balance-row lock.
- `_finance_expense_create_sourced` used the wrong text cast.
- `_finance_ledger_insert` had an advisory lock and deterministic ordering but
  did not explicitly lock an existing `customer_balances` row.

The new migration repeats these checks against the database catalog and
`pg_get_functiondef()` before changing any object. It aborts on incompatible
schema or function preimage drift.

## 5. Authority-conflict resolutions applied

| Topic | Conflict | Resolution applied |
|---|---|---|
| Payment account shape | Prompt evidence named `name/account_kind`; repository truth has `owner_type` and neither named column. | Physical repository truth governed. Require same tenant, `owner_type='tenant'`, and `is_active=true`; do not invent columns. |
| Payment account currency | Specification described account compatibility, but no account currency column exists. | Enforce active same-tenant account plus exact invoice/tenant currency parity. Account-specific currency validation is physically impossible under the current schema. |
| Expense posting permission | Prior code required manage + approve; PLAN_LOCK requires approve only. | `finance.expenses.approve` only. |
| Expense reversal permission | Execution spec/code required manage + adjustment; PLAN_LOCK requires manage only. | `finance.expenses.manage` only. |
| Manual adjustment permission | Execution spec contains a stale `finance.ledger.adjust`; PLAN_LOCK uses `finance.adjustment.create`. | `finance.adjustment.create` only. |
| Salary permission | Earlier prose referenced `hr.salary.pay`; PLAN_LOCK and catalog use `hr.manage`. | `hr.manage` only. |
| Expense ledger classification | Prior migration used `adjustment`; locked contract requires `expense`, while physical CHECK rejected it. | Widen CHECK to five canonical labels and emit `entry_type='expense'`. |
| Payment business row | Some stale execution-spec tables said deferred while its operative section and PLAN_LOCK require it. | Insert `payment_intents` atomically using existing additive enum labels. |
| Payable invoice states | Stale table listed approved/partial; supplied authority explicitly includes shared/overdue. | Permit exactly `approved`, `shared`, `overdue`, `partial`. |

No unresolved product choice remained after applying the supplied permission
decisions and physical repository truth.

## 6. Files changed

| File | Purpose |
|---|---|
| `supabase/migrations/20260722030000_aml_1_b_1_n2_2_backend_rpc_corrective.sql` | Forward-only schema/RPC/helper correction with preflight and post-apply assertions. |
| `src/lib/finance/__tests__/n2_2BackendRpcCorrectiveMigration.test.ts` | 82 static repository contract tests covering migration scope, semantics, permissions, ACL declarations, and exclusions. |
| `docs/aml_1_b_1/n2_2/N2_2_ROLLBACK.md` | Guarded Type-B inverse procedure pinned to immutable function preimages. |
| `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` | This execution report. |

No existing tracked source file was edited.

## 7. Migration files created

One migration was created:

`supabase/migrations/20260722030000_aml_1_b_1_n2_2_backend_rpc_corrective.sql`

Properties:

- forward-only and later than the N+2 migration;
- 1,363 lines before this report was generated;
- no `CASCADE`;
- no destructive table reconstruction;
- no business-row update/delete/normalization;
- exact catalog/function preimage gates;
- explicit duplicate-salary preflight;
- post-apply constraint/function/ACL assertions;
- exact rollback path documented separately.

It was not applied to any database.

## 8. Exact correction for post_payment

The canonical signature is preserved:

`post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)`

The replacement function:

- requires authenticated active membership and
  `finance.payment.create` only;
- validates positive amount, non-empty payment method, and strict supplemental
  payload keys;
- validates `allow_overpayment` as boolean, length-bounds reference fields,
  requires shallow metadata, and rejects server-owned metadata keys;
- reserves/replays through the existing idempotency framework;
- acquires invoice source advisory lock and invoice `FOR UPDATE` lock;
- accepts exactly approved/shared/overdue/partial invoice states;
- derives outstanding amount from authoritative payment ledger rows;
- validates an active same-tenant tenant-owned payment account;
- enforces invoice currency = tenant default currency without inventing an
  account currency column;
- inserts one `payment_intents` row as
  `receivable/invoice/paid`, preserving the validation trigger;
- inserts one negative payment ledger row with
  `effective_date=p_payment_date` and `payment_intent_id` metadata;
- preserves the canonical payment billing link;
- rebuilds the client balance chain in the same transaction;
- derives partial/paid server-side;
- derives full-payment `payment_received_at` from Riyadh midnight for
  `p_payment_date`, matching the physical `timestamptz` column;
- includes `payment_intent_id` in the stored idempotency response.

All effects occur in one PostgreSQL function transaction. Runtime rollback of
a deliberately injected failure remains to be proven on a controlled database.

## 9. Exact correction for expense posting

`post_expense_with_ledger(uuid,uuid,uuid)` is preserved and now:

- requires `finance.expenses.approve` only;
- locks the source and expense row;
- accepts pending, approved, or paid rows only when unposted and not themselves
  reversals;
- posts pending as approved + posted atomically;
- emits exactly one positive `entry_type='expense'`,
  `reference_type='expense'`, `reference_id=expense.id` ledger row;
- uses `expenses.expense_date` as `effective_date`;
- leaves `client_id=NULL`, so the helper fixes `balance_after=0` and does not
  create/update customer balances;
- uses existing idempotency and the existing unique expense ledger index to
  prevent duplicate rows.

## 10. Exact correction for expense reversal

`reverse_expense(uuid,uuid,uuid,text,date)` is preserved and now:

- requires `finance.expenses.manage` only;
- locks the original source and row;
- blocks HR-sourced expenses with
  `FIN_EXPENSE_HR_REVERSAL_OUT_OF_SCOPE`;
- accepts only approved/paid, posted, non-reversal originals;
- enforces a normalized 1..500 reason and reversal date between the original
  expense date and Riyadh today + seven days;
- creates one positive Model-B reversal expense with category `reversal`,
  `reverses_expense_id=original.id`, posted ledger state, and supplied business
  date;
- creates one negative `entry_type='expense'` ledger row referencing the new
  reversal expense;
- marks only the original `ledger_status='reversed'`, preserving its workflow
  status and original ledger row;
- relies on the existing unique reversal/expense indexes plus idempotency to
  block a second reversal.

## 11. Exact correction for salary posting

`record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)`
is preserved and now:

- requires `hr.manage` only;
- verifies same-tenant employee and locks the employee row;
- requires `hr_employees.is_active=true`;
- requires positive amount and exact tenant default currency;
- rejects `p_paid_at > now()+1 day`;
- requires a real strict `YYYY-MM` month;
- enforces normalized notes length at 1,000 characters maximum;
- checks logical duplication and translates database `unique_violation` to
  `FIN_SALARY_PERIOD_DUP`;
- serializes the employee salary source and is backed by a unique partial
  salary-period index independent of idempotency key;
- with `p_create_expense=false`, inserts salary only;
- with `p_create_expense=true`, inserts salary, UUID-sourced expense, positive
  expense ledger row on the Riyadh business date, and salary backlink in the
  same transaction;
- creates no billing link and, through a null client ledger row, no customer
  balance mutation.

## 12. Exact correction for manual adjustment

`post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` is preserved
and now:

- requires `finance.adjustment.create` only;
- requires a same-tenant non-null client, non-zero amount, non-null date, and a
  normalized description of 1..500 characters;
- rejects `effective_date` later than Riyadh today + seven days;
- uses existing idempotency;
- acquires the client-ledger advisory lock;
- explicitly locks the existing `customer_balances` row where present;
- inserts one adjustment row and rebuilds only that client partition in
  deterministic `effective_date, created_at, id` order;
- returns the rebuilt `balance_after`.

The advisory lock also serializes the missing-balance-row creation case.
Two-session concurrency behavior remains a controlled database acceptance
gate.

## 13. Function signature, owner, ACL, SECURITY DEFINER, and search_path table

The following is the migration's encoded target posture. Because the migration
was not applied, this is repository evidence, not a claim about a changed live
database.

| Function identity | Owner | Security | search_path | PUBLIC | anon | authenticated | service_role |
|---|---|---|---|---|---|---|---|
| `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | postgres | DEFINER | empty | revoked | revoked | EXECUTE | revoked |
| `post_expense_with_ledger(uuid,uuid,uuid)` | postgres | DEFINER | empty | revoked | revoked | EXECUTE | revoked |
| `reverse_expense(uuid,uuid,uuid,text,date)` | postgres | DEFINER | empty | revoked | revoked | EXECUTE | revoked |
| `post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | postgres | DEFINER | empty | revoked | revoked | EXECUTE | revoked |
| `record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)` | postgres | DEFINER | empty | revoked | revoked | EXECUTE | revoked |
| `_finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)` | postgres | DEFINER | empty | revoked | revoked | revoked | revoked |
| `_finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)` | postgres | DEFINER | empty | revoked | revoked | revoked | revoked |

Every object reference in the replacement bodies is schema-qualified. The
migration post-gate verifies the public/private ACL split after application.
No RLS policy or direct-table grant is broadened.

## 14. Schema constraints and indexes added or preserved

| Object | Action |
|---|---|
| `ledger_entries_entry_type_check` | Replaced only after exact old-shape preflight; new allowed set is `invoice`, `payment`, `credit`, `adjustment`, `expense`. |
| `hr_salary_payments_tenant_employee_period_uidx` | Added unique partial index on `(tenant_id, employee_id, payment_period)` where period is non-null, after a duplicate aggregate preflight. |
| `customer_balances(tenant_id,client_id)` | Existing unique key preserved and used for serialized upsert. |
| `ledger_entries_expense_unique_idx` | Existing one-ledger-row-per-expense index preserved. |
| `expenses_source_unique_idx` | Existing one source reference per tenant/source index preserved. |
| `expenses_reverses_unique_idx` | Existing one reversal per original expense index preserved. |
| Existing FKs, enums, triggers, and RLS | Preserved. No destructive recreation or enum invention. |

The migration aborts if existing salary rows would violate the new uniqueness
rule. It never deletes, merges, or repairs those rows.

## 15. Tests added

Added:

`src/lib/finance/__tests__/n2_2BackendRpcCorrectiveMigration.test.ts`

It contains 82 automated static contract tests covering:

- forward migration/preflight/post-gate presence;
- schema type and constraint intent;
- all seven function security/search-path declarations;
- payment signature, authority, statuses, locks, account/currency policy,
  intent row, dates, payload, overpayment, metadata, and response;
- expense posting and reversal authority/state/ledger semantics;
- salary authority, employee/currency/date/period/notes/uniqueness, optional
  expense, type-correct source, and backlink;
- manual adjustment bounds/tenancy/serialization/balance response;
- helper UUID, locking, deterministic ordering, null-client behavior, and
  currency behavior;
- public/private ACL declarations and permission alias exclusions;
- no POS/Supplier Payable creation, no protected Demo identifiers, no RLS or
  direct-table DML broadening, and no historical data repair.

The repository had one pre-existing four-test Vitest file. The combined suite
therefore reports 86 tests.

Mutation cases 1–42 from the execution prompt were not fabricated as passed.
They require authenticated fixture users, tenant permissions, real triggers,
constraints, two-session concurrency, and transaction rollback against the
full project schema. Those tests are mandatory in Acceptance / Re-Audit.

## 16. Commands run with complete results

| Command | Result |
|---|---|
| `git branch --show-current` | `main` |
| `git rev-parse HEAD` | `e05678231a1b9a28fe0eb4d7dbb8c80c6815cab0` |
| `git status --porcelain=v1` before editing | clean |
| `npm ci --cache /tmp/dayli-horse-npm-cache --ignore-scripts --no-audit --no-fund` | **Failed before install**: `package.json` and `package-lock.json` are out of sync; examples include missing Tiptap/Vitest packages and invalid jspdf/AJV/Rollup versions. |
| `npm install --package-lock=false --cache /tmp/dayli-horse-npm-cache --ignore-scripts --no-audit --no-fund --legacy-peer-deps` | Succeeded; used only to construct local `node_modules`; package and lock files remained unmodified. |
| PostgreSQL parser over the new migration using `pgsql-parser@18.1.1` | Passed; `parsed_statements=32`. This proves outer SQL grammar, not execution of PL/pgSQL bodies. |
| `vitest run ...n2_2BackendRpcCorrectiveMigration.test.ts` | Passed: 1 file, 82 tests. |
| `vitest run` | Passed: 2 files, 86 tests. |
| `eslint src/lib/finance/__tests__/n2_2BackendRpcCorrectiveMigration.test.ts` | Passed with no findings. |
| `tsc --noEmit` | Passed. |
| `npm run build` | Passed: 4,621 modules transformed. Existing dynamic/static import and large-chunk warnings remain. |
| `npm run lint` | Failed on the repository baseline: 903 findings (829 errors, 74 warnings). The only new linted source file passes independently; the findings are in pre-existing files. |
| `git diff --check` plus untracked-file whitespace checks | Passed. |
| Old N+2 migration object-hash comparison | Passed; working file and HEAD both `d980065016c87b0f47543b4aadc64a893ede0926`. |
| Forbidden function/permission/protected-ID scans | Zero creation hits for POS/Supplier Payable RPCs, zero `finance.ledger.adjust`/`hr.salary.pay` hits, zero protected-ID hits. |
| `HOME=/tmp/dayli-horse-n2-home npx --yes --cache /tmp/dayli-horse-npm-cache supabase@latest start` | **Unavailable**: Docker daemon socket access denied; local Supabase could not start. |

No unavailable command is classified as passed.

## 17. Mutation-based non-production evidence

No mutation-based database evidence was produced.

The environment check established:

- no `psql`, local PostgreSQL server, Docker CLI access, Podman, installed
  Supabase CLI, or Bun project runtime was available initially;
- the repository `.env` contains only `VITE_SUPABASE_PROJECT_ID`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL` names;
- no database password/connection string or dedicated test environment was
  present;
- a local Supabase start attempt failed on
  `/var/run/docker.sock` with `operation not permitted`.

What remains unproven is the complete runtime matrix 1–42: row counts,
trigger compatibility, permissions under real JWT identities, cross-tenant
rejections, idempotent replay, forced rollback, uniqueness under concurrent
keys, and two-session balance serialization.

The next Acceptance / Re-Audit must run the migration and those tests on a
disposable local or dedicated non-production database. Production is not an
acceptable test target.

## 18. Atomic rollback evidence

Repository evidence shows that each public RPC performs its writes in one
PL/pgSQL invocation, calls idempotency completion only after all intended
effects, and contains no exception handler that swallows a downstream failure.
PostgreSQL would normally roll back the statement/transaction on an uncaught
exception.

That structural evidence is not a substitute for the required forced-failure
tests after `payment_intents` insertion and after salary insertion. Those two
gates remain **UNPROVEN** until Acceptance / Re-Audit runs against controlled
PostgreSQL.

The schema migration rollback artifact is
`docs/aml_1_b_1/n2_2/N2_2_ROLLBACK.md`. It:

- aborts if canonical N+2.2 `expense` ledger rows would be invalidated;
- aborts if salary-period duplicates exist;
- drops only the N+2.2 unique index;
- restores the old four-value CHECK;
- restores exact function bodies from immutable commit
  `e05678231a1b9a28fe0eb4d7dbb8c80c6815cab0` source files;
- restores pre-N+2.2 ACLs;
- deletes or rewrites no business row.

## 19. Idempotency evidence

All five public RPC replacements preserve the existing
`_finance_idempotency_begin` / `_finance_idempotency_complete` sequence. The
stored payment response now includes `payment_intent_id`. Source locks and
existing uniqueness indexes reinforce once-only expense/reversal effects; the
new salary-period unique index protects logical occurrence uniqueness even
across different idempotency keys.

Static tests prove the required calls and response fields are present. They do
not prove same-key/same-hash replay, same-key/different-hash rejection, or
concurrent database outcomes. Those gates remain **UNPROVEN**.

## 20. Permission and cross-tenant evidence

Static repository evidence proves exact backend checks are encoded:

| RPC | Permission |
|---|---|
| `post_payment` | `finance.payment.create` |
| `post_expense_with_ledger` | `finance.expenses.approve` |
| `reverse_expense` | `finance.expenses.manage` |
| `post_manual_ledger_adjustment` | `finance.adjustment.create` |
| `record_salary_payment` | `hr.manage` |

Every public RPC also encodes authenticated actor and active tenant membership
checks. Source queries bind tenant IDs for invoices, accounts, expenses,
clients, and employees. Public ACLs are reduced to authenticated EXECUTE, and
private helper execution is revoked from public client roles.

Real-role ACL catalog results and real cross-tenant negative calls remain
**UNPROVEN** until the migration is applied to the controlled acceptance
database.

## 21. Git diff summary

The final working tree contains four new untracked deliverables and no edited
tracked file. The old N+2 migration is byte-for-byte identical to HEAD.

- One 1,363-line corrective SQL migration.
- One 450-line Vitest contract test file.
- One 170-line rollback document.
- This execution report.

No POS, Phase 2, frontend caller, generated type, RLS policy, Supplier Payable,
SaaS billing, or Demo-data file appears in the change set.

## 22. Remaining limitations or unavailable tests

1. The migration has not been applied to a disposable or dedicated
   non-production database.
2. PL/pgSQL bodies have outer SQL parse and static contract coverage, but not
   server compilation against the full live schema.
3. Runtime cases 1–42, including real triggers, ACLs, atomic failure injection,
   and two-session concurrency, remain unproven.
4. Existing-data duplicate counts are protected by migration preflight but
   were not queried from a connected database in this execution.
5. The repository lockfile is out of sync with `package.json`; `npm ci` cannot
   produce a reproducible clean install. The fallback install did not modify
   the lockfile.
6. Full-repository lint remains red at 829 errors and 74 warnings. The new
   TypeScript test file itself is clean.
7. Existing frontend direct writers and effective-date reader migration remain
   intentionally deferred and therefore Phase 1 is not closed.

These limitations require classification D, not A. They do not authorize a
Production test or a Lovable investigation.

## 23. Explicit exclusions confirmed

- No `pos_finalize_sale` or POS work was implemented.
- No Phase 2 or historical import was started.
- No frontend caller was migrated.
- No reader was switched from `created_at` to `effective_date`.
- No authenticated direct-table DML was revoked.
- No protected Demo identifier appears in the new migration.
- No historical expense classification or salary duplicate was repaired.
- No `payment_accounts.currency` or payment-intent business-date column was
  invented.
- No Supplier Payable or SaaS subscription billing object was changed.
- PLAN_LOCK and the execution specification were not edited.
- No Lovable action, Cloud migration, deployment, Preview, or Publish occurred.
- No commit, push, PR, or merge occurred.
- Phase 1 closure is not claimed.

## 24. Recommended next prompt recipient and type

**Recipient:** Codex

**Type:** Investigative / Read-Only — Acceptance / Re-Audit

**Required environment:** disposable local Supabase or dedicated
non-production database with the full current migration baseline and support
for two concurrent sessions and controlled failure injection.

The Acceptance / Re-Audit must apply the migration only in that isolated
environment, execute runtime tests 1–42, inspect catalog owner/ACL/search-path
state, prove no live/repository drift, and return evidence without modifying
the repository or Production.

## 25. Final classification

**D — IMPLEMENTED BUT CONTROLLED DATABASE VERIFICATION UNAVAILABLE**

- Corrective repository execution completed as classified.
- No Production database mutation performed.
- No Lovable Cloud migration applied.
- No deployment or Publish action performed.
- No commit, push, PR, or merge performed.
- No POS work performed.
- No Phase 2 or historical-import work performed.
- No protected Demo record intentionally modified.
- Phase 1 remains open pending separate Codex Acceptance / Re-Audit.
