import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type VetTreatmentCategory = 
  | 'treatment' | 'procedure' | 'checkup' | 'dental' 
  | 'hoof' | 'injury' | 'surgery' | 'reproductive' | 'lab';

export type VetTreatmentStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type VetTreatmentPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface VetTreatment {
  id: string;
  tenant_id: string;
  horse_id: string;
  category: VetTreatmentCategory;
  title: string;
  description: string | null;
  status: VetTreatmentStatus;
  priority: VetTreatmentPriority;
  service_mode: 'internal' | 'external';
  external_provider_id: string | null;
  external_provider_name: string | null;
  internal_resource_ref: Json | null;
  client_id: string | null;
  assigned_to: string | null;
  created_by: string;
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  related_order_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  horse?: { id: string; name: string; avatar_url: string | null };
  provider?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
  creator?: { id: string; full_name: string; avatar_url: string | null };
}

export interface VetTreatmentFilters {
  status?: VetTreatmentStatus | 'all';
  category?: VetTreatmentCategory | 'all';
  priority?: VetTreatmentPriority | 'all';
  horse_id?: string;
  search?: string;
}

export interface CreateVetTreatmentData {
  horse_id: string;
  category: VetTreatmentCategory;
  title: string;
  description?: string;
  status?: VetTreatmentStatus;
  priority?: VetTreatmentPriority;
  service_mode: 'internal' | 'external';
  external_provider_id?: string;
  external_provider_name?: string;
  internal_resource_ref?: Json;
  client_id?: string;
  assigned_to?: string;
  scheduled_for?: string;
  notes?: string;
}

export function useVetTreatments(filters: VetTreatmentFilters = {}) {
  const [treatments, setTreatments] = useState<VetTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTreatments = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setTreatments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("vet_treatments")
        .select(`
          *,
          horse:horses!vet_treatments_horse_id_fkey(id, name, avatar_url),
          provider:service_providers!vet_treatments_external_provider_id_fkey(id, name),
          assignee:profiles!vet_treatments_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!vet_treatments_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq("category", filters.category);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq("priority", filters.priority);
      }
      if (filters.horse_id) {
        query = query.eq("horse_id", filters.horse_id);
      }
      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTreatments((data || []) as VetTreatment[]);
    } catch (error) {
      console.error("Error fetching vet treatments:", error);
      toast.error("Failed to load treatments");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.status, filters.category, filters.priority, filters.horse_id, filters.search]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const createTreatment = async (data: CreateVetTreatmentData) => {
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

      const { data: treatment, error } = await supabase
        .from("vet_treatments")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Treatment created successfully");
      fetchTreatments();
      return treatment;
    } catch (error: unknown) {
      console.error("Error creating treatment:", error);
      const message = error instanceof Error ? error.message : "Failed to create treatment";
      toast.error(message);
      return null;
    }
  };

  const updateTreatment = async (id: string, updates: Partial<CreateVetTreatmentData>) => {
    try {
      const { data, error } = await supabase
        .from("vet_treatments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Treatment updated successfully");
      fetchTreatments();
      return data;
    } catch (error: unknown) {
      console.error("Error updating treatment:", error);
      const message = error instanceof Error ? error.message : "Failed to update treatment";
      toast.error(message);
      return null;
    }
  };

  const updateStatus = async (id: string, status: VetTreatmentStatus) => {
    return updateTreatment(id, { status });
  };

  const deleteTreatment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vet_treatments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Treatment deleted successfully");
      fetchTreatments();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting treatment:", error);
      const message = error instanceof Error ? error.message : "Failed to delete treatment";
      toast.error(message);
      return false;
    }
  };

  return {
    treatments,
    loading,
    canManage,
    createTreatment,
    updateTreatment,
    updateStatus,
    deleteTreatment,
    refresh: fetchTreatments,
  };
}
