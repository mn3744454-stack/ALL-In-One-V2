import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SamplesList, LabTimeline, LabCreditsPanel } from "@/components/laboratory";
import { FlaskConical, FileText, Settings, Clock, Info } from "lucide-react";

export default function DashboardLaboratory() {
  const [activeTab, setActiveTab] = useState("samples");

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
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="samples">
            <SamplesList />
          </TabsContent>

          <TabsContent value="results">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Results management coming soon</p>
              <p className="text-sm">Create results from samples to see them here</p>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <LabTimeline />
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6 md:grid-cols-2">
              <LabCreditsPanel />
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Templates & Test Types management</p>
                <p className="text-sm">Coming in next iteration</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
