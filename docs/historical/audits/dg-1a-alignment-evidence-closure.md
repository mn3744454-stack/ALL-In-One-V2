<!--
id: DHB-AUDIT-DG1A
title: DG.1A — Documentation Alignment & Evidence Closure Audit
version: 1.0.0
status: historical-audit
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: [DHB-AUDIT-DG1]
superseded-by: null
source: owner-supplied audit report (`governance/dg-1a-alignment-audit-report.txt`)
source-sha256: 4348e57deb25a2e2d13f5be6760ce8648c6d4483532ef4f6b24f343597c04c5f
-->

# DG.1A — Documentation Alignment & Evidence Closure Audit

> **Immutable audit provenance.** Preserved verbatim. DG.1A **corrects DG.1 where the two conflict** — treat DG.1A as authoritative for Doc 13 identity, inventory completeness, git-history findings, secret-scan closure, duplicate hash/diff verification, owner-governance storage policy, and the final canonical structure.
> Source SHA-256: `4348e57deb25a2e2d13f5be6760ce8648c6d4483532ef4f6b24f343597c04c5f`
> This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.

---

```text

# DG.1A — Documentation Alignment & Evidence Closure Audit

Strict read-only. No files, folders, git state, database, secrets, or project settings were changed.

---

## A. Executive Alignment Verdict

**DG.1 SUBSTANTIALLY ALIGNED — MINOR OWNER DECISIONS REMAIN.**

Every material DG.1 conclusion is either confirmed by hash/diff/git evidence or explicitly narrowed here. One DG.1 identity claim requires correction: the file `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` **is not** the canonical final "Documentation 13 — Operational Truth Stabilization"; it is a Laboratory-only predecessor / source input. Git history (5,558 commits, both `main` and current edit branch, plus `remotes/origin/main`) contains no evidence of any `Documentation_01…12` file, nor of any file named or titled "Operational Truth Stabilization", ever having been committed. Root `*.schema.txt` files are near-duplicates (not exact) of the AML preflight schema snapshots — the preflight versions are the newer, richer supersets. No secret material (keys, tokens, JWTs, passwords, PEM blocks, sk_live/sk_test, connection strings) was found in any tracked documentation file on line-level scan. Repository visibility is Lovable-hosted private git (`git.private.lovable-gcp.code.storage`), not a user-owned GitHub repo — owner confirmation still required for the eventual public GitHub mirror. Ready for a controlled cleanup execution prompt once Owner Decisions Q1–Q4 (§N) are answered.

## B. DG.1 Claim Validation

| DG.1 claim | Validation | Evidence | Correction / clarification |
|---|---|---|---|
| Only one numbered Documentation artifact exists in the repository | **Confirmed** | `git ls-files` + full-history `git log --all --name-only` filtered on `documentation[_ -]?(0?[1-9]|1[0-3])` returns only `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` (plus false-positive `docs/stabilization-release-notes.md` on the word "stabilization") | — |
| Documentation 1–12 absent from repo | **Confirmed** | Same query across all 5,558 commits on `main`, current edit branch, and `origin/main`; zero matches for Docs 01–12; `--diff-filter=D` shows only `.lovable/plan.md`, `docs/CLOUDFLARE_PROXY_SETUP.md`, `docs/aml_1_b_1/stage_j5_1/j5_1_migration_rewritten.sql`, `docs/cloudflare-worker-proxy.js` were ever deleted (all unrelated to Docs 1–12) | — |
| The repo Documentation 13 file may not be the canonical final Doc 13 | **Requires correction (upgraded to confirmed distinct artifact)** | Its self-declared title is "Laboratory Workstream Closure: Atomic Intake Hotfix, Results Coherence Maturation, and Final Polish (Phases 5.2.2-Hotfix → 7 → 8)"; §4.2 explicitly states "Doc 13 is therefore intentionally Laboratory-scoped"; zero occurrences of "operational truth" or "stabiliz" in the body | It is a scoped predecessor / source artifact, **not** canonical final Doc 13 |
| No central index exists | **Confirmed** | No `docs/README.md`, no `docs/INDEX.md`, no top-level manifest | — |
| Root `README.md` is Lovable placeholder | **Confirmed** | File contains `REPLACE_WITH_PROJECT_ID` | — |
| `docs/aml_1_b_1/**` should remain in place | **Confirmed** | 83 tracked files; dense cross-references between stage and preflight files; moving would break internal paths | Keep in place, add local `README.md` in a future controlled step |
| Root `*.schema.txt` may duplicate preflight snapshots | **Correct but incomplete** | Hashes differ; sizes differ; diffs show preflight versions are supersets (added `corrects_invoice_id`, `prices_include_tax`, five `line_*_snapshot` columns and multiple check constraints) | They are **older snapshots**, not exact duplicates; classification changes from "duplicate" to "superseded snapshot" |
| Rollback TSVs contain business/audit data | **Confirmed** | Real invoice numbers, tenant UUIDs, monetary balances, client names visible in `stage_02_rollback_artifacts/*.tsv` | Severity depends on final published git-visibility (§F) |
| Round 1 raw output and rewritten developer doc kept separately | **Confirmed as correct policy** | No structural evidence contradicts it | — |
| Inventory described as "representative" | **Requires correction** | Full manifest is 100 tracked documentation-bearing files (`.md` 39, `.txt` 54, `.tsv` 7); DG.1 table listed ~22 rows | See §D below |
| Owner-governance `docs/owner/` with "restricted-access git configuration" | **Requires correction** | Git does not provide reliable per-folder read separation for repository collaborators | See §I below |
| Documentation security scan | **Correct but incomplete** | DG.1 deferred a line-level scan | Completed here — see §G |

## C. Documentation 13 Identity Correction

| Artifact | Current repo status | Correct identity | Canonical future filename | Relationship to final Doc 13 |
|---|---|---|---|---|
| `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` (195 lines, self-titled "Laboratory Workstream Closure: Atomic Intake Hotfix, Results Coherence Maturation, and Final Polish") | Tracked, currently mis-labeled as Doc 13 | **Laboratory Workstream Closure source artifact** — a Laboratory-scoped closure report authored between Doc 12 and the eventual broader Doc 13 | `docs/historical/documentation-01-13/source-artifacts/laboratory-workstream-closure-source.md` (no "13-" prefix) | Source input later integrated into the broader "Operational Truth Stabilization" document; preserved as evidence, **not** treated as canonical Doc 13 |
| Owner's external final "Documentation 13 — Operational Truth Stabilization" | **Not in repository** (never committed on any branch per full-history scan) | Canonical Documentation 13 | `docs/historical/documentation-01-13/13-operational-truth-stabilization.md` | Canonical final Doc 13 once owner supplies the source file |

Evidence supporting the distinction: the in-repo file's §4.2 declares it intentionally Laboratory-scoped; body contains zero occurrences of "Operational Truth" or "Stabilization" (except unrelated `stabilization-release-notes.md` filename in the tree); §15 forward-references a not-yet-authored Documentation 14 in a way consistent with a mid-arc source, not a final Doc 13.

## D. Exhaustive Inventory Closure

**Totals (tracked, documentation-bearing):**

| Metric | Count |
|---|---|
| Total files | 100 |
| `.md` | 39 |
| `.txt` | 54 |
| `.tsv` | 7 |
| Under `docs/aml_1_b_1/**` | 83 |
| Under `docs/` (non-aml) | 7 |
| Under `docs/aml_1_b_1/stage_j5_1/preflight/` | 46 |
| Under `docs/aml_1_b_1/stage_j5_2/preflight/` | 17 |
| Root-level doc-bearing files | 8 (`README.md`, 5 × `*.schema.txt`, `dayli-horse-n2-2-...report.md`, `.lovable/plan.md`) |
| `public/robots.txt` | 1 (ops artifact, not documentation) |

**Category tally:**

| Category | Count | Examples |
|---|---|---|
| Audit evidence (preflight function/schema/trigger/grant dumps) | 46 | `docs/aml_1_b_1/stage_j5_1/preflight/*.txt` |
| Rollback evidence | 7 | `docs/aml_1_b_1/stage_02_rollback_artifacts/*.tsv` |
| Audit closure / stage narrative | 17 | `docs/aml_1_b_1/stage_j5_2/**/*.md`, `STAGE_*_CLOSURE.md`, `PLAN_LOCK.md`, `N2_2_ROLLBACK.md`, `28_phase_2_functional_closure_and_deferred_hardening.md` |
| Preflight metadata / contract | 8 | `docs/aml_1_b_1/stage_j5_1/preflight/15…17_*.md`, `stage_j5_2/preflight/*metadata*.md`, `stage_j5_2/preflight/{15,19,20}_*.md` |
| Session / agent scratch | 1 | `.lovable/plan.md` (auto-managed) |
| Module documentation | 4 | `laboratory-mvp.md`, `platform-ux-standards.md`, `rtl-typography.md`, `hr-demo-script.md` |
| Release notes | 2 | `release-housing-movement-i18n.md`, `stabilization-release-notes.md` |
| Ops runbook | 1 | `CLOUDFLARE_PROXY_SETUP.md` (paired with source `docs/cloudflare-worker-proxy.js`) |
| Corrective execution report (mis-located) | 1 | `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` |
| Root schema snapshots (superseded by preflight) | 5 | `invoices.schema.txt`, `invoice_items.schema.txt`, `billing_links.schema.txt`, `customer_balances.schema.txt`, `expenses.schema.txt` |
| Numbered Documentation series | 1 | `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` (per §C, source artifact) |
| Placeholder README | 1 | Root `README.md` |
| Non-documentation ops file caught by extension | 1 | `public/robots.txt` |
| Agent-managed skills | 26 | `.workspace/skills/dayli-*/SKILL.md` — **not tracked docs, workspace-only, excluded from documentation scope** |

**Files omitted from DG.1's representative table (recovered here):** all 46 `stage_j5_1/preflight/*.txt` files, all 17 `stage_j5_2/preflight/*.md` files enumerated individually, `docs/aml_1_b_1/stage_j5_1/preflight/{15,16,17}_*.md` execution contracts, `stage_j5_2/preflight/{15,17,19,20}_*.md` payment/verification metadata, `public/robots.txt` (ops, not doc), the `.workspace/skills/**` cluster (workspace, not doc). No further orphan documentation files exist.

**Tracked vs untracked:** all 100 files above are tracked. `git status` shows no untracked documentation files. `.env` is tracked (Lovable Cloud auto-managed — not documentation).

## E. Git History and Branch Findings

| Question | Finding | Evidence |
|---|---|---|
| Refs available | Local `main`, active `edit/edt-312827df-...` branch, `remotes/origin/HEAD → origin/main`, `remotes/origin/main` | `git branch --all` |
| Total commits | 5,558 across all refs | `git rev-list --all --count` |
| Did Docs 1–12 ever exist? | **No.** Full-history `git log --all --name-only` filtered on `documentation[_ -]?(0?[1-9]|1[0-3])\|operational.truth\|stabilization` returns only Doc 13 lab file and unrelated release-notes filename | direct scan |
| Was Doc 13 lab file renamed/replaced? | **No.** File was added once, never renamed, never replaced | `git log --all --follow` on the file |
| Did "Operational Truth Stabilization" ever exist? | **No.** Zero name matches; body-content search for "operational truth" / "stabiliz" across all committed docs returns only false positives in `stabilization-release-notes.md` (a housing/movement stabilization release, unrelated to Doc 13) | direct scan |
| Files deleted historically | 4: `.lovable/plan.md` (session file, re-added), `docs/CLOUDFLARE_PROXY_SETUP.md` (currently present, re-added), `docs/aml_1_b_1/stage_j5_1/j5_1_migration_rewritten.sql`, `docs/cloudflare-worker-proxy.js` (currently present, re-added). None are numbered Documentation files. | `git log --all --diff-filter=D --name-only` |
| Other branches with doc-only content | None. Only `main` and active edit branch; edit branch is a working continuation, not a divergent doc branch | branch listing |
| Files in history but not current branch | None material (only the re-added files above) | delete filter |
| Remote fetch attempted | **No** — instructions prohibit changing checkout/fetch state. Findings limited to already-local refs. |

**Limitation:** results are constrained to already-cloned refs. If additional branches exist upstream that were never fetched into this sandbox, they were not inspected. This is unlikely to matter (Docs 1–12 have never been in any inspected ref) but is stated explicitly.

## F. Repository Visibility and Ownership Findings

| Aspect | Finding | Evidence |
|---|---|---|
| Remote host | `git.private.lovable-gcp.code.storage` — **Lovable-hosted private git storage**, not github.com | `git remote -v` |
| Repository ID | `64c79edd-f667-42bb-b896-147c63e0ff12` (Lovable project UUID) | remote path |
| Visibility on Lovable storage | Private by nature of the host domain (`private.` sub-label) | host name |
| GitHub mirror / public GitHub visibility | **Not verifiable from repo state alone.** No `github.com` remote is configured. Users may have separately connected a GitHub repo via Lovable's Git sync integration — that state lives in Lovable workspace settings, not in the working tree | absence of github.com remote |
| Branch protection | Not visible from the local repo | — |
| Multiple remotes | Only `origin` | `git remote -v` |
| Credentials exposure | `git remote -v` output includes an ephemeral Lovable-issued read/write JWT embedded in the fetch/push URL (sandbox artifact only, expires per `exp` claim; not a user secret and not committed anywhere in the tree) | — |
| Owner account vs organization | **Owner-confirmation-required** — cannot be inferred without Lovable workspace metadata |

Classification: **repository visibility is Lovable-managed private; downstream GitHub-mirror visibility is owner-confirmation-required.**

## G. Documentation Security Closure

Line-level scan across the full 100-file tracked documentation manifest.

| ID | File/path | Finding type | Value committed? | Data classification | Severity | Required action |
|---|---|---|---|---|---|---|
| S1 | (any) | PEM / PRIVATE KEY blocks | None found | — | None | — |
| S2 | (any) | JWT `eyJ…eyJ…` pattern in body | None found in docs | — | None | — |
| S3 | (any) | Stripe `sk_live_` / `sk_test_` | None found | — | None | — |
| S4 | (any) | `Bearer` token literals | None found | — | None | — |
| S5 | (any) | `password=`/`password:` with value | None found | — | None | — |
| S6 | (any) | `service_role_key` value | None found | — | None | — |
| S7 | (any) | Generic `api_key/secret_key = "…"` | None found | — | None | — |
| S8 | (any) | URLs with `?token=` / `?access_token=` | None found | — | None | — |
| S9 | (any) | AWS `AKIA…` | None found | — | None | — |
| S10 | `docs/CLOUDFLARE_PROXY_SETUP.md` line 35 | Supabase project URL `https://vhxglsvxwwpmoqjabfmj.supabase.co` | Yes | Non-secret (Supabase project URL; the publishable anon key is designed for client exposure) | Informational | Keep; not sensitive |
| S11 | `docs/cloudflare-worker-proxy.js` | Header allow-lists (`apikey`, `authorization`, etc.) | Yes | Non-secret; no values | Informational | Keep |
| S12 | `docs/aml_1_b_1/stage_02_rollback_artifacts/{invoices_index,ledger_entries_index,customer_balances_full,expenses_full,billing_links_full,protected_preimages}.tsv` | Real invoice numbers, tenant UUIDs, client UUIDs, personal names (e.g. Arabic client name, "Nawaf …"), monetary balances, invoice descriptions | Yes | **Real production business data + PII (client full names)** | **Medium** if repo becomes public / gains a public GitHub mirror; **Low-Medium** if repo remains Lovable-private-only | Owner decision on final visibility (Q1); if any public mirroring is planned, relocate these files to private storage before mirroring |
| S13 | `docs/aml_1_b_1/stage_02_rollback_artifacts/relacl_fingerprint.tsv` | Internal Postgres role names including sandbox exec role | Yes | Informational | None | Keep |
| S14 | `docs/aml_1_b_1/stage_02_rollback_artifacts/protected_preimages.tsv` | `created_by` user UUIDs | Yes | Low (opaque UUIDs) | Low | Combined with S12 client names; same owner decision |
| S15 | `docs/aml_1_b_1/stage_01_preflight/protected_records_preimage_raw.txt` | Same class of preimage data (not re-inspected line-by-line beyond pattern scan; no secret patterns hit) | Yes | Real production data likely | Low-Medium (same as S12) | Same owner decision |
| S16 | `.env` (tracked) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Yes | Non-secret by Supabase design (publishable / anon key) | Informational | Keep — this is Lovable Cloud's auto-managed file; not documentation |
| S17 | Root `*.schema.txt` (5 files) | Postgres schema DDL | Yes | Non-sensitive | None | Cleanup treatment per §M |

**Business/audit data findings (S12–S15) are the only real sensitivity in the documentation tree; no cryptographic secrets are present.**

## H. Duplicate Verification Results

| Duplicate group | SHA-256 result | Diff result | Relationship | Safe future treatment |
|---|---|---|---|---|
| `invoices.schema.txt` (3,858 B) vs `stage_j5_1/preflight/02_invoices_schema.txt` (4,340 B) | Different (`91538…` vs `d4560…`) | Preflight adds columns `corrects_invoice_id`, `prices_include_tax` + two FK / reverse-FK lines | **Superseded snapshot** (root = older) | Preserve root as historical schema snapshot; do not delete without owner sign-off |
| `invoice_items.schema.txt` (5,550 B) vs `stage_j5_1/preflight/03_invoice_items_schema.txt` (7,145 B) | Different (`fb52e…` vs `de653…`) | Preflight adds 5 line_* snapshot columns, `taxable_snapshot`, `tax_rate_snapshot`, and 8 CHECK constraints | **Superseded snapshot** | Same |
| `billing_links.schema.txt` (1,811 B) vs `stage_j5_1/preflight/06_billing_links.txt` (1,811 B) | **Identical** (`0e7da…` both) | `diff` returns no changes | **Exact duplicate** | Safe to remove after owner sign-off; keep preflight copy (it is the audited path) |
| `customer_balances.schema.txt` vs `expenses.schema.txt` | Different (`0d288…` vs `1f6ab…`) | N/A (different tables) | Unrelated | Both remain historical schema snapshots |
| `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` (root, 561 lines) vs `docs/aml_1_b_1/n2_2/N2_2_ROLLBACK.md` (170 lines) | Different (`87eac…` vs `2897a…`) | Roughly 3.3× size delta | **Different roles** (execution report vs rollback SQL/narrative) | Keep both; relocate root file into `docs/aml_1_b_1/n2_2/` |
| `docs/laboratory-mvp.md` (140 lines) vs `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` (195 lines) | Different by content and era | Content diff not run (different eras) | **Partial overlap, different phases** | Keep both as historical artifacts |
| `docs/stabilization-release-notes.md` vs `docs/release-housing-movement-i18n.md` | Not hashed pairwise (different topics) | Different topics | Unrelated release notes | Keep both |

**Only one exact byte-duplicate confirmed: `billing_links.schema.txt` ≡ `stage_j5_1/preflight/06_billing_links.txt`.** Every other DG.1-flagged pair is a related-but-distinct artifact, most often the root file being an older snapshot of a richer preflight version. **No deletion recommended without owner sign-off.**

## I. Corrected Documentation Storage Policy

Corrects DG.1's suggestion that owner-governance material could live under `docs/owner/` with "restricted-access git configuration". A standard single Git repository provides no reliable folder-level read separation for any collaborator who can read the repository at all. Correction:

| Documentation class | Storage location | Shared with developer? | Repository-safe? | Notes |
|---|---|---|---|---|
| Current shared technical documentation | Shared repository under `docs/` | Yes | Yes | Round 1 handoff, architecture, modules, workflows |
| Handoff rounds (developer-facing) | Shared repository under `docs/handoff/rounds/` | Yes | Yes | Rewritten + raw preserved side-by-side |
| Historical audits and executions | Shared repository under `docs/historical/` | Yes | Yes | Includes AML.1.b.1 remaining in place |
| Rollback evidence containing real PII / business data | **Current path acceptable only while repo stays Lovable-private; otherwise external private storage** | Yes (private) / No (if public mirror) | Conditional on Q1 | S12–S15 above |
| Security posture documentation without secret values | Shared repository under `docs/security/` | Yes | Yes | No secret values, no live tokens |
| Operations runbooks (Cloudflare, deploys, cron, edge functions) | Shared repository under `docs/operations/` | Yes | Yes | Values redacted; only names |
| Conventions, templates, index | Shared repository under `docs/` root and `docs/templates/` | Yes | Yes | — |
| Owner governance (access lists, vendor evaluations, account-recovery details, secret-management processes, offboarding notes, pricing, legal, contracts) | **Outside the shared repository** (owner's private drive / password manager / private vault) | No | **No** | Git cannot enforce per-folder confidentiality among repo readers |
| Owner-approved general governance rules safe for all approved collaborators | Shared repository under `docs/governance/` if owner explicitly authorizes each file | Yes | Yes (per-file authorization) | Only after owner review |
| Secret values (API keys, service role, DB passwords, provider credentials) | Provider-native secret managers / Lovable Cloud secrets | No | **No** | Never committed, never documented with real values |

`docs/owner/` is **not created** by default.

## J. Final Canonical Documentation Architecture

Corrected tree (proposal — not created):

```text
docs/
  README.md                          ← central index
  CONVENTIONS.md                     ← naming, versioning, header block, review rules
  handoff/
    README.md
    rounds/
      round-01/
        round-01-inputs.md
        round-01-raw-audit-output.md
        round-01-developer-handoff.md
        round-01-lovable-reference.md
        round-01-acceptance.md
    final/                           ← reserved
  architecture/
  modules/                           ← finance/, laboratory/, stable/, breeding/, doctor/, hr/, connections/, identity/, notifications/
  workflows/
  security/                          ← posture only, never secret values
  operations/                        ← cloudflare-proxy, deploy, cron, edge functions
  historical/
    documentation-01-13/
      01-…, 02-…, …, 12-…, 13-operational-truth-stabilization.md   ← from owner import
      source-artifacts/
        laboratory-workstream-closure-source.md                     ← the current in-repo Doc 13 file, renamed and reclassified
    audits/                          ← DG.1, DG.1A, future audits
    execution-closures/              ← relocated dayli-horse-n2-2-…report.md, other post-execution reports
    release-notes/                   ← stabilization-release-notes, release-housing-movement-i18n
    schema-snapshots/                ← root *.schema.txt after owner sign-off
    module-legacy/laboratory/        ← laboratory-mvp.md
  aml_1_b_1/                         ← preserved in place (add local README only)
  templates/
    document-header.md
    round-report-template.md
    module-doc-template.md
    execution-closure-template.md
    historical-import-template.md
```

Excluded from this tree: `.lovable/plan.md` (session-only), `.workspace/skills/**` (agent-managed), `public/robots.txt` (application asset), `.env` (Lovable Cloud auto-managed), owner-governance material (outside repo).

## K. Documentation 1–13 Import Model

Import policy: preserve raw source exactly, produce a normalized canonical Markdown copy, register both.

| Doc # | External source title (as supplied by owner) | Raw preservation method | Canonical Markdown path | Historical status | Current-truth caveat |
|---|---|---|---|---|---|
| 01 | Forensic Platform Architecture Audit | Store `.docx` source outside repo (owner drive); commit exported `.md` as raw | `docs/historical/documentation-01-13/01-forensic-platform-architecture-audit.md` | Historical baseline | "Current code/DB truth may supersede specific claims" banner |
| 02 | Module Activation & Post-Onboarding Experience Audit | same | `docs/historical/documentation-01-13/02-module-activation-post-onboarding.md` | Historical | same |
| 03 | Shared Module Depth Audit | same | `docs/historical/documentation-01-13/03-shared-module-depth.md` | Historical | same |
| 04 | Domain-Specific Module Depth Audit | same | `docs/historical/documentation-01-13/04-domain-specific-module-depth.md` | Historical | same |
| 05 | Integration & Cross-Module Flow Audit | same | `docs/historical/documentation-01-13/05-integration-cross-module-flow.md` | Historical | same |
| 06 | Corrective Action Prioritization & Execution Roadmap | same | `docs/historical/documentation-01-13/06-corrective-action-prioritization.md` | Historical (partially superseded by `docs/aml_1_b_1/**`) | Point supersession by AML.1.b.1 |
| 07 | Post Baseline Delta Documentation | same | `docs/historical/documentation-01-13/07-post-baseline-delta.md` | Historical | same |
| 08 | Housing & Facilities Workstream | same | `docs/historical/documentation-01-13/08-housing-facilities-workstream.md` | Historical | Reference current `mem://architecture/stable/*` |
| 09 | Post-Documentation 8 Continuation Report | same | `docs/historical/documentation-01-13/09-post-doc-8-continuation.md` | Historical | same |
| 10 | Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure | same | `docs/historical/documentation-01-13/10-financial-architecture-maturation.md` | Historical (partially superseded) | Reference `dayli-horse-n2-2-…` and `docs/aml_1_b_1/**` |
| 11 | People, Team & Partners Workstream Full Lifecycle | same | `docs/historical/documentation-01-13/11-people-team-partners.md` | Historical | same |
| 12 | Backend Permission Enforcement Migration | same | `docs/historical/documentation-01-13/12-backend-permission-enforcement.md` | Historical | Baseline cited by Doc 13 source artifact |
| **13** | **Operational Truth Stabilization** (owner-external final) | same | `docs/historical/documentation-01-13/13-operational-truth-stabilization.md` | **Canonical Doc 13** | Includes lab closure content that also lives in source-artifacts/ |
| (source) | Laboratory Workstream Closure (already in repo) | Rename in place, reclassify | `docs/historical/documentation-01-13/source-artifacts/laboratory-workstream-closure-source.md` | Historical **source input** to Doc 13, not Doc 13 itself | Include note pointing to canonical Doc 13 |

Per-file metadata to record for every import: original filename, source format (`.docx`/`.pdf`/`.md`), import date, SHA-256 of the exact source blob, title, document number, status (`canonical` \| `source-artifact` \| `superseded`), known supersession pointers. Historical banner at top of every imported canonical file: *"This document is preserved as historical evidence. Current source code, migrations, and database state supersede specific claims where they conflict."*

**Word/binary source-file policy:** by default binary sources are stored outside the shared git repository (owner's private drive), with SHA-256 recorded in the canonical Markdown header for tamper detection. Committing binary originals is permitted only if the owner explicitly approves and confirms repo visibility (Q1).

## L. Round 1 Placement Model

| File | Purpose | Audience | Status | Update policy |
|---|---|---|---|---|
| `docs/handoff/rounds/round-01/round-01-inputs.md` | Preserve the exact prompt that produced Round 1 | Provenance | Evidence-only (immutable) | Never updated |
| `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` | Preserve Lovable's exact Round 1 output verbatim, including the mandated closing statement | Provenance | Evidence-only (immutable) | Never updated |
| `docs/handoff/rounds/round-01/round-01-developer-handoff.md` | Rewritten external-developer version indexed as canonical Round 1 deliverable | External-dev (+ internal) | **Canonical (versioned)** | Bumped `MINOR/PATCH` only for corrections referenced by later rounds; superseded by future rounds |
| `docs/handoff/rounds/round-01/round-01-lovable-reference.md` | Internal Lovable-facing view — condensed pointers Lovable should use when working post-handoff | Internal (Lovable agent + Lovable team) | Supporting (versioned) | Updated whenever architecture memory shifts |
| `docs/handoff/rounds/round-01/round-01-acceptance.md` | Owner and developer acceptance record | Owner + external-dev | Canonical (immutable once signed) | Never rewritten; corrections issued as a new dated acceptance addendum |

All five are indexed in `docs/README.md`. Only `round-01-developer-handoff.md` and `round-01-lovable-reference.md` may contain current implementation claims. Raw output, inputs, and acceptance are frozen.

## M. Corrected Cleanup Migration Map

Adjusted from DG.1's map with hash/diff evidence and PII findings.

Safe mechanical (no owner approval beyond §N):

| Act | Action | Reason | Risk |
|---|---|---|---|
| M01 | Move `dayli-horse-n2-2-backend-rpc-corrective-execution-report.md` → `docs/historical/execution-closures/phase-n2-2-backend-rpc-corrective.md` + metadata header | Root pollution | Low |
| M02 | Move `docs/laboratory-mvp.md` → `docs/historical/module-legacy/laboratory/laboratory-mvp.md` + `superseded-by` banner (points to Doc 13 source artifact + eventual canonical Doc 13) | Historical partial predecessor | Low |
| M03 | Move `docs/release-housing-movement-i18n.md` → `docs/historical/release-notes/` | Release archive | Low |
| M04 | Move `docs/stabilization-release-notes.md` → `docs/historical/release-notes/` | Release archive | Low |
| M05 | Move `docs/hr-demo-script.md` → `docs/operations/demos/` | Ops artifact | Low |
| M06 | Rename + move `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` → `docs/historical/documentation-01-13/source-artifacts/laboratory-workstream-closure-source.md` + reclassification banner | Corrects identity error (§C) | Low |
| M07 | Add `docs/aml_1_b_1/README.md` explaining stage graph and preservation policy | Discoverability | Low |
| M08 | Insert metadata header (id/title/version/status/audience/date/last-verified/supersedes/superseded-by/audit-round) on every kept `.md` | Governance uplift | Low |

Content-sensitive (owner-approved via §N):

| Act | Action | Owner decision required |
|---|---|---|
| M09 | Rewrite root `README.md` with real project identity and description | Q3 |
| M10 | Import Docs 01–12 + canonical Doc 13 per §K | Q2 |
| M11 | Delete exact byte-duplicate `billing_links.schema.txt` (root); keep preflight copy | Q4 |
| M12 | Relocate remaining root `*.schema.txt` → `docs/historical/schema-snapshots/2026-07/` | Q4 |
| M13 | Rollback TSVs (`stage_02_rollback_artifacts/*.tsv`) — final visibility decision | Q1 |
| M14 | Decide whether the repo will ever have a public GitHub mirror | Q1 |

Explicitly rejected (do not perform):

| Rejected act | Reason |
|---|---|
| Bulk-move `docs/aml_1_b_1/**` under `docs/historical/audits/` | High risk of breaking dozens of internal cross-references (staged narratives cite sibling files by relative path) |
| Create `docs/owner/` in the shared repo | Per §I, git cannot enforce folder-level confidentiality |
| Delete any DG.1-flagged "duplicate" other than M11 without hash proof | Would delete newer supersets |
| Redact business data in place in TSV files | Would destroy rollback evidence; relocation, not redaction, is the correct treatment if visibility changes |

## N. Remaining Owner Decisions

After applying every pre-answered decision, only these remain:

- **Q1 — Final visibility of the shared repository.** Is it Lovable-private-only, will it be mirrored to a private GitHub repo, or will it ever be public? Drives S12–S15 and M13/M14.
- **Q2 — Timing and format of Docs 01–12 + canonical Doc 13 delivery.** File formats supplied (`.docx`/`.pdf`/`.md`), delivery channel (owner drive share), and whether binary originals are permitted to be committed as raw sources (default: no, per §K).
- **Q3 — Root `README.md` rewrite content.** Approved project description, tagline, and links.
- **Q4 — Root `*.schema.txt` disposition.** Delete the exact duplicate (`billing_links`) and relocate the four supersede-by-preflight snapshots, or keep all five root snapshots in place as extra evidence.

All other DG.1 owner-decision candidates are pre-resolved by the DG.1A brief (owner-governance outside repo, AML.1.b.1 in place, no deletion without hash/diff proof, Doc 13 title = "Operational Truth Stabilization", Lab closure artifact preserved separately, raw vs rewritten Round 1 separation, no execution start).

## O. Readiness for Controlled Cleanup Execution

**Ready to author a separate execution prompt when Q1–Q4 are answered.** The execution prompt must:

- Cite this DG.1A report as its binding evidence base.
- Enforce copy-then-verify-then-delete for every destructive act (SHA-256 pre/post checks committed as part of the change).
- Phase gates as previously proposed (security containment → folder skeleton → raw preservation → header normalization → move/archive → Round 1 authoring → link repair → validation → commit + change report).
- Stop and re-plan on any hash mismatch or unexpected pre-existing path.

DG.1A itself changed no state; no rollback is required.

## P. Exact Inputs Required for the Execution Prompt

1. Owner answers to Q1–Q4.
2. Authoritative source files for Documentation 01–12 and canonical Doc 13 ("Operational Truth Stabilization"), each with owner-confirmed title, document number, and file hash for tamper detection.
3. Confirmed final visibility of the shared repository (drives whether S12–S15 relocation runs in Phase 1).
4. Approved secret pattern list to enforce in Phase 1 (defaults: PEM `-----BEGIN`, `SUPABASE_SERVICE_ROLE_KEY`, `sk_live_`, `sk_test_`, `Bearer ey`, `AKIA`, `password\s*[:=]\s*['"]`, URLs with `?token=|?access_token=|?api_key=`, and any owner-provided extra patterns).
5. Confirmed real project name, description, and public-facing links for the rewritten root `README.md`.
6. Explicit branch to execute cleanup on (recommended: a dedicated `docs/cleanup-dg-1` branch).
7. Author line / commit signature preference.
8. Approval to leave `.lovable/plan.md` and `.workspace/skills/**` out of scope.
9. Approval of the exact folder tree in §J with any owner amendments.
10. Approval of the exact naming/versioning standard proposed in DG.1 §L (metadata header, semver, no `_final`/`_v2` in filenames).
11. Confirmation of whether the eventual public GitHub mirror is planned; if yes, S12–S15 rollback TSVs must be relocated to private storage before mirroring is enabled.
12. Approval that the current repo file `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` will be renamed and reclassified per §C/M06, not deleted.

---

**DG.1A completed in strict read-only mode. No documentation file, source file, database object, record, policy, secret, environment setting, deployment configuration, repository path, branch, commit, or project asset was created, modified, moved, renamed, archived, imported, or deleted.**
```
