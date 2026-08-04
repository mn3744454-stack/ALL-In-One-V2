# STAGE B — PROMPT-27 OPTION-B CONTRACT PERSISTENCE — HALTED AT STAGE 2

Mode executed: Agent/Build — Repository-Write Only. **No repository artifact was written.** No SQL DDL/DML, no migration, no grant change, no rollback execution, no Acceptance, no Closure. The only file written this run is this platform-managed `.lovable/plan.md` (disclosed separately; not part of the authorized artifact set and not RM-DH-004 governance persistence).

## Stage 0 — Preflight (PASSED)

- Branch `edit/edt-07019b93-5c1c-4ecf-81b9-295b21a6f164`; HEAD `ec30e1c943c1b50634713e6121274bd8d4d2f646`; working tree clean.
- Forward migration `supabase/migrations/20260804083738_3d2d0ddf-5f5f-42f8-9bd0-832bc4430b78.sql`, version `20260804083738`, SHA-256 `602804b939876ee3a2a19114296de3ff080aafc574a3b0913bed1fa6e80baa5f` — MATCHES §7.4.
- Existing rollback artifact: `…/stage-b-database-authority/rollback.sql`, 17,396 bytes, 390 lines, SHA-256 `62be2f2773dddc0b8e1aab33aaef4b70c9ba304df5cc8879f616e32c74460baa`.
- `stable-function-acl-contract-v1.md` does not exist — no path collision.
- Database `vhxglsvxwwpmoqjabfmj`, PostgreSQL 17.6; read role `supabase_read_only_user`; evidence time 04-08-2026 15:2x Asia/Riyadh.

## Stage 1 — State-B stable contract

`OPTION-B STATE-B STABLE FINGERPRINT EXACTLY REPRODUCED`

| Field | Value |
| --- | --- |
| Rows | 35 (expected 35) |
| Byte length | 5277 |
| MD5 | `31a3c711f72f419e75f89a234a9923cc` (expected — MATCH) |
| SHA-256 | `67128e3269272e695b4452247eed409378b5f30d10c5df54a9d6b617abeea404` (MATCH) |

## Stage 2 — State-A synthetic stable contract

`OPTION-B STATE-A STABLE FINGERPRINT REPRODUCTION FAILED`

Reproducing State A strictly under §9 + §11 (function identity taken from `format('%I.%I(%s)', nspname, proname, pg_get_function_identity_arguments(oid))`, never a hand-typed signature) yields:

| Candidate | Rows | Bytes | MD5 | SHA-256 |
| --- | ---: | ---: | --- | --- |
| Prompt-26 approved value (§2.4) | 37 | 5422 | `bb59784870a414bfae5a18914453d5d4` | `460c8e0e…7353` |
| Recomputed, synthetic rows rendered `false` | 37 | 5506 | `fbe1be955a2df27a8025d4f5b732cbd6` | `c4ec5e90964a6f1065f2ea9c8df890a247ff4bb12296a1f9e5933f73790d2619` |
| Recomputed, fully live-consistent rendering `f` | 37 | 5498 | `36da554aef9a68d2acfbe9e1663c5def` | `5a7c4fa94cc44fc330503b58a13dde678a83206270e79f681a295988cdd63db2` |

### Exact cause (proven, not inferred)

Byte delta 5506 − 5422 = 84 = 2 × 42. The Prompt-26 synthetic rows used the abbreviated type-only signature `public.create_pos_sale(uuid,uuid,jsonb)` instead of the live canonical identity
`public.create_pos_sale(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` (42 characters longer per line). §11 explicitly forbids a differently formatted signature, so the Prompt-26 State-A candidate is defective; State B and the observation are unaffected because both derive every identity from the live expression.

### Second, independent rendering defect

State-B lines render `is_grantable` through the boolean text output, i.e. `…|EXECUTE|f`. The Prompt-26 synthetic rows render `…|EXECUTE|false`. Any State-A postcondition computed from a live post-rollback catalogue can only produce `f`, so the `false` variant (`fbe1be95…`) is not reproducible from live state either. Only the third candidate (`36da554a…`, 5498 bytes) is both canonical-identity correct and live-reproducible, and it is therefore the recommended replacement State-A postcondition.

## Stage 3 — Platform sandbox observation

`PLATFORM SANDBOX OBSERVATION REPRODUCED` — 14 rows, 2449 bytes, MD5 `9fa9afcfb207e5911f8b17eafc8e9adb`, SHA-256 `398631e3b7093b600e1faf37a1468b76b5522acee141659ec90cfb33a45fdd4b`. All 14 rows belong to `sandbox_exec_vhxglsvxwwpmoqjabfmj` (OID 123688); `sandbox_exec` (OID 127690) contributes zero rows. Non-blocking.

## Stages 4–8 — not performed

`STOP — OPTION-B FINGERPRINT REPRODUCTION FAILED` (§2.4, §11, §18.2). Zero repository artifact writes: no `stable-function-acl-contract-v1.md`, no rollback reissue. The existing `rollback.sql` remains byte-identical and remains non-executable under its stale 63-row precondition.

## Required verdicts

- Preflight: `PREFLIGHT PASSED`
- State-B reproduction: `OPTION-B STATE-B STABLE FINGERPRINT EXACTLY REPRODUCED`
- State-A reproduction: `OPTION-B STATE-A STABLE FINGERPRINT REPRODUCTION FAILED`
- Platform observation: `PLATFORM SANDBOX OBSERVATION REPRODUCED`
- Stable contract artifact: `NOT CREATED`
- Emergency rollback: `EMERGENCY ROLLBACK OPTION-B REISSUE FAILED` (not attempted; artifact unchanged and unexecuted)
- Acceptance: not claimed. Closure: not claimed. Prompt-25 Database QA remains FAILED.

## Owner decision required before any write

Approve the corrected State-A stable postcondition value to be used in place of the defective §2.4 value:

- Option 1 (recommended): `37 / 5498 bytes / MD5 36da554aef9a68d2acfbe9e1663c5def / SHA-256 5a7c4fa94cc44fc330503b58a13dde678a83206270e79f681a295988cdd63db2` — canonical identity, live-reproducible rendering.
- Option 2: `37 / 5506 bytes / MD5 fbe1be955a2df27a8025d4f5b732cbd6 / SHA-256 c4ec5e90…2619` — canonical identity but `false` literal; not reproducible from a live catalogue without a special-case rule.

On approval, a corrected Prompt-27 run can create the stable contract artifact and completely reissue the rollback with State-B precondition `35 / 31a3c711…` and the approved State-A postcondition.
