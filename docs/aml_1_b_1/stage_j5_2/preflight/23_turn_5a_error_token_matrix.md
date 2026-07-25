# 23 — Turn 5A.1 · Error-Token Matrix (Live-Reconciled)

Captured 2026-07-25 from installed `public.create_source_checkout_invoice` and
`public._invoice_items_validate_source`.

Source token in the RPC is `FIN_SOURCE_TYPE_INVALID` (NOT `_UNSUPPORTED`). All
tokens below appear verbatim in the installed function bodies.

## 1. `public.create_source_checkout_invoice` (SQLSTATE varies; see body)

| # | Scenario                                              | Token                                       | Fixture precondition                          |
|---|-------------------------------------------------------|---------------------------------------------|------------------------------------------------|
| 1 | Non-object payload                                    | `FIN_PAYLOAD_TYPE`                          | `p_payload := '[]'::jsonb`                     |
| 2 | Root unknown key                                      | `FIN_PAYLOAD_UNKNOWN_KEY`                   | payload contains `"foo": 1`                    |
| 3 | Root `link_kind` missing                              | `FIN_LINK_KIND_REQUIRED`                    | omit `link_kind`                               |
| 4 | Root `link_kind` invalid                              | `FIN_LINK_KIND_INVALID`                     | `link_kind := 'bogus'`                         |
| 5 | Horse-order + `link_kind='deposit'`                   | `FIN_HORSE_ORDER_LINK_KIND_INVALID`         | `source_type='horse_order'`, `link_kind='deposit'` |
| 6 | Source type missing                                   | `FIN_SOURCE_TYPE_REQUIRED`                  | omit `source_type`                             |
| 7 | Source type unsupported                               | `FIN_SOURCE_TYPE_INVALID`                   | `source_type := 'foo'`                         |
| 8 | Source id missing                                     | `FIN_SOURCE_ID_REQUIRED`                    | omit `source_id`                               |
| 9 | Source id malformed                                   | `FIN_SOURCE_ID_INVALID`                     | `source_id := 'not-a-uuid'`                    |
|10 | Payment method missing                                | `FIN_PAYMENT_METHOD_REQUIRED`               | omit `payment_method`                          |
|11 | Payment method invalid                                | `FIN_PAYMENT_METHOD_INVALID`                | `payment_method := 'bitcoin'`                  |
|12 | Debt + `received_at` present                          | `FIN_CHECKOUT_DEBT_HAS_PAYMENT_RECEIVED_AT` | `payment_method='debt'` + `received_at` set    |
|13 | Debt payment method conflict                          | `FIN_CHECKOUT_DEBT_PAYMENT_METHOD_INVALID`  | conflicting debt fields                        |
|14 | Debt final state invalid                              | `FIN_CHECKOUT_DEBT_STATE_INVALID`           | debt with invalid post-state                   |
|15 | Debt status invalid                                   | `FIN_CHECKOUT_DEBT_STATUS_INVALID`          | debt with invalid status                       |
|16 | Non-debt missing `received_at`                        | `FIN_CHECKOUT_PAYMENT_RECEIVED_AT_MISSING`  | cash/card/transfer w/o `received_at`           |
|17 | Payment-method mismatch                               | `FIN_CHECKOUT_PAYMENT_METHOD_MISMATCH`      | payment routed via mismatched method           |
|18 | Not fully paid                                        | `FIN_CHECKOUT_NOT_FULLY_PAID`               | payment amount < invoice total                 |
|19 | Total invalid                                         | `FIN_CHECKOUT_TOTAL_INVALID`                | computed total ≤ 0                             |
|20 | Client name > 255 chars                               | `FIN_CLIENT_NAME_TOO_LONG`                  | walk-in client_name too long                   |
|21 | Notes > 4000 chars                                    | `FIN_NOTES_TOO_LONG`                        | oversized notes                                |
|22 | Discount invalid (negative or > line total)           | `FIN_DISCOUNT_INVALID`                      | bad discount on lab item                       |
|23 | Lab items empty on non-source-derived path            | `FIN_ITEMS_EMPTY`                           | omit `items` array where required              |
|24 | Lab item description missing                          | `FIN_LAB_ITEM_DESCRIPTION_REQUIRED`         | item without `description`                     |
|25 | Lab item price ≤ 0                                    | `FIN_LAB_ITEM_PRICE_INVALID`                | `unit_price := 0`                              |
|26 | Lab item quantity ≤ 0                                 | `FIN_LAB_ITEM_QUANTITY_INVALID`             | `quantity := 0`                                |
|27 | Horse-order caller items forbidden                    | `FIN_HORSE_ORDER_ITEMS_FORBIDDEN`           | `source_type='horse_order'` + payload `items`  |
|28 | Lab deposit source status invalid                     | `FIN_LAB_DEPOSIT_STATUS_INVALID`            | sample.status = `'cancelled'`                  |
|29 | Lab final source status invalid                       | `FIN_LAB_FINAL_STATUS_INVALID`              | sample.status = `'draft'`                      |
|30 | Order not completed                                   | `FIN_ORDER_NOT_COMPLETED`                   | horse_order.status = `'draft'`                 |
|31 | Order missing cost                                    | `FIN_ORDER_MISSING_COST`                    | both `actual_cost` and `estimated_cost` null   |
|32 | Order missing horse                                   | `FIN_ORDER_MISSING_HORSE`                   | horse_order.horse_id = NULL (impossible via schema — negative fixture is via cross-tenant scrub) |
|33 | Order type not found                                  | `FIN_ORDER_TYPE_NOT_FOUND`                  | `order_type_id` deleted                         |
|34 | Order horse not found                                 | `FIN_ORDER_HORSE_NOT_FOUND`                 | `horse_id` deleted                              |
|35 | Source not found                                      | `FIN_SOURCE_NOT_FOUND`                      | unknown source_id                              |
|36 | Source cancelled                                      | `FIN_SOURCE_CANCELLED`                      | sample/order status `'cancelled'`              |
|37 | Source client cross-tenant                            | `FIN_SOURCE_CLIENT_CROSS_TENANT`            | sample.client_id belongs to other tenant       |
|38 | Nested `create_invoice_with_items` returned no invoice_id | `FIN_NESTED_CREATE_NO_INVOICE_ID`       | (internal invariant — non-executable)          |
|39 | Approved invoice not found post-create                | `FIN_INVOICE_NOT_FOUND`                     | (internal invariant)                           |
|40 | Tenant payment account missing                        | `FIN_TENANT_PAYMENT_ACCOUNT_MISSING`        | delete-then-restore secondary tenant (unsafe — skip) |
|41 | Tenant access denied                                  | `FIN_TENANT_ACCESS_DENIED`                  | actor not member of `p_tenant_id`              |
|42 | Permission denied (invoices.create / approve / payments.create) | `FIN_PERMISSION_DENIED`         | permission override transaction-local          |
|43 | Unauthenticated (auth.uid() NULL)                     | `FIN_UNAUTHENTICATED`                       | omit JWT claims                                |
|44 | Bad args (generic)                                    | `FIN_BAD_ARGS`                              | NULL required parameter                        |
|45 | Duplicate active source link                          | `FIN_SOURCE_LINK_CONFLICT`                  | run once, then rerun w/ new idem key           |
|46 | Source link upsert internal failure                   | `FIN_SOURCE_LINK_UPSERT_FAILED`             | (internal invariant)                           |
|47 | Failure hook — after trace                            | `FIN_TEST_FAIL_AFTER_TRACE`                 | `SET LOCAL fin.fail_after_trace='raise'`       |
|48 | Failure hook — after approve                          | `FIN_TEST_FAIL_AFTER_APPROVE`               | `SET LOCAL fin.fail_after_approve='raise'`     |
|49 | Failure hook — after payment                          | `FIN_TEST_FAIL_AFTER_PAYMENT`               | `SET LOCAL fin.fail_after_payment='raise'`     |
|50 | Failure hook — after source link                      | `FIN_TEST_FAIL_AFTER_SOURCE_LINK`           | `SET LOCAL fin.fail_after_source_link='raise'` |

## 2. `public._invoice_items_validate_source` (trigger)

The trigger raises message strings (not `FIN_*` tokens) with these SQLSTATEs:

| # | Scenario                                          | SQLSTATE | Message substring                                                |
|---|---------------------------------------------------|----------|-------------------------------------------------------------------|
| T1| Unsupported `service_source`                      | `22023`  | `invoice_items.service_source % is not supported`                 |
| T2| service_id not found                              | `23503`  | `Service % not found in %`                                        |
| T3| Cross-tenant service_id                           | `42501`  | `Cross-tenant service_id rejected on invoice_items`               |
| T4| Inactive service on INSERT                        | `22023`  | `Service % is inactive and cannot be added to invoice`            |
| T5| category_id not found                             | `23503`  | `Category % not found`                                            |
| T6| Cross-tenant category_id                          | `42501`  | `Cross-tenant category_id rejected on invoice_items`              |
| T7| horse_id not found                                | `23503`  | `Horse % not found`                                               |
| T8| Cross-tenant horse_id                             | `42501`  | `Cross-tenant horse_id rejected on invoice_items`                 |
| T9| horse_id unrelated to invoice client              | `42501`  | `Horse % is not linked to invoice client % on tenant %`           |
|T10| lab_horse_id not found                            | `23503`  | `Lab horse % not found`                                           |
|T11| Cross-tenant lab_horse_id                         | `42501`  | `Cross-tenant lab_horse_id rejected on invoice_items`             |
|T12| lab_horse_id unrelated (no legacy client_id AND no `party_horse_links` row with `relationship_type IN ('lab_customer','payer')`) | `42501` | `Lab horse % is not linked to invoice client %` |
|T13| Owner-only / trainer-only / stable-only link      | `42501`  | same as T12 (only `lab_customer` / `payer` are accepted)          |
|T14| Legacy client accepted                            | (pass)   | `lh_client = inv_client` short-circuits the junction check        |
|T15| `lab_customer` junction accepted                  | (pass)   | `party_horse_links.relationship_type='lab_customer'`              |
|T16| `payer` junction accepted                         | (pass)   | `party_horse_links.relationship_type='payer'`                     |
|T17| Unsupported `package_source`                      | `22023`  | `invoice_items.package_source % is not supported`                 |
|T18| package_id not found                              | `23503`  | `Package % not found`                                             |
|T19| Cross-tenant package_id                           | `42501`  | `Cross-tenant package_id rejected on invoice_items`               |
|T20| Inactive package on INSERT                        | `22023`  | `Package % is inactive and cannot be added to invoice`            |
|T21| `package_services_snapshot` not JSON array        | `22023`  | `package_services_snapshot must be a JSON array`                  |

## 3. Failure-hook positions (verified line numbers in installed body)

| Hook GUC                       | Line | Emitted token                     | Fires AFTER                                     |
|--------------------------------|------|-----------------------------------|-------------------------------------------------|
| `fin.fail_after_trace`         | 445  | `FIN_TEST_FAIL_AFTER_TRACE`       | `_finance_source_checkout_apply_trace(...)`     |
| `fin.fail_after_approve`       | 453  | `FIN_TEST_FAIL_AFTER_APPROVE`     | inline approve (`approve_invoice`)              |
| `fin.fail_after_payment`       | 491  | `FIN_TEST_FAIL_AFTER_PAYMENT`     | `post_payment(...)` / non-debt payment          |
| `fin.fail_after_source_link`   | 535  | `FIN_TEST_FAIL_AFTER_SOURCE_LINK` | `_finance_billing_link_upsert(...)` final link  |

Each hook uses `pg_catalog.current_setting('<guc>', true) = 'raise'`. `true`
argument makes the read missing-GUC-tolerant. Because the GUC is set with
`SET LOCAL`, activation is transaction-scoped and reverts on any `ROLLBACK` or
`ROLLBACK TO SAVEPOINT` that undoes the `SET LOCAL`.
