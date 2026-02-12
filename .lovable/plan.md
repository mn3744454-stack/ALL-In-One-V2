

# PWA Web Push Notifications -- Audit and Implementation Plan

---

## Section 0: Current State Audit

### 0.1 Notification Creation (DB Triggers)

All notification generation happens via DB triggers defined in `supabase/migrations/20260211160905_...sql`:

| Trigger | Table | Event | event_type value | Target tenant |
|---|---|---|---|---|
| `trg_notify_connection_created` | `connections` | AFTER INSERT | `connection.request_received` | recipient_tenant |
| `trg_notify_connection_status_change` | `connections` | AFTER UPDATE OF status | `connection.accepted` / `connection.rejected` | initiator_tenant |
| `trg_notify_lab_request_created` | `lab_requests` | AFTER INSERT | `lab_request.new` | lab_tenant |
| `trg_notify_lab_request_updated` | `lab_requests` | AFTER UPDATE | `lab_request.status_changed` / `lab_request.result_published` | initiator_tenant |
| `trg_notify_lab_request_message` | `lab_request_messages` | AFTER INSERT | `lab_request.message_added` | opposite tenant (sender logic) |

All triggers call `_notify_tenant_members()` which fans out INSERT into `notifications` table per active tenant member, with a 10-second dedup window.

### 0.2 Edge Functions (server routes)

- `supabase/functions/send-invitation-email/index.ts` -- sends email via Resend API for invitations
- `supabase/functions/send-ownership-notification/index.ts` -- ownership transfer emails
- `supabase/functions/shared-media-sign/index.ts` -- media signing
- `supabase/functions/expire-stale-connections/index.ts` -- cron cleanup
- `supabase/functions/backend-proxy/index.ts` -- proxy

**No push notification edge functions exist today.**

### 0.3 Client-Side Notification Handling

- `src/hooks/useNotifications.ts` -- fetches from `notifications` table, Realtime subscription on INSERT/UPDATE, provides `markAsRead`, `markAllAsRead`, `deleteNotification`
- `src/components/NotificationsPanel.tsx` -- Bell icon Sheet with nested tabs (Invitations sent/received + Notifications read/unread)
  - `getNotificationRoute()` (lines 82-98) maps event_type to deep-link URL
  - `getNotificationIcon()` (lines 75-80) maps event_type prefix to icon

### 0.4 Routing Map (`getNotificationRoute` at NotificationsPanel.tsx:82-98)

| event_type pattern | Route |
|---|---|
| `connection.*` | `/dashboard/laboratory?tab=requests` |
| `lab_request.message_added` | `/dashboard/laboratory?tab=requests&requestId={entity_id}&openThread=true` |
| `lab_request.*` (with entity_id) | `/dashboard/laboratory?tab=requests&requestId={entity_id}` |
| fallback | `/dashboard/laboratory?tab=requests` |

### 0.5 User/Tenant Context

- `src/contexts/AuthContext.tsx` -- `user` (from Supabase Auth), `profile` (from profiles table), `session`
- `src/contexts/TenantContext.tsx` -- `activeTenant` (TenantMembership with nested tenant), `activeRole`, `workspaceMode`
- `labMode` derived in `DashboardLaboratory.tsx` from tenant type

### 0.6 Relevant Tables

- **`notifications`**: `id`, `user_id`, `tenant_id`, `event_type`, `title`, `body`, `entity_type`, `entity_id`, `is_read`, `read_at`, `created_at`. RLS: user can SELECT/UPDATE/DELETE own. Realtime enabled. Immutable guard on core fields.
- **`tenant_members`**: `user_id`, `tenant_id`, `role`, `is_active`, `can_invite`, `can_manage_horses`
- **No `push_subscriptions` or `notification_preferences` tables exist.**

### 0.7 PWA Status

PWA is **currently disabled** in `vite.config.ts` (VitePWA plugin commented out). Service workers are **aggressively unregistered** on every app start in `src/main.tsx`. No service worker file exists for push.

### 0.8 Gaps

1. No push subscription storage
2. No notification preferences model
3. No VAPID keys configured
4. No push-sending edge function
5. No service worker for push events
6. PWA disabled -- must re-enable for push to work
7. `getNotificationRoute` only handles lab/connection events -- no invitation routing
8. No quiet hours / do-not-disturb support

---

## Section 1: Push Architecture

```text
+------------------+     +-------------------+     +--------------------+
|  DB Triggers     |     |  notifications    |     |  send-push-        |
|  (existing)      |---->|  table (INSERT)   |---->|  notification      |
|                  |     |                   |     |  Edge Function     |
+------------------+     +-------------------+     +--------------------+
                                                         |
                                   +---------------------+
                                   |
                          +--------v--------+
                          | For each device  |
                          | subscription:    |
                          |                  |
                          | 1. Check prefs   |
                          | 2. Check quiet   |
                          | 3. web-push send |
                          +---------+--------+
                                    |
                          +---------v--------+
                          |  Browser Push    |
                          |  Service (FCM /  |
                          |  APNs via WPN)   |
                          +--------+---------+
                                   |
                          +--------v---------+
                          |  Service Worker  |
                          |  (sw.js)         |
                          |  - push event    |
                          |  - notification  |
                          |    click handler |
                          +------------------+
```

**Components:**

1. **DB Triggers** (existing) -- write to `notifications` table (source of truth)
2. **DB Trigger on notifications INSERT** (NEW) -- calls `pg_net` to invoke edge function
3. **`send-push-notification` Edge Function** (NEW) -- receives notification row, queries `push_subscriptions` and `notification_preferences`, sends web-push via `web-push` library using VAPID keys
4. **Service Worker** (NEW, `public/sw.js`) -- handles `push` event (show OS notification) and `notificationclick` event (deep-link into app)
5. **Client Push Manager** (NEW) -- subscribes to push, stores subscription to DB, handles permission UX

**iOS Notes:**
- Web Push requires iOS 16.4+ and the app MUST be installed via "Add to Home Screen"
- Permission prompt only works when triggered by user gesture inside the installed PWA
- The service worker must be registered via the PWA manifest
- We will detect iOS and show a guided "Add to Home Screen" flow before requesting permission

**Android Notes:**
- Works in any Chromium browser without installation (though PWA install improves reliability)
- Permission prompt can be shown after user gesture

---

## Section 2: Data Model

### 2.1 `push_subscriptions` Table

```sql
CREATE TABLE public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  device_label  text,          -- e.g. "Chrome on Android", derived from user-agent
  platform      text,          -- 'android', 'ios', 'desktop', 'unknown'
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS: users manage own subscriptions only
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

User-scoped (not tenant-scoped) because a user receives notifications across all their tenants.

### 2.2 `notification_preferences` Table

```sql
CREATE TABLE public.notification_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,

  -- Per-category push toggles (all default true)
  push_messages     boolean NOT NULL DEFAULT true,
  push_results      boolean NOT NULL DEFAULT true,
  push_status       boolean NOT NULL DEFAULT true,
  push_invitations  boolean NOT NULL DEFAULT true,
  push_partnerships boolean NOT NULL DEFAULT true,

  -- In-app sound (play sound when notification arrives while app is open)
  in_app_sound      boolean NOT NULL DEFAULT true,

  -- Quiet hours (UTC-based, null = no quiet hours)
  quiet_start       time,       -- e.g. '22:00'
  quiet_end         time,       -- e.g. '07:00'
  quiet_timezone    text DEFAULT 'Asia/Riyadh',

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Category-to-event_type mapping** (used by edge function):

| Category column | event_type patterns |
|---|---|
| `push_messages` | `lab_request.message_added` |
| `push_results` | `lab_request.result_published` |
| `push_status` | `lab_request.new`, `lab_request.status_changed` |
| `push_invitations` | (future: `invitation.*`) |
| `push_partnerships` | `connection.*` |

**`shouldSendPush` logic** (in edge function):

```text
1. Map notification.event_type to preference column
2. If preference column is false -> skip
3. If quiet hours set:
   a. Convert current time to user's quiet_timezone
   b. If quiet_start <= current_time < quiet_end -> skip
      (handles overnight wrap: if start > end, quiet = start..midnight + midnight..end)
4. Send push to all active subscriptions for this user
```

### 2.3 Example Rows

**push_subscriptions:**
| user_id | endpoint | platform | is_active |
|---|---|---|---|
| abc-123 | https://fcm.googleapis.com/fcm/send/... | android | true |
| abc-123 | https://web.push.apple.com/... | ios | true |

**notification_preferences:**
| user_id | push_messages | push_results | quiet_start | quiet_end | quiet_timezone |
|---|---|---|---|---|---|
| abc-123 | true | true | 22:00 | 07:00 | Asia/Riyadh |

---

## Section 3: Triggering and Sending Flow

**Approach: DB trigger on `notifications` INSERT calls Edge Function via `pg_net`**

### Step-by-step flow:

1. Existing trigger (e.g. `trg_notify_lab_request_message`) fires and calls `_notify_tenant_members()`
2. `_notify_tenant_members()` INSERTs rows into `notifications` (one per user)
3. NEW trigger `trg_push_on_notification_insert` fires AFTER INSERT on `notifications`
4. This trigger calls `net.http_post()` (from `pg_net` extension) to invoke `send-push-notification` edge function with the notification row payload
5. Edge function:
   a. Validates payload (user_id, event_type)
   b. Queries `notification_preferences` for user -- checks category toggle
   c. Checks quiet hours
   d. If should send: queries `push_subscriptions` WHERE user_id AND is_active
   e. For each subscription: sends web-push using VAPID keys
   f. On 410 Gone / invalid endpoint: marks subscription `is_active = false`
   g. Returns success/partial counts

### Duplicate Prevention
- Already handled by `_notify_tenant_members()` 10-second dedup window
- Edge function is idempotent (sending same push twice is harmless but dedup prevents it)

### Retry/Failure Handling
- `pg_net` is fire-and-forget; if edge function fails, the in-app notification still exists
- Edge function logs failures; expired endpoints get deactivated (`is_active = false`)
- No retry queue needed for MVP (push is best-effort by nature)

### Multi-device
- Edge function loops all active subscriptions for the user and sends to each

---

## Section 4: Client Implementation

### 4.1 Permission UX

**When to ask:** After user logs in and navigates to dashboard for the first time (or from a dedicated settings page). Never on first page load before auth.

**Flow:**
1. Check `Notification.permission` state
2. If `'default'` (not yet asked): show a soft prompt banner/card: "Enable push notifications to stay updated on messages, results, and requests"
3. On user click "Enable": call `Notification.requestPermission()`
4. If granted: subscribe via `PushManager.subscribe()` with VAPID public key, save subscription to `push_subscriptions` table
5. If denied: hide banner, respect choice

**iOS flow:**
1. Detect iOS via user agent
2. Check if running in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`)
3. If not standalone: show guidance card "To receive notifications, install this app: tap Share > Add to Home Screen"
4. If standalone: proceed with normal permission flow

**Where in UI:**
- Soft prompt banner: `src/components/push/PushPermissionBanner.tsx` -- rendered in Dashboard layout after auth
- Settings page: Add "Notifications" section to `/dashboard/settings` with all preference toggles + push enable/disable + quiet hours
- `src/pages/DashboardNotificationSettings.tsx` (NEW) at route `/dashboard/settings/notifications`

### 4.2 Service Worker

**File: `public/sw.js`**

```text
push event handler:
  - Parse payload JSON: { title, body, icon, badge, data: { url, notificationId } }
  - Show notification via self.registration.showNotification(title, { body, icon, badge, data })

notificationclick handler:
  - Extract data.url from notification
  - Call clients.openWindow(data.url) or focus existing window
  - Close notification

Payload contract (sent from edge function):
{
  "title": "New message on lab request",
  "body": "Preview of message body...",
  "icon": "/icons/icon-192x192.png",
  "badge": "/icons/badge-72x72.png",
  "data": {
    "url": "/dashboard/laboratory?tab=requests&requestId=xxx&openThread=true",
    "notificationId": "notification-uuid"
  }
}
```

**Service worker registration** in `src/lib/pushManager.ts`:
- Register `sw.js` (NOT via VitePWA -- separate registration for push only)
- This avoids conflicts with the currently-disabled PWA caching

### 4.3 In-app + Push Reconciliation

- In-app notifications continue via existing Realtime subscription (`useNotifications.ts`)
- Push is additive -- it notifies users who are NOT currently in the app
- Unread badge count remains driven by the `notifications` table (source of truth)
- If push is disabled: user still sees all notifications in-app via the bell icon
- Clicking a push notification deep-links to the correct route (same routes as `getNotificationRoute`)
- On notification click, edge function payload includes `notificationId` so the service worker could optionally mark it read (stretch goal)

### 4.4 Re-enable PWA (conditional)

PWA re-enablement is **not strictly required** for push. We can register a minimal service worker (`sw.js`) for push only without the full VitePWA caching layer. This avoids the caching issues that led to PWA being disabled.

However, for iOS web push, the app MUST be "installed" (Add to Home Screen), which requires a valid web app manifest. We should add a minimal `manifest.json` without the VitePWA caching workbox -- just the manifest metadata for installability.

---

## Section 5: File Changes Summary

### New Files

| File | Purpose |
|---|---|
| `public/sw.js` | Service worker for push + notificationclick |
| `public/manifest.json` | Minimal PWA manifest for installability (iOS requirement) |
| `supabase/functions/send-push-notification/index.ts` | Edge function: receive notification, check prefs, send web-push |
| `src/lib/pushManager.ts` | Client-side push subscription management (register SW, subscribe, save to DB) |
| `src/components/push/PushPermissionBanner.tsx` | Soft prompt banner for enabling push |
| `src/hooks/usePushSubscription.ts` | Hook: manage push subscription state, register/unregister |
| `src/hooks/useNotificationPreferences.ts` | Hook: CRUD on notification_preferences table |
| `src/pages/DashboardNotificationSettings.tsx` | Full preferences page (categories, quiet hours, device management) |
| DB migration | Tables: `push_subscriptions`, `notification_preferences`, trigger `trg_push_on_notification_insert` |

### Modified Files

| File | Change |
|---|---|
| `supabase/config.toml` | Add `[functions.send-push-notification]` with `verify_jwt = false` |
| `src/App.tsx` | Add route `/dashboard/settings/notifications` |
| `src/main.tsx` | Remove aggressive SW unregistration (or scope it to exclude push SW) |
| `index.html` | Add `<link rel="manifest" href="/manifest.json">` |
| `src/components/NotificationsPanel.tsx` | Add link to notification settings; extend `getNotificationRoute` for invitation events |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Notification Settings" link under Settings |
| `src/i18n/locales/en.ts` | Push/preferences i18n keys |
| `src/i18n/locales/ar.ts` | Push/preferences i18n keys (Arabic) |

---

## Section 6: Phased Milestones

### Phase 1: Foundation (DB + Edge Function)
- Create `push_subscriptions` and `notification_preferences` tables with RLS
- Create `send-push-notification` edge function
- Create DB trigger on `notifications` INSERT to call edge function via `pg_net`
- Generate and store VAPID keys as secrets
- **Acceptance:** Edge function receives notification payload and logs it; tables exist with correct RLS

### Phase 2: Service Worker + Client Subscription
- Create `public/sw.js` with push + notificationclick handlers
- Create `public/manifest.json` (minimal, for installability)
- Update `index.html` with manifest link
- Create `src/lib/pushManager.ts` for subscription management
- Create `usePushSubscription` hook
- Fix `src/main.tsx` to not unregister the push service worker
- **Acceptance:** User can subscribe to push; subscription saved to DB; SW registered

### Phase 3: Permission UX + Preferences UI
- Create `PushPermissionBanner.tsx` soft prompt
- Create `DashboardNotificationSettings.tsx` with category toggles, quiet hours, device list
- Create `useNotificationPreferences` hook
- Add route and sidebar link
- i18n for EN + AR
- **Acceptance:** User can toggle categories, set quiet hours, see/remove devices

### Phase 4: End-to-End Push Delivery
- Wire edge function to actually send web-push (using `web-push` npm package for Deno)
- Implement preference checking + quiet hours logic in edge function
- Handle 410 Gone (deactivate subscription)
- Test with real Android + iOS devices
- **Acceptance:** Push notifications arrive on device with correct content; clicking opens correct deep-link; quiet hours respected; disabled categories not sent

### Phase 5: Polish + iOS Guidance
- iOS "Add to Home Screen" detection and guidance UI
- Extend `getNotificationRoute` for all event types (invitations, future modules)
- Badge icon for push notifications
- **Acceptance:** iOS users see install guidance; all event types route correctly

---

## Section 7: QA Checklist

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Push for new message | Send lab request message | Push arrives with message preview; click opens thread |
| 2 | Push for result published | Publish result on lab request | Push arrives; click opens request detail |
| 3 | Push for status change | Change lab request status | Push arrives with new status |
| 4 | Push for partnership request | Create connection request | Push arrives for recipient tenant members |
| 5 | Category toggle OFF | Disable "Messages" in prefs, send message | No push received; in-app notification still appears |
| 6 | Category toggle ON | Re-enable "Messages", send message | Push received |
| 7 | Quiet hours active | Set quiet 00:00-23:59, trigger notification | No push; in-app notification appears |
| 8 | Quiet hours inactive | Set quiet 03:00-04:00, trigger at 12:00 | Push received |
| 9 | Multi-device | Subscribe on 2 devices, trigger notification | Both devices receive push |
| 10 | Device removal | Remove a device from settings | That device stops receiving push |
| 11 | iOS not installed | Visit app in Safari iOS, check push | See "Add to Home Screen" guidance, no permission prompt |
| 12 | iOS installed PWA | Install via Add to Home Screen, enable push | Permission prompt appears, push works |
| 13 | Android browser | Visit app in Chrome Android, enable push | Works without installation |
| 14 | Route: message click | Click push for message_added | Opens `/dashboard/laboratory?tab=requests&requestId=X&openThread=true` |
| 15 | Route: result click | Click push for result_published | Opens `/dashboard/laboratory?tab=requests&requestId=X` |
| 16 | Route: connection click | Click push for connection.request_received | Opens `/dashboard/laboratory?tab=requests` |
| 17 | Expired endpoint | Simulate 410 from push service | Subscription marked `is_active = false` |
| 18 | Notification denied | User denies permission | Banner hides; no errors; in-app only |
| 19 | Push + in-app sync | Receive push while app is open | In-app badge updates via Realtime; no duplicate OS notification needed |
| 20 | Preferences page AR | Switch to Arabic, open notification settings | All labels in Arabic, RTL layout correct |

---

## Section 8: Open Questions

1. **VAPID keys:** I will generate a VAPID key pair and store as secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). The public key will also be exposed as `VITE_VAPID_PUBLIC_KEY` for client-side subscription. **Do you want me to generate these during implementation, or do you have existing keys?**

2. **pg_net extension:** The trigger-to-edge-function approach requires the `pg_net` extension. This is available on Supabase by default. If for any reason it is not enabled, an alternative is to use Supabase Database Webhooks (also trigger-based). **Shall I verify pg_net availability before proceeding?**

3. **Invitation notifications:** Currently invitations use a separate flow (email via Resend). Should invitation events (accepted/rejected/received) also generate rows in `notifications` table (and thus trigger push)? This would require adding new DB triggers on the `invitations` table. **Recommended: yes, add them in Phase 5.**

