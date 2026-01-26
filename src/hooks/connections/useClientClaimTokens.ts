import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { Database } from "@/integrations/supabase/types";

type ClientClaimToken = Database["public"]["Tables"]["client_claim_tokens"]["Row"];

export function useClientClaimTokens(clientId?: string) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Fetch tokens for a specific client
  const {
    data: tokens,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["client_claim_tokens", tenantId, clientId],
    queryFn: async () => {
      if (!tenantId || !clientId) return [];

      const { data, error } = await supabase
        .from("client_claim_tokens")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientClaimToken[];
    },
    enabled: !!tenantId && !!clientId,
  });

  // Generate claim token via RPC
  const generateToken = useMutation({
    mutationFn: async (targetClientId: string) => {
      const { data, error } = await supabase.rpc("generate_client_claim_token", {
        _client_id: targetClientId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_claim_tokens", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.portal.tokenGenerated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Claim client portal via RPC
  const claimPortal = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("claim_client_portal", {
        _token: token,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: t("common.success"),
        description: t("connections.portal.claimed"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke claim token via RPC
  const revokeToken = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("revoke_client_claim_token", {
        _token: token,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_claim_tokens", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.portal.tokenRevoked"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get active token (if any)
  const activeToken = tokens?.find((t) => t.status === "active");

  return {
    tokens: tokens || [],
    activeToken,
    isLoading,
    error,
    refetch,
    generateToken,
    claimPortal,
    revokeToken,
  };
}
