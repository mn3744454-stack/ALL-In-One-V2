import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import { ServiceModeBadge } from "./ServiceModeBadge";
import { OrderCard } from "./OrderCard";
import { format } from "date-fns";
import { Plus, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { HorseOrder } from "@/hooks/useHorseOrders";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrdersListProps {
  orders: HorseOrder[];
  loading: boolean;
  canManage: boolean;
  onCreateOrder: () => void;
  onViewOrder: (order: HorseOrder) => void;
  onEditOrder?: (order: HorseOrder) => void;
  onStatusChange: (order: HorseOrder, newStatus: HorseOrder["status"]) => void;
  onDeleteOrder: (order: HorseOrder) => void;
}

export function OrdersList({
  orders,
  loading,
  canManage,
  onCreateOrder,
  onViewOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}: OrdersListProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<HorseOrder | null>(null);

  const handleDeleteClick = (order: HorseOrder) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      onDeleteOrder(orderToDelete);
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <ClipboardList className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          {t("orders.noOrdersFound")}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          {canManage
            ? t("orders.createFirstOrderPrompt")
            : t("orders.noOrdersCreatedYet")}
        </p>
        {canManage && (
          <Button onClick={onCreateOrder} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("orders.createOrder")}
          </Button>
        )}
      </div>
    );
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              canManage={canManage}
              onView={() => onViewOrder(order)}
              onEdit={onEditOrder ? () => onEditOrder(order) : undefined}
              onStatusChange={(status) => onStatusChange(order, status)}
              onDelete={() => handleDeleteClick(order)}
            />
          ))}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("orders.deleteOrder")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("orders.deleteOrderConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop: Table view
  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">{t("orders.table.horse")}</TableHead>
              <TableHead>{t("orders.table.type")}</TableHead>
              <TableHead>{t("orders.table.status")}</TableHead>
              <TableHead>{t("orders.table.priority")}</TableHead>
              <TableHead>{t("orders.table.mode")}</TableHead>
              <TableHead>{t("orders.table.scheduled")}</TableHead>
              <TableHead className="text-end">{t("orders.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewOrder(order)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={order.horse?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gold/20 text-gold text-xs">
                        {order.horse?.name?.[0] || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[120px]">
                      {order.horse?.name || t("common.unknown")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="truncate max-w-[100px] block">
                    {order.order_type?.name || t("common.unknown")}
                  </span>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} size="sm" />
                </TableCell>
                <TableCell>
                  <OrderPriorityBadge priority={order.priority} size="sm" />
                </TableCell>
                <TableCell>
                  <ServiceModeBadge mode={order.service_mode} size="sm" />
                </TableCell>
                <TableCell>
                  {order.scheduled_for ? (
                    <span className="text-sm">
                      {format(new Date(order.scheduled_for), "MMM d, HH:mm")}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOrder(order)}
                    >
                      {t("common.view")}
                    </Button>
                    {canManage && onEditOrder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditOrder(order)}
                      >
                        {t("common.edit")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.deleteOrder")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.deleteOrderConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
