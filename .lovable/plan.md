
## Implementation Plan

### Part 1: Database Migration
Add `notifications` and `lab_request_messages` to `supabase_realtime` publication (idempotent SQL).

### Part 2: Add Realtime Subscription Logging
- `src/hooks/useNotifications.ts` line 76: Change `.subscribe()` to `.subscribe((status) => console.log('[NotificationsRealtime]', status))`
- `src/hooks/laboratory/useLabRequestMessages.ts` line 61: Change `.subscribe()` to `.subscribe((status) => console.log('[LabMessagesRealtime]', status))`

### Part 3: Dialog Persistence
The `CreateSampleDialog` is already unconditionally rendered (always mounted when `labMode === 'full'`). No conditional rendering wraps it. The dialog close regression was caused by the aggressive `useFocusRefresh` invalidations (already fixed in the previous change). No further changes needed here.

### Files Changed
1. Database migration (SQL)
2. `src/hooks/useNotifications.ts` (1 line: subscription logging)
3. `src/hooks/laboratory/useLabRequestMessages.ts` (1 line: subscription logging)
