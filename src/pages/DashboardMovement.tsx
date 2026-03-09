import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MovementsList, MovementBottomNav, LocationsManager, RecordMovementDialog } from "@/components/movement";
import { useMovementDemo } from "@/hooks/movement/useMovementDemo";
import { useI18n } from "@/i18n";
import { ArrowLeftRight, MapPin, Settings, FlaskConical, Loader2 } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";

export default function DashboardMovement() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const availableTabs = useMemo(() => ['movements', 'locations', 'settings'], []);
  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) return urlTab;
    return availableTabs[0];
  }, [searchParams, availableTabs]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const { canManageDemo, demoExists, isCheckingDemo, loadDemoData, removeDemoData, isLoading: isDemoLoading, isRemoving: isDemoRemoving } = useMovementDemo();

  // Header right: demo badge
  const headerRight = demoExists ? (
    <Badge variant="outline" className="text-amber-600 border-amber-300">
      <FlaskConical className="h-3 w-3 me-1" />
      {t("movement.demo.title")}
    </Badge>
  ) : undefined;

  return (
    <DashboardShell headerRight={headerRight}>
      <MobilePageHeader title={t("sidebar.movement")} />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 hidden lg:flex">
            <TabsTrigger value="movements" className="gap-2"><ArrowLeftRight className="h-4 w-4" />{t("movement.tabs.movements")}</TabsTrigger>
            <TabsTrigger value="locations" className="gap-2"><MapPin className="h-4 w-4" />{t("movement.tabs.locations")}</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />{t("movement.tabs.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="movements"><MovementsList onRecordMovement={() => setRecordDialogOpen(true)} /></TabsContent>
          <TabsContent value="locations"><LocationsManager /></TabsContent>
          <TabsContent value="settings">
            <div className="max-w-xl space-y-6">
              {canManageDemo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" />{t("movement.demo.title")}</CardTitle>
                    <CardDescription>{t("movement.demo.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isCheckingDemo ? (
                      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("common.loading")}</div>
                    ) : demoExists ? (
                      <Button variant="outline" onClick={() => removeDemoData()} disabled={isDemoRemoving}>{isDemoRemoving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t("movement.demo.remove")}</Button>
                    ) : (
                      <Button onClick={() => loadDemoData()} disabled={isDemoLoading}>{isDemoLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}{t("movement.demo.load")}</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MovementBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      <RecordMovementDialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen} />
    </DashboardShell>
  );
}
