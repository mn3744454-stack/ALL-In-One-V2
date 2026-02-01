import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { downloadInvoicePDF, printInvoice } from "./InvoicePDFGenerator";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  Download,
  Printer,
  CheckCircle,
  Send,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onEdit?: (invoice: Invoice) => void;
}

export function InvoiceDetailsSheet({
  open,
  onOpenChange,
  invoiceId,
  onEdit,
}: InvoiceDetailsSheetProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // Permission checks - deny by default
  const canEdit = hasPermission("finance.invoice.edit");
  const canDelete = hasPermission("finance.invoice.delete");
  const canMarkPaid = hasPermission("finance.invoice.markPaid");
  const canSend = hasPermission("finance.invoice.send");
  const canPrint = hasPermission("finance.invoice.print");

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceDetails();
    } else {
      setInvoice(null);
      setItems([]);
    }
  }, [open, invoiceId]);

  const fetchInvoiceDetails = async () => {
    if (!invoiceId) return;

    setLoading(true);
    try {
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData as unknown as Invoice);

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items" as any)
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;
      
      // Enrich lab_sample items with human-readable identifiers (batch fetch)
      const labSampleIds = (itemsData || [])
        .filter((item: any) => item.entity_type === 'lab_sample' && item.entity_id)
        .map((item: any) => item.entity_id);

      let sampleMap: Record<string, { daily_number: number | null; physical_sample_id: string | null }> = {};
      if (labSampleIds.length > 0) {
        const { data: samples } = await supabase
          .from('lab_samples')
          .select('id, daily_number, physical_sample_id')
          .in('id', labSampleIds);
        
        if (samples) {
          sampleMap = samples.reduce((acc: typeof sampleMap, s: any) => {
            acc[s.id] = { daily_number: s.daily_number, physical_sample_id: s.physical_sample_id };
            return acc;
          }, {});
        }
      }

      // Enrich items with better labels
      const enrichedItems = (itemsData || []).map((item: any) => {
        if (item.entity_type === 'lab_sample' && item.entity_id && sampleMap[item.entity_id]) {
          const sample = sampleMap[item.entity_id];
          const label = sample.daily_number 
            ? `#${sample.daily_number}`
            : sample.physical_sample_id?.slice(0, 12) || '';
          return {
            ...item,
            enrichedDescription: label ? `${item.description} - ${label}` : item.description,
          };
        }
        return { ...item, enrichedDescription: item.description };
      });

      setItems(enrichedItems as unknown as InvoiceItem[]);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // Use centralized formatter for EN digits
  const formatAmount = (amount: number) => formatCurrency(amount, invoice?.currency || "SAR");

  // Invalidate all dependent queries after actions
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
    queryClient.invalidateQueries({ queryKey: ["lab-horse-financial"] });
    queryClient.invalidateQueries({ queryKey: ["lab-horses-with-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("invoices" as any)
        .update({ 
          status: 'paid', 
          payment_received_at: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq("id", invoice.id);
      
      if (error) throw error;
      toast.success(t("finance.invoices.markedAsPaid"));
      setPaymentDialogOpen(false);
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: 'sent' })
        .eq("id", invoice.id);
      
      if (error) throw error;
      toast.success(t("finance.invoices.sentSuccess"));
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("invoices" as any)
        .delete()
        .eq("id", invoice.id);
      
      if (error) throw error;
      toast.success(t("finance.invoices.deleted"));
      setDeleteDialogOpen(false);
      invalidateQueries();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    if (invoice && onEdit) {
      onEdit(invoice);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      await downloadInvoicePDF({
        invoice,
        items,
        tenantName: activeTenant?.tenant.name,
      });
      toast.success(t("finance.invoices.pdfDownloaded"));
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(t("finance.invoices.pdfFailed"));
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printInvoice({
        invoice,
        items,
        tenantName: activeTenant?.tenant.name,
      });
    } catch (error) {
      console.error("Print error:", error);
      toast.error(t("finance.invoices.printFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("finance.invoices.detailsTitle")}
            </SheetTitle>
          </div>
          <SheetDescription>
            {invoice?.invoice_number || ""}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : invoice ? (
          <div className="space-y-6 py-6">
            {/* Status & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <div className="flex flex-wrap gap-2">
                {/* Mark as Paid - for sent/overdue invoices */}
                {canMarkPaid && (invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <Button
                    size="sm"
                    onClick={() => setPaymentDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 me-2" />
                    {t("finance.invoices.markPaid")}
                  </Button>
                )}
                {/* Send - for draft invoices */}
                {canSend && invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSend}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 me-2" />
                    )}
                    {t("finance.invoices.send")}
                  </Button>
                )}
                {/* Edit - for draft invoices */}
                {canEdit && invoice.status === 'draft' && onEdit && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleEdit}
                    title={t("common.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canPrint && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadPDF}
                      title={t("finance.invoices.downloadPDF")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrint}
                      title={t("finance.invoices.print")}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {canDelete && invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    title={t("common.delete")}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Invoice Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("finance.invoices.client")}
                    </p>
                    <p className="font-medium">
                      {invoice.client_name || t("finance.invoices.noClient")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("finance.invoices.issueDate")}
                    </p>
                    <p className="font-medium font-mono" dir="ltr">
                      {format(new Date(invoice.issue_date), "PPP")}
                    </p>
                  </div>
                </div>

                {invoice.due_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("finance.invoices.dueDate")}
                      </p>
                      <p className="font-medium font-mono" dir="ltr">
                        {format(new Date(invoice.due_date), "PPP")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("finance.invoices.lineItems")}
              </h3>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("finance.invoices.items")} (0)
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium break-words">
                              {item.enrichedDescription || item.description}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">
                              {item.quantity} × {formatAmount(item.unit_price)}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-medium tabular-nums shrink-0" dir="ltr">
                            {formatAmount(item.total_price)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("finance.invoices.subtotal")}</span>
                <span className="font-mono tabular-nums" dir="ltr">{formatAmount(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t("finance.invoices.tax")}</span>
                  <span className="font-mono tabular-nums" dir="ltr">{formatAmount(invoice.tax_amount)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t("finance.invoices.discount")}</span>
                  <span className="font-mono tabular-nums text-success" dir="ltr">
                    -{formatAmount(invoice.discount_amount)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{t("finance.invoices.total")}</span>
                <span className="font-mono tabular-nums" dir="ltr">{formatAmount(invoice.total_amount)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="space-y-2">
                <h3 className="font-semibold">{t("finance.invoices.notes")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}

            {/* Close Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t("finance.invoices.close")}
            </Button>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
      </SheetContent>

      {/* Payment Method Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.markPaid")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.invoices.selectPaymentMethod")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>{t("finance.invoices.paymentMethod")}</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("finance.paymentMethods.cash")}</SelectItem>
                <SelectItem value="card">{t("finance.paymentMethods.card")}</SelectItem>
                <SelectItem value="transfer">{t("finance.paymentMethods.transfer")}</SelectItem>
                <SelectItem value="credit">{t("finance.paymentMethods.credit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.invoices.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
