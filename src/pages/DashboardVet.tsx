import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Stethoscope, Syringe, Calendar, CalendarCheck, Filter, ClipboardList } from "lucide-react";
import { useVetTreatments } from "@/hooks/vet/useVetTreatments";
import { useVetFollowups } from "@/hooks/vet/useVetFollowups";
import { useHorseVaccinations } from "@/hooks/vet/useHorseVaccinations";
import { useVetVisits } from "@/hooks/vet/useVetVisits";
import { VetTreatmentsList, VetFollowupsList, VaccinationsList, VaccinationProgramManager, VetBottomNavigation } from "@/components/vet";
import { CreateVetTreatmentDialog } from "@/components/vet/CreateVetTreatmentDialog";
import { TreatmentDetailSheet } from "@/components/vet/TreatmentDetailSheet";
import { ScheduleVaccinationDialog } from "@/components/vet/ScheduleVaccinationDialog";
import { VetVisitsList } from "@/components/vet/VetVisitsList";
import { CreateVetVisitDialog } from "@/components/vet/CreateVetVisitDialog";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";

const DashboardVet = () => {
  const { t } = useI18n();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showVaccinationDialog, setShowVaccinationDialog] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<VetTreatment | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<VetTreatment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [horseFilter, setHorseFilter] = useState<string>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeRole } = useTenant();
  const { horses } = useHorses();

  const isOwnerOrManager = activeRole === 'owner' || activeRole === 'manager';

  const availableTabs = useMemo(() => {
    const tabs = ['treatments', 'vaccinations', 'visits', 'followups'];
    if (isOwnerOrManager) tabs.push('programs');
    return tabs;
  }, [isOwnerOrManager]);

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

  const horseFilterId = horseFilter === 'all' ? undefined : horseFilter;

  const { treatments, loading: treatmentsLoading, canManage, refresh: refreshTreatments } = useVetTreatments({ search: searchQuery, horse_id: horseFilterId });
  const { followups, overdueFollowups, loading: followupsLoading, markAsDone, markAsCancelled } = useVetFollowups({ horse_id: horseFilterId });
  const { vaccinations, loading: vaccinationsLoading, markAsAdministered, skipVaccination, refresh: refreshVaccinations } = useHorseVaccinations({ horse_id: horseFilterId });
  const { visits, todayVisits, loading: visitsLoading, createVisit, confirmVisit, startVisit, completeVisit, cancelVisit } = useVetVisits({ search: searchQuery });

  const handleViewTreatment = (treatment: VetTreatment) => setSelectedTreatment(treatment);
  const handleEditTreatment = (treatment: VetTreatment) => { setEditingTreatment(treatment); setShowCreateDialog(true); };
  const handleCreateSuccess = () => { refreshTreatments(); setEditingTreatment(null); };

  return (
    <DashboardShell>
      <MobilePageHeader title={t("sidebar.vetHealth")} />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList className="hidden lg:flex">
              <TabsTrigger value="treatments" className="gap-2">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">{t("vet.tabs.treatments")}</span>
              </TabsTrigger>
              <TabsTrigger value="vaccinations" className="gap-2">
                <Syringe className="w-4 h-4" />
                <span className="hidden sm:inline">{t("vet.tabs.vaccinations")}</span>
              </TabsTrigger>
              <TabsTrigger value="visits" className="gap-2">
                <CalendarCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{t("vet.tabs.visits")}</span>
                {todayVisits.length > 0 && (
                  <span className="ms-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">{todayVisits.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="followups" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">{t("vet.tabs.followups")}</span>
                {overdueFollowups.length > 0 && (
                  <span className="ms-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">{overdueFollowups.length}</span>
                )}
              </TabsTrigger>
              {isOwnerOrManager && (
                <TabsTrigger value="programs" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("vet.tabs.programs")}</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex gap-2 w-full sm:w-auto">
              {/* Horse Filter */}
              <Select value={horseFilter} onValueChange={setHorseFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 me-2 text-muted-foreground" />
                  <SelectValue placeholder={t("vet.filterByHorse")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("vet.allHorses")}</SelectItem>
                  {horses.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      <BilingualName name={h.name} nameAr={(h as any).name_ar} inline />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("common.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
              </div>
            </div>
          </div>

          <TabsContent value="treatments">
            {canManage && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => { setEditingTreatment(null); setShowCreateDialog(true); }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t("vet.newTreatment")}
                </Button>
              </div>
            )}
            <VetTreatmentsList
              treatments={treatments}
              loading={treatmentsLoading}
              emptyMessage={t("vet.emptyMessages.treatments")}
              onView={handleViewTreatment}
              onEdit={canManage ? handleEditTreatment : undefined}
            />
          </TabsContent>

          <TabsContent value="vaccinations">
            {canManage && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowVaccinationDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t("vet.scheduleVaccination")}
                </Button>
              </div>
            )}
            <VaccinationsList
              vaccinations={vaccinations}
              loading={vaccinationsLoading}
              onMarkAdministered={canManage ? markAsAdministered : undefined}
              onCancel={canManage ? skipVaccination : undefined}
              emptyMessage={t("vet.emptyMessages.vaccinations")}
            />
          </TabsContent>

          <TabsContent value="visits">
            {canManage && (
              <div className="flex justify-end mb-4">
                <Button variant="outline" onClick={() => setShowVisitDialog(true)} className="gap-2">
                  <CalendarCheck className="w-4 h-4" />
                  {t("vetVisits.scheduleVisit")}
                </Button>
              </div>
            )}
            <VetVisitsList visits={visits} horses={horses} loading={visitsLoading} emptyMessage={t("vet.emptyMessages.visits")} onConfirm={canManage ? confirmVisit : undefined} onStart={canManage ? startVisit : undefined} onComplete={canManage ? completeVisit : undefined} onCancel={canManage ? cancelVisit : undefined} />
          </TabsContent>

          <TabsContent value="followups">
            <VetFollowupsList followups={followups} loading={followupsLoading} onMarkDone={canManage ? markAsDone : undefined} onCancel={canManage ? markAsCancelled : undefined} emptyMessage={t("vet.emptyMessages.followups")} />
          </TabsContent>

          {isOwnerOrManager && (
            <TabsContent value="programs">
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold mb-4">{t("vet.vaccinationPrograms")}</h2>
                  <VaccinationProgramManager />
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <VetBottomNavigation activeTab={activeTab} onTabChange={handleTabChange} showSettings={isOwnerOrManager} overdueCount={overdueFollowups.length} todayVisitsCount={todayVisits.length} />
      
      <CreateVetTreatmentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} editTreatment={editingTreatment} onSuccess={handleCreateSuccess} />
      <CreateVetVisitDialog open={showVisitDialog} onOpenChange={setShowVisitDialog} onSubmit={createVisit} />
      <ScheduleVaccinationDialog open={showVaccinationDialog} onOpenChange={setShowVaccinationDialog} onSuccess={refreshVaccinations} />
      <TreatmentDetailSheet treatment={selectedTreatment} open={!!selectedTreatment} onOpenChange={(open) => { if (!open) setSelectedTreatment(null); }} onEdit={canManage ? handleEditTreatment : undefined} />
    </DashboardShell>
  );
};

export default DashboardVet;
