# Stage B — Privilege Completeness, Column-ACL and Security-Definer Helper Safety Correction Audit

Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-PRIVILEGE-COMPLETENESS-AND-HELPER-SEARCH-PATH-CORRECTION-AUDIT-13
Mode: Plan/Chat — Read-Only. Repository changes zero. Database changes zero. This audit supersedes only the privilege sections of Prompt 12.

## A. Combined Verdicts

1. Privilege Completeness: `STAGE B SELECT-ONLY PRIVILEGE CONTRACT CLOSED`
2. Helper Safety: `PUBLIC-SCHEMA HELPER SAFETY VERIFIED`
3. Migration: `CORRECTED MIGRATION AND ROLLBACK CONTRACTS COMPLETE`
4. Stage B: `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

RM-DH-004 ACTIVE — PHASE 1. WS-DH-2026-0003 ACTIVE; Stage A accepted, persisted, verified; Stage B not started. WS-DH-2026-0005 DEFERRED.

## C. Prompt-12 Findings Preserved

The Prompt-12 application cutover contract is unchanged and remains authoritative: Expense approval routes to `post_expense_with_ledger`; `postLedgerForExpense`, `postLedgerForInvoice`, `useLedger.createEntry` and the automatic `backfillLedgerDescriptions` run are removed; POS stays visible, badged Coming Soon, disabled, non-clickable, non-keyboard-activatable, with an inert direct-URL page and no operational hook mounted. Canonical finance functions are all owned by `postgres`, SECURITY DEFINER, `SET search_path TO ''`, fully schema-qualified. Tables are owned by `postgres` with `relforcerowsecurity = false`, so definer writes bypass RLS. `ledger_entries` already has no UPDATE and no DELETE policy. The Deferred Items Register is preserved in §P.

## D. Prompt-12 Correction Findings

The ChatGPT correction is upheld on both points, and both are now resolved by evidence.

1. `arwdDxtm` on PostgreSQL 17 decodes to eight privileges, not the seven modelled in Prompt 12: the trailing `m` is `MAINTAIN`, introduced in PostgreSQL 17. Prompt 12's proposed `REVOKE INSERT, UPDATE, DELETE, TRUNCATE` would have left `REFERENCES`, `TRIGGER` and `MAINTAIN` with `anon` and `authenticated`, so its stated postcondition "Browser roles: SELECT only" was not proven by its own SQL. The corrected migration in §L revokes ALL and re-grants SELECT only.
2. The helper `search_path=public` question is answered by evidence rather than assumption: `anon`, `authenticated` and `service_role` hold only `USAGE` on schema `public` and have no `CREATE`, so object shadowing inside `search_path=public` is not achievable by a browser role. No bounded correction is required. Detail in §H and §I.

Two additional facts contradict nothing in Prompt 12 but complete it: there are zero column-level ACLs on either table, and `anon`/`authenticated`/`service_role` are members of no other role, so no inherited privilege exists.

## E. PostgreSQL Version and ACL Decoding

Server: `PostgreSQL 17.6 on aarch64-unknown-linux-gnu`. Table privileges supported by this version: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. Decoding is catalog-backed via `aclexplode(pg_class.relacl)` — 72 explicit privilege rows returned across the two tables.

| ACL letter | Privilege | Effective for anon? | Effective for authenticated? | Must remain? | Action |
|---|---|---|---|---|---|
| `r` | SELECT | Yes | Yes | Yes — read surfaces, RLS-filtered | Retain (re-grant) |
| `a` | INSERT | Yes | Yes | No | Revoke |
| `w` | UPDATE | Yes | Yes | No | Revoke |
| `d` | DELETE | Yes | Yes | No | Revoke |
| `D` | TRUNCATE | Yes | Yes | No | Revoke |
| `x` | REFERENCES | Yes | Yes | No | Revoke (missed by Prompt 12) |
| `t` | TRIGGER | Yes | Yes | No | Revoke (missed by Prompt 12) |
| `m` | MAINTAIN (PG17: VACUUM/ANALYZE/REINDEX/CLUSTER/REFRESH) | Yes | Yes | No | Revoke (missed by Prompt 12) |

## F. Effective Table Privilege Matrix

Both tables are identical. `aclexplode` rows confirmed for each role; membership query `pg_auth_members` returned zero rows for `anon`, `authenticated`, `service_role`, so nothing is inherited; `relacl` contains no PUBLIC (`=`) entry, so PUBLIC contributes nothing; the owner is `postgres`.

| Table | Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER | MAINTAIN | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| ledger_entries | anon | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| ledger_entries | authenticated | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| ledger_entries | service_role | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| ledger_entries | postgres (owner) | Y | Y | Y | Y | Y | Y | Y | Y | ownership + explicit |
| ledger_entries | PUBLIC | N | N | N | N | N | N | N | N | no ACL entry |
| ledger_entries | inherited roles of anon / authenticated | — | — | — | — | — | — | — | — | none exist |
| customer_balances | anon | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| customer_balances | authenticated | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| customer_balances | service_role | Y | Y | Y | Y | Y | Y | Y | Y | explicit grant by postgres |
| customer_balances | postgres (owner) | Y | Y | Y | Y | Y | Y | Y | Y | ownership + explicit |
| customer_balances | PUBLIC | N | N | N | N | N | N | N | N | no ACL entry |

Default privileges contribute nothing: every present grant is explicit, granted by `postgres`. (The `sandbox_exec*` rows are platform-managed audit roles holding SELECT/INSERT only and are out of the browser-role contract.)

## G. Column-Level ACL Matrix

Query over every non-dropped column of both tables where `pg_attribute.attacl IS NOT NULL` returned **0 rows**.

`No column-level browser grant exists.`

Consequently `REVOKE ALL ON TABLE` fully clears browser write authority — there is no independently granted column privilege to survive it. The §L postconditions still assert the column state explicitly rather than relying on this inference.

## H. Public-Schema Privilege Matrix

Schema `public` is owned by `pg_database_owner`; `nspacl` = `{pg_database_owner=UC, =U, postgres=U, anon=U, authenticated=U, service_role=U, sandbox_exec*=U}`.

| Role | USAGE | CREATE | Source | Security implication |
|---|---|---|---|---|
| anon | Yes | **No** | explicit `U` grant | cannot create shadowing objects |
| authenticated | Yes | **No** | explicit `U` grant | cannot create shadowing objects |
| service_role | Yes | **No** | explicit `U` grant | cannot create shadowing objects |
| postgres | Yes | Yes | superuser | trusted |
| PUBLIC | Yes | No | `=U` entry | read-through only |
| pg_database_owner | Yes | Yes | ownership | trusted |

Verified additionally with `has_schema_privilege`: `create = f` for `anon`, `authenticated`, `service_role`; `t` for `postgres` only.

## I. Helper Search-Path Safety Matrix

All three helpers are SECURITY DEFINER, STABLE, owned by `postgres`, with `SET search_path TO 'public'`. Because the setting names only `public` and omits `pg_temp`, temp-schema shadowing is impossible, and because no browser role holds CREATE on `public`, permanent shadowing is impossible.

| Helper | Referenced object | Schema-qualified? | Resolved schema | Shadowing risk | Correction |
|---|---|---|---|---|---|
| `has_permission(uuid,uuid,text)` | `tenant_members` | No | public | None — no CREATE for browser roles, `pg_temp` not in path | None |
| `has_permission` | `member_permissions` | No | public | None | None |
| `has_permission` | `tenant_role_permissions` | No | public | None | None |
| `has_permission` | `tenant_role_bundles`, `bundle_permissions` | No | public | None | None |
| `has_permission` | `member_permission_bundles`, `bundle_permissions` | No | public | None | None |
| `has_permission` | `=`, `text` cast, `EXISTS` | built-in, `pg_catalog` always searched first implicitly | pg_catalog | None — operators resolve from `pg_catalog`, which cannot be preceded | None |
| `is_active_tenant_member(uuid,uuid)` | `public.tenant_members` | **Yes** | public | None | None |
| `is_tenant_member(uuid,uuid)` | `public.tenant_members` | **Yes** | public | None | None |

Verdict: `PUBLIC-SCHEMA HELPER SAFETY VERIFIED`. The unqualified references inside `has_permission` are a hygiene item, not a vulnerability; hardening them to `SET search_path TO ''` with schema qualification is deliberately **excluded** from Stage B because it would rewrite a function that every RLS policy in the database depends on, for zero proven risk reduction. Recorded as a tracked deferred hygiene item in §P.

## J. Effective Function EXECUTE Matrix

Derived from `pg_proc.proacl` with `aclexplode`. In PostgreSQL, a function whose `proacl` is non-null carries only the listed grants; PUBLIC appears as the `-`/empty grantee. No role membership exists, so no EXECUTE is inherited.

| Function | PUBLIC | anon | authenticated | service_role | Intended | Correction |
|---|---|---|---|---|---|---|
| `post_expense_with_ledger(uuid,uuid,uuid)` | No | No | Yes | Yes | as-is | None |
| `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | No | No | Yes | Yes | as-is | None |
| `post_payment_session(uuid,uuid,jsonb)` | No | No | Yes | Yes | as-is | None |
| `approve_invoice(uuid,uuid,uuid)` | No | No | Yes | Yes | as-is | None |
| `post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | No | No | Yes | Yes | as-is (no UI, per D-B-1) | None |
| `create_source_checkout_invoice(uuid,uuid,jsonb)` | No | No | Yes | Yes | as-is | None |
| `create_pos_sale(uuid,uuid,jsonb)` | No | **Yes** | **Yes** | Yes | service_role + owner only | Revoke from anon, authenticated, and defensively PUBLIC |
| `_finance_ledger_insert(...)` | No | No | No | Yes | internal only | None |
| `has_permission(uuid,uuid,text)` | **Yes** | Yes | Yes | Yes | required by RLS evaluation | None |
| `is_tenant_member(uuid,uuid)` | **Yes** | Yes | Yes | Yes | required by RLS evaluation | None |
| `is_active_tenant_member(uuid,uuid)` | **Yes** | Yes | Yes | Yes | required by RPC guards | None |

Answer to the specific question: revoking `create_pos_sale` from `anon` and `authenticated` **is** sufficient, because its `proacl` carries no PUBLIC entry and no role inherits EXECUTE. The corrected migration adds `FROM PUBLIC` anyway so the postcondition holds unconditionally.

## K. Final Privilege Strategy

Single strategy: **revoke ALL table privileges from `anon` and `authenticated` on both tables, then re-grant `SELECT` only, and drop the browser-write RLS policies.** This is deterministic across all eight PG17 privileges plus any future privilege letter, and it is provably complete because there are no column-level grants, no role memberships and no PUBLIC entry to leave behind. `service_role`, the table owner and every canonical SECURITY DEFINER RPC are untouched; read policies, read surfaces and Realtime remain functional because `SELECT` is re-granted and the SELECT policies are retained.

## L. Corrected Exact Migration SQL

Proposed filename: `supabase/migrations/<timestamp>_stage_b_financial_write_authority.sql`. Runs inside the migration's implicit transaction; every assertion aborts the whole migration on failure. Zero DML against financial tables.

```sql
-- Stage B — canonical financial write authority.
-- Ledger and Customer Balance truth is writable only through SECURITY DEFINER
-- finance RPCs owned by postgres. Browser roles retain SELECT only.

DO $$
BEGIN
  -- Precondition: ownership and RLS state
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
       AND pg_get_userbyid(c.relowner) = 'postgres'
       AND c.relrowsecurity AND NOT c.relforcerowsecurity
    HAVING count(*) = 2
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_OWNERSHIP_OR_RLS_UNEXPECTED';
  END IF;

  -- Precondition: browser roles currently hold write privileges (pre-state is the audited one)
  IF NOT (
    has_table_privilege('authenticated','public.ledger_entries','INSERT')
    AND has_table_privilege('anon','public.ledger_entries','INSERT')
    AND has_table_privilege('authenticated','public.customer_balances','UPDATE')
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_GRANTS_UNEXPECTED';
  END IF;

  -- Precondition: no column-level ACL exists on either table
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_COLUMN_ACL_PRESENT';
  END IF;

  -- Precondition: expected write policies exist
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.ledger_entries'::regclass
                   AND polname = 'Permission-based insert ledger entries') THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_LEDGER_INSERT_POLICY_MISSING';
  END IF;
  IF (SELECT count(*) FROM pg_policy WHERE polrelid = 'public.customer_balances'::regclass
        AND polname IN ('Permission-based insert customer balances',
                        'Permission-based update customer balances',
                        'Permission-based delete customer balances')) <> 3 THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_BALANCE_WRITE_POLICIES_UNEXPECTED';
  END IF;

  -- Precondition: canonical RPCs are SECURITY DEFINER and owned by postgres
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('_finance_ledger_insert','post_expense_with_ledger','post_payment',
                         'post_payment_session','approve_invoice','post_manual_ledger_adjustment',
                         'create_source_checkout_invoice','create_pos_sale')
       AND (NOT p.prosecdef OR pg_get_userbyid(p.proowner) <> 'postgres')
  ) THEN
    RAISE EXCEPTION 'STAGE_B_PRECOND_RPC_SECURITY_UNEXPECTED';
  END IF;
END
$$;

-- 1. Complete privilege revocation for browser roles
REVOKE ALL PRIVILEGES ON TABLE public.ledger_entries    FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.customer_balances FROM anon, authenticated, PUBLIC;

-- 2. Re-grant the only required browser privilege
GRANT SELECT ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT ON TABLE public.customer_balances TO anon, authenticated;

-- 3. Remove browser-write RLS policies (no RPC depends on them: definer functions
--    run as the table owner and RLS is not forced)
DROP POLICY IF EXISTS "Permission-based insert ledger entries"    ON public.ledger_entries;
DROP POLICY IF EXISTS "Permission-based insert customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based update customer balances" ON public.customer_balances;
DROP POLICY IF EXISTS "Permission-based delete customer balances" ON public.customer_balances;

-- 4. POS remains deferred (WS-DH-2026-0005): no browser role may invoke it
REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) FROM anon, authenticated, PUBLIC;

-- 5. Documented contract
COMMENT ON TABLE public.ledger_entries IS
  'Financial truth. Writes only via SECURITY DEFINER finance RPCs (_finance_ledger_insert and its callers). Browser roles: SELECT only.';
COMMENT ON TABLE public.customer_balances IS
  'Derived client balances. Writes only via SECURITY DEFINER finance RPCs. Browser roles: SELECT only.';

DO $$
DECLARE
  r text; t text; p text;
BEGIN
  -- Postcondition: browser roles hold SELECT and nothing else
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

  -- Postcondition: still no column-level grant
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_COLUMN_ACL_PRESENT';
  END IF;

  -- Postcondition: service_role retains full access
  FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT has_table_privilege('service_role', t, p) THEN
        RAISE EXCEPTION 'STAGE_B_POST_SERVICE_ROLE_DEGRADED: % %', t, p;
      END IF;
    END LOOP;
  END LOOP;

  -- Postcondition: canonical RPCs remain executable by authenticated
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

  -- Postcondition: POS RPC is not executable by browser roles
  IF has_function_privilege('anon','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'STAGE_B_POST_POS_RPC_STILL_EXECUTABLE';
  END IF;

  -- Postcondition: no write policy remains, read policies remain
  IF EXISTS (
    SELECT 1 FROM pg_policy
     WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
       AND polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'STAGE_B_POST_WRITE_POLICY_REMAINS';
  END IF;
  IF (SELECT count(*) FROM pg_policy
       WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)
         AND polcmd = 'r') < 3 THEN
    RAISE EXCEPTION 'STAGE_B_POST_READ_POLICY_MISSING';
  END IF;
END
$$;
```

No financial row is read for modification and no `INSERT`/`UPDATE`/`DELETE` statement against any financial table appears in this migration, so the zero-row-change postcondition holds by construction.

## M. Corrected Exact Rollback SQL

**Emergency use only. This rollback intentionally restores the prior unsafe state in which browser roles can write Ledger and Customer Balance truth directly. It must not be run except to recover from a Stage B production incident.**

```sql
-- EMERGENCY ROLLBACK — restores the pre-Stage-B unsafe browser-write state.

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances TO anon, authenticated;

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

GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) TO anon, authenticated;

COMMENT ON TABLE public.ledger_entries IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;

DO $$
DECLARE r text; t text; p text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH t IN ARRAY ARRAY['public.ledger_entries','public.customer_balances'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF NOT has_table_privilege(r, t, p) THEN
          RAISE EXCEPTION 'ROLLBACK_INCOMPLETE_PRIVILEGE: % % %', r, t, p;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM pg_policy
       WHERE polrelid IN ('public.ledger_entries'::regclass,'public.customer_balances'::regclass)) <> 8 THEN
    RAISE EXCEPTION 'ROLLBACK_POLICY_COUNT_UNEXPECTED';
  END IF;
  IF NOT has_function_privilege('authenticated','public.create_pos_sale(uuid,uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'ROLLBACK_POS_EXECUTE_NOT_RESTORED';
  END IF;
END
$$;
```

No helper function is altered by the forward migration, so no helper configuration needs restoring. Repository rollback remains "revert the single Stage B application commit".

## N. Application Contract Confirmation

The Stage B application scope is unchanged: Expense approval calls `post_expense_with_ledger`; `postLedgerForExpense` deleted; `postLedgerForInvoice` deleted; dead `useLedger.createEntry` removed; automatic `backfillLedgerDescriptions` removed; POS visible in Navigation and Sidebar, badged Coming Soon, disabled and non-clickable, direct URL inert, no operational POS hook mounted, no POS RPC activated. The corrected privilege contract introduces **no** application change: `SELECT` is preserved for every read surface (`useLedgerEntries`, `useCustomerBalances`, `useLedgerBalance`/`useLedgerBalances` via `v_customer_ledger_balances`, statements, PDF summaries, Realtime), and no application code depends on `REFERENCES`, `TRIGGER` or `MAINTAIN`.

## O. QA Additions Required by the Correction

Added to the Prompt-12 QA contract: assert `has_table_privilege` is false for `anon` and `authenticated` across INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN on both tables, and true for SELECT; assert zero rows in `pg_attribute` with a non-null `attacl` for both tables; assert `has_function_privilege` is false for `anon`, `authenticated` and PUBLIC on `create_pos_sale`; assert `service_role` retains SELECT/INSERT/UPDATE/DELETE; assert an authenticated read of ledger and balances still returns the tenant-scoped rows through the retained SELECT policies; assert Realtime subscription on `customer_balances` still delivers events.

## P. Deferred Items Register

Promoted into Stage B (unchanged from Prompt 12, plus the privilege item now stated in its corrected form): Expense browser-writer removal and cutover; dead Ledger mutation removal; POS safety fencing; Ledger/Customer Balance privilege hardening (now REVOKE ALL + GRANT SELECT, covering REFERENCES/TRIGGER/MAINTAIN); `create_pos_sale` browser EXECUTE revocation; `backfillLedgerDescriptions` removal.

| Item | Original evidence | Status | Current lane | Proposed future lane | Dependency | Owner decision needed? | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|---|
| Expense browser writer cutover | `DashboardFinance.tsx` → `postLedgerForExpense` | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | `post_expense_with_ledger` | No | NULL Economic Dates persist | Stage B |
| Dead Ledger mutation removal | `useLedger.createEntry` unreferenced | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | none | No | Latent unsafe writer | Stage B |
| POS safety fencing | POS route and nav active | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | none | No | Operational POS writes | Stage B |
| Ledger / Customer Balance privilege hardening | full `arwdDxtm` to anon and authenticated | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | none | No | Direct PostgREST financial writes | Stage B |
| `create_pos_sale` browser EXECUTE revocation | anon + authenticated EXECUTE present | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | none | No | Anonymous POS sale invocation | Stage B |
| `backfillLedgerDescriptions` removal | auto-run already RLS-rejected | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | future enrichment lane | none | No | Silent broken auto-run | Stage B |
| Internal Cost terminology correction | Prompt 11 §G | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Wrong cross-account terminology | After Stage B |
| Internal Cost Unknown vs Real Zero | 5/5 non-income rows `actual_cost = 0` | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Missing cost reported as zero | After Stage B |
| Internal Cost contextual terminology by account type | stable wording on non-stable accounts | DEFERRED — TRACKED | none | RM-DH-002 | D-B-6 | Yes | Wrong labels per tenant type | Later |
| HR Salary-to-Expense atomicity | `useSalaryPayments.ts` client double insert | DEFERRED — TRACKED | none | HR/Finance lane | `record_salary_payment` | Yes | Orphan rows | After Stage B |
| HR Salary idempotency | no client key | DEFERRED — TRACKED | none | HR/Finance lane | same | Yes | Duplicate payroll | After Stage B |
| HR Salary reversal | none exists | DEFERRED — TRACKED | none | HR/Finance lane | design | Yes | Uncorrectable payroll | After Stage B |
| Generic Expense deletion of HR-linked records | `useExpenses` delete, no guard | DEFERRED — TRACKED | none | HR/Finance lane | same | Yes | Dangling `finance_expense_id` | After Stage B |
| Expense unpost / reversal | no RPC | DEFERRED — TRACKED | none | RM-DH-004 later phase | Stage B | Yes | Posted expenses uncorrectable | After Stage B |
| Supplier Payable payment / Expense / Ledger lifecycle | no path found | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Provider costs never reach finance | Later |
| Supplier Payable-to-Expense authority | undefined | DEFERRED — TRACKED | none | RM-DH-002 | D-B-7 | Yes | Ambiguous cost authority | Later |
| Full POS implementation | POS source retained | DEFERRED — TRACKED | WS-DH-2026-0005 | same | Stage B fencing | No | — | Owner activation |
| Future `create_pos_sale` activation | RPC retained, browser EXECUTE revoked | DEFERRED — TRACKED | WS-DH-2026-0005 | same | Stage B | No | — | Owner activation |
| Manual Ledger Adjustment product workflow | RPC exists, no UI | DEFERRED — TRACKED | none | future finance lane | D-B-1 forbids UI now | No | — | Owner request |
| Residual financial-table hardening | broad grants on `expenses`, `financial_entries`, `hr_salary_payments`, `supplier_payables`, `invoices`, `invoice_items`, `billing_links` | DEFERRED — TRACKED | none | security hardening lane | none | Yes | Over-broad grants persist | After Stage B |
| `has_permission` unqualified object references hygiene | §I — unqualified `tenant_members` etc. under `search_path=public` | DEFERRED — TRACKED | none | security hardening lane | none | Yes | None today; would matter only if CREATE on `public` were ever granted | If a browser role is ever granted CREATE on `public` |

No item beyond the Prompt-12 promotions was promoted. The `has_permission` hygiene item is newly recorded by this audit as DEFERRED — TRACKED, not promoted.

## Q. Blockers and Gaps

None.

## R. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE:
NONE — READ-ONLY PRIVILEGE-COMPLETENESS AND HELPER-SAFETY CORRECTION AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

The Prompt-12 application, POS and deferred-item contracts remain preserved.

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
2. Operation: targeted Stage B privilege completeness, column-level ACL, effective function-execute, public-schema safety, and final migration/rollback correction audit.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-PRIVILEGE-COMPLETENESS-AND-HELPER-SEARCH-PATH-CORRECTION-AUDIT-13.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026.
6. Prompt Preparation Time: 22:03.
7. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
8. Run Start: 03-08-2026 22:05 Asia/Riyadh.
9. First evidenced activity: `select version()` plus `aclexplode` over `pg_class.relacl`.
10. Run End: Exact time not recorded.
11. Last evidenced activity: reading the three permission-helper bodies via `pg_get_functiondef`.
12. Final Report: Exact time not recorded.
13. Timestamp evidence source: platform message clock (prompt receipt time).
14. PostgreSQL server version: 17.6 (aarch64-unknown-linux-gnu, GCC 13.2.0, 64-bit).
15. Branch: `edit/edt-11c853dc-c35b-46cf-ae79-a276c0999232`.
16. Canonical/default branch evidence: Exact evidence not recorded.
17. HEAD before and after: `014276978` / `014276978`.
18. Working tree before and after: clean apart from `.lovable/plan.md`.
19. Repository paths read this run: `src/lib/finance/postLedgerForExpense.ts`, `src/hooks/finance/useLedgerBalance.ts`, `customer_balances.schema.txt`, `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv`, `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/01_fn_post_payment.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt`.
20. Database objects read: 2 target tables plus `expenses`, schema `public`, 3 permission helpers, 8 finance functions, `pg_auth_members`, `pg_attribute`.
21. Catalog queries: 2 exec calls, 7 statements.
22. Financial-row queries: 0.
23. Database role: `sandbox_exec`.
24. ACL privileges decoded: 8 (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) — 72 `aclexplode` rows.
25. Effective grants: `anon`, `authenticated`, `service_role`, `postgres` each hold all 8 on both tables; PUBLIC holds none.
26. Column-level grants: none (0 rows with non-null `attacl`).
27. Role memberships: none for `anon`, `authenticated`, `service_role`.
28. Public-schema grants: USAGE for `anon`, `authenticated`, `service_role`, PUBLIC; CREATE only for `pg_database_owner` and `postgres`.
29. Helper bodies reviewed: `has_permission`, `is_tenant_member`, `is_active_tenant_member`.
30. Effective function EXECUTE grants: recorded in §J; only `create_pos_sale` deviates from intent.
31. Final migration contract result: complete (§L).
32. Final rollback contract result: complete (§M).
33. Deferred items preserved: 22 register rows, 6 promoted, 16 deferred.
34. Repository changes: zero.
35. Database changes: zero.
36. Migration changes: zero.
37. Knowledge / Skills / settings changes: zero.
38. `.lovable/plan.md` disclosure: written by Plan Mode this run to hold this report; it is the only file touched. The reported asynchronous build failure was a temporary environment-preparation issue with no repository cause and no code change was made in response, as this is a read-only run.
39. Four verdicts: as in §A.
40. Stage B implementation: not started.
41. Stage C: not started.
42. Stage D: not started.
43. Closure: none.
44. Exact stopping point: the complete browser SELECT-only privilege contract, effective function execution contract, public-schema helper safety, corrected migration and rollback SQL, preserved Stage B application contract and complete Deferred Items Register have been established. No implementation, migration, financial-data change, Stage C, Stage D or Closure has occurred.
45. Recommended next step: issue the Stage B Agent/Build execution prompt combining the Prompt-12 application cutover with the corrected single migration in §L.
46. Recommended next Mode: Agent/Build.

This audit applied Skill dayli-05-rls-policy-safety.
