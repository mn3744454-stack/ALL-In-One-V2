import { Badge } from "@/components/ui/badge";
import type { VetTreatmentStatus } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";

interface VetStatusBadgeProps {
  status: VetTreatmentStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
  // Vaccination statuses
  due: { label: "Due", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
  done: { label: "Done", className: "bg-success/10 text-success border-success/20" },
  // Followup statuses
  open: { label: "Open", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export function VetStatusBadge({ status, className }: VetStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
