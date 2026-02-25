import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvoices, type CreateInvoiceInput } from "@/hooks/finance/useInvoices";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { DoctorConsultation } from "@/hooks/doctor/useConsultations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: DoctorConsultation;
}

export function CreateInvoiceFromConsultation({ open, onOpenChange, consultation }: Props) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant?.id;

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createLinkAsync } = useBillingLinks("doctor_consultation", consultation.id);

  const [clientName, setClientName] = useState(consultation.stable_name_snapshot || "");
  const [totalAmount, setTotalAmount] = useState(consultation.actual_cost?.toString() || "0");
  const [notes, setNotes] = useState(`Consultation: ${consultation.consultation_type} - ${consultation.horse_name_snapshot || "Unknown"}`);
  const [loading, setLoading] = useState(false);

  // Simple invoice number generator
  const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !user?.id) return;

    setLoading(true);
    try {
      const amount = parseFloat(totalAmount) || 0;

      // 1. Create invoice
      const invoice = await createInvoice({
        tenant_id: tenantId,
        invoice_number: generateInvoiceNumber(),
        client_name: clientName || undefined,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        subtotal: amount,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: amount,
        currency: consultation.currency || "SAR",
        notes: notes || undefined,
      });

      // 2. Create billing link
      if (invoice?.id) {
        await createLinkAsync({
          source_type: "doctor_consultation",
          source_id: consultation.id,
          invoice_id: invoice.id,
          link_kind: "final",
          amount,
        });
        toast.success("Invoice created and linked to consultation");
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice from Consultation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Client Name</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client or stable name" />
          </div>
          <div>
            <Label>Total Amount ({consultation.currency || "SAR"})</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || isCreating}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
