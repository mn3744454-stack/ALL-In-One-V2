import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { Database } from "@/integrations/supabase/types";

type ConsentGrant = Database["public"]["Tables"]["consent_grants"]["Row"];

export interface CreateGrantParams {
  connectionId: string;
  resourceType: string;
  resourceIds?: string[];
  accessLevel?: string;
  dateFrom?: string;
  dateTo?: string;
  forwardOnly?: boolean;
  excludedFields?: string[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export function useConsentGrants(connectionId?: string) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Fetch grants for a connection or all grants for tenant
  const {
    data: grants,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["consent_grants", tenantId, connectionId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("consent_grants")
        .select("*")
        .eq("grantor_tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ConsentGrant[];
    },
    enabled: !!tenantId,
  });

  // Create grant via RPC
  const createGrant = useMutation({
    mutationFn: async (params: CreateGrantParams) => {
      const { data, error } = await supabase.rpc("create_consent_grant", {
        _connection_id: params.connectionId,
        _resource_type: params.resourceType,
        _resource_ids: params.resourceIds || null,
        _access_level: params.accessLevel || "read",
        _date_from: params.dateFrom || null,
        _date_to: params.dateTo || null,
        _forward_only: params.forwardOnly || false,
        _excluded_fields: params.excludedFields || [],
        _expires_at: params.expiresAt || null,
        _metadata: (params.metadata || {}) as Record<string, never>,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent_grants", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.grants.created"),
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

  // Revoke grant via RPC
  const revokeGrant = useMutation({
    mutationFn: async (grantId: string) => {
      const { data, error } = await supabase.rpc("revoke_consent_grant", {
        _grant_id: grantId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent_grants", tenantId] });
      toast({
        title: t("common.success"),
        description: t("connections.grants.revoked"),
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

  // Get granted data via RPC (for recipient side)
  const getGrantedData = async (
    grantId: string,
    dateFrom?: string,
    dateTo?: string
  ) => {
    const { data, error } = await supabase.rpc("get_granted_data", {
      _grant_id: grantId,
      _date_from: dateFrom || null,
      _date_to: dateTo || null,
    });

    if (error) throw error;
    return data;
  };

  return {
    grants: grants || [],
    isLoading,
    error,
    refetch,
    createGrant,
    revokeGrant,
    getGrantedData,
  };
}
