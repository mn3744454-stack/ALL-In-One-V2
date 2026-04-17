import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Phase 5 — Laboratory intake decision mutations.
 *
 * Phase 5.2.2 — Template-level decision is now AUTHORITATIVE for composite
 * services. Service-level decision is derived by a DB trigger from per-template
 * decisions (`fn_recompute_service_decision`). Service-level macros therefore
 * fan out to children rather than writing service_decision directly.
 *
 * For atomic services (1 template), behavior is mathematically identical: the
 * one child row is updated and the trigger rolls up to the same service state.
 *
 * Submission-level decisions remain trigger-derived from request-level decisions.
 */
export function useLabIntake() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const { labMode } = useModuleAccess();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.labRequests(tenantId, labMode) });
    queryClient.invalidateQueries({ queryKey: ["lab-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["lab_submission_context"] });
  };

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_requests")
        .update({
          lab_decision: "accepted",
          rejection_reason: null,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.accepted") || "Request accepted");
    },
    onError: (err) => {
      console.error("acceptRequest", err);
      toast.error(t("laboratory.intake.toast.acceptFailed") || "Failed to accept request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_requests")
        .update({
          lab_decision: "rejected",
          rejection_reason: reason,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.rejected") || "Request rejected");
    },
    onError: (err) => {
      console.error("rejectRequest", err);
      toast.error(t("laboratory.intake.toast.rejectFailed") || "Failed to reject request");
    },
  });

  const specimenReceivedMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_requests")
        .update({
          specimen_received_at: new Date().toISOString(),
          specimen_received_by: user.id,
        } as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.specimenReceived") || "Specimen marked received");
    },
    onError: (err) => {
      console.error("markSpecimenReceived", err);
      toast.error(t("laboratory.intake.toast.specimenFailed") || "Failed to mark specimen received");
    },
  });

  /**
   * Submission-level convenience macro — fans out to children.
   * Never writes to lab_submissions.lab_decision directly (that column is
   * derived by trigger from child decisions).
   */
  const acceptAllInSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_requests")
        .update({
          lab_decision: "accepted",
          rejection_reason: null,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("submission_id", submissionId)
        .eq("lab_decision", "pending_review");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.acceptedAll") || "All pending horses accepted");
    },
    onError: (err) => {
      console.error("acceptAllInSubmission", err);
      toast.error(t("laboratory.intake.toast.acceptFailed") || "Failed to accept all");
    },
  });

  const rejectAllInSubmissionMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_requests")
        .update({
          lab_decision: "rejected",
          rejection_reason: reason,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("submission_id", submissionId)
        .eq("lab_decision", "pending_review");
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.rejectedAll") || "All pending horses rejected");
    },
    onError: (err) => {
      console.error("rejectAllInSubmission", err);
      toast.error(t("laboratory.intake.toast.rejectFailed") || "Failed to reject all");
    },
  });

  // Phase 5.2.2 — Template-level mutations (authoritative writes).
  // Service-level decision is then recomputed by the DB trigger
  // fn_recompute_service_decision; request and submission decisions cascade
  // through the existing chain.
  const acceptTemplateMutation = useMutation({
    mutationFn: async ({
      requestId: _requestId,
      serviceId: _serviceId,
      templateId,
      requestServiceTemplateId,
    }: {
      requestId: string;
      serviceId: string;
      templateId: string;
      requestServiceTemplateId?: string;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const patch = {
        template_decision: "accepted" as const,
        template_rejection_reason: null,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      };
      // Prefer the row id when available; otherwise (request_id, template_id) is unique.
      const q = requestServiceTemplateId
        ? supabase.from("lab_request_service_templates").update(patch as any).eq("id", requestServiceTemplateId)
        : supabase
            .from("lab_request_service_templates")
            .update(patch as any)
            .eq("lab_request_id", _requestId)
            .eq("template_id", templateId);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.templateAccepted") || "Template accepted");
    },
    onError: (err) => {
      console.error("acceptTemplate", err);
      toast.error(t("laboratory.intake.toast.templateAcceptFailed") || "Failed to accept template");
    },
  });

  const rejectTemplateMutation = useMutation({
    mutationFn: async ({
      requestId: _requestId,
      serviceId: _serviceId,
      templateId,
      requestServiceTemplateId,
      reason,
    }: {
      requestId: string;
      serviceId: string;
      templateId: string;
      requestServiceTemplateId?: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      const patch = {
        template_decision: "rejected" as const,
        template_rejection_reason: reason,
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      };
      const q = requestServiceTemplateId
        ? supabase.from("lab_request_service_templates").update(patch as any).eq("id", requestServiceTemplateId)
        : supabase
            .from("lab_request_service_templates")
            .update(patch as any)
            .eq("lab_request_id", _requestId)
            .eq("template_id", templateId);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.templateRejected") || "Template rejected");
    },
    onError: (err) => {
      console.error("rejectTemplate", err);
      toast.error(t("laboratory.intake.toast.templateRejectFailed") || "Failed to reject template");
    },
  });

  /**
   * Phase 5.2.2 — Service-level macros now fan out to all child templates.
   * For atomic services (1 child row) this is mathematically identical to the
   * previous direct service write. For composite services this preserves the
   * "service decision is derived" invariant.
   */
  const acceptServiceMutation = useMutation({
    mutationFn: async ({ requestId, serviceId }: { requestId: string; serviceId: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      // Phase 5.2.2 hotfix — require at least one row affected so atomic
      // template-less services no longer silently succeed when no child
      // decision row exists. The H1 migration + backfill guarantees one row
      // per service; if zero rows are affected, surface a real error.
      const { data, error } = await supabase
        .from("lab_request_service_templates")
        .update({
          template_decision: "accepted",
          template_rejection_reason: null,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("lab_request_id", requestId)
        .eq("service_id", serviceId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No decision rows were updated for this service");
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.serviceAccepted") || "Service accepted");
    },
    onError: (err) => {
      console.error("acceptService", err);
      toast.error(t("laboratory.intake.toast.serviceAcceptFailed") || "Failed to accept service");
    },
  });

  const rejectServiceMutation = useMutation({
    mutationFn: async ({
      requestId,
      serviceId,
      reason,
    }: { requestId: string; serviceId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("lab_request_service_templates")
        .update({
          template_decision: "rejected",
          template_rejection_reason: reason,
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        } as any)
        .eq("lab_request_id", requestId)
        .eq("service_id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("laboratory.intake.toast.serviceRejected") || "Service rejected");
    },
    onError: (err) => {
      console.error("rejectService", err);
      toast.error(t("laboratory.intake.toast.serviceRejectFailed") || "Failed to reject service");
    },
  });

  return {
    acceptRequest: acceptMutation.mutateAsync,
    rejectRequest: rejectMutation.mutateAsync,
    markSpecimenReceived: specimenReceivedMutation.mutateAsync,
    acceptAllInSubmission: acceptAllInSubmissionMutation.mutateAsync,
    rejectAllInSubmission: rejectAllInSubmissionMutation.mutateAsync,
    acceptService: acceptServiceMutation.mutateAsync,
    rejectService: rejectServiceMutation.mutateAsync,
    // Phase 5.2.2 — template-level authoritative mutations
    acceptTemplate: acceptTemplateMutation.mutateAsync,
    rejectTemplate: rejectTemplateMutation.mutateAsync,
    isPending:
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      specimenReceivedMutation.isPending ||
      acceptAllInSubmissionMutation.isPending ||
      rejectAllInSubmissionMutation.isPending ||
      acceptServiceMutation.isPending ||
      rejectServiceMutation.isPending ||
      acceptTemplateMutation.isPending ||
      rejectTemplateMutation.isPending,
  };
}
