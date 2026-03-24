import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FacilitiesManager, HousingBottomNav, AdmissionsList } from "@/components/housing";
import { ArrivalsAndDepartures } from "@/components/housing/ArrivalsAndDepartures";
import { RecordMovementDialog } from "@/components/movement";
import { BranchOverview } from "@/components/housing/BranchOverview";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useLocations } from "@/hooks/movement/useLocations";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle, Building2, ClipboardCheck, ArrowLeftRight, LayoutDashboard, Warehouse } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { BilingualName } from "@/components/ui/BilingualName";

export default function DashboardHousing() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { activeLocations } = useLocations();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  // Branch scope
  const selectedBranchId = searchParams.get('branch') || '__all__';

  const handleBranchChange = (branchId: string) => {
    const next = new URLSearchParams(searchParams);
    if (branchId === '__all__') {
      next.delete('branch');
    } else {
      next.set('branch', branchId);
    }
    // Stay on current tab when switching branches
    if (!next.get('tab')) {
      next.set('tab', 'branches');
    }
    setSearchParams(next, { replace: true });
  };

  const availableTabs = ['branches', 'admissions', 'facilities', 'arrivalsAndDepartures'];

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    // Support legacy tabs
    if (urlTab === 'overview') return 'branches';
    if (urlTab === 'areas' || urlTab === 'units') return 'facilities';
    if (urlTab === 'movement' || urlTab === 'incoming') return 'arrivalsAndDepartures';
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab;
    }
    return 'branches';
  }, [searchParams]);

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

  const selectedBranch = activeLocations.find(l => l.id === selectedBranchId);

  return (
    <DashboardShell>
      <Helmet>
        <title>{t('housing.title')} | Faras</title>
      </Helmet>

      <MobilePageHeader title={t("housing.title")} />

      <div className="flex-1 p-4 md:p-6">
        {/* Branch Scope Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('housing.title')}</h2>
          </div>
          <Select value={selectedBranchId} onValueChange={handleBranchChange}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder={t('housing.branchScope.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {t('housing.branchScope.allBranches')}
                </span>
              </SelectItem>
              {activeLocations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    <BilingualName name={loc.name} nameAr={(loc as any).name_ar} inline primaryClassName="font-medium text-sm" secondaryClassName="text-xs" />
                    {loc.city && <span className="text-muted-foreground text-xs">· {loc.city}</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="hidden md:flex">
            <TabsTrigger value="branches" className="gap-2">
              <Building2 className="h-4 w-4" />
              {t('housing.tabs.branches')}
            </TabsTrigger>
            <TabsTrigger value="facilities" className="gap-2">
              <Warehouse className="h-4 w-4" />
              {t('housing.tabs.facilities')}
            </TabsTrigger>
            <TabsTrigger value="admissions" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {t('housing.tabs.admissions')}
            </TabsTrigger>
            <TabsTrigger value="arrivalsAndDepartures" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              {t('housing.tabs.arrivalsAndDepartures')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branches" className="mt-0">
            {selectedBranchId === '__all__' ? (
              <BranchOverview
                branches={activeLocations}
                onNavigateToTab={handleTabChange}
              />
            ) : (
              <BranchOverview
                branches={activeLocations.filter(l => l.id === selectedBranchId)}
                onNavigateToTab={handleTabChange}
              />
            )}
          </TabsContent>

          <TabsContent value="admissions" className="mt-0">
            <AdmissionsList branchId={selectedBranchId === '__all__' ? undefined : selectedBranchId} />
          </TabsContent>

          <TabsContent value="facilities" className="mt-0">
            <FacilitiesManager lockedBranchId={selectedBranchId === '__all__' ? undefined : selectedBranchId} />
          </TabsContent>

          <TabsContent value="arrivalsAndDepartures" className="mt-0">
            <ArrivalsAndDepartures onRecordMovement={() => setRecordDialogOpen(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {isMobile && (
        <HousingBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}

      <RecordMovementDialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen} />
    </DashboardShell>
  );
}
