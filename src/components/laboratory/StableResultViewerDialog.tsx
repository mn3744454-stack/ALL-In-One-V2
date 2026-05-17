import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, FlaskConical } from "lucide-react";
import { formatStandardDate, displayHorseName } from "@/lib/displayHelpers";
import { useI18n } from "@/i18n";
import type { StableResultGroup } from "@/hooks/laboratory/useStableLabResults";
import { LabResultReportViewer } from "./LabResultReportViewer";
import { ReportChrome } from "./ReportChrome";
import { formatAnalysisCount } from "@/lib/laboratory/analysisCount";

interface StableResultViewerDialogProps {
  group: StableResultGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * L4-a-1.1 / L4-a-3a — Stable / receiving-tenant read-only Lab Report viewer.
 *
 * Multi-result reports stack vertically using `chrome="section"` on each
 * analysis, prefixed by one outer identity card. Single-result reports keep
 * the full chrome to preserve identity context. Layout is wrapped with the
 * shared `ReportChrome` (compact sticky header + scrollable body).
 */
export function StableResultViewerDialog({ group, open, onOpenChange }: StableResultViewerDialogProps) {
  const { t, lang } = useI18n();
  const isMulti = group.results.length > 1;
  const firstResult = group.results[0];

  const reportTitle =
    group.testDescription
    || firstResult?.template_name
    || t("laboratory.results.unknownTest");

  const bilingualHorseName = displayHorseName(group.horseName, group.horseNameAr, lang);

  const analysesShort = formatAnalysisCount(group.results.length, lang);
  const compactSubtitle = [
    isMulti ? analysesShort : reportTitle,
    group.publishedAt ? formatStandardDate(group.publishedAt) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogTitle className="sr-only">{reportTitle}</DialogTitle>
        <ReportChrome
          compactTitle={
            <span className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="truncate">{bilingualHorseName}</span>
            </span>
          }
          compactSubtitle={compactSubtitle}
        >
          {isMulti ? (
            <div className="space-y-6">
              {/* Outer identity card — single source of report metadata for stacked sections */}
              <div className="rounded-lg border bg-card p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold truncate">
                      {reportTitle}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {analysesShort}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {t("laboratory.report.combinedReport")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("laboratory.report.horse")}
                    </p>
                    <p className="font-medium truncate">{group.horseName}</p>
                  </div>
                  {group.labName && (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" aria-hidden />
                        {t("laboratory.report.laboratory")}
                      </p>
                      <p className="font-medium truncate">{group.labName}</p>
                    </div>
                  )}
                  {(group.physicalSampleId || group.sampleId) && (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t("laboratory.report.sampleId")}
                      </p>
                      <p className="font-mono text-xs truncate">
                        {group.physicalSampleId || group.sampleId}
                      </p>
                    </div>
                  )}
                  {group.publishedAt && (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden />
                        {t("laboratory.report.reportDate")}
                      </p>
                      <p className="font-medium truncate">
                        {formatStandardDate(group.publishedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stacked per-analysis sections — lightweight chrome */}
              <div className="space-y-6">
                {group.results.map((r, idx) => (
                  <div
                    key={r.id}
                    className={idx < group.results.length - 1 ? "pb-6 border-b" : ""}
                  >
                    <LabResultReportViewer
                      chrome="section"
                      templateName={r.template_name}
                      templateNameAr={r.template_name_ar}
                      status={r.status}
                      flags={r.flags}
                      interpretation={r.interpretation}
                      resultData={r.result_data}
                      templateFields={r.template_fields}
                      templateNormalRanges={r.template_normal_ranges}
                      templateGroups={r.template_groups}
                      variant="modern"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            firstResult && (
              <LabResultReportViewer
                templateName={firstResult.template_name}
                templateNameAr={firstResult.template_name_ar}
                horseName={group.horseName}
                labName={group.labName}
                physicalSampleId={group.physicalSampleId}
                sampleId={group.sampleId}
                resultDate={group.publishedAt}
                collectionDate={firstResult.created_at}
                status={firstResult.status}
                flags={firstResult.flags}
                interpretation={firstResult.interpretation}
                resultData={firstResult.result_data}
                templateFields={firstResult.template_fields}
                templateNormalRanges={firstResult.template_normal_ranges}
                templateGroups={firstResult.template_groups}
                variant="modern"
              />
            )
          )}
        </ReportChrome>
      </DialogContent>
    </Dialog>
  );
}
