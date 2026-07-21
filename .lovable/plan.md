# AML.1.b.1 — Stage 6 Batch D: Mechanical Reconciliation & Authorized Spec Overwrite

Plan mode requires approval before any file write. This plan captures the exact Batch D execution contract. On approval I switch to build mode and perform exactly one file write: `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`. Zero DB/migration tool calls. Zero source/config/permission edits.

## Preconditions verified this turn (read-only)
- Current spec preimage SHA-256: `f297d685434fcc3b0c471af8106df395126ecb8be5f5c6d60c70b6223de89c10` (1,699 lines / 97,822 bytes) — will be re-verified immediately before overwrite; mismatch aborts.
- Batches A, B, C evidence already captured under `/tmp/aml_stage6_evidence/`; not re-queried.
- One pending read-only task: `pg_proc` enum-dependency sweep for `payment_reference_type` and `payment_intent_type` (for §7 exact rollback dependency capture). Any narrowly required catalog confirmation for §1 warehouse columns (`branch_id`, `is_default`, `is_active`) will be issued read-only.

## Mandatory mechanical reconciliations applied to the rewrite

1. **Warehouse defaults** — Replace single partial unique with two non-conflicting partial unique indexes on `warehouses`: (a) `(tenant_id, branch_id) WHERE is_default AND is_active AND branch_id IS NOT NULL`; (b) `(tenant_id) WHERE is_default AND is_active AND branch_id IS NULL`. Resolution order: exact branch default → tenant fallback (branch_id IS NULL) → `FIN_POS_NO_WAREHOUSE`. >1 valid row = guarded drift failure. If live columns don't support this exactly, retain narrow warehouse-resolution blocker (no READY).

2. **Tenant-safe service/product FK** — Additive `UNIQUE(tenant_id, id)` on `products`; nullable `tenant_services.product_id`; composite FK `(tenant_id, product_id) → products(tenant_id, id)`; partial index on `(tenant_id, product_id) WHERE product_id IS NOT NULL`. No same-tenant trigger — composite FK enforces parity.

3. **Invoice counter period model** — `finance_invoice_number_counters(tenant_id uuid, domain text, period_key text, next_value bigint, updated_at timestamptz, PRIMARY KEY (tenant_id, domain, period_key))`. Non-periodic domains use `period_key=''`; monthly uses `'YYYYMM'`. Prefix lives only in authoritative config (`finance_invoice_number_config` with explicit `prefix`, `reset_policy`, `padding_width`). No printf templates. Counter rows never contain prefix.

4. **Counter seed correction** — One-time migration seed uses exact family-specific parsed numeric maximum where safely parseable: `next_value = verified_max + 1`. Opaque historical families start a distinct canonical numeric namespace and probe the tenant invoice unique index at runtime. Runtime NEVER uses MAX / whole-table parse / `MAX(right(...))`. Seed/backfill completes before helper/RPC deployment.

5. **Numbering rollback correction** — Remove all `--force`. Rollback aborts if any counter advanced beyond captured seed OR any Stage 6-generated invoice exists. Only when every counter equals seed may rollback delete exact seed/config rows and drop helper/table/config. Seed preimage embedded verbatim in rollback artifact (or mechanically defined Stage 2 keyed preimage). No new snapshot table.

6. **POS debt correction** — `cash|card|transfer` → verified `receivable` payment intent + paid POS invoice. `debt` rejected by `pos_finalize_sale` with stable `FIN_*` code (specify: `FIN_POS_DEBT_UNSUPPORTED`). Stage 8 hides/disables debt POS action. POS never emits `issued`. Credit-sale/on-account = future separate contract.

7. **Payment enum rollback correction** — Remove `--purge-new-values`, all caller tolerance, any `payment_status` conversion/recreation, `REINDEX INDEX CONCURRENTLY`, and belt-and-braces reindex assertions. `payment_status` untouched. Guarded rollback: abort on any row using `'invoice'`/`'receivable'`; abort if Stage 6 functions remain; capture every dependency via final `pg_proc` sweep; drop/restore validator + dependent functions in exact dependency order; convert only `reference_type`/`intent_type` to text; recreate only the two enums with exact original labels/order/owner/ACL; cast columns back; restore validator + trigger; verify indexes/constraints; **no CASCADE**. If any dependency cannot be restored exactly → retain `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED`, no READY.

8. **Canonical stock update mechanism** — Exactly one path: POS RPC inserts `inventory_movements`; `trg_stock_levels_apply_movement` applies to `stock_levels`. POS RPC never decrements stock directly. Trigger enforces: tenant/product/warehouse parity, deterministic stock-row lock, positive movement qty, outbound/inbound sign convention, hard negative-stock rejection, `last_movement_at` update, once-only source identity where schema supports, full transactional rollback on failure.

## Execution steps (build mode)

1. Run final `pg_proc` enum-dependency sweep for the two payment enums; capture dependency list into spec §7 verbatim.
2. Any narrowly required read-only catalog confirmation for `warehouses` columns (§1).
3. Load current spec (1,699 lines).
4. Integrate Batch A/B/C coherently with §§1–8 reconciliations. Preserve every locked signature, contract, 14 RPC headings, 6 adapter headings, 12 payload tables.
5. Apply internal ordering M1→M7 and map into original F0–F6 boundaries without replacing them:
   - M1 enum additions · M2 numbering/config schema · M3 POS inventory schema · M4 period-aware counter seed/backfill · M5 private helpers/triggers · M6 public RPC bodies · M7 adapters
6. Run structural gates: 14 RPCs, 6 adapters, 12 payloads, one terminal readiness line, no prefix duplication in counters, monthly period supported, no COUNT seed, no force/purge, POS never `issued`, `debt` rejected, `payment_status` untouched, exact enum rollback complete, non-conflicting warehouse defaults, no `CASCADE`.
7. Re-verify preimage SHA-256 `f297d685…`; on mismatch abort with `STAGE6_SPEC_PREIMAGE_DRIFT`.
8. Perform single authorized overwrite of `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`.
9. Emit final manifest: new line count, new byte size, new SHA-256, gate results, and terminal readiness line.

## Terminal readiness contract

- **READY** iff every gate in §6 above passes AND all four prior blockers are mechanically retired by the reconciled spec content.
- Otherwise emit only the exact narrow remaining identifiers among:
  `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`, `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`, `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`, `PAYMENT_ENUM_EXACT_ROLLBACK_UNRESOLVED`, `WAREHOUSE_RESOLUTION_UNRESOLVED`, `STAGE6_SPEC_PREIMAGE_DRIFT`.

## Guarantees

- Only file changed: `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`.
- No `supabase--migration`, no DB mutation, no source/config/permission edits.
- Read-only DB queries limited to the pending `pg_proc` sweep and any narrowly required §1 column confirmation.

Approve to switch to build mode and execute Batch D.
