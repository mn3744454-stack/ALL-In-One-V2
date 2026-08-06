-- =====================================================================
-- WS-DH-2026-0006 — RM-DH-004 Phase 2 — Stage 2 — Slice 3A Part A
-- Core Control Plane — CATALOG-ONLY test specification
--
-- Scope: read-only Catalog assertions for the empty Shared Historical
-- Import Schema Foundation.
--
-- This file contains ZERO Tenant-bound behavioral DML. Behavioral QA
-- (Tenant isolation, Policy behavior, cross-Tenant rejection, checksum
-- behavior, reprocessing, issue resolution and rollback rehearsal) is
-- owned by Prompt 57 Part B and is NOT covered here.
--
-- Status: AUTHORED — NOT EXECUTED — BEHAVIORAL QA PENDING
-- =====================================================================

BEGIN;

SELECT plan(31);

-- ---------------------------------------------------------------------
-- 1. Exactly six Import relations, no unexpected Import table or view
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%'
      AND c.relkind IN ('r','p','v','m','f')),
  6, 'exactly six import_% relations exist in schema public');

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%' AND c.relkind IN ('v','m')),
  0, 'no import_% view or materialized view exists');

SELECT has_table('public', 'import_batches',      'import_batches exists');
SELECT has_table('public', 'import_source_files', 'import_source_files exists');
SELECT has_table('public', 'import_batch_files',  'import_batch_files exists');
SELECT has_table('public', 'import_staging_rows', 'import_staging_rows exists');
SELECT has_table('public', 'import_issues',       'import_issues exists');
SELECT has_table('public', 'import_events',       'import_events exists');

SELECT hasnt_table('public', 'import_row_issues', 'superseded import_row_issues does not exist');

-- ---------------------------------------------------------------------
-- 2. Exact column contract (names, count), types, defaults, nullability
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_batches'), 16,
  'import_batches has exactly 16 columns');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_source_files'), 23,
  'import_source_files has exactly 23 columns');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_batch_files'), 14,
  'import_batch_files has exactly 14 columns');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_staging_rows'), 18,
  'import_staging_rows has exactly 18 columns');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_issues'), 18,
  'import_issues has exactly 18 columns');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name='import_events'), 12,
  'import_events has exactly 12 columns');

-- every table carries the common contract columns with the right shape
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'import\_%'
      AND column_name='id' AND data_type='uuid'
      AND column_default LIKE '%gen_random_uuid()%' AND is_nullable='NO'), 6,
  'all six tables have uuid id PK default gen_random_uuid()');

SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'import\_%'
      AND column_name='tenant_id' AND data_type='uuid' AND is_nullable='NO'), 6,
  'all six tables have NOT NULL uuid tenant_id');

SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'import\_%'
      AND column_name='created_at' AND data_type='timestamp with time zone'
      AND is_nullable='NO' AND column_default LIKE 'now()%'), 6,
  'all six tables have NOT NULL created_at DEFAULT now()');

-- updated_at contract: present on exactly four tables, default now(), never on the other two
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name LIKE 'import\_%'
      AND column_name='updated_at' AND is_nullable='NO'
      AND column_default LIKE 'now()%'), 4,
  'updated_at exists with DEFAULT now() on exactly four Import tables');

SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('import_source_files','import_events')
      AND column_name='updated_at'), 0,
  'import_source_files and import_events have no updated_at column');

-- ---------------------------------------------------------------------
-- 3. Primary keys, unique constraints, Tenant-bound composite FKs
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='p'), 6,
  'every Import table has a primary key');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='u'), 9,
  'the expected nine unique constraints exist');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='f'), 13,
  'the expected thirteen foreign keys exist');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%'
      AND k.contype='f' AND k.confdeltype='r'), 13,
  'every Import foreign key uses ON DELETE RESTRICT');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%'
      AND k.contype='f' AND k.confdeltype <> 'r'), 0,
  'zero CASCADE or non-RESTRICT delete actions exist');

-- every child FK that is not the direct tenants anchor is Tenant-bound (tenant_id is a key column)
SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='f'
      AND (SELECT attname FROM pg_attribute WHERE attrelid=t.oid AND attnum = k.conkey[1]) = 'tenant_id'), 13,
  'every Import foreign key is Tenant-bound on its first key column');

-- ---------------------------------------------------------------------
-- 4. CHECK constraints
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='c'), 48,
  'the expected named CHECK constraints exist across the six tables');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='c'
      AND pg_get_constraintdef(k.oid) LIKE '%jsonb_typeof%'), 8,
  'every JSONB object column is protected by a jsonb_typeof CHECK');

SELECT is(
  (SELECT count(*)::int FROM pg_constraint k
     JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND k.contype='c'
      AND pg_get_constraintdef(k.oid) LIKE '%[0-9a-f]{64}%'), 2,
  'every SHA-256 text column has a lowercase 64-hex CHECK');

-- ---------------------------------------------------------------------
-- 5. Indexes, including partial indexes
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_indexes
    WHERE schemaname='public' AND tablename LIKE 'import\_%'), 29,
  'the expected 29 indexes exist across the six tables');

SELECT is(
  (SELECT count(*)::int FROM pg_indexes
    WHERE schemaname='public' AND tablename LIKE 'import\_%' AND indexdef LIKE '%WHERE%'), 7,
  'the expected seven partial indexes exist');

SELECT has_index('public','import_batch_files','import_batch_files_tenant_batch_source_uidx',
  'partial unique index on (tenant_id, batch_id, source_file_id) exists');

-- ---------------------------------------------------------------------
-- 6. RLS, FORCE RLS, zero Policies
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname LIKE 'import\_%' AND c.relkind='r'
      AND c.relrowsecurity AND c.relforcerowsecurity), 6,
  'RLS and FORCE RLS are enabled on all six tables');

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'import\_%'),
  0, 'zero RLS Policies exist on the Import tables');

-- ---------------------------------------------------------------------
-- 7. Deny-all ACL and role inventory
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
        unnest(ARRAY['anon','authenticated','service_role','sandbox_exec',
                     'sandbox_exec_vhxglsvxwwpmoqjabfmj','public']) AS r(rolename),
        unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS p(priv)
    WHERE n.nspname='public' AND c.relname LIKE 'import\_%' AND c.relkind='r'
      AND has_table_privilege(r.rolename, c.oid, p.priv)), 0,
  'no restricted role holds any direct privilege on any Import table');

SELECT is(
  (SELECT count(*)::int FROM pg_roles WHERE rolname IN ('anon','authenticated') AND rolbypassrls),
  0, 'anon and authenticated do not have BYPASSRLS');

-- ---------------------------------------------------------------------
-- 8. Zero functions, triggers, permission keys, Storage, and zero rows
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'import\_%'), 0,
  'zero Import functions exist');

SELECT is(
  (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname LIKE 'import\_%' AND NOT t.tgisinternal), 0,
  'zero triggers (including updated_at triggers) exist on the Import tables');

SELECT is(
  (SELECT count(*)::int FROM public.permission_definitions WHERE key LIKE 'import%'), 0,
  'zero Import permission keys exist');

SELECT is(
  (SELECT count(*)::int FROM storage.buckets WHERE id ILIKE '%import%'), 0,
  'zero Import Storage buckets exist');

SELECT is(
  (SELECT (SELECT count(*) FROM public.import_batches)
        + (SELECT count(*) FROM public.import_source_files)
        + (SELECT count(*) FROM public.import_batch_files)
        + (SELECT count(*) FROM public.import_staging_rows)
        + (SELECT count(*) FROM public.import_issues)
        + (SELECT count(*) FROM public.import_events))::int, 0,
  'all six Import tables are empty');

SELECT * FROM finish();

ROLLBACK;
