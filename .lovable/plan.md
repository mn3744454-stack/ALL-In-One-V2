# Prompt 55 — Continuation A2 — Part 2 — Data, Tenant-Isolation and Security Model (read-only)

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Stage 1. Repository writes: ZERO. Database writes: ZERO. Storage writes: ZERO. No posting, reversal, parser, pilot or environment decision.

## A. Primary Part-2 verdict

A complete, implementable Shared-Core data, tenant-isolation, ACL, RLS and atomic-permission model is issued as a **proposal only**. It is conditionally coherent: every object, index and permission is defined without undefined columns, and the previously defective `import_row_issues` index and the provenance uniqueness defect are both resolved. One architectural fork (schema placement) remains conditionally recommended pending the unresolved PostgREST exposed-schema evidence carried forward from Part 1.

## B. Run identity and live boundary

| Item | Value |
|---|---|
| Branch | `edit/edt-2d65afff-ba87-4036-9533-a1abf4d9b41c` |
| HEAD | `21f6f688109216dd5b590c436ae8542d58b31070` |
| Parent 1 | `308a0e8aca12733b2ac31486ac7f63a31ae79580` (Part-1 HEAD) |
| Parent 2 | `70eda600d86051252a96d3701c7f4e58e7ad619f` |
| Working tree | clean — zero staged, unstaged, untracked paths |
| Lovable project ID | `64c79edd-f667-42bb-b896-147c63e0ff12` |
| Database ref | `vhxglsvxwwpmoqjabfmj` |
| Evidence time | 2026-08-06 00:12 UTC / 03:12 Asia/Riyadh |

**Drift since Part 1: YES (repository only).** A new edit branch and a new platform merge commit exist; the Part-1 HEAD is the first parent. No governance, code or database path relevant to this Workstream changed, the tree is clean, and the database boundary is unchanged. All Part-1 database evidence remains valid; no broad re-discovery was performed.

## C. Part-1 evidence consumed

All nine controlling items in §3 of this continuation are consumed unchanged: 158 base tables / 6 views / zero import relations; `public` as sole application schema; unresolved PostgREST exposed-schema configuration; mixed Finance ACL posture (`ledger_entries` browser read-only, `finance_request_idempotency` server-only, other Finance tables retaining browser-role DML grants under RLS); the explicit instruction not to copy that permissive posture; the canonical writer pattern; `service_role` as infrastructure only; single database boundary with no Git-branch isolation; Finance reversal gaps deferred to Part 3.

## D. Schema-placement fork

### Alternative A — `public` with RPC-controlled mutation

- **Benefits:** matches the only convention the repository actually has; zero new exposure configuration; simplest migrations; UI reads work through the existing Supabase client with no RPC wrapper for list screens; simplest support/debugging.
- **Risks:** every object sits on an API-exposed schema, so protection depends entirely on withheld grants plus RLS — a single accidental future `GRANT` re-opens raw payloads and Storage paths; sensitive columns (raw payload, storage path, job diagnostics, error text) live in the same relation as safe header data, forcing column-level discipline or split views.
- **PostgREST dependency:** none — behaves correctly under any exposed-schema configuration.
- **Migration complexity:** low.
- **Tenant isolation:** fully dependent on RLS correctness on every table.
- **UI reads:** direct `select` for allowed surfaces.
- **Operations:** easiest.

### Alternative B — hybrid `public` + non-exposed internal schema

- **Benefits:** raw payloads, job diagnostics, attempts and Storage internals are unreachable by the Data API *by construction*, not merely by withheld grants — defence in depth beyond RLS; safe headers/views stay in `public`.
- **Risks:** correctness depends on the internal schema genuinely not being exposed, which Part 1 could not verify; introduces a convention that exists nowhere else in this repository (158/158 application tables are in `public`), raising long-term maintenance and contributor-error risk; cross-schema foreign keys and definer functions need careful `search_path=''` fully-qualified discipline.
- **PostgREST dependency:** **high and unresolved** — the whole benefit collapses if the internal schema is exposed or later added to the exposed list.
- **Migration complexity:** moderate.
- **Tenant isolation:** same RLS obligations on the `public` surface, plus RLS still required on internal tables because `service_role` bypasses it anyway and definer functions must self-check.
- **UI reads:** all internal data must pass through RPCs or views.
- **Operations:** harder — support queries and platform tooling assume `public`.

## E. Conditional architecture recommendation

**Conditionally recommend Alternative A**, hardened by column separation: keep every object in `public`, grant `authenticated` SELECT only on the safe header/summary tables and permission-filtered views, grant no SELECT at all on raw-payload, job-diagnostic and Storage-path tables, and route every mutation and every sensitive read through narrowly scoped `SECURITY DEFINER` RPCs.

Evidence still required before final selection:
1. the authoritative PostgREST exposed-schema configuration (Part-1 gap 2);
2. confirmation that a non-exposed schema is durable across platform-managed configuration changes;
3. whether Lovable's managed tooling (types generation, linter, backups) fully supports a second application schema.

If (1) and (2) resolve favourably, Alternative B becomes the stronger security posture for `import_staging_rows`, `import_job_attempts` and `import_events` specifically. Schema placement is **not** an Owner-approved decision in this Part.

## F. Complete object matrix

Conventions applied to every object below: `id uuid pk default gen_random_uuid()`; `tenant_id uuid not null references public.tenants(id)`; `created_at`/`created_by` immutable; RLS enabled; **no** `anon` access; **no** `authenticated` INSERT/UPDATE/DELETE anywhere; all mutation via RPC. "A-schema" = placement under Alternative A, "B-schema" = under Alternative B.

| # | Object | A / B schema | Data API | Purpose | Key fields | Immutable | Mutable | FKs | Status | CHECKs | Uniqueness | Indexes | Delete | Retention | Browser SELECT | Perm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `import_batches` | public / public | exposed | batch lifecycle root | domain, title, status, frozen_fingerprint, frozen_at, counts | tenant_id, domain, created_by, created_at | title, status, frozen_* , notes | tenants | yes | status in enum set; frozen_at not null when status ≥ APPROVED | `(tenant_id, id)` implicit | `(tenant_id, status)`, `(tenant_id, created_at desc)` | never | permanent | yes (safe header) | `import.batch.view` |
| 2 | `import_source_files` | public / public | exposed | immutable file content identity | file_sha256, byte_size, detected_mime, declared_mime, original_name, storage_bucket, storage_path, legal_hold, retained_until, deleted_at | sha256, size, mimes, original_name, storage_path, created_by | legal_hold, retained_until, deleted_at, deleted_by | tenants | no | `byte_size > 0`; `char_length(file_sha256)=64` | **`(tenant_id, domain, file_sha256)`** — cross-batch | `(tenant_id, legal_hold)`, `(tenant_id, retained_until)` | row never deleted | permanent metadata; object ≥ 90 days post-posting | metadata yes; **`storage_path` not exposed** | `import.file.view` |
| 3 | `import_batch_files` | public / public | exposed | authorized use of a file by a batch | sequence, attachment_role, processing_intent, duplicate_disposition, reprocess_authorized_by/at/reason | batch_id, source_file_id, sequence, created_by | duplicate_disposition, processing_intent, reprocess fields | batches, source_files, tenants | yes (link state) | disposition in {new, linked, warned, rejected, authorized_reprocess}; reprocess fields all-or-none | `(batch_id, source_file_id)`, `(batch_id, sequence)` | `(tenant_id, source_file_id)` | never | permanent | yes | `import.batch.view` |
| 4 | `import_staging_rows` | public / **internal** | A: exposed / B: not | typed source rows | batch_file_id, sheet_name, row_ordinal, raw_payload jsonb, canonical_payload jsonb, canonical_row_hash, row_state, correction_version | batch_file_id, sheet, ordinal, raw_payload, correction_version 0 record | canonical_payload, hash, row_state, correction_version | batch_files, batches, tenants | yes | `row_ordinal >= 1`; `correction_version >= 0` | `(batch_file_id, sheet_name, row_ordinal, correction_version)` | `(tenant_id, batch_id, row_state)`, **non-unique** `(tenant_id, canonical_row_hash)` | never | with batch | **RPC-only** (raw payload) | `import.staging.view` |
| 5 | `import_row_issues` | public / **internal** | A: exposed / B: not | validation & quarantine findings | staging_row_id, tenant_id, batch_id, severity, code, field_path, message_en, message_ar, resolved_by/at, resolution_note | staging_row_id, code, severity, raised_at | resolved_*, resolution_note | staging_rows, batches, tenants | severity + resolved | severity in {info, warning, error, quarantine} | `(staging_row_id, code, field_path)` where unresolved | `(tenant_id, batch_id, severity)`, `(staging_row_id)` | never | with batch | filtered view only | `import.issue.view` |
| 6 | `import_mappings` | public / public | exposed | versioned header→field mapping | domain, name, version, mapping jsonb, is_active | mapping jsonb per version, version | is_active, description | tenants | active flag | `version >= 1` | `(tenant_id, domain, name, version)` | `(tenant_id, domain, is_active)` | never | permanent | yes | `import.mapping.view` |
| 7 | `import_dry_run_results` | public / public | exposed | simulated outcome & variance | batch_id, run_no, totals jsonb, variance jsonb, blocking_issue_count, executed_by | entire row | none | batches, tenants | no | `run_no >= 1` | `(batch_id, run_no)` | `(tenant_id, batch_id)` | never | permanent | yes | `import.reconciliation.view` |
| 8 | `import_batch_approvals` | public / public | exposed | immutable approval evidence | batch_id, sequence, kind (review_complete / approval / post_authorization / rollback_request / rollback_approval), frozen_fingerprint, permission_key_used, actor, decided_at, decision, reason | **entire row** | none | batches, tenants | decision | decision in {granted, refused}; kind in enum | `(batch_id, kind, sequence)` | `(tenant_id, batch_id, kind)` | never | permanent | yes | `import.audit.view` |
| 9 | `import_jobs` | public / **internal** | A: exposed / B: not | parse/validate/post job control | batch_id, kind, status, checkpoint jsonb, lease_owner, lease_expires_at, lock_key bigint | batch_id, kind, created_by | status, checkpoint, lease_* | batches, tenants | yes | kind in {parse, validate, dry_run, post, reverse} | partial unique `(batch_id, kind)` where status in {queued, running} | `(tenant_id, status)`, `(lease_expires_at)` | never | with batch | progress fields via RPC only | `import.batch.view` |
| 10 | `import_job_attempts` | public / **internal** | A: exposed / B: not | retry evidence | job_id, attempt_no, started_at, ended_at, outcome, error_code, error_detail, rows_processed | entire row | none | jobs, tenants | outcome | `attempt_no >= 1` | `(job_id, attempt_no)` | `(tenant_id, job_id)` | never | permanent | **server-only** (`error_detail`) | `import.audit.view` |
| 11 | `import_posting_runs` | public / public | exposed | one authorized posting execution | batch_id, run_no, authorized_by_approval_id, started_at, ended_at, status, units_total/succeeded/failed | batch_id, run_no, authorization link | status, counters, ended_at | batches, approvals, tenants | yes | `run_no >= 1` | `(batch_id, run_no)` | `(tenant_id, batch_id, status)` | never | permanent | yes | `import.batch.view` |
| 12 | `import_posting_units` | public / public | exposed | idempotent posting unit | posting_run_id, unit_key, request_key uuid, status, rpc_name, attempt_count, last_error_code | unit_key, request_key | status, attempt_count, last_error_code | posting_runs, tenants | yes | status in {pending, in_progress, succeeded, failed, skipped} | `(posting_run_id, unit_key)`; `(tenant_id, request_key)` | `(tenant_id, status)` | never | permanent | yes (no error detail) | `import.batch.view` |
| 13 | `import_output_objects` | public / public | exposed | canonical object produced | output_type, output_id, posting_unit_id, rpc_name, created_at | entire row | none | posting_units, tenants | no | output_type in domain enum | `(tenant_id, output_type, output_id, posting_unit_id)` | `(tenant_id, output_type, output_id)` | never | permanent | yes | `import.batch.view` |
| 14 | `import_provenance_edges` | public / public | exposed | many-to-many source↔output graph | staging_row_id, posting_unit_id, output_object_id, edge_role, reversal_of_edge_id | entire row | none | staging_rows, posting_units, output_objects, self | no | edge_role in {produces, contributes_to, header_of, item_of, ledger_of, reverses} | `(staging_row_id, output_object_id, edge_role)` — **never on `output_object_id` alone** | `(output_object_id)`, `(posting_unit_id)`, `(tenant_id)` | never | permanent | yes | `import.audit.view` |
| 15 | `import_events` | public / **internal** | A: exposed / B: not | immutable audit stream | batch_id, event_type, from_state, to_state, actor, permission_key_used, payload jsonb, occurred_at | **entire row** | none | batches, tenants | states | event_type in enum | `(batch_id, event_seq)` | `(tenant_id, batch_id, occurred_at)`, `(tenant_id, event_type)` | never (append-only trigger) | permanent | filtered view only | `import.audit.view` |

## G. Source-file / batch-file model

`import_source_files` holds **content and physical identity only** — SHA-256, byte size, declared and sniffed MIME, original filename, bucket, object path, legal hold, retention timestamp, deletion marker. It carries no batch, no lifecycle status and no processing intent.

`import_batch_files` holds **a batch's authorized use** of that file — sequence within the batch, attachment role, processing intent, duplicate disposition and explicit reprocess authorization (actor, timestamp, reason).

Supported outcomes: one batch → many files (many `import_batch_files` rows per `batch_id`); one file → many batches (many rows per `source_file_id`, each requiring its own disposition and, when the file was previously posted, an explicit `authorized_reprocess`); duplicate detection preserved because the file row is never re-created; reprocessing history preserved because each link row is retained.

Proposed uniqueness: `import_source_files` unique on `(tenant_id, domain, file_sha256)` — deliberately **not** including `batch_id`, so the same file is detected across batches. `import_batch_files` unique on `(batch_id, source_file_id)` and `(batch_id, sequence)`. Indexes: `(tenant_id, source_file_id)` on the link table for "where else was this file used". **No file hash is ever used as a business-transaction uniqueness rule.**

## H. Staging and issue model

`import_staging_rows` identity: `batch_file_id` (which transitively pins source file and batch), `sheet_name`, `row_ordinal`, `raw_payload` (immutable), `canonical_payload`, `canonical_row_hash`, `row_state` (`staged`, `valid`, `warned`, `quarantined`, `corrected`, `excluded`, `posted`), `correction_version`. Uniqueness `(batch_file_id, sheet_name, row_ordinal, correction_version)` so corrections append a version rather than overwrite the original. `canonical_row_hash` is indexed **non-uniquely** and used only for comparison and evidence — never as a tenant-global business rule, so legitimate repeated transactions remain importable.

**Issue-index defect resolution: Model A is chosen.** `import_row_issues` denormalizes `tenant_id` and `batch_id` onto each issue row.

- Fields: `staging_row_id`, `tenant_id`, `batch_id`, `severity`, `code`, `field_path`, `message_en`, `message_ar`, `raised_at`, `resolved_by`, `resolved_at`, `resolution_note`.
- FKs: `staging_row_id → import_staging_rows`, `batch_id → import_batches`, `tenant_id → tenants`.
- Indexes: `(tenant_id, batch_id, severity)` and `(staging_row_id)` — every referenced column is defined on this table, which removes the previous undefined-column defect.
- Consistency enforcement: a `BEFORE INSERT` trigger derives `tenant_id` and `batch_id` from the parent staging row rather than trusting the caller, plus a composite FK to `(id, tenant_id, batch_id)` on the staging row where supported.
- RLS consequence: the tenant predicate evaluates against a local column, so no sub-select into the parent is needed — simpler and cheaper policies.
- Query performance: batch-level issue counts and quarantine gates read one index without joining staging rows; the cost is one trigger per insert and a denormalization invariant.

Model B (issue linked only to `staging_row_id`) was rejected: it forces every RLS check and every batch-level count through a join, which is the most frequent query on the review screen.

## I. Approval and immutability model

Approval is never a mutable column on `import_batches`. It is one immutable row in `import_batch_approvals` per decision, carrying kind (`review_complete`, `approval`, `post_authorization`, `rollback_request`, `rollback_approval`), sequence, actor, `permission_key_used`, `decided_at`, `decision`, `reason`, and the exact `frozen_fingerprint` accepted. The fingerprint is a deterministic digest over the batch's staging-row canonical payloads, active mapping version and included batch-file set, computed at review completion and stored on both the batch and the approval row.

Invalidation: any correction, mapping change, file addition or re-stage recomputes the fingerprint; if it differs from the fingerprint on the latest approval, the batch cannot enter `POSTING` and must return to review. `import_batches.status` is a derived convenience only — the approval rows are the evidence. Every approval emits a matching immutable `import_events` row. Rows are protected by an append-only trigger rejecting UPDATE and DELETE.

## J. Job and attempt data model

`import_jobs`: `batch_id`, `kind`, `status` (`queued`, `running`, `succeeded`, `failed`, `cancelled`), `checkpoint jsonb` (last proven position, opaque to the browser), `lease_owner`, `lease_expires_at`, `lock_key bigint` (an advisory-lock key derived per batch and kind). A partial unique index on `(batch_id, kind)` where status is `queued` or `running` prevents concurrent duplicate jobs; lease expiry allows recovery of an abandoned worker without a second concurrent runner.

`import_job_attempts`: `job_id`, `attempt_no`, `started_at`, `ended_at`, `outcome`, `error_code`, `error_detail`, `rows_processed`; unique `(job_id, attempt_no)`; entire row immutable.

Sensitive-field classification: `checkpoint`, `lease_owner`, `error_detail` and any parser stack context are **server-only or RPC-filtered**. The UI receives only a progress summary — status, percent complete, attempt count, and a safe `error_code` with a localized message. No execution model (synchronous or asynchronous) is chosen here.

## K. Provenance graph model

Four objects form the graph: `import_posting_runs` (one authorized execution of one batch), `import_posting_units` (an idempotent unit of work carrying a stable `unit_key` and an immutable `request_key` reused as the canonical-RPC idempotency key), `import_output_objects` (one canonical object produced, typed), and `import_provenance_edges` (the many-to-many links).

Supported shapes: one source row → many outputs (multiple edges from one `staging_row_id`); many source rows → one output (multiple edges to one `output_object_id` with role `contributes_to`); one file → many posting units (through batch-file → staging rows → units); grouped invoice header and items (`header_of` / `item_of` edges into the same posting unit); payment and ledger relationships (`ledger_of`); reversal (`reverses` edge with `reversal_of_edge_id` self-reference); retry evidence (posting-unit attempt count plus the stable `request_key`).

Uniqueness: `import_output_objects` unique on `(tenant_id, output_type, output_id, posting_unit_id)`; `import_provenance_edges` unique on `(staging_row_id, output_object_id, edge_role)`. **There is deliberately no uniqueness on `output_object_id` alone**, so many edges may point at one grouped document. Indexes: `(output_object_id)` for reverse lookup from a Finance object, `(posting_unit_id)`, `(tenant_id)`. Whether any output type is actually reversible is **not** decided here — Part 3 owns that.

## L. State-transition matrix

Every transition is RPC-mediated, writes an `import_events` row, and is rejected by a transition-guard trigger if the pair is not listed. No arbitrary status UPDATE path exists.

| From | To | Permission | Invariant | Event | Trigger |
|---|---|---|---|---|---|
| — | DRAFT | `import.batch.create` | tenant + domain valid | `batch.created` | user |
| DRAFT | FILE_REGISTERED | `import.file.upload` | ≥1 batch-file with verified checksum; duplicate disposition set | `file.registered` | user |
| FILE_REGISTERED | STAGED | `import.batch.create` | active mapping selected; parse job succeeded | `batch.staged` | server |
| STAGED | VALIDATING | `import.batch.create` | ≥1 staging row | `validation.started` | server |
| VALIDATING | REVIEW_REQUIRED | — | ≥1 unresolved warning/error/quarantine | `validation.review_required` | server |
| VALIDATING | READY_FOR_DRY_RUN | — | zero unresolved blocking issues | `validation.clean` | server |
| REVIEW_REQUIRED | REVIEW_REQUIRED | `import.staging.correct` / `import.issue.resolve` | new correction_version; fingerprint recomputed | `row.corrected` / `issue.resolved` | user |
| REVIEW_REQUIRED | READY_FOR_DRY_RUN | `import.review.complete` | zero unresolved blocking issues | `review.completed` | user |
| REVIEW_REQUIRED | QUARANTINED | — | unresolvable quarantine issue present | `batch.quarantined` | server |
| READY_FOR_DRY_RUN | DRY_RUN_COMPLETE | `import.dry_run.execute` | dry-run result row written | `dry_run.completed` | user |
| DRY_RUN_COMPLETE | AWAITING_APPROVAL | `import.review.complete` | zero unexplained variance; fingerprint frozen | `batch.frozen` | user |
| AWAITING_APPROVAL | APPROVED | `import.approval.grant` | approval row matches current fingerprint; approver ≠ reviewer where separation enforced | `approval.granted` | user |
| AWAITING_APPROVAL | REVIEW_REQUIRED | `import.approval.grant` (refusal) | refusal recorded | `approval.refused` | user |
| APPROVED | POSTING | `import.post.authorize` + `import.post.execute` | post_authorization approval row exists; fingerprint unchanged; no active posting job | `posting.started` | user → server |
| POSTING | POSTED | — | all posting units succeeded or explicitly skipped | `posting.completed` | server |
| POSTING | FAILED | — | ≥1 unit failed and run halted | `posting.failed` | server |
| FAILED | POSTING | `import.post.execute` | resume from checkpoint; succeeded units not re-posted | `posting.resumed` | user |
| POSTED | RECONCILED | `import.reconciliation.view` + `import.review.complete` | reconciliation variance zero | `batch.reconciled` | user |
| DRAFT / FILE_REGISTERED / STAGED / VALIDATING / REVIEW_REQUIRED / READY_FOR_DRY_RUN / DRY_RUN_COMPLETE / AWAITING_APPROVAL | CANCELLED | `import.batch.cancel` | nothing posted | `batch.cancelled` | user |
| POSTED / RECONCILED | ROLLBACK_REQUESTED | `import.rollback.request` | reason recorded | `rollback.requested` | user |
| ROLLBACK_REQUESTED | ROLLBACK_APPROVED | `import.rollback.approve` | approver distinct from requester where separation enforced | `rollback.approved` | user |
| ROLLBACK_APPROVED | REVERSING | `import.rollback.execute` | **reversal capability proven for every output type in the batch (Part 3 gate)** | `reversal.started` | user → server |
| REVERSING | REVERSED | — | every output object has a `reverses` edge | `reversal.completed` | server |
| REVERSING | FAILED | — | reversal halted | `reversal.failed` | server |
| QUARANTINED | REVIEW_REQUIRED | `import.issue.resolve` | quarantine cleared | `quarantine.cleared` | user |
| QUARANTINED / FAILED | CANCELLED | `import.batch.cancel` | nothing posted | `batch.cancelled` | user |

Terminal states: `POSTED`→`RECONCILED`, `REVERSED`, `CANCELLED`. `QUARANTINED` blocks approval absolutely.

## M. Atomic permission matrix

All keys follow the live `permission_definitions(key, module, resource, action, is_delegatable, …)` shape, module `import`. No role name is hardcoded anywhere; the Owner groups keys into reusable bundles through the existing bundle mechanism.

| Key | Resource | Action | Delegatable | Sensitive | UI surface | Backend enforcement | Event |
|---|---|---|---|---|---|---|---|
| `import.batch.view` | batch | view | yes | no | batch list/detail | RLS SELECT + RPC read | no |
| `import.batch.create` | batch | create | yes | no | new batch | RPC `import_batch_create` | yes |
| `import.batch.cancel` | batch | cancel | yes | yes | batch actions | RPC transition guard | yes |
| `import.file.upload` | file | upload | yes | yes | upload dialog | signed-upload RPC + registration RPC | yes |
| `import.file.view` | file | view | yes | no | file metadata panel | RLS SELECT (path excluded) | no |
| `import.file.download` | file | download | yes | yes | download action | signed-URL RPC | yes |
| `import.file.delete` | file | delete | **no** | yes | retention screen | RPC; retention + legal-hold invariants | yes |
| `import.file.legal_hold.manage` | file | legal_hold.manage | **no** | yes | retention screen | RPC | yes |
| `import.mapping.view` | mapping | view | yes | no | mapping panel | RLS SELECT | no |
| `import.mapping.manage` | mapping | manage | yes | no | mapping editor | RPC | yes |
| `import.staging.view` | staging | view | yes | yes (raw payload) | review grid | RPC-filtered read | no |
| `import.staging.correct` | staging | correct | yes | yes | review grid | RPC; new correction_version | yes |
| `import.issue.view` | issue | view | yes | no | issues panel | filtered view | no |
| `import.issue.resolve` | issue | resolve | yes | yes | issues panel | RPC | yes |
| `import.dry_run.execute` | dry_run | execute | yes | yes | dry-run action | RPC | yes |
| `import.reconciliation.view` | reconciliation | view | yes | no | reconciliation panel | RLS SELECT | no |
| `import.review.complete` | review | complete | yes | yes | review action | RPC; freezes fingerprint | yes |
| `import.approval.grant` | approval | grant | **no** | yes | approval action | RPC; fingerprint match | yes |
| `import.post.authorize` | post | authorize | **no** | yes | posting authorization | RPC; writes approval row | yes |
| `import.post.execute` | post | execute | **no** | yes | run posting | RPC; requires authorization row | yes |
| `import.rollback.request` | rollback | request | yes | yes | rollback action | RPC | yes |
| `import.rollback.approve` | rollback | approve | **no** | yes | rollback approval | RPC | yes |
| `import.rollback.execute` | rollback | execute | **no** | yes | run reversal | RPC; Part-3 capability gate | yes |
| `import.audit.view` | audit | view | yes | no | audit stream | filtered view | no |

Separation of duties is achievable because review, approval, post authorization and post execution are four distinct keys, and rollback request/approve/execute are three more. A single fully authorized person may hold all keys and complete the workflow; each stage still writes its own actor-stamped approval row and event, so the audit trail stays distinct in both configurations.

## N. ACL and RLS matrix (proposed, non-executable)

| Object class | anon | authenticated | service_role / trusted job | function owner | migration owner | Justification |
|---|---|---|---|---|---|---|
| Safe header tables (1, 2 metadata, 3, 6, 7, 8, 11, 12, 13, 14) | none | **SELECT only** | SELECT, INSERT, UPDATE on the specific tables its jobs touch — **no blanket `GRANT ALL`** | privileges required per function only | full DDL during authorized migration only | UI needs tenant-scoped reads; writes are RPC-only |
| Sensitive tables (4 staging rows, 5 issues, 9 jobs, 10 attempts, 15 events) | none | **no direct SELECT** — filtered views or RPC only | narrow SELECT/INSERT/UPDATE per job | per function | full DDL in migration only | raw payloads, storage paths and diagnostics must not be broadly readable |
| Filtered views (safe projections of 4, 5, 15) | none | SELECT | SELECT | — | — | minimum exposure |
| All objects | no TRUNCATE, no REFERENCES, no TRIGGER to anon/authenticated/service_role | same | same | — | owner only | prevents privilege drift |
| Public RPCs (batch create, file register, correct, resolve, review complete, approve, authorize, execute, rollback trio, signed URL) | no EXECUTE | **EXECUTE** | EXECUTE | definer | — | the only mutation path |
| Private helpers (fingerprint, transition guard, lock key, event writer) | none | **EXECUTE revoked from PUBLIC, anon, authenticated** | EXECUTE where a job needs it | definer | — | mirrors the live `_finance_*` helper posture |

RLS on every table: `SELECT USING (tenant_id = <active tenant> AND public.has_permission(auth.uid(), tenant_id, '<key>'))`; **no** INSERT/UPDATE/DELETE policies for `authenticated` on any import table. Every `SECURITY DEFINER` function uses `SET search_path = ''` with fully qualified names and independently re-validates tenant membership, permission, frozen fingerprint and current state — RLS is never treated as protection for a service-role or definer path. Append-only tables (8, 10, 13, 14, 15) additionally carry triggers rejecting UPDATE and DELETE from any role. The permissive Finance table-grant posture observed in Part 1 is explicitly **not** replicated.

## O. Read-surface classification

| Data | Classification |
|---|---|
| Batch list, batch details | safe direct tenant-scoped SELECT |
| Original filename, checksum, size, MIME, upload time | safe direct SELECT |
| Storage object path / bucket | **internal/server-only** — never returned to the browser |
| Raw row payload | **RPC-only read**, permission-gated, row-limited |
| Canonical payload | RPC-only read (permission-filtered) |
| Issues | permission-filtered view (safe columns, localized messages) |
| Mappings | safe direct SELECT |
| Dry-run totals and variance | safe direct SELECT |
| Approval records | safe direct SELECT (reason text included; no internal diagnostics) |
| Job progress | **RPC-only** summary — status, percent, attempt count, safe error code |
| Internal parsing diagnostics, `error_detail`, checkpoint, lease owner | **internal/server-only** |
| Output object references | safe direct SELECT |
| Provenance edges | safe direct SELECT (audit permission) |
| Legal hold flag | safe direct SELECT; hold *internals* and deletion rationale RPC-only |
| Audit stream | permission-filtered view |

Minimum exposure is the rule: residence in `public` never by itself justifies exposing raw payloads or diagnostics.

## P. Service-role / function-owner / migration-owner model

**service_role / trusted server job** — an infrastructure credential, never browser-reachable, never embedded in client code. It bypasses RLS and is therefore *not* a tenant authorization mechanism: every server routine using it must independently check tenant, permission, frozen fingerprint and state. It receives narrowly scoped privileges on only the objects and functions its jobs touch; no blanket `GRANT ALL` on the import schema.

**Function owner** — the role owning `SECURITY DEFINER` functions. It receives only the object privileges each function genuinely needs. It must not accumulate DDL rights or become a de-facto application superuser, and it must not be reused as the migration owner.

**Migration owner** — creates and alters objects during authorized migration only, and is never used by the application at runtime.

Privileges that must not be inherited casually between these actors: DDL from migration owner to function owner; blanket table DML from function owner to `service_role`; any EXECUTE on private helpers from `service_role` to `authenticated`; and any bypass assumption from `service_role` to definer functions.

## Q. Facts

Carried from Part 1 and re-affirmed in B above: single database boundary; 158 base tables / 6 views / zero import relations; `public` sole application schema; live canonical-writer pattern (`SECURITY DEFINER`, `search_path=''`, tenant + permission checks, idempotency, advisory locks); `has_permission()` and the `permission_definitions` shape; `ledger_entries` browser read-only; `finance_request_idempotency` service-role only; the mixed permissive grants on other Finance tables; repository drift limited to a new branch and merge commit with a clean tree.

## R. Lovable claims

One managed Postgres project per Lovable project; `public` is the default Data-API exposed schema; managed type generation and tooling target `public`.

## S. Technical inferences

Preference for Alternative A hardened by column separation; Model A for `import_row_issues` denormalization; lease-based job recovery; fingerprint-based approval invalidation; the specific index and uniqueness choices in F, G and K; the classification of which fields are server-only.

## T. Gaps

1. PostgREST exposed-schema configuration (blocks final schema-placement selection).
2. Whether managed tooling supports a second application schema.
3. Retention configurability surface (tenant-level vs platform-level) not yet specified.
4. Volume evidence, which will influence index and chunk-size choices.
5. Finance reversal capability per output type — Part 3.
6. Whether the residual permissive Finance grants are intentional — affects whether the stricter import posture creates an inconsistency the Owner must accept.

## U. Contradictions

1. The proposed import ACL posture (no browser DML at all) is stricter than the live Finance posture on `invoices`, `expenses`, `billing_links`, `payment_sessions`. Intentional, per §3.5 of this continuation, but it leaves two different standards in one database until Finance is reconciled separately.
2. Alternative B's security benefit depends on an unverified platform configuration — recorded, not resolved.

## V. Evidence Part 3 may rely upon

The object matrix in F including all uniqueness and index choices; the source-file vs batch-file separation and its cross-batch uniqueness in G; the correction-versioned staging model and the Model-A issue denormalization in H; the immutable approval and frozen-fingerprint contract in I; the job/attempt/lease/checkpoint data model in J; the four-object many-to-many provenance graph and its `request_key`-per-posting-unit idempotency seam in K; the full state-transition matrix in L, including that `ROLLBACK_APPROVED → REVERSING` is gated on Part-3 reversal proof; the 24 atomic permissions in M; the ACL/RLS baseline in N; the read-surface classification in O; the three-actor privilege model in P.

## W. Cross-task contamination check

NO CROSS-TASK CONTAMINATION DETECTED

## X. Run metadata and exact stopping point

Parallel Task ID `PT-DH-RM004-WS0006-P55-A2-P2-DATA-SECURITY-MODEL-20260806-0315`. Evidence time 2026-08-06 00:12 UTC / 03:12 Asia/Riyadh. Only a live-state git read was performed; no broad database re-discovery.

Stopped after: schema-placement comparison, complete bounded object model, source-file/batch-file separation, staging/approval/job/provenance models, state machine, atomic permissions, ACL/RLS and read surfaces. No posting execution, no reversal design, no parser library selection, no environment decision, no final Execution Contract, no Part 3, no Prompt number consumed, no Stage-1 Acceptance, Workstream Closure or Roadmap Closure claimed. Repository, database and Storage writes: ZERO.

Next action: return this Part-2 report for reconciliation before Part 3 is issued.
