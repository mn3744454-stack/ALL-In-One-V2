import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export interface LabServiceTemplate {
  id: string;
  tenant_id: string;
  service_id: string;
  template_id: string;
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface UpsertServiceTemplateInput {
  service_id: string;
  template_id: string;
  sort_order?: number;
  is_required?: boolean;
}

/**
 * Hook to manage lab_service_templates junction table.
 * Lists, upserts, and deletes service↔template mappings.
 */
export function useLabServiceTemplates(serviceId?: string) {
  const { activeTenant } = useTenant();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant.id;

  const queryKey = ["lab-service-templates", tenantId, serviceId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tenantId || !serviceId) return [];
      const { data, error } = await supabase
        .from("lab_service_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("service_id", serviceId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as LabServiceTemplate[];
    },
    enabled: !!tenantId && !!serviceId,
  });

  const syncMutation = useMutation({
    mutationFn: async ({ entries, target_service_id }: { entries: UpsertServiceTemplateInput[]; target_service_id?: string }) => {
      const effectiveServiceId = target_service_id ?? serviceId;
      if (!tenantId || !effectiveServiceId) throw new Error("Missing tenant or service");

      // Delete existing mappings for this service
      const { error: delError } = await supabase
        .from("lab_service_templates")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("service_id", effectiveServiceId);
      if (delError) throw delError;

      // Insert new ones
      if (entries.length > 0) {
        const rows = entries.map((e, idx) => ({
          tenant_id: tenantId,
          service_id: effectiveServiceId,
          template_id: e.template_id,
          sort_order: e.sort_order ?? idx,
          is_required: e.is_required ?? true,
        }));
        const { error: insError } = await supabase
          .from("lab_service_templates")
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["lab-services", tenantId] });
    },
    onError: () => toast.error("Failed to update linked templates"),
  });

  return {
    mappings: query.data ?? [],
    isLoading: query.isLoading,
    syncTemplates: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}

/**
 * Fetch template_ids linked to multiple service_ids in one call.
 * Used to prefill templates when creating a sample from a request.
 */
export async function fetchTemplateIdsForServices(
  tenantId: string,
  serviceIds: string[]
): Promise<string[]> {
  if (!serviceIds.length) return [];
  const { data, error } = await supabase
    .from("lab_service_templates")
    .select("template_id, sort_order")
    .eq("tenant_id", tenantId)
    .in("service_id", serviceIds)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Failed to fetch service templates:", error);
    return [];
  }
  // Deduplicate while preserving sort order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of data) {
    if (!seen.has(row.template_id)) {
      seen.add(row.template_id);
      result.push(row.template_id);
    }
  }
  return result;
}
