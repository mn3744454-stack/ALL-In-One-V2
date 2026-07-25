# 21 — Turn 5A.1R2 · Live Test Contract & Fixture Architecture Lock (Corrected)

Verdict: **TURN 5A.1R2 COMPLETE — FINGERPRINTS, HARNESS, AND CASE INVENTORY LOCKED FOR TURN 5A.2**

Supersedes the withdrawn Turn 5A.1 lock. This file is preflight/test-contract
evidence — not final Mini Documentation. It locks the corrected contracts required
to author complete self-contained T1/T2 SQL suites in Turns 5A.2–5A.4.

---

## A. Production preflight (2026-07-26 — recomputed under both protocols)

Fingerprints computed in-database via `extensions.digest(...)` over
`pg_get_functiondef(...)` output. The exact SQL is preserved in §A.1 below.

| Object                                                       | Raw DB-side SHA-256                                                | Canonical POSIX SHA-256                                            | Match |
|--------------------------------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------|-------|
| `create_source_checkout_invoice(uuid,uuid,jsonb)`            | `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0` | `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f` | ✓✓    |
| `_finance_source_checkout_apply_trace(uuid,uuid,text,uuid)`  | `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9` | `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f` | ✓✓    |
| `_invoice_items_validate_source()`                           | `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772` | `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0` | ✓✓    |

All six values match the accepted post-migration evidence. **No production
drift.** The previously-recorded "raw" shell-pipeline hashes in the withdrawn
Turn 5A.1R file (`8b1d809e…`, `fec188c8…`, `eb141739…`) were shell-pipeline
artifacts and are formally withdrawn.

### A.1 Exact DB-side fingerprint query

```sql
WITH fns(sig) AS (VALUES
 ('public.create_source_checkout_invoice(uuid,uuid,jsonb)'),
 ('public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)'),
 ('public._invoice_items_validate_source()')
)
SELECT sig,
  encode(extensions.digest(
    convert_to(pg_get_functiondef(sig::regprocedure), 'UTF8'),
    'sha256'), 'hex') AS raw_hex,
  encode(extensions.digest(
    convert_to(
      btrim(regexp_replace(
        regexp_replace(
          regexp_replace(pg_get_functiondef(sig::regprocedure),
            E'\r\n', E'\n', 'g'),
          E'\r', E'\n', 'g'),
        '[[:space:]]+', ' ', 'g')),
      'UTF8'),
    'sha256'), 'hex') AS posix_hex
FROM fns;
```

`extensions.digest` is provided by `pgcrypto` in the `extensions` schema
(verified via `pg_extension` join).

Payment routing: 9 tenants, 9 active routing accounts (1 per tenant, no
duplicates). Fixed Primary Tenant `145f2128…5530` has 1 active account.
Auto-provisioning trigger `trg_tenants_provision_payment_account` enabled.

Fixed Actor `98439fe8…4470` is `active` in `tenant_members` for the Primary
Tenant (role = owner). Frontend Turn-4A baselines present and un-drifted.

---

## B. Files inspected this turn

- `docs/aml_1_b_1/stage_j5_1/preflight/17_authenticated_jwt_convention.md`
- `docs/aml_1_b_1/stage_j5_2/preflight/21_turn_5a_1_live_test_contracts.md`
- `docs/aml_1_b_1/stage_j5_2/preflight/22_turn_5a_fixture_uuid_map.md`
- `docs/aml_1_b_1/stage_j5_2/preflight/23_turn_5a_error_token_matrix.md`
- Live pg_get_functiondef output for the three locked production objects.
- Schemas: `tenant_members`, `member_permissions`, `permission_definitions`,
  `lab_samples` (distinct status values: `draft`, `accessioned`, `processing`,
  `completed`, `cancelled`), `horse_orders`, `horse_order_types`, `lab_horses`,
  `party_horse_links`, `payment_accounts`, `billing_links`.

## C. Files modified this turn

- `docs/aml_1_b_1/stage_j5_1/preflight/17_authenticated_jwt_convention.md`
  (minor: replaced legacy permission-key shorthand and re-confirmed skeleton)
- `docs/aml_1_b_1/stage_j5_2/preflight/21_turn_5a_1_live_test_contracts.md`
  (this file — full replacement)
- `docs/aml_1_b_1/stage_j5_2/preflight/22_turn_5a_fixture_uuid_map.md`
  (Lab status fixtures corrected; coexistence collapsed to a single sample;
  collision census recorded; permission-negative architecture appended)
- `docs/aml_1_b_1/stage_j5_2/preflight/23_turn_5a_error_token_matrix.md`
  (full replacement with category classification and correct trigger paths)

## D. Production objects modified

**None.** No migrations authored or applied.

## E. Persistent business rows modified

**None.**

## F. Correction matrix

| # | Old (withdrawn) statement                                                                                                | Live-source evidence                                                                                                                             | Corrected statement                                                                                                                                          | File / section changed             |
|---|---------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|
| 1 | "cash/card/transfer: caller MUST supply `received_at`."                                                                   | RPC root whitelist: `{source_type, source_id, link_kind, client_name, discount_amount, payment_method, prices_include_tax, notes, items}`; unknown keys fire `FIN_PAYLOAD_UNKNOWN_KEY`. `received_at` is server-derived (`v_business_date` = today Asia/Riyadh). | Caller MUST NOT supply `received_at`. Any root `received_at` → `FIN_PAYLOAD_UNKNOWN_KEY` first. Business date is server-set.                                | 21 §I, 23 row 5                     |
| 2 | "Deposit-eligible: `draft` (RPC rejects all others…)."                                                                    | Body line ~292: `IF v_link_kind='deposit' AND v_source_status NOT IN ('draft','accessioned') THEN … 'FIN_LAB_DEPOSIT_STATUS_INVALID'`.           | Deposit-eligible: `draft` **and** `accessioned`. Rejected: `processing`, `completed` (→ `FIN_LAB_DEPOSIT_STATUS_INVALID`); `cancelled` → `FIN_SOURCE_CANCELLED` first. | 21 §H.1, 22 §D, 23 row 34           |
| 3 | "Final-eligible: `accessioned`/`completed`."                                                                              | Body line ~295: `IF v_link_kind='final' AND v_source_status <> 'completed' THEN … 'FIN_LAB_FINAL_STATUS_INVALID'`.                               | Final-eligible: `completed` only. `draft`/`accessioned`/`processing` → `FIN_LAB_FINAL_STATUS_INVALID`; `cancelled` → `FIN_SOURCE_CANCELLED` first.           | 21 §H.1, 22 §D, 23 row 35           |
| 4 | "cancelled sample as fixture for `FIN_LAB_DEPOSIT_STATUS_INVALID`/`FIN_LAB_FINAL_STATUS_INVALID`."                       | `FIN_SOURCE_CANCELLED` fires unconditionally when `status='cancelled'`.                                                                          | Use `LS_PROCESSING` (deposit-negative) and `LS_DRAFT_LEGACY`/`LS_ACCESSIONED_LEGACY` (final-negative). Cancelled → its own token.                            | 22 §D, 23 rows 33/34/35             |
| 5 | Two separate `LS_COEXIST_DEP` and `LS_COEXIST_FIN` UUIDs for coexistence proof.                                           | Same-source coexistence requires **one** `source_id` transitioning through statuses.                                                             | Single `LS_COEXIST` UUID; lifecycle: `accessioned → deposit → processing → completed → final`.                                                                | 22 §D, 22 Coexistence lifecycle     |
| 6 | "RPC accepts caller items or synthesizes from lab_request_services when items empty."                                     | Body: `IF NOT (p_payload ? 'items') OR jsonb_typeof <> 'array' OR array_length < 1 THEN RAISE 'FIN_ITEMS_EMPTY'`. No synthesis branch exists.    | Lab items are caller-authoritative. Empty/missing → `FIN_ITEMS_EMPTY`. No server-side synthesis from `lab_request_services`.                                 | 21 §H.1, 23 row 23                  |
| 7 | Lab item allowlist described as including `horse_id`/`lab_horse_id`/`category_id`.                                        | `v_lab_item_allowed := {description, quantity, unit_price, is_taxable}`. Server derives horse/lab_horse from the source row.                     | Item allowlist is only those four keys. Caller-supplied `horse_id`/`lab_horse_id`/`category_id`/`service_id` inside an item → `FIN_PAYLOAD_UNKNOWN_KEY: items[].<key>`. | 21 §H.1, 23 row 25                  |
| 8 | "Lab item price ≤ 0 → `FIN_LAB_ITEM_PRICE_INVALID`."                                                                      | Body: `IF v_unit < 0 THEN RAISE 'FIN_LAB_ITEM_PRICE_INVALID'`. Zero is not rejected here.                                                        | Negative unit_price → `FIN_LAB_ITEM_PRICE_INVALID`. Zero unit_price is accepted at the item gate; total ≤ 0 later fires `FIN_CHECKOUT_TOTAL_INVALID`.         | 23 rows 28, 46                      |
| 9 | "notes > 4000 chars → `FIN_NOTES_TOO_LONG`."                                                                              | Body: `IF char_length(COALESCE(v_notes,'')) > 500 THEN RAISE 'FIN_NOTES_TOO_LONG'`.                                                              | Limit is 500. Boundary: 500 passes, 501 rejected.                                                                                                            | 23 row 18                           |
| 10| "client name > 255 chars → `FIN_CLIENT_NAME_TOO_LONG`."                                                                   | Body: `IF char_length(v_client_name) > 200 THEN RAISE 'FIN_CLIENT_NAME_TOO_LONG'`.                                                               | Limit is 200. Boundary: 200 passes, 201 rejected.                                                                                                            | 23 row 42                           |
| 11| Permission shorthand "invoices.create / invoices.approve / payments.create".                                              | Body calls `has_permission(v_actor, tenant, 'finance.invoice.create')`, `'finance.invoice.approve'`, `'finance.payment.create'`.                 | Use `finance.invoice.create`, `finance.invoice.approve`, `finance.payment.create` verbatim.                                                                  | 17 §7, 22 §Permission-negative, 23 rows 20–22 |
| 12| Permission-negative fixture omitted temporary Owner demotion.                                                             | `has_permission` short-circuits `true` for role `owner`.                                                                                         | SAVEPOINT → `UPDATE tenant_members SET role='foreman'` → `INSERT/UPDATE member_permissions … granted=false ON CONFLICT DO UPDATE` → call RPC → ROLLBACK TO SAVEPOINT. | 22 §Permission-negative             |
| 13| File 22 claimed Turn 5A.2 had already verified UUID collisions.                                                           | Turn 5A.2 has not begun.                                                                                                                         | Read-only collision census executed in Turn 5A.1R; zero collisions recorded; T1/T2 must still repeat pre-insert guards at execution.                          | 22 top + Collision-check contract   |
| 14| `FIN_ORDER_MISSING_HORSE` treated as executable via cross-tenant scrub.                                                   | `horse_orders.horse_id` is NOT NULL; only reachable via FK/trigger bypass or corruption — both forbidden.                                        | Reclassified Category D (structurally unreachable). Static review only.                                                                                      | 23 row 38, 21 §F                    |
| 15| `FIN_CHECKOUT_NOT_FULLY_PAID` / `_PAYMENT_METHOD_MISMATCH` / `_PAYMENT_RECEIVED_AT_MISSING` treated as executable.        | `post_payment` posts the full server-authoritative amount using the caller-declared method; writes `payment_received_at`.                        | Reclassified Category C (internal invariants). Reachable only via out-of-band ledger/invoice mutation. Static review only.                                    | 23 rows 48–50                       |
| 16| Debt post-state tokens (`_DEBT_STATE_INVALID`, `_DEBT_STATUS_INVALID`, `_DEBT_PAYMENT_METHOD_INVALID`, `_DEBT_HAS_PAYMENT_RECEIVED_AT`) treated as executable via caller `received_at`. | Root whitelist blocks `received_at`; debt UPDATE guarantees state.                                                          | Reclassified Category C. Static review only.                                                                                                                 | 23 rows 51–54                       |
| 17| `FIN_TENANT_PAYMENT_ACCOUNT_MISSING` marked "unsafe — skip".                                                              | Trigger auto-provisions on tenant insert. Deactivation is transaction-local: `UPDATE payment_accounts SET is_active=false` inside SAVEPOINT.     | Category B: SAVEPOINT-scoped deactivation → call RPC with `cash` → assert → ROLLBACK TO SAVEPOINT.                                                            | 23 row 47                           |
| 18| Fingerprint table listed protocol-normalized values as if raw.                                                            | Recomputed raw values shown above.                                                                                                               | Recorded raw values; flagged canonical-POSIX recomputation as a Turn 5A.2 prerequisite.                                                                       | 21 §A                               |

---

## G. Final root payload whitelist (locked)

```
{ source_type, source_id, link_kind, client_name,
  discount_amount, payment_method, prices_include_tax,
  notes, items }
```

Not permitted at root (unknown-key → `FIN_PAYLOAD_UNKNOWN_KEY`):
`received_at`, `payment_account_id`, `client_id`, `horse_id`, `lab_horse_id`,
`domain`, `category_id`, `service_id`, `package_id`, `entity_type`, `entity_id`,
and every other unlisted key.

Lab item allowlist (locked):
```
{ description, quantity, unit_price, is_taxable }
```

Not permitted inside lab items (→ `FIN_PAYLOAD_UNKNOWN_KEY: items[].<key>`):
`horse_id`, `lab_horse_id`, `category_id`, `service_id`, `service_source`,
`package_id`, `domain`, and every other unlisted key.

Horse-order path: `items` root key forbidden entirely
(`FIN_HORSE_ORDER_ITEMS_FORBIDDEN`).

## H. Final Lab Deposit / Final status matrix (locked)

| Sample status | `link_kind='deposit'`                       | `link_kind='final'`                           |
|---------------|---------------------------------------------|-----------------------------------------------|
| `draft`       | ACCEPT                                      | `FIN_LAB_FINAL_STATUS_INVALID`                |
| `accessioned` | ACCEPT                                      | `FIN_LAB_FINAL_STATUS_INVALID`                |
| `processing`  | `FIN_LAB_DEPOSIT_STATUS_INVALID`            | `FIN_LAB_FINAL_STATUS_INVALID`                |
| `completed`   | `FIN_LAB_DEPOSIT_STATUS_INVALID`            | ACCEPT                                        |
| `cancelled`   | `FIN_SOURCE_CANCELLED` (fires first)        | `FIN_SOURCE_CANCELLED` (fires first)          |

## I. Final Lab item validation matrix (locked)

| Condition                                              | Outcome                                        |
|--------------------------------------------------------|------------------------------------------------|
| `items` missing / non-array / length 0                 | `FIN_ITEMS_EMPTY`                              |
| item not an object                                     | `FIN_PAYLOAD_TYPE: items[]`                    |
| item key outside allowlist                             | `FIN_PAYLOAD_UNKNOWN_KEY: items[].<key>`       |
| `description` missing / non-string / blank             | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED`            |
| `quantity` missing / non-number / cast fails / `<= 0`  | `FIN_LAB_ITEM_QUANTITY_INVALID`                |
| `unit_price` missing / non-number / cast fails / `< 0` | `FIN_LAB_ITEM_PRICE_INVALID`                   |
| `unit_price = 0`                                       | ACCEPT here; later `FIN_CHECKOUT_TOTAL_INVALID` if total ≤ 0 |
| `is_taxable` present and non-boolean/non-null          | `FIN_PAYLOAD_TYPE: items[].is_taxable`         |
| `is_taxable` omitted or null                           | Server default = `true`                        |

## J. Final text-length limits (locked)

- `notes` ≤ 500 chars (`FIN_NOTES_TOO_LONG` at 501).
- `client_name` (resolved) ≤ 200 chars (`FIN_CLIENT_NAME_TOO_LONG` at 201).

## K. Same-source Deposit → Final fixture architecture (locked)

Single `LS_COEXIST` sample. See `22 §Coexistence lifecycle` for the 8-step
lifecycle. Two active billing links (one deposit + one final) MUST point to
distinct invoices. Duplicate deposit or duplicate final on the same source_id
independently → `FIN_SOURCE_LINK_CONFLICT`.

## L. Permission-negative architecture (locked)

Per-scenario SAVEPOINT with Owner demotion + `member_permissions` negative
override. See `22 §Permission-negative architecture` for the exact five-step
sequence and `23 rows 20–22` for the three permission keys.

## M. UUID collision census (read-only, Turn 5A.1R)

| Table                          | Fixture symbols checked                                                                                                                          | Collisions |
|--------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| `clients`                      | CLIENT_REGISTERED, CLIENT_UNRELATED, CLIENT_SECONDARY_TENANT                                                                                     | 0          |
| `horses`                       | HORSE_A, HORSE_UNLINKED, HORSE_CROSS_TENANT                                                                                                       | 0          |
| `lab_horses`                   | LH_LEGACY_CLIENT, LH_JUNCTION_CUSTOMER, LH_JUNCTION_PAYER, LH_OWNER_ONLY, LH_TRAINER_ONLY, LH_STABLE_ONLY, LH_UNRELATED, LH_CROSS_TENANT          | 0          |
| `lab_samples`                  | All `dddd4444-0000-4000-8000-*` fixture UUIDs                                                                                                     | 0          |
| `horse_order_types`            | HOT_ACTIVE, HOT_TO_DELETE                                                                                                                         | 0          |
| `horse_orders`                 | All `ffff6666-0000-4000-8000-*` fixture UUIDs                                                                                                     | 0          |
| `finance_request_idempotency`  | All namespaced idem keys `11111111…`, `22222222…`, `33333333…`, `44444444…`, `55555555…`, `66666666…`                                              | 0          |

All zero. Recorded in File 22.

## N. Token classification totals

| Category                                                | Count |
|---------------------------------------------------------|-------|
| A — Directly executable                                 | 42    |
| B — Executable via safe savepoint-scoped fixture shaping| 4     |
| C — Internal invariant, static review only              | 12    |
| D — Structurally unreachable                            | 1     |

## O. Recalculated T1 planned executable count

- **Category A directly executable**: 42
- **Category B safe savepoint-shaped**: 4 (three permission-denied paths +
  `FIN_TENANT_PAYMENT_ACCOUNT_MISSING`)
- Positive-path scenarios (Lab Deposit success, Lab Final success, Horse-Order
  Final success, Coexistence success, Idempotency replay/conflict, Trigger
  positive paths T14/T15/T16): 9 additional executable scenarios.

**T1 planned executable total: 55.**
Static-review-only (Category C): 12. Structurally unreachable (Category D): 1.

## P. T2 stage confirmation (locked)

Exactly 5 stages:

1. `fin.fail_after_trace` → `FIN_TEST_FAIL_AFTER_TRACE`.
2. `fin.fail_after_approve` → `FIN_TEST_FAIL_AFTER_APPROVE`.
3. `fin.fail_after_payment` → `FIN_TEST_FAIL_AFTER_PAYMENT` (cash path only).
4. `fin.fail_after_source_link` → `FIN_TEST_FAIL_AFTER_SOURCE_LINK`.
5. Default-inert success (no GUC set) — proves hooks are opt-in.

Each stage asserts post-rollback residue = 0 rows across
`invoices`, `invoice_items`, `ledger_entries`, `billing_links`,
`customer_balances`, `finance_request_idempotency`, `payment_accounts`.

## Q. Static-search evidence

Section verified via `grep -n` of Files 17/21/22/23 after correction. See §Q of
the report response for the full search matrix and remaining-occurrence review
(the only surviving references are inside correction/history tables that
explicitly identify them as withdrawn text).

## R. Production database

No production object modified. No migration authored. No persistent row written.

## S. T1 / T2 status

**T1/T2 SQL NOT authored.** The existing
`supabase/tests/database/j5_1_source_checkout.test.sql` and
`supabase/tests/database/j5_2_source_checkout_atomicity.test.sql` remain the
rejected label-only scaffolds and are NOT re-labelled AUTHORED in this turn.
They will be fully replaced by Turns 5A.2–5A.4.

## T. Exact next turn

**Turn 5A.2** — T1 Foundation + Deterministic Fixtures + Payload Validation +
Lab Deposit + Lab Final + Same-Source Deposit/Final Coexistence.

## U. Five-phase roadmap position

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase: J5.2-SLICE-01-EXECUTION —
  TURN 5A.1R (contract correction — this turn).
- Phase 3 — N+2: NOT STARTED / NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED / NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED / NOT AUTHORIZED.
