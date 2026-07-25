# File 17 — Payment Account Provisioning Post-Migration (Turn 3B)

Captured: 2026-07-25 UTC · Project ref: vhxglsvxwwpmoqjabfmj
Migration file: `supabase/migrations/20260725071233_4dd54c91-4aa5-4b5a-aab0-e5f487a36c49.sql`

## 1. Objects created

### Function `public._finance_provision_tenant_payment_account()`

| Attribute | Value |
|---|---|
| Return type | `trigger` |
| Language | `plpgsql` |
| `prosecdef` | `t` (SECURITY DEFINER) |
| `provolatile` | `v` (VOLATILE) |
| `proconfig` | `{search_path=""}` |
| Owner | `postgres` |
| ACL | `{postgres=X/postgres, service_role=X/postgres, sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres, sandbox_exec=X/postgres}` |
| PUBLIC / anon / authenticated EXECUTE | revoked (not present in ACL) |

Body performs a single tenant-scoped INSERT with `ON CONFLICT (tenant_id) DO NOTHING`
and no Platform branch. Full definition captured in File 18.

### Trigger `trg_tenants_provision_payment_account`

| Attribute | Value |
|---|---|
| Table | `public.tenants` |
| Timing | `AFTER INSERT` |
| Level | `FOR EACH ROW` |
| `tgenabled` | `O` (enabled) |
| `tgtype` | `5` (AFTER, ROW, INSERT) |
| Bound function | `public._finance_provision_tenant_payment_account()` |

## 2. Backfill result

| Metric | Value |
|---|---|
| Tenant count | 9 |
| Missing before | 9 |
| Inserted | 9 |
| Tenant accounts after | 9 |
| Missing after | 0 |
| Inactive tenant accounts | 0 |
| Duplicate tenant accounts | 0 |
| Platform accounts | 0 (unchanged) |

Reference tenants:
- Stable `145f2128-83ca-4ba8-85b5-8ade245c5530` → `dd4af866-bd56-4c6d-8c9e-a05dc4a7a7cf` (active)
- Lab `348ce41c-1102-4295-bf6a-2ea0203c1036` → `43f80a7d-f1ec-4471-aa13-d10a2f27e49f` (active)
- Lab `f5967dff-c1e0-43dc-b6f5-e28e5a8b005a` → `ed1f00a1-52a1-40a8-b0db-51a0f1bede35` (active)

All nine backfill IDs are enumerated in File 19.

## 3. Business-data safety fingerprint

| Table | Before | After |
|---|---|---|
| invoices | 56 | 56 |
| invoice_items | 134 | 134 |
| ledger_entries | 66 | 66 |
| billing_links | 18 | 18 |
| customer_balances | 7 | 7 |
| finance_request_idempotency | 1 | 1 |

Only `payment_accounts` changed (0 → 9 rows). No invoice, ledger, billing link,
balance, idempotency, or payment intent/split rows were touched.

## 4. RLS

`payment_accounts` policies (`Tenant members can view their payment account`,
`Owners can create tenant payment account`, `Owners can update tenant payment account`)
are unchanged. The trigger runs SECURITY DEFINER, so no member-level INSERT policy
expansion was required.

## 5. Referencing objects inventory

Foreign keys pointing at `payment_accounts.id`:
- `payment_intents.payee_account_id` → `payment_accounts(id) ON DELETE CASCADE`
- `payment_splits.receiver_account_id` → `payment_accounts(id) ON DELETE CASCADE`

No `payment_intents` or `payment_splits` rows exist that reference any of the nine
backfilled UUIDs (both tables are empty of routing references at capture time),
so per-row rollback (File 16) is currently safe.

Runtime reader: `create_source_checkout_invoice` (Migration A) — will now resolve
the tenant routing account deterministically for `cash|card|transfer` intents.

Retail POS (`create_pos_sale`) still contains its lazy-insert branch. Because the
INSERT collides on `unique_tenant_account` and the POS branch itself uses
`ON CONFLICT DO NOTHING`, the universal trigger is compatible; the lazy branch is
now effectively unreachable but harmless. No POS modification was performed.

## 6. Turn-4 gate

**PAYMENT ACCOUNT ROUTING READY — AUTHORIZE EMBEDDEDCHECKOUT CUTOVER.**
