import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportChrome } from "./ReportChrome";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  User,
  CheckCircle2,
  
  MessageCircle,
  Send,
  Link2,
} from "lucide-react";
import { formatStandardDateTime, displayHorseName } from "@/lib/displayHelpers";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import type { LabTemplate } from "@/hooks/laboratory/useLabTemplates";
import { ResultSharePanel } from "./ResultSharePanel";
import { PublishToStableAction } from "./PublishToStableAction";
import { LabResultReportViewer, type LabReportVariant } from "./LabResultReportViewer";
import { useTenant } from "@/contexts/TenantContext";
import { useRTL } from "@/hooks/useRTL";
import { getLabHorseDisplayName, getLabHorseNamePair } from "@/lib/laboratory/horseDisplay";
import { useI18n } from "@/i18n";
import { printLabReport } from "@/lib/laboratory/printLabReportHtml";
import { toast } from "sonner";

type DesignTemplate = 'classic' | 'modern' | 'compact';

interface ResultPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LabResult | null;
  fullTemplate?: LabTemplate | null;
  onReview?: (resultId: string) => Promise<void>;
  onFinalize?: (resultId: string) => Promise<void>;
  onPublishToStable?: (resultId: string) => Promise<boolean>;
}

export function ResultPreviewDialog({
  open,
  onOpenChange,
  result,
  fullTemplate,
  onReview,
  onFinalize,
  onPublishToStable,
}: ResultPreviewDialogProps) {
  const [designTemplate, setDesignTemplate] = useState<DesignTemplate>('modern');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { activeTenant } = useTenant();
  const { isRTL } = useRTL();
  const { t, lang } = useI18n();
  const [published, setPublished] = useState(result?.published_to_stable ?? false);

  // P3 — report language independent of app UI language
  const [reportLocale, setReportLocale] = useState<"ar" | "en">(
    lang === "ar" ? "ar" : "en"
  );
  const reportIsRTL = reportLocale === "ar";

  // Reset published state when result changes
  const resultId = result?.id;
  const resultPublished = result?.published_to_stable;
  if (resultId && published !== (resultPublished ?? false) && !isPublishing) {
    setPublished(resultPublished ?? false);
  }

  if (!result) return null;

  // Cross-tenant safe horse name resolution using snapshot contract
  const horseNamePair = result.sample
    ? getLabHorseNamePair(result.sample)
    : { name: null, name_ar: null };
  const horseName = result.sample
    ? (displayHorseName(horseNamePair.name, horseNamePair.name_ar, reportLocale)
        || getLabHorseDisplayName(result.sample, { locale: reportLocale, fallback: t("laboratory.results.unknownHorse") }))
    : t("laboratory.results.unknownHorse");
  const templateName = result.template?.name || t("laboratory.results.unknownTest");
  const sampleId = result.sample?.physical_sample_id || result.sample_id.slice(0, 8);

  const handlePrint = () => {
    if (!result) return;
    printLabReport(
      {
        labName: activeTenant?.tenant?.name ?? null,
        horseName: horseNamePair.name,
        horseNameAr: horseNamePair.name_ar,
        sampleId: result.sample?.id ?? result.sample_id,
        physicalSampleId: result.sample?.physical_sample_id ?? null,
        collectionDate: null,
        reportDate: result.created_at ?? new Date().toISOString(),
        analyses: [
          {
            templateName: result.template?.name ?? fullTemplate?.name ?? templateName,
            templateNameAr: result.template?.name_ar ?? fullTemplate?.name_ar ?? null,
            flags: result.flags ?? null,
            status: result.status ?? null,
            interpretation: result.interpretation,
            resultData: (result.result_data as Record<string, unknown>) ?? null,
            templateFields: fullTemplate?.fields,
            templateNormalRanges: fullTemplate?.normal_ranges,
            templateGroups: fullTemplate?.groups,
          },
        ],
      },
      { lang: reportLocale, title: `Lab Report - ${horseName}` }
    );
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const reportUrl = window.location.href;
    const message = `Lab Report for ${horseName} - ${templateName}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + '\n' + reportUrl)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(reportUrl)}&text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(reportUrl);
        toast.success(t("laboratory.preview.linkCopied"));
        break;
    }
  };



  // Parse result_data - use fullTemplate if provided, otherwise empty
  const resultData = (result.result_data as Record<string, unknown>) || {};
  const templateFields = fullTemplate?.fields || [];
  const normalRanges = fullTemplate?.normal_ranges || {};
  const templateGroups = (fullTemplate as unknown as { groups?: unknown })?.groups || [];

  const statusLabel =
    result.status === 'final' ? t("laboratory.preview.finalReport") :
    result.status === 'reviewed' ? t("laboratory.preview.reviewedReport") :
    t("laboratory.preview.draftReport");

  const compactSubtitle = [
    templateName,
    formatStandardDateTime(result.created_at),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogTitle className="sr-only">
          {t("laboratory.preview.title")} — {horseName}
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
            <Badge
              variant="outline"
              className={`text-xs hidden sm:inline-flex ${
                result.status === 'final' ? 'border-green-600 text-green-600' :
                result.status === 'reviewed' ? 'border-blue-600 text-blue-600' :
                'border-yellow-600 text-yellow-600'
              }`}
            >
              {statusLabel}
            </Badge>
          }
          footer={
            <div className="flex flex-wrap gap-3 justify-between items-center">
              {/* Left cluster: Report display controls + status change */}
              <div className="flex gap-3 flex-wrap items-center">
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-xs font-semibold text-muted-foreground">
                    {t("laboratory.report.reportLanguage")}
                  </span>
                  <Select
                    value={reportLocale}
                    onValueChange={(v) => setReportLocale(v as "ar" | "en")}
                  >
                    <SelectTrigger
                      className="h-8 w-32 text-xs"
                      aria-label={t("laboratory.report.reportLanguage")}
                    >
                      <SelectValue placeholder={t("laboratory.report.reportLanguage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("laboratory.report.languageEnglish")}</SelectItem>
                      <SelectItem value="ar">{t("laboratory.report.languageArabic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline text-xs font-semibold text-muted-foreground">
                    {t("laboratory.report.reportStyle")}
                  </span>
                  <Select value={designTemplate} onValueChange={(v) => setDesignTemplate(v as DesignTemplate)}>
                    <SelectTrigger className="h-8 w-32 text-xs" aria-label={t("laboratory.report.reportStyle")}>
                      <SelectValue placeholder={t("laboratory.report.reportStyle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">{t("laboratory.preview.classic")}</SelectItem>
                      <SelectItem value="modern">{t("laboratory.preview.modern")}</SelectItem>
                      <SelectItem value="compact">{t("laboratory.preview.compact")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {result.status === 'draft' && onReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => onReview(result.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 me-2" />
                    {t("laboratory.resultActions.review")}
                  </Button>
                )}
                {result.status === 'reviewed' && onFinalize && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={() => onFinalize(result.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 me-2" />
                    {t("laboratory.resultActions.finalize")}
                  </Button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {onPublishToStable && (
                  <PublishToStableAction
                    resultId={result.id}
                    status={result.status}
                    published_to_stable={published}
                    sample_lab_request_id={result.sample?.lab_request_id}
                    onPublish={async (id) => {
                      setIsPublishing(true);
                      const ok = await onPublishToStable(id);
                      if (ok) setPublished(true);
                      setIsPublishing(false);
                      return ok;
                    }}
                  />
                )}
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 me-2" />
                  {t("laboratory.preview.print")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  aria-label={t("laboratory.preview.printSavePdf")}
                >
                  <Download className="h-4 w-4 me-2" />
                  {t("laboratory.preview.printSavePdf")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 me-2" />
                      {t("laboratory.preview.share")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background">
                    <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                      <MessageCircle className="h-4 w-4 me-2 text-green-600" />
                      {t("laboratory.preview.whatsapp")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('telegram')}>
                      <Send className="h-4 w-4 me-2 text-blue-500" />
                      {t("laboratory.preview.telegram")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('copy')}>
                      <Link2 className="h-4 w-4 me-2" />
                      {t("laboratory.preview.copyLink")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        >
          {/* Preview Content */}
          <div
            ref={previewRef}
            dir={reportIsRTL ? "rtl" : "ltr"}
            lang={reportLocale}
            className={`print-content border rounded-lg p-4 sm:p-6 bg-background print:border-none space-y-6 ${
              designTemplate === 'compact' ? 'text-sm' : ''
            }`}
          >
            {/* Lab branding header */}
            <div className={`${designTemplate === 'modern' ? 'text-center border-b pb-4' : 'flex justify-between items-start gap-3'}`}>
              <div>
                <h2 className={`font-bold ${designTemplate === 'modern' ? 'text-2xl' : 'text-xl'}`}>
                  {activeTenant?.tenant?.name || t("laboratory.report.laboratory")}
                </h2>
                {designTemplate !== 'compact' && (
                  <p className="text-sm text-muted-foreground">
                    {t("laboratory.preview.labReport")}
                  </p>
                )}
              </div>
              {designTemplate === 'classic' && (
                <div className="text-end text-sm text-muted-foreground">
                  <p>{t("laboratory.preview.reportDate")}: {formatStandardDateTime(new Date().toISOString())}</p>
                  <p className="font-mono">{result.id.slice(0, 8)}</p>
                </div>
              )}
            </div>

            {/* Shared rich read-only report renderer (L4-a-1) */}
            <LabResultReportViewer
              templateName={result.template?.name ?? templateName}
              templateNameAr={result.template?.name_ar ?? null}
              horseName={horseNamePair.name}
              horseNameAr={horseNamePair.name_ar}
              labName={activeTenant?.tenant?.name ?? null}
              physicalSampleId={result.sample?.physical_sample_id ?? null}
              sampleId={sampleId}
              resultDate={result.created_at}
              collectionDate={result.created_at}
              status={result.status}
              flags={result.flags}
              interpretation={result.interpretation}
              resultData={resultData}
              templateFields={templateFields}
              templateNormalRanges={normalRanges}
              templateGroups={templateGroups}
              variant={designTemplate as LabReportVariant}
              forceLocale={reportLocale}
            />

            <Separator />

            {/* Footer attribution */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                {result.creator?.full_name && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{t("laboratory.preview.createdBy")}: {result.creator.full_name}</span>
                  </div>
                )}
                {result.reviewer?.full_name && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t("laboratory.preview.reviewedBy")}: {result.reviewer.full_name}</span>
                  </div>
                )}
              </div>
              <span>{formatStandardDateTime(result.created_at)}</span>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`text-sm ${
                  result.status === 'final' ? 'border-green-600 text-green-600' :
                  result.status === 'reviewed' ? 'border-blue-600 text-blue-600' :
                  'border-yellow-600 text-yellow-600'
                }`}
              >
                {statusLabel}
              </Badge>
            </div>
          </div>

          {/* Share Management Panel */}
          <Separator className="my-6 print:hidden" />
          <div className="print:hidden">
            <ResultSharePanel
              resultId={result.id}
              resultStatus={result.status}
              sourceHorseKind={
                result.sample?.horse?.id
                  ? "platform"
                  : (result.sample as { lab_horse_id?: string | null } | undefined)?.lab_horse_id
                    ? "lab"
                    : result.sample?.horse_name
                      ? "walkin"
                      : "unknown"
              }
              sourceHorseId={
                result.sample?.horse?.id
                  ?? (result.sample as { lab_horse_id?: string | null } | undefined)?.lab_horse_id
                  ?? null
              }
            />
          </div>
        </ReportChrome>
      </DialogContent>
    </Dialog>
  );
}
