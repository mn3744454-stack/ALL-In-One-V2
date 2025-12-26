import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useHorseOrders, OrderFilters as OrderFiltersType, CreateOrderData, HorseOrder } from "@/hooks/useHorseOrders";
import { useHorseOrderEvents } from "@/hooks/useHorseOrderEvents";
import { useHorseOrderTypes } from "@/hooks/useHorseOrderTypes";
import {
  OrdersList,
  OrderFilters,
  PinnedTabs,
  CreateOrderDialog,
  OrderTypesManager,
  CapabilitiesManager,
  OrderTimeline,
} from "@/components/horses/orders";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2,
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Search,
  TrendingUp,
  Heart,
  Menu,
  LogOut,
  MessageSquare,
  Globe,
  X,
  Package,
  GraduationCap,
  Ticket,
  CreditCard,
  ClipboardList,
  Plus,
  Sliders,
} from "lucide-react";

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

// Wrapper component for OrderTimeline that uses the hook
const OrderTimelineWrapper = ({ orderId }: { orderId: string }) => {
  const { events, loading } = useHorseOrderEvents(orderId);
  return <OrderTimeline events={events} loading={loading} />;
};

const DashboardHorseOrders = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, profile } = useAuth();
  const { activeTenant, activeRole } = useTenant();
  const { horses } = useHorses();
  
  // Orders state
  const [filters, setFilters] = useState<OrderFiltersType>({});
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  
  const { pinnedTabs, moreTypes } = useHorseOrderTypes();
  
  // Apply type filter
  const appliedFilters = useMemo(() => ({
    ...filters,
    order_type_id: selectedTypeId || undefined,
  }), [filters, selectedTypeId]);
  
  const { orders, loading, canManage, createOrder, updateOrder, updateStatus, deleteOrder, refresh } = useHorseOrders(appliedFilters);

  const needsPublicProfileSetup = activeRole === 'owner' && activeTenant && !activeTenant.tenant.slug;

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreateOrder = async (data: CreateOrderData, isDraft: boolean) => {
    if (isDraft) {
      await createOrder({ ...data, status: 'draft' as const });
    } else {
      await createOrder({ ...data, status: 'pending' as const });
    }
    refresh();
  };

  const handleEditOrder = async (data: CreateOrderData) => {
    if (editingOrder) {
      await updateOrder(editingOrder.id, data);
      setEditingOrder(null);
      refresh();
    }
  };

  const handleStatusChange = async (order: HorseOrder, newStatus: HorseOrder["status"]) => {
    await updateStatus(order.id, newStatus);
    refresh();
  };

  const handleDeleteOrder = async (order: HorseOrder) => {
    await deleteOrder(order.id);
    refresh();
  };

  const horseOptions = horses.map(h => ({ id: h.id, name: h.name }));
  const viewingOrder = orders.find(o => o.id === viewingOrderId);

  return (
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
            <NavItem icon={Heart} label="My Horses" href="/dashboard/horses" badge={horses.length} onNavigate={() => setSidebarOpen(false)} />
            <NavItem icon={ClipboardList} label="Orders" href="/dashboard/horse-orders" active onNavigate={() => setSidebarOpen(false)} />
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
                  placeholder="Search orders..."
                  className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm focus:ring-2 focus:ring-gold/30"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <OrderTypesManager 
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Manage Order Types
                        </DropdownMenuItem>
                      }
                    />
                    <CapabilitiesManager 
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Sliders className="w-4 h-4 mr-2" />
                          Service Capabilities
                        </DropdownMenuItem>
                      }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <InvitationsPanel />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 lg:p-8">
            {!activeTenant ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-navy mb-2">
                  No Organization Selected
                </h2>
                <p className="text-muted-foreground mb-4">
                  Please create or join an organization to manage orders.
                </p>
                <Link to="/select-role">
                  <Button variant="gold">Create Organization</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header with tabs and actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-navy">Horse Orders</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage veterinary, training, grooming and other service orders
                    </p>
                  </div>
                  {canManage && (
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      New Order
                    </Button>
                  )}
                </div>

                {/* Pinned Tabs */}
                <PinnedTabs
                  pinnedTabs={pinnedTabs}
                  moreTypes={moreTypes}
                  selectedTypeId={selectedTypeId}
                  onSelectType={setSelectedTypeId}
                />

                {/* Filters */}
                <OrderFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  horses={horseOptions}
                />

                {/* Orders List */}
                <OrdersList
                  orders={orders}
                  loading={loading}
                  canManage={canManage}
                  onCreateOrder={() => setCreateDialogOpen(true)}
                  onViewOrder={(order) => setViewingOrderId(order.id)}
                  onEditOrder={(order) => setEditingOrder(order)}
                  onStatusChange={handleStatusChange}
                  onDeleteOrder={handleDeleteOrder}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateOrder}
      />

      {/* Edit Order Dialog */}
      <CreateOrderDialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
        editOrder={editingOrder}
        onSubmit={handleEditOrder}
      />

      {/* Order Timeline Sheet */}
      <Sheet open={!!viewingOrderId} onOpenChange={(open) => !open && setViewingOrderId(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Order Timeline</SheetTitle>
          </SheetHeader>
          {viewingOrder && (
            <div className="mt-6">
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <p className="font-semibold text-navy">{viewingOrder.horse?.name}</p>
                <p className="text-sm text-muted-foreground">{viewingOrder.order_type?.name}</p>
              </div>
              <OrderTimelineWrapper orderId={viewingOrder.id} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardHorseOrders;
