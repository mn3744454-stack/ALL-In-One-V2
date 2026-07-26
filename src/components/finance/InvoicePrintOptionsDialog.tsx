import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Printer } from "lucide-react";
import { useI18n } from "@/i18n";

export type InvoicePrintAction = "download" | "print";

interface InvoicePrintOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: InvoicePrintAction;
  /** Disable the toggle when the invoice has zero payments. */
  hasPayments: boolean;
  onConfirm: (options: { includePaymentHistory: boolean }) => void;
}

/**
 * Slice 1 opt-in gate for printed / downloaded invoices.
 *
 * `Include Payment History` defaults to OFF on every open — this is a
 * privacy-preserving default so exports never leak the ledger unless the
 * operator explicitly opts in. When the invoice has zero payments, the
 * toggle is disabled at rest.
 */
export function InvoicePrintOptionsDialog({
  open,
  onOpenChange,
  action,
  hasPayments,
  onConfirm,
}: InvoicePrintOptionsDialogProps) {
  const { t } = useI18n();
  const [includePaymentHistory, setIncludePaymentHistory] = useState(false);

  // Reset the toggle every time the dialog reopens so it never sticks ON
  // across invoices or across export actions.
  useEffect(() => {
    if (open) setIncludePaymentHistory(false);
  }, [open]);

  const title =
    action === "download"
      ? t("finance.invoices.downloadPDF")
      : t("finance.invoices.print");

  const Icon = action === "download" ? Download : Printer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {t("finance.invoices.printOptionsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="include-payment-history" className="text-sm font-medium">
              {t("finance.invoices.includePaymentHistory")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {hasPayments
                ? t("finance.invoices.includePaymentHistoryDesc")
                : t("finance.invoices.includePaymentHistoryUnavailable")}
            </p>
          </div>
          <Switch
            id="include-payment-history"
            checked={includePaymentHistory}
            onCheckedChange={setIncludePaymentHistory}
            disabled={!hasPayments}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm({ includePaymentHistory: hasPayments && includePaymentHistory });
              onOpenChange(false);
            }}
          >
            <Icon className="h-4 w-4 me-2" />
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
