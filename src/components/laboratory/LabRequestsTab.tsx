import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLabRequests, type LabRequest, type CreateLabRequestData } from "@/hooks/laboratory/useLabRequests";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { Plus, Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

function CreateRequestDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const { horses } = useHorses();
  const { createRequest, isCreating } = useLabRequests();
  
  const [formData, setFormData] = useState<CreateLabRequestData>({
    horse_id: '',
    test_description: '',
    external_lab_name: '',
    priority: 'normal',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.horse_id || !formData.test_description) return;
    
    await createRequest(formData);
    setFormData({ horse_id: '', test_description: '', external_lab_name: '', priority: 'normal', notes: '' });
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('laboratory.requests.create') || 'New Request'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('laboratory.requests.createTitle') || 'Create Lab Test Request'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label>{t('laboratory.requests.testDescription') || 'Test Description'}</Label>
            <Textarea
              value={formData.test_description}
              onChange={(e) => setFormData(prev => ({ ...prev, test_description: e.target.value }))}
              placeholder={t('laboratory.requests.testDescriptionPlaceholder') || 'Describe the tests needed...'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('laboratory.requests.externalLab') || 'External Lab (Optional)'}</Label>
            <Input
              value={formData.external_lab_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, external_lab_name: e.target.value }))}
              placeholder={t('laboratory.requests.externalLabPlaceholder') || 'Lab name...'}
            />
          </div>

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

          <div className="space-y-2">
            <Label>{t('common.notes') || 'Notes'}</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('laboratory.requests.notesPlaceholder') || 'Additional notes...'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isCreating || !formData.horse_id || !formData.test_description}>
              {isCreating ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({ request }: { request: LabRequest }) {
  const { t, dir } = useI18n();
  const { updateRequest } = useLabRequests();
  
  const horseName = dir === 'rtl' && request.horse?.name_ar 
    ? request.horse.name_ar 
    : request.horse?.name || t('laboratory.samples.unknownHorse');

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
          <div className="space-y-1">
            <CardTitle className="text-base">{horseName}</CardTitle>
            <CardDescription className="line-clamp-2">
              {request.test_description}
            </CardDescription>
          </div>
          <RequestStatusBadge status={request.status} />
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
  const { requests, loading } = useLabRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchQuery || 
      req.test_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.horse?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
