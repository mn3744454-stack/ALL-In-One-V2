import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  module: "vet" | "lab" | "breeding" | "orders";
  entityType: string;
  entityId: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  payload?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  creatorName?: string;
}

interface UseActivityLogParams {
  tenantId?: string;
  module?: string;
  limit?: number;
}

export function useActivityLog({ tenantId, module, limit = 20 }: UseActivityLogParams) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", tenantId, module, limit],
    queryFn: async () => {
      if (!tenantId) return { items: [], totalCount: 0 };

      const allItems: ActivityItem[] = [];

      // Fetch vet events
      if (!module || module === "vet") {
        const { data: vetEvents } = await supabase
          .from("vet_events")
          .select("id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by, created_at, creator:profiles(full_name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        vetEvents?.forEach((e) => {
          allItems.push({
            id: e.id,
            module: "vet",
            entityType: e.entity_type,
            entityId: e.entity_id,
            eventType: e.event_type,
            fromStatus: e.from_status || undefined,
            toStatus: e.to_status || undefined,
            payload: e.payload as Record<string, unknown> | undefined,
            createdBy: e.created_by || "",
            createdAt: e.created_at,
            creatorName: e.creator?.full_name || undefined,
          });
        });
      }

      // Fetch lab events
      if (!module || module === "lab") {
        const { data: labEvents } = await supabase
          .from("lab_events")
          .select("id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by, created_at, creator:profiles(full_name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        labEvents?.forEach((e) => {
          allItems.push({
            id: e.id,
            module: "lab",
            entityType: e.entity_type,
            entityId: e.entity_id,
            eventType: e.event_type,
            fromStatus: e.from_status || undefined,
            toStatus: e.to_status || undefined,
            payload: e.payload as Record<string, unknown> | undefined,
            createdBy: e.created_by || "",
            createdAt: e.created_at,
            creatorName: e.creator?.full_name || undefined,
          });
        });
      }

      // Fetch breeding events
      if (!module || module === "breeding") {
        const { data: breedingEvents } = await supabase
          .from("breeding_events")
          .select("id, entity_type, entity_id, event_type, from_status, to_status, payload, created_by, created_at, creator:profiles(full_name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(limit);

        breedingEvents?.forEach((e) => {
          allItems.push({
            id: e.id,
            module: "breeding",
            entityType: e.entity_type,
            entityId: e.entity_id,
            eventType: e.event_type,
            fromStatus: e.from_status || undefined,
            toStatus: e.to_status || undefined,
            payload: e.payload as Record<string, unknown> | undefined,
            createdBy: e.created_by || "",
            createdAt: e.created_at,
            creatorName: e.creator?.full_name || undefined,
          });
        });
      }

      // Sort by created_at desc
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        items: allItems.slice(0, limit),
        totalCount: allItems.length,
      };
    },
    enabled: !!tenantId,
  });

  return {
    items: data?.items || [],
    totalCount: data?.totalCount || 0,
    isLoading,
  };
}
