# STAGE B — PLATFORM SANDBOX-ROLE PROVENANCE, FUNCTION-ACL VOLATILITY, STABLE FINGERPRINT SCOPE AND ROLLBACK-REBINDING OWNER-ALIGNMENT AUDIT (PROMPT-26)

Read-only. No repository file other than `.lovable/plan.md` was written; no DDL, DML, RPC, migration, rebaseline, grant restoration, rollback execution, Acceptance or Closure occurred.

## C. LOVABLE CORRECTION ACKNOWLEDGEMENT

LOVABLE CORRECTION ACKNOWLEDGEMENT:

The Prompt-25 DATABASE QA CONDITIONAL PASS verdict is withdrawn.

The governing Prompt-25 final verdict is corrected to:

DATABASE AUTHORITY POST-EXECUTION QA FAILED —
ACCEPTANCE REMAINS BLOCKED.

The Prompt-25 custom Rollback description is retained as explanatory
evidence, but the governing Rollback verdict is corrected to:

EMERGENCY ROLLBACK ARTIFACT QA FAILED — NOT EXECUTED.

A Function-ACL contract regression is confirmed because the frozen
63-row platform-inclusive State-B fingerprint no longer matches the
49-row live state.

No browser-authority, authenticated-wrapper, service-role,
owner-authority, application or financial-row regression is inferred
from that platform-role-only difference.

No rebaseline, grant restoration, correction migration, Rollback
execution, Acceptance or Closure is authorized by this correction.

## I. Live preflight (Stage 0)

Branch `edit/edt-8cb306e3-7c8c-4555-ac4a-0995a9d45df1`; HEAD `d140562fd10606b10b7421a1ca6cc640d34e75f9`; working tree clean (no staged, unstaged or untracked paths). Database `vhxglsvxwwpmoqjabfmj`, PostgreSQL 17.6; read role `supabase_read_only_user`; evidence time 2026-08-04 13:44 Asia/Riyadh.

| Contract | Expected | Live | Result |
| --- | --- | --- | --- |
| Policy | 3 / `04297828f4bd33eba043f6c9274ec57b` | identical | unchanged |
| Table ACL | 44 / `204017a1207bc68a246c3415e3975478` | identical | unchanged |
| All-role Function ACL | 49 / `3e807d782287d88bea69edeece0bb424` | identical | unchanged since Prompt 25 |
| Ledger | 88 / `23e73fd58f9308913ac978acee94b2f2` | identical | unchanged |
| Customer balances | 8 / `22e38d161b126cca31f4c26830084012` | identical | unchanged |

No later migration touches the target objects; no browser-authority expansion; no authenticated wrapper loss; no service-role loss; no owner-authority loss; no financial-row drift. No material drift outside the Prompt-25 finding.

## J/K/L. Role identity and provenance (Stage 1)

| Property | `sandbox_exec` | `sandbox_exec_vhxglsvxwwpmoqjabfmj` |
| --- | --- | --- |
| OID | 127690 | 123688 |
| Exists | yes | yes |
| rolsuper / rolinherit | false / true | false / true |
| rolcreaterole / rolcreatedb | false / false | false / false |
| rolcanlogin / rolreplication | true / false | true / false |
| rolbypassrls | true | true |
| Connection limit / valid-until | −1 / none | −1 / none |
| Member of | none | none |
| Members | postgres | postgres |
| Comment | none | none |
| Owns objects in `public` | 0 relations, 0 functions | 0 relations, 0 functions |
| Schema `public` | USAGE true, CREATE false | USAGE true, CREATE false |
| Target tables | SELECT + INSERT on both (part of the accepted 44-row State B) | SELECT + INSERT on both |
| Fourteen functions | **0 grants** | 14 EXECUTE grants (one per function, non-grantable) |
| Other `public` function grants | 0 | 286 |
| Table grants across `public` | 328 | (platform-wide, unchanged) |
| Grantor for all above | postgres | postgres |
| Repository references | none (`rg sandbox_exec` over all non-`docs` paths returns nothing; the Forward migration contains no `sandbox` token) | none |
| Provenance | `PLATFORM-MANAGED — INFERRED` (high confidence) | `PLATFORM-MANAGED — INFERRED` (high confidence) |

Provenance basis: neither role is created, granted or referenced by any project migration or source file; both are owned by nobody, hold `rolbypassrls` + login, are granted to `postgres`, and follow the Lovable sandbox naming convention. No authoritative platform documentation was consulted (external-source rule), so the classification stays `INFERRED`, not `DIRECTLY PROVEN`.

Volatility evidence: the **generic** role has the *higher* OID (127690) than the project-specific role (123688), with 12 `public` relations and 134 `public` functions carrying OIDs in between — i.e. `sandbox_exec` as it exists today was created **after** the project-specific role and after much of the finance surface. That is consistent with drop-and-recreate of the generic role, which would silently discard every EXECUTE grant previously recorded against the old OID while table grants were re-provisioned.

## N/O. Drift timeline (Stage 2)

| Evidence point | Time | Source | Generic role grants on the 14 fns | All-role count/hash | Class |
| --- | --- | --- | --- | --- | --- |
| J5.1 preflight grant dumps | pre-Stage-B | `docs/aml_1_b_1/stage_j5_1/preflight/01_fn_*_grants.txt` (`sandbox_exec EXECUTE`) | present for finance functions | not computed then | direct historical fact |
| Prompt-20 State-A fingerprint | Stage-B design | preserved artifact | included (65 rows) | 65 / `b4138d2f6c8bf2ca01c41d437976d116` | claim (hash only) |
| Prompt-24 preflight / postcondition | 2026-08-04 ~08:37 UTC | in-migration assertions + rollback header | asserted included (63 rows) | 63 / `f2507d9a41a1bc76319b553328d8dd09` | in-transaction claim |
| Prompt-25 QA | 2026-08-04 ~10:2x UTC | independent live query | **absent** | 49 / `3e807d782287d88bea69edeece0bb424` | direct fact |
| Prompt-26 (now) | 2026-08-04 13:44 Riyadh | independent live query | **absent** | 49 / `3e807d782287d88bea69edeece0bb424` | direct fact |

- Last directly proven presence: the J5.1 preflight grant dumps (pre-Stage-B).
- First directly proven absence: Prompt-25 QA.
- Narrowest **independently proven** window: between the Prompt-24 in-transaction postcondition (~08:37 UTC) and the Prompt-25 query (~10:2x UTC) — roughly a two-hour window; the Prompt-24 `63` value was computed *inside* the migration transaction and was never independently re-queried after commit.
- The Forward migration SQL cannot have removed them: it contains no `sandbox` token and its only `REVOKE EXECUTE` targets PUBLIC/anon/authenticated on `create_pos_sale`.
- Migration-tool normalization is excluded: applied payload SHA-256 equals the file SHA-256.
- A separate platform process is *evidenced indirectly* (OID ordering, table-vs-function grant asymmetry) but no log identifies a role-provisioning event; no database log surface is available to this read role.

Verdict: `GENERIC SANDBOX GRANTS WERE NEVER INDEPENDENTLY PROVEN AFTER PROMPT 24` (with the narrowest proven window recorded above).

## P/Q. Runtime and security impact (Stage 3)

| Consumer | Needs `sandbox_exec` EXECUTE on the 14 fns? | Evidence |
| --- | --- | --- |
| Browser end users (anon/authenticated) | no | wrappers grant `authenticated` directly; live matrix intact |
| Authenticated Finance RPCs | no | all wrapper grants present |
| service_role backend / Edge Functions | no | service_role grants present |
| Lovable preview | no | preview uses anon/authenticated |
| Lovable DB inspection (this QA) | no | executed successfully as `supabase_read_only_user` |
| Migration execution | no | migrations run as `postgres` |
| Tests / scheduled jobs / integrations | no observed dependency | no repository reference to the role |

| Authority domain | Original State B | Current | Difference | Security impact | Runtime impact |
| --- | --- | --- | --- | --- | --- |
| PUBLIC | none | none | none | none | none |
| anon | none on the 14 | none | none | none | none |
| authenticated | 10 wrapper grants | identical | none | none | none |
| service_role | present | identical | none | none | none |
| postgres | present | identical | none | none | none |
| `sandbox_exec` | 14 EXECUTE | **0** | −14 | privilege **contraction** | tooling-only; no proven runtime loss |
| `sandbox_exec_vhxglsvxwwpmoqjabfmj` | 14 EXECUTE | 14 EXECUTE | none | none | none |

Classification: privilege contraction confined to a platform tooling role; **no privilege expansion**, **no proven runtime loss**.

## R/S. Contract forks (Stage 4)

| Criterion | Option A (platform-inclusive) | Option B (exclude all sandbox roles) | Option C (exclude generic only) |
| --- | --- | --- | --- |
| Direct evidence support | weak — depends on a role proven volatile | strong | medium |
| Security strength | same | same (stable roles fully covered) | same |
| Runtime compatibility | full | full | full |
| Platform compatibility | poor — fights platform provisioning | high | medium |
| Volatility | high | none observed | one platform dependency remains |
| Portability | low | high | medium |
| Maintenance burden | recurring | low | medium |
| Rollback impact | executable again once grants restored | full rebinding required | full rebinding required |
| Database write required | **yes** (grant restoration / correction migration) | no | no |
| Repository write required | rollback retained as-is | new artifact + rollback reissue | new artifact + rollback reissue |
| Future drift risk | high | low | medium |
| Acceptance reliability | low | high | medium |
| Reversibility | reversible | reversible | reversible |
| Primary risk | platform re-removes grants and re-blocks Acceptance | historical 63/65 artifacts become observational only | project-role drift can block a later Acceptance |
| Recommendation | not recommended | **RECOMMENDED** | acceptable fallback |

Recommended: **Option B** — the Acceptance fingerprint should cover exactly the roles the security contract governs (PUBLIC, anon, authenticated, service_role, postgres); sandbox roles move to a separate non-blocking observation artifact.

## T–Y. Candidate fingerprint artifacts (Stage 5) — candidates only, not approved

`HISTORICAL ALL-ROLE FUNCTION-ACL OBSERVATION — CURRENT STATE-B`: 49 rows / MD5 `3e807d782287d88bea69edeece0bb424` (Prompt-20 algorithm unchanged, grantee/grantor rendered as OIDs).

Candidate stable algorithm: line = `schema_qualified_identity|grantor_rolname|grantee_rolname|privilege_type|is_grantable`, identity via `format('%I.%I(%s)', nspname, proname, pg_get_function_identity_arguments(oid))`, grantee OID 0 → `PUBLIC`, separator `E'\n'`, ascending line order, `<NULL>` for nulls, no OIDs in the string.

| Artifact | Rows | Byte length | MD5 | SHA-256 |
| --- | --- | --- | --- | --- |
| `CANDIDATE STABLE SECURITY FUNCTION-ACL FINGERPRINT V1 — OPTION B — STATE B` | 35 | 5277 | `31a3c711f72f419e75f89a234a9923cc` | `67128e3269272e695b4452247eed409378b5f30d10c5df54a9d6b617abeea404` |
| `CANDIDATE STABLE SECURITY FUNCTION-ACL FINGERPRINT V1 — OPTION B — STATE A` (synthetic) | 37 | 5422 | `bb59784870a414bfae5a18914453d5d4` | `460c8e0e9e74921417ee843f459176dddd4314d6ceaffc4fb7422236e2fe7353` |
| `CANDIDATE STABLE SECURITY FUNCTION-ACL FINGERPRINT V1 — OPTION C — STATE B` | 49 | 7727 | `2fc78dc1b812ccb3030dc4911c76ab2d` | `f65f9d8edf0f03df4340e161dee6567c675518889ae895f672bb1c64c9e02003` |
| `CANDIDATE STABLE SECURITY FUNCTION-ACL FINGERPRINT V1 — OPTION C — STATE A` (synthetic) | 51 | 7872 | `4847953e3810414405efd6c2111158f9` | `9ccc2cd521705ed1edccb564baaf16145070c5a03b9884d759c8a487edea1135` |
| `CANDIDATE PLATFORM SANDBOX FUNCTION-ACL OBSERVATION V1 — CURRENT STATE` | 14 | 2449 | `9fa9afcfb207e5911f8b17eafc8e9adb` | `398631e3b7093b600e1faf37a1468b76b5522acee141659ec90cfb33a45fdd4b` |

The two synthetic State-A rows added by CTE values only (live ACL untouched):
`public.create_pos_sale(uuid,uuid,jsonb)|postgres|anon|EXECUTE|false` and `…|postgres|authenticated|EXECUTE|false`. Proof that no other stable-role State-A/State-B delta exists: the Forward migration's only function-privilege statement is the single `REVOKE EXECUTE … create_pos_sale` from PUBLIC/anon/authenticated, and PUBLIC held none.

Platform observation artifact roles actually observed: `sandbox_exec_vhxglsvxwwpmoqjabfmj` (OID 123688) with 14 EXECUTE rows; `sandbox_exec` (OID 127690) contributes **zero** rows. Evidence time 2026-08-04 13:44 Riyadh.

Complete Option-B canonical string (35 lines) was produced in full during this run and is reproducible verbatim from the algorithm above; the wrapper matrix is: `authenticated` on `approve_invoice`, `cancel_invoice`, `create_invoice_with_items`, `create_source_checkout_invoice`, `delete_draft_invoice`, `post_expense_with_ledger`, `post_invoice_payments`, `post_manual_ledger_adjustment`, `post_payment`, `post_payment_session`, `update_invoice_with_items`; `service_role` on all except `cancel_invoice`, `create_invoice_with_items`, `post_invoice_payments`, `update_invoice_with_items`; `postgres` on all fourteen; zero PUBLIC and zero anon rows; zero grant options.

## Z/AA. Rollback-rebinding impact (Stage 6)

| Concern | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Current State-B precondition (63/`f2507d9a…`) | passes again after grant restoration | must be replaced | must be replaced |
| State-A postcondition (65/`b4138d2f…`) | retained | replaced by 37/`bb597848…` | replaced by 51/`4847953e…` |
| Algorithm / role scope | all roles | stable five roles | stable five + project sandbox role |
| Sandbox roles | inside the gate | non-blocking observation section | generic role observational only |
| Live DB change required | yes | no | no |
| Artifact replacement only | no | yes | yes |
| Forward migration identity | remains authoritative (`602804b9…baa5f`) | remains authoritative | remains authoritative |
| Financial invariants | unchanged | unchanged | unchanged |
| Emergency usability after correction | restored but fragile | restored and stable | restored, one dependency |
| Future drift sensitivity | high | low | medium |

Correction-scope verdict (based on the recommended Option B): `ROLLBACK ARTIFACT CORRECTION ONLY REQUIRED` — as a complete reissue, never a patch, and not in this Prompt.

## AB. Owner alignment decision package

1. **Platform role classification** — classify both sandbox roles as platform-managed infrastructure roles outside the security contract.
2. **Stable fingerprint scope** — adopt Option B (PUBLIC, anon, authenticated, service_role, postgres) for Acceptance.
3. **Historical artifacts** — preserve the 65/63-row platform-inclusive fingerprints as observational history; do not delete or restate them as Acceptance gates.
4. **Rollback correction** — authorize a single full reissue of `rollback.sql` bound to the candidate Option-B State-A/State-B hashes plus a non-blocking platform-observation section, retaining the Forward path/SHA-256 and financial invariants.
5. **Next prompt mode** — Execution (repository-write only, no database write) to produce the reissued rollback artifact and the approved fingerprint artifact, followed by a targeted Acceptance re-audit.

## AD/AE. Blockers, gaps, next step

- Blocker: Acceptance remains blocked while the governing Function-ACL contract is the platform-inclusive 63-row fingerprint.
- Gap: no log-level proof of the role-provisioning event; drift attribution rests on OID ordering, grant asymmetry and repository absence.
- Gap: Prompt-24's `63` was an in-transaction assertion, never independently re-queried post-commit.
- Exact next step: Owner decision on Decisions 1–5 above. No write is performed until then.

## AF/AG. Persistence and status

WORKSTREAM EVIDENCE PERSISTENCE: NONE this Prompt. ACCEPTANCE PERSISTENCE: NONE. CLOSURE PERSISTENCE: NONE. Roadmap RM-DH-004 stays ACTIVE — PHASE 1; WS-DH-2026-0003 stays ACTIVE with Acceptance blocked.

Final status: `PLATFORM SANDBOX-ROLE PROVENANCE AND STABLE-FINGERPRINT AUDIT COMPLETED — OWNER ALIGNMENT REQUIRED`.

## AH. Run metadata and exact stopping point

Run 2026-08-04, 13:44 Asia/Riyadh; HEAD `d140562f`; database `vhxglsvxwwpmoqjabfmj`, PostgreSQL 17.6; read role `supabase_read_only_user`. Stopping point: Owner Alignment package delivered; no implementation, no rebaseline, no rollback reissue, no Acceptance, no Closure.
