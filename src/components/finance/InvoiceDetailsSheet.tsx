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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SharedDateField } from "@/components/ui/shared-date-field";
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
import { approveInvoice } from "@/lib/finance/approveInvoice";
import {
  cancelInvoiceRpc,
  deleteDraftInvoiceRpc,
  getRiyadhDateString,
} from "@/lib/finance/invoiceRpc";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { downloadInvoicePDF, printInvoice, type InvoicePDFLabels } from "./InvoicePDFGenerator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  buildInvoicePresentation,
  formatHorseHeadingParts,
  type RawInvoiceItemForPresentation,
} from "@/lib/finance/invoicePresentation";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
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

/** Statuses that allow recording payments */
const PAYABLE_STATUSES = ["approved", "shared", "overdue", "partial"];
/** Statuses that can be cancelled when no payment exists. */
const CANCELLABLE_STATUSES = ["reviewed", "approved", "shared", "overdue", "issued"];

export function InvoiceDetailsSheet({
  open,
  onOpenChange,
  invoiceId,
  onEdit,
}: InvoiceDetailsSheetProps) {
  const { t, dir, lang } = useI18n();
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
  const [cancelEffectiveDate, setCancelEffectiveDate] = useState(getRiyadhDateString);
  const [cancelReason, setCancelReason] = useState("");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [invoiceContext, setInvoiceContext] = useState<{ horseName?: string; sampleLabel?: string } | null>(null);

  // Use payment hook for ledger-derived data
  const { summary: paymentSummary } = useInvoicePayments(invoiceId);

  // Permission checks - deny by default
  const canEdit = hasPermission("finance.invoice.edit");
  const canDelete = hasPermission("finance.invoice.delete");
  const canRecordPayment = hasPermission("finance.payment.create");
  const canReviewOrShare = hasPermission("finance.invoice.send");
  const canApprove = hasPermission("finance.invoice.approve");
  const canCancel = hasPermission("finance.invoice.cancel");
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

      // Enrich stable-origin entities (vet_treatment, vaccination, breeding_attempt, foaling)
      const stableEntityMap: Record<string, string> = {};
      const stableTypes: Record<string, { table: string; fk: string; nameField: string }> = {
        vet_treatment: { table: "vet_treatments", fk: "vet_treatments_horse_id_fkey", nameField: "title" },
        vaccination: { table: "horse_vaccinations", fk: "horse_vaccinations_horse_id_fkey", nameField: "" },
        breeding_attempt: { table: "breeding_attempts", fk: "breeding_attempts_mare_id_fkey", nameField: "" },
        foaling: { table: "foalings", fk: "foalings_mare_id_fkey", nameField: "" },
      };
      
      for (const [entityType, cfg] of Object.entries(stableTypes)) {
        const ids = (itemsData || [])
          .filter((item: any) => item.entity_type === entityType && item.entity_id)
          .map((item: any) => item.entity_id);
        if (ids.length === 0) continue;

        const horseAlias = entityType === "breeding_attempt" || entityType === "foaling" ? "mare" : "horse";
        
        if (entityType === "vet_treatment") {
          const { data } = await supabase.from("vet_treatments" as any).select(`id, title, horse:horses!vet_treatments_horse_id_fkey(name, name_ar)`).in("id", ids);
          (data || []).forEach((d: any) => {
            const horseName = dir === "rtl" ? (d.horse?.name_ar || d.horse?.name) : (d.horse?.name || d.horse?.name_ar);
            stableEntityMap[d.id] = [d.title, horseName].filter(Boolean).join(" — ");
          });
        } else if (entityType === "vaccination") {
          const { data } = await supabase.from("horse_vaccinations" as any).select(`id, horse:horses!horse_vaccinations_horse_id_fkey(name, name_ar), program:vaccination_programs!horse_vaccinations_program_id_fkey(name, name_ar)`).in("id", ids);
          (data || []).forEach((d: any) => {
            const progName = dir === "rtl" ? (d.program?.name_ar || d.program?.name) : (d.program?.name || d.program?.name_ar);
            const horseName = dir === "rtl" ? (d.horse?.name_ar || d.horse?.name) : (d.horse?.name || d.horse?.name_ar);
            stableEntityMap[d.id] = [progName, horseName].filter(Boolean).join(" — ");
          });
        } else if (entityType === "breeding_attempt") {
          const { data } = await supabase.from("breeding_attempts" as any).select(`id, attempt_type, mare:horses!breeding_attempts_mare_id_fkey(name, name_ar), stallion:horses!breeding_attempts_stallion_id_fkey(name, name_ar)`).in("id", ids);
          (data || []).forEach((d: any) => {
            const mareName = dir === "rtl" ? (d.mare?.name_ar || d.mare?.name) : (d.mare?.name || d.mare?.name_ar);
            const stallionName = dir === "rtl" ? (d.stallion?.name_ar || d.stallion?.name) : (d.stallion?.name || d.stallion?.name_ar);
            stableEntityMap[d.id] = [d.attempt_type, mareName, stallionName].filter(Boolean).join(" — ");
          });
        } else if (entityType === "foaling") {
          const { data } = await supabase.from("foalings" as any).select(`id, foal_name, mare:horses!foalings_mare_id_fkey(name, name_ar)`).in("id", ids);
          (data || []).forEach((d: any) => {
            const mareName = dir === "rtl" ? (d.mare?.name_ar || d.mare?.name) : (d.mare?.name || d.mare?.name_ar);
            stableEntityMap[d.id] = [d.foal_name, mareName].filter(Boolean).join(" — ");
          });
        }
      }

      // Batch-resolve per-line horse names from platform horses + lab_horses
      // (tenant-scoped to the invoice issuer; RLS also enforces this).
      const platformHorseIds = Array.from(new Set(
        (itemsData || [])
          .map((i: any) => i.horse_id)
          .filter((v: any): v is string => !!v),
      ));
      const labHorseIds = Array.from(new Set(
        (itemsData || [])
          .map((i: any) => i.lab_horse_id)
          .filter((v: any): v is string => !!v),
      ));
      const horseNameMap: Record<string, { name: string; name_ar: string | null }> = {};
      if (platformHorseIds.length > 0) {
        const { data: hs } = await supabase
          .from("horses" as any)
          .select("id, name, name_ar")
          .eq("tenant_id", (invoiceData as any).tenant_id)
          .in("id", platformHorseIds);
        (hs || []).forEach((h: any) => { horseNameMap[h.id] = { name: h.name, name_ar: h.name_ar }; });
      }
      if (labHorseIds.length > 0) {
        const { data: lhs } = await supabase
          .from("lab_horses" as any)
          .select("id, name, name_ar")
          .eq("tenant_id", (invoiceData as any).tenant_id)
          .in("id", labHorseIds);
        (lhs || []).forEach((h: any) => { horseNameMap[h.id] = { name: h.name, name_ar: h.name_ar }; });
      }
      const pickBilingual = (n?: { name: string; name_ar: string | null } | null) => {
        if (!n) return null;
        return dir === "rtl" ? (n.name_ar || n.name) : (n.name || n.name_ar);
      };

      // Enrich items with better labels + per-line horse/service/category context
      const enrichedItems = (itemsData || []).map((item: any) => {
        const resolvedHorseName =
          pickBilingual(item.horse_id ? horseNameMap[item.horse_id] : null) ||
          pickBilingual(item.lab_horse_id ? horseNameMap[item.lab_horse_id] : null) ||
          null;
        const resolvedServiceName = dir === "rtl"
          ? (item.service_name_ar_snapshot || item.service_name_snapshot || null)
          : (item.service_name_snapshot || item.service_name_ar_snapshot || null);
        const resolvedCategoryName = dir === "rtl"
          ? (item.category_name_ar_snapshot || item.category_name_snapshot || null)
          : (item.category_name_snapshot || item.category_name_ar_snapshot || null);

        let enrichedDescription = item.description;
        if (item.entity_type === 'lab_sample' && item.entity_id && sampleMap[item.entity_id]) {
          const sample = sampleMap[item.entity_id];
          const label = sample.daily_number
            ? `#${sample.daily_number}`
            : sample.physical_sample_id?.slice(0, 12) || '';
          if (label) enrichedDescription = `${item.description} - ${label}`;
        } else if (item.entity_id && stableEntityMap[item.entity_id]) {
          enrichedDescription = `${item.description} — ${stableEntityMap[item.entity_id]}`;
        }
        return {
          ...item,
          enrichedDescription,
          resolvedHorseName,
          resolvedServiceName,
          resolvedCategoryName,
        };
      });

      setItems(enrichedItems as unknown as InvoiceItem[]);

      // Resolve horse/sample context from items
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
          // Try to extract horse context from stable-origin entities
          const stableEntityIds = Object.keys(stableEntityMap);
          if (stableEntityIds.length > 0) {
            // Use first enriched entity's horse name from the map
            const firstEnriched = stableEntityMap[stableEntityIds[0]];
            // The map values contain "description — horseName", extract horse context
            setInvoiceContext({ horseName: firstEnriched || undefined });
          } else {
            setInvoiceContext(null);
          }
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
  const tenantCurrency = useTenantCurrency();
  const formatAmount = (amount: number) => formatCurrency(amount, invoice?.currency || tenantCurrency);

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
      await approveInvoice(invoice.id, activeTenant.tenant.id);
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
    if (!cancelReason.trim()) {
      toast.error(t("finance.invoices.cancelReasonRequired"));
      return;
    }
    setActionLoading(true);
    try {
      await cancelInvoiceRpc(
        activeTenant.tenant.id,
        invoice.id,
        cancelEffectiveDate,
        cancelReason.trim(),
      );

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
   * Delete a draft invoice atomically.
   */
  const handleDelete = async () => {
    if (!invoice) return;
    if (invoice.status !== "draft") {
      toast.error(t("finance.invoices.cannotDeleteApproved"));
      return;
    }
    setActionLoading(true);
    try {
      if (!activeTenant?.tenant?.id) return;
      await deleteDraftInvoiceRpc(activeTenant.tenant.id, invoice.id);
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

  const buildPdfLabels = (): InvoicePDFLabels => ({
    invoice: t("finance.invoices.pdfInvoiceTitle"),
    billTo: t("finance.invoices.pdfBillTo"),
    issueDate: t("finance.invoices.issueDate"),
    dueDate: t("finance.invoices.dueDate"),
    description: t("finance.invoices.description"),
    quantity: t("finance.invoices.quantity"),
    unitPrice: t("finance.invoices.unitPrice"),
    total: t("finance.invoices.total"),
    subtotal: t("finance.invoices.subtotal"),
    tax: t("finance.invoices.tax"),
    discount: t("finance.invoices.discount"),
    notes: t("finance.invoices.notes"),
    thankYou: t("finance.invoices.pdfThankYou"),
    clientLevelCharges: t("finance.invoices.clientLevelCharges"),
    unassignedHorse: t("finance.invoices.unassignedHorse"),
    included: t("finance.invoices.included"),
    packageChip: t("finance.invoices.packageSource"),
    horseGroupLabel: t("finance.invoices.horseGroupLabel"),
  });

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      await downloadInvoicePDF({
        invoice,
        items,
        tenantName: activeTenant?.tenant.name,
        lang,
        labels: buildPdfLabels(),
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
        lang,
        labels: buildPdfLabels(),
      });
    } catch (error) {
      console.error("Print error:", error);
      toast.error(t("finance.invoices.printFailed"));
    }
  };

  const isDraft = invoice?.status === "draft";

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
                {canReviewOrShare && invoice.status === 'draft' && (
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
                {canReviewOrShare && invoice.status === 'approved' && (
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
                {canCancel && CANCELLABLE_STATUSES.includes(invoice.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCancelEffectiveDate(getRiyadhDateString());
                      setCancelReason("");
                      setCancelConfirmOpen(true);
                    }}
                    disabled={actionLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 me-2" />
                    {t("finance.invoices.cancelInvoice")}
                  </Button>
                )}

                {/* Edit - for pre-financial invoices only */}
                {canEdit && isDraft && onEdit && (
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
                {/* Delete - draft only; reviewed invoices use cancellation. */}
                {canDelete && isDraft && (
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

                {/* Horse context — header-level only when no line carries a horse.
                    Multi-horse invoices render horse per line to avoid one arbitrary label. */}
                {invoiceContext?.horseName && !items.some((it: any) => it.resolvedHorseName) && (
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
              ) : (() => {
                const presentation = buildInvoicePresentation(
                  items as unknown as RawInvoiceItemForPresentation[],
                  {
                    lang,
                    clientLevelLabel: t("finance.invoices.clientLevelCharges"),
                  },
                );
                return (
                  <div className="space-y-4">
                    {presentation.groups.map((group) => {
                      const isClientLevel = group.kind === "client_level";
                      const heading = isClientLevel
                        ? t("finance.invoices.clientLevelCharges")
                        : group.horseName || t("finance.invoices.unassignedHorse");
                      return (
                        <div key={group.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {!isClientLevel && <span aria-hidden>🐴</span>}
                              <span className="text-foreground/80">{heading}</span>
                            </div>
                            <span className="font-mono tabular-nums text-[11px] text-muted-foreground" dir="ltr">
                              {formatAmount(group.itemsTotal)}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.items.map((item) => (
                              <Card
                                key={item.id}
                                className={item.isPackage ? "border-primary/40 bg-primary/[0.02]" : undefined}
                              >
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium break-words">
                                        {item.isPackage && (
                                          <span className="inline-flex items-center rounded bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 me-1.5 uppercase tracking-wide">
                                            {t("finance.invoices.packageSource")}
                                          </span>
                                        )}
                                        {item.description}
                                      </p>
                                      <p
                                        className="text-xs text-muted-foreground font-mono tabular-nums"
                                        dir="ltr"
                                      >
                                        {item.quantity} × {formatAmount(item.unit_price)}
                                      </p>
                                      {(item.serviceLabel || item.categoryLabel) && (
                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                          {item.serviceLabel && (
                                            <span className="inline-flex items-center gap-1">
                                              <span className="opacity-70">
                                                {t("finance.invoices.service")}:
                                              </span>
                                              <span className="text-foreground/80">
                                                {item.serviceLabel}
                                              </span>
                                            </span>
                                          )}
                                          {item.categoryLabel && (
                                            <span className="inline-flex items-center gap-1">
                                              <span className="opacity-70">
                                                {t("finance.invoices.category")}:
                                              </span>
                                              <span className="text-foreground/80">
                                                {item.categoryLabel}
                                              </span>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <p
                                      className="font-mono text-sm font-medium tabular-nums shrink-0"
                                      dir="ltr"
                                    >
                                      {formatAmount(item.total_price)}
                                    </p>
                                  </div>
                                  {item.isPackage && item.children.length > 0 && (
                                    <div className="mt-2 ms-2 border-s ps-3 space-y-1">
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {t("finance.invoices.includedServices")}
                                      </div>
                                      {item.children.map((child) => (
                                        <div
                                          key={child.key}
                                          className="flex items-center justify-between text-xs text-muted-foreground"
                                        >
                                          <span className="truncate flex-1 min-w-0">
                                            {child.name}
                                            <span className="opacity-70"> × {child.quantity}</span>
                                          </span>
                                          <span
                                            className="font-mono tabular-nums shrink-0"
                                            dir="ltr"
                                          >
                                            0.00
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
                              {formatDate(payment.effective_date, "dd-MM-yyyy")}
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
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>
                {t("finance.invoices.cancelDate")} <span aria-hidden="true">*</span>
              </Label>
              <SharedDateField
                value={cancelEffectiveDate}
                onChange={setCancelEffectiveDate}
                ariaLabel={t("finance.invoices.cancelDate")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoice-cancel-reason">
                {t("finance.invoices.cancelReason")}
              </Label>
              <Textarea
                id="invoice-cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder={t("finance.invoices.cancelReasonPlaceholder")}
                maxLength={500}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(event) => {
                event.preventDefault();
                handleCancel();
              }}
              disabled={actionLoading || !cancelEffectiveDate || !cancelReason.trim()}
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
