import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { useRequestResultProgress } from "@/hooks/laboratory/useRequestResultProgress";
import { cn } from "@/lib/utils";

/**
 * Phase 7 — Stable-side per-template publish status.
 * Renders a compact list under each accepted service inside RequestDetailDialog
 * (Stable mode) so partial publication is truthful without inflating the
 * outward summary.
 */
export function StableTemplateProgressList({
  requestId,
}: {
  requestId: string;
}) {
  const { t, dir } = useI18n();
  const { data: progress, isLoading } = useRequestResultProgress(requestId);

  if (isLoading || !progress) return null;

  // P8-D: When everything was refused at intake, show a calm informative hint
  // instead of a silent empty area.
  if (progress.acceptedCount === 0) {
    if (progress.templates.length === 0) return null;
    return (
      <div className="rounded-md border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">
          {t("laboratory.results.allRefusedNoResults") ||
            "All tests refused — no results expected."}
        </p>
      </div>
    );
  }

  // Group by service
  const groups = new Map<
    string,
    {
      serviceName: string;
      templates: typeof progress.templates;
    }
  >();
  for (const tpl of progress.templates) {
    const key = tpl.service_id;
    const sName =
      (dir === "rtl" ? tpl.service_name_ar : tpl.service_name) ||
      tpl.service_name ||
      "—";
    if (!groups.has(key)) {
      groups.set(key, { serviceName: sName, templates: [] });
    }
    groups.get(key)!.templates.push(tpl);
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {t("laboratory.results.testResultsBreakdown") || "Test results"}
        </p>
        <span className="text-xs text-muted-foreground">
          {(t("laboratory.results.publishedOfAccepted") || "{published} of {total} published")
            .replace("{published}", String(progress.publishedCount))
            .replace("{total}", String(progress.acceptedCount))}
        </span>
      </div>

      {Array.from(groups.entries()).map(([sid, g]) => (
        <div key={sid} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{g.serviceName}</p>
          <ul className="space-y-1 ms-2">
            {g.templates.map((tpl) => {
              const name =
                dir === "rtl" && tpl.template_name_ar
                  ? tpl.template_name_ar
                  : tpl.template_name || g.serviceName;
              return (
                <li key={tpl.lrst_id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{name}</span>
                  <StablePill state={tpl.state} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StablePill({ state }: { state: string }) {
  const { t } = useI18n();
  if (state === "published") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-4 gap-0.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
      >
        <CheckCircle2 className="h-2.5 w-2.5" />
        {t("laboratory.results.published") || "Published"}
      </Badge>
    );
  }
  if (state === "refused") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-4 gap-0.5 bg-destructive/10 text-destructive border-destructive/30"
      >
        <XCircle className="h-2.5 w-2.5" />
        {t("laboratory.results.refusedAtIntake") || "Refused at intake"}
      </Badge>
    );
  }
  // accepted but not yet published OR pending decision — both look "pending" to the Stable
  return (
    <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
      <Clock className="h-2.5 w-2.5" />
      {t("laboratory.results.pendingResult") || "Pending result"}
    </Badge>
  );
}
