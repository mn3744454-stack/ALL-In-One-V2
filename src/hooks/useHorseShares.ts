import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { toast } from "@/hooks/use-toast";

export interface HorseSharePack {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  description: string | null;
  scope: {
    includeVet?: boolean;
    includeLab?: boolean;
    includeFiles?: boolean;
  };
  is_system: boolean;
  created_at: string;
}

export interface HorseShare {
  id: string;
  tenant_id: string;
  horse_id: string;
  pack_id: string | null;
  token: string;
  recipient_email: string | null;
  scope: {
    includeVet?: boolean;
    includeLab?: boolean;
    includeFiles?: boolean;
  };
  date_from: string | null;
  date_to: string | null;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
  pack?: HorseSharePack;
}

export interface CreateShareOptions {
  packKey?: string;
  recipientEmail?: string;
  dateFrom?: string;
  dateTo?: string;
  expiresAt?: string;
  customScope?: {
    includeVet?: boolean;
    includeLab?: boolean;
    includeFiles?: boolean;
  };
}

export interface HorseShareViewData {
  success: boolean;
  error?: string;
  share?: {
    id: string;
    date_from: string | null;
    date_to: string | null;
    expires_at: string | null;
    scope: {
      includeVet?: boolean;
      includeLab?: boolean;
      includeFiles?: boolean;
    };
  };
  data?: {
    horse: {
      id: string;
      name: string;
      name_ar: string | null;
      gender: string;
      birth_date: string | null;
      avatar_url: string | null;
      status: string | null;
      tenant_name: string | null;
    };
    vet_treatments: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      priority: string;
      requested_at: string | null;
      created_at: string;
      notes: string | null;
      source_tenant: string | null;
    }>;
    lab_results: Array<{
      id: string;
      status: string;
      result_data: unknown;
      flags: string | null;
      created_at: string;
      template_name: string | null;
      source_tenant: string | null;
    }>;
    files: Array<{
      id: string;
      filename: string;
      mime_type: string;
      bucket: string;
      path: string;
      created_at: string;
    }>;
  };
}

export function useHorseShares(horseId?: string) {
  const [shares, setShares] = useState<HorseShare[]>([]);
  const [packs, setPacks] = useState<HorseSharePack[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchPacks = useCallback(async () => {
    if (!activeTenant?.tenant.id) return;

    try {
      const { data, error } = await supabase
        .from("horse_share_packs")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPacks((data as HorseSharePack[]) || []);
    } catch (error) {
      console.error("Error fetching share packs:", error);
    }
  }, [activeTenant?.tenant.id]);

  const fetchShares = useCallback(async () => {
    if (!activeTenant?.tenant.id || !horseId) {
      setShares([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horse_shares")
        .select(`
          *,
          pack:horse_share_packs(id, key, name, scope)
        `)
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("horse_id", horseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShares((data as HorseShare[]) || []);
    } catch (error) {
      console.error("Error fetching horse shares:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, horseId]);

  const createShare = async (opts: CreateShareOptions): Promise<{ token: string; shareId: string } | null> => {
    if (!horseId || !user?.id) {
      toast({
        title: t("common.error"),
        description: t("horseShare.errors.noHorseSelected"),
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase.rpc("create_horse_share", {
        _horse_id: horseId,
        _pack_key: opts.packKey || "custom",
        _recipient_email: opts.recipientEmail || null,
        _date_from: opts.dateFrom || null,
        _date_to: opts.dateTo || null,
        _expires_at: opts.expiresAt || null,
        _custom_scope: opts.customScope || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; token?: string; share_id?: string };

      if (!result.success) {
        toast({
          title: t("common.error"),
          description: t(`horseShare.errors.${result.error}`) || result.error,
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: t("common.success"),
        description: t("horseShare.toasts.shareCreated"),
      });

      fetchShares();
      return { token: result.token!, shareId: result.share_id! };
    } catch (error) {
      console.error("Error creating share:", error);
      toast({
        title: t("common.error"),
        description: t("horseShare.toasts.failedToCreate"),
        variant: "destructive",
      });
      return null;
    }
  };

  const revokeShare = async (shareId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("revoke_horse_share", {
        _share_id: shareId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast({
          title: t("common.error"),
          description: t(`horseShare.errors.${result.error}`) || result.error,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: t("common.success"),
        description: t("horseShare.toasts.shareRevoked"),
      });

      fetchShares();
      return true;
    } catch (error) {
      console.error("Error revoking share:", error);
      toast({
        title: t("common.error"),
        description: t("horseShare.toasts.failedToRevoke"),
        variant: "destructive",
      });
      return false;
    }
  };

  const getShareUrl = (token: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/horse/${token}`;
  };

  const activeShares = shares.filter((s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at) > new Date()));
  const expiredOrRevokedShares = shares.filter(
    (s) => s.status === "revoked" || (s.expires_at && new Date(s.expires_at) <= new Date())
  );

  return {
    shares,
    packs,
    loading,
    canManage,
    activeShares,
    expiredOrRevokedShares,
    fetchShares,
    fetchPacks,
    createShare,
    revokeShare,
    getShareUrl,
  };
}

// Standalone function to fetch share view (for public page)
export async function fetchHorseShareView(token: string): Promise<HorseShareViewData> {
  try {
    const { data, error } = await supabase.rpc("get_horse_share_view", {
      _token: token,
    });

    if (error) throw error;

    return data as unknown as HorseShareViewData;
  } catch (error) {
    console.error("Error fetching horse share view:", error);
    return { success: false, error: "fetch_failed" };
  }
}
