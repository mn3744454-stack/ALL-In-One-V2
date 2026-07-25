# 23 — Turn 5A.1R2 · Error-Token Matrix (Live-Reconciled, Corrected)

Captured 2026-07-26 from the currently installed
`public.create_source_checkout_invoice` and `public._invoice_items_validate_source`.
Every token below appears verbatim in the installed function bodies.

**Matrix scope (locked Turn 5A.1R2):** every error token or SQLSTATE expected to
be externally observable through `create_source_checkout_invoice`, its composed
helpers (`_finance_idempotency_begin`, `_finance_idempotency_complete`,
`_finance_source_checkout_apply_trace`, `create_invoice_with_items`,
`approve_invoice`, `post_payment`, `_finance_billing_link_upsert`), and
`_invoice_items_validate_source` when triggered by Source Checkout inserts.
Purely private helper tokens that cannot propagate through the public RPC are
NOT enumerated here.

Correction notes vs. the withdrawn Turn 5A.1 file:

- `received_at` and `payment_account_id` are **not** root payload keys and cannot
  be caller-supplied. Any post-state token that references caller-supplied
  `received_at` is reclassified.
- Lab Deposit accepts `draft` **and** `accessioned` (not just `draft`). The
  cancelled-fixture path for `FIN_LAB_DEPOSIT_STATUS_INVALID` is invalid —
  cancelled fires `FIN_SOURCE_CANCELLED` earlier.
- Lab Final accepts only `completed`. `accessioned` is rejected with
  `FIN_LAB_FINAL_STATUS_INVALID`.
- `unit_price < 0` fires `FIN_LAB_ITEM_PRICE_INVALID`. `unit_price = 0` passes
  the item-price gate; a non-positive resulting invoice total is later rejected
  by `FIN_CHECKOUT_TOTAL_INVALID`.
- `notes` limit is **500** chars. `client_name` limit is **200** chars.
- Permission keys are `finance.invoice.create`, `finance.invoice.approve`,
  `finance.payment.create` (no `invoices.create` / `payments.create` shorthand).

## 1. `public.create_source_checkout_invoice` — full token classification

Categories (see §11 of the turn prompt):
`A` = Directly executable ·
`B` = Executable via safe savepoint-scoped fixture shaping ·
`C` = Internal invariant, static review only ·
`D` = Structurally unreachable under current schema without forbidden bypasses.

| #  | Cat | Token                                       | Trigger path (from live body)                                                                              | Fixture / natural reproduction                                                                                                                                       |
|----|-----|---------------------------------------------|------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|  1 | A   | `FIN_UNAUTHENTICATED`                       | `auth.uid() IS NULL`                                                                                       | Clear JWT claims before RPC call inside SAVEPOINT.                                                                                                                    |
|  2 | A   | `FIN_BAD_ARGS`                              | Any of `p_tenant_id` / `p_idempotency_key` / `p_payload` NULL                                              | Pass `NULL::jsonb`.                                                                                                                                                   |
|  3 | A   | `FIN_PAYLOAD_TYPE`                          | `jsonb_typeof(p_payload) <> 'object'`                                                                      | `p_payload := '[]'::jsonb`.                                                                                                                                           |
|  4 | A   | `FIN_TENANT_ACCESS_DENIED`                  | `NOT is_active_tenant_member(actor, tenant)`                                                               | Use a tenant UUID Actor is not a member of.                                                                                                                           |
|  5 | A   | `FIN_PAYLOAD_UNKNOWN_KEY: <root>`           | root key not in `{source_type, source_id, link_kind, client_name, discount_amount, payment_method, prices_include_tax, notes, items}` | Include `"foo": 1` at root. Also covers `received_at` and `payment_account_id` at root — both are unknown keys and reach this token first. |
|  6 | A   | `FIN_SOURCE_TYPE_REQUIRED`                  | root missing `source_type` or non-string                                                                   | Omit `source_type`.                                                                                                                                                   |
|  7 | A   | `FIN_SOURCE_TYPE_INVALID`                   | `source_type NOT IN ('lab_sample','horse_order')`                                                          | `source_type := 'foo'`.                                                                                                                                               |
|  8 | A   | `FIN_SOURCE_ID_REQUIRED`                    | root missing `source_id` / non-string / empty after btrim                                                  | Omit `source_id`.                                                                                                                                                     |
|  9 | A   | `FIN_SOURCE_ID_INVALID`                     | `source_id::uuid` cast fails                                                                               | `source_id := 'not-a-uuid'`.                                                                                                                                          |
| 10 | A   | `FIN_LINK_KIND_REQUIRED`                    | root missing `link_kind` or non-string                                                                     | Omit `link_kind`.                                                                                                                                                     |
| 11 | A   | `FIN_LINK_KIND_INVALID`                     | `link_kind NOT IN ('deposit','final')`                                                                     | `link_kind := 'bogus'`.                                                                                                                                               |
| 12 | A   | `FIN_PAYMENT_METHOD_REQUIRED`               | root missing `payment_method` or non-string                                                                | Omit `payment_method`.                                                                                                                                                |
| 13 | A   | `FIN_PAYMENT_METHOD_INVALID`                | `payment_method NOT IN ('cash','card','transfer','debt')`                                                  | `payment_method := 'bitcoin'`.                                                                                                                                        |
| 14 | A   | `FIN_PAYLOAD_TYPE: prices_include_tax`      | `prices_include_tax` present, non-boolean                                                                  | `prices_include_tax := "yes"`.                                                                                                                                        |
| 15 | A   | `FIN_PAYLOAD_TYPE: discount_amount`         | `discount_amount` present, non-number and non-null                                                         | `discount_amount := "10"`.                                                                                                                                            |
| 16 | A   | `FIN_DISCOUNT_INVALID`                      | discount cast fails OR final `v_discount < 0`                                                              | `discount_amount := -1`.                                                                                                                                              |
| 17 | A   | `FIN_PAYLOAD_TYPE: notes`                   | `notes` present, non-string and non-null                                                                   | `notes := 123`.                                                                                                                                                       |
| 18 | A   | `FIN_NOTES_TOO_LONG`                        | `char_length(notes) > 500`                                                                                 | Notes = 501-char string. **500-char** case passes.                                                                                                                    |
| 19 | A   | `FIN_PAYLOAD_TYPE: client_name`             | `client_name` present, non-string and non-null                                                             | `client_name := 42`.                                                                                                                                                  |
| 20 | B   | `FIN_PERMISSION_DENIED` — `finance.invoice.create`   | Owner short-circuit; must demote                                                                    | SAVEPOINT → downgrade Actor's `tenant_members.role` to `foreman` → insert `member_permissions(tenant_member_id, permission_key='finance.invoice.create', granted=false, granted_by=<any profile>)` → call RPC → assert token → ROLLBACK TO SAVEPOINT. |
| 21 | B   | `FIN_PERMISSION_DENIED` — `finance.invoice.approve`  | same                                                                                                | Same as row 20 but revoking `finance.invoice.approve`.                                                                                                                |
| 22 | B   | `FIN_PERMISSION_DENIED` — `finance.payment.create`   | Only checked when `payment_method IN ('cash','card','transfer')`                                    | Same downgrade with `finance.payment.create=false`, `payment_method='cash'`. Debt path does NOT require this permission.                                              |
| 23 | A   | `FIN_ITEMS_EMPTY`                           | Lab source + `items` missing OR non-array OR length 0                                                      | Lab path with `items` omitted or `[]`.                                                                                                                                |
| 24 | A   | `FIN_PAYLOAD_TYPE: items[]`                 | Any lab item element not an object                                                                         | `"items":[1]`.                                                                                                                                                        |
| 25 | A   | `FIN_PAYLOAD_UNKNOWN_KEY: items[].<key>`    | Item key not in `{description, quantity, unit_price, is_taxable}`                                          | Include `"horse_id":"…"` or `"category_id":"…"` inside an item — the item allowlist is only these 4 keys; caller-supplied item horse/lab_horse/category/service are rejected here. |
| 26 | A   | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED`         | Missing/non-string/blank description                                                                       | Item `{"quantity":1,"unit_price":10}`.                                                                                                                                |
| 27 | A   | `FIN_LAB_ITEM_QUANTITY_INVALID`             | Missing/non-number quantity OR cast fails OR `quantity <= 0`                                               | `"quantity":0`.                                                                                                                                                       |
| 28 | A   | `FIN_LAB_ITEM_PRICE_INVALID`                | Missing/non-number unit_price OR cast fails OR `unit_price < 0`                                            | `"unit_price":-1`. **`unit_price=0` is accepted here** — reaches `FIN_CHECKOUT_TOTAL_INVALID` later.                                                                  |
| 29 | A   | `FIN_PAYLOAD_TYPE: items[].is_taxable`      | `is_taxable` present, non-boolean and non-null                                                             | `"is_taxable":"true"`.                                                                                                                                                |
| 30 | A   | `FIN_HORSE_ORDER_ITEMS_FORBIDDEN`           | `source_type='horse_order'` and payload has `items` key                                                    | Horse-order path with `items:[…]`.                                                                                                                                    |
| 31 | A   | `FIN_HORSE_ORDER_LINK_KIND_INVALID`         | `source_type='horse_order'` and `link_kind='deposit'`                                                      | Order + `link_kind='deposit'`.                                                                                                                                        |
| 32 | A   | `FIN_SOURCE_NOT_FOUND`                      | `SELECT … FOR UPDATE` on `lab_samples`/`horse_orders` returns 0 for tenant                                 | Unknown source_id inside primary tenant.                                                                                                                              |
| 33 | A   | `FIN_SOURCE_CANCELLED`                      | `v_source_status = 'cancelled'`                                                                            | Fixture `LS_CANCELLED` (fires for both deposit and final).                                                                                                            |
| 34 | A   | `FIN_LAB_DEPOSIT_STATUS_INVALID`            | `link_kind='deposit'` and status IN (`processing`,`completed`)                                             | Fixture `LS_PROCESSING` (status='processing'). Do **not** use cancelled.                                                                                              |
| 35 | A   | `FIN_LAB_FINAL_STATUS_INVALID`              | `link_kind='final'` and status IN (`draft`,`accessioned`,`processing`)                                     | Fixture `LS_DRAFT_LEGACY` or `LS_ACCESSIONED_LEGACY` — do **not** use cancelled.                                                                                      |
| 36 | A   | `FIN_ORDER_NOT_COMPLETED`                   | `source_type='horse_order'` and status not `completed`                                                     | `HO_DRAFT`.                                                                                                                                                           |
| 37 | A   | `FIN_ORDER_MISSING_COST`                    | Order with `actual_cost IS NULL AND estimated_cost IS NULL`                                                | `HO_MISSING_COST`.                                                                                                                                                    |
| 38 | D   | `FIN_ORDER_MISSING_HORSE`                   | Order row loaded with `horse_id IS NULL` after cost-precedence block                                       | `horse_orders.horse_id` is NOT NULL in schema; only reachable by disabling FKs/triggers or scrubbing a row — **forbidden**. Static review only.                        |
| 39 | A   | `FIN_ORDER_HORSE_NOT_FOUND`                 | `SELECT name FROM horses WHERE id=<horse> AND tenant_id=<tenant>` returns NULL                             | `HO_HORSE_CROSS_TENANT` (order tenant primary, horse tenant secondary).                                                                                               |
| 40 | D   | `FIN_ORDER_TYPE_NOT_FOUND`                  | `order_type_id` NULL OR name lookup returns NULL under `tenant_id=p_tenant_id`                             | `horse_orders.order_type_id` is NOT NULL with FK `ON DELETE RESTRICT` on `horse_order_types.id`; the "delete order_type before RPC" path is blocked. No live trigger forbids inserting a `horse_orders` row whose `order_type_id` belongs to a different tenant, but the fixture requires disabling tenant-consistency assumptions and is deferred. Reclassified structurally unreachable via authorized fixture paths — static review only. |
| 41 | A   | `FIN_SOURCE_CLIENT_CROSS_TENANT`            | Source row's `client_id` not resolvable in `clients WHERE tenant_id=p_tenant_id`                           | Lab sample whose `client_id` = `CLIENT_SECONDARY_TENANT`.                                                                                                             |
| 42 | A   | `FIN_CLIENT_NAME_TOO_LONG`                  | Resolved `client_name` length > 200                                                                        | Walk-in lab sample with 201-char `client_name` supplied on payload; **200** passes.                                                                                   |
| 43 | A   | `FIN_SOURCE_LINK_CONFLICT`                  | Same tenant/source/kind already has a non-cancelled invoice's billing link                                 | Execute Lab Deposit successfully with idem key K1, then re-execute with new idem key K2 (same payload) — duplicate deposit is rejected before nested create.          |
| 44 | C   | `FIN_NESTED_CREATE_NO_INVOICE_ID`           | `create_invoice_with_items` returned NULL invoice_id                                                       | Internal invariant — unreachable without patching the nested RPC. Static review only.                                                                                 |
| 45 | C   | `FIN_INVOICE_NOT_FOUND`                     | Post-approve re-read misses the invoice                                                                    | Internal invariant — unreachable without out-of-band DELETE. Static review only.                                                                                      |
| 46 | A   | `FIN_CHECKOUT_TOTAL_INVALID`                | Approved invoice total ≤ 0                                                                                 | Lab item with `unit_price=0`, `quantity=1`, `discount_amount=0` — total = 0 → rejected.                                                                               |
| 47 | B   | `FIN_TENANT_PAYMENT_ACCOUNT_MISSING`        | Non-debt path with no active tenant `payment_accounts` row                                                 | SAVEPOINT → `UPDATE payment_accounts SET is_active=false WHERE tenant_id=<primary> AND owner_type='tenant'` → call RPC with `cash` → assert token → ROLLBACK TO SAVEPOINT. |
| 48 | C   | `FIN_CHECKOUT_NOT_FULLY_PAID`               | Post-payment invoice status ≠ `paid`                                                                       | `post_payment` uses server-authoritative amount = `v_inv_row.total_amount`; naturally always fully pays. Reachable only via out-of-band ledger mutation. Static review only. |
| 49 | C   | `FIN_CHECKOUT_PAYMENT_METHOD_MISMATCH`      | Post-payment invoice `payment_method` differs from caller's                                                | `post_payment` writes the same `payment_method`. Reachable only via out-of-band UPDATE. Static review only.                                                            |
| 50 | C   | `FIN_CHECKOUT_PAYMENT_RECEIVED_AT_MISSING`  | Post-payment invoice `payment_received_at` NULL                                                            | Root payload cannot supply/omit `received_at` (unknown-key), and `post_payment` sets `payment_received_at`. Reachable only via out-of-band mutation. Static review only. |
| 51 | C   | `FIN_CHECKOUT_DEBT_STATE_INVALID`           | Debt path UPDATE affected 0 rows (invoice not `approved` or already had `payment_received_at`)             | Cannot be forced through the public contract — the inline `approve_invoice` guarantees `approved`. Static review only.                                                |
| 52 | C   | `FIN_CHECKOUT_DEBT_STATUS_INVALID`          | Debt post-state status ≠ `approved`                                                                        | Same reason as row 51. Static review only.                                                                                                                            |
| 53 | C   | `FIN_CHECKOUT_DEBT_PAYMENT_METHOD_INVALID`  | Debt post-state `payment_method` ≠ `debt`                                                                  | Debt branch UPDATE sets `payment_method='debt'`. Static review only.                                                                                                  |
| 54 | C   | `FIN_CHECKOUT_DEBT_HAS_PAYMENT_RECEIVED_AT` | Debt post-state has `payment_received_at IS NOT NULL`                                                      | Root cannot supply `received_at`; debt UPDATE preserves NULL. Static review only.                                                                                     |
| 55 | C   | `FIN_SOURCE_LINK_UPSERT_FAILED`             | `_finance_billing_link_upsert(...)` returned NULL                                                          | Internal invariant. Static review only.                                                                                                                               |
| 56 | A   | `FIN_TEST_FAIL_AFTER_TRACE`                 | `SET LOCAL fin.fail_after_trace='raise'`                                                                   | T2 stage 1.                                                                                                                                                           |
| 57 | A   | `FIN_TEST_FAIL_AFTER_APPROVE`               | `SET LOCAL fin.fail_after_approve='raise'`                                                                 | T2 stage 2.                                                                                                                                                           |
| 58 | A   | `FIN_TEST_FAIL_AFTER_PAYMENT`               | `SET LOCAL fin.fail_after_payment='raise'`                                                                 | T2 stage 3.                                                                                                                                                           |
| 59 | A   | `FIN_TEST_FAIL_AFTER_SOURCE_LINK`           | `SET LOCAL fin.fail_after_source_link='raise'`                                                             | T2 stage 4.                                                                                                                                                           |

## 1a. Idempotency-helper token (externally observable)

The nested helper `public._finance_idempotency_begin(...)` raises the following
token under same-key/changed-payload replay; `public.create_source_checkout_invoice`
does NOT catch or remap it — it propagates verbatim to the caller.

| #  | Cat | Token                          | SQLSTATE | Trigger path                                                                                                                                     | Fixture / natural reproduction                                                                                                             |
|----|-----|--------------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| 60 | A   | `FIN_IDEMPOTENCY_CONFLICT`     | `23514`  | `_finance_idempotency_begin`: existing row for `(tenant_id, operation, idempotency_key)` has `request_hash <> new hash` (same actor).            | Execute successful checkout with idem key `K1` and payload `P1`; re-invoke with the same `K1` but modified `P1'` (e.g. changed `notes`).   |
| 61 | C   | `FIN_IDEMPOTENCY_ACTOR_MISMATCH` | `42501` | `_finance_idempotency_begin`: existing row for `(tenant_id, operation, idempotency_key)` has `actor_id <> auth.uid()`.                           | Requires a second authenticated fixture actor; not reachable from the single-actor T1 harness. Static review only.                          |
| 62 | C   | `FIN_IDEMPOTENCY_IN_PROGRESS`  | `40001`  | `_finance_idempotency_begin`: existing row with `response IS NULL` (a concurrent invocation is mid-flight).                                       | Requires two concurrent sessions; not reachable from a single-session T1 SAVEPOINT harness. Static review only.                            |

Idempotency replay (same key + same request_hash + same actor) is a **positive
path** — the helper returns `stored_response` unchanged and `create_source_checkout_invoice`
short-circuits with the original response.

The prior File-23 label `FIN_IDEMPOTENCY_HASH_MISMATCH` was **wrong** — no such
token exists in `_finance_idempotency_begin`. All references to it are withdrawn.

## 2. `public._invoice_items_validate_source` (trigger) — unchanged token surface

The trigger raises message strings (not `FIN_*` tokens) with these SQLSTATEs:

| #   | Scenario                                          | SQLSTATE | Message substring                                                |
|-----|---------------------------------------------------|----------|-------------------------------------------------------------------|
| T1  | Unsupported `service_source`                      | `22023`  | `invoice_items.service_source % is not supported`                 |
| T2  | service_id not found                              | `23503`  | `Service % not found in %`                                        |
| T3  | Cross-tenant service_id                           | `42501`  | `Cross-tenant service_id rejected on invoice_items`               |
| T4  | Inactive service on INSERT                        | `22023`  | `Service % is inactive and cannot be added to invoice`            |
| T5  | category_id not found                             | `23503`  | `Category % not found`                                            |
| T6  | Cross-tenant category_id                          | `42501`  | `Cross-tenant category_id rejected on invoice_items`              |
| T7  | horse_id not found                                | `23503`  | `Horse % not found`                                               |
| T8  | Cross-tenant horse_id                             | `42501`  | `Cross-tenant horse_id rejected on invoice_items`                 |
| T9  | horse_id unrelated to invoice client              | `42501`  | `Horse % is not linked to invoice client % on tenant %`           |
| T10 | lab_horse_id not found                            | `23503`  | `Lab horse % not found`                                           |
| T11 | Cross-tenant lab_horse_id                         | `42501`  | `Cross-tenant lab_horse_id rejected on invoice_items`             |
| T12 | lab_horse_id unrelated (no legacy client AND no `party_horse_links` row where `relationship_type IN ('lab_customer','payer')`) | `42501` | `Lab horse % is not linked to invoice client %` |
| T13 | Owner-only / trainer-only / stable-only link      | `42501`  | Same as T12 (only `lab_customer` / `payer` accepted)              |
| T14 | Legacy client accepted                            | (pass)   | `lh_client = inv_client` short-circuits the junction check        |
| T15 | `lab_customer` junction accepted                  | (pass)   | `party_horse_links.relationship_type='lab_customer'`              |
| T16 | `payer` junction accepted                         | (pass)   | `party_horse_links.relationship_type='payer'`                     |
| T17 | Unsupported `package_source`                      | `22023`  | `invoice_items.package_source % is not supported`                 |
| T18 | package_id not found                              | `23503`  | `Package % not found`                                             |
| T19 | Cross-tenant package_id                           | `42501`  | `Cross-tenant package_id rejected on invoice_items`               |
| T20 | Inactive package on INSERT                        | `22023`  | `Package % is inactive and cannot be added to invoice`            |
| T21 | `package_services_snapshot` not JSON array        | `22023`  | `package_services_snapshot must be a JSON array`                  |

## 3. Failure-hook contract (verified against installed body)

| Hook GUC                       | Emitted token                     | Fires AFTER                                     |
|--------------------------------|-----------------------------------|-------------------------------------------------|
| `fin.fail_after_trace`         | `FIN_TEST_FAIL_AFTER_TRACE`       | `_finance_source_checkout_apply_trace(...)`     |
| `fin.fail_after_approve`       | `FIN_TEST_FAIL_AFTER_APPROVE`     | `approve_invoice(...)`                          |
| `fin.fail_after_payment`       | `FIN_TEST_FAIL_AFTER_PAYMENT`     | `post_payment(...)` — non-debt only             |
| `fin.fail_after_source_link`   | `FIN_TEST_FAIL_AFTER_SOURCE_LINK` | `_finance_billing_link_upsert(...)` final link  |

Each hook uses `pg_catalog.current_setting('<guc>', true) = 'raise'`. Activation
is transaction-scoped via `SET LOCAL` and reverts on any enclosing rollback.

## 4. Category totals (Turn 5A.1R3 corrected)

Failure-hook tokens `FIN_TEST_FAIL_AFTER_*` (rows 56–59) belong exclusively to
T2 and are **excluded from T1 Category A** in this table. Rows 61 and 62
(`FIN_IDEMPOTENCY_ACTOR_MISMATCH`, `FIN_IDEMPOTENCY_IN_PROGRESS`) are
Category C — reachable only via multi-actor or concurrent-session harnesses
outside the single-actor/single-session T1 contract.

| Category                                                                       | Count |
|--------------------------------------------------------------------------------|-------|
| A — Directly executable via T1 (rows 1–19, 23–37, 39, 41–43, 46, 60)           | 37    |
| B — Executable via safe savepoint-scoped fixture shaping (rows 20–22, 47)      | 4     |
| C — Internal invariant / multi-actor / concurrent, static review only          | 14    |
|     (rows 44–45, 48–55, 61–62)                                                 |       |
| D — Structurally unreachable (rows 38, 40)                                     | 2     |
| T2 failure-hook tokens (rows 56–59, T2-owned)                                  | 4     |
| **Total RPC-observable tokens catalogued**                                     | **61**|

Turn 5A.1R3 changes vs. Turn 5A.1R2: rows 61 and 62 reclassified A → C. The
21-row trigger surface (§2) is unchanged.
