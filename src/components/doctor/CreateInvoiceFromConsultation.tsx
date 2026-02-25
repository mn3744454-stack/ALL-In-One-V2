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
import type { DoctorConsultation } from "@/hooks/doctor/useConsultations";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: DoctorConsultation;
}

export function CreateInvoiceFromConsultation({ open, onOpenChange, consultation }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const tenantId = activeTenant?.tenant?.id;

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("doctor_consultation", consultation.id);
  const { clients, loading: clientsLoading } = useClients();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientName, setClientName] = useState(consultation.stable_name_snapshot || "");
  const [totalAmount, setTotalAmount] = useState(consultation.actual_cost?.toString() || "0");
  const [notes, setNotes] = useState(`Consultation: ${consultation.consultation_type} - ${consultation.horse_name_snapshot || "Unknown"}`);
  const [loading, setLoading] = useState(false);

  const activeClients = useMemo(() => clients.filter(c => c.status === "active"), [clients]);

  const selectedClient = useMemo(
    () => activeClients.find(c => c.id === selectedClientId),
    [activeClients, selectedClientId]
  );

  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

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
        currency: consultation.currency || "SAR",
        notes: notes || undefined,
      });

      if (invoice?.id) {
        await createLinkAsync({
          source_type: "doctor_consultation",
          source_id: consultation.id,
          invoice_id: invoice.id,
          link_kind: "final",
          amount,
        });
        toast.success(t('doctor.invoiceCreated'));
      }

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
          <div>
            <Label>{t('doctor.client')}</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedClient ? selectedClient.name : t('doctor.selectClient')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('doctor.searchClients')} />
                  <CommandList>
                    <CommandEmpty>{t('doctor.noClientsFound')}</CommandEmpty>
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
            <p className="text-xs text-muted-foreground mt-1">{t('doctor.clientFallbackHint')}</p>
          </div>

          {!selectedClientId && (
            <div>
              <Label>{t('doctor.clientNameManual')}</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder={t('doctor.clientNamePlaceholder')} />
            </div>
          )}

          <div>
            <Label>{t('doctor.totalAmount')} ({consultation.currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
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
