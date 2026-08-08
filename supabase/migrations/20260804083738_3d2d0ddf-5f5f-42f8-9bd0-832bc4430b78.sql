-- RM-DH-004 / WS-DH-2026-0003 — Stage B Database Authority Migration
-- Browser table-DML closure, write-policy removal, POS EXECUTE revocation,
-- helper search_path hardening, approved table comments.
-- Guarded and atomic. Zero financial-row DML.

SET LOCAL search_path = "$user", public;

-- =========================================================
-- PRECONDITIONS (State A)
-- =========================================================
DO $stage_b_pre$
DECLARE
  v_hash             text;
  v_cnt              bigint;
  v_sig              text;
  v_sem_hash         text;
  v_fn               oid;
  v_auth_required    boolean;
  v_service_required boolean;
BEGIN
  -- PostgreSQL 17 major assertion
  IF current_setting('server_version_num')::int < 170000
     OR current_setting('server_version_num')::int >= 180000 THEN
    RAISE EXCEPTION 'STAGE_B_PG17_REQUIRED: %', current_setting('server_version_num');
  END IF;

  -- Exact table state: owner, RLS, FORCE RLS, comment NULL
  SELECT count(*) INTO v_cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND c.relowner = 'postgres'::regrole
    AND c.relrowsecurity IS TRUE
    AND c.relforcerowsecurity IS FALSE
    AND obj_description(c.oid,'pg_class') IS NULL;
  IF v_cnt <> 2 THEN RAISE EXCEPTION 'STAGE_B_TABLE_PRESTATE_DRIFT: %', v_cnt; END IF;

  -- Zero column-level ACL
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_COLUMN_ACL_PRESENT: %', v_cnt; END IF;

  -- Zero browser-role inheritance
  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_BROWSER_ROLE_INHERITANCE: %', v_cnt; END IF;

  -- Trusted schema
  IF has_schema_privilege('anon','public','CREATE')
     OR has_schema_privilege('authenticated','public','CREATE') THEN
    RAISE EXCEPTION 'STAGE_B_TRUSTED_SCHEMA_DRIFT';
  END IF;

  -- Policy pre-state: count and exact fingerprint
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 7 THEN RAISE EXCEPTION 'STAGE_B_POLICY_PRECOUNT: %', v_cnt; END IF;

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
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_hash IS DISTINCT FROM 'e978f912777a28108f46ba79e2ce071e' THEN
    RAISE EXCEPTION 'STAGE_B_POLICY_PRESTATE_DRIFT: %', v_hash;
  END IF;

  -- Exact four write policies must exist
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  WHERE (c.relname, p.polname) IN (
      ('customer_balances','Permission-based delete customer balances'),
      ('customer_balances','Permission-based insert customer balances'),
      ('customer_balances','Permission-based update customer balances'),
      ('ledger_entries','Permission-based insert ledger entries'));
  IF v_cnt <> 4 THEN RAISE EXCEPTION 'STAGE_B_TARGET_POLICIES_MISSING: %', v_cnt; END IF;

  -- Table-ACL pre-state: accept either the frozen historical state or the
  -- proven canonical clean-reconstruction semantic state; fail closed otherwise.
  SELECT md5(string_agg(line, ';' ORDER BY line)), count(*) INTO v_hash, v_cnt
  FROM (
    SELECT format('public.%s|%s|%s|%s|%s', c.relname, a.grantor, a.grantee,
                  a.privilege_type, a.is_grantable) AS line
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace,
         aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
    WHERE ns.nspname = 'public'
      AND c.relname IN ('ledger_entries','customer_balances')
  ) s;

  SELECT md5(string_agg(line, ';' ORDER BY line COLLATE "C")) INTO v_sem_hash
  FROM (
    SELECT format(
      'public.%s|%s|%s|%s|%s',
      c.relname,
      COALESCE(gr.rolname::text, format('<MISSING_OID_%s>', a.grantor)),
      CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
           ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END,
      a.privilege_type,
      CASE WHEN a.is_grantable THEN 'true' ELSE 'false' END
    ) AS line
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
    LEFT JOIN pg_roles gr ON gr.oid = a.grantor
    LEFT JOIN pg_roles ge ON ge.oid = a.grantee
    WHERE ns.nspname = 'public'
      AND c.relname IN ('ledger_entries','customer_balances')
  ) s;

  IF NOT (
       (v_cnt = 72 AND v_hash IS NOT DISTINCT FROM 'f1567096c582eaaea20a816cc99cd269')
    OR (v_cnt = 40 AND v_sem_hash IS NOT DISTINCT FROM '8e93ede755b2b354a7cda93ed92221f3')
  ) THEN
      -- G-A1 diagnostic-only ACL composition evidence. Observational only.
    RAISE NOTICE 'G_A1_DIAGNOSTIC_BEGIN|scope=public.ledger_entries,public.customer_balances';
    RAISE NOTICE 'G_A1_ACL_TOTAL_COUNT=%', v_cnt;
    RAISE NOTICE 'G_A1_OID_COUPLED_MD5=%', v_hash;

    -- D1: full ACL enumeration, one NOTICE per row.
    FOR v_sig IN
      SELECT format(
        'G_A1_ACL_ROW|schema=public|table=%s|grantor_name=%s|grantor_oid=%s|grantee_name=%s|grantee_oid=%s|privilege=%s|is_grantable=%s|acl_is_default=%s|owner_name=%s',
        c.relname,
        COALESCE(gr.rolname::text, format('<MISSING_OID_%s>', a.grantor)),
        a.grantor,
        CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
             ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END,
        a.grantee, a.privilege_type,
        CASE WHEN a.is_grantable THEN 'true' ELSE 'false' END,
        CASE WHEN c.relacl IS NULL THEN 'true' ELSE 'false' END,
        COALESCE(ow.rolname::text, format('<MISSING_OID_%s>', c.relowner))
      )
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
      LEFT JOIN pg_roles gr ON gr.oid = a.grantor
      LEFT JOIN pg_roles ge ON ge.oid = a.grantee
      LEFT JOIN pg_roles ow ON ow.oid = c.relowner
      WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      ORDER BY c.relname::text COLLATE "C",
               (CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
                     ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END) COLLATE "C",
               a.privilege_type COLLATE "C",
               COALESCE(gr.rolname::text, format('<MISSING_OID_%s>', a.grantor)) COLLATE "C",
               a.grantor, a.grantee
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D3: per-table ACL row counts.
    FOR v_sig IN
      SELECT format('G_A1_ACL_TABLE_COUNT|schema=public|table=%s|count=%s', c.relname, count(*))
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
      WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      GROUP BY c.relname
      ORDER BY c.relname::text COLLATE "C"
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D4: per-table/per-grantee privilege summaries.
    FOR v_sig IN
      SELECT format(
        'G_A1_ACL_GRANTEE_SUMMARY|schema=public|table=%s|grantee_name=%s|grantee_oid=%s|privilege_count=%s|privileges=%s|any_grant_option=%s',
        s.table_name, s.grantee_name, s.grantee_oid, count(*),
        string_agg(s.privilege_type, ',' ORDER BY s.privilege_type COLLATE "C"),
        CASE WHEN bool_or(s.is_grantable) THEN 'true' ELSE 'false' END
      )
      FROM (
        SELECT c.relname::text AS table_name,
               CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
                    ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END AS grantee_name,
               a.grantee AS grantee_oid, a.privilege_type, a.is_grantable
        FROM pg_class c
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
        LEFT JOIN pg_roles ge ON ge.oid = a.grantee
        WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      ) s
      GROUP BY s.table_name, s.grantee_name, s.grantee_oid
      ORDER BY s.table_name COLLATE "C", s.grantee_name COLLATE "C", s.grantee_oid
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D6: OID-free semantic fingerprint (diagnostic only).
    SELECT md5(string_agg(line, ';' ORDER BY line COLLATE "C")) INTO v_sig
    FROM (
      SELECT format(
        'public.%s|%s|%s|%s|%s',
        c.relname,
        COALESCE(gr.rolname::text, format('<MISSING_OID_%s>', a.grantor)),
        CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
             ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END,
        a.privilege_type,
        CASE WHEN a.is_grantable THEN 'true' ELSE 'false' END
      ) AS line
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS a
      LEFT JOIN pg_roles gr ON gr.oid = a.grantor
      LEFT JOIN pg_roles ge ON ge.oid = a.grantee
      WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    ) s;
    RAISE NOTICE 'G_A1_SEMANTIC_MD5=%', v_sig;

    -- D7: comparisons; neither comparison changes the fail-closed guard.
    RAISE NOTICE 'G_A1_RUN4_COMPARISON|actual_count=%|actual_oid_md5=%|reference_count=40|reference_oid_md5=e501726247d48849ceb998960c349478|match=%',
      v_cnt, v_hash,
      CASE WHEN v_cnt = 40 AND v_hash IS NOT DISTINCT FROM 'e501726247d48849ceb998960c349478'
           THEN 'true' ELSE 'false' END;
    RAISE NOTICE 'G_A1_FROZEN_GUARD_COMPARISON|actual_count=%|actual_oid_md5=%|reference_count=72|reference_oid_md5=f1567096c582eaaea20a816cc99cd269|match=%',
      v_cnt, v_hash,
      CASE WHEN v_cnt = 72 AND v_hash IS NOT DISTINCT FROM 'f1567096c582eaaea20a816cc99cd269'
           THEN 'true' ELSE 'false' END;

    -- D8-A/B: table/RLS/relacl context and column-ACL census.
    FOR v_sig IN
      SELECT format(
        'G_A1_TABLE_CONTEXT|schema=public|table=%s|owner_name=%s|owner_oid=%s|rls=%s|force_rls=%s|relacl_is_null=%s',
        c.relname, COALESCE(ow.rolname::text, format('<MISSING_OID_%s>', c.relowner)), c.relowner,
        CASE WHEN c.relrowsecurity THEN 'true' ELSE 'false' END,
        CASE WHEN c.relforcerowsecurity THEN 'true' ELSE 'false' END,
        CASE WHEN c.relacl IS NULL THEN 'true' ELSE 'false' END
      )
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      LEFT JOIN pg_roles ow ON ow.oid = c.relowner
      WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      ORDER BY c.relname::text COLLATE "C"
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    FOR v_sig IN
      SELECT format('G_A1_COLUMN_ACL_COUNT|schema=public|table=%s|attacl_nonnull_count=%s',
                    c.relname, count(*) FILTER (WHERE a.attacl IS NOT NULL))
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE ns.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      GROUP BY c.relname
      ORDER BY c.relname::text COLLATE "C"
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D8-C: relevant role existence/OIDs.
    FOR v_sig IN
      SELECT format('G_A1_ROLE_CONTEXT|role_name=%s|exists=%s|oid=%s',
                    wanted.role_name,
                    CASE WHEN r.oid IS NULL THEN 'false' ELSE 'true' END,
                    COALESCE(r.oid::text, '<ABSENT>'))
      FROM unnest(ARRAY[
        'postgres'::text,'anon','authenticated','service_role','supabase_admin','dashboard_user',
        'supabase_auth_admin','supabase_storage_admin','authenticator','pgbouncer','sandbox_exec'
      ]) WITH ORDINALITY AS wanted(role_name, ord)
      LEFT JOIN pg_roles r ON r.rolname = wanted.role_name
      ORDER BY wanted.ord
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D8-D: relevant table default ACL entries, global or public-schema.
    FOR v_sig IN
      SELECT format(
        'G_A1_DEFAULT_ACL|namespace=%s|owner_name=%s|owner_oid=%s|object_type=%s|grantee_name=%s|grantee_oid=%s|privilege=%s|is_grantable=%s',
        CASE WHEN d.defaclnamespace = 0::oid THEN '<GLOBAL>'
             ELSE COALESCE(ns.nspname::text, format('<MISSING_OID_%s>', d.defaclnamespace)) END,
        COALESCE(owner_r.rolname::text, format('<MISSING_OID_%s>', d.defaclrole)), d.defaclrole,
        d.defaclobjtype,
        CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
             ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END,
        a.grantee, a.privilege_type,
        CASE WHEN a.is_grantable THEN 'true' ELSE 'false' END
      )
      FROM pg_default_acl d
      LEFT JOIN pg_namespace ns ON ns.oid = d.defaclnamespace
      LEFT JOIN pg_roles owner_r ON owner_r.oid = d.defaclrole
      CROSS JOIN LATERAL aclexplode(d.defaclacl) AS a
      LEFT JOIN pg_roles ge ON ge.oid = a.grantee
      WHERE d.defaclobjtype = 'r' AND (d.defaclnamespace = 0::oid OR ns.nspname = 'public')
      ORDER BY
        (CASE WHEN d.defaclnamespace = 0::oid THEN '<GLOBAL>'
              ELSE COALESCE(ns.nspname::text, format('<MISSING_OID_%s>', d.defaclnamespace)) END) COLLATE "C",
        COALESCE(owner_r.rolname::text, format('<MISSING_OID_%s>', d.defaclrole)) COLLATE "C",
        d.defaclrole,
        (CASE WHEN a.grantee = 0::oid THEN 'PUBLIC'
              ELSE COALESCE(ge.rolname::text, format('<MISSING_OID_%s>', a.grantee)) END) COLLATE "C",
        a.grantee, a.privilege_type COLLATE "C"
    LOOP
      RAISE NOTICE '%', v_sig;
    END LOOP;

    -- D8-E: server version.
    RAISE NOTICE 'G_A1_SERVER_VERSION=%', current_setting('server_version');
    RAISE NOTICE 'G_A1_DIAGNOSTIC_END';
    RAISE EXCEPTION 'STAGE_B_TABLE_ACL_PRESTATE_DRIFT: % / %', v_cnt, v_hash;
  END IF;

  -- Function ACL/security pre-state.
  --
  -- POS-PRESENT:
  --   Preserve the authoritative historical fourteen-function aggregate
  --   fingerprint and fourteen-function security contract unchanged.
  --
  -- POS-ABSENT:
  --   Canonical clean reconstruction has no managed create_pos_sale creator.
  --   Verify the thirteen real finance functions structurally from managed
  --   chain intent instead of inventing a replacement aggregate fingerprint.
  IF pg_catalog.to_regprocedure(
       'public.create_pos_sale(uuid,uuid,jsonb)'
     ) IS NOT NULL THEN

    -- POS-PRESENT: authoritative historical fourteen-function ACL freeze.
    SELECT md5(string_agg(line, ';' ORDER BY line)), count(*)
      INTO v_hash, v_cnt
    FROM (
      SELECT format(
               '%s|%s|%s|%s|%s',
               o::regprocedure::text,
               a.grantor,
               a.grantee,
               a.privilege_type,
               a.is_grantable
             ) AS line
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

    IF v_cnt <> 65
       OR v_hash IS DISTINCT FROM 'b4138d2f6c8bf2ca01c41d437976d116' THEN
      RAISE EXCEPTION
        'STAGE_B_FUNCTION_ACL_PRESTATE_DRIFT: % / %',
        v_cnt, v_hash;
    END IF;

    -- POS-PRESENT: fourteen functions must retain the historical
    -- owner / SECURITY DEFINER / search_path contract.
    SELECT count(*) INTO v_cnt
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
    JOIN pg_proc p ON p.oid = o
    WHERE p.proowner = 'postgres'::regrole
      AND p.prosecdef IS TRUE
      AND EXISTS (
        SELECT 1
        FROM unnest(p.proconfig) cfg
        WHERE cfg = 'search_path=""'
      );

    IF v_cnt <> 14 THEN
      RAISE EXCEPTION
        'STAGE_B_FUNCTION_SECURITY_PRESTATE_DRIFT: %',
        v_cnt;
    END IF;

  ELSE

    -- POS-ABSENT: expected canonical clean-reconstruction branch.
    RAISE NOTICE
      'STAGE_B_POS_ABSENT_CLEAN_RECONSTRUCTION: create_pos_sale absent; using thirteen-function managed semantic ACL contract';

    FOR v_sig, v_auth_required, v_service_required IN
      SELECT *
      FROM (
        VALUES
          ('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)', false, false),
          ('public._finance_invoice_approve_inline(uuid,uuid,uuid)',                                    false, false),
          ('public.create_invoice_with_items(uuid,uuid,jsonb)',                                       true,  false),
          ('public.update_invoice_with_items(uuid,uuid,uuid,jsonb)',                                  true,  false),
          ('public.delete_draft_invoice(uuid,uuid,uuid)',                                             true,  false),
          ('public.approve_invoice(uuid,uuid,uuid)',                                                  true,  false),
          ('public.cancel_invoice(uuid,uuid,uuid,date,text)',                                         true,  false),
          ('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',                         true,  false),
          ('public.post_payment_session(uuid,uuid,jsonb)',                                            true,  true),
          ('public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)',                             true,  false),
          ('public.post_expense_with_ledger(uuid,uuid,uuid)',                                         true,  false),
          ('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',                   true,  false),
          ('public.create_source_checkout_invoice(uuid,uuid,jsonb)',                                  true,  false)
      ) AS expected(sig, auth_required, service_required)
    LOOP
      v_fn := pg_catalog.to_regprocedure(v_sig);

      IF v_fn IS NULL THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_FUNCTION_MISSING: %',
          v_sig
          USING ERRCODE = '42883';
      END IF;

      -- Stable function-security contract.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p
      WHERE p.oid = v_fn
        AND p.proowner = 'postgres'::regrole
        AND p.prosecdef IS TRUE
        AND EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) cfg
          WHERE cfg = 'search_path=""'
        );

      IF v_cnt <> 1 THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_FUNCTION_SECURITY_DRIFT: %',
          v_sig;
      END IF;

      -- Fail closed on any EXECUTE grantee outside the exact managed
      -- allowlist for this function, or on any grant option.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND (
          a.is_grantable IS TRUE
          OR NOT (
            CASE
              WHEN a.grantee = 0::oid THEN 'PUBLIC'
              ELSE pg_catalog.pg_get_userbyid(a.grantee)
            END = 'postgres'
            OR (
              CASE
                WHEN a.grantee = 0::oid THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(a.grantee)
              END = 'authenticated'
              AND v_auth_required
            )
            OR (
              CASE
                WHEN a.grantee = 0::oid THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(a.grantee)
              END = 'service_role'
              AND v_service_required
            )
          )
        );

      IF v_cnt <> 0 THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_FUNCTION_UNEXPECTED_EXECUTE: % / %',
          v_sig, v_cnt;
      END IF;

      -- authenticated must be present exactly where managed intent
      -- directly requires it, and absent everywhere else.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND a.is_grantable IS FALSE
        AND a.grantee = 'authenticated'::regrole;

      IF (v_cnt = 1) IS DISTINCT FROM v_auth_required THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_AUTHENTICATED_EXECUTE_DRIFT: % / %',
          v_sig, v_cnt;
      END IF;

      -- service_role is managed-authorized only for post_payment_session.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND a.is_grantable IS FALSE
        AND a.grantee = 'service_role'::regrole;

      IF (v_cnt = 1) IS DISTINCT FROM v_service_required THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_SERVICE_ROLE_EXECUTE_DRIFT: % / %',
          v_sig, v_cnt;
      END IF;
    END LOOP;
  END IF;

  -- Helper pre-state: exact three helpers at search_path=public
  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY[
    to_regprocedure('public.has_permission(uuid,uuid,text)'),
    to_regprocedure('public.is_tenant_member(uuid,uuid)'),
    to_regprocedure('public.is_active_tenant_member(uuid,uuid)')
  ]::oid[]) AS o
  JOIN pg_proc p ON p.oid = o
  WHERE p.proowner = 'postgres'::regrole
    AND p.prosecdef IS TRUE
    AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=public');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'STAGE_B_HELPER_PRESTATE_DRIFT: %', v_cnt; END IF;
END
$stage_b_pre$;

-- Transaction-local financial-row baseline (dropped at commit)
CREATE TEMP TABLE stage_b_financial_baseline
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

DO $stage_b_base$
DECLARE
  v_cnt bigint; v_hash text;
  v_led_cnt bigint; v_led_hash text;
  v_bal_cnt bigint; v_bal_hash text;
BEGIN
  SELECT row_count, row_hash INTO v_led_cnt, v_led_hash
    FROM stage_b_financial_baseline WHERE tbl='ledger_entries';
  SELECT row_count, row_hash INTO v_bal_cnt, v_bal_hash
    FROM stage_b_financial_baseline WHERE tbl='customer_balances';

  -- G9 three-state financial-row baseline contract:
  --   STATE A: both sets exactly empty  -> genuine clean reconstruction; hosted
  --            88/8 fingerprints are impossible and are bypassed. The generic
  --            pre-state -> post-state financial-row invariance check downstream
  --            (which compares against this same temp baseline) is preserved and
  --            still proves zero-to-zero non-mutation.
  --   STATE B: any populated non-matching state -> FAIL CLOSED.
  --   STATE C: exact hosted historical baseline -> original verification.
  IF v_led_cnt = 0 AND v_bal_cnt = 0 THEN
    RAISE NOTICE 'STAGE_B_FINANCIAL_BASELINE_CLEAN_RECONSTRUCTION: ledger_entries=0, customer_balances=0; hosted 88/8 fingerprint requirement bypassed, row-invariance protection retained';
  ELSE
    v_cnt := v_led_cnt; v_hash := v_led_hash;
    IF v_cnt <> 88 OR v_hash IS DISTINCT FROM '23e73fd58f9308913ac978acee94b2f2' THEN
      RAISE EXCEPTION 'STAGE_B_LEDGER_BASELINE_DRIFT: % / %', v_cnt, v_hash;
    END IF;
    v_cnt := v_bal_cnt; v_hash := v_bal_hash;
    IF v_cnt <> 8 OR v_hash IS DISTINCT FROM '22e38d161b126cca31f4c26830084012' THEN
      RAISE EXCEPTION 'STAGE_B_BALANCE_BASELINE_DRIFT: % / %', v_cnt, v_hash;
    END IF;
  END IF;
END
$stage_b_base$;

-- =========================================================
-- NORMATIVE FORWARD MUTATION CORE
-- =========================================================
DROP POLICY "Permission-based delete customer balances"
  ON public.customer_balances;

DROP POLICY "Permission-based insert customer balances"
  ON public.customer_balances;

DROP POLICY "Permission-based update customer balances"
  ON public.customer_balances;

DROP POLICY "Permission-based insert ledger entries"
  ON public.ledger_entries;

REVOKE ALL
  ON TABLE public.ledger_entries
  FROM anon, authenticated;

REVOKE ALL
  ON TABLE public.customer_balances
  FROM anon, authenticated;

GRANT SELECT
  ON TABLE public.ledger_entries
  TO anon, authenticated;

GRANT SELECT
  ON TABLE public.customer_balances
  TO anon, authenticated;

-- Preserve the current hosted service_role compatibility contract explicitly
-- on canonical clean reconstruction. No grant option is conferred.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries, public.customer_balances
  TO service_role;

DO $stage_b_pos_revoke$
BEGIN
  IF pg_catalog.to_regprocedure(
       'public.create_pos_sale(uuid,uuid,jsonb)'
     ) IS NOT NULL THEN
    EXECUTE
      'REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated';
  ELSE
    RAISE NOTICE
      'STAGE_B_POS_ABSENT_REVOKE_SKIPPED: create_pos_sale absent on canonical clean reconstruction';
  END IF;
END
$stage_b_pos_revoke$;

ALTER FUNCTION public.has_permission(uuid,uuid,text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_tenant_member(uuid,uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.is_active_tenant_member(uuid,uuid)
  SET search_path = public, pg_temp;

COMMENT ON TABLE public.ledger_entries IS
  'Financial truth: append-only ledger. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.';

COMMENT ON TABLE public.customer_balances IS
  'Financial truth: derived customer balances. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.';

-- =========================================================
-- POSTCONDITIONS (State B)
-- =========================================================
DO $stage_b_post$
DECLARE
  v_hash             text;
  v_cnt              bigint;
  v_b_cnt            bigint;
  v_b_hash           text;
  v_sig              text;
  v_fn               oid;
  v_auth_required    boolean;
  v_service_required boolean;
BEGIN
  -- Policy target
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'STAGE_B_POLICY_POSTCOUNT: %', v_cnt; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND (p.polcmd <> 'r' OR p.polpermissive IS FALSE OR p.polroles <> ARRAY[0::oid]);
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_POLICY_SHAPE_DRIFT: %', v_cnt; END IF;

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
    RAISE EXCEPTION 'STAGE_B_POLICY_TARGET_HASH: %', v_hash;
  END IF;

  -- Effective browser table privileges: SELECT only, never grantable.
  IF NOT (has_table_privilege('anon','public.ledger_entries','SELECT')
      AND has_table_privilege('authenticated','public.ledger_entries','SELECT')
      AND has_table_privilege('anon','public.customer_balances','SELECT')
      AND has_table_privilege('authenticated','public.customer_balances','SELECT')) THEN
    RAISE EXCEPTION 'STAGE_B_BROWSER_SELECT_MISSING';
  END IF;

  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY['anon','authenticated']) r,
       unnest(ARRAY['public.ledger_entries','public.customer_balances']) t,
       unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) pr
  WHERE has_table_privilege(r, t, pr);
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_BROWSER_WRITE_REMAINS: %', v_cnt; END IF;

  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY['anon','authenticated']) r,
       unnest(ARRAY['public.ledger_entries','public.customer_balances']) t,
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) pr
  WHERE has_table_privilege(r, t, pr || ' WITH GRANT OPTION');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_BROWSER_GRANT_OPTION_REMAINS: %', v_cnt; END IF;

  -- service_role compatibility contract: all eight table privileges on both
  -- finance tables, directly granted, with no grant option.
  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY['public.ledger_entries','public.customer_balances']) t,
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) pr
  WHERE has_table_privilege('service_role', t, pr);
  IF v_cnt <> 16 THEN
    RAISE EXCEPTION 'STAGE_B_SERVICE_ROLE_AUTHORITY_LOST: %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY['public.ledger_entries','public.customer_balances']) t,
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) pr
  WHERE has_table_privilege('service_role', t, pr || ' WITH GRANT OPTION');
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'STAGE_B_SERVICE_ROLE_GRANT_OPTION_PRESENT: %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS a
  WHERE ns.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND a.grantee = 'service_role'::regrole
    AND a.privilege_type = ANY(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']::text[])
    AND a.is_grantable IS FALSE;
  IF v_cnt <> 16 THEN
    RAISE EXCEPTION 'STAGE_B_SERVICE_ROLE_DIRECT_ACL_MISMATCH: %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS a
  WHERE ns.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND a.grantee = 'service_role'::regrole
    AND (
      a.is_grantable IS TRUE
      OR NOT (a.privilege_type = ANY(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']::text[]))
    );
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'STAGE_B_SERVICE_ROLE_DIRECT_ACL_UNEXPECTED: %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(c.relacl) AS a
  WHERE ns.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND a.grantee = 0::oid;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'STAGE_B_PUBLIC_TABLE_ACL_PRESENT: %', v_cnt;
  END IF;

  -- Function ACL/security target.
  --
  -- POS-PRESENT:
  --   Preserve the authoritative historical fourteen-function post-state
  --   aggregate fingerprint and POS browser-role denial unchanged.
  --
  -- POS-ABSENT:
  --   Canonical clean reconstruction has no managed create_pos_sale creator.
  --   Verify the thirteen real finance functions structurally from managed
  --   chain intent instead of inventing a replacement aggregate fingerprint.
  IF pg_catalog.to_regprocedure(
       'public.create_pos_sale(uuid,uuid,jsonb)'
     ) IS NOT NULL THEN

    -- POS-PRESENT: authoritative historical fourteen-function target ACL freeze.
    SELECT md5(string_agg(line, ';' ORDER BY line)), count(*)
      INTO v_hash, v_cnt
    FROM (
      SELECT format(
               '%s|%s|%s|%s|%s',
               o::regprocedure::text,
               a.grantor,
               a.grantee,
               a.privilege_type,
               a.is_grantable
             ) AS line
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

    IF v_cnt <> 63
       OR v_hash IS DISTINCT FROM 'f2507d9a41a1bc76319b553328d8dd09' THEN
      RAISE EXCEPTION
        'STAGE_B_FUNCTION_ACL_TARGET: % / %',
        v_cnt, v_hash;
    END IF;

    IF has_function_privilege(
         'anon',
         'public.create_pos_sale(uuid,uuid,jsonb)',
         'EXECUTE'
       )
       OR has_function_privilege(
         'authenticated',
         'public.create_pos_sale(uuid,uuid,jsonb)',
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION 'STAGE_B_POS_EXECUTE_REMAINS';
    END IF;

  ELSE

    -- POS-ABSENT: canonical clean-reconstruction branch.
    RAISE NOTICE
      'STAGE_B_POS_ABSENT_TARGET_CHECK: create_pos_sale absent; verifying thirteen-function managed semantic ACL contract';

    FOR v_sig, v_auth_required, v_service_required IN
      SELECT *
      FROM (
        VALUES
          ('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)', false, false),
          ('public._finance_invoice_approve_inline(uuid,uuid,uuid)',                                    false, false),
          ('public.create_invoice_with_items(uuid,uuid,jsonb)',                                       true,  false),
          ('public.update_invoice_with_items(uuid,uuid,uuid,jsonb)',                                  true,  false),
          ('public.delete_draft_invoice(uuid,uuid,uuid)',                                             true,  false),
          ('public.approve_invoice(uuid,uuid,uuid)',                                                  true,  false),
          ('public.cancel_invoice(uuid,uuid,uuid,date,text)',                                         true,  false),
          ('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',                         true,  false),
          ('public.post_payment_session(uuid,uuid,jsonb)',                                            true,  true),
          ('public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)',                             true,  false),
          ('public.post_expense_with_ledger(uuid,uuid,uuid)',                                         true,  false),
          ('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',                   true,  false),
          ('public.create_source_checkout_invoice(uuid,uuid,jsonb)',                                  true,  false)
      ) AS expected(sig, auth_required, service_required)
    LOOP
      v_fn := pg_catalog.to_regprocedure(v_sig);

      IF v_fn IS NULL THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_TARGET_FUNCTION_MISSING: %',
          v_sig
          USING ERRCODE = '42883';
      END IF;

      -- Owner / SECURITY DEFINER / search_path contract.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p
      WHERE p.oid = v_fn
        AND p.proowner = 'postgres'::regrole
        AND p.prosecdef IS TRUE
        AND EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) cfg
          WHERE cfg = 'search_path=""'
        );

      IF v_cnt <> 1 THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_TARGET_FUNCTION_SECURITY_DRIFT: %',
          v_sig;
      END IF;

      -- Fail closed on any effective EXECUTE principal outside the exact
      -- managed allowlist, or on any grant option.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND (
          a.is_grantable IS TRUE
          OR NOT (
            CASE
              WHEN a.grantee = 0::oid THEN 'PUBLIC'
              ELSE pg_catalog.pg_get_userbyid(a.grantee)
            END = 'postgres'
            OR (
              CASE
                WHEN a.grantee = 0::oid THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(a.grantee)
              END = 'authenticated'
              AND v_auth_required
            )
            OR (
              CASE
                WHEN a.grantee = 0::oid THEN 'PUBLIC'
                ELSE pg_catalog.pg_get_userbyid(a.grantee)
              END = 'service_role'
              AND v_service_required
            )
          )
        );

      IF v_cnt <> 0 THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_TARGET_UNEXPECTED_EXECUTE: % / %',
          v_sig, v_cnt;
      END IF;

      -- authenticated must exist exactly where managed intent requires it.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND a.is_grantable IS FALSE
        AND a.grantee = 'authenticated'::regrole;

      IF (v_cnt = 1) IS DISTINCT FROM v_auth_required THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_TARGET_AUTHENTICATED_EXECUTE_DRIFT: % / %',
          v_sig, v_cnt;
      END IF;

      -- service_role is managed-authorized only for post_payment_session.
      SELECT count(*) INTO v_cnt
      FROM pg_proc p,
           LATERAL aclexplode(
             COALESCE(p.proacl, acldefault('f', p.proowner))
           ) AS a
      WHERE p.oid = v_fn
        AND a.privilege_type = 'EXECUTE'
        AND a.is_grantable IS FALSE
        AND a.grantee = 'service_role'::regrole;

      IF (v_cnt = 1) IS DISTINCT FROM v_service_required THEN
        RAISE EXCEPTION
          'STAGE_B_CLEAN_TARGET_SERVICE_ROLE_EXECUTE_DRIFT: % / %',
          v_sig, v_cnt;
      END IF;
    END LOOP;
  END IF;

  -- Helper target proconfig
  SELECT count(*) INTO v_cnt
  FROM unnest(ARRAY[
    to_regprocedure('public.has_permission(uuid,uuid,text)'),
    to_regprocedure('public.is_tenant_member(uuid,uuid)'),
    to_regprocedure('public.is_active_tenant_member(uuid,uuid)')
  ]::oid[]) AS o
  JOIN pg_proc p ON p.oid = o
  WHERE p.proowner = 'postgres'::regrole
    AND p.prosecdef IS TRUE
    AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=public, pg_temp');
  IF v_cnt <> 3 THEN RAISE EXCEPTION 'STAGE_B_HELPER_TARGET_DRIFT: %', v_cnt; END IF;

  -- Approved comments byte-exact
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: append-only ledger. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.'
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS DISTINCT FROM
     'Financial truth: derived customer balances. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.' THEN
    RAISE EXCEPTION 'STAGE_B_COMMENT_MISMATCH';
  END IF;

  -- Table invariance: owner, RLS, FORCE RLS
  SELECT count(*) INTO v_cnt
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND c.relowner = 'postgres'::regrole
    AND c.relrowsecurity IS TRUE
    AND c.relforcerowsecurity IS FALSE;
  IF v_cnt <> 2 THEN RAISE EXCEPTION 'STAGE_B_TABLE_STATE_CHANGED: %', v_cnt; END IF;

  -- Column ACL / inheritance / trusted schema invariance
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_COLUMN_ACL_APPEARED: %', v_cnt; END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'STAGE_B_INHERITANCE_APPEARED: %', v_cnt; END IF;

  IF has_schema_privilege('anon','public','CREATE')
     OR has_schema_privilege('authenticated','public','CREATE') THEN
    RAISE EXCEPTION 'STAGE_B_TRUSTED_SCHEMA_CHANGED';
  END IF;

  -- POS authority is required only on the legitimate POS-PRESENT branch.
  IF pg_catalog.to_regprocedure(
       'public.create_pos_sale(uuid,uuid,jsonb)'
     ) IS NOT NULL THEN
    IF NOT has_function_privilege(
         'service_role',
         pg_catalog.to_regprocedure(
           'public.create_pos_sale(uuid,uuid,jsonb)'
         ),
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION 'STAGE_B_SERVICE_ROLE_POS_AUTHORITY_LOST';
    END IF;
  ELSE
    RAISE NOTICE
      'STAGE_B_POS_ABSENT_SERVICE_ROLE_CHECK_SKIPPED: create_pos_sale absent on canonical clean reconstruction';
  END IF;

  -- Financial-row invariance
  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM stage_b_financial_baseline WHERE tbl='ledger_entries';
  SELECT count(*) INTO v_cnt FROM public.ledger_entries;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.ledger_entries AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash THEN
    RAISE EXCEPTION 'STAGE_B_LEDGER_ROW_INVARIANCE_FAILED';
  END IF;

  SELECT row_count, row_hash INTO v_b_cnt, v_b_hash
    FROM stage_b_financial_baseline WHERE tbl='customer_balances';
  SELECT count(*) INTO v_cnt FROM public.customer_balances;
  SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '<EMPTY>'))
    INTO v_hash FROM public.customer_balances AS t;
  IF v_cnt <> v_b_cnt OR v_hash IS DISTINCT FROM v_b_hash THEN
    RAISE EXCEPTION 'STAGE_B_BALANCE_ROW_INVARIANCE_FAILED';
  END IF;
END
$stage_b_post$;
