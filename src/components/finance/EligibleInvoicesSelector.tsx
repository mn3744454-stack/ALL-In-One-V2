import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  /** When false, per-invoice allocation inputs are locked (Total Payments = 0). */
  allocationEnabled?: boolean;
}

/** Localised badge for a payable invoice status. Falls back to the raw value
 *  when the tenant lang lacks a translation for a new status enum. */
function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const key = `finance.status.${status}`;
  const label = t(key);
  return (
    <Badge variant="outline" className="text-[10px] uppercase">
      {label === key ? status : label}
    </Badge>
  );
}

/**
 * Slice 3 — invoice selector for the multi-invoice payment dialog.
 *
 * Rows are pre-sorted "oldest first" by the parent hook (due_date, issue_date,
 * invoice_number). Amounts are strings so the input stays controlled and empty
 * values remain distinguishable from zero. When `allocationEnabled` is false
 * (Total Payments = 0), the per-invoice amount inputs are locked — the user
 * must enter tender totals before distributing them across invoices.
 */
export function EligibleInvoicesSelector({
  invoices,
  selectedIds,
  amounts,
  onToggle,
  onAmountChange,
  currency,
  disabled,
  allocationEnabled = true,
}: EligibleInvoicesSelectorProps) {
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, currency);

  const totalOutstanding = useMemo(
    () => invoices.reduce((s, i) => s + i.outstanding, 0),
    [invoices],
  );
  const selectedOutstandingTotal = useMemo(
    () =>
      invoices
        .filter((i) => selectedIds.has(i.id))
        .reduce((s, i) => s + i.outstanding, 0),
    [invoices, selectedIds],
  );

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
      {/* Summary header */}
      <div className="rounded-md border bg-muted/30 p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            {t("finance.multiInvoicePayment.summary.eligibleCount")}
          </div>
          <div className="font-semibold tabular-nums">{invoices.length}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            {t("finance.multiInvoicePayment.summary.totalOutstanding")}
          </div>
          <div className="font-semibold tabular-nums" dir="ltr">
            {fmt(totalOutstanding)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            {t("finance.multiInvoicePayment.summary.selectedCount")}
          </div>
          <div className="font-semibold tabular-nums">
            {selectedIds.size} / {invoices.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            {t("finance.multiInvoicePayment.summary.selectedOutstanding")}
          </div>
          <div className="font-semibold tabular-nums" dir="ltr">
            {fmt(selectedOutstandingTotal)}
          </div>
        </div>
      </div>

      <div className="rounded-md border divide-y">
        {invoices.map((inv) => {
          const checked = selectedIds.has(inv.id);
          const allocated = checked ? parseFloat(amounts[inv.id] ?? "") || 0 : 0;
          const remainingAfter = Math.max(
            0,
            Math.round((inv.outstanding - allocated) * 100) / 100,
          );
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
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
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
                <div className="w-32 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {t("finance.multiInvoicePayment.allocatedToInvoice")}
                  </Label>
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    className="text-end tabular-nums h-8"
                    placeholder="0.00"
                    disabled={!checked || disabled || !allocationEnabled}
                    value={checked ? amounts[inv.id] ?? "" : ""}
                    onChange={(e) => onAmountChange(inv.id, e.target.value)}
                  />
                  {checked && (
                    <div className="text-[10px] text-end text-muted-foreground">
                      {t("finance.payments.remainingAfter")}:{" "}
                      <span dir="ltr" className="tabular-nums">
                        {fmt(remainingAfter)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
