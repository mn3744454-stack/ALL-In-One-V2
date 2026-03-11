```
# Stable Housing / Admissions / Services Forensic Audit

---

## 1. Executive Diagnosis

The current system has four structural problems of decreasing severity:

**Problem 1: Naming confusion in the facility hierarchy.** The codebase uses `branches` as the top container, `facility_areas` as the intermediate grouping layer, and `housing_units` as the bottom slot. The existence of the intermediate layer is correct, but the word "Area" is operationally weak in a stable context. Users will not intuitively understand what an "Area" is inside their branch. The old project used "Barn + Row + Position" as embedded strings. The current project correctly promoted the intermediate layer to a first-class table, but the final user-facing naming is still unresolved and should not be prematurely locked to one label without validating the stable domain vocabulary.

**Problem 2: Movement destinations are limited to internal branches.** `horse_movements.from_location_id` and `to_location_id` both reference `public.branches(id)`. This means a horse can only move between the organization's own branches. There is no mechanism for:
- Departure to an external entity (vet clinic, competition venue, another stable)
- Arrival from an external entity
- Cross-platform connected-entity destinations (like the lab connection pattern)
- Incoming mirrored arrival visibility on the receiving side when the destination is another platform entity

This is a fundamental data model limitation. The old project solved this with a parallel `ExternalLocation` concept, but the current project also needs a connected-entity destination pattern inspired by the stable-to-lab workflow.

**Problem 3: The dual commercial layer (`tenant_services` vs `stable_service_plans`) remains disconnected.** `tenant_services` has `price_display: string` (not numeric), no billing cycle, no currency. `stable_service_plans` has `base_price: number`, `billing_cycle`, `currency`. They live in two tabs on the Services page but share zero foreign keys or relational logic. `tenant_services` is a display/catalog identity layer. `stable_service_plans` is the actual pricing engine and admission-consumable offering layer. Admissions only consume `stable_service_plans`.

**Problem 4: Movement is duplicated in two places.** `DashboardMovement.tsx` exists as a standalone page at `/dashboard/movement` (accessible from the Horses NavGroup in the sidebar). `DashboardHousing.tsx` also has a "Movement" tab (`housing.tabs.movement` = "Arrivals & Departures"). Both render `<MovementsList>` with the same component. This is confusing: the user sees the same data in two places, managed from two different navigation contexts.

**Strengths to preserve:**
- Admission lifecycle state machine (draft → active → checkout_pending → checked_out) is correct
- Draft-then-promote pattern with movement rollback is sound
- AdmissionDetailSheet is already evolving into an operational control center
- Care Notes CRUD is well-positioned inside admission context
- Plan selection + prefill in admission wizard works correctly
- The intermediate facility layer as a first-class table is architecturally correct, but its naming and domain meaning need refinement
- The stable-to-lab pattern already proves the system can support platform-connected provider flows and should inform movement destination architecture

---

## 2. Current-State Architecture Map

### 2.1 Facility Hierarchy (DB → UI)

```text
branches (id, tenant_id, name, address, city, is_active)
  └── facility_areas (id, branch_id, tenant_id, name, name_ar, code)
       └── housing_units (id, branch_id, area_id, tenant_id, code, name, unit_type, occupancy, capacity)
            └── housing_unit_occupants (unit_id, horse_id, since, until)
```

- `housing_units.unit_type` is enum: `stall | paddock | room | cage | other`
- `housing_units.occupancy` is enum: `single | group`
- `branches` has no `branch_type` or sub-classification
- `facility_areas` has no `area_type` or parent-child nesting
- There is also a `stables` table (id, name, tenant_id, branch_id) that is legacy and unused operationally

### 2.2 Movement Model (DB)

```
horse_movements (
  id, tenant_id, horse_id, movement_type [in|out|transfer],
  from_location_id → branches(id),   -- ONLY internal branches
  to_location_id   → branches(id),   -- ONLY internal branches
  from_area_id → facility_areas(id),
  to_area_id   → facility_areas(id),
  from_unit_id → housing_units(id),
  to_unit_id   → housing_units(id),
  reason, notes, internal_location_note, is_demo
)
```

Critical limitation: Both `from_location_id` and `to_location_id` reference `branches` only. No external destinations exist. No connected-platform destinations exist. No mirrored receiving-side arrival concept exists.

### 2.3 Commercial Layer

Two disconnected tables:


| Table                  | Fields                                                                                                                                     | Used by                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `tenant_services`      | name, description, service_type, `price_display` (STRING), is_active, is_public                                                            | Services page "Catalog" tab                       |
| `stable_service_plans` | name, name_ar, description, plan_type, billing_cycle, `base_price` (NUMERIC), currency, includes (JSONB), is_active, is_public, sort_order | Services page "Plans" tab, AdmissionWizard step 3 |


Only `stable_service_plans` feeds admissions. `tenant_services` feeds nothing operational.

### 2.4 Navigation Structure

- Sidebar: Horses NavGroup → includes Movement item (`/dashboard/movement`)
- Sidebar: Housing item (`/dashboard/housing`) → 4 tabs: Units, Areas, Admissions, Movement
- Sidebar: Services item (`/dashboard/services`) → 2 tabs: Catalog, Plans
- Movement appears in TWO places (standalone page + Housing tab)

### 2.5 Platform-connected pattern already present elsewhere

The current project already has a working pattern for cross-tenant service discovery and execution in the Stable ↔ Lab flow:

- Stable can discover connected labs
- Stable can select platform-connected lab providers
- Stable can choose external lab when needed
- Stable sees dynamically available services from the provider
- The provider receives the request on the other side

This pattern is highly relevant to movement destinations and should be reused conceptually for stable-to-stable / stable-to-partner movement flows.

---

## 3. Structural Problems

### 3.1 Naming & Hierarchy Issues

3.1.1 "Area" (`facility_areas`) is semantically weak. In a stable context, the intermediate grouping should be something physically meaningful: **Section**, **Wing**, **Barn**, **Block**, **Paddock Group**, or another domain-appropriate term. "Area" is too generic and does not convey structural meaning.

3.1.2 The current project has the correct instinct — a first-class intermediate layer between branch and unit — but the final naming and exact domain role of this layer remain unresolved. It should not be locked prematurely until the UX and operational semantics are validated.

3.1.3 "Unit" (`housing_units`) is acceptably generic but hides domain intent. The `unit_type` enum (stall, paddock, room, cage, other) provides the specificity. This is acceptable for MVP.

3.1.4 The `stables` table is redundant. It duplicates `tenants` with `tenant_type='stable'`. `horses.stable_id` references it. This is a known legacy issue and adds confusion for new development.

3.1.5 `branches` has minimal metadata: just `name`, `address`, `city`. No branch_type, no capacity, no manager_id, no coordinates, no timezone.

### 3.2 Movement Destination Limitation

3.2.1 `horse_movements.from_location_id` and `to_location_id` are FK-constrained to `branches(id)`. This means departure to a veterinary clinic, competition venue, or another stable is impossible at the data level unless it is modeled as one of the organization's own branches.

3.2.2 The `RecordMovementDialog` only shows `activeLocations` (from `useLocations` which queries `branches`). There is no UI for external destinations.

3.2.3 The old project had a separate `ExternalLocation` concept with type, usage tracking, and frequently-used sorting. The current project has nothing equivalent.

3.2.4 The existing `tenant_connections` + `consent_grants` pattern (used for lab partnerships) is not reused for movement destinations, even though it is the right conceptual pattern for connected entity movements.

3.2.5 The current project does not yet distinguish between:

- internal movement within the same organizational network
- outgoing movement to another platform-connected entity
- external manual destination outside the platform
- incoming mirrored arrival on the destination side

This is a major gap because the user explicitly needs both connected platform flow and external fallback flow.

### 3.3 Movement Duplication

3.3.1 `/dashboard/movement` (DashboardMovement.tsx) renders `MovementsList` with its own tabs (Movements, Locations, Settings).

3.3.2 `/dashboard/housing?tab=movement` also renders `MovementsList`.

3.3.3 Both show the same data from the same hook. The user experiences this as redundancy.

3.3.4 The Housing tab label says "Arrivals & Departures" (`housing.tabs.movement`) but the standalone page says "Movement" (`sidebar.movement`). Different naming for the same thing.

### 3.4 Commercial Layer Fragmentation

3.4.1 `tenant_services.price_display` is a string — cannot be used for computation.

3.4.2 `stable_service_plans` is the actual pricing engine and admission-consumable offering layer but is only loosely related to the generic Services catalog.

3.4.3 No FK relationship between `tenant_services` and `stable_service_plans`.

3.4.4 `boarding_admissions.plan_id` references `stable_service_plans` only. No reference to `tenant_services`.

3.4.5 The correct parent-child commercial relationship is still missing:

- `tenant_services` should represent the parent commercial/service identity
- `stable_service_plans` should represent the structured, priced, admission-consumable plan/package under that service

### 3.5 Admission Detail — Plan Display Bug

3.5.1 `AdmissionDetailSheet.tsx` line 254-255 renders `admission.plan_id` (the UUID) as the plan label text. It should resolve the plan name from the plans list or join.

---

## 4. Recommended MVP+ Target Architecture

### 4.1 Facility Hierarchy

```
Branch (top operational container)
  └── Intermediate facility layer (final naming to be validated)
       └── Unit (individual housing slot — typed: stall, paddock, room, etc.)
            └── Occupants (horse assignment)
```

**Important:** Keep `facility_areas` as the first-class intermediate DB layer for now to avoid migration risk, but do NOT prematurely hard-lock the final user-facing concept to only "Section". The system should validate whether the best stable-domain label is:

- Section
- Wing
- Barn
- Block
- Paddock Group
- another domain-appropriate term

For MVP, the lowest-risk path is:

- Keep the DB table as `facility_areas`
- Improve all user-facing labels
- Make the chosen UI label consistent everywhere
- Ensure the concept is physically meaningful to stable users

### 4.2 Movement Destination Model

Add support for three destination types:


| Destination Type              | Implementation                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| **Internal branch**           | Existing `branches(id)` FK — keep as-is                                                             |
| **Connected platform entity** | Reuse `tenant_connections` pattern; destination is another tenant on the platform                   |
| **External location**         | New `external_locations` table (name, address, city, type, tenant_id) for non-platform destinations |


The `horse_movements` table needs:

- Keep `from_location_id` / `to_location_id` for internal branches
- Add `from_external_location_id` / `to_external_location_id` → `external_locations(id)`
- Add `destination_type` enum: `internal | connected | external`
- Add enough metadata to resolve connected destination identity when movement is going to another platform entity

The RecordMovementDialog's location step should branch:

1. Internal: select from org branches
2. Connected: select from connected partner tenants (same pattern as lab partners)
3. External: select from saved external locations or create new

### 4.3 Mirrored arrival logic

When entity A sends a horse to another platform-connected entity B:

- A records a departure
- B should see a pending incoming arrival / incoming horse record
- The receiving side can then confirm, convert to arrival/admission, or process further

When the destination is external non-platform:

- no mirrored receiving-side record exists
- the source side still records the departure to the external location

This distinction is essential and should be first-class in the target model.

### 4.4 Commercial Model

For MVP:

- Keep `tenant_services` as the generic parent service catalog (commercial identity / display / top-level classification)
- Keep `stable_service_plans` as the structured pricing engine / packages / offerings
- Add `stable_service_plans.service_id` (optional FK to `tenant_services(id)`) to create the parent-child link
- Admissions continue consuming `stable_service_plans` directly

This is the lowest-risk approach. It creates the logical relationship without migrating data or breaking existing flows.

### 4.5 Navigation Consolidation

- Remove Movement from the Horses NavGroup sidebar item
- Remove the standalone `/dashboard/movement` page (or redirect to `/dashboard/housing?tab=movement`)
- Movement lives ONLY under Housing as the "Arrivals & Departures" tab
- Branch/location structure should be configured from the appropriate branch/facility context, not from a duplicated movement screen

---

## 5. Recommended Naming System

### 5.1 Facility Hierarchy


| Concept            | Current EN                            | Recommended EN                                                                                      | Current AR | Recommended AR                                                                   | Why                                                                                     |
| ------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Top container      | Branch / Location                     | **Branch**                                                                                          | فرع        | **فرع**                                                                          | Already correct                                                                         |
| Intermediate group | Area                                  | **Validate and choose the best stable-domain label**: Section / Wing / Barn / Block / Paddock Group | المنطقة    | **يجب التحقق من أفضل تسمية**: القسم / الجناح / الحظيرة / القطاع / مجموعة البادوك | "Area" is too vague. The final name must be physically meaningful in the stable domain. |
| Bottom slot        | Unit                                  | **Unit** (keep)                                                                                     | الوحدة     | **الوحدة**                                                                       | Generic enough. Unit type (stall/paddock) provides specificity                          |
| Unit types         | stall / paddock / room / cage / other | Keep as-is                                                                                          | —          | إسطبل / حظيرة / غرفة / قفص / أخرى                                                | Already correct enum                                                                    |


### 5.2 Movement Terms


| Concept             | Current EN                                                   | Recommended EN                                    | Current AR              | Recommended AR       |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------- | ----------------------- | -------------------- |
| Movement page label | "Movement" (sidebar) / "Arrivals & Departures" (housing tab) | **Arrivals & Departures** (single canonical name) | حركة / الوصول والمغادرة | **الوصول والمغادرة** |
| In movement         | Entry / In                                                   | **Arrival**                                       | وصول                    | **وصول**             |
| Out movement        | Out                                                          | **Departure**                                     | مغادرة                  | **مغادرة**           |
| Transfer            | Transfer                                                     | **Transfer**                                      | نقل                     | **نقل**              |


### 5.3 Commercial Terms


| Concept                       | Recommended EN | Recommended AR | Role                                       |
| ----------------------------- | -------------- | -------------- | ------------------------------------------ |
| Parent commercial identity    | **Service**    | **خدمة**       | Top-level what the stable offers           |
| Admission-consumable offering | **Plan**       | **باقة**       | Structured priced offering under a service |
| Future bundled variant        | **Package**    | **حزمة**       | Optional future expansion                  |
| Future time-based offering    | **Program**    | **برنامج**     | Optional future expansion                  |


### 5.4 Admission Terms


| Concept   | Current   | Recommended                                                        | Notes                                                  |
| --------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Admission | Admission | **Admission** (keep for now)                                       | Already used, stable enough for MVP                    |
| Check-in  | Check-in  | **Check-in** in admission context, **Arrival** in movement context | Keep dual terminology — they refer to different layers |


---

## 6. Movement & Destination Model

### 6.1 Current State

Movement destinations are branch-only. A departure to a vet clinic, another stable, competition venue, or non-platform site is impossible in a truthful way.

### 6.2 Recommended Target

#### 6.2.1 New `external_locations` table

```
CREATE TABLE public.external_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  address text,
  city text,
  location_type text DEFAULT 'other', -- stable, clinic, venue, farm, other
  contact_name text,
  contact_phone text,
  usage_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### 6.2.2 Extend `horse_movements`

```
ALTER TABLE public.horse_movements
  ADD COLUMN IF NOT EXISTS from_external_location_id uuid REFERENCES public.external_locations(id),
  ADD COLUMN IF NOT EXISTS to_external_location_id uuid REFERENCES public.external_locations(id),
  ADD COLUMN IF NOT EXISTS destination_type text DEFAULT 'internal';
  -- 'internal' | 'external' | 'connected'
```

Adjust constraints: for `out` movements, either internal or external/connected destination must be set. For `in`, either internal or external/connected source must be set.

#### 6.2.3 Connected-entity destinations

When a stable has a `tenant_connections` relationship with another entity (stable, clinic, lab, academy, etc.), the movement dialog should offer that connected entity as a destination. This reuses the same pattern as lab partnerships:

- Query accepted B2B connections
- Show connected entities as selectable destinations
- On the receiving side, the movement appears as a pending incoming arrival or pending transfer intake

This should not be treated as a vague future concept; it is part of the intended architecture, even if sequenced after internal cleanup and external location support.

#### 6.2.4 RecordMovementDialog changes

The "Location" step should add a destination type selector:

1. **Internal** → shows branches dropdown
2. **Connected** → shows connected platform entities
3. **External** → shows saved external locations + "Add new" option

#### 6.2.5 Arrival button meaning

The system should preserve manual "Arrival" capability because not every source entity will be on the platform. Therefore:

- If the horse is coming from a platform-connected entity, the receiving side may see a pending incoming arrival
- If the horse is coming from outside the platform, staff can still use a manual Arrival flow

---

## 7. Service / Offering Architecture

### 7.1 What remains

- `tenant_services` stays as generic parent service catalog
- `stable_service_plans` stays as structured pricing engine / packages / offerings
- Both remain accessible from `/dashboard/services`

### 7.2 What changes

- Add optional `stable_service_plans.service_id` → `tenant_services(id)` FK to create parent-child relationship
- This is purely additive — no breaking changes
- In the Services page, a service should be the parent commercial item
- Plans/packages should appear as child offerings under that service

### 7.3 What becomes authoritative

For admissions:

- `stable_service_plans` remains the authoritative pricing and configuration source consumed by admissions
- `tenant_services` remains the parent commercial definition layer

### 7.4 How offerings feed admissions

No conceptual change needed — only strengthening:

1. Wizard step 3: select from structured plans
2. `handlePlanSelect` prefills billing_cycle, currency, rate
3. Later steps allow controlled override
4. `plan_id` saved on admission as snapshot reference

### 7.5 How this stays simple

The user should understand:

- Services define what the stable offers
- Plans define how that service is sold/priced/structured
- Admissions consume a plan, not a vague freeform service definition

---

## 8. Admission UX and Detail-Sheet Recommendations

### 8.1 Currently Working Well

- Inline editing for: unit assignment, emergency contact, special instructions, expected departure
- Actionable warning quick-fix buttons (Assign Unit, Add Contact)
- Stay duration + estimated cost calculation
- Care Notes CRUD section
- Checkout button with two-step flow
- Status history timeline

### 8.2 Defects to Fix

8.2.1 **Plan display bug**: Line 255 shows raw `admission.plan_id` (UUID) instead of resolving the plan name. Fix: join plan name in the query or resolve from `activePlans`.

8.2.2 **No "no_rate" warning action button**: The warning says "No rate configured" but has no quick-action button. Add one that opens an inline rate editor.

8.2.3 **No link to movement history**: The detail sheet doesn't show related movements. Add a section showing check-in movement and any subsequent transfers.

### 8.3 Fields That Should Be Editable


| Field                | Currently Editable | Should Be      | Notes                                                                 |
| -------------------- | ------------------ | -------------- | --------------------------------------------------------------------- |
| Unit assignment      | ✓ Yes              | Keep           | Opens unit selector                                                   |
| Emergency contact    | ✓ Yes              | Keep           | Inline text edit                                                      |
| Special instructions | ✓ Yes              | Keep           | Inline textarea                                                       |
| Expected departure   | ✓ Yes              | Keep           | Date picker                                                           |
| Client               | ✗ No               | **Yes**        | Should be editable for cases where client is assigned after admission |
| Rate                 | ✗ No               | **Yes**        | Should allow rate adjustment with audit note                          |
| Billing cycle        | ✗ No               | Consider later | Lower priority                                                        |
| Reason               | ✗ No               | No             | Set at creation, historical                                           |


### 8.4 Related movement awareness

Admission detail should explicitly surface:

- check-in movement
- related transfer movements during stay
- checkout movement once completed

This creates a truthful bridge between lifecycle and event history.

---

## 9. Low-Risk Master Implementation Plan

### Phase 1: Naming & Navigation Cleanup (lowest risk, highest clarity impact)

#### 1.1 Replace weak facility naming in UI

- 1.1.1 Objective: Replace all i18n references from "Area" / "المنطقة" to a clearer validated facility term
- 1.1.2 Why: Removes the most common user confusion point
- 1.1.3 Dependency: None
- 1.1.4 Implementation: Audit all current housing labels and introduce a single canonical user-facing term for `facility_areas`. Do not assume "Section" is final until validated. Compare alternatives such as Section / Wing / Barn / Block / Paddock Group.
- 1.1.5 Acceptance: All `facility_areas` labels in Housing context use one consistent, validated stable-domain term

#### 1.2 Consolidate Movement navigation — remove duplication

- 1.2.1 Objective: Movement/Arrivals-Departures exists in ONE place only (Housing tab)
- 1.2.2 Why: Eliminates user confusion from seeing the same data in two places
- 1.2.3 Dependency: None
- 1.2.4 Implementation: Remove Movement item from Horses NavGroup in DashboardSidebar. Either delete `DashboardMovement.tsx` or redirect `/dashboard/movement` → `/dashboard/housing?tab=movement`.
- 1.2.5 Acceptance: No duplicate movement pages

#### 1.3 Fix Admission Detail plan display bug

- 1.3.1 Objective: Show plan name instead of UUID
- 1.3.2 Why: Currently displays raw UUID to user
- 1.3.3 Dependency: None
- 1.3.4 Implementation: In AdmissionDetailSheet, resolve `admission.plan_id` via `useStableServicePlans` or extend the admission query to join plan name
- 1.3.5 Acceptance: Plan row shows plan name (bilingual)

### Phase 2: Commercial Layer Clarification

#### 2.1 Add `service_id` FK to `stable_service_plans`

- 2.1.1 Objective: Link plans to parent services
- 2.1.2 Why: Creates the logical parent-child commercial relationship
- 2.1.3 Dependency: None
- 2.1.4 Implementation: Migration adding optional `service_id uuid REFERENCES tenant_services(id)`. Update ServicePlansManager to optionally show/set parent service.
- 2.1.5 Acceptance: Plans can be linked to a parent service. Existing plans unaffected.

#### 2.2 Improve service-plan relationship visibility

- 2.2.1 Objective: Show linked plans under each service in catalog view
- 2.2.2 Dependency: 2.1
- 2.2.3 Implementation: In Services catalog, show count/list of child plans under each service. In Plans tab, show parent service.
- 2.2.4 Acceptance: Users can understand which plans belong to which service

### Phase 3: Admission Detail Enhancements

#### 3.1 Add inline rate editing

- 3.1.1 Objective: Allow rate adjustment from detail sheet
- 3.1.2 Dependency: None
- 3.1.3 Implementation: Add editable rate rows for daily_rate/monthly_rate
- 3.1.4 Acceptance: Authorized user can edit rate inline

#### 3.2 Add "no rate" warning quick-action

- 3.2.1 Objective: Make "No rate configured" warning actionable
- 3.2.2 Dependency: 3.1
- 3.2.3 Implementation: Add button on no_rate warning that opens inline rate editor
- 3.2.4 Acceptance: Clicking warning opens rate editor

#### 3.3 Add related movements section

- 3.3.1 Objective: Show check-in and related movements in detail sheet
- 3.3.2 Dependency: None
- 3.3.3 Implementation: Query movements where `id = admission.checkin_movement_id` or where `horse_id = admission.horse_id` during admission period
- 3.3.4 Acceptance: Detail sheet shows movement history for this admission

#### 3.4 Add inline client editing

- 3.4.1 Objective: Allow client assignment/change from detail sheet
- 3.4.2 Dependency: None
- 3.4.3 Implementation: Editable client selector in detail sheet
- 3.4.4 Acceptance: Can assign or change client on active admission

### Phase 4: External Locations (enables real-world movement)

#### 4.1 Create `external_locations` table

- 4.1.1 Objective: Enable tracking of non-branch destinations
- 4.1.2 Why: Movement currently cannot represent departure to vet/competition/external stable
- 4.1.3 Dependency: None
- 4.1.4 Implementation: Migration creating table with name, name_ar, address, city, location_type, contact fields, usage_count, tenant_id scoping, RLS
- 4.1.5 Acceptance: Table exists and is usable by tenant members according to permissions

#### 4.2 Extend `horse_movements` for external destinations

- 4.2.1 Objective: Allow movements to/from external locations
- 4.2.2 Why: FK constraint currently prevents external destinations
- 4.2.3 Dependency: 4.1
- 4.2.4 Implementation: Add `from_external_location_id`, `to_external_location_id`, `destination_type`. Update constraints and movement RPC.
- 4.2.5 Acceptance: Can record departure to external destination and arrival from external source

#### 4.3 Create `useExternalLocations` hook

- 4.3.1 Objective: CRUD for external locations
- 4.3.2 Dependency: 4.1
- 4.3.3 Implementation: Standard query/mutation hook pattern
- 4.3.4 Acceptance: Hook provides list/create/update/toggleActive

#### 4.4 Update RecordMovementDialog for external destinations

- 4.4.1 Objective: Add destination type selector to movement wizard
- 4.4.2 Dependency: 4.2, 4.3
- 4.4.3 Implementation: Add Internal / External selector in location step. External mode shows saved external locations + inline create form.
- 4.4.4 Acceptance: User can record departure to external location or arrival from one

#### 4.5 Update MovementDetailSheet for external locations

- 4.5.1 Objective: Display external location info in detail view
- 4.5.2 Dependency: 4.2
- 4.5.3 Implementation: Extend movement query to join external_locations
- 4.5.4 Acceptance: External movements show correct source/destination info

### Phase 5: Connected Platform Destinations

#### 5.1 Extend movement dialog for connected platform entities

- 5.1.1 Objective: Allow selecting a connected stable/clinic/lab/etc. as movement destination
- 5.1.2 Dependency: Existing tenant_connections infrastructure, plus stable destination modeling decisions
- 5.1.3 Implementation: Add "Connected" destination type. Query accepted B2B connections. Show connected entities as destination options.
- 5.1.4 Acceptance: Can send a horse to a connected partner entity

#### 5.2 Incoming arrival visibility on receiving side

- 5.2.1 Objective: When entity A sends horse to connected entity B, B sees pending incoming arrival
- 5.2.2 Dependency: 5.1
- 5.2.3 Implementation: Cross-tenant notification or pending inbound record
- 5.2.4 Acceptance: Receiving entity sees inbound horse notification / pending arrival

#### 5.3 Preserve manual arrival flow for non-platform cases

- 5.3.1 Objective: Keep manual arrival usable when source entity is not on platform
- 5.3.2 Dependency: 4.x
- 5.3.3 Implementation: Ensure arrival action remains available independently of connected-source flows
- 5.3.4 Acceptance: Staff can still manually register arrival from a non-platform source

---

## 10. Final Checklist


| #   | Item                                                           | Phase | Status |
| --- | -------------------------------------------------------------- | ----- | ------ |
| 1.1 | Replace weak facility naming with one validated canonical term | 1     | TODO   |
| 1.2 | Remove Movement duplication (consolidate to Housing tab only)  | 1     | TODO   |
| 1.3 | Fix plan UUID display in AdmissionDetailSheet                  | 1     | TODO   |
| 2.1 | Add `service_id` FK to `stable_service_plans`                  | 2     | TODO   |
| 2.2 | Show linked plans under parent services                        | 2     | TODO   |
| 3.1 | Add inline rate editing in AdmissionDetailSheet                | 3     | TODO   |
| 3.2 | Add "no rate" warning quick-action                             | 3     | TODO   |
| 3.3 | Add related movements section in AdmissionDetailSheet          | 3     | TODO   |
| 3.4 | Add inline client editing in AdmissionDetailSheet              | 3     | TODO   |
| 4.1 | Create `external_locations` table + RLS                        | 4     | TODO   |
| 4.2 | Extend `horse_movements` for external destinations             | 4     | TODO   |
| 4.3 | Create `useExternalLocations` hook                             | 4     | TODO   |
| 4.4 | Update RecordMovementDialog for external destinations          | 4     | TODO   |
| 4.5 | Update MovementDetailSheet for external locations              | 4     | TODO   |
| 5.1 | Connected platform entity destinations                         | 5     | TODO   |
| 5.2 | Incoming arrival visibility on receiving side                  | 5     | TODO   |
| 5.3 | Preserve manual arrival flow for non-platform sources          | 5     | TODO   |


**Implementation order optimized for lowest risk and strongest conceptual clarity:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

- Phase 1 cleans naming and removes duplicated UX confusion
- Phase 2 clarifies the commercial parent-child model before deep movement expansion
- Phase 3 strengthens the operational admission control center
- Phase 4 expands movement to external real-world destinations
- Phase 5 completes the connected platform destination model using patterns already proven in the lab workflow