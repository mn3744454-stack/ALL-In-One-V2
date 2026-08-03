# STAGE B — CANONICAL FINANCE FUNCTION IDENTITY, THREE-HELPER PRESERVATION, AND FINAL ZERO-REGRESSION MIGRATION CORRECTION AUDIT

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-CANONICAL-FUNCTION-IDENTITY-THREE-HELPER-AND-FINAL-ZERO-REGRESSION-CORRECTION-AUDIT-17
Mode: Plan/Chat — Read-Only. Repository changes: zero. Database changes: zero.

## A. Combined Verdicts

1. Correction Acknowledgement — `PROMPT-16 FUNCTION-SET AND HELPER REGRESSION WITHDRAWN`
2. Canonical Functions — `CANONICAL FINANCE FUNCTION IDENTITY CONTRACT CLOSED`
3. Dependencies — `ADDITIONAL FINANCE DEPENDENCY SET CLOSED`
4. Three Helpers — `THREE-HELPER SEARCH-PATH CONTRACT CLOSED`
5. PUBLIC Table ACL — `PUBLIC TABLE-ACL PRECONDITION CONTRACT CLOSED`
6. Forward Migration — `FINAL CORRECTED FORWARD MIGRATION SQL EXECUTABLE`
7. Rollback — `FINAL CORRECTED ROLLBACK SQL EXECUTABLE`
8. Zero Regression — `ZERO REGRESSION TO PROMPTS 14–16 CONFIRMED`
9. Stage B — `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

- RM-DH-004 — ACTIVE — PHASE 1 (Economic Date Integrity).
- WS-DH-2026-0003 — ACTIVE — STAGE A ACCEPTED, PERSISTED AND VERIFIED; STAGE B NOT STARTED.
- WS-DH-2026-0005 — POS Financial Isolation — DEFERRED.
- No Roadmap, Phase, Workstream or Decision ID created or advanced.

## C. Lovable Correction Acknowledgement

`LOVABLE CORRECTION ACKNOWLEDGEMENT:
The Prompt-16 canonical-function substitution and two-helper-only
migration contract are withdrawn.

The original Prompt-14/15 exact eleven-function contract and the
three-helper public,pg_temp correction contract are restored.

Prompt-16 polroles, PUBLIC representation and role-aware fingerprint
findings remain authoritative and are not reopened.`

Protocol points:

1. **Incorrect Prompt-16 claims identified.** Prompt 16 returned `ZERO REGRESSION TO PRESERVED FINDINGS CONFIRMED` and `FINAL FORWARD MIGRATION SQL EXECUTABLE` while its exact-function precondition list substituted a different set, and its ALTER/postcondition blocks covered only two helpers.
2. **Preserved set that was regressed.** The Prompt-14/15 eleven-function contract, and the three-helper `search_path = public, pg_temp` contract including `is_active_tenant_member(uuid,uuid)`.
3. **Technical error.** Four accepted functions (`_finance_ledger_insert`, `approve_invoice`, `post_manual_ledger_adjustment`, `is_active_tenant_member`) were omitted, and four unrelated or dependency functions were substituted in their place. `is_active_tenant_member` was also dropped from the helper ALTER and postcondition blocks.
4. **Impact.** The Prompt-16 migration could pass without proving the canonical internal Ledger writer, invoice approval, and manual Ledger adjustment remained present and safe, and would have left the third accepted helper on the unsafe `search_path=public`, retaining `pg_temp` shadow exposure in a SECURITY DEFINER function that every RLS policy depends on.
5. **Replacement contract.** The eleven accepted signatures are restored in full; proven nested dependencies are added, never substituted; horse-identity functions are removed from the Finance contract; all three helpers are altered and verified.
6. **Withdrawal.** Issued verbatim above.

## D. Evidence Boundary

**OFFICIAL POSTGRESQL DOCUMENTATION FACT**
- `regprocedure` / `to_regprocedure` identify a function by name plus exact argument vector; `proname` alone is ambiguous under overloading (docs/17 datatype-oid, functions-info).
- `pg_proc` exposes `oid`, `proowner`, `prosecdef`, `proconfig`, `proacl`, `prolang` (docs/17 catalog-pg-proc).
- A SECURITY DEFINER function executes with the owner's privileges; a controlled `search_path` is the documented safety requirement (docs/17 sql-createfunction).

**LIVE DATABASE FACT** (read as `supabase_read_only_user`; two catalog queries this run; zero financial-row queries)
- All eleven accepted signatures resolve through `to_regprocedure`. All are owned by `postgres`. All are `prosecdef = true`.
- All four Prompt-16 additions also exist and are `prosecdef = true`, owned by `postgres`.
- The eight canonical Finance functions carry `search_path=""`; the three permission helpers carry `search_path=public`.
- `is_tenant_member(uuid,uuid)` is `LANGUAGE sql`; all other audited functions are `LANGUAGE plpgsql`.
- All three helpers currently carry an explicit **PUBLIC (`grantee = 0`) EXECUTE grant** in `proacl`, alongside `postgres`, `anon`, `authenticated`, `service_role` and the two platform sandbox roles. No canonical Finance function has a PUBLIC EXECUTE grant.
- `public.ledger_entries` and `public.customer_balances` each have **zero** PUBLIC table grants (`aclexplode` rows with `grantee = 0`: 0).
- Prompt-16 policy findings re-confirmed as still standing: 7 policies, `polroles = {0}` each, pre-state hash `e978f912777a28108f46ba79e2ce071e`, post-state hash `04297828f4bd33eba043f6c9274ec57b`.

**REPOSITORY FACT**
- `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt` confirms `_finance_ledger_insert` is the sole internal writer to `public.ledger_entries` and `public.customer_balances`, `SECURITY DEFINER`, owner `postgres`, `search_path=""`.
- `docs/aml_1_b_1/stage_j5_1/preflight/01_fn_post_payment.txt` confirms `post_payment` delegates ledger persistence to `_finance_ledger_insert` and gates on `is_active_tenant_member` + `has_permission`.
- `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt` lists the canonical Finance function inventory including `approve_invoice`, `post_manual_ledger_adjustment` and `_finance_ledger_insert`.
- `src/lib/finance/postLedgerForExpense.ts` still performs a direct browser `insert` into `ledger_entries` — the Stage B removal target, unchanged by this audit.

**PRESERVED PRIOR FINDING** — §5 items 1–22, all intact (see §E).

**LOVABLE PRIOR CLAIM** — the Prompt-16 substituted function set, two-helper ALTER, zero-regression verdict and Stage B readiness verdict. All four withdrawn.

**CHATGPT CORRECTION INFERENCE** — that the omission of `_finance_ledger_insert`, `approve_invoice`, `post_manual_ledger_adjustment` and `is_active_tenant_member` invalidates the Prompt-16 readiness verdict. Confirmed as correct by live evidence.

**GAP** — none blocking. Two non-blocking observations carried forward from Prompt 16: platform `sandbox_exec*` roles hold SELECT+INSERT on both tables (out of authorized scope, untouched), and `relforcerowsecurity = false` on both tables (out of scope, untouched). One new non-blocking observation: the three helpers carry a PUBLIC EXECUTE grant; `ALTER FUNCTION ... SET search_path` does not modify `proacl`, so this is unaffected in both directions and is not promoted into scope.

## E. PRESERVED AND STILL AUTHORITATIVE

| # | Preserved finding | Unchanged? |
|---|---|---|
| 1 | Stage A execution, Acceptance, Persistence, Verification | Yes — no DML, no financial-row query |
| 2 | Expense Economic Date = `expense_date` | Yes |
| 3 | Expense approval target = `post_expense_with_ledger` | Yes — live signature confirmed |
| 4 | Removal of `postLedgerForExpense` | Yes — still present in repo, remains a Stage B target |
| 5 | Removal of `postLedgerForInvoice` | Yes |
| 6 | Removal of dead `useLedger.createEntry` | Yes |
| 7 | Removal of automatic `backfillLedgerDescriptions` | Yes |
| 8 | POS visible with Coming Soon | Yes |
| 9 | POS disabled, non-clickable, non-keyboard-activatable | Yes |
| 10 | POS direct route inert | Yes |
| 11 | No operational POS hooks or writers | Yes |
| 12 | `REVOKE ALL → GRANT SELECT` | Yes |
| 13 | All eight PostgreSQL 17 table privileges | Yes |
| 14 | Zero Column ACLs | Yes |
| 15 | Zero browser-role inheritance | Yes |
| 16 | Helper strategy `public, pg_temp` | Yes — now correctly applied to all three |
| 17 | Robust text-element `proconfig` assertion | Yes |
| 18 | Seven live RLS policies | Yes |
| 19 | `polroles = {0}` for all seven | Yes |
| 20 | Pre-state hash `e978f912777a28108f46ba79e2ce071e` | Yes |
| 21 | Post-state hash `04297828f4bd33eba043f6c9274ec57b` | Yes |
| 22 | Complete Deferred Items Register | Yes — reproduced in §P |

## F. REJECTED OR SUPERSEDED FINDINGS

1. The Prompt-16 substituted exact-function set — rejected; replaced by the accepted eleven plus one proven dependency.
2. The Prompt-16 two-helper-only ALTER/postcondition — rejected; replaced by a three-helper contract.
3. The Prompt-16 zero-regression verdict — rejected; reissued here after correction.
4. The Prompt-16 Stage B readiness verdict — rejected; reissued here after correction.
5. Any Forward/Rollback SQL depending on those incomplete preconditions — superseded by §L and §M.

The Prompt-16 `polroles` correction is **not** reopened.

## G. Accepted Eleven-Function Identity Matrix

| # | Exact signature | Exists | OID | Owner | SECDEF | proconfig | EXECUTE grants | Direct dependencies (from `prosrc`) | Safe after table-DML revocation? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)` | Yes | 157845 | postgres | Yes | `search_path=""` | postgres, service_role, sandbox_exec_vhx…, sandbox_exec | none (leaf writer) | **Yes** — SECURITY DEFINER runs as `postgres`, which retains all eight privileges |
| 2 | `public.post_expense_with_ledger(uuid,uuid,uuid)` | Yes | 157951 | postgres | Yes | `search_path=""` | postgres, authenticated, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_ledger_insert` | Yes |
| 3 | `public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | Yes | 157946 | postgres | Yes | `search_path=""` | postgres, authenticated, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_ledger_insert`, `_finance_billing_link_upsert` | Yes |
| 4 | `public.post_payment_session(uuid,uuid,jsonb)` | Yes | 161749 | postgres | Yes | `search_path=""` | postgres, authenticated, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_ledger_insert` | Yes |
| 5 | `public.approve_invoice(uuid,uuid,uuid)` | Yes | 157859 | postgres | Yes | `search_path=""` | postgres, authenticated, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_invoice_approve_inline` | Yes |
| 6 | `public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | Yes | 157953 | postgres | Yes | `search_path=""` | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_ledger_insert` | Yes |
| 7 | `public.create_source_checkout_invoice(uuid,uuid,jsonb)` | Yes | 159316 | postgres | Yes | `search_path=""` | postgres, authenticated, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `approve_invoice`, `_finance_billing_link_upsert` | Yes |
| 8 | `public.create_pos_sale(uuid,uuid,jsonb)` | Yes | 159321 | postgres | Yes | `search_path=""` | postgres, **anon**, **authenticated**, service_role, sandbox ×2 | `is_active_tenant_member`, `has_permission`, `_finance_idempotency_begin`, `_finance_invoice_approve_inline`, `_finance_invoice_compute_totals` | Yes — but browser EXECUTE is revoked by this migration (deferred POS) |
| 9 | `public.has_permission(uuid,uuid,text)` | Yes | 47231 | postgres | Yes | **`search_path=public`** | PUBLIC, postgres, anon, authenticated, service_role, sandbox ×2 | `is_active_tenant_member` | Yes — read-only helper |
| 10 | `public.is_tenant_member(uuid,uuid)` | Yes | 17622 | postgres | Yes (LANGUAGE sql) | **`search_path=public`** | PUBLIC, postgres, anon, authenticated, service_role, sandbox ×2 | none | Yes — read-only helper |
| 11 | `public.is_active_tenant_member(uuid,uuid)` | Yes | 66253 | postgres | Yes | **`search_path=public`** | PUBLIC, postgres, anon, authenticated, service_role, sandbox ×2 | none | Yes — read-only helper |

No accepted function is absent. No blocking condition triggered.

The "safe after table-DML revocation" column rests on a single live fact: every writer above is SECURITY DEFINER owned by `postgres`, and `postgres` retains all eight table privileges after the Forward Migration, which only revokes from `anon`, `authenticated` and `PUBLIC`.

## H. Additional Dependency Matrix

| Function | Finance dependency? | Called by which accepted function? | Execution-critical? | Include in final migration preconditions? | Reason |
|---|---|---|---|---|---|
| `public._finance_invoice_approve_inline(uuid,uuid,uuid)` | **Yes — proven** | `approve_invoice` (accepted #5), `create_pos_sale` (accepted #8); nested via `create_source_checkout_invoice` → `approve_invoice` | Yes — it writes to `ledger_entries` / `customer_balances` (`prosrc` references both) | **Include** | Direct nested Finance dependency of two accepted functions and a writer to both hardened tables |
| `public.get_payment_session(uuid,uuid)` | **No — not proven** | Called by no accepted function; it calls only `is_active_tenant_member` and `has_permission` | No — read-only session projection, no write to either hardened table | **Exclude** | No direct or nested Finance-writer dependency proven; §8 rule requires proof, not plausibility |
| `public.update_horse_identity(uuid,uuid,jsonb)` | No | None | No | **Exclude** | Horse-identity domain; `proconfig` reference example only, per §3.5 |
| `public.complete_local_horse_record(uuid,uuid,jsonb)` | No | None | No | **Exclude** | Horse-identity domain; `proconfig` reference example only, per §3.5 |

**Dependency-set recommendation (exactly one):** the final migration precondition list is the **accepted eleven plus `public._finance_invoice_approve_inline(uuid,uuid,uuid)` — twelve exact signatures**. `get_payment_session`, `update_horse_identity` and `complete_local_horse_record` are excluded. No accepted function is replaced.

## I. Three-Helper Matrix

| Helper | Current search_path | Body qualification | Temp-shadow exposure | Required Stage B action | Final expected value |
|---|---|---|---|---|---|
| `public.has_permission(uuid,uuid,text)` | `search_path=public` | Body references `public` objects without full schema qualification (full qualification deferred) | **Exposed** — `pg_temp` is implicitly searched first when not named explicitly, and TEMP is effectively granted to PUBLIC on this database | `ALTER FUNCTION ... SET search_path = public, pg_temp` | `search_path=public, pg_temp` |
| `public.is_tenant_member(uuid,uuid)` | `search_path=public` | LANGUAGE sql; same unqualified pattern | **Exposed** — same mechanism | `ALTER FUNCTION ... SET search_path = public, pg_temp` | `search_path=public, pg_temp` |
| `public.is_active_tenant_member(uuid,uuid)` | `search_path=public` | Same unqualified pattern | **Exposed** — same mechanism; this is the helper Prompt 16 omitted | `ALTER FUNCTION ... SET search_path = public, pg_temp` | `search_path=public, pg_temp` |

Naming `pg_temp` explicitly and last demotes the temporary schema to the end of resolution order, closing the shadowing path without touching any function body. No helper-body rewrite is authorized. The Forward Migration contains three ALTER statements and verifies three; the Rollback restores three and verifies three.

## J. PUBLIC Table-ACL Precondition

| Table | Current PUBLIC grants | Exact precondition | Rollback implication |
|---|---|---|---|
| `public.ledger_entries` | **Zero** (`aclexplode(relacl)` rows with `grantee = 0`: 0) | Assert the count is 0 before `REVOKE ALL … FROM PUBLIC`; abort otherwise | The Rollback restores privileges to `anon` and `authenticated` only. It deliberately grants nothing to PUBLIC, because PUBLIC held nothing in the audited pre-state |
| `public.customer_balances` | **Zero** (same measure) | Assert the count is 0 before `REVOKE ALL … FROM PUBLIC`; abort otherwise | Identical |

Rationale, restated for the executor: if an unexpected PUBLIC grant appears between this audit and execution, the Forward Migration would silently revoke a privilege the Rollback cannot restore, breaking Forward→Rollback→Forward symmetry. The precondition converts that silent asymmetry into a clean abort.

## K. Preserved polroles and Policy-Fingerprint Contract

Carried forward unchanged from Prompt 16 and re-confirmed live this run:

- Seven policies exist: three on `ledger_entries` (`r`, `r`, `a`), four on `customer_balances` (`r`, `a`, `w`, `d`).
- Every policy: `polpermissive = true`, `polroles = {0}`, cardinality 1, resolved role PUBLIC.
- PUBLIC-only assertion: `p.polpermissive AND p.polroles = ARRAY[0::oid]`.
- Seven-policy pre-state hash: `e978f912777a28108f46ba79e2ce071e`.
- Three-policy post-state hash: `04297828f4bd33eba043f6c9274ec57b`.
- Four write policies to drop: `Permission-based insert ledger entries`, `Permission-based insert customer balances`, `Permission-based update customer balances`, `Permission-based delete customer balances`.
- Three read policies to retain: `Tenant members can view ledger`, `Tenant members can view ledger entries`, `Tenant members can view balances`.

The withdrawn Prompt-15 predicate `polroles IS NULL OR cardinality(polroles) = 0` appears nowhere in the SQL below.

## L. Final Exact Forward Migration SQL

Complete and executable. **Not executed by this run.**

```sql
-- =====================================================================
-- RM-DH-004 / WS-DH-2026-0003 / STAGE B  (corrected per Prompt 17)
-- Ledger & Customer Balance SELECT-only hardening,
-- browser-write policy removal, create_pos_sale EXECUTE revocation,
-- bounded THREE-helper search_path correction.
-- Canonical Finance contract: accepted 11 + _finance_invoice_approve_inline.
-- Role-aware PUBLIC contract: polroles = ARRAY[0::oid].
-- Zero DML against financial business tables.
-- =====================================================================

BEGIN;

SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '15s';

-- ---------------------------------------------------------------------
-- 1. PRECONDITIONS
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
  v_sig       text;
  v_tbl       text;
  v_hash      text;
  v_expected  text := 'e978f912777a28108f46ba79e2ce071e';
  v_cnt       int;
  v_temp_ok   boolean;
BEGIN
  -- 1.1 PostgreSQL major version
  IF current_setting('server_version_num')::int < 170000 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: PostgreSQL 17+ required, found %',
      current_setting('server_version');
  END IF;

  -- 1.2 Table ownership, RLS state, FORCE RLS state
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_tbl
        AND pg_get_userbyid(c.relowner) = 'postgres'
        AND c.relrowsecurity IS TRUE
        AND c.relforcerowsecurity IS FALSE
    ) THEN
      RAISE EXCEPTION
        'PRECONDITION FAILED: public.% must be owned by postgres with RLS enabled and FORCE RLS disabled', v_tbl;
    END IF;
  END LOOP;

  -- 1.3 Exact TWELVE canonical function identities (accepted 11 + proven dependency),
  --     verified by full signature, ownership and SECURITY DEFINER state.
  FOR v_sig IN
    SELECT unnest(ARRAY[
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
      'public.is_active_tenant_member(uuid,uuid)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
    ])
  LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: function % does not exist with this exact signature', v_sig;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      WHERE p.oid = to_regprocedure(v_sig)
        AND p.prosecdef IS TRUE
        AND pg_get_userbyid(p.proowner) = 'postgres'
    ) THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: % must be SECURITY DEFINER owned by postgres', v_sig;
    END IF;
  END LOOP;

  -- 1.4 Canonical Finance search paths must be the empty path (all writers + dependency)
  FOR v_sig IN
    SELECT unnest(ARRAY[
      'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
      'public.post_expense_with_ledger(uuid,uuid,uuid)',
      'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
      'public.post_payment_session(uuid,uuid,jsonb)',
      'public.approve_invoice(uuid,uuid,uuid)',
      'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
      'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
      'public.create_pos_sale(uuid,uuid,jsonb)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = ''
    ) THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: % must have the empty search_path', v_sig;
    END IF;
  END LOOP;

  -- 1.5 ALL THREE helper current search paths must be exactly 'public'
  FOR v_sig IN
    SELECT unnest(ARRAY['public.has_permission(uuid,uuid,text)',
                        'public.is_tenant_member(uuid,uuid)',
                        'public.is_active_tenant_member(uuid,uuid)'])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = 'public'
    ) THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: % must currently have search_path=public', v_sig;
    END IF;
  END LOOP;

  -- 1.6 Effective TEMP privilege evidence required by the helper correction
  SELECT has_database_privilege('public', current_database(), 'TEMP') INTO v_temp_ok;
  IF v_temp_ok IS NOT TRUE THEN
    RAISE EXCEPTION
      'PRECONDITION FAILED: expected TEMP granted to PUBLIC on database %, which is the premise of the pg_temp demotion correction',
      current_database();
  END IF;

  -- 1.7 Exact current table privileges: anon and authenticated hold all eight
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    SELECT count(*) INTO v_cnt
    FROM (VALUES ('anon'),('authenticated')) AS b(role_name),
         (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
                 ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) AS pr(priv)
    WHERE has_table_privilege(b.role_name, format('public.%I', v_tbl), pr.priv);
    IF v_cnt <> 16 THEN
      RAISE EXCEPTION
        'PRECONDITION FAILED: expected 16 browser privilege pairs on public.%, found %', v_tbl, v_cnt;
    END IF;
  END LOOP;

  -- 1.8 PUBLIC TABLE-ACL PRECONDITION: zero PUBLIC grants on both target tables
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    SELECT count(*) INTO v_cnt
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
         LATERAL aclexplode(c.relacl) g
    WHERE n.nspname = 'public' AND c.relname = v_tbl AND g.grantee = 0;
    IF v_cnt <> 0 THEN
      RAISE EXCEPTION
        'PRECONDITION FAILED: expected zero PUBLIC table grants on public.%, found % - the rollback cannot restore PUBLIC grants that were not in the audited pre-state',
        v_tbl, v_cnt;
    END IF;
  END LOOP;

  -- 1.9 Zero column-level ACLs on both tables
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a
  JOIN pg_class c     ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected zero column ACLs, found %', v_cnt;
  END IF;

  -- 1.10 Zero browser-role inheritance
  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected zero browser-role memberships, found %', v_cnt;
  END IF;

  -- 1.11 Exact seven-policy role-aware pre-state fingerprint
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected exactly 7 policies, found %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    AND p.polpermissive AND p.polroles = ARRAY[0::oid];
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION
      'PRECONDITION FAILED: expected 7 PERMISSIVE PUBLIC-only (polroles = {0}) policies, found %', v_cnt;
  END IF;

  SELECT md5(string_agg(
           n.nspname||'|'||c.relname||'|'||p.polname||'|'||p.polcmd::text||'|'||p.polpermissive::text||'|'||
           COALESCE((SELECT string_agg(ro::text, ',' ORDER BY ro) FROM unnest(p.polroles) AS ro), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>'),
           E'\n' ORDER BY c.relname, p.polname))
    INTO v_hash
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');

  IF v_hash IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION
      'PRECONDITION FAILED: seven-policy role-aware fingerprint mismatch. expected %, found %',
      v_expected, v_hash;
  END IF;

  -- 1.12 Exact current table comments (both currently absent)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND obj_description(c.oid, 'pg_class') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected no existing table comment on either target table';
  END IF;

  -- 1.13 Current create_pos_sale EXECUTE state: browser roles can execute
  IF NOT (has_function_privilege('anon',          'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')) THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected anon and authenticated to currently hold EXECUTE on create_pos_sale';
  END IF;

  -- 1.14 service_role authority intact on both tables
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    IF NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'SELECT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'INSERT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'UPDATE')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'DELETE') THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: service_role authority missing on public.%', v_tbl;
    END IF;
  END LOOP;

  RAISE NOTICE 'ALL PRECONDITIONS PASSED';
END
$pre$;

-- ---------------------------------------------------------------------
-- 2. FORWARD CHANGES
-- ---------------------------------------------------------------------

-- 2.1 Table privileges: revoke everything from browser roles and PUBLIC
REVOKE ALL ON TABLE public.ledger_entries    FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.customer_balances FROM anon, authenticated, PUBLIC;

-- 2.2 Re-grant SELECT only
GRANT SELECT ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT ON TABLE public.customer_balances TO anon, authenticated;

-- 2.3 Drop exactly the four audited browser-write policies
DROP POLICY "Permission-based insert ledger entries"    ON public.ledger_entries;
DROP POLICY "Permission-based insert customer balances" ON public.customer_balances;
DROP POLICY "Permission-based update customer balances" ON public.customer_balances;
DROP POLICY "Permission-based delete customer balances" ON public.customer_balances;
-- The three read policies are intentionally untouched:
--   "Tenant members can view ledger"          ON public.ledger_entries
--   "Tenant members can view ledger entries"  ON public.ledger_entries
--   "Tenant members can view balances"        ON public.customer_balances

-- 2.4 Revoke browser EXECUTE on the deferred POS writer
REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) FROM anon, authenticated, PUBLIC;

-- 2.5 Bounded SECURITY DEFINER helper correction - ALL THREE, no body rewrite
ALTER FUNCTION public.has_permission(uuid, uuid, text)      SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)          SET search_path = public, pg_temp;
ALTER FUNCTION public.is_active_tenant_member(uuid, uuid)   SET search_path = public, pg_temp;

-- 2.6 Approved table comments
COMMENT ON TABLE public.ledger_entries IS
  'Financial truth: append-only ledger. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.';
COMMENT ON TABLE public.customer_balances IS
  'Financial truth: derived customer balances. Browser roles hold SELECT only. All writes must go through canonical SECURITY DEFINER Finance RPCs. RM-DH-004 / WS-DH-2026-0003 Stage B.';

-- 2.7 Zero DML against financial business tables is issued by this migration.

-- ---------------------------------------------------------------------
-- 3. POSTCONDITIONS
-- ---------------------------------------------------------------------
DO $post$
DECLARE
  v_tbl      text;
  v_role     text;
  v_priv     text;
  v_sig      text;
  v_cnt      int;
  v_hash     text;
  v_expected text := '04297828f4bd33eba043f6c9274ec57b';
BEGIN
  -- 3.1 Browser roles: SELECT only, no other privilege of the eight
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF NOT has_table_privilege(v_role, format('public.%I', v_tbl), 'SELECT') THEN
        RAISE EXCEPTION 'POSTCONDITION FAILED: % lost SELECT on public.%', v_role, v_tbl;
      END IF;
      FOREACH v_priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF has_table_privilege(v_role, format('public.%I', v_tbl), v_priv) THEN
          RAISE EXCEPTION 'POSTCONDITION FAILED: % still holds % on public.%', v_role, v_priv, v_tbl;
        END IF;
      END LOOP;
    END LOOP;

    -- 3.2 PUBLIC holds no table privilege
    SELECT count(*) INTO v_cnt
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
         LATERAL aclexplode(c.relacl) g
    WHERE n.nspname = 'public' AND c.relname = v_tbl AND g.grantee = 0;
    IF v_cnt <> 0 THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: PUBLIC retains % grant(s) on public.%', v_cnt, v_tbl;
    END IF;

    -- 3.3 service_role authority intact
    IF NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'SELECT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'INSERT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'UPDATE')
    OR NOT has_table_privilege('service_role', format('public.%I', v_tbl), 'DELETE') THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: service_role authority lost on public.%', v_tbl;
    END IF;

    -- 3.4 Table owner remains functional (the SECURITY DEFINER writer identity)
    IF NOT has_table_privilege('postgres', format('public.%I', v_tbl), 'SELECT')
    OR NOT has_table_privilege('postgres', format('public.%I', v_tbl), 'INSERT')
    OR NOT has_table_privilege('postgres', format('public.%I', v_tbl), 'UPDATE') THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: owner authority lost on public.%', v_tbl;
    END IF;
  END LOOP;

  -- 3.5 No column ACL introduced
  SELECT count(*) INTO v_cnt
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    AND a.attacl IS NOT NULL;
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: % column ACL(s) present', v_cnt;
  END IF;

  -- 3.6 All TWELVE canonical functions still exist, unchanged in identity and security state
  FOR v_sig IN
    SELECT unnest(ARRAY[
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
      'public.is_active_tenant_member(uuid,uuid)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
    ])
  LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % no longer resolves', v_sig;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      WHERE p.oid = to_regprocedure(v_sig)
        AND p.prosecdef IS TRUE
        AND pg_get_userbyid(p.proowner) = 'postgres'
    ) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % lost SECURITY DEFINER or postgres ownership', v_sig;
    END IF;
  END LOOP;

  -- 3.7 Canonical Finance search paths still empty (unchanged by this migration)
  FOR v_sig IN
    SELECT unnest(ARRAY[
      'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
      'public.post_expense_with_ledger(uuid,uuid,uuid)',
      'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
      'public.post_payment_session(uuid,uuid,jsonb)',
      'public.approve_invoice(uuid,uuid,uuid)',
      'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
      'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
      'public.create_pos_sale(uuid,uuid,jsonb)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = ''
    ) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % no longer carries the empty search_path', v_sig;
    END IF;
  END LOOP;

  -- 3.8 Canonical Finance RPC EXECUTE remains correct for the app
  IF NOT has_function_privilege('authenticated', 'public.post_expense_with_ledger(uuid,uuid,uuid)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.post_payment_session(uuid,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.approve_invoice(uuid,uuid,uuid)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.create_source_checkout_invoice(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated lost EXECUTE on a canonical Finance RPC';
  END IF;

  -- 3.9 create_pos_sale unreachable from the browser, retained for service_role
  IF has_function_privilege('anon',          'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: a browser role still holds EXECUTE on create_pos_sale';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p, LATERAL aclexplode(p.proacl) g
    WHERE p.oid = to_regprocedure('public.create_pos_sale(uuid,uuid,jsonb)') AND g.grantee = 0
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: PUBLIC retains EXECUTE on create_pos_sale';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: service_role lost EXECUTE on create_pos_sale';
  END IF;

  -- 3.10 ALL THREE helpers carry the approved secure contract (text element, not Array display)
  FOR v_sig IN
    SELECT unnest(ARRAY['public.has_permission(uuid,uuid,text)',
                        'public.is_tenant_member(uuid,uuid)',
                        'public.is_active_tenant_member(uuid,uuid)'])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = 'public, pg_temp'
    ) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % does not carry search_path=public, pg_temp', v_sig;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure(v_sig) AND p.prosecdef) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % lost SECURITY DEFINER', v_sig;
    END IF;
  END LOOP;

  -- 3.11 Exactly three policies remain, all PERMISSIVE, all PUBLIC-only, all SELECT
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 3 THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: expected exactly 3 policies, found %', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    AND p.polcmd = 'r' AND p.polpermissive AND p.polroles = ARRAY[0::oid];
  IF v_cnt <> 3 THEN
    RAISE EXCEPTION
      'POSTCONDITION FAILED: expected 3 PERMISSIVE PUBLIC-only (polroles = {0}) SELECT policies, found %', v_cnt;
  END IF;

  -- 3.12 No write policy of any kind remains
  IF EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND p.polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: a non-SELECT policy still exists';
  END IF;

  -- 3.13 Three-policy role-aware post-state fingerprint
  SELECT md5(string_agg(
           n.nspname||'|'||c.relname||'|'||p.polname||'|'||p.polcmd::text||'|'||p.polpermissive::text||'|'||
           COALESCE((SELECT string_agg(ro::text, ',' ORDER BY ro) FROM unnest(p.polroles) AS ro), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>'),
           E'\n' ORDER BY c.relname, p.polname))
    INTO v_hash
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');

  IF v_hash IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION
      'POSTCONDITION FAILED: three-policy role-aware fingerprint mismatch. expected %, found %',
      v_expected, v_hash;
  END IF;

  -- 3.14 RLS still enabled
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND c.relrowsecurity IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: RLS is no longer enabled on a target table';
  END IF;

  RAISE NOTICE 'ALL POSTCONDITIONS PASSED';
END
$post$;

COMMIT;
```

Zero financial rows change and Stage-A rows remain unchanged: the migration contains no `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `COPY` or `MERGE` against any business table, verifiable by inspection of the statement list in section 2.

## M. Final Exact Rollback SQL

```sql
-- =====================================================================
-- EMERGENCY ROLLBACK ONLY: This rollback intentionally restores the
-- prior unsafe browser-write authority over Ledger and Customer Balance
-- truth.
-- =====================================================================

BEGIN;

SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '15s';

-- ---------------------------------------------------------------------
-- 1. RESTORE ALL EIGHT PG17 TABLE PRIVILEGES TO THE PROVEN PRIOR ROLES
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.ledger_entries    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.customer_balances TO anon, authenticated;
-- PUBLIC held ZERO table grants in the audited pre-state and is deliberately
-- not granted anything here. Restoring the pre-state means leaving PUBLIC empty.

-- ---------------------------------------------------------------------
-- 2. RECREATE EXACTLY THE FOUR REMOVED WRITE POLICIES
--    Exact names, commands, PERMISSIVE state, PUBLIC-only role contract
--    (TO PUBLIC => polroles = {0}), exact USING / WITH CHECK expressions.
--    The three read policies are NOT recreated - they were never dropped.
-- ---------------------------------------------------------------------
CREATE POLICY "Permission-based insert ledger entries"
  ON public.ledger_entries
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based insert customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based update customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR UPDATE
  TO PUBLIC
  USING      (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text))
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

CREATE POLICY "Permission-based delete customer balances"
  ON public.customer_balances
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text));

-- ---------------------------------------------------------------------
-- 3. RESTORE THE EXACT PRIOR create_pos_sale EXECUTE GRANTS
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, uuid, jsonb) TO anon, authenticated;
-- postgres, service_role and the platform sandbox roles were never revoked.
-- PUBLIC held no EXECUTE grant on this function and is not granted one.

-- ---------------------------------------------------------------------
-- 4. RESTORE THE EXACT PRIOR search_path OF ALL THREE HELPERS
-- ---------------------------------------------------------------------
ALTER FUNCTION public.has_permission(uuid, uuid, text)     SET search_path = public;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)         SET search_path = public;
ALTER FUNCTION public.is_active_tenant_member(uuid, uuid)  SET search_path = public;

-- ---------------------------------------------------------------------
-- 5. RESTORE THE EXACT PRIOR TABLE COMMENTS (both were absent)
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.ledger_entries    IS NULL;
COMMENT ON TABLE public.customer_balances IS NULL;

-- ---------------------------------------------------------------------
-- 6. ROLLBACK VERIFICATION
-- ---------------------------------------------------------------------
DO $rb$
DECLARE
  v_tbl      text;
  v_role     text;
  v_priv     text;
  v_sig      text;
  v_cnt      int;
  v_hash     text;
  v_expected text := 'e978f912777a28108f46ba79e2ce071e';
BEGIN
  -- 6.1 All eight prior table privileges restored for both browser roles
  FOREACH v_tbl IN ARRAY ARRAY['ledger_entries','customer_balances'] LOOP
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH v_priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE',
                                    'TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        IF NOT has_table_privilege(v_role, format('public.%I', v_tbl), v_priv) THEN
          RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: % missing % on public.%', v_role, v_priv, v_tbl;
        END IF;
      END LOOP;
    END LOOP;

    -- 6.2 PUBLIC table-grant pre-state preserved: still zero
    SELECT count(*) INTO v_cnt
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
         LATERAL aclexplode(c.relacl) g
    WHERE n.nspname = 'public' AND c.relname = v_tbl AND g.grantee = 0;
    IF v_cnt <> 0 THEN
      RAISE EXCEPTION
        'ROLLBACK VERIFY FAILED: PUBLIC holds % grant(s) on public.%, but the audited pre-state was zero',
        v_cnt, v_tbl;
    END IF;
  END LOOP;

  -- 6.3 Exactly seven policies, no duplicate
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: expected exactly 7 policies, found %', v_cnt;
  END IF;

  -- 6.4 All seven are PERMISSIVE and exactly PUBLIC-only
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    AND p.polpermissive AND p.polroles = ARRAY[0::oid];
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION
      'ROLLBACK VERIFY FAILED: expected 7 PERMISSIVE PUBLIC-only (polroles = {0}) policies, found %', v_cnt;
  END IF;

  -- 6.5 Exact seven-policy role-aware fingerprint
  SELECT md5(string_agg(
           n.nspname||'|'||c.relname||'|'||p.polname||'|'||p.polcmd::text||'|'||p.polpermissive::text||'|'||
           COALESCE((SELECT string_agg(ro::text, ',' ORDER BY ro) FROM unnest(p.polroles) AS ro), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')||'|'||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>'),
           E'\n' ORDER BY c.relname, p.polname))
    INTO v_hash
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');

  IF v_hash IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION
      'ROLLBACK VERIFY FAILED: seven-policy role-aware fingerprint mismatch. expected %, found %',
      v_expected, v_hash;
  END IF;

  -- 6.6 Exact prior create_pos_sale EXECUTE state restored
  IF NOT has_function_privilege('anon',          'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('service_role',  'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: prior create_pos_sale EXECUTE state not restored';
  END IF;

  -- 6.7 ALL THREE helpers restored to the exact prior search_path
  FOR v_sig IN
    SELECT unnest(ARRAY['public.has_permission(uuid,uuid,text)',
                        'public.is_tenant_member(uuid,uuid)',
                        'public.is_active_tenant_member(uuid,uuid)'])
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = 'public'
    ) THEN
      RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: % does not carry the prior search_path=public', v_sig;
    END IF;
  END LOOP;

  -- 6.8 All TWELVE canonical Finance functions and dependencies remain unchanged
  FOR v_sig IN
    SELECT unnest(ARRAY[
      'public._finance_ledger_insert(uuid,uuid,text,text,uuid,numeric,date,text,text,uuid,jsonb,uuid)',
      'public.post_expense_with_ledger(uuid,uuid,uuid)',
      'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
      'public.post_payment_session(uuid,uuid,jsonb)',
      'public.approve_invoice(uuid,uuid,uuid)',
      'public.post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)',
      'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
      'public.create_pos_sale(uuid,uuid,jsonb)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)'
    ])
  LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: % no longer resolves', v_sig;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_sig)
        AND p.prosecdef IS TRUE
        AND pg_get_userbyid(p.proowner) = 'postgres'
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = ''
    ) THEN
      RAISE EXCEPTION
        'ROLLBACK VERIFY FAILED: % lost SECURITY DEFINER, postgres ownership, or the empty search_path', v_sig;
    END IF;
  END LOOP;

  -- 6.9 Prior comment state restored (absent)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND obj_description(c.oid, 'pg_class') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: a table comment remains';
  END IF;

  RAISE NOTICE 'ROLLBACK VERIFICATION PASSED';
END
$rb$;

COMMIT;
```

No total-count-alone check, no name-only check, no `polroles IS NULL`, no empty-array assumption, no substring check, no role-insensitive hash. Zero DML against financial business tables.

## N. Application Contract Confirmation

Unchanged and confirmed:

- Expense approval uses `post_expense_with_ledger`.
- Economic Date is `expense_date`.
- Idempotency is preserved (idempotency key passed to the canonical RPC).
- Legacy Expense and POS Ledger writers are removed (`postLedgerForExpense`, `postLedgerForInvoice`, dead `useLedger.createEntry`).
- Ledger/Balance hooks (`useLedgerEntries`, `useCustomerBalances`) remain read-only.
- Automatic Description backfill (`backfillLedgerDescriptions`) runtime execution is removed.
- POS visible with Coming Soon; inert and non-invokable; no operational POS hook or writer mounted.
- Full POS remains deferred to WS-DH-2026-0005; `create_pos_sale` is not activated.

No new application scope is introduced by this audit.

## O. QA Additions

**Functions** — all eleven accepted exact signatures exist before and after; the one proven additional dependency (`_finance_invoice_approve_inline`) exists before and after; all retain owner `postgres` and SECURITY DEFINER; all nine canonical Finance search paths remain the empty path; no accepted function was silently substituted (verify by exact signature list, not by count).

**Helpers** — all three final search paths equal `public, pg_temp`; rollback restores all three to `public`; authorized RLS checks still succeed; unauthorized and cross-tenant checks still fail (regression test on `has_permission` and `is_active_tenant_member` behavior after the path change).

**Privileges and Policies** — PUBLIC pre-state table grants equal zero on both tables; browser post-state is SELECT only; pre-state hash `e978f912777a28108f46ba79e2ce071e` and post-state hash `04297828f4bd33eba043f6c9274ec57b` match; no write policy remains; Forward→Rollback→Forward completes in isolation.

**Data** — no financial rows change; no Stage-A rows change; balances remain reconciled.

Build and Typecheck alone are not Acceptance. Separate QA and a read-only Acceptance Re-Audit remain mandatory.

## P. Deferred Items Register

| Item | Original evidence | Current status | Current lane | Future lane | Dependency | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|
| Expense Browser Writer cutover | Prompt 11–12 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | `post_expense_with_ledger` | Browser keeps writing financial truth | Stage B Agent/Build |
| Dead `useLedger.createEntry` removal | Prompt 11 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | Dead writer can be revived | Stage B Agent/Build |
| POS Safety Fencing | Prompt 11–12 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | None | Non-atomic POS writes reachable | Stage B Agent/Build |
| Ledger / Customer Balance SELECT-only hardening | Prompt 13 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | Policy drop | Direct-DML bypass of RPCs | Stage B migration |
| `create_pos_sale` browser EXECUTE revocation | Prompt 12 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | None | Deferred POS writer callable | Stage B migration |
| `backfillLedgerDescriptions` automatic-run removal | Prompt 11 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | Unattended historical mutation | Stage B Agent/Build |
| Helper `public, pg_temp` correction | Prompt 14 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | TEMP-to-PUBLIC evidence | `pg_temp` shadowing in SECURITY DEFINER | Stage B migration |
| Seven-policy Rollback correction | Prompt 14 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | Pre-state fingerprint | Rollback cannot restore pre-state | Stage B migration |
| Robust proconfig assertion | Prompt 15 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | False assertion failure on Array quoting | Stage B migration |
| `polroles` / PUBLIC representation correction | Prompt 16 | PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE | Stage B | — | Live catalog | Migration aborts despite correct SQL | Stage B migration |
| Role-aware Policy fingerprint correction | Prompt 16 | PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE | Stage B | — | Live catalog | Role changes undetected | Stage B migration |
| **Canonical Finance function identity restoration** | **This Prompt 17** | **PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE** | Stage B | — | Live `pg_proc` | Migration passes without proving the Ledger writer, approval and adjustment paths survive | Stage B migration |
| **Third-helper (`is_active_tenant_member`) restoration** | **This Prompt 17** | **PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE** | Stage B | — | Live `pg_proc` | A SECURITY DEFINER helper used by every canonical RPC keeps `pg_temp` shadow exposure | Stage B migration |
| **PUBLIC table-ACL precondition completion** | **This Prompt 17** | **PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE** | Stage B | — | Live `relacl` | Forward silently revokes a PUBLIC grant the Rollback cannot restore | Stage B migration |
| Internal Cost terminology correction | Prompt 11 | DEFERRED — TRACKED | — | Later Phase | Terminology decision | Misleading cost labels | Owner terminology decision |
| Internal Cost Unknown vs Real Zero | Prompt 11 | DEFERRED — TRACKED | — | Later Phase | Data model | Zero read as truth | Internal Cost workstream |
| Internal Cost contextual terminology by account type | Prompt 11 | DEFERRED — TRACKED | — | Later Phase | Account-type model | Wrong wording per account type | Internal Cost workstream |
| HR Salary-to-Expense atomicity | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Expense RPC | Partial salary posting | HR finance workstream |
| HR Salary idempotency | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Idempotency keys | Duplicate salary expense | HR finance workstream |
| HR Salary reversal | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Reversal contract | No safe correction path | HR finance workstream |
| Generic Expense deletion of HR-linked records | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | HR linkage | Orphaned HR records | HR finance workstream |
| Expense unpost / reversal | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Ledger reversal design | Uncorrectable expense | Expense reversal workstream |
| Supplier Payable payment / Expense / Ledger lifecycle | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Payables model | Incomplete payables truth | Payables workstream |
| Supplier Payable-to-Expense authority | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | Payables model | Unclear write authority | Payables workstream |
| Full POS implementation | Prompt 11–12 | DEFERRED — TRACKED | — | WS-DH-2026-0005 | Stage B fencing | POS never delivered | WS-DH-2026-0005 start |
| Future `create_pos_sale` activation | Prompt 12 | DEFERRED — TRACKED | — | WS-DH-2026-0005 | POS implementation | Premature activation | WS-DH-2026-0005 start |
| Manual Ledger Adjustment product workflow | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | SELECT-only hardening | No adjustment UI path after hardening | Adjustment workstream |
| Residual financial-table privilege hardening | Prompt 13 | DEFERRED — TRACKED | — | Later Phase | Stage B precedent | Other finance tables stay open | Follow-on privilege audit |
| Full schema qualification of `has_permission` | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Body rewrite authorization | Residual resolution risk | Helper-body workstream |
| Duplicate Ledger SELECT policy review | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Policy consolidation | Two overlapping read policies persist | Policy cleanup workstream |
| Database-level TEMP grant to PUBLIC review | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Platform constraints | Broad TEMP remains | Platform hardening review |
| PUBLIC EXECUTE grant on the three permission helpers | This Prompt 17 (observation) | DEFERRED — TRACKED | — | Later Phase | Platform grant model | Helpers callable by any role, though read-only and tenant-gated | Follow-on privilege audit |

No item removed. Only the three items required by this correction were promoted. Internal Costs, HR Salary, Expense reversal, Supplier Payables, Manual Adjustment UI, full POS and residual platform hardening remain deferred.

## Q. Zero-Regression Confirmation

- **Prompt 14** — eleven-function contract restored in full; three-helper `public, pg_temp` contract restored in full; seven-policy Rollback intact. No regression.
- **Prompt 15** — robust text-element `proconfig` assertion retained verbatim in both preconditions and postconditions; the withdrawn NULL/empty predicate appears nowhere. No regression.
- **Prompt 16** — `polroles = {0}`, the `ARRAY[0::oid]` PUBLIC-only assertion, and both policy hashes are preserved byte-for-byte. Only the function set, helper count and the two dependent verdicts were reopened. No regression to the policy findings.
- **Stage A, Expense cutover, POS contract, SELECT-only strategy, helper strategy, Deferred Items Register** — all intact.

`ZERO REGRESSION TO PROMPTS 14–16 CONFIRMED`

## R. Blockers and Gaps

None.

Three non-blocking observations, recorded and out of scope: platform `sandbox_exec*` roles hold SELECT+INSERT on both tables; `relforcerowsecurity` is false on both tables; the three permission helpers carry a PUBLIC EXECUTE grant that `ALTER FUNCTION ... SET search_path` neither reads nor changes.

## S. WORKSTREAM PERSISTENCE

`WORKSTREAM PERSISTENCE:
NONE — READ-ONLY CANONICAL-FUNCTION,
THREE-HELPER AND FINAL ZERO-REGRESSION
MIGRATION-CORRECTION AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

Prompt-16 polroles, PUBLIC representation and role-aware
Policy-fingerprint findings remain preserved.

No governance file was modified.

Stage C and Stage D have not started.

No Workstream Closure occurred.`

## T. ROADMAP IMPACT

`ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This correction audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap, Phase, Workstream or Decision ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.`

## U. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only.
2. Operation: Canonical Finance function identity restoration, nested dependency classification, three-helper `search_path` preservation, PUBLIC table-ACL precondition completion, final Forward/Rollback reissue, Stage B readiness determination.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-CANONICAL-FUNCTION-IDENTITY-THREE-HELPER-AND-FINAL-ZERO-REGRESSION-CORRECTION-AUDIT-17.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026. Time: 23:57. Timezone: Asia/Riyadh — UTC+03:00.
6. Run Start: 03-08-2026, 23:57 Asia/Riyadh (message receipt). Run End: Exact time not recorded. Final Report: Exact time not recorded.
7. Timestamp evidence source: platform message clock.
8. PostgreSQL version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu. Database: `postgres`. Owner: `postgres`.
9. Branch: `edit/edt-1629dbca-22c7-427d-83d9-b7df3324659e`; default-branch evidence `refs/remotes/origin/HEAD` → `refs/remotes/origin/main`.
10. HEAD before: `2133b5f3413e7ab97be739a07332087e9a9ec54e`. HEAD after: unchanged.
11. Working tree before: clean. Working tree after: clean (only `.lovable/plan.md`, the platform planning artifact, is written).
12. Repository paths read: `docs/aml_1_b_1/stage_j5_1/preflight/01_fn__finance_ledger_insert.txt`, `.../01_fn_post_payment.txt`, `.../10_all_finance_fns.txt`, `src/lib/finance/postLedgerForExpense.ts`, `src/lib/finance/postPaymentSession.ts`, `src/lib/finance/approveInvoice.ts`, `src/hooks/finance/index.ts`.
13. Database objects read: `pg_proc`, `pg_language`, `pg_class`, `pg_namespace`, `pg_policy`, `pg_roles`, `pg_auth_members`, `pg_attribute`, `aclexplode`, `to_regprocedure`, `pg_get_expr`, `obj_description`, `md5`.
14. Catalog queries executed this run: two, both read-only SELECT. Financial-row queries: zero. Database role: `supabase_read_only_user`.
15. Accepted eleven functions: all present, all owned by `postgres`, all SECURITY DEFINER (§G).
16. Additional dependencies included: `public._finance_invoice_approve_inline(uuid,uuid,uuid)` — one.
17. Functions rejected as unrelated or unproven: `get_payment_session(uuid,uuid)`, `update_horse_identity(uuid,uuid,jsonb)`, `complete_local_horse_record(uuid,uuid,jsonb)`.
18. Three-helper current values: `search_path=public` for all three. Target values: `search_path=public, pg_temp` for all three.
19. PUBLIC table grants: zero on `public.ledger_entries`; zero on `public.customer_balances`.
20. Pre-state Policy hash: `e978f912777a28108f46ba79e2ce071e`. Post-state Policy hash: `04297828f4bd33eba043f6c9274ec57b`.
21. Final Forward SQL result: `FINAL CORRECTED FORWARD MIGRATION SQL EXECUTABLE` (authored, not executed).
22. Final Rollback result: `FINAL CORRECTED ROLLBACK SQL EXECUTABLE` (authored, not executed).
23. Deferred items preserved: 18. Deferred items promoted this Prompt: 3.
24. Repository changes: zero. Database changes: zero. Migration changes: zero. Financial-row changes: zero. Project Knowledge, Workspace Knowledge, Skills and settings changes: zero.
25. `.lovable/plan.md` disclosure: this report is held in `.lovable/plan.md`, the platform-generated planning artifact governed by `docs/CONVENTIONS.md` §11.10. It is the only file touched this run and it is not governance persistence.
26. Nine required verdicts: §A.
27. Stage B implementation: not started. Stage C: not started. Stage D: not started. QA: not started. Acceptance: not started. Closure: none.
28. **Exact stopping point:** The Prompt-16 function-set and helper regression has been withdrawn. The accepted canonical Finance-function identities, proven additional dependencies, three-helper search-path contract, PUBLIC table-ACL precondition, preserved role-aware Policy hashes, executable Forward Migration, executable Rollback and complete Deferred Items Register have been established. No implementation, migration, financial-data change, Stage C, Stage D, QA, Acceptance or Closure has occurred.
29. **One next step:** Issue the Stage B Agent/Build Execution Prompt carrying the §L Forward Migration, the §M Rollback and the §N application contract verbatim.
30. **Recommended next Mode:** Agent/Build.
