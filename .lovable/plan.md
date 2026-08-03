# STAGE B — FINAL POLROLES / PUBLIC REPRESENTATION, ROLE-AWARE POLICY FINGERPRINT, AND MIGRATION EXECUTABILITY CORRECTION AUDIT

Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-FINAL-POLROLES-PUBLIC-REPRESENTATION-AND-POLICY-FINGERPRINT-CORRECTION-AUDIT-16
Mode: Plan/Chat — Read-Only. Repository changes: zero. Database changes: zero.

## A. Combined Verdicts

1. Correction Acknowledgement — `PROMPT-15 POLROLES FINDING WITHDRAWN AND CORRECTED`
2. Raw Catalog Representation — `PUBLIC POLICY ROLE REPRESENTATION VERIFIED`
3. Prompt-15 Assertion — `PROMPT-15 POLROLES ASSERTION FAILS`
4. Policy Contract — `FINAL ROLE-AWARE POLICY CONTRACT CLOSED`
5. Forward Migration — `FINAL FORWARD MIGRATION SQL EXECUTABLE`
6. Rollback — `FINAL ROLLBACK SQL EXECUTABLE`
7. Zero Regression — `ZERO REGRESSION TO PRESERVED FINDINGS CONFIRMED`
8. Stage B — `STAGE B READY FOR AGENT/BUILD EXECUTION PROMPT`

## B. Roadmap and Workstream State

- Roadmap: RM-DH-004 — ACTIVE — PHASE 1 (Economic Date Integrity).
- Workstream: WS-DH-2026-0003 — ACTIVE — STAGE A ACCEPTED, PERSISTED AND VERIFIED; STAGE B NOT STARTED.
- Related deferred Workstream: WS-DH-2026-0005 — POS Financial Isolation — DEFERRED.
- No Roadmap, Phase, Workstream or Decision ID created or advanced.

## C. Lovable Correction Acknowledgement

`LOVABLE CORRECTION ACKNOWLEDGEMENT:
The Prompt-15 NULL/empty-polroles representation of PUBLIC is withdrawn.
Only the policy-role representation, role-aware fingerprints,
and dependent Forward/Rollback assertions are reopened.
All findings listed under PRESERVED AND STILL AUTHORITATIVE remain unchanged.`

Error Correction Protocol, all eight points:

1. **Prior Prompt.** `PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-FINAL-PROCONFIG-ASSERTION-AND-MIGRATION-EXECUTABILITY-CLOSURE-AUDIT-15`.
2. **Prior claim and affected sections.** Prompt 15 asserted that a PUBLIC policy is represented by `polroles IS NULL` or `cardinality(polroles) = 0`, stated "polroles empty implies PUBLIC", and used the predicate `p.polroles IS NULL OR cardinality(p.polroles) = 0` in its Forward precondition, Forward postcondition, Rollback postcondition and seven-policy fingerprint.
3. **Technical error.** `pg_policy.polroles` is `oid[]` and is never NULL or empty for a live policy. `PUBLIC` is stored as the single OID zero — the array `{0}`, cardinality 1. An empty or NULL array is not the PUBLIC representation; it is a state PostgreSQL does not produce for `CREATE POLICY`.
4. **Execution impact.** Confirmed against the live catalog: the predicate evaluates FALSE for all seven policies. Every Prompt-15 block depending on it would abort or mis-report. Impacts confirmed below in §I.
5. **Replacement contract.** `p.polpermissive AND p.polroles = ARRAY[0::oid]` — proven TRUE for all seven live policies.
6. **Withdrawal.** The Prompt-15 role assertion is explicitly withdrawn and is not used anywhere in the SQL below.
7. **No preserved finding reopened.** Confirmed — see §E.
8. **Zero regression.** Confirmed — see §R.

## D. Evidence Boundary

**OFFICIAL POSTGRESQL DOCUMENTATION FACT**
- `pg_policy.polroles` is `oid[]`; role OID zero means PUBLIC and normally appears alone (docs/17 catalog-pg-policy).
- Omitting `TO role_name` in `CREATE POLICY` makes the policy apply to PUBLIC (docs/17 sql-createpolicy).

**LIVE DATABASE FACT** (read as `supabase_read_only_user`, three catalog queries, zero financial-row queries)
- `PostgreSQL 17.6 on aarch64-unknown-linux-gnu`, database `postgres`, database owner `postgres`.
- Exactly **seven** policies exist across `public.ledger_entries` (3) and `public.customer_balances` (4).
- **Every one of the seven has `polroles = {0}`, cardinality 1, resolved role PUBLIC, `polpermissive = true`.** Zero restrictive policies. Zero named-role policies.
- Both tables: owner `postgres`; `relrowsecurity = true`; `relforcerowsecurity = false`; `obj_description` = NULL (no table comment currently exists).
- Both tables: `anon` and `authenticated` each hold all eight PG17 privileges — DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE. `service_role` and `postgres` hold the same eight.
- `public_grant_count = 0` on both tables: the PUBLIC pseudo-role currently holds **no** table-level grant.
- Column-level ACL count on both tables: **0**.
- `pg_auth_members` rows for `anon`/`authenticated` as member: **0** — no browser-role inheritance.
- `public.create_pos_sale(uuid,uuid,jsonb)` EXECUTE is currently granted to `postgres`, `anon`, `authenticated`, `service_role`, `sandbox_exec_vhxglsvxwwpmoqjabfmj`, `sandbox_exec`. PUBLIC is not an explicit grantee.
- Function identity/config (all owned by `postgres`, all `prosecdef = true`):
  - `_finance_invoice_approve_inline(uuid,uuid,uuid)` — `search_path=""`
  - `create_pos_sale(uuid,uuid,jsonb)` — `search_path=""`
  - `create_source_checkout_invoice(uuid,uuid,jsonb)` — `search_path=""`
  - `get_payment_session(uuid,uuid)` — `search_path=""`
  - `post_expense_with_ledger(uuid,uuid,uuid)` — `search_path=""`
  - `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` — `search_path=""`
  - `post_payment_session(uuid,uuid,jsonb)` — `search_path=""`
  - `has_permission(uuid,uuid,text)` — **`search_path=public`** (helper requiring bounded correction)
  - `is_tenant_member(uuid,uuid)` — **`search_path=public`** (helper requiring bounded correction)
  - `complete_local_horse_record(uuid,uuid,jsonb)` — `search_path=public, pg_temp`
  - `update_horse_identity(uuid,uuid,jsonb)` — `search_path=public, pg_temp`

**REPOSITORY FACT**
- No repository file was written or modified this run. The Stage B application contract (§O) is carried unchanged from Prompts 12–15.

**LOVABLE PRIOR CLAIM**
- Prompt 15: "polroles empty implies PUBLIC" — now proven false against the live catalog and withdrawn.
- Prompt 15 fingerprint hash `44770e308a526915fb301bc951601450` — superseded; it did not encode role OIDs correctly.

**CHATGPT CORRECTION INFERENCE**
- `p.polroles = ARRAY[0::oid]` is the exact-equality PUBLIC-only test. Array equality (not `@>` or `= ANY`) is required so that `{0, 16xxx}` and `{}` both fail. Labelled inference at design level; the TRUE result for all seven policies is live fact.

**CURRENT GAP**
- Two `sandbox_exec*` roles hold SELECT+INSERT on both tables and EXECUTE on `create_pos_sale`. These are platform sandbox roles, not browser roles. They are **out of the authorized Stage B scope** and are neither revoked nor asserted upon. Recorded as an observation only.
- `force_rls = false` on both tables. Since both tables are owned by `postgres` and browser roles will hold SELECT only, this does not create a browser bypass. Not in scope; recorded.

## E. PRESERVED AND STILL AUTHORITATIVE

| Preserved finding (§5) | Remains unchanged? | Live confirmation this run |
|---|---|---|
| 5.1 Stage A executed, accepted, persisted, verified; bounded rows untouched | Yes | No financial-row query and no DML issued |
| 5.2 Expense routes to `post_expense_with_ledger`; `expense_date` is Economic Date; browser writers deleted; read hooks retained; auto-backfill removed | Yes | `post_expense_with_ledger(uuid,uuid,uuid)` confirmed present, SECURITY DEFINER, owner `postgres`, `search_path=""` |
| 5.3 POS visible, Coming Soon, inert; `create_pos_sale` not activated | Yes | No change proposed to POS behavior; `create_pos_sale` EXECUTE only revoked, never activated |
| 5.4 PG 17.6; `arwdDxtm` = 8 privileges; zero column ACLs; no role inheritance; REVOKE ALL then GRANT SELECT | Yes | 17.6 confirmed; 8 privileges enumerated live; column ACL count 0; `pg_auth_members` count 0 |
| 5.5 Canonical RPCs exact-signature, owner `postgres`, SECURITY DEFINER, empty search path; helper correction `public, pg_temp`; no body rewrite | Yes | All seven canonical RPCs confirmed `search_path=""`; both helpers confirmed `search_path=public` |
| 5.6 Stored element is `search_path=public, pg_temp`, not `search_path="public, pg_temp"` | Yes | Live proof: `complete_local_horse_record` and `update_horse_identity` display `{"search_path=public, pg_temp"}` — one outer Array-display quote pair, inner text unquoted; contrast `{"search_path=\"\""}` for the empty-path RPCs |
| 5.7 3 + 4 = 7 policies; 4 write to remove; 3 read to retain | Yes | Live count exactly 7; commands `r,r,a` on ledger_entries and `r,a,w,d` on customer_balances |
| 5.8 Deferred Items Register mandatory and complete | Yes | Reproduced in full in §Q; nothing removed |

## F. REJECTED OR SUPERSEDED FINDING

**Sole rejected finding:** Prompt 15 treated PUBLIC policy roles as `NULL` or an empty `polroles` array.

**Replacement:** PUBLIC is `polroles = ARRAY[0::oid]` (cardinality 1). Every dependent assertion, fingerprint and hash is reissued below on that basis. Nothing else is reopened.

## G. Raw polroles Matrix

| Schema | Table | Policy | Cmd | Permissive? | Raw polroles | Cardinality | Unnested OID | Resolved role | Exact PUBLIC-only? |
|---|---|---|---|---|---|---|---|---|---|
| public | customer_balances | Permission-based delete customer balances | d | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | customer_balances | Permission-based insert customer balances | a | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | customer_balances | Permission-based update customer balances | w | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | customer_balances | Tenant members can view balances | r | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | ledger_entries | Permission-based insert ledger entries | a | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | ledger_entries | Tenant members can view ledger | r | true | `{0}` | 1 | 0 | PUBLIC | Yes |
| public | ledger_entries | Tenant members can view ledger entries | r | true | `{0}` | 1 | 0 | PUBLIC | Yes |

No NULL array, no empty array, no named role, no multi-role array, no restrictive policy, no unexpected role set. Nothing suppressed.

## H. PostgreSQL PUBLIC Representation Analysis

- Documentation contract: OID zero denotes PUBLIC and normally appears alone. (`OFFICIAL POSTGRESQL DOCUMENTATION FACT`)
- Live Dayli Horse state: every relevant policy stores `{0}`. (`LIVE DATABASE FACT`)
- The two agree. The documented representation is confirmed by, not substituted for, live evidence. No contradiction; no blocking condition triggered.
- Consequence: `cardinality(polroles) = 1` for all seven policies, so any predicate requiring cardinality 0 or NULL is unsatisfiable here.

## I. Prompt-15 Assertion Evaluation

Predicate evaluated: `p.polroles IS NULL OR cardinality(p.polroles) = 0`

| Policy | Raw value | Cardinality | Predicate result | Correct PUBLIC result | Difference |
|---|---|---|---|---|---|
| customer_balances / Permission-based delete customer balances | `{0}` | 1 | **false** | true | Inverted |
| customer_balances / Permission-based insert customer balances | `{0}` | 1 | **false** | true | Inverted |
| customer_balances / Permission-based update customer balances | `{0}` | 1 | **false** | true | Inverted |
| customer_balances / Tenant members can view balances | `{0}` | 1 | **false** | true | Inverted |
| ledger_entries / Permission-based insert ledger entries | `{0}` | 1 | **false** | true | Inverted |
| ledger_entries / Tenant members can view ledger | `{0}` | 1 | **false** | true | Inverted |
| ledger_entries / Tenant members can view ledger entries | `{0}` | 1 | **false** | true | Inverted |

Verdict: `PROMPT-15 POLROLES ASSERTION FAILS` — 0 of 7 satisfied; the predicate is universally false where it must be universally true.

Confirmed aborting/mis-reporting blocks in Prompt 15:

| Impact claimed in §7 | Confirmed? | Explanation |
|---|---|---|
| Forward precondition aborts before any change | **Confirmed** | The seven-policy PUBLIC-only precondition would find zero matching policies and raise |
| Forward postcondition reports false failure | **Confirmed** | The three retained read policies would each fail the PUBLIC-only check |
| Rollback postcondition aborts after recreating policies | **Confirmed** | Correctly recreated `{0}` policies would fail verification, rolling the emergency rollback back |
| Whole transaction rolls back despite correct SQL | **Confirmed** | All assertions are inside the single transaction; any raise reverts everything |
| Fingerprint cannot distinguish role sets | **Confirmed** | A boolean derived from a universally-false predicate carries zero role information; `{0}`, `{}`, `{authenticated}` and `{0,authenticated}` would all hash identically |
| Stage B receives a false readiness verdict | **Confirmed** | Prompt 15 declared the SQL executable; it was not |

## J. Final PUBLIC-Only Assertion

```sql
p.polpermissive
AND p.polroles = ARRAY[0::oid]
```

Justified by live evidence (`{0}` on all seven policies). Rejection behavior, by construction of array exact-equality plus the permissive conjunct:

| Input | Result |
|---|---|
| `NULL` roles | rejected (`NULL = ARRAY[0]` is NULL, not true) |
| `{}` empty array | rejected |
| `{authenticated_oid}` | rejected |
| `{0, authenticated_oid}` | rejected (ordering and cardinality both differ) |
| `{0,0}` duplicate | rejected |
| restrictive policy (`polpermissive = false`) | rejected |
| `{0}` permissive | accepted |

## K. Role-Aware Seven-Policy Matrix

| Schema | Table | Policy name | Cmd | Perm/Restr | Exact roles | USING | WITH CHECK |
|---|---|---|---|---|---|---|---|
| public | customer_balances | Permission-based delete customer balances | DELETE (`d`) | PERMISSIVE | `{0}` = PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | NULL (absent) |
| public | customer_balances | Permission-based insert customer balances | INSERT (`a`) | PERMISSIVE | `{0}` = PUBLIC | NULL (absent) | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| public | customer_balances | Permission-based update customer balances | UPDATE (`w`) | PERMISSIVE | `{0}` = PUBLIC | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| public | customer_balances | Tenant members can view balances | SELECT (`r`) | PERMISSIVE | `{0}` = PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | NULL (absent) |
| public | ledger_entries | Permission-based insert ledger entries | INSERT (`a`) | PERMISSIVE | `{0}` = PUBLIC | NULL (absent) | `has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)` |
| public | ledger_entries | Tenant members can view ledger | SELECT (`r`) | PERMISSIVE | `{0}` = PUBLIC | `is_tenant_member(auth.uid(), tenant_id)` | NULL (absent) |
| public | ledger_entries | Tenant members can view ledger entries | SELECT (`r`) | PERMISSIVE | `{0}` = PUBLIC | `(EXISTS ( SELECT 1 FROM tenant_members tm WHERE ((tm.tenant_id = ledger_entries.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.is_active = true))))` | NULL (absent) |

- Expressions are `pg_get_expr`-normalized and shown in full, not summarized.
- NULL expression is distinguished from `true`: none of the seven has a literal `true` expression; the blanks above are genuine catalog NULLs (no clause).
- Policy count is exactly seven — no additional policy exists on either table.
- Every policy is PUBLIC-only and PERMISSIVE.
- **Four write policies to be removed:** the three `Permission-based … customer balances` (d/a/w) and `Permission-based insert ledger entries`.
- **Three read policies to remain:** `Tenant members can view balances`, `Tenant members can view ledger`, `Tenant members can view ledger entries`.

## L. Final Fingerprint SQL, Canonical Strings and Hashes

Exact SQL used (read-only, executed this run):

```sql
WITH pol AS (
  SELECT n.nspname AS s, c.relname AS t, p.polname, p.polcmd::text AS cmd, p.polpermissive AS perm,
    COALESCE((SELECT string_agg(role_oid::text, ',' ORDER BY role_oid)
              FROM unnest(p.polroles) AS role_oid), '<NULL>') AS roles,
    COALESCE(pg_get_expr(p.polqual, p.polrelid), '<NULL>')      AS u,
    COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '<NULL>') AS w
  FROM pg_policy p
  JOIN pg_class c     ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('ledger_entries', 'customer_balances')
), can AS (
  SELECT
    string_agg(s||'|'||t||'|'||polname||'|'||cmd||'|'||perm::text||'|'||roles||'|'||u||'|'||w,
               E'\n' ORDER BY t, polname) AS pre_all,
    string_agg(s||'|'||t||'|'||polname||'|'||cmd||'|'||perm::text||'|'||roles||'|'||u||'|'||w,
               E'\n' ORDER BY t, polname) FILTER (WHERE cmd = 'r') AS post_read
  FROM pol
)
SELECT pre_all, md5(pre_all) AS pre_hash,
       post_read, md5(post_read) AS post_hash,
       (SELECT count(*) FROM pol) AS n_pol
FROM can;
```

Fingerprint distinguishes, by construction: PUBLIC `{0}` (`roles = '0'`) vs empty array (`roles = ''`) vs NULL array (`roles = '<NULL>'`) vs authenticated-only (`roles = '<auth oid>'`) vs PUBLIC-plus-another (`roles = '0,<oid>'`); permissive vs restrictive (`perm` element); changed command; changed USING or WITH CHECK; missing policy and added policy (both change the row set and therefore the aggregate). Ordering is stable via `ORDER BY role_oid` inside and `ORDER BY t, polname` outside. `md5` is a PostgreSQL built-in, non-mutating; no extension required.

**Complete canonical pre-state string (seven policies):**

```text
public|customer_balances|Permission-based delete customer balances|d|true|0|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)|<NULL>
public|customer_balances|Permission-based insert customer balances|a|true|0|<NULL>|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
public|customer_balances|Permission-based update customer balances|w|true|0|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
public|customer_balances|Tenant members can view balances|r|true|0|is_tenant_member(auth.uid(), tenant_id)|<NULL>
public|ledger_entries|Permission-based insert ledger entries|a|true|0|<NULL>|has_permission(auth.uid(), tenant_id, 'finance.invoice.edit'::text)
public|ledger_entries|Tenant members can view ledger|r|true|0|is_tenant_member(auth.uid(), tenant_id)|<NULL>
public|ledger_entries|Tenant members can view ledger entries|r|true|0|(EXISTS ( SELECT 1
   FROM tenant_members tm
  WHERE ((tm.tenant_id = ledger_entries.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.is_active = true))))|<NULL>
```

**Pre-state hash (7 policies): `e978f912777a28108f46ba79e2ce071e`**

**Complete canonical post-state string (three retained read policies):**

```text
public|customer_balances|Tenant members can view balances|r|true|0|is_tenant_member(auth.uid(), tenant_id)|<NULL>
public|ledger_entries|Tenant members can view ledger|r|true|0|is_tenant_member(auth.uid(), tenant_id)|<NULL>
public|ledger_entries|Tenant members can view ledger entries|r|true|0|(EXISTS ( SELECT 1
   FROM tenant_members tm
  WHERE ((tm.tenant_id = ledger_entries.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.is_active = true))))|<NULL>
```

**Post-state hash (3 policies): `04297828f4bd33eba043f6c9274ec57b`**

The Prompt-15 hash `44770e308a526915fb301bc951601450` is not reused and is superseded.

Note for the executor: the post-state string embeds the exact newline/indentation of `pg_get_expr` output for the third policy. It is reproduced verbatim above; the migration below recomputes it from the catalog rather than embedding it, so no transcription risk exists.

## M. Final Exact Forward Migration SQL

Complete and executable. **Not executed by this run.**

```sql
-- =====================================================================
-- RM-DH-004 / WS-DH-2026-0003 / STAGE B
-- Ledger & Customer Balance SELECT-only hardening,
-- browser-write policy removal, create_pos_sale EXECUTE revocation,
-- bounded SECURITY DEFINER helper search_path correction.
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
  FOR v_sig IN SELECT unnest(ARRAY['ledger_entries','customer_balances']) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_sig
        AND pg_get_userbyid(c.relowner) = 'postgres'
        AND c.relrowsecurity IS TRUE
        AND c.relforcerowsecurity IS FALSE
    ) THEN
      RAISE EXCEPTION
        'PRECONDITION FAILED: public.% must be owned by postgres with RLS enabled and FORCE RLS disabled', v_sig;
    END IF;
  END LOOP;

  -- 1.3 Exact eleven function identities, ownership, SECURITY DEFINER
  FOR v_sig IN
    SELECT unnest(ARRAY[
      'public.post_expense_with_ledger(uuid,uuid,uuid)',
      'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
      'public.post_payment_session(uuid,uuid,jsonb)',
      'public.get_payment_session(uuid,uuid)',
      'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)',
      'public.create_pos_sale(uuid,uuid,jsonb)',
      'public.has_permission(uuid,uuid,text)',
      'public.is_tenant_member(uuid,uuid)',
      'public.update_horse_identity(uuid,uuid,jsonb)',
      'public.complete_local_horse_record(uuid,uuid,jsonb)'
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

  -- 1.4 Canonical Finance RPC search paths must be the empty path
  FOR v_sig IN
    SELECT unnest(ARRAY[
      'public.post_expense_with_ledger(uuid,uuid,uuid)',
      'public.post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)',
      'public.post_payment_session(uuid,uuid,jsonb)',
      'public.get_payment_session(uuid,uuid)',
      'public.create_source_checkout_invoice(uuid,uuid,jsonb)',
      'public._finance_invoice_approve_inline(uuid,uuid,uuid)',
      'public.create_pos_sale(uuid,uuid,jsonb)'
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

  -- 1.5 Helper current search paths must be exactly 'public'
  FOR v_sig IN
    SELECT unnest(ARRAY['public.has_permission(uuid,uuid,text)',
                        'public.is_tenant_member(uuid,uuid)'])
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
  FOR v_sig IN SELECT unnest(ARRAY['ledger_entries','customer_balances']) LOOP
    SELECT count(*) INTO v_cnt
    FROM (VALUES ('anon'),('authenticated')) AS b(role_name),
         (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
                 ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')) AS pr(priv)
    WHERE has_table_privilege(b.role_name, format('public.%I', v_sig), pr.priv);
    IF v_cnt <> 16 THEN
      RAISE EXCEPTION
        'PRECONDITION FAILED: expected 16 browser privilege pairs on public.%, found %', v_sig, v_cnt;
    END IF;
  END LOOP;

  -- 1.8 Zero column-level ACLs on both tables
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

  -- 1.9 Zero browser-role inheritance
  SELECT count(*) INTO v_cnt
  FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
  WHERE r.rolname IN ('anon','authenticated');
  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected zero browser-role memberships, found %', v_cnt;
  END IF;

  -- 1.10 Exact seven-policy role-aware pre-state fingerprint
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

  -- 1.11 Exact current table comments (both currently absent)
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND obj_description(c.oid, 'pg_class') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected no existing table comment on either target table';
  END IF;

  -- 1.12 Current create_pos_sale EXECUTE state: browser roles can execute
  IF NOT (has_function_privilege('anon',          'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
      AND has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')) THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: expected anon and authenticated to currently hold EXECUTE on create_pos_sale';
  END IF;

  -- 1.13 service_role authority intact
  FOR v_sig IN SELECT unnest(ARRAY['ledger_entries','customer_balances']) LOOP
    IF NOT has_table_privilege('service_role', format('public.%I', v_sig), 'SELECT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_sig), 'INSERT')
    OR NOT has_table_privilege('service_role', format('public.%I', v_sig), 'UPDATE')
    OR NOT has_table_privilege('service_role', format('public.%I', v_sig), 'DELETE') THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: service_role authority missing on public.%', v_sig;
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

-- 2.5 Bounded SECURITY DEFINER helper correction (no body rewrite)
ALTER FUNCTION public.has_permission(uuid, uuid, text)  SET search_path = public, pg_temp;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)      SET search_path = public, pg_temp;

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

    -- 3.4 Table owner remains functional
    IF NOT has_table_privilege('postgres', format('public.%I', v_tbl), 'SELECT')
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

  -- 3.6 Canonical Finance RPC EXECUTE remains correct
  IF NOT has_function_privilege('authenticated', 'public.post_expense_with_ledger(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated lost EXECUTE on post_expense_with_ledger';
  END IF;

  -- 3.7 create_pos_sale is unreachable from the browser, retained for service_role
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

  -- 3.8 Helper proconfig equals the approved secure contract (text element, not Array display)
  FOREACH v_tbl IN ARRAY ARRAY['public.has_permission(uuid,uuid,text)',
                               'public.is_tenant_member(uuid,uuid)'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_tbl)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = 'public, pg_temp'
    ) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % does not carry search_path=public, pg_temp', v_tbl;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure(v_tbl) AND p.prosecdef) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % lost SECURITY DEFINER', v_tbl;
    END IF;
  END LOOP;

  -- 3.9 Exactly three policies remain, all PERMISSIVE, all PUBLIC-only, all SELECT
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

  -- 3.10 No write policy of any kind remains
  IF EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
      AND p.polcmd <> 'r'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: a non-SELECT policy still exists';
  END IF;

  -- 3.11 Three-policy role-aware post-state fingerprint
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

  -- 3.12 RLS still enabled
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

Zero financial rows change and Stage-A rows remain unchanged because the migration contains no `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `COPY` or `MERGE` against any business table — this is verifiable by inspection of the statement list in section 2.

## N. Final Exact Rollback SQL

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
-- PUBLIC held no table grant in the pre-state and is deliberately not granted.

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

-- ---------------------------------------------------------------------
-- 4. RESTORE THE EXACT PRIOR HELPER search_path
-- ---------------------------------------------------------------------
ALTER FUNCTION public.has_permission(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.is_tenant_member(uuid, uuid)     SET search_path = public;

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
  END LOOP;

  -- 6.2 Exactly seven policies, no duplicate
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances');
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: expected exactly 7 policies, found %', v_cnt;
  END IF;

  -- 6.3 All seven are PERMISSIVE and exactly PUBLIC-only
  SELECT count(*) INTO v_cnt
  FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('ledger_entries','customer_balances')
    AND p.polpermissive AND p.polroles = ARRAY[0::oid];
  IF v_cnt <> 7 THEN
    RAISE EXCEPTION
      'ROLLBACK VERIFY FAILED: expected 7 PERMISSIVE PUBLIC-only (polroles = {0}) policies, found %', v_cnt;
  END IF;

  -- 6.4 Exact seven-policy role-aware fingerprint, covering names, commands,
  --     role arrays and both expressions
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

  -- 6.5 Exact prior function EXECUTE state restored
  IF NOT has_function_privilege('anon',          'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('service_role',  'public.create_pos_sale(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: prior create_pos_sale EXECUTE state not restored';
  END IF;

  -- 6.6 Exact prior helper proconfig restored
  FOREACH v_tbl IN ARRAY ARRAY['public.has_permission(uuid,uuid,text)',
                               'public.is_tenant_member(uuid,uuid)'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p, LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
      WHERE p.oid = to_regprocedure(v_tbl)
        AND split_part(cfg, '=', 1) = 'search_path'
        AND btrim(substr(cfg, strpos(cfg, '=') + 1)) = 'public'
    ) THEN
      RAISE EXCEPTION 'ROLLBACK VERIFY FAILED: % does not carry the prior search_path=public', v_tbl;
    END IF;
  END LOOP;

  -- 6.7 Prior comment state restored (absent)
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

The rollback verification uses no total-count-alone check, no name-only check, no `polroles IS NULL`, no empty-array assumption, no substring check and no role-insensitive hash. It issues zero DML against financial business tables.

## O. Application Contract Confirmation

This audit introduces **no** change to the settled application execution contract. The future Stage B Agent/Build scope remains exactly: typed frontend wrapper for `post_expense_with_ledger`; Expense approval routed through the RPC; `expense_date` mapped as Economic Date; idempotency key; canonical RPC error-code handling; removal of `postLedgerForExpense`, `postLedgerForInvoice` and dead `useLedger.createEntry`; retention of `useLedgerEntries` and `useCustomerBalances` as read-only; removal of automatic runtime execution of `backfillLedgerDescriptions`; POS visible, Coming Soon, non-clickable, non-keyboard-activatable, inert direct route, no operational POS hook or writer mounted, `create_pos_sale` not activated. No additional application change is proposed; none is authorized.

## P. QA Additions

**17.1 Raw Catalog Verification** — all seven `polroles` values recorded (`{0}` ×7); all cardinalities recorded (1 ×7); all role OIDs resolved (0 → PUBLIC); PUBLIC represented exactly as `ARRAY[0::oid]`; no named role unexpectedly present.

**17.2 Forward Migration** — pre-state role-aware fingerprint matches `e978f912777a28108f46ba79e2ce071e`; post-state matches `04297828f4bd33eba043f6c9274ec57b`; all three retained policies PUBLIC-only; all PERMISSIVE; no write policy remains; no restrictive policy appears; migration transaction completes in an isolated test; no financial row changes.

**17.3 Rollback** — recreates exactly four write policies; creates no read-policy duplicate (verified by the 7-count plus fingerprint); all seven match the exact pre-state fingerprint; commands and expressions as expected; exact proven PUBLIC representation; transaction completes in isolation; Forward Migration reapplies successfully after Rollback; no financial row changes in either direction.

**17.4 Regression** — Expense RPC cutover unchanged; SELECT surfaces functional; Realtime reads functional; POS visible but inert; no operational POS request generated; helper permission checks remain tenant-safe after the `pg_temp` demotion; no Stage-A data changes.

Build and Typecheck alone are not Acceptance. Separate QA and a read-only Acceptance Re-Audit remain mandatory.

## Q. Deferred Items Register

| Item | Original evidence | Current status | Current lane | Future lane | Dependency | Risk if forgotten | Next trigger |
|---|---|---|---|---|---|---|---|
| Expense Browser Writer cutover | Prompt 11–12 writer audit | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | `post_expense_with_ledger` | Browser keeps writing financial truth | Stage B Agent/Build |
| Dead `useLedger.createEntry` removal | Prompt 11 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | Dead writer can be revived | Stage B Agent/Build |
| POS Safety Fencing | Prompt 11–12 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | None | Non-atomic POS writes reachable | Stage B Agent/Build |
| Ledger / Customer Balance SELECT-only hardening | Prompt 13 privilege audit | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | Policy drop | Direct-DML bypass of RPCs | Stage B migration |
| `create_pos_sale` browser EXECUTE revocation | Prompt 12 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | WS-DH-2026-0005 | None | Deferred POS writer callable | Stage B migration |
| `backfillLedgerDescriptions` automatic-run removal | Prompt 11 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | Unattended historical mutation | Stage B Agent/Build |
| Helper `public, pg_temp` correction | Prompt 14 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | TEMP-to-PUBLIC evidence | `pg_temp` shadowing in SECURITY DEFINER | Stage B migration |
| Seven-policy Rollback correction | Prompt 14 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | Pre-state fingerprint | Rollback cannot restore pre-state | Stage B migration |
| Robust proconfig assertion | Prompt 15 | PROMOTED TO CURRENT EXECUTION SCOPE | Stage B | — | None | False assertion failure on Array quoting | Stage B migration |
| `polroles` / PUBLIC representation correction | This Prompt 16 | PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE | Stage B | — | Live catalog | Migration aborts despite correct SQL | Stage B migration |
| Role-aware Policy fingerprint correction | This Prompt 16 | PROMOTED TO CURRENT CONTRACT-CORRECTION SCOPE | Stage B | — | Live catalog | Role changes undetected | Stage B migration |
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
| Manual Ledger Adjustment product workflow | Prompt 12 | DEFERRED — TRACKED | — | Later Phase | SELECT-only hardening | No adjustment path after hardening | Adjustment workstream |
| Residual financial-table privilege hardening | Prompt 13 | DEFERRED — TRACKED | — | Later Phase | Stage B precedent | Other finance tables stay open | Follow-on privilege audit |
| Full schema qualification of `has_permission` | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Body rewrite authorization | Residual resolution risk | Helper-body workstream |
| Duplicate Ledger SELECT policy review | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Policy consolidation | Two overlapping read policies persist | Policy cleanup workstream |
| Database-level TEMP grant to PUBLIC review | Prompt 14 | DEFERRED — TRACKED | — | Later Phase | Platform constraints | Broad TEMP remains | Platform hardening review |

No item removed. No item promoted beyond what is directly required to correct the `polroles` contract.

## R. Zero-Regression Confirmation

- **Stage A** — no financial-row query, no DML, no Stage-A row touched. No regression.
- **Expense cutover** — unchanged; `post_expense_with_ledger` confirmed present and correctly configured. No regression.
- **POS contract** — unchanged; POS remains visible/inert and `create_pos_sale` remains deactivated. No regression.
- **SELECT-only strategy** — unchanged; REVOKE ALL then GRANT SELECT preserved verbatim. No regression.
- **Helper strategy** — unchanged; bounded `SET search_path = public, pg_temp`, no body rewrite. No regression.
- **proconfig contract** — unchanged; robust text-element assertion retained and independently re-confirmed by live evidence. No regression.
- **Deferred Items Register** — complete and unchanged apart from two additions required by this correction. No regression.

`ZERO REGRESSION TO PRESERVED FINDINGS CONFIRMED`

## S. Blockers and Gaps

None.

Two non-blocking observations, recorded and explicitly out of scope: platform `sandbox_exec*` roles hold SELECT+INSERT on both tables and EXECUTE on `create_pos_sale`; `relforcerowsecurity` is false on both tables.

## T. WORKSTREAM PERSISTENCE

`WORKSTREAM PERSISTENCE:
NONE — READ-ONLY POLROLES, PUBLIC-ROLE,
ROLE-AWARE POLICY-FINGERPRINT AND FINAL MIGRATION-EXECUTABILITY
CORRECTION AUDIT ONLY.

Stage A remains accepted, persisted and verified.

WS-DH-2026-0003 remains ACTIVE.

Stage B implementation has not started.

The Prompt-12 through Prompt-15 application, POS, privilege,
helper, proconfig and Deferred-Item contracts remain preserved,
except for the explicitly withdrawn Prompt-15 policy-role assertion.

No governance file was modified.

Stage C and Stage D have not started.

No Workstream Closure occurred.`

## U. ROADMAP IMPACT

`ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 1.

This correction audit does not complete Phase 1.

WS-DH-2026-0005 remains DEFERRED.

No new Roadmap, Phase, Workstream or Decision ID was created.

No Phase advancement, Phase Closure or Roadmap Closure occurred.`

## V. Run Metadata and Exact Stopping Point

1. Mode: Plan/Chat — Read-Only.
2. Operation: Targeted `pg_policy.polroles` live representation audit, PUBLIC-role contract correction, role-aware policy fingerprint completion, final Forward/Rollback executability closure, Stage B execution readiness determination.
3. Prompt ID: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-B-FINAL-POLROLES-PUBLIC-REPRESENTATION-AND-POLICY-FINGERPRINT-CORRECTION-AUDIT-16.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026. 6. Time: 23:38. 7. Timezone: Asia/Riyadh — UTC+03:00.
8. Run Start Date and Time: 03-08-2026, 23:38 Asia/Riyadh (message receipt).
9. First evidenced activity: raw `pg_policy` catalog query on `public.ledger_entries` and `public.customer_balances`.
10. Run End Date and Time: Exact time not recorded.
11. Last evidenced activity: table-level privilege, ownership, RLS and comment query.
12. Final Report Date and Time: Exact time not recorded.
13. Timestamp evidence source: platform message clock.
14. PostgreSQL version: PostgreSQL 17.6 on aarch64-unknown-linux-gnu.
15. Current database name: `postgres`. 16. Database owner: `postgres`.
17. Branch: `edit/edt-1629dbca-22c7-427d-83d9-b7df3324659e`.
18. Canonical/default branch evidence: `refs/remotes/origin/HEAD` → `refs/remotes/origin/main`.
19. HEAD before: `2133b5f3413e7ab97be739a07332087e9a9ec54e`. 20. HEAD after: unchanged.
21. Working tree before: clean. 22. Working tree after: clean.
23. Staged paths before/after: none / none. 24. Unstaged: none / none. 25. Untracked non-ignored: none / none.
26. Repository paths read: none this run — all evidence came from the live catalog.
27. Database objects read: `pg_policy`, `pg_class`, `pg_namespace`, `pg_roles`, `pg_auth_members`, `pg_proc`, `pg_attribute`, `pg_database`, `aclexplode`, `pg_get_expr`, `obj_description`, `md5`.
28. Catalog queries executed: three, all read-only SELECT.
29. Financial-row queries: zero. 30. Database role: `supabase_read_only_user`.
31. Raw `polroles` values: `{0}` for all seven policies.
32. Policy cardinalities: 1 for all seven.
33. Resolved role OIDs: 0 → PUBLIC for all seven.
34. Prompt-15 predicate results: false for all seven — assertion fails.
35. Final PUBLIC-only assertion: `p.polpermissive AND p.polroles = ARRAY[0::oid]`.
36. Seven-policy pre-state canonical string: §L. 37. Pre-state hash: `e978f912777a28108f46ba79e2ce071e`.
38. Three-policy post-state canonical string: §L. 39. Post-state hash: `04297828f4bd33eba043f6c9274ec57b`.
40. Exact Forward Migration result: `FINAL FORWARD MIGRATION SQL EXECUTABLE` (authored, not executed).
41. Exact Rollback result: `FINAL ROLLBACK SQL EXECUTABLE` (authored, not executed).
42. Deferred items preserved: all 17 deferred entries. 43. Deferred items promoted: 11 current-scope items, of which 2 are new contract corrections from this Prompt.
44. Repository changes: zero. 45. Database changes: zero. 46. Migration changes: zero. 47. Financial-row changes: zero.
48. Project Knowledge changes: zero. 49. Workspace Knowledge changes: zero. 50. Skill changes: zero. 51. Settings changes: zero.
52. `.lovable/plan.md` disclosure: this report is held in `.lovable/plan.md`, the platform-generated planning artifact governed by `docs/CONVENTIONS.md` §11.10. It is the only file touched this run and it is not governance persistence.
53. Eight required verdicts: §A.
54. Stage B implementation: not started. 55. Stage C: not started. 56. Stage D: not started. 57. QA: not started. 58. Acceptance: not started. 59. Closure: none.
60. **Exact stopping point:** The prior Prompt-15 PUBLIC-role error has been explicitly withdrawn. The live `pg_policy.polroles` representation, exact PUBLIC-only contract, role-aware seven-policy pre-state, three-policy post-state, executable Forward Migration, executable Rollback, preserved application scope, zero-regression confirmation, and complete Deferred Items Register have been established. No implementation, migration, financial-data change, Stage C, Stage D, QA, Acceptance or Closure has occurred.
61. **One recommended next step:** Issue the complete Stage B Agent/Build Execution Prompt carrying the §M Forward Migration, the §N Rollback and the §O application contract verbatim.
62. **Recommended next Mode:** Agent/Build.
