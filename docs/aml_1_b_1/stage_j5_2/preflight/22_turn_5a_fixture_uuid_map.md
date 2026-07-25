# 22 — Turn 5A.1 · Deterministic Fixture UUID Map

Namespace is locked. All UUIDs are v4-shaped, none collide with any current
production row in tenants / clients / horses / lab_horses / lab_samples /
horse_orders / horse_order_types / party_horse_links / payment_accounts / invoices /
finance_request_idempotency (verified by Turn 5A.2 pre-insert existence checks).

Existing production identity (do NOT recreate):

| Purpose              | UUID                                     |
|----------------------|------------------------------------------|
| Fixed Actor          | `98439fe8-6881-4e9e-8ff6-18aca0ce4470`   |
| Fixed Primary Tenant | `145f2128-83ca-4ba8-85b5-8ade245c5530`   |
| Tenant Payment Acct  | resolved at runtime from `payment_accounts` (there is exactly 1 active) |

Deterministic fixture UUIDs (each transaction-local; rolled back):

## A — Clients (tenant = Fixed Primary Tenant)
| Symbol           | UUID                                     | Usage                            |
|------------------|------------------------------------------|----------------------------------|
| CLIENT_REGISTERED| `aaaa1111-0000-4000-8000-000000000001`   | Positive-path invoice client     |
| CLIENT_UNRELATED | `aaaa1111-0000-4000-8000-000000000002`   | Cross-authority negative test    |
| CLIENT_SECONDARY_TENANT | `aaaa1111-0000-4000-8000-000000000003` | (secondary tenant — isolation)  |

## B — Platform Horses (tenant = Primary)
| Symbol                | UUID                                     | Usage                       |
|-----------------------|------------------------------------------|-----------------------------|
| HORSE_A               | `bbbb2222-0000-4000-8000-000000000001`   | Ownership-linked to REGISTERED |
| HORSE_UNLINKED        | `bbbb2222-0000-4000-8000-000000000002`   | Same tenant, no client link |
| HORSE_CROSS_TENANT    | `bbbb2222-0000-4000-8000-000000000003`   | Cross-tenant negative       |

## C — Lab Horses (tenant = Primary)
| Symbol             | UUID                                     | Linkage                          |
|--------------------|------------------------------------------|-----------------------------------|
| LH_LEGACY_CLIENT   | `cccc3333-0000-4000-8000-000000000001`   | `lab_horses.client_id = REGISTERED` |
| LH_JUNCTION_CUSTOMER | `cccc3333-0000-4000-8000-000000000002` | `party_horse_links` `lab_customer` |
| LH_JUNCTION_PAYER  | `cccc3333-0000-4000-8000-000000000003`   | `party_horse_links` `payer`       |
| LH_OWNER_ONLY      | `cccc3333-0000-4000-8000-000000000004`   | junction `owner` — MUST fail T13  |
| LH_TRAINER_ONLY    | `cccc3333-0000-4000-8000-000000000005`   | junction `trainer` — MUST fail T13|
| LH_STABLE_ONLY     | `cccc3333-0000-4000-8000-000000000006`   | junction `stable` — MUST fail T13 |
| LH_UNRELATED       | `cccc3333-0000-4000-8000-000000000007`   | no client + no junction           |
| LH_CROSS_TENANT    | `cccc3333-0000-4000-8000-000000000008`   | tenant = secondary                |

## D — Lab Samples (tenant = Primary; created_by = Actor)
| Symbol                    | UUID                                     | status         | Notes            |
|---------------------------|------------------------------------------|----------------|------------------|
| LS_DRAFT_LEGACY           | `dddd4444-0000-4000-8000-000000000001`   | `draft`        | Deposit fixture  |
| LS_ACCESSIONED_LEGACY     | `dddd4444-0000-4000-8000-000000000002`   | `accessioned`  | Final fixture    |
| LS_COMPLETED_LEGACY       | `dddd4444-0000-4000-8000-000000000003`   | `completed`    | Final fixture    |
| LS_CANCELLED              | `dddd4444-0000-4000-8000-000000000004`   | `cancelled`    | negative         |
| LS_WALKIN_ANON            | `dddd4444-0000-4000-8000-000000000005`   | `draft`        | client_id NULL   |
| LS_DEP_JUNCTION_CUSTOMER  | `dddd4444-0000-4000-8000-000000000006`   | `draft`        | LH_JUNCTION_CUSTOMER |
| LS_FIN_JUNCTION_PAYER     | `dddd4444-0000-4000-8000-000000000007`   | `accessioned`  | LH_JUNCTION_PAYER |
| LS_DEP_OWNER_ONLY         | `dddd4444-0000-4000-8000-000000000008`   | `draft`        | expect trigger reject |
| LS_COEXIST_DEP            | `dddd4444-0000-4000-8000-000000000009`   | `draft`        | Deposit + Final coexistence pair (deposit) |
| LS_COEXIST_FIN            | `dddd4444-0000-4000-8000-00000000000a`   | `accessioned`  | Deposit + Final coexistence pair (final) |
| LS_CROSS_TENANT           | `dddd4444-0000-4000-8000-00000000000b`   | `draft`        | tenant = secondary |

## E — Horse Order Types
| Symbol           | UUID                                     | Notes                        |
|------------------|------------------------------------------|------------------------------|
| HOT_ACTIVE       | `eeee5555-0000-4000-8000-000000000001`   | is_active=true               |

## F — Horse Orders (tenant = Primary; created_by = Actor)
| Symbol                    | UUID                                     | status/cost                    |
|---------------------------|------------------------------------------|---------------------------------|
| HO_COMPLETED_ACTUAL       | `ffff6666-0000-4000-8000-000000000001`   | completed, actual_cost=1000     |
| HO_COMPLETED_ESTIMATE_ONLY| `ffff6666-0000-4000-8000-000000000002`   | completed, estimated_cost=500   |
| HO_DRAFT                  | `ffff6666-0000-4000-8000-000000000003`   | draft → FIN_ORDER_NOT_COMPLETED |
| HO_MISSING_COST           | `ffff6666-0000-4000-8000-000000000004`   | completed, both costs NULL      |
| HO_HORSE_CROSS_TENANT     | `ffff6666-0000-4000-8000-000000000005`   | HORSE_CROSS_TENANT              |

## G — Idempotency keys (outer `p_idempotency_key`)
| Scenario                             | UUID                                     |
|--------------------------------------|------------------------------------------|
| Lab Deposit success                  | `11111111-1111-4111-8111-000000000001`   |
| Lab Deposit replay (same payload)    | `11111111-1111-4111-8111-000000000002`   |
| Lab Deposit conflict (diff payload)  | `11111111-1111-4111-8111-000000000003`   |
| Lab Final success                    | `22222222-2222-4222-8222-000000000001`   |
| Lab Coexistence (final after deposit)| `22222222-2222-4222-8222-000000000002`   |
| Horse Order Final success            | `33333333-3333-4333-8333-000000000001`   |
| Permission-denied paths              | `55555555-5555-4555-8555-000000000001..05` |
| T2 stage keys (per hook)             | `66666666-6666-4666-8666-000000000001..05` |

## Collision-check contract

Every fixture insert in T1/T2 MUST first execute:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.horses WHERE id = '<UUID>') THEN
    RAISE EXCEPTION 'FIXTURE_UUID_COLLISION: <symbol>';
  END IF;
END $$;
```

for each fixture-owned UUID, targeting the appropriate table. If any collision is
detected the outer transaction aborts before mutating a single production row.

## Insert dependency order (transaction-local, then reverse for cleanup)

1. `clients` (A)
2. `horses` (B)
3. `horse_ownership` / owner link between REGISTERED ↔ HORSE_A
4. `lab_horses` (C)
5. `party_horse_links` (C junction rows)
6. `horse_order_types` (E)
7. `horse_orders` (F)
8. `lab_samples` (D)

`ROLLBACK` unwinds all rows regardless of order; the order above matters only
for FK satisfaction during setup.
