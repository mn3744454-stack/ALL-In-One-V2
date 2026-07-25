# File 15 — Payment Account Runtime Readiness (Slice 01 · Turn 3)

Captured: 2026-07-25 UTC · Project ref: vhxglsvxwwpmoqjabfmj
Preflight evidence — NOT final Mini Documentation.

## 1. Schema and constraints

Table `public.payment_accounts`:

| Column      | Type                       | Null | Default            |
|-------------|----------------------------|------|--------------------|
| id          | uuid                       | NO   | gen_random_uuid()  |
| owner_type  | payment_owner_type (enum)  | NO   | —                  |
| tenant_id   | uuid                       | YES  | —                  |
| is_active   | boolean                    | NO   | true               |
| created_at  | timestamptz                | NO   | now()              |

Constraints:

- `payment_accounts_pkey PRIMARY KEY (id)`
- `payment_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`
- `unique_tenant_account UNIQUE (tenant_id)` — one row per tenant
- `valid_owner CHECK ((owner_type='platform' AND tenant_id IS NULL) OR (owner_type='tenant' AND tenant_id IS NOT NULL))`
- Partial unique index `unique_platform_account (owner_type) WHERE owner_type='platform'`

RLS: enabled. Policies:

- `Tenant members can view their payment account` — SELECT (tenant members)
- `Owners can create tenant payment account` — INSERT (owner role)
- `Owners can update tenant payment account` — UPDATE (owner role)

Triggers: none (no `updated_at`, no auto-provisioning).

Enum `payment_owner_type` values: `platform`, `tenant`.

## 2. Current census

- `payment_accounts` total rows: **0**
- `platform` account row: **absent**
- `tenants` total: **9** (stable=4, lab=2, horse_owner=2, doctor=1)
- Tenants without a payment account: **all 9**
- Reference stable tenant `145f2128-…c5530`: **0 accounts**
- Reference lab tenants `348ce41c-…1036`, `f5967dff-…005a`: **0 accounts**

## 3. Provisioning-lifecycle search

- No trigger on `tenants` or `tenant_members` inserts rows into `payment_accounts`.
- No repository function creates a `tenant` payment account (only `create_pos_sale`
  self-provisions lazily, but Retail POS is out of scope for Slice 01).
- Only historical writer: initial migration `20251223043347_….sql` — seeded rows for
  demo tenants only; those tenants were later cleaned and no follow-up seeding exists.
- No Settings UI creates the row; RLS allows owners to `INSERT` but nothing in the app
  currently calls that path.
- `create_source_checkout_invoice` (Migration A) requires an active tenant account for
  `cash|card|transfer` and raises `FIN_TENANT_PAYMENT_ACCOUNT_MISSING` (`23503`)
  otherwise. `debt` bypasses the account lookup.
- Under `unique_tenant_account`, each tenant can have exactly one row; the schema
  carries no method, currency, branch, name, or bank fields — it is pure system
  routing infrastructure, not a user-configured bank/cash account.
- A single generic account per billing-capable tenant is sufficient for the current
  cash/card/transfer flow.

## 4. Current callers

- Runtime: `create_source_checkout_invoice` (Slice 01), `create_pos_sale` (out of
  scope). No frontend surface today reads or creates the row.
- Tests: `supabase/tests/database/j5_1_source_checkout.test.sql` marks the missing
  provisioning as `FIXTURE-TODO`.

## 5. Runtime consequence

With zero rows, any Turn-4 cutover of `EmbeddedCheckout` that submits `cash`, `card`,
or `transfer` will fail atomically with `FIN_TENANT_PAYMENT_ACCOUNT_MISSING`.
Debt-only checkout would technically succeed but does not represent the user-visible
capability of the checkout UI.

## 6. Readiness verdict

**ONE SYSTEM ROUTING ACCOUNT PER TENANT MUST BE BACKFILLED AND AUTO-PROVISIONED.**

Rationale: the schema shape (single `unique_tenant_account`, no financial-config
fields) makes the row pure system infrastructure — creating one row per billing-capable
tenant introduces no financial balance changes, only routing identity. Requiring a
user Settings step for infrastructure the user cannot configure would be the wrong
boundary.

## 7. Required future migration/code boundary (NOT authorized this turn)

- Backfill migration: `INSERT INTO payment_accounts (owner_type, tenant_id, is_active)
  SELECT 'tenant', id, true FROM tenants WHERE id NOT IN (SELECT tenant_id FROM
  payment_accounts WHERE tenant_id IS NOT NULL)` — scoped to billing-capable tenant
  types (`stable`, `lab`, `doctor`, `horse_owner` if billing) with rationale to be
  captured in that turn.
- Trigger `AFTER INSERT ON tenants` that self-provisions the row (SECURITY DEFINER,
  respecting `unique_tenant_account`).
- No frontend change required; RLS SELECT for tenant members already covers reads.

## 8. Turn-4 gate

**Payment Account remediation is REQUIRED before `EmbeddedCheckout` cutover.**
Debt-only support is insufficient because the user-visible checkout UI supports
`cash | card | transfer | debt`. Next authorized turn should be **Turn 3B — Payment
Account Provisioning and Backfill** before Turn 4 cutover.
