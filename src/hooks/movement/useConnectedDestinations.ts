import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface ConnectedDestination {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_type: string | null;
  connection_id: string;
}

const ALLOWED_DESTINATION_TYPES = ['stable', 'clinic'];

/**
 * Fetches accepted B2B connections and resolves partner tenant names
 * for use as connected movement destinations.
 */
export function useConnectedDestinations() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ['connected-destinations', tenantId],
    queryFn: async (): Promise<ConnectedDestination[]> => {
      if (!tenantId) return [];

      // Fetch accepted B2B connections
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('id, initiator_tenant_id, recipient_tenant_id')
        .eq('status', 'accepted')
        .eq('connection_type', 'b2b')
        .or(`initiator_tenant_id.eq.${tenantId},recipient_tenant_id.eq.${tenantId}`);

      if (connError) throw connError;
      if (!connections?.length) return [];

      // Get partner tenant IDs
      const partnerIds = connections.map(c =>
        c.initiator_tenant_id === tenantId ? c.recipient_tenant_id : c.initiator_tenant_id
      ).filter((id): id is string => !!id);

      if (!partnerIds.length) return [];

      // Resolve partner names via get_connection_party_names
      const { data: partyNames } = await supabase.rpc('get_connection_party_names', {
        _connection_ids: connections.map(c => c.id),
      });

      const entityMap = new Map<string, { display_name: string; entity_subtype: string | null }>();
      if (partyNames) {
        for (const row of partyNames) {
          entityMap.set(row.entity_id, {
            display_name: row.display_name,
            entity_subtype: row.entity_subtype,
          });
        }
      }

      // For partners with null subtype, try direct tenant lookup as fallback
      const missingSubtypeIds = partnerIds.filter(id => {
        const info = entityMap.get(id);
        return !info || !info.entity_subtype;
      });

      if (missingSubtypeIds.length > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, name, type')
          .in('id', missingSubtypeIds);
        if (tenantRows) {
          for (const t of tenantRows) {
            const existing = entityMap.get(t.id);
            entityMap.set(t.id, {
              display_name: existing?.display_name || t.name || 'Unknown',
              entity_subtype: existing?.entity_subtype || t.type,
            });
          }
        }
      }

      // Build destinations, filter by allowed types
      const results: ConnectedDestination[] = [];
      for (const conn of connections) {
        const partnerId = conn.initiator_tenant_id === tenantId
          ? conn.recipient_tenant_id
          : conn.initiator_tenant_id;
        if (!partnerId) continue;

        const info = entityMap.get(partnerId);
        const tenantType = info?.entity_subtype || null;

        // Only include explicitly typed allowed destination types
        if (!tenantType || !ALLOWED_DESTINATION_TYPES.includes(tenantType)) continue;

        results.push({
          id: partnerId,
          tenant_id: partnerId,
          tenant_name: info?.display_name || 'Unknown',
          tenant_type: tenantType,
          connection_id: conn.id,
        });
      }

      return results;
    },
    enabled: !!tenantId,
  });

  return { destinations, isLoading };
}
