import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useClients } from "@/hooks/useClients";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";
import { displayClientName } from "@/lib/displayHelpers";
import { supabase } from "@/integrations/supabase/client";

import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import type { BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: BoardingAdmission;
}

export function CreateInvoiceFromAdmission({ open, onOpenChange, admission }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("boarding", admission.id);
  const { clients, loading: clientsLoading } = useClients();

  // Compute estimated cost
  const days = differenceInDays(
    admission.checked_out_at ? new Date(admission.checked_out_at) : new Date(),
    new Date(admission.admitted_at)
  ) || 1;

  const estimatedCost = admission.billing_cycle === "daily"
    ? (admission.daily_rate || 0) * days
    : (admission.monthly_rate || 0) * Math.max(Math.ceil(days / 30), 1);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(admission.client_id || null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState(admission.client?.name || "");
  const [totalAmount, setTotalAmount] = useState(estimatedCost.toString());
  const [notes, setNotes] = useState(
    `${t("housing.admissions.billing.boardingInvoice")} - ${admission.horse?.name || ""} (${days} ${t("housing.admissions.detail.days")})`
  );
  const [loading, setLoading] = useState(false);

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  /**
   * Build a human-readable line item description for the boarding charge.
   */
  const buildLineItemDescription = (): string => {
    const parts: string[] = [];
    
    // Horse name
    if (admission.horse?.name) {
      parts.push(admission.horse.name);
    }
    
    // Branch
    if (admission.branch?.name) {
      parts.push(admission.branch.name);
    }
    
    // Period
    const fromDate = format(new Date(admission.admitted_at), "yyyy-MM-dd");
    const toDate = admission.checked_out_at
      ? format(new Date(admission.checked_out_at), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");
    parts.push(`${fromDate} → ${toDate}`);
    
    // Rate context
    if (admission.billing_cycle === "daily" && admission.daily_rate) {
      parts.push(`${days}d × ${admission.daily_rate}/${t("housing.admissions.wizard.cycleDaily").toLowerCase()}`);
    } else if (admission.monthly_rate) {
      const months = Math.max(Math.ceil(days / 30), 1);
      parts.push(`${months}mo × ${admission.monthly_rate}/${t("housing.admissions.wizard.cycleMonthly").toLowerCase()}`);
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

      // Step 1: Create invoice header
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
        currency: admission.rate_currency || "SAR",
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t("housing.admissions.billing.invoiceFailed"));
        return;
      }

      // Step 2: Create invoice_items with entity_type='boarding'
      const lineDescription = buildLineItemDescription();
      const { error: itemError } = await supabase
        .from("invoice_items" as any)
        .insert({
          invoice_id: invoice.id,
          description: lineDescription,
          entity_type: "boarding",
          entity_id: admission.id,
          quantity: days,
          unit_price: admission.billing_cycle === "daily"
            ? (admission.daily_rate || amount)
            : (admission.monthly_rate || amount),
          total_price: amount,
        });

      if (itemError) {
        console.error("Error creating invoice item:", itemError);
        toast.error(t("housing.admissions.billing.invoiceItemFailed") || "Failed to create invoice line item");
        // Don't return — invoice header exists, continue to link it
      }

      // Step 3: Create billing link
      await createLinkAsync({
        source_type: "boarding",
        source_id: admission.id,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      // NOTE: Ledger posting now happens at APPROVAL time (InvoiceDetailsSheet.handleApprove),
      // NOT at creation time. Draft invoices have zero financial impact.

      // Step 5: Invalidate all finance queries for consistency
      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["billing-links"] });

      toast.success(t("housing.admissions.billing.invoiceCreated"));
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error(t("housing.admissions.billing.invoiceFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("housing.admissions.billing.createInvoiceTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>{t("doctor.clientNameManual")}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t("doctor.clientNamePlaceholder")} />
            </div>
          )}

          <div>
            <Label>{t("doctor.totalAmount")} ({admission.rate_currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              {t("housing.admissions.billing.estimatedHint")
                .replace("{{days}}", days.toString())
                .replace("{{rate}}", admission.billing_cycle === "daily"
                  ? `${admission.daily_rate || 0}/day`
                  : `${admission.monthly_rate || 0}/month`)}
            </p>
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? t("common.loading") : t("housing.admissions.billing.createInvoice")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
