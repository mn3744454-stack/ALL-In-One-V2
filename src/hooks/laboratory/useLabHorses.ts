import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tGlobal } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import type { Json } from "@/integrations/supabase/types";

export interface LabHorse {
  id: string;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  name_ar: string | null;
  gender: string | null;
  approx_age: string | null;
  breed_text: string | null;
  color_text: string | null;
  microchip_number: string | null;
  passport_number: string | null;
  ueln: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  client_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  linked_horse_id: string | null;
  linked_at: string | null;
  source: 'manual' | 'platform';
  is_archived: boolean;
}

export interface LabHorseFilters {
  search?: string;
  includeArchived?: boolean;
  clientId?: string;
}

export interface CreateLabHorseData {
  name: string;
  name_ar?: string;
  gender?: string;
  approx_age?: string;
  breed_text?: string;
  color_text?: string;
  microchip_number?: string;
  passport_number?: string;
  ueln?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  client_id?: string;
  notes?: string;
  metadata?: Json;
}

export interface UpdateLabHorseData extends Partial<CreateLabHorseData> {
  is_archived?: boolean;
}

export function useLabHorses(filters: LabHorseFilters = {}) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant.id;

  // Fetch lab horses
  const { data: labHorses = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.labHorses(tenantId, filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("lab_horses")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name", { ascending: true });

      // Filter archived by default
      if (!filters.includeArchived) {
        query = query.eq("is_archived", false);
      }

      // Filter by client (10.1: client → horses filtering)
      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      // Search filter
      if (filters.search?.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.or(
          `name.ilike.${searchTerm},microchip_number.ilike.${searchTerm},passport_number.ilike.${searchTerm},ueln.ilike.${searchTerm},owner_phone.ilike.${searchTerm},owner_name.ilike.${searchTerm}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LabHorse[];
    },
    enabled: !!tenantId,
    placeholderData: [],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateLabHorseData) => {
      if (!tenantId || !user?.id) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { data: labHorse, error } = await supabase
        .from("lab_horses")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          source: 'manual',
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return labHorse as LabHorse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-horses', tenantId] });
      toast.success(tGlobal("laboratory.toasts.labHorseCreated") || "Horse registered successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating lab horse:", error);
      // Handle unique constraint violations
      if (error.message?.includes("uq_lab_horses_tenant_microchip")) {
        toast.error(tGlobal("laboratory.toasts.duplicateMicrochip") || "A horse with this microchip already exists");
      } else if (error.message?.includes("uq_lab_horses_tenant_passport")) {
        toast.error(tGlobal("laboratory.toasts.duplicatePassport") || "A horse with this passport number already exists");
      } else if (error.message?.includes("uq_lab_horses_tenant_ueln")) {
        toast.error(tGlobal("laboratory.toasts.duplicateUeln") || "A horse with this UELN already exists");
      } else {
        toast.error(error.message || tGlobal("laboratory.toasts.failedToCreateLabHorse") || "Failed to register horse");
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateLabHorseData }) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { data, error } = await supabase
        .from("lab_horses")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as LabHorse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-horses', tenantId] });
      toast.success(tGlobal("laboratory.toasts.labHorseUpdated") || "Horse updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating lab horse:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToUpdateLabHorse") || "Failed to update horse");
    },
  });

  // Archive mutation (soft delete)
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { error } = await supabase
        .from("lab_horses")
        .update({ is_archived: true })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-horses', tenantId] });
      toast.success(tGlobal("laboratory.toasts.labHorseArchived") || "Horse archived successfully");
    },
    onError: (error: Error) => {
      console.error("Error archiving lab horse:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToArchiveLabHorse") || "Failed to archive horse");
    },
  });

  // Wrapper functions
  const createLabHorse = async (data: CreateLabHorseData): Promise<LabHorse | null> => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const updateLabHorse = async (id: string, updates: UpdateLabHorseData): Promise<LabHorse | null> => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const archiveLabHorse = async (id: string): Promise<boolean> => {
    try {
      await archiveMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    labHorses,
    loading,
    error,
    createLabHorse,
    updateLabHorse,
    archiveLabHorse,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}
