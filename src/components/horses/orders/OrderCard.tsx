import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderPriorityBadge } from "./OrderPriorityBadge";
import { ServiceModeBadge } from "./ServiceModeBadge";
import { format } from "date-fns";
import { Calendar, MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HorseOrder } from "@/hooks/useHorseOrders";

interface OrderCardProps {
  order: HorseOrder;
  canManage: boolean;
  onView: () => void;
  onEdit?: () => void;
  onStatusChange?: (newStatus: HorseOrder["status"]) => void;
  onDelete?: () => void;
}

export function OrderCard({
  order,
  canManage,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: OrderCardProps) {
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
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canManage && onEdit && (
                <DropdownMenuItem onClick={onEdit}>Edit Order</DropdownMenuItem>
              )}
              {canManage && nextStatuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {nextStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange?.(status)}
                    >
                      Mark as {status.replace("_", " ")}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {canManage && order.status === "draft" && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
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
            Provider: {order.external_provider_name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
