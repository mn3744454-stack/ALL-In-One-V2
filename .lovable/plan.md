## Desktop Sidebar Collapse — UX Refinement Plan 

---

### A) Current State (Evidence)

#### 1) Collapse Toggle — Bottom placement (low discoverability)

**File:** `src/components/dashboard/DashboardSidebar.tsx`  
**Current behavior:** The collapse toggle is rendered **below the** `<nav>`, near the bottom of the sidebar. With many nav items, users often won’t notice it unless they scroll to the end.

#### 2) NavItem in collapsed mode (good)

- Hovering a single icon shows a tooltip label.
- Clicking navigates immediately.

#### 3) NavGroup in collapsed mode (needs improvement)

**File:** `src/components/dashboard/NavGroup.tsx`  
**Current behavior:** Groups with children (e.g., Finance / HR / Settings) require **clicking the group first** to reveal children (Popover). This is less intuitive because:

- Users can’t tell it has children until they click.
- It’s inconsistent with single-item hover behavior.

---

### B) Root Causes

1. **Toggle is placed at the bottom**: safe default, but not discoverable.
2. **NavGroup uses Radix Popover default (click-open)**: no hover wiring (`onMouseEnter/onMouseLeave`) and no controlled open state for hover flyouts.

---

### C) Platform-Wide Goal (applies to all tenant types)

This refinement must apply uniformly across the entire platform (stables, horse owners, clinics, labs, pharmacies, academies, independent trainers/doctors, auctions, transport, etc.).  
Scope is limited to shared components only: `DashboardSidebar` and `NavGroup`. No tenant-type forks.

---

### D) Proposed Changes (Injected)

#### Change 1: Move the collapse toggle to the top header/logo area

**File:** `DashboardSidebar.tsx`

**Target UX**

- **Expanded:** Logo on one side + toggle button on the other (RTL-aware).
- **Collapsed:** icon-only logo + a clearly visible toggle near it (not at the bottom).

**Implementation**

- Move the existing collapse toggle button (with tooltip) into the **sidebar header/logo section**.
- Remove the old bottom toggle block entirely.
- Keep mobile close button unchanged (`lg:hidden`).

---

#### Change 2: NavGroup hover-to-open flyout in collapsed mode

**File:** `NavGroup.tsx`

**Target UX**

- Hovering the group icon opens the flyout immediately.
- Moving the cursor from trigger into flyout keeps it open.
- Leaving both trigger + flyout closes after a short delay (≈150ms).
- Clicking a child navigates and closes instantly.
- Keyboard: focus on trigger opens; ESC closes.

**Implementation Details**

- Use **controlled** Radix Popover:
  - `open={popoverOpen}` + `onOpenChange={setPopoverOpen}`
- Add `closeTimerRef`:
  - `onMouseEnter` (trigger & content): clear timer + open
  - `onMouseLeave` (trigger & content): start 150ms timer to close
- Keyboard:
  - `onFocus={() => setPopoverOpen(true)}`
  - ESC handled by Radix; keep state synced via `onOpenChange`
- RTL/LTR:
  - flyout `side={tooltipSide}` (LTR right, RTL left)

**Expanded mode remains unchanged** (keep current inline expand/collapse).

---

### E) Patch Plan (Files)

#### File 1: `src/components/dashboard/DashboardSidebar.tsx`

1. Move collapse toggle into the logo/header area (desktop only).
2. Delete the bottom toggle block (the one rendered after `</nav>`).
3. Do not touch:
  - localStorage persistence
  - collapsed state logic
  - tenant gating logic
  - mobile behavior

#### File 2: `src/components/dashboard/NavGroup.tsx`

1. In collapsed branch:
  - controlled Popover + hover open/close + close delay + focus open
2. Expanded branch: no changes

---

### F) Verification Checklist

**Discoverability**

- Toggle is always visible at the top on desktop without scrolling.

**Collapsed behavior**

- NavItem hover → tooltip shows label.
- NavGroup hover → flyout opens immediately.
- Moving cursor into flyout keeps it open.
- Leaving flyout closes after ~150ms.
- Clicking a flyout child navigates and closes flyout.

**RTL**

- Flyout opens on the correct side (RTL left, LTR right).
- Toggle chevron mirrors correctly.

**Platform-wide**

- Works across all tenant types because only shared components were modified.

**Mobile/tablet**

- No changes under 1024px.

---

### What Lovable must output (Plan Mode / Investigative)

- Exact file/blocks where the toggle was moved and the old bottom toggle removed.
- Exact changes in NavGroup collapsed branch for hover-controlled popover.
- Any risks (hover close timing, accidental close while moving) + recommended delay range (150–250ms).
- Confirm no mobile impact and no tenant-type branching added.