import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Foaling {
  id: string;
  tenant_id: string;
  pregnancy_id: string;
  mare_id: string;
  stallion_id: string | null;
  foaling_date: string;
  foaling_time: string | null;
  outcome: "live" | "stillborn" | "non_viable" | "other";
  foal_sex: string | null;
  foal_color: string | null;
  foal_name: string | null;
  foal_horse_id: string | null;
  location_ref: string | null;
  notes: string | null;
  performed_by: string | null;
  created_by: string;
  contract_id: string | null;
  registry_notification_status: string;
  registry_blood_sample_status: string;
  registry_microchip_status: string;
  registry_registration_status: string;
  foal_alive: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  mare?: { id: string; name: string; name_ar: string | null; avatar_url: string | null } | null;
  stallion?: { id: string; name: string; name_ar: string | null } | null;
  performer?: { id: string; full_name: string | null } | null;
  foal_horse?: { id: string; name: string; name_ar: string | null; avatar_url: string | null } | null;
  contract?: {
    id: string;
    contract_number: string;
    service_id: string | null;
    unit_price: number | null;
    client_id: string | null;
    client_name: string | null;
  } | null;
}

export interface CreateFoalingData {
  pregnancy_id: string;
  mare_id: string;
  stallion_id?: string | null;
  foaling_date: string;
  foaling_time?: string | null;
  outcome: string;
  foal_sex?: string | null;
  foal_color?: string | null;
  foal_name?: string | null;
  location_ref?: string | null;
  notes?: string | null;
  performed_by?: string | null;
  contract_id?: string | null;
}

export interface CreateFoalHorseData {
  name: string;
  name_ar?: string | null;
  gender: string;
  birth_date: string;
  color?: string | null;
  mother_id: string;
  father_id?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
}

export interface FoalingFilters {
  mare_id?: string;
  outcome?: string;
}

export function useFoalings(filters?: FoalingFilters) {
  const [foalings, setFoalings] = useState<Foaling[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchFoalings = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setFoalings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("foalings")
        .select(`
          *,
          mare:horses!foalings_mare_id_fkey(id, name, name_ar, avatar_url),
          stallion:horses!foalings_stallion_id_fkey(id, name, name_ar),
          performer:profiles!foalings_performed_by_fkey(id, full_name),
          foal_horse:horses!foalings_foal_horse_id_fkey(id, name, name_ar, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("foaling_date", { ascending: false });

      if (filters?.mare_id) {
        query = query.eq("mare_id", filters.mare_id);
      }
      if (filters?.outcome) {
        query = query.eq("outcome", filters.outcome);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFoalings((data as unknown as Foaling[]) || []);
    } catch (error) {
      console.error("Error fetching foalings:", error);
      toast.error("Failed to load foaling records");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, filters?.mare_id, filters?.outcome]);

  useEffect(() => {
    fetchFoalings();
  }, [fetchFoalings]);

  const createFoaling = async (data: CreateFoalingData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const { data: newFoaling, error } = await supabase
        .from("foalings")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      // Close the pregnancy
      await supabase
        .from("pregnancies")
        .update({
          status: "closed",
          end_reason: "foaled",
          ended_at: new Date().toISOString(),
        })
        .eq("id", data.pregnancy_id)
        .eq("tenant_id", activeTenant.tenant.id);

      toast.success("Foaling record created");
      fetchFoalings();
      return newFoaling;
    } catch (error: any) {
      console.error("Error creating foaling:", error);
      toast.error(error.message || "Failed to create foaling record");
      return null;
    }
  };

  const createFoalHorse = async (foalingId: string, horseData: CreateFoalHorseData) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return null;
    }

    try {
      // Create the horse record
      const { data: newHorse, error: horseError } = await supabase
        .from("horses")
        .insert({
          tenant_id: activeTenant.tenant_id,
          name: horseData.name,
          name_ar: horseData.name_ar || null,
          gender: horseData.gender,
          birth_date: horseData.birth_date,
          color: horseData.color || null,
          mother_id: horseData.mother_id,
          father_id: horseData.father_id || null,
          mother_name: horseData.mother_name || null,
          father_name: horseData.father_name || null,
          status: "active",
        })
        .select()
        .single();

      if (horseError) throw horseError;

      // Link the foal horse back to the foaling record
      const { error: updateError } = await supabase
        .from("foalings")
        .update({ foal_horse_id: newHorse.id })
        .eq("id", foalingId)
        .eq("tenant_id", activeTenant.tenant.id);

      if (updateError) throw updateError;

      toast.success("Foal registered successfully");
      fetchFoalings();
      return newHorse;
    } catch (error: any) {
      console.error("Error creating foal horse:", error);
      toast.error(error.message || "Failed to register foal");
      return null;
    }
  };

  const updateFoaling = async (id: string, updates: Partial<Foaling>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("foalings")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Foaling record updated");
      fetchFoalings();
      return true;
    } catch (error: any) {
      console.error("Error updating foaling:", error);
      toast.error(error.message || "Failed to update foaling record");
      return false;
    }
  };

  return {
    foalings,
    loading,
    canManage,
    createFoaling,
    createFoalHorse,
    updateFoaling,
    refresh: fetchFoalings,
  };
}
