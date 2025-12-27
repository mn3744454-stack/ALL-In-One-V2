import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EmbryoTransfer {
  id: string;
  tenant_id: string;
  donor_mare_id: string;
  recipient_mare_id: string;
  donor_attempt_id: string | null;
  flush_date: string | null;
  transfer_date: string | null;
  embryo_grade: string | null;
  embryo_count: number;
  status: "planned" | "transferred" | "failed" | "completed";
  notes: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  donor_mare?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  recipient_mare?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreateEmbryoTransferData {
  donor_mare_id: string;
  recipient_mare_id: string;
  donor_attempt_id?: string | null;
  flush_date?: string | null;
  transfer_date?: string | null;
  embryo_grade?: string | null;
  embryo_count?: number;
  notes?: string | null;
  assigned_to?: string | null;
}

export interface EmbryoTransferFilters {
  donor_mare_id?: string;
  recipient_mare_id?: string;
  status?: string;
}

export function useEmbryoTransfers(filters?: EmbryoTransferFilters) {
  const [transfers, setTransfers] = useState<EmbryoTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTransfers = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setTransfers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("embryo_transfers")
        .select(`
          *,
          donor_mare:horses!embryo_transfers_donor_mare_id_fkey(id, name, name_ar, avatar_url),
          recipient_mare:horses!embryo_transfers_recipient_mare_id_fkey(id, name, name_ar, avatar_url),
          creator:profiles!embryo_transfers_created_by_fkey(id, full_name, avatar_url),
          assignee:profiles!embryo_transfers_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filters?.donor_mare_id) {
        query = query.eq("donor_mare_id", filters.donor_mare_id);
      }
      if (filters?.recipient_mare_id) {
        query = query.eq("recipient_mare_id", filters.recipient_mare_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransfers((data as unknown as EmbryoTransfer[]) || []);
    } catch (error) {
      console.error("Error fetching embryo transfers:", error);
      toast.error("Failed to load embryo transfers");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, filters?.donor_mare_id, filters?.recipient_mare_id, filters?.status]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const createTransfer = async (data: CreateEmbryoTransferData) => {
    if (!activeTenant?.tenant?.id || !user?.id) {
      toast.error("No active tenant or user");
      return null;
    }

    try {
      const { data: newTransfer, error } = await supabase
        .from("embryo_transfers")
        .insert({
          tenant_id: activeTenant.tenant.id,
          created_by: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Embryo transfer created");
      fetchTransfers();
      return newTransfer;
    } catch (error: any) {
      console.error("Error creating embryo transfer:", error);
      toast.error(error.message || "Failed to create embryo transfer");
      return null;
    }
  };

  const updateTransfer = async (id: string, updates: Partial<EmbryoTransfer>) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("embryo_transfers")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Embryo transfer updated");
      fetchTransfers();
      return true;
    } catch (error: any) {
      console.error("Error updating embryo transfer:", error);
      toast.error(error.message || "Failed to update embryo transfer");
      return false;
    }
  };

  const deleteTransfer = async (id: string) => {
    if (!activeTenant?.tenant?.id) {
      toast.error("No active tenant");
      return false;
    }

    try {
      const { error } = await supabase
        .from("embryo_transfers")
        .delete()
        .eq("id", id)
        .eq("tenant_id", activeTenant.tenant.id);

      if (error) throw error;
      toast.success("Embryo transfer deleted");
      fetchTransfers();
      return true;
    } catch (error: any) {
      console.error("Error deleting embryo transfer:", error);
      toast.error(error.message || "Failed to delete embryo transfer");
      return false;
    }
  };

  return {
    transfers,
    loading,
    canManage,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    refresh: fetchTransfers,
  };
}
