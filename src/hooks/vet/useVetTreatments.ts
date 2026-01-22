import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
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
  source_tenant?: { id: string; name: string } | null;
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
  const queryClient = useQueryClient();
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  const canManage = activeRole === "owner" || activeRole === "manager";

  // Use React Query for fetching treatments
  const { data: treatments = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.vetTreatments(tenantId),
    queryFn: async () => {
      let query = supabase
        .from("vet_treatments")
        .select(`
          *,
          horse:horses!vet_treatments_horse_id_fkey(id, name, avatar_url),
          provider:service_providers!vet_treatments_external_provider_id_fkey(id, name),
          assignee:profiles!vet_treatments_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!vet_treatments_created_by_fkey(id, full_name, avatar_url),
          source_tenant:tenants!vet_treatments_tenant_id_fkey(id, name)
        `)
        .eq("tenant_id", tenantId!)
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
      return (data || []) as VetTreatment[];
    },
    enabled: !!tenantId,
    placeholderData: [], // Prevent flash from previous tenant data
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateVetTreatmentData) => {
      if (!tenantId) throw new Error("No active organization");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: treatment, error } = await supabase
        .from("vet_treatments")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return treatment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetTreatments(tenantId) });
      toast.success("Treatment created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating treatment:", error);
      toast.error(error.message || "Failed to create treatment");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateVetTreatmentData> }) => {
      const { data, error } = await supabase
        .from("vet_treatments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetTreatments(tenantId) });
      toast.success("Treatment updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating treatment:", error);
      toast.error(error.message || "Failed to update treatment");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vet_treatments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vetTreatments(tenantId) });
      toast.success("Treatment deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting treatment:", error);
      toast.error(error.message || "Failed to delete treatment");
    },
  });

  // Wrapper functions for backward compatibility
  const createTreatment = async (data: CreateVetTreatmentData) => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const updateTreatment = async (id: string, updates: Partial<CreateVetTreatmentData>) => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const updateStatus = async (id: string, status: VetTreatmentStatus) => {
    return updateTreatment(id, { status });
  };

  const deleteTreatment = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.vetTreatments(tenantId) });
  }, [queryClient, tenantId]);

  return {
    treatments,
    loading,
    canManage,
    createTreatment,
    updateTreatment,
    updateStatus,
    deleteTreatment,
    refresh,
  };
}
