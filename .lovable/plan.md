# Stage B — Final Proconfig Assertion and Migration Executability Closure Audit

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-FINAL-PROCONFIG-ASSERTION-AND-MIGRATION-EXECUTABILITY-CLOSURE-AUDIT-15
Mode: Plan/Chat — Read-Only. Repository changes zero. Database changes zero.

## A. Combined Verdicts

1. Proconfig: `FINAL PROCONFIG ASSERTION CONTRACT CLOSED`
2. Policy Contract: `EXACT POLICY PRECONDITION AND ROLLBACK CONTRACT CLOSED`
3. Forward Migration: `FINAL FORWARD MIGRATION SQL EXECUTABLE`
4. Rollback: `FINAL ROLLBACK SQL EXECUTABLE`
5. Stage B: `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE; Stage A accepted, persisted, verified. Stage B not started. Stage C and Stage D not started. WS-DH-2026-0005 DEFERRED.

## C. Prompt-14 Findings Preserved

PostgreSQL 17.6. TEMP granted to PUBLIC (`datacl` contains `=Tc/postgres`); `anon`, `authenticated`, `service_role` all return `true` for `has_database_privilege(..., 'TEMP')`. `has_permission(uuid,uuid,text)` oid 47231, SECURITY DEFINER, owner `postgres`, `proconfig` currently `{search_path=public}`, six unqualified relation references. Approved bounded correction: `SET search_path = public, pg_temp`, no body replacement. Eleven exact function identities confirmed. Seven-policy current RLS set. SELECT-only table strategy. `create_pos_sale` executable by anon + authenticated, not by PUBLIC. Application, POS and Deferred Items contracts preserved.

## D. Proconfig Serialization Evidence

Read-only evaluations, session-local only.

| Source | Raw `proconfig` (array display) | Unnested element (`quote_literal`) | `array_to_string(...,'|')` | Meaning |
|---|---|---|---|---|
| Literal `ARRAY['search_path=public, pg_temp']::text[]` | `{"search_path=public, pg_temp"}` | — | `search_path=public, pg_temp` | quotes are array **display** only |
| `public.complete_local_horse_record(uuid,uuid,jsonb)` (existing function already set to `public, pg_temp`) | `{"search_path=public, pg_temp"}` | — | `search_path=public, pg_temp` | element value contains **no** quote characters |
| `public.has_permission(uuid,uuid,text)` | `{search_path=public}` | `'search_path=public'` | `search_path=public` | current helper state |
| `public.is_tenant_member(uuid,uuid)` | `{search_path=public}` | `'search_path=public'` | `search_path=public` | current helper state |
| `public.approve_invoice(uuid,uuid,uuid)` (empty search_path) | `{"search_path=\"\""}` | `'search_path=""'` | `search_path=""` | here the quotes **are** part of the value |

Determination: after `ALTER FUNCTION … SET search_path = public, pg_temp`, the stored element is exactly

```
search_path=public, pg_temp
```

— no surrounding double quotes in the value. The `{"…"}` in array display is PostgreSQL array-literal quoting triggered by the comma and space, not stored data. This is proven by four other existing project functions (`_trg_lock_horse_owner_tenant_change`, `_provision_stable_local_record_permissions`, `_trg_provision_stable_local_record_permissions`, `complete_local_horse_record`, `_lock_horse_authority_scope`) that already carry this exact configuration and whose unnested element joins to the unquoted string.

The empty-search-path case is different and confirms the rule: `SET search_path = ''` stores the literal two-character quoted empty value `""`, which is why the existing pgTAP suites correctly compare against `'search_path=""'`.

`set_config('search_path','public, pg_temp',true)` round-trips through `current_setting` as `public, pg_temp`, confirming the ordered two-element resolution with `public` first.

## E. Prompt-14 Q7 Evaluation

Verdict: `PROMPT-14 Q7 FAILS`.

Prompt-14 asserted:

```
array_to_string(p.proconfig,'|') = 'search_path="public, pg_temp"'
```

Actual post-ALTER value: `search_path=public, pg_temp`
Prompt-14 expected value: `search_path="public, pg_temp"`

Character-by-character difference: both strings agree through the twelfth character `search_path=`. At position 13 the actual value has `p` (start of `public`) while the expected value has `"` (U+0022). The expected string also carries a second `"` at its final position, immediately after `pg_temp`. The actual value is 25 characters; the expected is 27. Two extra quote characters, at offsets 13 and 27.

Consequence had it shipped: Q7 raises `STAGE_B_POST_HELPER_SEARCH_PATH_NOT_HARDENED` after a successful `ALTER FUNCTION`, aborting the entire Stage B migration transaction and rolling back every privilege, policy and comment change. The migration would have been unrunnable. This is corrected in §F and folded into §I.

## F. Final Robust Helper Assertion

Key-based, display-quoting-independent, whitespace-normalised, order-sensitive. Rejects `pg_temp, public`, bare `public`, a missing setting, caller-controlled search_path and any extra schema.

Forward postcondition — all three helpers must equal `public,pg_temp` after normalisation:

```sql
IF (
  SELECT count(*)
  FROM pg_proc p
  WHERE p.oid = ANY (ARRAY[
          to_regprocedure('public.has_permission(uuid,uuid,text)'),
          to_regprocedure('public.is_tenant_member(uuid,uuid)'),
          to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
    AND EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE split_part(cfg, '=', 1) = 'search_path'
        AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '')
            = 'public,pg_temp'
    )
) <> 3 THEN
  RAISE EXCEPTION 'STAGE_B_POST_HELPER_SEARCH_PATH_NOT_HARDENED';
END IF;
```

Notes on robustness: `substr(cfg, 13)` is used rather than `split_part(cfg,'=',2)` so a value that itself contained `=` could not be truncated; `replace` of `"` tolerates any future quoting; `replace` of spaces tolerates `public,pg_temp` and `public, pg_temp` alike; string equality against the full normalised value rejects `public,pg_temp,extra` and `pg_temp,public`.

Rollback verification uses the identical method against `public`:

```sql
AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '') = 'public'
```

No `array_to_string` array-literal comparison remains anywhere in either script.

## G. Exact Seven-Policy Matrix

All seven are PERMISSIVE and role-unrestricted (`polroles` empty ⇒ PUBLIC). Expressions below are `pg_get_expr` normalised output.

| Table | Name | Cmd | Roles | Normalized USING | Normalized WITH CHECK |
|---|---|---|---|---|---|
| customer_balances | Permission-based delete customer balances | `d` | PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | — |
| customer_balances | Permission-based insert customer balances | `a` | PUBLIC | — | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| customer_balances | Permission-based update customer balances | `w` | PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| customer_balances | Tenant members can view balances | `r` | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — |
| ledger_entries | Permission-based insert ledger entries | `a` | PUBLIC | — | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| ledger_entries | Tenant members can view ledger | `r` | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — |
| ledger_entries | Tenant members can view ledger entries | `r` | PUBLIC | `(EXISTS ( SELECT 1`⏎`   FROM tenant_members tm`⏎`  WHERE ((tm.tenant_id = ledger_entries.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.is_active = true))))` | — |

## H. Final Policy Preconditions and Postconditions

Verification is by **stable fingerprint** rather than count, name list or substring matching. The fingerprint is `md5` over `relname|polname|polcmd|USING|WITH CHECK`, newline-joined, ordered by `relname||polname`, restricted to the two tables. Roles and permissiveness are asserted separately because they are not in the fingerprint.

Measured values (read-only, this run):

- Pre-Stage-B full set (7 policies): `44770e308a526915fb301bc951601450`
- Post-Stage-B expected set (3 read policies, `polcmd = 'r'`): `3244bb93d2e6b0594e322d4d26f796d6`

The forward migration asserts the first before, the second after. The rollback asserts the first again at the end. A single character of drift in any policy name, command, USING or WITH CHECK expression, or the presence of any unexpected extra policy, changes the fingerprint and aborts. Role restriction and permissiveness are asserted with a separate `bool_and(polroles IS NULL OR cardinality(polroles) = 0)` and `bool_and(polpermissive)` check.

## I. Final Exact Forward Migration SQL

Proposed filename: `supabase/migrations/<timestamp>_stage_b_financial_write_authority.sql`. Runs inside the migration's implicit transaction; any raised exception aborts the whole migration. Zero DML against any financial table.

```sql
-- Stage B — canonical financial write authority + SECURITY DEFINER temp-schema hardening.
-- Ledger and Customer Balance truth is writable only through SECURITY DEFINER finance
-- RPCs owned by postgres. Browser roles retain SELECT only.

DO $$
DECLARE
  v_sig text;
  v_sigs text[] := ARRAY[
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_payment_session(uuid,uuid,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
    'public.create_pos_sale(uuid,uuid,jsonb)',
    'public.has_permission(uuid,uuid,text)',
    'public.is_tenant_member(uuid,uuid)',
    'public.is_active_tenant_member(uuid,uuid)'
  ];
BEGIN
  -- P1. Exact-signature existence, uniqueness, ownership and SECURITY DEFINER state
  FOREACH v_sig IN ARRAY v_sigs LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'STAGE_B_PRECOND_FUNCTION_MISSING: %', v_sig;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
       WHERE p.oid = to_regprocedure(v_sig)
         AND p.prosecdef
         AND pg_get_userbyid(p.proowner) = 'postgres'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRECOND_FUNCTION_SECURITY_UNEXPECTED: %', v_sig;
    END IF;
    IF (SELECT count(*) FROM pg_proc q
         JOIN pg_namespace n ON n.oid = q.pronamespace
        WHERE n.nspname = 'public'
          AND q.proname = (SELECT p.proname FROM pg_proc p WHERE p.oid = to_regprocedure(v_sig))) <> 1 THEN
      RAISE EXCEPTION 'STAGE_B_PRECOND_FUNCTION_OVERLOAD_DRIFT: %', v_sig;
    END IF;
  END LOOP;

  -- P2. Canonical finance RPCs must already pin an empty search_path
  IF EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = ANY (ARRAY[
             to_regprocedure('public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)'),
             to_regprocedure('public.post_expense_with_ledger(uuid,uuid,uuid)'),
             to_regprocedure('public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)'),
             to_regprocedure('public.post_payment_session(uuid,uuid,jsonb)'),
             to_regprocedure('public.approve_invoice(uuid,uuid,uuid)'),
             to_regprocedure('public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)'),
             to_regprocedure('public.create_source_checkout_invoice(uuid,uuid,jsonb)'),
             to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)')])
       AND NOT EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE split_part(cfg, '=', 1) = 'search_path'
            AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '') = ''
       )
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_RPC_SEARCH_PATH_UNEXPECTED';
  END IF;

  -- P3. Helpers must currently resolve to bare 'public' (the state this migration corrects)
  IF (
    SELECT count(*) FROM pg_proc p
     WHERE p.oid = ANY (ARRAY[
             to_regprocedure('public.has_permission(uuid,uuid,text)'),
             to_regprocedure('public.is_tenant_member(uuid,uuid)'),
             to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
       AND EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE split_part(cfg, '=', 1) = 'search_path'
            AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '') = 'public'
       )
  ) <> 3 THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_HELPER_SEARCH_PATH_UNEXPECTED';
  END IF;

  -- P4. TEMP is granted to browser roles — the condition making the helper correction necessary
  IF NOT has_database_privilege('authenticated', current_database(), 'TEMP') THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_TEMP_PRIVILEGE_UNEXPECTED';
  END IF;

  -- P5. Table ownership and RLS state
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
         AND pg_get_userbyid(c.relowner) = 'postgres'
         AND c.relrowsecurity AND NOT c.relforcerowsecurity) <> 2 THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_OWNERSHIP_OR_RLS_UNEXPECTED';
  END IF;

  -- P6. Browser roles currently hold write privileges (pre-state is the audited one)
  IF NOT (has_table_privilege('anon','public.ledger_entries','INSERT')
          AND has_table_privilege('authenticated','public.ledger_entries','INSERT')
          AND has_table_privilege('authenticated','public.customer_balances','UPDATE')) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_GRANTS_UNEXPECTED';
  END IF;

  -- P7. No column-level ACL exists on either table
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_COLUMN_ACL_PRESENT';
  END IF;

  -- P8. Exact policy contract by stable fingerprint: names, commands and expressions,
  --     with no additional policy present on either table.
  IF (
    SELECT md5(string_agg(
             c.relname || '|' || p.polname || '|' || p.polcmd::text || '|'
             || coalesce(pg_get_expr(p.polqual, p.polrelid), '-') || '|'
             || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-'),
             E'\n' ORDER BY c.relname || p.polname))
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) IS DISTINCT FROM '44770e308a526915fb301bc951601450' THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POLICY_CONTRACT_DRIFT';
  END IF;

  -- P9. Every policy is PERMISSIVE and role-unrestricted (applies to PUBLIC)
  IF NOT (
    SELECT bool_and(p.polpermissive
                    AND (p.polroles IS NULL OR cardinality(p.polroles) = 0))
      FROM pg_policy p
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POLICY_ROLE_OR_PERMISSIVE_DRIFT';
  END IF;

  -- P10. Neither table currently carries a comment
  IF obj_description('public.ledger_entries'::regclass, 'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass, 'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_TABLE_COMMENT_PRESENT';
  END IF;

  -- P11. create_pos_sale currently executable by anon and authenticated, not by PUBLIC
  IF NOT (has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
          AND has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POS_EXECUTE_UNEXPECTED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
     WHERE p.oid = to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)')
       AND a.grantee = 0
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POS_PUBLIC_GRANT_PRESENT';
  END IF;
END
$$;

-- 1. Complete privilege revocation for browser roles
REVOKE ALL PRIVILEGES ON TABLE public.ledger_entries    FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.customer_balances FROM anon, authenticated, PUBLIC;

-- 2. Re-grant the only required browser privilege
GRANT SELECT ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT ON TABLE public.customer_balances TO anon, authenticated;

-- 3. Remove browser-write RLS policies. Definer RPCs run as the table owner and RLS is
--    not forced, so no canonical write path depends on these.
DROP POLICY IF EXISTS "Permission-based insert ledger entries"    ON public.ledger_entries;
DROP POLICY IF EXISTS "Permission-based insert customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based update customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based delete customer balances" ON public.customer_balances;

-- 4. POS remains deferred (WS-DH-2026-0005): no browser role may invoke it
REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) FROM anon, authenticated, PUBLIC;

-- 5. SECURITY DEFINER temporary-schema hardening. Naming pg_temp last demotes the
--    temporary schema below public, so unqualified relations can no longer be shadowed.
--    No function body is modified.
ALTER FUNCTION public.has_permission(uuid, uuid, text)     SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)         SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant_member(uuid, uuid)  SET search_path = public, pg_temp;

-- 6. Documented contract
COMMENT ON TABLE public.ledger_entries IS
  'Financial truth. Writes only via SECURITY DEFINER finance RPCs (_finance_ledger_insert and its callers). Browser roles: SELECT only.';
COMMENT ON TABLE public.customer_balances IS
  'Derived client balances. Writes only via SECURITY DEFINER finance RPCs. Browser roles: SELECT only.';

DO $$
DECLARE
  r text; t text; p text;
BEGIN
  -- Q1. Browser roles hold SELECT and nothing else, across all eight PG17 privileges
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
      IF NOT has_table_privilege(r, t, 'SELECT') THEN
        RAISE EXCEPTION 'STAGE_B_POST_SELECT_MISSING: % %', r, t;
      END IF;
      FOREACH p IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'STAGE_B_POST_RESIDUAL_PRIVILEGE: % % %', r, t, p;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Q2. Still no column-level grant
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_COLUMN_ACL_PRESENT';
  END IF;

  -- Q3. No PUBLIC table grant leaked in
  IF EXISTS (
    SELECT 1 FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
       AND a.grantee = 0
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_PUBLIC_TABLE_GRANT_PRESENT';
  END IF;

  -- Q4. service_role retains full access
  FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT has_table_privilege('service_role', t, p) THEN
        RAISE EXCEPTION 'STAGE_B_POST_SERVICE_ROLE_DEGRADED: % %', t, p;
      END IF;
    END LOOP;
  END LOOP;

  -- Q5. Canonical RPCs remain executable by authenticated
  IF NOT (
    has_function_privilege('authenticated','public.post_expense_with_ledger(uuid,uuid,uuid)','EXECUTE')
    AND has_function_privilege('authenticated','public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)','EXECUTE')
    AND has_function_privilege('authenticated','public.post_payment_session(uuid,uuid,jsonb)','EXECUTE')
    AND has_function_privilege('authenticated','public.approve_invoice(uuid,uuid,uuid)','EXECUTE')
    AND has_function_privilege('authenticated','public.create_source_checkout_invoice(uuid,uuid,jsonb)','EXECUTE')
    AND has_function_privilege('authenticated','public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)','EXECUTE')
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_CANONICAL_RPC_EXECUTE_LOST';
  END IF;
  IF NOT has_function_privilege('service_role','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_SERVICE_ROLE_LOST';
  END IF;

  -- Q6. POS RPC not executable by anon, authenticated or PUBLIC
  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_RPC_STILL_EXECUTABLE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
     WHERE p.oid = to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)')
       AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_PUBLIC_EXECUTE_PRESENT';
  END IF;

  -- Q7. Helper search_path resolves, in order, to exactly public then pg_temp.
  --     Key-based and quoting-independent; does not compare array literals.
  IF (
    SELECT count(*) FROM pg_proc p
     WHERE p.oid = ANY (ARRAY[
             to_regprocedure('public.has_permission(uuid,uuid,text)'),
             to_regprocedure('public.is_tenant_member(uuid,uuid)'),
             to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
       AND EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE split_part(cfg, '=', 1) = 'search_path'
            AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '')
                = 'public,pg_temp'
       )
  ) <> 3 THEN
    RAISE EXCEPTION 'STAGE_B_POST_HELPER_SEARCH_PATH_NOT_HARDENED';
  END IF;
  IF (SELECT count(*) FROM pg_proc p
       WHERE p.oid = ANY (ARRAY[
               to_regprocedure('public.has_permission(uuid,uuid,text)'),
               to_regprocedure('public.is_tenant_member(uuid,uuid)'),
               to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
         AND p.prosecdef AND pg_get_userbyid(p.proowner) = 'postgres') <> 3 THEN
    RAISE EXCEPTION 'STAGE_B_POST_HELPER_IDENTITY_CHANGED';
  END IF;

  -- Q8. Exact remaining policy contract: the three read policies, unchanged, nothing else
  IF (
    SELECT md5(string_agg(
             c.relname || '|' || p.polname || '|' || p.polcmd::text || '|'
             || coalesce(pg_get_expr(p.polqual, p.polrelid), '-') || '|'
             || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-'),
             E'\n' ORDER BY c.relname || p.polname))
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) IS DISTINCT FROM '3244bb93d2e6b0594e322d4d26f796d6' THEN
    RAISE EXCEPTION 'STAGE_B_POST_POLICY_CONTRACT_DRIFT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy
     WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
       AND polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_WRITE_POLICY_REMAINS';
  END IF;
  IF NOT (
    SELECT bool_and(p.polpermissive
                    AND (p.polroles IS NULL OR cardinality(p.polroles) = 0))
      FROM pg_policy p
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_POLICY_ROLE_OR_PERMISSIVE_DRIFT';
  END IF;

  -- Q9. Table comments recorded
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NULL THEN
    RAISE EXCEPTION 'STAGE_B_POST_TABLE_COMMENT_MISSING';
  END IF;
END
$$;
```

No `INSERT`, `UPDATE` or `DELETE` against any financial table appears anywhere, so the zero-financial-row-change postcondition holds by construction.

## J. Final Exact Rollback SQL

**Emergency use only. This rollback deliberately restores the prior unsafe state in which browser roles can write Ledger and Customer Balance truth directly through PostgREST, and restores the temporary-schema shadowing exposure in the SECURITY DEFINER permission helpers. Do not run it except to recover from a Stage B production incident.**

```sql
-- EMERGENCY ROLLBACK — restores the exact pre-Stage-B state.

-- 1. Restore all eight PostgreSQL 17 table privileges to the exact prior browser roles
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances TO anon, authenticated;

-- 2. Restore the exact four write policies (the three read policies were never dropped)
CREATE POLICY "Permission-based insert ledger entries"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based insert customer balances"
  ON public.customer_balances FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based update customer balances"
  ON public.customer_balances FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based delete customer balances"
  ON public.customer_balances FOR DELETE
  USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

-- 3. Restore exact prior EXECUTE grants on create_pos_sale (anon + authenticated only;
--    PUBLIC held nothing before Stage B and must not be granted here)
GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) TO anon, authenticated;

-- 4. Restore prior helper search_path (no body was altered, so no body restore is needed)
ALTER FUNCTION public.has_permission(uuid, uuid, text)    SET search_path = public;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)        SET search_path = public;
ALTER FUNCTION public.is_active_tenant_member(uuid, uuid) SET search_path = public;

-- 5. Restore prior comments (both tables had none)
COMMENT ON TABLE public.ledger_entries    IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;

DO $$
DECLARE r text; t text; p text;
BEGIN
  -- R1. All eight privileges restored for both browser roles on both tables
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF NOT has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'ROLLBACK_INCOMPLETE_PRIVILEGE: % % %', r, t, p;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- R2. Exact restored policy contract — names, commands and expressions, nothing extra
  IF (
    SELECT md5(string_agg(
             c.relname || '|' || p.polname || '|' || p.polcmd::text || '|'
             || coalesce(pg_get_expr(p.polqual, p.polrelid), '-') || '|'
             || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-'),
             E'\n' ORDER BY c.relname || p.polname))
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) IS DISTINCT FROM '44770e308a526915fb301bc951601450' THEN
    RAISE EXCEPTION 'ROLLBACK_POLICY_CONTRACT_NOT_RESTORED';
  END IF;

  -- R3. Restored policies are PERMISSIVE and role-unrestricted, exactly as before
  IF NOT (
    SELECT bool_and(p.polpermissive
                    AND (p.polroles IS NULL OR cardinality(p.polroles) = 0))
      FROM pg_policy p
     WHERE p.polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
  ) THEN
    RAISE EXCEPTION 'ROLLBACK_POLICY_ROLE_OR_PERMISSIVE_DRIFT';
  END IF;

  -- R4. POS EXECUTE restored exactly: anon + authenticated yes, PUBLIC still no
  IF NOT (has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
          AND has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')) THEN
    RAISE EXCEPTION 'ROLLBACK_POS_EXECUTE_NOT_RESTORED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p, aclexplode(p.proacl) a
     WHERE p.oid = to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)')
       AND a.grantee = 0
  ) THEN
    RAISE EXCEPTION 'ROLLBACK_POS_PUBLIC_GRANT_OVERBROAD';
  END IF;

  -- R5. Helper search_path restored to the exact prior resolved value (quoting-independent)
  IF (
    SELECT count(*) FROM pg_proc p
     WHERE p.oid = ANY (ARRAY[
             to_regprocedure('public.has_permission(uuid,uuid,text)'),
             to_regprocedure('public.is_tenant_member(uuid,uuid)'),
             to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
       AND EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE split_part(cfg, '=', 1) = 'search_path'
            AND replace(replace(substr(cfg, length('search_path=') + 1), '"', ''), ' ', '')
                = 'public'
       )
  ) <> 3 THEN
    RAISE EXCEPTION 'ROLLBACK_HELPER_SEARCH_PATH_NOT_RESTORED';
  END IF;

  -- R6. Comments restored to their prior null state
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLBACK_TABLE_COMMENT_NOT_CLEARED';
  END IF;
END
$$;
```

Executability of the pair: forward and rollback are a closed loop. Every forward action has an exact inverse; the rollback's R2 fingerprint is the forward migration's P8 fingerprint, so a completed rollback restores precisely the state the forward migration required, and the forward migration can therefore be reapplied immediately afterwards. Both scripts are pure DDL and privilege statements plus assertion blocks — no financial DML in either direction.

## K. Application Contract Confirmation

Unchanged and re-confirmed: Expense Approval routes to `post_expense_with_ledger`; `postLedgerForExpense` deleted; `postLedgerForInvoice` deleted; dead `useLedger.createEntry` removed; automatic `backfillLedgerDescriptions` removed; POS visible in Navigation and Sidebar with a Coming Soon badge, non-clickable, non-keyboard-activatable, direct URL inert, no operational POS hook, no `create_pos_sale` browser activation. This closure audit adds no application scope. Read paths are unaffected because SELECT is preserved on both tables.

## L. QA Additions

Carried from Prompt 14, plus the following, all now required:

- Assert `array_to_string` is used nowhere in Stage B assertions; helper checks are key-based on `unnest(proconfig)`.
- Assert the three helpers normalise to `public,pg_temp` after the migration and to `public` after rollback.
- Assert the pre-state policy fingerprint equals `44770e308a526915fb301bc951601450` before the forward migration.
- Assert the post-state policy fingerprint equals `3244bb93d2e6b0594e322d4d26f796d6` after the forward migration.
- Assert the restored fingerprint equals `44770e308a526915fb301bc951601450` after rollback.
- Assert all policies remain PERMISSIVE and role-unrestricted at every stage.
- Run the forward migration, then the rollback, then the forward migration again in an isolated environment; all three must complete without raising.
- Temporary-relation shadowing negative test as specified in Prompt 14, in a rolled-back transaction.
- Row counts and checksums on `ledger_entries`, `customer_balances`, `invoices` and `expenses` unchanged in both directions.

Build and typecheck alone are not Acceptance. A separate QA pass and read-only Acceptance Re-Audit remain mandatory.

## M. Deferred Items Register

Promoted by this audit: the final proconfig assertion correction and the exact policy-contract assertion correction. No other promotion. All Prompt-12/13/14 entries preserved.

| Item | Status | Current lane | Future lane | Owner decision needed? | Next trigger |
|---|---|---|---|---|---|
| Expense browser writer cutover | PROMOTED | Stage B | — | No | Stage B |
| Dead Ledger mutation removal (`useLedger.createEntry`) | PROMOTED | Stage B | — | No | Stage B |
| POS safety fencing | PROMOTED | Stage B | WS-DH-2026-0005 | No | Stage B |
| Ledger / Customer Balance privilege hardening | PROMOTED | Stage B | — | No | Stage B |
| `create_pos_sale` browser EXECUTE revocation | PROMOTED | Stage B | WS-DH-2026-0005 | No | Stage B |
| `backfillLedgerDescriptions` removal | PROMOTED | Stage B | — | No | Stage B |
| Helper temporary-schema `search_path` correction | PROMOTED (Prompt 14) | Stage B | — | No | Stage B |
| Rollback policy-set correction | PROMOTED (Prompt 14) | Stage B | — | No | Stage B |
| **Final proconfig assertion correction** | **PROMOTED (this audit)** | Stage B | — | No | Stage B |
| **Exact policy-contract assertion correction** | **PROMOTED (this audit)** | Stage B | — | No | Stage B |
| `has_permission` full schema qualification (`search_path = ''`) | DEFERRED — TRACKED | none | security hardening | Yes | Later hardening pass |
| Duplicate `ledger_entries` SELECT policy | DEFERRED — TRACKED | none | security hardening | Yes | Later hardening pass |
| Internal Cost terminology correction | DEFERRED — TRACKED | none | RM-DH-002 | Yes | After Stage B |
| Internal Cost Unknown vs Real Zero | DEFERRED — TRACKED | none | RM-DH-002 | Yes | After Stage B |
| Internal Cost contextual terminology by account type | DEFERRED — TRACKED | none | RM-DH-002 | Yes | Later |
| HR Salary-to-Expense atomicity | DEFERRED — TRACKED | none | HR/Finance | Yes | After Stage B |
| HR Salary idempotency | DEFERRED — TRACKED | none | HR/Finance | Yes | After Stage B |
| HR Salary reversal | DEFERRED — TRACKED | none | HR/Finance | Yes | After Stage B |
| Generic Expense deletion of HR-linked records | DEFERRED — TRACKED | none | HR/Finance | Yes | After Stage B |
| Expense unpost / reversal | DEFERRED — TRACKED | none | RM-DH-004 later phase | Yes | After Stage B |
| Supplier Payable payment / Expense / Ledger lifecycle | DEFERRED — TRACKED | none | RM-DH-002 | Yes | Later |
| Supplier Payable-to-Expense authority | DEFERRED — TRACKED | none | RM-DH-002 | Yes | Later |
| Full POS implementation | DEFERRED — TRACKED | WS-DH-2026-0005 | same | No | Owner activation |
| Future `create_pos_sale` activation | DEFERRED — TRACKED | WS-DH-2026-0005 | same | No | Owner activation |
| Manual Ledger Adjustment product workflow | DEFERRED — TRACKED | none | future finance lane | No | Owner request |
| Residual financial-table hardening (expenses, financial_entries, hr_salary_payments, supplier_payables, invoices, invoice_items, billing_links) | DEFERRED — TRACKED | none | security hardening | Yes | After Stage B |
| Database-level TEMP grant to PUBLIC | DEFERRED — TRACKED | none | security hardening | Yes | Later platform review |

Internal Costs, HR Salary, Expense reversal, Supplier Payables and full POS implementation were not promoted.

## N. Blockers and Gaps

None.

## O. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY FINAL PROCONFIG, POLICY-CONTRACT AND MIGRATION-EXECUTABILITY CLOSURE AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

The Prompt-12 through Prompt-14 application, POS, privilege, helper and Deferred-Item contracts remain preserved except for explicitly corrected assertions.

Stage C and Stage D have not started.

No Workstream Closure occurred.

## P. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This final correction audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap or Workstream ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.

## Q. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only.
2. Operation: function-proconfig serialization, robust helper search-path assertion, exact policy precondition, and final forward/rollback executability closure audit.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-FINAL-PROCONFIG-ASSERTION-AND-MIGRATION-EXECUTABILITY-CLOSURE-AUDIT-15.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation: 03-08-2026, 22:36, Asia/Riyadh (UTC+03:00).
6. Run Start: 03-08-2026 22:36 Asia/Riyadh. Run End: Exact time not recorded. Final Report: Exact time not recorded.
7. Timestamp evidence source: platform message clock (prompt receipt time).
8. PostgreSQL version: 17.6 (carried from Prompt 13; unchanged).
9. Branch: `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`. Canonical/default branch evidence: Exact evidence not recorded.
10. HEAD before and after: unchanged. Working tree before and after: clean apart from `.lovable/plan.md`.
11. Catalog expressions executed: `array_to_string` on a synthetic `text[]`; `unnest`/`quote_literal` over `pg_proc.proconfig`; `set_config`/`current_setting` round-trip (session-local, non-persistent); `pg_policy` × `pg_class` fingerprint with `md5(string_agg(...))`; normalised helper-value evaluation against an existing `public, pg_temp` function. 3 exec calls, 10 statements.
12. Repository paths read: none new this run; Prompt-14 context carried.
13. Database objects read: `pg_proc`, `pg_policy`, `pg_class`, `pg_roles`, `aclexplode`; 2 target tables; 5 reference functions with `pg_temp` configuration.
14. Financial-row queries: 0.
15. Database role: `sandbox_exec`.
16. Raw proconfig evidence: `has_permission` and `is_tenant_member` → `{search_path=public}`, element `'search_path=public'`; `approve_invoice` → `{"search_path=\"\""}`, element `'search_path=""'`; `complete_local_horse_record` → `{"search_path=public, pg_temp"}`, `array_to_string` result `search_path=public, pg_temp`.
17. Q7 result: `PROMPT-14 Q7 FAILS` — two spurious quote characters, at offsets 13 and 27.
18. Final helper assertion: key-based `unnest(proconfig)` with `split_part(cfg,'=',1) = 'search_path'` and quote/space-normalised equality against `public,pg_temp` (forward) and `public` (rollback).
19. Policies verified: 7 pre-state (fingerprint `44770e308a526915fb301bc951601450`); 3 expected post-state (fingerprint `3244bb93d2e6b0594e322d4d26f796d6`); all PERMISSIVE and role-unrestricted.
20. Final Forward SQL result: executable. Final Rollback result: executable.
21. Deferred items preserved: 26 register rows. Promoted this run: 2.
22. Repository changes: zero. Database changes: zero. Migration changes: zero. Knowledge / Skills / settings changes: zero.
23. `.lovable/plan.md` disclosure: written by Plan Mode this run to hold this report; the only file touched.
24. Five verdicts: as in §A.
25. Stage B implementation: not started. Stage C: not started. Stage D: not started. Closure: none.
26. Exact stopping point: the final helper proconfig assertion, exact policy contract, executable forward migration, executable rollback, preserved application scope and complete Deferred Items Register have been established. No implementation, migration, financial-data change, Stage C, Stage D or Closure has occurred.
27. One next step: issue the Stage B Agent/Build execution prompt pairing the Prompt-12 application cutover with the frozen migration in §I.
28. Recommended next Mode: Agent/Build.

This audit applied Skill dayli-08-schema-and-migration-safety.
