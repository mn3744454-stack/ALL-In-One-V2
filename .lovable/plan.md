

# Desktop Sidebar + Header Forensic Audit — Evidence Report

## 1. Reproduction Matrix

| Route | Header visible? | Sidebar indep. scroll? | Dual-scroll? | Active highlight? | Group auto-expands? | scrollIntoView? | Duplicates? | Evidence |
|---|---|---|---|---|---|---|---|---|
| `/dashboard` | Yes | Yes | Yes | **Yes** (exact match) | N/A | No | No | `isActive("/dashboard")` line 274 |
| `/dashboard/finance/payments` | Yes | Yes | Yes | **Yes** (child match) | **No** (only on mount) | No | **Yes** — top-level Payments also exists | NavGroup line 22: `useState(isAnyActive)` |
| `/dashboard/payments` | Yes | Yes | Yes | **Yes** (exact) | N/A | No | **Yes** — duplicate of Finance/Payments | Sidebar line 335 |
| `/dashboard/my-bookings` (org mode) | Yes | Yes | Yes | **Yes** | N/A | No | **Yes** — personal item in org | Sidebar line 320-328 |
| `/dashboard/settings/roles` | Yes | Yes | Yes | **No** — nothing highlights | N/A | No | No | No nav entry exists; Settings uses exact `===` (line 541) |
| `/dashboard/settings/permissions` | Yes | Yes | Yes | **No** | N/A | No | No | Same — no entry |
| `/dashboard/settings/connections` | Yes | Yes | Yes | **No** | N/A | No | No | Same |
| `/dashboard/doctor/consultations/:id` | Yes | Yes | Yes | **No** | N/A | No | No | `isActive("/dashboard/doctor/consultations")` exact fails for `/consultations/abc` |
| `/dashboard/hr/payroll` (via URL) | Yes | Yes | Yes | **Yes** (child exact) | **No** — HR group stays collapsed | No | No | NavGroup `useState` ignores post-mount changes |
| `/dashboard/clients` | Yes | Yes | Yes | **Yes** | N/A | No | No | Single entry (line 438); Finance has "Customer Balances" (different concept) |

### Header Breakpoint Analysis

- **DashboardHeader**: `hidden lg:block` → visible at **≥1024px** (Sidebar.tsx line 34)
- **MobilePageHeader**: `lg:hidden` → visible at **<1024px** (MobilePageHeader.tsx line 40)
- **DashboardSidebar**: `if (!isDesktop) return null` where `useIsDesktop()` = `>=1024px` (use-mobile.tsx line 33)
- **Verdict**: At the `lg` breakpoint (1024px), the transition is clean — both CSS and JS use the same 1024px threshold. At 900–1023px, mobile nav handles everything. **No header gap exists.**

---

## 2. Root-Cause Tree (ranked)

### RC1: Exact `===` path matching breaks nested/detail routes
- **Files**: `DashboardSidebar.tsx:219`, `NavGroup.tsx:22`, `NavGroup.tsx:66`
- **Code**: `const isActive = (path: string) => location.pathname === path;`
- **Proof**: Navigate to `/dashboard/settings/roles` → inspect sidebar → no element has gold/active styling. Navigate to `/dashboard/doctor/consultations/abc123` → "Consultations" has no active class.
- **Affected routes**: All settings sub-pages, doctor consultation details, any future nested routes.

### RC2: NavGroup uses `useState(initialValue)` — doesn't auto-expand on route change
- **File**: `NavGroup.tsx:23`
- **Code**: `const [isOpen, setIsOpen] = useState(isAnyActive);`
- **Proof**: Collapse HR group → paste `/dashboard/hr/payroll` in address bar → HR group stays collapsed despite child being active. `useState` ignores subsequent `isAnyActive` changes.

### RC3: Duplicate "Payments" — top-level AND inside Finance group
- **Sidebar line 330-339**: `<NavItem href="/dashboard/payments" />` (top-level, gated by `payments.view`)
- **Finance group line 200**: `{ href: "/dashboard/finance/payments" }` (inside NavGroup)
- Per memory `finance/payments-route-unification`, `/dashboard/finance/payments` is the canonical route. The top-level `/dashboard/payments` is legacy.

### RC4: "My Bookings" leaks into org mode
- **Sidebar line 320-328**: In org mode block, shows `<NavItem href="/dashboard/my-bookings" />` gated by `bookings.view`. This is a personal workspace concept. Per memory `workspace-navigation-gating-rule`, personal items should not appear in org mode.

### RC5: Duplicate Logout button
- **Sidebar line 558-569**: Sign-out button in sidebar footer
- **DashboardHeader line 52-58**: Logout button in header
- Both visible simultaneously on desktop.

### RC6: No `scrollIntoView` for active nav items
- Searched entire `src/components/dashboard/` — 0 results for `scrollIntoView`.
- When sidebar has many items (owner with all modules), bottom items like Settings are not scrolled into view.

### RC7: Settings sub-pages have no sidebar nav entries
- Only two items in settings section (lines 535-552): "Settings" (`/dashboard/settings`) and "Notification Settings" (`/dashboard/settings/notifications`).
- Routes `/dashboard/settings/roles`, `/dashboard/settings/permissions`, `/dashboard/settings/connections` have no sidebar representation.

---

## 3. Proposed Patch Plan

### Phase 1: Fix active matching + auto-expand (2 files, LOW risk)

**`DashboardSidebar.tsx` line 219** — Replace exact match with prefix match:
```tsx
const isActive = (path: string) => {
  if (path === "/dashboard") return location.pathname === "/dashboard";
  return location.pathname === path || location.pathname.startsWith(path + "/");
};
```

**`NavGroup.tsx` line 22-23** — Same prefix match + add `useEffect` for reactive expansion:
```tsx
const isAnyActive = items.some(item =>
  location.pathname === item.href || location.pathname.startsWith(item.href + "/")
);
const [isOpen, setIsOpen] = useState(isAnyActive);

useEffect(() => {
  if (isAnyActive) setIsOpen(true);
}, [isAnyActive]);
```

**`NavGroup.tsx` line 66** — Same prefix match for child items:
```tsx
const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
```

**Add `data-active` + scrollIntoView** in NavGroup active child + sidebar `useEffect`:
```tsx
// In NavGroup child Link:
data-active={isActive ? "true" : undefined}

// In DashboardSidebar, after nav ref:
useEffect(() => {
  const el = navRef.current?.querySelector('[data-active="true"]');
  el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}, [location.pathname]);
```

### Phase 2: Remove duplicates (1 file, MEDIUM risk)

**`DashboardSidebar.tsx`**:
- **Remove lines 320-328**: "My Bookings" from org mode (personal item).
- **Remove lines 330-339**: Top-level "Payments" (canonical location is Finance group's `/dashboard/finance/payments`).
- **Remove lines 558-569**: Sidebar logout button (DashboardHeader already has it). OR add `lg:hidden` to keep it for mobile overlay only.

### Phase 3: Settings NavGroup (1 file, LOW risk)

Convert settings section (lines 535-552) to a NavGroup:
```
Settings (NavGroup)
  ├── General → /dashboard/settings
  ├── Roles → /dashboard/settings/roles
  ├── Permissions → /dashboard/settings/permissions
  ├── Connections → /dashboard/settings/connections
  └── Notifications → /dashboard/settings/notifications
```

---

## 4. Acceptance Tests

| Test | Expected |
|---|---|
| Navigate to `/dashboard/settings/roles` | Settings group expanded, "Roles" highlighted |
| Navigate to `/dashboard/doctor/consultations/abc` | "Consultations" highlighted |
| Collapse Finance → navigate to `/dashboard/finance/invoices` via URL | Finance auto-expands, "Invoices" highlighted |
| Org mode sidebar | No "My Bookings", no top-level "Payments", only one Logout visible |
| Switch to Arabic (RTL) | Sidebar on right side, active states correct, no layout hacks |
| Resize 1023→1024px | Clean transition: mobile nav → desktop shell (no gap, no flash) |
| Navigate to bottom Settings item with many nav items | Active item auto-scrolls into sidebar viewport |

