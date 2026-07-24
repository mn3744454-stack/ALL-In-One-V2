# J5.1A.2 — Source Fixture Execution Contract (FINAL)

Phase: N+1B · J5.1A.2-PREFLIGHT-FINAL
Scope: Non-POS Source Checkout only (Lab Sample + Horse Order). Retail POS excluded.

This document is the sole authoritative fixture blueprint for the T1 core matrix and
T2 rollback matrix. Every rule and template below is grounded in raw evidence in
`14_source_fixture_catalog_evidence.txt` and the locked migration
`docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql`.

---

## 1. Fixed Identity Contract

All fixtures MUST use these fixed UUIDs. Arbitrary or `LIMIT 1` selection is prohibited.

```
:primary_tenant_id := '145f2128-83ca-4ba8-85b5-8ade245c5530'   -- tenants.type = 'stable'
:actor_id          := '98439fe8-6881-4e9e-8ff6-18aca0ce4470'   -- tenant_members role=owner, is_active=true
```

Proof (Section 9.1 of File 14):

- `public.profiles` row exists for `:actor_id`.
- `public.tenant_members` row exists with `role='owner'`, `is_active=t`, `tenant_id=:primary_tenant_id`.
- `auth.users` row is transitively proven present via `tenants.owner_id` FK
  (the fixed actor owns the primary tenant).

---

## 2. Lab Sample Link-Kind Status Contract (Corrected)

Authoritative source: the locked migration `j5_1a_migration.sql`.

| lab_samples.status | Deposit source | Final source | Notes |
|--------------------|---------------|-------------|-------|
| `draft`            | VALID         | INVALID     | Accepted for Deposit checkout |
| `accessioned`      | VALID         | INVALID     | Accepted for Deposit checkout |
| `processing`       | INVALID       | INVALID     | Between-state; rejected for both kinds |
| `completed`        | INVALID       | VALID       | Accepted for Final checkout |
| `cancelled`        | Rejected pre-kind | Rejected pre-kind | Rejected before link-kind branching |

Explicit fixture recipes for T1:

```
valid Deposit fixture   := lab_samples.status = 'draft' or 'accessioned'
valid Final fixture     := lab_samples.status = 'completed'
invalid Deposit fixture := lab_samples.status = 'processing'
invalid Final fixture   := lab_samples.status = 'accessioned'
cancelled fixture       := lab_samples.status = 'cancelled'
```

Same-sample Deposit → Final happy path (single transaction):

1. INSERT `lab_samples` with `status='accessioned'`.
2. Call `create_source_checkout_invoice(..., link_kind='deposit')` — expect success.
3. UPDATE the same `lab_samples.status` to `'processing'` (advance).
4. UPDATE the same `lab_samples.status` to `'completed'`.
5. Call `create_source_checkout_invoice(..., link_kind='final')` — expect success.

Status transitions are governed by the `validate_lab_sample` trigger; the sequence
`accessioned → processing → completed` is permitted (see File 14 Section 5).

---

## 3. Permission Semantics (Corrected)

Grounded in the captured `public.has_permission` body (File 14 Section 6):

```
active membership check
→ if role = 'owner' → return TRUE (short-circuit)
→ else consult member_permissions override
→ else fall through to role/bundle resolution
```

Therefore: **`member_permissions.granted=false` does NOT override an active Owner.**
Directly toggling permissions on the fixed Owner is insufficient for negative
authorization tests.

### Isolated Negative Permission Recipe

For any test that must prove the RPC rejects a caller lacking a specific permission:

```sql
SAVEPOINT sp_perm_case;

-- Downgrade the fixed actor from owner to a non-owner valid role
UPDATE public.tenant_members
   SET role = 'foreman'
 WHERE user_id  = :actor_id
   AND tenant_id = :primary_tenant_id;

-- Deny the specific permission required by the RPC branch under test
INSERT INTO public.member_permissions (tenant_id, user_id, permission_key, granted)
VALUES (:primary_tenant_id, :actor_id, :perm_key, false)
ON CONFLICT (tenant_id, user_id, permission_key)
DO UPDATE SET granted = EXCLUDED.granted;

-- Invoke the RPC that must fail with the expected error code
-- (e.g. FIN_PERMISSION_DENIED / FIN_SOURCE_NOT_FOUND depending on branch)

ROLLBACK TO SAVEPOINT sp_perm_case;
```

The outer `ROLLBACK TO SAVEPOINT` restores the Owner membership before any subsequent
positive test runs. The fixed actor never mutates persistently.

---

## 4. Secondary Tenant Contract

Purpose: exercise the sole authorized cross-tenant negative case — invoking
`create_source_checkout_invoice` on the primary tenant with a Source belonging to a
secondary tenant. Expected result: `FIN_SOURCE_NOT_FOUND`.

### Feasibility

- `check_tenant_limit()` caps tenants per owner at 3; the fixed actor currently owns 1
  (File 14 Section 9.4). A transaction-local second tenant is well within the limit.
- The stable-type provisioning triggers self-seed roles and permissions inside the
  transaction and are harmless upon rollback.

### Mandatory Columns

From File 14 Section 9.4, the only columns lacking a server default AND `NOT NULL` are
`name`, `type`, `owner_id`. All other required columns default (`id`, `created_at`,
`updated_at`, `default_tax_rate`, `prices_tax_inclusive`, `currency`).

### Executable-Shape Template

```sql
INSERT INTO public.tenants (name, type, owner_id)
VALUES (
  'j5_1a_t1_secondary_' || substr(md5(random()::text), 1, 8),
  'stable',                                    -- same enum as primary tenant (proven in 9.3)
  :actor_id                                    -- reuses fixed actor (proven owner FK)
)
RETURNING id INTO :secondary_tenant_id;
```

The chosen `type='stable'` is grounded in the primary tenant's proven type. No enum
label is guessed.

### Secondary Membership Template

```sql
INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
VALUES (:secondary_tenant_id, :actor_id, 'owner', true);
```

This makes the fixed actor an authenticated owner of the secondary tenant so the
secondary-tenant Source can be inserted through the normal validation triggers.

---

## 5. Horse Gender Contract (Corrected)

Proof (File 14 Section 9.5):

- `horses.gender` is `text NOT NULL`.
- `horses_gender_check` restricts values to exactly `{'male','female'}`.
- Live population: `male=17`, `female=16`. No other value has ever been valid.
- No `horse_gender`/`gender_type` enum exists.

All fixture templates MUST use `'male'` or `'female'`. `'colt'` is NOT a permitted value
and is removed from every template below.

---

## 6. Payment Account Strategy (Corrected)

Proof: the primary tenant has zero `payment_accounts` rows (File 14 Section 8).

Create the Tenant Payment Account exactly ONCE inside the outer T1 transaction, before
any positive case runs:

```sql
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('tenant', :primary_tenant_id, true)
ON CONFLICT (tenant_id) DO UPDATE SET is_active = true
RETURNING id INTO :primary_payment_account_id;
```

For the "missing / inactive account" negative case, use a savepoint that toggles
`is_active` and rolls back — never drop or re-create the account between positive tests:

```sql
SAVEPOINT sp_payacct_inactive;
UPDATE public.payment_accounts SET is_active = false WHERE id = :primary_payment_account_id;
-- invoke RPC; assert expected failure code and zero financial residue
ROLLBACK TO SAVEPOINT sp_payacct_inactive;
```

Repeat the same pattern for the secondary tenant if a secondary Payment Account is
required by a specific case (`ON CONFLICT (tenant_id)` guarantees idempotency).

---

## 7. Structurally Unreachable Negative Cases

The validation triggers on `lab_samples` and `horse_orders` (File 14 Section 5) and
their FK constraints reject the following states at insert/update time:

- `lab_samples.client_id` referencing a client outside the sample's tenant.
- `lab_samples.horse_id` referencing a horse outside the sample's tenant.
- `horse_orders.client_id` referencing a client outside the order's tenant.
- `horse_orders.horse_id` referencing a horse outside the order's tenant.
- `horse_orders.order_type_id` referencing an order type outside the order's tenant.
- Missing `horse_id`, `order_type_id`, or `client_id` (blocked by FKs / NOT NULL).

Therefore the T1 matrix MUST NOT try to fabricate such rows. It MUST NOT:

- disable constraints,
- disable triggers,
- set `session_replication_role = 'replica'`,
- drop or defer FKs,
- forge cross-tenant fields via UPDATE after insert.

These RPC guards are validated as **defense-in-depth branches that are structurally
unreachable under the live Source schema** and are documented — not executed — in T1.

### The Single Required Cross-Tenant Case

Insert a fully valid Source belonging to the secondary tenant, then call the checkout
RPC with `p_tenant_id = :primary_tenant_id` and `p_source_id = <secondary source id>`.

Expected: `FIN_SOURCE_NOT_FOUND` (the RPC's tenant-scoped Source lookup returns zero
rows and does not leak the secondary-tenant Source into primary-tenant scope).

---

## 8. Complete Fixture Blueprint Inventory

All templates below use only actual columns proven by File 14, mechanically-valid enum
and CHECK values, the fixed actor where applicable, and collision-safe generated
identifiers. No `TODO`, no `TBD`, no guessed values.

### 8.1 Tenant Payment Account (primary)

```sql
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('tenant', :primary_tenant_id, true)
ON CONFLICT (tenant_id) DO UPDATE SET is_active = true
RETURNING id;
```

### 8.2 Secondary Tenant

```sql
INSERT INTO public.tenants (name, type, owner_id)
VALUES (
  'j5_1a_t1_sec_' || substr(md5(random()::text), 1, 8),
  'stable',
  :actor_id
)
RETURNING id;
```

### 8.3 Secondary Tenant Membership

```sql
INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
VALUES (:secondary_tenant_id, :actor_id, 'owner', true);
```

### 8.4 Secondary Tenant Payment Account

```sql
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('tenant', :secondary_tenant_id, true)
ON CONFLICT (tenant_id) DO UPDATE SET is_active = true
RETURNING id;
```

### 8.5 Client (per tenant)

```sql
INSERT INTO public.clients (tenant_id, name, created_by)
VALUES (:tenant_id, 'j5_1a_client_' || substr(md5(random()::text), 1, 8), :actor_id)
RETURNING id;
```

### 8.6 Horse (per tenant)

```sql
INSERT INTO public.horses (tenant_id, name, gender, created_by)
VALUES (
  :tenant_id,
  'j5_1a_horse_' || substr(md5(random()::text), 1, 8),
  'male',                                     -- proven valid (Section 9.5); use 'female' for
                                              -- variants that require female-only branches
  :actor_id
)
RETURNING id;
```

### 8.7 lab_horses

Follow the required-column contract captured in File 14 Section 1 for `lab_horses`;
`tenant_id` is `:tenant_id`, `client_id` is the tenant-scoped client from 8.5, and any
optional linkage to `horses` uses the tenant-scoped horse from 8.6. No cross-tenant IDs.

### 8.8 lab_samples — Deposit-valid (accessioned)

```sql
INSERT INTO public.lab_samples (
  tenant_id, client_id, lab_horse_id, status, created_by
)
VALUES (
  :tenant_id, :client_id, :lab_horse_id, 'accessioned', :actor_id
)
RETURNING id;
```

Additional NOT NULL columns per the live schema (File 14 Section 1) MUST be supplied
using the values documented there; no unlisted default is assumed.

Status variants for the matrix:

- `'draft'`      → Deposit-valid
- `'accessioned'` → Deposit-valid, Final-invalid
- `'processing'` → Deposit-invalid AND Final-invalid
- `'completed'`  → Final-valid, Deposit-invalid
- `'cancelled'`  → rejected before link-kind processing

### 8.9 horse_order_types (per tenant)

```sql
INSERT INTO public.horse_order_types (tenant_id, name, created_by)
VALUES (:tenant_id, 'j5_1a_ot_' || substr(md5(random()::text), 1, 8), :actor_id)
RETURNING id;
```

### 8.10 horse_orders

```sql
INSERT INTO public.horse_orders (
  tenant_id, client_id, horse_id, order_type_id, service_mode, status, created_by
)
VALUES (
  :tenant_id, :client_id, :horse_id, :order_type_id,
  'internal',            -- required per validate_horse_order_tenant (File 14 Section 5)
  'draft',               -- valid initial status per horse_orders_status_check
  :actor_id
)
RETURNING id;
```

---

## 9. Static Consistency Audit (Self-Check Before T1)

The T1 authoring turn MUST verify the following invariants against this file and File 14
before writing any SQL:

- [ ] No statement claims `draft` is Deposit-invalid.
- [ ] No statement claims `processing` is Deposit-valid.
- [ ] No statement claims `member_permissions.granted=false` directly overrides Owner.
- [ ] No mandatory test requires corrupted / FK-bypassing / trigger-bypassing rows.
- [ ] No fixture uses a Horse gender other than `'male'` or `'female'`.
- [ ] No fixture uses arbitrary Owner selection or `LIMIT 1` for the actor.
- [ ] No `TODO`, no `TBD`, no placeholder values remain.
- [ ] Every template uses the fixed `:actor_id` where applicable.
- [ ] The single cross-tenant negative case uses a real secondary-tenant Source.

---

## 10. T1 Authoring Readiness

With Sections 1–9 satisfied, a fully executable, zero-placeholder T1 core matrix can now
be authored against `supabase/tests/database/j5_1_source_checkout.test.sql` WITHOUT
disabling any live constraints or triggers. The remaining T2 rollback-injection matrix
is out of scope for this preflight.

---

## 11. Locked Artifacts (Unchanged)

- `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql`
- `supabase/tests/database/j5_1_source_checkout.test.sql`
- `supabase/migrations/**`
- `src/**`, translations, generated types, permissions, Demo data
- All Retail POS surfaces (`pos_sessions`, `pos_sales`, `products`, `product_categories`,
  `create_pos_sale`, `sale_number`, `cart_hash`, POS inventory/receipts/returns,
  `payment_intents`)
