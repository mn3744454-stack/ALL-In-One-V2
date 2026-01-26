import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useState, useCallback } from "react";
import type { Database } from "@/integrations/supabase/types";

type SharingAuditLog = Database["public"]["Tables"]["sharing_audit_log"]["Row"];

export interface AuditLogFilters {
  connectionId?: string;
  grantId?: string;
  eventType?: string;
}

const DEFAULT_PAGE_SIZE = 25;

export function useSharingAuditLog(filters?: AuditLogFilters, pageSize = DEFAULT_PAGE_SIZE) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;
  const queryClient = useQueryClient();
  const [loadedCount, setLoadedCount] = useState(pageSize);

  const {
    data: logs,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["sharing_audit_log", tenantId, filters, loadedCount],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("sharing_audit_log")
        .select("*")
        .or(`actor_tenant_id.eq.${tenantId},target_tenant_id.eq.${tenantId}`)
        .order("created_at", { ascending: false })
        .range(0, loadedCount - 1);

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

  const loadMore = useCallback(() => {
    setLoadedCount((prev) => prev + pageSize);
  }, [pageSize]);

  const resetPagination = useCallback(() => {
    setLoadedCount(pageSize);
    queryClient.invalidateQueries({ queryKey: ["sharing_audit_log", tenantId] });
  }, [pageSize, queryClient, tenantId]);

  // Check if there might be more to load
  const hasMore = (logs?.length ?? 0) >= loadedCount;

  return {
    logs: logs || [],
    isLoading,
    isFetching,
    error,
    refetch,
    loadMore,
    hasMore,
    resetPagination,
  };
}
