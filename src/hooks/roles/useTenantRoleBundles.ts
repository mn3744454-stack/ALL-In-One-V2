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

  // Set bundles for a role (replaces all existing)
  const setRoleBundlesMutation = useMutation({
    mutationFn: async (data: { roleKey: string; bundleIds: string[] }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      // Delete existing
      const { error: deleteError } = await supabase
        .from("tenant_role_bundles" as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("role_key", data.roleKey);

      if (deleteError) throw deleteError;

      // Insert new ones
      if (data.bundleIds.length > 0) {
        const inserts = data.bundleIds.map((bundleId) => ({
          tenant_id: tenantId,
          role_key: data.roleKey,
          bundle_id: bundleId,
          created_by: user.id,
        }));

        const { error: insertError } = await supabase
          .from("tenant_role_bundles" as any)
          .insert(inserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-role-bundles", tenantId] });
      toast.success("تم تحديث حزم الدور بنجاح");
    },
    onError: (error: any) => {
      console.error("Error setting role bundles:", error);
      toast.error(error.message || "فشل في تحديث حزم الدور");
    },
  });

  return {
    roleBundles,
    isLoading,
    getRoleBundles,
    setRoleBundles: setRoleBundlesMutation.mutate,
    isUpdating: setRoleBundlesMutation.isPending,
  };
}
