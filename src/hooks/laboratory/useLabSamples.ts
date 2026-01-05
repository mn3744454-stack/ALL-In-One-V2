import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type LabSampleStatus = 'draft' | 'accessioned' | 'processing' | 'completed' | 'cancelled';

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
}

// Cache TTL for Riyadh bounds (60 seconds)
const RIYADH_BOUNDS_CACHE_TTL_MS = 60000;

export function useLabSamples(filters: LabSampleFilters = {}) {
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

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

  const fetchSamples = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setSamples([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("lab_samples")
        .select(`
          *,
          horse:horses!lab_samples_horse_id_fkey(id, name, name_ar, avatar_url),
          client:clients!lab_samples_client_id_fkey(id, name),
          assignee:profiles!lab_samples_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!lab_samples_created_by_fkey(id, full_name),
          receiver:profiles!lab_samples_received_by_fkey(id, full_name)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
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
      setSamples((data || []) as LabSample[]);
    } catch (error) {
      console.error("Error fetching lab samples:", error);
      toast.error("Failed to load samples");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, filters.status, filters.horse_id, filters.search, filters.received, filters.isRetest, filters.collectionDateToday]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const createSample = async (data: CreateLabSampleData) => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: sample, error } = await supabase
        .from("lab_samples")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Sample created successfully");
      fetchSamples();
      return sample;
    } catch (error: unknown) {
      console.error("Error creating sample:", error);
      const message = error instanceof Error ? error.message : "Failed to create sample";
      toast.error(message);
      return null;
    }
  };

  const updateSample = async (id: string, updates: Partial<CreateLabSampleData>) => {
    try {
      const { data, error } = await supabase
        .from("lab_samples")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Sample updated successfully");
      fetchSamples();
      return data;
    } catch (error: unknown) {
      console.error("Error updating sample:", error);
      const message = error instanceof Error ? error.message : "Failed to update sample";
      toast.error(message);
      return null;
    }
  };

  const accessionSample = async (id: string) => {
    return updateSample(id, { status: 'accessioned' });
  };

  const startProcessing = async (id: string) => {
    return updateSample(id, { status: 'processing' });
  };

  const completeSample = async (id: string) => {
    return updateSample(id, { status: 'completed' });
  };

  const cancelSample = async (id: string) => {
    return updateSample(id, { status: 'cancelled' });
  };

  const deleteSample = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lab_samples")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Sample deleted successfully");
      fetchSamples();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting sample:", error);
      const message = error instanceof Error ? error.message : "Failed to delete sample";
      toast.error(message);
      return false;
    }
  };

  // Mark sample as received (sets received_by; trigger fills received_at)
  const markReceived = async (sampleId: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error("Not authenticated");
      return false;
    }

    try {
      const { error } = await supabase
        .from("lab_samples")
        .update({ received_by: user.id })
        .eq("id", sampleId);

      if (error) throw error;

      toast.success("Sample marked as received");
      fetchSamples();
      return true;
    } catch (error: unknown) {
      console.error("Error marking sample as received:", error);
      const message = error instanceof Error ? error.message : "Failed to mark sample as received";
      toast.error(message);
      return false;
    }
  };

  // Mark sample as unreceived (optional; graceful error if RLS/DB refuses)
  const markUnreceived = async (sampleId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("lab_samples")
        .update({ received_by: null, received_at: null })
        .eq("id", sampleId);

      if (error) throw error;

      toast.success("Sample marked as unreceived");
      fetchSamples();
      return true;
    } catch (error: unknown) {
      console.error("Error marking sample as unreceived:", error);
      toast.error("Unable to mark as unreceived. This action may not be allowed.");
      return false;
    }
  };

  // Create retest sample from completed sample (tenant-safe + workflow-safe)
  const createRetest = async (originalSampleId: string): Promise<LabSample | null> => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      // Fetch original sample - SCOPED BY TENANT
      const { data: original, error: fetchError } = await supabase
        .from("lab_samples")
        .select("id, horse_id, client_id, status, physical_sample_id")
        .eq("id", originalSampleId)
        .eq("tenant_id", activeTenant.tenant.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!original) {
        toast.error("Sample not found");
        return null;
      }

      // WORKFLOW GUARD: Only allow retest for completed samples
      if (original.status !== 'completed') {
        toast.error("Can only create retest for completed samples");
        return null;
      }

      // Insert new retest - MINIMAL FIELDS (no physical_sample_id, no notes copy)
      const { data: newSample, error } = await supabase
        .from("lab_samples")
        .insert({
          tenant_id: activeTenant.tenant.id,
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

      toast.success("Retest sample created successfully");
      fetchSamples();
      return newSample as LabSample;
    } catch (error: unknown) {
      console.error("Error creating retest:", error);
      const message = error instanceof Error ? error.message : "Failed to create retest";
      
      // Handle max retests constraint (trigger returns this)
      if (message.includes("Maximum") || message.includes("retest") || message.includes("max_retests")) {
        toast.error("Maximum retests (3) reached for this sample");
      } else {
        toast.error(message);
      }
      return null;
    }
  };

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
    refresh: fetchSamples,
  };
}
