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
import {
  Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText,
  Tag, Building2, MessageSquare, Receipt, FlaskConical,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusConfig: Record<LabRequest['status'], { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  sent: { icon: Send, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  processing: { icon: Loader2, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ready: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  received: { icon: FileText, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { icon: Clock, color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export function RequestStatusBadge({ status }: { status: LabRequest['status'] }) {
  const { t } = useI18n();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className={cn("h-3 w-3", status === 'processing' && "animate-spin")} />
      {t(`laboratory.requests.status.${status}`) || status}
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
  request,
  open,
  onOpenChange,
  defaultTab,
  canCreateInvoice,
  onGenerateInvoice,
  onCreateSample,
}: RequestDetailDialogProps) {
  const { t, dir } = useI18n();
  const { updateRequest } = useLabRequests();
  const { labMode } = useModuleAccess();
  const isLabFull = labMode === 'full';
  const [statusValue, setStatusValue] = useState(request.status);
  const [resultUrl, setResultUrl] = useState(request.result_url || '');
  const [isPublishing, setIsPublishing] = useState(false);

  const horseName = dir === 'rtl' && (request.horse_name_ar_snapshot || request.horse?.name_ar)
    ? (request.horse_name_ar_snapshot || request.horse?.name_ar)
    : (request.horse_name_snapshot || request.horse?.name || t('laboratory.samples.unknownHorse'));

  const services = request.lab_request_services || [];
  const isBillable = request.status === 'ready' || request.status === 'received';

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

  const handlePublishResult = async () => {
    if (!resultUrl.trim()) return;
    setIsPublishing(true);
    try {
      await updateRequest({
        id: request.id,
        result_url: resultUrl.trim(),
        status: 'ready',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0" dir={dir}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {horseName}
            <RequestStatusBadge status={request.status} />
          </DialogTitle>
          {isLabFull && (request.initiator_tenant_name_snapshot || request.initiator_tenant?.name) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {t('laboratory.requests.initiatorStable') || 'Requesting Stable'}: {request.initiator_tenant_name_snapshot || request.initiator_tenant?.name}
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
              {/* Lab Full Mode: Status Dropdown */}
              {isLabFull && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('laboratory.requests.updateStatus') || 'Update Status'}
                  </Label>
                  <Select value={statusValue} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('laboratory.requests.status.pending') || 'Pending'}</SelectItem>
                      <SelectItem value="sent">{t('laboratory.requests.status.sent') || 'Sent'}</SelectItem>
                      <SelectItem value="processing">{t('laboratory.requests.status.processing') || 'Processing'}</SelectItem>
                      <SelectItem value="ready">{t('laboratory.requests.status.ready') || 'Ready'}</SelectItem>
                      <SelectItem value="cancelled">{t('laboratory.requests.status.cancelled') || 'Cancelled'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Lab Full Mode: Result URL Publish */}
              {isLabFull && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('laboratory.requests.resultUrl') || 'Result URL'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={resultUrl}
                      onChange={(e) => setResultUrl(e.target.value)}
                      placeholder={t('laboratory.requests.resultUrlPlaceholder') || 'https://...'}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handlePublishResult}
                      disabled={!resultUrl.trim() || isPublishing}
                    >
                      {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : t('laboratory.requests.publishResult') || 'Publish'}
                    </Button>
                  </div>
                </div>
              )}

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
                  <p className="text-sm font-medium text-muted-foreground mb-1.5">
                    {t('laboratory.requests.selectedServices') || 'Selected Services'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map(s => (
                      <Badge key={s.service_id} variant="secondary" className="text-xs gap-1">
                        <Tag className="h-3 w-3" />
                        {dir === 'rtl' && s.service?.name_ar ? s.service.name_ar : s.service?.name || t('laboratory.requests.unknownService') || 'Unknown Service'}
                        {s.service?.code && <span className="font-mono opacity-70">({s.service.code})</span>}
                      </Badge>
                    ))}
                  </div>
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
                  {format(new Date(request.requested_at), 'PP')}
                </span>
                {request.priority && request.priority !== 'normal' && (
                  <Badge variant="outline" className="text-xs">{t(`common.${request.priority}`) || request.priority}</Badge>
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

              {/* Lab-only: Create Sample from Request */}
              {isLabFull && onCreateSample && ['pending', 'sent', 'processing'].includes(request.status) && (
                <div className="pt-2">
                  <Button size="sm" onClick={() => onCreateSample(request)} className="gap-2">
                    <FlaskConical className="h-4 w-4" />
                    {t('laboratory.requests.createSampleFromRequest')}
                  </Button>
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
            <LabRequestThread requestId={request.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
