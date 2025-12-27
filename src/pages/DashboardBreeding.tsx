import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plus, Heart, Baby, Syringe, FlaskConical, Building2, Home, Calendar, FileText, Users, Settings, Search, TrendingUp, Menu, LogOut, MessageSquare, Globe, X, Package, GraduationCap, Ticket, CreditCard, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "@/components/Logo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { NavGroup } from "@/components/dashboard/NavGroup";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
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

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
  highlight?: boolean;
}

const NavItem = ({
  icon: Icon,
  label,
  href,
  active,
  badge,
  onNavigate,
  highlight,
}: NavItemProps) => {
  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
        active
          ? "bg-gold text-navy font-semibold"
          : highlight
          ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
          : "text-cream/70 hover:bg-navy-light hover:text-cream"
      }`}
      onClick={onNavigate}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gold/20 text-gold">
          {badge}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} onClick={onNavigate}>
        {content}
      </Link>
    );
  }

  return content;
};

export default function DashboardBreeding() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("attempts");
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [showPregnancyDialog, setShowPregnancyDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { horses } = useHorses();
  
  const { attempts, loading: attemptsLoading, canManage, updateAttempt, deleteAttempt } = useBreedingAttempts();
  const { pregnancies, loading: pregnanciesLoading, closePregnancy } = usePregnancies();
  const { transfers, loading: transfersLoading, updateTransfer, deleteTransfer } = useEmbryoTransfers();
  const { batches, loading: inventoryLoading, deleteBatch } = useSemenInventory();

  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;

  const handleSignOut = async () => {
    await signOut();
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

  const horsesNavItems = [
    { icon: Heart, label: "My Horses", href: "/dashboard/horses", badge: horses.length },
    { icon: ClipboardList, label: "Orders", href: "/dashboard/horse-orders" },
    { icon: Baby, label: "Breeding", href: "/dashboard/breeding" },
  ];

  return (
    <>
      <Helmet>
        <title>Breeding & Reproduction | Dashboard</title>
        <meta name="description" content="Manage breeding attempts, pregnancies, embryo transfers, and semen inventory" />
      </Helmet>

      <div className="h-dvh w-full bg-cream flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy transform transition-transform duration-300 lg:translate-x-0 lg:static ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-navy-light flex items-center justify-between">
              <Logo variant="light" />
              <button
                className="p-2 rounded-xl hover:bg-navy-light lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-cream" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <NavItem icon={Home} label="Dashboard" href="/dashboard" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={MessageSquare} label="Community" href="/community" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={Ticket} label="My Bookings" href="/dashboard/my-bookings" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={CreditCard} label="Payments" href="/dashboard/payments" onNavigate={() => setSidebarOpen(false)} />
              
              {/* Horses NavGroup */}
              <NavGroup
                icon={Heart}
                label="Horses"
                items={horsesNavItems}
                onNavigate={() => setSidebarOpen(false)}
              />
              
              <NavItem icon={Calendar} label="Schedule" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={FileText} label="Records" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={Users} label="Team" onNavigate={() => setSidebarOpen(false)} />
              <NavItem icon={Building2} label="Facilities" onNavigate={() => setSidebarOpen(false)} />
              
              {['owner', 'manager'].includes(activeRole || '') && activeTenant && (
                <>
                  <NavItem icon={Package} label="Services" href="/dashboard/services" onNavigate={() => setSidebarOpen(false)} />
                  <NavItem icon={TrendingUp} label="Revenue" href="/dashboard/revenue" onNavigate={() => setSidebarOpen(false)} />
                </>
              )}
              
              {['owner', 'manager'].includes(activeRole || '') && activeTenant?.tenant.type === 'academy' && (
                <>
                  <NavItem icon={GraduationCap} label="Sessions" href="/dashboard/academy/sessions" onNavigate={() => setSidebarOpen(false)} />
                  <NavItem icon={Ticket} label="Manage Bookings" href="/dashboard/academy/bookings" onNavigate={() => setSidebarOpen(false)} />
                </>
              )}
              
              {activeRole === 'owner' && activeTenant && (
                <NavItem 
                  icon={Globe} 
                  label="Public Profile" 
                  href="/dashboard/public-profile" 
                  onNavigate={() => setSidebarOpen(false)}
                  highlight={needsPublicProfileSetup}
                />
              )}
              
              <div className="pt-4 mt-4 border-t border-navy-light">
                <NavItem icon={Settings} label="Settings" onNavigate={() => setSidebarOpen(false)} />
              </div>
            </nav>

            <div className="p-4 border-t border-navy-light">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-bold shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cream truncate">
                    {activeTenant?.tenant.name || "No Organization"}
                  </p>
                  <p className="text-xs text-cream/60 capitalize">{activeRole || "Member"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-cream/70 hover:text-cream hover:bg-navy-light"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-navy/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

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
      <CreateBreedingAttemptDialog open={showAttemptDialog} onOpenChange={setShowAttemptDialog} />
      <CreatePregnancyDialog open={showPregnancyDialog} onOpenChange={setShowPregnancyDialog} />
      <CreateEmbryoTransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} />
      <CreateSemenBatchDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} />
    </>
  );
}
