import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";

export type PartyHorseRelationshipType = 'lab_customer' | 'payer' | 'owner' | 'trainer' | 'stable';

export interface PartyHorseLink {
  id: string;
  tenant_id: string;
  client_id: string;
  lab_horse_id: string;
  relationship_type: PartyHorseRelationshipType;
  is_primary: boolean;
  created_at: string;
  created_by: string | null;
}

export interface CreatePartyHorseLinkData {
  client_id: string;
  lab_horse_id: string;
  relationship_type: PartyHorseRelationshipType;
  is_primary?: boolean;
}

/**
 * Fetch lab_horse IDs linked to a specific client via party_horse_links
 * Used for 10.1: filtering horses by selected client in the wizard
 */
export function useLinkedLabHorseIds(clientId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: queryKeys.partyHorseLinks(tenantId, { clientId }),
    queryFn: async () => {
      if (!clientId || !tenantId) return [];

      const { data, error } = await supabase
        .from("party_horse_links")
        .select("lab_horse_id")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId);

      if (error) throw error;
      return (data || []).map(row => row.lab_horse_id);
    },
    enabled: !!tenantId && !!clientId,
    placeholderData: [],
  });
}

/**
 * Fetch the primary client for a lab horse (owner quick view)
 * Returns client details for the primary lab_customer relationship
 */
export function usePrimaryClientForHorse(labHorseId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: queryKeys.partyHorseLinks(tenantId, { labHorseId, primary: true }),
    queryFn: async () => {
      if (!labHorseId || !tenantId) return null;

      // Get primary link for this horse
      const { data: linkData, error: linkError } = await supabase
        .from("party_horse_links")
        .select("client_id")
        .eq("tenant_id", tenantId)
        .eq("lab_horse_id", labHorseId)
        .eq("relationship_type", "lab_customer")
        .eq("is_primary", true)
        .maybeSingle();

      if (linkError) throw linkError;
      if (!linkData) return null;

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, name_ar, email, phone")
        .eq("id", linkData.client_id)
        .single();

      if (clientError) throw clientError;
      return clientData;
    },
    enabled: !!tenantId && !!labHorseId,
  });
}

/**
 * Create a new party-horse link (used when registering a horse for a client)
 */
export function useCreatePartyHorseLink() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (data: CreatePartyHorseLinkData) => {
      if (!tenantId || !user?.id) {
        throw new Error("No active tenant or user");
      }

      const { data: link, error } = await supabase
        .from("party_horse_links")
        .insert({
          tenant_id: tenantId,
          client_id: data.client_id,
          lab_horse_id: data.lab_horse_id,
          relationship_type: data.relationship_type,
          is_primary: data.is_primary ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Ignore unique constraint violation (link already exists)
        if (error.code === "23505") {
          return null;
        }
        throw error;
      }
      return link as PartyHorseLink;
    },
    onSuccess: () => {
      // Invalidate party horse links queries
      queryClient.invalidateQueries({ 
        queryKey: ['party-horse-links', tenantId] 
      });
      // Also invalidate lab horses to refresh filtered lists
      queryClient.invalidateQueries({ 
        queryKey: ['lab-horses', tenantId] 
      });
    },
  });
}
