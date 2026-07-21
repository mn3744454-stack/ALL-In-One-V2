## Stage 6 Specification Integrity & Contract-Reconciliation Pass — Plan

**Scope:** Read-only investigation of DB catalog and repo, then a single clean replacement of `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`. No other repo files. No DB mutations. No migration tool calls. No source/config/permission edits.

### §1 — Pre-rewrite integrity capture
- Run `sha256sum`, `wc -lc`, `git status --short` on the current spec.
- Compare against prior manifest (1431 lines / 98,968 bytes / `94b9686c…`) and the user-reported artifact (1168 lines / 122,714 bytes / `488e5b96…`).
- If neither matches, record `SPEC_POSTWRITE_MANIFEST_MISMATCH` with actual repo numbers in the new document. Do not claim prior accuracy.

### §2 — Clean-generation strategy (no in-place patching)
- Build the replacement at `/tmp/STAGE_06_EXECUTION_SPEC.clean.md` from scratch, section by section, and only after all §14 gates pass copy it to the authorized path.
- Final file must contain exactly one: title, pass declaration, repo-effect declaration, each numbered section, each of 14 RPCs, each of 6 adapters, each private-helper row, one Unresolved-identifiers section, one terminal-readiness line. Blocker `SPEC_DUPLICATE_MERGE_CORRUPTION` retired only after clean rebuild.

### §3 — Restore PLAN-LOCK public signatures (verbatim)
- Embed the 14 exact Finance-Core signatures from the directive without any overloads or expanded positional forms.
- Consequences: `approve_invoice` uses `invoices.issue_date`; `post_expense_with_ledger` uses `expenses.expense_date`; `reverse_expense` keeps `p_reason` + `p_reversal_date`; `post_payment` keeps `p_payment_method`, `p_account_id`, `p_payload`; POS/manual header+items live in `p_payload`.
- Adapters: single locked signature per operation (source identity + `p_caller_intent jsonb` + idempotency key). Blocker `PLAN_LOCK_RPC_SIGNATURE_DRIFT` retires only after every matrix row uses the exact signature.

### §4 — Locked idempotency & error taxonomy
- Purge `FIN_IDEMPOTENCY_MISMATCH` project-wide in the spec.
- Enforce: same-actor+same-hash → replay; different actor → `42501 FIN_IDEMPOTENCY_ACTOR_MISMATCH`; different hash → `23514 FIN_IDEMPOTENCY_CONFLICT`; active `response IS NULL` → `40001 FIN_IDEMPOTENCY_IN_PROGRESS`; expired rows use conditional reclaim (no delete-then-insert).
- Every RPC/adapter row uses its exact stable code — no generic `FIN_REF_MISSING_*` / `FIN_VALIDATION_*` / `FIN_AUTH_*` substitutions. Retires `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT`.

### §5 — Payment mechanical correction
- Re-query and embed live labels for `payment_intent_type`, `payment_reference_type`, `payment_status`; `validate_payment_intent` body; `payment_accounts` fields; current payment-method mapping; allocation/overpayment behavior.
- Rebuild `post_payment` contract preserving locked signature, valid `payment_intents` insert with enumerated live enums, `p_payment_date` used only for ledger `effective_date`, negative payment ledger, account+currency validation, full client balance-chain rebuild, server-derived `partial|paid`, stored-response replay, no new business-date column.
- If a valid `p_payment_method` → live enum mapping cannot be proven from evidence, retain `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`; do not invent `completed`.

### §6 — Expense + HR contracts
- Creation always produces `pending + unposted`; embed full 4-row lifecycle table.
- `post_expense_with_ledger`: uses `expenses.expense_date`; one positive ledger row (`entry_type='expense'`, `reference_type='expense'`, `reference_id=expense.id`, `client_id=NULL`, `balance_after=0`); locked state transitions and rejection codes.
- Model-B reversal: lock original; reject `source_type='hr_salary_payment'`; insert new positive reversal expense (`category='reversal'`, `reverses_expense_id`, `ledger_status='posted'`, null source, reversal date, reason); one negative ledger row referencing the reversal expense with `metadata.kind='expense_reversal'`; mark original `ledger_status='reversed'`; preserve original workflow status + row + ledger.
- Split private HR path: public expense payloads cannot set `source_type`/`source_reference`; `record_salary_payment` uses explicit trusted private parameters (or dedicated private HR expense helper) to set exactly `source_type='hr_salary_payment'`, `source_reference=salary_payment_id`; salary row inserted before sourced expense; `finance_expense_id` update only if the column/FK is verified live.
- Retires `PLAN_LOCK_EXPENSE_STATE_DRIFT`, `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT`, `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION`.

### §7 — Private-helper contracts
- `_finance_ledger_insert`: generalize with `p_entry_type`, `p_reference_type`, `p_reference_id`, `p_amount`, `p_effective_date`, `p_description`, `p_metadata`, live audit fields (payment/session only if verified). Acquire tenant+client advisory lock for non-null client; insert; rebuild full client chain ordered by `(effective_date, created_at, id)`; update all affected `balance_after`; upsert `customer_balances`; null-client rows use `balance_after=0` and skip customer balance.
- `_finance_billing_link_upsert`: operate under caller's tenant-qualified source advisory lock; inspect full existing link set; allow identical verified link as replay; reject conflicting active occurrence; allow cancelled corrective rebill only with verified `corrects_invoice_id`; preserve historical cancelled links; never overwrite; never assume single-row history.
- Invoice-persistence helper: prohibit caller control of workflow state / totals / tenant / actor / domain source identity / corrective lineage on manual calls / ledger fields. System-managed fields as explicit trusted private parameters.
- Helper census: one row per helper with exact signature, trusted params, callers, dependencies, owner, `SECURITY DEFINER`, `search_path=''`, owner-only EXECUTE, exact create/drop order. Retires `PLAN_LOCK_HELPER_CONTRACT_DRIFT`.

### §8 — POS inventory contract
- Remove every claim of `NONE` / `FIN_POS_INVENTORY_OUT_OF_SCOPE` / `CURRENT_POS_INVENTORY_MUTATION = NONE`.
- Investigate: does Stage 6 POS sell services only, stocked products, or both? Enumerate live inventory tables, FK path from a POS/cart line to a stocked product, warehouse resolution, stock validation (on-hand/reserved/allow-negative), movement/transaction rows, quantity-update triggers, tenant parity, unique-conflict mapping.
- Service-only lines: explicitly prove zero stock effect.
- Stocked lines: full contract with rollback-by-transaction across stock/payment/item/link/session.
- Session totals: materially update, or reconcile a verified aggregate-on-read implementation with PLAN-LOCK; `UPDATE updated_at` alone is not acceptable.
- If cart→product connection cannot be mechanically established from live schema+code, retain `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED` and refuse READY.

### §9 — Server-authoritative invoice numbers
- Enumerate every verified current format family per tenant/domain/surface; identify the input that selects the format.
- Contract: generate the final number inside the transaction; serialize any counter-based format safely; collision handling without `MAX(right(...))`; reject caller-supplied final `invoice_number`; return server-generated number in response + snapshot.
- If tenant configuration required for prefix policy is missing, name the exact missing configuration; do not accept arbitrary caller text.
- If a single server design cannot be locked from evidence, retain `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`. Tenant-scoped uniqueness alone does not resolve it.

### §10 — Rebuild writer census as two censuses
- **Mutation census** — only `INSERT / UPDATE / UPSERT / DELETE / RPC/edge mutation`. Search across single- and double-quoted `.from`, multi-line chains, wrapper functions, shared utilities, generated-client aliases actually used, edge/service-role mutations, demo seed/reset mutations, POS/inventory writers, `useExpenses.ts`, `useSalaryPayments.ts`, adapter invoice creators. Per site: file:line, target, op, caller payload, resolved fields, order, validation, permission assumption, idempotency, Stage 6 replacement RPC/adapter, Stage 8 disposition.
- **Read-side dependency census** — separate table of reads Stage 6/8 must preserve; never used to inflate mutation count.
- Compare mutation count to the prior 57 baseline and explain inclusions/exclusions (readers vs. writers). No forced parity. Retires `WRITER_CENSUS_METHOD_INVALID`.

### §11 — Twelve payload contracts (full scope)
- Deliver exactly these 12 contracts, one dedicated table each, no generic collapsing: (1) manual invoice create, (2) manual invoice update, (3) payment supplemental payload, (4) expense create, (5) expense update, (6) POS finalize, (7) Housing adapter, (8) Laboratory adapter, (9) Doctor adapter, (10) Vet adapter, (11) Vaccination adapter, (12) Breeding adapter.
- Each row has all 10 metadata columns: Field, Exact type, Required/Optional/Forbidden, Caller/Server ownership, Editable state, Validation source, In request hash?, In resolved snapshot?, In response?, Disposition (Accepted/Recomputed/Rejected). Retires `PAYLOAD_CONTRACT_SCOPE_INVALID`.

### §12 — Embed authoritative evidence inside the spec
- For every decisive catalog claim embed: query text, raw result excerpt, interpretation, locked consequence. Remove all references to `/tmp/s6/`.
- Minimum embedded evidence: payment enum labels + `validate_payment_intent` definition; all target-table columns used by helpers; POS/inventory relations and triggers; invoice-number census; `billing_links` schema + census; HR expense-link column; unique indexes; Stage 3–5 no-drift; Stage 4 permissions; protected financial fingerprints. Retires `CATALOG_EVIDENCE_NOT_EMBEDDED`.

### §13 — Rebuild F0 and A.15 SQL blocks
- **F0 forward:** `BEGIN`; exact current 4-value CHECK pre-guard; assert zero existing `expense` rows; drop exact constraint; add exact 5-value CHECK; post-verify; protected fingerprints; `COMMIT`.
- **F0 rollback:** assert exact 5-value CHECK; abort if any `entry_type='expense'` row exists; restore exact 4-value CHECK; post-verify; `COMMIT`; no `CASCADE`.
- **A.15:** single `DO $g$` block with exact seven Stage 5 helper names, exact final Stage 6 public/private function names, `pg_depend` scan, installed Stage 6 census, `pg_get_functiondef` text scan limited to `prokind IN ('f','p')`, properly closed queries/IF/dollar-quoting.
- Parse-only validation via any pre-existing local parser; no package installs, no DB execution. Retires `F0_SQL_ARTIFACT_CORRUPT`, `A15_SQL_ARTIFACT_CORRUPT`.

### §14 — Structural gates before replacement
Run all gates against `/tmp/STAGE_06_EXECUTION_SPEC.clean.md`; any failure blocks the copy.
- **14.1 Uniqueness:** exactly one occurrence of each numbered section, each RPC heading, each adapter heading, `Unresolved identifiers`, `Terminal readiness`.
- **14.2 Signatures:** programmatic diff of the 14 identity signatures against §3 verbatim.
- **14.3 Superseded-token scan (fail on any of):** `FIN_IDEMPOTENCY_MISMATCH`, `FIN_POS_DUPLICATE_CART`, `FIN_POS_INVENTORY_OUT_OF_SCOPE`, `CURRENT_POS_INVENTORY_MUTATION = NONE`, `Inventory validation & mutation — NONE`, `MAX(right(`. Historical mentions allowed only inside an explicitly labeled rejected-design evidence block.
- **14.4 Duplicate/contradiction scan:** no duplicate helper rows, no duplicate census IDs, no simultaneous `READY`+`BLOCKED`, no both "unresolved"+"none", no repeated section numbering, balanced Markdown fences, balanced SQL dollar quotes, no `TBD`/`to confirm`/`assumed`/`likely`/`placeholder`/`XXX`, no references to absent companion artifacts.
- **14.5 Content gates:** 14 RPCs × 20 populated fields; 6 complete adapters; 12 complete payload contracts; mutation census separate from reader census; Model-B positive reversal expense + negative reversal ledger present; POS inventory contract present or exact blocker retained; invoice-number server policy present or exact blocker retained; exactly one terminal line.

### §15 — Terminal decision rules
- Allowed only if every listed blocker is mechanically resolved:
  `SPEC_POSTWRITE_MANIFEST_MISMATCH`, `SPEC_DUPLICATE_MERGE_CORRUPTION`, `PLAN_LOCK_RPC_SIGNATURE_DRIFT`, `PLAN_LOCK_IDEMPOTENCY_ERROR_DRIFT`, `PAYMENT_INTENT_ENUM_MAPPING_UNRESOLVED`, `PLAN_LOCK_EXPENSE_STATE_DRIFT`, `PLAN_LOCK_EXPENSE_REVERSAL_DRIFT`, `PRIVATE_EXPENSE_SOURCE_CONTRACT_CONTRADICTION`, `PLAN_LOCK_HELPER_CONTRACT_DRIFT`, `POS_INVENTORY_STAGE6_DESIGN_UNRESOLVED`, `INVOICE_NUMBER_SERVER_POLICY_UNRESOLVED`, `WRITER_CENSUS_METHOD_INVALID`, `PAYLOAD_CONTRACT_SCOPE_INVALID`, `CATALOG_EVIDENCE_NOT_EMBEDDED`, `F0_SQL_ARTIFACT_CORRUPT`, `A15_SQL_ARTIFACT_CORRUPT`.
- READY line only if all resolved; otherwise BLOCKED line with exact remaining identifiers. Exactly one terminal line in the file.

### §16 — Authorized effects & final manifest
- Sole file changed: `docs/aml_1_b_1/stage_06_readiness/STAGE_06_EXECUTION_SPEC.md`. No other repo file. No DB/migration write tool.
- Final chat manifest returns: actual pre-rewrite SHA/lines/bytes; whether prior manifest matched; final decision; exact remaining identifiers; final path; final line count; final byte count; final SHA-256; structural-gate results; count of terminal lines; count of RPC headings; count of adapter headings; count of payload-contract tables; confirmation only the authorized file changed; confirmation no DB/migration write tool called. No delivery-channel questions.

### Technical notes (for reviewer)
- Investigation uses `psql`/`supabase read_query` (read-only), `rg` for repo sweeps, `sha256sum`/`wc` for file metrics, and a parse-only Markdown/SQL validator step against the `/tmp` candidate. The `code--supabase migration/insert/deploy_edge_functions/storage_*` and any repo-write tools are not invoked for anything other than the single authorized file replacement.
- Terminal line rules: exactly one of
  `AML.1.b.1 STAGE 6 FINAL READINESS: READY — READ-ONLY, ZERO MUTATIONS.`
  or
  `AML.1.b.1 STAGE 6 FINAL READINESS: BLOCKED — [exact remaining identifiers], READ-ONLY, ZERO MUTATIONS.`
