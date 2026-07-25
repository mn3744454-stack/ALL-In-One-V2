# File 24 — TURN 5A.2.a FOUNDATION EVIDENCE (Corrected by Turn 5A.2.aE)

## Status Banner

TURN 5A.2.aE COMPLETE — FOUNDATION EVIDENCE CORRECTED.

- FOUNDATION: AUTHORED AND STATICALLY REVIEWED.
- PRIVILEGED DRY-RUN: NOT SUBSTANTIATED.
- QUALIFIED AUTHENTICATED RPC EXECUTION: NOT PERFORMED.
- T1 RPC SCENARIOS: 0/54.
- TURN 5A.2 RPC SCENARIOS: 0/40.
- NEXT: TURN 5A.2.b.

File 24 remains **partial Foundation evidence**. It is not final T1 evidence,
not final T2 evidence, not Mini Documentation, and not acceptance closure.

## A. Verdict

**TURN 5A.2.a FOUNDATION AUTHORED — EVIDENCE CORRECTED IN TURN 5A.2.aE.**
Turn 5A.2.b remains required to author the 32 independent expected-error RPC
Scenarios, gated first by the Temp-Schema role-switch access check (§K).

## B. Roadmap Position

Phase 2 · N+1B · J5.2-SLICE-01-EXECUTION · Turn 5A.2.a Foundation authoring,
evidence corrected by Turn 5A.2.aE.

## C. Skill Application

- Applied: 03 (Workflow Completeness), 06 (API/RPC Hardening),
  08 (Schema and Migration Safety), 19 (Platform Billing/Finance),
  23 (Performance and Reliability), 25 (QA/Release Readiness),
  26 (Skill Network Governance).
- No-op (documented): 04 (tenant-isolation contracts unchanged),
  05 (no RLS change), 07 (no TypeScript change), 10 (no UX change),
  12 (no translation change).
- Excluded: SQL authoring, production correction, Retail POS,
  Draft Invoice recovery, T2 authoring, Phases N+2..N+4.

## D. Git and Artifact References

- Pre-correction audited HEAD (Turn 5A.2.aR): `e34df565ded51e50d14b7ed712fbba2f4086cc65`.
- Foundation SQL last-touch commit: `0999a12cd48a089b1d017ffd1f4a3a7b5ec86ece`.
- File-24 correction commit: applied during Turn 5A.2.aE (post-correction HEAD
  supersedes the audited HEAD above; this Evidence-only correction does not
  touch the Foundation SQL).
- **Withdrawn unverified reference**: `a67609c73e63ef72cc05f8b7910573dbdde0d087`
  was cited in the prior version of this file as the commit containing the
  Foundation. Turn 5A.2.aR could not find this hash in reachable history. It
  is withdrawn and must not be used as an authoritative reference.

## E. Foundation SQL Integrity

- Path: `supabase/tests/database/j5_1_source_checkout.test.sql`.
- Line count (pre and post 5A.2.aE): **796** (unchanged).
- File SHA-256 (pre and post 5A.2.aE):
  `a23b260819ff5dbae683557ac8b0baa4ad2aee6bd982fb5c0ffbfc5a2a4ddd02`
  (unchanged).
- Modified in Turn 5A.2.aE: **No.**

## F. Six-Fingerprint Evidence (Live Catalog)

All three Raw values match locked expected values. All three Canonical POSIX
values match locked expected values. Raw and Canonical values are **different**
for every function — this is expected because Canonical POSIX collapses all
POSIX whitespace runs and trims before hashing.

### `public.create_source_checkout_invoice`

- Raw DB-side:
  `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0`
- Canonical POSIX:
  `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f`

### `public._finance_source_checkout_apply_trace`

- Raw DB-side:
  `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9`
- Canonical POSIX:
  `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f`

### `public._invoice_items_validate_source`

- Raw DB-side:
  `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- Canonical POSIX:
  `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0`

## G. Fingerprint Protocol (Authoritative)

### Raw DB-Side

SHA-256 over the exact UTF-8 bytes of `pg_get_functiondef(oid)` with no
transformation.

### Canonical POSIX

Starting from the exact function-definition text:

1. CRLF → LF;
2. remaining CR → LF;
3. every `[[:space:]]+` run → one ASCII space;
4. trim leading and trailing whitespace;
5. UTF-8 encode;
6. SHA-256.

Canonical normalization is not reducible to newline handling only. It
collapses indentation, tabs, blank lines, and repeated spaces.

## H. Correction Matrix — Withdrawn Prior Statements

The following statements from the pre-correction version of File 24 are
**withdrawn**. They must not be used as authoritative.

| # | Withdrawn text (paraphrased) | Reason |
|---|-------------------------------|--------|
| 1 | "Canonical-POSIX hashes in this environment equal the RAW hashes byte-for-byte." | False. Raw ≠ Canonical for every function. Canonical collapses all POSIX whitespace runs. |
| 2 | "Because the live `pg_get_functiondef` output contains no `\r\n` sequences." | Not the definition of Canonical; irrelevant to Raw/Canonical equality. |
| 3 | "Since every RAW hash matches the accepted lock value, the three functions are provably unchanged" (as a substitute for Canonical verification). | Raw and Canonical are both required and both matched independently; Canonical verification was not skippable. |
| 4 | "An authoring-time dry-run under the privileged session role executed the full file end-to-end … completing with a clean ROLLBACK." | Not substantiated. No execution command, session role, bound Actor/Tenant, timestamps, exit code, stdout, stderr, log file, or assertion output was preserved. |
| 5 | Reference to commit `a67609c73e63ef72cc05f8b7910573dbdde0d087` as the Foundation HEAD. | Unverified; not in reachable history. |

## I. Dry-Run Claim — Withdrawn

The prior claim of a successful "privileged authoring-time dry-run" is
withdrawn. No verifiable artifact was preserved. The current zero-residue
database state (see §L) proves only the absence of persistent residue; it
does not prove whether the Foundation file was ever executed.

No new dry-run was performed in Turn 5A.2.aE.

## J. Final Execution Classification (Authoritative)

```text
FOUNDATION SQL: AUTHORED.
FOUNDATION SQL: STATICALLY REVIEWED AGAINST THE LIVE CATALOG.
PRIVILEGED FOUNDATION DRY-RUN: NOT SUBSTANTIATED.
QUALIFIED AUTHENTICATED RPC EXECUTION: NOT PERFORMED.
T1 RPC SCENARIOS AUTHORED: 0/54.
TURN 5A.2 RPC SCENARIOS AUTHORED: 0/40.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2 AUTHORED: NO.
```

## K. Temp ACL Open Gate (Preserved from 5A.2.aR)

Temp-table object GRANTs are authored correctly:

- `authenticated` SELECT on `pg_temp.test_context`;
- `authenticated` SELECT on `pg_temp.test_scenario_inputs`;
- `authenticated` INSERT on `pg_temp.test_rpc_capture`.

The ability of `SET LOCAL ROLE authenticated` to resolve and use the session's
`pg_temp` schema (`USAGE` on the session-generated Temp namespace) has **not**
been independently executed. This is a hard authoring/verification gate — not
a current Foundation defect and not a passed check. Turn 5A.2.b must validate
the role-switch Temp-schema access pattern before authoring the 32 scenarios.

## L. Read-Only Residue Evidence

Recomputed by Turn 5A.2.aR against the live catalog:

- `public.clients` rows for active Fixture Client UUID: **0**.
- `public.lab_horses` rows for active Fixture Lab-Horse UUID: **0**.
- `public.lab_samples` rows for the 8 active Fixture UUIDs and the reserved
  missing ID `deadbeef-0000-4000-8000-000000000027`: **0**.
- `public.finance_request_idempotency` rows for
  `(tenant=145f2128-83ca-4ba8-85b5-8ade245c5530,
    operation='create_source_checkout_invoice')`: **0** — covers all 38 active
  keys and the retired T1-A-32 key.

This is a **no-run / post-rollback residue check** only. It is not a
Foundation execution and must not be described as one.

## M. Preserved Foundation-Scope Facts

- Path: `supabase/tests/database/j5_1_source_checkout.test.sql`.
- Line count: 796.
- File SHA-256: `a23b260819ff5dbae683557ac8b0baa4ad2aee6bd982fb5c0ffbfc5a2a4ddd02`.
- One outer `BEGIN;`.
- One final `ROLLBACK;`.
- Zero `COMMIT;`.
- Zero executable calls to `public.create_source_checkout_invoice`.
- Seven Temp Harness structures (all `ON COMMIT DROP`):
  `test_context`, `test_scenario_inputs`, `test_rpc_capture`,
  `test_scenario_results`, `test_baseline`, `test_active_idem_keys`,
  `test_reserved_keys`.
- Three narrow Temp ACL grants (see §K).
- 10 active transaction-local Fixture rows: 1 Client, 1 Lab Horse, 8 Lab
  Samples (status distribution `draft=3, accessioned=2, completed=1,
  processing=1, cancelled=1`).
- Reserved missing Lab-Sample ID: `deadbeef-0000-4000-8000-000000000027`
  (absence contract only; never inserted; excluded from Fixture counts).
- 40 future Turn-5A.2 calls mapped to 38 active distinct Idempotency keys.
- Retired T1-A-32 key `11111111-1111-4111-8111-000000000035` held separately
  in `test_reserved_keys`.
- Zero rows in `test_scenario_inputs`, `test_rpc_capture`,
  `test_scenario_results`.

## N. Active Fixture UUIDs

| Symbol                    | Table         | UUID                                     |
|---------------------------|---------------|------------------------------------------|
| CLIENT_REGISTERED         | clients       | `aaaa1111-0000-4000-8000-000000000001`   |
| LH_LEGACY_CLIENT          | lab_horses    | `cccc3333-0000-4000-8000-000000000001`   |
| LS_DRAFT_LEGACY           | lab_samples   | `dddd4444-0000-4000-8000-000000000001`   |
| LS_ACCESSIONED_LEGACY     | lab_samples   | `dddd4444-0000-4000-8000-000000000002`   |
| LS_COMPLETED_LEGACY       | lab_samples   | `dddd4444-0000-4000-8000-000000000003`   |
| LS_PROCESSING             | lab_samples   | `dddd4444-0000-4000-8000-000000000004`   |
| LS_CANCELLED              | lab_samples   | `dddd4444-0000-4000-8000-000000000005`   |
| LS_WALKIN_LONG_NAME       | lab_samples   | `dddd4444-0000-4000-8000-000000000007`   |
| LS_COEXIST                | lab_samples   | `dddd4444-0000-4000-8000-00000000000b`   |
| LS_ZERO_PRICE             | lab_samples   | `dddd4444-0000-4000-8000-00000000000e`   |

## O. Static Evidence-Consistency Search

After Turn 5A.2.aE, the remaining textual occurrences within File 24 are:

- "equal the RAW hashes" — appears only in §H row 1 as **withdrawn** text.
- "Raw equals Canonical" — appears only in §G/§H as a description of what is
  **not** true and in the withdrawn matrix.
- "no `\r\n`" — appears only in §H row 2 as **withdrawn** text.
- "dry-run succeeded", "executed the full file", "clean ROLLBACK" — appear
  only in §H rows 4 and §I as **withdrawn** text.
- "FOUNDATION NOT EXECUTED" — not used as an active phrase; replaced by the
  authoritative classification in §J (T1 EXECUTED: NO, dry-run not
  substantiated).
- `a67609c73e63ef72cc05f8b7910573dbdde0d087` — appears only in §D and §H row
  5 as an explicitly **withdrawn** reference.
- "PRIVILEGED FOUNDATION DRY-RUN" — appears in §J as **NOT SUBSTANTIATED**.
- "QUALIFIED AUTHENTICATED" — appears in §J as **NOT PERFORMED**.
- "T1 EXECUTED", "T1 PASSED" — appear in §J and §Q as **NO**.

Final invariants:

- Zero active claim that Raw equals Canonical.
- Zero active claim that a dry-run succeeded.
- Exactly one authoritative statement that the dry-run is not substantiated (§J).
- Exactly one authoritative statement that qualified execution was not
  performed (§J).
- T1 Executed = No. T1 Passed = No.
- No unverified Git commit presented as authoritative.

## P. Files Modified in Turn 5A.2.aE

- `docs/aml_1_b_1/stage_j5_2/preflight/24_turn_5a_2_t1_lab_foundation_authoring.md`
  (this file; evidence-only correction).

## Q. Files Inspected (Not Modified)

- `supabase/tests/database/j5_1_source_checkout.test.sql` (SHA-256 and line
  count verified unchanged).
- Files 17, 21, 22, 23 (contract locks; not modified).

## R. Production Objects Modified

None.

## S. Persistent Business Rows Modified

None.

## T. Current T1/T2 Status

```
T1 HARNESS AND ACTIVE FIXTURES: AUTHORED AND STATICALLY REVIEWED.
T1 EXECUTABLE RPC SCENARIOS: 0/54.
TURN 5A.2 EXECUTABLE RPC SCENARIOS: 0/40.
T1 EXECUTED: NO.
T1 PASSED: NO.
T2: NOT YET AUTHORED.
```

## U. Next Exact Turn

```
Turn 5A.2.b:
Temp-Schema Role-Switch Access Gate
+ T1-A-01 through T1-A-31
+ T1-A-33
+ 32 Independent SAVEPOINT Scenarios
+ Exact SQLSTATE/Token Capture
+ \gset Result Survival
+ 32 Post-Rollback Scenario Summaries
```

Do NOT begin it in this turn.

## V. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase:
  J5.2-SLICE-01-EXECUTION — TURN 5A.2.aE.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## W. STOP GATE

Halting after this evidence correction. Not modifying the Foundation SQL,
not authoring RPC Scenarios, not beginning Turn 5A.2.b, not beginning Turn
5A.3, not authoring T2, not beginning Turn 5R, not performing Manual
Acceptance, not beginning Slice 02, not creating final Mini Documentation,
not implementing Retail POS.
