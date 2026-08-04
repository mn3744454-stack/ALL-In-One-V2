# STAGE B — DATABASE AUTHORITY POST-EXECUTION QA (PROMPT-25)

Read-only independent verification. No migration, DDL, DML, RPC, rollback execution, commit or governance write was performed.

## C. LOVABLE CORRECTION ACKNOWLEDGEMENT

LOVABLE CORRECTION ACKNOWLEDGEMENT:

The Prompt-24 strict byte-identity verdict is withdrawn because
Prompt 24 also disclosed that the platform removed one terminal
newline from the applied payload.

The Prompt-24 WORKSTREAM PERSISTENCE: NONE statement is withdrawn
because a durable Emergency Rollback evidence artifact was written
under the WS-DH-2026-0003 evidence path.

The Forward State-B fingerprints, financial-row invariance claim,
application static-verification findings and successful migration
claim remain subject to independent verification in this Prompt and
are not rejected merely because of those reporting defects.

No correction migration, migration rename or Emergency Rollback is
authorized by this correction.

## I. Repository preflight

| Item | Value |
| --- | --- |
| Branch | `edit/edt-8cb306e3-7c8c-4555-ac4a-0995a9d45df1` |
| HEAD | `d140562fd10606b10b7421a1ca6cc640d34e75f9` |
| Working tree | clean (no staged / unstaged / untracked paths) |
| Latest migration | `20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql` |
| Later migrations touching target objects | none |

## J/K. Changed-path attribution and Forward migration identity

| Path | Change | Classification |
| --- | --- | --- |
| `supabase/migrations/20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql` | Added (commit `1e262d86`) | Forward migration persistence |
| `docs/.../stage-b-database-authority/rollback.sql` | Added (commit `66f9b573`) | Workstream evidence persistence |

Forward migration exact identity:
- byte length `20504`; line count `422`
- SHA-256 `602804b939876ee3a2a19114296de3ff080aafc574a3b0913bed1fa6e80baa5f`
- Git blob `6e710c1246b733ae123824477004e710ba38ad37`
- final bytes `0a 24 73 74 61 67 65 5f 62 5f 70 6f 73 74 24 3b` → file ends with `$stage_b_post$;`, **no terminal newline**

Verdict: `PROMPT-24 CHANGED PATHS FULLY ATTRIBUTED`

## L. Forward migration content audit

Permanent mutations found (only these): 4 × `DROP POLICY` (customer_balances delete/insert/update, ledger_entries insert); 2 × `REVOKE ALL` (both tables, browser roles); 2 × `GRANT SELECT`; 1 × `REVOKE EXECUTE` (`create_pos_sale`); 3 × `ALTER FUNCTION … SET search_path`; 2 × `COMMENT ON TABLE`. No financial DML, no Stage-A DML, no function body replacement, no new/replaced policy, no FORCE RLS, no owner/schema/service-role/platform-role privilege change. 31 guarded `RAISE EXCEPTION` assertions present. No literal `BEGIN;`/`COMMIT;` (platform wrapper).

Verdict: `FORWARD MIGRATION CONTENT EXACTLY WITHIN AUTHORIZED SCOPE`

## M/N/O/P. History, filename, payload, atomicity

`supabase_migrations.schema_migrations` version `20260804083738`, name `3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78`: exactly **1** record, **1** statement array element, payload SHA-256 `602804b939876ee3a2a19114296de3ff080aafc574a3b0913bed1fa6e80baa5f` — identical to the file SHA-256. No correction migration; no duplicate version; no history gap.

- `PLATFORM-GENERATED MIGRATION NAME VERIFIED` (name column is the platform UUID, timestamp-prefixed filename produced by the migration tool)
- `STRICT MIGRATION BYTE IDENTITY EXACTLY MATCHES` (raw applied payload hash equals raw file hash; the Prompt-24 newline claim is moot — the persisted file itself carries no terminal newline)
- `SINGLE-TRANSACTION APPLICATION EVIDENCE SUFFICIENT` (one migration version, one statement, one success record, all postconditions in-file; PostgreSQL 17.6 confirmed live)

## Q. Policy State B

Row count `3`; hash `04297828f4bd33eba043f6c9274ec57b` — matches. Zero INSERT/UPDATE/DELETE policies remain on the two tables.
Verdict: `POLICY STATE-B FINGERPRINT EXACTLY MATCHES`

## R/T. Table-ACL State B

Row count `44`; canonical length `2001`; hash `204017a1207bc68a246c3415e3975478` — matches. anon/authenticated hold **SELECT only, non-grantable** on both tables; zero PUBLIC grant; zero column ACL; zero browser-role inheritance; postgres, service_role, `sandbox_exec`, `sandbox_exec_vhxglsvxwwpmoqjabfmj` matrices intact.
Verdict: `TABLE-ACL STATE-B FINGERPRINT EXACTLY MATCHES`

## S/U. Function-ACL State B — DEVIATION

Recomputed with the exact Prompt-20 algorithm over the fourteen frozen functions:

| Field | Expected (State B) | Current |
| --- | --- | --- |
| Row count | 63 | **49** |
| Hash | `f2507d9a41a1bc76319b553328d8dd09` | **`3e807d782287d88bea69edeece0bb424`** |

Cause isolated: **all 14 missing rows are `sandbox_exec` EXECUTE grants**. Live catalogue shows `sandbox_exec` currently holds `0` function grants in `public` while holding `328` table grants; `sandbox_exec_vhxglsvxwwpmoqjabfmj` holds `286` function grants. This is platform sandbox-role provisioning drift, not an authority regression.

Browser/authority matrix is nonetheless exactly as required:
- `_finance_ledger_insert`, `_finance_invoice_approve_inline`: PUBLIC / anon / authenticated EXECUTE all **false**
- `create_pos_sale`: PUBLIC / anon / authenticated **false**; postgres, service_role, platform role **true**; no grant option
- Every external wrapper retains its `authenticated` EXECUTE grant; no grant option anywhere

Verdict: `FUNCTION-ACL STATE-B FINGERPRINT FAILED` (deviation confined to the platform `sandbox_exec` role; intended browser and service authority verified intact)

## V. Function and helper integrity

| Helper | OID | Owner | SECDEF | proconfig |
| --- | --- | --- | --- | --- |
| `has_permission(uuid,uuid,text)` | 47231 | postgres | true | `search_path=public, pg_temp` |
| `is_tenant_member(uuid,uuid)` | 17622 | postgres | true | `search_path=public, pg_temp` |
| `is_active_tenant_member(uuid,uuid)` | 66253 | postgres | true | `search_path=public, pg_temp` |

OIDs unchanged (no drop/recreate), all fourteen finance/POS signatures resolve, owners postgres, SECURITY DEFINER true. Body identity is proven by migration content (no `CREATE OR REPLACE`) and OID stability, not by a pre-execution body byte fingerprint.
Verdict: `FUNCTION AND HELPER INTEGRITY VERIFIED`

## W. Table, comment, RLS and trusted-schema state

Both tables: owner postgres, RLS true, FORCE RLS false, column ACL 0, approved Stage-B comments applied verbatim. Schema `public`: anon CREATE false, authenticated CREATE false. Browser-role memberships: 0.
Verdict: `TABLE AND TRUSTED-SCHEMA STATE-B VERIFIED`

## X. Financial-row invariance

| Table | Prompt-24 post | Current | Match |
| --- | --- | --- | --- |
| `public.ledger_entries` | 88 / `23e73fd5…b2f2` | 88 / `23e73fd58f9308913ac978acee94b2f2` | yes |
| `public.customer_balances` | 8 / `22e38d16…4012` | 8 / `22e38d161b126cca31f4c26830084012` | yes |

Full Prompt-24 values are recoverable verbatim from the bound rollback artifact header (lines 30–31), which records the same 32-character hashes. Migration contains no financial DML; no later migration touches these tables.
Verdict: `ZERO FINANCIAL-ROW CHANGE INDEPENDENTLY CONFIRMED`

## Y. Application static compatibility

Typecheck exit 0; production build exit 0; Vitest `268 passed / 1 failed (269)` — the single failure is the pre-existing `InvoicePDFGenerator` Arabic `dir=rtl` assertion proven pre-existing in Prompt 23. Working tree remained clean after all runs.
Verdict: `APPLICATION STATIC COMPATIBILITY PASSED — PRE-EXISTING FAILURE UNCHANGED`

## Z/AA. Emergency rollback artifact

Path `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/evidence/stage-b-database-authority/rollback.sql`; byte length `17396`; SHA-256 `62be2f2773dddc0b8e1aab33aaef4b70c9ba304df5cc8879f616e32c74460baa`; Git blob `05c7480ff0061d37320213d907e6b105c42a60ec`; committed in `66f9b573`. Not executed.

Binding metadata present and correct: bound forward path + SHA-256 + byte length, State-A (7/`e978f912…`, 72/`f1567096…`, 65/`b4138d2f…`), State-B (3/`04297828…`, 44/`204017a1…`, 63/`f2507d9a…`), financial invariants. Contains `BEGIN`, State-B preconditions, exact inverse mutations (4 policy recreations, 2 table grants, 1 POS EXECUTE grant, 3 helper `search_path` restorations, 2 comment removals), State-A postconditions.

Blocking observation: its precondition at line 108 requires Function-ACL `63 / f2507d9a…`. Because live state is now `49 / 3e807d78…`, the artifact **would abort on precondition** if invoked today.
Verdict: `ROLLBACK ARTIFACT COMPLETE AND CORRECTLY BOUND — CURRENTLY NON-EXECUTABLE UNDER ITS OWN FUNCTION-ACL PRECONDITION`

## AB. Workstream evidence-persistence correction

WORKSTREAM EVIDENCE PERSISTENCE: ONE EMERGENCY-ROLLBACK EVIDENCE ARTIFACT WAS WRITTEN.
ACCEPTANCE PERSISTENCE: NONE.
CLOSURE PERSISTENCE: NONE.

## AE/AF/AG. Final verdict, gaps, recommendation

`DATABASE QA CONDITIONAL PASS — FUNCTION-ACL FINGERPRINT DEVIATION OUTSTANDING`

Passing: migration history, strict payload byte identity, single-transaction evidence, policy fingerprint, table-ACL fingerprint, helper/function integrity, table/comment/RLS/trusted-schema state, financial-row invariance, application static compatibility, rollback artifact completeness.

Single gap: Function-ACL fingerprint `49/3e807d78…` vs frozen `63/f2507d9a…`, entirely attributable to absent `sandbox_exec` EXECUTE grants (platform-managed role). No intended-authority regression detected.

Recommendation — Owner decision required before Acceptance:
1. Accept a re-baselined State-B Function-ACL fingerprint that excludes platform sandbox roles from the canonical set (recommended, since sandbox roles are ephemeral and outside the security contract), and re-bind the rollback precondition accordingly; or
2. Treat the deviation as blocking and require a platform-side explanation of `sandbox_exec` grant provisioning before Acceptance.

No repository or database write is proposed by this QA. `.lovable/plan.md` is the only path written this turn (Plan Mode artifact).

## AJ. Run metadata

Run date 2026-08-04, Asia/Riyadh; HEAD `d140562f`; database `vhxglsvxwwpmoqjabfmj`, PostgreSQL 17.6. Exact stopping point: Database QA verdict returned; no Acceptance, no Closure, no rollback, no correction migration.
