

# Fix Plan: Statement Date Labels + Full-Page Layout

## Findings & Root Cause

### Issue #1 — Missing "From / To" labels on date inputs

**Root cause:** `StatementScopeSelector.tsx` lines 124-137 render two `<Input type="date">` with only a dash `–` between them. No `<Label>` or text label exists. The same problem repeats in `ClientStatementTab.tsx` line 267 where the date range badge uses inline hardcoded strings (`من ... إلى` / `From ... To`) — but these aren't proper i18n keys.

**i18n keys available:** `clients.statement.scope` namespace has no `from`/`to` keys. However, existing keys exist at `sharing.dateFrom` ("From Date" / "من تاريخ") and `sharing.dateTo` ("To Date" / "إلى تاريخ"). Best approach: add dedicated keys under `clients.statement.scope.dateFrom` and `clients.statement.scope.dateTo`.

### Issue #2 — Statement constrained in a Sheet

**Root cause:** `DashboardClients.tsx` lines 267-281 wrap `ClientStatementTab` inside a `<Sheet>` with `className="w-full sm:max-w-2xl"`. This caps the width at 672px on desktop, leaving massive blank space. The Sheet also overlaps the Scope Selector Sheet (which is itself another Sheet), creating a double-sheet nesting problem.

**Chosen approach: Option 1 — Dedicated route** (`/dashboard/clients/:clientId/statement`)

Justification:
- Eliminates the Sheet constraint entirely
- Clean browser navigation (Back button works)
- Full viewport width for table
- Scope selector can remain a Sheet overlay on the full-page view
- No double-sheet nesting
- Consistent with how other detail pages work in the app

---

## Implementation Plan

### Step 1: Add i18n keys for From/To labels
- Add `clients.statement.scope.dateFrom` and `clients.statement.scope.dateTo` to both `en.ts` and `ar.ts`

**en.ts** (inside `clients.statement.scope`):
```
dateFrom: "From",
dateTo: "To",
```

**ar.ts** (inside `clients.statement.scope`):
```
dateFrom: "من",
dateTo: "إلى",
```

### Step 2: Add labels to StatementScopeSelector date inputs
Replace the date range section (lines 123-138) with labeled inputs:

```tsx
{/* Date range */}
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium min-w-[32px]">
      {t("clients.statement.scope.dateFrom")}
    </label>
    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1" />
  </div>
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium min-w-[32px]">
      {t("clients.statement.scope.dateTo")}
    </label>
    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1" />
  </div>
</div>
```

### Step 3: Fix statement header badge to use i18n keys
In `ClientStatementTab.tsx` line 267, replace hardcoded strings:
```tsx
<Badge variant="outline" className="font-mono text-xs" dir="ltr">
  {t("clients.statement.scope.dateFrom")} {scopeConfig.dateFrom} {t("clients.statement.scope.dateTo")} {scopeConfig.dateTo}
</Badge>
```

### Step 4: Create dedicated Statement page
Create `src/pages/DashboardClientStatement.tsx`:
- Read `clientId` from route params
- Fetch client name from `useClients` or direct query
- Render `ClientStatementTab` at full page width
- Include Back button to `/dashboard/clients`
- Include `MobilePageHeader` for mobile nav

### Step 5: Add route to App.tsx
```tsx
<Route path="/dashboard/clients/:clientId/statement" element={
  <ProtectedRoute><WorkspaceRouteGuard requiredMode="organization">
    <DashboardClientStatement />
  </WorkspaceRouteGuard></ProtectedRoute>
} />
```

### Step 6: Replace Sheet in DashboardClients with navigation
In `DashboardClients.tsx`:
- Remove the entire `<Sheet>` block (lines 266-281)
- Change `setStatementClient(client)` calls to `navigate(`/dashboard/clients/${client.id}/statement`)`
- Remove `statementClient` state variable and Sheet imports

### Step 7: Same fix for FinanceCustomerBalances.tsx
Apply the same navigation approach if it also wraps statement in a Sheet.

---

## Files Changed

| File | Change |
|------|--------|
| `src/i18n/locales/en.ts` | Add `dateFrom`, `dateTo` keys under `clients.statement.scope` |
| `src/i18n/locales/ar.ts` | Add `dateFrom`, `dateTo` keys under `clients.statement.scope` |
| `src/components/clients/StatementScopeSelector.tsx` | Add From/To labels to date inputs |
| `src/components/clients/ClientStatementTab.tsx` | Fix badge to use i18n keys |
| `src/pages/DashboardClientStatement.tsx` | **NEW** — full-page statement route |
| `src/App.tsx` | Add route `/dashboard/clients/:clientId/statement` |
| `src/pages/DashboardClients.tsx` | Remove Sheet, navigate to route instead |
| `src/pages/finance/FinanceCustomerBalances.tsx` | Same Sheet→route fix |

---

## Verification Checklist

**Desktop:**
1. Go to Clients → click Statement action on any client → browser navigates to `/dashboard/clients/:id/statement`
2. Scope Selector opens with clear "From" / "To" labels (Arabic: "من" / "إلى")
3. Generate statement → full-width table fills viewport, no blank empty space
4. Date range badge in header shows "From YYYY-MM-DD To YYYY-MM-DD" (or Arabic equivalent)
5. Print/CSV/PDF buttons work from full-page view
6. Back button returns to Clients list

**Mobile:**
1. Same flow — statement renders full-width stacked cards
2. No horizontal scroll
3. Scope selector Sheet covers screen properly
4. Date labels readable and properly aligned in RTL

