import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import { ServiceModeBadge } from "./ServiceModeBadge";
import { format } from "date-fns";
import { Calendar, MoreVertical, Eye, CreditCard, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { tStatus } from "@/i18n/labels";
import { usePermissions } from "@/hooks/usePermissions";
import type { HorseOrder } from "@/hooks/useHorseOrders";
import { EmbeddedCheckout, type CheckoutLineItem } from "@/components/pos/EmbeddedCheckout";

interface OrderCardProps {
  order: HorseOrder;
  canManage: boolean;
  canBill?: boolean;
  onView: () => void;
  onEdit?: () => void;
  onStatusChange?: (newStatus: HorseOrder["status"]) => void;
  onDelete?: () => void;
}

export function OrderCard({
  order,
  canManage,
  canBill = false,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: OrderCardProps) {
  const { t } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Permission-based billing access
  const canCollectPayment = isOwner || hasPermission("orders.billing.collect") || hasPermission("finance.payment.collect");

  // Build checkout line items from order data
  const buildCheckoutItems = (): CheckoutLineItem[] => {
    const orderTypeName = order.order_type?.name || "Service";
    const orderTypeNameAr = order.order_type?.name_ar;
    // Use estimated_cost or actual_cost as unit_price
    const unitPrice = order.actual_cost ?? order.estimated_cost ?? null;
    
    return [{
      id: order.id,
      description: `${orderTypeName} - ${order.horse?.name || "Horse"}`,
      description_ar: orderTypeNameAr ? `${orderTypeNameAr} - ${order.horse?.name || "الحصان"}` : undefined,
      quantity: 1,
      unit_price: unitPrice,
      total_price: unitPrice ?? 0,
      entity_type: "horse_order",
      entity_id: order.id,
    }];
  };

  const checkoutItems = buildCheckoutItems();
  const hasMissingPrice = checkoutItems.some(item => item.unit_price === null);

  // Order is billable if completed and has estimated/actual cost
  const isBillable = order.status === "completed" && (order.estimated_cost || order.actual_cost);
  
  const getNextStatuses = (): HorseOrder["status"][] => {
    switch (order.status) {
      case "draft":
        return ["pending"];
      case "pending":
        return ["scheduled", "cancelled"];
      case "scheduled":
        return ["in_progress", "cancelled"];
      case "in_progress":
        return ["completed", "cancelled"];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Horse Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={order.horse?.avatar_url || undefined} />
              <AvatarFallback className="bg-gold/20 text-gold font-semibold">
                {order.horse?.name?.[0] || "H"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{order.horse?.name || "Unknown Horse"}</p>
              <p className="text-sm text-muted-foreground truncate">
                {order.order_type?.name || "Unknown Type"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 me-2" />
                {t("orders.actions.viewDetails")}
              </DropdownMenuItem>
              {canManage && onEdit && (
                <DropdownMenuItem onClick={onEdit}>{t("orders.actions.edit")}</DropdownMenuItem>
              )}
              {canManage && nextStatuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {nextStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange?.(status)}
                    >
                      {t("orders.actions.markAs")} {tStatus(status)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {isBillable && canCollectPayment && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); setCheckoutOpen(true); }}
                    className="text-primary"
                    disabled={hasMissingPrice}
                  >
                    <CreditCard className="w-4 h-4 me-2" />
                    {t("finance.pos.quickCheckout")}
                    {hasMissingPrice && (
                      <AlertTriangle className="h-3 w-3 ms-2 text-destructive" />
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {canManage && order.status === "draft" && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    {t("common.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <OrderStatusBadge status={order.status} size="sm" />
          <OrderPriorityBadge priority={order.priority} size="sm" />
          <ServiceModeBadge mode={order.service_mode} size="sm" />
        </div>

        {/* Schedule */}
        {order.scheduled_for && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(order.scheduled_for), "MMM d, yyyy HH:mm")}</span>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {order.notes}
          </p>
        )}

        {/* Provider info for external */}
        {order.service_mode === "external" && order.external_provider_name && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("orders.provider")}: {order.external_provider_name}
          </p>
        )}
      </CardContent>

      {/* Quick Checkout Sheet */}
      <EmbeddedCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        sourceType="horse_order"
        sourceId={order.id}
        initialLineItems={checkoutItems}
        suggestedClientId={order.client_id}
        linkKind="final"
        onComplete={() => setCheckoutOpen(false)}
        onCancel={() => setCheckoutOpen(false)}
      />
    </Card>
  );
}
