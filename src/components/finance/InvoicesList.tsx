import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { InvoiceCard } from "./InvoiceCard";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadInvoicePDF, printInvoice } from "./InvoicePDFGenerator";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvoiceItems, type Invoice, type InvoiceItem } from "@/hooks/finance/useInvoices";
import { useInvoicePaymentsBatch } from "@/hooks/finance/useInvoicePaymentsBatch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  Printer,
  Send,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvoicesListProps {
  invoices: Invoice[];
  loading: boolean;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => Promise<void>;
  onUpdateStatus?: (invoiceId: string, status: string) => Promise<void>;
  onInvoiceClick?: (invoiceId: string) => void;
  selectedInvoiceId?: string | null;
}

export function InvoicesList({
  invoices,
  loading,
  onEdit,
  onDelete,
  onUpdateStatus,
  onInvoiceClick,
  selectedInvoiceId,
}: InvoicesListProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('finance-invoices');
  const invoiceIds = useMemo(() => invoices.map(i => i.id), [invoices]);
  const { getPaidAmount } = useInvoicePaymentsBatch(invoiceIds);
  const formatAmount = (amount: number) => formatCurrency(amount, "SAR");

  const canEdit = hasPermission("finance.invoice.edit");
  const canDelete = hasPermission("finance.invoice.delete");
  const canMarkPaid = hasPermission("finance.invoice.markPaid");
  const canSend = hasPermission("finance.invoice.send");
  const canPrint = hasPermission("finance.invoice.print");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          invoice.invoice_number.toLowerCase().includes(searchLower) ||
          invoice.client_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter]);

  const handleDelete = async () => {
    if (deleteId && onDelete) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const { data: items } = await supabase
        .from("invoice_items" as any)
        .select("*")
        .eq("invoice_id", invoice.id);

      await downloadInvoicePDF({
        invoice,
        items: (items as unknown as InvoiceItem[]) || [],
        tenantName: activeTenant?.tenant.name,
      });

      toast.success(t("finance.invoices.pdfDownloaded"));
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(t("finance.invoices.pdfFailed"));
    }
  };

  const handlePrint = async (invoice: Invoice) => {
    try {
      const { data: items } = await supabase
        .from("invoice_items" as any)
        .select("*")
        .eq("invoice_id", invoice.id);

      await printInvoice({
        invoice,
        items: (items as unknown as InvoiceItem[]) || [],
        tenantName: activeTenant?.tenant.name,
      });
    } catch (error) {
      console.error("Print error:", error);
      toast.error(t("finance.invoices.printFailed"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const renderInvoiceActions = (invoice: Invoice) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onInvoiceClick?.(invoice.id)}>
          <Eye className="w-4 h-4 me-2" />
          {t("finance.invoices.view")}
        </DropdownMenuItem>
        {canPrint && (
          <>
            <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
              <Download className="w-4 h-4 me-2" />
              {t("finance.invoices.downloadPDF")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint(invoice)}>
              <Printer className="w-4 h-4 me-2" />
              {t("finance.invoices.print")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {canSend && (invoice.status === "draft" || invoice.status === "reviewed") && (
          <DropdownMenuItem onClick={() => onUpdateStatus?.(invoice.id, "approved")}>
            <CheckCircle className="w-4 h-4 me-2" />
            {t("finance.invoices.approve")}
          </DropdownMenuItem>
        )}
        {canMarkPaid && ["approved", "shared", "overdue"].includes(invoice.status) && (
          <DropdownMenuItem onClick={() => onUpdateStatus?.(invoice.id, "paid")}>
            <CheckCircle className="w-4 h-4 me-2 text-success" />
            {t("finance.invoices.markPaid")}
          </DropdownMenuItem>
        )}
        {canEdit && (invoice.status === "draft" || invoice.status === "reviewed") && (
          <DropdownMenuItem onClick={() => onEdit?.(invoice)}>
            <Pencil className="w-4 h-4 me-2" />
            {t("common.edit")}
          </DropdownMenuItem>
        )}
        {canDelete && invoice.status === "draft" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteId(invoice.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 me-2" />
              {t("common.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCard = (invoice: Invoice) => (
    <div
      key={invoice.id}
      onClick={() => onInvoiceClick?.(invoice.id)}
      className={cn(
        "cursor-pointer transition-colors",
        selectedInvoiceId === invoice.id && "ring-2 ring-primary rounded-xl"
      )}
    >
      <InvoiceCard
        invoice={invoice}
        paidAmount={getPaidAmount(invoice.id)}
        onEdit={() => onEdit?.(invoice)}
        onDelete={() => setDeleteId(invoice.id)}
        onView={() => onInvoiceClick?.(invoice.id)}
        onDownloadPDF={() => handleDownloadPDF(invoice)}
        onPrint={() => handlePrint(invoice)}
        onSend={() => onUpdateStatus?.(invoice.id, "sent")}
        onMarkPaid={() => onUpdateStatus?.(invoice.id, "paid")}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters + View Switcher */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              dir === "rtl" ? "right-3" : "left-3"
            )}
          />
          <Input
            placeholder={t("finance.invoices.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t("hr.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="draft">{t("finance.invoices.statuses.draft")}</SelectItem>
            <SelectItem value="sent">{t("finance.invoices.statuses.sent")}</SelectItem>
            <SelectItem value="paid">{t("finance.invoices.statuses.paid")}</SelectItem>
            <SelectItem value="overdue">{t("finance.invoices.statuses.overdue")}</SelectItem>
            <SelectItem value="cancelled">{t("finance.invoices.statuses.cancelled")}</SelectItem>
          </SelectContent>
        </Select>

        <ViewSwitcher
          viewMode={viewMode}
          gridColumns={gridColumns}
          onViewModeChange={setViewMode}
          onGridColumnsChange={setGridColumns}
          showTable={true}
        />
      </div>

      {/* Results */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy mb-1">
            {invoices.length === 0 ? t("finance.invoices.empty") : t("common.noResults")}
          </h3>
          {invoices.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("finance.invoices.tryDifferentFilters")}
            </p>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-start">{t("finance.invoices.number")}</TableHead>
                <TableHead className="text-start">{t("finance.invoices.client")}</TableHead>
                <TableHead className="w-[110px] whitespace-nowrap">{t("common.date")}</TableHead>
                <TableHead className="text-center w-[110px]">{t("finance.invoices.total")}</TableHead>
                <TableHead className="text-center w-[110px]">{t("finance.payments.paidSoFar")}</TableHead>
                <TableHead className="text-center w-[110px]">{t("finance.payments.outstanding")}</TableHead>
                <TableHead className="text-center w-[100px]">{t("common.status")}</TableHead>
                <TableHead className="w-[50px] text-center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const paid = getPaidAmount(invoice.id);
                const remaining = Math.max(0, invoice.total_amount - paid);
                return (
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedInvoiceId === invoice.id && "bg-primary/5"
                    )}
                    onClick={() => onInvoiceClick?.(invoice.id)}
                  >
                    <TableCell className="font-mono text-sm whitespace-nowrap">{invoice.invoice_number}</TableCell>
                    <TableCell className="min-w-[120px] whitespace-nowrap">{invoice.client_name || "-"}</TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap" dir="ltr">
                      {format(new Date(invoice.issue_date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                      {formatAmount(invoice.total_amount)}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-primary" dir="ltr">
                      {paid > 0 ? formatAmount(paid) : "-"}
                    </TableCell>
                    <TableCell className={cn("text-center font-mono tabular-nums", remaining > 0.01 && "text-destructive")} dir="ltr">
                      {formatAmount(remaining)}
                    </TableCell>
                    <TableCell className="text-center">
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {renderInvoiceActions(invoice)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? getGridClass(gridColumns, viewMode) : 'space-y-3'}>
          {filteredInvoices.map((invoice) => renderCard(invoice))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.invoices.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
