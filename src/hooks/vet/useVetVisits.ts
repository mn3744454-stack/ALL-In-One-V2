import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { tGlobal } from "@/i18n";

export type VetVisitStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type VetVisitType = "routine" | "emergency" | "follow_up" | "inspection";

export interface VetVisit {
  id: string;
  tenant_id: string;
  title: string;
  visit_type: VetVisitType;
  scheduled_date: string;
  scheduled_end_date: string | null;
  actual_date: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  vet_provider_id: string | null;
  horse_ids: string[];
  status: VetVisitStatus;
  notes: string | null;
  findings: string | null;
  recommendations: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  reminder_sent: boolean;
  reminder_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVetVisitData {
  title: string;
  visit_type?: VetVisitType;
  scheduled_date: string;
  scheduled_end_date?: string | null;
  vet_name?: string | null;
  vet_phone?: string | null;
  vet_provider_id?: string | null;
  horse_ids?: string[];
  notes?: string | null;
  estimated_cost?: number | null;
}

export interface UpdateVetVisitData extends Partial<CreateVetVisitData> {
  status?: VetVisitStatus;
  actual_date?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  actual_cost?: number | null;
}

export function useVetVisits(options?: { search?: string }) {
  const queryClient = useQueryClient();
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  const canManage = activeRole === "owner" || activeRole === "manager";

  // Use React Query for fetching visits
  const { data: visits = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.vetVisits(tenantId),
    queryFn: async () => {
      let query = supabase
        .from("vet_visits")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("scheduled_date", { ascending: true });

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,vet_name.ilike.%${options.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as VetVisit[];
    },
    enabled: !!tenantId,
    placeholderData: [], // Prevent flash from previous tenant data
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateVetVisitData) => {
      if (!tenantId) throw new Error("No active organization");

      const { data: userData } = await supabase.auth.getUser();
      
      const { data: newVisit, error } = await supabase
        .from("vet_visits")
        .insert({
          tenant_id: tenantId,
          created_by: userData.user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return newVisit as VetVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetVisits(tenantId) });
      toast.success(tGlobal("vetVisits.messages.created"));
    },
    onError: (error: Error) => {
      console.error("Error creating vet visit:", error);
      toast.error("Failed to schedule visit");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVetVisitData }) => {
      const { data: updatedVisit, error } = await supabase
        .from("vet_visits")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedVisit as VetVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetVisits(tenantId) });
      toast.success(tGlobal("vetVisits.messages.updated"));
    },
    onError: (error: Error) => {
      console.error("Error updating vet visit:", error);
      toast.error("Failed to update visit");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vet_visits")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetVisits(tenantId) });
      toast.success(tGlobal("vetVisits.messages.deleted"));
    },
    onError: (error: Error) => {
      console.error("Error deleting vet visit:", error);
      toast.error("Failed to delete visit");
    },
  });

  // Wrapper functions for backward compatibility
  const createVisit = async (data: CreateVetVisitData): Promise<VetVisit | null> => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const updateVisit = async (id: string, data: UpdateVetVisitData): Promise<VetVisit | null> => {
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch {
      return null;
    }
  };

  const deleteVisit = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const confirmVisit = async (id: string) => updateVisit(id, { status: "confirmed" });
  const startVisit = async (id: string) => updateVisit(id, { status: "in_progress", actual_date: new Date().toISOString() });
  const completeVisit = async (id: string, data?: { findings?: string; recommendations?: string; actual_cost?: number }) => 
    updateVisit(id, { status: "completed", ...data });
  const cancelVisit = async (id: string) => updateVisit(id, { status: "cancelled" });

  // Computed values using useMemo for efficiency
  const upcomingVisits = useMemo(() => 
    visits.filter(v => ["scheduled", "confirmed"].includes(v.status)), 
    [visits]
  );
  
  const todayVisits = useMemo(() => {
    const today = new Date().toDateString();
    return visits.filter(v => {
      return new Date(v.scheduled_date).toDateString() === today && 
             ["scheduled", "confirmed", "in_progress"].includes(v.status);
    });
  }, [visits]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vetVisits(tenantId) });
  }, [queryClient, tenantId]);

  return {
    visits,
    loading,
    canManage,
    upcomingVisits,
    todayVisits,
    createVisit,
    updateVisit,
    deleteVisit,
    confirmVisit,
    startVisit,
    completeVisit,
    cancelVisit,
    refresh,
  };
}
