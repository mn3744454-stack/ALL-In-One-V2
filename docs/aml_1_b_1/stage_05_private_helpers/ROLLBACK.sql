-- ============================================================
-- AML.1.b.1 STAGE 5 — Rollback artifact
-- Drops the seven Stage 5 private finance helper functions in
-- reverse dependency order. Does NOT drop or truncate
-- public.finance_request_idempotency. Does NOT modify any
-- Stage 3 or Stage 4 object. Must be applied only after any
-- Stage 6 dependants have been rolled back first.
-- ============================================================

BEGIN;

-- Guard: ensure no Stage 6 dependants exist. If they do, abort.
DO $g$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_depend d
    JOIN pg_proc  p  ON p.oid = d.refobjid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_proc  dep ON dep.oid = d.objid
    JOIN pg_namespace dn ON dn.oid = dep.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE '\_finance\_%' ESCAPE '\'
      AND dn.nspname = 'public'
      AND dep.proname NOT LIKE '\_finance\_%' ESCAPE '\'
  ) THEN
    RAISE EXCEPTION 'STAGE5_ROLLBACK_ABORT: Stage 6 (or other) functions depend on Stage 5 helpers; roll them back first.';
  END IF;
END
$g$;

-- Reverse dependency order:
-- purge / complete / begin depend on nothing except the pure helpers,
-- but begin depends on advisory_lock_key and request_hash.
DROP FUNCTION public._finance_idempotency_purge_expired(timestamptz);
DROP FUNCTION public._finance_idempotency_complete(uuid, text, uuid, uuid, bytea, jsonb, jsonb);
DROP FUNCTION public._finance_idempotency_begin(uuid, text, uuid, uuid, jsonb, jsonb);
DROP FUNCTION public._finance_request_hash(text, uuid, uuid, jsonb, jsonb);
DROP FUNCTION public._finance_source_lock_key(uuid, text, uuid);
DROP FUNCTION public._finance_advisory_lock_key(uuid, text, uuid);
DROP FUNCTION public._finance_riyadh_date(timestamptz);

COMMIT;
