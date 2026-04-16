import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface SubmissionContextChipProps {
  submissionId: string | null | undefined;
  senderName: string | null | undefined;
  onOpenSubmission?: (submissionId: string) => void;
  className?: string;
  /** Compact variant hides the sender name when space is tight */
  compact?: boolean;
}

/**
 * Phase 6A — Compact submission context chip.
 *
 * Surfaces "this sample originated from submission X sent by Stable Y" so a
 * Lab operator looking at an isolated SampleCard can see the larger
 * submission it belongs to. Optional click-through for later phases.
 */
export function SubmissionContextChip({
  submissionId,
  senderName,
  onOpenSubmission,
  className,
  compact = false,
}: SubmissionContextChipProps) {
  const { t } = useI18n();

  if (!submissionId) return null;

  const shortRef = submissionId.slice(0, 6).toUpperCase();
  const sender = senderName || t("laboratory.submissions.unknownSender");

  const content = (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <Layers className="h-3 w-3 shrink-0" />
      <span className="font-mono text-[10px] uppercase tracking-wide shrink-0">
        {t("laboratory.samplingProgress.submissionRef") || "Sub"} #{shortRef}
      </span>
      {!compact && (
        <>
          <span className="text-muted-foreground/60 shrink-0">·</span>
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate text-xs">{sender}</span>
        </>
      )}
    </span>
  );

  if (onOpenSubmission) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-6 px-2 py-0 text-xs font-normal text-muted-foreground hover:text-foreground max-w-full",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          onOpenSubmission(submissionId);
        }}
        title={`${t("laboratory.samplingProgress.submissionRef") || "Submission"} ${shortRef} · ${sender}`}
      >
        {content}
      </Button>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 px-2 py-0 text-xs font-normal text-muted-foreground max-w-full",
        className
      )}
      title={`${t("laboratory.samplingProgress.submissionRef") || "Submission"} ${shortRef} · ${sender}`}
    >
      {content}
    </Badge>
  );
}
