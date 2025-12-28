import { Badge } from "@/components/ui/badge";
import type { LabSampleStatus } from "@/hooks/laboratory/useLabSamples";
import type { LabResultStatus } from "@/hooks/laboratory/useLabResults";
import { cn } from "@/lib/utils";

interface SampleStatusBadgeProps {
  status: LabSampleStatus | LabResultStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  accessioned: { label: "Accessioned", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  processing: { label: "Processing", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
  // Result statuses
  reviewed: { label: "Reviewed", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  final: { label: "Final", className: "bg-success/10 text-success border-success/20" },
};

export function SampleStatusBadge({ status, className }: SampleStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

interface ResultFlagsBadgeProps {
  flags: 'normal' | 'abnormal' | 'critical' | null;
  className?: string;
}

const flagsConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-success/10 text-success border-success/20" },
  abnormal: { label: "Abnormal", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function ResultFlagsBadge({ flags, className }: ResultFlagsBadgeProps) {
  if (!flags) return null;
  
  const config = flagsConfig[flags] || { label: flags, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
