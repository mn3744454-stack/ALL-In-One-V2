import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { Database } from "@/integrations/supabase/types";

type SharingAuditLog = Database["public"]["Tables"]["sharing_audit_log"]["Row"];

export interface AuditLogFilters {
  connectionId?: string;
  grantId?: string;
  eventType?: string;
}

export function useSharingAuditLog(filters?: AuditLogFilters) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;

  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sharing_audit_log", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("sharing_audit_log")
        .select("*")
        .or(`actor_tenant_id.eq.${tenantId},target_tenant_id.eq.${tenantId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.connectionId) {
        query = query.eq("connection_id", filters.connectionId);
      }

      if (filters?.grantId) {
        query = query.eq("grant_id", filters.grantId);
      }

      if (filters?.eventType) {
        query = query.eq("event_type", filters.eventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SharingAuditLog[];
    },
    enabled: !!tenantId,
  });

  return {
    logs: logs || [],
    isLoading,
    error,
    refetch,
  };
}
