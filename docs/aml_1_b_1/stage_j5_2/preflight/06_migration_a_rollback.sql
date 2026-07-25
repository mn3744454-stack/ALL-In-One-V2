-- ============================================================================
-- 06 — Migration A Rollback Artifact
-- Restores the pre-Migration-A state:
--   1. Drops the newly introduced private trace helper.
--   2. Restores public.create_source_checkout_invoice from the captured
--      pre-Migration-A baseline (file 01).
--   3. Reasserts owner/ACL for the public function per file 02.
--   4. Verifies canonical POSIX + raw fingerprints match file 02.
--
-- Does NOT restore or modify public._invoice_items_validate_source; that
-- object was not changed by Migration A and remains under Migration B scope.
-- Does NOT delete historical invoices, invoice_items, ledger_entries, or
-- billing_links rows.
-- ============================================================================

BEGIN;

-- (1) Drop the private trace helper introduced by Migration A.
DROP FUNCTION IF EXISTS public._finance_source_checkout_apply_trace(uuid, uuid, text, uuid);

-- (2) Restore the public source-checkout function.
--     Paste the full body of
--       docs/aml_1_b_1/stage_j5_2/preflight/01_create_source_checkout_invoice_live_baseline.sql
--     here inside this transaction. That file is a complete
--     `CREATE OR REPLACE FUNCTION public.create_source_checkout_invoice(...) ... $function$;`
--     capture and is self-sufficient.
\i docs/aml_1_b_1/stage_j5_2/preflight/01_create_source_checkout_invoice_live_baseline.sql

-- (3) Reassert owner/ACL to the captured pre-Migration-A ACL (file 02).
ALTER FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO anon;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO service_role;
-- Note: `sandbox_exec*` grants are platform-managed and re-appear on their own.

-- (4) Verify fingerprints match file 02 exactly. Aborts the rollback if drifted.
DO $verify$
DECLARE
  v_expected_raw    constant text := 'b6c7f67991e12f2ad667967f4bf118d1f15ba8246c72028cf3a4bb0e58ecb803';
  v_expected_canon  constant text := 'fe638fed78baf0d63dfb24d2c6319662bb8a7f834dc5db4eef37b4b42078064a';
  v_def_raw   text;
  v_def_canon text;
  v_raw_fp    text;
  v_canon_fp  text;
BEGIN
  v_def_raw := pg_catalog.pg_get_functiondef(
                 pg_catalog.to_regprocedure('public.create_source_checkout_invoice(uuid,uuid,jsonb)'));
  v_def_canon := pg_catalog.btrim(
                   pg_catalog.regexp_replace(
                     pg_catalog.replace(v_def_raw, E'\r\n', E'\n'),
                     '[[:space:]]+', ' ', 'g'));
  v_raw_fp   := pg_catalog.encode(extensions.digest(v_def_raw::bytea,   'sha256'), 'hex');
  v_canon_fp := pg_catalog.encode(extensions.digest(v_def_canon::bytea, 'sha256'), 'hex');
  IF v_raw_fp <> v_expected_raw THEN
    RAISE EXCEPTION 'J5_2_ROLLBACK_RAW_FP_MISMATCH: expected %, got %',
      v_expected_raw, v_raw_fp USING ERRCODE = '42P17';
  END IF;
  IF v_canon_fp <> v_expected_canon THEN
    RAISE EXCEPTION 'J5_2_ROLLBACK_CANON_FP_MISMATCH: expected %, got %',
      v_expected_canon, v_canon_fp USING ERRCODE = '42P17';
  END IF;
  IF pg_catalog.to_regprocedure(
       'public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'J5_2_ROLLBACK_TRACE_HELPER_STILL_PRESENT' USING ERRCODE = '42710';
  END IF;
END
$verify$;

COMMIT;
