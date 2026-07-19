import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Slice 2A — Tenant-scoped service categories hook.
 * Reads and mutates `tenant_service_categories` for the active tenant only.
 *
 * Contract:
 *  - Category key is generated once at creation (server-side default) and is immutable.
 *  - Rename updates display names only.
 *  - Archive sets is_active = false. No authenticated hard delete.
 *  - Every mutation invalidates the shared category query so Statement selectors
 *    refresh without a hard page reload.
 */
export interface ServiceCategory {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
  sort_order: number;
  domain_key: string | null;
}

export interface CreateServiceCategoryInput {
  name: string;
  name_ar?: string | null;
  domain_key?: string | null;
  sort_order?: number;
}

export interface UpdateServiceCategoryInput {
  name?: string;
  name_ar?: string | null;
  sort_order?: number;
  // NOTE: `key` is immutable and intentionally omitted.
}

export function useServiceCategories(includeArchived: boolean = false) {
  const { activeTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.serviceCategories.list(tenantId, includeArchived),
    queryFn: async (): Promise<ServiceCategory[]> => {
      if (!tenantId) return [];
      let q = supabase
        .from("tenant_service_categories")
        .select("id,tenant_id,key,name,name_ar,is_active,sort_order,domain_key")
        .eq("tenant_id", tenantId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (!includeArchived) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) {
        console.error("useServiceCategories: fetch error", error);
        return [];
      }
      return (data || []) as unknown as ServiceCategory[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    // 2QA-C — invalidate shared category queries AND the cross-tenant Lab
    // catalog root so an open LabCatalogViewer refetches live category
    // identity (rename/create/archive/restore) without a page refresh.
    queryClient.invalidateQueries({ queryKey: queryKeys.serviceCategories.root });
    queryClient.invalidateQueries({ queryKey: queryKeys.labCatalog.root });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateServiceCategoryInput) => {
      if (!tenantId) throw new Error("No active tenant");
      // Generate an immutable slug key from the English name; fall back to a
      // random suffix if the slug is empty (e.g. Arabic-only names).
      const slug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const key = slug || `cat_${crypto.randomUUID().slice(0, 8)}`;
      const { data, error } = await supabase
        .from("tenant_service_categories")
        .insert({
          tenant_id: tenantId,
          key,
          name: input.name,
          name_ar: input.name_ar ?? null,
          domain_key: input.domain_key ?? null,
          sort_order: input.sort_order ?? 100,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ServiceCategory;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Category created" });
    },
    onError: (err: unknown) => {
      console.error("useServiceCategories.create error", err);
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateServiceCategoryInput }) => {
      if (!tenantId) throw new Error("No active tenant");
      // NOTE: `key` intentionally not updatable — immutability enforced here.
      const patch: Record<string, unknown> = {};
      if (typeof data.name === "string") patch.name = data.name;
      if (data.name_ar !== undefined) patch.name_ar = data.name_ar;
      if (typeof data.sort_order === "number") patch.sort_order = data.sort_order;
      const { data: updated, error } = await supabase
        .from("tenant_service_categories")
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return updated as unknown as ServiceCategory;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Category updated" });
    },
    onError: (err: unknown) => {
      console.error("useServiceCategories.rename error", err);
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No active tenant");
      const { error } = await supabase
        .from("tenant_service_categories")
        .update({ is_active: false })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Category archived" });
    },
    onError: (err: unknown) => {
      console.error("useServiceCategories.archive error", err);
      toast({ title: "Failed to archive category", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No active tenant");
      const { error } = await supabase
        .from("tenant_service_categories")
        .update({ is_active: true })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: () => invalidate(),
  });

  return {
    categories,
    isLoading,
    refetch,
    createCategory: createMutation.mutateAsync,
    renameCategory: renameMutation.mutateAsync,
    archiveCategory: archiveMutation.mutateAsync,
    restoreCategory: restoreMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      renameMutation.isPending ||
      archiveMutation.isPending ||
      restoreMutation.isPending,
  };
}

/**
 * Resolve a display name for a category in the current language.
 *
 * 2QA-C Closure — technical `key` is NEVER a visible fallback. Callers must
 * render a localized "Category Unavailable" chip when this returns an empty
 * string (valid category id but both localized names missing).
 * Use "Unmapped Category" only when there is no linked category at all.
 */
export function displayCategoryName(
  cat: Pick<ServiceCategory, "name" | "name_ar">,
  lang: "ar" | "en"
): string {
  if (lang === "ar") return (cat.name_ar || cat.name || "").trim();
  return (cat.name || cat.name_ar || "").trim();
}
