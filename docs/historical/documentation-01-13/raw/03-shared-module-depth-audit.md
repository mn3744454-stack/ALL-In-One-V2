

# 16 — Shared Module Depth Audit

---

## 16.1 Audit Scope and Method

### 16.1.1 Surfaces Inspected
Finance (`DashboardFinance.tsx`, `useInvoices`, `useExpenses`, `useLedger`, `billing_links`, `InvoiceDetailsSheet`, `LedgerRowPreview`, `ClientStatementTab`, `SupplierPayablesTab`), HR (`DashboardHR.tsx`, `DashboardHRPayroll.tsx`, `DashboardHRAttendance.tsx`, `DashboardHRSettings.tsx`, `useEmployees`, `useSalaryPayments`), Services (`DashboardServices.tsx`, `useServices`, `ServicePlansManager`, `ServiceFormDialog`), Clients (`DashboardClients.tsx`, `useClients`, `ClientStatementTab`, `ClientFormDialog`), Schedule (`DashboardSchedule.tsx`, `useScheduleItems`), Records (`DashboardRecords.tsx`, `useActivityLog`), Files (`DashboardFileManager.tsx`, `useMediaAssets`), Settings (`DashboardOrganizationSettings.tsx`, `DashboardRolesSettings`, `DashboardPermissionsSettings`, `DashboardConnectionsSettings`, `DashboardNotificationSettings`), Public Profile (`DashboardPublicProfile.tsx`), Community (`CommunityFeed.tsx`), Navigation (`DashboardSidebar.tsx`, `MobileHomeGrid.tsx`, `navConfig.ts`).

### 16.1.2 Files Inspected
All pages listed above, hooks in `src/hooks/finance/`, `src/hooks/hr/`, `src/hooks/clients/`, `src/hooks/useScheduleItems.ts`, `src/hooks/useActivityLog.ts`, `src/hooks/useServices.ts`, `src/hooks/useMediaAssets.ts`, `src/hooks/usePermissions.ts`, `src/hooks/useModuleAccess.ts`. Component directories: `src/components/finance/`, `src/components/clients/`, `src/components/hr/`, `src/components/services/`, `src/components/schedule/`, `src/components/connections/`, `src/components/community/`.

### 16.1.3 Classification Criteria

#### 16.1.3.1 Visible shared surface
Nav item exists, route works, page renders for the tenant type.

#### 16.1.3.2 Actually functional shared surface
Data can be created, read, and operated upon meaningfully without horse/stable-specific context.

#### 16.1.3.3 Shared surface with hidden stable-centric assumptions
UI renders, but underlying hooks, filters, or display logic assumes horses, boarding, or stable-specific entities.

#### 16.1.3.4 Technically reusable but operationally weak
Surface works generically but provides no contextual value without domain-specific data to populate it.

### 16.1.4 Confidence
High for all shared surfaces — full source inspected.

---

## 16.2 Shared Finance Surface Audit

### 16.2.1 Architecture
Finance provides 5 tabs: Invoices, Expenses, Payables, Payments, Ledger. All tenant-scoped via `activeTenant.tenant.id`. Currency hardcoded to `SAR` in display (`formatCurrency(amount, "SAR")`). Tabs are role-gated to owner/manager. Invoices support the draft→approved→paid lifecycle with ledger posting. `billing_links` connect invoices to domain events (`boarding`, `breeding_attempt`, `lab_sample`, `doctor_consultation`). Statement enrichment (`useStatementEnrichment`) resolves horse names and sample labels per invoice. `LedgerRowPreview` displays horse names in ledger context.

### 16.2.2 Tenant-Type Assessment
Finance is **structurally tenant-agnostic** — it queries `invoices`, `expenses`, `ledger_entries` by `tenant_id` without type checks. However, the **enrichment and context layers** assume horse-centric data:
- `InvoiceDetailsSheet` resolves `lab_horse_id` and `horse` names for context display
- `ClientStatementTab` uses horse names extensively (🐴 emoji prefix, horse summary lines)
- `LedgerRowPreview` displays `horseName`/`horseNameAr`
- These gracefully degrade (skip horse display when absent), so they do NOT break for non-horse tenants — they just show less context.

### 16.2.3 Per-Tenant-Type Assessment

#### 16.2.3.1 Stable
Visibility: Full. Finance deeply meaningful. Boarding invoices, breeding invoices, expense tracking, supplier payables — all operational. **Strongly meaningful.**

#### 16.2.3.2 Laboratory
Visibility: Full. Lab generates invoices from samples, ledger tracks payments, statement enrichment resolves sample IDs. **Strongly meaningful.**

#### 16.2.3.3 Doctor
Visibility: Full. Consultations generate invoices via billing_links. Expenses and ledger work. **Strongly meaningful.**

#### 16.2.3.4 Clinic
Visibility: Full. Can invoice vet visits (if using vet module), track expenses. **Meaningful with caveats** — no direct billable-event-to-invoice flow exists for clinic-specific workflows.

#### 16.2.3.5 Academy
Visibility: Full. Can create manual invoices for sessions/bookings, track expenses. No automated billing_link from `academy_bookings` to invoices exists. **Meaningful with caveats.**

#### 16.2.3.6 Horse Owner
Visibility: Full (if org mode). Can create expenses, track manual invoices. No domain-specific billable events. **Technically available but contextually weak.**

#### 16.2.3.7 Pharmacy / Trainer / Auction / Transport
Visibility: Full. Can track generic expenses and manual invoices. No domain-specific workflows generate financial events. **Technically available but contextually weak.**

### 16.2.4 Stable/Lab/Doctor-Centric Assumptions
1. Horse names in statement enrichment (gracefully degrades)
2. `billing_links.source_type` enum: `boarding`, `breeding_attempt`, `lab_sample`, `doctor_consultation` — no academy/pharmacy/transport source types exist
3. `SAR` currency hardcoded — no multi-currency support
4. POS exists but payment processing integration unclear

### 16.2.5 Missing Abstractions
1. No `billing_links` source type for `academy_booking` or `academy_session`
2. No invoice-from-booking flow for Academy
3. No pharmacy/transport/auction billable event types

### 16.2.6 Production Readiness
- **Production-grade for**: Stable, Lab, Doctor
- **Functional for**: Clinic, Academy (manual invoicing works)
- **Generic/empty for**: Pharmacy, Trainer, Auction, Transport, Horse Owner

---

## 16.3 Shared HR / Team / Payroll Audit

### 16.3.1 Architecture
HR provides employees CRUD, salary payments, attendance tracking, employment-kind classification, horse-assignment tracking. `hr_employees` table is tenant-scoped. Payroll generates salary payment records. HR Settings page manages modules, employment kinds, and work schedules. Role-gated to owner/manager.

### 16.3.2 Staffed Organization Assumption
Yes. HR assumes a staffed organization with employees. The `hr_employees` table includes fields like `job_title`, `department`, `monthly_salary`, `employment_kind`. **Horse assignment** (`hr_assignments`) explicitly links employees to horses — this is a stable-centric feature.

### 16.3.3 Per-Tenant-Type Assessment

#### 16.3.3.1 Stable
**Strongly meaningful.** Employees manage horses, payroll tracks salaries, horse assignments link staff to specific animals.

#### 16.3.3.2 Laboratory / Clinic / Academy
**Meaningful with caveats.** Employee tracking and payroll work generically. Horse assignment feature is irrelevant but does not break (simply unused). Lab technicians, clinic nurses, academy instructors can all be tracked.

#### 16.3.3.3 Doctor / Trainer
**Contextually weak.** Independent professionals typically don't have employees. HR surfaces are visible but the "manage your team" framing is misleading for solo practitioners. However, they might eventually hire assistants, so it's not wrong — just premature.

#### 16.3.3.4 Horse Owner
**Misleadingly exposed.** A horse owner with no organization has no need for HR. If they have a tenant, they see HR in the sidebar, which is confusing.

#### 16.3.3.5 Pharmacy / Transport / Auction
**Technically available but contextually weak.** These tenants might have employees, but the horse-assignment feature is irrelevant. The rest of HR (employee management, payroll) is genuinely reusable.

### 16.3.4 Where HR Should Be Simplified
1. Horse Assignment section should be conditionally hidden for non-horse-owning tenants
2. HR nav could be hidden for solo-practitioner tenant types (doctor, trainer) by default, with opt-in visibility

### 16.3.5 Production Readiness
- **Production-grade for**: Stable
- **Functional for**: Lab, Clinic, Academy, Pharmacy, Transport, Auction
- **Misleading for**: Doctor (solo), Trainer (solo), Horse Owner

---

## 16.4 Shared Services Audit

### 16.4.1 Architecture
`tenant_services` table with `service_kind` discriminator (`service`, `boarding`, `breeding`). `DashboardServices` has two tabs: Catalog (CRUD for services) and Plans (`ServicePlansManager` for `stable_service_plans`). Services are tenant-scoped.

### 16.4.2 Stable-Shaped Logic
The Plans tab renders `ServicePlansManager` which is imported from `src/components/housing/ServicePlansManager.tsx` — this is explicitly a **housing/boarding** component. The Plans tab always renders for ALL tenant types even though boarding plans are irrelevant for Lab, Doctor, Pharmacy, etc.

### 16.4.3 Per-Tenant-Type Assessment

#### 16.4.3.1 Stable
**Strongly meaningful.** Service catalog defines boarding, breeding, and general services. Plans tab manages boarding packages with included services.

#### 16.4.3.2 Doctor
**Meaningful with caveats.** Doctor has its own `doctor_services` table AND can use shared `tenant_services`. The Doctor Services page (`DashboardDoctorServices`) manages `doctor_services`, NOT `tenant_services`. So the shared Services page is potentially confusing — two parallel service catalogs exist.

#### 16.4.3.3 Laboratory
**Meaningful with caveats.** Lab has `lab_services` and `lab_templates` — its own service catalog. The shared Services page adds generic services. No conflict, but potentially confusing to have two service management surfaces.

#### 16.4.3.4 Academy
**Technically available.** Can define generic services (e.g., "private lesson", "group session"). Plans tab is irrelevant (boarding plans). **Meaningful with caveats** — the Plans tab should be hidden for non-stable tenants.

#### 16.4.3.5 Clinic / Pharmacy / Trainer / Transport / Auction / Horse Owner
**Technically available but contextually weak.** Can define generic services. Plans tab is misleading. No domain-specific service workflows.

### 16.4.4 Missing Abstractions
1. Plans tab should be conditionally shown only for tenants with housing enabled
2. Doctor and Lab have their own service catalogs — shared services page adds confusion without adding value
3. `service_kind` discriminator only covers `service`, `boarding`, `breeding` — no `doctor`, `lab`, `academy` kinds

### 16.4.5 Production Readiness
- **Production-grade for**: Stable
- **Functional with confusion for**: Doctor, Lab (parallel catalogs)
- **Misleading for**: All others (Plans tab shown universally)

---

## 16.5 Shared Clients Audit

### 16.5.1 Architecture
`clients` table with `name`, `name_ar`, `type` (individual/organization/farm/clinic), `status`, `credit_limit`, bilingual support, tenant-scoped via RLS. `useClients` hook queries by `tenant_id`. `displayClientName` helper for bilingual rendering. `ClientStatementTab` provides financial history per client.

### 16.5.2 Reusability Assessment
Clients is **truly tenant-agnostic in schema**. The `client_type` enum (`individual`, `organization`, `farm`, `clinic`) is generic enough. No horse reference in the clients table itself. Horse associations come through `billing_links` and `invoice_items`, which gracefully degrade.

### 16.5.3 Per-Tenant-Type Assessment

#### 16.5.3.1 Stable / Lab / Doctor
**Strongly meaningful.** All three have natural client relationships: Stable has horse owners, Lab has referring vets/stables, Doctor has horse owners. Auto-creation in Lab, manual in Stable/Doctor.

#### 16.5.3.2 Clinic / Academy
**Meaningful.** Clinics serve horse owners (clients). Academies have students/parents (clients). The `client_type` enum covers these adequately.

#### 16.5.3.3 Pharmacy
**Meaningful if domain existed.** Would serve stable operators and horse owners as clients.

#### 16.5.3.4 Trainer
**Meaningful.** Would track horse owners as clients.

#### 16.5.3.5 Transport / Auction / Horse Owner
**Technically available.** Transport might track stables as clients. Auction might track bidders. Horse Owner having "clients" makes no sense — they ARE the client in the ecosystem.

### 16.5.4 Stable-Centric Assumptions
1. `ClientStatementTab` enrichment heavily uses horse names and sample labels — fine for Stable/Lab, irrelevant for Academy/Transport
2. `client_type: 'farm'` is equestrian-specific but not problematic
3. No assumption that clients own horses — the link is through invoices/billing_links only

### 16.5.5 Production Readiness
- **Production-grade for**: Stable, Lab, Doctor
- **Functional for**: Clinic, Academy, Pharmacy, Trainer
- **Misleading for**: Horse Owner (they ARE clients, not client-havers)

---

## 16.6 Shared Schedule Audit

### 16.6.1 Architecture
`useScheduleItems` aggregates from 7 data sources: `vet_visits`, `vet_followups`, `horse_vaccinations`, `breeding_attempts`, `horse_movements`, `academy_sessions`, `lab_samples`. Renders calendar, list, and grid views. Module filter dropdown offers: vet, vet_followups, vaccinations, breeding, movement, academy, laboratory.

### 16.6.2 Assessment
Schedule is a **data-aggregation surface, not a standalone feature**. It has no own data table — it reads from other module tables. If those modules are empty, the schedule is empty.

### 16.6.3 Per-Tenant-Type Assessment

#### 16.6.3.1 Stable
**Strongly meaningful.** Vet visits, vaccinations, breeding attempts, movements — all populate the schedule.

#### 16.6.3.2 Laboratory
**Meaningful.** Lab samples with collection dates appear on schedule.

#### 16.6.3.3 Doctor
**Weak.** No `doctor_consultations` source in `useScheduleItems`. Doctor consultations do NOT appear on the schedule. **Gap.**

#### 16.6.3.4 Academy
**Meaningful.** Academy sessions appear on schedule.

#### 16.6.3.5 Clinic
**Meaningful.** Vet visits and vaccinations appear.

#### 16.6.3.6 All Others (Pharmacy/Trainer/Transport/Auction/Horse Owner)
**Empty.** No data sources to populate the schedule. **Contextually weak.**

### 16.6.4 Production Readiness
- **Production-grade for**: Stable
- **Functional for**: Lab, Academy, Clinic
- **Missing integration**: Doctor (consultations not wired)
- **Empty for**: Pharmacy, Trainer, Transport, Auction, Horse Owner

---

## 16.7 Shared Records Audit

### 16.7.1 Architecture
`useActivityLog` aggregates from 3 event tables: `vet_events`, `lab_events`, `breeding_events`. Module filter only offers: vet, lab, breeding, orders. Module type union is `"vet" | "lab" | "breeding" | "orders"` — no doctor, academy, housing, or other modules.

### 16.7.2 Assessment
Records is **narrowly scoped to Stable/Lab domain events only**. It does not surface doctor consultations, academy sessions, housing admissions, or financial events.

### 16.7.3 Per-Tenant-Type Assessment

#### 16.7.3.1 Stable
**Meaningful.** Vet events and breeding events populate the log.

#### 16.7.3.2 Laboratory
**Meaningful.** Lab events (sample status changes) populate the log.

#### 16.7.3.3 Doctor
**Empty.** No `doctor_events` table or aggregation in `useActivityLog`. **Gap.**

#### 16.7.3.4 Academy
**Empty.** No academy event aggregation.

#### 16.7.3.5 All Others
**Empty.** No data sources.

### 16.7.4 Production Readiness
- **Functional for**: Stable, Lab
- **Empty for**: All other 8 tenant types

---

## 16.8 Shared Files / Documents Audit

### 16.8.1 Architecture
`DashboardFileManager.tsx` (517 lines) provides a full file management UI with grid/list views, filtering, bulk operations. Uses `useMediaAssets` which queries a `media_assets` or equivalent table by tenant. Supports image, video, document types with visibility controls (private/public/shared).

### 16.8.2 Assessment
File Manager is **truly tenant-agnostic**. No horse or domain assumptions. Any tenant can upload and manage files.

### 16.8.3 Per-Tenant-Type Assessment
All 10 types: **Meaningful.** Generic file storage is universally useful. However, only visible to owner/manager roles.

### 16.8.4 Production Readiness
- **Production-grade for**: All tenant types (truly shared)

---

## 16.9 Shared Settings / Permissions / Delegation Audit

### 16.9.1 Architecture
`DashboardOrganizationSettings` provides: Module toggles (vet, housing, movement, breeding), Lab mode selector, links to Permissions/Roles/Connections/Notifications sub-pages. Permission system includes: `permission_definitions`, `permission_bundles`, `tenant_roles`, `tenant_role_permissions`, `delegation_scopes`, `delegation_audit_log`.

### 16.9.2 Assessment
Settings is **structurally robust and platform-wide**. However, module toggles only expose 4 horse-centric modules (vet, housing, movement, breeding) + lab mode. No toggles for doctor or academy modules. No module representation for pharmacy/transport/auction.

### 16.9.3 Per-Tenant-Type Assessment

#### 16.9.3.1 Stable
**Strongly meaningful.** All module toggles relevant. Full permission/role management.

#### 16.9.3.2 Laboratory
**Meaningful.** Lab mode selector relevant. Module toggles less relevant but not harmful. Permissions work.

#### 16.9.3.3 Doctor
**Meaningful with caveats.** Module toggles (vet, housing, breeding) are irrelevant for a solo doctor. No doctor-specific settings. Permissions/roles work if they have staff.

#### 16.9.3.4 Academy
**Meaningful with caveats.** Module toggles are irrelevant. No academy-specific settings page.

#### 16.9.3.5 All Others
**Technically available.** Module toggles are irrelevant for pharmacy/transport/auction but don't cause harm.

### 16.9.4 Missing Abstractions
1. No module toggle for `doctor_consultations` or `academy` capabilities
2. Module toggles assume horse-centric add-ons only
3. No tenant-type-aware settings page that adapts content to the active module profile

### 16.9.5 Production Readiness
- **Production-grade for**: Stable (settings deeply relevant)
- **Functional for**: Lab, Doctor, Clinic, Academy (permissions/roles work)
- **Superficially exposed for**: Pharmacy, Trainer, Transport, Auction, Horse Owner

---

## 16.10 Public Profile / Community / Notifications

### 16.10.1 Public Profile
`DashboardPublicProfile` — owner-only page to configure tenant's public-facing profile (name, slug, logo, description). Tenant-agnostic. **Truly shared and meaningful for all tenant types.**

### 16.10.2 Community
`CommunityFeed` — post/follow/comment social feed. Supports both personal and org scoping. No horse or stable assumptions in the feed itself. **Truly shared.** However, the value proposition varies — a Lab posting updates is different from a Horse Owner sharing photos. Both work technically.

### 16.10.3 Notifications
`NotificationsPanel`, `useNotifications`, push subscription. Tenant-scoped notifications. **Truly shared** — no domain assumptions.

### 16.10.4 Production Readiness
- **Production-grade for**: All tenant types (genuinely tenant-agnostic)

---

## 16.11 Cross-Tenant-Type Meaningfulness Matrix

```text
Module          | Stable | Lab   | Doctor | Clinic | Academy | HorseOwn | Pharmacy | Trainer | Transport | Auction
----------------|--------|-------|--------|--------|---------|----------|----------|---------|-----------|--------
Finance         | Strong | Strong| Strong | Caveat | Caveat  | Weak     | Weak     | Weak    | Weak      | Weak
HR              | Strong | Func  | Weak   | Func   | Func    | Mislead  | Func     | Weak    | Func      | Func
Services        | Strong | Caveat| Caveat | Weak   | Caveat  | Weak     | Weak     | Weak    | Weak      | Weak
Clients         | Strong | Strong| Strong | Func   | Func    | Mislead  | Func     | Func    | Weak      | Weak
Schedule        | Strong | Func  | GAP    | Func   | Func    | Empty    | Empty    | Empty   | Empty     | Empty
Records         | Func   | Func  | Empty  | Func   | Empty   | Empty    | Empty    | Empty   | Empty     | Empty
Files           | Strong | Strong| Strong | Strong | Strong  | Strong   | Strong   | Strong  | Strong    | Strong
Settings/Perms  | Strong | Func  | Caveat | Func   | Caveat  | Superf   | Superf   | Superf  | Superf    | Superf
PubProfile      | Strong | Strong| Strong | Strong | Strong  | Strong   | Strong   | Strong  | Strong    | Strong
Community       | Strong | Strong| Strong | Strong | Strong  | Strong   | Strong   | Strong  | Strong    | Strong
Notifications   | Strong | Strong| Strong | Strong | Strong  | Strong   | Strong   | Strong  | Strong    | Strong
```

Legend: Strong=strongly meaningful, Func=functional, Caveat=meaningful with caveats, Weak=technically available but contextually weak, Mislead=misleadingly exposed, Empty=no data sources, GAP=missing integration, Superf=superficially exposed

### 16.11.3 Truly Universal Shared Modules
Files, Public Profile, Community, Notifications — these 4 are genuinely tenant-agnostic.

### 16.11.3.1 Conditionally Universal
Finance, Clients, Settings/Permissions — these work for all types but provide varying value.

### 16.11.3.2 Only Appear Universal
Schedule, Records, HR, Services — these are **populated primarily by Stable/Lab data sources** and are empty or misleading for most other types.

---

## 16.12 Stable-Centric Assumption Audit

### 16.12.1 Hidden Assumptions Identified

#### 16.12.1.1 Horses assumed
- Schedule: 6 of 7 data sources involve `horse_id` or `horse:horses` joins
- Records: All 3 event table sources are horse-centric (vet_events, lab_events, breeding_events)
- Statement enrichment: Horse names as primary context enrichment
- Invoice details: Resolves lab_horse_id for context display

#### 16.12.1.2 Boarding/facilities assumed
- Services Plans tab: Always renders `ServicePlansManager` (housing component) for ALL tenant types
- Module toggles in Settings: All 4 toggles are horse-facility modules

#### 16.12.1.3 Staff assumed
- HR: Always visible in sidebar for owner/manager regardless of tenant type
- Horse Assignments section in HR: Assumes horses and staff coexist

#### 16.12.1.4 Organization-mode assumed
- All shared modules are gated by `workspaceMode === "organization"` in sidebar
- Horse Owner in personal mode sees none of these shared modules
- Independent Doctor/Trainer must be in org mode to access any shared module

#### 16.12.1.5 Clients assumed in stable-style
- Client types include `farm` — equestrian-specific
- Statement enrichment deeply resolves horse contexts

#### 16.12.1.6 Horse medical workflows as default
- Schedule module filter: vet, vet_followups, vaccinations, breeding — all medical/reproductive
- Records module filter: vet, lab, breeding, orders — all horse-clinical

### 16.12.2 Impact on Weak Tenant Types
- **Pharmacy**: Sees Finance, HR, Services, Clients, Schedule, Records — all empty/generic. Plans tab shows boarding plans UI.
- **Trainer**: Same as Pharmacy plus no training-specific schedule integration.
- **Auction**: Same — no auction events in any shared surface.
- **Transport**: Movement module is the one relevant capability but is invisible in nav and not in Schedule sources.
- **Horse Owner**: Excluded from horse display on dashboard (`isHorseOwningTenant` bug), sees HR which is irrelevant, Clients which is backwards (they are the client).

### 16.12.3 Where Abstraction Must Be Generalized
1. **Services Plans tab**: Conditionally render only when housing module is enabled
2. **Schedule**: Add `doctor_consultations` and `schedule_items` (manual entries) as data sources
3. **Records**: Add doctor, housing, and finance event sources
4. **Module toggles in Settings**: Include doctor and academy capability toggles
5. **HR horse assignments**: Hide for non-horse-owning tenants

---

## 16.13 Gap Map and Corrective Directions

### 16.13.1 Biggest Architecture Gaps

**Gap 1: Services Plans tab shown for all tenant types**
- Evidence: `DashboardServices.tsx` always renders `ServicePlansManager` in Plans tab
- Risk: Pharmacy/Doctor/Lab users see boarding plan management UI
- Affected: All non-stable types
- Solution: Conditionally render Plans tab only when `housingEnabled` is true
- Effort: Quick fix
- Priority: **High**

**Gap 2: Schedule missing Doctor consultations**
- Evidence: `useScheduleItems` queries 7 sources — none are `doctor_consultations`
- Risk: Doctor tenant's schedule is empty despite having schedulable events
- Affected: Doctor
- Solution: Add `doctor_consultations` query to `useScheduleItems` using `consultation_date`
- Effort: Quick fix
- Priority: **High**

**Gap 3: Records missing Doctor and Housing events**
- Evidence: `useActivityLog` only queries `vet_events`, `lab_events`, `breeding_events`
- Risk: Doctor and Academy tenants see empty records page
- Affected: Doctor, Academy, Housing
- Solution: Add more event sources or create a unified `tenant_events` pattern
- Effort: Medium refactor
- Priority: **Medium**

### 16.13.2 Tenant-Context Mismatch Gaps

**Gap 4: HR visible for solo practitioners**
- Evidence: HR nav shown for all owner/manager roles regardless of tenant type
- Risk: Solo doctor/trainer sees "Team" nav that is irrelevant
- Affected: Doctor, Trainer
- Solution: Hide HR nav for tenant types that are typically solo (`doctor`, `trainer`) unless they have employees
- Effort: Quick fix (nav filter) — but need care to not block legitimate use
- Priority: **Low** (not harmful, just unnecessary)

**Gap 5: Horse Owner excluded from isHorseOwningTenant**
- Evidence: `isHorseOwningTenant = !tenantType || tenantType === 'stable' || tenantType === 'academy'`
- Risk: Horse owners can't see horses on dashboard
- Affected: Horse Owner
- Solution: Add `'horse_owner'` to condition
- Effort: Quick fix
- Priority: **High** (if horse_owner type remains visible)

### 16.13.3 Overexposure Problems

**Gap 6: Module toggles only show horse-centric modules**
- Evidence: Settings page shows vet/housing/movement/breeding toggles + lab mode
- Risk: No way to toggle doctor or academy capabilities via UI
- Affected: Multi-module stacking scenarios
- Solution: Add doctor/academy capability toggles (requires new capability categories first)
- Effort: Medium refactor
- Priority: **Medium**

### 16.13.4 Missing Abstraction Problems

**Gap 7: No billing_links source type for academy_booking**
- Evidence: `billing_links.source_type` only covers boarding, breeding, lab_sample, doctor_consultation
- Risk: Academy bookings cannot be traced financially
- Solution: Add `academy_booking` source type and invoice-from-booking flow
- Effort: Medium feature
- Priority: **Medium** (when Academy is prioritized)

### 16.13.6 Categorized Recommendations

#### 16.13.6.1 Immediate exposure fixes
1. Conditionally hide Plans tab in Services for non-housing tenants
2. Fix `isHorseOwningTenant` to include `horse_owner`
3. Hide HR horse-assignment section for non-horse-owning tenants

#### 16.13.6.2 Near-term contextual UX fixes
4. Add `doctor_consultations` to Schedule data sources
5. Add more event sources to Records/Activity Log
6. Hide or simplify module toggles for irrelevant tenant types

#### 16.13.6.3 Medium-term shared abstraction refactors
7. Add doctor and academy capability categories
8. Add academy_booking billing_links source type
9. Make module toggles in Settings tenant-type-aware
10. Add manual `schedule_items` table for tenant types without domain-specific schedulable events

#### 16.13.6.4 Strategic platform model improvements
11. Unified event/activity system that all modules feed into
12. Tenant-type-aware empty states that guide users to relevant actions
13. Service catalog consolidation (resolve Doctor having `doctor_services` AND `tenant_services`)

---

## 16.14 Evidence-Based Summary

### 16.14.1 Strongest Shared Modules
1. **Files** — truly universal, no domain assumptions
2. **Public Profile** — truly universal
3. **Community** — truly universal
4. **Notifications** — truly universal
5. **Finance** — structurally universal, enrichment degrades gracefully
6. **Clients** — structurally universal

### 16.14.2 Only Superficially Shared
1. **Records** — only Stable and Lab populate it
2. **Schedule** — empty for 5+ tenant types, missing Doctor integration
3. **Services** — Plans tab is boarding-specific but shown universally
4. **Settings module toggles** — only horse-centric modules represented

### 16.14.3 Tenant Types That Benefit Most
1. **Stable** — every shared module is deeply relevant
2. **Laboratory** — Finance, Clients, Files, Settings all deeply relevant
3. **Doctor** — Finance and Clients relevant; Schedule and Records have gaps

### 16.14.4 Overexposed Tenant Types
1. **Horse Owner** — sees HR, Services Plans tab, empty Schedule/Records
2. **Pharmacy/Trainer/Auction** — see full shared modules with zero domain context
3. **Transport** — movement capability enabled but invisible everywhere

### 16.14.5 Recommended Next Audit Slice
**Domain-Specific Module Depth Audit** — Deep inspection of the 3 first-class modules (Stable, Laboratory, Doctor) to document their complete internal architecture, workflow coverage, commercial maturity, and identify the exact boundaries between "complete" and "needs further evolution" within each module.

---

## 17 Output Rules
All findings are evidence-based with specific file/function references. Gaps include concrete corrective directions. No code patches produced.

## 18 Final Deliverable State

### 18.1 Final numbering point reached: **16.14.5**

### 18.2 Recommended next starting number: **19**

### 18.3 Recommended next audit slice: **Domain-Specific Module Depth Audit** — examining Stable (housing/boarding/breeding/vet/movement), Laboratory (samples/results/requests/credits/sharing), and Doctor (patients/consultations/prescriptions/services) in full internal depth to document workflow completeness, commercial maturity, and evolution readiness.

