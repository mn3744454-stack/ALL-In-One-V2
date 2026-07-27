<!--
id: DHB-HIST-DOCS-README
title: Historical Documentation 01–13 — README
version: 1.0.0
status: current
audience: internal
date: 2026-07-27
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: authored during DG.2
source-sha256: n/a
-->

# Historical Documentation 01–13

This folder preserves the owner-supplied historical Documentation series (01–13) as tamper-evident evidence.

## Layout

- `raw/` — **immutable** verbatim source files (never edit, never overwrite). Extensions preserved (`.md` / `.txt`).
- `01-…md` … `13-…md` — **canonical historical Markdown** normalizations of each raw source. Each file adds only a metadata header and a historical banner; the body is preserved and linked back to the raw source with SHA-256.
- `source-artifacts/` — separately-classified historical source inputs that are **not** canonical Documentation but were folded into a later canonical Doc. Currently: `laboratory-workstream-closure-source.md` (Laboratory-scoped predecessor to canonical Doc 13).
- `source-manifest.md` — full mapping of original filenames → normalized raw filenames → bytes → SHA-256.

## Audience

Internal + receiving-developer background reading. **Not** a substitute for current source code, migrations, or database state.

## Identity distinction — Documentation 13

- **Canonical Documentation 13:** [`13-operational-truth-stabilization.md`](./13-operational-truth-stabilization.md) — normalized from the owner-supplied `Documentation 13 - Operational Truth Stabilization.txt` source.
- **Laboratory Workstream Closure source artifact:** [`source-artifacts/laboratory-workstream-closure-source.md`](./source-artifacts/laboratory-workstream-closure-source.md) — a Laboratory-scoped predecessor that was later folded into the broader canonical Doc 13. It is **not** Documentation 13.
- The legacy in-repo file `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` remains in its original path during DG.2 (additive-only). A later acceptance-approved cleanup phase will retire that legacy path.

## Retrieval guidance for Lovable and reviewers

1. Cite canonical Markdown files (`01-…md` … `13-…md`) when quoting a Documentation.
2. When byte-integrity matters (e.g., proving a claim was in the original source), cite the corresponding file under `raw/` and its SHA-256 from `source-manifest.md`.
3. Do not correct historical claims by editing these files. Corrections belong in later canonical current-truth documents (handoff rounds, module docs, architecture docs) that supersede specific claims.

## Governance notes

- Historical files must never be silently rewritten.
- Current implementation truth (source code, migrations, database state) overrides historical claims wherever they conflict.
- Owner-governance documents (Word files, access lists, vendor evaluations, account-recovery details, pricing, contracts) are **not** stored in this repository. See `docs/CONVENTIONS.md`.
- No secret values are permitted in any file under this folder.
