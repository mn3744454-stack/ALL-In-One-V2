import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

export interface ConnectionWithDetails extends Connection {
  initiator_tenant_name?: string;
  initiator_tenant_type?: string;
  initiator_profile_name?: string;
  recipient_tenant_name?: string;
  recipient_tenant_type?: string;
  recipient_profile_name?: string;
  active_grants_count: number;
  active_grant_types: string[];
}

/**
 * Fetches connections with partner tenant/profile display details and grants summary.
 * This is a read-optimized hook for displaying connections with rich context.
 */
export function useConnectionsWithDetails() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant_id;
  const userId = user?.id;

  const {
    data: connections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.connectionsWithDetails(tenantId, userId),
    queryFn: async () => {
      // Build OR filter: tenant-based + profile-based
      const filters: string[] = [];
      if (tenantId) {
        filters.push(`initiator_tenant_id.eq.${tenantId}`);
        filters.push(`recipient_tenant_id.eq.${tenantId}`);
      }
      if (userId) {
        filters.push(`recipient_profile_id.eq.${userId}`);
        filters.push(`initiator_user_id.eq.${userId}`);
      }

      if (filters.length === 0) return [];

      // Step 1: Fetch connections
      const { data: connectionsData, error: connError } = await supabase
        .from("connections")
        .select("*")
        .or(filters.join(","))
        .order("created_at", { ascending: false });

      if (connError) throw connError;
      if (!connectionsData || connectionsData.length === 0) return [];

      // Step 2: Collect unique tenant IDs and profile IDs
      const tenantIds = new Set<string>();
      const profileIds = new Set<string>();

      connectionsData.forEach((c) => {
        if (c.initiator_tenant_id) tenantIds.add(c.initiator_tenant_id);
        if (c.recipient_tenant_id) tenantIds.add(c.recipient_tenant_id);
        if (c.recipient_profile_id) profileIds.add(c.recipient_profile_id);
        if (c.initiator_user_id) profileIds.add(c.initiator_user_id);
      });

      // Step 3: Fetch tenant names in parallel
      const [tenantsResult, profilesResult, grantsResult] = await Promise.all([
        tenantIds.size > 0
          ? supabase
              .from("tenants")
              .select("id, name, type")
              .in("id", Array.from(tenantIds))
          : Promise.resolve({ data: [], error: null }),
        profileIds.size > 0
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", Array.from(profileIds))
          : Promise.resolve({ data: [], error: null }),
        // Fetch active grants counts per connection
        supabase
          .from("consent_grants")
          .select("connection_id, resource_type, status")
          .in(
            "connection_id",
            connectionsData.map((c) => c.id)
          )
          .eq("status", "active"),
      ]);

      // Build lookup maps
      const tenantMap = new Map<string, { name: string; type: string }>();
      tenantsResult.data?.forEach((t) => {
        tenantMap.set(t.id, { name: t.name, type: t.type });
      });

      const profileMap = new Map<string, string | undefined>();
      profilesResult.data?.forEach((p) => {
        profileMap.set(p.id, p.full_name || undefined);
      });

      // Build grants summary map
      const grantsMap = new Map<
        string,
        { count: number; types: Set<string> }
      >();
      grantsResult.data?.forEach((g) => {
        const existing = grantsMap.get(g.connection_id) || {
          count: 0,
          types: new Set<string>(),
        };
        existing.count += 1;
        existing.types.add(g.resource_type);
        grantsMap.set(g.connection_id, existing);
      });

      // Step 4: Merge data
      const enrichedConnections: ConnectionWithDetails[] = connectionsData.map(
        (conn) => {
          const initiatorTenant = tenantMap.get(conn.initiator_tenant_id);
          const recipientTenant = conn.recipient_tenant_id
            ? tenantMap.get(conn.recipient_tenant_id)
            : undefined;
          const recipientProfile = conn.recipient_profile_id
            ? profileMap.get(conn.recipient_profile_id)
            : undefined;
          const initiatorProfile = conn.initiator_user_id
            ? profileMap.get(conn.initiator_user_id)
            : undefined;
          const grantsSummary = grantsMap.get(conn.id);

          return {
            ...conn,
            initiator_tenant_name: initiatorTenant?.name,
            initiator_tenant_type: initiatorTenant?.type,
            initiator_profile_name: initiatorProfile,
            recipient_tenant_name: recipientTenant?.name,
            recipient_tenant_type: recipientTenant?.type,
            recipient_profile_name: recipientProfile,
            active_grants_count: grantsSummary?.count || 0,
            active_grant_types: grantsSummary
              ? Array.from(grantsSummary.types)
              : [],
          };
        }
      );

      return enrichedConnections;
    },
    enabled: !!(tenantId || userId),
  });

  return {
    connections: connections || [],
    isLoading,
    error,
    refetch,
  };
}
