import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BreedingAttempt {
  id: string;
  tenant_id: string;
  mare_id: string;
  stallion_id: string | null;
  external_stallion_name: string | null;
  external_stallion_meta: Record<string, unknown>;
  attempt_type: "natural" | "ai_fresh" | "ai_frozen" | "embryo_transfer";
  attempt_date: string;
  heat_cycle_ref: string | null;
  location_ref: string | null;
  notes: string | null;
  semen_batch_id: string | null;
  result: "unknown" | "successful" | "unsuccessful";
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  mare?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  stallion?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateBreedingAttemptData {
  mare_id: string;
  stallion_id?: string | null;
  external_stallion_name?: string | null;
  external_stallion_meta?: Record<string, unknown>;
  attempt_type: "natural" | "ai_fresh" | "ai_frozen" | "embryo_transfer";
  attempt_date: string;
  heat_cycle_ref?: string | null;
  location_ref?: string | null;
  notes?: string | null;
  semen_batch_id?: string | null;
  assigned_to?: string | null;
}

export interface BreedingAttemptFilters {
  mare_id?: string;
  stallion_id?: string;
  attempt_type?: string;
  result?: string;
  search?: string;
}

export function useBreedingAttempts(filters?: BreedingAttemptFilters) {
  const [attempts, setAttempts] = useState<BreedingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchAttempts = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setAttempts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("breeding_attempts")
        .select(`
          *,
          mare:horses!breeding_attempts_mare_id_fkey(id, name, name_ar, avatar_url),
          stallion:horses!breeding_attempts_stallion_id_fkey(id, name, name_ar, avatar_url),
          creator:profiles!breeding_attempts_created_by_fkey(id, full_name, avatar_url),
          assignee:profiles!breeding_attempts_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("attempt_date", { ascending: false });

      if (filters?.mare_id) {
        query = query.eq("mare_id", filters.mare_id);
      }
      if (filters?.stallion_id) {
        query = query.eq("stallion_id", filters.stallion_id);
      }
      if (filters?.attempt_type) {
        query = query.eq("attempt_type", filters.attempt_type);
      }
      if (filters?.result) {
        query = query.eq("result", filters.result);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttempts((data as unknown as BreedingAttempt[]) || []);
    } catch (error) {
      console.error("Error fetching breeding attempts:", error);
      toast.error("Failed to load breeding attempts");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, filters?.mare_id, filters?.stallion_id, filters?.attempt_type, filters?.result]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const createAttempt = async (data: CreateBreedingAttemptData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const insertData = {
        tenant_id: activeTenant.tenant.id,
        created_by: user.id,
        mare_id: data.mare_id,
        stallion_id: data.stallion_id || null,
        external_stallion_name: data.external_stallion_name || null,
        external_stallion_meta: data.external_stallion_meta || {},
        attempt_type: data.attempt_type,
        attempt_date: data.attempt_date,
        heat_cycle_ref: data.heat_cycle_ref || null,
        location_ref: data.location_ref || null,
        notes: data.notes || null,
        semen_batch_id: data.semen_batch_id || null,
        assigned_to: data.assigned_to || null,
      };

      const { data: newAttempt, error } = await supabase
        .from("breeding_attempts")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      toast.success("Breeding attempt created");
      fetchAttempts();
      return newAttempt;
    } catch (error: any) {
      console.error("Error creating breeding attempt:", error);
      toast.error(error.message || "Failed to create breeding attempt");
      return null;
    }
  };

  const updateAttempt = async (id: string, updates: { notes?: string | null; result?: "unknown" | "successful" | "unsuccessful"; assigned_to?: string | null }) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("breeding_attempts")
        .update(updates as any)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Breeding attempt updated");
      fetchAttempts();
      return true;
    } catch (error: any) {
      console.error("Error updating breeding attempt:", error);
      toast.error(error.message || "Failed to update breeding attempt");
      return false;
    }
  };

  const deleteAttempt = async (id: string) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("breeding_attempts")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Breeding attempt deleted");
      fetchAttempts();
      return true;
    } catch (error: any) {
      console.error("Error deleting breeding attempt:", error);
      toast.error(error.message || "Failed to delete breeding attempt");
      return false;
    }
  };

  return {
    attempts,
    loading,
    canManage,
    createAttempt,
    updateAttempt,
    deleteAttempt,
    refresh: fetchAttempts,
  };
}
