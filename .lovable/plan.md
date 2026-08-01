# STAGE A — FINAL ID-LINEAGE AUDIT, CROSS-REFERENCE CORRECTION, AND COMPLETE RECONCILIATION REISSUE

Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03 (same prompt, continuation)
Mode: Plan Mode / Chat Mode — read-only. Stage B NOT started. No verification of Memory claims performed.

## 1. ID-LINEAGE INVESTIGATION — EVIDENCE AND FINDING

Evidence read this run:
- Current `mem://index.md` in full: 109 lines. `## Core` block = lines 4–12 → **9 Core bullets** (bullet 9 = "Financial Status Integrity: Never manually set 'paid'/'partial' status on invoices…"). `## Memories` block = lines 15–109 → **95 indexed memory rows**.
- Batch A1 report (`.lovable/plan.md` @ commit `de4a40c8`, 2026-08-01 00:01:59 +0000): line 9 "MEM-001 through MEM-034 (9 Core rules + the first 25 referenced memory files)"; line 24 "### Core rules (MEM-001 – MEM-009)"; line 74 "**MEM-009** — URI: `mem://index.md#Core` (line 9) · Title: Financial status integrity"; line 82 "### Referenced memory files (MEM-010 – MEM-034)"; line 84 "**MEM-010** — `mem://security/community-workspace-rls-logic`".
- Batch A2 report (@ `51433abf`): MEM-035 = `mem://architecture/stable/vet-medical-records-system` … MEM-059 = `mem://security/granular-backend-enforcement` (25 IDs, full URI list extracted).
- Batch A3 report (@ `10fb023f`): line 11 "MEM-060 through MEM-084 (25 index rows 51–75)"; MEM-060 = `mem://security/roles/manager-role-baseline`; MEM-084 = `mem://architecture/finance/doctor-billing-mismatch`.
- Batch A4 report (@ `dc924110`): MEM-085 = `mem://breeding/domain-architecture-standard` … MEM-103 = `mem://features/horses/quick-create-minimal-mode`.

Findings, with evidence:

1. **Did the index change between A1 and A4?** No evidence of change. The index is not repository-resident (project root contains no `mem/` or `.memory/` directory; `.lovable/` holds only `plan.md`), so no diff is available; however every URI cited in A1–A3 still resolves to the same index row order in the current index, and the index header still reads "Updated: 15w ago". Conclusion: no observed change; not provable by diff.

2. **Did Batch A1 miscount the Core block?** No. A1's 9 Core rules match the current index Core block exactly (9 bullets, lines 4–12).

3. **Did Batch A4 miscount the Core block?** **Yes — this is the defect.** A4 asserted "MEM-001–008 = 8 Core bullets" and folded Financial Status Integrity into MEM-008. That assertion is wrong and is hereby withdrawn. The authoritative Core count is 9 (MEM-001 … MEM-009).

4. **Is Financial Status Integrity a distinct ninth Core rule?** Yes — index line 12, delivered as MEM-009 in A1.

5. **Was any referenced memory row shifted?** Yes — a **one-row omission**, not a renumbering. Offset from index row to Official Audit ID is **+9** for index rows 1–47 (MEM-010 … MEM-056) and **+8** for index rows 49–95 (MEM-057 … MEM-103). The change of offset is caused by **index row 48 — `mem://architecture/invitations/unified-invitation-entry` ("Unified Invitation Entry") — never receiving an Official Audit ID in Batch A2**. A2's URI list jumps from `…/unified-partner-management` (row 47, MEM-056) to `mem://security/workspace-authorization-and-guards` (row 49, MEM-057).

6. **Were IDs reassigned between batches?** No. Every Official Audit ID delivered in A1, A2, A3 and A4 maps to exactly one URI, and no URI holds two IDs. The A4 *narrative* about the Core block was wrong; the A4 *ID assignments* (MEM-085–103) are correct and are preserved.

Consequence for totals: 9 Core + 95 index rows = **104 memory objects**, but only **103 Official Audit IDs** have been issued. The 103-ID expectation stated in A1 was based on an undercount of the index rows (94 assumed, 95 actual) that coincidentally cancelled against the omitted row 48. The reconciliation therefore closes at 103 issued IDs **plus one unassigned index row**, reported separately below without renumbering.

## 2. OFFICIAL AUDIT-ID STABILITY — LINEAGE / ALIAS MAP

No renumbering implemented. All previously delivered IDs preserved.

| Official Audit ID | Current index position | Exact URI | Exact title | Prior batch ID | Reconciled ID recommendation | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| MEM-001 … MEM-009 | Core bullets 1–9 (`mem://index.md` lines 4–12) | `mem://index.md#Core` | 9 Core rules (MEM-009 = Financial Status Integrity) | A1 | **Keep as-is (9 Core rules)** | A1 is correct; A4's 8-bullet statement is withdrawn |
| MEM-008 | Core bullet 8 | `mem://index.md#Core` | Dual RLS scoping model | A1 | Keep; **do not merge MEM-009 into MEM-008** | A4 merge was an error, not an owner-approved remap |
| MEM-010 … MEM-056 | index rows 1–47 | as registered in §4 | as registered in §4 | A1 / A2 | Keep (offset +9) | stable |
| — (unassigned) | index row 48 | `mem://architecture/invitations/unified-invitation-entry` | Unified Invitation Entry | none | **Temporary ID `MEM-TEMP-A5-001`; owner approval required before any permanent ID** | omitted in A2; assigning a permanent ID would renumber MEM-057+ |
| MEM-057 … MEM-103 | index rows 49–95 | as registered in §4 | as registered in §4 | A2 / A3 / A4 | Keep (offset +8) | stable; renumbering would break owner-reviewed IDs |

## 3. CROSS-REFERENCE INTEGRITY CORRECTION TABLE

| Source MEM ID (report) | Incorrect referenced ID | Referenced title as claimed | Actual ID and title | Cause | Corrected reference |
| --- | --- | --- | --- | --- | --- |
| A4 §2 MEM-086 | MEM-013 | "Horse Unification / lab_horses" | MEM-014 — Horse Unification Strategy (MEM-013 = Party/Horse Relationships) | off-by-one within A1 range | MEM-014 |
| A4 §8 overlap "Laboratory family" | MEM-013 | Horse unification | MEM-014 — Horse Unification Strategy | same | MEM-014 |
| A4 §2 MEM-100 | MEM-081 | "creation bridge pattern" | MEM-083 — Creation Bridge Pattern (MEM-081 = Services & Packages Truthfulness) | title mismatch / batch-numbering mismatch | MEM-083 |
| A4 §8 overlap "Creation-bridge family" | MEM-081 | Creation bridge | MEM-083 — Creation Bridge Pattern | same | MEM-083 |
| A4 §5 register line | MEM-048 | "unified commercial model" | MEM-038 — Unified Commercial Model (MEM-048 = Consultation & Lab Grounding) | title mismatch | MEM-038 for the catalog claim; MEM-048 remains correct for the Doctor-billing contradiction pairing recorded in A2/A3 |
| A4 §5 register line | MEM-056 | "identity verification" | MEM-055 — Identity Verification Rules (MEM-056 = Unified Partner Management) | off-by-one | MEM-055 |
| A4 §8 overlap "Localization family" | MEM-030 | bilingual naming | MEM-029 — Bilingual Naming Architecture (MEM-030 = Housing Facility Taxonomy) | off-by-one | MEM-029 |
| A4 §5 Core register | MEM-007/MEM-008 collapse | "Financial Status Integrity carried within 008's family" | MEM-009 — Financial Status Integrity is a distinct Core rule | Core miscount | MEM-009 restored |
| A4 §6 counts | "Possible repository-governance rule — 1" | implied a MEM ID | no MEM ID; the item was `.lovable/plan.md` / DEC-RM-DH-003-004 | category misuse | category removed (count 0) |
| A4 §6 counts | contradiction "9 … → 10" | two conflicting figures | single figure, see §6 | arithmetic inconsistency | 11 (exact list in §6) |

References verified correct (no defect): MEM-085→MEM-019 (Billing Linkage Pattern) and MEM-039 (Provider Cost Integration); MEM-086→MEM-099; MEM-089→MEM-067, MEM-062; MEM-093→MEM-057, MEM-072, MEM-096; MEM-098→MEM-003; MEM-100→MEM-004; MEM-091/092/094 intra-family references. All A1–A3 internal references were re-checked against the URI maps extracted from commits `de4a40c8`, `51433abf`, `10fb023f`; no further ID/title mismatches were found.

## 4. COMPLETE COVERAGE REGISTER — 103 ROWS

Legend — Read: DR = directly read, INA = referenced but inaccessible. Class (primary, mutually exclusive): PK = possible Project Knowledge, SK = possible Skill-only, SBP = requires Stage B verification as primary classification, UNC = unclassifiable (inaccessible). Flags: SB = Stage B, CD = contradiction, KD = known debt, SE = scope exception, DUP = duplicate/alias, INAF = inaccessible, OC = owner correction. XRef = cross-reference integrity status (OK / CORRECTED per §3).

| ID | Row | URI / Core source | Title | Read | Class | SB | CD | KD | SE | DUP | INAF | OC | Batch | XRef |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MEM-001 | Core 1 | `mem://index.md#Core` | Mobile-first and RTL core rule | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-002 | Core 2 | `mem://index.md#Core` | Workspace-class dialog layout | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-003 | Core 3 | `mem://index.md#Core` | Neutral form defaults and cascade resets | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-004 | Core 4 | `mem://index.md#Core` | In-Context Creation Bridge | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-005 | Core 5 | `mem://index.md#Core` | Bilingual identity display | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-006 | Core 6 | `mem://index.md#Core` | Archive/Deactivate over hard delete | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-007 | Core 7 | `mem://index.md#Core` | Permission-based authorization (104 keys) | DR | PK | Yes | Yes | No | No | No | No | No | A1 | OK |
| MEM-008 | Core 8 | `mem://index.md#Core` | Dual RLS scoping model | DR | PK | Yes | No | No | No | No | No | No | A1 | CORRECTED (A4 merge withdrawn) |
| MEM-009 | Core 9 | `mem://index.md#Core` | Financial status integrity | DR | PK | No | No | No | No | No | No | No | A1 | CORRECTED (restored) |
| MEM-010 | 1 | `mem://security/community-workspace-rls-logic` | Community Workspace RLS | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-011 | 2 | `mem://features/finance/credit-limit-enforcement` | Credit Limit Enforcement | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-012 | 3 | `mem://features/finance/client-statement-system` | Client Statement System | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-013 | 4 | `mem://architecture/party-horse-relationship-model` | Party/Horse Relationships | DR | SBP | Yes | No | No | No | No | No | No | A1 | OK |
| MEM-014 | 5 | `mem://features/horse-unification-strategy` | Horse Unification Strategy | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-015 | 6 | `mem://architecture/platform-sharing-reference-pattern` | Platform Sharing Reference Pattern | DR | PK | Yes | Yes | No | No | No | No | No | A1 | OK |
| MEM-016 | 7 | `mem://architecture/notification-system-standard` | Notification System Standard | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-017 | 8 | `mem://domain/horse-owner-tenant-isolation` | Horse Owner Tenant Isolation | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-018 | 9 | `mem://architecture/shared-client-registry-and-identity` | Shared Client Registry | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-019 | 10 | `mem://architecture/finance/billing-linkage-pattern` | Billing Linkage Pattern | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-020 | 11 | `mem://architecture/stable/housing-and-facility-management` | Housing & Facility Management | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-021 | 12 | `mem://architecture/stable/boarding-stay-and-care-lifecycle` | Boarding Stay Lifecycle | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-022 | 13 | `mem://architecture/stable/horse-registry-and-onboarding-logic` | Horse Registry Onboarding | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-023 | 14 | `mem://features/stable/movement-and-logistics` | Movement & Logistics | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-024 | 15 | `mem://finance/payment-status-integrity-rule` | Payment Status Integrity | DR | PK | Yes | No | No | No | No | No | No | A1 | OK |
| MEM-025 | 16 | `mem://finance/invoice-accounting-lifecycle` | Invoice Accounting Lifecycle | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-026 | 17 | `mem://architecture/horses/unified-profile-architecture` | Unified Profile Architecture | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-027 | 18 | `mem://architecture/finance/event-driven-invoicing-pattern` | Event-Driven Invoicing Pattern | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-028 | 19 | `mem://security/client-tenant-isolation` | Client Tenant Isolation | DR | PK | No | No | No | No | No | No | No | A1 | OK |
| MEM-029 | 20 | `mem://localization/bilingual-naming-architecture` | Bilingual Naming Architecture | DR | PK | Yes | No | No | No | No | No | No | A1 | CORRECTED (A4 cited as MEM-030) |
| MEM-030 | 21 | `mem://domain/stable/housing-facility-taxonomy` | Housing Facility Taxonomy | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-031 | 22 | `mem://localization/stable/account-aware-housing-terminology` | Account-Aware Housing Terminology | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-032 | 23 | `mem://architecture/stable/housing-type-aware-surfaces` | Housing Type-Aware Surfaces | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-033 | 24 | `mem://features/stable/housing-unit-and-numbering-setup` | Housing Unit Numbering Setup | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-034 | 25 | `mem://architecture/stable/housing-paddock-occupancy-model` | Housing Paddock Occupancy Model | DR | SK | No | No | No | No | No | No | No | A1 | OK |
| MEM-035 | 26 | `mem://architecture/stable/vet-medical-records-system` | Vet Medical Records System | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-036 | 27 | `mem://features/stable/vet-treatment-and-medication-logic` | Vet Treatment & Medication Logic | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-037 | 28 | `mem://features/stable/vaccination-and-health-management` | Vaccination & Health Management | DR | SK | Yes | No | No | No | No | No | No | A2 | OK |
| MEM-038 | 29 | `mem://architecture/stable/unified-commercial-model` | Unified Commercial Model | DR | PK | No | Yes | No | No | No | No | No | A2 | CORRECTED (A4 cited as MEM-048) |
| MEM-039 | 30 | `mem://architecture/stable/provider-cost-integration` | Provider Cost Integration | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-040 | 31 | `mem://features/stable/provider-markup-logic` | Provider Markup Logic | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-041 | 32 | `mem://features/stable/financial-traceability-system` | Financial Traceability System | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-042 | 33 | `mem://architecture/finance/invoice-item-attribution` | Invoice Item Attribution | DR | PK | No | No | No | No | No | No | No | A2 | OK |
| MEM-043 | 34 | `mem://architecture/stable/boarding-period-tracking` | Boarding Period Tracking | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-044 | 35 | `mem://finance/tax-configuration-standard` | Tax Configuration Standard | DR | PK | Yes | No | No | No | No | No | No | A2 | OK |
| MEM-045 | 36 | `mem://architecture/stable/boarding-proration-engine` | Boarding Proration Engine | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-046 | 37 | `mem://architecture/finance/tenant-currency-model` | Tenant Currency Model | DR | PK | No | No | No | No | No | No | No | A2 | OK |
| MEM-047 | 38 | `mem://architecture/stable/commercial-truth-hierarchy` | Commercial Truth Hierarchy | DR | PK | No | No | No | No | No | No | No | A2 | OK |
| MEM-048 | 39 | `mem://features/finance/consultation-and-lab-grounding` | Consultation & Lab Grounding | DR | SK | Yes | Yes | No | No | No | No | No | A2 | OK |
| MEM-049 | 40 | `mem://ux/mobile-first-design-standard` | Mobile-First Design Standard | DR | PK | No | No | No | No | No | No | No | A2 | OK |
| MEM-050 | 41 | `mem://architecture/identity/unified-people-model` | Unified People Model | DR | PK | No | No | No | No | No | No | No | A2 | OK |
| MEM-051 | 42 | `mem://architecture/invitations/invitation-scoping-standard` | Invitation Scoping Standard | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-052 | 43 | `mem://security/connections/partnership-integrity` | Partnership Integrity | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-053 | 44 | `mem://features/team/team-partners-hub` | Team & Partners Hub | DR | SK | No | No | No | No | No | No | No | A2 | OK |
| MEM-054 | 45 | `mem://architecture/connections/operational-partner-scoping` | Operational Partner Scoping | DR | PK | Yes | Yes | Yes | No | No | No | No | A2 | OK |
| MEM-055 | 46 | `mem://security/invitations/identity-verification-rules` | Identity Verification Rules | DR | PK | No | No | No | No | No | No | No | A2 | CORRECTED (A4 cited as MEM-056) |
| MEM-056 | 47 | `mem://architecture/connections/unified-partner-management` | Unified Partner Management | DR | SK | Yes | Yes | Yes | No | No | No | No | A2 | OK |
| MEM-057 | 49 | `mem://security/workspace-authorization-and-guards` | Workspace Authorization & Guards | DR | PK | Yes | Yes | No | No | No | No | Yes | A2 | OK |
| MEM-058 | 50 | `mem://security/permission-system-vocabulary` | Permission System Vocabulary | DR | PK | Yes | Yes | No | No | No | No | No | A2 | OK |
| MEM-059 | 51 | `mem://security/granular-backend-enforcement` | Granular Backend Enforcement | DR | PK | Yes | No | No | Yes | No | No | No | A2 | OK |
| MEM-060 | 52 | `mem://security/roles/manager-role-baseline` | Manager Role Baseline | DR | PK | Yes | Yes | No | No | No | No | No | A3 | OK |
| MEM-061 | 53 | `mem://features/stable/internal-cost-management` | Internal Cost Management | DR | SK | Yes | No | Yes | No | No | No | Yes | A3 | OK |
| MEM-062 | 54 | `mem://architecture/stable/housing-lifecycle-model` | Housing Lifecycle Model | DR | PK | Yes | No | No | No | No | No | No | A3 | OK |
| MEM-063 | 55 | `mem://features/stable/housing-visibility-and-filtering` | Housing Visibility & Filtering | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-064 | 56 | `mem://features/stable/housing-unit-integrity-and-refresh` | Housing Unit Integrity & Refresh | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-065 | 57 | `mem://features/finance/manual-invoice-management` | Manual Invoice Management | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-066 | 58 | `mem://ux/stable/housing-creation-unification` | Housing Creation Unification | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-067 | 59 | `mem://ux/stable/complex-dialog-layout-standard` | Complex Dialog Layout Standard | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-068 | 60 | `mem://architecture/stable/housing-room-setup-core` | Housing Room Setup Core | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-069 | 61 | `mem://architecture/stable/housing-admissions-unification-model` | Housing Admissions Unification | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-070 | 62 | `mem://features/stable/housing-unit-assignment-flows` | Housing Unit Assignment Flows | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-071 | 63 | `mem://features/stable/housing-vacate-and-checkout-logic` | Housing Vacate & Checkout Logic | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-072 | 64 | `mem://features/stable/housing-orphan-repair-logic` | Housing Orphan Repair Logic | DR | SK | Yes | Yes | No | No | No | No | No | A3 | OK |
| MEM-073 | 65 | `mem://architecture/stable/movement-rpc-contract-standard` | Movement RPC Contract Standard | DR | SK | Yes | No | No | No | No | No | No | A3 | OK |
| MEM-074 | 66 | `mem://ux/rtl-layout-quality-standard` | RTL Layout Quality Standard | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-075 | 67 | `mem://ux/stable/arrivals-departures-toolbar-layout` | Arrivals & Departures Toolbar Layout | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-076 | 68 | `mem://architecture/stable/service-package-model` | Service Package Model | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-077 | 69 | `mem://architecture/stable/service-package-organization` | Service Package Organization | DR | PK | Yes | No | No | No | No | No | No | A3 | OK |
| MEM-078 | 70 | `mem://domain/stable/service-taxonomy` | Service Taxonomy | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-079 | 71 | `mem://domain/stable/package-billing-cycles` | Package Billing Cycles | INA | UNC | Yes | No | Yes | No | No | Yes | No | A3 | OK |
| MEM-080 | 72 | `mem://features/finance/invoice-package-consumption` | Invoice Package Consumption | DR | SK | No | No | No | No | No | No | No | A3 | OK |
| MEM-081 | 73 | `mem://ux/stable/services-packages-truthfulness-standard` | Services & Packages Truthfulness | DR | PK | No | No | No | No | No | No | No | A3 | CORRECTED (A4 cited it as Creation Bridge) |
| MEM-082 | 74 | `mem://domain/stable/package-types` | Package Types | DR | PK | No | No | No | No | No | No | No | A3 | OK |
| MEM-083 | 75 | `mem://ux/stable/creation-bridge-pattern` | Creation Bridge Pattern | DR | PK | No | No | No | No | No | No | No | A3 | CORRECTED (restored as the creation-bridge reference) |
| MEM-084 | 76 | `mem://architecture/finance/doctor-billing-mismatch` | Doctor Billing Mismatch | INA | UNC | Yes | Yes | Yes | No | No | Yes | No | A3 | OK |
| MEM-085 | 77 | `mem://breeding/domain-architecture-standard` | Breeding Domain Architecture | DR | PK | Yes | No | No | No | No | No | No | A4 | OK |
| MEM-086 | 78 | `mem://laboratory/domain-architecture-standard` | Laboratory Domain Architecture | DR | PK | Yes | No | No | No | No | No | No | A4 | CORRECTED (ref MEM-013 → MEM-014) |
| MEM-087 | 79 | `mem://laboratory/submission-architecture` | Lab Submission Parent-Child Architecture | DR | PK | Yes | No | No | No | No | No | No | A4 | OK |
| MEM-088 | 80 | `mem://features/stable/room-function-reclassification` | Room Function Reclassification | DR | PK | Yes | No | No | No | No | No | No | A4 | OK (SB added per §7 review flag) |
| MEM-089 | 81 | `mem://ux/stable/room-detail-panel-standard` | Room Detail Panel Standard | DR | PK | No | No | No | No | No | No | No | A4 | OK |
| MEM-090 | 82 | `mem://features/stable/room-event-history-strategy` | Room Event History Strategy | INA | UNC | Yes | No | Yes | No | No | Yes | No | A4 | OK |
| MEM-091 | 83 | `mem://domain/horses/classification-model` | Horse Classification Model | DR | PK | No | No | No | No | No | No | No | A4 | OK |
| MEM-092 | 84 | `mem://domain/horses/breeding-eligibility-rules` | Breeding Eligibility Rules | DR | PK | No | No | No | No | No | No | No | A4 | OK |
| MEM-093 | 85 | `mem://security/horses/classification-governance` | Horse Classification Governance | DR | PK | Yes | Yes | No | No | No | No | No | A4 | OK |
| MEM-094 | 86 | `mem://ux/horses/registration-classification-step` | Registration Classification Step | DR | PK | Yes | No | No | No | No | No | No | A4 | OK (SB added per §7 pony question) |
| MEM-095 | 87 | `mem://domain/horses/pony-classification-logic` | Pony Classification Logic | INA | UNC | Yes | No | Yes | No | No | Yes | No | A4 | OK |
| MEM-096 | 88 | `mem://security/horses/classification-audit-log` | Classification Audit Log | DR | PK | Yes | No | No | No | No | No | No | A4 | OK |
| MEM-097 | 89 | `mem://ux/horses/wizard-scroll-behavior` | Wizard Scroll Behavior | DR | SK | No | No | No | No | No | No | No | A4 | OK |
| MEM-098 | 90 | `mem://ux/horses/wizard-selection-standards` | Wizard Selection Standards | DR | PK | Yes | No | No | No | No | No | No | A4 | OK (SB added per §7 pony question) |
| MEM-099 | 91 | `mem://laboratory/ui-isolation-boundary` | Laboratory UI Isolation | DR | PK | Yes | No | No | No | No | No | No | A4 | OK |
| MEM-100 | 92 | `mem://features/horses/quick-create-bridge-pattern` | Quick Create Bridge Pattern | DR | PK | Yes | No | No | No | No | No | No | A4 | CORRECTED (ref MEM-081 → MEM-083); SB added per §7 disclosure flag |
| MEM-101 | 93 | `mem://domain/breeding/terminology-standard` | Breeding Terminology Standard | DR | PK | No | No | No | No | No | No | No | A4 | OK |
| MEM-102 | 94 | `mem://features/breeding/reproduction-form-logic` | Reproduction Form Logic | DR | PK | No | No | No | No | No | No | No | A4 | OK |
| MEM-103 | 95 | `mem://features/horses/quick-create-minimal-mode` | Quick Create Minimal Mode | DR | PK | Yes | No | No | No | No | No | No | A4 | OK (SB added per §7 disclosure flag) |

Row count: **103**. Separately, one index row carries no Official Audit ID:

| Temporary ID | Current index position | URI | Title | Read | Status |
| --- | --- | --- | --- | --- | --- |
| MEM-TEMP-A5-001 | 48 | `mem://architecture/invitations/unified-invitation-entry` | Unified Invitation Entry | not yet read in Stage A | Omitted from Batch A2; no permanent ID assigned pending owner approval |

## 5. COUNT RECONCILIATION (CORRECTED)

```
Official Audit IDs issued                 = 103
  directly read                           =  99
+ partially readable                      =   0
+ referenced but inaccessible             =   4   (MEM-079, MEM-084, MEM-090, MEM-095)
+ empty / malformed / duplicate / alias   =   0
                                          -------
                                             103

Current index objects                     = 104   (9 Core bullets + 95 memory rows)
  covered by Official Audit IDs           = 103
+ unassigned (MEM-TEMP-A5-001, row 48)    =   1
```

## 6. PRIMARY CLASSIFICATION COUNTS (RECALCULATED — SUM = 103)

- **Possible Project Knowledge — 55**: MEM-001, 002, 003, 004, 005, 006, 007, 008, 009, 015, 017, 019, 024, 027, 028, 029, 038, 042, 044, 046, 047, 049, 050, 054, 055, 057, 058, 059, 060, 062, 067, 069, 074, 076, 077, 078, 081, 082, 083, 085, 086, 087, 088, 089, 091, 092, 093, 094, 096, 098, 099, 100, 101, 102, 103.
- **Possible Skill-only — 43**: MEM-010, 011, 012, 014, 016, 018, 020, 021, 022, 023, 025, 026, 030, 031, 032, 033, 034, 035, 036, 037, 039, 040, 041, 043, 045, 048, 051, 052, 053, 056, 061, 063, 064, 065, 066, 068, 070, 071, 072, 073, 075, 080, 097.
- **Requires Stage B verification as primary classification — 1**: MEM-013.
- **Unclassifiable due to inaccessible content — 4**: MEM-079, MEM-084, MEM-090, MEM-095.
- **Possible repository-governance rule — 0.** The A4 count of 1 was an error: the governance item was `.lovable/plan.md` / DEC-RM-DH-003-004, which is not a Memory ID and is excluded.
- Possible Current-Prompt-only — 0. Possible stale rule — 0. Private exclusion — 0. Not material — 0.

55 + 43 + 1 + 4 = **103**.

## 7. SECONDARY FLAG COUNTS (RECALCULATED — EXACT LISTS)

- **Contradiction candidates — 11**: MEM-007, MEM-015, MEM-038, MEM-048, MEM-054, MEM-056, MEM-057, MEM-058, MEM-060, MEM-072, MEM-084, MEM-093. *(Count restated: the list holds 12 IDs — MEM-038 is added by the §3 correction that the unified-commercial-model claim belongs to MEM-038, not MEM-048; both sides of that pairing are retained, so the exact final contradiction count is **12**, superseding both the "9" and the "10" figures in A4.)*
- **Known-debt qualification — 6**: MEM-054, MEM-056, MEM-061, MEM-079, MEM-084, MEM-090, MEM-095 → exact count **7**.
- **Scope-exception qualification — 1**: MEM-059 (Laboratory / Academy / reference-table exception recorded in A2). `.lovable/plan.md` and DEC-RM-DH-003-004 are not counted.
- **Stage B verification — 30**: MEM-007, 008, 013, 015, 024, 029 (A1); MEM-037, 044, 048, 054, 056, 057, 058, 059 (A2); MEM-060, 061, 062, 072, 073, 077, 079, 084 (A3); MEM-085, 086, 087, 090, 093, 095, 096, 099 (A4). Plus **4 added by the §10 review flags carried forward**: MEM-088, MEM-094, MEM-098, MEM-100, MEM-103 → exact final Stage B count **35**.
- **Owner correction — 2**: MEM-057, MEM-061.
- **Inaccessible — 4**: MEM-079, MEM-084, MEM-090, MEM-095.
- **Duplicate / alias — 0**.

## 8. COMPLETE STAGE B VERIFICATION REGISTER (35 rows; no verification performed)

| ID | URI / Title | Exact claim to verify | Category | Evidence source | Targets | Risk | Owner corr. | Contradiction | Recovery | Stage B stopping question |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MEM-007 | Core 7 — Permission-based authorization | "104 granular keys; no hardcoded roles" | numeric + universality | live DB + repo | `permission_definitions`, `has_permission()`, `hasPermission()` | High | No | Yes | No | What is the live key count and where do hardcoded role checks survive? |
| MEM-008 | Core 8 — Dual RLS scoping | personal vs organization scoping is current | mutable current-state | live RLS | policies on community/domain tables | High | No | No | No | Is dual scoping still the enforced model everywhere it is claimed? |
| MEM-013 | Party/Horse Relationships | junction-table M:N role model is current | primary Stage B | live schema | party/horse junction table | Medium | No | No | No | Does the junction model still hold, and is it authoritative for ownership? |
| MEM-015 | Platform Sharing Reference Pattern | "domain tables implement shared access policies" | universality | live RLS | connections, grants, domain RLS | High | No | Yes | No | Which domain tables actually implement the 3-layer pattern? |
| MEM-024 | Payment Status Integrity | status derived only from ledger | implementation-compliance | repo + DB | invoice status writers, `post_payment_session` | High | No | No | No | Can any code path set 'paid'/'partial' directly? |
| MEM-029 | Bilingual Naming Architecture | display standard matches Correction 6 | implementation-compliance | repo | `<BilingualName />` | Low | No | No | No | Does current display honour language primacy? |
| MEM-037 | Vaccination & Health Management | Arabic-first localization parity | implementation-compliance | repo | `scripts/audit-i18n.ts` | Low | No | No | No | Is localization parity enforced by audit? |
| MEM-044 | Tax Configuration Standard | "all financial flows" universality | universality | repo + DB | `src/lib/taxUtils.ts`, tax columns | Medium | No | No | No | Which flows actually apply layered tax? |
| MEM-048 | Consultation & Lab Grounding | consultations/lab use `tenant_services` + shared `computeTax` | implementation-compliance | repo + DB | `computeTax`, doctor services tables | Medium | No | Yes | No | Do Doctor/Lab invoices ground in the shared catalog? |
| MEM-054 | Operational Partner Scoping | cross-tenant horse access gap (known debt) | known debt | live RLS | `connection_horse_access`, `horses`, `vet_treatments` | High | No | Yes | No | Does the RLS gap still exist? |
| MEM-056 | Unified Partner Management | residual sharing debt in domain tables | known debt | live RLS | `lab_results`, `vet_records`, `breeding_records`, `lab_requests` | High | No | Yes | No | Which domain tables still lack partner-scoped policies? |
| MEM-057 | Workspace Authorization & Guards | "replaces legacy role checks" universality | owner correction + compliance | repo | `WorkspaceRouteGuard.tsx`, `src/hooks/vet/*` | High | Yes | Yes | No | Are surviving role checks authorization, presentation, fallback, or dead code? |
| MEM-058 | Permission System Vocabulary | 104 keys | numeric | live DB | `permission_definitions` | High | No | Yes | No | What is the live count? |
| MEM-059 | Granular Backend Enforcement | `has_permission()` in operational RLS, with exceptions | scope exception | live RLS | policy bodies | High | No | No | No | Which tables remain outside the enforcement contract? |
| MEM-060 | Manager Role Baseline | manager = all except `admin.permissions.delegate` (102) | numeric + contradiction | live DB | role/bundle tables | High | No | Yes | No | Which exact keys does manager hold? |
| MEM-061 | Internal Cost Management | cross-account labeling + zero-amount integrity | owner correction | repo + live data | `financial_entries`, cost UI labels | High | Yes | No | No | What is the authoritative cost source, and why are amounts 0? |
| MEM-062 | Housing Lifecycle Model | delete eligibility enforced server-side | implementation-compliance | live DB | constraints/triggers | Medium | No | No | No | Is delete eligibility server-enforced? |
| MEM-072 | Housing Orphan Repair Logic | owner/manager gate | contradiction | repo | orphan repair UI/RPC | Medium | No | Yes | No | Is the gate role-based or permission-based? |
| MEM-073 | Movement RPC Contract Standard | exactly one 19-parameter signature | numeric | live DB | `record_horse_movement_with_housing` | Medium | No | No | No | How many signatures exist? |
| MEM-077 | Service Package Organization | packages centralized in `src/services` | implementation-compliance | repo | `src/services` | Low | No | No | No | Is the centralization still true? |
| MEM-079 | Package Billing Cycles | memory body missing | recovery | platform memory store | index row 71 | Medium | No | No | Yes | Was the body deleted, renamed, or never persisted? |
| MEM-084 | Doctor Billing Mismatch | memory body missing; debt vs MEM-038/048 | recovery + contradiction | platform memory store, then DB | doctor services vs `tenant_services` | Medium | No | Yes | Yes | Is the debt current, and can the body be recovered? |
| MEM-085 | Breeding Domain Architecture | six tables, `source_mode`, `breeding_contracts` | mutable current-state | live schema | breeding tables | Low | No | No | No | Does the schema match? |
| MEM-086 | Laboratory Domain Architecture | SECURITY DEFINER snapshot triggers | security compliance | live DB | `fn_populate_lab_request_snapshots`, `fn_populate_lrs_service_snapshots` | High | No | No | No | Do the triggers exist and are they safe? |
| MEM-087 | Lab Submission Architecture | 1 parent + N children created **atomically**; Phase 1 complete | implementation-compliance | repo + DB | `useLabRequests.createSubmission()`, any RPC/transaction | Medium | No | No | No | Is atomicity backed by an RPC/transaction or only sequential client inserts? |
| MEM-088 | Room Function Reclassification | occupancy guardrails enforced | implementation-compliance | repo + DB | unit update path, constraints/triggers | Medium | No | No | No | Are guardrails server-side or only AlertDialog/UI? |
| MEM-090 | Room Event History Strategy | memory body missing; history from `housing_unit_occupants` | recovery | platform memory store, then repo | history query | Low | No | No | Yes | Can the body be recovered; is the source table correct? |
| MEM-093 | Horse Classification Governance | Tier 3/5 "Owner-only"; "any operator" for Tier 1; irreversibility | contradiction + governance | repo + DB | `update_horse_identity`, wizard UI | High | No | Yes | No | Is authority permission-based, does "any operator" mean authorized operator, and does a controlled correction path exist for irreversible fields? |
| MEM-094 | Registration Classification Step | pony/status toggle visibility gated by age stage | domain question | repo | Step 2 wizard | Medium | No | No | No | Is Pony correctly independent of age stage? |
| MEM-095 | Pony Classification Logic | memory body missing | recovery | platform memory store | index row 87 | Medium | No | No | Yes | Can the body be recovered? |
| MEM-096 | Classification Audit Log | table, columns, RLS/grants | mutable current-state | live schema | `horse_classification_changes` | Medium | No | No | No | Does the audit table exist and is it protected? |
| MEM-098 | Wizard Selection Standards | age-stage reset clears pony status | domain question | repo | wizard reset logic | Medium | No | No | No | Should Pony survive an age-stage reset? |
| MEM-099 | Laboratory UI Isolation | route guard/redirect active | implementation-compliance | repo | routing + nav config | Medium | No | No | No | Is the guard still present? |
| MEM-100 | Quick Create Bridge Pattern | locked injected gender/role | UX disclosure | repo | `QuickCreateHorseDialog` | Medium | No | No | No | Is injected metadata visibly disclosed when locked? |
| MEM-103 | Quick Create Minimal Mode | minimal mode hides domain-significant metadata | UX disclosure | repo | `QuickCreateHorseDialog` minimal mode | Medium | No | No | No | Is locked gender/role disclosed in minimal mode? |

Row count: **35** — matches the corrected Stage B count in §7.

## 9. INACCESSIBLE MEMORY STATUS (PRESERVED)

| ID | Index row | URI | Index description (index text only) | Recovery evidence | Stage B recovery target |
| --- | --- | --- | --- | --- | --- |
| MEM-079 | 71 | `mem://domain/stable/package-billing-cycles` | "Cycle vocabulary (Daily, Weekly, etc) dictates recurring vs one-time billing logic" | Direct URI + `.md` variant attempted in A3 and again in A4: "does not exist". Index row present, well-formed, no alias | Platform memory store: deleted, renamed, or never persisted? |
| MEM-084 | 76 | `mem://architecture/finance/doctor-billing-mismatch` | "Known architectural debt where Doctor services are separate from main tenant_services" | Same attempts and result | Same, then reconcile with MEM-038/MEM-048 |
| MEM-090 | 82 | `mem://features/stable/room-event-history-strategy` | "History populated entirely from past housing_unit_occupants records" | Direct URI + `.md` variant attempted in A4: "does not exist" | Same |
| MEM-095 | 87 | `mem://domain/horses/pony-classification-logic` | "'is_pony' user declaration overrides physical height derived rules" | Direct URI + `.md` variant attempted in A4: "does not exist" | Same |

No content reconstructed from code or from index descriptions.

## 10. CARRIED-FORWARD REVIEW FLAGS (recorded, not verified, not implemented)

1. **MEM-087** — "createSubmission() creates 1 parent + N children atomically" requires confirmation of a transactional RPC or backend transaction; a frontend hook alone cannot guarantee atomicity.
2. **MEM-088** — reclassification guardrails require backend/server-side enforcement evidence, not only AlertDialog/UI checks.
3. **MEM-093** — "Owner-only" must be reconciled with Permission-based Architecture; "freely editable by any operator" must mean an appropriately authorized operator; irreversible classification fields require a controlled correction path for registration errors.
4. **MEM-094 / MEM-095 / MEM-098** — pony visibility and age-stage reset behaviour may conflict with Pony being a classification independent of age stage. Preserved as an **unresolved domain question** until MEM-095 is recovered or Stage B evidence is reviewed.
5. **MEM-100 / MEM-103** — context-injected Gender or Breeding Role must be visibly disclosed to the operator even when locked; domain-significant metadata must not be silently hidden.

Previously registered owner corrections (MEM-057, MEM-061) remain in force unchanged, including the full 13-point MEM-061 correction recorded in the Batch A4 report.

## 11. CONTRADICTION AND OVERLAP REGISTER (unresolved by design)

Contradiction candidates (12): MEM-007, MEM-015, MEM-038, MEM-048, MEM-054, MEM-056, MEM-057, MEM-058, MEM-060, MEM-072, MEM-084, MEM-093.
Pairings: MEM-015 vs MEM-054/MEM-056; MEM-038/MEM-048 vs MEM-084; MEM-057 vs surviving role checks and MEM-072; MEM-058 vs MEM-060; MEM-093 vs MEM-007/MEM-057; MEM-061 owner correction vs hardcoded "Stable Costs" labeling.

Overlap families (consolidation candidates, nothing deleted): creation bridge — MEM-004, MEM-083, MEM-100, MEM-102, MEM-103; neutral defaults — MEM-003, MEM-081, MEM-098, MEM-102; horse classification — MEM-091 … MEM-096; housing rooms — MEM-062 … MEM-075, MEM-088, MEM-089, MEM-090; laboratory — MEM-014, MEM-086, MEM-087, MEM-099; localization — MEM-005, MEM-029, MEM-031, MEM-101; permissions — MEM-007, MEM-057, MEM-058, MEM-059, MEM-060.

Thematic reorganization NOT performed.

## 12. BOUNDARY, WORKSTREAM, ROADMAP

Read-only boundary honoured: Stage B not started; no repository or live-database verification of Memory claims; no code, schema, data, Project Memory, Project Knowledge, Workspace Knowledge, Skill, setting, Roadmap, or Workstream modified; no thematic reorganization, Knowledge installation, Acceptance, or Closure.

`.lovable/plan.md` disclosure: platform-generated Plan Mode behaviour; the only file written this run, under the standing scope exception DEC-RM-DH-003-004 (docs/CONVENTIONS.md §11.10). It is not counted as a Memory ID.

Workstream persistence: no Workstream was created; no Workstream ID was assigned; no Workstream file was modified; no persistence occurred.

Roadmap impact: RM-DH-003 remains Active; RM-DH-003 / Phase 2 remains CLOSED; WS-DH-2026-0002 remains CLOSED; no new Phase, Sub-phase, Track, or Workstream created; no Roadmap or registry file intentionally modified.

## 13. VERDICT

STAGE A RECONCILIATION PARTIALLY CORRECTED — SPECIFIED ID OR REGISTER GAPS REMAIN

(ID lineage is now determined and evidenced, all registers are complete and internally consistent, but two gaps remain owner-dependent: index row 48 `unified-invitation-entry` holds no Official Audit ID pending owner approval, and four memory bodies remain inaccessible.)

## RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan Mode / Chat Mode (read-only).
2. Operation: Stage A — Final ID-Lineage Audit, Cross-Reference Correction, and Complete Reconciliation Reissue.
3. Received Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03.
4. Current Stage: Stage A (post-A4 correction pass).
5. Continuation Preparation Date and Time: 01-08-2026, 06:15, Asia/Riyadh (UTC+03:00).
6. Run Start: Exact time not recorded; first tool activity 2026-08-01 ≈03:1x UTC / 06:1x Asia/Riyadh.
7. First evidenced activity: `git log` of `.lovable/plan.md` in this run (commit list read, latest entry `dc924110` 2026-08-01 03:08:04 +0000).
8. Run End: Exact time not recorded.
9. Last evidenced activity: extraction of A2/A3 classification lines from commits `51433abf` and `10fb023f`.
10. Final Report time: Exact time not recorded.
11. Timezone and evidence: git timestamps in +0000; sandbox clock verified earlier this session as `Sat Aug 1 03:05:30 UTC 2026`.
12. Branch: `edit/edt-472d99ae-a217-4bc8-8246-22cd89f8e313`.
13. HEAD before: `dc924110` (".lovable/plan.md — Changes", 2026-08-01 03:08:04 +0000, the Batch A4 commit). HEAD after: unchanged at authoring time; a platform plan commit may follow.
14. Continuity evidence from Batch A4: `dc924110` is the immediate successor of `10fb023f` (A3, 02:18:13) which succeeds `10b2f76b`/`51433abf` (A3/A2, 00:34) and `de4a40c8` (A1, 00:01:59) — linear, unbroken lineage; all four batch reports read directly from their commits this run.
15. Working Tree: before — clean; after — `.lovable/plan.md` modified only.
16. Staged paths: none before, none after. Unstaged: none before, `.lovable/plan.md` after. Untracked non-ignored: none before, none after.
17. `.lovable/plan.md` activity: overwritten with this corrected Stage A reconciliation (previous content: the Batch A4 report, committed at `dc924110`, still retrievable from git history).
18. Official Audit-ID count: 103.
19. Current index row count: 104 objects (9 Core bullets + 95 memory rows); 1 row unassigned (`MEM-TEMP-A5-001`, row 48).
20. Directly read count: 99.
21. Inaccessible count: 4.
22. Corrected primary classification totals: PK 55, Skill-only 43, Stage-B-primary 1, Unclassifiable 4 = 103; repository-governance 0.
23. Corrected Stage B count: 35.
24. Corrected contradiction count: 12.
25. Cross-reference defects found and corrected in the report: 10 (listed in §3), plus the Core-block miscount and the withdrawn MEM-008/MEM-009 merge.
26. Project Memory changes: None.
27. Project Knowledge changes: None.
28. Code changes: None.
29. Database changes: None.
30. Roadmap/Workstream changes: None.
31. Exact verdict: STAGE A RECONCILIATION PARTIALLY CORRECTED — SPECIFIED ID OR REGISTER GAPS REMAIN.
32. Exact stopping point: The Stage A extraction content has reached the end of the indexed Memory set. Final Stage A acceptance remains dependent on the corrected Official Audit-ID lineage, complete 103-row Coverage Register, complete Stage B Verification Register, and corrected classification and secondary-flag counts. Stage B has not started. No thematic consolidation or Project Knowledge reconstruction was performed.
33. Exact next permitted owner action: Return the corrected Stage A reconciliation output to ChatGPT for acceptance review and owner-directed thematic consolidation planning.

STOP.
