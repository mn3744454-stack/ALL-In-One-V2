import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Menu, Plus, Search, Stethoscope, Syringe, Calendar, Settings, Lightbulb } from "lucide-react";
import { useVetTreatments } from "@/hooks/vet/useVetTreatments";
import { useVetFollowups } from "@/hooks/vet/useVetFollowups";
import { useHorseVaccinations } from "@/hooks/vet/useHorseVaccinations";
import { VetTreatmentsList, CreateVetTreatmentDialog, VetFollowupsList, VaccinationsList, VaccinationProgramManager, VetBottomNavigation } from "@/components/vet";
import { useTenant } from "@/contexts/TenantContext";

// Mock data for demo purposes
const mockTreatments = [
  {
    id: "mock-treat-1",
    horse: { id: "h1", name: "الأصيل", avatar_url: null },
    category: "treatment" as const,
    title: "Respiratory Infection Treatment",
    description: "Treatment for mild respiratory infection with antibiotics course",
    status: "in_progress" as const,
    priority: "high" as const,
    service_mode: "external" as const,
    external_provider: { id: "p1", name: "Dr. Ahmed - Vet Clinic" },
    scheduled_for: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tenant_id: "t1",
    created_by: "u1",
    updated_at: new Date().toISOString(),
    notes: "Monitoring improvement daily",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "mock-treat-2",
    horse: { id: "h2", name: "الفارس", avatar_url: null },
    category: "dental" as const,
    title: "Annual Dental Float",
    description: "Routine dental floating and examination",
    status: "scheduled" as const,
    priority: "medium" as const,
    service_mode: "external" as const,
    external_provider: { id: "p2", name: "Equine Dental Services" },
    scheduled_for: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tenant_id: "t1",
    created_by: "u1",
    updated_at: new Date().toISOString(),
    notes: null,
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "mock-treat-3",
    horse: { id: "h3", name: "النجمة", avatar_url: null },
    category: "hoof" as const,
    title: "Hoof Abscess Treatment",
    description: "Draining and treating hoof abscess on left front",
    status: "completed" as const,
    priority: "urgent" as const,
    service_mode: "internal" as const,
    external_provider: null,
    scheduled_for: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tenant_id: "t1",
    created_by: "u1",
    updated_at: new Date().toISOString(),
    notes: "Fully recovered, normal movement restored",
    assigned_to: { id: "a1", display_name: "محمد", avatar_url: null },
    completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-treat-4",
    horse: { id: "h4", name: "الريم", avatar_url: null },
    category: "checkup" as const,
    title: "Pre-Purchase Examination",
    description: "Complete veterinary examination for potential buyer",
    status: "draft" as const,
    priority: "low" as const,
    service_mode: "external" as const,
    external_provider: { id: "p3", name: "Mobile Vet Services" },
    scheduled_for: null,
    created_at: new Date().toISOString(),
    tenant_id: "t1",
    created_by: "u1",
    updated_at: new Date().toISOString(),
    notes: "Waiting for buyer confirmation",
    assigned_to: null,
    completed_at: null,
  },
  {
    id: "mock-treat-5",
    horse: { id: "h5", name: "الأمير", avatar_url: null },
    category: "injury" as const,
    title: "Leg Laceration Treatment",
    description: "Deep cut on right hind leg requiring stitches",
    status: "in_progress" as const,
    priority: "high" as const,
    service_mode: "internal" as const,
    external_provider: null,
    scheduled_for: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    tenant_id: "t1",
    created_by: "u1",
    updated_at: new Date().toISOString(),
    notes: "Daily wound cleaning and bandage change",
    assigned_to: { id: "a2", display_name: "أحمد", avatar_url: null },
    completed_at: null,
  },
];

const mockVaccinations = [
  {
    id: "mock-vacc-1",
    horse: { id: "h1", name: "الفارس", avatar_url: null },
    program: { id: "prog-1", name: "Tetanus", name_ar: "الكزاز" },
    status: "due" as const,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    service_mode: "internal" as const,
    notes: "Annual booster due",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    administered_date: null,
    administered_by: null,
    external_provider: null,
  },
  {
    id: "mock-vacc-2",
    horse: { id: "h2", name: "الريم", avatar_url: null },
    program: { id: "prog-2", name: "Influenza", name_ar: "الانفلونزا" },
    status: "due" as const, // Overdue is UI-calculated based on due_date
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    service_mode: "external" as const,
    notes: "Needs immediate attention - 5 days overdue",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    administered_date: null,
    administered_by: null,
    external_provider: { id: "p1", name: "Dr. Ahmed - Vet Clinic" },
  },
  {
    id: "mock-vacc-3",
    horse: { id: "h3", name: "النجمة", avatar_url: null },
    program: { id: "prog-3", name: "Rabies", name_ar: "داء الكلب" },
    status: "due" as const,
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    service_mode: "external" as const,
    notes: "Schedule with regular vet visit",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    administered_date: null,
    administered_by: null,
    external_provider: { id: "p2", name: "Mobile Vet Services" },
  },
  {
    id: "mock-vacc-4",
    horse: { id: "h4", name: "الأصيل", avatar_url: null },
    program: { id: "prog-4", name: "West Nile Virus", name_ar: "فيروس غرب النيل" },
    status: "due" as const, // Overdue is UI-calculated based on due_date
    due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    service_mode: "internal" as const,
    notes: "Critical - 10 days overdue",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    administered_date: null,
    administered_by: null,
    external_provider: null,
  },
];

const mockFollowups = [
  {
    id: "mock-follow-1",
    treatment: { 
      id: "t1", 
      title: "Leg Laceration Treatment",
      horse: { id: "h1", name: "الأمير", avatar_url: null }
    },
    type: "wound_check" as const,
    status: "open" as const,
    due_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Check wound healing progress and change bandage",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    created_by: "u1",
    completed_at: null,
    cancelled_reason: null,
  },
  {
    id: "mock-follow-2",
    treatment: { 
      id: "t2", 
      title: "Post-Surgery Recovery",
      horse: { id: "h2", name: "النجمة", avatar_url: null }
    },
    type: "suture_removal" as const,
    status: "open" as const,
    due_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Remove stitches - 2 days overdue!",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    created_by: "u1",
    completed_at: null,
    cancelled_reason: null,
  },
  {
    id: "mock-follow-3",
    treatment: { 
      id: "t3", 
      title: "Respiratory Treatment",
      horse: { id: "h3", name: "الأصيل", avatar_url: null }
    },
    type: "recheck" as const,
    status: "open" as const,
    due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Follow-up examination after antibiotics course",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    created_by: "u1",
    completed_at: null,
    cancelled_reason: null,
  },
  {
    id: "mock-follow-4",
    treatment: { 
      id: "t4", 
      title: "Colic Episode",
      horse: { id: "h4", name: "الفارس", avatar_url: null }
    },
    type: "blood_test" as const,
    status: "open" as const,
    due_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Blood work to confirm recovery - overdue",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    created_by: "u1",
    completed_at: null,
    cancelled_reason: null,
  },
];

const DashboardVet = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeRole } = useTenant();

  const isOwnerOrManager = activeRole === 'owner' || activeRole === 'manager';

  const availableTabs = useMemo(() => {
    const tabs = ['treatments', 'vaccinations', 'followups'];
    if (isOwnerOrManager) tabs.push('settings');
    return tabs;
  }, [isOwnerOrManager]);

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && availableTabs.includes(urlTab)) {
      return urlTab;
    }
    return availableTabs[0];
  }, [searchParams, availableTabs]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const { treatments, loading: treatmentsLoading, canManage } = useVetTreatments({ search: searchQuery });
  const { followups, dueFollowups, overdueFollowups, loading: followupsLoading, markAsDone, markAsCancelled } = useVetFollowups();
  const { vaccinations, dueVaccinations, loading: vaccinationsLoading, markAsAdministered, skipVaccination } = useHorseVaccinations();

  // Use mock data when no real data exists
  const displayTreatments = treatments.length > 0 ? treatments : mockTreatments;
  const displayVaccinations = vaccinations.length > 0 ? vaccinations : mockVaccinations;
  const displayFollowups = followups.length > 0 ? followups : mockFollowups;

  const isUsingMockTreatments = treatments.length === 0 && !treatmentsLoading;
  const isUsingMockVaccinations = vaccinations.length === 0 && !vaccinationsLoading;
  const isUsingMockFollowups = followups.length === 0 && !followupsLoading;

  return (
    <div className="flex min-h-screen bg-cream">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="p-2 rounded-xl hover:bg-navy/5 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-navy" />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold text-navy">Vet & Health</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage treatments, vaccinations, and follow-ups
                </p>
              </div>
            </div>

            {canManage && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Treatment</span>
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList className="hidden lg:flex">
                <TabsTrigger value="treatments" className="gap-2">
                  <Stethoscope className="w-4 h-4" />
                  <span className="hidden sm:inline">Treatments</span>
                </TabsTrigger>
                <TabsTrigger value="vaccinations" className="gap-2">
                  <Syringe className="w-4 h-4" />
                  <span className="hidden sm:inline">Vaccinations</span>
                </TabsTrigger>
                <TabsTrigger value="followups" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Follow-ups</span>
                  {overdueFollowups.length > 0 && (
                    <span className="ms-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                      {overdueFollowups.length}
                    </span>
                  )}
                </TabsTrigger>
                {isOwnerOrManager && (
                  <TabsTrigger value="settings" className="gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value="treatments">
              {isUsingMockTreatments && (
                <Alert className="bg-amber-50 border-amber-200 mb-4">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    هذه بيانات تجريبية للعرض. قم بإنشاء أول علاج للبدء!
                    <span className="block text-xs mt-1 opacity-75">These are demo treatments. Create your first treatment to get started!</span>
                  </AlertDescription>
                </Alert>
              )}
              <VetTreatmentsList
                treatments={displayTreatments as any}
                loading={treatmentsLoading}
                emptyMessage="No treatments yet. Create your first treatment to get started."
              />
            </TabsContent>

            <TabsContent value="vaccinations">
              {isUsingMockVaccinations && (
                <Alert className="bg-amber-50 border-amber-200 mb-4">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    هذه بيانات تجريبية للعرض. قم بجدولة أول تطعيم للبدء!
                    <span className="block text-xs mt-1 opacity-75">These are demo vaccinations. Schedule your first vaccination to get started!</span>
                  </AlertDescription>
                </Alert>
              )}
              <VaccinationsList
                vaccinations={displayVaccinations as any}
                loading={vaccinationsLoading}
                onMarkAdministered={!isUsingMockVaccinations && canManage ? markAsAdministered : undefined}
                onCancel={!isUsingMockVaccinations && canManage ? skipVaccination : undefined}
                emptyMessage="No vaccinations scheduled"
              />
            </TabsContent>

            <TabsContent value="followups">
              {isUsingMockFollowups && (
                <Alert className="bg-amber-50 border-amber-200 mb-4">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    هذه بيانات تجريبية للعرض. المتابعات تُنشأ تلقائياً من العلاجات.
                    <span className="block text-xs mt-1 opacity-75">These are demo follow-ups. Follow-ups are created automatically from treatments!</span>
                  </AlertDescription>
                </Alert>
              )}
              <VetFollowupsList
                followups={displayFollowups as any}
                loading={followupsLoading}
                onMarkDone={!isUsingMockFollowups && canManage ? markAsDone : undefined}
                onCancel={!isUsingMockFollowups && canManage ? markAsCancelled : undefined}
                emptyMessage="No follow-ups scheduled"
              />
            </TabsContent>

            {isOwnerOrManager && (
              <TabsContent value="settings">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-navy mb-4">Vaccination Programs</h2>
                    <VaccinationProgramManager />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </main>

        {/* Bottom Navigation for Mobile */}
        <VetBottomNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          showSettings={isOwnerOrManager}
          overdueCount={overdueFollowups.length}
        />
      </div>

      <CreateVetTreatmentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
};

export default DashboardVet;
