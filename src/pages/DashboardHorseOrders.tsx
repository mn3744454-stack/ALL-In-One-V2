import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useHorseOrders, OrderFilters as OrderFiltersType, CreateOrderData, HorseOrder } from "@/hooks/useHorseOrders";
import { useHorseOrderEvents } from "@/hooks/useHorseOrderEvents";
import { useHorseOrderTypes } from "@/hooks/useHorseOrderTypes";
import { useI18n } from "@/i18n";
import {
  OrdersList,
  OrderFilters,
  PinnedTabs,
  CreateOrderDialog,
  OrderTypesManager,
  CapabilitiesManager,
  OrderTimeline,
  OrdersBottomNavigation,
} from "@/components/horses/orders";
import { MobilePageHeader } from "@/components/navigation";
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
  const { t } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const { horses } = useHorses();
  
  // Orders state
  const [filters, setFilters] = useState<OrderFiltersType>({});
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<HorseOrder | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [mobileStatusTab, setMobileStatusTab] = useState("all");

  const canManage = activeRole === "owner" || activeRole === "manager";

  const { orders, loading, refresh, createOrder, updateOrder, updateStatus, deleteOrder } =
    useHorseOrders({
      ...filters,
      order_type_id: selectedTypeId || undefined,
    });

  const { orderTypes } = useHorseOrderTypes();

  const pinnedTabs = useMemo(
    () => orderTypes.filter((t) => t.pin_as_tab),
    [orderTypes]
  );
  const moreTypes = useMemo(
    () => orderTypes.filter((t) => !t.pin_as_tab),
    [orderTypes]
  );

  const handleCreateOrder = async (data: CreateOrderData) => {
    await createOrder(data);
    setCreateDialogOpen(false);
    refresh();
  };

  const handleEditOrder = async (data: CreateOrderData) => {
    if (!editingOrder) return;
    await updateOrder(editingOrder.id, data);
    setEditingOrder(null);
    refresh();
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
    <DashboardShell>
      {/* Mobile Page Header */}
      <MobilePageHeader title={t("sidebar.orders")} />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-24 lg:pb-0">
        <div className="p-4 lg:p-8">
          {!activeTenant ? (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-navy mb-2">
                {t("orders.noOrganizationSelected")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("orders.createOrJoinOrganization")}
              </p>
              <Link to="/select-role">
                <Button variant="gold">{t("dashboard.createOrganization")}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header with tabs and actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-navy">{t("orders.title")}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("orders.subtitle")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
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
                                <ClipboardList className="w-4 h-4 me-2" />
                                {t("orders.manageOrderTypes")}
                              </DropdownMenuItem>
                            }
                          />
                          <CapabilitiesManager 
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Sliders className="w-4 h-4 me-2" />
                                {t("orders.serviceCapabilities")}
                              </DropdownMenuItem>
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t("orders.newOrder")}
                      </Button>
                    </>
                  )}
                </div>
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

      {/* Bottom Navigation for Mobile */}
      <OrdersBottomNavigation
        activeTab={mobileStatusTab}
        onTabChange={setMobileStatusTab}
        showSettings={canManage}
      />

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
            <SheetTitle>{t("orders.orderTimeline")}</SheetTitle>
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
    </DashboardShell>
  );
};

export default DashboardHorseOrders;
