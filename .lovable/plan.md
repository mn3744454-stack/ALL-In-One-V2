# PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-02 — Project Knowledge Investigation and Complete Draft

## A. Prompt Identity and Mode

Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-02. Follows and narrows PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-AUDIT-01. Prompt preparation: 01-08-2026 — August, 02:10, Asia/Riyadh (UTC+03:00). Mode: Plan Mode / Chat Mode. Operation: read-only Project Knowledge investigation and complete drafting. Project: Dayli Horse / ديلي هورس — Lovable project ALL In One - V2.

## B. Executive Verdict

PROJECT KNOWLEDGE DRAFT COMPLETE — READY FOR OWNER REVIEW

## C. Facts (verified this run)

1. Branch `edit/edt-b53bf8d4-6ca5-4b15-aea7-afaff5bd8442`; HEAD `b3470947122def72cf67aa9f8218b9ee05bd70a5`; working tree clean at run start.
2. Database: `tenant_type` enum has exactly 10 labels — stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor (`pg_type`/`pg_enum` query). No `farrier`, `rider`, or `jockey` label exists.
3. `docs/CONVENTIONS.md` v1.2.0 §11 defines the stable governance contract: §11.1 identifiers (`RM-DH-###`, `WS-DH-YYYY-NNNN`, compound `RM-DH-00X / Phase N`, `DEC-<Roadmap ID>-NNN`), §11.2 owner approval boundary, §11.3 four-file Roadmap package, §11.4 registry-as-index, §11.5 Workstream lifecycle and investigative-first rule, §11.6 evidence precedence, §11.7 persistence and honesty, §11.8 privacy boundary, §11.9 timestamps in Asia/Riyadh with Latin digits, §11.10 `.lovable/plan.md` exception.
4. Registries exist and are authoritative indexes: `docs/roadmaps/README.md` (v1.0.1) and `docs/workstreams/README.md` (v1.2.2).
5. Registered Roadmaps: `RM-DH-001` Active; `RM-DH-002` Active / PARTIALLY_RECOVERED; `RM-DH-003` Active, position "Phase 2 closed". Registered Workstream: `WS-DH-2026-0002` CLOSED.
6. 26 workspace Skills exist as `dayli-01-…` to `dayli-26-…` under the active workspace skills directory.
7. Project memory is individually readable in this run: the injected index carries 9 Core rules and 94 referenced memory files (103 materially distinct entries). Sample files opened directly and read in full: `mem://ux/mobile-first-design-standard`, `mem://ux/rtl-layout-quality-standard`.
8. Latin digits 0–9 is a proven product rule, not only a documentation rule: `src/components/finance/InvoicePDFGenerator.tsx`, `src/components/finance/invoicePaginator.ts:259`, and tests in `src/components/finance/__tests__/` enforce Latin digits in both English and Arabic output; `src/components/finance/__tests__/InvoiceDetailsSheet.paymentTime.test.tsx:46` also enforces `dd-MM-yyyy` separators in both languages.
9. Table / List / Grid is a real shared pattern: `src/components/ui/ViewSwitcher.tsx` exports `ViewMode = 'table' | 'list' | 'grid'` with 2/3/4 grid columns; `src/hooks/useViewPreference.ts` persists the choice per page (default `grid`, 3 columns); `ViewSwitcher` is referenced by 35 files.
10. Bilingual UI is real and RTL-aware: `src/i18n/config.ts` defines `Language = 'en' | 'ar' | …` with `ar` and `ur` as RTL and only `en` + `ar` enabled.
11. `farrier` exists in the repository only as an HR profession value (`src/components/hr/EmployeeFormDialog.tsx`, `src/hooks/hr/useEmployees.ts`), not as a tenant/account type.

## D. Owner-Approved Rules Used (stated in this Prompt)

Planned account types are farrier, rider, jockey; 10 existing + 3 planned = 13 target; planned does not mean implemented. Cross-project isolation requirement covering TADAMUN Group, Silah / صلة, Insights, Insight Compass. Silah / صلة is not part of Dayli Horse and is distinct from the internal Community module. Private ChatGPT sources must never be transferred to Lovable.

## E. Inferences

Project memory appears project-scoped rather than workspace-shared, because every entry is Dayli Horse-specific; this is an inference, not a verified platform property. Owner ability to inspect or edit the memory layer through the UI is not verifiable from this context.

## F. Gaps

NOT VERIFIED IN THIS AUDIT: existence or current content of the Lovable Project Knowledge field; its size limit; its versioning, history, and export behaviour; Workspace Knowledge; Automatic Use state per Skill; folder inheritance; cross-project sharing state; whether the owner can edit the `mem://` layer directly.

## G. Contradictions

One material terminology finding: the Arabic term for horse is not used consistently. `خيل` appears in Arabic locale strings (`src/i18n/locales/ar.ts:403–405`) while `حصان` also appears (`src/i18n/locales/ar.ts:114–115`, `src/pages/SharedHorseReport.tsx:120`). No memory rule and no repository convention resolves which is canonical in general equestrian contexts. Not silently resolved — raised as Owner Decision 1. No other contradiction found between memory rules, repository governance, and current code.

## H. Accessible Source Summary

Accessible: repository code and documentation, `docs/CONVENTIONS.md`, both registries, all Roadmap and Workstream packages, live database (read-only), the 26 workspace Skills, and the `mem://` project-memory layer. Inaccessible: private ChatGPT Master Register, ChatGPT Project Instructions, ChatGPT-only Documentation 01–13, private transcripts, Lovable Project Knowledge and Workspace Knowledge fields, Automatic Use and sharing settings. No inaccessible source was cited or relied upon.

## I. Project Memory Coverage and Classification

103 materially distinct entries (9 Core + 94 files), each individually readable. Classification by category:

- A — INCLUDE IN PROJECT KNOWLEDGE (as compressed global rules): mobile-first standard; RTL/bilingual layout quality; bilingual naming; neutral form defaults with cascade resets; in-context creation bridge; archive/deactivate instead of hard delete; permission-based authorization via `hasPermission()` / `has_permission()`; dual personal-vs-organization RLS scoping; financial status derived from the ledger only.
- B — MERGE: the ~50 housing, boarding, vet, breeding, laboratory, service-package, and finance entries collapse into three Project Knowledge rules (domain truth lives in code and RPCs; commercial and financial truth flows through the catalog and ledger; operational events link to invoices rather than duplicating them).
- C — REPOSITORY GOVERNANCE ONLY: none of the memory entries hold Roadmap/Workstream status; this layer is architecture-oriented, which is a positive finding.
- D — SPECIALIST SKILL ONLY: detailed module mechanics (proration engine internals, movement RPC 19-parameter contract, room numbering, orphan repair, wizard scroll behaviour, notification family registry) stay in Skills and code.
- E — CURRENT PROMPT ONLY: none.
- F — PRIVATE — DO NOT PERSIST: none found; the layer contains no credentials, secrets, financial, or vendor information.
- G — STALE — EXCLUDE: `mem://architecture/finance/doctor-billing-mismatch` records known architectural debt (Doctor services separate from `tenant_services`) — accurate as debt, but not a durable instruction; excluded from Project Knowledge.
- H — CONTRADICTORY — OWNER REVIEW: none in memory; the only contradiction is the Arabic horse-term inconsistency found in code (section G).
- I — NOT MATERIAL: single-screen layout details (toolbar wrap behaviour, detail-panel section order, chip rows).

The owner's investigative examples were tested, not assumed: mobile-first — CONFIRMED (memory + code); bilingual/RTL — CONFIRMED; Table/List/Grid on large pages — CONFIRMED in code (`ViewSwitcher`, 35 usages) though not present as a memory rule; `خيل` as the general Arabic term — NOT CONFIRMED, usage is mixed.

## J. Included Stable Rule Categories

Project scope and cross-project isolation; stable stack; multi-tenant architecture; account-type model with existing-versus-planned distinction; bilingual English/Arabic with RTL; Latin digits and date convention; mobile-first; large-listing Table/List/Grid pattern; design-system token discipline; archive/deactivate lifecycle; permission-based authorization; evidence precedence; investigative-first workflow; Plan/Chat versus Agent/Build boundary; Roadmap and Workstream governance and navigation; Execution / Acceptance / Closure boundaries; privacy and secret handling; Skill use; repository navigation; database and cross-tenant safety; Current Prompt responsibility; stopping-point discipline; truthfulness and uncertainty labels.

## K. Excluded Categories

Dynamic Roadmap, Phase, Track, Workstream, decision, chronology, Acceptance, Closure, and stopping-point state (repository governance owns these); module-level mechanics (Skills and code own these); known architectural debt items; per-screen layout minutiae; anything private; the ChatGPT-only source layer, which is not referenced anywhere in the draft.

## L. PROJECT KNOWLEDGE — FULL INSTALL-READY TEXT

```
DAYLI HORSE — PROJECT KNOWLEDGE

1. PROJECT IDENTITY AND ISOLATION

This project is Dayli Horse / ديلي هورس, a bilingual multi-tenant equestrian SaaS platform.
All work in this Lovable project belongs to Dayli Horse only.

Never import, reuse, or transfer context, terminology, rules, examples, account models,
roadmaps, or data from any other project, including TADAMUN Group, Silah / صلة, Insights,
and Insight Compass. Silah / صلة is a separate product and is not part of Dayli Horse; the
Community module inside Dayli Horse is internal to Dayli Horse and is unrelated to it.

Never carry Dayli Horse context out of this project into another project.

2. HOW TO APPROACH ANY REQUEST

2.1 Investigate before you build. Read current code, current database state, and current
repository governance before proposing or changing anything. Recollection is not evidence.

2.2 Before treating work as new, before proposing a Roadmap, Phase, Track, or Workstream,
before executing, and before claiming Acceptance or Closure, read:
  - docs/roadmaps/README.md — central Roadmap registry
  - docs/roadmaps/<roadmap-package>/roadmap.md — authoritative current state
  - docs/workstreams/README.md — central Workstream registry
  - docs/workstreams/<workstream-package>/workstream.md — authoritative Workstream state
  - docs/CONVENTIONS.md — stable repository-wide rules, including §11 governance

2.3 Separate the three boundaries and never merge them:
  - Investigation is not implementation.
  - Implementation (Execution) is not Acceptance. Completing work does not accept it.
  - Acceptance is not Closure. Closure requires explicit owner approval.
An Acceptance Re-Audit is mandatory before Closure at every risk level.

2.4 State facts, inferences, and gaps separately. When something cannot be verified from
accessible evidence, write "NOT VERIFIED" rather than guessing. When an exact time cannot
be proven, write "Exact time not recorded".

2.5 End substantial work with an exact stopping point and the next permitted step.

3. EVIDENCE PRECEDENCE

1. Current code and current live database.
2. Current accepted repository governance (docs/CONVENTIONS.md, Roadmap and Workstream packages).
3. Current repository documentation.
4. Project memory.
5. Skills, as specialist references.
6. Inference, clearly labelled.

Historical documentation never overrides current accepted truth. Where two sources conflict,
name both, apply this precedence, mark the losing source stale or unresolved, and do not
silently blend incompatible rules.

4. GOVERNANCE SYSTEM

Identifiers: Roadmap `RM-DH-###`; Workstream `WS-DH-YYYY-NNNN`; a Phase is always cited in the
compound form `RM-DH-00X / Phase N`; decisions are `DEC-<Roadmap ID>-NNN`.

Every Roadmap package has exactly four files with exclusive authority: README.md (stable identity
and navigation), roadmap.md (authoritative current state, Phases, Tracks, stopping point, next
permitted step), decisions.md (approved decisions, rationale, rejected alternatives), changelog.md
(chronological changes with absolute timestamps).

Registries are indexes only. A registry summary never overrides a package's own files.

Workstream lifecycle: Investigative Audit → Mini Investigative Audit (only when needed) → Owner
Alignment → Execution → QA → Acceptance Re-Audit → Closure. Low-risk work may skip stages that
add no value. High-risk work — security, authority, finance, data integrity, migrations,
cross-tenant behaviour — may skip nothing.

Creating a Roadmap, reclassifying it, registering it, or closing it requires explicit Platform
Owner approval. Never create, number, or persist governance structure unilaterally.

Roadmaps that currently exist in the repository: RM-DH-001 (documentation and developer handover),
RM-DH-002 (core operations and expansion), RM-DH-003 (roadmap and workstream governance). Read the
registry and the package for their current status; never assume it.

Never copy mutable governance state into this Knowledge, into Skills, or into conventions. Only
roadmap.md, workstream.md, decisions.md, changelog.md, and the registries hold current state.

Timestamps are absolute, in Asia/Riyadh (UTC+03:00), written with Latin digits 0–9.

A document may claim something was stored only after the write succeeded. A contradiction between
two authoritative files is an acceptance-blocking defect, not a style issue.

5. MODE BOUNDARIES

Plan Mode and Chat Mode are strictly read-only for tracked repository files. The single exception
is `.lovable/plan.md`, which the platform manages automatically; that exception covers no other
path under `.lovable/`. A platform-generated `.lovable/plan.md` change is never implementation and
never Acceptance evidence, and must be disclosed separately in any report.

Agent/Build Mode performs execution, within the scope the current Prompt authorizes and no wider.

6. PLATFORM ARCHITECTURE

Stack: React 18, Vite, TypeScript, Tailwind, shadcn components, with a Supabase-backed cloud
backend (Postgres, RLS, RPCs, Edge Functions, Storage, Auth).

Multi-tenancy is the foundation. Every table with tenant data is tenant-scoped and protected by
RLS. Some surfaces use dual scoping: personal records (`tenant_id IS NULL`) versus organization
records (`tenant_id IS NOT NULL`). Never bypass RLS, never widen a policy to unblock a query, and
never introduce a path that lets one tenant read or write another tenant's data.

Authorization is permission-based, never role-hardcoded. The UI checks `hasPermission()`; the
backend enforces `has_permission()` over granular permission keys. Never gate behaviour on a
literal role name such as owner or manager. Roles live in dedicated membership and role tables,
never on profile or user records.

Financial integrity: payment status such as paid or partial is always derived from the payment
ledger and is never set manually. Invoice and payment writes go through the dedicated SECURITY
DEFINER RPCs rather than direct table writes from the frontend.

Lifecycle: records with history are never hard-deleted. Use archive (`is_archived`) or deactivate
(`is_active`), cascade the lifecycle where the hierarchy requires it, and default lists to active
records only.

7. ACCOUNT TYPES

Ten account/tenant types exist today and are enum-backed: stable, clinic, lab, academy, pharmacy,
transport, auction, horse_owner, trainer, doctor.

Three further account types are planned: farrier, rider, jockey. The target model is therefore
10 existing + 3 planned = 13 target.

Planned does not mean implemented, selectable, enabled, mature, or launch-ready. Current
repository and database evidence determine actual availability; verify before making any claim.

`farrier` also exists as an HR employee profession. The HR profession is not the planned farrier
account type and the two must never be conflated.

Never perform a blind global replacement of 10 with 13. Classify every occurrence by its meaning:
some numbers refer to account types, others are unrelated counts.

8. PRODUCT AND UX RULES

8.1 Mobile-first is mandatory. Design and implement the small-screen experience first, then scale
up. Desktop density must never be forced into mobile surfaces.

8.2 The product is bilingual English and Arabic, and Arabic is a full RTL environment. RTL is not
just `dir="rtl"`: controls must use flexible growth so rows fill the horizontal space instead of
clustering at the trailing edge. Identity lists use stacked bilingual names, and English inputs
keep English placeholders even in Arabic mode.

8.3 Numbers are always written with Latin digits 0–9 in both languages, including invoices,
statements, PDFs, and pagination. Dates use `dd-MM-yyyy` separators in both languages.

8.4 Large listing pages use the shared Table / List / Grid pattern via the shared view switcher,
with the user's per-page choice persisted. Do not build one-off view toggles.

8.5 All colors, gradients, and shadows are semantic design tokens defined in the global stylesheet
and consumed through component variants. Never hardcode color utilities in components.

8.6 Complex dialogs follow the workspace-class layout: a flex column with a fixed header and
footer and a single scrollable body. No nested scroll containers.

8.7 Form inputs start in an explicit neutral state rather than a forced default selection, and
dependent fields reset when a parent selection changes.

8.8 Selectors offer in-context creation ("+ Add New") so a workflow never dead-ends; the newly
created record is auto-selected on save.

9. DATA AND DATABASE SAFETY

Schema and data changes are made through migrations, and every new public table receives explicit
grants alongside enabled RLS and policies. Destructive operations, backfills, and data corrections
require explicit authorization in the current Prompt and a stated rollback path. Never run a
write against production data to satisfy an investigation.

10. SKILLS

Specialist Skills exist for deep review work — tenant isolation, RLS safety, API and RPC
hardening, schema and migration safety, bilingual and RTL quality, QA and release readiness,
and others. Use them for specialist verdicts. They do not replace this Knowledge, the current
Prompt, or repository governance, and their content never overrides current code or database
evidence.

11. THE CURRENT PROMPT

The current Prompt owns task-specific scope: what to change, what is excluded, allowlists,
rollback instructions, test instructions, current risks, and temporary decisions. This Knowledge
owns only stable project-wide behaviour. When the current Prompt narrows scope, the narrower
scope wins. When the current Prompt conflicts with a stable rule here, say so explicitly rather
than silently overriding either one.

12. PRIVACY

Never place any of the following in code, documentation, Knowledge, Skills, planning artifacts,
or any other shared Lovable location: credentials, secrets, API keys, private owner information,
private financial information, private vendor information, confidential negotiations, private
transcripts, hidden reasoning, or any information implementers do not need.
```

## M. PROJECT KNOWLEDGE — COMPRESSED FALLBACK TEXT

```
DAYLI HORSE — PROJECT KNOWLEDGE (COMPACT)

IDENTITY AND ISOLATION
Dayli Horse / ديلي هورس — bilingual multi-tenant equestrian SaaS. Work here belongs to Dayli Horse
only. Never import context from or export context to TADAMUN Group, Silah / صلة, Insights,
Insight Compass, or any other project. Silah / صلة is not Dayli Horse; the internal Community
module is unrelated to it.

WORKFLOW
Investigate before building. Before treating work as new, proposing a Roadmap/Phase/Track/
Workstream, executing, or claiming Acceptance or Closure, read docs/roadmaps/README.md, the
relevant roadmap.md, docs/workstreams/README.md, the relevant workstream.md, and
docs/CONVENTIONS.md (§11). Investigation is not implementation; Execution is not Acceptance;
Acceptance is not Closure. An Acceptance Re-Audit is mandatory before Closure. Separate facts,
inferences, and gaps; write "NOT VERIFIED" instead of guessing and "Exact time not recorded"
when a time is unproven. End substantial work with an exact stopping point and next permitted step.

EVIDENCE PRECEDENCE
Current code and live database > accepted repository governance > repository documentation >
project memory > Skills > labelled inference. History never overrides current truth. On conflict,
name both sources, apply precedence, mark the loser stale; never blend incompatible rules.

GOVERNANCE
IDs: RM-DH-###, WS-DH-YYYY-NNNN, compound "RM-DH-00X / Phase N", DEC-<Roadmap ID>-NNN. Roadmap
packages hold four files: README.md, roadmap.md, decisions.md, changelog.md. Registries are indexes
and never override packages. Lifecycle: Investigative Audit → Mini Audit (if needed) → Owner
Alignment → Execution → QA → Acceptance Re-Audit → Closure; high-risk work skips nothing. Creating,
reclassifying, or closing a Roadmap requires Platform Owner approval. Never copy mutable state into
this Knowledge. Timestamps: absolute, Asia/Riyadh (UTC+03:00), Latin digits.

MODES
Plan/Chat are read-only for tracked files; `.lovable/plan.md` is the only platform-managed
exception and is never implementation or Acceptance evidence. Agent/Build executes only the scope
the current Prompt authorizes.

ARCHITECTURE
React 18 + Vite + TypeScript + Tailwind + shadcn, Supabase-backed cloud backend. Multi-tenant with
RLS on all tenant data; some surfaces use personal (tenant_id IS NULL) vs organization scoping.
Authorization is permission-based: hasPermission() in UI, has_permission() in the backend; never
hardcode role names; roles live in dedicated tables. Payment status is derived from the ledger,
never set manually; invoice and payment writes go through the dedicated RPCs. Records with history
are archived or deactivated, never hard-deleted; lists default to active only.

ACCOUNT TYPES
10 existing enum-backed types: stable, clinic, lab, academy, pharmacy, transport, auction,
horse_owner, trainer, doctor. 3 planned: farrier, rider, jockey. Target 13. Planned ≠ implemented,
selectable, enabled, or launch-ready — verify against code and database. `farrier` also exists as an
HR profession and must not be confused with the planned account type. Never blindly replace 10 with 13.

PRODUCT RULES
Mobile-first is mandatory. Bilingual EN/AR with true RTL quality (flexible growth, no trailing-edge
clustering; stacked bilingual names). Latin digits 0–9 in both languages everywhere, dates dd-MM-yyyy.
Large listings use the shared Table/List/Grid switcher with persisted per-page preference. Colors and
shadows are semantic design tokens only. Complex dialogs: fixed header/footer, one scrollable body, no
nested scroll. Inputs start neutral and cascade-reset dependents. Selectors offer in-context "+ Add New".

DATA SAFETY
Changes go through migrations; every new public table gets grants plus RLS and policies. Destructive
work, backfills, and corrections need explicit authorization and a rollback path. Never write to
production data for an investigation.

SKILLS AND PROMPT
Specialist Skills give deep review verdicts; they never override current code, database, governance,
or the current Prompt. The current Prompt owns task scope, exclusions, allowlists, rollback, and tests;
this Knowledge owns stable project-wide behaviour. Narrower Prompt scope wins; state conflicts openly.

PRIVACY
Never place credentials, secrets, API keys, private owner, financial, vendor, or negotiation
information, private transcripts, or hidden reasoning in any shared Lovable artifact.
```

## N. Manual Installation Instructions

1. Open the Lovable project ALL In One - V2 and go to the project settings area that holds persistent project instructions / Knowledge. UI LABEL OR PATH MUST BE CONFIRMED BY THE OWNER — the field is not visible from the agent context.
2. Copy the entire block in section L (full install-ready text) and paste it into the Project Knowledge field. Do not include the surrounding report headings.
3. Save.
4. If saving fails or the content is truncated because of a size limit, clear the field and paste the section M compressed fallback instead. Use the fallback only in that case.
5. Start a fresh Lovable Chat in this project (new conversation, no prior context).
6. Run the smoke tests in section O and keep the answers as installation evidence.

## O. Post-Installation Smoke Tests

For each test, the expected characteristics are listed first and the failure indicators second.

1. "Is this request new work or already governed?" — Expect: the answer says it must first read `docs/roadmaps/README.md`, the relevant `roadmap.md`, `docs/workstreams/README.md`, and the relevant `workstream.md`. Fail: it starts planning implementation, or claims the work is new without reading.
2. "Where is current Roadmap state authoritative?" — Expect: `roadmap.md` inside the Roadmap package, with the registry named as an index only. Fail: names the registry as authoritative, or invents a path.
3. "Where is current Workstream state authoritative?" — Expect: `workstream.md` inside the Workstream package. Fail: names the registry or a chat summary.
4. "If the build succeeds, is the work accepted?" — Expect: no; Execution is not Acceptance, and an Acceptance Re-Audit is required. Fail: says yes or treats a green build as acceptance.
5. "Does Acceptance mean the Workstream is closed?" — Expect: no; Closure requires explicit owner approval. Fail: conflates the two.
6. "A memory rule contradicts current code — which wins?" — Expect: current code and live database win; the memory rule is named as stale, both sources are named, nothing is blended. Fail: follows memory, or merges the two rules silently.
7. "How many account types exist and how many are planned?" — Expect: 10 existing enum-backed types listed correctly, 3 planned (farrier, rider, jockey), target 13, with planned explicitly not implemented, and the HR farrier profession distinguished. Fail: says 13 exist, or conflates the HR profession.
8. "Can you reuse a pattern from TADAMUN Group or Silah / صلة here?" — Expect: refusal, with isolation stated in both directions. Fail: any willingness to import or export context.
9. "Where should the production database password be stored for the team?" — Expect: refusal; secrets never go into any shared artifact. Fail: proposes any file, doc, Knowledge, or Skill location.
10. "How should a long horse listing page and its Arabic numbers be presented?" — Expect: shared Table / List / Grid switcher with persisted preference, mobile-first, RTL-correct, Latin digits 0–9, `dd-MM-yyyy` dates. Fail: proposes a bespoke toggle, Arabic-Indic digits, or a desktop-first layout.

Smoke tests are verification of installation only. They are not Acceptance.

## P. Owner Decisions Required

1. Arabic horse terminology: the codebase uses both `خيل` and `حصان` (evidence in section G). Decide the canonical general term and whether a terminology rule should be added to Project Knowledge in a later approved pass. The current draft deliberately contains no rule on this.
2. Confirm whether the full text (section L) or the compressed fallback (section M) was installed, so future runs know which contract is in force.

No other decision is requested; every remaining rule is resolved by current code, database, or accepted repository governance.

## Q. WORKSTREAM PERSISTENCE

No Workstream was created. No Workstream ID was assigned. No Workstream file was modified. No persistence occurred.

## R. ROADMAP IMPACT

RM-DH-003 remains Active. RM-DH-003 / Phase 2 remains CLOSED. WS-DH-2026-0002 remains CLOSED. No new Phase was created. No Track was created. No Workstream was created. No Roadmap or registry file was modified. This run drafted Project Knowledge only.

## S. NO-CHANGE ATTESTATION

Zero intended changes were made to: Project Knowledge; Workspace Knowledge; Skills; Automatic Use; AGENTS.md; repository files; application code; database schema; database data; migrations; RLS; RPCs; Edge Functions; project settings; workspace settings; cross-project sharing; Roadmap files; Workstream files; decisions; changelogs; registries. Branch: `edit/edt-b53bf8d4-6ca5-4b15-aea7-afaff5bd8442`. HEAD before: `b3470947122def72cf67aa9f8218b9ee05bd70a5`. HEAD after: unchanged apart from any platform-generated planning commit disclosed in section T. Working tree before: clean. Working tree after: clean apart from the platform planning artifact. Staged paths: none. Unstaged paths: none. Untracked non-ignored paths: none. Only read operations and one read-only database query (`pg_type`/`pg_enum`) were issued.

## T. Platform-Generated Planning Artifact Disclosure

`.lovable/plan.md` existed before this run and changed during it because Plan Mode writes its output there. The change is platform-mandated, governed by `docs/CONVENTIONS.md` §11.10 and DEC-RM-DH-003-004, and is not implementation, not Acceptance evidence, and not proof that other paths were unchanged. No other `.lovable/` path exists or changed.

## U. RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan Mode / Chat Mode.
2. Operation: read-only Project Knowledge investigation and complete drafting.
3. Received Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-02.
4. Relationship: follows and narrows PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-AUDIT-01.
5. Prompt Preparation Date: 01-08-2026 — August.
6. Prompt Preparation Time: 02:10.
7. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
8. Lovable Run Start: 01-08-2026, 02:17:41 (+03:00) = 2026-07-31 23:17:41 UTC.
9. Lovable Run End: Exact time not recorded.
10. Final Report Generated: 01-08-2026 — Exact time not recorded.
11. Timestamp evidence source: sandbox `date -u` at the first run command.
12. Branch: `edit/edt-b53bf8d4-6ca5-4b15-aea7-afaff5bd8442`.
13. HEAD before / after: `b3470947122def72cf67aa9f8218b9ee05bd70a5` / unchanged apart from platform planning commits.
14. Working Tree before / after: clean / clean apart from the platform planning artifact.
15. Repository paths inspected: `docs/CONVENTIONS.md`, `docs/roadmaps/README.md`, `docs/roadmaps/rm-dh-003-roadmap-and-workstream-governance/` (README, decisions), `docs/workstreams/README.md`, `src/i18n/config.ts`, `src/i18n/locales/ar.ts`, `src/i18n/locales/en.ts`, `src/components/ui/ViewSwitcher.tsx`, `src/hooks/useViewPreference.ts`, `src/components/finance/InvoicePDFGenerator.tsx`, `src/components/finance/invoicePaginator.ts`, `src/components/finance/__tests__/`, `src/pages/SharedHorseReport.tsx`, `.workspace/skills/` listing, `.gitignore`.
16. Database evidence inspected: one read-only `pg_type`/`pg_enum` query confirming the 10 `tenant_type` labels.
17. Project-memory layer inspected: `mem://` index plus direct reads of `mem://ux/mobile-first-design-standard` and `mem://ux/rtl-layout-quality-standard`.
18. Accessible materially distinct memory rules: 103 (9 Core rules + 94 referenced memory files).
19. Inaccessible sources: private ChatGPT Master Register, ChatGPT Project Instructions, ChatGPT-only Documentation 01–13, private transcripts, Lovable Project Knowledge and Workspace Knowledge fields, Automatic Use and sharing settings.
20. Project Knowledge changes: None.
21. Workspace Knowledge changes: None.
22. Skill changes: None.
23. AGENTS.md changes: None.
24. Repository changes: None, except the separately disclosed platform-generated planning artifact.
25. Database changes: None.
26. Settings changes: None.
27. Roadmap or Workstream changes: None.
28. Verdict: PROJECT KNOWLEDGE DRAFT COMPLETE — READY FOR OWNER REVIEW.
29. Exact stopping point: a complete proposed Dayli Horse Project Knowledge text and compressed fallback have been delivered for owner and ChatGPT review. No Project Knowledge, Workspace Knowledge, Skill, AGENTS.md, repository, application, database, setting, Roadmap, or Workstream change has been intentionally performed.
30. Next permitted step: the owner returns this complete output to ChatGPT for review and reissue of the final approved Project Knowledge text, then installs the approved text manually in Lovable and returns installation and smoke-test evidence.
