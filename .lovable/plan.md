# STAGE B — INTERNAL WRITER EXECUTE AUTHORITY, TRUSTED-SCHEMA PRECONDITION, AND FINAL EXECUTION-FREEZE CORRECTION AUDIT

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-INTERNAL-WRITER-EXECUTE-AUTHORITY-TRUSTED-SCHEMA-AND-FINAL-EXECUTION-FREEZE-AUDIT-18
Mode: Plan/Chat — Read-Only. Repository, database, migration and financial-row changes: zero.

---

## A. Combined Verdicts

1. PROMPT-17 EXECUTE-AUTHORITY AND TRUSTED-SCHEMA GAP WITHDRAWN
2. INTERNAL WRITER EXECUTE-AUTHORITY CONTRACT CLOSED
3. APPLICATION WRAPPER EXECUTE CONTRACT CLOSED
4. TRUSTED PUBLIC-SCHEMA CONTRACT CLOSED
5. CURRENT-AND-TARGET APPLICATION STATES CORRECTLY SEPARATED
6. FINAL AUTHORITY-FROZEN FORWARD MIGRATION SQL EXECUTABLE
7. FINAL AUTHORITY-FROZEN ROLLBACK SQL EXECUTABLE
8. ZERO REGRESSION TO PROMPTS 14–17 CONFIRMED
9. STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT

---

## B. Roadmap and Workstream State

RM-DH-004 — ACTIVE — PHASE 1 (Economic Date Integrity).
WS-DH-2026-0003 — ACTIVE. Stage A accepted, persisted, verified. Stage B implementation NOT started.
WS-DH-2026-0005 (POS Financial Isolation) — DEFERRED.

---

## C. Lovable Correction Acknowledgement

LOVABLE CORRECTION ACKNOWLEDGEMENT:
The Prompt-17 effective EXECUTE-authority closure, trusted-schema completeness, final SQL readiness, zero-regression and Stage-B readiness verdicts are withdrawn.

Prompt-17 canonical function identities, the proven _finance_invoice_approve_inline dependency, the three-helper identity, zero-PUBLIC table ACL finding, polroles representation and both role-aware Policy hashes remain authoritative and are not reopened.

The final contract now requires effective function ACLs, negative browser/PUBLIC execution assertions for internal writers, preserved external-wrapper execution authority, and a no-untrusted-CREATE guard on schema public.

---

## D. Evidence Boundary

- OFFICIAL POSTGRESQL DOCUMENTATION FACT: SECURITY DEFINER executes with owner privileges; functions receive PUBLIC EXECUTE by default unless restricted; a schema in search_path is trusted only if untrusted roles lack CREATE on it; pg_temp must be last.
- LIVE DATABASE FACT: PostgreSQL 17.6, database `postgres`, role `sandbox_exec`. All ACL rows in §H/§I/§J/§K read this run from `pg_proc`, `pg_namespace`, `aclexplode`, `has_function_privilege`, `has_schema_privilege`, `pg_auth_members`, `pg_roles`.
- REPOSITORY FACT: §L call-site evidence read this run (`rg` over `src/`). Branch `edit/edt-90d0d5dc-9c1b-4387-a753-d74e4d7aa7fd`, HEAD `685ff874dd7175d09eff11ab9b81e1792a723a88`, clean tree before and after.
- PRESERVED PRIOR FINDING: everything in §E.
- CHATGPT CORRECTION INFERENCE: the §3.2/§3.3 security reasoning that table-DML revocation alone is insufficient without internal-writer EXECUTE closure — now confirmed unnecessary as a remediation, but retained as an assertion requirement.
- GAP: none blocking.

---

## E. PRESERVED AND STILL AUTHORITATIVE

Items 1–27 of the prompt §5 are preserved unchanged, including: Stage A acceptance/persistence/verification; Expense economic date `expense_date`; expense target RPC `post_expense_with_ledger`; targeted removal of `postLedgerForExpense`, `postLedgerForInvoice`, dead `useLedger.createEntry`, automatic `backfillLedgerDescriptions`; POS visible + Coming Soon + inert; REVOKE ALL → GRANT SELECT; all eight PG17 table privileges; zero column ACLs; zero browser-role inheritance; three-helper `public, pg_temp`; robust text-element proconfig assertions; seven current RLS policies with `polroles={0}`; pre-state hash `e978f912777a28108f46ba79e2ce071e`; post-state hash `04297828f4bd33eba043f6c9274ec57b`; the accepted eleven exact functions; `_finance_invoice_approve_inline` as proven dependency; exclusion of the three unrelated Prompt-16 functions; zero PUBLIC table grants; complete Deferred Items Register; zero change through Prompt 17.

---

## F. REJECTED OR SUPERSEDED FINDING

Rejected: "Prompt 17 fully closed effective function execution authority and the trusted-schema premise, making its Forward Migration, Rollback, zero-regression verdict and Stage B readiness final."
Only the dependent ACL, schema-privilege, SQL-assertion, current-versus-target wording and readiness sections were reopened; §E is untouched.

---

## G. Effective Function ACL Methodology

Effective ACL = `aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner)))`, cross-checked with `has_function_privilege(role, <exact regprocedure>, 'EXECUTE')` and role inheritance via `pg_auth_members` / `pg_roles.rolinherit`. Functions resolved by `to_regprocedure('public.name(argtypes)')`, never by `proname`. `proacl IS NULL` is never treated as proof of no PUBLIC EXECUTE — a NULL proacl means the *default* ACL, which grants PUBLIC EXECUTE.

Observed roles: PUBLIC, anon, authenticated, service_role, postgres, sandbox_exec, sandbox_exec_vhxglsvxwwpmoqjabfmj.
Role memberships: `authenticator` and `postgres` are members of anon/authenticated/service_role; anon/authenticated are members of nothing. No inherited path grants browser roles the internal-writer EXECUTE.

---

## H. Internal Writer EXECUTE Matrix

Both writers have a NON-NULL explicit proacl (no default PUBLIC grant present).

| Exact signature | Owner | SECDEF | Raw proacl | Grantees (all EXECUTE, non-grantable, grantor postgres) | PUBLIC | anon | authenticated |
|---|---|---|---|---|---|---|---|
| `public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)` | postgres | t | `{postgres=X/postgres,service_role=X/postgres,sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,sandbox_exec=X/postgres}` | postgres, service_role, sandbox_exec, sandbox_exec_vhxglsvxwwpmoqjabfmj | NO | NO | NO |
| `public._finance_invoice_approve_inline(uuid,uuid,uuid)` | postgres | t | `{postgres=X/postgres,service_role=X/postgres,sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,sandbox_exec=X/postgres}` | same four | NO | NO | NO |

`has_function_privilege` confirmation: anon=false, authenticated=false, service_role=true, postgres=true for both.

- Write targets: `_finance_ledger_insert` inserts/updates `public.ledger_entries` and upserts `public.customer_balances`; `_finance_invoice_approve_inline` writes invoice status plus ledger/balance through the same leaf writer.
- Direct callers: accepted Finance wrappers only (`post_payment`, `post_payment_session`, `approve_invoice`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `create_source_checkout_invoice`, `create_pos_sale`). Direct browser invocation is NOT intended.
- service_role EXECUTE is required for server-side/edge paths and is preserved exactly.
- Desired post-migration ACL: identical to pre-state.
- Forward action: ASSERT the negative contract (no revoke required — nothing to revoke).
- Rollback action: re-assert the same pre-state; restore nothing, because nothing is revoked.

---

## I. External Application-Wrapper EXECUTE Matrix

| Function | PUBLIC | anon | authenticated | service_role | postgres | sandbox roles | Approved post-state | Forward action | Rollback action |
|---|---|---|---|---|---|---|---|---|---|
| `post_expense_with_ledger(uuid,uuid,uuid)` | no | no | YES | yes | yes | yes (both) | unchanged | assert preserved | assert preserved |
| `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | no | no | YES | yes | yes | yes | unchanged | assert preserved | assert preserved |
| `post_payment_session(uuid,uuid,jsonb)` | no | no | YES | yes | yes | yes | unchanged | assert preserved | assert preserved |
| `approve_invoice(uuid,uuid,uuid)` | no | no | YES | yes | yes | yes | unchanged | assert preserved | assert preserved |
| `post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | no | no | YES | yes | yes | yes | unchanged (no UI, contract preserved) | assert preserved | assert preserved |
| `create_source_checkout_invoice(uuid,uuid,jsonb)` | no | no | YES | yes | yes | yes | unchanged | assert preserved | assert preserved |
| `create_pos_sale(uuid,uuid,jsonb)` | no | **YES** | **YES** | yes | yes | yes | anon+authenticated removed; postgres/service_role/sandbox retained | `REVOKE EXECUTE ... FROM anon, authenticated` | `GRANT EXECUTE ... TO anon, authenticated` (exact pre-state) |

This corrects the malformed Prompt-17 `post_manual_ledger_adjustment` row: its ACL is `{postgres,authenticated,service_role,sandbox_exec_vhxglsvxwwpmoqjabfmj,sandbox_exec}` — authenticated EXECUTE exists and must be preserved. No PUBLIC or anon exception exists on any of the six wrappers, and none is invented.

---

## J. Permission-Helper EXECUTE Observation

| Helper | proacl | PUBLIC | anon | authenticated | Classification |
|---|---|---|---|---|---|
| `has_permission(uuid,uuid,text)` | `{=X/postgres,postgres,anon,authenticated,service_role,sandbox_exec_vhxglsvxwwpmoqjabfmj,sandbox_exec}` | YES (explicit `=X/postgres`) | yes | yes | required for RLS evaluation; callable directly; read-only; tenant-gated by arguments |
| `is_tenant_member(uuid,uuid)` | same shape | YES | yes | yes | same |
| `is_active_tenant_member(uuid,uuid)` | same shape | YES | yes | yes | same; also called inside `post_payment` |

All three are read-only membership/permission predicates that leak no row data beyond a boolean about an explicitly supplied (user, tenant) pair, and RLS evaluation depends on them. Not a Stage B blocker.

Status: DEFERRED — TRACKED. Risk: low (boolean oracle for membership pairs the caller already knows). No revocation in Stage B.

---

## K. Trusted Public-Schema Matrix

Schema `public`, owner `pg_database_owner`.
Raw nspacl: `{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner,postgres=U/pg_database_owner,anon=U/pg_database_owner,authenticated=U/pg_database_owner,service_role=U/pg_database_owner,sandbox_exec_vhxglsvxwwpmoqjabfmj=U/pg_database_owner,sandbox_exec=U/pg_database_owner}`

| Role | USAGE | CREATE |
|---|---|---|
| PUBLIC (`=U`) | yes | **no** |
| anon | yes | **no** |
| authenticated | yes | **no** |
| service_role | yes | no |
| sandbox_exec / sandbox_exec_vhxglsvxwwpmoqjabfmj | yes | no |
| postgres | yes | yes (member of pg_database_owner path) |
| pg_database_owner | yes | yes (owner) |

`has_schema_privilege(...,'public','CREATE')` = false for anon, authenticated, service_role and both sandbox roles. Only CREATE holder is the database owner chain. No inheritance grants CREATE to a browser role.

Result: the `search_path = public, pg_temp` helper target is safe. No schema ACL change is introduced; the state is asserted as both a precondition and a postcondition.

---

## L. Current Repository State versus Approved Target

CURRENT REPOSITORY STATE (read this run, HEAD `685ff874d`):
- `src/lib/finance/postLedgerForExpense.ts` exists; called at `src/pages/DashboardFinance.tsx:311` (imported line 35). Browser-direct `ledger_entries` insert still live.
- `src/lib/finance/postLedgerForInvoice.ts` exists; called at `src/hooks/pos/usePOSCore.ts:163`. Browser-direct `ledger_entries` insert and `customer_balances` upsert still live.
- `src/hooks/finance/useLedger.ts:104` defines `createEntry` and exports it at line 164 — no consumer found in `src/`; dead writer still present.
- `src/lib/finance/backfillLedgerDescriptions.ts` still exists and is dynamically imported/executed at `src/pages/DashboardFinance.tsx:347-348`.
- POS is reachable: `src/navigation/navConfig.ts:277-280` routes `/dashboard/finance/pos`; `src/hooks/pos/usePOSCore.ts` is an operational writer.
- No Stage B implementation exists.

APPROVED STAGE B TARGET (not yet implemented):
- Expense approval must call `post_expense_with_ledger`.
- `postLedgerForExpense`, `postLedgerForInvoice`, dead `useLedger.createEntry` and the automatic description backfill must be removed.
- POS must remain visible with Coming Soon, disabled, non-clickable, non-keyboard-activatable, direct URL inert, with no operational POS hook or writer mounted.
- Browser table DML on `ledger_entries` and `customer_balances` must be closed to SELECT only.
- Internal SECURITY DEFINER writers must remain non-invocable by browser roles.
- No historical financial rows may change.

---

## M. Final Exact Forward Migration SQL

```sql
-- STAGE B FORWARD MIGRATION — AUTHORITY FROZEN
-- WS-DH-2026-0003 / RM-DH-004 Phase 1
-- Read-only audit artifact. DO NOT EXECUTE outside an authorized Stage B Agent/Build run.
BEGIN;

-- ============ PRECONDITIONS ============

-- P0: engine
DO $$ BEGIN
  IF current_setting('server_version_num')::int < 170000 THEN
    RAISE EXCEPTION 'STAGE_B_PRE_PG17_REQUIRED';
  END IF;
END $$;

-- P1: target tables exist, are owned by postgres, RLS enabled, FORCE RLS off
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY['ledger_entries','customer_balances']) AS t LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=r.t AND c.relkind='r'
        AND pg_get_userbyid(c.relowner)='postgres'
        AND c.relrowsecurity AND NOT c.relforcerowsecurity
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_TABLE_STATE_MISMATCH: %', r.t;
    END IF;
  END LOOP;
END $$;

-- P2: the accepted eleven Finance functions exist with exact signatures,
--     are owned by postgres, are SECURITY DEFINER, and use an empty search_path
DO $$
DECLARE
  sigs text[] := ARRAY[
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_payment_session(uuid,uuid,jsonb)',
    'public.post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.cancel_invoice(uuid,uuid,uuid,date,text)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
    'public.create_pos_sale(uuid,uuid,jsonb)',
    'public.record_salary_payment(uuid,uuid,uuid,numeric,text,timestamp with time zone,text,text,boolean)'
  ];
  s text; o oid; cfg text[];
BEGIN
  FOREACH s IN ARRAY sigs LOOP
    o := to_regprocedure(s);
    IF o IS NULL THEN RAISE EXCEPTION 'STAGE_B_PRE_FN_MISSING: %', s; END IF;
    SELECT p.proconfig INTO cfg FROM pg_proc p WHERE p.oid=o;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=o AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres') THEN
      RAISE EXCEPTION 'STAGE_B_PRE_FN_SECDEF_OWNER_MISMATCH: %', s;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(cfg, ARRAY[]::text[])) e
      WHERE split_part(e,'=',1)='search_path'
        AND btrim(replace(substr(e, strpos(e,'=')+1), '"',''))=''
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_FN_SEARCH_PATH_NOT_EMPTY: %', s;
    END IF;
  END LOOP;
END $$;

-- P3: proven additional Finance dependency
DO $$
DECLARE o oid := to_regprocedure('public._finance_invoice_approve_inline(uuid,uuid,uuid)');
BEGIN
  IF o IS NULL THEN RAISE EXCEPTION 'STAGE_B_PRE_APPROVE_INLINE_MISSING'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=o AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres') THEN
    RAISE EXCEPTION 'STAGE_B_PRE_APPROVE_INLINE_STATE_MISMATCH';
  END IF;
END $$;

-- P4: INTERNAL WRITER NEGATIVE EXECUTE CONTRACT (effective ACL, not proacl substring).
-- Revoking table DML from browser roles is NOT sufficient on its own: these are
-- SECURITY DEFINER functions owned by postgres, so any browser role able to EXECUTE
-- them could still write ledger_entries and customer_balances as postgres.
DO $$
DECLARE w text; r text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
  ] LOOP
    -- PUBLIC pseudo-role, via effective ACL (covers proacl IS NULL default grants)
    IF EXISTS (
      SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE p.oid = to_regprocedure(w) AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_INTERNAL_WRITER_PUBLIC_EXECUTE: %', w;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r, w, 'EXECUTE') THEN
        RAISE EXCEPTION 'STAGE_B_PRE_INTERNAL_WRITER_BROWSER_EXECUTE: % / %', w, r;
      END IF;
    END LOOP;
    -- preserve exactly the proven server-side grants; do not add any
    IF NOT (has_function_privilege('postgres', w, 'EXECUTE')
        AND has_function_privilege('service_role', w, 'EXECUTE')) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_INTERNAL_WRITER_SERVER_EXECUTE_MISSING: %', w;
    END IF;
  END LOOP;
END $$;

-- P5: external application wrappers — approved authenticated EXECUTE, no PUBLIC/anon
DO $$
DECLARE w text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_payment_session(uuid,uuid,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)'
  ] LOOP
    IF NOT has_function_privilege('authenticated', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_PRE_WRAPPER_AUTHENTICATED_EXECUTE_MISSING: %', w;
    END IF;
    IF has_function_privilege('anon', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_PRE_WRAPPER_ANON_EXECUTE_PRESENT: %', w;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE p.oid = to_regprocedure(w) AND a.grantee = 0 AND a.privilege_type='EXECUTE'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_WRAPPER_PUBLIC_EXECUTE_PRESENT: %', w;
    END IF;
  END LOOP;
END $$;

-- P6: create_pos_sale current browser EXECUTE state (to be removed below)
DO $$ BEGIN
  IF NOT (has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
      AND has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')) THEN
    RAISE EXCEPTION 'STAGE_B_PRE_POS_EXECUTE_STATE_MISMATCH';
  END IF;
END $$;

-- P7: TRUSTED SCHEMA GUARD — no untrusted CREATE on schema public.
-- search_path = public, pg_temp is only safe while this holds.
DO $$
DECLARE r text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace n, LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRE_PUBLIC_SCHEMA_CREATE_FOR_PUBLIC';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_schema_privilege(r,'public','CREATE') THEN
      RAISE EXCEPTION 'STAGE_B_PRE_PUBLIC_SCHEMA_CREATE_FOR_BROWSER_ROLE: %', r;
    END IF;
    IF NOT has_schema_privilege(r,'public','USAGE') THEN
      RAISE EXCEPTION 'STAGE_B_PRE_PUBLIC_SCHEMA_USAGE_MISSING: %', r;
    END IF;
  END LOOP;
END $$;

-- P8: TEMP is granted to PUBLIC at database level (why pg_temp must be demoted, not omitted)
DO $$ BEGIN
  IF NOT has_database_privilege('public', current_database(), 'TEMP') THEN
    RAISE NOTICE 'STAGE_B_PRE_TEMP_NOT_PUBLIC (informational)';
  END IF;
END $$;

-- P9: three helpers currently at search_path=public
DO $$
DECLARE s text; cfg text[];
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.has_permission(uuid,uuid,text)',
    'public.is_tenant_member(uuid,uuid)',
    'public.is_active_tenant_member(uuid,uuid)'
  ] LOOP
    SELECT p.proconfig INTO cfg FROM pg_proc p WHERE p.oid = to_regprocedure(s);
    IF NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(cfg, ARRAY[]::text[])) e
      WHERE split_part(e,'=',1)='search_path'
        AND btrim(replace(substr(e, strpos(e,'=')+1),'"','')) = 'public'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_HELPER_SEARCH_PATH_MISMATCH: %', s;
    END IF;
  END LOOP;
END $$;

-- P10: browser roles hold all eight PG17 table privileges; zero column ACLs;
--      zero PUBLIC table grants; zero role inheritance into browser roles
DO $$
DECLARE t text; r text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF NOT has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'STAGE_B_PRE_TABLE_PRIV_MISSING: % / % / %', t, r, p;
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS (
      SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
      WHERE c.oid = t::regclass AND a.grantee = 0
    ) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_PUBLIC_TABLE_GRANT_PRESENT: %', t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = t::regclass AND attacl IS NOT NULL) THEN
      RAISE EXCEPTION 'STAGE_B_PRE_COLUMN_ACL_PRESENT: %', t;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member IN ('anon'::regrole,'authenticated'::regrole)) THEN
    RAISE EXCEPTION 'STAGE_B_PRE_BROWSER_ROLE_INHERITANCE_PRESENT';
  END IF;
END $$;

-- P11: seven-policy role-aware pre-state fingerprint
DO $$
DECLARE h text;
BEGIN
  SELECT md5(string_agg(x, '|' ORDER BY x)) INTO h
  FROM (
    SELECT c.relname||':'||p.polname||':'||p.polcmd||':'||
           coalesce(pg_get_expr(p.polqual,p.polrelid),'-')||':'||
           coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-')||':'||
           CASE WHEN p.polroles = ARRAY[0::oid] THEN 'PUBLIC' ELSE array_to_string(p.polroles,',') END AS x
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
  ) s;
  IF h IS DISTINCT FROM 'e978f912777a28108f46ba79e2ce071e' THEN
    RAISE EXCEPTION 'STAGE_B_PRE_POLICY_FINGERPRINT_MISMATCH: %', h;
  END IF;
END $$;

-- ============ CHANGES ============

-- C1: close browser table DML (SELECT only)
REVOKE ALL ON TABLE public.ledger_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.customer_balances FROM anon, authenticated;
GRANT SELECT ON TABLE public.ledger_entries TO anon, authenticated;
GRANT SELECT ON TABLE public.customer_balances TO anon, authenticated;

-- C2: drop the four browser write policies (read policies preserved)
DROP POLICY IF EXISTS "ledger_entries_insert" ON public.ledger_entries;
DROP POLICY IF EXISTS "ledger_entries_update" ON public.ledger_entries;
DROP POLICY IF EXISTS "customer_balances_insert" ON public.customer_balances;
DROP POLICY IF EXISTS "customer_balances_update" ON public.customer_balances;

-- C3: POS remains defined but non-invocable by browser roles
REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) FROM anon, authenticated;

-- C4: demote pg_temp in the three permission helpers (pg_temp last, public trusted per P7)
ALTER FUNCTION public.has_permission(uuid,uuid,text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid,uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant_member(uuid,uuid) SET search_path = public, pg_temp;

-- C5: intent comments
COMMENT ON TABLE public.ledger_entries IS
  'Financial truth. Browser roles: SELECT only. All writes via SECURITY DEFINER Finance RPCs. WS-DH-2026-0003 Stage B.';
COMMENT ON TABLE public.customer_balances IS
  'Derived client balances. Browser roles: SELECT only. All writes via SECURITY DEFINER Finance RPCs. WS-DH-2026-0003 Stage B.';

-- NOTE: no INSERT/UPDATE/DELETE is issued against any financial table by this migration.

-- ============ POSTCONDITIONS ============

-- Q1: browser table privileges reduced to SELECT only
DO $$
DECLARE t text; r text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF NOT has_table_privilege(r, t, 'SELECT') THEN
        RAISE EXCEPTION 'STAGE_B_POST_SELECT_MISSING: % / %', t, r;
      END IF;
      FOREACH p IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'STAGE_B_POST_PRIV_NOT_REVOKED: % / % / %', t, r, p;
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS (
      SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
      WHERE c.oid = t::regclass AND a.grantee = 0
    ) THEN
      RAISE EXCEPTION 'STAGE_B_POST_PUBLIC_TABLE_GRANT_PRESENT: %', t;
    END IF;
    IF NOT (has_table_privilege('service_role', t, 'SELECT')
        AND has_table_privilege('service_role', t, 'INSERT')
        AND has_table_privilege('service_role', t, 'UPDATE')) THEN
      RAISE EXCEPTION 'STAGE_B_POST_SERVICE_ROLE_REGRESSION: %', t;
    END IF;
    IF pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = t::regclass)) <> 'postgres' THEN
      RAISE EXCEPTION 'STAGE_B_POST_OWNER_CHANGED: %', t;
    END IF;
  END LOOP;
END $$;

-- Q2: internal writer negative EXECUTE contract still holds and server grants unchanged
DO $$
DECLARE w text; r text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE p.oid = to_regprocedure(w) AND a.grantee = 0 AND a.privilege_type='EXECUTE'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_POST_INTERNAL_WRITER_PUBLIC_EXECUTE: %', w;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r, w, 'EXECUTE') THEN
        RAISE EXCEPTION 'STAGE_B_POST_INTERNAL_WRITER_BROWSER_EXECUTE: % / %', w, r;
      END IF;
    END LOOP;
    IF NOT (has_function_privilege('postgres', w, 'EXECUTE')
        AND has_function_privilege('service_role', w, 'EXECUTE')) THEN
      RAISE EXCEPTION 'STAGE_B_POST_INTERNAL_WRITER_SERVER_EXECUTE_LOST: %', w;
    END IF;
  END LOOP;
END $$;

-- Q3: all six authenticated wrappers preserved, including post_manual_ledger_adjustment
DO $$
DECLARE w text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_payment_session(uuid,uuid,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)'
  ] LOOP
    IF NOT has_function_privilege('authenticated', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_POST_WRAPPER_AUTHENTICATED_EXECUTE_LOST: %', w;
    END IF;
    IF has_function_privilege('anon', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_POST_WRAPPER_ANON_EXECUTE_PRESENT: %', w;
    END IF;
  END LOOP;
END $$;

-- Q4: POS non-invocable by browser roles, server grants retained
DO $$ BEGIN
  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_BROWSER_EXECUTE_PRESENT';
  END IF;
  IF NOT (has_function_privilege('postgres','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
      AND has_function_privilege('service_role','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')) THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_SERVER_EXECUTE_LOST';
  END IF;
END $$;

-- Q5: helpers now public, pg_temp (robust text-element assertion)
DO $$
DECLARE s text; cfg text[];
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.has_permission(uuid,uuid,text)',
    'public.is_tenant_member(uuid,uuid)',
    'public.is_active_tenant_member(uuid,uuid)'
  ] LOOP
    SELECT p.proconfig INTO cfg FROM pg_proc p WHERE p.oid = to_regprocedure(s);
    IF NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(cfg, ARRAY[]::text[])) e
      WHERE split_part(e,'=',1)='search_path'
        AND btrim(replace(replace(substr(e, strpos(e,'=')+1),'"',''),' ','')) = 'public,pg_temp'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_POST_HELPER_SEARCH_PATH_MISMATCH: %', s;
    END IF;
  END LOOP;
END $$;

-- Q6: trusted schema unchanged (no CREATE for PUBLIC/anon/authenticated), USAGE preserved
DO $$
DECLARE r text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace n, LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
    WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_PUBLIC_SCHEMA_CREATE_FOR_PUBLIC';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_schema_privilege(r,'public','CREATE') THEN
      RAISE EXCEPTION 'STAGE_B_POST_PUBLIC_SCHEMA_CREATE_FOR_BROWSER_ROLE: %', r;
    END IF;
    IF NOT has_schema_privilege(r,'public','USAGE') THEN
      RAISE EXCEPTION 'STAGE_B_POST_PUBLIC_SCHEMA_USAGE_LOST: %', r;
    END IF;
  END LOOP;
END $$;

-- Q7: three-policy role-aware post-state fingerprint
DO $$
DECLARE h text;
BEGIN
  SELECT md5(string_agg(x, '|' ORDER BY x)) INTO h
  FROM (
    SELECT c.relname||':'||p.polname||':'||p.polcmd||':'||
           coalesce(pg_get_expr(p.polqual,p.polrelid),'-')||':'||
           coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-')||':'||
           CASE WHEN p.polroles = ARRAY[0::oid] THEN 'PUBLIC' ELSE array_to_string(p.polroles,',') END AS x
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
  ) s;
  IF h IS DISTINCT FROM '04297828f4bd33eba043f6c9274ec57b' THEN
    RAISE EXCEPTION 'STAGE_B_POST_POLICY_FINGERPRINT_MISMATCH: %', h;
  END IF;
END $$;

COMMIT;
```

---

## N. Final Exact Rollback SQL

```sql
-- STAGE B EMERGENCY ROLLBACK — AUTHORITY FROZEN
-- WARNING: this restores UNSAFE browser-direct DML on ledger_entries and
-- customer_balances and restores browser EXECUTE on create_pos_sale.
-- Use only to recover a failed Stage B cutover. DO NOT EXECUTE casually.
BEGIN;

-- R0: restore all eight PG17 table privileges to browser roles
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances TO anon, authenticated;

-- R1: restore the exact four write policies
CREATE POLICY "ledger_entries_insert" ON public.ledger_entries
  FOR INSERT WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "ledger_entries_update" ON public.ledger_entries
  FOR UPDATE USING (public.is_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "customer_balances_insert" ON public.customer_balances
  FOR INSERT WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "customer_balances_update" ON public.customer_balances
  FOR UPDATE USING (public.is_tenant_member(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));
-- Policy bodies MUST be re-emitted verbatim from the pre-state capture taken
-- immediately before the Forward Migration; R6 enforces this by fingerprint.

-- R2: restore create_pos_sale browser EXECUTE (exact audited pre-state)
GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid,uuid,jsonb) TO anon, authenticated;

-- R3: restore the three helper search paths
ALTER FUNCTION public.has_permission(uuid,uuid,text) SET search_path = public;
ALTER FUNCTION public.is_tenant_member(uuid,uuid) SET search_path = public;
ALTER FUNCTION public.is_active_tenant_member(uuid,uuid) SET search_path = public;

-- R4: restore prior comments
COMMENT ON TABLE public.ledger_entries IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;

-- R5: internal writers — nothing to restore.
-- The Forward Migration revoked NO internal-writer EXECUTE grant, because the
-- audited pre-state already had zero PUBLIC/anon/authenticated EXECUTE.
-- Assert that the rollback added no unproven grant and lost no server grant.
DO $$
DECLARE w text; r text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
    'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc p, LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE p.oid = to_regprocedure(w) AND a.grantee = 0 AND a.privilege_type='EXECUTE'
    ) THEN
      RAISE EXCEPTION 'STAGE_B_RB_INTERNAL_WRITER_PUBLIC_EXECUTE: %', w;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r, w, 'EXECUTE') THEN
        RAISE EXCEPTION 'STAGE_B_RB_INTERNAL_WRITER_BROWSER_EXECUTE: % / %', w, r;
      END IF;
    END LOOP;
    IF NOT (has_function_privilege('postgres', w, 'EXECUTE')
        AND has_function_privilege('service_role', w, 'EXECUTE')) THEN
      RAISE EXCEPTION 'STAGE_B_RB_INTERNAL_WRITER_SERVER_EXECUTE_LOST: %', w;
    END IF;
  END LOOP;
END $$;

-- R6: all six authenticated wrappers preserved; schema CREATE state unchanged;
--     zero PUBLIC table grants; pre-state policy fingerprint restored exactly
DO $$
DECLARE w text; r text; t text; h text;
BEGIN
  FOREACH w IN ARRAY ARRAY[
    'public.post_expense_with_ledger(uuid,uuid,uuid)',
    'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
    'public.post_payment_session(uuid,uuid,jsonb)',
    'public.approve_invoice(uuid,uuid,uuid)',
    'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
    'public.create_source_checkout_invoice(uuid,uuid,jsonb)'
  ] LOOP
    IF NOT has_function_privilege('authenticated', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_RB_WRAPPER_AUTHENTICATED_EXECUTE_LOST: %', w;
    END IF;
    IF has_function_privilege('anon', w, 'EXECUTE') THEN
      RAISE EXCEPTION 'STAGE_B_RB_WRAPPER_ANON_EXECUTE_PRESENT: %', w;
    END IF;
  END LOOP;

  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_schema_privilege(r,'public','CREATE') THEN
      RAISE EXCEPTION 'STAGE_B_RB_PUBLIC_SCHEMA_CREATE_FOR_BROWSER_ROLE: %', r;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
      WHERE c.oid = t::regclass AND a.grantee = 0
    ) THEN
      RAISE EXCEPTION 'STAGE_B_RB_PUBLIC_TABLE_GRANT_PRESENT: %', t;
    END IF;
  END LOOP;

  SELECT md5(string_agg(x, '|' ORDER BY x)) INTO h
  FROM (
    SELECT c.relname||':'||p.polname||':'||p.polcmd||':'||
           coalesce(pg_get_expr(p.polqual,p.polrelid),'-')||':'||
           coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-')||':'||
           CASE WHEN p.polroles = ARRAY[0::oid] THEN 'PUBLIC' ELSE array_to_string(p.polroles,',') END AS x
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('ledger_entries','customer_balances')
  ) s;
  IF h IS DISTINCT FROM 'e978f912777a28108f46ba79e2ce071e' THEN
    RAISE EXCEPTION 'STAGE_B_RB_POLICY_FINGERPRINT_MISMATCH: %', h;
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE against any financial table is issued by this rollback.
COMMIT;
```

Forward→Rollback→Forward symmetry requirement: after Rollback, the pre-state hash `e978f912777a28108f46ba79e2ce071e` must reproduce exactly; after a second Forward, the post-state hash `04297828f4bd33eba043f6c9274ec57b` must reproduce exactly, with identical effective ACLs on both internal writers and all seven functions in §I.

---

## O. Application Contract Confirmation

APPLICATION CONTRACT STATUS:
APPROVED TARGET — NOT YET IMPLEMENTED

Confirmed: no additional application scope; no POS implementation; no Manual Adjustment UI; no Internal Costs work; no HR Salary work; no Supplier Payable work; no historical data repair; no Stage C or Stage D work.

---

## P. QA Additions

16.1 Internal Writer Negative Invocation — as PUBLIC-equivalent, anon and authenticated contexts, attempt actual invocation (not catalog inspection alone) of `_finance_ledger_insert` and `_finance_invoice_approve_inline` in an isolated rollback-safe environment; both must be denied with no ledger row created and no customer balance changed.

16.2 External Wrapper Positive/Negative — authorized authenticated wrapper calls succeed; cross-tenant calls fail; `post_manual_ledger_adjustment` server contract preserved without UI; anon/PUBLIC cannot call authenticated Finance wrappers; `create_pos_sale` cannot be called by browser roles; service-role behaviour unchanged.

16.3 Trusted Schema — PUBLIC/anon/authenticated cannot CREATE in `public`; all three helpers report `public, pg_temp`; a temporary-table shadowing attempt fails to influence helper resolution; legitimate RLS/permission checks continue to work.

16.4 Current-versus-Target Repository Checks (after Agent/Build only) — legacy writer files and callers absent where deletion is required; read-only hooks remain; POS visible but inert; no operational POS network request; no false completion wording.

16.5 Data Invariance — no Stage-A row changes; no financial-row changes from the authority migration; Ledger/Balance reconciliation unchanged; Forward→Rollback→Forward tested in isolation.

Build and Typecheck alone are not Acceptance. Separate QA and a read-only Acceptance Re-Audit remain mandatory.

---

## Q. Deferred Items Register

PROMOTED (in Stage B scope):
1. Browser table DML closure on `ledger_entries` / `customer_balances`
2. Four write-policy removal
3. `create_pos_sale` browser EXECUTE revocation
4. Three-helper `public, pg_temp` demotion
5. Removal of `postLedgerForExpense`
6. Removal of `postLedgerForInvoice`
7. Removal of dead `useLedger.createEntry`
8. Removal of automatic `backfillLedgerDescriptions`
9. POS Coming Soon / inert route
10. Expense approval cutover to `post_expense_with_ledger`
11. Internal Writer EXECUTE Authority Freeze *(new — promoted)*
12. Trusted `public` Schema CREATE Guard *(new — promoted)*
13. `post_manual_ledger_adjustment` ACL Preservation *(new — promoted)*
14. Current-versus-Target Truth Correction *(new — promoted)*

DEFERRED (unchanged, none removed):
15. Internal Costs terminology and Unknown-vs-Zero
16. HR Salary atomicity / idempotency / reversal
17. HR-linked Expense deletion
18. Expense reversal
19. Supplier Payables
20. Full POS (WS-DH-2026-0005)
21. Future `create_pos_sale` activation
22. Manual Adjustment UI
23. Residual financial-table privileges
24. Full Helper body qualification
25. Duplicate Ledger SELECT policy
26. Database TEMP grant to PUBLIC
27. PUBLIC EXECUTE on the three permission helpers (evidence in §J does not promote it)
28. Platform sandbox financial privileges

No item removed. No new Roadmap, Workstream or Decision ID created.

---

## R. Zero-Regression Confirmation

ZERO REGRESSION TO PROMPTS 14–17 CONFIRMED. The eleven canonical function identities, the `_finance_invoice_approve_inline` dependency, the three-helper identity, `polroles={0}` representation, both role-aware Policy hashes, the zero-PUBLIC table-ACL finding, all eight PG17 table privileges, zero column ACLs and zero browser-role inheritance are all re-verified live this run and carried unchanged into §M/§N.

---

## S. Blockers and Gaps

None.

---

## T. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY INTERNAL-WRITER EXECUTE-AUTHORITY, TRUSTED-SCHEMA AND FINAL EXECUTION-FREEZE CORRECTION AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

Prompt-17 canonical function identities, three-helper identity, zero-PUBLIC table ACL finding, polroles and Policy hashes remain preserved.

No governance file was modified.

Stage C and Stage D have not started.

No Workstream Closure occurred.

---

## U. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This correction audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap, Phase, Workstream or Decision ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.

---

## V. Run Metadata and Exact Stopping Point

- Mode: Plan/Chat — Read-Only.
- Operation: Effective Function EXECUTE Authority Audit, Internal-Writer Invocation Closure, External-Wrapper ACL Preservation, Trusted Public-Schema CREATE Guard, Current-versus-Target Truth Correction, Final Forward/Rollback SQL Reissue, Stage B Execution Readiness Determination.
- Prompt ID: ...-STAGE-B-INTERNAL-WRITER-EXECUTE-AUTHORITY-TRUSTED-SCHEMA-AND-FINAL-EXECUTION-FREEZE-AUDIT-18. Status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
- Prompt preparation: 04-08-2026, 00:19, Asia/Riyadh (UTC+03:00).
- Run start / end / final report: Exact time not recorded. Message timestamp evidence: 2026-08-03 21:19 UTC / 2026-08-04 00:19 Asia/Riyadh.
- PostgreSQL version: 17.6. Database: `postgres`. Public schema owner: `pg_database_owner`. Database role used: `sandbox_exec`.
- Branch: `edit/edt-90d0d5dc-9c1b-4387-a753-d74e4d7aa7fd`. HEAD before and after: `685ff874dd7175d09eff11ab9b81e1792a723a88`. Working tree before and after: clean.
- Repository paths read: `src/pages/DashboardFinance.tsx`, `src/hooks/pos/usePOSCore.ts`, `src/hooks/finance/useLedger.ts`, `src/lib/finance/postLedgerForExpense.ts`, `src/lib/finance/postLedgerForInvoice.ts`, `src/lib/finance/backfillLedgerDescriptions.ts`, `src/lib/finance/postPaymentSession.ts`, `src/lib/finance/approveInvoice.ts`, `src/navigation/navConfig.ts`, `docs/aml_1_b_1/stage_j5_1/preflight/*`.
- Catalog objects read: `pg_proc`, `pg_namespace`, `pg_class`, `pg_attribute`, `pg_policy`, `pg_roles`, `pg_auth_members`; functions `aclexplode`, `acldefault`, `has_function_privilege`, `has_schema_privilege`, `to_regprocedure`.
- Financial-row queries: none executed this run.
- Effective ACL methodology: §G. Internal-writer grants: §H. External-wrapper grants: §I. Helper grants: §J. Role memberships: `authenticator` and `postgres` are members of anon/authenticated/service_role; anon and authenticated are members of nothing; `rolinherit=true` for all, `rolsuper=false` for all; `rolbypassrls` true for service_role, postgres, sandbox_exec only.
- Effective schema CREATE/USAGE matrix: §K.
- Current legacy-writer state: §L. Approved target state: §L.
- Pre-state Policy hash: `e978f912777a28108f46ba79e2ce071e`. Post-state Policy hash: `04297828f4bd33eba043f6c9274ec57b`.
- Final Forward SQL: FINAL AUTHORITY-FROZEN FORWARD MIGRATION SQL EXECUTABLE. Final Rollback SQL: FINAL AUTHORITY-FROZEN ROLLBACK SQL EXECUTABLE.
- Deferred items: 28 total — 14 promoted, 14 deferred, none removed.
- Repository changes: zero. Database changes: zero. Migration changes: zero. Financial-row changes: zero. Knowledge/Skills/settings changes: zero.
- `.lovable/plan.md` disclosure: this audit report was written to `.lovable/plan.md`, the platform-managed planning artifact governed by DEC-RM-DH-003-004. No other file was created, modified or deleted.
- Nine required verdicts: §A.
- Stage B implementation: not started. Stage C/D: not started. QA: not started. Acceptance: not started. Closure: none.

Exact stopping point:
The Prompt-17 effective EXECUTE-authority and trusted-schema gap has been withdrawn. The internal-writer invocation contract, external-wrapper execution contract, trusted public-schema premise, current-versus-target application truth, complete authority-frozen Forward Migration, complete Rollback, preserved Policy hashes and complete Deferred Items Register have been established. No implementation, privilege change, migration, financial-data change, Stage C, Stage D, QA, Acceptance or Closure has occurred.

Recommended next step: issue the Stage B Agent/Build Execution Prompt applying §M as a single migration together with the §L target application refactor.
Recommended next Mode: Agent/Build (Execution).
