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
 * Uses get_connection_party_names RPC for RLS-safe cross-tenant name resolution.
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

      const connectionIds = connectionsData.map((c) => c.id);

      // Step 2: Fetch party names via SECURITY DEFINER RPC + active grants in parallel
      const [partyNamesResult, grantsResult] = await Promise.all([
        supabase.rpc("get_connection_party_names", {
          _connection_ids: connectionIds,
        }),
        supabase
          .from("consent_grants")
          .select("connection_id, resource_type, status")
          .in("connection_id", connectionIds)
          .eq("status", "active"),
      ]);

      // Build entity lookup map from RPC results
      const entityMap = new Map<
        string,
        { display_name: string; entity_kind: string; entity_subtype: string | null }
      >();
      if (partyNamesResult.data) {
        for (const row of partyNamesResult.data) {
          entityMap.set(row.entity_id, {
            display_name: row.display_name,
            entity_kind: row.entity_kind,
            entity_subtype: row.entity_subtype,
          });
        }
      }

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

      // Step 3: Merge data
      const enrichedConnections: ConnectionWithDetails[] = connectionsData.map(
        (conn) => {
          const initiatorTenant = entityMap.get(conn.initiator_tenant_id);
          const recipientTenant = conn.recipient_tenant_id
            ? entityMap.get(conn.recipient_tenant_id)
            : undefined;
          const recipientProfile = conn.recipient_profile_id
            ? entityMap.get(conn.recipient_profile_id)
            : undefined;
          const initiatorProfile = conn.initiator_user_id
            ? entityMap.get(conn.initiator_user_id)
            : undefined;
          const grantsSummary = grantsMap.get(conn.id);

          return {
            ...conn,
            initiator_tenant_name: initiatorTenant?.display_name,
            initiator_tenant_type: initiatorTenant?.entity_subtype || undefined,
            initiator_profile_name: initiatorProfile?.display_name,
            recipient_tenant_name: recipientTenant?.display_name,
            recipient_tenant_type: recipientTenant?.entity_subtype || undefined,
            recipient_profile_name: recipientProfile?.display_name,
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
