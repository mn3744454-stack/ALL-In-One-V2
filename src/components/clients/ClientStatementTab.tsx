import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { useClientStatement } from "@/hooks/clients/useClientStatement";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime12h } from "@/lib/formatters";
import { getCurrentLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, subMonths } from "date-fns";
import { Download, Printer, FileText, Filter, FileDown } from "lucide-react";
import { StatementScopeSelector, type StatementScopeConfig, type ScopeHorse } from "./StatementScopeSelector";
import { printStatement, exportCSV, exportPDF } from "./StatementPrintUtils";
import { cn } from "@/lib/utils";

interface ClientStatementTabProps {
  clientId: string;
  clientName?: string;
}

export function ClientStatementTab({ clientId, clientName }: ClientStatementTabProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const { activeTenant } = useTenant();
  const isRTL = dir === "rtl";

  const canViewStatement = isOwner || hasPermission("clients.statement.view");
  const canExport = isOwner || hasPermission("clients.statement.export");

  // Scope selector state
  const [scopeOpen, setScopeOpen] = useState(true); // Open on mount
  const [scopeConfig, setScopeConfig] = useState<StatementScopeConfig>({
    dateFrom: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    mode: "all",
    selectedHorseIds: [],
  });
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch horses for this client
  const [clientHorses, setClientHorses] = useState<ScopeHorse[]>([]);
  useEffect(() => {
    async function fetchHorses() {
      if (!activeTenant?.tenant?.id || !clientId) return;

      // Get horse IDs from invoice_items via invoices for this client
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("client_id", clientId);

      if (!invoices || invoices.length === 0) return;

      const invoiceIds = invoices.map((inv: any) => inv.id);

      // Get lab_sample entity_ids from invoice_items
      const { data: items } = await supabase
        .from("invoice_items" as any)
        .select("entity_id")
        .in("invoice_id", invoiceIds)
        .eq("entity_type", "lab_sample");

      if (!items || items.length === 0) return;

      const sampleIds = (items as any[]).map((i) => i.entity_id).filter(Boolean);
      if (sampleIds.length === 0) return;

      // Get unique horse IDs from lab_samples
      const { data: samples } = await supabase
        .from("lab_samples")
        .select("lab_horse_id")
        .in("id", sampleIds);

      if (!samples) return;

      const horseIds = [...new Set((samples as any[]).map((s) => s.lab_horse_id).filter(Boolean))];
      if (horseIds.length === 0) return;

      // Fetch horse names
      const { data: horses } = await supabase
        .from("lab_horses")
        .select("id, name, name_ar")
        .in("id", horseIds);

      if (horses) {
        setClientHorses(horses as ScopeHorse[]);
      }
    }

    fetchHorses();
  }, [activeTenant?.tenant?.id, clientId]);

  const { statement, isLoading } = useClientStatement(
    hasGenerated ? clientId : null,
    scopeConfig.dateFrom,
    scopeConfig.dateTo
  );

  // Filter entries by horse if scope is "horses"
  const [horseFilteredEntryIds, setHorseFilteredEntryIds] = useState<Set<string> | null>(null);
  
  useEffect(() => {
    async function filterByHorses() {
      if (scopeConfig.mode !== "horses" || scopeConfig.selectedHorseIds.length === 0 || !statement) {
        setHorseFilteredEntryIds(null);
        return;
      }

      // Get invoice IDs from ledger entries
      const invoiceRefs = statement.entries
        .filter((e) => e.reference_type === "invoice" && e.reference_id)
        .map((e) => e.reference_id!);

      if (invoiceRefs.length === 0) {
        setHorseFilteredEntryIds(new Set());
        return;
      }

      // Get invoice_items with lab_sample entity_type
      const { data: items } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, entity_id")
        .in("invoice_id", invoiceRefs)
        .eq("entity_type", "lab_sample");

      if (!items || items.length === 0) {
        setHorseFilteredEntryIds(new Set());
        return;
      }

      const sampleIds = (items as any[]).map((i) => i.entity_id).filter(Boolean);
      
      // Get samples and check horse_id
      const { data: samples } = await supabase
        .from("lab_samples")
        .select("id, lab_horse_id")
        .in("id", sampleIds);

      const matchingInvoiceIds = new Set<string>();
      if (samples) {
        const selectedSet = new Set(scopeConfig.selectedHorseIds);
        const sampleToInvoice = new Map<string, string[]>();
        (items as any[]).forEach((item) => {
          if (!sampleToInvoice.has(item.entity_id)) sampleToInvoice.set(item.entity_id, []);
          sampleToInvoice.get(item.entity_id)!.push(item.invoice_id);
        });

        (samples as any[]).forEach((s) => {
          if (selectedSet.has(s.lab_horse_id)) {
            const invIds = sampleToInvoice.get(s.id) || [];
            invIds.forEach((id) => matchingInvoiceIds.add(id));
          }
        });
      }

      // Include payment entries for matching invoices too
      const allowedEntryIds = new Set<string>();
      statement.entries.forEach((e) => {
        if (e.reference_id && matchingInvoiceIds.has(e.reference_id)) {
          allowedEntryIds.add(e.id);
        }
      });

      setHorseFilteredEntryIds(allowedEntryIds);
    }

    filterByHorses();
  }, [scopeConfig.mode, scopeConfig.selectedHorseIds, statement]);

  const entries = useMemo(() => {
    if (!statement) return [];
    if (horseFilteredEntryIds === null) return statement.entries;
    return statement.entries.filter((e) => horseFilteredEntryIds.has(e.id));
  }, [statement, horseFilteredEntryIds]);

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    entries.forEach((e) => {
      totalDebit += e.debit;
      totalCredit += e.credit;
    });
    const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
    return { totalDebit, totalCredit, closingBalance };
  }, [entries]);

  const handleGenerate = (config: StatementScopeConfig) => {
    setScopeConfig(config);
    setHasGenerated(true);
  };

  if (!canViewStatement) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("common.noPermission")}
        </CardContent>
      </Card>
    );
  }

  const printData = {
    clientName: clientName || clientId,
    dateFrom: scopeConfig.dateFrom,
    dateTo: scopeConfig.dateTo,
    entries,
    totalDebits: summary.totalDebit,
    totalCredits: summary.totalCredit,
    closingBalance: summary.closingBalance,
    isRTL,
  };

  const handlePrint = () => printStatement(printData);
  const handleExportCSV = () => exportCSV(printData);
  const handleExportPDF = () => exportPDF(printData);

  return (
    <div className="space-y-4">
      {/* Scope Selector */}
      <StatementScopeSelector
        open={scopeOpen}
        onOpenChange={setScopeOpen}
        clientName={clientName}
        horses={clientHorses}
        initialConfig={scopeConfig}
        onGenerate={handleGenerate}
      />

      {!hasGenerated ? (
        /* Prompt to open scope */
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">{t("clients.statement.title")}</h3>
              <p className="text-muted-foreground text-sm mt-1">{clientName}</p>
            </div>
            <Button onClick={() => setScopeOpen(true)}>
              {t("clients.statement.scope.generate")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter chips + actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("clients.statement.title")}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs" dir="ltr">
                    {t("clients.statement.scope.dateFrom")} {scopeConfig.dateFrom} {t("clients.statement.scope.dateTo")} {scopeConfig.dateTo}
                  </Badge>
                  {scopeConfig.mode === "horses" && (
                    <Badge variant="secondary" className="text-xs">
                      {t("clients.statement.scope.horsesSelected").replace(
                        "{count}",
                        String(scopeConfig.selectedHorseIds.length)
                      )}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScopeOpen(true)}
                  >
                    <Filter className="h-4 w-4 me-1" />
                    {t("common.filter")}
                  </Button>
                  {canExport && (
                    <>
                      <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">{t("clients.statement.print")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportCSV}>
                        <Download className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">CSV</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <FileDown className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-3 grid-cols-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{t("clients.statement.totalDebit")}</p>
                <p className="text-lg font-bold font-mono tabular-nums" dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summary.totalDebit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{t("clients.statement.totalCredit")}</p>
                <p className="text-lg font-bold text-primary font-mono tabular-nums" dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summary.totalCredit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{t("clients.statement.closingBalance")}</p>
                <p className={cn("text-lg font-bold font-mono tabular-nums", summary.closingBalance > 0 && "text-destructive")} dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(summary.closingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Statement entries */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {t("clients.statement.noEntries")}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center w-[160px]">{t("common.date")}</TableHead>
                          <TableHead className={dir === "rtl" ? "text-right" : "text-left"}>{t("common.description")}</TableHead>
                          <TableHead className="text-center">{t("clients.statement.debit")}</TableHead>
                          <TableHead className="text-center">{t("clients.statement.credit")}</TableHead>
                          <TableHead className="text-center">{t("clients.statement.balance")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-center font-mono text-sm tabular-nums whitespace-nowrap" dir="ltr">
                              {formatDateTime12h(entry.date, getCurrentLanguage())}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {t(`finance.ledger.entryTypes.${entry.entry_type}`) || entry.entry_type}
                                </Badge>
                                <span className={cn("text-sm truncate max-w-[400px]", dir === "rtl" ? "text-right" : "text-left")} title={entry.description}>{entry.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                              {entry.debit > 0 ? (
                                <span className="text-destructive">{formatCurrency(entry.debit)}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                              {entry.credit > 0 ? (
                                <span className="text-primary">{formatCurrency(entry.credit)}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium tabular-nums" dir="ltr">
                              {formatCurrency(entry.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile stacked rows */}
                  <div className="sm:hidden divide-y">
                    {entries.map((entry) => (
                      <div key={entry.id} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {t(`finance.ledger.entryTypes.${entry.entry_type}`) || entry.entry_type}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                              {formatDateTime12h(entry.date, getCurrentLanguage())}
                            </span>
                          </div>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground truncate">{entry.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm font-mono tabular-nums" dir="ltr">
                          <div className="flex gap-4">
                            {entry.debit > 0 && (
                              <span className="text-destructive">{t("clients.statement.debit")}: {formatCurrency(entry.debit)}</span>
                            )}
                            {entry.credit > 0 && (
                              <span className="text-primary">{t("clients.statement.credit")}: {formatCurrency(entry.credit)}</span>
                            )}
                          </div>
                          <span className="font-medium">{formatCurrency(entry.balance)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
