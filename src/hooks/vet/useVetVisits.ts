import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

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
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchVisits = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("vet_visits")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("scheduled_date", { ascending: true });

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,vet_name.ilike.%${options.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVisits((data || []) as VetVisit[]);
    } catch (error) {
      console.error("Error fetching vet visits:", error);
      toast.error("Failed to load vet visits");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, options?.search]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const createVisit = async (data: CreateVetVisitData): Promise<VetVisit | null> => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: newVisit, error } = await supabase
        .from("vet_visits")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: userData.user?.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Visit scheduled successfully");
      fetchVisits();
      return newVisit as VetVisit;
    } catch (error) {
      console.error("Error creating vet visit:", error);
      toast.error("Failed to schedule visit");
      return null;
    }
  };

  const updateVisit = async (id: string, data: UpdateVetVisitData): Promise<VetVisit | null> => {
    try {
      const { data: updatedVisit, error } = await supabase
        .from("vet_visits")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Visit updated");
      fetchVisits();
      return updatedVisit as VetVisit;
    } catch (error) {
      console.error("Error updating vet visit:", error);
      toast.error("Failed to update visit");
      return null;
    }
  };

  const deleteVisit = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("vet_visits")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Visit deleted");
      fetchVisits();
      return true;
    } catch (error) {
      console.error("Error deleting vet visit:", error);
      toast.error("Failed to delete visit");
      return false;
    }
  };

  const confirmVisit = async (id: string) => updateVisit(id, { status: "confirmed" });
  const startVisit = async (id: string) => updateVisit(id, { status: "in_progress", actual_date: new Date().toISOString() });
  const completeVisit = async (id: string, data?: { findings?: string; recommendations?: string; actual_cost?: number }) => 
    updateVisit(id, { status: "completed", ...data });
  const cancelVisit = async (id: string) => updateVisit(id, { status: "cancelled" });

  // Computed values
  const upcomingVisits = visits.filter(v => ["scheduled", "confirmed"].includes(v.status));
  const todayVisits = visits.filter(v => {
    const today = new Date().toDateString();
    return new Date(v.scheduled_date).toDateString() === today && ["scheduled", "confirmed", "in_progress"].includes(v.status);
  });

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
    refresh: fetchVisits,
  };
}
