# 10 — `public.create_source_checkout_invoice(uuid,uuid,jsonb)` — Post-Migration-A Metadata

Capture timestamp (UTC): 2026-07-25T06:42Z
Database identity: `postgres` (cluster `main`)
Project ref: `vhxglsvxwwpmoqjabfmj`

## Signature
`public.create_source_checkout_invoice(uuid, uuid, jsonb) RETURNS jsonb`

## Catalog metadata
| Field | Value |
|---|---|
| `prosecdef` | `t` (SECURITY DEFINER) |
| `provolatile` | `v` (VOLATILE) |
| Owner | `postgres` |
| `proconfig` | `{search_path=""}` |
| Language | `plpgsql` |

## ACL (`proacl`)
```
{postgres=X/postgres,
 authenticated=X/postgres,
 service_role=X/postgres,
 sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,
 sandbox_exec=X/postgres}
```

- PUBLIC: revoked
- anon: revoked
- authenticated: EXECUTE granted
- service_role: preserved
- sandbox_exec*: platform-managed

## Fingerprints (post-Migration-A)
| Method | SHA-256 |
|---|---|
| Raw `pg_get_functiondef` UTF-8 | `38f3b740c984cb69f6d99005e6513305cba4117adea994beeed9a60bc7b7d0b0` |
| Canonical POSIX | `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f` |

Live pre-Migration-A fingerprints (preserved in file 02 for rollback):
- Raw:    `b6c7f67991e12f2ad667967f4bf118d1f15ba8246c72028cf3a4bb0e58ecb803`
- Canon:  `fe638fed78baf0d63dfb24d2c6319662bb8a7f834dc5db4eef37b4b42078064a`

## Public contract (installed)
- Supported source types (exactly): `lab_sample`, `horse_order`.
- Root payload keys (exactly): `source_type`, `source_id`, `link_kind`, `client_name`, `discount_amount`, `payment_method`, `prices_include_tax`, `notes`, `items`.
- Rejects root `client_id`, `horse_id`, `lab_horse_id` via `FIN_PAYLOAD_UNKNOWN_KEY`.
- `link_kind ∈ {'deposit','final'}`; Horse Order forbids `deposit` (`FIN_HORSE_ORDER_LINK_KIND_INVALID`).
- Lab Sample gates: `deposit` requires `status ∈ {'draft','accessioned'}`; `final` requires `status='completed'`; `cancelled` rejected.
- Horse Order gates: requires `status='completed'`, canonical `client_id`, canonical `horse_id`, canonical `order_type_id`, and server-resolved `unit_price = COALESCE(actual_cost, estimated_cost)`. Caller items forbidden.
- Payment methods: `cash`, `card`, `transfer`, `debt`. Debt path skips `post_payment`, sets `payment_method='debt'`, leaves `payment_received_at IS NULL`, final status `approved`.
- Uses `_finance_source_checkout_apply_trace` between `create_invoice_with_items` and `approve_invoice`; does not inline a competing trace implementation.
- Source billing link written via `_finance_billing_link_upsert(..., corrects=NULL)`; single active same-kind link enforced by pre-check (`FIN_SOURCE_LINK_CONFLICT`); no new unique constraint added.
- Terminal 17-key JSON response: `invoice_id, invoice_number, subtotal, tax_amount, discount_amount, total_amount, prices_include_tax, currency, status, payment_method, client_id, client_name, source_type, source_id, source_link_kind, source_billing_link_id, payment_result`.
- Nested idempotency via deterministic child keys: `md5(outer||':create_invoice_with_items')`, `':approve_invoice'`, `':post_payment'`.
- No draft behavior; no `post_invoice_payments` usage.

## Failure-injection contract (transaction-local; inert by default)
| Stage | GUC (`SET LOCAL`) | Value | Error token |
|---|---|---|---|
| After `_finance_source_checkout_apply_trace` | `fin.fail_after_trace` | `raise` | `FIN_TEST_FAIL_AFTER_TRACE` |
| After `approve_invoice` | `fin.fail_after_approve` | `raise` | `FIN_TEST_FAIL_AFTER_APPROVE` |
| After `post_payment` (or debt update) | `fin.fail_after_payment` | `raise` | `FIN_TEST_FAIL_AFTER_PAYMENT` |
| After source `_finance_billing_link_upsert` | `fin.fail_after_source_link` | `raise` | `FIN_TEST_FAIL_AFTER_SOURCE_LINK` |

All hooks use `pg_catalog.current_setting(<key>, true)` (missing_ok=true) so they are silently inert unless the caller executes `SET LOCAL <key>='raise'` inside the same transaction. Nothing is persisted in business records.

## Data safety
No business data was read, created, updated, or deleted by this migration. Pre/post row counts on `invoices`, `invoice_items`, `ledger_entries`, `billing_links`, `payment_accounts` unchanged.
