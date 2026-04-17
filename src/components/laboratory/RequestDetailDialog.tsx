import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabRequests, type LabRequest } from "@/hooks/laboratory/useLabRequests";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";
import { LabRequestThread } from "./LabRequestThread";
import { RequestIntakePanel } from "./RequestIntakePanel";
import { ResultsOwedPanel } from "./ResultsOwedPanel";
import { StableTemplateProgressList } from "./StableTemplateProgressList";
import { getEffectiveLabRequestStatus, getStableFacingLabStatus, type StableFacingLabStatus } from "@/lib/labStatus";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText,
  Tag, Building2, MessageSquare, Receipt, FlaskConical, XCircle, AlertCircle,
} from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusConfig: Record<StableFacingLabStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  sent: { icon: Send, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  processing: { icon: Loader2, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ready: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  received: { icon: FileText, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { icon: Clock, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  partially_accepted: { icon: AlertCircle, color: 'bg-amber-100 text-amber-800 border-amber-200' },
};

export function RequestStatusBadge({ status }: { status: StableFacingLabStatus }) {
  const { t } = useI18n();
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const label = status === 'partially_accepted'
    ? (t('laboratory.intake.partiallyAccepted') || 'Partially accepted')
    : (t(`laboratory.requests.status.${status}`) || status);

  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className={cn("h-3 w-3", status === 'processing' && "animate-spin")} />
      {label}
    </Badge>
  );
}

interface RequestDetailDialogProps {
  request: LabRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  canCreateInvoice: boolean;
  onGenerateInvoice: () => void;
  onCreateSample?: (request: LabRequest) => void;
}

export function RequestDetailDialog({
  request: requestProp,
  open,
  onOpenChange,
  defaultTab,
  canCreateInvoice,
  onGenerateInvoice,
  onCreateSample,
}: RequestDetailDialogProps) {
  const { t, dir } = useI18n();
  const { updateRequest, requests } = useLabRequests();
  const { labMode } = useModuleAccess();
  const isLabFull = labMode === 'full';

  // Phase 5.2.1 — Re-read the freshest request from the live query result by ID.
  // This ensures per-service decisions, the request-level badge, and the
  // "X of Y accepted" summary update inside the open dialog immediately after
  // mutations invalidate the labRequests query (no close/reopen required).
  const request = (requests.find(r => r.id === requestProp.id) as LabRequest | undefined) || requestProp;

  const [statusValue, setStatusValue] = useState(request.status);

  const horseName = dir === 'rtl' && (request.horse_name_ar_snapshot || request.horse?.name_ar)
    ? (request.horse_name_ar_snapshot || request.horse?.name_ar)
    : (request.horse_name_snapshot || request.horse?.name || t('laboratory.samples.unknownHorse'));

  const services = request.lab_request_services || [];
  const isBillable = request.status === 'ready' || request.status === 'received';

  // Check if a sample already exists for this request
  const { data: linkedSamples } = useQuery({
    queryKey: ['lab_samples_for_request', request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lab_samples')
        .select('id')
        .eq('lab_request_id', request.id)
        .limit(1);
      return data || [];
    },
    enabled: open && isLabFull,
  });
  const hasSample = (linkedSamples?.length ?? 0) > 0;
  // Phase 5 — gate Create Sample behind: accepted decision + specimen received
  const labDecision = (request.lab_decision as 'pending_review' | 'accepted' | 'rejected' | 'partial' | undefined) || 'pending_review';
  const specimenReceived = !!request.specimen_received_at;
  const intakeReady = labDecision === 'accepted' && specimenReceived;
  const canCreateSample = isLabFull && onCreateSample && !hasSample && intakeReady;

  const handleMarkReceived = async () => {
    await updateRequest({
      id: request.id,
      status: 'received',
      received_at: new Date().toISOString(),
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusValue(newStatus as LabRequest['status']);
    await updateRequest({
      id: request.id,
      status: newStatus as LabRequest['status'],
    });
  };

  // Phase 7 — handlePublishResult removed; result_url is no longer an authoritative path.

  // Fetch parent submission context if this request has a submission_id
  const submissionId = (request as any).submission_id as string | null;
  const { data: parentSubmission } = useQuery({
    queryKey: ['lab_submission_context', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data } = await supabase
        .from('lab_submissions')
        .select('id, initiator_tenant_name_snapshot, description, priority, notes, requested_at')
        .eq('id', submissionId)
        .single();
      return data;
    },
    enabled: open && !!submissionId && isLabFull,
  });

  const senderName = parentSubmission?.initiator_tenant_name_snapshot
    || request.initiator_tenant_name_snapshot
    || request.initiator_tenant?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0" dir={dir}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {horseName}
            <RequestStatusBadge status={isLabFull ? getEffectiveLabRequestStatus(request) : getStableFacingLabStatus(request)} />
          </DialogTitle>
          {isLabFull && senderName && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {t('laboratory.requests.initiatorStable') || 'Requesting Stable'}: {senderName}
            </p>
          )}
          {isLabFull && parentSubmission?.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {parentSubmission.description}
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue={defaultTab || "details"} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 w-auto">
            <TabsTrigger value="details" className="gap-1">
              <FileText className="w-3.5 h-3.5" />
              {t('common.details') || 'Details'}
            </TabsTrigger>
            <TabsTrigger value="thread" className="gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('laboratory.requests.messages') || 'Messages'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 mt-0">
            <div className="space-y-4 pt-4">
              {/* Lab Full Mode: Phase 5 stepped Intake Panel (replaces flat status dropdown) */}
              {isLabFull && (
                <RequestIntakePanel request={request} />
              )}

              {/* Lab Full Mode: Processing/Result publish controls — only after intake is ready */}
              {isLabFull && intakeReady && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('laboratory.requests.updateStatus') || 'Processing status'}
                  </Label>
                  <Select value={statusValue} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">{t('laboratory.requests.status.processing') || 'Processing'}</SelectItem>
                      <SelectItem value="ready">{t('laboratory.requests.status.ready') || 'Ready'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Phase 7 — Lab-side: Results Owed panel (template-authoritative workflow) */}
              {isLabFull && intakeReady && (
                <ResultsOwedPanel requestId={request.id} />
              )}

              {/* Phase 7 — Legacy result_url path is deprecated as authoritative.
                  Kept read-only for back-compat: if a legacy URL exists, surface it
                  as a reference link, but do not allow new edits. New publication
                  goes through structured lab_results via ResultsOwedPanel above. */}

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('laboratory.requests.testDescription') || 'Test Description'}
                </p>
                <p className="text-sm">{request.test_description}</p>
              </div>

              {/* Services */}
              {services.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('laboratory.requests.selectedServices') || 'Selected Services'}
                    </p>
                    {services.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {(t('laboratory.intake.serviceSummary') || '{accepted} of {total} services accepted')
                          .replace('{accepted}', String(services.filter(s => s.service_decision === 'accepted').length))
                          .replace('{total}', String(services.length))}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map(s => (
                      <Badge key={s.service_id} variant="secondary" className="text-xs gap-1">
                        <Tag className="h-3 w-3" />
                        {dir === 'rtl' && (s.service_name_ar_snapshot || s.service?.name_ar)
                          ? (s.service_name_ar_snapshot || s.service.name_ar)
                          : (s.service_name_snapshot || s.service?.name || t('laboratory.requests.unknownService') || 'Unknown Service')}
                        {(s.service_code_snapshot || s.service?.code) && <span className="font-mono opacity-70">({s.service_code_snapshot || s.service?.code})</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase 7 — Stable-side: per-template publish progress under accepted services */}
              {!isLabFull && labDecision !== 'rejected' && (
                <StableTemplateProgressList requestId={request.id} />
              )}

              {/* Stable-only: Service-level breakdown — visible when partial OR any service rejected/partial.
                  Phase 5.2.2: when a service is itself 'partial', expose the per-template breakdown
                  beneath it so the Stable user can see exactly which test inside the service was refused. */}
              {!isLabFull && services.length > 0 && (labDecision === 'partial' || services.some(s => s.service_decision === 'rejected' || s.service_decision === 'partial')) && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {t('laboratory.intake.serviceBreakdown') || 'Service breakdown'}
                  </p>
                  <ul className="space-y-2">
                    {services.map(s => {
                      const decision = s.service_decision || 'pending';
                      const name = dir === 'rtl' && (s.service_name_ar_snapshot || s.service?.name_ar)
                        ? (s.service_name_ar_snapshot || s.service.name_ar)
                        : (s.service_name_snapshot || s.service?.name || t('laboratory.requests.unknownService') || 'Unknown Service');
                      const pillClass =
                        decision === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                        decision === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                        decision === 'partial' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-muted text-muted-foreground border-border';
                      const label =
                        decision === 'accepted' ? (t('laboratory.intake.serviceStatusAccepted') || 'Accepted') :
                        decision === 'rejected' ? (t('laboratory.intake.serviceStatusRejected') || 'Rejected') :
                        decision === 'partial' ? (t('laboratory.intake.serviceStatusPartial') || 'Partially accepted') :
                        (t('laboratory.intake.serviceStatusPending') || 'Pending');

                      const templates = (s.lab_request_service_templates || [])
                        .slice()
                        .sort((a, b) => (a.sort_order_snapshot ?? 0) - (b.sort_order_snapshot ?? 0));
                      const showTemplates = decision === 'partial' && templates.length > 1;

                      return (
                        <li key={s.service_id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{name}</span>
                            <Badge variant="outline" className={cn("text-xs shrink-0", pillClass)}>{label}</Badge>
                          </div>
                          {decision === 'rejected' && s.service_rejection_reason && (
                            <p className="text-xs text-muted-foreground mt-0.5 ms-0">
                              <span className="font-medium">{t('laboratory.intake.serviceRejectionReasonLabel') || 'Reason'}:</span>{' '}
                              {s.service_rejection_reason}
                            </p>
                          )}
                          {showTemplates && (
                            <ul className="mt-1.5 ms-3 ps-3 border-s space-y-1">
                              {templates.map(tpl => {
                                const td = tpl.template_decision || 'pending';
                                const tplName = dir === 'rtl' && tpl.template_name_ar_snapshot
                                  ? tpl.template_name_ar_snapshot
                                  : (tpl.template_name_snapshot || '—');
                                const tplPillClass =
                                  td === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' :
                                  td === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                                  'bg-muted text-muted-foreground border-border';
                                const tplLabel =
                                  td === 'accepted' ? (t('laboratory.intake.serviceStatusAccepted') || 'Accepted') :
                                  td === 'rejected' ? (t('laboratory.intake.serviceStatusRejected') || 'Rejected') :
                                  (t('laboratory.intake.serviceStatusPending') || 'Pending');
                                return (
                                  <li key={tpl.template_id} className="text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate">{tplName}</span>
                                      <Badge variant="outline" className={cn("text-[10px] h-4 shrink-0", tplPillClass)}>{tplLabel}</Badge>
                                    </div>
                                    {td === 'rejected' && tpl.template_rejection_reason && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        <span className="font-medium">{t('laboratory.intake.rejectionReason') || 'Reason'}:</span>{' '}
                                        {tpl.template_rejection_reason}
                                      </p>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {request.external_lab_name && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {request.external_lab_name}
                  </span>
                )}
                <span>
                  {formatStandardDate(request.requested_at)}
                </span>
                {request.priority && request.priority !== 'normal' && (
                  <Badge variant="outline" className="text-xs">{t(`laboratory.requests.priorities.${request.priority}`) || request.priority}</Badge>
                )}
              </div>

              {/* Notes */}
              {request.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t('common.notes') || 'Notes'}</p>
                  <p className="text-sm">{request.notes}</p>
                </div>
              )}

              {/* Result link */}
              {request.result_url && (
                <a
                  href={request.result_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <FileText className="h-3 w-3" />
                  {t('laboratory.requests.viewResult') || 'View Result'}
                </a>
              )}

              {/* Lab-only: Create Sample from Request (hidden once sample exists) */}
              {canCreateSample && (
                <div className="pt-2">
                  <Button size="sm" onClick={() => onCreateSample!(request)} className="gap-2">
                    <FlaskConical className="h-4 w-4" />
                    {t('laboratory.requests.createSampleFromRequest')}
                  </Button>
                </div>
              )}
              {/* Lab-only: Sample already created indicator */}
              {isLabFull && hasSample && (
                <div className="pt-2">
                  <Badge variant="secondary" className="gap-1">
                    <FlaskConical className="h-3 w-3" />
                    {t('laboratory.requests.sampleCreated') || 'Sample created'}
                  </Badge>
                </div>
              )}

              {/* Stable-only: Lab decision reflection (read-only mapped status) */}
              {!isLabFull && labDecision === 'rejected' && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                    <XCircle className="h-4 w-4" />
                    {t('laboratory.intake.stableView.rejected') || 'Lab rejected this request'}
                  </div>
                  {request.rejection_reason && (
                    <p className="text-xs text-foreground/80">
                      <span className="font-medium">{t('laboratory.intake.rejectionReason') || 'Reason'}:</span>{' '}
                      {request.rejection_reason}
                    </p>
                  )}
                </div>
              )}
              {!isLabFull && labDecision === 'accepted' && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {request.specimen_received_at
                    ? (t('laboratory.intake.stableView.inProgress') || 'Lab is processing your request')
                    : (t('laboratory.intake.stableView.accepted') || 'Lab accepted your request — awaiting specimen')}
                </div>
              )}

              {/* Stable-only Actions */}
              {!isLabFull && (
                <div className="flex gap-2 pt-2">
                  {request.status === 'ready' && (
                    <Button size="sm" variant="outline" onClick={handleMarkReceived}>
                      <CheckCircle2 className="h-4 w-4 me-2" />
                      {t('laboratory.requests.markReceived') || 'Mark as Received'}
                    </Button>
                  )}
                  {isBillable && canCreateInvoice && (
                    <Button size="sm" variant="outline" onClick={onGenerateInvoice}>
                      <Receipt className="h-4 w-4 me-2" />
                      {t('laboratory.billing.generateInvoice') || 'Generate Invoice'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="thread" className="flex-1 min-h-0 mt-0">
            <LabRequestThread requestId={request.id} submissionId={(request as any).submission_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
