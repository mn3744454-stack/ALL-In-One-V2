# AML.1.b.1 N+2.2 guarded rollback instructions

These instructions are the exact recovery path for
`20260722030000_aml_1_b_1_n2_2_backend_rpc_corrective.sql`.

They are not an automatically applied migration. Execute them only in a
controlled maintenance window against the same deployment that applied N+2.2,
after taking a database backup and exporting the affected function definitions,
ACLs, constraints, and indexes.

## Rollback classification

- Migration risk: Level 3 (behavioral function correction plus additive
  constraint/index enforcement).
- Rollback type: Type B (structurally reversible, but only while no N+2.2-only
  `entry_type='expense'` rows or newly duplicated salary periods would be made
  invalid by the old schema).
- Existing business rows are never deleted or rewritten by this rollback.

## Immutable preimages

Restore function bodies from repository commit
`e05678231a1b9a28fe0eb4d7dbb8c80c6815cab0` only:

| Object | Immutable preimage file |
|---|---|
| `_finance_ledger_insert` | `supabase/migrations/20260721195720_24db4f33-523b-4066-9bb1-86f4680def59.sql` |
| `_finance_expense_create_sourced` | `supabase/migrations/20260721225130_0d5236c7-2042-4f22-aef6-9b5a703d372a.sql` |
| `post_payment` | `supabase/migrations/20260721231553_90e2d42d-ceb6-45de-b9c2-73ab171163d2.sql` |
| `post_expense_with_ledger` | same N+2 migration |
| `reverse_expense` | same N+2 migration |
| `post_manual_ledger_adjustment` | same N+2 migration |
| `record_salary_payment` | same N+2 migration |

Judge and restore those objects by their actual function definitions at the
pinned commit, not by a similarly named later file.

## Required pre-rollback gates

Run all of the following in one transaction and abort if any query returns a
row or an unexpected result:

```sql
BEGIN;

-- The old ledger CHECK cannot represent canonical N+2.2 expense rows.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE entry_type = 'expense'
  ) THEN
    RAISE EXCEPTION
      'N2_2_ROLLBACK_BLOCKED: expense ledger rows exist; preserve N+2.2 or perform a separately approved forward correction';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.hr_salary_payments
    WHERE payment_period IS NOT NULL
    GROUP BY tenant_id, employee_id, payment_period
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'N2_2_ROLLBACK_BLOCKED: duplicate salary periods exist';
  END IF;
END
$guard$;
```

Do not delete or relabel expense ledger rows to make the guard pass. That would
be a historical financial repair and requires separate authority.

## Exact structural inverse

Still inside the same transaction:

```sql
DROP INDEX public.hr_salary_payments_tenant_employee_period_uidx;

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT ledger_entries_entry_type_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN ('invoice', 'payment', 'credit', 'adjustment'));
```

## Exact function inverse

From the immutable commit and files listed above, execute only the complete
`CREATE OR REPLACE FUNCTION ...` block for each of the seven named objects.
Do not execute unrelated functions from those migrations.

After restoring the bodies, restore the pre-N+2.2 ownership and ACL posture:

```sql
ALTER FUNCTION public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid) OWNER TO postgres;
ALTER FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) OWNER TO postgres;
ALTER FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) OWNER TO postgres;
ALTER FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) OWNER TO postgres;
ALTER FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) OWNER TO postgres;
ALTER FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_expense_with_ledger(uuid,uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reverse_expense(uuid,uuid,uuid,text,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean) TO authenticated, service_role;
```

## Post-rollback verification

Before `COMMIT`, prove all of the following:

```sql
-- Old CHECK restored and N+2.2 unique index removed.
SELECT pg_get_constraintdef(c.oid)
FROM pg_constraint c
WHERE c.conrelid = 'public.ledger_entries'::regclass
  AND c.conname = 'ledger_entries_entry_type_check';

SELECT to_regclass('public.hr_salary_payments_tenant_employee_period_uidx');

-- Exact function identity, owner, SECURITY DEFINER, and search_path.
SELECT p.oid::regprocedure AS identity,
       r.rolname AS owner,
       p.prosecdef,
       p.proconfig
FROM pg_proc p
JOIN pg_roles r ON r.oid = p.proowner
WHERE p.oid IN (
  'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'::regprocedure,
  'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)'::regprocedure,
  'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'::regprocedure,
  'public.post_expense_with_ledger(uuid,uuid,uuid)'::regprocedure,
  'public.reverse_expense(uuid,uuid,uuid,text,date)'::regprocedure,
  'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'::regprocedure,
  'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)'::regprocedure
)
ORDER BY 1;
```

Expected structural result:

- The CHECK contains only `invoice`, `payment`, `credit`, and `adjustment`.
- `to_regclass(...)` returns `NULL` for the salary-period index.
- Every listed function remains owned by `postgres`, is `SECURITY DEFINER`,
  and has the preimage search path.

Then commit:

```sql
COMMIT;
```

If any guard or verification fails, execute `ROLLBACK;` and retain N+2.2 until
a separately approved forward correction is designed. Never use `CASCADE` and
never delete financial rows as part of rollback.
