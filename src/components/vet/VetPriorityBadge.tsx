import { Badge } from "@/components/ui/badge";
import type { VetTreatmentPriority } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";

interface VetPriorityBadgeProps {
  priority: VetTreatmentPriority;
  className?: string;
}

const priorityConfig: Record<VetTreatmentPriority, { label: string; className: string; icon: React.ElementType }> = {
  low: { label: "Low", className: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: ArrowDown },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Minus },
  high: { label: "High", className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: ArrowUp },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

export function VetPriorityBadge({ priority, className }: VetPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.className, className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
