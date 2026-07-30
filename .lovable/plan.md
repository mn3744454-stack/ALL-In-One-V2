# RM-DH-003 / Phase 2 — Persistence Correction Pass (D-01 + D-02 revert)

Read-only verification returned `PERSISTENCE VERIFICATION FAILED — CORRECTION REQUIRED`. This plan applies the two owner-approved corrections and nothing else. No closure, no new Roadmap, Phase, Workstream, or Decision ID. No application, SQL, migration, or `.lovable` deletion.

## Verified facts driving the correction

- Persistence writes actually landed in Git at `2026-07-30 20:33:21–20:35:55 +0000` = `23:33:21–23:35:55 +03:00` (commits `1161817f6`, `1d5fd715b`, `653ab83fa`, `2eb046ac0`, `89e851d38`, `e8e4a9f91`).
- The value `2026-07-30T21:47:00+03:00` written into four files is false, and `changelog.md` asserts it is "the actual time of this write".
- The acceptance-audit timestamp `2026-07-30T21:41:00+03:00` is corroborated and stays unchanged.
- `docs/workstreams/README.md` gained an unauthorized `Next step` column (7 to 8 columns).

## D-01 — Timestamp correction

Replace the persistence timestamp with the Git-evidenced authoritative value `2026-07-30T23:35:55+03:00` (the last persistence write; the run is `23:33:21–23:35:55`). Five occurrences:

1. `docs/roadmaps/rm-dh-003-.../changelog.md`
   - `source:` line, entry heading `### 2026-07-30T21:47:00+03:00 ...`, and the `Persistence execution timestamp` bullet.
   - The bullet gains the Git evidence: run `23:33:21–23:35:55+03:00`, commit range `1161817f6..e8e4a9f91`.
   - Append a short correction note inside the same entry recording that the originally written `21:47` value was inaccurate and was corrected against Git author timestamps. No prior entry is rewritten; the acceptance-audit bullet keeps `21:41`.
   - Version 1.1.0 to 1.1.1.
2. `docs/roadmaps/rm-dh-003-.../roadmap.md` — `source:` line timestamp; version 1.1.0 to 1.1.1.
3. `docs/workstreams/ws-dh-2026-0002-.../workstream.md` — `source:` line timestamp; version 1.1.0 to 1.1.1.
4. `docs/README.md` — the `v1.10.0 — 2026-07-30T21:47:00+03:00` provenance timestamp; version 1.10.0 to 1.10.1, with a `v1.10.1` provenance clause naming the correction.

## D-02 — Revert the `Next step` column

`docs/workstreams/README.md`:

- Restore the 7-column table (`Workstream ID | English title | Arabic title | Primary Roadmap | Stage | Status | File`) — header, separator, and the single `WS-DH-2026-0002` row.
- Keep the corrected status content: Stage `Acceptance Re-Audit complete`, Status `ACCEPTED_AWAITING_OWNER_CLOSURE`. Only the extra column is removed.
- `source:` line: correct the persistence timestamp and note the column revert. Version 1.1.0 to 1.1.1.
- The next-step text is not lost — it remains authoritative in `workstream.md`, which is where it belongs under the index-only registry rule.

## Untouched

`docs/CONVENTIONS.md`, `docs/roadmaps/README.md`, the `RM-DH-001` and `RM-DH-002` packages, `.lovable/plan.md` content history, all accepted Rounds 1–5, `src/**`, `supabase/**`. Pre-existing EOF blank lines stay as they are. QA remains `Pending`. Owner closure remains not approved.

## After the pass

Exactly 5 modified files. Next permitted step is a targeted re-verification of the corrected timestamp and registry table, then the owner's explicit closure decision on `RM-DH-003 / Phase 2` and `WS-DH-2026-0002`.
