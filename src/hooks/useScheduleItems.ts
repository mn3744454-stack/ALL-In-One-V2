import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { format } from "date-fns";

export interface ScheduleItem {
  id: string;
  module: "vet" | "vaccinations" | "breeding" | "movement" | "academy" | "laboratory";
  title: string;
  startAt: string;
  endAt?: string;
  status?: string;
  entityType: string;
  entityId: string;
  routeToOpen?: string;
  horseName?: string;
  color: string;
}

interface UseScheduleItemsParams {
  tenantId?: string;
  dateRange: { start: Date; end: Date };
  modules?: string[];
}

export function useScheduleItems({ tenantId, dateRange, modules }: UseScheduleItemsParams) {
  const startDate = format(dateRange.start, "yyyy-MM-dd");
  const endDate = format(dateRange.end, "yyyy-MM-dd");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["schedule-items", tenantId, startDate, endDate, modules],
    queryFn: async () => {
      if (!tenantId) return [];

      const allItems: ScheduleItem[] = [];

      // Fetch vet visits
      if (!modules || modules.includes("vet")) {
        const { data: vetVisits } = await supabase
          .from("vet_visits")
          .select("id, title, scheduled_date, scheduled_end_date, status, horse_id, horses(id, name)")
          .eq("tenant_id", tenantId)
          .gte("scheduled_date", startDate)
          .lte("scheduled_date", endDate);

        vetVisits?.forEach((v: any) => {
          const horseName = v.horses?.name;
          allItems.push({
            id: v.id,
            module: "vet",
            title: v.title || "Vet Visit",
            startAt: v.scheduled_date,
            endAt: v.scheduled_end_date || undefined,
            status: v.status,
            entityType: "vet_visit",
            entityId: v.id,
            routeToOpen: "/dashboard/vet",
            horseName,
            color: "green",
          });
        });
      }

      // Fetch vaccinations
      if (!modules || modules.includes("vaccinations")) {
        const { data: vaccinations } = await supabase
          .from("horse_vaccinations")
          .select("id, due_date, status, horse:horses(id, name), program:vaccination_programs(name)")
          .eq("tenant_id", tenantId)
          .gte("due_date", startDate)
          .lte("due_date", endDate);

        vaccinations?.forEach((v) => {
          allItems.push({
            id: v.id,
            module: "vaccinations",
            title: v.program?.name || "Vaccination",
            startAt: v.due_date,
            status: v.status,
            entityType: "vaccination",
            entityId: v.id,
            routeToOpen: "/dashboard/vet",
            horseName: v.horse?.name,
            color: "blue",
          });
        });
      }

      // Fetch breeding attempts
      if (!modules || modules.includes("breeding")) {
        const { data: attempts } = await supabase
          .from("breeding_attempts")
          .select("id, attempt_date, attempt_type, result, mare:horses!breeding_attempts_mare_id_fkey(id, name)")
          .eq("tenant_id", tenantId)
          .gte("attempt_date", startDate)
          .lte("attempt_date", endDate);

        attempts?.forEach((a) => {
          allItems.push({
            id: a.id,
            module: "breeding",
            title: `${a.attempt_type} - ${a.mare?.name || "Unknown"}`,
            startAt: a.attempt_date,
            status: a.result,
            entityType: "breeding_attempt",
            entityId: a.id,
            routeToOpen: "/dashboard/breeding",
            horseName: a.mare?.name,
            color: "pink",
          });
        });
      }

      // Sort by start date
      allItems.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      return allItems;
    },
    enabled: !!tenantId,
  });

  return { items, isLoading };
}
