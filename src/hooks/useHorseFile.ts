import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

/**
 * AD-1 Pass H1 — Horse File single-row source of truth.
 *
 * The Horse Profile page previously used a local useState/useEffect fetch
 * which ignored every Housing/Movement/Admission invalidation broadcast
 * via useHousingInvalidation. As a result, the enriched location join
 * (branch_data / area_data / unit_data) went stale after internal
 * transfers, place-in-unit, open-admission, cancel-movement, temporary
 * out, return, and final checkout — even though useHorses (the list)
 * already refreshed.
 *
 * This hook moves Horse Profile onto TanStack Query keyed by
 *   ['horse', tenantId, horseId]
 * The same key is now part of the canonical Housing key map (see
 * useHousingInvalidation KEY_MAP under occupancy/admission/movement),
 * so every housing-side mutation refetches Horse Profile automatically.
 *
 * Database joins are unchanged from the legacy fetch so downstream UI
 * (location card, admission card, lifecycle chip, edit wizard prefill)
 * receives the exact same shape it always has.
 */
export interface HorseFileRow {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  birth_date?: string | null;
  birth_at?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  height?: number | null;
  weight?: number | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  notes?: string | null;
  mane_marks?: string | null;
  body_marks?: string | null;
  legs_marks?: string | null;
  distinctive_marks_notes?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  images?: string[] | null;
  videos?: string[] | null;
  current_location_id?: string | null;
  current_area_id?: string | null;
  housing_unit_id?: string | null;
  branch_id?: string | null;
  breed_data?: { name: string } | null;
  color_data?: { name: string } | null;
  branch_data?: { id: string; name: string } | null;
  stable_data?: { name: string } | null;
  area_data?: {
    id: string;
    name: string;
    name_ar: string | null;
    facility_type?: string | null;
  } | null;
  unit_data?: {
    id: string;
    code: string;
    name: string | null;
    name_ar: string | null;
  } | null;
  [key: string]: any;
}

export function useHorseFile(horseId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;

  const query = useQuery({
    queryKey: ["horse", tenantId, horseId],
    enabled: !!horseId,
    staleTime: 15_000,
    queryFn: async (): Promise<HorseFileRow | null> => {
      if (!horseId) return null;
      const { data, error } = await supabase
        .from("horses")
        .select(
          `
          *,
          breed_data:horse_breeds(name),
          color_data:horse_colors(name),
          branch_data:branches!branch_id(id, name),
          stable_data:stables(name),
          area_data:facility_areas!current_area_id(id, name, name_ar, facility_type),
          unit_data:housing_units!housing_unit_id(id, code, name, name_ar),
          owners_count:horse_ownership(count)
        `,
        )
        .eq("id", horseId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as HorseFileRow) ?? null;
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["horse", tenantId, horseId] });

  return {
    horse: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}
