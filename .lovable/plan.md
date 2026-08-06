# Prompt 55 — Continuation A2 — Part 3 — Execution Safety, Reversal, Storage and Delivery Model (read-only)

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Stage 1. Repository writes: ZERO. Database writes: ZERO. Storage writes: ZERO. No final Execution Contract, no slice authorization, no pilot authorization.

## A. Primary Part-3 verdict

The execution-safety model is issuable, with one decisive finding: `reverse_expense` is now **proven** as a canonical compensating reversal (body read this turn), while payments, invoice-payment allocations, payment sessions and billing links remain **without any reversal path**. Consequently the only defensible first Finance pilot is **Pilot B — unpaid invoices plus reversible expenses**, and payment-class imports are **blocked**. The environment fork remains open; Option A is recommended but is not proven available.

## B. Run identity and live boundary

| Item | Value |
|---|---|
| Branch | `edit/edt-1ef3d38e-f5ec-4570-b288-933a693dc6a1` |
| HEAD | `1ce13b08085dfa14d8693493144e22c31392e4b2` |
| Parent 1 | `21f6f688109216dd5b590c436ae8542d58b31070` (Part-2 HEAD) |
| Parent 2 | `3874af9200bec36bac5a55102b2b94f30fc379d1` |
| Working tree | clean — zero staged, unstaged, untracked paths |
| Lovable project ID | `64c79edd-f667-42bb-b896-147c63e0ff12` |
| Database ref | `vhxglsvxwwpmoqjabfmj` |
| Evidence time | 2026-08-06 00:23 UTC / 03:23 Asia/Riyadh |

**Drift since Part 2: repository only** — a new edit branch and merge commit whose first parent is the Part-2 HEAD. Clean tree. No governance, code or database change relevant to this Workstream. Database boundary unchanged.

## C. Parts 1 and 2 evidence consumed

All seven Part-1 items and six Part-2 items listed in §3 are consumed unchanged. The four ChatGPT reconciliation guards in §4 are adopted: (1) `storage_path` is exposed only through a safe view or RPC, never by direct table SELECT; (2) `import_staging_rows` explicitly carries `tenant_id` and `batch_id` as real columns because indexes, RLS and consistency constraints reference them; (3) posting authorization and posting execution are separate operations, permissions, events and timestamps; (4) a distinct `import.reconciliation.complete` permission is added alongside `import.reconciliation.view`, bringing the atomic set to 25 keys; (5) canonical output identity is `(tenant_id, output_type, output_id)` with many provenance edges pointing at one object — output identity is never duplicated per contributing row or unit; (6) no `has_permission()` signature is hardcoded here — execution-time code must reuse the exact live accepted signature.

## D. Targeted reads performed

1. **`reverse_expense` complete body and ACL** — `pg_proc.prosrc`, `prosecdef`, `proconfig`, `proacl`. Result: `SECURITY DEFINER`, `SET search_path=''`, EXECUTE to `authenticated` and `service_role`.
2. **Payment / allocation / payment-session reversal candidates** — no new query needed; Part 1 already ran an exhaustive `pg_proc` scan of `public` for `%revers%`, `%void%`, `%refund%`, `%cancel%`, `%adjust%` and `%payment%`. No candidate exists.
3. **Storage bucket security limits** — carried from Part 1: `horse-media` (private, 50 MB limit, MIME allowlist), `database_export_20_07_26` (private, no limits). No new read.
4. Git live-state read (section B).

No broad database re-discovery was performed.

## E. Environment fork and recommendation

### Option A — separate non-production environment

- **Benefits:** destructive rollback drills, RLS/Grant negative tests, Storage policy tests and pilot rehearsals run with zero risk to real financial data; migration mistakes cost nothing; the first three slices can be exercised repeatedly.
- **Risks:** schema, permission and Finance-RPC lineage can drift between environments, so a change proven safe in non-production may behave differently in production; two environments must be kept synchronized by discipline.
- **Technical prerequisites:** a second Postgres project with the current schema, the 25+ permission definitions, the Finance RPC set and representative test tenants; a repeatable migration-application order.
- **Operational prerequisites:** an owner for environment parity; a promotion checklist; a documented rule that no real-client data is copied down.
- **Data isolation:** complete — separate database ref, separate Storage.
- **Rollback:** unrestricted, including destructive drills.
- **Promotion:** forward-only versioned migrations applied to production only after QA and Acceptance Re-Audit in non-production; no schema is ever promoted by copying data.
- **Unresolved platform dependencies:** whether Lovable supports and supports-well a second project acting as staging for this app, including type generation, linter and backup tooling. Part 1 could not prove this; **it is not proven impossible either**, and a Lovable product claim alone must not be used to rule it out.

### Option B — controlled current-environment implementation

- **Benefits:** no parity problem; the objects are created exactly once against real schema, real permission definitions and real Finance RPCs; fastest path to Slice 3A.
- **Risks:** every migration touches the production database; a defective RLS policy, grant or trigger is a live exposure; destructive rollback drills are impossible without risking real data; a mistaken posting call would touch real financial truth.
- **Technical prerequisites:** additive-only DDL; new objects inert (no UI route, no enabled RPC path) until authorized; per-slice migration plus reviewed rollback script; no modification of any existing Finance object, function signature or grant.
- **Operational prerequisites:** explicit Owner risk acceptance; a dedicated test tenant; independent QA and Acceptance Re-Audit before activation; no real-client posting.
- **Data isolation:** logical only — tenant scoping and inertness, not physical.
- **Rollback:** schema rollback only; no destructive drills.
- **Promotion:** none — the change is already in production.
- **Unresolved platform dependencies:** none.

**Recommendation to evaluate: Option A — separate non-production environment.** It is the only option that permits the rollback drills the acceptance criteria require. This is a recommendation, **not Owner-approved**, and Option A must be confirmed as platform-supported before it is selected; if it proves unsupported, Option B becomes the fallback under the restrictions above.

## F. Posting authorization model

Four distinct stages, each an immutable record plus event, each with its own permission, actor and timestamp:

1. **Review completion** — `import.review.complete`. Computes and records the reviewed batch fingerprint over canonical payloads, active mapping version and included batch-file set. Batch enters `AWAITING_APPROVAL`.
2. **Approval** — `import.approval.grant`. Writes an immutable approval row bound to that exact fingerprint. Batch enters `APPROVED`. A fingerprint change after this point invalidates the approval.
3. **Posting authorization** — `import.post.authorize`. Writes an immutable authorization record containing: batch, frozen fingerprint, **authorized output scope** (the explicit set of output types and the included/excluded posting-unit keys), authorized actor, permission key used, timestamp, and **one-time-use status with an expiry**. Batch enters the intermediate state `POST_AUTHORIZED`.
4. **Posting execution** — `import.post.execute`. A separately permitted actor or trusted worker consumes exactly one valid, unexpired, unconsumed authorization whose fingerprint still matches. Batch enters `POSTING`.

State path: `APPROVED → POST_AUTHORIZED → POSTING → POSTED → RECONCILED`. Authorization and execution are never one status transition and never one undifferentiated RPC. One person holding both permissions may perform both stages; two records, two actors-stamps and two events are still written.

## G. Job, retry, resumability and concurrency model

- **Posting run** — one authorized execution attempt of one batch, linked to exactly one authorization record, with run number, counters and status.
- **Posting unit** — the atomic unit of work: a stable `unit_key` derived from the source grouping, plus an **immutable `request_key`** minted once and reused as the idempotency key on the canonical Finance RPC.
- **Concurrency** — a partial unique index over `(batch_id, kind)` where the job is `queued` or `running`, plus an advisory transaction lock on a key derived from tenant and batch, guarantees **one active posting run per batch**.
- **Lease** — the worker holds `lease_owner` and `lease_expires_at`; an expired lease can be reclaimed by exactly one successor, never by a concurrent second runner.
- **Checkpoint** — the last proven unit position, written in the same transaction that commits the unit's success.
- **Attempts** — every attempt writes an immutable row with outcome, safe error code and internal detail (server-only).
- **Atomicity** — one unit commits entirely or fails entirely; a failed unit never leaves a half-written Finance document because the canonical RPC is itself transactional and idempotent.
- **Retry / resume** — a retry re-enters from the checkpoint; already-succeeded units are skipped, and even if re-attempted the canonical RPC's idempotency record returns the stored response instead of posting again, so **zero duplicates**.
- **Partial failure** — failed units remain visible with their error code; the batch stays in `POSTING` or moves to `FAILED`, and **never** to `POSTED`.
- **POSTED invariant** — every required unit is `succeeded`, or was explicitly `excluded` **before** authorization (exclusions after authorization invalidate it).
- **RECONCILED invariant** — reconciliation is completed by a person holding **`import.reconciliation.complete`** (viewing is insufficient), every expected output is proven present through provenance, and variance is zero or explicitly explained and recorded.

**Sync vs async is not selected.** Decision criteria: maximum rows per file, maximum posting units per batch, measured per-unit RPC latency against the platform statement timeout, expected monthly batch volume and concurrency, and whether a batch can plausibly exceed a single safe request window. Chunk size is likewise deferred.

## H. Finance reversal capability matrix

`reverse_expense` classification is now evidence-based, not name-based (body read this turn).

| Operation | Creation / posting path | Proven reversal | Exact semantics | Prerequisites | Downstream dependencies | Deletion allowed | Compensating posting possible | First pilot | Blocking reason |
|---|---|---|---|---|---|---|---|---|---|
| Invoice creation | `create_invoice_with_items` | `delete_draft_invoice` (draft only) | removes a pre-ledger draft | status `draft` | none | **NO** for posted truth; draft deletion is pre-ledger only | n/a | **yes** | — |
| Invoice approval | `approve_invoice` (+ `_finance_invoice_approve_inline`, service_role) | `cancel_invoice` | inserts compensating `adjustment` / `invoice_cancellation` ledger entry of `-amount`, sets status `cancelled`, idempotent, never deletes | invoice not draft, not already cancelled, **no payment ledger entry and no pending/paid payment_intent**, effective date ≥ issue date and ≤ today+7 | ledger, customer balance | **NO** | yes | **yes (unpaid only)** | — |
| Invoice cancellation | `cancel_invoice` | is itself the reversal | as above | as above | ledger | **NO** | yes | yes | — |
| Invoice items | written inside invoice RPCs with snapshot/validation triggers | none at item level | reversal is document-level only | — | invoice totals, snapshots | **NO** | via invoice cancellation | yes (as part of the invoice) | — |
| Payments | `post_payment` | **NONE** | n/a | — | invoice status, ledger, billing links, customer balance | **NO** | not proven | **NO** | no canonical reversal exists; a posted payment also permanently blocks `cancel_invoice` on its invoice |
| Invoice-payment allocations | `post_invoice_payments` → `payment_allocations` | **NONE** | n/a | — | invoice status, ledger | **NO** | not proven | **NO** | no canonical reversal exists |
| Payment sessions | `post_payment_session` | **NONE** | n/a | — | allocations, horse allocations, ledger | **NO** | not proven | **NO** | no canonical reversal exists |
| Expenses | `create_expense`, `post_expense_with_ledger` | **`reverse_expense` — PROVEN canonical compensating reversal** | requires `finance.expenses.manage` **and** `finance.adjustment.create`; idempotent; advisory-locked; **inserts a new `reversal` expense** carrying `reverses_expense_id`, mirrors amount/currency/vendor, posts a `-amount` `adjustment` ledger entry, marks the original `ledger_status='reversed'`; original row never deleted | original `ledger_status='posted'`; not already a reversal; **`source_type <> 'hr_salary_payment'`** (HR-sourced expenses are explicitly forbidden) | ledger, supplier payables | **NO** | yes — proven | **yes (non-HR-sourced only)** | — |
| Manual ledger adjustment | `post_manual_ledger_adjustment` | itself (opposite-sign entry) | **compensating operation, not a canonical reversal** — no object-level reversal contract | — | ledger, customer balance | **NO** | yes | not a pilot output class | must not be used as a generic reversal for other object types |
| Generated ledger entries | private `_finance_ledger_insert` (service_role only) | none standalone | reversal only via the owning document | — | customer balances | **NO** | only through the owning document | implicit only | — |
| Billing links | private `_finance_billing_link_upsert` (no explicit grantee) | **NONE** | n/a | — | payment↔invoice traceability | **NO** | not proven | **NO** | no reversal contract; created as a side effect of payment posting |

Explicit classification requested by §9: **payment imports — BLOCKED. Invoice-payment allocation imports — BLOCKED. Payment-session imports — BLOCKED.** No Finance record may be deleted to simulate rollback under any circumstance.

## I. First Finance pilot options and recommendation

- **Pilot A — unpaid invoice creation and approval only.** Fully reversible via `cancel_invoice`. Safest, but excludes expenses, which are also proven reversible, so it under-uses proven capability.
- **Pilot B — unpaid invoices plus reversible expenses.** Every output class has a proven compensating reversal (`cancel_invoice`, `reverse_expense`).
- **Pilot C — invoices, expenses and payments.** **Rejected** — payments have no reversal, and a posted payment permanently blocks invoice cancellation, making the whole batch irreversible.

**Recommended: Pilot B.**

- Included objects: unpaid invoices (header + items, approved), and expenses whose `source_type` is not `hr_salary_payment`.
- Excluded objects: all payments, allocations, payment sessions, billing links, HR-sourced expenses, POS anything, and any invoice that would be imported in a paid or partially paid state.
- Maximum allowed batch behavior: one tenant, one domain, a bounded row count agreed at authorization time, all units within the authorized output scope, single active posting run, no cross-batch posting.
- Reconciliation requirement: every expected output present and provenance-linked; totals reconcile to the source; variance zero or explicitly explained; completion by a holder of `import.reconciliation.complete`.
- Rollback requirement: before authorization, a rehearsed reversal of every included output class must be demonstrated (invoice cancellation and expense reversal), preferably in the non-production environment.
- Stop condition: any quarantine issue, any unexplained variance, any unit whose output class is outside the authorized scope, or any failure whose reversal cannot be demonstrated — halt the run, leave the batch in `FAILED`, and reverse what was posted.

This is a recommendation only. No pilot is authorized or executed.

## J. Storage security and retention model

Owner-approved retention preserved verbatim: files remain while pending, under review, quarantined, failed, reconciling, under investigation or under legal hold; minimum **90 days** after successful canonical posting; **no automatic deletion in the first implementation**; deletion requires `import.file.delete`; deletion never removes checksum, file identity, mappings, validation evidence, quarantine history, approvals, provenance, posting links, reconciliation or audit events.

Controls:

- **Private bucket** `historical-imports`, never public, no public URL anywhere.
- **Tenant path boundary** — every object key is prefixed by tenant, and the server rejects any registration whose path prefix does not match the caller's active tenant.
- **Non-guessable object key** — random component per object; the key is never derivable from filename or batch id.
- **No overwrite or upsert** — write-once; a second upload to an existing key is rejected, not merged.
- **Server-side SHA-256 verification** after upload; a mismatch quarantines the file and blocks registration.
- **Detected MIME validation** — content sniffed server-side and compared with the declared type; extension is never trusted alone.
- **Allowed formats** — xlsx, xls, csv, pdf; images accepted as registry-only artifacts; everything else rejected.
- **Safe original filename handling** — the original name is stored as metadata only, never used as the object key, never interpolated into a path or a shell/SQL context.
- **File-size control** — a configurable maximum enforced both at the bucket and in the registration RPC (the existing `horse-media` 50 MB precedent shows bucket-level limits are supported).
- **Signed upload and signed download** only, minted by permission-checked RPCs (`import.file.upload` / `import.file.download`).
- **Signed URL lifetime principle** — the shortest window that completes the operation; never reusable, never logged, never persisted in a table read by the browser.
- **No source contents in logs** — no application or edge-function log line may contain file bytes, parsed cell values or signed URLs.
- **Malformed-file quarantine** — unparseable or ambiguous files enter quarantine and block approval.
- **Deletion and legal-hold checks** — deletion refuses if legal hold is set, if the retention date has not passed, or if the batch is not in a terminal state; the check runs server-side, not in the UI.
- **Metadata after object deletion** — the `import_source_files` row persists with checksum, size, MIME, original name, provenance links and a `deleted_at` marker; only the Storage object disappears.

## K. Malware-scanning gate

Three classifications were considered. **Recommendation: malware scanning is required before any real-client upload** — not merely before the production pilot.

Rationale: the very first real-client interaction is an upload of an untrusted Excel or PDF, and those formats are common macro and exploit carriers; deferring scanning to the pilot means the risk has already materialized by the time the gate arrives. Effect on the first pilot: Pilot B can be rehearsed end-to-end with internally produced specimen files before scanning exists, but the moment a client-supplied file enters the bucket the scanning gate must be satisfied. Scanning is an external integration dependency and is **not implemented in this Part**.

## L. Parsing and representative-evidence gate

Preserved: Excel first priority; PDF digital-text and table extraction first priority; CSV supported; images registry-only; no OCR; no authoritative browser parsing.

Required before selecting parsing libraries or the execution architecture: representative Excel specimens; representative PDF specimens; original source examples from the intended client where permitted; maximum file size; maximum workbook sheet count; maximum rows per file; expected monthly batch volume; Arabic and English header samples; numeral formats (Latin and Arabic-Indic); date formats; Excel date-system examples (1900 vs 1904); merged-cell examples; formula-cell examples; PDF page count; PDF digital vs scanned classification; table-layout variability.

**May proceed without this evidence:** Slice 3A (core control-plane schema), Slice 3B (authorization and isolation), Slice 3C (private Storage and source-file registration) — none of these parse content.

**Must remain blocked until the evidence exists:** parser library selection, Excel ingestion and staging, PDF extraction, sync-vs-async posting selection, chunk sizing, row/file limit finalization, and any real-client pilot.

## M. Bounded future execution sequence

These map onto the existing Planned Technical Sequence Step 3 and later; **no Phase, Stage or Step is renumbered**, no Prompt numbers are created, and no slice is authorized.

| Slice | Dependencies | Authorized scope | Prohibited scope | Rollback type | QA gate | Acceptance gate | Stopping point |
|---|---|---|---|---|---|---|---|
| 3A — core control-plane schema | Owner environment decision | batches, source-file and batch-file identity, staging envelope with explicit `tenant_id`/`batch_id`, issues, immutable events, deterministic state constraints | no permissions, no RLS, no Storage, no parsing, no posting | schema rollback (objects unused, no real data) | constraint, transition-guard and immutability tests | independent re-audit of DDL vs the Part-2 model | schema exists and is inert |
| 3B — authorization and isolation | 3A | 25 atomic permission definitions, RLS policies, explicit Grants, RPC boundaries, private-helper revocation | no Storage, no parsing, no posting | schema + grant rollback | negative cross-tenant read/write tests, anon-denied tests, privilege tests, separation-of-duty tests | independent re-audit of the ACL/RLS matrix | authorization proven, still inert |
| 3C — private source-file Storage | 3B | private bucket, path contract, Storage policies, upload registration, signed access, retention metadata, legal hold | no parsing, no posting, no real-client file | bucket + policy rollback | upload/download/deletion/legal-hold negative tests, checksum and MIME tests | independent re-audit of the Storage model | registration proven with internal specimens |
| 3D — Excel ingestion and staging | 3C + representative evidence + parser selection | workbook discovery, header mapping, normalization, staging rows | no PDF, no posting | schema + code rollback | parsing fidelity and normalization tests | re-audit | staging proven |
| 3E — validation, quarantine, review, correction | 3D | validation engine, issues, correction versions, quarantine gate | no dry run, no posting | code rollback | quarantine-blocks-approval tests | re-audit | review proven |
| 3F — dry run, reconciliation, approval, post authorization | 3E | dry-run results, variance, approvals, authorization records | no posting execution | code rollback | fingerprint-invalidation and separation tests | re-audit | authorization proven |
| 3G — bounded Finance posting (Pilot B classes only) | 3F + Owner pilot decision + rehearsed reversal | posting runs, units, output objects, provenance edges, canonical RPC calls for unpaid invoices and non-HR expenses | payments, allocations, sessions, billing links, HR expenses | **business reversal**, not schema rollback | zero-duplicate retry, resume, concurrency, provenance completeness | re-audit | posting proven on test tenant |
| 3H — PDF digital-text and table extraction | 3D + PDF specimens | digital-text detection, table extraction, confidence, quarantine | no OCR | code rollback | extraction-confidence tests | re-audit | extraction proven |
| 3I — controlled real-client pilot | 3G + 3H + malware scanning gate | one client, one bounded batch, Pilot B scope | anything outside the authorized output scope | business reversal | full acceptance set | re-audit | pilot evidence produced |

## N. Acceptance criteria

**Environment** — selected boundary proven; Git branch never treated as database isolation; promotion path documented; a rollback drill performed outside real-client data.

**Security** — zero cross-tenant read or write; zero `anon` access; zero browser-direct protected-table mutation; minimum read exposure (raw payload, `storage_path`, diagnostics never directly selectable); no broad `service_role` dependency and no blanket `GRANT ALL`; every permission enforced server-side using the exact live `has_permission()` signature; separation of duties proven across review / approval / post-authorize / post-execute and rollback request / approve / execute; one fully authorized person can complete all stages while still producing distinct actor-stamped events.

**Files** — no overwrite; checksum verified server-side; MIME sniffed and validated; size policy enforced; private signed access only; legal hold enforced; 90-day minimum retention enforced; deletion preserves all immutable evidence; malware-scanning gate satisfied per §K.

**Posting** — authorization separate from execution; one active run per batch; zero duplicates after retry; partial failure resumes safely from checkpoint; every output linked through provenance; `effective_date` always source-derived and never defaulted to today; no direct Finance DML anywhere; `POSTED` and `RECONCILED` invariants proven, with reconciliation completed by a holder of `import.reconciliation.complete`.

**Reversal** — reversal classified per output type from function bodies, not names; no financial deletion ever; compensating operations (notably `post_manual_ledger_adjustment`) never labelled canonical reversal; the first pilot contains only output classes with proven reversal.

**Parsing** — representative specimens supplied; ambiguous extraction quarantined; zero best-guess identity matching; no OCR; no authoritative browser parsing.

**Regression** — `bun run build` and typecheck pass; existing Finance tests pass; the Phase-1 `ledger_entries.effective_date NOT NULL` contract remains intact; no existing RPC signature changes without separate authorization.

## O. Owner decisions required

1. **Environment** — Option A (separate non-production environment) or Option B (controlled current environment). Recommendation: **Option A**, conditional on confirming platform support; Option B under the §E restrictions if Option A proves unsupported. Not approved.
2. **First Finance pilot boundary** — recommendation: **Pilot B** (unpaid invoices + non-HR reversible expenses). Payments, allocations and payment sessions are blocked by absent reversal.
3. **Malware-scanning gate** — recommendation: **required before any real-client upload**, not merely before the production pilot.
4. **Representative source evidence** — the exact list in §L must be supplied before parser implementation, sync/async selection or chunk sizing.

Not reopened: 90-day minimum retention; atomic deletion permission; no automatic deletion in the first implementation; no best-guess matching; Excel and PDF priority; no OCR.

## P. Facts

`reverse_expense` is `SECURITY DEFINER`, `search_path=''`, EXECUTE to `authenticated` and `service_role`; it requires both `finance.expenses.manage` and `finance.adjustment.create`, is idempotent and advisory-locked, creates a mirror `reversal` expense with `reverses_expense_id`, posts a negative `adjustment` ledger entry, marks the original `ledger_status='reversed'`, deletes nothing, and refuses HR-salary-sourced expenses and already-reversed rows. `cancel_invoice` posts a compensating negative ledger entry and refuses when any payment ledger entry or pending/paid payment intent exists. No reversal function exists for payments, allocations, payment sessions or billing links. Two private Storage buckets exist; `horse-media` demonstrates bucket-level size and MIME limits. Single database ref; repository drift limited to branch/merge with a clean tree.

## Q. Lovable claims

One managed Postgres project per Lovable project; no self-serve second database inside one project; `public` is the default exposed schema. None of these is used to declare Option A impossible.

## R. Technical inferences

Option A preference; Pilot B as the smallest safe scope; malware scanning before any real-client upload; the `POST_AUTHORIZED` intermediate state; lease-based worker recovery; the decision criteria for sync vs async; the slice sequence and its gates.

## S. Gaps

1. Platform support for a second isolated environment (blocks Decision 1).
2. PostgREST exposed-schema configuration (carried from Part 1; blocks final schema placement).
3. Representative specimens and volume evidence (blocks parser and execution-architecture selection).
4. Malware-scanning integration choice.
5. Reversal strategy for payments, allocations, sessions and billing links — required before those classes can ever be imported.
6. Whether the residual permissive Finance table grants are intentional.
7. `reverse_expense` behaviour when the original expense participates in supplier payables was not traced.

## T. Contradictions

1. The proposed import ACL posture is stricter than the live Finance posture on `invoices`, `expenses`, `billing_links`, `payment_sessions` — intentional, but leaves two standards in one database.
2. Governance describes fully RPC-mediated financial writes while those tables still carry browser-role DML grants under RLS.
3. Acceptance requires a destructive rollback drill, which Option B cannot satisfy — this makes Decision 1 consequential rather than procedural.

## U. Evidence ChatGPT may use in final reconciliation

The proven `reverse_expense` semantics and its two prerequisites and HR exclusion; the proven `cancel_invoice` semantics and its payment-existence refusal; the confirmed absence of any payment, allocation, payment-session or billing-link reversal; the four-stage authorization/execution separation with the `POST_AUTHORIZED` state; the concurrency, checkpoint, lease and request-key model with its zero-duplicate guarantee; the `POSTED` and `RECONCILED` invariants including `import.reconciliation.complete`; the Pilot B scope with its exclusions and stop conditions; the Storage and retention control set; the malware gate recommendation; the parsing evidence gate and what may proceed without it; the nine-slice bounded sequence with dependencies and gates; the full acceptance set in §N; the four Owner decisions in §O; the run identity in §B.

## V. Cross-task report contamination check

NO CROSS-TASK CONTAMINATION DETECTED

## W. Run metadata and exact stopping point

Parallel Task ID `PT-DH-RM004-WS0006-P55-A2-P3-EXECUTION-SAFETY-20260806-0325`. Evidence time 2026-08-06 00:23 UTC / 03:23 Asia/Riyadh. Targeted reads: `reverse_expense` body and ACL, plus a git live-state read; Part-1 evidence reused for reversal-candidate absence and Storage buckets.

Stopped after: environment comparison, posting authorization/execution separation, job-retry-resumability safety, the complete Finance reversal matrix, the smallest safe pilot recommendation, Storage and malware gates, the parser evidence gate, and the bounded future execution sequence. No final Execution Contract, no slice or pilot authorization, no parser selection, no bucket, no edge function, no posting, no reversal, no Prompt number consumed, no Stage-1 Acceptance, Workstream Closure or Roadmap Closure claimed. Repository, database and Storage writes: ZERO.

Next action: return this Part-3 report for final reconciliation of Parts 1, 2 and 3.
