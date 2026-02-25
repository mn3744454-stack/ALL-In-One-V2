import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DoctorFollowup {
  id: string;
  tenant_id: string;
  consultation_id: string;
  followup_date: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateFollowupData {
  consultation_id: string;
  followup_date: string;
  notes?: string;
}

export function useFollowups(consultationId?: string) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant?.id;

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ["doctor-followups", tenantId, consultationId],
    queryFn: async () => {
      let query = supabase
        .from("doctor_followups" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("followup_date", { ascending: true });

      if (consultationId) query = query.eq("consultation_id", consultationId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DoctorFollowup[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFollowupData) => {
      if (!tenantId || !user?.id) throw new Error("No tenant or user");
      const { data: fu, error } = await supabase
        .from("doctor_followups" as any)
        .insert({ tenant_id: tenantId, created_by: user.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return fu as unknown as DoctorFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-followups", tenantId] });
      toast.success("Follow-up scheduled");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to schedule follow-up"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("doctor_followups" as any)
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-followups", tenantId] });
      toast.success(`Follow-up marked as ${vars.status}`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update follow-up"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_followups" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-followups", tenantId] });
      toast.success("Follow-up removed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove follow-up"),
  });

  return {
    followups,
    loading: isLoading,
    createFollowup: createMutation.mutateAsync,
    markStatus: (id: string, status: string) => updateStatusMutation.mutateAsync({ id, status }),
    deleteFollowup: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
