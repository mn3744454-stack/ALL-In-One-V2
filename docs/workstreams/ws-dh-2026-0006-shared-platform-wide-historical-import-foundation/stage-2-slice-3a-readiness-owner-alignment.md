<!--
id: DHB-WS-2026-0006-STAGE2-SLICE3A-ALIGNMENT
title: WS-DH-2026-0006 — Stage 2 / Slice 3A — Core Control Plane Readiness and Owner-Alignment Contract
version: 1.0.0
status: current
audience: internal
date: 2026-08-07
last-verified: 2026-08-07
supersedes: []
superseded-by: null
source: authored during RM-DH-004 / Phase 2 — Stage 2 Slice-3A Owner-Alignment Governance Persistence under PROMPT 56 — SAME-SUBJECT CONTINUATION G1 (parent prompt Prompt 56 — Stage 2 / Slice 3A Technical Execution Readiness and Owner Alignment; Parallel Task ID PT-DH-RM004-WS0006-P56-G1-SLICE3A-ALIGN-PERSIST-20260807-0122), approved Decision DEC-RM-DH-004-006, Owner Alignment granted 07-08-2026 at 01:22 Asia/Riyadh (UTC+03:00). This artifact carries the complete Owner-aligned Slice-3A readiness contract text. It is governance persistence only: no table, migration, SQL, RLS, FORCE RLS, policy, Grant, Revoke, permission, RPC, function, trigger, Storage bucket, Edge Function or application change is authorized or performed by it. Prompt 56 is CONSUMED; no new Prompt number is consumed and Prompt 57 remains UNCONSUMED AND UNAUTHORIZED. The Stage-1 Technical Foundation Execution Contract remains authoritative and unchanged.
source-sha256: n/a
-->

# DAYLI HORSE / ديلي هورس

## RM-DH-004 — PHASE 2

## WS-DH-2026-0006

## STAGE 2 / SLICE 3A — CORE CONTROL PLANE

## READINESS AND OWNER-ALIGNMENT CONTRACT

### 1. STATUS

OWNER ALIGNED — GOVERNANCE PERSISTENCE ONLY

TECHNICAL IMPLEMENTATION NOT STARTED

PROMPT 56 CONSUMED AND COMPLETE

PROMPT 57 UNCONSUMED AND UNAUTHORIZED

### 2. MISSION

Prepare the first bounded, secure and independently testable technical

Slice of the Shared Platform-Wide Historical Import Foundation.

The Foundation remains:

- Shared Platform-Wide;

- Finance-first;

- not Finance-only;

- Tenant-isolated;

- auditable;

- extensible;

- source-evidence preserving.

### 3. SLICE-3A BOUNDED OBJECT SET

The Owner approved the following six-table target:

1. import_batches;

2. import_source_files;

3. import_batch_files;

4. import_staging_rows;

5. import_issues;

6. import_events.

No table is created by this contract.

### 4. DEFERRED EXTRACTION OBJECTS

The following are deferred to a later extraction-specific Slice:

- import_extraction_runs;

- import_extraction_regions.

They remain mandatory future components.

The deferral does not remove extraction provenance from the final

architecture.

### 5. ISSUE-NAME CORRECTION

For Slice 3A:

import_row_issues

is superseded by:

import_issues

The new name supports Batch-, file-, section-, row- and field-level issues.

Row-level support remains included.

### 6. STATE REPRESENTATION

State values will use:

TEXT + NAMED CHECK CONSTRAINTS.

PostgreSQL enums and state lookup tables are not selected for Slice 3A.

### 7. CHECKSUM UNIQUENESS

Source-file checksum uniqueness is Tenant-scoped:

tenant_id + sha256_hex.

No global cross-Tenant unique checksum constraint is authorized.

Checksum is file-identity evidence and not business-transaction identity.

### 8. FORCE RLS CONDITIONAL TARGET

FORCE ROW LEVEL SECURITY is the intended target posture.

It may be implemented only after compatibility is proven with:

- the exact live has_permission() contract;

- approved SECURITY DEFINER ownership;

- trusted-worker and service-role behavior;

- migration and rollback behavior;

- cross-Tenant negative tests.

Failure to prove compatibility requires a hard stop and renewed Owner

Alignment.

No silent fallback is permitted.

### 9. SLICE BOUNDARIES

Slice 3A does not authorize:

- permission keys;

- operational RLS policies;

- RPCs;

- private helpers;

- service-role grants;

- Storage buckets;

- malware scanning;

- signed URLs;

- Edge Functions;

- Finance posting;

- source-file ingestion;

- parser execution.

Slice 3B remains responsible for Authorization and Tenant Isolation.

Slice 3C remains responsible for Storage and Malware Scanning.

### 10. DEFERRED D6 DECISION

The location of future private helpers remains deferred to Slice 3B.

The future Owner Alignment must compare:

- public schema with revoked EXECUTE;

- a proven non-exposed private schema.

No private schema is authorized here.

### 11. PRESERVED CONTRACTS

Preserve:

- Stage-1 Owner Acceptance and Persistence;

- Full Historical Finance;

- Malware-before-Parsing;

- no direct Import DML into protected Finance tables;

- no direct Import DML into ledger_entries;

- source-derived effective_date;

- immutable original source evidence;

- zero best-guess identity matching;

- many-to-many provenance;

- atomic permissions;

- SRC-008 Hard Quarantine;

- payment-bearing Posting gate;

- all 47 Deferred Items.

### 12. EXECUTION AUTHORIZATION

This Owner Alignment does not authorize technical execution.

Prompt 57 remains unconsumed and unauthorized.

A future Prompt 57 must:

- re-read live repository and database state;

- prove FORCE RLS compatibility before writing;

- define the exact migration;

- define exact tables, columns, constraints and indexes;

- define forward and rollback behavior;

- define tests and zero-regression evidence;

- stop if any mandatory precondition fails.

### 13. EXACT STOPPING POINT

Stop after governance persistence and validation.

Do not begin Stage 2 technical implementation.

Do not execute Slice 3A.

Do not issue Prompt 57.

Do not claim technical Acceptance.

Do not claim Workstream Closure.

Do not claim Roadmap Closure.

---

END OF COMPLETE READINESS AND OWNER-ALIGNMENT CONTRACT
