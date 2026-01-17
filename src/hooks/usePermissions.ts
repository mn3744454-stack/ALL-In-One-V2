import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export interface PermissionDefinition {
  key: string;
  module: string;
  resource: string;
  action: string;
  display_name: string;
  display_name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_delegatable: boolean;
}

export interface PermissionBundle {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
}

export interface BundlePermission {
  bundle_id: string;
  permission_key: string;
}

export interface MemberPermission {
  id: string;
  tenant_member_id: string;
  permission_key: string;
  granted: boolean;
  granted_by: string | null;
  granted_at: string;
}

export interface MemberPermissionBundle {
  tenant_member_id: string;
  bundle_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export function usePermissions() {
  const { user } = useAuth();
  const { activeTenant, activeRole } = useTenant();

  const tenantId = activeTenant?.tenant_id;
  const memberId = activeTenant?.id;
  const isOwner = activeRole === "owner";

  // Fetch all permission definitions
  const { data: allDefinitions = [], isLoading: loadingDefinitions } = useQuery({
    queryKey: ["permission-definitions"],
    queryFn: async (): Promise<PermissionDefinition[]> => {
      const { data, error } = await supabase
        .from("permission_definitions" as any)
        .select("*")
        .order("module", { ascending: true });

      if (error) {
        console.error("Error fetching permission definitions:", error);
        return [];
      }
      return (data || []) as unknown as PermissionDefinition[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch member's assigned bundles
  const { data: assignedBundles = [], isLoading: loadingBundles } = useQuery({
    queryKey: ["member-permission-bundles", memberId],
    queryFn: async (): Promise<MemberPermissionBundle[]> => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("member_permission_bundles" as any)
        .select("*")
        .eq("tenant_member_id", memberId);

      if (error) {
        console.error("Error fetching member bundles:", error);
        return [];
      }
      return (data || []) as unknown as MemberPermissionBundle[];
    },
    enabled: !!memberId,
  });

  // Fetch bundle permissions for assigned bundles
  const bundleIds = assignedBundles.map((b) => b.bundle_id);
  const { data: bundlePermissions = [], isLoading: loadingBundlePerms } = useQuery({
    queryKey: ["bundle-permissions", bundleIds],
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

  // Fetch member's permission overrides
  const { data: permissionOverrides = [], isLoading: loadingOverrides } = useQuery({
    queryKey: ["member-permissions", memberId],
    queryFn: async (): Promise<MemberPermission[]> => {
      if (!memberId) return [];

      const { data, error } = await supabase
        .from("member_permissions" as any)
        .select("*")
        .eq("tenant_member_id", memberId);

      if (error) {
        console.error("Error fetching member permissions:", error);
        return [];
      }
      return (data || []) as unknown as MemberPermission[];
    },
    enabled: !!memberId,
  });

  // Compute effective permissions
  const effectivePermissions = new Set<string>();

  if (isOwner) {
    // Owner has all permissions
    allDefinitions.forEach((def) => effectivePermissions.add(def.key));
  } else {
    // Start with bundle permissions
    bundlePermissions.forEach((bp) => effectivePermissions.add(bp.permission_key));

    // Apply overrides
    permissionOverrides.forEach((override) => {
      if (override.granted) {
        effectivePermissions.add(override.permission_key);
      } else {
        effectivePermissions.delete(override.permission_key);
      }
    });
  }

  const hasPermission = (key: string): boolean => {
    if (!user || !tenantId) return false;
    if (isOwner) return true;
    return effectivePermissions.has(key);
  };

  // Query delegation scopes for the current member (non-owner only)
  const { data: delegationScopes = [] } = useQuery({
    queryKey: ["my-delegation-scopes", tenantId, memberId],
    queryFn: async (): Promise<{ permission_key: string; can_delegate: boolean }[]> => {
      if (!memberId || !tenantId || isOwner) return [];

      const { data, error } = await supabase
        .from("delegation_scopes" as any)
        .select("permission_key, can_delegate")
        .eq("tenant_id", tenantId)
        .eq("grantor_member_id", memberId)
        .eq("can_delegate", true);

      if (error) {
        console.error("Error fetching delegation scopes:", error);
        return [];
      }
      return (data || []) as unknown as { permission_key: string; can_delegate: boolean }[];
    },
    enabled: !!memberId && !!tenantId && !isOwner,
  });

  const delegatableScopeSet = new Set(delegationScopes.map((s) => s.permission_key));

  const canDelegate = (key: string): boolean => {
    if (!user || !tenantId) return false;
    if (isOwner) return true;

    // Must have the permission AND delegation ability
    const hasPerm = effectivePermissions.has(key);
    const hasDelegate = effectivePermissions.has("admin.permissions.delegate");

    if (!hasPerm || !hasDelegate) return false;

    // Check if permission is delegatable by definition
    const definition = allDefinitions.find((d) => d.key === key);
    if (definition && !definition.is_delegatable) return false;

    // NEW: Non-owner must have explicit delegation scope from owner
    if (!delegatableScopeSet.has(key)) return false;

    return true;
  };

  const loading =
    loadingDefinitions || loadingBundles || loadingBundlePerms || loadingOverrides;

  return {
    // Permission checks
    hasPermission,
    canDelegate,

    // Data
    allDefinitions,
    assignedBundles,
    permissionOverrides,
    effectivePermissions: Array.from(effectivePermissions),

    // State
    loading,
    isOwner,
  };
}
