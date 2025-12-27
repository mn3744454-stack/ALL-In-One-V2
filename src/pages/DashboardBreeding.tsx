import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Heart, Baby, Syringe, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/contexts/TenantContext";
import { useBreedingAttempts } from "@/hooks/breeding/useBreedingAttempts";
import { usePregnancies } from "@/hooks/breeding/usePregnancies";
import { useEmbryoTransfers } from "@/hooks/breeding/useEmbryoTransfers";
import { useSemenInventory } from "@/hooks/breeding/useSemenInventory";
import { BreedingAttemptCard } from "@/components/breeding/BreedingAttemptCard";
import { PregnancyCard } from "@/components/breeding/PregnancyCard";
import { EmbryoTransferCard } from "@/components/breeding/EmbryoTransferCard";
import { SemenBatchCard } from "@/components/breeding/SemenBatchCard";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";

export default function DashboardBreeding() {
  const { activeTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("attempts");
  
  const { attempts, loading: attemptsLoading, canManage, updateAttempt, deleteAttempt } = useBreedingAttempts();
  const { pregnancies, loading: pregnanciesLoading, closePregnancy } = usePregnancies();
  const { transfers, loading: transfersLoading, updateTransfer, deleteTransfer } = useEmbryoTransfers();
  const { batches, loading: inventoryLoading, deleteBatch } = useSemenInventory();

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please select a tenant to continue</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Breeding & Reproduction | Dashboard</title>
        <meta name="description" content="Manage breeding attempts, pregnancies, embryo transfers, and semen inventory" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TenantSwitcher />
                <RoleSwitcher />
              </div>
              <h1 className="text-xl font-bold">Breeding & Reproduction</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="attempts" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Attempts
                </TabsTrigger>
                <TabsTrigger value="pregnancies" className="gap-2">
                  <Baby className="h-4 w-4" />
                  Pregnancies
                </TabsTrigger>
                <TabsTrigger value="embryo" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Embryo Transfers
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2">
                  <Syringe className="h-4 w-4" />
                  Semen Inventory
                </TabsTrigger>
              </TabsList>

              {canManage && (
                <Button className="gap-2">
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
        </main>
      </div>
    </>
  );
}
