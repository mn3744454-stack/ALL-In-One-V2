import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBillingLinks } from "@/hooks/billing/useBillingLinks";
import { useFinancialEntries } from "@/hooks/finance/useFinancialEntries";
import { useSupplierPayableForSource } from "@/hooks/billing/useSupplierPayableForSource";
import { InvoiceDetailsSheet } from "./InvoiceDetailsSheet";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import {
  FileText,
  Landmark,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface FinancialStatusSectionProps {
  sourceType: string;
  sourceId: string;
  showSeparator?: boolean;
}

/**
 * Reusable compact section that shows the financial status of any source record:
 * - Invoice status (clickable to open invoice)
 * - Stable Cost status
 * - Supplier Payable status
 */
export function FinancialStatusSection({
  sourceType,
  sourceId,
  showSeparator = true,
}: FinancialStatusSectionProps) {
  const { t } = useI18n();
  const { links, isLoading: linksLoading } = useBillingLinks(sourceType, sourceId);
  const { entries, loading: entriesLoading } = useFinancialEntries(sourceType, sourceId);
  const { payable } = useSupplierPayableForSource(sourceType, sourceId);

  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

  const hasInvoice = links.length > 0;
  const invoiceLink = links[0]; // primary link
  const hasCostEntry = entries.some((e) => !e.is_income);
  const costEntry = entries.find((e) => !e.is_income);
  const hasPayable = !!payable;

  // Don't render if nothing to show and still loading
  if (linksLoading && entriesLoading) return null;

  // Don't render if no financial activity at all
  if (!hasInvoice && !hasCostEntry && !hasPayable) return null;

  return (
    <>
      {showSeparator && <Separator />}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("finance.traceability.financialStatus")}
        </p>

        <div className="space-y-1.5">
          {/* Invoice Status */}
          {hasInvoice && (
            <button
              type="button"
              className="flex items-center gap-2 w-full text-start rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setViewInvoiceId(invoiceLink.invoice_id)}
            >
              <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                {t("finance.traceability.invoiced")}
              </span>
              {invoiceLink.amount != null && invoiceLink.amount > 0 && (
                <span className="text-xs font-mono tabular-nums text-muted-foreground ms-auto" dir="ltr">
                  {formatCurrency(invoiceLink.amount)}
                </span>
              )}
              {invoiceLink.amount === 0 && (
                <Badge variant="outline" className="text-[10px] ms-auto px-1.5 py-0">
                  {t("finance.traceability.zeroCharge")}
                </Badge>
              )}
            </button>
          )}

          {/* Stable Cost Status */}
          {hasCostEntry && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Landmark className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                {t("finance.traceability.stableCostRecorded")}
              </span>
              {costEntry && costEntry.actual_cost != null && costEntry.actual_cost > 0 && (
                <span className="text-xs font-mono tabular-nums text-muted-foreground ms-auto" dir="ltr">
                  {formatCurrency(costEntry.actual_cost, costEntry.currency)}
                </span>
              )}
            </div>
          )}

          {/* Supplier Payable Status */}
          {hasPayable && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Truck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                {t("finance.traceability.payableCreated")}
              </span>
              <div className="flex items-center gap-1.5 ms-auto">
                {payable.amount != null && payable.amount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-muted-foreground" dir="ltr">
                    {formatCurrency(payable.amount)}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {payable.status}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details Sheet for drill-through */}
      <InvoiceDetailsSheet
        open={!!viewInvoiceId}
        onOpenChange={(open) => !open && setViewInvoiceId(null)}
        invoiceId={viewInvoiceId}
      />
    </>
  );
}
