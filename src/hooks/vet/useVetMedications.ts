import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface VetMedication {
  id: string;
  tenant_id: string;
  treatment_id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateVetMedicationData {
  treatment_id: string;
  name: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export function useVetMedications(treatmentId?: string) {
  const [medications, setMedications] = useState<VetMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchMedications = useCallback(async () => {
    if (!activeTenant?.tenant.id || !treatmentId) {
      setMedications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vet_medications")
        .select("*")
        .eq("treatment_id", treatmentId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast.error("Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, treatmentId]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const addMedication = async (data: CreateVetMedicationData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: medication, error } = await supabase
        .from("vet_medications")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Medication added");
      fetchMedications();
      return medication;
    } catch (error: unknown) {
      console.error("Error adding medication:", error);
      const message = error instanceof Error ? error.message : "Failed to add medication";
      toast.error(message);
      return null;
    }
  };

  const updateMedication = async (id: string, updates: Partial<CreateVetMedicationData>) => {
    try {
      const { data, error } = await supabase
        .from("vet_medications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Medication updated");
      fetchMedications();
      return data;
    } catch (error: unknown) {
      console.error("Error updating medication:", error);
      const message = error instanceof Error ? error.message : "Failed to update medication";
      toast.error(message);
      return null;
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vet_medications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Medication removed");
      fetchMedications();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting medication:", error);
      const message = error instanceof Error ? error.message : "Failed to remove medication";
      toast.error(message);
      return false;
    }
  };

  return {
    medications,
    loading,
    canManage,
    addMedication,
    updateMedication,
    deleteMedication,
    refresh: fetchMedications,
  };
}
