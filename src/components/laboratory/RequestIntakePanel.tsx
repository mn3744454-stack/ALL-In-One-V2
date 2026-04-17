import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n";
import { useLabIntake } from "@/hooks/laboratory/useLabIntake";
import { RejectionReasonDialog } from "./RejectionReasonDialog";
import {
  CheckCircle2,
  XCircle,
  PackageCheck,
  Clock,
  AlertCircle,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStandardDate } from "@/lib/displayHelpers";
import type { LabRequest, LabRequestService } from "@/hooks/laboratory/useLabRequests";
import { ServiceDecisionList } from "./ServiceDecisionList";

type LabDecision = "pending_review" | "accepted" | "rejected" | "partial";

export interface IntakeRequestLike extends LabRequest {
  lab_decision?: LabDecision;
  rejection_reason?: string | null;
  decided_at?: string | null;
  specimen_received_at?: string | null;
  lab_request_services?: LabRequestService[];
}

interface RequestIntakePanelProps {
  request: IntakeRequestLike;
}

/**
 * Phase 5 — Stepped intake panel that replaces the flat status dropdown.
 * Steps: Decision → Specimen Receipt → Processing/Publish stages remain elsewhere.
 */
export function RequestIntakePanel({ request }: RequestIntakePanelProps) {
  const { t } = useI18n();
  const { acceptRequest, rejectRequest, markSpecimenReceived, isPending } = useLabIntake();
  const [rejectOpen, setRejectOpen] = useState(false);

  const decision: LabDecision = (request.lab_decision as LabDecision) || "pending_review";
  const specimenReceived = !!request.specimen_received_at;
  const services = request.lab_request_services || [];
  const hasMultipleServices = services.length > 1;
  // Phase 5.2 — partial behaves like accepted for downstream sampling/specimen flow
  const isAcceptedOrPartial = decision === "accepted" || decision === "partial";

  // Phase 5.2.1 — Macro overwrite guard.
  // When the operator has already set explicit per-service decisions, a macro
  // Accept-all/Reject-all action would silently overwrite that intent. We
  // intercept the click and surface a confirmation prompt first.
  const [pendingMacro, setPendingMacro] = useState<null | "accept" | "reject">(null);

  const decidedServiceCount = services.filter(
    (s) => s.service_decision === "accepted" || s.service_decision === "rejected",
  ).length;
  const hasExplicitServiceDecisions = decidedServiceCount > 0;

  const handleMacroAccept = () => {
    if (hasMultipleServices && hasExplicitServiceDecisions) {
      setPendingMacro("accept");
      return;
    }
    void acceptRequest(request.id);
  };

  const handleMacroReject = () => {
    if (hasMultipleServices && hasExplicitServiceDecisions) {
      setPendingMacro("reject");
      return;
    }
    setRejectOpen(true);
  };

  const confirmPendingMacro = () => {
    const action = pendingMacro;
    setPendingMacro(null);
    if (action === "accept") {
      void acceptRequest(request.id);
    } else if (action === "reject") {
      // Keep the same precise-reason capture flow used everywhere else.
      setRejectOpen(true);
    }
  };

  const stepActive = (step: "decision" | "specimen") => {
    if (step === "decision") return decision === "pending_review";
    if (step === "specimen") return isAcceptedOrPartial && !specimenReceived;
    return false;
  };

  // Macro buttons are visually demoted (smaller, secondary outline) for
  // multi-service requests so per-service decisions become the primary surface.
  const macroSize = hasMultipleServices ? "sm" : "sm";
  const macroAcceptVariant = hasMultipleServices ? "outline" : "default";

  return (
    <Card className="overflow-hidden border">
      <div className="px-4 py-3 border-b bg-muted/40 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t("laboratory.intake.title") || "Intake"}
        </span>
      </div>

      {/* Step 1: Decision */}
      <div className={cn("px-4 py-3 border-b", stepActive("decision") && "bg-primary/5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground">1.</span>
              <span className="text-sm font-medium">
                {t("laboratory.intake.stepDecision") || "Review & decide"}
              </span>
              <DecisionBadge decision={decision} />
            </div>
            {decision === "rejected" && request.rejection_reason && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">
                  {t("laboratory.intake.rejectionReason") || "Reason"}:
                </span>{" "}
                {request.rejection_reason}
              </p>
            )}
            {request.decided_at && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {formatStandardDate(request.decided_at)}
              </p>
            )}
          </div>
          {/* Single-service requests keep the original prominent macro buttons. */}
          {decision === "pending_review" && !hasMultipleServices && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleMacroAccept}
                disabled={isPending}
                className="gap-1"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t("laboratory.intake.accept") || "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMacroReject}
                disabled={isPending}
                className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t("laboratory.intake.reject") || "Reject"}
              </Button>
            </div>
          )}
        </div>

        {/* Phase 5.2 — nested service-level decisions for multi-service requests */}
        {hasMultipleServices && decision !== "rejected" && (
          <>
            <ServiceDecisionList
              requestId={request.id}
              services={services}
              disabled={false}
            />

            {/* Phase 5.2.1 — demoted macro shortcuts placed BELOW the per-service list.
                Service-level decisions are the primary surface; macros remain available
                as small, clearly-labeled shortcuts. */}
            {decision === "pending_review" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {t("laboratory.intake.macroShortcutsHint")
                    || "Need to decide the whole request at once?"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={macroAcceptVariant}
                    onClick={handleMacroAccept}
                    disabled={isPending}
                    className="h-7 px-2 gap-1 text-xs"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    {t("laboratory.intake.acceptAllServices") || "Accept all"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMacroReject}
                    disabled={isPending}
                    className="h-7 px-2 gap-1 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    <XCircle className="h-3 w-3" />
                    {t("laboratory.intake.rejectAllServices") || "Reject all"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2: Specimen Receipt — only when accepted */}
      {decision !== "rejected" && (
        <div className={cn("px-4 py-3 border-b", stepActive("specimen") && "bg-primary/5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">2.</span>
                <span className="text-sm font-medium">
                  {t("laboratory.intake.stepSpecimen") || "Specimen receipt"}
                </span>
                {specimenReceived ? (
                  <Badge variant="outline" className="text-xs gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                    <PackageCheck className="h-3 w-3" />
                    {t("laboratory.intake.specimenReceived") || "Received"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    {t("laboratory.intake.awaitingSpecimen") || "Awaiting"}
                  </Badge>
                )}
              </div>
              {request.specimen_received_at && (
                <p className="text-[11px] text-muted-foreground">
                  {formatStandardDate(request.specimen_received_at)}
                </p>
              )}
            </div>
            {isAcceptedOrPartial && !specimenReceived && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markSpecimenReceived(request.id)}
                disabled={isPending}
                className="gap-1 shrink-0"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                {t("laboratory.intake.markSpecimenReceived") || "Mark received"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Processing readiness hint */}
      {decision === "accepted" && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">3.</span>
            <FlaskConical className="h-3.5 w-3.5" />
            {specimenReceived
              ? t("laboratory.intake.readyForSampling") || "Ready for sample creation."
              : t("laboratory.intake.waitingForSpecimen") || "Specimen must be marked received before sample creation."}
          </div>
        </div>
      )}

      <RejectionReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        isPending={isPending}
        onConfirm={async (reason) => {
          await rejectRequest({ requestId: request.id, reason });
          setRejectOpen(false);
        }}
      />
    </Card>
  );
}

function DecisionBadge({ decision }: { decision: LabDecision }) {
  const { t } = useI18n();
  if (decision === "accepted") {
    return (
      <Badge variant="outline" className="text-xs gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3" />
        {t("laboratory.intake.decision.accepted") || "Accepted"}
      </Badge>
    );
  }
  if (decision === "rejected") {
    return (
      <Badge variant="outline" className="text-xs gap-1 bg-destructive/10 text-destructive border-destructive/30">
        <XCircle className="h-3 w-3" />
        {t("laboratory.intake.decision.rejected") || "Rejected"}
      </Badge>
    );
  }
  if (decision === "partial") {
    return (
      <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
        <CheckCircle2 className="h-3 w-3" />
        {t("laboratory.intake.decision.partial") || "Partially accepted"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Clock className="h-3 w-3" />
      {t("laboratory.intake.decision.pending_review") || "Pending review"}
    </Badge>
  );
}
