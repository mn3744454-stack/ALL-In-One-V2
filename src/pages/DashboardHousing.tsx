import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { UnitsManager, AreasManager, HousingBottomNav } from "@/components/housing";
import { useHousingDemo } from "@/hooks/housing";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Warehouse, Loader2, Download, Trash2, AlertCircle } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";

export default function DashboardHousing() {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const availableTabs = useMemo(() => ['units', 'areas', 'settings'], []);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab as 'areas' | 'units' | 'settings';
    }
    return 'units';
  }, [searchParams, availableTabs]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const canManageDemo = activeRole === 'owner' || activeRole === 'manager';
  const {
    demoExists,
    isCheckingDemo,
    loadDemoData,
    removeDemoData,
    isLoading: isLoadingDemo,
    isRemoving,
  } = useHousingDemo();

  const handleLoadDemo = async () => { await loadDemoData(); };
  const handleRemoveDemo = async () => { await removeDemoData(); };

  if (!activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('housing.toasts.noActiveOrganization')}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <Helmet>
        <title>{t('housing.title')} | Faras</title>
      </Helmet>

      {/* Mobile Page Header */}
      <MobilePageHeader title={t("housing.title")} />
      <PageToolbar title={t("housing.title")} />

      {/* Content */}
      <div className="flex-1 p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="hidden md:flex">
            <TabsTrigger value="units">{t('housing.tabs.units')}</TabsTrigger>
            <TabsTrigger value="areas">{t('housing.tabs.areas')}</TabsTrigger>
            <TabsTrigger value="settings">{t('housing.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="mt-0">
            <UnitsManager />
          </TabsContent>

          <TabsContent value="areas" className="mt-0">
            <AreasManager />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>{t('housing.settings.title')}</CardTitle>
                <CardDescription>{t('housing.settings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">{t('housing.demo.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('housing.demo.description')}
                  </p>
                  {canManageDemo && (
                    <div className="flex gap-2">
                      {demoExists ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveDemo}
                          disabled={isRemoving}
                        >
                          {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          <span className="ms-2">{t('housing.demo.remove')}</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadDemo}
                          disabled={isLoadingDemo}
                        >
                          {isLoadingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          <span className="ms-2">{t('housing.demo.load')}</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <HousingBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </DashboardShell>
  );
}
