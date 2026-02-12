import { useState, useMemo, useEffect } from "react";
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
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FlaskConical, FileText, Settings, Clock, Info, FileStack, ArrowLeft, GitCompare, Menu, ClipboardList, Heart, ShoppingBag, MessageSquare } from "lucide-react";
import { StableResultsView } from "@/components/laboratory/StableResultsView";
import { StableMessagesView } from "@/components/laboratory/StableMessagesView";
import { NotificationsPanel } from "@/components/NotificationsPanel";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editHorseId, setEditHorseId] = useState<string | null>(null);
  
  // Lab tenant with full mode = primary business, uses sidebar/mobile nav instead of internal tabs
  const isPrimaryLabTenant = isLabTenant && labMode === "full";
  const location = useLocation();

  const { results } = useLabResults();
  const { templates } = useLabTemplates();
  
  // Fetch lab horses for edit dialog
  const { labHorses } = useLabHorses({ includeArchived: true });
  const editHorse = useMemo(() => {
    if (!editHorseId) return null;
    return labHorses.find(h => h.id === editHorseId) || null;
  }, [editHorseId, labHorses]);

  // Compute available tabs based on labMode
  const availableTabs = useMemo(() => {
    if (labMode === 'requests') {
      return ['requests', 'results', 'messages', 'settings'];
    }
    // Full lab mode - now includes 'horses'
    return ['samples', 'results', 'requests', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings'];
  }, [labMode]);

  // Get active tab from URL, validate, or use first available (smart default)
  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab;
    }
    return availableTabs[0]; // Smart default to first available
  }, [searchParams, availableTabs]);

  // Sync URL when tab is not valid or missing for primary lab tenants
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    
    // For primary lab tenants, ensure tab is always in URL (default to samples)
    if (isPrimaryLabTenant && !urlTab) {
      navigate(`/dashboard/laboratory?tab=samples`, { replace: true });
      return;
    }
    
    // Redirect to first available tab if current tab is invalid
    if (urlTab && !availableTabs.includes(urlTab)) {
      const next = new URLSearchParams(searchParams);
      // Preserve requestId context by redirecting to 'requests' tab
      const hasRequestId = searchParams.has('requestId');
      next.set('tab', hasRequestId ? 'requests' : availableTabs[0]);
      setSearchParams(next, { replace: true });
    }
  }, [availableTabs, searchParams, setSearchParams, isPrimaryLabTenant, navigate]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    // Clear horseId if leaving horses tab
    if (tab !== 'horses') {
      next.delete('horseId');
    }
    setSearchParams(next, { replace: true });
  };

  const handleBackFromHorseProfile = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('horseId');
    setSearchParams(next, { replace: true });
  };

  const handlePreviewResult = (result: LabResult) => {
    setPreviewResult(result);
  };

  // Get full template for preview
  const previewTemplate = previewResult 
    ? templates.find(t => t.id === previewResult.template_id)
    : null;

  if (moduleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
      />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Mobile Page Header */}
        <MobilePageHeader title={t("sidebar.laboratory")} />

        {/* Desktop Header with Sidebar trigger */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                {t("laboratory.title")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("laboratory.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {labMode === 'full' && <LabCreditsPanel compact />}
            <NotificationsPanel />
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Mobile Credits - only for full mode */}
          {labMode === 'full' && (
            <div className="lg:hidden mb-4">
              <LabCreditsPanel compact />
            </div>
          )}

          {/* Demo Alert - Only shown in requests mode (MVP banner removed for full lab mode) */}
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
            {/* Hide internal tabs for primary lab tenants - they use sidebar/mobile nav instead */}
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
              <LabRequestsTab />
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
                    // Navigate to samples tab with selected sample
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

      {/* Mobile Bottom Navigation - only renders for labMode="full" */}
      <LabBottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Dialogs - only for full mode */}
      {labMode === 'full' && (
        <>
          <CreateSampleDialog
            open={createSampleOpen}
            onOpenChange={setCreateSampleOpen}
            onSuccess={() => handleTabChange("samples")}
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
          />
          {/* Lab Horse Edit Dialog - works from both profile and list */}
          <LabHorseEditDialog
            open={!!editHorse}
            onOpenChange={(open) => !open && setEditHorseId(null)}
            horse={editHorse}
            onSuccess={() => setEditHorseId(null)}
          />
        </>
      )}
    </div>
  );
}
