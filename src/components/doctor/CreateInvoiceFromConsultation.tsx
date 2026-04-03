import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { useServicesByKind } from "@/hooks/useServices";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import { getTenantTaxConfig, computeTax } from "@/lib/taxUtils";
import { displayServiceName } from "@/lib/displayHelpers";
import type { DoctorConsultation } from "@/hooks/doctor/useConsultations";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: DoctorConsultation;
}

export function CreateInvoiceFromConsultation({ open, onOpenChange, consultation }: Props) {
  const { activeTenant } = useTenant();
  const tenantCurrency = useTenantCurrency();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();
  const taxConfig = getTenantTaxConfig(activeTenant?.tenant);

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("doctor_consultation", consultation.id);
  const { clients } = useClients();
  const { data: vetServices = [] } = useServicesByKind("vet");

  const activeServices = useMemo(() => vetServices.filter(s => s.is_active), [vetServices]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState(consultation.stable_name_snapshot || "");
  const [totalAmount, setTotalAmount] = useState(consultation.actual_cost?.toString() || "0");
  const [amountManuallyOverridden, setAmountManuallyOverridden] = useState(false);
  const [notes, setNotes] = useState(`Consultation: ${consultation.consultation_type} - ${consultation.horse_name_snapshot || "Unknown"}`);
  const [loading, setLoading] = useState(false);
  const [patientHorseId, setPatientHorseId] = useState<string | null>(null);

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(() => activeClients.find(c => c.id === selectedClientId), [activeClients, selectedClientId]);
  const selectedService = useMemo(() => vetServices.find(s => s.id === selectedServiceId), [vetServices, selectedServiceId]);

  // Load patient's linked_horse_id for invoice item attribution
  useEffect(() => {
    if (!open || !consultation.patient_id || !tenantId) return;
    supabase
      .from("doctor_patients" as any)
      .select("linked_horse_id")
      .eq("id", consultation.patient_id)
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.linked_horse_id) setPatientHorseId(data.linked_horse_id as string);
      });
  }, [open, consultation.patient_id, tenantId]);

  // Auto-select first service and set default amount on open
  useEffect(() => {
    if (!open) return;
    setAmountManuallyOverridden(false);

    if (activeServices.length > 0 && !selectedServiceId) {
      const svc = activeServices[0];
      setSelectedServiceId(svc.id);
      // Only use service price as default if no actual_cost on consultation
      if (!consultation.actual_cost && svc.unit_price != null) {
        setTotalAmount(svc.unit_price.toString());
      }
    }
  }, [open, activeServices, consultation.actual_cost]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!amountManuallyOverridden) {
      const svc = vetServices.find(s => s.id === serviceId);
      if (svc?.unit_price != null && !consultation.actual_cost) {
        setTotalAmount(svc.unit_price.toString());
      }
    }
  };

  const handleAmountChange = (value: string) => {
    setTotalAmount(value);
    setAmountManuallyOverridden(true);
  };

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user?.id) return;

    setLoading(true);
    try {
      const amount = parseFloat(totalAmount) || 0;
      const displayName = selectedClient?.name || clientName || undefined;

      // Compute tax — respect service-level is_taxable
      const svc = vetServices.find(s => s.id === selectedServiceId);
      const isTaxable = svc ? svc.is_taxable !== false : true;
      const { subtotal, taxAmount, totalAmount: total } = isTaxable
        ? computeTax(amount, taxConfig)
        : { subtotal: amount, taxAmount: 0, totalAmount: amount };

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
        currency: tenantCurrency,
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t('doctor.invoiceFailed'));
        return;
      }

      // Create invoice item with full service grounding
      const lineDescription = svc
        ? `${displayServiceName(svc.name, svc.name_ar, lang)} — ${consultation.horse_name_snapshot || "Unknown"}`
        : `Consultation: ${consultation.consultation_type} — ${consultation.horse_name_snapshot || "Unknown"}`;

      const { error: itemError } = await supabase
        .from("invoice_items" as any)
        .insert({
          invoice_id: invoice.id,
          description: lineDescription,
          entity_type: "doctor_consultation",
          entity_id: consultation.id,
          horse_id: patientHorseId || null,
          domain: "vet",
          service_id: selectedServiceId || null,
          quantity: 1,
          unit_price: amount,
          total_price: amount,
        });

      if (itemError) console.error("Error creating invoice item:", itemError);

      await createLinkAsync({
        source_type: "doctor_consultation",
        source_id: consultation.id,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["billing-links"] });

      toast.success(t('doctor.invoiceCreated'));
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(t('doctor.invoiceFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('doctor.createInvoiceTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Context summary */}
          <div className="text-xs text-muted-foreground bg-muted rounded-md p-2">
            {consultation.consultation_type}
            {consultation.horse_name_snapshot && ` — ${consultation.horse_name_snapshot}`}
          </div>

          {/* Service selector */}
          {activeServices.length > 0 && (
            <div>
              <Label>{t('doctor.service')}</Label>
              <Select value={selectedServiceId} onValueChange={handleServiceChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('doctor.selectService')} />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map(svc => (
                    <SelectItem key={svc.id} value={svc.id}>
                      <span className="flex items-center gap-2">
                        <span>{displayServiceName(svc.name, svc.name_ar, lang)}</span>
                        {svc.unit_price != null && (
                          <span className="text-xs text-muted-foreground">{svc.unit_price} {tenantCurrency}</span>
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
            <Label>{t('doctor.client')}</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={clientPickerOpen} className="w-full justify-between font-normal">
                  {selectedClient ? selectedClient.name : t('doctor.selectClient')}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('doctor.searchClients')} />
                  <CommandList>
                    <CommandEmpty>{t('doctor.noClientsFound')}</CommandEmpty>
                    <CommandGroup>
                      {activeClients.map(client => (
                        <CommandItem key={client.id} value={client.name} onSelect={() => { setSelectedClientId(client.id); setClientName(client.name); setClientPickerOpen(false); }}>
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
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.clientFallbackHint')}</p>
          </div>

          {!selectedClientId && (
            <div>
              <Label>{t('doctor.clientNameManual')}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('doctor.clientNamePlaceholder')} />
            </div>
          )}

          <div>
            <Label>{t('doctor.totalAmount')} ({tenantCurrency})</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => handleAmountChange(e.target.value)} />
          </div>
          <div>
            <Label>{t('common.notes')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? t('doctor.creating') : t('doctor.createInvoice')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
