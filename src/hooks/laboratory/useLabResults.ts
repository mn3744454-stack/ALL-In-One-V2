import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type LabResultStatus = 'draft' | 'reviewed' | 'final';
export type LabResultFlags = 'normal' | 'abnormal' | 'critical';

export interface LabResult {
  id: string;
  tenant_id: string;
  sample_id: string;
  template_id: string;
  status: LabResultStatus;
  result_data: Record<string, unknown>;
  interpretation: Record<string, unknown>;
  flags: LabResultFlags | null;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sample?: {
    id: string;
    physical_sample_id: string | null;
    horse?: { id: string; name: string };
  };
  template?: { id: string; name: string; name_ar: string | null };
  creator?: { id: string; full_name: string | null };
  reviewer?: { id: string; full_name: string | null } | null;
}

export interface LabResultFilters {
  status?: LabResultStatus | 'all';
  flags?: LabResultFlags | 'all';
  sample_id?: string;
}

export interface CreateLabResultData {
  sample_id: string;
  template_id: string;
  status?: LabResultStatus;
  result_data?: Json;
  interpretation?: Json;
  flags?: LabResultFlags;
}

export function useLabResults(filters: LabResultFilters = {}) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchResults = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("lab_results")
        .select(`
          *,
          sample:lab_samples!lab_results_sample_id_fkey(
            id, 
            physical_sample_id,
            horse:horses!lab_samples_horse_id_fkey(id, name)
          ),
          template:lab_templates!lab_results_template_id_fkey(id, name, name_ar),
          creator:profiles!lab_results_created_by_fkey(id, full_name),
          reviewer:profiles!lab_results_reviewed_by_fkey(id, full_name)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.flags && filters.flags !== 'all') {
        query = query.eq("flags", filters.flags);
      }
      if (filters.sample_id) {
        query = query.eq("sample_id", filters.sample_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults((data || []) as LabResult[]);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.status, filters.flags, filters.sample_id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const createResult = async (data: CreateLabResultData) => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: result, error } = await supabase
        .from("lab_results")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Result created successfully");
      fetchResults();
      return result;
    } catch (error: unknown) {
      console.error("Error creating result:", error);
      const message = error instanceof Error ? error.message : "Failed to create result";
      toast.error(message);
      return null;
    }
  };

  const updateResult = async (id: string, updates: Partial<CreateLabResultData>) => {
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Result updated successfully");
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error updating result:", error);
      const message = error instanceof Error ? error.message : "Failed to update result";
      toast.error(message);
      return null;
    }
  };

  const reviewResult = async (id: string) => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update({ status: 'reviewed', reviewed_by: user.id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Result reviewed successfully");
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error reviewing result:", error);
      const message = error instanceof Error ? error.message : "Failed to review result";
      toast.error(message);
      return null;
    }
  };

  const finalizeResult = async (id: string) => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update({ status: 'final', reviewed_by: user.id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Result finalized successfully");
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error finalizing result:", error);
      const message = error instanceof Error ? error.message : "Failed to finalize result";
      toast.error(message);
      return null;
    }
  };

  const deleteResult = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lab_results")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Result deleted successfully");
      fetchResults();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting result:", error);
      const message = error instanceof Error ? error.message : "Failed to delete result";
      toast.error(message);
      return false;
    }
  };

  return {
    results,
    loading,
    canManage,
    createResult,
    updateResult,
    reviewResult,
    finalizeResult,
    deleteResult,
    refresh: fetchResults,
  };
}
