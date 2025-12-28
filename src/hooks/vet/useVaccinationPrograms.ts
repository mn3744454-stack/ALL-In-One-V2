import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface VaccinationProgram {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
  default_interval_days: number | null;
  age_min_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramData {
  name: string;
  name_ar?: string;
  is_active?: boolean;
  default_interval_days?: number;
  age_min_days?: number;
  notes?: string;
}

export function useVaccinationPrograms() {
  const [programs, setPrograms] = useState<VaccinationProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchPrograms = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vaccination_programs")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error("Error fetching vaccination programs:", error);
      toast.error("Failed to load vaccination programs");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const activePrograms = programs.filter(p => p.is_active);

  const createProgram = async (data: CreateProgramData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: program, error } = await supabase
        .from("vaccination_programs")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Vaccination program created");
      fetchPrograms();
      return program;
    } catch (error: unknown) {
      console.error("Error creating program:", error);
      const message = error instanceof Error ? error.message : "Failed to create program";
      toast.error(message);
      return null;
    }
  };

  const updateProgram = async (id: string, updates: Partial<CreateProgramData>) => {
    try {
      const { data, error } = await supabase
        .from("vaccination_programs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Program updated");
      fetchPrograms();
      return data;
    } catch (error: unknown) {
      console.error("Error updating program:", error);
      const message = error instanceof Error ? error.message : "Failed to update program";
      toast.error(message);
      return null;
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    return updateProgram(id, { is_active });
  };

  const deleteProgram = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vaccination_programs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Program deleted");
      fetchPrograms();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting program:", error);
      const message = error instanceof Error ? error.message : "Failed to delete program";
      toast.error(message);
      return false;
    }
  };

  return {
    programs,
    activePrograms,
    loading,
    canManage,
    createProgram,
    updateProgram,
    toggleActive,
    deleteProgram,
    refresh: fetchPrograms,
  };
}
