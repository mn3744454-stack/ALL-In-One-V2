import { useState } from "react";
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
} from "@/components/laboratory";
import { FlaskConical, FileText, Settings, Clock, Info, FileStack } from "lucide-react";

export default function DashboardLaboratory() {
  const [activeTab, setActiveTab] = useState("samples");
  const [createSampleOpen, setCreateSampleOpen] = useState(false);
  const [createResultOpen, setCreateResultOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

        {/* Demo Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Laboratory Module MVP. Create and track samples, manage results with templates.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="samples" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Samples</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileStack className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
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
            />
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
    </div>
  );
}
