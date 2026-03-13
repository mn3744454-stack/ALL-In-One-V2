import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/formatters";
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
  paidAmount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onApprove?: () => void;
  onMarkPaid?: () => void;
}

export function InvoiceCard({
  invoice,
  paidAmount = 0,
  onEdit,
  onDelete,
  onView,
  onDownloadPDF,
  onPrint,
  onApprove,
  onMarkPaid,
}: InvoiceCardProps) {
  const { t, dir } = useI18n();
  const { hasPermission } = usePermissions();

  const canEdit = hasPermission("finance.invoice.edit");
  const canDelete = hasPermission("finance.invoice.delete");
  const canMarkPaid = hasPermission("finance.invoice.markPaid");
  const canSend = hasPermission("finance.invoice.send");
  const canPrint = hasPermission("finance.invoice.print");

  const formatAmount = (amount: number, currency: string = "SAR") => {
    return formatCurrency(amount, currency);
  };

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <CardContent className="p-3 sm:p-4">
        {/* Actions menu — absolute positioned to avoid width competition */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 end-2 h-8 w-8 shrink-0 z-10"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="w-4 h-4 me-2" />
              {t("finance.invoices.view")}
            </DropdownMenuItem>
            {canPrint && (
              <>
                <DropdownMenuItem onClick={onDownloadPDF}>
                  <Download className="w-4 h-4 me-2" />
                  {t("finance.invoices.downloadPDF")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="w-4 h-4 me-2" />
                  {t("finance.invoices.print")}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            {canSend && invoice.status === "draft" && (
              <DropdownMenuItem onClick={onSend} title={t("finance.invoices.markAsSentDesc")}>
                <Send className="w-4 h-4 me-2" />
                {t("finance.invoices.markAsSent")}
              </DropdownMenuItem>
            )}
            {canMarkPaid && (invoice.status === "sent" || invoice.status === "overdue") && (
              <DropdownMenuItem onClick={onMarkPaid}>
                <CheckCircle className="w-4 h-4 me-2 text-success" />
                {t("finance.invoices.markPaid")}
              </DropdownMenuItem>
            )}
            {canEdit && invoice.status === "draft" && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 me-2" />
                {t("common.edit")}
              </DropdownMenuItem>
            )}
            {canDelete && invoice.status === "draft" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 me-2" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-start gap-3 pe-8">
          {/* Icon */}
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
          </div>

          {/* Content — stacks vertically for narrow cards */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-navy text-sm sm:text-base line-clamp-1">
              {invoice.invoice_number}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {invoice.client_name || t("finance.invoices.noClient")}
            </p>

            {/* Amount — always below title */}
            <p className="text-base sm:text-lg font-bold text-navy font-mono tabular-nums mt-1" dir="ltr">
              {formatAmount(invoice.total_amount, invoice.currency)}
            </p>
            {paidAmount > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono tabular-nums mt-0.5" dir="ltr">
                <span className="text-primary">{t("finance.payments.paidSoFar")}: {formatAmount(paidAmount, invoice.currency)}</span>
                {invoice.total_amount - paidAmount > 0.01 && (
                  <span className="text-destructive">{t("finance.payments.outstanding")}: {formatAmount(invoice.total_amount - paidAmount, invoice.currency)}</span>
                )}
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-2">
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(invoice.issue_date), "MMM d")}
              </span>
              {invoice.due_date && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  → {format(new Date(invoice.due_date), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
