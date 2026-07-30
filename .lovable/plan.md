# RM-DH-003 / Phase 2 — Timestamp Semantics Correction Pass (D-03 + D-04)

Targeted re-verification returned `CORRECTION RE-VERIFICATION FAILED — FURTHER CORRECTION REQUIRED`. This plan applies only the two owner-approved corrections D-03 and D-04. No closure, no new Roadmap, Phase, Workstream, or Decision ID. No application, SQL, migration, or `.lovable` change in this pass.

## Verified Git facts driving the correction

- Persistence content writes: `1161817f6` `23:33:21` → `e8e4a9f91` `23:35:03` (+03:00, 2026-07-30).
- `71556af2e` at `23:35:55+03:00` is verified **empty** (no changed paths) — it is the run-closing commit, not a file write.
- Correction Pass content commits: `018cf0445` `2026-07-31T00:00:35` → `a9bfeb6aa` `00:01:45`; run-closing empty commit `db97e5c65` `00:03:03` (+03:00).
- `docs/README.md` currently dates the Correction Pass `2026-07-30T23:54:00+03:00` — unsupported and on the wrong calendar date.
- Acceptance Re-Audit timestamp `2026-07-30T21:41:00+03:00` is corroborated and stays unchanged.

## D-03 — Persistence timestamp semantics

`docs/roadmaps/rm-dh-003-.../changelog.md` (version 1.1.1 → 1.1.2), Acceptance-Persistence entry:

- Replace the misleading bullet `Persistence execution timestamp: 23:35:55 — the ... completion time of this write` with two distinct, correctly labelled facts:
  - `Last content-write commit: 2026-07-30T23:35:03+03:00 (e8e4a9f91)`
  - `Run-closing completion commit: 2026-07-30T23:35:55+03:00 (71556af2e — empty commit, no file changes)`
- Keep `Persistence Git run: 23:33:21–23:35:55+03:00` and the six-commit content sequence, adding a clause noting the sequence ends at `23:35:03` and that `23:35:55` belongs to the trailing empty commit.
- Keep `23:35:55` as the authoritative run-completion timestamp, now explicitly described as run-closing rather than a file write.
- Extend the existing D-01 correction note with a D-03 clause recording this semantic correction. The `21:47` historical quotation and the `21:41` acceptance bullet stay as they are.
- The entry heading `### 2026-07-30T23:35:55+03:00` stays (it is the run-completion timestamp).

Provenance-only semantic alignment in the three files that quote the persistence timestamp — each gains a short `v1.1.2` clause stating that `23:35:55` is the run-closing completion and `23:35:03` the last content write, with no other content change:

- `docs/roadmaps/rm-dh-003-.../roadmap.md` — 1.1.1 → 1.1.2
- `docs/workstreams/ws-dh-2026-0002-.../workstream.md` — 1.1.1 → 1.1.2
- `docs/workstreams/README.md` — 1.1.1 → 1.1.2

## D-04 — Correction-Pass timestamp

`docs/README.md` (1.10.1 → 1.10.2):

- Correct the `v1.10.1` clause: the Correction Pass ran `2026-07-31T00:00:35–00:01:45+03:00`, run-closing `00:03:03+03:00`, not `2026-07-30T23:54:00+03:00`.
- Apply the same content-write vs run-closing distinction to the `v1.10.0` persistence clause.
- Add a `v1.10.2` clause recording defects D-03 and D-04 and their correction against Git author/committer evidence.
- The 15 governance rows, Owner Approval values, accepted Rounds 1–5 rows, and table structure are untouched.

## Untouched

`docs/CONVENTIONS.md`, `docs/roadmaps/README.md`, the `RM-DH-001` and `RM-DH-002` packages, all accepted Rounds 1–5, `src/**`, `supabase/**`. The 7-column Workstream registry table stays exactly as reverted under D-02. QA remains `Pending`. Status remains `ACCEPTED_AWAITING_OWNER_CLOSURE`. Owner closure remains not approved. Pre-existing EOF blank lines stay as they are.

## Deferred — separate owner-approved pass

Excluding `.lovable/plan.md` from version control is **not** part of this pass. It requires its own owner-approved correction, preceded by an audit of `.lovable/` contents and repository dependencies. The whole `.lovable/` directory is not to be ignored or untracked. Plan Mode and Chat Mode remain read-only for tracked repository files.

## After the pass

Exactly 5 modified files, 0 added, 0 deleted, 0 renamed. Next permitted step is a targeted read-only re-verification of the corrected timestamp semantics, then the owner's explicit closure decision on `RM-DH-003 / Phase 2` and `WS-DH-2026-0002`.
