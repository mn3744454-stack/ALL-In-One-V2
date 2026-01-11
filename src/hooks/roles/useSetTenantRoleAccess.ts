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
      // Use predicate-based invalidation for precise cache clearing
      const affectedRoots = new Set([
        "tenant-role-permissions",
        "tenant-role-bundles",
        "tenant-roles",
        "permission-definitions",
        "bundle-permissions",
        "member-permissions",
        "member-permission-bundles",
        "delegation-scopes",
        "my-delegation-scopes",
      ]);

      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          if (!Array.isArray(key) || key.length === 0) return false;
          const root = String(key[0]);
          if (!affectedRoots.has(root)) return false;

          // Tenant-scoped queries: only invalidate if tenantId matches
          const hasTenantInKey = tenantId && key.includes(tenantId);
          
          // Global queries (permission-definitions, bundle-permissions) without tenantId
          const isGlobalRoot = root === "permission-definitions" || root === "bundle-permissions";
          const isGlobalKey = key.length === 1; // Only root, no tenantId

          if (hasTenantInKey) return true;
          if (isGlobalRoot && isGlobalKey) return true;

          return false;
        },
      });
      // No toast here - handled in DashboardRolesSettings after full save
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
