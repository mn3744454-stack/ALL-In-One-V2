# 05 — Migration A Composed-Helper Contract Capture

Status: PREFLIGHT EVIDENCE (not final Mini Documentation).
Turn:   J5.2-SLICE-01-EXECUTION — TURN 2.
Scope:  Exact live contracts of the helpers Migration A composes.

Full definitions captured live from `pg_get_functiondef` under `docs/aml_1_b_1/stage_j5_2/preflight/helpers/*` are cross-referenced by the row-level tables below; the essential Migration-A contract is summarised here.

---

## A. Signature Reconciliation vs. Prompt

| Prompt-listed signature | Live signature | Compatibility |
|---|---|---|
| `create_invoice_with_items(uuid,uuid,jsonb)` | `create_invoice_with_items(uuid,uuid,jsonb) -> jsonb` | ✅ exact |
| `approve_invoice(uuid,uuid,uuid)` | `approve_invoice(uuid,uuid,uuid) -> jsonb` | ✅ exact |
| `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | identical | ✅ exact |
| `_finance_billing_link_upsert(uuid,text,uuid,uuid,text,numeric,uuid,uuid)` | identical | ✅ exact |
| `_finance_idempotency_begin(uuid,text,uuid,uuid,jsonb,jsonb)` | identical, returns `TABLE(is_replay,request_hash,stored_response)` | ✅ exact |
| `_finance_idempotency_complete(uuid,text,uuid,uuid,bytea,jsonb,jsonb)` | identical | ✅ exact |
| `_finance_source_lock_key(uuid,text,uuid)` | identical → `bigint` | ✅ exact |
| `_finance_invoice_payload_reject_unknown(jsonb,text,text[])` | live is 1-arg: `(jsonb)` | ⚠ signature drift — live rejects unknown ROOT keys from a fixed hard-coded allowlist; caller cannot narrow scope |
| `_finance_invoice_compute_totals(uuid,jsonb,numeric,boolean)` | live is 2-arg: `(uuid,jsonb)` — mode/rate are resolved server-side from tenant config + payload | ⚠ signature drift — compatible; Migration A must not pass explicit rate/mode |
| `_finance_invoice_number_next(uuid,text)` | identical | ✅ exact |
| `_finance_ledger_insert(...)` | 12-arg live | ✅ exact (not directly called by Migration A) |
| **`_finance_source_checkout_apply_trace(uuid,uuid,text,uuid)`** | **DOES NOT EXIST in live catalog** | ❌ **MISSING** |

Verification query used:

```sql
SELECT p.oid::regprocedure
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname = '_finance_source_checkout_apply_trace';
-- (0 rows)
```

---

## B. `create_invoice_with_items(p_tenant_id, p_idempotency_key, p_payload)`

- **Owner / SECDEF / search_path:** `postgres` / `SECURITY DEFINER` / `''`.
- **Auth gates:** `auth.uid()` non-null; `is_active_tenant_member`; `has_permission(...,'finance.invoice.create')`.
- **Root payload validation:** `_finance_invoice_payload_reject_unknown(p_payload)` — hard-coded root allowlist (single-argument form; caller cannot pass a narrower whitelist).
- **Required root fields:** `issue_date` (date, ≤ Riyadh today + 7). Optional `due_date` (≥ issue_date), `client_id` OR `client_name` (client_id resolves canonical `COALESCE(name_ar,name)`), `notes` (≤ 500 chars).
- **Item construction:** delegates entirely to `_finance_invoice_compute_totals`. Items written from `v_computed->'items'` include exactly: `description, quantity, unit_price, total_price, service_id, service_source, horse_id, lab_horse_id, domain, category_id, period_start, period_end, package_id, package_source, package_name_snapshot, package_name_ar_snapshot, package_price_snapshot, package_currency_snapshot, package_services_snapshot, position, line_pretax_amount, line_tax_amount, line_gross_amount, taxable_snapshot, tax_rate_snapshot`.
- **NOT written by this helper:** `entity_type`, `entity_id`, `period_start/end` for boarding, or any operational source trace. The columns are simply NULL after insert.
- **Invoice status on return:** `'draft'`.
- **Response keys:** `invoice_id, invoice_number, status='draft', header (= full compute payload), client_id, issue_date, due_date, prices_include_tax`.
- **Idempotency:** owns its own `begin/complete` under op `'create_invoice_with_items'` keyed by `p_idempotency_key`.
- **Migration A usage:** call with a *deterministic child* idempotency key derived from the outer key (e.g. `uuid_generate_v5(outer, 'child:create')` — helper `uuid_generate_v5` is available via `extensions`). Root payload MUST carry `issue_date`, `client_id` (resolved server-side for Horse Order) or `client_name` (walk-in / Lab Sample derived), `notes` (optional), `prices_include_tax` (echoed from caller when Boolean, omitted when NULL), plus the caller-constructed `items[]`. Root MUST NOT include `client_id` from the outer caller directly.

---

## C. `approve_invoice(p_tenant_id, p_idempotency_key, p_invoice_id)`

- Auth gates: `auth.uid()`, `is_active_tenant_member`, `has_permission(...,'finance.invoice.approve')`.
- Owns idempotency (op `'approve_invoice'`).
- Internally calls `_finance_invoice_approve_inline` (private helper that promotes `draft → approved`, writes ledger row, requires ≥1 item).
- **Response keys:** `invoice_id, invoice_number, status='approved', ledger_entry_id, balance_after, effective_date`.
- **Composable inside outer transaction:** ✅ yes.
- Migration A supplies a deterministic child key `uuid_generate_v5(outer, 'child:approve')`.

---

## D. `post_payment(p_tenant_id, p_idempotency_key, p_invoice_id, p_amount, p_payment_date, p_payment_method, p_account_id, p_payload)`

- Auth gates: `auth.uid()`, `is_active_tenant_member`, `has_permission(...,'finance.payment.create')`.
- **Payload whitelist:** only `notes | currency | reference`; any other root key raises `FIN_PAYLOAD_UNKNOWN_KEY`.
- Requires invoice in `('approved','partial')`; over-payment raises `FIN_PAYMENT_OVERPAYMENT`.
- Writes payment ledger row (negative amount), then `_finance_billing_link_upsert(..., 'payment', v_ledger_id, p_invoice_id, 'final', p_amount, actor, NULL)` — this is the *payment* billing link, separate from the *source* billing link Migration A is responsible for.
- Updates invoice status to `paid` (fully) or `partial`.
- **Response keys:** `invoice_id, ledger_entry_id, billing_link_id, remaining_after, invoice_status`.
- Migration A supplies a deterministic child key `uuid_generate_v5(outer, 'child:pay')` for cash / card / transfer methods.

---

## E. `_finance_billing_link_upsert(tenant, source_type, source_id, invoice_id, link_kind, amount, created_by, corrects_invoice_id)`

- Eighth argument (`p_corrects_invoice_id`) is `NULL` for the **source** link.
- Allowed link kinds: `deposit | final | refund | credit_note`.
- Migration A calls with `p_source_type ∈ {'lab_sample','horse_order'}`, `p_link_kind ∈ {'deposit','final'}`, `p_corrects_invoice_id = NULL`.

---

## F. Idempotency Helpers

- `_finance_idempotency_begin` returns `(is_replay, request_hash, stored_response)`. `is_replay=true` → return `stored_response` unchanged; conflict on same key with different payload raises `FIN_IDEMPOTENCY_CONFLICT` internally.
- `_finance_idempotency_complete` records the terminal response; called once at the end of each helper.
- Migration A wraps the whole checkout with an **outer** idempotency scope (op `'create_source_checkout_invoice'`, key = caller `p_idempotency_key`) and derives child keys deterministically for each composed helper so replays are safe end-to-end.

---

## G. Source Trace Helper — MISSING

`public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)` — the trace function referenced by the prompt — does not exist in the live catalog (verified via `pg_proc` census in §A). No overload of any arity exists.

The composed-helper pipeline described in §8.8 mandates a *trusted source trace* step between `create_invoice_with_items` and `approve_invoice`, whose purpose is to populate `invoice_items.entity_type = <source_type>` and `invoice_items.entity_id = <source_id>` on the rows written by `create_invoice_with_items` (which leaves those columns NULL).

Two placement options exist:

1. **Inline `UPDATE public.invoice_items SET entity_type=..., entity_id=... WHERE invoice_id=v_inv_id`** inside Migration A.
2. **A new dedicated `_finance_source_checkout_apply_trace` helper** that Migration A calls.

Both options fire `trg__invoice_items_validate_source` on the affected rows. That trigger is the exact object Migration B is chartered to correct (Laboratory identity relationship — currently rejects standalone lab horses that are related via `party_horse_links` rather than `lab_horses.client_id`). Applying either option in Turn 2 (before Migration B lands) would keep the Lab Sample regression open at the trigger and directly contradict the Slice 01 objective.

See §H for the exact hard-fail this creates.

---

## H. Hard-Fail Gate — MIGRATION A NOT AUTHORED

The Section 7 hard-fail catalogue includes condition #6:

> the source trace helper would corrupt or misattribute Items

The live database has **no source trace helper of any arity**, and the only alternative (inline UPDATE within Migration A) is guaranteed to invoke `_invoice_items_validate_source` under its current Lab-hostile definition. Because Turn 2 explicitly forbids modifying `_invoice_items_validate_source` (that is Migration B), Migration A cannot produce a correct atomic Lab Sample Deposit or Final path in this turn without either:

- (a) importing Migration B into Turn 2 (explicitly excluded);
- (b) omitting the trusted source trace step (violates §8.8 pipeline and §8.14 response contract that returns `source_type/source_id` for downstream reconciliation);
- (c) fabricating a source-trace helper independently of Migration B's trigger correction (would corrupt Lab items today).

Verdict: **`MIGRATION_A_BLOCKED_MISSING_SOURCE_TRACE_HELPER`** — resolved either by (i) authoring `_finance_source_checkout_apply_trace` as part of Migration A **and** advancing Migration B into the same turn, or (ii) issuing a corrected Turn 2 contract that repositions the source trace step until Migration B has landed.

---

## I. Migration A — Deferred to Corrected Turn Contract

No migration SQL was authored or applied in this turn. The rollback baseline captured in Files 01–04 remains the authoritative pre-change reference and is unchanged.
