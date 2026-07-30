<!--
id: DHB-CONV
title: Documentation Conventions
version: 1.1.0
status: current
audience: internal
date: 2026-07-27
last-verified: 2026-07-30
supersedes: []
superseded-by: null
source: authored during DG.2 (aligned with DG.1A §I, §J, §L); v1.1.0 — adds §11 Roadmap and Workstream governance (stable rules only) during RM-DH-003 / Phase 2 — Governance Foundation Execution, Workstream WS-DH-2026-0002, at 2026-07-30T21:16:54+03:00 (Asia/Riyadh — UTC+03:00)
source-sha256: n/a
-->

# Documentation Conventions

These conventions govern every documentation file inside this repository. They are additive to the current-truth rule: **source code, migrations, and live database state override any conflicting documentation claim.**

## 1. Filenames

- Lowercase ASCII, hyphen-separated (`kebab-case`).
- No spaces, no underscores in new files, no non-ASCII characters.
- No filename-based versioning: **do not** use `-final`, `-final-final`, `-latest`, `-copy`, `-v2`, `-new`, `-old` in filenames. Versioning lives in the file's metadata header.
- Documentation-series files use the pattern `NN-slug.md` (two-digit number for stable sort).

## 2. Metadata header (required on every documentation `.md`)

Placed at the very top of the file as an HTML comment so it does not render:

```html
<!--
id: DHB-DOC01
title: Documentation 01 — Forensic Platform Architecture Audit
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source
source-sha256: d82868b1dea26c846354ede421fc72a3a0d0e0d221d67d555358a58a3fcea92f
-->
```

### Field rules

- `id` — unique document ID. Namespaces in use: `DHB-DOC<NN>` (historical Doc series), `DHB-R<NN>-…` (handoff round artifacts), `DHB-AUDIT-<CODE>` (governance audits), `DHB-CONV`, `DHB-INDEX`, `DHB-HIST-…`, `DHB-HANDOFF-…`. IDs must be globally unique within `docs/`.
- `title` — human-readable title. Do not rename the file to change the title; update the header.
- `version` — semantic version (`MAJOR.MINOR.PATCH`).
- `status` — one of: `current`, `draft`, `pending`, `historical`, `historical-audit`, `historical-source-artifact`, `evidence-immutable`, `superseded`, `deprecated`.
- `audience` — `internal` \| `external` \| `internal+external` \| `owner-only` (owner-only content must not live in this repository).
- `date` — original authoring date (`YYYY-MM-DD`) or `unknown`.
- `last-verified` — most recent date on which the document was reviewed against current implementation truth.
- `supersedes` — list of document IDs this file supersedes (may be empty).
- `superseded-by` — document ID that supersedes this file, or `null`.
- `source` — description of the source (owner-supplied file, audit round, generated during DG.N, …).
- `source-sha256` — SHA-256 of the source when the document is a preserved copy; `n/a` for freshly authored files.

## 3. Historical banner (required on every historical / evidence file)

Placed immediately after the metadata header:

> This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.

## 4. Immutability of raw evidence

- Files under `docs/historical/documentation-01-13/raw/` and every `round-XX-inputs.md` / `round-XX-raw-audit-output.md` are **immutable**. They must never be silently rewritten. Errors, corrections, or later understanding belong in a newer canonical current-truth document (not in the evidence).
- Canonical historical Markdown copies may add only a metadata header, a historical banner, a link to the raw source, and (for plain-text sources) preserve the body inside a text fence. The body content must not be edited.

## 5. Current truth vs historical evidence

- Current-truth documents describe how the platform **is** today.
- Historical documents describe how the platform **was** at their authoring date.
- When they conflict, **current source code, migrations, and live database state win**. Historical claims that no longer hold must be marked `superseded` (with `superseded-by` populated) rather than deleted or silently corrected in place.

## 6. Owner-governance is outside the repository

Owner-governance documentation — access lists, vendor evaluations, account-recovery details, secret-management processes, offboarding notes, pricing, legal, contracts, and any Word documents intended only for the owner — is **not stored** in this repository. Git provides no reliable per-folder read separation among repository collaborators. `docs/governance/` may only contain governance rules explicitly authorized for all approved collaborators. `docs/owner/` must not exist.

## 7. No secret values in documentation

- Never commit real values for API keys, service-role keys, database passwords, provider credentials, session tokens, JWTs, PEM blocks, or private URLs with embedded tokens.
- Publishable / anon values that Supabase itself exposes to the browser are permitted where they are already public (they are non-secret by design).
- Operational documentation may reference environment variable **names**, never their values.

## 8. Index registration

Every documentation file (except transient placeholders) must be registered in `docs/README.md` with its ID, path, category, audience, status, version, and coverage. Adding a documentation file without indexing it is not permitted.

### 8.1 Category-scope placeholder READMEs (DG.2B exemption)

A **category-scope placeholder README** is exempt from individual central-index registration when **all** of the following hold:

- The file is a `README.md` at the root of an already-indexed parent folder (for example `docs/architecture/`, `docs/modules/`, `docs/operations/`, `docs/workflows/`, `docs/templates/`, `docs/governance/`, `docs/security/`, `docs/handoff/final/`, `docs/historical/execution-closures/`, `docs/historical/module-legacy/`, `docs/historical/module-legacy/laboratory/`, `docs/historical/release-notes/`, `docs/historical/schema-snapshots/`).
- Its content is limited to folder-purpose and status metadata (what the folder is for, what will land here, what governance applies).
- It makes no independent technical, architectural, security, or historical claim.
- The parent folder itself is already discoverable through `docs/README.md` (either directly or through a nearby indexed handoff/historical/audit entry).

Substantive READMEs — including handoff READMEs, round READMEs, historical identity/supersession READMEs (e.g. `historical/documentation-01-13/README.md`), runbook READMEs, module docs, operations docs, audit READMEs, and evidence READMEs — are **not** exempt and must remain individually indexed. When a placeholder README grows to carry independent claims, it must be indexed at that time.

## 9. Change-review

- Documentation changes must go through the same branch/review workflow as source changes.
- Increment the `version` field on every non-trivial change. Update `last-verified` on every reverification, even when content is unchanged.
- Structural moves, renames, and deletions require explicit owner acceptance recorded in the relevant handoff round's acceptance file.

## 10. Prohibited

- Silently rewriting raw evidence.
- Committing owner-governance material to this repository.
- Committing secret values.
- Filename-based version suffixes (`-final`, `-latest`, `-copy`, `-v2`).
- Bypassing the metadata header on documentation files.

## 11. Roadmap and Workstream governance

These are **stable repository-wide rules**. They apply to all of `docs/**`. Dynamic state — current Roadmap status, current Workstream status, pending owner decisions, progress snapshots, implementation results, historical recovery details — must never be recorded here. It lives in `docs/roadmaps/**` and `docs/workstreams/**`.

### 11.1 Identifiers

- Roadmap ID format: `RM-DH-###`.
- Workstream ID format: `WS-DH-YYYY-NNNN`.
- A Phase must always be cited in the compound form `RM-DH-00X / Phase N`. A bare phase number is not a valid reference.
- Decision ID format inside a Roadmap package: `DEC-<Roadmap ID>-NNN`, consecutive. An earlier informal alias may be recorded alongside the canonical ID.

### 11.2 Owner approval boundary

Creating a Roadmap, changing its structural classification, registering it centrally, and closing it require explicit approval by the Dayli Horse Platform Owner. No agent and no contributor may create or reclassify a Roadmap unilaterally.

### 11.3 Four-file Roadmap package

Every Roadmap has, from creation, exactly these files, with exclusive authority:

- `README.md` — stable identity and navigation.
- `roadmap.md` — authoritative current state, Phases, Tracks, dependencies, stopping point, remaining work, next permitted step.
- `decisions.md` — approved decisions, options, rationale, rejected alternatives, unique Decision IDs.
- `changelog.md` — append-oriented chronological changes with absolute timestamps.

A single-file Roadmap package is not permitted. `decisions.md` and `changelog.md` may not be deferred.

### 11.4 Registry as index

`docs/roadmaps/README.md` and `docs/workstreams/README.md` are indexes. A registry summary never overrides a package's authoritative files. Canonical report bodies are linked, never copied.

### 11.5 Workstream lifecycle

Stages: Investigative Audit, Mini Investigative Audit (when needed), Owner Alignment, Execution, QA, Acceptance Re-Audit, Closure.

- **Investigative-first:** work begins with investigation, not implementation.
- **Low-risk work** may skip stages that add no value.
- **High-risk work** — security, authority, finance, data integrity, migrations, cross-tenant behavior — requires strict staged governance and may skip nothing.
- **Execution is not Acceptance.** Completing work does not accept it.
- **Acceptance Re-Audit is mandatory before Closure** at every risk level.
- Workstream ID gaps are permitted and do not prove a missing repository file.

### 11.6 Evidence and truth

- Evidence precedence: current repository contents, then current live system state, then accepted canonical documentation, then owner-approved decisions, then historical documentation, then explicitly verified historical records.
- **Historical evidence never overrides current accepted truth.** Historical claims are preserved as evidence and qualified, not silently corrected.
- Unsupported recollection is not evidence.

### 11.7 Persistence and honesty

- A document may claim that something was stored only **after** the corresponding file write has succeeded. A path may be cited only when a successful write produced it.
- A contradiction between two authoritative files is an **acceptance-blocking defect**, not a stylistic issue.
- No historical backfill may be performed without explicit, scoped authorization.

### 11.8 Privacy boundary

Private conversation transcripts, hidden reasoning, unapproved options, owner-private notes, vendor, financial, negotiation, and credential content must never enter Roadmap or Workstream files. §6 and §7 apply in full.

### 11.9 Timestamps

Absolute timestamps in `Asia/Riyadh — UTC+03:00`, Latin digits 0–9. When the exact time of a historical event is not verified, record `Exact time not recorded` rather than inventing one.

