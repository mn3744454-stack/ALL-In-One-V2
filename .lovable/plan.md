# Phase 1.e.g — Connected Movement RPC Overload Correction

## Findings

**RPC overloads found (2):**
1. `record_connected_movement(uuid, uuid, uuid, uuid, timestamptz, text, text, boolean)` — original 8-arg (from migration `20260311193320_…`).
2. `record_connected_movement(uuid, uuid, uuid, uuid, timestamptz, text, text, boolean, text)` — 9-arg with `p_movement_status` (later migration `20260311230849_…`, "Phase C.4: support scheduling"). **Canonical.**

Because the client passes only the first 8 args (all others have DEFAULTs), PostgREST cannot choose between the two — hence the ambiguity error at submit.

**Client call (`useConnectedMovement.ts`)** passes 8 named params, no `p_movement_status`. `RecordMovementDialog` already computes `isScheduled` and `effectiveMovementAt` for the standard movement path but does **not** forward a status to the connected branch.

## Fix (minimum-safe, fully resolves ambiguity)

Combine **A + B**: drop the obsolete 8-arg overload (it has been superseded) AND update the client to always send `p_movement_status`. Either alone would work, but doing both prevents future re-introduction of ambiguity and aligns the client with the canonical signature.

### 1. Migration — drop obsolete overload
New migration that drops only the 8-arg variant. Canonical 9-arg function is untouched:
```sql
DROP FUNCTION IF EXISTS public.record_connected_movement(uuid, uuid, uuid, uuid, timestamptz, text, text, boolean);
```
No RLS, no schema, no other RPC touched.

### 2. `src/hooks/movement/useConnectedMovement.ts`
- Add optional `movement_status?: 'scheduled' | 'dispatched'` to `RecordConnectedMovementData`.
- Always pass `p_movement_status` (default `'dispatched'`) so the call resolves to the 9-arg overload unambiguously even before migration runs.
- Replace the generic `error.message` toast with a friendly localized fallback (`movement.connected.recordFailed`). Keep `console.error` and the existing `No accepted connection` / `Permission denied` branches.

### 3. `src/components/movement/RecordMovementDialog.tsx`
- In the connected branch (line ~429), pass `movement_status: isScheduled ? 'scheduled' : 'dispatched'`. No UI changes; existing scheduled toggle/UX preserved.

### 4. i18n
Add `movement.connected.recordFailed` to `src/i18n/locales/en.ts` and `ar.ts`:
- EN: "Could not record the connected movement. Please try again or contact support."
- AR: "تعذر تسجيل الحركة المرتبطة. حاول مرة أخرى أو تواصل مع الدعم."

## Date/time note (Phase 1.e.h)
The review screen uses `new Date(scheduledAt).toLocaleString()` (line ~1369). Replacing it with `formatStandardDateTime` is a one-line, display-only swap and is safe, but per the prompt's preference to keep RPC fix isolated, **deferring to Phase 1.e.h** — there are likely sibling date displays in the same screen that should be normalized together.

## Out of scope (unchanged)
Breeding, Option C, `partnerEligibility`, `useConnectedDestinations` filtering, `AddPartnerDialog`, permissions/role presets, other RPCs, RLS, external locations, Incoming branch confirm (Phase 1.e.f), Arrival, Transfer, External departure.

## Validation
- Migration approval → build/typecheck passes.
- Submit connected Departure (Al Qemmah → اسطبل الصفوة) → no ambiguity error; sender row + recipient incoming row created (immediate) or sender scheduled row only (scheduled).
- Recipient Incoming tab shows the row; Phase 1.e.f branch-confirm flow still works.
- External departure / Arrival / Transfer / Add Partner bridge unchanged.
- Raw RPC errors no longer reach the toast.

## Files
**Inspected:** `useConnectedMovement.ts`, `RecordMovementDialog.tsx`, both migration definitions of `record_connected_movement`, `IncomingArrivals.tsx` (sanity).
**Changed:** new migration (drop 8-arg overload), `useConnectedMovement.ts`, `RecordMovementDialog.tsx`, `en.ts`, `ar.ts`.
