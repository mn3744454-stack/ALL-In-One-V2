# Desktop Shell Forensic Audit — Current State Report

---

## 1) Executive Summary

- **35 of 37 org-guarded pages** use `DashboardShell` correctly with unified header, dual-scroll, and preserved CTAs.
- **2 Academy pages** (`DashboardAcademySessions.tsx`, `DashboardAcademyBookings.tsx`) use `min-h-screen` with no Shell, no sidebar, no header controls. They were missed because they never imported `DashboardSidebar` — the migration search pattern didn't catch them.
- **4 pages** have early-return branches that bypass Shell (loading/access-denied/no-tenant): `DashboardLaboratory.tsx`, `DashboardServices.tsx`, `DashboardPublicProfile.tsx`, `DashboardRevenue.tsx`. No additional offenders found beyond these 4.
- **3 pages** have dead `sidebarOpen` state: `DashboardServices.tsx`, `DashboardRevenue.tsx`, `DashboardFileManager.tsx`.
- **0 pages** still import `DashboardSidebar` directly.
- `**DashboardMyBookings.tsx**` also uses `min-h-screen` without Shell, but it's a **personal workspace** route (no `WorkspaceRouteGuard requiredMode="organization"`), so it is **out of scope**.
- `DashboardPermissionsSettings.tsx` has 6 `flex-row-reverse` RTL hacks — all content-level, not shell-level. Low priority.

---

## 2) Evidence Tables

### Part A — Academy Pages


| Route                         | Component                      | Guard                           | Uses Shell?                | Sidebar? | Header?                       |
| ----------------------------- | ------------------------------ | ------------------------------- | -------------------------- | -------- | ----------------------------- |
| `/dashboard/academy/sessions` | `DashboardAcademySessions.tsx` | org + `academy.sessions.manage` | ❌ `min-h-screen` (line 11) | ❌ None   | ❌ Back link only (line 17-25) |
| `/dashboard/academy/bookings` | `DashboardAcademyBookings.tsx` | org + `bookings.manage`         | ❌ `min-h-screen` (line 11) | ❌ None   | ❌ Back link only (line 17-25) |


**Why missed:** These pages never imported `DashboardSidebar`, so the migration search for `DashboardSidebar` imports didn't find them. They were simple content pages with a back-link header.

**CTAs present:** None — just a `SessionsList` / `BookingsList` component. No header actions to preserve.

### Part B — Early Returns Bypassing Shell


| File                         | Condition                          | Line    | Severity                   | JSX returned                               |
| ---------------------------- | ---------------------------------- | ------- | -------------------------- | ------------------------------------------ |
| `DashboardLaboratory.tsx`    | `moduleLoading`                    | 102-107 | Transient (loading)        | `min-h-screen` centered spinner            |
| `DashboardServices.tsx`      | `!activeTenant`                    | 54-71   | Persistent (no tenant)     | `min-h-screen` card "No Business Selected" |
| `DashboardServices.tsx`      | `!canManage`                       | 75-93   | Persistent (access denied) | `min-h-screen` card "Access Restricted"    |
| `DashboardPublicProfile.tsx` | `!activeTenant`                    | 18-23   | Persistent (no tenant)     | `min-h-screen` "No tenant selected"        |
| `DashboardRevenue.tsx`       | `!activeTenant || !canViewRevenue` | 32-50   | Persistent (access denied) | `min-h-screen` card "Access Restricted"    |


**Total: 5 early returns across 4 files.** All match the previously reported set — no additional offenders found.

### Part C — Dead Code


| File                       | Dead code                                               | Line |
| -------------------------- | ------------------------------------------------------- | ---- |
| `DashboardServices.tsx`    | `const [sidebarOpen, setSidebarOpen] = useState(false)` | 24   |
| `DashboardRevenue.tsx`     | `const [sidebarOpen, setSidebarOpen] = useState(false)` | 24   |
| `DashboardFileManager.tsx` | `const [sidebarOpen, setSidebarOpen] = useState(false)` | 277  |


### Part D — RTL `flex-row-reverse` in PermissionsSettings


| Line(s)  | Context                                  | Classification                                                            |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| 179      | Header `justify-between` for bundles tab | Likely redundant — `dir="rtl"` handles flexbox                            |
| 203, 208 | Bundle list item row                     | Likely redundant — `dir="rtl"` auto-reverses flex                         |
| 223, 234 | Badge + action buttons row               | Likely redundant                                                          |
| 332      | AlertDialogFooter                        | **Possibly needed** — dialog footers sometimes need explicit button order |


All are content-level. None affect shell layout. Low priority cleanup.

---

## 3) Root Causes (ranked)

1. **Academy pages never had a sidebar** → migration search for `DashboardSidebar` imports missed them entirely.
2. **Early returns are written BEFORE the Shell render** → standard React pattern but breaks the layout contract.
3. **Dead state is harmless** but adds confusion during future maintenance.

---

## Implement Phases 1–3 from the “Desktop Shell Forensic Audit — Current State Report” exactly, with minimal blast radius, no tech debt, and no changes to mobile navigation.

IMPORTANT CONTEXT / CORRECTIONS (inject these into your approach):

- The Academy module is intended to be fully inside the organization dashboard experience (desktop), i.e., Academy pages MUST use DashboardShell like the rest of org pages.

- The “4 pages” mentioned are ONLY the early-return offenders listed in the audit:

  1) DashboardLaboratory.tsx

  2) DashboardServices.tsx (has 2 early-return branches)

  3) DashboardPublicProfile.tsx

  4) DashboardRevenue.tsx

  It is NOT referring to Community/My Payments/My Bookings (personal workspace pages are out of scope).

- The target is DESKTOP ONLY (>=1024px). Tablet/mobile navigation is a different system and must remain untouched.

HARD RULES (non-negotiable):

- Do NOT alter mobile components/behavior (MobilePageHeader/MobileBottomNav/MobileLauncher).

- Do NOT change routes in App.tsx.

- Do NOT introduce new layout variants; use the existing DashboardShell + DashboardHeader.

- Keep existing CTAs exactly as-is. Do not remove or “move” CTAs unless explicitly listed below.

- For early-return UI, eliminate `min-h-screen` wrappers. Replace with DashboardShell and an inner container using `flex-1 flex items-center justify-center p-6` (or equivalent) so sidebar/header remain visible.

- After each file change: remove unused imports/states (no dead code).

SCOPE (desktop org-mode only):

- Phase 1: Wrap Academy pages in DashboardShell (they were missed because they never imported DashboardSidebar)

- Phase 2: Wrap all early-return branches (loading/access-denied/no-tenant) inside DashboardShell

- Phase 3: Remove dead sidebarOpen state from 3 migrated pages

========================================================

PHASE 1 — Academy pages → DashboardShell (2 files, LOW risk)

========================================================

1) src/pages/DashboardAcademySessions.tsx

- Current: `<div className="min-h-screen bg-cream">` with a desktop “Back link only” header; no sidebar; no unified header controls.

- Change:

  - Replace the outer min-h-screen wrapper with:

    `<DashboardShell title={t("academy.sessions.title") || "Academy Sessions"}> ... </DashboardShell>`

  - Remove the DESKTOP-only back-link header block (it is redundant once Shell exists).

  - Keep MobilePageHeader inside children (it uses lg:hidden).

  - Do not add any new CTAs (none existed).

- Acceptance: On desktop, Academy Sessions shows sidebar + unified header + dual-scroll.

2) src/pages/DashboardAcademyBookings.tsx

- Same transformation as Sessions:

  - Wrap in `<DashboardShell title={t("academy.bookings.title") || "Academy Bookings"}>`

  - Remove desktop back-link header block

  - Keep MobilePageHeader

  - No CTAs to preserve

- Acceptance: On desktop, Academy Bookings shows sidebar + unified header + dual-scroll.

NOTE: If academy title i18n keys differ or don’t exist, pick the closest existing keys used in those pages; otherwise fallback to the English strings above.

========================================================

PHASE 2 — Fix early-return branches that bypass DashboardShell (4 files, 5 returns)

========================================================

Goal: Even in loading/error/access-denied/no-tenant states, the sidebar + unified header MUST remain visible on desktop.

Implementation pattern (use EXACTLY this idea):

Instead of:

  return (<div className="min-h-screen ...">...</div>)

Use:

  return (

    <DashboardShell title={t("...")}>

      <div className="flex-1 flex items-center justify-center p-6">

        ...the same existing spinner/card/text...

      </div>

    </DashboardShell>

  );

Files/branches to fix (ONLY these):

1) src/pages/DashboardLaboratory.tsx

- Branch: `if (moduleLoading) return ...` (reported around lines 102-107)

- Wrap this loading spinner return in DashboardShell using the pattern above.

- Keep the spinner content identical (just remove min-h-screen).

2) src/pages/DashboardServices.tsx

- Branch A: `if (!activeTenant) return ...` (reported around lines 54-71)

- Branch B: `if (!canManage) return ...` (reported around lines 75-93)

- Wrap BOTH returns in DashboardShell using the same pattern.

- Title can be `t("services.title")` (or whatever is used in the main render for services).

3) src/pages/DashboardPublicProfile.tsx

- Branch: `if (!activeTenant) return ...` (reported around lines 18-23)

- Wrap this return in DashboardShell using the pattern.

- Keep the original message as-is; only remove min-h-screen.

4) src/pages/DashboardRevenue.tsx

- Branch: `if (!activeTenant || !canViewRevenue) return ...` (reported around lines 32-50)

- Wrap this return in DashboardShell using the pattern.

- Title can be `t("revenue.title")` (or closest existing key used in this page).

========================================================

PHASE 3 — Cleanup dead sidebarOpen state (3 files, TRIVIAL risk)

========================================================

Remove unused state + unused imports that became dead after Shell adoption.

1) src/pages/DashboardServices.tsx

- Remove: `const [sidebarOpen, setSidebarOpen] = useState(false);` (reported line ~24)

- Remove unused `useState` import if it becomes unused.

- Ensure no other references remain.

2) src/pages/DashboardRevenue.tsx

- Remove: `const [sidebarOpen, setSidebarOpen] = useState(false);` (reported line ~24)

- Remove unused imports accordingly.

3) src/pages/DashboardFileManager.tsx

- Remove: `const [sidebarOpen, setSidebarOpen] = useState(false);` (reported line ~277)

- Remove unused imports accordingly.

========================================================

POST-CHANGE CHECKS

========================================================

After implementing Phases 1–3:

- Run typecheck/build and ensure zero build errors.

- Confirm no lint errors introduced (or only pre-existing ones).

- Ensure no routing changes were made.

ACCEPTANCE CHECKLIST (desktop ≥1024px):

- Academy Sessions + Bookings now show sidebar + unified header + dual-scroll.

- During Laboratory loading spinner: sidebar/header remain visible.

- Services no-tenant and access-denied views: sidebar/header remain visible.

- PublicProfile no-tenant: sidebar/header remain visible.

- Revenue access-denied: sidebar/header remain visible.

- No double sidebar anywhere.

- Mobile behavior unchanged (MobilePageHeader/MobileBottomNav still work as before).

DELIVERABLE:

- Provide a short “Diff Summary” listing each file changed and exactly what was changed per file (no extra speculation).

---

## 5) Verification Checklist

After Phases 1-3, for each affected page on desktop (≥1024px):


| Page                       | Dual-scroll | Header controls | No missing CTAs | No double sidebar | Dialogs OK |
| -------------------------- | ----------- | --------------- | --------------- | ----------------- | ---------- |
| Academy Sessions           | ☐           | ☐               | ☐ (none)        | ☐                 | ☐          |
| Academy Bookings           | ☐           | ☐               | ☐ (none)        | ☐                 | ☐          |
| Laboratory (loading state) | ☐           | ☐               | ☐               | ☐                 | ☐          |
| Services (no tenant)       | ☐           | ☐               | ☐               | ☐                 | ☐          |
| Services (access denied)   | ☐           | ☐               | ☐               | ☐                 | ☐          |
| PublicProfile (no tenant)  | ☐           | ☐               | ☐               | ☐                 | ☐          |
| Revenue (access denied)    | ☐           | ☐               | ☐               | ☐                 | ☐          |
