

## Prove Realtime Delivery + Stabilize Dialog

### Overview
Add event payload logging to realtime hooks, create a temporary dev-only debug panel for end-to-end proof, and add mount/unmount logging to DashboardLaboratory.

---

### Part 1: Event Payload Logging

**File: `src/hooks/useNotifications.ts`**
- In the INSERT callback (line 60-62), log the payload before invalidating:
  ```
  console.log('[NotificationsRealtime:event]', payload.eventType, payload.new?.id, payload.new?.is_read);
  ```
- In the UPDATE callback (line 72-74), same pattern.
- Both callbacks already call `queryClient.invalidateQueries` -- keep that, just add the log line before it.

**File: `src/hooks/laboratory/useLabRequestMessages.ts`**
- In the INSERT callback (line 53-58), add before setQueryData:
  ```
  console.log('[LabMessagesRealtime:event]', payload.eventType, payload.new?.id, payload.new?.request_id);
  ```

---

### Part 2: Temporary Debug Panel (DEV only)

**New file: `src/components/debug/RealtimeDebugPanel.tsx`**
- Floating panel (bottom-right, collapsible) only rendered when `import.meta.env.DEV` is true.
- Shows: current user ID, active tenant ID, last notification event timestamp, last lab message event timestamp.
- Two buttons:
  - "Create Test Notification": inserts a minimal row into `notifications` for the current user (title: "Test notification", is_read: false).
  - "Create Test Lab Message": only enabled when a `requestId` URL param exists; inserts a minimal message into `lab_request_messages`.
- Uses the existing supabase client for inserts.

**Mount location: `src/pages/Dashboard.tsx`**
- Import and render `<RealtimeDebugPanel />` conditionally: `{import.meta.env.DEV && <RealtimeDebugPanel />}`
- Also mount in `src/pages/DashboardLaboratory.tsx` the same way.

---

### Part 3: Mount/Unmount Logging for DashboardLaboratory

**File: `src/pages/DashboardLaboratory.tsx`**
- Add a `useEffect` at the top of the component:
  ```
  useEffect(() => {
    console.log('[DashboardLaboratory] mount');
    return () => console.log('[DashboardLaboratory] unmount');
  }, []);
  ```
- This proves whether tab switching causes a full remount (which would reset `createSampleOpen` state).

---

### Part 4: Dialog Already Unconditional (No Change Needed)

The `CreateSampleDialog` is rendered inside `{labMode === 'full' && (...)}` which is stable -- it doesn't depend on `createSampleOpen`. The dialog component itself handles open/close via props. No wrapping in `{createSampleOpen && ...}` exists. No change required.

---

### Files Changed

| File | Action |
|------|--------|
| `src/hooks/useNotifications.ts` | Add payload logging to INSERT/UPDATE callbacks |
| `src/hooks/laboratory/useLabRequestMessages.ts` | Add payload logging to INSERT callback |
| `src/components/debug/RealtimeDebugPanel.tsx` | New file -- dev-only debug panel |
| `src/pages/Dashboard.tsx` | Mount debug panel (DEV only) |
| `src/pages/DashboardLaboratory.tsx` | Mount debug panel (DEV only) + add mount/unmount useEffect |

### Test Checklist

1. Click "Create Test Notification" in debug panel -- see `[NotificationsRealtime:event]` in console + badge increments without clicking bell
2. Navigate to a lab request thread, click "Create Test Lab Message" -- see `[LabMessagesRealtime:event]` in console + message appears instantly
3. Open Create Sample dialog, switch browser tab, return -- dialog stays open, no `[DashboardLaboratory] unmount` log appears
4. Debug panel is invisible in production builds

