import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
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
  const [capabilities, setCapabilities] = useState<TenantCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchCapabilities = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setCapabilities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenant_capabilities")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("category", { ascending: true });

      if (error) throw error;
      setCapabilities(data || []);
    } catch (error) {
      console.error("Error fetching capabilities:", error);
      toast.error("Failed to load capabilities");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

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

  const createCapability = async (capData: CreateCapabilityData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("tenant_capabilities")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...capData,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Capability created successfully");
      fetchCapabilities();
      return data;
    } catch (error: unknown) {
      console.error("Error creating capability:", error);
      const message = error instanceof Error ? error.message : "Failed to create capability";
      toast.error(message);
      return null;
    }
  };

  const updateCapability = async (id: string, updates: Partial<CreateCapabilityData>) => {
    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("tenant_capabilities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Capability updated successfully");
      fetchCapabilities();
      return data;
    } catch (error: unknown) {
      console.error("Error updating capability:", error);
      const message = error instanceof Error ? error.message : "Failed to update capability";
      toast.error(message);
      return null;
    }
  };

  const upsertCapability = async (category: string, updates: Omit<CreateCapabilityData, "category">) => {
    const existing = getCapabilityForCategory(category);
    if (existing) {
      return updateCapability(existing.id, updates);
    } else {
      return createCapability({ category, ...updates });
    }
  };

  const deleteCapability = async (id: string) => {
    if (!canManage) {
      toast.error("You don't have permission to manage capabilities");
      return false;
    }

    try {
      const { error } = await supabase
        .from("tenant_capabilities")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Capability deleted successfully");
      fetchCapabilities();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting capability:", error);
      const message = error instanceof Error ? error.message : "Failed to delete capability";
      toast.error(message);
      return false;
    }
  };

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
    refresh: fetchCapabilities,
  };
}
