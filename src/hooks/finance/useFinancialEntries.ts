import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FinancialEntry {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  is_income: boolean;
  client_id: string | null;
  service_mode: "internal" | "external";
  external_provider_id: string | null;
  internal_resource_ref: Record<string, unknown> | null;
  custom_financial_category_id: string | null;
  account_code: string | null;
  tax_category: "vat_standard" | "vat_reduced" | "vat_exempt" | "vat_zero" | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  currency: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  client?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  external_provider?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  financial_category?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
}

export interface CreateFinancialEntryData {
  entity_type: string;
  entity_id: string;
  is_income?: boolean;
  client_id?: string | null;
  service_mode?: "internal" | "external";
  external_provider_id?: string | null;
  internal_resource_ref?: Record<string, unknown> | null;
  custom_financial_category_id?: string | null;
  account_code?: string | null;
  tax_category?: "vat_standard" | "vat_reduced" | "vat_exempt" | "vat_zero" | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  currency?: string;
  notes?: string | null;
}

export function useFinancialEntries(entityType?: string, entityId?: string) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchEntries = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("financial_entries")
        .select(`
          *,
          client:clients!financial_entries_client_id_fkey(id, name, name_ar),
          external_provider:service_providers!financial_entries_external_provider_id_fkey(id, name, name_ar),
          financial_category:custom_financial_categories!financial_entries_custom_financial_category_id_fkey(id, name, name_ar)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries((data as unknown as FinancialEntry[]) || []);
    } catch (error) {
      console.error("Error fetching financial entries:", error);
      toast.error("Failed to load financial entries");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, entityType, entityId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = async (data: CreateFinancialEntryData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const insertData = {
        tenant_id: activeTenant.tenant.id,
        created_by: user.id,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        is_income: data.is_income ?? false,
        client_id: data.client_id || null,
        service_mode: data.service_mode || "external",
        external_provider_id: data.external_provider_id || null,
        internal_resource_ref: data.internal_resource_ref || null,
        custom_financial_category_id: data.custom_financial_category_id || null,
        account_code: data.account_code || null,
        tax_category: data.tax_category || null,
        estimated_cost: data.estimated_cost || null,
        actual_cost: data.actual_cost || null,
        currency: data.currency || "SAR",
        notes: data.notes || null,
      };

      const { data: newEntry, error } = await supabase
        .from("financial_entries")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      toast.success("Financial entry created");
      fetchEntries();
      return newEntry;
    } catch (error: any) {
      console.error("Error creating financial entry:", error);
      toast.error(error.message || "Failed to create financial entry");
      return null;
    }
  };

  const updateEntry = async (id: string, updates: Partial<CreateFinancialEntryData>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("financial_entries")
        .update(updates as any)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Financial entry updated");
      fetchEntries();
      return true;
    } catch (error: any) {
      console.error("Error updating financial entry:", error);
      toast.error(error.message || "Failed to update financial entry");
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("financial_entries")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Financial entry deleted");
      fetchEntries();
      return true;
    } catch (error: any) {
      console.error("Error deleting financial entry:", error);
      toast.error(error.message || "Failed to delete financial entry");
      return false;
    }
  };

  return {
    entries,
    loading,
    canManage,
    createEntry,
    updateEntry,
    deleteEntry,
    refresh: fetchEntries,
  };
}
