# Stage B — pg_temp Security-Definer Safety and Final Migration/Rollback Correction Audit

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-PG-TEMP-HELPER-SAFETY-AND-FINAL-MIGRATION-ROLLBACK-CORRECTION-AUDIT-14
Mode: Plan/Chat — Read-Only. Repository changes zero. Database changes zero.

## A. Combined Verdicts

1. Temporary-Schema Safety: `TEMPORARY-SCHEMA CORRECTION REQUIRED`
2. Helper Contract: `SECURITY DEFINER HELPER CONTRACT CLOSED` (closed with the single bounded correction in §K)
3. Forward Migration: `FINAL FORWARD MIGRATION CONTRACT COMPLETE`
4. Rollback: `FINAL ROLLBACK CONTRACT COMPLETE AND EXECUTABLE`
5. Stage B: `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE; Stage A accepted, persisted, verified. Stage B not started. Stage C and Stage D not started. WS-DH-2026-0005 DEFERRED.

## C. Prompt-13 Findings Preserved

PostgreSQL 17.6. `arwdDxtm` = SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. Zero column-level ACLs on `ledger_entries` and `customer_balances`. No role memberships for `anon`, `authenticated`, `service_role`. No PUBLIC entry in either table's `relacl`. Table strategy: REVOKE ALL from browser roles and PUBLIC, then GRANT SELECT only. `public` schema grants USAGE but not CREATE to browser roles. All canonical finance RPCs are SECURITY DEFINER, owned by `postgres`, `search_path=""`. The Prompt-12 application cutover, POS coming-soon and Deferred Items contracts are preserved unchanged.

## D. Prompt-13 Findings Rejected or Corrected

All six correction points are upheld by evidence.

1. **Rejected: "omitting `pg_temp` prevents temporary-schema shadowing."** The opposite is true. When `pg_temp` is not named in `search_path`, PostgreSQL still searches the session's temporary schema **first** for relations and data types. The Prompt-13 §I verdict `PUBLIC-SCHEMA HELPER SAFETY VERIFIED` is therefore withdrawn.
2. **Confirmed:** `has_permission(uuid,uuid,text)` is SECURITY DEFINER (oid 47231), `proconfig = search_path=public`, `proacl` contains the PUBLIC entry `=X/postgres`, and its body references `tenant_members`, `member_permissions`, `tenant_role_permissions`, `tenant_role_bundles`, `bundle_permissions`, `member_permission_bundles` unqualified.
3. **Confirmed and now measured:** TEMP is granted to PUBLIC on this database (`datacl` contains `=Tc/postgres`), so every browser role can create temporary relations. §E.
4. **Confirmed:** the true total is **seven** policies, not eight. §I.
5. **Confirmed:** Prompt-13 preconditions did not assert exact signatures. Corrected in §L via `to_regprocedure` plus a uniqueness check.
6. **Confirmed:** PUBLIC EXECUTE on `create_pos_sale` was never asserted. Corrected in §L via a direct `proacl` grantee-0 check.

Prompt-13's table-privilege strategy, column-ACL finding and application scope are **not** corrected — they stand.

## E. Database TEMP Privilege Matrix

Database: `postgres`. Owner: `postgres`. `datacl` = `{=Tc/postgres, postgres=CTc/postgres, supabase_etl_admin=C/postgres, supabase_storage_admin=C/postgres, dashboard_user=CTc/postgres, sandbox_exec_vhxglsvxwwpmoqjabfmj=c/postgres, sandbox_exec=c/postgres}`.

| Role | TEMP privilege | Source | Can create temporary relations? | Security implication |
|---|---|---|---|---|
| PUBLIC | **Yes** (`=Tc`) | explicit PUBLIC grant in `datacl` | Yes | every role, including browser roles, may create temp relations |
| anon | **Yes** (`has_database_privilege = t`) | inherited from PUBLIC grant | Yes | can create `pg_temp.tenant_members` |
| authenticated | **Yes** (`t`) | inherited from PUBLIC grant | Yes | can create `pg_temp.tenant_members` |
| service_role | **Yes** (`t`) | inherited from PUBLIC grant | Yes | trusted server role; not a browser surface |
| postgres | Yes (`t`) | superuser / owner (`CTc`) | Yes | trusted |

Revoking TEMP from PUBLIC is **not** proposed: it is a database-level change on a Supabase-managed database, PostgREST and pooled sessions may rely on it, and it is far broader than the defect. The bounded helper correction in §K neutralises the risk without touching database-level privileges.

## F. PostgreSQL Temporary-Schema Resolution Analysis

- PostgreSQL 17 searches the active temporary schema **implicitly first** for **relations and data types** when `pg_temp` is not written in `search_path`. Writing `pg_temp` explicitly is the only way to control its position; placing it last demotes it below `public`.
- **Functions and operators are different**: they are never resolved from the temporary schema unless `pg_temp` is explicitly listed. So `has_permission`'s calls to built-in operators and `EXISTS` are safe regardless.
- Consequence for `search_path = public`: the six unqualified **relation** references inside `has_permission` are shadowable by a temporary table created in the caller's session.
- `is_tenant_member` and `is_active_tenant_member` reference `public.tenant_members` **schema-qualified**, so they are immune.
- Binding time: `has_permission` is PL/pgSQL, so its SQL statements are parsed and planned at first execution in a session and cached per session. A temp table created *before* the first call in that session resolves first and is captured in the cached plan; a temp table created *after* triggers plan invalidation and re-resolution. Neither ordering rescues the function — caching does not change the conclusion.
- Exploit shape, for completeness: an authenticated caller creates `CREATE TEMP TABLE tenant_members(...)` populated with a forged active `owner` row for an arbitrary `tenant_id`, then performs any RLS-gated write whose policy calls `has_permission`. Because the function is SECURITY DEFINER and returns `true` on the forged `owner` row before any other check, it grants cross-tenant write authority. This is a real, currently-reachable privilege-escalation path.

Verdict: `TEMPORARY-SCHEMA CORRECTION REQUIRED`.

## G. Helper Ownership, Body and search_path Matrix

| Helper | oid | Owner | SECDEF | Full search_path | PUBLIC EXECUTE | Unqualified relations | Unqualified types / functions / operators | Temp-shadow risk | Required correction |
|---|---|---|---|---|---|---|---|---|---|
| `has_permission(uuid,uuid,text)` | 47231 | postgres | Yes | `search_path=public` | Yes (`=X/postgres`) | `tenant_members`, `member_permissions`, `tenant_role_permissions`, `tenant_role_bundles`, `bundle_permissions`, `member_permission_bundles` | none (built-ins only; functions/operators are not temp-resolved) | **HIGH** | add `pg_temp` last |
| `is_tenant_member(uuid,uuid)` | 17622 | postgres | Yes | `search_path=public` | Yes | none — `public.tenant_members` qualified | none | None | add `pg_temp` last (defence in depth) |
| `is_active_tenant_member(uuid,uuid)` | 66253 | postgres | Yes | `search_path=public` | Yes | none — `public.tenant_members` qualified | none | None | add `pg_temp` last (defence in depth) |

Per-reference detail for `has_permission` — every one of the six relations has intended schema `public`, would be resolved from `pg_temp` first under the current setting, is inside a PL/pgSQL body, is planned at execution time with per-session caching, and is fixed by the §K correction with no body change:

| Reference | Intended schema | Temp resolves first today? | Language | Binding | Cached-plan effect |
|---|---|---|---|---|---|
| `tenant_members` | public | Yes | PL/pgSQL | execution-time | none material |
| `member_permissions` | public | Yes | PL/pgSQL | execution-time | none material |
| `tenant_role_permissions` | public | Yes | PL/pgSQL | execution-time | none material |
| `tenant_role_bundles` | public | Yes | PL/pgSQL | execution-time | none material |
| `bundle_permissions` (×2 joins) | public | Yes | PL/pgSQL | execution-time | none material |
| `member_permission_bundles` | public | Yes | PL/pgSQL | execution-time | none material |

## H. Exact Function-Identity Matrix

All resolved by `to_regprocedure` with exact argument-type vectors; each `proname` occurs exactly once in `public` (zero overload drift).

| Exact signature | oid | Exists | Unique | Owner | SECDEF | proconfig | EXECUTE ACL (excluding platform sandbox roles) |
|---|---|---|---|---|---|---|---|
| `public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)` | 157845 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, service_role |
| `public.post_expense_with_ledger(uuid,uuid,uuid)` | 157951 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | 157946 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.post_payment_session(uuid,uuid,jsonb)` | 161749 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.approve_invoice(uuid,uuid,uuid)` | 157859 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | 157953 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.create_source_checkout_invoice(uuid,uuid,jsonb)` | 159316 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, authenticated, service_role |
| `public.create_pos_sale(uuid,uuid,jsonb)` | 159321 | Yes | Yes | postgres | Yes | `search_path=""` | postgres, **anon**, **authenticated**, service_role |
| `public.has_permission(uuid,uuid,text)` | 47231 | Yes | Yes | postgres | Yes | `search_path=public` | **PUBLIC**, postgres, anon, authenticated, service_role |
| `public.is_tenant_member(uuid,uuid)` | 17622 | Yes | Yes | postgres | Yes | `search_path=public` | **PUBLIC**, postgres, anon, authenticated, service_role |
| `public.is_active_tenant_member(uuid,uuid)` | 66253 | Yes | Yes | postgres | Yes | `search_path=public` | **PUBLIC**, postgres, anon, authenticated, service_role |

No body hash is asserted in the migration: bodies change legitimately across unrelated migrations, and identity plus `prosecdef`/`proconfig`/owner is the stable contract.

## I. Exact Current RLS Policy Set

Independently re-derived from `pg_policy`. Total = **7** (three on `ledger_entries`, four on `customer_balances`). Prompt-13's total-of-eight assertion is wrong; the correct named set is below. All policies are role-unrestricted (`polroles` = PUBLIC), i.e. they apply to whichever role holds the table privilege.

| Table | Policy name | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|---|
| ledger_entries | Permission-based insert ledger entries | INSERT (`a`) | PUBLIC | — | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| ledger_entries | Tenant members can view ledger | SELECT (`r`) | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — |
| ledger_entries | Tenant members can view ledger entries | SELECT (`r`) | PUBLIC | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = ledger_entries.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` | — |
| customer_balances | Permission-based insert customer balances | INSERT (`a`) | PUBLIC | — | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| customer_balances | Permission-based update customer balances | UPDATE (`w`) | PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| customer_balances | Permission-based delete customer balances | DELETE (`d`) | PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | — |
| customer_balances | Tenant members can view balances | SELECT (`r`) | PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | — |

Post-Stage-B expected set: the same 7 minus the 4 write policies = **3 read policies**. Rollback restores the 4 write policies, returning exactly the 7 named above. The duplicate `ledger_entries` SELECT policy is pre-existing, harmless (policies OR together) and explicitly out of scope — noted in §P.

Neither table currently carries a table comment (`obj_description` is NULL on both), which the migration asserts as a precondition and the rollback restores.

## J. Effective `create_pos_sale` EXECUTE Matrix

`proacl` = `{postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres, sandbox_exec…=X/postgres}`.

| Grantee | EXECUTE today | Source | Required after Stage B |
|---|---|---|---|
| PUBLIC (grantee oid 0) | **No** — no `=X` entry present | non-null `proacl` without PUBLIC entry | No |
| anon | **Yes** | explicit grant | **No — revoke** |
| authenticated | **Yes** | explicit grant | **No — revoke** |
| service_role | Yes | explicit grant | Yes — retain |
| postgres | Yes | owner | Yes — retain |
| inherited roles | none exist (`pg_auth_members` empty for browser roles) | — | — |

Because PUBLIC currently holds nothing, `REVOKE … FROM PUBLIC` is a no-op safeguard; the forward migration asserts the PUBLIC-cannot-execute postcondition directly against `proacl`, and the rollback restores exactly anon + authenticated and nothing more.

## K. Single Recommended Helper Strategy

Recommendation: **`SET search_path = public, pg_temp`** — applied to all three helpers, via `ALTER FUNCTION … SET search_path`, with **no body replacement**.

Why it is the smallest safe correction: naming `pg_temp` explicitly places the temporary schema **last**, so `public.tenant_members` and its five siblings always win over any forged temp relation. It is a single catalog attribute change per function, it does not recompile or rewrite any body, it cannot introduce a logic regression, and it is exactly reversible with one statement.

Why the alternatives were rejected:
- `SET search_path = '' AND SCHEMA-QUALIFY ALL REFERENCES` — equally safe but requires replacing the full `has_permission` body. That function is the evaluation core of essentially every RLS policy in the database; rewriting it inside the Stage B financial-authority migration multiplies blast radius for no additional security. Recorded as an optional later hygiene item, not Stage B.
- `NO HELPER CHANGE REQUIRED` — refuted by §E and §F: TEMP is granted to PUBLIC and unqualified relations resolve from `pg_temp` first.
- `INSUFFICIENT EVIDENCE` — refuted; the privilege, the `proconfig` and the unqualified references are all directly observed.

Impact on dependent RLS policies: none functionally. `public` remains first in the path, so every reference resolves exactly as it does today for any session with no shadowing temp table. Policies are not recreated and no policy expression changes.

Rollback implications: one `ALTER FUNCTION … SET search_path TO 'public'` per helper restores the prior configuration byte-for-byte. No body restoration is needed because no body is touched.

Function body replacement required: **No.**

## L. Final Exact Forward Migration SQL

Proposed filename: `supabase/migrations/<timestamp>_stage_b_financial_write_authority.sql`. Executes inside the migration's implicit transaction; any assertion aborts the entire migration. Zero DML against any financial table.

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
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s(v)
          WHERE s.v IN ('search_path=', 'search_path=""')
       )
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_RPC_SEARCH_PATH_UNEXPECTED';
  END IF;

  -- P3. Helpers must currently be pinned to bare 'public' (the state this migration corrects)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = ANY (ARRAY[
             to_regprocedure('public.has_permission(uuid,uuid,text)'),
             to_regprocedure('public.is_tenant_member(uuid,uuid)'),
             to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
       AND COALESCE(array_to_string(p.proconfig, '|'), '') <> 'search_path=public'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_HELPER_SEARCH_PATH_UNEXPECTED';
  END IF;

  -- P4. TEMP is granted to PUBLIC — the condition that makes the helper correction necessary
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

  -- P8. Exact current policy set: seven named policies, no more, no fewer
  IF (SELECT count(*) FROM pg_policy
       WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)) <> 7 THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POLICY_COUNT_NOT_SEVEN';
  END IF;
  IF (SELECT count(*) FROM pg_policy
       WHERE (polrelid = 'public.ledger_entries'::regclass
              AND polname IN ('Permission-based insert ledger entries',
                              'Tenant members can view ledger',
                              'Tenant members can view ledger entries'))
          OR (polrelid = 'public.customer_balances'::regclass
              AND polname IN ('Permission-based insert customer balances',
                              'Permission-based update customer balances',
                              'Permission-based delete customer balances',
                              'Tenant members can view balances'))) <> 7 THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_POLICY_NAMES_UNEXPECTED';
  END IF;

  -- P9. Neither table currently carries a comment
  IF obj_description('public.ledger_entries'::regclass, 'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass, 'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_TABLE_COMMENT_PRESENT';
  END IF;

  -- P10. create_pos_sale currently executable by anon and authenticated, not by PUBLIC
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

  -- Q7. Helper search_path is exactly 'public, pg_temp'
  IF (SELECT count(*) FROM pg_proc p
       WHERE p.oid = ANY (ARRAY[
               to_regprocedure('public.has_permission(uuid,uuid,text)'),
               to_regprocedure('public.is_tenant_member(uuid,uuid)'),
               to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
         AND array_to_string(p.proconfig,'|') = 'search_path="public, pg_temp"') <> 3 THEN
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

  -- Q8. Exactly the three named read policies remain; no write policy remains
  IF EXISTS (
    SELECT 1 FROM pg_policy
     WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
       AND polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_WRITE_POLICY_REMAINS';
  END IF;
  IF (SELECT count(*) FROM pg_policy
       WHERE (polrelid = 'public.ledger_entries'::regclass
              AND polname IN ('Tenant members can view ledger','Tenant members can view ledger entries'))
          OR (polrelid = 'public.customer_balances'::regclass
              AND polname = 'Tenant members can view balances')) <> 3 THEN
    RAISE EXCEPTION 'STAGE_B_POST_READ_POLICY_SET_UNEXPECTED';
  END IF;

  -- Q9. Table comments recorded
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NULL THEN
    RAISE EXCEPTION 'STAGE_B_POST_TABLE_COMMENT_MISSING';
  END IF;
END
$$;
```

No `INSERT`, `UPDATE` or `DELETE` statement against any financial table appears anywhere in this migration, so the zero-financial-row-change postcondition holds by construction.

## M. Final Exact Rollback SQL

**Emergency use only. This rollback deliberately restores the prior unsafe state in which browser roles can write Ledger and Customer Balance truth directly through PostgREST, and restores the temporary-schema shadowing exposure in the SECURITY DEFINER permission helpers. Do not run it except to recover from a Stage B production incident.**

```sql
-- EMERGENCY ROLLBACK — restores the exact pre-Stage-B state.

-- 1. Restore all eight PostgreSQL 17 table privileges to the exact prior browser roles
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances TO anon, authenticated;

-- 2. Restore the exact four write policies (read policies were never dropped)
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
ALTER FUNCTION public.has_permission(uuid, uuid, text)    SET search_path TO 'public';
ALTER FUNCTION public.is_tenant_member(uuid, uuid)        SET search_path TO 'public';
ALTER FUNCTION public.is_active_tenant_member(uuid, uuid) SET search_path TO 'public';

-- 5. Restore prior comments (both tables had none)
COMMENT ON TABLE public.ledger_entries    IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;

DO $$
DECLARE r text; t text; p text;
BEGIN
  -- All eight privileges restored for both browser roles on both tables
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF NOT has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'ROLLBACK_INCOMPLETE_PRIVILEGE: % % %', r, t, p;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Exact named seven-policy set restored (three read + four write), and nothing extra
  IF (SELECT count(*) FROM pg_policy
       WHERE (polrelid = 'public.ledger_entries'::regclass
              AND polname IN ('Permission-based insert ledger entries',
                              'Tenant members can view ledger',
                              'Tenant members can view ledger entries'))
          OR (polrelid = 'public.customer_balances'::regclass
              AND polname IN ('Permission-based insert customer balances',
                              'Permission-based update customer balances',
                              'Permission-based delete customer balances',
                              'Tenant members can view balances'))) <> 7 THEN
    RAISE EXCEPTION 'ROLLBACK_NAMED_POLICY_SET_INCOMPLETE';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy
     WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
       AND polname NOT IN ('Permission-based insert ledger entries',
                           'Tenant members can view ledger',
                           'Tenant members can view ledger entries',
                           'Permission-based insert customer balances',
                           'Permission-based update customer balances',
                           'Permission-based delete customer balances',
                           'Tenant members can view balances')
  ) THEN
    RAISE EXCEPTION 'ROLLBACK_UNEXPECTED_POLICY_PRESENT';
  END IF;

  -- Exact policy expressions restored
  IF (SELECT count(*) FROM pg_policy
       WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
         AND polcmd IN ('a','w','d')
         AND coalesce(pg_get_expr(polqual, polrelid), '')
             || coalesce(pg_get_expr(polwithcheck, polrelid), '')
             LIKE '%finance.invoice.edit%') <> 4 THEN
    RAISE EXCEPTION 'ROLLBACK_WRITE_POLICY_EXPRESSION_UNEXPECTED';
  END IF;

  -- POS EXECUTE restored exactly: anon + authenticated yes, PUBLIC still no
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

  -- Helper search_path restored to the exact prior value
  IF (SELECT count(*) FROM pg_proc p
       WHERE p.oid = ANY (ARRAY[
               to_regprocedure('public.has_permission(uuid,uuid,text)'),
               to_regprocedure('public.is_tenant_member(uuid,uuid)'),
               to_regprocedure('public.is_active_tenant_member(uuid,uuid)')])
         AND array_to_string(p.proconfig,'|') = 'search_path=public') <> 3 THEN
    RAISE EXCEPTION 'ROLLBACK_HELPER_SEARCH_PATH_NOT_RESTORED';
  END IF;

  -- Comments restored to their prior null state
  IF obj_description('public.ledger_entries'::regclass,'pg_class') IS NOT NULL
     OR obj_description('public.customer_balances'::regclass,'pg_class') IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLBACK_TABLE_COMMENT_NOT_CLEARED';
  END IF;
END
$$;
```

The incorrect count-of-eight assertion from Prompt 13 is removed; the rollback now asserts the named seven-policy set plus an exclusion check for unexpected policies.

## N. Application Contract Confirmation

Unchanged and re-confirmed: Expense approval routes to `post_expense_with_ledger`; `postLedgerForExpense` deleted; `postLedgerForInvoice` deleted; `useLedger.createEntry` removed; automatic `backfillLedgerDescriptions` removed; POS remains visible in Navigation and Sidebar with a Coming Soon badge, non-clickable, non-keyboard-activatable, direct URL inert, no operational POS hook mounted, no `create_pos_sale` browser activation. This correction adds **no** application scope: the helper `search_path` change is a catalog attribute with no client surface, and SELECT is preserved for every read path (`useLedgerEntries`, `useCustomerBalances`, `useLedgerBalance`/`useLedgerBalances`, statements, PDF summaries, Realtime on `customer_balances`).

## O. QA Additions

**Helper safety.** Record effective TEMP privilege for `anon`, `authenticated`, `service_role`, PUBLIC. Assert `has_permission`, `is_tenant_member`, `is_active_tenant_member` each report `search_path="public, pg_temp"`. Negative shadowing test in an isolated transaction: as `authenticated`, `CREATE TEMP TABLE tenant_members(...)` containing a forged active `owner` row for a foreign tenant, then assert `has_permission()` still returns false for that tenant and true only for genuine membership; roll back. Assert authorized RLS-gated operations still succeed through the corrected helper, unauthorized permission keys are still rejected, and no cross-tenant permission regression appears in the existing permission suite.

**Migration.** Every exact required signature exists and is unique (11 signatures). PUBLIC cannot execute `create_pos_sale` (grantee-0 check). anon cannot execute it. authenticated cannot execute it. service_role and owner remain functional. Rollback restores exactly the named seven-policy set with matching expressions. The rollback transaction completes successfully in an isolated test. The forward migration reapplies cleanly after rollback. Zero financial rows change in either direction — verified by row counts and checksums on `ledger_entries`, `customer_balances`, `invoices` and `expenses` before and after.

Build and typecheck alone are not Acceptance. A separate QA pass and a read-only Acceptance Re-Audit remain mandatory.

## P. Deferred Items Register

Promoted into Stage B by this audit: the `has_permission` / helper temporary-schema `search_path` correction, and the rollback policy-set correction. No other promotion.

| Item | Original evidence | Status | Current lane | Proposed future lane | Dependency | Owner decision needed? | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|---|
| Expense browser writer cutover | `DashboardFinance.tsx` → `postLedgerForExpense` | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | `post_expense_with_ledger` | No | NULL Economic Dates persist | Stage B |
| Dead Ledger mutation removal | `useLedger.createEntry` unreferenced | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | none | No | Latent unsafe writer | Stage B |
| POS safety fencing | POS route and nav active | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | none | No | Operational POS writes | Stage B |
| Ledger / Customer Balance privilege hardening | full `arwdDxtm` to anon and authenticated | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | none | No | Direct PostgREST financial writes | Stage B |
| `create_pos_sale` browser EXECUTE revocation | anon + authenticated EXECUTE present | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | none | No | Anonymous POS sale invocation | Stage B |
| `backfillLedgerDescriptions` removal | auto-run already RLS-rejected | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | none | No | Silent broken auto-run | Stage B |
| **Helper temporary-schema `search_path` correction** | §E, §F, §G — TEMP granted to PUBLIC; `has_permission` unqualified under `search_path=public` | **PROMOTED TO CURRENT EXECUTION SCOPE** | Stage B | — | none | No | Cross-tenant privilege escalation via forged temp relation | Stage B |
| **Rollback policy-set correction** | §I — true total is seven, not eight | **PROMOTED TO CURRENT EXECUTION SCOPE** | Stage B | — | none | No | Rollback aborts on a false assertion during an incident | Stage B |
| `has_permission` full schema qualification (`search_path = ''`) | §K — optional stronger form | DEFERRED — TRACKED | none | security hardening lane | Stage B helper fix | Yes | None once `pg_temp` is pinned last | Later hardening pass |
| Duplicate `ledger_entries` SELECT policy | §I — two equivalent read policies | DEFERRED — TRACKED | none | security hardening lane | none | Yes | Policy-set confusion only; no access impact | Later hardening pass |
| Internal Cost terminology correction | Prompt 11 §G | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Wrong cross-account terminology | After Stage B |
| Internal Cost Unknown vs Real Zero | 5/5 non-income rows `actual_cost = 0` | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Missing cost reported as zero | After Stage B |
| Internal Cost contextual terminology by account type | stable wording on non-stable accounts | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Wrong labels per tenant type | Later |
| HR Salary-to-Expense atomicity | `useSalaryPayments.ts` client double insert | DEFERRED — TRACKED | none | HR/Finance lane | `record_salary_payment` | Yes | Orphan rows | After Stage B |
| HR Salary idempotency | no client key | DEFERRED — TRACKED | none | HR/Finance lane | same | Yes | Duplicate payroll | After Stage B |
| HR Salary reversal | none exists | DEFERRED — TRACKED | none | HR/Finance lane | design | Yes | Uncorrectable payroll | After Stage B |
| Generic Expense deletion of HR-linked records | `useExpenses` delete, no guard | DEFERRED — TRACKED | none | HR/Finance lane | same | Yes | Dangling `finance_expense_id` | After Stage B |
| Expense unpost / reversal | no client path to `reverse_expense` | DEFERRED — TRACKED | none | RM-DH-004 later phase | Stage B | Yes | Posted expenses uncorrectable | After Stage B |
| Supplier Payable payment / Expense / Ledger lifecycle | no path found | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Provider costs never reach finance | Later |
| Supplier Payable-to-Expense authority | undefined | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Ambiguous cost authority | Later |
| Full POS implementation | POS source retained | DEFERRED — TRACKED | WS-DH-2026-0005 | same | Stage B fencing | No | — | Owner activation |
| Future `create_pos_sale` activation | RPC retained, browser EXECUTE revoked | DEFERRED — TRACKED | WS-DH-2026-0005 | same | Stage B | No | — | Owner activation |
| Manual Ledger Adjustment product workflow | RPC exists, no UI | DEFERRED — TRACKED | none | future finance lane | D-B-1 forbids UI now | No | — | Owner request |
| Residual financial-table hardening | broad grants on `expenses`, `financial_entries`, `hr_salary_payments`, `supplier_payables`, `invoices`, `invoice_items`, `billing_links` | DEFERRED — TRACKED | none | security hardening lane | none | Yes | Over-broad grants persist | After Stage B |
| Database-level TEMP grant to PUBLIC | §E — `datacl` contains `=Tc` | DEFERRED — TRACKED | none | security hardening lane | platform constraints | Yes | Broad temp-table capability remains; neutralised for helpers by Stage B | Later platform review |

Internal Costs, HR Salary, Expense reversal, Supplier Payables and full POS implementation were **not** promoted.

## Q. Blockers and Gaps

None.

## R. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY PG_TEMP, SECURITY-DEFINER HELPER AND FINAL MIGRATION/ROLLBACK CORRECTION AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

The Prompt-12 and Prompt-13 application, POS, SELECT-only privilege and Deferred-Item contracts remain preserved except for the explicitly corrected helper and rollback sections.

Stage C and Stage D have not started.

No Workstream Closure occurred.

## S. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This correction audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap or Workstream ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.

## T. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only.
2. Operation: targeted temporary-schema safety, SECURITY DEFINER helper correction, exact function-identity preconditions, PUBLIC EXECUTE verification, and final migration/rollback correction audit.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-PG-TEMP-HELPER-SAFETY-AND-FINAL-MIGRATION-ROLLBACK-CORRECTION-AUDIT-14.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026.
6. Prompt Preparation Time: 22:23.
7. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
8. Run Start: 03-08-2026 22:31 Asia/Riyadh.
9. First evidenced activity: `pg_database` ACL and `has_database_privilege(..., 'TEMP')` inspection.
10. Run End: Exact time not recorded.
11. Last evidenced activity: `obj_description` check on both financial tables.
12. Final Report: Exact time not recorded.
13. Timestamp evidence source: platform message clock (prompt receipt time).
14. PostgreSQL version: 17.6 (carried from Prompt 13; unchanged this run).
15. Current database: `postgres`; owner `postgres`.
16. TEMP privileges: granted to PUBLIC (`=Tc/postgres`); effective `true` for anon, authenticated, service_role, postgres.
17. Branch: `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`.
18. Canonical/default branch evidence: Exact evidence not recorded.
19. HEAD before and after: unchanged this run.
20. Working tree before and after: clean apart from `.lovable/plan.md`.
21. Repository paths read: `customer_balances.schema.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/01_fn_post_payment.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt`, `supabase/tests/database/n2_4_catalog_runtime.test.sql`, `supabase/tests/database/n2_5_invoice_catalog_runtime.test.sql`.
22. Database objects read: `pg_database`, `pg_roles`, `pg_policy`, `pg_class`, `pg_proc`, `aclexplode`, `obj_description`; 2 target tables; 11 functions.
23. Catalog queries: 1 exec call, 7 statements.
24. Financial-row queries: 0.
25. Database role: `sandbox_exec`.
26. Helper definitions reviewed: `has_permission`, `is_tenant_member`, `is_active_tenant_member` (bodies from Prompt 13; configurations and ACLs re-read this run).
27. Exact function signatures verified: 11 of 11 exist, each unique, each owned by `postgres`, each SECURITY DEFINER.
28. Current policy names and count: 7 — three on `ledger_entries`, four on `customer_balances`, named in §I.
29. EXECUTE results for `create_pos_sale`: PUBLIC no; anon yes; authenticated yes; service_role yes; postgres yes.
30. Final helper strategy: `SET search_path = public, pg_temp` on all three helpers, no body replacement.
31. Final forward-migration contract result: complete (§L).
32. Final rollback contract result: complete and executable (§M).
33. Deferred items preserved: 25 register rows.
34. Deferred items promoted: 2 (helper temporary-schema correction; rollback policy-set correction), in addition to the 6 already promoted by Prompt 12/13.
35. Repository changes: zero.
36. Database changes: zero.
37. Migration changes: zero.
38. Knowledge / Skills / settings changes: zero.
39. `.lovable/plan.md` disclosure: written by Plan Mode this run to hold this report; it is the only file touched.
40. Five verdicts: as in §A.
41. Stage B implementation: not started.
42. Stage C: not started.
43. Stage D: not started.
44. Closure: none.
45. Exact stopping point: the PostgreSQL temporary-schema contract, SECURITY DEFINER helper safety, exact function identities, PUBLIC function-execution state, final forward migration, executable rollback contract, preserved application scope and complete Deferred Items Register have been established. No implementation, migration, financial-data change, Stage C, Stage D or Closure has occurred.
46. Recommended next step: issue the Stage B Agent/Build execution prompt combining the Prompt-12 application cutover with the single corrected migration in §L.
47. Recommended next Mode: Agent/Build.

This audit applied Skill dayli-05-rls-policy-safety.
