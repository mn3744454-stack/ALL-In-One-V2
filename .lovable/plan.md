# Desktop Layout & Sidebar Audit — Full Report

---

## 1. Executive Summary

The platform has **no shared layout shell**. Every page independently renders its own outer `<div>`, sidebar, header, and main content area. The Dashboard home page and 3 other pages use the correct `h-dvh overflow-hidden` pattern (viewport-locked, dual-scroll). **~20 other pages** use `min-h-screen` (document-flow), which makes the sidebar scroll with the page content — destroying independent scroll regions and losing the header when scrolling.

The fix is to extract a single `DashboardShell` layout component and adopt it across all organization pages. This MUST be done in a centralized and systematic way (no route-by-route CSS patches), and must not break dialogs/sheets/popovers. Collapsed sidebar with tooltip/flyout behavior is valuable, but should be implemented **after** the shared shell is fully adopted across all org pages.

---

## 2. Current State Map

### Layout Patterns Found

**Pattern A — CORRECT** (`h-dvh overflow-hidden`):

- `Dashboard.tsx` (line 77): `h-dvh w-full bg-cream flex overflow-hidden`
- `DashboardHorses.tsx` (line 23): same
- `DashboardHorseOrders.tsx` (line 117): same
- `DashboardBreeding.tsx` (line 225): same

These pages have: outer div locks to viewport → sidebar gets its own scroll via `overflow-y-auto` in DashboardSidebar nav (line 268) → main has `flex-1 overflow-y-auto min-h-0`.

**Pattern B — BROKEN** (`min-h-screen`):

- `DashboardFinance.tsx` (line 895): `min-h-screen bg-cream flex`
- `DashboardLaboratory.tsx` (line 138): `flex min-h-screen bg-background`
- `DashboardHR.tsx` (line 40): `min-h-screen bg-background flex`
- `DashboardHRPayroll.tsx` (line 154): same
- `DashboardHRAttendance.tsx` (line 20): same
- `DashboardHRSettings.tsx` (line 98): same
- `DashboardClients.tsx` (line 118): same
- `DashboardSchedule.tsx` (line 270): same
- `DashboardRecords.tsx` (line 213): same
- `DashboardFileManager.tsx` (line 365): same
- `DashboardHousing.tsx` (line 71): same
- `DashboardServices.tsx` (line 98): same
- `DashboardRevenue.tsx` (line 67): same
- `DashboardPayments.tsx` (line 37): same
- Plus: DashboardVet, DashboardMovement, DashboardPublicProfile, DashboardOrganizationSettings, DashboardConnectionsSettings, DashboardPermissionsSettings, DashboardNotificationSettings, DashboardAcademy*, DashboardDoctor*, DashboardClientStatement

**Pattern C — BROKEN + manual RTL hack** (3 pages):

- `DashboardRecords.tsx`, `DashboardFileManager.tsx`, `DashboardSchedule.tsx` add `dir === "rtl" && "flex-row-reverse"` — unnecessary and risky once we enforce `dir` at shell-level.

### Header Inconsistency

- **Dashboard.tsx** has a full header: `WorkspaceModeToggle`, `TenantSwitcher`, `RoleSwitcher`, `LanguageSelector`, `NotificationsPanel`, `LogOut`.
- **DashboardHorses.tsx** has: `TenantSwitcher`, `RoleSwitcher`, `NotificationsPanel`, hamburger `Menu` button — **missing** `LanguageSelector`, `WorkspaceModeToggle`, `LogOut`.
- **DashboardFinance.tsx** has: **NO desktop header at all** — just an inline `h1` title inside the content area.
- **DashboardLaboratory.tsx** has: `Menu` button, title, `NotificationsPanel` — **missing** `TenantSwitcher`, `RoleSwitcher`, `LanguageSelector`, `WorkspaceModeToggle`, `LogOut`.
- **DashboardHR.tsx** has: just a title + settings button — **missing everything**.

Every page builds its own header with a different subset of controls.

### Sidebar Scroll

`DashboardSidebar.tsx` line 268: `<nav className="flex-1 p-3 space-y-1 overflow-y-auto">` — This only works when the sidebar's parent (`<aside>`) has a constrained height. With `min-h-screen`, the aside grows with document content, so `overflow-y-auto` never triggers.

### Sidebar Collapse

Currently, the sidebar has NO collapse state. The "Menu" hamburger buttons on sub-pages just toggle `sidebarOpen` for the mobile overlay behavior. There is no icon-only collapsed mode, no tooltip, no flyout.

---

## 3. Root Causes (ranked)

1. **No shared layout shell**: Every page duplicates the layout structure independently. Dashboard.tsx happened to get the correct pattern; later pages copied a `min-h-screen` variant.
2. `min-h-screen` **instead of** `h-dvh overflow-hidden`: This is the single CSS cause. Without viewport lock, the outer flex container grows with content, sidebar loses its scroll constraint, and the entire page becomes one scroll region.
3. **No shared header component**: Each page renders its own desktop header with whatever controls the developer remembered to include. There's no `DashboardHeader` component.
4. **No collapse mechanism**: The sidebar has no collapsed state concept — only open/closed for mobile overlay.
5. **Risk to overlays (Dialog/Sheet/Popover)**: Switching to `overflow-hidden` at shell-level can break portaled overlays if any overlay relies on document scrolling or if inner containers accidentally clip portaled content. This must be explicitly tested and guarded.

---

## 4. Recommended Fix Plan

### Step 1: Create `DashboardShell` layout component

Create `src/components/layout/DashboardShell.tsx`:

```
┌─────────────────────────────────────────────┐
│ DashboardShell (h-dvh flex overflow-hidden) │
│ ┌──────────┬────────────────────────────────┐│
│ │ Sidebar  │ Right Column (flex-1 flex-col) ││
│ │ (fixed   │ ┌────────────────────────────┐ ││
│ │ width,   │ │ Header (shrink-0)          │ ││
│ │ h-full,  │ │ consistent controls         │ ││
│ │ overflow │ ├────────────────────────────┤ ││
│ │ -y-auto) │ │ Main (flex-1 overflow-y-   │ ││
│ │          │ │ auto min-h-0 min-w-0)      │ ││
│ │          │ │ {children}                 │ ││
│ │          │ └────────────────────────────┘ ││
│ └──────────┴────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

Props:

- `children: ReactNode` — page content
- `title?: string` — page title for header
- `headerRight?: ReactNode` — optional extra header actions (e.g. "Create" button)
- `disableSidebar?: boolean` — for personal mode or any page explicitly outside org shell (default false)

This component will:

- Render `DashboardSidebar` (as-is) inside an `<aside className="h-full">` wrapper so `overflow-y-auto` always works
- Render a shared `DashboardHeader` with consistent controls
- Wrap children in a scrollable main area
- Handle RTL via `dir` attribute on the shell (NOT flex-row-reverse hacks)
- Keep mobile/tablet navigation untouched (desktop only changes)

**Important**: The shell must explicitly enforce `min-h-0 min-w-0` on flex columns to prevent unintended overflow and horizontal scrollbars.

### Step 2: Create `DashboardHeader` component

Extract the “full header” set into `src/components/layout/DashboardHeader.tsx`:

- Always shows (desktop/org): `WorkspaceModeToggle`, `TenantSwitcher`, `RoleSwitcher`, `LanguageSelector`, `NotificationsPanel`, `LogOut`
- Must never disappear across pages in org mode (this fixes multi-tenant context loss)
- Accepts optional `rightSlot` for page-specific actions
- Desktop-only rendering rules must remain consistent (mobile header is a separate system)

### Step 3: Migrate ALL broken pages (systemic)

For each page currently using `min-h-screen`:

- Replace the outer `<div className="min-h-screen...">` + inline `<DashboardSidebar>` + inline `<header>` with:

```
<DashboardShell title={t("module.title")} headerRight={<SomeButton />}>
  {/* page content only */}
</DashboardShell>
```

- Remove duplicated sidebar/header rendering
- Remove manual `dir` / `flex-row-reverse` hacks (Shell handles it)
- Ensure page content does not reintroduce global scrolling (no new `min-h-screen` wrappers inside page root)

This must be done for all broken pages together, because otherwise the platform remains inconsistent and the bug persists across navigation.

### Step 4: Migrate the 4 correct pages too

Dashboard.tsx, DashboardHorses.tsx, DashboardHorseOrders.tsx, DashboardBreeding.tsx — also migrate to use `DashboardShell` so the header is consistent everywhere. Even though their scroll works today, their header controls are inconsistent.

### Step 5 (DEFERRED): Add sidebar collapse with tooltip/flyout

Collapsed sidebar behavior is important, but should be implemented **after** the shell migration is complete. Otherwise, we risk building collapse logic into a sidebar that is still being mounted differently across pages.

---

## 5. Alternatives Considered

**Alt A: Just change** `min-h-screen` **to** `h-dvh overflow-hidden` **in each page.**

- Rejected: Fixes scroll but leaves header inconsistency. Every page still has its own header with different controls. Tech debt accumulates with every new page.

**Alt B: Use React Router nested layout routes.**

- Rejected for now: Would require restructuring App.tsx routing with `<Outlet>`. Correct long-term but much higher blast radius. The Shell component approach achieves the same result with less routing disruption.

---

## 6. Golden Layout Contract

```
RULE 1: Outer shell = h-dvh w-full flex overflow-hidden
RULE 2: Sidebar = fixed column, h-full, overflow-y-auto (nav list scroll)
RULE 3: Right column = flex-1 flex flex-col min-h-0 min-w-0
RULE 4: Header = shrink-0 and consistent across all org pages (tenant/role/lang/context never omitted)
RULE 5: Main = flex-1 overflow-y-auto min-h-0 min-w-0 (page scroll region)
RULE 6: NO page may use min-h-screen for its outer container in org mode
RULE 7: RTL handled via dir attribute on outer shell, not flex-row-reverse hacks
RULE 8: Mobile/tablet nav is separate and must remain unchanged
RULE 9: Shell must not clip overlays — verify Dialog/Sheet/Popover behavior after migration
```

Tailwind enforcement:

```
<div className="h-dvh w-full bg-cream flex overflow-hidden" dir={dir}>
  <aside className="h-full shrink-0">
    <DashboardSidebar />
  </aside>

  <div className="flex-1 flex flex-col min-h-0 min-w-0">
    <DashboardHeader /> {/* shrink-0 */}
    <main className="flex-1 overflow-y-auto min-h-0 min-w-0">
      {children}
    </main>
  </div>
</div>
```

---

## 7. Collapsed Sidebar UX Spec (DEFERRED)

**State**: `collapsed` boolean, persisted to `localStorage("sidebar-collapsed")`, toggled by a chevron button.

**Collapsed**: w-16, icons only.

- Tooltip on hover/focus shows label
- Items with children show hover flyout with children selectable directly
- Keyboard accessible + ESC closes flyout

**Components to update**:

- `DashboardSidebar.tsx`, `NavItem`, `NavGroup`

**Note**: Implement AFTER shell migration to avoid inconsistent mount patterns.

---

## 8. Acceptance Test Checklist


| #   | Page                                        | Dual-scroll                         | Header consistent    | RTL check       |
| --- | ------------------------------------------- | ----------------------------------- | -------------------- | --------------- |
| 1   | Dashboard (Home)                            | Sidebar + main scroll independently | All controls present | AR: correct dir |
| 2   | Laboratory (Samples/Results/Templates/etc.) | Same                                | Same                 | Same            |
| 3   | Horses Registry                             | Same                                | Same                 | Same            |
| 4   | Orders                                      | Same                                | Same                 | Same            |
| 5   | Finance (all tabs)                          | Same                                | Same                 | Same            |
| 6   | HR / Payroll / Attendance                   | Same                                | Same                 | Same            |
| 7   | Clients + Statement                         | Same                                | Same                 | Same            |
| 8   | Schedule                                    | Same                                | Same                 | Same            |
| 9   | Records                                     | Same                                | Same                 | Same            |
| 10  | File Manager                                | Same                                | Same                 | Same            |
| 11  | Services                                    | Same                                | Same                 | Same            |
| 12  | Revenue                                     | Same                                | Same                 | Same            |
| 13  | Settings pages                              | Same                                | Same                 | Same            |
| 14  | Doctor/Academy/Vet/Movement pages           | Same                                | Same                 | Same            |


**Additional checks**:

- Dialogs/Sheets/Drawers/Popovers still render correctly (no clipping/regression due to overflow-hidden)
- Window resize: layout remains stable
- Sidebar nav long list: sidebar scroll works independently on ALL pages
- Multi-tenant context visible everywhere (tenant/role/lang never disappears)

---

## 9. Implementation Order (prioritized)

Given the scope (~25 files), the correct order is:

**Phase 1 (REQUIRED NOW)**:

- Create `DashboardShell` + `DashboardHeader`
- Migrate ALL organization pages to use the shell (includes the 4 “correct” pages too)
- Remove any `min-h-screen` org shells and RTL hacks
- Validate the Acceptance Tests + overlay behavior

**Phase 2 (OPTIONAL / LATER)**:

- Add sidebar collapse with tooltip/flyout (desktop only)

---

## File Inventory Summary


| File                                                | Issue                                     | Line |
| --------------------------------------------------- | ----------------------------------------- | ---- |
| `src/pages/DashboardFinance.tsx`                    | `min-h-screen`, no header                 | 895  |
| `src/pages/DashboardLaboratory.tsx`                 | `min-h-screen`, minimal header            | 138  |
| `src/pages/DashboardHR.tsx`                         | `min-h-screen`, no header controls        | 40   |
| `src/pages/DashboardHRPayroll.tsx`                  | `min-h-screen`                            | 154  |
| `src/pages/DashboardHRAttendance.tsx`               | `min-h-screen`                            | 20   |
| `src/pages/DashboardHRSettings.tsx`                 | `min-h-screen`                            | 98   |
| `src/pages/DashboardClients.tsx`                    | `min-h-screen`, minimal header            | 118  |
| `src/pages/DashboardSchedule.tsx`                   | `min-h-screen` + RTL hack                 | 270  |
| `src/pages/DashboardRecords.tsx`                    | `min-h-screen` + RTL hack                 | 213  |
| `src/pages/DashboardFileManager.tsx`                | `min-h-screen` + RTL hack                 | 365  |
| `src/pages/DashboardHousing.tsx`                    | `min-h-screen`                            | 71   |
| `src/pages/DashboardServices.tsx`                   | `min-h-screen`                            | 98   |
| `src/pages/DashboardRevenue.tsx`                    | `min-h-screen`                            | 67   |
| `src/pages/DashboardPayments.tsx`                   | `min-h-screen`                            | 37   |
| `src/pages/DashboardBreeding.tsx`                   | Correct (`h-dvh`) but inconsistent header | 225  |
| `src/pages/DashboardHorses.tsx`                     | Correct but inconsistent header           | 23   |
| `src/pages/DashboardHorseOrders.tsx`                | Correct but inconsistent header           | 117  |
| `src/pages/Dashboard.tsx`                           | Correct — reference pattern               | 77   |
| **NEW** `src/components/layout/DashboardShell.tsx`  | To create                                 | —    |
| **NEW** `src/components/layout/DashboardHeader.tsx` | To create                                 | —    |
