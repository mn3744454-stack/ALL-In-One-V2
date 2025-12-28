import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type VaccinationStatus = 'due' | 'overdue' | 'done' | 'cancelled';

export interface HorseVaccination {
  id: string;
  tenant_id: string;
  horse_id: string;
  program_id: string;
  status: VaccinationStatus;
  due_date: string;
  administered_date: string | null;
  administered_by: string | null;
  service_mode: 'internal' | 'external';
  external_provider_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  horse?: { id: string; name: string; avatar_url: string | null };
  program?: { id: string; name: string; name_ar: string | null };
  provider?: { id: string; name: string } | null;
  administeredBy?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface VaccinationFilters {
  status?: VaccinationStatus | 'all';
  horse_id?: string;
}

export interface CreateVaccinationData {
  horse_id: string;
  program_id: string;
  due_date: string;
  status?: VaccinationStatus;
  service_mode?: 'internal' | 'external';
  external_provider_id?: string;
  notes?: string;
}

export function useHorseVaccinations(filters: VaccinationFilters = {}) {
  const [vaccinations, setVaccinations] = useState<HorseVaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchVaccinations = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setVaccinations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("horse_vaccinations")
        .select(`
          *,
          horse:horses!horse_vaccinations_horse_id_fkey(id, name, avatar_url),
          program:vaccination_programs!horse_vaccinations_program_id_fkey(id, name, name_ar),
          provider:service_providers!horse_vaccinations_external_provider_id_fkey(id, name),
          administeredBy:profiles!horse_vaccinations_administered_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("due_date", { ascending: true });

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.horse_id) {
        query = query.eq("horse_id", filters.horse_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVaccinations((data || []) as HorseVaccination[]);
    } catch (error) {
      console.error("Error fetching vaccinations:", error);
      toast.error("Failed to load vaccinations");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.status, filters.horse_id]);

  useEffect(() => {
    fetchVaccinations();
  }, [fetchVaccinations]);

  const dueVaccinations = vaccinations.filter(v => v.status === 'due');
  const overdueVaccinations = vaccinations.filter(v => v.status === 'overdue');
  const completedVaccinations = vaccinations.filter(v => v.status === 'done');

  const scheduleVaccination = async (data: CreateVaccinationData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: vaccination, error } = await supabase
        .from("horse_vaccinations")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Vaccination scheduled");
      fetchVaccinations();
      return vaccination;
    } catch (error: unknown) {
      console.error("Error scheduling vaccination:", error);
      const message = error instanceof Error ? error.message : "Failed to schedule vaccination";
      toast.error(message);
      return null;
    }
  };

  const markAsAdministered = async (id: string, administered_by?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("horse_vaccinations")
        .update({ 
          status: 'done',
          administered_by: administered_by || user?.id,
          administered_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Vaccination marked as administered");
      fetchVaccinations();
      return true;
    } catch (error: unknown) {
      console.error("Error updating vaccination:", error);
      toast.error("Failed to update vaccination");
      return false;
    }
  };

  const cancelVaccination = async (id: string) => {
    try {
      const { error } = await supabase
        .from("horse_vaccinations")
        .update({ status: 'cancelled' })
        .eq("id", id);

      if (error) throw error;

      toast.success("Vaccination cancelled");
      fetchVaccinations();
      return true;
    } catch (error: unknown) {
      console.error("Error cancelling vaccination:", error);
      toast.error("Failed to cancel vaccination");
      return false;
    }
  };

  const deleteVaccination = async (id: string) => {
    try {
      const { error } = await supabase
        .from("horse_vaccinations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Vaccination deleted");
      fetchVaccinations();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting vaccination:", error);
      toast.error("Failed to delete vaccination");
      return false;
    }
  };

  return {
    vaccinations,
    dueVaccinations,
    overdueVaccinations,
    completedVaccinations,
    loading,
    canManage,
    scheduleVaccination,
    markAsAdministered,
    cancelVaccination,
    deleteVaccination,
    refresh: fetchVaccinations,
  };
}
