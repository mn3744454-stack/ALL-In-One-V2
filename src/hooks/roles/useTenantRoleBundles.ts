import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantRoleBundle {
  id: string;
  tenant_id: string;
  role_key: string;
  bundle_id: string;
  created_by: string | null;
  created_at: string;
}

export function useTenantRoleBundles() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  // Fetch all role-bundle mappings
  const { data: roleBundles = [], isLoading } = useQuery({
    queryKey: ["tenant-role-bundles", tenantId],
    queryFn: async (): Promise<TenantRoleBundle[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_role_bundles" as any)
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Error fetching role bundles:", error);
        return [];
      }
      return (data || []) as unknown as TenantRoleBundle[];
    },
    enabled: !!tenantId,
  });

  // Get bundles for a specific role
  const getRoleBundles = (roleKey: string): string[] => {
    return roleBundles
      .filter((rb) => rb.role_key === roleKey)
      .map((rb) => rb.bundle_id);
  };

  // NOTE: Direct mutation removed - use useSetTenantRoleAccess RPC for atomic updates
  // Kept for backwards compatibility but deprecated
  return {
    roleBundles,
    isLoading,
    getRoleBundles,
  };
}
