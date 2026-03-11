```
# Stable Housing / Movement / Connected Destination / Finance Forensic Audit

## 1. Executive Diagnosis

The stable module has a structurally sound foundation, but its current implementation still reflects an older operational mental model that is no longer the one we want to optimize for.

The **corrected target mental model** is:

```text
Branch
  └── Facilities (multiple, mixed types per branch)
       ├── Barn / Stable Block
       ├── Paddock
       ├── Arena
       ├── Isolation
       ├── Pasture
       ├── Wash Area
       ├── Round Pen
       ├── Storage
       └── Other
            └── Internal structure adapts by facility type
```

This means a single branch can contain **multiple facilities of different types at the same time**. The facility is the true operational middle layer. Inside each facility, the internal structure varies according to the facility’s type. Some facilities require subdivisions; some do not.

The current system therefore has **seven major gaps**:

1. **Conceptual inversion**: The current schema is `Branch → facility_areas → housing_units`, but the product mental model we want is **Branch → Facilities → adaptive internal structure**. Today the middle layer is still a generic Section-like object, while the lower layer carries too much meaning.
2. **Facilities are not yet typed**: `facility_areas` has no `facility_type`, so the UI cannot adapt behavior or terminology based on whether the facility is a barn, paddock, arena, isolation facility, etc.
3. **Movement is instant**: No scheduling, dispatch, or lifecycle. Housing clears the moment a departure is recorded, even if the horse is still physically present.
4. **Finance gate is display-only**: `CheckoutFinancialReview` shows balances but never blocks checkout or dispatch. No override recording.
5. **Zero horse-domain notifications**: Despite a mature trigger/fan-out infrastructure, no triggers exist for admissions, movements, dispatches, or incoming arrivals.
6. **Connected receiver confirmation is a no-op**: `confirm_incoming_movement` just sets `status = 'completed'` — it does NOT create a local arrival movement or guide the receiving side into the next operational step.
7. **Connected destination filtering is too loose**: `lab` is incorrectly included in horse movement destination types, and null entity subtypes pass the filter.

Additionally:

- Mobile bottom nav is missing the Incoming tab
- Housing is still presented too flat in navigation
- Horse-domain events should appear not only in notifications but also inside the **unified horse record / horse profile timeline**

---

## 2. What Exists Today

### 2.1 Database Schema Truth

**Housing hierarchy:**

- `branches` — org branches with name, city, is_active
- `facility_areas` — Branch child. Columns: tenant_id, branch_id, name, name_ar, code, is_active, is_demo. **No** `facility_type` **column exists**
- `housing_units` — Area child. Columns: tenant_id, branch_id, stable_id, area_id, code, name, name_ar, unit_type (text, stored as enum `internal_unit_type`), occupancy (single/group), capacity, status, is_active, is_demo, notes
- `housing_unit_occupants` — unit_id, horse_id, since, until (null = active)

**Movements:**

- `horse_movements` — movement_type (in/out/transfer), destination_type (internal/external/connected), from/to_location_id (branches), from/to_area_id, from/to_unit_id, from/to_external_location_id, connected_tenant_id, connected_movement_id, movement_at, recorded_by, reason, notes
- `incoming_horse_movements` — tenant_id, sender_tenant_id, sender_movement_id, horse_id/name/avatar (denormalized), status (pending/completed/cancelled), scheduled_at, completed_at/by, cancelled_at/by, local_movement_id, reason, notes
- `external_locations` — name, city, location_type, contact info, usage_count

**Admissions:**

- `boarding_admissions` — status (draft/active/checkout_pending/checked_out/cancelled), horse_id, client_id, branch_id, area_id, unit_id, plan_id, rates, billing_cycle, checkin_movement_id, checkout_movement_id, admission_checks (JSONB), balance_cleared (boolean, never actually enforced)
- `boarding_status_history` — admission_id, from_status, to_status, changed_by, reason

**Finance:**

- `invoices` — full invoice with status, total_amount, line items
- `invoice_items` — line items
- `ledger_entries` — entry_type (invoice/payment/credit/adjustment), signed amounts, reference_type/reference_id
- `billing_links` — source_type, source_id, invoice_id, link_kind (deposit/final/refund/credit_note), amount
- `clients` — credit_limit field
- `v_customer_ledger_balances` — view deriving balance per client

**Notifications:**

- `notifications` table — user_id, tenant_id, event_type, title, body, entity_type, entity_id, is_read
- `_notify_tenant_members()` — helper function for fan-out to tenant members with 10s dedup window
- Existing triggers: connection events, lab_request events. **Zero horse/boarding triggers**

**Services:**

- `tenant_services` — name, description, price, category, is_active. **No service_kind/type discriminator**
- `stable_service_plans` — service_id FK, plan_type, billing_cycle, base_price, includes (JSONB)

### 2.2 RPCs


| RPC                                  | What it does                                                                                           | Gap                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `record_horse_movement_with_housing` | Creates movement, clears/updates housing, updates horse location. All instant.                         | No scheduling support. Clears housing too early for future-dated departures. |
| `record_connected_movement`          | Validates connection, clears housing, creates sender movement + receiver incoming record. All instant. | Same — instant housing clear.                                                |
| `confirm_incoming_movement`          | Sets incoming status to `completed`.                                                                   | Does NOT create local arrival movement. Does NOT guide admission start.      |
| `cancel_incoming_movement`           | Sets incoming status to `cancelled`.                                                                   | Correct for MVP.                                                             |


### 2.3 Hooks


| Hook                       | Status                                                    | Gap                                      |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `useBoardingAdmissions`    | Complete — CRUD, checkout two-step, billing link creation | No financial gate logic                  |
| `useAdmissionFinancials`   | Complete — admission-scoped + client ledger balance       | Returns data but nothing blocks on it    |
| `useHorseMovements`        | Complete — query + record via RPC                         | No movement lifecycle awareness          |
| `useConnectedMovement`     | Complete — calls `record_connected_movement` RPC          | No scheduling                            |
| `useConnectedDestinations` | Complete — fetches accepted B2B connections               | Includes `lab`, null subtype passthrough |
| `useIncomingMovements`     | Complete — query + confirm/cancel                         | Confirm is status-only                   |
| `useExternalLocations`     | Complete                                                  | —                                        |
| `useFacilityAreas`         | Complete                                                  | No `facility_type` field                 |
| `useHousingUnits`          | Complete                                                  | No adaptive facility-aware shaping       |
| `useStableServicePlans`    | Complete                                                  | —                                        |


### 2.4 UI Components


| Component                 | Status                                                       | Gap                                                 |
| ------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `DashboardHousing`        | 5 tabs: units, areas, admissions, movement, incoming         | Tab naming still reflects old model                 |
| `UnitsManager`            | Branch+Area filter, unit creation dialog with type/occupancy | Not facility-type-adaptive                          |
| `AreasManager`            | Branch filter, create/edit/toggle                            | Needs to become FacilitiesManager                   |
| `AdmissionWizard`         | 6-step wizard                                                | Working correctly                                   |
| `AdmissionDetailSheet`    | Inline editing, warnings, related movements                  | No financial gate                                   |
| `CheckoutDialog`          | Two-step (initiate → confirm)                                | Shows financial review but never blocks             |
| `CheckoutFinancialReview` | Displays admission + client balance                          | Display-only                                        |
| `RecordMovementDialog`    | Internal/external/connected                                  | No scheduling / dispatch lifecycle                  |
| `IncomingArrivals`        | Filter by status, confirm/cancel buttons                     | Confirm does nothing operationally on receiver side |
| `HousingBottomNav`        | 4 tabs                                                       | Missing Incoming                                    |
| Sidebar                   | Housing is flat `NavItem`                                    | Should become a stronger grouped entry              |


### 2.5 Connected Destination Logic

**File:** `src/hooks/movement/useConnectedDestinations.ts`

```
const ALLOWED_DESTINATION_TYPES = ['stable', 'clinic', 'lab'];
```

- Queries `connections` where `connection_type = 'b2b'` and `status = 'accepted'`
- Resolves partner names via `get_connection_party_names` RPC
- **Bug 1**: `lab` is included — horses do not physically move to labs
- **Bug 2**: If `tenantType` is null, the entity currently passes the filter
- **Why freelance/independent doesn't appear**: They use profile-based professional links, not tenant-based B2B partner entities. Correct behavior.

---

## 3. Current Schema / UI / RPC Truth Map

### 3.1 Hierarchy Mapping to Corrected Product Concept


| Layer | Current DB       | Current UI Label | Corrected Product Concept                            | Gap                                                                 |
| ----- | ---------------- | ---------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 1     | `branches`       | Branch / فرع     | Branch                                               | None                                                                |
| 2     | `facility_areas` | Section / القسم  | **Facility / مرفق**                                  | Missing `facility_type`; UI meaning still generic                   |
| 3     | `housing_units`  | Unit             | **Adaptive internal structure inside each facility** | Current layer is too generic and not guided by parent facility type |


### 3.2 Corrected Operational Interpretation

The corrected model is **not**:

```
Branch
  └── one facility type
       └── one repeated unit model
```

The corrected model is:

```
Branch
  ├── Facility A (Barn)
  │    └── internal stalls / boxes / rooms
  ├── Facility B (Paddock)
  │    └── zones / sections / partitions
  ├── Facility C (Arena)
  │    └── may have no classic subdivisions
  ├── Facility D (Isolation)
  │    └── isolation rooms / bays
  ├── Facility E (Wash Area)
  │    └── may have no subdivisions
  └── Facility F (Storage)
       └── shelves / bins / sections
```

**Key finding**: The desired product model can be achieved with **schema-additive changes only**:

1. Add `facility_type` to `facility_areas`
2. Reframe `housing_units` as the adaptive internal layer
3. Make UI labels and forms react to parent facility type
4. Keep the backend structure stable while changing the frontend mental model to match the user’s reality

---

## 4. Confirmed Reusable Strengths

4.1 **Admission lifecycle** (draft → active → checkout_pending → checked_out) — well-designed state machine  
  
4.2 **Admission checks framework** — extensible pass/warning/overridable/blocking system  
  
4.3 **Finance infrastructure** — invoices, ledger, billing_links, client balances, credit limits all working  
  
4.4 `_notify_tenant_members` **helper** — battle-tested fan-out with dedup, directly reusable for horse events  
  
4.5 **Realtime sync** — `useTenantRealtimeSync` already covers boarding_admissions, horse_movements, incoming_horse_movements, housing_units, etc.  
  
4.6 **Permission system** — `has_permission` RPC + `usePermissions` hook mature and extensible  
  
4.7 **Connected movement RPC** — atomic sender+receiver record creation pattern is correct  
  
4.8 **B2B connection discovery** — `get_connection_party_names` + connection filtering is reusable  
  
4.9 `useAdmissionFinancials` — already computes exactly the right data for financial gates  
  
4.10 **Unified horse record context** — horse-domain operational events can and should surface here in addition to notifications

---

## 5. Structural Problems

### 5.1 CRITICAL

5.1.1 **Movement is instant** — No `movement_status` column. `record_horse_movement_with_housing` and `record_connected_movement` both clear housing immediately. A scheduled departure is impossible.

5.1.2 `confirm_incoming_movement` **is a status-only update** — Does not create local `in` movement, does not guide the receiver into the next operational step, and does not turn the receiver side into a real workflow.

5.1.3 **CheckoutDialog has no financial gate** — `CheckoutFinancialReview` renders balance info but checkout button is never disabled based on it. No override dialog exists.

5.1.4 `facility_areas` **has no** `facility_type` — Cannot support facility-type-driven UX, language, or adaptive internal structure.

### 5.2 HIGH

5.2.1 `lab` **in** `ALLOWED_DESTINATION_TYPES` — Domain-incorrect for physical horse movement.

5.2.2 **Null entity_subtype passes filter** — Unknown entity types appear as horse destinations.

5.2.3 **Zero horse-domain notification triggers** — No triggers on boarding_admissions, horse_movements, or incoming_horse_movements.

5.2.4 **Mobile bottom nav missing Incoming tab**.

5.2.5 **Current internal layer is not adaptive** — the UI still treats internal structure too uniformly regardless of facility type.

### 5.3 MEDIUM

5.3.1 **Housing is a flat sidebar NavItem** — weak discoverability for a rich operational module.

5.3.2 `tenant_services` **has no** `service_kind` **discriminator** — no future-proofing for goods/items.

5.3.3 **UnitsManager creation dialog is static** — does not react sufficiently to the facility type selected above it.

### 5.4 LOW

5.4.1 Horse-domain notifications are absent from the **unified horse record timeline**, not only from the notifications center.

---

## 6. Corrected Product Model

```
Branch (فرع)
  ├── Facility (مرفق) — typed
  │    ├── Barn / Stable Block
  │    │    └── internal stalls / boxes / rooms
  │    ├── Paddock
  │    │    └── zones / sections / partitions
  │    ├── Arena
  │    │    └── direct operational properties, may have no subdivisions
  │    ├── Isolation
  │    │    └── isolation rooms / bays
  │    ├── Pasture
  │    │    └── zones / sections
  │    ├── Wash Area
  │    │    └── direct operational properties
  │    ├── Round Pen
  │    │    └── direct operational properties
  │    ├── Storage
  │    │    └── sections / shelves / bins
  │    └── Other
  └── Operational records linked to horse lifecycle
       ├── Admissions
       ├── Arrivals & Departures
       ├── Incoming
       ├── Finance gates
       └── Horse timeline visibility
```

**Important freeze**:

- A branch may contain **multiple facilities of different types**
- Facility is the middle layer
- Internal structure is adaptive
- Some facility types have subdivisions
- Some facility types are directly operable without subdivisions

---

## 7. Recommended Naming Model


| Concept                     | EN                             | AR                   |
| --------------------------- | ------------------------------ | -------------------- |
| Branch                      | Branch                         | فرع                  |
| Facility (middle layer)     | Facility                       | مرفق                 |
| Internal adaptive structure | Adaptive by type               | تكيفي حسب النوع      |
| Barn subdivision            | Stall / Box / Room             | إسطبل / صندوق / غرفة |
| Paddock subdivision         | Zone / Section / Partition     | منطقة / قسم / تقسيم  |
| Isolation subdivision       | Isolation Room / Isolation Bay | غرفة عزل / حجرة عزل  |
| Storage subdivision         | Section / Shelf / Bin          | قسم / رف / صندوق     |


### Facility types


| EN        | AR                  |
| --------- | ------------------- |
| Barn      | حظيرة / مبنى إسطبل  |
| Paddock   | بادوك / ساحة مفتوحة |
| Arena     | ميدان               |
| Isolation | عزل                 |
| Pasture   | مرعى                |
| Wash Area | منطقة غسيل          |
| Round Pen | حلبة دائرية         |
| Storage   | مستودع              |
| Other     | أخرى                |


---

## 8. Facility / Housing Architecture Recommendation

### 8.1 Schema Changes (Additive)

**8.1.1 Add** `facility_type` **to** `facility_areas`**:**

```
ALTER TABLE facility_areas ADD COLUMN facility_type text NOT NULL DEFAULT 'barn';
```

Values:

- `barn`
- `paddock`
- `arena`
- `isolation`
- `pasture`
- `wash_area`
- `round_pen`
- `storage`
- `other`

**8.1.2 Keep** `housing_units.unit_type` **as flexible text behavior**  
  
No risky structural rewrite needed. The internal layer becomes adaptive through:

- parent facility type
- UI allowlists
- internal config mappings

**8.1.3 No table inversion required**  
  
We do **not** need to physically reverse tables.  
  
We only need to:

- reinterpret `facility_areas` as Facilities
- make `housing_units` adaptive internal structure
- relabel the UI
- make forms facility-aware

### 8.2 UI Changes

- Rename "Section" → "Facility"
- AreasManager becomes FacilitiesManager
- Add facility_type selector in create/edit
- Show type badge on each facility card
- UnitsManager adapts labels and options based on selected parent facility type
- For types like `arena`, `wash_area`, `round_pen`, the facility itself can be directly operational without requiring classical child units

### 8.3 Subdivision Config (Code-level)

```
const SUBDIVISION_CONFIG: Record<string, { label: string; labelAr: string; types: string[]; supportsChildren: boolean }> = {
  barn:      { label: 'Stall', labelAr: 'إسطبل', types: ['stall', 'box', 'room'], supportsChildren: true },
  paddock:   { label: 'Zone', labelAr: 'منطقة', types: ['zone', 'section', 'partition'], supportsChildren: true },
  isolation: { label: 'Bay', labelAr: 'حجرة عزل', types: ['isolation_room', 'isolation_bay'], supportsChildren: true },
  pasture:   { label: 'Zone', labelAr: 'منطقة', types: ['zone', 'section'], supportsChildren: true },
  storage:   { label: 'Section', labelAr: 'قسم', types: ['section', 'shelf', 'bin'], supportsChildren: true },
  arena:     { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
  wash_area: { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
  round_pen: { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
  other:     { label: 'Subdivision', labelAr: 'تقسيم', types: ['other'], supportsChildren: true },
};
```

### 8.4 Navigation logic correction

The clean operational information architecture is:

```
Housing
  ├── Facilities
  ├── Admissions
  ├── Arrivals & Departures
  └── Incoming
```

Then **inside Facilities**:

- user browses facilities
- enters a facility
- sees or configures its internal structure

This is better than exposing “Units” as a parallel top-level primary navigation entry.

---

## 9. Movement Lifecycle Recommendation

### 9.1 Schema

Add to `horse_movements`:

```
ALTER TABLE horse_movements ADD COLUMN movement_status text NOT NULL DEFAULT 'completed';
ALTER TABLE horse_movements ADD COLUMN scheduled_at timestamptz;
ALTER TABLE horse_movements ADD COLUMN dispatched_at timestamptz;
ALTER TABLE horse_movements ADD COLUMN completed_at timestamptz;
```

Default `completed` preserves all existing rows.

### 9.2 Lifecycle

```
[Record Departure]
    ├── Immediate → movement_status = 'dispatched', housing cleared instantly
    └── Scheduled → movement_status = 'scheduled', housing NOT cleared
                        │
                  [Confirm Dispatch]
                        │
                  movement_status = 'dispatched', housing cleared
                        │
                  [Arrival confirmed / auto] → movement_status = 'completed'

Cancel at any pre-dispatch point → movement_status = 'cancelled'
```

### 9.3 Operational rule

- **Scheduling is not physical departure**
- Horse remains in housing until dispatch
- Charges, care, feeding, and operational state may continue until dispatch timestamp
- This is essential for logic, finance, and UX clarity

### 9.4 RPC Changes

- `record_horse_movement_with_housing` — add `p_movement_status`; if `scheduled`, skip housing clear and location update
- `dispatch_horse_movement` — new RPC; transitions scheduled → dispatched
- `record_connected_movement` — add `p_movement_status`; if scheduled, defer housing clear and incoming creation
- `confirm_incoming_movement` — must create local `in` movement and return data for next-step workflow

### 9.5 Receiver-side logic

When receiver confirms incoming movement:

1. create local arrival movement
2. mark incoming record completed
3. optionally prompt:
  - record arrival only
  - start admission now
  - defer admission to later

This keeps the MVP operationally clear without losing logic.

---

## 10. Connected Destination Recommendation

### 10.1 Eligibility Fix

```
const ALLOWED_DESTINATION_TYPES = ['stable', 'clinic'];
```

### 10.2 Null subtype Fix

```
if (!tenantType || !ALLOWED_DESTINATION_TYPES.includes(tenantType)) continue;
```

### 10.3 Domain Correctness


| Entity Type | Horse Movement Destination? | Why                               |
| ----------- | --------------------------- | --------------------------------- |
| stable      | YES                         | Horse physically moves there      |
| clinic      | YES                         | Horse physically goes there       |
| lab         | NO                          | Lab receives samples, not horses  |
| freelance   | NO                          | Not a stable physical destination |


### 10.4 Receiver confirmation enhancement

`confirm_incoming_movement` must:

1. create local `in` movement
2. set `local_movement_id`
3. update sender-side lifecycle as needed
4. return response allowing UI to guide next step cleanly

---

## 11. Finance Gate Recommendation

### 11.1 What Already Exists

- `useAdmissionFinancials`
- `CheckoutFinancialReview`
- `admissionChecks.ts`
- `boarding.checkout.override_balance` permission exists
- invoice / ledger / customer balance infrastructure is mature

### 11.2 What Must Change

#### 11.2.1 Checkout gate

- Staff: blocked if balance exists
- Manager / Owner: warned, can override
- Override must be recorded, not implicit

#### 11.2.2 Dispatch gate

Same logic must apply to **dispatch**, not only checkout.

#### 11.2.3 Scheduling vs dispatch

Staff may schedule, but financial logic must gate **dispatch**, because dispatch is the physical irreversible step.

### 11.3 Override recording

Store in admission checks / movement-linked operational metadata:

- overridden_by
- overridden_at
- outstanding amount at time of override
- reason / confirmation marker

### 11.4 Suggested hook

Create `useFinancialGate` wrapper around existing finance hooks and permission checks.

---

## 12. Notifications Recommendation

### 12.1 Existing infrastructure is sufficient

Use:

- `notifications`
- `_notify_tenant_members`
- existing push fan-out pattern
- dedup window

### 12.2 Required horse-domain triggers


| Trigger                          | Table                     | Event                        |
| -------------------------------- | ------------------------- | ---------------------------- |
| `trg_notify_admission_activated` | boarding_admissions       | status → active              |
| `trg_notify_checkout_initiated`  | boarding_admissions       | status → checkout_pending    |
| `trg_notify_checkout_completed`  | boarding_admissions       | status → checked_out         |
| `trg_notify_movement_scheduled`  | horse_movements           | movement_status = scheduled  |
| `trg_notify_movement_dispatched` | horse_movements           | movement_status → dispatched |
| `trg_notify_incoming_pending`    | incoming_horse_movements  | insert pending               |
| `trg_notify_incoming_confirmed`  | incoming_horse_movements  | status → completed           |
| `trg_notify_financial_block`     | dispatch / checkout logic | blocked by finance           |


### 12.3 Unified horse record visibility

Horse-domain events should appear in:

1. notifications center
2. unified horse file / horse profile timeline

This includes:

- admissions
- movements
- dispatch
- incoming confirmation
- finance blocks / overrides (where appropriate)

---

## 13. Navigation / IA Recommendation

### 13.1 Sidebar

Promote Housing to a NavGroup:

```
🏠 Housing
  ├── Facilities
  ├── Admissions
  ├── Arrivals & Departures
  └── Incoming
```

### 13.2 Inside Facilities

Facilities becomes the structural entry:

- list facilities
- open one facility
- manage internal adaptive structure there

### 13.3 Mobile bottom nav

Recommended 4 tabs:

- Facilities
- Admissions
- Movement
- Incoming

This is cleaner than exposing too many parallel surface items.

### 13.4 Active state

Keep `?tab=` routing, but update active-state logic to respect query params.

---

## 14. Services / Plans / Future Product Foundation

### 14.1 Current State

- `tenant_services` — flat catalog
- `stable_service_plans` — linked structured pricing
- admissions consume plans correctly

### 14.2 Recommendation

Add:

```
ALTER TABLE tenant_services ADD COLUMN service_kind text NOT NULL DEFAULT 'service';
```

Values:

- `service`
- `item` (future)

### 14.3 Scope boundary

Full inventory remains out of scope for now.  
  
This column is simply a low-risk future-proofing step.

---

## 15. Exact Low-Risk Implementation Plan

### Phase A: Facility Type + Housing Relabeling

**Risk: LOW**

A.1 Add `facility_type` to `facility_areas`  
  
A.2 Reframe `facility_areas` as Facilities in UI  
  
A.3 Update `useFacilityAreas` hook  
  
A.4 Rename AreasManager → FacilitiesManager  
  
A.5 Make UnitsManager adaptive by parent facility type  
  
A.6 Update i18n: Section → Facility  
  
A.7 Update DashboardHousing navigation so Facilities is the primary structural entry  
  
A.8 Make facility detail view the place where internal subdivisions are managed

### Phase B: Connected Destination Fix

**Risk: LOW**

B.1 Remove `lab` from allowed destination types  
  
B.2 Exclude null subtype entities  
  
B.3 Keep freelance/professional profiles excluded from horse destinations

### Phase C: Movement Lifecycle

**Risk: MEDIUM**

C.1 Add lifecycle columns to `horse_movements`  
  
C.2 Update `record_horse_movement_with_housing` to support scheduled vs dispatched  
  
C.3 Create `dispatch_horse_movement` RPC  
  
C.4 Update `record_connected_movement` to support scheduling  
  
C.5 Update `confirm_incoming_movement` to create local arrival movement  
  
C.6 Update movement hooks and interfaces  
  
C.7 Update RecordMovementDialog with schedule-for-later support  
  
C.8 Add dispatch UI in movement components  
  
C.9 Add `movement.dispatch.confirm` permission

### Phase D: Financial Gate

**Risk: LOW**

D.1 Create `useFinancialGate`  
  
D.2 Apply to CheckoutDialog  
  
D.3 Apply to dispatch confirmation  
  
D.4 Record overrides properly  
  
D.5 Keep staff allowed to schedule, but blocked from dispatch when finance blocks apply

### Phase E: Notifications

**Risk: LOW**

E.1 Admission notification triggers  
  
E.2 Movement notification triggers  
  
E.3 Incoming notification triggers  
  
E.4 Add i18n strings  
  
E.5 Surface relevant events inside horse profile timeline

### Phase F: Navigation Restructure

**Risk: LOW**

F.1 Promote Housing to NavGroup  
  
F.2 Update bottom nav  
  
F.3 Update active-state handling  
  
F.4 Align labels with the corrected model

### Phase G: Services Future-Proofing

**Risk: VERY LOW**

G.1 Add `service_kind` to `tenant_services`

---

## 16. Final Checklist

### Facility Model

- 16.1 Branch can contain multiple facilities of mixed types: **TO IMPLEMENT IN PRODUCT MODEL / UI**
- 16.2 `facility_type` column on `facility_areas`: **TODO**
- 16.3 Section → Facility relabeling: **TODO**
- 16.4 Facilities-first navigation: **TODO**
- 16.5 Adaptive internal structure by facility type: **TODO**
- 16.6 Facility types with optional subdivisions: **TODO**

### Movement Lifecycle

- 16.7 `movement_status` column: **TODO**
- 16.8 Scheduled departure support: **TODO**
- 16.9 Dispatch confirmation RPC: **TODO**
- 16.10 Dispatch UI: **TODO**
- 16.11 Housing cleared only on dispatch: **TODO**
- 16.12 Receiver confirmation creates local movement: **TODO**

### Connected Destinations

- 16.13 Remove `lab` from horse destinations: **TODO**
- 16.14 Fix null subtype passthrough: **TODO**
- 16.15 Freelance practitioners excluded: **DONE**
- 16.16 Receiver-side flow becomes real operational flow: **TODO**

### Finance Gate

- 16.17 Financial gate hook: **TODO**
- 16.18 Checkout blocking/override: **TODO**
- 16.19 Dispatch financial gate: **TODO**
- 16.20 Override recording: **TODO**
- 16.21 Staff can schedule but not dispatch when blocked: **TODO**

### Notifications

- 16.22 Admission triggers: **TODO**
- 16.23 Movement triggers: **TODO**
- 16.24 Incoming triggers: **TODO**
- 16.25 Horse unified record visibility: **TODO**

### Navigation

- 16.26 Housing as NavGroup: **TODO**
- 16.27 Mobile bottom nav includes Incoming: **TODO**
- 16.28 Facilities becomes primary structural entry: **TODO**

### Services

- 16.29 `service_kind` discriminator: **TODO**

### Existing Working Strengths

- 16.30 Admission lifecycle: **DONE**
- 16.31 Admission wizard: **DONE**
- 16.32 Admission checks base framework: **DONE**
- 16.33 Billing links infrastructure: **DONE**
- 16.34 Finance infrastructure: **DONE**
- 16.35 Connected movement sender-side RPC: **DONE**
- 16.36 Incoming horse movements table + RLS: **DONE**
- 16.37 Notification infrastructure: **DONE**
- 16.38 Realtime sync: **DONE**
- 16.39 External locations table + CRUD: **DONE**

---

## Most Important Decisions to Freeze Before Execution

1. **Branch contains multiple Facilities of different types**
2. **Facility / مرفق is the middle operational layer**
3. **Internal structure is adaptive by facility type**
4. **Some facility types may have no subdivisions**
5. **Lab must be excluded from horse movement destinations**
6. **Staff may schedule, but dispatch is financially gated**
7. **Receiver confirmation must create a real local arrival movement**
8. **Receiver should then be guided into the next step (arrival-only vs start admission)**
9. **Horse-domain events must appear both in notifications and in the unified horse record**
10. **Facilities should become the primary structural navigation entry under Housing**

---

## Lowest-Risk Execution Order

**A → B → C → D → E → F → G**

1. **Phase A** — fixes the product mental model and UI language
2. **Phase B** — corrects domain bugs in connected destinations
3. **Phase C** — introduces the true movement lifecycle
4. **Phase D** — adds operational financial control
5. **Phase E** — adds visibility and event awareness
6. **Phase F** — aligns navigation with the corrected UX
7. **Phase G** — future-proofs services/products with one additive column