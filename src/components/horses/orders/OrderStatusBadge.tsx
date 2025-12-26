import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: {
    label: "Draft",
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
  },
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  scheduled: {
    label: "Scheduled",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    variant: "secondary",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
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
      {config.label}
    </Badge>
  );
}
