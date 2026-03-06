

# Audit: Exposing "Clients" in Sidebar for All Organization Tenants

## 1. Route Confirmation

**Route exists and works** — `src/App.tsx` lines 449-458:
```tsx
<Route path="/dashboard/clients" element={
  <ProtectedRoute>
    <WorkspaceRouteGuard requiredMode="organization">
      <DashboardClients />
    </WorkspaceRouteGuard>
  </ProtectedRoute>
} />
```
- Component: `src/pages/DashboardClients.tsx` (line 25)
- Guards: `ProtectedRoute` + `WorkspaceRouteGuard requiredMode="organization"` — correct, no tenant-type restriction.
- Statement sub-route also exists at `/dashboard/clients/:clientId/statement` (line 459-466).

## 2. Why "Clients" Is NOT Visible in the Sidebar

**Root cause**: `DashboardSidebar.tsx` is hardcoded (not config-driven). There is **no `<NavItem>` for `/dashboard/clients`** anywhere in the sidebar component.

The only place "Clients" appears navigation-wise:
- **`navConfig.ts` line 350-354**: `doctorClients` — gated to `tenantType: "doctor"` only
- **`workspaceNavConfig.ts` line 262-264**: nested inside `finance.children` (not a top-level item)
- **`labNavConfig.ts` line 94-97**: lab-specific config (used by mobile grid, not desktop sidebar)

The desktop sidebar (`DashboardSidebar.tsx`) has **zero references** to `/dashboard/clients` as a standalone item. It only has "Customer Balances" under the Finance NavGroup (line 200), which goes to `/dashboard/finance/customer-balances` — a different page.

## 3. Proposed Fix (3 files, minimal changes)

### File 1: `src/components/dashboard/DashboardSidebar.tsx`

Add a `<NavItem>` for Clients between Services and Finance (around line 433), gated by `owner`/`manager` role (same pattern as Services, HR, Files):

```tsx
{/* Clients - for owners and managers */}
{["owner", "manager"].includes(activeRole || "") && (
  <NavItem
    icon={UsersIcon}
    label={t('clients.title')}
    href="/dashboard/clients"
    active={isActive("/dashboard/clients")}
    onNavigate={onClose}
  />
)}
```

`UsersIcon` is already imported in this file (used for Customer Balances). `clients.title` already exists in i18n: EN="Clients", AR="العملاء".

### File 2: `src/navigation/navConfig.ts`

Add a top-level `clients` entry (visible in organization mode, all tenant types):

```typescript
{
  key: "clients",
  icon: UserCircle,
  labelKey: "clients.title",
  route: "/dashboard/clients",
  roles: ["owner", "manager"],
  visibleIn: "organization",
},
```

Place it after `services` (around line 208). This feeds the mobile nav/launcher.

### File 3: `src/navigation/workspaceNavConfig.ts`

Add a top-level `clients` entry in `ORG_NAV_MODULES` (after `services`, around line 240):

```typescript
{
  key: "clients",
  icon: UserCircle,
  labelKey: "clients.title",
  route: "/dashboard/clients",
  roles: ["owner", "manager"],
},
```

**No i18n changes needed** — `clients.title` already exists (EN: "Clients", AR: "العملاء").

**No new permissions needed** — follows the same `owner`/`manager` role gating pattern used by Services, HR, Files, and Finance.

**Finance "Customer Balances" unchanged** — stays as a Finance sub-item at `/dashboard/finance/customer-balances` (financial lens).

## 4. Verification Checklist

| Scenario | Expected |
|---|---|
| Stable owner/manager | Sees "Clients" (العملاء) in sidebar, opens `/dashboard/clients` |
| Lab owner/manager | Same — sees "Clients" in sidebar |
| Clinic owner/manager | Same |
| Doctor owner/manager | Same (plus existing doctor-specific nav) |
| Academy owner/manager | Same |
| Staff (not owner/manager) | "Clients" hidden (role gating) |
| Personal mode | "Clients" hidden (not in sidebar's org block) |
| Finance → Customer Balances | Unchanged, still under Finance group |
| No duplicate entries | "Clients" = CRM page, "Customer Balances" = financial balances |

