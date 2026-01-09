import { useState, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  MovementsList,
  MovementBottomNav,
  LocationsManager,
  RecordMovementDialog,
} from "@/components/movement";
import { useMovementDemo } from "@/hooks/movement/useMovementDemo";
import { useI18n } from "@/i18n";
import { ArrowLeftRight, MapPin, Settings, ArrowLeft, Menu, FlaskConical, Loader2 } from "lucide-react";

export default function DashboardMovement() {
  const { t } = useI18n();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const availableTabs = useMemo(() => ['movements', 'locations', 'settings'], []);
  
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
    setSearchParams(next, { replace: true });
  };
  
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    canManageDemo,
    demoExists,
    isCheckingDemo,
    loadDemoData,
    removeDemoData,
    isLoading: isDemoLoading,
    isRemoving: isDemoRemoving,
  } = useMovementDemo();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname}
      />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b lg:hidden">
          <div className="flex items-center h-14 px-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">{t("common.back")}</span>
              </Button>
            </Link>
            <h1 className="flex-1 text-center font-semibold flex items-center justify-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t("sidebar.movement")}
            </h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Desktop Header */}
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
                <ArrowLeftRight className="h-5 w-5" />
                {t("movement.title")}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t("movement.subtitle")}
              </p>
            </div>
          </div>
          
          {/* Demo mode indicator */}
          {demoExists && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <FlaskConical className="h-3 w-3 me-1" />
              {t("movement.demo.title")}
            </Badge>
          )}
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 hidden lg:flex">
              <TabsTrigger value="movements" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                {t("movement.tabs.movements")}
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" />
                {t("movement.tabs.locations")}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                {t("movement.tabs.settings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movements">
              <MovementsList onRecordMovement={() => setRecordDialogOpen(true)} />
            </TabsContent>

            <TabsContent value="locations">
              <LocationsManager />
            </TabsContent>

            <TabsContent value="settings">
              <div className="max-w-xl space-y-6">
                {/* Demo Data Card */}
                {canManageDemo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5" />
                        {t("movement.demo.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("movement.demo.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isCheckingDemo ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </div>
                      ) : demoExists ? (
                        <Button
                          variant="outline"
                          onClick={() => removeDemoData()}
                          disabled={isDemoRemoving}
                        >
                          {isDemoRemoving ? (
                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          ) : null}
                          {t("movement.demo.remove")}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => loadDemoData()}
                          disabled={isDemoLoading}
                        >
                          {isDemoLoading ? (
                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          ) : null}
                          {t("movement.demo.load")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MovementBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Record Movement Dialog */}
      <RecordMovementDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
      />
    </div>
  );
}
