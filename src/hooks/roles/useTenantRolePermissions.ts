import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantRolePermission {
  id: string;
  tenant_id: string;
  role_key: string;
  permission_key: string;
  granted: boolean;
  created_by: string | null;
  created_at: string;
}

export function useTenantRolePermissions() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  // Fetch all role-permission mappings
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ["tenant-role-permissions", tenantId],
    queryFn: async (): Promise<TenantRolePermission[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_role_permissions" as any)
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Error fetching role permissions:", error);
        return [];
      }
      return (data || []) as unknown as TenantRolePermission[];
    },
    enabled: !!tenantId,
  });

  // Get permissions for a specific role
  const getRolePermissions = (roleKey: string): string[] => {
    return rolePermissions
      .filter((rp) => rp.role_key === roleKey && rp.granted)
      .map((rp) => rp.permission_key);
  };

  // NOTE: Direct mutation removed - use useSetTenantRoleAccess RPC for atomic updates
  // Kept for backwards compatibility but deprecated
  return {
    rolePermissions,
    isLoading,
    getRolePermissions,
  };
}
