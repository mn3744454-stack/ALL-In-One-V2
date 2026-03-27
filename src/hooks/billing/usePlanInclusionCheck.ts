import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { normalizeIncludes } from "@/lib/planIncludes";

/**
 * Checks whether a horse's active boarding plan includes a given service.
 * Returns { isIncluded, planName } for informational display at invoice time.
 */
export function usePlanInclusionCheck(horseId: string | undefined, serviceId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data } = useQuery({
    queryKey: ["plan-inclusion-check", tenantId, horseId, serviceId],
    queryFn: async () => {
      if (!tenantId || !horseId || !serviceId) return { isIncluded: false, planName: null };

      // Find the horse's active boarding admission with a plan
      const { data: admission } = await supabase
        .from("boarding_admissions")
        .select("plan_id")
        .eq("tenant_id", tenantId)
        .eq("horse_id", horseId)
        .eq("status", "active")
        .not("plan_id", "is", null)
        .maybeSingle();

      if (!admission?.plan_id) return { isIncluded: false, planName: null };

      // Fetch the plan and check includes
      const { data: plan } = await supabase
        .from("stable_service_plans")
        .select("name, name_ar, includes")
        .eq("id", admission.plan_id)
        .maybeSingle();

      if (!plan) return { isIncluded: false, planName: null };

      const included = normalizeIncludes(plan.includes);
      const isIncluded = included.some(entry => entry.service_id === serviceId);

      return {
        isIncluded,
        planName: plan.name,
        planNameAr: (plan as any).name_ar || null,
      };
    },
    enabled: !!tenantId && !!horseId && !!serviceId,
    staleTime: 30_000,
  });

  return useMemo(() => ({
    isIncluded: data?.isIncluded ?? false,
    planName: data?.planName ?? null,
    planNameAr: (data as any)?.planNameAr ?? null,
  }), [data]);
}
