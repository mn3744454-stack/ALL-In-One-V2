import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceLineItemsEditor, type LineItem } from "./InvoiceLineItemsEditor";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvoices, type CreateInvoiceInput, type Invoice, type InvoiceItem } from "@/hooks/finance/useInvoices";
import { useClients } from "@/hooks/useClients";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  invoice?: Invoice | null;
  existingItems?: InvoiceItem[];
}

export function InvoiceFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  mode = "create",
  invoice,
  existingItems = [],
}: InvoiceFormDialogProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { createInvoice, updateInvoice, isCreating, isUpdating } = useInvoices(activeTenant?.tenant.id);
  const { clients } = useClients();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit" && invoice;

  const [formData, setFormData] = useState({
    client_id: "",
    client_name: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    tax_rate: "15",
    discount_amount: "0",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, total_price: 0 },
  ]);

  // Populate form when editing
  useEffect(() => {
    if (open && isEditMode && invoice) {
      setFormData({
        client_id: invoice.client_id || "",
        client_name: invoice.client_name || "",
        issue_date: invoice.issue_date ? format(new Date(invoice.issue_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        due_date: invoice.due_date ? format(new Date(invoice.due_date), "yyyy-MM-dd") : format(addDays(new Date(), 30), "yyyy-MM-dd"),
        tax_rate: invoice.tax_amount > 0 && invoice.subtotal > 0 
          ? String(Math.round((invoice.tax_amount / invoice.subtotal) * 100)) 
          : "15",
        discount_amount: String(invoice.discount_amount || 0),
        notes: invoice.notes || "",
      });
      
      // Populate line items from existing items
      if (existingItems.length > 0) {
        setLineItems(existingItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
        })));
      }
    } else if (open && !isEditMode) {
      // Reset form for create mode
      setFormData({
        client_id: "",
        client_name: "",
        issue_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        tax_rate: "15",
        discount_amount: "0",
        notes: "",
      });
      setLineItems([
        { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, total_price: 0 },
      ]);
    }
  }, [open, isEditMode, invoice, existingItems]);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxRate = parseFloat(formData.tax_rate) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = parseFloat(formData.discount_amount) || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return { subtotal, taxAmount, discountAmount, totalAmount };
  }, [lineItems, formData.tax_rate, formData.discount_amount]);

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const prefix = activeTenant?.tenant.name?.substring(0, 3).toUpperCase() || "INV";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${year}${month}-${random}`;
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.name || "",
    });
  };

  // Invalidate all dependent queries after actions
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
    queryClient.invalidateQueries({ queryKey: ["lab-horse-financial"] });
    queryClient.invalidateQueries({ queryKey: ["lab-horses-with-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.tenant.id) return;

    try {
      // Validate
      const validItems = lineItems.filter((item) => item.description && item.total_price > 0);
      if (validItems.length === 0) {
        toast.error(t("finance.invoices.noItemsError") || "Please add at least one item");
        return;
      }

      if (isEditMode && invoice) {
        // UPDATE existing invoice
        await updateInvoice({
          id: invoice.id,
          client_id: formData.client_id || undefined,
          client_name: formData.client_name || undefined,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          subtotal: calculations.subtotal,
          tax_amount: calculations.taxAmount,
          discount_amount: calculations.discountAmount,
          total_amount: calculations.totalAmount,
          notes: formData.notes || undefined,
        });

        // Delete existing items and recreate them
        await supabase
          .from("invoice_items" as any)
          .delete()
          .eq("invoice_id", invoice.id);

        // Create updated invoice items
        for (const item of validItems) {
          await supabase.from("invoice_items" as any).insert({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
          });
        }

        toast.success(t("finance.invoices.updated"));
      } else {
        // CREATE new invoice
        const invoiceNumber = generateInvoiceNumber();

        const input: CreateInvoiceInput = {
          tenant_id: activeTenant.tenant.id,
          invoice_number: invoiceNumber,
          client_id: formData.client_id || undefined,
          client_name: formData.client_name || undefined,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          subtotal: calculations.subtotal,
          tax_amount: calculations.taxAmount,
          discount_amount: calculations.discountAmount,
          total_amount: calculations.totalAmount,
          notes: formData.notes || undefined,
          status: "draft",
        };

        const newInvoice = await createInvoice(input);

        // Create invoice items
        if (newInvoice) {
          for (const item of validItems) {
            await supabase.from("invoice_items" as any).insert({
              invoice_id: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              entity_type: item.entity_type,
              entity_id: item.entity_id,
            });
          }
        }
      }

      invalidateQueries();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("finance.invoices.edit") : t("finance.invoices.create")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("finance.invoices.client")}</Label>
              <Select value={formData.client_id} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("finance.invoices.selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("finance.invoices.issueDate")}</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("finance.invoices.dueDate")}</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label>{t("finance.invoices.lineItems")}</Label>
            <InvoiceLineItemsEditor items={lineItems} onChange={setLineItems} currency="SAR" />
          </div>

          {/* Tax and Discount */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t("finance.invoices.taxRate")} (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("finance.invoices.discount")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t("finance.invoices.tax")}</Label>
              <div className="h-10 flex items-center px-3 bg-muted rounded-md font-medium font-mono tabular-nums" dir="ltr">
                {formatCurrency(calculations.taxAmount)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gold font-bold">{t("finance.invoices.totalAmount")}</Label>
              <div className="h-10 flex items-center px-3 bg-gold/10 rounded-md font-bold text-navy font-mono tabular-nums" dir="ltr">
                {formatCurrency(calculations.totalAmount)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("finance.invoices.notes")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("finance.invoices.notesPlaceholder")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {isEditMode ? t("common.save") : t("finance.invoices.createDraft")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
