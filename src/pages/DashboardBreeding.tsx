import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plus, Heart, Baby, Syringe, FlaskConical, Stethoscope, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useTenant } from "@/contexts/TenantContext";
import { useBreedingAttempts, BreedingAttempt } from "@/hooks/breeding/useBreedingAttempts";
import { usePregnancies, Pregnancy } from "@/hooks/breeding/usePregnancies";
import { useEmbryoTransfers } from "@/hooks/breeding/useEmbryoTransfers";
import { useSemenInventory } from "@/hooks/breeding/useSemenInventory";
import { useFoalings, Foaling } from "@/hooks/breeding/useFoalings";
import { useBreedingContracts, BreedingContract } from "@/hooks/breeding/useBreedingContracts";
import { BreedingAttemptCard } from "@/components/breeding/BreedingAttemptCard";
import { PregnancyCard } from "@/components/breeding/PregnancyCard";
import { EmbryoTransferCard } from "@/components/breeding/EmbryoTransferCard";
import { SemenBatchCard } from "@/components/breeding/SemenBatchCard";
import { FoalingCard } from "@/components/breeding/FoalingCard";
import { BreedingContractCard } from "@/components/breeding/BreedingContractCard";
import { BreedingBottomNavigation } from "@/components/breeding/BreedingBottomNavigation";
import { CreateBreedingAttemptDialog } from "@/components/breeding/CreateBreedingAttemptDialog";
import { CreatePregnancyDialog } from "@/components/breeding/CreatePregnancyDialog";
import { CreateEmbryoTransferDialog } from "@/components/breeding/CreateEmbryoTransferDialog";
import { CreateSemenBatchDialog } from "@/components/breeding/CreateSemenBatchDialog";
import { RecordFoalingDialog } from "@/components/breeding/RecordFoalingDialog";
import { RegisterFoalDialog } from "@/components/breeding/RegisterFoalDialog";
import { CreateBreedingContractDialog } from "@/components/breeding/CreateBreedingContractDialog";
import { BreedingRecordDetailSheet, PregnancyDetailSheet } from "@/components/breeding/BreedingDetailSheets";
import { FoalingDetailSheet } from "@/components/breeding/FoalingDetailSheet";
import { BreedingContractDetailSheet } from "@/components/breeding/BreedingContractDetailSheet";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";

export default function DashboardBreeding() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [showPregnancyDialog, setShowPregnancyDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<BreedingAttempt | null>(null);
  const [selectedPregnancy, setSelectedPregnancy] = useState<Pregnancy | null>(null);
  const [selectedFoaling, setSelectedFoaling] = useState<Foaling | null>(null);
  const [selectedContract, setSelectedContract] = useState<BreedingContract | null>(null);
  // Foaling recording from a pregnancy
  const [foalingPregnancy, setFoalingPregnancy] = useState<Pregnancy | null>(null);
  // Register foal from foaling card
  const [registerFoalFoaling, setRegisterFoalFoaling] = useState<Foaling | null>(null);

  const { activeTenant } = useTenant();
  const { t } = useI18n();

  const availableTabs = useMemo(() => ['attempts', 'pregnancies', 'foalings', 'contracts', 'embryo', 'inventory'], []);

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
  
  const { attempts, loading: attemptsLoading, canManage, updateAttempt, deleteAttempt } = useBreedingAttempts();
  const { pregnancies, loading: pregnanciesLoading, canManage: pregCanManage, closePregnancy, refresh: refreshPregnancies } = usePregnancies();
  const { transfers, loading: transfersLoading, updateTransfer, deleteTransfer } = useEmbryoTransfers();
  const { batches, loading: inventoryLoading, deleteBatch } = useSemenInventory();
  const { foalings, loading: foalingsLoading, canManage: foalCanManage, refresh: refreshFoalings } = useFoalings();
  const { contracts, loading: contractsLoading, canManage: contractCanManage } = useBreedingContracts();

  const handleAddNew = () => {
    switch (activeTab) {
      case "attempts": setShowAttemptDialog(true); break;
      case "pregnancies": setShowPregnancyDialog(true); break;
      case "embryo": setShowTransferDialog(true); break;
      case "inventory": setShowBatchDialog(true); break;
      case "contracts": setShowContractDialog(true); break;
      // foalings are created from pregnancies, not standalone
    }
  };

  // Handle "Mark as Foaled" from pregnancy card — opens foaling dialog
  const handleMarkFoaled = (pregnancyId: string) => {
    const preg = pregnancies.find(p => p.id === pregnancyId);
    if (preg) {
      setFoalingPregnancy(preg);
    }
  };

  const renderEmptyState = (messageKey: string) => (
    <div className="text-center py-12">
      <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{t(messageKey)}</p>
    </div>
  );

  // Show Add button for all tabs except foalings (foalings are created from pregnancies)
  const showAddButton = canManage && activeTab !== "foalings";

  return (
    <>
      <Helmet>
        <title>{t("breeding.title")} | Dashboard</title>
        <meta name="description" content={t("breeding.dashboardSubtitle")} />
      </Helmet>

      <DashboardShell>
        <MobilePageHeader title={t("sidebar.breeding")} />

        <div className="flex-1 pb-24 lg:pb-0">
          <div className="p-4 lg:p-8">
            {!activeTenant ? (
              <div className="text-center py-12">
                <Baby className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  {t("breeding.noOrgSelected")}
                </h2>
                <p className="text-muted-foreground mb-4">{t("breeding.noOrgDesc")}</p>
                <Link to="/select-role">
                  <Button variant="gold">{t("breeding.createOrg")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">{t("breeding.dashboardTitle")}</h1>
                    <p className="text-sm text-muted-foreground">{t("breeding.dashboardSubtitle")}</p>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <TabsList className="hidden lg:flex">
                      <TabsTrigger value="attempts" className="gap-2"><Heart className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.records")}</span></TabsTrigger>
                      <TabsTrigger value="pregnancies" className="gap-2"><Baby className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.pregnancies")}</span></TabsTrigger>
                      <TabsTrigger value="foalings" className="gap-2"><Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.foalings")}</span></TabsTrigger>
                      <TabsTrigger value="contracts" className="gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.contracts")}</span></TabsTrigger>
                      <TabsTrigger value="embryo" className="gap-2"><FlaskConical className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.embryo")}</span></TabsTrigger>
                      <TabsTrigger value="inventory" className="gap-2"><Syringe className="h-4 w-4" /><span className="hidden sm:inline">{t("breeding.tabs.inventory")}</span></TabsTrigger>
                    </TabsList>

                    {showAddButton && (
                      <Button className="gap-2" onClick={handleAddNew}>
                        <Plus className="h-4 w-4" />
                        {t("breeding.addNew")}
                      </Button>
                    )}
                  </div>

                  <TabsContent value="attempts">
                    {attemptsLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : attempts.length === 0 ? (
                      renderEmptyState("breeding.empty.records")
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {attempts.map((attempt) => (
                          <BreedingAttemptCard
                            key={attempt.id}
                            attempt={attempt}
                            canManage={canManage}
                            onClick={setSelectedAttempt}
                            onUpdateResult={(id, result) => updateAttempt(id, { result })}
                            onDelete={deleteAttempt}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pregnancies">
                    {pregnanciesLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : pregnancies.length === 0 ? (
                      renderEmptyState("breeding.empty.pregnancies")
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pregnancies.map((pregnancy) => (
                          <PregnancyCard
                            key={pregnancy.id}
                            pregnancy={pregnancy}
                            canManage={pregCanManage}
                            onView={setSelectedPregnancy}
                            onClose={(id, reason) => {
                              if (reason === "foaled") {
                                handleMarkFoaled(id);
                              } else {
                                closePregnancy(id, reason);
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="foalings">
                    {foalingsLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : foalings.length === 0 ? (
                      renderEmptyState("breeding.empty.foalings")
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {foalings.map((foaling) => (
                          <FoalingCard
                            key={foaling.id}
                            foaling={foaling}
                            canManage={foalCanManage}
                            onClick={setSelectedFoaling}
                            onRegisterFoal={setRegisterFoalFoaling}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="contracts">
                    {contractsLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : contracts.length === 0 ? (
                      renderEmptyState("breeding.empty.contracts")
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {contracts.map((contract) => (
                          <BreedingContractCard
                            key={contract.id}
                            contract={contract}
                            onClick={setSelectedContract}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="embryo">
                    {transfersLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : transfers.length === 0 ? (
                      renderEmptyState("breeding.empty.transfers")
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
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>
                    ) : batches.length === 0 ? (
                      renderEmptyState("breeding.empty.batches")
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {batches.map((batch) => (
                          <SemenBatchCard key={batch.id} batch={batch} canManage={canManage} onDelete={deleteBatch} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>

          <BreedingBottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Dialogs */}
        <CreateBreedingAttemptDialog open={showAttemptDialog} onOpenChange={setShowAttemptDialog} />
        <CreatePregnancyDialog open={showPregnancyDialog} onOpenChange={setShowPregnancyDialog} />
        <CreateEmbryoTransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} />
        <CreateSemenBatchDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} />
        <CreateBreedingContractDialog open={showContractDialog} onOpenChange={setShowContractDialog} />

        {/* Foaling dialogs */}
        <RecordFoalingDialog
          open={!!foalingPregnancy}
          onOpenChange={(open) => { if (!open) setFoalingPregnancy(null); }}
          pregnancy={foalingPregnancy}
          onSuccess={() => { refreshPregnancies(); refreshFoalings(); }}
        />
        <RegisterFoalDialog
          open={!!registerFoalFoaling}
          onOpenChange={(open) => { if (!open) setRegisterFoalFoaling(null); }}
          foaling={registerFoalFoaling}
          onSuccess={refreshFoalings}
        />

        {/* Detail Sheets */}
        <BreedingRecordDetailSheet
          attempt={selectedAttempt}
          open={!!selectedAttempt}
          onOpenChange={(open) => { if (!open) setSelectedAttempt(null); }}
          canManage={canManage}
        />
        <PregnancyDetailSheet
          pregnancy={selectedPregnancy}
          open={!!selectedPregnancy}
          onOpenChange={(open) => { if (!open) setSelectedPregnancy(null); }}
          canManage={pregCanManage}
        />
        <FoalingDetailSheet
          foaling={selectedFoaling}
          open={!!selectedFoaling}
          onOpenChange={(open) => { if (!open) setSelectedFoaling(null); }}
          canManage={foalCanManage}
        />
        <BreedingContractDetailSheet
          contract={selectedContract}
          open={!!selectedContract}
          onOpenChange={(open) => { if (!open) setSelectedContract(null); }}
          canManage={contractCanManage}
        />
      </DashboardShell>
    </>
  );
}
