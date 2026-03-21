import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ContractType = "natural_cover" | "pregnancy_exam" | "foaling_assistance" | "embryo_transfer" | "custom";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled" | "expired";
export type PricingMode = "fixed" | "per_event" | "package";

export interface BreedingContract {
  id: string;
  tenant_id: string;
  contract_number: string;
  contract_type: ContractType;
  status: ContractStatus;
  client_id: string | null;
  client_name: string | null;
  mare_id: string | null;
  stallion_id: string | null;
  external_party_name: string | null;
  service_id: string | null;
  pricing_mode: PricingMode;
  unit_price: number | null;
  total_price: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: { id: string; name: string; name_ar: string | null } | null;
  mare?: { id: string; name: string; name_ar: string | null } | null;
  stallion?: { id: string; name: string; name_ar: string | null } | null;
  service?: { id: string; name: string; name_ar: string | null; unit_price: number | null } | null;
}

export interface CreateBreedingContractData {
  contract_number: string;
  contract_type: ContractType;
  status?: ContractStatus;
  client_id?: string | null;
  client_name?: string | null;
  mare_id?: string | null;
  stallion_id?: string | null;
  external_party_name?: string | null;
  service_id?: string | null;
  pricing_mode?: PricingMode;
  unit_price?: number | null;
  total_price?: number | null;
  currency?: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface BreedingContractFilters {
  status?: ContractStatus;
  client_id?: string;
  mare_id?: string;
}

export function useBreedingContracts(filters?: BreedingContractFilters) {
  const [contracts, setContracts] = useState<BreedingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";
  const tenantId = activeTenant?.tenant?.id;

  const fetchContracts = useCallback(async () => {
    if (!tenantId) {
      setContracts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("breeding_contracts")
        .select(`
          *,
          client:clients!breeding_contracts_client_id_fkey(id, name, name_ar),
          mare:horses!breeding_contracts_mare_id_fkey(id, name, name_ar),
          stallion:horses!breeding_contracts_stallion_id_fkey(id, name, name_ar),
          service:tenant_services!breeding_contracts_service_id_fkey(id, name, name_ar, unit_price)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.client_id) query = query.eq("client_id", filters.client_id);
      if (filters?.mare_id) query = query.eq("mare_id", filters.mare_id);

      const { data, error } = await query;
      if (error) throw error;
      setContracts((data as unknown as BreedingContract[]) || []);
    } catch (error) {
      console.error("Error fetching breeding contracts:", error);
      toast.error("Failed to load breeding contracts");
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters?.status, filters?.client_id, filters?.mare_id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const createContract = async (data: CreateBreedingContractData) => {
    if (!tenantId || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const { data: newContract, error } = await supabase
        .from("breeding_contracts")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          contract_number: data.contract_number,
          contract_type: data.contract_type,
          status: data.status || "draft",
          client_id: data.client_id || null,
          client_name: data.client_name || null,
          mare_id: data.mare_id || null,
          stallion_id: data.stallion_id || null,
          external_party_name: data.external_party_name || null,
          service_id: data.service_id || null,
          pricing_mode: data.pricing_mode || "fixed",
          unit_price: data.unit_price ?? null,
          total_price: data.total_price ?? null,
          currency: data.currency || "SAR",
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          notes: data.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success("Contract created");
      fetchContracts();
      return newContract;
    } catch (error: any) {
      console.error("Error creating breeding contract:", error);
      toast.error(error.message || "Failed to create contract");
      return null;
    }
  };

  const updateContract = async (id: string, updates: Partial<CreateBreedingContractData>) => {
    if (!tenantId) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("breeding_contracts")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      toast.success("Contract updated");
      fetchContracts();
      return true;
    } catch (error: any) {
      console.error("Error updating breeding contract:", error);
      toast.error(error.message || "Failed to update contract");
      return false;
    }
  };

  const deleteContract = async (id: string) => {
    if (!tenantId) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("breeding_contracts")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      toast.success("Contract deleted");
      fetchContracts();
      return true;
    } catch (error: any) {
      console.error("Error deleting breeding contract:", error);
      toast.error(error.message || "Failed to delete contract");
      return false;
    }
  };

  const generateContractNumber = () => `BC-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return {
    contracts,
    loading,
    canManage,
    createContract,
    updateContract,
    deleteContract,
    generateContractNumber,
    refresh: fetchContracts,
  };
}
