# 22 — Turn 5A.1R · Deterministic Fixture UUID Map (Corrected)

Namespace is locked. All UUIDs are v4-shaped. A read-only collision census was
executed against every fixture-owned UUID and its target table during Turn 5A.1R
(see §Collision census below).

Existing production identity (do NOT recreate):

| Purpose                  | UUID                                                                    |
|--------------------------|-------------------------------------------------------------------------|
| Fixed Actor              | `98439fe8-6881-4e9e-8ff6-18aca0ce4470`                                  |
| Fixed Primary Tenant     | `145f2128-83ca-4ba8-85b5-8ade245c5530`                                  |
| Fixed Secondary Tenant   | resolved at runtime (any tenant Actor is NOT a member of — for isolation) |
| Tenant Payment Account   | resolved at runtime from `payment_accounts` (exactly 1 active per tenant) |

Deterministic fixture UUIDs (each transaction-local; rolled back):

## A — Clients (tenant = Fixed Primary Tenant unless noted)

| Symbol                  | UUID                                     | Usage                              |
|-------------------------|------------------------------------------|-------------------------------------|
| CLIENT_REGISTERED       | `aaaa1111-0000-4000-8000-000000000001`   | Positive-path invoice client        |
| CLIENT_UNRELATED        | `aaaa1111-0000-4000-8000-000000000002`   | Cross-authority negative test       |
| CLIENT_SECONDARY_TENANT | `aaaa1111-0000-4000-8000-000000000003`   | Belongs to a different tenant — for `FIN_SOURCE_CLIENT_CROSS_TENANT` |

## B — Platform Horses (tenant = Primary unless noted)

| Symbol             | UUID                                     | Usage                          |
|--------------------|------------------------------------------|--------------------------------|
| HORSE_A            | `bbbb2222-0000-4000-8000-000000000001`   | Ownership-linked to REGISTERED |
| HORSE_UNLINKED     | `bbbb2222-0000-4000-8000-000000000002`   | Same tenant, no client link    |
| HORSE_CROSS_TENANT | `bbbb2222-0000-4000-8000-000000000003`   | Cross-tenant negative (for `FIN_ORDER_HORSE_NOT_FOUND`) |

## C — Lab Horses (tenant = Primary unless noted)

| Symbol               | UUID                                     | Linkage                              |
|----------------------|------------------------------------------|---------------------------------------|
| LH_LEGACY_CLIENT     | `cccc3333-0000-4000-8000-000000000001`   | `lab_horses.client_id = REGISTERED`   |
| LH_JUNCTION_CUSTOMER | `cccc3333-0000-4000-8000-000000000002`   | `party_horse_links.relationship_type='lab_customer'` |
| LH_JUNCTION_PAYER    | `cccc3333-0000-4000-8000-000000000003`   | `party_horse_links.relationship_type='payer'`        |
| LH_OWNER_ONLY        | `cccc3333-0000-4000-8000-000000000004`   | junction `owner` — MUST fail T13     |
| LH_TRAINER_ONLY      | `cccc3333-0000-4000-8000-000000000005`   | junction `trainer` — MUST fail T13   |
| LH_STABLE_ONLY       | `cccc3333-0000-4000-8000-000000000006`   | junction `stable` — MUST fail T13    |
| LH_UNRELATED         | `cccc3333-0000-4000-8000-000000000007`   | no legacy client, no junction         |
| LH_CROSS_TENANT      | `cccc3333-0000-4000-8000-000000000008`   | tenant = secondary                    |

## D — Lab Samples (tenant = Primary; created_by = Actor)

| Symbol                    | UUID                                     | Initial status | Notes                                                                                       |
|---------------------------|------------------------------------------|----------------|----------------------------------------------------------------------------------------------|
| LS_DRAFT_LEGACY           | `dddd4444-0000-4000-8000-000000000001`   | `draft`        | Deposit-positive **and** final-negative fixture (`draft` → `FIN_LAB_FINAL_STATUS_INVALID`) |
| LS_ACCESSIONED_LEGACY     | `dddd4444-0000-4000-8000-000000000002`   | `accessioned`  | Deposit-positive **and** final-negative fixture (`accessioned` → `FIN_LAB_FINAL_STATUS_INVALID`) |
| LS_COMPLETED_LEGACY       | `dddd4444-0000-4000-8000-000000000003`   | `completed`    | Final-positive fixture                                                                       |
| LS_PROCESSING             | `dddd4444-0000-4000-8000-000000000004`   | `processing`   | Deposit-negative (`processing` → `FIN_LAB_DEPOSIT_STATUS_INVALID`) and final-negative (`FIN_LAB_FINAL_STATUS_INVALID`) |
| LS_CANCELLED              | `dddd4444-0000-4000-8000-000000000005`   | `cancelled`    | Always `FIN_SOURCE_CANCELLED` (fires before status gates)                                    |
| LS_WALKIN_ANON            | `dddd4444-0000-4000-8000-000000000006`   | `draft`        | `client_id` NULL — exercises payload `client_name` path                                      |
| LS_WALKIN_LONG_NAME       | `dddd4444-0000-4000-8000-000000000007`   | `draft`        | `client_id` NULL — exercises `FIN_CLIENT_NAME_TOO_LONG` (201 char payload)                   |
| LS_DEP_JUNCTION_CUSTOMER  | `dddd4444-0000-4000-8000-000000000008`   | `draft`        | Uses LH_JUNCTION_CUSTOMER — validates trigger acceptance                                     |
| LS_FIN_JUNCTION_PAYER     | `dddd4444-0000-4000-8000-000000000009`   | `completed`    | Uses LH_JUNCTION_PAYER — validates trigger acceptance                                        |
| LS_DEP_OWNER_ONLY         | `dddd4444-0000-4000-8000-00000000000a`   | `draft`        | Uses LH_OWNER_ONLY — expects trigger `Lab horse … is not linked` (SQLSTATE 42501)            |
| **LS_COEXIST**            | `dddd4444-0000-4000-8000-00000000000b`   | `accessioned`  | **Single-source Deposit → Final coexistence fixture** (see §Coexistence lifecycle below)     |
| LS_CROSS_TENANT_CLIENT    | `dddd4444-0000-4000-8000-00000000000c`   | `draft`        | `client_id` = CLIENT_SECONDARY_TENANT — `FIN_SOURCE_CLIENT_CROSS_TENANT`                     |
| LS_SECONDARY_TENANT       | `dddd4444-0000-4000-8000-00000000000d`   | `draft`        | tenant = secondary — cross-tenant `FIN_SOURCE_NOT_FOUND` when called on primary tenant       |
| LS_ZERO_PRICE             | `dddd4444-0000-4000-8000-00000000000e`   | `draft`        | Fixture for `FIN_CHECKOUT_TOTAL_INVALID` via `unit_price=0` accepted at item gate            |

There is exactly ONE coexistence sample. Deposit and Final MUST run against the
same `source_id`; File 22 no longer allocates separate deposit / final source
UUIDs for coexistence.

## E — Horse Order Types

| Symbol            | UUID                                     | Notes                              |
|-------------------|------------------------------------------|-------------------------------------|
| HOT_ACTIVE        | `eeee5555-0000-4000-8000-000000000001`   | `is_active=true`                    |
| HOT_TO_DELETE     | `eeee5555-0000-4000-8000-000000000002`   | Deleted intra-scenario for `FIN_ORDER_TYPE_NOT_FOUND` |

## F — Horse Orders (tenant = Primary; created_by = Actor)

| Symbol                    | UUID                                     | status / cost                                    |
|---------------------------|------------------------------------------|---------------------------------------------------|
| HO_COMPLETED_ACTUAL       | `ffff6666-0000-4000-8000-000000000001`   | `completed`, `actual_cost=1000`                   |
| HO_COMPLETED_ESTIMATE_ONLY| `ffff6666-0000-4000-8000-000000000002`   | `completed`, `estimated_cost=500`                 |
| HO_DRAFT                  | `ffff6666-0000-4000-8000-000000000003`   | `draft` → `FIN_ORDER_NOT_COMPLETED`               |
| HO_MISSING_COST           | `ffff6666-0000-4000-8000-000000000004`   | `completed`, both costs NULL → `FIN_ORDER_MISSING_COST` |
| HO_HORSE_CROSS_TENANT     | `ffff6666-0000-4000-8000-000000000005`   | `completed`, `horse_id=HORSE_CROSS_TENANT` → `FIN_ORDER_HORSE_NOT_FOUND` |
| HO_ORDER_TYPE_MISSING     | `ffff6666-0000-4000-8000-000000000006`   | `completed`, `order_type_id=HOT_TO_DELETE`; delete HOT_TO_DELETE inside scenario → `FIN_ORDER_TYPE_NOT_FOUND` |
| HO_CANCELLED              | `ffff6666-0000-4000-8000-000000000007`   | `cancelled` → `FIN_SOURCE_CANCELLED`              |

## G — Idempotency keys (outer `p_idempotency_key`)

Deterministic per-namespace UUIDs:

| Namespace                                     | UUID range                                   |
|-----------------------------------------------|-----------------------------------------------|
| Lab Deposit success + replay + conflict       | `11111111-1111-4111-8111-000000000001..003`   |
| Lab Final success                             | `22222222-2222-4222-8222-000000000001`        |
| Lab Coexistence deposit                       | `22222222-2222-4222-8222-000000000002`        |
| Lab Coexistence final                         | `22222222-2222-4222-8222-000000000003`        |
| Horse Order Final success                     | `33333333-3333-4333-8333-000000000001`        |
| Duplicate-active source-link (rerun w/new key)| `44444444-4444-4444-8444-000000000001..003`   |
| Permission-denied paths                       | `55555555-5555-4555-8555-000000000001..005`   |
| T2 stage keys (per hook + inert-success)      | `66666666-6666-4666-8666-000000000001..005`   |

## Coexistence lifecycle (single-source Deposit → Final proof)

Single sample `LS_COEXIST` (initial status `accessioned`).

1. Fixture insert with `status='accessioned'` and `client_id=CLIENT_REGISTERED`.
2. Call RPC with `link_kind='deposit'` and idem key
   `22222222-2222-4222-8222-000000000002` → asserts one new invoice + one
   `billing_links` row with `link_kind='deposit'`.
3. Privileged status transition inside the same outer transaction:
   `UPDATE lab_samples SET status='processing' WHERE id=<LS_COEXIST>`.
4. Privileged status transition:
   `UPDATE lab_samples SET status='completed' WHERE id=<LS_COEXIST>`.
5. Call RPC with `link_kind='final'` and idem key
   `22222222-2222-4222-8222-000000000003` → asserts a second invoice + one
   `billing_links` row with `link_kind='final'`.
6. Assert: exactly one active `deposit` link and exactly one active `final` link
   for `(tenant_id, source_type='lab_sample', source_id=LS_COEXIST)`.
7. Assert: the two invoices are distinct rows.
8. Independent same-kind conflict proof: within a new SAVEPOINT, re-run
   `link_kind='deposit'` with a fresh idem key → assert `FIN_SOURCE_LINK_CONFLICT`.
   Repeat for `link_kind='final'`.

## Collision-check contract

**Read-only collision census completed during Turn 5A.1R; all locked fixture
UUIDs currently have zero collisions across the target tables (`clients`,
`horses`, `lab_horses`, `lab_samples`, `horse_order_types`, `horse_orders`,
`finance_request_idempotency`).**

T1/T2 MUST still repeat pre-insert collision guards at execution time (defence
in depth against namespace drift between authoring and execution):

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.<table> WHERE id = '<UUID>') THEN
    RAISE EXCEPTION 'FIXTURE_UUID_COLLISION: <symbol>';
  END IF;
END $$;
```

If any collision is later detected the outer transaction aborts before mutating
production rows.

## Insert dependency order (transaction-local; reverse for cleanup)

1. `clients` (A)
2. `horses` (B)
3. `horse_ownership` link (REGISTERED ↔ HORSE_A)
4. `lab_horses` (C)
5. `party_horse_links` (C junction rows)
6. `horse_order_types` (E)
7. `horse_orders` (F)
8. `lab_samples` (D)

`ROLLBACK` unwinds all rows regardless of order; the order above matters only
for FK satisfaction during setup.

## Permission-negative architecture (matches File 21 §L)

Inside a per-scenario SAVEPOINT (Actor is Owner; naked call would short-circuit):

1. Look up `tm_id := (SELECT id FROM tenant_members WHERE user_id=<Actor> AND tenant_id=<Primary>)`.
2. `UPDATE tenant_members SET role='foreman' WHERE id=tm_id` (transaction-local demotion).
3. `INSERT INTO member_permissions (tenant_member_id, permission_key, granted, granted_by)
   VALUES (tm_id, '<finance.invoice.create | finance.invoice.approve | finance.payment.create>', false, <Actor>)
   ON CONFLICT (tenant_member_id, permission_key)
   DO UPDATE SET granted = EXCLUDED.granted`.
4. Bind JWT claims for Actor; `SET LOCAL ROLE authenticated`.
5. Call `public.create_source_checkout_invoice(...)` → assert `FIN_PERMISSION_DENIED`.
6. `RESET ROLE`; `ROLLBACK TO SAVEPOINT sp_scenario_N` restores Owner role and
   removes the negative override.

Payment-permission fixture uses `payment_method='cash'` (the only branch that
consults `finance.payment.create`).
