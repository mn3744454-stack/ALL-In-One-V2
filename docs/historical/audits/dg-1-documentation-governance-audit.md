<!--
id: DHB-AUDIT-DG1
title: DG.1 — Documentation Governance & Repository Cleanup Audit
version: 1.0.0
status: historical-audit
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: DHB-AUDIT-DG1A
source: owner-supplied audit report (`governance/dg-1-read-only-audit-report.md`)
source-sha256: 071a36e5d5a3654fe8a3db4738685b9705546cadba7f3189bbed746e2345e958
-->

# DG.1 — Documentation Governance & Repository Cleanup Audit

> **Immutable audit provenance.** Preserved verbatim. Any correction is captured in DG.1A (`dg-1a-alignment-evidence-closure.md`); DG.1A **corrects DG.1 where the two conflict**.
> Source SHA-256: `071a36e5d5a3654fe8a3db4738685b9705546cadba7f3189bbed746e2345e958`
> This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.

---


# DG.1 — Documentation Governance & Repository Cleanup Audit

Read-only. No file, database, config, or repository state was modified.

---

## A. Executive Verdict

**DOCUMENTATION FRAGMENTED — CONTROLLED REORGANIZATION REQUIRED.**

Only one of the thirteen numbered "Documentation" reports (Doc 13) is committed to the repository. Docs 1–12 are referenced by Doc 13 as prior baselines but exist nowhere in the tree, in git history for the current branch, or in any tracked format (`.md`, `.docx`, `.pdf`, `.rtf`, `.txt`). All prior audit deliverables appear to have lived in chat only. The repository does hold a large, well-structured `docs/aml_1_b_1/` finance-hardening audit trail (stages 01, 02, 05, 06, j5_1, j5_2, n2_2) plus a handful of module docs and one root-level corrective-execution report. There is no documentation index, no `docs/README.md`, no naming standard, no versioning convention, and no separation between shared technical documentation, owner-governance documentation, and historical archive. No secret values were observed in documentation files during scan (informational — see H).

## B. Scope, Method, and Access Limitations

**Method:** `ls`, `find`, `rg`, `git ls-files`, `git status`, `wc`, `head`. No writes. No `git log/show/blame` was needed because untracked-vs-tracked classification was resolvable from `git ls-files` + `git status`.
**Coverage:** repo root, `docs/**` (all depths), `.lovable/`, `.workspace/skills/`, `scripts/`, `supabase/` operational notes, `public/`.
**Not inspected in depth:** full git history across branches (single-branch working tree only), any external drives, Google Docs, chat exports outside the repo. If Docs 1–12 exist in the owner's private storage they are outside this audit's evidence scope.

## C. Current Documentation Landscape

Three de-facto clusters, no governance layer over them:

1. **Root-level ad-hoc reports** — `README.md` (Lovable template, unedited), `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` (561 lines, N+2 execution report living at repo root instead of under `docs/`), plus six `*.schema.txt` finance-table dumps at root.
2. **`docs/` topical/module notes** — `CLOUDFLARE_PROXY_SETUP.md`, `hr-demo-script.md`, `laboratory-mvp.md`, `platform-ux-standards.md`, `release-housing-movement-i18n.md`, `rtl-typography.md`, `stabilization-release-notes.md`, and the single numbered artifact `Documentation_13_-_Laboratory_Workstream_Closure.md`.
3. **`docs/aml_1_b_1/` finance-hardening audit trail** — deep stage-organized preflight, closure, rollback, migration, and execution-spec files (~100+ files, mix of `.md`, `.sql`, `.tsv`, `.txt`). This is the only sub-tree that resembles a governed audit archive.

Auxiliary: `.lovable/plan.md` (single planning file), `.workspace/skills/**` (26 SKILL.md agent skills — not user documentation).

No `docs/README.md`. No index. No `historical/`, `handoff/`, `architecture/`, `operations/`, `security/` sub-trees.

## D. Complete Documentation Inventory (representative — 100% of top-level MD/notable artifacts)

| ID | Filename | Path | Fmt | Tracked | Size | Purpose | Version evidence | Status | Confidence |
|----|----------|------|-----|---------|------|---------|------------------|--------|------------|
| D01 | README.md | / | md | ✅ | 2.1KB | Lovable default template | Unedited placeholder ("REPLACE_WITH_PROJECT_ID") | Incomplete | High |
| D02 | dayli-horse-n2-2-backend-rpc-corrective-execution-report.md | / | md | ✅ | 29KB / 561L | N2.2 RPC corrective execution report | Content-dated post-Phase N+2 | Historical but useful, mis-located | High |
| D03 | Documentation_13_-_Laboratory_Workstream_Closure.md | docs/ | md | ✅ | ~30KB / 195L | Doc 13 — Lab closure | Explicitly self-labeled "Documentation 13", cites Doc 12 as baseline | Canonical current (Lab), naming non-standard | High |
| D04 | CLOUDFLARE_PROXY_SETUP.md | docs/ | md | ✅ | — | Ops setup guide | Undated | Operational runbook | High |
| D05 | hr-demo-script.md | docs/ | md | ✅ | — | HR demo script | Undated | Historical but useful | Medium |
| D06 | laboratory-mvp.md | docs/ | md | ✅ | — | Early Lab MVP spec | Predates Doc 13 | Superseded (partial) by Doc 13 | Medium |
| D07 | platform-ux-standards.md | docs/ | md | ✅ | — | UX standards | Undated | Current supporting doc | Medium |
| D08 | release-housing-movement-i18n.md | docs/ | md | ✅ | — | Release note | Feature-scoped | Historical but useful | Medium |
| D09 | rtl-typography.md | docs/ | md | ✅ | — | RTL type spec | Undated | Current supporting doc | Medium |
| D10 | stabilization-release-notes.md | docs/ | md | ✅ | — | Release notes | Undated | Historical but useful | Medium |
| D11 | PLAN_LOCK.md | docs/aml_1_b_1/ | md | ✅ | — | AML.1.b.1 execution contract | Self-labels as superseding "Markdown 32/33/34" | Canonical current (finance hardening lock) | High |
| D12 | STAGE_01_CLOSURE.md | docs/aml_1_b_1/stage_01_preflight/ | md | ✅ | — | Stage 1 closure | Sequenced | Canonical current (stage) | High |
| D13 | STAGE_02_ROLLBACK_MANIFEST.md | docs/aml_1_b_1/stage_02_rollback_artifacts/ | md | ✅ | — | Stage 2 rollback manifest | Sequenced | Rollback/recovery artifact | High |
| D14 | STAGE_05_CLOSURE.md | docs/aml_1_b_1/stage_05_private_helpers/ | md | ✅ | — | Stage 5 closure | Sequenced | Canonical current (stage) | High |
| D15 | STAGE_06_EXECUTION_SPEC.md | docs/aml_1_b_1/stage_06_readiness/ | md | ✅ | — | Stage 6 execution spec | Sequenced | Canonical current (stage) | High |
| D16 | 28_phase_2_functional_closure_and_deferred_hardening.md | docs/aml_1_b_1/stage_j5_2/ | md | ✅ | — | J5.2 phase 2 closure | Sequenced | Canonical current (stage) | High |
| D17 | N2_2_ROLLBACK.md | docs/aml_1_b_1/n2_2/ | md | ✅ | — | N2.2 rollback | Sequenced | Rollback/recovery artifact | High |
| D18 | 00_SUMMARY.md + 01…26 preflight md/sql/txt | docs/aml_1_b_1/stage_j5_1/preflight/, stage_j5_2/preflight/ | mixed | ✅ | — | Preflight evidence bundles | Numeric-ordered | Historical but still useful (audit evidence) | High |
| D19 | *.schema.txt (billing_links, customer_balances, expenses, invoice_items, invoices) | / | txt | ✅ | ~15KB total | Schema snapshots | Undated dump | Temporary/generated artifact, mis-located | Medium |
| D20 | *.tsv rollback data (billing_links_full, customer_balances_full, expenses_full, invoices_index, ledger_entries_index, protected_preimages, relacl_fingerprint) | docs/aml_1_b_1/stage_02_rollback_artifacts/ | tsv | ✅ | — | Preimage snapshots | Stage-2 dated | Rollback/recovery artifact | High |
| D21 | .lovable/plan.md | .lovable/ | md | ✅ | — | Round 1 execution plan | Session-scoped | Historical but useful | Medium |
| D22 | .workspace/skills/**/SKILL.md (26 files) | .workspace/skills/ | md | ✅ | — | Agent skill definitions | Governance-managed | Operational runbook (agent) | High |

## E. Documentation 1–13 Reconciliation

| Doc | Located? | Path | Version(s) | Current authority | Superseded by | Proposed canonical status | Required future action |
|-----|----------|------|-----------|-------------------|---------------|---------------------------|------------------------|
| 1 Forensic Platform Architecture Audit | ❌ | — | none in repo | Chat-only | — | Missing from repository but referenced elsewhere | Owner must supply source; import to `docs/historical/documentation-01-13/` |
| 2 Module Activation & Post-Onboarding Experience Audit | ❌ | — | none | Chat-only | — | Missing | Same |
| 3 Shared Module Depth Audit | ❌ | — | none | Chat-only | — | Missing | Same |
| 4 Domain-Specific Module Depth Audit | ❌ | — | none | Chat-only | — | Missing | Same |
| 5 Integration & Cross-Module Flow Audit | ❌ | — | none | Chat-only | — | Missing | Same |
| 6 Corrective Action Prioritization & Execution Roadmap | ❌ | — | none | Chat-only | Partially by AML.1.b.1 stage docs | Missing | Same |
| 7 Post Baseline Delta Documentation | ❌ | — | none | Chat-only | — | Missing | Same |
| 8 Housing & Facilities Workstream | ❌ | — | none | Chat-only | Partially by memory `mem://architecture/stable/*` | Missing | Same |
| 9 Post-Documentation 8 Continuation Report | ❌ | — | none | Chat-only | — | Missing | Same |
| 10 Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure | ❌ | — | none | Chat-only | Partially by `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` and `docs/aml_1_b_1/**` | Missing | Same |
| 11 People, Team & Partners Workstream Full Lifecycle | ❌ | — | none | Chat-only | — | Missing | Same |
| 12 Backend Permission Enforcement Migration | ❌ | — | none | Chat-only (cited as baseline by Doc 13 §4.1) | — | Missing | Same |
| 13 Laboratory Workstream Closure | ✅ | `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` | Single copy, 195 lines | Canonical | — | Canonical current, rename to standard | Rename + move to `docs/historical/documentation-01-13/`; add to index |

**Only Doc 13 is committed.** Docs 1–12 are unrecoverable from repository evidence and must be sourced from owner archives before any consolidated handoff bundle can claim completeness.

## F. Duplicate and Overlap Register

| Group | Files | Relationship | Most authoritative | Evidence | Treatment |
|-------|-------|--------------|--------------------|----------|-----------|
| G1 | `docs/laboratory-mvp.md` vs `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` | Same domain, different eras | Doc 13 | Doc 13 §4 declares scope closes Phase 5–8 Lab roadmap | Keep both; mark laboratory-mvp as historical, link from Doc 13 |
| G2 | Root `*.schema.txt` (5 files) vs `docs/aml_1_b_1/stage_j5_1/preflight/02_invoices_schema.txt`, `03_invoice_items_schema.txt` | Overlapping schema dumps, different dates | Preflight versions (dated + in audit trail) | Preflight files are stage-anchored | Move root `.schema.txt` under `docs/historical/schema-snapshots/` or delete if identical (needs diff) |
| G3 | `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` (root) vs `docs/aml_1_b_1/n2_2/N2_2_ROLLBACK.md` | Same workstream N2.2 | Both authoritative (execution vs rollback) | Different roles | Move report into `docs/aml_1_b_1/n2_2/`; keep both |
| G4 | `.lovable/plan.md` vs any future `docs/handoff/rounds/round-01-plan.md` | Session plan vs canonical | Canonical version once created | `.lovable/plan.md` is a scratchpad | Retain as historical evidence |
| G5 | `README.md` (root Lovable template) vs a proposed real project README | Placeholder vs desired | Neither (real one not authored) | Contains `REPLACE_WITH_PROJECT_ID` | Owner-decision: rewrite in place |

No exact byte-duplicate files were confirmed (a `sha256sum` comparison run belongs to Phase 1 of the future execution prompt, not to this audit).

## G. Link and Reference Health

| Ref | Source | Target | Result | Problem | Correction |
|-----|--------|--------|--------|---------|------------|
| L1 | `docs/Documentation_13_...md` §4.1 | "Documentation 12 — Backend Permission Enforcement Migration" | Missing file | Referenced baseline not in repo | Owner supplies; add pointer file in `docs/historical/documentation-01-13/12-*.md` |
| L2 | `docs/Documentation_13_...md` §15 | "Documentation 14" | Undefined | Forward reference | Reserve slot in index; do not create empty file |
| L3 | `docs/aml_1_b_1/PLAN_LOCK.md` | "Markdown 20–34" | Missing files | External chat markdowns | Add note in `docs/aml_1_b_1/README.md` that Markdowns 20–34 are chat-only historical inputs |
| L4 | `README.md` | `https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID` | Broken placeholder | Template not customized | Owner-decision rewrite |
| L5 | (implied) any doc → root `*.schema.txt` | None found via `rg` | Orphan | No document references these dumps | Move to historical or delete after diff |
| L6 | Any index → any doc | No index exists | Complete orphaning of every doc | No `docs/README.md` | Create index in future execution prompt |

## H. Documentation Security Review

Scanned all `docs/**` + root `*.md`/`*.txt` for common secret patterns (`SUPABASE_SERVICE_ROLE`, `SUPABASE_.*KEY`, `sk_live`, `sk_test`, `Bearer `, `password=`, JWT `eyJ` prefixes, private URLs with tokens).

| Sec | File | Type | Exposure | Committed? | Action |
|-----|------|------|----------|-----------|--------|
| S1 | `docs/aml_1_b_1/stage_02_rollback_artifacts/protected_preimages.tsv`, `*_full.tsv`, `*_index.tsv` | Real invoice/ledger/customer-balance data, tenant UUIDs, invoice numbers, monetary amounts | Medium (business data, no auth secrets) | ✅ Yes | Owner-decision: acceptable for audit archive if repository is private; if repo becomes public, move behind private storage. Do NOT reproduce values externally. |
| S2 | `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv` | Postgres role names (`sandbox_exec_vhxglsvxwwpmoqjabfmj`), no secrets | Informational | ✅ | Keep in archive |
| S3 | Cloud context (system-injected) reveals Supabase project ref + anon key | Anon publishable key | Informational (safe to expose per Supabase model) | Not in docs | No action |
| S4 | `docs/CLOUDFLARE_PROXY_SETUP.md`, `docs/cloudflare-worker-proxy.js` | Ops config | Not inspected line-by-line in this pass | ✅ | Phase 1 of cleanup: line-level scan for tokens |
| — | All other docs scanned | No secrets found on scan | — | — | — |

**No critical secret exposure detected in documentation** on read-only scan. Confirmatory line-by-line rescan is a Phase 1 execution-prompt task.

## I. Documentation Quality, Audience, and Freshness Review

| Document | Audience today | Style | Freshness | Major issues | Rewrite needed? |
|----------|---------------|-------|-----------|--------------|-----------------|
| README.md (root) | External | Lovable placeholder | Stale (unedited template) | Contains `REPLACE_WITH_PROJECT_ID`, no project identity | **Yes** |
| Documentation_13_-_...md | Internal + external dev | Formal audit prose, numbered clauses | Current | Non-standard filename (underscores + hyphen), no header block with ID/version/date/audience/supersedes | Light rewrite (metadata header) |
| dayli-horse-n2-2-...md | Internal reference | Formal execution report | Current | Mis-located at root; no metadata header | Move + metadata header |
| docs/aml_1_b_1/** | Internal + auditor | Highly formal, gate/stage disciplined | Current | Well-structured; missing top-level `README.md` explaining stage graph | Add `docs/aml_1_b_1/README.md` only |
| laboratory-mvp.md | Historical | MVP-era spec | Superseded by Doc 13 (partial) | Not marked historical | Add banner or move to historical/ |
| platform-ux-standards.md | Internal | Standards | Unknown freshness (undated) | No `Last-verified:` line | Add metadata header |
| rtl-typography.md | Internal | Standards | Same | Same | Metadata header |
| release-housing-movement-i18n.md, stabilization-release-notes.md | Historical | Release notes | Dated implicitly | Should sit under `docs/historical/release-notes/` | Move |
| hr-demo-script.md | Internal | Demo | Unknown | Not marked | Metadata + move to `docs/operations/demos/` |
| CLOUDFLARE_PROXY_SETUP.md | Ops | Setup guide | Assumed current | No `Last-verified:` | Metadata header |
| .lovable/plan.md | Session-only | Plan | Session artifact | Should not be treated as canonical | Leave; it is auto-managed |
| .workspace/skills/**/SKILL.md | Agent | Governance | Managed via Settings > Skills | Do not edit directly | No action |

## J. Proposed Canonical Documentation Architecture

Grounded in the actual repository (heavy AML audit sub-tree, single Doc 13, several loose module notes, no owner-governance material found in repo — which is correct).

```text
docs/
  README.md                          ← central index (§K)
  CONVENTIONS.md                     ← naming, versioning, header block, review rules (§L)
  handoff/
    README.md                        ← lists rounds, current authoritative round
    rounds/
      round-01/
        round-01-developer-handoff.md      ← rewritten external-developer version
        round-01-lovable-reference.md      ← internal Lovable-facing version
        round-01-raw-audit-output.md       ← unedited raw Round 1 report (evidence)
        round-01-inputs.md                 ← the DG.1-style prompt or scope note that produced it
    final/                           ← reserved; only populated when a final consolidated handoff is approved
  architecture/                      ← current state: platform, data model, tenancy, permissions, RLS
  modules/                           ← per-module current-state docs (finance/, laboratory/, stable/, breeding/, doctor/, hr/, connections/, identity/, notifications/)
  workflows/                         ← cross-module flows (invoicing, payment session, boarding lifecycle, lab intake→result, invitations)
  security/                          ← RLS map, permission catalogue, secret-handling rules (no secret values)
  operations/                        ← runbooks: cloudflare-proxy, deploy, edge functions, cron jobs, demos
  historical/
    documentation-01-13/             ← Docs 1–13 (once sourced); Doc 13 relocates here as `13-laboratory-workstream-closure.md`
    audits/                          ← DG.1 report, Round 1 raw outputs beyond the current round, any superseded audits
    execution-closures/              ← post-execution closure reports (e.g., relocated `dayli-horse-n2-2-...md`)
    rollback/                        ← historical rollback narratives (docs/aml_1_b_1/** can either stay or move here — see §N)
    release-notes/                   ← historical release notes (housing/movement i18n, stabilization)
    schema-snapshots/                ← relocated root `*.schema.txt`
  templates/
    document-header.md
    round-report-template.md
    module-doc-template.md
    execution-closure-template.md
```

Owner-governance documentation is **out-of-repo by default** (access lists, vendor governance, ownership transfer, offboarding). If owner explicitly approves in-repo storage it belongs under `docs/owner/` with restricted-access git configuration; this audit does not create that folder.

The existing `docs/aml_1_b_1/**` tree should be **preserved in place** with a new `docs/aml_1_b_1/README.md` and cross-linked from `docs/historical/audits/` and `docs/handoff/rounds/round-01/round-01-developer-handoff.md`. Moving it wholesale would break dozens of internal cross-references between stage/preflight files.

**Per-folder purpose, audience, what belongs / what must not, naming:** captured in `docs/CONVENTIONS.md` (§L below).

## K. Canonical Index Design (`docs/README.md`)

Single machine-friendly table. Every doc gets one row. Sample columns and one seed row:

| ID | Title | Path | Category | Audience | Status | Version | Date | Supersedes | Superseded by | Audit round | Coverage | Remaining gaps | Owner-approval |
|----|-------|------|----------|----------|--------|---------|------|------------|---------------|-------------|----------|----------------|-----------------|
| DHB-R01-DEV | Round 1 — Developer Handoff | `docs/handoff/rounds/round-01/round-01-developer-handoff.md` | handoff | external-dev | canonical | 1.0.0 | 2026-07-27 | — | — | R01 | §1,3,4,5,6,14,15,16 (foundational for 17–19, 21) | Sections 2, 7–13, 20 pending later rounds | pending owner review |
| DHB-DOC13 | Documentation 13 — Laboratory Workstream Closure | `docs/historical/documentation-01-13/13-laboratory-workstream-closure.md` | historical | internal | canonical (Lab closure) | 13.0.0 | (self-dated) | Doc 12 (partial) | — | pre-R01 | Laboratory Phases 5.2.2-hotfix → 8 | none within scope | archived |
| DHB-AML1B1-PL | AML.1.b.1 PLAN-LOCK | `docs/aml_1_b_1/PLAN_LOCK.md` | historical/audits | internal | canonical (finance lock) | — | — | Markdown 32–34 (chat) | — | pre-R01 | Finance atomicity & idempotency | closure per stage docs | — |

Every future document must have both a **row in the index** and a **YAML/HTML-comment metadata header** in the file itself (see §L).

## L. Naming and Versioning Standard (`docs/CONVENTIONS.md`)

**Filename rules:**
- lowercase, hyphen-separated, ASCII only
- no `_final`, `_v2`, `-copy`, `-latest`; version lives in the metadata header, not the filename
- prefix by category where structure needs order: `round-01-…`, `stage-05-…`, `phase-n2-…`, `13-…` (Documentation number)
- no dates in filenames unless the file is inherently point-in-time (release notes, schema snapshots, rollback preimages)

**Metadata header (top of every markdown):**
```markdown
<!--
id: DHB-R01-DEV
title: Round 1 — Developer Handoff
version: 1.0.0
status: canonical | supporting | historical | superseded | draft | rollback
audience: external-dev | internal | owner | mixed
date: 2026-07-27
last-verified: 2026-07-27
supersedes: []
superseded-by: null
audit-round: R01
-->
```

**Versioning:** `MAJOR.MINOR.PATCH`. MAJOR = structural rewrite / audience change. MINOR = content additions. PATCH = corrections without new claims. Historical files freeze at their final version.

**Examples:**
- Round 1 developer document → `docs/handoff/rounds/round-01/round-01-developer-handoff.md` (`id: DHB-R01-DEV`)
- Round 1 owner document → `docs/owner/round-01-owner-handoff.md` (only if owner-approved in-repo) (`id: DHB-R01-OWN`)
- Round 1 internal Lovable Markdown reference → `docs/handoff/rounds/round-01/round-01-lovable-reference.md` (`id: DHB-R01-INT`)
- Documentation 1–13 archive → `docs/historical/documentation-01-13/01-forensic-platform-architecture-audit.md` … `13-laboratory-workstream-closure.md` (`id: DHB-DOC01` … `DHB-DOC13`)
- Follow-up audit input → `docs/handoff/rounds/round-02/round-02-inputs.md` (`id: DHB-R02-IN`)
- Execution result → `docs/historical/execution-closures/phase-n2-2-backend-rpc-corrective.md` (`id: DHB-EXC-N2-2`)
- Acceptance report → `docs/handoff/rounds/round-01/round-01-acceptance.md` (`id: DHB-R01-ACC`)
- Final consolidated handoff → `docs/handoff/final/final-handoff-v1.md` (created only after owner acceptance)

## M. Round 1 Placement Decision

- **Canonical path:** `docs/handoff/rounds/round-01/round-01-developer-handoff.md`
- **Filename:** `round-01-developer-handoff.md`
- **Title:** `Round 1 — Developer Handoff (Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, Environment)`
- **Document ID:** `DHB-R01-DEV`
- **Version:** `1.0.0`
- **Audience:** external-dev (primary) + internal (secondary)
- **Index entry:** first row of `docs/README.md` (§K sample)
- **Reference to Docs 1–13:** Yes — a `## References` section pointing to `docs/historical/documentation-01-13/` for any doc that is later sourced; Doc 13 is already available for direct link.
- **Supplements / supersedes:** supplements every doc in `docs/aml_1_b_1/**`; supersedes nothing yet.
- **Raw Lovable output:** preserve **separately** at `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` (unedited, with the exact mandated closing statement). The rewritten external-developer version stays as `round-01-developer-handoff.md`. Two files, not one.
- **Additional file:** `docs/handoff/rounds/round-01/round-01-inputs.md` capturing the exact prompt that produced Round 1 (the "Dayli Horse — Current Developer Handoff Audit" text). This preserves provenance.

Do not create these files during DG.1 — creation is Phase 6 of the future execution prompt.

## N. Cleanup Migration Map

Safe mechanical:

| Act | Current | Destination | Filename | Action | Reason | Risk | Owner approval? |
|-----|---------|-------------|----------|--------|--------|------|-----------------|
| M01 | `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` | `docs/historical/execution-closures/` | `phase-n2-2-backend-rpc-corrective.md` | Move + rename + add header | Root-level mis-location | Low | No |
| M02 | `docs/laboratory-mvp.md` | `docs/historical/module-legacy/laboratory/` | `laboratory-mvp.md` | Move + add "superseded-by: Doc 13 (partial)" | Superseded by Doc 13 | Low | No |
| M03 | `docs/release-housing-movement-i18n.md` | `docs/historical/release-notes/` | (keep name) | Move | Historical release note | Low | No |
| M04 | `docs/stabilization-release-notes.md` | `docs/historical/release-notes/` | (keep name) | Move | Historical release note | Low | No |
| M05 | `docs/hr-demo-script.md` | `docs/operations/demos/` | (keep name) | Move | Ops artifact | Low | No |
| M06 | Root `*.schema.txt` (5 files) | `docs/historical/schema-snapshots/2026-07/` | (keep names) | Move (after byte-diff vs preflight copies) | Root pollution + potential G2 duplicate | Low–Med | No |
| M07 | `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` | `docs/historical/documentation-01-13/` | `13-laboratory-workstream-closure.md` | Move + rename + add header | Standardize naming | Low | No |

Content-sensitive:

| Act | Current | Destination | Action | Reason | Risk | Owner approval? |
|-----|---------|-------------|--------|--------|------|-----------------|
| M08 | `README.md` (root) | in place | Rewrite as real project README | Currently a template placeholder | Low | **Yes** (branding/description) |
| M09 | `docs/aml_1_b_1/` | in place | Add `README.md` explaining stage graph + link to Round 1 | Preserves internal cross-refs | Low | No |
| M10 | Every doc kept | in place / at destination | Insert metadata header (§L) | Governance uplift | Low | No |

Owner-decision / potentially destructive:

| Act | Current | Action | Owner approval? |
|-----|---------|--------|-----------------|
| M11 | Docs 1–12 (source archives) | Import into `docs/historical/documentation-01-13/` | **Yes** — owner must supply source files |
| M12 | Root `*.schema.txt` if byte-identical to preflight copies | Delete duplicates | **Yes** |
| M13 | Move `docs/aml_1_b_1/**` under `docs/historical/audits/` | Reject — high risk of breaking dozens of internal path references | **Yes** (recommended: keep in place) |

Security-urgent:

| Act | Item | Action | Priority |
|-----|------|--------|----------|
| M14 | `docs/aml_1_b_1/stage_02_rollback_artifacts/*.tsv` review | Confirm repo visibility (private?), otherwise relocate to private storage | **High** if repo is or becomes public |
| M15 | Full re-scan for secrets (line-level) across `docs/**` before publishing Round 1 | Run in Phase 1 of execution prompt | **High** |

## O. Phased Cleanup Execution Plan (future prompt, not now)

**Phase 1 — Security containment.** Line-level secret rescan across `docs/**` + root MD; classify `stage_02_rollback_artifacts/*.tsv` visibility; no writes yet. Precondition: owner confirms repo visibility. Validation: `rg` sweep with a curated pattern list returns zero unexplained hits. Rollback: N/A (read-only). Requires separate prompt: **Yes**.

**Phase 2 — Create canonical folders and empty indexes.** `docs/README.md`, `docs/CONVENTIONS.md`, `docs/handoff/`, `docs/architecture/`, `docs/modules/`, `docs/workflows/`, `docs/security/`, `docs/operations/`, `docs/historical/{documentation-01-13,audits,execution-closures,release-notes,schema-snapshots,module-legacy/laboratory}/`, `docs/templates/`. No content moves yet. Validation: `find docs -type d` matches proposed tree. Rollback: `git checkout .`. Requires separate prompt: **Yes**.

**Phase 3 — Preserve raw historical sources.** Copy (not move) Doc 13, execution report, release notes into their historical destinations under new names; leave originals in place for one commit; run diff. Validation: `sha256sum` match. Rollback: delete copies. Requires separate prompt: **Yes**.

**Phase 4 — Normalize titles and filenames.** Apply metadata headers (§L) to every kept file. Validation: every `docs/**/*.md` grepped for header block. Rollback: `git checkout`. Requires separate prompt: **Yes**.

**Phase 5 — Move/archive superseded and mis-located documents.** Delete originals now that copies validated (M01–M07). Validation: `git status` shows expected renames. Rollback: `git checkout`. Requires separate prompt: **Yes**.

**Phase 6 — Add Round 1 documentation.** Create `round-01-developer-handoff.md`, `round-01-raw-audit-output.md`, `round-01-inputs.md`, `round-01-acceptance.md` (empty template). Add index rows. Validation: index rows resolve to existing paths. Rollback: delete new files. Requires separate prompt: **Yes**.

**Phase 7 — Repair links and references.** `rg`-based sweep for old paths; update; add `docs/aml_1_b_1/README.md`. Validation: broken-link check script (owner-approved script). Rollback: `git checkout`. Requires separate prompt: **Yes**.

**Phase 8 — Validate searchability and repository status.** Confirm every doc appears in `docs/README.md`, every ID unique, every `supersedes` target exists. Validation: small verification script emitting a report. Rollback: N/A. Requires separate prompt: **Yes** (verification script must be owner-approved).

**Phase 9 — Commit and produce change report.** One commit per phase where possible; final `docs/historical/audits/dg-1-cleanup-change-report.md` summarizing every move. Validation: change report matches `git log`. Rollback: revert commits. Requires separate prompt: **Yes**.

## P. Risk Register

| ID | Area | Finding | Evidence | Severity | Impact | Recommended action | Blocks Round 1 publication? |
|----|------|---------|----------|----------|--------|--------------------|------------------------------|
| R1 | Completeness | Docs 1–12 missing from repo | `git ls-files` + full `find` show only Doc 13 | High | Round 1 cannot reference a full prior series | Owner sourcing (M11) | **Yes** (soft — Round 1 can publish with a "prior baselines pending import" note) |
| R2 | Structure | No index, no CONVENTIONS, no `docs/README.md` | Direct inspection | High | Lovable and devs cannot orient | Phase 2 | Yes |
| R3 | Placement | Root-level `dayli-horse-n2-2-...md` + `*.schema.txt` | Root listing | Medium | Repo hygiene | Phase 5 (M01, M06) | No |
| R4 | Governance | `README.md` still Lovable template with `REPLACE_WITH_PROJECT_ID` | File contents | Medium | External impression | Rewrite (M08) | No |
| R5 | Security | Business data in `*.tsv` under version control | `stage_02_rollback_artifacts/` | Medium | Depends on repo visibility | Phase 1 (M14) | **Yes if repo public** |
| R6 | Security | Secret rescan not exhaustive in DG.1 | Read-only pattern sweep only | Medium | Possible undetected leak | Phase 1 (M15) | Yes |
| R7 | Broken references | Doc 13 references Doc 12; PLAN_LOCK references Markdown 20–34 | §G | Medium | Orphan citations | Phases 6–7 | No |
| R8 | Duplication | Root schema dumps possibly duplicate preflight dumps | G2 | Low | Wasted space | Phase 1 diff, then M12 | No |
| R9 | Historical evidence loss | Bulk-moving `docs/aml_1_b_1/**` risks breaking cross-refs | Tree analysis | Medium | Lost provenance | Keep in place (M09/M13-reject) | No |
| R10 | Lovable discoverability | Without index, agent cannot locate docs later | Structural | High | Repeated re-audits | Phase 2 + index maintenance rule | Yes |
| R11 | Naming ambiguity | `_final`, `_v2`-style patterns not yet present but not prevented | No CONVENTIONS | Low | Future drift | Phase 4 (§L) | No |
| R12 | Chat-only source of truth | Docs 1–12 exist only in chat/owner storage | E table | High | Truth erodes over time | Owner sourcing + governance | Yes |
| R13 | Destructive cleanup risk | Any bulk delete before diff | Phase 3 gate | High if skipped | Data loss | Enforce copy-then-diff-then-delete pattern | No |
| R14 | Session artifacts | `.lovable/plan.md` may be mistaken for canonical | Direct inspection | Low | Confusion | Mark as session artifact in CONVENTIONS | No |
| R15 | Owner-governance blend | If owner docs land in shared repo without approval | Currently not present | Medium (preventive) | Confidentiality | Keep `docs/owner/` out unless explicitly approved | No |

## Q. Owner Decisions Required

1. Confirm current and target visibility of the repository (private vs public). Drives R5/M14.
2. Supply source files for Documentation 1–12, or authorize publishing Round 1 with a "prior baselines pending import" pointer (R1/M11).
3. Approve rewrite of root `README.md` and provide project description/brand copy (M08).
4. Approve/decline in-repo storage of owner-governance documentation (`docs/owner/`).
5. Approve deletion of any confirmed byte-duplicate root `*.schema.txt` (M12).
6. Confirm that `docs/aml_1_b_1/**` remains in place (recommended) rather than being relocated under `docs/historical/audits/`.
7. Approve the naming and versioning standard in §L as project convention.
8. Approve the phased execution plan in §O to be run as a separate execution prompt.

## R. Readiness for Cleanup Execution

Ready to proceed to a follow-up **execution prompt** conditional on:

- Owner answers to Q1–Q8.
- Confirmed repository visibility (drives whether Phase 1 must relocate `.tsv` data before any other work).
- A single named branch for the cleanup or explicit permission to work on the default branch.
- Explicit instruction that the execution prompt is authorized to create, move, rename, and (with owner approval) delete files.

DG.1 itself did not modify anything and does not require rollback.

## S. Inputs Required for the Execution Prompt

1. Owner answers to Q1–Q8.
2. Source archives for Documentation 1–12 (if available) with confirmed authoritative version per document.
3. Final agreed folder tree (with any owner amendments to §J).
4. Final agreed naming/versioning standard (with any owner amendments to §L).
5. Secret pattern list to enforce in Phase 1 (defaults: `SUPABASE_SERVICE_ROLE_KEY`, `sk_live_`, `sk_test_`, `-----BEGIN`, `Bearer ey`, `password\s*=`, project-specific tokens).
6. Verification script text for Phase 8 (owner-approved).
7. Author line / commit signature preference.
8. Real project README content for M08.
9. Confirmation that `.lovable/plan.md` and `.workspace/skills/**` are excluded from the migration scope.
10. Confirmation that no in-flight branches will be affected during phased commits.

---

**DG.1 completed in strict read-only mode. No documentation file, source file, database object, record, policy, secret, environment setting, deployment configuration, repository path, or project asset was created, modified, moved, renamed, archived, or deleted.**
