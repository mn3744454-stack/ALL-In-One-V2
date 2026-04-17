import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, FlaskConical, FileText, CheckCircle2, Lock, Send, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  useRequestResultProgress,
  type RequestTemplateProgress,
} from "@/hooks/laboratory/useRequestResultProgress";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useState } from "react";
import { toast } from "sonner";

interface ResultsOwedPanelProps {
  requestId: string;
  /** Optional: open the create-result wizard pre-filled. */
  onCreateResult?: (templateId: string) => void;
  /** Optional: open the result for viewing/editing. */
  onOpenResult?: (resultId: string) => void;
}

/**
 * Phase 7 — Lab-side "Results owed" workflow inside RequestDetailDialog.
 * Lists every accepted template for the request and exposes the contextual
 * action: Create result · Edit draft · Review · Finalize · Publish.
 * Refused (rejected) templates are shown but inert; pending templates are inert.
 */
export function ResultsOwedPanel({
  requestId,
  onCreateResult,
  onOpenResult,
}: ResultsOwedPanelProps) {
  const { t, dir } = useI18n();
  const { data: progress, isLoading, refetch } = useRequestResultProgress(requestId);
  const { reviewResult, finalizeResult, publishToStable } = useLabResults();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("laboratory.results.loadingProgress") || "Loading progress…"}
      </Card>
    );
  }

  if (!progress || progress.templates.length === 0) return null;

  // P8-D: Explicit empty state when nothing is accepted yet (intake not decided / all rejected).
  if (progress.acceptedCount === 0) {
    return (
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {t("laboratory.results.resultsOwed") || "Results"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("laboratory.results.noAcceptedTemplatesHint") ||
            "Make intake decisions to start authoring results."}
        </p>
      </Card>
    );
  }

  const { acceptedCount, resultsCount, publishedCount, templates } = progress;
  const pct = acceptedCount > 0 ? (publishedCount / acceptedCount) * 100 : 0;

  const handleAction = async (
    tpl: RequestTemplateProgress,
    action: "review" | "finalize" | "publish"
  ) => {
    if (!tpl.result_id) return;
    setBusyId(tpl.result_id);
    try {
      let ok: unknown = null;
      if (action === "review") ok = await reviewResult(tpl.result_id);
      else if (action === "finalize") ok = await finalizeResult(tpl.result_id);
      else if (action === "publish") ok = await publishToStable(tpl.result_id);
      if (ok) await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishAllFinal = async () => {
    const targets = templates.filter(
      (t) => t.result_status === "final" && !t.published_to_stable
    );
    if (targets.length === 0) {
      toast.info(t("laboratory.results.nothingToPublish") || "Nothing to publish");
      return;
    }
    setBusyId("__bulk__");
    try {
      let success = 0;
      for (const tpl of targets) {
        if (!tpl.result_id) continue;
        const ok = await publishToStable(tpl.result_id);
        if (ok) success++;
      }
      await refetch();
      toast.success(
        (t("laboratory.results.publishedCount") || "Published {n} results").replace(
          "{n}",
          String(success)
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const hasFinalUnpublished = templates.some(
    (t) => t.result_status === "final" && !t.published_to_stable
  );

  return (
    <Card className="p-4 space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {t("laboratory.results.resultsOwed") || "Results"}
          </span>
        </div>
        {acceptedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {(t("laboratory.results.publishedOfAccepted") || "{published} of {total} published")
              .replace("{published}", String(publishedCount))
              .replace("{total}", String(acceptedCount))}
          </span>
        )}
      </div>

      {acceptedCount > 0 && <Progress value={pct} className="h-1.5" />}

      {/* Template rows */}
      <ul className="space-y-1.5">
        {templates.map((tpl) => {
          const name =
            dir === "rtl" && tpl.template_name_ar
              ? tpl.template_name_ar
              : tpl.template_name ||
                (dir === "rtl" ? tpl.service_name_ar : tpl.service_name) ||
                "—";
          const busy = busyId === tpl.result_id;

          // Refused (decided rejected at intake)
          if (tpl.state === "refused") {
            return (
              <li key={tpl.lrst_id} className="flex items-center justify-between gap-2 text-sm py-1.5">
                <span className="truncate text-muted-foreground line-through">{name}</span>
                <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/30">
                  {t("laboratory.results.refusedAtIntake") || "Refused at intake"}
                </Badge>
              </li>
            );
          }

          if (tpl.state === "pending_decision") {
            return (
              <li key={tpl.lrst_id} className="flex items-center justify-between gap-2 text-sm py-1.5">
                <span className="truncate text-muted-foreground">{name}</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {t("laboratory.intake.serviceStatusPending") || "Pending"}
                </Badge>
              </li>
            );
          }

          // Accepted — render with action
          return (
            <li
              key={tpl.lrst_id}
              className="flex items-center justify-between gap-2 text-sm py-1.5 border-t first:border-t-0"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{name}</span>
                <StatusPill state={tpl.state} />
              </div>
              <div className="shrink-0">
                {tpl.state === "no_result" && onCreateResult && tpl.template_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onCreateResult(tpl.template_id!)}
                  >
                    {t("laboratory.results.createResult") || "Create result"}
                  </Button>
                )}
                {tpl.state === "draft" && (
                  <div className="flex gap-1">
                    {onOpenResult && tpl.result_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onOpenResult(tpl.result_id!)}
                      >
                        {t("laboratory.results.editDraft") || "Edit"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busy}
                      onClick={() => handleAction(tpl, "review")}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 me-1" />}
                      {t("laboratory.resultActions.markReviewed") || "Review"}
                    </Button>
                  </div>
                )}
                {tpl.state === "reviewed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={busy}
                    onClick={() => handleAction(tpl, "finalize")}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3 me-1" />}
                    {t("laboratory.resultActions.finalize") || "Finalize"}
                  </Button>
                )}
                {tpl.state === "final" && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={busy}
                    onClick={() => handleAction(tpl, "publish")}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 me-1" />}
                    {t("laboratory.results.publishToStable") || "Publish"}
                  </Button>
                )}
                {tpl.state === "published" && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    <CheckCircle2 className="h-3 w-3 me-0.5" />
                    {t("laboratory.results.published") || "Published"}
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Bulk publish */}
      {hasFinalUnpublished && (
        <div className="pt-2 border-t flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === "__bulk__"}
            onClick={handlePublishAllFinal}
            className="gap-1 h-7 text-xs"
          >
            {busyId === "__bulk__" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {t("laboratory.results.publishAllFinal") || "Publish all final"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function StatusPill({ state }: { state: RequestTemplateProgress["state"] }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; cls: string }> = {
    no_result: {
      label: t("laboratory.results.needsResult") || "Needs result",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    },
    draft: {
      label: t("laboratory.results.status.draft") || "Draft",
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
    },
    reviewed: {
      label: t("laboratory.results.status.reviewed") || "Reviewed",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    },
    final: {
      label: t("laboratory.results.status.final") || "Final",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    },
    published: {
      label: t("laboratory.results.published") || "Published",
      cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
    },
  };
  const cfg = map[state];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}
