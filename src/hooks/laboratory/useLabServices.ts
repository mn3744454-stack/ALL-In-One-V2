import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export interface LabService {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  category: string | null;
  description: string | null;
  sample_type: string | null;
  turnaround_hours: number | null;
  price: number | null;
  currency: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLabServiceInput {
  name: string;
  name_ar?: string;
  code?: string;
  category?: string;
  description?: string;
  sample_type?: string;
  turnaround_hours?: number | null;
  price?: number | null;
  currency?: string;
  is_active?: boolean;
}

// Hook for lab tenant managing their own services
export function useLabServices() {
  const { activeTenant } = useTenant();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant.id;

  const query = useQuery({
    queryKey: ["lab-services", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("lab_services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as LabService[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateLabServiceInput) => {
      if (!tenantId) throw new Error("No active tenant");
      const { data, error } = await supabase
        .from("lab_services")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          name_ar: input.name_ar || null,
          code: input.code || null,
          category: input.category || null,
          description: input.description || null,
          sample_type: input.sample_type || null,
          turnaround_hours: input.turnaround_hours ?? null,
          price: input.price ?? null,
          currency: input.currency || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
      toast.success(t("laboratory.catalog.created"));
    },
    onError: () => toast.error(t("laboratory.catalog.createFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: CreateLabServiceInput & { id: string }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("lab_services")
        .update({
          name: updates.name,
          name_ar: updates.name_ar || null,
          code: updates.code || null,
          category: updates.category || null,
          description: updates.description || null,
          sample_type: updates.sample_type || null,
          turnaround_hours: updates.turnaround_hours ?? null,
          price: updates.price ?? null,
          currency: updates.currency || null,
          is_active: updates.is_active ?? true,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
      toast.success(t("laboratory.catalog.updated"));
    },
    onError: () => toast.error(t("laboratory.catalog.updateFailed")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("lab_services")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
    },
    onError: () => toast.error(t("laboratory.catalog.updateFailed")),
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading,
    createService: createMutation.mutateAsync,
    updateService: updateMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook for viewing a lab's catalog (cross-tenant via RPC)
export function useLabCatalogViewer(labTenantId: string | null, search = "", category: string | null = null) {
  return useQuery({
    queryKey: ["lab-catalog", labTenantId, search, category],
    queryFn: async () => {
      if (!labTenantId) return [];
      const { data, error } = await supabase.rpc("get_lab_services_for_viewer", {
        _lab_tenant_id: labTenantId,
        _only_active: true,
        _search: search,
        _category: category,
      });
      if (error) throw error;
      return (data ?? []) as Omit<LabService, "tenant_id" | "created_at" | "updated_at">[];
    },
    enabled: !!labTenantId,
  });
}
