import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FacilitiesManager, HousingBottomNav, AdmissionsList } from "@/components/housing";
import { MovementsList, RecordMovementDialog, IncomingArrivals } from "@/components/movement";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle, Building2, ClipboardCheck, ArrowLeftRight, ArrowDownToLine } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";

export default function DashboardHousing() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  const availableTabs = useMemo(() => ['facilities', 'admissions', 'movement', 'incoming'], []);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    // Support legacy tabs
    if (urlTab === 'areas' || urlTab === 'units') return 'facilities';
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab;
    }
    return 'admissions';
  }, [searchParams, availableTabs]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

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

      <MobilePageHeader title={t("housing.title")} />

      <div className="flex-1 p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="hidden md:flex">
            <TabsTrigger value="facilities" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t('housing.tabs.facilities')}
            </TabsTrigger>
            <TabsTrigger value="admissions" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {t('housing.tabs.admissions')}
            </TabsTrigger>
            <TabsTrigger value="movement" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              {t('housing.tabs.movement')}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              {t('housing.tabs.incoming')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facilities" className="mt-0">
            <FacilitiesManager />
          </TabsContent>

          <TabsContent value="admissions" className="mt-0">
            <AdmissionsList />
          </TabsContent>

          <TabsContent value="movement" className="mt-0">
            <MovementsList onRecordMovement={() => setRecordDialogOpen(true)} />
          </TabsContent>

          <TabsContent value="incoming" className="mt-0">
            <IncomingArrivals />
          </TabsContent>
        </Tabs>
      </div>

      {isMobile && (
        <HousingBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      <RecordMovementDialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen} />
    </DashboardShell>
  );
}
