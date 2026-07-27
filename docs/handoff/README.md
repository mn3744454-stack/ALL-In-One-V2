<!--
id: DHB-HANDOFF-README
title: Handoff — README
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

# Handoff

This folder holds developer-handoff material for the currently active Dayli Horse platform.

## Layout

- `rounds/round-01/` — the first handoff round. Currently contains **raw provenance only** (investigative + proceed prompts, verbatim Round 1 output). Rewritten canonical deliverables are pending.
- `rounds/round-02+/` — future rounds. Not yet created.
- `final/` — reserved for the eventual consolidated handoff pack. Not yet populated.

## Audience

- **External developer receiving the project** — read the rewritten canonical handoff document once it exists. Raw evidence is provenance, not the deliverable.
- **Internal Lovable agent** — use the internal reference file (once authored) plus current architecture/module docs.
- **Owner** — use the acceptance file (once authored) to record acceptance.

## Raw evidence vs canonical rewritten documentation

- **Raw evidence** (`round-XX-inputs.md`, `round-XX-raw-audit-output.md`) is preserved verbatim, immutable, and never rewritten. It exists so any later claim can be audited back to its exact source.
- **Canonical rewritten documentation** (`round-XX-developer-handoff.md`, `round-XX-lovable-reference.md`) is the deliverable audiences should read. It may correct, clarify, or supersede specific claims in the raw evidence.

## Current status

- Round 1 raw provenance: **present** (see `rounds/round-01/`).
- Round 1 rewritten developer handoff: **pending**.
- Round 1 internal Lovable reference: **pending**.
- Round 1 acceptance: **pending; no acceptance has occurred**.

## Governance notes

- Owner-governance Word files remain outside the shared repository.
- Current implementation truth overrides historical claims wherever they conflict.
- The Laboratory closure source artifact under `docs/historical/documentation-01-13/source-artifacts/` is a Laboratory-scoped predecessor and is **not** canonical Documentation 13.
