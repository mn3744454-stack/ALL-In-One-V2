import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface LabTestType {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  is_active: boolean;
  pin_as_tab: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLabTestTypeData {
  name: string;
  name_ar?: string;
  code?: string;
  is_active?: boolean;
  pin_as_tab?: boolean;
  sort_order?: number;
}

export function useLabTestTypes() {
  const [testTypes, setTestTypes] = useState<LabTestType[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole, loading: tenantLoading } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTestTypes = useCallback(async () => {
    // Wait for tenant context to finish loading
    if (tenantLoading) {
      return;
    }

    if (!activeTenant?.tenant.id) {
      setTestTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_test_types")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTestTypes(data || []);
    } catch (error) {
      console.error("Error fetching lab test types:", error);
      toast.error("Failed to load test types");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, tenantLoading]);

  useEffect(() => {
    fetchTestTypes();
  }, [fetchTestTypes]);

  const createTestType = async (data: CreateLabTestTypeData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: testType, error } = await supabase
        .from("lab_test_types")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Test type created successfully");
      fetchTestTypes();
      return testType;
    } catch (error: unknown) {
      console.error("Error creating test type:", error);
      const message = error instanceof Error ? error.message : "Failed to create test type";
      toast.error(message);
      return null;
    }
  };

  const updateTestType = async (id: string, updates: Partial<CreateLabTestTypeData>) => {
    try {
      const { data, error } = await supabase
        .from("lab_test_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Test type updated successfully");
      fetchTestTypes();
      return data;
    } catch (error: unknown) {
      console.error("Error updating test type:", error);
      const message = error instanceof Error ? error.message : "Failed to update test type";
      toast.error(message);
      return null;
    }
  };

  const deleteTestType = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lab_test_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Test type deleted successfully");
      fetchTestTypes();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting test type:", error);
      const message = error instanceof Error ? error.message : "Failed to delete test type";
      toast.error(message);
      return false;
    }
  };

  const pinnedTypes = testTypes.filter((t) => t.pin_as_tab && t.is_active);
  const activeTypes = testTypes.filter((t) => t.is_active);

  return {
    testTypes,
    pinnedTypes,
    activeTypes,
    loading,
    canManage,
    createTestType,
    updateTestType,
    deleteTestType,
    refresh: fetchTestTypes,
  };
}
