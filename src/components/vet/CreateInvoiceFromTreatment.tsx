import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { useServicesByKind } from "@/hooks/useServices";
import { usePlanInclusionCheck } from "@/hooks/billing/usePlanInclusionCheck";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { displayHorseName, displayServiceName, formatStandardDate } from "@/lib/displayHelpers";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";

export interface TreatmentForInvoice {
  treatment: VetTreatment;
  horseName?: string;
  horseNameAr?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TreatmentForInvoice;
}

export function CreateInvoiceFromTreatment({ open, onOpenChange, data }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();

  const { treatment } = data;

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("vet_treatment", treatment.id);
  const { clients, loading: clientsLoading } = useClients();
  const { data: vetServices = [] } = useServicesByKind("vet");

  // Filter active vet services, optionally matching treatment category
  const relevantServices = useMemo(() => {
    const active = vetServices.filter(s => s.is_active);
    if (treatment.category) {
      const byType = active.filter(s => s.service_type === treatment.category);
      if (byType.length > 0) return byType;
    }
    return active;
  }, [vetServices, treatment.category]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [totalAmount, setTotalAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill from treatment context + auto-select service
  useEffect(() => {
    if (!open) return;

    // Client prefill
    if (treatment.client_id) {
      setSelectedClientId(treatment.client_id);
    }

    // Auto-select matching service and prefill price
    if (relevantServices.length > 0 && !selectedServiceId) {
      const match = treatment.category
        ? relevantServices.find(s => s.service_type === treatment.category)
        : null;
      const svc = match || relevantServices[0];
      setSelectedServiceId(svc.id);
      if (svc.unit_price != null) {
        setTotalAmount(svc.unit_price.toString());
      }
    }

    setNotes(treatment.title || "");
  }, [open, treatment, relevantServices]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const svc = vetServices.find(s => s.id === serviceId);
    if (svc?.unit_price != null) {
      setTotalAmount(svc.unit_price.toString());
    }
  };

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );
  const selectedService = useMemo(
    () => vetServices.find(s => s.id === selectedServiceId),
    [vetServices, selectedServiceId]
  );

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  const buildLineItemDescription = (): string => {
    const parts: string[] = [];
    // Service name (bilingual)
    if (selectedService) {
      parts.push(displayServiceName(selectedService.name, selectedService.name_ar, lang));
    } else {
      parts.push(treatment.title);
    }
    // Horse name
    const horseName = displayHorseName(
      data.horseName || treatment.horse?.name,
      data.horseNameAr || (treatment.horse as any)?.name_ar,
      lang
    );
    if (horseName && horseName !== "—") parts.push(horseName);
    // Category
    if (treatment.category) {
      parts.push(t(`vet.category.${treatment.category}`));
    }
    // Date
    if (treatment.requested_at) {
      parts.push(formatStandardDate(treatment.requested_at));
    }
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
        currency: "SAR",
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t("vet.billing.invoiceFailed"));
        return;
      }

      // Create invoice line item with entity_type='vet'
      const lineDescription = buildLineItemDescription();
      const { error: itemError } = await supabase
        .from("invoice_items" as any)
        .insert({
          invoice_id: invoice.id,
          description: lineDescription,
          entity_type: "vet",
          entity_id: treatment.id,
          quantity: 1,
          unit_price: amount,
          total_price: amount,
        });

      if (itemError) {
        console.error("Error creating invoice item:", itemError);
      }

      // Create billing_link with source_type='vet_treatment'
      await createLinkAsync({
        source_type: "vet_treatment",
        source_id: treatment.id,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["billing-links"] });

      toast.success(t("vet.billing.invoiceCreated"));
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(t("vet.billing.invoiceFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vet.billing.createInvoiceTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Treatment context badge */}
          <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">
            {treatment.title}
            {treatment.horse?.name && ` — ${displayHorseName(treatment.horse.name, (treatment.horse as any)?.name_ar, lang)}`}
            {treatment.category && (
              <span className="ms-2 text-primary">({t(`vet.category.${treatment.category}`)})</span>
            )}
          </div>

          {/* Vet service picker */}
          {relevantServices.length > 0 && (
            <div>
              <Label>{t("vet.billing.service")}</Label>
              <Select value={selectedServiceId} onValueChange={handleServiceChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("vet.billing.selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {relevantServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span>{displayServiceName(svc.name, svc.name_ar, lang)}</span>
                        {svc.unit_price != null && (
                          <span className="text-xs text-muted-foreground">
                            {svc.unit_price} SAR
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
            <Label>{t("vet.billing.client")}</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.name : t("vet.billing.selectClient")}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t("vet.billing.searchClients")} />
                  <CommandList>
                    <CommandEmpty>{t("vet.billing.noClientsFound")}</CommandEmpty>
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
                          <Check className={cn("me-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                          <span>{client.name}</span>
                          {client.phone && <span className="ms-auto text-xs text-muted-foreground">{client.phone}</span>}
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
              <Label>{t("vet.billing.clientNameManual")}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
          )}

          <div>
            <Label>{t("vet.billing.totalAmount")} (SAR)</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? t("common.loading") : t("vet.billing.createInvoice")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
