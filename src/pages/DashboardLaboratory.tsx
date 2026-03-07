import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { FlaskConical, FileText, Settings, Clock, Info, FileStack, ArrowLeft, GitCompare, ClipboardList, Heart, ShoppingBag, MessageSquare } from "lucide-react";
import { StableResultsView } from "@/components/laboratory/StableResultsView";
import { StableMessagesView } from "@/components/laboratory/StableMessagesView";
import { MobilePageHeader } from "@/components/navigation";
import { useLabResults, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";


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
  
  // Lab tenant with full mode = primary business, uses sidebar/mobile nav instead of internal tabs
  const isPrimaryLabTenant = isLabTenant && labMode === "full";
  const location = useLocation();

  const { results, publishToStable, reviewResult, finalizeResult } = useLabResults();
  const { templates } = useLabTemplates();
  
  // Fetch lab horses for edit dialog
  const { labHorses } = useLabHorses({ includeArchived: true });

  // Available tabs based on lab mode
  const availableTabs = useMemo(() => {
    if (labMode === 'requests') return ['requests', 'results', 'messages', 'settings'];
    return ['samples', 'results', 'requests', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings'];
  }, [labMode]);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab;
    }
    return availableTabs[0];
  }, [searchParams, availableTabs]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('horseId');
    next.delete('sampleId');
    setSearchParams(next, { replace: true });
  };

  // Find the editing horse from labHorses
  const editHorse = editHorseId
    ? labHorses.find((h: LabHorse) => h.id === editHorseId) ?? null
    : null;

  // Handle result preview
  const handlePreviewResult = (result: LabResult) => {
    setPreviewResult(result);
  };

  // Find template for preview
  const previewTemplate = previewResult
    ? templates.find(t => t.id === previewResult.template_id) ?? null
    : null;

  // Back from horse profile
  const handleBackFromHorseProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('horseId');
    setSearchParams(next, { replace: true });
  };

  if (moduleLoading) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Mobile Page Header */}
      <MobilePageHeader title={t("sidebar.laboratory")} />
      <PageToolbar
        title={t("sidebar.laboratory")}
        actions={labMode === 'full' ? <LabCreditsPanel compact /> : undefined}
      />

      <div className="flex-1 overflow-y-auto min-h-0 pb-20 lg:pb-0">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Mobile Credits - only for full mode */}
          {labMode === 'full' && (
            <div className="lg:hidden mb-4">
              <LabCreditsPanel compact />
            </div>
          )}

          {/* Demo Alert - Only shown in requests mode */}
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
            {/* Hide internal tabs for primary lab tenants */}
            {!isPrimaryLabTenant && (
              <TabsList className="mb-6 hidden lg:flex">
                {labMode === 'requests' ? (
                  <>
                    <TabsTrigger value="requests" className="gap-2">
                      <ClipboardList className="h-4 w-4" />
                      {t("laboratory.tabs.requests") || "Requests"}
                    </TabsTrigger>
                    <TabsTrigger value="results" className="gap-2">
                      <FileText className="h-4 w-4" />
                      {t("laboratory.stableResults.tabLabel") || "Results"}
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t("laboratory.messages.tabLabel") || "Messages"}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      {t("laboratory.tabs.settings")}
                    </TabsTrigger>
                  </>
                ) : (
                  <>
                    <TabsTrigger value="samples" className="gap-2">
                      <FlaskConical className="h-4 w-4" />
                      {t("laboratory.tabs.samples")}
                    </TabsTrigger>
                    <TabsTrigger value="results" className="gap-2">
                      <FileText className="h-4 w-4" />
                      {t("laboratory.tabs.results")}
                    </TabsTrigger>
                    <TabsTrigger value="catalog" className="gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {t("laboratory.catalog.title")}
                    </TabsTrigger>
                    <TabsTrigger value="compare" className="gap-2">
                      <GitCompare className="h-4 w-4" />
                      {t("laboratory.tabs.compare")}
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-2">
                      <Clock className="h-4 w-4" />
                      {t("laboratory.tabs.timeline")}
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2">
                      <FileStack className="h-4 w-4" />
                      {t("laboratory.tabs.templates")}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      {t("laboratory.tabs.settings")}
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            )}

            {/* Requests Tab - for requests mode */}
            <TabsContent value="requests">
              <LabRequestsTab onCreateSampleFromRequest={(req) => {
                setFromRequest(req);
                setCreateSampleOpen(true);
              }} />
            </TabsContent>

            {/* Stable Results Tab - requests with published results */}
            {labMode === 'requests' && (
              <TabsContent value="results">
                <StableResultsView />
              </TabsContent>
            )}

            {/* Stable Messages Tab - standalone inbox */}
            {labMode === 'requests' && (
              <TabsContent value="messages">
                <StableMessagesView />
              </TabsContent>
            )}

            {/* Full Lab Mode Tabs */}
            <TabsContent value="samples">
              <SamplesList 
                onCreateSample={() => setCreateSampleOpen(true)}
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

            <TabsContent value="catalog">
              <LabServicesCatalog />
            </TabsContent>

            <TabsContent value="compare">
              <ResultsComparison />
            </TabsContent>

            <TabsContent value="timeline">
              <LabTimeline />
            </TabsContent>

            <TabsContent value="templates">
              <LabTemplatesManager onNavigateToTemplates={() => handleTabChange("templates")} />
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid gap-6 lg:grid-cols-2">
                {labMode === 'full' && <LabCreditsPanel />}
                <LabTestTypesManager />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <LabBottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Dialogs - only for full mode */}
      {labMode === 'full' && (
        <>
          <CreateSampleDialog
            open={createSampleOpen}
            onOpenChange={(open) => {
              setCreateSampleOpen(open);
              if (!open) setFromRequest(null);
            }}
            onSuccess={() => handleTabChange("samples")}
            fromRequest={fromRequest}
          />
          <CreateResultDialog
            open={createResultOpen}
            onOpenChange={setCreateResultOpen}
            onSuccess={() => handleTabChange("results")}
          />
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
    </DashboardShell>
  );
}
