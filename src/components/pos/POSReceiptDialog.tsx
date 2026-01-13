import React from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface POSReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    client_name?: string | null;
    subtotal: number;
    discount_amount?: number | null;
    tax_amount?: number | null;
    total_amount: number;
    payment_method?: string | null;
    created_at: string;
    notes?: string | null;
  } | null;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  onPrint: () => void;
  onViewInvoice: () => void;
  onNewSale: () => void;
}

export function POSReceiptDialog({
  open,
  onOpenChange,
  invoice,
  items = [],
  onPrint,
  onViewInvoice,
  onNewSale,
}: POSReceiptDialogProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
    onPrint();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-sm sm:max-w-md",
        isRTL && "rtl"
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            "flex items-center gap-2",
            isRTL && "flex-row-reverse"
          )}>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {t("finance.pos.receipt.success")}
          </DialogTitle>
        </DialogHeader>

        {/* Receipt content - printable */}
        <div id="pos-receipt" className="print-content space-y-3 p-4 bg-muted/30 rounded-lg">
          {/* Header */}
          <div className="text-center">
            <p className="font-bold text-lg">{t("finance.pos.receipt.title")}</p>
            <p className="text-sm text-muted-foreground">#{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(invoice.created_at), "yyyy-MM-dd HH:mm")}
            </p>
          </div>

          <Separator />

          {/* Customer */}
          {invoice.client_name && (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t("finance.pos.customer")}:
              </span>{" "}
              {invoice.client_name}
            </p>
          )}

          {/* Items */}
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex justify-between text-sm",
                  isRTL && "flex-row-reverse"
                )}
              >
                <span className="flex-1 truncate">
                  {item.description} ×{item.quantity}
                </span>
                <span className="font-medium ms-2">
                  {item.total_price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
              <span>{t("finance.pos.cart.subtotal")}</span>
              <span>{Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {(invoice.discount_amount ?? 0) > 0 && (
              <div className={cn("flex justify-between text-green-600", isRTL && "flex-row-reverse")}>
                <span>{t("finance.pos.cart.discount")}</span>
                <span>-{Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {(invoice.tax_amount ?? 0) > 0 && (
              <div className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
                <span>{t("finance.pos.cart.tax")}</span>
                <span>{Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className={cn("flex justify-between font-bold text-base", isRTL && "flex-row-reverse")}>
              <span>{t("finance.pos.cart.total")}</span>
              <span>{Number(invoice.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          {invoice.payment_method && (
            <p className="text-center text-sm text-muted-foreground">
              {t(`finance.pos.payment.${invoice.payment_method}`)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-1 h-12 touch-manipulation"
            >
              <Printer className="h-4 w-4 me-2" />
              {t("finance.pos.actions.print")}
            </Button>
            <Button
              variant="outline"
              onClick={onViewInvoice}
              className="flex-1 h-12 touch-manipulation"
            >
              <FileText className="h-4 w-4 me-2" />
              {t("finance.pos.actions.viewInvoice")}
            </Button>
          </div>
          <Button
            onClick={onNewSale}
            className="w-full h-12 touch-manipulation"
          >
            {t("finance.pos.actions.newSale")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
