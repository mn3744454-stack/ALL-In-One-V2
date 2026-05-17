import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tGlobal } from "@/i18n";
import type {
  ShareDisplayNameMode,
  ShareSourceHorseKind,
} from "./useLabResultShares";

export interface LabReportShare {
  id: string;
  tenant_id: string;
  sample_id: string;
  share_token: string;
  display_name_mode: ShareDisplayNameMode;
  alias_name_snapshot: string | null;
  source_horse_kind: ShareSourceHorseKind | null;
  source_horse_id: string | null;
  preferred_locale: "ar" | "en";
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  result_ids?: string[];
  creator?: { id: string; full_name: string | null } | null;
}

export interface CreateReportShareOptions {
  sampleId: string;
  resultIds: string[];
  displayNameMode?: ShareDisplayNameMode;
  aliasNameSnapshot?: string | null;
  sourceHorseKind?: ShareSourceHorseKind | null;
  sourceHorseId?: string | null;
  preferredLocale?: "ar" | "en";
  expiresAt?: string | null;
}

/**
 * L4-a-3c P4 — Report-level (multi-analysis) share hook.
 * Backed by `lab_report_shares` / `lab_report_share_results` and the
 * `create_lab_report_share` / `revoke_lab_report_share` / `get_shared_lab_report`
 * RPCs. Coexists with `useLabResultShares` for legacy single-result links.
 */
export function useLabReportShares(sampleId?: string) {
  const [shares, setShares] = useState<LabReportShare[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useTenant();
  const { user } = useAuth();

  const fetchShares = useCallback(async () => {
    if (!activeTenant?.tenant.id || !sampleId) {
      setShares([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      type RawRow = LabReportShare & {
        creator: { id: string; full_name: string | null } | null;
        children: { result_id: string; sort_order: number }[] | null;
      };
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (q: string) => {
            eq: (
              c: string,
              v: string
            ) => {
              eq: (
                c: string,
                v: string
              ) => {
                order: (
                  c: string,
                  o: { ascending: boolean }
                ) => Promise<{ data: RawRow[] | null; error: unknown }>;
              };
            };
          };
        };
      })
        .from("lab_report_shares")
        .select(
          `*,
           creator:profiles!lab_report_shares_created_by_fkey(id, full_name),
           children:lab_report_share_results(result_id, sort_order)`
        )
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("sample_id", sampleId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped: LabReportShare[] = (data || []).map((row) => ({
        ...row,
        result_ids: (row.children || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => c.result_id),
      }));
      setShares(mapped);
    } catch (err) {
      console.error("Error loading report shares:", err);
      toast.error(tGlobal("laboratory.toasts.failedToLoadShares"));
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, sampleId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const createShare = async (
    opts: CreateReportShareOptions
  ): Promise<LabReportShare | null> => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error(tGlobal("laboratory.toasts.noActiveOrganization"));
      return null;
    }
    if (!opts.resultIds.length) {
      toast.error(tGlobal("laboratory.reportShare.selectAtLeastOne"));
      return null;
    }
    const mode: ShareDisplayNameMode =
      opts.displayNameMode ?? "real";
    if (
      mode === "alias" &&
      (!opts.aliasNameSnapshot || !opts.aliasNameSnapshot.trim())
    ) {
      toast.error(tGlobal("laboratory.share.aliasRequired"));
      return null;
    }

    try {
      const { data, error } = await supabase.rpc(
        "create_lab_report_share",
        {
          _sample_id: opts.sampleId,
          _result_ids: opts.resultIds,
          _display_name_mode: mode,
          _alias_name_snapshot:
            mode === "alias" ? (opts.aliasNameSnapshot ?? "").trim() : null,
          _source_horse_kind: opts.sourceHorseKind ?? null,
          _source_horse_id: opts.sourceHorseId ?? null,
          _preferred_locale: opts.preferredLocale ?? "ar",
          _expires_at: opts.expiresAt ?? null,
        } as never
      );

      if (error) throw error;
      toast.success(tGlobal("laboratory.reportShare.linkCreated"));
      await fetchShares();
      return (data as unknown as LabReportShare) ?? null;
    } catch (err: unknown) {
      console.error("Error creating report share:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Only finalized")) {
        toast.error(tGlobal("laboratory.toasts.onlyFinalCanShare"));
      } else {
        toast.error(tGlobal("laboratory.reportShare.linkFailed"));
      }
      return null;
    }
  };

  const revokeShare = async (shareId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc("revoke_lab_report_share", {
        _report_share_id: shareId,
      } as never);
      if (error) throw error;
      toast.success(tGlobal("laboratory.share.linkRevoked" as never));
      await fetchShares();
      return true;
    } catch (err) {
      console.error("Error revoking report share:", err);
      toast.error(tGlobal("laboratory.toasts.failedToRevokeShare"));
      return false;
    }
  };

  const getShareUrl = (token: string) => `/shared/lab-report/${token}`;

  return {
    shares,
    loading,
    createShare,
    revokeShare,
    getShareUrl,
    refresh: fetchShares,
  };
}
