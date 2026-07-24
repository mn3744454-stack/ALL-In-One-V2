# J5.1A.2 — Source Fixture Execution Contract (REPAIRED)

Phase: N+1B · J5.1A.2-PREFLIGHT-CONTRACT-REPAIR
Scope: Non-POS Source Checkout only (Lab Sample + Horse Order). Retail POS excluded.

This document is the sole authoritative fixture blueprint for the T1 core matrix and
the T2 rollback-injection matrix. Every rule, column list, and template below is
mechanically grounded in the raw catalog evidence captured in File 14, Sections 1–10.
Zero prose substitutes are permitted; every fixture is a complete executable SQL
template.

---

## 1. Fixed Identity Contract

```
:primary_tenant_id := '145f2128-83ca-4ba8-85b5-8ade245c5530'   -- tenants.type='stable'
:actor_id          := '98439fe8-6881-4e9e-8ff6-18aca0ce4470'   -- tenant_members owner, is_active=true
```

Proof (File 14 Section 9.1): `profiles(:actor_id)` exists; `tenant_members` row exists
with `role='owner'`, `is_active=true`, `tenant_id=:primary_tenant_id`; the actor is
transitively an `auth.users` row via `tenants.owner_id` FK.

Prohibited: arbitrary Owner lookup, `LIMIT 1`, forged `profiles`/`auth.users` rows.

---

## 2. Lab Sample Link-Kind Status Contract

Authoritative source: locked migration `j5_1a_migration.sql`.

| lab_samples.status | Deposit | Final |
|--------------------|---------|-------|
| `draft`            | VALID   | invalid |
| `accessioned`      | VALID   | invalid |
| `processing`       | invalid | invalid |
| `completed`        | invalid | VALID   |
| `cancelled`        | rejected pre-kind | rejected pre-kind |

Same-sample Deposit → Final happy path (single transaction, obeys
`validate_lab_sample` transition rules — see File 14 Section 5):

1. INSERT `lab_samples` with `status='accessioned'`.
2. `create_source_checkout_invoice(..., link_kind='deposit')` → success.
3. UPDATE the same sample to `status='processing'`.
4. UPDATE the same sample to `status='completed'`.
5. `create_source_checkout_invoice(..., link_kind='final')` → success.

---

## 3. Permission-Shaping Contract (CORRECTED)

Grounded in the captured `public.has_permission` body (File 14 Section 6):

```
active membership check
  → if role = 'owner'  → return TRUE (short-circuits every override)
  → else consult member_permissions
  → else fall through to role/bundle resolution
```

Therefore: **`member_permissions.granted=false` does NOT override an active Owner.**
The temporary role demotion to a valid non-owner `tenant_role` (`'foreman'`) is
MANDATORY before the override can take effect.

The real `public.member_permissions` schema (File 14 Section 10) is:

```
id, tenant_member_id, permission_key, granted, granted_by, granted_at
UNIQUE (tenant_member_id, permission_key)
tenant_member_id -> tenant_members(id) ON DELETE CASCADE
granted_by       -> profiles(id)
permission_key   -> permission_definitions(key) ON DELETE CASCADE
```

There is NO `tenant_id` or `user_id` column on `member_permissions`. Every prior
template using those columns is schema-invalid and MUST NOT be reintroduced.

### 3.1 Canonical Isolated Negative-Permission Recipe

```sql
SAVEPOINT sp_perm_case;

-- Demote the fixed Owner to a non-owner valid tenant_role, capturing the membership id.
WITH demoted AS (
  UPDATE public.tenant_members
     SET role = 'foreman'
   WHERE tenant_id = :primary_tenant_id
     AND user_id  = :actor_id
     AND role     = 'owner'
  RETURNING id
)
SELECT id INTO :actor_member_id FROM demoted;

-- The UPDATE must affect exactly one row (assert in T1).
-- If zero rows return, the fixed Owner assumption has drifted; abort with a named error.

-- Apply the negative override on the member (not on tenant_id/user_id).
INSERT INTO public.member_permissions (
  tenant_member_id,
  permission_key,
  granted,
  granted_by
)
VALUES (
  :actor_member_id,
  :permission_key,
  false,
  :actor_id                     -- valid: profiles(id) FK, and actor has a profiles row
)
ON CONFLICT (tenant_member_id, permission_key)
DO UPDATE SET granted    = false,
              granted_by = EXCLUDED.granted_by,
              granted_at = now();

-- Invoke the RPC that must fail with the expected error code (e.g. FIN_PERMISSION_DENIED).

ROLLBACK TO SAVEPOINT sp_perm_case;   -- restores Owner role and clears the override
```

Verification facts:
- `granted_by=:actor_id` satisfies the `profiles(id)` FK (Section 10 evidence).
- `'foreman'` is a proven valid `tenant_role` label (row samples in File 14 Section 9.2).
- The Owner-membership UPDATE targets the unique `(tenant_id, user_id)` pair and thus
  affects exactly one row.

---

## 4. Secondary Tenant Membership Decision (LOCKED — Strategy B)

Evidence (File 14 Section 10): Only five triggers exist on `public.tenants`.
`seed_tenant_roles` inserts `tenant_roles` only; `_trg_provision_stable_local_record_permissions`
seeds permission definitions only; neither inserts into `tenant_members`.

**Locked strategy: Strategy B — Owner membership must be inserted manually.**

The Owner-membership fixture for the secondary tenant is Section 8.10 below and MUST
be executed exactly once immediately after Section 8.9.

---

## 5. Horse Order Service-Mode Locking

Evidence (File 14 Sections 5 and 9.7): The Horse Order tenant-validation trigger falls
back to `has_internal=false / allow_external=true` when no matching
`tenant_capabilities` row exists (proven zero for the fixed tenant). Therefore all
ordinary T1 Horse Order fixtures use `service_mode='external'`. `service_mode='internal'`
would require fabricating a Tenant Capability row and is out of scope for T1.

---

## 6. Payment Account Strategy

Create the primary Tenant Payment Account ONCE inside the outer T1 transaction, before
any positive case runs. For the inactive-account negative case use a SAVEPOINT that
toggles `is_active`; never drop/recreate the account.

---

## 7. Structurally Unreachable Negative Cases

Existing triggers (`validate_lab_sample`, `validate_horse_order_tenant`, FKs) already
reject cross-tenant `client_id`/`horse_id`/`order_type_id` at insert time. T1 MUST NOT
attempt to fabricate such rows and MUST NOT disable constraints, disable triggers,
set `session_replication_role='replica'`, drop or defer FKs, or forge cross-tenant
fields via post-insert UPDATE. The single required cross-tenant case is: primary-tenant
RPC call + secondary-tenant Source id → `FIN_SOURCE_NOT_FOUND`.

---

## 8. Complete Executable Fixture Blueprint Inventory

Every template below is complete, executable, and uses only columns proven by File 14.
Named parameters (`:name`) are permitted; incomplete prose is not.

### 8.1 Primary Tenant Payment Account (one-time)

```sql
INSERT INTO public.payment_accounts (
  id,
  owner_type,
  tenant_id,
  is_active
)
VALUES (
  :primary_payment_account_id,
  'tenant',
  :primary_tenant_id,
  true
)
ON CONFLICT (tenant_id)
DO UPDATE SET is_active = true
RETURNING id;
```

For the inactive-account case:

```sql
SAVEPOINT sp_payacct_inactive;
UPDATE public.payment_accounts
   SET is_active = false
 WHERE id = :primary_payment_account_id;
-- invoke RPC; assert expected failure code; assert zero financial residue
ROLLBACK TO SAVEPOINT sp_payacct_inactive;
```

### 8.2 Primary Tenant Client

```sql
INSERT INTO public.clients (
  id,
  tenant_id,
  name
)
VALUES (
  :primary_client_id,
  :primary_tenant_id,
  'j5_1a_client_' || substr(md5(:primary_client_id::text), 1, 8)
);
```

### 8.3 Primary Tenant Horse

```sql
INSERT INTO public.horses (
  id,
  tenant_id,
  name,
  gender
)
VALUES (
  :primary_horse_id,
  :primary_tenant_id,
  'j5_1a_horse_' || substr(md5(:primary_horse_id::text), 1, 8),
  'male'
);
```

### 8.4 Primary Tenant Lab Horse

```sql
INSERT INTO public.lab_horses (
  id,
  tenant_id,
  created_by,
  name,
  metadata,
  source,
  is_archived,
  client_id
)
VALUES (
  :primary_lab_horse_id,
  :primary_tenant_id,
  :actor_id,
  'j5_1a_lab_horse_' || substr(md5(:primary_lab_horse_id::text), 1, 8),
  '{}'::jsonb,
  'manual',
  false,
  :primary_client_id
);
```

Collision-prone optional fields (`microchip_number`, `passport_number`, `ueln`,
`linked_horse_id`) are intentionally left NULL — every unique index is a partial
index gated on `IS NOT NULL`, so NULL avoids duplication.

### 8.5 Lab Sample — Lab-Horse Precedence Case

Trigger `validate_lab_sample` requires `horse_id IS NOT NULL OR NULLIF(TRIM(horse_name),'') IS NOT NULL`;
`lab_horse_id` alone is insufficient. Therefore the precedence fixture supplies BOTH a
platform `horse_id` (to satisfy the Source trigger) and a `lab_horse_id` (to exercise
the checkout RPC's Lab-Horse precedence branch on the Invoice Item snapshot).

```sql
INSERT INTO public.lab_samples (
  id,
  tenant_id,
  horse_id,
  client_id,
  collection_date,
  status,
  retest_count,
  client_metadata,
  created_by,
  lab_horse_id,
  numbering_deferred
)
VALUES (
  :sample_precedence_id,
  :primary_tenant_id,
  :primary_horse_id,             -- satisfies validate_lab_sample
  :primary_client_id,
  now(),
  :sample_status,                -- 'draft' | 'accessioned' | 'processing' | 'completed' | 'cancelled'
  0,
  '{}'::jsonb,
  :actor_id,
  :primary_lab_horse_id,         -- Lab-Horse takes precedence on Invoice Item snapshot
  true
);
```

### 8.6 Lab Sample — Platform Horse Fallback Case

```sql
INSERT INTO public.lab_samples (
  id,
  tenant_id,
  horse_id,
  client_id,
  collection_date,
  status,
  retest_count,
  client_metadata,
  created_by,
  lab_horse_id,
  numbering_deferred
)
VALUES (
  :sample_platform_id,
  :primary_tenant_id,
  :primary_horse_id,             -- fallback identity for Invoice Item
  :primary_client_id,
  now(),
  :sample_status,
  0,
  '{}'::jsonb,
  :actor_id,
  NULL,                          -- no Lab Horse => platform Horse identity used
  true
);
```

### 8.7 Lab Sample — Walk-In Case

```sql
INSERT INTO public.lab_samples (
  id,
  tenant_id,
  horse_id,
  horse_name,
  client_id,
  client_name,
  collection_date,
  status,
  retest_count,
  client_metadata,
  created_by,
  lab_horse_id,
  numbering_deferred
)
VALUES (
  :sample_walkin_id,
  :primary_tenant_id,
  NULL,
  'J5.1A.2 Walk-In Horse',       -- satisfies validate_lab_sample
  NULL,
  'J5.1A.2 Walk-In Client',      -- may be NULL for walk-in-without-client variants
  now(),
  :sample_status,
  0,
  '{}'::jsonb,
  :actor_id,
  NULL,
  true
);
```

### 8.8 Primary Tenant Horse Order Type

```sql
INSERT INTO public.horse_order_types (
  id,
  tenant_id,
  name,
  category,
  is_active,
  pin_as_tab,
  sort_order
)
VALUES (
  :primary_order_type_id,
  :primary_tenant_id,
  'j5_1a_order_type_' || substr(md5(:primary_order_type_id::text), 1, 8),
  NULL,                          -- intentional: no tenant_capabilities row matches NULL
  true,
  false,
  0
);
```

Rationale for `category=NULL`: no Tenant Capability row is required, so
`validate_horse_order_tenant` falls back to `allow_external=true` and rejects
`service_mode='internal'` — matching the T1 scope in Section 5.

### 8.9 Completed Billable Horse Order

```sql
INSERT INTO public.horse_orders (
  id,
  tenant_id,
  horse_id,
  order_type_id,
  service_mode,
  status,
  priority,
  requested_at,
  external_provider_name,
  actual_cost,
  estimated_cost,
  currency,
  is_income,
  created_by,
  client_id
)
VALUES (
  :order_completed_id,
  :primary_tenant_id,
  :primary_horse_id,
  :primary_order_type_id,
  'external',                    -- locked by Section 5
  'completed',
  'medium',
  now(),
  'J5.1A.2 Test Provider',
  150.00,                        -- actual_cost precedence
  99.00,
  'SAR',
  false,
  :actor_id,
  :primary_client_id
);
```

`completed_at` is populated by the trigger; do not set it in the INSERT.

### 8.10 Non-Completed Horse Order (pending / in_progress / cancelled)

```sql
INSERT INTO public.horse_orders (
  id,
  tenant_id,
  horse_id,
  order_type_id,
  service_mode,
  status,
  priority,
  requested_at,
  external_provider_name,
  actual_cost,
  estimated_cost,
  currency,
  is_income,
  created_by,
  client_id
)
VALUES (
  :order_noncompleted_id,
  :primary_tenant_id,
  :primary_horse_id,
  :primary_order_type_id,
  'external',
  :nonterminal_status,           -- 'pending' | 'in_progress' | 'cancelled'
  'medium',
  now(),
  'J5.1A.2 Test Provider',       -- retained non-empty per Section 10
  NULL,
  NULL,
  'SAR',
  false,
  :actor_id,
  :primary_client_id
);
```

### 8.11 Missing-Cost Horse Order

```sql
INSERT INTO public.horse_orders (
  id,
  tenant_id,
  horse_id,
  order_type_id,
  service_mode,
  status,
  priority,
  requested_at,
  external_provider_name,
  actual_cost,
  estimated_cost,
  currency,
  is_income,
  created_by,
  client_id
)
VALUES (
  :order_missing_cost_id,
  :primary_tenant_id,
  :primary_horse_id,
  :primary_order_type_id,
  'external',
  'completed',
  'medium',
  now(),
  'J5.1A.2 Test Provider',
  NULL,
  NULL,
  'SAR',
  false,
  :actor_id,
  :primary_client_id
);
```

### 8.12 Estimated-Cost Fallback Horse Order

```sql
INSERT INTO public.horse_orders (
  id, tenant_id, horse_id, order_type_id, service_mode, status, priority,
  requested_at, external_provider_name, actual_cost, estimated_cost, currency,
  is_income, created_by, client_id
)
VALUES (
  :order_estimated_id,
  :primary_tenant_id,
  :primary_horse_id,
  :primary_order_type_id,
  'external',
  'completed',
  'medium',
  now(),
  'J5.1A.2 Test Provider',
  NULL,
  99.00,                         -- estimated_cost fallback
  'SAR',
  false,
  :actor_id,
  :primary_client_id
);
```

Browser-supplied checkout item pricing must never be forwarded — the RPC pulls the
canonical cost server-side.

### 8.13 Secondary Tenant

```sql
INSERT INTO public.tenants (
  id,
  name,
  type,
  owner_id
)
VALUES (
  :secondary_tenant_id,
  'j5_1a_secondary_' || substr(md5(:secondary_tenant_id::text), 1, 8),
  'stable',
  :actor_id
);
```

Well within the `check_tenant_limit()` cap of 3 (actor currently owns 1 — Section 10).

### 8.14 Secondary Tenant Owner Membership (Strategy B — mandatory)

```sql
INSERT INTO public.tenant_members (
  tenant_id,
  user_id,
  role,
  is_active
)
VALUES (
  :secondary_tenant_id,
  :actor_id,
  'owner',
  true
);
```

### 8.15 Secondary Tenant Payment Account

```sql
INSERT INTO public.payment_accounts (
  id,
  owner_type,
  tenant_id,
  is_active
)
VALUES (
  :secondary_payment_account_id,
  'tenant',
  :secondary_tenant_id,
  true
)
ON CONFLICT (tenant_id)
DO UPDATE SET is_active = true
RETURNING id;
```

### 8.16 Secondary Tenant Client

```sql
INSERT INTO public.clients (
  id, tenant_id, name
)
VALUES (
  :secondary_client_id,
  :secondary_tenant_id,
  'j5_1a_client_' || substr(md5(:secondary_client_id::text), 1, 8)
);
```

### 8.17 Secondary Tenant Horse

```sql
INSERT INTO public.horses (
  id, tenant_id, name, gender
)
VALUES (
  :secondary_horse_id,
  :secondary_tenant_id,
  'j5_1a_horse_' || substr(md5(:secondary_horse_id::text), 1, 8),
  'male'
);
```

### 8.18 Secondary Tenant Lab Horse

```sql
INSERT INTO public.lab_horses (
  id, tenant_id, created_by, name, metadata, source, is_archived, client_id
)
VALUES (
  :secondary_lab_horse_id,
  :secondary_tenant_id,
  :actor_id,
  'j5_1a_lab_horse_' || substr(md5(:secondary_lab_horse_id::text), 1, 8),
  '{}'::jsonb,
  'manual',
  false,
  :secondary_client_id
);
```

### 8.19 Secondary Tenant Lab Sample (cross-tenant negative-case source)

```sql
INSERT INTO public.lab_samples (
  id, tenant_id, horse_id, client_id, collection_date, status,
  retest_count, client_metadata, created_by, lab_horse_id, numbering_deferred
)
VALUES (
  :secondary_sample_id,
  :secondary_tenant_id,
  :secondary_horse_id,
  :secondary_client_id,
  now(),
  'accessioned',
  0,
  '{}'::jsonb,
  :actor_id,
  :secondary_lab_horse_id,
  true
);
```

### 8.20 Secondary Tenant Horse Order Type

```sql
INSERT INTO public.horse_order_types (
  id, tenant_id, name, category, is_active, pin_as_tab, sort_order
)
VALUES (
  :secondary_order_type_id,
  :secondary_tenant_id,
  'j5_1a_order_type_' || substr(md5(:secondary_order_type_id::text), 1, 8),
  NULL, true, false, 0
);
```

### 8.21 Secondary Tenant Horse Order (only when needed by a specific case)

```sql
INSERT INTO public.horse_orders (
  id, tenant_id, horse_id, order_type_id, service_mode, status, priority,
  requested_at, external_provider_name, actual_cost, estimated_cost, currency,
  is_income, created_by, client_id
)
VALUES (
  :secondary_order_id,
  :secondary_tenant_id,
  :secondary_horse_id,
  :secondary_order_type_id,
  'external',
  'completed',
  'medium',
  now(),
  'J5.1A.2 Secondary Provider',
  150.00,
  99.00,
  'SAR',
  false,
  :actor_id,
  :secondary_client_id
);
```

---

## 9. Static Consistency Audit

- [x] No `member_permissions` template uses `tenant_id` or `user_id`.
- [x] The permission conflict target is exactly `(tenant_member_id, permission_key)`.
- [x] No `clients` template contains `created_by`.
- [x] No `horses` template contains `created_by`.
- [x] No `horse_order_types` template contains `created_by`.
- [x] `lab_horses` has a complete executable SQL template (8.4 / 8.18).
- [x] Every `lab_samples` template satisfies `validate_lab_sample`
      (`horse_id IS NOT NULL` in 8.5/8.6/8.19; non-empty `horse_name` in 8.7).
- [x] Lab-Horse precedence fixture (8.5) supplies BOTH a valid Source `horse_id` and
      a `lab_horse_id`.
- [x] Platform fallback fixture (8.6) supplies `horse_id` and `lab_horse_id=NULL`.
- [x] Walk-in fixture (8.7) supplies a non-empty `horse_name`.
- [x] Every ordinary `horse_orders` template uses `service_mode='external'`.
- [x] Every completed external `horse_orders` template retains a non-empty
      `external_provider_name`.
- [x] Cost fixtures cover missing (8.11), actual-precedence (8.9), and estimated
      fallback (8.12).
- [x] No ordinary T1 fixture depends on Internal capability.
- [x] Secondary Owner membership is handled exactly once (Strategy B, 8.14).
- [x] No corrupted / FK-bypassing / trigger-bypassing fixture is required.
- [x] Zero `TODO`, zero `TBD`, zero incomplete prose templates.
- [x] Locked migration and test files remain unchanged.

---

## 10. T1 Authoring Readiness

With Sections 1–9 satisfied, a fully executable zero-placeholder T1 core matrix can
be authored against `supabase/tests/database/j5_1_source_checkout.test.sql` without
disabling any live constraint or trigger and without any guessed columns.

---

## 11. Locked Artifacts (Unchanged)

- `docs/aml_1_b_1/stage_j5_1/j5_1a_migration.sql`
- `supabase/tests/database/j5_1_source_checkout.test.sql`
- `supabase/migrations/**`
- `src/**`, translations, generated types, permissions, Demo data
- All Retail POS surfaces
