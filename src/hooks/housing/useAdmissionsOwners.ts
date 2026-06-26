import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { OwnerRow } from "@/lib/horses/ownerDisplay";

/**
 * Phase 1.e.f.7.g.4.3.1 — Batched horse ownership lookup for Admissions surfaces.
 *
 * Returns a Map<horse_id, OwnerRow[]> keyed by horse id so AdmissionsList /
 * AdmissionDetailSheet can render the legal Owner alongside the admission's
 * Client (payer) without N+1 queries and without bloating the canonical
 * `useBoardingAdmissions` query. Empty array for horses with no ownership rows.
 */
export function useAdmissionsOwners(horseIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? null;
  const sortedKey = [...new Set(horseIds.filter(Boolean))].sort().join(",");

  return useQuery({
    queryKey: ["admissions-owners", tenantId, sortedKey],
    enabled: !!tenantId && sortedKey.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, OwnerRow[]>> => {
      const ids = sortedKey ? sortedKey.split(",") : [];
      if (ids.length === 0) return new Map();
      const { data, error } = await (supabase as any)
        .from("horse_ownership")
        .select(`
          horse_id, is_primary, ownership_percentage, created_at,
          owner:horse_owners(id, name, name_ar)
        `)
        .in("horse_id", ids);
      if (error) {
        // RLS may legitimately hide some rows; surface empty map rather than crash.
        return new Map();
      }
      const map = new Map<string, OwnerRow[]>();
      for (const row of (data || []) as any[]) {
        const list = map.get(row.horse_id) || [];
        list.push({
          is_primary: row.is_primary,
          ownership_percentage: row.ownership_percentage,
          created_at: row.created_at,
          owner: row.owner ?? null,
        });
        map.set(row.horse_id, list);
      }
      return map;
    },
  });
}
