import { useState, useMemo, useEffect } from "react";
import { ErrorBoundary } from "@/components/guards/ErrorBoundary";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  SamplesList, 
  LabTimeline, 
  LabCreditsPanel,
  CreateSampleDialog,
  CreateResultDialog,
  ResultsList,
  LabTestTypesManager,
  LabTemplatesManager,
  LabBottomNavigation,
  ResultsComparison,
  ResultPreviewDialog,
  LabHorsesList,
  LabHorseProfile,
  LabHorseEditDialog,
  LabServicesCatalog,
} from "@/components/laboratory";
import { useLabHorses, type LabHorse } from "@/hooks/laboratory/useLabHorses";
import { LabRequestsTab } from "@/components/laboratory/LabRequestsTab";
import type { LabRequest } from "@/hooks/laboratory/useLabRequests";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FlaskConical, FileText, Settings, Clock, Info, FileStack, GitCompare, ClipboardList, Heart, ShoppingBag, MessageSquare } from "lucide-react";
import { StableResultsView } from "@/components/laboratory/StableResultsView";
import { StableMessagesView } from "@/components/laboratory/StableMessagesView";
import { MobilePageHeader } from "@/components/navigation";
import { useLabResults, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";


export default function DashboardLaboratory() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const { labMode, isLabTenant, loading: moduleLoading } = useModuleAccess();
  const [createSampleOpen, setCreateSampleOpen] = useState(false);
  const [createResultOpen, setCreateResultOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<LabResult | null>(null);
  const [editHorseId, setEditHorseId] = useState<string | null>(null);
  const [fromRequest, setFromRequest] = useState<LabRequest | null>(null);
  
  const isPrimaryLabTenant = isLabTenant && labMode === "full";
  const location = useLocation();

  const { results, publishToStable, reviewResult, finalizeResult } = useLabResults();
  const { templates } = useLabTemplates();
  
  const { labHorses } = useLabHorses({ includeArchived: true });
  const editHorse = useMemo(() => {
    if (!editHorseId) return null;
    return labHorses.find(h => h.id === editHorseId) || null;
  }, [editHorseId, labHorses]);

  const availableTabs = useMemo(() => {
    if (labMode === 'requests') return ['requests', 'results', 'messages', 'settings'];
    return ['samples', 'results', 'requests', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings'];
  }, [labMode]);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) return urlTab;
    return availableTabs[0];
  }, [searchParams, availableTabs]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (isPrimaryLabTenant && !urlTab) {
      navigate(`/dashboard/laboratory?tab=samples`, { replace: true });
      return;
    }
    if (urlTab && !availableTabs.includes(urlTab)) {
      const next = new URLSearchParams(searchParams);
      const hasRequestId = searchParams.has('requestId');
      next.set('tab', hasRequestId ? 'requests' : availableTabs[0]);
      setSearchParams(next, { replace: true });
    }
  }, [availableTabs, searchParams, setSearchParams, isPrimaryLabTenant, navigate]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'horses') next.delete('horseId');
    setSearchParams(next, { replace: true });
  };

  const handleBackFromHorseProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('horseId');
    setSearchParams(next, { replace: true });
  };

  const handlePreviewResult = (result: LabResult) => setPreviewResult(result);

  const previewTemplate = previewResult ? templates.find(t => t.id === previewResult.template_id) : null;

  if (moduleLoading) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  // Header right: lab credits for full mode
  const headerRight = labMode === 'full' ? <LabCreditsPanel compact /> : undefined;

  return (
    <DashboardShell headerRight={headerRight}>
      <ErrorBoundary fallbackMessage="حدث خطأ في وحدة المختبر. يرجى المحاولة مرة أخرى.">
      {/* Mobile Page Header */}
      <MobilePageHeader title={t("sidebar.laboratory")} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Mobile Credits - only for full mode */}
        {labMode === 'full' && (
          <div className="lg:hidden mb-4">
            <LabCreditsPanel compact />
          </div>
        )}

        {/* Demo Alert */}
        {labMode === 'requests' && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 hidden lg:flex">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              {t("laboratory.alerts.requestsInfo") || "Requests mode: Create and track lab test requests from external laboratories."}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {!isPrimaryLabTenant && (
            <TabsList className="mb-6 hidden lg:flex">
              {labMode === 'requests' ? (
                <>
                  <TabsTrigger value="requests" className="gap-2"><ClipboardList className="h-4 w-4" />{t("laboratory.tabs.requests") || "Requests"}</TabsTrigger>
                  <TabsTrigger value="results" className="gap-2"><FileText className="h-4 w-4" />{t("laboratory.stableResults.tabLabel") || "Results"}</TabsTrigger>
                  <TabsTrigger value="messages" className="gap-2"><MessageSquare className="h-4 w-4" />{t("laboratory.messages.tabLabel") || "Messages"}</TabsTrigger>
                  <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />{t("laboratory.tabs.settings")}</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="samples" className="gap-2"><FlaskConical className="h-4 w-4" />{t("laboratory.tabs.samples")}</TabsTrigger>
                  <TabsTrigger value="results" className="gap-2"><FileText className="h-4 w-4" />{t("laboratory.tabs.results")}</TabsTrigger>
                  <TabsTrigger value="catalog" className="gap-2"><ShoppingBag className="h-4 w-4" />{t("laboratory.catalog.title")}</TabsTrigger>
                  <TabsTrigger value="compare" className="gap-2"><GitCompare className="h-4 w-4" />{t("laboratory.tabs.compare")}</TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" />{t("laboratory.tabs.timeline")}</TabsTrigger>
                  <TabsTrigger value="templates" className="gap-2"><FileStack className="h-4 w-4" />{t("laboratory.tabs.templates")}</TabsTrigger>
                  <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />{t("laboratory.tabs.settings")}</TabsTrigger>
                </>
              )}
            </TabsList>
          )}

          <TabsContent value="requests">
            <LabRequestsTab onCreateSampleFromRequest={(req) => { setFromRequest(req); setCreateSampleOpen(true); }} />
          </TabsContent>

          {labMode === 'requests' && <TabsContent value="results"><StableResultsView /></TabsContent>}
          {labMode === 'requests' && <TabsContent value="messages"><StableMessagesView /></TabsContent>}

          <TabsContent value="samples">
            <SamplesList
              onCreateSample={() => setCreateSampleOpen(true)}
              onCreateSampleFromRequest={(req) => { setFromRequest(req); setCreateSampleOpen(true); }}
            />
          </TabsContent>

          {labMode === 'full' && (
            <TabsContent value="results">
              <ResultsList
                onCreateResult={() => setCreateResultOpen(true)}
                onResultClick={(resultId) => {
                  const result = results.find(r => r.id === resultId);
                  if (result) handlePreviewResult(result);
                }}
              />
            </TabsContent>
          )}

          <TabsContent value="horses">
            {searchParams.get('horseId') ? (
              <LabHorseProfile
                horseId={searchParams.get('horseId')!}
                onBack={handleBackFromHorseProfile}
                onSampleClick={(sampleId) => {
                  const next = new URLSearchParams(searchParams);
                  next.set('tab', 'samples');
                  next.set('sampleId', sampleId);
                  next.delete('horseId');
                  setSearchParams(next, { replace: true });
                }}
                onResultClick={(resultId) => {
                  const result = results.find(r => r.id === resultId);
                  if (result) handlePreviewResult(result);
                }}
                onEdit={(horse) => setEditHorseId(horse.id)}
              />
            ) : (
              <LabHorsesList editHorseId={editHorseId} onEditComplete={() => setEditHorseId(null)} />
            )}
          </TabsContent>

          <TabsContent value="catalog"><LabServicesCatalog /></TabsContent>
          <TabsContent value="compare"><ResultsComparison /></TabsContent>
          <TabsContent value="timeline"><LabTimeline /></TabsContent>
          <TabsContent value="templates"><LabTemplatesManager onNavigateToTemplates={() => handleTabChange("templates")} /></TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6 lg:grid-cols-2">
              {labMode === 'full' && <LabCreditsPanel />}
              <LabTestTypesManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <LabBottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Dialogs - only for full mode */}
      {labMode === 'full' && (
        <>
          <CreateSampleDialog
            open={createSampleOpen}
            onOpenChange={(open) => { setCreateSampleOpen(open); if (!open) setFromRequest(null); }}
            onSuccess={() => handleTabChange("samples")}
            fromRequest={fromRequest}
          />
          <CreateResultDialog open={createResultOpen} onOpenChange={setCreateResultOpen} onSuccess={() => handleTabChange("results")} />
          <ResultPreviewDialog
            open={!!previewResult}
            onOpenChange={(open) => !open && setPreviewResult(null)}
            result={previewResult}
            fullTemplate={previewTemplate}
            onReview={async (id) => { await reviewResult(id); }}
            onFinalize={async (id) => { await finalizeResult(id); }}
            onPublishToStable={publishToStable}
          />
          <LabHorseEditDialog
            open={!!editHorse}
            onOpenChange={(open) => !open && setEditHorseId(null)}
            horse={editHorse}
            onSuccess={() => setEditHorseId(null)}
          />
        </>
      )}
      </ErrorBoundary>
    </DashboardShell>
  );
}
