-- =====================================================================
-- WS-DH-2026-0006 — RM-DH-004 Phase 2 — Stage 2 — Slice 3A
-- PROMPT 57 — PART B — BEHAVIORAL QA HARNESS
--
-- Behavioral test matrix items 1–28.
-- Items 29–31 (event append-only enforcement, automatic updated_at
-- maintenance, operational state transitions) are EXPECTED PART-A
-- LIMITATIONS — DEFERRED TO SLICE 3B and are NOT asserted here.
--
-- EXECUTION BOUNDARY:
--   This file may only be executed inside an EPHEMERAL, DISPOSABLE CI
--   database. It creates transaction-scoped synthetic fixtures and uses
--   SET LOCAL ROLE. Execution against the shared / hosted database is
--   PERMANENTLY PROHIBITED.
--
-- All fixtures are deterministic, synthetic and non-secret. No customer
-- Tenant, customer user, real name, email, phone, financial value,
-- production identifier or shared-database UUID appears in this file.
--
-- The whole file runs inside one transaction and ends with ROLLBACK.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(55);

-- ---------------------------------------------------------------------
-- Role-impersonation helper (CI only).
-- Returns 'OK' when the statement succeeded under the target role,
-- the SQLSTATE when it failed, or 'ROLE_ABSENT' when the named role
-- does not exist in this disposable database.
-- ---------------------------------------------------------------------
CREATE FUNCTION pg_temp.try_as(p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $fn$
DECLARE
  v_state text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = p_role) THEN
    RETURN 'ROLE_ABSENT';
  END IF;
  BEGIN
    EXECUTE format('SET LOCAL ROLE %I', p_role);
    EXECUTE p_sql;
    RESET ROLE;
    RETURN 'OK';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
    RESET ROLE;
    RETURN v_state;
  END;
END;
$fn$;

-- Bounded privilege report for a named role over the six Import tables.
CREATE FUNCTION pg_temp.priv_report(p_role text) RETURNS text
LANGUAGE plpgsql AS $fn$
DECLARE
  v text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = p_role) THEN
    RETURN 'ABSENT';
  END IF;
  SELECT coalesce(string_agg(DISTINCT p.priv, ',' ORDER BY p.priv), 'DENY-ALL')
    INTO v
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace,
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS p(priv)
  WHERE n.nspname = 'public'
    AND c.relname ~ '^import_'
    AND c.relkind = 'r'
    AND has_table_privilege(p_role, c.oid, p.priv);
  RETURN v;
END;
$fn$;

-- ---------------------------------------------------------------------
-- DETERMINISTIC SYNTHETIC FIXTURES (transaction-scoped)
-- ---------------------------------------------------------------------
INSERT INTO auth.users (id, aud, role, email)
VALUES ('3a000000-0000-4000-8000-00000000a1a1', 'authenticated', 'authenticated', 'ws0006.synthetic.a@example.invalid'),
       ('3a000000-0000-4000-8000-00000000b1b1', 'authenticated', 'authenticated', 'ws0006.synthetic.b@example.invalid');

INSERT INTO public.tenants (id, name, type, owner_id)
VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa', 'WS0006 Synthetic Tenant A', 'stable', '3a000000-0000-4000-8000-00000000a1a1'),
       ('3a000000-0000-4000-8000-bbbbbbbbbbbb', 'WS0006 Synthetic Tenant B', 'stable', '3a000000-0000-4000-8000-00000000b1b1');

INSERT INTO public.import_batches (id, tenant_id, batch_code, title)
VALUES ('3a000000-0000-4000-8000-00000000ba01', '3a000000-0000-4000-8000-aaaaaaaaaaaa', 'WS0006-A-001', 'Synthetic Batch A1'),
       ('3a000000-0000-4000-8000-00000000ba02', '3a000000-0000-4000-8000-aaaaaaaaaaaa', 'WS0006-A-002', 'Synthetic Batch A2'),
       ('3a000000-0000-4000-8000-00000000bb01', '3a000000-0000-4000-8000-bbbbbbbbbbbb', 'WS0006-B-001', 'Synthetic Batch B1');

-- ---------------------------------------------------------------------
-- 1 — Tenant-scoped checksum uniqueness
-- ---------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.import_source_files (id, tenant_id, original_filename, byte_size, sha256_hex)
    VALUES ('3a000000-0000-4000-8000-00000000f001','3a000000-0000-4000-8000-aaaaaaaaaaaa','a1.csv',1024, repeat('a1',32))$$,
  '1a — Tenant A accepts a valid source-file checksum');

SELECT lives_ok(
  $$INSERT INTO public.import_source_files (id, tenant_id, original_filename, byte_size, sha256_hex)
    VALUES ('3a000000-0000-4000-8000-00000000f0b1','3a000000-0000-4000-8000-bbbbbbbbbbbb','b1.csv',1024, repeat('a1',32))$$,
  '1b — the same checksum is accepted in a different Tenant');

SELECT throws_ok(
  $$INSERT INTO public.import_source_files (tenant_id, original_filename, byte_size, sha256_hex)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','a1-copy.csv',1024, repeat('a1',32))$$,
  '23505', NULL,
  '1c — the same checksum is rejected twice inside one Tenant');

INSERT INTO public.import_source_files (id, tenant_id, original_filename, byte_size, sha256_hex)
VALUES ('3a000000-0000-4000-8000-00000000f002','3a000000-0000-4000-8000-aaaaaaaaaaaa','a2.csv',2048, repeat('b2',32));

-- ---------------------------------------------------------------------
-- 2 — Tenant-scoped batch-code uniqueness
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_batches (tenant_id, batch_code, title)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','WS0006-A-001','Duplicate code')$$,
  '23505', NULL,
  '2 — duplicate batch_code inside one Tenant is rejected');

-- ---------------------------------------------------------------------
-- 3 — Batch-file ordinal uniqueness
-- ---------------------------------------------------------------------
INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal)
VALUES ('3a000000-0000-4000-8000-00000000c001','3a000000-0000-4000-8000-aaaaaaaaaaaa',
        '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000f001', 1);

SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (tenant_id, batch_id, source_file_id, ordinal)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000f002', 1)$$,
  '23505', NULL,
  '3 — duplicate ordinal inside one Batch is rejected');

-- ---------------------------------------------------------------------
-- 4 — Source File reuse across Batches inside one Tenant
-- ---------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal)
    VALUES ('3a000000-0000-4000-8000-00000000c002','3a000000-0000-4000-8000-aaaaaaaaaaaa',
            '3a000000-0000-4000-8000-00000000ba02','3a000000-0000-4000-8000-00000000f001', 1)$$,
  '4 — the same Source File may be registered in a second Batch');

-- ---------------------------------------------------------------------
-- 5 — Duplicate active Batch-file membership
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (tenant_id, batch_id, source_file_id, ordinal)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000f001', 2)$$,
  '23505', NULL,
  '5 — duplicate active membership of one Source File in one Batch is rejected');

-- ---------------------------------------------------------------------
-- 6 — Reprocessing lineage
-- ---------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal, reprocess_of_id)
    VALUES ('3a000000-0000-4000-8000-00000000c003','3a000000-0000-4000-8000-aaaaaaaaaaaa',
            '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000f001', 3,
            '3a000000-0000-4000-8000-00000000c001')$$,
  '6 — explicit valid reprocessing lineage is accepted');

-- ---------------------------------------------------------------------
-- 7 — Self-reference rejection
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal, reprocess_of_id)
    VALUES ('3a000000-0000-4000-8000-00000000c004','3a000000-0000-4000-8000-aaaaaaaaaaaa',
            '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000f002', 4,
            '3a000000-0000-4000-8000-00000000c004')$$,
  '23514', NULL,
  '7a — reprocessing self-reference is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal, duplicate_of_id)
    VALUES ('3a000000-0000-4000-8000-00000000c005','3a000000-0000-4000-8000-aaaaaaaaaaaa',
            '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000f002', 5,
            '3a000000-0000-4000-8000-00000000c005')$$,
  '23514', NULL,
  '7b — duplicate self-reference is rejected');

-- ---------------------------------------------------------------------
-- 8 — Conflicting lineage
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (tenant_id, batch_id, source_file_id, ordinal, reprocess_of_id, duplicate_of_id)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000f002', 6,
            '3a000000-0000-4000-8000-00000000c001','3a000000-0000-4000-8000-00000000c001')$$,
  '23514', NULL,
  '8 — simultaneous duplicate and reprocessing lineage is rejected');

-- ---------------------------------------------------------------------
-- 9 — Staging version uniqueness
-- ---------------------------------------------------------------------
INSERT INTO public.import_staging_rows (id, tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload)
VALUES ('3a000000-0000-4000-8000-00000000d001','3a000000-0000-4000-8000-aaaaaaaaaaaa',
        '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000c001', 0, '{"col":"v"}'::jsonb);

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001', 0, '{"col":"v"}'::jsonb)$$,
  '23505', NULL,
  '9 — duplicate extraction/correction source-version identity is rejected');

-- ---------------------------------------------------------------------
-- 10 — Confidence range
-- ---------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.import_staging_rows (id, tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload, confidence)
    VALUES ('3a000000-0000-4000-8000-00000000d002','3a000000-0000-4000-8000-aaaaaaaaaaaa',
            '3a000000-0000-4000-8000-00000000ba01','3a000000-0000-4000-8000-00000000c001', 1, '{}'::jsonb, 0.5000)$$,
  '10a — a confidence value inside [0,1] is accepted');

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload, confidence)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001', 2, '{}'::jsonb, -0.0001)$$,
  '23514', NULL,
  '10b — a confidence value below 0 is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload, confidence)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001', 3, '{}'::jsonb, 1.0001)$$,
  '23514', NULL,
  '10c — a confidence value above 1 is rejected');

-- ---------------------------------------------------------------------
-- 11 — JSON object constraints
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_batches (tenant_id, batch_code, title, metadata)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','WS0006-A-JSON','Non-object metadata','[]'::jsonb)$$,
  '23514', NULL,
  '11a — import_batches.metadata rejects a non-object JSON value');

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001', 4, '[]'::jsonb)$$,
  '23514', NULL,
  '11b — import_staging_rows.raw_payload rejects a non-object JSON value');

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload, source_locator)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001', 5, '{}'::jsonb, '1'::jsonb)$$,
  '23514', NULL,
  '11c — import_staging_rows.source_locator rejects a non-object JSON value');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity, detail)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'batch','WS0006_JSON','info','"text"'::jsonb)$$,
  '23514', NULL,
  '11d — import_issues.detail rejects a non-object JSON value');

-- ---------------------------------------------------------------------
-- 12 — SHA-256 constraints
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_source_files (tenant_id, original_filename, byte_size, sha256_hex)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','upper.csv',10, repeat('A1',32))$$,
  '23514', NULL,
  '12a — an uppercase SHA-256 value is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_source_files (tenant_id, original_filename, byte_size, sha256_hex)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','short.csv',10,'abc123')$$,
  '23514', NULL,
  '12b — a short SHA-256 value is rejected');

-- ---------------------------------------------------------------------
-- 13 — Issue scope consistency
-- ---------------------------------------------------------------------
SELECT lives_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'batch','WS0006_BATCH_SCOPE','info')$$,
  '13a — a Batch-scoped issue without file or row references is accepted');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, batch_file_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001','batch','WS0006_BAD_BATCH_SCOPE','info')$$,
  '23514', NULL,
  '13b — a Batch-scoped issue carrying a file reference is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'file','WS0006_BAD_FILE_SCOPE','info')$$,
  '23514', NULL,
  '13c — a file-scoped issue without a file reference is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, batch_file_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001','row','WS0006_BAD_ROW_SCOPE','info')$$,
  '23514', NULL,
  '13d — a row-scoped issue without a staging-row reference is rejected');

-- ---------------------------------------------------------------------
-- 14 — Field-path requirement
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, batch_file_id, staging_row_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001','3a000000-0000-4000-8000-00000000d001',
            'field','WS0006_NO_FIELD_PATH','info')$$,
  '23514', NULL,
  '14 — a field-scoped issue without a nonblank field path is rejected');

-- ---------------------------------------------------------------------
-- 15 — Blocking issue waiver
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity, status)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'batch','WS0006_BLOCKING','blocking','WAIVED')$$,
  '23514', NULL,
  '15 — a blocking issue cannot be WAIVED');

-- ---------------------------------------------------------------------
-- 16 — Resolution-state consistency
-- ---------------------------------------------------------------------
SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity, status, resolved_by, resolved_at)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'batch','WS0006_RESOLVED_NO_EVIDENCE','warning','RESOLVED',
            '3a000000-0000-4000-8000-00000000a1a1', now())$$,
  '23514', NULL,
  '16a — RESOLVED without resolution evidence is rejected');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, scope, issue_code, severity, resolved_by)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            'batch','WS0006_HALF_RESOLVED','warning','3a000000-0000-4000-8000-00000000a1a1')$$,
  '23514', NULL,
  '16b — a resolver without a resolution timestamp is rejected');

-- ---------------------------------------------------------------------
-- 17–20 — Cross-Tenant and cross-Batch boundary enforcement
-- ---------------------------------------------------------------------
INSERT INTO public.import_batch_files (id, tenant_id, batch_id, source_file_id, ordinal)
VALUES ('3a000000-0000-4000-8000-00000000c0b1','3a000000-0000-4000-8000-bbbbbbbbbbbb',
        '3a000000-0000-4000-8000-00000000bb01','3a000000-0000-4000-8000-00000000f0b1', 1);

INSERT INTO public.import_staging_rows (id, tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload)
VALUES ('3a000000-0000-4000-8000-00000000d0b1','3a000000-0000-4000-8000-bbbbbbbbbbbb',
        '3a000000-0000-4000-8000-00000000bb01','3a000000-0000-4000-8000-00000000c0b1', 0, '{}'::jsonb);

SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (tenant_id, batch_id, source_file_id, ordinal)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000f0b1', 9)$$,
  '23503', NULL,
  '17 — a Tenant-A Batch cannot reference a Tenant-B Source File');

SELECT throws_ok(
  $$INSERT INTO public.import_staging_rows (tenant_id, batch_id, batch_file_id, source_ordinal, raw_payload)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c0b1', 9, '{}'::jsonb)$$,
  '23503', NULL,
  '18 — a Tenant-A Staging Row cannot reference a Tenant-B Batch File');

SELECT throws_ok(
  $$INSERT INTO public.import_issues (tenant_id, batch_id, batch_file_id, staging_row_id, scope, issue_code, severity)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba01',
            '3a000000-0000-4000-8000-00000000c001','3a000000-0000-4000-8000-00000000d0b1',
            'row','WS0006_XTENANT_ISSUE','info')$$,
  '23503', NULL,
  '19 — a Tenant-A Issue cannot reference a Tenant-B Staging Row');

SELECT throws_ok(
  $$INSERT INTO public.import_batch_files (tenant_id, batch_id, source_file_id, ordinal, reprocess_of_id)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','3a000000-0000-4000-8000-00000000ba02',
            '3a000000-0000-4000-8000-00000000f002', 9,
            '3a000000-0000-4000-8000-00000000c001')$$,
  '23503', NULL,
  '20 — a Batch-bound self-reference cannot cross a Batch boundary');

-- ---------------------------------------------------------------------
-- 21–25 — Application-facing role denial (zero Policies, zero privileges)
-- ---------------------------------------------------------------------
SELECT is(pg_temp.try_as('anon', 'SELECT 1 FROM public.import_batches'), '42501',
  '21 — anon cannot SELECT from the Import tables');

SELECT is(pg_temp.try_as('anon',
  $$INSERT INTO public.import_batches (tenant_id, batch_code, title)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','WS0006-ANON','anon')$$), '42501',
  '22a — anon cannot INSERT into the Import tables');

SELECT is(pg_temp.try_as('anon', 'UPDATE public.import_batches SET title = ''x'''), '42501',
  '22b — anon cannot UPDATE the Import tables');

SELECT is(pg_temp.try_as('anon', 'DELETE FROM public.import_batches'), '42501',
  '22c — anon cannot DELETE from the Import tables');

SELECT is(pg_temp.try_as('authenticated', 'SELECT 1 FROM public.import_batches'), '42501',
  '23 — authenticated cannot SELECT from the Import tables');

SELECT is(pg_temp.try_as('authenticated',
  $$INSERT INTO public.import_batches (tenant_id, batch_code, title)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','WS0006-AUTH','auth')$$), '42501',
  '24a — authenticated cannot INSERT into the Import tables');

SELECT is(pg_temp.try_as('authenticated', 'UPDATE public.import_batches SET title = ''x'''), '42501',
  '24b — authenticated cannot UPDATE the Import tables');

SELECT is(pg_temp.try_as('authenticated', 'DELETE FROM public.import_batches'), '42501',
  '24c — authenticated cannot DELETE from the Import tables');

SELECT is(pg_temp.try_as('service_role', 'SELECT 1 FROM public.import_batches'), '42501',
  '25a — service_role cannot directly SELECT from the Import tables');

SELECT is(pg_temp.try_as('service_role',
  $$INSERT INTO public.import_batches (tenant_id, batch_code, title)
    VALUES ('3a000000-0000-4000-8000-aaaaaaaaaaaa','WS0006-SR','sr')$$), '42501',
  '25b — service_role cannot directly INSERT into the Import tables');

-- ---------------------------------------------------------------------
-- 26 — Sandbox-role behavior in the disposable database
-- Project-scoped sandbox role: deny-all where present.
-- Generic sandbox_exec: OWNER-ACCEPTED BOUNDED PLATFORM-MANAGED
-- PRIVILEGED EXCEPTION (PB-D8); absence in CI is not a failure.
-- ---------------------------------------------------------------------
SELECT ok(
  pg_temp.priv_report('sandbox_exec_vhxglsvxwwpmoqjabfmj') IN ('ABSENT','DENY-ALL'),
  '26a — the project-scoped sandbox role is absent or deny-all (observed: '
    || pg_temp.priv_report('sandbox_exec_vhxglsvxwwpmoqjabfmj') || ')');

SELECT ok(
  pg_temp.priv_report('sandbox_exec') IN ('ABSENT','DENY-ALL','INSERT,SELECT'),
  '26b — generic sandbox_exec stays inside the accepted bounded exception (observed: '
    || pg_temp.priv_report('sandbox_exec') || ')');

-- ---------------------------------------------------------------------
-- 27 — Table owner / Migration Authority behavior under FORCE RLS
-- Ownership, BYPASSRLS and direct privileges are reported separately;
-- FORCE RLS is NOT assumed to override BYPASSRLS.
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(DISTINCT pg_get_userbyid(c.relowner))::int
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname ~ '^import_' AND c.relkind = 'r'),
  1, '27a — all six Import tables share a single owner role');

SELECT ok(
  (SELECT bool_or(rolsuper OR rolbypassrls) FROM pg_roles WHERE rolname = current_user),
  '27b — the Migration Authority holds SUPERUSER or BYPASSRLS (measured, not assumed)');

SELECT lives_ok(
  'SELECT count(*) FROM public.import_batches',
  '27c — the Migration Authority can read the Import tables under FORCE RLS');

-- ---------------------------------------------------------------------
-- 28 — Zero Policies deny-all behavior
-- ---------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename ~ '^import_'),
  0, '28 — zero operational Policies exist, so non-BYPASSRLS roles are denied');

-- ---------------------------------------------------------------------
-- 29–31 — DEFERRED
-- EXPECTED PART-A LIMITATIONS — DEFERRED TO SLICE 3B:
--   29. Event append-only enforcement
--   30. Automatic updated_at maintenance
--   31. Operational state transitions
-- No assertion is made here.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- FIXTURE TEARDOWN AND ZERO-ROW PROOF (child-to-parent)
-- ---------------------------------------------------------------------
DELETE FROM public.import_issues;
DELETE FROM public.import_staging_rows;
DELETE FROM public.import_batch_files;
DELETE FROM public.import_source_files;
DELETE FROM public.import_events;
DELETE FROM public.import_batches;

SELECT is((SELECT count(*)::int FROM public.import_batches),      0, 'zero rows remain in import_batches');
SELECT is((SELECT count(*)::int FROM public.import_source_files), 0, 'zero rows remain in import_source_files');
SELECT is((SELECT count(*)::int FROM public.import_batch_files),  0, 'zero rows remain in import_batch_files');
SELECT is((SELECT count(*)::int FROM public.import_staging_rows), 0, 'zero rows remain in import_staging_rows');
SELECT is((SELECT count(*)::int FROM public.import_issues),       0, 'zero rows remain in import_issues');
SELECT is((SELECT count(*)::int FROM public.import_events),       0, 'zero rows remain in import_events');

SELECT * FROM finish();

ROLLBACK;
