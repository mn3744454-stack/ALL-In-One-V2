import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlaskConical } from "lucide-react";
import { useI18n } from "@/i18n";
import type { StableResultGroup } from "@/hooks/laboratory/useStableLabResults";
import { LabResultReportViewer } from "./LabResultReportViewer";

interface StableResultViewerDialogProps {
  group: StableResultGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * L4-a-1.1 — Stable / receiving-tenant read-only Lab Report viewer.
 *
 * Widened to workspace-class width and delegates content rendering to the
 * shared `LabResultReportViewer`. Multiple results are stacked vertically in
 * one continuous scrollable report instead of tabs. Remains a raw `Dialog`
 * (outside-click + Esc close acceptable) — no form state.
 */
export function StableResultViewerDialog({ group, open, onOpenChange }: StableResultViewerDialogProps) {
  const { t } = useI18n();

  const dialogTitle =
    group.testDescription
    || group.results[0]?.template_name
    || t("laboratory.results.unknownTest");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FlaskConical className="h-5 w-5" />
            <span className="truncate">{dialogTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {group.results.length === 1 ? (
            <LabResultReportViewer
              templateName={group.results[0].template_name}
              templateNameAr={group.results[0].template_name_ar}
              horseName={group.horseName}
              labName={group.labName}
              physicalSampleId={group.physicalSampleId}
              sampleId={group.sampleId}
              resultDate={group.publishedAt}
              collectionDate={group.results[0].created_at}
              status={group.results[0].status}
              flags={group.results[0].flags}
              interpretation={group.results[0].interpretation}
              resultData={group.results[0].result_data}
              templateFields={group.results[0].template_fields}
              templateNormalRanges={group.results[0].template_normal_ranges}
              templateGroups={group.results[0].template_groups}
              variant="modern"
            />
          ) : (
            <div className="space-y-8">
              {group.results.map((r, idx) => (
                <div
                  key={r.id}
                  className={idx < group.results.length - 1 ? "pb-8 border-b" : ""}
                >
                  <LabResultReportViewer
                    templateName={r.template_name}
                    templateNameAr={r.template_name_ar}
                    horseName={group.horseName}
                    labName={group.labName}
                    physicalSampleId={group.physicalSampleId}
                    sampleId={group.sampleId}
                    resultDate={r.published_at || group.publishedAt}
                    collectionDate={r.created_at}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
