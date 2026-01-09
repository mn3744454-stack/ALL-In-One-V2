import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { Json } from "@/integrations/supabase/types";

export interface TenantCapability {
  id: string;
  tenant_id: string;
  category: string;
  has_internal: boolean;
  allow_external: boolean;
  config: Json;
  created_at: string;
  updated_at: string;
}

export interface CreateCapabilityData {
  category: string;
  has_internal?: boolean;
  allow_external?: boolean;
  config?: Json;
}

export function useTenantCapabilities() {
  const queryClient = useQueryClient();
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  const canManage = activeRole === "owner" || activeRole === "manager";

  // Use React Query for fetching capabilities
  const { data: capabilities = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.capabilities(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_capabilities")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("category", { ascending: true });

      if (error) throw error;
      return (data || []) as TenantCapability[];
    },
    enabled: !!tenantId,
    placeholderData: [], // Prevent flash from previous tenant data
  });

  const getCapabilityForCategory = useCallback(
    (category: string | null): TenantCapability | null => {
      if (!category) return null;
      return capabilities.find((c) => c.category === category) || null;
    },
    [capabilities]
  );

  const hasInternalCapability = useCallback(
    (category: string | null): boolean => {
      const cap = getCapabilityForCategory(category);
      return cap?.has_internal ?? false;
    },
    [getCapabilityForCategory]
  );

  const allowsExternalCapability = useCallback(
    (category: string | null): boolean => {
      const cap = getCapabilityForCategory(category);
      // Default to true if no capability defined
      return cap?.allow_external ?? true;
    },
    [getCapabilityForCategory]
  );

  const getServiceModeOptions = useCallback(
    (category: string | null): { value: "internal" | "external"; label: string }[] => {
      const hasInternal = hasInternalCapability(category);
      const allowsExternal = allowsExternalCapability(category);

      const options: { value: "internal" | "external"; label: string }[] = [];

      if (hasInternal) {
        options.push({ value: "internal", label: "Internal" });
      }
      if (allowsExternal) {
        options.push({ value: "external", label: "External" });
      }

      // If no options available, default to external
      if (options.length === 0) {
        options.push({ value: "external", label: "External" });
      }

      return options;
    },
    [hasInternalCapability, allowsExternalCapability]
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (capData: CreateCapabilityData) => {
      if (!tenantId) throw new Error("No active organization");

      const { data, error } = await supabase
        .from("tenant_capabilities")
        .insert({
          tenant_id: tenantId,
          ...capData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.capabilities(tenantId) });
      toast.success("Capability created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating capability:", error);
      toast.error(error.message || "Failed to create capability");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateCapabilityData> }) => {
      const { data, error } = await supabase
        .from("tenant_capabilities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.capabilities(tenantId) });
      toast.success("Capability updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating capability:", error);
      toast.error(error.message || "Failed to update capability");
    },
  });

  // Upsert mutation (merges config to prevent overwrite)
  const upsertMutation = useMutation({
    mutationFn: async ({ category, updates }: { 
      category: string; 
      updates: Omit<CreateCapabilityData, "category"> 
    }) => {
      if (!tenantId) throw new Error("No active organization");

      const existing = capabilities.find((c) => c.category === category);
      
      // Merge config to prevent overwriting other fields
      const existingConfig = existing?.config && typeof existing.config === 'object' && !Array.isArray(existing.config)
        ? existing.config as Record<string, Json>
        : {};
      
      const newConfigFields = updates.config && typeof updates.config === 'object' && !Array.isArray(updates.config)
        ? updates.config as Record<string, Json>
        : {};
      
      const mergedConfig: Record<string, Json> = { ...existingConfig, ...newConfigFields };

      if (existing) {
        const { data, error } = await supabase
          .from("tenant_capabilities")
          .update({ 
            has_internal: updates.has_internal,
            allow_external: updates.allow_external,
            config: mergedConfig as Json 
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("tenant_capabilities")
          .insert({
            tenant_id: tenantId, 
            category,
            has_internal: updates.has_internal ?? false,
            allow_external: updates.allow_external ?? true,
            config: mergedConfig as Json 
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.capabilities(tenantId) });
    },
    onError: (error: Error) => {
      console.error("Error upserting capability:", error);
      toast.error(error.message || "Failed to save capability");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_capabilities")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.capabilities(tenantId) });
      toast.success("Capability deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting capability:", error);
      toast.error(error.message || "Failed to delete capability");
    },
  });

  // Wrapper functions to maintain backward compatibility
  const createCapability = async (capData: CreateCapabilityData) => {
    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return null;
    }
    try {
      return await createMutation.mutateAsync(capData);
    } catch {
      return null;
    }
  };

  const updateCapability = async (id: string, updates: Partial<CreateCapabilityData>) => {
    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return null;
    }
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const upsertCapability = async (category: string, updates: Omit<CreateCapabilityData, "category">) => {
    try {
      return await upsertMutation.mutateAsync({ category, updates });
    } catch {
      return null;
    }
  };

  const deleteCapability = async (id: string) => {
    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return false;
    }
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.capabilities(tenantId) });
  }, [queryClient, tenantId]);

  return {
    capabilities,
    loading,
    canManage,
    getCapabilityForCategory,
    hasInternalCapability,
    allowsExternalCapability,
    getServiceModeOptions,
    createCapability,
    updateCapability,
    upsertCapability,
    deleteCapability,
    refresh,
  };
}
