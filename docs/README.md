<!--
id: DHB-INDEX
title: Dayli Horse — Documentation Index
version: 1.4.0
status: current
audience: internal+external
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.2; updated during DG.3A to record content-correction of DHB-R01-DEV and DHB-R01-INT to v1.1.0; updated during DG.3B to record evidence-completeness closure of DHB-R01-DEV and DHB-R01-INT to v1.2.0; updated during DG.3D to record Round 1 acceptance/closure at DHB-R01-DEV v1.3.0, DHB-R01-INT v1.3.0, and registration of DHB-R01-ACC v1.0.0; v1.4.0 — records the additive Account Types and Identity Model alignment (DEV v1.4.0, INT v1.4.0, ACC v1.1.0, Round 1 README v1.5.0) and registers the new current-truth architecture reference DHB-ARCH-ACCOUNT-TYPES-IDENTITY v1.0.0
source-sha256: n/a
-->

# Dayli Horse — Documentation Index

This is the canonical index for every documentation file in this repository.

## How to use this index

1. Locate the file you need by ID, title, or category.
2. Prefer current-truth documents (module docs, architecture docs, canonical handoff rounds) over historical evidence.
3. When byte-integrity matters, cite the raw evidence file plus its SHA-256 from `docs/historical/documentation-01-13/source-manifest.md`.
4. Do **not** correct historical documents by editing them. Corrections belong in later canonical current-truth documents that supersede specific claims.
5. Read `CONVENTIONS.md` before authoring or modifying any documentation file.

## Status of this repository's documentation (as of DG.2 / DG.2B / DG.3 / DG.3A / DG.3B / DG.3C / DG.3D)

- **Central index and conventions:** established (DG.2).
- **Canonical folder skeleton:** established (DG.2).
- **Documentation 01–13 raw preservation + canonical historical Markdown:** established (DG.2); rendering-only correction applied to canonical Docs 04, 06, 07, 08, 09, 10, 13 in DG.2B (outer plain-text fence removed so headings/anchors render natively — no wording, ordering, or claims changed; raw sources unchanged).
- **Round 1 raw provenance (inputs + raw output):** established (DG.2).
- **Rewritten external-developer Round 1 handoff (`round-01-developer-handoff.md`, `DHB-R01-DEV`):** **ACCEPTED at v1.4.0** (Account Types and Identity Model alignment). Authored DG.3, corrected DG.3A to v1.1.0, evidence-closure DG.3B to v1.2.0, DG.3C read-only re-audit, DG.3D narrow correction to v1.3.0 (manager-permission wording, authority-question row 5, `I18nContext` physical-path note), v1.4.0 additive alignment (10 current / 3 planned / 13 target; identity model & Community publishing identity principle) with cross-reference to `docs/architecture/account-types-and-identity-model.md`.
- **Internal Lovable Round 1 reference (`round-01-lovable-reference.md`, `DHB-R01-INT`):** **ACCEPTED at v1.4.0.** Condensed 10 / 3 / 13 account-type contract and identity/authority reminders aligned to DEV v1.4.0.
- **Round 1 acceptance (`round-01-acceptance.md`, `DHB-R01-ACC`):** **ACCEPTED at v1.1.0.** Ratifies the additive Account Types and Identity Model alignment (DEV v1.4.0, INT v1.4.0, new architecture reference v1.0.0). Round 1 remains closed; the first documentation package remains accepted after this additive correction. Round 2 is ready to begin (primary scope: Account Types, Complete Module Inventory, Current Implementation Reality — with a separate readiness assessment for the 3 planned types).
- **Account Types and Identity Model current-truth architecture reference (`docs/architecture/account-types-and-identity-model.md`, `DHB-ARCH-ACCOUNT-TYPES-IDENTITY`):** **CREATED and ACCEPTED at v1.0.0.** Permanent current-truth source for 10 current implemented account/workspace types, 3 planned types (Farrier, Professional Rider, Jockey), 13 approved target types, and the personal identity × workspace × role × profession × capability × permission × scope model, including the Community Publishing Identity Principle.
- **Current-truth summary:** Account Types and Identity Model aligned — **10 current implemented, 3 planned, 13 approved target.** Historical files under `docs/historical/**` that reference only "10 tenant types" remain preserved as historical evidence; the new architecture reference provides current-truth qualification.
- **Root `README.md`:** unchanged (still a template placeholder). A later phase will rewrite it after owner approval.
- **Legacy files** (`docs/aml_1_b_1/**`, `docs/*.md`, `docs/Documentation_13_-_Laboratory_Workstream_Closure.md`, root schema snapshots, root N2.2 report): **preserved in place**. A later acceptance-approved cleanup phase will retire or relocate them; until then they remain the source of truth for their topics.
- **Owner-governance Word files:** intentionally **outside** this repository. Do not add.

### Placeholder-README index exemption (DG.2B)

Category-scope placeholder READMEs (files whose only content is folder-purpose/status metadata under an already-indexed parent folder — for example `docs/architecture/README.md`, `docs/modules/README.md`, `docs/operations/README.md`, `docs/workflows/README.md`, `docs/templates/README.md`, `docs/governance/README.md`, `docs/security/README.md`, `docs/handoff/final/README.md`, `docs/historical/execution-closures/README.md`, `docs/historical/module-legacy/README.md`, `docs/historical/module-legacy/laboratory/README.md`, `docs/historical/release-notes/README.md`, `docs/historical/schema-snapshots/README.md`) are **exempt** from individual central-index registration per `CONVENTIONS.md` §8, provided they carry no independent technical claims. Substantive READMEs (handoff, rounds, historical identity/supersession, runbooks, module docs, operations, audits, evidence) remain individually indexed.

> ⚠️ **Cleanup warning:** legacy files remain at their original repository paths until a later acceptance-approved migration executes. Do not treat their presence at those paths as endorsement of that layout — see the pending-cleanup section below.

## Documentation registry

| ID | Title | Path | Category | Audience | Status | Version | Source round | Coverage | Supersedes | Superseded by | Remaining gaps | Owner approval |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DHB-INDEX` | Documentation index (this file) | `docs/README.md` | index | internal+external | current | 1.0.0 | DG.2 | index registry | — | — | extends as new docs land | — |
| `DHB-CONV` | Documentation Conventions | `docs/CONVENTIONS.md` | conventions | internal+external | current | 1.0.0 | DG.2 | authoring & governance rules | — | — | — | — |
| `DHB-AUDIT-DG1` | DG.1 — Documentation Governance & Repository Cleanup Audit | `docs/historical/audits/dg-1-documentation-governance-audit.md` | audit | internal | historical-audit | 1.0.0 | DG.1 | documentation inventory + first cleanup proposal | — | DHB-AUDIT-DG1A | corrections captured in DG.1A | — |
| `DHB-AUDIT-DG1A` | DG.1A — Documentation Alignment & Evidence Closure Audit | `docs/historical/audits/dg-1a-alignment-evidence-closure.md` | audit | internal | historical-audit | 1.0.0 | DG.1A | corrects DG.1; final import + cleanup model | DHB-AUDIT-DG1 | — | — | — |
| `DHB-HANDOFF-README` | Handoff — README | `docs/handoff/README.md` | handoff | internal+external | current | 1.0.0 | DG.2 | handoff folder overview | — | — | — | — |
| `DHB-R01-README` | Round 1 — README and status | `docs/handoff/rounds/round-01/README.md` | handoff-round | internal+external | current | 1.5.0 | DG.2, updated through DG.3D and Account Types & Identity Model alignment | Round 1 status | — | — | — | — |
| `DHB-R01-INPUTS` | Round 1 — Investigative and Proceed Prompts (verbatim) | `docs/handoff/rounds/round-01/round-01-inputs.md` | handoff-round-evidence | internal | evidence-immutable | 1.0.0 | DG.2 | Round 1 prompts | — | — | immutable | — |
| `DHB-R01-RAW` | Round 1 — Raw Audit Output (verbatim) | `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` | handoff-round-evidence | internal | evidence-immutable | 1.0.0 | DG.2 | Round 1 output | — | — | immutable | — |
| `DHB-R01-DEV` | Round 1 — Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment | `docs/handoff/rounds/round-01/round-01-developer-handoff.md` | handoff-round-canonical | external-developer | canonical-accepted | 1.4.0 | DG.3 (authored), DG.3A (content correction), DG.3B (evidence closure), DG.3D (final DG.3C corrections), v1.4.0 (Account Types & Identity Model alignment) | canonical Round 1 external-developer handoff | — | — | Round 2 supersedes Round 1 scope for account-type / module / implementation-reality coverage | accepted |
| `DHB-R01-INT` | Round 1 — Internal Lovable Reference | `docs/handoff/rounds/round-01/round-01-lovable-reference.md` | handoff-round-internal | internal-lovable | supporting-accepted | 1.4.0 | DG.3 (authored), DG.3A (alignment), DG.3B (re-alignment), DG.3D (manager wording alignment), v1.4.0 (Account Types & Identity Model alignment) | internal-facing condensed Round 1 companion to DHB-R01-DEV | — | — | tracks DHB-R01-DEV | accepted |
| `DHB-R01-ACC` | Round 1 — Acceptance and Closure Record | `docs/handoff/rounds/round-01/round-01-acceptance.md` | handoff-round-acceptance | internal+external | accepted | 1.1.0 | DG.3D, v1.1.0 (additive alignment ratified) | ratifies canonical Round 1 handoff at v1.4.0, INT v1.4.0, architecture reference v1.0.0; closes Round 1 | — | — | Round 2 residuals carried forward | accepted |
| `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` | Dayli Horse — Account Types and Identity Model | `docs/architecture/account-types-and-identity-model.md` | architecture-current-truth | internal+external | current | 1.0.0 | Account Types & Identity Model alignment | current-truth reference for 10 current implemented / 3 planned / 13 approved target account/workspace types and the identity × workspace × role × profession × capability × permission × scope model | — | — | maintained alongside `tenant_type` enum, onboarding routes, and `TenantContext` | accepted |
| `DHB-HIST-DOCS-README` | Historical Documentation 01–13 — README | `docs/historical/documentation-01-13/README.md` | historical-index | internal | current | 1.0.0 | DG.2 | 01–13 archive overview | — | — | — | — |
| `DHB-DOC01-13-SRC-MANIFEST` | Documentation 01–13 — Source manifest | `docs/historical/documentation-01-13/source-manifest.md` | historical-manifest | internal | current | 1.0.0 | DG.2 | raw source hash registry | — | — | — | — |
| `DHB-DOC01` | Documentation 1 — Forensic Platform Architecture Audit | `docs/historical/documentation-01-13/01-forensic-platform-architecture-audit.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC01-RAW` | Documentation 1 — raw source | `docs/historical/documentation-01-13/raw/01-forensic-platform-architecture-audit.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC02` | Documentation 2 — Module Activation & Post-Onboarding Experience Audit | `docs/historical/documentation-01-13/02-module-activation-post-onboarding.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC02-RAW` | Documentation 2 — raw source | `docs/historical/documentation-01-13/raw/02-module-activation-post-onboarding.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC03` | Documentation 3 — Shared Module Depth Audit | `docs/historical/documentation-01-13/03-shared-module-depth-audit.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC03-RAW` | Documentation 3 — raw source | `docs/historical/documentation-01-13/raw/03-shared-module-depth-audit.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC04` | Documentation 4 — Domain-Specific Module Depth Audit | `docs/historical/documentation-01-13/04-domain-specific-module-depth-audit.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC04-RAW` | Documentation 4 — raw source | `docs/historical/documentation-01-13/raw/04-domain-specific-module-depth-audit.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC05` | Documentation 5 — Integration & Cross-Module Flow Audit | `docs/historical/documentation-01-13/05-integration-cross-module-flow-audit.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC05-RAW` | Documentation 5 — raw source | `docs/historical/documentation-01-13/raw/05-integration-cross-module-flow-audit.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC06` | Documentation 6 — Corrective Action Prioritization & Execution Roadmap | `docs/historical/documentation-01-13/06-corrective-action-prioritization-roadmap.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC06-RAW` | Documentation 6 — raw source | `docs/historical/documentation-01-13/raw/06-corrective-action-prioritization-roadmap.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC07` | Documentation 7 — Post Baseline Delta Documentation | `docs/historical/documentation-01-13/07-post-baseline-delta-documentation.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC07-RAW` | Documentation 7 — raw source | `docs/historical/documentation-01-13/raw/07-post-baseline-delta-documentation.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC08` | Documentation 8 — Housing & Facilities Workstream | `docs/historical/documentation-01-13/08-housing-facilities-workstream.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC08-RAW` | Documentation 8 — raw source | `docs/historical/documentation-01-13/raw/08-housing-facilities-workstream.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC09` | Documentation 9 — Post-Documentation 8 Continuation Report | `docs/historical/documentation-01-13/09-post-documentation-8-continuation-report.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC09-RAW` | Documentation 9 — raw source | `docs/historical/documentation-01-13/raw/09-post-documentation-8-continuation-report.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC10` | Documentation 10 — Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure | `docs/historical/documentation-01-13/10-financial-architecture-maturation.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC10-RAW` | Documentation 10 — raw source | `docs/historical/documentation-01-13/raw/10-financial-architecture-maturation.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC11` | Documentation 11 — People, Team & Partners Workstream Full Lifecycle | `docs/historical/documentation-01-13/11-people-team-partners-full-lifecycle.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC11-RAW` | Documentation 11 — raw source | `docs/historical/documentation-01-13/raw/11-people-team-partners-full-lifecycle.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC12` | Documentation 12 — Backend Permission Enforcement Migration | `docs/historical/documentation-01-13/12-backend-permission-enforcement-migration.md` | historical-doc-canonical | internal | historical | 1.0.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC12-RAW` | Documentation 12 — raw source | `docs/historical/documentation-01-13/raw/12-backend-permission-enforcement-migration.md` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC13` | Documentation 13 — Operational Truth Stabilization | `docs/historical/documentation-01-13/13-operational-truth-stabilization.md` | historical-doc-canonical | internal | historical | 1.1.0 | owner-supplied | historical baseline | — | later canonical current-truth documents (module/architecture) where they conflict | content may conflict with current implementation truth | — |
| `DHB-DOC13-RAW` | Documentation 13 — raw source | `docs/historical/documentation-01-13/raw/13-operational-truth-stabilization.txt` | historical-doc-raw | internal | evidence-immutable | 1.0.0 | owner-supplied | byte-exact source | — | — | immutable | — |
| `DHB-DOC13-SRC-LAB` | Laboratory Workstream Closure — historical source artifact | `docs/historical/documentation-01-13/source-artifacts/laboratory-workstream-closure-source.md` | historical-source-artifact | internal | historical-source-artifact | 1.0.0 | repository legacy file (copy) | Laboratory-scoped predecessor folded into canonical Doc 13 | — | DHB-DOC13 | not canonical Doc 13 | — |
| `LEG-AML-PLAN-LOCK` | AML.1.b.1 — Plan Lock | `docs/aml_1_b_1/PLAN_LOCK.md` | legacy-audit-artifact | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-AML-TREE` | AML.1.b.1 — full audit tree (83 files preserved in place) | `docs/aml_1_b_1/` | legacy-audit-artifact | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-CLOUDFLARE` | Cloudflare Worker proxy setup runbook | `docs/CLOUDFLARE_PROXY_SETUP.md` | legacy-operations | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-HR-DEMO` | HR demo script | `docs/hr-demo-script.md` | legacy-module | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-LAB-MVP` | Laboratory MVP notes | `docs/laboratory-mvp.md` | legacy-module | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-PLATFORM-UX` | Platform UX standards | `docs/platform-ux-standards.md` | legacy-module | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-REL-HM-I18N` | Release notes — housing/movement i18n | `docs/release-housing-movement-i18n.md` | legacy-release-notes | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-RTL-TYPO` | RTL typography notes | `docs/rtl-typography.md` | legacy-module | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-STAB-REL` | Release notes — stabilization | `docs/stabilization-release-notes.md` | legacy-release-notes | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-DOC13-LAB-INPLACE` | Documentation 13 (Laboratory closure) — legacy in-place path (do not use as canonical Doc 13) | `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` | legacy-source-artifact | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-N22-REPORT` | Phase N2.2 backend RPC corrective execution report | `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` | legacy-execution-closure | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-SCHEMA-INV` | Root schema snapshot — invoices | `invoices.schema.txt` | legacy-schema-snapshot | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-SCHEMA-INV-ITEMS` | Root schema snapshot — invoice_items | `invoice_items.schema.txt` | legacy-schema-snapshot | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-SCHEMA-BILL-LINKS` | Root schema snapshot — billing_links | `billing_links.schema.txt` | legacy-schema-snapshot | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-SCHEMA-CUST-BAL` | Root schema snapshot — customer_balances | `customer_balances.schema.txt` | legacy-schema-snapshot | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |
| `LEG-SCHEMA-EXPENSES` | Root schema snapshot — expenses | `expenses.schema.txt` | legacy-schema-snapshot | internal | legacy-location | — | pre-DG.2 | existing supporting evidence | — | — | pending later cleanup phase | acceptance required before move |

## Documentation 13 — identity note

- **Canonical Doc 13** = `docs/historical/documentation-01-13/13-operational-truth-stabilization.md` (normalized from the owner-supplied `Documentation 13 - Operational Truth Stabilization.txt` source).
- **Laboratory Workstream Closure** = a separate historical source artifact, preserved twice:
  - in its legacy in-place path `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` (unchanged during DG.2), and
  - as a classified byte-exact copy at `docs/historical/documentation-01-13/source-artifacts/laboratory-workstream-closure-source.md`.
- The Laboratory closure artifact is **not** canonical Doc 13.

## Pending cleanup actions (deferred beyond DG.2 — require owner acceptance)

1. Rewrite root `README.md` with real project identity.
2. Import canonical current-truth handoff documents (`round-01-developer-handoff.md`, `round-01-lovable-reference.md`) authored from Round 1 evidence.
3. Owner + developer acceptance record for Round 1 (`round-01-acceptance.md`).
4. Relocate legacy files listed above into the canonical folder skeleton (module → `docs/modules/…`, ops → `docs/operations/…`, release notes → `docs/historical/release-notes/`, schema snapshots → `docs/historical/schema-snapshots/…`, N2.2 report → `docs/historical/execution-closures/…`).
5. Retire the legacy `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` path in favor of the classified source-artifact copy already present under `docs/historical/documentation-01-13/source-artifacts/`.
6. Add `docs/aml_1_b_1/README.md` in place (the AML.1.b.1 tree itself remains where it is).
7. Decide final visibility of rollback TSVs containing real business/PII data before any public GitHub mirror is enabled (see DG.1A §G, S12–S15).

## Related read-me files

- [`CONVENTIONS.md`](./CONVENTIONS.md) — authoring and governance rules.
- [`handoff/README.md`](./handoff/README.md) — handoff folder overview.
- [`handoff/rounds/round-01/README.md`](./handoff/rounds/round-01/README.md) — Round 1 status.
- [`historical/documentation-01-13/README.md`](./historical/documentation-01-13/README.md) — 01–13 archive overview.
- [`historical/documentation-01-13/source-manifest.md`](./historical/documentation-01-13/source-manifest.md) — raw source hash registry.
