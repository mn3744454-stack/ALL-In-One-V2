import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PermissionBundle, BundlePermission } from "./usePermissions";

export interface DelegationAuditLog {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  target_member_id: string;
  permission_key: string;
  action: string;
  created_at: string;
}

export function usePermissionBundles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id;

  // Fetch all bundles for tenant
  const { data: bundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ["permission-bundles", tenantId],
    queryFn: async (): Promise<PermissionBundle[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("permission_bundles" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bundles:", error);
        return [];
      }
      return (data || []) as unknown as PermissionBundle[];
    },
    enabled: !!tenantId,
  });

  // Fetch all bundle permissions for tenant bundles
  const bundleIds = bundles.map((b) => b.id);
  const { data: allBundlePermissions = [], isLoading: loadingBundlePerms } = useQuery({
    queryKey: ["all-bundle-permissions", bundleIds],
    queryFn: async (): Promise<BundlePermission[]> => {
      if (bundleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("bundle_permissions" as any)
        .select("*")
        .in("bundle_id", bundleIds);

      if (error) {
        console.error("Error fetching bundle permissions:", error);
        return [];
      }
      return (data || []) as unknown as BundlePermission[];
    },
    enabled: bundleIds.length > 0,
  });

  // Fetch delegation audit log
  const { data: auditLog = [], isLoading: loadingAuditLog } = useQuery({
    queryKey: ["delegation-audit-log", tenantId],
    queryFn: async (): Promise<DelegationAuditLog[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("delegation_audit_log" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching audit log:", error);
        return [];
      }
      return (data || []) as unknown as DelegationAuditLog[];
    },
    enabled: !!tenantId,
  });

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      permissionKeys,
    }: {
      name: string;
      description?: string;
      permissionKeys: string[];
    }) => {
      if (!tenantId || !user) throw new Error("No tenant or user");

      // Create bundle
      const { data: bundle, error: bundleError } = await supabase
        .from("permission_bundles" as any)
        .insert({
          tenant_id: tenantId,
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (bundleError) throw bundleError;

      // Add permissions to bundle
      if (permissionKeys.length > 0) {
        const { error: permsError } = await supabase
          .from("bundle_permissions" as any)
          .insert(
            permissionKeys.map((key) => ({
              bundle_id: (bundle as any).id,
              permission_key: key,
            }))
          );

        if (permsError) throw permsError;
      }

      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-bundles", tenantId] });
      toast.success("Bundle created");
    },
    onError: (error) => {
      console.error("Create bundle error:", error);
      toast.error("Failed to create bundle");
    },
  });

  // Update bundle permissions
  const updateBundlePermissionsMutation = useMutation({
    mutationFn: async ({
      bundleId,
      permissionKeys,
    }: {
      bundleId: string;
      permissionKeys: string[];
    }) => {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("bundle_permissions" as any)
        .delete()
        .eq("bundle_id", bundleId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissionKeys.length > 0) {
        const { error: insertError } = await supabase
          .from("bundle_permissions" as any)
          .insert(
            permissionKeys.map((key) => ({
              bundle_id: bundleId,
              permission_key: key,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-bundle-permissions"] });
      toast.success("Bundle updated");
    },
    onError: (error) => {
      console.error("Update bundle error:", error);
      toast.error("Failed to update bundle");
    },
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      const { error } = await supabase
        .from("permission_bundles" as any)
        .delete()
        .eq("id", bundleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-bundles", tenantId] });
      toast.success("Bundle deleted");
    },
    onError: (error) => {
      console.error("Delete bundle error:", error);
      toast.error("Failed to delete bundle");
    },
  });

  // Assign bundle to member
  const assignBundleMutation = useMutation({
    mutationFn: async ({
      memberId,
      bundleId,
    }: {
      memberId: string;
      bundleId: string;
    }) => {
      if (!user) throw new Error("No user");

      const { error } = await supabase.from("member_permission_bundles" as any).insert({
        tenant_member_id: memberId,
        bundle_id: bundleId,
        assigned_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-permission-bundles"] });
      toast.success("Bundle assigned");
    },
    onError: (error) => {
      console.error("Assign bundle error:", error);
      toast.error("Failed to assign bundle");
    },
  });

  // Remove bundle from member
  const removeBundleMutation = useMutation({
    mutationFn: async ({
      memberId,
      bundleId,
    }: {
      memberId: string;
      bundleId: string;
    }) => {
      const { error } = await supabase
        .from("member_permission_bundles" as any)
        .delete()
        .eq("tenant_member_id", memberId)
        .eq("bundle_id", bundleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-permission-bundles"] });
      toast.success("Bundle removed");
    },
    onError: (error) => {
      console.error("Remove bundle error:", error);
      toast.error("Failed to remove bundle");
    },
  });

  // Grant/revoke individual permission
  const setMemberPermissionMutation = useMutation({
    mutationFn: async ({
      memberId,
      permissionKey,
      granted,
    }: {
      memberId: string;
      permissionKey: string;
      granted: boolean;
    }) => {
      if (!user || !tenantId) throw new Error("No user or tenant");

      // Upsert permission override
      const { error } = await supabase.from("member_permissions" as any).upsert(
        {
          tenant_member_id: memberId,
          permission_key: permissionKey,
          granted,
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        },
        {
          onConflict: "tenant_member_id,permission_key",
        }
      );

      if (error) throw error;

      // Get target member's tenant_id for audit log
      const { data: memberData } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("id", memberId)
        .single();

      // Log the action
      await supabase.from("delegation_audit_log" as any).insert({
        tenant_id: memberData?.tenant_id || tenantId,
        actor_user_id: user.id,
        target_member_id: memberId,
        permission_key: permissionKey,
        action: granted ? "granted" : "revoked",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["delegation-audit-log", tenantId] });
      toast.success("Permission updated");
    },
    onError: (error) => {
      console.error("Set permission error:", error);
      toast.error("Failed to update permission");
    },
  });

  // Remove permission override
  const removeMemberPermissionMutation = useMutation({
    mutationFn: async ({
      memberId,
      permissionKey,
    }: {
      memberId: string;
      permissionKey: string;
    }) => {
      const { error } = await supabase
        .from("member_permissions" as any)
        .delete()
        .eq("tenant_member_id", memberId)
        .eq("permission_key", permissionKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-permissions"] });
      toast.success("Override removed");
    },
    onError: (error) => {
      console.error("Remove override error:", error);
      toast.error("Failed to remove override");
    },
  });

  const getBundlePermissions = (bundleId: string): string[] => {
    return allBundlePermissions
      .filter((bp) => bp.bundle_id === bundleId)
      .map((bp) => bp.permission_key);
  };

  return {
    // Data
    bundles,
    allBundlePermissions,
    auditLog,
    getBundlePermissions,

    // Loading states
    loading: loadingBundles || loadingBundlePerms || loadingAuditLog,

    // Mutations
    createBundle: createBundleMutation.mutateAsync,
    updateBundlePermissions: updateBundlePermissionsMutation.mutateAsync,
    deleteBundle: deleteBundleMutation.mutateAsync,
    assignBundle: assignBundleMutation.mutateAsync,
    removeBundle: removeBundleMutation.mutateAsync,
    setMemberPermission: setMemberPermissionMutation.mutateAsync,
    removeMemberPermission: removeMemberPermissionMutation.mutateAsync,

    // Mutation states
    isCreating: createBundleMutation.isPending,
    isUpdating: updateBundlePermissionsMutation.isPending,
    isDeleting: deleteBundleMutation.isPending,
  };
}
