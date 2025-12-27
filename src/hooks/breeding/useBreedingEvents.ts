import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface BreedingEvent {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  // Joined
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useBreedingEvents(entityType?: string, entityId?: string) {
  const [events, setEvents] = useState<BreedingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();

  const fetchEvents = useCallback(async () => {
    if (!activeTenant?.tenant?.id || !entityType || !entityId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("breeding_events")
        .select(`
          *,
          creator:profiles!breeding_events_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents((data as unknown as BreedingEvent[]) || []);
    } catch (error) {
      console.error("Error fetching breeding events:", error);
      toast.error("Failed to load activity history");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, entityType, entityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    refresh: fetchEvents,
  };
}
