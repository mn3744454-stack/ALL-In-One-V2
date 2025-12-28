import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type LabEventEntityType = 'lab_sample' | 'lab_result';

export interface LabEvent {
  id: string;
  tenant_id: string;
  entity_type: LabEventEntityType;
  entity_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  // Joined fields
  creator?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface LabEventFilters {
  entity_type?: LabEventEntityType;
  entity_id?: string;
}

export function useLabEvents(filters: LabEventFilters = {}) {
  const [events, setEvents] = useState<LabEvent[]>([]);
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
        .from("lab_events")
        .select(`
          *,
          creator:profiles!lab_events_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filters.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }
      if (filters.entity_id) {
        query = query.eq("entity_id", filters.entity_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as LabEvent[]);
    } catch (error) {
      console.error("Error fetching lab events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.entity_type, filters.entity_id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    refresh: fetchEvents,
  };
}
