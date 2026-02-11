
# Post-Phase QA Hotfixes

## A) i18n Fixes

### NotificationsPanel.tsx (~40 hardcoded strings)
All English strings will be replaced with `t(...)` calls using new `notifications.*` keys:
- Panel title/subtitle: "Notifications" / "Stay updated..."
- Main tabs: "Notifications", "Invitations" 
- Sub-tabs: "Unread", "Read", "Received", "Sent"
- Actions: "Mark all as read", "Mark as read", "Delete", "Invite", "Send Invitation", "Copy Link", "Revoke", "Cancel", "Confirm Decline"
- Empty states: "No unread notifications", "No read notifications", "No pending invitations", "No invitations sent yet"
- Invite dialog: "Invite Team Member", "Send an invitation to join...", "Email Address", "Role", "Assign Horses (optional)"
- Revoke dialog: "Revoke Invitation", "Are you sure?..."
- Role labels: Owner, Administrator, Manager, etc.
- Toast messages

### LabRequestThread.tsx (5 hardcoded strings)
- "No messages yet. Start the conversation."
- "Type a message..."
- "Team" / "Partner" labels

### LabRequestsTab.tsx (missing i18n keys)
Add these keys that are used but don't exist in locale files:
- `laboratory.requests.messages` -- "Messages" / "الرسائل"
- `laboratory.requests.selectedServices` -- "Selected Services" / "الخدمات المختارة"  
- `laboratory.requests.openThread` -- "Open thread" / "فتح المحادثة"

Also fix the Partnership Inbox section which has hardcoded English like "connected", "pending", "Sent", "Received".

### i18n locale files (en.ts + ar.ts)
Add ~50 new keys under `notifications.*` namespace and add missing `laboratory.requests.*` keys.

## B) Notification Click Routing

The current `getNotificationRoute()` logic is already correct:
- `lab_request.message_added` routes to `?tab=requests&requestId={entity_id}&openThread=true`
- Other `lab_request.*` routes to `?tab=requests&requestId={entity_id}`
- The trigger stores `request_id` as `entity_id` for messages (correct)

Verification: The `LabRequestsTab` useEffect reads `requestId` and `openThread` params correctly and opens the detail dialog. No code changes needed here -- the routing is sound.

## C) Desktop Click Fix

`RequestCard` already has `onClick={onOpenDetail}` and `cursor-pointer` on the Card. The grid renders these cards at line 1036-1046. Nested buttons already use `e.stopPropagation()`. This appears to be working -- the issue may be that the detail dialog state wasn't being set. Will verify the wiring is correct and add `role="button"` for accessibility.

## D) Mobile Layout Improvements

1. **NotificationsPanel Sheet**: Add responsive width class `w-[95vw] sm:w-[400px]` to SheetContent
2. **RequestDetailDialog**: Ensure mobile-friendly sizing with `w-[95vw]` and proper scroll areas

## Files to Change

| File | Changes |
|------|---------|
| `src/components/NotificationsPanel.tsx` | Replace all hardcoded English with `t(...)`, add `useI18n`, mobile width |
| `src/components/laboratory/LabRequestThread.tsx` | Replace hardcoded strings with `t(...)` |
| `src/components/laboratory/LabRequestsTab.tsx` | Fix missing i18n keys usage, hardcoded "connected"/"pending", mobile dialog width |
| `src/i18n/locales/en.ts` | Add ~50 keys: `notifications.*`, missing `laboratory.requests.*` |
| `src/i18n/locales/ar.ts` | Arabic translations for all new keys |

## New i18n Keys (summary)

**notifications namespace:**
- `notifications.title`, `notifications.subtitle`
- `notifications.tabs.notifications`, `notifications.tabs.invitations`
- `notifications.unread`, `notifications.read`, `notifications.received`, `notifications.sent`
- `notifications.markAllAsRead`, `notifications.markAsRead`, `notifications.delete`
- `notifications.noUnread`, `notifications.noRead`, `notifications.noInvitations`, `notifications.noSentInvitations`
- `notifications.invite`, `notifications.inviteTitle`, `notifications.inviteDescription`
- `notifications.emailAddress`, `notifications.role`, `notifications.assignHorses`
- `notifications.sendInvitation`, `notifications.copyLink`, `notifications.revoke`
- `notifications.revokeTitle`, `notifications.revokeDescription`
- `notifications.confirmDecline`, `notifications.cancel`
- `notifications.declineReason`, `notifications.from`
- Role labels under `notifications.roles.*`

**laboratory.requests additions:**
- `messages`, `selectedServices`, `openThread`
- `noMessages`, `typeMessage`, `team`, `partner`
- `connected`, `pending` (for partnership inbox badges)

## Verification Plan

1. Arabic mode: Every string in NotificationsPanel, LabRequestThread, and LabRequestsTab detail dialog will use `t(...)` with proper Arabic translations
2. Routing: Already verified -- `getNotificationRoute` correctly handles all event types
3. Desktop clicks: Already wired with `onOpenDetail` and `stopPropagation` on nested buttons
4. Mobile: Sheet width expanded, dialog responsive
