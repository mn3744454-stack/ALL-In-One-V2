<!--
id: DHB-R01-ACC
title: Round 1 — Acceptance and Closure Record
version: 1.0.0
status: accepted
audience: internal+external
source-round: R01
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3D as the Round 1 acceptance and closure record following the DG.3C read-only re-audit and DG.3D narrow documentation correction pass
source-sha256: n/a
-->

# Round 1 — Acceptance and Closure Record (`DHB-R01-ACC`)

## 1. Acceptance Scope

This record accepts the canonical Round 1 documentation set as the authoritative foundation handoff for the Dayli Horse platform, covering platform architecture, repository structure, database baseline, tenancy, authentication, permissions, RLS, RPCs, Storage, Edge Functions, environment foundation, testing signals, risks, and receiving-developer start instructions.

Round 1 is a **foundation handoff**. It is not a production-readiness certification, launch-readiness certification, security certification, or full-platform-completion declaration. Product depth (account types, complete module inventory, current implementation reality) is Round 2 scope.

## 2. Accepted Artifacts

| Artifact | Path | Role |
|---|---|---|
| `DHB-R01-DEV` | `docs/handoff/rounds/round-01/round-01-developer-handoff.md` | Canonical external-developer Round 1 handoff |
| `DHB-R01-INT` | `docs/handoff/rounds/round-01/round-01-lovable-reference.md` | Internal Lovable Round 1 reference |
| `DHB-R01-INPUTS` | `docs/handoff/rounds/round-01/round-01-inputs.md` | Round 1 raw investigative and proceed prompts (immutable evidence) |
| `DHB-R01-RAW` | `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` | Round 1 raw audit output (immutable evidence) |
| DG.1 → DG.3C evidence chain | `docs/historical/audits/**` and repository-history evidence | Governance-audit evidence supporting acceptance |
| Documentation governance foundation | `docs/README.md`, `docs/CONVENTIONS.md`, canonical folder skeleton, canonical Documentation 01–13 rendering | Foundation created by DG.2 / DG.2B |

## 3. Final Accepted Versions

| ID | Version | Status |
|---|---|---|
| `DHB-R01-DEV` | 1.3.0 | canonical-accepted |
| `DHB-R01-INT` | 1.3.0 | supporting-accepted |
| `DHB-R01-ACC` (this file) | 1.0.0 | accepted |

## 4. Evidence Chain

Acceptance is grounded in the following governance sequence:

- **DG.1** — original documentation-governance and repository-cleanup audit.
- **DG.1A** — alignment and evidence-closure audit correcting DG.1.
- **DG.2** — additive documentation foundation, canonical folder skeleton, canonical Documentation 01–13 import.
- **DG.2A** — additive-foundation acceptance and integrity re-audit.
- **DG.2B** — narrow canonical-markdown usability correction (rendering only).
- **DG.3** — canonical authoring of `DHB-R01-DEV` and `DHB-R01-INT` from Round 1 raw evidence.
- **DG.3A** — content correction restoring compressed material findings (baseline counts, movement RPC arity, tenant-creation atomicity, authority answers, PWA truth, 21-part framework mapping).
- **DG.3B** — evidence-completeness closure (route/guard matrix, relationship map, isolation-helper inventory, RLS matrix, cross-tenant patterns, RPC-registry columns, framework-title precision, environment qualification, DebugAuth reclassification, Vitest test-file terminology).
- **DG.3C** — read-only acceptance re-audit that identified two remaining material corrections (broad manager-permission claim; `I18nContext` physical-location claim).
- **DG.3D** — narrow documentation correction that applied the DG.3C-mandated wording to `DHB-R01-DEV` and `DHB-R01-INT`, created this acceptance record, updated the Round 1 README, and updated the central index.

## 5. Confirmed Corrections

Corrections applied during DG.3D that this acceptance ratifies:

- **Manager permission wording.** The prior broad statement that "`manager` role includes all permissions except `admin.permissions.delegate`" is replaced in both `DHB-R01-DEV` and `DHB-R01-INT` with wording that describes the actual resolution path (persisted role grants, role bundles, member bundles, member overrides), notes that owner is the only server-side bypass in `has_permission()`, and states that manager is a tenant-seeded system role whose permissions are tenant-configurable and must be verified per tenant. The corrected wording is identical in DEV and INT.
- **Authority question row 5.** Updated in `DHB-R01-DEV` to state that `admin.permissions.delegate` is never granted to `manager` in any current tenant and that delegation additionally requires a delegatable definition plus a `delegation_scopes` row, while other manager permissions are tenant-configurable.
- **`I18nContext` physical path.** `DHB-R01-DEV` §Global architecture now records `src/contexts/**` as containing `AuthContext` and `TenantContext` only, and explicitly points to `src/i18n/**` for `I18nContext`, matching the filesystem and the i18n row already present in the same section.

No other Round 1 content was modified during DG.3D.

## 6. Residual Limitations Carried Forward

These are carried into Round 2 as verification tasks, not as closed product defects:

- **Environment separation confirmation** across all deployed surfaces (repository shows one Supabase project reference; runtime confirmation is owner / platform-side).
- **Auth-provider confirmation** for all enabled providers, SMTP configuration, and email-template deployment status.
- **Full RLS policy-body review** for every table (Round 1 established coverage and representative behaviour; per-policy body review is Round 2 scope).
- **Per-RPC tenant-validation review** confirming that every `SECURITY DEFINER` function that accepts a `p_tenant_id` internally validates it against `auth.uid()` membership.
- **Storage object-policy inventory** with per-bucket path convention, tenant-scoping proof, and share-link expiry review.
- **Cron / scheduled-job schedule verification** against `supabase/config.toml`, Edge Function schedules, and live cron-catalog metadata.
- **Membership authority review** including last-owner protection, self-role-change protection, and cross-tenant-membership isolation (Round 1 flagged as R-08).
- **CI / CD configuration confirmation** including branch protection, required checks, deployment triggers, and migration-application workflow.
- **Round 2 account-type and module implementation-reality mapping** (see §7).

## 7. Round 2 Entry Criteria

Round 1 closure is sufficient to begin Round 2. Round 2 primary scope is:

**Account Types, Complete Module Inventory, and Current Implementation Reality.**

Round 2 must open with the residual limitations in §6 as explicit inputs and must not re-litigate Round 1 counts, contracts, or classifications unless new evidence emerges from live source or database metadata.

## 8. Closure Statement

> Round 1 is accepted and closed as the authoritative foundation handoff for platform architecture, repository structure, database baseline, tenancy, authentication, permissions, RLS, RPCs, Storage, Edge Functions, environments, testing signals, risks, and receiving-developer start instructions. This acceptance is not a production-readiness, launch-readiness, security-certification, or full-platform-completion declaration.
