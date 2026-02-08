import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
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

interface UseConsentGrantsOptions {
  recipientView?: boolean;
}

export function useConsentGrants(connectionId?: string, options: UseConsentGrantsOptions = {}) {
  const { recipientView = false } = options;
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();

  // Fetch grants for a connection
  // recipientView=true: fetch by connection_id only (RLS enforces auth)
  // recipientView=false: fetch grants created by this tenant (grantor view)
  const {
    data: grants,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.consentGrants(tenantId, connectionId, recipientView),
    queryFn: async () => {
      // For recipient view, we only need connectionId
      // For grantor view, we need tenantId
      if (recipientView) {
        if (!connectionId) return [];
      } else {
        if (!tenantId) return [];
      }

      let query = supabase
        .from("consent_grants")
        .select("*")
        .order("created_at", { ascending: false });

      if (recipientView) {
        // Recipient view: fetch by connection_id, RLS ensures authorization
        // Filter to active grants only for recipient view
        query = query.eq("connection_id", connectionId).eq("status", "active");
      } else {
        // Grantor view: fetch grants this tenant created
        query = query.eq("grantor_tenant_id", tenantId);
        if (connectionId) {
          query = query.eq("connection_id", connectionId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ConsentGrant[];
    },
    enabled: recipientView ? !!connectionId : !!tenantId,
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
      // Invalidate all grants and connection queries (grants affect connection display)
      queryClient.invalidateQueries({ queryKey: ["consent-grants"] });
      queryClient.invalidateQueries({ queryKey: ["connections-with-details"] });
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
      queryClient.invalidateQueries({ queryKey: ["consent-grants"] });
      queryClient.invalidateQueries({ queryKey: ["connections-with-details"] });
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
