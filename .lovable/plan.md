# Stable Module — Unified Forensic Audit & Corrected Execution Plan

---

## 1. Executive Diagnosis

The Stable module now has **strong underlying structure** across facilities, housing, admissions, movement lifecycle, incoming arrivals, and horse profiles. The seeded data for the 5 horses is operationally coherent: branch, facility, unit, active admission, open occupancy, movement history, and denormalized horse location fields align correctly.

However, the module still has **six critical product and logic gaps**:

1. **Arrival is still modeled too narrowly** — the current movement wizard treats Arrival as a single flat “pick a horse and mark IN” flow, while the real product needs three distinct arrival models:
  - connected incoming arrival,
  - manual external arrival with lightweight horse creation,
  - existing horse lookup arrival for horses known in the system but not currently inside.
2. **Arrival eligibility is unsafe** — housed/admitted horses can still appear as valid arrival candidates, which risks duplicate occupancy and duplicate movement corruption.
3. **Movement flow is not branch-aware enough** — origin branch is still manually selected for departure/transfer even when the horse’s current branch is already known. Transfer logic is still under-expressed: same-branch transfer and cross-branch transfer are not modeled as distinct UX paths.
4. **Admission is visible but not yet dominant enough as the operational stay entity** — it exists as a tab and detail sheet, but it is still secondary in navigation and in horse-centric views. The distinction between Facilities and Admissions is structurally correct, but operational emphasis can be improved.
5. **Branch management exists in logic but is surfaced in the wrong place** — branch CRUD is effectively hidden under Movement > Locations rather than being clearly exposed as Branches management in an organizational context.
6. **Admission-to-billing linkage remains disconnected** — rate data exists, billing hooks exist, and billing_links support boarding, but there is still no admission-context invoice creation path in the UI. As a result, the financial gate is structurally present but functionally weak because no boarding invoices are being created.

Additionally, the module now clearly reveals a new high-value capability requirement:

- **manual arrival should be able to create a lightweight horse record directly from the arrival flow, and that horse profile must be visibly incomplete until completed later via the horse wizard/profile UI.**

---

## 2. What Exists Today

### 2.1 Facility / Housing Hierarchy


| Layer       | DB Table         | Current Meaning                                      | Current Status |
| ----------- | ---------------- | ---------------------------------------------------- | -------------- |
| Branch      | `branches`       | Operational branch                                   | Exists         |
| Facility    | `facility_areas` | Typed facility (barn, paddock, isolation, etc.)      | Exists         |
| Subdivision | `housing_units`  | Stall / zone / bay / etc. depending on facility type | Exists         |


Current architecture is now correctly aligned to:  
**Branch → Facility → Adaptive Subdivision**

This is already better than the earlier “Section / Unit” abstraction.

---

### 2.2 Movement Lifecycle

The movement layer now supports:

- `movement_status`
- scheduling
- dispatch confirmation
- incoming arrivals
- connected departures
- external destinations
- status badges
- movement timeline

The backend and core lifecycle structure are in much better shape than before.

---

### 2.3 Admissions

Admissions already exist as a distinct operational entity with:

- its own Housing tab,
- rich cards,
- detail sheet,
- stay rates,
- warnings,
- related movements,
- checkout flow.

This is good.  
But Admission still needs stronger surfacing and stronger billing linkage.

---

### 2.4 Horse Profile / Horse Registry

Horse profiles are now much better connected to:

- current branch,
- facility,
- unit,
- admission,
- movement timeline.

But the profile still does **not clearly surface incompleteness** for lightweight or partially filled horses.

---

### 2.5 Connected Incoming

Receiver-side incoming flow already exists:

- pending incoming arrivals,
- confirm/cancel,
- guided next-step dialog,
- admission kickoff path.

This is structurally correct and should remain a separate flow from the generic movement wizard.

---

## 3. Arrival Model — Current State vs Correct Product Model

### 3.1 Current Arrival Model

Today, Arrival inside `RecordMovementDialog.tsx` is still effectively:

- choose movement type = IN
- choose horse from existing tenant horses
- choose destination branch
- optionally choose housing
- enter details
- confirm

This means Arrival is still implicitly assumed to be:

> “an existing horse already known in the stable tenant that is now entering.”

That is too narrow.

---

### 3.2 Correct Arrival Model

Arrival must be split into **three explicit operational modes**:

#### A. Connected Incoming Arrival

This is **not** a generic movement-wizard arrival.  
It should remain handled by the dedicated Incoming Arrivals flow.

Use case:

- partner stable/clinic sends horse via platform
- receiver sees pending incoming
- receiver confirms
- local arrival is recorded
- horse becomes eligible for admission / housing

#### B. Manual External Arrival

Use case:

- horse comes from outside the platform
- horse is not registered yet
- stable user needs to receive it immediately
- the system should create a lightweight horse record directly from the arrival flow

#### C. Existing Horse Lookup Arrival

Use case:

- horse already exists in the stable tenant records
- but is not currently inside
- user wants to receive/re-admit it
- system should search/filter and prevent duplicates

---

### 3.3 Critical Product Gap

The current system collapses B and C into one flat flow and excludes A from the wizard entirely.

That is partially acceptable for A, because connected incoming should stay separate.  
But B and C **must** be separated inside the arrival wizard.

---

## 4. Arrival Eligibility & Duplication Risk

### 4.1 Current Problem

The current movement wizard uses a flat horse list from `useHorses()`.

This means horses currently:

- housed,
- admitted,
- occupying units,
- and fully inside the stable

can still appear as Arrival candidates.

That is dangerous.

---

### 4.2 Correct Arrival Eligibility Rules

#### Existing Horse Lookup Arrival

A horse is eligible only if:

- `horses.housing_unit_id IS NULL`
- no open `housing_unit_occupants` record exists
- no `boarding_admissions` with status in `('draft', 'active', 'checkout_pending')`
- no pending incoming record already exists for the same horse in the same tenant

#### Manual External Arrival

No existing horse selection is needed.  
User creates a new horse inline.

#### Connected Incoming

Handled through `incoming_horse_movements`, not through the generic IN selection list.

---

### 4.3 Correct Exclusion Rules

A horse must NOT appear in Arrival if any of the following is true:

- currently housed,
- currently actively admitted,
- already pending incoming,
- already physically inside via open occupancy.

---

### 4.4 Practical Source of Truth

For UI filtering:

- `horses.housing_unit_id` is acceptable as fast denormalized filtering.

For final operational truth:

- `housing_unit_occupants.until IS NULL` is the physical truth.
- `boarding_admissions` is the commercial truth.

---

## 5. Manual Arrival with Lightweight Horse Creation

### 5.1 Current State

This does not yet exist.

A stable operator still cannot receive a truly new horse directly from the arrival flow.

---

### 5.2 Required Target Behavior

Inside Arrival, after choosing source mode = **New Horse from Outside**, the system should:

1. show a lightweight horse intake form,
2. create the horse record,
3. record the IN movement,
4. optionally assign housing,
5. allow immediate admission initiation,
6. clearly mark the horse profile as **Incomplete**.

---

### 5.3 Minimum Lightweight Intake Fields

#### Required

- horse name
- sex

#### Recommended at intake

- approximate birth date
- passport number
- microchip
- breed
- color
- origin/source note
- arrival date
- “born inside / arrived from outside” classification

#### Deferred

- pedigree
- full physical details
- media
- full ownership
- advanced breeding data

---

### 5.4 Incomplete Profile State

A manually created horse must not look “fully complete” just because it exists.

The horse registry/profile should clearly show:

- incomplete badge,
- missing fields checklist,
- top warning card,
- CTA to complete the profile via horse wizard.

This is one of the most important UX improvements for operational trust.

---

## 6. Existing Horse Lookup Arrival

### 6.1 Current State

There is no real search-first arrival lookup inside the movement wizard.

### 6.2 Required Target

For “Existing Horse Lookup Arrival”:

- add horse search,
- reuse identity-style lookup patterns,
- filter to only horses outside the stable,
- show state hints (last location / last movement / inside vs outside),
- prevent duplicates.

---

## 7. Connected Incoming Arrival

### 7.1 What Already Works

- pending incoming records,
- confirm/cancel,
- guided next-step after confirmation,
- admission kickoff path.

### 7.2 Remaining Audit Concern

The connected incoming path must be verified end-to-end to ensure the horse becomes fully usable in the receiver tenant:

- visible in horse list,
- eligible for admission,
- visible in profile and movement views.

### 7.3 Final Product Rule

Connected incoming remains a **separate arrival channel**.  
It should not be collapsed into the generic movement-wizard Arrival flow.

---

## 8. Branch-Aware Movement Logic

### 8.1 Current Weakness

The movement flow is still too tenant-wide and too manual.

### 8.2 Correct Rule

Movement must be **branch-aware by construction**.

#### Arrival

User selects destination branch first, or branch context is clearly established before horse selection.

#### Departure

FROM branch must be auto-resolved from horse current location and shown read-only.

#### Transfer

FROM branch must be auto-resolved.  
Then transfer must explicitly branch into:

- same-branch transfer
- cross-branch transfer

---

### 8.3 Same-Branch vs Cross-Branch Transfer

#### Same-Branch Transfer

Use case:

- horse moves from stall to paddock in the same branch
- user should choose target facility/unit inside same branch
- no manual FROM/TO branch guessing

#### Cross-Branch Transfer

Use case:

- horse moves from Riyadh to Taif
- FROM auto-resolved
- user chooses TO branch
- then chooses housing/facility in target branch

The current free-text-heavy behavior is not enough.

---

## 9. Admission as Operational Entity

### 9.1 Current State

Admission already exists clearly enough as a technical entity:

- tab,
- cards,
- detail sheet,
- status,
- duration,
- rate.

### 9.2 What Still Feels Weak

It is still not emphasized enough as the **daily operational stay contract**.

### 9.3 Correct IA Direction

- keep Facilities and Admissions separate,
- keep that separation clean,
- but make Admission more operationally prominent.

Recommended:

- Admissions as default tab in Housing,
- HorseAdmissionCard promoted higher in HorseProfile,
- admission indicator inside facility occupant rows.

This does **not** mean merging Facilities and Admissions.  
It means clarifying that:

- Facilities = physical structure
- Admissions = operational stay contracts

---

## 10. Branch Management — Corrected Understanding

### 10.1 Important Correction

Branch management is **not truly absent in logic**.  
It is effectively hidden under a misleading surface:

- Movement > Locations / `LocationsManager`

So the issue is not “branch CRUD does not exist at all.”  
The issue is:

> branch CRUD is surfaced in the wrong module, wrong label, and wrong context.

### 10.2 Correct Product Fix

Expose Branches clearly as:

- **Branches**,
- under Organization Settings or an equivalent management surface,
- not buried as “Locations” inside Movement.

This is essential for onboarding real customers.

---

## 11. Admission ↔ Billing Linkage

### 11.1 Current State

- admission rate data exists,
- billing_links support boarding,
- invoice infrastructure exists,
- but no UI path creates invoices from admission context,
- therefore billing remains disconnected,
- and the financial gate remains structurally present but practically weak.

### 11.2 Correct MVP

Do **not** auto-create invoices.

Instead:

- add **Generate Invoice** button in AdmissionDetailSheet,
- reuse lab/doctor invoice-generation patterns,
- create invoice manually from admission context,
- create `billing_links` with `source_type='boarding'`,
- show linked invoices in admission detail.

This matches your desired direction and preserves operator control, especially for historical seeded admissions.

---

## 12. Arrival / Housing / Admission / Movement Relationship

### 12.1 Correct Domain Model

- **Arrival** = entry event
- **Housing** = physical placement
- **Admission** = commercial/operational stay contract
- **Movement** = event log

### 12.2 Critical Coherence Gap

Today there is risk that:

- an IN movement gets recorded via movement wizard,
- then another check-in movement is created again by admission creation.

That duplication must be addressed.

### 12.3 Correct Direction

Admission creation should be able to:

- reuse or reference the arrival movement as check-in context,
- instead of always creating another parallel check-in event.

---

## 13. Horse Registry / Horse Wizard Completeness

### 13.1 Current Strength

The horse wizard is already rich and supports detailed master data.

### 13.2 Current Gap

It is too heavy to be the only intake path.

### 13.3 Correct Product Shape

- keep full HorseWizard for complete registration/editing,
- add lightweight intake subset for manual arrival,
- then use completeness indicators to push later enrichment.

### 13.4 Born-Inside vs Arrived-From-Outside

This distinction must become explicit in the horse record model and/or operational metadata.

It is especially important for:

- foals,
- stable-origin horses,
- lifecycle storytelling,
- future reporting.

---

## 14. Seeded State Coherence

The 5 seeded horses are now coherent operationally.  
This is good because it means the main remaining problems are:

- logic gaps,
- flow gaps,
- surface gaps,  
not data corruption.

That gives a safe base for the next implementation stage.

---

## 15. Unified Execution Plan

### Phase A — Arrival Source-Model Restructuring

**Goal:** Split Arrival into:

- existing horse lookup,
- manual external arrival,  
while keeping connected incoming as its own flow.

**Files:**

- `RecordMovementDialog.tsx`

**Acceptance:**

- Arrival no longer starts as one flat horse list.
- User must explicitly choose arrival mode.

---

### Phase B — Eligibility Filtering & Duplication Prevention

**Goal:** Prevent duplicate arrivals and illogical candidate lists.

**Files:**

- `RecordMovementDialog.tsx`
- new `useEligibleHorses.ts` hook

**Acceptance:**

- horses already inside do not appear in Arrival,
- horses outside do not appear in Departure/Transfer,
- pending incoming duplicates are prevented.

---

### Phase C — Manual Arrival Lightweight Horse Creation

**Goal:** Create horse directly from arrival flow and mark profile incomplete.

**Files:**

- `RecordMovementDialog.tsx`
- horse list/card/profile components
- `HorseProfile.tsx`

**Acceptance:**

- new horse can be created inline,
- arrival completes in one operational flow,
- horse profile clearly shows incompleteness.

---

### Phase D — Existing Horse Lookup Arrival

**Goal:** Support search-first arrival for already-known horses outside the stable.

**Files:**

- `RecordMovementDialog.tsx`

**Acceptance:**

- search by name/identity,
- show state indicators,
- only eligible horses appear.

---

### Phase E — Connected Incoming Hardening

**Goal:** Verify and tighten the receiver-side connected arrival flow.

**Files:**

- `IncomingArrivals.tsx`
- `confirm_incoming_movement` RPC
- related horse visibility hooks/views

**Acceptance:**

- confirmed incoming horse becomes fully usable in receiver tenant,
- admission preselection works end-to-end.

---

### Phase F — Horse Registry / Wizard Completeness Enhancements

**Goal:** Surface incomplete horse profiles clearly and support origin-aware intake.

**Files:**

- `HorseWizard.tsx`
- `HorseProfile.tsx`
- horse list/card components

**Acceptance:**

- incomplete badge,
- warning card,
- missing-fields checklist,
- clear CTA to complete profile.

---

### Phase G — Branch / Origin / Transfer Corrections

**Goal:** Make movement branch-aware and fix transfer modeling.

**Files:**

- `RecordMovementDialog.tsx`

**Acceptance:**

- FROM auto-filled for OUT/TRANSFER,
- same-branch transfer explicitly modeled,
- cross-branch transfer explicitly modeled,
- movement no longer feels branch-agnostic.

---

### Phase H — Admission / Billing / Visibility Coherence

**Goal:** Strengthen Admission as the operational stay entity and connect it to finance.

**Files:**

- `DashboardHousing.tsx`
- `HorseProfile.tsx`
- `UnitsManager.tsx`
- new `CreateInvoiceFromAdmission.tsx`
- `AdmissionDetailSheet.tsx`

**Acceptance:**

- Admission more visible and central,
- Generate Invoice available from admission context,
- linked invoices displayed,
- boarding billing_links start being created properly.

---

## 16. Final Verdict

### Correct

- facility hierarchy
- movement lifecycle foundation
- incoming arrivals architecture
- seeded horse data coherence
- horse profile structural richness
- historical intake support foundations
- connected filtering foundations

### Broken / Incomplete

- arrival source-model
- arrival eligibility filtering
- manual horse creation from arrival
- branch-aware movement UX
- transfer expression
- admission-to-billing linkage surface
- branch management surfacing
- horse profile incompleteness signaling

### Fix First

1. Arrival source model
2. Eligibility filtering
3. Origin/branch-aware movement
4. Manual arrival + incomplete horse profile
5. Admission-to-invoice action
6. Branch management surfacing