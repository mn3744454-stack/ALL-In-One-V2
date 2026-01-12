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
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { downloadInvoicePDF, printInvoice } from "./InvoicePDFGenerator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  Download,
  Printer,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
}

export function InvoiceDetailsSheet({
  open,
  onOpenChange,
  invoiceId,
}: InvoiceDetailsSheetProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

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
      setItems((itemsData || []) as unknown as InvoiceItem[]);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: invoice?.currency || "SAR",
      maximumFractionDigits: 2,
    }).format(amount);
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
            <div className="flex items-center justify-between">
              <InvoiceStatusBadge status={invoice.status} />
              <div className="flex gap-2">
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
                    <p className="font-medium">
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
                      <p className="font-medium">
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
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-medium">
                            {formatCurrency(item.total_price)}
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
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t("finance.invoices.tax")}</span>
                  <span className="font-mono">{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t("finance.invoices.discount")}</span>
                  <span className="font-mono text-green-600">
                    -{formatCurrency(invoice.discount_amount)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{t("finance.invoices.total")}</span>
                <span className="font-mono">{formatCurrency(invoice.total_amount)}</span>
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
    </Sheet>
  );
}
