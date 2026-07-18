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
  /** @deprecated 2QA-C — legacy free-text category. `category_id` is the live truth. */
  category: string | null;
  /** 2QA-C — canonical live category identity via tenant_service_categories. */
  category_id: string | null;
  description: string | null;
  sample_type: string | null;
  turnaround_hours: number | null;
  price: number | null;
  currency: string | null;
  is_active: boolean;
  // Phase 13 pricing fields
  pricing_mode: string;
  override_price: number | null;
  discount_type: string | null;
  discount_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLabServiceInput {
  name: string;
  name_ar?: string;
  code?: string;
  /** 2QA-C — writes go to category_id. Legacy `category` text is no longer set from the form. */
  category_id?: string | null;
  description?: string;
  sample_type?: string;
  turnaround_hours?: number | null;
  price?: number | null;
  currency?: string;
  is_active?: boolean;
  // Phase 13
  pricing_mode?: string;
  override_price?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
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
      // 2QA-C — write category_id only. Legacy `category` text is no longer
      // authored from the UI. Same-tenant enforcement lives in the DB.
      const { data, error } = await supabase
        .from("lab_services")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          name_ar: input.name_ar || null,
          code: input.code || null,
          category_id: input.category_id ?? null,
          description: input.description || null,
          sample_type: input.sample_type || null,
          turnaround_hours: input.turnaround_hours ?? null,
          price: input.price ?? null,
          currency: input.currency || null,
          is_active: input.is_active ?? true,
          pricing_mode: input.pricing_mode || 'sum_templates',
          override_price: input.override_price ?? null,
          discount_type: input.discount_type || null,
          discount_value: input.discount_value ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      toast.success(t("laboratory.catalog.created"));
    },
    onError: () => toast.error(t("laboratory.catalog.createFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: CreateLabServiceInput & { id: string }) => {
      const { id, ...updates } = input;
      // 2QA-C — update category_id only. Do NOT overwrite legacy `category`
      // text: renaming the shared category or reassignment must not mutate
      // legacy free-text, and editing a service must never rename a shared
      // category. Historical invoice snapshots remain frozen.
      const { data, error } = await supabase
        .from("lab_services")
        .update({
          name: updates.name,
          name_ar: updates.name_ar || null,
          code: updates.code || null,
          category_id: updates.category_id ?? null,
          description: updates.description || null,
          sample_type: updates.sample_type || null,
          turnaround_hours: updates.turnaround_hours ?? null,
          price: updates.price ?? null,
          currency: updates.currency || null,
          is_active: updates.is_active ?? true,
          pricing_mode: updates.pricing_mode || 'sum_templates',
          override_price: updates.override_price ?? null,
          discount_type: updates.discount_type || null,
          discount_value: updates.discount_value ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      // Pre-check: does this service have existing request links?
      const { count: requestCount, error: countErr } = await supabase
        .from("lab_request_services")
        .select("id", { count: "exact", head: true })
        .eq("service_id", serviceId);
      if (countErr) throw countErr;
      if ((requestCount ?? 0) > 0) {
        throw new Error("HAS_REQUESTS");
      }
      // Remove template links first
      const { error: tmplErr } = await supabase
        .from("lab_service_templates")
        .delete()
        .eq("service_id", serviceId);
      if (tmplErr) throw tmplErr;
      // Delete the service
      const { error } = await supabase
        .from("lab_services")
        .delete()
        .eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
      toast.success(t("laboratory.catalog.deleted"));
    },
    onError: (err: Error) => {
      if (err.message === "HAS_REQUESTS") {
        toast.error(t("laboratory.catalog.deleteBlocked"));
      } else {
        toast.error(t("laboratory.catalog.deleteFailed"));
      }
    },
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading,
    createService: createMutation.mutateAsync,
    updateService: updateMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    deleteService: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * 2QA-C — Cross-tenant Lab catalog row.
 * Category identity comes exclusively from the shared
 * tenant_service_categories join (`category_*`). Legacy `lab_services.category`
 * text is intentionally NOT returned by the RPC anymore — it is kept in the
 * table only for historical compatibility.
 */
export interface LabCatalogViewerService {
  id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  description: string | null;
  sample_type: string | null;
  turnaround_hours: number | null;
  price: number | null;
  currency: string | null;
  is_active: boolean;
  // Shared category identity (same-tenant join). All null when unmapped.
  category_id: string | null;
  category_key: string | null;
  category_name: string | null;
  category_name_ar: string | null;
  category_is_active: boolean | null;
}

// Hook for viewing a lab's catalog (cross-tenant via RPC)
export function useLabCatalogViewer(
  labTenantId: string | null,
  search = "",
  categoryId: string | null = null,
) {
  return useQuery({
    queryKey: ["lab-catalog", labTenantId, search, categoryId],
    queryFn: async () => {
      if (!labTenantId) return [] as LabCatalogViewerService[];
      const { data, error } = await supabase.rpc("get_lab_services_for_viewer" as any, {
        _lab_tenant_id: labTenantId,
        _only_active: true,
        _search: search,
        _category_id: categoryId,
      });
      if (error) throw error;
      return (data ?? []) as unknown as LabCatalogViewerService[];
    },
    enabled: !!labTenantId,
  });
}
