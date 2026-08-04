<!--
id: DHB-RM-003-DECISIONS
title: RM-DH-003 — Roadmap & Workstream Governance Foundation (decisions)
version: 1.2.0
status: current
audience: internal
date: 2026-07-30
last-verified: 2026-08-04

supersedes: []
superseded-by: null
source: authored during RM-DH-003 / Phase 2 — Governance Foundation Execution (WS-DH-2026-0002); v1.1.0 — adds the canonical decision DEC-RM-DH-003-004 (narrow `.lovable/plan.md` platform-artifact governance exception) during RM-DH-003 / Phase 2 — Planning-Artifact Governance Exception Documentation Correction. Decisions 001–003 are unchanged.; v1.2.0 — RM-DH-003 / Phase 3 — Governance Persistence Execution under execution prompt PROMPT-DH-RM003-P3-GOVERNANCE-PERSISTENCE-EXECUTION-02, persisted 2026-08-04 (Asia/Riyadh — UTC+03:00): appends exactly two decisions, DEC-RM-DH-003-005 (Phase 3 Governance Approval) and DEC-RM-DH-003-006 (Module, Feature and Product-Control Architecture Package D1–D10). Decisions 001 through 004 are preserved unchanged and unrenumbered. Owner approval time is distinguished from repository persistence time; where the exact Owner approval time is not evidenced it is recorded as not recorded.
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

---

## DEC-RM-DH-003-004

**Alias:** None. This decision has no owner-alignment alias and is **not** the historical label `D-04`; that label belongs to `DEC-RM-DH-003-003`.
**Subject:** Narrow `.lovable/plan.md` platform-artifact governance exception
**Status:** Approved
**Decided at:** 2026-07-31 (Asia/Riyadh — UTC+03:00). Exact time not recorded.

### Decision

Govern the platform-managed planning artifact `.lovable/plan.md` through a documented narrow exception rather than through Git untracking. The exception is recorded as stable repository-wide rules in [`../../CONVENTIONS.md`](../../CONVENTIONS.md) §11.10.

### Owner-approved narrow scope

- The exception covers exactly one path: `.lovable/plan.md`.
- It does not extend to `.lovable/`, `.lovable/*`, `.lovable/**`, or any other current or future `.lovable/` path.
- It covers only changes generated automatically by the Lovable platform; manual and agent-directed edits during read-only work remain prohibited.
- Plan Mode and Chat Mode remain strictly read-only for every other tracked repository file.

### Rationale

- The read-only contract for tracked files cannot be honored for a file that the platform recreates, force-adds, and auto-commits on planning turns.
- Untracking was attempted externally and was technically valid, but it did not survive platform behavior.
- A documented exception keeps the contract truthful and auditable instead of leaving a permanently violated rule in force.
- The exception is deliberately single-path so that no future `.lovable/` artifact inherits an unaudited allowance.

### Verified Git evidence

| Commit | Author time | Purpose |
|---|---|---|
| `9fb0b56998b3f0a9887bf87e835d40a776552213` | 2026-07-31T05:04:27+03:00 | External correction content commit: adds the narrow `.gitignore` rule and removes `.lovable/plan.md` from tracking. |
| `06467d6cc7a2d689094e6874600bcee8d821004a` | 2026-07-31T05:38:59+03:00 | Merge of the external correction into `main` (pull request #3). |
| `64ab74ab609ecf46e45157a7c6ab6303eb741d2d` | 2026-07-31T02:47:36+00:00 | First platform-generated restoration commit: `.lovable/plan.md` recreated, force-added despite the ignore rule, committed as a standalone one-file commit. |
| `b6cabc4e8161efa47638ed102fad43e4b2ef6079` | 2026-07-31T02:48:15+00:00 | Platform-generated merge commit ("Update plan"). |
| `92226e1065d50959f0ce01e41ad4b2cf8118d03b` | 2026-07-31T04:14:12+00:00 | Later platform-generated one-file `.lovable/plan.md` commit. |
| `ebec2b3e92e1ef52dc8fb7b243bcea1c2b33a88e` | 2026-07-31T04:14:21+00:00 | Later platform-generated merge commit ("Update plan"). |

Raw Git offsets are preserved as recorded by Git; the two external commits were authored in `+03:00` and the platform commits in `+00:00`.

The observed platform behavior is an evidence-based inference from repeated observation. It is not a vendor guarantee and may change.

### Implications

- The existing single-file `.gitignore` rule may remain; it is inert while the platform keeps the file indexed.
- A platform-generated `.lovable/plan.md` change or commit is not implementation, not Acceptance evidence, and not proof that other paths were unchanged.
- Every read-only audit and execution report must disclose the platform-generated path separately and exclude it from the intended-file count while retaining it in complete Git evidence.

### Privacy boundary

`.lovable/plan.md` must never contain credentials, secrets, private owner information, vendor information, financial information, strategic content, conversation transcripts, or hidden reasoning. `docs/CONVENTIONS.md` §6 and §7 apply in full.

### Future Re-Audit requirement

Untracking must not be retried unless a future owner-approved Re-Audit demonstrates that platform behavior changed.

### Status and Acceptance implications

Executing this documentation correction does not accept it. The Workstream status becomes `EXECUTED_AWAITING_REAUDIT`; QA remains `Pending`; the earlier baseline Acceptance is preserved as historical evidence; closure remains not approved. A separate read-only targeted Acceptance Re-Audit is required.

### Rejected alternatives

1. **Broad `.lovable/**` exemption** — rejected. It would pre-authorize unaudited future platform artifacts under a rule approved for one known file.
2. **Repeated untracking attempts in the current platform environment** — rejected. The behavior was observed repeatedly; retrying would produce recurring contract violations without changing the outcome.
3. **Recording the limitation without a governing rule** — rejected. A known, permanent deviation with no rule leaves the read-only contract false on its face and gives auditors no stable basis for disclosure.

---

## DEC-RM-DH-003-005

**Alias:** None.
**Subject:** Phase 3 Governance Approval — Persistent Knowledge Architecture, Verification, Organization and Installation
**Status:** Approved
**Decided at:** Owner approval granted before this persistence run. **Exact approval time not recorded.**
**Persisted at:** 2026-08-04 (Asia/Riyadh — UTC+03:00), by execution prompt `PROMPT-DH-RM003-P3-GOVERNANCE-PERSISTENCE-EXECUTION-02`.

Owner approval and repository persistence are distinct events. This entry records only what is evidenced.

### Decision

Create and govern `RM-DH-003 / Phase 3`.

- **English title:** Persistent Knowledge Architecture, Verification, Organization and Installation.
- **Arabic title:** هندسة المعرفة الدائمة والتحقق منها وتنظيمها وتثبيتها.
- **Purpose:** establish, verify, organize and install a durable Persistent Knowledge architecture for Dayli Horse — Memory governance and provenance, codebase architecture intelligence, knowledge organization, technical verification, reconstruction, Owner Acceptance and installation.
- **Phase state at persistence:** ACTIVE — SUB-PHASE 3.0 — GOVERNANCE PERSISTENCE.

### Approved Tracks

| Track | Title | Assigned Workstreams |
|---|---|---|
| A | Memory Governance and Provenance | `WS-DH-2026-0012` |
| B | Codebase Architecture Intelligence | `WS-DH-2026-0013` |
| C | Knowledge Organization | `WS-DH-2026-0014`, `WS-DH-2026-0015` |
| D | Technical Verification | `WS-DH-2026-0016` |
| E | Reconstruction, Acceptance and Installation | `WS-DH-2026-0017`, `WS-DH-2026-0018`, `WS-DH-2026-0019`, `WS-DH-2026-0020` |

### Approved Sub-phases

`3.0` Scope and Governance Persistence; `3.1` Foundational Read-Only Audits; `3.2` Knowledge Organizational Architecture; `3.3` Persistent Knowledge Stage B; `3.4` Persistent Knowledge Stage C; `3.5` Persistent Knowledge Stage D; `3.6` Persistent Knowledge Stage E; `3.7` Acceptance, Installation and Verification. There is no Sub-phase `3.8`.

### Approved Workstreams and dependencies

Nine Workstreams are approved and registered: `WS-DH-2026-0012` through `WS-DH-2026-0020`. Their exact titles, Tracks, Sub-phases, dependencies and registry statuses are authoritative in [`roadmap.md`](./roadmap.md). Dependencies in summary: 0014 and 0015 are blocked by 0012 and 0013; 0016 is blocked by 0014 and 0015; 0017 by 0016; 0018 by 0017; 0019 by 0018; 0020 by a passed Stage E and explicit Owner Acceptance.

### Parallel read-only policy

`WS-DH-2026-0012` and `WS-DH-2026-0013` may later run in parallel as read-only Plan/Chat investigations only after the Governance Persistence Acceptance Re-Audit passes, Owner Acceptance is granted where required, the required persistence is complete, the Owner explicitly advances to Sub-phase 3.1, and dedicated Workstream packages are separately authorized.

### Memory boundary

The four inaccessible Memory IDs `MEM-079`, `MEM-084`, `MEM-090` and `MEM-095` are **permanently reserved**. They must not be reconstructed, reused, renumbered or silently replaced.

### Explicit exclusions of this approval

- No automatic implementation of any kind.
- No Project Knowledge installation in this execution; Project Knowledge remains **not installed**.
- No Workspace Knowledge modification.
- No Skills change and no `AGENTS.md` creation.
- Documentation 01–13 remains excluded.
- Project Knowledge and Workspace Knowledge remain isolated from one another.
- Current state and persisted state remain distinct: approving a structure is not evidence that the structure has been executed, accepted or closed.
- No advancement to Sub-phase 3.1 through this execution.

### Rationale

Persistent Knowledge work is long-horizon, highly branched and easily lost to private conversation history. Approving and persisting the complete Phase, Track, Sub-phase and Workstream structure before any investigation begins fixes the boundaries, reserves the identifiers, and makes each later step separately authorizable and auditable.

### Rejected alternatives

1. **Begin the Memory Genesis and Refactoring Baseline investigations immediately without persisting the structure** — rejected. The structure would exist only in conversation, and the Workstream IDs would remain unreserved and collision-prone.
2. **Create dedicated Workstream packages for all nine IDs now** — rejected. Packages for Workstreams that have not been authorized to start imply activity that has not occurred, and they would need repeated correction before use.
3. **Extend Phase 2 instead of creating Phase 3** — rejected. Phase 2 is closed; reopening a closed Phase would destroy the truthfulness of its Closure evidence.

---

## DEC-RM-DH-003-006

**Alias:** None.
**Subject:** Module, Feature and Product-Control Architecture Package D1–D10
**Status:** Approved
**Decided at:** Owner approval granted before this persistence run. **Exact approval time not recorded.**
**Persisted at:** 2026-08-04 (Asia/Riyadh — UTC+03:00), by execution prompt `PROMPT-DH-RM003-P3-GOVERNANCE-PERSISTENCE-EXECUTION-02`.

This decision owns the full D1–D10 text. Other governance files may reference `DEC-RM-DH-003-006` but must not duplicate that text.

### D1 — Module Identity

A Module remains a principal Dayli Horse account-type operational domain. A Module is not the same as every capability contained inside it.

### D2 — Feature Identity

A Feature remains an operational capability inside a Module. A Feature may be core, optional, advanced, shared or cross-module, but it does not automatically become a Module.

### D3 — Governed Cross-Module Feature Packs

An eligible Workspace may activate a governed and internally coherent Feature Pack originating from another domain without activating the entire source Module. Feature Packs must preserve operational truth and dependencies.

### D4 — No Arbitrary Feature Cherry-Picking

The system must not allow arbitrary individual Feature selection where dependencies would create an incomplete, misleading, unsafe or non-operational workflow.

### D5 — Request Features Are Separate from Internal Execution

The ability to request a service from another Module does not mean the requesting Workspace internally operates that Module. Requesting, coordinating, executing, owning the record, paying and receiving the result remain separate roles.

### D6 — Module Core Features and Minimum Core Bundles

Identity-defining Module Core Features must not be separated in a way that makes the Module operationally false. A Minimum Core Bundle may be approved only where it creates a complete, truthful and enforceable operational journey.

### D7 — Clinic and Hospital Module Family

Clinic and Hospital remain initially within one Veterinary Care Module family rather than being duplicated Modules. Organization subtype and Feature depth may distinguish Veterinary Clinic, Veterinary Hospital and Veterinary Center.

### D8 — Self-Declared Organization Type and Verification Boundary

A Workspace may self-declare its organization type. Self-declaration does not mean Dayli Horse verified professional, facility, government or licensing status.

### D9 — Separate Product-Control Layers

The following remain separate: Feature Catalog identity; current implementation; Feature depth; commercial entitlement; Workspace activation; Branch configuration; user permission; workflow assignment; billing; usage limit; suspension or expiry. No layer automatically proves another.

### D10 — Detailed Pack, Pricing, Dependency and Execution Design Is Pending

Approval of D1–D10 does not approve exact Feature Pack names, exact pack composition, standalone Feature eligibility, prices, renewal terms, usage meters, migrations, entitlement tables, implementation sequence, current-code correction, or production activation. Those items require separate investigation, Owner Alignment and authorized execution.

### Rationale

Dayli Horse spans many account types whose capabilities overlap. Without a fixed vocabulary separating Module identity, Feature identity, packaging and the product-control layers, commercial packaging and entitlement work would silently redefine what a Module is and would produce operationally false workspaces.

### Rejected alternatives

1. **Treat every significant capability as its own Module** — rejected. It would multiply Modules, fragment operational journeys and make account-type identity meaningless.
2. **Allow free per-Feature selection** — rejected by D4. Dependency-blind selection produces incomplete and unsafe workflows.
3. **Approve pack names, composition and pricing in the same decision** — rejected by D10. That design has not been investigated and would bind commercial terms without evidence.

