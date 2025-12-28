import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, Plus, Search, Stethoscope, Syringe, Calendar, Settings } from "lucide-react";
import { useVetTreatments } from "@/hooks/vet/useVetTreatments";
import { useVetFollowups } from "@/hooks/vet/useVetFollowups";
import { useHorseVaccinations } from "@/hooks/vet/useHorseVaccinations";
import { VetTreatmentsList, CreateVetTreatmentDialog, VetFollowupsList, VaccinationsList, VaccinationProgramManager } from "@/components/vet";
import { useTenant } from "@/contexts/TenantContext";

const DashboardVet = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeRole } = useTenant();

  const { treatments, loading: treatmentsLoading, canManage } = useVetTreatments({ search: searchQuery });
  const { followups, dueFollowups, overdueFollowups, loading: followupsLoading, markAsDone, markAsCancelled } = useVetFollowups();
  const { vaccinations, dueVaccinations, loading: vaccinationsLoading, markAsAdministered, cancelVaccination } = useHorseVaccinations();

  const isOwnerOrManager = activeRole === 'owner' || activeRole === 'manager';

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
        <main className="flex-1 p-4 lg:p-8">
          <Tabs defaultValue="treatments" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList>
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
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
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
              <VetTreatmentsList
                treatments={treatments}
                loading={treatmentsLoading}
                emptyMessage="No treatments yet. Create your first treatment to get started."
              />
            </TabsContent>

            <TabsContent value="vaccinations">
              <VaccinationsList
                vaccinations={vaccinations}
                loading={vaccinationsLoading}
                onMarkAdministered={canManage ? markAsAdministered : undefined}
                onCancel={canManage ? cancelVaccination : undefined}
                emptyMessage="No vaccinations scheduled"
              />
            </TabsContent>

            <TabsContent value="followups">
              <VetFollowupsList
                followups={followups}
                loading={followupsLoading}
                onMarkDone={canManage ? markAsDone : undefined}
                onCancel={canManage ? markAsCancelled : undefined}
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
      </div>

      <CreateVetTreatmentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
};

export default DashboardVet;
