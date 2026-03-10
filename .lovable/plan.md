

# Stable vs Lab Sidebar Forensic Audit — Evidence & Patch Plan

## Findings

The DashboardShell, DashboardHeader, and sidebar **render identically** for both tenants. There is no layout-contract difference. The issues are confined to **two bugs** in `DashboardSidebar.tsx`.

---

## Evidence

### Bug 1: `scrollIntoView` ignores query-param changes

**File**: `src/components/dashboard/DashboardSidebar.tsx`, lines 156-162

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    const el = navRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 100);
  return () => clearTimeout(timer);
}, [location.pathname]); // ← BUG: only watches pathname
```

**Why Lab is affected**: Lab nav uses query-param routing (`/dashboard/laboratory?tab=samples`, `?tab=results`, etc.). When switching tabs, `location.pathname` stays `/dashboard/laboratory` — the effect never re-fires. The active state updates visually (via `isLabTabActive` re-render), but the sidebar never scrolls to the newly active item.

**Why Stable is unaffected**: Stable uses path-based routes (`/dashboard/horses`, `/dashboard/vet`, etc.) — every navigation changes `pathname`, so `scrollIntoView` always fires.

### Bug 2: Lab "Clients" duplicate + broken active state

**File**: `src/navigation/labNavConfig.ts`, lines 91-97

```tsx
{ 
  key: "clients", 
  tab: null as unknown as string, // Not a lab tab, standalone page
  icon: Users, 
  labelKey: "clients.title",
  route: "/dashboard/clients",
},
```

This entry renders at **line 346-356** of `DashboardSidebar.tsx` via `LAB_NAV_SECTIONS.map(...)` with:
```tsx
active={isLabTabActive(section.tab)}  // isLabTabActive(null) → always false
```

Meanwhile, the **standalone** Clients entry at **lines 438-447** also renders for owner/manager:
```tsx
active={isActive("/dashboard/clients")}  // correct path-based check
```

**Result for Lab owner**: Two "Clients" entries appear. The LAB_NAV_SECTIONS one is **never active** (because `isLabTabActive(null)` always returns false since `pathname` won't start with `/dashboard/laboratory`). The standalone one IS active but appears lower, creating confusion.

---

## Root Causes (Ranked)

| # | Cause | Impact | File | Lines |
|---|---|---|---|---|
| RC1 | `scrollIntoView` useEffect depends only on `pathname`, not `search` | Lab tab switches don't auto-scroll | `DashboardSidebar.tsx` | 162 |
| RC2 | LAB_NAV_SECTIONS includes `clients` with `tab: null`, rendered with `isLabTabActive(null)` which always returns false | Duplicate Clients entry, one permanently inactive | `labNavConfig.ts` 91-97, `DashboardSidebar.tsx` 346-356 |

---

## Minimal Patch Plan (2 diffs, 1 file each)

### Diff 1: `src/components/dashboard/DashboardSidebar.tsx` line 162

Change dependency array to include `location.search`:

```tsx
// Before:
}, [location.pathname]);

// After:
}, [location.pathname, location.search]);
```

### Diff 2: `src/components/dashboard/DashboardSidebar.tsx` line 346

Filter out the `clients` entry from LAB_NAV_SECTIONS (the standalone Clients at line 438 is the canonical one with correct active logic and proper owner/manager gating):

```tsx
// Before:
{LAB_NAV_SECTIONS.map((section) => (

// After:
{LAB_NAV_SECTIONS.filter(s => s.key !== 'clients').map((section) => (
```

No changes to `labNavConfig.ts` needed (mobile bottom nav may still reference it).

---

## Acceptance Tests

| Test | Expected |
|---|---|
| Lab tenant: click Samples → Results → Timeline tabs | Active highlight moves; sidebar auto-scrolls to active item |
| Lab tenant: navigate to Settings (bottom of sidebar) | Settings group expands, active item scrolled into view |
| Lab tenant owner: inspect sidebar | Exactly ONE "Clients" entry (the standalone one at line 438) |
| Lab tenant: on `/dashboard/clients` | Clients entry has `data-active="true"` and gold highlight |
| Stable tenant: all routes | Zero behavioral change — path-based routing unaffected |
| Both tenants: desktop header | Always visible at ≥1024px on every dashboard route |

