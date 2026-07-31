<!--
id: DHB-RM-003-CHANGELOG
title: RM-DH-003 — Roadmap & Workstream Governance Foundation (changelog)
version: 1.2.0
status: current
audience: internal
date: 2026-07-30
last-verified: 2026-07-31
supersedes: []
superseded-by: null
source: authored during RM-DH-003 / Phase 2 — Governance Foundation Execution (WS-DH-2026-0002); v1.1.0 — appends the Acceptance-Persistence entry during RM-DH-003 / Phase 2 — Acceptance-Persistence at 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00); v1.1.1 — corrects defect D-01 during RM-DH-003 / Phase 2 — Persistence Correction: the Acceptance-Persistence execution timestamp is restated from the inaccurate value to the Git-evidenced authoritative completion timestamp 2026-07-30T23:35:55+03:00 (Asia/Riyadh — UTC+03:00). The Acceptance Re-Audit timestamp 2026-07-30T21:41:00+03:00 is unchanged; v1.1.2 — corrects finding PV-DEF-03 during RM-DH-003 / Phase 2 — Timestamp Semantics Correction: the Acceptance-Persistence entry now distinguishes the last content-write commit e8e4a9f91 at 2026-07-30T23:35:03+03:00 from the run-closing empty commit 71556af2e at 2026-07-30T23:35:55+03:00. No Decision ID, status, Acceptance, QA, or closure state was changed; v1.2.0 — appends the Planning-Artifact Governance Exception Documentation Correction entry during RM-DH-003 / Phase 2 under approved Decision DEC-RM-DH-003-004. Prior entries are preserved append-only and unchanged.
source-sha256: n/a
-->

# RM-DH-003 — Changelog

**العنوان العربي:** سجل تغييرات تأسيس حوكمة خرائط العمل ومسارات العمل

Append-oriented chronological record. Newest entries are added at the bottom of the register.

## Entries

### 2026-07-30T20:19:00+03:00 — Decision D-01 approved

- `DEC-RM-DH-003-001` (alias D-01) approved: four-file Roadmap package from creation.

### 2026-07-30T20:45:00+03:00 — Decision D-02 approved

- `DEC-RM-DH-003-002` (alias D-02) approved: `RM-DH-002` represented now as `Active` + `PARTIALLY_RECOVERED` + Historical Recovery Required.

### 2026-07-30T20:54:00+03:00 — Decision D-04 approved

- `DEC-RM-DH-003-003` (alias D-04) approved: repository-wide governance rules added to `docs/CONVENTIONS.md`, raising it to 1.1.0.

### 2026-07-30T21:16:54+03:00 — Initial package creation and governance foundation execution

- This timestamp is the **actual time of the repository execution run**.
- Roadmap package created: `README.md`, `roadmap.md`, `decisions.md`, `changelog.md`.
- Central Roadmap registry and central Workstream registry created.
- `RM-DH-001` and `RM-DH-002` packages created.
- `WS-DH-2026-0002` workstream file created.
- `docs/README.md` raised to 1.9.0 and `docs/CONVENTIONS.md` raised to 1.1.0.
- Phase state recorded: Phase 0 Completed, Phase 1 Completed, Phase 2 Current.
- Acceptance Re-Audit is pending. Closure is not permitted.

### 2026-07-30T23:35:55+03:00 — Acceptance persisted (acceptance recording only)

This heading is the **run-closing completion timestamp** of the Acceptance-Persistence run. It is not the time at which the final file content was written.

- **Persistence content-write run:** 2026-07-30T23:33:21–23:35:03+03:00.
- **Persistence commit sequence (content writes):** `1161817f6`, `1d5fd715b`, `653ab83fa`, `2eb046ac0`, `89e851d38`, `e8e4a9f91`.
- **Last content-write commit:** `e8e4a9f91` — 2026-07-30T23:35:03+03:00.
- **Run-closing commit:** `71556af2e` — 2026-07-30T23:35:55+03:00. Empty commit: no file changes.
- **Authoritative run-completion timestamp:** 2026-07-30T23:35:55+03:00 (run-closing, per the commit above).
- **Acceptance audit timestamp:** 2026-07-30T21:41:00+03:00 — the time of the preceding independent read-only Acceptance Re-Audit. The two timestamps are distinct events and are not interchangeable.
- **Correction note (defect D-01):** the previously persisted value 2026-07-30T21:47:00+03:00 was inaccurate and was corrected using the verified Git author/committer evidence for the Acceptance-Persistence write sequence. That value is quoted here only as a historical record of the corrected error and is no longer an active timestamp field.
- **Correction note (finding PV-DEF-03):** 2026-07-30T23:35:55+03:00 remains the run-completion timestamp, but it belongs to the empty run-closing commit `71556af2e`; the last content-writing commit was `e8e4a9f91` at 2026-07-30T23:35:03+03:00. The previous wording blurred these two events by describing 23:35:55 as the completion time of the file write, and has been corrected against Git author/committer evidence.
- Acceptance Verdict: **Passed** — `ACCEPTED — READY FOR OWNER CLOSURE AND ACCEPTANCE-PERSISTENCE DECISION`.
- Execution Commit Range: `6395524d..458931b2`.
- Execution Change Set: 15 added / 2 modified / 0 deleted / 0 renamed.
- Persistence Decision: **Acceptance recorded only.** No closure action was taken.
- Owner Closure Decision: **Not issued.**
- Workstream Status: `EXECUTED_AWAITING_REAUDIT` → `ACCEPTED_AWAITING_OWNER_CLOSURE`.
- `RM-DH-003` remains `Active`; `RM-DH-003 / Phase 2` remains open.
- QA remains `Pending`; the Acceptance Re-Audit did not evidence a completed QA stage, so none was recorded.
- Files modified in this persistence run: `workstream.md`, this Roadmap's `roadmap.md` and `changelog.md`, `docs/README.md` (1.9.0 → 1.10.0), and `docs/workstreams/README.md` (1.0.0 → 1.1.0).
- `docs/CONVENTIONS.md`, the `RM-DH-001` package, and the `RM-DH-002` package were not modified.

### 2026-07-31 — Planning-artifact governance exception documentation correction

Chronology of this correction, distinguishing each event class. Raw Git offsets are preserved as recorded by Git.

- **External correction content commit:** `9fb0b56998b3f0a9887bf87e835d40a776552213` — author time 2026-07-31T05:04:27+03:00. Added the narrow `.gitignore` rule for `.lovable/plan.md` and removed the file from Git tracking.
- **Pull-request merge commit:** `06467d6cc7a2d689094e6874600bcee8d821004a` — author time 2026-07-31T05:38:59+03:00. Merged the external correction into `main`.
- **First behavioral-smoke platform commit:** `64ab74ab609ecf46e45157a7c6ab6303eb741d2d` — author time 2026-07-31T02:47:36+00:00. Standalone one-file commit; the platform recreated and force-added `.lovable/plan.md` despite the ignore rule.
- **Later platform-generated planning commits:** `b6cabc4e8161efa47638ed102fad43e4b2ef6079` — 2026-07-31T02:48:15+00:00 (merge, "Update plan"); `92226e1065d50959f0ce01e41ad4b2cf8118d03b` — 2026-07-31T04:14:12+00:00 (one-file `.lovable/plan.md`); `ebec2b3e92e1ef52dc8fb7b243bcea1c2b33a88e` — 2026-07-31T04:14:21+00:00 (merge, "Update plan").
- **Conclusion recorded:** the external untracking was technically valid but is not behaviorally sustainable in the current Lovable environment. This is an evidence-based inference from repeated observation, not a vendor guarantee.
- **Owner decision:** `DEC-RM-DH-003-004` approved — narrow `.lovable/plan.md` platform-artifact governance exception, covering that single path only. It has no alias and is not the historical label `D-04`.
- **This execution's documentation content commits:** `ebec2b3e..43e98e957` at the time this entry was written, comprising 16 one-file content commits across the seven intended tracked files. Author times are recorded by Git in `+00:00`; the `+03:00` equivalents are given below.
- **First documentation content write:** `c14216f90` — 2026-07-31T05:19:52+00:00, equivalent to 2026-07-31T08:19:52+03:00 (`docs/CONVENTIONS.md` §11.10).
- **Last documentation content write observed while authoring this entry:** `43e98e957` — 2026-07-31T05:24:31+00:00, equivalent to 2026-07-31T08:24:31+03:00 (`docs/README.md`). The writes that finalize this changelog entry necessarily follow that commit and are therefore not self-reported here; the Acceptance Re-Audit must read the authoritative final chronology directly from Git.
- **Separate platform-generated `.lovable/plan.md` commits during this run:** none observed in `ebec2b3e..43e98e957`. Any such commit created later by the platform is disclosed under `docs/CONVENTIONS.md` §11.10 and is excluded from the seven-file intended count while remaining in complete Git evidence.
- **Run-closing commit:** not applicable at authoring time; no empty run-closing commit was created by this execution. A run-closing commit, if produced by the platform, is not a content write.
- **Externally verified final chronology of the preceding seven-file execution (added in v1.2.1):** the two bullets above were written before the finalizing writes existed and could not name them. Read-only Git verification has since completed that chronology. Final changelog-persistence commit of the preceding seven-file execution: `0991f8d2cf79e55824d5f698d532b642bc2963d8` — raw Git `2026-07-31T05:24:55+00:00`, equivalent to 31-07-2026 — July, 08:24 (Asia/Riyadh — UTC+03:00). Final HEAD of the preceding seven-file execution: `90f9447814c99c863eae44e3cb09a33c39784f32` — raw Git `2026-07-31T05:25:09+00:00`, equivalent to 31-07-2026 — July, 08:25 (Asia/Riyadh — UTC+03:00). Verified preceding execution range: `ebec2b3e9..90f944781`. The working tree was clean at the verified end of that preceding execution, no empty run-closing commit was found, and no platform-generated `.lovable/plan.md` commit was observed in that range.
- **Self-reference rule (v1.2.1):** this v1.2.1 correction is itself persisted by one or more later commits. Their hashes cannot be recorded inside this content before those commits exist. The EV-DEF-01 persistence commits belong in the EV-DEF-01 Execution Report and in the subsequent Acceptance Re-Audit evidence, and no additional commit is to be created merely so that this changelog can self-record its own final persistence hash.
- **Files changed by this correction (7 intended tracked files):** `docs/CONVENTIONS.md` (1.1.0 → 1.2.0, §11.10 added), this Roadmap's `decisions.md` (1.0.0 → 1.1.0), `roadmap.md` (1.1.2 → 1.2.0) and `changelog.md` (1.1.2 → 1.2.0), `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md` (1.1.2 → 1.2.0), `docs/README.md` (1.10.2 → 1.11.0), and `docs/workstreams/README.md` (1.1.2 → 1.2.0). `docs/roadmaps/README.md` was not modified.
- **Newly disclosed pre-existing defect:** several `docs/README.md` governance rows still displayed version `1.0.0` for files that had since reached `1.1.x`, and the `DHB-WS-2026-0002` row still carried the stale coverage text `EXECUTED_AWAITING_REAUDIT` while the Status column read `Accepted — awaiting owner closure`. These rows were corrected in this pass and are disclosed as a pre-existing index staleness defect, not as incidental cleanup.
- **Status effect:** Workstream status `ACCEPTED_AWAITING_OWNER_CLOSURE` → `EXECUTED_AWAITING_REAUDIT` for this new correction. The earlier baseline Acceptance of 2026-07-30T21:41:00+03:00 is preserved as historical evidence and is not invalidated. QA remains `Pending`. Owner closure remains **not approved**. `RM-DH-003 / Phase 2` did not advance.

### Note on earlier Phase events

No timestamp is recorded for `RM-DH-003 / Phase 0` or `RM-DH-003 / Phase 1` events. Exact time not recorded for those historical events in this repository, and none has been invented.

Timezone for all entries: Asia/Riyadh — UTC+03:00.
