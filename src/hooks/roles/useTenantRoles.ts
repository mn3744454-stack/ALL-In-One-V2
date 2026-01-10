import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantRole {
  tenant_id: string;
  role_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantRoles() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  // Fetch all roles for the tenant
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["tenant-roles", tenantId],
    queryFn: async (): Promise<TenantRole[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_roles" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching tenant roles:", error);
        return [];
      }
      return (data || []) as unknown as TenantRole[];
    },
    enabled: !!tenantId,
  });

  // Create a new role
  const createRoleMutation = useMutation({
    mutationFn: async (data: {
      role_key: string;
      name: string;
      name_ar?: string;
      description?: string;
      description_ar?: string;
    }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");

      const { error } = await supabase.from("tenant_roles" as any).insert({
        tenant_id: tenantId,
        role_key: data.role_key,
        name: data.name,
        name_ar: data.name_ar || null,
        description: data.description || null,
        description_ar: data.description_ar || null,
        is_system: false,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-roles", tenantId] });
      toast.success("تم إنشاء الدور بنجاح");
    },
    onError: (error: any) => {
      console.error("Error creating role:", error);
      toast.error(error.message || "فشل في إنشاء الدور");
    },
  });

  // Update an existing role
  const updateRoleMutation = useMutation({
    mutationFn: async (data: {
      role_key: string;
      name: string;
      name_ar?: string;
      description?: string;
      description_ar?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant selected");

      const { error } = await supabase
        .from("tenant_roles" as any)
        .update({
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          description_ar: data.description_ar || null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("role_key", data.role_key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-roles", tenantId] });
      toast.success("تم تحديث الدور بنجاح");
    },
    onError: (error: any) => {
      console.error("Error updating role:", error);
      toast.error(error.message || "فشل في تحديث الدور");
    },
  });

  // Delete a role (non-system only)
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleKey: string) => {
      if (!tenantId) throw new Error("No tenant selected");

      const { error } = await supabase
        .from("tenant_roles" as any)
        .delete()
        .eq("tenant_id", tenantId)
        .eq("role_key", roleKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-roles", tenantId] });
      toast.success("تم حذف الدور بنجاح");
    },
    onError: (error: any) => {
      console.error("Error deleting role:", error);
      toast.error(error.message || "فشل في حذف الدور");
    },
  });

  return {
    roles,
    isLoading,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    deleteRole: deleteRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
}
