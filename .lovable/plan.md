## Stage 6 Mechanical Blocker-Resolution Pass — Plan

**Scope:** Read-only investigation across DB catalog + repo, then a single authorized rewrite of `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`. No other repo files, no DB mutations, no migration tool calls.

### Pre-flight guard
1. Compute SHA-256 of the existing spec file and compare against preimage `f690efbc1a2a07cbc8eb0d896e238a9cf2749dd0ad8dbb41b43460bccd45570a` (765 lines / 57,497 bytes).
2. If mismatch → abort with `AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [SPEC_FILE_PREIMAGE_DRIFT], READ-ONLY, ZERO MUTATIONS.` and do not overwrite.
3. If match → proceed with §1–§6 investigation.

### §1 — POS_INVENTORY_CHAIN_UNVERIFIED
- Catalog sweep via `psql` for object names matching `pos_%`, `inventory_%`, `stock_%`, `warehouse%`, `product%`, `item%`, `movement%`, `transaction%`: type, columns, PK/UK, FKs, CHECKs, RLS, triggers.
- Repo sweep of `src/components/pos/**`, `src/hooks/pos/**`, payment panels/hooks, inventory hooks; enumerate every `.from(...).insert|update|delete|upsert` and RPC/edge call reachable from POS finalization.
- Derive exact current sequence (session→cart→availability→mutation?→invoice→payment→ledger→billing_link→session totals). Record `CURRENT_POS_INVENTORY_MUTATION = NONE` if none.
- Fully populate `pos_finalize_sale` contract (business date, session lock via `pos_sessions … FOR UPDATE`, sale-number allocation, non-unique `cart_hash`, verified inventory mutation order, invoice/items, POS payment business row, ledger rows, `billing_links(source_type='pos_sale', link_kind='final')`, conditional balance rebuild, session totals, replay body, SQLSTATE→`FIN_*` map).

### §2 — ROUNDING_TAX_HELPERS_PARTIAL
- Full call-graph census: `src/lib/taxUtils.ts`, `src/lib/pricing/**`, all `computeTax` callers, invoice form, POS, `boardingPeriodEngine.ts`, package/service pricing, discount validation.
- For each path capture: function, file:line, inputs, inclusive/exclusive, per-item vs aggregate, taxable filter, rounding point/method, precision, discount order, reconciliation, callers.
- Lock one server-side algorithm per operation; preserve current behavior. Approval retains physical-count, financial predicate, package-child match, server recompute, discount ≤ subtotal, `ABS(header.subtotal − Σ financial items) < 0.01`, exact rounded total parity.
- If two writers conflict on financial algorithm → keep a precise sub-identifier blocker; do not choose without evidence.

### §3 — CURRENT_WRITER_CENSUS_INCOMPLETE
- Repo-wide census of writes to: `invoices`, `invoice_items`, `ledger_entries`, `customer_balances`, `billing_links`, `expenses`, `payment_intents`, `pos_sales`, `pos_sessions`, `hr_salary_payments`, verified POS inventory/payment tables.
- Include wrapper hooks, shared helpers, multiline calls, RPCs, edge functions, demo seeds, adapter invoice paths.
- Per writer: file:line, target, op, caller payload, resolved fields, order, validation, permission assumption, idempotency, Stage 6 replacement RPC/adapter, Stage 8 disposition.
- Reconcile against baseline 57 (parity or full added/removed/drift); embed complete census in the main spec (no external artifact).

### §4 — PAYLOAD_CONTRACTS_ARTIFACT_MISSING
- Embed all 12 payload contracts directly in the spec: manual invoice create/update, payment supplemental, expense create/update, POS finalize, and 6 adapters (Housing, Lab, Doctor, Vet, Vaccination, Breeding).
- Per field: JSON path, PG-compatible type, presence, ownership, editable state, validation source, in-hash?, in-snapshot?, in-response?, disposition.
- Encode universal rejection rules (caller final status, ledger amount/`balance_after`, final totals, tenant mismatch, source-link identity on manual, adapter-source mismatch, caller price when catalog-governed, expense system fields, unknown JSON keys).
- `corrects_invoice_id` accepted only in adapter payloads; present in hash + snapshot + response.

### §5 — INVOICE_NUMBER_TENANT_DOMAIN_RULES_UNENUMERATED
- 5.1 Persisted census: read-only aggregate of invoice-number patterns by tenant, prefix, domain (POS/manual/adapter), min/max suffix, counts.
- 5.2 Generator census: frontend, shared utils, DB functions/triggers/sequences, migration history. Per generator: surface, format, prefix, tenant/domain input, concurrency, collision, demo-only vs prod.
- 5.3 Final rule: preserve verified formats under concurrency. Prohibit `MAX(right(...))`, whole-set parsing, universal `INV-`, client-generated finals, unguarded read-then-increment. Reuse existing safe DB generator if present, else specify signature/inputs/counter storage/advisory-or-row lock/collision/ACL/migration placement/rollback (F1 + A.15 only if justified). If genuinely ambiguous → retain a precise invoice-number sub-blocker.

### §6 — INVENTORY_UNIQUE_INDEX_MAP_INCOMPLETE
- After §1 identifies actually mutated tables, enumerate every unique constraint/index on them plus `pos_sales`, `payment_intents`, `invoices`, `invoice_items`, `ledger_entries`, `billing_links`, `customer_balances`.
- Per entry: table, name, columns, partial predicate, deferrability, Stage 6 op that may raise, conflict meaning, replay-verifiable vs business, stable SQLSTATE/`FIN_*` translation.
- Do not include nonexistent inventory tables.

### §7 — Integration rules (coherent rewrite, not errata)
- Rewrite affected sections in place; remove superseded blocker statements; no "corrections" appendix; no duplicate/contradictory rules; no dangling artifact references.
- Preserve A.1–A.17, F0 rollback guard, F1–F6 separation, A.15 later-edit guard, protected financial and no-drift gates, PLAN-LOCK.

### §8 — Completeness gates before terminal line
Verify inside the final file: all sections present; 14 RPCs × 20 fields; 6 adapters complete; 12 embedded payload tables complete; census fully populated and reconciled; POS inventory chain uses only verified live objects; invoice-number rules evidence-backed; inventory uniqueness complete for every mutated table; no `TBD`/`to confirm`/`assumed`/`likely`/blank cells; A.15 arrays match final helper/RPC inventory; protected fingerprints match; only the spec file changed.

### §9 — Authorized file effect
Sole write: `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`. No edits to Stage 5 rollback, migrations, `src/**`, config, permissions, RPCs, or other docs. No DB/migration write tool.

### §10 — Terminal manifest returned in chat
Compact manifest: READY or BLOCKED (with exact remaining identifiers only), file path, new line count, new byte count, new SHA-256, preimage-match confirmation, sole-file-changed confirmation, no-DB-write-tool confirmation.

### Terminal line rule
- All six resolved → `AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.`
- Any unresolved → `AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [exact remaining identifiers], READ-ONLY, ZERO MUTATIONS.`
