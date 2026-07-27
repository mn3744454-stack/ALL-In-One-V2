/**
 * Phase N+3 · Slice 3.3 — Fixed 4-KPI context bar for the Multi-Invoice
 * Payment near-page workspace.
 *
 * Metrics (always four, in this order):
 *   1. Eligible Invoices                (count)
 *   2. Total Outstanding                (money)
 *   3. Selected Invoices "X of Y"       ("X من Y" in AR)
 *   4. Selected Outstanding             (money)
 *
 * The bar is a read-only summary — no interactive controls, no distribution
 * math. All numbers are derived by the parent from the same authoritative
 * queries the dialog already uses, so this component is a pure projection.
 */
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MultiInvoiceKpiBarProps {
  eligibleCount: number;
  totalOutstanding: number;
  selectedCount: number;
  selectedOutstanding: number;
  currency?: string;
  className?: string;
}

export function MultiInvoiceKpiBar({
  eligibleCount,
  totalOutstanding,
  selectedCount,
  selectedOutstanding,
  currency,
  className,
}: MultiInvoiceKpiBarProps) {
  const { t } = useI18n();

  const pageIndicator = t("finance.multiInvoicePayment.pageIndicator")
    .replace("{{current}}", String(selectedCount))
    .replace("{{total}}", String(eligibleCount));

  const cells: Array<{ label: string; value: string; testId: string }> = [
    {
      testId: "kpi-eligible-invoices",
      label: t("finance.multiInvoicePayment.summary.eligibleCount"),
      value: String(eligibleCount),
    },
    {
      testId: "kpi-total-outstanding",
      label: t("finance.multiInvoicePayment.summary.totalOutstanding"),
      value: formatCurrency(totalOutstanding, currency),
    },
    {
      testId: "kpi-selected-invoices",
      label: t("finance.multiInvoicePayment.summary.selectedCount"),
      value: pageIndicator,
    },
    {
      testId: "kpi-selected-outstanding",
      label: t("finance.multiInvoicePayment.summary.selectedOutstanding"),
      value: formatCurrency(selectedOutstanding, currency),
    },
  ];

  return (
    <Card
      data-testid="multi-invoice-kpi-bar"
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse border rounded-md",
        className,
      )}
    >
      {cells.map((cell) => (
        <div
          key={cell.testId}
          data-testid={cell.testId}
          className="px-3 py-2 flex flex-col items-start"
        >
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {cell.label}
          </span>
          <span className="text-sm md:text-base font-semibold tabular-nums mt-0.5">
            {cell.value}
          </span>
        </div>
      ))}
    </Card>
  );
}
