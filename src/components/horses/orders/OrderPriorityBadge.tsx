import { Badge } from "@/components/ui/badge";

interface OrderPriorityBadgeProps {
  priority: string;
  size?: "sm" | "default";
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function OrderPriorityBadge({ priority, size = "default" }: OrderPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {config.label}
    </Badge>
  );
}
