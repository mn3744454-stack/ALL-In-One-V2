import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];
type ConnectionType = Database["public"]["Enums"]["connection_type"];

export interface CreateConnectionParams {
  connectionType: ConnectionType;
  recipientTenantId?: string;
  recipientProfileId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export function useConnections() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant_id;
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Fetch connections where tenant is initiator/recipient OR user is profile-based recipient
  const {
    data: connections,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["connections", tenantId, userId],
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

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(filters.join(","))
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!(tenantId || userId),
  });

  // Create connection via RPC
  const createConnection = useMutation({
    mutationFn: async (params: CreateConnectionParams) => {
      if (!tenantId) throw new Error("No active tenant");

      const { data, error } = await supabase.rpc("create_connection_request", {
        _connection_type: params.connectionType,
        _initiator_tenant_id: tenantId,
        _recipient_tenant_id: params.recipientTenantId || null,
        _recipient_profile_id: params.recipientProfileId || null,
        _recipient_email: params.recipientEmail || null,
        _recipient_phone: params.recipientPhone || null,
        _expires_at: params.expiresAt || null,
        _metadata: (params.metadata || {}) as Record<string, never>,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.created"),
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

  // Accept connection via RPC
  const acceptConnection = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_connection", {
        _token: token,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast({
        title: t("common.success"),
        description: t("connections.accepted"),
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

  // Reject connection via RPC
  const rejectConnection = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("reject_connection", {
        _token: token,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.rejected"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Revoke connection via RPC
  const revokeConnection = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("revoke_connection", {
        _token: token,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.revoked"),
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

  return {
    connections: connections || [],
    isLoading,
    error,
    refetch,
    createConnection,
    acceptConnection,
    rejectConnection,
    revokeConnection,
  };
}
