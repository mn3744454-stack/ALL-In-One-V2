import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { useServicesByKind } from "@/hooks/useServices";
import { usePlanInclusionCheck } from "@/hooks/billing/usePlanInclusionCheck";
import { useSupplierPayableForSource } from "@/hooks/billing/useSupplierPayableForSource";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { displayHorseName, displayServiceName, formatBreedingDate } from "@/lib/displayHelpers";
import { ProviderMarkupHelper } from "@/components/vet/ProviderMarkupHelper";

export type BreedingSourceType = "breeding_attempt" | "pregnancy_check" | "foaling" | "embryo_transfer";

export interface BreedingEventForInvoice {
  sourceType: BreedingSourceType;
  sourceId: string;
  horseId?: string; // mare_id for inclusion check
  mareName?: string;
  mareNameAr?: string;
  stallionName?: string;
  stallionNameAr?: string;
  suggestedAmount?: number;
  description?: string;
  currency?: string;
  clientId?: string | null;
  clientName?: string;
  eventDate?: string;
  // Contract prefill
  contractId?: string | null;
  contractNumber?: string | null;
  contractServiceId?: string | null;
  contractUnitPrice?: number | null;
  contractClientId?: string | null;
  contractClientName?: string | null;
  // External provider info
  sourceMode?: string;
  externalProviderName?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: BreedingEventForInvoice;
}

export function CreateInvoiceFromBreedingEvent({ open, onOpenChange, event }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks(event.sourceType, event.sourceId);
  const { clients, loading: clientsLoading } = useClients();
  const { data: breedingServices = [] } = useServicesByKind("breeding");

  // Filter services matching this source type, with fallback to all breeding services
  const relevantServices = useMemo(() => {
    const byType = breedingServices.filter(s => s.is_active && s.service_type === event.sourceType);
    return byType.length > 0 ? byType : breedingServices.filter(s => s.is_active);
  }, [breedingServices, event.sourceType]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [amountManuallyOverridden, setAmountManuallyOverridden] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Package-awareness check
  const { isIncluded, planName } = usePlanInclusionCheck(
    event.horseId,
    selectedServiceId || undefined
  );

  // Provider cost reference
  const { payable: linkedPayable } = useSupplierPayableForSource(event.sourceType, event.sourceId);

  // Contract-aware prefill: contract > service > event fallback
  useEffect(() => {
    if (!open) return;
    setAmountManuallyOverridden(false);

    // 1. Contract prefill (highest priority)
    if (event.contractId) {
      if (event.contractServiceId) {
        setSelectedServiceId(event.contractServiceId);
      }
      if (event.contractUnitPrice != null) {
        setTotalAmount(event.contractUnitPrice.toString());
      }
      if (event.contractClientId) {
        setSelectedClientId(event.contractClientId);
      }
      if (event.contractClientName) {
        setClientName(event.contractClientName);
      }
      const contractNote = event.contractNumber ? `${t("breeding.contracts.contract")}: ${event.contractNumber}` : "";
      setNotes(contractNote);
      return;
    }

    // 2. Service auto-select
    if (relevantServices.length > 0 && !selectedServiceId) {
      const match = relevantServices.find(s => s.service_type === event.sourceType);
      const svc = match || relevantServices[0];
      setSelectedServiceId(svc.id);
      if (svc.unit_price != null) {
        setTotalAmount(svc.unit_price.toString());
      }
    }

    // 3. Event-level fallbacks
    if (event.clientId && !selectedClientId) setSelectedClientId(event.clientId);
    if (event.clientName && !clientName) setClientName(event.clientName);
    if (event.suggestedAmount && totalAmount === "0") setTotalAmount(event.suggestedAmount.toString());
    if (event.description && !notes) setNotes(event.description);

    // 4. Client from active admission (if horse boarded)
    if (!selectedClientId && !event.clientId && tenantId && event.horseId) {
      supabase
        .from("boarding_admissions")
        .select("client_id")
        .eq("tenant_id", tenantId)
        .eq("horse_id", event.horseId)
        .eq("status", "active")
        .maybeSingle()
        .then(({ data: admission }) => {
          if (admission?.client_id) {
            setSelectedClientId(admission.client_id);
          }
        });
    }
  }, [open, event, relevantServices]);

  // Auto-zero when included
  useEffect(() => {
    if (isIncluded && !amountManuallyOverridden) {
      setTotalAmount("0");
    }
  }, [isIncluded, amountManuallyOverridden]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setAmountManuallyOverridden(false);
    const svc = breedingServices.find(s => s.id === serviceId);
    if (svc?.unit_price != null) {
      setTotalAmount(svc.unit_price.toString());
    }
  };

  const handleAmountChange = (value: string) => {
    setTotalAmount(value);
    setAmountManuallyOverridden(true);
  };

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );
  const selectedService = useMemo(
    () => breedingServices.find(s => s.id === selectedServiceId),
    [breedingServices, selectedServiceId]
  );

  const isZeroCharge = (parseFloat(totalAmount) || 0) === 0;

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  const sourceTypeLabel = t(`breeding.billing.sourceTypes.${event.sourceType}`);

  const buildLineItemDescription = (): string => {
    const parts: string[] = [];
    if (selectedService) {
      parts.push(displayServiceName(selectedService.name, selectedService.name_ar, lang));
    } else {
      parts.push(sourceTypeLabel);
    }
    const horseName = displayHorseName(event.mareName, event.mareNameAr, lang);
    if (horseName && horseName !== "—") parts.push(horseName);
    if (event.stallionName || event.stallionNameAr) {
      const sName = displayHorseName(event.stallionName, event.stallionNameAr, lang);
      if (sName && sName !== "—") parts.push(`× ${sName}`);
    }
    if (event.eventDate) parts.push(formatBreedingDate(event.eventDate));
    if (event.contractNumber) parts.push(`${t("breeding.contracts.contract")} ${event.contractNumber}`);
    return parts.join(" | ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user?.id) return;

    setLoading(true);
    try {
      const amount = parseFloat(totalAmount) || 0;
      const displayName = selectedClient?.name || clientName || undefined;

      const invoice = await createInvoice({
        tenant_id: tenantId,
        invoice_number: generateInvoiceNumber(),
        client_id: selectedClientId || undefined,
        client_name: displayName,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        subtotal: amount,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: amount,
        currency: event.currency || "SAR",
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t("breeding.billing.invoiceFailed"));
        return;
      }

      const lineDescription = buildLineItemDescription();
      const { error: itemError } = await supabase
        .from("invoice_items" as any)
        .insert({
          invoice_id: invoice.id,
          description: lineDescription,
          entity_type: "breeding",
          entity_id: event.sourceId,
          quantity: 1,
          unit_price: amount,
          total_price: amount,
        });

      if (itemError) {
        console.error("Error creating invoice item:", itemError);
      }

      await createLinkAsync({
        source_type: event.sourceType,
        source_id: event.sourceId,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["billing-links"] });

      toast.success(t("breeding.billing.invoiceCreated"));
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(t("breeding.billing.invoiceFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("breeding.billing.createInvoiceTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source info badge */}
          <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">
            {sourceTypeLabel}
            {event.mareName && ` — ${displayHorseName(event.mareName, event.mareNameAr, lang)}`}
            {event.contractNumber && (
              <span className="ml-2 font-mono text-primary">({t("breeding.contracts.contract")} {event.contractNumber})</span>
            )}
          </div>

          {/* Package-awareness banner */}
          {isIncluded && planName && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  {t("vet.billing.includedInPlanTitle")}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {t("vet.billing.includedInPlanDescription").replace("{{planName}}", planName || "")}
                </p>
                {amountManuallyOverridden && parseFloat(totalAmount) > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {t("vet.billing.includedOverrideWarning")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Provider cost with markup helper */}
          {linkedPayable && linkedPayable.amount > 0 && (
            <ProviderMarkupHelper
              providerCost={linkedPayable.amount}
              currency={linkedPayable.currency || "SAR"}
              supplierName={linkedPayable.supplier_name}
              currentAmount={totalAmount}
              onApplyAmount={handleAmountChange}
            />
          )}

          {/* Breeding service picker */}
          {relevantServices.length > 0 && (
            <div>
              <Label>{t("breeding.billing.service")}</Label>
              <Select value={selectedServiceId} onValueChange={handleServiceChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("breeding.billing.selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {relevantServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span>{displayServiceName(svc.name, svc.name_ar, lang)}</span>
                        {svc.unit_price != null && (
                          <span className="text-xs text-muted-foreground">
                            {svc.unit_price} {event.currency || "SAR"}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client picker */}
          <div>
            <Label>{t("breeding.billing.client")}</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.name : t("breeding.billing.selectClient")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t("breeding.billing.searchClients")} />
                  <CommandList>
                    <CommandEmpty>{t("breeding.billing.noClientsFound")}</CommandEmpty>
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
                          <span>{client.name}</span>
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
              <Label>{t("breeding.billing.clientNameManual")}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t("breeding.billing.totalAmount")} ({event.currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => handleAmountChange(e.target.value)} />
            {isZeroCharge && (
              <p className="text-xs text-muted-foreground mt-1">
                {isIncluded ? t("vet.billing.zeroChargeIncluded") : t("vet.billing.zeroChargeIncluded")}
              </p>
            )}
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? t("common.loading") : isZeroCharge ? t("vet.billing.createZeroInvoice") : t("breeding.billing.createInvoice")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
