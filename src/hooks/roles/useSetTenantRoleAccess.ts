import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

interface SetRoleAccessParams {
  roleKey: string;
  permissionKeys: string[];
  bundleIds: string[];
}

export function useSetTenantRoleAccess() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  const mutation = useMutation({
    mutationFn: async (params: SetRoleAccessParams) => {
      if (!tenantId) throw new Error("No tenant selected");

      const { error } = await supabase.rpc("set_tenant_role_access", {
        _tenant_id: tenantId,
        _role_key: params.roleKey,
        _permission_keys: params.permissionKeys,
        _bundle_ids: params.bundleIds,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate tenant-scoped queries only
      queryClient.invalidateQueries({ queryKey: ["tenant-role-permissions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-role-bundles", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-roles", tenantId] });
      // Invalidate effective permissions cache (tenant-scoped where applicable)
      queryClient.invalidateQueries({ queryKey: ["permission-definitions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["member-permission-bundles", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["bundle-permissions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["member-permissions", tenantId] });
      // Also invalidate without tenantId for global caches
      queryClient.invalidateQueries({ queryKey: ["permission-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["bundle-permissions"] });
    },
    onError: (error: any) => {
      console.error("Error setting role access:", error);
      toast.error(error.message || "فشل في تحديث صلاحيات الدور");
    },
  });

  return {
    setRoleAccess: mutation.mutate,
    setRoleAccessAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
