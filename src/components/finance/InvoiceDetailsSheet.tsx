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
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import { useInvoicePayments } from "@/hooks/finance/useInvoicePayments";
import { postLedgerForInvoice } from "@/lib/finance/postLedgerForInvoice";
import { approveInvoice } from "@/lib/finance/approveInvoice";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { downloadInvoicePDF, printInvoice } from "./InvoicePDFGenerator";
import { formatCurrency, formatDateTime12h } from "@/lib/formatters";
import { getCurrentLanguage } from "@/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar,
  User,
  DollarSign,
  Download,
  Printer,
  Pencil,
  Trash2,
  Loader2,
  CreditCard,
  History,
  CheckCircle,
  Eye,
  XCircle,
  ClipboardCheck,
  Share2,
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onEdit?: (invoice: Invoice) => void;
}

/** Statuses that are pre-financial (no ledger impact) */
const PRE_FINANCIAL_STATUSES = ["draft", "reviewed"];
/** Statuses that have been financially activated */
const FINANCIALLY_ACTIVE_STATUSES = ["approved", "shared", "paid", "overdue", "partial", "issued"];
/** Statuses that allow recording payments */
const PAYABLE_STATUSES = ["approved", "shared", "overdue", "partial"];

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
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [invoiceContext, setInvoiceContext] = useState<{ horseName?: string; sampleLabel?: string } | null>(null);

  // Use payment hook for ledger-derived data
  const { summary: paymentSummary } = useInvoicePayments(invoiceId);

  // Permission checks - deny by default
  const canEdit = hasPermission("finance.invoice.edit");
  const canDelete = hasPermission("finance.invoice.delete");
  const canRecordPayment = hasPermission("finance.payment.create");
  const canApprove = hasPermission("finance.invoice.send"); // Reuse existing permission key
  const canPrint = hasPermission("finance.invoice.print");

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceDetails();
    } else {
      setInvoice(null);
      setItems([]);
      setInvoiceContext(null);
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

      // Resolve horse/sample context from lab_sample items
      try {
        if (labSampleIds.length > 0) {
          const { data: samplesWithHorse } = await supabase
            .from('lab_samples')
            .select('id, daily_number, physical_sample_id, lab_horse_id')
            .in('id', labSampleIds);
          
          if (samplesWithHorse && samplesWithHorse.length > 0) {
            const sample = samplesWithHorse[0] as any;
            const sLabel = sample.daily_number ? `#${sample.daily_number}` : sample.physical_sample_id?.slice(0, 12) || null;
            let hName: string | null = null;
            
            if (sample.lab_horse_id) {
              const { data: horse } = await supabase
                .from('lab_horses')
                .select('name, name_ar')
                .eq('id', sample.lab_horse_id)
                .maybeSingle();
              if (horse) {
                hName = dir === 'rtl' 
                  ? ((horse as any).name_ar || (horse as any).name || null)
                  : ((horse as any).name || (horse as any).name_ar || null);
              }
            }
            setInvoiceContext({ horseName: hName || undefined, sampleLabel: sLabel || undefined });
          } else {
            setInvoiceContext(null);
          }
        } else {
          setInvoiceContext(null);
        }
      } catch {
        setInvoiceContext(null);
      }
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
  const invalidateQueries = () => invalidateFinanceQueries(queryClient, activeTenant?.tenant?.id);

  const handlePaymentSuccess = () => {
    invalidateQueries();
    fetchInvoiceDetails();
  };

  /**
   * Transition: draft → reviewed
   */
  const handleReview = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: 'reviewed' })
        .eq("id", invoice.id);
      if (error) throw error;
      toast.success(t("finance.invoices.reviewedSuccess"));
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error reviewing invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Transition: draft|reviewed → approved
   * THIS is the financial activation point — posts to ledger.
   */
  const handleApprove = async () => {
    if (!invoice || !activeTenant?.tenant?.id) return;
    setActionLoading(true);
    try {
      // First update status
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: 'approved' })
        .eq("id", invoice.id);
      if (error) throw error;

      // Post to ledger (idempotent — postLedgerForInvoice checks for existing entries)
      if (invoice.client_id) {
        await postLedgerForInvoice(invoice.id, activeTenant.tenant.id);
      }

      toast.success(t("finance.invoices.approvedSuccess"));
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error approving invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Transition: approved → shared
   */
  const handleShare = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: 'shared' })
        .eq("id", invoice.id);
      if (error) throw error;
      toast.success(t("finance.invoices.sharedSuccess"));
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error sharing invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Cancel an approved/shared invoice — creates reversal ledger entry
   */
  const handleCancel = async () => {
    if (!invoice || !activeTenant?.tenant?.id) return;
    setActionLoading(true);
    try {
      const isFinanciallyActive = FINANCIALLY_ACTIVE_STATUSES.includes(invoice.status);

      // If financially active, create reversal ledger entry
      if (isFinanciallyActive && invoice.client_id) {
        const { data: userData } = await supabase.auth.getUser();
        
        // Get current balance
        const { data: balanceRecord } = await supabase
          .from("customer_balances")
          .select("balance")
          .eq("tenant_id", activeTenant.tenant.id)
          .eq("client_id", invoice.client_id)
          .maybeSingle();

        const currentBalance = Number((balanceRecord as any)?.balance) || 0;
        const reversalAmount = -Number(invoice.total_amount);
        const newBalance = currentBalance + reversalAmount;

        // Create reversal ledger entry
        await supabase.from("ledger_entries").insert({
          tenant_id: activeTenant.tenant.id,
          client_id: invoice.client_id,
          entry_type: "adjustment",
          reference_type: "invoice_cancellation",
          reference_id: invoice.id,
          amount: reversalAmount,
          balance_after: newBalance,
          description: `Void | Invoice ${invoice.invoice_number}`,
          created_by: userData?.user?.id,
        });

        // Update customer balance
        await supabase.from("customer_balances").upsert({
          tenant_id: activeTenant.tenant.id,
          client_id: invoice.client_id,
          balance: newBalance,
          last_updated: new Date().toISOString(),
        }, { onConflict: "tenant_id,client_id" });
      }

      // Update invoice status
      const { error } = await supabase
        .from("invoices" as any)
        .update({ status: 'cancelled' })
        .eq("id", invoice.id);
      if (error) throw error;

      toast.success(t("finance.invoices.cancelledSuccess"));
      setCancelConfirmOpen(false);
      invalidateQueries();
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Delete a draft/reviewed invoice (safe — no financial impact)
   */
  const handleDelete = async () => {
    if (!invoice) return;
    // Safety: only allow deletion of pre-financial invoices
    if (!PRE_FINANCIAL_STATUSES.includes(invoice.status)) {
      toast.error(t("finance.invoices.cannotDeleteApproved"));
      return;
    }
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

  const isPreFinancial = invoice ? PRE_FINANCIAL_STATUSES.includes(invoice.status) : false;

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
                {/* Record Payment - for financially active invoices */}
                {canRecordPayment && PAYABLE_STATUSES.includes(invoice.status) && (
                  <Button
                    size="sm"
                    onClick={() => setRecordPaymentOpen(true)}
                    disabled={actionLoading}
                  >
                    <CreditCard className="h-4 w-4 me-2" />
                    {t("finance.payments.recordPayment")}
                  </Button>
                )}

                {/* Review — draft → reviewed */}
                {canApprove && invoice.status === 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReview}
                    disabled={actionLoading}
                    title={t("finance.invoices.reviewDesc")}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4 me-2" />
                    )}
                    {t("finance.invoices.review")}
                  </Button>
                )}

                {/* Approve — draft|reviewed → approved (FINANCIAL ACTIVATION) */}
                {canApprove && (invoice.status === 'draft' || invoice.status === 'reviewed') && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setApproveConfirmOpen(true)}
                    disabled={actionLoading}
                    title={t("finance.invoices.approveDesc")}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 me-2" />
                    )}
                    {t("finance.invoices.approve")}
                  </Button>
                )}

                {/* Share — approved → shared */}
                {canApprove && invoice.status === 'approved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={actionLoading}
                    title={t("finance.invoices.shareDesc")}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4 me-2" />
                    )}
                    {t("finance.invoices.share")}
                  </Button>
                )}

                {/* Cancel — for approved/shared invoices (with reversal) */}
                {canApprove && FINANCIALLY_ACTIVE_STATUSES.includes(invoice.status) && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelConfirmOpen(true)}
                    disabled={actionLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 me-2" />
                    {t("finance.invoices.cancelInvoice")}
                  </Button>
                )}

                {/* Edit - for pre-financial invoices only */}
                {canEdit && isPreFinancial && onEdit && (
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
                {/* Delete - only for pre-financial (draft/reviewed) */}
                {canDelete && isPreFinancial && (
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

            {/* Notes (positioned near header for context) */}
            {invoice.notes && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </CardContent>
              </Card>
            )}

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
                      {format(new Date(invoice.issue_date), "dd-MM-yyyy")}
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
                        {format(new Date(invoice.due_date), "dd-MM-yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Horse context */}
                {invoiceContext?.horseName && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("finance.invoices.horse")}
                      </p>
                      <p className="font-medium">{invoiceContext.horseName}</p>
                    </div>
                  </div>
                )}

                {/* Sample context */}
                {invoiceContext?.sampleLabel && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("finance.invoices.sample")}
                      </p>
                      <p className="font-medium font-mono" dir="ltr">{invoiceContext.sampleLabel}</p>
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

              {/* Payment Summary */}
              {paymentSummary && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      {t("finance.payments.paidSoFar")}
                    </span>
                    <span className="font-mono tabular-nums text-primary" dir="ltr">
                      {formatAmount(paymentSummary.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{t("finance.payments.outstanding")}</span>
                    <span className={cn(
                      "font-mono tabular-nums",
                      paymentSummary.outstandingAmount > 0.01 && "text-destructive"
                    )} dir="ltr">
                      {formatAmount(paymentSummary.outstandingAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Payment Timeline */}
            {paymentSummary && paymentSummary.payments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t("finance.payments.paymentHistory")}
                </h3>
                <div className="space-y-2">
                  {paymentSummary.payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono tabular-nums" dir="ltr">
                              {formatDateTime12h(payment.created_at, getCurrentLanguage())}
                            </p>
                            {payment.payment_method && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {t(`finance.paymentMethods.${payment.payment_method}`) || payment.payment_method}
                              </Badge>
                            )}
                          </div>
                          <p className="font-mono text-sm font-medium tabular-nums text-primary shrink-0" dir="ltr">
                            {formatAmount(payment.amount)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoiceId={invoiceId}
        currency={invoice?.currency}
        onSuccess={handlePaymentSuccess}
      />

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.approve")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.invoices.approveDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setApproveConfirmOpen(false);
                handleApprove();
              }} 
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("finance.invoices.approve")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.invoices.cancelInvoice")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.invoices.cancelInvoiceDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t("finance.invoices.cancelInvoice")}
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
