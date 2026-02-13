

## Fix: Strip `useFocusRefresh` to Notifications-Only

### Problem

`useFocusRefresh` invalidates 10+ module query prefixes (horses, vet, lab, finance, orders, housing) every time the browser tab becomes visible. This triggers broad refetches that can remount components and close active dialogs/forms (e.g., Create Sample dialog disappears on tab return).

### Root Cause Verification

- `NotificationsPanel` calls `useNotifications()` at its top level (always mounted in headers across all dashboard pages), so the notifications query + realtime subscription are always active. The badge DOES have a live query.
- `useNotifications` already has its own realtime subscription for INSERT/UPDATE on the `notifications` table filtered by `user_id`. Badge updates should work without `useFocusRefresh` doing anything extra.
- `useTenantRealtimeSync` handles platform-wide CRUD updates across 20 tables with debounced, targeted invalidation. No visibility-based catch-up needed for those.

### Change: `src/hooks/useFocusRefresh.ts`

Strip all module prefix invalidations. On visibility recovery, only invalidate notifications with `refetchType: 'all'` (to ensure badge updates even if query is briefly inactive during a component transition).

**Before (lines 37-58):** Invalidates notifications + 10 module prefixes.

**After:** Only invalidates notifications.

```typescript
timerRef.current = setTimeout(() => {
  if (user?.id) {
    queryClient.invalidateQueries({
      queryKey: ['notifications'],
      refetchType: 'all',
    });
  }
}, DEBOUNCE_MS);
```

Remove:
- The `activeTenant` dependency and all tenant-scoped prefix invalidations
- The `useTenant` import
- The `activeTenant?.tenant_id` from the effect dependencies

Keep:
- The 250ms debounce
- The visibilitychange listener pattern
- The user-scoped guard (`if (user?.id)`)

### No Other Files Change

- `useTenantRealtimeSync.ts` -- no change needed (working correctly)
- `NotificationsPanel` -- no change needed (already mounts `useNotifications()` at top level)
- `useNotifications` -- no change needed (already has realtime subscription)
- `Dashboard.tsx` -- no change needed

### Test Checklist

1. Open a Create dialog (e.g., Add Horse or Create Sample), type data, switch browser tab, return -- dialog stays open, input remains
2. On mobile, switch to another app and back -- no reset, no reload
3. Notification badge updates when another session triggers a notification (without clicking bell)
4. After backgrounding for 30-60 seconds, badge catches up on return (via the minimal notifications invalidation)
5. Cross-session CRUD updates still appear via `useTenantRealtimeSync` realtime

