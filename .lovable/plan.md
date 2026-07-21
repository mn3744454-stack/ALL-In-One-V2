# AML.1.b.1 — Stage 6 Three-Decision Lock & Exact Execution-Package Draft (Plan)

Read-only mechanical investigation plus a single authorized write to:
`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`

No DB mutations, no migration tool calls, no source/config/permission edits, no `/tmp` evidence references.

---

## Step 0 — Preimage verification (hard gate)

Confirmed on this turn:
- Lines: `1699`
- Bytes: `97,822`
- SHA-256: `f297d685434fcc3b0c471af8106df395126ecb8be5f5c6d60c70b6223de89c10`

Re-verify immediately before the authorized overwrite. On mismatch → abort with `SPEC_FILE_PREIMAGE_DRIFT` and change nothing.

---

## Step 1 — Decision 1 evidence: POS canonical inventory stack

Read-only live evidence to embed:

- `products` — full column list, tenant scoping, active flag, unit, unique keys.
- `stock_levels` — PK/unique on `(tenant_id, product_id, warehouse_id)`, `quantity_on_hand`, `quantity_reserved`, computed available, update triggers.
- `inventory_movements` — canonical columns, movement types, tenant scoping, FKs, triggers that adjust `stock_levels`.
- `warehouses` — tenant scoping, `is_active`, default-warehouse resolution rule (verified — not assumed).
- `tenants` — proof there is no `allow_negative_stock` column; therefore Stage 6 denies negative stock.
- `tenant_services` — proof there is no existing `product_id` FK; specify the additive nullable `product_id uuid REFERENCES public.products(id)` with a partial `NOT VALID`-then-validated FK and a supporting index.
- Cart payload evidence from `usePOSCore.ts` showing lines currently lack product/warehouse identity → Stage 8 migrates cart shape.

Deliverables integrated into the spec:
- POS line-type matrix: `service` / `free_text` (both `zero_stock_effect=true`) vs `stocked_product` (canonical stack).
- Warehouse-resolution query (verified) and exact `SELECT ... FROM public.stock_levels ... FOR UPDATE` clause.
- Canonical `inventory_movements` insert shape and the verified live mechanism that updates `stock_levels` (trigger vs explicit UPDATE) — whichever the live evidence proves, stated mechanically.
- Pre-guards: tenant/product/warehouse parity, `products.is_active`, `warehouses.is_active`, `quantity > 0`, `available >= requested`.
- Unique/constraint conflict mapping to Stage 6 error taxonomy.
- Explicit denial of `inventory_items` + `inventory_transactions` for POS.
- Forward SQL: additive `tenant_services.product_id` + index + FK validation.
- Rollback SQL: guarded drop of the column/index/FK only if unused (`WHERE product_id IS NOT NULL` count = 0).
- Post-gates: FK validated, index present, zero rows violating parity.
- `pos_finalize_sale` public signature preserved verbatim; product/warehouse identity carried inside `p_payload`.

Blocker retirement rule: `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` is retired ONLY after every item above is mechanically specified from live evidence.

## Step 2 — Decision 2 evidence: Server-authoritative invoice numbers

Read-only live evidence to embed:

- Enumerate every current caller-side invoice-number generator across Manual Finance, Housing, Laboratory, Doctor, Vet/Vaccination, Breeding, POS, and demo generators (tagged separately).
- Confirm zero existing sequences/functions/tables governing invoice numbers (`information_schema.sequences`, `pg_proc` scan, `app_settings` scan).
- Verify per-tenant/per-domain prefix configuration surface (columns on `tenants` and/or `branches`, or the additive config table required).
- Observed live prefix families (5) with concrete examples and their current caller.

Deliverables integrated into the spec:
- Additive schema for `finance_invoice_number_counters(tenant_id, domain, prefix, next_value, updated_at, PRIMARY KEY(tenant_id, domain))` with tenant FK, GRANTs to `service_role` only, RLS enabled, no public policies (helper is `SECURITY DEFINER`).
- Authoritative prefix source rule: prefix lives in the tenant/domain config table only; counter row stores counter state, never a conflicting prefix.
- Private helper contract: `_finance_invoice_number_next(p_tenant_id uuid, p_domain text) returns text` with `SET search_path=''`, `SECURITY DEFINER`, `pg_advisory_xact_lock`, row lock via `SELECT ... FOR UPDATE`, unique-index probe on `invoices(tenant_id, invoice_number)`, bounded retry (max 3), exact error taxonomy on exhaustion.
- Rule: caller-supplied `invoice_number` in any RPC payload is rejected (`INVOICE_NUMBER_CALLER_SUPPLIED`).
- Generated number appears in the resolved snapshot and RPC response for all invoice-creating RPCs.
- Backfill mapping: exact per-tenant, per-domain seed values derived from `MAX` of existing observed numeric suffix — executed once inside the same migration under advisory lock, never at runtime.
- Preserved formats for all 5 prefix families; no universal `INV-` rewrite.
- Forward SQL: table create + GRANT + RLS + helper + backfill seed.
- Rollback SQL: drop helper, drop table (guarded: refuse if any row exists post-cutover).
- Pre-guards / post-gates: unique index present on `invoices(tenant_id, invoice_number)`; counter rows exist for every (tenant, domain) with prior invoices.
- All 14 RPC and 6 adapter signatures unchanged.

Blocker retirement rule: `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED` retired only after all items above are mechanically specified.

## Step 3 — Decision 3 evidence: Payment intent enum additions

Read-only live evidence to embed:

- `pg_enum` current labels for `payment_intent_type`, `payment_reference_type`, `payment_status` (with ordering).
- `pg_get_functiondef(validate_payment_intent)` current body.
- `payment_accounts.account_kind` values and active filters relevant to invoice receivables.

Deliverables integrated into the spec:
- Additive enum expansion in its own migration boundary that COMMITS before any helper/RPC references the new labels:
  - `ALTER TYPE public.payment_reference_type ADD VALUE IF NOT EXISTS 'invoice';`
  - `ALTER TYPE public.payment_intent_type ADD VALUE IF NOT EXISTS 'receivable';`
- Explicit statement: `payment_status='paid'` is the terminal status; `completed` is never introduced or referenced.
- Updated `validate_payment_intent` contract: an invoice receivable row (`reference_type='invoice'`, `intent_type='receivable'`) is valid only when tenant/payee/account/currency requirements pass against verified live rules.
- `post_payment` behavior: inserts `reference_type='invoice'`, `reference_id=p_invoice_id`, `intent_type='receivable'`, `status='paid'`. Locked signature and existing ledger behavior preserved verbatim.
- Rollback limitation: PostgreSQL enum-value removal is not representable as a safe `DROP VALUE`; rollback is dependency-aware and guarded — refuse rollback if any row in `payment_intents` uses the new labels; otherwise document that logical retirement is achieved by ceasing writes, not by `DROP VALUE`.
- Migration ordering guarantee (see Step 5).
- Post-gates: enum labels present; validator updated; mechanical tests for accept/reject cases specified (not executed).

Blocker retirement rule: `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED` retired only after all items above are mechanically specified.

## Step 4 — Coherent spec rewrite rules

- Edit only `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`.
- No errata appendix; integrate into existing sections.
- Remove all superseded decision blocks; no duplicates.
- Preserve verbatim: 14 RPC signatures, 6 adapter headings, 12 payload contracts, Model-B expense reversal, idempotency taxonomy (`ACTOR_MISMATCH`, `CONFLICT`, `IN_PROGRESS`), error taxonomy, F0 artifact, corrected A.15 guard.
- Update helper inventory to include `_finance_invoice_number_next` and the POS inventory helpers required by Decision 1; extend the A.15 arrays accordingly.
- Embed decisive query text and raw results directly in the spec.
- Exactly one terminal readiness line.

## Step 5 — Migration regrouping

Ordered migration boundaries embedded in the spec (forward SQL + guarded rollback for each, no `CASCADE`):

```text
M1  Enum additions              (payment_reference_type += 'invoice',
                                 payment_intent_type   += 'receivable')  -- must COMMIT before M4+
M2  Additive numbering schema   (finance_invoice_number_counters + GRANTs + RLS + unique index verification)
M3  Additive POS inventory link (tenant_services.product_id + index + NOT VALID FK + VALIDATE)
M4  Private helpers             (_finance_invoice_number_next, POS stock lock/movement helpers)
M5  Public RPC updates          (14 locked signatures; bodies updated to use M1-M4)
M6  Adapter updates              (6 adapters aligned to updated RPC contracts)
M7  Backfill                    (per-tenant/per-domain counter seeding under advisory lock)
```

Rules:
- Each migration lists exact pre-guards, post-gates, and guarded rollback.
- A failure in Mn prevents Mn+1..M7 from running.
- Enum labels are guaranteed committed before any function body references them.
- Additive schema precedes helpers; helpers precede public RPCs.
- No `CASCADE` anywhere.

## Step 6 — Structural gates before write

- Exactly 14 RPC headings.
- Exactly 6 adapter headings.
- Exactly 12 payload contract tables.
- All three targeted blocker identifiers retired (no unresolved identifiers remain unless genuinely mechanical evidence is missing).
- No locked-signature drift.
- Balanced Markdown/SQL fences.
- Exactly one terminal readiness line.
- Preimage re-verified immediately before overwrite.

## Step 7 — Final decision

If every mechanical input is complete:
```
AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.
```
Otherwise:
```
AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [remaining mechanical identifiers], READ-ONLY, ZERO MUTATIONS.
```

## Step 8 — Final chat manifest

- Preimage hash/lines/bytes + match confirmation.
- Final decision + any remaining identifiers.
- File path, new lines/bytes/SHA-256.
- Migration grouping (M1..M7) confirmation.
- Structural-gate counts (14/6/12, one terminal line).
- Confirmation only the spec file changed.
- Confirmation no DB/migration tool was called.

---

## Technical execution notes

Investigation budget (read-only):
- `sha256sum`, `wc` for preimage.
- `supabase--read_query` for `pg_enum`, `pg_get_functiondef`, `pg_indexes`, `information_schema.columns`, `information_schema.sequences`, `pg_class.relacl`, and observed invoice-number distributions per tenant/domain.
- `rg` sweeps confirming caller-side invoice-number generators and POS cart shape.
- `code--view` for POS core, invoice creation surfaces, and payment helpers.
- Final write via `code--write` (single-file overwrite of the spec).
