# 22 — Turn 5A.1R5F · Deterministic Fixture UUID Map (Corrected)

**ACTIVE FOUNDATION FIXTURES = 10. SECONDARY TENANT IS CONTEXT-ONLY. NO SECONDARY-TENANT SOURCE FIXTURE IS ACTIVE.**

Namespace is locked. All UUIDs are v4-shaped. A read-only collision census was
executed against every fixture-owned UUID and its target table during Turn 5A.1R
(see §Collision census below). Turn 5A.1R5E retires `CLIENT_SECONDARY_TENANT`
and `LS_CROSS_TENANT_CLIENT` from the executable fixture namespace after the
Turn 5A.1R5 reachability proof.


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

**Retired before SQL authoring (Turn 5A.1R5E):**

| Symbol                  | UUID                                     | Reason                                                                                                                                              |
|-------------------------|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| CLIENT_SECONDARY_TENANT | `aaaa1111-0000-4000-8000-000000000003`   | Never inserted. The required cross-Tenant Client↔Source relationship is blocked by active production Triggers (`validate_lab_sample_trigger`, `validate_horse_order_tenant_trigger`) BEFORE Source Checkout is called. UUID reserved-not-reusable. |

Secondary-Tenant context (for `T1-A-04 FIN_TENANT_ACCESS_DENIED` and Tenant-isolation
assertions) is resolved at runtime from `tenant_members` (any tenant Actor is NOT
a member of); no Secondary-Tenant Client fixture is required or authored.


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
| LS_ACCESSIONED_LEGACY     | `dddd4444-0000-4000-8000-000000000002`   | `accessioned`  | Deposit-positive **and** final-negative fixture (`accessioned` → `FIN_LAB_FINAL_STATUS_INVALID`); `lab_horse_id = LH_LEGACY_CLIENT` (backs T1-P-07 T14 legacy-client accept) |
| LS_COMPLETED_LEGACY       | `dddd4444-0000-4000-8000-000000000003`   | `completed`    | Final-positive fixture                                                                       |
| LS_PROCESSING             | `dddd4444-0000-4000-8000-000000000004`   | `processing`   | Deposit-negative (`processing` → `FIN_LAB_DEPOSIT_STATUS_INVALID`) and final-negative (`FIN_LAB_FINAL_STATUS_INVALID`) |
| LS_CANCELLED              | `dddd4444-0000-4000-8000-000000000005`   | `cancelled`    | Always `FIN_SOURCE_CANCELLED` (fires before status gates)                                    |
| LS_WALKIN_ANON            | `dddd4444-0000-4000-8000-000000000006`   | `draft`        | `client_id` NULL — exercises payload `client_name` path                                      |
| LS_WALKIN_LONG_NAME       | `dddd4444-0000-4000-8000-000000000007`   | `draft`        | `client_id` NULL — exercises `FIN_CLIENT_NAME_TOO_LONG` (201 char payload)                   |
| LS_DEP_JUNCTION_CUSTOMER  | `dddd4444-0000-4000-8000-000000000008`   | `draft`        | Uses LH_JUNCTION_CUSTOMER — validates trigger acceptance                                     |
| LS_FIN_JUNCTION_PAYER     | `dddd4444-0000-4000-8000-000000000009`   | `completed`    | Uses LH_JUNCTION_PAYER — validates trigger acceptance                                        |
| LS_DEP_OWNER_ONLY         | `dddd4444-0000-4000-8000-00000000000a`   | `draft`        | Uses LH_OWNER_ONLY — expects trigger `Lab horse … is not linked` (SQLSTATE 42501)            |
| **LS_COEXIST**            | `dddd4444-0000-4000-8000-00000000000b`   | `accessioned`  | **Single-source Deposit → Final coexistence fixture** (see §Coexistence lifecycle below)     |
| ~~LS_CROSS_TENANT_CLIENT~~| `dddd4444-0000-4000-8000-00000000000c`   | —              | **RETIRED (Turn 5A.1R5E)** — never inserted. `FIN_SOURCE_CLIENT_CROSS_TENANT` is Category D per File 23 row 41. UUID reserved-not-reusable. |
| ~~LS_SECONDARY_TENANT~~   | `dddd4444-0000-4000-8000-00000000000d`   | —              | **RETIRED (Turn 5A.1R5F)** — never inserted. No executable Scenario requires an inserted Secondary-Tenant Sample. T1-A-04 fails at Tenant-membership before Source lookup and uses only a Secondary-Tenant ID resolved at runtime. T1-A-27 uses the Reserved Missing-ID Registry (§D.2), not a Fixture. UUID reserved-not-reusable. |
| LS_ZERO_PRICE             | `dddd4444-0000-4000-8000-00000000000e`   | `draft`        | Fixture for `FIN_CHECKOUT_TOTAL_INVALID` via `unit_price=0` accepted at item gate            |

### D.2 — Reserved Missing-ID Registry (never inserted)

Valid UUID-shaped identifiers guaranteed absent from the target table. Used only
for not-found absence tests. NOT Fixtures. NOT part of active Fixture count,
dependency order, or Fixture collision census. Turn 5A.2.a Retry must assert
absence from `public.lab_samples` before executing T1-A-27.

| Symbol                  | UUID                                     | Absence table         | Consumer  |
|-------------------------|------------------------------------------|-----------------------|-----------|
| MISSING_LAB_SAMPLE_ID   | `deadbeef-0000-4000-8000-000000000027`   | `public.lab_samples`  | T1-A-27   |

There is exactly ONE coexistence sample. Deposit and Final MUST run against the
same `source_id`; File 22 no longer allocates separate deposit / final source
UUIDs for coexistence.

### D.1 — Turn-5A.2.a Foundation subset (Turn 5A.1R5E lock)

The Turn 5A.2.a Retry inserts EXACTLY the following 10 fixture rows (no more,
no less; zero RPC calls in that sub-turn). Junction/cross-tenant/anon samples
in §D above belong to Turn 5A.3 fixture setup and MUST NOT be inserted by
Turn 5A.2.a.

| Layer | Symbol                   | UUID                                     |
|-------|--------------------------|------------------------------------------|
| 1     | CLIENT_REGISTERED        | `aaaa1111-0000-4000-8000-000000000001`   |
| 2     | LH_LEGACY_CLIENT         | `cccc3333-0000-4000-8000-000000000001`   |
| 3     | LS_DRAFT_LEGACY          | `dddd4444-0000-4000-8000-000000000001`   |
| 3     | LS_ACCESSIONED_LEGACY    | `dddd4444-0000-4000-8000-000000000002`   |
| 3     | LS_COMPLETED_LEGACY      | `dddd4444-0000-4000-8000-000000000003`   |
| 3     | LS_PROCESSING            | `dddd4444-0000-4000-8000-000000000004`   |
| 3     | LS_CANCELLED             | `dddd4444-0000-4000-8000-000000000005`   |
| 3     | LS_WALKIN_LONG_NAME      | `dddd4444-0000-4000-8000-000000000007`   |
| 3     | LS_COEXIST               | `dddd4444-0000-4000-8000-00000000000b`   |
| 3     | LS_ZERO_PRICE            | `dddd4444-0000-4000-8000-00000000000e`   |

Turn-5A.2.a Foundation totals: Clients = 1; Lab Horses = 1; Lab Samples = 8;
**Total = 10**. Insertion order: (1) CLIENT_REGISTERED → (2) LH_LEGACY_CLIENT
→ (3) all eight Primary-Tenant Lab Samples. No Secondary-Tenant Client insertion.



## E — Horse Order Types

| Symbol            | UUID                                     | Notes                              |
|-------------------|------------------------------------------|-------------------------------------|
| HOT_ACTIVE        | `eeee5555-0000-4000-8000-000000000001`   | `is_active=true`                    |

Withdrawn (Turn 5A.1R3): `HOT_TO_DELETE` (`eeee5555-0000-4000-8000-000000000002`)
is REMOVED from the executable fixture namespace. `FIN_ORDER_TYPE_NOT_FOUND`
is Category D in File 23 §1 (row 40): `horse_orders.order_type_id` is
NOT NULL and the FK uses `ON DELETE RESTRICT`, so the "delete order-type
inside scenario" path is blocked. Do NOT insert or delete this symbol; no
collision-check entry is required.

## F — Horse Orders (tenant = Primary; created_by = Actor)

| Symbol                    | UUID                                     | status / cost                                    |
|---------------------------|------------------------------------------|---------------------------------------------------|
| HO_COMPLETED_ACTUAL       | `ffff6666-0000-4000-8000-000000000001`   | `completed`, `actual_cost=1000`                   |
| HO_COMPLETED_ESTIMATE_ONLY| `ffff6666-0000-4000-8000-000000000002`   | `completed`, `estimated_cost=500`                 |
| HO_DRAFT                  | `ffff6666-0000-4000-8000-000000000003`   | `draft` → `FIN_ORDER_NOT_COMPLETED`               |
| HO_MISSING_COST           | `ffff6666-0000-4000-8000-000000000004`   | `completed`, both costs NULL → `FIN_ORDER_MISSING_COST` |
| HO_HORSE_CROSS_TENANT     | `ffff6666-0000-4000-8000-000000000005`   | `completed`, `horse_id=HORSE_CROSS_TENANT` → `FIN_ORDER_HORSE_NOT_FOUND` |
| HO_CANCELLED              | `ffff6666-0000-4000-8000-000000000007`   | `cancelled` → `FIN_SOURCE_CANCELLED`              |

Withdrawn (Turn 5A.1R3): `HO_ORDER_TYPE_MISSING`
(`ffff6666-0000-4000-8000-000000000006`) is REMOVED from the executable
fixture namespace along with `HOT_TO_DELETE`. See §E note.

## G — Idempotency keys (outer `p_idempotency_key`) — legacy ranges

The broad namespace ranges below remain reserved for readability. **The
authoritative binding is §H "Exact Idempotency UUID assignment" — every
executable Scenario/Chain call resolves to one of the exact UUIDs listed
there.** Do not derive UUIDs from the ranges alone.

| Namespace                                     | UUID range                                   |
|-----------------------------------------------|-----------------------------------------------|
| Payload validation + Lab Deposit success      | `11111111-1111-4111-8111-000000000001..040`   |
| Lab Final standalone success                  | `22222222-2222-4222-8222-000000000001`        |
| Lab Coexistence (Chain C2) deposit/final      | `22222222-2222-4222-8222-000000000002..003`   |
| Horse Order Final success + negatives         | `33333333-3333-4333-8333-000000000001..010`   |
| Duplicate active source-link (fresh keys)     | `44444444-4444-4444-8444-000000000001..003`   |
| Permission-denied paths                       | `55555555-5555-4555-8555-000000000001..005`   |
| Trigger positive/negative + T14–T16 accepts   | `55555555-5555-4555-8555-000000000006..010`   |
| T2 stage keys (per hook + inert-success)      | `66666666-6666-4666-8666-000000000001..005`   |

## H — Exact Idempotency UUID assignment (Turn 5A.1R5E lock)

Every executable T1 Scenario or Scenario-Chain call is bound to exactly one
UUID below. Intentional sharing is called out in the `Shared with` column and
occurs ONLY inside Chain C1 (same-key replay + same-key/changed-payload
conflict, per contract). Duplicate Source-Link scenarios (C2 dup-deposit /
dup-final) use FRESH keys so `_finance_idempotency_begin` does not intercept
them before `_finance_billing_link_upsert` fires
`FIN_SOURCE_LINK_CONFLICT`. No T1 UUID overlaps any T2 stage UUID
(`66666666-…`). Every UUID is still collision-checked at execution against
`finance_request_idempotency` (per §Collision-check contract).

The `T1-A-32` executable key `11111111-1111-4111-8111-000000000035` (Decimal
N+3 for N=32) is RESERVED-NOT-EXECUTABLE and MUST NOT be consumed by any other
Scenario, fixture insert, or execution-time collision guard. See §H.2 below.

| Scenario ID                        | Chain            | Symbol                 | Exact UUID                                     | Shared with          | Reason for sharing / freshness           | Source fixture                     | Expected use                        |
|------------------------------------|------------------|------------------------|------------------------------------------------|----------------------|-------------------------------------------|-------------------------------------|-------------------------------------|
| T1-A-01..A-31, A-33 (A-32 retired) | independent      | `K-PAYLOAD-*`          | Derived per §H.1 — `11111111-1111-4111-8111-<lpad(N+3,12,'0')>` (skip N=32) | — | unique per call                           | LS_ACCESSIONED_LEGACY (as-needed)   | payload/status/item validation      |

| T1-P-01       | C1               | `K-C1-BASE`            | `11111111-1111-4111-8111-000000000001`         | T1-P-06, T1-A-40     | C1 replay/conflict reuse this key         | LS_ACCESSIONED_LEGACY               | base Lab Deposit success            |
| T1-P-06       | C1               | `K-C1-BASE` (reuse)    | `11111111-1111-4111-8111-000000000001`         | T1-P-01              | same-key + same-payload replay            | LS_ACCESSIONED_LEGACY               | replay → stored_response returned   |
| T1-A-40       | C1               | `K-C1-BASE` (reuse)    | `11111111-1111-4111-8111-000000000001`         | T1-P-01              | same-key + changed `notes` payload        | LS_ACCESSIONED_LEGACY               | → `FIN_IDEMPOTENCY_CONFLICT`        |
| T1-P-02       | independent      | `K-LAB-FIN-STANDALONE` | `22222222-2222-4222-8222-000000000001`         | —                    | unique                                    | LS_COMPLETED_LEGACY                 | Lab Final standalone success        |
| T1-P-03       | C2               | `K-C2-DEP`             | `22222222-2222-4222-8222-000000000002`         | —                    | unique                                    | LS_COEXIST                          | C2 Deposit                          |
| T1-P-04       | C2               | `K-C2-FIN`             | `22222222-2222-4222-8222-000000000003`         | —                    | unique (different link_kind, same source) | LS_COEXIST                          | C2 Final                            |
| T1-A-34       | C2               | `K-C2-DUP-DEP`         | `44444444-4444-4444-8444-000000000001`         | —                    | FRESH — bypass idempotency, reach link conflict | LS_COEXIST                    | duplicate Deposit → `FIN_SOURCE_LINK_CONFLICT` |
| T1-A-42 (NEW) | C2               | `K-C2-DUP-FIN`         | `44444444-4444-4444-8444-000000000002`         | —                    | FRESH — bypass idempotency, reach link conflict | LS_COEXIST                    | duplicate Final → `FIN_SOURCE_LINK_CONFLICT`   |
| T1-A-35..A-39 | independent      | `K-HO-NEG-01..05`      | `33333333-3333-4333-8333-000000000002..006`    | —                    | unique                                    | HO_* negative fixtures              | horse-order negatives               |
| T1-P-05       | independent      | `K-HO-FIN-P`           | `33333333-3333-4333-8333-000000000001`         | —                    | unique                                    | HO_COMPLETED_ACTUAL                 | Horse Order Final success           |
| T1-B-01       | independent      | `K-PERM-CREATE`        | `55555555-5555-4555-8555-000000000001`         | —                    | unique                                    | LS_ACCESSIONED_LEGACY               | invoice.create denial               |
| T1-B-02       | independent      | `K-PERM-APPROVE`       | `55555555-5555-4555-8555-000000000002`         | —                    | unique (Create explicitly allowed)        | LS_ACCESSIONED_LEGACY               | invoice.approve denial              |
| T1-B-03       | independent      | `K-PERM-PAYMENT`       | `55555555-5555-4555-8555-000000000003`         | —                    | unique (Create+Approve allowed)           | LS_ACCESSIONED_LEGACY               | payment.create denial (cash path)   |
| T1-B-04       | independent      | `K-NOACCT`             | `55555555-5555-4555-8555-000000000004`         | —                    | unique                                    | LS_ACCESSIONED_LEGACY               | payment-account absence             |
| T1-P-07       | independent      | `K-TRIG-T14`           | `55555555-5555-4555-8555-000000000006`         | —                    | unique                                    | LS_ACCESSIONED_LEGACY (backed by LH_LEGACY_CLIENT — T14 legacy-client accept) | trigger accept |
| T1-P-08       | independent      | `K-TRIG-T15`           | `55555555-5555-4555-8555-000000000007`         | —                    | unique                                    | LS_DEP_JUNCTION_CUSTOMER            | trigger `lab_customer` accept       |
| T1-P-09       | independent      | `K-TRIG-T16`           | `55555555-5555-4555-8555-000000000008`         | —                    | unique                                    | LS_FIN_JUNCTION_PAYER (link_kind=`final`; fixture status = `completed`) | trigger `payer` accept |
| T1-A-41       | independent      | `K-TRIG-T13`           | `55555555-5555-4555-8555-000000000009`         | —                    | unique                                    | LS_DEP_OWNER_ONLY                   | trigger owner-only reject           |

### H.1 Exact T1-A-01..A-33 Idempotency derivation (Turn 5A.1R5E lock — Option B)

The `T1-A-*` range row in the table above is an authoring aid. The
authoritative binding for each individual Scenario is the following
deterministic derivation (Option B in File-17 language):

```
For each N in 1..33 (SKIP N=32 — retired at Turn 5A.1R5E):
  suffix_decimal := N + 3
  suffix_string  := lpad(suffix_decimal::text, 12, '0')   -- 12 decimal digits
  idem_uuid      := '11111111-1111-4111-8111-' || suffix_string
```

Worked examples (must match at authoring and execution time):

| Scenario | N  | N+3 | Suffix (12 digits) | Exact Idempotency UUID                       |
|----------|----|-----|--------------------|-----------------------------------------------|
| T1-A-01  | 1  | 4   | `000000000004`     | `11111111-1111-4111-8111-000000000004`        |
| T1-A-02  | 2  | 5   | `000000000005`     | `11111111-1111-4111-8111-000000000005`        |
| T1-A-09  | 9  | 12  | `000000000012`     | `11111111-1111-4111-8111-000000000012`        |
| T1-A-10  | 10 | 13  | `000000000013`     | `11111111-1111-4111-8111-000000000013`        |
| ~~T1-A-32~~ | 32 | 35 | `000000000035`   | `11111111-1111-4111-8111-000000000035` — **RESERVED, NOT EXECUTED** |
| T1-A-33  | 33 | 36  | `000000000036`     | `11111111-1111-4111-8111-000000000036`        |

Static assertion plan (to be embedded in the T1 fixture-setup DO block
authored in Turn 5A.2.b):

1. Generate all **32** derived UUIDs for executable N ∈ {1..31, 33}.
2. Assert every string parses as a valid `uuid` (implicit cast).
3. Assert `count(distinct) = 32` — no internal duplicates.
4. Assert zero overlap with the reserved keys used elsewhere:
   - C1: `11111111-…-000000000001`.
   - C2 deposit/final: `22222222-…-000000000002`, `22222222-…-000000000003`.
   - C2 duplicate probes: `44444444-…-000000000001`, `44444444-…-000000000002`.
   - Lab Final standalone: `22222222-…-000000000001`.
   - Horse Order success + negatives: `33333333-…-000000000001..006`.
   - Permission + trigger: `55555555-…-000000000001..009`.
   - T2 stage keys: `66666666-…-000000000001..005`.
   - **Retired T1-A-32 reserved key `11111111-…-000000000035`** — assert it
     does NOT appear in the executable key set.
5. Execution-time collision guard against `finance_request_idempotency`
   remains mandatory per the "Collision-check contract" below (defence in
   depth against namespace drift between authoring and execution). The
   retired A-32 key is NOT checked at execution time (it is never used).

Range notation is retained above ONLY as a namespace reservation hint. The
derivation in this §H.1 is the sole authoritative source for the 32 exact
executable UUIDs.

### H.2 Retired executable Scenario registry (Turn 5A.1R5E)

| Scenario | Reserved Idempotency UUID (Decimal N+3)         | Executable | Reusable | Reassigned |
|----------|--------------------------------------------------|------------|----------|------------|
| T1-A-32  | `11111111-1111-4111-8111-000000000035`           | No         | No       | No         |

Reason: `FIN_SOURCE_CLIENT_CROSS_TENANT` reclassified Category D in File 23
row 41. Scenario IDs `T1-A-33`, `T1-A-34`, `T1-A-40`, `T1-A-42`, all positive
Scenarios, and all T2 keys MUST NOT be renumbered.



Rules recap (locked):

1. Independent calls receive unique UUIDs.
2. Same-key/same-payload replay reuses the original base call's UUID.
3. Same-key/changed-payload conflict reuses the original base call's UUID.
4. Duplicate Source-Link conflict uses a FRESH UUID (idempotency must not intercept).
5. Deposit and Final on the same Sample use DIFFERENT UUIDs.
6. Duplicate Deposit and duplicate Final each use a FRESH, separate UUID.
7. No T1 UUID overlaps a T2 stage UUID.
8. Every UUID is collision-checked at execution time.

## I — Scenario-Chain SAVEPOINT names (Turn 5A.1R3 lock)

Dependent-scenario chains share ONE Group SAVEPOINT. No rollback occurs
between dependent calls; one final `ROLLBACK TO SAVEPOINT <group>` restores
the whole chain.

### Chain C1 — `sp_chain_lab_replay`  (Lab Deposit success → replay → conflict)

1. T1-P-01 — execute base Lab Deposit (idem `K-C1-BASE`).
2. Assert persisted Invoice/Items/Ledger/Links; capture the 17-key response.
3. T1-P-06 — re-invoke with same `K-C1-BASE` and byte-equivalent payload;
   assert `stored_response` returned unchanged; assert Δrows = 0.
4. T1-A-40 — re-invoke with same `K-C1-BASE` and changed `notes`; assert
   `FIN_IDEMPOTENCY_CONFLICT` (SQLSTATE 23514); assert Δrows = 0.
5. `ROLLBACK TO SAVEPOINT sp_chain_lab_replay`.

### Chain C2 — `sp_chain_lab_coexistence`  (single-sample Deposit → dup Deposit → status transitions → Final → dup Final)

Reachability lock (Turn 5A.1R4): the installed RPC validates Source status
BEFORE the same-kind Source-Link conflict guard (see §Live validation order
below). Therefore duplicate Deposit MUST run while the Sample is still in a
Deposit-eligible status (`accessioned`), and duplicate Final MUST run while
the Sample is `completed`. Reordered accordingly.

1. `LS_COEXIST` starts `accessioned`.
2. T1-P-03 — Deposit (idem `K-C2-DEP`); assert exactly one active Deposit
   link, exactly one Deposit invoice, and the expected invoice / item /
   ledger / payment rows.
3. T1-A-34 — while the Sample is STILL `accessioned`, duplicate Deposit with
   FRESH `K-C2-DUP-DEP`; assert `FIN_SOURCE_LINK_CONFLICT` (SQLSTATE 23514);
   assert no new invoice, no new item, no new ledger row, no new billing
   link; original Deposit remains unchanged.
4. Privileged `UPDATE lab_samples SET status='processing' WHERE id=<LS_COEXIST>`.
5. Privileged `UPDATE lab_samples SET status='completed'  WHERE id=<LS_COEXIST>`.
6. T1-P-04 — Final (idem `K-C2-FIN`); assert one active Deposit link retained,
   one active Final link created, distinct Deposit and Final invoice IDs, and
   no rewrite of the Deposit link.
7. T1-A-42 — while the Sample remains `completed`, duplicate Final with FRESH
   `K-C2-DUP-FIN`; assert `FIN_SOURCE_LINK_CONFLICT` (SQLSTATE 23514); assert
   no new financial rows; original Final remains unchanged.
8. Assert final C2 terminal state (one active Deposit link + one active Final
   link, two distinct invoices) inside the Group SAVEPOINT.
9. `ROLLBACK TO SAVEPOINT sp_chain_lab_coexistence` (single, final rollback);
   assert zero residue against the pre-chain baseline.

## Live validation order (Turn 5A.1R4 lock)

The installed `public.create_source_checkout_invoice` executes:

```
Outer Idempotency Begin
  → Source Lock
  → Source Row Load
  → Source Status Validation
  → Active Same-Kind Source-Link Conflict Guard
  → Invoice Creation
```

Consequences:

- Duplicate-Deposit conflict testing MUST occur while the Source is still in a
  Deposit-eligible status (`draft` or `accessioned` for `lab_sample`).
- Duplicate-Final conflict testing MUST occur after the Source reaches a
  Final-eligible status (`completed` for `lab_sample`).
- A `completed` sample CANNOT be used to reach the Deposit Source-Link conflict
  because `FIN_LAB_DEPOSIT_STATUS_INVALID` fires first.
- The same-kind Source-Link conflict guard does NOT precede Source status
  validation. Any prescription that ordered it earlier is withdrawn.

## Coexistence lifecycle (single-source Deposit → Final proof)

Single sample `LS_COEXIST` (initial status `accessioned`). Executed inside the
single Group SAVEPOINT `sp_chain_lab_coexistence`; no rollback occurs between
dependent calls.

1. Fixture insert with `status='accessioned'` and `client_id=CLIENT_REGISTERED`.
2. T1-P-03 — Call RPC with `link_kind='deposit'` and idem key
   `22222222-2222-4222-8222-000000000002` → asserts one new invoice + one
   `billing_links` row with `link_kind='deposit'`.
3. T1-A-34 — while `LS_COEXIST.status` is STILL `accessioned`, call RPC with
   `link_kind='deposit'` and FRESH idem key
   `44444444-4444-4444-8444-000000000001` → asserts
   `FIN_SOURCE_LINK_CONFLICT`; asserts no additional financial rows.
4. Privileged status transition inside the same outer transaction:
   `UPDATE lab_samples SET status='processing' WHERE id=<LS_COEXIST>`.
5. Privileged status transition:
   `UPDATE lab_samples SET status='completed' WHERE id=<LS_COEXIST>`.
6. T1-P-04 — Call RPC with `link_kind='final'` and idem key
   `22222222-2222-4222-8222-000000000003` → asserts a second invoice + one
   `billing_links` row with `link_kind='final'`.
7. T1-A-42 — while `LS_COEXIST.status` remains `completed`, call RPC with
   `link_kind='final'` and FRESH idem key
   `44444444-4444-4444-8444-000000000002` → asserts
   `FIN_SOURCE_LINK_CONFLICT`; asserts no additional financial rows.
8. Assert: exactly one active `deposit` link and exactly one active `final`
   link for `(tenant_id, source_type='lab_sample', source_id=LS_COEXIST)`;
   two distinct invoice rows.
9. Single final `ROLLBACK TO SAVEPOINT sp_chain_lab_coexistence` proves zero
   residue against the pre-chain baseline.

Do NOT use separate independent SAVEPOINTs for the duplicate probes: doing so
would remove the prerequisite Deposit or Final row and the conflict guard
could never fire.

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

Inside a per-scenario SAVEPOINT (Actor is Owner; naked call would short-circuit
because `has_permission` returns `true` for role `owner`):

1. Look up `tm_id := (SELECT id FROM tenant_members WHERE user_id=<Actor> AND tenant_id=<Primary>)`.
2. `UPDATE tenant_members SET role='foreman' WHERE id=tm_id` (transaction-local demotion).
3. Apply the exact per-scenario permission shape below via `INSERT INTO
   member_permissions … ON CONFLICT (tenant_member_id, permission_key) DO
   UPDATE SET granted = EXCLUDED.granted` (transaction-local override).
4. Bind JWT claims for Actor; `SET LOCAL ROLE authenticated`.
5. Call `public.create_source_checkout_invoice(...)` → assert
   `FIN_PERMISSION_DENIED` for the intended key.
6. `RESET ROLE`; `ROLLBACK TO SAVEPOINT sp_scenario_N` restores Owner role and
   removes the negative override.

### Per-scenario prerequisite gates (Turn 5A.1R3 lock)

`foreman` does not inherit every finance permission. To prove each denial
reaches the *intended* gate rather than failing at an earlier check, each
scenario must explicitly seed the prerequisites shown below.

| Scenario | payment_method | `finance.invoice.create` | `finance.invoice.approve` | `finance.payment.create` | Notes                                                                              |
|----------|----------------|--------------------------|---------------------------|--------------------------|------------------------------------------------------------------------------------|
| T1-B-01  | cash           | **false**                | (irrelevant)              | (irrelevant)             | Create is checked first — no later permissions matter.                             |
| T1-B-02  | debt           | **true (explicit)**      | **false**                 | (not checked on debt)    | Use debt to avoid triggering the earlier payment-permission failure.               |
| T1-B-03  | cash           | **true (explicit)**      | **true (explicit)**       | **false**                | Cash is the representative non-debt method used to reach the payment gate.         |

### Payment-permission consultation (correction)

`finance.payment.create` is consulted for **every non-debt** `payment_method`
— that is, `cash`, `card`, AND `transfer`. Cash is only the *representative*
method chosen for T1-B-03; it is NOT the sole branch that consults the
permission. The `debt` branch does not consult `finance.payment.create`.
