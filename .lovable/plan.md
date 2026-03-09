# Forensic Report — Desktop Shell Migration (Snapshots A → B → C) — **Revised (CTA-Safe + Execution-Ready)**

---

## A) Executive Summary

- **`DashboardShell` + `DashboardHeader exist** and correctly implement the Golden Layout Contract (`h-dvh overflow-hidden`, independent sidebar/main scroll, unified header with all core controls).
- **Current post-revert state is a partial migration checkpoint (Snapshot C)**: a subset of pages are on `DashboardShell`, while the rest still render `DashboardSidebar` directly (mixed experience persists).
- **No pages were deleted and no routes are broken** in the current state.
- **The main risk discovered from Snapshot B (fully-migrated attempt)** is **CTA regression**: some pages had important actions (“Add/ إنشاء / تسجيل / إضافة…”) embedded in ad-hoc headers. During migration, those headers were removed and CTAs were not consistently preserved.
- **Next work must be executed with a strict CTA Preservation Contract** so migration can finish without losing page actions, and without adding technical debt.

---

## B) Timeline (A → B → C)

### Snapshot A (baseline ~2026-03-06 22:00)

- No `DashboardShell` / `DashboardHeader`.
- All org pages rendered their own outer layout + `DashboardSidebar`.
- Some pages used `h-dvh` (correct scroll behavior), many used `min-h-screen` (broken sidebar scroll).
- Headers were inconsistent across pages (missing tenant/role/language/logout on many).

### Snapshot A → B (~2026-03-07 until ~20:00)

- **Created**:
  - `src/components/layout/DashboardShell.tsx`
  - `src/components/layout/DashboardHeader.tsx`
- **Migration expanded beyond the first batch** (fully migrated hypothesis state = Snapshot B).
- **Reported symptom**: “buttons disappeared” (high confidence root cause = removal of ad-hoc header blocks without relocating CTAs into Shell headerRight or page toolbars).

### Revert → Snapshot C (current)

- Reverted back to a partial migration checkpoint (Shell/Header still exist; subset of pages migrated; remainder reverted).
- This reintroduced the **mixed layout** state (dual-scroll pages + single-scroll pages co-existing).

---

## C) Findings (Ranked)

### 1) Partial Migration Creates Split Experience

- Migrated pages: correct dual-scroll + consistent header.
- Unmigrated pages: single-scroll or fragmented header controls, and inconsistent sidebar behavior.
- This is the primary UX inconsistency and must be resolved by completing migration.

### 2) CTA Regression Risk is Real (Observed in Snapshot B)

- Some pages place core actions in their custom desktop headers:
  - Examples: “Add Sample / إنشاء عينة”, “Add Payment / تسجيل دفعة”, “Create / إضافة”, “Settings shortcuts”… etc.
- When replacing page headers with `DashboardShell`, these actions must not be lost.
- Therefore, completing migration must follow a strict CTA contract (see Section E).

### 3) Dead Code Accumulates After Migration

- Pages migrated to Shell may still import and keep unused header/sidebar-related props/state (`sidebarOpen`, `Menu`, `TenantSwitcher` etc.).
- Not a functional bug, but increases maintenance overhead and causes confusion.

---

## D) Evidence Index


| Finding                                           | File                                        | Proof                                  |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| Shell implements Golden Layout                    | `src/components/layout/DashboardShell.tsx`  | `h-dvh w-full ... overflow-hidden`     |
| Header has all standard controls                  | `src/components/layout/DashboardHeader.tsx` | consistent controls present            |
| Migrated pages import Shell                       | `src/pages/*`                               | imports show mixed state               |
| Unmigrated pages still use Sidebar directly       | multiple `src/pages/*`                      | `import DashboardSidebar` remains      |
| No routes deleted                                 | `src/App.tsx`                               | routes still point to valid components |
| Sidebar scroll constraint relies on parent height | `DashboardSidebar.tsx nav overflow-y-auto`  | breaks under `min-h-screen`            |


---

## E) CTA Preservation Contract (MANDATORY)

Two valid CTA patterns inside `DashboardShell`:

### Pattern 1 — `headerRight` (preferred for top-level page CTAs)

Use for page-level “global” actions:

- Add/Create button
- Settings button
- Export/Print button (if page-wide)
- Primary module action

### Pattern 2 — Inline page toolbar (preferred for contextual/tab-specific CTAs)

Use for actions that belong to a sub-view (tab, filter bar, table toolbar):

- “Add Item” inside a form panel
- Tab-specific “Create” buttons
- Filters + view switchers + actions menu

### Hard Rule

When migrating any page:

- **Identify all desktop-visible CTAs in the old header**
- **Relocate them** to `headerRight` or an inline toolbar
- **Never silently drop CTAs**

---

## F) Recovery Decision

Proceed with **Option 2: Complete Migration** from current state (Snapshot C), but with CTA contract + guardrails so we do not repeat Snapshot B regressions.

- Reverting further loses working progress unnecessarily.
- The Shell/Header are correct.
- The remaining work is mechanical but must be executed carefully.

---

## G) Phase 1 — Complete Migration (file list + steps, NO code)

### Guardrails (must follow in implementation)

1. **Do not delete any business logic or UI components** besides:
  - old Sidebar rendering
  - old ad-hoc header wrapper
  - desktop-only sidebarOpen/Menu toggles that are redundant after Shell
2. **No route changes. No page deletions.**
3. **Desktop-only focus**: mobile navigation stays untouched.
4. **After each page migration**:
  - remove unused imports only if truly unused
  - verify CTAs still exist (see validation checklist)

---

### Pages to migrate (remaining), grouped by complexity

#### Group 1 — pages using `h-dvh` but custom header (need header unification + Shell adoption)

1. `src/pages/Dashboard.tsx`
2. `src/pages/DashboardHorses.tsx`
3. `src/pages/DashboardHorseOrders.tsx`
4. `src/pages/DashboardBreeding.tsx`

#### Group 2 — pages using `min-h-screen` (standard mechanical migration)

5. `src/pages/DashboardLaboratory.tsx`
6. `src/pages/DashboardVet.tsx`
7. `src/pages/DashboardMovement.tsx`
8. `src/pages/DashboardHRPayroll.tsx`
9. `src/pages/DashboardHRSettings.tsx`
10. `src/pages/DashboardOrganizationSettings.tsx`
11. `src/pages/DashboardConnectionsSettings.tsx`
12. `src/pages/DashboardPermissionsSettings.tsx`
13. `src/pages/DashboardRolesSettings.tsx`
14. `src/pages/DashboardNotificationSettings.tsx`
15. `src/pages/DashboardPublicProfile.tsx`
16. `src/pages/DashboardClientStatement.tsx`
17. `src/pages/finance/FinanceCustomerBalances.tsx`
18. `src/pages/finance/DashboardFinanceCategories.tsx`
19. `src/pages/finance/DashboardFinancePOS.tsx`
20. Doctor module pages (migrate all that import DashboardSidebar directly):

- `src/pages/DashboardDoctorOverview.tsx`
- `src/pages/DashboardDoctorPatients.tsx`
- `src/pages/DashboardDoctorConsultations.tsx`
- `src/pages/DashboardDoctorConsultationDetail.tsx` (if exists)
- `src/pages/DashboardDoctorServices.tsx`

---

### Per-file migration steps (CTA-safe)

1. Replace `DashboardSidebar` usage with `DashboardShell`
2. Remove `sidebarOpen` + `Menu` button used only to toggle sidebar on desktop
3. Remove ad-hoc desktop `<header>` block
4. **CTA relocation step (mandatory)**:
  - list CTAs previously in header
  - move to `headerRight` OR keep inline within page content/toolbars
5. Remove RTL layout hacks (`flex-row-reverse`) used to force sidebar direction
6. Remove unused imports after the page compiles conceptually (no dead header/sidebar imports)
7. Keep any mobile-specific header/nav elements inside page content if they already exist and are mobile-only

---

### Cleanup pass

- Remove dead imports and unused header/sidebar state in already-migrated pages (example frequently affected):
  - `src/pages/DashboardPayments.tsx` (if Shell handles tenant/role/notifications/menu)

---

## H) Validation Checklist (Desktop-only)

For every migrated page:

1. **Dual-scroll**:
  - sidebar scrolls independently
  - main content scrolls independently
2. **Header consistency**:
  - tenant/role/language/workspace/notifications/logout visible where applicable
3. **No CTA loss**:
  - any “Create/Add/Settings/Primary action” is still visible and functional
4. **No double sidebar** and no “blank long scroll”
5. **Dialog/Sheet** sanity:
  - open a dialog/sheet on that page: no clipping, no overlay issues

RTL (Arabic):

- sidebar is on right
- header controls still visible
- no manual `flex-row-reverse` hacks remain in pages

---

## I) Recommended Next Step

Proceed with **Complete Migration** of the remaining pages using the CTA Preservation Contract, then run the desktop validation checklist. After stability is confirmed, sidebar collapse/flyout behavior can be treated as a separate Phase (not required to fix the dual-scroll regression).