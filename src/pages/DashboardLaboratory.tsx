import { useState } from "react";
import { Link } from "react-router-dom";
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
} from "@/components/laboratory";
import { FlaskConical, FileText, Settings, Clock, Info, FileStack, ArrowLeft, GitCompare } from "lucide-react";
import { useLabResults, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";

export default function DashboardLaboratory() {
  const [activeTab, setActiveTab] = useState("samples");
  const [createSampleOpen, setCreateSampleOpen] = useState(false);
  const [createResultOpen, setCreateResultOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<LabResult | null>(null);

  const { results } = useLabResults();
  const { templates } = useLabTemplates();

  const handleQuickAction = () => {
    if (activeTab === "results") {
      setCreateResultOpen(true);
    } else {
      setCreateSampleOpen(true);
    }
  };

  const handlePreviewResult = (result: LabResult) => {
    setPreviewResult(result);
  };

  // Get full template for preview
  const previewTemplate = previewResult 
    ? templates.find(t => t.id === previewResult.template_id)
    : null;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b lg:hidden">
        <div className="flex items-center h-14 px-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="flex-1 text-center font-semibold flex items-center justify-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Laboratory
          </h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6" />
              Laboratory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage lab samples, results, and templates
            </p>
          </div>
          <LabCreditsPanel compact />
        </div>

        {/* Mobile Credits */}
        <div className="lg:hidden mb-4">
          <LabCreditsPanel compact />
        </div>

        {/* Demo Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Laboratory Module MVP. Create and track samples, manage results with templates.
          </AlertDescription>
        </Alert>

        {/* Tabs - Hidden on mobile, shown on desktop */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 hidden lg:flex">
            <TabsTrigger value="samples" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Samples
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="h-4 w-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileStack className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="samples">
            <SamplesList 
              onCreateSample={() => setCreateSampleOpen(true)}
            />
          </TabsContent>

          <TabsContent value="results">
            <ResultsList
              onCreateResult={() => setCreateResultOpen(true)}
              onResultClick={(resultId) => {
                const result = results.find(r => r.id === resultId);
                if (result) handlePreviewResult(result);
              }}
            />
          </TabsContent>

          <TabsContent value="compare">
            <ResultsComparison />
          </TabsContent>

          <TabsContent value="timeline">
            <LabTimeline />
          </TabsContent>

          <TabsContent value="templates">
            <LabTemplatesManager onNavigateToTemplates={() => setActiveTab("templates")} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6 lg:grid-cols-2">
              <LabCreditsPanel />
              <LabTestTypesManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <LabBottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickAction={handleQuickAction}
      />

      {/* Dialogs */}
      <CreateSampleDialog
        open={createSampleOpen}
        onOpenChange={setCreateSampleOpen}
        onSuccess={() => setActiveTab("samples")}
      />
      <CreateResultDialog
        open={createResultOpen}
        onOpenChange={setCreateResultOpen}
        onSuccess={() => setActiveTab("results")}
      />
      <ResultPreviewDialog
        open={!!previewResult}
        onOpenChange={(open) => !open && setPreviewResult(null)}
        result={previewResult}
        fullTemplate={previewTemplate}
      />
    </div>
  );
}
