import { Badge } from "@/components/ui/badge";
import { tStatus } from "@/i18n/labels";

interface OrderStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: {
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
  },
  pending: {
    variant: "secondary",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  scheduled: {
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  in_progress: {
    variant: "secondary",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  completed: {
    variant: "secondary",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function OrderStatusBadge({ status, size = "default" }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {tStatus(status)}
    </Badge>
  );
}
