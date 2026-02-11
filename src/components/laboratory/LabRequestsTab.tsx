import { useState, useMemo } from "react";
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
import { useLabRequests, type LabRequest, type CreateLabRequestData } from "@/hooks/laboratory/useLabRequests";
import { useHorses } from "@/hooks/useHorses";
import { useConnections, useConnectionsWithDetails } from "@/hooks/connections";
import { AddPartnerDialog } from "@/components/connections";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { LabCatalogViewer } from "./LabCatalogViewer";
import { Plus, Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText, Search, MoreVertical, Receipt, FlaskConical, Tag, Link2 } from "lucide-react";
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
  const { connections } = useConnectionsWithDetails();

  const { createConnection } = useConnections();
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);

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

  const handleAddPartner = async (recipientTenantId: string) => {
    try {
      await createConnection.mutateAsync({
        connectionType: "b2b",
        recipientTenantId,
      });
      setAddPartnerOpen(false);
      toast.success(t('connections.requestSent') || 'Partnership request sent');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error(t('connections.duplicateRequest') || 'A partnership request already exists with this partner.');
      } else {
        toast.error(t('connections.requestFailed') || 'Failed to send partnership request');
      }
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
  const [labMode, setLabMode] = useState<'platform' | 'external'>('platform');

  const handleLabChange = (labTenantId: string) => {
    const lab = labPartners.find(l => l.tenantId === labTenantId);
    setSelectedLabTenantId(labTenantId);
    setSelectedLabName(lab?.name || '');
    setSelectedServiceIds([]);
    setFormData(prev => ({ ...prev, external_lab_name: lab?.name || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.horse_id || !formData.test_description) return;
    
    await createRequest({
      ...formData,
      service_ids: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      initiator_tenant_id: activeTenant?.tenant_id,
      lab_tenant_id: selectedLabTenantId || undefined,
    });
    // Reset form
    setFormData({ horse_id: '', test_description: '', external_lab_name: '', priority: 'normal', notes: '' });
    setSelectedLabTenantId(null);
    setSelectedLabName('');
    setSelectedServiceIds([]);
    setLabMode('platform');
    setOpen(false);
    onSuccess?.();
  };

  const resetForm = () => {
    setFormData({ horse_id: '', test_description: '', external_lab_name: '', priority: 'normal', notes: '' });
    setSelectedLabTenantId(null);
    setSelectedLabName('');
    setSelectedServiceIds([]);
    setLabMode('platform');
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('laboratory.requests.createTitle') || 'Create Lab Test Request'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
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
            {labPartners.length === 0 ? (
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
                ) : (
                  <>
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

                    {/* Catalog Viewer */}
                    <LabCatalogViewer
                      labTenantId={selectedLabTenantId}
                      labName={selectedLabName}
                      selectable
                      selectedIds={selectedServiceIds}
                      onSelectServices={setSelectedServiceIds}
                    />

                    {selectedServiceIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedServiceIds.length} {t('laboratory.requests.servicesSelected')}
                      </p>
                    )}
                  </>
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
              <Label>{t('laboratory.requests.testDescription') || 'Test Description'}</Label>
              <Textarea
                value={formData.test_description}
                onChange={(e) => setFormData(prev => ({ ...prev, test_description: e.target.value }))}
                placeholder={t('laboratory.requests.testDescriptionPlaceholder') || 'Describe the tests needed...'}
                required
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
        </ScrollArea>
        <DialogFooter className="pt-4 border-t gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            form="create-request-form"
            disabled={isCreating || !formData.horse_id || !formData.test_description}
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
    />
    </>
  );
}

interface RequestCardProps {
  request: LabRequest;
  canCreateInvoice: boolean;
  onGenerateInvoice: () => void;
}

function RequestCard({ request, canCreateInvoice, onGenerateInvoice }: RequestCardProps) {
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
    <Card className="hover:shadow-md transition-shadow">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={onGenerateInvoice}
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
            {format(new Date(request.requested_at), 'MMM dd, yyyy')}
          </span>
        </div>

        {/* Selected Services */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {services.map(s => (
              <Badge key={s.service_id} variant="secondary" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                {dir === 'rtl' && s.service?.name_ar ? s.service.name_ar : s.service?.name || s.service_id}
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
          >
            <FileText className="h-3 w-3" />
            {t('laboratory.requests.viewResult') || 'View Result'}
          </a>
        )}
        
        {request.status === 'ready' && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={handleMarkReceived}
          >
            <CheckCircle2 className="h-4 w-4 me-2" />
            {t('laboratory.requests.markReceived') || 'Mark as Received'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function LabRequestsTab() {
  const { t } = useI18n();
  const { activeRole } = useTenant();
  const { requests, loading } = useLabRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);

  // Permission check for invoice creation
  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

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
          <h2 className="text-xl font-semibold">{t('laboratory.requests.title') || 'Lab Test Requests'}</h2>
          <p className="text-muted-foreground text-sm">
            {t('laboratory.requests.subtitle') || 'Request and track lab tests from external laboratories'}
          </p>
        </div>
        <CreateRequestDialog />
      </div>

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
    </div>
  );
}
