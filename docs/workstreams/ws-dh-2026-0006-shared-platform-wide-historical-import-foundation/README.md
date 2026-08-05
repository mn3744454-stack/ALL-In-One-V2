<!--
id: DHB-WS-2026-0006-README
title: WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation (package README)
version: 1.2.0
status: current
audience: internal
date: 2026-08-05
last-verified: 2026-08-06
supersedes: []
superseded-by: null
source: v1.2.0 — RM-DH-004 / Phase 2 — Stage-0 Owner Acceptance Persistence under PROMPT 54 — SAME-SUBJECT OWNER ACCEPTANCE PERSISTENCE CONTINUATION (parent prompt PROMPT-DH-RM004-PHASE2-PROMPT53-GOVERNANCE-EXECUTION-INDEPENDENT-ACCEPTANCE-REAUDIT-54), approved Decision DEC-RM-DH-004-004, Owner Acceptance granted 06-08-2026 at 00:24 Asia/Riyadh (UTC+03:00): records the accepted Stage-0 status. Identity and scope are unchanged; all dynamic state remains in roadmap.md. The earlier provenance is preserved verbatim on the following source line.
source: authored during RM-DH-004 / Phase 2 — Bounded Governance Reconciliation and WS-DH-2026-0006 Package Execution (execution prompt PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-RM-DH-004-PHASE-2-BOUNDED-GOVERNANCE-RECONCILIATION-AND-WS0006-PACKAGE-EXECUTION-53, local Prompt number 53, Parallel Task ID PT-DH-RM004-WS0006-P53-GOVERNANCE-RECONCILIATION-20260805-2216), under approved Decision DEC-RM-DH-004-003. This file carries stable identity only; all dynamic WS-DH-2026-0006 state lives in roadmap.md. No technical Historical Import implementation exists.
source-sha256: n/a
-->

# WS-DH-2026-0006 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation

**العنوان العربي:** الأساس المشترك على مستوى المنصة لاستيراد البيانات التاريخية — التنفيذ الأول في النطاق المالي

**Workstream ID:** WS-DH-2026-0006

**Primary Roadmap:** RM-DH-004 — Dayli Horse Financial Truth Stabilization & Historical Data Migration Roadmap

**Phase:** RM-DH-004 / Phase 2 — Shared Platform-Wide Historical Import Foundation — Finance-First Implementation

**Track:** Track 2 — Import Architecture & Control

**Status:** ACTIVE — STAGE 0 OWNER ACCEPTED AND PERSISTED — TECHNICAL IMPLEMENTATION NOT STARTED

## Identity and Lineage

`WS-DH-2026-0006` was registered in the RM-DH-004 Workstream register at Roadmap creation under the historical title `Import Control Plane`, scoped to the former Phase 3.

Under Decision `DEC-RM-DH-004-003` its title and scope are reconciled to `Shared Platform-Wide Historical Import Foundation — Finance-First Implementation`, and its Phase reference is reconciled from the former Phase 3 to Phase 2 because the former Phase 3 is superseded and absorbed into Phase 2 by Owner decision.

The Workstream ID is unchanged. No Workstream was created, renumbered or merged, and no Phase was renumbered.

## Purpose

WS-DH-2026-0006 is the governance home for the **shared, platform-wide Historical Import Foundation**: the common import substrate that any Dayli Horse domain will later use to bring historical records into the platform under provenance, idempotency, validation, quarantine, reconciliation and rollback controls.

Its **first implemented domain is Finance**. Finance-first means the foundation is designed once as a shared substrate and proven first against historical financial documents; it does not mean the foundation is finance-only.

## Scope Boundary

This Workstream **owns** the governance of:

- the shared import substrate concept and its architecture decisions;
- import batch and source-file identity concepts;
- staging, validation, quarantine, dry-run, reconciliation and selective-rollback concepts at the foundation level;
- the Finance-first implementation sequencing;
- Phase-2 dynamic state, stopping point and next permitted action.

This Workstream **does not own**:

- Phase 1 economic-date contracts, which are closed under `WS-DH-2026-0003`;
- residual canonical financial write-authority scope, which remains with `WS-DH-2026-0004`;
- POS financial isolation, which remains deferred and inert under `WS-DH-2026-0005`;
- provenance and selective rollback execution scope reserved to `WS-DH-2026-0007`;
- historical financial semantics (`WS-DH-2026-0008`) or historical document identity and numbering (`WS-DH-2026-0009`);
- identity matching integrity (`WS-DH-2026-0010`) or the Laboratory pilot (`WS-DH-2026-0011`);
- general Roadmap and Workstream governance rules, which belong to RM-DH-003.

## Preserved Boundaries

1. Phase 1 is closed. The `public.ledger_entries.effective_date NOT NULL` contract is a closed Phase-1 contract and must not be changed by this Workstream.
2. Financial writes remain RPC-mediated under the Stage-B Stable Function-ACL Contract. Historical Import must not reintroduce direct browser-role DML on financial tables.
3. Historical Import must not invoke or depend on the POS financial writer.
4. Payment status remains derived from the ledger and is never set manually.
5. No production financial or operational data may be written by this Workstream without a separately Owner-authorized execution contract.

## Shared Core Boundary

The Shared Core is the domain-agnostic Historical Import substrate. It owns:

- Import Batch identity;
- source-file identity and provenance;
- staging;
- validation;
- quarantine;
- dry run;
- reconciliation;
- idempotency and fingerprint foundations;
- selective rollback foundations;
- audit evidence.

The Shared Core must not own Domain-specific business posting logic.

## Domain Adapter Boundary

Each Domain Adapter supplies:

- field mapping;
- typed/projected Domain fields;
- Domain validation rules;
- identity requirements;
- Domain-specific reconciliation rules;
- the canonical Domain posting call.

A Domain Adapter must never bypass Import Batch authority, Shared Core validation, quarantine, review, approval, audit, or canonical posting authority.

## Format Priorities

- Excel is a first-priority ingestion format.
- PDF is a first-priority ingestion format.
- CSV is supported by the architecture.
- Images are architecture-ready only.
- OCR and image extraction are not implemented by this governance work.
- This correction implements no parser.

## Acceptance Boundary

Workstream Acceptance must eventually cover: Shared Foundation safety; Finance-first Adapter safety; source preservation; tenant isolation; staging; validation; quarantine; dry run; reconciliation; canonical posting; idempotency; audit evidence; and controlled real-client pilot evidence.

Workstream Acceptance does not require completion of every future Domain Adapter.

This correction itself does not achieve Workstream Acceptance.

## Current State

No technical work has been performed. Specifically, there is **no**:

- import batch table or entity;
- source-file registry or Storage bucket for import sources;
- staging table;
- validation, quarantine or dry-run mechanism;
- reconciliation report;
- parser or domain adapter;
- posting RPC;
- migration, SQL, application code or test authored for Historical Import.

No Slice has been defined, authorized or executed. No Acceptance and no Closure exist.

## Package Navigation

- [`roadmap.md`](./roadmap.md) — authoritative current state and Stage register.
- [`decisions.md`](./decisions.md) — local Workstream decisions.
- [`changelog.md`](./changelog.md) — chronological record.

## Parent Navigation

- [`RM-DH-004 package`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/README.md)
- [`RM-DH-004 authoritative current state`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/roadmap.md)
- [`Central Workstream registry`](../README.md)

## Governing Decision

[`DEC-RM-DH-004-003 — Phase 2 Governance Reconciliation and Creation of the WS-DH-2026-0006 Package`](../../roadmaps/rm-dh-004-financial-truth-historical-data-migration/decisions.md#dec-rm-dh-004-003--phase-2-governance-reconciliation-and-creation-of-the-ws-dh-2026-0006-package)

## Stopping Point

Governance package created only. The next permitted step is an independent Acceptance Re-Audit of the Prompt-53 governance reconciliation and of this package. No technical Foundation Audit and no Execution Contract is authorized.
