

# Migration Plan — Remaining Pages to DashboardShell (Page-by-Page, CTA-Safe)

## Pages to Migrate (14 files, in priority order)

---

### 1. `src/pages/DashboardHRPayroll.tsx`
**Before CTAs:** Desktop header (line 165-181) has **"Add Payment" button** (Plus icon + `t('hr.payroll.addPayment')`) — visible when `canManage`.
**After CTAs:** Move "Add Payment" button → `headerRight` prop.
**Changes:** Remove `min-h-screen` outer div (line 154), `DashboardSidebar` (line 155), `sidebarOpen` state (line 71), desktop `<header>` block (lines 165-181), `dir={dir}` on outer div. Replace with `<DashboardShell headerRight={canManage ? <AddPaymentButton /> : undefined}>`. Keep MobilePageHeader + mobile FAB inside children.

### 2. `src/pages/DashboardHRSettings.tsx`
**Before CTAs:** Desktop header (lines 106-127) has **Back button** (`ChevronLeft` → `/dashboard/hr`) and a centered title with Settings icon. No primary CTA.
**After CTAs:** No CTA to relocate. Back button becomes unnecessary (Shell header provides context).
**Changes:** Remove `min-h-screen` outer div (line 98), `DashboardSidebar` (line 99), `sidebarOpen` state (line 41), desktop `<header>` (lines 106-127), `dir={dir}`, `Menu` import. Wrap in `<DashboardShell>`. Keep MobilePageHeader inside children.

### 3. `src/pages/DashboardOrganizationSettings.tsx`
**Before CTAs:** Desktop header (lines 91-104) has title + tenant name only. No primary CTA in header.
**After CTAs:** No CTA to relocate.
**Changes:** Remove `min-h-screen` outer div (line 83), `DashboardSidebar` (line 84), `sidebarOpen` state (line 19), desktop `<header>` (lines 91-104), `Menu` import. Wrap in `<DashboardShell>`. Keep MobilePageHeader inside children.

### 4. `src/pages/DashboardConnectionsSettings.tsx`
**Before CTAs:** Desktop header (lines 171-187) has title + tenant name. No CTA in header (the "Add Partner" button is inside the ConnectionsList tab content, not header).
**After CTAs:** No CTA to relocate.
**Changes:** Remove `min-h-screen` outer div (line 162), `DashboardSidebar` (line 163), `sidebarOpen` state (line 31), desktop `<header>` (lines 171-187). Wrap in `<DashboardShell>`. Keep MobilePageHeader and dialogs outside Shell if needed (they're portaled).

### 5. `src/pages/DashboardPermissionsSettings.tsx`
**Before CTAs:** Desktop header (lines 174-188) has title + tenant name + **BackButton** to `/dashboard/settings`. No primary CTA in header (the "Create Bundle" button is inside the bundles tab content).
**After CTAs:** No CTA to relocate from header. BackButton drops (Shell provides context).
**Changes:** Remove `min-h-screen` outer div (lines 126-127 access-denied view AND line 166 main view), `DashboardSidebar` in both branches, `sidebarOpen` state (line 33), both desktop `<header>` blocks. Wrap both views in `<DashboardShell>`. Keep dialogs outside Shell (portaled).

### 6. `src/pages/DashboardRolesSettings.tsx`
**Before CTAs:** Desktop header (lines 199-229) has **"Create Role" button** (Plus + `t("roles.createRole")`) when `isOwnerRole`, and a **Back button** to `/dashboard/settings`.
**After CTAs:** Move "Create Role" button → `headerRight`. Drop Back button (Shell provides global context).
**Changes:** Remove `min-h-screen` in both branches (lines 153 + 191), `DashboardSidebar` in both, `sidebarOpen` state (line 24), both desktop headers. Wrap in `<DashboardShell headerRight={isOwnerRole ? <CreateRoleButton /> : undefined}>`. Keep RoleEditorDialog + AlertDialog outside (portaled).

### 7. `src/pages/DashboardNotificationSettings.tsx`
**Before CTAs:** No desktop header block at all — just an inline icon+title div (lines 127-138). No CTA.
**After CTAs:** No CTA to relocate.
**Changes:** Remove `min-h-screen` outer div (line 119), `DashboardSidebar` (line 120), `sidebarOpen` state (line 44), `Menu` import. Wrap in `<DashboardShell>`. Keep MobilePageHeader inside children.

### 8. `src/pages/DashboardPublicProfile.tsx`
**Before CTAs:** No sidebar at all currently. Desktop has a ghost **Back button** (lines 38-45). No primary CTA.
**After CTAs:** No CTA to relocate. Drop Back button.
**Changes:** Remove `min-h-screen` outer div (line 33). Wrap in `<DashboardShell>`. Keep MobilePageHeader and PublicProfileSettings inside children.

### 9. `src/pages/DashboardClientStatement.tsx`
**Before CTAs:** No sidebar. Desktop header (lines 32-50) has **Back button** to `/dashboard/clients` + title + client name. No primary CTA.
**After CTAs:** No CTA to relocate. Back button drops (Shell provides global nav context). Consider keeping a lightweight breadcrumb-style link inline instead.
**Changes:** Remove `min-h-screen` outer div (line 26). Wrap in `<DashboardShell>`. Keep MobilePageHeader + statement content inside children. The client name subtitle can stay as inline content.

### 10. `src/pages/DashboardDoctorConsultationDetail.tsx`
**Before CTAs:** Desktop header (lines 86-97 main view, lines 41-48 new view) has:
- **"New consultation" view:** Back button + title + NotificationsPanel
- **"Detail" view:** Back button, title, **Edit button** (`Edit` icon + `t('common.edit')`), **Create Invoice button** (`Receipt` icon + `t('doctor.createInvoice')`), NotificationsPanel
**After CTAs:** Move Edit + Create Invoice buttons → `headerRight`. Drop Back button and NotificationsPanel (Shell provides both).
**Changes:** Remove `min-h-screen` in all 3 branches (lines 37, 58, 82), `DashboardSidebar` in all, `sidebarOpen` state (line 24), all desktop `<header>` blocks, `Menu`/`NotificationsPanel` imports. Wrap in `<DashboardShell headerRight={...}>` with conditional CTAs.

### 11. `src/pages/finance/FinanceCustomerBalances.tsx`
**Before CTAs:** Desktop header (lines 107-127) has **Menu hamburger** + Wallet icon + title/description. No primary CTA button in header.
**After CTAs:** No CTA to relocate.
**Changes:** Remove `min-h-screen` outer div (line 94), `DashboardSidebar` (lines 96-100), `sidebarOpen` state (line 28), desktop `<header>` (lines 107-127), `Menu`/`Wallet` icon header usage, `location`/`currentPath` prop. Wrap in `<DashboardShell>`. Keep MobilePageHeader + RecordPaymentDialog inside/after children.

### 12. `src/pages/finance/DashboardFinanceCategories.tsx`
**Before CTAs:** Inline desktop header div (lines 205-214) has **"Add Category" button** (Plus + `t("finance.categories.addCategory")`).
**After CTAs:** Move "Add Category" button → `headerRight`.
**Changes:** Remove `min-h-screen` + `flex-row-reverse` RTL hack outer div (line 197), `DashboardSidebar` (line 198), `sidebarOpen` state (line 68), inline desktop header div (lines 205-214). Also update the access-denied early return (lines 178-193) to use Shell. Wrap in `<DashboardShell headerRight={<AddCategoryButton />}>`. Keep MobilePageHeader + dialogs inside/after children.

### 13. `src/pages/finance/DashboardFinancePOS.tsx`
**Before CTAs:** No desktop header at all. The POS layout is its own full-screen experience with `POSSessionBar` + `POSLayoutResponsive`. No traditional header CTAs.
**After CTAs:** No CTA to relocate. POS is a special case — the POSLayoutResponsive manages its own layout internally.
**Changes:** Remove `min-h-screen` + `flex-row-reverse` RTL hack outer div (line 246), `DashboardSidebar` (line 247), `sidebarOpen` state (line 46). Wrap in `<DashboardShell>`. The `<main>` with `flex-1 flex flex-col overflow-hidden` becomes just the children content. Also update loading/access-denied early returns (lines 132-157) to use Shell.

---

## After All Migrations: Cleanup Pass (separate step)

Clean dead imports/state from previously-migrated pages:
- `src/pages/DashboardPayments.tsx`: Remove unused `TenantSwitcher`, `RoleSwitcher`, `NotificationsPanel`, `Menu`, `sidebarOpen` state, `X` icon import if unused.
- Any other migrated page with leftover sidebar/header imports.

---

## Verification Checklist (per page, desktop only)

| Page | Dual-scroll | Header controls | No missing CTAs | No double sidebar | Dialogs OK | RTL OK |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| HRPayroll | ☐ | ☐ | ☐ Add Payment | ☐ | ☐ | ☐ |
| HRSettings | ☐ | ☐ | ☐ (none) | ☐ | ☐ AlertDialog | ☐ |
| OrgSettings | ☐ | ☐ | ☐ (none) | ☐ | ☐ | ☐ |
| Connections | ☐ | ☐ | ☐ (none) | ☐ | ☐ AddPartner/CreateGrant | ☐ |
| Permissions | ☐ | ☐ | ☐ (none) | ☐ | ☐ BundleEditor/Viewer/Delete | ☐ |
| Roles | ☐ | ☐ | ☐ Create Role | ☐ | ☐ RoleEditor/AlertDialog | ☐ |
| Notifications | ☐ | ☐ | ☐ (none) | ☐ | ☐ | ☐ |
| PublicProfile | ☐ | ☐ | ☐ (none) | ☐ | ☐ | ☐ |
| ClientStatement | ☐ | ☐ | ☐ (none) | ☐ | ☐ | ☐ |
| DoctorConsultDetail | ☐ | ☐ | ☐ Edit + CreateInvoice | ☐ | ☐ CreateInvoice dialog | ☐ |
| CustomerBalances | ☐ | ☐ | ☐ (none) | ☐ | ☐ RecordPayment | ☐ |
| FinanceCategories | ☐ | ☐ | ☐ Add Category | ☐ | ☐ Form/Delete dialogs | ☐ |
| FinancePOS | ☐ | ☐ | ☐ (none — POS internal) | ☐ | ☐ Open/Close session | ☐ |
| DashboardPayments (cleanup) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

