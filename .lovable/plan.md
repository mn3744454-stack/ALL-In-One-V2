# RM-DH-003 / Phase 2 — `.lovable/plan.md` Governance Correction Pass

Owner decision: Option 1 — untrack and ignore `.lovable/plan.md` only. This pass implements exactly that. No closure, no new Roadmap, Phase, Workstream, or Decision ID. No SQL, migration, application, or `docs/` content change.

## Verified audit facts driving the correction

- `.lovable/` contains exactly one file: `.lovable/plan.md` (4,197 bytes, 50 lines). No subdirectories, no untracked files.
- The file is tracked (`100644 1ce7b3739`) and matched by no `.gitignore` pattern (`git check-ignore` rc=1).
- `.gitignore` contains no `.lovable` or `.workspace` entry.
- Zero build, test, lint, CI, or application dependency: no reference in `src/**`, `supabase/**`, `vite.config.ts`, `package.json`, or `.github/**`.
- The only references are historical audit prose in `docs/historical/audits/dg-1-documentation-governance-audit.md` and `dg-1a-alignment-evidence-closure.md`. Both classify it as a session artifact; neither is a resolvable link.
- The file is platform-managed and rewritten every planning turn; it was written during Plan-Mode turns at commits `8b12627db` and `324f34f65`, which is the open read-only-contract violation.

## Change set — exactly 2 paths

1. `.gitignore` — append a clearly commented single-file rule:
   - a comment identifying it as the Lovable platform-managed planning scratch file, excluded under the RM-DH-003 / Phase 2 governance correction;
   - the pattern `.lovable/plan.md` only. No `.lovable/` directory pattern, no wildcard.
2. `.lovable/plan.md` — remove from the Git index only (`git rm --cached`), leaving the working-tree file in place so the platform continues to operate normally.

Result: `1 modified` (`.gitignore`), `1 deleted from index` (`.lovable/plan.md`), 0 added, 0 renamed.

## Mandatory post-change verification in the same pass

- `git check-ignore -v .lovable/plan.md` must return rc=0 with the new pattern.
- `git ls-files .lovable/` must return empty.
- The working-tree file `.lovable/plan.md` must still exist on disk.
- `git status --porcelain` must show no untracked `.lovable/plan.md` (it is ignored).
- Plan presentation must be exercised once afterwards to confirm the platform tolerates the ignored file. If it does not, revert both changes immediately and report — this is the one unproven assumption in the audit.

## Untouched

`docs/**` in its entirety — including `docs/CONVENTIONS.md`, `docs/README.md`, the three Roadmap packages, `docs/workstreams/**`, and all accepted Rounds 1–5. No version bump, no provenance clause, no changelog entry in this pass. `src/**`, `supabase/**`, `public/**`, `package.json`, `tsconfig*`, `.env*`, `.github/**` unchanged. Existing Git history of `.lovable/plan.md` is preserved and not rewritten.

## Deliberately deferred

Recording this correction in the governance documentation (a `docs/CONVENTIONS.md` §11 clause noting that `.lovable/plan.md` is excluded, plus the corresponding registry/provenance updates) is **not** part of this pass. It is a separate owner-approved documentation pass, to be run only after the untracking is verified working, so that a failed untracking never leaves inaccurate documentation behind.

## After the pass

Status remains `ACCEPTED_AWAITING_OWNER_CLOSURE`. QA remains `Pending`. Owner closure remains not approved. Next permitted step is a read-only verification of the two-path change set, then the deferred documentation pass, then the owner's explicit closure decision on `RM-DH-003 / Phase 2` and `WS-DH-2026-0002`.
