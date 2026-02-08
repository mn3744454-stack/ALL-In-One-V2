import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/hooks/use-toast";

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
 * SMOKE TEST 10.1:
 * 1. Select "Sami AL-Hurabi" as client in wizard
 * 2. Proceed to Horses step
 * 3. Expected: Only horses linked to Sami appear in the list
 * 4. Go back, select "No Client"
 * 5. Expected: Horse list is empty (no linked horses)
 */

/**
 * Fetch lab_horse IDs linked to a specific client via party_horse_links
 * Used for 10.1: filtering horses by selected client in the wizard
 * 
 * CRITICAL: This is the ONLY source of truth for client->horse relationships.
 * Do NOT use lab_horses.client_id for filtering.
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
 * SMOKE TEST 7.3: Owner Quick View
 * 1. Navigate to horse "Yab" profile
 * 2. Click owner name in header card
 * 3. Expected: Popover shows "View Client Profile" button if junction link exists
 * 4. Expected: If no junction link, shows "Not linked to a client" (no button)
 */

/**
 * Fetch the primary client for a lab horse (owner quick view)
 * Returns client details for the primary lab_customer relationship
 * 
 * CRITICAL: Uses junction table ONLY. No fallback to lab_horses.client_id.
 */
export function usePrimaryClientForHorse(labHorseId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: queryKeys.partyHorseLinks(tenantId, { labHorseId, primary: true }),
    queryFn: async () => {
      if (!labHorseId || !tenantId) return null;

      // Get primary link for this horse (junction table is the ONLY source of truth)
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
 * SMOKE TEST: New Horse Links to Client
 * 1. In wizard with Sami selected, click "Register New Horse"
 * 2. Enter name "TestHorse456", save
 * 3. Expected: Success toast "Horse linked to client successfully"
 * 4. Expected: New horse appears in Sami's list immediately
 * 5. DB check: party_horse_links row with is_primary=true, client_id=Sami's ID
 */

/**
 * SMOKE TEST: Primary Link Enforcement
 * 1. Link Horse A to Client X (primary)
 * 2. Link Horse A to Client Y (primary) via wizard
 * 3. DB check: Only ONE row with is_primary=true (Client Y)
 * 4. Client X row still exists but is_primary=false
 */

/**
 * Create a new party-horse link using the RPC function
 * This ensures atomic primary enforcement with advisory locking
 */
export function useCreatePartyHorseLink() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (data: CreatePartyHorseLinkData) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      // Use RPC for atomic primary enforcement with advisory lock
      // The RPC validates auth.uid() internally and sets created_by automatically
      const { data: link, error } = await supabase
        .rpc("set_primary_party_horse_link", {
          p_tenant_id: tenantId,
          p_client_id: data.client_id,
          p_lab_horse_id: data.lab_horse_id,
          p_relationship_type: data.relationship_type,
        });

      if (error) {
        // Log and rethrow - don't silently swallow errors
        console.error("Failed to create party-horse link:", error);
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
    onError: (error) => {
      console.error("useCreatePartyHorseLink error:", error);
    },
  });
}
