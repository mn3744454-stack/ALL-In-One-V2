import { Badge } from "@/components/ui/badge";
import type { LabSampleStatus } from "@/hooks/laboratory/useLabSamples";
import type { LabResultStatus } from "@/hooks/laboratory/useLabResults";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface SampleStatusBadgeProps {
  status: LabSampleStatus | LabResultStatus | string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  accessioned: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  processing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  // Result statuses
  reviewed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  final: "bg-success/10 text-success border-success/20",
};

export function SampleStatusBadge({ status, className }: SampleStatusBadgeProps) {
  const { t } = useI18n();
  
  const style = statusStyles[status] || "bg-muted text-muted-foreground";
  
  // Get translated label based on status type
  const getLabel = (status: string): string => {
    // Try sample status first, then result status
    const sampleKey = `laboratory.sampleStatus.${status}`;
    const resultKey = `laboratory.resultStatus.${status}`;
    const sampleLabel = t(sampleKey);
    
    // If translation key is returned as-is, try result status
    if (sampleLabel === sampleKey) {
      const resultLabel = t(resultKey);
      if (resultLabel !== resultKey) return resultLabel;
      // Fallback to capitalized status
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
    return sampleLabel;
  };

  return (
    <Badge variant="outline" className={cn(style, className)}>
      {getLabel(status)}
    </Badge>
  );
}

interface ResultFlagsBadgeProps {
  flags: 'normal' | 'abnormal' | 'critical' | null;
  className?: string;
}

const flagsStyles: Record<string, string> = {
  normal: "bg-success/10 text-success border-success/20",
  abnormal: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export function ResultFlagsBadge({ flags, className }: ResultFlagsBadgeProps) {
  const { t } = useI18n();
  
  if (!flags) return null;
  
  const style = flagsStyles[flags] || "bg-muted text-muted-foreground";
  const label = t(`laboratory.flags.${flags}`);

  return (
    <Badge variant="outline" className={cn(style, className)}>
      {label}
    </Badge>
  );
}
