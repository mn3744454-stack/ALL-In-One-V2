import { useState, useMemo, useCallback, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLabSubmissions } from "@/hooks/laboratory/useLabSubmissions";
import { LabSubmissionCard } from "./LabSubmissionCard";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
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
import { useLabRequests, type LabRequest, type CreateLabRequestData, type CreateSubmissionData } from "@/hooks/laboratory/useLabRequests";
import { useHorses } from "@/hooks/useHorses";
import { useConnections, useConnectionsWithDetails } from "@/hooks/connections";
import { AddPartnerDialog } from "@/components/connections";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { formatStandardDate } from "@/lib/displayHelpers";
import { LabCatalogViewer } from "./LabCatalogViewer";
import { LabRequestThread } from "./LabRequestThread";
import { MultiHorseSelector } from "./MultiHorseSelector";
import { QuickCreateHorseDialog } from "@/components/housing/QuickCreateHorseDialog";
import { Plus, Clock, CheckCircle2, Send, Loader2, ExternalLink, FileText, Search, MoreVertical, Receipt, FlaskConical, Tag, Link2, Building2, RefreshCw, ChevronDown, ChevronUp, MessageSquare, SlidersHorizontal, Heart, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import { toast } from "sonner";

import { RequestDetailDialog, RequestStatusBadge } from "./RequestDetailDialog";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { BilingualName } from "@/components/ui/BilingualName";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useQueryClient } from "@tanstack/react-query";

interface LabOption {
  tenantId: string;
  name: string;
}

function CreateRequestDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const { horses, refresh: refreshHorses } = useHorses();
  const { createRequest, createSubmission, isCreating } = useLabRequests();
  const { activeTenant } = useTenant();
  const { connections, refetch: refetchConnections } = useConnectionsWithDetails();
  const queryClient = useQueryClient();

  const { createConnection } = useConnections();
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [pendingPartnerName, setPendingPartnerName] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick-create horse bridge
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateKey, setQuickCreateKey] = useState(0);

  // Multi-horse selection state
  const [selectedHorses, setSelectedHorses] = useState<Array<{ id: string; name: string }>>([]);
  const selectedHorseIds = useMemo(() => selectedHorses.map(h => h.id), [selectedHorses]);

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
      setPendingPartnerName(t('laboratory.requests.pendingPartnership') || 'Partnership request sent');
      toast.success(t('connections.requestSent') || 'Partnership request sent');
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
    if (labPartners.length > 0) {
      setPendingPartnerName(null);
    }
  };

  const handleQuickCreateHorse = (horse: { id: string; name: string; name_ar?: string | null; gender: string }) => {
    // Add the new horse to selection
    setSelectedHorses(prev => [...prev, { id: horse.id, name: horse.name }]);
    setQuickCreateOpen(false);
    // Refresh the horses list so MultiHorseSelector sees the new horse
    refreshHorses();
  };
  
  const [formData, setFormData] = useState({
    test_description: '',
    external_lab_name: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    notes: '',
  });
  const [selectedLabTenantId, setSelectedLabTenantId] = useState<string | null>(null);
  const [selectedLabName, setSelectedLabName] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [labMode, setLabMode] = useState<'platform' | 'external'>('platform');

  // Phase 3: per-horse different tests
  const [testMode, setTestMode] = useState<'shared' | 'perHorse'>('shared');
  const [perHorseServiceIds, setPerHorseServiceIds] = useState<Record<string, string[]>>({});
  const [perHorseServiceNames, setPerHorseServiceNames] = useState<Record<string, string[]>>({});
  const [expandedHorseId, setExpandedHorseId] = useState<string | null>(null);

  const showTestModeBranch = selectedHorses.length > 1 && labMode === 'platform' && !!selectedLabTenantId;

  const handleTestModeChange = (mode: 'shared' | 'perHorse') => {
    if (mode === 'perHorse' && testMode === 'shared') {
      // Initialize per-horse from current shared selection
      const init: Record<string, string[]> = {};
      const initNames: Record<string, string[]> = {};
      selectedHorses.forEach(h => {
        init[h.id] = [...selectedServiceIds];
        initNames[h.id] = [...selectedServiceNames];
      });
      setPerHorseServiceIds(init);
      setPerHorseServiceNames(initNames);
      setExpandedHorseId(selectedHorses[0]?.id || null);
    } else if (mode === 'shared' && testMode === 'perHorse') {
      // Reset per-horse state when going back to shared
      setPerHorseServiceIds({});
      setPerHorseServiceNames({});
      setExpandedHorseId(null);
    }
    setTestMode(mode);
  };

  const handlePerHorseServiceChange = (horseId: string, ids: string[], names?: string[]) => {
    setPerHorseServiceIds(prev => ({ ...prev, [horseId]: ids }));
    if (names) setPerHorseServiceNames(prev => ({ ...prev, [horseId]: names }));
  };

  const handleLabChange = (labTenantId: string) => {
    const lab = labPartners.find(l => l.tenantId === labTenantId);
    setSelectedLabTenantId(labTenantId);
    setSelectedLabName(lab?.name || '');
    setSelectedServiceIds([]);
    setSelectedServiceNames([]);
    setPerHorseServiceIds({});
    setPerHorseServiceNames({});
    setFormData(prev => ({ ...prev, external_lab_name: lab?.name || '' }));
  };

  // Compute whether form is valid for submission
  const isFormValid = useMemo(() => {
    if (selectedHorses.length === 0) return false;
    if (labMode === 'platform') {
      if (!selectedLabTenantId) return false;
      if (testMode === 'perHorse' && showTestModeBranch) {
        // Each horse must have at least one service or a test description
        return selectedHorses.every(h => {
          const horseServices = perHorseServiceIds[h.id] || [];
          return horseServices.length > 0 || !!formData.test_description.trim();
        });
      }
      return !!(formData.test_description.trim() || selectedServiceIds.length > 0);
    } else {
      return !!formData.test_description.trim();
    }
  }, [selectedHorses, formData.test_description, labMode, selectedLabTenantId, selectedServiceIds, testMode, showTestModeBranch, perHorseServiceIds]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const isPerHorse = testMode === 'perHorse' && showTestModeBranch;

      // Build horse entries for the submission
      const horseEntries = selectedHorses.map(horse => {
        const horseData = horses.find(h => h.id === horse.id);

        let horseServiceIds: string[] | undefined;
        let horseDescription: string;

        if (isPerHorse) {
          horseServiceIds = perHorseServiceIds[horse.id]?.length ? perHorseServiceIds[horse.id] : undefined;
          const horseNames = perHorseServiceNames[horse.id] || [];
          horseDescription = formData.test_description.trim() || horseNames.join(', ') || '';
        } else {
          horseServiceIds = selectedServiceIds.length > 0 ? selectedServiceIds : undefined;
          let desc = formData.test_description.trim();
          if (!desc && selectedServiceNames.length > 0) desc = selectedServiceNames.join(', ');
          horseDescription = desc;
        }

        return {
          horse_id: horse.id,
          test_description: horseDescription,
          service_ids: horseServiceIds,
          horse_name_snapshot: horseData?.name,
          horse_name_ar_snapshot: horseData?.name_ar || null,
          horse_snapshot: horseData ? {
            breed: (horseData as any).breed || undefined,
            color: (horseData as any).color || undefined,
            sex: (horseData as any).sex || undefined,
          } : undefined,
        };
      });

      // Auto-generate parent description
      let finalDescription = formData.test_description.trim();
      if (!finalDescription && !isPerHorse && selectedServiceNames.length > 0) {
        finalDescription = selectedServiceNames.join(', ');
      }

      const result = await createSubmission({
        horses: horseEntries,
        priority: formData.priority,
        notes: formData.notes || undefined,
        description: finalDescription || undefined,
        expected_by: undefined,
        initiator_tenant_id: activeTenant?.tenant_id,
        lab_tenant_id: selectedLabTenantId || undefined,
        external_lab_name: labMode === 'external' ? formData.external_lab_name : undefined,
        initiator_tenant_name_snapshot: activeTenant?.tenant?.name || undefined,
      });

      const successCount = result.children.length;
      if (successCount > 1) {
        toast.success((t('laboratory.requests.batchCreated') || '{count} lab request(s) created').replace('{count}', String(successCount)));
      } else {
        toast.success(t('laboratory.requests.created') || 'Lab request created');
      }

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Submission failed:', err);
      toast.error(t('laboratory.requests.createFailed') || 'Failed to create lab request');
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({ test_description: '', external_lab_name: '', priority: 'normal', notes: '' });
    setSelectedHorses([]);
    setSelectedLabTenantId(null);
    setSelectedLabName('');
    setSelectedServiceIds([]);
    setSelectedServiceNames([]);
    setLabMode('platform');
    setPendingPartnerName(null);
    setTestMode('shared');
    setPerHorseServiceIds({});
    setPerHorseServiceNames({});
    setExpandedHorseId(null);
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
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('laboratory.requests.createTitle') || 'Create Lab Test Request'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4" id="create-request-form">
            {/* Horse Selection — Multi-horse with empty state */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('laboratory.createSample.horse') || 'Horse'}</Label>
                {horses.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={() => { setQuickCreateKey(k => k + 1); setQuickCreateOpen(true); }}
                  >
                    <Plus className="h-3 w-3" />
                    {t('laboratory.requests.addNewHorse') || 'Add New Horse'}
                  </Button>
                )}
              </div>
              {horses.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center space-y-3">
                    <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('laboratory.requests.noHorsesYet') || 'No horses registered yet'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('laboratory.requests.noHorsesHint') || 'Register at least one horse to create a lab request'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => { setQuickCreateKey(k => k + 1); setQuickCreateOpen(true); }}
                    >
                      <Plus className="h-4 w-4" />
                      {t('laboratory.requests.addNewHorse') || 'Add New Horse'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <MultiHorseSelector
                    selectedHorseIds={selectedHorseIds}
                    onSelectionChange={setSelectedHorses}
                    hideIds
                  />
                  {selectedHorses.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedHorses.length} {t('laboratory.requests.selectedHorses') || 'horses selected'}
                    </p>
                  )}
                </>
              )}
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

                    {/* Test mode toggle — only when multiple horses + lab selected */}
                    {showTestModeBranch && (
                      <div className="space-y-2">
                        <Label className="text-xs">{t('laboratory.requests.testAssignment') || 'Test Assignment'}</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={testMode === 'shared' ? 'default' : 'outline'}
                            onClick={() => handleTestModeChange('shared')}
                            className="flex-1 text-xs"
                          >
                            {t('laboratory.requests.sameTests') || 'Same tests for all'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={testMode === 'perHorse' ? 'default' : 'outline'}
                            onClick={() => handleTestModeChange('perHorse')}
                            className="flex-1 text-xs"
                          >
                            <SlidersHorizontal className="h-3 w-3 me-1" />
                            {t('laboratory.requests.differentTests') || 'Different per horse'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Shared catalog (default / single horse / shared mode) */}
                    {(testMode === 'shared' || !showTestModeBranch) && (
                      <>
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
                    )}

                    {/* Per-horse catalog (different tests mode) */}
                    {testMode === 'perHorse' && showTestModeBranch && (
                      <div className="space-y-2 border rounded-md">
                        {selectedHorses.map((horse) => {
                          const isExpanded = expandedHorseId === horse.id;
                          const horseServices = perHorseServiceIds[horse.id] || [];
                          return (
                            <div key={horse.id} className="border-b last:border-b-0">
                              <button
                                type="button"
                                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedHorseId(isExpanded ? null : horse.id)}
                              >
                                <span className="font-medium truncate">{horse.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {horseServices.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {horseServices.length}
                                    </Badge>
                                  )}
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-3 pb-3 max-h-[35vh] overflow-y-auto">
                                  <LabCatalogViewer
                                    labTenantId={selectedLabTenantId}
                                    labName={selectedLabName}
                                    selectable
                                    selectedIds={horseServices}
                                    onSelectServices={(ids, names) => handlePerHorseServiceChange(horse.id, ids, names)}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                  <SelectItem value="low">{t('laboratory.requests.priorities.low') || 'Low'}</SelectItem>
                  <SelectItem value="normal">{t('laboratory.requests.priorities.normal') || 'Normal'}</SelectItem>
                  <SelectItem value="high">{t('laboratory.requests.priorities.high') || 'High'}</SelectItem>
                  <SelectItem value="urgent">{t('laboratory.requests.priorities.urgent') || 'Urgent'}</SelectItem>
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
            disabled={isSubmitting || isCreating || !isFormValid}
          >
            {(isSubmitting || isCreating) ? t('common.loading') : (
              selectedHorses.length > 1
                ? `${t('common.create')} (${selectedHorses.length})`
                : t('common.create')
            )}
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
    <QuickCreateHorseDialog
      key={quickCreateKey}
      open={quickCreateOpen}
      onOpenChange={setQuickCreateOpen}
      onCreated={handleQuickCreateHorse}
      minimal
    />
    </>
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
  
  const horseName = request.horse_name_snapshot || request.horse?.name || null;
  const horseNameAr = request.horse_name_ar_snapshot || (request.horse as any)?.name_ar || null;

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
            <CardTitle className="text-base"><BilingualName name={horseName} nameAr={horseNameAr} /></CardTitle>
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
            {formatStandardDate(request.requested_at)}
          </span>
        </div>

        {/* Selected Services */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {services.map(s => (
              <Badge key={s.service_id} variant="secondary" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                {dir === 'rtl' && (s.service_name_ar_snapshot || s.service?.name_ar)
                  ? (s.service_name_ar_snapshot || s.service.name_ar)
                  : (s.service_name_snapshot || s.service?.name || t('laboratory.requests.unknownService') || 'Unknown Service')}
                {(s.service_code_snapshot || s.service?.code) && (
                  <span className="font-mono opacity-70">({s.service_code_snapshot || s.service?.code})</span>
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

// Stable mode: group requests by horse
function StableRequestsByHorse({
  requests,
  viewMode,
  gridColumns,
  canCreateInvoice,
  onGenerateInvoice,
  onOpenDetail,
  dir,
}: {
  requests: LabRequest[];
  viewMode: 'table' | 'list' | 'grid';
  gridColumns: 2 | 3 | 4;
  canCreateInvoice: boolean;
  onGenerateInvoice: (r: LabRequest) => void;
  onOpenDetail: (r: LabRequest, tab?: string) => void;
  dir: string;
}) {
  const { t } = useI18n();

  const horseGroups = useMemo(() => {
    const map = new Map<string, { horseName: string; requests: LabRequest[] }>();
    for (const req of requests) {
      const horseKey = req.horse_id || req.horse_name_snapshot || 'unknown';
      const horseName = dir === 'rtl' && (req.horse_name_ar_snapshot || req.horse?.name_ar)
        ? (req.horse_name_ar_snapshot || req.horse?.name_ar || t('laboratory.samples.unknownHorse'))
        : (req.horse_name_snapshot || req.horse?.name || t('laboratory.samples.unknownHorse'));
      if (!map.has(horseKey)) {
        map.set(horseKey, { horseName, requests: [] });
      }
      map.get(horseKey)!.requests.push(req);
    }
    // Sort groups by most recent request
    return Array.from(map.values()).sort((a, b) => {
      const aDate = a.requests[0]?.requested_at || "";
      const bDate = b.requests[0]?.requested_at || "";
      return bDate.localeCompare(aDate);
    });
  }, [requests, dir, t]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(horseGroups.map(g => g.horseName))
  );

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {horseGroups.map((group) => (
        <Collapsible key={group.horseName} open={openGroups.has(group.horseName)} onOpenChange={() => toggleGroup(group.horseName)}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="flex items-center gap-3 w-full text-start p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-base block">{group.horseName}</span>
                <span className="text-xs text-muted-foreground">
                  {group.requests.length} {group.requests.length === 1 ? t('laboratory.requests.order') || 'order' : t('laboratory.requests.orders') || 'orders'}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {group.requests.length}
              </Badge>
              {openGroups.has(group.horseName) ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t px-4 pb-4 pt-3">
                <div className={getGridClass(gridColumns, viewMode === 'table' ? 'list' : viewMode)}>
                  {group.requests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      canCreateInvoice={canCreateInvoice}
                      onGenerateInvoice={() => onGenerateInvoice(request)}
                      onOpenDetail={() => onOpenDetail(request)}
                    />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}

interface LabRequestsTabProps {
  onCreateSampleFromRequest?: (request: LabRequest) => void;
}

export function LabRequestsTab({ onCreateSampleFromRequest }: LabRequestsTabProps = {}) {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { labMode } = useModuleAccess();
  const { requests, loading } = useLabRequests();
  const { submissions, orphanRequests, loading: submissionsLoading } = useLabSubmissions();
  const { connections, refetch: refetchConnections } = useConnectionsWithDetails();
  const { createConnection } = useConnections();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('statusFilter') || 'all');

  // Persist statusFilter in URL search params
  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all') {
        next.delete('statusFilter');
      } else {
        next.set('statusFilter', value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<LabRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDefaultTab, setDetailDefaultTab] = useState<string | undefined>();
  const [inboxOpen, setInboxOpen] = useState(true);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-requests');

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

  // For Lab-full: filter submissions + orphans by search/status
  const filteredSubmissions = useMemo(() => {
    if (!isLabFull) return [];
    return submissions.filter(sub => {
      const matchesSearch = !searchQuery ||
        sub.initiator_tenant_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.children.some(c =>
          c.test_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.horse_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.horse_name_ar_snapshot?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesStatus = statusFilter === 'all' || sub.children.some(c => c.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [isLabFull, submissions, searchQuery, statusFilter]);

  const filteredOrphans = useMemo(() => {
    if (!isLabFull) return [];
    return orphanRequests.filter(req => {
      const matchesSearch = !searchQuery ||
        req.test_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.horse?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.horse_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [isLabFull, orphanRequests, searchQuery, statusFilter]);

  // For Stable mode: filter flat requests
  const filteredRequests = useMemo(() => {
    if (isLabFull) return []; // Lab-full uses submissions
    return requests.filter(req => {
      const matchesSearch = !searchQuery || 
        req.test_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.horse?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.horse_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.horse_name_ar_snapshot?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [isLabFull, requests, searchQuery, statusFilter]);

  const handleGenerateInvoice = (request: LabRequest) => {
    setSelectedRequest(request);
    setInvoiceDialogOpen(true);
  };

  const isPageLoading = isLabFull ? (loading || submissionsLoading) : loading;

  if (isPageLoading) {
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

      {/* Desktop Filters */}
      <div className="hidden sm:flex flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('laboratory.requests.searchPlaceholder') || 'Search requests...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
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
        <div className="hidden lg:flex">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable
            showLabels={true}
          />
        </div>
      </div>

      {/* Mobile: Search + Filter button + scrollable status pills */}
      <div className="sm:hidden space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('laboratory.requests.searchPlaceholder') || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 h-11"
            />
          </div>
        </div>
        {/* Scrollable status pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {[
            { value: 'all', label: t('common.all') },
            { value: 'pending', label: t('laboratory.requests.status.pending') || 'Pending' },
            { value: 'sent', label: t('laboratory.requests.status.sent') || 'Sent' },
            { value: 'processing', label: t('laboratory.requests.status.processing') || 'Processing' },
            { value: 'ready', label: t('laboratory.requests.status.ready') || 'Ready' },
            { value: 'received', label: t('laboratory.requests.status.received') || 'Received' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusFilterChange(s.value)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border min-h-[36px]",
                statusFilter === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Content */}
      {isLabFull ? (
        /* Lab-full mode: submission-grouped intake view */
        (filteredSubmissions.length === 0 && filteredOrphans.length === 0) ? (
          <Card className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">
                {t('laboratory.submissions.noSubmissions') || 'No incoming submissions'}
              </p>
              <p className="text-sm">
                {t('laboratory.submissions.noSubmissionsDesc') || 'Submissions from partner stables will appear here'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Grouped submissions */}
            {filteredSubmissions.map((sub) => (
              <LabSubmissionCard
                key={sub.id}
                submission={sub}
                defaultOpen={filteredSubmissions.length === 1}
                onOpenChildDetail={handleOpenDetail}
                onCreateSample={onCreateSampleFromRequest}
              />
            ))}

            {/* Legacy orphan requests (no submission) */}
            {filteredOrphans.length > 0 && (
              <>
                {filteredSubmissions.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-2">
                    {t('laboratory.submissions.legacyRequest') || 'Legacy requests'}
                  </p>
                )}
                <div className={getGridClass(gridColumns, viewMode)}>
                  {filteredOrphans.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      canCreateInvoice={canCreateInvoice}
                      onGenerateInvoice={() => handleGenerateInvoice(request)}
                      onOpenDetail={() => handleOpenDetail(request)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )
      ) : filteredRequests.length === 0 ? (
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
      ) : isStableMode ? (
        <StableRequestsByHorse
          requests={filteredRequests}
          viewMode={viewMode}
          gridColumns={gridColumns}
          canCreateInvoice={canCreateInvoice}
          onGenerateInvoice={handleGenerateInvoice}
          onOpenDetail={handleOpenDetail}
          dir={dir}
        />
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
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
          onCreateSample={onCreateSampleFromRequest ? (req) => {
            setDetailOpen(false);
            onCreateSampleFromRequest(req);
          } : undefined}
        />
      )}
    </div>
  );
}
