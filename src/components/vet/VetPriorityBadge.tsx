import { Badge } from "@/components/ui/badge";
import type { VetTreatmentPriority } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { tSeverity } from "@/i18n/labels";

interface VetPriorityBadgeProps {
  priority: VetTreatmentPriority;
  className?: string;
}

const priorityConfig: Record<VetTreatmentPriority, { className: string; icon: React.ElementType }> = {
  low: { className: "bg-slate-500/10 text-slate-600 border-slate-500/20", icon: ArrowDown },
  medium: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Minus },
  high: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: ArrowUp },
  urgent: { className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

export function VetPriorityBadge({ priority, className }: VetPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.className, className)}>
      <Icon className="w-3 h-3" />
      {tSeverity(priority)}
    </Badge>
  );
}
