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

## N. Token classification totals (Turn 5A.1R2)

Aligned with File 23 §4 after row-40 D-reclassification and the addition of the
externally observable Idempotency helper tokens (rows 60–62).

| Category                                                | Count |
|---------------------------------------------------------|-------|
| A — Directly executable                                 | 39    |
| B — Executable via safe savepoint-scoped fixture shaping| 4     |
| C — Internal invariant, static review only              | 12    |
| D — Structurally unreachable                            | 2     |
| T2 failure-hook tokens (T2-owned, not counted as T1)    | 4     |

## O. Exact T1 Scenario Inventory (Turn 5A.1R2 lock)

Every executable T1 case has a unique stable Scenario ID. Sub-turn ownership is
either `5A.2` (payload validation + Lab Deposit/Final + Coexistence) or `5A.3`
(Horse Order, trigger surface, permission-negatives, source-link conflict,
checkout invariants, idempotency). T2 failure-hook stages appear in §O.4 and are
NOT counted as T1.

### O.1 T1 rows — Sub-turn 5A.2 (Payload + Lab Deposit + Lab Final + Coexistence)

| Scenario ID | Category | Source type | Fixture source ID   | Link kind | Payment method | Payload variation                                    | Expected token / status                          | Persisted assertions (post ROLLBACK TO SAVEPOINT)             | SAVEPOINT | Idem key symbol       |
|-------------|----------|-------------|---------------------|-----------|----------------|------------------------------------------------------|--------------------------------------------------|---------------------------------------------------------------|-----------|-----------------------|
| T1-A-01     | A        | n/a         | n/a                 | n/a       | n/a            | JWT claims cleared                                   | `FIN_UNAUTHENTICATED` / 42501                    | Δinvoices=Δinvoice_items=Δbilling_links=Δledger=0             | sp_A01    | K-LAB-DEP-01          |
| T1-A-02     | A        | n/a         | n/a                 | n/a       | n/a            | `p_payload := NULL`                                  | `FIN_BAD_ARGS` / 22023                           | zero-delta                                                    | sp_A02    | K-LAB-DEP-02          |
| T1-A-03     | A        | n/a         | n/a                 | n/a       | n/a            | `p_payload := '[]'::jsonb`                           | `FIN_PAYLOAD_TYPE` / 23514                       | zero-delta                                                    | sp_A03    | K-LAB-DEP-03          |
| T1-A-04     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | tenant = tenant Actor is not a member of              | `FIN_TENANT_ACCESS_DENIED` / 42501               | zero-delta                                                    | sp_A04    | K-LAB-DEP-04          |
| T1-A-05     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | root key `"foo":1` present                           | `FIN_PAYLOAD_UNKNOWN_KEY: foo` / 23514           | zero-delta                                                    | sp_A05    | K-LAB-DEP-05          |
| T1-A-06     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `source_type` omitted                                | `FIN_SOURCE_TYPE_REQUIRED` / 23514               | zero-delta                                                    | sp_A06    | K-LAB-DEP-06          |
| T1-A-07     | A        | (raw)       | n/a                 | deposit   | cash           | `source_type='foo'`                                  | `FIN_SOURCE_TYPE_INVALID` / 23514                | zero-delta                                                    | sp_A07    | K-LAB-DEP-07          |
| T1-A-08     | A        | lab_sample  | (omit)              | deposit   | cash           | `source_id` omitted                                  | `FIN_SOURCE_ID_REQUIRED` / 23514                 | zero-delta                                                    | sp_A08    | K-LAB-DEP-08          |
| T1-A-09     | A        | lab_sample  | `"not-a-uuid"`      | deposit   | cash           | invalid UUID cast                                    | `FIN_SOURCE_ID_INVALID` / 23514                  | zero-delta                                                    | sp_A09    | K-LAB-DEP-09          |
| T1-A-10     | A        | lab_sample  | LS_ACCESSIONED      | (omit)    | cash           | `link_kind` omitted                                  | `FIN_LINK_KIND_REQUIRED` / 23514                 | zero-delta                                                    | sp_A10    | K-LAB-DEP-10          |
| T1-A-11     | A        | lab_sample  | LS_ACCESSIONED      | `bogus`   | cash           | invalid `link_kind`                                  | `FIN_LINK_KIND_INVALID` / 23514                  | zero-delta                                                    | sp_A11    | K-LAB-DEP-11          |
| T1-A-12     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | (omit)         | `payment_method` omitted                             | `FIN_PAYMENT_METHOD_REQUIRED` / 23514            | zero-delta                                                    | sp_A12    | K-LAB-DEP-12          |
| T1-A-13     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | `bitcoin`      | invalid `payment_method`                             | `FIN_PAYMENT_METHOD_INVALID` / 23514             | zero-delta                                                    | sp_A13    | K-LAB-DEP-13          |
| T1-A-14     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `prices_include_tax:"yes"`                           | `FIN_PAYLOAD_TYPE: prices_include_tax` / 23514   | zero-delta                                                    | sp_A14    | K-LAB-DEP-14          |
| T1-A-15     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `discount_amount:"10"`                               | `FIN_PAYLOAD_TYPE: discount_amount` / 23514      | zero-delta                                                    | sp_A15    | K-LAB-DEP-15          |
| T1-A-16     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `discount_amount:-1`                                 | `FIN_DISCOUNT_INVALID` / 23514                   | zero-delta                                                    | sp_A16    | K-LAB-DEP-16          |
| T1-A-17     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `notes:123`                                          | `FIN_PAYLOAD_TYPE: notes` / 23514                | zero-delta                                                    | sp_A17    | K-LAB-DEP-17          |
| T1-A-18     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | 501-char `notes` (500 passes)                        | `FIN_NOTES_TOO_LONG` / 23514                     | zero-delta                                                    | sp_A18    | K-LAB-DEP-18          |
| T1-A-19     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `client_name:42`                                     | `FIN_PAYLOAD_TYPE: client_name` / 23514          | zero-delta                                                    | sp_A19    | K-LAB-DEP-19          |
| T1-A-20     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `items` omitted                                      | `FIN_ITEMS_EMPTY` / 23514                        | zero-delta                                                    | sp_A20    | K-LAB-DEP-20          |
| T1-A-21     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `items:[1]`                                          | `FIN_PAYLOAD_TYPE: items[]` / 23514              | zero-delta                                                    | sp_A21    | K-LAB-DEP-21          |
| T1-A-22     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | item has `"horse_id":"…"`                            | `FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id`      | zero-delta                                                    | sp_A22    | K-LAB-DEP-22          |
| T1-A-23     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | item missing `description`                           | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED` / 23514      | zero-delta                                                    | sp_A23    | K-LAB-DEP-23          |
| T1-A-24     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `quantity:0`                                         | `FIN_LAB_ITEM_QUANTITY_INVALID` / 23514          | zero-delta                                                    | sp_A24    | K-LAB-DEP-24          |
| T1-A-25     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `unit_price:-1`                                      | `FIN_LAB_ITEM_PRICE_INVALID` / 23514             | zero-delta                                                    | sp_A25    | K-LAB-DEP-25          |
| T1-A-26     | A        | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | `is_taxable:"true"`                                  | `FIN_PAYLOAD_TYPE: items[].is_taxable` / 23514   | zero-delta                                                    | sp_A26    | K-LAB-DEP-26          |
| T1-A-27     | A        | lab_sample  | unknown UUID        | deposit   | cash           | source not found in primary tenant                   | `FIN_SOURCE_NOT_FOUND` / 23503                   | zero-delta                                                    | sp_A27    | K-LAB-DEP-27          |
| T1-A-28     | A        | lab_sample  | LS_CANCELLED        | deposit   | cash           | source status=cancelled                              | `FIN_SOURCE_CANCELLED` / 42501                   | zero-delta                                                    | sp_A28    | K-LAB-DEP-28          |
| T1-A-29     | A        | lab_sample  | LS_PROCESSING       | deposit   | cash           | processing status                                    | `FIN_LAB_DEPOSIT_STATUS_INVALID` / 42501         | zero-delta                                                    | sp_A29    | K-LAB-DEP-29          |
| T1-A-30     | A        | lab_sample  | LS_DRAFT_LEGACY     | final     | cash           | draft status via final path                          | `FIN_LAB_FINAL_STATUS_INVALID` / 42501           | zero-delta                                                    | sp_A30    | K-LAB-FIN-01          |
| T1-A-31     | A        | lab_sample  | LS_WALKIN_LONGNAME  | deposit   | cash           | walk-in sample; payload `client_name` length=201     | `FIN_CLIENT_NAME_TOO_LONG` / 23514               | zero-delta                                                    | sp_A31    | K-LAB-DEP-30          |
| T1-A-32     | A        | lab_sample  | LS_CROSS_TENANT_CLIENT | deposit | cash        | sample fixture `client_id` = secondary-tenant client | `FIN_SOURCE_CLIENT_CROSS_TENANT` / 23503         | zero-delta                                                    | sp_A32    | K-LAB-DEP-31          |
| T1-A-33     | A        | lab_sample  | LS_ZEROPRICE_ITEM   | deposit   | cash           | item unit_price=0, quantity=1, discount=0            | `FIN_CHECKOUT_TOTAL_INVALID` / 23514             | zero-delta                                                    | sp_A33    | K-LAB-DEP-32          |
| T1-P-01     | positive | lab_sample  | LS_ACCESSIONED      | deposit   | cash           | valid single-item deposit; unit_price>0              | success, invoice status=`paid`                   | Δinvoices=1, Δinvoice_items=1, Δbilling_links=1 (kind=deposit), Δledger≥2, `_finance_idempotency_complete` row present | sp_P01 | K-LAB-DEP-P |
| T1-P-02     | positive | lab_sample  | LS_COMPLETED_STANDALONE | final | cash          | valid final on completed sample                      | success, invoice status=`paid`                   | Δinvoices=1, Δbilling_links=1 (kind=final)                    | sp_P02    | K-LAB-FIN-P           |
| T1-P-03     | positive | lab_sample  | LS_COEXIST          | deposit   | cash           | Deposit on `accessioned` LS_COEXIST                  | success                                          | Δinvoices=1, Δbilling_links=1 (kind=deposit)                  | sp_P03    | K-COEXIST-DEP         |
| T1-P-04     | positive | lab_sample  | LS_COEXIST          | final     | cash           | after T1-P-03: privileged UPDATE `processing`→`completed`; Final invoice | success | Δinvoices=+1, Δbilling_links=+1 (kind=final), pre-existing deposit link retained | sp_P04 | K-COEXIST-FIN |
| T1-A-34     | A        | lab_sample  | LS_COEXIST          | deposit   | cash           | duplicate deposit after T1-P-03 with new idem key    | `FIN_SOURCE_LINK_CONFLICT` / 23514               | zero-delta beyond T1-P-03 baseline                            | sp_A34    | K-COEXIST-DEP-DUP     |

**Sub-turn 5A.2 T1 row count = 38.**

### O.2 T1 rows — Sub-turn 5A.3 (Horse Order + trigger + permissions + invariants + idempotency)

| Scenario ID | Category | Source type   | Fixture source ID              | Link kind | Payment method | Payload variation                                                                 | Expected token / status                                          | Persisted assertions                                       | SAVEPOINT | Idem key symbol            |
|-------------|----------|---------------|--------------------------------|-----------|----------------|-----------------------------------------------------------------------------------|------------------------------------------------------------------|------------------------------------------------------------|-----------|----------------------------|
| T1-A-35     | A        | horse_order   | HO_COMPLETED                   | final     | cash           | `items:[…]` present on horse-order path                                            | `FIN_HORSE_ORDER_ITEMS_FORBIDDEN` / 23514                        | zero-delta                                                 | sp_A35    | K-HO-FIN-01                |
| T1-A-36     | A        | horse_order   | HO_COMPLETED                   | deposit   | cash           | horse-order + deposit                                                              | `FIN_HORSE_ORDER_LINK_KIND_INVALID` / 23514                      | zero-delta                                                 | sp_A36    | K-HO-FIN-02                |
| T1-A-37     | A        | horse_order   | HO_DRAFT                       | final     | cash           | order status draft                                                                 | `FIN_ORDER_NOT_COMPLETED` / 42501                                | zero-delta                                                 | sp_A37    | K-HO-FIN-03                |
| T1-A-38     | A        | horse_order   | HO_MISSING_COST                | final     | cash           | actual_cost=estimated_cost=NULL                                                    | `FIN_ORDER_MISSING_COST` / 23514                                 | zero-delta                                                 | sp_A38    | K-HO-FIN-04                |
| T1-A-39     | A        | horse_order   | HO_HORSE_CROSS_TENANT          | final     | cash           | order tenant=primary, horse tenant=secondary                                       | `FIN_ORDER_HORSE_NOT_FOUND` / 23503                              | zero-delta                                                 | sp_A39    | K-HO-FIN-05                |
| T1-P-05     | positive | horse_order   | HO_COMPLETED                   | final     | cash           | valid completed order with actual_cost>0                                            | success                                                          | Δinvoices=1, Δinvoice_items=1 (entity_type='horse_order')  | sp_P05    | K-HO-FIN-P                 |
| T1-B-01     | B        | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | SAVEPOINT: demote Actor role to `foreman`; upsert `member_permissions(finance.invoice.create,granted=false)` | `FIN_PERMISSION_DENIED` / 42501             | zero-delta                                                 | sp_B01    | K-PERM-CREATE              |
| T1-B-02     | B        | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | same as T1-B-01 for `finance.invoice.approve`                                       | `FIN_PERMISSION_DENIED` / 42501                                  | zero-delta                                                 | sp_B02    | K-PERM-APPROVE             |
| T1-B-03     | B        | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | same for `finance.payment.create` (cash path)                                       | `FIN_PERMISSION_DENIED` / 42501                                  | zero-delta                                                 | sp_B03    | K-PERM-PAYMENT             |
| T1-B-04     | B        | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | SAVEPOINT: UPDATE `payment_accounts.is_active=false` for primary tenant             | `FIN_TENANT_PAYMENT_ACCOUNT_MISSING` / 23503                     | zero-delta                                                 | sp_B04    | K-NOACCT                   |
| T1-P-06     | positive | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | Same-key/same-payload replay of a prior successful deposit                          | success (replay); `stored_response` returned verbatim            | Δinvoices=0, Δbilling_links=0, only replay path exercised  | sp_P06    | K-LAB-DEP-P (reused)       |
| T1-A-40     | A        | lab_sample    | LS_ACCESSIONED                 | deposit   | cash           | Same-key/changed-payload (notes differ) after successful deposit                    | `FIN_IDEMPOTENCY_CONFLICT` / 23514                               | zero-delta                                                 | sp_A40    | K-LAB-DEP-P (reused)       |
| T1-P-07     | positive | lab_sample    | LS_ACCESSIONED_LH_LEGACY_CLIENT| deposit   | cash           | invoice client = lab_horses.legacy client — trigger T14 accept                     | success                                                          | trigger validate passes                                    | sp_P07    | K-TRIG-T14                 |
| T1-P-08     | positive | lab_sample    | LS_ACCESSIONED_LH_LAB_CUSTOMER | deposit   | cash           | `party_horse_links.relationship_type='lab_customer'` — trigger T15 accept          | success                                                          | trigger validate passes                                    | sp_P08    | K-TRIG-T15                 |
| T1-P-09     | positive | lab_sample    | LS_ACCESSIONED_LH_PAYER        | deposit   | cash           | `party_horse_links.relationship_type='payer'` — trigger T16 accept                 | success                                                          | trigger validate passes                                    | sp_P09    | K-TRIG-T16                 |
| T1-A-41     | A        | lab_sample    | LS_ACCESSIONED_LH_OWNER_ONLY   | deposit   | cash           | trigger rejects owner-only link (T13/T12)                                          | trigger raises `Lab horse … is not linked` / 42501               | zero-delta                                                 | sp_A41    | K-TRIG-T13                 |

**Sub-turn 5A.3 T1 row count = 16.**

### O.3 T1 counts

| Sub-turn | Category-A rows | Category-B rows | Positive rows | Row total |
|----------|-----------------|-----------------|---------------|-----------|
| 5A.2     | 33              | 0               | 4 (P01–P04)   | **37**    |

Wait — sub-turn 5A.2 also contains **T1-A-34** (SOURCE_LINK_CONFLICT chained to P03/P04) which is Category A, giving 34 A rows + 4 positives = **38** rows (matches §O.1 table). Sub-turn 5A.3: 7 A rows (35–41) + 4 B rows + 5 positives = **16** rows (matches §O.2 table).

| Sub-turn | A | B | Positive | Row total |
|----------|---|---|----------|-----------|
| 5A.2     | 34 | 0 | 4        | **38**    |
| 5A.3     | 7  | 4 | 5        | **16**    |
| **Total executable T1** |   |   |          | **54**    |

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
| T1 5A.2 (rows in §O.1)                     | 38    |
| T1 5A.3 (rows in §O.2)                     | 16    |
| **Total executable T1**                    | **54**|
| Static-review-only (Category C, File 23)   | 12    |
| Structurally unreachable (Category D)      | 2     |
| T2 stage count                             | 5     |

The prior claim of "T1 planned executable total: 55" is **withdrawn**. The
canonical count is derived from the row-level inventory above and equals **54**
after (a) excluding T2 tokens 56–59 from Category A and (b) splitting Idempotency
into one positive (T1-P-06 replay) and one error (T1-A-40 conflict).

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
  TURN 5A.1R2 (fingerprint + harness + inventory lock — this turn).
- Phase 3 — N+2: NOT STARTED / NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED / NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED / NOT AUTHORIZED.
