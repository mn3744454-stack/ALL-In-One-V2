# RM-DH-003 / Phase 2 — `.lovable/plan.md` Narrow Governance Exception (Documentation Persistence Plan)

Documentation-only correction pass. No application, database, migration, or `.gitignore` change. No Closure.

## Background (verified)

- Merge commit `06467d6` untracked `.lovable/plan.md` and added exactly one `.gitignore` rule at line 26: `.lovable/plan.md`. No broad `.lovable/` rule exists.
- The behavioral smoke test proved the correction does not hold: on the first Plan Mode turn the platform recreated the file, force-added it despite the ignore rule, and auto-committed it as `64ab74ab` (`.lovable/plan.md | 7 +++++++`, single file).
- Root cause: `.gitignore` does not apply to paths the platform adds to the index unconditionally. Untracking is not sustainable in this environment.

## Approved exception (owner decision)

A narrow exception for `.lovable/plan.md` **only** — never `.lovable/**` or any other `.lovable/` path:

1. Plan Mode / Chat Mode remains read-only for every tracked repository file except `.lovable/plan.md`.
2. The exception applies only to changes produced automatically by the Lovable platform.
3. Manual or agent-directed edits to `.lovable/plan.md` are not permitted during read-only work.
4. Any change to another `.lovable/` path remains a read-only contract violation unless separately audited and owner-approved.
5. `.lovable/plan.md` must contain no credentials, secrets, private owner information, vendor information, financial information, strategic content, transcripts, or hidden reasoning.
6. Platform-generated `.lovable/plan.md` commits are not implementation, not Acceptance evidence, and not proof that other files remained unchanged.
7. Read-only audits must disclose this file's platform-generated change separately from tracked business, application, database, and governance scope.
8. Do not retry untracking in the current platform environment.
9. Preserve existing Git history — no rewrite, no revert of `06467d6` or `9fb0b569`.
10. The `.gitignore` rule at line 26 stays in place unchanged; it is retained as a record of the attempted correction and is harmless.

## Files to change

1. `docs/CONVENTIONS.md` — 1.1.0 to 1.2.0. Add subsection **§11.10 Planning-artifact governance exception** stating the ten rules above verbatim in substance, plus the verified platform behavior and the reason untracking is not retried. Stable rule only; no status, no timestamps of current state.
2. `docs/workstreams/ws-dh-2026-0002-governance-foundation/workstream.md` — 1.1.2 to 1.1.3. Record the behavioral smoke verification result (FAILED for untracking, exception adopted instead) in Evidence and Stage history. Status stays `ACCEPTED_AWAITING_OWNER_CLOSURE`; QA stays Pending; Closure stays Not approved.
3. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md` — append one dated entry for this correction pass with Git-verified timestamps and commit IDs, distinguishing content-writing commits from any trailing run-closing commit.
4. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/roadmap.md` — update Phase 2 current state to record the governance exception as adopted and the `.lovable/plan.md` finding as resolved-by-exception. No Phase advance, no closure.
5. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/decisions.md` — add `DEC-RM-DH-003-004` (narrow `.lovable/plan.md` exception) with decision, rationale, verified evidence (`06467d6`, `9fb0b569`, `64ab74ab`), and rejected alternatives: broad `.lovable/**` exemption; repeated untracking attempts; permanent-limitation-without-rule.
6. `docs/README.md` — 1.10.2 to 1.11.0. Update the version/coverage entries for the five files above.

Exactly six tracked files. Any platform-generated `.lovable/plan.md` commit is disclosed separately and is not counted in that scope.

## Not in scope

- No `.gitignore` edit, no `git rm --cached`, no stateful Git command.
- No QA, Acceptance, or Closure advance.
- No historical backfill.
- No change to `src/**`, `supabase/**`, or any other `docs/**` file.

## Verification after execution

- Exactly six tracked files changed, plus at most the platform's own `.lovable/plan.md` commit, disclosed separately.
- Version bumps consistent; Decision ID `DEC-RM-DH-003-004` unique and consecutive.
- No dynamic status inside `docs/CONVENTIONS.md`.
- All internal relative links resolve.
- Timestamps in Asia/Riyadh — UTC+03:00, taken from Git evidence, never invented.
