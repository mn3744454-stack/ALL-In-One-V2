import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type FollowupType = 'followup' | 'recheck' | 'medication_refill' | 'wound_check' | 'suture_removal' | 'lab_result';
export type FollowupStatus = 'open' | 'done' | 'cancelled';

export interface VetFollowup {
  id: string;
  tenant_id: string;
  treatment_id: string;
  due_at: string;
  type: FollowupType;
  status: FollowupStatus;
  assigned_to: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  treatment?: {
    id: string;
    title: string;
    horse: { id: string; name: string; avatar_url: string | null };
  };
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface CreateFollowupData {
  treatment_id: string;
  due_at: string;
  type: FollowupType;
  assigned_to?: string;
  notes?: string;
}

interface UseVetFollowupsFilters {
  treatment_id?: string;
  horse_id?: string;
}

export function useVetFollowups(filters?: UseVetFollowupsFilters) {
  const [followups, setFollowups] = useState<VetFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchFollowups = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setFollowups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("vet_followups")
        .select(`
          *,
          treatment:vet_treatments!vet_followups_treatment_id_fkey(
            id, 
            title, 
            horse_id,
            horse:horses!vet_treatments_horse_id_fkey(id, name, avatar_url)
          ),
          assignee:profiles!vet_followups_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("due_at", { ascending: true });

      if (filters?.treatment_id) {
        query = query.eq("treatment_id", filters.treatment_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter by horse_id if provided (post-query since it's a nested field)
      let filteredData = (data || []) as VetFollowup[];
      if (filters?.horse_id) {
        filteredData = filteredData.filter(f => f.treatment?.horse?.id === filters.horse_id);
      }
      
      setFollowups(filteredData);
    } catch (error) {
      console.error("Error fetching followups:", error);
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters?.treatment_id, filters?.horse_id]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const dueFollowups = followups.filter(f => {
    if (f.status !== 'open') return false;
    const dueDate = new Date(f.due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  });

  const overdueFollowups = followups.filter(f => {
    if (f.status !== 'open') return false;
    const dueDate = new Date(f.due_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  const createFollowup = async (data: CreateFollowupData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return null;
      }

      const { data: followup, error } = await supabase
        .from("vet_followups")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Follow-up scheduled");
      fetchFollowups();
      return followup;
    } catch (error: unknown) {
      console.error("Error creating followup:", error);
      const message = error instanceof Error ? error.message : "Failed to create follow-up";
      toast.error(message);
      return null;
    }
  };

  const markAsDone = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vet_followups")
        .update({ status: 'done' })
        .eq("id", id);

      if (error) throw error;

      toast.success("Follow-up marked as done");
      fetchFollowups();
      return true;
    } catch (error: unknown) {
      console.error("Error updating followup:", error);
      toast.error("Failed to update follow-up");
      return false;
    }
  };

  const markAsCancelled = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vet_followups")
        .update({ status: 'cancelled' })
        .eq("id", id);

      if (error) throw error;

      toast.success("Follow-up cancelled");
      fetchFollowups();
      return true;
    } catch (error: unknown) {
      console.error("Error cancelling followup:", error);
      toast.error("Failed to cancel follow-up");
      return false;
    }
  };

  const deleteFollowup = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vet_followups")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Follow-up deleted");
      fetchFollowups();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting followup:", error);
      toast.error("Failed to delete follow-up");
      return false;
    }
  };

  return {
    followups,
    dueFollowups,
    overdueFollowups,
    loading,
    canManage,
    createFollowup,
    markAsDone,
    markAsCancelled,
    deleteFollowup,
    refresh: fetchFollowups,
  };
}
