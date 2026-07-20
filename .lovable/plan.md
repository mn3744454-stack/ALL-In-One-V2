# AML.1.b.1 — Stage 6 Execution Specification Mechanical Correction Pass

**Mode:** Read-only investigative work plus one documentation-file write only.  

**Zero database/business-data mutations. No migration calls. No code/config changes. No Stage 6 implementation.**

---

## Scope

Produce the fully regenerated:

`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_[SPEC.md](http://SPEC.md)`

The document must incorporate every correction A.1–A.17, backed by current live-catalog evidence and repository inspection, and end with the exact terminal-readiness line dictated by A.18.

No unresolved fact may be inferred to obtain a `READY` decision.

---

## Delivery channel — user approved

The prior “no repository edits” rule is relaxed for this exact documentation file only:

`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_[SPEC.md](http://SPEC.md)`

All other prohibitions remain:

- Do not call the migration tool.

- Do not use `supabase--migration`, `supabase--insert`, or any database write tool.

- Do not execute DDL or DML.

- Do not edit any other file, including another file inside `stage_06_readiness/`.

- Do not edit migrations, source code, configuration, RPCs, permissions or rollback artifacts.

- Do not modify protected records or business data.

- Do not modify `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql`.

- The A.15 Stage 5 rollback-guard replacement must appear inside the regenerated specification as a prescribed later edit only.

- If the exact target file cannot be written without modifying another repository object, return `BLOCKED`; do not widen the write scope.

The file may be created or replaced using the necessary file-writing mechanism, but the final repository effect must be limited to that one exact path.

---

## Execution phases

All investigation is read-only. The only permitted repository mutation is the final write of the exact specification file.

### Phase 1 — Live catalog and no-drift capture

Use read-only queries through `supabase--read_query` and, where the existing environment permits it, read-only `psql` catalog introspection.

Do not rely on `\d` output alone where an exact `pg_catalog` definition is available.

Evidence must be captured for the following.

### 1. `payment_intents`

Capture:

- Columns, types, defaults and nullability.

- CHECK constraints.

- Unique constraints and indexes.

- Foreign keys.

- RLS/ACL state relevant to Stage 6.

- Current frontend writer payloads.

### 2. Payment allocation behavior

Inspect:

- `src/lib/finance/postLedgerForPayments.ts`

- `src/hooks/**/usePayment*`

- `src/components/payments/**`

- `src/components/pos/EmbeddedCheckout.tsx`

- Every additional live payment writer found through `rg`.

Lock the exact current rules for:

- Outstanding amount.

- Allocation.

- Overpayment.

- Tolerance and rounding.

- Derived invoice status.

- Multiple payments/payment methods.

- Replay expectations.

### 3. Payment accounts and methods

Capture:

- `payment_accounts` schema, constraints, active-state fields and tenant relation.

- Current same-tenant/account validation.

- Allowed payment-method values and validation source.

- Fields required by `post_payment` and POS.

### 4. Complete POS mutation chain

Capture the actual live objects and current flow for:

- `pos_sessions`

- `pos_sales`

- Inventory/stock tables that actually exist.

- Payment records.

- Sale-number allocation.

- Session totals/counters.

- Branch/register/account validation.

- Inventory validation and mutation order.

- Current invoice/items/payment creation.

- Explicit business-date availability.

Do not assume that every candidate table name exists. Record absent candidate objects as absent and use only the verified live chain.

### 5. Invoice-number generation

Inspect:

- All current invoice-number formats and prefixes.

- Tenant/domain/POS variations.

- Every frontend generator.

- Existing database functions, sequences or counters.

- Collision and concurrency handling.

- Current persisted examples by format without exposing unnecessary business data.

Do not approve `MAX(right(invoice_number))` or create an invoice-number helper without evidence.

### 6. `billing_links`

Capture the complete live definition:

- Columns, types, defaults and nullability.

- CHECKs, uniques and indexes.

- Foreign keys.

- RLS/ACL facts relevant to the planned helper.

- Existing `source_type` and `link_kind` census.

Do not invent `amount`, period, currency or any absent column.

### 7. Laboratory join graph

Capture the exact joins and key direction for:

```text

lab_requests

→ lab_horses

→ party_horse_links

→ clients

→ applicable services/prices

```

Identify how `lab_[requests.horse](http://requests.horse)_id` relates to the correct lab-horse record and how client/service/price truth is resolved.

### 8. `party_horse_links`

Confirm exact live columns, FKs and uniqueness for:

- `tenant_id`

- `lab_horse_id`

- `client_id`

- `relationship_type`

Do not substitute `horse_id` or `party_id` unless the live catalog proves those names.

### 9. `lab_horses.client_id`

Capture null/non-null counts per tenant and reconcile them against:

`docs/aml_1_b_1/stage_01_preflight/lab_horses_client_id_census.txt`

Any drift must be reported explicitly.

### 10. Package grouping

Inspect the actual package parent/child mechanism used by current invoice-item code and schema.

- Confirm whether `parent_item_id` or an equivalent exists.

- If absent, record the real grouping predicate.

- Do not invent a new grouping column.

- Separate package grouping from Housing monthly financial lines.

### 11. Rounding, tax and discount

Inspect:

- `src/lib/taxUtils.ts`

- `src/lib/pricing/**`

- `computeTax` callers.

- Invoice form calculations.

- POS calculations.

- Housing proration helpers.

Lock:

- Two-decimal rounding points.

- Tax-inclusive/exclusive behavior.

- Taxable-item filtering.

- Discount application.

- Header/item parity rules.

### 12. External-provider predicates

Capture exact columns and code predicates for:

- `vet_treatments`

- `horse_vaccinations`

- `breeding_attempts`

- `pregnancy_checks`

- `foalings`

Do not lock `service_mode`, `external_provider_id`, `source_mode` or `provider_tenant_id` until verified for the corresponding table.

### 13. `hr_salary_payments`

Capture:

- Complete columns and types.

- Defaults and nullability.

- CHECKs, uniques, indexes and FKs.

- The exact expense-link column, if present.

- Current writer payload and mutation order.

Do not lock `finance_expense_id` unless confirmed live.

### 14. Stage 6 uniqueness`23505` surface

Enumerate every unique constraint and unique partial index that any Stage 6 RPC/helper/adapter can encounter across all verified mutated tables, including where applicable:

- `invoices`

- `invoice_items`

- `ledger_entries`

- `customer_balances`

- `billing_links`

- `expenses`

- `finance_request_idempotency`

- `pos_sales`

- `payment_intents`

- `hr_salary_payments`

- POS inventory/session/payment tables

- Any additional table proved to be mutated by the final contract.

For each, identify:

- Constraint/index name.

- Key and predicate.

- Calling operation.

- Whether the conflict is replay-verifiable or maps to a stable `FIN_*` error.

Do not describe this as an “eight-table” scan.

### 15. Stage 3 and Stage 5 no-drift gate

Reconfirm:

- Correct Stage 3 additive columns, constraints and indexes.

- `pos_sales` remains `numeric(12,2)` where approved.

- `finance_request_idempotency` schema, zero-row state, RLS and policy state.

- All seven Stage 5 helper signatures.

- Owners, security mode, `search_path`, volatility and ACLs.

- Only `*finance*idempotency_purge_expired` remains executable by `service_role`.

### 16. Stage 4 permission no-drift gate

Reconfirm:

- Finance permission-definition count.

- The three Stage 4 permission rows and exact content.

- The captured `كبير المشرفين` bundle identity.

- Finance binding count.

- The three new bindings.

- `finance.invoice.markPaid` remains present and bound.

- Exact adapter-domain permission/capability keys.

### 17. Protected financial parity

Reconfirm the Stage 2/Stage 5 protected fingerprints:

- `invoices`

- `invoice_items`

- `ledger_entries`

- `customer_balances`

- `billing_links`

- `expenses`

Also verify the protected invoice/ledger sentinels, including `الم-202607-213`, remain unchanged.

No readiness decision may be `READY` if any protected fingerprint drifts.

### Evidence format

Each capture must appear in the specification as:

```text

Query/command

→ raw relevant result

→ interpretation

→ locked consequence or unresolved identifier

```

Raw output must be sufficient to prove the conclusion, but must not expose secrets, credentials, tokens or unnecessary full business payloads.

---

## Phase 2 — Complete repository writer census

Run `rg -n` sweeps over `src/**` for every direct or wrapped write affecting:

- `invoices`

- `invoice_items`

- `ledger_entries`

- `expenses`

- `payment_intents`

- `pos_sales`

- `pos_sessions`

- `billing_links`

- `customer_balances`

- `hr_salary_payments`

- Verified POS inventory/payment tables.

Also capture all read/validation/generation paths needed by the six domain adapters.

For each current site record:

- File and exact line.

- Operation.

- Field mapping.

- Mutation order.

- Validation and calculation helpers.

- Permission assumption.

- Idempotency behavior.

- Replacement Stage 6 RPC/adapter.

- Stage 8 migration disposition.

The prior census reported 57 sites. Treat 57 as a comparison baseline, not a forced result.

The current repository scan is authoritative:

- If exactly 57 sites remain, record parity.

- If the count differs, enumerate the additions/removals and treat unexplained drift as a blocker.

- Do not omit a current site merely to preserve the prior count.

- Do not claim “57 complete sites” unless every row is actually populated.

Stage 8 still owns the frontend mutation. This pass records the census only.

---

## Phase 3 — Regenerate the complete specification

Rewrite:

`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_[SPEC.md](http://SPEC.md)`

from its first heading through its terminal line.

Apply A.1–A.17 throughout as one coherent document. Do not add a detached errata section and do not retain a false statement with a correction note beside it.

Required structure:

1. Header, scope and locked invariants.

2. The A.2 twelve-invariant approval contract.

3. Universal A.12 payload rejection rules.

4. Live evidence for Phase 1 items 1–17.

5. Exact A.17 permission map and canonical authorization/locking order.

6. `approve_invoice` and `cancel_invoice` state machines, including:

   - legacy `sent` rejection;

   - exact `issued` handling;

   - `-213` exclusion.

7. Expense dual-axis state machine, including:

   - `ledger_status='unposted'`;

   - the only non-null AML expense source `hr_salary_payment`;

   - Model-B reversal linkage.

8. SQLSTATE→stable `FIN_*` mapping.

9. Final evidence-based private-helper inventory:

   - exact signatures;

   - responsibilities;

   - dependencies;

   - owner/security/search path;

   - ACLs;

   - creation/drop order.

10. Invoice-number helper only if Phase 1 item 5 proves that it is required.

11. Fourteen public RPC entries, each with all 20 required fields fully populated:

    - `create_invoice_with_items`

    - `update_invoice_with_items`

    - `delete_draft_invoice`

    - `approve_invoice`

    - `cancel_invoice`

    - `post_payment`

    - `create_expense`

    - `update_expense`

    - `delete_expense`

    - `post_expense_with_ledger`

    - `reverse_expense`

    - `post_manual_ledger_adjustment`

    - `pos_finalize_sale`

    - `record_salary_payment`

12. Six complete adapter entries:

    - Housing

    - Laboratory

    - Doctor

    - Vet

    - Vaccination

    - Breeding

13. Every adapter must include:

    - domain authority;

    - exact source lock;

    - `FOR UPDATE` target;

    - source/client/الخيل/service/price derivation;

    - active-occurrence check;

    - external-provider exclusion;

    - corrective-rebill lineage;

    - canonical final `billing_links` row;

    - response/replay/error/rollback contract.

14. Housing’s corrected closed-range overlap query.

15. Laboratory’s exact direct-client-or-PHL predicate and locked error taxonomy.

16. Twelve field-by-field payload contracts with all ten metadata columns.

17. Current writer census and comparison against the prior 57-site baseline.

18. F0 guarded forward SQL and guarded rollback SQL.

19. F1–F6 migration grouping.

20. Per-migration rollback scope and exact rollback signatures.

21. A.15 Stage 5 rollback guard, clearly labelled:

    `Later file edit for docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql — not applied in this pass`.

22. No-drift and completeness gate.

23. Exact terminal-readiness line.

The document must not contain placeholders such as:

- `TBD`

- `to confirm`

- `assumed`

- `likely`

- `etc.`

- incomplete matrix cells

unless the item is explicitly recorded as unresolved and included in the terminal `BLOCKED` list.

---

## Phase 4 — Terminal readiness gate

After writing the specification, evaluate:

- Every Phase 1 item.

- Every A.1–A.17 correction.

- Every RPC and adapter field.

- Every payload contract.

- Current writer census completeness.

- Private-helper dependency and rollback correctness.

- F0 forward/rollback safety.

- Stage 3–5 no-drift.

- Protected financial parity.

- Exact file completeness.

If every input is mechanically proved and every contradiction is removed, the only permitted terminal line is:

```text

AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.

```

Here, `ZERO MUTATIONS` refers to database, business data, permissions, migrations, application code and protected records; the single approved specification-file write must be disclosed in the document header.

If anything remains inferred, unresolved or drifted, the only permitted terminal line is:

```text

AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [exact unresolved identifiers], READ-ONLY, ZERO MUTATIONS.

```

Do not use a generic blocker. List exact identifiers.

A delivery-channel or output-size issue is not permission to compress away evidence. If the exact file cannot be completed, return:

```text

AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [SPEC_FILE_DELIVERY_INCOMPLETE], READ-ONLY, ZERO MUTATIONS.

```

---

## Explicit non-actions

- Migration tool: not called.

- Database DDL/DML: not executed.

- `supabase/migrations/**`: not created or edited.

- `docs/aml_1_b_1/stage_05_private_helpers/ROLLBACK.sql`: not edited.

- Any file other than the exact Stage 6 specification: not edited.

- `src/**`: not edited.

- Permissions, grants, policies and RPCs: not modified.

- `finance_request_idempotency`: not written.

- Protected records: not touched.

- Stages 7, 8, 11, 12, 15 and 19: not started.

---

## Deliverables

1. Exact file:

   `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_[SPEC.md](http://SPEC.md)`

2. One compact chat response containing:

   - `READY` or `BLOCKED`.

   - Exact unresolved identifiers when blocked.

   - Exact file path.

   - File line count.

   - File byte count.

   - SHA-256 of the completed file.

   - Confirmation that no other repository file changed.

   - Confirmation that no database/migration write tool was called.

The complete specification lives in the file; the chat response is only its verification manifest.

---

## Technical constraints

- Investigation tools: read-only catalog queries, `rg`, file views and read-only shell/catalog inspection.

- No write-capable database tool.

- No SQL passed through `code--exec` unless it is demonstrably read-only.

- The sole permitted repository effect is the exact specification file.

- The F1 helper count must be derived from the final evidence.

- A.15 `s6_names` must exactly match the final Stage 6 function inventory.

- The Stage 5 `helpers` array remains the exact seven installed Stage 5 helpers.

- No `CASCADE`.

- No default-privilege modification.

- No policy widening.

- No execution of any SQL printed inside the specification.