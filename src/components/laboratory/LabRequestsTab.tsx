import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabRequests, type LabRequest, type CreateLabRequestData } from "@/hooks/laboratory/useLabRequests";
import { useHorses } from "@/hooks/useHorses";
import { useConnections, useConnectionsWithDetails } from "@/hooks/connections";
import { AddPartnerDialog } from "@/components/connections";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { LabCatalogViewer } from "./LabCatalogViewer";
import { LabRequestThread } from "./LabRequestThread";
import { Plus, Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText, Search, MoreVertical, Receipt, FlaskConical, Tag, Link2, Building2, RefreshCw, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import { toast } from "sonner";

const statusConfig: Record<LabRequest['status'], { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  sent: { icon: Send, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  processing: { icon: Loader2, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ready: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  received: { icon: FileText, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { icon: Clock, color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

function RequestStatusBadge({ status }: { status: LabRequest['status'] }) {
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

interface LabOption {
  tenantId: string;
  name: string;
}

function CreateRequestDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const { horses } = useHorses();
  const { createRequest, isCreating } = useLabRequests();
  const { activeTenant } = useTenant();
  const { connections, refetch: refetchConnections } = useConnectionsWithDetails();

  const { createConnection } = useConnections();
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [pendingPartnerName, setPendingPartnerName] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derive available lab partners from accepted B2B connections, deduplicated by tenantId
  const labPartners = useMemo<LabOption[]>(() => {
    if (!activeTenant) return [];
    const myTenantId = activeTenant.tenant_id;
    const seen = new Map<string, LabOption>();
    connections
      .filter(c => c.connection_type === 'b2b' && c.status === 'accepted')
      .forEach(c => {
        const isInitiator = c.initiator_tenant_id === myTenantId;
        const partnerTenantId = isInitiator ? c.recipient_tenant_id : c.initiator_tenant_id;
        const partnerName = isInitiator ? c.recipient_tenant_name : c.initiator_tenant_name;
        const partnerType = (isInitiator ? c.recipient_tenant_type : c.initiator_tenant_type)?.toLowerCase();
        if (!partnerTenantId) return;
        if (partnerType !== 'laboratory' && partnerType !== 'lab') return;
        if (!seen.has(partnerTenantId)) {
          seen.set(partnerTenantId, { tenantId: partnerTenantId, name: partnerName || 'Lab' });
        }
      });
    return Array.from(seen.values());
  }, [connections, activeTenant]);

  // Check for pending lab partnership requests
  const pendingLabPartners = useMemo(() => {
    if (!activeTenant) return [];
    const myTenantId = activeTenant.tenant_id;
    const results: { name: string }[] = [];
    connections
      .filter(c => c.connection_type === 'b2b' && c.status === 'pending')
      .forEach(c => {
        const isInitiator = c.initiator_tenant_id === myTenantId;
        const partnerName = isInitiator ? c.recipient_tenant_name : c.initiator_tenant_name;
        const partnerType = (isInitiator ? c.recipient_tenant_type : c.initiator_tenant_type)?.toLowerCase();
        if (partnerType !== 'laboratory' && partnerType !== 'lab') return;
        results.push({ name: partnerName || 'Lab' });
      });
    return results;
  }, [connections, activeTenant]);

  const handleAddPartner = async (recipientTenantId: string) => {
    try {
      await createConnection.mutateAsync({
        connectionType: "b2b",
        recipientTenantId,
      });
      setAddPartnerOpen(false);
      // Show inline pending state instead of navigating away
      const matchedResult = connections.find(c => false); // We don't have the name yet from the dialog
      setPendingPartnerName(t('laboratory.requests.pendingPartnership') || 'Partnership request sent');
      toast.success(t('connections.requestSent') || 'Partnership request sent');
      // Refresh connections to pick up new pending request
      refetchConnections();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error(t('connections.duplicateRequest') || 'A partnership request already exists with this partner.');
      } else {
        toast.error(t('connections.requestFailed') || 'Failed to send partnership request');
      }
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await refetchConnections();
    setIsRefreshing(false);
    // If now we have accepted partners, clear pending state
    if (labPartners.length > 0) {
      setPendingPartnerName(null);
    }
  };
  
  const [formData, setFormData] = useState<CreateLabRequestData>({
    horse_id: '',
    test_description: '',
    external_lab_name: '',
    priority: 'normal',
    notes: '',
  });
  const [selectedLabTenantId, setSelectedLabTenantId] = useState<string | null>(null);
  const [selectedLabName, setSelectedLabName] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [labMode, setLabMode] = useState<'platform' | 'external'>('platform');

  const handleLabChange = (labTenantId: string) => {
    const lab = labPartners.find(l => l.tenantId === labTenantId);
    setSelectedLabTenantId(labTenantId);
    setSelectedLabName(lab?.name || '');
    setSelectedServiceIds([]);
    setSelectedServiceNames([]);
    setFormData(prev => ({ ...prev, external_lab_name: lab?.name || '' }));
  };

  // Compute whether form is valid for submission
  const isFormValid = useMemo(() => {
    if (!formData.horse_id) return false;
    if (labMode === 'platform') {
      if (!selectedLabTenantId) return false;
      // Either test_description is filled OR at least one service is selected
      return !!(formData.test_description.trim() || selectedServiceIds.length > 0);
    } else {
      return !!formData.test_description.trim();
    }
  }, [formData.horse_id, formData.test_description, labMode, selectedLabTenantId, selectedServiceIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Auto-generate test_description from selected service names if empty
    let finalDescription = formData.test_description.trim();
    if (!finalDescription && selectedServiceNames.length > 0) {
      finalDescription = selectedServiceNames.join(', ');
    }
    
    await createRequest({
      ...formData,
      test_description: finalDescription || formData.test_description,
      service_ids: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      initiator_tenant_id: activeTenant?.tenant_id,
      lab_tenant_id: selectedLabTenantId || undefined,
    });
    resetForm();
    setOpen(false);
    onSuccess?.();
  };

  const resetForm = () => {
    setFormData({ horse_id: '', test_description: '', external_lab_name: '', priority: 'normal', notes: '' });
    setSelectedLabTenantId(null);
    setSelectedLabName('');
    setSelectedServiceIds([]);
    setSelectedServiceNames([]);
    setLabMode('platform');
    setPendingPartnerName(null);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('laboratory.requests.create') || 'New Request'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('laboratory.requests.createTitle') || 'Create Lab Test Request'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4" id="create-request-form">
            {/* Horse Selection */}
            <div className="space-y-2">
              <Label>{t('laboratory.createSample.horse') || 'Horse'}</Label>
              <Select
                value={formData.horse_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, horse_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('laboratory.createSample.selectHorse') || 'Select horse'} />
                </SelectTrigger>
                <SelectContent>
                  {horses.map((horse) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {dir === 'rtl' && horse.name_ar ? horse.name_ar : horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lab Source Mode Toggle */}
            <div className="space-y-2">
              <Label>{t('laboratory.requests.labSource')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={labMode === 'platform' ? 'default' : 'outline'}
                  onClick={() => { setLabMode('platform'); setFormData(prev => ({ ...prev, external_lab_name: '' })); }}
                  className="flex-1"
                >
                  <FlaskConical className="h-4 w-4 me-1" />
                  {t('laboratory.requests.platformLab')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={labMode === 'external' ? 'default' : 'outline'}
                  onClick={() => { setLabMode('external'); setSelectedLabTenantId(null); setSelectedServiceIds([]); }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 me-1" />
                  {t('laboratory.requests.externalLab')}
                </Button>
              </div>
            </div>

            {/* Platform Lab Selection */}
            {labMode === 'platform' && (
              <div className="space-y-3">
                {labPartners.length > 0 ? (
                  <>
                    {/* Lab picker */}
                    <Select
                      value={selectedLabTenantId || ''}
                      onValueChange={handleLabChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('laboratory.requests.selectLab')} />
                      </SelectTrigger>
                      <SelectContent>
                        {labPartners.map((lab) => (
                          <SelectItem key={lab.tenantId} value={lab.tenantId}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Connect another lab - always visible */}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setAddPartnerOpen(true)}
                      className="gap-1 p-0 h-auto text-xs"
                    >
                      <Link2 className="h-3 w-3" />
                      {t('laboratory.requests.connectAnother') || 'Connect another lab'}
                    </Button>

                    {/* Pending banner alongside picker (not replacing it) */}
                    {pendingLabPartners.length > 0 && (
                      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-sm">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{pendingLabPartners.length} pending partnership{pendingLabPartners.length > 1 ? 's' : ''}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRefreshStatus}
                              disabled={isRefreshing}
                              className="h-6 px-2 text-xs ms-auto"
                            >
                              {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : t('common.refresh')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Catalog Viewer - scroll-constrained */}
                    <div className="max-h-[40vh] overflow-y-auto">
                      <LabCatalogViewer
                        labTenantId={selectedLabTenantId}
                        labName={selectedLabName}
                        selectable
                        selectedIds={selectedServiceIds}
                        onSelectServices={(ids, names) => {
                          setSelectedServiceIds(ids);
                          if (names) setSelectedServiceNames(names);
                        }}
                      />
                    </div>

                    {selectedServiceIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedServiceIds.length} {t('laboratory.requests.servicesSelected')}
                      </p>
                    )}
                  </>
                ) : pendingLabPartners.length > 0 || pendingPartnerName ? (
                  <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">
                          {t('laboratory.requests.pendingApproval') || 'Partnership request pending approval'}
                        </span>
                      </div>
                      {pendingLabPartners.map((p, i) => (
                        <p key={i} className="text-sm text-yellow-700 dark:text-yellow-300 ps-6">{p.name}</p>
                      ))}
                      <div className="flex gap-2 ps-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshStatus}
                          disabled={isRefreshing}
                          className="gap-1"
                        >
                          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          {t('common.refresh') || 'Refresh'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddPartnerOpen(true)}
                          className="gap-1"
                        >
                          <Link2 className="h-3 w-3" />
                          {t('laboratory.requests.connectAnother') || 'Connect another'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center space-y-3">
                      <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        {t('laboratory.requests.noLabPartners')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddPartnerOpen(true)}
                        className="gap-2"
                      >
                        <Link2 className="h-4 w-4" />
                        {t('laboratory.requests.connectToLab') || 'Connect to a Laboratory'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* External Lab Name */}
            {labMode === 'external' && (
              <div className="space-y-2">
                <Label>{t('laboratory.requests.externalLabName')}</Label>
                <Input
                  value={formData.external_lab_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, external_lab_name: e.target.value }))}
                  placeholder={t('laboratory.requests.externalLabPlaceholder')}
                />
              </div>
            )}

            {/* Test Description */}
            <div className="space-y-2">
              <Label>
                {t('laboratory.requests.testDescription') || 'Test Description'}
                {selectedServiceIds.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal ms-2">
                    ({t('laboratory.requests.autoFilledFromServices') || 'Auto-filled from selected services if left empty'})
                  </span>
                )}
              </Label>
              <Textarea
                value={formData.test_description}
                onChange={(e) => setFormData(prev => ({ ...prev, test_description: e.target.value }))}
                placeholder={t('laboratory.requests.testDescriptionPlaceholder') || 'Describe the tests needed...'}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>{t('laboratory.requests.priority') || 'Priority'}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('common.low') || 'Low'}</SelectItem>
                  <SelectItem value="normal">{t('common.normal') || 'Normal'}</SelectItem>
                  <SelectItem value="high">{t('common.high') || 'High'}</SelectItem>
                  <SelectItem value="urgent">{t('common.urgent') || 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('common.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('laboratory.requests.notesPlaceholder') || 'Additional notes...'}
              />
            </div>
          </form>
        </div>
        <DialogFooter className="pt-4 border-t gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            form="create-request-form"
            disabled={isCreating || !isFormValid}
          >
            {isCreating ? t('common.loading') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AddPartnerDialog
      open={addPartnerOpen}
      onOpenChange={setAddPartnerOpen}
      onSubmit={handleAddPartner}
      isLoading={createConnection.isPending}
      typeFilter={['laboratory', 'lab']}
    />
    </>
  );
}

// ─── Request Detail Dialog with Thread ────────────────────

function RequestDetailDialog({
  request,
  open,
  onOpenChange,
  defaultTab,
  canCreateInvoice,
  onGenerateInvoice,
}: {
  request: LabRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
  canCreateInvoice: boolean;
  onGenerateInvoice: () => void;
}) {
  const { t, dir } = useI18n();
  const { updateRequest } = useLabRequests();
  const { labMode } = useModuleAccess();
  const isLabFull = labMode === 'full';
  const [statusValue, setStatusValue] = useState(request.status);
  const [resultUrl, setResultUrl] = useState(request.result_url || '');
  const [isPublishing, setIsPublishing] = useState(false);

  const horseName = dir === 'rtl' && request.horse?.name_ar
    ? request.horse.name_ar
    : request.horse?.name || t('laboratory.samples.unknownHorse');

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
          {isLabFull && request.initiator_tenant?.name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {t('laboratory.requests.initiatorStable') || 'Requesting Stable'}: {request.initiator_tenant.name}
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

interface RequestCardProps {
  request: LabRequest;
  canCreateInvoice: boolean;
  onGenerateInvoice: () => void;
  onOpenDetail: () => void;
}

function RequestCard({ request, canCreateInvoice, onGenerateInvoice, onOpenDetail }: RequestCardProps) {
  const { t, dir } = useI18n();
  const { updateRequest } = useLabRequests();
  
  const horseName = dir === 'rtl' && request.horse?.name_ar 
    ? request.horse.name_ar 
    : request.horse?.name || t('laboratory.samples.unknownHorse');

  // Check if request is billable (ready or received status)
  const isBillable = request.status === 'ready' || request.status === 'received';

  const services = request.lab_request_services || [];

  const handleMarkReceived = async () => {
    await updateRequest({
      id: request.id,
      status: 'received',
      received_at: new Date().toISOString(),
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onOpenDetail}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base">{horseName}</CardTitle>
            <CardDescription className="line-clamp-2">
              {request.test_description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RequestStatusBadge status={request.status} />
            {isBillable && canCreateInvoice && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onGenerateInvoice(); }}
                    className="text-primary"
                  >
                    <Receipt className="h-4 w-4 me-2" />
                    {t("laboratory.billing.generateInvoice")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {request.external_lab_name && (
            <span className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {request.external_lab_name}
            </span>
          )}
          <span>
            {format(new Date(request.requested_at), 'PP')}
          </span>
        </div>

        {/* Selected Services */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {services.map(s => (
              <Badge key={s.service_id} variant="secondary" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                {dir === 'rtl' && s.service?.name_ar ? s.service.name_ar : s.service?.name || t('laboratory.requests.unknownService') || 'Unknown Service'}
                {s.service?.code && (
                  <span className="font-mono opacity-70">({s.service.code})</span>
                )}
              </Badge>
            ))}
          </div>
        )}
        
        {request.result_url && (
          <a 
            href={request.result_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="h-3 w-3" />
            {t('laboratory.requests.viewResult') || 'View Result'}
          </a>
        )}
        
        {/* Message indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {t('laboratory.requests.openThread') || 'Open thread'}
        </div>
      </CardContent>
    </Card>
  );
}

export function LabRequestsTab() {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { labMode } = useModuleAccess();
  const { requests, loading } = useLabRequests();
  const { connections, refetch: refetchConnections } = useConnectionsWithDetails();
  const { createConnection } = useConnections();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<LabRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDefaultTab, setDetailDefaultTab] = useState<string | undefined>();
  const [inboxOpen, setInboxOpen] = useState(true);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deep-link support: open request detail from URL params (requestId, openThread)
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    const openThread = searchParams.get('openThread');
    if (requestId && requests.length > 0) {
      const found = requests.find(r => r.id === requestId);
      if (found) {
        setDetailRequest(found);
        setDetailDefaultTab(openThread === 'true' ? 'thread' : 'details');
        setDetailOpen(true);
        // Clean up URL params after opening
        const next = new URLSearchParams(searchParams);
        next.delete('requestId');
        next.delete('openThread');
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, requests]);

  const handleOpenDetail = (request: LabRequest, tab?: string) => {
    setDetailRequest(request);
    setDetailDefaultTab(tab);
    setDetailOpen(true);
  };

  // Permission check for invoice creation
  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  // Derive lab partners for the inbox
  const labPartners = useMemo(() => {
    if (!activeTenant) return [];
    const myTenantId = activeTenant.tenant_id;
    const seen = new Map<string, { tenantId: string; name: string }>();
    connections
      .filter(c => c.connection_type === 'b2b' && c.status === 'accepted')
      .forEach(c => {
        const isInitiator = c.initiator_tenant_id === myTenantId;
        const partnerTenantId = isInitiator ? c.recipient_tenant_id : c.initiator_tenant_id;
        const partnerName = isInitiator ? c.recipient_tenant_name : c.initiator_tenant_name;
        const partnerType = (isInitiator ? c.recipient_tenant_type : c.initiator_tenant_type)?.toLowerCase();
        if (!partnerTenantId) return;
        if (partnerType !== 'laboratory' && partnerType !== 'lab') return;
        if (!seen.has(partnerTenantId)) {
          seen.set(partnerTenantId, { tenantId: partnerTenantId, name: partnerName || 'Lab' });
        }
      });
    return Array.from(seen.values());
  }, [connections, activeTenant]);

  const pendingLabPartners = useMemo(() => {
    if (!activeTenant) return [];
    const myTenantId = activeTenant.tenant_id;
    const results: { name: string; isSent: boolean }[] = [];
    connections
      .filter(c => c.connection_type === 'b2b' && c.status === 'pending')
      .forEach(c => {
        const isInitiator = c.initiator_tenant_id === myTenantId;
        const partnerName = isInitiator ? c.recipient_tenant_name : c.initiator_tenant_name;
        const partnerType = (isInitiator ? c.recipient_tenant_type : c.initiator_tenant_type)?.toLowerCase();
        if (partnerType !== 'laboratory' && partnerType !== 'lab') return;
        results.push({ name: partnerName || 'Lab', isSent: isInitiator });
      });
    return results;
  }, [connections, activeTenant]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchConnections();
    setIsRefreshing(false);
  }, [refetchConnections]);

  const handleAddPartner = async (recipientTenantId: string) => {
    try {
      await createConnection.mutateAsync({ connectionType: "b2b", recipientTenantId });
      setAddPartnerOpen(false);
      refetchConnections();
    } catch {
      // handled by toast in createConnection
    }
  };

  const isStableMode = labMode === 'requests';
  const isLabFull = labMode === 'full';

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchQuery || 
      req.test_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.horse?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleGenerateInvoice = (request: LabRequest) => {
    setSelectedRequest(request);
    setInvoiceDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {isLabFull
              ? (t('laboratory.requests.incomingTitle') || 'Incoming Requests')
              : (t('laboratory.requests.title') || 'Lab Test Requests')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isLabFull
              ? (t('laboratory.requests.incomingSubtitle') || 'Manage lab test requests from partner stables')
              : (t('laboratory.requests.subtitle') || 'Request and track lab tests from external laboratories')}
          </p>
        </div>
        {!isLabFull && <CreateRequestDialog />}
      </div>

      {/* Partnership Inbox - only for stable tenants */}
      {isStableMode && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <button
              type="button"
              className="flex items-center justify-between w-full text-start"
              onClick={() => setInboxOpen(!inboxOpen)}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {t('laboratory.requests.partnershipInbox') || 'Lab Partnerships'}
                </span>
                {(labPartners.length > 0 || pendingLabPartners.length > 0) && (
                  <Badge variant="secondary" className="text-xs">
                    {labPartners.length} {t('laboratory.requests.connected')}{pendingLabPartners.length > 0 ? ` · ${pendingLabPartners.length} ${t('laboratory.requests.pending')}` : ''}
                  </Badge>
                )}
              </div>
              {inboxOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {inboxOpen && (
              <div className="mt-4 space-y-3">
                {/* Connected Labs */}
                {labPartners.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('laboratory.requests.connectedLabs') || 'Connected Labs'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {labPartners.map(lab => (
                        <Badge key={lab.tenantId} variant="outline" className="gap-1.5 py-1">
                          <FlaskConical className="h-3 w-3" />
                          {lab.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Partnerships */}
                {pendingLabPartners.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('laboratory.requests.pendingPartnerships') || 'Pending'}
                    </p>
                    <div className="space-y-1.5">
                      {pendingLabPartners.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-yellow-600" />
                          <span>{p.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {p.isSent ? t('laboratory.requests.sent') : t('laboratory.requests.receivedLabel')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPartnerOpen(true)}
                    className="gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    {t('laboratory.requests.connectToLab') || 'Connect to a Laboratory'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-1"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                    {t('common.refresh') || 'Refresh'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AddPartnerDialog
        open={addPartnerOpen}
        onOpenChange={setAddPartnerOpen}
        onSubmit={handleAddPartner}
        isLoading={createConnection.isPending}
        typeFilter={['laboratory', 'lab']}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('laboratory.requests.searchPlaceholder') || 'Search requests...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('laboratory.samples.statusFilter') || 'Status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">{t('laboratory.requests.status.pending') || 'Pending'}</SelectItem>
            <SelectItem value="sent">{t('laboratory.requests.status.sent') || 'Sent'}</SelectItem>
            <SelectItem value="processing">{t('laboratory.requests.status.processing') || 'Processing'}</SelectItem>
            <SelectItem value="ready">{t('laboratory.requests.status.ready') || 'Ready'}</SelectItem>
            <SelectItem value="received">{t('laboratory.requests.status.received') || 'Received'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <Card className="py-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">
              {t('laboratory.requests.noRequests') || 'No lab requests yet'}
            </p>
            <p className="text-sm">
              {t('laboratory.requests.noRequestsDesc') || 'Create your first lab test request'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <RequestCard 
              key={request.id} 
              request={request} 
              canCreateInvoice={canCreateInvoice}
              onGenerateInvoice={() => handleGenerateInvoice(request)}
              onOpenDetail={() => handleOpenDetail(request)}
            />
          ))}
        </div>
      )}

      {/* Generate Invoice Dialog */}
      {selectedRequest && (
        <GenerateInvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          sourceType="lab_request"
          request={selectedRequest}
        />
      )}

      {/* Request Detail Dialog with Messaging Thread */}
      {detailRequest && (
        <RequestDetailDialog
          request={detailRequest}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setDetailRequest(null);
              setDetailDefaultTab(undefined);
            }
          }}
          defaultTab={detailDefaultTab}
          canCreateInvoice={canCreateInvoice}
          onGenerateInvoice={() => handleGenerateInvoice(detailRequest)}
        />
      )}
    </div>
  );
}
