# Notifications, In-Context Partnership Inbox, and Lab Request Messaging

## Complete Audit Report and Phased Execution Plan

---

## Deliverable 1: Audit Report

### Current State

**Existing notification-like infrastructure:**

- `InvitationsPanel` (Bell icon + Sheet) exists in 7 dashboard pages but NOT in `DashboardLaboratory.tsx`. It uses `useInvitations` hook with Realtime on the `invitations` table. Pattern: Bell icon with unread badge, Sheet side-panel with Received/Sent tabs.

- `ConnectionMessagesDialog` + `useConnectionMessages` provides a chat thread per `connection_id` with Realtime. Reusable pattern for lab request messaging.

- **No `notifications` table exists.** No `lab_request_messages` table exists. No unread tracking infrastructure.

**Stable Lab Requests flow `LabRequestsTab.tsx`):**

- `CreateRequestDialog` has three mutually exclusive UI states for the "platform lab" section:

  1. `pendingLabPartners.length > 0 && labPartners.length === 0` -- shows pending card ONLY (no picker, no "connect another")

  2. `labPartners.length === 0 && pendingLabPartners.length === 0` -- shows "connect to lab" CTA

  3. `labPartners.length > 0` -- shows picker + catalog, but NO "connect another" button, NO pending banner

**Root causes of UX symptoms:**

- **Screenshot 47 (only one lab, no "connect another"):** Line 332 condition `labPartners.length > 0` renders ONLY the picker with no additional CTA. The "connect" button only appears when `labPartners.length === 0`.

- **Screenshot 46 (missing tabs for Stable):** `DashboardLaboratory.tsx` line 60-63 restricts `labMode === 'requests'` to `['requests', 'settings']`. This is intentional by design.

- **Catalog clipping:** `LabCatalogViewer` renders unbounded inside the modal body. The services list grows without its own scroll boundary, pushing form fields below it out of view.

- **Create button disabled after selecting service:** The validation logic (line 165-174) looks correct. The issue was previously in `AddPartnerDialog` missing `typeFilter` in its `useEffect` dependency array (line 76), which has been partially fixed but `typeFilter` is still missing from the deps array.

- **No notification bell on Laboratory page:** `DashboardLaboratory.tsx` does not import or render `InvitationsPanel`.

- **Partnership status only visible in Settings:** There is no in-context partnership status section inside the Lab Requests tab.

**Top-level UX principle:** The user must complete the entire workflow (connect lab, check partnership status, view catalog, create request, exchange messages) inside the Laboratory context without navigating to Settings > Connections.

### Database FK Decision (Safety-First)

Because notification delivery must be resilient (and must not depend on the existence/timing of `profiles` rows), **we will NOT enforce a foreign key** from `notifications.user_id` to `public.profiles(id)`. We will store `user_id uuid NOT NULL` and enforce access strictly via RLS `user_id = auth.uid()`).

This avoids edge cases where a missing/delayed `profiles` row would cause notification inserts to fail. Notifications are ephemeral; referential integrity here is less important than reliability.

---

## Deliverable 2: Phased Execution Plan

### Phase 0 -- Database Foundation

**Tables, RLS, triggers, Realtime -- one migration.**

#### Schema: `notifications`

```text

notifications

  id              uuid PK default gen_random_uuid()

  user_id         uuid NOT NULL                      -- no FK (resilience)

  tenant_id       uuid REFERENCES public.tenants(id) ON DELETE CASCADE  -- context tenant (nullable for cross-tenant)

  event_type      text NOT NULL  -- convention-based, not enum

  title           text NOT NULL

  body            text

  entity_type     text           -- 'connection' | 'lab_request' | 'lab_request_message'

  entity_id       uuid           -- FK-less reference to the related record

  is_read         boolean NOT NULL DEFAULT false

  read_at         timestamptz

  created_at      timestamptz NOT NULL DEFAULT now()

Index: (user_id, is_read, created_at DESC) for bell badge queries.

Schema: lab_request_messages

lab_request_messages

  id                uuid PK default gen_random_uuid()

  request_id        uuid NOT NULL REFERENCES public.lab_requests(id) ON DELETE CASCADE

  sender_user_id    uuid NOT NULL  -- no FK to auth.users; validated by RLS via auth.uid()

  sender_tenant_id  uuid REFERENCES public.tenants(id)

  body              text NOT NULL

  created_at        timestamptz NOT NULL DEFAULT now()

Index: (request_id, created_at ASC).

Event Types (convention, not Postgres enum)

connection.request_received      -- new pending connection

connection.accepted              -- connection accepted

connection.rejected              -- connection rejected

lab_[request.new](http://request.new)                  -- new lab request for lab tenant

lab_request.status_changed       -- status update for initiator tenant

lab_request.result_published     -- result_url or result_file_path set

lab_request.message_added        -- new message on a request thread

RLS Policies

notifications:

SELECT: user_id = auth.uid()

UPDATE (is_read, read_at only): user_id = auth.uid()

INSERT: none (trigger-only inserts; deny direct client insert)

DELETE: user_id = auth.uid() (allow users to dismiss)

lab_request_messages:

SELECT: user is active member of either initiator_tenant_id or lab_tenant_id on the parent lab_requests row

INSERT: same membership check + sender_user_id = auth.uid()

UPDATE/DELETE: none (immutable)

Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_request_messages;

Recipient Rules (Exact)

Trigger Event	Target Table	Condition	Recipients	Event Type

connections INSERT (status='pending')	connections	always	Active members of recipient_tenant_id	connection.request_received

connections UPDATE status to 'accepted'	connections	old.status='pending'	Active members of initiator_tenant_id	connection.accepted

connections UPDATE status to 'rejected'	connections	old.status='pending'	Active members of initiator_tenant_id	connection.rejected

lab_requests INSERT	lab_requests	lab_tenant_id IS NOT NULL	Active members of lab_tenant_id	lab_[request.new](http://request.new)

lab_requests UPDATE status	lab_requests	NEW.status IS DISTINCT FROM OLD.status	Active members of initiator_tenant_id	lab_request.status_changed

lab_requests UPDATE result_url/result_file_path	lab_requests	value changed from NULL to non-NULL	Active members of initiator_tenant_id	lab_request.result_published

lab_request_messages INSERT	lab_request_messages	always	Active members of the OTHER tenant (if sender is in initiator tenant, notify lab tenant members; vice versa). Exclude the sender themselves.	lab_request.message_added

Fan-out policy: Insert one notification row per active tenant_members member of the target tenant. For MVP this is acceptable (most tenants have <10 members). A RAISE NOTICE warning is logged if fan-out exceeds 50 members for a single event.

Duplicate prevention (anti-double-fire): Each trigger checks

NOT EXISTS (SELECT 1 FROM notifications WHERE entity_id = X AND event_type = Y AND user_id = Z AND created_at > now() - interval '10 seconds')

before inserting, to prevent rapid re-fires while avoiding suppressing legitimate quick successive events.

Non-Blocking Trigger Pattern

Every trigger function uses this structure:

CREATE OR REPLACE FUNCTION public.notify_on_XXXX()

RETURNS TRIGGER LANGUAGE plpgsql

SECURITY DEFINER SET search_path = public

AS $$

BEGIN

  BEGIN

    -- notification insert logic here

  EXCEPTION WHEN OTHERS THEN

    RAISE NOTICE 'notify_on_XXXX failed: %', SQLERRM;

  END;

  RETURN COALESCE(NEW, OLD);

END;

$$;

This ensures the primary operation (connection accept, lab request create, etc.) NEVER fails due to a notification insert error.

Click Routing (Deep-Link Map)

Event Type	entity_type	Click Action

connection.request_received	connection	Navigate to /dashboard/laboratory?tab=requests, highlight the inline Partnership Inbox section (fallback: /dashboard/settings/connections)

connection.accepted	connection	Navigate to /dashboard/laboratory?tab=requests (user can now create requests) (fallback: /dashboard/settings/connections)

connection.rejected	connection	Navigate to /dashboard/laboratory?tab=requests (fallback: /dashboard/settings/connections)

lab_[request.new](http://request.new)	lab_request	Navigate to /dashboard/laboratory?tab=requests&requestId={entity_id}

lab_request.status_changed	lab_request	Navigate to /dashboard/laboratory?tab=requests&requestId={entity_id}

lab_request.result_published	lab_request	Navigate to /dashboard/laboratory?tab=requests&requestId={entity_id}

lab_request.message_added	lab_request_message	Navigate to /dashboard/laboratory?tab=requests&requestId={parent_request_id}&openThread=true

Migration SQL

The full migration will be generated as a single .sql file containing:

CREATE TABLE notifications (with index)

CREATE TABLE lab_request_messages (with index)

RLS ENABLE + policies for both tables

ALTER PUBLICATION for Realtime

5 trigger functions (all non-blocking)

5 triggers attached to connections, lab_requests, lab_request_messages

Phase 1 -- Unified Notifications UI + In-Context Partnership Inbox (MVP)

1A. Notification Hook: src/hooks/useNotifications.ts (NEW)

Query notifications WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 50

Computed unreadCount

markAsRead(id) mutation: UPDATE is_read = true, read_at = now()

markAllAsRead() mutation: UPDATE all unread for auth.uid()

Realtime subscription filtered by user_id for instant updates

1B. Unified Bell Component: src/components/NotificationsPanel.tsx (NEW)

Single Bell icon with combined unread count (invitations + notifications)

Sheet side-panel with two tabs:

Invitations tab: renders the existing InvitationsPanel content (extracted as inner component)

Notifications tab: list of notification cards with:

Icon per event_type (Link2 for connections, FlaskConical for lab requests, MessageSquare for messages)

Title + body

Relative timestamp

Click: uses the routing map above to navigate

"Mark as read" per item

"Mark all as read" button at top

Replaces <InvitationsPanel /> in all dashboard pages

1C. In-Context Partnership Inbox: Inside LabRequestsTab.tsx

Add a new collapsible section at the top of the LabRequestsTab component (above the search/filter bar), visible ONLY for stable tenants (labMode === 'requests'). This section:

Connected Labs subsection: shows accepted lab partners as compact cards (lab name + type badge)

Pending Partnerships subsection: shows pending connection requests (sent/received) with:

Status badge (Pending / Sent)

Partner name

"Refresh" button (calls refetchConnections)

For received requests: Accept/Reject actions inline

"Connect to a Laboratory" button: always visible regardless of how many labs exist. Opens AddPartnerDialog with typeFilter={['laboratory', 'lab']}.

This eliminates the need to visit Settings > Connections entirely.

1D. Fix CreateRequestDialog in LabRequestsTab.tsx

Restructure the platform lab section (lines 271-369) with this new logic:

IF labPartners.length > 0:

  Render lab picker (Select dropdown)

  Render "Connect another lab" link (always visible below picker)

  IF pendingLabPartners.length > 0:

    Render compact pending banner below picker (does NOT replace it)

  Render LabCatalogViewer INSIDE a max-h-[40vh] overflow-y-auto container

ELSE IF pendingLabPartners.length > 0:

  Render pending banner with Refresh + "Connect another" buttons

ELSE:

  Render "No connected labs" card with "Connect to a Laboratory" CTA

Key fixes:

"Connect another lab" button is ALWAYS visible when labPartners.length > 0

Pending banner is shown alongside the picker (not as replacement)

Catalog viewer is scroll-constrained

1E. Fix AddPartnerDialog.tsx

Add typeFilter to useEffect dependency array (line 76)

1F. Add InvitationsPanel/NotificationsPanel to DashboardLaboratory

Import and render <NotificationsPanel /> in the desktop header (line ~123, next to LabCreditsPanel)

Files Changed (Phase 1)

File	Action	What Changes

src/hooks/useNotifications.ts	NEW	Query, mutations, Realtime hook

src/components/NotificationsPanel.tsx	NEW	Unified bell + Sheet with Invitations/Notifications tabs

src/components/InvitationsPanel.tsx	EDIT	Extract inner sheet content into an exportable sub-component (InvitationsContent)

src/components/laboratory/LabRequestsTab.tsx	EDIT	Add Partnership Inbox section; restructure CreateRequestDialog platform lab section; constrain catalog viewer scroll

src/components/connections/AddPartnerDialog.tsx	EDIT	Add typeFilter to useEffect deps

src/pages/DashboardLaboratory.tsx	EDIT	Add NotificationsPanel to desktop header

src/pages/Dashboard.tsx	EDIT	Swap InvitationsPanel to NotificationsPanel

src/pages/DashboardHorses.tsx	EDIT	Same swap

src/pages/DashboardPayments.tsx	EDIT	Same swap

src/pages/DashboardBreeding.tsx	EDIT	Same swap

src/pages/DashboardServices.tsx	EDIT	Same swap

src/pages/DashboardRevenue.tsx	EDIT	Same swap

src/pages/DashboardHorseOrders.tsx	EDIT	Same swap

src/i18n/locales/en.ts	EDIT	Add notification + partnership inbox keys

src/i18n/locales/ar.ts	EDIT	Arabic translations for all new keys

Phase 2 -- Lab Request Messaging Thread

2A. Hook: src/hooks/laboratory/useLabRequestMessages.ts (NEW)

Mirrors useConnectionMessages exactly

Query lab_request_messages by request_id, ordered created_at ASC

Realtime subscription filtered by request_id

sendMessage mutation (inserts row; DB trigger creates notification for other party)

2B. Component: src/components/laboratory/LabRequestThreadDialog.tsx (NEW)

Mirrors ConnectionMessagesDialog pattern

Props: open, onOpenChange, requestId, partnerName

ScrollArea with message bubbles (mine vs theirs, determined by sender_user_id === [user.id](http://user.id))

Textarea + Send button with Enter-to-send

Auto-scroll to latest message

2C. Integration into LabRequestsTab.tsx

Add a MessageSquare icon button on each RequestCard

Clicking opens LabRequestThreadDialog for that request

Show unread message count badge on the icon (query: count notifications WHERE entity_type = 'lab_request_message' AND parent request matches AND is_read = false)

2D. Notification Click Routing for Messages

When user clicks a lab_request.message_added notification in the bell panel:

Navigate to /dashboard/laboratory?tab=requests&requestId={request_id}&openThread=true

LabRequestsTab reads the openThread search param and auto-opens the thread dialog for the specified request

Files Changed (Phase 2)

File	Action	What Changes

src/hooks/laboratory/useLabRequestMessages.ts	NEW	Query + send + Realtime

src/components/laboratory/LabRequestThreadDialog.tsx	NEW	Chat dialog UI

src/components/laboratory/LabRequestsTab.tsx	EDIT	Add message icon per RequestCard, auto-open thread from URL params

src/hooks/laboratory/index.ts	EDIT	Export new hook

src/i18n/locales/en.ts	EDIT	Add message thread keys

src/i18n/locales/ar.ts	EDIT	Arabic translations

Deliverable 3: Acceptance Criteria

Phase 0

 notifications table exists with correct schema (NO FK dependency on profiles/auth schema)

 lab_request_messages table exists with correct schema

 RLS: user can only SELECT/UPDATE/DELETE own notifications

 RLS: user can only SELECT/INSERT lab_request_messages for requests where they are a member of initiator or lab tenant

 Inserting a connection (pending) creates notifications for recipient tenant members only

 Updating connection status to accepted creates notifications for initiator tenant members only

 Updating connection status to rejected creates notifications for initiator tenant members only

 Inserting a lab_request with lab_tenant_id creates notifications for lab tenant members

 Updating lab_request status creates notifications for initiator tenant members

 Inserting a lab_request_message creates notifications for the other party (not the sender)

 All triggers are non-blocking (test: temporarily break notifications table, verify connection accept still works)

 No duplicate notifications within 10-second window for same event (anti-double-fire)

 Realtime enabled on both tables

Phase 1

 Unified bell icon shows combined unread count (invitations + notifications) on ALL dashboard pages including Laboratory

 Clicking bell opens Sheet with "Invitations" and "Notifications" tabs

 Notification cards display correct icon, title, body, relative timestamp

 Clicking a notification navigates to the correct context (lab requests page, specific request) with fallback route if needed

 "Mark as read" and "Mark all as read" work correctly

 Realtime: new notification appears in bell without page refresh

 Lab Requests page shows Partnership Inbox section with: connected labs, pending partnerships, "Connect to a Laboratory" CTA

 "Connect to a Laboratory" button is ALWAYS available (even with existing labs)

 Pending partnerships show inline with Refresh button (no Settings detour)

 Accepting a partnership from the inbox refreshes the lab picker

 CreateRequestDialog: catalog viewer scrolls within bounded area

 CreateRequestDialog: "Connect another lab" link visible when labs exist

 CreateRequestDialog: pending banner shown alongside picker (not replacing it)

 CreateRequestDialog: selecting services enables Create button even with empty description

 CreateRequestDialog: auto-generates description from service names when description is empty

 Arabic RTL: all new labels translated, proper alignment, no overlapping buttons

Phase 2

 Each lab request card has a message/chat icon button

 Clicking opens a thread dialog with full message history

 Sending a message inserts into lab_request_messages

 DB trigger creates notification for the other party

 Realtime: messages appear instantly for both parties without refresh

 Unread message indicator (badge count) on the chat icon per request

 Clicking a lab_request.message_added notification auto-opens the thread dialog for the correct request

 Messages are immutable (no edit/delete)

 Arabic RTL: message bubbles align correctly, thread dialog renders properly

Deliverable 4: Risks and Rollback

Risks

Fan-out volume: For tenants with many members (>50), each event creates N rows. Mitigated by a RAISE NOTICE warning in triggers when fan-out exceeds 50. For MVP this is acceptable. Future optimization: batch/summarize or use a per-tenant notification with separate read-tracking.

Trigger safety: All 5 trigger functions use BEGIN...EXCEPTION WHEN OTHERS blocks. Notification failures are logged via RAISE NOTICE and never block the primary operation. Tested by verifying that connection accepts succeed even if the notifications table is temporarily unavailable.

Notification accumulation: Old notifications will grow unbounded. Recommended future addition: a scheduled cleanup function (DELETE FROM notifications WHERE created_at < now() - interval '90 days'). Not needed for MVP.

Realtime channel overhead: Each user subscribes to notifications filtered by their user_id. Supabase Realtime supports this efficiently. If >1000 concurrent users, consider server-side filtering via RLS-based Realtime (already the default behavior).

AddPartnerDialog typeFilter dep: Adding typeFilter to the useEffect dependency array is a correctness fix with no regression risk since the filter was already applied inline.

Rollback Steps

Phase 0: DROP TABLE IF EXISTS notifications CASCADE; DROP TABLE IF EXISTS lab_request_messages CASCADE; + drop all 5 trigger functions. No frontend impact (hooks will return empty arrays).

Phase 1: Revert NotificationsPanel to InvitationsPanel imports in all 8 dashboard pages. Remove Partnership Inbox section from LabRequestsTab. Restore original CreateRequestDialog conditional structure.

Phase 2: Remove LabRequestThreadDialog and useLabRequestMessages. Remove message icon from RequestCard. Each phase is fully independent and can be reverted without affecting the others.

Implementation Order

Phase 0 must be completed first. Phase 1 and Phase 2 can be implemented in parallel after Phase 0, but Phase 1 is higher priority (it fixes the core "no Settings detour" requirement).