<!--
id: DHB-DOC08
title: Documentation 8 — Housing & Facilities Workstream
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`08-housing-facilities-workstream.txt`)
source-sha256: 00c88fa1b8474d7ba32b75b396dcf3a6a421602b18fa981d2d154f88736849d3
-->

# Documentation 8 — Housing & Facilities Workstream

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/08-housing-facilities-workstream.txt`](../documentation-01-13/raw/08-housing-facilities-workstream.txt)
> **Source SHA-256:** `00c88fa1b8474d7ba32b75b396dcf3a6a421602b18fa981d2d154f88736849d3`

```text


# Documentation 8

## Housing & Facilities Workstream — Post-Documentation 7 Evolution

---

## 1. Documentation Objective

### 1.1
This deliverable is **Documentation 8**.

### 1.2
Documentation 7 was used as the official baseline reference.

### 1.3
This document covers all significant work completed after Documentation 7, up to the current completed point. The scope encompasses the full Housing & Facilities workstream evolution — from weak generic facility behavior to a type-driven, operationally truthful facility management system with distinct rendering, creation, and editing models for each facility family.

### 1.4
**Phase 1 is complete.** Phase 2 (entrance-aware numbering, facility-level activity logs, bulk renumbering, advanced zone management, scheduling integration, etc.) remains future work and has not been implemented.

---

## 2. Baseline Inherited from Documentation 7

### 2.1
Documentation 7 captured the platform state after the View Switcher completion pass, Table contract enforcement, and BilingualName standardization rollout. The Housing module at that point had:
- AdmissionsList with functional Table mode and BilingualName.
- BilingualName deployed to AdmissionWizard.
- A basic Housing tab structure existed, but the Facilities layer was structurally undeveloped.

### 2.2
At the end of Documentation 7, the Housing module was compliant at the listing level (Admissions), but the Facilities management surface — facility creation, facility display, facility editing, and facility-type-aware behavior — was either minimal, generic, or not yet implemented as a meaningful operational surface.

### 2.3
Unresolved at the end of Documentation 7:
- No standardized 4-tab Housing Information Architecture.
- No type-driven facility creation flow.
- No inline operational facility surfaces.
- No room-based facility model with preview, numbering, or side semantics.
- No open-area facility model with environmental attributes.
- No activity/service facility model with spec-driven rendering.
- No facility taxonomy enforcement.

### 2.4
Documentation 7 focused on platform-wide UX workstreams (View Switcher, Table Contract, BilingualName). Documentation 8 focuses exclusively on the Housing & Facilities workstream that was built after those foundations.

---

## 3. High-Level Evolution After Documentation 7

### 3.1
The major shift was the transformation of Housing from a flat, listing-only module into a structured, multi-layered operational system with:
- A standardized 4-tab Information Architecture (Branches → Facilities → Admissions → Arrivals & Departures).
- Branches as a first-class operational surface.
- Facilities as an inline, type-aware management surface.
- Three distinct facility families with dedicated creation, display, and editing models.

### 3.2
The Housing/Facilities direction evolved through distinct phases:
1. **Branches establishment** — Branches became the primary command center and location index.
2. **Facilities inline surface** — Facilities moved from deep-sheet navigation to inline operational cards.
3. **Type-driven facility modeling** — The 8-type taxonomy was enforced, and each facility family received its own creation, display, and editing logic.
4. **Room-based enrichment** — Two-sided previews, side semantics, start-side numbering, room exceptions, and occupied-room warnings.
5. **Open-area enrichment** — Environmental attributes, capacity semantics, horse visibility.
6. **Activity/service enrichment** — Spec-driven metadata, ActivityContent surface.

### 3.3
Major implementation milestones completed:
- Standardized 4-tab IA with sidebar alignment.
- Branch creation, editing, and in-place expansion.
- Type-driven CreateFacilityDialog with 2-phase flow and 4×2 visual type selector.
- Inline FacilitySection rendering with type-aware content routing.
- Room-based two-sided preview with Side A/Side B labels and start-side toggle.
- OpenAreaContent with capacity badges, environmental indicators, and horse roster.
- ActivityContent with spec-driven badges for dimensions, footing, covered status, wash points.
- Edit parity across all facility families.
- Two database migrations adding `area_size`, `shade`, `has_water`, and `metadata` columns.

### 3.4
The work moved from generic "list facilities" behavior into a structured product where each facility type has purposeful creation fields, meaningful post-creation display, and correct operational semantics — housing types show occupancy grids, open areas show advisory capacity with horse rosters, and activity types show specs and readiness.

---

## 4. Branches Workstream Progress After Documentation 7

### 4.1
Branches were established as the first tab in the Housing 4-tab IA. Branch creation, bilingual naming, and management dialogs were implemented.

### 4.2
Branches became the primary operational command center — the location index from which all downstream facility management originates. Each branch acts as a physical site that contains facilities.

### 4.3
The shift toward in-place branch expansion was implemented: clicking a branch expands it inline to show its facilities, rather than navigating to a separate page. The FacilitiesManager component accepts a `lockedBranchId` prop to scope facilities to a specific branch.

### 4.4
Major UX changes completed:
- Branch selector in facility creation and management.
- Branch-scoped facility filtering.
- Branch-level context preserved throughout the facility management flow.
- Bilingual branch name display using the BilingualName component.

### 4.5
Final state: Branches are stable as the first-class location index. They support creation, editing, bilingual display, and serve as the scoping mechanism for all facility operations.

---

## 5. Branches Compliance, Integrity, and Naming Refinements

### 5.1
Bilingual naming was enforced using the platform-standard BilingualName component. Branch names support English and Arabic with proper RTL rendering.

### 5.2
The settled bilingual naming rule: primary language name is always shown; secondary language name appears in parentheses below in lighter text. Arabic text receives `dir="rtl"` attribute. This rule applies consistently across branches, facilities, and horse names within the Housing module.

### 5.3
Translation fixes were applied across all Housing surfaces. Dialog titles, descriptions, button labels, and field labels were translated in both `en.ts` and `ar.ts`. No raw translation keys remain visible in the Housing flow.

### 5.4
Branch-level metrics (facility count per branch, occupancy summaries) were clarified to show meaningful operational data rather than generic counts.

### 5.5
Branches reached stable state before focus shifted to the Facilities layer. The Branches architecture is settled and must not be reopened.

---

## 6. Facilities Layer Evolution After Documentation 7

### 6.1
The Facilities layer evolved from a basic listing into an inline operational surface. Each facility renders as a self-contained card (`FacilitySection`) with type-aware content, summary headers, and management actions.

### 6.2
The transition from deep-sheet behavior to inline visibility was achieved by:
- `FacilitySection` rendering each facility as an expandable/collapsible card directly on the Facilities tab.
- `useInlineFacilityUnits` hook bulk-fetching all units and occupants for visible facilities in a single request, optimizing performance.
- Eliminating the need to open separate sheets or pages to see facility details.

### 6.3
Better facility visibility was introduced through:
- Type-specific icons in facility headers.
- Account-aware type labels (Stall Block vs Ward depending on tenant type).
- Occupancy fractions in headers for housing types.
- Environmental attribute badges for open areas.
- Spec badges for activity/service types.
- Color-coded unit grids for room-based facilities.

### 6.4
The Facilities layer became meaningful by showing operational truth directly: which rooms are occupied, how many horses are in a paddock, what the arena dimensions are — all visible without secondary navigation.

### 6.5
Final state before type-specific focus: Facilities render inline with type-aware routing. The rendering logic in `FacilitySection` routes to `OpenAreaContent` for paddock/pasture, `ActivityContent` for arena/round_pen/wash_area, unit grid for barn/isolation, and `NonHousingContent` for storage.

---

## 7. Type-Driven Facility Modeling Evolution

### 7.1
The move from generic facility behavior to type-aware modeling was the central architectural decision of this workstream. Facilities are no longer interchangeable — each type has distinct creation fields, display surfaces, and operational semantics.

### 7.2
The settled 8-type facility taxonomy:
- **Housing**: `barn`, `isolation`
- **Open Area**: `paddock`, `pasture`
- **Activity**: `arena`, `round_pen`, `wash_area`
- **Storage**: `storage`

This is enforced via the `FACILITY_CATEGORY` mapping and the `FACILITY_TYPES` array. The `FacilityType` union type is the canonical type definition.

### 7.3
The "Other / أخرى" type was explicitly removed from the system. Every facility must belong to one of the 8 defined types. This ensures data classification integrity and drives type-specific UI behavior.

### 7.4

#### 7.4.1. Room-based facilities (barn, isolation)
These use housing-unit semantics: individual rooms with single occupancy, unit grids, stall codes, and occupancy tracking. They support batch unit creation with previews, room exceptions, and two-sided arrangement.

#### 7.4.2. Open-area horse facilities (paddock, pasture)
These use advisory capacity semantics: approximate horse capacity, group occupancy, environmental attributes (shade, water, area size), and horse rosters. They do NOT use unit grids.

#### 7.4.3. Activity/service facilities (arena, round_pen, wash_area)
These use spec-driven semantics: dimensions, footing type, covered/uncovered status, wash points. They do NOT use occupancy or horse rosters. Their operational truth is about readiness and capability, not housing.

#### 7.4.4. Storage/infrastructure facilities (storage)
These use simple identity-based rendering. They show a basic description and type indicator. No units, no occupancy, no environmental attributes.

### 7.5
This type-aware direction changed the creation flow (2-phase dialog with dynamic fields per type), the display behavior (type-routed content in `FacilitySection`), and the edit flow (type-aware edit dialog in `FacilitiesManager`).

---

## 8. Room-Based Facility Workstream

### 8.1
Room-based facilities received the deepest implementation attention. The work covered creation, preview, numbering, side semantics, room exceptions, post-creation editing, and room extension.

### 8.2

#### 8.2.1. Stall Block / جناح / هنجر
Used for stable-type tenants. The type label adapts via `getHousingLabel()` — showing "Stall Block" in English and "جناح" in Arabic for stable accounts.

#### 8.2.2. Ward / عنبر
Used for clinic/doctor-type tenants. The same `barn` facility type renders as "Ward" / "عنبر" when the tenant type is `clinic` or `doctor`. Room default labels also adapt (e.g., "Patient Room" instead of "Stall").

### 8.3
Type-driven room-based creation was introduced through `CreateFacilityDialog`:
- When `barn` or `isolation` is selected, the dialog shows a "Stall Setup" (or "Ward Setup") section.
- Fields include: unit count (1–50), code prefix, start number.
- A live preview generates room cells showing codes, colors, and function labels.

### 8.4

**Room Preview Evolution:**
The preview evolved from a flat grid to a two-sided arrangement with an aisle divider. The `layoutMode` state (`'single'` | `'two_sided'`) controls the layout. In two-sided mode, rooms are split into two rows with a dashed "Aisle" line between them.

**Numbering Evolution:**
Start Number was introduced to allow numbering from any starting point (e.g., 101 instead of 1). The `startNumber` state controls this, and the preview updates immediately.

**Side Semantics Evolution:**
Explicit "Side A / الجانب أ" and "Side B / الجانب ب" labels were added to the two-sided preview rows. A `startSide` toggle (`'a'` | `'b'`) controls which side receives lower-numbered rooms. When `startSide === 'b'`, the `twoSidedRows` computation swaps the row arrays, placing lower numbers on Side B.

### 8.5
Room exceptions allow individual rooms to be designated as:
- **Default** (stall/patient room) — emerald color coding
- **Internal Storage** — amber color coding
- **Internal Isolation Room** — orange color coding

This is implemented via a per-cell `Popover` picker. The `roomSetup` state tracks exceptions by index. A color-coded legend below the preview explains the coding. Room exceptions carry through to unit creation, setting the appropriate `unit_type`.

### 8.6
**Post-creation editability:**
- Individual room codes and names can be edited inline via `UnitDetailsSheet`.
- An occupied-room rename warning (`AlertDialog`) triggers when a user attempts to rename a room that currently has occupants. The warning shows occupant count and requires explicit confirmation.
- Room expansion via `AddUnitsDialog` supports the same two-sided layout mode, side labels, start-side toggle, and room exception logic as the creation flow.

### 8.7
Final room-based state: Complete 2-phase creation with live two-sided preview, Side A/B labels, start-side toggle, room exceptions with popover picker, color-coded legend, batch unit creation, inline unit editing with occupied-room warnings, and room extension via AddUnitsDialog with full layout parity.

---

## 9. Open-Area Facility Workstream

### 9.1
Open-area facilities were enriched from a single capacity field to a full operational surface with environmental attributes and horse visibility.

### 9.2

#### 9.2.1. Paddock
Classified as `open_area`. Represents managed turnout spaces. Supports capacity, area size, shade/shelter, and water availability.

#### 9.2.2. Pasture
Classified as `open_area`. Represents larger grazing areas. Shares the same creation and display model as paddock.

### 9.3
Open-area facilities were explicitly separated from room-grid logic:
- `FacilitySection` routes `paddock` and `pasture` to `OpenAreaContent` instead of the unit grid.
- No "No units" empty state is shown for open areas.
- `AddUnitsDialog` is not rendered for open-area types.

### 9.4

**Creation fields:**
The creation flow shows an "Open Area Details" section with:
- Approximate Horse Capacity (numeric input)
- Area Size in m² (numeric input)
- Shade/Shelter (select: none / partial / full)
- Water Availability (checkbox)

**Display logic (`OpenAreaContent`):**
- Capacity badge showing "X / ~Y" (horses present / approximate capacity) using a `Users` icon.
- Area size badge showing "X m²".
- Shade badge with sun/cloud icon.
- Water availability badge with droplets icon and blue accent color.
- Expandable horse roster listing horses where `current_area_id = facility.id`.

**Capacity semantics:**
Open-area capacity is advisory. The display uses "~" prefix to communicate approximation. The numerator (horses present) is queried from the `horses` table. If no capacity is set, only the horse count is shown.

**Environmental attribute handling:**
Three new columns were added to `facility_areas` via migration: `area_size` (numeric), `shade` (text, default 'none'), `has_water` (boolean, default false). These are persisted during creation and update, and rendered as attribute badges in `OpenAreaContent`.

**Horse visibility:**
`OpenAreaContent` queries horses by `current_area_id` using React Query. It shows a count with an expandable/collapsible list of horse names rendered with `BilingualName`.

### 9.5
Final open-area state: Complete creation with 4 environmental fields, `OpenAreaContent` surface with capacity badges, environmental indicators, and expandable horse roster. Edit parity achieved — the edit dialog supports the same fields as creation.

---

## 10. Activity / Service Facility Workstream

### 10.1
Activity/service facilities were transitioned from generic `NonHousingContent` placeholder text to a spec-driven `ActivityContent` surface with type-specific metadata.

### 10.2

#### 10.2.1. Arena
Supports: dimensions (L×W format), covered/uncovered status, footing type (sand/grass/rubber/dirt/synthetic). Displayed as spec badges with Ruler icon for dimensions.

#### 10.2.2. Round Pen
Supports: diameter, covered/uncovered status, footing type. Displayed with CircleDot icon for diameter.

#### 10.2.3. Wash Area
Supports: number of wash points, water type (cold / hot & cold), covered/uncovered status. Displayed with Droplets icon for wash points and water type.

### 10.3
Activity/service facilities are explicitly separated from both housing and open-area logic:
- They do NOT show occupancy fractions, unit grids, or horse rosters.
- They do NOT show capacity or environmental attributes.
- Their operational truth is about specifications and readiness, not housing.
- `FacilitySection` routes them to `ActivityContent` component.

### 10.4

**Type-specific creation fields:**
The `CreateFacilityDialog` shows conditional fields based on the selected activity type:
- Arena: dimensions input, covered/uncovered select, footing type select.
- Round Pen: diameter input, covered/uncovered select, footing type select.
- Wash Area: wash points count, water type select, covered/uncovered select.

**Persistence:**
Activity metadata is stored in the `metadata` JSONB column added via migration. This avoids schema fragmentation — each activity type stores its specific attributes as JSON keys (e.g., `{ dimensions: "60x20", covered: "covered", footing: "sand" }`).

**Display (`ActivityContent`):**
Renders spec badges using Lucide icons: `Ruler` for dimensions, `CircleDot` for diameter, `Shield` for covered status, `Footprints` for footing, `Droplets` for wash points and water type, `CheckCircle2` for active/ready status. Badges use `outline` or `secondary` variants with appropriate accent colors.

**Edit parity:**
The edit dialog in `FacilitiesManager` supports the same type-conditional fields as creation. Arena shows dimensions + covered + footing; Round Pen shows diameter + covered + footing; Wash Area shows wash points + water type + covered. Changes to metadata are persisted via the `updateArea` mutation.

### 10.5
Final activity/service state: Complete creation with type-specific metadata fields, `ActivityContent` spec-driven surface, JSONB metadata persistence, and edit parity. Activity/service facilities are no longer generic placeholders — they show purposeful operational specifications.

---

## 11. Key Settled Product Rules and Decisions

### 11.1
The following rules became settled during this workstream and must not be reopened:

### 11.2

#### 11.2.1. Bilingual display rules
The BilingualName component is the canonical pattern. Primary language name is shown first; secondary language appears in parentheses below. Arabic text receives `dir="rtl"`. This applies across all Housing surfaces including branches, facilities, units, and horse names in rosters.

#### 11.2.2. Naming truthfulness
Account-type-aware terminology is enforced: `barn` renders as "Stall Block / جناح" for stable accounts and "Ward / عنبر" for clinic accounts. Room default labels adapt similarly ("Stall" vs "Patient Room"). This is implemented via `getHousingLabel()` and `getRoomDefaultLabel()` callbacks.

#### 11.2.3. Separation of facility families
The 4-category classification (housing, open_area, activity, storage) is enforced. Each category has distinct creation fields, display surfaces, and operational semantics. The `FACILITY_CATEGORY` mapping is the single source of truth.

#### 11.2.4. Prevention of misleading abstractions
- Open-area facilities do NOT show "No units" or unit grids.
- Activity/service facilities do NOT show occupancy or horse counts.
- Storage facilities do NOT show housing-like metrics.
- Each type shows only its operationally relevant information.

#### 11.2.5. Inline operational surfaces versus weak placeholder/deep-sheet behavior
The Facilities tab renders all facilities inline as expandable cards. Each card shows type-appropriate content immediately. No deep-sheet navigation is required to see facility details. The `useInlineFacilityUnits` hook optimizes data loading.

### 11.3
Settled rules are distinct from future ideas. The following are explicitly NOT settled and remain future scope: entrance-aware numbering, compass-based side labels, facility-level activity logs, scheduling integration, treatment workflow linkage, map visualizations, and zone management for open areas.

---

## 12. Significant UX / Workflow / Safety Improvements

### 12.1
Important UX and operational safety improvements completed during this workstream:

### 12.2

#### 12.2.1. Clearer actions and dialog wording
- Create dialog uses a 2-phase flow with clear section headers ("Stall Setup", "Open Area Details").
- Edit dialog shows type badge and context info (unit count, occupancy for housing types).
- All labels and descriptions are properly translated.

#### 12.2.2. Safer operational actions
- Facility deactivation uses a toggle with visual indication (destructive red for deactivate, emerald for activate).
- Tooltips on all action buttons explain their purpose.

#### 12.2.3. Confirmations/warnings where applicable
- **Occupied-room rename warning**: When renaming a room that currently has occupants, an `AlertDialog` warns the user, shows the occupant count, and requires explicit confirmation before proceeding. This prevents silent confusion in active occupancy scenarios.

#### 12.2.4. Stronger information clarity
- Color-coded room cells with legend (emerald = default, amber = storage, orange = isolation).
- Two-sided preview with Side A/B labels gives spatial understanding before creation.
- Open-area capacity uses "~" prefix to communicate advisory nature.
- Activity specs are shown as categorized badges with appropriate icons.

#### 12.2.5. Better visibility of operational state
- Housing facilities show occupancy fractions (X/Y) in the header.
- Open areas show horse count with expandable roster.
- Activity facilities show readiness via active status badge.
- Inactive facilities render with reduced opacity.

### 12.3
These changes matter because they prevent operational errors (renaming occupied rooms without awareness), provide spatial understanding before committing to physical arrangements (two-sided preview), and communicate the truthful nature of each facility type (advisory capacity vs fixed slots vs specs).

---

## 13. Current Final State at the End of Documentation 8

### 13.1
The Housing & Facilities workstream has reached a stable Phase 1 completion. The platform has:
- A 4-tab Housing IA (Branches, Facilities, Admissions, Arrivals & Departures).
- Branches as a stable first-class location index.
- An inline Facilities management surface with type-aware rendering.
- Three distinct facility families with dedicated creation, display, and editing models.
- Two database migrations extending `facility_areas` with environmental and metadata columns.

### 13.2
Complete and stable:
- 8-type facility taxonomy with category classification.
- Type-driven 2-phase CreateFacilityDialog.
- FacilitySection with type-routed content rendering.
- Room-based creation with two-sided preview, Side A/B labels, start-side toggle, room exceptions.
- OpenAreaContent with capacity/environmental badges and horse roster.
- ActivityContent with spec-driven badges.
- Edit parity across all facility families.
- AddUnitsDialog with layout parity for room extensions.
- Occupied-room rename warning.
- Full bilingual translation coverage.

### 13.3
Successfully implemented:
- `CreateFacilityDialog.tsx` — 803 lines, full type-driven creation.
- `FacilitySection.tsx` — 317 lines, type-routed inline rendering.
- `FacilitiesManager.tsx` — 412 lines, management surface with type-aware editing.
- `OpenAreaContent.tsx` — 141 lines, open-area operational surface.
- `ActivityContent.tsx` — 106 lines, spec-driven activity surface.
- `AddUnitsDialog.tsx` — 347 lines, room extension with layout parity.
- `UnitDetailsSheet.tsx` — 361 lines, unit editing with occupied-room warnings.
- `useFacilityAreas.ts` — data layer with full field support for all facility families.
- Two migrations: `area_size`/`shade`/`has_water` columns and `metadata` JSONB column.

### 13.4
Intentionally outside completed scope:
- Entrance-aware numbering and compass-based side labels.
- Zigzag/alternating numbering patterns.
- Bulk renumbering tool.
- Facility-level activity/change logs.
- Open-area zone management.
- Fencing and ground/footing type for paddock/pasture.
- Pasture condition scoring and grazing management.
- Scheduling/booking integration for activity facilities.
- Live session tracking for arenas.
- Maintenance workflows.
- Map-like turnout visualizations.
- L-shape/U-shape facility layouts.

---

## 14. Explicit Phase Boundary

### 14.1
**Phase 1** includes:
- Standardized Housing 4-tab IA.
- Branches as first-class surface.
- 8-type facility taxonomy enforcement.
- Type-driven creation flow with dynamic fields.
- Room-based facilities: two-sided preview, Side A/B labels, start-side toggle, room exceptions, batch creation, AddUnitsDialog parity, occupied-room rename warnings.
- Open-area facilities: environmental attributes (area size, shade, water), advisory capacity semantics, horse roster visibility, OpenAreaContent surface.
- Activity/service facilities: type-specific metadata (dimensions, footing, covered, wash points, water type), JSONB persistence, ActivityContent spec-driven surface.
- Edit parity across all facility families.
- Full bilingual translation coverage.
- Database schema extensions (area_size, shade, has_water, metadata columns).

### 14.2
**Phase 1 is complete.**

### 14.3
**Phase 2 has not been implemented.** It remains future work.

### 14.4
Phase 2 scope (not yet implemented): entrance markers, compass orientation, advanced numbering patterns, bulk renumbering, facility activity logs, open-area zone management, scheduling integration, maintenance workflows, map visualizations, condition scoring, and richer environmental specification.

---

## 15. Final Documentation Quality Requirements

### 15.1
This documentation serves as the official continuation after Documentation 7.

### 15.2
It is structured as a clean technical product artifact documenting decisions, implementations, and boundaries.

### 15.3
It does not read as raw chat history.

### 15.4
Conversational back-and-forth is not documented. Only final product decisions and implemented outcomes are recorded.

### 15.5
This document is suitable for handoff as the authoritative record of what changed after Documentation 7 through the completion of Phase 1.

---

## 16. Final Required Output Format

### 16.1.1
**Documentation 8** — Housing & Facilities Workstream Phase 1 Completion

### 16.2

#### 16.2.1. What was completed in this documentation window
The full Housing & Facilities Phase 1: Branches establishment, inline Facilities surface, 8-type facility taxonomy, type-driven creation/editing/display for room-based, open-area, and activity/service facilities, Side A/B semantics with start-side toggle, environmental attributes for open areas, JSONB metadata for activity specs, occupied-room rename warnings, edit parity across all families, and complete bilingual translation coverage.

#### 16.2.2. What is now stable
- 4-tab Housing IA
- Branches architecture
- 8-type facility taxonomy with `FACILITY_CATEGORY` classification
- Type-driven CreateFacilityDialog (2-phase, dynamic fields)
- FacilitySection with type-routed rendering (unit grid / OpenAreaContent / ActivityContent / NonHousingContent)
- Room-based two-sided preview with Side A/B labels, start-side toggle, room exceptions
- OpenAreaContent with capacity/environmental badges and horse roster
- ActivityContent with spec-driven badges
- AddUnitsDialog with full layout parity
- Edit dialog with type-aware fields
- Occupied-room rename warnings
- Dual-persistence strategy: typed columns for open-area attributes, JSONB for activity metadata
- Full EN/AR translation coverage for all Housing surfaces

#### 16.2.3. What remains explicitly for Phase 2
Entrance-aware numbering, compass-based orientation, zigzag numbering patterns, bulk renumbering, facility-level activity logs, open-area zone management, fencing/ground type attributes, pasture condition scoring, scheduling/booking integration for activity facilities, live session tracking, maintenance workflows, map/spatial visualizations, L-shape/U-shape layouts, and treatment workflow linkage.
```
