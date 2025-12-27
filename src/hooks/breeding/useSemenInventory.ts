import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SemenTank {
  id: string;
  tenant_id: string;
  name: string;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface SemenBatch {
  id: string;
  tenant_id: string;
  stallion_id: string;
  tank_id: string | null;
  collection_date: string;
  type: "fresh" | "frozen";
  doses_total: number;
  doses_available: number;
  unit: string;
  quality_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  stallion?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  tank?: {
    id: string;
    name: string;
    location: string | null;
  } | null;
}

export interface CreateSemenTankData {
  name: string;
  location?: string | null;
  notes?: string | null;
}

export interface CreateSemenBatchData {
  stallion_id: string;
  tank_id?: string | null;
  collection_date: string;
  type: "fresh" | "frozen";
  doses_total: number;
  doses_available: number;
  quality_notes?: string | null;
}

export function useSemenInventory() {
  const [tanks, setTanks] = useState<SemenTank[]>([]);
  const [batches, setBatches] = useState<SemenBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTanks = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setTanks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("semen_tanks")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("name");

      if (error) throw error;
      setTanks(data || []);
    } catch (error) {
      console.error("Error fetching semen tanks:", error);
    }
  }, [activeTenant?.tenant?.id]);

  const fetchBatches = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setBatches([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("semen_batches")
        .select(`
          *,
          stallion:horses!semen_batches_stallion_id_fkey(id, name, name_ar, avatar_url),
          tank:semen_tanks!semen_batches_tank_id_fkey(id, name, location)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("collection_date", { ascending: false });

      if (error) throw error;
      setBatches((data as unknown as SemenBatch[]) || []);
    } catch (error) {
      console.error("Error fetching semen batches:", error);
    }
  }, [activeTenant?.tenant?.id]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTanks(), fetchBatches()]);
    setLoading(false);
  }, [fetchTanks, fetchBatches]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Tank CRUD
  const createTank = async (data: CreateSemenTankData) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return null;
    }

    try {
      const { data: newTank, error } = await supabase
        .from("semen_tanks")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Semen tank created");
      fetchTanks();
      return newTank;
    } catch (error: any) {
      console.error("Error creating semen tank:", error);
      toast.error(error.message || "Failed to create semen tank");
      return null;
    }
  };

  const updateTank = async (id: string, updates: Partial<CreateSemenTankData>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("semen_tanks")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Semen tank updated");
      fetchTanks();
      return true;
    } catch (error: any) {
      console.error("Error updating semen tank:", error);
      toast.error(error.message || "Failed to update semen tank");
      return false;
    }
  };

  const deleteTank = async (id: string) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("semen_tanks")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Semen tank deleted");
      fetchTanks();
      return true;
    } catch (error: any) {
      console.error("Error deleting semen tank:", error);
      toast.error(error.message || "Failed to delete semen tank");
      return false;
    }
  };

  // Batch CRUD
  const createBatch = async (data: CreateSemenBatchData) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return null;
    }

    try {
      const { data: newBatch, error } = await supabase
        .from("semen_batches")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Semen batch created");
      fetchBatches();
      return newBatch;
    } catch (error: any) {
      console.error("Error creating semen batch:", error);
      toast.error(error.message || "Failed to create semen batch");
      return null;
    }
  };

  const updateBatch = async (id: string, updates: Partial<CreateSemenBatchData>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("semen_batches")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Semen batch updated");
      fetchBatches();
      return true;
    } catch (error: any) {
      console.error("Error updating semen batch:", error);
      toast.error(error.message || "Failed to update semen batch");
      return false;
    }
  };

  const deleteBatch = async (id: string) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("semen_batches")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Semen batch deleted");
      fetchBatches();
      return true;
    } catch (error: any) {
      console.error("Error deleting semen batch:", error);
      toast.error(error.message || "Failed to delete semen batch");
      return false;
    }
  };

  return {
    tanks,
    batches,
    loading,
    canManage,
    createTank,
    updateTank,
    deleteTank,
    createBatch,
    updateBatch,
    deleteBatch,
    refresh: fetchAll,
  };
}
