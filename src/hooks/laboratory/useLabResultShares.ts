import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LabResultShare {
  id: string;
  tenant_id: string;
  result_id: string;
  share_token: string;
  use_alias: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  creator?: { id: string; full_name: string | null };
}

export interface CreateShareOptions {
  useAlias?: boolean;
  expiresAt?: string | null;
}

export function useLabResultShares(resultId?: string) {
  const [shares, setShares] = useState<LabResultShare[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchShares = useCallback(async (params?: { resultId?: string }) => {
    const filterResultId = params?.resultId || resultId;
    
    if (!activeTenant?.tenant.id) {
      setShares([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("lab_result_shares")
        .select(`
          *,
          creator:profiles!lab_result_shares_created_by_fkey(id, full_name)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (filterResultId) {
        query = query.eq("result_id", filterResultId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setShares((data || []) as LabResultShare[]);
    } catch (error) {
      console.error("Error fetching lab result shares:", error);
      toast.error("Failed to load shares");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, resultId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const createShare = async (
    targetResultId: string,
    opts?: CreateShareOptions & { resultStatus?: string }
  ): Promise<LabResultShare | null> => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    // UX guard: Check result status before attempting insert
    if (opts?.resultStatus && opts.resultStatus !== "final") {
      toast.error("Only final results can be shared");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lab_result_shares")
        .insert({
          tenant_id: activeTenant.tenant.id,
          result_id: targetResultId,
          created_by: user.id,
          use_alias: opts?.useAlias ?? false,
          expires_at: opts?.expiresAt ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Share link created");
      fetchShares();
      return data as LabResultShare;
    } catch (error: unknown) {
      console.error("Error creating share:", error);
      
      // Handle DB trigger error for non-final results
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("Only finalized results can be shared")) {
        toast.error("Only final results can be shared");
      } else {
        toast.error(errorMessage || "Failed to create share link");
      }
      return null;
    }
  };

  const revokeShare = async (shareId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("lab_result_shares")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", shareId);

      if (error) throw error;

      toast.success("Share link revoked");
      fetchShares();
      return true;
    } catch (error: unknown) {
      console.error("Error revoking share:", error);
      const message = error instanceof Error ? error.message : "Failed to revoke share link";
      toast.error(message);
      return false;
    }
  };

  const getShareUrl = (token: string): string => {
    return `/shared/lab-result/${token}`;
  };

  return {
    shares,
    loading,
    canManage,
    createShare,
    revokeShare,
    listShares: fetchShares,
    getShareUrl,
    refresh: fetchShares,
  };
}
