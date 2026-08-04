-- =====================================================================
-- EMERGENCY ROLLBACK ARTIFACT — DO NOT EXECUTE WITHOUT EXPLICIT OWNER
-- AUTHORIZATION
-- =====================================================================
-- Roadmap:      RM-DH-004 — Financial Truth Stabilization & Historical
--               Data Migration
-- Phase:        Phase 1 — Economic Date Integrity
-- Workstream:   WS-DH-2026-0003 — Economic Date Integrity
-- Prompt:       PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-
--               ECONOMIC-DATE-STAGE-B-DATABASE-AUTHORITY-MIGRATION-EXECUTION-24
-- Database:     postgres (project ref vhxglsvxwwpmoqjabfmj), PostgreSQL 17.0006
-- Branch:       edit/edt-1156d75e-a300-4976-8fae-e84f0432a25c
-- Pre-write HEAD: c59518d7b253aa7795cb2e2748cd15a421d2935b
-- Evidence time (UTC): 2026-08-04T08:37Z
--
-- Bound Forward migration:
--   supabase/migrations/20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql
--   SHA-256: 602804b939876ee3a2a19114296de3ff080aafc574a3b0913bed1fa6e80baa5f
--   Byte length: 20504
--
-- State A (pre-Forward) fingerprints:
--   Policy      7  rows / e978f912777a28108f46ba79e2ce071e
--   Table-ACL   72 rows / f1567096c582eaaea20a816cc99cd269
--   Function-ACL 65 rows / b4138d2f6c8bf2ca01c41d437976d116
-- State B (post-Forward) fingerprints:
--   Policy      3  rows / 04297828f4bd33eba043f6c9274ec57b
--   Table-ACL   44 rows / 204017a1207bc68a246c3415e3975478
--   Function-ACL 63 rows / f2507d9a41a1bc76319b553328d8dd09
-- Financial-row invariants (unchanged by Forward):
--   public.ledger_entries     88 rows / 23e73fd58f9308913ac978acee94b2f2
--   public.customer_balances   8 rows / 22e38d161b126cca31f4c26830084012
--
-- This artifact is NOT part of the auto-applied migration sequence.
-- =====================================================================

BEGIN;

SET LOCAL search_path = "$user", public;

-- ---------------------------------------------------------------------
-- 15.1 MANDATORY STATE-B PRECONDITIONS
-- ---------------------------------------------------------------------
DO $rb_pre$
DECLARE v_hash text; v_cnt bigint;
BEGIN
  IF current_setting('server_version_num')::int < 170000
     OR current_setting('server_version_num')::int >= 180000 THEN
    RAISE EXCEPTION 'RB_PG17_REQUIRED';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_POLICY_STATE_B_COUNT: %', v_cnt; END IF;

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

  SELECT md5(string_agg(line, ';' ORDER BY line)), count(*) INTO v_hash, v_cnt
  FROM (
    SELECT format('%s|%s|%s|%s|%s', o::regprocedure::text, a.grantor, a.grantee,
                  a.privilege_type, a.is_grantable) AS line
    FROM unnest(ARRAY[
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
    JOIN pg_proc p ON p.oid = o,
    aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS a
  ) s;
  IF v_cnt <> 63 OR v_hash IS DISTINCT FROM 'f2507d9a41a1bc76319b553328d8dd09' THEN
    RAISE EXCEPTION 'RB_FUNCTION_ACL_STATE_B: % / %', v_cnt, v_hash;
  END IF;

  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: append-only ledger. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.'
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: derived customer balances. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.' THEN
    RAISE EXCEPTION 'RB_COMMENT_STATE_B_MISMATCH';
  END IF;

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

  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'RB_POS_STATE_B_DRIFT';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_COLUMN_ACL_PRESENT'; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_BROWSER_ROLE_INHERITANCE'; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND c.relowner='postgres'::regrole AND c.relrowsecurity IS TRUE
    AND c.relforcerowsecurity IS FALSE;
  IF v_cnt <> 2 THEN RAISE EXCEPTION 'RB_TABLE_STATE_DRIFT'; END IF;

  IF has_schema_privilege('anon','public','CREATE')
     OR has_schema_privilege('authenticated','public','CREATE') THEN
    RAISE EXCEPTION 'RB_TRUSTED_SCHEMA_DRIFT';
  END IF;
END
$rb_pre$;

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
-- 15.2 EXACT ROLLBACK MUTATION CORE
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
-- 15.3 ROLLBACK POSTCONDITIONS — STATE A RESTORED
-- ---------------------------------------------------------------------
DO $rb_post$
DECLARE v_hash text; v_cnt bigint; v_b_cnt bigint; v_b_hash text;
BEGIN
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

  SELECT md5(string_agg(line, ';' ORDER BY line)), count(*) INTO v_hash, v_cnt
  FROM (
    SELECT format('%s|%s|%s|%s|%s', o::regprocedure::text, a.grantor, a.grantee,
                  a.privilege_type, a.is_grantable) AS line
    FROM unnest(ARRAY[
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
    JOIN pg_proc p ON p.oid = o,
    aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS a
  ) s;
  IF v_cnt <> 65 OR v_hash IS DISTINCT FROM 'b4138d2f6c8bf2ca01c41d437976d116' THEN
    RAISE EXCEPTION 'RB_FUNCTION_ACL_RESTORE: % / %', v_cnt, v_hash;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY[
    to_regprocedure('public.has_permission(uuid,uuid,text)'),
    to_regprocedure('public.is_tenant_member(uuid,uuid)'),
    to_regprocedure('public.is_active_tenant_member(uuid,uuid)')
  ]::oid[]) AS o
  JOIN pg_proc p ON p.oid = o
  WHERE EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=public');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'RB_HELPER_RESTORE_DRIFT: %', v_cnt; END IF;

  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'RB_COMMENT_NOT_CLEARED';
  END IF;

  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') IS FALSE
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') IS FALSE THEN
    RAISE EXCEPTION 'RB_POS_NOT_RESTORED';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_COLUMN_ACL_APPEARED'; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RB_INHERITANCE_APPEARED'; END IF;

  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM rb_financial_baseline WHERE tbl='ledger_entries';
  SELECT count(*) INTO v_cnt FROM public.ledger_entries;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.ledger_entries AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash
     OR v_hash IS DISTINCT FROM '23e73fd58f9308913ac978acee94b2f2' THEN
    RAISE EXCEPTION 'RB_LEDGER_ROW_INVARIANCE_FAILED';
  END IF;

  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM rb_financial_baseline WHERE tbl='customer_balances';
  SELECT count(*) INTO v_cnt FROM public.customer_balances;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.customer_balances AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash
     OR v_hash IS DISTINCT FROM '22e38d161b126cca31f4c26830084012' THEN
    RAISE EXCEPTION 'RB_BALANCE_ROW_INVARIANCE_FAILED';
  END IF;
END
$rb_post$;

COMMIT;

-- =====================================================================
-- DO NOT EXECUTE WITHOUT EXPLICIT OWNER AUTHORIZATION
-- Never grant create_pos_sale EXECUTE to PUBLIC.
-- =====================================================================
