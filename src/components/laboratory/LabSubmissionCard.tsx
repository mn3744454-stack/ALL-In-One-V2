import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, ChevronRight, Heart, Tag, FlaskConical, Clock, FileText, MessageSquare, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatStandardDate } from "@/lib/displayHelpers";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";
import { RequestStatusBadge } from "./RequestDetailDialog";
import { RejectionReasonDialog } from "./RejectionReasonDialog";
import { useLabIntake } from "@/hooks/laboratory/useLabIntake";
import type { LabSubmission } from "@/hooks/laboratory/useLabSubmissions";
import { deriveSubmissionStatus } from "@/hooks/laboratory/useLabSubmissions";
import type { LabRequest } from "@/hooks/laboratory/useLabRequests";
import { getStableFacingLabStatus } from "@/lib/labStatus";
import { useLabSubmissionsSamplingProgress } from "@/hooks/laboratory/useLabSubmissionSamplingProgress";
import { SubmissionSamplingProgress } from "./SubmissionSamplingProgress";
import { useRequestResultProgress } from "@/hooks/laboratory/useRequestResultProgress";

interface LabSubmissionCardProps {
  submission: LabSubmission;
  defaultOpen?: boolean;
  onOpenChildDetail: (request: LabRequest, tab?: string) => void;
  onCreateSample?: (request: LabRequest) => void;
}

export function LabSubmissionCard({ submission, defaultOpen = false, onOpenChildDetail, onCreateSample }: LabSubmissionCardProps) {
  const { t, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const { acceptAllInSubmission, rejectAllInSubmission, isPending } = useLabIntake();

  const aggregateStatus = useMemo(() => deriveSubmissionStatus(submission.children), [submission.children]);

  // Phase 6A — sampling progress for this submission (single batched query)
  const submissionsForProgress = useMemo(
    () => [{ id: submission.id, children: submission.children }],
    [submission.id, submission.children]
  );
  const { progressMap, sampledRequestIds } = useLabSubmissionsSamplingProgress(submissionsForProgress);
  const samplingProgress = progressMap.get(submission.id);

  // Phase 5 — count children still pending review (used for Accept All / Reject All)
  const pendingCount = useMemo(
    () => submission.children.filter(c => (c.lab_decision || 'pending_review') === 'pending_review').length,
    [submission.children]
  );
  const submissionDecision = (submission.lab_decision as 'pending_review' | 'accepted' | 'rejected' | 'partial' | undefined) || 'pending_review';

  // Count unique services across all children
  const totalServices = useMemo(() => {
    const ids = new Set<string>();
    submission.children.forEach(c => {
      c.lab_request_services?.forEach(s => ids.add(s.service_id));
    });
    return ids.size;
  }, [submission.children]);

  const senderName = submission.initiator_tenant_name_snapshot || t('laboratory.submissions.unknownSender');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CollapsibleTrigger className="group flex items-center gap-3 w-full text-start p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer">
          {/* Sender icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>

          {/* Primary info */}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-base block truncate">{senderName}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {submission.children.length} {submission.children.length === 1
                  ? t('laboratory.submissions.horse')
                  : t('laboratory.submissions.horses')}
              </span>
              {totalServices > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {totalServices} {totalServices === 1
                    ? t('laboratory.submissions.service')
                    : t('laboratory.submissions.services')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatStandardDate(submission.requested_at)}
              </span>
            </div>
          </div>

          {/* Status + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {submission.priority && submission.priority !== 'normal' && (
              <Badge variant="outline" className="text-xs capitalize">
                {t(`laboratory.requests.priorities.${submission.priority}`) || submission.priority}
              </Badge>
            )}
            {samplingProgress && (
              <SubmissionSamplingProgress progress={samplingProgress} variant="badge" />
            )}
            <Badge variant="outline" className={cn("text-xs", aggregateStatus.color)}>
              {t(`laboratory.submissions.status.${aggregateStatus.label}`) || aggregateStatus.label}
            </Badge>
            {/* Phase 6B.1 — divergence chip surfaces hidden cancellations/rejections */}
            {aggregateStatus.divergence && aggregateStatus.divergence.rejected > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800">
                {aggregateStatus.divergence.rejected} {t('laboratory.submissions.status.rejected') || 'rejected'}
              </Badge>
            )}
            {aggregateStatus.divergence && aggregateStatus.divergence.cancelled > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                {aggregateStatus.divergence.cancelled} {t('laboratory.submissions.status.cancelled') || 'cancelled'}
              </Badge>
            )}
            {/* Phase 6B.1 — strengthened expand affordance */}
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors"
              aria-hidden="true"
            >
              {isOpen
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            {/* Submission-level notes/description */}
            {(submission.description || submission.notes) && (
              <div className="px-4 py-3 bg-muted/20 border-b space-y-1">
                {submission.description && (
                  <p className="text-sm text-foreground">{submission.description}</p>
                )}
                {submission.notes && (
                  <p className="text-xs text-muted-foreground">{submission.notes}</p>
                )}
              </div>
            )}

            {/* Phase 6A — submission-level sampling progress bar (only when meaningful) */}
            {samplingProgress && samplingProgress.acceptedHorses > 0 && (
              <div className="px-4 py-3 border-b">
                <SubmissionSamplingProgress progress={samplingProgress} variant="bar" />
              </div>
            )}

            {/* Phase 5 — Submission-level convenience macros (fan out to children) */}
            {pendingCount > 0 && (
              <div className="px-4 py-2.5 bg-primary/5 border-b flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {pendingCount} {t('laboratory.intake.pendingChildren') || 'pending review'}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptAllInSubmission(submission.id)}
                    disabled={isPending}
                    className="gap-1 h-7 text-xs"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    {t('laboratory.intake.acceptAll') || 'Accept all'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectAllOpen(true)}
                    disabled={isPending}
                    className="gap-1 h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    <XCircle className="h-3 w-3" />
                    {t('laboratory.intake.rejectAll') || 'Reject all'}
                  </Button>
                </div>
              </div>
            )}

            {/* Child horse requests */}
            <div className="divide-y">
              {submission.children.map((child) => (
                <ChildRequestRow
                  key={child.id}
                  request={child}
                  isSampled={sampledRequestIds.has(child.id)}
                  onOpenDetail={(tab) => onOpenChildDetail(child, tab)}
                  onCreateSample={onCreateSample ? () => onCreateSample(child) : undefined}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Card>

      <RejectionReasonDialog
        open={rejectAllOpen}
        onOpenChange={setRejectAllOpen}
        isPending={isPending}
        title={t('laboratory.intake.rejectAllTitle') || 'Reject all pending horses'}
        description={t('laboratory.intake.rejectAllDescription') || 'This rejection reason will be applied to all pending horses in this submission.'}
        onConfirm={async (reason) => {
          await rejectAllInSubmission({ submissionId: submission.id, reason });
          setRejectAllOpen(false);
        }}
      />
    </Collapsible>
  );
}

/** Compact child row for a horse-level request inside a submission card */
function ChildRequestRow({
  request,
  isSampled,
  onOpenDetail,
  onCreateSample,
}: {
  request: LabRequest;
  isSampled?: boolean;
  onOpenDetail: (tab?: string) => void;
  onCreateSample?: () => void;
}) {
  const { t, dir } = useI18n();

  const horseName = request.horse_name_snapshot || request.horse?.name || null;
  const horseNameAr = request.horse_name_ar_snapshot || (request.horse as any)?.name_ar || null;
  const services = request.lab_request_services || [];
  const decision = request.lab_decision || 'pending_review';
  const showSamplingTag = decision === 'accepted';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => onOpenDetail()}
    >
      {/* Horse icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 shrink-0">
        <Heart className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Horse name + tests */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block truncate">
          <BilingualName name={horseName} nameAr={horseNameAr} />
        </span>
        {request.test_description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{request.test_description}</p>
        )}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {services.slice(0, 3).map(s => (
              <Badge key={s.service_id} variant="secondary" className="text-[10px] py-0 px-1.5">
                {dir === 'rtl' && (s.service_name_ar_snapshot || s.service?.name_ar)
                  ? (s.service_name_ar_snapshot || s.service?.name_ar)
                  : (s.service_name_snapshot || s.service?.name || '?')}
              </Badge>
            ))}
            {services.length > 3 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                +{services.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {showSamplingTag && (
          isSampled ? (
            <Badge
              variant="outline"
              className="text-[10px] h-5 gap-1 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="h-3 w-3" />
              {t('laboratory.samplingProgress.sampled') || 'Sampled'}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] h-5 gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            >
              <FlaskConical className="h-3 w-3" />
              {t('laboratory.samplingProgress.awaitingSample') || 'Awaiting sample'}
            </Badge>
          )
        )}
        {/* Phase 6A.1 — Suppress legacy status badge when the Phase 6A sampling
            tag already conveys the more precise truth and the legacy badge
            would only echo an ambiguous "sent"/awaiting-sample signal. */}
        {(() => {
          const effective = getStableFacingLabStatus(request);
          if (showSamplingTag && effective === 'sent') return null;
          return <RequestStatusBadge status={effective} />;
        })()}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onOpenDetail('thread'); }}
          title={t('laboratory.requests.openThread') || 'Messages'}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
