import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useMemo } from "react";

export interface HorseLifecycleState {
  horse_id: string;
  tenant_id: string | null;
  open_admission_id: string | null;
  open_admission_status: string | null;
  needs_admission: boolean | null;
  needs_placement: boolean | null;
  is_temporarily_out: boolean | null;
  latest_movement_status: string | null;
  latest_movement_subtype: string | null;
  latest_movement_id: string | null;
}

/**
 * Operational status precedence (highest to lowest):
 *   1. temporarily_out
 *   2. in_transit (latest_movement_status = 'dispatched')
 *   3. needs_placement
 *   4. needs_admission
 *   5. housed (open_admission_status in active/checkout_pending)
 *   6. scheduled (latest_movement_status = 'scheduled')
 *   7. unknown — caller may fall back to raw horses.status
 */
export type OperationalStatus =
  | "temporarily_out"
  | "in_transit"
  | "needs_placement"
  | "needs_admission"
  | "housed"
  | "scheduled"
  | "unknown";

export function deriveOperationalStatus(
  state: HorseLifecycleState | null | undefined
): OperationalStatus {
  if (!state) return "unknown";
  if (state.is_temporarily_out) return "temporarily_out";
  if (state.latest_movement_status === "dispatched") return "in_transit";
  if (state.needs_placement) return "needs_placement";
  if (state.needs_admission) return "needs_admission";
  if (
    state.open_admission_status === "active" ||
    state.open_admission_status === "checkout_pending"
  ) {
    return "housed";
  }
  if (state.latest_movement_status === "scheduled") return "scheduled";
  return "unknown";
}

/**
 * Fetch lifecycle state for a list of horse IDs (single batched query).
 */
export function useHorseLifecycleStates(horseIds: (string | null | undefined)[]) {
  const { activeTenant } = useTenant();
  const ids = useMemo(
    () => Array.from(new Set(horseIds.filter((id): id is string => !!id))).sort(),
    [horseIds]
  );

  const query = useQuery({
    queryKey: ["horse-lifecycle-states", activeTenant?.id, ids],
    enabled: !!activeTenant?.id && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_horse_lifecycle_state" as any)
        .select(
          "horse_id, tenant_id, open_admission_id, open_admission_status, needs_admission, needs_placement, is_temporarily_out, latest_movement_status, latest_movement_subtype, latest_movement_id"
        )
        .in("horse_id", ids);
      if (error) throw error;
      return (data || []) as unknown as HorseLifecycleState[];
    },
  });

  const map = useMemo(() => {
    const m = new Map<string, HorseLifecycleState>();
    (query.data || []).forEach((row) => m.set(row.horse_id, row));
    return m;
  }, [query.data]);

  return {
    states: query.data || [],
    statesByHorseId: map,
    getState: (horseId: string | null | undefined) =>
      horseId ? map.get(horseId) ?? null : null,
    getStatus: (horseId: string | null | undefined): OperationalStatus =>
      deriveOperationalStatus(horseId ? map.get(horseId) : null),
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Convenience single-horse variant.
 */
export function useHorseLifecycleState(horseId: string | null | undefined) {
  const { statesByHorseId, isLoading, error } = useHorseLifecycleStates(
    horseId ? [horseId] : []
  );
  const state = horseId ? statesByHorseId.get(horseId) ?? null : null;
  return {
    state,
    status: deriveOperationalStatus(state),
    isLoading,
    error,
  };
}
