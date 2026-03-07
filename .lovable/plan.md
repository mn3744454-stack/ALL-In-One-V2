

# Understanding & Fix Plan: 3 Post-Migration Issues

## What I Understood

You raised three issues visible across the platform after the DashboardShell migration:

### Issue 1: Sidebar doesn't scroll to active item
When you click a sub-item like "Payroll" (كشف الرواتب) under HR, the page opens correctly but the sidebar resets its scroll to the top. The active item is not visible — the user loses context of where they are. Image 2 shows the correct state (active item visible + highlighted), Image 1 shows the broken state.

**Root cause**: `NavGroup` uses `useState(isAnyActive)` to set initial open state, but the sidebar `<nav>` element never scrolls to bring the active item into view after navigation. When the sidebar has many items and the active one is below the fold, it's invisible.

### Issue 2: Page titles disappeared
Before the migration, pages had their own inline `<h1>` titles (e.g., "كشف الرواتب", "دليل الفريق"). After migration to DashboardShell, the global `DashboardHeader` only shows controls (Tenant/Role/Language/etc.) but **no page title**. Every page lost its desktop title.

**Root cause**: `DashboardHeader` has no `title` prop and renders no title. The old per-page headers that included titles were removed during migration.

### Issue 3: Action buttons misplaced in global header
Page-specific buttons like "+ إضافة دفعة" (Add Payment) and "⚙ إعدادات الموارد البشرية" (HR Settings) are rendered via `headerRight` inside the global header bar, mixed with notifications/language/tenant controls. This is semantically wrong — these buttons belong to the page content, not the global chrome.

**Root cause**: `DashboardShell` accepts `headerRight` which injects page-specific actions into `DashboardHeader`. This was a design shortcut during migration.

---

## Proposed Solution (Platform-Wide)

### Fix 1: Auto-scroll sidebar to active item

In `DashboardSidebar.tsx`, add a `useEffect` that finds the active nav link and calls `scrollIntoView({ block: 'nearest' })` on navigation. This ensures the sidebar always shows the user where they are.

**Files**: `src/components/dashboard/DashboardSidebar.tsx`

### Fix 2: Add page title row below DashboardHeader

Add a **page toolbar row** inside each page's content (NOT in the global header). This row contains:
- The page title (`<h1>`)
- Page-specific action buttons (the ones currently in `headerRight`)

This is NOT a new shell-level component — it's a simple reusable `PageToolbar` component that each page renders as the first child inside `<DashboardShell>`. It renders inside the scrollable main area but visually appears right below the header.

```
┌─────────────────────────────────────────┐
│ DashboardHeader (global controls only)  │  ← shrink-0, no page actions
├─────────────────────────────────────────┤
│ PageToolbar: "كشف الرواتب" [+ إضافة]   │  ← inside <main>, per-page
│─────────────────────────────────────────│
│ Page content (cards, tables, etc.)      │  ← scrolls together with toolbar
└─────────────────────────────────────────┘
```

**Implementation**:
1. Create `src/components/layout/PageToolbar.tsx` — accepts `title`, `actions` (ReactNode), renders `hidden lg:flex` (desktop only, mobile uses MobilePageHeader).
2. Remove `headerRight` prop from `DashboardShell` and `DashboardHeader`.
3. Update all ~8 pages that use `headerRight` to instead render `<PageToolbar>` as their first child inside DashboardShell.
4. Update all other pages to also add `<PageToolbar title={...} />` for their page title (even those without actions).

### Fix 3: Combined with Fix 2
The `headerRight` removal solves the misplaced buttons problem. Action buttons move into `PageToolbar` where they semantically belong.

---

## Files to Change

| File | Change |
|------|--------|
| **NEW** `src/components/layout/PageToolbar.tsx` | Reusable title + actions row |
| `src/components/layout/DashboardShell.tsx` | Remove `headerRight` prop |
| `src/components/layout/DashboardHeader.tsx` | Remove `rightSlot` prop |
| `src/components/dashboard/DashboardSidebar.tsx` | Add auto-scroll to active item |
| ~25 pages in `src/pages/Dashboard*.tsx` | Add `<PageToolbar>`, remove `headerRight` |

---

## PageToolbar Design

```tsx
// Desktop only (hidden on mobile — MobilePageHeader handles mobile)
<div className="hidden lg:flex items-center justify-between px-8 py-4">
  <h1 className="text-xl font-semibold text-foreground">{title}</h1>
  {actions && <div className="flex items-center gap-3">{actions}</div>}
</div>
```

This keeps the global header clean (only tenant/role/language/notifications) and puts page context where it belongs — inside the page.

