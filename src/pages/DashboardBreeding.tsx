import { useState } from "react";
import { Link } from "react-router-dom";
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
import { CreateBreedingAttemptDialog } from "@/components/breeding/CreateBreedingAttemptDialog";
import { CreatePregnancyDialog } from "@/components/breeding/CreatePregnancyDialog";
import { CreateEmbryoTransferDialog } from "@/components/breeding/CreateEmbryoTransferDialog";
import { CreateSemenBatchDialog } from "@/components/breeding/CreateSemenBatchDialog";

export default function DashboardBreeding() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("attempts");
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [showPregnancyDialog, setShowPregnancyDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const { activeTenant } = useTenant();
  
  const { attempts, loading: attemptsLoading, canManage, updateAttempt, deleteAttempt } = useBreedingAttempts();
  const { pregnancies, loading: pregnanciesLoading, closePregnancy } = usePregnancies();
  const { transfers, loading: transfersLoading, updateTransfer, deleteTransfer } = useEmbryoTransfers();
  const { batches, loading: inventoryLoading, deleteBatch } = useSemenInventory();

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
          {/* Top Bar */}
          <header className="shrink-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
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
          <div className="flex-1 overflow-y-auto min-h-0">
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

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <TabsList className="w-full sm:w-auto">
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
                      {attemptsLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : attempts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No breeding attempts recorded yet</p>
                          {canManage && (
                            <Button variant="outline" className="mt-4" onClick={() => setShowAttemptDialog(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Attempt
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {attempts.map((attempt) => (
                            <BreedingAttemptCard
                              key={attempt.id}
                              attempt={attempt}
                              canManage={canManage}
                              onUpdateResult={(id, result) => updateAttempt(id, { result })}
                              onDelete={deleteAttempt}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="pregnancies">
                      {pregnanciesLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : pregnancies.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Baby className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No pregnancy records yet</p>
                          {canManage && (
                            <Button variant="outline" className="mt-4" onClick={() => setShowPregnancyDialog(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Record
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {pregnancies.map((pregnancy) => (
                            <PregnancyCard
                              key={pregnancy.id}
                              pregnancy={pregnancy}
                              canManage={canManage}
                              onClose={closePregnancy}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="embryo">
                      {transfersLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : transfers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No embryo transfers recorded yet</p>
                          {canManage && (
                            <Button variant="outline" className="mt-4" onClick={() => setShowTransferDialog(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Transfer
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {transfers.map((transfer) => (
                            <EmbryoTransferCard
                              key={transfer.id}
                              transfer={transfer}
                              canManage={canManage}
                              onUpdateStatus={(id, status) => updateTransfer(id, { status })}
                              onDelete={deleteTransfer}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="inventory">
                      {inventoryLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
                        </div>
                      ) : batches.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Syringe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No semen batches in inventory</p>
                          {canManage && (
                            <Button variant="outline" className="mt-4" onClick={() => setShowBatchDialog(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Batch
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {batches.map((batch) => (
                            <SemenBatchCard
                              key={batch.id}
                              batch={batch}
                              canManage={canManage}
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
