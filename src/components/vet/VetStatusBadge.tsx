import { Badge } from "@/components/ui/badge";
import type { VetTreatmentStatus } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";
import { tStatus } from "@/i18n/labels";

interface VetStatusBadgeProps {
  status: VetTreatmentStatus | string;
  className?: string;
}

const statusConfig: Record<string, { className: string }> = {
  draft: { className: "bg-muted text-muted-foreground" },
  scheduled: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { className: "bg-success/10 text-success border-success/20" },
  cancelled: { className: "bg-destructive/10 text-destructive border-destructive/20" },
  // Vaccination statuses
  due: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  overdue: { className: "bg-destructive/10 text-destructive border-destructive/20" },
  done: { className: "bg-success/10 text-success border-success/20" },
  // Followup statuses
  open: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  // Visit statuses
  pending: { className: "bg-muted text-muted-foreground" },
  confirmed: { className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

export function VetStatusBadge({ status, className }: VetStatusBadgeProps) {
  const config = statusConfig[status] || { className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {tStatus(status)}
    </Badge>
  );
}
