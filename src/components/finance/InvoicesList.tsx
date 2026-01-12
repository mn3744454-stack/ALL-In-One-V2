import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
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
import { InvoiceCard } from "./InvoiceCard";
import { downloadInvoicePDF, printInvoice } from "./InvoicePDFGenerator";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useInvoiceItems, type Invoice, type InvoiceItem } from "@/hooks/finance/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface InvoicesListProps {
  invoices: Invoice[];
  loading: boolean;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => Promise<void>;
  onUpdateStatus?: (invoiceId: string, status: string) => Promise<void>;
  onInvoiceClick?: (invoiceId: string) => void;
  selectedInvoiceId?: string | null;
  canManage?: boolean;
}

export function InvoicesList({
  invoices,
  loading,
  onEdit,
  onDelete,
  onUpdateStatus,
  onInvoiceClick,
  selectedInvoiceId,
  canManage = false,
}: InvoicesListProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          invoice.invoice_number.toLowerCase().includes(searchLower) ||
          invoice.client_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
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
      // Fetch invoice items
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

  return (
    <div className="space-y-4">
      {/* Filters */}
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
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
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
                onEdit={() => onEdit?.(invoice)}
                onDelete={() => setDeleteId(invoice.id)}
                onDownloadPDF={() => handleDownloadPDF(invoice)}
                onPrint={() => handlePrint(invoice)}
                onSend={() => onUpdateStatus?.(invoice.id, "sent")}
                onMarkPaid={() => onUpdateStatus?.(invoice.id, "paid")}
                canManage={canManage}
              />
            </div>
          ))}
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
