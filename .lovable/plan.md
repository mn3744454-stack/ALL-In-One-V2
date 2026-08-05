# Prompt 17 — C1 Part A — Git Baseline and Post-Prompt-16 Drift Boundary

Read-only. No repository write. No database access. No investigation execution. No Owner Acceptance claim.

The original Prompt-17 PASSED verdict is withdrawn: the authoritative Prompt-16 pre-write baseline `21916b35...` was not used and `445a25306...` was not independently classified.

## 1. Verdict

PROMPT-17-C1 PART A GIT BOUNDARY RESOLVED — AUTHORITATIVE PROMPT-16 BASELINE AND POST-FINAL-HEAD DRIFT PROVEN — READY FOR PART B CONTENT VERIFICATION

## 2. Branch, HEAD and Working Tree

- Branch: `edit/edt-122d1936-32f4-4f71-8237-1d219c55ca0b`
- HEAD: `3871c033d755efce5a8972465fc1f46d74a0a456` (merge)
- HEAD parents: `445a2530650a5ed8377ead03cd8e7d74b17adb0c`, `87ff9d6647b97f8682e4d81e4d803924117f838c`
- Working Tree: clean — no staged, no unstaged, no untracked entries (`git status --porcelain -uall` empty)
- All seven queried objects exist and are reachable:
  `8c514c59cc09ac0ed347bd98b6c76d280a694061`, `21916b35ec2a54ac100d7b22efdff0274d25c737`, `1ea50a8159a3ff6c4fefbefba2083407c5fd1576`, `e733853eb89a7f0c419b533412b59ce62ab22892`, `8f03731b04463153537d3bd1ef3a8e3eadb664b4`, `77053af4837de1618af624949f0bed2571a84b49`, `445a2530650a5ed8377ead03cd8e7d74b17adb0c`

## 3. Relationship: `8c514c59c...` and `21916b35...`

`8c514c59c` is a strict ancestor of `21916b35` (`git merge-base --is-ancestor` = YES), four commits earlier:

```text
8c514c59c (Update plan, 15:41:14Z)
  ├─ f5f0a2f38 (Changes)
  └─ 9a24446bc (Update plan, merge)
       ├─ 0cc1f1884 (Changes)
       └─ 21916b35e (Update plan, merge, 16:35:15Z)  <-- authoritative Prompt-16 pre-write HEAD
```

`8c514c59c` was an earlier platform-plan checkpoint, not the Prompt-16 baseline. Using it widened the reported baseline window by four commits. `21916b35...` is the authoritative pre-write HEAD.

## 4. Commit table after `21916b35...` through current HEAD

| Full SHA | Parent(s) | Subject | Changed paths | Classification |
| --- | --- | --- | --- | --- |
| `1ea50a8159a3ff6c4fefbefba2083407c5fd1576` | `21916b35ec...` | Changes | `docs/roadmaps/rm-dh-003-.../decisions.md` | GOVERNED CONTENT |
| `e733853eb89a7f0c419b533412b59ce62ab22892` | `1ea50a8159...` | Changes | `docs/roadmaps/rm-dh-003-.../changelog.md` | GOVERNED CONTENT |
| `8f03731b04463153537d3bd1ef3a8e3eadb664b4` | `e733853eb8...` | Changes | `docs/README.md` | GOVERNED CONTENT |
| `77053af4837de1618af624949f0bed2571a84b49` | `8f03731b04...` | Changes | `.lovable/plan.md` | PLATFORM PLAN |
| `445a2530650a5ed8377ead03cd8e7d74b17adb0c` | `21916b35ec...`, `77053af483...` | Fixed Decision Summary bounds | merge of the four paths above; zero delta vs `77053af4` | PLATFORM MERGE (Prompt-16 integration) |
| `87ff9d6647b97f8682e4d81e4d803924117f838c` | `445a253065...` | Changes | `.lovable/plan.md` | POST-PROMPT-16 DRIFT (platform plan only) |
| `3871c033d755efce5a8972465fc1f46d74a0a456` | `445a253065...`, `87ff9d6647...` | Update plan | `.lovable/plan.md` | POST-PROMPT-16 DRIFT (platform plan only) |

## 5. Diff A — `21916b35...` to `77053af4...`

```text
M  .lovable/plan.md
M  docs/README.md
M  docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md
M  docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/decisions.md
```

Exactly four paths: three governed plus the platform plan. No fourth governed path, no Workstream file, no application, database or migration path.

## 6. Diff B — `77053af4...` to current HEAD

```text
M  .lovable/plan.md
```

Post-Prompt-16 drift is confined to the platform plan. Governed blobs are byte-identical between `77053af4` and HEAD:

- `docs/README.md` — `12be42da99b23b4420aa1ba1b669f31d24274de7`
- `.../changelog.md` — `16eb3ad7a2f2ce523f29ae5d2937409332f335f7`
- `.../decisions.md` — `fac92ffbd46b1d28ee15121643b7149fead51e06`

## 7. Classification of `445a25306...`

Platform merge/sync, not a delayed Prompt-16 content commit and not drift. Evidence: it is a two-parent merge of the pre-write HEAD `21916b35` and the Prompt-16 linear tip `77053af4`, and `git diff 77053af4 445a25306` is empty — it introduced zero content. Its subject line "Fixed Decision Summary bounds" describes the merged Prompt-16 change, not new content.

## 8. Final governed path set (from `21916b35...`)

1. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/decisions.md`
2. `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/changelog.md`
3. `docs/README.md`

Exactly three. No Workstream package path, no `roadmap.md`, no `docs/roadmaps/README.md`.

## 9. Separate platform-plan path set

1. `.lovable/plan.md` — modified inside the Prompt-16 window (`77053af4`) and again after it (`87ff9d66`, `3871c033`), under the `DEC-RM-DH-003-004` platform-artifact exception.

## 10. Remaining evidence gap

Commit author identity and exact local clock times were not captured in Part A; committer timestamps are recorded in UTC as shown. Exact time not recorded for Owner-side events. No other gap for the Git boundary.

## 11. CROSS-TASK REPORT CONTAMINATION CHECK

NO CROSS-TASK CONTAMINATION DETECTED

## 12. Run metadata and exact stopping point

- Mode/operation: Plan/Chat read-only; Git baseline and drift-boundary reconstruction only.
- Parent Prompt / continuation: PROMPT-DH-RM003-P3-POST-CORRECTION-PACKAGE-START-VERIFICATION-17 / C1 Part A. No new local number consumed.
- Parallel Task: PT-DH-RM003-P17-C1-GIT-BOUNDARY-20260805-01.
- Branch: `edit/edt-122d1936-32f4-4f71-8237-1d219c55ca0b`. HEAD `3871c033d755efce5a8972465fc1f46d74a0a456` with parents `445a253065...` and `87ff9d6647...`. Working Tree clean.
- Authoritative Prompt-16 pre-write HEAD: `21916b35ec2a54ac100d7b22efdff0274d25c737`.
- Prompt-16 reported final HEAD: `77053af4837de1618af624949f0bed2571a84b49` (confirmed as the linear Prompt-16 tip).
- Commits reviewed: `8c514c59cc09ac0ed347bd98b6c76d280a694061`, `f5f0a2f384404f7de28b3f11a0062b33ea7b4cf5`, `9a24446bc89b12200ee5c7dd448f60baa707b000`, `0cc1f1884284f220ad6c709b2c608a7069fff11a`, `21916b35ec2a54ac100d7b22efdff0274d25c737`, `1ea50a8159a3ff6c4fefbefba2083407c5fd1576`, `e733853eb89a7f0c419b533412b59ce62ab22892`, `8f03731b04463153537d3bd1ef3a8e3eadb664b4`, `77053af4837de1618af624949f0bed2571a84b49`, `445a2530650a5ed8377ead03cd8e7d74b17adb0c`, `87ff9d6647b97f8682e4d81e4d803924117f838c`, `3871c033d755efce5a8972465fc1f46d74a0a456`.
- Diff A path set: 3 governed + `.lovable/plan.md`. Diff B path set: `.lovable/plan.md` only.
- `445a25306...`: PLATFORM MERGE — zero content delta.
- Repository writes: None. Database access: None. Investigation execution: None. Owner Acceptance: Not granted.
- Preserved state: Prompt 16 consumed; both Workstream investigations NOT RUN; both Workstream-local Prompt 01 identities NOT CONSUMED; Project Knowledge NOT INSTALLED; Sub-phase 3.2 NOT STARTED; no Closure.
- Stopping point: stopped immediately after resolving the Git boundary; no content or package/start verification performed.
- Next action: Prompt-17 C1 Part B — content verification only.
