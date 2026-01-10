import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Download,
  Printer,
  Send,
  Eye,
  CheckCircle,
} from "lucide-react";
import type { Invoice } from "@/hooks/finance/useInvoices";

interface InvoiceCardProps {
  invoice: Invoice;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onSend?: () => void;
  onMarkPaid?: () => void;
  canManage?: boolean;
}

export function InvoiceCard({
  invoice,
  onEdit,
  onDelete,
  onView,
  onDownloadPDF,
  onPrint,
  onSend,
  onMarkPaid,
  canManage = false,
}: InvoiceCardProps) {
  const { t, dir } = useI18n();

  const formatCurrency = (amount: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Invoice Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-medium text-navy">
                  {invoice.invoice_number}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {invoice.client_name || t("finance.invoices.noClient")}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-lg font-bold text-navy">
                  {formatCurrency(invoice.total_amount, invoice.currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-2">
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-xs text-muted-foreground">
                {t("finance.invoices.issued")}: {format(new Date(invoice.issue_date), "MMM d, yyyy")}
              </span>
              {invoice.due_date && (
                <span className="text-xs text-muted-foreground">
                  {t("finance.invoices.due")}: {format(new Date(invoice.due_date), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="w-4 h-4 me-2" />
                  {t("finance.invoices.view")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadPDF}>
                  <Download className="w-4 h-4 me-2" />
                  {t("finance.invoices.downloadPDF")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="w-4 h-4 me-2" />
                  {t("finance.invoices.print")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {invoice.status === "draft" && (
                  <DropdownMenuItem onClick={onSend}>
                    <Send className="w-4 h-4 me-2" />
                    {t("finance.invoices.send")}
                  </DropdownMenuItem>
                )}
                {(invoice.status === "sent" || invoice.status === "overdue") && (
                  <DropdownMenuItem onClick={onMarkPaid}>
                    <CheckCircle className="w-4 h-4 me-2 text-success" />
                    {t("finance.invoices.markPaid")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 me-2" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 me-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
