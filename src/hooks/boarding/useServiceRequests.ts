import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export type ServiceRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export type ServiceRequestType =
  | "extra_lab"
  | "extra_vet_visit"
  | "extra_supplement"
  | "feeding_change"
  | "package_change"
  | "movement"
  | "provider_preference"
  | "other";

export type ServiceRequestFulfillment =
  | "not_required"
  | "pending_fulfillment"
  | "fulfilled";

export type ServiceRequestBilling =
  | "owner_pays"
  | "included_in_package"
  | "stable_absorbs"
  | "deduct_from_prepaid"
  | null;

export interface ServiceRequest {
  id: string;
  boarding_contract_id: string;
  horse_id: string;
  initiator_tenant_id: string;
  target_tenant_id: string;
  direction: "owner_to_stable" | "stable_to_owner";
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  details: Record<string, unknown>;
  provider_tenant_id: string | null;
  external_provider_name: string | null;
  owner_supplied_item: boolean;
  cost_estimate: number | null;
  approved_cost: number | null;
  currency: string;
  billing_responsibility: ServiceRequestBilling;
  included_in_package: boolean;
  fulfillment_status: ServiceRequestFulfillment;
  fulfilled_by_lab_request_id: string | null;
  fulfilled_by_horse_order_id: string | null;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const fromServiceRequests = () =>
  (supabase as unknown as { from: (t: string) => any }).from("service_requests");

export function useServiceRequests(opts: { boardingContractId?: string } = {}) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const qc = useQueryClient();
  const { t } = useI18n();

  const query = useQuery({
    queryKey: ["service-requests", tenantId, opts.boardingContractId ?? null],
    enabled: !!tenantId,
    queryFn: async (): Promise<ServiceRequest[]> => {
      let q = fromServiceRequests()
        .select("*")
        .order("requested_at", { ascending: false });
      if (opts.boardingContractId) q = q.eq("boarding_contract_id", opts.boardingContractId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["service-requests"] });
  };

  const create = useMutation({
    mutationFn: async (p: {
      boarding_contract_id: string;
      request_type: ServiceRequestType;
      details?: Record<string, unknown>;
      provider_tenant_id?: string | null;
      external_provider_name?: string | null;
      owner_supplied_item?: boolean;
      cost_estimate?: number | null;
      currency?: string | null;
      billing_responsibility?: ServiceRequestBilling;
      included_in_package?: boolean;
    }) => {
      const { data, error } = await (supabase as any).rpc("create_service_request", {
        _boarding_contract_id: p.boarding_contract_id,
        _request_type: p.request_type,
        _details: p.details ?? {},
        _provider_tenant_id: p.provider_tenant_id ?? null,
        _external_provider_name: p.external_provider_name ?? null,
        _owner_supplied_item: p.owner_supplied_item ?? false,
        _cost_estimate: p.cost_estimate ?? null,
        _currency: p.currency ?? null,
        _billing_responsibility: p.billing_responsibility ?? null,
        _included_in_package: p.included_in_package ?? false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("serviceRequests.toasts.created"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const respond = useMutation({
    mutationFn: async (p: {
      service_request_id: string;
      decision: "approved" | "rejected";
      rejection_reason?: string | null;
      approved_cost?: number | null;
    }) => {
      const { data, error } = await (supabase as any).rpc("respond_to_service_request", {
        _service_request_id: p.service_request_id,
        _decision: p.decision,
        _rejection_reason: p.rejection_reason ?? null,
        _approved_cost: p.approved_cost ?? null,
        _metadata: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      toast.success(
        vars.decision === "approved"
          ? t("serviceRequests.toasts.approved")
          : t("serviceRequests.toasts.rejected"),
      );
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const cancel = useMutation({
    mutationFn: async (p: { service_request_id: string; reason?: string }) => {
      const { data, error } = await (supabase as any).rpc("cancel_service_request", {
        _service_request_id: p.service_request_id,
        _reason: p.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("serviceRequests.toasts.cancelled"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  const updateFulfillment = useMutation({
    mutationFn: async (p: {
      service_request_id: string;
      fulfillment_status: ServiceRequestFulfillment;
      fulfilled_by_lab_request_id?: string | null;
      fulfilled_by_horse_order_id?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "update_service_request_fulfillment",
        {
          _service_request_id: p.service_request_id,
          _fulfillment_status: p.fulfillment_status,
          _fulfilled_by_lab_request_id: p.fulfilled_by_lab_request_id ?? null,
          _fulfilled_by_horse_order_id: p.fulfilled_by_horse_order_id ?? null,
          _metadata: {},
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("serviceRequests.toasts.fulfillmentUpdated"));
    },
    onError: (e: any) => toast.error(e?.message || t("common.error")),
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    respond,
    cancel,
    updateFulfillment,
  };
}
