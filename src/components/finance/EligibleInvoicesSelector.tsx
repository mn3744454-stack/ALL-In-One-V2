import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import type { EligibleInvoice } from "@/hooks/finance/useEligibleClientInvoices";

interface EligibleInvoicesSelectorProps {
  invoices: EligibleInvoice[];
  selectedIds: Set<string>;
  amounts: Record<string, string>;
  onToggle: (invoiceId: string, next: boolean) => void;
  onAmountChange: (invoiceId: string, next: string) => void;
  currency: string;
  disabled?: boolean;
}

/**
 * Slice 3 — invoice selector for the multi-invoice payment dialog.
 * Rows are pre-sorted "oldest first" by the parent hook (due_date, issue_date,
 * invoice_number). Amounts are strings so the input stays controlled and empty
 * values remain distinguishable from zero.
 */
export function EligibleInvoicesSelector({
  invoices,
  selectedIds,
  amounts,
  onToggle,
  onAmountChange,
  currency,
  disabled,
}: EligibleInvoicesSelectorProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const fmt = (n: number) => formatCurrency(n, currency);
  const selectedOutstandingTotal = useMemo(() => {
    return invoices
      .filter((i) => selectedIds.has(i.id))
      .reduce((s, i) => s + i.outstanding, 0);
  }, [invoices, selectedIds]);

  if (invoices.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t("finance.multiInvoicePayment.noEligibleInvoices")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selectedIds.size} / {invoices.length}{" "}
          {t("finance.multiInvoicePayment.selectedInvoices")}
        </span>
        <span dir="ltr" className="tabular-nums font-medium text-foreground">
          {fmt(selectedOutstandingTotal)}
        </span>
      </div>
      <div className="rounded-md border divide-y">
        {invoices.map((inv) => {
          const checked = selectedIds.has(inv.id);
          return (
            <div
              key={inv.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 ${
                checked ? "bg-accent/30" : ""
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => onToggle(inv.id, v === true)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm">{inv.invoice_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {t(`finance.status.${inv.status}` as any, { defaultValue: inv.status })}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {t("finance.invoices.issueDate")}: {inv.issue_date}
                    </span>
                    {inv.due_date && (
                      <span>
                        {t("finance.invoices.dueDate")}: {inv.due_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <div className="text-xs text-end min-w-[6rem]">
                  <div className="text-muted-foreground">
                    {t("finance.payments.outstanding")}
                  </div>
                  <div dir="ltr" className="font-semibold tabular-nums">
                    {fmt(inv.outstanding)}
                  </div>
                </div>
                <div className="w-32">
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    className="text-end tabular-nums"
                    placeholder="0.00"
                    disabled={!checked || disabled}
                    value={checked ? amounts[inv.id] ?? "" : ""}
                    onChange={(e) => onAmountChange(inv.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
