import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import type { MovementType } from "./useHorseMovements";

/**
 * Returns horses filtered by movement-type eligibility.
 *
 * - IN (arrival): only horses NOT currently housed (housing_unit_id IS NULL)
 *   and without active/draft/checkout_pending admissions
 * - OUT (departure): only horses currently inside the given branch
 * - TRANSFER: only horses currently inside the given branch
 */
export function useEligibleHorses(
  movementType: MovementType | null,
  branchId?: string | null,
) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { horses, loading: horsesLoading } = useHorses();

  // Fetch active admission horse IDs to exclude from arrival
  const { data: activeAdmissionHorseIds = [], isLoading: admissionsLoading } = useQuery({
    queryKey: ["active-admission-horse-ids", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("boarding_admissions")
        .select("horse_id")
        .eq("tenant_id", tenantId)
        .in("status", ["active", "draft", "checkout_pending"]);
      if (error) return [];
      return (data || []).map((r: any) => r.horse_id as string);
    },
    enabled: !!tenantId,
  });

  // Fetch pending incoming horse IDs to exclude from arrival
  const { data: pendingIncomingHorseIds = [], isLoading: incomingLoading } = useQuery({
    queryKey: ["pending-incoming-horse-ids", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("incoming_horse_movements")
        .select("horse_id")
        .eq("receiver_tenant_id", tenantId)
        .eq("status", "pending");
      if (error) return [];
      return (data || []).map((r: any) => r.horse_id as string);
    },
    enabled: !!tenantId,
  });

  const eligible = useMemo(() => {
    if (!movementType) return horses;

    switch (movementType) {
      case "in":
        // Arrival: exclude horses currently inside (have housing) or with active admissions
        return horses.filter((h) => {
          if (h.housing_unit_id) return false;
          if (activeAdmissionHorseIds.includes(h.id)) return false;
          if (pendingIncomingHorseIds.includes(h.id)) return false;
          return true;
        });

      case "out":
        // Departure: only horses currently inside the branch
        return horses.filter((h) => {
          if (!h.current_location_id) return false;
          if (branchId && h.current_location_id !== branchId) return false;
          return true;
        });

      case "transfer":
        // Transfer: only horses currently inside
        return horses.filter((h) => {
          if (!h.current_location_id) return false;
          if (branchId && h.current_location_id !== branchId) return false;
          return true;
        });

      default:
        return horses;
    }
  }, [horses, movementType, branchId, activeAdmissionHorseIds, pendingIncomingHorseIds]);

  return {
    eligibleHorses: eligible,
    allHorses: horses,
    loading: horsesLoading || admissionsLoading || incomingLoading,
  };
}
