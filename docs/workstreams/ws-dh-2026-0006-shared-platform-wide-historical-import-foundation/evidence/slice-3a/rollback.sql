-- =====================================================================
-- WS-DH-2026-0006 — RM-DH-004 Phase 2 — Stage 2 — Slice 3A Part A
-- GUARDED ROLLBACK ARTIFACT — Core Control Plane Schema Foundation
--
-- Status: CORRECTED IN PROMPT 57 PART B — REHEARSED IN EPHEMERAL CI ONLY
--
-- SCOPE AND SEMANTICS:
--   * This script performs SCHEMA ROLLBACK ONLY.
--   * It does NOT revert `supabase_migrations.schema_migrations` or any
--     other migration-history registry, and no manual edit of migration
--     history is permitted.
--   * Migration-history and schema equivalence are proven separately,
--     through complete Migration replay into a fresh disposable database
--     (PB-D9 three-database design), not by this script.
--
-- EXECUTION BOUNDARY:
--   * Execution against the shared / hosted database is PERMANENTLY
--     PROHIBITED.
--   * Execution is permitted only inside an ephemeral, disposable CI
--     database during rollback rehearsal.
--   * Execution after any accepted Historical Import evidence exists is
--     PROHIBITED. Once an Import Batch, source file, staging row, issue
--     or event has been accepted as evidence — or once any legal hold
--     has been set — this artifact must NOT be executed. Executing it
--     would destroy provenance and audit evidence. In that case a
--     forward corrective Migration is the only permitted path.
--
-- This artifact is safe only while all six tables are provably empty.
-- It performs no CASCADE, drops nothing outside the six authorized
-- Slice-3A tables, and aborts atomically on any guard failure.
-- =====================================================================


BEGIN;

DO $$
DECLARE
  v_tables text[] := ARRAY['import_batches','import_source_files','import_batch_files',
                           'import_staging_rows','import_issues','import_events'];
  v_t text;
  v_n bigint;
BEGIN
  -- Guard 1: all six expected tables must exist
  FOREACH v_t IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_t) IS NULL THEN
      RAISE EXCEPTION 'ROLLBACK GUARD FAILED: expected table public.% does not exist', v_t;
    END IF;
  END LOOP;

  -- Guard 2: no unexpected Import relation may be present
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%'
     AND c.relkind IN ('r','p','v','m','f');
  IF v_n <> 6 THEN
    RAISE EXCEPTION 'ROLLBACK GUARD FAILED: expected exactly 6 Import relations, found %', v_n;
  END IF;

  -- Guard 3: every table must be empty
  FOREACH v_t IN ARRAY v_tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', v_t) INTO v_n;
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'ROLLBACK GUARD FAILED: public.% contains % row(s); destructive rollback is prohibited', v_t, v_n;
    END IF;
  END LOOP;

  -- Guard 4: no legal hold may exist
  SELECT count(*) INTO v_n FROM public.import_source_files WHERE legal_hold = true;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK GUARD FAILED: % source file(s) under legal hold', v_n;
  END IF;
END $$;

-- Child-to-parent drop order, RESTRICT only, no CASCADE.
DROP TABLE public.import_events       RESTRICT;
DROP TABLE public.import_issues       RESTRICT;
DROP TABLE public.import_staging_rows RESTRICT;
DROP TABLE public.import_batch_files  RESTRICT;
DROP TABLE public.import_source_files RESTRICT;
DROP TABLE public.import_batches      RESTRICT;

-- Post-drop guard: nothing outside the Import scope may have been removed.
DO $$
DECLARE
  v_n bigint;
BEGIN
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK GUARD FAILED: Import relations remain after drop';
  END IF;
  IF to_regclass('public.tenants') IS NULL
     OR to_regclass('public.invoices') IS NULL
     OR to_regclass('public.ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'ROLLBACK GUARD FAILED: a non-Import object was affected';
  END IF;
END $$;

COMMIT;
