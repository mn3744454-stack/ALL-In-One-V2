# J5.1A.2-PREFLIGHT · Source Fixture Execution Contract

Companion to `14_source_fixture_catalog_evidence.txt`. All claims below are grounded in the raw catalog outputs in that file. No placeholders. No POS.

Scope: `public.lab_samples`, `public.lab_horses`, `public.horse_orders`, `public.horse_order_types`, plus the minimum dependency rows (`public.tenants`, `public.tenant_members`, `public.clients`, `public.horses`, `public.member_permissions`, `public.payment_accounts`).

Fixed target tenant used throughout T1: `145f2128-83ca-4ba8-85b5-8ade245c5530`.

---

## 1. Enum / status contract (mechanical proof)

`lab_samples.status` and `horse_orders.status` are stored as `text` (see `SECTION 3` in the evidence file). Validity is enforced by `CHECK` constraints, not enum types.

`lab_samples_status_check`:
```
CHECK (status = ANY (ARRAY['draft','accessioned','processing','completed','cancelled']))
```
All five caller-listed values (`draft`, `accessioned`, `processing`, `completed`, `cancelled`) are **valid**.

`horse_orders_status_check`:
```
CHECK (status = ANY (ARRAY['draft','pending','scheduled','in_progress','completed','cancelled']))
```
All six caller-listed values (`draft`, `pending`, `scheduled`, `in_progress`, `completed`, `cancelled`) are **valid**.

Additional Horse Order text-CHECK domains:
- `service_mode` ∈ {`internal`, `external`}
- `priority`     ∈ {`low`, `medium`, `high`, `urgent`} — default `medium`

Live populations (from evidence Section 4):
- `lab_samples`: `accessioned` 9, `cancelled` 4, `completed` 37, `draft` 2, `processing` 5.
- `horse_orders`: 0 rows (table is empty in the live database).

---

## 2. Safe status transitions (from trigger bodies)

### Lab Sample (`validate_lab_sample_status_transition`)
```
draft       -> accessioned | cancelled
accessioned -> processing  | cancelled
processing  -> completed   | cancelled
completed   -> (final, blocked)
cancelled   -> (final, blocked)
```
`INSERT` bypasses the transition check (function returns NEW). Any starting status listed in the CHECK may be created directly.

### Horse Order (`validate_status_transition`)
```
draft       -> pending
pending     -> scheduled | cancelled
scheduled   -> in_progress | cancelled
in_progress -> completed  | cancelled
completed   -> (final, blocked)
cancelled   -> (final, blocked)
```
`INSERT` bypasses the transition check.

### Consequence for T1 same-sample Deposit → Final
A single Lab Sample can be created directly in `accessioned` (Deposit-valid) and later transitioned `accessioned -> processing -> completed` transaction-locally. The Deposit checkout must therefore run **before** the transitions to Final. `set_sample_lifecycle_timestamps` auto-fills `processing_started_at` and `completed_at` when the status enters those states, so T1 must not pre-set those columns manually.

### Consequence for T1 Horse Order billable case
Horse Orders can be created directly in `completed` (INSERT bypasses the transition trigger). However `validate_order_required_fields` sets `completed_at := now()` when status=`completed` and `completed_at` is null — no manual fill required.

---

## 3. Trigger and constraint risks

### `public.lab_samples`
| Trigger | Impact on T1 fixture |
|---|---|
| `validate_lab_sample` (BI/BU) | Rejects cross-tenant `horse_id`, `related_order_id`, `client_id`. Clears inline `client_name/phone/email/metadata` when `client_id` is set. Requires `horse_name` when `horse_id` is NULL. Rejects `tenant_id` change. |
| `validate_lab_sample_received` (BI/BU) | Rejects `received_by` unless the user is an active `tenant_members` row. Rejects unknown `source_lab_tenant_id`. Auto-fills `received_at := now()` if only `received_by` supplied. |
| `validate_lab_sample_status_transition` (BU) | Enforces the transition table above; no effect on INSERT. |
| `set_daily_sample_number` (BI/BU) | Assigns `daily_number` only when status becomes `accessioned` or `received_at`/`received_by` is set, and `numbering_deferred=false`. Takes a per-tenant/day `pg_advisory_xact_lock`. To skip numbering, keep `numbering_deferred=true` **or** stay in `draft` with no `received_*`. |
| `set_sample_lifecycle_timestamps` (BU) | Auto-fills `accessioned_at` / `processing_started_at` / `completed_at` on the matching transition. Do not pre-set. |
| `set_collection_date_only` (BI/BUOF collection_date) | Derives `collection_date_only` from `collection_date` at `Asia/Riyadh`. |
| `log_lab_sample_event` (AI/AU) | Writes to `lab_events` using `COALESCE(auth.uid(), NEW.created_by)`. Requires `created_by` to be non-null (safe — `created_by` is NOT NULL). |
| `update_lab_samples_updated_at` (BU) | Refreshes `updated_at`. |

Collisions: `idx_lab_samples_unique_daily_number` is `UNIQUE (tenant_id, collection_date_only, daily_number) WHERE daily_number IS NOT NULL`. T1 must either keep samples in a status/`numbering_deferred=true` state that does not assign `daily_number`, or accept that multiple `accessioned` samples on the same tenant/day auto-number monotonically inside the transaction.

### `public.lab_horses`
Only `set_lab_horses_updated_at` fires. Collision risk from partial-unique indexes on `(tenant_id, microchip_number)`, `(tenant_id, passport_number)`, `(tenant_id, ueln)`, `(tenant_id, linked_horse_id)` — all `WHERE NOT NULL`. Strategy: leave those fields NULL for T1 fixtures.

### `public.horse_orders`
| Trigger | Impact on T1 fixture |
|---|---|
| `validate_horse_order_tenant` (BI/BU) | Rejects cross-tenant `horse_id`, `order_type_id`, `client_id`, `external_provider_id`, and `assigned_to` (via active tenant_members). Copies `category` from the referenced order type. Rejects `service_mode='internal'` with any external provider fields. For `service_mode='external'` and status not in (`draft`,`pending`), requires provider info. Enforces `tenant_capabilities.has_internal` / `allow_external` per `(tenant_id, category)`; when no capabilities row exists, defaults to `has_internal=false, allow_external=true`. |
| `validate_order_required_fields` (BI/BU) | Non-`draft` orders must have `horse_id` (NOT NULL) and `order_type_id` (NOT NULL). `scheduled` requires `scheduled_for`. `completed` auto-fills `completed_at` when null. `internal` non-draft requires non-empty `internal_resource_ref`. |
| `validate_status_transition` (BU) | Enforces the transition table above. |
| `update_horse_orders_updated_at` (BU) | Refreshes `updated_at`. |

Strategy for T1: use `service_mode='external'`, `external_provider_name='J5.1A.2 provider'` (avoids provider-id cross-tenant checks) and either an order type whose `category` has no capabilities row (defaults to external-allowed) or explicitly seed the order type with `category=NULL` (capabilities lookup will not match, defaults apply and `service_mode='external'` is permitted).

### `public.horse_order_types`
| Trigger | Impact on T1 fixture |
|---|---|
| `validate_pinned_tabs_limit` (BI/BU) | Caps `pin_as_tab=true` at 6 per tenant. Safe if `pin_as_tab` stays default `false`. |
| `update_horse_order_types_updated_at` (BU) | Refreshes `updated_at`. |

Unique constraint `unique_order_type_name` on `(tenant_id, category, name)`. T1 must randomize the name (e.g. `'J5.1A.2 type ' || gen_random_uuid()`) to avoid collisions on re-run.

---

## 4. Cross-tenant negative-test strategy

Chosen strategy: **transaction-local second-tenant fixture**. Rationale:
- Every cross-tenant validator (`validate_lab_sample`, `validate_horse_order_tenant`, `_invoice_items_validate_source`) does a tenant-scoped lookup on the referenced row. A row inserted under a different tenant inside the same transaction is fully visible to those SECURITY DEFINER lookups and is rolled back with the outer test transaction.
- Mutating an existing unrelated tenant is forbidden; reading unrelated tenants leaks nothing but risks accidental writes.

Required columns for the transaction-local secondary tenant + one dependent row per referenced surface:

- `public.tenants` — `name`, `type` (enum `public.tenant_type`), `owner_id` NOT NULL. Set `owner_id` to the same test actor `auth.users.id` used for the primary tenant to avoid creating additional users.
- `public.tenant_members` — `(tenant_id, user_id, role='owner')` for the secondary tenant so `validate_lab_sample_received`/`validate_horse_order_tenant` accept `received_by`/`assigned_to`.
- `public.clients` — `tenant_id=<secondary>`, `name` (only NOT-NULL non-defaulted column).
- `public.horses` — `tenant_id=<secondary>`, `name`, `gender` (NOT NULL, no default) — set `gender='colt'` etc.
- `public.lab_horses` — `tenant_id=<secondary>`, `name`, (optionally `client_id=<secondary client>`).
- `public.horse_order_types` — `tenant_id=<secondary>`, `name` (unique per tenant+category), leave `category` NULL to bypass capabilities.
- `public.horse_orders` and `public.lab_samples` under the secondary tenant use the same shapes as the primary but with the secondary IDs.

All secondary-tenant rows are inserted and rolled back within the T1 outer transaction; nothing persists.

---

## 5. Permission-shaping strategy

`public.member_permissions` columns (all NOT NULL): `id` (default `gen_random_uuid()`), `tenant_member_id`, `permission_key`, `granted` (default `true`), `granted_at` (default `now()`). Nullable: `granted_by`.

FK: `permission_key -> permission_definitions(key) ON DELETE CASCADE`.
Unique: `(tenant_member_id, permission_key)`.

`has_permission` order of resolution (from `SECTION 6` body): active member check → owner short-circuit → `member_permissions` override → role permissions → role bundles → member bundles.

Mechanical fact: **`granted=false` in `member_permissions` overrides Owner access.** The owner short-circuit runs before the override lookup (`role='owner'` returns true immediately), so denying the owner requires **temporarily demoting** the tenant_members row to a non-owner role inside the same SAVEPOINT, then inserting the override, exercising the negative case, and rolling back. Alternative: run the negative case as a non-owner secondary member (a fresh `tenant_members` row for a distinct test user).

T1 SAVEPOINT-safe pattern (executable shape — do not run this turn):
```sql
SAVEPOINT sp_deny_finance_invoice_create;

-- Option A: demote the owner temporarily so member_permissions can deny
UPDATE public.tenant_members
   SET role = 'employee'
 WHERE id = :actor_member_id;

INSERT INTO public.member_permissions (tenant_member_id, permission_key, granted)
VALUES (:actor_member_id, 'finance.invoice.create', false)
ON CONFLICT (tenant_member_id, permission_key)
DO UPDATE SET granted = EXCLUDED.granted, granted_at = now();

-- exercise the negative case here (expect NOTFIN_PERMISSION_DENIED etc.)

ROLLBACK TO SAVEPOINT sp_deny_finance_invoice_create;
```

---

## 6. Payment-account strategy

Evidence facts (Section 8):
- Target tenant `145f2128-83ca-4ba8-85b5-8ade245c5530` has **no** `payment_accounts` row.
- Global counts: 0 tenant-owned rows, 0 platform rows.

Consequences:
- Any J5.1A migration path that requires an active tenant payment account must be exercised by T1 with a **transaction-local INSERT** into `public.payment_accounts` first.
- The "active tenant payment account exists" scenario is set up by INSERT within a SAVEPOINT.
- The "no active tenant payment account" scenario is the ambient state — no setup needed.
- The "deactivated tenant payment account" scenario is set up by INSERT with `is_active=false`, all inside the outer test transaction.

Constraints that must be honoured on INSERT:
- `valid_owner` CHECK: `owner_type='tenant'` requires `tenant_id IS NOT NULL`.
- `unique_tenant_account` UNIQUE `(tenant_id)`: only one row per tenant. Use `ON CONFLICT (tenant_id) DO UPDATE SET is_active = EXCLUDED.is_active` if the target tenant already has a row when the test starts (defensive; today it does not).
- `payment_accounts_tenant_id_fkey`: `tenant_id` must reference an existing tenant (target tenant exists).

Executable-shape pattern (do not run this turn):
```sql
SAVEPOINT sp_pa_active;
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('tenant', :tenant_id, true)
ON CONFLICT (tenant_id)
DO UPDATE SET is_active = true;
-- run positive Deposit / Final case
ROLLBACK TO SAVEPOINT sp_pa_active;

SAVEPOINT sp_pa_inactive;
INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
VALUES ('tenant', :tenant_id, false)
ON CONFLICT (tenant_id)
DO UPDATE SET is_active = false;
-- run negative case expecting the migration's "no active PA" branch
ROLLBACK TO SAVEPOINT sp_pa_inactive;
```

---

## 7. Collision-safe fixture value strategy

All identifiers, names and codes for T1 fixtures must be freshly generated so repeated runs (or nested SAVEPOINTs before rollback) do not collide with pre-existing rows:

| Surface | Field(s) at risk | Strategy |
|---|---|---|
| `horse_order_types` | `unique_order_type_name (tenant_id, category, name)` | `name := 'J5.1A2 type ' || substr(gen_random_uuid()::text,1,8)`; leave `category=NULL`. |
| `lab_horses` | `uq_lab_horses_tenant_microchip / _passport / _ueln / _linked_horse` | Leave `microchip_number`, `passport_number`, `ueln`, `linked_horse_id` NULL. |
| `lab_samples` | `idx_lab_samples_unique_daily_number` | Keep `numbering_deferred=true` unless a case specifically exercises numbering. |
| `payment_accounts` | `unique_tenant_account` | INSERT via `ON CONFLICT (tenant_id) DO UPDATE`. |
| `member_permissions` | `(tenant_member_id, permission_key)` | INSERT via `ON CONFLICT ... DO UPDATE SET granted=EXCLUDED.granted`. |

Every T1 case must run inside a single outer `BEGIN … ROLLBACK` so no fixture escapes the transaction.

---

## 8. Minimum-valid INSERT contracts

The following are **execution-shape templates** (not to be run this turn). Every non-default NOT NULL column is included. Fields not listed are either nullable or have defaults; T1 may omit them or set them explicitly when a case requires it. Named parameters (`:name`) mark test-run inputs.

### 8.1 `public.horse_order_types`
```sql
INSERT INTO public.horse_order_types (
  tenant_id,          -- NOT NULL, FK -> tenants(id)
  name,               -- NOT NULL, unique per (tenant_id, category)
  is_active,          -- NOT NULL (default true; kept explicit for clarity)
  pin_as_tab,         -- NOT NULL (default false)
  sort_order          -- NOT NULL (default 0)
) VALUES (
  :tenant_id,
  'J5.1A2 type ' || substr(gen_random_uuid()::text, 1, 8),
  true,
  false,
  0
) RETURNING id;
-- id, created_at, updated_at default. category left NULL to bypass tenant_capabilities.
```

### 8.2 `public.lab_horses`
```sql
INSERT INTO public.lab_horses (
  tenant_id,          -- NOT NULL, FK -> tenants(id) ON DELETE CASCADE
  name,               -- NOT NULL
  source,             -- NOT NULL (default 'manual'); kept explicit
  is_archived,        -- NOT NULL (default false)
  metadata,           -- NOT NULL (default '{}'::jsonb)
  client_id,          -- NULLABLE FK -> clients(id); set when the case links to a client
  created_by          -- NULLABLE FK -> auth.users(id); set to :actor_id for parity
) VALUES (
  :tenant_id,
  'J5.1A2 lab horse ' || substr(gen_random_uuid()::text, 1, 8),
  'manual',
  false,
  '{}'::jsonb,
  :client_id,
  :actor_id
) RETURNING id;
-- Microchip/passport/ueln/linked_horse_id left NULL to avoid partial-unique-index collisions.
```

### 8.3 `public.lab_samples`
```sql
INSERT INTO public.lab_samples (
  tenant_id,             -- NOT NULL, FK -> tenants(id) ON DELETE CASCADE
  collection_date,       -- NOT NULL (default now()); kept explicit so the case controls the day bucket
  status,                -- NOT NULL, CHECK ∈ {draft,accessioned,processing,completed,cancelled}
  retest_count,          -- NOT NULL (default 0); CHECK 0..3
  client_metadata,       -- NOT NULL (default '{}'::jsonb)
  numbering_deferred,    -- NOT NULL (default false); TRUE keeps daily_number unassigned
  created_by,            -- NOT NULL, FK -> profiles(id)
  -- Optional but commonly set:
  horse_id,              -- NULLABLE; if NULL, horse_name is REQUIRED by validate_lab_sample
  horse_name,            -- required when horse_id IS NULL
  client_id,             -- NULLABLE; if set, inline client_* fields are wiped by trigger
  lab_horse_id           -- NULLABLE FK -> lab_horses(id) ON DELETE SET NULL
) VALUES (
  :tenant_id,
  now(),
  'accessioned',              -- Deposit-valid starting state; can transition to processing/completed
  0,
  '{}'::jsonb,
  true,                       -- suppress daily numbering unless the case exercises it
  :actor_id,
  NULL,
  'J5.1A2 walk-in ' || substr(gen_random_uuid()::text, 1, 8),
  :client_id,
  :lab_horse_id
) RETURNING id;
-- id, created_at, updated_at default. collection_date_only auto-derived by trigger.
-- accessioned_at/processing_started_at/completed_at auto-filled on transitions.
```

Deposit → Final transition inside T1 (privileged UPDATE bypasses RLS via test transaction; validators still fire):
```sql
UPDATE public.lab_samples SET status='processing' WHERE id=:sample_id;
UPDATE public.lab_samples SET status='completed'  WHERE id=:sample_id;
```

Additional starting-status recipes:
- Invalid-Deposit fixture: create with `status='draft'` (Deposit checkout must reject anything that is not `accessioned`/`processing`).
- Invalid-Final fixture: create with `status='accessioned'` and do not transition (Final checkout must reject non-`completed`).
- Cancelled-Source fixture: create with `status='cancelled'`.

### 8.4 `public.horse_orders`
```sql
INSERT INTO public.horse_orders (
  tenant_id,        -- NOT NULL, FK -> tenants(id) ON DELETE CASCADE
  horse_id,         -- NOT NULL, FK -> horses(id) ON DELETE CASCADE (tenant-scoped)
  order_type_id,    -- NOT NULL, FK -> horse_order_types(id) ON DELETE RESTRICT
  service_mode,     -- NOT NULL, CHECK ∈ {internal,external}
  status,           -- NOT NULL, CHECK ∈ {draft,pending,scheduled,in_progress,completed,cancelled}
  priority,         -- NOT NULL (default 'medium'); CHECK ∈ {low,medium,high,urgent}
  requested_at,     -- NOT NULL (default now())
  currency,         -- NOT NULL (default 'SAR')
  is_income,        -- NOT NULL (default false)
  created_by,       -- NOT NULL, FK -> profiles(id) ON DELETE SET NULL
  -- Case-specific optional fields:
  external_provider_name,  -- required by validate_horse_order_tenant when service_mode='external' and status NOT IN (draft,pending)
  actual_cost,             -- checkout uses actual_cost when present, else estimated_cost
  estimated_cost,
  client_id                -- NULLABLE FK -> clients(id) ON DELETE SET NULL (tenant-scoped)
) VALUES (
  :tenant_id,
  :horse_id,
  :order_type_id,
  'external',
  'completed',              -- billable path; INSERT bypasses transition trigger
  'medium',
  now(),
  'SAR',
  false,
  :actor_id,
  'J5.1A2 provider',
  :actual_cost,             -- e.g. 150.00 for actual-cost precedence case
  :estimated_cost,          -- e.g. 100.00 for estimated-cost fallback case (actual_cost NULL)
  :client_id
) RETURNING id;
-- completed_at auto-filled by validate_order_required_fields when NULL.
-- category auto-copied from horse_order_types.category by validate_horse_order_tenant.
```

Additional starting-status recipes (all direct INSERTs; transition trigger bypassed on INSERT):
- Non-completed rejection: `status='pending'` or `status='in_progress'`.
- Cancelled rejection: `status='cancelled'`.
- Completed-with-missing-costs: `status='completed'`, `actual_cost=NULL`, `estimated_cost=NULL`.
- Actual-cost precedence: `status='completed'`, `actual_cost=150.00`, `estimated_cost=99.00`.
- Estimated-cost fallback: `status='completed'`, `actual_cost=NULL`, `estimated_cost=99.00`.

---

## 9. Required dependency fixtures (before the four primary INSERTs)

1. **Primary tenant** — already exists: `:tenant_id := '145f2128-83ca-4ba8-85b5-8ade245c5530'`. No INSERT required.
2. **Primary actor** — an existing owner `tenant_members.user_id` for the tenant. Evidence: target tenant has 3 members, ≥1 active. Resolve inside T1 with `SELECT user_id INTO :actor_id FROM tenant_members WHERE tenant_id=:tenant_id AND role='owner' AND is_active LIMIT 1;` and a `SELECT id INTO :actor_member_id FROM tenant_members WHERE tenant_id=:tenant_id AND user_id=:actor_id;`.
3. **Primary client** — `INSERT INTO public.clients (tenant_id, name) VALUES (:tenant_id, 'J5.1A2 client ' || substr(gen_random_uuid()::text,1,8)) RETURNING id INTO :client_id;`.
4. **Primary horse** — `INSERT INTO public.horses (tenant_id, name, gender) VALUES (:tenant_id, 'J5.1A2 horse ' || substr(gen_random_uuid()::text,1,8), 'colt') RETURNING id INTO :horse_id;`.
5. **Primary lab horse** — Section 8.2 template.
6. **Primary horse_order_type** — Section 8.1 template.
7. **Secondary tenant + members + client + horse + lab_horse + order_type** — Section 4 cross-tenant strategy.
8. **Payment account** — Section 6 SAVEPOINT patterns (only when the exercised case requires an active PA).

Every fixture is created inside the outer `BEGIN … ROLLBACK`; no row persists after the test transaction ends.

---

## 10. Locked artifacts (this turn touches neither)

- `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql` — unchanged.
- `supabase/tests/database/j5_1_source_checkout.test.sql` — unchanged.
- `supabase/migrations/**` — unchanged. No migration created or applied.
- Frontend, translations, generated types, permissions, POS surfaces — untouched.
