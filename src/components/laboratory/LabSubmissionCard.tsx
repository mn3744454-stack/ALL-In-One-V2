import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, ChevronRight, Heart, Tag, FlaskConical, Clock, FileText, MessageSquare } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatStandardDate } from "@/lib/displayHelpers";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";
import { RequestStatusBadge } from "./RequestDetailDialog";
import type { LabSubmission } from "@/hooks/laboratory/useLabSubmissions";
import { deriveSubmissionStatus } from "@/hooks/laboratory/useLabSubmissions";
import type { LabRequest } from "@/hooks/laboratory/useLabRequests";

interface LabSubmissionCardProps {
  submission: LabSubmission;
  defaultOpen?: boolean;
  onOpenChildDetail: (request: LabRequest, tab?: string) => void;
  onCreateSample?: (request: LabRequest) => void;
}

export function LabSubmissionCard({ submission, defaultOpen = false, onOpenChildDetail, onCreateSample }: LabSubmissionCardProps) {
  const { t, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const aggregateStatus = useMemo(() => deriveSubmissionStatus(submission.children), [submission.children]);

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
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="flex items-center gap-3 w-full text-start p-4 hover:bg-muted/30 transition-colors">
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
            <Badge variant="outline" className={cn("text-xs", aggregateStatus.color)}>
              {t(`laboratory.submissions.status.${aggregateStatus.label}`) || aggregateStatus.label}
            </Badge>
            {isOpen
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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

            {/* Child horse requests */}
            <div className="divide-y">
              {submission.children.map((child) => (
                <ChildRequestRow
                  key={child.id}
                  request={child}
                  onOpenDetail={(tab) => onOpenChildDetail(child, tab)}
                  onCreateSample={onCreateSample ? () => onCreateSample(child) : undefined}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Compact child row for a horse-level request inside a submission card */
function ChildRequestRow({
  request,
  onOpenDetail,
  onCreateSample,
}: {
  request: LabRequest;
  onOpenDetail: (tab?: string) => void;
  onCreateSample?: () => void;
}) {
  const { t, dir } = useI18n();

  const horseName = request.horse_name_snapshot || request.horse?.name || null;
  const horseNameAr = request.horse_name_ar_snapshot || (request.horse as any)?.name_ar || null;
  const services = request.lab_request_services || [];

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
        <RequestStatusBadge status={request.status} />
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
