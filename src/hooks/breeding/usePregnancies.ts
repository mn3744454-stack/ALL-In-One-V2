import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Pregnancy {
  id: string;
  tenant_id: string;
  mare_id: string;
  source_attempt_id: string | null;
  status: "open" | "pregnant" | "open_by_abortion" | "closed";
  verification_state: "unverified" | "verified";
  start_date: string;
  expected_due_date: string | null;
  ended_at: string | null;
  end_reason: "foaled" | "abortion" | "not_pregnant" | "unknown" | null;
  notes: string | null;
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
  source_attempt?: {
    id: string;
    attempt_type: string;
    attempt_date: string;
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

export interface CreatePregnancyData {
  mare_id: string;
  source_attempt_id?: string | null;
  start_date: string;
  expected_due_date?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
}

export interface PregnancyFilters {
  mare_id?: string;
  status?: string;
  verification_state?: string;
  active_only?: boolean;
}

export function usePregnancies(filters?: PregnancyFilters) {
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchPregnancies = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setPregnancies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("pregnancies")
        .select(`
          *,
          mare:horses!pregnancies_mare_id_fkey(id, name, name_ar, avatar_url),
          source_attempt:breeding_attempts!pregnancies_source_attempt_id_fkey(id, attempt_type, attempt_date),
          creator:profiles!pregnancies_created_by_fkey(id, full_name, avatar_url),
          assignee:profiles!pregnancies_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("start_date", { ascending: false });

      if (filters?.mare_id) {
        query = query.eq("mare_id", filters.mare_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.verification_state) {
        query = query.eq("verification_state", filters.verification_state);
      }
      if (filters?.active_only) {
        query = query.is("ended_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPregnancies((data as unknown as Pregnancy[]) || []);
    } catch (error) {
      console.error("Error fetching pregnancies:", error);
      toast.error("Failed to load pregnancies");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, filters?.mare_id, filters?.status, filters?.verification_state, filters?.active_only]);

  useEffect(() => {
    fetchPregnancies();
  }, [fetchPregnancies]);

  const createPregnancy = async (data: CreatePregnancyData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const { data: newPregnancy, error } = await supabase
        .from("pregnancies")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Pregnancy record created");
      fetchPregnancies();
      return newPregnancy;
    } catch (error: any) {
      console.error("Error creating pregnancy:", error);
      toast.error(error.message || "Failed to create pregnancy record");
      return null;
    }
  };

  const updatePregnancy = async (id: string, updates: Partial<Pregnancy>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("pregnancies")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Pregnancy updated");
      fetchPregnancies();
      return true;
    } catch (error: any) {
      console.error("Error updating pregnancy:", error);
      toast.error(error.message || "Failed to update pregnancy");
      return false;
    }
  };

  const closePregnancy = async (id: string, end_reason: Pregnancy["end_reason"]) => {
    return updatePregnancy(id, { status: "closed", end_reason, ended_at: new Date().toISOString() });
  };

  const markAbortion = async (id: string) => {
    return updatePregnancy(id, { status: "open_by_abortion", end_reason: "abortion" });
  };

  return {
    pregnancies,
    loading,
    canManage,
    createPregnancy,
    updatePregnancy,
    closePregnancy,
    markAbortion,
    refresh: fetchPregnancies,
  };
}
