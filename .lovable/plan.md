# Dayli Horse — Skills-First Persistent Instructions Architecture Audit (read-only)

Working label only. No Phase, Track, Workstream, or Decision created.

## A. Audit Verdict

SKILL NETWORK AUDIT COMPLETE — OWNER ALIGNMENT REQUIRED

## B. Facts / Claims / Inferences / Gaps

- Facts (verified this run): all 26 Skill bodies are readable at the active-skills mount; `tenant_type` enum has exactly 10 labels; `farrier` exists in the repo only as an HR employee profession; Skill 26 does not self-list in Related Skills.
- Claims accepted from the prompt: owner approval of the 13-target model; Cross-project sharing disabled.
- Inferences: automatic-activation behaviour is inferred from Description text, not from an inspectable setting.
- Gaps: Automatic Use state, sharing scope, import source, Workspace/Project Knowledge, and project-level Skill controls are Not accessible from the current Lovable agent context.

## C. Lovable Skill Access Capability

Readable: Skill names, slugs, full frontmatter Descriptions, full bodies, Scope Guards, Related Skills lists, tier/verdict vocabulary, repository files, live database enums.
Not accessible from the current Lovable agent context: Automatic Use toggles, Workspace sharing scope, per-project Skill activation, Skill import source, Workspace Knowledge, Project Knowledge, project sharing settings, Skill version metadata (none exists in frontmatter).

## D. Skill Network Inventory (integrity)

Skills 01–26 exist exactly once, numbering complete and consecutive, slugs `dayli-NN-...` stable, no duplicate identity. Every Skill 01–25 references `dayli-26-skill-network-governance`, references Skill 01 and Skill 25. Skill 26 correctly omits itself. No version field exists on any Skill.

## E. Verified Account-Type Contract

- 10 current implemented types confirmed against the live `tenant_type` enum: stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor.
- 3 planned types (Farrier, Professional Rider, Jockey) have no enum value, no SelectRole entry, no onboarding route, no module, no permission or RLS contract. `farrier` appears only as an HR employee profession value (`EmployeeFormDialog.tsx`, `useEmployees.ts`) — an HR classification, not a workspace type.
- 13 approved target types = 10 current + 3 planned. No Skill currently states the target model.

## F. Account-Type Reference Registry (material occurrences)

1. "multi-tenant equestrian SaaS platform with 10 tenant/account types" + 10-item roster — present in all 26 Skills (Dayli Horse Context section). Classification: correct current-state, but ambiguous, requires qualification — it presents 10 as the whole model with no target/planned distinction.
2. Skill 02 Description ("across Dayli Horse's 10 tenant types") and body lines 239 / 718 — same ambiguity, plus a per-tenant depth rule that must extend to planned types once enabled.
3. Skill 04 line 644 "All 10 tenant types have separate Type A boundaries" — correct current-state, requires qualification so a new type is not silently excluded from isolation duties.
4. Skill 26 Artifact Type 8 global-rule list contains "10 account types" as a canonical global rule — this is the single point that propagates staleness network-wide; must become the 10/3/13 rule.
5. Skill 12 line 161 glossary row "Farrier — بيطار — Hoof care specialist" — correct as terminology, but must be annotated as an HR profession term, not a workspace type (identity-conflation risk).
6. Skill 16 lines 863 / 952 "all 10 Account Switching Risk Framework checks" — unrelated to account types; correct and must remain unchanged (do not rewrite).
7. Skill 23 line 1707 roster is corrupted by list auto-numbering (items rendered as 282–291) — formatting defect independent of the count.

No global search-and-replace is proposed; item 6 proves a mechanical 10→13 replacement would corrupt content.

## G. Description / Automatic-Use Findings

All 26 Descriptions open with a project-identity clause and close with an explicit non-Dayli-Horse exclusion list — strong. Residual risks: (a) Descriptions are long and share heavily overlapping trigger vocabulary (billing, mobile, QA, launch, tenant), so several Skills can match one generic task and inflate context; (b) the identity clause allows activation on "the user explicitly says the task is for Dayli Horse" alone, without domain relevance; (c) Skill 02's Description embeds the stale-prone "10 tenant types" fact.

Recommended Automatic Use policy (setting not changed, not inspectable):
- Automatic — safe: 04, 05, 06, 08, 22, 25, 26 (Tier 1 gates, narrow triggers).
- Automatic with stronger Description guard (require project identity AND domain relevance): 03, 07, 09, 10, 11, 12, 23, 24.
- Manual by default: 01, 13, 14, 15, 16, 17, 18, 19, 20, 21 (broad commercial trigger surface, high false-positive and token cost).
- Cannot determine from accessible evidence: current state of every toggle.

## H. Cross-Project Isolation Findings

Every Skill carries the same Scope Guard naming TADAMUN Group, Insights, Insight Compass, consulting, healthcare/regulatory, generic SaaS, e-commerce, marketing, and any future non-Dayli-Horse project, plus a stop-and-ask rule when unsure. Isolation is adequate. Recommendation: keep the canonical project-identity guard verbatim in every Skill (it must not depend on Project Knowledge existing) and retain the exclusion list; do not shorten it for brevity.

## I. Network Integrity Findings

No duplicate, missing, or stale slugs. Skill 01 remains sole launch aggregator; Skill 25 sole QA/release evidence gate; Skill 26 sole artifact/network gate; no specialist Skill issues launch or Acceptance verdicts. Staleness detected: evidence-based (10-type roster vs approved 13-target model) in all 26; cascade staleness from the Skill 26 global-rule list; artifact staleness from the absence of any version metadata; formatting defect in Skill 23.

## J. Adjacent Instruction-Layer Dependencies

No root `AGENTS.md` and no `CLAUDE.md` exist. `docs/CONVENTIONS.md` exists and already governs documentation/planning-artifact rules (DEC-RM-DH-003-004). Workspace and Project Knowledge are not inspectable. Consequence: the account-type contract has no non-Skill home today, so if Skills are corrected first they remain the only authority; when Project Knowledge or AGENTS.md later restates the contract, the Skills' rosters become duplicated-but-not-wrong text. That is a maintenance cost, not a correctness blocker.

## K. Skill-by-Skill Change Matrix (summary form; full 26-row matrix to be produced in execution)

- Skill 26 — Current/planned/target qualification + Ownership rule update (Artifact Type 8 global rule becomes 10/3/13). Highest risk, implementation order 1, because it is the canonical source of the global rule.
- Skill 02 — Description hardening + qualification (Description, line 239, line 718, roster). Order 2.
- Skill 04 — Qualification (roster, line 644 isolation duty extends to future types). Order 2.
- Skill 12 — Wording correction (line 161 annotated as HR profession, not workspace type). Order 3.
- Skill 23 — Wording correction + roster renumbering defect fix. Order 3.
- Skills 01, 03, 05, 06, 07, 08, 09, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25 — Current/planned/target qualification of the Dayli Horse Context roster only; all other sections preserved unchanged.
- No Skill requires Related Skills correction, dependency correction, verdict correction, or Scope Guard hardening on isolation grounds.
- Skill 16 lines 863/952 — explicitly No change (non-account-type use of "10").

## L. Full-Reissue and Versioning Recommendation

Every changed Skill must be reissued in full, not patched. Because the roster edit touches all 26, reissue all 26 in one coordinated version so the network carries one consistent baseline. Introduce `version:` and `last-verified:` in each Skill's frontmatter plus a network manifest Skill-index listing 26 slugs, versions, tiers, and the canonical global-rule set.

## M. Implementation-Order Options

- Option A (Skills first) — matches owner direction, reversible, no repository writes needed, immediately removes the stale 10-only fact from the layer that is already active. Weakness: mild duplication once Project Knowledge lands.
- Option B (Knowledge/AGENTS.md first) — leaves the live, auto-activating layer stale for longer; Skills would still need full reissue afterwards. Weaker.
- Option C (integrated single package) — best end state but largest single Acceptance surface, mixes non-auditable Lovable settings with Git-auditable files in one gate. Weaker on owner control and reversibility.

Recommended: Option A. No blocking dependency was found that must precede the Skill reissue.

## N. Governance Classification Recommendation

Recommend RM-DH-003 / Phase 3 — "Persistent Instructions Architecture", with a first Workstream scoped to the Skill network reissue (26 Skills, one version baseline), and later Workstreams for Project Knowledge, AGENTS.md, and Workspace Knowledge. Rationale: it is instruction-layer governance, the same domain RM-DH-003 already owns; RM-DH-003 remains Active. Risk of wrong classification: filing it as a Track or ad-hoc pass leaves Skill artifacts without an Acceptance gate.

## O. Owner Decisions Required

1. Approve Option A and the Phase 3 classification.
2. Approve the exact canonical wording of the 10-current / 3-planned / 13-target rule.
3. Approve reissuing all 26 Skills for one version baseline vs only the changed ones.
4. Approve introducing Skill version metadata and a network manifest.
5. Confirm the Automatic Use policy per Skill (owner-side, not agent-inspectable).

## P. Proposed Next Execution Package (not executed)

Reissue Skills 01–26 in full at one version baseline: canonical account-type rule, Skill 12 profession annotation, Skill 23 roster renumbering fix, version/last-verified metadata, network manifest. Scope Guards, tiers, ownership boundaries, dependency rules A–E, and verdict vocabularies preserved byte-equivalent apart from the named edits.

## Q. Risks, Counterarguments, Residual Gaps

Skills-first means the corrected rosters may be restated in Project Knowledge later (duplication). Reissuing all 26 risks accidental loss of safeguards — mitigated by full-reissue-only and a diff-based acceptance check. Automatic Use remains unverifiable, so activation behaviour cannot be proven either before or after. Skill 23's malformed list suggests prior reissues have already suffered formatting damage; a rendering check belongs in acceptance.

## R. WORKSTREAM PERSISTENCE

No Workstream persistence was authorized or performed.

## S. ROADMAP IMPACT

No Roadmap, Phase, Sub-phase, Track, or Workstream was created or modified. Recommended future classification only, per section N.

## T. Run Metadata and Exact Stopping Point

Mode: Plan Mode / Chat Mode
Operation: Strictly read-only Skills-first Persistent Instructions Architecture Audit
Prompt Preparation Date: 31-07-2026 — July
Prompt Preparation Time: 11:51
Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00
Lovable Run Start Date: 31-07-2026
Lovable Run Start Time: 11:59:43 (+03:00) / 08:59:43 UTC
Time Evidence Source: sandbox `date -u` at first audit command
Lovable Run End Date: 31-07-2026
Lovable Run End Time: Exact time not recorded
Time Evidence Source: not captured after final read
Final Report Generated Date: 31-07-2026
Final Report Generated Time: Exact time not recorded
Time Evidence Source: not captured
Repository HEAD at Audit Start: 47c0e23bf12b21276912c80cd64dac495676e2bd
Repository HEAD at Audit End: 47c0e23bf12b21276912c80cd64dac495676e2bd (no writes issued)
Working Tree at Audit Start: clean
Working Tree at Audit End: clean apart from platform-generated `.lovable/plan.md`
Skills Modified: No
Automatic Use Settings Modified: No
Project Knowledge Modified: No
Workspace Knowledge Modified: No
Repository Instruction Files Modified: No
Cross-Project Sharing Modified: No
Roadmap or Workstream State Modified: No
Platform-Generated Path Activity: `.lovable/plan.md` written by the platform planning mechanism to carry this report; no other `.lovable/` path changed. Not audit modification, not implementation, not Acceptance evidence.
Exact Stopping Point: Audit report delivered; no Skill, Knowledge, setting, or governance artifact touched.
Next Permitted Step: Owner decisions O.1–O.5, then a separately approved execution package per section P.
Timezone: Asia/Riyadh — UTC+03:00
