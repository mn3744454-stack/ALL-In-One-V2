<!--
id: DHB-DOC06
title: Documentation 6 — Corrective Action Prioritization & Execution Roadmap
version: 1.1.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`06-corrective-action-prioritization-roadmap.txt`)
source-sha256: b5fd6b21a58d51dcf78c83a095b142409451e958c5a410dae3a3a3abdcceeeb3
-->

# Documentation 6 — Corrective Action Prioritization & Execution Roadmap

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Rendering fix — DG.2B:** the historical body was converted from one outer plain-text fence into native Markdown for section navigation and Lovable retrieval. Historical wording and ordering were preserved; the immutable raw source remains unchanged.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/06-corrective-action-prioritization-roadmap.txt`](../documentation-01-13/raw/06-corrective-action-prioritization-roadmap.txt)
> **Source SHA-256:** `b5fd6b21a58d51dcf78c83a095b142409451e958c5a410dae3a3a3abdcceeeb3`



# 25 — Corrective Action Prioritization & Execution Roadmap

---

## 25.1 Audit Scope and Method

### 25.1.1 Consolidation Approach
This roadmap consolidates findings from four prior forensic audit slices: Platform Architecture & Module Taxonomy (§1-11), Module Activation & Post-Onboarding Experience (§13), Shared Module Depth (§16), Domain-Specific Module Depth (§19), and Integration & Cross-Module Flow (§22). Each gap referenced below carries a provenance tag (e.g., §13.4, §22.6) linking to the originating audit section.

### 25.1.2 Issue Categories
25.1.2.1 **Product-truthfulness**: 5 tenant types exposed with zero domain surfaces (§13.3)
25.1.2.2 **Onboarding**: `initialize_tenant_defaults` RPC `'vet'`/`'doctor'` mismatch (§13.4), `isHorseOwningTenant` excludes `horse_owner` (§13.5)
25.1.2.3 **Shared-module context**: Services Plans tab universal overexposure, Schedule/Records empty for Doctor (§16.4, §16.6, §16.7)
25.1.2.4 **Strongest-module gaps**: Vet billing disconnected, vet mock data, Doctor services unused (§19.2, §19.4)
25.1.2.5 **Cross-module integration**: Doctor↔Schedule missing, Doctor↔Records missing, Doctor invoice entity_type absent (§22.9, §22.8)
25.1.2.6 **Commercial/billing**: Vet no billing_links, Doctor services→cost disconnected, Academy no billing_links source_type (§22.6, §22.8, §22.14)
25.1.2.7 **Bridge/privacy/event**: Doctor bridge ad-hoc, no `doctor_events` table, fragmented event architecture (§22.10, §22.12)
25.1.2.8 **Weak-module absence**: Pharmacy/Auction/Trainer have zero domain implementation (§2.2)

### 25.1.3 Confidence: High for all recommendations — based on full source inspection across 4 audit rounds.

---

## 25.2 Prioritization Framework

### 25.2.1 Criteria
Each action is scored across 7 dimensions on a 3-point scale (Low/Medium/High).

### 25.2.2 Dimensions
25.2.2.1 **User impact** — how many active tenant types benefit
25.2.2.2 **Trust/truthfulness** — does the current state mislead users
25.2.2.3 **Revenue/commercial** — does it enable or block billable workflows
25.2.2.4 **Architectural leverage** — does fixing it unblock multiple downstream improvements
25.2.2.5 **Implementation complexity** — lines of code / number of files / migration risk
25.2.2.6 **Dependency weight** — how many other fixes depend on this
25.2.2.7 **Risk reduction** — does it prevent user confusion, data issues, or trust damage

### 25.2.3 Severity and Effort Classes
**Severity**: Critical (trust/revenue blocker), High (significant gap), Medium (quality gap), Low (polish)
**Effort**: QF (quick fix, <1 hour), SF (small feature, 1-4 hours), MR (medium refactor, 4-16 hours), SR (structural redesign, 16+ hours)

### 25.2.4 Action Categories
25.2.4.1 **Quick wins**: Independent, low-risk, high-impact changes
25.2.4.2 **Medium refactors**: Multiple files, possible migration, moderate risk
25.2.4.3 **Structural redesigns**: Architecture-level changes with broad impact
25.2.4.4 **Defer**: Premature, blocked, or low-value-now items

---

## 25.3 Platform-Wide Gap Consolidation

### 25.3.1 Master Gap Registry

| ID | Gap | Severity | Effort | Source |
|----|-----|----------|--------|--------|
| G01 | 5 unready tenant types exposed equally in SelectRole | Critical | QF | §13.3 |
| G02 | `isHorseOwningTenant` excludes `horse_owner` | Critical | QF | §13.5 |
| G03 | Transport movement capability invisible (housing nav coupling) | High | QF | §13.6 |
| G04 | RPC uses `'vet'` not `'doctor'` for capability seeding | High | QF (migration) | §13.4 |
| G05 | Doctor consultations missing from Schedule | High | QF | §22.9 |
| G06 | Doctor invoice missing `entity_type` / statement enrichment | High | QF | §22.8 |
| G07 | Services Plans tab shown for all tenant types | High | QF | §16.4 |
| G08 | Vet mock data in `DashboardVet.tsx` | Medium | QF | §19.2 |
| G09 | Vet module has no billing linkage | High | SF | §19.2, §22.6 |
| G10 | Doctor services disconnected from consultation flow | High | SF | §19.4, §22.8 |
| G11 | Doctor activity invisible in Records | Medium | SF-MR | §22.9, §22.12 |
| G12 | Doctor/Academy nav tenantType-gated, not capability-gated | Medium | MR | §13.6, §22.15 |
| G13 | No module management UI in Settings | Medium | SF | §13.11 |
| G14 | Parallel service catalogs (doctor_services vs tenant_services) | Medium | MR | §19.4 |
| G15 | No lab dashboard KPI widgets | Low | SF | §19.3 |
| G16 | No doctor mobile bottom nav | Low | SF | §19.4 |
| G17 | Sidebar hardcoded vs navConfig data-driven drift | Low | MR | §16.6 |
| G18 | No route code-splitting | Low | MR | §10.1 |
| G19 | Doctor publish-to-stable schema but no implementation | Low | MR-SR | §22.4 |
| G20 | Fragmented event tables (no unified model) | Low | SR | §22.12 |
| G21 | Inventory schema disconnected (no UI) | Low | Defer | §5.1 |
| G22 | Academy billing_links source_type absent | Medium | SF | §22.14 |
| G23 | HR horse-assignment visible for non-horse tenants | Low | QF | §16.3 |
| G24 | `stables` table legacy dead weight | Low | Defer | §19.2 |

### 25.3.2 Gap Groups

25.3.2.1 **Misleading exposure**: G01, G02, G03, G07, G08, G23
25.3.2.2 **Missing operational integration**: G05, G11
25.3.2.3 **Missing commercial integration**: G06, G09, G10, G22
25.3.2.4 **Weak shared abstraction**: G07, G14, G17
25.3.2.5 **Weak bridge model**: G19
25.3.2.6 **Fragmented event/activity**: G11, G20
25.3.2.7 **tenantType-vs-capability gating**: G04, G12, G13
25.3.2.8 **Not-yet-real module**: G01 (Pharmacy/Auction/Trainer), G21

---

## 25.4 Immediate Product Truthfulness Actions

### 25.4.1 Actions Required Before Any Deeper Work

### 25.4.2 Specific Actions

#### 25.4.2.1 G01 — Hide Pharmacy, Auction, Trainer from SelectRole
25.4.3.1 Why now: Users create these types and land in empty dashboards. Trust damage on first interaction.
25.4.3.2 Affected: Pharmacy, Auction, Trainer tenants.
25.4.3.3 Trust benefit: Eliminates the 3 worst misleading onboarding paths.
25.4.3.4 Effort: QF — add `readiness` filter or `comingSoon` section in `SelectRole.tsx`.
25.4.3.5 Reversible: Yes — unhide when domain surfaces are built.

#### 25.4.2.2 G02 — Fix `isHorseOwningTenant` to include `horse_owner`
25.4.3.1 Why now: Horse Owners cannot see horses on their dashboard — contradicts the core promise.
25.4.3.2 Affected: Horse Owner tenants.
25.4.3.3 Trust benefit: Horse owners see horse-related content immediately.
25.4.3.4 Effort: QF — add `'horse_owner'` to the condition in `Dashboard.tsx` and `DashboardSidebar.tsx`.
25.4.3.5 Reversible: N/A — correct behavior.

#### 25.4.2.3 G03 — Fix transport movement nav visibility
25.4.3.1 Why now: Transport's only capability (movement) is invisible because it's coupled to housing nav.
25.4.3.2 Affected: Transport tenants.
25.4.3.3 Trust benefit: Transport tenants can access their one functional module.
25.4.3.4 Effort: QF — either enable housing for transport or add standalone movement nav item in `navConfig.ts` and sidebar.
25.4.3.5 Reversible: Yes.

#### 25.4.2.4 G07 — Hide Services Plans tab for non-housing tenants
25.4.3.1 Why now: All tenant types see `ServicePlansManager` (boarding plans) — irrelevant and confusing for Lab/Doctor/Academy.
25.4.3.2 Affected: All non-stable tenants.
25.4.3.3 Trust benefit: Services page becomes contextually honest.
25.4.3.4 Effort: QF — conditional render in `DashboardServices.tsx` checking `housingEnabled`.
25.4.3.5 Reversible: N/A — correct behavior.

#### 25.4.2.5 G08 — Remove vet mock data
25.4.3.1 Why now: Mock datasets in `DashboardVet.tsx` create false impression of populated module.
25.4.3.2 Affected: Stable tenants with vet enabled.
25.4.3.3 Trust benefit: Empty states show honestly; users understand they need to create real data.
25.4.3.4 Effort: QF — remove lines 22-240 of mock data, remove fallback logic.
25.4.3.5 Reversible: N/A — mocks should not exist in production.

#### 25.4.2.6 G23 — Hide HR horse-assignment for non-horse tenants
25.4.3.1 Why now: Lab/Doctor/Pharmacy tenants see horse-assignment section in HR.
25.4.3.2 Affected: All non-horse-owning tenants.
25.4.3.3 Effort: QF — conditional render based on `isHorseOwningTenant`.
25.4.3.5 Reversible: N/A.

---

## 25.5 Highest-ROI Quick Wins

### 25.5.1 Ranked Quick Wins

#### 25.5.2.1 G05 — Add `doctor_consultations` to Schedule
25.5.3.1 Why: Doctor tenants see empty schedule despite having schedulable events.
25.5.3.2 Impact: High — Doctor is a production tenant type.
25.5.3.3 Effort: QF — add query to `useScheduleItems.ts` using `scheduled_for`.
25.5.3.4 Dependencies: None.
25.5.3.5 Order: Wave 1.

#### 25.5.2.2 G06 — Add doctor_consultation statement enrichment + DomainBadge
25.5.3.1 Why: Doctor invoices show without domain context in client statements.
25.5.3.2 Impact: Medium — affects Doctor finance UX.
25.5.3.3 Effort: QF — update `CreateInvoiceFromConsultation` to set `entity_type='doctor_consultation'` in invoice_items, add resolution in `useStatementEnrichment`, add variant in `DomainBadge`.
25.5.3.4 Dependencies: None.
25.5.3.5 Order: Wave 1.

#### 25.5.2.3 G04 — Fix `initialize_tenant_defaults` RPC for doctor type
25.5.3.1 Why: Doctor tenants don't get `vet: enabled:true` from seeding — relies on runtime fallback.
25.5.3.2 Impact: Medium — fragile workaround currently masks the issue.
25.5.3.3 Effort: QF — migration adding `'doctor'` to vet capability condition.
25.5.3.4 Dependencies: None.
25.5.3.5 Order: Wave 1.

#### 25.5.2.4 G01-G03, G07, G08, G23 — Truthfulness fixes (from §25.4)
All QF, no dependencies, Wave 1.

---

## 25.6 Highest-Priority Commercial Fixes

### 25.6.1 Commercial Gaps by Impact

#### 25.6.2.1 G09 — Stable Vet billing linkage
25.6.3.1 Why: Vet is the single largest commercial gap in Stable. `actual_cost` tracked but never flows to invoices.
25.6.3.2 Revenue impact: Direct — vet services are a core revenue source for stables.
25.6.3.3 Architectural impact: Low — follows established `CreateInvoiceFrom*` pattern.
25.6.3.4 Effort: SF — create `CreateInvoiceFromVetVisit`, add `source_type='vet_visit'` billing_link, add entity_type + statement enrichment.
25.6.3.5 Dependencies: G08 (remove mocks first).
25.6.3.6 Sequence: Wave 2.

#### 25.6.2.2 G10 — Doctor services → consultation pricing
25.6.3.1 Why: `doctor_services` catalog exists but is never consumed during consultations.
25.6.3.2 Revenue impact: Indirect — improves billing accuracy and reduces manual entry.
25.6.3.3 Architectural impact: Low — add service picker to `ConsultationForm`.
25.6.3.4 Effort: SF — service selector component, auto-populate `actual_cost` from `base_price`.
25.6.3.5 Dependencies: None.
25.6.3.6 Sequence: Wave 2.

#### 25.6.2.3 G06 — Doctor invoice enrichment (also in §25.5)
Covered in Wave 1 quick wins.

#### 25.6.2.4 G22 — Academy billing surface
25.6.3.1 Why: Academy sessions/bookings cannot be traced financially.
25.6.3.2 Revenue impact: Medium — Academy is a partial tenant type.
25.6.3.3 Effort: SF — add `academy_booking` source type to billing_links, create `CreateInvoiceFromBooking`.
25.6.3.5 Dependencies: Academy remaining visible in onboarding.
25.6.3.6 Sequence: Wave 3.

#### 25.6.2.5 G14 — Parallel service catalogs
25.6.3.1 Why: Doctor has `doctor_services` AND sees shared `tenant_services`. Confusing.
25.6.3.2 Effort: MR — either hide shared Services page for doctor tenants or merge using `service_kind='doctor'`.
25.6.3.6 Sequence: Wave 4.

---

## 25.7 Strongest-Module Hardening Priorities

### 25.7.1 Stable

#### 25.7.1.1 G09 — Vet billing (must-fix-before-scale)
#### 25.7.1.2 G08 — Vet mock-data removal (must-fix-before-scale)
#### 25.7.1.3 G24 — `stables` table cleanup (defer — no operational impact)

25.7.4.1 Must-fix: G08, G09
25.7.4.2 Nice-to-have: Vet statement enrichment + DomainBadge variant
25.7.4.3 Defer: G24

### 25.7.2 Laboratory

#### 25.7.2.1 G15 — Lab dashboard KPI widgets (nice-to-have)
#### 25.7.2.2 Lab is commercially complete — no critical hardening needed
#### 25.7.2.3 Lab should be treated as the expansion template for new modules

25.7.4.1 Must-fix: None
25.7.4.2 Nice-to-have: G15
25.7.4.3 Defer: Batch invoicing

### 25.7.3 Doctor

#### 25.7.3.1 G05 — Schedule integration (must-fix)
#### 25.7.3.2 G11 — Records/activity integration (must-fix)
#### 25.7.3.3 G10 — Service pricing integration (must-fix)
#### 25.7.3.4 G16 — Mobile bottom nav (nice-to-have)

25.7.4.1 Must-fix: G05, G10, G11, G06
25.7.4.2 Nice-to-have: G16
25.7.4.3 Defer: G19 (publish-to-stable)

---

## 25.8 Shared Module Context Correction Priorities

### 25.8.1 Before expanding weak tenants, shared modules need context-awareness.

#### 25.8.2.1 Services
25.8.3.1 Hide: Plans tab for non-housing tenants (G07)
25.8.3.2 Generalize: Nothing needed — catalog tab is already generic
25.8.3.3 Stay: Service CRUD works universally
25.8.3.4 Redesign later: Resolve Doctor parallel catalog (G14, Wave 4)

#### 25.8.2.2 HR
25.8.3.1 Hide: Horse-assignment for non-horse tenants (G23)
25.8.3.2 Generalize: Nothing else needed
25.8.3.3 Stay: Employee/payroll CRUD is universal
25.8.3.4 Redesign later: Consider hiding HR nav for solo-practitioner types

#### 25.8.2.3 Schedule
25.8.3.1 Hide: Nothing — empty state is acceptable
25.8.3.2 Generalize: Add doctor_consultations source (G05)
25.8.3.3 Stay: Current multi-source aggregation pattern
25.8.3.4 Redesign later: Add manual `schedule_items` table for generic entries

#### 25.8.2.4 Records
25.8.3.1 Hide: Nothing
25.8.3.2 Generalize: Add doctor event source (G11)
25.8.3.3 Stay: Current 3-table aggregation
25.8.3.4 Redesign later: Unified `tenant_events` model (G20, strategic)

#### 25.8.2.5 Finance enrichment
25.8.3.2 Generalize: Add doctor_consultation DomainBadge + entity_type (G06)
25.8.3.3 Stay: Existing lab/boarding/breeding enrichment
25.8.3.4 Redesign later: Add vet_visit enrichment (after G09)

#### 25.8.2.6 Settings/module toggles
25.8.3.2 Generalize: Add doctor/academy toggles (after G12 capability categories)
25.8.3.3 Stay: Existing vet/housing/movement/breeding toggles
25.8.3.4 Redesign later: Tenant-type-aware settings page

---

## 25.9 Cross-Module Integration Priorities

### 25.9.1 Ranked by Business Importance

#### 25.9.2.1 Stable ↔ Lab — already production-grade. No immediate action.
25.9.3.1 Immediate: None
25.9.3.2 Medium-term: Batch result delivery, multi-sample invoicing
25.9.3.3 Future: Bidirectional messaging enrichment

#### 25.9.2.2 Stable ↔ Doctor — schema-ready, no implementation
25.9.3.1 Immediate: None (Doctor module hardening first)
25.9.3.2 Medium-term: Publish-to-stable flow (G19) following Lab pattern
25.9.3.3 Future: Horse lookup from connections, HorseProfile external consultations section

#### 25.9.2.3 Stable ↔ Transport — mostly internal
25.9.3.1 Immediate: Fix transport nav visibility (G03)
25.9.3.2 Medium-term: None until transport domain is built
25.9.3.3 Future: Vehicle/route/fleet management

#### 25.9.2.4 Doctor ↔ Schedule / Records
25.9.3.1 Immediate: G05 (schedule), G11 (records)
25.9.3.2 Medium-term: None
25.9.3.3 Future: Unified event model (G20)

#### 25.9.2.5 Event architecture
25.9.3.1 Immediate: G11 (doctor_events)
25.9.3.2 Medium-term: Add housing_events, movement_events
25.9.3.3 Future: Unified `tenant_events` table (G20, strategic)

---

## 25.10 Capability Model and Module Governance

### 25.10.1 Current State
Doctor and Academy use `tenantType` gating. All other add-on modules (vet, housing, movement, breeding, lab) use `moduleKey` capability gating. This prevents module stacking.

#### 25.10.2.1 G12 — Convert doctor to capability-gated
Requires: New `doctor_consultations` capability category in `tenant_capabilities`, migration to seed defaults for doctor type, update `navConfig.ts` and `DashboardSidebar.tsx` to check `moduleKey` instead of `tenantType`.

#### 25.10.2.2 G12 — Convert academy to capability-gated
Same pattern as doctor. New `academy` capability category.

#### 25.10.2.3 G13 — Module management UI
Add to `/dashboard/settings` — a toggles section for all available capability categories.

#### 25.10.2.4 Rationalize settings toggles
Current toggles cover 4 modules (vet/housing/movement/breeding) + lab mode. After G12, add doctor and academy toggles.

#### 25.10.2.5 Backward compatibility
Existing doctor/academy tenants keep working because `initialize_tenant_defaults` would seed their capability. Type-gated nav items become capability-gated but capability is auto-seeded for the matching type.

### 25.10.3 Recommended Path
25.10.3.1 Now: Nothing — fix truthfulness and commercial gaps first
25.10.3.2 Wave 5: Implement G12 + G13 as a coherent governance improvement
25.10.3.3 Preconditions: Doctor hardening (G05, G06, G10, G11) must be complete before governance changes

---

## 25.11 Weak-Module Strategy

#### 25.11.1.1 Horse Owner
25.11.2: Relabel as "Personal Horse Management" in SelectRole. Fix G02 so horses display. Keep visible — shared surfaces (horses, schedule, community) provide some value after G02.
25.11.3: Low dependency. G02 is a prerequisite.

#### 25.11.1.2 Pharmacy
25.11.2: Hide from SelectRole. No domain surfaces exist. Inventory schema is disconnected.
25.11.3: No dependency impact. Reversible when domain is built.

#### 25.11.1.3 Trainer
25.11.2: Hide from SelectRole. Zero domain implementation.
25.11.3: No dependency impact.

#### 25.11.1.4 Auction
25.11.2: Hide from SelectRole. Only an enum reference exists.
25.11.3: No dependency impact.

#### 25.11.1.5 Transport
25.11.2: Relabel as "beta/limited" in SelectRole. Fix G03 so movement is accessible. Keep visible — movement module provides some value.
25.11.3: G03 is prerequisite.

#### 25.11.1.6 Academy
25.11.2: Relabel as "beta/limited". Sessions/bookings work. Add G22 (billing) to make it commercially viable.
25.11.3: G22 is the key unlocking action.

---

## 25.12 Execution Waves

### 25.12.2.1 Wave 1 — Immediate Truthfulness + Quick Wins

25.12.3.1 Scope: G01, G02, G03, G04, G05, G06, G07, G08, G23
25.12.3.2 Goals: Eliminate all misleading surfaces. Fix broken first-run experiences. Wire Doctor into Schedule and Finance enrichment.
25.12.3.3 Dependencies: All independent — can be parallelized.
25.12.3.4 Sequence:
1. G01 — Hide Pharmacy/Auction/Trainer from SelectRole
2. G02 — Fix `isHorseOwningTenant`
3. G03 — Fix transport movement nav
4. G07 — Hide Plans tab for non-housing
5. G23 — Hide HR horse-assignment for non-horse tenants
6. G08 — Remove vet mock data
7. G05 — Add doctor_consultations to Schedule
8. G06 — Doctor statement enrichment + DomainBadge
9. G04 — Fix RPC `'vet'`→`'doctor'` seeding
25.12.3.5 Outcomes: All 10 tenant types show honest surfaces. Doctor schedule populated. Doctor invoices enriched.

### 25.12.2.2 Wave 2 — Commercial Integration Fixes

25.12.3.1 Scope: G09, G10
25.12.3.2 Goals: Complete billing for the two commercially disconnected workflows.
25.12.3.3 Dependencies: G08 before G09 (vet mocks removed first). G10 independent.
25.12.3.4 Sequence:
1. G09 — Create `CreateInvoiceFromVetVisit` + `source_type='vet_visit'` + statement enrichment
2. G10 — Add service picker to ConsultationForm, auto-populate cost
25.12.3.5 Outcomes: All 3 first-class modules have complete billing pipelines.

### 25.12.2.3 Wave 3 — Doctor + Module Hardening

25.12.3.1 Scope: G11, G16, G22
25.12.3.2 Goals: Doctor activity visible in Records. Doctor mobile UX. Academy billing.
25.12.3.3 Dependencies: G11 requires migration (doctor_events table or direct query).
25.12.3.4 Sequence:
1. G11 — Doctor activity in Records (create `doctor_events` or query consultations)
2. G16 — Doctor mobile bottom nav
3. G22 — Academy billing_links source type + invoice-from-booking
25.12.3.5 Outcomes: Doctor module reaches ~90% maturity. Academy reaches commercial viability.

### 25.12.2.4 Wave 4 — Shared Abstraction Corrections

25.12.3.1 Scope: G14, G15, G17
25.12.3.2 Goals: Resolve parallel service catalogs. Add lab dashboard widgets. Consolidate nav configs.
25.12.3.3 Dependencies: G14 requires product decision (merge vs hide).
25.12.3.4 Sequence:
1. G14 — Resolve doctor_services vs tenant_services
2. G15 — Lab dashboard KPI widgets
3. G17 — Sidebar consolidation to data-driven config
25.12.3.5 Outcomes: Cleaner shared module surfaces. Lab dashboard richness. Nav consistency.

### 25.12.2.5 Wave 5 — Capability Model Evolution

25.12.3.1 Scope: G12, G13
25.12.3.2 Goals: Enable module stacking. Self-serve module management.
25.12.3.3 Dependencies: Doctor hardening (Waves 1-3) must be complete. Product decision on which capability categories to create.
25.12.3.4 Sequence:
1. G12 — Add `doctor_consultations` and `academy` capability categories + migration + convert nav gating
2. G13 — Module management UI in Settings
25.12.3.5 Outcomes: Any tenant can add Doctor or Academy as add-on modules. Operators can self-serve toggle.

### 25.12.2.6 Wave 6 — Weak Module Enablement (Strategic)

25.12.3.1 Scope: Build domain surfaces for next-priority weak modules.
25.12.3.2 Goals: Bring 1-2 weak modules to "limited but usable" status.
25.12.3.3 Dependencies: Waves 1-5 complete. Product decision on which module to build next.
25.12.3.4 Recommended first candidate: **Pharmacy** (inventory schema exists, POS exists, closest to connectable).
25.12.3.5 Outcomes: 6-7 of 10 tenant types become usable.

---

## 25.13 Dependency Map

### 25.13.2 Key Dependencies

25.13.2.1 **Independent quick wins (Wave 1)**: G01, G02, G03, G04, G05, G06, G07, G08, G23 — all can execute in parallel.

25.13.2.2 **Schema-dependent**: G04 (migration to fix RPC), G09 (may need `vet_visit` added to billing_links source_type enum — verify if enum or text), G11 (migration for `doctor_events` table), G12 (migration for new capability categories), G22 (migration for `academy_booking` source_type).

25.13.2.3 **Depends on shared abstraction cleanup**: G14 depends on product decision (merge vs hide). G17 depends on agreeing on single nav config source of truth.

25.13.2.4 **Depends on capability-model changes**: G13 depends on G12. Settings module toggles depend on capability categories existing.

25.13.2.5 **Depends on product decisions**: G01 (which types to hide — confirmed: Pharmacy/Auction/Trainer). G14 (merge vs hide doctor services). Wave 6 (which module to build next).

### 25.13.3 Critical Path
Wave 1 (all parallel) → Wave 2 (G08→G09, G10 parallel) → Wave 3 → Wave 4 → Wave 5 → Wave 6.

---

## 25.14 What Not to Do Yet

#### 25.14.2.1 Do NOT expand all 10 tenant types equally
Why: 5 types have zero domain logic. Building them simultaneously would spread effort thin. Fix the 3 strong modules first.

#### 25.14.2.2 Do NOT build full transport logistics
Why: No tables, no UI, no domain model. Requires major domain design. Fix transport nav visibility (G03) and defer domain build.

#### 25.14.2.3 Do NOT build auction depth
Why: Only an enum reference. Requires full domain design from scratch. Strategic Wave 6+ work.

#### 25.14.2.4 Do NOT redesign event architecture now (G20)
Why: Fragmented event tables work for the 3 modules that have them. Adding `doctor_events` (G11) extends the pattern cheaply. Unified `tenant_events` is a strategic improvement with high migration risk and low immediate ROI.

#### 25.14.2.5 Do NOT overhaul capability governance before truthfulness
Why: G12/G13 are medium refactors that require Doctor hardening first. Fix trust issues (Wave 1) and commercial gaps (Wave 2) before governance.

---

## 25.15 Platform Expansion Readiness Criteria

### 25.15.1 Before building new domain modules, the platform must satisfy:

#### 25.15.2.1 Product truthfulness
All visible tenant types must either have real domain surfaces or be hidden/labeled honestly. (Wave 1 achieves this.)

#### 25.15.2.2 Onboarding integrity
`initialize_tenant_defaults` must correctly seed capabilities for all visible types. (G04 achieves this.)

#### 25.15.2.3 Commercial completeness
All 3 first-class modules (Stable, Lab, Doctor) must have complete billing pipelines. (Waves 1-2 achieve this.)

#### 25.15.2.4 Shared-module neutrality
Shared surfaces (Services, HR, Schedule, Records) must not show stable-only content to other types. (Waves 1, 3-4 achieve this.)

#### 25.15.2.5 Bridge/event readiness
At least the `doctor_events` pattern must be established so new modules can follow it. (Wave 3 achieves this.)

#### 25.15.2.6 Capability governance maturity
Module stacking must work via capability gating. Module management UI must exist. (Wave 5 achieves this.)

### 25.15.3 Minimum Acceptable Baseline
**Waves 1-3 complete** = minimum baseline for expansion. This ensures truthful onboarding, complete commercial pipelines for all production modules, and Doctor fully integrated into shared surfaces.

---

## 25.16 Final Prioritized Roadmap Summary

### 25.16.2.1 First 5 Actions
1. **G01** — Hide Pharmacy/Auction/Trainer from SelectRole (QF, Critical)
2. **G02** — Fix `isHorseOwningTenant` to include `horse_owner` (QF, Critical)
3. **G05** — Add `doctor_consultations` to `useScheduleItems` (QF, High)
4. **G07** — Hide Services Plans tab for non-housing tenants (QF, High)
5. **G08** — Remove vet mock data from `DashboardVet.tsx` (QF, Medium)

### 25.16.2.2 Next 10 Actions
6. **G03** — Fix transport movement nav visibility (QF, High)
7. **G06** — Doctor invoice entity_type + statement enrichment + DomainBadge (QF, High)
8. **G04** — Fix RPC `'vet'`→include `'doctor'` for capability seeding (QF, High)
9. **G23** — Hide HR horse-assignment for non-horse tenants (QF, Low)
10. **G09** — Create `CreateInvoiceFromVetVisit` + billing linkage (SF, High)
11. **G10** — Connect doctor_services to consultation pricing flow (SF, High)
12. **G11** — Doctor activity in Records/Activity Log (SF-MR, Medium)
13. **G22** — Academy billing_links source type (SF, Medium)
14. **G16** — Doctor mobile bottom nav (SF, Low)
15. **G15** — Lab dashboard KPI widgets (SF, Low)

### 25.16.2.3 Strategic Later Actions
16. **G12** — Convert Doctor/Academy to capability-gated (MR)
17. **G13** — Module management UI in Settings (SF)
18. **G14** — Resolve parallel service catalogs (MR)
19. **G17** — Consolidate sidebar to data-driven nav config (MR)
20. **G18** — Route code-splitting (MR)
21. **G19** — Doctor publish-to-stable flow (MR-SR)
22. **G20** — Unified event architecture (SR)

### 25.16.3 Why This Sequence
Wave 1 (items 1-9) eliminates all user-facing trust damage with minimal effort. Wave 2 (items 10-11) closes the two remaining commercial gaps in production modules. Wave 3 (items 12-15) hardens Doctor and Academy to near-complete status. Only then do architectural improvements (16-22) make sense — they build on a stable, truthful, commercially complete foundation.

### 25.16.4 Recommended Next Audit Slice
**Wave 1 Execution Verification Audit** — after implementing Wave 1, audit whether all truthfulness fixes are correctly applied, whether nav states are honest for all 10 tenant types, and whether Doctor schedule/finance enrichment works correctly. This validates the foundation before proceeding to commercial fixes.

---

## 26 Output Rules
All recommendations are evidence-based with gap IDs tracing to prior audit sections. No code patches produced.

## 27 Final Deliverable State

### 27.1 Final numbering point reached: **25.16.4**
### 27.2 Recommended next starting number: **28**
### 27.3 Recommended next audit slice: **Wave 1 Execution Verification Audit** — confirming all truthfulness and quick-win fixes are correctly applied across all 10 tenant types before proceeding to Wave 2 commercial fixes.
