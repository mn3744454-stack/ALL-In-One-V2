import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tGlobal } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import type { Json } from "@/integrations/supabase/types";

export type LabSampleStatus = 'draft' | 'accessioned' | 'processing' | 'completed' | 'cancelled';

export interface SampleTemplate {
  id: string;
  sort_order: number;
  template: {
    id: string;
    name: string;
    name_ar: string | null;
    template_type: string;
    fields: unknown[];
  };
}

export interface LabSample {
  id: string;
  tenant_id: string;
  horse_id: string;
  related_order_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  physical_sample_id: string | null;
  collection_date: string;
  status: LabSampleStatus;
  accessioned_at: string | null;
  completed_at: string | null;
  notes: string | null;
  retest_of_sample_id: string | null;
  retest_count: number;
  debit_txn_id: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  // New received columns
  received_at: string | null;
  received_by: string | null;
  source_lab_tenant_id: string | null;
  // Joined fields
  horse?: { id: string; name: string; name_ar: string | null; avatar_url: string | null };
  client?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  creator?: { id: string; full_name: string | null };
  receiver?: { id: string; full_name: string | null } | null;
  // Templates (many-to-many)
  templates?: SampleTemplate[];
}

export interface LabSampleFilters {
  status?: LabSampleStatus | 'all';
  horse_id?: string;
  search?: string;
  // New filters
  received?: boolean;           // true = received, false = unreceived
  isRetest?: boolean;           // retest_of_sample_id not null
  collectionDateToday?: boolean; // collection_date is today (timezone-aware +03)
}

export interface CreateLabSampleData {
  horse_id: string;
  related_order_id?: string;
  client_id?: string;
  assigned_to?: string;
  physical_sample_id?: string;
  collection_date?: string;
  status?: LabSampleStatus;
  notes?: string;
  retest_of_sample_id?: string;
  metadata?: Json;
  template_ids?: string[];
}

// Cache TTL for Riyadh bounds (60 seconds)
const RIYADH_BOUNDS_CACHE_TTL_MS = 60000;

export function useLabSamples(filters: LabSampleFilters = {}) {
  const queryClient = useQueryClient();
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant.id;

  const canManage = activeRole === "owner" || activeRole === "manager";

  // Cache for Riyadh day bounds
  const riyadhBoundsCache = useRef<{
    start: string;
    end: string;
    timestamp: number;
  } | null>(null);

  // Helper to get cached or fresh Riyadh bounds
  const getRiyadhDayBounds = async (): Promise<{ start: string; end: string } | null> => {
    const now = Date.now();
    
    // Return cached if still valid
    if (riyadhBoundsCache.current && (now - riyadhBoundsCache.current.timestamp) < RIYADH_BOUNDS_CACHE_TTL_MS) {
      return {
        start: riyadhBoundsCache.current.start,
        end: riyadhBoundsCache.current.end,
      };
    }

    // Fetch fresh bounds
    try {
      const { data, error } = await supabase.rpc('get_riyadh_day_bounds');
      
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        console.error("Failed to get Riyadh day bounds:", error);
        return null;
      }

      const bounds = Array.isArray(data) ? data[0] : data;
      
      // Cache the result
      riyadhBoundsCache.current = {
        start: bounds.start_utc,
        end: bounds.end_utc,
        timestamp: now,
      };

      return { start: bounds.start_utc, end: bounds.end_utc };
    } catch (err) {
      console.error("RPC call failed for get_riyadh_day_bounds:", err);
      return null;
    }
  };

  // Use React Query for fetching samples
  const { data: samples = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.labSamples(tenantId, filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("lab_samples")
        .select(`
          *,
          horse:horses!lab_samples_horse_id_fkey(id, name, name_ar, avatar_url),
          client:clients!lab_samples_client_id_fkey(id, name),
          assignee:profiles!lab_samples_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!lab_samples_created_by_fkey(id, full_name),
          receiver:profiles!lab_samples_received_by_fkey(id, full_name),
          templates:lab_sample_templates(id, sort_order, template:lab_templates(id, name, name_ar, template_type, fields))
        `)
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.horse_id) {
        query = query.eq("horse_id", filters.horse_id);
      }
      if (filters.search) {
        query = query.ilike("physical_sample_id", `%${filters.search}%`);
      }

      // New filters
      if (filters.received === true) {
        query = query.not("received_at", "is", null);
      } else if (filters.received === false) {
        query = query.is("received_at", null);
      }

      if (filters.isRetest) {
        query = query.not("retest_of_sample_id", "is", null);
      }

      if (filters.collectionDateToday) {
        // Use cached server-side RPC for timezone-aware Riyadh day bounds
        const bounds = await getRiyadhDayBounds();
        if (bounds) {
          query = query
            .gte("collection_date", bounds.start)
            .lt("collection_date", bounds.end);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as LabSample[];
    },
    enabled: !!tenantId,
    placeholderData: [], // Prevent flash from previous tenant data
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateLabSampleData) => {
      if (!tenantId || !user?.id) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      // Extract template_ids before inserting sample
      const { template_ids, ...sampleData } = data;

      const { data: sample, error } = await supabase
        .from("lab_samples")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          ...sampleData,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert templates if provided (with sort_order to preserve selection order)
      if (template_ids && template_ids.length > 0 && sample) {
        const templateRows = template_ids.map((templateId, index) => ({
          sample_id: sample.id,
          template_id: templateId,
          tenant_id: tenantId,
          sort_order: index + 1,
        }));

        const { error: templatesError } = await supabase
          .from("lab_sample_templates")
          .insert(templateRows);

        if (templatesError) {
          console.error("Error inserting sample templates:", templatesError);
          // Don't fail the whole operation, sample was created
        }
      }

      return sample;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.sampleCreated"));
    },
    onError: (error: Error) => {
      console.error("Error creating sample:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToCreateSample"));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateLabSampleData> }) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { data, error } = await supabase
        .from("lab_samples")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(tGlobal("laboratory.toasts.sampleNotFound"));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.sampleUpdated"));
    },
    onError: (error: Error) => {
      console.error("Error updating sample:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToUpdateSample"));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { data, error } = await supabase
        .from("lab_samples")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(tGlobal("laboratory.toasts.sampleNotFound"));
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.sampleDeleted"));
    },
    onError: (error: Error) => {
      console.error("Error deleting sample:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToDeleteSample"));
    },
  });

  // Mark received mutation
  const markReceivedMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }
      if (!user?.id) {
        throw new Error(tGlobal("laboratory.toasts.notAuthenticated"));
      }

      const { error } = await supabase
        .from("lab_samples")
        .update({ received_by: user.id })
        .eq("id", sampleId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.sampleMarkedReceived"));
    },
    onError: (error: Error) => {
      console.error("Error marking sample as received:", error);
      toast.error(error.message || tGlobal("laboratory.toasts.failedToMarkReceived"));
    },
  });

  // Mark unreceived mutation
  const markUnreceivedMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      if (!tenantId) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      const { error } = await supabase
        .from("lab_samples")
        .update({ received_by: null, received_at: null })
        .eq("id", sampleId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.sampleMarkedUnreceived"));
    },
    onError: (error: Error) => {
      console.error("Error marking sample as unreceived:", error);
      toast.error(tGlobal("laboratory.toasts.unableToMarkUnreceived"));
    },
  });

  // Create retest mutation
  const createRetestMutation = useMutation({
    mutationFn: async (originalSampleId: string) => {
      if (!tenantId || !user?.id) {
        throw new Error(tGlobal("laboratory.toasts.noActiveOrganization"));
      }

      // Fetch original sample - SCOPED BY TENANT
      const { data: original, error: fetchError } = await supabase
        .from("lab_samples")
        .select("id, horse_id, client_id, status, physical_sample_id")
        .eq("id", originalSampleId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!original) {
        throw new Error(tGlobal("laboratory.toasts.sampleNotFound"));
      }

      // WORKFLOW GUARD: Only allow retest for completed samples
      if (original.status !== 'completed') {
        throw new Error(tGlobal("laboratory.toasts.retestOnlyCompleted"));
      }

      // Insert new retest - MINIMAL FIELDS (no physical_sample_id, no notes copy)
      const { data: newSample, error } = await supabase
        .from("lab_samples")
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          horse_id: original.horse_id,
          client_id: original.client_id || null,
          collection_date: new Date().toISOString(),
          status: 'draft',
          retest_of_sample_id: originalSampleId,
        })
        .select()
        .single();

      if (error) throw error;
      return newSample as LabSample;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
      toast.success(tGlobal("laboratory.toasts.retestCreated"));
    },
    onError: (error: Error) => {
      console.error("Error creating retest:", error);
      const message = error.message || "";
      
      // Handle max retests constraint (trigger returns this)
      if (message.includes("Maximum") || message.includes("retest") || message.includes("max_retests")) {
        toast.error(tGlobal("laboratory.toasts.maxRetestsReached"));
      } else {
        toast.error(tGlobal("laboratory.toasts.failedToCreateRetest"));
      }
    },
  });

  // Wrapper functions for backward compatibility
  const createSample = async (data: CreateLabSampleData) => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const updateSample = async (id: string, updates: Partial<CreateLabSampleData>) => {
    try {
      return await updateMutation.mutateAsync({ id, updates });
    } catch {
      return null;
    }
  };

  const accessionSample = async (id: string) => updateSample(id, { status: 'accessioned' });
  const startProcessing = async (id: string) => updateSample(id, { status: 'processing' });
  const completeSample = async (id: string) => updateSample(id, { status: 'completed' });
  const cancelSample = async (id: string) => updateSample(id, { status: 'cancelled' });

  const deleteSample = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const markReceived = async (sampleId: string): Promise<boolean> => {
    try {
      await markReceivedMutation.mutateAsync(sampleId);
      return true;
    } catch {
      return false;
    }
  };

  const markUnreceived = async (sampleId: string): Promise<boolean> => {
    try {
      await markUnreceivedMutation.mutateAsync(sampleId);
      return true;
    } catch {
      return false;
    }
  };

  const createRetest = async (originalSampleId: string): Promise<LabSample | null> => {
    try {
      return await createRetestMutation.mutateAsync(originalSampleId);
    } catch {
      return null;
    }
  };

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lab-samples', tenantId] });
  }, [queryClient, tenantId]);

  return {
    samples,
    loading,
    canManage,
    createSample,
    updateSample,
    accessionSample,
    startProcessing,
    completeSample,
    cancelSample,
    deleteSample,
    markReceived,
    markUnreceived,
    createRetest,
    refresh,
  };
}
