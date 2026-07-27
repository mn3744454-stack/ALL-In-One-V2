import { useState, useMemo, useEffect } from "react";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SharedDateField } from "@/components/ui/shared-date-field";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useI18n } from "@/i18n";
import { useInvoicePayments } from "@/hooks/finance/useInvoicePayments";
import { useInvoiceItems } from "@/hooks/finance/useInvoices";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/formatters";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import {
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import type { PaymentEntry } from "@/lib/finance/postLedgerForPayments";
import { getRiyadhDateString } from "@/lib/finance/invoiceRpc";
import { useInvoicePriorAllocations } from "@/hooks/finance/useInvoicePriorAllocations";
import { PaymentAllocationEditor } from "./PaymentAllocationEditor";
import {
  PaymentTenderEditor,
  makeInitialTenderRows,
  type TenderRow,
} from "./PaymentTenderEditor";
import type { BucketAllocation } from "@/lib/finance/allocationDistribution";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  currency?: string;
  onSuccess?: () => void;
}



export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  currency,
  onSuccess,
}: RecordPaymentDialogProps) {
  const { t, dir } = useI18n();
  const { hasPermission } = usePermissions();
  const tenantCurrency = useTenantCurrency();
  const effectiveCurrency = currency || tenantCurrency;
  const { summary, isLoading, recordPayment, isRecording, resetIdempotency } = useInvoicePayments(invoiceId);
  const { items: invoiceItems } = useInvoiceItems(invoiceId || undefined);
  const { data: composition } = useInvoicePriorAllocations(invoiceId);

  const canRecordPayment = hasPermission("finance.payment.create");
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Editor rendering conditions (derived from composition):
  //   - `needsEditor`  → invoice actually requires user-driven bucket splits
  //                       (>1 horse OR horse + client-level)
  //   - `blockedLabHorse` → lab-horse-only combinations we cannot yet allocate
  //                        (multi-lab-horse or lab-horse + horse/client)
  const needsEditor = !!composition && composition.hasHorseScoped &&
    (composition.distinctHorses > 1 || composition.hasClientLevel);
  const blockedLabHorse = !!composition?.hasUnsupportedLabHorse;
  const [bucketValues, setBucketValues] = useState<Record<string, string>>({});
  const [allocationValid, setAllocationValid] = useState(false);

  // Tender rows shared with the multi-invoice dialog via PaymentTenderEditor.
  const [rows, setRows] = useState<TenderRow[]>(makeInitialTenderRows);
  const [paymentDate, setPaymentDate] = useState(getRiyadhDateString);

  useEffect(() => {
    if (open && summary) {
      setPaymentDate(getRiyadhDateString());
      setRows(makeInitialTenderRows());
      setBucketValues({});
    }
    if (!open) {
      resetIdempotency();
      setBucketValues({});
    }
  }, [open, invoiceId, summary, resetIdempotency]);

  // Computed values
  const totalPayment = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  }, [rows]);

  const outstandingAfter = useMemo(() => {
    if (!summary) return 0;
    return Math.max(0, summary.outstandingAmount - totalPayment);
  }, [summary, totalPayment]);

  const isOverpayment = summary ? totalPayment > summary.outstandingAmount + 0.01 : false;
  const isValidPayment = totalPayment > 0 && !isOverpayment;

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  useEffect(() => {
    if (!open) setAttemptedSubmit(false);
  }, [open]);

  const { isDirty } = useDirtyForm({ rows, paymentDate }, open);

  const hasInvalidAmount = useMemo(
    () =>
      rows.some((r) => {
        if (r.amount === "") return false;
        const v = parseFloat(r.amount);
        return Number.isNaN(v) || v < 0;
      }),
    [rows],
  );
  const hasMissingMethod = useMemo(
    () => rows.some((r) => parseFloat(r.amount) > 0 && !r.method),
    [rows],
  );

  const missingIssues = useMemo<string[]>(() => {
    const issues: string[] = [];
    if (!paymentDate) issues.push(t("finance.payments.missing.date"));
    if (totalPayment <= 0) issues.push(t("finance.payments.missing.amount"));
    if (hasInvalidAmount) issues.push(t("finance.payments.missing.invalidAmount"));
    if (hasMissingMethod) issues.push(t("finance.payments.missing.method"));
    return issues;
  }, [paymentDate, totalPayment, hasInvalidAmount, hasMissingMethod, t]);

  const fillFullAmount = () => {
    if (summary && rows.length === 1) {
      setRows([{ ...rows[0], amount: summary.outstandingAmount.toFixed(2) }]);
    }
  };


  const handleSubmit = async () => {
    if (!canRecordPayment) return;
    setAttemptedSubmit(true);

    if (!isValidPayment || missingIssues.length > 0) return;
    if (needsEditor && !allocationValid) return;

    const payments: PaymentEntry[] = rows
      .filter((r) => parseFloat(r.amount) > 0)
      .map((r) => ({
        idempotency_key: r.id,
        amount: parseFloat(r.amount),
        payment_method: r.method,
        reference: r.reference || undefined,
      }));

    if (payments.length === 0) return;

    // Build BucketAllocation[] from the editor state — only when the invoice
    // actually needs allocation (single-horse invoices submit without buckets).
    const bucketAllocations: BucketAllocation[] | undefined = needsEditor && composition
      ? composition.buckets.map((b) => ({
          key: b.key,
          kind: b.kind,
          horseId: b.kind === "horse" ? b.horseId : undefined,
          amount: parseFloat(bucketValues[b.key] || "0") || 0,
        }))
      : undefined;

    try {
      await recordPayment({ payments, paymentDate, bucketAllocations });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };


  const formatAmount = (amount: number) => formatCurrency(amount, effectiveCurrency);

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
      dir={dir}
    >
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("finance.payments.recordPayment")}
          </DialogTitle>
          <DialogDescription>
            {t("finance.payments.recordPaymentDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-24">

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
            {/* Invoice Items Summary (Collapsible) */}
            {invoiceItems.length > 0 && (
              <Collapsible open={itemsExpanded} onOpenChange={setItemsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 h-9 bg-muted/50 hover:bg-muted"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4" />
                      {t("finance.payments.invoiceItems")} ({invoiceItems.length})
                    </span>
                    {itemsExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 space-y-3">
                      {(() => {
                        // Group items by horse bucket for horse-scoped display.
                        // Uses composition.buckets when available (multi-scope
                        // invoices) so labels are already localized. Falls back
                        // to a flat list otherwise.
                        const bucketLabel = new Map<string, { label: string; kind: string }>();
                        for (const b of composition?.buckets ?? []) {
                          bucketLabel.set(b.key, {
                            label: dir === "rtl" && b.labelAr ? b.labelAr : b.label,
                            kind: b.kind,
                          });
                        }
                        const groups = new Map<string, typeof invoiceItems>();
                        for (const it of invoiceItems) {
                          const key = (it as any).horse_id
                            ? (it as any).horse_id
                            : (it as any).lab_horse_id
                              ? `lab:${(it as any).lab_horse_id}`
                              : "__client__";
                          const arr = groups.get(key) ?? [];
                          arr.push(it);
                          groups.set(key, arr);
                        }
                        const entries = Array.from(groups.entries());
                        const useGrouping = entries.length > 1 || bucketLabel.size > 0;
                        if (!useGrouping) {
                          return invoiceItems.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground truncate flex-1 pe-2">
                                {item.description}
                              </span>
                              <span className="font-mono tabular-nums" dir="ltr">
                                {formatAmount(item.total_price)}
                              </span>
                            </div>
                          ));
                        }
                        return entries.map(([key, list]) => {
                          const info = bucketLabel.get(key);
                          const heading =
                            key === "__client__"
                              ? t("finance.payments.groupedItems.clientLevel")
                              : `${t("finance.payments.groupedItems.horseHeader")}: ${info?.label ?? key.slice(0, 8)}`;
                          const subtotal = list.reduce((s, x) => s + Number(x.total_price || 0), 0);
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-primary uppercase tracking-wide">
                                <span className="truncate pe-2">{heading}</span>
                                <span className="font-mono tabular-nums" dir="ltr">
                                  {formatAmount(subtotal)}
                                </span>
                              </div>
                              {list.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between text-sm ps-3"
                                >
                                  <span className="text-muted-foreground truncate flex-1 pe-2">
                                    {item.description}
                                  </span>
                                  <span className="font-mono tabular-nums" dir="ltr">
                                    {formatAmount(item.total_price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Invoice Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("finance.payments.invoiceTotal")}</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {formatAmount(summary.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("finance.payments.paidSoFar")}</span>
                  <span className="font-mono tabular-nums text-success" dir="ltr">
                    {formatAmount(summary.paidAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>{t("finance.payments.outstanding")}</span>
                  <span className="font-mono tabular-nums text-warning" dir="ltr">
                    {formatAmount(summary.outstandingAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Already Paid Message */}
            {summary.isPaid && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription>
                  {t("finance.payments.alreadyPaid")}
                </AlertDescription>
              </Alert>
            )}

            {/* Lab-horse boundary — RPC contract can't allocate to lab horses yet */}
            {!summary.isPaid && blockedLabHorse && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("finance.payments.errors.allocationRequired")}
                </AlertDescription>
              </Alert>
            )}

            {/* Payment Rows */}
            {!summary.isPaid && !blockedLabHorse && (
              <>

                {/* Payment Date */}
                <div className="grid gap-2 md:flex md:items-end md:gap-4">
                  <Label className="md:min-w-[8rem]">
                    {t("finance.payments.paymentDate")} <span aria-hidden="true">*</span>
                  </Label>
                  <SharedDateField
                    value={paymentDate}
                    onChange={setPaymentDate}
                    ariaLabel={t("finance.payments.paymentDate")}
                    className="flex-1"
                  />
                </div>

                {/* Payment Method Details — precedes Payment Distribution so
                    the user first picks tenders (Cash/Card/Transfer/Check +
                    Split Tender + reference), then optionally distributes the
                    resulting total across horses. */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label>{t("finance.payments.paymentMethodDetails")}</Label>
                    {rows.length === 1 && summary.outstandingAmount > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={fillFullAmount}
                        className="h-auto p-0 text-xs"
                      >
                        {t("finance.payments.payFullOutstanding")}
                      </Button>
                    )}
                  </div>
                  <PaymentTenderEditor
                    rows={rows}
                    onChange={setRows}
                    disabled={isRecording}
                  />
                </div>


                {/* Payment Distribution — only when the invoice actually spans
                    multiple horses or mixes horse + client-level items. */}
                {needsEditor && composition && (
                  <>
                    <Separator />
                    <PaymentAllocationEditor
                      composition={composition}
                      paymentAmount={totalPayment}
                      currency={effectiveCurrency}
                      invoiceItems={invoiceItems as Array<{
                        id: string;
                        description: string;
                        total_price: number;
                        horse_id?: string | null;
                        lab_horse_id?: string | null;
                      }>}
                      value={bucketValues}
                      onChange={setBucketValues}
                      onValidityChange={setAllocationValid}
                    />
                  </>
                )}

                {/* Validation Errors */}
                {isOverpayment && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("finance.payments.overpaymentError")}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Missing requirements — surfaces above the sticky footer so
                    the footer stays a compact totals + actions strip. */}
                <MissingRequirementsBar
                  issues={attemptedSubmit ? missingIssues : []}
                  attempted={attemptedSubmit}
                />
              </>
            )}

          </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t("common.error")}
            </div>
          )}
        </div>

        {/* Sticky Footer — compact: totals + actions only */}
        <DialogFooter className="sticky bottom-0 bg-background z-10 px-6 py-3 border-t gap-3 flex-col sm:flex-row sm:items-center">
          {!summary?.isPaid && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm flex-1 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">
                  {t("finance.payments.totalPayment")}:
                </span>
                <span
                  className="font-mono tabular-nums font-semibold text-base"
                  dir="ltr"
                >
                  {formatAmount(totalPayment)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">
                  {t("finance.payments.outstandingAfter")}:
                </span>
                <span
                  className={`font-mono tabular-nums font-semibold text-base ${outstandingAfter <= 0.01 && totalPayment > 0 ? "text-success" : "text-warning"}`}
                  dir="ltr"
                >
                  {formatAmount(outstandingAfter)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 sm:ms-auto">
            <DialogClose asChild>
              <Button variant="outline" disabled={isRecording}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            {!summary?.isPaid && (
              <Button
                onClick={handleSubmit}
                disabled={isRecording || !canRecordPayment || blockedLabHorse || (needsEditor && !allocationValid)}
              >
                {isRecording ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 me-2" />
                    {t("finance.payments.recordPayment")}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>

    </SafeFormDialog>
  );
}
