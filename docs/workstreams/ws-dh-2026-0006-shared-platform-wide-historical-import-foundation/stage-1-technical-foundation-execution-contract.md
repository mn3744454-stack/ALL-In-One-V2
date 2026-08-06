<!--
id: DHB-WS-2026-0006-STAGE1-CONTRACT
title: WS-DH-2026-0006 — Stage 1 — Complete Technical Foundation Execution Contract (Owner Accepted)
version: 1.0.0
status: current
audience: internal
date: 2026-08-07
last-verified: 2026-08-07
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 2 — PROMPT 55 — SAME-SUBJECT CONTINUATION C1 — STAGE-1 OWNER ACCEPTANCE AND GOVERNANCE PERSISTENCE (parent prompt: Prompt 55 — Stage 1 Technical Foundation Audit; Parallel Task ID PT-DH-RM004-WS0006-P55-C1-STAGE1-PERSIST-20260807-0012), under approved Decision DEC-RM-DH-004-005, Owner Acceptance granted 07-08-2026 at 00:12 Asia/Riyadh (UTC+03:00). This file is the single authoritative Stage-1 Technical Foundation Execution Contract. Its body is the complete Owner-accepted contract text, persisted without summarization, omission or edit. Governance persistence only — no technical implementation, no database, migration, SQL, Storage, RLS, Grant, permission or application change is authorized by this file.
source-sha256: n/a
evidence-artifact: Dayli_Horse_Historical_Import_Evidence_Pack_v0.4.xlsx
evidence-sha256: ed34d290e58173033856ac0a66fda60487e4b66e2df224ee63375352347acc7a
evidence-bytes: 59424
evidence-storage: NOT COMMITTED TO REPOSITORY — NOT UPLOADED TO APPLICATION STORAGE
-->

# WS-DH-2026-0006 — Stage 1 — Complete Technical Foundation Execution Contract

**العنوان العربي:** عقد التنفيذ الكامل للأساس التقني — المرحلة 1

**Contract status:** OWNER ACCEPTED — GOVERNANCE PERSISTENCE ONLY — NO TECHNICAL IMPLEMENTATION AUTHORIZED

**Owner Acceptance:** 07-08-2026 — 00:12 — Asia/Riyadh — UTC+03:00 — `DEC-RM-DH-004-005`

**Sections:** 38 (`1. MISSION` through `38. EXACT STOPPING POINT`)

The complete accepted contract text follows verbatim.

---

```text

DAYLI HORSE / ديلي هورس

RM-DH-004 — DAYLI HORSE FINANCIAL TRUTH STABILIZATION
AND HISTORICAL DATA MIGRATION ROADMAP

PHASE 2 — SHARED PLATFORM-WIDE HISTORICAL IMPORT FOUNDATION
— FINANCE-FIRST IMPLEMENTATION

WS-DH-2026-0006 — SHARED PLATFORM-WIDE HISTORICAL IMPORT
FOUNDATION — FINANCE-FIRST IMPLEMENTATION

STAGE 1 — COMPLETE TECHNICAL FOUNDATION EXECUTION CONTRACT

CONTRACT STATUS:
OWNER ACCEPTED
AUTHORIZED FOR GOVERNANCE PERSISTENCE ONLY
NO TECHNICAL IMPLEMENTATION AUTHORIZED

TIMEZONE:
Asia/Riyadh — UTC+03:00


1. MISSION

Establish one secure, tenant-isolated, auditable and extensible
Historical Import Foundation for the Dayli Horse platform.

The Foundation is:

SHARED PLATFORM-WIDE.

It is:

FINANCE-FIRST.

It is not:

FINANCE-ONLY.

The Foundation must support later approved Domain Adapters for:

- Finance;
- Laboratory;
- Medical and Veterinary;
- Horses, Owners and Clients;
- Stable Operations;
- Supplier and Pharmacy interactions;
- other Owner-approved Dayli Horse domains.


2. CURRENT ENVIRONMENT CONTRACT

The existing Dayli Horse project, database and Storage boundary are:

NON-PRODUCTION.

All current application records are Demo / Test / Fake Data unless
separately proven otherwise.

Real historical source files are authorized for controlled use within
this Non-Production environment.

Production-environment creation and domain cutover are governed in a
separate Lineage.

They do not block Historical Import Foundation development inside the
current Non-Production environment.

No real customer onboarding or production activation is authorized by
this contract.


3. EVIDENCE CORPUS

The initial representative source corpus consists of:

- three original Excel workbooks;
- six original PDF files;
- one original receipt image;
- the reconciled Historical Import Evidence Pack v0.4.

The corpus proves requirements for:

- structured Excel tables;
- digital PDF tables;
- multi-page tables;
- multiple independent tables in one page;
- values and totals outside a row grid;
- Arabic bidirectional text;
- duplicate source counters;
- missing descriptions;
- payment rows and payment values outside tables;
- partial and cancelled transactions;
- formal claim documents;
- image-only supplier receipts;
- VAT;
- multiple Clients, Horses and Services represented in one source row.

Original source files remain authoritative over derived analysis.

No derived map may silently override an original source.


4. ORIGINAL EXCEL BINARY VERIFICATION

The three original Excel binaries have been independently verified.

Verified facts:

- all three use the Excel 1900 date system;
- all relevant worksheets are visible;
- no hidden rows were found;
- no hidden columns were found;
- no VBA project was found;
- no external workbook links were found;
- merged-cell ranges were identified;
- date number formats were identified;
- source formulas were identified;
- original SHA-256 hashes match the Evidence Pack manifest.

The prior binary-verification gate is:

CLOSED.

No additional binary verification is required before Slice 3A.

Parser implementation must nevertheless preserve the verified workbook
properties and must not assume that all future files have identical
properties.


5. PRESERVED FINANCIAL CONTRACTS

Implementation must preserve:

- public.ledger_entries.effective_date NOT NULL;
- accepted Phase-1 Economic Date Integrity;
- canonical Finance RPC authority;
- existing Finance idempotency precedents;
- existing Finance advisory-lock precedents;
- append-only financial truth;
- ledger-derived financial status where currently authoritative;
- no direct Historical Import write into protected Finance tables;
- no direct import write into ledger_entries;
- no POS involvement;
- no silent Finance RPC signature modification.

The current live Finance ACL posture is mixed.

This contract does not claim that all historical browser-role Finance DML
Grants have been revoked.

Historical Import must use a stricter independent security baseline and
must not copy permissive residual Finance ACL patterns.


6. FULL HISTORICAL FINANCE TARGET

The mandatory final Finance target includes:

- invoices;
- invoice items;
- unpaid invoices;
- paid invoices;
- partially paid invoices;
- payments;
- payment allocations;
- payment sessions where applicable;
- unapplied credits;
- opening obligations;
- expenses;
- expense items;
- suppliers;
- supplier receipts;
- VAT;
- cancellations;
- partial cancellations;
- historical adjustments;
- generated Ledger effects;
- billing and source relationships;
- reconciliation;
- provenance;
- correction and reversal evidence.

No financial class is permanently excluded from the target.

Implementation may be divided into bounded safe slices.

A financial class may remain blocked from canonical posting until its
specific cancellation, correction, reallocation, refund, reversal or
approved compensating contract is proven.


7. SOURCE FORMAT CONTRACT

The Shared Foundation must support:

- Excel;
- digital PDF;
- CSV;
- images;
- other later Owner-approved formats.

Implementation order:

1. Excel;
2. digital PDF;
3. CSV;
4. image / receipt OCR or Document Vision.

Images are first-class Historical Import source files.

They are not registry-only in the final architecture.

Image extraction must retain:

- source image;
- field bounding box;
- extraction confidence;
- extraction engine and version;
- human correction evidence;
- QR or barcode evidence where relevant.

No OCR or Document Vision result may be silently accepted as canonical.


8. PRIVATE SOURCE FILE REGISTRY

Every original source file must have an immutable registry identity
including:

- tenant_id;
- source domain;
- original filename;
- detected MIME;
- declared MIME;
- byte size;
- SHA-256;
- upload actor;
- upload timestamp;
- Storage bucket identity;
- Storage object identity;
- scan status;
- retention state;
- legal-hold state;
- deletion timestamp where applicable.

Original files must not be overwritten.

Original files must not be upserted.

File identity must be separate from Batch membership.


9. BATCH-FILE RELATIONSHIP

A separate Batch-file relationship must record:

- tenant;
- Batch;
- source file;
- sequence;
- attachment role;
- processing intent;
- duplicate disposition;
- reprocessing authorization;
- linking actor;
- linking time.

The model must support:

- one Batch containing multiple files;
- one immutable source file linked to multiple explicitly authorized
  Batches;
- duplicate detection without deleting reprocessing history;
- warn;
- link;
- reject;
- authorized reprocess.

A file checksum is evidence of file identity.

It is not business-transaction uniqueness.


10. MALWARE SCANNING

Malware scanning is part of the Shared Foundation.

File admission lifecycle:

UPLOADED_PENDING_SCAN
→ SCANNING
→ CLEAN

or:

→ INFECTED
→ SCAN_FAILED
→ UNSUPPORTED
→ CORRUPT

Automated parsing must not begin until:

- malware result = CLEAN;
- SHA-256 verification passes;
- detected MIME verification passes.

Scanner evidence must include:

- scanner provider or engine;
- engine version;
- signature-definition version where applicable;
- scan time;
- attempt number;
- result;
- timeout or failure reason.

Source contents must not be written into logs.

The final scanning provider remains an execution-design decision.

Provider selection must occur before source-file intake is activated for
automated parsing.


11. STORAGE AND RETENTION

Use a dedicated private Historical Import Storage boundary.

Required controls:

- no public URLs;
- tenant-prefixed object separation;
- non-guessable object identity;
- no overwrite;
- no upsert;
- signed upload;
- signed download;
- short-lived signed URLs;
- server-side checksum verification;
- server-side MIME detection;
- configurable file-size limits;
- safe original-filename handling;
- legal-hold enforcement;
- source-content logging prohibition.

Original files remain stored while:

- pending;
- scanning;
- under review;
- quarantined;
- failed;
- reconciling;
- under investigation;
- under legal hold.

After successful canonical posting, retain each original file for a
minimum of 90 days.

No automatic file deletion is authorized in the first implementation.

File deletion requires:

import.file.delete

Deletion must never remove:

- file identity;
- checksum;
- mappings;
- extraction evidence;
- validation evidence;
- quarantine history;
- approval evidence;
- provenance;
- posting links;
- reconciliation;
- correction evidence;
- reversal evidence;
- immutable audit events.


12. SHARED CORE OBJECT MODEL

The proposed Shared Core includes:

- import_batches;
- import_source_files;
- import_batch_files;
- import_staging_rows;
- import_row_issues;
- import_mappings;
- import_extraction_runs;
- import_extraction_regions;
- import_dry_run_results;
- import_batch_approvals;
- import_jobs;
- import_job_attempts;
- import_posting_runs;
- import_posting_units;
- import_output_objects;
- import_provenance_edges;
- import_events.

All tenant-owned objects must carry an explicit tenant boundary.

No executable SQL is authorized by this contract.


13. SCHEMA AND DATA-API STRATEGY

Initial recommended implementation:

PUBLIC SCHEMA WITH HARDENED ACCESS.

Reason:

- public is the only proven current application-schema convention;
- current managed tooling is proven against public;
- support for a permanently non-exposed second application schema is not
  yet proven.

Required hardening:

- no anon access;
- no authenticated direct INSERT;
- no authenticated direct UPDATE;
- no authenticated direct DELETE;
- safe headers and summaries may use tenant-scoped views;
- raw payloads remain RPC-only or server-only;
- Storage paths remain server-only;
- internal job diagnostics remain server-only;
- sensitive legal-hold details remain RPC-only;
- all protected mutations are RPC-mediated.

A future Hybrid Public + Internal Schema may be adopted only after its
Data API and managed-tooling behavior are proven.


14. STAGING MODEL

Every staged source record must explicitly carry:

- tenant_id;
- batch_id;
- batch_file_id;
- source file;
- source sheet, page, table or region;
- source row or region ordinal;
- immutable raw payload;
- canonical payload;
- canonical comparison hash;
- row status;
- extraction version;
- correction version;
- confidence evidence;
- created actor and time.

Raw source evidence must never be overwritten.

Corrections must create a new version.

Canonical hashes are comparison evidence.

They must not be tenant-global business uniqueness constraints.


15. PDF GEOMETRY AND EXTRACTION EVIDENCE

Every PDF extraction run must retain:

- page index;
- page width and height;
- page orientation;
- text-layer presence;
- token or cell bounding boxes;
- column-band derivation;
- table and section boundaries;
- extraction engine and version;
- extraction-manifest hash;
- Arabic text reconstruction evidence;
- confidence;
- human correction evidence.

Column coordinates must be derived per file.

They must not be hardcoded globally.

Values outside row grids must be represented as explicit source regions.

Out-of-grid declared totals are first-class source evidence.


16. ARABIC AND BIDI RECONSTRUCTION

Extraction must produce logical-order Unicode.

Bidi controls must be normalized safely.

Numeric runs must remain associated with their correct labels.

Arabic-Indic and Eastern Arabic-Indic inputs may be normalized.

Rendered canonical numerals must use digits 0–9.

Any Arabic line whose logical reconstruction is not deterministic must be
quarantined.

User-facing terminology must use:

خيل

and must not use:

حصان

as the generic platform term.


17. DECLARED TOTAL AND RECONCILIATION UNITS

Reconciliation applies to the smallest meaningful source unit, such as:

- complete file;
- document section;
- page table;
- claim section;
- worksheet;
- defined source region.

Where a declared total exists:

declared_total
must equal
the sum of the included staged rows.

The assertion runs:

- after extraction;
- after correction;
- before approval-grade dry run;
- immediately before posting authorization.

An unexplained difference creates hard quarantine.

Where no declared total exists, the system must record:

NO_DECLARED_TOTAL

and apply an approved alternate reconciliation method, such as:

- row-count reconciliation;
- control-total reconciliation;
- opening/closing balance reconciliation;
- line-total versus document-total reconciliation;
- source-owner attestation.

The system must never fabricate a declared total.


18. QUARANTINE CONTRACT

Quarantine is fail-closed.

Quarantine may be:

- file-scoped;
- section-scoped;
- row-scoped;
- field-scoped.

An unexplained declared-total variance is file- or section-scoped according
to the affected reconciliation unit.

Quarantined evidence may undergo:

- inspection;
- re-extraction;
- diagnostic mapping;
- correction;
- source-owner explanation;
- alternate reconciliation analysis.

Quarantine blocks:

- final mapping freeze;
- approval-grade dry run;
- approval;
- posting authorization;
- canonical posting.

Release requires:

- evidence-backed correction or explanation;
- successful revalidation;
- zero unexplained variance;
- actor-stamped release rationale.

Quarantine may not be silently overridden.


19. SRC-008 EXCEPTION

SRC-008 remains:

UNVERIFIED — HARD QUARANTINE.

Declared total:

12,070.

Extracted row sum:

10,640.

Variance:

1,430.

The difference is not explained by current geometry evidence.

SRC-008 may be:

- inspected;
- re-extracted;
- reconstructed at row level;
- reviewed with the source owner.

SRC-008 may not be approved or canonically posted until the variance is
resolved to zero or an Owner-approved evidence-backed correction replaces
the declared total.


20. IDENTITY AND MAPPING

Zero best-guess identity matching.

The system must not silently infer:

- Client;
- Payer;
- Organization;
- Horse Owner;
- Horse;
- Service;
- Supplier;
- Invoice;
- Payment;
- Payment allocation.

Source identity may include:

- exact identifiers;
- confirmed aliases;
- phone numbers as supporting evidence;
- service codes;
- tax identifiers;
- document numbers;
- source-owner confirmation.

Phone number alone is not sufficient identity proof.

Generic descriptions such as:

- فرس;
- مهر;
- خيل;
- unknown supplier text;

must not automatically create or match canonical records.

Ambiguity creates review or quarantine.


21. DUPLICATE AND IDEMPOTENCY MODEL

Source counters are not unique.

The initial Excel corpus contains:

- 33 distinct duplicated source-counter values;
- 20 blank descriptions.

Source counters must not be canonical natural keys.

Source-record identity must use a medium-agnostic locator including:

- tenant_id;
- immutable source-file hash;
- source sheet, page, table or region;
- source row or region ordinal;
- extraction version.

Posting idempotency must use a separate immutable request key including:

- frozen Batch fingerprint;
- domain operation;
- posting-unit identity;
- target scope.

Successful replays return the prior result and must not post again.

Blank descriptions must remain visibly identified as missing source
narrative.

A system-generated label such as:

Description unavailable from source

may be used only where a canonical non-null field requires it and must
remain explicitly flagged as system-generated.


22. IMMUTABLE REVIEW AND APPROVAL

Review completion, approval and posting authorization are separate
records.

A reviewed Batch must have a frozen fingerprint covering:

- included source files;
- extraction versions;
- canonical row versions;
- active mappings;
- excluded rows;
- reconciliation results;
- approved output scope.

Any material change invalidates prior approval.

Approval must not be represented only by a mutable status field.

Every decision must record:

- actor;
- permission;
- timestamp;
- fingerprint;
- decision;
- rationale;
- resulting event.


23. CONTROLLED STATE MACHINE

The core lifecycle is:

DRAFT
→ FILE_REGISTERED
→ PENDING_SCAN
→ CLEAN
→ EXTRACTING
→ STAGED
→ VALIDATING
→ REVIEW_REQUIRED or READY_FOR_DRY_RUN
→ DRY_RUN_COMPLETE
→ AWAITING_APPROVAL
→ APPROVED
→ POST_AUTHORIZED
→ POSTING
→ POSTED
→ RECONCILED

Controlled exception states include:

- INFECTED;
- SCAN_FAILED;
- UNSUPPORTED;
- CORRUPT;
- QUARANTINED;
- FAILED;
- CANCELLED;
- ROLLBACK_REQUESTED;
- ROLLBACK_APPROVED;
- REVERSING;
- REVERSED.

All transitions must be:

- RPC-mediated;
- state-validated;
- tenant-validated;
- permission-validated;
- fingerprint-validated where applicable;
- event-logged.

No arbitrary browser status update is permitted.


24. ATOMIC PERMISSIONS

At minimum:

- import.batch.view;
- import.batch.create;
- import.batch.cancel;
- import.file.upload;
- import.file.view;
- import.file.download;
- import.file.delete;
- import.file.legal_hold.manage;
- import.scan.view;
- import.scan.retry;
- import.mapping.view;
- import.mapping.manage;
- import.staging.view;
- import.staging.correct;
- import.issue.view;
- import.issue.resolve;
- import.dry_run.execute;
- import.reconciliation.view;
- import.reconciliation.complete;
- import.review.complete;
- import.approval.grant;
- import.post.authorize;
- import.post.execute;
- import.rollback.request;
- import.rollback.approve;
- import.rollback.execute;
- import.audit.view.

No role name may be hardcoded.

The Owner may:

- assign different stages to different people;
- create reusable permission bundles;
- assign all approved permissions to one person;
- preserve distinct actor-stamped audit events.


25. ACL, RLS AND FUNCTION SECURITY

anon:

- no Import table access;
- no Import RPC execution;
- no Import Storage access.

authenticated:

- no direct protected-table INSERT;
- no direct protected-table UPDATE;
- no direct protected-table DELETE;
- minimum safe SELECT through tenant-scoped safe surfaces;
- EXECUTE only on approved public RPCs.

service_role or trusted worker:

- infrastructure credential only;
- never browser-reachable;
- not Tenant authority;
- no blanket GRANT ALL baseline;
- minimum privileges required for its job;
- Tenant and state checks remain mandatory.

SECURITY DEFINER functions must:

- be used only when required;
- use SET search_path = '';
- use fully qualified object names;
- reuse the exact live accepted has_permission() signature;
- verify Tenant;
- verify permission;
- verify current state;
- verify frozen fingerprint where applicable.

Private helpers must revoke EXECUTE from:

- PUBLIC;
- anon;
- authenticated;

unless a specific safe requirement is independently proven.


26. MANY-TO-MANY PROVENANCE

The provenance graph must support:

- one source row producing multiple outputs;
- multiple source rows contributing to one output;
- one source document producing multiple posting units;
- invoice headers and items;
- payments and allocations;
- expenses and Ledger effects;
- grouped claims;
- correction versions;
- reversal relationships.

Each canonical output object is represented once by:

tenant_id + output_type + output_id.

Multiple source contributions connect through immutable provenance edges.

Every provenance edge must retain:

- source file;
- source page, sheet, table or region;
- source row;
- staging version;
- posting run;
- posting unit;
- request key;
- output object;
- actor;
- timestamp;
- reversal relationship where applicable.


27. DOMAIN ADAPTER BOUNDARY

Shared Core owns:

- source intake;
- file registry;
- scanning;
- extraction evidence;
- staging;
- validation;
- quarantine;
- mapping infrastructure;
- approvals;
- jobs;
- retries;
- idempotency;
- provenance;
- reconciliation;
- audit.

Domain Adapters own:

- domain field mapping;
- domain entity resolution;
- domain validation;
- canonical posting;
- domain correction;
- domain cancellation or reversal.

Finance is the first Adapter.

Later Adapters must reuse the Shared Core without rebuilding it.


28. FINANCE POSTING BOUNDARY

Finance posting must use canonical Finance RPCs only.

No direct DML is permitted on:

- invoices;
- invoice_items;
- payments;
- payment_allocations;
- payment_sessions;
- expenses;
- financial_entries;
- ledger_entries;
- customer_balances;
- billing_links;

from the Import posting layer.

Every produced Ledger effect must receive a source-derived effective_date.

Direct Ledger insertion must not replace a missing canonical financial
contract.


29. CURRENT REVERSAL CAPABILITY

Proven:

A. Unpaid invoices

- creation and approval through canonical Finance RPCs;
- cancellation through cancel_invoice;
- cancellation creates a compensating negative Ledger effect;
- cancellation is blocked where payments exist.

B. Non-HR expenses

- canonical reversal through reverse_expense;
- reversal creates a mirror reversal expense;
- reversal creates a negative adjustment Ledger effect;
- original truth remains preserved;
- HR salary-sourced expenses are excluded.

Not yet proven:

- payment reversal;
- payment allocation reversal or reallocation;
- payment-session reversal;
- billing-link correction or reversal;
- paid-invoice cancellation;
- partially paid-invoice correction.

post_manual_ledger_adjustment is a compensating operation.

It is not a universal canonical reversal.


30. PAYMENT AND ALLOCATION CONTRACT

Payments, allocations and payment sessions remain inside the mandatory
Finance scope.

Before canonical posting for these classes, a bounded technical contract
must define and prove:

- payment void or reversal;
- refund or compensating payment where appropriate;
- allocation reversal;
- allocation reallocation;
- payment-session correction;
- paid-invoice correction;
- partially paid-invoice correction;
- downstream Ledger effect;
- idempotency;
- concurrency protection;
- audit evidence;
- rollback restrictions.

Until that contract passes independent QA and Acceptance Re-Audit:

- payment data may be extracted;
- payment data may be staged;
- payment data may be mapped;
- payment data may enter diagnostic dry run;
- payment data may be reconciled.

Payment-bearing classes may not be canonically posted.


31. JOBS, RETRIES AND RESUMABILITY

Posting authorization and execution are separate.

One Batch may have only one active posting run.

Each posting unit must have:

- stable posting-unit identity;
- immutable request key;
- authorization link;
- current status;
- checkpoint;
- attempt evidence;
- safe error code;
- provenance output.

Successful units must never post twice.

Retries must reuse the same request key.

Partial failure must not produce a POSTED Batch.

POSTED requires all authorized units to be:

- succeeded;
- or explicitly excluded before authorization.

RECONCILED additionally requires:

- import.reconciliation.complete;
- zero unexplained variance;
- complete expected-output evidence.


32. PARSING REQUIREMENTS

Excel:

- workbook and sheet discovery;
- Excel 1900 and 1904 date-system detection;
- merged-cell handling;
- formula versus cached-value handling;
- hidden-sheet and hidden-row detection;
- Arabic and English header mapping;
- numeric normalization;
- dates;
- blank rows;
- values outside tables;
- multiple Services and Horses in one row;
- source coordinates.

PDF:

- text-layer detection;
- geometry and bounding boxes;
- table and section detection;
- page orientation;
- tables spanning pages;
- values outside tables;
- Arabic Bidi reconstruction;
- confidence and manual review.

CSV:

- encoding detection;
- delimiter detection;
- quoting;
- header mapping;
- numeral and date normalization.

Images:

- OCR or Document Vision;
- bounding boxes;
- confidence;
- receipt classification;
- QR and barcode evidence;
- VAT arithmetic;
- human verification thresholds.

No final parsing library is selected by this contract.


33. ACCEPTANCE CRITERIA

Foundation security:

- zero cross-Tenant access;
- zero anon access;
- zero direct browser mutation of protected Import tables;
- minimum safe read exposure;
- no blanket service-role privileges;
- backend permission enforcement;
- exact live has_permission() signature reused;
- private-helper EXECUTE restrictions proven.

Files:

- private Storage only;
- no overwrite;
- no upsert;
- SHA-256 verified;
- MIME verified;
- malware scan passed before Parsing;
- legal hold enforced;
- retention enforced;
- deletion preserves immutable evidence.

Extraction:

- original file retained;
- page, sheet, table, row and region provenance retained;
- Arabic logical-order reconstruction validated;
- confidence retained;
- uncertain fields quarantined;
- source coordinates reproducible.

Reconciliation:

- declared totals captured where present;
- declared totals match included staged rows;
- documents without declared totals use an approved alternate method;
- unexplained variance blocks approval and posting;
- SRC-008 remains quarantined until resolved.

Identity:

- zero silent best-guess matching;
- explicit mapping evidence;
- ambiguous identities quarantined.

Posting:

- no direct Finance DML;
- effective_date always source-derived;
- authorization separated from execution;
- one active run per Batch;
- zero duplicate posting after retry;
- safe resume after partial failure;
- complete many-to-many provenance.

Reversal:

- reversal proven separately per output class;
- no deletion of financial truth;
- compensating operations correctly classified;
- payment-bearing posting blocked until its contract is accepted.

Regression:

- build passes;
- typecheck passes;
- targeted Import tests pass;
- existing Finance tests remain green;
- Phase-1 effective_date contract remains intact;
- existing Finance RPC signatures remain unchanged unless separately
  authorized.


34. BOUNDED TECHNICAL EXECUTION SEQUENCE

No Slice is authorized by this contract.

After Owner Acceptance and Acceptance/Persistence:

Slice 3A — Core Control Plane

- import_batches;
- import_source_files;
- import_batch_files;
- staging envelope;
- extraction evidence;
- issues;
- immutable events;
- state-machine constraints;
- indexes.

Slice 3B — Authorization and Tenant Isolation

- atomic permission definitions;
- RLS;
- explicit Grants;
- RPC boundaries;
- helper security;
- cross-Tenant negative tests;
- privilege tests.

Slice 3C — Storage and Malware Scanning

- private Storage;
- pending-scan quarantine;
- scanner integration;
- checksum;
- MIME;
- signed access;
- retention;
- legal hold.

Subsequent bounded Slices:

- Excel extraction;
- digital PDF extraction;
- CSV extraction;
- image / receipt extraction;
- validation and quarantine;
- mapping and identity review;
- approval-grade dry run;
- reconciliation;
- unpaid-invoice posting;
- non-HR expense posting;
- payment and allocation correction/reversal contract;
- full Finance posting;
- later Domain Adapters.

Every Slice requires:

- a separately authorized Prompt;
- current live-state re-read;
- exact scope;
- exact exclusions;
- migration;
- rollback appropriate to the data state;
- QA;
- Acceptance Re-Audit;
- zero-regression evidence;
- contamination check;
- exact stopping point.


35. PROHIBITED CURRENT ACTIONS

This Stage-1 contract does not authorize:

- repository code changes;
- migrations;
- database writes;
- Storage writes;
- permission creation;
- RLS changes;
- Grant changes;
- parser installation;
- Edge Function creation;
- malware-provider activation;
- application upload workflow activation;
- Finance posting;
- Finance reversal;
- Pilot execution;
- Production activation;
- Workstream Closure;
- Roadmap Closure.


36. OPEN BOUNDED ITEMS

The following remain open but do not block acceptance of this contract:

- final malware-scanning provider;
- exact parser libraries;
- final synchronous versus asynchronous processing thresholds;
- maximum future file sizes and volumes;
- future Hybrid internal-schema option;
- source-owner explanation for SRC-008;
- residual Finance ACL hardening outside the Import Foundation.

The following block only their related technical execution:

- malware-provider selection blocks automated Parser admission;
- payment reversal contract blocks payment-bearing posting;
- SRC-008 variance blocks SRC-008 approval and posting.


37. OWNER ACCEPTANCE

The Owner approved this complete Stage-1 Execution Contract.

The approval authorizes only:

Acceptance/Persistence of this contract.

It does not authorize technical execution.


38. EXACT STOPPING POINT

Stop after governance persistence and required verification.

No technical implementation may start.

Prompt 55 remains the consumed Stage-1 Prompt.

This continuation consumes no new Prompt number.

The next technical Prompt number remains unconsumed and unauthorized.

---

END OF COMPLETE ACCEPTED CONTRACT
```
