import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface HorseOrderEvent {
  id: string;
  tenant_id: string;
  order_id: string;
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
  };
}

export function useHorseOrderEvents(orderId?: string) {
  const [events, setEvents] = useState<HorseOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();

  const fetchEvents = useCallback(async () => {
    if (!activeTenant?.tenant.id || !orderId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horse_order_events")
        .select(`
          *,
          creator:profiles!created_by(id, full_name, avatar_url)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents((data as unknown as HorseOrderEvent[]) || []);
    } catch (error) {
      console.error("Error fetching order events:", error);
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, orderId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    refresh: fetchEvents,
  };
}
