import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/i18n";
import { useClientStatement } from "@/hooks/clients/useClientStatement";
import { useStatementEnrichment, type EnrichedStatementData, type EnrichedHorse } from "@/hooks/clients/useStatementEnrichment";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime12h, formatDate } from "@/lib/formatters";
import { getCurrentLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, subMonths } from "date-fns";
import { Download, Printer, FileText, Filter, FileDown, ChevronDown, Info, ArrowUpDown } from "lucide-react";
import { StatementScopeSelector, type StatementScopeConfig, type ScopeHorse } from "./StatementScopeSelector";
import { printStatement, exportCSV, exportPDF } from "./StatementPrintUtils";
import { cn } from "@/lib/utils";
import type { StatementEntry } from "@/hooks/clients/useClientStatement";

interface ClientStatementTabProps {
  clientId: string;
  clientName?: string;
}

/** Domain source badge for statement rows */
function DomainBadge({ source, t }: { source?: "lab" | "boarding" | "breeding" | "vet" | "general"; t: (k: string) => string }) {
  if (!source || source === "general") return null;
  const labelMap: Record<string, string> = {
    boarding: t("clients.statement.domain.boarding"),
    breeding: t("clients.statement.domain.breeding"),
    lab: t("clients.statement.domain.lab"),
    vet: t("vet.domain.vet"),
  };
  const label = labelMap[source] || source;
  const clsMap: Record<string, string> = {
    boarding: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    breeding: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    lab: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    vet: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  const cls = clsMap[source] || "";
  return <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", cls)}>{label}</Badge>;
}

/** Determine the primary domain source from enriched data */
function getPrimarySource(enriched?: EnrichedStatementData): "lab" | "boarding" | "breeding" | "vet" | "general" | undefined {
  if (enriched?.directDomain) {
    const d = enriched.directDomain;
    if (d === "vet" || d === "breeding" || d === "boarding" || d === "lab" || d === "general") return d;
  }
  if (!enriched || enriched.horses.length === 0) return undefined;
  const sources = enriched.horses.map(h => h.source).filter(Boolean);
  if (sources.includes("vet")) return "vet";
  if (sources.includes("breeding")) return "breeding";
  if (sources.includes("boarding")) return "boarding";
  if (sources.includes("lab")) return "lab";
  return undefined;
}

/** A single flattened statement row — either a ledger entry or a boarding segment sub-row */
interface FlatStatementRow {
  /** unique key for React rendering */
  key: string;
  /** the original ledger entry this belongs to */
  entry: StatementEntry;
  /** if this is a boarding segment sub-row */
  isSegment: boolean;
  /** segment-specific data */
  segment?: {
    periodStart: string;
    periodEnd: string;
    days: number;
    amount: number;
    horseName?: string;
  };
  /** enriched data for the parent entry */
  enriched?: EnrichedStatementData;
}

/** Renders the description cell for a flat statement row */
function RowDescription({
  row,
  isRTL,
  t,
}: {
  row: FlatStatementRow;
  isRTL: boolean;
  t: (key: string) => string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { entry, enriched, isSegment, segment } = row;

  // Boarding segment sub-row — compact description
  if (isSegment && segment) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <DomainBadge source="boarding" t={t} />
        {segment.horseName && (
          <span className="text-xs font-medium">🐴 {segment.horseName}</span>
        )}
        <span className="text-xs text-muted-foreground font-mono" dir="ltr">
          {formatDate(segment.periodStart, 'dd-MM-yyyy')} → {formatDate(segment.periodEnd, 'dd-MM-yyyy')}
        </span>
        <span className="text-xs text-muted-foreground">({segment.days}d)</span>
      </div>
    );
  }

  const typeBadge = (
    <Badge variant="outline" className="text-xs shrink-0">
      {t(`finance.ledger.entryTypes.${entry.entry_type}`) || entry.entry_type}
    </Badge>
  );
  const domainBadge = <DomainBadge source={getPrimarySource(enriched)} t={t} />;

  if (!enriched) {
    return (
      <div className="flex items-center gap-2">
        {typeBadge}
        <span className="text-sm text-muted-foreground">{entry.description || "-"}</span>
      </div>
    );
  }

  // Payment row
  if (entry.entry_type === "payment") {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          {typeBadge}
          {domainBadge}
          {enriched.paymentMethod && (
            <Badge variant="secondary" className="text-xs">{enriched.paymentMethod}</Badge>
          )}
          {enriched.invoiceNumber && (
            <span className="text-sm font-medium font-mono" dir="ltr">{enriched.invoiceNumber}</span>
          )}
        </div>
        {enriched.horses.length > 0 && (
          <p className="text-xs text-muted-foreground ps-1">
            {enriched.horses.map(h => h.horseName).filter(Boolean).join(", ")}
          </p>
        )}
      </div>
    );
  }

  // Invoice row (non-boarding or boarding without segments — segments are rendered as separate rows)
  if (entry.entry_type === "invoice") {
    const hasHorses = enriched.horses.length > 0;
    const isMulti = enriched.isMultiHorse;

    let horseSummary = "";
    if (hasHorses) {
      const names = enriched.horses.map(h => h.horseName).filter(Boolean);
      if (names.length <= 2) {
        horseSummary = names.join(", ");
      } else {
        horseSummary = `${names.slice(0, 2).join(", ")} (+${names.length - 2})`;
      }
    }

    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          {typeBadge}
          {domainBadge}
          {enriched.invoiceNumber && (
            <span className="text-sm font-semibold font-mono" dir="ltr">{enriched.invoiceNumber}</span>
          )}
        </div>
        {hasHorses && !isMulti && (
          <p className="text-xs text-muted-foreground ps-1">
            🐴 {enriched.horses[0].horseName}
            {enriched.horses[0].samples.length > 0 && (
              <span className="ms-2 font-mono" dir="ltr">
                {t("clients.statement.sampleLabel")}: {enriched.horses[0].samples.map(s => s.sampleLabel).join(", ")}
              </span>
            )}
          </p>
        )}
        {isMulti && (
          <p className="text-xs text-muted-foreground ps-1">
            🐴 {t("clients.statement.horsesLabel")}: {horseSummary}
          </p>
        )}
        {enriched.itemsSummary && (
          <p className="text-xs text-muted-foreground ps-1">
            {t("clients.statement.itemsLabel")}: {enriched.itemsSummary}
          </p>
        )}
        {isMulti && (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-primary hover:underline ps-1 mt-0.5">
                <ChevronDown className={cn("h-3 w-3 transition-transform", detailsOpen && "rotate-180")} />
                {detailsOpen ? t("clients.statement.hideDetails") : t("clients.statement.showDetails")}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ps-3 mt-1 space-y-1 border-s-2 border-muted ms-1">
                {enriched.horses.map(horse => (
                  <div key={horse.horseId} className="text-xs">
                    <span className="font-medium">{horse.horseName}</span>
                    {horse.samples.length > 0 && (
                      <span className="text-muted-foreground ms-1 font-mono" dir="ltr">
                        ({horse.samples.map(s => s.sampleLabel).join(", ")})
                      </span>
                    )}
                    {horse.items.length > 0 && (
                      <span className="text-muted-foreground ms-1">— {horse.items.join(", ")}</span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // Other entry types (credit, adjustment)
  return (
    <div className="flex items-center gap-2">
      {typeBadge}
      {domainBadge}
      <span className="text-sm text-muted-foreground">{entry.description || "-"}</span>
    </div>
  );
}

/** Convert enriched data to a flat string for print/export */
export function enrichedToString(
  entry: StatementEntry,
  enriched?: EnrichedStatementData,
  lang: string = "en"
): string {
  if (!enriched) return entry.description || "-";
  const parts: string[] = [];

  if (entry.entry_type === "payment") {
    if (enriched.paymentMethod) parts.push(enriched.paymentMethod);
    if (enriched.invoiceNumber) parts.push(enriched.invoiceNumber);
    if (enriched.horses.length > 0) {
      parts.push(enriched.horses.map(h => h.horseName).filter(Boolean).join(", "));
    }
  } else if (entry.entry_type === "invoice") {
    if (enriched.invoiceNumber) parts.push(enriched.invoiceNumber);
    if (enriched.horses.length > 0) {
      const horseNames = enriched.horses.map(h => h.horseName).filter(Boolean);
      if (enriched.isMultiHorse) {
        parts.push(`(${horseNames.join(", ")})`);
      } else {
        parts.push(horseNames[0]);
        const samples = enriched.horses[0].samples.map(s => s.sampleLabel).join(", ");
        if (samples) parts.push(samples);
      }
    }
    if (enriched.itemsSummary) parts.push(enriched.itemsSummary);
  } else {
    return entry.description || "-";
  }

  return parts.join(" | ") || entry.description || "-";
}

/** Build a flat description string for a boarding segment row (for print) */
function segmentToString(seg: FlatStatementRow["segment"], horseName?: string): string {
  if (!seg) return "-";
  const parts: string[] = [];
  if (horseName) parts.push(horseName);
  parts.push(`${seg.periodStart} → ${seg.periodEnd} (${seg.days}d)`);
  return parts.join(" | ");
}

export function ClientStatementTab({ clientId, clientName }: ClientStatementTabProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const { activeTenant } = useTenant();
  const isRTL = dir === "rtl";
  const lang = getCurrentLanguage();

  const canViewStatement = isOwner || hasPermission("clients.statement.view");
  const canExport = isOwner || hasPermission("clients.statement.export");

  // Scope selector state
  const [scopeOpen, setScopeOpen] = useState(true);
  const [scopeConfig, setScopeConfig] = useState<StatementScopeConfig>({
    dateFrom: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    mode: "all",
    selectedHorseIds: [],
    domainFilter: "all",
  });
  const [hasGenerated, setHasGenerated] = useState(false);

  // Client-wide outstanding balance
  const [clientWideOutstanding, setClientWideOutstanding] = useState<number>(0);
  useEffect(() => {
    async function fetchBalance() {
      if (!clientId) return;
      const { data } = await supabase
        .from("clients")
        .select("outstanding_balance")
        .eq("id", clientId)
        .single();
      setClientWideOutstanding(data?.outstanding_balance || 0);
    }
    fetchBalance();
  }, [clientId]);

  // Fetch horses for this client
  const [clientHorses, setClientHorses] = useState<ScopeHorse[]>([]);
  useEffect(() => {
    async function fetchHorses() {
      if (!activeTenant?.tenant?.id || !clientId) return;

      const allHorses: ScopeHorse[] = [];
      const seenIds = new Set<string>();

      // Lab horses
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("client_id", clientId);

      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((inv: any) => inv.id);
        const { data: items } = await supabase
          .from("invoice_items" as any)
          .select("entity_id")
          .in("invoice_id", invoiceIds)
          .eq("entity_type", "lab_sample");

        if (items && items.length > 0) {
          const sampleIds = (items as any[]).map(i => i.entity_id).filter(Boolean);
          if (sampleIds.length > 0) {
            const { data: samples } = await supabase
              .from("lab_samples")
              .select("lab_horse_id")
              .in("id", sampleIds);

            if (samples) {
              const horseIds = [...new Set((samples as any[]).map(s => s.lab_horse_id).filter(Boolean))];
              if (horseIds.length > 0) {
                const { data: horses } = await supabase
                  .from("lab_horses")
                  .select("id, name, name_ar")
                  .in("id", horseIds);
                horses?.forEach((h: any) => {
                  if (!seenIds.has(h.id)) {
                    seenIds.add(h.id);
                    allHorses.push(h as ScopeHorse);
                  }
                });
              }
            }
          }
        }
      }

      // Boarding horses
      const { data: admissions } = await supabase
        .from("boarding_admissions")
        .select("horse_id")
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("client_id", clientId);

      if (admissions && admissions.length > 0) {
        const stableHorseIds = [...new Set((admissions as any[]).map(a => a.horse_id).filter(Boolean))];
        if (stableHorseIds.length > 0) {
          const { data: horses } = await supabase
            .from("horses")
            .select("id, name, name_ar")
            .in("id", stableHorseIds);
          horses?.forEach((h: any) => {
            if (!seenIds.has(h.id)) {
              seenIds.add(h.id);
              allHorses.push(h as ScopeHorse);
            }
          });
        }
      }

      // Direct horse_id from invoice_items
      if (invoices && invoices.length > 0) {
        const invoiceIds = invoices.map((inv: any) => inv.id);
        const { data: directItems } = await supabase
          .from("invoice_items" as any)
          .select("horse_id")
          .in("invoice_id", invoiceIds)
          .not("horse_id", "is", null);
        if (directItems && directItems.length > 0) {
          const directHorseIds = [...new Set((directItems as any[]).map(i => i.horse_id).filter(Boolean))] as string[];
          const missingIds = directHorseIds.filter(id => !seenIds.has(id));
          if (missingIds.length > 0) {
            const { data: horses } = await supabase
              .from("horses")
              .select("id, name, name_ar")
              .in("id", missingIds);
            horses?.forEach((h: any) => {
              if (!seenIds.has(h.id)) {
                seenIds.add(h.id);
                allHorses.push(h as ScopeHorse);
              }
            });
          }
        }
      }

      setClientHorses(allHorses);
    }

    fetchHorses();
  }, [activeTenant?.tenant?.id, clientId]);

  const { statement, isLoading } = useClientStatement(
    hasGenerated ? clientId : null,
    scopeConfig.dateFrom,
    scopeConfig.dateTo
  );

  // Filter entries by horse
  const [horseFilteredEntryIds, setHorseFilteredEntryIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    async function filterByHorses() {
      if (scopeConfig.mode !== "horses" || scopeConfig.selectedHorseIds.length === 0 || !statement) {
        setHorseFilteredEntryIds(null);
        return;
      }

      const invoiceRefs = statement.entries
        .filter(e => e.reference_type === "invoice" && e.reference_id)
        .map(e => e.reference_id!);

      if (invoiceRefs.length === 0) {
        setHorseFilteredEntryIds(new Set());
        return;
      }

      const selectedSet = new Set(scopeConfig.selectedHorseIds);
      const matchingInvoiceIds = new Set<string>();

      // Lab path
      const { data: labItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, entity_id")
        .in("invoice_id", invoiceRefs)
        .eq("entity_type", "lab_sample");

      if (labItems && labItems.length > 0) {
        const sampleIds = (labItems as any[]).map(i => i.entity_id).filter(Boolean);
        if (sampleIds.length > 0) {
          const { data: samples } = await supabase
            .from("lab_samples")
            .select("id, lab_horse_id")
            .in("id", sampleIds);
          if (samples) {
            const sampleToInvoice = new Map<string, string[]>();
            (labItems as any[]).forEach(item => {
              if (!sampleToInvoice.has(item.entity_id)) sampleToInvoice.set(item.entity_id, []);
              sampleToInvoice.get(item.entity_id)!.push(item.invoice_id);
            });
            (samples as any[]).forEach(s => {
              if (selectedSet.has(s.lab_horse_id)) {
                const invIds = sampleToInvoice.get(s.id) || [];
                invIds.forEach(id => matchingInvoiceIds.add(id));
              }
            });
          }
        }
      }

      // Direct horse_id path
      const { data: directItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, horse_id")
        .in("invoice_id", invoiceRefs)
        .not("horse_id", "is", null);

      if (directItems) {
        (directItems as any[]).forEach(item => {
          if (selectedSet.has(item.horse_id)) {
            matchingInvoiceIds.add(item.invoice_id);
          }
        });
      }

      // Boarding path
      const { data: boardingItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, entity_id")
        .in("invoice_id", invoiceRefs)
        .eq("entity_type", "boarding");

      if (boardingItems && boardingItems.length > 0) {
        const admissionIds = (boardingItems as any[]).map(i => i.entity_id).filter(Boolean);
        if (admissionIds.length > 0) {
          const { data: admissions } = await supabase
            .from("boarding_admissions")
            .select("id, horse_id")
            .in("id", admissionIds);
          if (admissions) {
            const admToInvoice = new Map<string, string[]>();
            (boardingItems as any[]).forEach(item => {
              if (!admToInvoice.has(item.entity_id)) admToInvoice.set(item.entity_id, []);
              admToInvoice.get(item.entity_id)!.push(item.invoice_id);
            });
            (admissions as any[]).forEach(a => {
              if (selectedSet.has(a.horse_id)) {
                const invIds = admToInvoice.get(a.id) || [];
                invIds.forEach(id => matchingInvoiceIds.add(id));
              }
            });
          }
        }
      }

      // Vet path
      const { data: vetItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, entity_id")
        .in("invoice_id", invoiceRefs)
        .eq("entity_type", "vet");

      if (vetItems && vetItems.length > 0) {
        const treatmentIds = (vetItems as any[]).map(i => i.entity_id).filter(Boolean);
        if (treatmentIds.length > 0) {
          const { data: treatments } = await supabase
            .from("vet_treatments")
            .select("id, horse_id")
            .in("id", treatmentIds);
          if (treatments) {
            const treatToInvoice = new Map<string, string[]>();
            (vetItems as any[]).forEach(item => {
              if (!treatToInvoice.has(item.entity_id)) treatToInvoice.set(item.entity_id, []);
              treatToInvoice.get(item.entity_id)!.push(item.invoice_id);
            });
            (treatments as any[]).forEach(tr => {
              if (selectedSet.has(tr.horse_id)) {
                const invIds = treatToInvoice.get(tr.id) || [];
                invIds.forEach(id => matchingInvoiceIds.add(id));
              }
            });
          }
        }
      }

      const allowedEntryIds = new Set<string>();
      statement.entries.forEach(e => {
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
    let filtered = statement.entries;
    if (horseFilteredEntryIds !== null) {
      filtered = filtered.filter(e => horseFilteredEntryIds.has(e.id));
    }
    return filtered;
  }, [statement, horseFilteredEntryIds]);

  // Enrichment
  const { enrichment, isEnriching } = useStatementEnrichment(entries);

  // Apply domain filter post-enrichment
  const domainFilteredEntries = useMemo(() => {
    if (scopeConfig.domainFilter === "all") return entries;
    return entries.filter(e => {
      const enriched = enrichment.get(e.id);
      const domain = enriched?.directDomain || getPrimarySource(enriched);
      if (!domain) return scopeConfig.domainFilter === "general";
      return domain === scopeConfig.domainFilter;
    });
  }, [entries, enrichment, scopeConfig.domainFilter]);

  // Whether we are in a filtered/scoped view
  const isScoped = scopeConfig.mode === "horses" || scopeConfig.domainFilter !== "all";

  // Build flat rows: explode boarding invoices into segment rows
  const flatRows = useMemo((): FlatStatementRow[] => {
    const rows: FlatStatementRow[] = [];
    for (const entry of domainFilteredEntries) {
      const enriched = enrichment.get(entry.id);
      const isBoardingInvoice = entry.entry_type === "invoice" && enriched?.boardingSegments && enriched.boardingSegments.length > 0;

      if (isBoardingInvoice && enriched?.boardingSegments) {
        // Get the primary horse name for this boarding invoice
        const horseName = enriched.horses.length > 0
          ? enriched.horses.map(h => h.horseName).filter(Boolean).join(", ")
          : undefined;

        // Render each segment as its own row
        for (let i = 0; i < enriched.boardingSegments.length; i++) {
          const seg = enriched.boardingSegments[i];
          rows.push({
            key: `${entry.id}_seg_${i}`,
            entry,
            isSegment: true,
            segment: {
              periodStart: seg.periodStart,
              periodEnd: seg.periodEnd,
              days: seg.days,
              amount: seg.amount,
              horseName,
            },
            enriched,
          });
        }
      } else {
        // Regular row
        rows.push({
          key: entry.id,
          entry,
          isSegment: false,
          enriched,
        });
      }
    }
    return rows;
  }, [domainFilteredEntries, enrichment]);

  // Scoped running balance: recompute from scoped entries
  const scopedRunningBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let runningBalance = 0;
    for (const row of flatRows) {
      if (row.isSegment && row.segment) {
        runningBalance += row.segment.amount;
      } else if (!row.isSegment) {
        runningBalance += row.entry.debit - row.entry.credit;
      }
      balances.set(row.key, runningBalance);
    }
    return balances;
  }, [flatRows]);

  // Scoped summary
  const scopedSummary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    domainFilteredEntries.forEach(e => {
      totalDebit += e.debit;
      totalCredit += e.credit;
    });
    const scopedOutstanding = totalDebit - totalCredit;
    return { totalDebit, totalCredit, scopedOutstanding };
  }, [domainFilteredEntries]);

  // Build scope context strings
  const scopeContextHorses = useMemo(() => {
    if (scopeConfig.mode !== "horses" || scopeConfig.selectedHorseIds.length === 0) {
      return t("clients.statement.scopeContext.allHorses");
    }
    const selectedNames = scopeConfig.selectedHorseIds.map(id => {
      const horse = clientHorses.find(h => h.id === id);
      if (!horse) return "";
      return isRTL ? (horse.name_ar || horse.name) : (horse.name || horse.name_ar || "");
    }).filter(Boolean);
    return selectedNames.join(", ");
  }, [scopeConfig.mode, scopeConfig.selectedHorseIds, clientHorses, isRTL, t]);

  const scopeContextCategory = useMemo(() => {
    if (scopeConfig.domainFilter === "all") return t("clients.statement.scopeContext.allCategories");
    if (scopeConfig.domainFilter === "general") return t("clients.statement.scope.domainGeneral");
    return t(`clients.statement.domain.${scopeConfig.domainFilter}`) || scopeConfig.domainFilter;
  }, [scopeConfig.domainFilter, t]);

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

  // Build print data with flat rows, scope context, and dual totals
  const printEnrichedDescriptions = new Map<string, string>();
  flatRows.forEach(row => {
    if (row.isSegment) {
      printEnrichedDescriptions.set(row.key, segmentToString(row.segment, row.segment?.horseName));
    } else {
      printEnrichedDescriptions.set(row.key, enrichedToString(row.entry, row.enriched, lang));
    }
  });

  // Convert flat rows into print-compatible entries with scoped running balance
  const printEntries: StatementEntry[] = flatRows.map(row => {
    if (row.isSegment && row.segment) {
      return {
        id: row.key,
        date: row.entry.date,
        entry_type: row.entry.entry_type as StatementEntry["entry_type"],
        description: segmentToString(row.segment, row.segment.horseName),
        reference_type: row.entry.reference_type,
        reference_id: row.entry.reference_id,
        debit: row.segment.amount,
        credit: 0,
        balance: isScoped ? (scopedRunningBalances.get(row.key) || 0) : row.entry.balance,
        payment_method: null,
      };
    }
    return {
      ...row.entry,
      balance: isScoped ? (scopedRunningBalances.get(row.key) || 0) : row.entry.balance,
    };
  });

  const printData = {
    clientName: clientName || clientId,
    dateFrom: scopeConfig.dateFrom,
    dateTo: scopeConfig.dateTo,
    entries: printEntries,
    enrichedDescriptions: printEnrichedDescriptions,
    totalDebits: scopedSummary.totalDebit,
    totalCredits: scopedSummary.totalCredit,
    closingBalance: scopedSummary.scopedOutstanding,
    clientWideOutstanding: isScoped ? clientWideOutstanding : undefined,
    scopeHorses: scopeContextHorses,
    scopeCategory: scopeContextCategory,
    isScoped,
    isRTL,
    lang,
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
          {/* Header with scope context */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("clients.statement.title")}
                  </CardTitle>
                  {/* Scope context line */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <Badge variant="outline" className="font-mono text-xs" dir="ltr">
                      {formatDate(scopeConfig.dateFrom, 'dd-MM-yyyy')} → {formatDate(scopeConfig.dateTo, 'dd-MM-yyyy')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t("clients.statement.scopeContext.horses")}: {scopeContextHorses}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t("clients.statement.scopeContext.category")}: {scopeContextCategory}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setScopeOpen(true)}>
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

          {/* Summary Cards — scoped + client-wide */}
          <div className={cn("grid gap-3", isScoped ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {isScoped ? t("clients.statement.scopedDebit") : t("clients.statement.totalDebit")}
                </p>
                <p className="text-lg font-bold font-mono tabular-nums" dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.totalDebit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {isScoped ? t("clients.statement.scopedCredit") : t("clients.statement.totalCredit")}
                </p>
                <p className="text-lg font-bold text-primary font-mono tabular-nums" dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.totalCredit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {isScoped ? t("clients.statement.scopedBalance") : t("clients.statement.closingBalance")}
                </p>
                <p className={cn("text-lg font-bold font-mono tabular-nums", scopedSummary.scopedOutstanding > 0 && "text-destructive")} dir="ltr">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.scopedOutstanding)}
                </p>
              </CardContent>
            </Card>
            {isScoped && (
              <Card className="border-dashed">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {t("clients.statement.clientWideOutstanding")}
                  </p>
                  <p className={cn("text-lg font-bold font-mono tabular-nums", clientWideOutstanding > 0 && "text-destructive")} dir="ltr">
                    {isLoading ? <Skeleton className="h-6 w-20" /> : formatCurrency(clientWideOutstanding)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Statement entries */}
          <Card>
            <CardContent className="p-0">
              {(isLoading || isEnriching) ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : flatRows.length === 0 ? (
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
                        {flatRows.map(row => {
                          const runningBal = isScoped
                            ? (scopedRunningBalances.get(row.key) || 0)
                            : row.entry.balance;

                          if (row.isSegment && row.segment) {
                            return (
                              <TableRow key={row.key} className="align-top bg-muted/20">
                                <TableCell className="text-center font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground" dir="ltr">
                                  {formatDate(row.segment.periodStart, 'dd-MM-yyyy')}
                                </TableCell>
                                <TableCell>
                                  <RowDescription row={row} isRTL={isRTL} t={t} />
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                                  <span className="text-destructive">{formatCurrency(row.segment.amount)}</span>
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums" dir="ltr">-</TableCell>
                                <TableCell className="text-center font-mono font-medium tabular-nums" dir="ltr">
                                  {formatCurrency(runningBal)}
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return (
                            <TableRow key={row.key} className="align-top">
                              <TableCell className="text-center font-mono text-sm tabular-nums whitespace-nowrap" dir="ltr">
                                {formatDate(row.entry.date, 'dd-MM-yyyy')}
                              </TableCell>
                              <TableCell>
                                <RowDescription row={row} isRTL={isRTL} t={t} />
                              </TableCell>
                              <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                                {row.entry.debit > 0 ? (
                                  <span className="text-destructive">{formatCurrency(row.entry.debit)}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                                {row.entry.credit > 0 ? (
                                  <span className="text-primary">{formatCurrency(row.entry.credit)}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-mono font-medium tabular-nums" dir="ltr">
                                {formatCurrency(runningBal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile stacked rows */}
                  <div className="sm:hidden divide-y">
                    {flatRows.map(row => {
                      const runningBal = isScoped
                        ? (scopedRunningBalances.get(row.key) || 0)
                        : row.entry.balance;

                      if (row.isSegment && row.segment) {
                        return (
                          <div key={row.key} className="p-3 space-y-1 bg-muted/20">
                            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                              {formatDate(row.segment.periodStart, 'dd-MM-yyyy')}
                            </span>
                            <RowDescription row={row} isRTL={isRTL} t={t} />
                            <div className="flex items-center justify-between text-sm font-mono tabular-nums" dir="ltr">
                              <span className="text-destructive">{formatCurrency(row.segment.amount)}</span>
                              <span className="font-medium">{formatCurrency(runningBal)}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={row.key} className="p-3 space-y-2">
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {formatDate(row.entry.date, 'dd-MM-yyyy')}
                          </span>
                          <RowDescription row={row} isRTL={isRTL} t={t} />
                          <div className="flex items-center justify-between text-sm font-mono tabular-nums" dir="ltr">
                            <div className="flex gap-4">
                              {row.entry.debit > 0 && (
                                <span className="text-destructive">{formatCurrency(row.entry.debit)}</span>
                              )}
                              {row.entry.credit > 0 && (
                                <span className="text-primary">{formatCurrency(row.entry.credit)}</span>
                              )}
                            </div>
                            <span className="font-medium">{formatCurrency(runningBal)}</span>
                          </div>
                        </div>
                      );
                    })}
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
