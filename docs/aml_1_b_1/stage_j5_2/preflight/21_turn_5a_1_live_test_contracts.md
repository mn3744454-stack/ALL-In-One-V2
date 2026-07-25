# 21 — Turn 5A.1R5E · Live Test Contract & Fixture Architecture Lock (Corrected)

Verdict: **TURN 5A.1R5E COMPLETE — UNREACHABLE CLIENT-TENANT BRANCH RECONCILED. EXECUTABLE T1 = 54. TURN 5A.2.a RETRY REQUIRED.**

Supersedes the Turn 5A.1R3/R4 lock in scope. This file is preflight/test-contract
evidence — not final Mini Documentation. It locks the corrected contracts required
to author complete self-contained T1/T2 SQL suites in Turns 5A.2–5A.4. Turn 5A.1R5
proved that `FIN_SOURCE_CLIENT_CROSS_TENANT` is structurally unreachable through
legal fixtures because `validate_lab_sample_trigger` and
`validate_horse_order_tenant_trigger` both enforce Client↔Tenant equality
BEFORE INSERT OR UPDATE. Turn 5A.1R5E retires `T1-A-32` from the executable T1
inventory and reconciles all downstream counts.


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
| 18| Fingerprint table listed protocol-normalized values as if raw.                                                            | Raw DB-side and Canonical POSIX fingerprints were recomputed in Turn 5A.1R2 via `extensions.digest` (see §A.1); all six values match the accepted post-migration evidence. | Fingerprint work is CLOSED. No fingerprint recomputation remains as a Turn 5A.2 prerequisite beyond the normal hard-fail preflight. Historical shell-pipeline "raw" values (`8b1d809e…`, `fec188c8…`, `eb141739…`) are explicitly withdrawn. | 21 §A                               |

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

## K. Same-source Deposit → Final fixture architecture (locked, Turn 5A.1R4 reachability corrected)

Single `LS_COEXIST` sample. Live validation order (Outer Idempotency → Source
Lock → Source Row Load → **Source Status Validation** → **Same-Kind
Source-Link Conflict Guard** → Invoice Creation) forces the C2 order:
`Deposit → Duplicate Deposit (while still accessioned) → status transitions
to completed → Final → Duplicate Final (while completed)`. See `22
§Coexistence lifecycle` for the 9-step lifecycle. Two active billing links
(one deposit + one final) MUST point to distinct invoices. Duplicate deposit
or duplicate final on the same source_id independently →
`FIN_SOURCE_LINK_CONFLICT` (with FRESH idempotency keys so
`_finance_idempotency_begin` does not intercept before
`_finance_billing_link_upsert`).

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

## N. Token classification totals (Turn 5A.1R3)

Aligned with File 23 §4 after rows 61/62 A→C reclassification.

| Category                                                | Count |
|---------------------------------------------------------|-------|
| A — Directly executable                                 | 37    |
| B — Executable via safe savepoint-scoped fixture shaping| 4     |
| C — Internal invariant / multi-actor / concurrent       | 14    |
| D — Structurally unreachable                            | 2     |
| T2 failure-hook tokens (T2-owned, not counted as T1)    | 4     |

## O. Exact T1 Scenario Inventory (Turn 5A.1R3 lock)

Every executable T1 case has a unique stable Scenario ID. Every referenced
fixture symbol is defined exactly once in File 22 (see File 22 §A–F). Every
call resolves to an exact Idempotency UUID via File 22 §H. Dependent
scenarios share one Group SAVEPOINT per Chain (see File 22 §I). T2 failure
stages appear in §O.4 and are NOT counted as T1.

Sub-turn ownership (Turn 5A.1R3 lock):

- **Turn 5A.2 owns**: payload validation, Lab Deposit, Lab Final, **Chain C1**
  (base success + replay + idempotency conflict), and **Chain C2**
  (Deposit + Final + duplicate Deposit + duplicate Final on `LS_COEXIST`).
- **Turn 5A.3 owns**: Horse Order matrix, billing-authority trigger matrix
  (T14/T15/T16 accepts + T13 reject), permission-negative matrix, and the
  Payment-Account-absence case.

Dependency chains are NEVER split across sub-turns.

### O.1 T1 rows — Sub-turn 5A.2 (Payload + Lab Deposit/Final + Chain C1 + Chain C2)

| Scenario ID | Cat | Chain                     | Source type | Fixture (File 22)         | Link kind | Payment method | Payload variation                                    | Expected token / status                          | Persisted assertions                                                                                    | SAVEPOINT                       | Exact Idem UUID (File 22 §H) | Prerequisite / dep    |
|-------------|-----|---------------------------|-------------|---------------------------|-----------|----------------|------------------------------------------------------|--------------------------------------------------|----------------------------------------------------------------------------------------------------------|---------------------------------|-------------------------------|------------------------|
| T1-A-01     | A   | independent               | n/a         | n/a                       | n/a       | n/a            | JWT claims cleared                                   | `FIN_UNAUTHENTICATED` / 42501                    | Δinvoices=Δinvoice_items=Δbilling_links=Δledger=0                                                        | sp_A01                          | `11111111-…-000000000004`     | —                      |
| T1-A-02     | A   | independent               | n/a         | n/a                       | n/a       | n/a            | `p_payload := NULL`                                  | `FIN_BAD_ARGS` / 22023                           | zero-delta                                                                                              | sp_A02                          | `11111111-…-000000000005`     | —                      |
| T1-A-03     | A   | independent               | n/a         | n/a                       | n/a       | n/a            | `p_payload := '[]'::jsonb`                           | `FIN_PAYLOAD_TYPE` / 23514                       | zero-delta                                                                                              | sp_A03                          | `11111111-…-000000000006`     | —                      |
| T1-A-04     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | tenant Actor is not a member of                      | `FIN_TENANT_ACCESS_DENIED` / 42501               | zero-delta                                                                                              | sp_A04                          | `11111111-…-000000000007`     | —                      |
| T1-A-05     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | root key `"foo":1` present                           | `FIN_PAYLOAD_UNKNOWN_KEY: foo` / 23514           | zero-delta                                                                                              | sp_A05                          | `11111111-…-000000000008`     | —                      |
| T1-A-06     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `source_type` omitted                                | `FIN_SOURCE_TYPE_REQUIRED` / 23514               | zero-delta                                                                                              | sp_A06                          | `11111111-…-000000000009`     | —                      |
| T1-A-07     | A   | independent               | (raw)       | n/a                       | deposit   | cash           | `source_type='foo'`                                  | `FIN_SOURCE_TYPE_INVALID` / 23514                | zero-delta                                                                                              | sp_A07                          | `11111111-…-00000000000a`     | —                      |
| T1-A-08     | A   | independent               | lab_sample  | (omit)                    | deposit   | cash           | `source_id` omitted                                  | `FIN_SOURCE_ID_REQUIRED` / 23514                 | zero-delta                                                                                              | sp_A08                          | `11111111-…-00000000000b`     | —                      |
| T1-A-09     | A   | independent               | lab_sample  | `"not-a-uuid"`            | deposit   | cash           | invalid UUID cast                                    | `FIN_SOURCE_ID_INVALID` / 23514                  | zero-delta                                                                                              | sp_A09                          | `11111111-…-00000000000c`     | —                      |
| T1-A-10     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | (omit)    | cash           | `link_kind` omitted                                  | `FIN_LINK_KIND_REQUIRED` / 23514                 | zero-delta                                                                                              | sp_A10                          | `11111111-…-00000000000d`     | —                      |
| T1-A-11     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | `bogus`   | cash           | invalid `link_kind`                                  | `FIN_LINK_KIND_INVALID` / 23514                  | zero-delta                                                                                              | sp_A11                          | `11111111-…-00000000000e`     | —                      |
| T1-A-12     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | (omit)         | `payment_method` omitted                             | `FIN_PAYMENT_METHOD_REQUIRED` / 23514            | zero-delta                                                                                              | sp_A12                          | `11111111-…-00000000000f`     | —                      |
| T1-A-13     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | `bitcoin`      | invalid `payment_method`                             | `FIN_PAYMENT_METHOD_INVALID` / 23514             | zero-delta                                                                                              | sp_A13                          | `11111111-…-000000000010`     | —                      |
| T1-A-14     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `prices_include_tax:"yes"`                           | `FIN_PAYLOAD_TYPE: prices_include_tax` / 23514   | zero-delta                                                                                              | sp_A14                          | `11111111-…-000000000011`     | —                      |
| T1-A-15     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `discount_amount:"10"`                               | `FIN_PAYLOAD_TYPE: discount_amount` / 23514      | zero-delta                                                                                              | sp_A15                          | `11111111-…-000000000012`     | —                      |
| T1-A-16     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `discount_amount:-1`                                 | `FIN_DISCOUNT_INVALID` / 23514                   | zero-delta                                                                                              | sp_A16                          | `11111111-…-000000000013`     | —                      |
| T1-A-17     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `notes:123`                                          | `FIN_PAYLOAD_TYPE: notes` / 23514                | zero-delta                                                                                              | sp_A17                          | `11111111-…-000000000014`     | —                      |
| T1-A-18     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | 501-char `notes` (500 passes)                        | `FIN_NOTES_TOO_LONG` / 23514                     | zero-delta                                                                                              | sp_A18                          | `11111111-…-000000000015`     | —                      |
| T1-A-19     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `client_name:42`                                     | `FIN_PAYLOAD_TYPE: client_name` / 23514          | zero-delta                                                                                              | sp_A19                          | `11111111-…-000000000016`     | —                      |
| T1-A-20     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `items` omitted                                      | `FIN_ITEMS_EMPTY` / 23514                        | zero-delta                                                                                              | sp_A20                          | `11111111-…-000000000017`     | —                      |
| T1-A-21     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `items:[1]`                                          | `FIN_PAYLOAD_TYPE: items[]` / 23514              | zero-delta                                                                                              | sp_A21                          | `11111111-…-000000000018`     | —                      |
| T1-A-22     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | item has `"horse_id":"…"`                            | `FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id`      | zero-delta                                                                                              | sp_A22                          | `11111111-…-000000000019`     | —                      |
| T1-A-23     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | item missing `description`                           | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED` / 23514      | zero-delta                                                                                              | sp_A23                          | `11111111-…-00000000001a`     | —                      |
| T1-A-24     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `quantity:0`                                         | `FIN_LAB_ITEM_QUANTITY_INVALID` / 23514          | zero-delta                                                                                              | sp_A24                          | `11111111-…-00000000001b`     | —                      |
| T1-A-25     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `unit_price:-1`                                      | `FIN_LAB_ITEM_PRICE_INVALID` / 23514             | zero-delta                                                                                              | sp_A25                          | `11111111-…-00000000001c`     | —                      |
| T1-A-26     | A   | independent               | lab_sample  | LS_ACCESSIONED_LEGACY     | deposit   | cash           | `is_taxable:"true"`                                  | `FIN_PAYLOAD_TYPE: items[].is_taxable` / 23514   | zero-delta                                                                                              | sp_A26                          | `11111111-…-00000000001d`     | —                      |
| T1-A-27     | A   | independent               | lab_sample  | unknown UUID              | deposit   | cash           | source not found in primary tenant                   | `FIN_SOURCE_NOT_FOUND` / 23503                   | zero-delta                                                                                              | sp_A27                          | `11111111-…-00000000001e`     | —                      |
| T1-A-28     | A   | independent               | lab_sample  | LS_CANCELLED              | deposit   | cash           | source status=cancelled                              | `FIN_SOURCE_CANCELLED` / 42501                   | zero-delta                                                                                              | sp_A28                          | `11111111-…-00000000001f`     | —                      |
| T1-A-29     | A   | independent               | lab_sample  | LS_PROCESSING             | deposit   | cash           | processing status                                    | `FIN_LAB_DEPOSIT_STATUS_INVALID` / 42501         | zero-delta                                                                                              | sp_A29                          | `11111111-…-000000000020`     | —                      |
| T1-A-30     | A   | independent               | lab_sample  | LS_DRAFT_LEGACY           | final     | cash           | draft via final path                                 | `FIN_LAB_FINAL_STATUS_INVALID` / 42501           | zero-delta                                                                                              | sp_A30                          | `11111111-…-000000000021`     | —                      |
| T1-A-31     | A   | independent               | lab_sample  | LS_WALKIN_LONG_NAME       | deposit   | cash           | walk-in; payload `client_name` length=201            | `FIN_CLIENT_NAME_TOO_LONG` / 23514               | zero-delta                                                                                              | sp_A31                          | `11111111-…-000000000022`     | —                      |
| T1-A-32     | A   | independent               | lab_sample  | LS_CROSS_TENANT_CLIENT    | deposit   | cash           | fixture `client_id` = secondary-tenant client        | `FIN_SOURCE_CLIENT_CROSS_TENANT` / 23503         | zero-delta                                                                                              | sp_A32                          | `11111111-…-000000000023`     | —                      |
| T1-A-33     | A   | independent               | lab_sample  | LS_ZERO_PRICE             | deposit   | cash           | item unit_price=0, qty=1, discount=0                 | `FIN_CHECKOUT_TOTAL_INVALID` / 23514             | zero-delta                                                                                              | sp_A33                          | `11111111-…-000000000024`     | —                      |
| T1-P-02     | pos | independent               | lab_sample  | LS_COMPLETED_LEGACY       | final     | cash           | valid Final on completed sample                      | success, invoice status=`paid`                   | Δinvoices=1, Δbilling_links=1 (kind=final)                                                              | sp_P02                          | `22222222-…-000000000001`     | —                      |
| T1-P-01     | pos | **C1** `sp_chain_lab_replay` | lab_sample | LS_ACCESSIONED_LEGACY   | deposit   | cash           | base valid single-item deposit                        | success, invoice status=`paid`                   | Δinvoices=1, Δinvoice_items=1, Δbilling_links=1 (kind=deposit), Δledger≥2, `_finance_idempotency_complete` row present | (chain: `sp_chain_lab_replay`)  | `11111111-…-000000000001`     | starts C1              |
| T1-P-06     | pos | **C1** `sp_chain_lab_replay` | lab_sample | LS_ACCESSIONED_LEGACY   | deposit   | cash           | same key + byte-equal payload                         | success (replay); `stored_response` returned     | Δinvoices=0, Δbilling_links=0, replay path exercised                                                    | (chain: `sp_chain_lab_replay`)  | `11111111-…-000000000001` (shared with T1-P-01) | after T1-P-01 |
| T1-A-40     | A   | **C1** `sp_chain_lab_replay` | lab_sample | LS_ACCESSIONED_LEGACY   | deposit   | cash           | same key + changed `notes`                            | `FIN_IDEMPOTENCY_CONFLICT` / 23514               | zero-delta beyond T1-P-01 baseline                                                                       | (chain: `sp_chain_lab_replay`)  | `11111111-…-000000000001` (shared with T1-P-01) | after T1-P-06 |
| T1-P-03     | pos | **C2** `sp_chain_lab_coexistence` | lab_sample | LS_COEXIST         | deposit   | cash           | Deposit on `accessioned` LS_COEXIST                  | success                                          | Δinvoices=1, Δbilling_links=1 (kind=deposit)                                                            | (chain: `sp_chain_lab_coexistence`) | `22222222-…-000000000002` | starts C2              |
| T1-A-34     | A   | **C2** `sp_chain_lab_coexistence` | lab_sample | LS_COEXIST         | deposit   | cash           | duplicate deposit with FRESH idem key WHILE STILL `accessioned` | `FIN_SOURCE_LINK_CONFLICT` / 23514        | zero-delta beyond T1-P-03 baseline                                                                       | (chain: `sp_chain_lab_coexistence`) | `44444444-…-000000000001` (FRESH) | after T1-P-03, before status transition |
| T1-P-04     | pos | **C2** `sp_chain_lab_coexistence` | lab_sample | LS_COEXIST         | final     | cash           | privileged UPDATE `accessioned`→`processing`→`completed`; Final | success                                    | Δinvoices=+1, Δbilling_links=+1 (kind=final), pre-existing deposit link retained                        | (chain: `sp_chain_lab_coexistence`) | `22222222-…-000000000003` | after T1-A-34          |
| T1-A-42     | A   | **C2** `sp_chain_lab_coexistence` | lab_sample | LS_COEXIST         | final     | cash           | duplicate final with FRESH idem key WHILE `completed` | `FIN_SOURCE_LINK_CONFLICT` / 23514              | zero-delta beyond T1-P-04 baseline                                                                       | (chain: `sp_chain_lab_coexistence`) | `44444444-…-000000000002` (FRESH) | after T1-P-04          |

C2 reachability lock (Turn 5A.1R4): duplicate-Deposit fires BEFORE the
`accessioned → processing → completed` transition (deposit-eligibility must
still hold); duplicate-Final fires AFTER the transition (final-eligibility
must already hold). See File 22 §Live validation order and §Coexistence
lifecycle.

**Sub-turn 5A.2 T1 row count = 41** (33 A + 3 A moved into C1 + 1 A moved from C2 top + 1 A new C2-dup-final; positives = P-01, P-02, P-03, P-04, P-06). Breakdown: **34 A + 0 B + 7 positive → 41 rows** with A = {A-01..A-33, A-34, A-40, A-42} = 33+3 = 36 A, positives = {P-01, P-02, P-03, P-04, P-06} = 5. **36 A + 5 positive = 41 rows.**

### O.2 T1 rows — Sub-turn 5A.3 (Horse Order + trigger + permissions + payment-account absence)

| Scenario ID | Cat | Chain       | Source type | Fixture (File 22)            | Link kind | Payment method | Payload variation                                                                 | Expected token / status                             | Persisted assertions                                       | SAVEPOINT | Exact Idem UUID (File 22 §H) |
|-------------|-----|-------------|-------------|------------------------------|-----------|----------------|-----------------------------------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------|-----------|-------------------------------|
| T1-A-35     | A   | independent | horse_order | HO_COMPLETED_ACTUAL          | final     | cash           | `items:[…]` present on horse-order path                                            | `FIN_HORSE_ORDER_ITEMS_FORBIDDEN` / 23514           | zero-delta                                                  | sp_A35    | `33333333-…-000000000002`     |
| T1-A-36     | A   | independent | horse_order | HO_COMPLETED_ACTUAL          | deposit   | cash           | horse-order + deposit                                                              | `FIN_HORSE_ORDER_LINK_KIND_INVALID` / 23514         | zero-delta                                                  | sp_A36    | `33333333-…-000000000003`     |
| T1-A-37     | A   | independent | horse_order | HO_DRAFT                     | final     | cash           | order status draft                                                                 | `FIN_ORDER_NOT_COMPLETED` / 42501                   | zero-delta                                                  | sp_A37    | `33333333-…-000000000004`     |
| T1-A-38     | A   | independent | horse_order | HO_MISSING_COST              | final     | cash           | actual_cost=estimated_cost=NULL                                                    | `FIN_ORDER_MISSING_COST` / 23514                    | zero-delta                                                  | sp_A38    | `33333333-…-000000000005`     |
| T1-A-39     | A   | independent | horse_order | HO_HORSE_CROSS_TENANT        | final     | cash           | order tenant=primary, horse tenant=secondary                                       | `FIN_ORDER_HORSE_NOT_FOUND` / 23503                 | zero-delta                                                  | sp_A39    | `33333333-…-000000000006`     |
| T1-P-05     | pos | independent | horse_order | HO_COMPLETED_ACTUAL          | final     | cash           | valid completed order, actual_cost>0                                               | success                                             | Δinvoices=1, Δinvoice_items=1 (entity_type='horse_order')   | sp_P05    | `33333333-…-000000000001`     |
| T1-B-01     | B   | independent | lab_sample  | LS_ACCESSIONED_LEGACY        | deposit   | cash           | demote Actor→foreman; `finance.invoice.create=false` (no prerequisites needed)     | `FIN_PERMISSION_DENIED` / 42501                     | zero-delta                                                  | sp_B01    | `55555555-…-000000000001`     |
| T1-B-02     | B   | independent | lab_sample  | LS_ACCESSIONED_LEGACY        | deposit   | **debt**       | demote; `invoice.create=true` explicit; `invoice.approve=false`; debt skips payment perm | `FIN_PERMISSION_DENIED` / 42501                | zero-delta                                                  | sp_B02    | `55555555-…-000000000002`     |
| T1-B-03     | B   | independent | lab_sample  | LS_ACCESSIONED_LEGACY        | deposit   | cash           | demote; `invoice.create=true` + `invoice.approve=true` explicit; `payment.create=false` | `FIN_PERMISSION_DENIED` / 42501              | zero-delta                                                  | sp_B03    | `55555555-…-000000000003`     |
| T1-B-04     | B   | independent | lab_sample  | LS_ACCESSIONED_LEGACY        | deposit   | cash           | UPDATE `payment_accounts.is_active=false` for primary tenant                        | `FIN_TENANT_PAYMENT_ACCOUNT_MISSING` / 23503        | zero-delta                                                  | sp_B04    | `55555555-…-000000000004`     |
| T1-P-07     | pos | independent | lab_sample  | LS_ACCESSIONED_LEGACY        | deposit   | cash           | lab_horse=LH_LEGACY_CLIENT — trigger T14 legacy-client accept                       | success                                             | trigger validate passes                                     | sp_P07    | `55555555-…-000000000006`     |
| T1-P-08     | pos | independent | lab_sample  | LS_DEP_JUNCTION_CUSTOMER     | deposit   | cash           | `party_horse_links.relationship_type='lab_customer'` — trigger T15 accept          | success                                             | trigger validate passes                                     | sp_P08    | `55555555-…-000000000007`     |
| T1-P-09     | pos | independent | lab_sample  | LS_FIN_JUNCTION_PAYER        | **final** | cash           | `party_horse_links.relationship_type='payer'` — trigger T16 accept (fixture status=`completed`, so link_kind must be `final`) | success | trigger validate passes                                     | sp_P09    | `55555555-…-000000000008`     |
| T1-A-41     | A   | independent | lab_sample  | LS_DEP_OWNER_ONLY            | deposit   | cash           | trigger rejects owner-only link (T13)                                              | `Lab horse … is not linked` / 42501                 | zero-delta                                                  | sp_A41    | `55555555-…-000000000009`     |

**Sub-turn 5A.3 T1 row count = 14** (6 A + 4 B + 4 positive).

### O.3 T1 counts (row-count derived, Turn 5A.1R3)

| Sub-turn | A | B | Positive | Row total |
|----------|---|---|----------|-----------|
| 5A.2     | 36 | 0 | 5        | **41**    |
| 5A.3     | 6  | 4 | 4        | **14**    |
| **Total executable T1** | **42** | **4** | **9** | **55** |

The prior Turn 5A.1R2 total of **54** is superseded. Turn 5A.1R3 changes:

- Chain C1 (T1-P-01, T1-P-06, T1-A-40) moved wholly into Sub-turn 5A.2 with
  shared idem UUID `11111111-…-000000000001`.
- Chain C2 gains T1-A-42 (duplicate Final with fresh idem UUID) alongside
  T1-A-34 (duplicate Deposit with fresh idem UUID).
- Rows 61/62 of File 23 are Category C (multi-actor/concurrent — outside T1).
- Row 40 (`FIN_ORDER_TYPE_NOT_FOUND`) remains Category D; `HOT_TO_DELETE` and
  `HO_ORDER_TYPE_MISSING` are withdrawn from the executable fixture namespace
  (see File 22 §E note).

### O.4 T2 stages (T2-owned; not counted in T1)

Exactly 5 stages, each a distinct SAVEPOINT in `j5_2_source_checkout_atomicity.test.sql`:

1. `fin.fail_after_trace='raise'` → `FIN_TEST_FAIL_AFTER_TRACE`.
2. `fin.fail_after_approve='raise'` → `FIN_TEST_FAIL_AFTER_APPROVE`.
3. `fin.fail_after_payment='raise'` → `FIN_TEST_FAIL_AFTER_PAYMENT` (cash only).
4. `fin.fail_after_source_link='raise'` → `FIN_TEST_FAIL_AFTER_SOURCE_LINK`.
5. Default-inert success (no GUC) — proves hooks are opt-in.

### O.5 Reported counts (row-count derived)

| Bucket                                     | Count |
|--------------------------------------------|-------|
| T1 5A.2 (rows in §O.1)                     | 41    |
| T1 5A.3 (rows in §O.2)                     | 14    |
| **Total executable T1**                    | **55**|
| Category A (executable)                    | 42    |
| Category B (savepoint-shaped)              | 4     |
| Positive (executable)                      | 9     |
| Static-review-only (Category C, File 23)   | 14    |
| Structurally unreachable (Category D)      | 2     |
| T2 stage count                             | 5     |

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

**Turn 5A.2** — T1 Foundation + Complete Deterministic Fixtures + Payload
Validation + Laboratory Deposit + Laboratory Final + Replay/Conflict Chain (C1) +
Same-Source Deposit/Final Coexistence Chain (C2, including duplicate-Deposit and
duplicate-Final rejections).

## U. Five-phase roadmap position

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase: J5.2-SLICE-01-EXECUTION —
  TURN 5A.1R3 (cross-file consistency lock — this turn).
- Phase 3 — N+2: NOT STARTED / NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED / NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED / NOT AUTHORIZED.
