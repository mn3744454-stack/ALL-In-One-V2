import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { UnitsManager, AreasManager, HousingBottomNav } from "@/components/housing";
import { useHousingDemo } from "@/hooks/housing";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Warehouse, Loader2, Download, Trash2, AlertCircle } from "lucide-react";

export default function DashboardHousing() {
  const { t, dir } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'areas' | 'units' | 'settings'>("units");

  const {
    demoExists,
    isCheckingDemo,
    loadDemoData,
    isLoading: isLoadingDemo,
    removeDemoData,
    isRemoving,
    canManageDemo,
  } = useHousingDemo();

  const handleLoadDemo = () => {
    loadDemoData();
  };

  const handleRemoveDemo = () => {
    removeDemoData();
  };

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" dir={dir}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('housing.toasts.noActiveOrganization')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex w-full" dir={dir}>
      <Helmet>
        <title>{t('housing.title')} | Faras</title>
      </Helmet>

      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header */}
        <header className="bg-white border-b border-border/50 px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                className="p-2 rounded-xl hover:bg-muted lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{t('housing.title')}</h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {t('housing.subtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Demo Controls */}
            {canManageDemo && (
              <div className="flex items-center gap-2">
                {isCheckingDemo ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : demoExists ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveDemo}
                    disabled={isRemoving}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {isRemoving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline ms-2">{t('housing.demo.remove')}</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadDemo}
                    disabled={isLoadingDemo}
                  >
                    {isLoadingDemo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline ms-2">{t('housing.demo.load')}</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'areas' | 'units' | 'settings')} className="space-y-4">
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
                  {/* Demo Data Section */}
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
          <HousingBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </main>
    </div>
  );
}
