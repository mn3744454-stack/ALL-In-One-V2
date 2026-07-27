<!--
id: DHB-HIST-README
title: Historical — README
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-27
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: authored during DG.2
source-sha256: n/a
-->

# Historical

Historical evidence, preserved as tamper-evident record.

## Subfolders

- `documentation-01-13/` — owner-supplied historical Documentation 01–13 (raw + canonical Markdown) plus source-artifact classifications.
- `audits/` — governance audits (DG.1, DG.1A, future).
- `execution-closures/` — post-execution reports (populated in a later phase).
- `release-notes/` — archived release notes (populated in a later phase).
- `schema-snapshots/` — archived schema snapshots (populated in a later phase).
- `module-legacy/` — archived per-module historical notes (populated in a later phase).

Historical files must never be silently rewritten. Current source code, migrations, and database state supersede historical claims where they conflict.
