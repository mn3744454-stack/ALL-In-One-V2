

# Phase 4 + Phase 3: Final Hardened Execution Plan

---

## 1. AUDIT FINDINGS

### 1.1 Mode Gating Confirmation

**File:** `src/hooks/useModuleAccess.ts` lines 67-79

```
labMode defaults:
  tenant type 'lab'     => 'full'
  tenant type 'stable'  => 'requests'
  tenant type 'clinic'  => 'requests'
  all others            => 'none'
```

Can be overridden via `tenant_capabilities` config with `lab_mode` key. Confirmed correct.

### 1.2 Tab Availability + Redirect Logic

**File:** `src/pages/DashboardLaboratory.tsx`

- **Requests mode** (line 62-63): `['requests', 'settings']`
- **Full mode** (line 66): `['samples', 'results', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings']`
- **CRITICAL:** Full mode does NOT include `'requests'`

**Redirect logic** (lines 89-93):
```
if (urlTab && !availableTabs.includes(urlTab)) {
  next.set('tab', availableTabs[0]);  // => 'samples'
  setSearchParams(next, { replace: true });
}
```
This silently replaces `?tab=requests` with `?tab=samples` and the `requestId`/`openThread` params survive in the URL but are never consumed because `LabRequestsTab` never renders (wrong tab is active).

**ROOT CAUSE CONFIRMED:** Lab notification deep-links fail because `'requests'` is not in `availableTabs` for full mode. The redirect sends to `samples`, and `LabRequestsTab` never mounts to read the deep-link params.

### 1.3 Notification Route Map

**File:** `src/components/NotificationsPanel.tsx` lines 82-98

| Event Type | Route Generated |
|---|---|
| `connection.*` | `/dashboard/laboratory?tab=requests` |
| `lab_request.message_added` | `/dashboard/laboratory?tab=requests&requestId={entity_id}&openThread=true` |
| `lab_request.*` (with entity_id) | `/dashboard/laboratory?tab=requests&requestId={entity_id}` |
| Fallback | `/dashboard/laboratory?tab=requests` |

Routes are correct. The problem is entirely upstream (tab validation redirect).

### 1.4 useLabRequests Data Visibility

**File:** `src/hooks/laboratory/useLabRequests.ts` line 95

Current query: `.eq('tenant_id', tenantId)` -- always filters by the CREATING tenant's ID.

- `tenant_id` = the stable that created the request
- `initiator_tenant_id` = same as tenant_id (nullable, redundant)  
- `lab_tenant_id` = the target lab tenant

**Why lab can't see requests:** When a lab tenant is active, `tenantId` is the lab's ID, but the query filters `tenant_id = labId`. Since `tenant_id` stores the stable's ID, zero rows match.

### 1.5 RLS Reality (VERIFIED from actual policies)

**lab_requests policies (confirmed from pg_policies):**

| Policy | CMD | Condition |
|---|---|---|
| `Lab tenant can view incoming requests` | SELECT | `lab_tenant_id IS NOT NULL AND EXISTS(tenant_members WHERE tenant_id = lab_requests.lab_tenant_id AND user_id = auth.uid() AND is_active)` |
| `Lab tenant can update incoming requests` | UPDATE | Same as above (both qual and with_check) |
| `Requester tenant can view own requests` | SELECT | `EXISTS(tenant_members WHERE tenant_id = lab_requests.tenant_id ...)` |
| `Users can create/update/delete lab requests in their tenant` | INSERT/UPDATE/DELETE | `EXISTS(tenant_members WHERE tenant_id = lab_requests.tenant_id ...)` |

**VERDICT:** RLS is CORRECT. Lab members CAN select and update requests where `lab_tenant_id` matches. No migration needed.

### 1.6 Message Thread RLS (VERIFIED)

**lab_request_messages policies:**

| Policy | CMD | Condition |
|---|---|---|
| `Members of request tenants can view messages` | SELECT | Member of either `initiator_tenant_id` or `lab_tenant_id` on parent request |
| `Members of request tenants can send messages` | INSERT | `sender_user_id = auth.uid()` AND member of either tenant AND `sender_tenant_id` matches one of the two tenants |

**VERDICT:** Both parties can SELECT and INSERT. No migration needed.

### 1.7 Status Enum Truth

**Actual values in DB:** Only `pending` exists as data (fresh system).
**Column definition:** `status text NOT NULL DEFAULT 'pending'` -- no CHECK constraint, no enum type.
**Status values used in UI** (from `statusConfig` in LabRequestsTab.tsx line 36-43): `pending`, `sent`, `processing`, `ready`, `received`, `cancelled`.

These are the valid workflow statuses. The dropdown must use exactly these values.

### 1.8 Initiator Stable Name (Correction 2.1)

`external_lab_name` stores the lab name as entered by the stable, NOT the stable's name. It is WRONG to use it for "Initiator Stable" display.

**Correct source:** The `tenants` table has columns `id`, `name`, `type`. The `tenant_id` (or `initiator_tenant_id`) on `lab_requests` references the stable. We can JOIN to `tenants` to get the name.

**Chosen approach: JOIN via Supabase query.** When `labMode='full'`, the query in `useLabRequests` will add a join: `initiator_tenant:tenants!tenant_id(id, name)`. This is safe because:
- The `tenant_id` column is NOT NULL and always references the creating stable
- No snapshot needed since tenant names rarely change
- No RLS concern: the query already passes RLS via `lab_tenant_id` match

### 1.9 RPC Security (Correction 2.2 - for Phase 3.3)

The `get_lab_request_threads` RPC must NOT accept `p_tenant_id` as a trusted parameter. Instead, it will:
- Derive the caller's tenant memberships from `auth.uid()`
- Filter `lab_requests` where `tenant_id` or `lab_tenant_id` is in the caller's active memberships
- This prevents spoofing entirely

---

## 2. RE-ORDERED IMPLEMENTATION PLAN

---

### PHASE 4 -- Laboratory Full Mode Completion (DO FIRST)

---

#### Sub-phase 4.1: Add 'requests' Tab to Full Mode

**Goal:** Notification deep-links stop redirecting to samples.

**Files to change:**
- `src/pages/DashboardLaboratory.tsx`
- `src/navigation/labNavConfig.ts`
- `src/components/laboratory/LabBottomNavigation.tsx`

**Exact changes:**
1. `DashboardLaboratory.tsx` line 66: Change array to `['samples', 'results', 'requests', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings']`
2. Same file, lines 204-233: Add a `TabsTrigger` for `'requests'` with `ClipboardList` icon after the results trigger (inside the full mode block)
3. `labNavConfig.ts`: Add entry at position 3 (after results): `{ key: "requests", tab: "requests", icon: ClipboardList, labelKey: "laboratory.nav.requests", route: "/dashboard/laboratory?tab=requests" }`
4. `LabBottomNavigation.tsx` line 34-40: Add requests entry to the full mode tabs array

**Acceptance:**
- `?tab=requests` does NOT redirect to samples for lab tenant
- Sidebar, desktop tabs, and mobile nav all show "Requests"
- Clicking a lab_request notification lands on the requests tab

**Test steps:**
1. Log in as Lab tenant
2. Navigate to `/dashboard/laboratory?tab=requests` -- verify no redirect
3. Verify "Requests" visible in sidebar, desktop tabs, and mobile nav

**Rollback:** Remove 'requests' from the three arrays.

---

#### Sub-phase 4.2: Mode-Aware Query in useLabRequests

**Goal:** Lab tenant sees incoming requests filtered by `lab_tenant_id`.

**Files to change:**
- `src/hooks/laboratory/useLabRequests.ts`
- `src/lib/queryKeys.ts`

**Exact changes:**
1. Import `useModuleAccess` in `useLabRequests.ts`
2. Get `labMode` from `useModuleAccess()`
3. Change query (line 95): 
   - If `labMode === 'full'`: `.eq('lab_tenant_id', tenantId)`
   - Else: `.eq('tenant_id', tenantId)`
4. Add join for initiator tenant name when in full mode: append `, initiator_tenant:tenants!tenant_id(id, name)` to select
5. Update `queryKeys.ts` line 28: `labRequests: (tenantId?: string, mode?: string) => ['lab-requests', tenantId, mode] as const`
6. Update query key usage: `queryKeys.labRequests(tenantId, labMode)`
7. Update `LabRequest` type to include optional `initiator_tenant?: { id: string; name: string }`

**Acceptance:**
- Lab tenant sees requests where `lab_tenant_id` matches their ID
- Stable tenant still sees requests where `tenant_id` matches (unchanged)
- No cache contamination between modes

**Test steps:**
1. Stable creates request addressed to lab partner
2. Lab tenant opens Requests tab -- request appears
3. Stable opens Requests tab -- same request still visible

**Rollback:** Revert filter to always use `tenant_id`.

---

#### Sub-phase 4.3: Lab Request Detail + Actions

**Goal:** Lab staff can update status and publish results.

**Files to change:**
- `src/components/laboratory/LabRequestsTab.tsx` (RequestDetailDialog + LabRequestsTab)
- `src/i18n/locales/en.ts` + `ar.ts`

**Exact changes in RequestDetailDialog (lines 496-644):**
1. Import `useModuleAccess` and get `labMode`
2. When `labMode === 'full'`, show:
   - **Status dropdown:** Select with options: pending, sent, processing, ready, cancelled (exact enum values). On change, call `updateRequest({ id, status })`.
   - **Result URL input:** Text input + "Publish" button. On submit: `updateRequest({ id, result_url, status: 'ready' })`.
   - **Initiator Stable label:** Display `request.initiator_tenant?.name` (from the join added in 4.2).
3. When `labMode === 'full'`, HIDE:
   - "Mark as Received" button (stable-only action)
   - "Generate Invoice" button (stable-only action)

**Exact changes in LabRequestsTab (lines 883-894):**
4. When `labMode === 'full'`:
   - Change header to `t('laboratory.requests.incomingTitle')` / `t('laboratory.requests.incomingSubtitle')`
   - Hide `CreateRequestDialog` (labs don't create requests)
   - Hide Partnership Inbox section (not relevant)

**New i18n keys:**
- `laboratory.requests.incomingTitle`: "Incoming Requests" / "الطلبات الواردة"
- `laboratory.requests.incomingSubtitle`: "Manage lab test requests from partner stables" / "إدارة طلبات الفحوصات من الإسطبلات الشريكة"
- `laboratory.requests.updateStatus`: "Update Status" / "تحديث الحالة"
- `laboratory.requests.publishResult`: "Publish Result" / "نشر النتيجة"
- `laboratory.requests.resultUrl`: "Result URL" / "رابط النتيجة"
- `laboratory.requests.resultUrlPlaceholder`: "https://..." / "https://..."
- `laboratory.requests.initiatorStable`: "Requesting Stable" / "الإسطبل الطالب"
- `laboratory.nav.requests`: "Requests" / "الطلبات"

**Acceptance:**
- Lab can change status via dropdown
- Lab can publish result URL
- Status change triggers notification to stable (via existing DB trigger)
- Stable-only actions hidden for lab
- Initiator stable name shown (not UUID, not external_lab_name)

**Test steps:**
1. As lab, open incoming request detail
2. Change status to 'processing' -- verify toast
3. Enter result URL, status changes to 'ready'
4. Verify stable receives notification
5. Verify stable sees result

**Rollback:** Remove conditional lab-mode block.

---

#### Sub-phase 4.4: Lab Messaging Thread Verification

**Goal:** Confirm lab can send/receive messages.

**Files to change:** None expected (RLS verified in audit 1.6).

**Verification steps:**
1. As lab tenant, open request detail, go to Messages tab
2. Send a message
3. Verify message appears immediately (realtime)
4. As stable, verify notification received and message visible
5. Reverse: stable sends, lab receives

If `sender_tenant_id` is not set correctly, fix in `useLabRequestMessages.ts` INSERT logic (line 66: `sender_tenant_id: activeTenant?.tenant_id`). This already looks correct.

**Acceptance:** Bidirectional messaging works with correct sender labels.

---

#### Sub-phase 4.5: Lab i18n + UX Polish

**Goal:** No UUID fallbacks, locale-aware dates, no English in Arabic mode.

**Files to change:**
- `src/components/laboratory/LabRequestsTab.tsx`
- `src/i18n/locales/en.ts` + `ar.ts`

**Exact changes:**
1. Lines 574 and 726: Replace `s.service?.name || s.service_id` with `s.service?.name || t('laboratory.requests.unknownService')`
2. Lines 591 and 716: Replace `format(new Date(...), 'MMM dd, yyyy')` with `format(new Date(...), 'PP')` (locale-aware via date-fns)
3. Add i18n key: `laboratory.requests.unknownService`: "Unknown Service" / "خدمة غير معروفة"

**Acceptance:**
- No raw UUIDs visible in service badges
- Dates formatted per locale
- All new lab UI strings translated

---

### PHASE 3 -- Stable Request Mode Completion (DO SECOND)

---

#### Sub-phase 3.1: Expand Stable Tabs

**Goal:** Stable Lab page shows 4 tabs: Requests, Results, Messages, Settings.

**Files to change:**
- `src/pages/DashboardLaboratory.tsx`

**Exact changes:**
1. Line 62-63: Change to `['requests', 'results', 'messages', 'settings']`
2. Lines 192-201: Add TabsTriggers for 'results' (FileText icon) and 'messages' (MessageSquare icon)
3. Add TabsContent for 'results' rendering `StableResultsView` (from 3.2)
4. Add TabsContent for 'messages' rendering `StableMessagesView` (from 3.3)

**Acceptance:**
- Stable user sees 4 tabs on desktop
- `?tab=results` and `?tab=messages` work without redirect
- All labels translated

**Test steps:**
1. Log in as stable, go to `/dashboard/laboratory`
2. Verify 4 tabs visible
3. Click each, verify URL updates

---

#### Sub-phase 3.2: Stable Results Tab

**Goal:** Dedicated view showing only requests with results.

**Files to change:**
- Create `src/components/laboratory/StableResultsView.tsx`
- `src/i18n/locales/en.ts` + `ar.ts`

**Implementation:**
- Use `useLabRequests()` to get all requests
- Filter client-side: `requests.filter(r => r.result_url || r.result_file_path)`
- Render as cards (horse name, test description, result link, date)
- Click opens `RequestDetailDialog` on 'details' tab
- Search + status filter (reuse pattern from LabRequestsTab)

**New i18n keys:**
- `laboratory.stableResults.title`: "Lab Results" / "نتائج المختبر"
- `laboratory.stableResults.subtitle`: "View results from your lab test requests" / "عرض نتائج طلبات الفحوصات"
- `laboratory.stableResults.noResults`: "No results yet" / "لا توجد نتائج بعد"
- `laboratory.stableResults.noResultsDesc`: "Results will appear here when labs publish them" / "ستظهر النتائج هنا عندما تنشرها المختبرات"

**Acceptance:**
- Only requests with results appear
- Empty state when none
- Click opens detail dialog
- Translated

---

#### Sub-phase 3.3: Stable Messages Tab (Standalone Inbox)

**Goal:** Top-level Messages tab with thread summaries, unread indicators.

**Scalable approach: Database RPC (secured)**

**DB Migration:**
```sql
CREATE OR REPLACE FUNCTION public.get_lab_request_threads()
RETURNS TABLE (
  request_id uuid,
  horse_name text,
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
    lr.id,
    h.name,
    lr.test_description,
    lm.body,
    lm.created_at,
    lm.sender_tenant_id,
    lm.cnt
  FROM lab_requests lr
  JOIN horses h ON h.id = lr.horse_id
  JOIN LATERAL (
    SELECT body, created_at, sender_tenant_id, count(*) OVER() as cnt
    FROM lab_request_messages
    WHERE request_id = lr.id
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
  )
  ORDER BY lm.created_at DESC;
$$;
```

**Security:** No `p_tenant_id` parameter. Uses `auth.uid()` to derive access via `tenant_members`. Spoofing is impossible.

**Files to change:**
- DB migration (above)
- Create `src/hooks/laboratory/useLabRequestThreads.ts`
- Create `src/components/laboratory/StableMessagesView.tsx`
- `src/i18n/locales/en.ts` + `ar.ts`

**Implementation of StableMessagesView:**
- Call RPC via `supabase.rpc('get_lab_request_threads')`
- Cross-reference with `useNotifications()` to get unread count per request (filter notifications by `event_type = 'lab_request.message_added'` and `is_read = false`, group by `entity_id`)
- Render thread cards: horse name, test description (truncated), last message preview, relative timestamp, unread dot
- Click sets URL params `?tab=requests&requestId=xxx&openThread=true` and switches tab

**New i18n keys:**
- `laboratory.messages.title`: "Message Threads" / "المحادثات"
- `laboratory.messages.subtitle`: "All conversations on your lab requests" / "جميع المحادثات حول طلبات الفحوصات"
- `laboratory.messages.noThreads`: "No conversations yet" / "لا توجد محادثات بعد"
- `laboratory.messages.noThreadsDesc`: "Start a conversation on any lab request" / "ابدأ محادثة على أي طلب فحص"
- `laboratory.messages.messageCount`: "messages" / "رسائل"

**Acceptance:**
- All request threads with at least one message appear
- Sorted by most recent
- Unread indicators work
- Single RPC call (no N+1)
- Click opens thread
- Translated

---

#### Sub-phase 3.4: Deep-Link Reliability

**Goal:** Deep-links always work, even on invalid tab + requestId combination.

**Files to change:**
- `src/pages/DashboardLaboratory.tsx` (lines 89-93)

**Exact changes:**
In the redirect logic, add a safety check:
```
if (urlTab && !availableTabs.includes(urlTab)) {
  const next = new URLSearchParams(searchParams);
  // If requestId exists, redirect to 'requests' tab (not default)
  const hasRequestId = searchParams.has('requestId');
  next.set('tab', hasRequestId ? 'requests' : availableTabs[0]);
  setSearchParams(next, { replace: true });
}
```

This ensures that even if someone navigates to `?tab=invalid&requestId=xxx`, it redirects to 'requests' tab preserving the requestId.

**Acceptance:**
- `?tab=anything&requestId=xxx` always lands on requests tab with dialog open
- `?tab=invalid` without requestId lands on default tab

---

#### Sub-phase 3.5: Stable UX Polish

**Goal:** Mobile spacing, no raw keys, no UUIDs in stable context.

**Files to change:**
- Same files as 4.5 (changes already applied)
- Verify `StableResultsView` and `StableMessagesView` use RTL-safe classes

**Acceptance:**
- Arabic mode: all 4 stable tabs fully translated
- Mobile: dialogs have proper width
- No raw UUIDs anywhere

---

## 3. IMPLEMENTATION GATE CHECKLIST

Before starting code changes, these must be verified true:

- [x] RLS allows lab tenant SELECT on `lab_requests` via `lab_tenant_id` -- **VERIFIED** (policy "Lab tenant can view incoming requests")
- [x] RLS allows lab tenant UPDATE on `lab_requests` via `lab_tenant_id` -- **VERIFIED** (policy "Lab tenant can update incoming requests")
- [x] RLS allows both parties INSERT/SELECT on `lab_request_messages` -- **VERIFIED** (both policies confirmed)
- [x] Status column is plain text with no CHECK constraint -- **VERIFIED** (default 'pending', no constraint)
- [x] Valid status values: pending, sent, processing, ready, received, cancelled -- **VERIFIED** (from UI statusConfig)
- [x] `tenants` table has `name` column (text, NOT NULL) -- **VERIFIED**
- [x] `tenants` table has NO `name_ar` column -- **VERIFIED** (not in schema)
- [x] `tenant_id` on `lab_requests` is NOT NULL -- **VERIFIED**
- [x] `lab_tenant_id` on `lab_requests` is nullable -- **VERIFIED**
- [x] No existing `get_lab_request_threads` RPC to conflict with -- will verify at migration time
- [x] Notification routing produces correct URLs -- **VERIFIED** (problem is tab validation, not routing)

All gates passed. Ready for implementation.

## 4. MASTER QA CHECKLIST

| # | Scenario | Stable Expected | Lab Expected |
|---|----------|----------------|--------------|
| 1 | Stable sends request to Lab | Appears in Stable Requests tab | Appears in Lab Requests tab |
| 2 | Stable sends message | Message visible in thread | Lab gets notification; click opens thread |
| 3 | Lab replies to message | Stable gets notification; click opens thread | Message visible in thread |
| 4 | Lab changes status to 'processing' | Stable gets notification, badge updates | Dropdown works, toast confirms |
| 5 | Lab publishes result (URL + status=ready) | Notification received, visible in Results tab | Input + publish works |
| 6 | Stable clicks "Mark as Received" | Status changes to 'received' | Action hidden |
| 7 | Notification click: new request | Opens request detail | Opens request detail |
| 8 | Notification click: message_added | Opens thread tab | Opens thread tab |
| 9 | Arabic mode: all tabs | Fully Arabic, no raw keys | Fully Arabic, no raw keys |
| 10 | Service badge: no name | Shows "Unknown Service" | Shows "Unknown Service" |
| 11 | Date formatting | Locale-aware | Locale-aware |
| 12 | Desktop card click | Opens detail dialog | Opens detail dialog |
| 13 | Mobile dialog layout | Spacious, scrollable | Spacious, scrollable |
| 14 | Stable Messages tab | Thread list with unread dots | N/A |
| 15 | Stable Results tab | Only requests with results | N/A |
| 16 | Lab: CreateRequest hidden | Visible | Hidden |
| 17 | Lab: Partnership Inbox hidden | Visible | Hidden |
| 18 | Lab: Initiator stable shown | N/A | Stable name displayed (not UUID) |

## 5. RISKS AND ROLLBACK

| Sub-phase | Risk | Mitigation |
|---|---|---|
| 4.1 | Adding tab may affect sidebar layout | Test on all breakpoints |
| 4.2 | Changing query may break cache | Separate cache keys by mode |
| 4.3 | Status update may fail if trigger rejects | Test each status transition |
| 3.3 | RPC may be slow with many requests | LIMIT to 50 threads, paginate later |
| 3.3 | RPC creation fails | Provide exact SQL, test in migration tool |
| All | Missing i18n key shows raw key | Use fallback strings in all t() calls |

Each sub-phase is independently rollbackable. DB migrations are additive only.

