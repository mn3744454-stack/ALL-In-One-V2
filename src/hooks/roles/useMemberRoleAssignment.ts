import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface TenantMemberWithProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useMemberRoleAssignment() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;
  const isOwner = activeRole === "owner";

  // Fetch all members with their profiles
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["tenant-members-roles", tenantId],
    queryFn: async (): Promise<TenantMemberWithProfile[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_members")
        .select(`
          id,
          tenant_id,
          user_id,
          role,
          is_active,
          created_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching members:", error);
        return [];
      }

      return (data || []).map((m: any) => ({
        ...m,
        profile: m.profiles,
      })) as TenantMemberWithProfile[];
    },
    enabled: !!tenantId,
  });

  // Update member role (Owner only)
  const updateMemberRoleMutation = useMutation({
    mutationFn: async (data: { memberId: string; newRole: string }) => {
      if (!isOwner) throw new Error("Only owner can change roles");

      // Prevent changing owner's role
      const member = members.find((m) => m.id === data.memberId);
      if (member?.role === "owner") {
        throw new Error("Cannot change owner's role");
      }

      const { error } = await supabase
        .from("tenant_members")
        .update({ role: data.newRole as any })
        .eq("id", data.memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-members-roles", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم تحديث دور العضو بنجاح");
    },
    onError: (error: any) => {
      console.error("Error updating member role:", error);
      toast.error(error.message || "فشل في تحديث دور العضو");
    },
  });

  return {
    members,
    isLoading,
    updateMemberRole: updateMemberRoleMutation.mutate,
    isUpdating: updateMemberRoleMutation.isPending,
    isOwner,
  };
}
