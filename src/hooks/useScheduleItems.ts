import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ScheduleItem {
  id: string;
  module: "vet" | "vaccinations" | "breeding" | "movement" | "academy" | "laboratory" | "vet_followups";
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

      // Fetch vet followups
      if (!modules || modules.includes("vet_followups")) {
        const { data: followups } = await supabase
          .from("vet_followups")
          .select("id, due_at, type, status, treatment:vet_treatments(id, title, horse_id, horses:horses(id, name))")
          .eq("tenant_id", tenantId)
          .gte("due_at", startDate)
          .lte("due_at", endDate);

        followups?.forEach((f: any) => {
          allItems.push({
            id: f.id,
            module: "vet_followups",
            title: f.type || "Followup",
            startAt: f.due_at,
            status: f.status,
            entityType: "vet_followup",
            entityId: f.id,
            routeToOpen: "/dashboard/vet",
            horseName: f.treatment?.horses?.name,
            color: "emerald",
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

      // Fetch horse movements
      if (!modules || modules.includes("movement")) {
        const { data: movements } = await supabase
          .from("horse_movements")
          .select("id, movement_at, movement_type, reason, horse:horses(id, name)")
          .eq("tenant_id", tenantId)
          .gte("movement_at", startDate)
          .lte("movement_at", endDate);

        movements?.forEach((m: any) => {
          allItems.push({
            id: m.id,
            module: "movement",
            title: `${m.movement_type} - ${m.horse?.name || "Unknown"}`,
            startAt: m.movement_at,
            entityType: "horse_movement",
            entityId: m.id,
            routeToOpen: "/dashboard/movement",
            horseName: m.horse?.name,
            color: "orange",
          });
        });
      }

      // Fetch academy sessions
      if (!modules || modules.includes("academy")) {
        const { data: sessions } = await supabase
          .from("academy_sessions")
          .select("id, title, start_at, end_at, is_active")
          .eq("tenant_id", tenantId)
          .gte("start_at", startDate)
          .lte("start_at", endDate);

        sessions?.forEach((s: any) => {
          allItems.push({
            id: s.id,
            module: "academy",
            title: s.title,
            startAt: s.start_at,
            endAt: s.end_at,
            status: s.is_active ? "active" : "inactive",
            entityType: "academy_session",
            entityId: s.id,
            routeToOpen: "/dashboard/academy",
            color: "purple",
          });
        });
      }

      // Fetch lab samples
      if (!modules || modules.includes("laboratory")) {
        const { data: samples } = await supabase
          .from("lab_samples")
          .select("id, collection_date, status, horse:horses(id, name)")
          .eq("tenant_id", tenantId)
          .gte("collection_date", startDate)
          .lte("collection_date", endDate);

        samples?.forEach((s: any) => {
          allItems.push({
            id: s.id,
            module: "laboratory",
            title: `Sample - ${s.horse?.name || "Unknown"}`,
            startAt: s.collection_date,
            status: s.status,
            entityType: "lab_sample",
            entityId: s.id,
            routeToOpen: "/dashboard/laboratory",
            horseName: s.horse?.name,
            color: "cyan",
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
