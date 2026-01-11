import { Badge } from "@/components/ui/badge";
import { tSeverity } from "@/i18n/labels";

interface OrderPriorityBadgeProps {
  priority: string;
  size?: "sm" | "default";
}

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export function OrderPriorityBadge({ priority, size = "default" }: OrderPriorityBadgeProps) {
  const style = priorityStyles[priority] || priorityStyles.medium;

  return (
    <Badge
      variant="outline"
      className={`${style} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {tSeverity(priority)}
    </Badge>
  );
}
