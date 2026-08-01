# STAGE A — BATCH A4 + FINAL STAGE A RECONCILIATION

Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03
Mode: Plan Mode (read-only). Stage A only. Stage B not started.

ID mapping confirmed: MEM-001–008 = the 8 `mem://index.md` Core bullets; MEM-009–103 = the 95 indexed memory rows (MEM = index row + 8). MEM-085 = row 77 = `mem://breeding/domain-architecture-standard`; MEM-103 = row 95 = `mem://features/horses/quick-create-minimal-mode`. Batch A4 = 19 IDs, as expected.

## 1. Owner Correction Register — MEM-061 (recorded, not applied)

MEM-061 (`mem://features/stable/internal-cost-management`) original content preserved unchanged. Owner correction registered verbatim per §3 of the prompt: Internal Cost Management is cross-account (not Stable-only); shared label must be "Internal Costs" / "التكاليف الداخلية" with account-aware contextual variants; shared action must be "Record as Internal Cost" / "تسجيل كتكلفة داخلية"; amount = 0 records are a suspected financial-integrity defect (Total Cost KPI = SAR 0.00 evidence); missing amount must surface as incomplete, never as a confirmed zero cost; the authoritative cost source (supplier payable / cost snapshot / manual internal cost) must be determined in Stage B; Internal Cost ≠ client invoice amount. Classification: required cross-account business capability with a known contextual-labeling defect and a possible financial-amount integrity defect requiring Stage B verification. No correction implemented in Stage A.

## 2. Batch A4 — Item-Level Report (MEM-085 → MEM-103)

Common metadata for all A4 items unless stated otherwise: provenance = `mem://index.md` reference + direct file read; visible timestamp evidence = none per-file (index header shows "Updated: 15w ago" only); duplicate/alias IDs = none; content type = declarative architecture/UX/domain rule.

### MEM-085 — mem://breeding/domain-architecture-standard — "Breeding Domain Architecture" — group: breeding
```
Breeding records are owned by the Stable managing the mare. The domain comprises six tables (breeding_attempts, pregnancies, pregnancy_checks, embryo_transfers, semen_batches, and semen_tanks). A source_mode field (internal, connected, external) distinguishes fulfillment origins. Breeding events integrate with finance via billing_links and track external costs in supplier_payables. Commercial agreements are managed in breeding_contracts, linking clients and services to pricing modes. Lineage is manually linked through the foaling lifecycle, where foal records auto-populate sire and dam based on the causal breeding chain.
```
Read status: directly read. Classification (non-final): Possible Project Knowledge (domain architecture). Internal references: MEM-019 (billing_links), MEM-039 (supplier_payables). Contradictions: none. Stage B: Yes — verify the six tables, `source_mode` enum values, and `breeding_contracts` exist as described in the live schema.

### MEM-086 — mem://laboratory/domain-architecture-standard — "Laboratory Domain Architecture" — group: laboratory
```
The Laboratory module is architecturally isolated from Stables, using a dedicated catalog (lab_services). B2B requests use a dual-tenant model (initiator vs provider) protected by a 'Snapshot Contract'. SECURITY DEFINER triggers (fn_populate_lab_request_snapshots, fn_populate_lrs_service_snapshots) capture horse identity, service names, and pricing at creation to ensure data provenance and bypass cross-tenant RLS boundaries. Pricing follows a template-sum/override model. Results follow a Draft -> Reviewed -> Final lifecycle, requiring manual publication to the Stable. Lab-side UI must strictly rely on snapshots for display.
```
Read status: directly read. Classification: Possible Project Knowledge. References: MEM-013 (horse unification / lab_horses), MEM-099 (lab UI isolation). Contradictions: tension with MEM-048/MEM-084 unified-catalog claims (catalog fragmentation theme) — recorded as overlap, not resolved. Stage B: Yes — verify both SECURITY DEFINER triggers exist and that snapshot columns are populated.

### MEM-087 — mem://laboratory/submission-architecture — "Lab Submission Parent-Child Architecture" — group: laboratory
```
---
name: Lab Submission Parent-Child Architecture
description: lab_submissions is the parent container; lab_requests are horse-level children linked via submission_id. Phase 1 schema + Stable-side sending complete.
type: feature
---
## Architecture
- `lab_submissions` = parent submission container (sender, lab, priority, notes, description, status)
- `lab_requests` = child horse-level items linked via `submission_id` FK (nullable for backward compat)
- `lab_request_messages` supports `submission_id` for submission-level threads (primary) alongside legacy `request_id`
- `get_lab_request_threads` RPC returns both submission-level and legacy request-level threads

## Stable-Side Creation Flow
- `createSubmission()` in useLabRequests creates 1 parent + N children atomically
- Each child carries horse-specific test_description, services, and snapshots

- Single-horse case: 1 submission + 1 child

## Phase Status
- Phase 1 (Schema + Stable sending): COMPLETE
- Phase 2 (Lab intake grouped view): NOT YET
- Phase 3 (Per-horse different tests): NOT YET
- Phase 4 (Samples/Results alignment): NOT YET

## Priority Translations
- Moved from `boarding.careNotes.priorities.*` to `laboratory.requests.priorities.*`
```
Read status: directly read (only A4 item carrying frontmatter). Classification: Possible Project Knowledge + mutable phase-status claim. Contradictions: none. Stage B: Yes — the "Phase 1 COMPLETE / Phases 2–4 NOT YET" status is a mutable current-state claim requiring live verification.

### MEM-088 — mem://features/stable/room-function-reclassification — "Room Function Reclassification" — group: stable/housing
```
Room functions (stall, storage, isolation_room) are editable after creation via the inline edit surface in the room detail panel. The system enforces strict reclassification guardrails:
1. Block: Conversion to 'storage' is prohibited if the unit is currently occupied.
2. Confirm: Any function change while the unit is occupied (e.g., stall to isolation) triggers an AlertDialog confirmation to ensure intentionality.
3. Direct: Reclassification is permitted without confirmation if the unit is empty.
Existing visual logic for cell colors and badges automatically reflects these 'unit_type' updates.
```
Read status: directly read. Classification: Possible Project Knowledge (business rule). References: MEM-089, MEM-062 (housing lifecycle). Stage B: No.

### MEM-089 — mem://ux/stable/room-detail-panel-standard — "Room Detail Panel Standard" — group: ux/stable
```
The room detail side panel (UnitDetailsSheet) follows a structured three-section architecture to maintain operational clarity:
1. Section 1 (Room Identity & Controls): Displays room metadata and surfaces high-frequency controls (Edit, Maintenance, Out of Service) as direct action chips in the panel body. This reduces the 'three-dots' menu to rare lifecycle actions (Deactivate, Archive, Delete), eliminating header crowding.
2. Section 2 (Occupant Snapshot): Provides a compact live view of the current horse, admission status, client, and rates. To prevent context loss, the 'View Boarding Details' action opens the full 'AdmissionDetailSheet' as an in-place modal/nested sheet rather than navigating away from the Facilities context.
3. Section 3 (Room History): Displays a chronological timeline of previous occupants.
This layered UX ensures users can drill down into complex boarding data while remaining anchored in their physical facility context.
```
Read status: directly read. Classification: Possible Project Knowledge (UX standard). References: MEM-090 (history source), MEM-067 (complex dialog layout). Stage B: No.

### MEM-090 — mem://features/stable/room-event-history-strategy — "Room Event History Strategy" — group: stable/housing
Read status: referenced but inaccessible. Index description preserved verbatim: "History populated entirely from past housing_unit_occupants records". Attempted URIs: `mem://features/stable/room-event-history-strategy`, `mem://features/stable/room-event-history-strategy.md`. Classification: Unclassifiable due to inaccessible content. Stage B: Yes — inaccessible-memory recovery target; secondary target is whether room history is in fact sourced solely from `housing_unit_occupants`.

### MEM-091 — mem://domain/horses/classification-model — "Horse Classification Model" — group: domain/horses
```
The horse classification engine utilizes a priority-based resolution chain to derive the display label (HorseType): 'is_gelded' (Gelding) > 'breeding_role' (Stallion/Broodmare) > 'age_category' (Manual Age-Stage) > Birth-date derivation. The 'age_category' field explicitly stores the user's manual selection of life-stage (Colt/Horse/Filly/Mare) from Step 2, ensuring that birth-date serves as an advisory recommendation rather than a deterministic lock. This model supports 'حصان' (Horse) as the generic category for adult intact males not designated for breeding.
```
Read status: directly read. Classification: Possible Project Knowledge. References: MEM-092, MEM-093, MEM-094, MEM-095. Overlap: terminology tie to the open `خيل` vs `حصان` question raised in Prompt 02. Stage B: No.

### MEM-092 — mem://domain/horses/breeding-eligibility-rules — "Breeding Eligibility Rules" — group: domain/horses
```
Breeding visibility follows a strictly symmetric gating model based on explicit user designation rather than auto-derived age labels.
1. Sire Pool: Requires 'breeding_role' = 'breeding_stallion' AND 'is_gelded' = false. Adult intact males ('Horse') are excluded by default.
2. Mare Pool: Requires 'breeding_role' = 'broodmare'. Generic adult 'Mares' are excluded from breeding surfaces unless explicitly designated.
3. Pregnancy Flows: Restricted to horses with the 'broodmare' role.
This model ensures that only horses intentionally part of a breeding program pollute reproductive selection surfaces.
```
Read status: directly read. Classification: Possible Project Knowledge. References: MEM-085, MEM-091, MEM-100. Stage B: No.

### MEM-093 — mem://security/horses/classification-governance — "Horse Classification Governance" — group: security/horses
```
Horse classification fields utilize a 5-tier governance model to preserve lifecycle truth:
- Tier 1 (Normal): Name, Pony, Breed, Color. Freely editable by any operator.
- Tier 2 (Advisory): Birth Date. Triggers a warning/confirmation if an edit alters the age-stage (e.g., adult to young).
- Tier 3 (High-Impact): Breeding Designations (Stallion/Broodmare). Requires modal confirmation. Removal is Owner-only and blocked if downstream breeding records (attempts, contracts, semen) exist.
- Tier 4 (Irreversible): 'is_gelded'. Once saved as true, it is locked and cannot be reversed through normal UI.
- Tier 5 (Locked): 'gender'. Locked after registration. Corrections require a dedicated 'Correct Registration Error' workflow (Owner role + reason text).
```
(plus: "Changes to Tier 2-5 fields are recorded in the 'horse_classification_changes' audit log table.")
Read status: directly read. Classification: Possible Project Knowledge (security governance). Contradiction candidate: Tier 3/Tier 5 "Owner-only" role gating vs MEM-057 permission-first target (same family as MEM-072). References: MEM-096. Stage B: Yes — verify enforcement lives in `update_horse_identity` RPC and whether the Owner-only gate is role-based or permission-based.

### MEM-094 — mem://ux/horses/registration-classification-step — "Registration Classification Step" — group: ux/horses
```
Step 2 of the horse wizard serves as the authoritative classification surface, organized into three mobile-first sections:
1. Identity: Names, Sex (ذكر/أنثى), and an explicit ToggleGroup for age-stage selection (مهر/حصان or مهرة/فرس).
2. Age & Stage: Birth date/time and a live recommendation banner that compares birth-date truth against the user's manual age-stage selection.
3. Status & Designation: Conditional toggles for 'is_gelded' (male), 'هل هو فحل؟' (stallion), 'هل هي فرس تربية (رمكة)؟' (broodmare), and 'is_pony'. Visibility of these toggles is strictly gated by the selected age-stage; they remain hidden for young-stage selections (مهر/مهرة) and appear only when an adult-stage (حصان/فرس) is selected to ensure semantic integrity.
Secondary details like Breed and Color are relocated to Step 3 to preserve focus on the core classification decisions.
```
Read status: directly read. Classification: Possible Project Knowledge (UX). References: MEM-091, MEM-095, MEM-098. Stage B: No.

### MEM-095 — mem://domain/horses/pony-classification-logic — "Pony Classification Logic" — group: domain/horses
Read status: referenced but inaccessible. Index description preserved verbatim: "'is_pony' user declaration overrides physical height derived rules". Attempted URIs: `mem://domain/horses/pony-classification-logic`, `mem://domain/horses/pony-classification-logic.md`. Classification: Unclassifiable due to inaccessible content. Stage B: Yes — inaccessible-memory recovery target.

### MEM-096 — mem://security/horses/classification-audit-log — "Classification Audit Log" — group: security/horses
```
The platform maintains a 'horse_classification_changes' audit table to track modifications to sensitive identity fields: biological sex, gelding status, breeding roles, and birth date. Each log entry persists the horse ID, field name, old/new values, the actor (user_id), and a mandatory reason text for Tier 5 'Correction Flow' actions (e.g., correcting registration errors in the sex field).
```
Read status: directly read. Classification: Possible Project Knowledge (security). References: MEM-093. Stage B: Yes — verify the table, its columns, and its RLS/grants exist as described.

### MEM-097 — mem://ux/horses/wizard-scroll-behavior — "Wizard Scroll Behavior" — group: ux/horses
```
The horse wizard implements a state-aware scroll contract: the first visit to any step scrolls to the top, while any subsequent revisit—whether moving backward or forward—restores the last saved scroll position for that specific step. This ensures context preservation as the user navigates the 7-step registration flow.
```
Read status: directly read. Classification: Possible Skill-only / narrow UX rule. Stage B: No.

### MEM-098 — mem://ux/horses/wizard-selection-standards — "Wizard Selection Standards" — group: ux/horses
```
To ensure data integrity and explicit user intent, critical select fields like gender in the horse wizard default to a neutral placeholder ('اختر الجنس' / 'Select gender') rather than a presumptive value. This neutral state is reversible; returning the gender field to neutral triggers a cascading reset of all gender-dependent fields—including age category, gelding status, breeding roles, and pregnancy data—to their initial neutral/false states. Similarly, switching the age-stage from an adult category (Horse/Mare) back to a young category (Colt/Filly) resets all adult-only fields (gelding status, breeding roles, pregnancy data, and pony status) to prevent contradictory data. This prevents the persistence of stale or contradictory data in the wizard's state and save payload. Additionally, active selections in UI components like the age-stage ToggleGroup utilize a visually distinct treatment (gold border, white background, medium font weight) to clearly differentiate the chosen option from the muted track.
```
Read status: directly read. Classification: Possible Project Knowledge (global neutral-default rule, already elevated in Core MEM-003). Overlap: MEM-003, MEM-102. Stage B: No.

### MEM-099 — mem://laboratory/ui-isolation-boundary — "Laboratory UI Isolation" — group: laboratory
```
The Laboratory module maintains strict UI isolation from the shared Stable Services catalog to prevent semantic confusion. Full-mode Laboratory tenants are restricted from accessing the shared '/dashboard/services' surface through both sidebar visibility gating and route-level guards. If a user attempts direct URL navigation to the Services page while in a full-mode Lab context, the system triggers a redirect to the main dashboard with an access restriction notice. This isolation ensures Lab operators remain focused on their dedicated lab-specific catalogs and workflows while preventing exposure to irrelevant Stable domain taxonomies.
```
Read status: directly read. Classification: Possible Project Knowledge. References: MEM-086, MEM-061 owner correction (account-aware surfaces). Stage B: Yes — verify the route guard/redirect still exists; also relevant to the cross-account labeling defect in the MEM-061 correction.

### MEM-100 — mem://features/horses/quick-create-bridge-pattern — "Quick Create Bridge Pattern" — group: features/horses
```
The horse quick-create bridge ('QuickCreateHorseDialog') allows lightweight registration (Name, Gender, DOB, Breed, Color) from contextual workflows. It supports a 'defaults' prop to prefill and lock fields (e.g., gender) based on intent while silently applying metadata (e.g. 'age_category', 'breeding_role'). To prevent stale state when switching between different contextual targets (e.g. 'Create Mare' to 'Create Stallion') within the same parent interaction, the dialog must be used with a unique 'key' prop tied to the target to force a React remount and fresh state initialization. Records use 'intake_draft' status to trigger profile completeness checklists. Upon save, the system executes an async refresh and auto-selects the new horse in the parent form.
```
Read status: directly read. Classification: Possible Project Knowledge. Overlap: MEM-004 (Core creation bridge), MEM-081 (creation bridge pattern), MEM-103. Stage B: No.

### MEM-101 — mem://domain/breeding/terminology-standard — "Breeding Terminology Standard" — group: localization/breeding
```
Breeding domain terminology is normalized around 'تناسل' (Reproduction/Breeding) for domain labels, tabs, and titles, replacing generic use of 'تلقيح' (Insemination). Specific Arabic terms: 'تناسل طبيعي (تشبيه)' for natural cover, 'تلقيح اصطناعي (فريش)' for AI Fresh, and 'تلقيح اصطناعي (مجمد)' for AI Frozen. Grammatically, Arabic horse plurals use feminine singular agreement (e.g., 'فحول مؤهلة' for 'eligible stallions'). English labels are aligned as 'Natural Cover (Live Cover)' and 'Artificial Insemination'.
```
Read status: directly read. Classification: Possible Project Knowledge (localization standard). Overlap: open `خيل`/`حصان` terminology decision (Prompt 02) and MEM-091. Stage B: No.

### MEM-102 — mem://features/breeding/reproduction-form-logic — "Reproduction Form Logic" — group: features/breeding
```
Breeding records are initialized with a neutral method selection ('') which is enforced via validation to prevent accidental default assignments. The method selector includes a reversible neutral option ('__neutral__', labeled 'اختر الطريقة' / 'Choose method') as the first item in the list. This allows users to intentionally reset the field to an unselected state, which is required for form submission. Contextual horse creation from this form (Create Mare/Stallion) utilizes a 'quickCreateKey' incrementing counter to force a React remount, ensuring that the child dialog's state is correctly re-initialized with the target-specific defaults (gender and roles) on every open.
```
Read status: directly read. Classification: Possible Project Knowledge / partly Skill-only implementation detail. Overlap: MEM-003, MEM-098, MEM-100. Stage B: No.

### MEM-103 — mem://features/horses/quick-create-minimal-mode — "Quick Create Minimal Mode" — group: features/horses
```
The 'QuickCreateHorseDialog' supports a 'minimal' mode prop designed for highly contextual, low-friction creation flows (e.g., Breeding). In this mode, non-essential fields such as Breed, Color, and Date of Birth are hidden, reducing the required input to only Horse Names while the Gender is injected and locked based on the calling context. This ensures that operators can record a transaction immediately without being burdened by registration-level details, which are deferred to the Horse Registry.
```
Read status: directly read. Classification: Possible Project Knowledge. Overlap: MEM-100, MEM-102. Stage B: No.

Batch A4 totals: expected 19; directly read 17; referenced but inaccessible 2 (MEM-090, MEM-095); empty 0; malformed 0; duplicate/alias 0.

## 3. Bounded Recovery Pass (Project Memory evidence only)

| Target | Attempted URIs | Index reference (preserved) | Result |
| --- | --- | --- | --- |
| MEM-079 | `mem://domain/stable/package-billing-cycles` | "Cycle vocabulary (Daily, Weekly, etc) dictates recurring vs one-time billing logic" | Not recovered — file does not exist; index row 71 present and well-formed |
| MEM-084 | `mem://architecture/finance/doctor-billing-mismatch` | "Known architectural debt where Doctor services are separate from main tenant_services" | Not recovered — file does not exist; index row 76 present and well-formed |
| MEM-090 | `mem://features/stable/room-event-history-strategy`, `+.md` | "History populated entirely from past housing_unit_occupants records" | Not recovered |
| MEM-095 | `mem://domain/horses/pony-classification-logic`, `+.md` | "'is_pony' user declaration overrides physical height derived rules" | Not recovered |

Recovery evidence: `mem://index.md` was re-read in full (109 lines, 8 Core bullets + 95 memory rows); no alias rows, renamed URIs, or spelling variants exist for the four targets — each appears exactly once with the URI attempted. A filesystem check of the project root (`.lovable/` contains only `plan.md`; no `mem/` or `.memory/` directory) confirms memory bodies are not repository-resident and cannot be enumerated from the working tree. No memory content was reconstructed from code, and no index description was promoted to content. Status for all four: **index reference present, memory body inaccessible (stale or missing body)**.

Proposed next verification target (not performed): platform-side Project Memory store listing to determine whether the four bodies were deleted, renamed, or failed to persist — Stage A reconciliation debt carried into Stage B.

## 4. Final Count Reconciliation (MEM-001 → MEM-103)

```
Expected indexed IDs                      = 103
  directly read                           =  99
+ partially readable                      =   0
+ referenced but inaccessible             =   4   (MEM-079, MEM-084, MEM-090, MEM-095)
+ empty                                   =   0
+ malformed                               =   0
+ duplicate or alias representations      =   0
+ other explicitly explained statuses     =   0
                                          -------
                                             103
```
Reconciles exactly to 103. New unindexed entries discovered: 0. (MEM-001–008 are Core bullets read in full from `mem://index.md` and are counted as directly read.)

## 5. Complete Coverage Register (compact)

Legend: DR = directly read, INA = referenced but inaccessible. SB = Stage B flag. CD = contradiction/known-debt flag. No duplicates or aliases exist anywhere in the register (dup/alias flag = No for all 103).

MEM-001–008 (Core bullets in `mem://index.md`), all DR, primary classification Possible Project Knowledge:
- 001 Mobile-first + RTL flex balance — SB No — CD No
- 002 Workspace-class dialog standard — SB No — CD No
- 003 Neutral form defaults + cascade resets — SB No — CD No
- 004 In-Context Creation Bridge — SB No — CD No
- 005 Stacked BilingualName — SB No — CD No
- 006 Hard delete forbidden / archive-deactivate — SB No — CD No
- 007 `hasPermission()` / `has_permission()`, 104 keys, no hardcoded roles — SB Yes (numeric + universality) — CD Yes
- 008 Dual-scope RLS (personal vs organization) — SB Yes — CD Yes
- (Core also states Financial Status Integrity, carried within 008's family per A1 numbering.)

MEM-009–059 (index rows 1–51, delivered in A1/A2): all DR; primary classification Possible Project Knowledge except the Skill-only/narrow-UX items already recorded in A1/A2. Standing SB/CD flags carried forward unchanged: MEM-015 (platform sharing) SB Yes / CD Yes; MEM-048 (unified commercial model) SB Yes / CD Yes; MEM-054 (operational partner scoping) SB Yes / CD Yes; MEM-056 (identity verification) SB Yes; MEM-057 (workspace authorization) SB Yes / CD Yes + owner correction; MEM-058 (104 permission keys) SB Yes / CD Yes.

MEM-060–084 (index rows 52–76, delivered in A3): all DR except MEM-079 and MEM-084 (INA). Standing flags carried forward: MEM-060 (manager baseline, 102 vs 104) SB Yes / CD Yes; MEM-061 (internal cost management) SB Yes / CD Yes + owner correction; MEM-072 (orphan repair, role-based authority) SB Yes / CD Yes; MEM-079 INA / SB Yes; MEM-084 INA / SB Yes / CD Yes (known debt by description).

MEM-085–103 (index rows 77–95, this batch):
- 085 breeding/domain-architecture-standard — DR — Project Knowledge — SB Yes — CD No
- 086 laboratory/domain-architecture-standard — DR — Project Knowledge — SB Yes — CD No (overlap w/ 048/084)
- 087 laboratory/submission-architecture — DR — Project Knowledge — SB Yes (phase-status) — CD No
- 088 features/stable/room-function-reclassification — DR — Project Knowledge — SB No — CD No
- 089 ux/stable/room-detail-panel-standard — DR — Project Knowledge — SB No — CD No
- 090 features/stable/room-event-history-strategy — INA — Unclassifiable — SB Yes — CD Yes (access debt)
- 091 domain/horses/classification-model — DR — Project Knowledge — SB No — CD No
- 092 domain/horses/breeding-eligibility-rules — DR — Project Knowledge — SB No — CD No
- 093 security/horses/classification-governance — DR — Project Knowledge — SB Yes — CD Yes (role-gating vs MEM-057)
- 094 ux/horses/registration-classification-step — DR — Project Knowledge — SB No — CD No
- 095 domain/horses/pony-classification-logic — INA — Unclassifiable — SB Yes — CD Yes (access debt)
- 096 security/horses/classification-audit-log — DR — Project Knowledge — SB Yes — CD No
- 097 ux/horses/wizard-scroll-behavior — DR — Skill-only — SB No — CD No
- 098 ux/horses/wizard-selection-standards — DR — Project Knowledge — SB No — CD No
- 099 laboratory/ui-isolation-boundary — DR — Project Knowledge — SB Yes — CD No
- 100 features/horses/quick-create-bridge-pattern — DR — Project Knowledge — SB No — CD No
- 101 domain/breeding/terminology-standard — DR — Project Knowledge — SB No — CD No
- 102 features/breeding/reproduction-form-logic — DR — Project Knowledge — SB No — CD No
- 103 features/horses/quick-create-minimal-mode — DR — Project Knowledge — SB No — CD No

## 6. Final Preliminary Classification Counts

Primary classifications (mutually exclusive; sum = 103):
- Possible Project Knowledge — 79
- Possible Skill-only — 19
- Possible repository-governance rule — 1
- Possible Current-Prompt-only — 0
- Possible stale rule — 0
- Unclassifiable due to inaccessible content — 4
- Private exclusion — 0
- Not material — 0
- Requires Stage B verification as primary classification — 0 (Stage B is carried as a secondary flag throughout)

Secondary flags (overlapping; reported separately, not summed into the 103):
- Possible contradiction — 9 (MEM-007, 008, 015, 048, 054, 057, 058, 060, 072, plus new 093 → 10 with A4 addition)
- Known-debt qualification — 6 (MEM-061, 079, 084, 090, 095, 084-family catalog fragmentation)
- Scope-exception qualification — 1 (`.lovable/plan.md` governance exception, DEC-RM-DH-003-004)
- Stage B verification flagged — 30 (22 carried from A1–A3 + 8 new in A4: MEM-085, 086, 087, 090, 093, 095, 096, 099)

Stage B flags do not replace primary classifications.

## 7. Final Stage B Verification Register (verification NOT performed)

Carried forward unchanged from A1–A3 (22 items), including: MEM-007/MEM-058/MEM-060 permission-count reconciliation (numeric claim, security risk: high); MEM-008 dual-scope RLS (mutable current-state, high); MEM-015/054/056 cross-tenant sharing RLS coverage (security, high); MEM-048/084 catalog unification vs doctor billing (finance, medium); MEM-057 surviving role checks in `src/hooks/vet/*` (owner correction, implementation-compliance, high); MEM-061 internal cost labeling + zero-amount integrity (owner correction, finance/data-integrity, high); MEM-072 role-based orphan repair authority (contradiction, medium); MEM-079/MEM-084 inaccessible-memory recovery (medium).

New in A4:
- MEM-085 — six breeding tables, `source_mode` enum, `breeding_contracts` exist — target: live schema — risk: low — type: mutable current-state claim.
- MEM-086 — `fn_populate_lab_request_snapshots` / `fn_populate_lrs_service_snapshots` exist as SECURITY DEFINER and populate snapshots — target: live DB functions + triggers — risk: high (cross-tenant RLS bypass) — type: security implementation-compliance.
- MEM-087 — "Phase 1 COMPLETE, Phases 2–4 NOT YET" — target: repository (`useLabRequests`, lab intake UI) — risk: low — type: mutable current-state claim.
- MEM-090 — memory body recovery + "history sourced solely from `housing_unit_occupants`" — target: platform memory store, then repository — risk: low — type: inaccessible-memory recovery target.
- MEM-093 — Tier 3/Tier 5 "Owner-only" gates: role-based or permission-based; enforced server-side in `update_horse_identity` — target: RPC + UI — risk: high (governance/security) — type: contradiction + implementation-compliance.
- MEM-095 — memory body recovery for pony classification logic — target: platform memory store — risk: low — type: inaccessible-memory recovery target.
- MEM-096 — `horse_classification_changes` table, columns, RLS and grants — target: live schema + policies — risk: medium (audit integrity) — type: mutable current-state claim.
- MEM-099 — Lab full-mode route guard/redirect away from `/dashboard/services` still active — target: repository routing + nav config — risk: medium — type: implementation-compliance.

## 8. Final Contradiction and Overlap Register (unresolved by design)

A. Contradiction candidates
1. MEM-015 vs MEM-054 and MEM-056 — cross-tenant sharing model vs granular horse-access and identity-verification scoping.
2. MEM-048 vs MEM-084 — unified commercial catalog claim vs Doctor-services separation debt (MEM-084 body inaccessible; contradiction preserved from index description only).
3. MEM-057 vs surviving legacy role checks and MEM-072 — permission-first target vs role-based authority in code and memory.
4. MEM-058 vs MEM-060 — 104 permission keys vs 102-permission manager baseline.
5. NEW — MEM-093 vs MEM-007/MEM-057 — horse classification Tier 3/Tier 5 gates are expressed as "Owner-only" role gating, contradicting the "no hardcoded roles" permission-first Core rule.
6. NEW (soft) — MEM-086/MEM-099 laboratory isolation vs MEM-048 unified commercial model — two catalogs coexist by design; must be reconciled as intentional isolation rather than contradiction in Stage B.
7. Carried — MEM-061 owner correction vs "Stable Costs" hardcoded labeling in non-Stable accounts.

B. Content overlaps (consolidation candidates; no material distinction to be deleted)
- Creation-bridge family: MEM-004 (Core), MEM-081, MEM-100, MEM-102, MEM-103.
- Neutral-default family: MEM-003 (Core), MEM-098, MEM-102.
- Horse classification family: MEM-091, MEM-092, MEM-093, MEM-094, MEM-095, MEM-096.
- Housing room family: MEM-088, MEM-089, MEM-090 + housing lifecycle entries MEM-062–MEM-075.
- Laboratory family: MEM-086, MEM-087, MEM-099 + MEM-013.
- Localization family: MEM-005, MEM-030, MEM-101.

Thematic reorganization deliberately NOT performed (deferred per §11).

## 9. Boundary, Workstream, and Roadmap Statements

Read-only boundary honored: no code, repository application file, database schema/data, migration, Project Memory, Project Knowledge, Workspace Knowledge, Skill, setting, Roadmap, or Workstream was modified; no Stage B/C/D/E work, no Knowledge installation, no Acceptance, no Closure.

`.lovable/plan.md` disclosure: this file is platform-generated Plan Mode behavior and is the only file written in this run, under the standing scope exception DEC-RM-DH-003-004 (docs/CONVENTIONS.md §11.10).

Workstream persistence: no Workstream was created; no Workstream ID was assigned; no Workstream file was modified; no persistence occurred.

Roadmap impact: RM-DH-003 remains Active; RM-DH-003 / Phase 2 remains CLOSED; WS-DH-2026-0002 remains CLOSED; no new Phase, Sub-phase, Track, or Workstream was created; no Roadmap or registry file was intentionally modified; Batch A4 and the final reconciliation are read-only.

## 10. FINAL STAGE A VERDICT

STAGE A SUBSTANTIVELY COMPLETE — ALL 103 INDEXED IDS RECONCILED WITH SPECIFIED INACCESSIBLE OR PARTIAL ENTRIES

## RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan Mode / Chat Mode (read-only).
2. Operation: Stage A — Batch A4 Final Project Memory Extraction, Recovery Pass, and Final Stage A Reconciliation.
3. Received Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03.
4. Current Stage: Stage A.
5. Current Batch: Batch A4 and final Stage A reconciliation.
6. Continuation Preparation Date and Time: 01-08-2026, 05:56, Asia/Riyadh (UTC+03:00).
7. Lovable Run Start Date and Time: Exact time not recorded; first tool activity observed 2026-08-01 06:05 Asia/Riyadh (03:05 UTC).
8. First evidenced activity: 2026-08-01 03:04 UTC / 06:04 Asia/Riyadh (owner message receipt).
9. Lovable Run End Date and Time: Exact time not recorded.
10. Last evidenced activity: 2026-08-01 03:05:30 UTC / 06:05:30 Asia/Riyadh (`date -u` during repository state check).
11. Final Report Date and Time: Exact time not recorded (same run, immediately after item 10).
12. Timezone and timestamp evidence: sandbox `date -u` output `Sat Aug 1 03:05:30 UTC 2026`; git log timestamps in +0000.
13. Branch: `edit/edt-472d99ae-a217-4bc8-8246-22cd89f8e313` (platform-assigned label; changed from the A3 label, same lineage).
14. HEAD before: `3f3db0f4b3ee6ccbbbc7b3cac3dfe6ea0507ae4f`. HEAD after: unchanged at authoring time; a platform "Update plan" commit for this file may follow.
15. Parent/continuity evidence: HEAD `3f3db0f4b` ("Update plan", 2026-08-01 02:20:26 +0000) descends from `10fb023f4` ("Changes", 02:18:13) and `ec48e1b13` ("Update plan", 2026-08-01 00:34:54) — the Batch A3 planning-artifact commit; linear continuity confirmed.
16. Working Tree before: clean (`git status --porcelain` empty). After: `.lovable/plan.md` modified only.
17. Staged paths: before none; after none (platform commits separately).
18. Unstaged paths: before none; after `.lovable/plan.md`.
19. Untracked non-ignored paths: before none; after none.
20. `.lovable/plan.md` activity: overwritten with the Batch A4 report and final Stage A reconciliation (prior content: 215 lines, Batch A3 report). Commit evidence: platform-managed.
21. Batch A4 range returned: MEM-085 through MEM-103.
22. Batch A4 expected count: 19.
23. Batch A4 directly read count: 17.
24. Batch A4 inaccessible or partial count: 2 (MEM-090, MEM-095).
25. Final reconciled indexed ID count: 103.
26. Final directly read count: 99.
27. Final partially readable count: 0.
28. Final inaccessible count: 4.
29. Final empty count: 0.
30. Final malformed count: 0.
31. Final duplicate or alias count: 0.
32. New unindexed entry count: 0.
33. Final Stage B-flagged count: 30.
34. Project Memory changes: None.
35. Project Knowledge changes: None.
36. Workspace Knowledge changes: None.
37. Skill changes: None.
38. Code changes: None.
39. Database changes: None.
40. Settings changes: None.
41. Roadmap or Workstream changes: None.
42. Exact Stage A verdict: STAGE A SUBSTANTIVELY COMPLETE — ALL 103 INDEXED IDS RECONCILED WITH SPECIFIED INACCESSIBLE OR PARTIAL ENTRIES.
43. Exact stopping point: Batch A4 extraction and the final Stage A reconciliation are complete, with four indexed entries (MEM-079, MEM-084, MEM-090, MEM-095) explicitly unrecovered and preserved as referenced but inaccessible. Stage B has not started. No Project Knowledge text was reconstructed or installed. No thematic consolidation was performed.
44. Exact next permitted owner action: Return the complete Batch A4 and final Stage A reconciliation output to ChatGPT for item-by-item review, gap analysis, and owner-directed thematic consolidation planning.

STOP.
