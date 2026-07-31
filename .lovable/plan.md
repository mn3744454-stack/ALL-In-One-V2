# RM-DH-003 / Phase 2 — EV-DEF-01 Narrow Changelog Correction

**Roadmap:** RM-DH-003 · **Workstream:** WS-DH-2026-0002 · **Decision:** DEC-RM-DH-003-004
**Scope:** exactly one tracked file.

## Defect being corrected

The persisted changelog entry (2026-07-31 — Planning-artifact governance exception documentation correction) states the run comprised "16 one-file content commits". The commit count 16 is correct, but commit `faaa527f8` changed two files (`roadmap.md` and `workstream.md`), so the "one-file" qualifier is false.

No status, version, scope, Acceptance, QA, or closure value is affected.

## Allowlist (1 file)

| File | Version | Change |
|---|---|---|
| `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md` | 1.2.0 → 1.2.1 | wording correction + externally verified final chronology |

Nothing else is touched: no `docs/README.md`, no registries, no `CONVENTIONS.md`, no `decisions.md`, no `roadmap.md`, no `workstream.md`, no `.gitignore`, no `src/**`, no `supabase/**`.

## Edits

1. **Front-matter**
   - `version: 1.2.0` → `1.2.1`
   - `last-verified: 2026-07-31` (unchanged value, re-affirmed)
   - Append to `source:`: `v1.2.1 — corrects finding EV-DEF-01 during RM-DH-003 / Phase 2: the execution commit description is restated as 16 content commits, of which 15 changed one file and one (faaa527f8) changed two files, and the externally verified final chronology is recorded. No Decision ID, status, QA, Acceptance, or closure state was changed.`

2. **Correct the commit-count bullet** in the existing entry, replacing "16 one-file content commits" with the accurate statement: 16 content commits — 15 single-file and one (`faaa527f8`, 2026-07-31T05:22:35+00:00 / 08:22:35+03:00) changing both `roadmap.md` and `workstream.md`.

3. **Append the externally verified final chronology** to the same entry (append-only; the earlier "not self-reported" wording is preserved as historical text and annotated as now completed externally):
   - Final changelog-persistence commit: `0991f8d2cf79e55824d5f698d532b642bc2963d8` — 2026-07-31T05:24:55+00:00 = 08:24:55+03:00.
   - Final execution HEAD: merge `90f9447814c99c863eae44e3cb09a33c39784f32` — 05:25:09+00:00 = 08:25:09+03:00.
   - Verified execution range: `ebec2b3e9..90f944781`; working tree clean; no empty run-closing commit.
   - Platform-generated `.lovable/plan.md` commits in that range: none observed.
   - Correction note: this v1.2.1 pass itself is persisted by later commits whose hashes cannot be self-recorded; that final chronology belongs to the execution report and the Acceptance Re-Audit, per the accepted self-reference rule.

## State after execution

- Workstream status remains `EXECUTED_AWAITING_REAUDIT`.
- QA remains `Pending`. Baseline Acceptance remains historical evidence.
- Owner closure remains not approved; no Phase advance.
- Next permitted step: targeted read-only Acceptance Re-Audit of the seven-file correction plus this v1.2.1 changelog correction.

## Technical notes

- Timestamps are recorded raw from Git in `+00:00` with the `+03:00` (Asia/Riyadh) equivalent alongside, matching the existing entry convention.
- Edits are additive/wording-only; no prior entry is deleted or rewritten beyond the single false qualifier.
