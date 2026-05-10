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
  // H2 additive fields
  is_housed: boolean | null;
  is_in_transit: boolean | null;
  is_departed: boolean | null;
  departed_at: string | null;
  active_movement_id: string | null;
  active_movement_status: string | null;
  active_movement_subtype: string | null;
  latest_completed_movement_id: string | null;
  latest_completed_movement_status: string | null;
  latest_completed_movement_subtype: string | null;
  next_scheduled_movement_id: string | null;
  next_scheduled_movement_at: string | null;
  is_admission_draft: boolean | null;
}

/**
 * Operational status precedence (highest to lowest, post-H2):
 *   1. departed
 *   2. temporarily_out
 *   3. in_transit
 *   4. needs_placement
 *   5. needs_admission
 *   6. housed
 *   7. scheduled (next future scheduled movement exists)
 *   8. unknown — labelled "Not Currently Housed" / "غير مسكّن حاليًا"
 */
export type OperationalStatus =
  | "departed"
  | "temporarily_out"
  | "in_transit"
  | "needs_placement"
  | "needs_admission"
  | "housed"
  | "scheduled"
  | "unknown";

const SELECT_COLS =
  "horse_id, tenant_id, open_admission_id, open_admission_status, needs_admission, needs_placement, is_temporarily_out, latest_movement_status, latest_movement_subtype, latest_movement_id, is_housed, is_in_transit, is_departed, departed_at, active_movement_id, active_movement_status, active_movement_subtype, latest_completed_movement_id, latest_completed_movement_status, latest_completed_movement_subtype, next_scheduled_movement_id, next_scheduled_movement_at, is_admission_draft";

export const HORSE_LIFECYCLE_SELECT = SELECT_COLS;

export function deriveOperationalStatus(
  state: HorseLifecycleState | null | undefined
): OperationalStatus {
  if (!state) return "unknown";
  if (state.is_departed) return "departed";
  if (state.is_temporarily_out) return "temporarily_out";
  if (state.is_in_transit) return "in_transit";
  if (state.needs_placement) return "needs_placement";
  if (state.needs_admission) return "needs_admission";
  if (state.is_housed) return "housed";
  if (
    !state.is_housed &&
    (state.open_admission_status === "active" ||
      state.open_admission_status === "checkout_pending")
  ) {
    // Defensive fallback: open admission with unit but is_housed not set.
    return "housed";
  }
  if (state.next_scheduled_movement_id) return "scheduled";
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
        .select(SELECT_COLS)
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
