# Prompt 55 — Continuation A1 — Corrected Proposed Execution Contract (read-only, not persisted)

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Stage 1. Repository, database, Storage, permissions, RLS writes: ZERO.

## A. Correction acknowledgement and withdrawal

All 11 elements listed in §3 of the parent prompt are withdrawn and are not carried into this contract: automatic `public` placement, service_role as tenant authority, broad browser DML, `UNIQUE (tenant_id, batch_id, file_sha256)`, tenant-global canonical-row uniqueness, one synchronous `import_approve_and_post`, unproven selective Finance rollback, hardcoded tenant-admin deletion authority, coarse permissions, mandatory destructive down-migration per slice, and migrations before the environment gate is resolved.

## B. Preserved verified facts

- Fact (DB, this turn): 158 tables in `public`; no other application schema exists. Repository convention is `public` + Data API exposure + RLS + explicit GRANTs.
- Fact (DB): zero Historical Import objects — no batch, file registry, staging, issue, mapping, dry-run, job, posting-link or event table.
- Fact (DB): 2 Storage buckets, both private (`horse-media` 50MB with MIME allowlist, `database_export_20_07_26` unrestricted). No import bucket.
- Fact (DB): canonical Finance writers exist and are SECURITY DEFINER with `search_path=''` — `create_invoice_with_items`, `update_invoice_with_items`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_invoice_payments`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `reverse_expense`.
- Fact (DB): `finance_request_idempotency` + `_finance_idempotency_begin/_complete` + `_finance_advisory_lock_key` provide an existing idempotency and locking precedent to reuse, not reinvent.
- Fact (DB): `ledger_entries.effective_date` is NOT NULL (Phase-1 closed contract). `permission_definitions(key, module, resource, action, is_delegatable, …)` is the atomic permission vocabulary; `has_permission()` is the enforcement helper.
- Preserved directions: Shared Core + Domain Adapter, Finance-first, Excel/PDF first, CSV supported, images registry-only, no OCR, zero inferred identity matching, no POS, no browser-direct financial DML, immutable provenance.

## C. Corrected assumptions

1. `public` is proposed **because the repository has no non-exposed application schema**, not by default; every object below still declares exposure, grants and DML policy explicitly.
2. `service_role` is an infrastructure role for server-side jobs only, never a tenant authorization mechanism, never browser-reachable.
3. Reversal capability is **unproven for payments and ledger postings** — `cancel_invoice`, `reverse_expense` and `post_manual_ledger_adjustment` exist; no canonical payment/session reversal function was found. This blocks the posting slice until resolved.
4. Posting volume characteristics are unknown; sync vs async is deliberately left open pending §T Decision 2 evidence.

## D. Environment decision gate (BLOCKING)

One Lovable Cloud Postgres project exists; no staging/import database. A Git branch gives no database isolation. **No migration, bucket, permission, policy or route may be created until the Owner selects A or B.**

Recommendation: **Option B — controlled implementation in the current environment**, because Lovable Cloud provides one managed project per app and a second environment would fork schema, permission and Finance-RPC lineage that Phase-1 just stabilized. Conditions: additive-only DDL, no change to existing Finance tables/functions, new objects inert until explicitly enabled, tenant-scoped test data only, rollback script per slice, and no production posting before the pilot gate.

## E–I. Corrected contract — objects, states, permissions, ACL

All tables: schema `public`, Data API exposed, RLS enabled, `tenant_id uuid not null`, `GRANT SELECT ON … TO authenticated` only where a read surface genuinely exists, `GRANT ALL … TO service_role`, **no** anon grant, **no** browser INSERT/UPDATE/DELETE. All mutations are RPC-mediated; RPCs are SECURITY DEFINER with `SET search_path = ''` and fully qualified names; private helpers are `REVOKE ALL FROM PUBLIC, anon, authenticated`.

| Object | Purpose | Key fields | Immutable | Unique / index | Browser SELECT | Retention / rollback |
|---|---|---|---|---|---|---|
| import_batches | batch lifecycle root | tenant_id, domain, status, created_by, approved_by, frozen_at | tenant_id, domain, created_by | idx(tenant,status); one active posting per batch | yes (import.batch.view) | never deleted |
| import_source_files | file identity & provenance | storage_path, file_sha256, size, mime, original_name, legal_hold, retained_until, deleted_at | sha256, size, mime, original_name | `UNIQUE(tenant_id, domain, file_sha256)` — cross-batch | yes | evidence survives file deletion |
| import_staging_rows | typed source rows | source_file_id, sheet, row_ordinal, raw jsonb, canonical jsonb, canonical_row_hash, state | source identity, raw | `UNIQUE(source_file_id, sheet, row_ordinal)`; **hash indexed, not unique** | yes | rows retained |
| import_row_issues | validation/quarantine findings | staging_row_id, severity, code, message_en/ar, resolved_by | code, raised_at | idx(batch, severity) | yes | retained |
| import_mappings | header→field mapping versions | domain, version, mapping jsonb | mapping per version | UNIQUE(tenant,domain,name,version) | yes | retained |
| import_dry_run_results | simulated outcome & variance | batch_id, run_no, totals jsonb, variance jsonb | whole row | UNIQUE(batch_id, run_no) | yes | retained |
| import_batch_approvals | immutable approval record | batch_id, frozen_fingerprint, approver, decided_at | whole row | UNIQUE(batch_id, sequence) | yes | never deleted |
| import_jobs | posting/parse job control | batch_id, kind, status, checkpoint, lock_key | kind, batch_id | partial UNIQUE(batch_id,kind) where active | yes | retained |
| import_job_attempts | retry evidence | job_id, attempt_no, started/ended, error | whole row | UNIQUE(job_id, attempt_no) | yes | retained |
| import_postings | provenance links (graph edges) | posting_group_id, staging_row_id, output_type, output_id, rpc_name, request_key, reversal_of | whole row | UNIQUE(tenant, output_type, output_id, request_key) | yes | reversal recorded as new row |
| import_events | immutable audit stream | batch_id, event_type, actor, payload, occurred_at | whole row | idx(batch, occurred_at) | yes (import.audit.view) | never deleted |

RLS pattern: `SELECT USING (tenant_id = current tenant AND public.has_permission(auth.uid(), '<key>'))`; no INSERT/UPDATE/DELETE policies for `authenticated` at all — writes only via SECURITY DEFINER RPCs that re-check `has_permission()` and tenant.

### G. Status transitions (RPC-mediated, event-logged)

`DRAFT → FILE_REGISTERED → STAGED → VALIDATING → {REVIEW_REQUIRED → …, READY_FOR_DRY_RUN} → DRY_RUN_COMPLETE → AWAITING_APPROVAL → APPROVED → POSTING → POSTED → RECONCILED`. Controlled exits: `FAILED`, `QUARANTINED` (blocks approval), `CANCELLED` (pre-approval only), and `ROLLBACK_REQUESTED → ROLLBACK_APPROVED → REVERSING → REVERSED` (post-POSTED only). Enforced by a transition table + trigger rejecting any non-listed pair; no direct status UPDATE path exists.

### H. Atomic permissions

All 23 keys from §11 adopted verbatim into `permission_definitions` (module `import`), each independently assignable and bundleable; no hardcoded role names. Enforced separations: review ≠ approval ≠ posting authorization ≠ posting execution; rollback request ≠ approval ≠ execution. A single person holding all keys may complete the workflow, with each stage still emitting a distinct actor-stamped event.

## J. Idempotency and fingerprints

File identity = SHA-256 + size + MIME (immutable). Duplicate detection is **cross-batch** via `UNIQUE(tenant_id, domain, file_sha256)`; a repeat upload surfaces warn/link/reject/authorized-reprocess depending on prior batch state and posting outcome. Row identity = `(source_file_id, sheet, row_ordinal)`. `canonical_row_hash` is **indexed for comparison and evidence only** — never a uniqueness constraint — so legitimate repeated business transactions (identical daily charges) stay importable. Duplicate *posting* is prevented by a per-posting-unit immutable `request_key` reused through the existing `finance_request_idempotency` mechanism. Business duplicates are detected by Domain Adapter rules (document number + economic date + entity) that raise a reviewable issue, never a silent block.

## K. Posting and resumability

Approval freezes a batch fingerprint; any later staging edit invalidates approval. Posting authorization and execution are separate permissions and separate RPC calls. Execution runs as a job over bounded chunks, one idempotent transaction per posting unit, with checkpointing in `import_jobs.checkpoint` and attempts recorded; retries resume after the last proven checkpoint and re-posting is impossible because the request key already resolved. Concurrency is blocked by a partial unique active-job index plus `pg_advisory_xact_lock` on `_finance_advisory_lock_key(tenant,'import_batch',batch_id)`. Sync vs async is left open pending volume evidence. `POSTED → RECONCILED` requires a zero-variance reconciliation.

## L. Provenance graph

`import_postings` is a many-to-many edge set, not a 1:1 map: one row may yield several outputs, several rows may fold into one invoice via `posting_group_id`, and header/item and payment/ledger relationships are edges carrying output type, output id, RPC name, request key, actor, timestamp and `reversal_of`.

## M. Rollback and reversal

Schema rollback (drop/repair new objects before real data depends on them) is separate from business reversal. Business reversal uses canonical compensating functions only — **no DELETE of Finance rows, ever**. Proof matrix required before any posting slice: invoices → `cancel_invoice` (available); expenses → `reverse_expense` (available); manual ledger → `post_manual_ledger_adjustment` (available); **payments / payment sessions / invoice payment postings → no canonical reversal function found (gap)**. Until that gap is closed, the payment-posting adapter stays blocked. No destructive automatic down-migration is required once real data exists.

## N. Storage security and retention

New private bucket `historical-imports`: tenant-prefixed non-guessable paths, write-once (no overwrite/upsert), SHA-256 verified after upload, MIME sniffed server-side against an allowlist (xlsx/xls/csv/pdf; images registry-only), configurable size limit, sanitized original filename stored as metadata, short-lived signed upload/download URLs, no public URL, no file contents in logs, malformed files quarantined. Retention: files kept while pending/review/quarantined/failed/reconciling/under investigation/legal hold; minimum 90 days after successful posting; deletion requires `import.file.delete` (atomic, no role hardcoding) and never removes identity, checksum, provenance, mappings, validation, quarantine, reconciliation, posting links, approvals, rollback evidence or audit events. Retention period stored as configurable metadata. No deletion automation in the first slice. Malware scanning: classified as an **external integration dependency required before the production pilot**, not implemented here.

## O. Parsing boundary

Server-authoritative; no browser parse is ever authoritative; no library selected yet. Scope: workbook/sheet discovery, AR/EN header mapping, Latin↔Arabic-Indic numeral normalization, date-system detection with Asia/Riyadh handling, formula and merged-cell rules, empty-row policy, row/file caps, PDF digital-text detection with table-extraction confidence and quarantine on ambiguity, CSV encoding/delimiter detection, no OCR.

## P. Bounded execution slices

3A core schema + state machine; 3B permissions, RLS, grants, helpers, negative cross-tenant tests; 3C private bucket, path contract, Storage policies, signed URLs, retention metadata. Each needs separate Owner authorization, exact migration, exact rollback, independent QA, Acceptance Re-Audit, zero-regression evidence. These map onto existing Planned Technical Sequence Step 3 without renumbering any Phase or Step. No slice number is consumed here.

## Q. Dependencies

Phase-1 economic-date contract (closed, unchangeable); canonical Finance RPCs; `has_permission()` / `permission_definitions`; `finance_request_idempotency`; Storage; WS-DH-2026-0007 downstream; WS-DH-2026-0005 POS excluded.

## R. Risks

Single-environment DDL risk; unproven payment reversal; unknown volumes; PDF extraction ambiguity; permission sprawl (23 keys) needing bundles; retention/legal-hold correctness; no malware scanning yet.

## S. Acceptance criteria

All 26 criteria in §19 adopted verbatim as the acceptance set for the Workstream, including zero cross-tenant access, PUBLIC/anon denied, separation-of-duty and all-permissions-single-user tests, retry-zero-duplicate, safe partial-failure resume, concurrency prevention, full provenance linkage, `effective_date` always supplied, quarantine and variance blocking approval, evidence survival after file deletion, proven rollback before pilot, and green build/typecheck/Finance regressions.

## T. Owner decisions required

1. **Environment** — A (new non-production environment) vs B (controlled current environment). Recommendation: **B**, under the conditions in §D.
2. **Representative source evidence** — representative Excel and PDF specimens, max file size, max rows per file, expected monthly batch volume, required before parser and sync/async selection.

Retention (90-day minimum) and atomic-permission deletion authority are already decided and are not reopened.

## U–Y. Classification

- **Facts:** everything in §B (live DB/Storage/catalog reads this turn).
- **Lovable claims:** single managed Cloud Postgres project per app; no separate staging DB provisioning surface.
- **Inferences:** `public` placement by repository convention; async chunked posting suitability; advisory-lock reuse; reconciliation gate.
- **Gaps:** no canonical payment/ledger reversal function; no volume or specimen evidence; no malware scanning; environment decision unresolved.
- **Contradictions:** none detected between this contract and the WS-DH-2026-0006 package at v1.2.0.

## Z. Cross-task contamination check

NO CROSS-TASK CONTAMINATION DETECTED

## AA. Exact stopping point

Corrected proposed Execution Contract issued for external review. Not persisted. Zero repository, database, Storage, permission, RLS and Grant writes. Stage 1 remains open; Slice 3A is not authorized; no new Prompt number consumed; no Stage-1 Acceptance, Workstream Closure or Roadmap Closure is claimed. Next action: Owner decision on §T.
