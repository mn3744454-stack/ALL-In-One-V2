import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { HORSE_LIFECYCLE_SELECT, type HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";

/**
 * Pass 2-D — Frontend-only hook surfacing branch-level "Needs Attention" horses
 * driven by `vw_horse_lifecycle_state` rather than the legacy unassigned bucket.
 *
 * Needs Placement = lifecycle.needs_placement = true AND horses.current_location_id = branchId
 * Needs Admission = lifecycle.needs_admission = true AND horses.current_location_id = branchId
 *
 * Read-only: this hook does not mutate any data. No backend objects are created.
 */
export interface BranchAttentionHorse {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
  lifecycle: HorseLifecycleState;
}

export function useBranchAttentionHorses(branchId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const query = useQuery({
    queryKey: ["branch-attention-horses", tenantId, branchId],
    enabled: !!tenantId && !!branchId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId || !branchId) return { needsPlacement: [], needsAdmission: [] };

      const { data: horses, error: horsesErr } = await supabase
        .from("horses")
        .select("id, name, name_ar, avatar_url, current_location_id")
        .eq("tenant_id", tenantId)
        .eq("current_location_id", branchId);
      if (horsesErr) throw horsesErr;

      const ids = (horses || []).map((h: any) => h.id);
      if (ids.length === 0) return { needsPlacement: [], needsAdmission: [] };

      const { data: states, error: stateErr } = await supabase
        .from("vw_horse_lifecycle_state" as any)
        .select(HORSE_LIFECYCLE_SELECT)
        .in("horse_id", ids);
      if (stateErr) throw stateErr;

      const stateByHorse = new Map<string, HorseLifecycleState>();
      ((states as unknown as HorseLifecycleState[]) || []).forEach((s) =>
        stateByHorse.set(s.horse_id, s)
      );

      const needsPlacement: BranchAttentionHorse[] = [];
      const needsAdmission: BranchAttentionHorse[] = [];

      (horses || []).forEach((h: any) => {
        const lc = stateByHorse.get(h.id);
        if (!lc) return;
        const row: BranchAttentionHorse = {
          id: h.id,
          name: h.name,
          name_ar: h.name_ar,
          avatar_url: h.avatar_url ?? null,
          lifecycle: lc,
        };
        if (lc.needs_placement) needsPlacement.push(row);
        else if (lc.needs_admission) needsAdmission.push(row);
      });

      return { needsPlacement, needsAdmission };
    },
  });

  return {
    needsPlacementHorses: query.data?.needsPlacement ?? [],
    needsAdmissionHorses: query.data?.needsAdmission ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
