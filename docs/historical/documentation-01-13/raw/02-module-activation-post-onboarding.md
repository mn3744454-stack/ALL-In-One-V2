

# 13 — Module Activation & Post-Onboarding Experience Audit

---

## 13.1 Audit Scope and Method

### 13.1.1 Surfaces Inspected
`SelectRole.tsx`, `CreateStableProfile.tsx`, `TenantContext.tsx` (createTenant + initialize_tenant_defaults RPC call), migration `20260110050455` (hardened `initialize_tenant_defaults` function body), `useModuleAccess.ts`, `ModuleGuard.tsx`, `navConfig.ts`, `workspaceNavConfig.ts`, `labNavConfig.ts`, `DashboardSidebar.tsx`, `MobileHomeGrid.tsx`, `Dashboard.tsx`, `DashboardMobileModule.tsx`, i18n locale files (en.ts selectRole section).

### 13.1.2 Distinction of Audit Layers

#### 13.1.2.1 Onboarding-time logic
`SelectRole.tsx` → `CreateStableProfile.tsx` (3-step form) → `TenantContext.createTenant()`.

#### 13.1.2.2 Tenant creation logic
`TenantContext.createTenant`: Step A inserts into `tenants` table, Step B inserts `tenant_members` with role `owner`, Step C calls `initialize_tenant_defaults` RPC. On member failure, tenant is rolled back.

#### 13.1.2.3 Default capability seeding
`initialize_tenant_defaults` RPC — seeds 5 capability rows (laboratory, vet, housing, movement, breeding) with type-dependent config JSONB. Uses `ON CONFLICT DO NOTHING`.

#### 13.1.2.4 First-login routing
After `createTenant` completes, `CreateStableProfile` navigates to `/dashboard`. No tenant-type-specific routing exists.

#### 13.1.2.5 Navigation visibility
Driven by 3 filtering axes in `DashboardSidebar.tsx` and `MobileHomeGrid.tsx`: `tenantType` match, `moduleKey` enablement (via `useModuleAccess`), `roles` array check.

#### 13.1.2.6 Dashboard landing behavior
All tenant types land on `Dashboard.tsx` at `/dashboard`. Content is conditionally rendered: horse lists for `isHorseOwningTenant` (stable/academy), boarding widgets for org mode, generic overview card for all others.

#### 13.1.2.7 Route accessibility
All routes defined in `App.tsx` are accessible to any authenticated user. `ModuleGuard` protects module-specific routes (lab, vet, housing, movement, breeding). `WorkspaceRouteGuard` enforces workspace mode and permissions. No route guards check `tenantType` directly.

#### 13.1.2.8 Module reality
Determined by the intersection of: seeded capabilities, `useModuleAccess` defaults, nav visibility filters, and whether actual pages/components exist for that module.

### 13.1.3 Key Files Driving Onboarding and First-Run

| File | Role |
|---|---|
| `SelectRole.tsx` | Tenant type selection UI (10 cards) |
| `CreateStableProfile.tsx` | Universal 3-step onboarding form for all 10 types |
| `TenantContext.tsx` (lines 380-480) | `createTenant` function: insert tenant → insert member → call RPC |
| Migration `20260110050455` (lines 69-159) | `initialize_tenant_defaults` RPC body |
| `useModuleAccess.ts` | Runtime module enablement computation |
| `DashboardSidebar.tsx` | Desktop nav rendering with type/module/role filters |
| `MobileHomeGrid.tsx` | Mobile nav grid with same filters |
| `navConfig.ts` | Module definition with `tenantType` and `moduleKey` gates |
| `Dashboard.tsx` | Landing page with conditional content |

### 13.1.4 Confidence Levels
- Onboarding flow: **High** (full source inspected)
- Capability seeding: **High** (RPC body inspected from migration)
- Nav visibility: **High** (all 3 nav files inspected)
- Dashboard content: **High** (full Dashboard.tsx inspected)
- Route accessibility: **High** (App.tsx routing and guards inspected)

---

## 13.2 Onboarding Architecture

### 13.2.1 Flow: Signup → Tenant Creation
1. User signs up/logs in via `Auth.tsx`
2. Lands on `/dashboard` — sees "Getting Started" card if no tenants exist
3. Navigates to `/select-role` → picks one of 10 tenant types
4. Routed to `/create-profile/{type}` → `CreateStableProfile` with `tenantType` prop
5. 3-step form: Basic Info → Location → Contact
6. On submit: `createTenant()` → navigates to `/dashboard`

### 13.2.2 Tenant Type Selection
`SelectRole.tsx` presents 10 cards. Each card has: icon, title, description, "Continue →" CTA. Clicking routes to the corresponding `/create-profile/{type}` URL.

### 13.2.3 What Onboarding Creates

#### 13.2.3.1 User profile
NOT created by onboarding. Profile is created by auth trigger on signup (separate from tenant creation).

#### 13.2.3.2 Tenant
Yes — inserted into `tenants` table with `name`, `type`, `description`, `address`, `phone`, `email`.

#### 13.2.3.3 Tenant members row
Yes — inserted with `role: 'owner'`, `can_invite: true`, `can_manage_horses: true`.

#### 13.2.3.4 Default roles
No explicit role rows created. The owner role comes from the `tenant_members.role` column value.

#### 13.2.3.5 Default capabilities
Yes — 5 capability rows via `initialize_tenant_defaults` RPC (laboratory, vet, housing, movement, breeding).

#### 13.2.3.6 Settings/config rows
No settings rows created. No `hr_settings`, `lab_features`, or other config tables are seeded.

#### 13.2.3.7 Starter domain data
No domain data seeded. No sample horses, no facility areas, no housing units, no services, no employees.

### 13.2.4 Seeding Functions
Only one: `initialize_tenant_defaults(p_tenant_id, p_tenant_type)`. Called as Step C of `createTenant`. Failure is **non-blocking** — logged as warning but tenant creation succeeds.

### 13.2.5 What `initialize_tenant_defaults` Does

Seeds exactly 5 rows into `tenant_capabilities`, each with `ON CONFLICT DO NOTHING`:

| Category | Condition for `has_internal=true` | Config Logic |
|---|---|---|
| `laboratory` | `type = 'lab'` | lab: `full`, stable/clinic: `requests`, others: `none` |
| `vet` | `type IN ('clinic', 'vet')` | clinic/vet: `enabled:true`, stable: `enabled:false`, others: `enabled:false` |
| `housing` | `type IN ('stable', 'clinic')` | stable/clinic: `enabled:true`, others: `enabled:false` |
| `movement` | `type IN ('stable', 'clinic', 'transport')` | stable/clinic/transport: `enabled:true`, others: `enabled:false` |
| `breeding` | `type = 'stable'` | stable: `enabled:true`, others: `enabled:false` |

**Critical observation**: The RPC references `'vet'` as a tenant type for vet capability, but the actual tenant type enum value for independent vets is `'doctor'`, not `'vet'`. This means **doctor tenants do NOT get `vet: enabled:true` from the RPC** — they get it from `useModuleAccess` fallback logic (`isVetIndependent = tenantType === 'doctor'`).

### 13.2.6 Onboarding Differences by Tenant Type
The onboarding form is **identical** for all 10 types except:
- `tenantType === "stable"` shows an extra "Horse Capacity" field in Step 1
- Title and description text are parameterized from `tenantTypeConfig` map
- No type-specific steps, no domain-specific questions, no module configuration

### 13.2.7 Module Awareness
Onboarding is **tenant-type-aware only**. It does not ask about modules, does not let users choose capabilities, does not show what modules will be available. Module availability is entirely determined post-creation by capability seeding + `useModuleAccess` defaults.

### 13.2.8 Overpromising Assessment
**Yes, onboarding significantly overpromises for 5 tenant types**. The SelectRole cards imply production-ready domain surfaces for Pharmacy ("manage an equine pharmacy"), Transport ("provide horse transport and logistics"), Auction ("organize and manage horse auctions"), Trainer ("provide independent training services"), and Horse Owner ("manage their health and care"). None of these have dedicated domain surfaces.

### 13.2.9 Strongest Mismatches

| Tenant Type | Promise | Reality |
|---|---|---|
| Pharmacy | "manage an equine pharmacy and supply medications" | Empty generic dashboard, no pharmacy features |
| Auction | "organize and manage horse auctions and sales events" | Empty generic dashboard, no auction features |
| Trainer | "provide independent training services" | Empty generic dashboard, no trainer features |
| Transport | "provide horse transport and logistics services" | Generic dashboard with movement module only — no transport-specific UI |
| Horse Owner | "manage their health and care" | Generic dashboard, no owner-specific health tracking |

---

## 13.3 Tenant Type Selection Reality Audit

### 13.3.1 UI Presentation
10 polished cards in a 3-column grid. Each has gradient icon, title, description, gold "Continue →" CTA. Professional appearance suggests equal readiness.

### 13.3.2 Per-Type Assessment

#### 13.3.2.1 Stable
- **Promise**: "own or manage a stable and need to manage horses, staff, and clients"
- **Delivered**: Full horse management, boarding/housing, breeding, vet, lab requests, HR, finance, services, clients, schedule, files, POS, connections
- **Status**: **Production-usable**

#### 13.3.2.2 Horse Owner
- **Promise**: "own one or more horses and want to manage their health and care"
- **Delivered**: Generic dashboard with no horse health tracking surface. No dedicated owner portal. Shared horse management exists but requires creating an org tenant, which contradicts the "individual owner" mental model.
- **Status**: **Misleading**

#### 13.3.2.3 Clinic (Veterinarian)
- **Promise**: "run a veterinary clinic and need to manage cases and records"
- **Delivered**: Vet module enabled by default, lab requests mode, housing enabled. No clinic-specific patient intake or case management beyond basic vet visits. Uses stable architecture without horses nav.
- **Status**: **Limited but partially usable**

#### 13.3.2.4 Doctor (Independent Vet)
- **Promise**: "independent veterinarian providing services to stables and horse owners"
- **Delivered**: Full doctor module with patients, consultations, prescriptions, followups, services, billing. Dedicated nav section. Complete workflow.
- **Status**: **Production-usable**

#### 13.3.2.5 Laboratory
- **Promise**: "work in a laboratory and need to manage samples and test results"
- **Delivered**: Full lab module with samples, results, templates, requests, catalog, credits, timeline, settings. Dedicated nav config + bottom nav. Complete workflow.
- **Status**: **Production-usable**

#### 13.3.2.6 Trainer
- **Promise**: "provide independent training services to horses and riders"
- **Delivered**: Generic dashboard. No training session management, no student tracking, no curriculum, no scheduling. Schedule module is shared but has no trainer-specific logic.
- **Status**: **Not usable — misleading**

#### 13.3.2.7 Academy
- **Promise**: "run a training academy with courses, sessions, and students"
- **Delivered**: Sessions management + booking management. No curriculum, no student progress, no course catalog. But basic session/booking workflow works.
- **Status**: **Limited but partially usable**

#### 13.3.2.8 Pharmacy
- **Promise**: "manage an equine pharmacy and supply medications and supplements"
- **Delivered**: Generic dashboard. No pharmacy inventory UI, no prescription filling, no drug catalog. Inventory schema exists in DB but is completely disconnected.
- **Status**: **Not usable — misleading**

#### 13.3.2.9 Transport
- **Promise**: "provide horse transport and logistics services"
- **Delivered**: Movement module enabled by default. But movement module is designed for stable intake/departure tracking, not transport logistics. No route planning, no vehicle management, no trip tracking.
- **Status**: **Not usable — misleading**

#### 13.3.2.10 Auction
- **Promise**: "organize and manage horse auctions and sales events"
- **Delivered**: Generic dashboard. Zero auction functionality. Only a `payment_reference_type` enum includes 'auction'.
- **Status**: **Not usable — misleading**

### 13.3.3 Recommended Visibility Categories

#### 13.3.3.1 Keep visible as-is
Stable, Laboratory, Doctor

#### 13.3.3.2 Relabel as limited/beta
Academy ("Sessions & Bookings — more features coming"), Clinic ("Vet & Lab access — more features coming")

#### 13.3.3.3 Hide temporarily
Pharmacy, Auction, Trainer

#### 13.3.3.4 Rethink product model
Horse Owner (should be personal workspace feature, not a tenant type), Transport (needs its own domain)

### 13.3.4 Cleanest Product Truth Strategy
Add a `readiness` field to each role card. Production-ready types show normally. Beta types show with a subtle badge. Not-ready types are hidden behind an expandable "Coming Soon" section at the bottom. This prevents user confusion without removing awareness of future modules.

---

## 13.4 Default Capability Seeding Audit

### 13.4.1 Seeding Mechanism
`initialize_tenant_defaults` RPC seeds 5 capability categories. All types get all 5 rows but with different `enabled`/`lab_mode` values. No additional capabilities are seeded (no academy, no doctor, no pharmacy categories exist in `tenant_capabilities`).

### 13.4.2 Per-Type Seeded Defaults

#### 13.4.2.1 Stable
- laboratory: `requests` ✅
- vet: `enabled:false` ⚠️ (user must manually enable)
- housing: `enabled:true` ✅
- movement: `enabled:true` ✅
- breeding: `enabled:true` ✅

Note: Vet is `false` by seeding, but `useModuleAccess` fallback returns `false` for stable too. So vet is hidden unless explicitly enabled via capability toggle. This is intentional — vet is opt-in for stables.

#### 13.4.2.2 Horse Owner
- laboratory: `none` ✅
- vet: `enabled:false` ✅
- housing: `enabled:false` ✅
- movement: `enabled:false` ✅
- breeding: `enabled:false` ✅

All capabilities disabled. Result: generic dashboard with no operational modules.

#### 13.4.2.3 Clinic
- laboratory: `requests` ✅
- vet: `enabled:true` ✅
- housing: `enabled:true` ✅
- movement: `enabled:true` ✅
- breeding: `enabled:false` ✅

Good defaults for a clinic.

#### 13.4.2.4 Doctor
- laboratory: `none` (RPC does NOT match `doctor` type for lab)
- vet: `enabled:false` (RPC matches `'clinic', 'vet'` — NOT `'doctor'`)
- housing: `enabled:false` ✅
- movement: `enabled:false` ✅
- breeding: `enabled:false` ✅

**Critical gap**: The RPC uses `'vet'` but the enum is `'doctor'`. So Doctor gets NO capabilities from seeding. However, `useModuleAccess` has `isVetIndependent = tenantType === 'doctor'` which defaults vet to true at runtime. This is a **workaround via fallback logic**, not correct seeding. Doctor nav items are `tenantType`-gated (not capability-gated), so they always appear for doctor tenants regardless of capabilities.

#### 13.4.2.5 Laboratory
- laboratory: `full` ✅
- vet: `enabled:false` ✅
- housing: `enabled:false` ✅
- movement: `enabled:false` ✅
- breeding: `enabled:false` ✅

Correct — lab gets full lab mode only.

#### 13.4.2.6 Pharmacy
- laboratory: `none`
- vet: `enabled:false`
- housing: `enabled:false`
- movement: `enabled:false`
- breeding: `enabled:false`

All disabled. No pharmacy-specific capability category exists.

#### 13.4.2.7 Trainer
- Identical to Pharmacy. All disabled. No trainer capability category.

#### 13.4.2.8 Academy
- Identical to Pharmacy. All disabled. No academy capability category.

**Gap**: Academy nav items are `tenantType`-gated, not capability-gated. So sessions/bookings appear regardless of capabilities. But no academy capability row is seeded.

#### 13.4.2.9 Transport
- laboratory: `none`
- vet: `enabled:false`
- housing: `enabled:false`
- movement: `enabled:true` ✅
- breeding: `enabled:false`

Movement enabled is correct for transport.

#### 13.4.2.10 Auction
- Identical to Pharmacy. All disabled. No auction capability.

### 13.4.3 Comparative Matrix

```text
Tenant Type   | lab        | vet   | housing | movement | breeding | Domain-Specific Cap
--------------|------------|-------|---------|----------|----------|--------------------
stable        | requests   | false | true    | true     | true     | none
horse_owner   | none       | false | false   | false    | false    | none
clinic        | requests   | true  | true    | true     | false    | none
doctor        | none       | false*| false   | false    | false    | none (nav=type-gated)
lab           | full       | false | false   | false    | false    | none
pharmacy      | none       | false | false   | false    | false    | none
trainer       | none       | false | false   | false    | false    | none
academy       | none       | false | false   | false    | false    | none (nav=type-gated)
transport     | none       | false | false   | true     | false    | none
auction       | none       | false | false   | false    | false    | none

*Doctor vet: seeded as false, but useModuleAccess defaults to true via isVetIndependent fallback
```

### 13.4.4 Seeding Inconsistencies

1. **RPC uses `'vet'` but enum is `'doctor'`**: Doctor tenants don't get vet capability from seeding. Silently rescued by `useModuleAccess` runtime fallback.
2. **No domain-specific capability categories**: Academy, doctor, pharmacy, trainer, auction, transport have no dedicated capability categories. Their features (where they exist) are gated purely by `tenantType` checks in nav config and sidebar.
3. **All 10 types get the same 5 capability rows**: Even types with zero use for any of these modules (pharmacy, auction) get them all — all disabled.
4. **No capability for `doctor` module features**: Doctor nav items bypass capability system entirely via `tenantType: "doctor"` filter.

### 13.4.5 Recommended Corrective Direction
1. Fix the `'vet'` → `'doctor'` mismatch in the RPC so doctor tenants get `vet: enabled:true` from seeding.
2. Add capability categories for modules that should be add-onable: `academy`, `doctor_consultations`. This enables module stacking (e.g., Stable + Academy).
3. Convert Academy and Doctor nav items from `tenantType`-gated to `moduleKey`-gated.
4. Do NOT add capability categories for non-existent modules (pharmacy, auction, trainer) — those need domain implementation first.

---

## 13.5 First-Run Routing and Landing Audit

### 13.5.1 Universal Landing
All tenant types land on `/dashboard` → `Dashboard.tsx`. No type-specific routing.

### 13.5.2 Landing Route Assessment

#### 13.5.2.1 Module-correct
Only Lab tenants get a meaningfully different experience because `MobileHomeGrid` shows lab-specific section cards, and `DashboardSidebar` shows lab nav sections. Desktop still lands on the shared dashboard.

#### 13.5.2.2 Generic
All other tenant types see the same Dashboard page.

#### 13.5.2.3 Empty for some types
Pharmacy, Auction, Trainer, Horse Owner see a dashboard with no domain-specific content — just generic stats cards and an "Overview" card saying "Welcome to {name}".

### 13.5.3 Per-Type First-Run

#### 13.5.3.1 Stable
- **Route**: `/dashboard`
- **First surface**: Welcome message, stat cards (total horses, health checkups, team members), BoardingDashboardWidgets, horses list, upcoming schedule widget, financial summary, recent activity
- **Meaningful**: Yes — shows actionable horse management, boarding stats
- **Quality**: **Strong first-run**

#### 13.5.3.2 Horse Owner
- **Route**: `/dashboard`
- **First surface**: Welcome, stat cards (no horse stat because `isHorseOwningTenant` is `false` for `horse_owner` type — bug!), generic overview card
- **Meaningful**: Minimal. `isHorseOwningTenant` check is `!tenantType || tenantType === 'stable' || tenantType === 'academy'` — **horse_owner is excluded**. This means horse owners don't see the horses list on the dashboard.
- **Quality**: **Poor — contradicts the entire purpose of this tenant type**

#### 13.5.3.3 Clinic
- **Route**: `/dashboard`
- **First surface**: No horse stats (not horse-owning), no boarding widgets (housing enabled but no horse-centric display). Shows vet and lab in sidebar. Generic overview card.
- **Meaningful**: Sidebar nav is relevant (vet, lab, schedule, clients, finance). Dashboard content is generic.
- **Quality**: **Weak first-run, but nav is usable**

#### 13.5.3.4 Doctor
- **Route**: `/dashboard`
- **First surface**: No horse stats (not horse-owning). Doctor nav items in sidebar. Generic overview card on dashboard.
- **Meaningful**: Sidebar has doctor-specific nav (Overview, Patients, Consultations, Services). Dashboard page itself has no doctor-specific widgets.
- **Quality**: **Decent — sidebar guides user to doctor module, but landing page is generic**

#### 13.5.3.5 Laboratory
- **Route**: `/dashboard`
- **First surface**: Mobile: lab sections in home grid. Desktop: lab sections in sidebar (Samples, Results, Horses, Requests, Catalog, etc.). Dashboard page shows generic content (no lab-specific widgets).
- **Quality**: **Good nav, generic dashboard content. Overall decent.**

#### 13.5.3.6 Pharmacy
- **Route**: `/dashboard`
- **First surface**: Generic dashboard. Sidebar shows: Dashboard, Community, Schedule, Records, HR, Services, Clients, Finance, Files, Public Profile, Settings. No pharmacy-specific items.
- **Quality**: **Empty domain experience. User has no idea what to do.**

#### 13.5.3.7 Trainer
- **Route**: `/dashboard`
- **First surface**: Identical to Pharmacy. No trainer-specific nav or content.
- **Quality**: **Empty domain experience**

#### 13.5.3.8 Academy
- **Route**: `/dashboard`
- **First surface**: Sessions and Bookings nav items appear in sidebar (tenantType-gated). Dashboard shows horse list because `isHorseOwningTenant` includes `academy`. Horses are irrelevant for many academies.
- **Quality**: **Mixed — academy nav exists but dashboard content is horse-centric**

#### 13.5.3.9 Transport
- **Route**: `/dashboard`
- **First surface**: No horse stats (not horse-owning). Movement enabled but no movement-specific nav item visible (movement is consolidated under housing, which is disabled for transport). Housing is `enabled:false` for transport.
- **Bug**: Transport gets `movement: enabled:true` but housing is `enabled:false`. Movement nav was consolidated under housing tab in sidebar. So transport has an enabled module with no visible nav entry.
- **Quality**: **Broken — the one relevant capability is invisible**

#### 13.5.3.10 Auction
- **Route**: `/dashboard`
- **First surface**: Generic dashboard. No auction nav, no auction content.
- **Quality**: **Empty domain experience**

### 13.5.4 Low-Value Landing Cases
Horse Owner, Pharmacy, Trainer, Auction, Transport — all land into generic dashboards with no path to domain-specific value.

---

## 13.6 Navigation Reality by Tenant Type

### 13.6.1 Desktop Sidebar Behavior
`DashboardSidebar.tsx` renders nav items through hardcoded conditional blocks, not from a data config. Items are filtered by: `workspaceMode`, `isLabTenant`, `isHorseOwningTenant`, `activeTenant?.tenant.type`, `activeRole`, and module enablement flags.

### 13.6.2 Mobile Home Grid Behavior
`MobileHomeGrid.tsx` reads from `NAV_MODULES` array (from `navConfig.ts`) and applies filters: `visibleIn`, `tenantType`, `roles`, `moduleKey`. Lab tenants in full mode get `LAB_NAV_SECTIONS` instead.

### 13.6.3 Gating Mechanisms

#### 13.6.3.1 By tenant type
`tenantType: "doctor"` gates doctor nav items. `tenantType: "academy"` gates session/booking items. Checked via `activeTenant?.tenant.type` match.

#### 13.6.3.2 By capability
`moduleKey: "vet"|"housing"|"breeding"|"lab"|"movement"` checked via `useModuleAccess`.

#### 13.6.3.3 By role
`roles: ["owner", "manager"]` hides items from staff/member roles.

#### 13.6.3.4 By route guard
`ModuleGuard` wraps routes to prevent navigation to disabled modules. `WorkspaceRouteGuard` enforces workspace mode.

#### 13.6.3.5 Config drift
`navConfig.ts` and `workspaceNavConfig.ts` define overlapping but not identical module lists. `DashboardSidebar.tsx` does NOT read from either config — it has its own hardcoded nav structure. `MobileHomeGrid.tsx` reads from `navConfig.ts`. This creates drift risk between desktop and mobile nav.

### 13.6.4 Post-Onboarding Visible Nav Map

```text
Type         | Sidebar (Desktop, Org mode, Owner role)
-------------|------------------------------------------
stable       | Dashboard, Community, Horses(MyHorses/Orders/Breeding), Schedule, Records,
             | HR(Team/Payroll), Housing(Facilities/Admissions/Arrivals/Incoming),
             | Services, Clients, Finance(Ledger/Invoices/Expenses/Payments/Balances/POS),
             | Files, Public Profile, Settings(Roles/Permissions/Connections/Notifications)
             | [Lab if lab_mode≠none: under Horses group]
             | [Vet if enabled: under Horses group]

clinic       | Dashboard, Community, Vet, Lab, Schedule, Records, HR, Housing,
             | Services, Clients, Finance, Files, Public Profile, Settings

doctor       | Dashboard, Community, DoctorOverview, DoctorPatients, DoctorConsultations,
             | DoctorServices, Schedule, Records, HR, Services, Clients, Finance,
             | Files, Public Profile, Settings

lab          | Dashboard, Community, [Lab Sections: Samples/Results/Horses/Requests/
             | Catalog/Compare/Timeline/Templates/Settings], Schedule, Records, HR,
             | Services, Clients, Finance, Files, Public Profile, Settings

academy      | Dashboard, Community, Horses(MyHorses/Orders), Sessions, Bookings,
             | Schedule, Records, HR, Services, Clients, Finance, Files,
             | Public Profile, Settings

pharmacy     | Dashboard, Community, Schedule, Records, HR, Services, Clients,
             | Finance, Files, Public Profile, Settings
             | [No domain-specific items]

trainer      | [Identical to Pharmacy]

transport    | [Identical to Pharmacy — movement module invisible despite being enabled]

auction      | [Identical to Pharmacy]

horse_owner  | [Identical to Pharmacy — no horses nav despite being "horse owner"]
```

### 13.6.5 Nav State Classification

#### 13.6.5.1 Visible and functional
Stable: all items. Lab: all lab sections. Doctor: all doctor items. Academy: sessions/bookings.

#### 13.6.5.2 Visible but weak
Clinic: vet and lab items are functional but dashboard doesn't highlight them. Academy: Horses nav appears but is potentially irrelevant for non-horse academies.

#### 13.6.5.3 Visible but empty
Pharmacy/Trainer/Auction/Transport/Horse Owner: Schedule, Records, HR, Services, Clients, Finance — these shared modules are visible and technically functional but have no domain-specific operational value without horses or domain data.

#### 13.6.5.4 Hidden but actually available
All routes remain accessible via direct URL. A pharmacy tenant could manually navigate to `/dashboard/vet` — it would be blocked by `ModuleGuard` since vet is disabled. But `/dashboard/clients` or `/dashboard/finance` work fine.

#### 13.6.5.5 Unavailable because tenant-type-gated
Doctor nav items: invisible to non-doctor tenants. Academy sessions/bookings: invisible to non-academy tenants. This prevents module stacking (e.g., Stable cannot add Doctor features).

#### 13.6.5.6 Unavailable because capability not seeded
Stable vet: disabled by default, must be manually enabled. Horse Owner everything: all capabilities disabled.

#### 13.6.5.7 Unavailable because route/UI does not exist
Pharmacy domain pages, auction domain pages, trainer domain pages, transport logistics pages — these routes simply don't exist in `App.tsx`.

### 13.6.6 Most Misleading Nav States

1. **Transport**: Movement capability enabled but invisible (consolidated under housing, which is disabled)
2. **Horse Owner**: Named "Horse Owner" but horses nav hidden (`isHorseOwningTenant` excludes `horse_owner`)
3. **Pharmacy/Trainer/Auction**: Professional shared modules (Finance, HR, Clients) visible but without domain context, creating false sense of completeness

### 13.6.7 Recommended Nav Strategy
1. Fix `isHorseOwningTenant` to include `horse_owner` type
2. Fix transport: either enable housing for transport, or add standalone movement nav item
3. Convert doctor/academy nav from `tenantType`-gated to `moduleKey`-gated to enable stacking
4. Add empty-state education for domain-less tenant types (e.g., "Pharmacy features coming soon" card)
5. Consolidate nav definition: sidebar should read from the same config as mobile grid

---

## 13.7 Post-Onboarding Experience by Tenant Type

### 13.7.1 Stable
#### 13.7.1.1 Full dashboard with horse stats, boarding widgets, horse list, schedule, finance summary
#### 13.7.1.2 Immediately usable: Horses CRUD, boarding/housing, breeding, services, clients, finance, HR, schedule, files
#### 13.7.1.3 Production-usable: All major pages and workflows
#### 13.7.1.4 Visible but partial: Vet (opt-in), lab (requests mode — needs external lab to send requests to)
#### 13.7.1.5 Absent: No onboarding wizard for first horse, no starter templates for services/plans
#### 13.7.1.6 **Quality: Strong — best first-run experience on the platform**

### 13.7.2 Horse Owner
#### 13.7.2.1 Generic dashboard without horse list (isHorseOwningTenant bug)
#### 13.7.2.2 Shared surfaces available: Schedule, Records, HR, Services, Clients, Finance — but without horses, these are operationally empty
#### 13.7.2.3 No dedicated owner portal, no horse health dashboard, no vet appointment booking
#### 13.7.2.4 Yes — card says "manage horses and their health" but user cannot even see horses in dashboard
#### 13.7.2.5 **Quality: Poor — the weakest paradox in the platform (named for horses, can't see horses)**

### 13.7.3 Clinic
#### 13.7.3.1 Generic dashboard, vet and lab nav visible
#### 13.7.3.2 Clinic behaves as vet+lab+housing access bundle built on stable architecture. No clinic-specific patient intake.
#### 13.7.3.3 Vet visits/treatments/vaccinations available. Lab requests available.
#### 13.7.3.4 Missing: patient intake flow, appointment scheduling, clinical case management, prescription management (exists only in Doctor module)
#### 13.7.3.5 **Quality: Limited but partially usable — vet workflows function**

### 13.7.4 Laboratory
#### 13.7.4.1 Lab sections in sidebar (desktop) and home grid (mobile)
#### 13.7.4.2 Full lab capabilities: samples, results, templates, requests, catalog, credits, timeline, settings
#### 13.7.4.3 First-run is coherent — sidebar immediately guides to lab sections
#### 13.7.4.4 Immediately usable: All lab operational and commercial surfaces
#### 13.7.4.5 **Quality: Strong — second best first-run after Stable**

### 13.7.5 Pharmacy
#### 13.7.5.1 Generic dashboard with shared modules only
#### 13.7.5.2 No pharmacy domain surface exists
#### 13.7.5.3 Inventory schema exists in DB (products, warehouses, stock_levels) but is completely disconnected — no UI
#### 13.7.5.4 User can manage clients, services, finance, HR — but without pharmacy context
#### 13.7.5.5 **Quality: Misleading — professional UI hides empty domain**

### 13.7.6 Independent Trainer
#### 13.7.6.1 Generic dashboard identical to pharmacy
#### 13.7.6.2 No trainer-specific workflow (no training sessions, no student tracking, no schedule integration)
#### 13.7.6.3 Trainer is only an onboarding label — zero domain implementation
#### 13.7.6.4 **Quality: Not usable**

### 13.7.7 Independent Veterinarian / Doctor
#### 13.7.7.1 Doctor overview, patients, consultations, services in sidebar
#### 13.7.7.2 Immediately available: patient registration, consultation lifecycle, prescriptions, followups, billing
#### 13.7.7.3 Complete and commercially coherent — consultations generate invoices via billing_links
#### 13.7.7.4 **Quality: Strong — complete domain with commercial integration**

### 13.7.8 Auction
#### 13.7.8.1 Generic dashboard
#### 13.7.8.2 No auction domain workflow exists
#### 13.7.8.3 Effectively empty — only `payment_reference_type` enum has 'auction'
#### 13.7.8.4 **Quality: Not usable**

### 13.7.9 Transport
#### 13.7.9.1 Generic dashboard. Movement enabled but invisible in nav.
#### 13.7.9.2 Movement module designed for stable intake/departure, not transport logistics
#### 13.7.9.3 Missing: vehicle management, trip/route planning, pickup/delivery scheduling, fleet tracking
#### 13.7.9.4 **Quality: Broken — enabled capability is invisible**

### 13.7.10 Academy
#### 13.7.10.1 Sessions and Bookings nav items visible. Horses nav visible (because academy is in isHorseOwningTenant).
#### 13.7.10.2 Sessions CRUD, booking management available
#### 13.7.10.3 Operationally coherent for basic session/booking workflow
#### 13.7.10.4 Missing: curriculum management, student progress, course catalog, instructor profiles, certification tracking
#### 13.7.10.5 **Quality: Limited but usable for basic operations**

---

## 13.8 Capability Stacking and Add-On Experience

### 13.8.1 Post-Creation Capability Changes
`useModuleAccess` exposes `toggleModule(category, enabled)` and `setLabMode(mode)` which call `upsertCapability`. This updates `tenant_capabilities` rows at runtime.

### 13.8.2 Behavior of Newly Enabled Capabilities

#### 13.8.2.1 Immediately change nav
Yes — `useModuleAccess` recomputes, `DashboardSidebar` and `MobileHomeGrid` re-render.

#### 13.8.2.2 Immediately expose routes
Yes — `ModuleGuard` checks live capability state.

#### 13.8.2.3 Require refresh
No — reactive via React Query invalidation and context re-render.

#### 13.8.2.4 Require tenant type changes
No for capability-gated modules (vet, housing, movement, breeding, lab). **Yes** for type-gated modules (doctor, academy) — these cannot be added via capability toggle.

#### 13.8.2.5 Desktop/mobile consistency
Desktop sidebar and mobile home grid use different codepaths but same `useModuleAccess` hook. Behavior should be consistent for capability-gated modules.

### 13.8.3 Stacking Scenarios

#### 13.8.3.1 Stable + Lab
**Works**. Stable defaults to `lab_mode: requests`. Can upgrade to `full` via `setLabMode('full')`. Lab sections would appear in sidebar under Horses group and as full lab nav.

#### 13.8.3.2 Clinic + Lab
**Works**. Same as Stable + Lab. Clinic defaults to `requests` mode already.

#### 13.8.3.3 Clinic + Pharmacy
**Does not work**. No pharmacy module exists. Enabling it is meaningless — no nav items, no routes, no UI.

#### 13.8.3.4 Stable + Academy
**Does not work**. Academy nav items are `tenantType: "academy"` gated. A stable tenant will never see Sessions/Bookings nav items regardless of capabilities.

#### 13.8.3.5 Stable + Doctor
**Does not work**. Doctor nav items are `tenantType: "doctor"` gated. Cannot be added to a stable.

#### 13.8.3.6 Transport + shared movement
**Broken**. Transport gets `movement: enabled:true` but movement is consolidated under housing nav (which is disabled). No standalone movement entry point.

### 13.8.4 Per-Scenario Details

#### 13.8.4.1 Stable + Lab: visible — lab sections under horses group or full lab nav
#### 13.8.4.2 Stable + Lab: reachable — `/dashboard/laboratory` with all tabs
#### 13.8.4.3 Stable + Academy: **blocked by tenantType gating** — sessions/bookings invisible
#### 13.8.4.4 Stable + Doctor: **blocked by tenantType gating** — doctor overview/patients/consultations invisible
#### 13.8.4.5 Ideal: All modules should be capability-gated, not type-gated

### 13.8.5 Biggest Blockers to Clean Module Stacking

1. **Doctor and Academy are tenantType-gated**, making them impossible to add to other tenant types
2. **No capability categories exist** for doctor or academy modules
3. **Movement nav is coupled to housing nav** — breaks transport
4. **No UI for module management** — operators cannot toggle capabilities themselves (need direct DB/API access or a settings page that doesn't exist yet)

---

## 13.9 First-Run UX Truthfulness Audit

### 13.9.1 Where Product Tells Truth Well
Stable, Laboratory, Doctor — onboarding promise matches operational reality. Nav guides to real workflows.

### 13.9.2 Where Product Exaggerates Readiness
Pharmacy, Auction, Trainer — SelectRole cards promise domain-specific management but deliver generic shared modules.

### 13.9.3 Where UI Polish Hides Weakness
The onboarding flow is identically polished for all 10 types. The 3-step form looks professional regardless of whether the type has any implementation behind it.

### 13.9.4 Where Empty Dashboards Create Confusion
Horse Owner, Pharmacy, Trainer, Auction, Transport — user completes a professional onboarding and lands in a dashboard with no clear path to domain-specific value.

### 13.9.5 Mental Model Mismatches
- **Horse Owner**: Expects horse-centric portal, gets generic org dashboard without horses
- **Pharmacy**: Expects inventory/prescription management, gets empty shared modules
- **Transport**: Expects logistics tools, gets nothing visible
- **Trainer**: Expects training session management, gets nothing

### 13.9.6 Recommended Truthfulness Improvements

#### 13.9.6.1 Wording changes
Add "Coming Soon" or "Beta" qualifiers to unready types in SelectRole descriptions.

#### 13.9.6.2 Onboarding card changes
Add readiness badges: ✅ Full, 🔶 Beta, 🔜 Coming Soon. Move unready types to a collapsed "More options coming soon" section.

#### 13.9.6.3 Route redirects
No changes needed — `/dashboard` is appropriate for all types.

#### 13.9.6.4 Default empty-state education
For underdeveloped tenant types, show a prominent "Getting Started" card listing what shared features are available and what domain features are planned.

#### 13.9.6.5 Beta labels
Academy, Clinic — add "Beta" label to nav items.

#### 13.9.6.6 Temporary hiding
Hide Pharmacy, Auction, Trainer from SelectRole. Rethink Horse Owner as personal workspace feature.

---

## 13.10 Operational Readiness Matrix

### 13.10.1 Evidence-Based Matrix

```text
Type         | Promise              | Seeded Caps        | Dashboard  | Nav Depth | Workflows     | Missing          | Credible | Class
-------------|----------------------|--------------------|------------|-----------|---------------|------------------|----------|-------
Stable       | Full stable mgmt     | lab-req,hous,mv,br | Rich       | Deep      | All major     | Vet opt-in       | Yes      | Prod
Lab          | Full lab mgmt        | lab-full           | Generic    | Deep(lab) | All lab       | Dashboard widgets| Yes      | Prod
Doctor       | Independent vet      | (fallback)         | Generic    | Medium    | Full clinical | Dashboard widgets| Yes      | Prod
Clinic       | Vet clinic           | vet,lab-req,hous,mv| Generic    | Medium    | Vet+lab basic | Case mgmt        | Partial  | Limited
Academy      | Training academy     | (none relevant)    | Horse-cntrc| Shallow   | Sessions/book | Curriculum,prog  | Partial  | Limited
Horse Owner  | Horse health mgmt    | (all disabled)     | Empty      | None      | None specific | Everything       | No       | Misleading
Transport    | Transport logistics  | movement(hidden)   | Empty      | None      | None visible  | Everything       | No       | Misleading
Pharmacy     | Pharmacy mgmt        | (all disabled)     | Empty      | None      | None          | Everything       | No       | Misleading
Trainer      | Training services    | (all disabled)     | Empty      | None      | None          | Everything       | No       | Misleading
Auction      | Auction management   | (all disabled)     | Empty      | None      | None          | Everything       | No       | Misleading
```

### 13.10.2 Classification

#### 13.10.2.1 Production-ready
Stable, Laboratory, Doctor

#### 13.10.2.2 Limited but usable
Clinic, Academy

#### 13.10.2.3 Shared-surface only
(None cleanly in this category)

#### 13.10.2.4 Misleadingly exposed
Horse Owner, Transport

#### 13.10.2.5 Not ready for user-facing onboarding
Pharmacy, Trainer, Auction

### 13.10.3 Ranking (Strongest to Weakest First-Run)

1. **Stable** — Rich dashboard, deep nav, full workflows
2. **Laboratory** — Domain-specific nav, full lab workflows
3. **Doctor** — Dedicated module, complete clinical workflow
4. **Clinic** — Working vet/lab but generic dashboard
5. **Academy** — Sessions/bookings work, but horse-centric dashboard is confusing
6. **Horse Owner** — Named for horses, can't see horses
7. **Transport** — Enabled capability is invisible
8. **Pharmacy** — Professional shell, empty domain
9. **Trainer** — Professional shell, empty domain
10. **Auction** — Professional shell, empty domain

---

## 13.11 Gap Map and Corrective Directions

### 13.11.1 Biggest Onboarding Architecture Gaps

**Gap 1: 5 unready tenant types exposed equally in SelectRole**
- Evidence: Pharmacy/Auction/Trainer have zero domain UI. Horse Owner and Transport have broken experiences.
- Risk: User creates account, completes onboarding, finds empty product. Destroys trust.
- Affected: Pharmacy, Auction, Trainer, Horse Owner, Transport
- Solution: Hide unready types or add "Coming Soon" section. Quick fix.
- Priority: **Critical**

### 13.11.2 Biggest Default-Seeding Gaps

**Gap 2: RPC uses `'vet'` instead of `'doctor'` for vet capability**
- Evidence: Migration SQL line `WHEN p_tenant_type IN ('clinic', 'vet')` — no `'doctor'` match
- Risk: Doctor tenants rely on runtime fallback instead of correct seeding. Fragile.
- Affected: Doctor
- Solution: Fix RPC to include `'doctor'` in vet capability condition. Quick fix (migration).
- Priority: **High**

**Gap 3: No capability categories for doctor or academy modules**
- Evidence: Doctor/Academy nav is `tenantType`-gated, not `moduleKey`-gated
- Risk: Blocks module stacking (Stable+Academy, Stable+Doctor impossible)
- Solution: Add `doctor_consultations` and `academy` capability categories. Medium refactor.
- Priority: **Medium**

### 13.11.3 Biggest First-Run UX Gaps

**Gap 4: Horse Owner excluded from `isHorseOwningTenant`**
- Evidence: `isHorseOwningTenant = !tenantType || tenantType === 'stable' || tenantType === 'academy'` — `horse_owner` not included
- Risk: Horse owners cannot see horses on dashboard or in nav
- Solution: Add `'horse_owner'` to the condition. Quick fix.
- Priority: **High** (if horse_owner type remains visible)

**Gap 5: Transport movement capability invisible**
- Evidence: Movement consolidated under housing nav. Transport has `housing: false`, `movement: true`.
- Risk: Transport's only relevant capability is unreachable
- Solution: Add standalone movement nav item for transport type, or enable housing for transport. Quick fix.
- Priority: **High** (if transport type remains visible)

### 13.11.4 Biggest Navigation-Truth Gaps

**Gap 6: Desktop sidebar and mobile grid use different codepaths**
- Evidence: Sidebar is hardcoded in `DashboardSidebar.tsx`. Mobile reads from `navConfig.ts`. Both have separate filtering logic.
- Risk: Nav drift between desktop and mobile
- Solution: Consolidate to single nav config consumed by both. Medium refactor.
- Priority: **Low** (currently aligned by coincidence)

### 13.11.5 Biggest Module-Stacking Gaps

**Gap 7: Doctor and Academy are tenantType-gated**
- Evidence: `tenantType: "doctor"` and `tenantType: "academy"` in both navConfig and sidebar
- Risk: Prevents any module stacking involving these domains
- Solution: Convert to capability-gated. Requires new capability categories + navigation refactor. Medium refactor.
- Priority: **Medium**

**Gap 8: No module management UI**
- Evidence: No settings page for toggling modules. Only programmatic via `toggleModule()`
- Risk: Operators cannot self-serve enable/disable modules
- Solution: Add Module Settings section to `/dashboard/settings`. Small feature.
- Priority: **Medium**

### 13.11.6 Solution Categories

#### 13.11.7.1 Immediate truthfulness fixes
1. Hide Pharmacy, Auction, Trainer from SelectRole (or add "Coming Soon" section)
2. Fix `isHorseOwningTenant` to include `horse_owner`
3. Fix transport movement nav visibility

#### 13.11.7.2 Near-term onboarding corrections
4. Fix RPC `'vet'` → include `'doctor'`
5. Add domain-specific empty-state cards for underdeveloped tenant types
6. Add "Beta" badges to Academy and Clinic in SelectRole

#### 13.11.7.3 Medium-term capability architecture refactors
7. Add capability categories for doctor and academy
8. Convert tenantType-gated nav to moduleKey-gated
9. Add Module Settings UI page
10. Consolidate sidebar + mobile nav to shared config

#### 13.11.7.4 Strategic tenant/module model improvements
11. Rethink Horse Owner as personal workspace feature rather than tenant type
12. Build domain surfaces for next priority modules (Pharmacy → Inventory integration, Transport → logistics)
13. Eventually align all 10 modules to capability-gated model

---

## 13.12 Evidence-Based Summary

### 13.12.1 Current Reality
A new Dayli Horse tenant has a polished 3-step onboarding that creates a tenant, seeds capabilities, and lands on a shared dashboard. For Stable, Lab, and Doctor tenants, the experience continues into domain-specific operational surfaces. For 5 other tenant types, the experience ends at an empty generic dashboard.

### 13.12.2 Strongest Onboarding-to-Value Continuity
1. Stable — onboarding → rich dashboard → immediate operational workflows
2. Laboratory — onboarding → lab-specific nav → sample/result management
3. Doctor — onboarding → doctor nav → patient/consultation workflows

### 13.12.3 Most Misleading or Empty
1. Pharmacy — promises pharmacy management, delivers nothing
2. Auction — promises auction management, delivers nothing
3. Trainer — promises training services, delivers nothing
4. Horse Owner — promises horse health management, hides horses
5. Transport — promises logistics, hides its only capability

### 13.12.4 Current Onboarding Model Trustworthiness
**Not trustworthy** for 5 of 10 tenant types. The equal visual treatment of all 10 types in SelectRole creates a false impression of equal readiness. Only 3 types (Stable, Lab, Doctor) deliver on the onboarding promise. 2 types (Clinic, Academy) partially deliver. 5 types (Horse Owner, Pharmacy, Trainer, Transport, Auction) are misleading.

### 13.12.5 Most Important Corrective Actions Before Equal Exposure
1. **Hide or clearly mark** unready tenant types (Pharmacy, Auction, Trainer)
2. **Fix Horse Owner** `isHorseOwningTenant` bug
3. **Fix Transport** movement nav visibility
4. **Fix Doctor** capability seeding (`'vet'` → `'doctor'`)
5. **Add Module Settings UI** for self-serve capability management

### 13.12.6 Recommended Next Audit Slice
**Shared Module Depth Audit** — Deep inspection of the shared modules that all tenant types inherit (Finance, HR, Services, Clients, Schedule, Records, Files, Settings/Permissions/Connections) to assess whether these shared surfaces are production-grade across all tenant contexts, or whether they silently assume stable-centric data patterns.

---

## 14 Output Rules Compliance
All findings are evidence-based with specific file/function/line references. Gaps include concrete corrective directions. No code patches produced.

---

## 15 Final Deliverable State

### 15.1 Final numbering point reached: **13.12.6**

### 15.2 Recommended next starting number: **16**

### 15.3 Recommended next audit slice: **Shared Module Depth Audit** — examining Finance, HR, Services, Clients, Schedule, Records, Files, Settings/Permissions/Connections across all tenant type contexts to identify stable-centric assumptions, missing cross-module behaviors, and readiness for multi-tenant-type production use.

