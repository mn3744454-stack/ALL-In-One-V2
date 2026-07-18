import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useClientFirstActivity } from "@/hooks/clients/useClientFirstActivity";
import { useUnallocatedPayments } from "@/hooks/clients/useUnallocatedPayments";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime12h, formatDate } from "@/lib/formatters";
import { useLedgerBalance } from "@/hooks/finance/useLedgerBalance";
import { getCurrentLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { format, subMonths } from "date-fns";
import { Download, Printer, FileText, Filter, FileDown, ChevronDown, Info, ArrowUpDown, Wallet } from "lucide-react";
import { StatementScopeSelector, type StatementScopeConfig, type ScopeHorse } from "./StatementScopeSelector";
import { printStatement, exportCSV, exportPDF } from "./StatementPrintUtils";
import { cn } from "@/lib/utils";
import { summarizeStatement } from "@/lib/finance/statementSemantics";
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
    isOtherCharges?: boolean;
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
    // "Other charges" remainder row for non-boarding items on a boarding invoice
    if (segment.isOtherCharges) {
      const label = isRTL ? "رسوم أخرى" : "Other charges";
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <DomainBadge source="boarding" t={t} />
          {segment.horseName && (
            <span className="text-xs font-medium">🐴 {segment.horseName}</span>
          )}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      );
    }
    const fromLabel = isRTL ? "من" : "From";
    const toLabel = isRTL ? "إلى" : "To";
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <DomainBadge source="boarding" t={t} />
        {segment.horseName && (
          <span className="text-xs font-medium">🐴 {segment.horseName}</span>
        )}
        <span className="text-xs text-muted-foreground" dir="ltr">
          {fromLabel} {formatDate(segment.periodStart, 'dd-MM-yyyy')} {toLabel} {formatDate(segment.periodEnd, 'dd-MM-yyyy')}
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
function segmentToString(seg: FlatStatementRow["segment"], horseName?: string, isRTL?: boolean): string {
  if (!seg) return "-";
  if (seg.isOtherCharges) {
    const label = isRTL ? "رسوم أخرى" : "Other charges";
    return horseName ? `${horseName} | ${label}` : label;
  }
  const parts: string[] = [];
  if (horseName) parts.push(horseName);
  const from = isRTL ? "من" : "From";
  const to = isRTL ? "إلى" : "To";
  parts.push(`${from} ${seg.periodStart} ${to} ${seg.periodEnd} (${seg.days}d)`);
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

  // Slice 2B — URL persistence for scope config so statements are shareable.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFromUrl = useMemo<Partial<StatementScopeConfig> & { hasParams: boolean }>(() => {
    const df = searchParams.get("df");
    const dt = searchParams.get("dt");
    const mode = searchParams.get("mode");
    const horses = searchParams.get("horses");
    const cats = searchParams.get("cats");
    const hasParams = !!(df || dt || mode || horses || cats);
    return {
      dateFrom: df || undefined,
      dateTo: dt || undefined,
      mode: (mode === "horses" ? "horses" : mode === "all" ? "all" : undefined) as any,
      selectedHorseIds: horses ? horses.split(",").filter(Boolean) : undefined,
      categoryKeys: cats ? cats.split(",").filter(Boolean) : undefined,
      hasParams,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // read once on mount

  // Scope selector state
  const [scopeOpen, setScopeOpen] = useState(!initialFromUrl.hasParams);
  const [scopeConfig, setScopeConfig] = useState<StatementScopeConfig>({
    dateFrom: initialFromUrl.dateFrom || format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    dateTo: initialFromUrl.dateTo || format(new Date(), "yyyy-MM-dd"),
    mode: initialFromUrl.mode || "all",
    selectedHorseIds: initialFromUrl.selectedHorseIds || [],
    domainFilter: "all", // Deprecated in Slice 2B — filtering now uses categoryKeys
    categoryKeys: initialFromUrl.categoryKeys || [],
  });
  const [hasGenerated, setHasGenerated] = useState(initialFromUrl.hasParams);


  // Client-wide total invoices (all invoice debits across all time)
  const [clientWideTotalInvoices, setClientWideTotalInvoices] = useState<number>(0);
  useEffect(() => {
    async function fetchTotalInvoices() {
      if (!clientId || !activeTenant?.tenant?.id) return;
      const { data } = await supabase
        .from("ledger_entries")
        .select("amount")
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("client_id", clientId)
        .eq("entry_type", "invoice");
      const total = (data || []).reduce((sum: number, row: any) => sum + Math.max(0, Number(row.amount || 0)), 0);
      setClientWideTotalInvoices(total);
    }
    fetchTotalInvoices();
  }, [clientId, activeTenant?.tenant?.id]);

  // Sort order state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  // Slice 2B — Snapshot-based category filter (OR semantics across selected keys).
  // Empty categoryKeys = All Categories. Special key "__uncategorized__" matches
  // entries whose invoice_items carry no category snapshot (or the entry has no
  // line items at all, e.g. a raw payment ledger row).
  const UNCATEGORIZED_KEY = "__uncategorized__";
  const domainFilteredEntries = useMemo(() => {
    const selected = scopeConfig.categoryKeys || [];
    if (selected.length === 0) return entries;
    const selectedSet = new Set(selected);
    const wantsUncategorized = selectedSet.has(UNCATEGORIZED_KEY);
    return entries.filter(e => {
      const enriched = enrichment.get(e.id);
      const keys = enriched?.categoryKeys || [];
      if (keys.some(k => selectedSet.has(k))) return true;
      if (wantsUncategorized) {
        // Entry counts as uncategorized when it either has no enrichment (raw
        // payment / adjustment) or at least one line item lacks a snapshot.
        if (!enriched) return true;
        if (enriched.hasUncategorizedItem) return true;
        if (enriched.categoryKeys.length === 0) return true;
      }
      return false;
    });
  }, [entries, enrichment, scopeConfig.categoryKeys]);

  // Whether we are in a filtered/scoped view
  const isScoped =
    scopeConfig.mode === "horses" || (scopeConfig.categoryKeys?.length ?? 0) > 0;


  // Build flat rows: explode boarding invoices into segment rows
  // Guard: return empty while enrichment is loading to prevent stale/misleading intermediate state
  const flatRows = useMemo((): FlatStatementRow[] => {
    if (isEnriching) return [];
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
        let segmentTotal = 0;
        for (let i = 0; i < enriched.boardingSegments.length; i++) {
          const seg = enriched.boardingSegments[i];
          segmentTotal += seg.amount;
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

        // If the invoice total exceeds the sum of boarding segments,
        // add a remainder row for non-boarding items on the same invoice
        const remainder = entry.debit - segmentTotal;
        if (remainder > 0.01) {
          rows.push({
            key: `${entry.id}_other`,
            entry,
            isSegment: true,
            segment: {
              periodStart: "",
              periodEnd: entry.date,
              days: 0,
              amount: remainder,
              horseName,
              isOtherCharges: true,
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
    // Sort rows by effective date
    // 2QA-A · Finding 2 — Sort/display uses the canonical effective posting
    // date (parent ledger row date) even for exploded boarding segments. The
    // segment period stays visible only inside the description column.
    const getRowDate = (row: FlatStatementRow): string => row.entry.date;
    rows.sort((a, b) => {
      const da = new Date(getRowDate(a)).getTime();
      const db = new Date(getRowDate(b)).getTime();
      return sortOrder === "asc" ? da - db : db - da;
    });
    return rows;
  }, [domainFilteredEntries, enrichment, isEnriching, sortOrder]);

  // 2QA-A · Finding 1 (patch) — Neutralized rows (orphan cancellations whose
  // paired invoice debit is not in the scoped set) contribute zero to the
  // running balance to prevent a false credit balance.
  const scopedSummary = useMemo(() => {
    const s = summarizeStatement(domainFilteredEntries);
    return {
      totalDebit: s.totalInvoices,
      totalCredit: s.totalPaid,
      rawBalance: s.rawBalance,
      outstanding: s.outstanding,
      creditBalance: s.creditBalance,
      neutralizedRowIds: new Set(s.neutralizedRowIds),
      scopedOutstanding: s.rawBalance,
    };
  }, [domainFilteredEntries]);

  // Running balance: recompute from visible rows, skipping neutralized rows.
  const runningBalances = useMemo(() => {
    const balances = new Map<string, number>();
    let balance = 0;
    for (const row of flatRows) {
      const neutralized = scopedSummary.neutralizedRowIds.has(row.entry.id);
      if (neutralized) {
        // Show the row but do not shift the running balance.
        balances.set(row.key, balance);
        continue;
      }
      if (row.isSegment && row.segment) {
        balance += row.segment.amount;
      } else if (!row.isSegment) {
        balance += row.entry.debit - row.entry.credit;
      }
      balances.set(row.key, balance);
    }
    return balances;
  }, [flatRows, scopedSummary.neutralizedRowIds]);

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

  // Slice 2B — Snapshot-backed historical category display + uncategorized detection.
  const { historicalCategoryKeys, hasUncategorizedItems } = useMemo(() => {
    const seen = new Map<string, { name: string; nameAr: string | null }>();
    let anyUncat = false;
    for (const e of entries) {
      const enriched = enrichment.get(e.id);
      if (!enriched) { anyUncat = true; continue; }
      if (enriched.hasUncategorizedItem || enriched.categoryKeys.length === 0) {
        anyUncat = true;
      }
      for (const d of enriched.categoryDisplay) {
        if (!seen.has(d.key)) seen.set(d.key, { name: d.name, nameAr: d.nameAr });
      }
    }
    return {
      historicalCategoryKeys: Array.from(seen.keys()),
      historicalCategoryDisplay: seen,
      hasUncategorizedItems: anyUncat,
    };
  }, [entries, enrichment]);

  const scopeContextCategory = useMemo(() => {
    const keys = scopeConfig.categoryKeys || [];
    if (keys.length === 0) return t("clients.statement.scopeContext.allCategories");
    const parts: string[] = [];
    for (const k of keys) {
      if (k === "__uncategorized__") {
        parts.push(t("clients.statement.scope.historicallyUncategorized"));
        continue;
      }
      // Try to find a display name from the visible dataset first (preserves
      // archived-category names via snapshot); fall back to the key itself.
      let displayName = k;
      for (const [, enriched] of enrichment) {
        const hit = enriched.categoryDisplay.find(d => d.key === k);
        if (hit) {
          displayName = isRTL ? (hit.nameAr || hit.name) : hit.name;
          break;
        }
      }
      parts.push(displayName);
    }
    return parts.join(", ");
  }, [scopeConfig.categoryKeys, enrichment, isRTL, t]);

  // Slice 2B — Auxiliary data for scope selector and header presentation.
  const { firstActivityDate } = useClientFirstActivity(clientId);
  const { unallocated } = useUnallocatedPayments(
    clientId,
    scopeConfig.dateFrom,
    scopeConfig.dateTo
  );
  // Slice 2C — Lifetime customer ledger balance (source of truth for
  // Customer Total Outstanding). Negative = credit balance → outstanding = 0.
  const { balance: lifetimeLedgerBalance } = useLedgerBalance(clientId);
  const customerTotalOutstanding = Math.max(0, Number(lifetimeLedgerBalance || 0));
  const customerCreditBalance = Math.max(0, -Number(lifetimeLedgerBalance || 0));

  const handleGenerate = (config: StatementScopeConfig) => {
    setScopeConfig(config);
    setHasGenerated(true);
    // Slice 2B — Persist scope in the URL so the same view is shareable/reloadable.
    const next = new URLSearchParams(searchParams);
    next.set("df", config.dateFrom);
    next.set("dt", config.dateTo);
    next.set("mode", config.mode);
    if (config.mode === "horses" && config.selectedHorseIds.length > 0) {
      next.set("horses", config.selectedHorseIds.join(","));
    } else {
      next.delete("horses");
    }
    if (config.categoryKeys && config.categoryKeys.length > 0) {
      next.set("cats", config.categoryKeys.join(","));
    } else {
      next.delete("cats");
    }
    setSearchParams(next, { replace: true });
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
      printEnrichedDescriptions.set(row.key, segmentToString(row.segment, row.segment?.horseName, isRTL));
    } else {
      printEnrichedDescriptions.set(row.key, enrichedToString(row.entry, row.enriched, lang));
    }
  });

  // Convert flat rows into print-compatible entries with scoped running balance
  const printEntries: StatementEntry[] = flatRows.map(row => {
    if (row.isSegment && row.segment) {
      return {
        id: row.key,
        // 2QA-A · Finding 2 — canonical effective date on every export row
        date: row.entry.date,
        entry_type: row.entry.entry_type as StatementEntry["entry_type"],
        description: segmentToString(row.segment, row.segment.horseName, isRTL),
        reference_type: row.entry.reference_type,
        reference_id: row.entry.reference_id,
        debit: row.segment.amount,
        credit: 0,
        balance: runningBalances.get(row.key) || 0,
        payment_method: null,
      };
    }
    return {
      ...row.entry,
      balance: runningBalances.get(row.key) || 0,
    };
  });

  const printData = {
    clientName: clientName || clientId,
    dateFrom: scopeConfig.dateFrom,
    dateTo: scopeConfig.dateTo,
    entries: printEntries,
    enrichedDescriptions: printEnrichedDescriptions,
    // 2QA-A · Finding 1 — Print/PDF/CSV inherit the same semantic totals.
    totalDebits: scopedSummary.totalDebit,
    totalCredits: scopedSummary.totalCredit,
    scopedOutstanding: scopedSummary.outstanding,
    scopedCreditBalance: scopedSummary.creditBalance,
    // Slice 2C — Customer-wide, lifetime cards (only meaningful in scoped mode)
    customerTotalInvoices: isScoped ? clientWideTotalInvoices : undefined,
    customerTotalOutstanding: isScoped ? customerTotalOutstanding : undefined,
    scopeHorses: scopeContextHorses,
    scopeCategory: scopeContextCategory,
    isScoped,
    isRTL,
    lang,
    // Slice 2C — Issuer identity is mandatory on Print/PDF/CSV.
    issuerName: activeTenant?.tenant?.name,
    issuerNameAr: (activeTenant?.tenant as any)?.name_ar ?? null,
    firstActivityDate,
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
        historicalCategoryKeys={historicalCategoryKeys}
        hasUncategorizedItems={hasUncategorizedItems}
        firstActivityDate={firstActivityDate}
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
                  {/* Slice 2B — Issuer identity + scope context line */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {activeTenant?.tenant?.name && (
                      <Badge variant="outline" className="text-xs">
                        {t("clients.statement.issuer")}:{" "}
                        {isRTL
                          ? ((activeTenant.tenant as any).name_ar || activeTenant.tenant.name)
                          : activeTenant.tenant.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-xs" dir="ltr">
                      {t("clients.statement.scope.dateFrom")}: {formatDate(scopeConfig.dateFrom, 'dd-MM-yyyy')} — {t("clients.statement.scope.dateTo")}: {formatDate(scopeConfig.dateTo, 'dd-MM-yyyy')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t("clients.statement.scopeContext.horses")}: {scopeContextHorses}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {t("clients.statement.scopeContext.category")}: {scopeContextCategory}
                    </Badge>
                    {firstActivityDate && (
                      <Badge variant="outline" className="text-xs" dir="ltr">
                        {t("clients.statement.scope.firstFinancialActivity")}: {firstActivityDate}
                      </Badge>
                    )}
                  </div>

                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}>
                    <ArrowUpDown className="h-4 w-4 me-1" />
                    <span className="hidden sm:inline">{sortOrder === "asc" ? t("clients.statement.sortOldestFirst") : t("clients.statement.sortNewestFirst")}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setScopeOpen(true)}>
                    <Filter className="h-4 w-4 me-1" />
                    {t("common.filter")}
                  </Button>
                  {canExport && (
                    <>
                      <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || isEnriching}>
                        <Printer className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">{t("clients.statement.print")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || isEnriching}>
                        <Download className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">CSV</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || isEnriching}>
                        <FileDown className="h-4 w-4 me-1" />
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Slice 2C — Summary Cards.
              Overall mode = 3 cards (Total Invoices / Paid / Outstanding).
              Scoped mode = 5 cards (in-scope trio + Customer Total Invoices +
              Customer Total Outstanding). Grid keeps 1 col on very narrow
              screens, 2 cols on ≥sm, and expands on desktop. Never scrolls
              horizontally. */}
          <div
            className={cn(
              "grid gap-3",
              isScoped
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                : "grid-cols-1 sm:grid-cols-3"
            )}
          >
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {isScoped ? t("clients.statement.scopedInvoices") : t("clients.statement.totalInvoices")}
                </p>
                <p className="text-lg font-bold font-mono tabular-nums" dir="ltr">
                  {(isLoading || isEnriching) ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.totalDebit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">
                  {isScoped ? t("clients.statement.scopedPaid") : t("clients.statement.totalPaid")}
                </p>
                <p className="text-lg font-bold text-primary font-mono tabular-nums" dir="ltr">
                  {(isLoading || isEnriching) ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.totalCredit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p
                  className="text-xs text-muted-foreground"
                  title={isScoped
                    ? (isRTL
                        ? "الفواتير ضمن النطاق ناقصاً المدفوعات الفعلية ضمن النطاق. لا يشمل الحركات على مستوى العميل. لا يظهر برقم سالب أبداً."
                        : "In-scope invoices minus in-scope real payments. Excludes customer-level activities. Never displays a negative value.")
                    : (isRTL
                        ? "إجمالي المبلغ المستحق على العميل بعد خصم المدفوعات الفعلية."
                        : "Total amount due after subtracting real payments.")}
                >
                  {isScoped ? t("clients.statement.scopedOutstanding") : t("clients.statement.totalOutstanding")}
                </p>
                {/* 2QA-A · Finding 1 — Outstanding is clamped to ≥ 0. A genuine
                    negative scoped balance is shown separately below as
                    "Credit Balance in Scope". */}
                <p className={cn("text-lg font-bold font-mono tabular-nums", scopedSummary.outstanding > 0 && "text-destructive")} dir="ltr">
                  {(isLoading || isEnriching) ? <Skeleton className="h-6 w-20" /> : formatCurrency(scopedSummary.outstanding)}
                </p>
                {scopedSummary.creditBalance > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400" dir="ltr">
                    {t("clients.statement.scopedCreditBalance")}: {formatCurrency(scopedSummary.creditBalance)}
                  </p>
                )}
              </CardContent>
            </Card>
            {isScoped && (
              <>
                <Card className="border-dashed">
                  <CardContent className="p-3">
                    <p
                      className="text-xs text-muted-foreground flex items-center gap-1"
                      title={isRTL
                        ? "إجمالي فواتير العميل مدى الحياة (المُرحّلة فقط). يتجاهل التاريخ والخيول والتصنيفات."
                        : "Lifetime posted invoices for this customer. Ignores date, horse, and category filters."}
                    >
                      <Info className="h-3 w-3" />
                      {t("clients.statement.customerTotalInvoices")}
                    </p>
                    <p className="text-lg font-bold font-mono tabular-nums" dir="ltr">
                      {(isLoading || isEnriching) ? <Skeleton className="h-6 w-20" /> : formatCurrency(clientWideTotalInvoices)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-3">
                    <p
                      className="text-xs text-muted-foreground flex items-center gap-1"
                      title={isRTL
                        ? "= max(0, رصيد كشف حساب العميل). عند وجود رصيد دائن يُعرض كرصيد دائن ويكون المستحق صفراً."
                        : "= max(0, customer ledger balance). If the balance is negative, outstanding is 0 and a credit balance chip appears."}
                    >
                      <Info className="h-3 w-3" />
                      {t("clients.statement.customerTotalOutstanding")}
                    </p>
                    <p className={cn("text-lg font-bold font-mono tabular-nums", customerTotalOutstanding > 0 && "text-destructive")} dir="ltr">
                      {(isLoading || isEnriching) ? <Skeleton className="h-6 w-20" /> : formatCurrency(customerTotalOutstanding)}
                    </p>
                    {customerCreditBalance > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400" dir="ltr">
                        {t("clients.statement.creditBalance")}: {formatCurrency(customerCreditBalance)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Slice 2C — Scoped-mode helper: explain that customer-level
              activities are excluded from scope totals. */}
          {isScoped && unallocated.count > 0 && (
            <p className="text-[11px] text-muted-foreground italic px-1">
              {t("clients.statement.scopeExcludesHelper")}
            </p>
          )}

          {/* Slice 2B — Unallocated payments (conditional; presentation-only) */}
          {unallocated.count > 0 && (
            <Card className="border-dashed border-amber-300 dark:border-amber-800">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">
                      {t("clients.statement.unallocatedPayments")}
                    </p>
                    <p>
                      {t("clients.statement.unallocatedCount").replace(
                        "{count}",
                        String(unallocated.count)
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300" dir="ltr">
                  {formatCurrency(unallocated.totalAmount)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Slice 2 Correction 2 — Customer-level Activity: detailed rows for
              customer-scoped movements that are not attributable to a specific
              horse or category. Excluded from scoped paid/outstanding totals;
              included in customer-wide balance. */}
          {isScoped && unallocated.entries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  {isRTL ? "حركة على مستوى العميل" : "Customer-level Activity"}
                  <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">
                    {unallocated.entries.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("clients.statement.date")}</TableHead>
                        <TableHead>{t("clients.statement.description")}</TableHead>
                        <TableHead className="text-end">{t("clients.statement.debit")}</TableHead>
                        <TableHead className="text-end">{t("clients.statement.credit")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unallocated.entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap text-xs" dir="ltr">
                            {formatDateTime12h(e.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {e.entry_type === "payment"
                                  ? (isRTL ? "دفعة على مستوى العميل" : "Customer-level Payment")
                                  : t(`finance.ledger.entryTypes.${e.entry_type}`) || e.entry_type}
                              </Badge>
                              {e.payment_method && (
                                <Badge variant="secondary" className="text-xs">{e.payment_method}</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {e.description || (isRTL ? "بدون مرجع" : "No reference")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-end font-mono tabular-nums text-xs" dir="ltr">
                            {e.debit > 0 ? formatCurrency(e.debit) : "—"}
                          </TableCell>
                          <TableCell className="text-end font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400" dir="ltr">
                            {e.credit > 0 ? formatCurrency(e.credit) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile stacked */}
                <div className="sm:hidden divide-y">
                  {unallocated.entries.map((e) => (
                    <div key={e.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {e.entry_type === "payment"
                            ? (isRTL ? "دفعة على مستوى العميل" : "Customer-level Payment")
                            : t(`finance.ledger.entryTypes.${e.entry_type}`) || e.entry_type}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground" dir="ltr">
                          {formatDateTime12h(e.date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.description || (isRTL ? "بدون مرجع" : "No reference")}
                      </p>
                      <div className="flex items-center justify-end gap-3 text-xs font-mono tabular-nums" dir="ltr">
                        {e.debit > 0 && <span>{formatCurrency(e.debit)}</span>}
                        {e.credit > 0 && (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            −{formatCurrency(e.credit)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t bg-muted/20 text-[11px] text-muted-foreground italic">
                  {isRTL
                    ? "لا تشمل إجماليات النطاق الحركات غير الموزعة على خيل أو خدمة محددة."
                    : "Scope totals exclude customer-level activities that are not allocated to a specific horse or service."}
                </div>
              </CardContent>
            </Card>
          )}

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
                          const runningBal = runningBalances.get(row.key) || 0;

                          if (row.isSegment && row.segment) {
                            return (
                              <TableRow key={row.key} className="align-top bg-muted/20">
                                <TableCell className="text-center font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground" dir="ltr">
                                  {/* 2QA-A · Finding 2 — segment rows show the parent posting date */}
                                  {formatDate(row.entry.date, 'dd-MM-yyyy')}
                                </TableCell>
                                <TableCell>
                                  <RowDescription row={row} isRTL={isRTL} t={t} />
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums whitespace-nowrap" dir="ltr">
                                  <span className="text-destructive">{formatCurrency(row.segment.amount)}</span>
                                </TableCell>
                                <TableCell className="text-center font-mono tabular-nums whitespace-nowrap" dir="ltr">-</TableCell>
                                <TableCell className="text-center font-mono font-medium tabular-nums whitespace-nowrap" dir="ltr">
                                  {formatCurrency(runningBal)}
                                </TableCell>
                              </TableRow>
                            );
                          }

                          const isNeutralized = scopedSummary.neutralizedRowIds.has(row.entry.id);
                          return (
                            <TableRow key={row.key} className={cn("align-top", isNeutralized && "opacity-60")}>
                              <TableCell className="text-center font-mono text-sm tabular-nums whitespace-nowrap" dir="ltr">
                                {formatDate(row.entry.date, 'dd-MM-yyyy')}
                              </TableCell>
                              <TableCell>
                                <RowDescription row={row} isRTL={isRTL} t={t} />
                                {isNeutralized && (
                                  <span className="ms-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 align-middle">
                                    {isRTL ? "خارج النطاق — لا تؤثر في الرصيد" : "Out of scope — no balance effect"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono tabular-nums whitespace-nowrap" dir="ltr">
                                {row.entry.debit > 0 ? (
                                  <span className={cn(!isNeutralized && "text-destructive", isNeutralized && "line-through text-muted-foreground")}>{formatCurrency(row.entry.debit)}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-mono tabular-nums whitespace-nowrap" dir="ltr">
                                {row.entry.credit > 0 ? (
                                  <span className={cn(!isNeutralized && "text-primary", isNeutralized && "line-through text-muted-foreground")}>{formatCurrency(row.entry.credit)}</span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center font-mono font-medium tabular-nums whitespace-nowrap" dir="ltr">
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
                      const runningBal = runningBalances.get(row.key) || 0;

                      if (row.isSegment && row.segment) {
                        return (
                          <div key={row.key} className="p-3 space-y-1 bg-muted/20">
                            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                              {/* 2QA-A · Finding 2 — mobile segment rows show the parent posting date */}
                              {formatDate(row.entry.date, 'dd-MM-yyyy')}
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
