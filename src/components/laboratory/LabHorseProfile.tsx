import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, FileText, Receipt, User, Calendar, Hash, Download, Edit, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { useLabHorses, type LabHorse } from "@/hooks/laboratory/useLabHorses";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabResults, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabHorseFinancialSummary, type LabHorseInvoiceSummary } from "@/hooks/laboratory/useLabHorseFinancialSummary";
import { SampleStatusBadge } from "./SampleStatusBadge";
import { InvoiceStatusBadge } from "@/components/finance/InvoiceStatusBadge";
import { InvoiceDetailsSheet } from "@/components/finance/InvoiceDetailsSheet";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { OwnerQuickViewPopover } from "./OwnerQuickViewPopover";
import { formatCurrency } from "@/lib/formatters";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LabHorseProfileProps {
  horseId: string;
  onBack: () => void;
  onSampleClick?: (sampleId: string) => void;
  onResultClick?: (resultId: string) => void;
  onEdit?: (horse: LabHorse) => void;
}

export function LabHorseProfile({ horseId, onBack, onSampleClick, onResultClick, onEdit }: LabHorseProfileProps) {
  const { t, lang, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const [activeTab, setActiveTab] = useState("samples");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);

  // Permission checks - deny by default
  const canEditHorse = hasPermission("laboratory.horses.edit");
  const canExport = hasPermission("laboratory.horses.export");
  const canRecordPayment = isOwner || hasPermission("finance.payments.create");

  // View preferences per tab
  const { viewMode: samplesView, gridColumns: samplesGridCols, setViewMode: setSamplesView, setGridColumns: setSamplesGridCols } = useViewPreference('lab-horse-samples');
  const { viewMode: resultsView, gridColumns: resultsGridCols, setViewMode: setResultsView, setGridColumns: setResultsGridCols } = useViewPreference('lab-horse-results');
  const { viewMode: invoicesView, setViewMode: setInvoicesView } = useViewPreference('lab-horse-invoices');

  // Fetch horse data
  const { labHorses, loading: horsesLoading } = useLabHorses({ includeArchived: true });
  const horse = useMemo(() => labHorses.find(h => h.id === horseId), [labHorses, horseId]);

  // Fetch samples for this horse
  const { samples, loading: samplesLoading } = useLabSamples({});
  const horseSamples = useMemo(
    () => samples.filter(s => s.lab_horse_id === horseId),
    [samples, horseId]
  );

  // Fetch results - filter by sample's lab_horse (check via lab_horse.id)
  const { results, loading: resultsLoading } = useLabResults();
  const horseResults = useMemo(
    () => results.filter(r => r.sample?.lab_horse?.id === horseId),
    [results, horseId]
  );

  // Fetch financial summary
  const { data: financialSummary, isLoading: financialLoading } = useLabHorseFinancialSummary(horseId);

  const getHorseDisplayName = (horse: LabHorse) => {
    if (lang === 'ar' && horse.name_ar) {
      return horse.name_ar;
    }
    return horse.name;
  };

  // Use centralized formatter for EN digits
  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  const handleSampleClick = (sample: LabSample) => {
    onSampleClick?.(sample.id);
  };

  const handleResultClick = (result: LabResult) => {
    onResultClick?.(result.id);
  };

  const handleExportReport = async () => {
    if (!horse) return;

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
      });

      const margin = 48;
      let y = 64;

      doc.setFontSize(16);
      doc.text(t("laboratory.labHorses.exportReport"), margin, y);
      y += 20;

      doc.setFontSize(12);
      doc.text(`${t("laboratory.labHorses.name")}: ${getHorseDisplayName(horse)}`, margin, y);
      y += 16;

      if (horse.owner_name || horse.owner_phone) {
        doc.text(`${t("laboratory.labHorses.ownerName")}: ${horse.owner_name || '-'}`, margin, y);
        y += 16;
        doc.text(`${t("laboratory.labHorses.ownerPhone")}: ${horse.owner_phone || '-'}`, margin, y);
        y += 16;
      }

      y += 8;
      doc.text(`${t("laboratory.labHorses.samplesCount")}: ${horseSamples.length}`, margin, y);
      y += 16;
      doc.text(`${t("laboratory.labHorses.resultsCount")}: ${horseResults.length}`, margin, y);
      y += 16;

      if (financialSummary) {
        y += 8;
        doc.text(`${t("laboratory.labHorses.totalBilled")}: ${formatAmount(financialSummary.totalBilled || 0)}`, margin, y);
        y += 16;
        doc.text(`${t("laboratory.labHorses.totalPaid")}: ${formatAmount(financialSummary.totalPaid || 0)}`, margin, y);
        y += 16;
        doc.text(`${t("laboratory.labHorses.outstanding")}: ${formatAmount(financialSummary.outstanding || 0)}`, margin, y);
        y += 16;
      }

      const fileName = `lab-horse-report-${horse.id}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error(e);
    }
  };

  if (horsesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("common.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("common.notFoundInOrg")}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sample card renderer
  const renderSampleCard = (sample: LabSample) => (
    <Card 
      key={sample.id} 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSampleClick(sample)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {sample.daily_number && (
                <span className="font-bold">#{sample.daily_number}</span>
              )}
              <span className="text-sm text-muted-foreground font-mono">
                {sample.physical_sample_id || sample.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(sample.collection_date), "dd-MM-yyyy")}
            </div>
          </div>
          <SampleStatusBadge status={sample.status} />
        </div>
      </CardContent>
    </Card>
  );

  // Sample table renderer
  const renderSamplesTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">#</TableHead>
            <TableHead className="text-center">{t("laboratory.table.sampleId")}</TableHead>
            <TableHead className="text-center">{t("common.date")}</TableHead>
            <TableHead className="text-center">{t("common.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {horseSamples.map((sample) => (
            <TableRow
              key={sample.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSampleClick(sample)}
            >
              <TableCell className="text-center font-bold">
                {sample.daily_number || "-"}
              </TableCell>
              <TableCell className="text-center font-mono text-sm">
                {sample.physical_sample_id || sample.id.slice(0, 8)}
              </TableCell>
              <TableCell className="text-center">
                {format(new Date(sample.collection_date), "dd-MM-yyyy")}
              </TableCell>
              <TableCell className="text-center">
                <SampleStatusBadge status={sample.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Result card renderer
  const renderResultCard = (result: LabResult) => {
    const templateName = lang === 'ar'
      ? (result.template?.name_ar || result.template?.name || t("laboratory.results.unknownTemplate"))
      : (result.template?.name || t("laboratory.results.unknownTemplate"));

    return (
      <Card 
        key={result.id} 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleResultClick(result)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{templateName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(result.created_at), "dd-MM-yyyy")}
              </div>
            </div>
            <Badge
              variant={result.status === 'final' ? 'default' : 'secondary'}
              className={cn(
                result.status === 'final' && "bg-primary/10 text-primary border-primary/20",
                result.status === 'reviewed' && "bg-accent text-accent-foreground",
                result.status === 'draft' && "bg-muted text-muted-foreground"
              )}
            >
              {t(`laboratory.resultStatus.${result.status}`)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Results table renderer
  const renderResultsTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">{t("laboratory.templates.title")}</TableHead>
            <TableHead className="text-center">{t("common.date")}</TableHead>
            <TableHead className="text-center">{t("common.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {horseResults.map((result) => {
            const templateName = lang === 'ar'
              ? (result.template?.name_ar || result.template?.name || t("laboratory.results.unknownTemplate"))
              : (result.template?.name || t("laboratory.results.unknownTemplate"));

            return (
              <TableRow
                key={result.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleResultClick(result)}
              >
                <TableCell className="text-center font-medium">
                  {templateName}
                </TableCell>
                <TableCell className="text-center">
                  {format(new Date(result.created_at), "dd-MM-yyyy")}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={result.status === 'final' ? 'default' : 'secondary'}
                    className={cn(
                      result.status === 'final' && "bg-primary/10 text-primary border-primary/20",
                      result.status === 'reviewed' && "bg-accent text-accent-foreground",
                      result.status === 'draft' && "bg-muted text-muted-foreground"
                    )}
                  >
                    {t(`laboratory.resultStatus.${result.status}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // Invoice card renderer
  const renderInvoiceCard = (invoice: LabHorseInvoiceSummary) => (
    <Card
      key={invoice.invoiceId}
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setSelectedInvoiceId(invoice.invoiceId)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium font-mono">{invoice.invoiceNumber}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {invoice.clientName && (
                <span>{invoice.clientName}</span>
              )}
              {invoice.issueDate && (
                <>
                  <span>•</span>
                  <span>{format(new Date(invoice.issueDate), "dd-MM-yyyy")}</span>
                </>
              )}
            </div>
            {/* Show paid/outstanding */}
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-primary font-mono tabular-nums" dir="ltr">
                {t("finance.payments.paidSoFar")}: {formatAmount(invoice.paidAmount)}
              </span>
              {invoice.outstandingAmount > 0.01 && (
                <span className="text-destructive font-mono tabular-nums" dir="ltr">
                  {t("finance.payments.outstanding")}: {formatAmount(invoice.outstandingAmount)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-medium tabular-nums" dir="ltr">
              {formatAmount(invoice.totalAmount)}
            </span>
            <InvoiceStatusBadge status={invoice.status} />
            {canRecordPayment && invoice.outstandingAmount > 0.01 && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPaymentInvoiceId(invoice.invoiceId);
                }}
              >
                <CreditCard className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Invoices table renderer
  const renderInvoicesTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">{t("finance.invoices.number")}</TableHead>
            <TableHead className="text-center">{t("finance.invoices.client")}</TableHead>
            <TableHead className="text-center">{t("common.date")}</TableHead>
            <TableHead className="text-center">{t("finance.invoices.total")}</TableHead>
            <TableHead className="text-center">{t("finance.payments.paidSoFar")}</TableHead>
            <TableHead className="text-center">{t("finance.payments.outstanding")}</TableHead>
            <TableHead className="text-center">{t("common.status")}</TableHead>
            {canRecordPayment && <TableHead className="text-center">{t("common.actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(financialSummary?.invoices || []).map((invoice) => (
            <TableRow
              key={invoice.invoiceId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedInvoiceId(invoice.invoiceId)}
            >
              <TableCell className="text-center font-mono">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell className="text-center">
                {invoice.clientName || "-"}
              </TableCell>
              <TableCell className="text-center">
                {invoice.issueDate ? format(new Date(invoice.issueDate), "dd-MM-yyyy") : "-"}
              </TableCell>
              <TableCell className="text-center font-mono font-medium tabular-nums" dir="ltr">
                {formatAmount(invoice.totalAmount)}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums text-primary" dir="ltr">
                {formatAmount(invoice.paidAmount)}
              </TableCell>
              <TableCell className={cn(
                "text-center font-mono tabular-nums",
                invoice.outstandingAmount > 0.01 && "text-destructive"
              )} dir="ltr">
                {formatAmount(invoice.outstandingAmount)}
              </TableCell>
              <TableCell className="text-center">
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              {canRecordPayment && (
                <TableCell className="text-center">
                  {invoice.outstandingAmount > 0.01 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentInvoiceId(invoice.invoiceId);
                      }}
                    >
                      <CreditCard className="h-4 w-4 me-1" />
                      {t("finance.payments.recordPayment")}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back Button (RTL-aware placement + icon) */}
      <div className={cn("flex", dir === 'rtl' ? 'justify-end' : 'justify-start')}>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          {dir === 'rtl' ? (
            <>
              <ArrowRight className="h-4 w-4 ms-2" />
              {t("common.back")}
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t("common.back")}
            </>
          )}
        </Button>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-2xl flex items-center gap-2">
                {getHorseDisplayName(horse)}
                {horse.is_archived && (
                  <Badge variant="secondary">{t("laboratory.labHorses.archived")}</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {horse.microchip_number || horse.passport_number || horse.ueln || t("laboratory.labHorses.noDetails")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {canEditHorse && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(horse)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t("common.edit")}
                </Button>
              )}
              {canExport && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportReport}
                >
                  <Download className="h-4 w-4" />
                  {t("laboratory.labHorses.exportReport")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {horse.microchip_number && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.walkIn.microchip")}</p>
                  <p className="font-mono text-sm" dir="ltr">{horse.microchip_number}</p>
                </div>
              </div>
            )}
            {horse.passport_number && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.walkIn.passportNumber")}</p>
                  <p className="font-mono text-sm" dir="ltr">{horse.passport_number}</p>
                </div>
              </div>
            )}
            {(horse.owner_name || horse.owner_phone) && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.labHorses.ownerName")}</p>
                  <OwnerQuickViewPopover 
                    ownerName={horse.owner_name} 
                    ownerPhone={horse.owner_phone}
                  >
                    <span className="text-sm font-medium">
                      {horse.owner_name || horse.owner_phone}
                    </span>
                  </OwnerQuickViewPopover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start h-12 mb-4">
          <TabsTrigger value="samples" className="gap-2 text-sm px-4 py-2.5">
            <FlaskConical className="h-4 w-4" />
            {t("laboratory.labHorses.samplesCount")} ({horseSamples.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2 text-sm px-4 py-2.5">
            <FileText className="h-4 w-4" />
            {t("laboratory.labHorses.resultsCount")} ({horseResults.length})
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 text-sm px-4 py-2.5">
            <Receipt className="h-4 w-4" />
            {t("laboratory.labHorses.financialSummary")}
          </TabsTrigger>
        </TabsList>

        {/* Samples Tab */}
        <TabsContent value="samples">
          <div className="space-y-4">
            <div className={cn("flex", dir === 'rtl' ? 'justify-start' : 'justify-end')}>
              <ViewSwitcher
                viewMode={samplesView}
                gridColumns={samplesGridCols}
                onViewModeChange={setSamplesView}
                onGridColumnsChange={setSamplesGridCols}
                showTable={true}
              />
            </div>

            {samplesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : horseSamples.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("laboratory.labHorses.noSamples")}
                </CardContent>
              </Card>
            ) : (
              <>
                {samplesView === 'table' && renderSamplesTable()}
                {(samplesView === 'grid' || samplesView === 'list') && (
                  <div className={getGridClass(samplesGridCols, samplesView)}>
                    {horseSamples.map(renderSampleCard)}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="space-y-4">
            <div className={cn("flex", dir === 'rtl' ? 'justify-start' : 'justify-end')}>
              <ViewSwitcher
                viewMode={resultsView}
                gridColumns={resultsGridCols}
                onViewModeChange={setResultsView}
                onGridColumnsChange={setResultsGridCols}
                showTable={true}
              />
            </div>

            {resultsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : horseResults.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("laboratory.labHorses.noResults")}
                </CardContent>
              </Card>
            ) : (
              <>
                {resultsView === 'table' && renderResultsTable()}
                {(resultsView === 'grid' || resultsView === 'list') && (
                  <div className={getGridClass(resultsGridCols, resultsView)}>
                    {horseResults.map(renderResultCard)}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          {financialLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.samplesCount")}</p>
                    <p className="text-2xl font-bold">{financialSummary?.totalSamples || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.totalBilled")}</p>
                    <p className="text-2xl font-bold font-mono tabular-nums" dir="ltr">{formatAmount(financialSummary?.totalBilled || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.totalPaid")}</p>
                    <p className="text-2xl font-bold text-primary font-mono tabular-nums" dir="ltr">{formatAmount(financialSummary?.totalPaid || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.outstanding")}</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      (financialSummary?.outstanding || 0) > 0 && "text-destructive"
                    )}>
                      {formatAmount(financialSummary?.outstanding || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{t("laboratory.labHorses.invoices")}</CardTitle>
                  <ViewSwitcher
                    viewMode={invoicesView}
                    gridColumns={2}
                    onViewModeChange={setInvoicesView}
                    onGridColumnsChange={() => {}}
                    showTable={true}
                  />
                </CardHeader>
                <CardContent>
                  {!financialSummary?.invoices?.length ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t("laboratory.labHorses.noInvoices")}
                    </p>
                  ) : (
                    <>
                      {invoicesView === 'table' && renderInvoicesTable()}
                      {(invoicesView === 'grid' || invoicesView === 'list') && (
                        <div className="space-y-2">
                          {financialSummary.invoices.map(renderInvoiceCard)}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InvoiceDetailsSheet
        open={!!selectedInvoiceId}
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
      />

      <RecordPaymentDialog
        open={!!paymentInvoiceId}
        onOpenChange={(open) => !open && setPaymentInvoiceId(null)}
        invoiceId={paymentInvoiceId}
      />
    </div>
  );
}
