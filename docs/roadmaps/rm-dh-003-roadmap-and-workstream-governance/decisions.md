<!--
id: DHB-RM-003-DECISIONS
title: RM-DH-003 — Roadmap & Workstream Governance Foundation (decisions)
version: 1.1.0
status: current
audience: internal
date: 2026-07-30
last-verified: 2026-07-31
supersedes: []
superseded-by: null
source: authored during RM-DH-003 / Phase 2 — Governance Foundation Execution (WS-DH-2026-0002); v1.1.0 — adds the canonical decision DEC-RM-DH-003-004 (narrow `.lovable/plan.md` platform-artifact governance exception) during RM-DH-003 / Phase 2 — Planning-Artifact Governance Exception Documentation Correction. Decisions 001–003 are unchanged.
source-sha256: n/a
-->

# RM-DH-003 — Decisions

**العنوان العربي:** قرارات تأسيس حوكمة خرائط العمل ومسارات العمل

This file owns approved decisions, options, rationale, rejected alternatives, and unique Decision IDs for `RM-DH-003`.

## Decision ID numbering note

- The original owner-alignment session used the labels **D-01**, **D-02**, and **D-04**. The label **D-03** was skipped during that session.
- A repository check found **no evidence** of an omitted decision named D-03. Nothing was removed, lost, or hidden.
- Canonical repository Decision IDs are therefore **consecutive**: `DEC-RM-DH-003-001`, `DEC-RM-DH-003-002`, `DEC-RM-DH-003-003`, `DEC-RM-DH-003-004`.
- Each of `DEC-RM-DH-003-001` to `-003` retains its original owner-alignment label as an alias. `DEC-RM-DH-003-004` has **no alias**: it was approved later, in a separate owner decision, and it is **not** the historical owner-alignment label `D-04` (that label is the alias of `DEC-RM-DH-003-003`).
- **No decision content was fabricated** to fill the D-03 gap.

---

## DEC-RM-DH-003-001

**Alias:** Owner Alignment D-01
**Subject:** Four-file Roadmap package
**Status:** Approved
**Decided at:** 2026-07-30T20:19:00+03:00 (Asia/Riyadh — UTC+03:00)

### Decision

Every Dayli Horse Roadmap starts, from creation, with four files: `README.md`, `roadmap.md`, `decisions.md`, and `changelog.md`. Authority is exclusive:

- `README.md` — stable identity and navigation.
- `roadmap.md` — authoritative current state, Phases, Tracks, dependencies, stopping point, remaining work, next step.
- `decisions.md` — approved decisions, options, rationale, rejected alternatives, unique Decision IDs.
- `changelog.md` — append-oriented chronological changes and timestamps.

### Rationale

- Dayli Horse Roadmaps are large and highly branched.
- Small tasks routinely expand into Tracks and Workstreams. Observed examples: Arrivals and Departures exposing the In-Transit and Transport lifecycle; HR expanding from a small correction into hours of investigation and correction; Breeding expanding from a small issue into a broad scientific and operational Roadmap.
- Organizing from creation is therefore not unnecessary complexity; it is the cheapest point at which structure can be added.
- The system is intended to remain understandable for approximately 30 years.
- The owner may remember the choice but later forget the reason, so rationale and rejected alternatives must be preserved in the repository rather than in memory or private conversation.

### Rejected alternatives

1. **One-file Roadmap package** — rejected. Identity, current state, decisions, and chronology collide in a single file; change history becomes unreadable and contradictions become invisible.
2. **Three-file package without a dedicated decisions file** — rejected. Decisions would be scattered between current state and chronology, so rationale and rejected alternatives would erode first, which is precisely the knowledge that must survive longest.

---

## DEC-RM-DH-003-002

**Alias:** Owner Alignment D-02
**Subject:** Initial representation of `RM-DH-002`
**Status:** Approved
**Decided at:** 2026-07-30T20:45:00+03:00 (Asia/Riyadh — UTC+03:00)

### Decision

Create the full four-file identity package for `RM-DH-002` now, with the state contract `Active` + `PARTIALLY_RECOVERED` + Historical Recovery Required `Yes`, no declared Current Phase, no canonical Phase import, and no execution authority until recovery is completed and owner-approved.

### Rationale

- `RM-DH-002` already exists as a real historical Roadmap.
- Classifying it as `Draft` would erase historical truth by implying the work never started.
- Omitting it would make the central registry incomplete and therefore untrustworthy.
- No Current Phase or detailed historical import may be claimed before structured recovery, because that content has not been verified from repository evidence.

### Rejected alternatives

1. **Draft stub** — rejected. Factually false; the Roadmap is real and active historically.
2. **Complete omission until recovery** — rejected. Leaves a known Roadmap unregistered and invites a duplicate ID or a lost record.

---

## DEC-RM-DH-003-003

**Alias:** Owner Alignment D-04
**Subject:** Repository-wide governance rules in `docs/CONVENTIONS.md`
**Status:** Approved
**Decided at:** 2026-07-30T20:54:00+03:00 (Asia/Riyadh — UTC+03:00)

### Decision

Add stable Roadmap and Workstream governance rules to [`../../CONVENTIONS.md`](../../CONVENTIONS.md) and raise that document from version 1.0.0 to 1.1.0.

### Rationale

- Stable rules must govern all of `docs/**`, not only the governance folders.
- Developers and agents working outside `docs/roadmaps/` and `docs/workstreams/` must see the same contract without having to discover those folders first.
- Stable rules belong in conventions; dynamic truth (current status, current Phase, pending decisions, progress) remains in the specialized Roadmap and Workstream files.
- This separation reduces contradiction, because there is exactly one place for a rule and exactly one place for a state.

### Rejected alternative

1. **Keep governance rules only in the Roadmap and Workstream registries** — rejected. Readers outside those folders would not encounter the rules, and duplicating the rules into conventions later would create two competing statements of the same contract.
