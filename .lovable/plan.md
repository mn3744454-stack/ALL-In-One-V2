
# Fix Plan: Account B Cannot See Shared Data

## Problem Summary
Account B (recipient) cannot see data shared with them because the frontend queries are incorrectly filtering results:

1. **Connections query** ignores `recipient_profile_id` — only filters by tenant IDs
2. **Grants query** filters by `grantor_tenant_id` — only fetches grants the user *created*, not grants *shared with* them

## Verified Evidence

| Gate | Status | Finding |
|------|--------|---------|
| RLS Policies | ✅ PASS | Both `connections` and `consent_grants` RLS correctly allow access via `recipient_profile_id = auth.uid()` |
| DB Data | ✅ PASS | Accepted connection exists with `recipient_profile_id = 1214cd95...` and active grant for `lab_results` |
| Frontend Query (Connections) | ❌ FAIL | `useConnections.ts:42` filters by tenant IDs only |
| Frontend Query (Grants) | ❌ FAIL | `useConsentGrants.ts:39-44` returns `[]` or filters by grantor tenant |

## Implementation Plan

### Step 1: Fix Connection Visibility
**File:** `src/hooks/connections/useConnections.ts`

Update the query to include profile-based recipients:
- Add `recipient_profile_id.eq.{user.id}` to the OR filter
- Handle case when user has no active tenant (fetch profile-based connections only)
- Change `enabled` to always be `true` so users without tenants can still see their inbound connections

### Step 2: Add Recipient Mode to Grants Hook  
**File:** `src/hooks/connections/useConsentGrants.ts`

Add a `recipientView` parameter that:
- Skips the `grantor_tenant_id` filter when `true`
- Only filters by `connection_id` — letting RLS enforce authorization
- Has different `enabled` logic (only needs `connectionId`, not `tenantId`)

### Step 3: Update SharedWithMeTab Component
**File:** `src/components/connections/SharedWithMeTab.tsx`

Pass `recipientView: true` when calling `useConsentGrants` so it fetches grants shared *with* the user rather than grants the user *created*.

## Technical Details

### useConnections.ts Query Change
```text
Current filter:
  .or(`initiator_tenant_id.eq.${tenantId},recipient_tenant_id.eq.${tenantId}`)

New filter (adds profile-based):
  .or(`initiator_tenant_id.eq.${tenantId},recipient_tenant_id.eq.${tenantId},recipient_profile_id.eq.${userId}`)
```

### useConsentGrants.ts New Mode
```text
When recipientView = true:
  - Skip grantor_tenant_id filter
  - Only filter by connection_id
  - RLS policy enforces recipient authorization

When recipientView = false (default):
  - Keep existing behavior for grantor management
```

## Files to Modify
1. `src/hooks/connections/useConnections.ts` — Add profile-based filter
2. `src/hooks/connections/useConsentGrants.ts` — Add `recipientView` parameter
3. `src/components/connections/SharedWithMeTab.tsx` — Pass `recipientView: true`

## No Database Changes Required
All RLS policies are already correct. This is a frontend-only fix.

## Acceptance Criteria
After fix, Account B should be able to:
1. Navigate to "Shared with me" tab
2. See accepted inbound connections in the left column
3. Click a connection to see grants in the right column
4. Click "Preview Data" to view shared lab results
5. Audit log records `'data_accessed'` event
