import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { InvitationsPanel } from "@/components/InvitationsPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Settings,
  Search,
  Menu,
  ClipboardList,
  Plus,
  Sliders,
} from "lucide-react";

// Wrapper component for OrderTimeline that uses the hook
const OrderTimelineWrapper = ({ orderId }: { orderId: string }) => {
  const { events, loading } = useHorseOrderEvents(orderId);
  return <OrderTimeline events={events} loading={loading} />;
};

const DashboardHorseOrders = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
