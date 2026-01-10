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

  // Set permissions for a role (replaces all existing)
  const setRolePermissionsMutation = useMutation({
    mutationFn: async (data: { roleKey: string; permissionKeys: string[] }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      // Delete existing
      const { error: deleteError } = await supabase
        .from("tenant_role_permissions" as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("role_key", data.roleKey);

      if (deleteError) throw deleteError;

      // Insert new ones
      if (data.permissionKeys.length > 0) {
        const inserts = data.permissionKeys.map((permissionKey) => ({
          tenant_id: tenantId,
          role_key: data.roleKey,
          permission_key: permissionKey,
          granted: true,
          created_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from("tenant_role_permissions" as any)
          .insert(inserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-role-permissions", tenantId] });
      toast.success("تم تحديث صلاحيات الدور بنجاح");
    },
    onError: (error: any) => {
      console.error("Error setting role permissions:", error);
      toast.error(error.message || "فشل في تحديث صلاحيات الدور");
    },
  });

  return {
    rolePermissions,
    isLoading,
    getRolePermissions,
    setRolePermissions: setRolePermissionsMutation.mutate,
    isUpdating: setRolePermissionsMutation.isPending,
  };
}
