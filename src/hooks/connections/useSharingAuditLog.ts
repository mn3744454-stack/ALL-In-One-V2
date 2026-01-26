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
    data: rawData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["sharing_audit_log", tenantId, filters, loadedCount],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch pageSize+1 to accurately detect if more data exists
      let query = supabase
        .from("sharing_audit_log")
        .select("*")
        .or(`actor_tenant_id.eq.${tenantId},target_tenant_id.eq.${tenantId}`)
        .order("created_at", { ascending: false })
        .range(0, loadedCount); // Fetch one extra row

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

  // Slice to requested size; hasMore = fetched more than pageSize
  const logs = rawData?.slice(0, loadedCount) ?? [];
  const hasMore = (rawData?.length ?? 0) > loadedCount;

  const loadMore = useCallback(() => {
    setLoadedCount((prev) => prev + pageSize);
  }, [pageSize]);

  const resetPagination = useCallback(() => {
    setLoadedCount(pageSize);
    queryClient.invalidateQueries({ queryKey: ["sharing_audit_log", tenantId] });
  }, [pageSize, queryClient, tenantId]);

  // hasMore is now computed above from the +1 fetch approach

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
