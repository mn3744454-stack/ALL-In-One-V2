import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReportChrome } from "./ReportChrome";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Printer,
  Download,
  Share2,
  FlaskConical,
  AlertTriangle,
  Loader2,
  FileText,
  CheckCircle2,
  MessageCircle,
  Send,
  Link2,
} from "lucide-react";
import { formatStandardDate, displayHorseName } from "@/lib/displayHelpers";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { getLabHorseDisplayName, getLabHorseNamePair } from "@/lib/laboratory/horseDisplay";
import { formatAnalysisCount } from "@/lib/laboratory/analysisCount";
import { LabResultReportViewer, type LabReportVariant } from "./LabResultReportViewer";
import { PublishToStableAction } from "./PublishToStableAction";
import { ResultSharePanel } from "./ResultSharePanel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

type DesignTemplate = "classic" | "modern" | "compact";

interface CombinedResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sample: LabSample | null;
  onReviewResult?: (resultId: string) => Promise<unknown>;
  onFinalizeResult?: (resultId: string) => Promise<unknown>;
  onPublishToStable?: (resultId: string) => Promise<boolean>;
}

export function CombinedResultsDialog({
  open,
  onOpenChange,
  sample,
  onReviewResult,
  onFinalizeResult,
  onPublishToStable,
}: CombinedResultsDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [designTemplate, setDesignTemplate] = useState<DesignTemplate>("modern");
  const previewRef = useRef<HTMLDivElement>(null);
  const { activeTenant } = useTenant();
  const { t } = useI18n();
  const { isRTL } = useRTL();

  const { results, loading: resultsLoading } = useLabResults({
    sample_id: sample?.id,
  });
  const { templates } = useLabTemplates();

  if (!sample) return null;

  const horseName = getLabHorseDisplayName(sample, {
    locale: isRTL ? "ar" : "en",
    fallback: t("laboratory.results.unknownHorse"),
  });
  const sampleId = sample.physical_sample_id || sample.id.slice(0, 8);

  // Map results by template_id for quick lookup
  const resultsByTemplate = new Map<string, LabResult>();
  results.forEach((r) => {
    resultsByTemplate.set(r.template_id, r);
  });

  // Ordered template list from the sample's template attachments
  const orderedTemplates = sample.templates
    ?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((st) => {
      const fullTemplate = templates.find((t) => t.id === st.template.id);
      return {
        sampleTemplate: st,
        fullTemplate,
        result: resultsByTemplate.get(st.template.id),
      };
    }) || [];

  const completedCount = orderedTemplates.filter((s) => s.result).length;
  const totalCount = orderedTemplates.length;
  const allFinal =
    totalCount > 0 && orderedTemplates.every((s) => s.result?.status === "final");
  const labName = activeTenant?.tenant?.name ?? null;

  const handlePrint = () => {
    if (!previewRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(t("laboratory.preview.allowPopups"));
      return;
    }
    const content = DOMPurify.sanitize(previewRef.current.innerHTML);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? "rtl" : "ltr"}">
      <head>
        <title>Lab Report - ${horseName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20mm;
            color: #1f2937;
            direction: ${isRTL ? "rtl" : "ltr"};
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: ${isRTL ? "right" : "left"}; border: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-mono { font-family: monospace; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-2xl { font-size: 1.5rem; }
          svg { display: none; }
          .template-section { page-break-inside: avoid; margin-bottom: 24px; }
          @media print { body { padding: 15mm; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = "800px";
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.backgroundColor = "#ffffff";
      clone.style.padding = "40px";
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 800,
        height: clone.scrollHeight,
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = contentHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      pdf.save(`lab-report-${horseName}-${sample.id.slice(0, 8)}.pdf`);
      toast.success(t("laboratory.preview.pdfDownloaded"));
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("laboratory.preview.pdfFailed"));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = (platform: "whatsapp" | "telegram" | "copy") => {
    const reportUrl = window.location.href;
    const message = `Lab Report — ${horseName}`;
    switch (platform) {
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message + "\n" + reportUrl)}`,
          "_blank"
        );
        break;
      case "telegram":
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(reportUrl)}&text=${encodeURIComponent(message)}`,
          "_blank"
        );
        break;
      case "copy":
        navigator.clipboard.writeText(reportUrl);
        toast.success(t("laboratory.preview.linkCopied"));
        break;
    }
  };

  const footerLabel = allFinal
    ? t("laboratory.report.finalApproved")
    : completedCount === totalCount && totalCount > 0
    ? t("laboratory.report.pendingApproval")
    : t("laboratory.report.partialReport");

  const footerColor = allFinal
    ? "border-green-600 text-green-600"
    : completedCount === totalCount && totalCount > 0
    ? "border-blue-600 text-blue-600"
    : "border-yellow-600 text-yellow-600";

  const analysesShort = t("laboratory.report.analysesShort").replace(
    "{{count}}",
    String(totalCount)
  );
  const MAX_NAMES = 3;
  const analysisNames = orderedTemplates.map(({ sampleTemplate }) => {
    const tName = sampleTemplate.template.name;
    const tNameAr =
      (sampleTemplate.template as { name_ar?: string | null }).name_ar ?? null;
    return isRTL ? tNameAr || tName : tName || tNameAr || "";
  });
  const listSep = isRTL ? "، " : ", ";
  const shownNames = analysisNames.slice(0, MAX_NAMES).join(listSep);
  const overflow = analysisNames.length - MAX_NAMES;
  const namesSummary =
    overflow > 0 ? `${shownNames} +${overflow}` : shownNames;
  const analysesWithNames = namesSummary
    ? `${analysesShort}: ${namesSummary}`
    : analysesShort;
  const collectionDateLabel = sample.collection_date
    ? formatStandardDate(sample.collection_date)
    : null;
  const compactSubtitle = [analysesWithNames, collectionDateLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isGeneratingPDF) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0"
        onPointerDownOutside={(e) => isGeneratingPDF && e.preventDefault()}
        onEscapeKeyDown={(e) => isGeneratingPDF && e.preventDefault()}
        onInteractOutside={(e) => isGeneratingPDF && e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {t("laboratory.report.combinedReport")} — {horseName}
        </DialogTitle>
        <ReportChrome
          compactTitle={
            <span className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="truncate">{horseName}</span>
            </span>
          }
          compactSubtitle={compactSubtitle}
          statusBadge={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${footerColor} hidden sm:inline-flex`}>
                {footerLabel}
              </Badge>
              <Select
                value={designTemplate}
                onValueChange={(v) => setDesignTemplate(v as DesignTemplate)}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue placeholder={t("laboratory.preview.designTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">{t("laboratory.preview.classic")}</SelectItem>
                  <SelectItem value="modern">{t("laboratory.preview.modern")}</SelectItem>
                  <SelectItem value="compact">{t("laboratory.preview.compact")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          footer={
            <div className="flex gap-2 justify-end flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 me-2" />
                {t("laboratory.preview.print")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 me-2" />
                )}
                {t("laboratory.preview.pdf")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 me-2" />
                    {t("laboratory.preview.share")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
                    <MessageCircle className="h-4 w-4 me-2 text-green-600" />
                    {t("laboratory.preview.whatsapp")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare("telegram")}>
                    <Send className="h-4 w-4 me-2 text-blue-500" />
                    {t("laboratory.preview.telegram")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare("copy")}>
                    <Link2 className="h-4 w-4 me-2" />
                    {t("laboratory.preview.copyLink")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
        {resultsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div
              ref={previewRef}
              className={`border rounded-lg p-3 md:p-6 bg-background space-y-6 overflow-x-hidden ${
                designTemplate === "compact" ? "text-sm" : ""
              }`}
            >
              {/* Lab branding header */}
              <div
                className={
                  designTemplate === "modern"
                    ? "text-center border-b pb-4"
                    : "flex justify-between items-start gap-3"
                }
              >
                <div>
                  <h2
                    className={`font-bold ${
                      designTemplate === "modern" ? "text-2xl" : "text-xl"
                    }`}
                  >
                    {labName || t("laboratory.report.laboratory")}
                  </h2>
                  {designTemplate !== "compact" && (
                    <p className="text-sm text-muted-foreground">
                      {t("laboratory.preview.labReport")}
                    </p>
                  )}
                </div>
                {designTemplate === "classic" && (
                  <div className="text-end text-sm text-muted-foreground">
                    <p>
                      {t("laboratory.preview.reportDate")}:{" "}
                      {formatStandardDate(new Date())}
                    </p>
                    <p className="font-mono">{sample.id.slice(0, 8)}</p>
                  </div>
                )}
              </div>

              {/* Sample-level metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/50 rounded-lg p-3 md:p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("laboratory.preview.horse")}
                  </p>
                  <p className="font-semibold truncate">{horseName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("laboratory.preview.sampleId")}
                  </p>
                  <p className="font-mono">{sampleId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("laboratory.preview.collectionDate")}
                  </p>
                  <p>{formatStandardDate(sample.collection_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("laboratory.results.analyses")}
                  </p>
                  <p>
                    {completedCount}/{totalCount}
                  </p>
                </div>
              </div>

              {/* Incomplete warning */}
              {completedCount < totalCount && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs md:text-sm">
                    {t("laboratory.report.incompleteWarning")}
                  </span>
                </div>
              )}

              <Separator />

              {/* Stacked per-template sections */}
              {orderedTemplates.map((section, idx) => {
                const { sampleTemplate, fullTemplate, result } = section;
                const templateName = sampleTemplate.template.name;
                const templateNameAr =
                  (sampleTemplate.template as { name_ar?: string | null }).name_ar ?? null;

                return (
                  <div key={sampleTemplate.template.id} className="template-section space-y-3">
                    {/* Section header with per-result actions */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm md:text-base">
                          {idx + 1}. {isRTL ? templateNameAr || templateName : templateName}
                        </h3>
                      </div>

                      {result && (
                        <div className="flex items-center gap-2 print:hidden flex-wrap">
                          {result.status === "draft" && onReviewResult && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => onReviewResult(result.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              {t("laboratory.resultActions.review")}
                            </Button>
                          )}
                          {result.status === "reviewed" && onFinalizeResult && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => onFinalizeResult(result.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              {t("laboratory.resultActions.finalize")}
                            </Button>
                          )}
                          {onPublishToStable &&
                            (result.status === "reviewed" || result.status === "final") &&
                            !!result.sample?.lab_request_id && (
                              <PublishToStableAction
                                resultId={result.id}
                                status={result.status}
                                published_to_stable={result.published_to_stable}
                                sample_lab_request_id={result.sample.lab_request_id}
                                onPublish={onPublishToStable}
                                compact
                              />
                            )}
                        </div>
                      )}
                    </div>

                    {/* Result body */}
                    {result ? (
                      <LabResultReportViewer
                        chrome="section"
                        templateName={templateName}
                        templateNameAr={templateNameAr}
                        status={result.status}
                        flags={result.flags}
                        interpretation={result.interpretation}
                        resultData={(result.result_data as Record<string, unknown>) || {}}
                        templateFields={fullTemplate?.fields}
                        templateNormalRanges={fullTemplate?.normal_ranges}
                        templateGroups={
                          (fullTemplate as unknown as { groups?: unknown })?.groups
                        }
                        variant={designTemplate as LabReportVariant}
                      />
                    ) : (
                      <div className="border rounded-lg p-4 md:p-6 text-center text-muted-foreground bg-muted/20">
                        <p className="text-sm">{t("laboratory.report.notRecorded")}</p>
                      </div>
                    )}

                    {idx < orderedTemplates.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}

              {/* Footer status */}
              <div className="flex justify-center pt-4 border-t">
                <Badge variant="outline" className={`text-xs md:text-sm ${footerColor}`}>
                  {footerLabel}
                </Badge>
              </div>
            </div>

            {/* Full Result Sharing — restored in L4-a-2.2.
                One ResultSharePanel per analysis (sharing is per result_id). */}
            {orderedTemplates.some((s) => s.result) && (
              <div className="print:hidden border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">
                    {t("laboratory.report.resultSharingSection")}
                  </h4>
                </div>
                <div className="space-y-2">
                  {orderedTemplates.map((section, idx) => {
                    const { sampleTemplate, result } = section;
                    if (!result) return null;
                    const tName = sampleTemplate.template.name;
                    const tNameAr =
                      (sampleTemplate.template as { name_ar?: string | null }).name_ar ?? null;
                    const label = `#${idx + 1} — ${isRTL ? tNameAr || tName : tName}`;
                    return (
                      <Collapsible
                        key={`share-${result.id}`}
                        className="rounded-lg border bg-card"
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-start hover:bg-muted/40 transition-colors">
                          <span className="text-sm font-medium truncate">{label}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {t("laboratory.report.analysisSectionShareLabel")}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t p-3">
                          <ResultSharePanel
                            resultId={result.id}
                            resultStatus={result.status}
                            horseId={sample.horse_id}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        )}
        </ReportChrome>
      </DialogContent>
    </Dialog>
  );
}
