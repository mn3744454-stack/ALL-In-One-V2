
# AML.1.b.1 — Stage 6 Final Four-Blocker Resolution Pass (Plan)

Read-only investigation. The only file that will change is:
`docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`

No DB mutations, no migrations, no source/config/permission edits, no `/tmp` evidence references in the final document.

---

## Step 0 — Preimage verification (hard gate)

Verify the current spec matches:
- Lines: `1592`
- Bytes: `82,800`
- SHA-256: `947e111cf4e628664fb5586343d4f43be390028119d1311abad47f666f28884d`

Command: `wc -l -c` + `sha256sum` on the file.

On mismatch → abort with `SPEC_FILE_PREIMAGE_DRIFT` and change nothing.

---

## Step 1 — Resolve `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`

Catalog + repo evidence:
- Live schema for both candidate stacks:
  - `inventory_items`, `inventory_transactions`
  - `products`, `stock_levels`, `inventory_movements`, `warehouses`
- Columns, FKs, unique indexes, triggers, tenant scoping, quantity source of truth, reservation fields, active flags, links to services.
- Repository readers/writers for each table (`rg` for `.from('<table>')` and `.from("<table>")`, plus wrapper hooks in `src/hooks/inventory/*`, `src/hooks/finance/*`, POS surfaces).
- POS cart shape from `usePOSCore.ts`, `POSPaymentPanel.tsx`, POS catalog components — classify line types (service / stocked / free-text).
- Whether POS cart items currently carry any product/SKU/warehouse identity.
- Session lock model (`pos_sessions.status`, uniqueness of open session) and whether totals are persisted columns or aggregate-on-read.

Deliverables integrated into spec:
- Authoritative inventory stack decision, or, if unresolvable, a compact decision block (2–3 options, recommended first, exact additive consequence).
- POS line-type matrix (service / stocked / free-text) with per-type validation and stock behavior.
- Updated `pos_finalize_sale` atomic sequence covering: idempotency begin → session lock → sale number → `pos_sales` → cart validation → inventory validation+movement per line → invoice/items → payment intent → invoice/payment ledger → final `pos_sale` billing link → client balance when non-null → session totals/counters → idempotency completion.
- Session totals section stating persisted-vs-aggregate reality mechanically; no invented columns.

Blocker retirement rule: if no valid cart→product→warehouse path exists in the live schema, keep `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` and emit the compact decision block.

## Step 2 — Resolve `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`

Catalog + repo evidence:
- Every invoice-creation surface (Manual Finance, Housing, Laboratory, Doctor, Vet, Vaccination, Breeding, POS; demo generators tagged separately) — locate current number generator, prefix, tenant/domain scoping, editability, examples.
- Search for existing DB sequences/functions/counters (`pg_get_functiondef` of invoice-related functions; `information_schema.sequences`; any `invoice_number` policy tables).
- Tenant/branch/domain configuration for prefix or numbering policy (`tenants`, `branches`, `app_settings`).

Deliverables integrated into spec:
- Per-surface format-authority table.
- Server-authoritative numbering contract per operation (format family, prefix source, counter scope, lock, generation, unique-index verification, collision retry, response/snapshot field, rollback dependency).
- Explicit prohibitions restated (no `MAX(right(...))`, no caller-supplied final number, no unguarded read-then-increment, no universal-prefix destruction).

Blocker retirement rule: if a required tenant-specific manual prefix has no existing config, emit a compact decision block and keep `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`.

## Step 3 — Resolve `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`

Catalog + repo evidence:
- `pg_enum` labels + ordering for `payment_intent_type`, `payment_reference_type`, `payment_status`.
- `pg_get_functiondef` for `validate_payment_intent` and any payment triggers.
- `payment_accounts.account_kind` values, active-account filters.
- Current payment creation payloads (`postLedgerForPayments.ts`, invoice payment dialogs, POS payment method values).
- Any existing mapping helper.

Deliverables integrated into spec:
- Exact mapping table: `p_payment_method` → `intent_type` → `reference_type` → initial/final `status` → account requirement.
- Rules block: exact live enum labels only; no invented `completed`; tenant/account/currency/kind validation; `p_payment_date` used only as ledger `effective_date`; payment business row before negative ledger event; existing allocation/overpayment rules preserved; invoice `partial|paid` derived server-side; payment-intent identity in snapshot + response.

Blocker retirement rule: any UI-reachable method with no valid live enum/account mapping stays a named blocker.

## Step 4 — Resolve `WRITER_CENSUS_METHOD_INVALID`

Method:
- Two separate censuses (mutation vs reader), no mixing.
- Mutation regex: `\.from\((['"])(...target tables...)\1\)` followed within chain by `.insert(`, `.update(`, `.upsert(`, `.delete(`; plus RPC mutation calls; plus wrapper hooks; plus edge functions and demo/seed paths; plus service-role scripts.
- Target tables: full finance surface — `invoices`, `invoice_items`, `expenses`, `ledger_entries`, `customer_balances`, `billing_links`, `payment_intents`, `payment_splits`, `pos_sales`, `pos_sessions`, `hr_salary_payments`, `supplier_payables`, `inventory_transactions`, `inventory_movements`, `stock_levels`, `finance_request_idempotency`, plus each adapter's domain invoice source.
- Reader census: same tables, `.select(`/`.rpc(` reads whose behavior Stage 6/8 must preserve.

Deliverables integrated into spec:
- Mutation-site table (file:line, target, op, caller fields, resolved fields, order, validation, permission assumption, current idempotency, Stage 6 disposition, Stage 8 action).
- Reader/dependency table.
- Baseline reconciliation explaining the earlier "57" figure — duplicates, omissions, added expense/HR/demo/edge/wrapper paths — arriving at final mutation count and reader count with zero unexplained sites.

## Step 5 — Coherent spec update rules

- Edit only `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`.
- Integrate into existing sections; no errata appendix.
- Remove resolved blocker language.
- Preserve verbatim: 14 RPC signatures, 6 adapter headings, 12 payload contracts, expense Model-B reversal, idempotency codes (`ACTOR_MISMATCH`, `CONFLICT`, `IN_PROGRESS`), error taxonomy, F0 and A.15 SQL artifacts.
- Embed decisive query text + relevant raw results directly.
- No `/tmp` references. Exactly one terminal line.

## Step 6 — Structural gates before write

- Exactly 14 RPC headings.
- Exactly 6 adapter headings.
- Exactly 12 payload contract tables.
- All four blocker identifiers either retired or explicitly retained with decision block.
- Preimage of prior file re-verified immediately before overwrite.

## Step 7 — Final decision

If all four resolved:
```
AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.
```
Otherwise:
```
AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [remaining identifiers], READ-ONLY, ZERO MUTATIONS.
```

## Step 8 — Final manifest returned in chat

- Preimage hash/lines/bytes + match confirmation.
- Final decision + remaining identifiers.
- File path, new lines/bytes/SHA-256.
- Actual mutation-site count.
- Actual reader/dependency count.
- POS inventory model selected (or decision block).
- Invoice-number policy selected (or decision block).
- Payment enum mapping result.
- Structural-gate results.
- Confirmation only the spec file changed.
- Confirmation no DB/migration write tool was called.

---

## Technical execution notes

Investigation tool budget:
- `sha256sum`, `wc` for preimage.
- `supabase--read_query` for `pg_enum`, `pg_get_functiondef`, `pg_indexes`, `information_schema.columns`, `information_schema.sequences`, `pg_class.relacl` where needed.
- `rg` sweeps for mutation/reader census with the regex above.
- `code--view` for POS core, invoice creation surfaces, payment helpers, adapter files.
- Final write via `code--write` (single-file replacement of the spec).
