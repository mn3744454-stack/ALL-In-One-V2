

# Final Authoritative Execution Plan

---

## Subphase A: Fix Stable Results Tab Gating + In-Place Dialog

### Files to change
- `src/pages/DashboardLaboratory.tsx`
- `src/components/laboratory/RequestDetailDialog.tsx` (NEW)
- `src/components/laboratory/LabRequestsTab.tsx`
- `src/components/laboratory/StableResultsView.tsx`

### Code actions

**A.1 -- Extract RequestDetailDialog to shared file**

Create `src/components/laboratory/RequestDetailDialog.tsx` containing the `RequestDetailDialog` function (currently at LabRequestsTab.tsx lines 499-723) and its helper `RequestStatusBadge` (lines 45-56). Export both. All imports the function currently uses (useLabRequests, useModuleAccess, useI18n, UI components, icons, format) must be included.

Props interface (unchanged from current):
```typescript
interface RequestDetailDialogProps {
  request: LabRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  canCreateInvoice: boolean;
  onGenerateInvoice: () => void;
}
```

**A.2 -- Update LabRequestsTab.tsx**

- Remove the internal `RequestDetailDialog` function (lines 499-723) and `RequestStatusBadge` (lines 45-56).
- Add import: `import { RequestDetailDialog, RequestStatusBadge } from "./RequestDetailDialog";`
- Everything else unchanged.

**A.3 -- Gate full-mode Results TabsContent**

In `DashboardLaboratory.tsx`, wrap lines 291-299:

```
Before:  <TabsContent value="results">
After:   {labMode === 'full' && <TabsContent value="results">
```

Close with `}` after the closing `</TabsContent>`.

**A.4 -- StableResultsView: in-place dialog**

- Remove `onRequestClick` prop entirely.
- Add internal state: `detailRequest`, `detailOpen`.
- Import and render `RequestDetailDialog` inside the component.
- On card click: `setDetailRequest(r); setDetailOpen(true);`
- No URL navigation whatsoever.
- Remove `onRequestClick` prop from DashboardLaboratory.tsx (lines 259-264 become just `<StableResultsView />`).

### Acceptance criteria
- Stable tenant on `?tab=results` sees `StableResultsView` cards, NOT `ResultsList`.
- Clicking a result card opens `RequestDetailDialog` on "details" tab without changing the page tab.
- Closing the dialog returns to Results tab, no tab change.
- Lab tenant on `?tab=results` still sees `ResultsList`.

### Manual test steps
1. Log in as stable tenant.
2. Navigate to `/dashboard/laboratory?tab=results`.
3. Verify: card-based UI with horse name, test description, result link. NOT the full-mode ResultsList with create button.
4. Click a result card -- dialog opens, URL still shows `tab=results`.
5. Close dialog -- still on Results tab.
6. Switch to lab tenant, verify `?tab=results` shows `ResultsList`.

---

## Subphase B: Fix Messages Tab In-Place Dialog (No Tab Jump)

### Files to change
- `src/components/laboratory/StableMessagesView.tsx`
- `src/pages/DashboardLaboratory.tsx`

### Code actions

**B.1 -- StableMessagesView: in-place dialog**

- Remove `onThreadClick` prop.
- Add `useLabRequests` import to fetch full request data (needed for `RequestDetailDialog`).
- Add internal state: `selectedRequestId`, `detailOpen`.
- On thread card click: set `selectedRequestId` and `detailOpen = true`.
- Derive `detailRequest` from `requests.find(r => r.id === selectedRequestId)`.
- Render `RequestDetailDialog` with `defaultTab="thread"`.
- Import `RequestDetailDialog` from `./RequestDetailDialog`.
- Permission: `canCreateInvoice` derived from `useTenant().activeRole` (owner/manager).
- No URL navigation.

**B.2 -- DashboardLaboratory.tsx: simplify Messages TabsContent**

Lines 270-281: Remove the `onThreadClick` handler. Simply render `<StableMessagesView />` with no props.

### Acceptance criteria
- Clicking a thread in Messages tab opens `RequestDetailDialog` on "thread" panel.
- URL remains `tab=messages` throughout.
- Closing dialog returns to Messages list, no tab change.

### Manual test steps
1. Navigate to `/dashboard/laboratory?tab=messages`.
2. Click a thread card.
3. Verify: dialog opens with Messages/thread tab active.
4. Verify: browser URL still shows `tab=messages`.
5. Close dialog -- Messages list visible, tab unchanged.

---

## Subphase C: Add View Toggle (Desktop Only)

### Files to change
- `src/components/laboratory/LabRequestsTab.tsx`
- `src/components/laboratory/StableResultsView.tsx`
- `src/components/laboratory/StableMessagesView.tsx`

### Code actions

**C.1 -- LabRequestsTab**

- Import `ViewSwitcher`, `getGridClass` from `@/components/ui/ViewSwitcher` and `useViewPreference` from `@/hooks/useViewPreference`.
- Add: `const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-requests');`
- Place `<ViewSwitcher>` in the filter bar area (after status Select, line 1106), wrapped in `<div className="hidden lg:flex">` for desktop only.
- Replace the hardcoded grid class `"grid gap-4 md:grid-cols-2 lg:grid-cols-3"` (line 1123) with `getGridClass(gridColumns, viewMode)`.
- For table mode: render a simple `<table>` with columns: Horse | Test/Service | Status | Date | Actions (open detail button). Reuse `RequestStatusBadge`.
- `showTable={true}` on ViewSwitcher.

**C.2 -- StableResultsView**

- Same imports as C.1.
- `useViewPreference('lab-stable-results')`
- Place `<ViewSwitcher>` next to the search input in the header (desktop only).
- Replace hardcoded grid class `"grid gap-3 sm:grid-cols-2 lg:grid-cols-3"` (line 69) with `getGridClass(gridColumns, viewMode)`.
- Table mode: Horse | Test | Lab | Date | Result Link.

**C.3 -- StableMessagesView**

- Same imports as C.1.
- `useViewPreference('lab-messages')`
- Place `<ViewSwitcher>` in the header area (desktop only).
- Replace `"space-y-2"` (line 44) with `getGridClass(gridColumns, viewMode)` for grid/list modes.
- Table mode: Horse | Test | Last Message | Count | Time.

### Acceptance criteria
- Desktop: Table/List/Grid toggle visible on all three views.
- Mobile: toggle hidden, default layout used.
- Preference persists on reload (localStorage).
- Table mode shows consistent minimal columns.
- Grid/List modes use responsive column layout.

### Manual test steps
1. Desktop: navigate to Requests tab, verify toggle visible.
2. Switch between Table/List/Grid -- layout changes.
3. Reload page -- preference persists.
4. Repeat for Results and Messages tabs.
5. Mobile viewport: verify toggle is hidden.

---

## Subphase D: Fix RPC + Update Hook + Use horse_name_ar

### Changes
- Database migration (CREATE OR REPLACE FUNCTION)
- `src/hooks/laboratory/useLabRequestThreads.ts`
- `src/components/laboratory/StableMessagesView.tsx`

### Code actions

**D.1 -- Database migration**

```sql
CREATE OR REPLACE FUNCTION public.get_lab_request_threads()
RETURNS TABLE (
  request_id uuid,
  horse_name text,
  horse_name_ar text,
  test_description text,
  last_message_body text,
  last_message_at timestamptz,
  last_sender_tenant_id uuid,
  message_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lr.id AS request_id,
    h.name AS horse_name,
    h.name_ar AS horse_name_ar,
    lr.test_description,
    lm.body AS last_message_body,
    lm.created_at AS last_message_at,
    lm.sender_tenant_id AS last_sender_tenant_id,
    (SELECT count(*) FROM lab_request_messages WHERE request_id = lr.id) AS message_count
  FROM lab_requests lr
  JOIN horses h ON h.id = lr.horse_id
  JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_tenant_id
    FROM lab_request_messages m
    WHERE m.request_id = lr.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
  )
  ORDER BY lm.created_at DESC
  LIMIT 50;
$$;
```

Key corrections:
- `message_count` uses subquery `(SELECT count(*) ...)` instead of broken `count(*) OVER()` with LIMIT 1.
- Added `horse_name_ar` return column.
- LATERAL join no longer carries count -- only fetches latest message fields.
- Security: NO parameter, derives access from `auth.uid()` via `tenant_members`.

**D.2 -- Update useLabRequestThreads.ts**

Add `horse_name_ar: string | null;` to the `LabRequestThread` interface.

**D.3 -- Update StableMessagesView.tsx**

Use `horse_name_ar` in RTL mode:

```tsx
const displayName = dir === 'rtl' && thread.horse_name_ar
  ? thread.horse_name_ar
  : thread.horse_name;
```

Import `useI18n` for `dir` (already imported for `t`).

### Acceptance criteria
- RPC returns correct message_count (e.g., 5 messages shows "5", not "1").
- `horse_name_ar` returned and displayed in Arabic UI.
- Security: only requests where user is member of either tenant are returned.

### Manual test steps
1. Create 3+ messages on a single request thread.
2. Navigate to Messages tab.
3. Verify badge shows correct count (e.g., "3 messages").
4. Switch to Arabic -- verify horse name shows Arabic variant.
5. Log in as unrelated user -- verify no threads visible.

---

## Files Summary

| File | Action |
|---|---|
| `src/components/laboratory/RequestDetailDialog.tsx` | CREATE (extracted from LabRequestsTab) |
| `src/components/laboratory/LabRequestsTab.tsx` | EDIT (remove internal dialog, add ViewSwitcher) |
| `src/pages/DashboardLaboratory.tsx` | EDIT (gate full-mode results, simplify Results/Messages handlers) |
| `src/components/laboratory/StableResultsView.tsx` | EDIT (in-place dialog, ViewSwitcher) |
| `src/components/laboratory/StableMessagesView.tsx` | EDIT (in-place dialog, ViewSwitcher, horse_name_ar) |
| `src/hooks/laboratory/useLabRequestThreads.ts` | EDIT (add horse_name_ar) |
| DB Migration | CREATE OR REPLACE get_lab_request_threads() |

---

## QA Checklist

| # | Issue | Test | Expected |
|---|---|---|---|
| 1 | Stable Results wrong UI | Stable tenant, `?tab=results` | StableResultsView cards, NOT ResultsList |
| 2 | Results dialog tab jump | Click result card | Dialog opens, URL stays `tab=results` |
| 3 | Messages dialog tab jump | Click thread card | Dialog opens on thread tab, URL stays `tab=messages` |
| 4 | Messages dialog close | Close dialog from Messages | Returns to Messages list, no tab change |
| 5 | Lab Full Mode results | Lab tenant, `?tab=results` | Still shows ResultsList |
| 6 | View toggle desktop | All 3 tabs on desktop | Toggle visible, functional, persistent |
| 7 | View toggle mobile | All 3 tabs on mobile | Toggle hidden |
| 8 | RPC message_count | Thread with N messages | Badge shows N (not 1) |
| 9 | RPC horse_name_ar | Arabic UI | Arabic horse name displayed |
| 10 | RPC security | Unrelated user | No threads visible |

