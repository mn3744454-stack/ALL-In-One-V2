BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(18);

SELECT ok(
  EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260722213000'
  ),
  'N+2.5 invoice migration is recorded'
);

SELECT has_function(
  'public', 'create_invoice_with_items', ARRAY['uuid', 'uuid', 'jsonb'],
  'atomic invoice create signature exists'
);
SELECT has_function(
  'public', 'update_invoice_with_items', ARRAY['uuid', 'uuid', 'uuid', 'jsonb'],
  'atomic invoice edit signature exists'
);
SELECT has_function(
  'public', 'approve_invoice', ARRAY['uuid', 'uuid', 'uuid'],
  'invoice approval signature exists'
);
SELECT has_function(
  'public', 'cancel_invoice', ARRAY['uuid', 'uuid', 'uuid', 'date', 'text'],
  'invoice cancellation signature exists'
);
SELECT has_function(
  'public', 'post_invoice_payments',
  ARRAY['uuid', 'uuid', 'uuid', 'uuid', 'date', 'jsonb'],
  'atomic split-payment signature exists'
);

SELECT ok(
  (
    SELECT bool_and(p.prosecdef)
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure,
      'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'::regprocedure,
      'public.approve_invoice(uuid,uuid,uuid)'::regprocedure,
      'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure,
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
    ])
  ),
  'all public invoice writers are SECURITY DEFINER'
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
      'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure,
      'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'::regprocedure,
      'public.approve_invoice(uuid,uuid,uuid)'::regprocedure,
      'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure,
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
    ])
  ),
  'all public invoice writers use an empty search_path'
);

SELECT ok(
  (
    SELECT bool_and(pg_get_userbyid(p.proowner) = 'postgres')
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure,
      'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'::regprocedure,
      'public.approve_invoice(uuid,uuid,uuid)'::regprocedure,
      'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure,
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
    ])
  ),
  'postgres owns every public invoice writer'
);

SELECT ok(
  has_function_privilege(
    'authenticated', 'public.create_invoice_with_items(uuid,uuid,jsonb)', 'EXECUTE'
  ),
  'authenticated can create an invoice atomically'
);
SELECT ok(
  has_function_privilege(
    'authenticated', 'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)', 'EXECUTE'
  ),
  'authenticated can edit a draft invoice atomically'
);
SELECT ok(
  has_function_privilege(
    'authenticated', 'public.approve_invoice(uuid,uuid,uuid)', 'EXECUTE'
  ),
  'authenticated can invoke invoice approval'
);
SELECT ok(
  has_function_privilege(
    'authenticated', 'public.cancel_invoice(uuid,uuid,uuid,date,text)', 'EXECUTE'
  ),
  'authenticated can invoke invoice cancellation'
);
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)',
    'EXECUTE'
  ),
  'authenticated can invoke atomic split payment'
);

SELECT ok(
  (
    SELECT bool_and(NOT has_function_privilege('anon', p.oid, 'EXECUTE'))
    FROM pg_proc p
    WHERE p.oid = ANY (ARRAY[
      'public.create_invoice_with_items(uuid,uuid,jsonb)'::regprocedure,
      'public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'::regprocedure,
      'public.approve_invoice(uuid,uuid,uuid)'::regprocedure,
      'public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure,
      'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
    ])
  ),
  'anon cannot execute invoice money writers'
);

SELECT ok(
  pg_get_functiondef('public.approve_invoice(uuid,uuid,uuid)'::regprocedure)
    LIKE '%FIN_INVOICE_TOTALS_STALE%'
  AND pg_get_functiondef('public.approve_invoice(uuid,uuid,uuid)'::regprocedure)
    LIKE '%reviewed%',
  'approval revalidates totals and accepts reviewed invoices'
);

SELECT ok(
  pg_get_functiondef('public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure)
    LIKE '%invoice_cancellation%'
  AND pg_get_functiondef('public.cancel_invoice(uuid,uuid,uuid,date,text)'::regprocedure)
    LIKE '%adjustment%',
  'cancellation uses the canonical adjustment identity'
);

SELECT ok(
  pg_get_functiondef(
    'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
  ) LIKE '%public.post_payment(%'
  AND pg_get_functiondef(
    'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'::regprocedure
  ) LIKE '%payment_session_id%',
  'split payment delegates to hardened post_payment inside one function transaction'
);

SELECT * FROM finish();
ROLLBACK;
