import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export type BoardingContractStatus =
  | "pending_stable"
  | "pending_owner"
  | "active"
  | "cancelled"
  | "ended";

export interface BoardingContract {
  id: string;
  stable_tenant_id: string;
  owner_tenant_id: string;
  horse_id: string;
  connection_id: string;
  client_id: string | null;
  plan_id: string | null;
  plan_snapshot: Record<string, unknown> | null;
  terms_metadata: Record<string, unknown> | null;
  status: BoardingContractStatus;
  start_date: string | null;
  end_date: string | null;
  owner_approved_at: string | null;
  stable_approved_at: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

const fromBoardingContracts = () =>
  // boarding_contracts is brand new and not in generated types yet
  (supabase as unknown as { from: (t: string) => any }).from("boarding_contracts");

export function useBoardingContracts(opts: { horseId?: string } = {}) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const qc = useQueryClient();
  const { t } = useI18n();

  const query = useQuery({
    queryKey: ["boarding-contracts", tenantId, opts.horseId ?? null],
    enabled: !!tenantId,
    queryFn: async (): Promise<BoardingContract[]> => {
      let q = fromBoardingContracts().select("*").order("created_at", { ascending: false });
      if (opts.horseId) q = q.eq("horse_id", opts.horseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BoardingContract[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["boarding-contracts"] });
  };

  const create = useMutation({
    mutationFn: async (params: {
      initiator_tenant_id: string;
      initiator_role: "stable" | "horse_owner";
      counterparty_tenant_id: string;
      horse_id: string;
      plan_id?: string | null;
      client_id?: string | null;
      terms_metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "create_boarding_contract_with_connection",
        {
          _initiator_tenant_id: params.initiator_tenant_id,
          _initiator_role: params.initiator_role,
          _counterparty_tenant_id: params.counterparty_tenant_id,
          _horse_id: params.horse_id,
          _plan_id: params.plan_id ?? null,
          _client_id: params.client_id ?? null,
          _terms_metadata: params.terms_metadata ?? {},
        },
      );
      if (error) throw error;
      return data as {
        contract_id: string;
        connection_id: string;
        status: BoardingContractStatus;
        reused: boolean;
      };
    },
    onSuccess: (res) => {
      invalidate();
      toast.success(
        res.reused
          ? t("boardingContracts.toasts.reused")
          : t("boardingContracts.toasts.created"),
      );
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const approveAsStable = useMutation({
    mutationFn: async (p: {
      contract_id: string;
      plan_id: string;
      terms_metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "approve_boarding_contract_as_stable",
        {
          _contract_id: p.contract_id,
          _plan_id: p.plan_id,
          _terms_metadata: p.terms_metadata ?? {},
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("boardingContracts.toasts.sentToOwner"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const approveAsOwner = useMutation({
    mutationFn: async (contract_id: string) => {
      const { data, error } = await (supabase as any).rpc(
        "approve_boarding_contract_as_owner",
        { _contract_id: contract_id },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("boardingContracts.toasts.activated"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const cancel = useMutation({
    mutationFn: async (p: { contract_id: string; reason?: string }) => {
      const { data, error } = await (supabase as any).rpc("cancel_boarding_contract", {
        _contract_id: p.contract_id,
        _reason: p.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("boardingContracts.toasts.cancelled"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const end = useMutation({
    mutationFn: async (contract_id: string) => {
      const { data, error } = await (supabase as any).rpc("end_boarding_contract", {
        _contract_id: contract_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("boardingContracts.toasts.ended"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    approveAsStable,
    approveAsOwner,
    cancel,
    end,
  };
}

export interface BoardingContractDisplayContext {
  contract_id: string;
  horse_name: string | null;
  horse_name_ar: string | null;
  owner_tenant_name: string | null;
  owner_tenant_name_ar: string | null;
  stable_tenant_name: string | null;
  stable_tenant_name_ar: string | null;
  plan_name: string | null;
  plan_name_ar: string | null;
  plan_base_price: number | null;
  plan_currency: string | null;
  plan_billing_cycle: string | null;
  status: BoardingContractStatus;
}

/**
 * Fetches human-readable display context for a set of boarding contracts.
 * Membership-gated server-side via SECURITY DEFINER RPC.
 */
export function useBoardingContractsDisplay(contractIds: string[]) {
  const ids = [...new Set(contractIds)].filter(Boolean).sort();
  const key = ids.join(",");

  const query = useQuery({
    queryKey: ["boarding-contracts-display", key],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Record<string, BoardingContractDisplayContext>> => {
      const { data, error } = await (supabase as any).rpc(
        "get_boarding_contract_display_context",
        { _contract_ids: ids },
      );
      if (error) throw error;
      const map: Record<string, BoardingContractDisplayContext> = {};
      for (const row of (data ?? []) as BoardingContractDisplayContext[]) {
        map[row.contract_id] = row;
      }
      return map;
    },
  });

  return {
    displayMap: query.data ?? {},
    isLoading: query.isLoading,
  };
}
