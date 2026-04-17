import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useLabIntake } from "@/hooks/laboratory/useLabIntake";
import { RejectionReasonDialog } from "./RejectionReasonDialog";
import type { LabRequestService } from "@/hooks/laboratory/useLabRequests";

type ServiceDecision = "pending" | "accepted" | "rejected";

interface ServiceDecisionListProps {
  requestId: string;
  services: LabRequestService[];
  /** Whether the parent intake panel allows decisions right now (e.g. not for already-rejected requests). */
  disabled?: boolean;
}

/**
 * Phase 5.2 — Compact nested service-level decision controls.
 *
 * Renders inside RequestIntakePanel under the horse-level decision step
 * when the request has multiple services. For single-service requests the
 * parent should hide this list entirely (horse-level macro is sufficient).
 *
 * Behavior:
 *   - Collapsed by default when all services share the same decision.
 *   - Expands automatically on divergence; operator can also toggle.
 *   - Accept/Reject per service writes to lab_request_services and the
 *     DB trigger recomputes the parent request decision.
 */
export function ServiceDecisionList({ requestId, services, disabled }: ServiceDecisionListProps) {
  const { t, lang } = useI18n();
  const { acceptService, rejectService, isPending } = useLabIntake();
  const [rejectFor, setRejectFor] = useState<{ serviceId: string; name: string } | null>(null);

  const allSameDecision = useMemo(() => {
    if (services.length === 0) return true;
    const first = services[0]?.service_decision || "pending";
    return services.every((s) => (s.service_decision || "pending") === first);
  }, [services]);

  const [expanded, setExpanded] = useState(!allSameDecision);

  if (services.length === 0) return null;

  const acceptedCount = services.filter((s) => s.service_decision === "accepted").length;
  const rejectedCount = services.filter((s) => s.service_decision === "rejected").length;
  const pendingCount = services.length - acceptedCount - rejectedCount;

  const summaryLabel = (
    t("laboratory.intake.serviceSummary") || "{accepted} of {total} services accepted"
  )
    .replace("{accepted}", String(acceptedCount))
    .replace("{total}", String(services.length));

  const showRejected = rejectedCount > 0;
  const showPending = pendingCount > 0;

  return (
    <div className="mt-3 rounded-md border bg-background/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">
            {t("laboratory.intake.decidePerService") || "Decide per service"}:
          </span>
          <span>{summaryLabel}</span>
          {showRejected && (
            <Badge variant="outline" className="h-4 text-[10px] gap-1 border-destructive/40 text-destructive">
              <XCircle className="h-2.5 w-2.5" />
              {rejectedCount}
            </Badge>
          )}
          {showPending && (
            <Badge variant="outline" className="h-4 text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              {pendingCount}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <ul className="border-t divide-y">
          {services.map((svc) => {
            const decision: ServiceDecision = (svc.service_decision as ServiceDecision) || "pending";
            const name =
              (lang === "ar" && (svc.service_name_ar_snapshot || svc.service?.name_ar)) ||
              svc.service_name_snapshot ||
              svc.service?.name ||
              svc.service_code_snapshot ||
              svc.service?.code ||
              "—";

            return (
              <li key={svc.service_id} className="px-3 py-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{name}</span>
                    <ServiceDecisionPill decision={decision} />
                  </div>
                  {decision === "rejected" && svc.service_rejection_reason && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-medium">
                        {t("laboratory.intake.rejectionReason") || "Reason"}:
                      </span>{" "}
                      {svc.service_rejection_reason}
                    </p>
                  )}
                </div>

                {!disabled && (
                  <div className="flex gap-1 shrink-0">
                    {decision !== "accepted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1 text-xs"
                        disabled={isPending}
                        onClick={() => acceptService({ requestId, serviceId: svc.service_id })}
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {t("laboratory.intake.accept") || "Accept"}
                      </Button>
                    )}
                    {decision !== "rejected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "h-7 px-2 gap-1 text-xs text-destructive hover:bg-destructive/10",
                        )}
                        disabled={isPending}
                        onClick={() => setRejectFor({ serviceId: svc.service_id, name })}
                      >
                        <XCircle className="h-3 w-3" />
                        {t("laboratory.intake.reject") || "Reject"}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <RejectionReasonDialog
        open={!!rejectFor}
        onOpenChange={(o) => !o && setRejectFor(null)}
        isPending={isPending}
        title={
          rejectFor
            ? `${t("laboratory.intake.rejectService") || "Reject service"}: ${rejectFor.name}`
            : undefined
        }
        description={
          t("laboratory.intake.rejectServiceDescription") ||
          "Provide a precise reason for rejecting this service. It will be visible to the requesting stable."
        }
        onConfirm={async (reason) => {
          if (!rejectFor) return;
          await rejectService({ requestId, serviceId: rejectFor.serviceId, reason });
          setRejectFor(null);
        }}
      />
    </div>
  );
}

function ServiceDecisionPill({ decision }: { decision: ServiceDecision }) {
  const { t } = useI18n();
  if (decision === "accepted") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[10px] gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        {t("laboratory.intake.decision.accepted") || "Accepted"}
      </Badge>
    );
  }
  if (decision === "rejected") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/30"
      >
        <XCircle className="h-2.5 w-2.5" />
        {t("laboratory.intake.decision.rejected") || "Rejected"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 text-[10px] gap-1">
      <Clock className="h-2.5 w-2.5" />
      {t("laboratory.intake.decision.pending_review") || "Pending"}
    </Badge>
  );
}
