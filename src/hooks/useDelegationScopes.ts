import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DelegationScope {
  id: string;
  tenant_id: string;
  grantor_member_id: string;
  permission_key: string;
  can_delegate: boolean;
  created_by: string | null;
  created_at: string;
}

export function useDelegationScopes(memberId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;

  // Fetch delegation scopes for a specific member
  const { data: scopes = [], isLoading } = useQuery({
    queryKey: ["delegation-scopes", tenantId, memberId],
    queryFn: async (): Promise<DelegationScope[]> => {
      if (!tenantId || !memberId) return [];

      const { data, error } = await supabase
        .from("delegation_scopes" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("grantor_member_id", memberId);

      if (error) {
        console.error("Error fetching delegation scopes:", error);
        return [];
      }
      return (data || []) as unknown as DelegationScope[];
    },
    enabled: !!tenantId && !!memberId,
  });

  // Convert to a map for easy lookup
  const scopeMap = new Map(
    scopes.map((s) => [s.permission_key, s.can_delegate])
  );

  // Toggle delegation scope for a permission
  const toggleScopeMutation = useMutation({
    mutationFn: async ({
      permissionKey,
      canDelegate,
    }: {
      permissionKey: string;
      canDelegate: boolean;
    }) => {
      if (!tenantId || !memberId || !user) {
        throw new Error("Missing required context");
      }

      // Upsert the delegation scope
      const { error } = await supabase.from("delegation_scopes" as any).upsert(
        {
          tenant_id: tenantId,
          grantor_member_id: memberId,
          permission_key: permissionKey,
          can_delegate: canDelegate,
          created_by: user.id,
        },
        {
          onConflict: "tenant_id,grantor_member_id,permission_key",
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delegation-scopes", tenantId, memberId],
      });
      toast.success("Delegation scope updated");
    },
    onError: (error) => {
      console.error("Toggle scope error:", error);
      toast.error("Failed to update delegation scope");
    },
  });

  // Remove delegation scope
  const removeScopeMutation = useMutation({
    mutationFn: async (permissionKey: string) => {
      if (!tenantId || !memberId) {
        throw new Error("Missing required context");
      }

      const { error } = await supabase
        .from("delegation_scopes" as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("grantor_member_id", memberId)
        .eq("permission_key", permissionKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delegation-scopes", tenantId, memberId],
      });
      toast.success("Delegation scope removed");
    },
    onError: (error) => {
      console.error("Remove scope error:", error);
      toast.error("Failed to remove delegation scope");
    },
  });

  return {
    scopes,
    scopeMap,
    isLoading,
    canDelegatePermission: (key: string) => scopeMap.get(key) ?? false,
    toggleScope: toggleScopeMutation.mutateAsync,
    removeScope: removeScopeMutation.mutateAsync,
    isUpdating: toggleScopeMutation.isPending || removeScopeMutation.isPending,
  };
}
