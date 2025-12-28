import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface VetEvent {
  id: string;
  tenant_id: string;
  entity_type: 'vet_treatment' | 'horse_vaccination' | 'vet_followup';
  entity_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Json;
  created_by: string | null;
  created_at: string;
  creator?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export function useVetEvents(entityType?: string, entityId?: string) {
  const [events, setEvents] = useState<VetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();

  const fetchEvents = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("vet_events")
        .select(`
          *,
          creator:profiles!vet_events_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as VetEvent[]);
    } catch (error) {
      console.error("Error fetching vet events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, entityType, entityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    refresh: fetchEvents,
  };
}
