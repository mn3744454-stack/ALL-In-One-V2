import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tGlobal } from "@/i18n";
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
  published_to_stable: boolean;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sample?: {
    id: string;
    physical_sample_id: string | null;
    horse_name?: string | null;
    lab_request_id?: string | null;
    horse?: { id: string; name: string; name_ar?: string | null };
    lab_horse?: { id: string; name: string; name_ar?: string | null };
  };
  template?: { id: string; name: string; name_ar: string | null };
  creator?: { id: string; full_name: string | null };
  reviewer?: { id: string; full_name: string | null } | null;
}

export interface LabResultFilters {
  status?: LabResultStatus | 'all';
  flags?: LabResultFlags | 'all';
  sample_id?: string;
  // Date range filters
  dateFrom?: string;            // ISO date string (YYYY-MM-DD)
  dateTo?: string;              // ISO date string (YYYY-MM-DD)
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

  // Check if user can edit a specific result
  const canEditResult = (result: LabResult): boolean => {
    if (!user?.id) return false;
    
    // Owner or Manager can always edit
    if (activeRole === 'owner' || activeRole === 'manager') return true;
    
    // Reviewer can edit
    if (result.reviewed_by === user.id) return true;
    
    // Creator can edit if still draft
    if (result.created_by === user.id && result.status === 'draft') return true;
    
    return false;
  };

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
            horse_name,
            lab_request_id,
            horse:horses!lab_samples_horse_id_fkey(id, name, name_ar),
            lab_horse:lab_horses!lab_samples_lab_horse_id_fkey(id, name, name_ar)
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

      // Date range filters
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add one day to include the end date fully
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults((data || []) as LabResult[]);
    } catch (error) {
      console.error("Error fetching lab results:", error);
      toast.error(tGlobal("laboratory.toasts.failedToLoadResults"));
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.status, filters.flags, filters.sample_id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const createResult = async (data: CreateLabResultData) => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
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

      toast.success(tGlobal("laboratory.toasts.resultCreated"));
      fetchResults();
      return result;
    } catch (error: unknown) {
      console.error("Error creating result:", error);
      const message = error instanceof Error ? error.message : tGlobal("laboratory.toasts.failedToCreateResult");
      toast.error(message);
      return null;
    }
  };

  const updateResult = async (id: string, updates: Partial<CreateLabResultData>) => {
    if (!activeTenant?.tenant.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error(tGlobal("laboratory.toasts.resultNotFound"));
        return null;
      }

      toast.success(tGlobal("laboratory.toasts.resultUpdated"));
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error updating result:", error);
      const message = error instanceof Error ? error.message : tGlobal("laboratory.toasts.failedToUpdateResult");
      toast.error(message);
      return null;
    }
  };

  const reviewResult = async (id: string) => {
    if (!activeTenant?.tenant.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return null;
    }
    if (!user?.id) {
      toast.error(tGlobal("laboratory.toasts.notAuthenticated"));
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update({ status: 'reviewed', reviewed_by: user.id })
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id)
        .select()
        .maybeSingle();

      if (error) {
        // Handle status transition errors from DB trigger
        if (error.message.includes("Invalid result status transition")) {
          toast.error(tGlobal("laboratory.toasts.cannotReviewNotDraft"));
          return null;
        }
        throw error;
      }

      if (!data) {
        toast.error(tGlobal("laboratory.toasts.resultNotFound"));
        return null;
      }

      toast.success(tGlobal("laboratory.toasts.resultReviewed"));
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error reviewing result:", error);
      const message = error instanceof Error ? error.message : tGlobal("laboratory.toasts.failedToReviewResult");
      toast.error(message);
      return null;
    }
  };

  // Finalize result: only allowed from 'reviewed' status (enforced by DB trigger)
  const finalizeResult = async (id: string) => {
    if (!activeTenant?.tenant.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return null;
    }
    if (!user?.id) {
      toast.error(tGlobal("laboratory.toasts.notAuthenticated"));
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .update({ status: 'final' })
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id)
        .select()
        .maybeSingle();

      if (error) {
        // Handle status transition errors from DB trigger
        if (error.message.includes("Invalid result status transition")) {
          toast.error(tGlobal("laboratory.toasts.cannotFinalizeNotReviewed"));
          return null;
        }
        if (error.message.includes("final")) {
          toast.error(tGlobal("laboratory.toasts.resultAlreadyFinal"));
          return null;
        }
        throw error;
      }

      if (!data) {
        toast.error(tGlobal("laboratory.toasts.resultNotFound"));
        return null;
      }

      toast.success(tGlobal("laboratory.toasts.resultFinalized"));
      fetchResults();
      return data;
    } catch (error: unknown) {
      console.error("Error finalizing result:", error);
      const message = error instanceof Error ? error.message : tGlobal("laboratory.toasts.failedToFinalizeResult");
      toast.error(message);
      return null;
    }
  };

  const deleteResult = async (id: string) => {
    if (!activeTenant?.tenant.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("lab_results")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error(tGlobal("laboratory.toasts.resultNotFound"));
        return false;
      }

      toast.success(tGlobal("laboratory.toasts.resultDeleted"));
      fetchResults();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting result:", error);
      const message = error instanceof Error ? error.message : tGlobal("laboratory.toasts.failedToDeleteResult");
      toast.error(message);
      return false;
    }
  };

  const publishToStable = async (resultId: string) => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return false;
    }

    try {
      const { error } = await supabase
        .from("lab_results")
        .update({
          published_to_stable: true,
          published_at: new Date().toISOString(),
          published_by: user.id,
        })
        .eq("id", resultId)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;

      toast.success(tGlobal("laboratory.results.publishSuccess"));
      fetchResults();
      return true;
    } catch (error: unknown) {
      console.error("Error publishing result:", error);
      toast.error(tGlobal("laboratory.results.publishError"));
      return false;
    }
  };

  return {
    results,
    loading,
    canManage,
    canEditResult,
    createResult,
    updateResult,
    reviewResult,
    finalizeResult,
    deleteResult,
    publishToStable,
    refresh: fetchResults,
  };
}
