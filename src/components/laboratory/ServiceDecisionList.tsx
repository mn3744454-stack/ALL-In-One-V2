import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useLabIntake } from "@/hooks/laboratory/useLabIntake";
import { RejectionReasonDialog } from "./RejectionReasonDialog";
import type { LabRequestService, LabRequestServiceTemplate } from "@/hooks/laboratory/useLabRequests";

type Decision = "pending" | "accepted" | "rejected" | "partial";

interface ServiceDecisionListProps {
  requestId: string;
  services: LabRequestService[];
  /** Whether the parent intake panel allows decisions right now (e.g. not for already-rejected requests). */
  disabled?: boolean;
}

/**
 * Phase 5.2 / 5.2.2 — Nested service+template decision controls.
 *
 * - Atomic services (1 template): rendered as a simple row with one
 *   Accept/Reject pair. Behaviorally identical to pre-5.2.2.
 * - Composite services (>1 templates): expandable; the operator decides
 *   per template. Service-level pill becomes a derived display only
 *   (accepted | rejected | partial | pending) reflecting the trigger-driven
 *   roll-up. The "Accept all / Reject all" service-level macros remain as
 *   fan-out shortcuts that write to every child template.
 */
export function ServiceDecisionList({ requestId, services, disabled }: ServiceDecisionListProps) {
  const { t, lang } = useI18n();
  const {
    acceptService,
    rejectService,
    acceptTemplate,
    rejectTemplate,
    isPending,
  } = useLabIntake();

  const [rejectServiceFor, setRejectServiceFor] = useState<{ serviceId: string; name: string } | null>(null);
  const [rejectTemplateFor, setRejectTemplateFor] = useState<{
    serviceId: string;
    templateId: string;
    requestServiceTemplateId?: string;
    name: string;
  } | null>(null);

  // Compact summary: how many services are fully accepted overall.
  const acceptedCount = services.filter((s) => s.service_decision === "accepted").length;
  const rejectedCount = services.filter((s) => s.service_decision === "rejected").length;
  const partialCount = services.filter((s) => s.service_decision === "partial").length;
  const pendingCount = services.length - acceptedCount - rejectedCount - partialCount;

  if (services.length === 0) return null;

  const summaryLabel = (
    t("laboratory.intake.serviceSummary") || "{accepted} of {total} services accepted"
  )
    .replace("{accepted}", String(acceptedCount))
    .replace("{total}", String(services.length));

  return (
    <div className="mt-3 rounded-md border bg-background/50">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">
            {t("laboratory.intake.decidePerService") || "Decide per service"}:
          </span>
          <span>{summaryLabel}</span>
          {partialCount > 0 && (
            <Badge variant="outline" className="h-4 text-[10px] gap-1 border-amber-300 text-amber-700 dark:text-amber-300">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {partialCount} {t("laboratory.intake.partialShort") || "partial"}
            </Badge>
          )}
          {rejectedCount > 0 && (
            <Badge variant="outline" className="h-4 text-[10px] gap-1 border-destructive/40 text-destructive">
              <XCircle className="h-2.5 w-2.5" />
              {rejectedCount}
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline" className="h-4 text-[10px] gap-1">
              <Clock className="h-2.5 w-2.5" />
              {pendingCount}
            </Badge>
          )}
        </div>
      </div>

      <ul className="divide-y">
        {services.map((svc) => (
          <ServiceRow
            key={svc.service_id}
            requestId={requestId}
            service={svc}
            disabled={disabled}
            isPending={isPending}
            lang={lang}
            onAcceptService={() => acceptService({ requestId, serviceId: svc.service_id })}
            onRejectServicePrompt={(name) => setRejectServiceFor({ serviceId: svc.service_id, name })}
            onAcceptTemplate={(tpl) =>
              acceptTemplate({
                requestId,
                serviceId: svc.service_id,
                templateId: tpl.template_id,
              })
            }
            onRejectTemplatePrompt={(tpl, name) =>
              setRejectTemplateFor({
                serviceId: svc.service_id,
                templateId: tpl.template_id,
                name,
              })
            }
          />
        ))}
      </ul>

      <RejectionReasonDialog
        open={!!rejectServiceFor}
        onOpenChange={(o) => !o && setRejectServiceFor(null)}
        isPending={isPending}
        title={
          rejectServiceFor
            ? `${t("laboratory.intake.rejectService") || "Reject service"}: ${rejectServiceFor.name}`
            : undefined
        }
        description={
          t("laboratory.intake.rejectServiceDescription") ||
          "Provide a precise reason for rejecting this service. It will be visible to the requesting stable."
        }
        onConfirm={async (reason) => {
          if (!rejectServiceFor) return;
          await rejectService({ requestId, serviceId: rejectServiceFor.serviceId, reason });
          setRejectServiceFor(null);
        }}
      />

      <RejectionReasonDialog
        open={!!rejectTemplateFor}
        onOpenChange={(o) => !o && setRejectTemplateFor(null)}
        isPending={isPending}
        title={
          rejectTemplateFor
            ? `${t("laboratory.intake.rejectTemplate") || "Reject test"}: ${rejectTemplateFor.name}`
            : undefined
        }
        description={
          t("laboratory.intake.rejectTemplateDescription") ||
          "Provide a precise reason for rejecting this specific test. The requesting stable will see which test was refused and why."
        }
        onConfirm={async (reason) => {
          if (!rejectTemplateFor) return;
          await rejectTemplate({
            requestId,
            serviceId: rejectTemplateFor.serviceId,
            templateId: rejectTemplateFor.templateId,
            requestServiceTemplateId: rejectTemplateFor.requestServiceTemplateId,
            reason,
          });
          setRejectTemplateFor(null);
        }}
      />
    </div>
  );
}

interface ServiceRowProps {
  requestId: string;
  service: LabRequestService;
  disabled?: boolean;
  isPending: boolean;
  lang: string;
  onAcceptService: () => void;
  onRejectServicePrompt: (serviceName: string) => void;
  onAcceptTemplate: (tpl: LabRequestServiceTemplate) => void;
  onRejectTemplatePrompt: (tpl: LabRequestServiceTemplate, name: string) => void;
}

function ServiceRow({
  service,
  disabled,
  isPending,
  lang,
  onAcceptService,
  onRejectServicePrompt,
  onAcceptTemplate,
  onRejectTemplatePrompt,
}: ServiceRowProps) {
  const { t } = useI18n();
  const templates = useMemo(
    () =>
      [...(service.lab_request_service_templates || [])].sort(
        (a, b) => (a.sort_order_snapshot ?? 0) - (b.sort_order_snapshot ?? 0),
      ),
    [service.lab_request_service_templates],
  );
  const isComposite = templates.length > 1;
  const decision: Decision = (service.service_decision as Decision) || "pending";
  const isAtomicWithChildren = templates.length === 1;

  // Auto-expand composite services when their templates have diverged from a
  // uniform state — operators need to see what is partial without an extra click.
  const allSameTemplateDecision = useMemo(() => {
    if (templates.length === 0) return true;
    const first = templates[0]?.template_decision || "pending";
    return templates.every((tpl) => (tpl.template_decision || "pending") === first);
  }, [templates]);

  const [expanded, setExpanded] = useState(isComposite && !allSameTemplateDecision);

  useEffect(() => {
    if (isComposite && !allSameTemplateDecision) setExpanded(true);
  }, [isComposite, allSameTemplateDecision]);

  const serviceName =
    (lang === "ar" && (service.service_name_ar_snapshot || service.service?.name_ar)) ||
    service.service_name_snapshot ||
    service.service?.name ||
    service.service_code_snapshot ||
    service.service?.code ||
    "—";

  const acceptedTemplates = templates.filter((tpl) => tpl.template_decision === "accepted").length;
  const templateSummary = isComposite
    ? (t("laboratory.intake.templateSummary") || "{accepted} of {total} tests accepted")
        .replace("{accepted}", String(acceptedTemplates))
        .replace("{total}", String(templates.length))
    : null;

  return (
    <li className="px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => isComposite && setExpanded((v) => !v)}
          className={cn(
            "flex-1 min-w-0 text-start flex items-start gap-2",
            isComposite && "hover:opacity-80 cursor-pointer",
          )}
          aria-expanded={isComposite ? expanded : undefined}
        >
          {isComposite ? (
            expanded ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            )
          ) : (
            <span className="w-3.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium truncate">{serviceName}</span>
              <DecisionPill decision={decision} />
              {isComposite && (
                <Badge variant="outline" className="h-4 text-[10px] gap-1">
                  <FlaskConical className="h-2.5 w-2.5" />
                  {templates.length}
                </Badge>
              )}
            </div>
            {templateSummary && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{templateSummary}</p>
            )}
            {decision === "rejected" && service.service_rejection_reason && !isComposite && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                <span className="font-medium">
                  {t("laboratory.intake.rejectionReason") || "Reason"}:
                </span>{" "}
                {service.service_rejection_reason}
              </p>
            )}
          </div>
        </button>

        {/* Service-level macro buttons.
            Atomic services: act directly (single child row).
            Composite services: act as fan-out shortcuts (write to every template). */}
        {!disabled && (
          <div className="flex gap-1 shrink-0">
            {decision !== "accepted" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs"
                disabled={isPending}
                onClick={onAcceptService}
                title={
                  isComposite
                    ? (t("laboratory.intake.acceptAllTemplates") || "Accept all tests")
                    : undefined
                }
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {isComposite
                  ? (t("laboratory.intake.acceptAll") || "Accept all")
                  : (t("laboratory.intake.accept") || "Accept")}
              </Button>
            )}
            {decision !== "rejected" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs text-destructive hover:bg-destructive/10"
                disabled={isPending}
                onClick={() => onRejectServicePrompt(serviceName)}
                title={
                  isComposite
                    ? (t("laboratory.intake.rejectAllTemplates") || "Reject all tests")
                    : undefined
                }
              >
                <XCircle className="h-3 w-3" />
                {isComposite
                  ? (t("laboratory.intake.rejectAll") || "Reject all")
                  : (t("laboratory.intake.reject") || "Reject")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Composite expansion: per-template controls */}
      {isComposite && expanded && (
        <ul className="mt-2 ms-5 border-s ps-3 space-y-2">
          {templates.map((tpl) => (
            <TemplateRow
              key={tpl.template_id}
              template={tpl}
              lang={lang}
              disabled={disabled}
              isPending={isPending}
              onAccept={() => onAcceptTemplate(tpl)}
              onRejectPrompt={(name) => onRejectTemplatePrompt(tpl, name)}
            />
          ))}
        </ul>
      )}

      {/* Atomic-with-children debug-safe path: when a single child carries a
          rejection reason, surface it under the row (parity with old behavior). */}
      {isAtomicWithChildren && decision === "rejected" && service.service_rejection_reason && (
        <p className="text-[11px] text-muted-foreground mt-1 ms-5">
          <span className="font-medium">
            {t("laboratory.intake.rejectionReason") || "Reason"}:
          </span>{" "}
          {service.service_rejection_reason}
        </p>
      )}
    </li>
  );
}

function TemplateRow({
  template,
  lang,
  disabled,
  isPending,
  onAccept,
  onRejectPrompt,
}: {
  template: LabRequestServiceTemplate;
  lang: string;
  disabled?: boolean;
  isPending: boolean;
  onAccept: () => void;
  onRejectPrompt: (name: string) => void;
}) {
  const { t } = useI18n();
  const decision = (template.template_decision as "pending" | "accepted" | "rejected") || "pending";
  const name =
    (lang === "ar" && template.template_name_ar_snapshot) ||
    template.template_name_snapshot ||
    "—";
  const category = template.template_category_snapshot;
  const isRequired = template.is_required_snapshot;

  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium truncate">{name}</span>
          <DecisionPill decision={decision} />
          {category && (
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5 capitalize">
              {category}
            </Badge>
          )}
          {!isRequired && (
            <Badge variant="outline" className="h-4 text-[10px] px-1.5">
              {t("laboratory.intake.optionalTemplate") || "Optional"}
            </Badge>
          )}
        </div>
        {decision === "rejected" && template.template_rejection_reason && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <span className="font-medium">
              {t("laboratory.intake.rejectionReason") || "Reason"}:
            </span>{" "}
            {template.template_rejection_reason}
          </p>
        )}
      </div>

      {!disabled && (
        <div className="flex gap-1 shrink-0">
          {decision !== "accepted" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 gap-1 text-[11px]"
              disabled={isPending}
              onClick={onAccept}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {t("laboratory.intake.accept") || "Accept"}
            </Button>
          )}
          {decision !== "rejected" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 gap-1 text-[11px] text-destructive hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => onRejectPrompt(name)}
            >
              <XCircle className="h-3 w-3" />
              {t("laboratory.intake.reject") || "Reject"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function DecisionPill({ decision }: { decision: Decision }) {
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
  if (decision === "partial") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        {t("laboratory.intake.decision.partial") || "Partial"}
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
