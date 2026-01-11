import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plus, Heart, Baby, Syringe, FlaskConical, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useTenant } from "@/contexts/TenantContext";
import { useBreedingAttempts } from "@/hooks/breeding/useBreedingAttempts";
import { usePregnancies } from "@/hooks/breeding/usePregnancies";
import { useEmbryoTransfers } from "@/hooks/breeding/useEmbryoTransfers";
import { useSemenInventory } from "@/hooks/breeding/useSemenInventory";
import { BreedingAttemptCard } from "@/components/breeding/BreedingAttemptCard";
import { PregnancyCard } from "@/components/breeding/PregnancyCard";
import { EmbryoTransferCard } from "@/components/breeding/EmbryoTransferCard";
import { SemenBatchCard } from "@/components/breeding/SemenBatchCard";
import { BreedingBottomNavigation } from "@/components/breeding/BreedingBottomNavigation";
import { CreateBreedingAttemptDialog } from "@/components/breeding/CreateBreedingAttemptDialog";
import { CreatePregnancyDialog } from "@/components/breeding/CreatePregnancyDialog";
import { CreateEmbryoTransferDialog } from "@/components/breeding/CreateEmbryoTransferDialog";
import { CreateSemenBatchDialog } from "@/components/breeding/CreateSemenBatchDialog";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";

// Mock data for demo purposes
const mockAttempts = [
  {
    id: "mock-1",
    mare: { name: "الريم", avatar_url: null },
    stallion: { name: "الأصيل", avatar_url: null },
    attempt_type: "natural",
    attempt_date: "2024-12-20",
    result: "pending",
    notes: "First breeding attempt of the season",
    created_by_profile: { full_name: "Ahmed" },
  },
  {
    id: "mock-2",
    mare: { name: "الفرسة الذهبية", avatar_url: null },
    stallion: { name: "البرق", avatar_url: null },
    attempt_type: "ai_fresh",
    attempt_date: "2024-12-18",
    result: "confirmed",
    notes: "Successful AI procedure",
    created_by_profile: { full_name: "Mohammed" },
  },
  {
    id: "mock-3",
    mare: { name: "نجمة الصحراء", avatar_url: null },
    stallion: null,
    external_stallion_name: "Champion Star",
    attempt_type: "ai_frozen",
    attempt_date: "2024-12-15",
    result: "failed",
    notes: "External stallion semen used",
    created_by_profile: { full_name: "Khalid" },
  },
];

const mockPregnancies = [
  {
    id: "mock-p1",
    mare: { name: "الريم", avatar_url: null },
    start_date: "2024-10-15",
    expected_due_date: "2025-09-15",
    status: "active",
    notes: "Healthy pregnancy, regular checkups",
    created_by_profile: { full_name: "Ahmed" },
  },
  {
    id: "mock-p2",
    mare: { name: "الفرسة الذهبية", avatar_url: null },
    start_date: "2024-11-01",
    expected_due_date: "2025-10-01",
    status: "active",
    notes: "Twin pregnancy confirmed",
    created_by_profile: { full_name: "Mohammed" },
  },
];

const mockTransfers = [
  {
    id: "mock-t1",
    donor_mare: { name: "نجمة الصحراء", avatar_url: null },
    recipient_mare: { name: "الأميرة", avatar_url: null },
    flush_date: "2024-12-10",
    transfer_date: "2024-12-11",
    embryo_grade: "excellent",
    embryo_count: 2,
    status: "transferred",
    notes: "High quality embryos",
    created_by_profile: { full_name: "Dr. Sarah" },
  },
  {
    id: "mock-t2",
    donor_mare: { name: "الريم", avatar_url: null },
    recipient_mare: { name: "القمر", avatar_url: null },
    flush_date: "2024-12-05",
    transfer_date: null,
    embryo_grade: "good",
    embryo_count: 1,
    status: "pending",
    notes: "Awaiting recipient preparation",
    created_by_profile: { full_name: "Dr. Sarah" },
  },
];

const mockBatches = [
  {
    id: "mock-b1",
    stallion: { name: "الأصيل", avatar_url: null },
    collection_date: "2024-12-01",
    type: "frozen",
    doses_total: 20,
    doses_available: 15,
    quality_notes: "Excellent motility 85%, concentration 500M/ml",
    tank: { name: "Tank A", location: "Main Facility" },
    created_by_profile: { full_name: "Dr. Ahmed" },
  },
  {
    id: "mock-b2",
    stallion: { name: "البرق", avatar_url: null },
    collection_date: "2024-12-10",
    type: "fresh",
    doses_total: 5,
    doses_available: 3,
    quality_notes: "Fresh collection, use within 48 hours",
    tank: null,
    created_by_profile: { full_name: "Dr. Ahmed" },
  },
  {
    id: "mock-b3",
    stallion: { name: "الأصيل", avatar_url: null },
    collection_date: "2024-11-15",
    type: "frozen",
    doses_total: 30,
    doses_available: 28,
    quality_notes: "Premium quality, 90% motility",
    tank: { name: "Tank B", location: "Storage Room" },
    created_by_profile: { full_name: "Dr. Ahmed" },
  },
];

export default function DashboardBreeding() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [showPregnancyDialog, setShowPregnancyDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const { activeTenant } = useTenant();
  const { t } = useI18n();

  const availableTabs = useMemo(() => ['attempts', 'pregnancies', 'embryo', 'inventory'], []);

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
  
  const { attempts, loading: attemptsLoading, canManage, updateAttempt, deleteAttempt } = useBreedingAttempts();
  const { pregnancies, loading: pregnanciesLoading, closePregnancy } = usePregnancies();
  const { transfers, loading: transfersLoading, updateTransfer, deleteTransfer } = useEmbryoTransfers();
  const { batches, loading: inventoryLoading, deleteBatch } = useSemenInventory();

  // Use mock data if real data is empty
  const displayAttempts = useMemo(() => 
    attempts.length > 0 ? attempts : mockAttempts, [attempts]
  );
  const displayPregnancies = useMemo(() => 
    pregnancies.length > 0 ? pregnancies : mockPregnancies, [pregnancies]
  );
  const displayTransfers = useMemo(() => 
    transfers.length > 0 ? transfers : mockTransfers, [transfers]
  );
  const displayBatches = useMemo(() => 
    batches.length > 0 ? batches : mockBatches, [batches]
  );

  const isUsingMockData = {
    attempts: attempts.length === 0,
    pregnancies: pregnancies.length === 0,
    transfers: transfers.length === 0,
    batches: batches.length === 0,
  };

  const handleAddNew = () => {
    switch (activeTab) {
      case "attempts":
        setShowAttemptDialog(true);
        break;
      case "pregnancies":
        setShowPregnancyDialog(true);
        break;
      case "embryo":
        setShowTransferDialog(true);
        break;
      case "inventory":
        setShowBatchDialog(true);
        break;
    }
  };

  return (
    <>
      <Helmet>
        <title>Breeding & Reproduction | Dashboard</title>
        <meta name="description" content="Manage breeding attempts, pregnancies, embryo transfers, and semen inventory" />
      </Helmet>

      <div className="h-dvh w-full bg-cream flex overflow-hidden">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Mobile Page Header */}
          <MobilePageHeader title={t("sidebar.breeding")} />

          {/* Top Bar - Desktop/Tablet */}
          <header className="shrink-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden md:block">
            <div className="flex items-center justify-between h-16 px-4 lg:px-8">
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <button
                  className="p-2 rounded-xl hover:bg-muted lg:hidden shrink-0"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                
                <TenantSwitcher />
                
                <div className="hidden md:block">
                  <RoleSwitcher />
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                
                <InvitationsPanel />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 pb-24 lg:pb-0">
            <div className="p-4 lg:p-8">
              {!activeTenant ? (
                <div className="text-center py-12">
                  <Baby className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-display text-xl font-semibold text-navy mb-2">
                    No Organization Selected
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Please create or join an organization to manage breeding records.
                  </p>
                  <Link to="/select-role">
                    <Button variant="gold">Create Organization</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-navy">Breeding & Reproduction</h1>
                      <p className="text-sm text-muted-foreground">
                        Manage breeding attempts, pregnancies, embryo transfers, and semen inventory
                      </p>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <TabsList className="hidden lg:flex">
                        <TabsTrigger value="attempts" className="gap-2">
                          <Heart className="h-4 w-4" />
                          <span className="hidden sm:inline">Attempts</span>
                        </TabsTrigger>
                        <TabsTrigger value="pregnancies" className="gap-2">
                          <Baby className="h-4 w-4" />
                          <span className="hidden sm:inline">Pregnancies</span>
                        </TabsTrigger>
                        <TabsTrigger value="embryo" className="gap-2">
                          <FlaskConical className="h-4 w-4" />
                          <span className="hidden sm:inline">Embryo</span>
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="gap-2">
                          <Syringe className="h-4 w-4" />
                          <span className="hidden sm:inline">Inventory</span>
                        </TabsTrigger>
                      </TabsList>

                      {canManage && (
                        <Button className="gap-2" onClick={handleAddNew}>
                          <Plus className="h-4 w-4" />
                          Add New
                        </Button>
                      )}
                    </div>

                    <TabsContent value="attempts">
                      {isUsingMockData.attempts && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          📋 Showing demo data. Add your first breeding attempt to see real records.
                        </div>
                      )}
                      {attemptsLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {displayAttempts.map((attempt) => (
                            <BreedingAttemptCard
                              key={attempt.id}
                              attempt={attempt}
                              canManage={canManage && !isUsingMockData.attempts}
                              onUpdateResult={(id, result) => updateAttempt(id, { result })}
                              onDelete={deleteAttempt}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="pregnancies">
                      {isUsingMockData.pregnancies && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          📋 Showing demo data. Add your first pregnancy record to see real records.
                        </div>
                      )}
                      {pregnanciesLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {displayPregnancies.map((pregnancy) => (
                            <PregnancyCard
                              key={pregnancy.id}
                              pregnancy={pregnancy}
                              canManage={canManage && !isUsingMockData.pregnancies}
                              onClose={closePregnancy}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="embryo">
                      {isUsingMockData.transfers && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          📋 Showing demo data. Add your first embryo transfer to see real records.
                        </div>
                      )}
                      {transfersLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {displayTransfers.map((transfer) => (
                            <EmbryoTransferCard
                              key={transfer.id}
                              transfer={transfer}
                              canManage={canManage && !isUsingMockData.transfers}
                              onUpdateStatus={(id, status) => updateTransfer(id, { status })}
                              onDelete={deleteTransfer}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="inventory">
                      {isUsingMockData.batches && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          📋 Showing demo data. Add your first semen batch to see real records.
                        </div>
                      )}
                      {inventoryLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {displayBatches.map((batch) => (
                            <SemenBatchCard
                              key={batch.id}
                              batch={batch}
                              canManage={canManage && !isUsingMockData.batches}
                              onDelete={deleteBatch}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation for Mobile */}
          <BreedingBottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </main>
      </div>

      {/* Dialogs */}
      <CreateBreedingAttemptDialog
        open={showAttemptDialog}
        onOpenChange={setShowAttemptDialog}
      />
      <CreatePregnancyDialog
        open={showPregnancyDialog}
        onOpenChange={setShowPregnancyDialog}
      />
      <CreateEmbryoTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
      />
      <CreateSemenBatchDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
      />
    </>
  );
}
