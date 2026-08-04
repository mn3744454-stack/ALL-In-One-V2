-- =====================================================================
-- EMERGENCY ROLLBACK ARTIFACT — CORRECTED OPTION B (COMPLETE REISSUE)
-- DO NOT EXECUTE WITHOUT EXPLICIT OWNER AUTHORIZATION
-- =====================================================================
-- Project:      Dayli Horse / ديلي هورس
-- Roadmap:      RM-DH-004 — Financial Truth Stabilization & Historical
--               Data Migration
-- Phase:        Phase 1 — Economic Date Integrity
-- Workstream:   WS-DH-2026-0003 — Economic Date Integrity
-- Lineage:      Shared Tenant Operational Finance + Historical Migration
-- Prompt:       PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-CORRECTED-OPTION-B-LIVE-CANONICAL-STATE-A-STABLE-CONTRACT-AND-COMPLETE-ROLLBACK-REISSUE-28
-- Owner approval (corrected Option B): "اعتمد. يلا نبدأ"
--
-- Bound Forward migration:
--   supabase/migrations/20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql
--   Version: 20260804083738
--   SHA-256: 602804b939876ee3a2a19114296de3ff080aafc574a3b0913bed1fa6e80baa5f
--
-- Database:     postgres (project ref vhxglsvxwwpmoqjabfmj)
-- Requirement:  PostgreSQL 17 (major version 17 only)
-- Branch:       edit/edt-10f270a2-2c44-465e-834b-897e55af825c
-- HEAD:         ca71a1ccca02ce0ec99ed6914b84eb2073c28a4e
-- Evidence time: 04-08-2026 15:21 Asia/Riyadh (UTC+03:00) — 2026-08-04T12:21Z
--
-- Bound Stable Contract artifact:
--   docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-b-database-authority/stable-function-acl-contract-v1.md
--   Stable Contract SHA-256:
--   63bac3c945cc676fa565727367e1b41a0e3e243981223ef252a6576ed8b5178b
--
-- Previous Rollback SHA-256 (fully replaced by this artifact):
--   62be2f2773dddc0b8e1aab33aaef4b70c9ba304df5cc8879f616e32c74460baa
--
-- Replacement reason:
--   The previous artifact asserted the all-role Function-ACL fingerprints
--   63 / f2507d9a41a1bc76319b553328d8dd09 (State B) and
--   65 / b4138d2f6c8bf2ca01c41d437976d116 (State A). Those all-role sets
--   include platform-managed sandbox_exec* grants which the platform
--   drops and recreates outside this Workstream, so the artifact became
--   non-executable. Under approved Option B the blocking Function-ACL
--   contract is restricted to the stable grantees PUBLIC, anon,
--   authenticated, service_role and postgres, and sandbox_exec* roles are
--   reported as a separate non-blocking observation.
--
-- HISTORICAL VALUES — NON-BLOCKING, RECORDED FOR LINEAGE ONLY:
--   All-role Function-ACL State A            : 65 / b4138d2f6c8bf2ca01c41d437976d116
--   All-role Function-ACL State B (Prompt 24): 63 / f2507d9a41a1bc76319b553328d8dd09
--   All-role current observation (Prompt 25/26): 49 / 3e807d782287d88bea69edeece0bb424
--   These are NOT assertions in this artifact.
--
-- BLOCKING CONTRACTS USED BY THIS ARTIFACT:
--   Policy       State B precondition : 3  / 04297828f4bd33eba043f6c9274ec57b
--   Policy       State A postcondition: 7  / e978f912777a28108f46ba79e2ce071e
--   Table-ACL    State B precondition : 44 / 204017a1207bc68a246c3415e3975478
--   Table-ACL    State A postcondition: 72 / f1567096c582eaaea20a816cc99cd269
--   Stable Fn-ACL State B precondition : 35 rows / 5277 bytes
--                MD5    31a3c711f72f419e75f89a234a9923cc
--                SHA-256 67128e3269272e695b4452247eed409378b5f30d10c5df54a9d6b617abeea404
--   Stable Fn-ACL State A postcondition: 37 rows / 5498 bytes
--                MD5    36da554aef9a68d2acfbe9e1663c5def
--                SHA-256 5a7c4fa94cc44fc330503b58a13dde678a83206270e79f681a295988cdd63db2
--   Financial invariants:
--     public.ledger_entries     88 rows / 23e73fd58f9308913ac978acee94b2f2
--     public.customer_balances   8 rows / 22e38d161b126cca31f4c26830084012
--
-- EXPLICIT NON-EXECUTION STATEMENT:
--   This artifact has NOT been executed. It is not part of the
--   auto-applied migration sequence and must never be executed without
--   explicit Owner authorization.
-- =====================================================================

BEGIN;

SET LOCAL search_path = "$user", public;

-- ---------------------------------------------------------------------
-- Canonical stable Function-ACL helper (corrected Option B algorithm)
--   line   : format('%I.%I(%s)', nspname, proname,
--                   pg_get_function_identity_arguments(oid))
--            || '|' || grantor || '|' || grantee(0 => PUBLIC)
--            || '|' || privilege_type || '|' || ('f'|'t')
--   filter : grantee IN (PUBLIC, anon, authenticated, service_role, postgres)
--   order  : ascending complete line text; separator E'\n'; no terminal newline
-- ---------------------------------------------------------------------
-- (temporary view; dropped automatically with the session temp schema)
CREATE TEMP VIEW rb_fn_acl_rows AS
WITH fns AS (
  SELECT o AS oid FROM unnest(ARRAY[
    to_regprocedure('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'),
    to_regprocedure('public._finance_invoice_approve_inline(uuid,uuid,uuid)'),
    to_regprocedure('public.create_invoice_with_items(uuid,uuid,jsonb)'),
    to_regprocedure('public.update_invoice_with_items(uuid,uuid,uuid,jsonb)'),
    to_regprocedure('public.delete_draft_invoice(uuid,uuid,uuid)'),
    to_regprocedure('public.approve_invoice(uuid,uuid,uuid)'),
    to_regprocedure('public.cancel_invoice(uuid,uuid,uuid,date,text)'),
    to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
    to_regprocedure('public.post_payment_session(uuid,uuid,jsonb)'),
    to_regprocedure('public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)'),
    to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
    to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
    to_regprocedure('public.create_source_checkout_invoice(uuid,uuid,jsonb)'),
    to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)')
  ]::oid[]) AS o
), ident AS (
  SELECT p.oid,
         format('%I.%I(%s)', n.nspname, p.proname,
                pg_get_function_identity_arguments(p.oid)) AS fid,
         COALESCE(p.proacl, acldefault('f', p.proowner)) AS acl
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.oid IN (SELECT oid FROM fns)
)
SELECT
  i.fid,
  COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantor), '<NULL>') AS grantor_name,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC'
       ELSE COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantee), '<NULL>')
  END AS grantee_name,
  a.privilege_type,
  CASE WHEN a.is_grantable THEN 't' ELSE 'f' END AS grantable,
  i.fid || '|' ||
  COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantor), '<NULL>') || '|' ||
  CASE WHEN a.grantee = 0 THEN 'PUBLIC'
       ELSE COALESCE((SELECT r.rolname FROM pg_roles r WHERE r.oid = a.grantee), '<NULL>')
  END || '|' || a.privilege_type || '|' ||
  CASE WHEN a.is_grantable THEN 't' ELSE 'f' END AS line
FROM ident i, aclexplode(i.acl) AS a;

-- ---------------------------------------------------------------------
-- MANDATORY STATE-B PRECONDITIONS
-- ---------------------------------------------------------------------
DO $rb_pre$
DECLARE v_hash text; v_sha text; v_cnt bigint; v_bytes bigint; v_str text;
BEGIN
  -- 1. PostgreSQL major version 17
  IF current_setting('server_version_num')::int < 170000
     OR current_setting('server_version_num')::int >= 180000 THEN
    RAISE EXCEPTION 'RB_PG17_REQUIRED';
  END IF;

  -- 2. Database binding (advisory where verifiable)
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'RB_DATABASE_BINDING: %', current_database();
  END IF;

  -- 3. Forward migration identity
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = ''20260804083738'''
      INTO v_cnt;
    IF v_cnt <> 1 THEN RAISE EXCEPTION 'RB_FORWARD_MIGRATION_MISSING: %', v_cnt; END IF;
  END IF;

  -- 4./5. Exact three SELECT Policies and State-B Policy fingerprint
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_POLICY_STATE_B_COUNT: %', v_cnt; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND p.polcmd = 'r';
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_POLICY_STATE_B_NOT_ALL_SELECT: %', v_cnt; END IF;

  SELECT md5(string_agg(
           n.nspname||'|'||c.relname||'|'||p.polname||'|'||p.polcmd::text||'|'||
           p.polpermissive::text||'|'||
           COALESCE((SELECT string_agg(role_oid::text, ',' ORDER BY role_oid)
                     FROM unnest(p.polroles) AS role_oid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>'),
           E'\n' ORDER BY c.relname, p.polname))
    INTO v_hash
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_hash IS DISTINCT FROM '04297828f4bd33eba043f6c9274ec57b' THEN
    RAISE EXCEPTION 'RB_POLICY_STATE_B_HASH: %', v_hash;
  END IF;

  -- 6. Table-ACL State-B count/hash
  SELECT md5(string_agg(line, ';' ORDER BY line)), count(*) INTO v_hash, v_cnt
  FROM (
    SELECT format('public.%s|%s|%s|%s|%s', c.relname, a.grantor, a.grantee,
                  a.privilege_type, a.is_grantable) AS line
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace,
         aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
    WHERE ns.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
  ) s;
  IF v_cnt <> 44 OR v_hash IS DISTINCT FROM '204017a1207bc68a246c3415e3975478' THEN
    RAISE EXCEPTION 'RB_TABLE_ACL_STATE_B: % / %', v_cnt, v_hash;
  END IF;

  -- 7. CORRECTED OPTION-B STABLE FUNCTION-ACL STATE-B PRECONDITION
  SELECT string_agg(line, E'\n' ORDER BY line), count(*)
    INTO v_str, v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name IN ('PUBLIC','anon','authenticated','service_role','postgres');
  v_bytes := octet_length(v_str);
  v_hash  := md5(v_str);
  v_sha   := encode(sha256(convert_to(v_str, 'UTF8')), 'hex');
  IF v_cnt <> 35
     OR v_bytes <> 5277
     OR v_hash IS DISTINCT FROM '31a3c711f72f419e75f89a234a9923cc'
     OR v_sha  IS DISTINCT FROM '67128e3269272e695b4452247eed409378b5f30d10c5df54a9d6b617abeea404' THEN
    RAISE EXCEPTION 'RB_STABLE_FN_ACL_STATE_B: % rows / % bytes / % / %',
      v_cnt, v_bytes, v_hash, v_sha;
  END IF;

  -- 8. Exact approved comments
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: append-only ledger. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.'
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: derived customer balances. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.' THEN
    RAISE EXCEPTION 'RB_COMMENT_STATE_B_MISMATCH';
  END IF;

  -- 9. Helpers hardened at search_path=public, pg_temp
  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY[
    to_regprocedure('public.has_permission(uuid,uuid,text)'),
    to_regprocedure('public.is_tenant_member(uuid,uuid)'),
    to_regprocedure('public.is_active_tenant_member(uuid,uuid)')
  ]::oid[]) AS o
  JOIN pg_proc p ON p.oid = o
  WHERE p.proowner = 'postgres'::regrole AND p.prosecdef IS TRUE
    AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=public, pg_temp');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_HELPER_STATE_B_DRIFT: %', v_cnt; END IF;

  -- 10. POS unavailable to PUBLIC / anon / authenticated
  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'RB_POS_STATE_B_DRIFT';
  END IF;
  IF EXISTS (SELECT 1 FROM rb_fn_acl_rows
             WHERE fid LIKE 'public.create_pos_sale(%' AND grantee_name = 'PUBLIC') THEN
    RAISE EXCEPTION 'RB_POS_PUBLIC_GRANT_PRESENT';
  END IF;

  -- 11. Internal Writers unavailable to browser roles
  IF EXISTS (
    SELECT 1 FROM rb_fn_acl_rows
    WHERE grantee_name IN ('PUBLIC','anon','authenticated')
      AND (fid LIKE 'public._finance_ledger_insert(%'
        OR fid LIKE 'public._finance_invoice_approve_inline(%')
  ) THEN
    RAISE EXCEPTION 'RB_INTERNAL_WRITER_BROWSER_EXECUTE_PRESENT';
  END IF;

  -- 12. Required authenticated Wrappers present
  SELECT count(*) INTO v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name = 'authenticated' AND privilege_type = 'EXECUTE';
  IF v_cnt <> 11 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_DRIFT: %', v_cnt; END IF;

  -- 13./14. service_role and postgres authority present
  SELECT count(*) INTO v_cnt FROM rb_fn_acl_rows WHERE grantee_name = 'service_role';
  IF v_cnt <> 10 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_DRIFT: %', v_cnt; END IF;
  SELECT count(*) INTO v_cnt FROM rb_fn_acl_rows WHERE grantee_name = 'postgres';
  IF v_cnt <> 14 THEN RAISE EXCEPTION 'RB_POSTGRES_AUTHORITY_DRIFT: %', v_cnt; END IF;

  -- 15. Zero Column ACL
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_COLUMN_ACL_PRESENT'; END IF;

  -- 16. Zero browser-role inheritance
  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_BROWSER_ROLE_INHERITANCE'; END IF;

  -- 17./18./19. RLS true, FORCE RLS false, owners postgres
  SELECT count(*) INTO v_cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND c.relowner='postgres'::regrole AND c.relrowsecurity IS TRUE
    AND c.relforcerowsecurity IS FALSE;
  IF v_cnt <> 2 THEN RAISE EXCEPTION 'RB_TABLE_STATE_DRIFT'; END IF;

  -- 20. Trusted schema
  IF has_schema_privilege('anon','public','CREATE')
     OR has_schema_privilege('authenticated','public','CREATE') THEN
    RAISE EXCEPTION 'RB_TRUSTED_SCHEMA_DRIFT';
  END IF;

  -- 21. Financial-row counts / hashes
  SELECT count(*) INTO v_cnt FROM public.ledger_entries;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.ledger_entries AS t;
  IF v_cnt <> 88 OR v_hash IS DISTINCT FROM '23e73fd58f9308913ac978acee94b2f2' THEN
    RAISE EXCEPTION 'RB_LEDGER_STATE_B_INVARIANT: % / %', v_cnt, v_hash;
  END IF;
  SELECT count(*) INTO v_cnt FROM public.customer_balances;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.customer_balances AS t;
  IF v_cnt <> 8 OR v_hash IS DISTINCT FROM '22e38d161b126cca31f4c26830084012' THEN
    RAISE EXCEPTION 'RB_BALANCE_STATE_B_INVARIANT: % / %', v_cnt, v_hash;
  END IF;

  -- 22. No governed-role Grant Option
  IF EXISTS (SELECT 1 FROM rb_fn_acl_rows
             WHERE grantee_name IN ('PUBLIC','anon','authenticated','service_role','postgres')
               AND grantable = 't') THEN
    RAISE EXCEPTION 'RB_GOVERNED_GRANT_OPTION_PRESENT';
  END IF;
END
$rb_pre$;

-- ---------------------------------------------------------------------
-- NON-BLOCKING PLATFORM SANDBOX OBSERVATION (pre-mutation)
-- Reference observation: 14 rows / 2449 bytes
--   MD5     9fa9afcfb207e5911f8b17eafc8e9adb
--   SHA-256 398631e3b7093b600e1faf37a1468b76b5522acee141659ec90cfb33a45fdd4b
-- Drift here is reported, never raised, and never bypasses a Stable
-- Contract failure. No sandbox role or privilege is ever altered.
-- ---------------------------------------------------------------------
DO $rb_obs$
DECLARE v_str text; v_cnt bigint; v_roles text;
BEGIN
  SELECT string_agg(rolname, ', ' ORDER BY rolname) INTO v_roles
  FROM pg_roles WHERE rolname = 'sandbox_exec' OR rolname LIKE 'sandbox\_exec\_%';

  SELECT string_agg(line, E'\n' ORDER BY line), count(*) INTO v_str, v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name = 'sandbox_exec' OR grantee_name LIKE 'sandbox\_exec\_%';

  RAISE NOTICE 'RB_SANDBOX_OBSERVATION roles=[%] rows=% bytes=% md5=% sha256=%',
    COALESCE(v_roles, '<NONE>'), COALESCE(v_cnt, 0),
    COALESCE(octet_length(v_str), 0),
    COALESCE(md5(v_str), '<NONE>'),
    COALESCE(encode(sha256(convert_to(COALESCE(v_str, ''), 'UTF8')), 'hex'), '<NONE>');

  IF COALESCE(v_cnt, 0) <> 14
     OR COALESCE(md5(v_str), '') <> '9fa9afcfb207e5911f8b17eafc8e9adb' THEN
    RAISE NOTICE 'RB_SANDBOX_OBSERVATION_DRIFT — non-blocking under approved Option B';
  END IF;
END
$rb_obs$;

-- Financial-row baseline captured before the rollback mutation
CREATE TEMP TABLE rb_financial_baseline
  ON COMMIT DROP
AS
SELECT 'ledger_entries'::text AS tbl,
       (SELECT count(*)::bigint FROM public.ledger_entries) AS row_count,
       (SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
          FROM public.ledger_entries AS t) AS row_hash
UNION ALL
SELECT 'customer_balances'::text,
       (SELECT count(*)::bigint FROM public.customer_balances),
       (SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
          FROM public.customer_balances AS t);

-- ---------------------------------------------------------------------
-- EXACT ROLLBACK MUTATION CORE (unchanged from the approved contract)
-- ---------------------------------------------------------------------
CREATE POLICY "Permission-based delete customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (
    has_permission(
      auth.uid(),
      tenant_id,
      'finance.invoice.edit'::text
    )
  );

CREATE POLICY "Permission-based insert customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    has_permission(
      auth.uid(),
      tenant_id,
      'finance.invoice.edit'::text
    )
  );

CREATE POLICY "Permission-based update customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR UPDATE
  TO PUBLIC
  USING (
    has_permission(
      auth.uid(),
      tenant_id,
      'finance.invoice.edit'::text
    )
  )
  WITH CHECK (
    has_permission(
      auth.uid(),
      tenant_id,
      'finance.invoice.edit'::text
    )
  );

CREATE POLICY "Permission-based insert ledger entries"
  ON public.ledger_entries
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    has_permission(
      auth.uid(),
      tenant_id,
      'finance.invoice.edit'::text
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
      REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries
  TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
      REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances
  TO anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb)
  TO anon, authenticated;

ALTER FUNCTION public.has_permission(uuid,uuid,text)
  SET search_path = public;

ALTER FUNCTION public.is_tenant_member(uuid,uuid)
  SET search_path = public;

ALTER FUNCTION public.is_active_tenant_member(uuid,uuid)
  SET search_path = public;

COMMENT ON TABLE public.ledger_entries IS NULL;

COMMENT ON TABLE public.customer_balances IS NULL;

-- ---------------------------------------------------------------------
-- MANDATORY STATE-A POSTCONDITIONS
-- ---------------------------------------------------------------------
DO $rb_post$
DECLARE v_hash text; v_sha text; v_cnt bigint; v_bytes bigint; v_str text;
        v_b_cnt bigint; v_b_hash text;
BEGIN
  -- 1. Policy State A
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 7 THEN RAISE EXCEPTION 'RB_POLICY_RESTORE_COUNT: %', v_cnt; END IF;

  SELECT md5(string_agg(
           n.nspname||'|'||c.relname||'|'||p.polname||'|'||p.polcmd::text||'|'||
           p.polpermissive::text||'|'||
           COALESCE((SELECT string_agg(role_oid::text, ',' ORDER BY role_oid)
                     FROM unnest(p.polroles) AS role_oid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>'),
           E'\n' ORDER BY c.relname, p.polname))
    INTO v_hash
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_hash IS DISTINCT FROM 'e978f912777a28108f46ba79e2ce071e' THEN
    RAISE EXCEPTION 'RB_POLICY_RESTORE_HASH: %', v_hash;
  END IF;

  -- 2. Table ACL State A
  SELECT md5(string_agg(line, ';' ORDER BY line)), count(*) INTO v_hash, v_cnt
  FROM (
    SELECT format('public.%s|%s|%s|%s|%s', c.relname, a.grantor, a.grantee,
                  a.privilege_type, a.is_grantable) AS line
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace,
         aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
    WHERE ns.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
  ) s;
  IF v_cnt <> 72 OR v_hash IS DISTINCT FROM 'f1567096c582eaaea20a816cc99cd269' THEN
    RAISE EXCEPTION 'RB_TABLE_ACL_RESTORE: % / %', v_cnt, v_hash;
  END IF;

  -- 3. CORRECTED OPTION-B STABLE FUNCTION-ACL STATE-A POSTCONDITION
  SELECT string_agg(line, E'\n' ORDER BY line), count(*)
    INTO v_str, v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name IN ('PUBLIC','anon','authenticated','service_role','postgres');
  v_bytes := octet_length(v_str);
  v_hash  := md5(v_str);
  v_sha   := encode(sha256(convert_to(v_str, 'UTF8')), 'hex');
  IF v_cnt <> 37
     OR v_bytes <> 5498
     OR v_hash IS DISTINCT FROM '36da554aef9a68d2acfbe9e1663c5def'
     OR v_sha  IS DISTINCT FROM '5a7c4fa94cc44fc330503b58a13dde678a83206270e79f681a295988cdd63db2' THEN
    RAISE EXCEPTION 'RB_STABLE_FN_ACL_STATE_A: % rows / % bytes / % / %',
      v_cnt, v_bytes, v_hash, v_sha;
  END IF;

  -- 4. Helpers restored to search_path=public
  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY[
    to_regprocedure('public.has_permission(uuid,uuid,text)'),
    to_regprocedure('public.is_tenant_member(uuid,uuid)'),
    to_regprocedure('public.is_active_tenant_member(uuid,uuid)')
  ]::oid[]) AS o
  JOIN pg_proc p ON p.oid = o
  WHERE EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=public');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_HELPER_RESTORE_DRIFT: %', v_cnt; END IF;

  -- 5. Comments restored to NULL
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'RB_COMMENT_NOT_CLEARED';
  END IF;

  -- 6./7./8. POS: PUBLIC false, anon true, authenticated true
  IF EXISTS (SELECT 1 FROM rb_fn_acl_rows
             WHERE fid LIKE 'public.create_pos_sale(%' AND grantee_name = 'PUBLIC') THEN
    RAISE EXCEPTION 'RB_POS_PUBLIC_GRANT_APPEARED';
  END IF;
  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') IS FALSE
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') IS FALSE THEN
    RAISE EXCEPTION 'RB_POS_NOT_RESTORED';
  END IF;

  -- 9. Internal Writer browser EXECUTE false
  IF EXISTS (
    SELECT 1 FROM rb_fn_acl_rows
    WHERE grantee_name IN ('PUBLIC','anon','authenticated')
      AND (fid LIKE 'public._finance_ledger_insert(%'
        OR fid LIKE 'public._finance_invoice_approve_inline(%')
  ) THEN
    RAISE EXCEPTION 'RB_INTERNAL_WRITER_BROWSER_EXECUTE_APPEARED';
  END IF;

  -- 10. authenticated Wrapper authority preserved (11 wrappers + restored POS)
  SELECT count(*) INTO v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name = 'authenticated' AND privilege_type = 'EXECUTE';
  IF v_cnt <> 12 THEN RAISE EXCEPTION 'RB_AUTHENTICATED_WRAPPER_RESTORE_DRIFT: %', v_cnt; END IF;

  -- 11./12. service_role and postgres authority preserved
  SELECT count(*) INTO v_cnt FROM rb_fn_acl_rows WHERE grantee_name = 'service_role';
  IF v_cnt <> 11 THEN RAISE EXCEPTION 'RB_SERVICE_ROLE_AUTHORITY_LOST: %', v_cnt; END IF;
  SELECT count(*) INTO v_cnt FROM rb_fn_acl_rows WHERE grantee_name = 'postgres';
  IF v_cnt <> 14 THEN RAISE EXCEPTION 'RB_POSTGRES_AUTHORITY_LOST: %', v_cnt; END IF;

  -- 13. Zero Column ACL
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_COLUMN_ACL_APPEARED'; END IF;

  -- 14. Zero browser-role inheritance
  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_INHERITANCE_APPEARED'; END IF;

  -- 15./16./17. owners unchanged, RLS true, FORCE RLS false
  SELECT count(*) INTO v_cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND c.relowner='postgres'::regrole AND c.relrowsecurity IS TRUE
    AND c.relforcerowsecurity IS FALSE;
  IF v_cnt <> 2 THEN RAISE EXCEPTION 'RB_TABLE_STATE_CHANGED'; END IF;

  -- 18. Trusted schema
  IF has_schema_privilege('anon','public','CREATE')
     OR has_schema_privilege('authenticated','public','CREATE') THEN
    RAISE EXCEPTION 'RB_TRUSTED_SCHEMA_CHANGED';
  END IF;

  -- 19. Ledger rows unchanged
  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM rb_financial_baseline WHERE tbl='ledger_entries';
  SELECT count(*) INTO v_cnt FROM public.ledger_entries;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.ledger_entries AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash
     OR v_cnt <> 88 OR v_hash IS DISTINCT FROM '23e73fd58f9308913ac978acee94b2f2' THEN
    RAISE EXCEPTION 'RB_LEDGER_ROW_INVARIANCE_FAILED';
  END IF;

  -- 20. Customer balance rows unchanged
  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM rb_financial_baseline WHERE tbl='customer_balances';
  SELECT count(*) INTO v_cnt FROM public.customer_balances;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.customer_balances AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash
     OR v_cnt <> 8 OR v_hash IS DISTINCT FROM '22e38d161b126cca31f4c26830084012' THEN
    RAISE EXCEPTION 'RB_BALANCE_ROW_INVARIANCE_FAILED';
  END IF;

  -- 21. No governed-role Grant Option
  IF EXISTS (SELECT 1 FROM rb_fn_acl_rows
             WHERE grantee_name IN ('PUBLIC','anon','authenticated','service_role','postgres')
               AND grantable = 't') THEN
    RAISE EXCEPTION 'RB_GOVERNED_GRANT_OPTION_APPEARED';
  END IF;
END
$rb_post$;

-- ---------------------------------------------------------------------
-- NON-BLOCKING PLATFORM SANDBOX OBSERVATION (post-mutation)
-- ---------------------------------------------------------------------
DO $rb_obs_post$
DECLARE v_str text; v_cnt bigint;
BEGIN
  SELECT string_agg(line, E'\n' ORDER BY line), count(*) INTO v_str, v_cnt
  FROM rb_fn_acl_rows
  WHERE grantee_name = 'sandbox_exec' OR grantee_name LIKE 'sandbox\_exec\_%';
  RAISE NOTICE 'RB_SANDBOX_OBSERVATION_POST rows=% bytes=% md5=% sha256=%',
    COALESCE(v_cnt, 0), COALESCE(octet_length(v_str), 0),
    COALESCE(md5(v_str), '<NONE>'),
    COALESCE(encode(sha256(convert_to(COALESCE(v_str, ''), 'UTF8')), 'hex'), '<NONE>');
END
$rb_obs_post$;

COMMIT;

-- =====================================================================
-- DO NOT EXECUTE WITHOUT EXPLICIT OWNER AUTHORIZATION
-- Never grant create_pos_sale EXECUTE to PUBLIC.
-- Never grant, revoke or otherwise mutate a sandbox_exec* privilege.
-- No financial DML is performed by this artifact.
-- Any failed assertion rolls back the entire transaction.
-- STATUS: NOT EXECUTED.
-- =====================================================================
