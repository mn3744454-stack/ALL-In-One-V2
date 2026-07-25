# 21 — Turn 5A.1 · Live Test Contract & Fixture Architecture Lock

Verdict: **TURN 5A.1 COMPLETE — CONTRACTS LOCKED FOR TURN 5A.2**

This file is preflight/test-contract evidence. It is not final Mini Documentation.
It supersedes and locks the contracts required to author complete self-contained
T1/T2 SQL suites in Turns 5A.2–5A.4.

---

## A. Production preflight (2026-07-25)

| Object                                                | Live canonical POSIX SHA-256                                       | Expected                                                          | Match |
|-------------------------------------------------------|--------------------------------------------------------------------|-------------------------------------------------------------------|-------|
| `_finance_source_checkout_apply_trace(uuid,uuid,text,uuid)` | `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f` | `7cecabbd…44692f` | ✅ |
| `create_source_checkout_invoice(uuid,uuid,jsonb)`     | `f0152e6fd55d2c64da6dea5fed505475a38c527690e006cb1a2b670305901c4f` | `f0152e6f…01c4f` | ✅ |
| `_invoice_items_validate_source()`                    | `f2d413d81b9dbd4577d142ec25e6b3b44b6a265c297b5bac1ad4d5b8eb8c45f0` | `f2d413d8…45f0` | ✅ |

Payment routing: 9 tenants, 9 active routing accounts (1 per tenant, no duplicates).
Fixed Primary Tenant `145f2128…5530` has 1 active account.
Auto-provisioning trigger `trg_tenants_provision_payment_account` is enabled
(pg_trigger.tgenabled = 'O').

Fixed Actor `98439fe8…4470` is `active` `tenant_members` in the Primary Tenant.

Frontend Turn-4A baseline files present and un-drifted: `src/lib/finance/invoiceRpc.ts`,
`src/components/pos/EmbeddedCheckout.tsx`, `src/components/laboratory/SampleCard.tsx`,
`src/components/laboratory/CreateSampleDialog.tsx`,
`src/components/horses/orders/OrderCard.tsx`,
`src/hooks/finance/useInvoiceCustomerHorses.ts`.

**Preflight passes. No production drift.**

---

## B. Skill application

- Selected: 03, 04, 06, 07, 08, 19, 23, 25, 26.
- Selected / No-op Evidence: 05 (no RLS change authored), 10 (UX frozen),
  12 (no translation change).
- Excluded: production behavior change, Retail POS, Draft Invoice recovery,
  unrelated Source adapters, Phases N+2–N+4.

---

## C. File-17 correction

See revised `docs/aml_1_b_1/stage_j5_1/preflight/17_authenticated_jwt_convention.md`.
Corrections:

1. `:'…'` psql interpolation removed from inside all dollar-quoted PL/pgSQL blocks.
2. Identity now materialized into a top-level `TEMP TABLE test_context` and read
   via `pg_temp.test_context`.
3. `SET LOCAL ROLE authenticated` narrowed to a per-scenario window; privileged
   fixture setup and privileged persistence assertions run as the session role.
4. Qualified-runner responsibilities narrowed: runner binds `-v` vars and executes
   the file unchanged; no fixture provisioning, no UUID substitution, no patching.
5. Evidence classifications tightened (`AUTHORED` requires complete executable SQL —
   labels do not qualify).

---

## D. Live functions inspected

- `public.create_source_checkout_invoice(uuid, uuid, jsonb)`
- `public._finance_source_checkout_apply_trace(uuid, uuid, text, uuid)`
- `public._invoice_items_validate_source()` (trigger)
- `public.create_invoice_with_items(uuid, uuid, jsonb)`
- `public.approve_invoice(uuid, uuid, uuid)`
- `public.cancel_invoice(uuid, uuid, uuid, date, text)`
- `public.post_payment(uuid, uuid, uuid, numeric, date, text, uuid, jsonb)`
- `public._finance_billing_link_upsert(uuid, text, uuid, uuid, text, numeric, uuid, uuid)`
- `public._finance_idempotency_begin(uuid, text, uuid, uuid, jsonb, jsonb)`
- `public._finance_idempotency_complete(uuid, text, uuid, uuid, bytea, jsonb, jsonb)`
- `public._finance_source_lock_key(uuid, text, uuid)`
- `public.is_active_tenant_member(uuid, uuid)`
- `public.has_permission(uuid, uuid, text)`

All are `SECURITY DEFINER`, owner `postgres`, `search_path=""` except
`_invoice_items_validate_source` (`search_path='public'` — trigger body).

---

## E. Live schema tables inspected

`tenants`, `tenant_members`, `clients`, `horses`, `horse_ownership`,
`horse_owners`, `lab_horses`, `party_horse_links`, `lab_samples`,
`horse_order_types`, `horse_orders`, `payment_accounts`, `invoices`,
`invoice_items`, `ledger_entries`, `billing_links`, `customer_balances`,
`finance_request_idempotency`, `tenant_service_categories`, `tenant_services`,
`lab_services`, `stable_service_plans`, `boarding_admissions`.

Column snapshots for the primary fixture surfaces are captured in
`/tmp/j51/*.txt` (session artifact; not committed) and re-derivable via `\d` in
Turn 5A.2.

---

## F. Corrected table-name findings

| Guessed name       | Exists? | Actual replacement                                   |
|--------------------|---------|-------------------------------------------------------|
| `party_horses`     | ❌      | `public.party_horse_links` (columns: `tenant_id, client_id, lab_horse_id, relationship_type, is_primary, created_by`) |
| `lab_customers`    | ❌      | Represented as `party_horse_links.relationship_type = 'lab_customer'` (no separate table) |
| `lab_horse_orders` | ❌      | `public.horse_orders` (no lab-specific variant)      |

`horse_orders.client_id` is nullable; horse_id is `NOT NULL` at the schema level,
so `FIN_ORDER_MISSING_HORSE` is only reachable if the row is scrubbed via a
transaction-local `UPDATE` from a session-role SAVEPOINT that skips the FK check
via `SET LOCAL session_replication_role='replica'`. Turn 5A.3 will skip that
scenario as non-executable and rely on static review.

---

## G. Error-token reconciliation

Full matrix in `23_turn_5a_error_token_matrix.md`.

Key correction: the RPC emits `FIN_SOURCE_TYPE_INVALID` (NOT `_UNSUPPORTED`).
Additional tokens present in the live body that were absent from the Turn-5
scaffold: `FIN_CHECKOUT_DEBT_HAS_PAYMENT_RECEIVED_AT`,
`FIN_CHECKOUT_DEBT_PAYMENT_METHOD_INVALID`, `FIN_CHECKOUT_DEBT_STATE_INVALID`,
`FIN_CHECKOUT_DEBT_STATUS_INVALID`, `FIN_CHECKOUT_NOT_FULLY_PAID`,
`FIN_CHECKOUT_PAYMENT_METHOD_MISMATCH`, `FIN_CHECKOUT_PAYMENT_RECEIVED_AT_MISSING`,
`FIN_CHECKOUT_TOTAL_INVALID`, `FIN_CLIENT_NAME_TOO_LONG`, `FIN_NOTES_TOO_LONG`,
`FIN_NESTED_CREATE_NO_INVOICE_ID`, `FIN_SOURCE_LINK_UPSERT_FAILED`,
`FIN_TENANT_PAYMENT_ACCOUNT_MISSING`, `FIN_TENANT_ACCESS_DENIED`,
`FIN_UNAUTHENTICATED`, `FIN_BAD_ARGS`.

The trigger `_invoice_items_validate_source` raises message-string exceptions,
not `FIN_*` tokens. T1 assertions on trigger-driven failures MUST compare
`SQLSTATE` (`22023`/`23503`/`42501`) plus a message substring.

---

## H. Source resolution contract

### H.1 Laboratory Sample (`public.lab_samples`)
- tenant: `tenant_id` (NOT NULL)
- registered client: `client_id` (nullable — walk-in path)
- walk-in name: `client_name`, `client_phone`, `client_email`
- platform horse: `horse_id`
- lab horse: `lab_horse_id`
- status: `status` (`draft`, `accessioned`, `processing`, `completed`, `cancelled`, …)
- Deposit-eligible: `draft` (RPC rejects all others via
  `FIN_LAB_DEPOSIT_STATUS_INVALID` / `FIN_SOURCE_CANCELLED`).
- Final-eligible: `accessioned` / `completed` (RPC rejects others via
  `FIN_LAB_FINAL_STATUS_INVALID` / `FIN_SOURCE_CANCELLED`).
- Locking: `_finance_source_lock_key(tenant, 'lab_sample', source_id)` advisory
  xact lock; duplicate `deposit` for the same source is rejected with
  `FIN_SOURCE_LINK_CONFLICT`.
- Client precedence: `lab_samples.client_id` wins; walk-in only when NULL.
- Horse precedence: `lab_horse_id` (Migration B authority) wins; `horse_id`
  used only for platform-horse invoices.
- Caller `items`: allowed on Lab paths (RPC accepts caller items or synthesizes
  from lab_request_services when items empty).

### H.2 Horse Order (`public.horse_orders`)
- tenant: `tenant_id`
- client: `client_id` (nullable)
- horse: `horse_id` (NOT NULL)
- order type: `order_type_id`
- status: `status` (only `completed` accepted → `FIN_ORDER_NOT_COMPLETED`)
- cost precedence: `actual_cost` when non-null; else `estimated_cost`;
  else `FIN_ORDER_MISSING_COST`.
- description: derived from `horse_order_types.name` and free-text `notes`.
- caller items: **forbidden** → `FIN_HORSE_ORDER_ITEMS_FORBIDDEN`.
- link_kind: `deposit` rejected → `FIN_HORSE_ORDER_LINK_KIND_INVALID`.

### H.3 Laboratory Billing Authority (Trigger)
Legacy: `lab_horses.client_id = invoice.client_id` → pass.
Junction: `party_horse_links` row where
  `tenant_id = invoice.tenant_id`
  AND `client_id = invoice.client_id`
  AND `lab_horse_id = invoice_items.lab_horse_id`
  AND `relationship_type IN ('lab_customer','payer')` → pass.
Anything else with a mismatched invoice client → SQLSTATE `42501`.
NULL invoice client → junction check short-circuited (accepts).

---

## I. Payment / Ledger contract

- `cash` / `card` / `transfer`: caller MUST supply `received_at`. Invoice goes to
  `approved` then `paid` after `post_payment` records a `ledger_entries` row of
  entry_type `payment` (credit) plus the approval-time `invoice` (debit) row.
  Billing links: source link (kind = payload `link_kind`), payment link
  (`billing_links.source_type = 'payment'`).
- `debt`: caller MUST omit `received_at` and MUST NOT provide payment-only fields;
  invoice status stays `approved` with `payment_status = 'unpaid'`; ONLY the
  approval-time invoice ledger row is inserted (no payment row). Debt requires
  the caller to hold Invoice Create + Approve, but does NOT require Payment Create.
- Customer balance: `customer_balances` upserted from ledger sums per tenant/client.
- effective_date: `_finance_riyadh_date(received_at or now())`.
- On failure at any pipeline stage, the whole `create_source_checkout_invoice`
  call rolls back — no rows in invoices, invoice_items, ledger_entries,
  billing_links, customer_balances, finance_request_idempotency survive.

---

## J. Idempotency contract

- Outer op name: `'create_source_checkout_invoice'`.
- Outer row keyed by `(tenant_id, operation, idempotency_key, actor_id)` in
  `public.finance_request_idempotency`; row created by `_finance_idempotency_begin`
  with request hash and unresolved snapshot, resolved to the final JSON response
  by `_finance_idempotency_complete`.
- Replay (same key + same request hash): returns the stored `response` payload
  verbatim; no new invoice created.
- Conflict (same key + different hash): `_finance_idempotency_begin` raises
  `FIN_IDEMPOTENCY_HASH_MISMATCH` (SQLSTATE `23514`).
- Nested inner ops (`create_invoice_with_items`, `approve_invoice`,
  `post_payment`) receive deterministic child keys derived from the outer key +
  operation stage.
- Expiry: rows older than 24h purged by `_finance_idempotency_purge_expired`.
  T1 uses fresh transaction-local rows only.

---

## K. Failure-hook contract

See `23_turn_5a_error_token_matrix.md` §3. All four hooks confirmed at exact
line positions in the installed body:

| Line | GUC                          | Token                             |
|------|------------------------------|-----------------------------------|
| 445  | `fin.fail_after_trace`       | `FIN_TEST_FAIL_AFTER_TRACE`       |
| 453  | `fin.fail_after_approve`     | `FIN_TEST_FAIL_AFTER_APPROVE`     |
| 491  | `fin.fail_after_payment`     | `FIN_TEST_FAIL_AFTER_PAYMENT`     |
| 535  | `fin.fail_after_source_link` | `FIN_TEST_FAIL_AFTER_SOURCE_LINK` |

`SET LOCAL <guc>='raise'` is transaction-scoped; when the enclosing SAVEPOINT
rolls back, the GUC unset is implicit for that scope only.

---

## L. Permission-negative contract

The fixed Actor is Owner and short-circuits `has_permission`. To exercise
`FIN_PERMISSION_DENIED` without mutating the Actor's baseline, T1 will use a
SAVEPOINT-scoped **downgrade**:

- INSERT a permission-override row that removes `invoices.create` /
  `invoices.approve` / `payments.create` for the (Actor, Tenant) tuple.
- Call the RPC → expect `FIN_PERMISSION_DENIED`.
- `ROLLBACK TO SAVEPOINT` restores baseline before the next scenario.

The `FIN_UNAUTHENTICATED` case is exercised by clearing JWT claims via
`set_config('request.jwt.claim.sub', '', true)` inside the scenario SAVEPOINT.

`FIN_TENANT_ACCESS_DENIED` uses `p_tenant_id = <secondary tenant not in Actor's
membership>` — no fixture write needed.

---

## M. Fixture architecture

See `22_turn_5a_fixture_uuid_map.md`. Groups A–H locked. All UUIDs
deterministic; all pre-insert collision checks required.

---

## N. Test-harness architecture

- `pg_temp.test_context` — identity + tenant + Payment Account.
- `pg_temp.test_baseline` — pre-run counts+sums for the 7 protected tables.
- `pg_temp.test_scenario_results` — one row per executed scenario (scenario_id,
  category, expected token, actual token/sqlstate, executed bool, passed bool,
  assertion count, notes). Row is inserted only after the scenario ran.
- `pg_temp.test_snapshot(kind text)` — pre/post row-count fingerprint for T2
  atomicity gates.
- RPC invocation pattern (per §2 of File 17): SAVEPOINT → set claims → SET LOCAL
  ROLE → nested BEGIN/EXCEPTION → RESET ROLE (in both success and exception
  branch) → privileged assertions → record result → ROLLBACK TO SAVEPOINT.

---

## O. Realistic case counts

- **T1 planned executable case count: 42.**
  Composition: 26 payload/validation + Lab Deposit + Lab Final +
  Lab Deposit-Final coexistence (Turn 5A.2) · 8 Horse-Order Final (Turn 5A.3) ·
  3 Authority/Client-Horse linkage · 5 Permissions/isolation.
  Explicitly non-executable in the sandbox but statically reviewed and
  documented: 4 scenarios (`FIN_NESTED_CREATE_NO_INVOICE_ID`,
  `FIN_INVOICE_NOT_FOUND`, `FIN_SOURCE_LINK_UPSERT_FAILED`,
  `FIN_ORDER_MISSING_HORSE`).
- **T2 stage count: exactly 5** (four failure hooks + default-inert success).
- **Frontend cases preserved: 24.** Additions deferred to Turn 5A.5:
  root-`horse_id`, root-`lab_horse_id`, repo-wide caller scan,
  structural multi-Sample guard.

---

## P. Files created this turn

- `docs/aml_1_b_1/stage_j5_2/preflight/21_turn_5a_1_live_test_contracts.md` (this file)
- `docs/aml_1_b_1/stage_j5_2/preflight/22_turn_5a_fixture_uuid_map.md`
- `docs/aml_1_b_1/stage_j5_2/preflight/23_turn_5a_error_token_matrix.md`

## Q. Files modified this turn

- `docs/aml_1_b_1/stage_j5_1/preflight/17_authenticated_jwt_convention.md`
  (full rewrite per §5 of the turn prompt)

## R. Production objects modified

**None.**

## S. Persistent business rows modified

**None.**

## T. Current T1/T2 status

**T1/T2 CONTRACTS LOCKED.**
**T1/T2 COMPLETE SQL NOT YET AUTHORED.**
**TURN 5A.2 REQUIRED.**

The existing `supabase/tests/database/j5_1_source_checkout.test.sql` and
`supabase/tests/database/j5_2_source_checkout_atomicity.test.sql` remain
rejected scaffolds. They are NOT re-labelled AUTHORED in this turn. They will
be fully replaced by Turn 5A.2–5A.4.

## U. Next exact turn

**Turn 5A.2** — T1 Foundation + Complete Deterministic Fixtures + Payload
Validation + Laboratory Deposit + Laboratory Final + Deposit/Final Coexistence.

## V. Five-phase roadmap position

- Phase 1 — N+1A: COMPLETE AND MANUALLY ACCEPTED.
- Phase 2 — N+1B: IN PROGRESS. Current subphase: J5.2-SLICE-01-EXECUTION — TURN 5A.1.
- Phase 3 — N+2: NOT STARTED / NOT AUTHORIZED.
- Phase 4 — N+3: NOT STARTED / NOT AUTHORIZED.
- Phase 5 — N+4: NOT STARTED / NOT AUTHORIZED.
