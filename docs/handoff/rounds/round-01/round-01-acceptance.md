<!--
id: DHB-R01-ACC
title: Round 1 — Acceptance and Closure Record
version: 1.1.0
status: accepted
audience: internal+external
source-round: R01
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3D as the Round 1 acceptance and closure record following the DG.3C read-only re-audit and DG.3D narrow documentation correction pass; v1.1.0 — ratifies the additive Account Types and Identity Model alignment (DEV v1.4.0, INT v1.4.0, new architecture reference `docs/architecture/account-types-and-identity-model.md` v1.0.0)
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
| `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` | `docs/architecture/account-types-and-identity-model.md` | Current-truth architecture reference for account types and the identity model (added under this acceptance) |
| DG.1 → DG.3C evidence chain | `docs/historical/audits/**` and repository-history evidence | Governance-audit evidence supporting acceptance |
| Documentation governance foundation | `docs/README.md`, `docs/CONVENTIONS.md`, canonical folder skeleton, canonical Documentation 01–13 rendering | Foundation created by DG.2 / DG.2B |

## 3. Final Accepted Versions

| ID | Version | Status |
|---|---|---|
| `DHB-R01-DEV` | 1.4.0 | canonical-accepted |
| `DHB-R01-INT` | 1.4.0 | supporting-accepted |
| `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` | 1.0.0 | accepted |
| `DHB-R01-ACC` (this file) | 1.1.0 | accepted |

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
- **Account Types and Identity Model alignment (v1.1.0 of this record)** — additive correction that preserved the verified "10 currently implemented account types" evidence, added the 3 planned types (Farrier, Professional Rider, Jockey), the 13 approved target contract, and the personal identity × workspace × role × profession × capability × permission × scope model. Codified in `docs/architecture/account-types-and-identity-model.md` and cross-referenced from `DHB-R01-DEV` and `DHB-R01-INT`.

## 5. Confirmed Corrections

Corrections applied during DG.3D that this acceptance ratifies:

- **Manager permission wording.** The prior broad statement that "`manager` role includes all permissions except `admin.permissions.delegate`" is replaced in both `DHB-R01-DEV` and `DHB-R01-INT` with wording that describes the actual resolution path (persisted role grants, role bundles, member bundles, member overrides), notes that owner is the only server-side bypass in `has_permission()`, and states that manager is a tenant-seeded system role whose permissions are tenant-configurable and must be verified per tenant. The corrected wording is identical in DEV and INT.
- **Authority question row 5.** Updated in `DHB-R01-DEV` to state that `admin.permissions.delegate` is never granted to `manager` in any current tenant and that delegation additionally requires a delegatable definition plus a `delegation_scopes` row, while other manager permissions are tenant-configurable.
- **`I18nContext` physical path.** `DHB-R01-DEV` §Global architecture now records `src/contexts/**` as containing `AuthContext` and `TenantContext` only, and explicitly points to `src/i18n/**` for `I18nContext`, matching the filesystem and the i18n row already present in the same section.

Additional corrections applied under v1.1.0 of this record:

- **Account-type count contract (10 / 3 / 13).** `DHB-R01-DEV` and `DHB-R01-INT` now explicitly record: 10 current implemented account/workspace types (verified against `public.tenant_type` and onboarding routes), 3 planned account/workspace types (Farrier, Professional Rider, Jockey), 13 approved target account/workspace types. Both files cross-reference `docs/architecture/account-types-and-identity-model.md` and explicitly state that the 3 planned types have no `tenant_type` enum value, onboarding route, `SelectRole` entry, dedicated module, capability defaults, or production-ready workflow.
- **Naming-collision disambiguation.** Both DEV/INT and the new architecture reference distinguish the existing HR classifications (`hr_employee_type = 'farrier'`, `exercise_rider`) from the planned Farrier and Professional Rider account/workspace types.
- **Identity model documentation.** DEV/INT now include a concise Personal Identity × Workspace × Role × Profession × Capability × Permission × Scope subsection and a Community Publishing Identity Principle note; the full model lives in the new architecture reference.
- **Confidentiality boundary preserved.** The private owner-governance Word document remains **outside** the shared repository. No owner-only governance content was added to `docs/`. The developer-facing Word file also remains external and is regenerated separately from the updated Markdown after repository acceptance.

## 6. Additivity Statement

The v1.1.0 correction is **additive**. It does not reopen or invalidate any previously accepted architecture evidence, metric, contract, classification, or count in Round 1. The first documentation package remains accepted after this correction. Historical documents (including all files under `docs/historical/**` that reference only "10 tenant types") are preserved unchanged as historical evidence; the new architecture reference provides current-truth qualification.

## 7. Residual Limitations Carried Forward

These are carried into Round 2 as verification tasks, not as closed product defects:

- **Environment separation confirmation** across all deployed surfaces (repository shows one Supabase project reference; runtime confirmation is owner / platform-side).
- **Auth-provider confirmation** for all enabled providers, SMTP configuration, and email-template deployment status.
- **Full RLS policy-body review** for every table (Round 1 established coverage and representative behaviour; per-policy body review is Round 2 scope).
- **Per-RPC tenant-validation review** confirming that every `SECURITY DEFINER` function that accepts a `p_tenant_id` internally validates it against `auth.uid()` membership.
- **Storage object-policy inventory** with per-bucket path convention, tenant-scoping proof, and share-link expiry review.
- **Cron / scheduled-job schedule verification** against `supabase/config.toml`, Edge Function schedules, and live cron-catalog metadata.
- **Membership authority review** including last-owner protection, self-role-change protection, and cross-tenant-membership isolation (Round 1 flagged as R-08).
- **CI / CD configuration confirmation** including branch protection, required checks, deployment triggers, and migration-application workflow.
- **Round 2 account-type and module implementation-reality mapping** (see §8) — including the required separate readiness assessment for the 3 planned types.

## 8. Round 2 Entry Criteria

Round 1 closure is sufficient to begin Round 2. Round 2 primary scope is:

**Account Types, Complete Module Inventory, and Current Implementation Reality.**

Round 2 must:

- deeply audit the 10 current implemented account/workspace types;
- separately assess architectural readiness and required foundations for the 3 planned account/workspace types (Farrier, Professional Rider, Jockey) toward the 13 approved target types;
- never claim the 3 planned types are currently implemented;
- open with the residual limitations in §7 as explicit inputs and not re-litigate Round 1 counts, contracts, or classifications unless new evidence emerges from live source or database metadata.

## 9. Closure Statement

> Round 1 is accepted and closed as the authoritative foundation handoff for platform architecture, repository structure, database baseline, tenancy, authentication, permissions, RLS, RPCs, Storage, Edge Functions, environments, testing signals, risks, and receiving-developer start instructions. The additive Account Types and Identity Model alignment (10 current implemented / 3 planned / 13 approved target) is accepted and does not reopen or invalidate previously accepted architecture evidence. This acceptance is not a production-readiness, launch-readiness, security-certification, or full-platform-completion declaration.
