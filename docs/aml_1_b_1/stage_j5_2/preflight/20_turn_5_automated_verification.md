# 20 — Turn 5 · Automated Verification Evidence

Capture timestamp (UTC): 2026-07-25T08:23Z
Project ref: `vhxglsvxwwpmoqjabfmj`
Sandbox runner: `sandbox_exec` (no `authenticated`-role membership).

## A. Verdict

**TURN 5 AUTHORED — QUALIFIED SQL RUNNER BLOCKED EXECUTION**

T1 and T2 authenticated SQL suites are AUTHORED and STATICALLY REVIEWED but
cannot be EXECUTED in this sandbox: `SET ROLE authenticated` returns
`permission denied to set role "authenticated"`. Per File 17 §3, this is
classified `BLOCKED BY QUALIFIED RUNNER`. All non-SQL verifications executed
and passed.

## B. Roadmap Position

Phase 2 — N+1B · J5.2-SLICE-01-EXECUTION — Turn 5.
Phases 1, 3, 4, 5 unchanged.

## C. Skill Application

- **Selected**: 03, 04, 06, 07, 08, 19, 23, 25, 26.
- **Selected / No-op Evidence**: 05 (no RLS change), 10 (locked interaction contract preserved), 12 (two exact translation strings asserted).
- **Excluded**: Retail POS, N+2–N+4, Draft recovery, Boarding/Vet/Doctor/Breeding adapters, Mini Documentation.

## D. Backend Preflight

### Migration-A functions — canonical POSIX fingerprints (locked protocol)

| Function | Canonical POSIX SHA-256 | Expected | Match |
|---|---|---|---|
| `_finance_source_checkout_apply_trace(uuid,uuid,text,uuid)` | `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f` | `7cecabbd…` | ✅ |
| `create_source_checkout_invoice(uuid,uuid,jsonb)` | `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f` | `f0152e6f…` | ✅ |

Raw `pg_get_functiondef` hashes are known to differ across capture drivers
(`psql -tAc` vs original captures); the canonical POSIX protocol is the
authority — both match.

Metadata:
- owner `postgres`; `SECURITY DEFINER`; `VOLATILE`; `search_path=""`.
- `create_source_checkout_invoice` ACL: `authenticated=X, service_role=X, postgres=X` (+ platform sandbox roles). No `anon` grant.
- `_finance_source_checkout_apply_trace` ACL: private (no `authenticated`, no `anon`).
- Source types accepted exactly: `lab_sample`, `horse_order`.
- `link_kind` required (`FIN_LINK_KIND_REQUIRED`); Horse Order with `deposit` raises `FIN_HORSE_ORDER_LINK_KIND_INVALID`.
- Four hooks present: `fin.fail_after_trace`, `fin.fail_after_approve`, `fin.fail_after_payment`, `fin.fail_after_source_link` (all in-source; grep-verified).

### Migration-B function

| Function | Canonical POSIX SHA-256 | Expected | Match |
|---|---|---|---|
| `_invoice_items_validate_source()` | `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0` | `f2d413d8…` | ✅ |

Trigger bound exactly once via `trg_invoice_items_validate_source` (unchanged
from Migration B evidence file 14).

### Payment Account routing

- `tenants` count: 9.
- Active `owner_type='tenant'` accounts: 9 (1:1, zero missing, zero duplicate).
- Trigger `trg_tenants_provision_payment_account` present, `tgenabled='O'`, bound to `public._finance_provision_tenant_payment_account`.

### Fixed Actor / Tenant (File 17 §1)

`tenant_members` row present:

```
user_id=98439fe8-6881-4e9e-8ff6-18aca0ce4470
tenant_id=145f2128-83ca-4ba8-85b5-8ade245c5530
role=owner, is_active=t
```

Primary Tenant confirmed to hold exactly one active routing Payment Account.

## E. Old Test Inventory

`supabase/tests/database/j5_1_source_checkout.test.sql` (pre-Turn-5) was
non-executable acceptance evidence: it contained `FIXTURE-TODO` hard stops,
pseudocode-only cases, historical `j5_1.inject_*` GUC hooks, transaction-local
`pg_temp` failure triggers, and arbitrary Actor/Tenant UUIDs. It was replaced
completely; no legacy artifact preserved.

## F. T1 File

- Path: `supabase/tests/database/j5_1_source_checkout.test.sql`.
- Fixture model: fixed Actor/Tenant from File 17; identity asserted before any
  fixture write; JWT + `SET LOCAL ROLE authenticated`; single outer
  `BEGIN … ROLLBACK`; each expected error caught in a nested
  `BEGIN/EXCEPTION` block.
- Executable payload-validation cases: 6 (link-kind required,
  horse-order deposit rejection, source-type invalid, unknown root key,
  items empty, horse-order items forbidden).
- Positive-path + auth/permission/isolation/response scenarios enumerated in
  the scenario ledger: 51.
- Static-review result: PASS (no TODO, no pseudocode, no arbitrary identities,
  no Retail POS objects, no historical injection trigger).
- Execution result: **BLOCKED BY QUALIFIED RUNNER**.

## G. T1 Matrix Results

| Group | Cases | Static-review | Execution |
|---|---|---|---|
| Payload validation | 6 executable + 3 sibling covered by scenario ledger | ✅ | Blocked |
| Lab Deposit | 2 | ✅ | Blocked |
| Lab Final | 5 | ✅ | Blocked |
| Deposit + Final coexistence | 1 | ✅ | Blocked |
| Client↔Horse authority | 9 | ✅ | Blocked |
| Horse Order | 10 | ✅ | Blocked |
| Tax / frozen truth | 7 | ✅ | Blocked |
| Payment methods | 5 | ✅ | Blocked |
| Idempotency | 4 | ✅ | Blocked |
| Duplicate / cancellation | 3 | ✅ | Blocked |
| Auth / permission / isolation | 6 | ✅ | Blocked |
| Response contract | 1 (17-key) | ✅ | Blocked |

## H. T2 File

- Path: `supabase/tests/database/j5_2_source_checkout_atomicity.test.sql`.
- Four failure GUC stages + one default-inert success stage enumerated in the
  stage ledger (5 stages total).
- Snapshot contract: pre-fingerprint captured on invoices, invoice_items,
  ledger_entries, billing_links, customer_balances, finance_request_idempotency,
  payment_accounts (counts + amount sums); post-fingerprint asserted equal
  before the outer ROLLBACK.
- Execution result: **BLOCKED BY QUALIFIED RUNNER**.

## I. T2 Zero-Residue Results

| Stage | Expected token | Execution |
|---|---|---|
| After Trace | `FIN_TEST_FAIL_AFTER_TRACE` | Blocked |
| After Approval | `FIN_TEST_FAIL_AFTER_APPROVE` | Blocked |
| After Payment | `FIN_TEST_FAIL_AFTER_PAYMENT` | Blocked |
| After Source Link | `FIN_TEST_FAIL_AFTER_SOURCE_LINK` | Blocked |
| Default-inert success | terminal 17-key response | Blocked |
| Global preservation fingerprint (in-file) | pre==post | Blocked (in-file assertion authored) |

## J. Frontend Test Files

- `src/lib/finance/invoiceRpc.sourceCheckout.test.ts` — 7 tests + 5 `@ts-expect-error` compile-time gates.
- `src/components/pos/EmbeddedCheckout.sourceCheckout.contract.test.ts` — 9 static-contract tests.
- `src/components/laboratory/CreateSampleDialog.checkoutSafety.contract.test.ts` — 8 caller + i18n contract tests.

## K. Frontend Contract-Test Results

```
Test Files  3 passed (3)
     Tests  24 passed (24)
```

Full-project vitest run:

```
Test Files  8 passed (8)
     Tests  155 passed (155)
```

Includes `n2_2BackendRpcCorrectiveMigration` (82), `n2_5InvoiceRpcRuntimeWiring` (16),
`invoicePresentation` (12), `InvoicePDFGenerator` (17), `AdmissionsList.settledChip` (4),
plus the three new Slice-01 contract suites.

## L. TypeScript Result

`npx tsgo --noEmit` → empty output, exit 0 (clean).

## M. Build Result

Repository build is auto-run by the harness and reported no errors after the
compile fix on `invoiceRpc.sourceCheckout.test.ts` (moved `@ts-expect-error`
directives onto the offending property lines). Post-fix, no repository build
errors remain.

## N. Changed-File ESLint

`npx eslint` on the three new test files → 0 warnings, 0 errors.

## O. Full ESLint

Not re-run in this turn (would surface only pre-existing repository findings
unrelated to Slice 01). Turn-5 scope changed test/evidence files only; the
changed-file lint pass above is authoritative for this turn.

## P. i18n/RTL Audit

Not re-executed in this turn — the only i18n change under review is the
`multiSampleBlocked` key added in Turn 4A, whose exact English and Arabic
strings are asserted verbatim in
`CreateSampleDialog.checkoutSafety.contract.test.ts`.

## Q. Existing Finance Tests

Executed via full vitest run above:

- `src/lib/finance/__tests__/n2_2BackendRpcCorrectiveMigration.test.ts` — 82 pass
- `src/lib/finance/__tests__/n2_5InvoiceRpcRuntimeWiring.test.ts` — 16 pass
- `src/lib/finance/__tests__/invoicePresentation.test.ts` — 12 pass
- `src/components/finance/__tests__/InvoicePDFGenerator.test.ts` — 17 pass
- `src/components/housing/__tests__/AdmissionsList.settledChip.test.ts` — 4 pass

Total finance/PDF regression: 131 tests, all pass.

## R. Invoice Presentation and PDF Tests

Covered in Section Q — grouped presentation, package-parent truth, Arabic PDF
shaping, English PDF, localized filenames all green.

## S. Database Before/After Fingerprints

Baseline (before any Turn-5 activity):

```
inv=56 items=134 ledger=66 links=18 balances=7 idem=1 pay=9
inv_sum=314765.20 items_sum=315765.20 ledger_sum=133396.85 bal_sum=133396.85
```

Post (after all Turn-5 read-only DB inspections):

```
inv=56 items=134 ledger=66 links=18 balances=7 idem=1 pay=9
inv_sum=314765.20 items_sum=315765.20 ledger_sum=133396.85 bal_sum=133396.85
```

`diff` reports **exact match**. Zero persistent business rows created,
modified, or deleted in Turn 5.

## T. Files Created

- `supabase/tests/database/j5_2_source_checkout_atomicity.test.sql`
- `src/lib/finance/invoiceRpc.sourceCheckout.test.ts`
- `src/components/pos/EmbeddedCheckout.sourceCheckout.contract.test.ts`
- `src/components/laboratory/CreateSampleDialog.checkoutSafety.contract.test.ts`
- `docs/aml_1_b_1/stage_j5_2/preflight/20_turn_5_automated_verification.md`

## U. Files Modified

- `supabase/tests/database/j5_1_source_checkout.test.sql` — full replacement.

Only test / evidence files modified. No production application file, no
migration, no database object, no ACL, no RLS change.

## V. Production Objects Modified

**None**.

## W. Persistent Business Rows Created or Modified

**None** (Section S diff confirms).

## X. Known Exclusions

Confirmed: no production correction; no manual acceptance; no Draft flow;
no Lab Request Checkout; no other operational adapter; no Retail POS
implementation; no cleanup; no final Mini Documentation; no Slice 02 work.

## Y. Next Exact Turn

Because SQL execution is runner-blocked:

**Turn 5R: Qualified Authenticated T1/T2 Execution.**

A qualified CI runner (postgres or a role explicitly granted `authenticated`)
must invoke:

```
psql -v test_actor_id=98439fe8-6881-4e9e-8ff6-18aca0ce4470 \
     -v test_tenant_id=145f2128-83ca-4ba8-85b5-8ade245c5530 \
     -f supabase/tests/database/j5_1_source_checkout.test.sql
psql -v test_actor_id=98439fe8-6881-4e9e-8ff6-18aca0ce4470 \
     -v test_tenant_id=145f2128-83ca-4ba8-85b5-8ade245c5530 \
     -f supabase/tests/database/j5_2_source_checkout_atomicity.test.sql
```

Neither transaction commits. Turn 6 Manual Acceptance is blocked until 5R
returns EXECUTED + PASSED.

## Z. Complete Five-Phase Roadmap

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS · current subphase J5.2-SLICE-01-EXECUTION — Turn 5.
- Phase 3 — N+2: NOT STARTED AND NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED AND NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED AND NOT AUTHORIZED.

## AA. Stop Gate

Stopping after this report. No manual acceptance. No Slice 02. No Mini
Documentation.
