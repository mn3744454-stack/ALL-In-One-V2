import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, FlaskConical, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { SubmissionSamplingProgress as Progress6A } from "@/hooks/laboratory/useLabSubmissionSamplingProgress";

interface SubmissionSamplingProgressProps {
  progress: Progress6A;
  /** "badge" = compact pill for card headers; "bar" = inline progress bar with label */
  variant?: "badge" | "bar";
  className?: string;
}

/**
 * Phase 6A — Visual surface for submission sampling progress.
 *
 * Shows "3/5 sampled" semantics with a state-aware tone:
 *   - none    → neutral
 *   - partial → amber
 *   - full    → green
 *   - idle    → hidden (returns null) — nothing actionable to show
 */
export function SubmissionSamplingProgress({
  progress,
  variant = "badge",
  className,
}: SubmissionSamplingProgressProps) {
  const { t } = useI18n();

  // Hide entirely when no horses are in a sampling-ready state
  if (progress.state === "idle") return null;

  const { sampledHorses, acceptedHorses, state } = progress;

  const tone =
    state === "full"
      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800"
      : state === "partial"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        : "bg-muted text-muted-foreground border-border";

  const Icon = state === "full" ? CheckCircle2 : state === "partial" ? Hourglass : FlaskConical;

  const label =
    state === "full"
      ? t("laboratory.samplingProgress.fullySampled") || "Fully sampled"
      : state === "partial"
        ? t("laboratory.samplingProgress.partiallySampled") || "Partially sampled"
        : t("laboratory.samplingProgress.notSampled") || "Awaiting sampling";

  if (variant === "bar") {
    const percent = acceptedHorses > 0 ? (sampledHorses / acceptedHorses) * 100 : 0;
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span>{label}</span>
          </span>
          <span className="font-medium tabular-nums">
            {sampledHorses}/{acceptedHorses}
          </span>
        </div>
        <Progress value={percent} className="h-1.5" />
      </div>
    );
  }

  return (
    <Badge variant="outline" className={cn("text-xs h-6 gap-1 font-normal", tone, className)}>
      <Icon className="h-3 w-3" />
      <span className="tabular-nums">
        {sampledHorses}/{acceptedHorses}
      </span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline">{label}</span>
    </Badge>
  );
}
