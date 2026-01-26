

# Phase 3.5 Connections/Sharing Audit — Comprehensive Report

## Executive Summary

The audit reveals **critical security infrastructure is missing from the live database**. While the migration file references rate limiting functions, those functions and the supporting table were never actually created. This means:

1. **`reject_connection` is completely broken** — it calls `enforce_rate_limit` which doesn't exist
2. **`accept_connection` has no rate limiting** — authenticated users can attempt unlimited accepts
3. **Cron job exists but calls a non-existent cleanup function**

UX and performance components are correctly implemented.

---

## Audit Findings Summary

| Track | Pass | Fail | Critical Issues |
|-------|------|------|-----------------|
| **A - Security** | 3 | 5 | Missing rate limit infrastructure, broken reject_connection |
| **B - UX** | 6 | 1 | Minor: No proactive login-required message |
| **C - Performance** | 5 | 1 | Minor: hasMore logic may show false positive |

---

## TRACK A — SECURITY HARDENING

### A1) Rate Limiting — **FAIL (CRITICAL)**

| Sub-Item | Status | Evidence |
|----------|--------|----------|
| `connection_rate_limits` table | **FAIL** | Table does not exist in database |
| `enforce_rate_limit` function | **FAIL** | Function does not exist |
| `cleanup_connection_rate_limits` function | **FAIL** | Function does not exist |
| `accept_connection` rate limiting | **FAIL** | No call to enforce_rate_limit in function |
| `reject_connection` rate limiting | **FAIL** | Calls non-existent function → runtime error |
| Auth check on both RPCs | **PASS** | Both check `auth.uid()` at start |
| `search_path` hardening | **PASS** | Both have `SET search_path = public` |

**Risk**: CRITICAL — `reject_connection` is broken; unlimited accept attempts possible

**Database Evidence**:
```sql
-- Table check returns empty
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'connection_rate_limits';
-- Result: []

-- Function check returns empty  
SELECT proname FROM pg_proc WHERE proname = 'enforce_rate_limit';
-- Result: []
```

### A2) Unauthenticated Brute Force — **PASS**

Both RPCs check `auth.uid()` before any token lookup, preventing unauthenticated enumeration.

### A3) Token Integrity — **FAIL (MEDIUM)**

| Sub-Item | Status | Evidence |
|----------|--------|----------|
| Token index exists | PASS | `idx_connections_token` (non-unique) |
| Token UNIQUE constraint | **FAIL** | No constraint exists |
| Current duplicates | PASS | Query shows 0 duplicates |

**Risk**: Medium — duplicate tokens theoretically possible

---

## TRACK B — UX COMPLETENESS

### B1) AcceptConnectionPage — **PARTIAL PASS**

| Sub-Item | Status | Evidence |
|----------|--------|----------|
| Security indicator | **PASS** | Lock icon + domain at lines 107-115 |
| Token auto-load message | **PASS** | "Token loaded from invite link" at lines 127-131 |
| i18n EN/AR | **PASS** | Keys at en.ts:2446-2447, ar.ts:2449-2450 |
| Login-required guidance | **FAIL** | No proactive message before user clicks |

**Risk**: Low — users may be confused when logged out

### B2) Connection Type Guidance — **PASS**

Helper text displayed at `CreateConnectionDialog.tsx:94-96` with i18n keys for b2b/b2c/employment in both languages.

---

## TRACK C — PERFORMANCE / RELIABILITY

### C1) Audit Log Pagination — **PARTIAL PASS**

| Sub-Item | Status | Evidence |
|----------|--------|----------|
| Range-based query | **PASS** | `.range(0, loadedCount - 1)` |
| Load More button | **PASS** | Lines 97-110 with spinner |
| `hasMore` accuracy | **FAIL** | `logs.length >= loadedCount` may show false positive |

**Risk**: Low — cosmetic issue on final page

### C2) Audit Log Indexes — **PASS**

Both composite indexes confirmed:
- `idx_sharing_audit_log_actor_tenant_created_at`
- `idx_sharing_audit_log_target_tenant_created_at`

### C3) Cron Cleanup Job — **PASS (with caveat)**

Job exists: `connection-rate-limits-cleanup-hourly` at `10 * * * *`

**Caveat**: Calls `cleanup_connection_rate_limits()` which doesn't exist — will fail silently

### C4) Edge Function Observability — **PASS**

Structured logging with `event`, `requestId`, `duration_ms`, `timestamp` in `expire-stale-connections/index.ts`

---

## Execution Plan (Ordered Steps)

### Phase 1: CRITICAL FIXES (Required)

```text
┌─────────────────────────────────────────────────────────────┐
│ Step 1.1: Create connection_rate_limits table               │
├─────────────────────────────────────────────────────────────┤
│ File: SQL Migration                                         │
│ Objects: public.connection_rate_limits                      │
│ Criteria:                                                   │
│   - Columns: id (uuid PK), user_id (uuid NOT NULL),         │
│     action (text), attempted_at (timestamptz)               │
│   - RLS enabled, all policies = false                       │
│   - Indexes: (user_id, action, attempted_at DESC),          │
│     (attempted_at DESC)                                     │
│ Pitfall: user_id must be NOT NULL (earlier draft had NULL)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 1.2: Create enforce_rate_limit function                │
├─────────────────────────────────────────────────────────────┤
│ File: SQL Migration                                         │
│ Objects: public.enforce_rate_limit(_action, _max, _window)  │
│ Criteria:                                                   │
│   - SECURITY DEFINER, SET search_path = public              │
│   - Check auth.uid() IS NOT NULL first                      │
│   - Insert attempt, count within window, raise if exceeded  │
│ Pitfall: Must handle NULL user_id before insert             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 1.3: Create cleanup_connection_rate_limits function    │
├─────────────────────────────────────────────────────────────┤
│ File: SQL Migration                                         │
│ Objects: public.cleanup_connection_rate_limits()            │
│ Criteria:                                                   │
│   - SECURITY DEFINER, SET search_path = public              │
│   - DELETE WHERE attempted_at < now() - interval '1 hour'   │
│   - RETURNS integer (deleted count)                         │
│ Pitfall: None                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 1.4: Patch accept_connection                           │
├─────────────────────────────────────────────────────────────┤
│ File: SQL Migration (DROP + CREATE OR REPLACE)              │
│ Objects: public.accept_connection(_token text)              │
│ Criteria:                                                   │
│   - Add PERFORM public.enforce_rate_limit('accept_connection', 5, 60); immediately at the top of the function body (right after BEGIN)       │
│   - Ensure the accepted connection status becomes active (NOT accepted) to match the DB/UI contract used across this project (pending/active/rejected/expired/revoked).          │
│   - Preserve existing logging signature and existing authorization/business logic.
           │
│ Pitfall: Do NOT rewrite the function logic—only add rate limiting and ensure the final status is active.                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 1.5: Verify reject_connection works                    │
├─────────────────────────────────────────────────────────────┤
│ Test: Call reject_connection with valid pending token       │
│ Criteria: Returns UUID without error                        │
│ Pitfall: Already has rate limit call, just needs function   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: SECURITY HARDENING (Recommended)

```text
┌─────────────────────────────────────────────────────────────┐
│ Step 2.1: Add UNIQUE constraint on connections.token        │
├─────────────────────────────────────────────────────────────┤
│ File: SQL Migration                                         │
│ Objects: public.connections                                 │
│ SQL: ALTER TABLE public.connections                         │
│      ADD CONSTRAINT connections_token_unique UNIQUE (token);│
│ Criteria: Constraint exists after migration                 │
│ Pitfall: Pre-check for duplicates (already confirmed clean) │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: UX IMPROVEMENTS (Optional)

```text
┌─────────────────────────────────────────────────────────────┐
│ Step 3.1: Add auth-required banner to AcceptConnectionPage  │
├─────────────────────────────────────────────────────────────┤
│ File: src/pages/AcceptConnectionPage.tsx                    │
│ Criteria: Show info banner when user is not logged in       │
│ Pitfall: Use useAuth or supabase.auth.getSession()          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 3.2: Fix hasMore pagination logic                      │
├─────────────────────────────────────────────────────────────┤
│ File: src/hooks/connections/useSharingAuditLog.ts           │
│ Criteria: Fetch pageSize+1, slice to pageSize,              │
│           hasMore = data.length > pageSize                  │
│ Pitfall: Update range and slice logic together              │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Procedure: Rate Limiting Verification

Once Phase 1 is complete, verify with this procedure:

```sql
-- 1. As authenticated user, call accept_connection 6 times rapidly
-- First 5 should succeed (or fail with business logic errors)
-- 6th call should fail with: "Rate limit exceeded. Please try again later."

-- 2. Wait 60 seconds
-- 7th call should succeed again

-- 3. Check rate_limits table has entries
SELECT COUNT(*) FROM public.connection_rate_limits 
WHERE user_id = auth.uid() AND action = 'accept_connection';

-- 4. Wait for cron (or manually call)
SELECT public.cleanup_connection_rate_limits();
-- Should return count of deleted rows
```

---

## Conclusion

**The rate limiting infrastructure migration was proposed but never executed successfully.** The database is in an inconsistent state where:
- `reject_connection` references a non-existent function
- `accept_connection` has no rate limiting
- Cron job calls a non-existent cleanup function

**Immediate action required**: Execute the Phase 1 critical fixes before this feature can be considered production-ready.

[MODE: EXECUTION]

You must implement Phase 3.5 “Critical Fixes” now, with strict verification gates.
Scope is LIMITED to: adding missing rate-limit infra, fixing accept/reject RPCs accordingly, ensuring cron cleanup works, and adding token uniqueness constraint. Optional UX fixes are allowed ONLY if they are small and do not touch other modules.

IMPORTANT PROJECT CONTRACT:
- connections.status values are: pending, active, rejected, expired, revoked
- Therefore accept_connection MUST set status = 'active' (NOT 'accepted').

========================
A) DATABASE FIXES (MUST)
========================

1) Create table public.connection_rate_limits (if missing)
- Columns: id uuid PK default gen_random_uuid(), user_id uuid NOT NULL, action text CHECK in ('accept_connection','reject_connection'), attempted_at timestamptz default now()
- Indexes:
  - (user_id, action, attempted_at DESC)
  - (attempted_at DESC)
- Enable RLS and create ALL-FALSE policies for SELECT/INSERT/UPDATE/DELETE (RPC-only access).

2) Create function public.enforce_rate_limit(_action text, _max_attempts int, _window_seconds int) RETURNS void
- SECURITY DEFINER
- SET search_path = public
- Must:
  - require auth.uid() not null
  - insert attempt row
  - count attempts within window
  - raise exception if count > max
- DO NOT use any client input for user_id; always auth.uid().

3) Create function public.cleanup_connection_rate_limits() RETURNS integer
- SECURITY DEFINER
- SET search_path = public
- Delete rows older than 1 hour and return deleted count.

4) Patch accept_connection(_token text)
RULE: Do NOT rewrite business logic. Do minimal change:
- Add rate limiting call at the top of function body:
  PERFORM public.enforce_rate_limit('accept_connection', 5, 60);
- Ensure final status transition sets status='active' (NOT 'accepted').
- Preserve existing authorization checks and logging behavior/signature. Do NOT change logging function signature or event naming except if needed to keep existing behavior.

5) Verify reject_connection(_token text)
- It currently calls enforce_rate_limit; after step (2) it must work.
- Ensure it returns correctly and does NOT error due to missing function.
- Do not change reject_connection logic except if strictly required to keep compatibility with the same status contract + existing logging.

6) Fix cron job “connection-rate-limits-cleanup-hourly”
- Ensure a single job exists.
- Command must be: SELECT public.cleanup_connection_rate_limits()
- Schedule: 10 * * * *
- If job exists, re-point it if needed.

7) Token integrity: Add UNIQUE constraint on connections.token
- First run duplicate check:
  SELECT token, COUNT(*) FROM public.connections GROUP BY token HAVING COUNT(*) > 1;
- If empty, then:
  ALTER TABLE public.connections ADD CONSTRAINT connections_token_unique UNIQUE (token);

========================
B) VERIFICATION GATES (MUST SHOW EVIDENCE)
========================

After applying changes, you MUST provide evidence outputs:

B1) Existence checks:
- Table exists:
  SELECT to_regclass('public.connection_rate_limits');
- Functions exist:
  SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND proname IN ('enforce_rate_limit','cleanup_connection_rate_limits');

B2) accept_connection now rate-limited and status contract correct:
- Show function definition (or relevant snippet) proving:
  - enforce_rate_limit call exists near BEGIN
  - status becomes 'active'
  Use: SELECT pg_get_functiondef('public.accept_connection(text)'::regprocedure);

B3) reject_connection no longer broken:
- Show function definition includes enforce_rate_limit call AND no missing dependency.
  Use: SELECT pg_get_functiondef('public.reject_connection(text)'::regprocedure);

B4) Cron job validity:
- Show:
  SELECT jobname, schedule, command FROM cron.job WHERE jobname='connection-rate-limits-cleanup-hourly';

B5) Unique constraint:
- Show:
  SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid='public.connections'::regclass AND conname='connections_token_unique';

B6) Rate limit behavior quick test (manual description is fine):
- Call accept_connection 6 times quickly as the same authed user; 6th must raise “Rate limit exceeded…”
- Explain how you verified.

========================
C) OPTIONAL SMALL UX FIXES (ONLY IF QUICK)
========================
If time allows, implement BOTH:
1) AcceptConnectionPage: show an info banner on load if user is not logged in:
   “You must be logged in as the invited recipient to accept or reject.”
2) Audit log pagination: fix hasMore logic by fetching pageSize+1 and trimming so hasMore is accurate.

If you do optional items, you MUST show file diffs/paths and confirm build passes.

END.


