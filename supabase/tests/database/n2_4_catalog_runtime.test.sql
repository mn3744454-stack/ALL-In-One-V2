BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(30);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20260722030000'
  ),
  'N+2.2 migration is recorded in the applied migration history'
);

SELECT col_type_is(
  'public',
  'expenses',
  'source_reference',
  'uuid',
  'expenses.source_reference remains uuid'
);

SELECT col_type_is(
  'public',
  'ledger_entries',
  'effective_date',
  'date',
  'ledger_entries.effective_date is date'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'ledger_entries'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%expense%'
  ),
  'ledger entry type constraint accepts canonical expense rows'
);

SELECT ok(
  to_regclass('public.hr_salary_payments_tenant_employee_period_uidx') IS NOT NULL,
  'salary period uniqueness index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_index
    WHERE indexrelid = to_regclass('public.hr_salary_payments_tenant_employee_period_uidx')
      AND indisunique
  ),
  'salary period index is unique'
);

SELECT ok(
  to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)') IS NOT NULL,
  'post_payment canonical signature exists'
);

SELECT ok(
  to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)') IS NOT NULL,
  'post_expense_with_ledger canonical signature exists'
);

SELECT ok(
  to_regprocedure('public.reverse_expense(uuid,uuid,uuid,text,date)') IS NOT NULL,
  'reverse_expense canonical signature exists'
);

SELECT ok(
  to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)') IS NOT NULL,
  'post_manual_ledger_adjustment canonical signature exists'
);

SELECT ok(
  to_regprocedure('public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)') IS NOT NULL,
  'record_salary_payment canonical signature exists'
);

SELECT ok(
  to_regprocedure('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)') IS NOT NULL,
  '_finance_ledger_insert canonical signature exists'
);

SELECT ok(
  to_regprocedure('public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)') IS NOT NULL,
  '_finance_expense_create_sourced canonical signature exists'
);

SELECT ok(
  (
    SELECT bool_and(p.prosecdef)
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
      to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
      to_regprocedure('public.reverse_expense(uuid,uuid,uuid,text,date)'),
      to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
      to_regprocedure('public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)')
    ])
  ),
  'all five public RPCs remain SECURITY DEFINER'
);

SELECT ok(
  (
    SELECT bool_and(
      EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting(value)
        WHERE setting.value IN ('search_path=', 'search_path=""')
      )
    )
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
      to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
      to_regprocedure('public.reverse_expense(uuid,uuid,uuid,text,date)'),
      to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
      to_regprocedure('public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)'),
      to_regprocedure('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'),
      to_regprocedure('public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)')
    ])
  ),
  'public RPCs and private helpers enforce an empty search_path'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated can execute post_payment'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute post_expense_with_ledger'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.reverse_expense(uuid,uuid,uuid,text,date)',
    'EXECUTE'
  ),
  'authenticated can execute reverse_expense'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'EXECUTE'
  ),
  'authenticated can execute post_manual_ledger_adjustment'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)',
    'EXECUTE'
  ),
  'authenticated can execute record_salary_payment'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute post_payment'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'anon cannot execute post_expense_with_ledger'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute private ledger helper'
);

SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'EXECUTE'
  ),
  'service_role cannot execute private ledger helper'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute private sourced-expense helper'
);

SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)',
    'EXECUTE'
  ),
  'service_role cannot execute private sourced-expense helper'
);

SELECT ok(
  (
    SELECT count(*) = 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'post_payment'
  ),
  'post_payment has no overload drift'
);

SELECT ok(
  (
    SELECT count(*) = 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'record_salary_payment'
  ),
  'record_salary_payment has no overload drift'
);

SELECT ok(
  (
    SELECT bool_and(pg_get_userbyid(p.proowner) = 'postgres')
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
      to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
      to_regprocedure('public.reverse_expense(uuid,uuid,uuid,text,date)'),
      to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
      to_regprocedure('public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)'),
      to_regprocedure('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'),
      to_regprocedure('public._finance_expense_create_sourced(uuid,uuid,jsonb,text,uuid)')
    ])
  ),
  'corrected functions are owned by postgres'
);

SELECT ok(
  (
    SELECT bool_and(p.prorettype = 'jsonb'::regtype)
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
      to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
      to_regprocedure('public.reverse_expense(uuid,uuid,uuid,text,date)'),
      to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
      to_regprocedure('public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamptz,text,text,boolean)')
    ])
  ),
  'all five public RPCs return jsonb'
);

SELECT * FROM finish();

ROLLBACK;
