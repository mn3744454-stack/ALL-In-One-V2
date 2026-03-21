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
import { supabase } from "@/integrations/supabase/client";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { displayHorseName, formatBreedingDate } from "@/lib/displayHelpers";

export type BreedingSourceType = "breeding_attempt" | "pregnancy_check" | "foaling" | "embryo_transfer";

export interface BreedingEventForInvoice {
  sourceType: BreedingSourceType;
  sourceId: string;
  /** Mare name (English) */
  mareName?: string;
  mareNameAr?: string;
  /** Stallion name (English) */
  stallionName?: string;
  stallionNameAr?: string;
  /** Suggested amount from service catalog */
  suggestedAmount?: number;
  /** Pre-populated description */
  description?: string;
  /** Currency */
  currency?: string;
  /** Optional pre-selected client */
  clientId?: string | null;
  clientName?: string;
  /** Event date for the line item */
  eventDate?: string;
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

  const [selectedClientId, setSelectedClientId] = useState<string | null>(event.clientId || null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState(event.clientName || "");
  const [totalAmount, setTotalAmount] = useState(event.suggestedAmount?.toString() || "0");
  const [notes, setNotes] = useState(event.description || "");
  const [loading, setLoading] = useState(false);

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);
  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  const sourceTypeLabel = t(`breeding.billing.sourceTypes.${event.sourceType}`);

  const buildLineItemDescription = (): string => {
    const parts: string[] = [];
    const horseName = displayHorseName(event.mareName, event.mareNameAr, lang);
    if (horseName) parts.push(horseName);
    if (event.stallionName || event.stallionNameAr) {
      const sName = displayHorseName(event.stallionName, event.stallionNameAr, lang);
      if (sName) parts.push(`× ${sName}`);
    }
    parts.push(sourceTypeLabel);
    if (event.eventDate) parts.push(formatBreedingDate(event.eventDate));
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
        currency: event.currency || "SAR",
        notes: notes || undefined,
      });

      if (!invoice?.id) {
        toast.error(t("breeding.billing.invoiceFailed"));
        return;
      }

      // Step 2: Create invoice_items with entity_type='breeding'
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

      // Step 3: Create billing link
      await createLinkAsync({
        source_type: event.sourceType,
        source_id: event.sourceId,
        invoice_id: invoice.id,
        link_kind: "final",
        amount,
      });

      // Step 4: Invalidate queries
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
          </div>

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
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
          </div>
          <div>
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? t("common.loading") : t("breeding.billing.createInvoice")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
