<!--
id: DHB-DOC04
title: Documentation 4 — Domain-Specific Module Depth Audit
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`04-domain-specific-module-depth-audit.txt`)
source-sha256: 62a2734411ed906ba3933f0ded50b8fe7e51ca55fc47adc9b6e79cc596c4ce46
-->

# Documentation 4 — Domain-Specific Module Depth Audit

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/04-domain-specific-module-depth-audit.txt`](../documentation-01-13/raw/04-domain-specific-module-depth-audit.txt)
> **Source SHA-256:** `62a2734411ed906ba3933f0ded50b8fe7e51ca55fc47adc9b6e79cc596c4ce46`

```text


# 19 — Domain-Specific Module Depth Audit

---

## 19.1 Audit Scope and Method

### 19.1.1 Surfaces Inspected
**Stable**: `DashboardHorses`, `DashboardHousing` (187 lines), `DashboardBreeding` (331 lines), `DashboardVet` (470 lines), `DashboardMovement` (redirect), `HorseProfile` (536 lines), all hooks under `src/hooks/housing/` (12 files), `src/hooks/breeding/` (9 files), `src/hooks/vet/` (8 files), `src/hooks/movement/` (9 files), all components under `src/components/housing/` (26 files), `src/components/breeding/` (23 files), `src/components/vet/` (15 files), `src/components/movement/` (14 files), `src/components/horses/` (18 files). Billing hooks: `useBillingLinks`, `useAdmissionFinancials`, `useFinancialGate`. Invoice dialogs: `CreateInvoiceFromAdmission`, `CreateInvoiceFromBreedingEvent`.

**Laboratory**: `DashboardLaboratory` (multi-tab page), `SharedLabResult`, all hooks under `src/hooks/laboratory/` (22 files including `useLabSamples` 569 lines, `useLabRequests` 286 lines, `useLabResults` 380 lines, `useLabCredits` 304 lines, `useLabServices` 219 lines), all components under `src/components/laboratory/` (50 files), `labNavConfig.ts`, `StableResultsView`, `StableLabResults` hook.

**Doctor**: `DashboardDoctorOverview`, `DashboardDoctorConsultations`, `DashboardDoctorConsultationDetail` (197 lines), `DashboardDoctorPatients`, `DashboardDoctorServices`, all hooks under `src/hooks/doctor/` (5 files), all components under `src/components/doctor/` (6 files), `CreateInvoiceFromConsultation`.

### 19.1.2 Classification Criteria
19.1.2.1 Visible surface — page/route exists and renders
19.1.2.2 Internally complete — full CRUD + state machine + billing linkage
19.1.2.3 Partially wired — UI exists, backend gaps or mock data present
19.1.2.4 Commercially meaningful — billable events trace to invoices/ledger
19.1.2.5 Technically present but weak — scaffold/mock/placeholder
19.1.2.6 Dead/superseded — redirect-only or replaced by other path

### 19.1.3 Confidence: High for all three modules — full source inspected.

---

## 19.2 Stable Module Depth Audit

### 19.2.1 Stable Module Identity

#### 19.2.1.1 Module family
Stable is a **module family** composed of 5 submodules: Horse Registry, Housing/Boarding, Breeding, Vet (add-on), Movement. Each has its own hooks directory, components directory, and page(s).

#### 19.2.1.2 Architectural ownership
Stable owns: `horses`, `boarding_admissions`, `boarding_status_history`, `stable_service_plans`, `facility_areas`, `housing_units`, `housing_unit_occupants`, `horse_movements`, `horse_care_notes`, all breeding tables (8), all vet tables (7), `horse_orders`, `horse_order_types`, `horse_ownership`, `horse_vaccinations`, `vaccination_programs`, `branches`.

#### 19.2.1.3 Shared module dependencies
Finance (invoices, billing_links, ledger), Clients, HR, Services (tenant_services), Connections (cross-tenant sharing), Schedule, Records/Activity.

#### 19.2.1.4 Dominant center
Yes. Stable is the platform's architectural center of gravity. The `horses` table (50+ columns) is the most connected entity. The Horse Profile page (`HorseProfile.tsx`, 536 lines) composes sections from Housing, Breeding, Vet, Movement, Lab, HR, and Media.

### 19.2.2 Routes, Pages, and Major UI Surfaces

#### 19.2.2.1 Stable-specific routes
`/dashboard/horses`, `/dashboard/horses/:id` (HorseProfile), `/dashboard/horse-orders`, `/dashboard/housing`, `/dashboard/breeding`, `/dashboard/vet`, `/dashboard/movement` (redirect to housing), `/dashboard/services`.

#### 19.2.2.2 Subdomains

##### 19.2.2.2.1 Horse Registry
Pages: `DashboardHorses`, `HorseProfile`. Components: `HorseWizard`, `HorseCard`, `HorsesList`, `HorsesTable`, `HorseFilters`, `HorseExport`, `HorseMediaGallery`, `HorseProfileCompleteness`, `PedigreeSection`, `OffspringSection`, `OwnershipTimeline`, `CurrentOwnership`, `HorseSharesPanel`, `TransferOwnershipDialog`, `AddMasterDataDialog`. Hooks: `useHorses` (165 lines), `useHorseOwnership`, `useHorseOwnershipHistory`, `useHorsePedigree`, `useHorseSearch`, `useHorseShares`, `useHorseMasterData`, `useHorseOffspring`, `useHorseOrders`, `useHorseOrderTypes`, `useHorseOrderEvents`.

##### 19.2.2.2.2 Housing / Boarding
Page: `DashboardHousing` (187 lines, branch-scoped with tabs: Overview/Admissions/Facilities/Arrivals). Components: `AdmissionWizard` (7-step), `AdmissionDetailSheet`, `AdmissionsList`, `ArrivalsAndDepartures`, `BranchOverview`, `FacilitiesManager`, `AreasManager`, `UnitsManager`, `UnitDetailsSheet`, `ServicePlansManager`, `BoardingDashboardWidgets`, `CheckoutDialog`, `CheckoutFinancialReview`, `CreateInvoiceFromAdmission`, `CareNotesList`, `HorseProfileCareNotes`, `HorseAdmissionCard`, `PlanIncludedServicesPicker`, `PlanIncludedServicesDisplay`. Hooks: `useBoardingAdmissions` (522 lines), `useFacilityAreas`, `useHousingUnits`, `useUnitOccupants`, `useStableServicePlans`, `useHorseCareNotes`, `useAdmissionFinancials`, `useFinancialGate`, `useHorseActiveAdmission`.

##### 19.2.2.2.3 Breeding
Page: `DashboardBreeding` (331 lines, 6 tabs: Attempts/Pregnancies/Foalings/Contracts/Embryo/Inventory). Components: 23 components including `CreateBreedingAttemptDialog`, `CreatePregnancyDialog`, `CreateEmbryoTransferDialog`, `CreateSemenBatchDialog`, `RecordFoalingDialog`, `RegisterFoalDialog`, `CreateBreedingContractDialog`, `BreedingDetailSheets`, `PregnancyExamsPanel`, `BreedingContractDetailSheet`, `FoalingDetailSheet`, `CreateInvoiceFromBreedingEvent`, `EntityTimeline`, `HorseBreedingSection`. Hooks: 9 hooks covering attempts, pregnancies, checks, embryo transfers, semen, foalings, contracts, events.

##### 19.2.2.2.4 Vet
Page: `DashboardVet` (470 lines, 6 tabs: Visits/Treatments/Vaccinations/Programs/Followups/Settings). Components: 15 components including `VetVisitsList`, `VetVisitCard`, `CreateVetVisitDialog`, `VetTreatmentsList`, `VetTreatmentCard`, `CreateVetTreatmentDialog`, `VaccinationsList`, `VaccinationProgramManager`, `VetFollowupsList`, `VetTimeline`, `HorseVetSection`, `VetBottomNavigation`. Hooks: 8 hooks covering visits, treatments, followups, vaccinations, programs, medications, events.

##### 19.2.2.2.5 Movement
Page: `DashboardMovement` (redirect to `/dashboard/housing`). Components: 14 components — `RecordMovementDialog`, `MovementCard`, `MovementDetailSheet`, `MovementsList`, `MovementFilters`, `LocationsManager`, `IncomingArrivals`, `DispatchConfirmDialog`, `HorseLocationSection`, `HorseMovementTimeline`. Hooks: 9 hooks covering movements, locations, eligible horses, incoming, connected movement, external locations.

##### 19.2.2.2.6 Dashboard/Overview
`Dashboard.tsx` — conditional content: boarding widgets, horse list, financial summary, recent activity for horse-owning tenants. `BoardingDashboardWidgets` component.

#### 19.2.2.4 Oversized/duplicated files
`useBoardingAdmissions.ts` at 522 lines is the largest hook — handles full CRUD, status transitions, and duplicate prevention. `HorseProfile.tsx` at 536 lines is the largest page — composes 12+ sub-sections.

### 19.2.3 Data Model

#### 19.2.3.1 Key tables
`horses` (core entity, 50+ columns), `boarding_admissions` (40+ columns), `boarding_status_history`, `stable_service_plans`, `facility_areas`, `housing_units`, `housing_unit_occupants`, `horse_movements`, `horse_care_notes`, `breeding_attempts`, `breeding_contracts`, `pregnancies`, `pregnancy_checks`, `foalings`, `embryo_transfers`, `semen_batches`, `semen_tanks`, `breeders`, `vet_visits`, `vet_treatments`, `vet_followups`, `horse_vaccinations`, `vaccination_programs`, `vet_events`, `breeding_events`, `horse_orders`, `horse_order_types`, `horse_order_events`, `horse_ownership`, `horse_ownership_history`, `branches`.

#### 19.2.3.4 Naming drift
`stables` table exists but is superseded by `facility_areas`. `horses.stable_id` FK still references it — legacy. `DashboardMovement` page is a dead redirect.

### 19.2.4 Workflow Coverage

#### 19.2.4.1 Horse lifecycle: **Production-grade**
Creation (HorseWizard with multi-step), ownership tracking with history, status tracking (intake_draft/active), pedigree (father_id/mother_id), profile completeness badges, media gallery, export functionality, shares/connections.

#### 19.2.4.2 Housing/boarding: **Production-grade**
Full admission lifecycle (draft→active→checkout_pending→checked_out) with status history. 7-step admission wizard. Financial gate (dual-scope: admission + client level). Manager override for balance blocks. Movement integration (check-in/check-out via RPC). Facility management (branch→area→unit hierarchy). Service plans with structured `includes`. Packaging-aware invoicing. Branch-scoped overview with KPIs.

#### 19.2.4.3 Breeding: **Production-grade**
Attempts → pregnancies → pregnancy checks → foalings → foal registration. Embryo transfers. Semen inventory (batches + tanks). Breeding contracts with pricing modes (fixed/per_event/package). Contract-linked invoicing via `CreateInvoiceFromBreedingEvent`. Entity timeline. HorseBreedingSection in profile.

#### 19.2.4.4 Vet: **Functional but incomplete**
Visits with status lifecycle (scheduled→confirmed→in_progress→completed→cancelled/no_show). Treatments with categories. Vaccinations with programs. Followups. Timeline. **CRITICAL: Uses mock data fallback** — `DashboardVet.tsx` lines 22-118 define `mockTreatments`, lines 120-190 `mockVaccinations`, lines 192-240 `mockFollowups`. When real data is empty, mocks display with amber demo alert. **No billing linkage** — no `CreateInvoiceFromVetVisit` or `source_type='vet_visit'` billing link exists. Vet is the only major stable subdomain without commercial integration.

#### 19.2.4.5 Movement: **Production-grade**
Full arrival/departure lifecycle. Eligible horse filtering by movement type. Manual external arrival (lightweight intake). Connected movement via cross-tenant RPC. Incoming arrivals. Dispatch with housing clearance rules. Movement detail with timeline. Consolidated under Housing tab.

### 19.2.5 Commercial and Billing Maturity

#### 19.2.5.1 Billable events
Boarding admissions (`source_type='boarding'`), breeding attempts/foalings (`source_type='breeding_attempt'`). **Vet visits are NOT billable** — no invoice generation dialog, no billing_link source type.

#### 19.2.5.2 Invoice creation patterns
`CreateInvoiceFromAdmission` — packaging-aware, generates base plan + included service line items. `CreateInvoiceFromBreedingEvent` — supports breeding attempts, pregnancies, foalings, embryo transfers. Both create draft invoices + billing_links.

#### 19.2.5.3 Billing-linked subdomains
Housing/Boarding: ✅ fully linked. Breeding: ✅ fully linked. Vet: ❌ no billing linkage. Movement: N/A (operational, not billable).

#### 19.2.5.5 Gaps
Vet is the single largest commercial gap in Stable. It has visits with cost fields (`estimated_cost`, `actual_cost`) but no invoice generation flow.

### 19.2.6 Permissions and Staff

#### 19.2.6.1 Access
Owner/manager see all. Staff see based on `usePermissions` checks. Module gating via `ModuleGuard`.

#### 19.2.6.3 HR/horse assignment
`HorseAssignedStaff` component renders in HorseProfile. `hr_assignments` links employees to horses.

### 19.2.7 UX Quality

#### 19.2.7.1 Desktop vs mobile
Desktop: sidebar nav with housing sub-sections. Mobile: `HousingBottomNav`, `BreedingBottomNavigation`, `VetBottomNavigation` — each subdomain has dedicated mobile bottom nav.

#### 19.2.7.4 Business operating system feel
Yes — Stable provides a cohesive operational surface covering horse intake, housing, breeding, health, movement, staff, clients, and finance. The only gap is vet billing.

### 19.2.8 Gaps

#### 19.2.8.1 Gap S1: Vet module has no billing linkage
Evidence: No `CreateInvoiceFromVetVisit` component. No `source_type='vet_visit'` in billing_links. `DashboardVet.tsx` has `actual_cost` but no invoice button.
Risk: Vet costs are tracked but never flow to finance. Operators must create manual invoices.
Direction: Create `CreateInvoiceFromVetVisit` dialog following the same pattern as consultation/breeding.
Effort: Small feature.
Priority: **High**.

#### 19.2.8.2 Gap S2: Vet uses mock data fallback
Evidence: `DashboardVet.tsx` lines 22-240 — 3 mock datasets. Lines 297-299 fallback logic. Demo alerts shown.
Risk: Creates false impression of populated vet module. Confusing for new users.
Direction: Remove mocks. Show proper empty states.
Effort: Quick fix.
Priority: **Medium**.

#### 19.2.8.3 Gap S3: `stables` table is legacy dead weight
Evidence: `horses.stable_id` references `stables`. `facility_areas` is the active model.
Risk: Schema confusion.
Direction: Drop FK reference in future migration (low priority).
Effort: Quick fix.
Priority: **Low**.

---

## 19.3 Laboratory Module Depth Audit

### 19.3.1 Lab Module Identity

#### 19.3.1.1 Coherent standalone module
Yes. Lab is the most architecturally self-contained module. It has its own horse registry (`lab_horses`), own nav config (`labNavConfig.ts`), own credits system, own cross-tenant request model, own snapshot contract, own mobile bottom nav.

#### 19.3.1.2 Dependencies
Shared: Finance (invoices, billing_links), Clients, Connections (for B2B). Lab-internal: does NOT depend on shared `horses` table for its own operations — uses `lab_horses` with optional `linked_horse_id` bridge.

#### 19.3.1.3 First-class
Absolutely first-class. Lab overrides the standard sidebar with `LAB_NAV_SECTIONS` when `isLabTenant && labMode === 'full'`.

### 19.3.2 Routes, Pages, UI

#### 19.3.2.1 Routes
`/dashboard/laboratory` (multi-tab: samples/results/requests/horses/catalog/compare/timeline/templates/settings), `/shared-lab-result/:token` (public result sharing).

#### 19.3.2.2 Subdomains

##### 19.3.2.2.1 Requests
`LabRequestsTab` — dual-mode: Stable-side (create requests to external labs) and Lab-side (incoming requests from stables). `RequestDetailDialog` — full request lifecycle with messaging (`LabRequestThread`). Status: pending→sent→processing→ready→received→cancelled. Dual-tenant model: `initiator_tenant_id` + `lab_tenant_id`. Horse/service/pricing snapshots via DB triggers.

##### 19.3.2.2.2 Samples
`SamplesList` + `SamplesTable` + `SamplesFilterTabs` + `CreateSampleDialog`. Status: draft→accessioned→processing→completed→cancelled. Daily numbering on accession. Walk-in horse/client support. Multi-template per sample via `lab_sample_templates` join. Retest support. Received/unreceived filter. Horse/client grouping views. `SampleProgressStepper` for visual lifecycle.

##### 19.3.2.2.3 Results/Reports
`ResultsList` + `ResultsTable` + `ResultsFilterTabs` + `CreateResultDialog` + `ResultPreviewDialog`. Status: draft→reviewed→final. Flags: normal/abnormal/critical. Template-driven data entry. Review/finalize workflow. `PublishToStableAction` — publishes reviewed/final results to requesting stable. `ResultSharePanel` — generates shareable tokens. `ResultsComparison` — compare results across samples. `CombinedResultsDialog`. `StableResultsView` + `StableResultViewerDialog` — stable-side result consumption via `get_stable_lab_results` RPC.

##### 19.3.2.2.4 Services/Templates
`LabServicesCatalog` + `LabServiceFormDialog` — service catalog with pricing modes (sum_templates/discount/override). `LabServiceTemplateLinker` — links templates to services. `LabTemplatesManager` + `TemplateDetailsDialog` — template definition with fields. `LabTestTypesManager` — test type taxonomy. `LabCatalogViewer` — public-facing catalog viewer.

##### 19.3.2.2.5 Operations
`LabCreditsPanel` — prepaid credit system for sample processing. `LabTimeline` — chronological event view. `LabHorsesList` + `LabHorseProfile` + `LabHorseEditDialog` — lab-specific horse registry with metrics.

### 19.3.3 Data Model

#### 19.3.3.1 Key tables (14+)
`lab_samples`, `lab_sample_templates` (junction), `lab_results`, `lab_templates`, `lab_test_types`, `lab_services`, `lab_service_templates` (junction), `lab_requests`, `lab_request_services` (junction with snapshots), `lab_request_messages`, `lab_horses`, `lab_result_shares`, `lab_credit_wallets`, `lab_credit_transactions`, `lab_events`, `horse_aliases`, `party_horse_links`.

#### 19.3.3.3 Relationships
Request → request_services (with price/name snapshots) → services → service_templates → templates. Sample → sample_templates → templates → results. Request optionally creates sample (`lab_request_id`). Lab_horse → optional linked_horse_id → horses. Credits: wallet → transactions (purchase/debit/refund).

### 19.3.4 Workflow Coverage

#### 19.3.4.1 Request creation: **Production-grade**
Dual-mode (stable-initiated and lab-received). Snapshot triggers for horse identity, service names, pricing. Cross-tenant message thread. Status lifecycle with immutable field protection.

#### 19.3.4.2 Sample from request: **Production-grade**
`CreateSampleDialog` accepts `fromRequest` prop to prefill horse/client/template data.

#### 19.3.4.3 Sample numbering: **Production-grade**
Daily numbering per tenant assigned at accession. `accessioned_at` timestamp trigger. Physical sample ID support.

#### 19.3.4.4 Sample lifecycle: **Production-grade**
draft→accessioned→processing→completed→cancelled. Auto-timestamps on transitions. Credit debit on accession.

#### 19.3.4.5 Result production: **Production-grade**
Template-driven data entry. Draft→reviewed→final. Creator and reviewer tracking. Abnormal/critical flags.

#### 19.3.4.6 Sharing/privacy: **Production-grade**
SECURITY DEFINER RPC (`get_stable_lab_results`) for cross-tenant result delivery. Publish gate (published_to_stable flag). Share tokens for public access. Snapshot contract prevents cross-tenant data leakage.

#### 19.3.4.7 Credits/billing: **Production-grade**
Prepaid credit wallet. Purchase/debit/refund transactions. Debit on sample accession. Feature-gated via `is_lab_credits_enabled`. Invoice generation via `GenerateInvoiceDialog` + `useLabInvoiceDraft`.

### 19.3.5 Commercial Maturity

#### 19.3.5.1 How lab work becomes billable
Two paths: (A) Credit debit on sample accession — prepaid model. (B) Invoice generation from sample — creates invoice + `invoice_items(entity_type='lab_sample')` + `billing_link`. `useSampleInvoiceMap` tracks which samples are invoiced.

#### 19.3.5.2 Pricing
Service-level pricing with modes: sum_templates (compute from template base_prices), discount (apply %), override (fixed). Pricing snapshot at request creation via DB trigger.

#### 19.3.5.4 Gaps
Lab commercial model is the most mature. Minor gap: no automated recurring billing for high-volume lab clients (manual per-sample invoicing).

### 19.3.6 Privacy and Cross-Tenant Design

#### 19.3.6.1 Source data access
Lab tenants access horse identity ONLY via snapshots in `lab_requests` and `lab_horses`. Never direct cross-tenant query to `horses` table. Horse aliases support privacy masking.

#### 19.3.6.2 Snapshot vs live-link
Snapshots at creation time (immutable). No live-link — intentional for privacy and price integrity.

#### 19.3.6.4 Robustness
Robust. SECURITY DEFINER triggers prevent RLS bypass. Immutable field protection on requests. 3-layer sharing model (connection→grant→RLS).

### 19.3.7 UX Quality

#### 19.3.7.1 Desktop vs mobile
Desktop: `LAB_NAV_SECTIONS` replaces standard sidebar for full-mode lab tenants. Mobile: `LabBottomNavigation` with 5 quick-access tabs. `MobileHomeGrid` shows lab sections as cards.

#### 19.3.7.3 Operationally complete
Yes. Lab provides sample intake → processing → result → sharing → billing as a continuous workflow.

### 19.3.8 Gaps

#### 19.3.8.1 Gap L1: No lab-specific dashboard widgets
Evidence: Lab tenants land on generic `Dashboard.tsx`. No lab KPIs (samples today, pending results, credit balance) on the dashboard.
Direction: Add `LabDashboardWidgets` component similar to `BoardingDashboardWidgets`.
Effort: Small feature.
Priority: **Medium**.

#### 19.3.8.2 Gap L2: Lab samples not in Activity Log / Records
Evidence: `useActivityLog` queries `lab_events` — but lab events may not be as granular as housing/breeding event tracking. Lab samples produce `lab_events` rows, so this works. **Actually functional — not a gap.**

---

## 19.4 Doctor Module Depth Audit

### 19.4.1 Doctor Module Identity

#### 19.4.1.1 Truly independent
Yes. Doctor is a **fully independent module** with its own table namespace (`doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_followups`, `doctor_services`). It does NOT share tables with stable vet (`vet_visits`, `vet_treatments`, `vet_followups`).

#### 19.4.1.2 Relationship to stable vet
**None architecturally.** Doctor and Vet are completely separate systems. Vet is a stable add-on for tracking horse health within a facility. Doctor is an independent clinical module for veterinary practitioners managing their own patient registry. They have different table namespaces, different hooks, different components, and different nav entries.

#### 19.4.1.3 Shared dependencies
Finance (invoices, billing_links), Clients. Does NOT depend on shared `horses` table — uses `doctor_patients` with optional `linked_horse_id`.

### 19.4.2 Routes, Pages, UI

#### 19.4.2.1 Routes
`/dashboard/doctor` (overview), `/dashboard/doctor/patients`, `/dashboard/doctor/consultations`, `/dashboard/doctor/consultations/:id` (detail/new), `/dashboard/doctor/services`.

#### 19.4.2.2 Subdomains

##### 19.4.2.2.1 Consultations
`DashboardDoctorConsultations` — list with search/filter. `DashboardDoctorConsultationDetail` (197 lines) — full detail view with: edit mode, status transition buttons (draft/scheduled/in_progress/completed/cancelled), prescriptions panel, followups panel, billing links display, invoice generation CTA. `ConsultationForm` — create/edit with patient picker, type, priority, scheduling, cost, clinical fields (complaint/findings/diagnosis/recommendations). Snapshot: `horse_name_snapshot`, `horse_name_ar_snapshot`, `stable_name_snapshot`, `horse_snapshot` via SECURITY DEFINER trigger.

##### 19.4.2.2.2 Prescriptions
`PrescriptionList` — per-consultation list. `usePrescriptions` — CRUD on `doctor_prescriptions`. Fields: medication_name, dose, frequency, duration_days, start/end dates, notes. No downstream pharmacy integration.

##### 19.4.2.2.3 Doctor Services
`DashboardDoctorServices` — standalone catalog page. `ServiceFormDialog` — create/edit with bilingual names, description, base_price, currency, category, active toggle. `useDoctorServices` — queries `doctor_services` table. **Parallel to shared `tenant_services`** — creates confusion (two service catalogs).

##### 19.4.2.2.4 Dashboard
`DashboardDoctorOverview` (91 lines) — 4 KPI cards (patients, active consultations, today's followups, revenue). Recent consultations list. Upcoming followups list. Revenue computed from paid invoices.

### 19.4.3 Data Model

#### 19.4.3.1 Tables (5)
`doctor_patients` — lightweight horse registry with owner info, linked_horse_id, microchip/passport/UELN, source, archived flag, metadata JSONB. Tenant-scoped unique indexes on microchip/passport.
`doctor_consultations` — status lifecycle (draft/scheduled/in_progress/completed/cancelled), clinical fields, snapshot fields, actual_cost, currency, published_to_stable flag.
`doctor_prescriptions` — medication records linked to consultations.
`doctor_followups` — date + status + notes per consultation.
`doctor_services` — service catalog with bilingual names and pricing.

#### 19.4.3.4 Naming drift
Doctor tables use `doctor_` prefix consistently. No overlap with `vet_*` tables. However, `doctor_followups` and `vet_followups` are separate tables with identical conceptual purpose but different schemas (doctor's has `consultation_id`, vet's has treatment-based linkage).

### 19.4.4 Workflow Coverage

#### 19.4.4.1 Consultation: **Production-grade**
Create → schedule → start → complete. Full clinical documentation (complaint, findings, diagnosis, recommendations). Patient picker from doctor_patients. Cost tracking. Snapshot trigger captures patient identity at creation. Status transition buttons in detail view.

#### 19.4.4.1.5 Invoice linkage: **Production-grade**
`CreateInvoiceFromConsultation` — creates draft invoice + `billing_link(source_type='doctor_consultation')`. Client picker with fallback to snapshot name. Amount prefilled from `actual_cost`. Linked invoices displayed in detail view.

#### 19.4.4.2 Prescriptions: **Functional but incomplete**
Creation and listing work. No downstream integration (no pharmacy fulfillment, no drug interaction check, no refill tracking). Pure text-based medication recording.

#### 19.4.4.3 Doctor services: **Functional but commercially disconnected**
Catalog exists. `base_price` stored. But `ConsultationForm` does NOT link to doctor_services — cost is manually entered as `actual_cost`. No service selection during consultation creation. No multi-service billing.

#### 19.4.4.4 Records/schedule: **Gap**
`useScheduleItems` does NOT query `doctor_consultations`. Doctor consultations do NOT appear on the shared schedule. `useActivityLog` does NOT query any doctor event table (no `doctor_events` table exists). Doctor activity is invisible in Records.

### 19.4.5 Commercial Maturity

#### 19.4.5.1 How doctor work becomes billable
Consultation → manual cost entry → "Create Invoice" button → draft invoice + billing_link. Direct and functional.

#### 19.4.5.3 Service pricing
`doctor_services.base_price` exists but is never consumed during consultation flow. Cost is always manually entered.

#### 19.4.5.4 Gaps
Services catalog is disconnected from billing. No service-selection-to-cost-prefill. No multi-service consultations.

### 19.4.6 Permissions and Cross-Tenant

#### 19.4.6.1 Horse/client access
Doctor maintains its own patient registry (`doctor_patients`). `linked_horse_id` optionally bridges to shared `horses` table. Patient identity is snapshotted into consultations.

#### 19.4.6.3 Robustness
Adequate. Snapshot trigger prevents data loss if horse record changes. Cross-tenant data is not directly queried.

### 19.4.7 UX Quality

#### 19.4.7.1 Desktop vs mobile
Desktop: doctor nav items in sidebar (Overview, Patients, Consultations, Services). Mobile: same items in home grid via `tenantType: "doctor"` filter. No doctor-specific bottom nav (unlike Lab and Stable submodules).

#### 19.4.7.3 Complete standalone feel
Yes, largely. Doctor has overview → patients → consultations → detail → prescriptions → followups → invoicing as a continuous workflow. The missing schedule integration is the main gap.

### 19.4.8 Gaps

#### 19.4.8.1 Gap D1: Doctor services disconnected from consultations
Evidence: `ConsultationForm` does not reference `doctor_services`. `actual_cost` is manually typed. No service picker in consultation flow.
Risk: Service catalog is a dead-end — defined but never used in billing.
Direction: Add service selector to ConsultationForm that prefills cost from `doctor_services.base_price`.
Effort: Small feature.
Priority: **High**.

#### 19.4.8.2 Gap D2: No doctor_consultations in Schedule
Evidence: `useScheduleItems` queries 7 sources — none are `doctor_consultations`. Doctor `scheduled_for` field exists but is not surfaced in calendar.
Risk: Doctor's schedule is empty.
Direction: Add `doctor_consultations` query to `useScheduleItems`.
Effort: Quick fix.
Priority: **High**.

#### 19.4.8.3 Gap D3: No doctor events in Records/Activity
Evidence: No `doctor_events` table. `useActivityLog` only queries `vet_events`, `lab_events`, `breeding_events`.
Risk: Doctor activity invisible in audit trail.
Direction: Create `doctor_events` table + trigger on consultation status changes, or add direct query to `doctor_consultations` in `useActivityLog`.
Effort: Medium.
Priority: **Medium**.

#### 19.4.8.4 Gap D4: No doctor-specific mobile bottom nav
Evidence: Lab has `LabBottomNavigation`, Housing has `HousingBottomNav`, Breeding has `BreedingBottomNavigation`. Doctor has none.
Risk: Mobile UX less polished for doctors.
Direction: Create `DoctorBottomNavigation`.
Effort: Small.
Priority: **Low**.

#### 19.4.8.5 Gap D5: Parallel service catalogs (doctor_services vs tenant_services)
Evidence: Doctor has `DashboardDoctorServices` managing `doctor_services`. Shared `DashboardServices` manages `tenant_services`. Both are visible in sidebar.
Risk: User confusion — two service management pages.
Direction: Either hide shared Services page for doctor tenants or merge catalogs using `service_kind='doctor'` discriminator.
Effort: Medium refactor.
Priority: **Medium**.

---

## 19.5 Cross-Module Comparison

### 19.5.1 Architectural maturity
Lab > Stable > Doctor. Lab is self-contained with own nav, own horse registry, own credit system, own snapshot contract. Stable is comprehensive but sprawling (50+ column horses table, module family). Doctor is clean but thin.

### 19.5.2 Workflow completeness
Stable ≈ Lab > Doctor. Stable has full lifecycles across 5 subdomains (though vet is weakest). Lab has complete sample-to-result-to-billing lifecycle. Doctor has consultation lifecycle but service catalog is disconnected.

### 19.5.3 Billing/commercial maturity
Lab > Stable > Doctor. Lab has dual billing model (credits + invoicing) with pricing snapshots. Stable has boarding + breeding billing (vet missing). Doctor has consultation billing but services unused.

### 19.5.4 Permission/privacy
Lab > Doctor > Stable. Lab has the most robust cross-tenant privacy (SECURITY DEFINER triggers, snapshot contracts, immutable fields). Doctor has snapshot triggers. Stable relies on standard RLS.

### 19.5.5 Mobile/desktop
Stable ≈ Lab > Doctor. Stable and Lab both have dedicated bottom navs per subdomain. Doctor lacks mobile bottom nav.

### 19.5.6 Hidden debt
Stable: Vet mock data, missing vet billing. Lab: minimal debt. Doctor: disconnected services, missing schedule/records integration.

### 19.5.7 Ranking
1. **Laboratory** — most architecturally mature, commercially complete, privacy-robust
2. **Stable** — most comprehensive but with vet commercial gap and mock data debt
3. **Doctor** — clean and functional but thinnest, with service catalog and schedule gaps

### 19.5.8 Why
Lab wins because it has zero mock data, zero dead paths, complete billing pipeline, robust cross-tenant design, and self-contained architecture. Stable is larger but carries more debt. Doctor is well-designed but underbuilt in integration points.

---

## 19.6 Platform Implications

### 19.6.1 Center of gravity
The platform's true center is Stable + Lab B2B partnership. Doctor is a clean satellite. Everything else is peripheral or aspirational.

### 19.6.2 Validated abstractions
`billing_links` pattern (used by all 3), `displayHelpers` bilingual rendering, `formatStandardDate/DateTime`, client management, snapshot-based cross-tenant data safety, draft-first invoice lifecycle.

### 19.6.3 Abstractions that break outside
`useScheduleItems` — only works for Stable+Lab, not Doctor. `useActivityLog` — only Stable+Lab, not Doctor. Module gating — Academy/Doctor use tenantType instead of moduleKey.

### 19.6.4 Lessons for expansion
Lab's self-contained pattern (own horse registry, own nav, own snapshot contract) is the best template for new modules. Doctor's lightweight table namespace with `linked_horse_id` bridge is good for satellite modules. Stable's sprawling approach should not be replicated.

---

## 19.7 Gap Map — Highest Priority

### 19.7.2.1 Immediate fixes
1. **D2**: Add doctor_consultations to Schedule — Quick fix, High priority
2. **S2**: Remove vet mock data — Quick fix, Medium priority

### 19.7.2.2 Medium refactors
3. **S1**: Create vet billing linkage — Small feature, High priority
4. **D1**: Connect doctor services to consultation flow — Small feature, High priority
5. **D3**: Add doctor events to Records — Medium, Medium priority
6. **D5**: Resolve parallel service catalogs — Medium refactor, Medium priority

### 19.7.2.3 Structural redesigns
7. **L1**: Lab dashboard widgets — Small feature but new component pattern

---

## 19.8 Summary

### 19.8.1 Stable maturity
Production-grade across horse registry, housing/boarding, breeding, and movement. Vet subdomain is functional but commercially disconnected and polluted with mock data. Overall: **85% mature** — the commercial gap in vet is the main issue.

### 19.8.2 Laboratory maturity
Production-grade across all surfaces. Most architecturally self-contained module. Robust cross-tenant privacy. Dual billing model. **95% mature** — only missing lab dashboard KPI widgets.

### 19.8.3 Doctor maturity
Functional and clean consultation lifecycle with billing integration. But service catalog is disconnected, schedule is not integrated, activity log is invisible, and mobile UX lacks dedicated bottom nav. **70% mature** — the integration gaps with shared modules are the main issue.

### 19.8.4 Best template for expansion
**Laboratory** — its self-contained architecture (own namespace, own horse bridge, own nav, own snapshot contract, own credit system) provides the cleanest pattern for building new domain modules without creating Stable-style sprawl.

### 19.8.5 Recommended next audit slice
**Integration & Cross-Module Flow Audit** — examining how data flows between modules (Lab requests from Stable, Doctor consultations to Stable, Connected movements, Shared results), identifying broken or incomplete cross-module pathways, and assessing whether the platform's module-to-module communication architecture is robust enough for the full 10-module vision.

---

## 20 Output Rules
All findings evidence-based with file/line references. No code patches.

## 21 Final Deliverable State

### 21.1 Final numbering point reached: **19.8.5**
### 21.2 Recommended next starting number: **22**
### 21.3 Recommended next audit slice: **Integration & Cross-Module Flow Audit** — examining cross-module data flows (Lab↔Stable, Doctor↔Stable, Connected Movements, Shared Results), broken integration pathways, and communication architecture readiness for the 10-module vision.
```
