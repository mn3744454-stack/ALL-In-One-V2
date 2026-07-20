# AML.1.b.1 — Stage 3 Precise Recovery & Correct Additive Re-Application

## A. Executive Decision

**READY FOR APPROVAL — ONE BOUNDED EXECUTION.**

The Stage 3 investigative evidence is complete and sufficient. No additional investigative audit is required.

Upon approval, execution will:

1. Roll back only the incorrect Stage 3 additive objects.
2. Verify exact restoration of the Stage 2 baseline.
3. Apply the correct approved Stage 3 additive schema in a separate migration.
4. Verify the corrected catalog and protected financial fingerprints.
5. Replace the contradictory D-07 documentation with one canonical entry.
6. Stop before Stage 4 and report the exact result.

Stage 4 permission insertion/binding is not included in this execution.

---

## B. Current Proven State

The incorrectly applied migration is:

`supabase/migrations/20260720112709_ad08a2ec-3811-4c0f-ad01-b99e602a10c1.sql`

It remains immutable and must not be edited or deleted.

Read-only evidence confirms:

- `finance_request_idempotency` contains 0 rows.
- `pos_sales` contains 0 rows.
- Neither table has application-code consumers.
- Neither table has policies, triggers, referencing FKs, views, or function dependencies.
- `expense_ledger_status` is used only by `expenses.ledger_status`.
- `ledger_entries.effective_date` has no reader/writer consumer.
- Stage 4 has not begun.
- All Stage 2 protected fingerprints, counts, sums, status distributions, and protected records remain unchanged.

Therefore a precise Stage-3-only rollback is mechanically safe.

---

## C. Execution Boundary

This execution consists of two separate immutable migrations:

### Migration A — Precise rollback

Create a new migration that reverses only the incorrect objects introduced by the failed Stage 3 migration.

### Migration B — Correct Stage 3

Only after Migration A passes its restoration gate, create and apply a second migration containing the exact approved Stage 3 additive schema.

The two migrations must never be combined into one transaction or one migration file.

If Migration A fails, Migration B must not begin.

If Migration B fails, its own transaction must roll back completely, leaving the successfully restored Stage 2 baseline intact.

---

## D. Migration A — Exact Guarded Rollback

### D1. Pre-mutation guards

Before dropping anything, the rollback transaction must verify:

#### Incorrect `finance_request_idempotency`

- Row count = 0.
- Exact columns and order:

  1. `id uuid NOT NULL DEFAULT gen_random_uuid()`
  2. `tenant_id uuid NOT NULL`
  3. `actor_user_id uuid NOT NULL`
  4. `operation text NOT NULL`
  5. `request_key text NOT NULL`
  6. `payload_hash text NOT NULL`
  7. `response jsonb NULL`
  8. `status text NOT NULL DEFAULT 'pending'`
  9. `created_at timestamptz NOT NULL DEFAULT now()`
  10. `completed_at timestamptz NULL`

- Primary key on `id`.
- Unique constraint on `(tenant_id, actor_user_id, operation, request_key)`.
- Exact indexes:

  - `finance_request_idempotency_tenant_idx`
  - `finance_request_idempotency_hash_idx`

- No foreign keys.
- RLS currently enabled and forced, matching the failed migration.
- Zero policies.
- Zero triggers.
- Zero unexpected dependencies.
- No `PUBLIC`, `anon`, or `authenticated` access.
- Current service-role access matches the failed migration.

#### Incorrect `pos_sales`

- Row count = 0.
- Exact columns and order:

  1. `id uuid NOT NULL DEFAULT gen_random_uuid()`
  2. `tenant_id uuid NOT NULL`
  3. `branch_id uuid NULL`
  4. `cashier_user_id uuid NULL`
  5. `sale_reference text NULL`
  6. `occurred_at timestamptz NOT NULL DEFAULT now()`
  7. `subtotal numeric(14,2) NOT NULL DEFAULT 0`
  8. `tax_amount numeric(14,2) NOT NULL DEFAULT 0`
  9. `total_amount numeric(14,2) NOT NULL DEFAULT 0`
  10. `currency text NULL`
  11. `status text NOT NULL DEFAULT 'draft'`
  12. `created_at timestamptz NOT NULL DEFAULT now()`
  13. `updated_at timestamptz NOT NULL DEFAULT now()`

- Primary key on `id`.
- Exact index `pos_sales_tenant_occurred_idx`.
- No other user-defined constraint.
- No foreign key.
- RLS currently enabled and forced, matching the failed migration.
- Zero policies.
- Zero triggers.
- Zero unexpected dependencies.
- No `PUBLIC`, `anon`, or `authenticated` access.
- Current service-role access matches the failed migration.

#### Incorrect `expenses.ledger_status`

- Column exists.
- Type is exactly `public.expense_ledger_status`.
- Column is nullable with no default.
- Enum labels and order are exactly:

  - `unposted`
  - `posted`
  - `reversed`

- `expenses.ledger_status` is the type’s only column consumer.
- No constraint, index, view, function, trigger, policy expression, or other dependency uses the column/type.

#### Incorrect `ledger_entries.effective_date`

- Column is `date NULL` with no default.
- Exact incorrect indexes exist:

  - `ledger_entries_effective_date_idx` on `(effective_date)`
  - `ledger_entries_tenant_effective_date_idx` on `(tenant_id, effective_date)`

- Those are the only indexes referencing `effective_date`.
- No constraint, view, function, trigger, policy expression, generated expression, default, or other dependency references it.

Any guard failure aborts the complete rollback transaction before the first DROP.

### D2. Exact drop order

After all guards pass, execute plain DROP statements in this order:

1. `DROP INDEX public.pos_sales_tenant_occurred_idx`
2. `DROP TABLE public.pos_sales`
3. `DROP INDEX public.finance_request_idempotency_hash_idx`
4. `DROP INDEX public.finance_request_idempotency_tenant_idx`
5. `DROP TABLE public.finance_request_idempotency`
6. `ALTER TABLE public.expenses DROP COLUMN ledger_status`
7. `DROP TYPE public.expense_ledger_status`
8. `DROP INDEX public.ledger_entries_tenant_effective_date_idx`
9. `DROP INDEX public.ledger_entries_effective_date_idx`
10. `ALTER TABLE public.ledger_entries DROP COLUMN effective_date`

Rules:

- No `IF EXISTS`.
- No `CASCADE`.
- No deletion or modification of the already-applied failed migration file.
- No change to default privileges.
- No change to the six existing Finance-Core table ACLs.
- No protected-row mutation.

### D3. Post-drop assertions inside the same transaction

Before COMMIT, assert:

- `finance_request_idempotency` is absent.
- `pos_sales` is absent.
- `expense_ledger_status` is absent.
- `expenses.ledger_status` is absent.
- `ledger_entries.effective_date` is absent.
- All failed Stage 3 index names are absent.
- No failed Stage 3 object remains.
- The three Stage 4 permission keys remain absent.
- No corresponding bundle binding exists.
- Stage 2 protected counts, sums, ledger distributions, invoice-status distribution, and keyed fingerprints remain exact.
- `INV-MMO9AAXD` remains paid at 60,000.00.
- `INV-MNDH8GPD` remains approved at 106,375.00 with its protected 37 items.
- `INV-MP4ET8LQ` remains draft at 2,032.26.
- `الم-202607-213` remains approved at 50.00 with its single `+50` ledger row.
- No protected record changed.

Any failed post-drop assertion aborts the transaction and restores the incorrect Stage 3 objects automatically.

### D4. Migration A exit gate

Migration A passes only when:

**AML.1.b.1 STAGE 3 ROLLBACK: PASSED — EXACT STAGE 2 BASELINE RESTORED.**

Only then may Migration B begin.

---

## E. Migration B — Correct Approved Stage 3

Migration B must use plain additive DDL after proving that every target object is absent. Do not reuse the incorrect placeholder designs.

### E1. `ledger_entries`

Add:

```sql
effective_date date NULL

No default and no backfill.

Add the approved composite index on:

```

```

```
(tenant_id, client_id, effective_date, created_at, id)
```

Add a partial UNIQUE index on `reference_id` where:

```

```

```
entry_type = 'adjustment'
AND reference_type = 'invoice_cancellation'
```

Do not recreate either incorrect Stage 3 index.

### E2. `invoices`

Add:

```

```

```
corrects_invoice_id uuid NULL
REFERENCES public.invoices(id)
```

No existing invoice is updated.

### E3. `invoice_items`

Add exactly:

```

```

```
CONSTRAINT invoice_items_period_valid_ck
CHECK (
  (period_start IS NULL AND period_end IS NULL)
  OR
  (
    period_start IS NOT NULL
    AND period_end IS NOT NULL
    AND period_end >= period_start
  )
) NOT VALID
```

Do not validate this constraint during AML.1.b.1.

The one existing legacy invalid range remains protected and is not rewritten.

### E4. `expenses`

Add nullable columns only:

```

```

```
ledger_status text NULL
posted_at timestamptz NULL
ledger_entry_id uuid NULL REFERENCES public.ledger_entries(id)
source_type text NULL
source_reference uuid NULL
reverses_expense_id uuid NULL REFERENCES public.expenses(id)
```

Add a transition-safe CHECK allowing `ledger_status` values:

```

```

```
NULL
'unposted'
'posted'
'reversed'
```

Do not create an enum type.

Add the both-null-or-both-non-null source-pair CHECK:

```

```

```
(source_type IS NULL AND source_reference IS NULL)
OR
(source_type IS NOT NULL AND source_reference IS NOT NULL)
```

Add:

-   
Unique `(tenant_id, source_type, source_reference)` where `source_type IS NOT NULL`.  

-   
Unique non-null `reverses_expense_id`.  

-   
One-ledger-row-per-expense enforcement for ledger rows whose `reference_type='expense'`.  


Do not backfill these fields in Stage 3.

Do not set a default or NOT NULL on `ledger_status`.

The only non-null expense source introduced later by AML.1.b.1 remains `hr_salary_payment`. Source-row validation and ordinary-delete guards remain at their approved later stage.

### E5. Correct `finance_request_idempotency`

Create exactly:

```

```

```
CREATE TABLE public.finance_request_idempotency (
  tenant_id uuid NOT NULL
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  operation text NOT NULL,
  idempotency_key uuid NOT NULL,
  actor_id uuid NOT NULL,
  request_hash bytea NOT NULL,
  resolved_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
    DEFAULT (now() + interval '7 days'),
  PRIMARY KEY (tenant_id, operation, idempotency_key)
);
```

Add the approved index on `expires_at`.

Security:

-   
Enable RLS.  

-   
Do not FORCE RLS.  

-   
Revoke all access from `PUBLIC`, `anon`, and `authenticated`.  

-   
Retain required access for the table owner/approved controlled SECURITY DEFINER function owner.  

-   
Grant required maintenance access to `service_role`.  

-   
Create no permissive authenticated/anon policy.  


Technical locks:

- `idempotency_key` remains UUID.  

- `request_hash` remains bytea/SHA-256.  

-   
No surrogate `id`.  

-   
No actor-dependent uniqueness.  

-   
No `request_key text`.  

-   
No `payload_hash text`.  

-   
No unapproved `status` or `completed_at`.  


### E6. Correct `pos_sales`

Create exactly:

```

```

```
CREATE TABLE public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  session_id uuid NOT NULL REFERENCES public.pos_sessions(id),
  sale_number integer NOT NULL,
  cart_hash text NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  currency text NOT NULL,
  invoice_id uuid NULL REFERENCES public.invoices(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, session_id, sale_number)
);
```

Security:

-   
Enable RLS.  

-   
Do not FORCE RLS.  

-   
Revoke all access from `PUBLIC`, `anon`, and `authenticated`.  

-   
Retain required table-owner/controlled function-owner access.  

-   
Grant required maintenance access to `service_role`.  

-   
Create no permissive authenticated/anon policy.  

-   
Do not grant authenticated SELECT because no existing reader currently requires it.  


Technical locks:

- `cart_hash` is audit-only and must not be unique.  

-   
Do not add `branch_id`, `cashier_user_id`, `sale_reference`, `occurred_at`, `status`, or `updated_at`.  

-   
Do not change numeric precision from `numeric(12,2)`.  

-   
Do not make currency nullable.  


### E7. Stage 3 prohibited actions

Migration B must not:

-   
backfill `effective_date`;  

-   
backfill expense fields;  

-   
rebuild balances;  

-   
add final NOT NULL constraints;  

-   
insert permission definitions;  

-   
bind permission bundles;  

-   
modify the six existing Finance-Core ACLs;  

-   
execute `ALTER DEFAULT PRIVILEGES`;  

-   
mutate any invoice, item, ledger, balance, billing link, expense, or protected Demo record;  

-   
touch `الم-202607-213`;  

-   
begin Stage 4.  


---

## F. D-07 Documentation Correction

Replace every old or duplicate D-07 paragraph/row in:

`docs/aml_1_b_1/stage_01_preflight/STAGE_01_[CLOSURE.md](http://CLOSURE.md)`

with one canonical entry only:

> **D-07 (locked, corrected).** `information_schema.role_table_grants` is role-visibility-dependent and is not authoritative evidence of current table ACLs. The captured `pg_class.relacl` fingerprint in `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv` is authoritative for the six existing locked Finance-Core tables. Stage 15 uses narrow explicit table-level `REVOKE` statements on those six existing tables only after Stage 8 writer migration and the Stage 9 zero-bypass gate. `ALTER DEFAULT PRIVILEGES` and every global/default-privilege modification are prohibited in AML.1.b.1. Stage 3 does not revoke access from the six existing Finance-Core tables. New internal tables receive their explicit restrictive ACLs in their own migration. RLS is enabled but not forced. `PUBLIC`, `anon`, and `authenticated` cannot access `finance_request_idempotency`; `pos_sales` has no authenticated/anon DML and currently no authenticated SELECT. The approved table owner/controlled SECURITY DEFINER function owner and service role retain only the internal access required by the approved design.

No superseded D-07 text remains.

---

## G. Correct Stage 3 Verification Gate

After Migration B, run read-only verification proving:

1.   
Every approved column, type, nullability, default, FK, CHECK, index, partial predicate, and unique key exists exactly.  

2.   
No incorrect Stage 3 object or index exists.  

3. `finance_request_idempotency` has 0 rows.  

4. `pos_sales` has 0 rows.  

5.   
RLS is enabled and not forced on both new tables.  

6.   
No authenticated/anon/PUBLIC access exists on either new table.  

7.   
No permissive policy exists.  

8.   
No six-table ACL changed.  

9.   
No default privilege changed.  

10.   
No existing row was updated.  

11.   
Stage 2 protected fingerprints, counts, sums, ledger distributions, invoice-status distribution, and protected records remain exact.  

12.   
The three Stage 4 permission keys remain absent.  

13.   
Stage 4 has not begun.  

14.   
The original failed migration, rollback migration, and corrected migration all remain present as immutable migration history.  

15.   
The D-07 document contains one canonical entry and no contradiction.  


The two expected `INFO 0008 RLS Enabled No Policy` findings on the internal tables are intentional and must not be “fixed” by adding permissive policies.

---

## H. Failure Handling

If Migration A fails:

-   
its transaction rolls back completely;  

-   
Migration B does not begin;  

-   
Stage 4 does not begin;  

-   
report the exact failed guard.  


If Migration A passes but Migration B fails:

-   
Migration B rolls back completely;  

-   
the database remains at the exact Stage 2 baseline restored by Migration A;  

-   
Stage 4 does not begin;  

-   
report the exact failing DDL object.  


Do not improvise an alternative schema, weaken a guard, add a policy, change a permission namespace, or use `IF NOT EXISTS` to conceal incompatible state.

---

## I. Final Execution Status

Upon approval, execute Migration A, its restoration gate, Migration B, its corrected Stage 3 gate, and the D-07 documentation replacement.

Do not proceed to Stage 4 in the same execution.

Successful terminal output must be:

**AML.1.b.1 STAGE 3: PASSED — INCORRECT ADDITIVE MIGRATION PRECISELY REVERSED, CORRECT ADDITIVE SCHEMA APPLIED, PROTECTED FINANCIAL STATE UNCHANGED.**

**STAGE 4: READY, NOT STARTED.**