import { useState, useEffect, useCallback } from "react";
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

export function useLabSamples(filters: LabSampleFilters = {}) {
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

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
        // Timezone-aware "today" filter for +03 (Arabia Standard Time)
        const now = new Date();
        const offsetMinutes = -180; // +03:00 = -180 minutes from UTC
        const localNow = new Date(now.getTime() + (offsetMinutes + now.getTimezoneOffset()) * 60000);
        
        const startOfDay = new Date(localNow);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(localNow);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Convert back to UTC for query
        const startUTC = new Date(startOfDay.getTime() - offsetMinutes * 60000);
        const endUTC = new Date(endOfDay.getTime() - offsetMinutes * 60000);
        
        query = query
          .gte("collection_date", startUTC.toISOString())
          .lte("collection_date", endUTC.toISOString());
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
    refresh: fetchSamples,
  };
}
