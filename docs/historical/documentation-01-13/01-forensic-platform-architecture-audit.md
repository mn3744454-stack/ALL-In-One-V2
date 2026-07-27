<!--
id: DHB-DOC01
title: Documentation 1 — Forensic Platform Architecture Audit
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`01-forensic-platform-architecture-audit.md`)
source-sha256: d82868b1dea26c846354ede421fc72a3a0d0e0d221d67d555358a58a3fcea92f
-->

# Documentation 1 — Forensic Platform Architecture Audit

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/01-forensic-platform-architecture-audit.md`](../documentation-01-13/raw/01-forensic-platform-architecture-audit.md)
> **Source SHA-256:** `d82868b1dea26c846354ede421fc72a3a0d0e0d221d67d555358a58a3fcea92f`



# Dayli Horse — Forensic Platform Architecture Audit

---

## 1 Platform Identity and Audit Scope

### 1.1 Platform Definition

Dayli Horse is a multi-tenant, multi-module equestrian industry SaaS platform built on React + Vite + Tailwind CSS + TypeScript with a Supabase backend (via Lovable Cloud). It provides domain-specific operational, clinical, laboratory, commercial, and community capabilities for organizations in the equestrian industry.

### 1.2 Architectural Nature

#### 1.2.1 Multi-module
The platform defines 10 tenant types via the `tenant_type` database enum: `stable`, `clinic`, `lab`, `academy`, `pharmacy`, `transport`, `auction`, `horse_owner`, `trainer`, `doctor`. Each tenant type implies a primary operational surface, though implementation depth varies dramatically.

#### 1.2.2 Multi-tenant
Every data table carries a `tenant_id` FK. RLS policies enforce tenant scoping via `is_tenant_member()` / `is_active_tenant_member()`. A single user can be a member of multiple tenants.

#### 1.2.3 Hybrid: tenant-type-driven + capability-driven + role-driven
Navigation is filtered by `tenantType` (e.g., `doctor`, `academy`), by `roles` (e.g., `owner`, `manager`), and by module-enablement via `useModuleAccess` which reads `tenant_capabilities` config JSONB. This creates a 3-axis gating model: tenant type sets the base surface, capabilities enable add-on modules, and roles restrict within a module.

#### 1.2.4 Partially modular
Stable/Boarding/Breeding/Lab/Doctor/Vet/Housing/Movement/HR/Finance have real dedicated code paths. Pharmacy/Transport/Auction/Trainer/Horse_Owner have onboarding routes but nearly zero domain-specific UI or backend logic. The architecture is modular where implemented but fragmented where not.

### 1.3 What Was Inspected

#### 1.3.1 Frontend code surfaces
All directories under `src/` including pages, components, hooks, contexts, navigation configs, lib, utils, i18n.

#### 1.3.2 Shared application shell
`DashboardShell.tsx`, `DashboardHeader.tsx`, `DashboardSidebar.tsx`, `MobileBottomNav.tsx`, `MobileHomeGrid.tsx`.

#### 1.3.3 Routing
`App.tsx` — 698 lines, ~60+ routes defined. Route guards: `ProtectedRoute`, `WorkspaceRouteGuard`, `ModuleGuard`, `CommunityRouteGuard`.

#### 1.3.4 Layouts
`DashboardShell` with `h-dvh overflow-hidden` viewport lock. Independent scroll regions for sidebar and main content.

#### 1.3.5 Pages
55 page files in `src/pages/` including finance sub-pages.

#### 1.3.6 Components
27 component directories covering all major domains.

#### 1.3.7 Hooks
14 hook directories plus ~45 standalone hooks.

#### 1.3.8 Contexts
`AuthContext.tsx` (auth state, profile), `TenantContext.tsx` (tenant membership, workspace mode, active tenant/role).

#### 1.3.9 Utils/services/helpers
`src/lib/` contains `displayHelpers.ts`, `formatters.ts`, `planIncludes.ts`, `breedingEligibility.ts`, `horseClassification.ts`, `queryKeys.ts`, `validations.ts`, `withTimeout.ts`, plus sub-dirs for finance, laboratory, pricing.

#### 1.3.10 Supabase client
Auto-generated `client.ts` and `types.ts` (10,363 lines). Types file reveals ~70+ tables, ~50+ RPCs, 13 enums, 5 views.

#### 1.3.11 Database artifacts
143 migration files spanning Dec 2025 – Mar 2026.

#### 1.3.12 SQL/RPC/functions/policies
RPCs inspected via types.ts `Functions` section: ~50 functions including movement RPCs, connection management, permission checks, lab features, invitation system.

#### 1.3.13 Feature flags/module gates
`useModuleAccess` hook reads `tenant_capabilities` table. Modules gated: `laboratory` (3 modes: none/requests/full), `vet`, `housing`, `movement`, `breeding`. `ModuleGuard` component wraps routes. `tenant_capabilities` uses category + config JSONB pattern.

#### 1.3.14 Edge functions
8 edge functions: `backend-proxy`, `expire-stale-connections`, `get-vapid-key`, `mark-overdue-invoices`, `send-invitation-email`, `send-ownership-notification`, `send-push-notification`, `shared-media-sign`.

### 1.4 Inspection Confidence

**Directly inspected**: All frontend code, route definitions, hook structure, component structure, navigation configs, tenant context, auth context, module access logic, full Supabase types schema (all tables/columns/relationships/enums/RPCs/views), edge functions directory.

**Inferred from types.ts but not directly reading migration SQL**: Exact RLS policy text, trigger definitions, exact function bodies. The types file gives table structure and function signatures but not policy/trigger implementation details.

**Confidence**: High for frontend architecture, table schema, routing, module taxonomy. Medium for exact RLS policy behavior (would need migration SQL inspection). High for which modules are implemented vs placeholder.

---

## 2 Module Taxonomy

### 2.1 Existence Verification

All 10 tenant types exist in the `tenant_type` enum. All 10 have onboarding routes (`/create-profile/*`) via `CreateStableProfile` with `tenantType` prop. All 10 appear in `SelectRole.tsx`. However, implementation depth varies from production-grade to zero.

### 2.2 Per-Module Assessment

#### 2.2.1 Stables (`stable`)
- **Exists explicitly**: Yes
- **Real pages**: `DashboardHorses`, `DashboardHorseOrders`, `DashboardBreeding`, `DashboardVet`, `DashboardHousing`, `DashboardMovement` (redirects to housing), `DashboardSchedule`, `DashboardHR`, `DashboardFinance`, `DashboardServices`, `DashboardClients`
- **Real tables**: `horses`, `boarding_admissions`, `boarding_status_history`, `stable_service_plans`, `facility_areas`, `housing_units`, `housing_unit_occupants`, `horse_movements`, `horse_care_notes`, `breeding_attempts`, `breeding_contracts`, `pregnancies`, `pregnancy_checks`, `foalings`, `embryo_transfers`, `semen_batches`, `semen_tanks`, `breeders`, `horse_orders`, `horse_order_types`, `horse_ownership`, `horse_vaccinations`, `vaccination_programs`
- **Real workflows**: Admission lifecycle (draft→active→checkout), breeding events with contract linkage, invoice generation, billing_links, movement with housing RPC, financial gate on checkout
- **Status**: **First-class citizen. Production-grade for core flows.**

#### 2.2.2 Horse Owners (`horse_owner`)
- **Exists explicitly**: Onboarding route exists
- **Real pages**: None specific. Uses same shared dashboard/horses pages
- **Real tables**: `horse_owners`, `horse_ownership`, `horse_ownership_history`
- **Real workflows**: Horse registration and ownership management via shared surfaces
- **Status**: **Partially implemented — shares Stable surfaces, no dedicated domain UI**

#### 2.2.3 Clinics (`clinic`)
- **Exists explicitly**: Onboarding route exists. Treated as `veterinarian` in SelectRole
- **Real pages**: None specific. Same dashboard as stable with different module defaults
- **Real tables**: None clinic-specific. Uses shared vet tables
- **Real workflows**: Same as stable vet module (visits, treatments, vaccinations)
- **Status**: **Shared-only — operates via stable architecture with different capability defaults (vet enabled by default)**

#### 2.2.4 Laboratories (`lab`)
- **Exists explicitly**: Yes, first-class
- **Real pages**: `DashboardLaboratory` (multi-tab), `SharedLabResult`
- **Real tables**: `lab_samples`, `lab_results`, `lab_templates`, `lab_test_types`, `lab_services`, `lab_service_templates`, `lab_horses`, `lab_requests`, `lab_request_services`, `lab_request_messages`, `lab_result_shares`, `lab_credit_wallets`, `lab_credit_transactions`, `lab_events`
- **Real workflows**: Sample creation, result recording, template-based testing, cross-tenant requests, result sharing via tokens, credit system, B2B service catalog with pricing snapshots, auto-client creation
- **Has dedicated nav config**: `labNavConfig.ts` with 10 sections
- **Status**: **First-class citizen. Most mature module alongside Stable.**

#### 2.2.5 Pharmacies (`pharmacy`)
- **Exists explicitly**: Onboarding route exists. `isPharmacy` defined in `useModuleAccess` but unused
- **Real pages**: None
- **Real tables**: None pharmacy-specific. Inventory tables exist (`products`, `product_categories`, `inventory_movements`, `stock_levels`, `warehouses`, `suppliers`, `measurement_units`) but are generic inventory, not pharmacy-specific
- **Real workflows**: None
- **Status**: **Placeholder — onboarding only. Generic inventory schema exists but no pharmacy domain UI.**

#### 2.2.6 Independent Trainers (`trainer`)
- **Exists explicitly**: Onboarding route exists
- **Real pages**: None specific
- **Real tables**: None trainer-specific
- **Real workflows**: None
- **Status**: **Not implemented — onboarding only**

#### 2.2.7 Independent Veterinarians / Doctors (`doctor`)
- **Exists explicitly**: Yes, first-class
- **Real pages**: `DashboardDoctorOverview`, `DashboardDoctorPatients`, `DashboardDoctorConsultations`, `DashboardDoctorConsultationDetail`, `DashboardDoctorServices`
- **Real tables**: `doctor_patients`, `doctor_consultations`, `doctor_followups`, `doctor_prescriptions`, `doctor_services`
- **Real workflows**: Patient registration, consultation lifecycle, prescription recording, followup tracking, billing via `billing_links(source_type='doctor_consultation')`, snapshot trigger `fn_populate_doctor_consultation_snapshots`
- **Has dedicated nav**: Yes, `tenantType: "doctor"` entries in navConfig
- **Status**: **First-class citizen. Fully implemented operational and commercial surface.**

#### 2.2.8 Auctions (`auction`)
- **Exists explicitly**: Onboarding route exists
- **Real pages**: None
- **Real tables**: None auction-specific. `payment_reference_type` enum includes `'auction'` suggesting planned integration
- **Real workflows**: None
- **Status**: **Not implemented — onboarding + enum reference only**

#### 2.2.9 Transport Vehicles (`transport`)
- **Exists explicitly**: Onboarding route exists. `isTransport` used in `useModuleAccess` (movement enabled by default for transport)
- **Real pages**: None specific. Movement module is shared
- **Real tables**: None transport-specific
- **Real workflows**: Movement module shared with stable
- **Status**: **Partially implemented — leverages shared movement module, no dedicated transport UI**

#### 2.2.10 Training Academies (`academy`)
- **Exists explicitly**: Yes
- **Real pages**: `DashboardAcademySessions`, `DashboardAcademyBookings`, `DashboardMyBookings`
- **Real tables**: `academy_sessions`, `academy_bookings`
- **Real workflows**: Session creation/management, public session listing, booking lifecycle
- **Has dedicated nav**: `tenantType: "academy"` entries in navConfig
- **Status**: **Partially implemented. Functional session/booking system but no training program management, student progress tracking, or curriculum features.**

### 2.3 Comparative Matrix

```text
Module              | Impl Level       | Pages | Tables | Workflows | Billing
--------------------|------------------|-------|--------|-----------|--------
Stable              | Full             | 12+   | 25+   | Yes       | Yes
Horse Owner         | Shared-only      | 0     | 3     | Partial   | No
Clinic              | Shared-only      | 0     | 0     | Via vet   | Via fin
Laboratory          | Full             | 2     | 14    | Yes       | Yes
Pharmacy            | Placeholder      | 0     | 0*    | No        | No
Trainer             | Not started      | 0     | 0     | No        | No
Doctor              | Full             | 5     | 5     | Yes       | Yes
Auction             | Not started      | 0     | 0     | No        | No
Transport           | Shared-only      | 0     | 0     | Via mvmt  | No
Academy             | Partial          | 3     | 2     | Partial   | Via pay
```
*Pharmacy: generic inventory schema exists but is not pharmacy-specific.

### 2.4 First-Class vs Secondary

**First-class**: Stable, Laboratory, Doctor

**Functional secondary**: Academy, Clinic (via vet module), Transport (via movement), Horse Owner (via shared horse management)

**Underdeveloped/absent**: Pharmacy, Trainer, Auction

---

## 3 Shared Platform Capabilities

### 3.1 Cross-Module Systems Identified

#### 3.1.1 Authentication
`AuthContext.tsx` — Supabase Auth with email/password. Session persistence, token refresh handling, profile fetching. Used by all modules.

#### 3.1.2 Tenant Identity / Resolution
`TenantContext.tsx` — Fetches `tenant_members` with tenant join. Supports workspace mode toggle (personal/organization). localStorage persistence for active tenant. `initialize_tenant_defaults` RPC on tenant creation.

#### 3.1.3 Profiles / Memberships
`profiles` table (auto-populated from auth). `tenant_members` with role enum. Invitation system with `invitations` table + `finalize_invitation_acceptance` RPC + email edge function.

#### 3.1.4 Permissions / Roles / Delegation
- `permission_definitions` — platform-wide permission keys
- `permission_bundles` + `bundle_permissions` — groupable permission sets
- `tenant_roles` — custom roles per tenant
- `tenant_role_bundles` — role-to-bundle mapping
- `tenant_role_permissions` — individual permission grants per role
- `delegation_scopes` — delegatable permission tracking
- `delegation_audit_log` — delegation history
- `role_audit_log` — role change tracking
- `usePermissions` hook — 316 lines, comprehensive permission resolution
- `has_permission` RPC — server-side check
- `check_tenant_permission` RPC

Used by: Stable, Lab, Doctor. Pharmacy/Trainer/Auction have no permission-specific flows.

#### 3.1.5 Navigation / Shell
- `navConfig.ts` — main module list with `visibleIn`, `roles`, `tenantType`, `moduleKey` filters
- `workspaceNavConfig.ts` — personal vs organization nav split
- `labNavConfig.ts` — Lab-specific nav override
- `DashboardShell.tsx` — viewport-locked layout
- `DashboardSidebar.tsx` — renders nav based on config
- `MobileHomeGrid.tsx` — mobile module grid with same filtering logic
- `MobileBottomNav.tsx`, `MobileLauncher.tsx` — mobile-specific navigation

#### 3.1.6 Clients / Customer Records
`clients` table — tenant-scoped, bilingual (name/name_ar), contact info, linked_tenant_id (Lab B2B), linked_profile_id.
- `useClients` hook — shared across Stable, Breeding, Lab, Doctor, Finance
- `ClientFormDialog`, `ClientsList`, `ClientCard`, `ClientStatementTab`
- `displayClientName` helper for bilingual rendering

#### 3.1.7 Horse Records
`horses` table — 50+ columns including pedigree (father_id, mother_id), physical traits, housing references, breeding fields. Tenant-scoped.
- `useHorses`, `useHorsePedigree`, `useHorseOwnership`, `useHorseShares`
- `HorseWizard`, `HorseCard`, `HorseProfile`, `HorsesList`
- `displayHorseName` helper
- Lab has separate `lab_horses` with `linked_horse_id` bridge

#### 3.1.8 Staff / HR
- `hr_employees`, `hr_assignments`, `hr_employee_events`, `hr_salary_payments`, `hr_settings`
- Full CRUD pages: `DashboardHR`, `DashboardHRPayroll`, `DashboardHRAttendance`, `DashboardHRSettings`
- Components: `EmployeeCard`, `EmployeesList`, `EmployeeFormDialog`, `EmployeeDetailsSheet`, `HorseAssignedStaff`, `SalaryPaymentsSection`
- Role-gated to owner/manager

#### 3.1.9 Finance / Accounting
- `invoices`, `invoice_items`, `billing_links`, `financial_entries` (ledger), `expenses`, `customer_balances`, `supplier_payables`, `custom_financial_categories`
- Views: `v_customer_ledger_balances`
- Edge function: `mark-overdue-invoices`
- Components: `InvoiceFormDialog`, `InvoicesList`, `ExpensesList`, `LedgerRowPreview`, `RecordPaymentDialog`, `InvoicePDFGenerator`, `SupplierPayablesTab`
- POS: `pos_sessions` table + full POS UI components
- Pages: `DashboardFinance` + sub-pages (invoices, expenses, payments, revenue, ledger, POS, categories, customer-balances)

Used by: Stable (boarding + breeding invoices), Lab (sample invoices), Doctor (consultation invoices). All via `billing_links`.

#### 3.1.10 Notifications
- `notifications` table, `notification_preferences`
- `useNotifications`, `useNotificationPreferences`
- `NotificationsPanel`, push subscription system
- Edge functions: `send-push-notification`, `get-vapid-key`
- `push_subscriptions` table

#### 3.1.11 Documents / Storage
- `DashboardFileManager` page
- `useMediaAssets`, `useMediaShareLinks` hooks
- `shared-media-sign` edge function
- `SharedMedia` public page
- Horse media gallery: `HorseMediaGallery`

#### 3.1.12 Connections / Cross-Tenant Sharing
- `connections`, `connection_messages`, `consent_grants`, `connection_rate_limits`
- RPCs: `create_connection_request`, `accept_connection`, `create_consent_grant`, `get_granted_data`, `can_access_shared_resource`
- Components: `ConnectionsList`, `ConsentGrantsList`, `SharedWithMeTab`, `SharingAuditLog`
- 3-layer pattern: Connection → Grant → RLS policy

#### 3.1.13 Community / Social
- `posts` (implied), `follows`, `comments`
- `CommunityFeed` page, `PostFeed`, `PostComposer`, `FollowButton`
- Workspace mode: visible in both personal and organization

#### 3.1.14 Schedule
- `schedule_items` table
- `useScheduleItems` hook
- `DashboardSchedule` page, `ScheduleCalendarView`

#### 3.1.15 Services Catalog
- `tenant_services` — shared service catalog with `service_kind` discriminator (service, boarding, breeding)
- `service_providers` — external provider registry
- `DashboardServices` page, `ServiceFormDialog`, `ServicesList`

### 3.2 Shared Capabilities Not Reaching All Modules

| Capability | Reaches | Missing From |
|---|---|---|
| Client records | Stable, Lab, Doctor, Finance | Pharmacy, Trainer, Academy, Auction, Transport |
| Horse records | Stable, Lab, Doctor, Academy (indirect) | Pharmacy, Auction |
| HR | Any tenant (org-mode) | Appropriately universal |
| Finance | Any tenant (org-mode) | Appropriately universal |
| Permissions | Any tenant | Appropriately universal |
| Breeding | Stable only (module-gated) | Correct |
| Housing | Stable, Clinic (module-gated) | Correct |
| Movement | Stable, Clinic, Transport (module-gated) | Correct |

---

## 4 Module Activation, Layering, and Combination Model

### 4.1 Tenant Representation
Each tenant is a row in `tenants` with a `type` column (the `tenant_type` enum). Users connect to tenants via `tenant_members` with a `role` column.

### 4.2 Tenant Typing Model
**Type-derived primary identity** + **capability-config-derived secondary modules**. The `type` sets defaults; `tenant_capabilities` rows can override/extend. `useModuleAccess` computes effective access by merging type defaults with capability config.

### 4.3 Multi-Module Stacking
Yes, a single tenant can activate multiple modules. Example: A `stable` tenant has `vet`, `housing`, `movement`, `breeding`, `lab` (requests mode) as capability-driven add-ons. Each can be toggled via `tenant_capabilities` upsert.

### 4.4 How Stacking Works in Practice
`useModuleAccess` reads all `tenant_capabilities` rows and computes boolean flags. Navigation config checks `moduleKey` to show/hide items. `ModuleGuard` wraps routes to enforce access.

### 4.5 Evidence of Multi-Module Patterns

#### 4.5.1 Primary module
The `tenant_type` defines the primary module identity and default nav surface.

#### 4.5.2 Secondary add-on modules
`tenant_capabilities` table with categories like `laboratory`, `vet`, `housing`, `movement`, `breeding`. Each has `config` JSONB for mode/enabled flags.

#### 4.5.3 Capability bundles
`initialize_tenant_defaults` RPC sets initial capabilities based on tenant type (e.g., stable gets housing+movement+breeding defaults).

#### 4.5.4 Entitlements
No subscription/billing-based entitlements. Module access is config-driven, not payment-gated.

#### 4.5.5 Feature flags
Not separate from capabilities. Lab has a `lab_features` table for granular feature toggles within the lab module.

#### 4.5.6 Navigation expansion
Automatic — modules appear in sidebar/mobile grid when `useModuleAccess` returns enabled.

#### 4.5.7 Permission branching
Permission definitions include module prefixes (`laboratory.samples.view`, `hr.manage`, `housing.view`). Roles can be configured per tenant.

#### 4.5.8 Billing-linked activation
None. No subscription or payment requirement for module activation.

### 4.6 Combination Support
- **Stable + Lab**: Supported. Stable sees Lab in "requests" mode. Lab tenant sees full lab surface.
- **Clinic + Lab**: Same pattern. Clinic defaults to vet enabled + lab requests.
- **Clinic + Pharmacy**: No pharmacy domain exists. Would only get shared surfaces.
- **Stable + Academy**: Academy nav items require `tenantType: "academy"`. A `stable` tenant CANNOT see academy features. This is a limitation — Academy is tenant-type-gated, not capability-gated.

### 4.7 Gaps in Module Activation

1. **Academy is tenant-type-gated, not capability-gated**: A stable cannot add academy features. This breaks the add-on model.
2. **Doctor is tenant-type-gated**: Same issue — a clinic cannot add independent doctor features.
3. **No pharmacy, auction, trainer, transport-specific domain logic exists** to activate even if the model supported it.
4. **No UI for capability management**: Operators cannot toggle modules themselves; it requires direct capability manipulation.

### 4.8 Cleanest Direction
Convert Academy and Doctor nav items from `tenantType`-gated to `moduleKey`-gated, similar to how `vet`, `housing`, `movement`, `breeding` work. This would allow any tenant to add these capabilities. However, Doctor has its own table namespace (`doctor_*`) which may conflict with shared patterns.

---

## 5 Completion State Audit

### 5.1 Classification

#### 5.1.1 Fully implemented surfaces
- Stable core (horses, orders, horse profile, pedigree, ownership)
- Stable housing/boarding (admissions, plans, facilities, units, checkout, billing)
- Stable breeding (attempts, pregnancies, checks, foalings, embryo transfers, semen, contracts, invoicing)
- Laboratory (samples, results, templates, requests, services, credits, sharing, B2B)
- Doctor (patients, consultations, prescriptions, followups, services, billing)
- Finance (invoices, expenses, ledger, POS, customer balances, supplier payables, categories)
- HR (employees, assignments, salary payments, payroll, attendance, settings)
- Auth/tenant/permissions/roles system
- Client management with statements
- Connections/sharing 3-layer architecture
- Community feed (basic)
- Schedule
- File manager/media
- Notifications/push
- PWA install

#### 5.1.2 Partially implemented
- Academy (sessions + bookings, but no curriculum/progress)
- Movement (functional but consolidated under housing tab)
- Vet module (visits, treatments, vaccinations — functional but lightweight)
- Horse owner (uses shared surfaces, no dedicated UI)

#### 5.1.3 UI without reliable backend
- POS system has full UI but unclear if payment processing is wired

#### 5.1.4 Backend without usable UI
- Inventory (products, warehouses, stock_levels, inventory_movements, measurement_units, suppliers) — full schema, no dedicated UI pages
- `stables` table exists but is legacy — operations use `facility_areas` instead

#### 5.1.5 Planned but not implemented
- Pharmacy domain
- Auction domain
- Trainer domain
- Transport-specific features

#### 5.1.6 Dead/abandoned
- `stables` table — superseded by `facility_areas`/`housing_units`
- `DashboardMovement` page — redirects to housing, effectively dead
- `formatRelativeDate` in formatters.ts — marked deprecated

### 5.2 Maturity by Module

| Module | Maturity |
|---|---|
| Stable core | Production-grade |
| Housing/Boarding | Production-grade |
| Breeding | Production-grade |
| Laboratory | Production-grade |
| Doctor | Production-grade |
| Finance | Production-grade |
| HR | Functional but incomplete |
| Academy | Functional but incomplete |
| Vet | Functional but incomplete |
| Movement | Functional (merged into Housing) |
| Community | Prototype-like |
| Connections/Sharing | Functional but incomplete |
| POS | Prototype-like |
| Inventory | Schema-only (no UI) |
| Pharmacy | Placeholder |
| Trainer | Placeholder |
| Auction | Placeholder |
| Transport | Placeholder |

### 5.3 Biggest False Impressions

1. **All 10 tenant types appear equally supported** in the onboarding flow (SelectRole.tsx shows all 10 with polished cards) — but 4 of them have zero domain functionality.
2. **Inventory schema looks complete** (products, warehouses, stock_levels) — but has no UI, no integration with any module, and no operational workflows.
3. **POS has a full UI** (cart, catalog, payments, sessions, receipts) — but may not connect to real payment processing.

---

## 6 Frontend Architecture Inventory

### 6.1 Top-Level Structure
```text
src/
├── pages/           55 files (route targets)
├── components/      27 directories + 13 root components
├── hooks/           14 directories + 45 standalone hooks
├── contexts/        2 files (Auth, Tenant)
├── navigation/      3 config files
├── lib/             3 sub-dirs + 10 standalone files
├── i18n/            Bilingual AR/EN system
├── integrations/    Supabase client + types
├── assets/          Static assets
└── utils/           1 file (buildInfo)
```

### 6.2 Entry Points
`main.tsx` → `App.tsx`. App wraps: `HelmetProvider` → `QueryClientProvider` → `I18nProvider` → `I18nRecoveryBoundary` → `AuthProvider` → `TenantProvider` → `BrowserRouter` → `AppRoutes`.

### 6.3 Route Organization
Flat route list in `App.tsx` (no lazy loading, no route grouping by module). All routes are siblings. Guards applied inline: `ProtectedRoute` → `WorkspaceRouteGuard` → `ModuleGuard`.

### 6.4 Hooks Classification

**Data hooks**: `useHorses`, `useClients`, `useInvoices`, `useLedger`, `useExpenses`, `useBoardingAdmissions`, `useBreedingAttempts`, `useLabSamples`, `useConsultations`, `useVetVisits`, `useAcademySessions`, ~40 more

**Auth hooks**: `useAuth` (from context)

**Tenant hooks**: `useTenant` (from context), `useTenantCapabilities`, `useModuleAccess`, `usePublicTenant`

**UI hooks**: `use-mobile`, `use-media-query`, `useRTL`, `useViewPreference`, `useFocusRefresh`, `useDebounce`

**Module-specific hooks**: `src/hooks/breeding/*` (9), `src/hooks/doctor/*` (5), `src/hooks/housing/*` (12), `src/hooks/laboratory/*` (17), `src/hooks/vet/*` (7), `src/hooks/movement/*` (8), `src/hooks/finance/*` (12), `src/hooks/hr/*` (implied), `src/hooks/pos/*` (2)

**Cross-module hooks**: `useBillingLinks`, `useClientStatement`, `useStatementEnrichment`, `useScheduleItems`, `usePermissions`

### 6.5 Architecture Smells

1. **No route code splitting**: All pages imported eagerly in App.tsx — 55+ page imports at startup.
2. **`CreateStableProfile` reused for all 10 tenant types** — name is misleading for pharmacy/transport/auction creation.
3. **`navConfig.ts` and `workspaceNavConfig.ts` duplicate** the same module definitions with slightly different structures.
4. **Doctor nav items duplicated** in both navConfig.ts (lines 319-376) and workspaceNavConfig.ts (lines 299-341).

---

## 7 Supabase and Database Integration

### 7.1 Table Count
~70+ tables visible in types.ts, covering: core platform (profiles, tenants, tenant_members), horses, breeding, housing, lab, doctor, finance, HR, inventory, connections, community, notifications, academy, POS, permissions.

### 7.2 Notable Schema Patterns
- All domain tables have `tenant_id` FK
- Bilingual support via `name` + `name_ar` on most entities
- JSONB `config` fields on `tenant_capabilities`, `stable_service_plans.includes`
- Snapshot pattern on `lab_request_services` (price/name snapshots at request time)
- Snapshot trigger on `doctor_consultations`

### 7.3 Schema Drift Risks

1. **`stables` table**: Legacy — `horses.stable_id` FK still exists but `facility_areas` is the active model.
2. **`boarding_admissions` has 40+ columns**: Potentially overloaded (rates, billing cycle, status, plan reference, housing assignment, movement tracking, financial checks all on one row).
3. **`horses` has 50+ columns**: Very wide. Breeding fields (`is_pregnant`, `pregnancy_months`, `breeding_role`) coexist with housing fields and physical trait fields.
4. **Inventory tables** (`products`, `warehouses`, etc.) have no consumer — schema without purpose.

### 7.4 Data Model Alignment
The data model is **heavily skewed toward Stable + Lab + Doctor**. Pharmacy, Auction, Trainer, Transport have zero dedicated tables. The inventory schema (products/warehouses) is generic and disconnected.

---

## 8 Cross-Module Consistency

### 8.1 Architectural Representation Asymmetry
- **Stable**: 12+ pages, 25+ tables, full commercial flow
- **Lab**: Complete standalone domain with own nav config
- **Doctor**: Full consultation lifecycle with dedicated pages
- **Academy**: Only 2 tables, 3 pages, basic booking
- **Pharmacy/Auction/Trainer**: Zero domain code

### 8.2 Naming Inconsistencies
- `DashboardMovement` exists but redirects to `DashboardHousing`
- `CreateStableProfile` used for all tenant types
- `horse_orders` vs `breeding_attempts` — different naming conventions for similar event-tracking patterns
- `doctor_patients` vs Lab's `lab_horses` vs shared `horses` — three different horse representation models

### 8.3 UI Pattern Inconsistencies
- Lab has its own nav config and bottom nav override
- Doctor has dedicated nav entries in the main navConfig
- Academy items use `tenantType` gating while vet/housing use `moduleKey` gating — inconsistent gating model

---

## 9 Dead Code, Ghost Features

### 9.1 Dead/Deprecated

1. **`stables` table** — superseded by `facility_areas`/`housing_units`. Still referenced by `horses.stable_id` FK. Medium confidence dead.
2. **`DashboardMovement` page** — contains only a redirect to housing. Dead as standalone page.
3. **`formatRelativeDate`** in `formatters.ts` — marked `@deprecated`.
4. **`useMovementDemo`, `useHousingDemo`, `useFinanceDemo`** — demo seed hooks, likely vestigial after real data exists.
5. **`app_settings` table** — only 2 columns (key, value). Unclear if actively used.

### 9.2 Ghost Features

1. **Pharmacy module** — appears in onboarding, no functionality. `isPharmacy` computed in `useModuleAccess` but never consumed.
2. **Auction module** — `payment_reference_type` enum includes `'auction'` but no auction tables or UI.
3. **Trainer module** — onboarding only.
4. **Inventory system** — 6 tables, zero UI, zero integration.
5. **`horse_share_packs`** — system pack mechanism, unclear if consumer UI exists beyond `HorseSharesPanel`.
6. **`boarding_admissions.admission_checks`** JSONB — used for financial gate override but schema for the JSONB content is implicit.

---

## 10 Gap Map and Corrective Opportunities

### 10.1 Largest Structural Gaps

#### 10.1.1 Five tenant types with zero domain logic
**Why**: Pharmacy, Auction, Trainer have no pages, tables, or workflows.
**Risk**: Users can create these tenant types and find empty dashboards.
**Type**: Product/UX gap.
**Solution**: Either (a) hide unimplemented types from SelectRole until built, or (b) build minimal viable domain surfaces.
**Effort**: Quick fix for hiding; major for building.
**Priority**: High — prevents user confusion.

#### 10.1.2 Academy and Doctor are tenant-type-gated, not capability-gated
**Why**: A stable cannot add academy features. Breaks the add-on module model.
**Risk**: Limits platform composability.
**Type**: Architectural gap.
**Solution**: Convert to `moduleKey`-based gating with `tenant_capabilities` support.
**Effort**: Medium refactor.
**Priority**: Medium.

#### 10.1.3 No route code-splitting
**Why**: All 55+ pages imported eagerly.
**Risk**: Growing bundle size, slower initial load.
**Type**: Performance/architecture.
**Solution**: `React.lazy()` + `Suspense` for route-level splitting.
**Effort**: Medium refactor.
**Priority**: Medium.

#### 10.1.4 Inventory schema disconnected
**Why**: 6 tables exist with no UI or module integration.
**Risk**: Schema maintenance burden, confusing for auditors.
**Type**: Schema/product gap.
**Solution**: Either wire to Pharmacy/POS module or defer and document as planned.
**Effort**: Medium (if wiring to POS) or quick (if documenting).
**Priority**: Low.

#### 10.1.5 Duplicate navigation configs
**Why**: `navConfig.ts` and `workspaceNavConfig.ts` define overlapping module lists.
**Risk**: Config drift between the two.
**Solution**: Consolidate into single source of truth.
**Effort**: Medium refactor.
**Priority**: Low.

#### 10.1.6 No capability management UI
**Why**: Operators cannot toggle modules (vet, housing, breeding, lab) without direct DB access.
**Risk**: Requires technical intervention for module configuration.
**Type**: Product gap.
**Solution**: Add module toggle section to Organization Settings page.
**Effort**: Small feature.
**Priority**: High.

---

## 11 Evidence-Based Platform Status Summary

### 11.1 Current Reality
Dayli Horse is a **3-module-deep equestrian SaaS** (Stable, Lab, Doctor) with a **10-module ambition**. The shared infrastructure (auth, tenants, permissions, finance, HR, clients, horses, connections) is robust and designed for multi-module scale. However, 5 of the 10 declared modules have zero or near-zero implementation.

### 11.2 Strongest Modules
1. **Stable** (horses + housing + breeding + vet + movement) — most comprehensive
2. **Laboratory** — most architecturally mature (own nav, cross-tenant B2B, credit system, snapshots)
3. **Doctor** — complete clinical workflow with consultation lifecycle

### 11.3 Weakest/Absent Modules
1. **Auction** — enum references only
2. **Trainer** — onboarding only
3. **Pharmacy** — onboarding only, disconnected inventory schema
4. **Transport** — onboarding + shared movement
5. **Horse Owner** — no dedicated surfaces

### 11.4 Strongest Shared Systems
1. Finance (invoices, ledger, billing_links, POS, statements)
2. Auth + Tenant + Permissions (comprehensive RBAC)
3. Client management (tenant-scoped, bilingual)
4. Connections/sharing (3-layer architecture)

### 11.5 Most Dangerous Hidden Weaknesses
1. Users can create 5 tenant types that lead to empty dashboards
2. No module configuration UI — operators cannot self-serve toggle capabilities
3. No route code-splitting — bundle will grow unsustainably
4. Academy features are invisible to non-academy tenants even if operationally relevant

### 11.6 Recommended Next Audit Slice
**Module Activation & Onboarding Experience Audit** — Deep inspection of what happens when each of the 10 tenant types completes onboarding, what they see on their dashboard, what is functional vs empty, and what capability defaults are set by `initialize_tenant_defaults`. This would establish the priority order for the next module build phase.

---

## 12 Final Numbering State

12.1 Final numbering point reached: **11.6**

12.2 Recommended next starting number: **13**

12.3 Recommended next audit slice: **Module Activation & Post-Onboarding Experience Audit** — examining each tenant type's first-run experience, dashboard content, capability defaults, and the gap between the SelectRole promise and the actual delivered surface.

