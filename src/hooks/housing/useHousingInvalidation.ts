import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';

/**
 * ════════════════════════════════════════════════════════════════════════
 *  Canonical Housing Invalidation Helper
 * ════════════════════════════════════════════════════════════════════════
 *
 *  This is the SINGLE source of truth for invalidating Housing-domain
 *  React Query caches. It exists to converge three previously divergent
 *  invalidation surfaces into one canonical key map:
 *
 *    1. Platform realtime sync (useTenantRealtimeSync)
 *    2. Hook-level mutation onSuccess invalidation
 *    3. Ad-hoc component-level invalidation blocks
 *
 *  RULES OF USE
 *  ────────────
 *  • Mutations MUST call invalidate(scopes) instead of hand-rolling
 *    queryClient.invalidateQueries calls.
 *  • Compose scopes when a mutation has cross-domain effects:
 *      admission create   → ['admission','occupancy']
 *      checkout           → ['admission','occupancy','movement']
 *      branch archive     → ['branch','structure','occupancy']
 *      facility archive   → ['structure','occupancy']
 *      internal move      → ['occupancy','movement']
 *  • The realtime sync (useTenantRealtimeSync) reuses the same key
 *    families so realtime events and local mutations converge.
 *
 *  ADDING A NEW HOUSING CONSUMER
 *  ─────────────────────────────
 *  Add the query key to KEY_MAP under the appropriate scope(s). That is
 *  the only place that needs editing for new derived/aggregate queries.
 *  ════════════════════════════════════════════════════════════════════════
 */

export type HousingScope =
  | 'occupancy'   // housing_unit_occupants writes (vacate, orphan-remove, internal-move physical leg, open-area presence)
  | 'structure'   // housing_units / facility_areas writes (create/edit/archive/restore room or facility)
  | 'admission'   // boarding_admissions writes (create/update/initiate-checkout/checkout, billing links, eligibility)
  | 'branch'      // branches writes (create/edit/archive/restore/deactivate; cascades into structure+occupancy)
  | 'movement'    // horse_movements / incoming_horse_movements writes (arrivals, departures, transfers)
  | 'all';        // safety net — invalidates the entire housing canonical key map

/**
 * The complete canonical key family for the Housing domain.
 * Every query that derives Housing truth MUST appear here.
 *
 * Keys appear under every scope that legitimately invalidates them.
 * Realtime sync (useTenantRealtimeSync) consults the same families.
 */
const KEY_MAP: Record<Exclude<HousingScope, 'all'>, readonly string[]> = {
  occupancy: [
    'unit-occupants',
    'housing-units',          // current_occupants is computed inside this query
    'inline-facility-units',  // FacilitiesManager grid + occupant join
    'branch-overview-stats',  // BranchOverview occupied/vacant counters
    'expanded-branch-detail', // ExpandedBranchDetail facility/horse breakdown
    'unit-history',           // Room Event History (Section 3 of UnitDetailsSheet)
    'open-area-horses',       // Paddock/pasture occupancy view
    'horses',                 // Horse current_location_id / housing_unit_id
    'occupant-admissions',    // UnitDetailsSheet horse-admission summaries
    'unit-lifecycle-blockers',
  ],
  structure: [
    'housing-units',
    'inline-facility-units',
    'facility-areas',
    'facility-all-units-count',
    'facility-admission-count',
    'branch-overview-stats',
    'expanded-branch-detail',
    'unit-lifecycle-blockers',
  ],
  admission: [
    'boarding-admissions',
    'boarding-admission',
    'boarding-status-history',
    'horse-active-admission',
    'occupant-admissions',
    'unit-lifecycle-blockers',
    'admission-financials',
    'active-admission-horse-ids',
    'inline-facility-units',  // grid status badges depend on admission state
    'branch-overview-stats',  // branch totals can shift when admissions land/leave
    'facility-admission-count',
    'expanded-branch-detail',
    'horses',
  ],
  branch: [
    'locations',              // branch dropdown / branch list
    'branch-overview-stats',
    'expanded-branch-detail',
    'facility-areas',         // cascades from branch deactivation/archive
    'housing-units',          // cascades from branch deactivation/archive
    'inline-facility-units',
  ],
  movement: [
    'horse-movements',
    'incoming-movements',
    'pending-incoming-horse-ids',
    'pending-outbound-b2b',
    'active-admission-horse-ids',
    'horses',
  ],
};

/**
 * Merge the requested scopes into a single, deduplicated key family.
 */
function resolveKeys(scopes: HousingScope[]): string[] {
  if (scopes.includes('all')) {
    const all = new Set<string>();
    (Object.values(KEY_MAP) as readonly string[][]).forEach(family => {
      family.forEach(k => all.add(k));
    });
    return Array.from(all);
  }
  const out = new Set<string>();
  scopes.forEach(scope => {
    if (scope === 'all') return;
    KEY_MAP[scope].forEach(k => out.add(k));
  });
  return Array.from(out);
}

/**
 * Hook returning a stable invalidate(scopes) function.
 *
 * The function invalidates each canonical key under the active tenant.
 * It also performs a tenant-less prefix invalidation as a safety net,
 * because a small number of legacy callsites use ['key'] (no tenant
 * suffix) which would otherwise be missed by tenant-scoped matching.
 *
 * Tenant scoping note: the tenant-less prefix is a SUPERSET match in
 * TanStack Query and will only hit queries whose key starts with the
 * given prefix. There is no cross-tenant leakage for the common
 * ['key', tenantId, ...] pattern because the [tenantId] segment is
 * always present in the cache entry — invalidating ['key'] still only
 * invalidates queries the current user can observe.
 */
export function useHousingInvalidation() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const invalidate = useCallback(
    (scopes: HousingScope | HousingScope[]) => {
      const scopeList = Array.isArray(scopes) ? scopes : [scopes];
      const keys = resolveKeys(scopeList);

      keys.forEach(key => {
        // Tenant-scoped (canonical pattern: [key, tenantId, ...])
        if (tenantId) {
          queryClient.invalidateQueries({
            queryKey: [key, tenantId],
            refetchType: 'active',
          });
        }
        // Tenant-less safety net for the few legacy [key, ...] callsites.
        // Prefix-matched, so still scoped to the cache the user observes.
        queryClient.invalidateQueries({
          queryKey: [key],
          refetchType: 'active',
        });
      });
    },
    [queryClient, tenantId],
  );

  return { invalidate };
}

/**
 * Exposed for useTenantRealtimeSync so the realtime layer can resolve
 * the same canonical key families when DB events arrive.
 */
export function getHousingKeysForScopes(scopes: HousingScope[]): string[] {
  return resolveKeys(scopes);
}
