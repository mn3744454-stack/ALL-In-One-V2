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
 * All decisions live at the child request level. Submission-level decisions
 * are derived by a database trigger and must NOT be written directly.
 *
 * Submission-level macros (Accept All / Reject All) fan out to per-child
 * writes through these same primitives.
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

  return {
    acceptRequest: acceptMutation.mutateAsync,
    rejectRequest: rejectMutation.mutateAsync,
    markSpecimenReceived: specimenReceivedMutation.mutateAsync,
    acceptAllInSubmission: acceptAllInSubmissionMutation.mutateAsync,
    rejectAllInSubmission: rejectAllInSubmissionMutation.mutateAsync,
    isPending:
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      specimenReceivedMutation.isPending ||
      acceptAllInSubmissionMutation.isPending ||
      rejectAllInSubmissionMutation.isPending,
  };
}
