import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useI18n } from "@/i18n";
import { useInvoicePayments, type InvoicePaymentSummary } from "@/hooks/finance/useInvoicePayments";
import { useInvoiceItems } from "@/hooks/finance/useInvoices";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/formatters";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  DollarSign, 
  CreditCard,
  Banknote,
  Building,
  Receipt,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import type { PaymentEntry } from "@/lib/finance/postLedgerForPayments";

interface PaymentRow {
  id: string;
  method: string;
  amount: string;
  reference: string;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  currency?: string;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", icon: Banknote, labelKey: "finance.paymentMethods.cash" },
  { value: "card", icon: CreditCard, labelKey: "finance.paymentMethods.card" },
  { value: "transfer", icon: Building, labelKey: "finance.paymentMethods.transfer" },
  { value: "check", icon: Receipt, labelKey: "finance.paymentMethods.check" },
];

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  currency = "SAR",
  onSuccess,
}: RecordPaymentDialogProps) {
  const { t, dir } = useI18n();
  const { hasPermission } = usePermissions();
  const { summary, isLoading, recordPayment, isRecording } = useInvoicePayments(invoiceId);
  const { items: invoiceItems, isLoading: itemsLoading } = useInvoiceItems(invoiceId || undefined);

  const canRecordPayment = hasPermission("finance.payment.create");
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Initialize with one empty row
  const [rows, setRows] = useState<PaymentRow[]>([
    { id: crypto.randomUUID(), method: "cash", amount: "", reference: "" },
  ]);

  // Reset rows when dialog opens/closes or invoice changes
  useEffect(() => {
    if (open && summary) {
      setRows([{ 
        id: crypto.randomUUID(), 
        method: "cash", 
        amount: summary.outstandingAmount > 0 ? "" : "", 
        reference: "" 
      }]);
    }
  }, [open, invoiceId]);

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

  // Handlers
  const addRow = () => {
    setRows([...rows, { id: crypto.randomUUID(), method: "cash", amount: "", reference: "" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof PaymentRow, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const fillFullAmount = () => {
    if (summary && rows.length === 1) {
      setRows([{ ...rows[0], amount: summary.outstandingAmount.toFixed(2) }]);
    }
  };

  const handleSubmit = async () => {
    if (!canRecordPayment || !isValidPayment) return;

    const payments: PaymentEntry[] = rows
      .filter((r) => parseFloat(r.amount) > 0)
      .map((r) => ({
        amount: parseFloat(r.amount),
        payment_method: r.method,
        reference: r.reference || undefined,
      }));

    if (payments.length === 0) return;

    try {
      await recordPayment(payments);
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Error handled in hook
    }
  };

  const formatAmount = (amount: number) => formatCurrency(amount, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden" dir={dir}>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    <CardContent className="p-3 space-y-1">
                      {invoiceItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1 pe-2">
                            {item.description}
                          </span>
                          <span className="font-mono tabular-nums" dir="ltr">
                            {formatAmount(item.total_price)}
                          </span>
                        </div>
                      ))}
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

            {/* Payment Rows */}
            {!summary.isPaid && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("finance.payments.paymentDetails")}</Label>
                    {rows.length === 1 && summary.outstandingAmount > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={fillFullAmount}
                        className="h-auto p-0 text-xs"
                      >
                        {t("finance.payments.payFullAmount")}
                      </Button>
                    )}
                  </div>

                  {rows.map((row, index) => (
                    <Card key={row.id}>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          {/* Method */}
                          <div className="col-span-4">
                            <Label className="text-xs text-muted-foreground">
                              {t("finance.payments.method")}
                            </Label>
                            <Select
                              value={row.method}
                              onValueChange={(v) => updateRow(row.id, "method", v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_METHODS.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    <span className="flex items-center gap-2">
                                      <m.icon className="h-3.5 w-3.5" />
                                      {t(m.labelKey)}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Amount */}
                          <div className="col-span-3">
                            <Label className="text-xs text-muted-foreground">
                              {t("finance.payments.amount")}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                              className="h-9 font-mono tabular-nums text-end"
                              dir="ltr"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Reference */}
                          <div className="col-span-4">
                            <Label className="text-xs text-muted-foreground">
                              {t("finance.payments.reference")}
                            </Label>
                            <Input
                              value={row.reference}
                              onChange={(e) => updateRow(row.id, "reference", e.target.value)}
                              className="h-9"
                              placeholder={t("finance.payments.referencePlaceholder")}
                            />
                          </div>

                          {/* Remove */}
                          <div className="col-span-1 flex justify-end pt-5">
                            {rows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(row.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add Row Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 me-2" />
                    {t("finance.payments.addPaymentMethod")}
                  </Button>
                </div>

                {/* Validation Errors */}
                {isOverpayment && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("finance.payments.overpaymentError")}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Payment Summary */}
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("finance.payments.totalPayment")}</span>
                    <span className="font-mono tabular-nums font-medium" dir="ltr">
                      {formatAmount(totalPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("finance.payments.outstandingAfter")}</span>
                    <span 
                      className={`font-mono tabular-nums ${outstandingAfter <= 0.01 ? 'text-success' : 'text-warning'}`} 
                      dir="ltr"
                    >
                      {formatAmount(outstandingAfter)}
                    </span>
                  </div>
                  {outstandingAfter <= 0.01 && totalPayment > 0 && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {t("finance.payments.willBeFullyPaid")}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t("common.error")}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t gap-3 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRecording}
          >
            {t("common.cancel")}
          </Button>
          {!summary?.isPaid && (
            <Button
              onClick={handleSubmit}
              disabled={!isValidPayment || isRecording || !canRecordPayment}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
