# RM-DH-004 GOVERNANCE PERSISTENCE PLANNING AUDIT

Prompt ID: PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-PLANNING-AUDIT-01
Mode: Plan/Chat — Read-Only. Operation: Governance Persistence Planning Audit.

## A. Executive Verdict

**READY FOR GOVERNANCE PERSISTENCE**

- `RM-DH-004` does not exist anywhere in the repository: zero occurrences of the string in any tracked file (verified by full-repository ID scan).
- `WS-DH-2026-0003` through `WS-DH-2026-0011` are entirely unused; only `WS-DH-2026-0002` exists as a package and `WS-DH-2026-0001` appears once as a referenced-but-unpublished ID inside `workstream.md`.
- `DEC-RM-DH-004-001` is the correct first decision ID: `docs/CONVENTIONS.md` §11.1 mandates `DEC-<Roadmap ID>-NNN`, consecutive, and no `DEC-RM-DH-004-*` exists.
- The four-file package shape is mandatory and non-deferrable per §11.3, so the proposed `README.md` / `roadmap.md` / `decisions.md` / `changelog.md` set is correct and complete.
- The proposed folder slug pattern matches the three existing packages (`rm-dh-00N-<kebab-title>`); the proposed name is compliant but longer than any precedent — a shorter compliant variant is offered.
- Governance does **not** require nine Workstream packages now. §11.4 makes the registry an index, §11.7 forbids claiming state that has not occurred, and the only existing precedent is one package for the one Workstream that actually executed. Creating packages for blocked, planned, pilot and deferred Workstreams would prematurely persist dynamic state.
- Four central files become stale on persistence and must be updated: `docs/roadmaps/README.md`, `docs/workstreams/README.md`, `docs/README.md`, and nothing else.
- `docs/CONVENTIONS.md`, and every `RM-DH-001`, `RM-DH-002` and `RM-DH-003` file, must remain unchanged — no rule is added and no existing Roadmap's authoritative content becomes false.
- One pre-existing index defect is disclosed and must not be silently absorbed: `docs/README.md` row `DHB-RM-003-DECISIONS` shows `Executed — awaiting Acceptance Re-Audit` while every sibling RM-DH-003 row shows `Closed — owner Closure persisted`.
- No owner decision is outstanding for persistence itself; the approved contract in the prompt is internally consistent with repository governance.

## B. Evidence and Access Boundary

**Directly read:** `docs/CONVENTIONS.md` (frontmatter, section index, complete §11 including §11.1–§11.10); `docs/README.md` (frontmatter, governance registry rows 117–131); `docs/roadmaps/README.md`; `docs/workstreams/README.md`; all four files of the `RM-DH-003` package (frontmatter, headings, changelog entry pattern, decision heading pattern); `docs/roadmaps/rm-dh-002-core-operations-and-expansion/README.md` and `roadmap.md`; frontmatter versions of all `RM-DH-001` files; `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md` (frontmatter and complete heading structure).

**Machine-verified:** full-repository regex scan for `RM-DH-0\d\d`, `WS-DH-20\d\d-\d{4}`, `DEC-RM-DH-\d{3}-\d{3}`; complete file listing of `docs/roadmaps/` and `docs/workstreams/`; frontmatter `version:` extraction across all governance files.

**Inferred, not proven:** that no un-indexed draft of RM-DH-004 exists outside `docs/` under a name that does not contain the literal ID. The scan was repository-wide for the ID strings, so this residual risk is negligible.

**Inaccessible:** commit messages are uninformative — the last fifteen commits touching `docs/` are all titled `Changes`, so commit-message evidence for governance-commit patterns is **INACCESSIBLE FROM CURRENT LOVABLE CONTEXT**. Governance-commit patterns were reconstructed from the frontmatter `source:` fields instead, which are detailed and self-describing.

**Repository history sufficiency:** sufficient for identity, path, version and pattern verification. Insufficient for commit-message-based process verification.

**Canonical/default branch:** **not proven**. The working branch is `edit/edt-d17e7fe2-20e8-4f83-9cf5-a993097cc8f9` at HEAD `1efc5b7f5764d7eea6695a7b4c9f835bd77a93b3`. Prior governance frontmatter references `main` as the merge target, but this run cannot prove the default branch from the sandbox.

## C. Current Governance Pattern (proven)

**Roadmap package:** one folder per Roadmap under `docs/roadmaps/`, slug `rm-dh-00N-<kebab-case-title>`, containing exactly four files (`README.md`, `roadmap.md`, `decisions.md`, `changelog.md`). §11.3 forbids deferring `decisions.md` or `changelog.md`.

**File authority split (§11.3, confirmed by the three live packages):**
- `README.md` — stable identity, Arabic title, purpose, package navigation, governing decision link. Contains no dynamic status in RM-DH-001 and RM-DH-003; RM-DH-002's README does restate a `Verified identity` status block, which is a precedent for a static, non-progress identity contract only.
- `roadmap.md` — the single authoritative source of current state: status block, Phase register, stage table, dependencies, remaining work, stopping point, next permitted action.
- `decisions.md` — one `## DEC-RM-DH-00N-NNN` section per decision with `### Decision`, `### Rationale`, `### Rejected alternatives`.
- `changelog.md` — `## Entries` with `### <ISO timestamp> — <event>` subsections, newest at the bottom, append-oriented.

**Frontmatter:** every governance `.md` carries an HTML-comment block with `id`, `title`, `version`, `status`, `audience`, `date`, `last-verified`, `supersedes`, `superseded-by`, `source`, `source-sha256`. Document IDs follow `DHB-RM-00N-<PART>` and `DHB-WS-YYYY-NNNN`.

**Versioning:** semantic. New file = `1.0.0`. Index synchronization that only records another file's new version = patch (`docs/README.md` went 1.11.1 → 1.11.2 → 1.11.3 for exactly this). Adding a new registered row or a new rule = minor (`docs/README.md` 1.8.0 → 1.9.0 registered the whole governance layer; `CONVENTIONS.md` 1.1.0 → 1.2.0 added §11.10). Content restatement that changes recorded state = minor; defect correction that changes no state = patch. The `source:` field accumulates a semicolon-separated history of every version bump and is never truncated.

**Registry pattern:** `docs/roadmaps/README.md` is an eight-column index; `docs/workstreams/README.md` is a seven-column index whose schema is explicitly frozen (a `Next step` column was added once and reverted as defect D-02). §11.4: a registry summary never overrides a package file.

**Acceptance and Closure:** Execution → Acceptance Re-Audit → Acceptance Persistence → owner Closure → Closure Persistence, each recorded in `roadmap.md`, `workstream.md`, `changelog.md`, and synchronized into both registries and `docs/README.md`. Execution is never Acceptance (§11.5).

**`.lovable/plan.md`:** governed by §11.10 and `DEC-RM-DH-003-004`. Platform-generated, single-path exception, must be disclosed separately, excluded from intended-file counts, never treated as implementation or Acceptance evidence, and untracking must not be retried.

## D. ID and Path Collision Audit

| Check | Result | Evidence |
|---|---|---|
| `RM-DH-004` anywhere in the repository | **Absent — no collision** | Repository-wide scan returned only RM-DH-001/002/003 |
| Registered Roadmap IDs | `RM-DH-001`, `RM-DH-002`, `RM-DH-003` | `docs/roadmaps/README.md` registered table |
| `WS-DH-2026-0003` … `WS-DH-2026-0011` | **All absent — all available** | Scan returned only `WS-DH-2026-0001` and `WS-DH-2026-0002` |
| `WS-DH-2026-0001` | Referenced once inside `ws-dh-2026-0002-governance-foundation/workstream.md`; no package, not registered. Permitted gap per §11.5 | Scan + file listing |
| `DEC-RM-DH-004-*` | **Absent** | Only `DEC-RM-DH-003-001` … `-004` exist |
| Proposed folder `docs/roadmaps/rm-dh-004-financial-truth-historical-data-migration/` | **Does not exist; no collision.** Slug is convention-compliant (`rm-dh-00N-` + kebab-case). It is longer than all three precedents; `rm-dh-004-financial-truth-and-historical-migration` is a shorter, equally compliant alternative | Directory listing |
| Proposed filenames | Exactly match the mandated four-file set | §11.3 |
| Proposed document IDs `DHB-RM-004-README` / `-ROADMAP` / `-DECISIONS` / `-CHANGELOG` | **Absent — available**, and match the `DHB-RM-00N-*` precedent | `docs/README.md` registry |
| Proposed Workstream slug `ws-dh-2026-0003-economic-date-integrity` and document ID `DHB-WS-2026-0003` | **Absent — available**, matches the `ws-dh-YYYY-NNNN-<kebab-title>` / `DHB-WS-YYYY-NNNN` precedent | Directory listing |

## E. Exact File Allowlist and Denylist

### Allowlist (7 intended files)

| # | File path | Exists now? | Current version | Target version | Create/Modify | Exact sections | Content responsibility | Why required |
|---|---|---|---|---|---|---|---|---|
| 1 | `docs/roadmaps/rm-dh-004-financial-truth-historical-data-migration/README.md` | No | — | 1.0.0 | Create | frontmatter; title + Arabic title; Roadmap ID; Purpose; Package navigation; Ownership boundaries; Relationships | Stable identity and navigation only | §11.3 mandates it |
| 2 | `.../roadmap.md` | No | — | 1.0.0 | Create | frontmatter; Roadmap status block; Track register; Phase register; Workstream register; Dependency order; Phase 0 exit criteria; Current stopping point; Next permitted action | Sole authoritative dynamic state | §11.3 |
| 3 | `.../decisions.md` | No | — | 1.0.0 | Create | frontmatter; Decision ID numbering note; `## DEC-RM-DH-004-001` with `### Decision`, `### Rationale`, `### Rejected alternatives` | Owner creation decision and independence rationale | §11.3, §11.1 |
| 4 | `.../changelog.md` | No | — | 1.0.0 | Create | frontmatter; `## Entries`; one `### <timestamp> — Initial package creation` entry | Append-oriented chronology | §11.3 |
| 5 | `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/workstream.md` | No | — | 1.0.0 | Create | frontmatter; Identity; Scope; Exclusions; Evidence; Stage history; Current state; File plan; Validation plan; Rollback plan; Stopping point; Next permitted step | The only Workstream with real current state (Active, audit pending) | Mirrors the `WS-DH-2026-0002` precedent; the eight other Workstreams have no state to persist |
| 6 | `docs/roadmaps/README.md` | Yes | 1.0.1 | 1.1.0 | Modify | Registered Roadmaps table — append one `RM-DH-004` row | Index only | The registry becomes incomplete the moment RM-DH-004 exists |
| 7 | `docs/workstreams/README.md` | Yes | 1.2.2 | 1.3.0 | Modify | Registered Workstreams table — append one `WS-DH-2026-0003` row; correct the sentence "Only `WS-DH-2026-0002` is registered in this execution." | Index only | Same; the standalone sentence becomes false |
| 8 | `docs/README.md` | Yes | 1.11.3 | 1.12.0 | Modify | Governance registry table — append five rows (four RM-DH-004 files + `DHB-WS-2026-0003`); update the `DHB-RM-REGISTRY` and `DHB-WS-REGISTRY` version cells to 1.1.0 / 1.3.0 | Central document index | Every governance file is registered here; omission is a coverage defect |

Intended tracked file count: **8** (5 created, 3 modified). `.lovable/plan.md` is excluded from this count under §11.10.9.

### Denylist

| Path or category | Why excluded |
|---|---|
| `src/**` | Governance-only persistence; no application behavior changes |
| `supabase/**` (migrations, functions, tests) | No schema, data, RPC, or policy change is authorized |
| Application and database tests | Nothing testable changes |
| Live database objects | Out of scope for this Roadmap-creation run |
| `docs/CONVENTIONS.md` | No new stable rule is required; RM-DH-004 complies with existing §11 |
| `docs/roadmaps/rm-dh-001-*/**` | RM-DH-001's authoritative content does not become false; the handover relationship is stated one-way from RM-DH-004 |
| `docs/roadmaps/rm-dh-002-*/**` | RM-DH-004 is independent; touching RM-DH-002 would imply a parent/child relationship the owner rejected |
| `docs/roadmaps/rm-dh-003-*/**` | RM-DH-003 / Phase 2 is CLOSED; reopening a closed package to record an unrelated Roadmap is a governance violation |
| `docs/workstreams/ws-dh-2026-0002-*/**` | Closed Workstream |
| `docs/architecture/**`, `docs/handoff/**`, `docs/historical/**`, `docs/aml_1_b_1/**` | Accepted or historical evidence; §11.6 forbids silent correction |
| Workstream packages for WS-DH-2026-0004 … 0011 | No current state exists to persist truthfully (§11.7) |
| Project Knowledge, Workspace Knowledge, Skills | Not repository governance artifacts; separate authorization required |
| Project settings, publish settings, secrets | Out of scope |
| `.lovable/**` other than platform-generated `.lovable/plan.md` | §11.10.2 and §11.10.6 |

## F. Package and Content Allocation (verified)

The prompt's proposed responsibilities are **confirmed correct** against §11.3 and the three live packages, with these precisions:

**`README.md`** — frontmatter; `# RM-DH-004 — <English title>`; `**العنوان العربي:** <Arabic title>`; `**Roadmap ID:** RM-DH-004`; `## Purpose`; `## Package navigation` (four links); `## Ownership boundaries` (what RM-DH-004 owns and does not own); `## Relationships` (one paragraph each for RM-DH-002, RM-DH-003, RM-DH-001); `## Governing decision` (link to `DEC-RM-DH-004-001`). **Must not contain** current Phase, current Workstream, stopping point, or any progress value — those belong to `roadmap.md` alone.

**`roadmap.md`** — frontmatter; `# RM-DH-004 — Authoritative Current State`; Arabic subtitle; a one-line statement that this file is the single authoritative source of current state; `## Roadmap status` fenced `text` block (Roadmap ID, Status, Priority, Owner, Owner Approval timestamp, Current Phase, Current Workstream, Current Workstream Stage, Technical Environment); `## Track register` (4 rows); `## Phase register` (Phase 0 … Phase 8 with status); `## Workstream register` (9 rows: ID, title, Track, Phase, Status, dependency, package present yes/no); `## Dependency order`; `## Inside RM-DH-004 / Phase 0` stage table; `## Phase 0 exit criteria`; `## Remaining work in this Phase`; `## Current stopping point`; `## Next permitted action`. **Must not contain** decision rationale or chronology.

**`decisions.md`** — frontmatter; `## Decision ID numbering note` (state that numbering starts at `-001` with no alias, following the RM-DH-003 precedent of documenting numbering explicitly); `## DEC-RM-DH-004-001 — Creation of RM-DH-004 as an independent Roadmap` with `### Decision`, `### Rationale`, `### Rejected alternatives` (as a Phase of RM-DH-002; as a Track of RM-DH-002; as a Workstream under RM-DH-003). **Must not contain** current status or timestamps other than the owner-approval timestamp attached to the decision.

**`changelog.md`** — frontmatter; `# RM-DH-004 — Changelog`; Arabic subtitle; "Append-oriented chronological record. Newest entries are added at the bottom of the register."; `## Entries`; `### 2026-08-03T02:04:00+03:00 — Owner approval of RM-DH-004`; `### <execution timestamp> — Initial package creation`. **Must not contain** authoritative status.

**Workstream file `WS-DH-2026-0003`** — mirroring the proven `WS-DH-2026-0002` heading set: `## Identity`, `## Scope`, `## Exclusions`, `## Evidence`, `## Stage history`, `## Current state`, `## File plan`, `## Validation plan`, `## Rollback plan`, `## Final stopping point`, `## Next permitted step`. At creation, `## Evidence` and `## Stage history` carry only the registration event; no Acceptance section exists yet.

## G. Workstream Persistence Matrix

| WS ID | Title | Package required now? | Proposed slug | Proposed path | Initial version | Initial Stage | Initial Status | Roadmap | Phase | Dependency | Stopping point | Class | Truthfulness |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WS-DH-2026-0003 | Economic Date Integrity | **Yes** | `ws-dh-2026-0003-economic-date-integrity` | `docs/workstreams/ws-dh-2026-0003-economic-date-integrity/workstream.md` | 1.0.0 | Investigative Audit | ACTIVE — INVESTIGATIVE AUDIT PENDING | RM-DH-004 | Phase 1 | none | Registered and active; Investigative Audit not started | Active | Truthful — real current state exists |
| WS-DH-2026-0004 | Canonical Financial Write Authority | No | `ws-dh-2026-0004-canonical-financial-write-authority` | reserved | — | Not started | BLOCKED BY WS-DH-2026-0003 | RM-DH-004 | Phase 2 | WS-0003 | Not entered | Blocked | Package would prematurely create dynamic state |
| WS-DH-2026-0005 | POS Financial Isolation | No | `ws-dh-2026-0005-pos-financial-isolation` | reserved | — | Not started | DEFERRED — POS COMING SOON / DISABLED | RM-DH-004 | Phase 2 | deferred | Not entered | Deferred | Same |
| WS-DH-2026-0006 | Import Control Plane | No | `ws-dh-2026-0006-import-control-plane` | reserved | — | Not started | BLOCKED BY PHASES 1–2 | RM-DH-004 | Phase 3 | Phases 1–2 | Not entered | Blocked | Same |
| WS-DH-2026-0007 | Provenance, Idempotency & Selective Rollback | No | `ws-dh-2026-0007-provenance-idempotency-and-rollback` | reserved | — | Not started | BLOCKED BY WS-DH-2026-0006 | RM-DH-004 | Phase 4 | WS-0006 | Not entered | Blocked | Same |
| WS-DH-2026-0008 | Historical Financial Semantics | No | `ws-dh-2026-0008-historical-financial-semantics` | reserved | — | Not started | PLANNED — OWNER ALIGNMENT REQUIRED | RM-DH-004 | Phase 5 | owner alignment | Not entered | Planned | Same |
| WS-DH-2026-0009 | Historical Document Identity & Numbering | No | `ws-dh-2026-0009-historical-document-identity-and-numbering` | reserved | — | Not started | PLANNED — OWNER ALIGNMENT REQUIRED | RM-DH-004 | Phase 5 | owner alignment | Not entered | Planned | Same |
| WS-DH-2026-0010 | Client, Owner & Horse Matching Integrity | No | `ws-dh-2026-0010-client-owner-and-horse-matching-integrity` | reserved | — | Not started | BLOCKED BY CONTROL AND PROVENANCE LAYERS | RM-DH-004 | Phase 6 | WS-0006, WS-0007 | Not entered | Blocked | Same |
| WS-DH-2026-0011 | Laboratory Historical Import Safety Pilot | No | `ws-dh-2026-0011-laboratory-historical-import-safety-pilot` | reserved | — | Not started | PILOT — BLOCKED BY PHASES 1–6 | RM-DH-004 | Phase 7 | Phases 1–6 | Not entered | Pilot | Same |

**Registration vs package creation:** all nine are **registered** — named with ID, Track, Phase, status and dependency — inside `RM-DH-004/roadmap.md`. Only WS-DH-2026-0003 receives a **package** and a row in `docs/workstreams/README.md`. Activation, execution, Acceptance and Closure are all later, separate events. §11.5 note 6 explicitly permits registered-but-unpublished Workstreams, and `WS-DH-2026-0001` is the live precedent.

## H. Cross-Roadmap Relationship Plan

**RM-DH-004 ↔ RM-DH-002 (independence).** One paragraph in `RM-DH-004/README.md` under `## Relationships`: RM-DH-004 is an independent Roadmap, not a Phase, Track or Workstream of RM-DH-002. RM-DH-002 owns operational-domain workflows and current domain events; RM-DH-004 owns financial-truth stabilization, historical-import architecture, control, provenance, idempotency, reconciliation, rollback, historical financial semantics and historical-import Acceptance. Neither copies the other's current Phase, current Workstream, dynamic status, stopping point, Acceptance, Closure or next action. **No RM-DH-002 file is modified.** The reference is deliberately one-way to avoid a competing source of truth; RM-DH-002 is currently `PARTIALLY_RECOVERED` with no declared Current Phase, so it has no truthful place to record a dependency.

**RM-DH-004 ↔ RM-DH-003 (governance compliance).** One sentence in `RM-DH-004/README.md` stating that this package complies with `docs/CONVENTIONS.md` §11, authored under RM-DH-003, and a link to `../../CONVENTIONS.md`. **No RM-DH-003 file is modified** — Phase 2 is CLOSED, and RM-DH-003's own next permitted action is unrelated. Compliance is demonstrated by conformance, not by editing the governing Roadmap.

**RM-DH-004 ↔ RM-DH-001 (future handover).** One sentence in `RM-DH-004/README.md`: final accepted RM-DH-004 architecture, operating contracts, reconciliation evidence and migration runbooks will later become handover inputs under RM-DH-001. **No RM-DH-001 file is modified** — the handover has not occurred, so recording it in RM-DH-001 would violate §11.7.

**Reciprocity:** the central registries provide the reciprocal link. Both new Roadmap and Workstream rows point back at the packages, so navigation is complete without cross-editing closed or recovering packages.

## I. Version Matrix

| File | Current | Target | Increment | Reason |
|---|---|---|---|---|
| `rm-dh-004-.../README.md` | — | 1.0.0 | Initial | New file; precedent: every RM-DH-001/002/003 file created at 1.0.0 |
| `rm-dh-004-.../roadmap.md` | — | 1.0.0 | Initial | Same |
| `rm-dh-004-.../decisions.md` | — | 1.0.0 | Initial | Same |
| `rm-dh-004-.../changelog.md` | — | 1.0.0 | Initial | Same |
| `ws-dh-2026-0003-.../workstream.md` | — | 1.0.0 | Initial | Precedent: `DHB-WS-2026-0002` created at 1.0.0 |
| `docs/roadmaps/README.md` | 1.0.1 | 1.1.0 | Minor | A new registered Roadmap row is additive content, not a synchronization patch. Precedent: the 1.0.0 → 1.0.1 bump was a cell-synchronization patch; adding rows is a larger change |
| `docs/workstreams/README.md` | 1.2.2 | 1.3.0 | Minor | A new registered Workstream row plus correction of a now-false standalone sentence |
| `docs/README.md` | 1.11.3 | 1.12.0 | Minor | Five new registered rows. Precedent: 1.8.0 → 1.9.0 registered the governance layer as a minor bump, while pure synchronization passes (1.11.1, 1.11.2, 1.11.3) were patches |

### Pre-existing defects (disclosed, not absorbed)

- **PRE-DEF-01.** `docs/README.md` line 128, row `DHB-RM-003-DECISIONS`, coverage/status cell reads `Executed — awaiting Acceptance Re-Audit`, while `DHB-RM-003-ROADMAP`, `-CHANGELOG`, `DHB-WS-REGISTRY` and `DHB-WS-2026-0002` all read `Closed — owner Closure persisted` and RM-DH-003 / Phase 2 is CLOSED. This is a stale status cell predating RM-DH-004.
- **PRE-DEF-02.** `docs/README.md` rows for the four RM-DH-001 files and the four RM-DH-002 files read `Accepted — awaiting owner closure`, while the Closure that was subsequently persisted covered `RM-DH-003 / Phase 2` and `WS-DH-2026-0002` only. Whether those eight rows are stale or correct cannot be determined from the index alone.

Neither defect blocks truthful RM-DH-004 persistence: RM-DH-004 rows are appended, not merged into the affected cells. **Recommendation: do not correct them in the RM-DH-004 persistence run.** They belong to RM-DH-003's registry hygiene and would contaminate the RM-DH-004 allowlist and its no-change attestation. If the owner wants them fixed, that is a separate one-file patch.

## J. Existing Reference Reclassification

| Reference | Location | Classification | Required treatment |
|---|---|---|---|
| "Historical Recovery Required" / `PARTIALLY_RECOVERED` for RM-DH-002 | `docs/roadmaps/rm-dh-002-.../README.md`, `roadmap.md`, `decisions.md` | **Still correct — unrelated** | This is Roadmap-history recovery, not financial-data import. Distinct concept; do not cross-link, and do not let the shared word "historical" imply a relationship |
| `effective_date` and historical-finance discussion | `docs/handoff/rounds/round-01/round-01-raw-audit-output.md`, `round-01-developer-handoff.md` | **Historical only** | Accepted Round 1 evidence. §11.6 forbids silent correction. RM-DH-004 may cite it as an input by reference; no edit |
| `docs/aml_1_b_1/**` finance stage evidence | evidence tree | **Historical only** | Immutable raw evidence per §4. Cite, never edit |
| Round 5 commercial/monetization architecture | `docs/architecture/commercial-plans-entitlements-platform-billing-and-monetization.md` | **Unrelated** | Platform billing, not historical import |
| "Historical Financial Import", "322 migrations", "Opening Obligation", "Unapplied Customer Credit", "IDEA-DH-0008", "Prompt 04", "Full History" | **Not present in `docs/` governance documentation** | **Absent** | These concepts currently live only in prompt lineage and `.lovable/plan.md`. RM-DH-004 becomes their first repository home. Nothing to reclassify |

No existing governance reference is stale or contradictory with respect to RM-DH-004, and no existing file requires a cross-reference edit.

## K. Contradictions, Gaps and Owner Decisions

**Repository facts:** RM-DH-004 and WS-0003…0011 are unused; four-file package mandatory; registries are indexes; one Workstream package exists for one executed Workstream; `docs/README.md` at 1.11.3 registers every governance file; §11.10 governs `.lovable/plan.md`; PRE-DEF-01 and PRE-DEF-02 exist.

**Owner-approved contract:** Roadmap identity, titles, priority, owner, approval timestamp, Phase 0–8 structure, four Tracks, nine Workstreams, independence from RM-DH-002, Lovable-only environment. Accepted as given; no repository evidence contradicts any of it.

**Lovable claims (this run):** the recommended 8-file allowlist; the recommendation to create only one Workstream package; the minor/patch version classifications; the recommendation to exclude PRE-DEF-01 and PRE-DEF-02.

**Inferences:** that a new registry row warrants a minor rather than patch bump (reasoned from the 1.9.0 precedent, not stated as an explicit rule anywhere); that one-way relationship references are preferred (reasoned from §11.4 and from RM-DH-002's undeclared Current Phase).

**Unresolved gaps:** the canonical/default branch is not proven from the sandbox; commit-message evidence is unavailable.

**Owner decisions genuinely required before persistence:**
1. **Folder slug.** Confirm `rm-dh-004-financial-truth-historical-data-migration`, or approve the shorter `rm-dh-004-financial-truth-and-historical-migration`. Either is compliant.
2. **Workstream package scope.** Confirm the evidence-based recommendation of one package now (WS-DH-2026-0003) versus the alternative of nine packages immediately. Recommendation: one.
3. **Pre-existing defects.** Confirm that PRE-DEF-01 and PRE-DEF-02 stay out of the RM-DH-004 run.

No other owner decision is outstanding. Implementation details do not generate decisions.

## L. Proposed Agent/Build Execution Contract

1. **Allowed paths:** the eight files in Section E, and nothing else.
2. **Prohibited paths:** everything in the Section E denylist. Explicitly: `src/**`, `supabase/**`, `docs/CONVENTIONS.md`, all RM-DH-001/002/003 files, `ws-dh-2026-0002-*`, `docs/architecture/**`, `docs/handoff/**`, `docs/historical/**`, `docs/aml_1_b_1/**`, Knowledge, Skills, settings, database.
3. **Versions:** five files created at 1.0.0; `docs/roadmaps/README.md` 1.0.1 → 1.1.0; `docs/workstreams/README.md` 1.2.2 → 1.3.0; `docs/README.md` 1.11.3 → 1.12.0.
4. **New files (5):** the four RM-DH-004 package files and `ws-dh-2026-0003-economic-date-integrity/workstream.md`.
5. **Modified files (3):** the two registries and `docs/README.md`.
6. **Status values, verbatim:** Roadmap Status `ACTIVE — PHASE 0`; Priority `P0 — CONTROLLING FINANCE PRIORITY`; Current Phase `RM-DH-004 / Phase 0 — Governance, Baseline & Execution Contract`; Current Workstream `WS-DH-2026-0003 — Economic Date Integrity`; Current Workstream Stage `INVESTIGATIVE AUDIT PENDING`; Phase 0 `ACTIVE`; Phase 1 `Not entered`; Phases 2, 3, 4, 6 `Blocked`; Phase 5 `Owner Alignment required`; Phase 7 `Pilot — blocked`; Phase 8 `Not started`; the nine Workstream statuses exactly as listed in Section G.
7. **Relationship wording:** three short paragraphs in `RM-DH-004/README.md` only, per Section H. No reciprocal edit in any other Roadmap.
8. **Workstream records:** all nine registered in `RM-DH-004/roadmap.md`; only WS-DH-2026-0003 gets a package and a `docs/workstreams/README.md` row; the seven-column registry schema is not altered.
9. **Required Git checks:** capture branch, HEAD, `git status --porcelain`, staged/unstaged/untracked before and after; after execution run `git diff --name-only` against the pre-run HEAD and assert the changed set equals the eight allowlisted paths plus, separately disclosed, `.lovable/plan.md`.
10. **No-change attestations:** zero application changes; zero database changes; zero migration changes; zero `docs/CONVENTIONS.md` changes; zero RM-DH-001/002/003 changes; zero Knowledge, Skill, and settings changes; no Phase advanced; no Acceptance; no Closure.
11. **Rollback:** per Section M.
12. **Build/typecheck:** not required — no code path changes. State this explicitly rather than running and citing a green build as evidence.
13. **Documentation validation:** frontmatter present and complete on all five new files; document IDs unique; all intra-package links resolve; registry rows match file frontmatter versions exactly; no dynamic status outside `roadmap.md` and `workstream.md`; Arabic titles present; timestamps in `Asia/Riyadh — UTC+03:00` with Latin digits.
14. **Final report structure:** intended file table with per-file before/after version; Git evidence; separate `.lovable/plan.md` disclosure; the eleven no-change attestations; exact stopping point; recommended next step.
15. **Exact stopping point:** `RM-DH-004 / Phase 0 — governance package persisted; Acceptance Re-Audit not performed; Phase 0 not advanced.`

## M. Rollback and Recovery Plan

- **New files:** delete the `rm-dh-004-financial-truth-historical-data-migration/` folder and the `ws-dh-2026-0003-economic-date-integrity/` folder. No other artifact references them until the registry rows exist, so deletion is complete and self-contained.
- **Modified indexes:** each change is a pure append plus a frontmatter version bump (plus one sentence correction in `docs/workstreams/README.md`). Restore by reverting to the pre-run HEAD copy of the three files, which is recoverable from Git regardless of commit granularity.
- **Version mismatch detection:** compare each registry row's version cell against the target file's frontmatter `version:`. Any disagreement is an acceptance-blocking defect per §11.7.
- **Unintended files:** `git diff --name-only <pre-run HEAD>..HEAD` minus the eight allowlisted paths must be empty except `.lovable/plan.md`.
- **Separating intent from platform noise:** `.lovable/plan.md` is disclosed in its own report line, excluded from the intended-file count, and retained in full Git evidence, per §11.10.9.
- **Commit structure:** the platform auto-commits; a dedicated content commit and a separate run-closing commit are the RM-DH-003 precedent and are **recommended but not achievable deterministically** in this environment. The report must therefore state the actual commit chronology observed rather than assert a planned one.
- **Evidence required before Acceptance Re-Audit:** pre-run and post-run HEAD; pre-run and post-run `git status --porcelain`; the complete changed-path list; the eight-file version table; the `.lovable/plan.md` disclosure.

## N. Acceptance Re-Audit Plan (read-only, follows execution)

1. All eight intended paths exist with the expected content shape.
2. `git diff --name-only` against the pre-execution HEAD equals the eight paths, plus `.lovable/plan.md` disclosed separately.
3. `RM-DH-004`, `WS-DH-2026-0003`, `DEC-RM-DH-004-001`, `DHB-RM-004-*` and `DHB-WS-2026-0003` each resolve to exactly one defining location.
4. Both registries contain exactly one new row each, and `docs/README.md` contains exactly five new rows.
5. Every registry version cell equals the corresponding file's frontmatter `version:`.
6. Relationship links resolve, are non-duplicative, and no dynamic state is copied between Roadmaps.
7. No RM-DH-002 file changed; RM-DH-004 declares itself independent.
8. No RM-DH-003 file changed and `docs/CONVENTIONS.md` is byte-identical.
9. Dynamic state appears only in `RM-DH-004/roadmap.md` and the WS-0003 `workstream.md`.
10. All nine Workstreams appear in `RM-DH-004/roadmap.md` with the exact approved statuses.
11. WS-DH-2026-0003 is `ACTIVE — INVESTIGATIVE AUDIT PENDING` with no execution, QA, or Acceptance content.
12. Phase 0 is still `ACTIVE`; no Phase advanced.
13. No file claims Acceptance or Closure for RM-DH-004.
14. No `src/**`, `supabase/**`, migration, Knowledge, Skill or settings change.
15. Git evidence chain is complete and internally consistent.
16. `.lovable/plan.md` disclosed separately if the platform changed it.

## O. WORKSTREAM PERSISTENCE

WORKSTREAM PERSISTENCE: NONE — PLANNING ONLY

## P. ROADMAP IMPACT

ROADMAP IMPACT:
RM-DH-004 remains ACTIVE — PHASE 0.
No Roadmap file was created or modified.
No Phase was advanced.
No Acceptance or Closure occurred.

## RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan/Chat — Read-Only.
2. Operation: Governance Persistence Planning Audit.
3. Prompt ID: PROMPT-DH-RM004-P0-GOVERNANCE-PERSISTENCE-PLANNING-AUDIT-01.
4. Prompt status received: UNSENT DRAFT — NUMBER NOT YET CONSUMED.
5. Prompt Preparation Date: 03-08-2026.
6. Prompt Preparation Time: 02:19.
7. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
8. Run Start Date and Time: 2026-08-03, approximately 01:02 (Asia/Riyadh) — exact second not recorded.
9. First evidenced activity: `git rev-parse` / repository governance file listing.
10. Run End Date and Time: 2026-08-03, approximately 01:12 (Asia/Riyadh) — exact second not recorded.
11. Last evidenced activity: read of `docs/README.md` governance registry rows 117–131.
12. Final Report Date and Time: 2026-08-03, approximately 01:13 (Asia/Riyadh) — exact second not recorded.
13. Timestamp evidence source: session clock only; no Git author/committer timestamp was captured for this run.
14. Branch: `edit/edt-d17e7fe2-20e8-4f83-9cf5-a993097cc8f9`.
15. Canonical/default branch evidence: **not proven from this environment**. Prior governance frontmatter references `main` as the merge target; this run did not verify it.
16. HEAD before: `1efc5b7f5764d7eea6695a7b4c9f835bd77a93b3`.
17. HEAD after: unchanged at inspection time; any subsequent commit is platform-generated.
18. Working Tree before: clean — `git status --porcelain` returned no output.
19. Working Tree after: modified only by the platform-generated `.lovable/plan.md`.
20. Staged paths before: none. After: none observed.
21. Unstaged paths before: none. After: `.lovable/plan.md` (platform-generated).
22. Untracked non-ignored paths before: none. After: none.
23. Repository paths read: `docs/CONVENTIONS.md`; `docs/README.md`; `docs/roadmaps/README.md`; `docs/workstreams/README.md`; all four `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/*` files; `docs/roadmaps/rm-dh-002-core-operations-and-expansion/README.md` and `roadmap.md`; frontmatter of all four `docs/roadmaps/rm-dh-001-documentation-and-developer-handover/*` files; `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md`; plus repository-wide ID and term scans.
24. Database queries executed: **none**.
25. Intended repository changes: **zero**.
26. Application changes: **zero**.
27. Database changes: **zero**.
28. Migration changes: **zero**.
29. Project Knowledge changes: **zero**.
30. Workspace Knowledge changes: **zero**.
31. Skill changes: **zero**.
32. Settings changes: **zero**.
33. Platform-generated `.lovable/plan.md` disclosure: this planning report was written to `.lovable/plan.md` by Lovable Plan Mode. Under `docs/CONVENTIONS.md` §11.10 and `DEC-RM-DH-003-004` it is disclosed separately, excluded from the intended-file count of zero, is not implementation, is not Acceptance evidence, and is not proof that other paths remained unchanged.
34. Workstream persistence: none.
35. Roadmap persistence: none.
36. Acceptance: none.
37. Closure: none.
38. Exact stopping point: planning-audit report delivered. No governance file created or modified; Phase 0 not advanced; WS-DH-2026-0003 not activated; the Economic Date Mini Audit not begun.
39. Recommended next step: proceed to an owner-reviewed Agent/Build governance-persistence prompt implementing the Section L contract, after the owner confirms the three items in Section K.
40. Recommended next Mode: Agent/Build.
