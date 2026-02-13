## Plan: Platform-Wide Realtime Layer + Remove Disruptive Refresh

### Part 1: Remove Disruptive Refresh/Reset Mechanisms

**Findings from audit:**

- `refetchOnWindowFocus: false` is already set globally in `src/App.tsx` (line 68) -- GOOD, no change needed

- No `visibilitychange` or `window.focus` handlers exist -- GOOD

- No `setInterval` polling exists -- GOOD

- No `controllerchange` auto-reload exists -- GOOD

- `I18nRecoveryBoundary` does `window.location.reload()` but ONLY in DEV mode for HMR errors -- acceptable, no change needed

- `Directory.tsx` and `DebugAuth.tsx` have user-initiated reloads (button click / debug tool) -- acceptable, no change needed

- **No disruptive auto-refresh mechanism found.** The codebase is already clean.

**Action:** No changes needed for Part 1.

---

### Part 2: Create `useTenantRealtimeSync` Hook

**New file: `src/hooks/useTenantRealtimeSync.ts`**

A single hook that subscribes to all 20 realtime-enabled tables, filtered by `tenant_id` where possible, and invalidates only the relevant React Query keys with debouncing.

**Important improvement (to avoid “wrong query keys”):**

- Do NOT assume query keys blindly.

- Implement a mapping that supports:

  1) Exact keys where they are known/consistent

  2) Partial-key invalidation (prefix) for groups

  3) Optional predicate-based invalidation for “entity detail” queries instead of using fake wildcards like `'*'`.

**TABLE_TO_QUERY_KEYS mapping (revised):**

(Use these as “target groups”. The implementation should invalidate by prefix where possible.)

| Table | Query Keys Invalidated (prefix-based where applicable) |

|-------|---------------------------------------------------------|

| `horses` | prefix `['horses', tenantId]` + prefix `['horse', tenantId]` (detail queries) |

| `horse_ownership` | prefix `['horses', tenantId]` + prefix `['horse', tenantId]` |

| `horse_vaccinations` | prefix `['vaccinations', tenantId]` + prefix `['horse', tenantId]` (if vaccinations live under horse profile) |

| `vet_visits` | prefix `['vet', tenantId]` OR exact key if exists (see note below) |

| `vet_events` | prefix `['vet', tenantId]` |

| `vet_treatments` | prefix `['vet', tenantId]` |

| `vet_medications` | prefix `['vet', tenantId]` |

| `vet_followups` | prefix `['vet', tenantId]` |

| `lab_requests` | prefix `['lab', tenantId]` |

| `lab_samples` | prefix `['lab', tenantId]` |

| `lab_results` | prefix `['lab', tenantId]` |

| `invoices` | prefix `['finance', tenantId]` + prefix `['invoices', tenantId]` |

| `invoice_items` | prefix `['finance', tenantId]` + prefix `['invoices', tenantId]` |

| `expenses` | prefix `['finance', tenantId]` + prefix `['expenses', tenantId]` |

| `ledger_entries` | prefix `['finance', tenantId]` + prefix `['ledger', tenantId]` |

| `horse_orders` | prefix `['orders', tenantId]` OR prefix `['horse-orders', tenantId]` depending on existing keys |

| `horse_order_events` | prefix `['orders', tenantId]` |

| `horse_movements` | prefix `['movement', tenantId]` |

| `housing_units` | prefix `['housing', tenantId]` |

| `housing_unit_occupants` | prefix `['housing', tenantId]` |

**Note about query keys:**

- If the codebase already uses specific keys like `['vet-visits', tenantId]` or `['lab-results', tenantId]`, keep them.

- Otherwise, prefer unifying by module prefixes (e.g., `['vet', tenantId]`, `['lab', tenantId]`, `['finance', tenantId]`) to avoid missing updates.

- Avoid `['horse', '*']`. Instead, use:

  - prefix invalidation like `['horse', tenantId]` (detail queries grouped by tenant)

  - OR predicate invalidation (e.g., invalidate queries whose first element is 'horse' and whose second element equals tenantId)

Key design decisions (kept + improved):

- Uses `queryClient.invalidateQueries({ queryKey, refetchType: 'active' })` so only currently-mounted queries refetch (no background noise).

- Debounce of 150ms per table to batch burst events.

- Single Supabase channel for all tables (efficient).

- Filter by `tenant_id` at subscription level ONLY for tables that have `tenant_id`.

  - Use `filter: tenant_id=eq.<tenantId>` for those tables.

  - For tables where tenant_id is not present, omit the filter and rely on narrow query invalidation.

Implementation guidance (make it robust):

- Create ONE channel: `tenant-sync-${tenantId}`

- Register `.on('postgres_changes', { event: '*', schema: 'public', table, filter? }, handler)` for each table.

- In handler:

  - Schedule debounced invalidation for that table’s mapped keys.

  - Never call window reload.

  - Never perform global invalidation.

---

### Part 3: Safe Focus/Visibility Recovery

**New file: `src/hooks/useFocusRefresh.ts`**

Add a minimal visibility recovery, BUT it must support “platform-wide correctness” on mobile resume without resetting forms.

Revised behavior:

- On `document.visibilitychange` when state becomes `visible`:

  1) Invalidate notifications/unread counts (as originally planned)

  2) ALSO invalidate a SMALL set of ACTIVE module prefixes for the current tenant (refetchType:'active' only), to catch up after realtime suspension in background:

     - `['vet', tenantId]`

     - `['lab', tenantId]`

     - `['finance', tenantId]`

     - `['horses', tenantId]`

     - `['orders', tenantId]` (if present)

     - `['housing', tenantId]` (if present)

- This is still safe because:

  - It only refetches ACTIVE queries (does not prefetch everything)

  - It avoids full reloads

  - It avoids broad “invalidate all”

Also:

- Add a small debounce (e.g., 250ms) so rapid focus changes don’t spam refetch.

---

### Part 4: Mount the Hooks

**Modified file: `src/pages/Dashboard.tsx`**

Add at the top of the `Dashboard` component:

```typescript

useTenantRealtimeSync();

This is the org-mode root where activeTenant is known. The hook internally reads activeTenant from useTenant().

Mount useFocusRefresh()

Mount globally where QueryClient is available. If useFocusRefresh needs tenantId, it can read it from useTenant() too, so it can be mounted either:

in src/App.tsx (inside QueryClientProvider)

OR

in the Dashboard layout/root (preferred, because it is tenant-aware)

(Choose the simplest placement that has access to both QueryClient and Tenant context.)

Technical Details

useTenantRealtimeSync implementation outline:

Reads activeTenant?.tenant_id from useTenant()

If no tenant, returns early (no subscription)

Creates a single channel tenant-sync-${tenantId}

Registers .on('postgres_changes', ...) for each of the 20 tables

For tables with tenant_id, include realtime filter:

filter: 'tenant_id=eq.' + tenantId

For tables without tenant_id, omit filter

Each handler looks up the table name in TABLE_TO_QUERY_KEYS, gets query key groups (prefixes), and schedules debounced invalidation using:

queryClient.invalidateQueries({ queryKey: <prefixKey>, refetchType: 'active' })

Cleanup: removes channel on unmount or tenant change

useFocusRefresh implementation outline (revised):

Listens to document.addEventListener('visibilitychange', ...)

When document.visibilityState === 'visible':

Invalidate ['notifications', userId] or the existing notifications key used in the app

Invalidate ONLY active module prefixes for current tenant (vet/lab/finance/horses/orders/housing)

No reload, no broad invalidation, no UI resets.

Files changed:

src/hooks/useTenantRealtimeSync.ts -- NEW (realtime manager)

src/hooks/useFocusRefresh.ts -- NEW (safe visibility recovery, revised to be tenant-aware and module-prefix based)

src/pages/Dashboard.tsx -- ADD hook call (1 line)

src/App.tsx -- OPTIONAL mount location (only if not mounted in Dashboard/root)

No files removed. No UI changes. No auto-reload added.

Test Checklist

Form persistence: Open any creation dialog (e.g., Add Horse), type data, switch browser tab, return -- input remains, dialog stays open.

Mobile app switch: On mobile, switch to WhatsApp and back -- page stays, no reload, input remains.

Cross-session vet update: In another session, create a vet treatment -- it appears in the first session without refresh.

Cross-session invoice: Create an invoice in session B -- session A sees it instantly.

Lab chat: Lab sends message in thread -- stable sees it instantly (existing realtime in useLabRequestMessages remains, plus broader list invalidation via new hook).

Burst resilience: Rapidly create 5 horses -- UI updates smoothly without flicker (debounce).

Mobile resume catch-up: Leave app in background for 30–60s, return -- latest updates appear quickly via visibility recovery (without losing input).

No reload: At no point does the page reload or forms reset.