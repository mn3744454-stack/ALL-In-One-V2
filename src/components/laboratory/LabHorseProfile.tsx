import { useMemo, useState } from "react";
import { ArrowLeft, FlaskConical, FileText, Receipt, User, Calendar, Hash, Phone, Printer, Download } from "lucide-react";
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
import { useI18n } from "@/i18n";
import { useLabHorses, type LabHorse } from "@/hooks/laboratory/useLabHorses";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabResults, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabHorseFinancialSummary, type LabHorseInvoiceSummary } from "@/hooks/laboratory/useLabHorseFinancialSummary";
import { SampleStatusBadge } from "./SampleStatusBadge";
import { InvoiceStatusBadge } from "@/components/finance/InvoiceStatusBadge";
import { InvoiceDetailsSheet } from "@/components/finance/InvoiceDetailsSheet";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LabHorseProfileProps {
  horseId: string;
  onBack: () => void;
  onSampleClick?: (sampleId: string) => void;
  onResultClick?: (resultId: string) => void;
}

export function LabHorseProfile({ horseId, onBack, onSampleClick, onResultClick }: LabHorseProfileProps) {
  const { t, lang, dir } = useI18n();
  const [activeTab, setActiveTab] = useState("samples");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSampleClick = (sample: LabSample) => {
    if (onSampleClick) {
      onSampleClick(sample.id);
    }
  };

  const handleResultClick = (result: LabResult) => {
    if (onResultClick) {
      onResultClick(result.id);
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
              {format(new Date(sample.collection_date), "PP")}
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
            <TableHead className="text-center">{t("laboratory.samples.sampleId")}</TableHead>
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
                {format(new Date(sample.collection_date), "PP")}
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
                {format(new Date(result.created_at), "PP")}
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
                  {format(new Date(result.created_at), "PP")}
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
                  <span>{format(new Date(invoice.issueDate), "PP")}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-medium">
              {formatCurrency(invoice.totalAmount)}
            </span>
            <InvoiceStatusBadge status={invoice.status} />
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
            <TableHead className="text-center">{t("finance.invoices.invoiceNumber")}</TableHead>
            <TableHead className="text-center">{t("finance.invoices.client")}</TableHead>
            <TableHead className="text-center">{t("common.date")}</TableHead>
            <TableHead className="text-center">{t("finance.invoices.total")}</TableHead>
            <TableHead className="text-center">{t("common.status")}</TableHead>
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
                {invoice.issueDate ? format(new Date(invoice.issueDate), "PP") : "-"}
              </TableCell>
              <TableCell className="text-center font-mono font-medium">
                {formatCurrency(invoice.totalAmount)}
              </TableCell>
              <TableCell className="text-center">
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 me-2" />
        {t("common.back")}
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
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
            {/* Future: Print/Export Report button */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {horse.microchip_number && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.walkIn.microchip")}</p>
                  <p className="font-mono text-sm">{horse.microchip_number}</p>
                </div>
              </div>
            )}
            {horse.passport_number && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.walkIn.passportNumber")}</p>
                  <p className="font-mono text-sm">{horse.passport_number}</p>
                </div>
              </div>
            )}
            {horse.owner_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.labHorses.ownerName")}</p>
                  <p className="text-sm">{horse.owner_name}</p>
                </div>
              </div>
            )}
            {horse.owner_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("laboratory.labHorses.ownerPhone")}</p>
                  <p className="font-mono text-sm">{horse.owner_phone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="samples" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {t("laboratory.labHorses.samplesCount")} ({horseSamples.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("laboratory.labHorses.resultsCount")} ({horseResults.length})
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <Receipt className="h-4 w-4" />
            {t("laboratory.labHorses.financialSummary")}
          </TabsTrigger>
        </TabsList>

        {/* Samples Tab */}
        <TabsContent value="samples">
          <div className="space-y-4">
            {/* ViewSwitcher for samples */}
            <div className="flex justify-end">
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
            {/* ViewSwitcher for results */}
            <div className="flex justify-end">
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
              {/* Summary Cards */}
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
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary?.totalBilled || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.totalPaid")}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(financialSummary?.totalPaid || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t("laboratory.labHorses.outstanding")}</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      (financialSummary?.outstanding || 0) > 0 && "text-destructive"
                    )}>
                      {formatCurrency(financialSummary?.outstanding || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{t("laboratory.labHorses.invoices")}</CardTitle>
                  {/* ViewSwitcher for invoices */}
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

      {/* Invoice Details Sheet */}
      <InvoiceDetailsSheet
        open={!!selectedInvoiceId}
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
      />
    </div>
  );
}
