import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { displayClientName } from "@/lib/displayHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useStableServicePlans } from "@/hooks/housing/useStableServicePlans";
import { useServicesByKind } from "@/hooks/useServices";
import { normalizeIncludes } from "@/lib/planIncludes";
import { getTenantTaxConfig, computeTax } from "@/lib/taxUtils";
import { useQuery } from "@tanstack/react-query";

import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { toast } from "sonner";
import { differenceInDays, format, startOfMonth, endOfMonth, parseISO, isWithinInterval, areIntervalsOverlapping } from "date-fns";
import { computeStayDays, computeAccruedCost } from "@/lib/boardingUtils";
import { decomposeStay, sumSegments, type BoardingBillingSegment } from "@/lib/boardingPeriodEngine";
import { formatDate } from "@/lib/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: BoardingAdmission;
}

interface BilledPeriod {
  period_start: string;
  period_end: string;
  total_price: number;
  invoice_number?: string;
}

export function CreateInvoiceFromAdmission({ open, onOpenChange, admission }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("boarding", admission.id);
  const { clients, loading: clientsLoading } = useClients();
  const { plans } = useStableServicePlans();
  const { data: boardingServices = [] } = useServicesByKind('boarding');

  // Tax config from tenant
  const taxConfig = getTenantTaxConfig(activeTenant?.tenant);

  // Fetch already-billed periods for this admission
  const { data: billedPeriods = [] } = useQuery({
    queryKey: ['boarding-billed-periods', tenantId, admission.id],
    queryFn: async (): Promise<BilledPeriod[]> => {
      if (!tenantId) return [];
      // Get invoice items linked to this admission via billing_links
      const { data: links } = await supabase
        .from('billing_links')
        .select('invoice_id')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'boarding')
        .eq('source_id', admission.id);

      if (!links || links.length === 0) return [];

      const invoiceIds = links.map(l => l.invoice_id);
      // Fetch invoice items with period data — only from financially active invoices
      const ACTIVE_STATUSES = ['approved', 'shared', 'paid', 'overdue', 'partial', 'issued', 'draft', 'reviewed'];
      const { data: items } = await (supabase as any)
        .from('invoice_items')
        .select('period_start, period_end, total_price, invoice_id')
        .in('invoice_id', invoiceIds)
        .eq('entity_type', 'boarding')
        .not('period_start', 'is', null);

      if (!items || items.length === 0) return [];

      // Filter to only active invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .in('id', invoiceIds)
        .in('status', ACTIVE_STATUSES);

      const activeInvoiceMap = new Map((invoices || []).map(inv => [inv.id, inv.invoice_number]));

      return items
        .filter((item: any) => activeInvoiceMap.has(item.invoice_id))
        .map((item: any) => ({
          period_start: item.period_start,
          period_end: item.period_end,
          total_price: item.total_price || 0,
          invoice_number: activeInvoiceMap.get(item.invoice_id) || undefined,
        }));
    },
    enabled: !!tenantId && open,
  });

  // Compute total accrued value (pre-tax) for the whole admission
  const totalAccrued = useMemo(() => {
    const days = computeStayDays(admission.admitted_at, admission.checked_out_at);
    return computeAccruedCost(days, admission.daily_rate, admission.monthly_rate, admission.billing_cycle, admission.admitted_at, admission.checked_out_at) || 0;
  }, [admission]);

  // Sum of already-billed pre-tax amounts
  const totalBilledPreTax = useMemo(() => {
    const rawBilled = billedPeriods.reduce((sum, p) => sum + p.total_price, 0);
    // Back-calculate pre-tax if tax-exclusive (billed includes tax)
    if (taxConfig.taxRate > 0 && !taxConfig.pricesTaxInclusive) {
      return Math.round(rawBilled / (1 + taxConfig.taxRate / 100) * 100) / 100;
    }
    return rawBilled;
  }, [billedPeriods, taxConfig]);

  const remainingBillable = Math.max(totalAccrued - totalBilledPreTax, 0);

  // Resolve plan and its included services
  const admissionPlan = admission.plan_id ? plans.find(p => p.id === admission.plan_id) : null;
  const planIncludes = admissionPlan ? normalizeIncludes(admissionPlan.includes) : [];

  // Resolve a boarding service_id from plan or catalog
  const boardingServiceId = useMemo(() => {
    if (admissionPlan && (admissionPlan as any).service_id) {
      return (admissionPlan as any).service_id as string;
    }
    const match = boardingServices.find(s => s.is_active && s.service_kind === 'boarding');
    return match?.id || null;
  }, [admissionPlan, boardingServices]);

  // Period selection — default to admission start (smart default applied after billed periods load)
  const admittedDate = new Date(admission.admitted_at);
  const today = new Date();
  const admissionStartDate = format(admittedDate, "yyyy-MM-dd");
  const defaultPeriodEnd = format(
    admission.checked_out_at ? new Date(admission.checked_out_at) : endOfMonth(today),
    "yyyy-MM-dd"
  );

  const [periodStart, setPeriodStart] = useState(admissionStartDate);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);

  // Decompose selected period into calendar-month segments
  const billingSegments = useMemo(() => {
    if (admission.billing_cycle === "daily") return [];
    if (!admission.monthly_rate) return [];
    return decomposeStay(periodStart, periodEnd, admission.monthly_rate);
  }, [periodStart, periodEnd, admission.monthly_rate, admission.billing_cycle]);

  // Compute days and estimated cost from the selected period
  const periodDays = Math.max(
    differenceInDays(new Date(periodEnd), new Date(periodStart)) + 1,
    1
  );

  const estimatedCost = admission.billing_cycle === "daily"
    ? (admission.daily_rate || 0) * periodDays
    : sumSegments(billingSegments);

  // Check for overlap with already-billed periods
  const overlapWarning = useMemo(() => {
    if (billedPeriods.length === 0) return null;
    const newStart = parseISO(periodStart);
    const newEnd = parseISO(periodEnd);
    for (const bp of billedPeriods) {
      if (!bp.period_start || !bp.period_end) continue;
      const bpStart = parseISO(bp.period_start);
      const bpEnd = parseISO(bp.period_end);
      try {
        if (areIntervalsOverlapping(
          { start: newStart, end: newEnd },
          { start: bpStart, end: bpEnd }
        )) {
          return bp.invoice_number
            ? `${t("housing.admissions.billing.overlapWarning")} (${bp.invoice_number}: ${formatDate(bp.period_start, 'dd-MM-yyyy')} → ${formatDate(bp.period_end, 'dd-MM-yyyy')})`
            : `${t("housing.admissions.billing.overlapWarning")} (${formatDate(bp.period_start, 'dd-MM-yyyy')} → ${formatDate(bp.period_end, 'dd-MM-yyyy')})`;
        }
      } catch {
        // invalid interval, skip
      }
    }
    return null;
  }, [periodStart, periodEnd, billedPeriods, t]);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(admission.client_id || null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState(admission.client?.name || "");
  const [totalAmount, setTotalAmount] = useState(estimatedCost.toString());
  const [notes, setNotes] = useState(
    `${t("housing.admissions.billing.boardingInvoice")} - ${admission.horse?.name || ""} (${periodDays} ${t("housing.admissions.detail.days")})`
  );
  const [loading, setLoading] = useState(false);

  // Smart default: set billing start to first unbilled date after billed periods load
  const hasSetSmartDefault = useRef(false);
  useEffect(() => {
    if (hasSetSmartDefault.current || billedPeriods.length === 0) return;
    hasSetSmartDefault.current = true;

    let latestEnd = '';
    for (const bp of billedPeriods) {
      if (bp.period_end && bp.period_end > latestEnd) latestEnd = bp.period_end;
    }
    if (!latestEnd) return;

    const nextDay = new Date(latestEnd);
    nextDay.setDate(nextDay.getDate() + 1);
    const smartStart = format(nextDay, 'yyyy-MM-dd');
    const newStart = smartStart > admissionStartDate ? smartStart : admissionStartDate;

    setPeriodStart(newStart);

    // Recalculate cost for the smart default period
    const endDate = defaultPeriodEnd;
    const days = Math.max(differenceInDays(new Date(endDate), new Date(newStart)) + 1, 1);
    let cost: number;
    if (admission.billing_cycle === "daily") {
      cost = (admission.daily_rate || 0) * days;
    } else if (admission.monthly_rate) {
      cost = sumSegments(decomposeStay(newStart, endDate, admission.monthly_rate));
    } else {
      cost = 0;
    }
    setTotalAmount(cost.toString());
    setNotes(
      `${t("housing.admissions.billing.boardingInvoice")} - ${admission.horse?.name || ""} (${days} ${t("housing.admissions.detail.days")})`
    );
  }, [billedPeriods]);

  // Recalculate when period changes
  const handlePeriodChange = (field: "start" | "end", value: string) => {
    if (field === "start") setPeriodStart(value);
    else setPeriodEnd(value);

    const newStart = field === "start" ? value : periodStart;
    const newEnd = field === "end" ? value : periodEnd;
    const days = Math.max(differenceInDays(new Date(newEnd), new Date(newStart)) + 1, 1);

    let cost: number;
    if (admission.billing_cycle === "daily") {
      cost = (admission.daily_rate || 0) * days;
    } else if (admission.monthly_rate) {
      const segs = decomposeStay(newStart, newEnd, admission.monthly_rate);
      cost = sumSegments(segs);
    } else {
      cost = 0;
    }

    setTotalAmount(cost.toString());
    setNotes(
      `${t("housing.admissions.billing.boardingInvoice")} - ${admission.horse?.name || ""} (${days} ${t("housing.admissions.detail.days")})`
    );
  };

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  /** Build a description for a single decomposed billing segment */
  const buildSegmentDescription = (seg: BoardingBillingSegment): string => {
    const parts: string[] = [];
    if (admission.horse?.name) parts.push(admission.horse.name);
    if (admission.branch?.name) parts.push(admission.branch.name);
    parts.push(`${formatDate(seg.periodStart, 'dd-MM-yyyy')} → ${formatDate(seg.periodEnd, 'dd-MM-yyyy')}`);
    if (seg.isFullMonth) {
      parts.push(`${seg.monthlyRate}/${t("housing.admissions.wizard.cycleMonthly").toLowerCase()}`);
    } else {
      parts.push(`${seg.chargedDays}d × ${seg.dailyRate.toFixed(2)}/${t("housing.admissions.wizard.cycleDaily").toLowerCase()}`);
    }
    return parts.join(" | ");
  };

  /** Build a simple description for daily-rate billing */
  const buildDailyDescription = (): string => {
    const parts: string[] = [];
    if (admission.horse?.name) parts.push(admission.horse.name);
    if (admission.branch?.name) parts.push(admission.branch.name);
    parts.push(`${formatDate(periodStart, 'dd-MM-yyyy')} → ${formatDate(periodEnd, 'dd-MM-yyyy')}`);
    parts.push(`${periodDays}d × ${admission.daily_rate || 0}/${t("housing.admissions.wizard.cycleDaily").toLowerCase()}`);
    return parts.join(" | ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user?.id) return;

    // Block submission on overlap
    if (overlapWarning) {
      toast.error(t("housing.admissions.billing.overlapBlock"));
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(totalAmount) || 0;
      const displayName = selectedClient?.name || clientName || undefined;

      // Compute tax using tenant config
      const { subtotal, taxAmount, totalAmount: total } = computeTax(amount, taxConfig);

      // Step 1: Create invoice header
      const invoice = await createInvoice({
        tenant_id: tenantId,
        invoice_number: generateInvoiceNumber(),
        client_id: selectedClientId || undefined,
        client_name: displayName,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        total_amount: total,
        currency: admission.rate_currency || "SAR",
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t("housing.admissions.billing.invoiceFailed"));
        return;
      }

      // Step 2: Create decomposed invoice_items with entity_type='boarding'
      const items: any[] = [];

      if (admission.billing_cycle === "daily" || billingSegments.length === 0) {
        // Daily billing: single line item
        items.push({
          invoice_id: invoice.id,
          description: buildDailyDescription(),
          entity_type: "boarding",
          entity_id: admission.id,
          horse_id: admission.horse_id || null,
          domain: "boarding",
          service_id: boardingServiceId || null,
          period_start: periodStart,
          period_end: periodEnd,
          quantity: periodDays,
          unit_price: admission.daily_rate || amount,
          total_price: amount,
        });
      } else {
        // Monthly billing: one line item per decomposed calendar segment
        for (const seg of billingSegments) {
          items.push({
            invoice_id: invoice.id,
            description: buildSegmentDescription(seg),
            entity_type: "boarding",
            entity_id: admission.id,
            horse_id: admission.horse_id || null,
            domain: "boarding",
            service_id: boardingServiceId || null,
            period_start: seg.periodStart,
            period_end: seg.periodEnd,
            quantity: seg.chargedDays,
            unit_price: seg.dailyRate,
            total_price: seg.amount,
          });
        }
      }

      // Add informational included-service line items (zero-cost, descriptive only)
      for (const entry of planIncludes) {
        const svc = boardingServices.find(s => s.id === entry.service_id);
        const label = svc?.name || entry.label;
        items.push({
          invoice_id: invoice.id,
          description: `${t('housing.plans.includedService')}: ${label}`,
          entity_type: "boarding",
          entity_id: admission.id,
          horse_id: admission.horse_id || null,
          domain: "boarding",
          service_id: entry.service_id || null,
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        });
      }

      const { error: itemError } = await supabase
        .from("invoice_items" as any)
        .insert(items);

      if (itemError) {
        console.error("Error creating invoice items:", itemError);
        toast.error(t("housing.admissions.billing.invoiceItemFailed") || "Failed to create invoice line items");
      }

      // Step 3: Create billing link
      await createLinkAsync({
        source_type: "boarding",
        source_id: admission.id,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["billing-links"] });
      queryClient.invalidateQueries({ queryKey: ["boarding-billed-periods"] });

      toast.success(t("housing.admissions.billing.invoiceCreated"));
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(t("housing.admissions.billing.invoiceFailed"));
    } finally {
      setLoading(false);
    }
  };

  const taxPreview = computeTax(parseFloat(totalAmount) || 0, taxConfig);
  const fullyBilled = remainingBillable <= 0 && billedPeriods.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("housing.admissions.billing.createInvoiceTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pe-1">
          {/* Already-billed periods summary */}
          {billedPeriods.length > 0 && (
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="w-4 h-4 text-muted-foreground" />
                {t("housing.admissions.billing.billedPeriods")}
              </div>
              <div className="space-y-1">
                {billedPeriods.map((bp, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex justify-between">
                    <span dir="ltr">{formatDate(bp.period_start, 'dd-MM-yyyy')} → {formatDate(bp.period_end, 'dd-MM-yyyy')} {bp.invoice_number && `(${bp.invoice_number})`}</span>
                    <span className="font-mono">{bp.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-border">
                <span className="font-medium">{t("housing.admissions.billing.remainingBillable")}</span>
                <span className={cn("font-mono font-medium", remainingBillable <= 0 ? "text-destructive" : "text-foreground")}>
                  {remainingBillable.toFixed(2)} {admission.rate_currency || "SAR"}
                </span>
              </div>
            </div>
          )}

          {fullyBilled && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive">
                {t("housing.admissions.billing.fullyBilled")}
              </span>
            </div>
          )}

          <div>
            <Label>{t("doctor.client")}</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? displayClientName(selectedClient.name, selectedClient.name_ar, lang) : t("doctor.selectClient")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t("doctor.searchClients")} />
                  <CommandList>
                    <CommandEmpty>{t("doctor.noClientsFound")}</CommandEmpty>
                    <CommandGroup>
                      {activeClients.map(client => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            setSelectedClientId(client.id);
                            setClientName(client.name);
                            setClientPickerOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                          <span>{displayClientName(client.name, client.name_ar, lang)}</span>
                          {client.phone && <span className="ml-auto text-xs text-muted-foreground">{client.phone}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {!selectedClientId && (
            <div>
              <Label>{t("doctor.clientNameManual")}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t("doctor.clientNamePlaceholder")} />
            </div>
          )}

          {/* Period selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("finance.invoices.periodStart") || "Period Start"}</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={e => handlePeriodChange("start", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("finance.invoices.periodEnd") || "Period End"}</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={e => handlePeriodChange("end", e.target.value)}
              />
            </div>
          </div>

          {/* Overlap warning */}
          {overlapWarning && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-sm text-destructive">{overlapWarning}</span>
            </div>
          )}

          <div>
            <Label>
              {t("doctor.totalAmount")} ({admission.rate_currency || "SAR"})
              {taxConfig.pricesTaxInclusive
                ? <span className="text-xs text-muted-foreground ms-1">({t("finance.tax.inclusive")})</span>
                : <span className="text-xs text-muted-foreground ms-1">({t("finance.tax.exclusive")})</span>
              }
            </Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              {t("housing.admissions.billing.estimatedHint")
                .replace("{{days}}", periodDays.toString())
                .replace("{{rate}}", admission.billing_cycle === "daily"
                  ? `${admission.daily_rate || 0}/day`
                  : `${admission.monthly_rate || 0}/month`)}
            </p>
            {taxConfig.taxRate > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("finance.tax.label") || "Tax"}: {taxConfig.taxRate}% → {taxPreview.taxAmount.toFixed(2)} {admission.rate_currency || "SAR"}
                {" | "}{t("finance.invoices.totalAmount")}: {taxPreview.totalAmount.toFixed(2)}
              </p>
            )}
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading || isCreating || !!overlapWarning}>
            {loading ? t("common.loading") : t("housing.admissions.billing.createInvoice")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
